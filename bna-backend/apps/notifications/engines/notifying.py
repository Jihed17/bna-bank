from __future__ import annotations

import abc

from django.conf import settings
from django.core.mail import send_mail

from apps.notifications.access import NotificationAccess
from apps.notifications.models import Notification
from apps.notifications.templates_registry import render
from core.logging import get_logger

logger = get_logger('notifications.notifying')


# ── Base adapter ────────────────────────────────────────────────────────────

class BaseChannelAdapter(abc.ABC):
    """
    Strategy base class for notification delivery channels.

    Adding a new channel (WhatsApp, push, Slack) requires:
      1. Subclass BaseChannelAdapter.
      2. Implement send().
      3. Register in CHANNEL_ADAPTERS below.

    Nothing else changes.
    """

    @abc.abstractmethod
    def send(self, notification: Notification) -> None:
        """
        Deliver the notification.
        Raises any exception on failure — NotifyingEngine.dispatch()
        catches it and calls NotificationAccess.mark_failed().
        """
        ...


# ── Email adapter ───────────────────────────────────────────────────────────

class EmailAdapter(BaseChannelAdapter):
    """
    Delivers notifications via Django's email backend.
    Development: console backend (no actual email sent).
    Production:  SMTP backend configured in settings.
    """

    def send(self, notification: Notification) -> None:
        subject = render(
            event_type=notification.event_type,
            format='subject',
            payload=notification.payload,
        )
        body = render(
            event_type=notification.event_type,
            format='body',
            payload=notification.payload,
        )
        recipient_email = notification.recipient.email

        send_mail(
            subject=subject,
            message=body,
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@bna.tn'),
            recipient_list=[recipient_email],
            fail_silently=False,
        )

        logger.info(
            'email_sent',
            extra={
                'notification_id': notification.pk,
                'recipient': recipient_email,
                'event_type': notification.event_type,
            },
        )


# ── Gmail OAuth 2.0 adapter ─────────────────────────────────────────────────

class GmailOAuthAdapter(BaseChannelAdapter):
    """
    Sends mail through the Gmail API using a long-lived OAuth 2.0
    refresh_token. Used in production when SMTP App Passwords are
    disabled or when the team needs Google's audit/revocation flow.

    Activation: all four GMAIL_OAUTH_* settings must be populated.
    The CHANNEL_ADAPTERS registry below picks this adapter automatically
    when GMAIL_OAUTH_REFRESH_TOKEN is set; otherwise EmailAdapter (SMTP)
    is used. No call site changes.
    """

    def send(self, notification: Notification) -> None:
        import base64
        from email.mime.text import MIMEText

        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        creds = Credentials(
            token=None,
            refresh_token=settings.GMAIL_OAUTH_REFRESH_TOKEN,
            client_id=settings.GMAIL_OAUTH_CLIENT_ID,
            client_secret=settings.GMAIL_OAUTH_CLIENT_SECRET,
            token_uri='https://oauth2.googleapis.com/token',
            scopes=['https://www.googleapis.com/auth/gmail.send'],
        )

        subject = render(
            event_type=notification.event_type,
            format='subject',
            payload=notification.payload,
        )
        body = render(
            event_type=notification.event_type,
            format='body',
            payload=notification.payload,
        )

        message = MIMEText(body)
        message['to'] = notification.recipient.email
        message['from'] = settings.GMAIL_OAUTH_SENDER
        message['subject'] = subject

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

        service = build('gmail', 'v1', credentials=creds, cache_discovery=False)
        service.users().messages().send(userId='me', body={'raw': raw}).execute()

        logger.info(
            'gmail_oauth_email_sent',
            extra={
                'notification_id': notification.pk,
                'recipient': notification.recipient.email,
                'event_type': notification.event_type,
            },
        )


# ── SMS adapter (stub) ──────────────────────────────────────────────────────

class SMSAdapter(BaseChannelAdapter):
    """
    Delivers notifications via an SMS provider.

    Current implementation: stub that logs the message.
    Production: replace the body with the SMS provider SDK call
    (Twilio, Infobip, local gateway) — this class only.
    """

    def send(self, notification: Notification) -> None:
        short = render(
            event_type=notification.event_type,
            format='short',
            payload=notification.payload,
        )
        phone = notification.recipient.phone

        if not phone:
            raise ValueError(
                f'No phone number for user {notification.recipient_id} '
                f'— SMS cannot be delivered.'
            )

        logger.info(
            'sms_stub_sent',
            extra={
                'notification_id': notification.pk,
                'phone': phone,
                'message': short,
                'event_type': notification.event_type,
            },
        )


# ── In-app adapter ──────────────────────────────────────────────────────────

class InAppAdapter(BaseChannelAdapter):
    """
    In-app notifications are stored in NotificationStorage and polled
    by the frontend. Delivery is confirmed the moment the record is
    written — no external call needed. WebSocket upgrade in a future
    phase replaces polling without touching this adapter.
    """

    def send(self, notification: Notification) -> None:
        logger.debug(
            'in_app_notification_ready',
            extra={
                'notification_id': notification.pk,
                'recipient_id': notification.recipient_id,
                'event_type': notification.event_type,
            },
        )


# ── Push adapter (stub) ─────────────────────────────────────────────────────

class PushAdapter(BaseChannelAdapter):
    """
    Mobile push notifications via FCM / APNs.
    Stub — implement when the mobile app is built.
    """

    def send(self, notification: Notification) -> None:
        logger.info(
            'push_stub_sent',
            extra={
                'notification_id': notification.pk,
                'recipient_id': notification.recipient_id,
            },
        )


# ── Adapter registry ────────────────────────────────────────────────────────
# New channel = new adapter class + one entry here. Zero other changes.

def _select_email_adapter() -> BaseChannelAdapter:
    """Use Gmail API when an OAuth refresh_token is set; SMTP otherwise."""
    if getattr(settings, 'GMAIL_OAUTH_REFRESH_TOKEN', ''):
        return GmailOAuthAdapter()
    return EmailAdapter()


CHANNEL_ADAPTERS: dict = {
    Notification.Channel.EMAIL: _select_email_adapter(),
    Notification.Channel.SMS: SMSAdapter(),
    Notification.Channel.IN_APP: InAppAdapter(),
    Notification.Channel.PUSH: PushAdapter(),
}


# ── Engine ──────────────────────────────────────────────────────────────────

class NotifyingEngine:
    """
    Encapsulates HOW a notification payload is rendered and dispatched
    to a delivery channel.

    Volatile area: channel selection logic, retry policy, template
    rendering strategy — all change here, nowhere else.

    Called by: Celery tasks in apps/notifications/tasks.py (the
               NotificationListenerClient layer).
    Calls:     NotificationAccess, CHANNEL_ADAPTERS (downward only).
    Never:     publishes events, calls SchedulingEngine or MatchingEngine,
               is called by Managers directly.
    """

    @staticmethod
    def dispatch(*, notification_id: int) -> None:
        """
        Fetch a single notification from the queue, select the correct
        channel adapter, and deliver it.

        Flow:
          1. Load notification from NotificationAccess.
          2. If already processed, return (idempotency guard).
          3. Resolve the adapter from CHANNEL_ADAPTERS.
          4. Mark as SENDING, then call adapter.send().
          5. Mark as DELIVERED on success, FAILED + re-raise on exception.

        Re-raising on failure lets Celery retry the task.
        """
        try:
            notification = NotificationAccess.get_delivery_status(
                notification_id=notification_id,
            )
        except Exception as exc:
            logger.error(
                'dispatch_notification_not_found',
                extra={'notification_id': notification_id, 'error': str(exc)},
            )
            return

        if notification.status in (
            Notification.Status.DELIVERED,
            Notification.Status.CANCELLED,
            Notification.Status.FAILED,
        ):
            logger.debug(
                'dispatch_skipped_already_processed',
                extra={
                    'notification_id': notification_id,
                    'notif_status': notification.status,
                },
            )
            return

        adapter = CHANNEL_ADAPTERS.get(notification.channel)

        if not adapter:
            NotificationAccess.mark_failed(
                notification_id=notification_id,
                reason=f'Unknown channel: {notification.channel}',
            )
            logger.error(
                'dispatch_unknown_channel',
                extra={
                    'notification_id': notification_id,
                    'channel': notification.channel,
                },
            )
            return

        NotificationAccess.mark_sending(notification_id=notification_id)

        try:
            adapter.send(notification)
            NotificationAccess.mark_delivered(notification_id=notification_id)
            logger.info(
                'dispatch_delivered',
                extra={
                    'notification_id': notification_id,
                    'channel': notification.channel,
                    'event_type': notification.event_type,
                    'recipient_id': notification.recipient_id,
                },
            )
        except Exception as exc:
            NotificationAccess.mark_failed(
                notification_id=notification_id,
                reason=str(exc),
            )
            logger.warning(
                'dispatch_failed',
                extra={
                    'notification_id': notification_id,
                    'channel': notification.channel,
                    'error': str(exc),
                },
            )
            raise

    @staticmethod
    def dispatch_to_agents(
        *,
        payload: dict,
        channel: str = Notification.Channel.IN_APP,
    ) -> None:
        """
        Enqueue and immediately dispatch a notification to each
        eligible agent listed in payload['eligible_agent_ids'].

        Called by handle_appointment_requested. One notification per
        agent — each dispatched independently so a failure for one agent
        does not block the others.
        """
        eligible_ids: list = payload.get('eligible_agent_ids', []) or []
        appointment_id = payload.get('appointment_id', 0)
        event_type = Notification.EventType.APPOINTMENT_REQUESTED

        for agent_id in eligible_ids:
            try:
                notif = NotificationAccess.enqueue_notification(
                    recipient_id=agent_id,
                    channel=channel,
                    event_type=event_type,
                    payload=payload,
                    appointment_id=appointment_id,
                )
                NotifyingEngine.dispatch(notification_id=notif.pk)
            except Exception as exc:
                logger.warning(
                    'dispatch_to_agent_failed',
                    extra={
                        'agent_id': agent_id,
                        'appointment_id': appointment_id,
                        'error': str(exc),
                    },
                )

    @staticmethod
    def dispatch_to_recipient(
        *,
        recipient_id: int,
        event_type: str,
        payload: dict,
        appointment_id: int | None = None,
        channel: str = Notification.Channel.IN_APP,
    ) -> None:
        """
        Enqueue and dispatch a single notification to one recipient.
        Used for events targeting a single client or agent
        (appointment_assigned, appointment_cancelled, account_verified, …).
        """
        try:
            notif = NotificationAccess.enqueue_notification(
                recipient_id=recipient_id,
                channel=channel,
                event_type=event_type,
                payload=payload,
                appointment_id=appointment_id,
            )
            NotifyingEngine.dispatch(notification_id=notif.pk)
        except Exception as exc:
            logger.warning(
                'dispatch_to_recipient_failed',
                extra={
                    'recipient_id': recipient_id,
                    'event_type': event_type,
                    'error': str(exc),
                },
            )
