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
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.content import Content
    from app.models.user import User


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = (
        CheckConstraint(
            "length(text) >= 2 AND length(text) <= 3000",
            name="comments_text_check",
        ),
        Index("idx_comments_user", "user_id"),
        Index("idx_comments_content", "content_id"),
        Index("idx_comments_parent", "parent_id"),
        Index("idx_comments_created", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    content_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("contents.id", ondelete="CASCADE"), nullable=False
    )
    parent_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="comments", lazy="joined")
    content: Mapped["Content"] = relationship(back_populates="comments")
    parent: Mapped["Comment | None"] = relationship(
        remote_side=[id], back_populates="replies"
    )
    replies: Mapped[list["Comment"]] = relationship(
        back_populates="parent", cascade="all, delete-orphan"
    )
