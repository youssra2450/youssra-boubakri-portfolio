"""Profile use cases."""

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.exceptions import NotFoundError
from app.repositories.profile import ProfileRepository
from app.schemas.profile import ProfileRead


class ProfileService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.profiles = ProfileRepository(db)
        self.settings = settings

    def get_profile(self) -> ProfileRead:
        """The stored profile plus ``contact_form_enabled``, computed from the e-mail configuration."""
        profile = self.profiles.get_current()
        if profile is None:
            raise NotFoundError("Profile has not been initialised yet.")
        return ProfileRead.model_validate(profile).model_copy(
            update={"contact_form_enabled": self.settings.contact_form_enabled}
        )
