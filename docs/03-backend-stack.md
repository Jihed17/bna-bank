# 03 — Backend stack

Django 4 + DRF + JWT, async tasks via Celery + Redis. Five Django apps, one per domain.

## Project layout

```
bna-backend/
├── config/                       # Django project package
│   ├── settings/
│   │   ├── base.py              # shared (DB, JWT, Celery, logging, CORS)
│   │   ├── development.py       # DEBUG=True, console email
│   │   ├── production.py        # SMTP, HSTS, secure cookies
│   │   └── test.py              # CELERY_ALWAYS_EAGER=True
│   ├── urls.py                  # mounts /api/* and /admin/
│   ├── celery.py                # Celery app
│   └── __init__.py              # exports celery_app
├── apps/
│   ├── identity/                # User + PasswordResetToken
│   ├── services/                # Service + Agency + AgencyService + AgentAssignment
│   ├── appointments/            # Appointment + AppointmentStatusLog (+ Engines)
│   ├── notifications/           # Notification + Celery tasks (+ NotifyingEngine)
│   └── reviews/                 # Review
├── core/                        # cross-cutting utilities
│   ├── exceptions.py            # BNAException + DRF handler + status map
│   ├── permissions.py           # IsGuest / IsClient / IsAgent / IsAdmin / IsOwnerOrAdmin
│   ├── security.py              # BNATokenObtainPairSerializer
│   ├── events.py                # 8 frozen DomainEvent dataclasses
│   ├── publisher.py             # publish() → Celery send_task
│   ├── responses.py             # success() / created() / no_content()
│   └── logging.py               # JSON formatter + AuditMixin
├── manage.py
└── requirements/
```

Each app follows the same shape:

```
apps/{domain}/
├── models.py        # ResourceStorage
├── access.py        # ResourceAccess (the only file that touches the ORM for this domain)
├── managers.py      # Manager (use case orchestration)
├── engines/         # (when applicable) — scheduling, matching, notifying
├── views.py         # DRF APIView per use case
├── serializers.py   # input + output (separate classes)
├── urls.py          # one route per view
├── admin.py         # Django admin registration
├── tests/           # pytest unit + integration
└── migrations/
```

## URL surface

```mermaid
flowchart LR
    subgraph Public
        P1["/api/health/"]
        P2["/api/auth/token/<br/>/api/auth/token/refresh/"]
        P3["/api/identity/register/<br/>/api/identity/login/<br/>/api/identity/password/reset/"]
        P4["/api/services/<br/>/api/services/:id/<br/>/api/services/agencies/<br/>/api/services/agencies/:id/"]
        P5["/api/appointments/slots/"]
        P6["/api/reviews/?service_id=N"]
    end
    subgraph Authenticated
        A1["/api/identity/profile/<br/>/api/identity/password/change/<br/>/api/identity/logout/"]
        A2["/api/appointments/<br/>/api/appointments/:id/<br/>/api/appointments/:id/cancel/<br/>/api/appointments/:id/update/"]
        A3["/api/appointments/:id/accept|reject|confirm|complete/"]
        A4["/api/appointments/schedule/<br/>/api/appointments/pending/"]
        A5["/api/notifications/<br/>/api/notifications/unread-count/<br/>/api/notifications/:id/read/"]
        A6["/api/reviews/me/<br/>/api/reviews/create/<br/>/api/reviews/:id/"]
    end
    subgraph "Admin only"
        AD1["/api/identity/users/<br/>/api/identity/pending-guests/<br/>/api/identity/users/:id/approve|reject|delete/"]
        AD2["/api/services/create|:id/update|:id/suspend|:id/reactivate/"]
        AD3["/api/services/agencies/create|:id/update|:id/close/"]
        AD4["/api/services/:id/agents/<br/>/api/services/:id/hours/"]
        AD5["/api/reviews/:id/hide/"]
    end
```

## Request flow — single API call

```mermaid
sequenceDiagram
    autonumber
    participant Client as Browser
    participant View as DRF View
    participant Manager
    participant Engine
    participant Access as ResourceAccess
    participant DB

    Client->>View: HTTP request + JWT
    View->>View: permission_classes gate (IsClient, IsAgent, …)
    View->>View: serializer.is_valid()
    View->>Manager: ManagerName.use_case(**validated_data)
    Manager->>Manager: domain permission check
    Manager->>Engine: validate_slot / find_eligible / dispatch
    Engine->>Access: read query
    Access->>DB: SELECT
    DB-->>Access: rows
    Access-->>Engine: domain objects
    Engine-->>Manager: result
    Manager->>Access: write
    Access->>DB: INSERT/UPDATE in transaction
    Manager->>Manager: publish(DomainEvent)  [optional]
    Manager-->>View: returned object
    View->>View: serialize → {"data": …}
    View-->>Client: 200/201
    Note over Manager: bna_exception_handler<br/>catches BNAException →<br/>{"error":"...", "code":"..."}
```

## End-to-end use case — client books an appointment

```mermaid
sequenceDiagram
    participant C as Client (browser)
    participant V as RequestAppointmentView
    participant AM as AppointmentManager
    participant SE as SchedulingEngine
    participant ME as MatchingEngine
    participant AA as AppointmentAccess
    participant PUB as core.publisher
    participant Q as Celery / Redis
    participant TASK as handle_appointment_requested
    participant NE as NotifyingEngine
    participant NA as NotificationAccess

    C->>V: POST /api/appointments/ {service_id, agency_id, scheduled_at, reason}
    V->>AM: request_appointment(client_id, service_id, agency_id, scheduled_at, reason)
    AM->>AM: _verify_client(client_id)
    AM->>SE: validate_slot()
    SE->>AA: get_appointments_in_slot()
    SE-->>AM: SlotValidationResult(is_valid=True)
    AM->>ME: find_eligible_agents()
    ME-->>AM: MatchingResult(agents=[…])
    AM->>AA: request_appointment(...)
    AA->>AA: insert + status log
    AA-->>AM: Appointment instance
    AM->>PUB: publish(AppointmentRequestedEvent)
    PUB->>Q: send_task("...handle_appointment_requested", payload)
    AM-->>V: appointment
    V-->>C: 201 {data: {...}}

    Note over Q,TASK: async, 30s polling

    Q->>TASK: deliver task
    TASK->>NE: dispatch_to_agents(payload)
    loop per eligible agent
        NE->>NA: enqueue_notification(IN_APP)
        NE->>NE: dispatch(notification_id)
        NE->>NA: mark_delivered
    end
    Note over C: poll /api/notifications/<br/>shows the new RDV in agent panels
```

## PubSub layer

```mermaid
flowchart TB
    subgraph "core.publisher"
        PUB[publish]
    end
    subgraph "Celery"
        BROKER[(Redis broker<br/>queue=notifications)]
        WORKER[Celery worker<br/>-Q notifications]
    end
    subgraph "apps.notifications.tasks"
        T1[handle_appointment_requested]
        T2[handle_appointment_assigned]
        T3[handle_appointment_cancelled]
        T4[handle_appointment_completed]
        T5[handle_service_updated]
        T6[handle_account_verified]
        T7[handle_password_reset_requested]
    end
    subgraph "Engine"
        NE[NotifyingEngine.dispatch]
    end

    PUB -->|send_task| BROKER
    BROKER --> WORKER
    WORKER --> T1
    WORKER --> T2
    WORKER --> T3
    WORKER --> T4
    WORKER --> T5
    WORKER --> T6
    WORKER --> T7
    T1 & T2 & T3 & T4 & T5 & T6 & T7 --> NE
```

The convention `apps.notifications.tasks.handle_{event_type}` is enforced by tests. Adding a new event = adding a dataclass to `core/events.py` and a `@shared_task` with the matching name.

## Security

```mermaid
flowchart LR
    LOGIN[POST /auth/token/] -->|email + password| BNAS[BNATokenObtainPairSerializer]
    BNAS -->|delegates| UA[UserAccess.authenticate]
    UA -->|on success| TOK[(access + refresh JWT)]
    TOK -->|claims| C[role, status, email, full_name<br/>+ user_id]

    REQ[any /api/* request] --> JWT[JWTAuthentication]
    JWT --> PERM[permission_classes<br/>IsClient / IsAgent / IsAdmin]
    PERM --> M[Manager]
    M --> DOM[domain permission check<br/>raises PermissionError]
    DOM --> RESP[bna_exception_handler<br/>→ 403 PermissionDenied]

    REFRESH[POST /auth/token/refresh/] -->|rotates| TOK2[(new access + refresh)]
    REFRESH -->|blacklists old| BL[(token_blacklist table)]
```

- **Access token**: 60 min, embeds `role` + `status` claims so permission classes don't hit the DB.
- **Refresh token**: 7 days, rotated and blacklisted on every refresh.
- **Custom serializer**: `BNATokenObtainPairSerializer` accepts `email` (not `username`) and reuses `UserAccess.authenticate` so the "active account check" lives in one place.

## Logging

`core.logging.BNAJsonFormatter` outputs JSON in production (parseable by Datadog/ELK) and a verbose human format in dev. Every Manager and Access class includes `AuditMixin._audit(action, actor_id, target_id, extra={…})` for sensitive writes — appointments, role changes, password resets, deletions.

```python
# apps/appointments/access.py
class AppointmentAccess(AuditMixin):
    @staticmethod
    def cancel_appointment(...):
        ... # write
        AppointmentAccess._audit(
            action='appointment_cancelled',
            actor_id=cancelled_by_id,
            target_id=appointment_id,
            extra={'reason': reason},
        )
```

`AuditMixin._audit` swallows all exceptions — logging never breaks business logic.

## Tests

191 backend tests via `pytest-django`. Run with:

```bash
DJANGO_SETTINGS_MODULE=config.settings.test .venv/bin/python -m pytest -q
```

The `test.py` settings turn on `CELERY_TASK_ALWAYS_EAGER=True` so events are processed synchronously without a real worker, and propagate `bna.*` loggers to root so `caplog` captures audit records.

Test categories:

| Layer | Tests cover |
|---|---|
| ResourceAccess | every verb, every error path |
| Engines | slot validation, conflict detection, calendar building, matching, channel adapters, retry on adapter failure |
| Managers | use-case happy paths + permission denials + state transition rules |
| Views | full HTTP envelope: 200 / 201 / 204 / 400 / 401 / 403 / 404 / 409 |
| PubSub | every event class is registered to a Celery task with the right name |
