# 02 — Domain model

The five storage components (Django apps) and the relationships between them.

## Entity-relationship diagram

```mermaid
erDiagram
    User ||--o{ Appointment : "client / agent"
    User ||--o{ Review : "writes"
    User ||--o{ Notification : "receives"
    User ||--o{ AgentAssignment : "is agent"
    User ||--o{ PasswordResetToken : "has"

    Service ||--o{ AgencyService : "offered at"
    Service ||--o{ Appointment : "booked for"
    Service ||--o{ Review : "reviewed"

    Agency ||--o{ AgencyService : "offers"
    Agency ||--o{ Appointment : "hosts"

    AgencyService ||--o{ AgentAssignment : "delegates"
    AgentAssignment ||--o{ Appointment : "fulfilled by"

    Appointment ||--o{ AppointmentStatusLog : "has history"
    Appointment ||--o{ Notification : "triggers"

    User {
        int id PK
        string email UK
        string role "guest|client|agent|admin"
        string status "pending|active|suspended|closed"
        string first_name
        string last_name
        string phone
        string preferred_language
    }
    Service {
        int id PK
        string name
        string category "retail|corporate|investment|insurance|digital"
        string type "account|credit|card|transfer|advisory|other"
        int duration_minutes
        bool is_active
    }
    Agency {
        int id PK
        string name
        string address
        string city
        string status "open|closed|suspended"
        int capacity
    }
    AgencyService {
        int id PK
        int agency_id FK
        int service_id FK
        bool is_active
        time monday_open
        time monday_close
        time tuesday_open
        time saturday_close "..."
    }
    AgentAssignment {
        int id PK
        int agent_id FK
        int agency_service_id FK
        bool is_active
    }
    Appointment {
        int id PK
        string reference UK "BNA-YYYY-NNNNN"
        int client_id FK
        int agent_id FK "nullable"
        int service_id FK
        int agency_id FK
        datetime scheduled_at
        string status "pending|assigned|confirmed|completed|cancelled|expired|rejected"
        text reason
    }
    AppointmentStatusLog {
        int id PK
        int appointment_id FK
        string from_status
        string to_status
        int changed_by_id FK
        text reason
        datetime changed_at
    }
    Review {
        int id PK
        int author_id FK
        int service_id FK
        int rating "1-5"
        text comment
        string status "published|hidden"
    }
    Notification {
        int id PK
        int recipient_id FK
        string channel "email|sms|in_app|push"
        string event_type
        string status "queued|sending|delivered|failed|cancelled"
        json payload
        int appointment_id FK "nullable"
    }
    PasswordResetToken {
        int id PK
        int user_id FK
        string token UK
        datetime expires_at
        bool used
    }
```

## User identity state machine

A user account moves through these states. Registration through public API now creates a `GUEST/PENDING` row that an admin must approve.

```mermaid
stateDiagram-v2
    [*] --> PENDING: register (public)
    PENDING --> ACTIVE: admin approves<br/>(GUEST → CLIENT)
    PENDING --> SUSPENDED: admin rejects
    PENDING --> [*]: admin deletes
    ACTIVE --> SUSPENDED: admin suspends
    SUSPENDED --> ACTIVE: admin re-promotes (manual)
    ACTIVE --> CLOSED: account closure (future)
    note right of PENDING
      cannot authenticate
      until ACTIVE
    end note
```

The role transition `GUEST → CLIENT` happens during the `PENDING → ACTIVE` move (`UserAccess.promote_to_client`).

## Appointment state machine

This is the heart of the system. All transitions are recorded immutably in `AppointmentStatusLog`.

```mermaid
stateDiagram-v2
    [*] --> PENDING: client requests<br/>(AppointmentManager.request_appointment)

    PENDING --> ASSIGNED: agent accepts<br/>(accept_appointment)
    PENDING --> CANCELLED: client / admin cancels
    PENDING --> EXPIRED: scheduling timeout

    ASSIGNED --> CONFIRMED: agent confirms<br/>(confirm_appointment)
    ASSIGNED --> COMPLETED: agent completes directly<br/>(complete_appointment)
    ASSIGNED --> REJECTED: agent rejects<br/>(reject_appointment)
    ASSIGNED --> CANCELLED: cancelled

    CONFIRMED --> COMPLETED: agent completes
    CONFIRMED --> CANCELLED: cancelled

    REJECTED --> PENDING: re-matching<br/>(other agents available)
    REJECTED --> EXPIRED: no other agents

    COMPLETED --> [*]
    CANCELLED --> [*]
    EXPIRED --> [*]
```

**Cancellable states**: `PENDING`, `ASSIGNED`, `CONFIRMED`. Once `COMPLETED`, `CANCELLED`, `EXPIRED`, or `REJECTED`, the appointment is terminal.

**Updatable states**: `PENDING` only. Once an agent has been involved (`ASSIGNED+`), changing slot/service requires cancelling and re-creating (the agent has been notified).

## Permission matrix per state

| Action | Client (owner) | Other client | Agent (assigned) | Other agent | Admin |
|---|---|---|---|---|---|
| Read RDV | ✓ | ✗ | ✓ | only PENDING | ✓ |
| Cancel | ✓ (≤CONFIRMED) | ✗ | ✓ (≤CONFIRMED) | ✗ | ✓ |
| Update | ✓ (PENDING) | ✗ | ✗ | ✗ | ✓ (PENDING) |
| Accept (PENDING) | ✗ | ✗ | only if eligible | only if eligible | ✗ |
| Confirm (ASSIGNED) | ✗ | ✗ | ✓ (own) | ✗ | ✗ |
| Complete | ✗ | ✗ | ✓ (own) | ✗ | ✓ |
| Reject (ASSIGNED) | ✗ | ✗ | ✓ (own) | ✗ | ✗ |

## Notification event types

Every domain event maps to one Celery task name `apps.notifications.tasks.handle_{event_type}`.

```mermaid
flowchart LR
    subgraph Events
        E1[appointment_requested]
        E2[appointment_assigned]
        E3[appointment_cancelled]
        E4[appointment_completed]
        E5[appointment_reminder]
        E6[service_updated]
        E7[account_verified]
        E8[password_reset_requested]
    end
    subgraph Channels
        EMAIL[Email]
        SMS[SMS - stub]
        IN_APP[In-app]
        PUSH[Push - stub]
    end
    Events --> CHAN_ADAPT[CHANNEL_ADAPTERS<br/>strategy registry]
    CHAN_ADAPT --> EMAIL
    CHAN_ADAPT --> SMS
    CHAN_ADAPT --> IN_APP
    CHAN_ADAPT --> PUSH
```

Adding a new channel = subclassing `BaseChannelAdapter`, registering it in `CHANNEL_ADAPTERS`. Zero changes elsewhere.

## Domain invariants

These are enforced by the access layer and tested:

1. **A client can have only one PENDING/ASSIGNED/CONFIRMED appointment** at a given `(service, scheduled_at)` (uniqueness via app-level check, not DB constraint).
2. **`unique_together(author, service)` on Review** — one review per client per service.
3. **`unique_together(agency, service)` on AgencyService** — a service is offered at an agency at most once.
4. **`unique_together(agent, agency_service)` on AgentAssignment** — an agent is assigned to a (service, agency) combo at most once.
5. **`Appointment.reference` is unique** — generated at creation as `BNA-YYYY-NNNNN` with retry on collision.
6. **All FKs use `on_delete=PROTECT`** by default — deletes are conscious decisions; soft state transitions (status changes) are preferred for audit.
