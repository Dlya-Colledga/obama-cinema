from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class CamelModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        alias_generator=to_camel,
    )


class PaginationMeta(CamelModel):
    page: int
    per_page: int
    total: int
    total_pages: int


class ApiResponse(CamelModel, Generic[T]):
    success: bool = True
    data: T
    meta: PaginationMeta | None = None


class ApiErrorDetail(CamelModel):
    code: str = "ERROR"
    message: str
    details: dict[str, list[str]] = Field(default_factory=dict)


class ApiErrorResponse(CamelModel):
    success: bool = False
    error: ApiErrorDetail


class MessageResponse(CamelModel):
    message: str
