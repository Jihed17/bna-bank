from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from core.exceptions import NotificationNotFound
from core.logging import AuditMixin

from .models import Notification


class NotificationAccess(AuditMixin):
    """
    Resource Access for the notifications domain.
    All ORM operations on Notification go through this class.
    NotifyingEngine, MatchingEngine, and Celery tasks use these verbs —
    they never touch Notification.objects directly.
    """

    @staticmethod
    def enqueue_notification(
        *,
        recipient_id: int,
        channel: str,
        event_type: str,
        payload: dict | None = None,
        appointment_id: int | None = None,
        max_retries: int = 3,
    ) -> Notification:
        """
        Persist a new notification in QUEUED status.
        NotifyingEngine picks it up and calls dispatch().
        """
        with transaction.atomic():
            notification = Notification.objects.create(
                recipient_id=recipient_id,
                channel=channel,
                event_type=event_type,
                payload=payload or {},
                appointment_id=appointment_id,
                status=Notification.Status.QUEUED,
                max_retries=max_retries,
            )
        return notification

    @staticmethod
    def get_delivery_status(*, notification_id: int) -> Notification:
        """
        Return a notification by PK.
        Raises NotificationNotFound if missing.
        """
        try:
            return Notification.objects.select_related('recipient').get(pk=notification_id)
        except Notification.DoesNotExist:
            raise NotificationNotFound()

    @staticmethod
    def mark_sending(*, notification_id: int) -> Notification:
        """
        Transition QUEUED → SENDING and stamp `sent_at`.
        Idempotent on repeat calls from the same task body.
        """
        with transaction.atomic():
            try:
                notification = Notification.objects.select_for_update().get(pk=notification_id)
            except Notification.DoesNotExist:
                raise NotificationNotFound()

            notification.status = Notification.Status.SENDING
            notification.sent_at = timezone.now()
            notification.save(update_fields=['status', 'sent_at', 'updated_at'])

        return notification

    @staticmethod
    def mark_delivered(*, notification_id: int) -> Notification:
        """
        Transition SENDING → DELIVERED and stamp `delivered_at`.
        """
        with transaction.atomic():
            try:
                notification = Notification.objects.select_for_update().get(pk=notification_id)
            except Notification.DoesNotExist:
                raise NotificationNotFound()

            notification.status = Notification.Status.DELIVERED
            notification.delivered_at = timezone.now()
            notification.save(update_fields=['status', 'delivered_at', 'updated_at'])

        return notification

    @staticmethod
    def mark_read(*, notification_id: int) -> Notification:
        """
        Stamp `read_at` to mark the notification as seen by the recipient.
        Idempotent — re-reading does not update the timestamp.
        """
        with transaction.atomic():
            try:
                notification = Notification.objects.select_for_update().get(pk=notification_id)
            except Notification.DoesNotExist:
                raise NotificationNotFound()

            if notification.read_at is None:
                notification.read_at = timezone.now()
                notification.save(update_fields=['read_at', 'updated_at'])

        return notification

    @staticmethod
    def mark_failed(
        *,
        notification_id: int,
        reason: str = '',
    ) -> Notification:
        """
        Mark the notification as FAILED, increment retry_count, and record
        the failure reason. The Celery task decides whether to retry based
        on retry_count vs max_retries.
        """
        with transaction.atomic():
            try:
                notification = Notification.objects.select_for_update().get(pk=notification_id)
            except Notification.DoesNotExist:
                raise NotificationNotFound()

            notification.status = Notification.Status.FAILED
            notification.failure_reason = reason
            notification.retry_count = (notification.retry_count or 0) + 1
            notification.save(update_fields=[
                'status', 'failure_reason', 'retry_count', 'updated_at',
            ])

        return notification

    @staticmethod
    def cancel_queued_notification(*, notification_id: int) -> Notification:
        """
        Transition QUEUED → CANCELLED. Used by MatchingEngine to retract
        agent notifications once another agent has accepted.
        Raises NotificationNotFound.
        """
        with transaction.atomic():
            try:
                notification = Notification.objects.select_for_update().get(pk=notification_id)
            except Notification.DoesNotExist:
                raise NotificationNotFound()

            notification.status = Notification.Status.CANCELLED
            notification.save(update_fields=['status', 'updated_at'])

        return notification

    @staticmethod
    def get_recipient_notifications(
        *,
        recipient_id: int,
        event_type: str | None = None,
        limit: int = 50,
    ) -> list[Notification]:
        """
        Return the most recent notifications for a recipient,
        optionally filtered by event_type. Returns an empty list
        if none found — never raises.
        """
        qs = Notification.objects.filter(recipient_id=recipient_id)
        if event_type:
            qs = qs.filter(event_type=event_type)
        return list(qs.order_by('-created_at')[:limit])
