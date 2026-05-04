from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.appointments.managers import AppointmentManager
from apps.appointments.serializers import (
    AgentScheduleSerializer,
    AppointmentListOutputSerializer,
    AppointmentOutputSerializer,
    AvailableSlotsSerializer,
    CancelAppointmentSerializer,
    PendingQueueSerializer,
    RejectAppointmentSerializer,
    RequestAppointmentSerializer,
    UpdateAppointmentSerializer,
)
from core.permissions import IsAgent, IsClient, IsGuest
from core.responses import created, success


class RequestAppointmentView(APIView):
    """POST /api/appointments/ — client books a new appointment."""
    permission_classes = [IsClient]

    def post(self, request):
        serializer = RequestAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment = AppointmentManager.request_appointment(
            client_id=request.user.pk,
            **serializer.validated_data,
        )

        return created(AppointmentOutputSerializer(appointment).data)


class ClientAppointmentListView(APIView):
    """GET /api/appointments/list/ — own history; ?status filter."""
    permission_classes = [IsClient]

    def get(self, request):
        appointments = AppointmentManager.get_client_history(
            client_id=request.user.pk,
            requesting_user_id=request.user.pk,
            status=request.query_params.get('status'),
        )
        return success(
            AppointmentListOutputSerializer(appointments, many=True).data,
        )


class AppointmentDetailView(APIView):
    """GET /api/appointments/{id}/ — access controlled by Manager."""
    permission_classes = [IsGuest]

    def get(self, request, appointment_id: int):
        appointment = AppointmentManager.get_appointment(
            appointment_id=appointment_id,
            requesting_user_id=request.user.pk,
        )
        return success(AppointmentOutputSerializer(appointment).data)


class CancelAppointmentView(APIView):
    """POST /api/appointments/{id}/cancel/ — CLIENT/AGENT/ADMIN per Manager."""
    permission_classes = [IsGuest]

    def post(self, request, appointment_id: int):
        serializer = CancelAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment = AppointmentManager.cancel_appointment(
            appointment_id=appointment_id,
            cancelled_by_id=request.user.pk,
            reason=serializer.validated_data.get('reason', ''),
        )

        return success(AppointmentListOutputSerializer(appointment).data)


class UpdateAppointmentView(APIView):
    """
    PATCH /api/appointments/{id}/update/
    Partially update a PENDING appointment (slot and/or reason).
    Only the owning client (or an admin) may update.
    """
    permission_classes = [IsClient]

    def patch(self, request, appointment_id: int):
        serializer = UpdateAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment = AppointmentManager.update_appointment(
            appointment_id=appointment_id,
            requesting_user_id=request.user.pk,
            **serializer.validated_data,
        )

        return success(AppointmentOutputSerializer(appointment).data)


class AcceptAppointmentView(APIView):
    """POST /api/appointments/{id}/accept/ — agent accepts."""
    permission_classes = [IsAgent]

    def post(self, request, appointment_id: int):
        appointment = AppointmentManager.accept_appointment(
            appointment_id=appointment_id,
            agent_id=request.user.pk,
        )
        return success(AppointmentOutputSerializer(appointment).data)


class RejectAppointmentView(APIView):
    """POST /api/appointments/{id}/reject/ — agent rejects."""
    permission_classes = [IsAgent]

    def post(self, request, appointment_id: int):
        serializer = RejectAppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        appointment = AppointmentManager.reject_appointment(
            appointment_id=appointment_id,
            agent_id=request.user.pk,
            reason=serializer.validated_data.get('reason', ''),
        )

        return success(AppointmentListOutputSerializer(appointment).data)


class ConfirmAppointmentView(APIView):
    """POST /api/appointments/{id}/confirm/ — ASSIGNED → CONFIRMED."""
    permission_classes = [IsAgent]

    def post(self, request, appointment_id: int):
        appointment = AppointmentManager.confirm_appointment(
            appointment_id=appointment_id,
            agent_id=request.user.pk,
        )
        return success(AppointmentListOutputSerializer(appointment).data)


class CompleteAppointmentView(APIView):
    """POST /api/appointments/{id}/complete/ — mark COMPLETED."""
    permission_classes = [IsAgent]

    def post(self, request, appointment_id: int):
        appointment = AppointmentManager.complete_appointment(
            appointment_id=appointment_id,
            agent_id=request.user.pk,
        )
        return success(AppointmentListOutputSerializer(appointment).data)


class AvailableSlotsView(APIView):
    """GET /api/appointments/slots/ — public slot lookup."""
    permission_classes = [AllowAny]

    def get(self, request):
        serializer = AvailableSlotsSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        slots = AppointmentManager.get_available_slots(
            service_id=serializer.validated_data['service_id'],
            agency_id=serializer.validated_data['agency_id'],
            on_date=serializer.validated_data['date'],
        )

        return success([slot.isoformat() for slot in slots])


class AgentScheduleView(APIView):
    """
    GET /api/appointments/schedule/ — agent's calendar.
    Admins can pass ?agent_id=X to view any agent's schedule.
    """
    permission_classes = [IsAgent]

    def get(self, request):
        serializer = AgentScheduleSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        from apps.identity.models import User

        agent_id = (
            serializer.validated_data.get('agent_id')
            if request.user.role == User.Role.ADMIN
            else request.user.pk
        )

        calendar = AppointmentManager.get_agent_schedule(
            agent_id=agent_id or request.user.pk,
            requesting_user_id=request.user.pk,
            from_dt=serializer.validated_data.get('from_dt'),
            to_dt=serializer.validated_data.get('to_dt'),
        )

        return success(calendar)


class PendingQueueView(APIView):
    """GET /api/appointments/pending/ — agent/admin only."""
    permission_classes = [IsAgent]

    def get(self, request):
        serializer = PendingQueueSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)

        appointments = AppointmentManager.get_pending_appointments(
            requesting_user_id=request.user.pk,
            service_id=serializer.validated_data.get('service_id'),
            agency_id=serializer.validated_data.get('agency_id'),
        )

        return success(
            AppointmentListOutputSerializer(appointments, many=True).data,
        )
