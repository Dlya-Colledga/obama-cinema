#!/usr/bin/env bash
set -e
docker compose exec -T backend uv run python /var/www/backend/bin/migrate.py
