#!/usr/bin/env bash

set -e

# Colors for friendly output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${RED}${BOLD}"
echo "=========================================================="
echo "               🎬  OBAMA CINEMA PLATFORM                 "
echo "=========================================================="
echo -e "${NC}"

# Check .env existence
if [ ! -f .env ]; then
    echo -e "${YELLOW}[!] Файл .env не найден. Создаём из .env.example...${NC}"
    cp .env.example .env
fi

# Check Docker daemon availability
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}[!] Демон Docker не запущен.${NC}"
    echo -e "${CYAN}[*] Запуск сервиса Docker через systemctl...${NC}"
    sudo systemctl start docker || {
        echo -e "${RED}[ERROR] Не удалось автоматически запустить Docker. Пожалуйста, запустите вручную: sudo systemctl start docker${NC}"
        exit 1
    }
fi

# Cleanup function on Ctrl+C / SIGTERM / SIGINT
cleanup() {
    echo ""
    echo -e "${YELLOW}[*] Получен сигнал остановки (CTRL+C). Завершаем контейнеры...${NC}"
    docker compose down
    echo -e "${GREEN}[✓] Все сервисы остановлены. До свидания!${NC}"
    exit 0
}

trap cleanup INT TERM

echo -e "${CYAN}[1/4] Сборка и запуск контейнеров (PostgreSQL, Backend Python/FastAPI, Frontend React)...${NC}"
docker compose up --build -d

echo -e "${CYAN}[2/4] Ожидание готовности базы данных PostgreSQL...${NC}"
until docker compose exec -T postgres pg_isready -U cinema_user -d cinema_db > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}Готово!${NC}"

echo -e "${CYAN}[3/4] Применение миграций Alembic и запуск сидеров...${NC}"
docker compose exec -T backend uv run python /var/www/backend/bin/migrate.py || true
docker compose exec -T backend uv run python /var/www/backend/bin/seed.py || true

echo -e "${GREEN}${BOLD}"
echo "=========================================================="
echo "    🚀  ПРОЕКТ УСПЕШНО ЗАПУЩЕН И ГОТОВ К РАБОТЕ!          "
echo "=========================================================="
echo -e "${NC}"
echo -e "  🌐 ${BOLD}Frontend:${NC}     ${CYAN}http://localhost:5173${NC}"
echo -e "  🔌 ${BOLD}Backend API:${NC}  ${CYAN}http://localhost:8000/api${NC}"
echo -e "  🗄️  ${BOLD}PostgreSQL:${NC}   ${CYAN}localhost:5432 (db: cinema_db, user: cinema_user)${NC}"
echo ""
echo -e "${YELLOW}Для остановки нажмите CTRL + C${NC}"
echo -e "${CYAN}--- Логи контейнеров ---${NC}"

# Stream logs and wait for termination signal
docker compose logs -f
