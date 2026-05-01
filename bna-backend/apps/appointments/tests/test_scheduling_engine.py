from datetime import date, datetime, time, timedelta

import pytest
from django.utils import timezone

from apps.appointments.access import AppointmentAccess
from apps.appointments.engines.scheduling import SchedulingEngine
from apps.identity.models import User
from apps.services.access import AgencyAccess, ServiceAccess
from apps.services.models import AgencyService


@pytest.fixture
def service(db):
    return ServiceAccess.publish_service(
        name='Ouverture de compte',
        category='retail',
        type='account',
        duration_minutes=30,
    )


@pytest.fixture
def agency(db):
    return AgencyAccess.open_agency(
        name='Tunis Centre', address='1 avenue', city='Tunis', capacity=2,
    )


@pytest.fixture
def agency_service(db, agency, service):
    """AgencyService with Monday–Saturday 09:00–17:00 (Saturday 13:00)."""
    return AgencyService.objects.create(
        agency=agency,
        service=service,
        is_active=True,
        monday_open=time(9, 0),
        monday_close=time(17, 0),
        tuesday_open=time(9, 0),
        tuesday_close=time(17, 0),
        wednesday_open=time(9, 0),
        wednesday_close=time(17, 0),
        thursday_open=time(9, 0),
        thursday_close=time(17, 0),
        friday_open=time(9, 0),
        friday_close=time(17, 0),
        saturday_open=time(9, 0),
        saturday_close=time(13, 0),
    )


@pytest.fixture
def client_user(db):
    return User.objects.create(
        username='cl@bna.tn',
        email='cl@bna.tn',
        role=User.Role.CLIENT,
        status=User.AccountStatus.ACTIVE,
        password='!',
    )


def _next_weekday(weekday: int) -> date:
    """Return the next occurrence of a given weekday (0=Mon … 6=Sun)."""
    today = timezone.now().date()
    days_ahead = (weekday - today.weekday()) % 7 or 7
    return today + timedelta(days=days_ahead)


@pytest.mark.django_db
class TestValidateSlot:

    def test_valid_slot_returns_true(self, agency_service, agency, service):
        next_monday = _next_weekday(0)
        tz = timezone.get_current_timezone()
        slot = datetime.combine(next_monday, time(10, 0)).replace(tzinfo=tz)
        result = SchedulingEngine.validate_slot(
            agency_id=agency.pk,
            service_id=service.pk,
            scheduled_at=slot,
        )
        assert result.is_valid, result.reason

    def test_slot_in_past_returns_invalid(self, agency_service, agency, service):
        past = timezone.now() - timedelta(hours=2)
        result = SchedulingEngine.validate_slot(
            agency_id=agency.pk, service_id=service.pk, scheduled_at=past,
        )
        assert not result.is_valid
        assert 'futur' in result.reason

    def test_slot_on_sunday_returns_invalid(self, agency_service, agency, service):
        next_sunday = _next_weekday(6)
        tz = timezone.get_current_timezone()
        slot = datetime.combine(next_sunday, time(10, 0)).replace(tzinfo=tz)
        result = SchedulingEngine.validate_slot(
            agency_id=agency.pk, service_id=service.pk, scheduled_at=slot,
        )
        assert not result.is_valid
        assert 'dimanche' in result.reason.lower()

    def test_slot_outside_opening_hours_returns_invalid(
        self, agency_service, agency, service,
    ):
        next_monday = _next_weekday(0)
        tz = timezone.get_current_timezone()
        slot = datetime.combine(next_monday, time(8, 0)).replace(tzinfo=tz)
        result = SchedulingEngine.validate_slot(
            agency_id=agency.pk, service_id=service.pk, scheduled_at=slot,
        )
        assert not result.is_valid

    def test_slot_at_capacity_returns_invalid(
        self, agency_service, agency, service, client_user,
    ):
        next_monday = _next_weekday(0)
        tz = timezone.get_current_timezone()
        slot = datetime.combine(next_monday, time(10, 0)).replace(tzinfo=tz)

        for i in range(2):
            user = User.objects.create(
                username=f'c{i}@bna.tn',
                email=f'c{i}@bna.tn',
                role=User.Role.CLIENT,
                status=User.AccountStatus.ACTIVE,
                password='!',
            )
            AppointmentAccess.request_appointment(
                client_id=user.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=slot,
            )

        result = SchedulingEngine.validate_slot(
            agency_id=agency.pk, service_id=service.pk, scheduled_at=slot,
        )
        assert not result.is_valid
        assert result.current_bookings == 2
        assert result.max_capacity == 2


@pytest.mark.django_db
class TestFindAvailableSlots:

    def test_returns_slots_within_opening_hours(
        self, agency_service, agency, service,
    ):
        next_monday = _next_weekday(0)
        slots = SchedulingEngine.find_available_slots(
            agency_id=agency.pk,
            service_id=service.pk,
            on_date=next_monday,
        )
        assert len(slots) > 0
        for slot in slots:
            assert slot.time() >= time(9, 0)
            assert slot.time() < time(17, 0)

    def test_returns_empty_for_sunday(self, agency_service, agency, service):
        next_sunday = _next_weekday(6)
        slots = SchedulingEngine.find_available_slots(
            agency_id=agency.pk,
            service_id=service.pk,
            on_date=next_sunday,
        )
        assert slots == []

    def test_max_results_respected(self, agency_service, agency, service):
        next_monday = _next_weekday(0)
        slots = SchedulingEngine.find_available_slots(
            agency_id=agency.pk,
            service_id=service.pk,
            on_date=next_monday,
            max_results=3,
        )
        assert len(slots) <= 3

    def test_slots_are_duration_apart(self, agency_service, agency, service):
        next_monday = _next_weekday(0)
        slots = SchedulingEngine.find_available_slots(
            agency_id=agency.pk,
            service_id=service.pk,
            on_date=next_monday,
            max_results=5,
        )
        if len(slots) >= 2:
            diff = (slots[1] - slots[0]).seconds // 60
            assert diff == service.duration_minutes


@pytest.mark.django_db
class TestBuildCalendarView:

    def test_returns_dict_keyed_by_date(
        self, agency_service, agency, service, client_user,
    ):
        next_monday = _next_weekday(0)
        tz = timezone.get_current_timezone()
        slot = datetime.combine(next_monday, time(10, 0)).replace(tzinfo=tz)

        AppointmentAccess.request_appointment(
            client_id=client_user.pk,
            service_id=service.pk,
            agency_id=agency.pk,
            scheduled_at=slot,
        )

        from_dt = datetime.combine(next_monday, time(0, 0)).replace(tzinfo=tz)
        to_dt = datetime.combine(next_monday, time(23, 59)).replace(tzinfo=tz)

        agent = User.objects.create(
            username='ag@bna.tn',
            email='ag@bna.tn',
            role=User.Role.AGENT,
            status=User.AccountStatus.ACTIVE,
            password='!',
        )
        appt = AppointmentAccess.get_appointments_in_slot(
            agency_id=agency.pk, scheduled_at=slot,
        )[0]
        AppointmentAccess.assign_appointment(
            appointment_id=appt.pk,
            agent_id=agent.pk,
            agent_assignment_id=None,
        )

        calendar = SchedulingEngine.build_calendar_view(
            agent_id=agent.pk,
            from_dt=from_dt,
            to_dt=to_dt,
        )

        assert next_monday.isoformat() in calendar
        day_entries = calendar[next_monday.isoformat()]
        assert len(day_entries) == 1
        assert day_entries[0]['reference'] == appt.reference
        assert 'client_name' in day_entries[0]
        assert 'service_name' in day_entries[0]

    def test_empty_range_returns_empty_dict(self, agency, service):
        tz = timezone.get_current_timezone()
        from_dt = datetime.combine(_next_weekday(0), time(0, 0)).replace(tzinfo=tz)
        to_dt = datetime.combine(_next_weekday(0), time(23, 59)).replace(tzinfo=tz)
        calendar = SchedulingEngine.build_calendar_view(
            agent_id=99999,
            from_dt=from_dt,
            to_dt=to_dt,
        )
        assert calendar == {}
