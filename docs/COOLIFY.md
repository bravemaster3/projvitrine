# Deploying on Coolify

The stack is three services in `docker-compose.coolify.yaml`:

| Service | What it is | Public? |
|---|---|---|
| `web` | nginx with the built React app; forwards `/api` and `/u/*` to Django, serves `/media` | **yes**: give it the domain(s), port 8080 |
| `backend` | Django + gunicorn; runs `migrate` and `collectstatic` on start | no |
| `db` | Postgres 15 | no |

Two named volumes hold all state: `postgres_data` and `media_data` (uploaded
images, shared read-only with `web`).

## 1. Create the resource

1. Coolify → *Projects* → *New resource* → *Public/Private repository* (GitHub).
2. Build pack: **Docker Compose**; compose file: `/docker-compose.coolify.yaml`;
   branch: `main` (or the revamp branch while testing).
3. In *Domains for web* enter the new domain **with the container port**, plus
   the legacy one, comma-separated:
   `https://<new-domain>:8080,https://alxhof.kndev.org:8080`
4. Point DNS for both names (A record) at the Coolify server. Coolify issues
   the TLS certificates.

## 2. Environment variables

Paste values **without quotes**. Your old droplet `.env` keeps working as is:
every name below marked *old* is still read.

| Variable | Required | Value | From the old `.env` |
|---|---|---|---|
| `SECRET_KEY` | yes | long random string | keep the old value (sessions stay valid) |
| `JWT_SIGNING_KEY` | recommended | long random string | keep the old value |
| `DB_PASSWORD` | yes | database password | keep the old value |
| `DB_NAME` / `DB_USER` | recommended | | keep the old values |
| `SITE_URL` | recommended | `https://<new-domain>` | replaces *old* `SITE_DOMAIN` / `VITE_FRONTEND_URL` |
| `CANONICAL_HOST` | optional | `<new-domain>` (no scheme) | new: other host names 301-redirect here |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | for login | GitHub OAuth app | *old* names `SOCIAL_AUTH_GITHUB_KEY` / `_SECRET` also work |
| `VITE_GITHUB_CLIENT_ID` | for login | same as the client id | same name as before |
| `VITE_BRAND_NAME` | optional | product name shown in the UI | new |
| `LANGS` | optional | `en,fr,sv` | new |
| `DEBUG` | optional | `false` | same |
| `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` | optional | leave blank | derived from `SITE_URL` |

Not needed any more (safe to leave or delete): `VITE_BACKEND_URL`,
`VITE_MEDIA_URL`, `NODE_ENV`, `DB_HOST`, `DB_PORT`.

`DB_HOST`/`DB_PORT` are fixed to the `db` service inside the compose file.

### GitHub OAuth app

The login callback goes to the site root. When the domain changes, open the
OAuth app on GitHub (*Settings → Developer settings → OAuth Apps*) and set:

- Homepage URL: `https://<new-domain>`
- Authorization callback URL: `https://<new-domain>/` (any page of the site works; the app reads the code on every page)

You can keep the existing app and only change these URLs, or create a new one
and paste the new id/secret into the variables above.

## 3. First deploy and data restore

1. Deploy once. The backend creates an empty schema; the site comes up empty.
2. Copy the backup to the server:
   `scp -r backups/20261026-082821 root@<coolify-server>:/root/`
   and copy `scripts/restore-backup.sh` next to it.
3. On the server, find the resource uuid (it is in the container names,
   `docker ps`), then:
   `sh restore-backup.sh /root/20261026-082821 <uuid>`
   It restores the database and images, applies the migrations added since the
   backup, and compares row counts with the backup (22 / 16 / 13 / 20 / 34 / 12).
4. Open the site, check a few projects and images, and log in.

## 4. Cut-over from the droplet

1. On the droplet, run `scripts/backup-production.sh` one last time (so nothing
   added since the first backup is lost) and restore *that* backup.
2. Switch the `alxhof.kndev.org` DNS record to the Coolify server.
3. Keep the droplet for two weeks, then delete it.

## 5. Backups

- Coolify → the resource → `db` service → *Backups*: schedule a daily backup to
  S3-compatible storage.
- Media: `docker run --rm -v <uuid>_media_data:/m -v $PWD:/b alpine tar czf /b/media.tgz -C /m .`
  on a schedule, or re-run `backup-production.sh`-style exports.
- Test a restore with `restore-backup.sh` on a staging resource.
