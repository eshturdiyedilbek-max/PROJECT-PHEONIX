"""Per-connection frame resampling, buffering, sliding windows and dedup."""

from collections import deque
from dataclasses import dataclass, field

import numpy as np

from app.sign.classes import NO_SIGN
from app.sign.recognizer import Prediction


@dataclass
class SignEvent:
    text: str
    confidence: float
    alternatives: list[tuple[str, float]] = field(default_factory=list)
    phrase: str = ""
    index: int = 0


class SignStream:
    def __init__(
        self,
        recognizer,
        client_fps: int,
        target_fps: int = 15,
        stride: int = 8,
        min_confidence: float = 0.5,
        max_backlog: int = 64,
    ):
        self.recognizer = recognizer
        self.window: int = recognizer.window
        self.client_fps = client_fps
        self.target_fps = target_fps
        self.stride = stride
        self.min_confidence = min_confidence
        self.max_backlog = max_backlog
        self._step = 1.0 if client_fps <= target_fps else target_fps / client_fps
        self.buffer: deque[np.ndarray] = deque(maxlen=self.window + max_backlog)
        self.reset()

    def reset(self) -> None:
        self.buffer.clear()
        self._acc = 0.0
        self._new_since_window = 0
        self._consumed_once = False
        self._dropped = 0
        self._phrase: list[str] = []
        self._last_text: str | None = None

    def add_frame(self, frame: np.ndarray) -> None:
        self._acc += self._step
        if self._acc < 1.0 - 1e-9:
            return
        self._acc -= 1.0
        if len(self.buffer) == self.buffer.maxlen:
            self._dropped += 1
        self.buffer.append(frame)
        self._new_since_window += 1

    def ready(self) -> bool:
        if len(self.buffer) < self.window:
            return False
        return not self._consumed_once or self._new_since_window >= self.stride

    def next_window(self) -> list[np.ndarray]:
        frames = list(self.buffer)[-self.window:]
        # Keep only what the next sliding window can still use; the rest of the
        # deque capacity is backlog headroom for frames arriving during inference.
        while len(self.buffer) > self.window:
            self.buffer.popleft()
        self._new_since_window = 0
        self._consumed_once = True
        return frames

    def accept(self, pred: Prediction) -> SignEvent | None:
        if pred.text == NO_SIGN:
            # A pause between signs: the same word may legitimately be signed again.
            self._last_text = None
            return None
        if pred.confidence < self.min_confidence or pred.text == self._last_text:
            return None
        self._last_text = pred.text
        self._phrase.append(pred.text)
        return SignEvent(
            text=pred.text,
            confidence=pred.confidence,
            alternatives=list(pred.alternatives),
            phrase=" ".join(self._phrase),
            index=len(self._phrase) - 1,
        )

    def dropped_since_last_check(self) -> int:
        n, self._dropped = self._dropped, 0
        return n

    @property
    def phrase(self) -> list[str]:
        return list(self._phrase)
