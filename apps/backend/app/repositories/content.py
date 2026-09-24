import math
import re
from typing import Any

from sqlalchemy import (
    and_,
    asc,
    desc,
    func,
    or_,
    select,
    text,
    true,
)
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.content import Content
from app.models.episode import Episode, Season
from app.models.provider import Provider, ProviderSource
from app.models.taxonomy import (
    ContentType,
    Country,
    Genre,
)
from app.schemas.catalog import CatalogFilterParams


class ContentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def find_filtered(
        self, filter_params: CatalogFilterParams, current_user_id: int | None = None
    ) -> dict[str, Any]:
        conditions = []

        if filter_params.type:
            conditions.append(Content.content_type.has(ContentType.code == filter_params.type))

        if filter_params.genre:
            conditions.append(Content.genres.any(Genre.slug == filter_params.genre))

        if filter_params.country:
            conditions.append(Content.countries.any(Country.code == filter_params.country))

        if filter_params.year_from is not None:
            conditions.append(Content.release_year >= filter_params.year_from)

        if filter_params.year_to is not None:
            conditions.append(Content.release_year <= filter_params.year_to)

        if filter_params.min_rating is not None:
            conditions.append(Content.rating_cache >= filter_params.min_rating)

        if filter_params.q and filter_params.q.strip():
            query_str = filter_params.q.strip()
            like_pattern = f"%{query_str}%"
            conditions.append(
                or_(
                    Content.title.ilike(like_pattern),
                    Content.original_title.ilike(like_pattern),
                    text("contents.search_vector @@ plainto_tsquery('russian', :q_fts)").bindparams(
                        q_fts=query_str
                    ),
                )
            )

        where_clause = and_(*conditions) if conditions else true()

        # Total count
        count_stmt = select(func.count(Content.id)).where(where_clause)
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar_one()

        # Sorting
        order_by: list[Any]
        if filter_params.sort == "rating":
            order_by = [desc(Content.rating_cache), desc(Content.votes_count)]
        elif filter_params.sort == "newest":
            order_by = [desc(Content.release_year), desc(Content.created_at)]
        elif filter_params.sort == "popular":
            order_by = [desc(Content.votes_count), desc(Content.rating_cache)]
        elif filter_params.sort == "title":
            order_by = [asc(Content.title)]
        else:
            order_by = [desc(Content.rating_cache)]

        offset = (filter_params.page - 1) * filter_params.limit

        stmt = (
            select(Content)
            .options(
                selectinload(Content.content_type),
                selectinload(Content.genres),
                selectinload(Content.countries),
            )
            .where(where_clause)
            .order_by(*order_by)
            .offset(offset)
            .limit(filter_params.limit)
        )
        items_res = await self.session.execute(stmt)
        contents = items_res.scalars().all()

        items = []
        for c in contents:
            item = await self._format_content(c, current_user_id)
            items.append(item)

        total_pages = math.ceil(total / max(1, filter_params.limit))
        return {
            "items": items,
            "meta": {
                "page": filter_params.page,
                "perPage": filter_params.limit,
                "total": total,
                "totalPages": total_pages,
            },
        }

    async def find_featured(self, current_user_id: int | None = None) -> list[dict[str, Any]]:
        stmt = (
            select(Content)
            .options(
                selectinload(Content.content_type),
                selectinload(Content.genres),
                selectinload(Content.countries),
            )
            .where(or_(Content.is_featured == True, Content.rating_cache >= 8.5))  # noqa: E712
            .order_by(desc(Content.is_featured), desc(Content.rating_cache))
            .limit(15)
        )
        res = await self.session.execute(stmt)
        contents = res.scalars().all()

        items = []
        for c in contents:
            item = await self._format_content(c, current_user_id)
            items.append(item)
        return items

    async def find_by_slug_or_id(
        self, identifier: str | int, current_user_id: int | None = None
    ) -> dict[str, Any] | None:
        if isinstance(identifier, int) or (isinstance(identifier, str) and identifier.isdigit()):
            condition = Content.id == int(identifier)
        else:
            condition = Content.slug == str(identifier)

        stmt = (
            select(Content)
            .options(
                selectinload(Content.content_type),
                selectinload(Content.genres),
                selectinload(Content.countries),
            )
            .where(condition)
        )
        res = await self.session.execute(stmt)
        content = res.scalars().first()
        if not content:
            return None

        return await self._format_content(content, current_user_id, include_progress=True)

    async def find_by_id(self, content_id: int) -> dict[str, Any] | None:
        stmt = (
            select(Content)
            .options(selectinload(Content.content_type))
            .where(Content.id == content_id)
        )
        res = await self.session.execute(stmt)
        content = res.scalars().first()
        if not content:
            return None
        return {
            "id": content.id,
            "title": content.title,
            "type": content.content_type.code if content.content_type else None,
        }

    async def get_episode_by_id(self, episode_id: int) -> dict[str, Any] | None:
        stmt = select(Episode).where(Episode.id == episode_id)
        res = await self.session.execute(stmt)
        ep = res.scalars().first()
        if not ep:
            return None
        return {
            "id": ep.id,
            "season_id": ep.season_id,
            "content_id": ep.content_id,
            "episode_number": ep.episode_number,
            "title": ep.title,
            "duration_minutes": ep.duration_minutes,
        }

    async def get_seasons_with_episodes(self, content_id: int) -> list[dict[str, Any]]:
        stmt = (
            select(Season)
            .options(selectinload(Season.episodes))
            .where(Season.content_id == content_id)
            .order_by(asc(Season.season_number))
        )
        res = await self.session.execute(stmt)
        seasons = res.scalars().all()

        result = []
        for s in seasons:
            episodes = [
                {
                    "id": ep.id,
                    "seasonId": ep.season_id,
                    "contentId": ep.content_id,
                    "episodeNumber": ep.episode_number,
                    "title": ep.title,
                    "durationMinutes": ep.duration_minutes,
                }
                for ep in sorted(s.episodes, key=lambda x: x.episode_number)
            ]
            result.append(
                {
                    "id": s.id,
                    "contentId": s.content_id,
                    "seasonNumber": s.season_number,
                    "title": s.title,
                    "releaseYear": s.release_year,
                    "episodes": episodes,
                }
            )
        return result

    async def get_stream_sources(
        self, content_id: int, episode_id: int | None = None
    ) -> list[dict[str, Any]]:
        conditions = [
            ProviderSource.content_id == content_id,
            Provider.is_active == True,  # noqa: E712
        ]
        if episode_id is not None:
            conditions.append(ProviderSource.episode_id == episode_id)
        else:
            conditions.append(ProviderSource.episode_id.is_(None))

        stmt = (
            select(ProviderSource, Provider)
            .join(Provider, ProviderSource.provider_id == Provider.id)
            .where(and_(*conditions))
            .order_by(asc(Provider.priority), desc(ProviderSource.quality))
        )
        res = await self.session.execute(stmt)
        rows = res.all()

        return [
            {
                "id": ps.id,
                "provider": prov.name,
                "providerCode": prov.code,
                "streamUrl": ps.stream_url,
                "playerType": ps.player_type,
                "quality": ps.quality,
                "translationTitle": ps.translation_title,
            }
            for ps, prov in rows
        ]

    async def get_taxonomies(self) -> dict[str, Any]:
        types_res = await self.session.execute(select(ContentType).order_by(asc(ContentType.id)))
        genres_res = await self.session.execute(select(Genre).order_by(asc(Genre.name)))
        countries_res = await self.session.execute(select(Country).order_by(asc(Country.name)))

        types = types_res.scalars().all()
        genres = genres_res.scalars().all()
        countries = countries_res.scalars().all()

        return {
            "types": [{"id": t.id, "code": t.code, "name": t.name} for t in types],
            "genres": [{"id": g.id, "slug": g.slug, "name": g.name} for g in genres],
            "countries": [{"id": c.id, "code": c.code, "name": c.name} for c in countries],
        }

    async def _format_content(
        self,
        content: Content,
        current_user_id: int | None = None,
        include_progress: bool = False,
    ) -> dict[str, Any]:
        user_rating = None
        user_bookmark = None
        user_progress = None

        if current_user_id:
            # Query user rating
            r_stmt = text(
                "SELECT rating FROM ratings WHERE content_id = :cid AND user_id = :uid"
            ).bindparams(cid=content.id, uid=current_user_id)
            r_res = await self.session.execute(r_stmt)
            r_val = r_res.scalar()
            if r_val is not None:
                user_rating = int(r_val)

            # Query user bookmark
            b_stmt = text(
                "SELECT category FROM bookmarks WHERE content_id = :cid AND user_id = :uid"
            ).bindparams(cid=content.id, uid=current_user_id)
            b_res = await self.session.execute(b_stmt)
            b_val = b_res.scalar()
            if b_val is not None:
                user_bookmark = str(b_val)

            if include_progress:
                p_stmt = text(
                    """
                    SELECT progress_seconds, duration_seconds, is_completed, episode_id, last_watched_at
                    FROM watch_progress
                    WHERE content_id = :cid AND user_id = :uid
                    ORDER BY last_watched_at DESC LIMIT 1
                    """
                ).bindparams(cid=content.id, uid=current_user_id)
                p_res = await self.session.execute(p_stmt)
                p_row = p_res.first()
                if p_row:
                    user_progress = {
                        "progressSeconds": p_row[0],
                        "durationSeconds": p_row[1],
                        "isCompleted": bool(p_row[2]),
                        "episodeId": p_row[3],
                        "lastWatchedAt": p_row[4].isoformat()
                        if hasattr(p_row[4], "isoformat")
                        else str(p_row[4]),
                    }

        trailer_yt_id = None
        if content.trailer_url:
            trailer_yt_id = self.extract_youtube_id(content.trailer_url)

        return {
            "id": content.id,
            "contentType": {
                "id": content.content_type.id,
                "code": content.content_type.code,
                "name": content.content_type.name,
            }
            if content.content_type
            else {"id": 1, "code": "movie", "name": "Фильмы"},
            "title": content.title,
            "originalTitle": content.original_title,
            "slug": content.slug,
            "description": content.description,
            "posterUrl": content.poster_url,
            "bannerUrl": content.banner_url,
            "trailerUrl": content.trailer_url,
            "trailerYoutubeId": trailer_yt_id,
            "releaseYear": content.release_year,
            "ageRating": content.age_rating,
            "durationMinutes": content.duration_minutes,
            "ratingCache": float(content.rating_cache),
            "votesCount": content.votes_count,
            "isFeatured": content.is_featured,
            "genres": [{"id": g.id, "slug": g.slug, "name": g.name} for g in content.genres],
            "countries": [{"id": c.id, "code": c.code, "name": c.name} for c in content.countries],
            "userRating": user_rating,
            "userBookmark": user_bookmark,
            "userProgress": user_progress,
        }

    @staticmethod
    def extract_youtube_id(url: str) -> str | None:
        pattern = r"(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([A-Za-z0-9_-]{11})"
        m = re.search(pattern, url, re.I)
        return m.group(1) if m else None
