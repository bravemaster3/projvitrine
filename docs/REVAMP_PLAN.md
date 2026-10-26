# Revamp plan

Goal: turn ALX Hall of Fame into a general portfolio + showcase platform whose
portfolio page is good enough to be the permalink on a CV — without losing any
data on the current deployment (13 projects, 22 users, 12 comments, 34 likes,
uploaded images).

Visual mockups (portfolio desktop/phone, case-study page, explore, tokens,
roadmap, deployment and data-model diagrams):
https://claude.ai/artifact/1mVPeeV5gfy5bDUCn96vJR

## Ground rules

- **Nothing hard-coded.** Colors, radius and fonts are design tokens (CSS
  variables). Brand name, URLs, OAuth IDs, default/available languages come
  from environment variables. UI text lives in locale files.
- **Additive migrations only.** New columns/tables with defaults; data is
  copied, never moved destructively. Old columns are removed only after the
  Coolify migration is done and verified.
- **Migrations are committed, never generated in production.**
- **One branch per phase**, each ending in a working app with passing CI.
- **Verify against a copy of production** before anything touches the server.

## Decisions

| Topic | Decision | Status |
|---|---|---|
| Accent color | Teal `#0F766E` (light) / `#2DD4BF` (dark) | decided |
| Fonts | Inter (UI), JetBrains Mono (metadata) | decided |
| UI stack | Tailwind + CSS-variable tokens + Radix primitives; MUI removed | decided |
| Languages | EN, FR, SV at launch; list configurable | decided |
| GitHub access | Login: `read:user user:email`. Private repos: optional GitHub App, read-only, per-repo | decided |
| Product name | working name "Showcase" (env `VITE_BRAND_NAME`) | **open** |
| Domain / permalink | proposal `kndev.org/u/<handle>` | **open** |
| Extra login providers | email magic link + Google | proposed |

## Phase 0 — Safeguard the live data

On the droplet, run `scripts/backup-production.sh` (read-only). It does:

- [x] `docker compose -f docker-compose-prod.yaml exec db pg_dump -U $DB_USER -Fc $DB_NAME > alxhof-YYYYMMDD.dump`
- [x] Archive media: `docker run --rm -v <project>_media_data:/m -v $PWD:/b alpine tar czf /b/media-YYYYMMDD.tgz -C /m .`
- [x] Copy both off the server (`scp`), check sizes and checksums.
      **Reference counts (backup 20261026-082821):** users 22, profiles 16,
      projects 13, project-author links 20, likes 34, comments 12, media files
      13 — every `imgFile` in the database has its file in the archive.
- [x] `docker compose exec backend python manage.py showmigrations` and
      `ls backend/*/migrations` inside the container. The prod entrypoint runs
      `makemigrations`, so the server may have migrations that are not in git.
      Copy any such files out and commit them.
      **Result (2026-10-26):** server matches the repo exactly — backend 0001,
      projects 0001–0004. No server-only migrations. Orphaned tables from
      `social_django` and `authtoken` remain and can be dropped after the move.
- [ ] Locally: restore the dump into the dev Postgres, unpack media, run the
      app and check that all projects and images show.

Done when a local copy of production runs and the backup is verified.

## Phase 1 — Foundations & security

Backend
- [x] Remove `email` from public serializers (`UserSerializer` used in
      projects/comments, `/api/users`); add a private `MeSerializer`.
- [x] Remove `makemigrations` from `entrypoint.sh` and compose commands.
- [x] Re-save `requirements.txt` as UTF-8; drop unused packages
      (`djangoviz`, `graphqlclient`, `rest-framework-simplejwt`, `python3-openid`,
      `social-auth-*` if unused); pin versions.
- [x] Settings from env: `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`,
      `CSRF_TRUSTED_ORIGINS`, `FRONTEND_URL`; turn off `CORS_ALLOW_ALL_ORIGINS`;
      log level from env; remove debug `print`s and body logging in
      `LoggingMiddleware`.
- [x] Fix `update()` in `ProjectViewSet` (`old_img_file` undefined when no new image).
- [x] Default ordering on `Project` (in the queryset — no migration until phase 0 is checked); owner-only edit/delete for projects and comments.

Auth
- [x] GitHub OAuth scope → `read:user user:email`.
- [x] Stop returning `github_token` to the browser; keep GitHub tokens
      server-side (encrypted) only if needed.
- [x] Refresh-token flow (access short-lived, refresh rotating).

Frontend
- [x] `constants.js` → `import.meta.env.VITE_*` (`VITE_API_URL`,
      `VITE_SITE_URL`, `VITE_GITHUB_CLIENT_ID`, `VITE_BRAND_NAME`,
      `VITE_DEFAULT_LANG`, `VITE_LANGS`).
- [x] Country list bundled locally instead of fetching restcountries.com.

Tooling
- [x] Pytest + pytest-django (21 tests), Vitest (6 tests), Ruff. ESLint runs on new code only until phase 3 replaces the old components (162 legacy issues).
- [x] GitHub Actions: lint, test, build both images.
- [x] `.env.example` documenting every variable.

Done when CI is green and the public API exposes no private data.

## Phase 2 — Additive data model

Profile
- [x] `handle` (unique, defaults to GitHub username), `headline`, `website`,
      `orcid`, `scholar`, `open_to_work`, `default_lang`.

Project
- [x] `slug` (unique per owner, generated from title), `created_at`,
      `updated_at`, `featured`, `order`, `role`, `period_start`, `period_end`,
      `body` (markdown), `lang`.
- [x] `ProjectLink` (kind: code/live/docs/paper/video, url, label, order) —
      data migration copies `githubRepos` and `liveProject`.
- [x] `ProjectImage` (image, caption, order); `imgFile` stays as the cover.

Communities
- [x] `Community` (name, slug, logo, website, description) and `Membership`
      (user, community, label, start, end).
- [x] Data migration: every non-empty `cohort` becomes a membership in an
      "ALX" community with label "Cohort N"; "Non-ALX" becomes no membership.

Translations
- [x] `ProfileTranslation` (lang, headline, bio) and `ProjectTranslation`
      (lang, title, summary, body). Fallback: owner's `default_lang`.

Co-authors
- [x] `CoauthorInvite` (project, github_username, status, claimed_by). On
      login, matching invites are claimed and the user is linked to the project.
- [x] Data migration: existing placeholder users (no profile) get invites;
      the 6 placeholder accounts themselves are kept until after the move
      (deleting users is deferred to the post-migration cleanup).

Comments
- [x] `hidden` flag for owner moderation.

Done when all migrations apply cleanly to the restored production dump, with
row counts and images unchanged. **Rehearsed 2026-10-26** on the production
rows (SQLite): counts unchanged, 16 handles, 12 ALX memberships, 13 slugs,
24 links, 6 invites. To repeat on Postgres with Docker once available.

API added: `/api/portfolio/<handle>/`, `/api/portfolio/<handle>/projects/<slug>/`,
`/api/communities/`, `/api/communities/<slug>/`, `/api/health/`,
`POST /api/projects/reorder/`, `POST /api/projects/<id>/comments/<id>/hide/`.

## Phase 3 — Design system & i18n shell

- [x] Remove MUI/Emotion; turn Tailwind preflight back on; delete the
      Figma-export breakpoints and the dead `App.css`.
- [x] `src/styles/theme.css`: tokens (`--bg`, `--surface`, `--chip`, `--text`,
      `--muted`, `--border`, `--accent`, `--accent-soft`, `--accent-border`,
      `--on-accent`, `--danger`, `--radius`, fonts) for light and dark; soft
      shades derived with `color-mix()` from `--accent`.
- [x] `tailwind.config.js` maps utility names to the variables only
      (`bg-surface`, `text-muted`, `rounded-card`…).
- [x] Components: Button, IconButton, Chip, Badge, Card, Input, Textarea,
      Select, Dialog, DropdownMenu, Tabs, Toast, Skeleton, EmptyState, Avatar.
- [x] Theme toggle (system / light / dark), saved per user.
- [x] react-i18next: `locales/{en,fr,sv}/*.json`; language detection order:
      URL `?lang=` → saved choice → browser → `VITE_DEFAULT_LANG`. A missing key
      in FR or SV falls back to EN.
- [x] Dates and numbers through `Intl` for the active language.
- [x] New layout: header, footer, language switcher, mobile nav.

Done when no component contains a hex color or user-facing literal string.

## Phase 4 — Public pages (the CV permalink)

- [x] `/u/:handle` portfolio: header (avatar, name, headline, location,
      open-to-work, communities, links), permalink card with copy + QR,
      skills strip that filters, featured projects, project index,
      optional sections (publications, experience), contact band.
- [x] `/u/:handle/:slug` case study: meta strip (role, period, language,
      license, stars), gallery, markdown body, how-it-works, sidebar (stack,
      authors, share, appreciations), more from the author.
- [x] Per-language content with "shown in original language" notice.
- [x] Print stylesheet → clean one-page PDF; "Download PDF" button.
- [x] Django view serves `index.html` with server-filled `<title>`,
      description, Open Graph/Twitter tags, canonical and `hreflang` for `/u/*`.
- [ ] Generated OG image per portfolio/project (avatar / cover used for now).
- [x] 301 redirects: `/portfolios/:user` → `/u/:handle`.
- [ ] Lighthouse ≥ 95 on performance, accessibility and SEO for both pages (to measure on the deployed site).

Done when the CV link looks right in a browser, on a phone, as a LinkedIn
preview and on paper.

## Phase 5 — Dashboard, editor & GitHub import

- [ ] Dashboard: my projects with drag-to-reorder and a featured toggle.
- [ ] Project editor: tabs per language, markdown with preview, links list,
      gallery upload with captions, role/period fields.
- [ ] Import from GitHub (public): pick a repo → pre-fills title, description,
      topics → tags, homepage → live link, social preview image, years from
      created/pushed dates, language, stars.
- [ ] GitHub App (optional "Connect private repos"): permissions
      Metadata: read, Contents: read; the user chooses which repos. Tokens are
      short-lived installation tokens, kept on the server.
- [ ] Profile editor: headline/bio per language, links, communities,
      handle change (old handle redirects).
- [ ] Toasts and confirm dialogs replace `window.confirm`.

Done when a project can be added from GitHub in under a minute.

## Phase 6 — Explore, people, map & login

- [ ] Explore: search, tag chips, community filter, sort (newest / most
      appreciated / A–Z), grid/map toggle, server-side pagination.
- [ ] People directory and map (reuse the Leaflet code, restyled).
- [ ] Appreciations (likes) and comments with owner moderation.
- [ ] Email magic-link and Google login next to GitHub (`django-allauth`).
- [ ] Community pages: `/c/:slug` listing members and projects.

Done when people without GitHub can join and be found.

## Phase 7 — Coolify migration & launch

- [ ] New server with Coolify; connect the GitHub repo.
- [ ] Resources: Postgres (Coolify database), backend (Dockerfile.prod),
      frontend (static build), persistent volume for media; env vars per
      resource from `.env.example`.
- [ ] Final cut-over: freeze writes on the droplet → fresh dump + media
      archive → restore into Coolify Postgres → copy media into the volume →
      `migrate` → compare row counts and spot-check images.
- [ ] DNS to the new server, TLS by Coolify; keep `alxhof.kndev.org`
      redirecting to the new domain.
- [ ] Scheduled Postgres backups to S3-compatible storage, plus a media
      backup job; test a restore.
- [ ] Keep the droplet for two weeks, then delete it.

Done when the new server serves all old data at the new permalinks and a
backup restore has been tested.

## Configuration reference (target)

| Variable | Used by | Example |
|---|---|---|
| `SECRET_KEY`, `JWT_SIGNING_KEY` | backend | — |
| `DEBUG` | backend | `false` |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT` | backend | — |
| `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS` | backend | `kndev.org` |
| `SITE_URL` | backend (OG tags, emails) | `https://kndev.org` |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | backend | — |
| `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` | backend (private repos) | — |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | backend | — |
| `EMAIL_URL` | backend (magic links) | — |
| `VITE_API_URL`, `VITE_SITE_URL` | frontend build | `https://kndev.org` |
| `VITE_BRAND_NAME` | frontend build | `Showcase` |
| `VITE_DEFAULT_LANG`, `VITE_LANGS` | frontend build | `en`, `en,fr,sv` |
| `VITE_GITHUB_CLIENT_ID` | frontend build | — |
