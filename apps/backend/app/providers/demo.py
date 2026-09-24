from typing import Any


class DemoStreamProvider:
    def __init__(self, content_repo: Any = None) -> None:
        self.content_repo = content_repo

    def get_identifier(self) -> str:
        return "demo_stream"

    def get_name(self) -> str:
        return "Obama Direct Stream (HLS/MP4)"

    def supports(self, content_type: str) -> bool:
        return True

    async def get_streams(
        self, content_id: int, episode_id: int | None = None
    ) -> list[dict[str, Any]]:
        if self.content_repo is not None:
            db_sources = await self.content_repo.get_stream_sources(content_id, episode_id)
            if db_sources:
                return db_sources

        # Fallback open streams if none configured in database
        return [
            {
                "id": 1000 + content_id,
                "provider": self.get_name(),
                "providerCode": self.get_identifier(),
                "streamUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                "playerType": "mp4",
                "quality": "1080p",
                "translationTitle": "Дубляж (Red Head Sound)",
            },
            {
                "id": 2000 + content_id,
                "provider": self.get_name(),
                "providerCode": self.get_identifier(),
                "streamUrl": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
                "playerType": "mp4",
                "quality": "720p",
                "translationTitle": "Оригинал (Субтитры)",
            },
        ]
