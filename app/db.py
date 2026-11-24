from sqlalchemy import func, select
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


async def seed_dictionary(session: AsyncSession, classes: list[str], lang: str = "rsl") -> int:
    """Insert one entry per class (except '---'). No-op if the language is already seeded."""
    from app.models import DictionaryEntry
    from app.sign.classes import NO_SIGN, categorize

    existing = await session.scalar(
        select(func.count()).select_from(DictionaryEntry).where(DictionaryEntry.lang == lang)
    )
    if existing:
        return 0
    rows = [
        DictionaryEntry(lang=lang, text=text, category=categorize(text), class_index=i)
        for i, text in enumerate(classes)
        if text != NO_SIGN
    ]
    session.add_all(rows)
    await session.commit()
    return len(rows)
