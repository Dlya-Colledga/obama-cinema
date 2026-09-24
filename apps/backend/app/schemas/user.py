from pydantic import Field
from app.schemas.common import CamelModel


class UserProfileResponse(CamelModel):
    avatar_url: str | None = None
    bio: str | None = None
    preferences: dict = Field(default_factory=dict)
    updated_at: str


class UserResponse(CamelModel):
    id: int
    email: str
    username: str
    role: str
    created_at: str
    profile: UserProfileResponse | None = None
    updated_at: str | None = None


class UpdateProfileRequest(CamelModel):
    avatar_url: str | None = None
    bio: str | None = None
    preferences: dict | None = None
