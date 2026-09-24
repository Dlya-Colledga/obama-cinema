from typing import Any

from app.core.security import sanitize_text
from app.exceptions import (
    AuthorizationException,
    NotFoundException,
    ValidationException,
)
from app.models.user import User
from app.repositories.comment import CommentRepository
from app.repositories.content import ContentRepository


class CommentService:
    def __init__(
        self,
        comment_repo: CommentRepository,
        content_repo: ContentRepository,
    ) -> None:
        self.comment_repo = comment_repo
        self.content_repo = content_repo

    async def get_comments(self, content_id: int, page: int = 1, limit: int = 20) -> dict[str, Any]:
        return await self.comment_repo.find_by_content(content_id, page, limit)

    async def create_comment(
        self,
        user: User,
        content_id: int,
        text_content: str,
        parent_id: int | None = None,
    ) -> dict[str, Any]:
        trimmed = text_content.strip()
        if len(trimmed) < 2:
            raise ValidationException(
                "Ошибка валидации комментария",
                {"text": ["Комментарий не может быть короче 2 символов"]},
            )
        if len(trimmed) > 3000:
            raise ValidationException(
                "Ошибка валидации комментария",
                {"text": ["Комментарий не может превышать 3000 символов"]},
            )

        content = await self.content_repo.find_by_slug_or_id(str(content_id))
        if not content:
            raise NotFoundException("Контент не найден")

        sanitized = sanitize_text(trimmed)
        return await self.comment_repo.create(
            user_id=user.id,
            content_id=content_id,
            text_content=sanitized,
            parent_id=parent_id,
        )

    async def update_comment(
        self,
        user: User,
        comment_id: int,
        text_content: str,
    ) -> dict[str, Any]:
        trimmed = text_content.strip()
        if len(trimmed) < 2:
            raise ValidationException(
                "Ошибка валидации комментария",
                {"text": ["Комментарий не может быть короче 2 символов"]},
            )
        if len(trimmed) > 3000:
            raise ValidationException(
                "Ошибка валидации комментария",
                {"text": ["Комментарий не может превышать 3000 символов"]},
            )

        comment = await self.comment_repo.find_by_id(comment_id)
        if not comment:
            raise NotFoundException("Комментарий не найден")

        if comment["user"]["id"] != user.id:
            raise AuthorizationException("Вы не можете редактировать чужой комментарий")

        sanitized = sanitize_text(trimmed)
        updated = await self.comment_repo.update(comment_id, sanitized)
        if not updated:
            raise NotFoundException("Комментарий не найден")
        return updated

    async def delete_comment(self, user: User, comment_id: int) -> None:
        comment = await self.comment_repo.find_by_id(comment_id)
        if not comment:
            raise NotFoundException("Комментарий не найден")

        if comment["user"]["id"] != user.id and not user.is_moderator:
            raise AuthorizationException("У вас нет прав для удаления этого комментария")

        await self.comment_repo.delete(comment_id)
