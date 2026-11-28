"""Users, identities and session tokens in the database."""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.providers import Profile
from app.models import AuthSession, Contribution, HistoryItem, Identity, User


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)  # SQLite returns naive datetimes


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def upsert_user(db: AsyncSession, p: Profile) -> User:
    """Find the user for this provider account; else the user with the same verified email; else create one."""
    ident = await db.scalar(select(Identity).where(Identity.provider == p.provider, Identity.subject == p.subject))
    user = await db.get(User, ident.user_id) if ident else None
    if user is None and p.email:
        user = await db.scalar(select(User).where(User.email == p.email).order_by(User.id).limit(1))
    if user is None:
        user = User(uid=uuid.uuid4(), email=p.email, name=p.name, avatar_url=p.avatar_url)
        db.add(user)
        await db.flush()
    if ident is None:
        db.add(Identity(user_id=user.id, provider=p.provider, subject=p.subject))
    user.name = user.name or p.name
    user.avatar_url = p.avatar_url or user.avatar_url
    user.email = user.email or p.email
    user.last_login_at = _now()
    await db.flush()
    return user


async def adopt_device_history(db: AsyncSession, user: User, device_id: uuid.UUID | None) -> int:
    """Move what this phone translated before signing in into the account."""
    if device_id is None or device_id == user.uid:
        return 0
    res = await db.execute(update(HistoryItem).where(HistoryItem.client_id == device_id).values(client_id=user.uid))
    await db.execute(update(Contribution).where(Contribution.client_id == device_id).values(client_id=user.uid))
    return res.rowcount or 0


async def create_session(db: AsyncSession, user: User, days: int) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(32)
    expires = _now() + timedelta(days=days)
    db.add(AuthSession(token_hash=hash_token(token), user_id=user.id, expires_at=expires))
    await db.flush()
    return token, expires


async def user_for_token(db: AsyncSession, token: str) -> User | None:
    s = await db.scalar(select(AuthSession).where(AuthSession.token_hash == hash_token(token)))
    if s is None or _aware(s.expires_at) <= _now():
        return None
    return await db.get(User, s.user_id)


async def delete_session(db: AsyncSession, token: str) -> None:
    await db.execute(delete(AuthSession).where(AuthSession.token_hash == hash_token(token)))


async def providers_of(db: AsyncSession, user: User) -> list[str]:
    rows = await db.scalars(select(Identity.provider).where(Identity.user_id == user.id).order_by(Identity.id))
    return sorted(set(rows))
