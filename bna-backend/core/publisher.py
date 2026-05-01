import dataclasses
from datetime import datetime, timezone

from celery import current_app as celery_app

from core.events import DomainEvent


def publish(event: DomainEvent) -> None:
    """
    Serialise a domain event and dispatch it to the appropriate
    Celery task queue asynchronously.

    Usage (in any Manager):
        from core.publisher import publish, now_iso
        from core.events import AppointmentRequestedEvent

        publish(AppointmentRequestedEvent(
            occurred_at=now_iso(),
            appointment_id=appt.pk,
            ...
        ))

    The task name follows the convention:
        apps.notifications.tasks.handle_{event_type}
    This contract means NotificationListenerClient tasks must be named
    exactly this way — enforced by tests in this prompt.
    """
    payload = dataclasses.asdict(event)
    task_name = f'apps.notifications.tasks.handle_{event.event_type}'

    celery_app.send_task(
        task_name,
        kwargs={'payload': payload},
        queue='notifications',
    )


def now_iso() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(tz=timezone.utc).isoformat()
