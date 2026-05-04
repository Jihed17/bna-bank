import secrets
from datetime import timedelta

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):

    class Role(models.TextChoices):
        GUEST = 'guest', 'Visiteur'
        CLIENT = 'client', 'Client'
        AGENT = 'agent', 'Agent'
        ADMIN = 'admin', 'Administrateur'

    class AccountStatus(models.TextChoices):
        PENDING = 'pending', 'En attente de vérification'
        ACTIVE = 'active', 'Actif'
        SUSPENDED = 'suspended', 'Suspendu'
        CLOSED = 'closed', 'Clôturé'

    class Gender(models.TextChoices):
        MALE = 'male', 'Homme'
        FEMALE = 'female', 'Femme'

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.GUEST,
        db_index=True,
    )

    status = models.CharField(
        max_length=20,
        choices=AccountStatus.choices,
        default=AccountStatus.PENDING,
    )

    phone = models.CharField(max_length=20, blank=True, default='')
    date_of_birth = models.DateField(null=True, blank=True)
    national_id = models.CharField(max_length=50, blank=True, default='')

    gender = models.CharField(
        max_length=10,
        choices=Gender.choices,
        blank=True,
        default='',
    )

    # Scan / photo of the user's national ID, passport, etc. Used by
    # the admin during the approval workflow. Stored under MEDIA_ROOT/
    # identity_documents/<user_id>/<filename>.
    identity_image = models.ImageField(
        upload_to='identity_documents/',
        null=True,
        blank=True,
    )

    preferred_language = models.CharField(
        max_length=5,
        default='fr',
        choices=[('fr', 'Français'), ('ar', 'العربية'), ('en', 'English')],
    )
    notification_email = models.BooleanField(default=True)
    notification_sms = models.BooleanField(default=False)

    # An agent belongs to exactly one agency at a time. Set on first
    # ServiceManager.assign_agent_to_service() call and locked thereafter.
    # Null for non-agents. PROTECT prevents deleting an agency that still
    # has agents pinned to it.
    agency = models.ForeignKey(
        'services.Agency',
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='agents',
    )

    # Last successful login fingerprint, used to detect new-device logins.
    # Populated by IdentityManager.authenticate(); compared on every login
    # to decide whether to fire LoginNewDeviceEvent.
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    last_login_user_agent = models.CharField(max_length=512, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'identity_user'
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        indexes = [
            models.Index(fields=['role', 'status']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return f'{self.get_full_name()} ({self.email}) — {self.get_role_display()}'


class PasswordResetToken(models.Model):
    """
    Single-use token for password reset.
    Consumed by UserAccess.consume_password_reset_token().
    Expires after 1 hour. Invalidated on use.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_tokens',
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'identity_password_reset_token'
        verbose_name = 'Jeton de réinitialisation'

    def is_valid(self) -> bool:
        return not self.used and self.expires_at > timezone.now()

    def __str__(self):
        return f'Reset token for {self.user.email} (used={self.used})'

    @classmethod
    def generate(cls, *, user: 'User') -> 'PasswordResetToken':
        """
        Invalidate all existing unused tokens for this user and create a fresh one.
        Called only by UserAccess.store_password_reset_token().
        """
        cls.objects.filter(user=user, used=False).update(used=True)
        return cls.objects.create(
            user=user,
            token=secrets.token_urlsafe(48),
            expires_at=timezone.now() + timedelta(hours=1),
        )


class EmailVerificationToken(models.Model):
    """
    Single-use token sent to the user's email after registration.
    Consuming it promotes the GUEST account to CLIENT/ACTIVE.
    Expires after 24 hours.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='email_verification_tokens',
    )
    token = models.CharField(max_length=64, unique=True, db_index=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'identity_email_verification_token'
        verbose_name = 'Jeton de vérification email'

    def is_valid(self) -> bool:
        return not self.used and self.expires_at > timezone.now()

    def __str__(self):
        return f'Verification token for {self.user.email} (used={self.used})'

    @classmethod
    def generate(cls, *, user: 'User') -> 'EmailVerificationToken':
        """Invalidate prior unused tokens for this user, then mint a new one."""
        cls.objects.filter(user=user, used=False).update(used=True)
        return cls.objects.create(
            user=user,
            token=secrets.token_urlsafe(48),
            expires_at=timezone.now() + timedelta(hours=24),
        )
