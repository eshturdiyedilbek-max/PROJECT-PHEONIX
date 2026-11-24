import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.db import init_db, make_engine, make_sessionmaker, seed_dictionary
from app.errors import install_error_handlers
from app.sign.classes import load_classes

log = logging.getLogger("phoenix")


def load_sign_recognizer(settings: Settings):
    """Return a SignRecognizer, or None if weights are missing / fail to load."""
    try:
        from app.sign.recognizer import load_sign_recognizer as _load
    except ImportError:
        return None
    return _load(settings)


def load_stt_engine(settings: Settings):
    """Return an SttEngine, or None if the model can't be loaded."""
    try:
        from app.stt.engine import load_stt_engine as _load
    except ImportError:
        return None
    return _load(settings)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
        engine = make_engine(settings.database_url)
        app.state.engine = engine
        app.state.sessionmaker = make_sessionmaker(engine)
        await init_db(engine)
        async with app.state.sessionmaker() as s:
            await seed_dictionary(s, load_classes(settings.sign_classes_path))
        if settings.load_models:
            app.state.sign_recognizer = load_sign_recognizer(settings)
            app.state.stt_engine = load_stt_engine(settings)
            log.info("sign model: %s, stt model: %s",
                     "loaded" if app.state.sign_recognizer else "MISSING",
                     "loaded" if app.state.stt_engine else "MISSING")
        yield
        await engine.dispose()

    app = FastAPI(title="Phoenix Backend", version="0.1.0", lifespan=lifespan)
    app.state.settings = settings
    app.state.sign_recognizer = None
    app.state.stt_engine = None

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    install_error_handlers(app)

    from app.api import meta

    app.include_router(meta.router)
    # ROUTERS (tasks 3-5 register their routers below)
    return app


app = create_app()
