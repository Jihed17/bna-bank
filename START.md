# 🚀 Démarrage local — BNA Digital

Plateforme de prise de rendez-vous bancaires.
**Backend** Django 4 + DRF + JWT · **Frontend** React 18 + Vite + Redux Toolkit + RTK Query.

> Ce guide cible un environnement **local SQLite uniquement**. Aucun
> Docker, aucun PostgreSQL, aucun Redis nécessaires.

---

## 1. Prérequis

| Outil | Version | Pourquoi |
|---|---|---|
| **Python** | 3.9+ | Backend Django |
| **Node.js** | 18+ | Frontend Vite |

C'est tout. Pas de base de données externe — Django créera `db.sqlite3` à
la racine du backend. Pas de Redis — les notifications in-app font du
polling HTTP.

---

## 2. Backend (terminal 1)

### 2.1 Créer le venv et installer

```bash
cd bna-bank/bna-backend
python3 -m venv .venv
.venv/bin/pip install -r requirements/development.txt
```

### 2.2 Configurer `.env`

Créer `bna-bank/bna-backend/.env` :

```env
DJANGO_SETTINGS_MODULE=config.settings.development
SECRET_KEY=remplacer-par-une-cle-aleatoire-d-au-moins-50-caracteres
DB_ENGINE=sqlite
DB_NAME=db.sqlite3
CORS_ALLOWED_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

> Aucun `REDIS_URL` requis : sans worker Celery, les events PubSub sont
> publiés en mémoire et ignorés (l'API continue de fonctionner). Si vous
> activez Celery plus tard, ajouter la variable à ce moment-là.

### 2.3 Migrer + seed

```bash
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed                # 10 agences, 10 agents, 18 services
.venv/bin/python manage.py seed_appointments   # ~210 rendez-vous demo
```

### 2.4 Lancer le serveur

```bash
.venv/bin/python manage.py runserver 8000
```

→ API : <http://localhost:8000/api>
→ Admin Django : <http://localhost:8000/admin> (login `admin@bna.tn` / `admin123`)
→ Health check : <http://localhost:8000/api/health/>

---

## 3. Frontend (terminal 2)

```bash
cd bna-bank/bna-frontend
npm install
npm run dev
```

→ Application : <http://localhost:5173>

Le proxy Vite redirige `/api/*` vers `http://localhost:8000` (voir
`vite.config.js`) — donc pas de problème CORS en local.

---

## 4. Comptes de démo

Tous créés par `manage.py seed`. Mot de passe agents : `agent123`.

| Rôle | Email | Mot de passe | Agence |
|---|---|---|---|
| **Client** | `client@bna.tn` | `client123` | — |
| **Admin** | `admin@bna.tn` | `admin123` | — |
| **Agent — Tunis Centre** | `agent@bna.tn` | `agent123` | BNA Tunis Centre |
| **Agent — La Marsa** | `agent.lamarsa@bna.tn` | `agent123` | BNA La Marsa |
| **Agent — Lac** | `agent.lac@bna.tn` | `agent123` | BNA Les Berges du Lac |
| **Agent — El Menzah** | `agent.menzah@bna.tn` | `agent123` | BNA El Menzah |
| **Agent — Bardo** | `agent.bardo@bna.tn` | `agent123` | BNA Bardo |
| **Agent — Mégrine** | `agent.megrine@bna.tn` | `agent123` | BNA Mégrine |
| **Agent — Sfax Centre** | `agent2@bna.tn` | `agent123` | BNA Sfax Centre |
| **Agent — Sakiet Ezzit** | `agent.sakiet@bna.tn` | `agent123` | BNA Sfax Sakiet Ezzit |
| **Agent — Sfax Route Tunis** | `agent.routesfax@bna.tn` | `agent123` | BNA Sfax Route de Tunis |
| **Agent — Sfax El Ain** | `agent.elain@bna.tn` | `agent123` | BNA Sfax El Ain |

7 clients additionnels (`fatma@`, `mehdi@`, `leila@`, `amine@`, `rim@`,
`khaled@`, `sirine@bna.tn`, mot de passe `client123`) sont créés par
`seed_appointments` pour rendre les listes plus réalistes.

> **Règle métier** : un agent ne peut être rattaché qu'à une seule agence.
> Le premier rattachement épingle l'agent ; toute affectation à une autre
> agence est refusée par le `ServiceManager`.

---

## 5. Tour de l'application

### 👤 Client (`client@bna.tn`)
- Parcourir services et agences (public)
- Vérifier les disponibilités sur la page d'accueil
- Prendre un rendez-vous (`/appointments/new`)
- Consulter / annuler / modifier ses RDV (`/appointments`)
- Publier un avis 1–5 étoiles sur un service
- Profil + changement de mot de passe

### 🧑‍💼 Agent (n'importe quel `agent…@bna.tn`)
- **File d'attente** : nouvelles demandes de RDV dans son agence — accepter ou refuser
- **Planning** (3 vues sélectionnables) :
  - **Mois** (par défaut) — aperçu mensuel
  - **Semaine** — grille horaire 08:00–17:00 sur 6 jours
  - **Jour** — détail complet d'une journée (cliquer une case du mois bascule sur le jour)
- Confirmer / marquer effectués les RDV
- Notifications temps réel (cloche + toasts, polling HTTP 30 s)

### ⚙️ Admin (`admin@bna.tn`)
- **Inscriptions en attente** : valider / refuser les nouveaux comptes (state `PENDING → ACTIVE`)
- Créer / modifier / suspendre un service
- Créer / modifier / fermer une agence
- Affecter un agent à un service (le panneau verrouille l'agence si l'agent est déjà rattaché)
- Django admin classique sur `/admin`

---

## 6. Tests

### Backend

```bash
cd bna-bank/bna-backend
.venv/bin/python -m pytest -q
```

Suite : **192 tests** couvrant ResourceAccess, Engines, Managers et Views API.

### Frontend (build de validation)

```bash
cd bna-bank/bna-frontend
npm run build
```

---

## 7. Réinitialiser la base

```bash
cd bna-bank/bna-backend
rm db.sqlite3
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed
.venv/bin/python manage.py seed_appointments
```

Personnaliser le volume des RDV demo :

```bash
.venv/bin/python manage.py seed_appointments --past 30 --future 80
```

---

## 8. Notifications & emails

### 8.1 Mode par défaut — Celery « eager », sans Redis

En `development.py`, `CELERY_TASK_ALWAYS_EAGER=True` est activé par défaut :
chaque fois qu'un Manager publie un event (`AppointmentRequestedEvent`,
etc.), le listener Celery correspondant s'exécute **immédiatement, en
ligne, dans le même process Django**. Aucun Redis ni worker requis.

Conséquence concrète : prendre un RDV crée immédiatement les notifications
`IN_APP` (la cloche du frontend les verra au prochain poll de 30 s) et
rend les emails. Sans variables `EMAIL_*` dans le `.env`, les emails sont
**imprimés dans le terminal du `runserver`** (`EMAIL_BACKEND = console`),
pratique pour vérifier templates et payloads sans configurer de SMTP.

### 8.2 Activer SMTP — envoyer de vrais emails

`development.py` détecte automatiquement la présence de `EMAIL_HOST` dans
le `.env` et bascule sur le backend SMTP. Aucune ligne de code à modifier
— ajouter au `.env` :

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=mon.adresse@gmail.com
EMAIL_HOST_PASSWORD=xxxx-xxxx-xxxx-xxxx
DEFAULT_FROM_EMAIL=mon.adresse@gmail.com
```

> **Gmail** : créer un *App Password* dans <https://myaccount.google.com/apppasswords>
> (nécessite la 2FA activée). Le mot de passe à 16 chiffres remplace le
> mot de passe normal pour `EMAIL_HOST_PASSWORD`.

> **Mailtrap / Brevo / SendGrid** : identifiants SMTP fournis par le
> service ; ports usuels 587 (TLS) ou 465 (SSL — alors `EMAIL_USE_SSL=True`
> + `EMAIL_USE_TLS=False`).

Relancer `runserver` après modification du `.env`, puis prendre un nouveau
RDV → l'email part vers la vraie adresse SMTP. Note : les utilisateurs de
démo `agent.*@bna.tn` n'existent pas réellement — utiliser un compte test,
ou mettre `User.notification_email=False` pour les muter.

### 8.3 🔐 Recommandé — OAuth 2.0 (Gmail API)

Pour la production (et tout cas où l'on ne veut pas stocker un mot de
passe applicatif), Gmail recommande **OAuth 2.0 via la Gmail API** plutôt
que SMTP + App Password.

**Étapes côté Google :**

1. Ouvrir la [Google Cloud Console](https://console.cloud.google.com/).
2. Créer un projet (ex. `bna-digital-mailer`).
3. Activer la **Gmail API** (`APIs & Services → Library → Gmail API → Enable`).
4. Configurer l'**OAuth consent screen** (type *External* en dev, *Internal*
   pour un Workspace) — renseigner nom de l'app, email de support, scopes
   minimaux (`https://www.googleapis.com/auth/gmail.send`).
5. Créer des **identifiants OAuth 2.0** (`Credentials → Create credentials →
   OAuth client ID`, type *Web application*) — récupérer le **Client ID**
   et le **Client Secret**.
6. Faire passer un compte d'envoi par le flux d'autorisation (script
   one-shot, ou `google-auth-oauthlib`) pour récupérer un **refresh_token**
   long-vie ; les **access_token** sont rafraîchis automatiquement.

**Ce que vous obtenez :**

| Donnée | Rôle |
|---|---|
| `client_id` | Identifie l'application auprès de Google |
| `client_secret` | Authentifie l'application (à protéger comme un mot de passe) |
| `refresh_token` | Permet de regénérer des `access_token` sans réintervention utilisateur |
| `access_token` | Jeton court (≈ 1 h) utilisé sur chaque appel à l'API |

**⚠️ Toutes ces valeurs sont des secrets** — elles ne doivent **jamais**
être commitées. Les placer dans `.env`, lues via `python-decouple` /
`os.environ`, comme les variables `EMAIL_*` existantes :

```env
GMAIL_OAUTH_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GMAIL_OAUTH_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx
GMAIL_OAUTH_REFRESH_TOKEN=1//0gxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GMAIL_OAUTH_SENDER=mon.adresse@gmail.com
```

> Le dossier `creds/` à la racine du repo est *gitignoré* — utilisable
> pour stocker en local le JSON téléchargé depuis Google Cloud Console
> (`client_secret_xxx.json`), mais les valeurs effectivement consommées
> par le runtime restent celles du `.env`.

**Côté Django**, deux pistes selon le besoin :

- **Simple** — `django-sendgrid-v5`, `django-anymail` ou
  `django-google-oauth-mail` exposent un `EMAIL_BACKEND` qui enveloppe
  l'API Gmail ; on pointe `EMAIL_BACKEND` vers le backend OAuth et on
  laisse `send_mail()` (déjà utilisé dans `EmailAdapter`) inchangé.
- **Direct** — implémenter un `BaseChannelAdapter` dédié dans
  [apps/notifications/engines/notifying.py](bna-bank/bna-backend/apps/notifications/engines/notifying.py)
  qui appelle la Gmail API via `google-api-python-client` ; l'enregistrer
  dans `CHANNEL_ADAPTERS` à la place de `EmailAdapter`.

Bon pour : applications, services web, environnements de production —
pas de mot de passe stocké, révocation centralisée côté Google,
audit log natif.

### 8.4 Tester le vrai flux asynchrone (Celery + Redis)

Pour exercer le pipeline réel (broker Redis, worker dédié, retries sur
échec), désactiver le mode eager et lancer Redis + un worker :

```bash
# .env
CELERY_EAGER=False
REDIS_URL=redis://localhost:6379/0
```

```bash
# Terminal 3 — Redis
docker run -d --rm --name bna-redis -p 6379:6379 redis:7

# Terminal 4 — worker
cd bna-bank/bna-backend
.venv/bin/celery -A config worker -Q notifications,default --loglevel=info
```

> **Robustesse** : `core.publisher.publish()` swallowed les pannes broker
> — si Redis tombe en mode async, le RDV est tout de même créé et le
> manquement est tracé via le logger `bna.publisher` au niveau WARNING.
> La logique métier ne casse jamais à cause de l'infra de notifications.

---

## 9. Dépannage

| Problème | Solution |
|---|---|
| `Error: That port is already in use` | Un autre service occupe 8000 — utiliser `runserver 8001` puis ajuster le proxy dans `bna-frontend/vite.config.js` |
| Erreurs CORS dans le navigateur | Vérifier que l'origine du frontend (port utilisé par Vite) est dans `CORS_ALLOWED_ORIGINS` du `.env` |
| `npm run dev` démarre sur 5174 au lieu de 5173 | Un autre Vite tourne — `pkill -f vite`, ou ajouter `http://localhost:5174` à `CORS_ALLOWED_ORIGINS` |
| Page blanche après login | DevTools → Application → Local Storage : vérifier `bna_access` / `bna_refresh` / `bna_user`, sinon `localStorage.clear()` puis se reconnecter |
| `seed_appointments` n'écrit rien | Vérifier que `seed` a déjà tourné — il faut au moins un agent agency-pinned |
| `ModuleNotFoundError` au lancement | Activer le venv (`.venv/bin/python …`) ou réinstaller `pip install -r requirements/development.txt` |
| Aucun email reçu malgré le worker | En dev, `EMAIL_BACKEND` = console : les emails s'affichent dans les logs du worker, pas dans une boîte mail réelle |
| `kombu.exceptions.OperationalError` au lancement du worker | Redis n'est pas démarré ou `REDIS_URL` du `.env` ne correspond pas |

---

## 10. Architecture rapide

Le backend suit la décomposition VBD (Volatility-Based Decomposition) :

```
ResourceStorage     → Django models                       (le plus stable)
ResourceAccess      → access.py + RTK Query services
Utilities           → Security (JWT), PubSub (Celery), Logging
Engines             → SchedulingEngine, MatchingEngine, NotifyingEngine
Managers            → IdentityManager, ServiceManager, AppointmentManager,
                      ReviewManager
DRF Views           → un endpoint par méthode du Manager
Clients (frontend)  → GuestClient, UserClient, AgentClient,
                      AdminClient, NotificationListenerClient   (le plus volatile)
```

Les changements de logique métier remontent par cette pile — modifier
l'algorithme de matching ne touche que `MatchingEngine`, modifier l'UI
agent ne touche que `clients/agent/`.

Documentation complète :

| Fichier | Contenu |
|---|---|
| [docs/01-architecture.md](docs/01-architecture.md) | Décomposition VBD + diagrammes |
| [docs/02-domain-model.md](docs/02-domain-model.md) | ERD, machines à états, invariants |
| [docs/03-backend-stack.md](docs/03-backend-stack.md) | Apps Django, URL, flux requête, PubSub |
| [docs/04-frontend-stack.md](docs/04-frontend-stack.md) | Caches RTK Query, slices, clients |
| [use_cases.md](use_cases.md) | Tous les cas d'usage et comment les exercer dans l'interface |

---

**Bon travail !** 🌿
