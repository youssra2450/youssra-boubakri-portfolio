# syntax=docker/dockerfile:1
#
# Portfolio API (FastAPI + SQLAlchemy + Alembic) — production image.
#
# Build context = REPOSITORY ROOT (the image also needs database/seed/portfolio.json):
#     docker build -f backend/Dockerfile -t portfolio-api .
# The root .dockerignore limits the context to backend/ and database/seed/.

ARG PYTHON_VERSION=3.12

# ---------------------------------------------------------------------------------------------------------
# 1. Builder: resolve and install the pinned dependencies into an isolated virtual environment
# ---------------------------------------------------------------------------------------------------------
FROM python:${PYTHON_VERSION}-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:${PATH}"

COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-compile -r /tmp/requirements.txt

# ---------------------------------------------------------------------------------------------------------
# 2. Runtime: slim image, non-root user, application code + content seed
# ---------------------------------------------------------------------------------------------------------
FROM python:${PYTHON_VERSION}-slim AS runtime

LABEL org.opencontainers.image.title="portfolio-api" \
      org.opencontainers.image.description="REST API of Youssra Boubakri's professional portfolio (FastAPI + PostgreSQL)"

ENV PATH="/opt/venv/bin:${PATH}" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    ENVIRONMENT=production \
    SEED_FILE=/app/seed/portfolio.json

RUN groupadd --system app \
    && useradd --system --gid app --home-dir /app --no-create-home --shell /usr/sbin/nologin app

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --chown=app:app backend/ /app/
COPY --chown=app:app database/seed/ /app/seed/

USER app

EXPOSE 8000

# PORT lets PaaS platforms (Render, Railway, Fly.io...) choose the port; docker compose uses 8000.
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
    CMD python -c "import os, sys, urllib.request; port = os.environ.get('PORT', '8000'); sys.exit(0 if urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health', timeout=4).status == 200 else 1)"

# Apply migrations, load the content (idempotent: only fills empty tables), then serve.
CMD ["sh", "-c", "alembic upgrade head && python -m app.database.seed && exec uvicorn app.main:app --host 0.0.0.0 --port \"${PORT:-8000}\" --proxy-headers --forwarded-allow-ips='*'"]
