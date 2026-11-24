from fastapi import APIRouter, Request

from app.sign.classes import NO_SIGN, load_classes

router = APIRouter(prefix="/api", tags=["meta"])

VERSION = "0.1.0"
SPEECH_LANGUAGES = [
    {"code": "uz", "name": "O'zbekcha"},
    {"code": "ru", "name": "Русский"},
    {"code": "en", "name": "English"},
]


@router.get("/health")
async def health(request: Request):
    st = request.app.state
    return {
        "status": "ok",
        "sign_model": "loaded" if st.sign_recognizer is not None else "missing",
        "stt_model": "loaded" if st.stt_engine is not None else "missing",
        "version": VERSION,
    }


@router.get("/languages")
async def languages(request: Request):
    st = request.app.state
    classes = load_classes(st.settings.sign_classes_path)
    return {
        "sign_languages": [
            {
                "code": "rsl",
                "name": "Русский жестовый язык",
                "classes": sum(1 for c in classes if c != NO_SIGN),
                "available": st.sign_recognizer is not None,
            }
        ],
        "speech_languages": SPEECH_LANGUAGES,
    }
