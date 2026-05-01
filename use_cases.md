# BNA Digital — Cas d'utilisation

Tous les cas d'utilisation implémentés et comment les exercer dans l'interface.

**Comptes de démo** (créés par `manage.py seed`)

| Rôle | Email | Mot de passe |
|---|---|---|
| Client | `client@bna.tn` | `client123` |
| Agent | `agent@bna.tn` | `agent123` |
| Admin | `admin@bna.tn` | `admin123` |

---

## 👤 Visiteur (non authentifié)

### V1 — Consulter les services
- **Comment** : Aller sur <http://localhost:5173/services> (ou cliquer **Services** dans la barre).
- **Filtre** : cliquer un onglet de catégorie (Particuliers, Entreprises, …).

### V2 — Consulter le détail d'un service
- **Comment** : Sur `/services`, cliquer une carte → `/services/:id`.
- Affiche : description, durée, agences proposant ce service, **avis clients publiés**.

### V3 — Consulter les agences
- **Comment** : Cliquer **Agences** → `/agencies`.

### V4 — Consulter le détail d'une agence
- **Comment** : Sur `/agencies`, cliquer une carte → `/agencies/:id`.

### V5 — Consulter les avis
- **Comment** : Sur `/services/:id`, scroller jusqu'à la section **Avis clients**.

### V6 — Consulter les disponibilités
- **Comment** : Sur la page d'accueil `/`, scroller jusqu'à **Consultez les disponibilités** → choisir service + agence + date → la grille de créneaux apparaît.

### V7 — S'inscrire
- **Comment** : Cliquer **S'inscrire** dans la barre → `/register`.
- Remplir le formulaire (prénom, nom, email, téléphone, mot de passe ≥ 8 caractères).
- **Résultat** : écran « Compte créé, en attente de validation par un administrateur ».

### V8 — Se connecter
- **Comment** : `/login` → email + mot de passe.

### V9 — Mot de passe oublié
- **Comment** : Sur `/login`, cliquer **Mot de passe oublié ?** (lien `/forgot-password`).

---

## 🧑 Client (authentifié, role=`client`)

Hérite de tous les cas Visiteur, plus :

### C1 — Consulter son tableau de bord
- **Comment** : `/dashboard` (lien **Dashboard** dans la barre).
- Affiche : prénom, raccourcis (Prendre RDV, Mes rendez-vous, Profil), prochains RDV.

### C2 — Prendre un rendez-vous
- **Comment** : Cliquer **Prendre RDV** sur le dashboard, ou aller sur `/appointments/new`.
- Étapes : choisir service → agence (filtrée par service) → date → créneau → motif (optionnel) → **Confirmer la demande**.
- **Variante "depuis le SlotBrowser"** : en cliquant un créneau sur la page d'accueil, vous arrivez ici avec les champs pré-remplis.

### C3 — Consulter ses rendez-vous
- **Comment** : Cliquer **Mes RDV** → `/appointments`.
- Filtres par statut : Tous, En attente, Assigné, Confirmé, Effectué, Annulé.

### C4 — Consulter le détail d'un RDV
- **Comment** : Sur `/appointments`, cliquer la référence (`BNA-YYYY-NNNNN`) → `/appointments/:id`.
- Affiche : statut, date, agent assigné, **journal des transitions de statut**.

### C5 — Modifier un rendez-vous (PENDING uniquement)
- **Comment** : Sur `/appointments` ou `/appointments/:id`, cliquer **Modifier** (visible uniquement quand `status = pending`).
- On peut changer : créneau (date + heure), motif. Pas le service ni l'agence (annuler + recréer pour cela).

### C6 — Annuler un rendez-vous
- **Comment** : Cliquer **Annuler** sur la carte du RDV (PENDING / ASSIGNED / CONFIRMED). Une modale s'ouvre pour saisir un motif.

### C7 — Consulter son profil
- **Comment** : Cliquer son prénom dans la barre → `/profile`.

### C8 — Modifier son profil
- **Comment** : Sur `/profile`, modifier prénom / nom / téléphone → **Enregistrer**.

### C9 — Changer son mot de passe
- **Comment** : Sur `/profile`, section **Modifier le mot de passe** → ancien + nouveau (≥ 8 caractères) → **Modifier**.

### C10 — Publier un avis
- **Comment** : Sur `/services/:id`, scroller à **Avis clients**, choisir étoiles (1-5) + commentaire → **Publier**.
- Un client a **un seul avis par service** (le formulaire bascule en mode édition s'il a déjà publié).

### C11 — Modifier son avis
- **Comment** : Sur `/services/:id`, dans la section **Votre avis**, cliquer **Modifier**.

### C12 — Supprimer son avis
- **Comment** : Sur `/services/:id`, dans **Votre avis**, cliquer **Supprimer**.

### C13 — Consulter les notifications
- **Comment** : Cliquer la cloche 🔔 dans la barre (badge rouge si non-lues), ou aller sur `/notifications`.
- Cliquer une notification non-lue la marque comme lue.

### C14 — Se déconnecter
- **Comment** : Cliquer **Déconnexion** dans la barre.

---

## 🧑‍💼 Agent (authentifié, role=`agent`)

L'agent est redirigé automatiquement vers `/agent` au lieu de `/dashboard`.

### A1 — Consulter la file d'attente
- **Comment** : Sur `/agent`, onglet **📋 File d'attente** (par défaut).
- Filtrer par service + agence pour voir les RDV `PENDING` de cette combinaison.
- La liste se rafraîchit automatiquement toutes les 30 secondes.

### A2 — Accepter un rendez-vous
- **Comment** : Sur la file d'attente, cliquer **Accepter** sur une demande.
- Le RDV passe à `ASSIGNED` et disparaît de la file. Le client reçoit une notification.

### A3 — Refuser un rendez-vous
- **Comment** : Cliquer **Refuser** → modale « Motif du refus » → **Confirmer**.
- Le système re-tente le matching avec d'autres agents éligibles ; si aucun, le RDV passe à `EXPIRED`.

### A4 — Consulter son planning
- **Comment** : Sur `/agent`, onglet **📅 Planning**.
- 3 vues : **Mois** (par défaut, vue d'ensemble), **Semaine** (grille horaire 08:00-17:00), **Jour** (détail).
- Cliquer un jour dans la vue Mois ou un en-tête de jour dans la vue Semaine → bascule en vue Jour.
- Boutons **Aujourd'hui** + flèches prev/next.
- Couleurs : 🟦 Assigné, 🟩 Confirmé, ⬜ Effectué.

### A5 — Confirmer un rendez-vous (`ASSIGNED → CONFIRMED`)
- **Comment** : actuellement via API `POST /api/appointments/{id}/confirm/`. UI à câbler dans le détail RDV (TODO).

### A6 — Marquer comme effectué (`CONFIRMED|ASSIGNED → COMPLETED`)
- **Comment** : actuellement via API `POST /api/appointments/{id}/complete/`. UI à câbler dans le détail RDV (TODO).

### A7 — Recevoir des notifications en temps réel
- **Comment** : la cloche 🔔 affiche le nombre de demandes non-lues. Toast en bas-droite quand une nouvelle demande arrive (poll toutes les 30 s).

---

## ⚙️ Admin (authentifié, role=`admin`)

### AD1 — Consulter le tableau d'administration
- **Comment** : Cliquer **Admin** dans la barre → `/admin`.

### AD2 — Créer un service
- **Comment** : Onglet **⚙️ Services** → **+ Nouveau service** → remplir nom / catégorie / type / durée / icône → **Créer**.

### AD3 — Modifier un service
- **Comment** : Sur la liste, cliquer **Modifier** sur une carte → modale → **Modifier**.

### AD4 — Suspendre un service
- **Comment** : Cliquer **Suspendre** sur un service actif. Les RDV en cours ne sont pas annulés (état conservé).

### AD5 — Réactiver un service
- **Comment** : Cliquer **Réactiver** sur un service suspendu.

### AD6 — Affecter un agent à un service
- **Comment** : Sur la liste services, cliquer **Agents** sur un service → modale → choisir agence + agent (parmi les agents actifs) → **Affecter**.

### AD7 — Créer une agence
- **Comment** : Onglet **🏢 Agences** → **+ Nouvelle agence** → remplir nom / adresse / ville / capacité / téléphone / email → **Créer**.

### AD8 — Modifier une agence
- **Comment** : **Modifier** sur une carte agence → modale → **Modifier**.

### AD9 — Fermer une agence
- **Comment** : **Fermer** sur une agence ouverte (confirmation). Les RDV existants restent en base.

### AD10 — Consulter les inscriptions en attente
- **Comment** : Onglet **👥 Inscriptions** (le titre affiche le compteur, ex. `Inscriptions (3)`). La page poll toutes les 60 s.

### AD11 — Approuver une inscription
- **Comment** : Cliquer **Accepter** sur la ligne d'un visiteur en attente.
- Le compte passe à `CLIENT / ACTIVE` ; un email de bienvenue est publié.

### AD12 — Refuser une inscription
- **Comment** : Cliquer **Refuser** → modale (motif optionnel) → **Confirmer**.
- Le compte passe à `SUSPENDED` (gardé en base pour audit).

### AD13 — Supprimer un utilisateur
- **Comment** : Cliquer **Supprimer** sur la ligne d'un visiteur (confirmation requise).
- Suppression définitive de la ligne — refusée si l'utilisateur a des RDV liés (utiliser **Suspendre** dans ce cas).

### AD14 — Modérer un avis (cacher)
- **Comment** : actuellement via API `POST /api/reviews/{id}/hide/`. UI à câbler (TODO).

### AD15 — Accès Django Admin
- **Comment** : <http://localhost:8000/admin> avec `admin@bna.tn` / `admin123`. Permet de tout consulter et modifier au niveau base.

---

## Système — flux automatiques

Ces cas tournent en arrière-plan, déclenchés par les actions ci-dessus.

| Déclencheur | Action |
|---|---|
| Client demande un RDV | `MatchingEngine` cherche les agents éligibles, `PubSub.publish(AppointmentRequestedEvent)`, chaque agent reçoit une notification IN_APP + EMAIL |
| Agent accepte | Notifications retirées des autres agents éligibles, `PubSub.publish(AppointmentAssignedEvent)` → client notifié |
| Agent refuse | Re-matching automatique. Si d'autres agents : RDV repasse en `PENDING` + nouvelle notification. Sinon : `EXPIRED` + notification client |
| Client annule | `PubSub.publish(AppointmentCancelledEvent)` → agent assigné notifié |
| Admin approuve un visiteur | `PubSub.publish(AccountVerifiedEvent)` → email de bienvenue |
| Demande de reset mot de passe | `PubSub.publish(PasswordResetRequestedEvent)` → email avec lien |

---

## Pour aller vite

| Si vous voulez voir… | Connectez-vous comme | Allez à |
|---|---|---|
| La file d'attente d'un agent (~5 demandes prêtes) | `agent@bna.tn` | `/agent` onglet **File d'attente** + filtrer service & agence |
| Un planning rempli (~40 RDV) | `agent@bna.tn` | `/agent` onglet **Planning** |
| Le flux d'approbation | `admin@bna.tn` | `/admin` onglet **Inscriptions** (s'inscrire d'abord en navigation privée) |
| Les avis fonctionnels | `client@bna.tn` | `/services/1` puis poster un avis |
| Le tour complet | (séquence) | inscrire → approuver → connecter → réserver → annuler → modifier |
