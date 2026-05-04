import dataclasses
import logging
from datetime import datetime, timezone

from celery import current_app as celery_app

from core.events import DomainEvent

logger = logging.getLogger('bna.publisher')


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

    Broker outages are swallowed: if Redis is unreachable in async mode,
    the event is logged but the business operation that triggered it
    (e.g. RDV creation) still succeeds. Lost notifications are visible
    in the logs and can be replayed manually if needed.
    """
    payload = dataclasses.asdict(event)
    task_name = f'apps.notifications.tasks.handle_{event.event_type}'

    # Look up the registered Task object instead of using send_task(): the
    # latter ignores CELERY_TASK_ALWAYS_EAGER and always goes through the
    # broker. apply_async() on a Task instance respects eager mode, which
    # lets dev environments run the listener inline without Redis.
    task = celery_app.tasks.get(task_name)

    try:
        if task is None:
            celery_app.send_task(
                task_name,
                kwargs={'payload': payload},
                queue='notifications',
            )
        else:
            task.apply_async(
                kwargs={'payload': payload},
                queue='notifications',
            )
    except Exception as exc:
        logger.warning(
            'publish_failed',
            extra={
                'event_type': event.event_type,
                'task_name': task_name,
                'error': str(exc),
            },
        )


def now_iso() -> str:
    """Return current UTC time as ISO 8601 string."""
    return datetime.now(tz=timezone.utc).isoformat()
