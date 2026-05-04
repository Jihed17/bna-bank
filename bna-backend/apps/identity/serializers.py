from rest_framework import serializers

from apps.identity.models import User


# ── Input serializers ──────────────────────────────────────────────────────

class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8, write_only=True)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, default='')
    preferred_language = serializers.ChoiceField(
        choices=['fr', 'ar', 'en'], required=False, default='fr',
    )
    gender = serializers.ChoiceField(
        choices=User.Gender.choices, required=False, allow_blank=True,
    )
    identity_image = serializers.ImageField(required=False, allow_null=True)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, write_only=True)


class EmailVerifySerializer(serializers.Serializer):
    token = serializers.CharField()


class ProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150, required=False)
    last_name = serializers.CharField(max_length=150, required=False)
    phone = serializers.CharField(max_length=20, required=False)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    preferred_language = serializers.ChoiceField(
        choices=['fr', 'ar', 'en'], required=False,
    )
    notification_email = serializers.BooleanField(required=False)
    notification_sms = serializers.BooleanField(required=False)
    gender = serializers.ChoiceField(
        choices=User.Gender.choices, required=False, allow_blank=True,
    )
    identity_image = serializers.ImageField(required=False, allow_null=True)


class RoleAssignSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=User.Role.choices)


# ── Output serializers ─────────────────────────────────────────────────────

class UserOutputSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    agency_id = serializers.IntegerField(source='agency.id', read_only=True, default=None)
    agency_name = serializers.CharField(source='agency.name', read_only=True, default=None)
    identity_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'date_of_birth', 'national_id',
            'gender', 'gender_display', 'identity_image_url',
            'role', 'role_display', 'status', 'status_display',
            'agency_id', 'agency_name',
            'preferred_language', 'notification_email', 'notification_sms',
            'date_joined', 'created_at',
        ]
        read_only_fields = fields

    def get_identity_image_url(self, obj):
        if not obj.identity_image:
            return None
        request = self.context.get('request')
        url = obj.identity_image.url
        return request.build_absolute_uri(url) if request else url

    def get_full_name(self, obj) -> str:
        return obj.get_full_name()


class AuthOutputSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserOutputSerializer()
