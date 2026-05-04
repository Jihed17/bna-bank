from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from core.security import BNATokenObtainPairSerializer


class BNATokenObtainPairView(TokenObtainPairView):
    serializer_class = BNATokenObtainPairSerializer


urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT infrastructure — not routed through a Manager
    path('api/auth/token/', BNATokenObtainPairView.as_view(), name='token_obtain'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Domain Managers (populated from Phase 6 onward)
    path('api/identity/', include('apps.identity.urls')),
    path('api/appointments/', include('apps.appointments.urls')),
    path('api/services/', include('apps.services.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/reviews/', include('apps.reviews.urls')),

    # Health check
    path('api/health/', include('core.urls')),
]

if settings.DEBUG:
    # Serve uploaded media (identity scans, …) through Django's staticfiles
    # in dev. In prod, a real reverse proxy (nginx) should serve MEDIA_ROOT
    # directly with proper auth — these files are sensitive.
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG and 'debug_toolbar' in settings.INSTALLED_APPS:
    import debug_toolbar  # noqa: F401

    urlpatterns = [path('__debug__/', include('debug_toolbar.urls'))] + urlpatterns
