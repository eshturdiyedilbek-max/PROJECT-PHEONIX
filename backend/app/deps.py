from __future__ import annotations

import uuid
from collections.abc import AsyncIterator
from typing import TYPE_CHECKING

from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.errors import ApiError

if TYPE_CHECKING:
    from app.models import User


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


def bearer_token(authorization: str | None = Header(None)) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise ApiError(401, "invalid_token", "Authorization must be 'Bearer <token>'")
    return token.strip()


async def user_from_token(db: AsyncSession, token: str | None) -> "User | None":
    """None when no token was sent; 401 when a token was sent but is unknown or expired."""
    if not token:
        return None
    from app.auth.store import user_for_token

    user = await user_for_token(db, token)
    if user is None:
        raise ApiError(401, "session_expired", "Your sign-in has expired; sign in again")
    return user


async def current_user(token: str | None = Depends(bearer_token), db: AsyncSession = Depends(get_db)):
    return await user_from_token(db, token)


async def resolve_client_id(db: AsyncSession, token: str | None, raw_client_id: str | None) -> uuid.UUID | None:
    """Signed in: the account's id (history follows the person). Otherwise: the device's X-Client-Id."""
    user = await user_from_token(db, token)
    if user is not None:
        return user.uid
    return parse_client_id(raw_client_id)


async def require_client_id(
    token: str | None = Depends(bearer_token),
    x_client_id: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
) -> uuid.UUID:
    cid = await resolve_client_id(db, token, x_client_id)
    if cid is None:
        raise ApiError(400, "invalid_client_id", "X-Client-Id header must be a UUID")
    return cid


async def optional_client_id(
    token: str | None = Depends(bearer_token),
    x_client_id: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
) -> uuid.UUID | None:
    return await resolve_client_id(db, token, x_client_id)
