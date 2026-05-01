from rest_framework.exceptions import PermissionDenied
from rest_framework.views import APIView

from apps.notifications.access import NotificationAccess
from apps.notifications.models import Notification
from apps.notifications.serializers import NotificationOutputSerializer
from core.permissions import IsGuest
from core.responses import no_content, success


class NotificationListView(APIView):
    """
    GET /api/notifications/ — recent in-app notifications for the user.

    Polled by the frontend NotificationListenerClient. Query params:
      ?event_type=appointment_assigned
      ?limit=20 (default 20, max 50)
    """
    permission_classes = [IsGuest]

    def get(self, request):
        try:
            limit = min(int(request.query_params.get('limit', 20)), 50)
        except (TypeError, ValueError):
            limit = 20

        notifications = NotificationAccess.get_recipient_notifications(
            recipient_id=request.user.pk,
            event_type=request.query_params.get('event_type'),
            limit=limit,
        )

        return success(
            NotificationOutputSerializer(notifications, many=True).data,
        )


class NotificationMarkReadView(APIView):
    """
    POST /api/notifications/{id}/read/ — mark as DELIVERED (= read).
    Only the recipient can mark their own notifications.
    """
    permission_classes = [IsGuest]

    def post(self, request, notification_id: int):
        notification = NotificationAccess.get_delivery_status(
            notification_id=notification_id,
        )

        if notification.recipient_id != request.user.pk:
            raise PermissionDenied(
                'Vous ne pouvez marquer que vos propres notifications.'
            )

        NotificationAccess.mark_delivered(notification_id=notification_id)

        return no_content()


class UnreadCountView(APIView):
    """GET /api/notifications/unread-count/ — QUEUED IN_APP count for the badge."""
    permission_classes = [IsGuest]

    def get(self, request):
        notifications = NotificationAccess.get_recipient_notifications(
            recipient_id=request.user.pk,
            limit=50,
        )

        unread = sum(
            1 for n in notifications
            if n.status == Notification.Status.QUEUED
            and n.channel == Notification.Channel.IN_APP
        )

        return success({'unread_count': unread})
