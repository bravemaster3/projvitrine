# ProjVitrine

Portfolios that show the work: add your projects once, tell the story behind
each one, and share a single permanent link — on your CV, LinkedIn, in an email
or on paper.

**Live:** https://projvitrine.kndev.org · formerly the ALX Hall of Fame
(alxhof.kndev.org redirects here; ALX members keep their community badge).

- **Portfolio page** at `/u/<handle>` with headline, links (GitHub, LinkedIn,
  ORCID, Scholar…), a permalink QR code, skills filter, featured work and a
  print-to-PDF layout.
- **Case-study page** per project at `/u/<handle>/<project>`: role, period,
  stack, screenshots, the story in Markdown, co-authors, comments.
- **Import from GitHub** (public repositories; contributors become co-author
  invites), communities, people directory and a map.
- **English, French and Swedish**, light and dark themes, link previews for
  LinkedIn/Slack, accessible components.

## Stack

| Part | Tech |
|---|---|
| Frontend | React 18, Vite, Tailwind with CSS-variable design tokens, Radix, react-i18next |
| Backend | Django 5.2 LTS, Django REST Framework, SimpleJWT, GitHub OAuth |
| Data | PostgreSQL 15 (SQLite for local development) |
| Delivery | Docker images built by GitHub Actions, deployed with Coolify |

## Local development

Requirements: Python 3.12, Node 22.

```sh
# backend (SQLite by default; set DATABASE_URL for Postgres)
cd backend
python -m venv .venv && . .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
DEBUG=true python manage.py migrate
DEBUG=true python manage.py runserver

# frontend (proxies /api and /media to localhost:8000)
cd frontend
npm ci
npm run dev                                         # http://localhost:5173
```

Copy `.env.example` to `.env` at the repository root for GitHub login and other
settings. `docker compose -f docker-compose.dev.yaml up -d` starts a local
Postgres if you want one.

## Tests

```sh
cd backend && pytest && ruff check .
cd frontend && npm test && npm run lint
```

CI runs both, checks that migrations are committed, builds the images and, on
`main`, publishes them to `ghcr.io` and triggers a Coolify deploy.

## Deployment

See [docs/COOLIFY.md](docs/COOLIFY.md). Nothing is built on the server; all
settings are environment variables (see `.env.example`), and the web container
reads its settings at start-up, so changing the domain or brand needs only a restart.

The roadmap is in [docs/REVAMP_PLAN.md](docs/REVAMP_PLAN.md).

## License

MIT
