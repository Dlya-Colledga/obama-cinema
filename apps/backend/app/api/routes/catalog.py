from typing import Annotated, Any

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_catalog_service, get_optional_current_user
from app.models.user import User
from app.schemas.catalog import (
    CatalogFilterParams,
    ContentItemSchema,
    TaxonomiesResponse,
)
from app.schemas.common import ApiResponse, PaginationMeta
from app.services.catalog import CatalogService

router = APIRouter(tags=["catalog"])


@router.get("/catalog", response_model=ApiResponse[list[ContentItemSchema]])
async def get_catalog(
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
    q: str | None = None,
    type: str | None = None,
    types: str | None = None,
    genre: str | None = None,
    genres: str | None = None,
    country: str | None = None,
    countries: str | None = None,
    year_from: int | None = Query(None, alias="yearFrom"),
    year_to: int | None = Query(None, alias="yearTo"),
    rating_from: float | None = Query(None, alias="ratingFrom"),
    sort: str = "rating",
    page: int = 1,
    limit: int = 24,
) -> ApiResponse[list[ContentItemSchema]]:
    effective_type = type or types
    effective_genre = genre or genres
    effective_country = country or countries

    params = CatalogFilterParams(
        type=effective_type,
        genre=effective_genre,
        country=effective_country,
        year_from=year_from,
        year_to=year_to,
        rating_from=rating_from,
        sort=sort,
        q=q,
        page=page,
        limit=limit,
    )

    user_id = current_user.id if current_user else None
    result = await catalog_service.get_catalog(params, user_id=user_id)
    items = result.get("items", [])
    meta = PaginationMeta(**result.get("meta", {}))

    return ApiResponse(success=True, data=items, meta=meta)


@router.get("/catalog/featured", response_model=ApiResponse[list[ContentItemSchema]])
async def get_featured(
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
    current_user: Annotated[User | None, Depends(get_optional_current_user)] = None,
) -> ApiResponse[Any]:
    user_id = current_user.id if current_user else None
    items = await catalog_service.get_featured(user_id=user_id)
    return ApiResponse(success=True, data=items)


@router.get("/filters/meta", response_model=ApiResponse[TaxonomiesResponse])
async def get_taxonomies(
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
) -> ApiResponse[Any]:
    taxonomies = await catalog_service.get_taxonomies()
    return ApiResponse(success=True, data=taxonomies)
