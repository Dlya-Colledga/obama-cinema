from typing import Annotated
from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies import get_comment_service, get_current_user
from app.models.user import User
from app.schemas.comment import (
    CommentSchema,
    CreateCommentRequest,
    UpdateCommentRequest,
)
from app.schemas.common import ApiResponse, PaginationMeta
from app.services.comment import CommentService

router = APIRouter(tags=["comments"])


@router.get(
    "/content/{content_id}/comments",
    response_model=ApiResponse[list[CommentSchema]],
)
async def get_comments(
    content_id: int,
    comment_service: Annotated[CommentService, Depends(get_comment_service)],
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
) -> ApiResponse[list[CommentSchema]]:
    result = await comment_service.get_comments(content_id, page, limit)
    items = result.get("items", [])
    meta = PaginationMeta(**result.get("meta", {}))
    return ApiResponse(success=True, data=items, meta=meta)


@router.post(
    "/content/{content_id}/comments",
    response_model=ApiResponse[CommentSchema],
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    content_id: int,
    dto: CreateCommentRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    comment_service: Annotated[CommentService, Depends(get_comment_service)],
) -> ApiResponse[CommentSchema]:
    text_content = dto.text or dto.content or ""
    comment = await comment_service.create_comment(
        user=current_user,
        content_id=content_id,
        text_content=text_content,
        parent_id=dto.parent_id,
    )
    return ApiResponse(success=True, data=comment)


@router.put("/comments/{comment_id}", response_model=ApiResponse[CommentSchema])
async def update_comment(
    comment_id: int,
    dto: UpdateCommentRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    comment_service: Annotated[CommentService, Depends(get_comment_service)],
) -> ApiResponse[CommentSchema]:
    text_content = dto.text or dto.content or ""
    comment = await comment_service.update_comment(
        user=current_user,
        comment_id=comment_id,
        text_content=text_content,
    )
    return ApiResponse(success=True, data=comment)


@router.delete("/comments/{comment_id}", response_model=ApiResponse[dict[str, str]])
async def delete_comment(
    comment_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    comment_service: Annotated[CommentService, Depends(get_comment_service)],
) -> ApiResponse[dict[str, str]]:
    await comment_service.delete_comment(current_user, comment_id)
    return ApiResponse(
        success=True, data={"message": "Комментарий успешно удалён"}
    )
