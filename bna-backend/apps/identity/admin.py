from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import PasswordResetToken, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'get_full_name', 'role', 'status', 'created_at')
    list_filter = ('role', 'status')
    search_fields = ('email', 'first_name', 'last_name', 'national_id')
    ordering = ('-created_at',)
    fieldsets = BaseUserAdmin.fieldsets + (
        ('BNA', {
            'fields': (
                'role',
                'status',
                'phone',
                'date_of_birth',
                'national_id',
                'preferred_language',
                'notification_email',
                'notification_sms',
            ),
        }),
    )


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'used', 'expires_at', 'created_at')
    list_filter = ('used',)
    search_fields = ('user__email',)
    readonly_fields = ('token', 'expires_at', 'created_at')
