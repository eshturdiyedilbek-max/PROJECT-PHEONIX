import pytest



async def test_list_paginates(client):
    r = await client.get("/api/dictionary", params={"limit": 10})
    assert r.status_code == 200
    body = r.json()
    assert len(body["items"]) == 10
    assert body["total"] == 1000
    assert body["limit"] == 10 and body["offset"] == 0
    ids = [i["id"] for i in body["items"]]
    assert ids == sorted(ids)
    item = body["items"][0]
    assert set(item) == {"id", "lang", "text", "category", "translations", "video_url"}
    assert item["translations"] == {"ru": item["text"], "en": None, "uz": None}
    r2 = await client.get("/api/dictionary", params={"limit": 10, "offset": 10})
    assert r2.json()["items"][0]["id"] not in ids


async def test_default_limit(client):
    body = (await client.get("/api/dictionary")).json()
    assert body["limit"] == 50 and len(body["items"]) == 50


async def test_search(client):
    # case-insensitive substring: lowercase query matches "Привет!"
    r = await client.get("/api/dictionary", params={"q": "привет"})
    assert r.status_code == 200
    texts = [i["text"] for i in r.json()["items"]]
    assert "Привет!" in texts
    assert all("привет" in t.lower() for t in texts)


async def test_search_escapes_wildcards(client):
    r = await client.get("/api/dictionary", params={"q": "%"})
    assert r.json()["total"] == 0


async def test_category_filter(app, client):
    from app.sign.classes import NO_SIGN, categorize, load_classes

    classes = [c for c in load_classes("data/rsl_classes.json") if c != NO_SIGN]
    for cat in ("letter", "word", "phrase"):
        r = await client.get("/api/dictionary", params={"category": cat, "limit": 1})
        assert r.json()["total"] == sum(categorize(c) == cat for c in classes)
    r = await client.get("/api/dictionary", params={"category": "letter", "limit": 200})
    body = r.json()
    # 33 letters of the fingerspelling alphabet
    assert body["total"] == 33
    assert all(i["category"] == "letter" for i in body["items"])


async def test_bad_category(client):
    r = await client.get("/api/dictionary", params={"category": "nope"})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "invalid_request"


async def test_get_by_id_and_404(client):
    first = (await client.get("/api/dictionary", params={"limit": 1})).json()["items"][0]
    r = await client.get(f"/api/dictionary/{first['id']}")
    assert r.status_code == 200
    assert r.json() == first
    r = await client.get("/api/dictionary/999999")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"


@pytest.mark.parametrize("params", [{"limit": 500}, {"limit": 0}, {"offset": -1}])
async def test_limit_bounds(client, params):
    r = await client.get("/api/dictionary", params=params)
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "invalid_request"


async def test_asl_dictionary_is_english(client):
    r = await client.get("/api/dictionary", params={"lang": "asl", "q": "hello"})
    body = r.json()
    item = next(i for i in body["items"] if i["text"] == "hello")
    assert item["lang"] == "asl" and item["translations"]["en"] == "hello" and item["translations"]["ru"] is None
    assert (await client.get("/api/dictionary", params={"lang": "asl"})).json()["total"] == 2000
