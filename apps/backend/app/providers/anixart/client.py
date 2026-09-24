import logging
from typing import Any
import httpx
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class AnixartClient:
    def __init__(self, base_url: str | None = None) -> None:
        settings = get_settings()
        self.primary_base_url = settings.ANIXART_PRIMARY_URL
        self.fallback_base_url = settings.ANIXART_FALLBACK_URL
        self.active_base_url = base_url or self.primary_base_url
        self.user_agent = settings.ANIXART_USER_AGENT
        self.timeout_seconds = 12.0

    async def search_releases(self, query: str, page: int = 0) -> dict[str, Any]:
        data = await self._post(
            f"/search/releases/{page}",
            body={"query": query},
            extra_headers={"API-Version": "v2"},
        )
        if not isinstance(data, dict):
            return {"releases": []}

        releases = data.get("releases") or data.get("content") or []
        return {
            "releases": releases if isinstance(releases, list) else [],
            "related": data.get("related"),
        }

    async def get_filter_releases(
        self, filter_dict: dict[str, Any] | None = None, page: int = 0
    ) -> dict[str, Any]:
        data = await self._post(
            f"/filter/{page}?extended_mode=true",
            body=filter_dict or {},
        )
        if not isinstance(data, dict):
            return {"content": []}

        content = data.get("content") or []
        return {
            "content": content if isinstance(content, list) else [],
            "total_pages": int(data.get("total_pages") or 1),
            "total_elements": int(data.get("total_elements") or len(content)),
        }

    async def get_release(
        self, release_id: int, extended: bool = True
    ) -> dict[str, Any] | None:
        ext = "true" if extended else "false"
        data = await self._get(f"/release/{release_id}?extended_mode={ext}")
        if not isinstance(data, dict):
            return None
        release = data.get("release")
        return release if isinstance(release, dict) else None

    async def get_release_videos(self, release_id: int) -> dict[str, Any] | None:
        data = await self._get(f"/video/release/{release_id}")
        if not isinstance(data, dict) or data.get("code") != 0:
            return None
        return data

    async def get_dubbers(self, release_id: int) -> list[dict[str, Any]]:
        data = await self._get(f"/episode/{release_id}")
        if not isinstance(data, dict):
            return []
        types = data.get("types")
        return types if isinstance(types, list) else []

    async def get_sources(
        self, release_id: int, dubber_id: int
    ) -> list[dict[str, Any]]:
        data = await self._get(f"/episode/{release_id}/{dubber_id}")
        if not isinstance(data, dict):
            return []
        sources = data.get("sources")
        return sources if isinstance(sources, list) else []

    async def get_episodes(
        self,
        release_id: int,
        dubber_id: int,
        source_id: int,
        sort: int | None = None,
    ) -> list[dict[str, Any]]:
        query = f"?sort={sort}" if sort is not None else ""
        data = await self._get(f"/episode/{release_id}/{dubber_id}/{source_id}{query}")
        if not isinstance(data, dict):
            return []
        episodes = data.get("episodes")
        return episodes if isinstance(episodes, list) else []

    async def _get(
        self, path: str, extra_headers: dict[str, str] | None = None
    ) -> Any:
        return await self._request("GET", path, None, extra_headers)

    async def _post(
        self, path: str, body: Any = None, extra_headers: dict[str, str] | None = None
    ) -> Any:
        return await self._request("POST", path, body, extra_headers)

    async def _request(
        self,
        method: str,
        path: str,
        body: Any = None,
        extra_headers: dict[str, str] | None = None,
    ) -> Any:
        urls_to_try = [self.active_base_url]
        if self.active_base_url == self.primary_base_url:
            urls_to_try.append(self.fallback_base_url)
        else:
            urls_to_try.append(self.primary_base_url)

        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/json",
        }
        if extra_headers:
            headers.update(extra_headers)

        for base_url in urls_to_try:
            url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
            try:
                async with httpx.AsyncClient(
                    headers=headers,
                    timeout=self.timeout_seconds,
                    verify=False,
                ) as client:
                    if method == "POST":
                        res = await client.post(url, json=body if body is not None else {})
                    else:
                        res = await client.get(url)

                    if 200 <= res.status_code < 300:
                        self.active_base_url = base_url
                        return res.json()
                    logger.warning(
                        f"Anixart request to {url} failed with status {res.status_code}"
                    )
            except Exception as e:
                logger.warning(f"Anixart request to {url} raised error: {e}")

        return None
