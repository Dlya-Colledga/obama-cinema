import re
from typing import Any

from app.exceptions import NotFoundException
from app.providers.manager import ProviderManager
from app.repositories.content import ContentRepository
from app.schemas.catalog import CatalogFilterParams
from app.services.anime import AnimeService


class CatalogService:
    def __init__(
        self,
        content_repo: ContentRepository,
        provider_manager: ProviderManager,
        anime_service: AnimeService | None = None,
    ) -> None:
        self.content_repo = content_repo
        self.provider_manager = provider_manager
        self.anime_service = anime_service

    async def get_catalog(
        self, filter_params: CatalogFilterParams, user_id: int | None = None
    ) -> dict[str, Any]:
        return await self.content_repo.find_filtered(filter_params, user_id)

    async def get_featured(self, user_id: int | None = None) -> list[dict[str, Any]]:
        return await self.content_repo.find_featured(user_id)

    async def get_content(
        self, identifier: str | int, user_id: int | None = None
    ) -> dict[str, Any]:
        content = await self.content_repo.find_by_slug_or_id(identifier, user_id)
        if content:
            return content

        # Check if identifier refers to an Anixart anime (e.g. "anime-609" or numeric)
        anime_id = None
        if isinstance(identifier, str):
            m = re.match(r"^anime-(\d+)$", identifier)
            if m:
                anime_id = int(m.group(1))
            elif identifier.isdigit():
                anime_id = int(identifier)
        elif isinstance(identifier, int) and identifier > 0:
            anime_id = identifier

        if anime_id is not None and self.anime_service is not None:
            try:
                anime = await self.anime_service.get_release(anime_id)
                screenshots = anime.get("screenshots") or []
                banner_url = screenshots[0] if screenshots else (anime.get("posterUrl") or None)

                genres = [
                    {"id": idx + 1, "slug": g, "name": g}
                    for idx, g in enumerate(anime.get("genres", []))
                ]

                age_rating_raw = anime.get("ageRating")
                age_rating = f"{age_rating_raw}+" if age_rating_raw else "16+"

                return {
                    "id": anime_id,
                    "contentType": {
                        "id": 3,
                        "code": "anime",
                        "name": "Аниме",
                    },
                    "title": anime.get("title", f"Аниме #{anime_id}"),
                    "originalTitle": anime.get("titleOriginal"),
                    "slug": f"anime-{anime_id}",
                    "description": anime.get("description", ""),
                    "posterUrl": anime.get("posterUrl") or "",
                    "bannerUrl": banner_url,
                    "releaseYear": anime.get("year") or 2024,
                    "ageRating": age_rating,
                    "durationMinutes": anime.get("duration", 24),
                    "ratingCache": float(anime.get("rating", 8.0)),
                    "votesCount": int(anime.get("votesCount", 0)),
                    "isFeatured": False,
                    "genres": genres,
                    "countries": [
                        {"id": 1, "code": "JP", "name": anime.get("country") or "Япония"}
                    ],
                    "userRating": None,
                    "userBookmark": None,
                    "userProgress": None,
                    "trailerUrl": anime.get("trailerUrl"),
                    "trailerYoutubeId": anime.get("trailerYoutubeId"),
                }
            except Exception:
                pass

        raise NotFoundException("Контент не найден")

    async def get_seasons(self, content_id: int) -> list[dict[str, Any]]:
        seasons = await self.content_repo.get_seasons_with_episodes(content_id)
        if seasons:
            return seasons

        # Try loading episodes from AnimeService
        if self.anime_service is not None:
            try:
                episodes_data = await self.anime_service.get_episodes(content_id)
                episodes = episodes_data.get("episodes", [])
                if episodes:
                    return [
                        {
                            "id": 1,
                            "contentId": content_id,
                            "seasonNumber": 1,
                            "title": "Сезон 1",
                            "releaseYear": None,
                            "episodes": [
                                {
                                    "id": int(ep["position"]),
                                    "seasonId": 1,
                                    "contentId": content_id,
                                    "episodeNumber": int(ep["position"]),
                                    "title": str(ep["name"]),
                                    "durationMinutes": None,
                                }
                                for ep in episodes
                            ],
                        }
                    ]
            except Exception:
                pass

        return []

    async def get_taxonomies(self) -> dict[str, Any]:
        return await self.content_repo.get_taxonomies()

    async def get_streams(
        self,
        content_id: int,
        episode_id: int | None = None,
        dubber_id: int | None = None,
        source_id: int | None = None,
    ) -> list[dict[str, Any]]:
        # First check AnimeService direct streams
        if self.anime_service is not None:
            try:
                position = episode_id or 1
                anime_streams = await self.anime_service.get_episode_streams(
                    content_id, position, dubber_id, source_id
                )
                if anime_streams:
                    return anime_streams
            except Exception:
                pass

        return await self.provider_manager.get_all_streams(content_id, episode_id)
