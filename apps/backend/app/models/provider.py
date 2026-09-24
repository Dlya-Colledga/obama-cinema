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
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.content import Content
    from app.models.episode import Episode


class Provider(Base):
    __tablename__ = "providers"

    id: Mapped[int] = mapped_column(Integer, Identity(always=True), primary_key=True)
    code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    base_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    sources: Mapped[list["ProviderSource"]] = relationship(
        back_populates="provider", cascade="all, delete-orphan"
    )


class ProviderSource(Base):
    __tablename__ = "provider_sources"
    __table_args__ = (
        CheckConstraint(
            "player_type IN ('iframe', 'hls', 'mp4')",
            name="provider_sources_player_type_check",
        ),
        Index("idx_provider_sources_content", "content_id"),
        Index("idx_provider_sources_episode", "episode_id"),
        Index("idx_provider_sources_provider", "provider_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    content_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("contents.id", ondelete="CASCADE"), nullable=False
    )
    episode_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("episodes.id", ondelete="CASCADE"), nullable=True
    )
    provider_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("providers.id", ondelete="CASCADE"), nullable=False
    )
    stream_url: Mapped[str] = mapped_column(Text, nullable=False)
    player_type: Mapped[str] = mapped_column(Text, nullable=False)
    quality: Mapped[str] = mapped_column(Text, default="1080p", nullable=False)
    translation_title: Mapped[str] = mapped_column(
        Text, default="Оригинал / Дубляж", nullable=False
    )
    extra_data: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    content: Mapped["Content"] = relationship(back_populates="provider_sources")
    episode: Mapped["Episode | None"] = relationship(back_populates="provider_sources")
    provider: Mapped["Provider"] = relationship(back_populates="sources", lazy="joined")
