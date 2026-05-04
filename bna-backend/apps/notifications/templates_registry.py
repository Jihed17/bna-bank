"""
Notification content templates.

Volatile: template copy, languages, and formatting change here only.
NotifyingEngine reads from this registry — it never hardcodes content.

Each entry maps an EventType to a dict with:
  - 'subject': Email subject line (plain text)
  - 'body':    Message body (plain text; uses str.format_map(payload))
  - 'short':   SMS / push body (≤ 160 chars)
"""

from apps.notifications.models import Notification


TEMPLATES: dict = {

    Notification.EventType.APPOINTMENT_REQUESTED: {
        'subject': 'Nouvelle demande de rendez-vous — {appointment_ref}',
        'body': (
            'Bonjour,\n\n'
            'Une nouvelle demande de rendez-vous vous a été attribuée.\n\n'
            'Référence : {appointment_ref}\n'
            'Client     : {client_full_name}\n'
            'Service    : {service_name}\n'
            'Agence     : {agency_name}\n'
            'Date       : {scheduled_at}\n'
            'Motif      : {reason}\n\n'
            'Merci de vous connecter pour accepter ou refuser cette demande.\n\n'
            'BNA Digital'
        ),
        'short': 'Nouvelle demande RDV {appointment_ref} — {service_name} le {scheduled_at}.',
    },

    Notification.EventType.APPOINTMENT_ASSIGNED: {
        'subject': 'Votre rendez-vous {appointment_ref} est confirmé',
        'body': (
            'Bonjour,\n\n'
            'Votre rendez-vous a été pris en charge par un agent BNA.\n\n'
            'Référence : {appointment_ref}\n'
            'Agent      : {agent_full_name}\n'
            'Service    : {service_name}\n'
            'Agence     : {agency_name}\n'
            'Date       : {scheduled_at}\n\n'
            "Présentez-vous à l'agence le jour du rendez-vous.\n\n"
            'BNA Digital'
        ),
        'short': 'Votre RDV {appointment_ref} a un agent. Date : {scheduled_at}.',
    },

    Notification.EventType.APPOINTMENT_CONFIRMED: {
        'subject': 'Rendez-vous {appointment_ref} confirmé',
        'body': (
            'Bonjour,\n\n'
            'Votre rendez-vous {appointment_ref} est confirmé.\n\n'
            'Service : {service_name}\n'
            'Agence  : {agency_name}\n'
            'Date    : {scheduled_at}\n\n'
            'BNA Digital'
        ),
        'short': 'RDV {appointment_ref} confirmé. Date : {scheduled_at}.',
    },

    Notification.EventType.APPOINTMENT_CANCELLED: {
        'subject': 'Rendez-vous {appointment_ref} annulé',
        'body': (
            'Bonjour,\n\n'
            'Le rendez-vous suivant a été annulé.\n\n'
            'Référence : {appointment_ref}\n'
            'Service    : {service_name}\n'
            'Date       : {scheduled_at}\n'
            'Motif      : {reason}\n\n'
            'Vous pouvez prendre un nouveau rendez-vous sur la plateforme BNA Digital.\n\n'
            'BNA Digital'
        ),
        'short': 'Rendez-vous {appointment_ref} annulé. Motif : {reason}.',
    },

    Notification.EventType.APPOINTMENT_COMPLETED: {
        'subject': 'Rendez-vous {appointment_ref} effectué — merci de votre visite',
        'body': (
            'Bonjour,\n\n'
            'Votre rendez-vous {appointment_ref} a bien été enregistré comme effectué.\n\n'
            "Nous espérons que votre visite s'est bien passée.\n\n"
            'BNA Digital'
        ),
        'short': 'Votre RDV {appointment_ref} est marqué comme effectué. Merci !',
    },

    Notification.EventType.APPOINTMENT_REMINDER: {
        'subject': 'Rappel : rendez-vous {appointment_ref} demain',
        'body': (
            'Bonjour,\n\n'
            'Ceci est un rappel pour votre rendez-vous à venir.\n\n'
            'Référence : {appointment_ref}\n'
            'Service    : {service_name}\n'
            'Agence     : {agency_name}\n'
            'Date       : {scheduled_at}\n\n'
            "Nous vous attendons à l'agence.\n\n"
            'BNA Digital'
        ),
        'short': 'Rappel RDV {appointment_ref} — {scheduled_at}.',
    },

    Notification.EventType.SERVICE_UPDATED: {
        'subject': 'Mise à jour du service : {service_name}',
        'body': (
            'Bonjour,\n\n'
            'Le service "{service_name}" a été mis à jour ({change_type}).\n\n'
            'Connectez-vous à la plateforme pour consulter les détails.\n\n'
            'BNA Digital'
        ),
        'short': 'Service {service_name} mis à jour ({change_type}).',
    },

    Notification.EventType.ACCOUNT_VERIFIED: {
        'subject': 'Bienvenue sur BNA Digital, {full_name} !',
        'body': (
            'Bonjour {full_name},\n\n'
            'Votre compte client BNA Digital est maintenant activé.\n\n'
            'Vous pouvez dès à présent prendre des rendez-vous en ligne.\n\n'
            'BNA Digital'
        ),
        'short': 'Votre compte BNA Digital est activé. Bienvenue !',
    },

    Notification.EventType.PASSWORD_RESET: {
        'subject': 'Réinitialisation de votre mot de passe BNA Digital',
        'body': (
            'Bonjour,\n\n'
            'Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe.\n\n'
            '{reset_url}\n\n'
            'Ce lien expire dans 1 heure.\n'
            "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\n"
            'BNA Digital'
        ),
        'short': 'Lien de réinitialisation : {reset_url}',
    },

    Notification.EventType.EMAIL_VERIFICATION: {
        'subject': 'Confirmez votre adresse email — BNA Digital',
        'body': (
            'Bonjour {full_name},\n\n'
            'Bienvenue sur BNA Digital. Pour activer votre compte, '
            'cliquez sur le lien ci-dessous :\n\n'
            '{verification_url}\n\n'
            'Ce lien expire dans 24 heures.\n'
            "Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.\n\n"
            'BNA Digital'
        ),
        'short': 'Confirmez votre email BNA Digital : {verification_url}',
    },

    Notification.EventType.REGISTRATION_SUBMITTED: {
        'subject': 'Votre demande d\'inscription BNA Digital est en cours d\'examen',
        'body': (
            'Bonjour {full_name},\n\n'
            'Nous avons bien reçu votre demande d\'inscription sur BNA Digital.\n\n'
            'Un administrateur va examiner votre dossier sous peu. Vous recevrez '
            'un email dès que votre compte sera activé.\n\n'
            'BNA Digital'
        ),
        'short': 'Inscription BNA Digital reçue — examen en cours.',
    },

    Notification.EventType.REGISTRATION_PENDING_ADMIN: {
        'subject': 'Nouvelle inscription à examiner — {full_name}',
        'body': (
            'Bonjour,\n\n'
            'Une nouvelle inscription est en attente d\'approbation.\n\n'
            'Nom    : {full_name}\n'
            'Email  : {email}\n\n'
            'Connectez-vous à l\'espace administrateur pour valider ou refuser '
            'cette demande.\n\n'
            'BNA Digital'
        ),
        'short': 'Nouvelle inscription : {full_name} ({email}).',
    },

    Notification.EventType.PASSWORD_CHANGED: {
        'subject': 'Votre mot de passe BNA Digital a été modifié',
        'body': (
            'Bonjour,\n\n'
            'Votre mot de passe a été modifié avec succès.\n\n'
            "Si vous n'êtes pas à l'origine de cette modification, contactez "
            'immédiatement votre agence BNA et réinitialisez votre mot de passe.\n\n'
            'BNA Digital'
        ),
        'short': 'Mot de passe BNA modifié. Pas vous ? Contactez votre agence.',
    },

    Notification.EventType.LOGIN_NEW_DEVICE: {
        'subject': 'Nouvelle connexion à votre compte BNA Digital',
        'body': (
            'Bonjour,\n\n'
            'Une connexion a été détectée depuis un nouvel appareil.\n\n'
            'Adresse IP   : {ip_address}\n'
            'Navigateur   : {user_agent}\n\n'
            "Si vous reconnaissez cette connexion, aucune action n'est requise.\n"
            "Sinon, changez votre mot de passe immédiatement et contactez votre "
            'agence BNA.\n\n'
            'BNA Digital'
        ),
        'short': 'Nouvelle connexion BNA depuis {ip_address}. Pas vous ? Changez votre mdp.',
    },
}


def render(*, event_type: str, format: str, payload: dict) -> str:
    """
    Render a notification template for the given event_type and format.

    `format` must be one of: 'subject', 'body', 'short'.
    Missing payload keys are rendered as empty string rather than raising.
    Unknown event types render a fallback '[event_type]' marker.
    """
    template = TEMPLATES.get(event_type, {}).get(format, '')
    if not template:
        return f'[{event_type}]'

    class SafeDict(dict):
        def __missing__(self, key):
            return ''

    return template.format_map(SafeDict(payload))
