from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notifications'
    label = 'notifications'

    def ready(self):
        # Register Celery tasks at Django startup so they are
        # discoverable without waiting for Celery's lazy finalize.
        from . import tasks  # noqa: F401
