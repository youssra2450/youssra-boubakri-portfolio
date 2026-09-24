"""Outgoing e-mail: an ``EmailSender`` protocol with null, SMTP and Resend implementations."""

import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from typing import Protocol

import httpx

from app.core.config import Settings

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"
DEFAULT_TIMEOUT_SECONDS = 10.0


@dataclass(frozen=True)
class OutgoingEmail:
    sender: str
    recipient: str
    subject: str
    text: str
    reply_to: str | None = None


class EmailSender(Protocol):
    def send(self, email: OutgoingEmail) -> bool:
        """Hand ``email`` to the provider: ``True`` once accepted, ``False`` if it was deliberately
        discarded. Delivery failures raise; callers decide how to handle them."""
        ...


class NullEmailSender:
    """Used while e-mail forwarding is not configured: nothing is sent."""

    def send(self, email: OutgoingEmail) -> bool:
        logger.warning("email.discarded reason=no e-mail provider configured subject=%r", email.subject)
        return False


class SmtpEmailSender:
    """SMTP with STARTTLS (unless disabled) and optional authentication."""

    def __init__(
        self,
        *,
        host: str,
        port: int,
        username: str = "",
        password: str = "",
        use_tls: bool = True,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        self.host = host
        self.port = port
        self.username = username
        self.password = password
        self.use_tls = use_tls
        self.timeout = timeout

    def send(self, email: OutgoingEmail) -> bool:
        message = EmailMessage()
        message["From"] = email.sender
        message["To"] = email.recipient
        message["Subject"] = email.subject
        if email.reply_to:
            message["Reply-To"] = email.reply_to
        message.set_content(email.text)

        with smtplib.SMTP(self.host, self.port, timeout=self.timeout) as client:
            if self.use_tls:
                client.starttls(context=ssl.create_default_context())
            if self.username:
                client.login(self.username, self.password)
            client.send_message(message)
        logger.info("email.sent provider=smtp")
        return True


class ResendEmailSender:
    """Resend HTTP API (https://resend.com/docs/api-reference/emails/send-email)."""

    def __init__(
        self,
        *,
        api_key: str,
        transport: httpx.BaseTransport | None = None,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        self.api_key = api_key
        self.transport = transport
        self.timeout = timeout

    def send(self, email: OutgoingEmail) -> bool:
        payload: dict[str, object] = {
            "from": email.sender,
            "to": [email.recipient],
            "subject": email.subject,
            "text": email.text,
        }
        if email.reply_to:
            payload["reply_to"] = email.reply_to
        headers = {"Authorization": f"Bearer {self.api_key}"}
        with httpx.Client(transport=self.transport, timeout=self.timeout) as client:
            response = client.post(RESEND_API_URL, json=payload, headers=headers)
        response.raise_for_status()
        logger.info("email.sent provider=resend")
        return True


def build_email_sender(settings: Settings) -> EmailSender:
    """Sender selected by ``EMAIL_PROVIDER``; the null sender while forwarding is not fully configured."""
    if not settings.contact_form_enabled:
        return NullEmailSender()
    if settings.email_provider == "smtp":
        return SmtpEmailSender(
            host=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username,
            password=settings.smtp_password.get_secret_value(),
            use_tls=settings.smtp_use_tls,
        )
    return ResendEmailSender(api_key=settings.resend_api_key.get_secret_value())
