from django.contrib import admin

from .models import Agency, AgencyService, AgentAssignment, Service


class AgencyServiceInline(admin.TabularInline):
    model = AgencyService
    extra = 1


class AgentAssignmentInline(admin.TabularInline):
    model = AgentAssignment
    extra = 1


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'type', 'duration_minutes', 'is_active')
    list_filter = ('category', 'type', 'is_active')
    search_fields = ('name',)


@admin.register(Agency)
class AgencyAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'status', 'capacity')
    list_filter = ('status', 'city')
    search_fields = ('name', 'city', 'address')
    inlines = [AgencyServiceInline]


@admin.register(AgentAssignment)
class AgentAssignmentAdmin(admin.ModelAdmin):
    list_display = ('agent', 'agency_service', 'is_active', 'assigned_at')
    list_filter = ('is_active',)
