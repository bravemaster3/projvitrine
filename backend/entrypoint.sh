#!/bin/sh
# Production entrypoint. Migrations are committed to git and only *applied* here;
# never run makemigrations in production.
set -e

python manage.py migrate --no-input
python manage.py collectstatic --no-input

exec gunicorn backend.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers "${GUNICORN_WORKERS:-3}" \
  --access-logfile -
