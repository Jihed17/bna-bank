from django.urls import path

from apps.appointments.views import (
    AcceptAppointmentView,
    AgentScheduleView,
    AppointmentDetailView,
    AvailableSlotsView,
    CancelAppointmentView,
    ClientAppointmentListView,
    CompleteAppointmentView,
    ConfirmAppointmentView,
    PendingQueueView,
    RejectAppointmentView,
    RequestAppointmentView,
    UpdateAppointmentView,
)

urlpatterns = [
    # Booking
    path('', RequestAppointmentView.as_view(), name='appointment-request'),
    path('list/', ClientAppointmentListView.as_view(), name='appointment-list'),

    # Public / agent query endpoints (non-digit paths must precede int route)
    path('slots/', AvailableSlotsView.as_view(), name='appointment-slots'),
    path('schedule/', AgentScheduleView.as_view(), name='appointment-schedule'),
    path('pending/', PendingQueueView.as_view(), name='appointment-pending'),

    # Per-appointment endpoints (int converter only matches digits)
    path('<int:appointment_id>/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('<int:appointment_id>/cancel/', CancelAppointmentView.as_view(), name='appointment-cancel'),
    path('<int:appointment_id>/update/', UpdateAppointmentView.as_view(), name='appointment-update'),
    path('<int:appointment_id>/accept/', AcceptAppointmentView.as_view(), name='appointment-accept'),
    path('<int:appointment_id>/reject/', RejectAppointmentView.as_view(), name='appointment-reject'),
    path('<int:appointment_id>/confirm/', ConfirmAppointmentView.as_view(), name='appointment-confirm'),
    path('<int:appointment_id>/complete/', CompleteAppointmentView.as_view(), name='appointment-complete'),
]
