"""ONNX Runtime wrapper around a video sign-recognition model (Slovo-style)."""

import logging
import os
from dataclasses import dataclass, field

import numpy as np

from app.sign.classes import NO_SIGN, load_classes
from app.sign.preprocess import DEFAULT_PREPROCESS, PreprocessConfig, to_model_frame

logger = logging.getLogger(__name__)

# Supported input layouts (T = frames). "auto" picks from the ONNX input shape.
LAYOUTS = {"N1CTHW": 6, "NCTHW": 5, "NTCHW": 5}


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


def detect_layout(shape: list) -> str:
    rank = len(shape)
    if rank == 6:
        return "N1CTHW"
    if rank == 5:
        if shape[1] == 3:
            return "NCTHW"
        if shape[2] == 3:
            return "NTCHW"
    raise ValueError(f"unsupported model input shape {shape}; expected [1,1,3,T,H,W], [1,3,T,H,W] or [1,T,3,H,W]")


def _static(v) -> int | None:
    return v if isinstance(v, int) and v > 0 else None


class SignRecognizer:
    def __init__(
        self,
        model_path: str,
        classes: list[str],
        name: str,
        *,
        layout: str = "auto",
        window: int | None = None,
        target_fps: float = 15.0,
        no_sign_label: str | None = NO_SIGN,
        preprocess: PreprocessConfig = DEFAULT_PREPROCESS,
    ):
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
        self.target_fps = float(target_fps)
        self.no_sign_label = no_sign_label
        inp = self.session.get_inputs()[0]
        self.input_name = inp.name
        self.output_name = self.session.get_outputs()[0].name
        shape = list(inp.shape)
        self.layout = detect_layout(shape) if layout == "auto" else layout
        if self.layout not in LAYOUTS or len(shape) != LAYOUTS[self.layout]:
            raise ValueError(f"layout {self.layout} does not match model input shape {shape}")
        t_axis = {"N1CTHW": 3, "NCTHW": 2, "NTCHW": 1}[self.layout]
        win = _static(shape[t_axis]) or window
        if not win:
            raise ValueError(f"model input has no static window dimension and none configured: {shape}")
        self._window = int(win)
        size = _static(shape[-1])
        self.preprocess = (
            preprocess if size in (None, preprocess.size)
            else PreprocessConfig(size=size, mean=preprocess.mean, std=preprocess.std, pad_value=preprocess.pad_value)
        )
        out_shape = self.session.get_outputs()[0].shape
        n_out = _static(out_shape[-1]) if out_shape else None
        if n_out is not None and n_out != len(classes):
            logger.warning("model %s has %d outputs but %d class labels", name, n_out, len(classes))

    @property
    def window(self) -> int:
        return self._window

    def to_frame(self, img_bgr: np.ndarray) -> np.ndarray:
        return to_model_frame(img_bgr, self.preprocess)

    def _clip(self, frames: list[np.ndarray]) -> np.ndarray:
        if self.layout == "N1CTHW":
            clip = np.stack(frames, axis=1)[None][None]  # [1,1,3,T,H,W]
        elif self.layout == "NCTHW":
            clip = np.stack(frames, axis=1)[None]  # [1,3,T,H,W]
        else:
            clip = np.stack(frames, axis=0)[None]  # [1,T,3,H,W]
        return clip.astype(np.float32, copy=False)

    def predict(self, frames: list[np.ndarray]) -> Prediction:
        if len(frames) != self._window:
            raise ValueError(f"expected {self._window} frames, got {len(frames)}")
        out = self.session.run([self.output_name], {self.input_name: self._clip(frames)})[0]
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


def load_recognizer_for(spec) -> SignRecognizer | None:
    """Build the recognizer for one SignLanguageSpec, or None if its weights are missing/broken."""
    path = spec.variant.model_path
    if not os.path.isfile(path):
        logger.warning("%s model %s not found at %s; run scripts/download_models.sh",
                       spec.code, spec.variant.name, path)
        return None
    try:
        return SignRecognizer(
            path,
            load_classes(spec.classes_path),
            spec.variant.name,
            target_fps=spec.target_fps,
            no_sign_label=spec.no_sign_label,
        )
    except Exception:
        logger.warning("failed to load %s model from %s", spec.code, path, exc_info=True)
        return None


def load_sign_recognizers(settings) -> dict[str, SignRecognizer]:
    """Load every configured language; languages whose model is missing are left out."""
    from app.sign.registry import registry_for

    loaded: dict[str, SignRecognizer] = {}
    for code, spec in registry_for(settings).items():
        rec = load_recognizer_for(spec)
        if rec is not None:
            loaded[code] = rec
    return loaded
