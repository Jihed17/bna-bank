from django.urls import path

from apps.reviews.views import (
    CreateReviewView,
    HideReviewView,
    MyReviewsView,
    ReviewDetailView,
    ReviewListView,
)

urlpatterns = [
    # Static paths first so the int converter doesn't shadow them.
    path('', ReviewListView.as_view(), name='review-list'),
    path('me/', MyReviewsView.as_view(), name='review-my'),
    path('create/', CreateReviewView.as_view(), name='review-create'),
    path('<int:review_id>/', ReviewDetailView.as_view(), name='review-detail'),
    path('<int:review_id>/hide/', HideReviewView.as_view(), name='review-hide'),
]
