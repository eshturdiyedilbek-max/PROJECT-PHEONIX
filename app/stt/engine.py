import logging
from dataclasses import dataclass
from typing import Protocol

try:  # optional at import time so the app (and tests) start without it
    from faster_whisper import WhisperModel
except ImportError:  # pragma: no cover
    WhisperModel = None

log = logging.getLogger("phoenix.stt")


@dataclass
class SttSegment:
    start: float
    end: float
    text: str


@dataclass
class SttResult:
    text: str
    language: str
    duration: float
    segments: list[SttSegment]


class SttEngine(Protocol):
    def transcribe(self, path: str, language: str | None) -> SttResult: ...


class FasterWhisperEngine:
    def __init__(self, model: str, device: str, compute_type: str):
        if WhisperModel is None:
            raise RuntimeError("faster-whisper is not installed")
        self._model = WhisperModel(model, device=device, compute_type=compute_type)

    def transcribe(self, path: str, language: str | None) -> SttResult:
        seg_iter, info = self._model.transcribe(path, language=language, vad_filter=True, beam_size=1)
        segments = [
            SttSegment(start=float(s.start), end=float(s.end), text=s.text.strip())
            for s in seg_iter  # generator: decoding actually happens here
        ]
        text = " ".join(s.text for s in segments if s.text)
        return SttResult(
            text=text,
            language=info.language,
            duration=float(info.duration),
            segments=segments,
        )


def load_stt_engine(settings) -> SttEngine | None:
    try:
        return FasterWhisperEngine(settings.stt_model, settings.stt_device, settings.stt_compute_type)
    except Exception as exc:  # noqa: BLE001 - any failure means "model missing"
        log.warning("STT model %r could not be loaded: %s", settings.stt_model, exc)
        return None
