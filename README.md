# 🎬 Obama Cinema — Медиа-агрегатор видеоконтента

Полноценная платформа для просмотра и каталогизации медиаконтента (фильмы, сериалы, аниме, мультфильмы, донхуа, дорамы) в кинематографичной эстетике Netflix + Кинопоиск.

---

## 🌟 Основные возможности

- **Мультиформатный каталог**: Фильмы, сериалы, аниме, мультфильмы, донхуа, дорамы.
- **Интерактивный плеер**: Встроенный видеоплеер с поддержкой MP4, HLS и Embed iframe, переключением озвучек и серий.
- **Синхронизация прогресса**: Автоматическое сохранение таймкода каждые 10 секунд и секция «Продолжить просмотр» на главной странице.
- **Система аккаунтов**: Регистрация, авторизация (сессионные Bearer-токены с хешированием SHA-256), профили с био и аватарами.
- **Социальные функции**:
  - **Комментарии**: Ветви обсуждений, редактирование и удаление владельцем, модерация.
  - **Оценки**: 10-балльная шкала Кинопоиска с мгновенным пересчетом среднего рейтинга через триггеры PostgreSQL.
  - **Закладки**: Категории («Смотрю», «Буду смотреть», «Просмотрено», «Брошено», «В избранном»).
  - **История просмотров**: Хронологическая лента с возможностью продолжения в один клик.
- **Умный поиск и фильтрация**: Мгновенный поиск, выбор жанров, стран, годов выпуска, минимального рейтинга и сортировки.
- **Строго тёмная кинематографичная тема**: Фирменные цвета — Neon Red (`#FF002F`) и Cinema Deep Black (`#100101`).

---

## 🛠 Технологический стек

### Frontend
- **React 18** + **TypeScript** (Strict Mode)
- **Vite** (сборка и HMR)
- **Tailwind CSS** (кинематографичная темная палитра)
- **Lucide Icons**
- **ESLint** (strict quality gate)

### Backend
- **PHP 8.3+** (`declare(strict_types=1);`, PSR-12, чистая слоистая архитектура)
- **Слои**: Controller → Service → Repository (PDO Prepared Statements) → Database
- **Provider Architecture**: Абстракция `ContentProviderInterface` для подключения любых внешних стримов и встроенный `DemoStreamProvider`.
- **Безопасность**: Защита от SQL-инъекций (параметризованные запросы), XSS-санитизация, хеширование паролей Bcrypt/Argon2, проверка прав на уровне сервера.

### База данных
- **PostgreSQL 16**: Реляционная модель, `BIGINT GENERATED ALWAYS AS IDENTITY`, внешние ключи с каскадным удалением, триггеры пересчета рейтингов, GIN-индексы для полнотекстового поиска (`tsvector`).

### Окружение
- **Docker Compose** + **start.sh** (запуск в один клик с перехватом `CTRL + C` для корректной остановки контейнеров).

---

## 🚀 Быстрый старт (Разработка)

Проект запускается **одной командой**:

```bash
./start.sh
```

Скрипт автоматически:
1. Проверит и создаст `.env` файл.
2. Соберет и запустит контейнеры `postgres`, `backend` и `frontend`.
3. Дождется готовности PostgreSQL.
4. Применит все миграции и сидеры с демонстрационными данными (фильмы, серии, рабочие видеопотоки, пользователи).
5. Начнет трансляцию агрегированных логов.
6. При нажатии **CTRL + C** корректно остановит все контейнеры (`docker compose down`).

### Точки входа:
- **Frontend веб-интерфейс**: [http://localhost:5173](http://localhost:5173)
- **Backend REST API**: [http://localhost:8000/api](http://localhost:8000/api)
- **PostgreSQL**: `localhost:5432` (База: `cinema_db`, Пользователь: `cinema_user`, Пароль: `cinema_password`)

---

## 👤 Тестовые учетные записи

В сидерах предустановлены готовые аккаунты (на странице входа есть кнопки быстрого автозаполнения в 1 клик):

| Роль | Email / Логин | Пароль |
|---|---|---|
| **Пользователь** | `demo@obama.cinema` (логин: `cinema_fan`) | `password123` |
| **Администратор** | `admin@obama.cinema` (логин: `obama_admin`) | `admin123` |
| **Модератор / Критик**| `critic@obama.cinema` (логин: `film_critic`) | `password123` |

---

## 📡 REST API Эндпоинты

### Аутентификация и профиль
- `POST /api/auth/register` — Регистрация пользователя
- `POST /api/auth/login` — Вход и получение токена
- `POST /api/auth/logout` — Выход и аннулирование сессии
- `GET /api/auth/me` — Данные текущего пользователя
- `GET /api/users/profile` — Профиль пользователя
- `PUT /api/users/profile` — Обновление аватара и био

### Каталог и контент
- `GET /api/catalog` — Фильтрация каталога (`type`, `genre`, `country`, `year_from`, `year_to`, `rating_from`, `sort`, `q`, `page`, `limit`)
- `GET /api/catalog/featured` — Подборки для главной страницы
- `GET /api/filters/meta` — Справочники жанров, категорий и стран
- `GET /api/content/{slugOrId}` — Детальная страница тайтла
- `GET /api/content/{id}/seasons` — Сезоны и серии
- `GET /api/content/{id}/sources` — Источники воспроизведения видео

### Социальные функции
- `GET /api/content/{id}/comments` — Список комментариев с пагинацией
- `POST /api/content/{id}/comments` — Добавление комментария (авторизован)
- `PUT /api/comments/{id}` — Редактирование (только автор)
- `DELETE /api/comments/{id}` — Удаление (автор или модератор)
- `POST /api/content/{id}/ratings` — Выставление оценки 1-10
- `DELETE /api/content/{id}/ratings` — Удаление оценки
- `GET /api/bookmarks` — Закладки пользователя
- `POST /api/bookmarks` — Добавление/изменение категории закладки
- `DELETE /api/bookmarks/{contentId}` — Удаление из закладок
- `POST /api/watch/progress` — Сохранение прогресса просмотра
- `GET /api/watch/progress/{contentId}` — Получение сохраненного таймкода
- `GET /api/watch/unfinished` — Лента «Продолжить просмотр»
- `GET /api/watch/history` — История просмотров с пагинацией
- `DELETE /api/watch/history` — Очистка истории

---

## 🧪 Тестирование и проверка качества

```bash
# Запуск Unit-тестов бэкенда (валидация, DTO, санитизация XSS)
php apps/backend/tests/run.php

# Запуск линтера фронтенда
npm --prefix apps/frontend run lint

# Проверка сборки и строгой типизации TypeScript
npm --prefix apps/frontend run build
```

---

## 📁 Структура монорепозитория

```text
/
├── apps/
│   ├── frontend/                 # React 18, Vite, TypeScript, Tailwind
│   └── backend/                  # PHP 8.3 REST API (слоистая архитектура)
│       ├── public/index.php      # Front Controller
│       ├── bin/                  # CLI скрипты миграций и сидеров
│       └── src/                  # Controllers, Services, Repositories, Entities, DTO, Providers
├── packages/
│   ├── shared/                   # Общие константы (роли, категории, типы)
│   └── api-contracts/            # Интерфейсы TypeScript
├── database/
│   ├── migrations/               # SQL миграции PostgreSQL
│   └── seeders/                  # Демо-каталог, пользователи, стримы
├── docker/                       # Dockerfile для frontend и backend
├── scripts/                      # Хелпер-скрипты migrate.sh, seed.sh, test.sh
├── docker-compose.yml            # Сервисы: postgres, backend, frontend
├── start.sh                      # Запуск разработки в 1 клик
└── README.md
```
