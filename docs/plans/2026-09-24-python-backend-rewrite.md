# Python Backend Rewrite Implementation Plan

> **Goal:** Fully rewrite Obama Cinema backend from PHP to Python/FastAPI while preserving all existing functionality, database schema, and frontend compatibility.

**Architecture:** Modular layered architecture: FastAPI router -> Dependencies -> Service layer -> Repository layer -> SQLAlchemy 2.x async -> PostgreSQL. External content providers (Anixart, Demo stream) isolated behind provider abstractions.

**Tech Stack:** Python 3.13, FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL (asyncpg), Pydantic v2, pydantic-settings, httpx, bcrypt, pytest.

---

### Task 1: Python Project Scaffolding & Configuration
- Create `apps/backend/pyproject.toml`
- Create virtual environment and install dependencies
- Create `apps/backend/app/core/config.py`
- Create `apps/backend/app/core/database.py`
- Create `apps/backend/app/core/security.py`

### Task 2: SQLAlchemy 2.x Models & Alembic Migration Setup
- Create `apps/backend/app/models/` (User, Profile, UserToken, ContentType, Genre, Country, Content, Season, Episode, Provider, ProviderSource, Comment, Rating, Bookmark, WatchProgress, WatchHistory)
- Setup Alembic with async engine support and migrations matching existing database schema
- Create Python seeder runner `apps/backend/bin/seed.py`

### Task 3: Pydantic v2 Schemas & Contracts
- Create `apps/backend/app/schemas/` with API request/response models conforming to `packages/api-contracts` and frontend expectations

### Task 4: Provider Layer & Anixart Integration
- Implement `app/providers/base.py`, `manager.py`, `demo.py`, `anixart.py`
- Implement Anixart HTTP client with failover
- Implement stream parsers (Kodik with ROT18 deciphering, Anilibria, Sibnet, StreamResolver)

### Task 5: Repository Layer
- Implement asynchronous SQLAlchemy repositories in `app/repositories/` (User, Content, Comment, Rating, Bookmark, Watch)

### Task 6: Service Layer
- Implement business logic in `app/services/` (Auth, Anime, Catalog, Comment with XSS sanitization, Rating, Bookmark, Watch)

### Task 7: FastAPI Routes, Exception Handlers & App Entrypoint
- Implement centralized error handling with custom exceptions
- Implement API dependencies and authentication middleware
- Implement all API routers matching PHP endpoints
- Create `app/main.py` with CORS and FastAPI application

### Task 8: Pytest Test Suite
- Create unit tests for validation, ROT18 deciphering, AnimeService normalization
- Create API integration tests covering all critical flows (health, auth, catalog, anime, comments, ratings, bookmarks, watch)

### Task 9: Database Migration & Live Verification
- Launch Postgres container, execute migrations and seeders, run test suite

### Task 10: Docker & Script Modernization
- Update `docker/backend/Dockerfile.dev` to Python
- Update `docker-compose.yml`, `start.sh`, `scripts/migrate.sh`, `scripts/seed.sh`, `scripts/test.sh`

### Task 11: Remove Legacy PHP Backend
- Remove PHP backend code, vendor, composer.json
- Ensure clean repository

### Task 12: Final Review & Git Commits
- Review git diff, verify frontend build, ensure conventional commit history
