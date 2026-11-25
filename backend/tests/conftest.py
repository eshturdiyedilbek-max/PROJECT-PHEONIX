import os
import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def settings(tmp_path) -> Settings:
    # Set TEST_DATABASE_URL=postgresql+asyncpg://... to run the suite against Postgres.
    return Settings(
        database_url=os.environ.get("TEST_DATABASE_URL") or f"sqlite+aiosqlite:///{tmp_path / 'test.db'}",
        upload_dir=str(tmp_path / "uploads"),
        load_models=False,
        ws_frame_rate_slack=100.0,
        serve_frontend=False,  # tests add routes after create_app; test_frontend.py turns the site on
        gemini_api_key="",  # never call the real API from tests (repo .env may hold a key)  # tests push frames as fast as possible
    )


@pytest.fixture
def app(settings):
    yield create_app(settings)
    if os.environ.get("TEST_DATABASE_URL"):
        import asyncio

        from app.db import Base, make_engine

        async def _drop():
            engine = make_engine(settings.database_url)
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)
            await engine.dispose()

        asyncio.run(_drop())


@pytest.fixture
async def client(app):
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c


@pytest.fixture
def client_id() -> str:
    return str(uuid.uuid4())
