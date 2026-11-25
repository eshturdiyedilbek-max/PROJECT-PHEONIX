import json
import uuid

import cv2
import numpy as np
import pytest
from fake_model import make_fake_model
from fastapi.testclient import TestClient

from app.sign.classes import load_classes
from app.sign.recognizer import SignRecognizer

WORD = "Привет!"
ASL_WORD = "hello"


def _jpeg(seed: int = 0) -> bytes:
    img = np.full((240, 320, 3), seed % 255, np.uint8)
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    return buf.tobytes()


@pytest.fixture
def tc(app, settings, tmp_path):
    classes = load_classes("data/rsl_classes.json")
    path = make_fake_model(str(tmp_path / "m.onnx"), window=32, winner=classes.index(WORD))
    asl_classes = load_classes("data/asl_classes.json")
    asl_path = make_fake_model(str(tmp_path / "asl.onnx"), window=16, num_classes=len(asl_classes),
                               winner=asl_classes.index(ASL_WORD), layout="NCTHW")
    with TestClient(app) as c:
        app.state.sign_recognizers = {
            "rsl": SignRecognizer(path, classes, "fake-rsl"),
            "asl": SignRecognizer(asl_path, asl_classes, "fake-asl", no_sign_label=None),
        }
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
    with tc.websocket_connect(_url(lang="xyz")) as ws:
        assert _recv(ws)["code"] == "unsupported_language"
        assert ws.receive()["code"] == 4400


def test_ws_model_missing(tc, app):
    app.state.sign_recognizers = {}
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


def test_ws_asl_flow(tc):
    with tc.websocket_connect(_url(lang="asl")) as ws:
        ws.send_text(json.dumps({"type": "start", "fps": 15}))
        ready = _recv(ws)
        assert ready["lang"] == "asl" and ready["window_frames"] == 16
        assert ready["text_lang"] == "en" and ready["tts_lang"] == "en-US"
        for i in range(20):
            ws.send_bytes(_jpeg(i))
        sign = _recv(ws)
        assert sign["type"] == "sign" and sign["text"] == ASL_WORD
        ws.send_text(json.dumps({"type": "stop"}))
        final = _recv(ws)
        assert final["signs"] == [ASL_WORD]


def test_ws_ready_reports_model_rate(tc, app):
    app.state.sign_recognizers["rsl"].target_fps = 7.5  # e.g. mvit16-4
    with tc.websocket_connect(_url()) as ws:
        ws.send_text(json.dumps({"type": "start", "fps": 15}))
        ready = _recv(ws)
    assert ready["target_fps"] == 7.5 and ready["recommended_fps"] == 8


def test_ws_idle_timeout(tc, app):
    app.state.settings.ws_idle_timeout_s = 0.2
    with tc.websocket_connect(_url()) as ws:
        assert _recv(ws)["code"] == "idle_timeout"
        assert ws.receive()["code"] == 4408


def test_ws_connection_cap(tc, app):
    app.state.settings.max_ws_connections = 0
    with tc.websocket_connect(_url()) as ws:
        assert _recv(ws)["code"] == "overloaded"
        assert ws.receive()["code"] == 4503


def test_ws_inference_error_is_reported(tc, app):
    rec = app.state.sign_recognizers["rsl"]

    def boom(frames):
        raise RuntimeError("gpu fell over")

    rec.predict = boom
    with tc.websocket_connect(_url()) as ws:
        ws.send_text(json.dumps({"type": "start", "fps": 15}))
        _recv(ws)
        for i in range(32):
            ws.send_bytes(_jpeg(i))
        assert _recv(ws)["code"] == "inference_failed"
        ws.send_text(json.dumps({"type": "stop"}))
        assert _recv(ws)["type"] == "final"


def test_ws_frame_flood_is_throttled(tc, app):
    app.state.settings.ws_frame_rate_slack = 1.0
    with tc.websocket_connect(_url()) as ws:
        ws.send_text(json.dumps({"type": "start", "fps": 15}))
        _recv(ws)
        for i in range(100):  # all within well under a second
            ws.send_bytes(_jpeg(i))
        ws.send_text(json.dumps({"type": "stop"}))
        final = _recv(ws)
    assert final["signs"] == []  # only 15 frames accepted: never a full 32-frame window


def test_ws_final_includes_smoothed_sentence(tc, app):
    from test_gemini import answer, client_with

    app.state.gemini = client_with(lambda r: answer({"sentence": "Salom!"}))
    cid = str(uuid.uuid4())
    with tc.websocket_connect(_url(cid)) as ws:
        ws.send_text(json.dumps({"type": "start", "fps": 15, "target_lang": "uz"}))
        ready = _recv(ws)
        assert ready["smoothing"] is True and ready["target_lang"] == "uz"
        for i in range(40):
            ws.send_bytes(_jpeg(i))
        assert _recv(ws)["type"] == "sign"
        ws.send_text(json.dumps({"type": "stop"}))
        final = _recv(ws)
    assert final["text"] == WORD and final["sentence"] == "Salom!"
    assert final["smoothed"] is True and final["sentence_lang"] == "uz"
    item = tc.get("/api/history", headers={"X-Client-Id": cid}).json()["items"][0]
    assert item["text"] == "Salom!" and item["signs"] == [WORD]


def test_ws_smoothing_opt_out_and_bad_target(tc, app):
    from test_gemini import answer, client_with

    app.state.gemini = client_with(lambda r: answer({"sentence": "SHOULD NOT APPEAR"}))
    with tc.websocket_connect(_url()) as ws:
        ws.send_text(json.dumps({"type": "start", "fps": 15, "target_lang": "de"}))
        assert _recv(ws)["code"] == "bad_message"
        ws.send_text(json.dumps({"type": "start", "fps": 15, "smooth": False}))
        _recv(ws)
        for i in range(40):
            ws.send_bytes(_jpeg(i))
        _recv(ws)
        ws.send_text(json.dumps({"type": "stop"}))
        final = _recv(ws)
    assert final["sentence"] == WORD and final["smoothed"] is False and final["sentence_lang"] == "ru"
