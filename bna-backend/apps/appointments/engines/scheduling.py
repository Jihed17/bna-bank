from __future__ import annotations

from datetime import date, datetime, time, timedelta
from typing import TYPE_CHECKING

from django.utils import timezone

from apps.appointments.access import AppointmentAccess
from apps.services.access import AgencyAccess, ServiceAccess
from apps.services.models import AgencyService
from core.logging import get_logger

if TYPE_CHECKING:
    pass

logger = get_logger('appointments.scheduling')


class SlotValidationResult:
    """
    Value object returned by SchedulingEngine.validate_slot().
    Carries the validity flag, the human-readable reason on failure,
    and the capacity numbers for the caller to log or display.
    """
    __slots__ = ('is_valid', 'reason', 'current_bookings', 'max_capacity')

    def __init__(
        self,
        *,
        is_valid: bool,
        reason: str = '',
        current_bookings: int = 0,
        max_capacity: int = 0,
    ) -> None:
        self.is_valid = is_valid
        self.reason = reason
        self.current_bookings = current_bookings
        self.max_capacity = max_capacity

    def __bool__(self) -> bool:
        return self.is_valid

    def __repr__(self) -> str:
        return (
            f'SlotValidationResult(valid={self.is_valid}, '
            f'bookings={self.current_bookings}/{self.max_capacity})'
        )


class SchedulingEngine:
    """
    Encapsulates HOW available appointment slots are computed and
    HOW scheduling conflicts are detected.

    Volatile area: slot duration rules, opening hours logic, capacity
    thresholds, blackout days — all change here, nowhere else.

    Called by: AppointmentManager exclusively.
    Calls:     AppointmentAccess, ServiceAccess, AgencyAccess (downward only).
    Never:     publishes events, calls other engines, receives Celery tasks.
    """

    # ── Slot validation ──────────────────────────────────────────────────────

    @staticmethod
    def validate_slot(
        *,
        agency_id: int,
        service_id: int,
        scheduled_at: datetime,
    ) -> SlotValidationResult:
        """
        Determine whether a requested slot is valid.

        Checks (in order):
          1. scheduled_at is in the future
          2. The agency is open (status=OPEN)
          3. The agency offers this service and it is active
          4. The slot falls within the opening hours for this service at this agency
          5. The agency has not reached capacity for this slot

        Returns a SlotValidationResult — never raises.
        AppointmentManager decides what to do with an invalid result.
        """
        now = timezone.now()

        # 1 — Must be at least 1 hour in the future
        if scheduled_at <= now + timedelta(hours=1):
            return SlotValidationResult(
                is_valid=False,
                reason='Le créneau doit être au moins 1 heure dans le futur.',
            )

        # 2 — Agency must be open
        try:
            agency = AgencyAccess.get_agency(agency_id=agency_id)
        except Exception:
            return SlotValidationResult(is_valid=False, reason='Agence introuvable.')

        from apps.services.models import Agency
        if agency.status != Agency.Status.OPEN:
            return SlotValidationResult(
                is_valid=False,
                reason=f"L'agence {agency.name} est actuellement fermée.",
            )

        # 3 — Agency must offer this service (active pivot)
        try:
            agency_service = AgencyService.objects.get(
                agency_id=agency_id,
                service_id=service_id,
                is_active=True,
            )
        except AgencyService.DoesNotExist:
            return SlotValidationResult(
                is_valid=False,
                reason="Ce service n'est pas disponible dans cette agence.",
            )

        # 4 — Slot must be within opening hours
        hours_result = SchedulingEngine._check_opening_hours(
            agency_service=agency_service,
            scheduled_at=scheduled_at,
        )
        if not hours_result.is_valid:
            return hours_result

        # 5 — Capacity check
        active_bookings = AppointmentAccess.get_appointments_in_slot(
            agency_id=agency_id,
            scheduled_at=scheduled_at,
        )
        current = len(active_bookings)
        max_cap = agency.capacity

        if current >= max_cap:
            return SlotValidationResult(
                is_valid=False,
                reason=(
                    f'Ce créneau est complet '
                    f'({current}/{max_cap} rendez-vous).'
                ),
                current_bookings=current,
                max_capacity=max_cap,
            )

        logger.debug(
            'slot_validated',
            extra={
                'agency_id': agency_id,
                'service_id': service_id,
                'scheduled_at': scheduled_at.isoformat(),
                'bookings': f'{current}/{max_cap}',
            },
        )

        return SlotValidationResult(
            is_valid=True,
            current_bookings=current,
            max_capacity=max_cap,
        )

    @staticmethod
    def _check_opening_hours(
        *,
        agency_service: AgencyService,
        scheduled_at: datetime,
    ) -> SlotValidationResult:
        """
        Verify the scheduled_at datetime falls within opening hours
        for the given AgencyService record.

        Returns SlotValidationResult(is_valid=False) if the agency
        service has no hours configured for that weekday (treated as closed).
        """
        day_map = {
            0: ('monday_open', 'monday_close'),
            1: ('tuesday_open', 'tuesday_close'),
            2: ('wednesday_open', 'wednesday_close'),
            3: ('thursday_open', 'thursday_close'),
            4: ('friday_open', 'friday_close'),
            5: ('saturday_open', 'saturday_close'),
        }

        weekday = scheduled_at.weekday()

        if weekday == 6:
            return SlotValidationResult(
                is_valid=False,
                reason="L'agence est fermée le dimanche.",
            )

        open_field, close_field = day_map[weekday]
        open_time = getattr(agency_service, open_field)
        close_time = getattr(agency_service, close_field)

        if open_time is None or close_time is None:
            day_names = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
            return SlotValidationResult(
                is_valid=False,
                reason=f"Ce service n'est pas disponible le {day_names[weekday]}.",
            )

        slot_time = scheduled_at.time()
        if not (open_time <= slot_time < close_time):
            return SlotValidationResult(
                is_valid=False,
                reason=(
                    f"Ce créneau est hors des heures d'ouverture "
                    f'({open_time.strftime("%H:%M")}–{close_time.strftime("%H:%M")}).'
                ),
            )

        return SlotValidationResult(is_valid=True)

    # ── Slot generation ──────────────────────────────────────────────────────

    @staticmethod
    def find_available_slots(
        *,
        agency_id: int,
        service_id: int,
        on_date: date,
        max_results: int = 10,
    ) -> list[datetime]:
        """
        Generate available time slots for a given service at a given agency
        on a specific date.

        Algorithm (volatile — change here only):
          1. Load the service's duration_minutes
          2. Load the AgencyService opening hours for the requested day
          3. Step through the day in duration_minutes increments
          4. For each slot, validate it (capacity + hours)
          5. Return up to max_results valid slots

        Returns an empty list if the agency is closed that day or full.
        Never raises — AppointmentManager handles the empty case.
        """
        try:
            service = ServiceAccess.get_service(service_id=service_id)
        except Exception:
            logger.warning(
                'find_available_slots: service not found',
                extra={'service_id': service_id},
            )
            return []

        try:
            agency_service = AgencyService.objects.get(
                agency_id=agency_id,
                service_id=service_id,
                is_active=True,
            )
        except AgencyService.DoesNotExist:
            return []

        weekday = on_date.weekday()
        day_map = {
            0: ('monday_open', 'monday_close'),
            1: ('tuesday_open', 'tuesday_close'),
            2: ('wednesday_open', 'wednesday_close'),
            3: ('thursday_open', 'thursday_close'),
            4: ('friday_open', 'friday_close'),
            5: ('saturday_open', 'saturday_close'),
        }

        if weekday == 6:
            return []

        open_field, close_field = day_map[weekday]
        open_time = getattr(agency_service, open_field)
        close_time = getattr(agency_service, close_field)

        if open_time is None or close_time is None:
            return []

        step = timedelta(minutes=service.duration_minutes)
        tz = timezone.get_current_timezone()
        cursor = datetime.combine(on_date, open_time).replace(tzinfo=tz)
        day_end = datetime.combine(on_date, close_time).replace(tzinfo=tz)
        available: list[datetime] = []

        while cursor + step <= day_end and len(available) < max_results:
            result = SchedulingEngine.validate_slot(
                agency_id=agency_id,
                service_id=service_id,
                scheduled_at=cursor,
            )
            if result.is_valid:
                available.append(cursor)
            cursor += step

        logger.debug(
            'slots_generated',
            extra={
                'agency_id': agency_id,
                'service_id': service_id,
                'date': on_date.isoformat(),
                'count': len(available),
            },
        )

        return available

    # ── Calendar view ────────────────────────────────────────────────────────

    @staticmethod
    def build_calendar_view(
        *,
        agent_id: int,
        from_dt: datetime,
        to_dt: datetime,
    ) -> dict:
        """
        Build a structured calendar view for an agent's schedule
        within a datetime range.

        Returns a dict keyed by ISO-date string whose values are lists of
        appointment summaries sorted chronologically. Days with no
        appointments are not included.
        """
        appointments = AppointmentAccess.get_agent_schedule(
            agent_id=agent_id,
            from_dt=from_dt,
            to_dt=to_dt,
        )

        calendar: dict[str, list[dict]] = {}

        for appt in appointments:
            day_key = appt.scheduled_at.date().isoformat()
            calendar.setdefault(day_key, []).append({
                'appointment_id': appt.pk,
                'reference': appt.reference,
                'client_name': appt.client.get_full_name(),
                'client_email': appt.client.email,
                'service_name': appt.service.name,
                'agency_name': appt.agency.name,
                'scheduled_at': appt.scheduled_at.isoformat(),
                'duration_minutes': appt.duration_minutes,
                'status': appt.status,
                'reason': appt.reason,
            })

        for day_key in calendar:
            calendar[day_key].sort(key=lambda a: a['scheduled_at'])

        logger.debug(
            'calendar_view_built',
            extra={
                'agent_id': agent_id,
                'from_dt': from_dt.isoformat(),
                'to_dt': to_dt.isoformat(),
                'days': len(calendar),
            },
        )

        return calendar

    # ── Capacity helpers ─────────────────────────────────────────────────────

    @staticmethod
    def get_slot_load(
        *,
        agency_id: int,
        scheduled_at: datetime,
    ) -> tuple[int, int]:
        """
        Return (current_bookings, max_capacity) for a specific slot
        at a specific agency. Called by AppointmentManager to include
        load data in responses without re-running full validation.
        """
        try:
            agency = AgencyAccess.get_agency(agency_id=agency_id)
        except Exception:
            return (0, 0)

        bookings = AppointmentAccess.get_appointments_in_slot(
            agency_id=agency_id,
            scheduled_at=scheduled_at,
        )
        return (len(bookings), agency.capacity)
