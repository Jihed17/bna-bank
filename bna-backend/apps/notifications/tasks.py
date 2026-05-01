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
    Notify the other party of the cancellation.
    If the client cancelled: notify the agent (if assigned).
    If the agent cancelled: notify the client.
    """
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
            if recipient_id:
                NotifyingEngine.dispatch_to_recipient(
                    recipient_id=recipient_id,
                    event_type=Notification.EventType.APPOINTMENT_CANCELLED,
                    payload=payload,
                    appointment_id=appointment_id,
                    channel=Notification.Channel.IN_APP,
                )

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
