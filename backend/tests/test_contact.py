"""Contact pipeline: availability, validation, anti-abuse, persistence and e-mail forwarding."""

from collections.abc import Callable
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database.seed import SeedReport
from app.models import ContactMessage
from app.schemas.contact import CONTACT_SUCCESS_MESSAGE
from tests.support import EMAIL_ENABLED, FakeEmailSender

SUCCESS = {"success": True, "message": CONTACT_SUCCESS_MESSAGE}


def valid_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": "Jane Doe",
        "email": "jane.doe@example.com",
        "subject": "Data Scientist position",
        "message": "Hello Youssra, I would like to discuss a data science opportunity with you.",
        "website": "",
        "elapsed_ms": 8000,
    }
    payload.update(overrides)
    return payload


def stored_messages(db: Session) -> list[ContactMessage]:
    db.expire_all()
    return list(db.scalars(select(ContactMessage).order_by(ContactMessage.id)))


def error_fields(response_body: dict[str, Any]) -> set[str]:
    return {error["field"] for error in response_body["errors"]}


# Availability -------------------------------------------------------------------------------------------


def test_contact_is_unavailable_without_email_forwarding(client: TestClient, db: Session) -> None:
    response = client.post("/api/contact", json=valid_payload())

    assert response.status_code == 503
    assert response.json()["code"] == "contact_unavailable"
    assert response.json()["detail"]
    assert stored_messages(db) == []


def test_unavailable_is_reported_before_validation(client: TestClient) -> None:
    response = client.post("/api/contact", json={"name": "x"})

    assert response.status_code == 503
    assert response.json()["code"] == "contact_unavailable"


@pytest.mark.parametrize(
    "missing",
    [
        {"email_to": ""},
        {"email_from": ""},
        {"smtp_host": ""},
        {"email_provider": "resend"},  # RESEND_API_KEY missing
    ],
)
def test_incomplete_email_configuration_keeps_the_form_disabled(
    seeded: SeedReport, make_client: Callable[..., TestClient], missing: dict[str, str]
) -> None:
    client = make_client(**{**EMAIL_ENABLED, **missing})

    assert client.post("/api/contact", json=valid_payload()).status_code == 503


# Happy path ---------------------------------------------------------------------------------------------


def test_valid_message_is_stored_and_forwarded(
    contact_client: TestClient, db: Session, fake_sender: FakeEmailSender
) -> None:
    response = contact_client.post(
        "/api/contact", json=valid_payload(), headers={"User-Agent": "pytest-browser/1.0"}
    )

    assert response.status_code == 201
    assert response.json() == SUCCESS

    [message] = stored_messages(db)
    assert message.name == "Jane Doe"
    assert message.email == "jane.doe@example.com"
    assert message.subject == "Data Scientist position"
    assert message.is_spam is False
    assert message.email_forwarded is True
    assert message.user_agent == "pytest-browser/1.0"
    assert message.ip_hash is not None
    assert len(message.ip_hash) == 64
    assert "testclient" not in message.ip_hash

    [email] = fake_sender.sent
    assert email.recipient == EMAIL_ENABLED["email_to"]
    assert email.sender == EMAIL_ENABLED["email_from"]
    assert email.reply_to == "jane.doe@example.com"
    assert email.subject == "[Portfolio] Data Scientist position"
    assert "Jane Doe <jane.doe@example.com>" in email.text
    assert valid_payload()["message"] in email.text


def test_message_without_timing_information_is_accepted(contact_client: TestClient, db: Session) -> None:
    payload = valid_payload()
    del payload["elapsed_ms"], payload["website"]

    assert contact_client.post("/api/contact", json=payload).status_code == 201
    assert len(stored_messages(db)) == 1


def test_forwarding_failure_is_logged_and_not_reported_to_the_visitor(
    contact_client: TestClient,
    db: Session,
    fake_sender: FakeEmailSender,
    caplog: pytest.LogCaptureFixture,
) -> None:
    fake_sender.fail = True

    response = contact_client.post("/api/contact", json=valid_payload())

    assert response.status_code == 201
    assert response.json() == SUCCESS
    [message] = stored_messages(db)
    assert message.email_forwarded is False
    assert "contact.forward_failed" in caplog.text


# Validation ---------------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"email": "not-an-email"}, "email"),
        ({"name": "J"}, "name"),
        ({"subject": "Hi"}, "subject"),
        ({"message": "Too short."}, "message"),
        ({"message": "x" * 5001}, "message"),
        ({"elapsed_ms": -1}, "elapsed_ms"),
        ({"unexpected": "field"}, "unexpected"),
    ],
)
def test_invalid_payload_is_rejected(
    contact_client: TestClient, db: Session, overrides: dict[str, Any], field: str
) -> None:
    response = contact_client.post("/api/contact", json=valid_payload(**overrides))

    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    assert body["detail"] == "Validation error"
    assert field in error_fields(body)
    assert stored_messages(db) == []


def test_missing_fields_are_all_reported(contact_client: TestClient) -> None:
    response = contact_client.post("/api/contact", json={})

    assert response.status_code == 422
    assert error_fields(response.json()) == {"name", "email", "subject", "message"}


def test_malformed_json_is_a_validation_error(contact_client: TestClient) -> None:
    response = contact_client.post(
        "/api/contact", content=b"{not json", headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 422
    assert error_fields(response.json()) == {"body"}


# Anti-abuse ---------------------------------------------------------------------------------------------


def test_honeypot_submission_is_silently_dropped(
    contact_client: TestClient, db: Session, fake_sender: FakeEmailSender
) -> None:
    response = contact_client.post("/api/contact", json=valid_payload(website="https://spam.example"))

    assert response.status_code == 201
    assert response.json() == SUCCESS
    assert stored_messages(db) == []
    assert fake_sender.sent == []


def test_too_fast_submission_is_silently_dropped(
    contact_client: TestClient, db: Session, fake_sender: FakeEmailSender
) -> None:
    response = contact_client.post("/api/contact", json=valid_payload(elapsed_ms=900))

    assert response.status_code == 201
    assert response.json() == SUCCESS
    assert stored_messages(db) == []
    assert fake_sender.sent == []


@pytest.mark.parametrize(
    "message",
    [
        "Visit " + " ".join(f"https://spam{index}.example/offer" for index in range(6)),
        "1234567890 !!!! ???? 0987654321 #### $$$$ 55555 %%%%",
    ],
)
def test_spam_is_flagged_and_not_forwarded(
    contact_client: TestClient, db: Session, fake_sender: FakeEmailSender, message: str
) -> None:
    response = contact_client.post("/api/contact", json=valid_payload(message=message))

    assert response.status_code == 201
    [stored] = stored_messages(db)
    assert stored.is_spam is True
    assert stored.email_forwarded is False
    assert fake_sender.sent == []


def test_input_is_sanitised_before_storage_and_forwarding(
    contact_client: TestClient, db: Session, fake_sender: FakeEmailSender
) -> None:
    payload = valid_payload(
        name="  <b>Jane</b>\tDoe ",
        subject="<i>Data</i> role\x07",
        message=(
            "<p>Hello Youssra,</p>\r\n<script>alert('x')</script>"
            "I would like to talk about a data role.\x00\n\n\n\n\n\nBest regards,\u202e Jane"
        ),
    )

    response = contact_client.post("/api/contact", json=payload)

    assert response.status_code == 201
    [stored] = stored_messages(db)
    assert stored.name == "Jane Doe"
    assert stored.subject == "Data role"
    assert "<" not in stored.message
    assert "alert" not in stored.message
    assert "\x00" not in stored.message
    assert "\u202e" not in stored.message
    assert "\n\n\n\n" not in stored.message
    assert stored.message.startswith("Hello Youssra,\nI would like to talk about a data role.")
    assert stored.message.endswith("Best regards, Jane")
    assert fake_sender.sent[0].subject == "[Portfolio] Data role"


def test_message_that_is_only_markup_is_rejected(contact_client: TestClient, db: Session) -> None:
    response = contact_client.post(
        "/api/contact", json=valid_payload(message="<p></p><div><span></span></div><br/><hr/>")
    )

    assert response.status_code == 422
    assert error_fields(response.json()) == {"message"}
    assert stored_messages(db) == []


def test_contact_is_rate_limited_per_client_ip(
    seeded: SeedReport, make_client: Callable[..., TestClient], db: Session
) -> None:
    client = make_client(**EMAIL_ENABLED, rate_limit_contact="2/minute")

    statuses = [client.post("/api/contact", json=valid_payload()).status_code for _ in range(3)]

    assert statuses == [201, 201, 429]
    limited = client.post("/api/contact", json=valid_payload())
    assert limited.json() == {"detail": "Too many requests. Please try again later.", "code": "rate_limited"}
    assert 1 <= int(limited.headers["retry-after"]) <= 60
    assert len(stored_messages(db)) == 2


def test_rate_limit_uses_forwarded_ip_behind_a_trusted_proxy(
    seeded: SeedReport, make_client: Callable[..., TestClient]
) -> None:
    client = make_client(**EMAIL_ENABLED, rate_limit_contact="1/minute", trust_proxy_headers=True)

    def post_from(ip: str) -> int:
        return client.post("/api/contact", json=valid_payload(), headers={"X-Forwarded-For": ip}).status_code

    assert post_from("203.0.113.1") == 201
    assert post_from("203.0.113.1, 10.0.0.1") == 429
    assert post_from("203.0.113.2") == 201


def test_oversized_body_is_rejected(contact_client: TestClient) -> None:
    response = contact_client.post(
        "/api/contact", content=b"{" + b" " * 70_000 + b"}", headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 413
    assert response.json() == {"detail": "Request body is too large.", "code": "payload_too_large"}


def test_oversized_streamed_body_is_rejected(contact_client: TestClient) -> None:
    def chunks() -> Any:
        for _ in range(10):
            yield b" " * 10_000

    response = contact_client.post(
        "/api/contact", content=chunks(), headers={"Content-Type": "application/json"}
    )

    assert response.status_code == 413
    assert response.json()["code"] == "payload_too_large"
