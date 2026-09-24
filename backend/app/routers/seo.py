"""Crawler files served at the site root (proxied by the frontend server)."""

from fastapi import APIRouter, Request
from starlette.responses import PlainTextResponse, Response

from app.routers.dependencies import SeoServiceDep
from app.routers.responses import NOT_MODIFIED
from app.utils.http_cache import cached_response

router = APIRouter(tags=["seo"], responses=NOT_MODIFIED)


@router.get(
    "/robots.txt",
    response_class=PlainTextResponse,
    summary="robots.txt",
    description="Allows the public site, disallows `/api/` and points to the sitemap.",
)
def robots_txt(request: Request, service: SeoServiceDep) -> Response:
    return cached_response(
        request, service.robots_txt().encode("utf-8"), media_type="text/plain; charset=utf-8"
    )


@router.get(
    "/sitemap.xml",
    summary="sitemap.xml",
    description="Home page plus one entry per published project (`lastmod` = last update date).",
    responses={200: {"content": {"application/xml": {}}, "description": "Sitemap document."}},
)
def sitemap_xml(request: Request, service: SeoServiceDep) -> Response:
    return cached_response(request, service.sitemap_xml().encode("utf-8"), media_type="application/xml")
