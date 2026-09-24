from typing import Annotated
from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user, get_rating_service
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.rating import RateContentRequest, RatingResponse
from app.services.rating import RatingService

router = APIRouter(tags=["ratings"])


@router.post(
    "/content/{content_id}/ratings",
    response_model=ApiResponse[RatingResponse],
)
async def rate_content_path(
    content_id: int,
    dto: RateContentRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    rating_service: Annotated[RatingService, Depends(get_rating_service)],
) -> ApiResponse[RatingResponse]:
    result = await rating_service.rate(current_user, content_id, dto.rating)
    return ApiResponse(success=True, data=result)


@router.delete(
    "/content/{content_id}/ratings",
    response_model=ApiResponse[RatingResponse],
)
async def delete_content_rating_path(
    content_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    rating_service: Annotated[RatingService, Depends(get_rating_service)],
) -> ApiResponse[RatingResponse]:
    result = await rating_service.remove_rate(current_user, content_id)
    return ApiResponse(success=True, data=result)


@router.post(
    "/ratings",
    response_model=ApiResponse[RatingResponse],
)
async def rate_content_body(
    dto: RateContentRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    rating_service: Annotated[RatingService, Depends(get_rating_service)],
) -> ApiResponse[RatingResponse]:
    content_id = dto.content_id or 0
    result = await rating_service.rate(current_user, content_id, dto.rating)
    return ApiResponse(success=True, data=result)


@router.delete(
    "/ratings/{content_id}",
    response_model=ApiResponse[RatingResponse],
)
async def delete_content_rating(
    content_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    rating_service: Annotated[RatingService, Depends(get_rating_service)],
) -> ApiResponse[RatingResponse]:
    result = await rating_service.remove_rate(current_user, content_id)
    return ApiResponse(success=True, data=result)
