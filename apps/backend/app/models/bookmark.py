from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.content import Content
    from app.models.user import User


class Bookmark(Base):
    __tablename__ = "bookmarks"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "content_id", "category", name="bookmarks_user_id_content_id_category_key"
        ),
        CheckConstraint(
            "category IN ('watching', 'plan_to_watch', 'completed', 'dropped', 'favorite')",
            name="bookmarks_category_check",
        ),
        Index("idx_bookmarks_user", "user_id"),
        Index("idx_bookmarks_content", "content_id"),
        Index("idx_bookmarks_user_category", "user_id", "category"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("contents.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="bookmarks")
    content: Mapped["Content"] = relationship(back_populates="bookmarks")
