import uuid
from collections.abc import AsyncIterator

from fastapi import Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import ApiError


async def get_db(request: Request) -> AsyncIterator[AsyncSession]:
    async with request.app.state.sessionmaker() as session:
        yield session


def parse_client_id(raw: str | None) -> uuid.UUID | None:
    if not raw:
        return None
    try:
        return uuid.UUID(raw)
    except (ValueError, AttributeError, TypeError):
        return None


def require_client_id(x_client_id: str | None = Header(None)) -> uuid.UUID:
    cid = parse_client_id(x_client_id)
    if cid is None:
        raise ApiError(400, "invalid_client_id", "X-Client-Id header must be a UUID")
    return cid


def optional_client_id(x_client_id: str | None = Header(None)) -> uuid.UUID | None:
    return parse_client_id(x_client_id)
