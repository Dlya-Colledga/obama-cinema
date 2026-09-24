from datetime import datetime
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
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.content import Content
    from app.models.episode import Episode
    from app.models.user import User


class WatchProgress(Base):
    __tablename__ = "watch_progress"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "content_id",
            "episode_id",
            postgresql_nulls_not_distinct=True,
            name="watch_progress_user_id_content_id_episode_id_key",
        ),
        CheckConstraint(
            "progress_seconds >= 0", name="watch_progress_progress_seconds_check"
        ),
        CheckConstraint(
            "duration_seconds >= 0", name="watch_progress_duration_seconds_check"
        ),
        Index("idx_watch_progress_user", "user_id"),
        Index("idx_watch_progress_content", "content_id"),
        Index("idx_watch_progress_last_watched", "user_id", "last_watched_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("contents.id", ondelete="CASCADE"), nullable=False
    )
    episode_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("episodes.id", ondelete="CASCADE"), nullable=True
    )
    progress_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_watched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="watch_progress")
    content: Mapped["Content"] = relationship(back_populates="watch_progress")
    episode: Mapped["Episode | None"] = relationship(lazy="joined")


class WatchHistory(Base):
    __tablename__ = "watch_history"
    __table_args__ = (
        Index("idx_watch_history_user", "user_id"),
        Index("idx_watch_history_content", "content_id"),
        Index("idx_watch_history_watched", "user_id", "watched_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("contents.id", ondelete="CASCADE"), nullable=False
    )
    episode_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("episodes.id", ondelete="CASCADE"), nullable=True
    )
    watched_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="watch_history")
    content: Mapped["Content"] = relationship(back_populates="watch_history")
    episode: Mapped["Episode | None"] = relationship(lazy="joined")
