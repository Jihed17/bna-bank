# 🚀 Démarrage local — BNA Digital

Plateforme de prise de rendez-vous bancaires.
**Backend** Django 4 + DRF + JWT · **Frontend** React 18 + Vite + Redux Toolkit + RTK Query.

---

## 1. Prérequis

| Outil | Version | Pourquoi |
|---|---|---|
| **Python** | 3.9+ | Backend Django |
| **Node.js** | 18+ | Frontend Vite |
| **PostgreSQL** | 13+ (optionnel) | Base de données — SQLite fonctionne aussi |
| **Redis** | 7+ (optionnel) | File de tâches Celery — uniquement pour les notifications asynchrones |

> Le moyen le plus rapide pour tester le projet : **SQLite + sans Redis**. Aucune installation tierce requise.

---

## 2. Backend

### 2.1 Cloner et créer le venv

```bash
cd bna-bank/bna-backend
python3 -m venv .venv
.venv/bin/pip install -r requirements/development.txt
```

### 2.2 Configurer `.env`

Créer `bna-bank/bna-backend/.env` :

#### Option A — SQLite (le plus simple, recommandé pour démo)

```env
DJANGO_SETTINGS_MODULE=config.settings.development
SECRET_KEY=remplacer-par-une-vraie-clé-d-au-moins-50-caractères-aléatoires
DB_ENGINE=sqlite
DB_NAME=db.sqlite3
REDIS_URL=redis://localhost:6379/0
CORS_ALLOWED_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

Aucun serveur de base de données à installer — Django créera `db.sqlite3` dans le dossier backend.

#### Option B — PostgreSQL (équivalent à la production)

```env
DJANGO_SETTINGS_MODULE=config.settings.development
SECRET_KEY=remplacer-par-une-vraie-clé-d-au-moins-50-caractères-aléatoires
DB_NAME=bna_db
DB_USER=bna_user
DB_PASSWORD=bna_password
DB_HOST=127.0.0.1
DB_PORT=5432
REDIS_URL=redis://localhost:6379/0
CORS_ALLOWED_ORIGINS=http://localhost:5173
FRONTEND_URL=http://localhost:5173
```

Démarrer Postgres rapidement avec Docker :

```bash
docker run -d --rm --name bna-pg \
  -e POSTGRES_USER=bna_user \
  -e POSTGRES_PASSWORD=bna_password \
  -e POSTGRES_DB=bna_db \
  -p 5432:5432 postgres:16
```

### 2.3 Migrer + seed

```bash
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed                # crée les utilisateurs / services / agences
.venv/bin/python manage.py seed_appointments   # crée ~40 rendez-vous démo pour l'agent
```

### 2.4 Lancer le serveur

```bash
.venv/bin/python manage.py runserver 8000
```

→ API disponible sur **http://localhost:8000/api**
→ Admin Django sur **http://localhost:8000/admin** (utiliser `admin@bna.tn` / `admin123`)
→ Health check : <http://localhost:8000/api/health/>

---

## 3. Frontend (nouveau terminal)

```bash
cd bna-bank/bna-frontend
npm install
npm run dev
```

→ Application sur **http://localhost:5173**

Le proxy Vite redirige automatiquement `/api/*` vers `http://localhost:8000` (voir `vite.config.js`).

---

## 4. Comptes de démo

Créés par `manage.py seed` (voir aussi le fichier `creds`) :

| Rôle | Email | Mot de passe |
|---|---|---|
| **Client** | `client@bna.tn` | `client123` |
| **Agent** | `agent@bna.tn` | `agent123` |
| **Admin** | `admin@bna.tn` | `admin123` |

Trois clients additionnels sont créés par `seed_appointments` pour rendre les listes plus réalistes :
`fatma@bna.tn`, `mehdi@bna.tn`, `leila@bna.tn` — tous avec le mot de passe `client123`.

---

## 5. Tour de l'application

Une fois connecté, voici ce que chaque rôle peut faire :

### 👤 Client (`client@bna.tn`)
- Parcourir services et agences (public)
- Vérifier les disponibilités sur la page d'accueil
- Prendre rendez-vous (`/appointments/new`)
- Consulter / annuler ses rendez-vous (`/appointments`)
- Modifier son profil et son mot de passe

### 🧑‍💼 Agent (`agent@bna.tn`)
- **File d'attente** : voir les nouvelles demandes de RDV, accepter ou refuser
- **Planning** (calendrier) avec 3 vues :
  - **Mois** (par défaut) — vue d'ensemble avec aperçus de RDV par jour
  - **Semaine** — grille horaire 08:00–17:00 sur 6 jours
  - **Jour** — détail complet d'une journée
  - Cliquer sur une journée → bascule sur la vue Jour
- Confirmer / marquer comme effectué les RDV
- Voir notifications en temps réel (toasts + cloche)

### ⚙️ Admin (`admin@bna.tn`)
- Créer / modifier / suspendre des services
- Créer / modifier / fermer des agences
- Affecter des agents aux services
- Consulter le journal Django sur `/admin/`

---

## 6. Notifications (optionnel)

Les notifications **in-app** fonctionnent dès que vous lancez le serveur — la cloche dans la barre de navigation poll `/api/notifications/` toutes les 30 secondes.

Pour que les **emails** soient envoyés (ex. demande de RDV → email à l'agent), il faut un worker Celery + Redis :

```bash
# Terminal 3 — démarrer Redis
docker run -d --rm --name bna-redis -p 6379:6379 redis:7

# Terminal 4 — depuis bna-backend, venv activé
.venv/bin/celery -A config worker -Q notifications,default --loglevel=info
```

En dev, les emails sont envoyés vers la console (`EMAIL_BACKEND = console`) — vous les verrez dans les logs du worker. Sans worker, les événements sont publiés mais aucun email n'est envoyé (l'API continue de fonctionner normalement).

---

## 7. Tests

### Backend

```bash
cd bna-bank/bna-backend
.venv/bin/python -m pytest -q
```

Suite complète : ~191 tests couvrant Resource Access, Engines, Managers et Views API.

### Frontend (build)

```bash
cd bna-bank/bna-frontend
npm run build       # vérifie qu'il n'y a pas d'erreurs de compilation
```

---

## 8. Réinitialiser la base

### SQLite

```bash
cd bna-bank/bna-backend
rm db.sqlite3
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed
.venv/bin/python manage.py seed_appointments
```

### PostgreSQL

```bash
.venv/bin/python manage.py flush --no-input
.venv/bin/python manage.py seed
.venv/bin/python manage.py seed_appointments
```

---

## 9. Dépannage

| Problème | Solution |
|---|---|
| `Error: That port is already in use` | Un autre service occupe le port 8000 — utiliser `runserver 8001` puis ajuster le proxy dans `bna-frontend/vite.config.js` |
| Erreurs CORS dans le navigateur | Vérifier que l'origine du frontend est dans `CORS_ALLOWED_ORIGINS` du `.env` |
| `OperationalError: could not connect to server` (Postgres) | Le conteneur Postgres n'est pas lancé, ou `DB_HOST`/`DB_PORT` ne correspondent pas |
| `npm run dev` démarre sur 5174 au lieu de 5173 | Un autre processus Vite occupe 5173 — tuer l'ancien (`pkill -f vite`) ou ajouter le port 5174 à `CORS_ALLOWED_ORIGINS` |
| Page blanche après login | Ouvrir DevTools → Application → Local Storage et vérifier les clés `bna_access`, `bna_refresh`, `bna_user` ; sinon faire `localStorage.clear()` puis se reconnecter |

---

## 10. Architecture rapide

Le backend suit la décomposition VBD (Volatility-Based Decomposition) :

```
ResourceStorage     → Django models                    (le plus stable)
ResourceAccess      → access.py + RTK Query services
Utilities           → Security (JWT), PubSub (Celery), Logging
Engines             → SchedulingEngine, MatchingEngine, NotifyingEngine
Managers            → IdentityManager, ServiceManager, AppointmentManager
DRF Views           → un endpoint par méthode du Manager
Clients (frontend)  → GuestClient, UserClient, AgentClient,
                      AdminClient, NotificationListenerClient   (le plus volatile)
```

Les changements de logique métier remontent par cette pile — modifier l'algorithme de matching ne touche que `MatchingEngine`, modifier l'UI agent ne touche que `clients/agent/`.

---

**Bon travail !** 🌿
