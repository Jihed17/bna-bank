from django.contrib import admin

from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('author', 'service', 'rating', 'status', 'created_at')
    list_filter = ('status', 'rating', 'service')
    search_fields = ('author__email', 'service__name', 'comment')
    readonly_fields = ('created_at', 'updated_at')
