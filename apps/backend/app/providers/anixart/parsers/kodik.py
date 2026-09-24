import base64
import json
import logging
import re
from urllib.parse import parse_qs, urlencode, urlparse
import httpx

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


class KodikParser:
    def supports(self, url: str, source_name: str = "") -> bool:
        if "kodik" in source_name.lower():
            return True
        parsed = urlparse(url)
        host = (parsed.hostname or "").lower()
        return "kodik" in host or "kodikplayer" in host

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

                hash_match = re.search(r"\w+\.hash\s*=\s*'([^']*)'", html, re.I)
                id_match = re.search(r"\w+\.id\s*=\s*'([^']*)'", html, re.I)
                type_match = re.search(r"\w+\.type\s*=\s*'([^']*)'", html, re.I)
                params_match = re.search(r"var\s+urlParams\s*=\s*'(.*?)';", html, re.S)

                if not hash_match or not id_match or not type_match:
                    return {}

                h = hash_match.group(1)
                i = id_match.group(1)
                t = type_match.group(1)

                params = {}
                if params_match:
                    try:
                        params = json.loads(params_match.group(1))
                    except Exception:
                        params = {}

                params["hash"] = h
                params["id"] = i
                params["type"] = t

                parsed_eff = urlparse(effective_url)
                host = parsed_eff.netloc or "kodikplayer.com"
                scheme = parsed_eff.scheme or "https"
                ftor_url = f"{scheme}://{host}/ftor?{urlencode(params)}"

                ftor_res = await client.post(
                    ftor_url,
                    headers={
                        "User-Agent": USER_AGENT,
                        "Referer": effective_url,
                    },
                )
                if ftor_res.status_code >= 400:
                    return {}

                data = ftor_res.json()
                links = data.get("links")
                if not isinstance(links, dict):
                    return {}

                result: dict[str, list[str]] = {}
                for quality, sources in links.items():
                    if not isinstance(sources, list):
                        continue
                    for source in sources:
                        if not isinstance(source, dict) or not source.get("src"):
                            continue
                        decoded = str(source["src"]).strip()
                        if not decoded:
                            continue

                        if (
                            not decoded.startswith("http")
                            and not decoded.startswith("//")
                            and not decoded.startswith("/")
                        ):
                            # Rot-18 + Base64
                            b64 = self._rot18(decoded)
                            try:
                                decoded = base64.b64decode(b64).decode("utf-8")
                            except Exception:
                                pass

                        if decoded.startswith("//"):
                            decoded = f"https:{decoded}"

                        if decoded.startswith("http://") or decoded.startswith("https://"):
                            result.setdefault(str(quality), []).append(decoded)

                return result
        except Exception as e:
            logger.warning(f"KodikParser failed for {url}: {e}")
            return {}

    @staticmethod
    def _rot18(text: str) -> str:
        res = []
        for c in text:
            if "a" <= c <= "z":
                res.append(chr((ord(c) - 97 + 18) % 26 + 97))
            elif "A" <= c <= "Z":
                res.append(chr((ord(c) - 65 + 18) % 26 + 65))
            else:
                res.append(c)
        return "".join(res)
