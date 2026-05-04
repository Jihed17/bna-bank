from celery import shared_task
from celery.utils.log import get_task_logger

from apps.notifications.models import Notification

logger = get_task_logger(__name__)


@shared_task(
    name='apps.notifications.tasks.handle_appointment_requested',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def handle_appointment_requested(self, *, payload: dict) -> None:
    """
    Notify all eligible agents of a new appointment request.
    Each agent receives an IN_APP notification immediately, and an
    EMAIL notification if their preferences allow.
    """
    from apps.identity.models import User
    from apps.notifications.engines.notifying import NotifyingEngine

    try:
        NotifyingEngine.dispatch_to_agents(
            payload=payload,
            channel=Notification.Channel.IN_APP,
        )

        eligible_ids = payload.get('eligible_agent_ids', []) or []
        if eligible_ids:
            agents = User.objects.filter(
                pk__in=eligible_ids,
                notification_email=True,
            )
            for agent in agents:
                NotifyingEngine.dispatch_to_recipient(
                    recipient_id=agent.pk,
                    event_type=Notification.EventType.APPOINTMENT_REQUESTED,
                    payload=payload,
                    appointment_id=payload.get('appointment_id'),
                    channel=Notification.Channel.EMAIL,
                )
    except Exception as exc:
        logger.error('handle_appointment_requested failed: %s', exc)
        raise self.retry(exc=exc)


@shared_task(
    name='apps.notifications.tasks.handle_appointment_assigned',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def handle_appointment_assigned(self, *, payload: dict) -> None:
    """Notify the client that an agent accepted their appointment."""
    from apps.identity.models import User
    from apps.notifications.engines.notifying import NotifyingEngine

    try:
        client_id = payload.get('client_id')
        if not client_id:
            return

        NotifyingEngine.dispatch_to_recipient(
            recipient_id=client_id,
            event_type=Notification.EventType.APPOINTMENT_ASSIGNED,
            payload=payload,
            appointment_id=payload.get('appointment_id'),
            channel=Notification.Channel.IN_APP,
        )

        try:
            client = User.objects.get(pk=client_id)
            if client.notification_email:
                NotifyingEngine.dispatch_to_recipient(
                    recipient_id=client_id,
                    event_type=Notification.EventType.APPOINTMENT_ASSIGNED,
                    payload=payload,
                    appointment_id=payload.get('appointment_id'),
                    channel=Notification.Channel.EMAIL,
                )
        except User.DoesNotExist:
            pass

    except Exception as exc:
        logger.error('handle_appointment_assigned failed: %s', exc)
        raise self.retry(exc=exc)


@shared_task(
    name='apps.notifications.tasks.handle_appointment_cancelled',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def handle_appointment_cancelled(self, *, payload: dict) -> None:
    """
    Notify the other party of the cancellation, in-app + email.

    Recipients:
      - client cancelled  → agent (if assigned)
      - agent cancelled   → client
      - system / no-agent → client (covers reject_appointment → EXPIRED)
    Email is sent only when the recipient has notification_email=True.
    """
    from apps.identity.models import User
    from apps.notifications.engines.notifying import NotifyingEngine

    try:
        cancelled_by_id = payload.get('cancelled_by_id')
        client_id = payload.get('client_id')
        agent_id = payload.get('agent_id')
        appointment_id = payload.get('appointment_id')

        if cancelled_by_id == client_id and agent_id:
            notify_ids = [agent_id]
        elif cancelled_by_id == agent_id:
            notify_ids = [client_id]
        else:
            notify_ids = [client_id] + ([agent_id] if agent_id else [])

        for recipient_id in notify_ids:
            if not recipient_id:
                continue

            NotifyingEngine.dispatch_to_recipient(
                recipient_id=recipient_id,
                event_type=Notification.EventType.APPOINTMENT_CANCELLED,
                payload=payload,
                appointment_id=appointment_id,
                channel=Notification.Channel.IN_APP,
            )

            try:
                recipient = User.objects.get(pk=recipient_id)
                if recipient.notification_email:
                    NotifyingEngine.dispatch_to_recipient(
                        recipient_id=recipient_id,
                        event_type=Notification.EventType.APPOINTMENT_CANCELLED,
                        payload=payload,
                        appointment_id=appointment_id,
                        channel=Notification.Channel.EMAIL,
                    )
            except User.DoesNotExist:
                pass

    except Exception as exc:
        logger.error('handle_appointment_cancelled failed: %s', exc)
        raise self.retry(exc=exc)


@shared_task(
    name='apps.notifications.tasks.handle_appointment_completed',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def handle_appointment_completed(self, *, payload: dict) -> None:
    """Notify the client that their appointment is marked as completed."""
    from apps.notifications.engines.notifying import NotifyingEngine

    try:
        client_id = payload.get('client_id')
        if client_id:
            NotifyingEngine.dispatch_to_recipient(
                recipient_id=client_id,
                event_type=Notification.EventType.APPOINTMENT_COMPLETED,
                payload=payload,
                appointment_id=payload.get('appointment_id'),
                channel=Notification.Channel.IN_APP,
            )
    except Exception as exc:
        logger.error('handle_appointment_completed failed: %s', exc)
        raise self.retry(exc=exc)


@shared_task(
    name='apps.notifications.tasks.handle_service_updated',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def handle_service_updated(self, *, payload: dict) -> None:
    """Notify all agents assigned to the updated service."""
    from apps.identity.models import User
    from apps.notifications.engines.notifying import NotifyingEngine
    from apps.services.models import AgentAssignment

    try:
        service_id = payload.get('service_id')
        if not service_id:
            return

        agent_ids = AgentAssignment.objects.filter(
            agency_service__service_id=service_id,
            is_active=True,
            agent__status=User.AccountStatus.ACTIVE,
        ).values_list('agent_id', flat=True).distinct()

        for agent_id in agent_ids:
            NotifyingEngine.dispatch_to_recipient(
                recipient_id=agent_id,
                event_type=Notification.EventType.SERVICE_UPDATED,
                payload=payload,
                channel=Notification.Channel.IN_APP,
            )

    except Exception as exc:
        logger.error('handle_service_updated failed: %s', exc)
        raise self.retry(exc=exc)


@shared_task(
    name='apps.notifications.tasks.handle_account_verified',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def handle_account_verified(self, *, payload: dict) -> None:
    """Send the welcome email to a newly promoted client."""
    from apps.notifications.engines.notifying import NotifyingEngine

    try:
        user_id = payload.get('user_id')
        if user_id:
            NotifyingEngine.dispatch_to_recipient(
                recipient_id=user_id,
                event_type=Notification.EventType.ACCOUNT_VERIFIED,
                payload=payload,
                channel=Notification.Channel.EMAIL,
            )
            NotifyingEngine.dispatch_to_recipient(
                recipient_id=user_id,
                event_type=Notification.EventType.ACCOUNT_VERIFIED,
                payload=payload,
                channel=Notification.Channel.IN_APP,
            )
    except Exception as exc:
        logger.error('handle_account_verified failed: %s', exc)
        raise self.retry(exc=exc)


@shared_task(
    name='apps.notifications.tasks.handle_password_reset_requested',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def handle_password_reset_requested(self, *, payload: dict) -> None:
    """
    Send the password-reset link via email.
    Email only — security-sensitive, no in-app copy.
    """
    from apps.notifications.engines.notifying import NotifyingEngine

    try:
        user_id = payload.get('user_id')
        if user_id:
            NotifyingEngine.dispatch_to_recipient(
                recipient_id=user_id,
                event_type=Notification.EventType.PASSWORD_RESET,
                payload=payload,
                channel=Notification.Channel.EMAIL,
            )
    except Exception as exc:
        logger.error('handle_password_reset_requested failed: %s', exc)
        raise self.retry(exc=exc)


@shared_task(
    name='apps.notifications.tasks.handle_appointment_reminder_due',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def handle_appointment_reminder_due(self, *, payload: dict) -> None:
    """Send a 24h reminder to the client for an upcoming appointment."""
    from apps.identity.models import User
    from apps.notifications.engines.notifying import NotifyingEngine

    try:
        client_id = payload.get('client_id')
        appointment_id = payload.get('appointment_id')
        if not client_id:
            return

        NotifyingEngine.dispatch_to_recipient(
            recipient_id=client_id,
            event_type=Notification.EventType.APPOINTMENT_REMINDER,
            payload=payload,
            appointment_id=appointment_id,
            channel=Notification.Channel.IN_APP,
        )

        try:
            client = User.objects.get(pk=client_id)
            if client.notification_email:
                NotifyingEngine.dispatch_to_recipient(
                    recipient_id=client_id,
                    event_type=Notification.EventType.APPOINTMENT_REMINDER,
                    payload=payload,
                    appointment_id=appointment_id,
                    channel=Notification.Channel.EMAIL,
                )
        except User.DoesNotExist:
            pass

    except Exception as exc:
        logger.error('handle_appointment_reminder_due failed: %s', exc)
        raise self.retry(exc=exc)


@shared_task(
    name='apps.notifications.tasks.scan_appointment_reminders',
)
def scan_appointment_reminders() -> None:
    """
    Periodic beat task — fires every hour. Finds confirmed/assigned RDVs
    starting in the next 23-25h that have no reminder yet, and publishes
    one AppointmentReminderDueEvent per RDV.

    Idempotent: dedup uses the Notification table — an RDV with any
    APPOINTMENT_REMINDER notification (any channel, any status except
    CANCELLED) is skipped.
    """
    import datetime

    from django.db.models import Q
    from django.utils import timezone

    from apps.appointments.models import Appointment
    from apps.notifications.models import Notification as Notif
    from core.events import AppointmentReminderDueEvent
    from core.publisher import now_iso, publish

    now = timezone.now()
    window_start = now + datetime.timedelta(hours=23)
    window_end = now + datetime.timedelta(hours=25)

    upcoming = Appointment.objects.filter(
        status__in=[
            Appointment.Status.ASSIGNED,
            Appointment.Status.CONFIRMED,
        ],
        scheduled_at__gte=window_start,
        scheduled_at__lt=window_end,
    ).select_related('client', 'service', 'agency')

    already_reminded = set(
        Notif.objects.filter(
            event_type=Notif.EventType.APPOINTMENT_REMINDER,
            appointment__in=upcoming,
        ).exclude(
            status=Notif.Status.CANCELLED,
        ).values_list('appointment_id', flat=True)
    )

    fired = 0
    for appt in upcoming:
        if appt.pk in already_reminded:
            continue

        publish(AppointmentReminderDueEvent(
            occurred_at=now_iso(),
            appointment_id=appt.pk,
            appointment_ref=appt.reference,
            client_id=appt.client_id,
            service_name=appt.service.name,
            agency_name=appt.agency.name,
            scheduled_at=appt.scheduled_at.isoformat(),
        ))
        fired += 1

    logger.info(
        'scan_appointment_reminders fired %s reminders (%s candidates)',
        fired, upcoming.count(),
    )


@shared_task(
    name='apps.notifications.tasks.handle_email_verification_requested',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def handle_email_verification_requested(self, *, payload: dict) -> None:
    """
    Send the email-verification link to a freshly-registered user.
    Email only — security-sensitive and the user has no in-app session yet.
    """
    from apps.notifications.engines.notifying import NotifyingEngine

    try:
        user_id = payload.get('user_id')
        if not user_id:
            return

        NotifyingEngine.dispatch_to_recipient(
            recipient_id=user_id,
            event_type=Notification.EventType.EMAIL_VERIFICATION,
            payload=payload,
            channel=Notification.Channel.EMAIL,
        )

    except Exception as exc:
        logger.error('handle_email_verification_requested failed: %s', exc)
        raise self.retry(exc=exc)


@shared_task(
    name='apps.notifications.tasks.handle_password_changed',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def handle_password_changed(self, *, payload: dict) -> None:
    """
    Confirm to the user that their password was changed.
    Email is unconditional — this is a security event, not a marketing one.
    """
    from apps.notifications.engines.notifying import NotifyingEngine

    try:
        user_id = payload.get('user_id')
        if user_id:
            NotifyingEngine.dispatch_to_recipient(
                recipient_id=user_id,
                event_type=Notification.EventType.PASSWORD_CHANGED,
                payload=payload,
                channel=Notification.Channel.EMAIL,
            )
            NotifyingEngine.dispatch_to_recipient(
                recipient_id=user_id,
                event_type=Notification.EventType.PASSWORD_CHANGED,
                payload=payload,
                channel=Notification.Channel.IN_APP,
            )
    except Exception as exc:
        logger.error('handle_password_changed failed: %s', exc)
        raise self.retry(exc=exc)


@shared_task(
    name='apps.notifications.tasks.handle_login_new_device',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def handle_login_new_device(self, *, payload: dict) -> None:
    """
    Alert the user that a login happened from an unknown IP / browser.
    Email is unconditional — security event.
    """
    from apps.notifications.engines.notifying import NotifyingEngine

    try:
        user_id = payload.get('user_id')
        if user_id:
            NotifyingEngine.dispatch_to_recipient(
                recipient_id=user_id,
                event_type=Notification.EventType.LOGIN_NEW_DEVICE,
                payload=payload,
                channel=Notification.Channel.EMAIL,
            )
    except Exception as exc:
        logger.error('handle_login_new_device failed: %s', exc)
        raise self.retry(exc=exc)
