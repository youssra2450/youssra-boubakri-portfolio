"""URL slug helpers."""

import re
import unicodedata

SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
_NON_ALPHANUMERIC = re.compile(r"[^a-z0-9]+")


def slugify(value: str, *, max_length: int = 120) -> str:
    """ASCII, lower-case, hyphen-separated slug (``"Détection du cancer"`` → ``"detection-du-cancer"``)."""
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = _NON_ALPHANUMERIC.sub("-", ascii_value.lower()).strip("-")
    return slug[:max_length].rstrip("-")
