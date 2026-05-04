from __future__ import annotations

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.db import transaction

from apps.identity.access import UserAccess
from apps.identity.models import User
from core.events import (
    AccountVerifiedEvent,
    EmailVerificationRequestedEvent,
    LoginNewDeviceEvent,
    PasswordChangedEvent,
    PasswordResetRequestedEvent,
)
from core.exceptions import InvalidCredentials, UserNotFound
from core.logging import AuditMixin, get_logger
from core.publisher import now_iso, publish

logger = get_logger('identity.manager')


class IdentityManager(AuditMixin):
    """
    Orchestrates the full user identity lifecycle.

    Volatile area: the sequence of steps in registration (with or without
    KYC), password policy, session handling — all change here, nowhere else.

    Called by: IdentityClient views (Phase 6).
    Calls:     UserAccess, simplejwt (Security utility), PubSub publisher.
    Never:     calls ServiceManager or AppointmentManager directly.
    Never:     has HTTP knowledge.
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
        gender: str = '',
        identity_image=None,
    ) -> User:
        """
        Register a new user and immediately promote them to CLIENT.

        In the current flow there is no KYC step — registration creates
        a GUEST and promotes it in the same transaction. When KYC is
        introduced, remove the promote_to_client() call here and trigger
        it from a separate verification endpoint.
        """
        user = UserAccess.register_guest(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            preferred_language=preferred_language,
            gender=gender,
            identity_image=identity_image,
        )

        logger.info(
            'guest_registered',
            extra={'user_id': user.pk, 'email': email},
        )

        return IdentityManager.promote_to_client(user_id=user.pk)

    @staticmethod
    def promote_to_client(*, user_id: int) -> User:
        """
        Elevate a GUEST account to CLIENT and publish the welcome event.
        """
        user = UserAccess.promote_to_client(user_id=user_id)

        IdentityManager._audit(
            action='account_promoted_to_client',
            actor_id=user_id,
            target_id=user_id,
        )

        publish(AccountVerifiedEvent(
            occurred_at=now_iso(),
            user_id=user.pk,
            email=user.email,
            full_name=user.get_full_name(),
        ))

        logger.info(
            'client_promoted',
            extra={'user_id': user.pk, 'email': user.email},
        )

        return user

    @staticmethod
    def authenticate(
        *,
        email: str,
        password: str,
        request_ip: str = '',
        request_user_agent: str = '',
    ) -> dict:
        """
        Validate credentials and issue JWT tokens.

        Returns a dict with 'user', 'access', 'refresh'. Role, status,
        email, and full_name claims are embedded in the token payload
        (matching BNATokenObtainPairSerializer from Phase 3).

        Side effects:
          - On successful login, persist last_login_ip / last_login_user_agent.
          - If those values were already set AND differ from this request,
            publish LoginNewDeviceEvent (security alert email).
        """
        from rest_framework_simplejwt.tokens import RefreshToken

        user = UserAccess.authenticate(email=email, password=password)

        prior_ip = user.last_login_ip or ''
        prior_ua = user.last_login_user_agent or ''
        is_known_device = bool(prior_ip) and (
            prior_ip == request_ip and prior_ua == request_user_agent
        )

        if (prior_ip or prior_ua) and not is_known_device:
            publish(LoginNewDeviceEvent(
                occurred_at=now_iso(),
                user_id=user.pk,
                email=user.email,
                ip_address=request_ip or 'inconnue',
                user_agent=request_user_agent or 'inconnu',
            ))

        if request_ip or request_user_agent:
            user.last_login_ip = request_ip or user.last_login_ip
            user.last_login_user_agent = (
                request_user_agent[:512] if request_user_agent
                else user.last_login_user_agent
            )
            user.save(update_fields=[
                'last_login_ip', 'last_login_user_agent', 'updated_at',
            ])

        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['status'] = user.status
        refresh['email'] = user.email
        refresh['full_name'] = user.get_full_name()

        logger.info(
            'user_authenticated',
            extra={'user_id': user.pk, 'role': user.role},
        )

        return {
            'user': user,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }

    @staticmethod
    def logout(*, refresh_token: str) -> None:
        """
        Blacklist the provided refresh token.
        Idempotent — calling with an already-blacklisted token is safe.
        """
        try:
            from rest_framework_simplejwt.tokens import RefreshToken
            token = RefreshToken(refresh_token)
            token.blacklist()
            logger.info('user_logged_out')
        except Exception as exc:
            logger.debug('logout_token_already_invalid', extra={'error': str(exc)})

    @staticmethod
    def request_password_reset(*, email: str) -> None:
        """
        Generate a reset token and publish the reset-email event.

        Always returns None silently — even if the email does not exist —
        to prevent email enumeration attacks.
        """
        user = UserAccess.get_by_email(email=email)

        if user is None:
            logger.info(
                'password_reset_requested_unknown_email',
                extra={'email': email},
            )
            return

        token = UserAccess.store_password_reset_token(user_id=user.pk)
        reset_url = f'{settings.FRONTEND_URL}/reset-password?token={token}'

        publish(PasswordResetRequestedEvent(
            occurred_at=now_iso(),
            user_id=user.pk,
            email=user.email,
            reset_token=token,
            reset_url=reset_url,
        ))

        logger.info('password_reset_requested', extra={'user_id': user.pk})

    @staticmethod
    def reset_password(*, token: str, new_password: str) -> None:
        """
        Validate the reset token and replace the password.
        Raises InvalidCredentials if the token is invalid or expired.
        """
        user = UserAccess.consume_password_reset_token(token=token)

        if user is None:
            raise InvalidCredentials(
                'Ce lien de réinitialisation est invalide ou expiré.'
            )

        with transaction.atomic():
            user.password = make_password(new_password)
            user.save(update_fields=['password', 'updated_at'])

        IdentityManager._audit(
            action='password_reset_completed',
            actor_id=user.pk,
            target_id=user.pk,
        )

        logger.info('password_reset_completed', extra={'user_id': user.pk})

    @staticmethod
    def get_profile(*, user_id: int) -> User:
        """Return a user profile by PK. Raises UserNotFound."""
        return UserAccess.get_profile(user_id=user_id)

    @staticmethod
    def update_profile(
        *,
        user_id: int,
        requesting_user_id: int,
        **fields,
    ) -> User:
        """
        Update mutable profile fields.
        A user can update only their own profile; an admin can update any.
        """
        requester = UserAccess.get_profile(user_id=requesting_user_id)

        if requester.pk != user_id and requester.role != User.Role.ADMIN:
            raise PermissionError(
                'Vous ne pouvez modifier que votre propre profil.'
            )

        user = UserAccess.update_profile(user_id=user_id, **fields)

        logger.info(
            'profile_updated',
            extra={'user_id': user_id, 'updated_by': requesting_user_id},
        )

        return user

    @staticmethod
    def change_password(
        *,
        user_id: int,
        current_password: str,
        new_password: str,
    ) -> None:
        """
        Verify the current password then store the new one.
        Admins use reset_password() for account recovery.
        """
        UserAccess.change_password(
            user_id=user_id,
            current_password=current_password,
            new_password=new_password,
        )

        IdentityManager._audit(
            action='password_changed',
            actor_id=user_id,
            target_id=user_id,
        )

        try:
            user = UserAccess.get_profile(user_id=user_id)
            publish(PasswordChangedEvent(
                occurred_at=now_iso(),
                user_id=user.pk,
                email=user.email,
            ))
        except Exception as exc:
            logger.warning(
                'password_changed_event_publish_failed',
                extra={'user_id': user_id, 'error': str(exc)},
            )

        logger.info('password_changed', extra={'user_id': user_id})

    @staticmethod
    def assign_role(
        *,
        user_id: int,
        role: str,
        admin_id: int,
    ) -> User:
        """Assign any role to any user. Admin-only."""
        admin = UserAccess.get_profile(user_id=admin_id)

        if admin.role != User.Role.ADMIN:
            raise PermissionError(
                'Seul un administrateur peut attribuer des rôles.'
            )

        user = UserAccess.assign_role(user_id=user_id, role=role)

        IdentityManager._audit(
            action='role_assigned',
            actor_id=admin_id,
            target_id=user_id,
            extra={'role': role},
        )

        logger.info(
            'role_assigned',
            extra={'user_id': user_id, 'role': role, 'by': admin_id},
        )

        return user

    # ── Admin approval queue ────────────────────────────────────────────────

    @staticmethod
    def register_pending_guest(
        *,
        email: str,
        password: str,
        first_name: str,
        last_name: str,
        phone: str = '',
        preferred_language: str = 'fr',
        gender: str = '',
        identity_image=None,
    ) -> User:
        """
        Public registration variant — creates a GUEST in PENDING status
        WITHOUT auto-promoting. An admin must call approve_guest() before
        the account can authenticate.

        This is the method the Register API view uses; the older
        register_guest() (which auto-promotes) remains available for the
        seed command and tests.
        """
        user = UserAccess.register_guest(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            preferred_language=preferred_language,
            gender=gender,
            identity_image=identity_image,
        )

        IdentityManager._audit(
            action='guest_registered_pending_email_verification',
            actor_id=user.pk,
            target_id=user.pk,
        )

        token = UserAccess.store_email_verification_token(user_id=user.pk)
        verification_url = f'{settings.FRONTEND_URL}/verify-email?token={token}'

        publish(EmailVerificationRequestedEvent(
            occurred_at=now_iso(),
            user_id=user.pk,
            email=user.email,
            full_name=user.get_full_name(),
            verification_token=token,
            verification_url=verification_url,
        ))

        logger.info(
            'guest_registered_pending_email_verification',
            extra={'user_id': user.pk, 'email': email},
        )
        return user

    @staticmethod
    def verify_email(*, token: str) -> User:
        """
        Consume an email-verification token and promote the GUEST account
        to CLIENT/ACTIVE. Used by the public /verify-email endpoint —
        replaces the admin approval step.

        Raises InvalidCredentials if the token is missing, expired, or used.
        """
        user = UserAccess.consume_email_verification_token(token=token)

        if user is None:
            raise InvalidCredentials(
                'Ce lien de vérification est invalide ou expiré. '
                'Veuillez demander un nouveau lien.'
            )

        promoted = IdentityManager.promote_to_client(user_id=user.pk)

        IdentityManager._audit(
            action='email_verified',
            actor_id=user.pk,
            target_id=user.pk,
        )

        logger.info(
            'email_verified',
            extra={'user_id': user.pk, 'email': user.email},
        )

        return promoted

    @staticmethod
    def get_pending_guests() -> list[User]:
        """Admin: list all GUEST/PENDING users awaiting approval."""
        return list(
            User.objects.filter(
                role=User.Role.GUEST,
                status=User.AccountStatus.PENDING,
            ).order_by('-created_at')
        )

    @staticmethod
    def approve_guest(*, user_id: int, admin_id: int) -> User:
        """
        Admin promotes a pending GUEST to CLIENT/ACTIVE.
        Re-uses promote_to_client (which publishes AccountVerifiedEvent
        → welcome email).
        """
        admin = UserAccess.get_profile(user_id=admin_id)
        if admin.role != User.Role.ADMIN:
            raise PermissionError(
                'Seul un administrateur peut approuver une inscription.'
            )

        user = IdentityManager.promote_to_client(user_id=user_id)

        IdentityManager._audit(
            action='guest_approved',
            actor_id=admin_id,
            target_id=user_id,
        )
        logger.info(
            'guest_approved',
            extra={'user_id': user_id, 'by': admin_id},
        )
        return user

    @staticmethod
    def reject_guest(*, user_id: int, admin_id: int, reason: str = '') -> User:
        """
        Admin rejects a pending registration: sets the account to
        SUSPENDED so it cannot log in. Keeps the row for audit; use
        delete_user() to hard-delete instead.
        """
        admin = UserAccess.get_profile(user_id=admin_id)
        if admin.role != User.Role.ADMIN:
            raise PermissionError(
                'Seul un administrateur peut refuser une inscription.'
            )

        user = UserAccess.suspend_account(user_id=user_id)

        IdentityManager._audit(
            action='guest_rejected',
            actor_id=admin_id,
            target_id=user_id,
            extra={'reason': reason},
        )
        logger.info(
            'guest_rejected',
            extra={'user_id': user_id, 'by': admin_id, 'reason': reason},
        )
        return user

    @staticmethod
    def delete_user(*, user_id: int, admin_id: int) -> dict:
        """
        Admin removes a user. Tries hard delete first (clean removal for
        guests with no history); on PROTECT failure, automatically falls
        back to archiving (status=CLOSED) so the action always succeeds
        and login is blocked either way.

        Returns a dict {'mode': 'deleted'|'archived'} so the API can
        surface what actually happened to the admin.
        """
        from core.exceptions import CannotDelete

        admin = UserAccess.get_profile(user_id=admin_id)
        if admin.role != User.Role.ADMIN:
            raise PermissionError(
                'Seul un administrateur peut supprimer un compte.'
            )

        if user_id == admin_id:
            raise PermissionError(
                "Vous ne pouvez pas supprimer votre propre compte administrateur."
            )

        try:
            UserAccess.delete_user(user_id=user_id)
            mode = 'deleted'
        except CannotDelete:
            UserAccess.archive_user(user_id=user_id)
            mode = 'archived'

        IdentityManager._audit(
            action=f'user_{mode}',
            actor_id=admin_id,
            target_id=user_id,
        )
        logger.info(
            f'user_{mode}',
            extra={'user_id': user_id, 'by': admin_id},
        )

        return {'mode': mode}

    @staticmethod
    def archive_user(*, user_id: int, admin_id: int) -> User:
        """Force-archive a user (status=CLOSED) regardless of FKs.
        Always blocks login. Use suspend_account when you want a
        temporary block instead."""
        admin = UserAccess.get_profile(user_id=admin_id)
        if admin.role != User.Role.ADMIN:
            raise PermissionError(
                "Seul un administrateur peut archiver un compte."
            )
        if user_id == admin_id:
            raise PermissionError(
                "Vous ne pouvez pas archiver votre propre compte administrateur."
            )

        user = UserAccess.archive_user(user_id=user_id)

        IdentityManager._audit(
            action='user_archived',
            actor_id=admin_id,
            target_id=user_id,
        )
        logger.info('user_archived', extra={'user_id': user_id, 'by': admin_id})

        return user

    @staticmethod
    def reactivate_account(*, user_id: int, admin_id: int) -> User:
        """Restore a SUSPENDED or CLOSED account to ACTIVE."""
        admin = UserAccess.get_profile(user_id=admin_id)
        if admin.role != User.Role.ADMIN:
            raise PermissionError(
                "Seul un administrateur peut réactiver un compte."
            )

        user = UserAccess.reactivate_account(user_id=user_id)

        IdentityManager._audit(
            action='account_reactivated',
            actor_id=admin_id,
            target_id=user_id,
        )
        logger.info(
            'account_reactivated',
            extra={'user_id': user_id, 'by': admin_id},
        )

        return user

    @staticmethod
    def suspend_account(*, user_id: int, admin_id: int) -> User:
        """Suspend a user account. Admin-only."""
        admin = UserAccess.get_profile(user_id=admin_id)

        if admin.role != User.Role.ADMIN:
            raise PermissionError(
                'Seul un administrateur peut suspendre un compte.'
            )

        user = UserAccess.suspend_account(user_id=user_id)

        IdentityManager._audit(
            action='account_suspended',
            actor_id=admin_id,
            target_id=user_id,
        )

        logger.info(
            'account_suspended',
            extra={'user_id': user_id, 'by': admin_id},
        )

        return user
