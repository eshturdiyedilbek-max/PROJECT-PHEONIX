import os
import tempfile

from fastapi import APIRouter, Depends, File, Form, Header, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.deps import get_db, parse_client_id
from app.errors import ApiError
from app.history_store import save_history as store_history

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
    x_client_id: str | None = Header(None),
    db: AsyncSession = Depends(get_db),
):
    engine = request.app.state.stt_engine
    if engine is None:
        raise ApiError(503, "model_unavailable", "Speech-to-text model is not loaded")

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
            client_id = parse_client_id(x_client_id)
            if client_id is None:
                raise ApiError(400, "invalid_client_id", "X-Client-Id header must be a UUID")

        async with request.app.state.stt_semaphore:  # Whisper is CPU/GPU heavy; queue instead of thrashing
            result = await run_in_threadpool(engine.transcribe, path, language)
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
    }
