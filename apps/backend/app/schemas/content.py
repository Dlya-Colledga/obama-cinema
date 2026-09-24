from pydantic import Field
from app.schemas.common import CamelModel


class EpisodeSchema(CamelModel):
    id: int
    season_id: int
    content_id: int
    episode_number: int
    title: str | None = None
    duration_minutes: int | None = None


class SeasonSchema(CamelModel):
    id: int
    content_id: int
    season_number: int
    title: str | None = None
    release_year: int | None = None
    episodes: list[EpisodeSchema] = Field(default_factory=list)


class StreamSourceSchema(CamelModel):
    id: int | str
    provider: str
    provider_code: str | None = None
    player_type: str  # 'iframe' | 'hls' | 'mp4'
    stream_url: str
    quality: str = "1080p"
    translation_title: str = "Оригинал / Дубляж"
