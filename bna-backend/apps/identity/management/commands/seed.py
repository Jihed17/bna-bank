from unittest.mock import patch

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Seed the database with demo data for development.'

    def handle(self, *args, **options):
        self.stdout.write('Seeding BNA demo data...')

        with patch('apps.identity.managers.publish'), \
             patch('apps.services.managers.publish'):

            from apps.identity.managers import IdentityManager
            from apps.identity.models import User
            from apps.services.managers import ServiceManager

            # ── Users ──────────────────────────────────────────────────────
            client = IdentityManager.register_guest(
                email='client@bna.tn',
                password='client123',
                first_name='Sami',
                last_name='Ben Ali',
            )
            self.stdout.write(f'  Client:  {client.email}')

            admin = User.objects.create(
                username='admin@bna.tn',
                email='admin@bna.tn',
                first_name='Rania',
                last_name='Mansour',
                role=User.Role.ADMIN,
                status=User.AccountStatus.ACTIVE,
                password='!',
            )
            admin.set_password('admin123')
            admin.save(update_fields=['password'])
            self.stdout.write(f'  Admin:   {admin.email}')

            agent = User.objects.create(
                username='agent@bna.tn',
                email='agent@bna.tn',
                first_name='Karim',
                last_name='Zribi',
                role=User.Role.AGENT,
                status=User.AccountStatus.ACTIVE,
                password='!',
            )
            agent.set_password('agent123')
            agent.save(update_fields=['password'])
            self.stdout.write(f'  Agent:   {agent.email}')

            agent2 = User.objects.create(
                username='agent2@bna.tn',
                email='agent2@bna.tn',
                first_name='Nadia',
                last_name='Bouazizi',
                role=User.Role.AGENT,
                status=User.AccountStatus.ACTIVE,
                password='!',
            )
            agent2.set_password('agent123')
            agent2.save(update_fields=['password'])
            self.stdout.write(f'  Agent:   {agent2.email}')

            # ── Services ───────────────────────────────────────────────────
            s1 = ServiceManager.publish_service(
                name='Ouverture de compte courant',
                category='retail', type='account',
                duration_minutes=30, admin_id=admin.pk,
            )
            s2 = ServiceManager.publish_service(
                name='Demande de crédit immobilier',
                category='retail', type='credit',
                duration_minutes=60, admin_id=admin.pk,
            )
            s3 = ServiceManager.publish_service(
                name='Gestion de carte bancaire',
                category='retail', type='card',
                duration_minutes=20, admin_id=admin.pk,
            )
            self.stdout.write(f'  Services: {s1.name}, {s2.name}, {s3.name}')

            # ── Agencies ───────────────────────────────────────────────────
            a1 = ServiceManager.open_agency(
                name='BNA Tunis Centre',
                address='1 avenue Habib Bourguiba',
                city='Tunis',
                postal_code='1000',
                capacity=3,
                admin_id=admin.pk,
            )
            a2 = ServiceManager.open_agency(
                name='BNA Sfax',
                address='2 rue Mongi Slim',
                city='Sfax',
                postal_code='3000',
                capacity=2,
                admin_id=admin.pk,
            )
            self.stdout.write(f'  Agencies: {a1.name}, {a2.name}')

            # ── Agent assignments + hours ──────────────────────────────────
            # Each agent is pinned to one agency: agent → a1, agent2 → a2.
            from datetime import time
            schedule = {
                'monday_open': time(9, 0),
                'monday_close': time(17, 0),
                'tuesday_open': time(9, 0),
                'tuesday_close': time(17, 0),
                'wednesday_open': time(9, 0),
                'wednesday_close': time(17, 0),
                'thursday_open': time(9, 0),
                'thursday_close': time(17, 0),
                'friday_open': time(9, 0),
                'friday_close': time(15, 0),
                'saturday_open': time(9, 0),
                'saturday_close': time(12, 0),
            }
            for service in [s1, s2, s3]:
                for ag, agency in [(agent, a1), (agent2, a2)]:
                    try:
                        ServiceManager.assign_agent_to_service(
                            agent_id=ag.pk,
                            service_id=service.pk,
                            agency_id=agency.pk,
                            admin_id=admin.pk,
                        )
                        ServiceManager.configure_service_hours(
                            service_id=service.pk,
                            agency_id=agency.pk,
                            schedule=schedule,
                            admin_id=admin.pk,
                        )
                    except Exception:
                        pass

            self.stdout.write(self.style.SUCCESS('\nSeed complete.'))
            self.stdout.write('\nDemo accounts:')
            self.stdout.write('  client@bna.tn   / client123')
            self.stdout.write('  agent@bna.tn    / agent123  (BNA Tunis Centre)')
            self.stdout.write('  agent2@bna.tn   / agent123  (BNA Sfax)')
            self.stdout.write('  admin@bna.tn    / admin123')
