from typing import Annotated
from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_bookmark_service, get_current_user
from app.models.user import User
from app.schemas.bookmark import (
    BookmarkItemSchema,
    BookmarkResponse,
    SetBookmarkRequest,
)
from app.schemas.common import ApiResponse, PaginationMeta
from app.services.bookmark import BookmarkService

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


@router.get("", response_model=ApiResponse[list[BookmarkItemSchema]])
async def get_bookmarks(
    current_user: Annotated[User, Depends(get_current_user)],
    bookmark_service: Annotated[BookmarkService, Depends(get_bookmark_service)],
    category: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=50),
) -> ApiResponse[list[BookmarkItemSchema]]:
    result = await bookmark_service.get_bookmarks(
        current_user, category=category, page=page, limit=limit
    )
    items = result.get("items", [])
    meta = PaginationMeta(**result.get("meta", {}))
    return ApiResponse(success=True, data=items, meta=meta)


@router.post("", response_model=ApiResponse[BookmarkResponse])
async def set_bookmark(
    dto: SetBookmarkRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    bookmark_service: Annotated[BookmarkService, Depends(get_bookmark_service)],
) -> ApiResponse[BookmarkResponse]:
    result = await bookmark_service.set_bookmark(
        current_user, content_id=dto.content_id, category=dto.category
    )
    return ApiResponse(success=True, data=result)


@router.delete("/{content_id}", response_model=ApiResponse[dict[str, str]])
async def remove_bookmark(
    content_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    bookmark_service: Annotated[BookmarkService, Depends(get_bookmark_service)],
) -> ApiResponse[dict[str, str]]:
    await bookmark_service.remove_bookmark(current_user, content_id)
    return ApiResponse(
        success=True, data={"message": "Успешно удалено из закладок"}
    )
