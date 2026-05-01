import pytest
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.identity.models import User
from apps.notifications.access import NotificationAccess
from apps.notifications.models import Notification


def make_token(user):
    refresh = RefreshToken.for_user(user)
    refresh['role'] = user.role
    return str(refresh.access_token)


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def client_user(db):
    return User.objects.create(
        username='cl@bna.tn',
        email='cl@bna.tn',
        role=User.Role.CLIENT,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


@pytest.fixture
def other_user(db):
    return User.objects.create(
        username='other@bna.tn',
        email='other@bna.tn',
        role=User.Role.CLIENT,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


@pytest.fixture
def auth_api(api, client_user):
    api.credentials(HTTP_AUTHORIZATION=f'Bearer {make_token(client_user)}')
    return api


@pytest.fixture
def notification(db, client_user):
    return NotificationAccess.enqueue_notification(
        recipient_id=client_user.pk,
        channel=Notification.Channel.IN_APP,
        event_type=Notification.EventType.APPOINTMENT_ASSIGNED,
        payload={
            'appointment_ref': 'BNA-2024-00001',
            'service_name': 'Crédit',
            'scheduled_at': '2024-06-01 10:00',
        },
    )


@pytest.mark.django_db
class TestNotificationListView:

    def test_returns_own_notifications(self, auth_api, notification):
        response = auth_api.get('/api/notifications/')
        assert response.status_code == 200
        data = response.json()['data']
        assert isinstance(data, list)
        ids = [n['id'] for n in data]
        assert notification.pk in ids

    def test_unauthenticated_returns_401(self, api):
        response = api.get('/api/notifications/')
        assert response.status_code == 401

    def test_limit_param_respected(self, auth_api, client_user):
        for _ in range(10):
            NotificationAccess.enqueue_notification(
                recipient_id=client_user.pk,
                channel=Notification.Channel.IN_APP,
                event_type=Notification.EventType.APPOINTMENT_REQUESTED,
                payload={},
            )
        response = auth_api.get('/api/notifications/?limit=3')
        assert response.status_code == 200
        assert len(response.json()['data']) <= 3

    def test_limit_capped_at_50(self, auth_api):
        response = auth_api.get('/api/notifications/?limit=200')
        assert response.status_code == 200

    def test_filter_by_event_type(self, auth_api, client_user):
        NotificationAccess.enqueue_notification(
            recipient_id=client_user.pk,
            channel=Notification.Channel.IN_APP,
            event_type=Notification.EventType.SERVICE_UPDATED,
            payload={},
        )
        response = auth_api.get(
            '/api/notifications/?event_type=service_updated',
        )
        assert response.status_code == 200
        for n in response.json()['data']:
            assert n['event_type'] == Notification.EventType.SERVICE_UPDATED

    def test_does_not_return_other_users_notifications(
        self, auth_api, other_user,
    ):
        other_notif = NotificationAccess.enqueue_notification(
            recipient_id=other_user.pk,
            channel=Notification.Channel.IN_APP,
            event_type=Notification.EventType.APPOINTMENT_CANCELLED,
            payload={},
        )
        response = auth_api.get('/api/notifications/')
        ids = [n['id'] for n in response.json()['data']]
        assert other_notif.pk not in ids


@pytest.mark.django_db
class TestMarkReadView:

    def test_mark_notification_as_read(self, auth_api, notification):
        response = auth_api.post(
            f'/api/notifications/{notification.pk}/read/',
        )
        assert response.status_code == 204

        notification.refresh_from_db()
        assert notification.status == Notification.Status.DELIVERED
        assert notification.delivered_at is not None

    def test_cannot_mark_others_notification_as_read(
        self, auth_api, other_user,
    ):
        other_notif = NotificationAccess.enqueue_notification(
            recipient_id=other_user.pk,
            channel=Notification.Channel.IN_APP,
            event_type=Notification.EventType.APPOINTMENT_REQUESTED,
            payload={},
        )
        response = auth_api.post(
            f'/api/notifications/{other_notif.pk}/read/',
        )
        assert response.status_code == 403

    def test_mark_nonexistent_notification_returns_404(self, auth_api):
        response = auth_api.post('/api/notifications/999999/read/')
        assert response.status_code == 404


@pytest.mark.django_db
class TestUnreadCountView:

    def test_returns_unread_count(self, auth_api, client_user):
        for _ in range(3):
            NotificationAccess.enqueue_notification(
                recipient_id=client_user.pk,
                channel=Notification.Channel.IN_APP,
                event_type=Notification.EventType.APPOINTMENT_ASSIGNED,
                payload={},
            )
        response = auth_api.get('/api/notifications/unread-count/')
        assert response.status_code == 200
        assert response.json()['data']['unread_count'] >= 3

    def test_count_decreases_after_read(self, auth_api, notification):
        before = auth_api.get('/api/notifications/unread-count/').json()['data']['unread_count']
        auth_api.post(f'/api/notifications/{notification.pk}/read/')
        after = auth_api.get('/api/notifications/unread-count/').json()['data']['unread_count']
        assert after < before
