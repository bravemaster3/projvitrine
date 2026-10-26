# Deploying Proofolio on Coolify

Target: **https://proofolio.kndev.org**, with **alxhof.kndev.org** redirecting
to it. The Coolify server is shared with other apps (Fluxmonitor), so the
setup is designed to be light and fully isolated.

## How it fits on a shared server

- **Nothing is built on the server.** GitHub Actions builds two images on every
  push to `main` (after the tests pass) and publishes them to GitHub's container
  registry: `ghcr.io/bravemaster3/proofolio-backend` and `…/proofolio-web`.
  Coolify only pulls and runs them, so a deploy needs no Node/npm and no extra memory.
- **Memory limits** in the compose file: database 256 MB, backend 384 MB
  (2 gunicorn workers), web 64 MB. Typical use is well below that.
- **Isolation:** Proofolio is its own Coolify resource with its own Docker
  network and volumes (`proofolio_postgres`, `proofolio_media`). Service names
  are prefixed (`proofolio-db`, `proofolio-backend`, `proofolio-web`), so even
  if networks are shared they cannot be confused with another app's `db`.
  No host ports are published; only Coolify's proxy talks to `proofolio-web`.
- Leave *Connect to Predefined Network* **off** for this resource (the default).

| Service | What it is | Public? |
|---|---|---|
| `proofolio-web` | nginx with the built React app; forwards `/api` and `/u/*` to Django, serves `/media` | **yes**: domains on port 8080 |
| `proofolio-backend` | Django + gunicorn; applies migrations on start | no |
| `proofolio-db` | Postgres 15 | no |

## 0. One-time: make the images pullable

After the first successful run of the *CI* workflow on `main`, open
GitHub → your profile → *Packages* → `proofolio-backend` and `proofolio-web` →
*Package settings* → *Change visibility* → **Public**. (The repository is
public, so this exposes nothing new.) Alternatively keep them private and add a
registry login for `ghcr.io` on the server in Coolify (*Servers → … → Docker
registries*) with a GitHub token that has `read:packages`.

## 1. Create the resource

1. Coolify → your project → *New resource* → *Public repository*:
   `https://github.com/bravemaster3/alx-hall-of-fame`, branch `main`.
2. Build pack **Docker Compose**, compose file `/docker-compose.coolify.yaml`.
3. *Domains* for `proofolio-web`:
   `https://proofolio.kndev.org:8080,https://alxhof.kndev.org:8080`
   (the `:8080` is the container port, not a public port).
4. DNS: `proofolio.kndev.org` → A record to the Coolify server. Leave
   `alxhof.kndev.org` on the droplet until the cut-over (step 4).

## 2. Environment variables

Paste values **without quotes**. Names marked *old* are the ones from the
droplet's `.env`; they keep working, so you can paste that file as it is and
then add the new lines.

| Variable | Required | Value |
|---|---|---|
| `SECRET_KEY` | yes | keep the old value (existing logins stay valid) |
| `JWT_SIGNING_KEY` | recommended | keep the old value |
| `DB_PASSWORD` | yes | keep the old value |
| `DB_NAME`, `DB_USER` | recommended | keep the old values |
| `SITE_URL` | yes | `https://proofolio.kndev.org` (replaces *old* `SITE_DOMAIN` / `VITE_FRONTEND_URL`) |
| `CANONICAL_HOST` | recommended | `proofolio.kndev.org` — every other host name 301-redirects here |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | for login | *old* names `SOCIAL_AUTH_GITHUB_KEY` / `SOCIAL_AUTH_GITHUB_SECRET` also work |
| `VITE_GITHUB_CLIENT_ID` | optional | same as the client id (falls back to `GITHUB_CLIENT_ID`) |
| `VITE_BRAND_NAME` | optional | defaults to `Proofolio` |
| `LANGS` | optional | `en,fr,sv` |
| `VITE_SOURCE_URL` | optional | link to the source code in the footer |
| `IMAGE_TAG` | optional | `latest` (default) or a commit SHA to pin/roll back |

Everything the frontend needs is read when the web container starts, so
changing a variable only needs a **restart**, never a rebuild.

Not needed any more (harmless if left in): `VITE_BACKEND_URL`, `VITE_MEDIA_URL`,
`NODE_ENV`, `DB_HOST`, `DB_PORT`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`
(the last two are derived from `SITE_URL`).

### GitHub OAuth app

GitHub → *Settings → Developer settings → OAuth Apps* → the existing app:

- Homepage URL: `https://proofolio.kndev.org`
- Authorization callback URL: `https://proofolio.kndev.org/`

The same client id/secret keep working; only the URLs change. (Changing them
breaks login on the old droplet, so do it at the cut-over.)

## 3. First deploy and data restore

1. Deploy. The backend creates an empty schema; the site comes up empty at
   `https://proofolio.kndev.org`.
2. Copy the backup and the script to the server:
   `scp -r backups/20261026-082821 scripts/restore-backup.sh root@<server>:/root/`
3. On the server: `sh /root/restore-backup.sh /root/20261026-082821`
   - it only considers containers named `proofolio-*`;
   - it refuses to touch a database that holds another app's tables;
   - it asks you to type `restore`, then restores the database and images,
     restarts the backend (which applies the new migrations) and compares row
     counts with the backup (22 / 16 / 13 / 20 / 34 / 12).
4. Check the site: a few portfolios, images, the map.

## 4. Cut-over from the droplet

1. On the droplet run `scripts/backup-production.sh` once more and restore that
   fresh backup (step 3) so nothing added in between is lost.
2. Update the GitHub OAuth app URLs (above).
3. Point `alxhof.kndev.org` DNS at the Coolify server. Old links such as
   `alxhof.kndev.org/portfolios/bravemaster3` end up at
   `proofolio.kndev.org/u/bravemaster3`.
4. Keep the droplet for two weeks, then delete it.

## 5. Automatic deploys (optional)

In Coolify, copy the resource's *Deploy Webhook* URL and create an API token.
Add them to the GitHub repository as secrets `COOLIFY_WEBHOOK` and
`COOLIFY_TOKEN`. From then on every push to `main` runs the tests, publishes the
images and redeploys.

## 6. Backups

- Coolify → resource → `proofolio-db` → *Backups*: daily backup to S3-compatible storage.
- Media: `docker run --rm -v <volume>_proofolio_media:/m -v $PWD:/b alpine tar czf /b/media.tgz -C /m .`
- Roll back a bad release: set `IMAGE_TAG` to the previous commit SHA and redeploy.
