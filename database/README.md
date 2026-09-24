# Database

PostgreSQL 16 stores the portfolio content, loaded from **`seed/portfolio.json`**, plus the contact messages.
The schema is defined by the SQLAlchemy models in `backend/app/models/` and created by a single Alembic
migration, `backend/alembic/versions/0001_initial_schema.py`. There is no users table: the site has no
administration area.

| Environment | Database |
|---|---|
| Windows launcher (`start.bat`) / `scripts/start.sh` | Embedded PostgreSQL 16 (`pgserver` wheel), data in `.local/pgdata`, port **5433** |
| Docker (`docker compose up`) | `postgres:16-alpine` service `db`, volume `pgdata`, not published outside the compose network |
| Manual setup | Any PostgreSQL 14+ reachable through `DATABASE_URL` (default `localhost:5432/portfolio`) |
| Backend unit tests | SQLite in memory by default; PostgreSQL when `TEST_DATABASE_URL` is set |

## Entity-relationship diagram

```mermaid
erDiagram
    profile {
        int id PK
        varchar full_name
        varchar headline
        varchar tagline
        text summary
        text about_who
        text about_what
        text about_build
        varchar location
        varchar mobility
        varchar email
        varchar phone "nullable (not published)"
        varchar github_url "nullable"
        varchar linkedin_url "nullable"
        varchar photo_url
        jsonb target_roles "list of strings"
        jsonb languages "list of {name, level}"
        jsonb interests "list of strings"
        jsonb snapshot "list of {title, items}"
        jsonb capabilities "list of {key, title, description, tools}"
    }
    education {
        int id PK
        varchar degree
        varchar degree_original "nullable"
        varchar institution
        varchar location "nullable"
        int start_year
        int end_year "nullable, >= start_year"
        varchar status "completed | in_progress"
        text description "nullable"
        int display_order
    }
    experiences {
        int id PK
        varchar organization
        varchar location "nullable"
        varchar employment_type "default Internship"
        varchar role "nullable"
        date start_date
        date end_date "nullable, >= start_date"
        varchar project_title "nullable"
        text description "nullable"
        jsonb highlights "list of strings"
        jsonb technologies "list of strings"
        int display_order
    }
    skill_categories {
        int id PK
        varchar slug UK
        varchar name
        text description "nullable"
        varchar icon "nullable"
        int display_order
    }
    skills {
        int id PK
        int category_id FK
        varchar name "unique per category"
        varchar proficiency "advanced | proficient | familiar | null"
        boolean is_core
        int display_order
    }
    projects {
        int id PK
        varchar slug UK
        varchar title
        varchar title_original "nullable"
        varchar category
        jsonb domains "filter taxonomy"
        jsonb concepts "key technical concepts"
        varchar visual "cover key, nullable"
        varchar context "nullable"
        varchar period_label "nullable"
        int start_year "nullable"
        int end_year "nullable"
        text summary
        text problem "nullable"
        text solution "nullable"
        jsonb architecture "list of {step, description}"
        jsonb implementation "list of strings"
        jsonb features "list of strings"
        jsonb results "list of strings"
        jsonb lessons_learned "list of strings"
        varchar github_url "nullable"
        varchar demo_url "nullable"
        boolean featured
        boolean is_published
        int display_order
    }
    project_technologies {
        int id PK
        int project_id FK
        varchar name "unique per project"
        int display_order
    }
    contact_messages {
        int id PK
        varchar name
        varchar email
        varchar subject
        text message
        varchar ip_hash "sha256(ip + SECRET_KEY), nullable"
        varchar user_agent "nullable"
        boolean is_spam
        boolean email_forwarded
    }

    skill_categories ||--o{ skills : "groups (ON DELETE CASCADE)"
    projects ||--o{ project_technologies : "uses (ON DELETE CASCADE)"
```

Every table also has `created_at` and `updated_at` (`timestamptz`, server default `now()`, refreshed on update).
They are omitted from the diagram for readability.

## Tables

| Table | Rows (current seed) | Notes |
|---|---|---|
| `profile` | 1 | Single row with the identity, positioning and "about" texts. JSON columns hold ordered lists. `phone` exists in the schema but stays `NULL` and is never displayed. |
| `education` | 5 | Ordered by `display_order`, then `start_year` descending. `ck_education_status`, `ck_education_year_range`. |
| `experiences` | 3 | Ordered by `display_order`, then `start_date` descending. `ck_experiences_date_range`. |
| `skill_categories` | 10 | `slug` unique. |
| `skills` | 64 | FK `category_id` → `skill_categories.id` `ON DELETE CASCADE`; `uq_skills_category_id_name`; `ck_skills_proficiency`. |
| `projects` | 8 | `slug` unique (used in `/projects/:slug`). `domains` drives the filters (Data Science · AI/ML · NLP · LLM · Computer Vision · Optimization); `visual` selects the SVG cover. Indexed on `featured`, `is_published`, `display_order`. |
| `project_technologies` | per project | FK `project_id` → `projects.id` `ON DELETE CASCADE`; `uq_project_technologies_project_id_name`; indexed on `name` for the `technology` filter. |
| `contact_messages` | runtime | Audit trail of the contact form (never touched by the seed). Indexed on `email` and `created_at`. Visitor IPs are stored only as salted hashes. |

**Conventions**

- `id` integer identity primary keys; `display_order` integer (default 0) for explicit ordering.
- Constraint and index names follow the metadata naming convention: `pk_<table>`, `uq_<table>_<columns>`,
  `ck_<table>_<name>`, `fk_<table>_<column>_<referred table>`, `ix_<table>_<column>`.
- JSON columns are `JSONB` on PostgreSQL and `JSON` elsewhere (`sa.JSON().with_variant(JSONB, "postgresql")`),
  so the same models run on SQLite in tests.
- Timestamps are timezone-aware (`timestamptz`) and stored in UTC.

## Migrations (Alembic)

Run from `backend/`, with `DATABASE_URL` pointing at the target database (read from the environment or `.env`).

```bash
alembic upgrade head        # create / update the schema (start.bat and Docker do this on every start)
alembic current             # revision applied to the database
alembic check               # fails if the models and the migrations have drifted apart (run in CI)
```

Changing the schema:

1. Edit the models in `backend/app/models/`.
2. `alembic revision --autogenerate -m "short description"`, then review the generated file in
   `backend/alembic/versions/` (constraint names, server defaults, data migrations if needed).
3. `alembic upgrade head`, then `alembic check` (must report *No new upgrade operations detected*).
4. Update the seed schema (`backend/app/schemas/seed.py`), `portfolio.json` and the tests if the change
   affects content.

## Seed (content loading)

The seed loads `seed/portfolio.json` into the content tables.

```bash
python -m app.database.seed                  # fills EMPTY content tables only (idempotent, safe on every start)
python -m app.database.seed --force          # wipes the content tables and reloads them from the file
python -m app.database.seed --seed-file PATH # another file (default: SEED_FILE, then this repository's copy)
```

- The whole file is **validated first** (strict Pydantic schema, `backend/app/schemas/seed.py`). If anything
  is invalid, nothing is written and the error is printed.
- `--force` empties `profile`, `education`, `experiences`, `skill_categories`, `skills`, `projects` and
  `project_technologies` (`TRUNCATE ... RESTART IDENTITY` on PostgreSQL, so ids stay stable), then reloads
  them. **`contact_messages` is never touched.**
- Keys starting with `_` (`_source`, `_taxonomy`, ...) are comments and are ignored.
- Defaults: missing skill `proficiency` → `NULL`, `is_core` → `false`, skill `display_order` = position in the
  list; missing project `concepts` → `[]`, `visual` → `NULL`; project technologies keep the list order.
- `PORTFOLIO_GITHUB_URL` / `PORTFOLIO_LINKEDIN_URL`, when set, overwrite the profile links after loading.

JSON structure → tables:

| `portfolio.json` key | Table(s) |
|---|---|
| `profile` | `profile` |
| `education[]` | `education` |
| `experiences[]` | `experiences` |
| `skill_categories[]` (each with `skills[]`) | `skill_categories`, `skills` |
| `projects[]` (each with `technologies[]`) | `projects`, `project_technologies` |

**Owner workflow:** edit `seed/portfolio.json`, then double-click `update-content.bat` at the repository root.
It runs `seed --force` against the embedded database and reports any error without changing anything. With
Docker, rebuild the backend image and run `docker compose exec backend python -m app.database.seed --force`.

## Working with the embedded database

`backend/scripts/local_db.py` drives the PostgreSQL 16 binaries shipped in the `pgserver` wheel
(`backend/requirements-local.txt`); the launchers call it automatically.

```bash
python backend/scripts/local_db.py start    # initialises .local/pgdata once, starts on port 5433, prints the URL
python backend/scripts/local_db.py status   # exit code 0 when running, 3 when stopped
python backend/scripts/local_db.py url      # postgresql+psycopg://portfolio:portfolio@localhost:5433/portfolio
python backend/scripts/local_db.py stop     # fast, clean shutdown
```

(Use `backend\.venv\Scripts\python.exe` on Windows or `backend/.venv/bin/python` on macOS/Linux.)

- Options: `--port` (or `LOCAL_DB_PORT`) and `--local-dir` (or `PORTFOLIO_LOCAL_DIR`). The role and database
  come from `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` and are created idempotently.
- It listens on `localhost` only, with `scram-sha-256` authentication. The generated superuser (`postgres`)
  password is stored in `.local/pg-superuser.txt`, and the server log in `.local/postgres.log`.
- **psql:** the client ships with the same binaries, e.g. on Windows
  `backend\.venv\Lib\site-packages\pgserver\pginstall\bin\psql.exe -h localhost -p 5433 -U portfolio portfolio`.
- **Backup:** `...\pginstall\bin\pg_dump.exe -h localhost -p 5433 -U portfolio portfolio > backup.sql`
  (Docker: `docker compose exec db pg_dump -U portfolio portfolio > backup.sql`).
- **Reset:** `stop.bat`, delete `.local/`, then `start.bat`. The schema and content are rebuilt from the
  migration and `portfolio.json`; stored contact messages are lost.
