from typing import Any

from app.exceptions import NotFoundException, ValidationException
from app.models.user import User
from app.repositories.bookmark import BookmarkRepository
from app.repositories.content import ContentRepository
from app.schemas.bookmark import VALID_BOOKMARK_CATEGORIES


class BookmarkService:
    def __init__(
        self,
        bookmark_repo: BookmarkRepository,
        content_repo: ContentRepository,
    ) -> None:
        self.bookmark_repo = bookmark_repo
        self.content_repo = content_repo

    async def get_bookmarks(
        self,
        user: User,
        category: str | None = None,
        page: int = 1,
        limit: int = 24,
    ) -> dict[str, Any]:
        if category is not None and category not in VALID_BOOKMARK_CATEGORIES:
            raise ValidationException(
                "Ошибка валидации категории закладки",
                {"category": ["Недопустимая категория закладки"]},
            )

        return await self.bookmark_repo.get_user_bookmarks(
            user_id=user.id, category=category, page=page, limit=limit
        )

    async def set_bookmark(self, user: User, content_id: int, category: str) -> dict[str, Any]:
        if category not in VALID_BOOKMARK_CATEGORIES:
            raise ValidationException(
                "Ошибка валидации категории закладки",
                {"category": ["Недопустимая категория закладки"]},
            )

        content = await self.content_repo.find_by_slug_or_id(str(content_id))
        if not content:
            raise NotFoundException("Контент не найден")

        await self.bookmark_repo.set_category(
            user_id=user.id, content_id=content_id, category=category
        )
        return {
            "contentId": content_id,
            "category": category,
        }

    async def remove_bookmark(self, user: User, content_id: int) -> None:
        await self.bookmark_repo.remove(user_id=user.id, content_id=content_id)
