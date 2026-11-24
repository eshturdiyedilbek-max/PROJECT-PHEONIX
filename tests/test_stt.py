import os
import uuid

import pytest
from sqlalchemy import select

from app.models import HistoryItem
from app.stt.engine import SttResult, SttSegment


class FakeSttEngine:
    def __init__(self, text="Salom", language="uz", duration=1.9, segments=None):
        self.text = text
        self.language = language
        self.duration = duration
        self.segments = segments
        self.calls: list[tuple[str, str | None]] = []
        self.seen_exists: list[bool] = []

    def transcribe(self, path: str, language: str | None) -> SttResult:
        self.calls.append((path, language))
        self.seen_exists.append(os.path.exists(path))
        segs = self.segments
        if segs is None:
            segs = [SttSegment(0.0, self.duration, self.text)] if self.text else []
        return SttResult(text=self.text, language=self.language, duration=self.duration, segments=segs)


@pytest.fixture
def fake(app):
    engine = FakeSttEngine()
    app.state.stt_engine = engine
    return engine


AUDIO = ("chunk.webm", b"\x1aE\xdf\xa3fake-webm-bytes", "audio/webm;codecs=opus")


async def test_stt_returns_text(client, fake):
    r = await client.post("/api/stt", files={"audio": AUDIO})
    assert r.status_code == 200, r.text
    assert r.json() == {
        "text": "Salom",
        "language": "uz",
        "duration": 1.9,
        "segments": [{"start": 0.0, "end": 1.9, "text": "Salom"}],
        "history_id": None,
    }
    assert fake.calls[0][1] is None
    # temp file existed during transcribe and was removed afterwards
    assert fake.seen_exists == [True]
    assert not os.path.exists(fake.calls[0][0])


async def test_stt_passes_language(client, fake):
    r = await client.post("/api/stt", files={"audio": AUDIO}, data={"language": "ru"})
    assert r.status_code == 200, r.text
    assert fake.calls[0][1] == "ru"


async def test_stt_saves_history_when_asked(app, client, fake, client_id):
    r = await client.post(
        "/api/stt",
        files={"audio": AUDIO},
        data={"save_history": "true"},
        headers={"X-Client-Id": client_id},
    )
    assert r.status_code == 200, r.text
    hid = r.json()["history_id"]
    assert isinstance(hid, int)
    async with app.state.sessionmaker() as s:
        rows = (await s.execute(select(HistoryItem))).scalars().all()
    assert len(rows) == 1
    row = rows[0]
    assert row.id == hid
    assert row.client_id == uuid.UUID(client_id)
    assert row.direction == "speech_to_text"
    assert row.lang == "uz"
    assert row.text == "Salom"


async def test_stt_save_history_requires_client_id(client, fake):
    r = await client.post("/api/stt", files={"audio": AUDIO}, data={"save_history": "true"})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "invalid_client_id"
    r = await client.post(
        "/api/stt", files={"audio": AUDIO}, data={"save_history": "true"}, headers={"X-Client-Id": "nope"}
    )
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "invalid_client_id"


async def test_stt_rejects_non_audio(client, fake):
    r = await client.post("/api/stt", files={"audio": ("notes.txt", b"hello", "text/plain")})
    assert r.status_code == 415
    assert r.json()["error"]["code"] == "unsupported_media_type"
    assert fake.calls == []


async def test_stt_accepts_by_extension_and_video_webm(client, fake):
    r = await client.post("/api/stt", files={"audio": ("a.m4a", b"xx", "application/octet-stream")})
    assert r.status_code == 200, r.text
    r = await client.post("/api/stt", files={"audio": ("blob", b"xx", "video/webm")})
    assert r.status_code == 200, r.text


async def test_stt_too_large(client, fake):
    big = b"\0" * (11 * 1024 * 1024)
    r = await client.post("/api/stt", files={"audio": ("big.wav", big, "audio/wav")})
    assert r.status_code == 413
    assert r.json()["error"]["code"] == "file_too_large"
    assert fake.calls == []


async def test_stt_bad_language(client, fake):
    r = await client.post("/api/stt", files={"audio": AUDIO}, data={"language": "de"})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "invalid_request"
    assert fake.calls == []


async def test_stt_no_engine(app, client):
    app.state.stt_engine = None
    r = await client.post("/api/stt", files={"audio": AUDIO})
    assert r.status_code == 503
    assert r.json()["error"]["code"] == "model_unavailable"


async def test_stt_too_long(client, fake):
    fake.duration = 61.0
    r = await client.post("/api/stt", files={"audio": AUDIO})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "invalid_request"
    assert not os.path.exists(fake.calls[0][0])


async def test_stt_silence_returns_empty_text(client, fake, client_id, app):
    fake.text = ""
    r = await client.post(
        "/api/stt",
        files={"audio": AUDIO},
        data={"save_history": "true"},
        headers={"X-Client-Id": client_id},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["text"] == ""
    assert body["segments"] == []
    assert body["history_id"] is None
    async with app.state.sessionmaker() as s:
        assert (await s.execute(select(HistoryItem))).scalars().all() == []


def test_load_stt_engine_returns_none_on_failure(monkeypatch, settings):
    import app.stt.engine as eng

    def boom(*a, **k):
        raise RuntimeError("no network")

    monkeypatch.setattr(eng, "FasterWhisperEngine", boom)
    assert eng.load_stt_engine(settings) is None


def test_faster_whisper_engine_joins_segments(monkeypatch):
    import app.stt.engine as eng

    class Seg:
        def __init__(self, start, end, text):
            self.start, self.end, self.text = start, end, text

    class Info:
        language = "ru"
        duration = 4.2

    captured = {}

    class FakeModel:
        def __init__(self, model, device, compute_type):
            captured["init"] = (model, device, compute_type)

        def transcribe(self, path, **kw):
            captured["kw"] = kw
            return (s for s in [Seg(0.0, 1.0, " Привет "), Seg(1.0, 2.0, " мир")]), Info()

    monkeypatch.setattr(eng, "WhisperModel", FakeModel, raising=False)
    engine = eng.FasterWhisperEngine("small", "cpu", "int8")
    res = engine.transcribe("/x.wav", None)
    assert captured["init"] == ("small", "cpu", "int8")
    assert captured["kw"]["vad_filter"] is True and captured["kw"]["beam_size"] == 1
    assert captured["kw"]["language"] is None
    assert res.text == "Привет мир"
    assert res.language == "ru" and res.duration == 4.2
    assert res.segments == [SttSegment(0.0, 1.0, "Привет"), SttSegment(1.0, 2.0, "мир")]
