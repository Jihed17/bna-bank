import dataclasses
from unittest.mock import patch

import pytest

from core.events import (
    AccountVerifiedEvent,
    AppointmentAssignedEvent,
    AppointmentCancelledEvent,
    AppointmentRequestedEvent,
    ServiceUpdatedEvent,
)
from core.publisher import now_iso, publish


class TestEventSchema:

    def test_appointment_requested_event_is_immutable(self):
        event = AppointmentRequestedEvent(
            occurred_at=now_iso(),
            appointment_id=1,
            appointment_ref='BNA-2024-00001',
            client_id=10,
            client_full_name='Sami Ben Ali',
            service_id=2,
            service_name='Ouverture de compte',
            agency_id=3,
            agency_name='Tunis Centre',
            scheduled_at='2024-06-01T10:00:00+00:00',
            eligible_agent_ids=[5, 6, 7],
        )
        with pytest.raises((dataclasses.FrozenInstanceError, TypeError)):
            event.appointment_id = 99  # type: ignore

    def test_event_type_is_fixed(self):
        event = AppointmentRequestedEvent(occurred_at=now_iso())
        assert event.event_type == 'appointment_requested'

    def test_all_events_have_occurred_at(self):
        for EventClass in [
            AppointmentRequestedEvent,
            AppointmentAssignedEvent,
            AppointmentCancelledEvent,
            ServiceUpdatedEvent,
            AccountVerifiedEvent,
        ]:
            event = EventClass(occurred_at=now_iso())
            assert event.occurred_at is not None

    def test_dataclass_serialises_to_dict(self):
        event = AppointmentRequestedEvent(
            occurred_at=now_iso(),
            appointment_id=42,
            eligible_agent_ids=[1, 2, 3],
        )
        d = dataclasses.asdict(event)
        assert d['appointment_id'] == 42
        assert d['eligible_agent_ids'] == [1, 2, 3]
        assert d['event_type'] == 'appointment_requested'


class TestPublisher:

    def test_publish_sends_correct_task_name(self):
        event = AppointmentRequestedEvent(
            occurred_at=now_iso(),
            appointment_id=1,
        )
        with patch('core.publisher.celery_app.send_task') as mock_send:
            publish(event)

        mock_send.assert_called_once()
        task_name = mock_send.call_args[0][0]
        assert task_name == 'apps.notifications.tasks.handle_appointment_requested'

    def test_publish_passes_payload_as_kwarg(self):
        event = AppointmentAssignedEvent(
            occurred_at=now_iso(),
            appointment_id=7,
            appointment_ref='BNA-2024-00007',
            client_id=3,
            agent_id=5,
        )
        with patch('core.publisher.celery_app.send_task') as mock_send:
            publish(event)

        kwargs = mock_send.call_args[1]['kwargs']
        assert 'payload' in kwargs
        assert kwargs['payload']['appointment_id'] == 7
        assert kwargs['payload']['appointment_ref'] == 'BNA-2024-00007'

    def test_publish_routes_to_notifications_queue(self):
        event = ServiceUpdatedEvent(
            occurred_at=now_iso(),
            service_id=1,
            service_name='Crédit',
            change_type='suspended',
            changed_by_id=99,
        )
        with patch('core.publisher.celery_app.send_task') as mock_send:
            publish(event)

        queue = mock_send.call_args[1]['queue']
        assert queue == 'notifications'


@pytest.mark.django_db
class TestTasksRegistered:
    """
    Verify all expected task names are discoverable by Celery.
    If a task is missing or misnamed, publish() will silently enqueue
    a task that never runs.
    """

    def test_all_event_task_names_are_registered(self):
        from celery import current_app

        expected_tasks = [
            'apps.notifications.tasks.handle_appointment_requested',
            'apps.notifications.tasks.handle_appointment_assigned',
            'apps.notifications.tasks.handle_appointment_cancelled',
            'apps.notifications.tasks.handle_appointment_completed',
            'apps.notifications.tasks.handle_service_updated',
            'apps.notifications.tasks.handle_account_verified',
            'apps.notifications.tasks.handle_password_reset_requested',
        ]

        registered = list(current_app.tasks.keys())
        for task_name in expected_tasks:
            assert task_name in registered, (
                f'Task {task_name!r} not registered. '
                f'Check apps/notifications/tasks.py and INSTALLED_APPS.'
            )
