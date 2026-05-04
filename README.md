# BNA Digital — Banque Nationale Agricole

Plateforme de prise de rendez-vous bancaires pour la BNA. Le client choisit
un service, une agence et un créneau ; l'agent gère son planning et la file
d'attente ; l'admin pilote le catalogue de services et les agences.

> **Démarrage local en 5 minutes — aucune base de données externe.** Le
> projet tourne entièrement en local sur SQLite, sans Redis ni Postgres.
> Voir [§ Démarrage rapide](#-démarrage-rapide).

---

## 📦 Stack

| Couche | Technologies |
|---|---|
| **Backend** | Django 4.2 · Django REST Framework 3.15 · SimpleJWT |
| **Frontend** | React 18 · Vite 5 · Redux Toolkit + RTK Query · Tailwind CSS 3 · framer-motion |
| **Base de données** | SQLite (fichier `db.sqlite3` créé automatiquement) |
| **Tâches asynchrones** | Celery 5.3 + Redis — délivrent les notifications email (un `@shared_task` par event). Optionnel en local : sans worker, l'API fonctionne et les notifs in-app restent actives. |

L'architecture suit la **Volatility-Based Decomposition (VBD)** :
`ResourceStorage → ResourceAccess → Engines → Managers → DRF Views → React Clients`.
Voir [docs/](docs/) pour les schémas Mermaid détaillés.

---

## 🚀 Démarrage rapide

### Prérequis (local)
- **Python 3.9+**
- **Node.js 18+**
- Aucune base de données à installer — Django utilise SQLite par défaut.
- Aucun Redis à lancer — les notifications in-app fonctionnent sans.

### 1. Backend (terminal 1)

```bash
cd bna-bank/bna-backend
python3 -m venv .venv
.venv/bin/pip install -r requirements/development.txt
```

Créer `bna-bank/bna-backend/.env` :

```env
DJANGO_SETTINGS_MODULE=config.settings.development
SECRET_KEY=remplacer-par-une-cle-aleatoire-de-50-caracteres-minimum
DB_ENGINE=sqlite
DB_NAME=db.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

> Django créera automatiquement `db.sqlite3` à la racine de `bna-backend/`.

Migrer, peupler et lancer :

```bash
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed                # 10 agences, 10 agents, 18 services
.venv/bin/python manage.py seed_appointments   # ~210 rendez-vous demo
.venv/bin/python manage.py runserver 8000
```

→ API : http://localhost:8000/api · Admin Django : http://localhost:8000/admin

### 2. Frontend (terminal 2)

```bash
cd bna-bank/bna-frontend
npm install
npm run dev
```

→ Application : http://localhost:5173

Le proxy Vite redirige `/api/*` vers `http://localhost:8000` (voir
`bna-frontend/vite.config.js`).

---

## 🔑 Comptes de démo

Tous créés par `manage.py seed`.

| Rôle | Email | Mot de passe | Agence |
|---|---|---|---|
| **Client** | `client@bna.tn` | `client123` | — |
| **Admin** | `admin@bna.tn` | `admin123` | — |
| **Agent** | `agent@bna.tn` | `agent123` | BNA Tunis Centre |
| **Agent** | `agent.lamarsa@bna.tn` | `agent123` | BNA La Marsa |
| **Agent** | `agent.lac@bna.tn` | `agent123` | BNA Les Berges du Lac |
| **Agent** | `agent.menzah@bna.tn` | `agent123` | BNA El Menzah |
| **Agent** | `agent.bardo@bna.tn` | `agent123` | BNA Bardo |
| **Agent** | `agent.megrine@bna.tn` | `agent123` | BNA Mégrine |
| **Agent** | `agent2@bna.tn` | `agent123` | BNA Sfax Centre |
| **Agent** | `agent.sakiet@bna.tn` | `agent123` | BNA Sfax Sakiet Ezzit |
| **Agent** | `agent.routesfax@bna.tn` | `agent123` | BNA Sfax Route de Tunis |
| **Agent** | `agent.elain@bna.tn` | `agent123` | BNA Sfax El Ain |

7 clients additionnels (`fatma@`, `mehdi@`, `leila@`, `amine@`, `rim@`,
`khaled@`, `sirine@bna.tn`, tous `client123`) sont créés par
`seed_appointments` pour rendre les listes plus réalistes.

> **Règle métier — un agent appartient à une seule agence.** Le premier
> rattachement épingle l'agent ; toute tentative de l'affecter à une seconde
> agence est refusée par le `ServiceManager`.

---

## 📊 Données de démo

Après `seed` + `seed_appointments`, vous obtenez :

- **10 agences** réparties sur Tunis et Sfax avec adresses + coordonnées GPS :
  - **Grand Tunis (6)** — Centre, La Marsa, Les Berges du Lac, El Menzah, Bardo, Mégrine
  - **Grand Sfax (4)** — Centre, Sakiet Ezzit, Route de Tunis, El Ain
- **10 agents**, un par agence (chacun ne peut intervenir que dans son agence)
- **18 services** répartis sur 5 catégories :
  - **Particuliers** (5) — compte courant, crédit immobilier, carte bancaire, épargne, virement international
  - **Entreprises** (4) — compte pro, crédit pro & leasing, cash management, crédit documentaire
  - **Investissement** (3) — placement boursier, OPCVM, étude patrimoniale
  - **Assurance** (3) — assurance vie, auto / habitation, prévoyance santé
  - **Digital** (3) — activation mobile, carte virtuelle, diagnostic sécurité
- **~210 rendez-vous** : ~60 COMPLETED (45 jours passés), ~50 CONFIRMED, ~50 ASSIGNED, ~50 PENDING (35 jours à venir)
- **2 admins, 8 clients**

Personnaliser le volume :

```bash
.venv/bin/python manage.py seed_appointments --past 30 --future 80
```

---

## 🧭 Tour de l'application

### Visiteur (non connecté)
- Catalogue des services : `/services`
- Liste des agences : `/agencies`
- Inscription : `/register` (le compte passe en `PENDING` → l'admin valide)

### Client (`client@bna.tn`)
- Prendre un rendez-vous : `/appointments/new`
- Liste / annulation : `/appointments`
- Modifier un rendez-vous PENDING : `/appointments/:id/edit`
- Publier un avis sur un service : zone « Avis clients » dans la fiche service
- Profil & changement de mot de passe

### Agent (n'importe quel `agent…@bna.tn`)
- **File d'attente** : nouveaux RDV PENDING dans son agence — accepter / refuser
- **Planning** (3 vues) :
  - **Mois** (par défaut) — aperçu mensuel
  - **Semaine** — grille horaire 08:00–17:00
  - **Jour** — détail d'une journée (cliquer un jour pour basculer)
- Confirmer / marquer effectué les RDV
- Notifications temps réel (cloche + toasts, polling 30 s)

### Admin (`admin@bna.tn`)
- **File d'inscriptions** : valider / refuser les comptes en attente
- Créer / modifier / suspendre un service
- Créer / modifier / fermer une agence
- Affecter un agent à un service (le panel verrouille l'agence si l'agent est déjà rattaché)
- Django admin : `/admin`

---

## 🧪 Tests

### Backend

```bash
cd bna-bank/bna-backend
.venv/bin/python -m pytest -q
```

Suite : **192 tests** couvrant Resource Access, Engines, Managers et Views API.

### Frontend (build de validation)

```bash
cd bna-bank/bna-frontend
npm run build
```

---

## 🔄 Réinitialiser la base (SQLite)

```bash
cd bna-bank/bna-backend
rm db.sqlite3
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed
.venv/bin/python manage.py seed_appointments
```

---

## 🔔 Notifications & emails

**Tout fonctionne en local sans Redis.** En dev, `CELERY_TASK_ALWAYS_EAGER=True` :
les listeners Celery s'exécutent inline dans le même process Django à
chaque `publish()`. Prendre un RDV crée donc immédiatement la notif
`IN_APP` (visible dans la cloche du Navbar) et rend l'email — qui sort
dans le terminal du `runserver` (`EMAIL_BACKEND = console`).

**Pour envoyer de vrais emails** : ajouter les identifiants SMTP au `.env`.
[development.py](bna-bank/bna-backend/config/settings/development.py)
détecte la présence de `EMAIL_HOST` et bascule automatiquement sur SMTP :

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=mon.adresse@gmail.com
EMAIL_HOST_PASSWORD=xxxx-xxxx-xxxx-xxxx
DEFAULT_FROM_EMAIL=mon.adresse@gmail.com
```

> **Gmail** : utiliser un *App Password* (<https://myaccount.google.com/apppasswords>),
> 2FA requise. Pour SSL au lieu de TLS, mettre `EMAIL_USE_SSL=True` +
> `EMAIL_USE_TLS=False` + port `465`.

**Pour tester le pipeline async réel** (broker Redis + worker dédié,
retries) :

```env
# .env
CELERY_EAGER=False
REDIS_URL=redis://localhost:6379/0
```

```bash
docker run -d --rm --name bna-redis -p 6379:6379 redis:7
.venv/bin/celery -A config worker -Q notifications,default --loglevel=info
```

`core.publisher.publish()` est défensif : une panne broker en mode async
n'empêche pas la création du RDV (warning logué via `bna.publisher`).

> Sans worker, les events sont publiés mais non délivrés (broker en mémoire) :
> l'API continue de fonctionner normalement, simplement aucun email envoyé.
> Les notifications in-app, elles, restent disponibles en permanence.

---

## 📚 Documentation complémentaire

| Fichier | Contenu |
|---|---|
| [START.md](START.md) | Guide de démarrage pas-à-pas (équivalent au § Démarrage rapide ci-dessus, plus dépannage) |
| [use_cases.md](use_cases.md) | Tous les cas d'usage et comment les exercer dans l'interface |
| [docs/01-architecture.md](docs/01-architecture.md) | Décomposition VBD + diagrammes |
| [docs/02-domain-model.md](docs/02-domain-model.md) | ERD, machines à états, invariants métier |
| [docs/03-backend-stack.md](docs/03-backend-stack.md) | Apps Django, surface URL, flux requête, PubSub |
| [docs/04-frontend-stack.md](docs/04-frontend-stack.md) | Caches RTK Query, slices, organisation des clients |

---

## 🛠️ Dépannage

| Problème | Solution |
|---|---|
| `Error: That port is already in use` | Un autre service occupe 8000 — `runserver 8001` puis ajuster `bna-frontend/vite.config.js` |
| Erreurs CORS dans le navigateur | Vérifier que l'origine du frontend est dans `CORS_ALLOWED_ORIGINS` du `.env` |
| `npm run dev` démarre sur 5174 | Un Vite tourne déjà — `pkill -f vite` ou ajouter 5174 à `CORS_ALLOWED_ORIGINS` |
| Page blanche après login | DevTools → Application → Local Storage : vérifier `bna_access` / `bna_refresh` / `bna_user`, sinon `localStorage.clear()` |
| `seed_appointments` n'écrit rien | Vérifier que `seed` a déjà tourné — il faut au moins 1 agent agency-pinned |

---

## 📁 Structure du projet

```
bna-bank/
├── bna-backend/                    Django 4 + DRF
│   ├── apps/
│   │   ├── identity/               User, JWT, password reset, approval queue
│   │   ├── services/               Service, Agency, AgentAssignment
│   │   ├── appointments/           Appointment + state machine
│   │   ├── notifications/          PubSub consumer (Celery tasks)
│   │   └── reviews/                Review (note 1-5 + commentaire)
│   ├── core/                       events.py · publisher.py · exceptions.py
│   ├── config/                     settings (development / production)
│   └── requirements/
├── bna-frontend/                   React 18 + Vite + Redux Toolkit
│   └── src/
│       ├── store/                  RTK slices + RTK Query services
│       ├── clients/                guest / user / agent / admin
│       ├── pages/                  pages racines (Home, Login, …)
│       └── components/             layout, navbar, footer
├── docs/                           4 documents techniques (Mermaid)
├── README.md                       (ce fichier)
├── START.md                        guide de démarrage détaillé
└── use_cases.md                    tous les cas d'usage testables
```

---

**© Banque Nationale Agricole — Tunisie**
