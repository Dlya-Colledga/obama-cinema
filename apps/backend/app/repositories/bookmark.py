import math
from typing import Any
from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.bookmark import Bookmark
from app.models.content import Content
from app.models.rating import Rating


class BookmarkRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_user_bookmarks(
        self,
        user_id: int,
        category: str | None = None,
        page: int = 1,
        limit: int = 24,
    ) -> dict[str, Any]:
        conditions = [Bookmark.user_id == user_id]
        if category:
            conditions.append(Bookmark.category == category)

        where_clause = and_(*conditions)

        count_stmt = select(func.count(Bookmark.id)).where(where_clause)
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar_one()

        offset = (page - 1) * limit

        stmt = (
            select(Bookmark)
            .options(
                selectinload(Bookmark.content).selectinload(Content.content_type),
                selectinload(Bookmark.content).selectinload(Content.genres),
                selectinload(Bookmark.content).selectinload(Content.countries),
            )
            .where(where_clause)
            .order_by(Bookmark.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        bookmarks = res.scalars().all()

        items = []
        for b in bookmarks:
            c = b.content
            # Query user rating if any
            r_stmt = select(Rating.rating).where(
                Rating.user_id == user_id, Rating.content_id == c.id
            )
            r_res = await self.session.execute(r_stmt)
            r_val = r_res.scalar()

            items.append(
                {
                    "id": b.id,
                    "category": b.category,
                    "createdAt": b.created_at.isoformat()
                    if hasattr(b.created_at, "isoformat")
                    else str(b.created_at),
                    "content": {
                        "id": c.id,
                        "contentType": {
                            "id": c.content_type.id,
                            "code": c.content_type.code,
                            "name": c.content_type.name,
                        }
                        if c.content_type
                        else {"id": 1, "code": "movie", "name": "Фильмы"},
                        "title": c.title,
                        "originalTitle": c.original_title,
                        "slug": c.slug,
                        "description": c.description,
                        "posterUrl": c.poster_url,
                        "bannerUrl": c.banner_url,
                        "releaseYear": c.release_year,
                        "ageRating": c.age_rating,
                        "durationMinutes": c.duration_minutes,
                        "ratingCache": float(c.rating_cache),
                        "votesCount": c.votes_count,
                        "isFeatured": c.is_featured,
                        "genres": [
                            {"id": g.id, "slug": g.slug, "name": g.name}
                            for g in c.genres
                        ],
                        "countries": [
                            {"id": cnt.id, "code": cnt.code, "name": cnt.name}
                            for cnt in c.countries
                        ],
                        "userRating": int(r_val) if r_val is not None else None,
                        "userBookmark": b.category,
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

    async def set_category(
        self, user_id: int, content_id: int, category: str
    ) -> None:
        # Delete existing bookmark for this content
        del_stmt = delete(Bookmark).where(
            Bookmark.user_id == user_id, Bookmark.content_id == content_id
        )
        await self.session.execute(del_stmt)

        # Insert new bookmark
        bookmark = Bookmark(
            user_id=user_id, content_id=content_id, category=category
        )
        self.session.add(bookmark)
        await self.session.flush()

    async def remove(self, user_id: int, content_id: int) -> None:
        del_stmt = delete(Bookmark).where(
            Bookmark.user_id == user_id, Bookmark.content_id == content_id
        )
        await self.session.execute(del_stmt)

    async def get_user_bookmark(
        self, user_id: int, content_id: int
    ) -> str | None:
        stmt = select(Bookmark.category).where(
            Bookmark.user_id == user_id, Bookmark.content_id == content_id
        )
        res = await self.session.execute(stmt)
        val = res.scalar()
        return str(val) if val is not None else None
