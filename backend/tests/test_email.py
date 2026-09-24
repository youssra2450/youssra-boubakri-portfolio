"""E-mail senders, the sender factory and contact forwarding (NotificationService)."""

import json
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from pathlib import Path
from typing import Any, ClassVar

import httpx
import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session, sessionmaker

from app.database.session import build_engine, build_session_factory
from app.models import ContactMessage
from app.services import email as email_module
from app.services.email import (
    RESEND_API_URL,
    NullEmailSender,
    OutgoingEmail,
    ResendEmailSender,
    SmtpEmailSender,
    build_email_sender,
)
from app.services.notification_service import ContactNotification, NotificationService
from tests.support import EMAIL_ENABLED, FakeEmailSender, make_settings

EMAIL = OutgoingEmail(
    sender="Portfolio <no-reply@portfolio.test>",
    recipient="owner@portfolio.test",
    subject="[Portfolio] Hello",
    text="Body",
    reply_to="visitor@example.com",
)


class FakeSmtp:
    """Stands in for ``smtplib.SMTP`` and records the conversation."""

    instances: ClassVar[list["FakeSmtp"]] = []

    def __init__(self, host: str, port: int, timeout: float) -> None:
        self.host, self.port, self.timeout = host, port, timeout
        self.calls: list[str] = []
        self.messages: list[EmailMessage] = []
        FakeSmtp.instances.append(self)

    def __enter__(self) -> "FakeSmtp":
        return self

    def __exit__(self, *_exc: object) -> None:
        self.calls.append("quit")

    def starttls(self, context: Any) -> None:
        self.calls.append("starttls")

    def login(self, username: str, password: str) -> None:
        self.calls.append(f"login:{username}")

    def send_message(self, message: EmailMessage) -> None:
        self.calls.append("send")
        self.messages.append(message)


@pytest.fixture
def fake_smtp(monkeypatch: pytest.MonkeyPatch) -> type[FakeSmtp]:
    FakeSmtp.instances = []
    monkeypatch.setattr(smtplib, "SMTP", FakeSmtp)
    return FakeSmtp


def test_smtp_sender_uses_starttls_login_and_reply_to(fake_smtp: type[FakeSmtp]) -> None:
    sender = SmtpEmailSender(host="smtp.test", port=587, username="user", password="pw", use_tls=True)

    assert sender.send(EMAIL) is True

    [client] = fake_smtp.instances
    assert (client.host, client.port) == ("smtp.test", 587)
    assert client.calls == ["starttls", "login:user", "send", "quit"]
    [message] = client.messages
    assert message["From"] == EMAIL.sender
    assert message["To"] == EMAIL.recipient
    assert message["Subject"] == EMAIL.subject
    assert message["Reply-To"] == "visitor@example.com"
    assert message.get_content().strip() == "Body"


def test_smtp_sender_without_tls_or_credentials(fake_smtp: type[FakeSmtp]) -> None:
    sender = SmtpEmailSender(host="localhost", port=25, use_tls=False)

    sender.send(OutgoingEmail(sender="a@b.test", recipient="c@d.test", subject="S", text="T"))

    [client] = fake_smtp.instances
    assert client.calls == ["send", "quit"]
    assert client.messages[0]["Reply-To"] is None


def test_resend_sender_posts_the_email() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"id": "email-id"})

    sender = ResendEmailSender(api_key="re_test_key", transport=httpx.MockTransport(handler))

    assert sender.send(EMAIL) is True
    [request] = requests
    assert str(request.url) == RESEND_API_URL
    assert request.headers["authorization"] == "Bearer re_test_key"
    assert json.loads(request.content) == {
        "from": EMAIL.sender,
        "to": [EMAIL.recipient],
        "subject": EMAIL.subject,
        "text": EMAIL.text,
        "reply_to": EMAIL.reply_to,
    }


def test_resend_sender_raises_on_api_errors() -> None:
    sender = ResendEmailSender(
        api_key="re_test_key", transport=httpx.MockTransport(lambda _request: httpx.Response(422))
    )

    with pytest.raises(httpx.HTTPStatusError):
        sender.send(OutgoingEmail(sender="a@b.test", recipient="c@d.test", subject="S", text="T"))


def test_null_sender_discards() -> None:
    assert NullEmailSender().send(EMAIL) is False


def test_factory_selects_the_configured_provider() -> None:
    assert isinstance(build_email_sender(make_settings()), NullEmailSender)
    assert isinstance(build_email_sender(make_settings(email_provider="smtp")), NullEmailSender)

    smtp = build_email_sender(make_settings(**EMAIL_ENABLED, smtp_port=2525, smtp_use_tls=False))
    assert isinstance(smtp, SmtpEmailSender)
    assert (smtp.host, smtp.port, smtp.use_tls) == ("smtp.portfolio.test", 2525, False)

    resend = build_email_sender(
        make_settings(**{**EMAIL_ENABLED, "email_provider": "resend", "resend_api_key": "re_key"})
    )
    assert isinstance(resend, ResendEmailSender)
    assert resend.api_key == "re_key"
    assert email_module.DEFAULT_TIMEOUT_SECONDS > 0


# NotificationService --------------------------------------------------------------------------------------


def _store_message(db: Session) -> ContactNotification:
    message = ContactMessage(
        name="Jane Doe", email="jane@example.com", subject="Opportunity", message="Hello there, let us talk."
    )
    db.add(message)
    db.commit()
    return ContactNotification(
        message_id=message.id,
        name=message.name,
        email=message.email,
        subject=message.subject,
        message=message.message,
        created_at=datetime(2026, 9, 22, 12, 0, tzinfo=timezone.utc),
    )


def _service(sender: Any, factory: sessionmaker[Session]) -> NotificationService:
    return NotificationService(
        sender, email_from="from@portfolio.test", email_to="owner@portfolio.test", session_factory=factory
    )


def _forwarded(db: Session, message_id: int) -> bool:
    db.expire_all()
    return bool(db.scalar(select(ContactMessage.email_forwarded).where(ContactMessage.id == message_id)))


def test_forwarding_marks_the_message(db: Session, session_factory: sessionmaker[Session]) -> None:
    notification = _store_message(db)
    sender = FakeEmailSender()

    assert _service(sender, session_factory).forward_contact_message(notification) is True

    assert _forwarded(db, notification.message_id) is True
    [email] = sender.sent
    assert email.reply_to == "jane@example.com"
    assert email.recipient == "owner@portfolio.test"
    assert "Received: 2026-09-22T12:00:00+00:00" in email.text


def test_failed_delivery_leaves_the_message_unforwarded(
    db: Session, session_factory: sessionmaker[Session]
) -> None:
    notification = _store_message(db)
    sender = FakeEmailSender()
    sender.fail = True

    assert _service(sender, session_factory).forward_contact_message(notification) is False
    assert _forwarded(db, notification.message_id) is False


def test_discarded_email_is_not_marked_forwarded(db: Session, session_factory: sessionmaker[Session]) -> None:
    notification = _store_message(db)

    assert _service(NullEmailSender(), session_factory).forward_contact_message(notification) is False
    assert _forwarded(db, notification.message_id) is False


def test_status_update_failure_is_only_logged(
    db: Session, tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    notification = _store_message(db)
    broken = build_engine(f"sqlite:///{(tmp_path / 'missing' / 'db.sqlite').as_posix()}")
    sender = FakeEmailSender()

    delivered = _service(sender, build_session_factory(broken)).forward_contact_message(notification)

    assert delivered is True
    assert len(sender.sent) == 1
    assert "contact.forward_status_not_saved" in caplog.text
