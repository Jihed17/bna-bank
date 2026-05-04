"""
Generate demo appointment data so the calendar (month / week / day),
the agent queue, and the client appointment list all look populated.

Run AFTER `manage.py seed` so the demo users / services / agencies / agent
assignments already exist.

  python manage.py seed_appointments

Idempotent: skips dates where the (client, service, slot) tuple already
has a non-cancelled appointment, so re-running just fills gaps.
"""

import random
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.appointments.access import AppointmentAccess
from apps.appointments.models import Appointment
from apps.identity.managers import IdentityManager
from apps.identity.models import User
from apps.services.models import AgentAssignment, Agency, Service


SLOT_HOURS = [9, 10, 11, 13, 14, 15, 16]
SLOT_MINUTES = [0, 30]


# 8 demo clients — keeps the (client, service, slot) uniqueness happy when
# we generate many appointments at the same time slot.
DEMO_CLIENTS = [
    ('client@bna.tn',  'Sami',     'Ben Ali'),
    ('fatma@bna.tn',   'Fatma',    'Khedher'),
    ('mehdi@bna.tn',   'Mehdi',    'Sassi'),
    ('leila@bna.tn',   'Leila',    'Trabelsi'),
    ('amine@bna.tn',   'Amine',    'Gharbi'),
    ('rim@bna.tn',     'Rim',      'Bouchnak'),
    ('khaled@bna.tn',  'Khaled',   'Mejri'),
    ('sirine@bna.tn',  'Sirine',   'Ayadi'),
]


class Command(BaseCommand):
    help = 'Seed a large set of demo appointments across all agencies and agents.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--past', type=int, default=60,
            help='Number of past COMPLETED appointments to create (default 60).',
        )
        parser.add_argument(
            '--future', type=int, default=150,
            help='Number of future PENDING/ASSIGNED/CONFIRMED appointments (default 150).',
        )
        parser.add_argument(
            '--days-back', type=int, default=45,
            help='How many days into the past to spread completed RDV (default 45).',
        )
        parser.add_argument(
            '--days-forward', type=int, default=35,
            help='How many days forward to spread future RDV (default 35).',
        )

    def handle(self, *args, **options):
        from unittest.mock import patch

        agents = list(
            User.objects.filter(role=User.Role.AGENT, agency__isnull=False)
            .select_related('agency')
        )
        if not agents:
            self.stderr.write(self.style.ERROR(
                "No agency-pinned agents found. Run `manage.py seed` first."
            ))
            return

        services = list(Service.objects.filter(is_active=True))
        agencies = list(Agency.objects.filter(status=Agency.Status.OPEN))
        if not services or not agencies:
            self.stderr.write(self.style.ERROR(
                "No services or agencies. Run `manage.py seed` first."
            ))
            return

        # Reproducible spread.
        random.seed(42)

        # ── Demo clients ─────────────────────────────────────────────────
        with patch('apps.identity.managers.publish'):
            clients = self._ensure_clients()

        self.stdout.write(
            f'Seeding demo appointments — {len(agents)} agents across '
            f'{len(agencies)} agencies, {len(services)} services, {len(clients)} clients.'
        )

        # ── Generate ─────────────────────────────────────────────────────
        now = timezone.now().replace(second=0, microsecond=0)
        counts = {
            Appointment.Status.COMPLETED: 0,
            Appointment.Status.CONFIRMED: 0,
            Appointment.Status.ASSIGNED: 0,
            Appointment.Status.PENDING: 0,
        }

        # ── Past — all COMPLETED ─────────────────────────────────────────
        # Try ~4 slots per business day, walking back day by day.
        target_past = options['past']
        days_back = 1
        attempts = 0
        max_back = options['days_back']
        slots_per_day = 4
        while counts[Appointment.Status.COMPLETED] < target_past and days_back < max_back:
            base_day = now - timedelta(days=days_back)
            for _ in range(slots_per_day):
                if counts[Appointment.Status.COMPLETED] >= target_past:
                    break
                slot = self._pick_slot(base_day)
                if slot is None:
                    break
                client = random.choice(clients)
                service = random.choice(services)
                agent = random.choice(agents)
                ok = self._make_appt(
                    client, service, agent.agency, agent, slot,
                    Appointment.Status.COMPLETED,
                )
                if ok:
                    counts[Appointment.Status.COMPLETED] += 1
                attempts += 1
            days_back += 1

        # ── Future — mix of PENDING / ASSIGNED / CONFIRMED ───────────────
        target_future = options['future']
        days_forward = 1
        future_done = 0
        max_forward = options['days_forward']
        slots_per_day = 6
        while future_done < target_future and days_forward < max_forward:
            base_day = now + timedelta(days=days_forward)
            for _ in range(slots_per_day):
                if future_done >= target_future:
                    break
                slot = self._pick_slot(base_day)
                if slot is None:
                    break
                client = random.choice(clients)
                service = random.choice(services)
                agent = random.choice(agents)

                # Distribute statuses: ~30% PENDING (in agent queue),
                # ~35% ASSIGNED (awaiting client confirm),
                # ~35% CONFIRMED (locked on calendar).
                roll = random.random()
                if roll < 0.30:
                    status = Appointment.Status.PENDING
                elif roll < 0.65:
                    status = Appointment.Status.ASSIGNED
                else:
                    status = Appointment.Status.CONFIRMED

                ok = self._make_appt(client, service, agent.agency, agent, slot, status)
                if ok:
                    counts[status] += 1
                    future_done += 1
            days_forward += 1

        self.stdout.write(self.style.SUCCESS('\nSeed complete.'))
        self.stdout.write('Demo appointments created:')
        self.stdout.write(f'  COMPLETED (past) : {counts[Appointment.Status.COMPLETED]}')
        self.stdout.write(f'  CONFIRMED        : {counts[Appointment.Status.CONFIRMED]}')
        self.stdout.write(f'  ASSIGNED         : {counts[Appointment.Status.ASSIGNED]}')
        self.stdout.write(f'  PENDING (queue)  : {counts[Appointment.Status.PENDING]}')
        self.stdout.write('')
        self.stdout.write(
            'Login as any agent (password "agent123") to see their pinned-agency calendar.'
        )

    # ── Helpers ─────────────────────────────────────────────────────────

    def _ensure_clients(self):
        """Make sure all demo clients exist; return them all."""
        clients = []
        for email, fn, ln in DEMO_CLIENTS:
            try:
                u = User.objects.get(email=email)
            except User.DoesNotExist:
                u = IdentityManager.register_guest(
                    email=email, password='client123',
                    first_name=fn, last_name=ln,
                )
            clients.append(u)
        return clients

    def _pick_slot(self, base):
        """Pick a working-day slot anchored on `base`. Returns None if Sunday."""
        if base.weekday() == 6:  # Sunday — agencies closed
            return None
        return base.replace(
            hour=random.choice(SLOT_HOURS),
            minute=random.choice(SLOT_MINUTES),
        )

    def _make_appt(self, client, service, agency, agent, when, target_status):
        """Create an appointment and walk it through to target_status."""
        try:
            appt = AppointmentAccess.request_appointment(
                client_id=client.pk,
                service_id=service.pk,
                agency_id=agency.pk,
                scheduled_at=when,
                reason=f'RDV pour {service.name.lower()}.',
            )
        except Exception:
            # Conflict on (client, service, slot) or capacity — skip silently.
            return False

        if target_status == Appointment.Status.PENDING:
            return True

        assignment = AgentAssignment.objects.filter(
            agent=agent,
            agency_service__service=service,
            agency_service__agency=agency,
            is_active=True,
        ).first()
        if assignment is None:
            return True  # leave as PENDING; nobody assigned

        AppointmentAccess.assign_appointment(
            appointment_id=appt.pk,
            agent_id=agent.pk,
            agent_assignment_id=assignment.pk,
            changed_by_id=agent.pk,
        )

        if target_status == Appointment.Status.ASSIGNED:
            return True

        if target_status == Appointment.Status.CONFIRMED:
            AppointmentAccess.confirm_appointment(
                appointment_id=appt.pk,
                changed_by_id=agent.pk,
            )
            return True

        if target_status == Appointment.Status.COMPLETED:
            AppointmentAccess.complete_appointment(
                appointment_id=appt.pk,
                changed_by_id=agent.pk,
            )
            return True

        return True
