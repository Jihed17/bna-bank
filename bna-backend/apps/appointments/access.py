from __future__ import annotations

import random
import string
from datetime import datetime

from django.db import transaction

from core.exceptions import (
    AppointmentConflict,
    AppointmentNotFound,
)
from core.logging import AuditMixin

from .models import Appointment, AppointmentStatusLog


def _generate_reference() -> str:
    """
    Generate a unique human-readable reference: BNA-YYYY-NNNNN.
    Collision is resolved by the unique constraint on Appointment.reference.
    request_appointment retries once on collision.
    """
    year = datetime.now().year
    suffix = ''.join(random.choices(string.digits, k=5))
    return f'BNA-{year}-{suffix}'


class AppointmentAccess(AuditMixin):
    """
    Resource Access for the appointment lifecycle.
    All ORM operations on Appointment go through this class.
    State transition permission is NOT checked here — that is
    AppointmentManager's responsibility. This class only persists
    what it is told to persist.
    """

    # Valid state machine transitions — reference constant, enforced in Manager.
    ALLOWED_TRANSITIONS = {
        Appointment.Status.PENDING: {
            Appointment.Status.ASSIGNED,
            Appointment.Status.CANCELLED,
            Appointment.Status.EXPIRED,
        },
        Appointment.Status.ASSIGNED: {
            Appointment.Status.CONFIRMED,
            Appointment.Status.CANCELLED,
            Appointment.Status.REJECTED,
        },
        Appointment.Status.CONFIRMED: {
            Appointment.Status.COMPLETED,
            Appointment.Status.CANCELLED,
        },
        Appointment.Status.COMPLETED: set(),
        Appointment.Status.CANCELLED: set(),
        Appointment.Status.EXPIRED: set(),
        Appointment.Status.REJECTED: set(),
    }

    @staticmethod
    def request_appointment(
        *,
        client_id: int,
        service_id: int,
        agency_id: int,
        scheduled_at,
        reason: str = '',
    ) -> Appointment:
        conflict = Appointment.objects.filter(
            client_id=client_id,
            service_id=service_id,
            scheduled_at=scheduled_at,
            status__in=[
                Appointment.Status.PENDING,
                Appointment.Status.ASSIGNED,
                Appointment.Status.CONFIRMED,
            ],
        ).exists()

        if conflict:
            raise AppointmentConflict()

        with transaction.atomic():
            appointment = None
            for _ in range(2):
                try:
                    reference = _generate_reference()
                    appointment = Appointment.objects.create(
                        client_id=client_id,
                        service_id=service_id,
                        agency_id=agency_id,
                        scheduled_at=scheduled_at,
                        reason=reason.strip(),
                        status=Appointment.Status.PENDING,
                        reference=reference,
                    )
                    break
                except Exception:
                    continue

            if appointment is None:
                raise AppointmentConflict('Impossible de générer une référence unique.')

            AppointmentStatusLog.objects.create(
                appointment=appointment,
                from_status='',
                to_status=Appointment.Status.PENDING,
                reason='Demande initiale du client.',
            )

        AppointmentAccess._audit(
            action='appointment_requested',
            actor_id=client_id,
            target_id=appointment.pk,
            extra={
                'reference': appointment.reference,
                'scheduled_at': str(scheduled_at),
            },
        )
        return appointment

    @staticmethod
    def update_appointment(
        *,
        appointment_id: int,
        scheduled_at=None,
        reason: str | None = None,
        changed_by_id: int | None = None,
    ) -> Appointment:
        """
        Partially update a PENDING appointment's slot and/or reason.
        Status checks live in the Manager — this method just persists.
        Conflict detection (same client + service + slot) is the caller's
        responsibility because slot validation belongs to SchedulingEngine.
        """
        with transaction.atomic():
            try:
                appointment = Appointment.objects.select_for_update().get(pk=appointment_id)
            except Appointment.DoesNotExist:
                raise AppointmentNotFound()

            updated_fields = ['updated_at']
            old_slot = appointment.scheduled_at

            if scheduled_at is not None and scheduled_at != appointment.scheduled_at:
                appointment.scheduled_at = scheduled_at
                updated_fields.append('scheduled_at')
            if reason is not None and reason != appointment.reason:
                appointment.reason = reason.strip()
                updated_fields.append('reason')

            if len(updated_fields) > 1:
                appointment.save(update_fields=updated_fields)
                AppointmentStatusLog.objects.create(
                    appointment=appointment,
                    from_status=appointment.status,
                    to_status=appointment.status,
                    changed_by_id=changed_by_id,
                    reason=(
                        f'Détails modifiés '
                        f'(ancien créneau : {old_slot.isoformat() if old_slot else "?"}).'
                    ),
                )

        AppointmentAccess._audit(
            action='appointment_updated',
            actor_id=changed_by_id,
            target_id=appointment_id,
            extra={'reference': appointment.reference},
        )
        return appointment

    @staticmethod
    def assign_appointment(
        *,
        appointment_id: int,
        agent_id: int,
        agent_assignment_id: int | None,
        changed_by_id: int | None = None,
    ) -> Appointment:
        with transaction.atomic():
            try:
                appointment = Appointment.objects.select_for_update().get(pk=appointment_id)
            except Appointment.DoesNotExist:
                raise AppointmentNotFound()

            old_status = appointment.status
            appointment.agent_id = agent_id
            appointment.agent_assignment_id = agent_assignment_id
            appointment.status = Appointment.Status.ASSIGNED
            appointment.save(update_fields=[
                'agent', 'agent_assignment', 'status', 'updated_at',
            ])

            AppointmentStatusLog.objects.create(
                appointment=appointment,
                from_status=old_status,
                to_status=Appointment.Status.ASSIGNED,
                changed_by_id=changed_by_id,
                reason='Agent assigné.',
            )

        return appointment

    @staticmethod
    def confirm_appointment(
        *,
        appointment_id: int,
        changed_by_id: int | None = None,
    ) -> Appointment:
        with transaction.atomic():
            try:
                appointment = Appointment.objects.select_for_update().get(pk=appointment_id)
            except Appointment.DoesNotExist:
                raise AppointmentNotFound()

            old_status = appointment.status
            appointment.status = Appointment.Status.CONFIRMED
            appointment.save(update_fields=['status', 'updated_at'])

            AppointmentStatusLog.objects.create(
                appointment=appointment,
                from_status=old_status,
                to_status=Appointment.Status.CONFIRMED,
                changed_by_id=changed_by_id,
            )

        return appointment

    @staticmethod
    def cancel_appointment(
        *,
        appointment_id: int,
        cancelled_by_id: int,
        reason: str = '',
    ) -> Appointment:
        with transaction.atomic():
            try:
                appointment = Appointment.objects.select_for_update().get(pk=appointment_id)
            except Appointment.DoesNotExist:
                raise AppointmentNotFound()

            old_status = appointment.status
            appointment.status = Appointment.Status.CANCELLED
            appointment.cancelled_by_id = cancelled_by_id
            appointment.cancellation_reason = reason.strip()
            appointment.save(update_fields=[
                'status', 'cancelled_by', 'cancellation_reason', 'updated_at',
            ])

            AppointmentStatusLog.objects.create(
                appointment=appointment,
                from_status=old_status,
                to_status=Appointment.Status.CANCELLED,
                changed_by_id=cancelled_by_id,
                reason=reason,
            )

        AppointmentAccess._audit(
            action='appointment_cancelled',
            actor_id=cancelled_by_id,
            target_id=appointment_id,
            extra={'reason': reason},
        )
        return appointment

    @staticmethod
    def reject_appointment(
        *,
        appointment_id: int,
        agent_id: int,
        reason: str = '',
    ) -> Appointment:
        with transaction.atomic():
            try:
                appointment = Appointment.objects.select_for_update().get(pk=appointment_id)
            except Appointment.DoesNotExist:
                raise AppointmentNotFound()

            old_status = appointment.status
            appointment.status = Appointment.Status.REJECTED
            appointment.save(update_fields=['status', 'updated_at'])

            AppointmentStatusLog.objects.create(
                appointment=appointment,
                from_status=old_status,
                to_status=Appointment.Status.REJECTED,
                changed_by_id=agent_id,
                reason=reason,
            )

        return appointment

    @staticmethod
    def complete_appointment(
        *,
        appointment_id: int,
        changed_by_id: int | None = None,
    ) -> Appointment:
        with transaction.atomic():
            try:
                appointment = Appointment.objects.select_for_update().get(pk=appointment_id)
            except Appointment.DoesNotExist:
                raise AppointmentNotFound()

            old_status = appointment.status
            appointment.status = Appointment.Status.COMPLETED
            appointment.save(update_fields=['status', 'updated_at'])

            AppointmentStatusLog.objects.create(
                appointment=appointment,
                from_status=old_status,
                to_status=Appointment.Status.COMPLETED,
                changed_by_id=changed_by_id,
            )

        return appointment

    @staticmethod
    def get_pending_for_service_agency(
        *,
        service_id: int | None = None,
        agency_id: int | None = None,
    ) -> list[Appointment]:
        """Return all PENDING appointments, optionally filtered by service
        and/or agency. Both filters are optional: pass `agency_id` only
        to scope to one agency, pass both to refine further, pass nothing
        to list all pending across the system (admin use)."""
        qs = Appointment.objects.filter(status=Appointment.Status.PENDING)
        if service_id is not None:
            qs = qs.filter(service_id=service_id)
        if agency_id is not None:
            qs = qs.filter(agency_id=agency_id)
        return list(
            qs.select_related('client', 'service', 'agency')
            .order_by('scheduled_at')
        )

    @staticmethod
    def get_agent_schedule(
        *,
        agent_id: int,
        from_dt=None,
        to_dt=None,
    ) -> list[Appointment]:
        qs = (
            Appointment.objects.filter(agent_id=agent_id)
            .exclude(
                status__in=[
                    Appointment.Status.CANCELLED,
                    Appointment.Status.REJECTED,
                    Appointment.Status.EXPIRED,
                ]
            )
            .select_related('client', 'service', 'agency')
        )

        if from_dt:
            qs = qs.filter(scheduled_at__gte=from_dt)
        if to_dt:
            qs = qs.filter(scheduled_at__lte=to_dt)

        return list(qs.order_by('scheduled_at'))

    @staticmethod
    def get_client_history(
        *,
        client_id: int,
        status: str | None = None,
    ) -> list[Appointment]:
        qs = Appointment.objects.filter(client_id=client_id).select_related(
            'agent', 'service', 'agency'
        )

        if status:
            qs = qs.filter(status=status)

        return list(qs.order_by('-scheduled_at'))

    @staticmethod
    def get_appointment(*, appointment_id: int) -> Appointment:
        try:
            return Appointment.objects.select_related(
                'client', 'agent', 'service', 'agency'
            ).get(pk=appointment_id)
        except Appointment.DoesNotExist:
            raise AppointmentNotFound()

    @staticmethod
    def get_appointments_in_slot(
        *,
        agency_id: int,
        scheduled_at,
    ) -> list[Appointment]:
        return list(
            Appointment.objects.filter(
                agency_id=agency_id,
                scheduled_at=scheduled_at,
                status__in=[
                    Appointment.Status.PENDING,
                    Appointment.Status.ASSIGNED,
                    Appointment.Status.CONFIRMED,
                ],
            )
        )
