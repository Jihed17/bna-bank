from unittest.mock import patch

import pytest

from apps.identity.models import User
from apps.notifications.access import NotificationAccess
from apps.notifications.engines.notifying import (
    CHANNEL_ADAPTERS,
    NotifyingEngine,
)
from apps.notifications.models import Notification
from apps.notifications.templates_registry import render


@pytest.fixture
def recipient(db):
    return User.objects.create(
        username='r@bna.tn',
        email='r@bna.tn',
        role=User.Role.CLIENT,
        status=User.AccountStatus.ACTIVE,
        phone='+21600000000',
        password='!',
    )


@pytest.mark.django_db
class TestDispatch:

    def test_dispatch_in_app_marks_delivered(self, recipient):
        notif = NotificationAccess.enqueue_notification(
            recipient_id=recipient.pk,
            channel=Notification.Channel.IN_APP,
            event_type=Notification.EventType.APPOINTMENT_ASSIGNED,
            payload={
                'appointment_ref': 'BNA-2024-00001',
                'agent_full_name': 'Ali Ben Salem',
                'service_name': 'Crédit',
                'agency_name': 'Tunis',
                'scheduled_at': '2024-06-01 10:00',
            },
        )
        NotifyingEngine.dispatch(notification_id=notif.pk)
        notif.refresh_from_db()
        assert notif.status == Notification.Status.DELIVERED
        assert notif.delivered_at is not None

    def test_dispatch_email_sends_mail(self, recipient):
        notif = NotificationAccess.enqueue_notification(
            recipient_id=recipient.pk,
            channel=Notification.Channel.EMAIL,
            event_type=Notification.EventType.APPOINTMENT_ASSIGNED,
            payload={
                'appointment_ref': 'BNA-2024-00002',
                'agent_full_name': 'Ali Ben Salem',
                'service_name': 'Ouverture de compte',
                'agency_name': 'Sfax',
                'scheduled_at': '2024-06-02 14:00',
            },
        )
        with patch('apps.notifications.engines.notifying.send_mail') as mock_mail:
            mock_mail.return_value = 1
            NotifyingEngine.dispatch(notification_id=notif.pk)

        mock_mail.assert_called_once()
        call_kwargs = mock_mail.call_args[1]
        assert recipient.email in call_kwargs.get('recipient_list', [])
        notif.refresh_from_db()
        assert notif.status == Notification.Status.DELIVERED

    def test_dispatch_already_delivered_is_skipped(self, recipient):
        notif = NotificationAccess.enqueue_notification(
            recipient_id=recipient.pk,
            channel=Notification.Channel.IN_APP,
            event_type=Notification.EventType.APPOINTMENT_COMPLETED,
            payload={},
        )
        NotifyingEngine.dispatch(notification_id=notif.pk)
        notif.refresh_from_db()
        first_delivered_at = notif.delivered_at

        NotifyingEngine.dispatch(notification_id=notif.pk)
        notif.refresh_from_db()
        assert notif.delivered_at == first_delivered_at

    def test_dispatch_adapter_failure_marks_failed(self, recipient):
        notif = NotificationAccess.enqueue_notification(
            recipient_id=recipient.pk,
            channel=Notification.Channel.EMAIL,
            event_type=Notification.EventType.APPOINTMENT_CANCELLED,
            payload={'appointment_ref': 'BNA-2024-00003', 'reason': 'test'},
            max_retries=1,
        )
        with patch('apps.notifications.engines.notifying.send_mail') as mock_mail:
            mock_mail.side_effect = Exception('SMTP connection refused')
            with pytest.raises(Exception):
                NotifyingEngine.dispatch(notification_id=notif.pk)

        notif.refresh_from_db()
        assert notif.status == Notification.Status.FAILED
        assert 'SMTP' in notif.failure_reason

    def test_dispatch_unknown_channel_marks_failed(self, recipient):
        notif = NotificationAccess.enqueue_notification(
            recipient_id=recipient.pk,
            channel='telegram',
            event_type=Notification.EventType.SERVICE_UPDATED,
            payload={},
        )
        NotifyingEngine.dispatch(notification_id=notif.pk)
        notif.refresh_from_db()
        assert notif.status == Notification.Status.FAILED


@pytest.mark.django_db
class TestDispatchToAgents:

    def test_creates_one_notification_per_agent(self, db):
        from datetime import timedelta

        from django.utils import timezone

        from apps.appointments.access import AppointmentAccess
        from apps.services.access import AgencyAccess, ServiceAccess

        agents = [
            User.objects.create(
                username=f'ag{i}@bna.tn',
                email=f'ag{i}@bna.tn',
                role=User.Role.AGENT,
                status=User.AccountStatus.ACTIVE,
                password='!',
            )
            for i in range(3)
        ]
        client = User.objects.create(
            username='client-dispatch@bna.tn',
            email='client-dispatch@bna.tn',
            role=User.Role.CLIENT,
            status=User.AccountStatus.ACTIVE,
            password='!',
        )
        service = ServiceAccess.publish_service(
            name='Crédit', category='retail', type='credit',
        )
        agency = AgencyAccess.open_agency(
            name='Tunis', address='x', city='Tunis', capacity=5,
        )
        appt = AppointmentAccess.request_appointment(
            client_id=client.pk,
            service_id=service.pk,
            agency_id=agency.pk,
            scheduled_at=timezone.now() + timedelta(days=3),
        )
        payload = {
            'eligible_agent_ids': [a.pk for a in agents],
            'appointment_id': appt.pk,
            'appointment_ref': appt.reference,
            'client_full_name': 'Test Client',
            'service_name': 'Crédit',
            'agency_name': 'Tunis',
            'scheduled_at': '2024-06-01 10:00',
            'reason': '',
        }
        NotifyingEngine.dispatch_to_agents(
            payload=payload,
            channel=Notification.Channel.IN_APP,
        )
        count = Notification.objects.filter(
            event_type=Notification.EventType.APPOINTMENT_REQUESTED,
            channel=Notification.Channel.IN_APP,
            status=Notification.Status.DELIVERED,
        ).count()
        assert count == 3


class TestTemplateRendering:

    def test_render_appointment_assigned_subject(self):
        result = render(
            event_type=Notification.EventType.APPOINTMENT_ASSIGNED,
            format='subject',
            payload={'appointment_ref': 'BNA-2024-00099'},
        )
        assert 'BNA-2024-00099' in result

    def test_render_missing_key_does_not_raise(self):
        result = render(
            event_type=Notification.EventType.APPOINTMENT_ASSIGNED,
            format='body',
            payload={},
        )
        assert isinstance(result, str)
        assert len(result) > 0

    def test_render_unknown_event_type_returns_fallback(self):
        result = render(
            event_type='completely_unknown_event',
            format='body',
            payload={},
        )
        assert '[completely_unknown_event]' in result

    def test_all_event_types_have_templates(self):
        from apps.notifications.templates_registry import TEMPLATES

        for event_type_value, _ in Notification.EventType.choices:
            assert event_type_value in TEMPLATES, (
                f'Missing template for event type: {event_type_value!r}'
            )


class TestAdapterRegistry:

    def test_all_channels_have_adapters(self):
        for channel_value, _ in Notification.Channel.choices:
            assert channel_value in CHANNEL_ADAPTERS, (
                f'No adapter registered for channel: {channel_value!r}'
            )

    def test_all_adapters_implement_send(self):
        for channel, adapter in CHANNEL_ADAPTERS.items():
            assert hasattr(adapter, 'send')
            assert callable(adapter.send)
