# Youssra Boubakri — Professional Portfolio

**Data Scientist · Data Engineer · Data Analyst** — based in Morocco, mobile across Morocco and open to
international relocation.

> *Turning complex data into decision-ready intelligence.*

This repository is the source of Youssra Boubakri's professional portfolio: a production-grade, full-stack web
application that presents her profile, education, experience, skills and eight data and AI projects. These span
data science, machine learning, NLP, large language models, computer vision and metaheuristic optimisation.

- **GitHub:** [github.com/youssra2450](https://github.com/youssra2450)
- **LinkedIn:** [linkedin.com/in/youssra-boubakri-a4390b25b](https://www.linkedin.com/in/youssra-boubakri-a4390b25b/)

All portfolio content comes from a single data file (`database/seed/portfolio.json`), served by a typed REST API
and rendered by a React single-page application. Nothing is hard-coded in the UI.

---

## Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Technology stack](#technology-stack)
4. [Repository structure](#repository-structure)
5. [Quick start — Windows (one click)](#quick-start--windows-one-click)
6. [Quick start — macOS / Linux](#quick-start--macos--linux)
7. [Docker](#docker)
8. [Manual setup with a system PostgreSQL](#manual-setup-with-a-system-postgresql)
9. [Environment variables](#environment-variables)
10. [API reference](#api-reference)
11. [Updating the content](#updating-the-content)
12. [Enabling the contact form](#enabling-the-contact-form)
13. [Tests](#tests)
14. [Code quality and CI](#code-quality-and-ci)
15. [Security](#security)
16. [Performance and SEO](#performance-and-seo)
17. [Deployment](#deployment)
18. [Troubleshooting](#troubleshooting)
19. [License](#license)

---

## Features

**For visitors (recruiters, engineering managers, tech leads)**

- Home page: hero with the headline roles, professional snapshot and target roles, about section (location,
  mobility, languages, interests), experience and education timelines, skills (category filter, search,
  list and matrix views), capabilities ("What I Can Build"), projects, architecture and contact.
- **Projects**: eight case studies filtered by a fixed taxonomy (Data Science · AI/ML · NLP · LLM · Computer
  Vision · Optimization), a flagship spotlight card, a lightweight SVG cover per project and GitHub/demo links
  where available.
- **Project pages** (`/projects/:slug`): overview, problem, solution, architecture pipeline, key technical
  concepts, technologies, implementation, features, results, lessons learned and previous/next navigation.
- **Interactive UAV trajectory lab** on the optimisation project: Random, Grey Wolf Optimizer, Cuckoo Search
  and Tabu Search re-implemented in TypeScript and run live in the browser on a random instance (it is an
  illustrative re-implementation, and the page says so explicitly).
- E-mail / LinkedIn / GitHub contact cards and an optional contact form that forwards
  messages by e-mail.
- Light, premium visual identity with choreographed motion that honours `prefers-reduced-motion`.

**Engineering**

- Single source of truth for content, validated strictly before anything is written to the database.
- Layered FastAPI backend (router → service → repository → database), typed SQLAlchemy 2.0 models, Alembic
  migrations, OpenAPI documentation, HTTP caching with ETags.
- No administration area and no authentication surface: content is edited in version control.
- One-click local launcher with an embedded PostgreSQL (no Docker, no database installation), Docker Compose
  stack for production, GitHub Actions CI.

## Architecture

```mermaid
flowchart LR
    visitor(["Visitor's browser"])

    subgraph web["Website — React 19 · TypeScript · Vite"]
        spa["Single-page application<br/>sections · project pages · UAV lab"]
    end

    subgraph edge["nginx (Docker) / Vite dev proxy (local)"]
        static["Static files<br/>SPA fallback · caching · CSP"]
        proxy["Reverse proxy<br/>/api · /robots.txt · /sitemap.xml"]
    end

    subgraph api["API — FastAPI"]
        routers["Routers<br/>health · portfolio · contact · seo"]
        services["Services<br/>validation · sanitising · rate limiting"]
        repos["Repositories<br/>SQLAlchemy 2.0"]
    end

    db[("PostgreSQL 16")]
    seed[/"database/seed/portfolio.json"/]
    mail["E-mail provider<br/>SMTP or Resend (optional)"]

    visitor --> static --> spa
    spa -- "fetch /api/*" --> proxy --> routers --> services --> repos --> db
    seed -- "python -m app.database.seed" --> db
    services -- "contact messages" --> mail
```

- **Same origin everywhere**: the browser only talks to the website origin. In development the Vite server
  proxies `/api`; in Docker nginx does. No CORS configuration is needed in either case.
- **Content pipeline**: `portfolio.json` → strict Pydantic validation → PostgreSQL → `GET /api/portfolio`
  (one request for the whole home page) → React.
- **Contact pipeline**: validation → sanitising → honeypot and timing checks → spam heuristic → per-IP rate
  limit → stored → forwarded by e-mail in a background task.

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, TypeScript 6 (strict), Vite 8, Tailwind CSS 4, react-router 8, lucide-react, self-hosted Inter / Manrope / JetBrains Mono |
| Frontend tests & quality | Vitest, Testing Library, ESLint 10 (react-hooks strict rules), `tsc` |
| Backend | Python 3.10+ (3.12 in Docker), FastAPI, Pydantic v2, pydantic-settings, SQLAlchemy 2.0, Alembic, psycopg 3, httpx, uvicorn |
| Backend tests & quality | pytest, pytest-cov (coverage gate 85 %), ruff (lint + format) |
| Database | PostgreSQL 16 (JSONB columns); SQLite in memory for fast unit tests |
| Delivery | Docker (multi-stage images, non-root API), Docker Compose, nginx 1.27, GitHub Actions |
| Local tooling | One-click launcher (`start.bat`) with an embedded PostgreSQL 16 from the `pgserver` wheel |

## Repository structure

```text
.
├── start.bat · stop.bat · update-content.bat   Windows one-click launcher (double-click)
├── scripts/
│   ├── start-windows.ps1 · stop-windows.ps1 · update-content.ps1 · lib/common.ps1
│   └── start.sh · stop.sh                      macOS / Linux equivalents
├── backend/
│   ├── app/
│   │   ├── main.py                             application factory, middleware, error handlers
│   │   ├── core/                               settings, logging, rate limiter, OpenAPI, paths
│   │   ├── database/                           declarative base, sessions, seed command
│   │   ├── models/ schemas/ repositories/ services/ routers/ middleware/ utils/
│   ├── alembic/                                migrations (0001_initial_schema)
│   ├── scripts/local_db.py                     embedded PostgreSQL for local development
│   ├── tests/                                  pytest suite
│   ├── requirements.txt · requirements-dev.txt · requirements-local.txt · pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── public/                                 images, favicons, Open Graph image, web manifest
│   ├── src/
│   │   ├── app/ pages/ sections/               routes, pages and home-page sections
│   │   ├── components/ (ui, layout, common)    design-system primitives and layout
│   │   ├── features/project/                   case-study blocks, SVG covers, uav/ trajectory lab
│   │   ├── hooks/ services/ types/ lib/ styles/ test/
│   ├── index.html · vite.config.ts · nginx.conf · Dockerfile
├── database/
│   ├── seed/portfolio.json                     ALL portfolio content
│   └── README.md                               schema, ER diagram, migration and seed workflow
├── docs/
│   ├── SPEC.md                                 technical specification
│   └── LANCER-LE-PROJET.md                     plain-French guide for the owner
├── docker-compose.yml · .env.example · .github/workflows/ci.yml
└── .gitignore · .gitattributes · .editorconfig · .dockerignore
```

## Quick start — Windows (one click)

**Requirements:** [Python](https://www.python.org/downloads/) 3.10, 3.11 or 3.12 and
[Node.js](https://nodejs.org/) LTS (20.19+ or 22.12+). Nothing else: no Docker, no PostgreSQL installation and
no administrator rights.

1. **Double-click `start.bat`.**
2. Wait for "The portfolio is ready". The first run takes a few minutes (Python and npm packages, database
   initialisation). Later runs take about 15–20 seconds.
3. The browser opens **http://localhost:5173**. API documentation: **http://localhost:8000/api/docs**.

What the launcher does, idempotently:

| Step | Action |
|---|---|
| 1 | Checks Python and Node.js versions and that ports 8000 / 5173 are free (an already running portfolio API or site on those ports is reused) |
| 2 | Creates `backend\.venv` if needed and installs `requirements.txt` + `requirements-local.txt` only when they changed; creates `.env` from `.env.example` with a random `SECRET_KEY` |
| 3 | Starts the **embedded PostgreSQL 16** on port 5433 (data in `.local\pgdata`), creating its role and database on first run |
| 4 | Applies migrations (`alembic upgrade head`) and loads the content (`python -m app.database.seed`, only fills empty tables) |
| 5 | Runs `npm install` in `frontend` when `node_modules` is missing or `package-lock.json` changed |
| 6 | Starts the API and the site in two windows, **"Portfolio — API"** and **"Portfolio — Site"**, waits until both answer, then opens the browser |

**Stop everything:** double-click **`stop.bat`**. It stops only what the launcher started, plus the embedded
database.

Options (from a terminal in the project folder):

```bat
start.bat -ApiPort 8001 -WebPort 5174 -DbPort 5434   :: other ports
start.bat -NoBrowser                                 :: do not open the browser
start.bat -NoNewWindows                              :: hidden background servers, logs in .local\logs
stop.bat -KeepDatabase                               :: stop the API and the site only
```

Local state lives in `.local\` (git-ignored): `pgdata\` (database), `postgres.log`, `logs\`, `pids.json`,
`pg-superuser.txt` (generated password of the local superuser) and install stamps. Deleting `.local\` after
`stop.bat` resets the local database; the next `start.bat` rebuilds it from `portfolio.json`.

## Quick start — macOS / Linux

Same requirements (Python 3.10–3.12, Node.js 20.19+/22.12+, plus `curl`). The embedded database ships for
macOS (Intel and Apple silicon) and Linux x86_64.

```bash
bash scripts/start.sh        # http://localhost:5173 · API docs http://localhost:8000/api/docs
bash scripts/stop.sh
# options: --api-port 8001 --web-port 5174 --db-port 5434 --no-browser --data-dir .local --venv-dir backend/.venv
```

The API and the site run in the background with logs in `.local/logs/`. On other platforms (e.g. Linux ARM),
use Docker or the manual setup.

## Docker

The production-like stack (PostgreSQL 16 → API → nginx serving the built site) in one command:

```bash
cp .env.example .env
# edit .env: set SECRET_KEY (python -c "import secrets; print(secrets.token_urlsafe(48))") and POSTGRES_PASSWORD
docker compose up --build
```

- Site: **http://localhost:8080** · API documentation: **http://localhost:8080/api/docs**
- Only the website container is published (`FRONTEND_PORT`, default 8080). nginx proxies `/api/`,
  `/robots.txt` and `/sitemap.xml` to the backend, which is reachable only on the internal network.
- On start, the backend applies migrations and seeds empty tables. Data persists in the `pgdata` volume.
- Re-apply edited content: `docker compose exec backend python -m app.database.seed --force` (the image
  contains the seed file it was built with, so rebuild after editing: `docker compose up -d --build backend`).
- Stop: `docker compose down` (add `--volumes` to delete the database).

Images: `backend/Dockerfile` (python:3.12-slim, multi-stage, non-root user, health check on `/api/health`;
build context = repository root) and `frontend/Dockerfile` (node:22-alpine build → nginx:1.27-alpine;
build argument `VITE_SITE_URL`, which compose fills from `SITE_URL`).

## Manual setup with a system PostgreSQL

For developers who prefer running each part by hand (PostgreSQL 16 listening on `localhost:5432`).

```bash
# 1. Database (psql as a superuser)
CREATE ROLE portfolio LOGIN PASSWORD 'portfolio';
CREATE DATABASE portfolio OWNER portfolio;

# 2. Configuration
cp .env.example .env              # set SECRET_KEY; DATABASE_URL already targets localhost:5432

# 3. Backend
cd backend
python -m venv .venv
source .venv/bin/activate         # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
alembic upgrade head
python -m app.database.seed
uvicorn app.main:app --reload --port 8000

# 4. Frontend (second terminal)
cd frontend
npm install
npm run dev                       # http://localhost:5173 (proxies /api to http://localhost:8000)
```

The embedded database can also be driven by hand, without a system PostgreSQL:
`python backend/scripts/local_db.py start|stop|status|url` (after `pip install -r backend/requirements-local.txt`).

## Environment variables

Configuration is read from environment variables and `.env` (repository root or `backend/`); `.env.example`
documents every variable. Empty values fall back to the defaults.

| Variable | Default | Purpose |
|---|---|---|
| `ENVIRONMENT` | `development` | `development` / `test` / `production` (production refuses the placeholder `SECRET_KEY` and sends HSTS) |
| `APP_NAME` / `APP_VERSION` | `portfolio-api` / `1.0.0` | Service name and version reported by `/api/health` and OpenAPI |
| `SECRET_KEY` | — (required, ≥ 32 chars) | Salt for hashing visitor IPs; generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `DATABASE_URL` | `postgresql+psycopg://portfolio:portfolio@localhost:5432/portfolio` | SQLAlchemy URL; `postgres://` URLs are accepted. Overridden by `start.bat` and docker compose |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `portfolio` × 3 | Credentials of the compose `db` service and of the embedded local database |
| `LOCAL_DB_PORT` | `5433` | Port of the embedded PostgreSQL when `local_db.py` runs by hand (`start.bat` uses `-DbPort`) |
| `PORTFOLIO_LOCAL_DIR` | `.local` | State folder of `local_db.py` (set by the launchers) |
| `TEST_DATABASE_URL` | empty (SQLite) | Runs the pytest suite against PostgreSQL |
| `SITE_URL` | `http://localhost:8080` | Public site URL for `robots.txt`, `sitemap.xml` and the Docker frontend build |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:4173,http://localhost:8080` | Browser origins allowed to call the API directly (only needed for split-domain hosting) |
| `FRONTEND_PORT` | `8080` | Host port of the website in docker compose |
| `TRUST_PROXY_HEADERS` | `false` | Read the client IP from `X-Forwarded-For` (forced to `true` in compose, behind nginx) |
| `DOCS_ENABLED` | `true` | Serve `/api/docs`, `/api/redoc`, `/api/openapi.json` |
| `PORTFOLIO_GITHUB_URL` / `PORTFOLIO_LINKEDIN_URL` | her profile URLs | Applied to the profile by the seed |
| `SEED_FILE` | repository copy, then `/app/seed/portfolio.json` | Content file loaded by the seed |
| `EMAIL_PROVIDER` | `none` | `none` / `smtp` / `resend`; the contact form is shown only when fully configured |
| `EMAIL_FROM` / `EMAIL_TO` | empty | Sender and recipient of forwarded contact messages |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` / `SMTP_USE_TLS` | — / `587` / — / — / `true` | SMTP settings (STARTTLS) |
| `RESEND_API_KEY` | empty | Resend API key |
| `RATE_LIMIT_CONTACT` | `5/hour` | Contact submissions per client IP (`<count>/<second\|minute\|hour\|day>`) |
| `CONTACT_MIN_SUBMIT_SECONDS` | `3` | Minimum form-filling time; faster submissions are treated as bots |
| `LOG_LEVEL` / `LOG_JSON` | `INFO` / `false` | Log verbosity; JSON lines for log collectors |

Frontend (Vite, see `frontend/.env.example`): `VITE_SITE_URL` (canonical and Open Graph URLs),
`VITE_API_BASE_URL` (default `/api`) and `VITE_DEV_API_TARGET` (dev-server proxy target, default
`http://localhost:8000`).

## API reference

Interactive documentation: **`/api/docs`** (Swagger UI), **`/api/redoc`**, schema at **`/api/openapi.json`**
(for example http://localhost:8000/api/docs locally, or http://localhost:8080/api/docs with Docker).

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Liveness + database check: `200 {"status":"healthy","database":"connected",...}`, `503` when the database is down |
| GET | `/api/portfolio` | Everything the home page needs in one request: `{profile, education, experience, skills, projects}` |
| GET | `/api/profile` | Profile, including `contact_form_enabled` |
| GET | `/api/education` | Education entries, ordered |
| GET | `/api/experience` | Experience entries, ordered |
| GET | `/api/skills` | Skill categories with their skills |
| GET | `/api/projects` | Published project summaries; filters `domain`, `technology` (case-insensitive), `featured` |
| GET | `/api/projects/{id_or_slug}` | Project detail; `404 not_found` otherwise |
| POST | `/api/contact` | Contact message → `201`; `422` validation, `429` rate limited (`Retry-After`), `503 contact_unavailable` while e-mail forwarding is not configured |
| GET | `/robots.txt` · `/sitemap.xml` | Crawler directives and sitemap (home + every published project) |

Conventions: JSON in `snake_case`; every error is `{"detail", "code"}` (validation errors add
`errors: [{field, message}]`); public `GET` endpoints send `Cache-Control: public, max-age=60` and a weak `ETag`
(`If-None-Match` → `304`).

## Updating the content

All texts, projects, skills and links live in **`database/seed/portfolio.json`**; nothing is hard-coded in the
UI. Keys starting with `_` are comments and are ignored.

1. Edit `database/seed/portfolio.json` (keep valid JSON: quotes, commas, brackets).
2. **Windows:** double-click **`update-content.bat`**. Elsewhere, run
   `python -m app.database.seed --force` from `backend/` (with `DATABASE_URL` pointing at the database).
3. Refresh the site. API responses may be cached by the browser for up to 60 seconds.

The file is validated before anything changes: if it contains an error, the database is left untouched and the
error is printed. `--force` reloads every content table; contact messages are never deleted.

- **CV:** intentionally not published on the site (it contains private contact details); recruiters
  reach the owner by e-mail, LinkedIn or GitHub.
- **Photo:** `frontend/public/images/` (the hero uses the 480/800/1200 px WebP variants referenced in
  `index.html` and `profile.photo_url`).

## Enabling the contact form

The site always shows the e-mail, LinkedIn and GitHub cards. The **form** appears automatically once the API
can forward messages by e-mail (`profile.contact_form_enabled` becomes `true`). Set the following in `.env`,
then restart the API:

- **Gmail (SMTP):** enable 2-Step Verification on the Google account and create an *App password*. Then set
  `EMAIL_PROVIDER=smtp`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USE_TLS=true`,
  `SMTP_USERNAME=<gmail address>`, `SMTP_PASSWORD=<app password>`, `EMAIL_FROM=<gmail address>` and
  `EMAIL_TO=<recipient>`.
- **Resend:** `EMAIL_PROVIDER=resend`, `RESEND_API_KEY=re_...`, `EMAIL_FROM=<sender on a domain verified in
  Resend>` and `EMAIL_TO=<recipient>`.

Messages are stored in `contact_messages` (audit trail) and forwarded with `Reply-To` set to the visitor's
address. Forwarding failures are logged and never shown to the visitor.

## Tests

```bash
# Backend (from backend/): SQLite in memory by default
pytest --cov=app
# ... or against PostgreSQL
TEST_DATABASE_URL=postgresql+psycopg://portfolio:portfolio@localhost:5432/portfolio_test pytest

# Frontend (from frontend/)
npm run test -- --run          # Vitest + Testing Library (watch mode without --run)
npm run test:coverage
```

The backend suite covers the health check, every public endpoint (ordering, filters, 404s, ETag/304), the full
contact pipeline (disabled / enabled, validation, honeypot, timing, spam, sanitising, rate limiting),
robots and sitemap, repositories, seed idempotency and `--force`, and settings validation. CI enforces
at least 85 % coverage. The frontend suite covers sections, the project page, SVG covers, utilities and the UAV
optimisation algorithms.

## Code quality and CI

```bash
# backend/
ruff check . && ruff format --check .
alembic check                    # models and migrations in sync
# frontend/
npm run lint && npm run typecheck && npm run build
```

`.github/workflows/ci.yml` runs on every push and pull request:

1. **Backend**: Python 3.12 with a PostgreSQL 16 service; ruff lint and format checks, `alembic upgrade head`,
   `alembic check`, the seed twice (idempotency) and pytest with an 85 % coverage gate.
2. **Frontend**: Node.js 22; `npm ci`, ESLint, TypeScript, Vitest and the production build.
3. **Docker**: builds both images, starts the compose stack and smoke-tests the site, `/api/health`,
   `/api/portfolio`, the sitemap, the SPA fallback headers and the API docs through nginx.

`.editorconfig` and `.gitattributes` keep formatting and line endings consistent (CRLF for `.bat` / `.ps1`,
LF elsewhere).

## Security

- **No authentication surface**: there is no admin area, login or user table. Content changes go through
  version control.
- **Input handling**: strict Pydantic validation, HTML and control-character stripping, honeypot and minimum
  fill time, spam heuristic and a sliding-window per-IP rate limit on `POST /api/contact`. Request bodies are
  size-limited (64 KB in the API, 1 MB at nginx).
- **Privacy**: visitor IPs are stored only as salted SHA-256 hashes (`SECRET_KEY`), and no phone number is
  published.
- **HTTP hardening**: CORS allow-list; `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy` and HSTS in production (API); strict Content-Security-Policy on the site (nginx),
  relaxed only for the API documentation pages; request IDs and access logs without bodies or secrets.
- **Data access**: ORM-only queries; no file downloads or uploads; errors return a generic body (details
  are logged, never returned).
- **Operations**: secrets only in `.env` (git-ignored), placeholder `SECRET_KEY` refused in production, non-root
  API container, database not exposed outside the compose network, trusted-proxy handling of
  `X-Forwarded-For`.

## Performance and SEO

- One API request renders the whole home page (`/api/portfolio`), with `ETag` / `304` revalidation and
  `Cache-Control: public, max-age=60`.
- Route-level code splitting: the project page, the 404 page and the UAV lab are separate chunks, and React and
  the router are split into long-lived vendor chunks.
- nginx serves hashed assets with `Cache-Control: immutable` (1 year) and revalidates `index.html` on every
  visit. Responses are gzip-compressed.
- Self-hosted variable fonts; the hero portrait is preloaded with a responsive WebP `srcset` (480/800/1200 px).
  Project covers are lightweight inline SVG.
- Motion uses only `transform`, `opacity`, `clip-path` and `stroke-dashoffset`, and is fully disabled under
  `prefers-reduced-motion`.
- SEO: descriptive title and meta description, canonical URL, Open Graph and Twitter cards (1200×630 image),
  JSON-LD `Person` with `sameAs` links, a `robots.txt` and `sitemap.xml` generated from the published projects,
  and a `<noscript>` summary.

## Deployment

### Option A — a single VPS with Docker Compose and HTTPS (recommended)

1. Install Docker on the server, then clone the repository.
2. `cp .env.example .env` and set `ENVIRONMENT=production`, a random `SECRET_KEY`, a strong
   `POSTGRES_PASSWORD`, `SITE_URL=https://<your-domain>`, and optionally the e-mail settings.
3. `docker compose up -d --build`. The site listens on port 8080.
4. Put a TLS-terminating reverse proxy in front. With [Caddy](https://caddyserver.com), certificates are
   automatic; this `Caddyfile` is enough:

   ```caddy
   your-domain.example {
       encode zstd gzip
       header Strict-Transport-Security "max-age=31536000; includeSubDomains"
       reverse_proxy 127.0.0.1:8080
   }
   ```

   nginx in the container trusts `X-Forwarded-For` only from private and loopback addresses, so the API sees
   the real client IP for rate limiting.
5. Updates: `git pull && docker compose up -d --build`. Back up the database with
   `docker compose exec db pg_dump -U portfolio portfolio > backup.sql`.

### Option B — managed platforms

- **Database:** any managed PostgreSQL 14+ (Neon, Supabase, Render, Railway...). Use its connection string
  as `DATABASE_URL`; `postgres://` URLs are accepted.
- **API:** deploy `backend/Dockerfile` with the **repository root as build context** on Render, Railway or
  Fly.io. The container applies migrations, seeds and listens on `$PORT` (default 8000). Set `SECRET_KEY`,
  `ENVIRONMENT=production`, `DATABASE_URL`, `SITE_URL` and `TRUST_PROXY_HEADERS=true`.
- **Website:** deploy `frontend/` on Vercel or Netlify (build `npm run build`, output `dist`, environment
  `VITE_SITE_URL=https://<your-domain>`). Keep the API same-origin by adding rewrites from `/api/*`,
  `/robots.txt` and `/sitemap.xml` to the API URL, plus the SPA fallback to `/index.html`. Examples: Netlify
  `_redirects` or `netlify.toml`, Vercel `rewrites` in `vercel.json`. Alternatively, call the API cross-origin
  with `VITE_API_BASE_URL=https://api.<your-domain>/api` and add the site origin to `CORS_ORIGINS`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| **"Port 8000 / 5173 is already used by another program"** | Close that program, or start on other ports: `start.bat -ApiPort 8001 -WebPort 5174`. A portfolio API or site already running on those ports is reused automatically. |
| **Database port 5433 busy** | Another program uses it: `start.bat -DbPort 5434`. |
| **Python not found / wrong version** | Install Python 3.12 from python.org and tick *Add python.exe to PATH*. Python 3.13+ alone is not enough, because the embedded PostgreSQL wheels exist for 3.10–3.12 only. |
| **Node.js not found / too old** | Install the LTS version from nodejs.org (20.19+ or 22.12+). |
| **"Running scripts is disabled on this system"** | Always start through `start.bat`, which runs PowerShell with `-ExecutionPolicy Bypass` for that process only. If an organisation policy (`AllSigned` set by Group Policy) still blocks it, use the manual setup or Docker. |
| **"The project folder is too deep for Windows"** | Windows limits paths to 259 characters. Move the project to a short path such as `C:\portfolio`. |
| **Windows SmartScreen warns about `start.bat`** | Files downloaded as a ZIP are flagged. Right-click the ZIP → Properties → *Unblock* before extracting, or choose *More info → Run anyway*. |
| **First start is slow** | It installs the Python/npm packages and initialises PostgreSQL. Later starts take about 15–20 seconds. |
| **The site shows an error or no data** | Check the "Portfolio — API" window. The log of the embedded database is `.local\postgres.log`, and with `-NoNewWindows` the server logs are in `.local\logs\`. |
| **Content changes do not appear** | Run `update-content.bat`, then refresh with Ctrl+F5 (up to 60 s of browser cache). |
| **Start from a clean state** | `stop.bat`, delete the `.local` folder, then `start.bat`. |

## License

No open-source license is granted, so default copyright applies: all rights reserved. The source code, texts
and photographs belong to Youssra Boubakri and are published for portfolio review. Reuse or redistribution
requires her written permission.
