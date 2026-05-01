from unittest.mock import patch

import pytest

from apps.identity.managers import IdentityManager
from apps.identity.models import User
from core.exceptions import EmailAlreadyRegistered, InvalidCredentials


@pytest.fixture
def active_client(db):
    """A fully active CLIENT user."""
    with patch('apps.identity.managers.publish'):
        user = IdentityManager.register_guest(
            email='client@bna.tn',
            password='StrongPass123!',
            first_name='Sami',
            last_name='Ben Ali',
        )
    return user


@pytest.fixture
def admin_user(db):
    return User.objects.create(
        username='admin@bna.tn',
        email='admin@bna.tn',
        role=User.Role.ADMIN,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


@pytest.mark.django_db
class TestRegisterGuest:

    def test_register_creates_active_client(self):
        with patch('apps.identity.managers.publish'):
            user = IdentityManager.register_guest(
                email='new@bna.tn',
                password='pass123',
                first_name='Ali',
                last_name='Trabelsi',
            )
        assert user.pk is not None
        assert user.role == User.Role.CLIENT
        assert user.status == User.AccountStatus.ACTIVE

    def test_duplicate_email_raises(self):
        with patch('apps.identity.managers.publish'):
            IdentityManager.register_guest(
                email='dup@bna.tn', password='p', first_name='A', last_name='B',
            )
        with pytest.raises(EmailAlreadyRegistered):
            with patch('apps.identity.managers.publish'):
                IdentityManager.register_guest(
                    email='dup@bna.tn', password='p', first_name='C', last_name='D',
                )

    def test_register_publishes_account_verified_event(self):
        with patch('apps.identity.managers.publish') as mock_pub:
            IdentityManager.register_guest(
                email='ev@bna.tn', password='p', first_name='A', last_name='B',
            )
        mock_pub.assert_called_once()
        event = mock_pub.call_args[0][0]
        assert event.event_type == 'account_verified'
        assert event.email == 'ev@bna.tn'


@pytest.mark.django_db
class TestAuthenticate:

    def test_valid_credentials_return_tokens(self, active_client):
        with patch('apps.identity.managers.publish'):
            result = IdentityManager.authenticate(
                email='client@bna.tn',
                password='StrongPass123!',
            )
        assert 'access' in result
        assert 'refresh' in result
        assert result['user'].pk == active_client.pk

    def test_wrong_password_raises(self, active_client):
        with pytest.raises(InvalidCredentials):
            IdentityManager.authenticate(
                email='client@bna.tn', password='wrong',
            )

    def test_unknown_email_raises(self):
        with pytest.raises(InvalidCredentials):
            IdentityManager.authenticate(
                email='nobody@bna.tn', password='pass',
            )

    def test_token_contains_role_claim(self, active_client):
        import jwt as pyjwt

        with patch('apps.identity.managers.publish'):
            result = IdentityManager.authenticate(
                email='client@bna.tn', password='StrongPass123!',
            )
        payload = pyjwt.decode(
            result['access'],
            options={'verify_signature': False},
        )
        assert payload['role'] == User.Role.CLIENT
        assert payload['email'] == 'client@bna.tn'


@pytest.mark.django_db
class TestPasswordReset:

    def test_request_reset_publishes_event(self, active_client):
        with patch('apps.identity.managers.publish') as mock_pub:
            IdentityManager.request_password_reset(email='client@bna.tn')

        mock_pub.assert_called_once()
        event = mock_pub.call_args[0][0]
        assert event.event_type == 'password_reset_requested'
        assert 'reset-password?token=' in event.reset_url

    def test_request_reset_unknown_email_is_silent(self):
        with patch('apps.identity.managers.publish') as mock_pub:
            IdentityManager.request_password_reset(email='ghost@bna.tn')
        mock_pub.assert_not_called()

    def test_reset_with_valid_token(self, active_client):
        from apps.identity.access import UserAccess

        token = UserAccess.store_password_reset_token(user_id=active_client.pk)

        IdentityManager.reset_password(
            token=token, new_password='NewStrongPass456!',
        )

        with patch('apps.identity.managers.publish'):
            result = IdentityManager.authenticate(
                email='client@bna.tn', password='NewStrongPass456!',
            )
        assert result['user'].pk == active_client.pk

    def test_reset_with_invalid_token_raises(self):
        with pytest.raises(InvalidCredentials):
            IdentityManager.reset_password(token='invalid', new_password='NewPass!')

    def test_reset_token_cannot_be_reused(self, active_client):
        from apps.identity.access import UserAccess

        token = UserAccess.store_password_reset_token(user_id=active_client.pk)
        IdentityManager.reset_password(token=token, new_password='Pass1!')

        with pytest.raises(InvalidCredentials):
            IdentityManager.reset_password(token=token, new_password='Pass2!')


@pytest.mark.django_db
class TestProfileManagement:

    def test_user_can_update_own_profile(self, active_client):
        updated = IdentityManager.update_profile(
            user_id=active_client.pk,
            requesting_user_id=active_client.pk,
            phone='+21612345678',
        )
        assert updated.phone == '+21612345678'

    def test_user_cannot_update_others_profile(self, active_client, db):
        other = User.objects.create(
            username='other@bna.tn',
            email='other@bna.tn',
            role=User.Role.CLIENT,
            status=User.AccountStatus.ACTIVE,
            password='!',
        )
        with pytest.raises(PermissionError):
            IdentityManager.update_profile(
                user_id=other.pk,
                requesting_user_id=active_client.pk,
                phone='+21600000000',
            )

    def test_admin_can_update_any_profile(self, active_client, admin_user):
        updated = IdentityManager.update_profile(
            user_id=active_client.pk,
            requesting_user_id=admin_user.pk,
            phone='+21699999999',
        )
        assert updated.phone == '+21699999999'


@pytest.mark.django_db
class TestRoleAssignment:

    def test_admin_can_assign_role(self, active_client, admin_user):
        updated = IdentityManager.assign_role(
            user_id=active_client.pk,
            role=User.Role.AGENT,
            admin_id=admin_user.pk,
        )
        assert updated.role == User.Role.AGENT

    def test_non_admin_cannot_assign_role(self, active_client, db):
        other_client = User.objects.create(
            username='c2@bna.tn',
            email='c2@bna.tn',
            role=User.Role.CLIENT,
            status=User.AccountStatus.ACTIVE,
            password='!',
        )
        with pytest.raises(PermissionError):
            IdentityManager.assign_role(
                user_id=other_client.pk,
                role=User.Role.AGENT,
                admin_id=active_client.pk,
            )
