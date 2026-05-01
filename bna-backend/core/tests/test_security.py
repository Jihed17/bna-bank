import pytest
from rest_framework.test import APIClient

from apps.identity.access import UserAccess
from apps.identity.models import User


@pytest.fixture
def active_client_user(db):
    user = UserAccess.register_guest(
        email='sec@bna.tn',
        password='StrongPass123!',
        first_name='Sami',
        last_name='Ben Ali',
    )
    UserAccess.promote_to_client(user_id=user.pk)
    return user


@pytest.mark.django_db
class TestJWT:

    def test_obtain_token_returns_role_in_payload(self, active_client_user):
        client = APIClient()
        response = client.post('/api/auth/token/', {
            'email': 'sec@bna.tn',
            'password': 'StrongPass123!',
        }, format='json')

        assert response.status_code == 200, response.json()
        data = response.json()
        assert 'access' in data
        assert 'refresh' in data
        assert data['user']['role'] == User.Role.CLIENT
        assert data['user']['email'] == 'sec@bna.tn'

    def test_wrong_password_returns_401(self, active_client_user):
        client = APIClient()
        response = client.post('/api/auth/token/', {
            'email': 'sec@bna.tn',
            'password': 'wrong',
        }, format='json')
        assert response.status_code == 401

    def test_refresh_returns_new_access_token(self, active_client_user):
        client = APIClient()
        resp = client.post('/api/auth/token/', {
            'email': 'sec@bna.tn',
            'password': 'StrongPass123!',
        }, format='json')
        refresh = resp.json()['refresh']

        resp2 = client.post('/api/auth/token/refresh/', {
            'refresh': refresh,
        }, format='json')
        assert resp2.status_code == 200
        assert 'access' in resp2.json()


@pytest.mark.django_db
class TestPermissions:

    def test_unauthenticated_request_health_is_public(self):
        client = APIClient()
        resp = client.get('/api/health/')
        assert resp.status_code == 200


@pytest.mark.django_db
class TestPasswordResetToken:

    def test_store_and_consume_token(self):
        user = UserAccess.register_guest(
            email='reset@bna.tn',
            password='pass',
            first_name='A',
            last_name='B',
        )
        token_str = UserAccess.store_password_reset_token(user_id=user.pk)
        assert token_str is not None
        assert len(token_str) > 10

        result = UserAccess.consume_password_reset_token(token=token_str)
        assert result is not None
        assert result.pk == user.pk

    def test_token_consumed_twice_returns_none(self):
        user = UserAccess.register_guest(
            email='reset2@bna.tn',
            password='pass',
            first_name='A',
            last_name='B',
        )
        token_str = UserAccess.store_password_reset_token(user_id=user.pk)
        UserAccess.consume_password_reset_token(token=token_str)

        second = UserAccess.consume_password_reset_token(token=token_str)
        assert second is None

    def test_invalid_token_returns_none(self):
        result = UserAccess.consume_password_reset_token(token='notarealtoken')
        assert result is None
