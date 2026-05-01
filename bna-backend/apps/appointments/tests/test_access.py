from datetime import timedelta

import pytest
from django.utils import timezone

from apps.appointments.access import AppointmentAccess
from apps.appointments.models import Appointment, AppointmentStatusLog
from apps.identity.models import User
from apps.services.models import Agency, Service
from core.exceptions import AppointmentConflict, AppointmentNotFound


@pytest.fixture
def client_user(db):
    return User.objects.create(
        username='client@bna.tn',
        email='client@bna.tn',
        role=User.Role.CLIENT,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


@pytest.fixture
def agent_user(db):
    return User.objects.create(
        username='agent@bna.tn',
        email='agent@bna.tn',
        role=User.Role.AGENT,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


@pytest.fixture
def service(db):
    return Service.objects.create(name='S', category='retail', type='account')


@pytest.fixture
def agency(db):
    return Agency.objects.create(
        name='A', address='x', city='Tunis', status=Agency.Status.OPEN,
    )


@pytest.fixture
def slot():
    return timezone.now().replace(second=0, microsecond=0) + timedelta(days=3)


@pytest.mark.django_db
class TestAppointmentAccess:

    def test_request_creates_pending_with_reference(
        self, client_user, service, agency, slot,
    ):
        appt = AppointmentAccess.request_appointment(
            client_id=client_user.pk,
            service_id=service.pk,
            agency_id=agency.pk,
            scheduled_at=slot,
        )
        assert appt.status == Appointment.Status.PENDING
        assert appt.reference.startswith('BNA-')
        logs = AppointmentStatusLog.objects.filter(appointment=appt)
        assert logs.count() == 1

    def test_duplicate_slot_raises_conflict(
        self, client_user, service, agency, slot,
    ):
        AppointmentAccess.request_appointment(
            client_id=client_user.pk,
            service_id=service.pk,
            agency_id=agency.pk,
            scheduled_at=slot,
        )
        with pytest.raises(AppointmentConflict):
            AppointmentAccess.request_appointment(
                client_id=client_user.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=slot,
            )

    def test_assign_appointment(
        self, client_user, agent_user, service, agency, slot,
    ):
        appt = AppointmentAccess.request_appointment(
            client_id=client_user.pk,
            service_id=service.pk,
            agency_id=agency.pk,
            scheduled_at=slot,
        )
        assigned = AppointmentAccess.assign_appointment(
            appointment_id=appt.pk,
            agent_id=agent_user.pk,
            agent_assignment_id=None,
        )
        assert assigned.status == Appointment.Status.ASSIGNED
        assert assigned.agent_id == agent_user.pk

    def test_cancel_appointment_logs_transition(
        self, client_user, service, agency, slot,
    ):
        appt = AppointmentAccess.request_appointment(
            client_id=client_user.pk,
            service_id=service.pk,
            agency_id=agency.pk,
            scheduled_at=slot,
        )
        cancelled = AppointmentAccess.cancel_appointment(
            appointment_id=appt.pk,
            cancelled_by_id=client_user.pk,
            reason='Changement de plan',
        )
        assert cancelled.status == Appointment.Status.CANCELLED
        assert cancelled.cancelled_by_id == client_user.pk
        assert cancelled.cancellation_reason == 'Changement de plan'
        logs = AppointmentStatusLog.objects.filter(appointment=appt).order_by('changed_at')
        assert logs.count() == 2
        assert logs.last().to_status == Appointment.Status.CANCELLED

    def test_get_appointment_not_found_raises(self):
        with pytest.raises(AppointmentNotFound):
            AppointmentAccess.get_appointment(appointment_id=999999)
