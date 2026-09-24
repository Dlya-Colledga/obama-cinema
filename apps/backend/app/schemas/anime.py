from pydantic import Field
from app.schemas.common import CamelModel


class AnimeReleaseSchema(CamelModel):
    id: int
    title: str
    title_ru: str | None = None
    title_original: str | None = None
    slug: str
    type: str = "anime"
    description: str = ""
    poster_url: str | None = None
    year: int | None = None
    country: str = "Япония"
    genres: list[str] = Field(default_factory=list)
    rating: float = 8.0
    grade5: float = 0.0
    votes_count: int = 0
    episodes_total: int = 0
    episodes_released: int = 0
    duration: int = 24
    season: int = 1
    studio: str = ""
    director: str = ""
    author: str = ""
    status: str = "Завершён"
    is_anime_api: bool = True
    screenshots: list[str] | None = None
    category: str | None = None
    age_rating: int | None = None
    source: str | None = None
    trailer_url: str | None = None
    trailer_youtube_id: str | None = None


class AnimeDubberSchema(CamelModel):
    id: int
    name: str
    icon: str | None = None
    workers: str | None = None
    is_sub: bool = False
    episodes_count: int = 0
    view_count: int = 0


class AnimeSourceSchema(CamelModel):
    id: int
    name: str
    episodes_count: int = 0
    quality: int = 0


class AnimeEpisodeItemSchema(CamelModel):
    position: int
    name: str
    url: str = ""
    iframe: bool = False
    is_filler: bool = False


class AnimeEpisodesResponseSchema(CamelModel):
    selected_dubber: AnimeDubberSchema | None = None
    selected_source: AnimeSourceSchema | None = None
    dubbers: list[AnimeDubberSchema] = Field(default_factory=list)
    sources: list[AnimeSourceSchema] = Field(default_factory=list)
    episodes: list[AnimeEpisodeItemSchema] = Field(default_factory=list)
