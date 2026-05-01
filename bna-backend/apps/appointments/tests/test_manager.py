from datetime import date, time, timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone

from apps.appointments.managers import AppointmentManager
from apps.appointments.models import Appointment
from apps.identity.models import User
from apps.services.access import AgencyAccess, ServiceAccess
from apps.services.models import AgencyService, AgentAssignment
from core.exceptions import BNAException, InvalidStatusTransition


# ── Fixtures ────────────────────────────────────────────────────────────────

@pytest.fixture
def client_user(db):
    return User.objects.create(
        username='cl@bna.tn',
        email='cl@bna.tn',
        role=User.Role.CLIENT,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


@pytest.fixture
def agent_user(db):
    return User.objects.create(
        username='ag@bna.tn',
        email='ag@bna.tn',
        role=User.Role.AGENT,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create(
        username='adm@bna.tn',
        email='adm@bna.tn',
        role=User.Role.ADMIN,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


@pytest.fixture
def service(db):
    return ServiceAccess.publish_service(
        name='Ouverture de compte',
        category='retail',
        type='account',
        duration_minutes=30,
    )


@pytest.fixture
def agency(db):
    return AgencyAccess.open_agency(
        name='Tunis Centre', address='1 av', city='Tunis', capacity=5,
    )


@pytest.fixture
def agency_service(db, agency, service):
    return AgencyService.objects.create(
        agency=agency, service=service, is_active=True,
        monday_open=time(9, 0), monday_close=time(17, 0),
        tuesday_open=time(9, 0), tuesday_close=time(17, 0),
        wednesday_open=time(9, 0), wednesday_close=time(17, 0),
        thursday_open=time(9, 0), thursday_close=time(17, 0),
        friday_open=time(9, 0), friday_close=time(17, 0),
        saturday_open=time(9, 0), saturday_close=time(13, 0),
    )


@pytest.fixture
def assignment(db, agent_user, agency_service):
    return AgentAssignment.objects.create(
        agent=agent_user, agency_service=agency_service, is_active=True,
    )


@pytest.fixture
def future_slot():
    """A slot 5+ days from now at 10:00, not a Sunday."""
    now = timezone.now()
    candidate = now + timedelta(days=5)
    while candidate.weekday() == 6:
        candidate += timedelta(days=1)
    return candidate.replace(hour=10, minute=0, second=0, microsecond=0)


# ── Tests ───────────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestRequestAppointment:

    def test_creates_pending_appointment(
        self, client_user, service, agency, agency_service, assignment, future_slot,
    ):
        with patch('apps.appointments.managers.publish'):
            appt = AppointmentManager.request_appointment(
                client_id=client_user.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=future_slot,
                reason="Besoin d'un compte courant.",
            )
        assert appt.pk is not None
        assert appt.status == Appointment.Status.PENDING
        assert appt.reference.startswith('BNA-')
        assert appt.client_id == client_user.pk

    def test_publishes_appointment_requested_event(
        self, client_user, service, agency, agency_service, assignment,
        agent_user, future_slot,
    ):
        with patch('apps.appointments.managers.publish') as mock_pub:
            AppointmentManager.request_appointment(
                client_id=client_user.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=future_slot,
            )
        mock_pub.assert_called_once()
        event = mock_pub.call_args[0][0]
        assert event.event_type == 'appointment_requested'
        assert agent_user.pk in event.eligible_agent_ids

    def test_guest_cannot_request_appointment(
        self, service, agency, agency_service, future_slot, db,
    ):
        guest = User.objects.create(
            username='g@bna.tn',
            email='g@bna.tn',
            role=User.Role.GUEST,
            status=User.AccountStatus.PENDING,
            password='!',
        )
        with pytest.raises(PermissionError):
            AppointmentManager.request_appointment(
                client_id=guest.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=future_slot,
            )

    def test_past_slot_raises(
        self, client_user, service, agency, agency_service, assignment,
    ):
        past = timezone.now() - timedelta(hours=3)
        with pytest.raises(BNAException):
            AppointmentManager.request_appointment(
                client_id=client_user.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=past,
            )

    def test_no_eligible_agents_does_not_block_creation(
        self, client_user, service, agency, agency_service, future_slot,
    ):
        """Appointment is still created even if no agent is available."""
        with patch('apps.appointments.managers.publish'):
            appt = AppointmentManager.request_appointment(
                client_id=client_user.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=future_slot,
            )
        assert appt.status == Appointment.Status.PENDING


@pytest.mark.django_db
class TestAcceptAppointment:

    @pytest.fixture
    def pending_appointment(
        self, client_user, service, agency, agency_service, assignment, future_slot,
    ):
        with patch('apps.appointments.managers.publish'):
            return AppointmentManager.request_appointment(
                client_id=client_user.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=future_slot,
            )

    def test_agent_accepts_appointment(
        self, pending_appointment, agent_user, assignment,
    ):
        with patch('apps.appointments.managers.publish'):
            accepted = AppointmentManager.accept_appointment(
                appointment_id=pending_appointment.pk,
                agent_id=agent_user.pk,
            )
        assert accepted.status == Appointment.Status.ASSIGNED
        assert accepted.agent_id == agent_user.pk

    def test_accept_publishes_assigned_event(
        self, pending_appointment, agent_user, assignment,
    ):
        with patch('apps.appointments.managers.publish') as mock_pub:
            AppointmentManager.accept_appointment(
                appointment_id=pending_appointment.pk,
                agent_id=agent_user.pk,
            )
        event = mock_pub.call_args[0][0]
        assert event.event_type == 'appointment_assigned'
        assert event.client_id == pending_appointment.client_id

    def test_cannot_accept_already_assigned(
        self, pending_appointment, agent_user, assignment,
    ):
        with patch('apps.appointments.managers.publish'):
            AppointmentManager.accept_appointment(
                appointment_id=pending_appointment.pk,
                agent_id=agent_user.pk,
            )
        with pytest.raises(InvalidStatusTransition):
            with patch('apps.appointments.managers.publish'):
                AppointmentManager.accept_appointment(
                    appointment_id=pending_appointment.pk,
                    agent_id=agent_user.pk,
                )

    def test_unassigned_agent_cannot_accept(
        self, pending_appointment, db,
    ):
        unassigned_agent = User.objects.create(
            username='ua@bna.tn',
            email='ua@bna.tn',
            role=User.Role.AGENT,
            status=User.AccountStatus.ACTIVE,
            password='!',
        )
        with pytest.raises(PermissionError):
            AppointmentManager.accept_appointment(
                appointment_id=pending_appointment.pk,
                agent_id=unassigned_agent.pk,
            )


@pytest.mark.django_db
class TestCancelAppointment:

    @pytest.fixture
    def pending_appointment(
        self, client_user, service, agency, agency_service, assignment, future_slot,
    ):
        with patch('apps.appointments.managers.publish'):
            return AppointmentManager.request_appointment(
                client_id=client_user.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=future_slot,
            )

    def test_client_cancels_own_appointment(
        self, pending_appointment, client_user,
    ):
        with patch('apps.appointments.managers.publish'):
            cancelled = AppointmentManager.cancel_appointment(
                appointment_id=pending_appointment.pk,
                cancelled_by_id=client_user.pk,
                reason='Changement de plans.',
            )
        assert cancelled.status == Appointment.Status.CANCELLED
        assert cancelled.cancellation_reason == 'Changement de plans.'

    def test_client_cannot_cancel_others_appointment(
        self, pending_appointment, db,
    ):
        other_client = User.objects.create(
            username='oc@bna.tn',
            email='oc@bna.tn',
            role=User.Role.CLIENT,
            status=User.AccountStatus.ACTIVE,
            password='!',
        )
        with pytest.raises(PermissionError):
            AppointmentManager.cancel_appointment(
                appointment_id=pending_appointment.pk,
                cancelled_by_id=other_client.pk,
            )

    def test_admin_cancels_any_appointment(
        self, pending_appointment, admin_user,
    ):
        with patch('apps.appointments.managers.publish'):
            cancelled = AppointmentManager.cancel_appointment(
                appointment_id=pending_appointment.pk,
                cancelled_by_id=admin_user.pk,
                reason='Fermeture exceptionnelle.',
            )
        assert cancelled.status == Appointment.Status.CANCELLED

    def test_cancellation_publishes_event(
        self, pending_appointment, client_user,
    ):
        with patch('apps.appointments.managers.publish') as mock_pub:
            AppointmentManager.cancel_appointment(
                appointment_id=pending_appointment.pk,
                cancelled_by_id=client_user.pk,
            )
        event = mock_pub.call_args[0][0]
        assert event.event_type == 'appointment_cancelled'

    def test_cannot_cancel_completed_appointment(
        self, client_user, service, agency, agency_service, assignment,
        agent_user, future_slot,
    ):
        with patch('apps.appointments.managers.publish'):
            appt = AppointmentManager.request_appointment(
                client_id=client_user.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=future_slot,
            )
            AppointmentManager.accept_appointment(
                appointment_id=appt.pk, agent_id=agent_user.pk,
            )
            AppointmentManager.complete_appointment(
                appointment_id=appt.pk, agent_id=agent_user.pk,
            )

        with pytest.raises(InvalidStatusTransition):
            AppointmentManager.cancel_appointment(
                appointment_id=appt.pk,
                cancelled_by_id=client_user.pk,
            )


@pytest.mark.django_db
class TestRejectAppointment:

    @pytest.fixture
    def assigned_appointment(
        self, client_user, service, agency, agency_service, assignment,
        agent_user, future_slot,
    ):
        with patch('apps.appointments.managers.publish'):
            appt = AppointmentManager.request_appointment(
                client_id=client_user.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=future_slot,
            )
            AppointmentManager.accept_appointment(
                appointment_id=appt.pk, agent_id=agent_user.pk,
            )
        return appt

    def test_reject_with_no_other_agents_expires(
        self, assigned_appointment, agent_user,
    ):
        with patch('apps.appointments.managers.publish'):
            result = AppointmentManager.reject_appointment(
                appointment_id=assigned_appointment.pk,
                agent_id=agent_user.pk,
                reason='Indisponible.',
            )
        assert result.status == Appointment.Status.EXPIRED

    def test_wrong_agent_cannot_reject(
        self, assigned_appointment, db,
    ):
        other_agent = User.objects.create(
            username='oa@bna.tn',
            email='oa@bna.tn',
            role=User.Role.AGENT,
            status=User.AccountStatus.ACTIVE,
            password='!',
        )
        with pytest.raises(PermissionError):
            AppointmentManager.reject_appointment(
                appointment_id=assigned_appointment.pk,
                agent_id=other_agent.pk,
            )


@pytest.mark.django_db
class TestCompleteAppointment:

    def test_complete_assigned_appointment(
        self, client_user, service, agency, agency_service, assignment,
        agent_user, future_slot,
    ):
        with patch('apps.appointments.managers.publish'):
            appt = AppointmentManager.request_appointment(
                client_id=client_user.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=future_slot,
            )
            AppointmentManager.accept_appointment(
                appointment_id=appt.pk, agent_id=agent_user.pk,
            )
            completed = AppointmentManager.complete_appointment(
                appointment_id=appt.pk, agent_id=agent_user.pk,
            )
        assert completed.status == Appointment.Status.COMPLETED

    def test_unassigned_agent_cannot_complete(
        self, client_user, service, agency, agency_service, assignment,
        agent_user, future_slot, db,
    ):
        other_agent = User.objects.create(
            username='oa@bna.tn',
            email='oa@bna.tn',
            role=User.Role.AGENT,
            status=User.AccountStatus.ACTIVE,
            password='!',
        )
        with patch('apps.appointments.managers.publish'):
            appt = AppointmentManager.request_appointment(
                client_id=client_user.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=future_slot,
            )
            AppointmentManager.accept_appointment(
                appointment_id=appt.pk, agent_id=agent_user.pk,
            )
        with pytest.raises(PermissionError):
            AppointmentManager.complete_appointment(
                appointment_id=appt.pk, agent_id=other_agent.pk,
            )


@pytest.mark.django_db
class TestQueryMethods:

    def test_client_cannot_view_others_history(self, client_user, db):
        other_client = User.objects.create(
            username='oc@bna.tn',
            email='oc@bna.tn',
            role=User.Role.CLIENT,
            status=User.AccountStatus.ACTIVE,
            password='!',
        )
        with pytest.raises(PermissionError):
            AppointmentManager.get_client_history(
                client_id=other_client.pk,
                requesting_user_id=client_user.pk,
            )

    def test_admin_views_any_client_history(self, client_user, admin_user):
        history = AppointmentManager.get_client_history(
            client_id=client_user.pk,
            requesting_user_id=admin_user.pk,
        )
        assert isinstance(history, list)

    def test_client_cannot_view_agent_schedule(self, client_user, agent_user):
        with pytest.raises(PermissionError):
            AppointmentManager.get_agent_schedule(
                agent_id=agent_user.pk,
                requesting_user_id=client_user.pk,
            )

    def test_agent_views_own_schedule(self, agent_user):
        calendar = AppointmentManager.get_agent_schedule(
            agent_id=agent_user.pk,
            requesting_user_id=agent_user.pk,
        )
        assert isinstance(calendar, dict)

    def test_get_available_slots_returns_list(
        self, service, agency, agency_service,
    ):
        next_weekday = date.today() + timedelta(days=7)
        while next_weekday.weekday() == 6:
            next_weekday += timedelta(days=1)

        slots = AppointmentManager.get_available_slots(
            service_id=service.pk,
            agency_id=agency.pk,
            on_date=next_weekday,
        )
        assert isinstance(slots, list)
