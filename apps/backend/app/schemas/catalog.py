from pydantic import Field, model_validator

from app.schemas.common import CamelModel


class ContentTypeSchema(CamelModel):
    id: int | None = None
    code: str
    name: str


class GenreSchema(CamelModel):
    id: int
    slug: str
    name: str


class CountrySchema(CamelModel):
    id: int
    code: str
    name: str


class WatchProgressBriefSchema(CamelModel):
    content_id: int | None = None
    episode_id: int | None = None
    progress_seconds: int
    duration_seconds: int
    is_completed: bool
    last_watched_at: str


class ContentItemSchema(CamelModel):
    id: int
    content_type: ContentTypeSchema
    title: str
    original_title: str | None = None
    slug: str
    description: str
    poster_url: str
    banner_url: str | None = None
    release_year: int
    age_rating: str = "16+"
    duration_minutes: int | None = None
    rating_cache: float = 0.0
    votes_count: int = 0
    is_featured: bool = False
    genres: list[GenreSchema] = Field(default_factory=list)
    countries: list[CountrySchema] = Field(default_factory=list)
    user_rating: int | None = None
    user_bookmark: str | None = None
    user_progress: WatchProgressBriefSchema | None = None
    trailer_url: str | None = None
    trailer_youtube_id: str | None = None


class TaxonomiesResponse(CamelModel):
    types: list[ContentTypeSchema]
    genres: list[GenreSchema]
    countries: list[CountrySchema]


class CatalogFilterParams(CamelModel):
    type: str | None = None
    genre: str | None = None
    country: str | None = None
    year_from: int | None = None
    year_to: int | None = None
    rating_from: float | None = None
    min_rating: float | None = None
    sort: str = "rating"
    q: str | None = None
    page: int = 1
    limit: int = 24

    @model_validator(mode="after")
    def sync_ratings(self) -> "CatalogFilterParams":
        if self.min_rating is None and self.rating_from is not None:
            self.min_rating = self.rating_from
        elif self.rating_from is None and self.min_rating is not None:
            self.rating_from = self.min_rating
        return self
