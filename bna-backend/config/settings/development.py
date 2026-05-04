from .base import *  # noqa: F401,F403

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']

try:
    import debug_toolbar  # noqa: F401

    INSTALLED_APPS += ['debug_toolbar']  # noqa: F405
    MIDDLEWARE = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE  # noqa: F405
    INTERNAL_IPS = ['127.0.0.1']
except ImportError:
    pass

from decouple import config  # noqa: E402

# Celery — in dev, run tasks inline by default (no Redis required).
# Set CELERY_EAGER=False in .env + run Redis + a worker if you want to
# exercise the real async flow (e.g. testing retry behaviour).
CELERY_TASK_ALWAYS_EAGER = config('CELERY_EAGER', default=True, cast=bool)
CELERY_TASK_EAGER_PROPAGATES = False  # never let a notif failure break the API

# Email — defaults to the console backend (emails print to the Celery worker
# logs). To send real emails locally, set EMAIL_HOST in the .env file and
# the SMTP backend kicks in automatically. Convenient for Gmail / Mailtrap.
_EMAIL_HOST = config('EMAIL_HOST', default='')
if _EMAIL_HOST:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = _EMAIL_HOST
    EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
    EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
    EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=False, cast=bool)
    EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@bna-dev.tn')

# Gmail OAuth 2.0 — read once here, consumed by the EmailAdapter when all
# four values are present. Without a refresh_token the adapter falls back
# to whatever EMAIL_BACKEND is configured above (console or SMTP).
GMAIL_OAUTH_CLIENT_ID = config('GMAIL_OAUTH_CLIENT_ID', default='')
GMAIL_OAUTH_CLIENT_SECRET = config('GMAIL_OAUTH_CLIENT_SECRET', default='')
GMAIL_OAUTH_REFRESH_TOKEN = config('GMAIL_OAUTH_REFRESH_TOKEN', default='')
GMAIL_OAUTH_SENDER = config('GMAIL_OAUTH_SENDER', default='')
