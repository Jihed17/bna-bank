from datetime import date, time, timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from apps.appointments.models import Appointment
from apps.identity.models import User
from apps.services.access import AgencyAccess, ServiceAccess
from apps.services.models import AgencyService, AgentAssignment


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
def agent_user(db):
    return User.objects.create(
        username='ag@bna.tn',
        email='ag@bna.tn',
        role=User.Role.AGENT,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


@pytest.fixture
def admin_user(db):
    return User.objects.create(
        username='adm@bna.tn',
        email='adm@bna.tn',
        role=User.Role.ADMIN,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


@pytest.fixture
def client_api(api, client_user):
    api.credentials(HTTP_AUTHORIZATION=f'Bearer {make_token(client_user)}')
    return api


@pytest.fixture
def agent_api(api, agent_user):
    api.credentials(HTTP_AUTHORIZATION=f'Bearer {make_token(agent_user)}')
    return api


@pytest.fixture
def admin_api(api, admin_user):
    api.credentials(HTTP_AUTHORIZATION=f'Bearer {make_token(admin_user)}')
    return api


@pytest.fixture
def service(db):
    return ServiceAccess.publish_service(
        name='Crédit', category='retail', type='credit', duration_minutes=30,
    )


@pytest.fixture
def agency(db):
    return AgencyAccess.open_agency(
        name='Tunis', address='1 av', city='Tunis', capacity=5,
    )


@pytest.fixture
def agency_service(db, agency, service):
    return AgencyService.objects.create(
        agency=agency, service=service, is_active=True,
        monday_open=time(9, 0), monday_close=time(17, 0),
        tuesday_open=time(9, 0), tuesday_close=time(17, 0),
        wednesday_open=time(9, 0), wednesday_close=time(17, 0),
        thursday_open=time(9, 0), thursday_close=time(17, 0),
        friday_open=time(9, 0), friday_close=time(17, 0),
    )


@pytest.fixture
def assignment(db, agent_user, agency_service):
    return AgentAssignment.objects.create(
        agent=agent_user, agency_service=agency_service, is_active=True,
    )


@pytest.fixture
def future_slot():
    now = timezone.now()
    candidate = now + timedelta(days=5)
    while candidate.weekday() >= 5:  # skip Saturday (5) and Sunday (6)
        candidate += timedelta(days=1)
    return candidate.replace(hour=10, minute=0, second=0, microsecond=0)


@pytest.mark.django_db
class TestRequestAppointment:

    def test_client_requests_appointment(
        self, client_api, service, agency, agency_service, assignment, future_slot,
    ):
        with patch('apps.appointments.managers.publish'):
            response = client_api.post('/api/appointments/', {
                'service_id': service.pk,
                'agency_id': agency.pk,
                'scheduled_at': future_slot.isoformat(),
                'reason': "Besoin d'un crédit.",
            }, format='json')

        assert response.status_code == 201
        data = response.json()['data']
        assert data['status'] == Appointment.Status.PENDING
        assert data['reference'].startswith('BNA-')

    def test_guest_cannot_request_appointment(
        self, api, service, agency, agency_service, future_slot, db,
    ):
        guest = User.objects.create(
            username='g@bna.tn',
            email='g@bna.tn',
            role=User.Role.GUEST,
            status=User.AccountStatus.PENDING,
            password='!',
        )
        api.credentials(HTTP_AUTHORIZATION=f'Bearer {make_token(guest)}')
        with patch('apps.appointments.managers.publish'):
            response = api.post('/api/appointments/', {
                'service_id': service.pk,
                'agency_id': agency.pk,
                'scheduled_at': future_slot.isoformat(),
            }, format='json')
        assert response.status_code in (403, 400)

    def test_past_slot_returns_400(
        self, client_api, service, agency, agency_service, assignment,
    ):
        past = (timezone.now() - timedelta(hours=3)).isoformat()
        response = client_api.post('/api/appointments/', {
            'service_id': service.pk,
            'agency_id': agency.pk,
            'scheduled_at': past,
        }, format='json')
        assert response.status_code == 400


@pytest.mark.django_db
class TestAppointmentLifecycle:

    @pytest.fixture
    def pending_appt(
        self, client_user, service, agency, agency_service, assignment, future_slot,
    ):
        with patch('apps.appointments.managers.publish'):
            from apps.appointments.managers import AppointmentManager
            return AppointmentManager.request_appointment(
                client_id=client_user.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=future_slot,
            )

    def test_agent_accepts_appointment(self, agent_api, pending_appt, assignment):
        with patch('apps.appointments.managers.publish'):
            response = agent_api.post(
                f'/api/appointments/{pending_appt.pk}/accept/',
            )
        assert response.status_code == 200
        assert response.json()['data']['status'] == Appointment.Status.ASSIGNED

    def test_client_cancels_own_appointment(self, client_api, pending_appt):
        with patch('apps.appointments.managers.publish'):
            response = client_api.post(
                f'/api/appointments/{pending_appt.pk}/cancel/',
                {'reason': 'Changement de plans.'},
                format='json',
            )
        assert response.status_code == 200
        assert response.json()['data']['status'] == Appointment.Status.CANCELLED

    def test_full_lifecycle(
        self, client_api, agent_api, pending_appt, assignment, agent_user,
    ):
        """PENDING → ASSIGNED → CONFIRMED → COMPLETED"""
        with patch('apps.appointments.managers.publish'):
            r = agent_api.post(f'/api/appointments/{pending_appt.pk}/accept/')
            assert r.status_code == 200

            r = agent_api.post(f'/api/appointments/{pending_appt.pk}/confirm/')
            assert r.status_code == 200

            r = agent_api.post(f'/api/appointments/{pending_appt.pk}/complete/')
            assert r.status_code == 200
            assert r.json()['data']['status'] == Appointment.Status.COMPLETED

    def test_client_cannot_accept(self, client_api, pending_appt):
        response = client_api.post(
            f'/api/appointments/{pending_appt.pk}/accept/',
        )
        assert response.status_code == 403

    def test_get_appointment_detail(self, client_api, pending_appt):
        response = client_api.get(f'/api/appointments/{pending_appt.pk}/')
        assert response.status_code == 200
        assert response.json()['data']['id'] == pending_appt.pk


@pytest.mark.django_db
class TestQueryEndpoints:

    def test_available_slots_public(self, api, agency_service, service, agency):
        next_monday = date.today() + timedelta(days=(7 - date.today().weekday()))
        response = api.get('/api/appointments/slots/', {
            'service_id': service.pk,
            'agency_id': agency.pk,
            'date': next_monday.isoformat(),
        })
        assert response.status_code == 200
        assert isinstance(response.json()['data'], list)

    def test_agent_views_own_schedule(self, agent_api):
        response = agent_api.get('/api/appointments/schedule/')
        assert response.status_code == 200
        assert isinstance(response.json()['data'], dict)

    def test_client_cannot_view_schedule(self, client_api):
        response = client_api.get('/api/appointments/schedule/')
        assert response.status_code == 403

    def test_agent_views_pending_queue(self, agent_api, service, agency):
        response = agent_api.get('/api/appointments/pending/', {
            'service_id': service.pk,
            'agency_id': agency.pk,
        })
        assert response.status_code == 200

    def test_client_cannot_view_pending_queue(self, client_api, service, agency):
        response = client_api.get('/api/appointments/pending/', {
            'service_id': service.pk,
            'agency_id': agency.pk,
        })
        assert response.status_code == 403
