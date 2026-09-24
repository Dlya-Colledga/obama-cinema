from fastapi import APIRouter

from app.api.routes.anime import router as anime_router
from app.api.routes.auth import router as auth_router
from app.api.routes.bookmarks import router as bookmarks_router
from app.api.routes.catalog import router as catalog_router
from app.api.routes.comments import router as comments_router
from app.api.routes.content import router as content_router
from app.api.routes.health import router as health_router
from app.api.routes.ratings import router as ratings_router
from app.api.routes.users import router as users_router
from app.api.routes.watch import router as watch_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(catalog_router)
api_router.include_router(content_router)
api_router.include_router(comments_router)
api_router.include_router(ratings_router)
api_router.include_router(bookmarks_router)
api_router.include_router(watch_router)
api_router.include_router(anime_router)
