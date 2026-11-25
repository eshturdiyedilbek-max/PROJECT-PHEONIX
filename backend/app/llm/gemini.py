"""Minimal Gemini (Google AI Studio) REST client with retries and model fallback.

Sync on purpose: callers run it in a thread pool, like the other model engines.
"""

import base64
import json
import logging
import time
from dataclasses import dataclass

import httpx

log = logging.getLogger("phoenix.gemini")

API_BASE = "https://generativelanguage.googleapis.com/v1beta"
RETRYABLE = {429, 500, 502, 503, 504}


class GeminiError(RuntimeError):
    """Gemini could not produce an answer (all models/attempts failed or answer unusable)."""


@dataclass(frozen=True)
class AudioPart:
    data: bytes
    mime_type: str


class GeminiClient:
    def __init__(
        self,
        api_key: str,
        models: list[str],
        timeout_s: float = 30.0,
        attempts_per_model: int = 2,
        backoff_s: float = 0.8,
        transport: httpx.BaseTransport | None = None,
    ):
        if not api_key:
            raise ValueError("GEMINI_API_KEY is empty")
        if not models:
            raise ValueError("at least one Gemini model is required")
        self.models = models
        self.attempts_per_model = attempts_per_model
        self.backoff_s = backoff_s
        self._http = httpx.Client(
            base_url=API_BASE,
            timeout=timeout_s,
            headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
            transport=transport,
        )

    def close(self) -> None:
        self._http.close()

    def generate_json(
        self,
        prompt: str,
        schema: dict,
        *,
        system: str | None = None,
        audio: AudioPart | None = None,
        temperature: float = 0.2,
        max_output_tokens: int = 2048,
        models: list[str] | None = None,
    ) -> tuple[dict, str]:
        """Ask for a JSON answer matching `schema`. Returns (parsed_json, model_used).

        max_output_tokens includes the model's hidden "thinking" tokens on newer models, so keep
        it generous (a 256 limit produced empty answers in live tests).
        """
        parts: list[dict] = []
        if audio is not None:
            parts.append({"inline_data": {"mime_type": audio.mime_type,
                                          "data": base64.b64encode(audio.data).decode("ascii")}})
        parts.append({"text": prompt})
        body: dict = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_output_tokens,
                "responseMimeType": "application/json",
                "responseSchema": schema,
            },
        }
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}

        last_error = "no attempt made"
        for model in models or self.models:
            for attempt in range(self.attempts_per_model):
                try:
                    r = self._http.post(f"/models/{model}:generateContent", json=body)
                except httpx.HTTPError as e:
                    last_error = f"{model}: {type(e).__name__}"
                    log.warning("gemini %s request failed: %s", model, e)
                    self._sleep(attempt)
                    continue
                if r.status_code == 200:
                    try:
                        return self._parse(r.json()), model
                    except (ValueError, KeyError, IndexError, TypeError) as e:
                        last_error = f"{model}: unusable answer ({e})"
                        log.warning("gemini %s gave an unusable answer: %s", model, e)
                        break  # same model would likely answer the same way; try the next one
                last_error = f"{model}: HTTP {r.status_code}"
                log.warning("gemini %s HTTP %s: %s", model, r.status_code, r.text[:300])
                if r.status_code in (401, 403):
                    raise GeminiError(f"Gemini rejected the API key (HTTP {r.status_code})")
                if r.status_code not in RETRYABLE:
                    break  # 400/404 etc: this model won't work, move to the next
                self._sleep(attempt)
        raise GeminiError(f"Gemini unavailable ({last_error})")

    def _sleep(self, attempt: int) -> None:
        if attempt + 1 < self.attempts_per_model:
            time.sleep(self.backoff_s * (2 ** attempt))

    @staticmethod
    def _parse(payload: dict) -> dict:
        cand = payload["candidates"][0]
        text = "".join(p.get("text", "") for p in cand["content"]["parts"])
        data = json.loads(text)
        if not isinstance(data, dict):
            raise ValueError("answer is not a JSON object")
        return data


def load_gemini(settings) -> GeminiClient | None:
    if not settings.gemini_api_key:
        return None
    models = [m.strip() for m in settings.gemini_models.split(",") if m.strip()]
    try:
        return GeminiClient(settings.gemini_api_key, models, timeout_s=settings.gemini_timeout_s)
    except Exception:
        log.warning("Gemini client could not be created", exc_info=True)
        return None
