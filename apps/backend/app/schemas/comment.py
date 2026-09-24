from pydantic import computed_field, model_validator
from app.schemas.common import CamelModel


class CommentUserSchema(CamelModel):
    id: int
    username: str
    role: str
    avatar_url: str | None = None


class CommentSchema(CamelModel):
    id: int
    content_id: int
    parent_id: int | None = None
    text: str
    is_edited: bool = False
    created_at: str
    updated_at: str
    user: CommentUserSchema

    @computed_field
    @property
    def content(self) -> str:
        # Compatibility property if accessed as content
        return self.text


class CreateCommentRequest(CamelModel):
    text: str | None = None
    content: str | None = None
    parent_id: int | None = None

    @model_validator(mode="after")
    def resolve_text(self) -> "CreateCommentRequest":
        effective = (self.text or self.content or "").strip()
        if len(effective) < 2:
            raise ValueError("Комментарий не может быть короче 2 символов")
        if len(effective) > 3000:
            raise ValueError("Комментарий не может превышать 3000 символов")
        self.text = effective
        return self


class UpdateCommentRequest(CamelModel):
    text: str | None = None
    content: str | None = None

    @model_validator(mode="after")
    def resolve_text(self) -> "UpdateCommentRequest":
        effective = (self.text or self.content or "").strip()
        if len(effective) < 2:
            raise ValueError("Комментарий не может быть короче 2 символов")
        if len(effective) > 3000:
            raise ValueError("Комментарий не может превышать 3000 символов")
        self.text = effective
        return self
