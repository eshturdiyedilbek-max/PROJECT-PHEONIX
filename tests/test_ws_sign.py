import json
import uuid

import cv2
import numpy as np
import pytest
from fake_model import make_fake_model
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import HistoryItem
from app.sign.classes import load_classes
from app.sign.recognizer import SignRecognizer

WORD = "Привет!"


def _jpeg(seed: int = 0) -> bytes:
    img = np.full((240, 320, 3), seed % 255, np.uint8)
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    return buf.tobytes()


@pytest.fixture
def tc(app, settings, tmp_path):
    classes = load_classes(settings.sign_classes_path)
    path = make_fake_model(str(tmp_path / "m.onnx"), window=32, winner=classes.index(WORD))
    with TestClient(app) as c:
        app.state.sign_recognizer = SignRecognizer(path, classes, "fake")
        yield c


def _url(cid=None, lang="rsl"):
    return f"/ws/sign?client_id={cid or uuid.uuid4()}&lang={lang}"


def _recv(ws):
    return json.loads(ws.receive_text())


def test_ws_rejects_bad_client_id(tc):
    with tc.websocket_connect("/ws/sign?client_id=nope") as ws:
        assert _recv(ws)["code"] == "invalid_client_id"
        msg = ws.receive()
        assert msg["type"] == "websocket.close" and msg["code"] == 4400


def test_ws_rejects_unknown_lang(tc):
    with tc.websocket_connect(_url(lang="asl")) as ws:
        assert _recv(ws)["code"] == "unsupported_language"
        assert ws.receive()["code"] == 4400


def test_ws_model_missing(tc, app):
    app.state.sign_recognizer = None
    with tc.websocket_connect(_url()) as ws:
        assert _recv(ws)["code"] == "model_unavailable"
        assert ws.receive()["code"] == 4503


def _run_flow(ws, n_frames=40):
    ws.send_text(json.dumps({"type": "start", "fps": 15}))
    ready = _recv(ws)
    assert ready["type"] == "ready" and ready["window_frames"] == 32 and ready["target_fps"] == 15
    for i in range(n_frames):
        ws.send_bytes(_jpeg(i))
    sign = _recv(ws)
    assert sign["type"] == "sign", sign
    assert sign["text"] == WORD and sign["index"] == 0 and sign["phrase"] == WORD
    assert 0.5 < sign["confidence"] <= 1 and len(sign["alternatives"]) == 3
    ws.send_text(json.dumps({"type": "stop"}))
    final = _recv(ws)
    assert final["type"] == "final" and final["signs"] == [WORD] and final["text"] == WORD
    return final


def test_ws_full_flow(tc, app):
    cid = str(uuid.uuid4())
    with tc.websocket_connect(_url(cid)) as ws:
        final = _run_flow(ws)
    assert isinstance(final["history_id"], int)
    r = tc.get("/api/history", headers={"X-Client-Id": cid})
    items = r.json()["items"]
    assert items[0]["direction"] == "sign_to_text" and items[0]["signs"] == [WORD]


def test_ws_bad_frame_keeps_socket(tc):
    with tc.websocket_connect(_url()) as ws:
        ws.send_text(json.dumps({"type": "start", "fps": 15}))
        _recv(ws)
        ws.send_bytes(b"\x89PNG\r\n\x1a\nnot a jpeg")
        assert _recv(ws)["code"] == "bad_frame"
        ws.send_bytes(b"\xff\xd8" + b"\0" * 400_000)
        assert _recv(ws)["code"] == "bad_frame"
        _run_flow(ws)


def test_ws_stop_before_window(tc, app):
    cid = str(uuid.uuid4())
    with tc.websocket_connect(_url(cid)) as ws:
        ws.send_text(json.dumps({"type": "start", "fps": 15}))
        _recv(ws)
        for i in range(5):
            ws.send_bytes(_jpeg(i))
        ws.send_text(json.dumps({"type": "stop"}))
        final = _recv(ws)
    assert final["signs"] == [] and final["text"] == "" and final["history_id"] is None
    assert tc.get("/api/history", headers={"X-Client-Id": cid}).json()["total"] == 0


def test_ws_frame_before_start(tc):
    with tc.websocket_connect(_url()) as ws:
        ws.send_bytes(_jpeg())
        assert _recv(ws)["code"] == "bad_message"
        ws.send_text("not json")
        assert _recv(ws)["code"] == "bad_message"


def test_ws_no_history_when_disabled(tc):
    cid = str(uuid.uuid4())
    with tc.websocket_connect(_url(cid)) as ws:
        ws.send_text(json.dumps({"type": "start", "fps": 15, "save_history": False}))
        _recv(ws)
        for i in range(40):
            ws.send_bytes(_jpeg(i))
        assert _recv(ws)["type"] == "sign"
        ws.send_text(json.dumps({"type": "stop"}))
        assert _recv(ws)["history_id"] is None


def test_ws_reset_then_new_phrase(tc):
    with tc.websocket_connect(_url()) as ws:
        ws.send_text(json.dumps({"type": "start", "fps": 15}))
        _recv(ws)
        for i in range(10):
            ws.send_bytes(_jpeg(i))
        ws.send_text(json.dumps({"type": "reset"}))
        for i in range(40):
            ws.send_bytes(_jpeg(i))
        sign = _recv(ws)
        assert sign["index"] == 0
