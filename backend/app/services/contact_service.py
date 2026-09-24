"""Contact form pipeline (docs/SPEC.md §2.5)."""

import logging
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import FieldError, ServiceUnavailableError, ValidationError
from app.models.contact import ContactMessage
from app.repositories.contact import ContactRepository
from app.schemas.contact import ContactCreate
from app.services.notification_service import ContactNotification
from app.utils.network import hash_ip
from app.utils.sanitize import count_urls, letter_ratio, sanitize_multiline, sanitize_single_line

logger = logging.getLogger(__name__)

CONTACT_UNAVAILABLE_CODE = "contact_unavailable"
CONTACT_UNAVAILABLE_DETAIL = "The contact form is not available. Please reach out by e-mail or LinkedIn."

#: Minimum lengths re-checked after sanitisation (tags may have hidden an empty message).
_MIN_LENGTHS = {"name": 2, "subject": 3, "message": 20}
MAX_URLS_IN_MESSAGE = 5
MIN_LETTER_RATIO = 0.5
USER_AGENT_MAX_LENGTH = 300


def ensure_contact_form_enabled(settings: Settings) -> None:
    """The form only works when messages can be forwarded by e-mail (``contact_form_enabled``)."""
    if not settings.contact_form_enabled:
        raise ServiceUnavailableError(CONTACT_UNAVAILABLE_DETAIL, code=CONTACT_UNAVAILABLE_CODE)


@dataclass(frozen=True)
class ContactSubmission:
    """Outcome of a submission. ``notification`` is set when the message must be forwarded."""

    stored: bool
    notification: ContactNotification | None = None


class ContactService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings
        self.messages = ContactRepository(db)

    def submit(self, payload: ContactCreate, *, client_ip: str, user_agent: str | None) -> ContactSubmission:
        """Sanitise, drop bots silently, flag spam, persist.

        Dropped submissions still produce the normal success response so bots learn nothing; spam is
        stored (flagged) but never forwarded.
        """
        fields = self._sanitise(payload)

        drop_reason = self._drop_reason(payload)
        if drop_reason is not None:
            logger.info("contact.dropped reason=%s", drop_reason)
            return ContactSubmission(stored=False)

        is_spam = self._looks_like_spam(fields["message"])
        entity = self.messages.add(
            ContactMessage(
                name=fields["name"],
                email=str(payload.email),
                subject=fields["subject"],
                message=fields["message"],
                ip_hash=hash_ip(client_ip, secret=self.settings.ip_hash_salt),
                user_agent=self._clean_user_agent(user_agent),
                is_spam=is_spam,
            )
        )
        notification = ContactNotification(
            message_id=entity.id,
            name=entity.name,
            email=entity.email,
            subject=entity.subject,
            message=entity.message,
            created_at=entity.created_at,
        )
        self.db.commit()
        logger.info("contact.stored message_id=%s spam=%s", notification.message_id, is_spam)
        return ContactSubmission(stored=True, notification=None if is_spam else notification)

    def _sanitise(self, payload: ContactCreate) -> dict[str, str]:
        fields = {
            "name": sanitize_single_line(payload.name),
            "subject": sanitize_single_line(payload.subject),
            "message": sanitize_multiline(payload.message),
        }
        errors = [
            FieldError(field, f"{field.capitalize()} must contain at least {minimum} characters of text.")
            for field, minimum in _MIN_LENGTHS.items()
            if len(fields[field]) < minimum
        ]
        if errors:
            raise ValidationError(errors)
        return fields

    def _drop_reason(self, payload: ContactCreate) -> str | None:
        if payload.website and payload.website.strip():
            return "honeypot"
        minimum_ms = self.settings.contact_min_submit_seconds * 1000
        if payload.elapsed_ms is not None and payload.elapsed_ms < minimum_ms:
            return "too_fast"
        return None

    @staticmethod
    def _clean_user_agent(user_agent: str | None) -> str | None:
        cleaned = sanitize_single_line(user_agent or "")[:USER_AGENT_MAX_LENGTH]
        return cleaned or None

    @staticmethod
    def _looks_like_spam(message: str) -> bool:
        return count_urls(message) > MAX_URLS_IN_MESSAGE or letter_ratio(message) < MIN_LETTER_RATIO
