"""Contact form schemas."""

from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints

from app.schemas.common import InputModel

CONTACT_SUCCESS_MESSAGE = "Thank you for your message. I will get back to you as soon as possible."


class ContactCreate(InputModel):
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100)]
    email: Annotated[EmailStr, Field(max_length=254)]
    subject: Annotated[str, StringConstraints(strip_whitespace=True, min_length=3, max_length=150)]
    message: Annotated[str, StringConstraints(strip_whitespace=True, min_length=20, max_length=5000)]
    website: str | None = Field(default=None, description="Honeypot field: must be left empty.")
    elapsed_ms: float | None = Field(
        default=None,
        ge=0,
        description="Milliseconds elapsed between displaying the form and submitting it.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "name": "Jane Doe",
                    "email": "jane.doe@example.com",
                    "subject": "Data Scientist position",
                    "message": "Hello Youssra, I would like to discuss a data science opportunity with you.",
                    "website": "",
                    "elapsed_ms": 5000,
                }
            ]
        }
    )


class ContactResponse(BaseModel):
    success: bool
    message: str

    model_config = ConfigDict(
        json_schema_extra={"examples": [{"success": True, "message": CONTACT_SUCCESS_MESSAGE}]}
    )
