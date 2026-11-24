"""Gemini client, sentence smoothing, Gemini STT and fallbacks — all with a mocked HTTP transport."""

import json
import wave

import httpx
import pytest

from app.llm.gemini import AudioPart, GeminiClient, GeminiError
from app.llm.sentence import smooth_sentence
from app.stt.gemini_engine import GeminiSttEngine


def answer(obj: dict) -> httpx.Response:
    return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": json.dumps(obj)}]}}]})


def client_with(handler, models=("m1", "m2")) -> GeminiClient:
    return GeminiClient("k", list(models), transport=httpx.MockTransport(handler), backoff_s=0)


def test_generate_json_sends_key_schema_and_audio():
    seen = {}

    def handler(req: httpx.Request):
        seen["url"] = str(req.url)
        seen["key"] = req.headers["x-goog-api-key"]
        seen["body"] = json.loads(req.content)
        return answer({"sentence": "ok"})

    data, model = client_with(handler).generate_json(
        "hi", {"type": "object"}, system="sys", audio=AudioPart(b"abc", "audio/webm")
    )
    assert data == {"sentence": "ok"} and model == "m1"
    assert seen["url"].endswith("/models/m1:generateContent") and seen["key"] == "k"
    body = seen["body"]
    assert body["generationConfig"]["responseMimeType"] == "application/json"
    assert body["systemInstruction"]["parts"][0]["text"] == "sys"
    assert body["contents"][0]["parts"][0]["inline_data"] == {"mime_type": "audio/webm", "data": "YWJj"}


def test_retries_then_falls_back_to_next_model():
    calls = []

    def handler(req):
        calls.append(req.url.path.rsplit("/", 1)[1])
        if "m1" in req.url.path:
            return httpx.Response(503, json={"error": {"message": "busy"}})
        return answer({"sentence": "from m2"})

    data, model = client_with(handler).generate_json("x", {})
    assert model == "m2" and data["sentence"] == "from m2"
    assert calls == ["m1:generateContent", "m1:generateContent", "m2:generateContent"]


def test_404_model_skips_without_retry():
    calls = []

    def handler(req):
        calls.append(req.url.path)
        return httpx.Response(404) if "m1" in req.url.path else answer({"a": 1})

    _, model = client_with(handler).generate_json("x", {})
    assert model == "m2" and len(calls) == 2


def test_bad_key_raises_immediately():
    calls = []

    def handler(req):
        calls.append(1)
        return httpx.Response(403)

    with pytest.raises(GeminiError, match="API key"):
        client_with(handler).generate_json("x", {})
    assert calls == [1]


def test_all_models_fail_raises():
    with pytest.raises(GeminiError):
        client_with(lambda r: httpx.Response(500)).generate_json("x", {})


def test_garbage_answer_tries_next_model():
    def handler(req):
        if "m1" in req.url.path:
            return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": "not json"}]}}]})
        return answer({"ok": True})

    assert client_with(handler).generate_json("x", {})[1] == "m2"


def test_smooth_sentence_success_and_prompt():
    seen = {}

    def handler(req):
        seen["prompt"] = json.loads(req.content)["contents"][0]["parts"][0]["text"]
        return answer({"sentence": "Salom! Sizni ko'rganimdan xursandman."})

    sentence, smoothed, model = smooth_sentence(client_with(handler), ["Привет!", "рад"], "rsl", "uz")
    assert smoothed and model == "m1" and sentence.startswith("Salom")
    assert "Uzbek" in seen["prompt"] and "Russian Sign Language" in seen["prompt"]


@pytest.mark.parametrize("client", [None, "failing", "empty"])
def test_smooth_sentence_falls_back_to_plain(client):
    if client == "failing":
        client = client_with(lambda r: httpx.Response(503))
    elif client == "empty":
        client = client_with(lambda r: answer({"sentence": "  "}))
    assert smooth_sentence(client, ["a", "b"], "rsl", "ru") == ("a b", False, None)


def _wav(path, seconds=1.0):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b"\0\0" * int(16000 * seconds))
    return str(path)


def test_gemini_stt_engine(tmp_path):
    seen = {}

    def handler(req):
        body = json.loads(req.content)
        seen["mime"] = body["contents"][0]["parts"][0]["inline_data"]["mime_type"]
        seen["prompt"] = body["contents"][0]["parts"][1]["text"]
        return answer({"text": "Salom, qalaysiz?", "language": "UZ"})

    res = GeminiSttEngine(client_with(handler)).transcribe(_wav(tmp_path / "a.wav", 2.0), "uz")
    assert res.text == "Salom, qalaysiz?" and res.language == "uz"
    assert abs(res.duration - 2.0) < 0.05 and res.segments[0].end == res.duration
    assert seen["mime"] == "audio/wav" and "Uzbek" in seen["prompt"]


def test_gemini_stt_silence(tmp_path):
    res = GeminiSttEngine(client_with(lambda r: answer({"text": "", "language": "uz"}))).transcribe(
        _wav(tmp_path / "s.wav"), None
    )
    assert res.text == "" and res.segments == []


# ---- HTTP endpoints -------------------------------------------------------------------------

class Boom:
    name = "gemini"

    def transcribe(self, path, language):
        raise GeminiError("down")


class Ok:
    name = "whisper"

    def __init__(self):
        self.calls = 0

    def transcribe(self, path, language):
        from app.stt.engine import SttResult

        self.calls += 1
        return SttResult("hello", "en", 1.0, [])


async def test_stt_falls_back_to_whisper_when_gemini_fails(app, client, tmp_path):
    ok = Ok()
    app.state.stt_engines = {"gemini": Boom(), "whisper": ok}
    with open(_wav(tmp_path / "a.wav"), "rb") as f:
        r = await client.post("/api/stt", files={"audio": ("a.wav", f.read(), "audio/wav")})
    assert r.status_code == 200 and r.json()["engine"] == "whisper" and ok.calls == 1


async def test_stt_explicit_gemini_failure_is_502(app, client, tmp_path):
    app.state.stt_engines = {"gemini": Boom(), "whisper": Ok()}
    with open(_wav(tmp_path / "a.wav"), "rb") as f:
        r = await client.post("/api/stt", files={"audio": ("a.wav", f.read(), "audio/wav")},
                              data={"engine": "gemini"})
    assert r.status_code == 502 and r.json()["error"]["code"] == "upstream_error"


async def test_stt_unknown_or_missing_engine(app, client, tmp_path):
    app.state.stt_engines = {"whisper": Ok()}
    with open(_wav(tmp_path / "a.wav"), "rb") as f:
        data = f.read()
    r = await client.post("/api/stt", files={"audio": ("a.wav", data, "audio/wav")}, data={"engine": "siri"})
    assert r.status_code == 400
    r = await client.post("/api/stt", files={"audio": ("a.wav", data, "audio/wav")}, data={"engine": "gemini"})
    assert r.status_code == 503


async def test_stt_rejects_long_audio_before_transcribing(app, client, tmp_path):
    ok = Ok()
    app.state.stt_engines = {"whisper": ok}
    with open(_wav(tmp_path / "long.wav", 61), "rb") as f:
        r = await client.post("/api/stt", files={"audio": ("long.wav", f.read(), "audio/wav")})
    assert r.status_code == 400 and ok.calls == 0


async def test_sentence_endpoint(app, client):
    app.state.gemini = client_with(lambda r: answer({"sentence": "Hello, nice to meet you."}))
    r = await client.post("/api/sentence", json={"signs": ["hello", "nice", "meet", "you"], "sign_lang": "asl"})
    body = r.json()
    assert r.status_code == 200
    assert body == {"sentence": "Hello, nice to meet you.", "source_text": "hello nice meet you",
                    "target_lang": "en", "smoothed": True, "model": "gemini-flash-lite-latest"}


async def test_sentence_endpoint_without_gemini_returns_plain(client):
    r = await client.post("/api/sentence", json={"signs": ["Привет!", "утро"], "target_lang": "uz"})
    assert r.json()["sentence"] == "Привет! утро" and r.json()["smoothed"] is False


async def test_sentence_endpoint_validation(client):
    assert (await client.post("/api/sentence", json={"signs": []})).status_code == 400
    assert (await client.post("/api/sentence", json={"signs": ["a"], "target_lang": "de"})).status_code == 400
    r = await client.post("/api/sentence", json={"signs": ["a"], "sign_lang": "xyz"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "unsupported_language"
