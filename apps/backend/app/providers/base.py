from typing import Any, Protocol


class ContentProvider(Protocol):
    def get_identifier(self) -> str:
        ...

    def get_name(self) -> str:
        ...

    def supports(self, content_type: str) -> bool:
        ...

    async def get_streams(
        self, content_id: int, episode_id: int | None = None
    ) -> list[dict[str, Any]]:
        ...
