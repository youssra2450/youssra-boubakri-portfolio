"""ORM models. Importing this package registers every table on ``Base.metadata``."""

from app.models.contact import ContactMessage
from app.models.education import Education
from app.models.experience import Experience
from app.models.profile import Profile
from app.models.project import Project, ProjectTechnology
from app.models.skill import Skill, SkillCategory

__all__ = [
    "ContactMessage",
    "Education",
    "Experience",
    "Profile",
    "Project",
    "ProjectTechnology",
    "Skill",
    "SkillCategory",
]
