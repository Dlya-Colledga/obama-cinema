import logging
import re
from urllib.parse import urljoin, urlparse
import httpx

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


class SibnetParser:
    def supports(self, url: str, source_name: str = "") -> bool:
        if "sibnet" in source_name.lower():
            return True
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        return "sibnet.ru" in host

    async def parse(self, url: str) -> dict[str, list[str]]:
        try:
            async with httpx.AsyncClient(
                headers={"User-Agent": USER_AGENT},
                follow_redirects=True,
                timeout=10.0,
                verify=False,
            ) as client:
                res = await client.get(url)
                if res.status_code >= 400:
                    return {}

                html = res.text
                effective_url = str(res.url)

                m = re.search(r'\bsrc\s*:\s*(?:"([^"]+)"|\'([^\']+)\')', html)
                if not m:
                    return {}

                src = m.group(1) or m.group(2)
                if not src:
                    return {}

                if src.startswith("/"):
                    parsed_eff = urlparse(effective_url)
                    base = f"{parsed_eff.scheme}://{parsed_eff.netloc}"
                    src = urljoin(base, src)

                # Follow redirects with head request to get direct MP4 stream
                head_res = await client.head(
                    src,
                    headers={
                        "User-Agent": USER_AGENT,
                        "Referer": effective_url,
                    },
                    timeout=5.0,
                )
                final_url = str(head_res.url) if head_res.url else src

                return {"unknown": [final_url]}
        except Exception as e:
            logger.warning(f"SibnetParser failed for {url}: {e}")
            return {}
