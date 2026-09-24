"""``robots.txt`` and ``sitemap.xml`` generation."""

from xml.sax.saxutils import escape

from sqlalchemy.orm import Session

from app.core.config import Settings
from app.repositories.project import ProjectRepository
from app.utils.datetime import ensure_utc


class SeoService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.projects = ProjectRepository(db)
        self.site_url = settings.site_url

    def robots_txt(self) -> str:
        return f"User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: {self.site_url}/sitemap.xml\n"

    def sitemap_xml(self) -> str:
        """Home page plus one entry per published project (``lastmod`` = last content update)."""
        entries = [f"  <url>\n    <loc>{escape(self.site_url + '/')}</loc>\n  </url>"]
        for project in self.projects.list_published():
            lastmod = ensure_utc(project.updated_at).date().isoformat()
            location = escape(f"{self.site_url}/projects/{project.slug}")
            entries.append(f"  <url>\n    <loc>{location}</loc>\n    <lastmod>{lastmod}</lastmod>\n  </url>")
        body = "\n".join(entries)
        return (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            f"{body}\n"
            "</urlset>\n"
        )
