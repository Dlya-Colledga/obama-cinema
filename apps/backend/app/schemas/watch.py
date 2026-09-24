from pydantic import model_validator

from app.schemas.catalog import ContentTypeSchema
from app.schemas.common import CamelModel


class EpisodeBriefSchema(CamelModel):
    id: int
    episode_number: int
    season_number: int | None = None
    title: str | None = None


class ContentBriefSchema(CamelModel):
    id: int
    title: str
    original_title: str | None = None
    slug: str
    poster_url: str
    banner_url: str | None = None
    release_year: int
    rating_cache: float = 0.0
    content_type: ContentTypeSchema | None = None


class WatchProgressRequest(CamelModel):
    content_id: int
    episode_id: int | None = None
    progress_seconds: int = 0
    duration_seconds: int = 0
    is_completed: bool = False

    @model_validator(mode="after")
    def compute_completion(self) -> "WatchProgressRequest":
        if not self.is_completed and self.duration_seconds > 0:
            if (self.progress_seconds / self.duration_seconds) >= 0.90:
                self.is_completed = True
        return self


class WatchProgressResponse(CamelModel):
    content_id: int
    episode_id: int | None = None
    progress_seconds: int
    duration_seconds: int
    is_completed: bool
    last_watched_at: str | None = None


class UnfinishedWatchItemSchema(CamelModel):
    content_id: int
    episode_id: int | None = None
    progress_seconds: int
    duration_seconds: int
    is_completed: bool
    last_watched_at: str
    episode: EpisodeBriefSchema | None = None
    content: ContentBriefSchema


class WatchHistoryItemSchema(CamelModel):
    id: int
    watched_at: str
    episode: EpisodeBriefSchema | None = None
    content: ContentBriefSchema
