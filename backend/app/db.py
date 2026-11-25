from sqlalchemy import func, insert, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def make_engine(url: str) -> AsyncEngine:
    return create_async_engine(url, pool_pre_ping=True)


def make_sessionmaker(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(engine, expire_on_commit=False)


async def init_db(engine: AsyncEngine) -> None:
    from app import models  # noqa: F401  (register tables)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def seed_dictionary(
    session: AsyncSession, classes: list[str], lang: str = "rsl", no_sign_label: str | None = "---"
) -> int:
    """Insert one entry per class (except the no-sign label). No-op if the language is already seeded."""
    from app.models import DictionaryEntry
    from app.sign.classes import categorize

    existing = await session.scalar(
        select(func.count()).select_from(DictionaryEntry).where(DictionaryEntry.lang == lang)
    )
    if existing:
        return 0
    rows = [
        {"lang": lang, "text": text, "category": categorize(text), "class_index": i}
        for i, text in enumerate(classes)
        if text != no_sign_label
    ]
    await session.execute(insert(DictionaryEntry), rows)  # bulk insert: one round trip
    await session.commit()
    return len(rows)
