"""
Generates demo appointment data for the seeded agent so the calendar
views (month / week / day) show realistic content.

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


class Command(BaseCommand):
    help = 'Seed demo appointment data for the demo agent.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--past', type=int, default=10,
            help='Number of past COMPLETED appointments to create (default 10).',
        )
        parser.add_argument(
            '--future', type=int, default=30,
            help='Number of future appointments to create across PENDING/ASSIGNED/CONFIRMED (default 30).',
        )

    def handle(self, *args, **options):
        from unittest.mock import patch

        agents = list(
            User.objects.filter(role=User.Role.AGENT, agency__isnull=False)
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
            'Seeding demo appointments across {} agent(s): {}'.format(
                len(agents),
                ', '.join(a.email for a in agents),
            )
        )

        # ── Generate ─────────────────────────────────────────────────────
        now = timezone.now().replace(second=0, microsecond=0)
        counts = {
            Appointment.Status.COMPLETED: 0,
            Appointment.Status.CONFIRMED: 0,
            Appointment.Status.ASSIGNED: 0,
            Appointment.Status.PENDING: 0,
        }

        # Past — all COMPLETED.
        past_attempted = 0
        days_back = 1
        while counts[Appointment.Status.COMPLETED] < options['past'] and days_back < 30:
            slot = self._pick_slot(now - timedelta(days=days_back))
            if slot is None:
                days_back += 1
                continue
            client = random.choice(clients)
            service = random.choice(services)
            agent = random.choice(agents)
            agency = agent.agency
            ok = self._make_appt(
                client, service, agency, agent, slot,
                Appointment.Status.COMPLETED,
            )
            if ok:
                counts[Appointment.Status.COMPLETED] += 1
            past_attempted += 1
            days_back += 1 if past_attempted % 2 == 0 else 0

        # Future — mix of statuses.
        future_target = options['future']
        days_forward = 1
        future_attempted = 0
        future_done = 0
        while future_done < future_target and days_forward < 35:
            for _ in range(2):  # try up to 2 slots per day
                if future_done >= future_target:
                    break
                slot = self._pick_slot(now + timedelta(days=days_forward))
                if slot is None:
                    break
                client = random.choice(clients)
                service = random.choice(services)
                agent = random.choice(agents)
                agency = agent.agency

                # Distribute statuses: ~30% PENDING (in queue, not on cal),
                # ~35% ASSIGNED, ~35% CONFIRMED.
                roll = random.random()
                if roll < 0.30:
                    status = Appointment.Status.PENDING
                elif roll < 0.65:
                    status = Appointment.Status.ASSIGNED
                else:
                    status = Appointment.Status.CONFIRMED

                ok = self._make_appt(client, service, agency, agent, slot, status)
                if ok:
                    counts[status] += 1
                    future_done += 1
                future_attempted += 1
            days_forward += 1

        self.stdout.write(self.style.SUCCESS('\nSeed complete.'))
        self.stdout.write('Demo appointments created:')
        self.stdout.write(f'  COMPLETED (past) : {counts[Appointment.Status.COMPLETED]}')
        self.stdout.write(f'  CONFIRMED        : {counts[Appointment.Status.CONFIRMED]}')
        self.stdout.write(f'  ASSIGNED         : {counts[Appointment.Status.ASSIGNED]}')
        self.stdout.write(f'  PENDING (queue)  : {counts[Appointment.Status.PENDING]}')
        self.stdout.write('')
        self.stdout.write('Login as agent@bna.tn or agent2@bna.tn (password agent123) to see them on the calendar.')

    # ── Helpers ─────────────────────────────────────────────────────────

    def _ensure_clients(self):
        """Make sure 4 demo clients exist; return them all."""
        targets = [
            ('client@bna.tn', 'Sami', 'Ben Ali', 'client123'),
            ('fatma@bna.tn', 'Fatma', 'Khedher', 'client123'),
            ('mehdi@bna.tn', 'Mehdi', 'Sassi', 'client123'),
            ('leila@bna.tn', 'Leila', 'Trabelsi', 'client123'),
        ]
        clients = []
        for email, fn, ln, pw in targets:
            try:
                u = User.objects.get(email=email)
            except User.DoesNotExist:
                u = IdentityManager.register_guest(
                    email=email, password=pw,
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
            # Conflict on (client, service, slot) — skip silently.
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
