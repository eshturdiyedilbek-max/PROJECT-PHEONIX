import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_db, require_client_id
from app.errors import ApiError
from app.history_store import save_history  # noqa: F401  (re-exported for other routers)
from app.models import HistoryItem

router = APIRouter(prefix="/api", tags=["history"])


def iso_utc(dt: datetime) -> str:
    """ISO-8601 UTC with 'Z'. Naive datetimes (SQLite) are treated as UTC."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def history_json(h: HistoryItem) -> dict:
    return {
        "id": h.id,
        "direction": h.direction,
        "lang": h.lang,
        "text": h.text,
        "signs": h.signs,
        "created_at": iso_utc(h.created_at),
    }


@router.get("/history")
async def list_history(
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    direction: Literal["sign_to_text", "speech_to_text"] | None = None,
    client_id: uuid.UUID = Depends(require_client_id),
    db: AsyncSession = Depends(get_db),
):
    conds = [HistoryItem.client_id == client_id]
    if direction:
        conds.append(HistoryItem.direction == direction)
    total = await db.scalar(select(func.count()).select_from(HistoryItem).where(*conds))
    rows = await db.scalars(
        select(HistoryItem)
        .where(*conds)
        .order_by(HistoryItem.created_at.desc(), HistoryItem.id.desc())
        .limit(limit)
        .offset(offset)
    )
    return {"items": [history_json(h) for h in rows], "total": total, "limit": limit, "offset": offset}


@router.delete("/history/{item_id}", status_code=204)
async def delete_history_item(
    item_id: int,
    client_id: uuid.UUID = Depends(require_client_id),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        delete(HistoryItem).where(HistoryItem.id == item_id, HistoryItem.client_id == client_id)
    )
    if res.rowcount == 0:
        await db.rollback()
        raise ApiError(404, "not_found", "History item not found")
    await db.commit()
    return Response(status_code=204)


@router.delete("/history", status_code=204)
async def clear_history(
    client_id: uuid.UUID = Depends(require_client_id),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(delete(HistoryItem).where(HistoryItem.client_id == client_id))
    await db.commit()
    return Response(status_code=204)
