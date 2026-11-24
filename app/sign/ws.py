"""Real-time sign recognition over WebSocket. Protocol: docs/API.md §3."""

import asyncio
import json
import logging
import time
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from app.deps import parse_client_id
from app.history_store import save_history
from app.sign.preprocess import BadFrame, decode_jpeg, to_model_frame
from app.sign.stream import SignEvent, SignStream

log = logging.getLogger("phoenix.ws")
router = APIRouter(tags=["sign"])

SUPPORTED_LANGS = {"rsl"}
OVERLOAD_NOTICE_INTERVAL_S = 5.0
_semaphores: dict[int, asyncio.Semaphore] = {}


def _semaphore(app) -> asyncio.Semaphore:
    key = id(app)
    if key not in _semaphores:
        _semaphores[key] = asyncio.Semaphore(app.state.settings.max_concurrent_inferences)
    return _semaphores[key]


def _preprocess(data: bytes):
    return to_model_frame(decode_jpeg(data))


class SignSession:
    def __init__(self, ws: WebSocket, client_id: uuid.UUID, lang: str):
        self.ws = ws
        self.app = ws.app
        self.settings = ws.app.state.settings
        self.recognizer = ws.app.state.sign_recognizer
        self.client_id = client_id
        self.lang = lang
        self.session_id = str(uuid.uuid4())
        self.stream: SignStream | None = None
        self.save = True
        self.inflight: asyncio.Task | None = None
        self.generation = 0
        self.last_overload_notice = 0.0
        self.send_lock = asyncio.Lock()

    async def send(self, payload: dict) -> None:
        async with self.send_lock:
            await self.ws.send_text(json.dumps(payload, ensure_ascii=False))

    async def error(self, code: str, message: str) -> None:
        await self.send({"type": "error", "code": code, "message": message})

    # ---- control messages -------------------------------------------------
    async def on_text(self, raw: str) -> None:
        try:
            msg = json.loads(raw)
            kind = msg.get("type") if isinstance(msg, dict) else None
        except json.JSONDecodeError:
            kind = None
        if kind == "start":
            await self.on_start(msg)
        elif kind == "stop":
            await self.on_stop()
        elif kind == "reset":
            await self.on_reset()
        else:
            await self.error("bad_message", "Expected JSON with type start, stop or reset")

    async def on_start(self, msg: dict) -> None:
        fps = msg.get("fps", 15)
        if not isinstance(fps, int) or isinstance(fps, bool) or not 5 <= fps <= 30:
            await self.error("bad_message", "fps must be an integer between 5 and 30")
            return
        save = msg.get("save_history", True)
        self.save = bool(save)
        await self._cancel_inflight()
        s = self.settings
        self.stream = SignStream(
            self.recognizer,
            client_fps=fps,
            target_fps=s.sign_target_fps,
            stride=s.sign_stride,
            min_confidence=s.sign_min_confidence,
            max_backlog=s.sign_max_backlog_frames,
        )
        await self.send({
            "type": "ready",
            "session_id": self.session_id,
            "lang": self.lang,
            "model": s.sign_model_name,
            "window_frames": self.recognizer.window,
            "target_fps": s.sign_target_fps,
        })

    async def on_stop(self) -> None:
        if self.stream is None:
            await self.error("bad_message", "Send start before stop")
            return
        if self.inflight is not None:
            await asyncio.gather(self.inflight, return_exceptions=True)
        if self.stream.ready():  # catch a sign made in the last fraction of a second
            await self._infer(self.stream.next_window(), self.generation)
        signs = self.stream.phrase
        text = " ".join(signs)
        history_id = None
        if signs and self.save:
            async with self.app.state.sessionmaker() as db:
                history_id = await save_history(db, self.client_id, "sign_to_text", self.lang, text, signs)
        await self.send({
            "type": "final", "session_id": self.session_id,
            "text": text, "signs": signs, "history_id": history_id,
        })
        self.stream.reset()
        self.generation += 1

    async def on_reset(self) -> None:
        await self._cancel_inflight()
        if self.stream is not None:
            self.stream.reset()

    # ---- frames ------------------------------------------------------------
    async def on_frame(self, data: bytes) -> None:
        if self.stream is None:
            await self.error("bad_message", "Send start before frames")
            return
        try:
            frame = await run_in_threadpool(_preprocess, data)
        except BadFrame as e:
            await self.error("bad_frame", str(e) or "Frame is not a valid JPEG")
            return
        self.stream.add_frame(frame)
        dropped = self.stream.dropped_since_last_check()
        now = time.monotonic()
        if dropped and now - self.last_overload_notice >= OVERLOAD_NOTICE_INTERVAL_S:
            self.last_overload_notice = now
            await self.error("overloaded", "Server is behind; dropping old frames")
        self._maybe_launch()

    def _maybe_launch(self) -> None:
        if self.stream is None or (self.inflight is not None and not self.inflight.done()):
            return
        if self.stream.ready():
            window = self.stream.next_window()
            self.inflight = asyncio.create_task(self._infer(window, self.generation))

    async def _infer(self, window, generation: int) -> None:
        try:
            async with _semaphore(self.app):
                pred = await run_in_threadpool(self.recognizer.predict, window)
        except Exception:
            log.exception("sign inference failed")
            return
        if generation != self.generation or self.stream is None:
            return  # phrase was reset/stopped while we were running
        event = self.stream.accept(pred)
        if event is not None:
            await self._send_sign(event)

    async def _send_sign(self, ev: SignEvent) -> None:
        await self.send({
            "type": "sign",
            "text": ev.text,
            "confidence": round(float(ev.confidence), 4),
            "alternatives": [{"text": t, "confidence": round(float(c), 4)} for t, c in ev.alternatives],
            "phrase": ev.phrase,
            "index": ev.index,
        })

    async def _cancel_inflight(self) -> None:
        self.generation += 1
        if self.inflight is not None and not self.inflight.done():
            self.inflight.cancel()
            await asyncio.gather(self.inflight, return_exceptions=True)
        self.inflight = None


@router.websocket("/ws/sign")
async def sign_ws(ws: WebSocket, client_id: str | None = None, lang: str = "rsl"):
    await ws.accept()

    async def reject(code: str, message: str, close_code: int):
        await ws.send_text(json.dumps({"type": "error", "code": code, "message": message}))
        await ws.close(code=close_code)

    cid = parse_client_id(client_id)
    if cid is None:
        return await reject("invalid_client_id", "client_id query param must be a UUID", 4400)
    if lang not in SUPPORTED_LANGS:
        return await reject("unsupported_language", f"Sign language '{lang}' is not available", 4400)
    if ws.app.state.sign_recognizer is None:
        return await reject("model_unavailable", "Sign recognition model is not loaded", 4503)

    session = SignSession(ws, cid, lang)
    try:
        while True:
            msg = await ws.receive()
            if msg["type"] == "websocket.disconnect":
                break
            if msg.get("bytes") is not None:
                await session.on_frame(msg["bytes"])
            elif msg.get("text") is not None:
                await session.on_text(msg["text"])
    except WebSocketDisconnect:
        pass
    finally:
        await session._cancel_inflight()
