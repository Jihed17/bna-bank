from __future__ import annotations

from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction

from core.exceptions import (
    AccountAlreadyPromoted,
    AccountNotActive,
    EmailAlreadyRegistered,
    InvalidCredentials,
    UserNotFound,
)

from .models import User


class UserAccess:
    """
    Resource Access for the identity domain.
    All ORM operations on User go through this class.
    No Manager, Engine, or view touches User.objects directly.
    """

    @staticmethod
    def register_guest(
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        phone: str = '',
        preferred_language: str = 'fr',
    ) -> User:
        if User.objects.filter(email__iexact=email).exists():
            raise EmailAlreadyRegistered()

        with transaction.atomic():
            user = User.objects.create(
                username=email,
                email=email.lower().strip(),
                first_name=first_name.strip(),
                last_name=last_name.strip(),
                phone=phone.strip(),
                preferred_language=preferred_language,
                role=User.Role.GUEST,
                status=User.AccountStatus.PENDING,
                password=make_password(password),
            )
        return user

    @staticmethod
    def promote_to_client(*, user_id: int) -> User:
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise UserNotFound()

        if user.role != User.Role.GUEST:
            raise AccountAlreadyPromoted()

        with transaction.atomic():
            user.role = User.Role.CLIENT
            user.status = User.AccountStatus.ACTIVE
            user.save(update_fields=['role', 'status', 'updated_at'])

        return user

    @staticmethod
    def authenticate(*, email: str, password: str) -> User:
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise InvalidCredentials()

        if not check_password(password, user.password):
            raise InvalidCredentials()

        if user.status != User.AccountStatus.ACTIVE:
            raise AccountNotActive()

        return user

    @staticmethod
    def get_profile(*, user_id: int) -> User:
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise UserNotFound()

    @staticmethod
    def get_by_email(*, email: str) -> User | None:
        return User.objects.filter(email__iexact=email).first()

    @staticmethod
    def update_profile(
        *,
        user_id: int,
        first_name: str | None = None,
        last_name: str | None = None,
        phone: str | None = None,
        date_of_birth=None,
        preferred_language: str | None = None,
        notification_email: bool | None = None,
        notification_sms: bool | None = None,
    ) -> User:
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise UserNotFound()

        updated_fields = ['updated_at']

        if first_name is not None:
            user.first_name = first_name.strip()
            updated_fields.append('first_name')
        if last_name is not None:
            user.last_name = last_name.strip()
            updated_fields.append('last_name')
        if phone is not None:
            user.phone = phone.strip()
            updated_fields.append('phone')
        if date_of_birth is not None:
            user.date_of_birth = date_of_birth
            updated_fields.append('date_of_birth')
        if preferred_language is not None:
            user.preferred_language = preferred_language
            updated_fields.append('preferred_language')
        if notification_email is not None:
            user.notification_email = notification_email
            updated_fields.append('notification_email')
        if notification_sms is not None:
            user.notification_sms = notification_sms
            updated_fields.append('notification_sms')

        with transaction.atomic():
            user.save(update_fields=updated_fields)

        return user

    @staticmethod
    def change_password(
        *,
        user_id: int,
        current_password: str,
        new_password: str,
    ) -> None:
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise UserNotFound()

        if not check_password(current_password, user.password):
            raise InvalidCredentials()

        with transaction.atomic():
            user.password = make_password(new_password)
            user.save(update_fields=['password', 'updated_at'])

    @staticmethod
    def assign_role(*, user_id: int, role: str) -> User:
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise UserNotFound()

        with transaction.atomic():
            user.role = role
            user.save(update_fields=['role', 'updated_at'])

        return user

    @staticmethod
    def suspend_account(*, user_id: int) -> User:
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise UserNotFound()

        with transaction.atomic():
            user.status = User.AccountStatus.SUSPENDED
            user.save(update_fields=['status', 'updated_at'])

        return user

    @staticmethod
    def delete_user(*, user_id: int) -> None:
        """
        Hard-delete a user. Raises CannotDelete when PROTECT FKs would
        block deletion (the user has appointments, notifications, …).
        Use this only for guests with no history; for active users prefer
        suspend_account.
        """
        from django.db.models import ProtectedError

        from core.exceptions import CannotDelete

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise UserNotFound()

        try:
            with transaction.atomic():
                user.delete()
        except ProtectedError:
            raise CannotDelete(
                "Cet utilisateur a des données associées et ne peut pas être supprimé. "
                "Utilisez la suspension à la place."
            )

    @staticmethod
    def set_agent_agency(*, user_id: int, agency_id: int) -> User:
        """
        Pin an agent to an agency. Called by ServiceManager when an agent
        without a pinned agency receives their first assignment.
        """
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise UserNotFound()

        with transaction.atomic():
            user.agency_id = agency_id
            user.save(update_fields=['agency', 'updated_at'])

        return user

    @staticmethod
    def get_agents_for_service_agency(
        *,
        service_id: int,
        agency_id: int,
    ) -> list[User]:
        """
        Return all active agents assigned to a given service at a given agency.
        Placed here because it is a pure data retrieval operation with no
        business logic — MatchingEngine (Phase 4) will call this verb.
        Returns an empty list if none found — never raises.
        """
        from apps.services.models import AgentAssignment

        assignments = AgentAssignment.objects.filter(
            agency_service__service_id=service_id,
            agency_service__agency_id=agency_id,
            is_active=True,
            agent__status=User.AccountStatus.ACTIVE,
            agent__role=User.Role.AGENT,
        ).select_related('agent')

        return [a.agent for a in assignments]

    @staticmethod
    def store_password_reset_token(*, user_id: int) -> str:
        """
        Generate and persist a password-reset token for the user.
        Returns the raw token string so IdentityManager can include
        it in the reset email payload.
        Raises UserNotFound.
        """
        from .models import PasswordResetToken

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise UserNotFound()

        token_obj = PasswordResetToken.generate(user=user)
        return token_obj.token

    @staticmethod
    def consume_password_reset_token(*, token: str) -> User | None:
        """
        Validate and consume a password-reset token.
        Returns the associated user if the token is valid, None otherwise.
        Marks the token as used atomically.
        """
        from .models import PasswordResetToken

        with transaction.atomic():
            try:
                token_obj = PasswordResetToken.objects.select_for_update().get(token=token)
            except PasswordResetToken.DoesNotExist:
                return None

            if not token_obj.is_valid():
                return None

            token_obj.used = True
            token_obj.save(update_fields=['used'])

        return token_obj.user
