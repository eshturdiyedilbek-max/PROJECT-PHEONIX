import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.history import iso_utc
from app.deps import get_db, require_client_id
from app.errors import ApiError
from app.models import Contribution, DictionaryEntry

router = APIRouter(prefix="/api", tags=["contributions"])

MAX_BYTES = 20 * 1024 * 1024
CHUNK = 1024 * 1024
EXTENSIONS = {"video/webm": "webm", "video/mp4": "mp4"}


@router.post("/contributions", status_code=201)
async def create_contribution(
    request: Request,
    video: UploadFile = File(...),
    entry_id: int = Form(...),
    consent: bool = Form(False),
    client_id: uuid.UUID = Depends(require_client_id),
    db: AsyncSession = Depends(get_db),
):
    if consent is not True:
        raise ApiError(400, "invalid_request", "consent must be true")
    ctype = (video.content_type or "").split(";")[0].strip().lower()
    ext = EXTENSIONS.get(ctype)
    if ext is None:
        raise ApiError(415, "unsupported_media_type", "video must be video/webm or video/mp4")
    if await db.get(DictionaryEntry, entry_id) is None:
        raise ApiError(404, "not_found", "Dictionary entry not found")

    settings = request.app.state.settings
    out_dir = Path(settings.upload_dir) / "contributions"
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{uuid.uuid4()}.{ext}"
    size = 0
    try:
        with path.open("wb") as f:
            while chunk := await video.read(CHUNK):
                size += len(chunk)
                if size > MAX_BYTES:
                    raise ApiError(413, "file_too_large", "video must be at most 20 MB")
                f.write(chunk)
    except BaseException:
        path.unlink(missing_ok=True)
        raise

    c = Contribution(client_id=client_id, entry_id=entry_id, file_path=str(path), status="pending")
    db.add(c)
    try:
        await db.commit()
    except BaseException:
        path.unlink(missing_ok=True)
        raise
    return {"id": c.id, "entry_id": c.entry_id, "status": c.status, "created_at": iso_utc(c.created_at)}
