from typing import Any

from app.core.security import generate_token, hash_password, sanitize_text, verify_password
from app.exceptions import AuthenticationException, ConflictException
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest
from app.schemas.user import UpdateProfileRequest


class AuthService:
    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    async def register(
        self,
        dto: RegisterRequest,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        existing_email = await self.user_repo.find_by_email(dto.email)
        if existing_email:
            raise ConflictException("Пользователь с таким email уже зарегистрирован")

        existing_user = await self.user_repo.find_by_username(dto.username)
        if existing_user:
            raise ConflictException("Пользователь с таким именем уже существует")

        pw_hash = hash_password(dto.password)
        user = await self.user_repo.create(
            email=dto.email,
            username=dto.username,
            password_hash=pw_hash,
            role="user",
        )

        plain_token = generate_token()
        await self.user_repo.create_token(
            user_id=user.id,
            plain_token=plain_token,
            lifetime_days=30,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return {
            "token": plain_token,
            "user": self.format_user(user),
        }

    async def login(
        self,
        dto: LoginRequest,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, Any]:
        login_val = (dto.login or dto.email or dto.username or "").strip()
        if "@" in login_val:
            user = await self.user_repo.find_by_email(login_val)
        else:
            user = await self.user_repo.find_by_username(login_val)

        if not user or not verify_password(dto.password, user.password_hash):
            raise AuthenticationException("Неверный логин или пароль")

        plain_token = generate_token()
        await self.user_repo.create_token(
            user_id=user.id,
            plain_token=plain_token,
            lifetime_days=30,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return {
            "token": plain_token,
            "user": self.format_user(user),
        }

    async def logout(self, plain_token: str) -> None:
        await self.user_repo.delete_token(plain_token)

    async def get_me(self, user: User) -> dict[str, Any]:
        return self.format_user(user, include_private=True)

    async def update_profile(self, user: User, dto: UpdateProfileRequest) -> dict[str, Any]:
        bio = sanitize_text(dto.bio) if dto.bio is not None else None
        await self.user_repo.update_profile(
            user_id=user.id,
            avatar_url=dto.avatar_url,
            bio=bio,
            preferences=dto.preferences,
        )
        updated_user = await self.user_repo.find_by_id(user.id)
        return self.format_user(updated_user or user, include_private=True)

    @staticmethod
    def format_user(user: User, include_private: bool = False) -> dict[str, Any]:
        profile_data = None
        if user.profile:
            profile_data = {
                "avatarUrl": user.profile.avatar_url,
                "bio": user.profile.bio,
                "preferences": user.profile.preferences or {},
                "updatedAt": user.profile.updated_at.isoformat()
                if hasattr(user.profile.updated_at, "isoformat")
                else str(user.profile.updated_at),
            }

        data: dict[str, Any] = {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "role": user.role,
            "createdAt": user.created_at.isoformat()
            if hasattr(user.created_at, "isoformat")
            else str(user.created_at),
            "profile": profile_data,
        }
        if include_private:
            data["updatedAt"] = (
                user.updated_at.isoformat()
                if hasattr(user.updated_at, "isoformat")
                else str(user.updated_at)
            )
        return data
