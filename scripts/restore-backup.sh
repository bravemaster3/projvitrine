#!/bin/sh
# Restore a backup made by backup-production.sh into a running stack
# (Coolify or plain Docker), then apply new migrations and compare counts.
#
#   sh restore-backup.sh <backup-dir> [<coolify-resource-uuid>]
#
# Containers are found by name: on Coolify they are called projvitrine-db-<uuid>
# and projvitrine-backend-<uuid>; on the droplet <project>-db-1 / -backend-1.
# Pass the uuid when several ProjVitrine stacks run on the server.
# Override with DB_CONTAINER=... BACKEND_CONTAINER=... if needed.
#
# WARNING: replaces the database contents of the target stack.
set -eu

BACKUP=${1:?usage: restore-backup.sh <backup-dir> [resource-uuid]}
UUID=${2:-}
[ -f "$BACKUP/db.dump" ] || { echo "no db.dump in $BACKUP"; exit 1; }

find_container() {
    names=$(docker ps --format '{{.Names}}')
    # On a shared server, only ever consider ProjVitrine's own containers.
    if printf '%s\n' "$names" | grep -q 'projvitrine-'; then
        names=$(printf '%s\n' "$names" | grep 'projvitrine-')
    fi
    matches=$(printf '%s\n' "$names" | grep -E "(^|[-_])$1([-_]|$)" | grep -- "$UUID" || true)
    count=$(printf '%s\n' "$matches" | grep -c . || true)
    if [ "$count" -ne 1 ]; then
        echo "Could not pick a single '$1' container (found: ${matches:-none})." >&2
        echo "Pass the Coolify resource uuid, or set ${2}." >&2
        exit 1
    fi
    printf '%s' "$matches"
}

DB=${DB_CONTAINER:-$(find_container db DB_CONTAINER)}
BACKEND=${BACKEND_CONTAINER:-$(find_container backend BACKEND_CONTAINER)}
echo "database container: $DB"
echo "backend container:  $BACKEND"

if [ -f "$BACKUP/SHA256SUMS" ]; then
    (cd "$BACKUP" && sha256sum -c SHA256SUMS)
fi

# Refuse to touch a database that belongs to another app: it must be empty or
# contain this app's tables.
tables=$(docker exec "$DB" sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At \
    -c "select tablename from pg_tables where schemaname = current_schema()"' | tr '\n' ' ' | sed 's/^ *//; s/ *$//')
case " $tables " in
    "  ") echo "Target database is empty." ;;
    *" projects_project "*) echo "Target database contains this app's tables." ;;
    *) echo "Refusing: $DB holds tables that are not this app's ($tables)." >&2; exit 1 ;;
esac

printf 'This REPLACES the database in %s. Type "restore" to continue: ' "$DB"
read -r answer
[ "$answer" = "restore" ] || { echo "aborted"; exit 1; }

echo "1/4 Stopping the backend and replacing the database"
docker stop "$BACKEND" >/dev/null
docker cp "$BACKUP/db.dump" "$DB:/tmp/db.dump"
# Start from an empty schema so tables created by the first deploy cannot clash.
docker exec "$DB" sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"     -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"'
docker exec "$DB" sh -c 'pg_restore --no-owner --no-privileges     -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/db.dump; status=$?; rm -f /tmp/db.dump; exit $status' || {
    echo "(pg_restore reported warnings above; the row counts below are the real check)"
}

echo "2/4 Starting the backend (applies migrations added since the backup)"
docker start "$BACKEND" >/dev/null
i=0
until docker exec "$BACKEND" python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health/', timeout=3)" 2>/dev/null; do
    i=$((i + 1)); [ $i -gt 60 ] && { echo "backend did not become healthy; check its logs" >&2; exit 1; }
    sleep 2
done
docker exec "$BACKEND" python manage.py showmigrations backend projects | tail -n 12

echo "3/4 Restoring media files"
# As root, then hand the files to the app user (the volume may be root-owned).
docker exec -u 0 -i "$BACKEND" tar xzf - -C /usr/src/app --no-same-owner < "$BACKUP/media.tgz"
docker exec -u 0 "$BACKEND" chown -R app:app /usr/src/app/media

echo "4/4 Comparing row counts with the backup"
docker exec "$DB" sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -c "
  select '\''users'\'', count(*) from auth_user union all
  select '\''profiles'\'', count(*) from backend_profile union all
  select '\''projects'\'', count(*) from projects_project union all
  select '\''project_users'\'', count(*) from projects_project_users union all
  select '\''likes'\'', count(*) from projects_project_likes union all
  select '\''comments'\'', count(*) from projects_comment"' > /tmp/restore-counts.txt
if diff -u "$BACKUP/counts.txt" /tmp/restore-counts.txt; then
    echo "Row counts match the backup."
else
    echo "Row counts differ (see above)." >&2
    exit 1
fi
images=$(docker exec "$BACKEND" sh -c 'ls media/project_images | wc -l')
echo "Media files in project_images: $images"
echo "Done."
