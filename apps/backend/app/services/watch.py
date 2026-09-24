from typing import Any

from app.exceptions import NotFoundException
from app.models.user import User
from app.repositories.content import ContentRepository
from app.repositories.watch import WatchRepository


class WatchService:
    def __init__(
        self,
        watch_repo: WatchRepository,
        content_repo: ContentRepository,
    ) -> None:
        self.watch_repo = watch_repo
        self.content_repo = content_repo

    async def save_progress(
        self,
        user: User,
        content_id: int,
        episode_id: int | None,
        progress_seconds: int,
        duration_seconds: int,
        is_completed: bool,
    ) -> dict[str, Any]:
        content = await self.content_repo.find_by_slug_or_id(str(content_id))
        if not content:
            raise NotFoundException("Контент не найден")

        if not is_completed and duration_seconds > 0:
            if (progress_seconds / duration_seconds) >= 0.90:
                is_completed = True

        await self.watch_repo.upsert_progress(
            user_id=user.id,
            content_id=content_id,
            episode_id=episode_id,
            progress_seconds=progress_seconds,
            duration_seconds=duration_seconds,
            is_completed=is_completed,
        )

        return {
            "contentId": content_id,
            "episodeId": episode_id,
            "progressSeconds": progress_seconds,
            "durationSeconds": duration_seconds,
            "isCompleted": is_completed,
        }

    async def get_progress(
        self, user: User, content_id: int, episode_id: int | None = None
    ) -> dict[str, Any] | None:
        return await self.watch_repo.get_progress(
            user_id=user.id, content_id=content_id, episode_id=episode_id
        )

    async def get_recent_unfinished(self, user: User, limit: int = 10) -> list[dict[str, Any]]:
        return await self.watch_repo.get_recent_unfinished(user_id=user.id, limit=limit)

    async def get_history(self, user: User, page: int = 1, limit: int = 24) -> dict[str, Any]:
        return await self.watch_repo.get_history(user_id=user.id, page=page, limit=limit)

    async def clear_history(self, user: User, history_id: int | None = None) -> None:
        await self.watch_repo.clear_history(user_id=user.id, history_id=history_id)
