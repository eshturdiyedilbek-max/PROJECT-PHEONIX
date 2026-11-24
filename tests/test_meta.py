import uuid

from fastapi import Depends
from sqlalchemy import func, select

from app.deps import require_client_id
from app.models import DictionaryEntry
from app.sign.classes import categorize, load_classes


async def test_health_reports_missing_models(client):
    r = await client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["sign_model"] == "missing"
    assert body["stt_model"] == "missing"


async def test_languages_lists_rsl(client):
    r = await client.get("/api/languages")
    assert r.status_code == 200
    body = r.json()
    assert body["sign_languages"][0] == {
        "code": "rsl", "name": "Русский жестовый язык", "classes": 1000, "available": False,
    }
    assert [l["code"] for l in body["speech_languages"]] == ["uz", "ru", "en"]


def test_categorize():
    assert categorize("А") == "letter"
    assert categorize("привет") == "word"
    assert categorize("в то время как") == "phrase"


async def test_seed_dictionary_is_idempotent(app, client):
    from app.db import seed_dictionary

    classes = load_classes(app.state.settings.sign_classes_path)
    async with app.state.sessionmaker() as s:
        await seed_dictionary(s, classes)
        await seed_dictionary(s, classes)
        n = await s.scalar(select(func.count()).select_from(DictionaryEntry))
    assert n == 1000


async def test_unknown_client_id_error_shape(app, client):
    @app.get("/api/_test_client")
    async def _t(cid: uuid.UUID = Depends(require_client_id)):
        return {"cid": str(cid)}

    r = await client.get("/api/_test_client", headers={"X-Client-Id": "nope"})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "invalid_client_id"
    r = await client.get("/api/_test_client", headers={"X-Client-Id": str(uuid.uuid4())})
    assert r.status_code == 200
