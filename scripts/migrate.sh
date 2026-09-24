#!/usr/bin/env bash
set -e
docker compose exec -T backend python /var/www/backend/bin/migrate.py
