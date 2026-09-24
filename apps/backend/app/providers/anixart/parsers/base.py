from typing import Protocol


class ParserInterface(Protocol):
    def supports(self, url: str, source_name: str = "") -> bool:
        ...

    async def parse(self, url: str) -> dict[str, list[str]]:
        ...
