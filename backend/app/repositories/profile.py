from sqlalchemy import select

from app.models.profile import Profile
from app.repositories.base import Repository


class ProfileRepository(Repository[Profile]):
    model = Profile

    def get_current(self) -> Profile | None:
        """The profile table holds a single row; the oldest one wins if several exist."""
        return self.session.scalar(select(Profile).order_by(Profile.id).limit(1))
