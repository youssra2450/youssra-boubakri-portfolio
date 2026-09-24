"""Public contact form (enabled only when messages can be forwarded by e-mail)."""

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Header

from app.routers.dependencies import (
    ClientIp,
    ContactServiceDep,
    NotificationServiceDep,
    contact_rate_limit,
    require_contact_form,
)
from app.routers.responses import CONTACT_UNAVAILABLE, RATE_LIMITED
from app.schemas.contact import CONTACT_SUCCESS_MESSAGE, ContactCreate, ContactResponse

router = APIRouter(tags=["contact"])


@router.post(
    "/contact",
    status_code=201,
    response_model=ContactResponse,
    summary="Send a message",
    description=(
        "Available only when e-mail forwarding is configured (`profile.contact_form_enabled`); otherwise "
        "`503 contact_unavailable`.\n\n"
        "The message is validated and sanitised (HTML tags and control characters removed), stored as an "
        "audit trail, then forwarded to the owner by e-mail in the background (`Reply-To` = visitor).\n\n"
        "Anti-abuse: the `website` honeypot must stay empty and `elapsed_ms` (time since the form was "
        "displayed) must reach `CONTACT_MIN_SUBMIT_SECONDS`; failing submissions receive the normal "
        "response but are discarded. Messages with many links or little text are stored flagged as spam "
        "and not forwarded. Requests are rate limited per client IP (`RATE_LIMIT_CONTACT`)."
    ),
    responses={**RATE_LIMITED, **CONTACT_UNAVAILABLE},
    dependencies=[Depends(require_contact_form), Depends(contact_rate_limit)],
)
def submit_contact(
    payload: ContactCreate,
    background_tasks: BackgroundTasks,
    service: ContactServiceDep,
    notifier: NotificationServiceDep,
    ip: ClientIp,
    user_agent: Annotated[str | None, Header(include_in_schema=False)] = None,
) -> ContactResponse:
    submission = service.submit(payload, client_ip=ip, user_agent=user_agent)
    if submission.notification is not None:
        background_tasks.add_task(notifier.forward_contact_message, submission.notification)
    return ContactResponse(success=True, message=CONTACT_SUCCESS_MESSAGE)
