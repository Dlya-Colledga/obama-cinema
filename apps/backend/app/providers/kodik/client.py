import asyncio
import logging
from typing import Any

from anime_parsers_ru import KodikParserAsync
from anime_parsers_ru.errors import NoResults, TokenError

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class KodikClient:
    """
    Generalized Kodik client for streaming and catalog queries.
    Supports Anime, Movies, TV Series, Cartoons, and Doramas.
    """

    def __init__(self, token: str | None = None) -> None:
        settings = get_settings()
        self._token: str | None = token or settings.KODIK_API_TOKEN
        self._parser: KodikParserAsync | None = None
        self._lock = asyncio.Lock()

    async def _get_parser(self) -> KodikParserAsync:
        async with self._lock:
            if self._parser is None:
                if not self._token:
                    try:
                        logger.info("Resolving Kodik token via AnimeParsers...")
                        self._token = await KodikParserAsync.get_token()
                        logger.info("Successfully acquired Kodik token.")
                    except Exception as e:
                        logger.error(f"Failed to acquire Kodik token: {e}")
                        # Fallback token or empty
                        self._token = ""
                self._parser = KodikParserAsync(token=self._token, validate_token=False)
            return self._parser

    async def close(self) -> None:
        async with self._lock:
            if self._parser is not None:
                try:
                    await self._parser.close_async_session()
                except Exception as e:
                    logger.warning(f"Error closing Kodik parser session: {e}")
                finally:
                    self._parser = None

    async def search(
        self,
        title: str,
        limit: int = 20,
        only_anime: bool = False,
        anime_status: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Search media on Kodik.
        Set only_anime=False to search across movies, TV series, cartoons, and anime.
        """
        trimmed = title.strip()
        if not trimmed:
            return []

        parser = await self._get_parser()
        try:
            results = await parser.search(
                trimmed, limit=limit, only_anime=only_anime, anime_status=anime_status
            )
            return results if isinstance(results, list) else []
        except NoResults:
            return []
        except TokenError:
            logger.warning("Kodik token invalid or expired. Refreshing token...")
            self._token = None
            async with self._lock:
                if self._parser:
                    await self._parser.close_async_session()
                    self._parser = None
            return []
        except Exception as e:
            logger.warning(f"Kodik search failed for '{trimmed}': {e}")
            return []

    async def search_by_id(
        self,
        external_id: str,
        id_type: str = "shikimori",
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """
        Search Kodik media by external ID (shikimori, kinopoisk, imdb, or kodik).
        """
        parser = await self._get_parser()
        try:
            results = await parser.search_by_id(id=str(external_id), id_type=id_type, limit=limit)
            return results if isinstance(results, list) else []
        except NoResults:
            return []
        except Exception as e:
            logger.warning(f"Kodik search_by_id failed for {id_type}:{external_id}: {e}")
            return []

    async def get_translations(
        self, external_id: str, id_type: str = "shikimori"
    ) -> list[dict[str, Any]]:
        """
        Retrieve available dubbing / translation tracks for the media.
        """
        parser = await self._get_parser()
        try:
            translations = await parser.translations(id=str(external_id), id_type=id_type)
            return translations if isinstance(translations, list) else []
        except NoResults:
            return []
        except Exception as e:
            logger.warning(f"Kodik get_translations failed for {id_type}:{external_id}: {e}")
            return []

    async def get_series_count(self, external_id: str, id_type: str = "shikimori") -> int:
        """
        Retrieve total number of episodes for serialized media.
        """
        parser = await self._get_parser()
        try:
            count = await parser.series_count(id=str(external_id), id_type=id_type)
            return int(count) if count is not None else 0
        except NoResults:
            return 0
        except Exception as e:
            logger.warning(f"Kodik get_series_count failed for {id_type}:{external_id}: {e}")
            return 0

    async def get_m3u8_link(
        self,
        external_id: str,
        id_type: str = "shikimori",
        episode_num: int = 1,
        translation_id: str = "0",
        quality: int = 720,
        is_movie: bool = False,
    ) -> tuple[str | None, int, list[list[int]]]:
        """
        Resolve HLS M3U8 playlist stream URL from Kodik CDN.
        For movies or single videos, seria_num is 0.
        Returns: (m3u8_url, quality_int, skip_segments)
        """
        parser = await self._get_parser()
        seria_num = 0 if is_movie else max(1, episode_num)
        trans_id = str(translation_id) if translation_id else "0"

        try:
            link_data = await parser.get_link(
                id=str(external_id),
                id_type=id_type,
                seria_num=seria_num,
                translation_id=trans_id,
            )
            if not link_data or not link_data[0]:
                return None, 0, []

            raw_base = link_data[0]
            max_quality = link_data[1] if len(link_data) > 1 and link_data[1] else 720
            skip_segments = (
                link_data[2] if len(link_data) > 2 and isinstance(link_data[2], list) else []
            )

            selected_q = str(
                min(quality, max_quality) if quality in [360, 480, 720] else max_quality
            )

            if raw_base.startswith("//"):
                prefix = "https:"
            elif raw_base.startswith("http"):
                prefix = ""
            else:
                prefix = "https://"

            base_clean = raw_base if raw_base.endswith("/") else f"{raw_base}/"
            m3u8_url = f"{prefix}{base_clean}{selected_q}.mp4:hls:manifest.m3u8"
            return m3u8_url, int(selected_q), skip_segments
        except Exception as e:
            logger.warning(
                f"Kodik get_m3u8_link failed for {id_type}:{external_id} ep:{seria_num}: {e}"
            )
            return None, 0, []

    async def get_stream_link(
        self,
        external_id: str,
        id_type: str = "shikimori",
        episode_num: int = 1,
        translation_id: str = "0",
        is_movie: bool = False,
    ) -> tuple[str | None, int, list[list[int]]]:
        """
        Resolve direct MP4 stream URL from Kodik CDN.
        For movies or single videos, seria_num is 0.
        Returns: (direct_mp4_url, quality_int, skip_segments)
        """
        parser = await self._get_parser()
        seria_num = 0 if is_movie else max(1, episode_num)
        trans_id = str(translation_id) if translation_id else "0"

        try:
            raw_url, quality, skip_segments = await parser.get_link(
                id=str(external_id),
                id_type=id_type,
                seria_num=seria_num,
                translation_id=trans_id,
            )

            if not raw_url:
                return None, 0, []

            url = raw_url
            if url.startswith("//"):
                url = f"https:{url}"
            elif not url.startswith("http"):
                url = f"https://{url}"

            quality_val = quality if quality > 0 else 720
            # Construct direct MP4 URL if base CDN folder was returned
            if url.endswith("/"):
                formatted_url = f"{url}{quality_val}.mp4"
            elif not url.endswith(".mp4") and not url.endswith(".m3u8"):
                formatted_url = f"{url}/{quality_val}.mp4"
            else:
                formatted_url = url

            return formatted_url, quality_val, skip_segments
        except Exception as e:
            logger.warning(
                f"Kodik get_stream_link failed for {id_type}:{external_id} ep:{seria_num}: {e}"
            )
            return None, 0, []

    async def get_embed_link(self, external_id: str, id_type: str = "shikimori") -> str | None:
        """
        Retrieve iframe player URL for the media.
        """
        parser = await self._get_parser()
        try:
            link = await parser.get_embed_link(id=str(external_id), id_type=id_type, https=True)
            if not link:
                return None
            if link.startswith("//"):
                return f"https:{link}"
            if not link.startswith("http"):
                return f"https://{link}"
            return link
        except Exception as e:
            logger.warning(f"Kodik get_embed_link failed for {id_type}:{external_id}: {e}")
            return None
