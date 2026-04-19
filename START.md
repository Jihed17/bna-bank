# 🚀 Démarrage rapide - BNA Digital Platform

## Prérequis

1. **Node.js** (version 14 ou supérieure)
2. **MongoDB** (installé et en cours d'exécution)
3. **Git** (pour cloner le projet)

## Installation

```bash
# 1. Cloner le projet (si ce n'est pas déjà fait)
git clone <repository-url>
cd bna-banking-platform

# 2. Installer toutes les dépendances
npm run install-all

# 3. Configurer les variables d'environnement
# Copiez .env.example vers .env et configurez les valeurs
```

## Configuration

### 1. MongoDB
Assurez-vous que MongoDB est installé et en cours d'exécution:
```bash
# Sur Windows
net start MongoDB

# Sur macOS/Linux
sudo systemctl start mongod
# ou
brew services start mongodb-community
```

### 2. Variables d'environnement (.env)
Le fichier `.env` est déjà configuré avec les valeurs par défaut:

```env
MONGODB_URI=mongodb://localhost:27017/bna_platform
JWT_SECRET=your_jwt_secret_key_here_bna_2024
JWT_EXPIRE=7d
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### 3. Peupler la base de données (optionnel)
```bash
npm run seed
```

Cette commande créera:
- 3 comptes de démonstration (client, agent, admin)
- 5 services bancaires
- 3 agences avec leurs équipements

## Démarrage

### Option 1: Démarrage simultané (recommandé)
```bash
npm run dev
```

Cette commande démarrera:
- Le serveur backend sur http://localhost:5000
- L'application frontend sur http://localhost:3000

### Option 2: Démarrage séparé
Dans un terminal:
```bash
npm run server
```

Dans un deuxième terminal:
```bash
npm run client
```

## Accès à l'application

### Frontend
- URL: http://localhost:3000
- Application React avec interface moderne

### Backend API
- URL: http://localhost:5000
- Documentation: http://localhost:5000/api/health

## Comptes de démonstration

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Client | client@bna.tn | client123 |
| Agent | agent@bna.tn | agent123 |
| Admin | admin@bna.tn | admin123 |

## Fonctionnalités principales

### 🏦 Pour les clients
- Prise de rendez-vous en ligne
- Consultation des services et agences
- Gestion du profil personnel
- Historique des rendez-vous

### 👥 Pour les agents
- Gestion des rendez-vous
- Consultation des clients
- Statistiques de performance

### 🎛️ Pour les administrateurs
- Gestion complète du système
- Configuration des services et agences
- Rapports et analytics

## Dépannage

### Problèmes courants

1. **MongoDB ne démarre pas**
   - Vérifiez que MongoDB est installé
   - Sur Windows: `net start MongoDB`
   - Sur macOS: `brew services start mongodb-community`

2. **Port déjà utilisé**
   - Changez le port dans `.env`: `PORT=5001`
   - Ou arrêtez le processus utilisant le port: `netstat -ano | findstr :5000`

3. **Erreur de connexion MongoDB**
   - Vérifiez que MongoDB est en cours d'exécution
   - Vérifiez l'URI dans `.env`
   - Essayez: `mongosh` pour tester la connexion

4. **Dépendances manquantes**
   - Réinstallez: `npm run install-all`
   - Ou séparément: `npm install` puis `cd client && npm install`

### Logs et monitoring

- **Backend logs**: Console du terminal serveur
- **Frontend logs**: Console du navigateur (F12)
- **Database**: Vérifiez avec MongoDB Compass ou `mongosh`

## Développement

### Structure du projet
```
bna-banking-platform/
├── server/                 # Backend Node.js
│   ├── models/            # Modèles Mongoose
│   ├── routes/            # Routes API
│   ├── middleware/        # Middleware
│   └── index.js          # Point d'entrée
├── client/                # Frontend React
│   ├── src/
│   │   ├── components/    # Composants React
│   │   ├── pages/         # Pages
│   │   ├── contexts/      # Contexts React
│   │   └── App.js         # App principale
├── .env                   # Variables d'environnement
└── package.json           # Dépendances et scripts
```

### Commandes utiles

```bash
# Développement
npm run dev              # Démarrer les deux serveurs
npm run server           # Démarrer seulement le backend
npm run client           # Démarrer seulement le frontend

# Base de données
npm run seed             # Peupler avec des données de test

# Production
npm run build            # Builder pour production
npm start               # Démarrer en mode production
```

## Support

En cas de problème:
1. Vérifiez les logs dans la console
2. Consultez la section dépannage ci-dessus
3. Assurez-vous que toutes les dépendances sont installées
4. Vérifiez que MongoDB est bien configuré

---

**Bonne utilisation de la plateforme BNA Digital! 🎉**
