from typing import Annotated
from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_catalog_service, get_optional_current_user
from app.models.user import User
from app.schemas.catalog import ContentItemSchema
from app.schemas.common import ApiResponse
from app.schemas.content import SeasonSchema, StreamSourceSchema
from app.services.catalog import CatalogService

router = APIRouter(prefix="/content", tags=["content"])


@router.get("/{identifier}", response_model=ApiResponse[ContentItemSchema])
async def get_content(
    identifier: str,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> ApiResponse[ContentItemSchema]:
    user_id = current_user.id if current_user else None
    content = await catalog_service.get_content(identifier, user_id=user_id)
    return ApiResponse(success=True, data=content)


@router.get("/{content_id}/seasons", response_model=ApiResponse[list[SeasonSchema]])
async def get_seasons(
    content_id: int,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
) -> ApiResponse[list[SeasonSchema]]:
    seasons = await catalog_service.get_seasons(content_id)
    return ApiResponse(success=True, data=seasons)


@router.get("/{content_id}/sources", response_model=ApiResponse[list[StreamSourceSchema]])
async def get_sources(
    content_id: int,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
    episode_id: int | None = Query(None, alias="episodeId"),
    episode: int | None = None,
    season: int | None = None,
    dubber_id: int | None = Query(None, alias="dubberId"),
    source_id: int | None = Query(None, alias="sourceId"),
) -> ApiResponse[list[StreamSourceSchema]]:
    effective_episode = episode_id if episode_id is not None else episode
    sources = await catalog_service.get_streams(
        content_id=content_id,
        episode_id=effective_episode,
        dubber_id=dubber_id,
        source_id=source_id,
    )
    return ApiResponse(success=True, data=sources)
