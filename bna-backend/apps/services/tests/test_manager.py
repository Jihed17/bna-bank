from unittest.mock import patch

import pytest

from apps.identity.models import User
from apps.services.managers import ServiceManager
from apps.services.models import Agency, AgentAssignment
from core.exceptions import (
    AgentAlreadyAssigned,
    AgentNotAssigned,
    ServiceNotFound,
)


@pytest.fixture
def admin(db):
    return User.objects.create(
        username='admin@bna.tn',
        email='admin@bna.tn',
        role=User.Role.ADMIN,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


@pytest.fixture
def agent(db):
    return User.objects.create(
        username='agent@bna.tn',
        email='agent@bna.tn',
        role=User.Role.AGENT,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


@pytest.fixture
def client_user(db):
    return User.objects.create(
        username='client@bna.tn',
        email='client@bna.tn',
        role=User.Role.CLIENT,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


@pytest.mark.django_db
class TestServiceWriteOperations:

    def test_publish_service_creates_active_service(self, admin):
        with patch('apps.services.managers.publish'):
            service = ServiceManager.publish_service(
                name='Ouverture de compte',
                category='retail',
                type='account',
                admin_id=admin.pk,
            )
        assert service.pk is not None
        assert service.is_active is True
        assert service.name == 'Ouverture de compte'

    def test_publish_service_publishes_event(self, admin):
        with patch('apps.services.managers.publish') as mock_pub:
            ServiceManager.publish_service(
                name='Crédit', category='corporate', type='credit', admin_id=admin.pk,
            )
        mock_pub.assert_called_once()
        event = mock_pub.call_args[0][0]
        assert event.event_type == 'service_updated'
        assert event.change_type == 'published'

    def test_non_admin_cannot_publish_service(self, client_user):
        with pytest.raises(PermissionError):
            ServiceManager.publish_service(
                name='X', category='retail', type='account',
                admin_id=client_user.pk,
            )

    def test_suspend_and_reactivate_service(self, admin):
        with patch('apps.services.managers.publish'):
            service = ServiceManager.publish_service(
                name='S', category='retail', type='account', admin_id=admin.pk,
            )
            suspended = ServiceManager.suspend_service(
                service_id=service.pk, admin_id=admin.pk,
            )
            assert suspended.is_active is False

            reactivated = ServiceManager.reactivate_service(
                service_id=service.pk, admin_id=admin.pk,
            )
            assert reactivated.is_active is True

    def test_update_service_config(self, admin):
        with patch('apps.services.managers.publish'):
            service = ServiceManager.publish_service(
                name='Original', category='retail', type='account', admin_id=admin.pk,
            )
            updated = ServiceManager.update_service_config(
                service_id=service.pk,
                admin_id=admin.pk,
                name='Updated',
                duration_minutes=45,
            )
        assert updated.name == 'Updated'
        assert updated.duration_minutes == 45

    def test_suspend_nonexistent_service_raises(self, admin):
        with pytest.raises(ServiceNotFound):
            ServiceManager.suspend_service(service_id=999999, admin_id=admin.pk)


@pytest.mark.django_db
class TestAgencyWriteOperations:

    def test_open_agency_creates_open_agency(self, admin):
        agency = ServiceManager.open_agency(
            name='Tunis Centre', address='1 av', city='Tunis', admin_id=admin.pk,
        )
        assert agency.pk is not None
        assert agency.status == Agency.Status.OPEN

    def test_close_agency(self, admin):
        agency = ServiceManager.open_agency(
            name='Sfax', address='2 rue', city='Sfax', admin_id=admin.pk,
        )
        closed = ServiceManager.close_agency(
            agency_id=agency.pk, admin_id=admin.pk,
        )
        assert closed.status == Agency.Status.CLOSED

    def test_update_agency_fields(self, admin):
        agency = ServiceManager.open_agency(
            name='Sousse', address='3 av', city='Sousse',
            capacity=2, admin_id=admin.pk,
        )
        updated = ServiceManager.update_agency(
            agency_id=agency.pk, admin_id=admin.pk,
            capacity=5, phone='+21673000000',
        )
        assert updated.capacity == 5
        assert updated.phone == '+21673000000'

    def test_non_admin_cannot_open_agency(self, client_user):
        with pytest.raises(PermissionError):
            ServiceManager.open_agency(
                name='X', address='Y', city='Z', admin_id=client_user.pk,
            )


@pytest.mark.django_db
class TestAgentAssignment:

    @pytest.fixture
    def service_and_agency(self, admin):
        with patch('apps.services.managers.publish'):
            service = ServiceManager.publish_service(
                name='Carte', category='retail', type='card', admin_id=admin.pk,
            )
        agency = ServiceManager.open_agency(
            name='Agency', address='Addr', city='Tunis', admin_id=admin.pk,
        )
        return service, agency

    def test_assign_agent_to_service(self, admin, agent, service_and_agency):
        service, agency = service_and_agency
        assignment = ServiceManager.assign_agent_to_service(
            agent_id=agent.pk,
            service_id=service.pk,
            agency_id=agency.pk,
            admin_id=admin.pk,
        )
        assert assignment.pk is not None
        assert assignment.agent_id == agent.pk
        assert assignment.is_active is True

    def test_assign_non_agent_user_raises(self, admin, client_user, service_and_agency):
        service, agency = service_and_agency
        with pytest.raises(PermissionError):
            ServiceManager.assign_agent_to_service(
                agent_id=client_user.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                admin_id=admin.pk,
            )

    def test_duplicate_assignment_raises(self, admin, agent, service_and_agency):
        service, agency = service_and_agency
        ServiceManager.assign_agent_to_service(
            agent_id=agent.pk, service_id=service.pk,
            agency_id=agency.pk, admin_id=admin.pk,
        )
        with pytest.raises(AgentAlreadyAssigned):
            ServiceManager.assign_agent_to_service(
                agent_id=agent.pk, service_id=service.pk,
                agency_id=agency.pk, admin_id=admin.pk,
            )

    def test_assign_agent_pins_agency_then_rejects_other(
        self, admin, agent, service_and_agency,
    ):
        """An agent gets pinned to the first agency they're assigned to;
        a second assignment to a different agency must be rejected."""
        service, agency = service_and_agency
        ServiceManager.assign_agent_to_service(
            agent_id=agent.pk, service_id=service.pk,
            agency_id=agency.pk, admin_id=admin.pk,
        )
        agent.refresh_from_db()
        assert agent.agency_id == agency.pk

        other_agency = ServiceManager.open_agency(
            name='Other', address='x', city='Sfax', admin_id=admin.pk,
        )
        with pytest.raises(PermissionError):
            ServiceManager.assign_agent_to_service(
                agent_id=agent.pk, service_id=service.pk,
                agency_id=other_agency.pk, admin_id=admin.pk,
            )

    def test_remove_agent_from_service(self, admin, agent, service_and_agency):
        service, agency = service_and_agency
        ServiceManager.assign_agent_to_service(
            agent_id=agent.pk, service_id=service.pk,
            agency_id=agency.pk, admin_id=admin.pk,
        )
        ServiceManager.remove_agent_from_service(
            agent_id=agent.pk, service_id=service.pk,
            agency_id=agency.pk, admin_id=admin.pk,
        )
        assignment = AgentAssignment.objects.get(
            agent=agent,
            agency_service__service=service,
            agency_service__agency=agency,
        )
        assert assignment.is_active is False

    def test_remove_unassigned_agent_raises(self, admin, agent, service_and_agency):
        service, agency = service_and_agency
        with pytest.raises(AgentNotAssigned):
            ServiceManager.remove_agent_from_service(
                agent_id=agent.pk, service_id=service.pk,
                agency_id=agency.pk, admin_id=admin.pk,
            )


@pytest.mark.django_db
class TestPublicReadOperations:

    def test_get_available_services_returns_active_only(self, admin):
        with patch('apps.services.managers.publish'):
            s1 = ServiceManager.publish_service(
                name='Active', category='retail', type='account', admin_id=admin.pk,
            )
            s2 = ServiceManager.publish_service(
                name='Inactive', category='retail', type='account', admin_id=admin.pk,
            )
            ServiceManager.suspend_service(service_id=s2.pk, admin_id=admin.pk)

        results = ServiceManager.get_available_services()
        ids = [s.pk for s in results]
        assert s1.pk in ids
        assert s2.pk not in ids

    def test_get_agencies_by_service_id(self, admin):
        with patch('apps.services.managers.publish'):
            service = ServiceManager.publish_service(
                name='S', category='retail', type='account', admin_id=admin.pk,
            )
        agency = ServiceManager.open_agency(
            name='A', address='x', city='Tunis', admin_id=admin.pk,
        )
        ServiceManager.assign_agent_to_service(
            agent_id=User.objects.create(
                username='ag@bna.tn',
                email='ag@bna.tn',
                role=User.Role.AGENT,
                status=User.AccountStatus.ACTIVE,
                password='!',
            ).pk,
            service_id=service.pk,
            agency_id=agency.pk,
            admin_id=admin.pk,
        )
        agencies = ServiceManager.get_agencies(service_id=service.pk)
        assert any(a.pk == agency.pk for a in agencies)
