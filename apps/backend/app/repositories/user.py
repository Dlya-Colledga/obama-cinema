from datetime import datetime, timedelta, timezone
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_token
from app.models.user import Profile, User, UserToken


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def find_by_id(self, user_id: int) -> User | None:
        stmt = (
            select(User)
            .options(selectinload(User.profile))
            .where(User.id == user_id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def find_by_email(self, email: str) -> User | None:
        stmt = (
            select(User)
            .options(selectinload(User.profile))
            .where(func.lower(User.email) == email.lower().strip())
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def find_by_username(self, username: str) -> User | None:
        stmt = (
            select(User)
            .options(selectinload(User.profile))
            .where(func.lower(User.username) == username.lower().strip())
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def find_by_token(self, plain_token: str) -> User | None:
        hashed = hash_token(plain_token)
        now = datetime.now(timezone.utc)
        stmt = (
            select(User)
            .join(UserToken, UserToken.user_id == User.id)
            .options(selectinload(User.profile))
            .where(UserToken.token_hash == hashed, UserToken.expires_at > now)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create(
        self,
        email: str,
        username: str,
        password_hash: str,
        role: str = "user",
    ) -> User:
        user = User(
            email=email.strip(),
            username=username.strip(),
            password_hash=password_hash,
            role=role,
        )
        self.session.add(user)
        await self.session.flush()

        profile = Profile(
            user_id=user.id,
            avatar_url=None,
            bio=None,
            preferences={},
        )
        self.session.add(profile)
        await self.session.flush()
        await self.session.refresh(user, attribute_names=["profile"])
        return user

    async def create_token(
        self,
        user_id: int,
        plain_token: str,
        lifetime_days: int = 30,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> UserToken:
        hashed = hash_token(plain_token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=lifetime_days)
        token = UserToken(
            user_id=user_id,
            token_hash=hashed,
            ip_address=ip_address,
            user_agent=user_agent[:255] if user_agent else None,
            expires_at=expires_at,
        )
        self.session.add(token)
        await self.session.flush()
        return token

    async def delete_token(self, plain_token: str) -> None:
        hashed = hash_token(plain_token)
        stmt = delete(UserToken).where(UserToken.token_hash == hashed)
        await self.session.execute(stmt)

    async def update_profile(
        self,
        user_id: int,
        avatar_url: str | None = None,
        bio: str | None = None,
        preferences: dict | None = None,
    ) -> Profile | None:
        # Check if profile exists
        stmt = select(Profile).where(Profile.user_id == user_id)
        res = await self.session.execute(stmt)
        profile = res.scalars().first()

        if profile is None:
            profile = Profile(
                user_id=user_id,
                avatar_url=avatar_url,
                bio=bio,
                preferences=preferences or {},
            )
            self.session.add(profile)
        else:
            if avatar_url is not None:
                profile.avatar_url = avatar_url
            if bio is not None:
                profile.bio = bio
            if preferences is not None:
                profile.preferences = preferences
            profile.updated_at = datetime.now(timezone.utc)

        await self.session.flush()
        return profile

    async def update_password(self, user_id: int, password_hash: str) -> None:
        stmt = (
            update(User)
            .where(User.id == user_id)
            .values(password_hash=password_hash, updated_at=datetime.now(timezone.utc))
        )
        await self.session.execute(stmt)
