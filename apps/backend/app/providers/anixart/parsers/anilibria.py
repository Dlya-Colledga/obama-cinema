import logging
import re
from urllib.parse import parse_qs, urlparse
import httpx

logger = logging.getLogger(__name__)

BASE_DOMAIN = "aniliberty.top"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


class AnilibriaParser:
    def supports(self, url: str, source_name: str = "") -> bool:
        if "libria" in source_name.lower():
            return True
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        return "libria" in host or "anilibria" in host or "aniliberty" in host

    async def parse(self, url: str) -> dict[str, list[str]]:
        try:
            parsed = urlparse(url)
            query = parse_qs(parsed.query)

            release_id = query.get("id", [None])[0]
            ep = 1
            if "ep" in query and query["ep"][0].isdigit():
                ep = int(query["ep"][0])

            if not release_id:
                m = re.search(r"/releases/(\d+)", url)
                if m:
                    release_id = m.group(1)

            if not release_id:
                return {}

            api_url = f"https://{BASE_DOMAIN}/api/v1/anime/releases/{release_id}"
            async with httpx.AsyncClient(
                headers={"User-Agent": USER_AGENT},
                timeout=10.0,
                verify=False,
            ) as client:
                res = await client.get(api_url)
                if res.status_code >= 400:
                    return {}

                data = res.json()
                episodes = data.get("episodes")
                if not isinstance(episodes, list):
                    return {}

                result: dict[str, list[str]] = {}
                for episode in episodes:
                    if not isinstance(episode, dict):
                        continue
                    ordinal = int(episode.get("ordinal") or 0)
                    if ordinal != ep:
                        continue

                    for quality in ["1080", "720", "480"]:
                        hls = episode.get(f"hls_{quality}")
                        if isinstance(hls, str) and hls.strip():
                            result.setdefault(quality, []).append(hls.strip())
                    break

                return result
        except Exception as e:
            logger.warning(f"AnilibriaParser failed for {url}: {e}")
            return {}
