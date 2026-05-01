import os

from celery import Celery
from celery.utils.log import get_task_logger

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('bna')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

logger = get_task_logger(__name__)


@app.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    """
    Periodic tasks registered here in Phase 3.
    NotifyingEngine dispatch tasks added in Phase 4.
    """
    pass
