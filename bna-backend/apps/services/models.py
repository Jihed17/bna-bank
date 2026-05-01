from django.db import models

from apps.identity.models import User


class ServiceCategory(models.TextChoices):
    RETAIL = 'retail', 'Particuliers'
    CORPORATE = 'corporate', 'Entreprises'
    INVESTMENT = 'investment', 'Investissement'
    INSURANCE = 'insurance', 'Assurance'
    DIGITAL = 'digital', 'Digital & Technologie'


class ServiceType(models.TextChoices):
    ACCOUNT = 'account', 'Gestion de compte'
    CREDIT = 'credit', 'Crédit et financement'
    CARD = 'card', 'Carte bancaire'
    TRANSFER = 'transfer', 'Virement et paiement'
    ADVISORY = 'advisory', 'Conseil et patrimoine'
    OTHER = 'other', 'Autre'


class Service(models.Model):

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=30, choices=ServiceCategory.choices)
    type = models.CharField(max_length=30, choices=ServiceType.choices)
    duration_minutes = models.PositiveIntegerField(
        default=30,
        help_text="Durée standard d'un rendez-vous pour ce service (en minutes).",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    icon = models.CharField(max_length=100, blank=True, default='')
    order = models.PositiveIntegerField(default=0, help_text="Ordre d'affichage.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_services',
        limit_choices_to={'role': 'admin'},
    )

    class Meta:
        db_table = 'services_service'
        verbose_name = 'Service'
        verbose_name_plural = 'Services'
        ordering = ['order', 'name']
        indexes = [models.Index(fields=['category', 'is_active'])]

    def __str__(self):
        return f'{self.name} ({self.get_type_display()})'


class Agency(models.Model):

    class Status(models.TextChoices):
        OPEN = 'open', 'Ouverte'
        CLOSED = 'closed', 'Fermée'
        SUSPENDED = 'suspended', 'Suspendue temporairement'

    name = models.CharField(max_length=200)
    address = models.TextField()
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=10, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True,
    )
    capacity = models.PositiveIntegerField(
        default=1,
        help_text='Nombre maximum de rendez-vous simultanés.',
    )

    services = models.ManyToManyField(
        Service,
        through='AgencyService',
        related_name='agencies',
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'services_agency'
        verbose_name = 'Agence'
        verbose_name_plural = 'Agences'
        ordering = ['city', 'name']
        indexes = [models.Index(fields=['city', 'status'])]

    def __str__(self):
        return f'{self.name} — {self.city}'


class AgencyService(models.Model):
    """
    A service offered at a specific agency.
    Opening hours are per (agency × service) — a Credit service at
    the Tunis branch may have different hours than the same service
    at the Sfax branch.
    """
    agency = models.ForeignKey(
        Agency, on_delete=models.CASCADE, related_name='agency_services'
    )
    service = models.ForeignKey(
        Service, on_delete=models.CASCADE, related_name='agency_services'
    )
    is_active = models.BooleanField(default=True)

    monday_open = models.TimeField(null=True, blank=True)
    monday_close = models.TimeField(null=True, blank=True)
    tuesday_open = models.TimeField(null=True, blank=True)
    tuesday_close = models.TimeField(null=True, blank=True)
    wednesday_open = models.TimeField(null=True, blank=True)
    wednesday_close = models.TimeField(null=True, blank=True)
    thursday_open = models.TimeField(null=True, blank=True)
    thursday_close = models.TimeField(null=True, blank=True)
    friday_open = models.TimeField(null=True, blank=True)
    friday_close = models.TimeField(null=True, blank=True)
    saturday_open = models.TimeField(null=True, blank=True)
    saturday_close = models.TimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'services_agency_service'
        unique_together = [('agency', 'service')]
        verbose_name = 'Service en agence'
        verbose_name_plural = 'Services en agence'

    def __str__(self):
        return f'{self.service.name} @ {self.agency.name}'


class AgentAssignment(models.Model):
    """
    An agent authorised to handle a specific service at a specific agency.
    When a client requests an appointment for Service S at Agency A,
    MatchingEngine queries AgentAssignment to find eligible agents.
    """
    agent = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='agent_assignments',
        limit_choices_to={'role': 'agent'},
    )
    agency_service = models.ForeignKey(
        AgencyService,
        on_delete=models.CASCADE,
        related_name='agent_assignments',
    )
    is_active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assignments_made',
        limit_choices_to={'role': 'admin'},
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'services_agent_assignment'
        unique_together = [('agent', 'agency_service')]
        verbose_name = "Affectation d'agent"
        verbose_name_plural = "Affectations d'agents"

    def __str__(self):
        return f'{self.agent.get_full_name()} → {self.agency_service}'
