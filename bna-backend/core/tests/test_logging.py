import json
import logging

from core.exceptions import (
    AppointmentNotFound,
    EmailAlreadyRegistered,
    bna_exception_handler,
)
from core.logging import AuditMixin, BNAJsonFormatter, get_logger


class TestBNAJsonFormatter:

    def _capture_record(self, level, message, **extra):
        formatter = BNAJsonFormatter()
        record = logging.LogRecord(
            name='bna.test',
            level=level,
            pathname='',
            lineno=0,
            msg=message,
            args=(),
            exc_info=None,
        )
        for k, v in extra.items():
            setattr(record, k, v)
        return json.loads(formatter.format(record))

    def test_output_is_valid_json(self):
        payload = self._capture_record(logging.INFO, 'test_event')
        assert isinstance(payload, dict)

    def test_required_fields_present(self):
        payload = self._capture_record(logging.INFO, 'event')
        assert 'timestamp' in payload
        assert 'level' in payload
        assert 'logger' in payload
        assert 'message' in payload

    def test_extra_fields_included(self):
        payload = self._capture_record(
            logging.INFO,
            'appointment_requested',
            appointment_ref='BNA-2024-00001',
            client_id=42,
        )
        assert payload['appointment_ref'] == 'BNA-2024-00001'
        assert payload['client_id'] == 42

    def test_level_is_string(self):
        payload = self._capture_record(logging.WARNING, 'warn_event')
        assert payload['level'] == 'WARNING'


class TestGetLogger:

    def test_logger_is_namespaced(self):
        logger = get_logger('appointments.manager')
        assert logger.name == 'bna.appointments.manager'

    def test_logger_is_child_of_bna(self):
        logger = get_logger('services.access')
        assert logger.name.startswith('bna.')


class TestAuditMixin:

    def test_audit_does_not_raise_on_error(self):
        """AuditMixin._audit() must never propagate exceptions."""
        class BrokenLogger:
            def info(self, *a, **kw):
                raise RuntimeError('Logger exploded')

        class MyAccess(AuditMixin):
            _audit_logger = BrokenLogger()

        # Should not raise
        MyAccess._audit(action='test_action', actor_id=1, target_id=2)

    def test_audit_emits_structured_record(self, caplog):
        class MyAccess(AuditMixin):
            pass

        with caplog.at_level(logging.INFO, logger='bna.audit'):
            MyAccess._audit(
                action='test_event',
                actor_id=10,
                target_id=20,
                extra={'custom_field': 'value'},
            )

        assert len(caplog.records) >= 1
        record = caplog.records[-1]
        assert record.action == 'test_event'
        assert record.actor_id == 10


class TestExceptionHandler:

    def _make_context(self):
        class FakeView:
            pass

        return {'view': FakeView()}

    def test_domain_exception_returns_correct_status(self):
        response = bna_exception_handler(AppointmentNotFound(), self._make_context())
        assert response is not None
        assert response.status_code == 404
        assert response.data['code'] == 'AppointmentNotFound'
        assert 'error' in response.data

    def test_domain_exception_409_conflict(self):
        response = bna_exception_handler(EmailAlreadyRegistered(), self._make_context())
        assert response.status_code == 409
        assert response.data['code'] == 'EmailAlreadyRegistered'

    def test_unrecognised_exception_returns_500(self):
        """
        For truly unhandled exceptions (not BNAException, not DRF),
        DRF's handler returns None and we return 500.
        """
        response = bna_exception_handler(ValueError('boom'), self._make_context())
        assert response is not None
        assert response.status_code == 500
        assert response.data['code'] == 'InternalError'
