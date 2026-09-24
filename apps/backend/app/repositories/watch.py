from datetime import datetime, timezone
import math
from typing import Any
from sqlalchemy import and_, delete, desc, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.content import Content
from app.models.episode import Episode, Season
from app.models.watch import WatchHistory, WatchProgress


class WatchRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def upsert_progress(
        self,
        user_id: int,
        content_id: int,
        episode_id: int | None,
        progress_seconds: int,
        duration_seconds: int,
        is_completed: bool,
    ) -> None:
        now = datetime.now(timezone.utc)

        # Upsert progress
        stmt = (
            insert(WatchProgress)
            .values(
                user_id=user_id,
                content_id=content_id,
                episode_id=episode_id,
                progress_seconds=progress_seconds,
                duration_seconds=duration_seconds,
                is_completed=is_completed,
                last_watched_at=now,
            )
            .on_conflict_do_update(
                index_elements=["user_id", "content_id", "episode_id"],
                set_={
                    "progress_seconds": progress_seconds,
                    "duration_seconds": duration_seconds,
                    "is_completed": is_completed,
                    "last_watched_at": now,
                },
            )
        )
        await self.session.execute(stmt)

        # Append to watch history log
        history_item = WatchHistory(
            user_id=user_id,
            content_id=content_id,
            episode_id=episode_id,
            watched_at=now,
        )
        self.session.add(history_item)
        await self.session.flush()

    async def get_progress(
        self, user_id: int, content_id: int, episode_id: int | None = None
    ) -> dict[str, Any] | None:
        conditions = [
            WatchProgress.user_id == user_id,
            WatchProgress.content_id == content_id,
        ]
        if episode_id is not None:
            conditions.append(WatchProgress.episode_id == episode_id)

        stmt = (
            select(WatchProgress)
            .where(and_(*conditions))
            .order_by(desc(WatchProgress.last_watched_at))
            .limit(1)
        )
        res = await self.session.execute(stmt)
        item = res.scalars().first()
        if not item:
            return None

        return {
            "contentId": item.content_id,
            "episodeId": item.episode_id,
            "progressSeconds": item.progress_seconds,
            "durationSeconds": item.duration_seconds,
            "isCompleted": item.is_completed,
            "lastWatchedAt": item.last_watched_at.isoformat()
            if hasattr(item.last_watched_at, "isoformat")
            else str(item.last_watched_at),
        }

    async def get_recent_unfinished(
        self, user_id: int, limit: int = 10
    ) -> list[dict[str, Any]]:
        stmt = (
            select(WatchProgress)
            .options(
                selectinload(WatchProgress.content).selectinload(Content.content_type),
                selectinload(WatchProgress.episode).selectinload(Episode.season),
            )
            .where(
                WatchProgress.user_id == user_id,
                WatchProgress.is_completed == False,  # noqa: E712
                WatchProgress.progress_seconds > 30,
            )
            .order_by(desc(WatchProgress.last_watched_at))
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        rows = res.scalars().all()

        items = []
        for r in rows:
            c = r.content
            ep = r.episode
            items.append(
                {
                    "contentId": c.id,
                    "episodeId": r.episode_id,
                    "progressSeconds": r.progress_seconds,
                    "durationSeconds": r.duration_seconds,
                    "isCompleted": r.is_completed,
                    "lastWatchedAt": r.last_watched_at.isoformat()
                    if hasattr(r.last_watched_at, "isoformat")
                    else str(r.last_watched_at),
                    "episode": {
                        "id": ep.id,
                        "episodeNumber": ep.episode_number,
                        "seasonNumber": ep.season.season_number if ep and ep.season else 1,
                        "title": ep.title,
                    }
                    if ep
                    else None,
                    "content": {
                        "id": c.id,
                        "title": c.title,
                        "originalTitle": c.original_title,
                        "slug": c.slug,
                        "posterUrl": c.poster_url,
                        "bannerUrl": c.banner_url,
                        "releaseYear": c.release_year,
                        "ratingCache": float(c.rating_cache),
                        "contentType": {
                            "id": c.content_type.id if c.content_type else 1,
                            "code": c.content_type.code if c.content_type else "movie",
                            "name": c.content_type.name if c.content_type else "Фильмы",
                        },
                    },
                }
            )
        return items

    async def get_history(
        self, user_id: int, page: int = 1, limit: int = 24
    ) -> dict[str, Any]:
        count_stmt = select(func.count(WatchHistory.id)).where(
            WatchHistory.user_id == user_id
        )
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar_one()

        offset = (page - 1) * limit
        stmt = (
            select(WatchHistory)
            .options(
                selectinload(WatchHistory.content).selectinload(Content.content_type),
                selectinload(WatchHistory.episode).selectinload(Episode.season),
            )
            .where(WatchHistory.user_id == user_id)
            .order_by(desc(WatchHistory.watched_at))
            .offset(offset)
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        rows = res.scalars().all()

        items = []
        for r in rows:
            c = r.content
            ep = r.episode
            items.append(
                {
                    "id": r.id,
                    "watchedAt": r.watched_at.isoformat()
                    if hasattr(r.watched_at, "isoformat")
                    else str(r.watched_at),
                    "episode": {
                        "id": ep.id,
                        "episodeNumber": ep.episode_number,
                        "seasonNumber": ep.season.season_number if ep and ep.season else 1,
                        "title": ep.title,
                    }
                    if ep
                    else None,
                    "content": {
                        "id": c.id,
                        "title": c.title,
                        "originalTitle": c.original_title,
                        "slug": c.slug,
                        "posterUrl": c.poster_url,
                        "bannerUrl": c.banner_url,
                        "releaseYear": c.release_year,
                        "ratingCache": float(c.rating_cache),
                        "contentType": {
                            "id": c.content_type.id if c.content_type else 1,
                            "code": c.content_type.code if c.content_type else "movie",
                            "name": c.content_type.name if c.content_type else "Фильмы",
                        },
                    },
                }
            )

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

    async def clear_history(
        self, user_id: int, history_id: int | None = None
    ) -> None:
        if history_id is not None:
            stmt = delete(WatchHistory).where(
                WatchHistory.user_id == user_id, WatchHistory.id == history_id
            )
        else:
            stmt = delete(WatchHistory).where(WatchHistory.user_id == user_id)
        await self.session.execute(stmt)
