"""POST /api/sentence: recognized sign words -> natural sentence (Gemini), with safe fallback."""

from typing import Literal

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field, field_validator
from starlette.concurrency import run_in_threadpool

from app.errors import ApiError
from app.llm.sentence import smooth_sentence

router = APIRouter(prefix="/api", tags=["sentence"])


class SentenceIn(BaseModel):
    signs: list[str] = Field(..., min_length=1, max_length=50)
    sign_lang: str = "rsl"
    target_lang: Literal["ru", "en", "uz"] | None = None

    @field_validator("signs")
    @classmethod
    def _short_words(cls, v: list[str]) -> list[str]:
        if any(len(s) > 100 for s in v):
            raise ValueError("each sign must be at most 100 characters")
        return v


@router.post("/sentence")
async def make_sentence(body: SentenceIn, request: Request):
    spec = request.app.state.registry.get(body.sign_lang)
    if spec is None:
        raise ApiError(400, "unsupported_language", f"Sign language '{body.sign_lang}' is not available")
    target = body.target_lang or spec.text_lang
    sentence, smoothed, model = await run_in_threadpool(
        smooth_sentence, request.app.state.gemini, body.signs, body.sign_lang, target,
        request.app.state.settings.sentence_model_list,
    )
    return {
        "sentence": sentence,
        "source_text": " ".join(s.strip() for s in body.signs if s.strip()),
        "target_lang": target,
        "smoothed": smoothed,
        "model": model,
    }
