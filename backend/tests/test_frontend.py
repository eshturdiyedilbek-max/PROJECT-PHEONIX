"""The API server also serves the website (frontend/) at /, without shadowing the API."""

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
async def site(settings):
    app = create_app(settings.model_copy(update={"serve_frontend": True}))
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c


async def test_root_serves_website(site):
    r = await site.get("/")
    assert r.status_code == 200
    assert "text/html" in r.headers["content-type"]
    assert "Phoenix" in r.text


async def test_static_assets_served(site):
    r = await site.get("/js/main.js")
    assert r.status_code == 200
    assert "javascript" in r.headers["content-type"]


async def test_api_routes_keep_priority(site):
    r = await site.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


async def test_unknown_api_path_is_json_404(site):
    r = await site.get("/api/does-not-exist")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"


def test_frontend_can_be_turned_off(tmp_path):
    app = create_app(Settings(database_url=f"sqlite+aiosqlite:///{tmp_path / 't.db'}", load_models=False,
                              serve_frontend=False, gemini_api_key=""))
    assert not any(getattr(r, "name", None) == "frontend" for r in app.routes)


def test_missing_frontend_dir_is_ignored(tmp_path):
    app = create_app(Settings(database_url=f"sqlite+aiosqlite:///{tmp_path / 't.db'}", load_models=False,
                              frontend_dir=str(tmp_path / "nope"), gemini_api_key=""))
    assert not any(getattr(r, "name", None) == "frontend" for r in app.routes)
