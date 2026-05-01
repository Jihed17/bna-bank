from __future__ import annotations

from typing import TYPE_CHECKING

from apps.appointments.access import AppointmentAccess
from apps.appointments.models import Appointment
from apps.identity.access import UserAccess
from apps.notifications.access import NotificationAccess
from apps.notifications.models import Notification
from core.logging import get_logger

if TYPE_CHECKING:
    from apps.identity.models import User  # noqa: F401

logger = get_logger('appointments.matching')


class MatchingResult:
    """
    Value object returned by MatchingEngine.find_eligible_agents().
    Carries the agent list and the reason if the list is empty.
    """
    __slots__ = ('agents', 'reason')

    def __init__(self, *, agents: list, reason: str = '') -> None:
        self.agents = agents
        self.reason = reason

    def __bool__(self) -> bool:
        return len(self.agents) > 0

    def __len__(self) -> int:
        return len(self.agents)

    def __repr__(self) -> str:
        return f'MatchingResult(agents={len(self.agents)}, reason={self.reason!r})'


class MatchingEngine:
    """
    Encapsulates HOW eligible agents are found for a pending appointment
    and HOW the assignment is resolved when one agent accepts.

    Volatile area: the matching algorithm (round-robin, load-based,
    priority queue, manual override) — all change here, nowhere else.

    Called by: AppointmentManager exclusively.
    Calls:     AppointmentAccess, UserAccess, NotificationAccess (downward only).
    Never:     publishes events, calls SchedulingEngine or NotifyingEngine,
               receives Celery tasks.
    """

    # ── Agent discovery ──────────────────────────────────────────────────────

    @staticmethod
    def find_eligible_agents(
        *,
        service_id: int,
        agency_id: int,
        scheduled_at,
    ) -> MatchingResult:
        """
        Return all agents eligible to handle a specific appointment.

        An agent is eligible if:
          1. They are assigned to the service at the agency (via AgentAssignment).
          2. Their account status is ACTIVE.
          3. They have no ASSIGNED or CONFIRMED appointment at the same slot.

        Algorithm: simple availability filter. Future algorithms
        (round-robin, load-balanced) replace this body — the Manager's
        call site and the MatchingResult contract stay unchanged.
        """
        all_agents = UserAccess.get_agents_for_service_agency(
            service_id=service_id,
            agency_id=agency_id,
        )

        if not all_agents:
            logger.info(
                'no_agents_assigned',
                extra={'service_id': service_id, 'agency_id': agency_id},
            )
            return MatchingResult(
                agents=[],
                reason="Aucun agent n'est affecté à ce service dans cette agence.",
            )

        available_agents = []
        for agent in all_agents:
            if not MatchingEngine._has_conflict(
                agent_id=agent.pk,
                scheduled_at=scheduled_at,
            ):
                available_agents.append(agent)

        if not available_agents:
            logger.info(
                'all_agents_busy',
                extra={
                    'service_id': service_id,
                    'agency_id': agency_id,
                    'scheduled_at': str(scheduled_at),
                    'total_agents': len(all_agents),
                },
            )
            return MatchingResult(
                agents=[],
                reason=(
                    f'Tous les agents ({len(all_agents)}) sont déjà occupés '
                    f'sur ce créneau.'
                ),
            )

        logger.debug(
            'eligible_agents_found',
            extra={
                'service_id': service_id,
                'agency_id': agency_id,
                'scheduled_at': str(scheduled_at),
                'eligible_count': len(available_agents),
                'eligible_ids': [a.pk for a in available_agents],
            },
        )

        return MatchingResult(agents=available_agents)

    @staticmethod
    def _has_conflict(*, agent_id: int, scheduled_at) -> bool:
        """
        Return True if the agent already has an ASSIGNED or CONFIRMED
        appointment at the exact scheduled_at datetime.

        Exact-slot conflict detection — the simplest possible rule.
        Replace with a range check (scheduled_at ± duration) when
        the business requires it. Change here only.
        """
        agent_schedule = AppointmentAccess.get_agent_schedule(
            agent_id=agent_id,
            from_dt=scheduled_at,
            to_dt=scheduled_at,
        )
        blocking_statuses = {
            Appointment.Status.ASSIGNED,
            Appointment.Status.CONFIRMED,
        }
        return any(
            a.scheduled_at == scheduled_at and a.status in blocking_statuses
            for a in agent_schedule
        )

    # ── Assignment resolution ────────────────────────────────────────────────

    @staticmethod
    def resolve_assignment(
        *,
        appointment_id: int,
        accepting_agent_id: int,
        eligible_agent_ids: list[int],
    ) -> None:
        """
        Called by AppointmentManager immediately after an agent accepts
        an appointment. Responsibilities:
          1. Cancel any QUEUED in-app notifications sent to the OTHER
             eligible agents for this appointment — they no longer need
             to act on it.
          2. Log the resolution for audit.

        Does NOT change any appointment status (already done by the Manager).
        Does NOT notify the client (that is a Manager + PubSub responsibility).

        `eligible_agent_ids` is supplied by the Manager from the original
        find_eligible_agents() call so this engine does not re-query.
        """
        other_agent_ids = [
            aid for aid in eligible_agent_ids if aid != accepting_agent_id
        ]

        cancelled_count = 0
        for agent_id in other_agent_ids:
            cancelled_count += MatchingEngine._cancel_pending_notifications(
                agent_id=agent_id,
                appointment_id=appointment_id,
            )

        logger.info(
            'assignment_resolved',
            extra={
                'appointment_id': appointment_id,
                'accepting_agent_id': accepting_agent_id,
                'other_agents': len(other_agent_ids),
                'notifications_cancelled': cancelled_count,
            },
        )

    @staticmethod
    def _cancel_pending_notifications(
        *,
        agent_id: int,
        appointment_id: int,
    ) -> int:
        """
        Cancel all QUEUED appointment_requested notifications sent to
        this agent for this appointment. Returns the count of cancelled
        notifications. Never raises — a failure to cancel a notification
        must not block the assignment flow.
        """
        try:
            notifications = NotificationAccess.get_recipient_notifications(
                recipient_id=agent_id,
                event_type=Notification.EventType.APPOINTMENT_REQUESTED,
                limit=50,
            )
            count = 0
            for notif in notifications:
                if (
                    notif.appointment_id == appointment_id
                    and notif.status == Notification.Status.QUEUED
                ):
                    NotificationAccess.cancel_queued_notification(
                        notification_id=notif.pk,
                    )
                    count += 1
            return count
        except Exception as exc:
            logger.warning(
                'cancel_pending_notifications_failed',
                extra={
                    'agent_id': agent_id,
                    'appointment_id': appointment_id,
                    'error': str(exc),
                },
            )
            return 0

    # ── Capacity reporting ───────────────────────────────────────────────────

    @staticmethod
    def get_agent_load(*, agent_id: int) -> dict:
        """
        Return a summary of an agent's current workload.
        Called by AppointmentManager to include load data in admin reports.
        Volatile: the definition of "load" changes here only.
        """
        from django.utils import timezone

        now = timezone.now()

        schedule = AppointmentAccess.get_agent_schedule(
            agent_id=agent_id,
            from_dt=now,
            to_dt=None,
        )

        load = {
            Appointment.Status.PENDING: 0,
            Appointment.Status.ASSIGNED: 0,
            Appointment.Status.CONFIRMED: 0,
        }

        for appt in schedule:
            if appt.status in load:
                load[appt.status] += 1

        return {
            'pending_count': load[Appointment.Status.PENDING],
            'assigned_count': load[Appointment.Status.ASSIGNED],
            'confirmed_count': load[Appointment.Status.CONFIRMED],
        }
