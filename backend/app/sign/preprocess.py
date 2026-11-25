"""Frame decoding and preprocessing (defaults match Slovo demo.py)."""

from dataclasses import dataclass

import cv2
import numpy as np

MAX_FRAME_BYTES = 300_000
MAX_FRAME_PIXELS = 4096 * 4096  # refuse decompression bombs before decoding
MODEL_SIZE = 224
PAD_VALUE = 114
MEAN = (123.675, 116.28, 103.53)
STD = (58.395, 57.12, 57.375)


class BadFrame(ValueError):
    """Raised when binary frame data is not a usable JPEG."""


@dataclass(frozen=True)
class PreprocessConfig:
    size: int = MODEL_SIZE
    mean: tuple[float, float, float] = MEAN
    std: tuple[float, float, float] = STD
    pad_value: int = PAD_VALUE


DEFAULT_PREPROCESS = PreprocessConfig()

_SOF_MARKERS = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}


def jpeg_dimensions(data: bytes) -> tuple[int, int] | None:
    """(width, height) from the JPEG SOF header, without decoding. None if not found."""
    i = 2
    n = len(data)
    while i + 9 < n:
        if data[i] != 0xFF:
            return None
        marker = data[i + 1]
        if marker == 0xFF:  # fill byte
            i += 1
            continue
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        seg_len = int.from_bytes(data[i + 2:i + 4], "big")
        if marker in _SOF_MARKERS:
            h = int.from_bytes(data[i + 5:i + 7], "big")
            w = int.from_bytes(data[i + 7:i + 9], "big")
            return w, h
        if seg_len < 2:
            return None
        i += 2 + seg_len
    return None


def decode_jpeg(data: bytes) -> np.ndarray:
    """Decode JPEG bytes into a BGR uint8 HxWx3 image."""
    if len(data) > MAX_FRAME_BYTES:
        raise BadFrame(f"frame is larger than {MAX_FRAME_BYTES} bytes")
    if not data.startswith(b"\xff\xd8"):
        raise BadFrame("frame is not a JPEG")
    dims = jpeg_dimensions(data)
    if dims is not None and dims[0] * dims[1] > MAX_FRAME_PIXELS:
        raise BadFrame(f"frame is {dims[0]}x{dims[1]}; send at most 4096x4096 (480 px recommended)")
    img = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None or img.ndim != 3 or img.shape[2] != 3 or img.size == 0:
        raise BadFrame("frame could not be decoded")
    return img


def letterbox(img: np.ndarray, size: int = MODEL_SIZE, pad_value: int = PAD_VALUE) -> np.ndarray:
    """Resize keeping aspect ratio and pad to size x size (Slovo resize())."""
    h, w = img.shape[:2]
    r = min(size / h, size / w)
    new_unpad = (int(round(w * r)), int(round(h * r)))
    dw, dh = size - new_unpad[0], size - new_unpad[1]
    dw /= 2
    dh /= 2
    if (w, h) != new_unpad:
        img = cv2.resize(img, new_unpad, interpolation=cv2.INTER_LINEAR)
    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
    return cv2.copyMakeBorder(
        img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(pad_value, pad_value, pad_value)
    )


def to_model_frame(img_bgr: np.ndarray, cfg: PreprocessConfig = DEFAULT_PREPROCESS) -> np.ndarray:
    """BGR image -> normalized float32 [3, size, size] model frame."""
    img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img = letterbox(img, cfg.size, cfg.pad_value)
    img = (img.astype(np.float32) - np.asarray(cfg.mean, np.float32)) / np.asarray(cfg.std, np.float32)
    return np.ascontiguousarray(img.transpose(2, 0, 1), dtype=np.float32)
