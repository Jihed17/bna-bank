from unittest.mock import patch

import pytest
from rest_framework.test import APIClient

from apps.identity.managers import IdentityManager
from apps.identity.models import User


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def active_client(db):
    with patch('apps.identity.managers.publish'):
        return IdentityManager.register_guest(
            email='cl@bna.tn', password='StrongPass123!',
            first_name='Sami', last_name='Ben Ali',
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
def auth_client(api, active_client):
    with patch('apps.identity.managers.publish'):
        result = IdentityManager.authenticate(
            email='cl@bna.tn', password='StrongPass123!',
        )
    api.credentials(HTTP_AUTHORIZATION=f'Bearer {result["access"]}')
    return api


@pytest.fixture
def admin_api(api, admin_user):
    from rest_framework_simplejwt.tokens import RefreshToken

    refresh = RefreshToken.for_user(admin_user)
    refresh['role'] = admin_user.role
    api.credentials(HTTP_AUTHORIZATION=f'Bearer {str(refresh.access_token)}')
    return api


@pytest.mark.django_db
class TestRegisterView:

    def test_register_creates_pending_guest(self, api):
        # Public registration now produces a GUEST in PENDING status —
        # an admin must approve before the account can authenticate.
        with patch('apps.identity.managers.publish'):
            response = api.post('/api/identity/register/', {
                'email': 'new@bna.tn',
                'password': 'StrongPass123!',
                'first_name': 'Ali',
                'last_name': 'Trabelsi',
            }, format='json')

        assert response.status_code == 201
        data = response.json()['data']
        assert data['email'] == 'new@bna.tn'
        assert data['role'] == User.Role.GUEST
        assert data['status'] == User.AccountStatus.PENDING

    def test_duplicate_email_returns_409(self, api, active_client):
        with patch('apps.identity.managers.publish'):
            response = api.post('/api/identity/register/', {
                'email': 'cl@bna.tn',
                'password': 'pass1234',
                'first_name': 'X',
                'last_name': 'Y',
            }, format='json')

        assert response.status_code == 409
        assert 'error' in response.json()

    def test_missing_fields_returns_400(self, api):
        response = api.post('/api/identity/register/', {
            'email': 'incomplete@bna.tn',
        }, format='json')
        assert response.status_code == 400


@pytest.mark.django_db
class TestLoginView:

    def test_valid_credentials_return_tokens(self, api, active_client):
        response = api.post('/api/identity/login/', {
            'email': 'cl@bna.tn',
            'password': 'StrongPass123!',
        }, format='json')

        assert response.status_code == 200
        data = response.json()['data']
        assert 'access' in data
        assert 'refresh' in data
        assert data['user']['email'] == 'cl@bna.tn'

    def test_wrong_password_returns_401(self, api, active_client):
        response = api.post('/api/identity/login/', {
            'email': 'cl@bna.tn',
            'password': 'wrong',
        }, format='json')
        assert response.status_code == 401

    def test_missing_email_returns_400(self, api):
        response = api.post('/api/identity/login/', {
            'password': 'pass',
        }, format='json')
        assert response.status_code == 400


@pytest.mark.django_db
class TestProfileView:

    def test_get_own_profile(self, auth_client, active_client):
        response = auth_client.get('/api/identity/profile/')
        assert response.status_code == 200
        data = response.json()['data']
        assert data['email'] == 'cl@bna.tn'

    def test_unauthenticated_returns_401(self, api):
        response = api.get('/api/identity/profile/')
        assert response.status_code == 401

    def test_update_own_profile(self, auth_client):
        response = auth_client.put('/api/identity/profile/', {
            'phone': '+21612345678',
        }, format='json')
        assert response.status_code == 200
        assert response.json()['data']['phone'] == '+21612345678'


@pytest.mark.django_db
class TestPasswordChangeView:

    def test_change_password_success(self, auth_client, active_client):
        response = auth_client.put('/api/identity/password/change/', {
            'current_password': 'StrongPass123!',
            'new_password': 'NewStrongPass456!',
        }, format='json')
        assert response.status_code == 204

    def test_wrong_current_password_returns_401(self, auth_client):
        response = auth_client.put('/api/identity/password/change/', {
            'current_password': 'wrong',
            'new_password': 'NewPass456!',
        }, format='json')
        assert response.status_code == 401


@pytest.mark.django_db
class TestPasswordResetView:

    def test_reset_request_always_returns_204(self, api):
        response = api.post('/api/identity/password/reset/', {
            'email': 'unknown@bna.tn',
        }, format='json')
        assert response.status_code == 204

    def test_reset_confirm_invalid_token_returns_401(self, api):
        response = api.post('/api/identity/password/reset/confirm/', {
            'token': 'invalidtoken',
            'new_password': 'NewPass123!',
        }, format='json')
        assert response.status_code == 401


@pytest.mark.django_db
class TestAdminViews:

    def test_admin_gets_any_user_profile(self, admin_api, active_client):
        response = admin_api.get(f'/api/identity/users/{active_client.pk}/')
        assert response.status_code == 200
        assert response.json()['data']['email'] == 'cl@bna.tn'

    def test_non_admin_cannot_access_user_detail(self, auth_client, active_client):
        response = auth_client.get(f'/api/identity/users/{active_client.pk}/')
        assert response.status_code == 403

    def test_admin_assigns_role(self, admin_api, active_client):
        response = admin_api.post(
            f'/api/identity/users/{active_client.pk}/role/',
            {'role': User.Role.AGENT},
            format='json',
        )
        assert response.status_code == 200
        assert response.json()['data']['role'] == User.Role.AGENT

    def test_admin_suspends_account(self, admin_api, active_client):
        response = admin_api.post(
            f'/api/identity/users/{active_client.pk}/suspend/',
        )
        assert response.status_code == 200
        assert response.json()['data']['status'] == User.AccountStatus.SUSPENDED
