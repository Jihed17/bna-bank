# Diagrammes de cas d'utilisation

Tous les cas d'utilisation de la plateforme BNA Digital, modélisés en
Mermaid. Le détail comportemental (« comment exercer chaque cas dans
l'interface ») est dans [`use_cases.md`](../use_cases.md) à la racine.

**Acteurs**

| Acteur | Rôle | Authentification |
|---|---|---|
| 🌐 Visiteur | consultation publique, inscription | non authentifié |
| 👤 Client | hérite Visiteur + gère ses RDV et avis | `role=client`, `status=active` |
| 🧑‍💼 Agent | gère sa file d'attente et son planning | `role=agent`, `status=active` |
| ⚙️ Admin | pilote services, agences, comptes, modération | `role=admin`, `status=active` |
| ⚡ Système | tâches Celery déclenchées par PubSub | — |

L'héritage `Client → Visiteur` signifie que le Client peut tout faire ce
que le Visiteur peut faire, en plus de ses cas propres.

---

## Vue globale

```mermaid
flowchart LR
    %% Acteurs
    V(("🌐 Visiteur"))
    C(("👤 Client"))
    AG(("🧑‍💼 Agent"))
    AD(("⚙️ Admin"))
    SYS(("⚡ Système"))

    %% Hiérarchie
    C -. hérite .-> V

    subgraph BNA ["Plateforme BNA Digital"]
        UV([Consulter catalogue<br/>services & agences])
        UR([S'inscrire / Se connecter])
        UC([Prendre & gérer<br/>ses rendez-vous])
        URV([Publier des avis])
        UA([Gérer file d'attente<br/>& planning])
        UAD([Administrer services,<br/>agences & comptes])
        UN([Recevoir notifications<br/>in-app + email])
        USY([Matching agents,<br/>relances, expirations])
    end

    V --- UV
    V --- UR
    C --- UC
    C --- URV
    C --- UN
    AG --- UA
    AG --- UN
    AD --- UAD
    AD --- UN
    SYS --- USY

    classDef actor fill:#fef3c7,stroke:#d97706,color:#7c2d12
    classDef uc fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a
    class V,C,AG,AD,SYS actor
    class UV,UR,UC,URV,UA,UAD,UN,USY uc
```

---

## Visiteur

```mermaid
flowchart LR
    V(("🌐 Visiteur"))

    subgraph CAT ["Catalogue public"]
        V1([V1 · Consulter les services])
        V2([V2 · Consulter le détail d'un service])
        V3([V3 · Consulter les agences])
        V4([V4 · Consulter le détail d'une agence])
        V5([V5 · Consulter les avis publiés])
        V6([V6 · Consulter les disponibilités])
    end

    subgraph AUTH ["Authentification"]
        V7([V7 · S'inscrire])
        V8([V8 · Se connecter])
        V9([V9 · Mot de passe oublié])
    end

    V --- V1
    V --- V2
    V --- V3
    V --- V4
    V --- V5
    V --- V6
    V --- V7
    V --- V8
    V --- V9

    %% Relations include / extend
    V2 -. «include» .-> V5
    V6 -. «include» .-> V1
    V6 -. «include» .-> V3

    classDef actor fill:#fef3c7,stroke:#d97706,color:#7c2d12
    classDef uc fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a
    class V actor
    class V1,V2,V3,V4,V5,V6,V7,V8,V9 uc
```

> **V7 — S'inscrire** crée un compte `GUEST/PENDING`. L'authentification
> n'est possible qu'après approbation par un Admin (cas AD11).

---

## Client (authentifié)

Le Client hérite de tous les cas du Visiteur. La figure ci-dessous ne
montre que les cas propres au rôle Client.

```mermaid
flowchart LR
    C(("👤 Client"))
    V(("🌐 Visiteur"))
    C -. hérite .-> V

    subgraph DASH ["Tableau de bord & profil"]
        C1([C1 · Consulter dashboard])
        C7([C7 · Consulter profil])
        C8([C8 · Modifier profil])
        C9([C9 · Changer mot de passe])
        C13([C13 · Consulter notifications])
        C14([C14 · Se déconnecter])
    end

    subgraph RDV ["Gestion des rendez-vous"]
        C2([C2 · Prendre rendez-vous])
        C3([C3 · Lister ses RDV])
        C4([C4 · Détail d'un RDV])
        C5([C5 · Modifier un RDV PENDING])
        C6([C6 · Annuler un RDV])
    end

    subgraph AVIS ["Avis"]
        C10([C10 · Publier un avis])
        C11([C11 · Modifier son avis])
        C12([C12 · Supprimer son avis])
    end

    C --- C1
    C --- C2
    C --- C3
    C --- C4
    C --- C5
    C --- C6
    C --- C7
    C --- C8
    C --- C9
    C --- C10
    C --- C11
    C --- C12
    C --- C13
    C --- C14

    %% include / extend
    C2 -. «include» .-> C4
    C5 -. «extend» .-> C4
    C6 -. «extend» .-> C4
    C11 -. «extend» .-> C10
    C12 -. «extend» .-> C10

    classDef actor fill:#fef3c7,stroke:#d97706,color:#7c2d12
    classDef ucC fill:#dcfce7,stroke:#15803d,color:#14532d
    class C,V actor
    class C1,C2,C3,C4,C5,C6,C7,C8,C9,C10,C11,C12,C13,C14 ucC
```

> **C5 — Modifier un RDV** n'est offert qu'en statut `PENDING` (avant
> qu'un agent ne soit assigné). **C6 — Annuler** est ouvert pour
> `PENDING / ASSIGNED / CONFIRMED`.

---

## Agent

```mermaid
flowchart LR
    AG(("🧑‍💼 Agent"))

    subgraph QUEUE ["File d'attente"]
        A1([A1 · Consulter file d'attente])
        A2([A2 · Accepter un RDV])
        A3([A3 · Refuser un RDV])
    end

    subgraph PLAN ["Planning"]
        A4([A4 · Consulter planning<br/>Mois / Semaine / Jour])
        A5([A5 · Confirmer un RDV<br/>ASSIGNED → CONFIRMED])
        A6([A6 · Marquer effectué<br/>CONFIRMED → COMPLETED])
    end

    subgraph NOTIF ["Notifications"]
        A7([A7 · Recevoir notifications<br/>temps réel])
    end

    AG --- A1
    AG --- A2
    AG --- A3
    AG --- A4
    AG --- A5
    AG --- A6
    AG --- A7

    %% Relations
    A2 -. «extend» .-> A1
    A3 -. «extend» .-> A1
    A5 -. «extend» .-> A4
    A6 -. «extend» .-> A4

    classDef actor fill:#fef3c7,stroke:#d97706,color:#7c2d12
    classDef ucA fill:#fce7f3,stroke:#be185d,color:#831843
    class AG actor
    class A1,A2,A3,A4,A5,A6,A7 ucA
```

> **Règle métier** : un agent appartient à exactement une agence. Sa file
> d'attente et son planning sont scoppés à `agent.agency`.
>
> A2 / A3 déclenchent le re-matching côté `AppointmentManager` ; A3 sans
> autre agent éligible fait passer le RDV en `EXPIRED`.

---

## Admin

```mermaid
flowchart LR
    AD(("⚙️ Admin"))

    subgraph SVC ["Services"]
        AD2([AD2 · Créer un service])
        AD3([AD3 · Modifier un service])
        AD4([AD4 · Suspendre un service])
        AD5([AD5 · Réactiver un service])
        AD6([AD6 · Affecter un agent<br/>à un service])
    end

    subgraph AGY ["Agences"]
        AD7([AD7 · Créer une agence])
        AD8([AD8 · Modifier une agence])
        AD9([AD9 · Fermer une agence])
    end

    subgraph USR ["Comptes utilisateurs"]
        AD10([AD10 · Lister inscriptions<br/>en attente])
        AD11([AD11 · Approuver inscription])
        AD12([AD12 · Refuser inscription])
        AD13([AD13 · Supprimer utilisateur])
    end

    subgraph MOD ["Modération & accès"]
        AD1([AD1 · Tableau d'administration])
        AD14([AD14 · Cacher un avis])
        AD15([AD15 · Accès Django Admin])
    end

    AD --- AD1
    AD --- AD2
    AD --- AD3
    AD --- AD4
    AD --- AD5
    AD --- AD6
    AD --- AD7
    AD --- AD8
    AD --- AD9
    AD --- AD10
    AD --- AD11
    AD --- AD12
    AD --- AD13
    AD --- AD14
    AD --- AD15

    %% Relations
    AD11 -. «extend» .-> AD10
    AD12 -. «extend» .-> AD10
    AD13 -. «extend» .-> AD10
    AD6  -. «include» .-> AD2

    classDef actor fill:#fef3c7,stroke:#d97706,color:#7c2d12
    classDef ucD fill:#e0e7ff,stroke:#4338ca,color:#1e1b4b
    class AD actor
    class AD1,AD2,AD3,AD4,AD5,AD6,AD7,AD8,AD9,AD10,AD11,AD12,AD13,AD14,AD15 ucD
```

> **AD13 — Supprimer un utilisateur** est refusé par `on_delete=PROTECT`
> si l'utilisateur a des RDV ou avis liés. Dans ce cas, l'admin doit
> **suspendre** (changement de statut, pas de suppression).
>
> **AD6** repose sur la règle « 1 agent = 1 agence » : la première
> affectation épingle l'agence ; toute affectation à une autre agence
> est rejetée par le `ServiceManager`.

---

## Système (déclenchements PubSub)

Les cas système sont des tâches Celery déclenchées par les Managers via
`core.publisher.publish(DomainEvent)`. Ils n'ont pas d'acteur humain.

```mermaid
flowchart LR
    SYS(("⚡ Système<br/>tâches Celery"))

    subgraph EV ["Déclenchements"]
        S1([S1 · Matching d'agents<br/>éligibles])
        S2([S2 · Notification IN_APP<br/>+ EMAIL aux agents])
        S3([S3 · Notification client<br/>RDV assigné / annulé])
        S4([S4 · Re-matching après refus])
        S5([S5 · Expiration RDV<br/>plus aucun agent])
        S6([S6 · Email de bienvenue<br/>après approbation])
        S7([S7 · Email de réinitialisation<br/>de mot de passe])
        S8([S8 · Notification service<br/>publié / suspendu])
    end

    SYS --- S1
    SYS --- S2
    SYS --- S3
    SYS --- S4
    SYS --- S5
    SYS --- S6
    SYS --- S7
    SYS --- S8

    classDef actor fill:#fef3c7,stroke:#d97706,color:#7c2d12
    classDef ucS fill:#f3e8ff,stroke:#7e22ce,color:#581c87
    class SYS actor
    class S1,S2,S3,S4,S5,S6,S7,S8 ucS
```

### Cartographie événement → tâche Celery

| Événement (publié par) | Tâche Celery | Cas système |
|---|---|---|
| `AppointmentRequestedEvent` (C2) | `handle_appointment_requested` | S1 + S2 |
| `AppointmentAssignedEvent` (A2) | `handle_appointment_assigned` | S3 |
| `AppointmentCancelledEvent` (C6) | `handle_appointment_cancelled` | S3 |
| `AppointmentCompletedEvent` (A6) | `handle_appointment_completed` | S3 |
| (interne) refus avec autres agents | re-publish `AppointmentRequestedEvent` | S4 |
| (interne) refus sans autre agent | transition `EXPIRED` + notif | S5 |
| `AccountVerifiedEvent` (AD11) | `handle_account_verified` | S6 |
| `PasswordResetRequestedEvent` (V9) | `handle_password_reset_requested` | S7 |
| `ServiceUpdatedEvent` (AD2/AD4/AD5) | `handle_service_updated` | S8 |

> En mode `CELERY_TASK_ALWAYS_EAGER=True` (par défaut en dev), ces tâches
> s'exécutent inline dans le process Django. En production ou en test
> async, elles partent par le broker Redis vers le worker Celery.

---

## Récapitulatif — Acteurs × cas d'utilisation

```mermaid
flowchart LR
    V(("🌐 Visiteur"))
    C(("👤 Client"))
    AG(("🧑‍💼 Agent"))
    AD(("⚙️ Admin"))
    SYS(("⚡ Système"))

    C -. hérite .-> V

    %% Bus PubSub central
    BUS[("Bus PubSub<br/>Celery + Redis<br/>(eager en dev)")]

    %% Liens vers le bus depuis les acteurs déclencheurs
    C  -- C2/C6 --> BUS
    AG -- A2/A3/A6 --> BUS
    AD -- AD2/AD4/AD11 --> BUS
    V  -- V9 --> BUS

    %% Le système consomme le bus
    BUS --> SYS

    %% Le système notifie les destinataires
    SYS --> C
    SYS --> AG
    SYS --> V

    classDef actor fill:#fef3c7,stroke:#d97706,color:#7c2d12
    classDef bus fill:#fef9c3,stroke:#a16207,color:#713f12
    class V,C,AG,AD,SYS actor
    class BUS bus
```

Cette dernière vue résume comment les actions humaines (côté gauche)
publient des événements sur le bus, et comment le Système (tâches
Celery) consomme ce bus pour notifier les destinataires concernés.
