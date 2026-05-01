from django.urls import path

from apps.services.views import (
    AgencyCloseView,
    AgencyCreateView,
    AgencyDetailView,
    AgencyListView,
    AgencyUpdateView,
    AgentAssignView,
    AgentRemoveView,
    ServiceCreateView,
    ServiceDetailView,
    ServiceHoursView,
    ServiceListView,
    ServiceReactivateView,
    ServiceSuspendView,
    ServiceUpdateView,
)

urlpatterns = [
    # Public service catalog
    path('', ServiceListView.as_view(), name='service-list'),

    # Admin service management (specific paths before int-converter route)
    path('create/', ServiceCreateView.as_view(), name='service-create'),

    # Public agency catalog (must precede <int:service_id>/ so 'agencies' is not misrouted)
    path('agencies/', AgencyListView.as_view(), name='agency-list'),
    path('agencies/create/', AgencyCreateView.as_view(), name='agency-create'),
    path('agencies/<int:agency_id>/', AgencyDetailView.as_view(), name='agency-detail'),
    path('agencies/<int:agency_id>/update/', AgencyUpdateView.as_view(), name='agency-update'),
    path('agencies/<int:agency_id>/close/', AgencyCloseView.as_view(), name='agency-close'),

    # Service detail + admin writes (int converter only matches digits)
    path('<int:service_id>/', ServiceDetailView.as_view(), name='service-detail'),
    path('<int:service_id>/update/', ServiceUpdateView.as_view(), name='service-update'),
    path('<int:service_id>/suspend/', ServiceSuspendView.as_view(), name='service-suspend'),
    path('<int:service_id>/reactivate/', ServiceReactivateView.as_view(), name='service-reactivate'),
    path('<int:service_id>/agents/', AgentAssignView.as_view(), name='service-assign-agent'),
    path('<int:service_id>/agents/remove/', AgentRemoveView.as_view(), name='service-remove-agent'),
    path('<int:service_id>/hours/', ServiceHoursView.as_view(), name='service-hours'),
]
