import asyncio
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.db import init_db, make_engine, make_sessionmaker, seed_dictionary
from app.errors import install_error_handlers
from app.sign.classes import load_classes
from app.sign.registry import registry_for
from app.stt.engine import default_engine_name

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
log = logging.getLogger("phoenix")


def load_sign_recognizers(settings: Settings) -> dict:
    from app.sign.recognizer import load_sign_recognizers as _load

    return _load(settings)


def load_gemini(settings: Settings):
    from app.llm.gemini import load_gemini as _load

    return _load(settings)


def load_stt_engines(settings: Settings, gemini) -> dict:
    from app.stt.engine import load_stt_engines as _load

    return _load(settings, gemini)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    registry = registry_for(settings)  # fail fast on a bad sign_languages.json / SIGN_VARIANTS

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
        engine = make_engine(settings.database_url)
        app.state.engine = engine
        app.state.sessionmaker = make_sessionmaker(engine)
        await init_db(engine)
        async with app.state.sessionmaker() as s:
            for code, spec in registry.items():
                await seed_dictionary(s, load_classes(spec.classes_path), lang=code,
                                      no_sign_label=spec.no_sign_label)
        if settings.load_models:
            app.state.sign_recognizers = load_sign_recognizers(settings)
            app.state.gemini = load_gemini(settings)
            app.state.stt_engines = load_stt_engines(settings, app.state.gemini)
            for code, spec in registry.items():
                log.info("sign model %s (%s): %s", code, spec.variant.name,
                         "loaded" if code in app.state.sign_recognizers else "MISSING")
            log.info("gemini: %s", "configured" if app.state.gemini else "not configured")
            log.info("stt engines: %s (default %s)", sorted(app.state.stt_engines) or "NONE",
                     default_engine_name(settings, app.state.stt_engines))
        yield
        if app.state.gemini is not None:
            app.state.gemini.close()
        await engine.dispose()

    app = FastAPI(title="Phoenix Backend", version="0.2.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.registry = registry
    app.state.sign_recognizers = {}
    app.state.stt_engines = {}
    app.state.gemini = None
    app.state.inference_semaphore = asyncio.Semaphore(settings.max_concurrent_inferences)
    app.state.stt_semaphore = asyncio.Semaphore(settings.max_concurrent_stt)
    app.state.ws_connections = 0
    from app.auth.providers import verify_github, verify_google

    app.state.verify_google = verify_google  # tests swap these for fakes
    app.state.verify_github = verify_github

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    install_error_handlers(app)

    from app.api import contributions, dictionary, history, meta, sentence
    from app.auth import router as auth
    from app.sign import ws as sign_ws
    from app.stt import router as stt

    for module in (meta, auth, dictionary, history, contributions, sentence, stt, sign_ws):
        app.include_router(module.router)
    mount_frontend(app, settings)
    return app


def mount_frontend(app: FastAPI, settings: Settings) -> None:
    """Serve the website (frontend/) and its design resources from the API server itself.

    Mounted last, so /api/*, /ws/* and /docs keep priority. Same origin means no CORS setup
    for the demo and one public URL from the Colab tunnel.
    """
    if not settings.serve_frontend:
        return
    from fastapi.staticfiles import StaticFiles

    repo_root = Path(__file__).resolve().parents[2]
    web = Path(settings.frontend_dir) if settings.frontend_dir else repo_root / "frontend"
    if not (web / "index.html").is_file():
        log.info("frontend: not found at %s, serving the API only", web)
        return
    app.mount("/", StaticFiles(directory=web, html=True), name="frontend")
    log.info("frontend: serving %s at /", web)


app = create_app()
