import logging
import os
import tempfile

from fastapi import APIRouter, Depends, File, Form, Header, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.deps import bearer_token, get_db, resolve_client_id
from app.errors import ApiError
from app.history_store import save_history as store_history
from app.llm.gemini import GeminiError
from app.stt.audio import audio_duration
from app.stt.engine import STT_ENGINES, default_engine_name

log = logging.getLogger("phoenix.stt")

router = APIRouter(prefix="/api", tags=["stt"])

MAX_BYTES = 10 * 1024 * 1024
MAX_DURATION = 60.0
LANGUAGES = {"uz", "ru", "en"}
EXTENSIONS = {"webm", "ogg", "wav", "mp3", "m4a"}
CHUNK = 64 * 1024


def _extension(filename: str | None) -> str:
    if not filename or "." not in filename:
        return ""
    return filename.rsplit(".", 1)[1].lower()


def _is_audio(upload: UploadFile) -> bool:
    ctype = (upload.content_type or "").split(";", 1)[0].strip().lower()
    if ctype.startswith("audio/") or ctype == "video/webm":
        return True
    return _extension(upload.filename) in EXTENSIONS


@router.post("/stt")
async def speech_to_text(
    request: Request,
    audio: UploadFile = File(...),
    language: str | None = Form(None),
    save_history: bool = Form(False),
    engine: str | None = Form(None),
    x_client_id: str | None = Header(None),
    token: str | None = Depends(bearer_token),
    db: AsyncSession = Depends(get_db),
):
    engines = request.app.state.stt_engines
    engine_name = (engine or "").strip().lower() or default_engine_name(request.app.state.settings, engines)
    if engine and engine_name not in STT_ENGINES:
        raise ApiError(400, "invalid_request", "engine must be whisper or gemini")
    if engine_name is None or engine_name not in engines:
        what = f"engine '{engine_name}'" if engine_name else "model"
        raise ApiError(503, "model_unavailable", f"Speech-to-text {what} is not available")

    language = (language or "").strip().lower() or None
    if language is not None and language not in LANGUAGES:
        raise ApiError(400, "invalid_request", "language must be one of uz, ru, en")

    if not _is_audio(audio):
        raise ApiError(415, "unsupported_media_type", "audio must be webm, ogg, wav, mp3 or m4a")

    ext = _extension(audio.filename)
    fd, path = tempfile.mkstemp(prefix="stt-", suffix=f".{ext}" if ext in EXTENSIONS else "")
    try:
        size = 0
        with os.fdopen(fd, "wb") as out:
            while chunk := await audio.read(CHUNK):
                size += len(chunk)
                if size > MAX_BYTES:
                    raise ApiError(413, "file_too_large", "audio must be at most 10 MB")
                out.write(chunk)

        client_id = None
        if save_history:
            client_id = await resolve_client_id(db, token, x_client_id)
            if client_id is None:
                raise ApiError(400, "invalid_client_id", "X-Client-Id header must be a UUID")

        duration = await run_in_threadpool(audio_duration, path)
        if duration is not None and duration > MAX_DURATION:  # check before spending model time
            raise ApiError(400, "invalid_request", "audio must be at most 60 seconds")

        result, engine_name = await _transcribe(request, engines, engine_name, path, language,
                                                explicit=bool(engine))
    finally:
        try:
            os.unlink(path)
        except FileNotFoundError:
            pass

    if result.duration > MAX_DURATION:
        raise ApiError(400, "invalid_request", "audio must be at most 60 seconds")

    history_id = None
    if save_history and result.text:
        history_id = await store_history(db, client_id, "speech_to_text", result.language, result.text, None)

    return {
        "text": result.text,
        "language": result.language,
        "duration": result.duration,
        "segments": [{"start": s.start, "end": s.end, "text": s.text} for s in result.segments],
        "history_id": history_id,
        "engine": engine_name,
    }


async def _transcribe(request: Request, engines: dict, name: str, path: str, language: str | None,
                      explicit: bool):
    """Run the chosen engine; if Gemini fails and the client didn't insist on it, fall back to Whisper."""
    try:
        async with request.app.state.stt_semaphore:  # models are heavy; queue instead of thrashing
            return await run_in_threadpool(engines[name].transcribe, path, language), name
    except GeminiError as e:
        if not explicit and name != "whisper" and "whisper" in engines:
            log.warning("gemini STT failed (%s); falling back to whisper", e)
            async with request.app.state.stt_semaphore:
                return await run_in_threadpool(engines["whisper"].transcribe, path, language), "whisper"
        raise ApiError(502, "upstream_error", "Speech service is temporarily unavailable; try again") from e
