from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.identity.models import User
from apps.services.models import Service


class Review(models.Model):

    class Status(models.TextChoices):
        PUBLISHED = 'published', 'Publié'
        HIDDEN = 'hidden', 'Masqué'

    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='reviews',
        limit_choices_to={'role__in': ['client', 'agent', 'admin']},
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name='reviews',
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comment = models.TextField(blank=True, default='')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PUBLISHED,
        db_index=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'reviews_review'
        verbose_name = 'Avis'
        verbose_name_plural = 'Avis'
        unique_together = [('author', 'service')]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['service', 'status']),
        ]

    def __str__(self):
        return f'{self.author.get_full_name()} → {self.service.name} ({self.rating}/5)'
