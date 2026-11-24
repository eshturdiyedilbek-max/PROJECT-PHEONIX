import time

import cv2
import numpy as np
import pytest

from app.config import Settings
from app.sign.classes import NO_SIGN, load_classes
from app.sign.preprocess import BadFrame, decode_jpeg, letterbox, to_model_frame
from app.sign.recognizer import Prediction, SignRecognizer, load_sign_recognizers
from registry_helper import write_registry
from app.sign.stream import SignEvent, SignStream
from fake_model import make_fake_model

CLASSES_PATH = "data/rsl_classes.json"
MEAN = np.array([123.675, 116.28, 103.53], dtype=np.float32)
STD = np.array([58.395, 57.12, 57.375], dtype=np.float32)


@pytest.fixture(scope="module")
def classes():
    return load_classes(CLASSES_PATH)


@pytest.fixture(scope="module")
def recognizer(tmp_path_factory, classes):
    path = make_fake_model(tmp_path_factory.mktemp("model") / "fake.onnx", window=32, winner=5)
    return SignRecognizer(path, classes, "fake")


class StubRecognizer:
    def __init__(self, window=32):
        self.window = window


def _jpeg(h=480, w=640) -> bytes:
    img = np.zeros((h, w, 3), dtype=np.uint8)
    img[..., 0] = np.linspace(0, 255, w, dtype=np.uint8)[None, :]
    img[..., 1] = np.linspace(0, 255, h, dtype=np.uint8)[:, None]
    ok, buf = cv2.imencode(".jpg", img)
    assert ok
    return buf.tobytes()


def test_decode_jpeg_ok():
    img = decode_jpeg(_jpeg())
    assert img.shape == (480, 640, 3) and img.dtype == np.uint8


def test_decode_jpeg_rejects_png_and_oversize():
    ok, png = cv2.imencode(".png", np.zeros((10, 10, 3), dtype=np.uint8))
    with pytest.raises(BadFrame):
        decode_jpeg(png.tobytes())
    with pytest.raises(BadFrame):
        decode_jpeg(b"\xff\xd8" + b"\x00" * 300_000)
    with pytest.raises(BadFrame):
        decode_jpeg(b"\xff\xd8\xff\xe0garbage")
    with pytest.raises(BadFrame):
        decode_jpeg(_jpeg()[:200])
    assert issubclass(BadFrame, ValueError)


def test_letterbox_shape_and_padding():
    img = np.full((480, 640, 3), 10, dtype=np.uint8)
    out = letterbox(img)
    assert out.shape == (224, 224, 3)
    # 640x480 -> 224x168, 28 rows padding top and bottom
    assert (out[:28] == 114).all()
    assert (out[-28:] == 114).all()
    assert (out[28:196] == 10).all()


def test_letterbox_square_no_padding():
    img = np.full((224, 224, 3), 7, dtype=np.uint8)
    assert (letterbox(img) == 7).all()


def test_to_model_frame_normalization():
    img = np.full((480, 640, 3), 114, dtype=np.uint8)
    f = to_model_frame(img)
    assert f.shape == (3, 224, 224) and f.dtype == np.float32
    expected = (114 - MEAN) / STD
    for c in range(3):
        assert np.allclose(f[c], expected[c], atol=1e-5)


def test_to_model_frame_converts_bgr_to_rgb():
    img = np.zeros((224, 224, 3), dtype=np.uint8)
    img[..., 0] = 255  # blue in BGR
    f = to_model_frame(img)
    assert np.allclose(f[2], (255 - MEAN[2]) / STD[2])  # RGB channel 2 = blue
    assert np.allclose(f[0], (0 - MEAN[0]) / STD[0])


def test_recognizer_window_from_model(recognizer):
    assert recognizer.window == 32


def test_recognizer_predicts_winner(recognizer, classes):
    frames = [to_model_frame(np.full((240, 320, 3), 100, dtype=np.uint8))] * recognizer.window
    t0 = time.perf_counter()
    pred = recognizer.predict(frames)
    elapsed = time.perf_counter() - t0
    print(f"\npredict() on fake model: {elapsed * 1000:.1f} ms")
    assert isinstance(pred, Prediction)
    assert pred.text == classes[5]
    assert 0.5 < pred.confidence <= 1  # must pass default min_confidence for ws tests
    assert len(pred.alternatives) == 3
    assert all(t != pred.text for t, _ in pred.alternatives)
    assert all(0 <= c <= pred.confidence for _, c in pred.alternatives)


def test_recognizer_rejects_wrong_frame_count(recognizer):
    with pytest.raises(ValueError):
        recognizer.predict([np.zeros((3, 224, 224), np.float32)] * 5)


def test_load_sign_recognizers_missing_model_is_skipped(tmp_path):
    cfg = write_registry(tmp_path, rsl_model=str(tmp_path / "nope.onnx"), asl_model=str(tmp_path / "nope2.onnx"))
    assert load_sign_recognizers(Settings(sign_languages_path=cfg)) == {}


def test_load_sign_recognizers_corrupt_is_skipped(tmp_path):
    p = tmp_path / "bad.onnx"
    p.write_bytes(b"not a model")
    cfg = write_registry(tmp_path, rsl_model=str(p), asl_model=str(p))
    assert load_sign_recognizers(Settings(sign_languages_path=cfg)) == {}


def test_load_sign_recognizers_both_languages(tmp_path):
    rsl = make_fake_model(tmp_path / "rsl.onnx", window=16)
    asl = make_fake_model(tmp_path / "asl.onnx", window=24, num_classes=2000, layout="NCTHW")
    recs = load_sign_recognizers(Settings(sign_languages_path=write_registry(tmp_path, rsl, asl)))
    assert set(recs) == {"rsl", "asl"}
    assert recs["rsl"].window == 16 and recs["rsl"].target_fps == 15
    assert recs["asl"].window == 24 and recs["asl"].layout == "NCTHW" and recs["asl"].no_sign_label is None


def test_variant_override_changes_frame_rate(tmp_path):
    from app.sign.registry import load_registry

    cfg = write_registry(tmp_path, "a.onnx", "b.onnx")
    reg = load_registry(cfg, variants="rsl=light")
    assert reg["rsl"].variant.name == "light" and reg["rsl"].target_fps == 7.5
    with pytest.raises(ValueError):
        load_registry(cfg, variants="rsl=nope")
    with pytest.raises(ValueError):
        load_registry(cfg, variants="xx=light")


@pytest.mark.parametrize("layout", ["N1CTHW", "NCTHW", "NTCHW"])
def test_recognizer_handles_layouts(tmp_path, layout):
    classes = load_classes(CLASSES_PATH)
    p = make_fake_model(tmp_path / "m.onnx", window=8, layout=layout, size=112, winner=7)
    rec = SignRecognizer(p, classes, "fake")
    assert rec.layout == layout and rec.window == 8 and rec.preprocess.size == 112
    frame = rec.to_frame(np.zeros((240, 320, 3), np.uint8))
    assert frame.shape == (3, 112, 112)
    assert rec.predict([frame] * 8).text == classes[7]


def test_jpeg_dimensions_and_bomb_rejected():
    from app.sign.preprocess import jpeg_dimensions

    ok, buf = cv2.imencode(".jpg", np.zeros((48, 64, 3), np.uint8))
    data = buf.tobytes()
    assert jpeg_dimensions(data) == (64, 48)
    # Patch the SOF header to claim 20000x20000 without changing the payload size.
    i = data.index(b"\xff\xc0")
    bomb = data[: i + 5] + (20000).to_bytes(2, "big") + (20000).to_bytes(2, "big") + data[i + 9:]
    with pytest.raises(BadFrame):
        decode_jpeg(bomb)


def test_stream_resamples_30fps_to_15():
    s = SignStream(StubRecognizer(), client_fps=30, max_backlog=64)
    for i in range(60):
        s.add_frame(np.array(i))
    assert len(s.buffer) == 30


def test_stream_keeps_all_when_client_slower():
    s = SignStream(StubRecognizer(), client_fps=10)
    for i in range(20):
        s.add_frame(np.array(i))
    assert len(s.buffer) == 20


def test_stream_ready_and_stride():
    s = SignStream(StubRecognizer(window=32), client_fps=15, stride=8)
    for i in range(31):
        s.add_frame(np.array(i))
    assert not s.ready()
    s.add_frame(np.array(31))
    assert s.ready()
    w = s.next_window()
    assert len(w) == 32 and int(w[0]) == 0 and int(w[-1]) == 31
    assert not s.ready()
    for i in range(32, 39):
        s.add_frame(np.array(i))
    assert not s.ready()
    s.add_frame(np.array(39))
    assert s.ready()
    w = s.next_window()
    assert int(w[0]) == 8 and int(w[-1]) == 39


def test_stream_dedups_and_filters():
    s = SignStream(StubRecognizer(), client_fps=15, min_confidence=0.5)
    ev = s.accept(Prediction("a", 0.9, []))
    assert isinstance(ev, SignEvent) and ev.index == 0 and ev.phrase == "a"
    assert s.accept(Prediction("a", 0.95, [])) is None
    assert s.accept(Prediction(NO_SIGN, 0.99, [])) is None
    assert s.accept(Prediction("b", 0.2, [])) is None
    ev = s.accept(Prediction("b", 0.8, [("c", 0.1)]))
    assert ev.index == 1 and ev.phrase == "a b" and ev.text == "b"
    assert ev.confidence == 0.8 and ev.alternatives == [("c", 0.1)]
    assert s.phrase == ["a", "b"]
    s.reset()
    assert s.phrase == []
    assert s.accept(Prediction("b", 0.8, [])).index == 0


def test_stream_drops_when_backlog_exceeds_limit():
    s = SignStream(StubRecognizer(window=32), client_fps=15, max_backlog=8)
    for i in range(100):
        s.add_frame(np.array(i))
    assert len(s.buffer) == 40
    assert s.dropped_since_last_check() == 60
    assert s.dropped_since_last_check() == 0
    w = s.next_window()
    assert int(w[-1]) == 99


def test_stream_allows_repeat_after_pause():
    from app.sign.recognizer import Prediction
    from app.sign.stream import SignStream

    class R:
        window = 4

    s = SignStream(R(), client_fps=15)
    assert s.accept(Prediction("да", 0.9, [])) is not None
    assert s.accept(Prediction("да", 0.9, [])) is None
    assert s.accept(Prediction("---", 0.9, [])) is None
    ev = s.accept(Prediction("да", 0.9, []))
    assert ev is not None and ev.phrase == "да да"


def test_next_window_trims_buffer_so_steady_stream_never_drops():
    import numpy as np
    from app.sign.stream import SignStream

    class R:
        window = 32

    s = SignStream(R(), client_fps=15, stride=8, max_backlog=8)
    f = np.zeros((3, 2, 2), np.float32)
    for _ in range(500):
        s.add_frame(f)
        if s.ready():
            s.next_window()
    assert s.dropped_since_last_check() == 0
