from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken


class BNATokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that accepts `email` + `password`
    (rather than the default `username`) and embeds user role,
    status, and full name into the JWT payload.

    Delegates actual credential verification to UserAccess.authenticate
    so that the logic for "email exists, password matches, account is
    ACTIVE" lives in exactly one place.
    """

    username_field = 'email'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Replace the default 'username' field that TokenObtainSerializer created
        self.fields.pop('username', None)
        self.fields['email'] = serializers.EmailField(required=True, write_only=True)

    @classmethod
    def get_token(cls, user) -> RefreshToken:
        token = super().get_token(user)

        token['role'] = user.role
        token['status'] = user.status
        token['email'] = user.email
        token['full_name'] = user.get_full_name()

        return token

    def validate(self, attrs):
        from apps.identity.access import UserAccess
        from core.exceptions import AccountNotActive, InvalidCredentials

        email = attrs.get('email')
        password = attrs.get('password')

        try:
            user = UserAccess.authenticate(email=email, password=password)
        except InvalidCredentials:
            raise AuthenticationFailed(
                InvalidCredentials.default_message, 'no_active_account',
            )
        except AccountNotActive:
            raise AuthenticationFailed(
                AccountNotActive.default_message, 'no_active_account',
            )

        self.user = user
        refresh = self.get_token(user)

        return {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.pk,
                'email': user.email,
                'full_name': user.get_full_name(),
                'role': user.role,
                'status': user.status,
                'preferred_language': user.preferred_language,
            },
        }
