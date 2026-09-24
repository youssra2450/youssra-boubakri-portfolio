from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


class DatabaseProbe:
    """Connectivity check used by the health endpoint."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def ping(self) -> bool:
        """Run ``SELECT 1``; ``False`` if the database cannot be reached."""
        try:
            self.session.execute(select(1))
        except SQLAlchemyError:
            self.session.rollback()
            return False
        return True
