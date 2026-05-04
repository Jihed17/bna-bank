"""
Run the Gmail OAuth 2.0 consent flow once and print the refresh_token.

Usage:
    .venv/bin/python manage.py get_gmail_refresh_token

Requirements:
  - GMAIL_OAUTH_CLIENT_ID and GMAIL_OAUTH_CLIENT_SECRET in .env
  - In Google Cloud Console, the OAuth client (Web application type)
    must list this exact redirect URI under "Authorized redirect URIs":
        http://localhost:8765/

The command opens a browser, asks the Google account to authorise
gmail.send, and prints the refresh_token. Paste it into .env as
GMAIL_OAUTH_REFRESH_TOKEN, then restart the server.
"""

OAUTH_REDIRECT_PORT = 8765

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Mint a Gmail API refresh_token via browser consent (one-shot).'

    def handle(self, *args, **options):
        if not settings.GMAIL_OAUTH_CLIENT_ID or not settings.GMAIL_OAUTH_CLIENT_SECRET:
            raise CommandError(
                'GMAIL_OAUTH_CLIENT_ID and GMAIL_OAUTH_CLIENT_SECRET must be '
                'set in .env before running this command.'
            )

        try:
            from google_auth_oauthlib.flow import InstalledAppFlow
        except ImportError:
            raise CommandError(
                'google-auth-oauthlib is not installed. Run:\n'
                '  pip install -r requirements/development.txt'
            )

        redirect_uri = f'http://localhost:{OAUTH_REDIRECT_PORT}/'
        self.stdout.write(self.style.WARNING(
            f'Redirect URI must be allowlisted in Cloud Console: {redirect_uri}'
        ))

        flow = InstalledAppFlow.from_client_config(
            {
                'web': {
                    'client_id': settings.GMAIL_OAUTH_CLIENT_ID,
                    'client_secret': settings.GMAIL_OAUTH_CLIENT_SECRET,
                    'auth_uri': 'https://accounts.google.com/o/oauth2/auth',
                    'token_uri': 'https://oauth2.googleapis.com/token',
                    'redirect_uris': [redirect_uri],
                }
            },
            scopes=['https://www.googleapis.com/auth/gmail.send'],
        )

        creds = flow.run_local_server(
            port=OAUTH_REDIRECT_PORT,
            prompt='consent',
            access_type='offline',
            authorization_prompt_message=(
                'Opening browser for Gmail OAuth consent — '
                'approve the gmail.send scope.'
            ),
        )

        if not creds.refresh_token:
            raise CommandError(
                'Google did not return a refresh_token. This usually means '
                'the account has already approved this client. Revoke at '
                'https://myaccount.google.com/permissions and retry.'
            )

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Refresh token obtained:'))
        self.stdout.write('')
        self.stdout.write(f'  GMAIL_OAUTH_REFRESH_TOKEN={creds.refresh_token}')
        self.stdout.write('')
        self.stdout.write(
            'Paste the line above into bna-backend/.env, then restart '
            'the Django server.'
        )
