from typing import Annotated, Any

from fastapi import APIRouter, Depends

from app.api.dependencies import get_auth_service, get_current_user
from app.models.user import User
from app.schemas.common import ApiResponse
from app.schemas.user import UpdateProfileRequest, UserResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/profile", response_model=ApiResponse[UserResponse])
async def get_profile(
    current_user: Annotated[User, Depends(get_current_user)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> ApiResponse[Any]:
    result = await auth_service.get_me(current_user)
    return ApiResponse(success=True, data=result)


@router.put("/profile", response_model=ApiResponse[UserResponse])
async def update_profile(
    dto: UpdateProfileRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> ApiResponse[Any]:
    result = await auth_service.update_profile(current_user, dto)
    return ApiResponse(success=True, data=result)
