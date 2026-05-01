from django.db import models

from apps.identity.models import User
from apps.services.models import Agency, AgentAssignment, Service


class Appointment(models.Model):

    class Status(models.TextChoices):
        PENDING = 'pending', "En attente d'un agent"
        ASSIGNED = 'assigned', 'Agent assigné'
        CONFIRMED = 'confirmed', 'Confirmé'
        COMPLETED = 'completed', 'Effectué'
        CANCELLED = 'cancelled', 'Annulé'
        EXPIRED = 'expired', 'Expiré (aucun agent disponible)'
        REJECTED = 'rejected', 'Refusé'

    client = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='client_appointments',
        limit_choices_to={'role__in': ['client', 'guest']},
    )
    agent = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='agent_appointments',
        limit_choices_to={'role': 'agent'},
    )

    service = models.ForeignKey(
        Service, on_delete=models.PROTECT, related_name='appointments'
    )
    agency = models.ForeignKey(
        Agency, on_delete=models.PROTECT, related_name='appointments'
    )
    agent_assignment = models.ForeignKey(
        AgentAssignment,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='appointments',
        help_text='The specific assignment used when the agent accepted.',
    )

    scheduled_at = models.DateTimeField(db_index=True)
    duration_minutes = models.PositiveIntegerField(default=30)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    status_changed_at = models.DateTimeField(auto_now=True)

    reason = models.TextField(
        blank=True,
        default='',
        help_text='Motif du rendez-vous fourni par le client.',
    )
    notes = models.TextField(
        blank=True,
        default='',
        help_text="Notes internes (visible uniquement par l'agent et l'admin).",
    )

    cancelled_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_appointments',
    )
    cancellation_reason = models.TextField(blank=True, default='')

    reference = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        help_text='Human-readable reference, e.g. BNA-2024-00042. Set by AppointmentAccess.',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'appointments_appointment'
        verbose_name = 'Rendez-vous'
        verbose_name_plural = 'Rendez-vous'
        ordering = ['-scheduled_at']
        indexes = [
            models.Index(fields=['status', 'scheduled_at']),
            models.Index(fields=['client', 'status']),
            models.Index(fields=['agent', 'status']),
            models.Index(fields=['service', 'agency', 'scheduled_at']),
        ]

    def __str__(self):
        return (
            f'[{self.reference or self.pk}] {self.client} → '
            f'{self.service.name} ({self.get_status_display()})'
        )


class AppointmentStatusLog(models.Model):
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name='status_logs',
    )
    from_status = models.CharField(
        max_length=20, choices=Appointment.Status.choices, blank=True
    )
    to_status = models.CharField(
        max_length=20, choices=Appointment.Status.choices
    )
    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='status_changes_made',
    )
    reason = models.TextField(blank=True, default='')
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'appointments_status_log'
        ordering = ['changed_at']
        verbose_name = 'Journal de statut'
        verbose_name_plural = 'Journal des statuts'

    def __str__(self):
        return f'{self.appointment.reference}: {self.from_status} → {self.to_status}'
