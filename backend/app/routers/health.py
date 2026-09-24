from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.routers.dependencies import HealthServiceDep
from app.schemas.health import HealthResponse

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service health",
    description="Liveness plus a `SELECT 1` database check. Returns `503` with `status: degraded` when "
    "the database is unreachable.",
    responses={503: {"model": HealthResponse, "description": "Database unavailable."}},
)
def health(service: HealthServiceDep) -> JSONResponse:
    result = service.check()
    return JSONResponse(
        result.model_dump(mode="json"),
        status_code=200 if result.status == "healthy" else 503,
        headers={"Cache-Control": "no-store"},
    )
