import pytest

from apps.identity.access import UserAccess
from apps.identity.models import User
from core.exceptions import (
    AccountAlreadyPromoted,
    AccountNotActive,
    EmailAlreadyRegistered,
    InvalidCredentials,
    UserNotFound,
)


@pytest.mark.django_db
class TestUserAccess:

    def test_register_guest_creates_user(self):
        user = UserAccess.register_guest(
            email='test@bna.tn',
            password='StrongPass123!',
            first_name='Sami',
            last_name='Ben Ali',
        )
        assert user.pk is not None
        assert user.role == User.Role.GUEST
        assert user.status == User.AccountStatus.PENDING
        assert user.email == 'test@bna.tn'

    def test_register_guest_duplicate_email_raises(self):
        UserAccess.register_guest(
            email='dup@bna.tn', password='pass', first_name='A', last_name='B',
        )
        with pytest.raises(EmailAlreadyRegistered):
            UserAccess.register_guest(
                email='dup@bna.tn', password='pass', first_name='C', last_name='D',
            )

    def test_authenticate_valid_credentials(self):
        UserAccess.register_guest(
            email='auth@bna.tn', password='pass123', first_name='A', last_name='B',
        )
        user = User.objects.get(email='auth@bna.tn')
        UserAccess.promote_to_client(user_id=user.pk)

        result = UserAccess.authenticate(email='auth@bna.tn', password='pass123')
        assert result.pk == user.pk

    def test_authenticate_wrong_password_raises(self):
        UserAccess.register_guest(
            email='wrong@bna.tn', password='correct', first_name='A', last_name='B',
        )
        user = User.objects.get(email='wrong@bna.tn')
        UserAccess.promote_to_client(user_id=user.pk)

        with pytest.raises(InvalidCredentials):
            UserAccess.authenticate(email='wrong@bna.tn', password='incorrect')

    def test_authenticate_inactive_account_raises(self):
        UserAccess.register_guest(
            email='inactive@bna.tn', password='pass', first_name='A', last_name='B',
        )
        with pytest.raises(AccountNotActive):
            UserAccess.authenticate(email='inactive@bna.tn', password='pass')

    def test_promote_to_client(self):
        user = UserAccess.register_guest(
            email='promote@bna.tn', password='pass', first_name='A', last_name='B',
        )
        promoted = UserAccess.promote_to_client(user_id=user.pk)
        assert promoted.role == User.Role.CLIENT
        assert promoted.status == User.AccountStatus.ACTIVE

    def test_promote_already_client_raises(self):
        user = UserAccess.register_guest(
            email='already@bna.tn', password='pass', first_name='A', last_name='B',
        )
        UserAccess.promote_to_client(user_id=user.pk)
        with pytest.raises(AccountAlreadyPromoted):
            UserAccess.promote_to_client(user_id=user.pk)

    def test_get_profile_not_found_raises(self):
        with pytest.raises(UserNotFound):
            UserAccess.get_profile(user_id=999999)
