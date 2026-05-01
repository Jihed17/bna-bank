from rest_framework import serializers

from apps.identity.serializers import UserOutputSerializer
from apps.services.models import (
    Agency,
    AgencyService,
    AgentAssignment,
    Service,
)


# ── Input serializers ──────────────────────────────────────────────────────

class PublishServiceSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, default='', allow_blank=True)
    category = serializers.ChoiceField(choices=Service._meta.get_field('category').choices)
    type = serializers.ChoiceField(choices=Service._meta.get_field('type').choices)
    duration_minutes = serializers.IntegerField(
        min_value=5, max_value=480, required=False, default=30,
    )
    icon = serializers.CharField(max_length=100, required=False, default='', allow_blank=True)
    order = serializers.IntegerField(min_value=0, required=False, default=0)


class UpdateServiceSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    category = serializers.ChoiceField(
        choices=Service._meta.get_field('category').choices, required=False,
    )
    type = serializers.ChoiceField(
        choices=Service._meta.get_field('type').choices, required=False,
    )
    duration_minutes = serializers.IntegerField(min_value=5, max_value=480, required=False)
    icon = serializers.CharField(max_length=100, required=False, allow_blank=True)
    order = serializers.IntegerField(min_value=0, required=False)


class OpenAgencySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    address = serializers.CharField()
    city = serializers.CharField(max_length=100)
    postal_code = serializers.CharField(max_length=10, required=False, default='', allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, default='', allow_blank=True)
    email = serializers.EmailField(required=False, default='', allow_blank=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    capacity = serializers.IntegerField(min_value=1, required=False, default=1)


class UpdateAgencySerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=False)
    address = serializers.CharField(required=False)
    city = serializers.CharField(max_length=100, required=False)
    postal_code = serializers.CharField(max_length=10, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    capacity = serializers.IntegerField(min_value=1, required=False)


class AssignAgentSerializer(serializers.Serializer):
    agent_id = serializers.IntegerField()
    service_id = serializers.IntegerField(required=False)
    agency_id = serializers.IntegerField()


class RemoveAgentSerializer(serializers.Serializer):
    agent_id = serializers.IntegerField()
    agency_id = serializers.IntegerField()


class ServiceHoursSerializer(serializers.Serializer):
    """Schedule keys map to AgencyService time fields; all optional."""
    agency_id = serializers.IntegerField()
    monday_open = serializers.TimeField(required=False, allow_null=True)
    monday_close = serializers.TimeField(required=False, allow_null=True)
    tuesday_open = serializers.TimeField(required=False, allow_null=True)
    tuesday_close = serializers.TimeField(required=False, allow_null=True)
    wednesday_open = serializers.TimeField(required=False, allow_null=True)
    wednesday_close = serializers.TimeField(required=False, allow_null=True)
    thursday_open = serializers.TimeField(required=False, allow_null=True)
    thursday_close = serializers.TimeField(required=False, allow_null=True)
    friday_open = serializers.TimeField(required=False, allow_null=True)
    friday_close = serializers.TimeField(required=False, allow_null=True)
    saturday_open = serializers.TimeField(required=False, allow_null=True)
    saturday_close = serializers.TimeField(required=False, allow_null=True)


# ── Output serializers ─────────────────────────────────────────────────────

class ServiceOutputSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'description', 'category', 'category_display',
            'type', 'type_display', 'duration_minutes', 'is_active',
            'icon', 'order', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class AgencyServiceOutputSerializer(serializers.ModelSerializer):
    service = ServiceOutputSerializer(read_only=True)

    class Meta:
        model = AgencyService
        fields = [
            'id', 'service', 'is_active',
            'monday_open', 'monday_close',
            'tuesday_open', 'tuesday_close',
            'wednesday_open', 'wednesday_close',
            'thursday_open', 'thursday_close',
            'friday_open', 'friday_close',
            'saturday_open', 'saturday_close',
        ]


class AgencyOutputSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    agency_services = AgencyServiceOutputSerializer(many=True, read_only=True)

    class Meta:
        model = Agency
        fields = [
            'id', 'name', 'address', 'city', 'postal_code',
            'phone', 'email', 'latitude', 'longitude',
            'status', 'status_display', 'capacity',
            'agency_services', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class AgentAssignmentOutputSerializer(serializers.ModelSerializer):
    agent = UserOutputSerializer(read_only=True)

    class Meta:
        model = AgentAssignment
        fields = ['id', 'agent', 'agency_service', 'is_active', 'assigned_at']
        read_only_fields = fields
