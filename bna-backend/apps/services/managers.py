from __future__ import annotations

from apps.identity.access import UserAccess
from apps.identity.models import User
from apps.services.access import AgencyAccess, ServiceAccess
from apps.services.models import Agency, AgencyService, AgentAssignment, Service
from core.events import ServiceUpdatedEvent
from core.exceptions import UserNotFound
from core.logging import AuditMixin, get_logger
from core.publisher import now_iso, publish

logger = get_logger('services.manager')


class ServiceManager(AuditMixin):
    """
    Orchestrates admin-facing service catalog and agency configuration.

    Volatile area: admin approval workflows, service type taxonomy,
    capacity rules, agent eligibility criteria — all change here only.

    Called by: AdminClient views (Phase 6).
              GuestClient and UserClient call the public read methods.
    Calls:     ServiceAccess, AgencyAccess, UserAccess (permission checks),
               PubSub publisher.
    Never:     calls AppointmentManager or IdentityManager directly.
    """

    # ── Service write operations (admin only) ────────────────────────────────

    @staticmethod
    def publish_service(
        *,
        name: str,
        description: str = '',
        category: str,
        type: str,
        duration_minutes: int = 30,
        icon: str = '',
        order: int = 0,
        admin_id: int,
    ) -> Service:
        """Create and activate a new service. Publishes a `published` event."""
        ServiceManager._verify_admin(admin_id=admin_id)

        service = ServiceAccess.publish_service(
            name=name,
            description=description,
            category=category,
            type=type,
            duration_minutes=duration_minutes,
            icon=icon,
            order=order,
            created_by_id=admin_id,
        )

        publish(ServiceUpdatedEvent(
            occurred_at=now_iso(),
            service_id=service.pk,
            service_name=service.name,
            change_type='published',
            changed_by_id=admin_id,
        ))

        ServiceManager._audit(
            action='service_published',
            actor_id=admin_id,
            target_id=service.pk,
            extra={'service_name': service.name},
        )

        logger.info(
            'service_published',
            extra={
                'service_id': service.pk,
                'service_name': service.name,
                'by': admin_id,
            },
        )

        return service

    @staticmethod
    def suspend_service(*, service_id: int, admin_id: int) -> Service:
        """
        Deactivate a service. Does NOT cancel existing appointments —
        that is AppointmentManager's domain.
        """
        ServiceManager._verify_admin(admin_id=admin_id)

        service = ServiceAccess.suspend_service(service_id=service_id)

        publish(ServiceUpdatedEvent(
            occurred_at=now_iso(),
            service_id=service.pk,
            service_name=service.name,
            change_type='suspended',
            changed_by_id=admin_id,
        ))

        ServiceManager._audit(
            action='service_suspended',
            actor_id=admin_id,
            target_id=service_id,
        )

        logger.info(
            'service_suspended',
            extra={'service_id': service_id, 'by': admin_id},
        )

        return service

    @staticmethod
    def reactivate_service(*, service_id: int, admin_id: int) -> Service:
        """Reactivate a suspended service."""
        ServiceManager._verify_admin(admin_id=admin_id)

        service = ServiceAccess.reactivate_service(service_id=service_id)

        publish(ServiceUpdatedEvent(
            occurred_at=now_iso(),
            service_id=service.pk,
            service_name=service.name,
            change_type='reactivated',
            changed_by_id=admin_id,
        ))

        ServiceManager._audit(
            action='service_reactivated',
            actor_id=admin_id,
            target_id=service_id,
        )

        return service

    @staticmethod
    def update_service_config(
        *,
        service_id: int,
        admin_id: int,
        name: str | None = None,
        description: str | None = None,
        category: str | None = None,
        type: str | None = None,
        duration_minutes: int | None = None,
        icon: str | None = None,
        order: int | None = None,
    ) -> Service:
        """Update mutable fields on an existing service."""
        ServiceManager._verify_admin(admin_id=admin_id)

        service = ServiceAccess.update_service_config(
            service_id=service_id,
            name=name,
            description=description,
            category=category,
            type=type,
            duration_minutes=duration_minutes,
            icon=icon,
            order=order,
        )

        publish(ServiceUpdatedEvent(
            occurred_at=now_iso(),
            service_id=service.pk,
            service_name=service.name,
            change_type='updated',
            changed_by_id=admin_id,
        ))

        ServiceManager._audit(
            action='service_updated',
            actor_id=admin_id,
            target_id=service_id,
        )

        return service

    # ── Agency write operations (admin only) ─────────────────────────────────

    @staticmethod
    def open_agency(
        *,
        name: str,
        address: str,
        city: str,
        admin_id: int,
        postal_code: str = '',
        phone: str = '',
        email: str = '',
        latitude=None,
        longitude=None,
        capacity: int = 1,
    ) -> Agency:
        """Create a new agency in OPEN status."""
        ServiceManager._verify_admin(admin_id=admin_id)

        agency = AgencyAccess.open_agency(
            name=name,
            address=address,
            city=city,
            postal_code=postal_code,
            phone=phone,
            email=email,
            latitude=latitude,
            longitude=longitude,
            capacity=capacity,
        )

        ServiceManager._audit(
            action='agency_opened',
            actor_id=admin_id,
            target_id=agency.pk,
            extra={'agency_name': agency.name, 'city': city},
        )

        logger.info(
            'agency_opened',
            extra={
                'agency_id': agency.pk,
                'agency_name': agency.name,
                'city': city,
                'by': admin_id,
            },
        )

        return agency

    @staticmethod
    def close_agency(*, agency_id: int, admin_id: int) -> Agency:
        """
        Close an agency. Existing appointments remain — cancelling them
        is a separate admin decision handled by AppointmentManager.
        """
        ServiceManager._verify_admin(admin_id=admin_id)

        agency = AgencyAccess.close_agency(agency_id=agency_id)

        ServiceManager._audit(
            action='agency_closed',
            actor_id=admin_id,
            target_id=agency_id,
        )

        logger.info(
            'agency_closed',
            extra={'agency_id': agency_id, 'by': admin_id},
        )

        return agency

    @staticmethod
    def update_agency(
        *,
        agency_id: int,
        admin_id: int,
        name: str | None = None,
        address: str | None = None,
        city: str | None = None,
        postal_code: str | None = None,
        phone: str | None = None,
        email: str | None = None,
        latitude=None,
        longitude=None,
        capacity: int | None = None,
    ) -> Agency:
        """Update mutable fields on an agency."""
        ServiceManager._verify_admin(admin_id=admin_id)

        return AgencyAccess.update_agency(
            agency_id=agency_id,
            name=name,
            address=address,
            city=city,
            postal_code=postal_code,
            phone=phone,
            email=email,
            latitude=latitude,
            longitude=longitude,
            capacity=capacity,
        )

    # ── Agent assignment operations (admin only) ─────────────────────────────

    @staticmethod
    def assign_agent_to_service(
        *,
        agent_id: int,
        service_id: int,
        agency_id: int,
        admin_id: int,
    ) -> AgentAssignment:
        """
        Authorise an agent to handle a service at a specific agency.
        Verifies the target user has the AGENT role.

        An agent belongs to exactly one agency: the first assignment pins
        the agent's agency; subsequent assignments must reuse that agency.
        """
        ServiceManager._verify_admin(admin_id=admin_id)
        ServiceManager._verify_agent_for_agency(
            agent_id=agent_id,
            agency_id=agency_id,
        )

        assignment = ServiceAccess.assign_agent(
            agent_id=agent_id,
            service_id=service_id,
            agency_id=agency_id,
            assigned_by_id=admin_id,
        )

        ServiceManager._audit(
            action='agent_assigned_to_service',
            actor_id=admin_id,
            target_id=agent_id,
            extra={'service_id': service_id, 'agency_id': agency_id},
        )

        logger.info(
            'agent_assigned_to_service',
            extra={
                'agent_id': agent_id,
                'service_id': service_id,
                'agency_id': agency_id,
                'by': admin_id,
            },
        )

        return assignment

    @staticmethod
    def remove_agent_from_service(
        *,
        agent_id: int,
        service_id: int,
        agency_id: int,
        admin_id: int,
    ) -> None:
        """
        Deactivate an agent's assignment (soft delete). Existing confirmed
        appointments are unaffected.
        """
        ServiceManager._verify_admin(admin_id=admin_id)

        ServiceAccess.remove_agent(
            agent_id=agent_id,
            service_id=service_id,
            agency_id=agency_id,
        )

        ServiceManager._audit(
            action='agent_removed_from_service',
            actor_id=admin_id,
            target_id=agent_id,
            extra={'service_id': service_id, 'agency_id': agency_id},
        )

        logger.info(
            'agent_removed_from_service',
            extra={
                'agent_id': agent_id,
                'service_id': service_id,
                'agency_id': agency_id,
                'by': admin_id,
            },
        )

    @staticmethod
    def configure_service_hours(
        *,
        agency_id: int,
        service_id: int,
        schedule: dict,
        admin_id: int,
    ) -> AgencyService:
        """Set or update opening hours for a service at a specific agency."""
        ServiceManager._verify_admin(admin_id=admin_id)

        agency_service = AgencyAccess.configure_agency_service_hours(
            agency_id=agency_id,
            service_id=service_id,
            schedule=schedule,
        )

        ServiceManager._audit(
            action='service_hours_configured',
            actor_id=admin_id,
            target_id=agency_service.pk,
            extra={'agency_id': agency_id, 'service_id': service_id},
        )

        return agency_service

    # ── Public read operations (no permission check) ─────────────────────────

    @staticmethod
    def get_available_services(
        *,
        category: str | None = None,
        agency_id: int | None = None,
    ) -> list[Service]:
        """Return active services, optionally filtered. Public."""
        return ServiceAccess.get_available_services(
            category=category,
            agency_id=agency_id,
        )

    @staticmethod
    def get_service(*, service_id: int) -> Service:
        """Return a single service by PK. Public."""
        return ServiceAccess.get_service(service_id=service_id)

    @staticmethod
    def get_agencies(
        *,
        status: str | None = None,
        service_id: int | None = None,
    ) -> list[Agency]:
        """Return agencies, optionally filtered by status or service. Public."""
        if service_id is not None:
            return AgencyAccess.get_agencies_by_service(service_id=service_id)
        return AgencyAccess.get_all_agencies(status=status)

    @staticmethod
    def get_agency(*, agency_id: int) -> Agency:
        """Return a single agency by PK. Public."""
        return AgencyAccess.get_agency(agency_id=agency_id)

    # ── Private helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _verify_admin(*, admin_id: int) -> None:
        """Verify the given user exists and has the ADMIN role."""
        try:
            user = UserAccess.get_profile(user_id=admin_id)
        except UserNotFound:
            raise PermissionError('Administrateur introuvable.')

        if user.role != User.Role.ADMIN:
            raise PermissionError(
                'Seul un administrateur peut effectuer cette action.'
            )

    @staticmethod
    def _verify_agent(*, agent_id: int) -> None:
        """Verify the given user exists and has the AGENT role."""
        try:
            user = UserAccess.get_profile(user_id=agent_id)
        except UserNotFound:
            raise UserNotFound()

        if user.role != User.Role.AGENT:
            raise PermissionError(
                f"L'utilisateur {agent_id} n'a pas le rôle agent."
            )

    @staticmethod
    def _verify_agent_for_agency(*, agent_id: int, agency_id: int) -> None:
        """
        Verify the user is an agent eligible to work at this agency.
        Pins the agent to the agency on first assignment, otherwise
        rejects assignments that would attach them to a second agency.
        """
        try:
            user = UserAccess.get_profile(user_id=agent_id)
        except UserNotFound:
            raise UserNotFound()

        if user.role != User.Role.AGENT:
            raise PermissionError(
                f"L'utilisateur {agent_id} n'a pas le rôle agent."
            )

        if user.agency_id is None:
            UserAccess.set_agent_agency(user_id=agent_id, agency_id=agency_id)
        elif user.agency_id != agency_id:
            raise PermissionError(
                "Cet agent appartient déjà à une autre agence et ne peut "
                "pas être affecté à une seconde agence."
            )
