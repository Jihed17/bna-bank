from django.db import models

from apps.identity.models import User


class Notification(models.Model):

    class Channel(models.TextChoices):
        EMAIL = 'email', 'Email'
        SMS = 'sms', 'SMS'
        IN_APP = 'in_app', 'In-App'
        PUSH = 'push', 'Push mobile'

    class Status(models.TextChoices):
        QUEUED = 'queued', "En file d'attente"
        SENDING = 'sending', "En cours d'envoi"
        DELIVERED = 'delivered', 'Livré'
        FAILED = 'failed', 'Échec'
        CANCELLED = 'cancelled', 'Annulé'

    class EventType(models.TextChoices):
        APPOINTMENT_REQUESTED = 'appointment_requested', 'Demande de rendez-vous'
        APPOINTMENT_ASSIGNED = 'appointment_assigned', 'Rendez-vous assigné'
        APPOINTMENT_CONFIRMED = 'appointment_confirmed', 'Rendez-vous confirmé'
        APPOINTMENT_CANCELLED = 'appointment_cancelled', 'Rendez-vous annulé'
        APPOINTMENT_COMPLETED = 'appointment_completed', 'Rendez-vous effectué'
        APPOINTMENT_REMINDER = 'appointment_reminder', 'Rappel de rendez-vous'
        SERVICE_UPDATED = 'service_updated', 'Service mis à jour'
        ACCOUNT_VERIFIED = 'account_verified', 'Compte vérifié'
        PASSWORD_RESET = 'password_reset', 'Réinitialisation du mot de passe'
        REGISTRATION_SUBMITTED = 'registration_submitted', 'Inscription en attente d\'examen'
        REGISTRATION_PENDING_ADMIN = 'registration_pending_admin', 'Nouvelle inscription à examiner'
        EMAIL_VERIFICATION = 'email_verification', 'Vérification de l\'adresse email'
        PASSWORD_CHANGED = 'password_changed', 'Mot de passe modifié'
        LOGIN_NEW_DEVICE = 'login_new_device', 'Connexion depuis un nouvel appareil'

    recipient = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='notifications',
    )
    channel = models.CharField(max_length=20, choices=Channel.choices, db_index=True)
    event_type = models.CharField(
        max_length=50, choices=EventType.choices, db_index=True
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.QUEUED,
        db_index=True,
    )

    payload = models.JSONField(default=dict)

    sent_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    # When the recipient actually saw the notification in the UI.
    # Distinct from delivered_at, which records channel-side delivery.
    read_at = models.DateTimeField(null=True, blank=True)
    failure_reason = models.TextField(blank=True, default='')
    retry_count = models.PositiveSmallIntegerField(default=0)
    max_retries = models.PositiveSmallIntegerField(default=3)

    appointment = models.ForeignKey(
        'appointments.Appointment',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notifications_notification'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'status']),
            models.Index(fields=['channel', 'status']),
            models.Index(fields=['event_type', 'created_at']),
        ]

    def __str__(self):
        return (
            f'[{self.channel}] {self.event_type} → {self.recipient.email} '
            f'({self.get_status_display()})'
        )
