"""Profile, education, experience, skills and the home-page aggregate."""

from collections.abc import Callable

from fastapi.testclient import TestClient

from app.database.seed import SeedReport
from tests.support import EMAIL_ENABLED, seed_json


def test_profile_matches_the_seed(client: TestClient) -> None:
    response = client.get("/api/profile")

    assert response.status_code == 200
    profile = response.json()
    expected = seed_json()["profile"]
    for field in ("full_name", "headline", "tagline", "location", "mobility", "email", "photo_url"):
        assert profile[field] == expected[field]
    for field in ("target_roles", "languages", "interests", "snapshot", "capabilities"):
        assert profile[field] == expected[field]
    assert "cv_url" not in profile
    assert "cv_download_url" not in profile
    assert profile["updated_at"].endswith(("Z", "+00:00"))


def test_profile_publishes_email_github_and_linkedin_but_no_phone(client: TestClient) -> None:
    profile = client.get("/api/profile").json()
    expected = seed_json()["profile"]

    assert profile["phone"] is None
    assert profile["email"] == expected["email"]
    assert profile["github_url"] == expected["github_url"]
    assert profile["linkedin_url"] == expected["linkedin_url"]
    assert profile["github_url"].startswith("https://github.com/")
    assert profile["linkedin_url"].startswith("https://www.linkedin.com/")


def test_contact_form_is_disabled_without_email_provider(client: TestClient) -> None:
    assert client.get("/api/profile").json()["contact_form_enabled"] is False


def test_contact_form_is_enabled_when_email_forwarding_is_configured(contact_client: TestClient) -> None:
    assert contact_client.get("/api/profile").json()["contact_form_enabled"] is True


def test_contact_form_stays_disabled_without_recipient(
    seeded: SeedReport, make_client: Callable[..., TestClient]
) -> None:
    client = make_client(**{**EMAIL_ENABLED, "email_to": ""})

    assert client.get("/api/profile").json()["contact_form_enabled"] is False


def test_profile_is_404_before_the_seed(make_client: Callable[..., TestClient]) -> None:
    response = make_client().get("/api/profile")

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


def test_education_is_ordered_by_display_order(client: TestClient) -> None:
    response = client.get("/api/education")

    assert response.status_code == 200
    items = response.json()
    expected = sorted(seed_json()["education"], key=lambda entry: entry["display_order"])
    assert [item["degree"] for item in items] == [entry["degree"] for entry in expected]
    assert set(items[0]) == {
        "id",
        "degree",
        "degree_original",
        "institution",
        "location",
        "start_year",
        "end_year",
        "status",
        "description",
        "display_order",
    }


def test_experience_is_ordered_and_keeps_empty_fields_empty(client: TestClient) -> None:
    response = client.get("/api/experience")

    assert response.status_code == 200
    items = response.json()
    expected = sorted(seed_json()["experiences"], key=lambda entry: entry["display_order"])
    assert [item["organization"] for item in items] == [entry["organization"] for entry in expected]
    for item, entry in zip(items, expected, strict=True):
        assert item["start_date"] == entry["start_date"]
        assert item["end_date"] == entry["end_date"]
        assert item["role"] == entry["role"]
        assert item["highlights"] == entry["highlights"]


def test_skills_are_grouped_and_ordered(client: TestClient) -> None:
    response = client.get("/api/skills")

    assert response.status_code == 200
    categories = response.json()
    expected = seed_json()["skill_categories"]
    assert [category["slug"] for category in categories] == [category["slug"] for category in expected]
    for category, source in zip(categories, expected, strict=True):
        assert [skill["name"] for skill in category["skills"]] == [
            skill["name"] for skill in source["skills"]
        ]
        assert [skill["display_order"] for skill in category["skills"]] == list(
            range(1, len(source["skills"]) + 1)
        )
        for skill, source_skill in zip(category["skills"], source["skills"], strict=True):
            assert skill["category_id"] == category["id"]
            assert skill["is_core"] is source_skill.get("is_core", False)
            assert skill["proficiency"] == source_skill.get("proficiency")


def test_portfolio_aggregates_every_section(client: TestClient) -> None:
    response = client.get("/api/portfolio")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"profile", "education", "experience", "skills", "projects"}
    assert body["profile"] == client.get("/api/profile").json()
    assert body["education"] == client.get("/api/education").json()
    assert body["experience"] == client.get("/api/experience").json()
    assert body["skills"] == client.get("/api/skills").json()
    assert body["projects"] == client.get("/api/projects").json()
    assert len(body["projects"]) == 8


def test_public_get_supports_etag_and_304(client: TestClient) -> None:
    first = client.get("/api/portfolio")
    etag = first.headers["etag"]

    assert etag.startswith('W/"')
    assert first.headers["cache-control"] == "public, max-age=60"

    cached = client.get("/api/portfolio", headers={"If-None-Match": etag})
    assert cached.status_code == 304
    assert cached.content == b""
    assert cached.headers["etag"] == etag

    strong_form = etag.removeprefix("W/")
    assert (
        client.get("/api/portfolio", headers={"If-None-Match": f'"other", {strong_form}'}).status_code == 304
    )
    assert client.get("/api/portfolio", headers={"If-None-Match": "*"}).status_code == 304
    assert client.get("/api/portfolio", headers={"If-None-Match": 'W/"stale"'}).status_code == 200
