from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from apps.reviews.managers import ReviewManager
from apps.reviews.serializers import (
    CreateReviewSerializer,
    ReviewOutputSerializer,
    UpdateReviewSerializer,
)
from core.permissions import IsAdmin, IsClient, IsGuest
from core.responses import created, no_content, success


class ReviewListView(APIView):
    """
    GET /api/reviews/?service_id=N
    Public list of reviews for a service. Returns [] if service_id missing.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        service_id = request.query_params.get('service_id')
        if not service_id:
            return success([])
        try:
            sid = int(service_id)
        except (TypeError, ValueError):
            return success([])
        reviews = ReviewManager.get_reviews_for_service(service_id=sid)
        return success(ReviewOutputSerializer(reviews, many=True).data)


class MyReviewsView(APIView):
    """GET /api/reviews/me/ — own reviews."""
    permission_classes = [IsClient]

    def get(self, request):
        reviews = ReviewManager.get_reviews_by_author(author_id=request.user.pk)
        return success(ReviewOutputSerializer(reviews, many=True).data)


class CreateReviewView(APIView):
    """POST /api/reviews/create/ — author = request.user."""
    permission_classes = [IsClient]

    def post(self, request):
        serializer = CreateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        review = ReviewManager.create_review(
            author_id=request.user.pk,
            **serializer.validated_data,
        )
        return created(ReviewOutputSerializer(review).data)


class ReviewDetailView(APIView):
    """
    PATCH /api/reviews/{review_id}/ — update own review (author).
    DELETE /api/reviews/{review_id}/ — delete (author or admin).
    """
    permission_classes = [IsGuest]

    def patch(self, request, review_id: int):
        serializer = UpdateReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        review = ReviewManager.update_review(
            review_id=review_id,
            requesting_user_id=request.user.pk,
            **serializer.validated_data,
        )
        return success(ReviewOutputSerializer(review).data)

    def delete(self, request, review_id: int):
        ReviewManager.delete_review(
            review_id=review_id,
            requesting_user_id=request.user.pk,
        )
        return no_content()


class HideReviewView(APIView):
    """POST /api/reviews/{review_id}/hide/ — admin moderation."""
    permission_classes = [IsAdmin]

    def post(self, request, review_id: int):
        review = ReviewManager.hide_review(
            review_id=review_id,
            admin_id=request.user.pk,
        )
        return success(ReviewOutputSerializer(review).data)
