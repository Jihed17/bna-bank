from django.urls import path

from apps.notifications.views import (
    NotificationListView,
    NotificationMarkReadView,
    UnreadCountView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('unread-count/', UnreadCountView.as_view(), name='notification-unread-count'),
    path('<int:notification_id>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
]
