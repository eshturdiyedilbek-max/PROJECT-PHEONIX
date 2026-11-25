from fastapi import APIRouter, Request

from app.sign.classes import load_classes
from app.stt.engine import default_engine_name

router = APIRouter(prefix="/api", tags=["meta"])

VERSION = "0.2.0"
SPEECH_LANGUAGES = [
    {"code": "uz", "name": "O'zbekcha"},
    {"code": "ru", "name": "Русский"},
    {"code": "en", "name": "English"},
]


@router.get("/health")
async def health(request: Request):
    st = request.app.state
    per_lang = {code: ("loaded" if code in st.sign_recognizers else "missing") for code in st.registry}
    return {
        "status": "ok",
        "sign_model": "loaded" if st.sign_recognizers else "missing",
        "sign_models": per_lang,
        "sign_devices": {code: getattr(rec, "device", "cpu") for code, rec in st.sign_recognizers.items()},
        "stt_model": "loaded" if st.stt_engines else "missing",
        "stt_engines": sorted(st.stt_engines),
        "stt_default": default_engine_name(st.settings, st.stt_engines),
        "sentence_smoothing": st.gemini is not None,
        "version": VERSION,
    }


@router.get("/languages")
async def languages(request: Request):
    st = request.app.state
    out = []
    for code, spec in st.registry.items():
        classes = load_classes(spec.classes_path)
        out.append({
            "code": code,
            "name": spec.name,
            "english_name": spec.english_name,
            "classes": sum(1 for c in classes if c != spec.no_sign_label),
            "available": code in st.sign_recognizers,
            "text_lang": spec.text_lang,
            "tts_lang": spec.tts_lang,
            "model": spec.variant.name,
            "commercial_use": spec.commercial_use,
        })
    return {"sign_languages": out, "speech_languages": SPEECH_LANGUAGES}
