import pytest

from apps.identity.models import User
from apps.services.access import AgencyAccess, ServiceAccess
from apps.services.models import Agency
from core.exceptions import (
    AgentAlreadyAssigned,
    ServiceNotFound,
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


@pytest.mark.django_db
class TestServiceAccess:

    def test_publish_service(self):
        s = ServiceAccess.publish_service(
            name='Ouverture de compte',
            category='retail',
            type='account',
        )
        assert s.pk is not None
        assert s.is_active is True

    def test_suspend_service(self):
        s = ServiceAccess.publish_service(name='S', category='retail', type='account')
        suspended = ServiceAccess.suspend_service(service_id=s.pk)
        assert suspended.is_active is False

    def test_suspend_not_found_raises(self):
        with pytest.raises(ServiceNotFound):
            ServiceAccess.suspend_service(service_id=999999)

    def test_get_available_services_filters_inactive(self):
        s1 = ServiceAccess.publish_service(name='Active', category='retail', type='account')
        s2 = ServiceAccess.publish_service(name='Inactive', category='retail', type='account')
        ServiceAccess.suspend_service(service_id=s2.pk)
        results = ServiceAccess.get_available_services()
        ids = [s.pk for s in results]
        assert s1.pk in ids
        assert s2.pk not in ids

    def test_assign_and_remove_agent(self, agent):
        s = ServiceAccess.publish_service(name='S', category='retail', type='account')
        a = AgencyAccess.open_agency(name='Ag', address='1 rue', city='Tunis')
        assignment = ServiceAccess.assign_agent(
            agent_id=agent.pk, service_id=s.pk, agency_id=a.pk,
        )
        assert assignment.pk is not None

        ServiceAccess.remove_agent(
            agent_id=agent.pk, service_id=s.pk, agency_id=a.pk,
        )
        assignment.refresh_from_db()
        assert assignment.is_active is False

    def test_assign_duplicate_raises(self, agent):
        s = ServiceAccess.publish_service(name='S2', category='retail', type='account')
        a = AgencyAccess.open_agency(name='Ag2', address='2 rue', city='Tunis')
        ServiceAccess.assign_agent(agent_id=agent.pk, service_id=s.pk, agency_id=a.pk)
        with pytest.raises(AgentAlreadyAssigned):
            ServiceAccess.assign_agent(agent_id=agent.pk, service_id=s.pk, agency_id=a.pk)


@pytest.mark.django_db
class TestAgencyAccess:

    def test_open_agency(self):
        a = AgencyAccess.open_agency(name='Tunis Centre', address='1 av', city='Tunis')
        assert a.pk is not None
        assert a.status == Agency.Status.OPEN

    def test_close_agency(self):
        a = AgencyAccess.open_agency(name='Sfax', address='2 av', city='Sfax')
        closed = AgencyAccess.close_agency(agency_id=a.pk)
        assert closed.status == Agency.Status.CLOSED

    def test_get_agencies_by_service(self):
        s = ServiceAccess.publish_service(name='S', category='retail', type='account')
        a1 = AgencyAccess.open_agency(name='A1', address='x', city='Tunis')
        a2 = AgencyAccess.open_agency(name='A2', address='y', city='Sfax')
        from apps.services.models import AgencyService
        AgencyService.objects.create(agency=a1, service=s, is_active=True)
        result = AgencyAccess.get_agencies_by_service(service_id=s.pk)
        assert any(a.pk == a1.pk for a in result)
        assert not any(a.pk == a2.pk for a in result)
