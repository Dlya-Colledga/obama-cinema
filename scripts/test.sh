#!/usr/bin/env bash
set -e

echo "=== Running Backend Tests ==="
docker compose exec -T backend php vendor/bin/phpunit || docker compose exec -T backend php tests/run.php

echo "=== Running Frontend Lint & Type Checks ==="
docker compose exec -T frontend npm run lint
docker compose exec -T frontend npm run build
