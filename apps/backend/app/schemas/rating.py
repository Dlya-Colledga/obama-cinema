from pydantic import field_validator

from app.schemas.common import CamelModel


class RateContentRequest(CamelModel):
    rating: int
    content_id: int | None = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if v < 1 or v > 10:
            raise ValueError("Оценка должна быть целым числом от 1 до 10")
        return v


class RatingResponse(CamelModel):
    user_rating: int | None = None
    rating_cache: float = 0.0
    votes_count: int = 0
