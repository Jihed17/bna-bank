# BNA Digital Platform - Banque Nationale Agricole

Plateforme digitale complète pour la Banque Nationale Agricole (BNA) permettant la digitalisation des services bancaires en Tunisie.

## 📋 Table des matières

- [Contexte du projet](#contexte-du-projet)
- [Objectifs](#objectifs)
- [Fonctionnalités](#fonctionnalités)
- [Architecture technique](#architecture-technique)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [API Documentation](#api-documentation)
- [Déploiement](#déploiement)
- [Contribution](#contribution)

## 🏦 Contexte du projet

Dans le cadre de la transformation digitale des services bancaires en Tunisie, la Banque Nationale Agricole (BNA) souhaite améliorer la relation client via une plateforme web accessible à tous.

## 🎯 Objectifs

- ✅ Réduire le temps d'attente en agence
- ✅ Digitaliser la prise de rendez-vous  
- ✅ Faciliter l'accès aux services bancaires
- ✅ Améliorer l'expérience utilisateur

## 👥 Acteurs du système

- **Visiteur** : consultation des services et agences
- **Client** : prise et gestion des rendez-vous
- **Agent** : gestion du planning
- **Administrateur** : gestion globale

## 🚀 Fonctionnalités principales

### 📋 Consultation des services
- Catalogue complet des services bancaires
- Recherche et filtrage par catégorie
- Détails des prérequis et documents
- Tarification transparente

### 🤖 Assistant intelligent d'orientation
- Chatbot intégré pour guider les utilisateurs
- Recommandations personnalisées
- Support multilingue (Français/Arabe)

### 📅 Prise de rendez-vous en ligne
- Sélection d'agence et de service
- Choix des créneaux disponibles
- Confirmation automatique
- Rappels par email/SMS

### 🗺️ Localisation des agences
- Carte interactive des agences BNA
- Informations détaillées (horaires, contact)
- Calcul d'itinéraires
- Équipements disponibles

### 🔐 Authentification utilisateur
- Inscription sécurisée des clients
- Connexion avec JWT
- Gestion des profils
- Réinitialisation de mot de passe

### 🔔 Notifications et support client
- Notifications temps réel
- Système de tickets de support
- Email et SMS automatisés
- Centre d'aide intégré

## 🏗️ Architecture technique

### Frontend (React.js)
- **React 18** avec hooks et context
- **React Router** pour la navigation
- **React Query** pour la gestion des données
- **Tailwind CSS** pour le style
- **Framer Motion** pour les animations
- **Lucide React** pour les icônes

### Backend (Node.js + Express)
- **Node.js** avec **Express.js**
- **MongoDB** avec **Mongoose**
- **JWT** pour l'authentification
- **Bcrypt** pour le hashage des mots de passe
- **Helmet** et **CORS** pour la sécurité
- **Rate limiting** pour la protection

### Base de données (MongoDB)
- **Collections** : Users, Services, Agencies, Appointments, Notifications
- **Indexation** optimisée pour les performances
- **Relations** entre les collections
- **Validation** des données au niveau modèle

## 📦 Installation

### Prérequis
- Node.js 16+ 
- MongoDB 4.4+
- npm ou yarn

### Étapes d'installation

1. **Cloner le projet**
```bash
git clone <repository-url>
cd bna-banking-platform
```

2. **Installer les dépendances**
```bash
npm run install-all
```

3. **Configurer les variables d'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

4. **Démarrer MongoDB**
```bash
# Sur Windows
net start MongoDB

# Sur macOS/Linux
sudo systemctl start mongod
```

5. **Lancer l'application**
```bash
# Mode développement (frontend + backend)
npm run dev

# Uniquement le backend
npm run server

# Uniquement le frontend
npm run client
```

## ⚙️ Configuration

### Variables d'environnement (.env)

```env
# Base de données
MONGODB_URI=mongodb://localhost:27017/bna_platform

# JWT
JWT_SECRET=votre_secret_jwt
JWT_EXPIRE=7d

# Serveur
PORT=5000
NODE_ENV=development

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre_email@gmail.com
EMAIL_PASS=votre_mot_de_passe_app

# Frontend
FRONTEND_URL=http://localhost:3000
```

### Configuration MongoDB

Créez les indexes nécessaires après la première connexion :

```javascript
// Index pour les performances
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ cin: 1 }, { unique: true })
db.appointments.createIndex({ client: 1, dateTime: -1 })
db.agencies.createIndex({ "address.coordinates": "2dsphere" })
```

## 🖥️ Utilisation

### Accès à l'application
- **Frontend** : http://localhost:3000
- **Backend API** : http://localhost:5000
- **Documentation API** : http://localhost:5000/api/health

### Comptes de démonstration

#### Administrateur
- Email : admin@bna.tn
- Mot de passe : admin123

#### Agent
- Email : agent@bna.tn  
- Mot de passe : agent123

#### Client
- Email : client@bna.tn
- Mot de passe : client123

### Navigation principale

1. **Page d'accueil** : Présentation et accès rapide
2. **Services** : Catalogue des services bancaires
3. **Agences** : Localisation et informations
4. **Rendez-vous** : Gestion des appointments
5. **Assistant** : Chatbot intelligent
6. **Profil** : Gestion du compte utilisateur

## 📚 API Documentation

### Endpoints principaux

#### Authentification
```
POST /api/auth/register     - Inscription
POST /api/auth/login        - Connexion
POST /api/auth/logout       - Déconnexion
POST /api/auth/refresh      - Rafraîchir token
```

#### Utilisateurs
```
GET  /api/users/profile     - Profil utilisateur
PUT  /api/users/profile     - Mettre à jour profil
PUT  /api/users/password    - Changer mot de passe
GET  /api/users/notifications - Notifications
```

#### Services
```
GET  /api/services          - Liste des services
GET  /api/services/:id      - Détails service
```

#### Agences
```
GET  /api/agencies          - Liste des agences
GET  /api/agencies/:id      - Détails agence
GET  /api/agencies/nearby   - Agences proches
```

#### Rendez-vous
```
GET  /api/appointments      - Liste appointments
POST /api/appointments      - Créer appointment
PUT  /api/appointments/:id  - Modifier appointment
DELETE /api/appointments/:id - Annuler appointment
```

### Réponses API

Format standard des réponses :

```json
{
  "message": "Opération réussie",
  "data": {},
  "error": null
}
```

## 🚀 Déploiement

### Production

1. **Build du frontend**
```bash
npm run build
```

2. **Configuration production**
```bash
NODE_ENV=production
MONGODB_URI=mongodb://production-server/bna_platform
JWT_SECRET=votre_secret_production_tres_securise
```

3. **Docker (optionnel)**
```bash
docker-compose up -d
```

### Sécurité en production

- ✅ HTTPS obligatoire
- ✅ Variables d'environnement sécurisées
- ✅ Rate limiting activé
- ✅ CORS configuré
- ✅ Helmet pour les headers de sécurité
- ✅ Validation des entrées
- ✅ Hashage des mots de passe

## 📊 Planning Agile (Sprints)

### Sprint 1 ✅ - Authentification
- [x] Modèle User
- [x] Routes auth
- [x] JWT tokens
- [x] Frontend auth

### Sprint 2 ✅ - Services et agences  
- [x] Modèles Service et Agency
- [x] CRUD operations
- [x] Pages frontend

### Sprint 3 🔄 - Rendez-vous
- [x] Modèle Appointment
- [x] Système de réservation
- [x] Gestion des créneaux

### Sprint 4 🔄 - Assistant intelligent
- [x] Chatbot de base
- [ ] Intégration IA avancée
- [ ] Recommandations

### Sprint 5 ⏳ - Notifications et tests
- [x] Modèle Notification
- [ ] Email/SMS automation
- [ ] Tests unitaires
- [ ] Tests E2E

## 🤝 Contribution

### Guidelines

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

### Standards de code

- **ESLint** pour la qualité du code
- **Prettier** pour le formatage
- **Conventional Commits** pour les messages
- **Tests** requis pour nouvelles fonctionnalités

### Structure des dossiers

```
bna-banking-platform/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Composants réutilisables
│   │   ├── pages/         # Pages principales
│   │   ├── contexts/      # Contexts React
│   │   ├── hooks/         # Hooks personnalisés
│   │   ├── utils/         # Utilitaires
│   │   └── styles/        # Styles CSS
│   └── public/            # Fichiers statiques
├── server/                # Backend Node.js
│   ├── models/            # Modèles Mongoose
│   ├── routes/            # Routes Express
│   ├── middleware/        # Middleware
│   ├── controllers/       # Contrôleurs
│   ├── utils/             # Utilitaires
│   └── config/            # Configuration
├── docs/                  # Documentation
└── tests/                 # Tests
```

## 📝 License

Ce projet est la propriété de la Banque Nationale Agricole (BNA) - Tunisie.

## 📞 Support

Pour toute question ou support technique :

- **Email** : support@bna.tn
- **Téléphone** : +216 71 123 456
- **Site web** : https://bna.tn

---

**© 2024 Banque Nationale Agricole - Tous droits réservés**
