from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, status

from app.api.dependencies import (
    extract_bearer_token,
    get_auth_service,
    get_current_user,
)
from app.models.user import User
from app.schemas.auth import AuthResponse, LoginRequest, RegisterRequest
from app.schemas.common import ApiResponse
from app.schemas.user import UserResponse
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=ApiResponse[AuthResponse],
    status_code=status.HTTP_201_CREATED,
)
async def register(
    dto: RegisterRequest,
    request: Request,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> ApiResponse[Any]:
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    result = await auth_service.register(dto, ip_address=ip, user_agent=user_agent)
    return ApiResponse(success=True, data=result)


@router.post("/login", response_model=ApiResponse[AuthResponse])
async def login(
    dto: LoginRequest,
    request: Request,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> ApiResponse[Any]:
    ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    result = await auth_service.login(dto, ip_address=ip, user_agent=user_agent)
    return ApiResponse(success=True, data=result)


@router.post("/logout", response_model=ApiResponse[dict[str, str]])
async def logout(
    token: Annotated[str | None, Depends(extract_bearer_token)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ApiResponse[Any]:
    if token:
        await auth_service.logout(token)
    return ApiResponse(success=True, data={"message": "Успешный выход"})


@router.get("/me", response_model=ApiResponse[UserResponse])
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
) -> ApiResponse[Any]:
    result = await auth_service.get_me(current_user)
    return ApiResponse(success=True, data=result)
