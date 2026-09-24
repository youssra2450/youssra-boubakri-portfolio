"""robots.txt and sitemap.xml."""

import re
from collections.abc import Callable
from xml.etree import ElementTree

from fastapi.testclient import TestClient

from app.database.seed import SeedReport
from tests.support import SITE_URL, seed_projects

SITEMAP_NS = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}


# SEO ----------------------------------------------------------------------------------------------------


def test_robots_txt(client: TestClient) -> None:
    response = client.get("/robots.txt")

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")
    assert response.text == (f"User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: {SITE_URL}/sitemap.xml\n")
    assert "admin" not in response.text


def test_sitemap_lists_home_and_every_published_project(client: TestClient) -> None:
    response = client.get("/sitemap.xml")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/xml"
    root = ElementTree.fromstring(response.content)  # noqa: S314 - our own sitemap, not untrusted input
    urls = root.findall("sm:url", SITEMAP_NS)
    locations = [url.findtext("sm:loc", namespaces=SITEMAP_NS) for url in urls]
    assert locations[0] == f"{SITE_URL}/"
    project_locations = locations[1:]
    assert len(project_locations) == 8
    assert set(project_locations) == {f"{SITE_URL}/projects/{project['slug']}" for project in seed_projects()}
    for url in urls[1:]:
        assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", url.findtext("sm:lastmod", namespaces=SITEMAP_NS) or "")


def test_seo_files_are_cacheable(client: TestClient) -> None:
    response = client.get("/sitemap.xml")

    assert response.headers["cache-control"] == "public, max-age=60"
    assert client.get("/sitemap.xml", headers={"If-None-Match": response.headers["etag"]}).status_code == 304


def test_site_url_trailing_slash_is_normalised(
    seeded: SeedReport, make_client: Callable[..., TestClient]
) -> None:
    client = make_client(site_url="https://example.org/")

    body = client.get("/sitemap.xml").text

    assert "<loc>https://example.org/</loc>" in body
    assert "<loc>https://example.org/projects/tsp-uav-optimization</loc>" in body
    assert "https://example.org//" not in body
    assert "Sitemap: https://example.org/sitemap.xml" in client.get("/robots.txt").text


def test_cv_endpoints_are_gone(client: TestClient) -> None:
    for path in ("/api/cv", "/api/cv/download"):
        assert client.get(path).status_code == 404
