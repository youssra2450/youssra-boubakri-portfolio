# Portfolio — Technical Specification (single source of truth) · v2

Full-stack professional portfolio for **Youssra Boubakri** — Data Scientist | Data Engineer | Data Analyst (Nador, Morocco).

Everything in this file is a contract shared by the backend, the frontend and the DevOps files. If you need to deviate, keep the deviation backward compatible and document it in the README.

> **v2 changes (owner decisions, 2026-09-22)**
> 1. **No admin area at all**: no login, no JWT, no users table, no admin endpoints, no admin UI, no CV upload. Visitors never see any authentication. Content is edited in `database/seed/portfolio.json` and applied with `python -m app.database.seed --force`.
> 2. **Public contact channels = email + LinkedIn + GitHub** (phone is not displayed; `profile.phone` is null). The contact form is shown only when the backend can forward messages by email (`profile.contact_form_enabled`).
> 3. **Projects enriched to 8** (two CV projects merged with richer details, three new ones). New project fields `concepts`, `visual`; `period_label`/years may be null; summaries now include `github_url`/`demo_url`. Projects are filtered with a fixed taxonomy: All · Data Science · AI/ML · NLP · LLM · Computer Vision · Optimization.

> **v3 changes (owner decisions, 2026-09-22, later the same day)**
> 4. **Location = "Morocco"** only (no city) for her own location everywhere (hero, about, contact, footer, SEO, OG image). Institutions/companies keep their own city. **Mobility** is explicit: *"Mobile across Morocco and open to international relocation — available to travel for full-time positions and internships."* (seed `profile.mobility`) — surface it prominently (hero eyebrow/badge, About side panel, Contact).
> 5. **Voice**: very professional, advanced, recruiter-oriented English (confident, concise, outcome-oriented, active verbs, no clichés like "passionate", no exclamation marks, no emojis). Seed copy already rewritten; UI copy (section eyebrows, headings, leads, buttons, empty/error states, footer) must match this voice.
> 6. **Motion**: the owner wants the site **more animated** while staying premium and professional. Richer, choreographed motion is now allowed (see §3.2 "Motion v3"); still no gaming/cyberpunk effects, no particles, no 3D tilts, no heavy libraries, and everything honours `prefers-reduced-motion`.

> **v4 changes (owner decisions, 2026-09-22) — LIGHT THEME, overrides every "navy background" mention below**
> 7. **No navy / black / dark backgrounds anywhere** (hero, architecture, footer, project covers, UAV canvas, mobile menu, buttons with dark fills). The site uses **white, beige (ivory / sand) and light blue** backgrounds only. Blue is the accent. Navy/ink may still be used for **text** and fine line-art, never as a surface colour. See §3.2 "Palette v4".
> 8. **Header and footer** must be the best possible, premium versions (see §3.3 "Header v4" / "Footer v4").
> 9. Writing: very professional (v3 voice) across all UI copy.

> **v5 change (owner decision, 2026-09-23) — NO CV ON THE SITE**
> 10. Remove every CV entry point: no "Download CV", no "View CV" anywhere (header CTA, mobile menu, hero CTAs, contact, footer, 404, noscript). The header's primary CTA becomes **"Get in touch"** (→ `#contact`); hero CTAs become **View my work** + **Get in touch**; footer CTA band keeps *Get in touch* only. Backend: remove `GET /api/cv` and `/api/cv/download`, the CV service/router/settings (`CV_FILE`), `cv_url` / `cv_download_url` from `Profile`, related tests and docs; delete `backend/assets/cv/` (the CV contains her phone number and must not be publicly reachable). Recruiters contact her by email, LinkedIn or GitHub.

---

## 0. Ground rules

1. **Never invent facts.** All portfolio content lives in `database/seed/portfolio.json` (CV + details provided by the owner). No new companies, roles, dates, years, metrics, results, certifications or technologies. Null / empty fields stay empty; the UI hides empty elements gracefully (never shows "TODO", "Lorem ipsum", placeholder years or fake numbers).
2. Site language: **English** (original French titles kept in `*_original` fields).
3. Frontend never hard-codes portfolio content: it fetches it from the API. Only UI copy (section headings, button labels, the generic "data lifecycle" diagram, illustrative visuals) lives in the frontend.
4. Python code must run on **Python 3.10+** (local 3.10, Docker 3.12): no `datetime.UTC`, no `enum.StrEnum`, no `typing.Self`. Use `datetime.now(timezone.utc)`.
5. snake_case JSON everywhere.
6. No secrets in git. All config via environment variables (`.env`, `.env.example`).

---

## 1. Repository layout

```
./
├── frontend/                  React 19 + TypeScript + Vite + Tailwind CSS v4
│   ├── public/                images/, og-image.jpg, favicons, site.webmanifest
│   ├── src/
│   │   ├── app/               App.tsx, router.tsx
│   │   ├── components/        ui/ (primitives), layout/ (Navbar, Footer, ...), common/
│   │   ├── sections/          Hero, Snapshot, About, Experience, Education, Skills, Capabilities, Projects, Architecture, Contact
│   │   ├── features/project/  project case-study building blocks, ProjectVisual covers, uav/ (interactive trajectory lab)
│   │   ├── pages/             HomePage, ProjectDetailPage, NotFoundPage
│   │   ├── hooks/ services/ types/ lib/ styles/ test/
│   ├── index.html · nginx.conf · Dockerfile
├── backend/
│   ├── app/
│   │   ├── main.py            create_app(), middleware, routers, exception handlers
│   │   ├── core/              config, logging, rate_limit, exceptions, openapi, paths
│   │   ├── database/          base (DeclarativeBase + mixins), session, seed
│   │   ├── models/            profile, education, experience, skill, project, contact
│   │   ├── schemas/  repositories/  services/  routers/  middleware/  utils/
│   ├── alembic/ (env.py, versions/0001_initial_schema.py) · alembic.ini
│   ├── assets/cv/Youssra_Boubakri_CV.pdf
│   ├── tests/ · requirements.txt · requirements-dev.txt · pyproject.toml · Dockerfile
├── database/  seed/portfolio.json (content) · README.md (schema docs)
├── docs/SPEC.md · .github/workflows/ci.yml · docker-compose.yml · .env.example · .gitignore · README.md
```

Strict backend layering: **router → service → repository → database**. Services raise domain exceptions (`NotFoundError`, `RateLimitExceeded`, `ValidationError`, ...) mapped to HTTP responses in `main.py`.

---

## 2. Backend

FastAPI · Pydantic v2 · pydantic-settings · SQLAlchemy 2.0 (typed, **sync**) · psycopg 3 · Alembic · email-validator · httpx (Resend + tests) · uvicorn · pytest. (**No** PyJWT, bcrypt or python-multipart anymore.)

Portable column types (SQLite for fast tests, PostgreSQL for real): `sa.JSON().with_variant(JSONB, "postgresql")`, `DateTime(timezone=True)`, `Date`, `String(n)`, `Text`.

### 2.1 Settings (environment variables)

| Variable | Default (dev) | Notes |
|---|---|---|
| `ENVIRONMENT` | `development` | `development` / `test` / `production` |
| `APP_NAME` / `APP_VERSION` | `portfolio-api` / `1.0.0` | |
| `DATABASE_URL` | `postgresql+psycopg://portfolio:portfolio@localhost:5432/portfolio` | |
| `SECRET_KEY` | *(required, ≥ 32 chars; refuse the `.env.example` placeholder in production)* | salt for hashing visitor IPs |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:4173,http://localhost:8080` | comma separated |
| `SITE_URL` | `http://localhost:8080` | public site URL for sitemap/robots |
| `CV_FILE` | *(empty → `backend/assets/cv/Youssra_Boubakri_CV.pdf`)* | optional override path of the CV PDF |
| `RATE_LIMIT_CONTACT` | `5/hour` | `<count>/<second|minute|hour|day>` |
| `TRUST_PROXY_HEADERS` | `false` | true → client IP = first `X-Forwarded-For` entry |
| `CONTACT_MIN_SUBMIT_SECONDS` | `3` | anti-bot timing |
| `EMAIL_PROVIDER` | `none` | `none` / `smtp` / `resend` — the contact form is enabled only when not `none` and `EMAIL_TO` is set |
| `EMAIL_FROM`, `EMAIL_TO` | empty | |
| `SMTP_HOST`, `SMTP_PORT` (587), `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_USE_TLS` (true) | | |
| `RESEND_API_KEY` | empty | |
| `PORTFOLIO_GITHUB_URL`, `PORTFOLIO_LINKEDIN_URL` | her URLs | applied by the seed to `profile.github_url` / `linkedin_url` when set |
| `SEED_FILE` | *(auto)* | env → `<repo>/database/seed/portfolio.json` → `/app/seed/portfolio.json` |
| `LOG_LEVEL` / `LOG_JSON` | `INFO` / `false` | |
| `DOCS_ENABLED` | `true` | `/api/docs`, `/api/redoc`, `/api/openapi.json` |

### 2.2 Database schema (single initial migration `0001_initial_schema`)

Common: `id` integer PK, `created_at` / `updated_at` (`DateTime(tz)`, server default now, onupdate), naming convention on MetaData (`ix_`, `uq_`, `ck_`, `fk_`, `pk_`).

**profile** (single row) — `full_name` String(120) · `headline` String(200) · `tagline` String(200) · `summary` Text · `about_who` / `about_what` / `about_build` Text · `location` String(120) · `mobility` String(255) · `email` String(254) · `phone` String(40) nullable · `github_url` / `linkedin_url` String(500) nullable · `photo_url` String(500) · JSON: `target_roles` list[str], `languages` list[{name, level}], `interests` list[str], `snapshot` list[{title, items}], `capabilities` list[{key, title, description, tools}].

**education** — `degree` String(200) · `degree_original` String(255)? · `institution` String(200) · `location` String(120)? · `start_year` int · `end_year` int? · `status` String(20) default `completed` (ck in completed/in_progress) · `description` Text? · `display_order` int (ix). ck `end_year IS NULL OR end_year >= start_year`.

**experiences** — `organization` String(200) · `location` String(120)? · `employment_type` String(50) default `Internship` · `role` String(200)? · `start_date` Date · `end_date` Date? · `project_title` String(200)? · `description` Text? · JSON `highlights`, `technologies` · `display_order` int (ix). ck `end_date IS NULL OR end_date >= start_date`.

**skill_categories** — `slug` String(80) unique · `name` String(120) · `description` Text? · `icon` String(50)? · `display_order` int (ix).

**skills** — `category_id` FK → skill_categories ON DELETE CASCADE (ix) · `name` String(100) · `proficiency` String(20)? (ck advanced/proficient/familiar) · `is_core` bool default false · `display_order` int. uq (`category_id`, `name`).

**projects** — `slug` String(120) unique · `title` String(200) · `title_original` String(255)? · `category` String(120) · JSON `domains` list[str] (filter taxonomy) · JSON `concepts` list[str] (key technical concepts) · `visual` String(40)? (cover identity key: `multi-agent`, `biometric`, `vision`, `medical`, `document`, `uav`) · `context` String(120)? · `period_label` String(40) **nullable** · `start_year` / `end_year` int? · `summary` Text · `problem` / `solution` Text? · JSON `architecture` list[{step, description}], `implementation`, `features`, `results`, `lessons_learned` list[str] · `github_url` / `demo_url` String(500)? · `featured` bool (ix) · `is_published` bool default true (ix) · `display_order` int (ix).

**project_technologies** — `project_id` FK → projects ON DELETE CASCADE (ix) · `name` String(100) (ix) · `display_order` int · uq (`project_id`, `name`). Relationship `Project.technologies` ordered, `cascade="all, delete-orphan"`.

**contact_messages** — `name` String(100) · `email` String(254) (ix) · `subject` String(150) · `message` Text · `ip_hash` String(64)? (sha256(ip + SECRET_KEY)) · `user_agent` String(300)? · `is_spam` bool default false · `email_forwarded` bool default false · ix (`created_at`). (Stored as an audit trail; messages reach the owner by email.)

There is **no users table**. Nothing is deployed yet, so `0001_initial_schema.py` is simply rewritten to this schema (no extra migration). `alembic check` must be clean against it.

**Seed** `python -m app.database.seed [--force]`: idempotent; inserts content only into empty tables unless `--force` (wipes and reloads content tables — never `contact_messages`). Applies `PORTFOLIO_GITHUB_URL` / `PORTFOLIO_LINKEDIN_URL` when set. Keys starting with `_` are ignored (e.g. `_source`, `_taxonomy`). Skills: missing `proficiency` → null, `is_core` → false, `display_order` = list position. Projects: missing `concepts` → [], `visual` → null.

### 2.3 REST API (prefix `/api`; OpenAPI `/api/openapi.json`, Swagger `/api/docs`, ReDoc `/api/redoc`)

Tags: `health`, `portfolio`, `contact`, `cv`, `seo`. Error body: `{"detail", "code"}`; validation `422 {"detail":"Validation error","code":"validation_error","errors":[{"field","message"}]}`; `429` with `Retry-After`, code `rate_limited`. Public GETs: `Cache-Control: public, max-age=60` + weak `ETag`, `If-None-Match` → 304.

| Method | Path | Response |
|---|---|---|
| GET | `/api/health` | `200 {"status":"healthy","service":"portfolio-api","version","database":"connected","timestamp"}`; DB down → `503` `"degraded"` / `"unavailable"` |
| GET | `/api/profile` | `Profile` |
| GET | `/api/education` | `Education[]` (display_order, start_year desc) |
| GET | `/api/experience` | `Experience[]` (display_order, start_date desc) |
| GET | `/api/skills` | `SkillCategory[]` with nested ordered `skills` |
| GET | `/api/projects` | `ProjectSummary[]` published only, ordered featured desc then display_order; filters `domain`, `technology` (case-insensitive), `featured` |
| GET | `/api/projects/{id_or_slug}` | `ProjectDetail`; 404 `not_found` (also for unpublished) |
| GET | `/api/portfolio` | `{profile, education, experience, skills, projects}` (home page, single request) |
| POST | `/api/contact` | `ContactCreate` → `201 {"success":true,"message":"Thank you for your message. I will get back to you as soon as possible."}`; when the form is disabled (no email provider) → `503 {"code":"contact_unavailable"}` |
| GET | `/api/cv` · `/api/cv/download` | the CV PDF, `inline` / `attachment`, filename `Youssra_Boubakri_CV.pdf` |
| GET | `/robots.txt` · `/sitemap.xml` | robots: `Allow: /`, `Disallow: /api/`, `Sitemap: {SITE_URL}/sitemap.xml`; sitemap: `/` + `/projects/{slug}` for published projects (`lastmod`) |

### 2.4 JSON shapes (TypeScript mirror: `frontend/src/types/api.ts` — already updated to v2)

```ts
Profile = { full_name, headline, tagline, summary, about_who, about_what, about_build, location, mobility,
  email, phone|null, github_url|null, linkedin_url|null, photo_url, target_roles[], languages[{name, level}],
  interests[], snapshot[{title, items[]}], capabilities[{key, title, description, tools[]}],
  cv_url:"/api/cv", cv_download_url:"/api/cv/download", contact_form_enabled: boolean, updated_at }
Education = { id, degree, degree_original|null, institution, location|null, start_year, end_year|null, status, description|null, display_order }
Experience = { id, organization, location|null, employment_type, role|null, start_date, end_date|null, project_title|null,
  description|null, highlights[], technologies[], display_order }
Skill = { id, category_id, name, proficiency|null, is_core, display_order }
SkillCategory = { id, slug, name, description|null, icon|null, display_order, skills: Skill[] }
ProjectSummary = { id, slug, title, title_original|null, category, domains[], concepts[], visual|null, context|null,
  period_label|null, start_year|null, end_year|null, summary, technologies[], features[], github_url|null, demo_url|null,
  featured, display_order }
ProjectDetail = ProjectSummary & { problem|null, solution|null, architecture[{step, description}], implementation[],
  results[], lessons_learned[], updated_at }
ContactCreate = { name 2–100, email ≤254, subject 3–150, message 20–5000, website? (honeypot), elapsed_ms? }
```

### 2.5 Contact pipeline (`ContactService`)

1. If the form is disabled (`EMAIL_PROVIDER=none` or `EMAIL_TO` empty) → 503 `contact_unavailable` (the UI hides the form in that case).
2. Pydantic validation, then sanitisation (strip HTML tags, control chars except `\n`, collapse > 2 blank lines, trim).
3. Honeypot filled or `elapsed_ms < CONTACT_MIN_SUBMIT_SECONDS*1000` → `201` success body but not stored/sent (INFO log).
4. Spam heuristic (> 5 URLs, mostly non-letters) → stored with `is_spam=true`, not forwarded.
5. Rate limit per client IP → 429.
6. Persist, then forward by email in a `BackgroundTask` through `NotificationService` → `EmailSender` protocol (`NullEmailSender`, `SmtpEmailSender` (STARTTLS), `ResendEmailSender` (httpx)), factory by `EMAIL_PROVIDER`; set `email_forwarded=true` on success; failures are logged only. Reply-To = visitor email.

### 2.6 Security

CORS (`CORS_ORIGINS`, methods `GET, POST, OPTIONS`, headers `Content-Type, If-None-Match`), security headers middleware (nosniff, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy, HSTS in production, relaxed CSP only on docs pages), request-ID + access logging (no bodies/secrets), in-memory sliding-window rate limiter behind an interface (resettable in tests) on `POST /api/contact`, request body size limit, trusted-proxy IP handling, ORM-only SQL, generic 500 handler (traceback logged, never returned). The CV path is fixed server-side (no user-controlled paths).

### 2.7 Tests (pytest)

SQLite in-memory (StaticPool) by default, PostgreSQL via `TEST_DATABASE_URL`; seed loaded through the real seed functions; rate limiter reset between tests; email sender replaced by an in-memory fake. Cover: health ok/degraded, profile (incl. `contact_form_enabled` true/false, phone null, links), education, experience, skills, projects (8 seeded, order, `domain` filter for every taxonomy value, `technology`, `featured`, detail by id & slug, nullable period, concepts/visual present, 404, unpublished hidden), portfolio aggregate, ETag/304, contact (disabled → 503; enabled: valid → stored + forwarded, invalid email, too short, honeypot, too fast, spam flagged not forwarded, sanitisation, 429), CV inline/attachment, robots/sitemap (8 project URLs), repositories, seed idempotency + `--force`, sanitiser, settings validation. Coverage ≥ 85 %.

---

## 3. Frontend

Stack: React 19.3 · TypeScript 6 (strict) · Vite 8 · Tailwind CSS 4.3 (`@theme` tokens in `src/styles/index.css`) · react-router 8.4 (import from `"react-router"`) · lucide-react 1.47 (no brand icons: GitHub/LinkedIn are custom SVG in `components/ui/BrandIcons.tsx`; `BarChart3` → `ChartColumn`, `PieChart` → `ChartPie`; verify icons in `node_modules/lucide-react/dist/lucide-react.d.ts`) · self-hosted fonts (Inter, Manrope, JetBrains Mono) · Vitest 5 + RTL. ESLint 10 + react-hooks 7 strict rules (no sync `setState` in effect bodies, no `ref.current` reads during render, no `Date.now()`/`Math.random()` during render). **No** framer-motion / UI kit / chart lib / axios / state lib. No new dependencies.

Env: `VITE_API_BASE_URL` (default `/api`; dev/preview proxy `/api`, `/robots.txt`, `/sitemap.xml` → `VITE_DEV_API_TARGET` or `http://localhost:8000`), `VITE_SITE_URL`.

Foundation files (keep their exports stable): `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `index.html` (SEO/OG/JSON-LD/preload of hero photo with `imagesrcset` 480/800/1200 + `imagesizes="(min-width: 1024px) 440px, 80vw"`), `src/app/*`, `src/types/api.ts`, `src/services/api.ts`, `src/hooks/useApi.ts`, `src/lib/cn.ts`, `src/lib/format.ts`, `src/styles/index.css`, `src/test/setup.ts`, `public/*`.

### 3.1 Routes

`/` HomePage (eager) · `/projects/:slug` ProjectDetailPage (lazy) · `*` NotFoundPage (lazy). **No `/admin`.**

### 3.2 Design system

Palette: navy-950 `#060F1F`, navy-900 `#0B1B34`, navy-800 `#12284A`, navy-700 `#1B3761`, navy-600 `#2A4A7A`; ink `#0E1726`; slate-600 `#4A5872`; slate-400 `#8A97AD`; line `#E3E8F0`; mist `#F4F6FA`; white; accent `#3E7BD6` (sparingly), accent-soft `#7DB0E8`, accent-tint `#EAF1FB`; success/danger/warning for form states. Manrope headings, Inter body, JetBrains Mono eyebrows/chips. Container `max-w-6xl`, sections `py-24 md:py-32`, eyebrow "01 — About" + h2 + lead. Radius 12 px cards / 20 px media. Hairline borders, very soft shadows. Motion: 150–250 ms hover transitions (lift 2 px, border tint, arrow nudge), scroll reveal once, count-up once, nothing permanent, all disabled under `prefers-reduced-motion`. Accessibility: landmarks, `aria-labelledby`, skip link, focus rings, AA contrast, keyboard menus, `aria-pressed` filters, labelled forms.

**Palette v4 (light theme — replaces the navy surfaces above):**
- Surfaces: `white #FFFFFF` (base), `ivory #FBF8F3` (warm soft background), `sand #F3EDE3` (beige sections), `sand-200 #E8DFD0` (hairlines on beige), `sand-400 #CDBB9E` (warm details, tiny decorative only), `sky-50 #F3F7FD` (very light blue sections), `sky-100 #E6EFFB` (light blue panels), `sky-200 #CFE0F6` (blue hairlines/diagram tracks).
- Text: `ink #13223F` (headings/body — deep navy **ink as text only**), `slate-600 #4B5670` (secondary), `slate-400 #8990A0` (muted), `line #E3E6EC` (neutral hairlines on white).
- Accent blue: `accent #2E6BCB` (links, primary buttons with white text — AA on white), `accent-strong #22539F` (hover/pressed), `accent-soft #8DB6EA` (diagram lines, covers), `accent-tint #EAF1FB` (chip backgrounds).
- States: success `#1F8A5B`, danger `#C2413A`, warning `#B7791F`.
- Section rhythm (suggested): Hero = ivory → white vertical gradient with a very soft light-blue radial glow behind the portrait; Snapshot/About = white; Experience = sand; Education = white; Skills = sky-50; Capabilities = white; Projects = ivory; Architecture = sky-50 with blue line diagram (NOT navy); Contact = white; Footer = sand. Cards are white with hairline borders and soft warm shadows (`0 1px 2px rgb(19 34 63 / .04), 0 12px 32px -16px rgb(19 34 63 / .14)`); on white sections cards may use ivory. Project covers: light (sky-50/ivory) backgrounds with accent/accent-soft/ink line-art. Primary button = accent blue fill + white text; secondary = white/ivory with ink text + hairline; ghost = text + underline animation.
- Keep the Tailwind token names where possible (update values in `@theme`), remove/rename any `navy-*` surface usages; `navy-*` tokens may remain only for text/line-art or be removed entirely.
- Favicon/OG image/theme-color are already regenerated in the light identity (blue monogram tile, ivory OG background, theme-color `#FBF8F3`).

**Motion v3 (owner wants the site more animated, still premium):** build a small motion system in plain CSS + hooks (no library): shared easing/durations tokens, `Reveal` variants (fade-up, fade-in, scale-in, clip/mask reveal for headings, stagger groups), `useInView`/`useScrollProgress` helpers. Required moments:
- **Page load (hero)**: choreographed entrance ≈ 1.2 s total — eyebrow → name (per-word or per-line mask reveal) → headline → tagline → summary → CTAs → social icons, staggered 70–90 ms; the portrait reveals with a soft clip-path/scale from 1.04 to 1; the network motif strokes draw in (stroke-dashoffset) and nodes fade in; the glass "Master's" card slides in last. The three roles of the headline may cycle in a refined **rotating word** ("Data Scientist → Data Engineer → Data Analyst", vertical slide + fade every ~2.8 s; pauses when the tab is hidden or off-screen; static under reduced motion; screen readers get the full static headline).
- **Ambient (allowed, very subtle, GPU-cheap)**: a slow radial light drift in the navy hero/architecture backgrounds (transform/opacity only, 20–30 s cycle, paused off-screen via IntersectionObserver), and a gentle "breathing" of 2–3 network nodes near the portrait. Nothing else loops.
- **Scroll**: thin accent **scroll-progress bar** under the navbar; every section heading does a mask/line reveal with its eyebrow counter; cards/rows stagger in; Experience & Education **timeline spines draw** progressively with scroll and each dot pops (scale 0.6→1) as its item enters; stats **count up** once; skill chips cascade in per category; capability icons draw their strokes once.
- **Architecture**: when the lifecycle diagram enters the viewport the 8 stages light up in sequence and a small "data packet" travels along the connectors (loops slowly only while visible, paused off-screen); "How this portfolio is built" connectors animate the same way; the health pill pulses once when the status arrives.
- **Interactions**: navbar active indicator slides between links; buttons get a refined sheen/arrow nudge; project cards and capability cards get a cursor-following soft spotlight (radial gradient via CSS variables updated on pointermove, pointer:fine only) + lift; filter changes use a short FLIP-like fade/translate; project cover line-art animates on hover and once on first view.
- **Route transitions**: a short fade/slide (≤ 250 ms) between Home and project pages; project detail sections reveal on scroll; the UAV lab keeps its own animation.
- **Performance & a11y**: animate only `transform`, `opacity`, `clip-path`, `stroke-dashoffset`; use `will-change` sparingly; no layout thrash; honour `prefers-reduced-motion: reduce` everywhere (show final state instantly); no content hidden if JS/IntersectionObserver is unavailable (fallback to visible). Lighthouse performance must stay ≥ 90.

### 3.3 Home page sections

**Header v4 (premium):** sticky; transparent over the ivory hero at the top, then white/ivory at 85 % opacity with backdrop blur, hairline bottom border and a soft shadow once scrolled (smooth transition); left: blue monogram tile "YB" + name (Manrope, semibold) with a small mono subtitle "Data Scientist" that fades in on scroll; centre/right: nav links with an animated sliding underline/pill indicator for the active section and refined hover; right: small icon buttons (GitHub, LinkedIn) on xl screens + primary **Download CV** button (accent fill, download icon); the thin accent scroll-progress bar sits on the header's bottom edge. Mobile (< lg): hamburger → full-screen light sheet (ivory) with large staggered links, active state, CV button and social row; focus trap, Esc, scroll lock. Height 64–72 px, perfectly aligned to the content grid.

**Footer v4 (premium, sand background, ink text):** top: a refined call-to-action band ("Let's build data products that matter." style heading in the v3 voice — no invented claims — with an "Open to opportunities · Mobile across Morocco & open to relocation" status pill (small pulsing green dot, once/slow), and buttons *Get in touch* (→ #contact) and *Download CV*); main grid (4 columns on desktop, stacked on mobile): (1) brand — monogram, name, headline, one-line positioning from `profile.tagline`, location "Morocco"; (2) Navigate — section links; (3) Selected projects — first 4 project titles linking to their pages; (4) Connect — Email (mailto), LinkedIn, GitHub (brand icons), View CV / Download CV; bottom bar with hairline: "© {year} Youssra Boubakri. All rights reserved." · "Built with React, TypeScript, FastAPI & PostgreSQL" · "API documentation" link · back-to-top button (smooth scroll, arrow micro-animation). All data from the API; hide missing links.

Navbar (sticky; Home · About · Experience · Education · Skills · Projects · Architecture · Contact; active section; **Download CV** CTA; mobile hamburger sheet with focus trap). Hero (navy; facts only; CTAs View my work / Download CV / Contact me; social icons **Email, GitHub, LinkedIn**; professional photo displayed as-is with subtle network motif + glass card "Master's Degree · Data Science & Intelligent Systems"; stats strip computed from API data — it now shows 8 projects automatically). Snapshot + target roles. About (Who I am / What I do / What I build + location, mobility, languages, interests). Experience timeline. Education timeline. Skills (category filter + search + List/Matrix, no percentages). Capabilities ("What I Can Build"). **Projects** (§3.4). Architecture (data/AI lifecycle diagram + "How this portfolio is built": React + TypeScript → FastAPI (REST, OpenAPI) → PostgreSQL (SQLAlchemy, Alembic) with live `/api/health` pill and API docs link — no JWT/admin mention). **Contact** (§3.6). Footer (name, headline, location, Email/GitHub/LinkedIn, quick links, "Built with React, FastAPI & PostgreSQL · API docs", ©).

### 3.4 Projects section ("Featured Projects") — owner's latest brief

Goal: communicate that the profile combines Data Science + Data Engineering + Machine Learning + NLP + LLMs + Computer Vision + AI + Optimization. Very professional, modern, visual, Data Science / AI-engineering oriented. Do not change other sections.

- Heading: eyebrow + h2 (e.g. "Featured projects") + lead sentence naming the covered domains (Data Science, Data Engineering, Machine Learning, NLP, LLMs, Computer Vision, Optimization).
- **Filters**: `All` + the fixed taxonomy `PROJECT_DOMAINS` (Data Science · AI/ML · NLP · LLM · Computer Vision · Optimization) in that order, each with its project count; chips with zero projects are hidden; any unknown domain found in data is appended after. `button[aria-pressed]`, horizontal scroll on phones. Filtering animates subtly (fade/translate ≤ 200 ms, no layout jank).
- **Grid**: responsive 1 / 2 / 3 columns. The first featured project (lowest display_order — the multi-agent AI research system) is a **spotlight card** spanning 2 columns (lg) with a larger cover and more room (visually highlighted: accent hairline/glow border, "Flagship project" mono label). All others are regular cards. The spotlight only applies in the `All` view.
- **Card anatomy** (whole card is not a giant link — explicit actions): cover (`ProjectVisual` by `visual` key, 16:9-ish band, navy or mist background, fine line-art in accent-soft/accent, subtle grid), category eyebrow (mono), title (Manrope), `context · period_label` line only when present, short summary (line-clamped), **key concepts** (`concepts`, small outline chips, max 4), **technology badges** (`technologies`, mono chips, max 5 + "+n"), actions row: **View details →** (link to `/projects/:slug`) and **GitHub** button (brand icon, external, `rel="noopener noreferrer"`) only when `github_url` exists, **Demo** only when `demo_url` exists.
- **Hover** (desktop, pointer:fine only): card lifts 2 px, border tints accent, soft shadow grows, cover line-art animates once (e.g. path stroke draws, nodes pulse once, scan line passes once) — sophisticated, never childish, no permanent loops; focus-visible gets the same treatment; all disabled under reduced motion.
- **ProjectVisual covers** (`features/project/ProjectVisual.tsx`, pure SVG, decorative `aria-hidden`, no raster images, lightweight):
  - `multi-agent` — four agent nodes (labelled A1–A4 in mono) around a hub, data flowing to a small trend line + mini dashboard bars.
  - `biometric` — face-landmark mesh (points + thin lines, abstract, not a real face) inside a scan frame + small lock/shield + key glyph (Computer Vision + Deep Learning + Cybersecurity).
  - `document` — source page with text lines → transformer blocks (encoder/decoder) → translated page (DOCX/PDF tags).
  - `medical` — clean medical-AI identity: soft teal-leaning accent is NOT allowed (keep palette), use accent/accent-soft: two separated point clusters (benign / malignant) split by a decision boundary + a small cross/plus glyph; calm, clinical.
  - `vision` — image frame with detection bounding boxes and confidence ticks.
  - `uav` — IoT nodes connected by an optimized closed tour + small UAV glyph; the tour stroke draws on hover.
  - fallback (null/unknown) — neutral grid + nodes.
- **Detail page additions**: "Key technical concepts" chips section; header shows GitHub/Demo buttons when available (else the neutral "Source code available on request." + mailto); period hidden when null; architecture diagram labels can be long ("Agent 1 — Data Collection & Cleaning") → wrap nicely.
- **UAV trajectory lab** (only on the project whose `visual === "uav"`, section "Interactive visualisation", lazy-loaded chunk `features/project/uav/`): SVG canvas with N IoT nodes (default 14, slider 8–24) from a seeded PRNG (state held in React state; "New random instance" button), a depot/base marker, algorithm tabs **Random · GWO · Cuckoo Search · Tabu Search**, "Run" animates the tour drawing once and moves a UAV glyph along it once (≈ 2–3 s, `requestAnimationFrame`, cancel on unmount; instant under reduced motion), and a comparison table (algorithm · tour length · iterations) computed live. Implement the algorithms as pure, unit-tested TypeScript in `features/project/uav/algorithms.ts`: `tourLength`, `randomTour`, `greyWolfOptimizer` (random-key encoding, α/β/δ leaders, `a` decreasing 2→0), `cuckooSearch` (random keys + Lévy flights via Mantegna, abandon fraction pa = 0.25), `tabuSearch` (2-opt / swap neighbourhood, tabu tenure, aspiration) — all deterministic given a seed, finishing in < 50 ms for 24 nodes. A clear caption: "Illustrative re-implementation running live in your browser on a random instance — not the original project's code or results. See the GitHub repository for the full implementation." Keyboard accessible, responsive (square canvas on mobile), `aria-live` summary of the result. The project card cover uses the static `uav` visual (no heavy computation on the home page).

### 3.5 Project detail page `/projects/:slug`

Back link, header (category, title, `title_original`, context · period when present, tech chips, GitHub/Demo), sticky section nav (desktop), sections only if data exists: Overview · Problem · Solution · Architecture (pipeline diagram) · Key technical concepts · Technologies · Implementation · Key Features · Results · Lessons Learned · Interactive visualisation (uav only) · GitHub / Demo. Prev/next project. `useDocumentMeta` title/description. 404 state.

### 3.6 Contact section

Heading "Let's work together" + short text. Three large, elegant contact cards: **Email** (mailto, shows the address, copy-to-clipboard button with confirmation), **LinkedIn** (external), **GitHub** (external) — each hidden if its value is null. Location + mobility line. **View CV** (`/api/cv`, new tab) and **Download CV**. The contact **form** (name, email, subject, message, honeypot, elapsed_ms, validation, 422/429/503 handling, success panel) is rendered **only when `profile.contact_form_enabled` is true**; otherwise the cards take the full width in a balanced layout (no empty column, no "form disabled" message). No phone number anywhere.

### 3.7 SEO & performance

As in `index.html` (title, description, keywords, canonical, OG/Twitter, JSON-LD Person — add `sameAs` with the GitHub and LinkedIn URLs, no phone). robots/sitemap from the backend. Route-level code splitting (project detail, 404, UAV lab lazy), images lazy except hero, fonts self-hosted, small bundle. Target Lighthouse ≥ 95.

---

## 4. DevOps

- `docker-compose.yml`: `db` (postgres:16-alpine, `pgdata` volume, `pg_isready` healthcheck), `backend` (context `.`, `backend/Dockerfile`, env_file `.env`, overrides `DATABASE_URL=postgresql+psycopg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}`, `SEED_FILE=/app/seed/portfolio.json`, `TRUST_PROXY_HEADERS=true`; command `alembic upgrade head && python -m app.database.seed && uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'`; healthcheck `/api/health`), `frontend` (build arg `VITE_SITE_URL`, nginx on `8080:80`, depends on backend healthy). One command: `docker compose up --build` → http://localhost:8080 (+ `/api/docs`). No media volume (no uploads).
- `backend/Dockerfile` (python:3.12-slim, multi-stage, non-root, copies `backend/` + `database/seed` → `/app/seed`), `frontend/Dockerfile` (node:22-alpine build → nginx:1.27-alpine), `frontend/nginx.conf` (SPA fallback, immutable `/assets/`, no-cache `index.html`, gzip, security headers + CSP `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'`, relaxed CSP for `/api/docs`/`/api/redoc` (cdn.jsdelivr.net), proxy `/api/`, `/robots.txt`, `/sitemap.xml` → `backend:8000`, `client_max_body_size 1m`).
- `.github/workflows/ci.yml`: backend (py3.12, postgres service, ruff, alembic upgrade, pytest --cov with `TEST_DATABASE_URL` + `SECRET_KEY`), frontend (node 22, npm ci, lint, typecheck, vitest, build), docker build.
- `.env.example` documents every variable (safe placeholders, `SECRET_KEY` generation command, email provider section explaining that the form appears once email forwarding is configured, e.g. Gmail SMTP with an app password or Resend).
