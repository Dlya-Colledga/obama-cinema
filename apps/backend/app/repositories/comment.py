from datetime import datetime, timezone
import math
from typing import Any
from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.comment import Comment
from app.models.user import User


class CommentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def find_by_content(
        self, content_id: int, page: int = 1, limit: int = 20
    ) -> dict[str, Any]:
        count_stmt = select(func.count(Comment.id)).where(
            Comment.content_id == content_id
        )
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar_one()

        offset = (page - 1) * limit
        stmt = (
            select(Comment)
            .options(selectinload(Comment.user).selectinload(User.profile))
            .where(Comment.content_id == content_id)
            .order_by(Comment.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        comments = res.scalars().all()

        items = [self._format_comment(c) for c in comments]
        total_pages = math.ceil(total / max(1, limit))

        return {
            "items": items,
            "meta": {
                "page": page,
                "perPage": limit,
                "total": total,
                "totalPages": total_pages,
            },
        }

    async def find_by_id(self, comment_id: int) -> dict[str, Any] | None:
        stmt = (
            select(Comment)
            .options(selectinload(Comment.user).selectinload(User.profile))
            .where(Comment.id == comment_id)
        )
        res = await self.session.execute(stmt)
        comment = res.scalars().first()
        return self._format_comment(comment) if comment else None

    async def create(
        self,
        user_id: int,
        content_id: int,
        text_content: str,
        parent_id: int | None = None,
    ) -> dict[str, Any]:
        comment = Comment(
            user_id=user_id,
            content_id=content_id,
            parent_id=parent_id,
            text=text_content,
            is_edited=False,
        )
        self.session.add(comment)
        await self.session.flush()
        return await self.find_by_id(comment.id)  # type: ignore

    async def update(self, comment_id: int, text_content: str) -> dict[str, Any] | None:
        stmt = (
            update(Comment)
            .where(Comment.id == comment_id)
            .values(
                text=text_content,
                is_edited=True,
                updated_at=datetime.now(timezone.utc),
            )
        )
        await self.session.execute(stmt)
        return await self.find_by_id(comment_id)

    async def delete(self, comment_id: int) -> None:
        stmt = delete(Comment).where(Comment.id == comment_id)
        await self.session.execute(stmt)

    def _format_comment(self, comment: Comment) -> dict[str, Any]:
        avatar_url = (
            comment.user.profile.avatar_url
            if comment.user and comment.user.profile
            else None
        )
        return {
            "id": comment.id,
            "contentId": comment.content_id,
            "parentId": comment.parent_id,
            "text": comment.text,
            "content": comment.text,
            "isEdited": comment.is_edited,
            "createdAt": comment.created_at.isoformat()
            if hasattr(comment.created_at, "isoformat")
            else str(comment.created_at),
            "updatedAt": comment.updated_at.isoformat()
            if hasattr(comment.updated_at, "isoformat")
            else str(comment.updated_at),
            "user": {
                "id": comment.user.id,
                "username": comment.user.username,
                "role": comment.user.role,
                "avatarUrl": avatar_url,
            },
        }
