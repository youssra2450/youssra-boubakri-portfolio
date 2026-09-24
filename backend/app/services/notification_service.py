"""Forwarding of contact messages to the site owner by e-mail.

Runs as a background task after the visitor got the response: failures are logged, never raised.
"""

import logging
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from app.database.session import session_scope
from app.repositories.contact import ContactRepository
from app.services.email import EmailSender, OutgoingEmail

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ContactNotification:
    """Snapshot of a stored message (independent of the database session that created it)."""

    message_id: int
    name: str
    email: str
    subject: str
    message: str
    created_at: datetime


class NotificationService:
    def __init__(
        self,
        sender: EmailSender,
        *,
        email_from: str,
        email_to: str,
        session_factory: sessionmaker[Session],
    ) -> None:
        self.sender = sender
        self.email_from = email_from
        self.email_to = email_to
        self.session_factory = session_factory

    def forward_contact_message(self, notification: ContactNotification) -> bool:
        """E-mail the message to the owner (Reply-To = visitor) and record ``email_forwarded``.

        Returns whether the e-mail was handed to the provider.
        """
        try:
            delivered = self.sender.send(self.build_email(notification))
        except Exception:
            logger.exception("contact.forward_failed message_id=%s", notification.message_id)
            return False
        if not delivered:
            logger.warning("contact.not_forwarded message_id=%s", notification.message_id)
            return False

        try:
            with session_scope(self.session_factory) as db:
                ContactRepository(db).mark_forwarded(notification.message_id)
        except SQLAlchemyError:
            logger.exception("contact.forward_status_not_saved message_id=%s", notification.message_id)
        logger.info("contact.forwarded message_id=%s", notification.message_id)
        return True

    def build_email(self, notification: ContactNotification) -> OutgoingEmail:
        return OutgoingEmail(
            sender=self.email_from,
            recipient=self.email_to,
            subject=f"[Portfolio] {notification.subject}",
            text=(
                "New message received through the portfolio contact form.\n\n"
                f"From: {notification.name} <{notification.email}>\n"
                f"Subject: {notification.subject}\n"
                f"Received: {notification.created_at.isoformat()}\n\n"
                f"{notification.message}\n"
            ),
            reply_to=notification.email,
        )
