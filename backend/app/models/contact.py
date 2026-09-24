"""Messages sent through the public contact form.

Stored as an audit trail; they reach the owner by e-mail (``email_forwarded`` records the delivery).
"""

import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, IdMixin, TimestampMixin


class ContactMessage(IdMixin, TimestampMixin, Base):
    __tablename__ = "contact_messages"
    __table_args__ = (sa.Index("ix_contact_messages_created_at", "created_at"),)

    name: Mapped[str] = mapped_column(sa.String(100), nullable=False)
    email: Mapped[str] = mapped_column(sa.String(254), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(sa.String(150), nullable=False)
    message: Mapped[str] = mapped_column(sa.Text, nullable=False)
    ip_hash: Mapped[str | None] = mapped_column(sa.String(64))
    user_agent: Mapped[str | None] = mapped_column(sa.String(300))
    is_spam: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, default=False, server_default=sa.false()
    )
    email_forwarded: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, default=False, server_default=sa.false()
    )
