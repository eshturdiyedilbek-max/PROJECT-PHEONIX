"""Sign-in for the mobile app: Google and GitHub.

The phone proves who the person is (Google ID token / GitHub access token); we check that proof,
find or create the account, and hand back a Phoenix session token. The app then sends
`Authorization: Bearer <token>` instead of X-Client-Id, and history follows the account.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, Request, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.auth import store
from app.auth.providers import InvalidCredential, Profile, ProviderUnavailable, github_device_poll, github_device_start
from app.deps import bearer_token, current_user, get_db, parse_client_id
from app.errors import ApiError
from app.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


class GoogleLogin(BaseModel):
    id_token: str = Field(min_length=20, max_length=8192)


class GithubLogin(BaseModel):
    access_token: str = Field(min_length=10, max_length=512)


class GithubPoll(BaseModel):
    device_code: str = Field(min_length=10, max_length=200)


def _iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


async def user_json(db: AsyncSession, u: User) -> dict:
    return {
        "id": str(u.uid),
        "name": u.name,
        "email": u.email,
        "avatar_url": u.avatar_url,
        "providers": await store.providers_of(db, u),
    }


@router.get("/providers")
async def providers(request: Request):
    """Which sign-in buttons the app should show, with the public client IDs it needs."""
    s = request.app.state.settings
    google = s.google_client_id_list
    return {
        "google": {"client_id": google[0]} if google else None,
        "github": {"client_id": s.github_client_id} if s.github_client_id else None,
    }


async def _finish(request: Request, db: AsyncSession, profile: Profile, device: str | None) -> dict:
    user = await store.upsert_user(db, profile)
    moved = await store.adopt_device_history(db, user, parse_client_id(device))
    token, expires = await store.create_session(db, user, request.app.state.settings.session_days)
    body = {"token": token, "expires_at": _iso(expires), "user": await user_json(db, user),
            "adopted_history": moved}
    await db.commit()
    return body


@router.post("/google")
async def login_google(body: GoogleLogin, request: Request, x_client_id: str | None = Header(None),
                       db: AsyncSession = Depends(get_db)):
    audiences = request.app.state.settings.google_client_id_list
    if not audiences:
        raise ApiError(503, "auth_unavailable", "Google sign-in is not set up on this server (GOOGLE_CLIENT_IDS)")
    try:
        profile = await run_in_threadpool(request.app.state.verify_google, body.id_token, audiences)
    except InvalidCredential as e:
        raise ApiError(401, "invalid_token", f"Google sign-in could not be verified: {e}") from e
    except ProviderUnavailable as e:
        raise ApiError(502, "provider_unavailable", "Could not reach Google to verify the sign-in") from e
    return await _finish(request, db, profile, x_client_id)


@router.post("/github")
async def login_github(body: GithubLogin, request: Request, x_client_id: str | None = Header(None),
                       db: AsyncSession = Depends(get_db)):
    s = request.app.state.settings
    if not s.github_client_id:
        raise ApiError(503, "auth_unavailable", "GitHub sign-in is not set up on this server (GITHUB_CLIENT_ID)")
    try:
        profile = await request.app.state.verify_github(body.access_token, s.github_client_id,
                                                        s.github_client_secret)
    except InvalidCredential as e:
        raise ApiError(401, "invalid_token", f"GitHub sign-in could not be verified: {e}") from e
    except ProviderUnavailable as e:
        raise ApiError(502, "provider_unavailable", "Could not reach GitHub to verify the sign-in") from e
    return await _finish(request, db, profile, x_client_id)


def _github_client_id(request: Request) -> str:
    cid = request.app.state.settings.github_client_id
    if not cid:
        raise ApiError(503, "auth_unavailable", "GitHub sign-in is not set up on this server (GITHUB_CLIENT_ID)")
    return cid


@router.post("/github/device")
async def github_device(request: Request):
    """Browser version of GitHub's device flow, step 1: get a code for the person to enter on github.com."""
    cid = _github_client_id(request)
    try:
        d = await github_device_start(cid, request.app.state.github_http())
    except ProviderUnavailable as e:
        raise ApiError(502, "provider_unavailable", f"Could not get a code from GitHub: {e}") from e
    return {k: d.get(k) for k in ("device_code", "user_code", "verification_uri", "interval", "expires_in")}


@router.post("/github/poll")
async def github_poll(body: GithubPoll, request: Request, x_client_id: str | None = Header(None),
                      db: AsyncSession = Depends(get_db)):
    """Step 2, call every `interval` seconds: 202 while waiting, the normal login response once approved."""
    cid = _github_client_id(request)
    try:
        r = await github_device_poll(cid, body.device_code, request.app.state.github_http())
    except ProviderUnavailable as e:
        raise ApiError(502, "provider_unavailable", "Could not reach GitHub") from e
    if r.get("access_token"):
        return await login_github(GithubLogin(access_token=r["access_token"]), request, x_client_id, db)
    err = r.get("error")
    if err in ("authorization_pending", "slow_down"):
        return JSONResponse({"status": "pending", "interval": r.get("interval")}, status_code=202)
    if err == "expired_token":
        raise ApiError(410, "code_expired", "The code expired; start again")
    if err == "access_denied":
        raise ApiError(403, "access_denied", "Sign-in was declined on GitHub")
    raise ApiError(400, "invalid_request", r.get("error_description") or str(err))


@router.get("/me")
async def me(user: User | None = Depends(current_user), db: AsyncSession = Depends(get_db)):
    if user is None:
        raise ApiError(401, "not_signed_in", "Send Authorization: Bearer <token>")
    return {"user": await user_json(db, user)}


@router.post("/logout", status_code=204)
async def logout(token: str | None = Depends(bearer_token), db: AsyncSession = Depends(get_db)):
    if token:
        await store.delete_session(db, token)
        await db.commit()
    return Response(status_code=204)
