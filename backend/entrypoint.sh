#!/bin/sh
# Production entrypoint. Migrations are committed to git and only *applied* here;
# never run makemigrations in production.
set -e

# Started as root: make the media volume writable for the app user (a fresh
# volume or bind mount is often owned by root), then continue as that user.
if [ "$(id -u)" = "0" ]; then
    mkdir -p media/project_images
    chown -R app:app media
    exec setpriv --reuid=app --regid=app --init-groups "$0" "$@"
fi

python manage.py migrate --no-input
python manage.py collectstatic --no-input

exec gunicorn backend.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --access-logfile -
