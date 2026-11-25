import uuid
from pathlib import Path

from sqlalchemy import select

from app.models import Contribution, DictionaryEntry


async def _entry_id(app):
    async with app.state.sessionmaker() as s:
        return await s.scalar(select(DictionaryEntry.id).order_by(DictionaryEntry.id).limit(1))


def _post(client, cid, entry_id, consent="true", ctype="video/webm", data=b"\x1aE\xdf\xa3webm", name="s.webm"):
    return client.post(
        "/api/contributions",
        headers={"X-Client-Id": cid},
        data={"entry_id": str(entry_id), "consent": consent},
        files={"video": (name, data, ctype)},
    )


def _files(settings):
    d = Path(settings.upload_dir) / "contributions"
    return list(d.iterdir()) if d.exists() else []


async def test_contribution_created(app, client, client_id, settings):
    eid = await _entry_id(app)
    r = await _post(client, client_id, eid)
    assert r.status_code == 201, r.text
    body = r.json()
    assert set(body) == {"id", "entry_id", "status", "created_at"}
    assert body["entry_id"] == eid and body["status"] == "pending"
    assert body["created_at"].endswith("Z")
    async with app.state.sessionmaker() as s:
        c = await s.get(Contribution, body["id"])
    assert c.client_id == uuid.UUID(client_id)
    p = Path(c.file_path)
    assert p.exists() and p.suffix == ".webm"
    assert p.parent == Path(settings.upload_dir) / "contributions"
    assert p.read_bytes() == b"\x1aE\xdf\xa3webm"


async def test_contribution_mp4(app, client, client_id, settings):
    r = await _post(client, client_id, await _entry_id(app), ctype="video/mp4", name="a.mp4")
    assert r.status_code == 201
    assert [f.suffix for f in _files(settings)] == [".mp4"]


async def test_contribution_requires_consent(app, client, client_id, settings):
    eid = await _entry_id(app)
    r = await _post(client, client_id, eid, consent="false")
    assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_request"
    r = await client.post("/api/contributions", headers={"X-Client-Id": client_id},
                          data={"entry_id": str(eid)}, files={"video": ("s.webm", b"x", "video/webm")})
    assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_request"
    assert _files(settings) == []


async def test_contribution_requires_client_id(app, client):
    r = await _post(client, "nope", await _entry_id(app))
    assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_client_id"


async def test_contribution_unknown_entry(client, client_id, settings):
    r = await _post(client, client_id, 999999)
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"
    assert _files(settings) == []


async def test_contribution_wrong_type(app, client, client_id, settings):
    r = await _post(client, client_id, await _entry_id(app), ctype="text/plain", name="a.txt")
    assert r.status_code == 415 and r.json()["error"]["code"] == "unsupported_media_type"
    assert _files(settings) == []


async def test_contribution_too_large(app, client, client_id, settings):
    big = b"\0" * (20 * 1024 * 1024 + 1)
    r = await _post(client, client_id, await _entry_id(app), data=big)
    assert r.status_code == 413 and r.json()["error"]["code"] == "file_too_large"
    assert _files(settings) == []
    async with app.state.sessionmaker() as s:
        assert (await s.scalars(select(Contribution))).all() == []
