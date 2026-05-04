import os

from celery import Celery
from celery.utils.log import get_task_logger

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('bna')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

logger = get_task_logger(__name__)


app.conf.beat_schedule = {
    # Hourly scan for RDVs starting in ~24h that haven't been reminded yet.
    'scan-appointment-reminders': {
        'task': 'apps.notifications.tasks.scan_appointment_reminders',
        'schedule': 60 * 60,  # every hour
        'options': {'queue': 'notifications'},
    },
}


@app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """Periodic tasks are declared via app.conf.beat_schedule above."""
    pass
