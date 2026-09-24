from decimal import Decimal
from typing import Any
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.content import Content
from app.models.rating import Rating


class RatingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def upsert(
        self, user_id: int, content_id: int, rating_value: int
    ) -> dict[str, Any]:
        stmt = (
            insert(Rating)
            .values(user_id=user_id, content_id=content_id, rating=rating_value)
            .on_conflict_do_update(
                index_elements=["user_id", "content_id"],
                set_={"rating": rating_value},
            )
        )
        await self.session.execute(stmt)
        await self.session.flush()

        # Recalculate and update content cache in case DB triggers are not active (e.g. in test env)
        await self._sync_content_rating_cache(content_id)
        return await self.get_content_stats(content_id)

    async def delete(self, user_id: int, content_id: int) -> dict[str, Any]:
        stmt = delete(Rating).where(
            Rating.user_id == user_id, Rating.content_id == content_id
        )
        await self.session.execute(stmt)
        await self.session.flush()

        # Recalculate content cache
        await self._sync_content_rating_cache(content_id)
        return await self.get_content_stats(content_id)

    async def get_user_rating(self, user_id: int, content_id: int) -> int | None:
        stmt = select(Rating.rating).where(
            Rating.user_id == user_id, Rating.content_id == content_id
        )
        res = await self.session.execute(stmt)
        val = res.scalar()
        return int(val) if val is not None else None

    async def get_content_stats(self, content_id: int) -> dict[str, Any]:
        stmt = select(Content.rating_cache, Content.votes_count).where(
            Content.id == content_id
        )
        res = await self.session.execute(stmt)
        row = res.first()
        if not row:
            return {"ratingCache": 0.0, "votesCount": 0}
        return {
            "ratingCache": float(row[0]),
            "votesCount": int(row[1]),
        }

    async def _sync_content_rating_cache(self, content_id: int) -> None:
        # Calculate avg and count
        stat_stmt = select(
            func.coalesce(func.round(func.avg(Rating.rating), 1), 0.0),
            func.count(Rating.id),
        ).where(Rating.content_id == content_id)
        stat_res = await self.session.execute(stat_stmt)
        avg_rating, cnt = stat_res.one()

        upd = (
            update(Content)
            .where(Content.id == content_id)
            .values(
                rating_cache=Decimal(str(avg_rating)),
                votes_count=cnt,
            )
        )
        await self.session.execute(upd)
        await self.session.flush()
