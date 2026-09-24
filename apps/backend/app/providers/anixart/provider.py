import logging
from typing import Any

logger = logging.getLogger(__name__)


class AnixartStreamProvider:
    def __init__(self, content_repo: Any, anime_service: Any) -> None:
        self.content_repo = content_repo
        self.anime_service = anime_service

    def get_identifier(self) -> str:
        return "anixart"

    def get_name(self) -> str:
        return "Anixart Streams (HLS)"

    def supports(self, content_type: str) -> bool:
        return content_type == "anime"

    async def get_streams(
        self, content_id: int, episode_id: int | None = None
    ) -> list[dict[str, Any]]:
        content = await self.content_repo.find_by_id(content_id)
        if not content or content.get("type") != "anime":
            return []

        search_query = content.get("title", "")
        if not search_query:
            return []

        try:
            search_results = await self.anime_service.search(search_query, 0)
            data = search_results.get("data", [])
            if not data:
                return []

            first_release = data[0]
            release_id = int(first_release["id"])

            position = 1
            if episode_id is not None:
                episode = await self.content_repo.get_episode_by_id(episode_id)
                if episode and episode.get("episode_number"):
                    position = int(episode["episode_number"])

            return await self.anime_service.get_episode_streams(release_id, position)
        except Exception as e:
            logger.warning(
                f"AnixartStreamProvider failed for content {content_id}: {e}"
            )
            return []
