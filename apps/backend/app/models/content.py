from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    Numeric,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base
from app.models.taxonomy import content_countries, content_genres

if TYPE_CHECKING:
    from app.models.bookmark import Bookmark
    from app.models.comment import Comment
    from app.models.episode import Episode, Season
    from app.models.provider import ProviderSource
    from app.models.rating import Rating
    from app.models.taxonomy import ContentType, Country, Genre
    from app.models.watch import WatchHistory, WatchProgress


class Content(Base):
    __tablename__ = "contents"
    __table_args__ = (
        CheckConstraint(
            "release_year BETWEEN 1890 AND 2100", name="contents_release_year_check"
        ),
        CheckConstraint(
            "rating_cache BETWEEN 0.0 AND 10.0", name="contents_rating_cache_check"
        ),
        CheckConstraint("votes_count >= 0", name="contents_votes_count_check"),
        Index("idx_contents_type", "content_type_id"),
        Index("idx_contents_year", "release_year"),
        Index("idx_contents_rating", "rating_cache"),
        Index("idx_contents_created", "created_at"),
        Index("idx_contents_featured", "is_featured", postgresql_where=(mapped_column("is_featured") == True)),  # noqa: E712
        Index("idx_contents_trailer_url", "trailer_url", postgresql_where=(mapped_column("trailer_url") != None)),  # noqa: E711
        Index("idx_contents_search_vector", "search_vector", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    content_type_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("content_types.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    original_title: Mapped[str | None] = mapped_column(Text, nullable=True)
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    poster_url: Mapped[str] = mapped_column(Text, nullable=False)
    banner_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    trailer_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    release_year: Mapped[int] = mapped_column(Integer, nullable=False)
    age_rating: Mapped[str] = mapped_column(Text, default="16+", nullable=False)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rating_cache: Mapped[Decimal] = mapped_column(
        Numeric(3, 1), default=Decimal("0.0"), nullable=False
    )
    votes_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    search_vector: Mapped[str | None] = mapped_column(TSVECTOR, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    content_type: Mapped["ContentType"] = relationship(lazy="joined")
    genres: Mapped[list["Genre"]] = relationship(
        secondary=content_genres, lazy="selectin"
    )
    countries: Mapped[list["Country"]] = relationship(
        secondary=content_countries, lazy="selectin"
    )
    seasons: Mapped[list["Season"]] = relationship(
        back_populates="content",
        cascade="all, delete-orphan",
        order_by="Season.season_number",
    )
    episodes: Mapped[list["Episode"]] = relationship(
        back_populates="content", cascade="all, delete-orphan"
    )
    provider_sources: Mapped[list["ProviderSource"]] = relationship(
        back_populates="content", cascade="all, delete-orphan"
    )
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="content", cascade="all, delete-orphan"
    )
    ratings: Mapped[list["Rating"]] = relationship(
        back_populates="content", cascade="all, delete-orphan"
    )
    bookmarks: Mapped[list["Bookmark"]] = relationship(
        back_populates="content", cascade="all, delete-orphan"
    )
    watch_progress: Mapped[list["WatchProgress"]] = relationship(
        back_populates="content", cascade="all, delete-orphan"
    )
    watch_history: Mapped[list["WatchHistory"]] = relationship(
        back_populates="content", cascade="all, delete-orphan"
    )
