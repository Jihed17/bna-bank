from datetime import timedelta

import pytest
from django.utils import timezone

from apps.appointments.access import AppointmentAccess
from apps.appointments.engines.matching import MatchingEngine
from apps.identity.models import User
from apps.notifications.access import NotificationAccess
from apps.notifications.models import Notification
from apps.services.access import AgencyAccess, ServiceAccess
from apps.services.models import AgencyService, AgentAssignment


@pytest.fixture
def service(db):
    return ServiceAccess.publish_service(
        name='Crédit', category='retail', type='credit', duration_minutes=30,
    )


@pytest.fixture
def agency(db):
    return AgencyAccess.open_agency(
        name='Sfax', address='2 rue', city='Sfax', capacity=5,
    )


@pytest.fixture
def agent(db):
    return User.objects.create(
        username='ag@bna.tn',
        email='ag@bna.tn',
        role=User.Role.AGENT,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


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
def agency_service(db, agency, service):
    return AgencyService.objects.create(
        agency=agency, service=service, is_active=True,
    )


@pytest.fixture
def assignment(db, agent, agency_service):
    return AgentAssignment.objects.create(
        agent=agent, agency_service=agency_service, is_active=True,
    )


@pytest.fixture
def future_slot():
    return timezone.now().replace(second=0, microsecond=0) + timedelta(days=5)


@pytest.mark.django_db
class TestFindEligibleAgents:

    def test_returns_assigned_active_agent(self, assignment, agency, service, future_slot):
        result = MatchingEngine.find_eligible_agents(
            service_id=service.pk,
            agency_id=agency.pk,
            scheduled_at=future_slot,
        )
        assert bool(result)
        assert result.agents[0].pk == assignment.agent_id

    def test_no_assignments_returns_empty(self, agency, service, future_slot):
        result = MatchingEngine.find_eligible_agents(
            service_id=service.pk,
            agency_id=agency.pk,
            scheduled_at=future_slot,
        )
        assert not result
        assert 'Aucun agent' in result.reason

    def test_agent_with_conflict_excluded(
        self, assignment, agency, service, agent, client_user, future_slot,
    ):
        appt = AppointmentAccess.request_appointment(
            client_id=client_user.pk,
            service_id=service.pk,
            agency_id=agency.pk,
            scheduled_at=future_slot,
        )
        AppointmentAccess.assign_appointment(
            appointment_id=appt.pk,
            agent_id=agent.pk,
            agent_assignment_id=assignment.pk,
        )
        AppointmentAccess.confirm_appointment(appointment_id=appt.pk)

        result = MatchingEngine.find_eligible_agents(
            service_id=service.pk,
            agency_id=agency.pk,
            scheduled_at=future_slot,
        )
        assert not result
        assert 'occupés' in result.reason

    def test_inactive_agent_excluded(
        self, agency_service, service, agency, future_slot,
    ):
        suspended_agent = User.objects.create(
            username='susp@bna.tn',
            email='susp@bna.tn',
            role=User.Role.AGENT,
            status=User.AccountStatus.SUSPENDED,
            password='!',
        )
        AgentAssignment.objects.create(
            agent=suspended_agent, agency_service=agency_service, is_active=True,
        )
        result = MatchingEngine.find_eligible_agents(
            service_id=service.pk,
            agency_id=agency.pk,
            scheduled_at=future_slot,
        )
        assert not result
        ids = [a.pk for a in result.agents]
        assert suspended_agent.pk not in ids


@pytest.mark.django_db
class TestResolveAssignment:

    def test_cancels_queued_notifications_for_other_agents(
        self, agency, service, client_user, future_slot,
    ):
        agent1 = User.objects.create(
            username='a1@bna.tn',
            email='a1@bna.tn',
            role=User.Role.AGENT,
            status=User.AccountStatus.ACTIVE,
            password='!',
        )
        agent2 = User.objects.create(
            username='a2@bna.tn',
            email='a2@bna.tn',
            role=User.Role.AGENT,
            status=User.AccountStatus.ACTIVE,
            password='!',
        )

        appt = AppointmentAccess.request_appointment(
            client_id=client_user.pk,
            service_id=service.pk,
            agency_id=agency.pk,
            scheduled_at=future_slot,
        )

        n1 = NotificationAccess.enqueue_notification(
            recipient_id=agent1.pk,
            channel=Notification.Channel.IN_APP,
            event_type=Notification.EventType.APPOINTMENT_REQUESTED,
            payload={},
            appointment_id=appt.pk,
        )
        n2 = NotificationAccess.enqueue_notification(
            recipient_id=agent2.pk,
            channel=Notification.Channel.IN_APP,
            event_type=Notification.EventType.APPOINTMENT_REQUESTED,
            payload={},
            appointment_id=appt.pk,
        )

        MatchingEngine.resolve_assignment(
            appointment_id=appt.pk,
            accepting_agent_id=agent1.pk,
            eligible_agent_ids=[agent1.pk, agent2.pk],
        )

        n1.refresh_from_db()
        n2.refresh_from_db()

        assert n1.status == Notification.Status.QUEUED
        assert n2.status == Notification.Status.CANCELLED

    def test_resolve_does_not_raise_if_no_notifications(
        self, agency, service, client_user, future_slot,
    ):
        appt = AppointmentAccess.request_appointment(
            client_id=client_user.pk,
            service_id=service.pk,
            agency_id=agency.pk,
            scheduled_at=future_slot,
        )
        MatchingEngine.resolve_assignment(
            appointment_id=appt.pk,
            accepting_agent_id=999,
            eligible_agent_ids=[999, 888],
        )


@pytest.mark.django_db
class TestGetAgentLoad:

    def test_returns_zero_load_for_new_agent(self):
        agent = User.objects.create(
            username='new@bna.tn',
            email='new@bna.tn',
            role=User.Role.AGENT,
            status=User.AccountStatus.ACTIVE,
            password='!',
        )
        load = MatchingEngine.get_agent_load(agent_id=agent.pk)
        assert load == {'pending_count': 0, 'assigned_count': 0, 'confirmed_count': 0}
