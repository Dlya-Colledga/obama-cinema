from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_current_user, get_watch_service
from app.models.user import User
from app.schemas.common import ApiResponse, PaginationMeta
from app.schemas.watch import (
    UnfinishedWatchItemSchema,
    WatchHistoryItemSchema,
    WatchProgressRequest,
    WatchProgressResponse,
)
from app.services.watch import WatchService

router = APIRouter(prefix="/watch", tags=["watch"])


@router.post("/progress", response_model=ApiResponse[WatchProgressResponse])
async def save_progress(
    dto: WatchProgressRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    watch_service: Annotated[WatchService, Depends(get_watch_service)],
) -> ApiResponse[Any]:
    result = await watch_service.save_progress(
        user=current_user,
        content_id=dto.content_id,
        episode_id=dto.episode_id,
        progress_seconds=dto.progress_seconds,
        duration_seconds=dto.duration_seconds,
        is_completed=dto.is_completed,
    )
    return ApiResponse(success=True, data=result)


@router.get(
    "/progress/{content_id}",
    response_model=ApiResponse[WatchProgressResponse | None],
)
async def get_progress(
    content_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    watch_service: Annotated[WatchService, Depends(get_watch_service)],
    episode_id: int | None = Query(None, alias="episode_id"),
    episode_id_camel: int | None = Query(None, alias="episodeId"),
) -> ApiResponse[Any]:
    effective_episode_id = episode_id if episode_id is not None else episode_id_camel
    progress = await watch_service.get_progress(
        user=current_user,
        content_id=content_id,
        episode_id=effective_episode_id,
    )
    return ApiResponse(success=True, data=progress)


@router.get("/unfinished", response_model=ApiResponse[list[UnfinishedWatchItemSchema]])
async def get_unfinished(
    current_user: Annotated[User, Depends(get_current_user)],
    watch_service: Annotated[WatchService, Depends(get_watch_service)],
    limit: int = Query(10, ge=1, le=20),
) -> ApiResponse[Any]:
    items = await watch_service.get_recent_unfinished(current_user, limit)
    return ApiResponse(success=True, data=items)


@router.get("/history", response_model=ApiResponse[list[WatchHistoryItemSchema]])
async def get_history(
    current_user: Annotated[User, Depends(get_current_user)],
    watch_service: Annotated[WatchService, Depends(get_watch_service)],
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=50),
) -> ApiResponse[Any]:
    result = await watch_service.get_history(current_user, page, limit)
    items = result.get("items", [])
    meta = PaginationMeta(**result.get("meta", {}))
    return ApiResponse(success=True, data=items, meta=meta)


@router.delete("/history", response_model=ApiResponse[dict[str, str]])
async def clear_history(
    current_user: Annotated[User, Depends(get_current_user)],
    watch_service: Annotated[WatchService, Depends(get_watch_service)],
    id: int | None = None,
) -> ApiResponse[Any]:
    await watch_service.clear_history(current_user, id)
    return ApiResponse(success=True, data={"message": "История просмотров обновлена"})
