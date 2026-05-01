from .development import *  # noqa: F401,F403

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Let pytest's caplog capture records from our namespaced loggers.
# In production and development, propagation is off for 'bna.*' so log
# records reach only the configured JSON/verbose handler. In tests we
# need them to also bubble up to the root logger that caplog hooks.
for _logger in ('bna', 'celery', 'django'):
    LOGGING['loggers'][_logger]['propagate'] = True  # noqa: F405
