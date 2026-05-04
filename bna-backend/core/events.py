from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class DomainEvent:
    """
    Base class for all BNA domain events.
    frozen=True enforces immutability — events are facts, not mutable objects.
    """
    event_type: str
    occurred_at: str  # ISO 8601 — always UTC


# ── Appointment events ─────────────────────────────────────────────────────

@dataclass(frozen=True)
class AppointmentRequestedEvent(DomainEvent):
    """
    Published by AppointmentManager.request_appointment().
    Subscriber: dispatch email/SMS/in-app to all eligible agents.
    """
    event_type: str = field(default='appointment_requested', init=False)
    appointment_id: int = 0
    appointment_ref: str = ''
    client_id: int = 0
    client_full_name: str = ''
    service_id: int = 0
    service_name: str = ''
    agency_id: int = 0
    agency_name: str = ''
    scheduled_at: str = ''
    reason: str = ''
    eligible_agent_ids: list = field(default_factory=list)


@dataclass(frozen=True)
class AppointmentAssignedEvent(DomainEvent):
    """
    Published by AppointmentManager.accept_appointment().
    Subscriber: notify the client their appointment has an agent.
    """
    event_type: str = field(default='appointment_assigned', init=False)
    appointment_id: int = 0
    appointment_ref: str = ''
    client_id: int = 0
    agent_id: int = 0
    agent_full_name: str = ''
    service_name: str = ''
    agency_name: str = ''
    scheduled_at: str = ''


@dataclass(frozen=True)
class AppointmentCancelledEvent(DomainEvent):
    """
    Published by AppointmentManager.cancel_appointment().
    Subscriber: notify the other party (agent if client cancelled,
    client if agent cancelled).
    """
    event_type: str = field(default='appointment_cancelled', init=False)
    appointment_id: int = 0
    appointment_ref: str = ''
    cancelled_by_id: int = 0
    client_id: int = 0
    agent_id: int | None = None
    service_name: str = ''
    scheduled_at: str = ''
    reason: str = ''


@dataclass(frozen=True)
class AppointmentCompletedEvent(DomainEvent):
    """
    Published by AppointmentManager.complete_appointment().
    Subscriber: send satisfaction survey or closing notification.
    """
    event_type: str = field(default='appointment_completed', init=False)
    appointment_id: int = 0
    appointment_ref: str = ''
    client_id: int = 0
    agent_id: int = 0
    service_name: str = ''


# ── Service events ─────────────────────────────────────────────────────────

@dataclass(frozen=True)
class ServiceUpdatedEvent(DomainEvent):
    """
    Published by ServiceManager on any catalog change.
    Subscriber: in-app notification to agents affected by the change.
    """
    event_type: str = field(default='service_updated', init=False)
    service_id: int = 0
    service_name: str = ''
    change_type: str = ''  # 'published' | 'suspended' | 'updated'
    changed_by_id: int = 0


# ── Identity events ────────────────────────────────────────────────────────

@dataclass(frozen=True)
class AccountVerifiedEvent(DomainEvent):
    """
    Published by IdentityManager.promote_to_client().
    Subscriber: send welcome email to the newly promoted client.
    """
    event_type: str = field(default='account_verified', init=False)
    user_id: int = 0
    email: str = ''
    full_name: str = ''


@dataclass(frozen=True)
class PasswordResetRequestedEvent(DomainEvent):
    """
    Published by IdentityManager.request_password_reset().
    Subscriber: send the reset link via email.
    """
    event_type: str = field(default='password_reset_requested', init=False)
    user_id: int = 0
    email: str = ''
    reset_token: str = ''
    reset_url: str = ''


@dataclass(frozen=True)
class AppointmentReminderDueEvent(DomainEvent):
    """
    Published by the periodic reminder beat task for each upcoming RDV
    in the next ~24h that hasn't already been reminded.
    Subscriber: send IN_APP + EMAIL reminder to the client.
    """
    event_type: str = field(default='appointment_reminder_due', init=False)
    appointment_id: int = 0
    appointment_ref: str = ''
    client_id: int = 0
    service_name: str = ''
    agency_name: str = ''
    scheduled_at: str = ''


@dataclass(frozen=True)
class EmailVerificationRequestedEvent(DomainEvent):
    """
    Published by IdentityManager.register_pending_guest().
    Subscriber: send the verification link via email so the user can
    self-promote without admin involvement.
    """
    event_type: str = field(default='email_verification_requested', init=False)
    user_id: int = 0
    email: str = ''
    full_name: str = ''
    verification_token: str = ''
    verification_url: str = ''


@dataclass(frozen=True)
class RegistrationSubmittedEvent(DomainEvent):
    """
    Published by IdentityManager.register_pending_guest().
    Subscriber: acknowledge to the user, alert admins.
    """
    event_type: str = field(default='registration_submitted', init=False)
    user_id: int = 0
    email: str = ''
    full_name: str = ''


@dataclass(frozen=True)
class PasswordChangedEvent(DomainEvent):
    """
    Published by IdentityManager.change_password().
    Subscriber: confirm to the user that their password was changed.
    """
    event_type: str = field(default='password_changed', init=False)
    user_id: int = 0
    email: str = ''


@dataclass(frozen=True)
class LoginNewDeviceEvent(DomainEvent):
    """
    Published by IdentityManager.authenticate() when the request IP or
    user-agent differs from the last successful login.
    Subscriber: alert the user via email.
    """
    event_type: str = field(default='login_new_device', init=False)
    user_id: int = 0
    email: str = ''
    ip_address: str = ''
    user_agent: str = ''
