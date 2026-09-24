import logging
from typing import Any
from app.providers.base import ContentProvider

logger = logging.getLogger(__name__)


class ProviderManager:
    def __init__(self) -> None:
        self._providers: dict[str, ContentProvider] = {}

    def register_provider(self, provider: ContentProvider) -> None:
        self._providers[provider.get_identifier()] = provider

    def get_provider(self, identifier: str) -> ContentProvider | None:
        return self._providers.get(identifier)

    async def get_all_streams(
        self, content_id: int, episode_id: int | None = None
    ) -> list[dict[str, Any]]:
        all_streams: list[dict[str, Any]] = []
        for provider in self._providers.values():
            try:
                streams = await provider.get_streams(content_id, episode_id)
                all_streams.extend(streams)
            except Exception as e:
                logger.warning(
                    f"Provider {provider.get_identifier()} failed for content {content_id}: {e}"
                )
        return all_streams
