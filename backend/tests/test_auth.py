import json
import time
import uuid

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from app.auth.providers import InvalidCredential, Profile, ProviderUnavailable, verify_github, verify_google

AUD = "123-web.apps.googleusercontent.com"


# ---------- Google ID token checks (real signature verification with a local key) ----------

class FakeJWKS:
    def __init__(self, key):
        self.key = key

    def get_signing_key_from_jwt(self, token):
        return type("K", (), {"key": self.key})()


@pytest.fixture(scope="module")
def rsa_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _id_token(key, **over):
    now = int(time.time())
    claims = {"iss": "https://accounts.google.com", "aud": AUD, "sub": "1111", "iat": now, "exp": now + 3600,
              "email": "Temur@Example.com", "email_verified": True, "name": "Temur", "picture": "https://x/p.png"}
    claims.update(over)
    return jwt.encode(claims, key, algorithm="RS256")


def test_google_valid(rsa_key):
    p = verify_google(_id_token(rsa_key), [AUD], FakeJWKS(rsa_key.public_key()))
    assert (p.provider, p.subject, p.email, p.name) == ("google", "1111", "temur@example.com", "Temur")


@pytest.mark.parametrize("over", [{"aud": "someone-else"}, {"iss": "evil.com"}, {"exp": int(time.time()) - 3600}])
def test_google_rejects_wrong_claims(rsa_key, over):
    with pytest.raises(InvalidCredential):
        verify_google(_id_token(rsa_key, **over), [AUD], FakeJWKS(rsa_key.public_key()))


def test_google_rejects_other_signer(rsa_key):
    other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    with pytest.raises(InvalidCredential):
        verify_google(_id_token(other), [AUD], FakeJWKS(rsa_key.public_key()))


def test_google_unverified_email_is_dropped(rsa_key):
    p = verify_google(_id_token(rsa_key, email_verified=False), [AUD], FakeJWKS(rsa_key.public_key()))
    assert p.email is None


# ---------- GitHub token checks (GitHub API mocked) ----------

def _gh(handler):
    return httpx.AsyncClient(base_url="https://api.github.com", transport=httpx.MockTransport(handler))


async def test_github_valid():
    def h(req):
        if req.url.path == "/user":
            assert req.headers["authorization"] == "Bearer gho_good"
            return httpx.Response(200, json={"id": 42, "login": "temur", "name": None, "avatar_url": "a"})
        if req.url.path == "/user/emails":
            return httpx.Response(200, json=[{"email": "x@y.z", "primary": False, "verified": True},
                                             {"email": "Me@Y.z", "primary": True, "verified": True}])
        return httpx.Response(404)

    p = await verify_github("gho_good", http=_gh(h))
    assert (p.subject, p.name, p.email) == ("42", "temur", "me@y.z")


async def test_github_bad_token():
    with pytest.raises(InvalidCredential):
        await verify_github("gho_bad", http=_gh(lambda r: httpx.Response(401)))


async def test_github_down():
    with pytest.raises(ProviderUnavailable):
        await verify_github("gho_x", http=_gh(lambda r: httpx.Response(503)))


async def test_github_token_from_another_app():
    def h(req):
        if req.url.path.startswith("/applications/"):
            return httpx.Response(404)
        return httpx.Response(200, json={"id": 1})

    with pytest.raises(InvalidCredential):
        await verify_github("gho_x", "cid", "secret", http=_gh(h))


# ---------- Endpoints ----------

@pytest.fixture
def settings(settings):
    settings.google_client_ids = AUD
    settings.github_client_id = "Iv1.abc"
    return settings


@pytest.fixture
def fakes(app):
    def g(token, audiences):
        assert audiences == [AUD]
        if token.startswith("bad"):
            raise InvalidCredential("nope")
        sub, _, email = token.partition(":")
        return Profile("google", sub, email or None, "Temur G", "https://g/p.png")

    async def gh(token, cid, secret):
        assert cid == "Iv1.abc"
        if token.startswith("bad"):
            raise InvalidCredential("nope")
        sub, _, email = token.partition(":")
        return Profile("github", sub, email or None, "temur", "https://gh/a.png")

    app.state.verify_google = g
    app.state.verify_github = gh


async def test_providers(client):
    r = await client.get("/api/auth/providers")
    assert r.json() == {"google": {"client_id": AUD}, "github": {"client_id": "Iv1.abc"}}


async def test_providers_off_by_default(app, client):
    app.state.settings.google_client_ids = ""
    app.state.settings.github_client_id = ""
    assert (await client.get("/api/auth/providers")).json() == {"google": None, "github": None}
    r = await client.post("/api/auth/google", json={"id_token": "x" * 30})
    assert r.status_code == 503 and r.json()["error"]["code"] == "auth_unavailable"


async def test_google_login_and_me(client, fakes):
    r = await client.post("/api/auth/google", json={"id_token": "g-sub-0001:t@example.com"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["email"] == "t@example.com" and body["user"]["providers"] == ["google"]
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['token']}"})
    assert me.json()["user"]["id"] == body["user"]["id"]


async def test_bad_proof_is_401(client, fakes):
    r = await client.post("/api/auth/google", json={"id_token": "bad-token-xxxxxxxxxxxxxxxx"})
    assert r.status_code == 401 and r.json()["error"]["code"] == "invalid_token"
    r = await client.post("/api/auth/github", json={"access_token": "bad-token-xx"})
    assert r.status_code == 401


async def test_same_email_links_google_and_github(client, fakes):
    a = (await client.post("/api/auth/google", json={"id_token": "google-sub-0002:same@x.uz"})).json()
    b = (await client.post("/api/auth/github", json={"access_token": "777777777777:same@x.uz"})).json()
    assert a["user"]["id"] == b["user"]["id"]
    assert b["user"]["providers"] == ["github", "google"]


async def test_history_follows_account_across_devices(client, fakes, app):
    from app.history_store import save_history

    phone = str(uuid.uuid4())
    async with app.state.sessionmaker() as db:
        await save_history(db, uuid.UUID(phone), "sign_to_text", "rsl", "Salom", ["Привет!"])

    r = await client.post("/api/auth/google", json={"id_token": "google-sub-0003:h@x.uz"},
                          headers={"X-Client-Id": phone})
    assert r.json()["adopted_history"] == 1, r.text
    auth = {"Authorization": f"Bearer {r.json()['token']}"}

    # A second phone signs in to the same account and sees the same history.
    r2 = await client.post("/api/auth/google", json={"id_token": "google-sub-0003:h@x.uz"},
                           headers={"X-Client-Id": str(uuid.uuid4())})
    h = await client.get("/api/history", headers={"Authorization": f"Bearer {r2.json()['token']}"})
    assert [i["text"] for i in h.json()["items"]] == ["Salom"]

    # The old device id no longer sees it; the account does.
    assert (await client.get("/api/history", headers={"X-Client-Id": phone})).json()["total"] == 0
    assert (await client.get("/api/history", headers=auth)).json()["total"] == 1


async def test_logout_and_expired_token(client, fakes):
    tok = (await client.post("/api/auth/github", json={"access_token": "1234567890:"})).json()["token"]
    auth = {"Authorization": f"Bearer {tok}"}
    assert (await client.post("/api/auth/logout", headers=auth)).status_code == 204
    r = await client.get("/api/history", headers=auth)
    assert r.status_code == 401 and r.json()["error"]["code"] == "session_expired"
    r = await client.get("/api/history", headers={"Authorization": "Basic abc"})
    assert r.status_code == 401


async def test_me_without_token(client):
    assert (await client.get("/api/auth/me")).status_code == 401


def test_client_ids_from_config_file(tmp_path):
    from app.config import Settings

    f = tmp_path / "auth.json"
    f.write_text(json.dumps({"google_web_client_id": "w.apps", "github_client_id": "Ov23x"}))
    s = Settings(auth_config_path=str(f))
    assert (s.google_client_id_list, s.github_client_id) == (["w.apps"], "Ov23x")
    s = Settings(auth_config_path=str(f), github_client_id="env-wins")
    assert s.github_client_id == "env-wins"


async def test_github_device_proxy(client, fakes, app):
    polls = {"n": 0}

    def h(req):
        if req.url.path == "/login/device/code":
            assert json.loads(req.content)["client_id"] == "Iv1.abc"
            return httpx.Response(200, json={"device_code": "dc-123456789", "user_code": "ABCD-1234",
                                             "verification_uri": "https://github.com/login/device",
                                             "interval": 5, "expires_in": 900})
        if req.url.path == "/login/oauth/access_token":
            polls["n"] += 1
            body = json.loads(req.content)
            if body["device_code"] == "dc-expired-0000":
                return httpx.Response(200, json={"error": "expired_token"})
            if polls["n"] == 1:
                return httpx.Response(200, json={"error": "authorization_pending"})
            return httpx.Response(200, json={"access_token": "555555555555:dev@x.uz"})
        return httpx.Response(404)

    app.state.github_http = lambda: httpx.AsyncClient(transport=httpx.MockTransport(h))
    d = (await client.post("/api/auth/github/device")).json()
    assert d["user_code"] == "ABCD-1234" and d["device_code"] == "dc-123456789"
    r = await client.post("/api/auth/github/poll", json={"device_code": d["device_code"]})
    assert r.status_code == 202 and r.json()["status"] == "pending"
    r = await client.post("/api/auth/github/poll", json={"device_code": d["device_code"]})
    assert r.status_code == 200 and r.json()["user"]["email"] == "dev@x.uz" and r.json()["token"]
    r = await client.post("/api/auth/github/poll", json={"device_code": "dc-expired-0000"})
    assert r.status_code == 410 and r.json()["error"]["code"] == "code_expired"
