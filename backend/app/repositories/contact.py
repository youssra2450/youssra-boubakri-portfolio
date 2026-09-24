from sqlalchemy import update

from app.models.contact import ContactMessage
from app.repositories.base import Repository


class ContactRepository(Repository[ContactMessage]):
    model = ContactMessage

    def mark_forwarded(self, message_id: int) -> bool:
        """Record that the message was delivered to the owner by e-mail; ``False`` if it no longer exists."""
        result = self.session.execute(
            update(ContactMessage).where(ContactMessage.id == message_id).values(email_forwarded=True)
        )
        return bool(result.rowcount)
