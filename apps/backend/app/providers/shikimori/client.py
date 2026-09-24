import logging
import re
from typing import Any

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class ShikimoriClient:
    """Async client for Shikimori API (anime metadata source)."""

    SHIKIMORI_MEDIA_HOST = "https://shikimori.io"

    def __init__(
        self,
        base_url: str | None = None,
        user_agent: str | None = None,
        timeout: float = 12.0,
    ) -> None:
        settings = get_settings()
        self.base_url = (base_url or settings.SHIKIMORI_API_URL).rstrip("/")
        self.user_agent = user_agent or settings.SHIKIMORI_USER_AGENT
        self.access_token = settings.SHIKIMORI_ACCESS_TOKEN
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            headers = {"User-Agent": self.user_agent}
            if self.access_token and self.access_token.strip():
                headers["Authorization"] = f"Bearer {self.access_token.strip()}"
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers=headers,
                timeout=self.timeout,
                follow_redirects=True,
            )
        return self._client

    async def close(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def search(self, query: str, page: int = 1, limit: int = 24) -> list[dict[str, Any]]:
        client = await self._get_client()
        params: dict[str, Any] = {
            "search": query,
            "page": max(1, page),
            "limit": limit,
            "order": "ranked",
            "censored": "false",
        }
        try:
            resp = await client.get("/animes", params=params)
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else []
        except Exception as e:
            logger.warning(f"Shikimori search failed for query '{query}': {e}")
            return []

    async def get_popular(self, page: int = 1, limit: int = 24) -> list[dict[str, Any]]:
        client = await self._get_client()
        params: dict[str, Any] = {
            "order": "popularity",
            "page": max(1, page),
            "limit": limit,
            "censored": "false",
        }
        try:
            resp = await client.get("/animes", params=params)
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else []
        except Exception as e:
            logger.warning(f"Shikimori get_popular failed: {e}")
            return []

    async def get_detail(self, anime_id: int) -> dict[str, Any] | None:
        client = await self._get_client()
        try:
            resp = await client.get(f"/animes/{anime_id}")
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, dict) else None
        except Exception as e:
            logger.warning(f"Shikimori get_detail failed for ID {anime_id}: {e}")
            return None

    async def get_videos(self, anime_id: int) -> list[dict[str, Any]]:
        client = await self._get_client()
        try:
            resp = await client.get(f"/animes/{anime_id}/videos")
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else []
        except Exception as e:
            logger.warning(f"Shikimori get_videos failed for ID {anime_id}: {e}")
            return []

    async def get_screenshots(self, anime_id: int) -> list[dict[str, Any]]:
        client = await self._get_client()
        try:
            resp = await client.get(f"/animes/{anime_id}/screenshots")
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else []
        except Exception as e:
            logger.warning(f"Shikimori get_screenshots failed for ID {anime_id}: {e}")
            return []

    def format_media_url(self, path: str | None) -> str | None:
        if not path:
            return None
        # Filter out Shikimori censored / missing placeholder images
        if "missing_original" in path or "missing_preview" in path:
            return None
        if path.startswith("http://") or path.startswith("https://"):
            return path
        return f"{self.SHIKIMORI_MEDIA_HOST}{path}"

    async def get_fallback_poster(self, mal_id: int) -> str | None:
        """
        Retrieve uncensored high-resolution poster from AniList by MAL/Shikimori ID.
        Used when Shikimori wiped or replaced the poster with a missing placeholder.
        """
        if not mal_id:
            return None
        query = f"""
        query {{
          Media(idMal: {mal_id}, type: ANIME) {{
            coverImage {{
              extraLarge
              large
            }}
          }}
        }}
        """
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.post(
                    "https://graphql.anilist.co",
                    json={"query": query},
                    headers={"User-Agent": self.user_agent},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    media = data.get("data", {}).get("Media")
                    if media:
                        imgs = media.get("coverImage", {})
                        return imgs.get("extraLarge") or imgs.get("large")
        except Exception as e:
            logger.warning(f"Failed to fetch fallback poster from AniList for MAL ID {mal_id}: {e}")
        return None

    @staticmethod
    def extract_youtube_id(url: str) -> str | None:
        if not url:
            return None
        pattern = r"(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([A-Za-z0-9_-]{11})"
        m = re.search(pattern, url, re.I)
        return m.group(1) if m else None

    @classmethod
    def extract_strict_youtube_trailer(
        cls, videos: list[dict[str, Any]]
    ) -> tuple[str | None, str | None]:
        """
        Strictly extract ONLY YouTube trailers/promos.
        Under no circumstances returns non-YouTube links or openings/endings.
        Returns: (youtube_id, youtube_watch_url) or (None, None).
        """
        if not videos:
            return None, None

        # 1. First priority: kind in ('pv', 'trailer', 'character_trailer', 'promo') AND youtube
        for v in videos:
            if not isinstance(v, dict):
                continue
            hosting = str(v.get("hosting") or "").lower()
            kind = str(v.get("kind") or "").lower()
            url = str(v.get("url") or v.get("player_url") or "")

            is_yt = "youtube" in hosting or "youtu" in url
            if not is_yt:
                continue

            if kind in ("pv", "trailer", "character_trailer", "promo"):
                yt_id = cls.extract_youtube_id(url)
                if yt_id:
                    return yt_id, f"https://www.youtube.com/watch?v={yt_id}"

        # 2. Second priority: title/name contains trailer/teaser/тизер/трейлер AND youtube AND NOT op/ed
        for v in videos:
            if not isinstance(v, dict):
                continue
            hosting = str(v.get("hosting") or "").lower()
            kind = str(v.get("kind") or "").lower()
            name = str(v.get("name") or "").lower()
            url = str(v.get("url") or v.get("player_url") or "")

            is_yt = "youtube" in hosting or "youtu" in url
            if not is_yt:
                continue

            if kind in ("op", "ed", "clip"):
                continue

            if any(w in name for w in ("трейлер", "тизер", "trailer", "teaser", "pv")):
                yt_id = cls.extract_youtube_id(url)
                if yt_id:
                    return yt_id, f"https://www.youtube.com/watch?v={yt_id}"

        # 3. Third priority: any non-op/ed video on YouTube
        for v in videos:
            if not isinstance(v, dict):
                continue
            hosting = str(v.get("hosting") or "").lower()
            kind = str(v.get("kind") or "").lower()
            url = str(v.get("url") or v.get("player_url") or "")

            if kind in ("op", "ed", "clip"):
                continue

            is_yt = "youtube" in hosting or "youtu" in url
            if is_yt:
                yt_id = cls.extract_youtube_id(url)
                if yt_id:
                    return yt_id, f"https://www.youtube.com/watch?v={yt_id}"

        return None, None
