"""Checks a sign-in proof from the phone and turns it into a profile.

- Google: the app gets an ID token (a JWT signed by Google) from Android's account picker.
  We check Google's signature, that it was issued for our OAuth client, and that it has not expired.
- GitHub: the app gets an access token through GitHub's device flow (no redirect URL needed, so it
  works with any temporary Colab/Kaggle address). We ask GitHub's API whose token it is.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx
import jwt

log = logging.getLogger("phoenix.auth")

GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"]
GITHUB_API = "https://api.github.com"


class InvalidCredential(Exception):
    """The proof is fake, expired or not for this app."""


class ProviderUnavailable(Exception):
    """We could not reach Google/GitHub to check the proof."""


@dataclass
class Profile:
    provider: str  # google | github
    subject: str  # the provider's stable account id
    email: str | None  # only set when the provider says it is verified
    name: str | None
    avatar_url: str | None


_google_jwks: jwt.PyJWKClient | None = None


def _google_keys() -> jwt.PyJWKClient:
    global _google_jwks
    if _google_jwks is None:
        _google_jwks = jwt.PyJWKClient(GOOGLE_CERTS_URL, cache_keys=True, lifespan=6 * 3600)
    return _google_jwks


def verify_google(id_token: str, audiences: list[str], jwks: jwt.PyJWKClient | None = None) -> Profile:
    """Blocking (may fetch Google's keys): call it from a thread."""
    try:
        key = (jwks or _google_keys()).get_signing_key_from_jwt(id_token).key
    except jwt.PyJWKClientConnectionError as e:
        raise ProviderUnavailable(str(e)) from e
    except jwt.PyJWTError as e:
        raise InvalidCredential(f"bad token header: {e}") from e
    try:
        claims = jwt.decode(
            id_token, key, algorithms=["RS256"], audience=audiences, issuer=GOOGLE_ISSUERS,
            leeway=60, options={"require": ["exp", "iat", "sub", "aud", "iss"]},
        )
    except jwt.PyJWTError as e:
        raise InvalidCredential(str(e)) from e
    verified = claims.get("email_verified") in (True, "true")
    return Profile(
        provider="google",
        subject=str(claims["sub"]),
        email=(claims.get("email") or "").lower() or None if verified else None,
        name=claims.get("name"),
        avatar_url=claims.get("picture"),
    )


async def verify_github(access_token: str, client_id: str = "", client_secret: str = "",
                        http: httpx.AsyncClient | None = None) -> Profile:
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json",
               "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "phoenix-backend"}
    own = http is None
    http = http or httpx.AsyncClient(base_url=GITHUB_API, timeout=10.0)
    try:
        if client_id and client_secret:
            # The token must have been issued to *our* OAuth App, not to some other app.
            r = await http.post(f"/applications/{client_id}/token", json={"access_token": access_token},
                                auth=(client_id, client_secret), headers={"Accept": "application/vnd.github+json"})
            if r.status_code in (404, 422):
                raise InvalidCredential("token was not issued to this app")
            if r.status_code != 200:
                raise ProviderUnavailable(f"GitHub app check failed: HTTP {r.status_code}")
        r = await http.get("/user", headers=headers)
        if r.status_code == 401:
            raise InvalidCredential("GitHub rejected the token")
        if r.status_code != 200:
            raise ProviderUnavailable(f"GitHub /user: HTTP {r.status_code}")
        user = r.json()
        email = None
        r = await http.get("/user/emails", headers=headers)
        if r.status_code == 200:
            for e in r.json():
                if e.get("primary") and e.get("verified"):
                    email = (e.get("email") or "").lower() or None
        return Profile(
            provider="github",
            subject=str(user["id"]),
            email=email,
            name=user.get("name") or user.get("login"),
            avatar_url=user.get("avatar_url"),
        )
    except httpx.HTTPError as e:
        raise ProviderUnavailable(str(e)) from e
    finally:
        if own:
            await http.aclose()


# ---------- GitHub device flow, proxied for browsers (github.com/login/* has no CORS) ----------
GITHUB_WEB = "https://github.com"


async def github_device_start(client_id: str, http: httpx.AsyncClient | None = None) -> dict:
    """Asks GitHub for a device code. Returns GitHub's JSON (device_code, user_code, verification_uri, ...)."""
    own = http is None
    http = http or httpx.AsyncClient(timeout=10.0)
    try:
        r = await http.post(f"{GITHUB_WEB}/login/device/code", headers={"Accept": "application/json"},
                            json={"client_id": client_id, "scope": "read:user user:email"})
        data = r.json() if r.content else {}
    except (httpx.HTTPError, ValueError) as e:
        raise ProviderUnavailable(str(e)) from e
    finally:
        if own:
            await http.aclose()
    if r.status_code != 200 or "device_code" not in data:
        raise ProviderUnavailable(data.get("error_description") or data.get("error") or f"HTTP {r.status_code}")
    return data


async def github_device_poll(client_id: str, device_code: str, http: httpx.AsyncClient | None = None) -> dict:
    """One poll. Returns GitHub's JSON: {access_token: ...} once approved, else {error: authorization_pending|...}."""
    own = http is None
    http = http or httpx.AsyncClient(timeout=10.0)
    try:
        r = await http.post(f"{GITHUB_WEB}/login/oauth/access_token", headers={"Accept": "application/json"},
                            json={"client_id": client_id, "device_code": device_code,
                                  "grant_type": "urn:ietf:params:oauth:grant-type:device_code"})
        return r.json() if r.content else {"error": f"HTTP {r.status_code}"}
    except (httpx.HTTPError, ValueError) as e:
        raise ProviderUnavailable(str(e)) from e
    finally:
        if own:
            await http.aclose()


# ---------- Website redirect sign-in (OAuth 2.0 authorization code + PKCE) ----------
# The browser goes to Google/GitHub, the person agrees, and the provider sends the browser back to the
# website with a one-time `code`. The website hands that code to us; we trade it for tokens using the
# client secret (which never leaves the server), check whose account it is, and open a Phoenix session.
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


class CodeRejected(InvalidCredential):
    """The one-time code is wrong, already used, expired, or was made for another return address."""


async def google_exchange_code(code: str, client_id: str, client_secret: str, redirect_uri: str,
                               code_verifier: str | None, http: httpx.AsyncClient | None = None) -> str:
    """Trades the code for Google's ID token (a signed JWT, still to be verified by verify_google)."""
    form = {"code": code, "client_id": client_id, "client_secret": client_secret,
            "redirect_uri": redirect_uri, "grant_type": "authorization_code"}
    if code_verifier:
        form["code_verifier"] = code_verifier
    own = http is None
    http = http or httpx.AsyncClient(timeout=10.0)
    try:
        r = await http.post(GOOGLE_TOKEN_URL, data=form, headers={"Accept": "application/json"})
        data = r.json() if r.content else {}
    except (httpx.HTTPError, ValueError) as e:
        raise ProviderUnavailable(str(e)) from e
    finally:
        if own:
            await http.aclose()
    if r.status_code == 200 and data.get("id_token"):
        return data["id_token"]
    err = data.get("error") or f"HTTP {r.status_code}"
    if r.status_code in (400, 401) and err in ("invalid_grant", "redirect_uri_mismatch", "invalid_request"):
        raise CodeRejected(data.get("error_description") or err)
    if err in ("invalid_client", "unauthorized_client"):
        log.error("Google rejected our client id/secret: %s", data.get("error_description") or err)
    raise ProviderUnavailable(data.get("error_description") or err)


async def github_exchange_code(code: str, client_id: str, client_secret: str, redirect_uri: str,
                               code_verifier: str | None, http: httpx.AsyncClient | None = None) -> str:
    """Trades the code for a GitHub access token (whose owner verify_github then looks up)."""
    body = {"client_id": client_id, "client_secret": client_secret, "code": code, "redirect_uri": redirect_uri}
    if code_verifier:
        body["code_verifier"] = code_verifier
    own = http is None
    http = http or httpx.AsyncClient(timeout=10.0)
    try:
        r = await http.post(f"{GITHUB_WEB}/login/oauth/access_token", json=body,
                            headers={"Accept": "application/json"})
        data = r.json() if r.content else {}
    except (httpx.HTTPError, ValueError) as e:
        raise ProviderUnavailable(str(e)) from e
    finally:
        if own:
            await http.aclose()
    if r.status_code == 200 and data.get("access_token"):
        return data["access_token"]
    err = data.get("error") or f"HTTP {r.status_code}"
    # GitHub answers 200 with an error field for bad codes.
    if err in ("bad_verification_code", "redirect_uri_mismatch", "invalid_grant"):
        raise CodeRejected(data.get("error_description") or err)
    if err in ("incorrect_client_credentials", "unverified_user_email"):
        log.error("GitHub refused the code exchange: %s", data.get("error_description") or err)
    raise ProviderUnavailable(data.get("error_description") or err)
