from sqlalchemy import BigInteger, Column, ForeignKey, Identity, Integer, Table, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

content_genres = Table(
    "content_genres",
    Base.metadata,
    Column("content_id", BigInteger, ForeignKey("contents.id", ondelete="CASCADE"), primary_key=True),
    Column("genre_id", Integer, ForeignKey("genres.id", ondelete="CASCADE"), primary_key=True),
)

content_countries = Table(
    "content_countries",
    Base.metadata,
    Column("content_id", BigInteger, ForeignKey("contents.id", ondelete="CASCADE"), primary_key=True),
    Column("country_id", Integer, ForeignKey("countries.id", ondelete="CASCADE"), primary_key=True),
)


class ContentType(Base):
    __tablename__ = "content_types"

    id: Mapped[int] = mapped_column(Integer, Identity(always=True), primary_key=True)
    code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)


class Genre(Base):
    __tablename__ = "genres"

    id: Mapped[int] = mapped_column(Integer, Identity(always=True), primary_key=True)
    slug: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)


class Country(Base):
    __tablename__ = "countries"

    id: Mapped[int] = mapped_column(Integer, Identity(always=True), primary_key=True)
    code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
