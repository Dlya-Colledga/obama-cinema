# Obama Cinema Backend (Python / FastAPI)

High-performance asynchronous backend for the Obama Cinema academic media aggregation platform.

## Technology Stack

- **Python 3.12+ / 3.13**
- **FastAPI**
- **SQLAlchemy 2.0 (Async)**
- **Alembic**
- **PostgreSQL (asyncpg / psycopg2)**
- **Pydantic v2 & pydantic-settings**
- **httpx**
- **pytest & pytest-asyncio**

## Architecture

```text
FastAPI Router
    ↓
Dependencies / Auth
    ↓
Service Layer
    ↓
Repository Layer
    ↓
SQLAlchemy 2.x (asyncpg)
    ↓
PostgreSQL
```

## Running Locally

```bash
# Run migrations
python bin/migrate.py

# Run seeders
python bin/seed.py

# Start development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Run tests
pytest -v
```
