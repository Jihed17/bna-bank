from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        'event_type',
        'channel',
        'recipient',
        'status',
        'retry_count',
        'created_at',
    )
    list_filter = ('channel', 'status', 'event_type')
    search_fields = ('recipient__email',)
    readonly_fields = ('created_at', 'updated_at', 'sent_at', 'delivered_at')
