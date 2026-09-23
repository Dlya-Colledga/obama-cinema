#!/usr/bin/env bash
set -e
docker compose exec -T backend php /var/www/backend/bin/migrate.php
