from rest_framework import serializers

from apps.appointments.models import Appointment, AppointmentStatusLog
from apps.identity.serializers import UserOutputSerializer
from apps.services.serializers import AgencyOutputSerializer, ServiceOutputSerializer


# ── Input serializers ──────────────────────────────────────────────────────

class RequestAppointmentSerializer(serializers.Serializer):
    service_id = serializers.IntegerField()
    agency_id = serializers.IntegerField()
    scheduled_at = serializers.DateTimeField()
    reason = serializers.CharField(
        required=False, default='', allow_blank=True, max_length=1000,
    )


class CancelAppointmentSerializer(serializers.Serializer):
    reason = serializers.CharField(
        required=False, default='', allow_blank=True, max_length=500,
    )


class UpdateAppointmentSerializer(serializers.Serializer):
    """Partial update — both fields optional."""
    scheduled_at = serializers.DateTimeField(required=False)
    reason = serializers.CharField(
        required=False, allow_blank=True, max_length=1000,
    )


class RejectAppointmentSerializer(serializers.Serializer):
    reason = serializers.CharField(
        required=False, default='', allow_blank=True, max_length=500,
    )


class AvailableSlotsSerializer(serializers.Serializer):
    service_id = serializers.IntegerField()
    agency_id = serializers.IntegerField()
    date = serializers.DateField()


class AgentScheduleSerializer(serializers.Serializer):
    agent_id = serializers.IntegerField(required=False)
    from_dt = serializers.DateTimeField(required=False)
    to_dt = serializers.DateTimeField(required=False)


class PendingQueueSerializer(serializers.Serializer):
    service_id = serializers.IntegerField()
    agency_id = serializers.IntegerField()


# ── Output serializers ─────────────────────────────────────────────────────

class StatusLogOutputSerializer(serializers.ModelSerializer):
    changed_by = UserOutputSerializer(read_only=True)

    class Meta:
        model = AppointmentStatusLog
        fields = [
            'id', 'from_status', 'to_status', 'changed_by',
            'reason', 'changed_at',
        ]
        read_only_fields = fields


class AppointmentOutputSerializer(serializers.ModelSerializer):
    client = UserOutputSerializer(read_only=True)
    agent = UserOutputSerializer(read_only=True)
    service = ServiceOutputSerializer(read_only=True)
    agency = AgencyOutputSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    status_logs = StatusLogOutputSerializer(many=True, read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'reference', 'status', 'status_display',
            'client', 'agent',
            'service', 'agency',
            'scheduled_at', 'duration_minutes',
            'reason', 'notes',
            'cancellation_reason', 'cancelled_by',
            'status_logs',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields


class AppointmentListOutputSerializer(serializers.ModelSerializer):
    """Lighter serialiser for list views — no nested logs."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    client_name = serializers.SerializerMethodField()
    agent_name = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    agency_name = serializers.SerializerMethodField()
    agency_city = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id', 'reference', 'status', 'status_display',
            'client_name', 'agent_name',
            'service_name', 'agency_name', 'agency_city',
            'scheduled_at', 'duration_minutes',
            'reason', 'created_at',
        ]
        read_only_fields = fields

    def get_client_name(self, obj) -> str:
        return obj.client.get_full_name() if obj.client else ''

    def get_agent_name(self, obj) -> str:
        return obj.agent.get_full_name() if obj.agent else ''

    def get_service_name(self, obj) -> str:
        return obj.service.name if obj.service else ''

    def get_agency_name(self, obj) -> str:
        return obj.agency.name if obj.agency else ''

    def get_agency_city(self, obj) -> str:
        return obj.agency.city if obj.agency else ''
