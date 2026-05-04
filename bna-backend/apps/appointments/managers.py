from __future__ import annotations

import datetime

from django.db import transaction
from django.utils import timezone

from apps.appointments.access import AppointmentAccess
from apps.appointments.engines.matching import MatchingEngine
from apps.appointments.engines.scheduling import SchedulingEngine
from apps.appointments.models import Appointment, AppointmentStatusLog
from apps.identity.access import UserAccess
from apps.identity.models import User
from core.events import (
    AppointmentAssignedEvent,
    AppointmentCancelledEvent,
    AppointmentCompletedEvent,
    AppointmentRequestedEvent,
)
from core.exceptions import (
    BNAException,
    InvalidStatusTransition,
)
from core.logging import AuditMixin, get_logger
from core.publisher import now_iso, publish

logger = get_logger('appointments.manager')


class AppointmentManager(AuditMixin):
    """
    Orchestrates the complete appointment lifecycle.

    Volatile area: transition rules, re-matching policy after rejection,
    cancellation permissions, reminder timing — all change here only.

    Called by: UserClient, AgentClient, AdminClient views (Phase 6).
    Calls:     AppointmentAccess, SchedulingEngine, MatchingEngine,
               UserAccess (permission checks), PubSub publisher.
    Never:     calls IdentityManager or ServiceManager directly.
    Never:     calls NotifyingEngine directly — uses PubSub only.
    """

    # ── Core use case: client requests an appointment ────────────────────────

    @staticmethod
    def request_appointment(
        *,
        client_id: int,
        service_id: int,
        agency_id: int,
        scheduled_at: datetime.datetime,
        reason: str = '',
    ) -> Appointment:
        """
        Sequence:
          1. Verify client eligibility.
          2. Validate the requested slot (SchedulingEngine).
          3. Find eligible agents (MatchingEngine) — non-blocking if none.
          4. Persist the appointment (AppointmentAccess).
          5. Publish AppointmentRequestedEvent.

        A missing agent pool is NOT a hard rejection — the appointment is
        created as PENDING and re-matched when agents next check in.
        """
        AppointmentManager._verify_client(client_id=client_id)

        slot_result = SchedulingEngine.validate_slot(
            agency_id=agency_id,
            service_id=service_id,
            scheduled_at=scheduled_at,
        )
        if not slot_result:
            raise BNAException(slot_result.reason)

        matching_result = MatchingEngine.find_eligible_agents(
            service_id=service_id,
            agency_id=agency_id,
            scheduled_at=scheduled_at,
        )
        if not matching_result:
            logger.warning(
                'no_eligible_agents_at_request_time',
                extra={
                    'service_id': service_id,
                    'agency_id': agency_id,
                    'scheduled_at': scheduled_at.isoformat(),
                    'match_reason': matching_result.reason,
                },
            )

        appointment = AppointmentAccess.request_appointment(
            client_id=client_id,
            service_id=service_id,
            agency_id=agency_id,
            scheduled_at=scheduled_at,
            reason=reason,
        )

        AppointmentManager._audit(
            action='appointment_requested',
            actor_id=client_id,
            target_id=appointment.pk,
            extra={
                'reference': appointment.reference,
                'scheduled_at': scheduled_at.isoformat(),
                'agent_count': len(matching_result),
            },
        )

        publish(AppointmentRequestedEvent(
            occurred_at=now_iso(),
            appointment_id=appointment.pk,
            appointment_ref=appointment.reference,
            client_id=client_id,
            client_full_name=appointment.client.get_full_name(),
            service_id=service_id,
            service_name=appointment.service.name,
            agency_id=agency_id,
            agency_name=appointment.agency.name,
            scheduled_at=scheduled_at.isoformat(),
            reason=reason,
            eligible_agent_ids=[a.pk for a in matching_result.agents],
        ))

        logger.info(
            'appointment_requested',
            extra={
                'appointment_id': appointment.pk,
                'reference': appointment.reference,
                'client_id': client_id,
                'eligible_agents': len(matching_result),
            },
        )

        return appointment

    # ── Core use case: client modifies a PENDING appointment ────────────────

    @staticmethod
    def update_appointment(
        *,
        appointment_id: int,
        requesting_user_id: int,
        scheduled_at: datetime.datetime | None = None,
        reason: str | None = None,
    ) -> Appointment:
        """
        Edit a still-PENDING appointment.

        Permissions:
          - The client who owns the appointment can update it.
          - An admin can update any pending appointment.
          - Once an agent has been assigned (status >= ASSIGNED) the
            appointment is locked — to change anything the client must
            cancel and re-book.

        Validation:
          - The new slot, if changed, is run through SchedulingEngine and
            checked for client conflicts the same way as request_appointment.
        """
        appointment = AppointmentAccess.get_appointment(appointment_id=appointment_id)

        if appointment.status != Appointment.Status.PENDING:
            raise InvalidStatusTransition(
                'Seul un rendez-vous en attente peut être modifié. '
                'Veuillez annuler et créer une nouvelle demande.'
            )

        requester = UserAccess.get_profile(user_id=requesting_user_id)
        if (
            requester.role != User.Role.ADMIN
            and appointment.client_id != requesting_user_id
        ):
            raise PermissionError(
                'Vous ne pouvez modifier que vos propres rendez-vous.'
            )

        # If the slot is changing, validate it.
        if scheduled_at is not None and scheduled_at != appointment.scheduled_at:
            slot_result = SchedulingEngine.validate_slot(
                agency_id=appointment.agency_id,
                service_id=appointment.service_id,
                scheduled_at=scheduled_at,
            )
            if not slot_result:
                from core.exceptions import BNAException
                raise BNAException(slot_result.reason)

            # Avoid creating a duplicate (same client + service + new slot).
            from apps.appointments.models import Appointment as ApptModel
            conflict = ApptModel.objects.filter(
                client_id=appointment.client_id,
                service_id=appointment.service_id,
                scheduled_at=scheduled_at,
                status__in=[
                    ApptModel.Status.PENDING,
                    ApptModel.Status.ASSIGNED,
                    ApptModel.Status.CONFIRMED,
                ],
            ).exclude(pk=appointment.pk).exists()
            if conflict:
                from core.exceptions import AppointmentConflict
                raise AppointmentConflict()

        updated = AppointmentAccess.update_appointment(
            appointment_id=appointment_id,
            scheduled_at=scheduled_at,
            reason=reason,
            changed_by_id=requesting_user_id,
        )

        AppointmentManager._audit(
            action='appointment_updated',
            actor_id=requesting_user_id,
            target_id=appointment_id,
            extra={
                'reference': updated.reference,
                'new_slot': updated.scheduled_at.isoformat() if updated.scheduled_at else None,
            },
        )

        logger.info(
            'appointment_updated',
            extra={
                'appointment_id': appointment_id,
                'reference': updated.reference,
                'by': requesting_user_id,
            },
        )

        return updated

    # ── Core use case: agent accepts an appointment ──────────────────────────

    @staticmethod
    def accept_appointment(
        *,
        appointment_id: int,
        agent_id: int,
    ) -> Appointment:
        """
        Sequence:
          1. Status must be PENDING.
          2. Agent must be eligible (MatchingEngine).
          3. Resolve AgentAssignment record.
          4. Persist the assignment (AppointmentAccess).
          5. Cancel pending notifications for other eligible agents.
          6. Publish AppointmentAssignedEvent.
        """
        from apps.services.models import AgentAssignment

        appointment = AppointmentAccess.get_appointment(appointment_id=appointment_id)

        if appointment.status != Appointment.Status.PENDING:
            raise InvalidStatusTransition(
                f'Ce rendez-vous ne peut pas être accepté '
                f'(statut actuel : {appointment.get_status_display()}).'
            )

        matching_result = MatchingEngine.find_eligible_agents(
            service_id=appointment.service_id,
            agency_id=appointment.agency_id,
            scheduled_at=appointment.scheduled_at,
        )
        eligible_ids = [a.pk for a in matching_result.agents]

        if agent_id not in eligible_ids:
            raise PermissionError(
                "Vous n'êtes pas éligible pour accepter ce rendez-vous."
            )

        try:
            agent_assignment = AgentAssignment.objects.get(
                agent_id=agent_id,
                agency_service__service_id=appointment.service_id,
                agency_service__agency_id=appointment.agency_id,
                is_active=True,
            )
        except AgentAssignment.DoesNotExist:
            raise PermissionError(
                'Aucune affectation active trouvée pour cet agent sur ce service.'
            )

        appointment = AppointmentAccess.assign_appointment(
            appointment_id=appointment_id,
            agent_id=agent_id,
            agent_assignment_id=agent_assignment.pk,
            changed_by_id=agent_id,
        )

        AppointmentManager._audit(
            action='appointment_accepted',
            actor_id=agent_id,
            target_id=appointment_id,
            extra={'reference': appointment.reference},
        )

        MatchingEngine.resolve_assignment(
            appointment_id=appointment_id,
            accepting_agent_id=agent_id,
            eligible_agent_ids=eligible_ids,
        )

        publish(AppointmentAssignedEvent(
            occurred_at=now_iso(),
            appointment_id=appointment.pk,
            appointment_ref=appointment.reference,
            client_id=appointment.client_id,
            agent_id=agent_id,
            agent_full_name=appointment.agent.get_full_name(),
            service_name=appointment.service.name,
            agency_name=appointment.agency.name,
            scheduled_at=appointment.scheduled_at.isoformat(),
        ))

        logger.info(
            'appointment_accepted',
            extra={
                'appointment_id': appointment_id,
                'reference': appointment.reference,
                'agent_id': agent_id,
            },
        )

        return appointment

    # ── Core use case: agent rejects an appointment ──────────────────────────

    @staticmethod
    def reject_appointment(
        *,
        appointment_id: int,
        agent_id: int,
        reason: str = '',
    ) -> Appointment:
        """
        Agent rejects an ASSIGNED appointment.

        Re-matching:
          - Other eligible agents remain: reset to PENDING, re-publish
            AppointmentRequestedEvent targeting them.
          - None remain: move to EXPIRED and publish AppointmentCancelledEvent.
        """
        appointment = AppointmentAccess.get_appointment(appointment_id=appointment_id)

        if appointment.status != Appointment.Status.ASSIGNED:
            raise InvalidStatusTransition(
                'Seul un rendez-vous assigné peut être refusé.'
            )

        if appointment.agent_id != agent_id:
            raise PermissionError(
                'Vous ne pouvez refuser que les rendez-vous qui vous sont assignés.'
            )

        appointment = AppointmentAccess.reject_appointment(
            appointment_id=appointment_id,
            agent_id=agent_id,
            reason=reason,
        )

        AppointmentManager._audit(
            action='appointment_rejected',
            actor_id=agent_id,
            target_id=appointment_id,
            extra={'reason': reason, 'reference': appointment.reference},
        )

        matching_result = MatchingEngine.find_eligible_agents(
            service_id=appointment.service_id,
            agency_id=appointment.agency_id,
            scheduled_at=appointment.scheduled_at,
        )
        other_agents = [a for a in matching_result.agents if a.pk != agent_id]

        if other_agents:
            with transaction.atomic():
                appointment.status = Appointment.Status.PENDING
                appointment.agent = None
                appointment.agent_assignment = None
                appointment.save(update_fields=[
                    'status', 'agent', 'agent_assignment', 'updated_at',
                ])
                AppointmentStatusLog.objects.create(
                    appointment=appointment,
                    from_status=Appointment.Status.REJECTED,
                    to_status=Appointment.Status.PENDING,
                    changed_by_id=agent_id,
                    reason='Remis en attente après refus — re-matching.',
                )

            publish(AppointmentRequestedEvent(
                occurred_at=now_iso(),
                appointment_id=appointment.pk,
                appointment_ref=appointment.reference,
                client_id=appointment.client_id,
                client_full_name=appointment.client.get_full_name(),
                service_id=appointment.service_id,
                service_name=appointment.service.name,
                agency_id=appointment.agency_id,
                agency_name=appointment.agency.name,
                scheduled_at=appointment.scheduled_at.isoformat(),
                reason=appointment.reason,
                eligible_agent_ids=[a.pk for a in other_agents],
            ))

            logger.info(
                'appointment_rejected_rematched',
                extra={
                    'appointment_id': appointment_id,
                    'agent_id': agent_id,
                    'remaining_agents': len(other_agents),
                },
            )
        else:
            with transaction.atomic():
                appointment.status = Appointment.Status.EXPIRED
                appointment.agent = None
                appointment.agent_assignment = None
                appointment.save(update_fields=[
                    'status', 'agent', 'agent_assignment', 'updated_at',
                ])
                AppointmentStatusLog.objects.create(
                    appointment=appointment,
                    from_status=Appointment.Status.REJECTED,
                    to_status=Appointment.Status.EXPIRED,
                    changed_by_id=agent_id,
                    reason='Aucun agent disponible après refus.',
                )

            publish(AppointmentCancelledEvent(
                occurred_at=now_iso(),
                appointment_id=appointment.pk,
                appointment_ref=appointment.reference,
                cancelled_by_id=agent_id,
                client_id=appointment.client_id,
                agent_id=agent_id,
                service_name=appointment.service.name,
                scheduled_at=appointment.scheduled_at.isoformat(),
                reason='Aucun agent disponible pour votre rendez-vous.',
            ))

            logger.info(
                'appointment_rejected_expired',
                extra={'appointment_id': appointment_id, 'agent_id': agent_id},
            )

        return appointment

    # ── Core use case: cancel an appointment ─────────────────────────────────

    @staticmethod
    def cancel_appointment(
        *,
        appointment_id: int,
        cancelled_by_id: int,
        reason: str = '',
    ) -> Appointment:
        """
        Permission rules:
          - CLIENT: own appointment only.
          - AGENT:  only appointments assigned to them.
          - ADMIN:  any appointment.

        Cancellable states: PENDING, ASSIGNED, CONFIRMED.
        """
        appointment = AppointmentAccess.get_appointment(appointment_id=appointment_id)

        cancellable_statuses = {
            Appointment.Status.PENDING,
            Appointment.Status.ASSIGNED,
            Appointment.Status.CONFIRMED,
        }
        if appointment.status not in cancellable_statuses:
            raise InvalidStatusTransition(
                f'Ce rendez-vous ne peut pas être annulé '
                f'(statut : {appointment.get_status_display()}).'
            )

        canceller = UserAccess.get_profile(user_id=cancelled_by_id)

        if canceller.role == User.Role.ADMIN:
            pass
        elif canceller.role == User.Role.CLIENT:
            if appointment.client_id != cancelled_by_id:
                raise PermissionError(
                    'Vous ne pouvez annuler que vos propres rendez-vous.'
                )
        elif canceller.role == User.Role.AGENT:
            if appointment.agent_id != cancelled_by_id:
                raise PermissionError(
                    'Vous ne pouvez annuler que les rendez-vous qui vous sont assignés.'
                )
        else:
            raise PermissionError(
                "Vous n'êtes pas autorisé à annuler ce rendez-vous."
            )

        appointment = AppointmentAccess.cancel_appointment(
            appointment_id=appointment_id,
            cancelled_by_id=cancelled_by_id,
            reason=reason,
        )

        AppointmentManager._audit(
            action='appointment_cancelled',
            actor_id=cancelled_by_id,
            target_id=appointment_id,
            extra={'reason': reason, 'reference': appointment.reference},
        )

        publish(AppointmentCancelledEvent(
            occurred_at=now_iso(),
            appointment_id=appointment.pk,
            appointment_ref=appointment.reference,
            cancelled_by_id=cancelled_by_id,
            client_id=appointment.client_id,
            agent_id=appointment.agent_id,
            service_name=appointment.service.name,
            scheduled_at=appointment.scheduled_at.isoformat(),
            reason=reason,
        ))

        logger.info(
            'appointment_cancelled',
            extra={
                'appointment_id': appointment_id,
                'reference': appointment.reference,
                'by': cancelled_by_id,
            },
        )

        return appointment

    # ── Use case: confirm an appointment ─────────────────────────────────────

    @staticmethod
    def confirm_appointment(
        *,
        appointment_id: int,
        agent_id: int,
    ) -> Appointment:
        """Agent confirms an ASSIGNED appointment (optional lifecycle step)."""
        appointment = AppointmentAccess.get_appointment(appointment_id=appointment_id)

        if appointment.status != Appointment.Status.ASSIGNED:
            raise InvalidStatusTransition(
                'Seul un rendez-vous assigné peut être confirmé.'
            )

        if appointment.agent_id != agent_id:
            raise PermissionError(
                'Vous ne pouvez confirmer que vos propres rendez-vous.'
            )

        appointment = AppointmentAccess.confirm_appointment(
            appointment_id=appointment_id,
            changed_by_id=agent_id,
        )

        logger.info(
            'appointment_confirmed',
            extra={
                'appointment_id': appointment_id,
                'reference': appointment.reference,
                'agent_id': agent_id,
            },
        )

        return appointment

    # ── Use case: complete an appointment ────────────────────────────────────

    @staticmethod
    def complete_appointment(
        *,
        appointment_id: int,
        agent_id: int,
    ) -> Appointment:
        """Mark a CONFIRMED or ASSIGNED appointment as COMPLETED."""
        appointment = AppointmentAccess.get_appointment(appointment_id=appointment_id)

        completable = {Appointment.Status.CONFIRMED, Appointment.Status.ASSIGNED}
        if appointment.status not in completable:
            raise InvalidStatusTransition(
                'Seul un rendez-vous confirmé ou assigné peut être marqué comme effectué.'
            )

        agent = UserAccess.get_profile(user_id=agent_id)
        if agent.role != User.Role.ADMIN and appointment.agent_id != agent_id:
            raise PermissionError(
                "Seul l'agent assigné peut marquer ce rendez-vous comme effectué."
            )

        appointment = AppointmentAccess.complete_appointment(
            appointment_id=appointment_id,
            changed_by_id=agent_id,
        )

        AppointmentManager._audit(
            action='appointment_completed',
            actor_id=agent_id,
            target_id=appointment_id,
            extra={'reference': appointment.reference},
        )

        publish(AppointmentCompletedEvent(
            occurred_at=now_iso(),
            appointment_id=appointment.pk,
            appointment_ref=appointment.reference,
            client_id=appointment.client_id,
            agent_id=agent_id,
            service_name=appointment.service.name,
        ))

        logger.info(
            'appointment_completed',
            extra={
                'appointment_id': appointment_id,
                'reference': appointment.reference,
                'agent_id': agent_id,
            },
        )

        return appointment

    # ── Query use cases ──────────────────────────────────────────────────────

    @staticmethod
    def get_appointment(
        *,
        appointment_id: int,
        requesting_user_id: int,
    ) -> Appointment:
        """
        Return a single appointment with access control.
        CLIENT: own only. AGENT: assigned + all PENDING. ADMIN: any.
        """
        appointment = AppointmentAccess.get_appointment(appointment_id=appointment_id)
        requester = UserAccess.get_profile(user_id=requesting_user_id)

        if requester.role == User.Role.ADMIN:
            return appointment

        if requester.role == User.Role.CLIENT:
            if appointment.client_id != requesting_user_id:
                raise PermissionError(
                    'Vous ne pouvez consulter que vos propres rendez-vous.'
                )

        elif requester.role == User.Role.AGENT:
            is_assigned = appointment.agent_id == requesting_user_id
            is_pending = appointment.status == Appointment.Status.PENDING
            if not is_assigned and not is_pending:
                raise PermissionError(
                    "Vous n'avez pas accès à ce rendez-vous."
                )

        return appointment

    @staticmethod
    def get_client_history(
        *,
        client_id: int,
        requesting_user_id: int,
        status: str | None = None,
    ) -> list[Appointment]:
        """A client sees only their own history; agents and admins see any."""
        requester = UserAccess.get_profile(user_id=requesting_user_id)

        if requester.role == User.Role.CLIENT and requester.pk != client_id:
            raise PermissionError(
                'Vous ne pouvez consulter que votre propre historique.'
            )

        return AppointmentAccess.get_client_history(
            client_id=client_id,
            status=status,
        )

    @staticmethod
    def get_agent_schedule(
        *,
        agent_id: int,
        requesting_user_id: int,
        from_dt: datetime.datetime | None = None,
        to_dt: datetime.datetime | None = None,
    ) -> dict:
        """Agents view their own schedule; admins view any; clients denied."""
        requester = UserAccess.get_profile(user_id=requesting_user_id)

        if requester.role == User.Role.CLIENT:
            raise PermissionError(
                "Les clients n'ont pas accès au planning des agents."
            )

        if requester.role == User.Role.AGENT and requester.pk != agent_id:
            raise PermissionError(
                'Vous ne pouvez consulter que votre propre planning.'
            )

        now = timezone.now()
        return SchedulingEngine.build_calendar_view(
            agent_id=agent_id,
            from_dt=from_dt or now,
            to_dt=to_dt or (now + datetime.timedelta(days=30)),
        )

    @staticmethod
    def get_available_slots(
        *,
        service_id: int,
        agency_id: int,
        on_date: datetime.date,
    ) -> list[datetime.datetime]:
        """Return available time slots. Public — no permission check."""
        return SchedulingEngine.find_available_slots(
            agency_id=agency_id,
            service_id=service_id,
            on_date=on_date,
        )

    @staticmethod
    def get_pending_appointments(
        *,
        requesting_user_id: int,
        service_id: int | None = None,
        agency_id: int | None = None,
    ) -> list[Appointment]:
        """Return PENDING appointments visible to the requester.

        - Agents are always scoped to their own agency, regardless of the
          `agency_id` filter (security: an agent cannot peek at another
          agency's queue). `service_id` remains an optional refinement.
        - Admins see all pending RDV by default; both filters are optional.
        - Clients are forbidden.
        """
        requester = UserAccess.get_profile(user_id=requesting_user_id)

        if requester.role == User.Role.CLIENT:
            raise PermissionError(
                "Les clients n'ont pas accès à la file d'attente."
            )

        if requester.role == User.Role.AGENT:
            # Force scope to the agent's pinned agency. Returns empty if
            # the agent isn't pinned yet.
            agency_id = requester.agency_id

        return AppointmentAccess.get_pending_for_service_agency(
            service_id=service_id,
            agency_id=agency_id,
        )

    # ── Private helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _verify_client(*, client_id: int) -> None:
        """Verify the user is an active CLIENT or ADMIN."""
        try:
            user = UserAccess.get_profile(user_id=client_id)
        except Exception:
            raise PermissionError('Client introuvable.')

        if user.role not in (User.Role.CLIENT, User.Role.ADMIN):
            raise PermissionError(
                'Votre compte doit être activé pour prendre un rendez-vous. '
                "Les visiteurs doivent d'abord créer un compte complet."
            )

        if user.status != User.AccountStatus.ACTIVE:
            raise PermissionError(
                'Votre compte est suspendu. Veuillez contacter votre agence BNA.'
            )
