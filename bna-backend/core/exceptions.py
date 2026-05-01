from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler


class BNAException(Exception):
    """Base exception for all BNA domain errors."""
    default_message = "Une erreur inattendue s'est produite."

    def __init__(self, message=None):
        self.message = message or self.default_message
        super().__init__(self.message)


# Identity domain
class UserNotFound(BNAException):
    default_message = 'Utilisateur introuvable.'


class EmailAlreadyRegistered(BNAException):
    default_message = 'Cette adresse email est déjà utilisée.'


class InvalidCredentials(BNAException):
    default_message = 'Email ou mot de passe incorrect.'


class AccountNotActive(BNAException):
    default_message = "Ce compte n'est pas actif."


class AccountAlreadyPromoted(BNAException):
    default_message = 'Ce compte est déjà un compte client complet.'


# Service domain
class ServiceNotFound(BNAException):
    default_message = 'Service introuvable.'


class AgencyNotFound(BNAException):
    default_message = 'Agence introuvable.'


class AgentAlreadyAssigned(BNAException):
    default_message = 'Cet agent est déjà affecté à ce service dans cette agence.'


class AgentNotAssigned(BNAException):
    default_message = "Cet agent n'est pas affecté à ce service dans cette agence."


# Appointment domain
class AppointmentNotFound(BNAException):
    default_message = 'Rendez-vous introuvable.'


class AppointmentConflict(BNAException):
    default_message = 'Un rendez-vous existe déjà sur ce créneau.'


class InvalidStatusTransition(BNAException):
    default_message = "Cette transition de statut n'est pas autorisée."


# Notification domain
class NotificationNotFound(BNAException):
    default_message = 'Notification introuvable.'


# Review domain
class ReviewNotFound(BNAException):
    default_message = 'Avis introuvable.'


class ReviewAlreadyExists(BNAException):
    default_message = 'Vous avez déjà publié un avis pour ce service.'


# Generic
class CannotDelete(BNAException):
    default_message = "Impossible de supprimer cet élément (références existantes)."


_handler_logger = logging.getLogger('bna.exceptions')

# Mapping from domain exception class name to HTTP status code
_EXCEPTION_STATUS_MAP: dict = {
    'UserNotFound': status.HTTP_404_NOT_FOUND,
    'EmailAlreadyRegistered': status.HTTP_409_CONFLICT,
    'InvalidCredentials': status.HTTP_401_UNAUTHORIZED,
    'AccountNotActive': status.HTTP_403_FORBIDDEN,
    'AccountAlreadyPromoted': status.HTTP_409_CONFLICT,

    'ServiceNotFound': status.HTTP_404_NOT_FOUND,
    'AgencyNotFound': status.HTTP_404_NOT_FOUND,
    'AgentAlreadyAssigned': status.HTTP_409_CONFLICT,
    'AgentNotAssigned': status.HTTP_404_NOT_FOUND,

    'AppointmentNotFound': status.HTTP_404_NOT_FOUND,
    'AppointmentConflict': status.HTTP_409_CONFLICT,
    'InvalidStatusTransition': status.HTTP_422_UNPROCESSABLE_ENTITY,

    'NotificationNotFound': status.HTTP_404_NOT_FOUND,

    'ReviewNotFound': status.HTTP_404_NOT_FOUND,
    'ReviewAlreadyExists': status.HTTP_409_CONFLICT,

    'CannotDelete': status.HTTP_409_CONFLICT,
}


def bna_exception_handler(exc, context):
    """
    Custom DRF exception handler.

    For BNA domain exceptions: returns { "error": "...", "code": "..." }
    For DRF validation errors: returns { "error": "...", "code": "ValidationError", "detail": {...} }
    For unhandled exceptions: logs and returns 500.

    Always returns the same envelope — the frontend never has to guess the shape.
    """
    response = drf_exception_handler(exc, context)

    if isinstance(exc, BNAException):
        http_status = _EXCEPTION_STATUS_MAP.get(
            type(exc).__name__,
            status.HTTP_400_BAD_REQUEST,
        )
        view = context.get('view') if context else None
        _handler_logger.warning(
            'domain_exception',
            extra={
                'exception_type': type(exc).__name__,
                'bna_message': exc.message,
                'view': type(view).__name__ if view else '',
            },
        )
        return Response(
            {
                'error': exc.message,
                'code': type(exc).__name__,
            },
            status=http_status,
        )

    if response is not None:
        original_data = response.data
        if response.status_code == 400:
            normalised = {
                'error': 'Données invalides.',
                'code': 'ValidationError',
                'detail': original_data,
            }
        else:
            if isinstance(original_data, dict):
                err_message = str(original_data.get('detail', 'Erreur.'))
            else:
                err_message = str(original_data)
            normalised = {
                'error': err_message,
                'code': 'PermissionDenied',
            }
        response.data = normalised
        return response

    if isinstance(exc, PermissionError):
        message = str(exc) or 'Accès refusé.'
        return Response(
            {'error': message, 'code': 'PermissionDenied'},
            status=status.HTTP_403_FORBIDDEN,
        )

    view = context.get('view') if context else None
    _handler_logger.error(
        'unhandled_exception',
        exc_info=True,
        extra={'view': type(view).__name__ if view else ''},
    )
    return Response(
        {
            'error': "Une erreur interne s'est produite.",
            'code': 'InternalError',
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
