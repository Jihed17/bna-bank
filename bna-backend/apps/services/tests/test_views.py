from unittest.mock import patch

import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.identity.models import User
from apps.services.models import Agency


@pytest.fixture
def api():
    return APIClient()


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


def make_token(user):
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role
    return str(refresh.access_token)


@pytest.fixture
def admin_api(api, admin_user):
    api.credentials(HTTP_AUTHORIZATION=f'Bearer {make_token(admin_user)}')
    return api


@pytest.fixture
def client_api(api, client_user):
    api.credentials(HTTP_AUTHORIZATION=f'Bearer {make_token(client_user)}')
    return api


@pytest.fixture
def active_service(db, admin_user):
    with patch('apps.services.managers.publish'):
        from apps.services.managers import ServiceManager
        return ServiceManager.publish_service(
            name='Ouverture de compte',
            category='retail',
            type='account',
            admin_id=admin_user.pk,
        )


@pytest.fixture
def open_agency(db, admin_user):
    from apps.services.managers import ServiceManager

    return ServiceManager.open_agency(
        name='Tunis Centre', address='1 av', city='Tunis', admin_id=admin_user.pk,
    )


@pytest.mark.django_db
class TestPublicServiceEndpoints:

    def test_list_services_public(self, api, active_service):
        response = api.get('/api/services/')
        assert response.status_code == 200
        ids = [s['id'] for s in response.json()['data']]
        assert active_service.pk in ids

    def test_list_services_filters_inactive(self, api, active_service, admin_user):
        with patch('apps.services.managers.publish'):
            from apps.services.managers import ServiceManager
            ServiceManager.suspend_service(
                service_id=active_service.pk, admin_id=admin_user.pk,
            )
        response = api.get('/api/services/')
        ids = [s['id'] for s in response.json()['data']]
        assert active_service.pk not in ids

    def test_get_service_detail_public(self, api, active_service):
        response = api.get(f'/api/services/{active_service.pk}/')
        assert response.status_code == 200
        assert response.json()['data']['name'] == 'Ouverture de compte'

    def test_get_nonexistent_service_returns_404(self, api):
        response = api.get('/api/services/999999/')
        assert response.status_code == 404

    def test_list_agencies_public(self, api, open_agency):
        response = api.get('/api/services/agencies/')
        assert response.status_code == 200
        ids = [a['id'] for a in response.json()['data']]
        assert open_agency.pk in ids

    def test_get_agency_detail_public(self, api, open_agency):
        response = api.get(f'/api/services/agencies/{open_agency.pk}/')
        assert response.status_code == 200
        assert response.json()['data']['name'] == 'Tunis Centre'


@pytest.mark.django_db
class TestAdminServiceEndpoints:

    def test_admin_creates_service(self, admin_api):
        with patch('apps.services.managers.publish'):
            response = admin_api.post('/api/services/create/', {
                'name': 'Crédit immobilier',
                'category': 'retail',
                'type': 'credit',
            }, format='json')
        assert response.status_code == 201
        assert response.json()['data']['name'] == 'Crédit immobilier'

    def test_client_cannot_create_service(self, client_api):
        response = client_api.post('/api/services/create/', {
            'name': 'X', 'category': 'retail', 'type': 'account',
        }, format='json')
        assert response.status_code == 403

    def test_admin_suspends_service(self, admin_api, active_service):
        with patch('apps.services.managers.publish'):
            response = admin_api.post(f'/api/services/{active_service.pk}/suspend/')
        assert response.status_code == 200
        assert response.json()['data']['is_active'] is False

    def test_admin_reactivates_service(self, admin_api, active_service):
        with patch('apps.services.managers.publish'):
            admin_api.post(f'/api/services/{active_service.pk}/suspend/')
            response = admin_api.post(f'/api/services/{active_service.pk}/reactivate/')
        assert response.status_code == 200
        assert response.json()['data']['is_active'] is True

    def test_admin_updates_service(self, admin_api, active_service):
        with patch('apps.services.managers.publish'):
            response = admin_api.patch(f'/api/services/{active_service.pk}/update/', {
                'duration_minutes': 45,
            }, format='json')
        assert response.status_code == 200
        assert response.json()['data']['duration_minutes'] == 45


@pytest.mark.django_db
class TestAdminAgencyEndpoints:

    def test_admin_creates_agency(self, admin_api):
        response = admin_api.post('/api/services/agencies/create/', {
            'name': 'Sfax Centrum',
            'address': '2 rue de la Liberté',
            'city': 'Sfax',
            'capacity': 3,
        }, format='json')
        assert response.status_code == 201
        assert response.json()['data']['name'] == 'Sfax Centrum'

    def test_admin_closes_agency(self, admin_api, open_agency):
        response = admin_api.post(
            f'/api/services/agencies/{open_agency.pk}/close/',
        )
        assert response.status_code == 200
        assert response.json()['data']['status'] == Agency.Status.CLOSED

    def test_admin_assigns_agent_to_service(
        self, admin_api, active_service, open_agency, agent_user,
    ):
        response = admin_api.post(f'/api/services/{active_service.pk}/agents/', {
            'agent_id': agent_user.pk,
            'agency_id': open_agency.pk,
        }, format='json')
        assert response.status_code == 201
        assert response.json()['data']['agent']['id'] == agent_user.pk

    def test_duplicate_assignment_returns_409(
        self, admin_api, active_service, open_agency, agent_user,
    ):
        admin_api.post(f'/api/services/{active_service.pk}/agents/', {
            'agent_id': agent_user.pk, 'agency_id': open_agency.pk,
        }, format='json')
        response = admin_api.post(f'/api/services/{active_service.pk}/agents/', {
            'agent_id': agent_user.pk, 'agency_id': open_agency.pk,
        }, format='json')
        assert response.status_code == 409
