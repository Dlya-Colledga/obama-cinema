from typing import Any

from app.exceptions import NotFoundException, ValidationException
from app.models.user import User
from app.repositories.content import ContentRepository
from app.repositories.rating import RatingRepository


class RatingService:
    def __init__(
        self,
        rating_repo: RatingRepository,
        content_repo: ContentRepository,
    ) -> None:
        self.rating_repo = rating_repo
        self.content_repo = content_repo

    async def rate(self, user: User, content_id: int, rating: int) -> dict[str, Any]:
        if rating < 1 or rating > 10:
            raise ValidationException(
                "Ошибка валидации оценки",
                {"rating": ["Оценка должна быть целым числом от 1 до 10"]},
            )

        content = await self.content_repo.find_by_slug_or_id(str(content_id))
        if not content:
            raise NotFoundException("Контент не найден")

        stats = await self.rating_repo.upsert(user.id, content_id, rating)
        return {
            "userRating": rating,
            "ratingCache": stats["ratingCache"],
            "votesCount": stats["votesCount"],
        }

    async def remove_rate(self, user: User, content_id: int) -> dict[str, Any]:
        content = await self.content_repo.find_by_slug_or_id(str(content_id))
        if not content:
            raise NotFoundException("Контент не найден")

        stats = await self.rating_repo.delete(user.id, content_id)
        return {
            "userRating": None,
            "ratingCache": stats["ratingCache"],
            "votesCount": stats["votesCount"],
        }
