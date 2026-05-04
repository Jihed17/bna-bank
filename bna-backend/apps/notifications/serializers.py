from rest_framework import serializers

from apps.notifications.models import Notification


class NotificationOutputSerializer(serializers.ModelSerializer):
    channel_display = serializers.CharField(source='get_channel_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'channel', 'channel_display',
            'event_type', 'event_type_display',
            'status', 'status_display',
            'payload',
            'appointment_id',
            'sent_at', 'delivered_at', 'read_at',
            'created_at',
        ]
        read_only_fields = fields
