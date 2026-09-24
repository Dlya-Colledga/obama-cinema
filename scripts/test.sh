#!/usr/bin/env bash
set -e

echo "=== Running Backend Pytest, Ruff & Mypy Suites ==="
docker compose exec -T backend uv run pytest -v
docker compose exec -T backend uv run ruff check .
docker compose exec -T backend uv run ruff format --check .
docker compose exec -T backend uv run mypy app

echo "=== Running Frontend Lint & Type Checks ==="
docker compose exec -T frontend npm run lint
docker compose exec -T frontend npm run build
