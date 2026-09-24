#!/usr/bin/env bash
set -e

echo "=== Running Backend Pytest Suite ==="
docker compose exec -T backend pytest -v

echo "=== Running Frontend Lint & Type Checks ==="
docker compose exec -T frontend npm run lint
docker compose exec -T frontend npm run build
