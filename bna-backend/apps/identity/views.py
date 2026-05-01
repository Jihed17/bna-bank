from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from apps.identity.managers import IdentityManager
from apps.identity.serializers import (
    AuthOutputSerializer,
    LoginSerializer,
    LogoutSerializer,
    PasswordChangeSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    RoleAssignSerializer,
    UserOutputSerializer,
)
from core.permissions import IsAdmin, IsGuest
from core.responses import created, no_content, success


class RegisterView(APIView):
    """
    POST /api/identity/register/
    Creates a GUEST in PENDING status. An admin must approve before the
    account can log in (see /users/{id}/approve/).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = IdentityManager.register_pending_guest(**serializer.validated_data)

        return created(UserOutputSerializer(user).data)


class LoginView(APIView):
    """POST /api/identity/login/ — JWT tokens + user profile."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = IdentityManager.authenticate(**serializer.validated_data)

        return success(AuthOutputSerializer(result).data)


class LogoutView(APIView):
    """POST /api/identity/logout/ — blacklist the refresh token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        IdentityManager.logout(
            refresh_token=serializer.validated_data['refresh'],
        )

        return no_content()


class ProfileView(APIView):
    """GET/PUT /api/identity/profile/ — own profile read and update."""
    permission_classes = [IsGuest]

    def get(self, request):
        user = IdentityManager.get_profile(user_id=request.user.pk)
        return success(UserOutputSerializer(user).data)

    def put(self, request):
        serializer = ProfileUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = IdentityManager.update_profile(
            user_id=request.user.pk,
            requesting_user_id=request.user.pk,
            **serializer.validated_data,
        )

        return success(UserOutputSerializer(user).data)


class PasswordChangeView(APIView):
    """PUT /api/identity/password/change/ — change own password."""
    permission_classes = [IsGuest]

    def put(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        IdentityManager.change_password(
            user_id=request.user.pk,
            current_password=serializer.validated_data['current_password'],
            new_password=serializer.validated_data['new_password'],
        )

        return no_content()


class PasswordResetRequestView(APIView):
    """POST /api/identity/password/reset/ — always 204 (anti-enumeration)."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        IdentityManager.request_password_reset(
            email=serializer.validated_data['email'],
        )

        return no_content()


class PasswordResetConfirmView(APIView):
    """POST /api/identity/password/reset/confirm/ — consume reset token."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        IdentityManager.reset_password(
            token=serializer.validated_data['token'],
            new_password=serializer.validated_data['new_password'],
        )

        return no_content()


# ── Admin-only views ───────────────────────────────────────────────────────

class UserListAdminView(APIView):
    """
    GET /api/identity/users/?role=agent
    GET /api/identity/users/?role=guest&status=pending  (approval queue)

    Admin-only listing. By default filters role=X to ACTIVE accounts
    (used by the agent assignment panel); when an explicit `status=` is
    supplied that override wins (used by the pending approval queue).
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        from apps.identity.models import User

        role = request.query_params.get('role')
        status_param = request.query_params.get('status')

        qs = User.objects.all().order_by('first_name', 'last_name')
        if role:
            qs = qs.filter(role=role)
            if status_param is None:
                # Backwards-compat: agents endpoint filtered to ACTIVE only.
                qs = qs.filter(status=User.AccountStatus.ACTIVE)
        if status_param:
            qs = qs.filter(status=status_param)

        return success(UserOutputSerializer(qs, many=True).data)


class PendingGuestsView(APIView):
    """
    GET /api/identity/pending-guests/
    Convenience endpoint — returns all GUEST users with status=PENDING.
    Equivalent to /users/?role=guest&status=pending.
    """
    permission_classes = [IsAdmin]

    def get(self, request):
        users = IdentityManager.get_pending_guests()
        return success(UserOutputSerializer(users, many=True).data)


class ApproveGuestView(APIView):
    """POST /api/identity/users/{user_id}/approve/ — admin approves registration."""
    permission_classes = [IsAdmin]

    def post(self, request, user_id: int):
        user = IdentityManager.approve_guest(
            user_id=user_id,
            admin_id=request.user.pk,
        )
        return success(UserOutputSerializer(user).data)


class RejectGuestView(APIView):
    """POST /api/identity/users/{user_id}/reject/ — admin rejects (suspend)."""
    permission_classes = [IsAdmin]

    def post(self, request, user_id: int):
        reason = request.data.get('reason', '') if isinstance(request.data, dict) else ''
        user = IdentityManager.reject_guest(
            user_id=user_id,
            admin_id=request.user.pk,
            reason=reason,
        )
        return success(UserOutputSerializer(user).data)


class DeleteUserView(APIView):
    """DELETE /api/identity/users/{user_id}/delete/ — admin hard-deletes."""
    permission_classes = [IsAdmin]

    def delete(self, request, user_id: int):
        IdentityManager.delete_user(
            user_id=user_id,
            admin_id=request.user.pk,
        )
        return no_content()


class UserDetailAdminView(APIView):
    """GET /api/identity/users/{user_id}/ — admin fetches any profile."""
    permission_classes = [IsAdmin]

    def get(self, request, user_id: int):
        user = IdentityManager.get_profile(user_id=user_id)
        return success(UserOutputSerializer(user).data)


class AssignRoleView(APIView):
    """POST /api/identity/users/{user_id}/role/ — admin assigns any role."""
    permission_classes = [IsAdmin]

    def post(self, request, user_id: int):
        serializer = RoleAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = IdentityManager.assign_role(
            user_id=user_id,
            role=serializer.validated_data['role'],
            admin_id=request.user.pk,
        )

        return success(UserOutputSerializer(user).data)


class SuspendAccountView(APIView):
    """POST /api/identity/users/{user_id}/suspend/ — admin suspends account."""
    permission_classes = [IsAdmin]

    def post(self, request, user_id: int):
        user = IdentityManager.suspend_account(
            user_id=user_id,
            admin_id=request.user.pk,
        )
        return success(UserOutputSerializer(user).data)
