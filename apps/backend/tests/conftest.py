import socket
from collections.abc import AsyncGenerator
from urllib.parse import urlparse

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import get_settings
from app.main import app


def check_postgres_available() -> bool:
    settings = get_settings()
    try:
        parsed = urlparse(settings.async_database_url)
        host = parsed.hostname or "localhost"
        port = parsed.port or 5432
        with socket.create_connection((host, port), timeout=0.5):
            return True
    except Exception:
        return False


POSTGRES_AVAILABLE = check_postgres_available()

requires_postgres = pytest.mark.skipif(
    not POSTGRES_AVAILABLE,
    reason="PostgreSQL not running on localhost:5432 (start postgres container or run ./start.sh)",
)


@pytest_asyncio.fixture(scope="session")
async def client() -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test/api",
    ) as ac:
        yield ac
