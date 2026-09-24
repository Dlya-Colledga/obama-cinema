from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.exceptions import AuthenticationException
from app.models.user import User
from app.providers.demo import DemoStreamProvider
from app.providers.kodik.client import KodikClient
from app.providers.kodik.provider import KodikStreamProvider
from app.providers.manager import ProviderManager
from app.providers.shikimori.client import ShikimoriClient
from app.repositories.bookmark import BookmarkRepository
from app.repositories.comment import CommentRepository
from app.repositories.content import ContentRepository
from app.repositories.rating import RatingRepository
from app.repositories.user import UserRepository
from app.repositories.watch import WatchRepository
from app.services.anime import AnimeService
from app.services.auth import AuthService
from app.services.bookmark import BookmarkService
from app.services.catalog import CatalogService
from app.services.comment import CommentService
from app.services.rating import RatingService
from app.services.watch import WatchService

# Reusable shared client instances
_shikimori_client = ShikimoriClient()
_kodik_client = KodikClient()
_anime_service = AnimeService(_shikimori_client, _kodik_client)


# --- Repositories ---
def get_user_repo(session: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(session)


def get_content_repo(session: AsyncSession = Depends(get_db)) -> ContentRepository:
    return ContentRepository(session)


def get_comment_repo(session: AsyncSession = Depends(get_db)) -> CommentRepository:
    return CommentRepository(session)


def get_rating_repo(session: AsyncSession = Depends(get_db)) -> RatingRepository:
    return RatingRepository(session)


def get_bookmark_repo(session: AsyncSession = Depends(get_db)) -> BookmarkRepository:
    return BookmarkRepository(session)


def get_watch_repo(session: AsyncSession = Depends(get_db)) -> WatchRepository:
    return WatchRepository(session)


# --- Services ---
def get_auth_service(
    user_repo: UserRepository = Depends(get_user_repo),
) -> AuthService:
    return AuthService(user_repo)


def get_anime_service() -> AnimeService:
    return _anime_service


def get_provider_manager(
    content_repo: ContentRepository = Depends(get_content_repo),
) -> ProviderManager:
    manager = ProviderManager()
    manager.register_provider(KodikStreamProvider(content_repo, _kodik_client))
    manager.register_provider(DemoStreamProvider(content_repo))
    return manager


def get_catalog_service(
    content_repo: ContentRepository = Depends(get_content_repo),
    provider_manager: ProviderManager = Depends(get_provider_manager),
    anime_service: AnimeService = Depends(get_anime_service),
) -> CatalogService:
    return CatalogService(content_repo, provider_manager, anime_service)


def get_comment_service(
    comment_repo: CommentRepository = Depends(get_comment_repo),
    content_repo: ContentRepository = Depends(get_content_repo),
) -> CommentService:
    return CommentService(comment_repo, content_repo)


def get_rating_service(
    rating_repo: RatingRepository = Depends(get_rating_repo),
    content_repo: ContentRepository = Depends(get_content_repo),
) -> RatingService:
    return RatingService(rating_repo, content_repo)


def get_bookmark_service(
    bookmark_repo: BookmarkRepository = Depends(get_bookmark_repo),
    content_repo: ContentRepository = Depends(get_content_repo),
) -> BookmarkService:
    return BookmarkService(bookmark_repo, content_repo)


def get_watch_service(
    watch_repo: WatchRepository = Depends(get_watch_repo),
    content_repo: ContentRepository = Depends(get_content_repo),
) -> WatchService:
    return WatchService(watch_repo, content_repo)


# --- Authentication Dependencies ---
def extract_bearer_token(
    authorization: Annotated[str | None, Header()] = None,
) -> str | None:
    if not authorization:
        return None
    parts = authorization.strip().split()
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1]
    return None


async def get_current_user(
    token: Annotated[str | None, Depends(extract_bearer_token)],
    user_repo: Annotated[UserRepository, Depends(get_user_repo)],
) -> User:
    if not token:
        raise AuthenticationException("Необходима авторизация")
    user = await user_repo.find_by_token(token)
    if not user:
        raise AuthenticationException("Недействительный или истекший токен")
    return user


async def get_optional_current_user(
    token: Annotated[str | None, Depends(extract_bearer_token)],
    user_repo: Annotated[UserRepository, Depends(get_user_repo)],
) -> User | None:
    if not token:
        return None
    return await user_repo.find_by_token(token)
