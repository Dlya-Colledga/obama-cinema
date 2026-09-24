import logging
import re
from typing import Any
from app.exceptions import NotFoundException
from app.providers.anixart.client import AnixartClient
from app.providers.anixart.parsers.resolver import StreamResolver

logger = logging.getLogger(__name__)


class AnimeService:
    POSTER_BASE = "https://s.anixmirai.com/posters/"
    SCREENSHOT_BASE = "https://s.anixmirai.com/screenshots/"

    def __init__(
        self, client: AnixartClient, stream_resolver: StreamResolver
    ) -> None:
        self.client = client
        self.stream_resolver = stream_resolver

    async def search(self, query: str, page: int = 0) -> dict[str, Any]:
        trimmed = query.strip()
        if not trimmed:
            return await self.get_popular(page)

        res = await self.client.search_releases(trimmed, page)
        releases = res.get("releases", [])
        normalized = [self.normalize_release(r) for r in releases]

        return {
            "data": normalized,
            "meta": {
                "page": page,
                "perPage": len(normalized),
                "total": len(normalized),
            },
        }

    async def get_popular(self, page: int = 0) -> dict[str, Any]:
        res = await self.client.get_filter_releases({}, page)
        content = res.get("content", [])
        normalized = [self.normalize_release(r) for r in content]

        return {
            "data": normalized,
            "meta": {
                "page": page,
                "perPage": len(normalized),
                "total": res.get("total_elements", len(normalized)),
            },
        }

    async def get_release(self, release_id: int) -> dict[str, Any]:
        release = await self.client.get_release(release_id, extended=True)
        if release is None:
            raise NotFoundException(f"Аниме с ID {release_id} не найдено")

        normalized = self.normalize_release(release, extended=True)
        trailer_yt_id = await self.get_trailer_youtube_id(release_id)
        normalized["trailerYoutubeId"] = trailer_yt_id
        normalized["trailerUrl"] = (
            f"https://www.youtube.com/watch?v={trailer_yt_id}"
            if trailer_yt_id
            else None
        )
        return normalized

    async def get_trailer_youtube_id(self, release_id: int) -> str | None:
        try:
            video_data = await self.client.get_release_videos(release_id)
            if not video_data or not isinstance(video_data, dict):
                return None

            videos = []
            blocks = video_data.get("blocks")
            if isinstance(blocks, list):
                for b in blocks:
                    if isinstance(b, dict) and isinstance(b.get("videos"), list):
                        videos.extend(b["videos"])

            last_videos = video_data.get("last_videos")
            if isinstance(last_videos, list):
                videos.extend(last_videos)

            for video in videos:
                if not isinstance(video, dict):
                    continue

                cat = video.get("category") or {}
                cat_id = int(cat.get("id") or 0)
                cat_name = str(cat.get("name") or "").lower()
                title = str(video.get("title") or "").lower()

                # Exclude openings, endings, clips, etc.
                excluded = [
                    "опенинг",
                    "эндинг",
                    "клип",
                    "opening",
                    "ending",
                    "op",
                    "ed",
                ]
                if any(x in cat_name for x in ["опенинг", "эндинг", "клип", "opening", "ending"]):
                    continue
                if any(x in title for x in ["опенинг", "эндинг", "клип", "opening", "ending", "op", "ed"]):
                    continue

                # Strict trailer check
                is_trailer = (
                    cat_id == 1
                    or any(x in cat_name for x in ["трейлер", "тизер", "trailer", "pv"])
                    or any(x in title for x in ["трейлер", "тизер", "trailer", "pv"])
                )
                if not is_trailer:
                    continue

                hosting = video.get("hosting") or {}
                hosting_id = int(hosting.get("id") or 0)
                hosting_name = str(hosting.get("name") or "").lower()
                url = str(video.get("url") or video.get("player_url") or "")

                is_youtube = (
                    hosting_id == 2
                    or "youtube" in hosting_name
                    or "youtu" in url
                )
                if not is_youtube:
                    continue

                yt_id = self.extract_youtube_id(url)
                if yt_id:
                    return yt_id
        except Exception as e:
            logger.warning(f"Failed to get trailer for anime {release_id}: {e}")

        return None

    @staticmethod
    def extract_youtube_id(url: str) -> str | None:
        pattern = r"(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([A-Za-z0-9_-]{11})"
        m = re.search(pattern, url, re.I)
        return m.group(1) if m else None

    async def get_dubbers(self, release_id: int) -> list[dict[str, Any]]:
        raw_dubbers = await self.client.get_dubbers(release_id)
        return [
            {
                "id": int(d.get("id") or 0),
                "name": str(d.get("name") or "Неизвестно"),
                "icon": d.get("icon"),
                "workers": d.get("workers"),
                "isSub": bool(d.get("is_sub")),
                "episodesCount": int(d.get("episodes_count") or 0),
                "viewCount": int(d.get("view_count") or 0),
            }
            for d in raw_dubbers
            if isinstance(d, dict)
        ]

    async def get_episodes(
        self,
        release_id: int,
        dubber_id: int | None = None,
        source_id: int | None = None,
    ) -> dict[str, Any]:
        dubbers = await self.get_dubbers(release_id)
        if not dubbers:
            return {
                "selectedDubber": None,
                "selectedSource": None,
                "dubbers": [],
                "sources": [],
                "episodes": [],
            }

        selected_dubber = None
        if dubber_id is not None:
            for d in dubbers:
                if d["id"] == dubber_id:
                    selected_dubber = d
                    break
        if selected_dubber is None:
            selected_dubber = dubbers[0]

        active_dubber_id = int(selected_dubber["id"])
        raw_sources = await self.client.get_sources(release_id, active_dubber_id)
        sources = [
            {
                "id": int(s.get("id") or 0),
                "name": str(s.get("name") or "Плеер"),
                "episodesCount": int(s.get("episodes_count") or 0),
                "quality": int(s.get("quality") or 0),
            }
            for s in raw_sources
            if isinstance(s, dict)
        ]

        selected_source = None
        if source_id is not None:
            for s in sources:
                if s["id"] == source_id:
                    selected_source = s
                    break
        if selected_source is None and sources:
            selected_source = sources[0]

        episodes = []
        if selected_source is not None:
            raw_episodes = await self.client.get_episodes(
                release_id, active_dubber_id, int(selected_source["id"])
            )
            episodes = [
                {
                    "position": int(ep.get("position") or 1),
                    "name": str(ep.get("name") or f"Серия {ep.get('position', 1)}"),
                    "url": str(ep.get("url") or ""),
                    "iframe": bool(ep.get("iframe")),
                    "isFiller": bool(ep.get("is_filler")),
                }
                for ep in raw_episodes
                if isinstance(ep, dict)
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
        episodes_data = await self.get_episodes(release_id, dubber_id, source_id)
        episodes = episodes_data.get("episodes", [])
        target_episode = None

        for ep in episodes:
            if ep["position"] == position:
                target_episode = ep
                break

        if target_episode is None and episodes:
            idx = position - 1 if 0 <= position - 1 < len(episodes) else 0
            target_episode = episodes[idx]

        if not target_episode or not target_episode.get("url"):
            return []

        sel_source = episodes_data.get("selectedSource") or {}
        sel_dubber = episodes_data.get("selectedDubber") or {}
        source_name = sel_source.get("name") or "Anixart"
        dubber_name = sel_dubber.get("name") or "Озвучка"

        return await self.stream_resolver.resolve(
            target_episode["url"], source_name, dubber_name
        )

    def normalize_release(
        self, r: dict[str, Any], extended: bool = False
    ) -> dict[str, Any]:
        release_id = int(r.get("id") or 0)
        title_ru = str(r.get("title_ru") or r.get("name_ru") or "").strip()
        title_orig = str(
            r.get("title_original") or r.get("name_original") or ""
        ).strip()
        title = title_ru if title_ru else (title_orig if title_orig else f"Аниме #{release_id}")

        poster_url = r.get("image")
        if (not poster_url or not str(poster_url).startswith("http")) and r.get("poster"):
            poster_url = f"{self.POSTER_BASE}{r['poster']}.jpg"

        screenshots = []
        if isinstance(r.get("screenshots"), list):
            for shot in r["screenshots"]:
                if isinstance(shot, str):
                    if shot.startswith("http"):
                        screenshots.append(shot)
                    else:
                        screenshots.append(f"{self.SCREENSHOT_BASE}{shot}.jpg")

        genres = []
        if isinstance(r.get("genres"), str):
            genres = [
                g.strip() for g in r["genres"].split(",") if g.strip()
            ]

        raw_grade = float(r.get("grade") or 0.0)
        rating = round(raw_grade * 2, 1) if raw_grade > 0 else 8.0

        episodes_rel = int(r.get("episodes_released") or 0)
        episodes_tot = int(r.get("episodes_total") or episodes_rel)

        status_name = "Завершён"
        status_obj = r.get("status")
        if isinstance(status_obj, dict) and status_obj.get("name"):
            status_name = str(status_obj["name"])
        elif r.get("status_id") == 2 or (episodes_rel < episodes_tot and episodes_tot > 0):
            status_name = "Онгоинг"

        data: dict[str, Any] = {
            "id": release_id,
            "title": title,
            "titleRu": title_ru,
            "titleOriginal": title_orig,
            "slug": f"anime-{release_id}",
            "type": "anime",
            "description": str(r.get("description") or ""),
            "posterUrl": poster_url,
            "year": int(r["year"]) if r.get("year") is not None and str(r["year"]).isdigit() else None,
            "country": str(r.get("country") or "Япония"),
            "genres": genres,
            "rating": rating,
            "grade5": raw_grade,
            "votesCount": int(r.get("rating") or r.get("vote_count") or 0),
            "episodesTotal": episodes_tot,
            "episodesReleased": episodes_rel,
            "duration": int(r["duration"]) if r.get("duration") is not None and str(r["duration"]).isdigit() else 24,
            "season": int(r["season"]) if r.get("season") is not None and str(r["season"]).isdigit() else 1,
            "studio": str(r.get("studio") or ""),
            "director": str(r.get("director") or ""),
            "author": str(r.get("author") or ""),
            "status": status_name,
            "isAnimeApi": True,
        }

        if extended:
            data["screenshots"] = screenshots
            cat_obj = r.get("category")
            data["category"] = cat_obj.get("name") if isinstance(cat_obj, dict) else "Сериал"
            data["ageRating"] = int(r.get("age_rating") or 16)
            data["source"] = str(r.get("source") or "манга")

        return data
