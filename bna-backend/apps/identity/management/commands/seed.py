"""
Seed the database with rich demo data:

  - 5 services
  - 10 agencies (6 in Tunis, 4 in Sfax) with realistic addresses + GPS
  - 1 agent per agency, each pinned to their agency (10 agents)
  - 1 admin, 4 demo clients (clients are also created later by
    seed_appointments — kept here for completeness)

Idempotent: re-running won't crash if rows already exist.
"""
from datetime import time
from unittest.mock import patch

from django.core.management.base import BaseCommand


# ── Reference data ──────────────────────────────────────────────────────────

SERVICES = [
    # ── Particuliers (retail) ───────────────────────────────────────────────
    dict(
        name='Ouverture de compte courant',
        description='Création d’un compte courant ou compte épargne avec carte associée.',
        category='retail', type='account', duration_minutes=30, icon='💳', order=1,
    ),
    dict(
        name='Demande de crédit immobilier',
        description='Étude de dossier pour un crédit logement ou achat de bien.',
        category='retail', type='credit', duration_minutes=60, icon='🏠', order=2,
    ),
    dict(
        name='Gestion de carte bancaire',
        description='Renouvellement, opposition, ou changement de plafond de carte.',
        category='retail', type='card', duration_minutes=20, icon='💼', order=3,
    ),
    dict(
        name='Conseil épargne et placement',
        description='Rendez-vous avec un conseiller pour optimiser vos placements.',
        category='retail', type='advisory', duration_minutes=45, icon='📈', order=4,
    ),
    dict(
        name='Virement international',
        description='Mise en place ou suivi d’un virement à l’étranger (SWIFT).',
        category='retail', type='transfer', duration_minutes=25, icon='🌍', order=5,
    ),

    # ── Entreprises (corporate) ─────────────────────────────────────────────
    dict(
        name='Ouverture de compte professionnel',
        description='Création d’un compte pour société, profession libérale ou auto-entrepreneur.',
        category='corporate', type='account', duration_minutes=45, icon='🏢', order=10,
    ),
    dict(
        name='Crédit professionnel et leasing',
        description='Financement d’équipement, fonds de roulement ou contrat de leasing.',
        category='corporate', type='credit', duration_minutes=60, icon='📊', order=11,
    ),
    dict(
        name='Cash management et flux de trésorerie',
        description='Optimisation des encaissements, décaissements et lignes de trésorerie.',
        category='corporate', type='advisory', duration_minutes=45, icon='💰', order=12,
    ),
    dict(
        name='Crédit documentaire et commerce extérieur',
        description='Mise en place de crédits documentaires, garanties et opérations import / export.',
        category='corporate', type='other', duration_minutes=50, icon='📦', order=13,
    ),

    # ── Investissement (investment) ─────────────────────────────────────────
    dict(
        name='Conseil placement boursier',
        description='Rendez-vous avec un conseiller en investissement pour stratégie d’allocation.',
        category='investment', type='advisory', duration_minutes=45, icon='📈', order=20,
    ),
    dict(
        name='Souscription OPCVM et fonds dédiés',
        description='Souscription, arbitrage ou rachat de parts de fonds communs de placement.',
        category='investment', type='other', duration_minutes=30, icon='🪙', order=21,
    ),
    dict(
        name='Étude patrimoniale et succession',
        description='Bilan patrimonial complet et préparation transmission de patrimoine.',
        category='investment', type='advisory', duration_minutes=60, icon='🧮', order=22,
    ),

    # ── Assurance (insurance) ───────────────────────────────────────────────
    dict(
        name='Assurance vie et épargne retraite',
        description='Souscription, modification ou rachat de contrat d’assurance vie.',
        category='insurance', type='advisory', duration_minutes=40, icon='🛡️', order=30,
    ),
    dict(
        name='Assurance auto et habitation',
        description='Devis et souscription multirisque auto, habitation ou multi-risques.',
        category='insurance', type='other', duration_minutes=30, icon='🚗', order=31,
    ),
    dict(
        name='Prévoyance santé et hospitalisation',
        description='Conseil et souscription de couverture santé, prévoyance décès / invalidité.',
        category='insurance', type='advisory', duration_minutes=35, icon='🏥', order=32,
    ),

    # ── Digital & Technologie (digital) ─────────────────────────────────────
    dict(
        name='Activation BNA Mobile et e-banking',
        description='Première activation, récupération d’accès ou démonstration de l’app mobile.',
        category='digital', type='other', duration_minutes=20, icon='📱', order=40,
    ),
    dict(
        name='Carte virtuelle et paiements en ligne',
        description='Émission de carte virtuelle, plafonds e-commerce et 3-D Secure.',
        category='digital', type='card', duration_minutes=20, icon='💻', order=41,
    ),
    dict(
        name='Diagnostic sécurité du compte en ligne',
        description='Audit des accès, des appareils connectés et activation 2FA.',
        category='digital', type='advisory', duration_minutes=25, icon='🔐', order=42,
    ),
]


AGENCIES = [
    # ── Grand Tunis (6) ─────────────────────────────────────────────────────
    dict(
        name='BNA Tunis Centre',
        address='1 avenue Habib Bourguiba',
        city='Tunis', postal_code='1000',
        phone='+216 71 123 456', email='tunis.centre@bna.tn',
        latitude=36.7997, longitude=10.1791, capacity=4,
    ),
    dict(
        name='BNA La Marsa',
        address='15 avenue de la République',
        city='La Marsa', postal_code='2070',
        phone='+216 71 727 100', email='lamarsa@bna.tn',
        latitude=36.8783, longitude=10.3247, capacity=3,
    ),
    dict(
        name='BNA Les Berges du Lac',
        address='Rue du Lac de Constance, immeuble Carthage',
        city='Tunis', postal_code='1053',
        phone='+216 71 962 200', email='lac@bna.tn',
        latitude=36.8345, longitude=10.2380, capacity=3,
    ),
    dict(
        name='BNA El Menzah',
        address='Avenue Mohamed V, El Menzah 6',
        city='Tunis', postal_code='1004',
        phone='+216 71 230 410', email='menzah@bna.tn',
        latitude=36.8421, longitude=10.1612, capacity=3,
    ),
    dict(
        name='BNA Bardo',
        address='Avenue de la Ligue Arabe',
        city='Le Bardo', postal_code='2000',
        phone='+216 71 588 320', email='bardo@bna.tn',
        latitude=36.8094, longitude=10.1407, capacity=2,
    ),
    dict(
        name='BNA Mégrine',
        address='Route de Radès, zone industrielle',
        city='Mégrine', postal_code='2033',
        phone='+216 71 432 770', email='megrine@bna.tn',
        latitude=36.7585, longitude=10.2358, capacity=2,
    ),
    # ── Grand Sfax (4) ──────────────────────────────────────────────────────
    dict(
        name='BNA Sfax Centre',
        address='Rue Habib Maazoun, immeuble Belhaj',
        city='Sfax', postal_code='3000',
        phone='+216 74 220 110', email='sfax.centre@bna.tn',
        latitude=34.7407, longitude=10.7600, capacity=4,
    ),
    dict(
        name='BNA Sfax Sakiet Ezzit',
        address='Route de Tunis km 7',
        city='Sakiet Ezzit', postal_code='3021',
        phone='+216 74 802 540', email='sakiet@bna.tn',
        latitude=34.8090, longitude=10.7416, capacity=2,
    ),
    dict(
        name='BNA Sfax Route de Tunis',
        address='Route de Tunis km 3, face au tribunal',
        city='Sfax', postal_code='3027',
        phone='+216 74 401 990', email='sfax.tunis@bna.tn',
        latitude=34.7651, longitude=10.7468, capacity=2,
    ),
    dict(
        name='BNA Sfax El Ain',
        address='Avenue de la Liberté, El Ain',
        city='Sfax', postal_code='3041',
        phone='+216 74 285 060', email='elain@bna.tn',
        latitude=34.7222, longitude=10.6981, capacity=2,
    ),
]


# (email, first_name, last_name, agency index in AGENCIES)
AGENTS = [
    ('agent@bna.tn',     'Karim',  'Zribi',     0),  # Tunis Centre
    ('agent.lamarsa@bna.tn',  'Yasmine', 'Cherif',   1),  # La Marsa
    ('agent.lac@bna.tn',      'Omar',    'Kefi',     2),  # Les Berges du Lac
    ('agent.menzah@bna.tn',   'Sonia',   'Hammami',  3),  # El Menzah
    ('agent.bardo@bna.tn',    'Walid',   'Jaziri',   4),  # Bardo
    ('agent.megrine@bna.tn',  'Imen',    'Saidi',    5),  # Mégrine
    ('agent2@bna.tn',         'Nadia',   'Bouazizi', 6),  # Sfax Centre
    ('agent.sakiet@bna.tn',   'Hichem',  'Karoui',   7),  # Sakiet Ezzit
    ('agent.routesfax@bna.tn','Mouna',   'Triki',    8),  # Sfax Route de Tunis
    ('agent.elain@bna.tn',    'Slim',    'Mahjoub',  9),  # Sfax El Ain
]


WEEKLY_SCHEDULE = {
    'monday_open': time(9, 0),    'monday_close': time(17, 0),
    'tuesday_open': time(9, 0),   'tuesday_close': time(17, 0),
    'wednesday_open': time(9, 0), 'wednesday_close': time(17, 0),
    'thursday_open': time(9, 0),  'thursday_close': time(17, 0),
    'friday_open': time(9, 0),    'friday_close': time(15, 0),
    'saturday_open': time(9, 0),  'saturday_close': time(12, 0),
}


class Command(BaseCommand):
    help = 'Seed the database with rich demo data (10 agencies, 10 agents, 5 services).'

    def handle(self, *args, **options):
        self.stdout.write('Seeding BNA demo data...')

        # Suppress PubSub events during bulk seed.
        with patch('apps.identity.managers.publish'), \
             patch('apps.services.managers.publish'):

            from apps.identity.managers import IdentityManager
            from apps.identity.models import User
            from apps.services.managers import ServiceManager

            # ── Admin + main client ───────────────────────────────────────
            admin, _ = User.objects.get_or_create(
                email='admin@bna.tn',
                defaults=dict(
                    username='admin@bna.tn',
                    first_name='Rania',
                    last_name='Mansour',
                    role=User.Role.ADMIN,
                    status=User.AccountStatus.ACTIVE,
                ),
            )
            admin.set_password('admin123')
            admin.save(update_fields=['password'])
            self.stdout.write(f'  Admin:   {admin.email}')

            # Main demo client (already-active, not pending).
            try:
                client = IdentityManager.register_guest(
                    email='client@bna.tn',
                    password='client123',
                    first_name='Sami',
                    last_name='Ben Ali',
                )
            except Exception:
                client = User.objects.get(email='client@bna.tn')
            self.stdout.write(f'  Client:  {client.email}')

            # ── Agents (one per agency, deferred pinning) ─────────────────
            agents = []
            for email, first_name, last_name, _ in AGENTS:
                user, created = User.objects.get_or_create(
                    email=email,
                    defaults=dict(
                        username=email,
                        first_name=first_name,
                        last_name=last_name,
                        role=User.Role.AGENT,
                        status=User.AccountStatus.ACTIVE,
                    ),
                )
                user.set_password('agent123')
                user.save(update_fields=['password'])
                agents.append(user)
            self.stdout.write(f'  Agents:  {len(agents)} créés')

            # ── Services ──────────────────────────────────────────────────
            services = []
            for spec in SERVICES:
                service = ServiceManager.publish_service(admin_id=admin.pk, **spec)
                services.append(service)
            self.stdout.write(
                f'  Services: {", ".join(s.name for s in services)}'
            )

            # ── Agencies ──────────────────────────────────────────────────
            agencies = []
            for spec in AGENCIES:
                agency = ServiceManager.open_agency(admin_id=admin.pk, **spec)
                agencies.append(agency)
            self.stdout.write(f'  Agencies: {len(agencies)} ouvertes')

            # ── Wire agents to agencies + open all services everywhere ────
            for service in services:
                for agency in agencies:
                    try:
                        ServiceManager.configure_service_hours(
                            service_id=service.pk,
                            agency_id=agency.pk,
                            schedule=WEEKLY_SCHEDULE,
                            admin_id=admin.pk,
                        )
                    except Exception:
                        pass

            for agent_user, (_, _, _, idx) in zip(agents, AGENTS):
                agency = agencies[idx]
                for service in services:
                    try:
                        ServiceManager.assign_agent_to_service(
                            agent_id=agent_user.pk,
                            service_id=service.pk,
                            agency_id=agency.pk,
                            admin_id=admin.pk,
                        )
                    except Exception:
                        pass

        # ── Recap ────────────────────────────────────────────────────────────
        self.stdout.write(self.style.SUCCESS('\nSeed complete.'))
        self.stdout.write('\nDemo accounts:')
        self.stdout.write('  client@bna.tn         / client123')
        self.stdout.write('  admin@bna.tn          / admin123')
        self.stdout.write(
            f'  agent@bna.tn          / agent123  ({AGENCIES[0]["name"]})'
        )
        self.stdout.write(
            f'  agent2@bna.tn         / agent123  ({AGENCIES[6]["name"]})'
        )
        self.stdout.write(
            '  + 8 autres agents (un par agence) — voir `manage.py shell` ou /admin'
        )
        self.stdout.write(
            '\nNext: `manage.py seed_appointments` to populate the calendar.'
        )
