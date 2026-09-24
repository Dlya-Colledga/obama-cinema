import logging
from typing import Any

from app.providers.kodik.client import KodikClient

logger = logging.getLogger(__name__)


class KodikStreamProvider:
    """
    Generalized stream provider utilizing Kodik for movies, TV series,
    cartoons, and episodic media.
    """

    def __init__(self, content_repo: Any, kodik_client: KodikClient) -> None:
        self.content_repo = content_repo
        self.kodik_client = kodik_client

    def get_identifier(self) -> str:
        return "kodik"

    def get_name(self) -> str:
        return "Kodik Player & Direct Streams"

    def supports(self, content_type: str) -> bool:
        # Kodik supports all types: movies, series, cartoons, anime, doramas
        return True

    async def get_streams(
        self, content_id: int, episode_id: int | None = None
    ) -> list[dict[str, Any]]:
        content = await self.content_repo.find_by_id(content_id)
        if not content:
            return []

        content_type = content.get("type", "movie")
        title = content.get("title", "")
        orig_title = content.get("original_title", "")
        is_movie = content_type == "movie"

        episode_num = 1
        if episode_id is not None:
            episode = await self.content_repo.get_episode_by_id(episode_id)
            if episode and episode.get("episode_number"):
                episode_num = int(episode["episode_number"])
                is_movie = False

        # Search Kodik by title with only_anime=False
        search_results = await self.kodik_client.search(title, limit=5, only_anime=False)
        if not search_results and orig_title:
            search_results = await self.kodik_client.search(orig_title, limit=5, only_anime=False)

        if not search_results:
            return []

        matched_item = search_results[0]
        # Determine ID and ID type
        ext_id = None
        id_type = None

        if matched_item.get("kinopoisk_id"):
            ext_id = str(matched_item["kinopoisk_id"])
            id_type = "kinopoisk"
        elif matched_item.get("imdb_id"):
            ext_id = str(matched_item["imdb_id"])
            id_type = "imdb"
        elif matched_item.get("shikimori_id"):
            ext_id = str(matched_item["shikimori_id"])
            id_type = "shikimori"

        if not ext_id or not id_type:
            # Fallback to embed link if available directly on item
            raw_link = matched_item.get("link")
            if raw_link:
                embed_url = f"https:{raw_link}" if raw_link.startswith("//") else raw_link
                return [
                    {
                        "id": content_id * 1000 + 1,
                        "provider": "Kodik (Плеер)",
                        "providerCode": "kodik",
                        "streamUrl": embed_url,
                        "playerType": "iframe",
                        "quality": "1080p",
                        "translationTitle": "Мультиплеер (все озвучки)",
                    }
                ]
            return []

        streams: list[dict[str, Any]] = []

        # Get translations
        translations = await self.kodik_client.get_translations(ext_id, id_type=id_type)

        # 1. Direct stream for top translations
        for idx, trans in enumerate(translations[:2]):
            trans_id = str(trans.get("id") or "0")
            trans_name = trans.get("name") or "Озвучка"

            stream_url, quality, _ = await self.kodik_client.get_stream_link(
                external_id=ext_id,
                id_type=id_type,
                episode_num=episode_num,
                translation_id=trans_id,
                is_movie=is_movie,
            )

            if stream_url:
                streams.append(
                    {
                        "id": content_id * 10000 + int(trans_id if trans_id.isdigit() else idx + 1),
                        "provider": "Kodik Direct",
                        "providerCode": "kodik",
                        "streamUrl": stream_url,
                        "playerType": "mp4",
                        "quality": f"{quality}p",
                        "translationTitle": trans_name,
                    }
                )

        # 2. Iframe embed player as fallback/alternative
        embed_url = await self.kodik_client.get_embed_link(ext_id, id_type=id_type)
        if embed_url:
            streams.append(
                {
                    "id": content_id * 10000 + 9999,
                    "provider": "Kodik Embed",
                    "providerCode": "kodik",
                    "streamUrl": embed_url,
                    "playerType": "iframe",
                    "quality": "1080p",
                    "translationTitle": "Мультиплеер (все озвучки)",
                }
            )

        return streams
