from typing import Literal
from pydantic import field_validator
from app.schemas.catalog import ContentItemSchema
from app.schemas.common import CamelModel

VALID_BOOKMARK_CATEGORIES = {
    "watching",
    "plan_to_watch",
    "completed",
    "dropped",
    "favorite",
}


class BookmarkItemSchema(CamelModel):
    id: int
    category: str
    created_at: str
    content: ContentItemSchema


class SetBookmarkRequest(CamelModel):
    content_id: int
    category: str = "plan_to_watch"

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        if v not in VALID_BOOKMARK_CATEGORIES:
            raise ValueError("Недопустимая категория закладки")
        return v


class BookmarkResponse(CamelModel):
    content_id: int
    category: str
