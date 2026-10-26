#!/bin/sh
# Phase 0: back up the live deployment. Run on the droplet from the directory
# that holds docker-compose-prod.yaml and .env:
#
#   sh backup-production.sh
#
# It only reads: nothing in the running stack is changed or restarted.
# Output goes to ./backups/<timestamp>/ — copy that folder off the server.
set -eu

COMPOSE="docker compose -f docker-compose-prod.yaml"
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="backups/$STAMP"
mkdir -p "$OUT"

# shellcheck disable=SC1091
set -a; . ./.env; set +a

echo "1/5 Database dump (custom format, restorable with pg_restore)"
$COMPOSE exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$OUT/db.dump"

echo "2/5 Plain SQL copy (readable, for inspection)"
$COMPOSE exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner > "$OUT/db.sql"

echo "3/5 Media files (project images)"
$COMPOSE exec -T backend tar czf - -C /usr/src/app media > "$OUT/media.tgz"

echo "4/5 Migrations inside the running backend (prod ran makemigrations at boot)"
$COMPOSE exec -T backend tar czf - backend/migrations projects/migrations > "$OUT/migrations-in-container.tgz"
$COMPOSE exec -T backend python manage.py showmigrations > "$OUT/showmigrations.txt"
$COMPOSE exec -T db psql -U "$DB_USER" -d "$DB_NAME" -At \
  -c "select app, name, applied from django_migrations order by id" > "$OUT/django_migrations.txt"

echo "5/5 Row counts and checksums"
$COMPOSE exec -T db psql -U "$DB_USER" -d "$DB_NAME" -At -c "
  select 'users', count(*) from auth_user union all
  select 'profiles', count(*) from backend_profile union all
  select 'projects', count(*) from projects_project union all
  select 'project_users', count(*) from projects_project_users union all
  select 'likes', count(*) from projects_project_likes union all
  select 'comments', count(*) from projects_comment" > "$OUT/counts.txt"
cp .env "$OUT/env.backup"
chmod 600 "$OUT/env.backup"
(cd "$OUT" && sha256sum db.dump db.sql media.tgz migrations-in-container.tgz > SHA256SUMS)

echo
echo "Done: $OUT"
ls -lh "$OUT"
echo
cat "$OUT/counts.txt"
echo
echo "Copy it to your machine, e.g.:"
echo "  scp -r <user>@<droplet>:$(pwd)/$OUT ./backups/"
