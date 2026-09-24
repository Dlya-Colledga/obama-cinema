import logging
import re
from typing import Any

from app.exceptions import NotFoundException
from app.providers.kodik.client import KodikClient
from app.providers.shikimori.client import ShikimoriClient

logger = logging.getLogger(__name__)


class AnimeService:
    """
    Anime service powered by Shikimori for metadata and Kodik for streaming.
    Preserves full frontend API compatibility.
    """

    def __init__(self, shikimori: ShikimoriClient, kodik: KodikClient) -> None:
        self.shikimori = shikimori
        self.kodik = kodik

    async def search(self, query: str, page: int = 0) -> dict[str, Any]:
        trimmed = query.strip()
        if not trimmed:
            return await self.get_popular(page)

        # Shikimori uses 1-based pagination
        shiki_page = max(1, page + 1)
        results = await self.shikimori.search(trimmed, page=shiki_page, limit=24)
        normalized = [self.normalize_release(r) for r in results]

        return {
            "data": normalized,
            "meta": {
                "page": page,
                "perPage": len(normalized),
                "total": len(normalized),
            },
        }

    async def get_popular(self, page: int = 0) -> dict[str, Any]:
        shiki_page = max(1, page + 1)
        results = await self.shikimori.get_popular(page=shiki_page, limit=24)
        normalized = [self.normalize_release(r) for r in results]

        return {
            "data": normalized,
            "meta": {
                "page": page,
                "perPage": len(normalized),
                "total": len(normalized),
            },
        }

    async def get_release(self, release_id: int) -> dict[str, Any]:
        detail = await self.shikimori.get_detail(release_id)
        if detail is None:
            raise NotFoundException(f"Аниме с ID {release_id} не найдено")

        screenshots_raw = await self.shikimori.get_screenshots(release_id)
        screenshots = [
            self.shikimori.format_media_url(s.get("original") or s.get("preview"))
            for s in screenshots_raw
            if isinstance(s, dict)
        ]
        detail["screenshots"] = [s for s in screenshots if s]

        normalized = self.normalize_release(detail, extended=True)

        # Strict YouTube trailer extraction
        trailer_yt_id, trailer_url = await self.get_trailer(release_id)
        normalized["trailerYoutubeId"] = trailer_yt_id
        normalized["trailerUrl"] = trailer_url

        return normalized

    async def get_trailer(self, release_id: int) -> tuple[str | None, str | None]:
        """
        Extract trailer strictly from YouTube.
        Excludes openings, endings, clips, and non-YouTube hosts.
        """
        try:
            videos = await self.shikimori.get_videos(release_id)
            return self.shikimori.extract_strict_youtube_trailer(videos)
        except Exception as e:
            logger.warning(f"Failed to fetch videos for anime {release_id}: {e}")
            return None, None

    async def get_trailer_youtube_id(self, release_id: int) -> str | None:
        yt_id, _ = await self.get_trailer(release_id)
        return yt_id

    async def get_dubbers(self, release_id: int) -> list[dict[str, Any]]:
        # Fetch translations from Kodik by Shikimori ID
        translations = await self.kodik.get_translations(str(release_id), id_type="shikimori")

        if not translations:
            # Fallback search on Kodik by title if ID wasn't linked
            detail = await self.shikimori.get_detail(release_id)
            if detail:
                search_title = detail.get("russian") or detail.get("name")
                if search_title:
                    k_search = await self.kodik.search(search_title, limit=3, only_anime=True)
                    for item in k_search:
                        k_id = item.get("shikimori_id") or item.get("kinopoisk_id")
                        k_type = "shikimori" if item.get("shikimori_id") else "kinopoisk"
                        if k_id:
                            translations = await self.kodik.get_translations(
                                str(k_id), id_type=k_type
                            )
                            if translations:
                                break

        dubbers = []
        for idx, t in enumerate(translations):
            t_id = int(t["id"]) if str(t.get("id", "")).isdigit() else idx + 1
            t_name = str(t.get("name") or "Озвучка")
            t_type = str(t.get("type") or "").lower()
            is_sub = "суб" in t_type or "sub" in t_type

            # Series range tuple (min, max)
            series_range = t.get("series_range")
            ep_count = 0
            if isinstance(series_range, (list, tuple)) and len(series_range) > 1:
                ep_count = int(series_range[1])

            dubbers.append(
                {
                    "id": t_id,
                    "name": t_name,
                    "icon": None,
                    "workers": None,
                    "isSub": is_sub,
                    "episodesCount": ep_count,
                    "viewCount": 0,
                }
            )

        # Fallback default dubber if Kodik returned empty translations
        if not dubbers:
            dubbers.append(
                {
                    "id": 1,
                    "name": "Kodik Player",
                    "icon": None,
                    "workers": None,
                    "isSub": False,
                    "episodesCount": 1,
                    "viewCount": 0,
                }
            )

        return dubbers

    async def get_episodes(
        self,
        release_id: int,
        dubber_id: int | None = None,
        source_id: int | None = None,
    ) -> dict[str, Any]:
        dubbers = await self.get_dubbers(release_id)

        selected_dubber = None
        if dubber_id is not None:
            for d in dubbers:
                if d["id"] == dubber_id:
                    selected_dubber = d
                    break
        if selected_dubber is None and dubbers:
            selected_dubber = dubbers[0]

        # Determine total episodes
        total_episodes = 0
        if selected_dubber and selected_dubber["episodesCount"] > 0:
            total_episodes = selected_dubber["episodesCount"]
        else:
            # Check Kodik series count
            total_episodes = await self.kodik.get_series_count(str(release_id), id_type="shikimori")

        if total_episodes <= 0:
            # Fallback to Shikimori detail
            detail = await self.shikimori.get_detail(release_id)
            if detail:
                total_episodes = int(detail.get("episodes") or detail.get("episodes_aired") or 1)
            else:
                total_episodes = 1

        sources = [
            {
                "id": 1,
                "name": "Kodik",
                "episodesCount": total_episodes,
                "quality": 720,
            }
        ]
        selected_source = sources[0]

        episodes = [
            {
                "position": i,
                "name": f"Серия {i}",
                "url": f"kodik:{release_id}:{i}",
                "iframe": False,
                "isFiller": False,
            }
            for i in range(1, total_episodes + 1)
        ]

        return {
            "selectedDubber": selected_dubber,
            "selectedSource": selected_source,
            "dubbers": dubbers,
            "sources": sources,
            "episodes": episodes,
        }

    async def get_episode_streams(
        self,
        release_id: int,
        position: int = 1,
        dubber_id: int | None = None,
        source_id: int | None = None,
    ) -> list[dict[str, Any]]:
        streams: list[dict[str, Any]] = []
        trans_id = str(dubber_id) if dubber_id is not None else "0"

        # 1. Fetch direct MP4 stream
        direct_url, quality, _ = await self.kodik.get_stream_link(
            external_id=str(release_id),
            id_type="shikimori",
            episode_num=position,
            translation_id=trans_id,
            is_movie=False,
        )

        if direct_url:
            streams.append(
                {
                    "id": release_id * 1000 + (dubber_id or 1),
                    "provider": "Kodik Direct",
                    "providerCode": "kodik",
                    "streamUrl": direct_url,
                    "playerType": "mp4",
                    "quality": f"{quality}p",
                    "translationTitle": "Прямой поток (MP4)",
                }
            )

        # 2. Fetch embed iframe player
        embed_url = await self.kodik.get_embed_link(
            external_id=str(release_id), id_type="shikimori"
        )
        if embed_url:
            streams.append(
                {
                    "id": release_id * 1000 + 999,
                    "provider": "Kodik Player",
                    "providerCode": "kodik",
                    "streamUrl": embed_url,
                    "playerType": "iframe",
                    "quality": "1080p",
                    "translationTitle": "Мультиплеер (все озвучки)",
                }
            )

        return streams

    def normalize_release(self, r: dict[str, Any], extended: bool = False) -> dict[str, Any]:
        release_id = int(r.get("id") or 0)
        title_ru = str(r.get("russian") or r.get("title_ru") or "").strip()
        title_orig = str(r.get("name") or r.get("title_original") or "").strip()
        title = title_ru if title_ru else (title_orig if title_orig else f"Аниме #{release_id}")

        image_obj = r.get("image") or {}
        poster_path = (
            image_obj.get("original")
            or image_obj.get("preview")
            or r.get("poster_url")
            or r.get("poster")
        )
        poster_url = self.shikimori.format_media_url(poster_path)

        # Parse year from aired_on e.g. "2013-04-07"
        year = None
        aired_on = r.get("aired_on") or r.get("released_on")
        if aired_on and isinstance(aired_on, str) and len(aired_on) >= 4:
            year_part = aired_on[:4]
            if year_part.isdigit():
                year = int(year_part)
        elif r.get("year") is not None and str(r["year"]).isdigit():
            year = int(r["year"])

        # Genres
        genres = []
        raw_genres = r.get("genres", [])
        if isinstance(raw_genres, list):
            for g in raw_genres:
                if isinstance(g, dict) and g.get("russian"):
                    genres.append(str(g["russian"]))
                elif isinstance(g, str):
                    genres.append(g.strip())
        elif isinstance(raw_genres, str):
            genres = [g.strip() for g in raw_genres.split(",") if g.strip()]

        raw_score = float(r.get("score") or r.get("rating") or 8.0)
        rating = round(raw_score, 1)
        grade5 = round(rating / 2, 2)

        episodes_rel = int(r.get("episodes_aired") or r.get("episodes") or 0)
        episodes_tot = int(r.get("episodes") or episodes_rel)

        # Status
        status_raw = str(r.get("status") or "").lower()
        if status_raw in ["released", "завершён", "завершено"]:
            status_name = "Завершён"
        elif status_raw in ["ongoing", "онгоинг"]:
            status_name = "Онгоинг"
        elif status_raw in ["anons", "анонс"]:
            status_name = "Анонс"
        else:
            status_name = (
                "Завершён" if episodes_tot > 0 and episodes_rel >= episodes_tot else "Онгоинг"
            )

        # Studios
        studio_name = ""
        studios = r.get("studios", [])
        if isinstance(studios, list) and studios:
            studio_name = str(studios[0].get("name", ""))
        elif isinstance(r.get("studio"), str):
            studio_name = r["studio"]

        # Description cleanup (remove [b]...[/b], [i]...[/i], HTML tags)
        raw_desc = str(r.get("description") or r.get("description_html") or "")
        clean_desc = re.sub(r"<[^>]+>", "", raw_desc)
        clean_desc = re.sub(
            r"\[/?(?:b|i|u|character|anime|url|spoiler)[^\]]*\]", "", clean_desc
        ).strip()

        data: dict[str, Any] = {
            "id": release_id,
            "title": title,
            "titleRu": title_ru or title,
            "titleOriginal": title_orig or title,
            "slug": f"anime-{release_id}",
            "type": "anime",
            "description": clean_desc,
            "posterUrl": poster_url,
            "year": year,
            "country": "Япония",
            "genres": genres,
            "rating": rating,
            "grade5": grade5,
            "votesCount": int(r.get("votes_count") or 100),
            "episodesTotal": episodes_tot,
            "episodesReleased": episodes_rel,
            "duration": int(r.get("duration") or 24),
            "season": 1,
            "studio": studio_name,
            "director": "",
            "author": "",
            "status": status_name,
            "isAnimeApi": True,
        }

        if extended:
            data["screenshots"] = r.get("screenshots") or []
            data["category"] = "Сериал" if episodes_tot > 1 else "Фильм"
            data["ageRating"] = 16
            data["source"] = "манга"

        return data
