#!/bin/sh
set -eu

mkdir -p /app/media/results /models
chown -R appuser:appuser /app/media /models

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  gosu appuser python manage.py migrate --noinput
  gosu appuser python manage.py collectstatic --noinput
  gosu appuser python manage.py cleanup_results
fi

exec gosu appuser "$@"
