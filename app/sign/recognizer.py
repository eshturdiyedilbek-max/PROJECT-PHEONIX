"""ONNX Runtime wrapper around the Slovo sign recognition model."""

import logging
import os
from dataclasses import dataclass, field

import numpy as np

from app.sign.classes import load_classes

logger = logging.getLogger(__name__)


@dataclass
class Prediction:
    text: str
    confidence: float
    alternatives: list[tuple[str, float]] = field(default_factory=list)


def _to_probs(scores: np.ndarray) -> np.ndarray:
    scores = scores.astype(np.float64)
    if scores.min() >= 0.0 and scores.max() <= 1.0 and abs(scores.sum() - 1.0) < 1e-3:
        return scores
    e = np.exp(scores - scores.max())
    return e / e.sum()


class SignRecognizer:
    def __init__(self, model_path: str, classes: list[str], name: str):
        import onnxruntime as ort

        available = ort.get_available_providers()
        providers = (
            ["CUDAExecutionProvider", "CPUExecutionProvider"]
            if "CUDAExecutionProvider" in available
            else ["CPUExecutionProvider"]
        )
        self.session = ort.InferenceSession(model_path, providers=providers)
        self.name = name
        self.classes = classes
        inp = self.session.get_inputs()[0]
        self.input_name = inp.name
        self.output_name = self.session.get_outputs()[0].name
        window = inp.shape[3]
        if not isinstance(window, int) or window <= 0:
            raise ValueError(f"model input has no static window dimension: {inp.shape}")
        self._window = window

    @property
    def window(self) -> int:
        return self._window

    def predict(self, frames: list[np.ndarray]) -> Prediction:
        if len(frames) != self._window:
            raise ValueError(f"expected {self._window} frames, got {len(frames)}")
        clip = np.stack(frames, axis=1)[None][None].astype(np.float32, copy=False)  # [1,1,3,T,224,224]
        out = self.session.run([self.output_name], {self.input_name: clip})[0]
        probs = _to_probs(np.asarray(out).reshape(-1))
        n = min(len(probs), len(self.classes))
        probs = probs[:n]
        order = np.argsort(-probs)[:4]
        best = int(order[0])
        return Prediction(
            text=self.classes[best],
            confidence=float(probs[best]),
            alternatives=[(self.classes[int(i)], float(probs[int(i)])) for i in order[1:4]],
        )


def load_sign_recognizer(settings) -> SignRecognizer | None:
    path = settings.sign_model_path
    if not os.path.isfile(path):
        logger.warning("Sign model not found at %s; sign recognition disabled", path)
        return None
    try:
        classes = load_classes(settings.sign_classes_path)
        return SignRecognizer(path, classes, settings.sign_model_name)
    except Exception:
        logger.warning("Failed to load sign model from %s; sign recognition disabled", path, exc_info=True)
        return None
