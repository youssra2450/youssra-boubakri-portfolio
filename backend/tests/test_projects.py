"""Public project catalogue: list, ordering, filters and case-study detail."""

from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Project, ProjectTechnology
from app.schemas.project import PROJECT_DOMAINS
from tests.support import seed_json, seed_projects

SUMMARY_FIELDS = {
    "id",
    "slug",
    "title",
    "title_original",
    "category",
    "domains",
    "concepts",
    "visual",
    "context",
    "period_label",
    "start_year",
    "end_year",
    "summary",
    "technologies",
    "features",
    "github_url",
    "demo_url",
    "featured",
    "display_order",
}
DETAIL_FIELDS = SUMMARY_FIELDS | {
    "problem",
    "solution",
    "architecture",
    "implementation",
    "results",
    "lessons_learned",
    "updated_at",
}


def _expected_order() -> list[str]:
    projects = sorted(
        seed_projects(), key=lambda project: (not project["featured"], project["display_order"])
    )
    return [project["slug"] for project in projects]


def _seed_project(slug: str) -> dict[str, Any]:
    return next(project for project in seed_projects() if project["slug"] == slug)


def test_lists_the_eight_seeded_projects_featured_first(client: TestClient) -> None:
    response = client.get("/api/projects")

    assert response.status_code == 200
    projects = response.json()
    assert len(projects) == 8
    assert [project["slug"] for project in projects] == _expected_order()
    assert projects[0]["slug"] == "ai-technology-watch-system"
    featured_flags = [project["featured"] for project in projects]
    assert featured_flags == sorted(featured_flags, reverse=True)


def test_summary_exposes_v2_fields(client: TestClient) -> None:
    projects = client.get("/api/projects").json()

    for project in projects:
        assert set(project) == SUMMARY_FIELDS
        source = _seed_project(project["slug"])
        assert project["concepts"] == source["concepts"]
        assert project["visual"] == source["visual"]
        assert project["github_url"] == source["github_url"]
        assert project["demo_url"] == source["demo_url"]
        assert project["technologies"] == source["technologies"]
        assert project["domains"] == source["domains"]


def test_featured_projects_come_before_lower_display_orders(client: TestClient, db: Session) -> None:
    db.add(
        Project(
            slug="extra-non-featured",
            title="Extra",
            category="Test",
            summary="Not featured but first by display order.",
            featured=False,
            display_order=0,
        )
    )
    db.commit()

    slugs = [project["slug"] for project in client.get("/api/projects").json()]

    first_non_featured = next(index for index, slug in enumerate(slugs) if slug == "extra-non-featured")
    assert all(_seed_project(slug)["featured"] for slug in slugs[:first_non_featured])


@pytest.mark.parametrize("domain", PROJECT_DOMAINS)
def test_domain_filter_works_for_every_taxonomy_value(client: TestClient, domain: str) -> None:
    expected = [slug for slug in _expected_order() if domain in _seed_project(slug)["domains"]]

    response = client.get("/api/projects", params={"domain": domain})

    assert response.status_code == 200
    assert [project["slug"] for project in response.json()] == expected
    assert expected, f"no seeded project in domain {domain!r}"


def test_backend_taxonomy_matches_the_seed_file() -> None:
    assert list(PROJECT_DOMAINS) == seed_json()["_taxonomy"]["project_domains"]


@pytest.mark.parametrize(("domain", "count"), [("Optimization", 1), ("NLP", 3), ("LLM", 1)])
def test_domain_filter_counts(client: TestClient, domain: str, count: int) -> None:
    assert len(client.get("/api/projects", params={"domain": domain}).json()) == count


@pytest.mark.parametrize("domain", ["nlp", "  NLP ", "ai/ml", "COMPUTER VISION"])
def test_domain_filter_is_case_insensitive(client: TestClient, domain: str) -> None:
    canonical = next(value for value in PROJECT_DOMAINS if value.casefold() == domain.strip().casefold())

    filtered = client.get("/api/projects", params={"domain": domain}).json()

    assert filtered == client.get("/api/projects", params={"domain": canonical}).json()
    assert filtered


def test_unknown_domain_returns_an_empty_list(client: TestClient) -> None:
    response = client.get("/api/projects", params={"domain": "Quantum"})

    assert response.status_code == 200
    assert response.json() == []


def test_technology_filter_is_case_insensitive(client: TestClient) -> None:
    technology = _seed_project("tsp-uav-optimization")["technologies"][0]
    expected = [slug for slug in _expected_order() if technology in _seed_project(slug)["technologies"]]

    response = client.get("/api/projects", params={"technology": technology.upper()})

    assert [project["slug"] for project in response.json()] == expected
    assert "tsp-uav-optimization" in expected


def test_featured_filter(client: TestClient) -> None:
    featured = client.get("/api/projects", params={"featured": "true"}).json()
    others = client.get("/api/projects", params={"featured": "false"}).json()

    assert {project["slug"] for project in featured} == {p["slug"] for p in seed_projects() if p["featured"]}
    assert {project["slug"] for project in others} == {
        p["slug"] for p in seed_projects() if not p["featured"]
    }
    assert len(featured) + len(others) == 8


def test_filters_can_be_combined(client: TestClient) -> None:
    response = client.get("/api/projects", params={"domain": "NLP", "featured": "false"})

    assert [project["slug"] for project in response.json()] == ["intelligent-pdf-translation"]


def test_detail_by_slug(client: TestClient) -> None:
    response = client.get("/api/projects/tsp-uav-optimization")

    assert response.status_code == 200
    project = response.json()
    source = _seed_project("tsp-uav-optimization")
    assert set(project) == DETAIL_FIELDS
    assert project["github_url"] == source["github_url"]
    assert project["github_url"].startswith("https://github.com/")
    assert project["period_label"] is None
    assert project["start_year"] is None
    assert project["visual"] == "uav"
    assert project["concepts"] == source["concepts"]
    assert project["architecture"] == source["architecture"]
    assert project["results"] == []
    assert project["updated_at"].endswith(("Z", "+00:00"))


def test_detail_by_id_matches_detail_by_slug(client: TestClient) -> None:
    listing = client.get("/api/projects").json()
    first = listing[0]

    by_id = client.get(f"/api/projects/{first['id']}")

    assert by_id.status_code == 200
    assert by_id.json() == client.get(f"/api/projects/{first['slug']}").json()


def test_period_is_kept_when_stated(client: TestClient) -> None:
    project = client.get("/api/projects/ai-technology-watch-system").json()

    assert project["period_label"] == _seed_project("ai-technology-watch-system")["period_label"]
    assert project["visual"] == "multi-agent"


@pytest.mark.parametrize("identifier", ["does-not-exist", "999999", "99999999999999999999"])
def test_unknown_project_is_404(client: TestClient, identifier: str) -> None:
    response = client.get(f"/api/projects/{identifier}")

    assert response.status_code == 404
    assert response.json() == {"detail": "Project not found.", "code": "not_found"}


def test_unpublished_projects_are_hidden(client: TestClient, db: Session) -> None:
    hidden = Project(
        slug="hidden-draft",
        title="Hidden draft",
        category="Draft",
        domains=["NLP"],
        summary="Not ready yet.",
        is_published=False,
        featured=True,
        display_order=0,
    )
    hidden.technologies = [ProjectTechnology(name="Python", display_order=1)]
    db.add(hidden)
    db.commit()

    slugs = [project["slug"] for project in client.get("/api/projects").json()]
    nlp_slugs = [project["slug"] for project in client.get("/api/projects?domain=NLP").json()]

    assert "hidden-draft" not in slugs
    assert "hidden-draft" not in nlp_slugs
    assert client.get("/api/projects/hidden-draft").status_code == 404
    assert client.get(f"/api/projects/{hidden.id}").status_code == 404
    assert "hidden-draft" not in client.get("/sitemap.xml").text


def test_query_parameters_are_validated(client: TestClient) -> None:
    response = client.get("/api/projects", params={"featured": "maybe"})

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    assert body["errors"][0]["field"] == "featured"
