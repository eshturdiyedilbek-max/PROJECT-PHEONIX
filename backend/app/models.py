import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class DictionaryEntry(Base):
    __tablename__ = "dictionary_entries"
    __table_args__ = (UniqueConstraint("lang", "class_index"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lang: Mapped[str] = mapped_column(String(16), index=True)
    text: Mapped[str] = mapped_column(String(200), index=True)
    category: Mapped[str] = mapped_column(String(16), index=True)
    class_index: Mapped[int] = mapped_column(Integer)
    translation_en: Mapped[str | None] = mapped_column(String(200), nullable=True)
    translation_uz: Mapped[str | None] = mapped_column(String(200), nullable=True)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)


class HistoryItem(Base):
    __tablename__ = "history_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    direction: Mapped[str] = mapped_column(String(32))
    lang: Mapped[str] = mapped_column(String(16))
    text: Mapped[str] = mapped_column(Text)
    signs: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)


class Contribution(Base):
    __tablename__ = "contributions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[uuid.UUID] = mapped_column(Uuid, index=True)
    entry_id: Mapped[int] = mapped_column(ForeignKey("dictionary_entries.id"), index=True)
    file_path: Mapped[str] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(16), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
