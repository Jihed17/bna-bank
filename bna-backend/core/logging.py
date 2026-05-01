from __future__ import annotations

import json
import logging
from datetime import datetime, timezone


class BNAJsonFormatter(logging.Formatter):
    """
    Formats log records as single-line JSON objects.
    Every record gets: timestamp, level, logger, message,
    and optionally: exc_info, extra fields added by the caller.

    Usage from any module:
        import logging
        logger = logging.getLogger('bna.appointments')
        logger.info('appointment_requested', extra={
            'appointment_ref': 'BNA-2024-00001',
            'client_id': 42,
        })
    """

    _RESERVED = frozenset({
        'args', 'created', 'exc_info', 'exc_text', 'filename',
        'funcName', 'levelname', 'levelno', 'lineno', 'message',
        'module', 'msecs', 'msg', 'name', 'pathname', 'process',
        'processName', 'relativeCreated', 'stack_info', 'thread',
        'threadName', 'taskName',
    })

    def format(self, record: logging.LogRecord) -> str:
        record.message = record.getMessage()

        payload: dict = {
            'timestamp': datetime.fromtimestamp(
                record.created, tz=timezone.utc,
            ).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.message,
        }

        for key, value in record.__dict__.items():
            if key not in self._RESERVED and not key.startswith('_'):
                payload[key] = value

        if record.exc_info:
            payload['exception'] = self.formatException(record.exc_info)
        if record.stack_info:
            payload['stack_info'] = self.formatStack(record.stack_info)

        return json.dumps(payload, ensure_ascii=False, default=str)


def get_logger(name: str) -> logging.Logger:
    """
    Return a logger namespaced under 'bna.{name}'.
    All BNA loggers are children of the 'bna' root logger defined
    in settings.LOGGING, so they inherit its handlers and level.

    Usage:
        from core.logging import get_logger
        logger = get_logger('appointments.manager')
        logger.info('appointment_requested', extra={'ref': 'BNA-2024-00042'})
    """
    return logging.getLogger(f'bna.{name}')


class AuditMixin:
    """
    Mixin that adds a single `_audit` classmethod.
    Emits a structured log entry at INFO level to 'bna.audit'.
    Never raises — log failures must not break business logic.
    """
    _audit_logger = logging.getLogger('bna.audit')

    @classmethod
    def _audit(
        cls,
        *,
        action: str,
        actor_id: int | None = None,
        target_id: int | None = None,
        extra: dict | None = None,
    ) -> None:
        try:
            cls._audit_logger.info(
                action,
                extra={
                    'action': action,
                    'actor_id': actor_id,
                    'target_id': target_id,
                    **(extra or {}),
                },
            )
        except Exception:
            pass
