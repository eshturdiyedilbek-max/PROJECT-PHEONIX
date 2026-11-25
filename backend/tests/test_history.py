import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import update

from app.history_store import save_history
from app.models import HistoryItem


def H(cid):
    return {"X-Client-Id": cid}


async def _save(app, cid, direction="sign_to_text", text="привет", signs=None, lang="rsl"):
    async with app.state.sessionmaker() as s:
        return await save_history(s, uuid.UUID(cid), direction, lang, text, signs)


async def test_history_scoped_to_client(app, client, client_id):
    await _save(app, client_id)
    other = str(uuid.uuid4())
    r = await client.get("/api/history", headers=H(other))
    assert r.status_code == 200
    assert r.json() == {"items": [], "total": 0, "limit": 20, "offset": 0}
    r = await client.get("/api/history", headers=H(client_id))
    assert r.json()["total"] == 1


async def test_history_newest_first_and_filter(app, client, client_id):
    a = await _save(app, client_id, "sign_to_text", "привет утро", ["привет", "утро"])
    b = await _save(app, client_id, "speech_to_text", "Salom", None, "uz")
    c = await _save(app, client_id, "sign_to_text", "пока", ["пока"])
    # make `a` the newest by timestamp despite the lowest id
    async with app.state.sessionmaker() as s:
        await s.execute(update(HistoryItem).where(HistoryItem.id == a)
                        .values(created_at=datetime.now(timezone.utc) + timedelta(hours=1)))
        await s.commit()
    body = (await client.get("/api/history", headers=H(client_id))).json()
    assert [i["id"] for i in body["items"]][0] == a
    assert {i["id"] for i in body["items"]} == {a, b, c}
    item = body["items"][0]
    assert set(item) == {"id", "direction", "lang", "text", "signs", "created_at"}
    assert item["signs"] == ["привет", "утро"]
    assert item["created_at"].endswith("Z")
    datetime.fromisoformat(item["created_at"].replace("Z", "+00:00"))

    body = (await client.get("/api/history", headers=H(client_id),
                             params={"direction": "speech_to_text"})).json()
    assert body["total"] == 1
    assert body["items"][0] == {**body["items"][0], "id": b, "lang": "uz", "text": "Salom", "signs": None}

    body = (await client.get("/api/history", headers=H(client_id), params={"limit": 1, "offset": 1})).json()
    assert body["total"] == 3 and len(body["items"]) == 1

    r = await client.get("/api/history", headers=H(client_id), params={"direction": "x"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_request"


async def test_delete_one_and_all(app, client, client_id):
    a = await _save(app, client_id)
    await _save(app, client_id)
    other = str(uuid.uuid4())
    o = await _save(app, other)

    r = await client.delete(f"/api/history/{o}", headers=H(client_id))
    assert r.status_code == 404 and r.json()["error"]["code"] == "not_found"
    r = await client.delete("/api/history/999999", headers=H(client_id))
    assert r.status_code == 404

    r = await client.delete(f"/api/history/{a}", headers=H(client_id))
    assert r.status_code == 204
    ids = [i["id"] for i in (await client.get("/api/history", headers=H(client_id))).json()["items"]]
    assert a not in ids and len(ids) == 1

    r = await client.delete("/api/history", headers=H(client_id))
    assert r.status_code == 204
    assert (await client.get("/api/history", headers=H(client_id))).json()["total"] == 0
    assert (await client.get("/api/history", headers=H(other))).json()["total"] == 1


async def test_history_requires_client_id(client):
    for method, url in [("GET", "/api/history"), ("DELETE", "/api/history"), ("DELETE", "/api/history/1")]:
        r = await client.request(method, url)
        assert r.status_code == 400, (method, url)
        assert r.json()["error"]["code"] == "invalid_client_id"
    r = await client.get("/api/history", headers={"X-Client-Id": "bad"})
    assert r.status_code == 400
