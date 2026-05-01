from __future__ import annotations

from django.db import IntegrityError, transaction

from core.exceptions import ReviewAlreadyExists, ReviewNotFound
from core.logging import AuditMixin

from .models import Review


class ReviewAccess(AuditMixin):
    """
    Resource Access for the reviews domain.
    Persistence only — `ReviewManager` enforces permissions and validates
    business rules (rating range, ownership, etc.).
    """

    @staticmethod
    def publish_review(
        *,
        author_id: int,
        service_id: int,
        rating: int,
        comment: str = '',
    ) -> Review:
        try:
            with transaction.atomic():
                return Review.objects.create(
                    author_id=author_id,
                    service_id=service_id,
                    rating=rating,
                    comment=comment.strip(),
                    status=Review.Status.PUBLISHED,
                )
        except IntegrityError:
            # unique_together(author, service) — the user has already reviewed.
            raise ReviewAlreadyExists()

    @staticmethod
    def update_review(
        *,
        review_id: int,
        rating: int | None = None,
        comment: str | None = None,
    ) -> Review:
        try:
            review = Review.objects.get(pk=review_id)
        except Review.DoesNotExist:
            raise ReviewNotFound()

        updated_fields = ['updated_at']
        if rating is not None:
            review.rating = rating
            updated_fields.append('rating')
        if comment is not None:
            review.comment = comment.strip()
            updated_fields.append('comment')

        with transaction.atomic():
            review.save(update_fields=updated_fields)
        return review

    @staticmethod
    def delete_review(*, review_id: int) -> None:
        try:
            review = Review.objects.get(pk=review_id)
        except Review.DoesNotExist:
            raise ReviewNotFound()
        with transaction.atomic():
            review.delete()

    @staticmethod
    def hide_review(*, review_id: int) -> Review:
        try:
            review = Review.objects.get(pk=review_id)
        except Review.DoesNotExist:
            raise ReviewNotFound()
        with transaction.atomic():
            review.status = Review.Status.HIDDEN
            review.save(update_fields=['status', 'updated_at'])
        return review

    @staticmethod
    def get_review(*, review_id: int) -> Review:
        try:
            return Review.objects.select_related('author', 'service').get(pk=review_id)
        except Review.DoesNotExist:
            raise ReviewNotFound()

    @staticmethod
    def get_reviews_for_service(*, service_id: int) -> list[Review]:
        return list(
            Review.objects.filter(
                service_id=service_id,
                status=Review.Status.PUBLISHED,
            ).select_related('author').order_by('-created_at')
        )

    @staticmethod
    def get_reviews_by_author(*, author_id: int) -> list[Review]:
        return list(
            Review.objects.filter(author_id=author_id)
            .select_related('service')
            .order_by('-created_at')
        )
