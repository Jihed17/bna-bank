from __future__ import annotations

from django.db import transaction

from core.exceptions import (
    AgencyNotFound,
    AgentAlreadyAssigned,
    AgentNotAssigned,
    ServiceNotFound,
)

from .models import Agency, AgencyService, AgentAssignment, Service


class ServiceAccess:
    """
    Resource Access for the service catalog.
    All ORM operations on Service go through this class.
    """

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
        created_by_id: int | None = None,
    ) -> Service:
        with transaction.atomic():
            service = Service.objects.create(
                name=name.strip(),
                description=description.strip(),
                category=category,
                type=type,
                duration_minutes=duration_minutes,
                icon=icon,
                order=order,
                is_active=True,
                created_by_id=created_by_id,
            )
        return service

    @staticmethod
    def suspend_service(*, service_id: int) -> Service:
        try:
            service = Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            raise ServiceNotFound()

        with transaction.atomic():
            service.is_active = False
            service.save(update_fields=['is_active', 'updated_at'])

        return service

    @staticmethod
    def reactivate_service(*, service_id: int) -> Service:
        try:
            service = Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            raise ServiceNotFound()

        with transaction.atomic():
            service.is_active = True
            service.save(update_fields=['is_active', 'updated_at'])

        return service

    @staticmethod
    def update_service_config(
        *,
        service_id: int,
        name: str | None = None,
        description: str | None = None,
        category: str | None = None,
        type: str | None = None,
        duration_minutes: int | None = None,
        icon: str | None = None,
        order: int | None = None,
    ) -> Service:
        try:
            service = Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            raise ServiceNotFound()

        updated_fields = ['updated_at']
        for field, value in {
            'name': name,
            'description': description,
            'category': category,
            'type': type,
            'duration_minutes': duration_minutes,
            'icon': icon,
            'order': order,
        }.items():
            if value is not None:
                setattr(service, field, value)
                updated_fields.append(field)

        with transaction.atomic():
            service.save(update_fields=updated_fields)

        return service

    @staticmethod
    def get_available_services(
        *,
        category: str | None = None,
        agency_id: int | None = None,
    ) -> list[Service]:
        qs = Service.objects.filter(is_active=True).order_by('order', 'name')

        if category:
            qs = qs.filter(category=category)

        if agency_id:
            qs = qs.filter(
                agency_services__agency_id=agency_id,
                agency_services__is_active=True,
            ).distinct()

        return list(qs)

    @staticmethod
    def get_service(*, service_id: int) -> Service:
        try:
            return Service.objects.get(pk=service_id)
        except Service.DoesNotExist:
            raise ServiceNotFound()

    @staticmethod
    def assign_agent(
        *,
        agent_id: int,
        service_id: int,
        agency_id: int,
        assigned_by_id: int | None = None,
    ) -> AgentAssignment:
        try:
            agency_service = AgencyService.objects.get(
                agency_id=agency_id,
                service_id=service_id,
            )
        except AgencyService.DoesNotExist:
            if not Agency.objects.filter(pk=agency_id).exists():
                raise AgencyNotFound()
            if not Service.objects.filter(pk=service_id).exists():
                raise ServiceNotFound()
            with transaction.atomic():
                agency_service = AgencyService.objects.create(
                    agency_id=agency_id,
                    service_id=service_id,
                )

        if AgentAssignment.objects.filter(
            agent_id=agent_id,
            agency_service=agency_service,
        ).exists():
            raise AgentAlreadyAssigned()

        with transaction.atomic():
            assignment = AgentAssignment.objects.create(
                agent_id=agent_id,
                agency_service=agency_service,
                is_active=True,
                assigned_by_id=assigned_by_id,
            )

        return assignment

    @staticmethod
    def remove_agent(
        *,
        agent_id: int,
        service_id: int,
        agency_id: int,
    ) -> None:
        try:
            assignment = AgentAssignment.objects.get(
                agent_id=agent_id,
                agency_service__service_id=service_id,
                agency_service__agency_id=agency_id,
                is_active=True,
            )
        except AgentAssignment.DoesNotExist:
            raise AgentNotAssigned()

        with transaction.atomic():
            assignment.is_active = False
            assignment.save(update_fields=['is_active', 'updated_at'])


class AgencyAccess:
    """
    Resource Access for the agency catalog.
    All ORM operations on Agency go through this class.
    """

    @staticmethod
    def open_agency(
        *,
        name: str,
        address: str,
        city: str,
        postal_code: str = '',
        phone: str = '',
        email: str = '',
        latitude=None,
        longitude=None,
        capacity: int = 1,
    ) -> Agency:
        with transaction.atomic():
            agency = Agency.objects.create(
                name=name.strip(),
                address=address.strip(),
                city=city.strip(),
                postal_code=postal_code.strip(),
                phone=phone.strip(),
                email=email.strip(),
                latitude=latitude,
                longitude=longitude,
                capacity=capacity,
                status=Agency.Status.OPEN,
            )
        return agency

    @staticmethod
    def close_agency(*, agency_id: int) -> Agency:
        try:
            agency = Agency.objects.get(pk=agency_id)
        except Agency.DoesNotExist:
            raise AgencyNotFound()

        with transaction.atomic():
            agency.status = Agency.Status.CLOSED
            agency.save(update_fields=['status', 'updated_at'])

        return agency

    @staticmethod
    def update_agency(
        *,
        agency_id: int,
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
        try:
            agency = Agency.objects.get(pk=agency_id)
        except Agency.DoesNotExist:
            raise AgencyNotFound()

        updated_fields = ['updated_at']
        for field, value in {
            'name': name,
            'address': address,
            'city': city,
            'postal_code': postal_code,
            'phone': phone,
            'email': email,
            'latitude': latitude,
            'longitude': longitude,
            'capacity': capacity,
        }.items():
            if value is not None:
                setattr(agency, field, value)
                updated_fields.append(field)

        with transaction.atomic():
            agency.save(update_fields=updated_fields)

        return agency

    @staticmethod
    def get_agencies_by_service(*, service_id: int) -> list[Agency]:
        return list(
            Agency.objects.filter(
                status=Agency.Status.OPEN,
                agency_services__service_id=service_id,
                agency_services__is_active=True,
            )
            .distinct()
            .order_by('city', 'name')
        )

    @staticmethod
    def get_agency(*, agency_id: int) -> Agency:
        try:
            return Agency.objects.select_related().get(pk=agency_id)
        except Agency.DoesNotExist:
            raise AgencyNotFound()

    @staticmethod
    def get_all_agencies(*, status: str | None = None) -> list[Agency]:
        qs = Agency.objects.all().order_by('city', 'name')
        if status:
            qs = qs.filter(status=status)
        return list(qs)

    @staticmethod
    def configure_agency_service_hours(
        *,
        agency_id: int,
        service_id: int,
        schedule: dict,
    ) -> AgencyService:
        if not Agency.objects.filter(pk=agency_id).exists():
            raise AgencyNotFound()
        if not Service.objects.filter(pk=service_id).exists():
            raise ServiceNotFound()

        allowed_fields = {
            f'{day}_{bound}'
            for day in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
            for bound in ['open', 'close']
        }
        clean_schedule = {k: v for k, v in schedule.items() if k in allowed_fields}

        with transaction.atomic():
            agency_service, _ = AgencyService.objects.get_or_create(
                agency_id=agency_id,
                service_id=service_id,
            )
            for field, value in clean_schedule.items():
                setattr(agency_service, field, value)
            agency_service.save()

        return agency_service
