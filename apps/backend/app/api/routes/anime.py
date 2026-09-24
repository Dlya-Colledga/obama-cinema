from typing import Annotated, Any
from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_anime_service
from app.schemas.anime import (
    AnimeDubberSchema,
    AnimeEpisodesResponseSchema,
    AnimeReleaseSchema,
)
from app.schemas.common import ApiResponse
from app.schemas.content import StreamSourceSchema
from app.services.anime import AnimeService

router = APIRouter(prefix="/anime", tags=["anime"])


@router.get("/search")
async def search_anime(
    anime_service: Annotated[AnimeService, Depends(get_anime_service)],
    q: str = "",
    page: int = 0,
) -> ApiResponse[dict[str, Any]]:
    result = await anime_service.search(query=q, page=page)
    return ApiResponse(success=True, data=result)


@router.get("/popular")
async def popular_anime(
    anime_service: Annotated[AnimeService, Depends(get_anime_service)],
    page: int = 0,
) -> ApiResponse[dict[str, Any]]:
    result = await anime_service.get_popular(page=page)
    return ApiResponse(success=True, data=result)


@router.get("/{id}/dubbers", response_model=ApiResponse[list[AnimeDubberSchema]])
async def get_anime_dubbers(
    id: int,
    anime_service: Annotated[AnimeService, Depends(get_anime_service)],
) -> ApiResponse[list[AnimeDubberSchema]]:
    dubbers = await anime_service.get_dubbers(id)
    return ApiResponse(success=True, data=dubbers)


@router.get("/{id}/episodes", response_model=ApiResponse[AnimeEpisodesResponseSchema])
async def get_anime_episodes(
    id: int,
    anime_service: Annotated[AnimeService, Depends(get_anime_service)],
    dubber_id: int | None = Query(None, alias="dubber_id"),
    dubber_id_camel: int | None = Query(None, alias="dubberId"),
    source_id: int | None = Query(None, alias="source_id"),
    source_id_camel: int | None = Query(None, alias="sourceId"),
) -> ApiResponse[AnimeEpisodesResponseSchema]:
    eff_dubber = dubber_id if dubber_id is not None else dubber_id_camel
    eff_source = source_id if source_id is not None else source_id_camel
    episodes = await anime_service.get_episodes(
        release_id=id, dubber_id=eff_dubber, source_id=eff_source
    )
    return ApiResponse(success=True, data=episodes)


@router.get("/{id}/streams", response_model=ApiResponse[list[StreamSourceSchema]])
async def get_anime_streams(
    id: int,
    anime_service: Annotated[AnimeService, Depends(get_anime_service)],
    position: int = Query(1, ge=1),
    episode: int | None = None,
    dubber_id: int | None = Query(None, alias="dubber_id"),
    dubber_id_camel: int | None = Query(None, alias="dubberId"),
    source_id: int | None = Query(None, alias="source_id"),
    source_id_camel: int | None = Query(None, alias="sourceId"),
) -> ApiResponse[list[StreamSourceSchema]]:
    eff_pos = episode if episode is not None else position
    eff_dubber = dubber_id if dubber_id is not None else dubber_id_camel
    eff_source = source_id if source_id is not None else source_id_camel
    streams = await anime_service.get_episode_streams(
        release_id=id,
        position=eff_pos,
        dubber_id=eff_dubber,
        source_id=eff_source,
    )
    return ApiResponse(success=True, data=streams)


@router.get("/{id}", response_model=ApiResponse[AnimeReleaseSchema])
async def get_anime_release(
    id: int,
    anime_service: Annotated[AnimeService, Depends(get_anime_service)],
) -> ApiResponse[AnimeReleaseSchema]:
    release = await anime_service.get_release(id)
    return ApiResponse(success=True, data=release)
