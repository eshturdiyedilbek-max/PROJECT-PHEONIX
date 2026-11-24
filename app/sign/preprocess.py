"""Frame decoding and preprocessing matching Slovo demo.py."""

import cv2
import numpy as np

MAX_FRAME_BYTES = 300_000
MODEL_SIZE = 224
PAD_VALUE = 114
MEAN = np.array([123.675, 116.28, 103.53], dtype=np.float32)
STD = np.array([58.395, 57.12, 57.375], dtype=np.float32)


class BadFrame(ValueError):
    """Raised when binary frame data is not a usable JPEG."""


def decode_jpeg(data: bytes) -> np.ndarray:
    """Decode JPEG bytes into a BGR uint8 HxWx3 image."""
    if len(data) > MAX_FRAME_BYTES:
        raise BadFrame(f"frame is larger than {MAX_FRAME_BYTES} bytes")
    if not data.startswith(b"\xff\xd8"):
        raise BadFrame("frame is not a JPEG")
    img = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)
    if img is None or img.ndim != 3 or img.shape[2] != 3 or img.size == 0:
        raise BadFrame("frame could not be decoded")
    return img


def letterbox(img: np.ndarray, size: int = MODEL_SIZE) -> np.ndarray:
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
        img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(PAD_VALUE, PAD_VALUE, PAD_VALUE)
    )


def to_model_frame(img_bgr: np.ndarray) -> np.ndarray:
    """BGR image -> normalized float32 [3, 224, 224] model frame."""
    img = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    img = letterbox(img, MODEL_SIZE)
    img = (img.astype(np.float32) - MEAN) / STD
    return np.ascontiguousarray(img.transpose(2, 0, 1), dtype=np.float32)
