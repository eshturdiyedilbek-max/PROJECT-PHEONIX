from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db
from app.errors import ApiError
from app.models import DictionaryEntry

router = APIRouter(prefix="/api", tags=["dictionary"])

Category = Literal["letter", "word", "phrase"]


def entry_json(e: DictionaryEntry) -> dict:
    return {
        "id": e.id,
        "lang": e.lang,
        "text": e.text,
        "category": e.category,
        "translations": {"ru": e.text, "en": e.translation_en, "uz": e.translation_uz},
        "video_url": e.video_url,
    }


def _py_lower(s: str | None) -> str | None:
    return s.lower() if s is not None else None


async def _text_matcher(db: AsyncSession, q: str):
    """Case-insensitive substring condition on DictionaryEntry.text.

    Postgres: ILIKE (Unicode-aware). SQLite: its built-in lower()/LIKE only fold ASCII,
    so register a Python lower() on the connection and compare lowercased strings.
    """
    if db.bind.dialect.name == "sqlite":
        conn = await db.connection()
        await conn.run_sync(
            lambda sc: sc.connection.dbapi_connection.create_function(
                "py_lower", 1, _py_lower, deterministic=True
            )
        )
        return func.py_lower(DictionaryEntry.text).contains(q.lower(), autoescape=True)
    return DictionaryEntry.text.icontains(q, autoescape=True)


@router.get("/dictionary")
async def list_dictionary(
    lang: str = "rsl",
    q: str | None = None,
    category: Category | None = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    conds = [DictionaryEntry.lang == lang]
    if category:
        conds.append(DictionaryEntry.category == category)
    if q:
        conds.append(await _text_matcher(db, q))
    total = await db.scalar(select(func.count()).select_from(DictionaryEntry).where(*conds))
    rows = await db.scalars(
        select(DictionaryEntry).where(*conds).order_by(DictionaryEntry.id).limit(limit).offset(offset)
    )
    return {"items": [entry_json(e) for e in rows], "total": total, "limit": limit, "offset": offset}


@router.get("/dictionary/{entry_id}")
async def get_dictionary_entry(entry_id: int, db: AsyncSession = Depends(get_db)):
    e = await db.get(DictionaryEntry, entry_id)
    if e is None:
        raise ApiError(404, "not_found", "Dictionary entry not found")
    return entry_json(e)
