from __future__ import annotations

from apps.identity.access import UserAccess
from apps.identity.models import User
from apps.reviews.access import ReviewAccess
from apps.reviews.models import Review
from apps.services.access import ServiceAccess
from core.logging import AuditMixin, get_logger

logger = get_logger('reviews.manager')


class ReviewManager(AuditMixin):
    """
    Orchestrates the review lifecycle.

    Volatile area: who can review, moderation rules, rating semantics.
    Called by ReviewClient views (Phase 6 layer).
    Calls ReviewAccess + UserAccess + ServiceAccess.
    """

    # ── Write operations ────────────────────────────────────────────────────

    @staticmethod
    def create_review(
        *,
        author_id: int,
        service_id: int,
        rating: int,
        comment: str = '',
    ) -> Review:
        """
        Publish a new review. Author must be a CLIENT (or AGENT/ADMIN).
        Verifies the service exists. Raises ReviewAlreadyExists if the
        author has already reviewed this service.
        """
        author = UserAccess.get_profile(user_id=author_id)
        if author.role == User.Role.GUEST:
            raise PermissionError(
                'Vous devez avoir un compte actif pour publier un avis.'
            )

        # Validates existence; raises ServiceNotFound otherwise.
        ServiceAccess.get_service(service_id=service_id)

        if not (1 <= int(rating) <= 5):
            raise ValueError('La note doit être comprise entre 1 et 5.')

        review = ReviewAccess.publish_review(
            author_id=author_id,
            service_id=service_id,
            rating=int(rating),
            comment=comment,
        )

        ReviewManager._audit(
            action='review_created',
            actor_id=author_id,
            target_id=review.pk,
            extra={'service_id': service_id, 'rating': int(rating)},
        )
        logger.info(
            'review_created',
            extra={'review_id': review.pk, 'author_id': author_id, 'service_id': service_id},
        )
        return review

    @staticmethod
    def update_review(
        *,
        review_id: int,
        requesting_user_id: int,
        rating: int | None = None,
        comment: str | None = None,
    ) -> Review:
        """A user can only modify their own review."""
        review = ReviewAccess.get_review(review_id=review_id)

        if review.author_id != requesting_user_id:
            raise PermissionError(
                'Vous ne pouvez modifier que vos propres avis.'
            )

        if rating is not None and not (1 <= int(rating) <= 5):
            raise ValueError('La note doit être comprise entre 1 et 5.')

        review = ReviewAccess.update_review(
            review_id=review_id,
            rating=int(rating) if rating is not None else None,
            comment=comment,
        )

        ReviewManager._audit(
            action='review_updated',
            actor_id=requesting_user_id,
            target_id=review_id,
        )
        return review

    @staticmethod
    def delete_review(*, review_id: int, requesting_user_id: int) -> None:
        """Author can delete their own review; admins can delete any."""
        review = ReviewAccess.get_review(review_id=review_id)
        requester = UserAccess.get_profile(user_id=requesting_user_id)

        is_author = review.author_id == requesting_user_id
        is_admin = requester.role == User.Role.ADMIN

        if not (is_author or is_admin):
            raise PermissionError(
                'Vous ne pouvez supprimer que vos propres avis.'
            )

        ReviewAccess.delete_review(review_id=review_id)

        ReviewManager._audit(
            action='review_deleted',
            actor_id=requesting_user_id,
            target_id=review_id,
        )

    @staticmethod
    def hide_review(*, review_id: int, admin_id: int) -> Review:
        """Admin moderates: hides without deleting."""
        admin = UserAccess.get_profile(user_id=admin_id)
        if admin.role != User.Role.ADMIN:
            raise PermissionError(
                'Seul un administrateur peut masquer un avis.'
            )

        review = ReviewAccess.hide_review(review_id=review_id)
        ReviewManager._audit(
            action='review_hidden',
            actor_id=admin_id,
            target_id=review_id,
        )
        return review

    # ── Read operations ────────────────────────────────────────────────────

    @staticmethod
    def get_reviews_for_service(*, service_id: int) -> list[Review]:
        """Public — returns only PUBLISHED reviews."""
        return ReviewAccess.get_reviews_for_service(service_id=service_id)

    @staticmethod
    def get_reviews_by_author(*, author_id: int) -> list[Review]:
        """Returns all reviews (any status) by an author."""
        return ReviewAccess.get_reviews_by_author(author_id=author_id)
