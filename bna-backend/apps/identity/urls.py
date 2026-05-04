from django.urls import path

from apps.identity.views import (
    ApproveGuestView,
    ArchiveUserView,
    AssignRoleView,
    DeleteUserView,
    EmailVerifyView,
    LoginView,
    LogoutView,
    PasswordChangeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    PendingGuestsView,
    ProfileView,
    ReactivateAccountView,
    RegisterView,
    RejectGuestView,
    SuspendAccountView,
    UserDetailAdminView,
    UserListAdminView,
)

urlpatterns = [
    # Public auth
    path('register/', RegisterView.as_view(), name='identity-register'),
    path('verify-email/', EmailVerifyView.as_view(), name='identity-verify-email'),
    path('login/', LoginView.as_view(), name='identity-login'),
    path('logout/', LogoutView.as_view(), name='identity-logout'),

    # Password management
    path('password/change/', PasswordChangeView.as_view(), name='identity-password-change'),
    path('password/reset/', PasswordResetRequestView.as_view(), name='identity-password-reset'),
    path('password/reset/confirm/', PasswordResetConfirmView.as_view(), name='identity-password-reset-confirm'),

    # Own profile
    path('profile/', ProfileView.as_view(), name='identity-profile'),

    # Admin — approval queue (static paths first)
    path('pending-guests/', PendingGuestsView.as_view(), name='identity-pending-guests'),

    # Admin user management
    path('users/', UserListAdminView.as_view(), name='identity-user-list'),
    path('users/<int:user_id>/', UserDetailAdminView.as_view(), name='identity-user-detail'),
    path('users/<int:user_id>/role/', AssignRoleView.as_view(), name='identity-assign-role'),
    path('users/<int:user_id>/suspend/', SuspendAccountView.as_view(), name='identity-suspend'),
    path('users/<int:user_id>/approve/', ApproveGuestView.as_view(), name='identity-approve'),
    path('users/<int:user_id>/reject/', RejectGuestView.as_view(), name='identity-reject'),
    path('users/<int:user_id>/delete/', DeleteUserView.as_view(), name='identity-delete-user'),
    path('users/<int:user_id>/archive/', ArchiveUserView.as_view(), name='identity-archive-user'),
    path('users/<int:user_id>/reactivate/', ReactivateAccountView.as_view(), name='identity-reactivate-user'),
]
