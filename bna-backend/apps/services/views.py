from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.services.managers import ServiceManager
from apps.services.serializers import (
    AgencyOutputSerializer,
    AgencyServiceOutputSerializer,
    AgentAssignmentOutputSerializer,
    AssignAgentSerializer,
    OpenAgencySerializer,
    PublishServiceSerializer,
    RemoveAgentSerializer,
    ServiceHoursSerializer,
    ServiceOutputSerializer,
    UpdateAgencySerializer,
    UpdateServiceSerializer,
)
from core.permissions import IsAdmin
from core.responses import created, no_content, success


# ── Public read views ──────────────────────────────────────────────────────

class ServiceListView(APIView):
    """GET /api/services/ — list active services (public)."""
    permission_classes = [AllowAny]

    def get(self, request):
        services = ServiceManager.get_available_services(
            category=request.query_params.get('category'),
            agency_id=request.query_params.get('agency_id'),
        )
        return success(ServiceOutputSerializer(services, many=True).data)


class ServiceDetailView(APIView):
    """GET /api/services/{service_id}/ — single service (public)."""
    permission_classes = [AllowAny]

    def get(self, request, service_id: int):
        service = ServiceManager.get_service(service_id=service_id)
        return success(ServiceOutputSerializer(service).data)


class AgencyListView(APIView):
    """GET /api/services/agencies/ — list agencies (public)."""
    permission_classes = [AllowAny]

    def get(self, request):
        agencies = ServiceManager.get_agencies(
            status=request.query_params.get('status'),
            service_id=request.query_params.get('service_id'),
        )
        return success(AgencyOutputSerializer(agencies, many=True).data)


class AgencyDetailView(APIView):
    """GET /api/services/agencies/{agency_id}/ — single agency (public)."""
    permission_classes = [AllowAny]

    def get(self, request, agency_id: int):
        agency = ServiceManager.get_agency(agency_id=agency_id)
        return success(AgencyOutputSerializer(agency).data)


# ── Admin write views ──────────────────────────────────────────────────────

class ServiceCreateView(APIView):
    """POST /api/services/create/ — publish new service (admin)."""
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = PublishServiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = ServiceManager.publish_service(
            admin_id=request.user.pk,
            **serializer.validated_data,
        )

        return created(ServiceOutputSerializer(service).data)


class ServiceUpdateView(APIView):
    """PATCH /api/services/{service_id}/update/ — admin."""
    permission_classes = [IsAdmin]

    def patch(self, request, service_id: int):
        serializer = UpdateServiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = ServiceManager.update_service_config(
            service_id=service_id,
            admin_id=request.user.pk,
            **serializer.validated_data,
        )

        return success(ServiceOutputSerializer(service).data)


class ServiceSuspendView(APIView):
    """POST /api/services/{service_id}/suspend/ — admin."""
    permission_classes = [IsAdmin]

    def post(self, request, service_id: int):
        service = ServiceManager.suspend_service(
            service_id=service_id,
            admin_id=request.user.pk,
        )
        return success(ServiceOutputSerializer(service).data)


class ServiceReactivateView(APIView):
    """POST /api/services/{service_id}/reactivate/ — admin."""
    permission_classes = [IsAdmin]

    def post(self, request, service_id: int):
        service = ServiceManager.reactivate_service(
            service_id=service_id,
            admin_id=request.user.pk,
        )
        return success(ServiceOutputSerializer(service).data)


class AgencyCreateView(APIView):
    """POST /api/services/agencies/create/ — admin."""
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = OpenAgencySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        agency = ServiceManager.open_agency(
            admin_id=request.user.pk,
            **serializer.validated_data,
        )

        return created(AgencyOutputSerializer(agency).data)


class AgencyUpdateView(APIView):
    """PATCH /api/services/agencies/{agency_id}/update/ — admin."""
    permission_classes = [IsAdmin]

    def patch(self, request, agency_id: int):
        serializer = UpdateAgencySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        agency = ServiceManager.update_agency(
            agency_id=agency_id,
            admin_id=request.user.pk,
            **serializer.validated_data,
        )

        return success(AgencyOutputSerializer(agency).data)


class AgencyCloseView(APIView):
    """POST /api/services/agencies/{agency_id}/close/ — admin."""
    permission_classes = [IsAdmin]

    def post(self, request, agency_id: int):
        agency = ServiceManager.close_agency(
            agency_id=agency_id,
            admin_id=request.user.pk,
        )
        return success(AgencyOutputSerializer(agency).data)


class AgentAssignView(APIView):
    """POST /api/services/{service_id}/agents/ — admin assigns agent."""
    permission_classes = [IsAdmin]

    def post(self, request, service_id: int):
        serializer = AssignAgentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        assignment = ServiceManager.assign_agent_to_service(
            service_id=service_id,
            agent_id=serializer.validated_data['agent_id'],
            agency_id=serializer.validated_data['agency_id'],
            admin_id=request.user.pk,
        )

        return created(AgentAssignmentOutputSerializer(assignment).data)


class AgentRemoveView(APIView):
    """POST /api/services/{service_id}/agents/remove/ — admin."""
    permission_classes = [IsAdmin]

    def post(self, request, service_id: int):
        serializer = RemoveAgentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ServiceManager.remove_agent_from_service(
            service_id=service_id,
            agent_id=serializer.validated_data['agent_id'],
            agency_id=serializer.validated_data['agency_id'],
            admin_id=request.user.pk,
        )

        return no_content()


class ServiceHoursView(APIView):
    """POST /api/services/{service_id}/hours/ — configure opening hours."""
    permission_classes = [IsAdmin]

    def post(self, request, service_id: int):
        serializer = ServiceHoursSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        agency_id = data.pop('agency_id')
        schedule = data

        agency_service = ServiceManager.configure_service_hours(
            service_id=service_id,
            agency_id=agency_id,
            schedule=schedule,
            admin_id=request.user.pk,
        )

        return success(AgencyServiceOutputSerializer(agency_service).data)
