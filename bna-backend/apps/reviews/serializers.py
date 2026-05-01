from rest_framework import serializers

from apps.reviews.models import Review


# ── Input serializers ──────────────────────────────────────────────────────

class CreateReviewSerializer(serializers.Serializer):
    service_id = serializers.IntegerField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    comment = serializers.CharField(
        required=False, allow_blank=True, default='', max_length=2000,
    )


class UpdateReviewSerializer(serializers.Serializer):
    rating = serializers.IntegerField(required=False, min_value=1, max_value=5)
    comment = serializers.CharField(
        required=False, allow_blank=True, max_length=2000,
    )


# ── Output serializers ─────────────────────────────────────────────────────

class ReviewOutputSerializer(serializers.ModelSerializer):
    author_id = serializers.IntegerField(source='author.id', read_only=True)
    author_name = serializers.SerializerMethodField()
    service_id_field = serializers.IntegerField(source='service.id', read_only=True)
    service_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Review
        fields = [
            'id',
            'author_id', 'author_name',
            'service_id_field', 'service_name',
            'rating', 'comment',
            'status', 'status_display',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_author_name(self, obj) -> str:
        return obj.author.get_full_name() or obj.author.email

    def get_service_name(self, obj) -> str:
        return obj.service.name

    def to_representation(self, instance):
        # Surface service.id as plain `service_id` for the frontend.
        data = super().to_representation(instance)
        data['service_id'] = data.pop('service_id_field', instance.service_id)
        return data
