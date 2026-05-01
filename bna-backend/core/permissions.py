from __future__ import annotations

from rest_framework.permissions import BasePermission

from apps.identity.models import User


class _RolePermission(BasePermission):
    """
    Base class for role-based permission gates.
    Reads role from the authenticated user (available via the JWT claim
    embedded by BNATokenObtainPairSerializer — no DB hit is strictly
    required, but simplejwt re-fetches the user to get the full model).
    Subclasses define `allowed_roles`.
    """
    allowed_roles: list[str] = []
    message = "Vous n'avez pas les droits nécessaires pour cette action."

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False

        role = getattr(request.user, 'role', None)
        return role in self.allowed_roles


class IsGuest(_RolePermission):
    """
    Allows any authenticated user regardless of role.
    Used for endpoints that require a session but no specific role
    (e.g. viewing own profile, changing password).
    """
    allowed_roles = [
        User.Role.GUEST,
        User.Role.CLIENT,
        User.Role.AGENT,
        User.Role.ADMIN,
    ]
    message = 'Authentification requise.'


class IsClient(_RolePermission):
    """
    Allows CLIENT, AGENT, and ADMIN.
    GUEST accounts cannot make appointments — they must be promoted first.
    """
    allowed_roles = [
        User.Role.CLIENT,
        User.Role.AGENT,
        User.Role.ADMIN,
    ]
    message = 'Votre compte doit être activé pour accéder à cette fonctionnalité.'


class IsAgent(_RolePermission):
    """Allows AGENT and ADMIN only."""
    allowed_roles = [
        User.Role.AGENT,
        User.Role.ADMIN,
    ]
    message = 'Accès réservé aux agents BNA.'


class IsAdmin(_RolePermission):
    """Allows ADMIN only."""
    allowed_roles = [User.Role.ADMIN]
    message = 'Accès réservé aux administrateurs.'


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level permission.
    Allows access if the requesting user owns the object or is ADMIN.
    The view must call self.check_object_permissions(request, obj).
    The object must have a `client`, `user`, or `recipient` FK to identity.User.
    """
    message = 'Vous ne pouvez accéder qu’à vos propres ressources.'

    def has_object_permission(self, request, view, obj) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False

        if getattr(request.user, 'role', None) == User.Role.ADMIN:
            return True

        owner_id = (
            getattr(obj, 'client_id', None)
            or getattr(obj, 'user_id', None)
            or getattr(obj, 'recipient_id', None)
        )
        return owner_id == request.user.pk
