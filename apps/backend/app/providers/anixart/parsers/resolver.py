import logging
import zlib
from typing import Any
from app.providers.anixart.parsers.anilibria import AnilibriaParser
from app.providers.anixart.parsers.kodik import KodikParser
from app.providers.anixart.parsers.sibnet import SibnetParser

logger = logging.getLogger(__name__)


class StreamResolver:
    def __init__(self) -> None:
        self.parsers = [
            KodikParser(),
            AnilibriaParser(),
            SibnetParser(),
        ]

    async def resolve(
        self, url: str, source_name: str = "", dubber_name: str = "Озвучка"
    ) -> list[dict[str, Any]]:
        url = url.strip()
        if not url:
            return []

        for parser in self.parsers:
            if parser.supports(url, source_name):
                try:
                    quality_map = await parser.parse(url)
                    if quality_map:
                        streams = []

                        # Sort qualities descending (1080, 720, 480, etc.)
                        def sort_key(q: str) -> int:
                            return int(q) if q.isdigit() else 0

                        sorted_qualities = sorted(
                            quality_map.keys(), key=sort_key, reverse=True
                        )

                        for quality in sorted_qualities:
                            urls = quality_map[quality]
                            display_quality = f"{quality}p" if quality.isdigit() else "auto"
                            for stream_url in urls:
                                is_hls = (
                                    ".m3u8" in stream_url or "manifest" in stream_url
                                )
                                streams.append(
                                    {
                                        "id": zlib.crc32(stream_url.encode("utf-8")),
                                        "provider": source_name or "Anixart HLS",
                                        "providerCode": "anixart",
                                        "streamUrl": stream_url,
                                        "playerType": "hls" if is_hls else "mp4",
                                        "quality": display_quality,
                                        "translationTitle": dubber_name,
                                    }
                                )

                        if streams:
                            return streams
                except Exception as e:
                    logger.warning(f"StreamResolver parser error for {url}: {e}")

        # Fallback to iframe embed player
        return [
            {
                "id": zlib.crc32(url.encode("utf-8")),
                "provider": f"{source_name} (Embed)" if source_name else "Anixart Player",
                "providerCode": "anixart",
                "streamUrl": url,
                "playerType": "iframe",
                "quality": "auto",
                "translationTitle": dubber_name,
            }
        ]
