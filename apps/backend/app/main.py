from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.api.routes.health import router as health_router
from app.core.config import get_settings
from app.core.database import engine
from app.exceptions.handlers import register_exception_handlers

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup actions
    yield
    # Shutdown actions
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(
        title="Obama Cinema API",
        description="High-performance media aggregation and streaming backend in Python & FastAPI",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception Handlers
    register_exception_handlers(app)

    # Routes registration:
    # 1. /api - for exact compatibility with existing React frontend and tests
    app.include_router(api_router, prefix="/api")
    # 2. /api/v1 - for AGENTS.md REST versioning standard
    app.include_router(api_router, prefix="/api/v1")
    # 3. Direct /health check for Docker and cloud monitoring
    app.include_router(health_router)

    @app.get("/")
    async def root() -> dict[str, str]:
        return {
            "name": "Obama Cinema API",
            "version": "1.0.0",
            "status": "running",
            "docs": "/docs",
        }

    return app


app = create_app()
