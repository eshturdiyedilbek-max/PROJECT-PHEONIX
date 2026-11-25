import uuid
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import HistoryItem

Direction = Literal["sign_to_text", "speech_to_text"]


async def save_history(
    db: AsyncSession,
    client_id: uuid.UUID,
    direction: Direction,
    lang: str,
    text: str,
    signs: list[str] | None,
) -> int:
    item = HistoryItem(client_id=client_id, direction=direction, lang=lang, text=text, signs=signs)
    db.add(item)
    await db.commit()
    return item.id
