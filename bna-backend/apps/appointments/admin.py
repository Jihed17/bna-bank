from django.contrib import admin

from .models import Appointment, AppointmentStatusLog


class StatusLogInline(admin.TabularInline):
    model = AppointmentStatusLog
    extra = 0
    readonly_fields = ('from_status', 'to_status', 'changed_by', 'reason', 'changed_at')
    can_delete = False


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = (
        'reference',
        'client',
        'agent',
        'service',
        'agency',
        'scheduled_at',
        'status',
    )
    list_filter = ('status', 'service', 'agency')
    search_fields = ('reference', 'client__email', 'agent__email')
    readonly_fields = ('reference', 'created_at', 'updated_at', 'status_changed_at')
    inlines = [StatusLogInline]
    date_hierarchy = 'scheduled_at'
