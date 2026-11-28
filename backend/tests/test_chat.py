"""Two-person conversation: WS /ws/chat pairing (random queue and room codes) and text relay."""
import json
import uuid

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def tc(app):
    with TestClient(app) as c:
        yield c


def _url(role, room="", name=""):
    q = f"/ws/chat?client_id={uuid.uuid4()}&role={role}"
    if room:
        q += f"&room={room}"
    if name:
        q += f"&name={name}"
    return q


def _recv(ws):
    return json.loads(ws.receive_text())


def test_rejects_bad_client_and_role(tc):
    with tc.websocket_connect("/ws/chat?client_id=nope&role=sign") as ws:
        assert _recv(ws)["code"] == "invalid_client_id"
    with tc.websocket_connect(f"/ws/chat?client_id={uuid.uuid4()}&role=admin") as ws:
        assert _recv(ws)["code"] == "bad_role"


def test_random_pairs_sign_with_voice_and_relays_both_ways(tc):
    with tc.websocket_connect(_url("sign", name="Ali")) as a:
        w = _recv(a)
        assert w["type"] == "waiting" and w["mode"] == "random" and w["waiting"]["sign"] == 1
        assert tc.get("/api/chat/stats").json()["waiting"] == {"sign": 1, "voice": 0}
        with tc.websocket_connect(_url("voice", name="Vali")) as b:
            pb, pa = _recv(b), _recv(a)
            assert pa["type"] == pb["type"] == "paired" and pa["room"] == pb["room"]
            assert pa["partner"] == {"role": "voice", "name": "Vali"}
            assert pb["partner"] == {"role": "sign", "name": "Ali"}
            assert tc.get("/api/chat/stats").json() == {"waiting": {"sign": 0, "voice": 0}, "conversations": 1}

            a.send_text(json.dumps({"type": "draft", "text": "salom   men"}))
            assert _recv(b) == {"type": "draft", "text": "salom men"}

            a.send_text(json.dumps({"type": "say", "text": "Salom, men shifokorman", "source": "sign", "lang": "uz"}))
            mine, theirs = _recv(a), _recv(b)
            assert mine["from"] == "me" and theirs["from"] == "partner"
            assert theirs["text"] == "Salom, men shifokorman" and theirs["source"] == "sign"
            assert theirs["role"] == "sign" and theirs["lang"] == "uz" and theirs["id"] == 1

            b.send_text(json.dumps({"type": "say", "text": "Qanday yordam bera olaman?", "source": "speech"}))
            assert _recv(a)["text"] == "Qanday yordam bera olaman?"
            assert _recv(b)["id"] == 2
        left = _recv(a)
        assert left == {"type": "partner_left", "room_open": False}


def test_same_role_waits_instead_of_pairing(tc):
    with tc.websocket_connect(_url("voice")) as a, tc.websocket_connect(_url("voice")) as b:
        assert _recv(a)["type"] == "waiting"
        assert _recv(b)["type"] == "waiting"
        assert tc.get("/api/chat/stats").json()["waiting"]["voice"] == 2
        with tc.websocket_connect(_url("sign")) as c:
            assert _recv(c)["partner"]["role"] == "voice"
            assert _recv(a)["type"] == "paired"   # the one who waited longest goes first
    assert tc.get("/api/chat/stats").json()["waiting"] == {"sign": 0, "voice": 0}


def test_room_code_flow_and_rejoin(tc):
    with tc.websocket_connect(_url("sign", room="new")) as a:
        w = _recv(a)
        code = w["room"]
        assert w["mode"] == "room" and len(code) == 6 and code.isupper()
        with tc.websocket_connect(_url("voice", room=code.lower())) as b:   # codes are case-insensitive
            assert _recv(b)["type"] == "paired" and _recv(a)["room"] == code
            with tc.websocket_connect(_url("voice", room=code)) as c:
                assert _recv(c)["code"] == "room_full"
        assert _recv(a) == {"type": "partner_left", "room_open": True}
        # the other person comes back with the same code
        with tc.websocket_connect(_url("voice", room=code)) as b2:
            assert _recv(b2)["type"] == "paired"
            assert _recv(a)["type"] == "paired"
    with tc.websocket_connect(_url("voice", room=code)) as late:
        assert _recv(late)["code"] == "room_not_found"


def test_say_needs_partner_and_text(tc):
    with tc.websocket_connect(_url("sign", room="new")) as a:
        _recv(a)
        a.send_text(json.dumps({"type": "say", "text": "salom"}))
        assert _recv(a)["code"] == "no_partner"
        a.send_text("not json")
        assert _recv(a)["code"] == "bad_message"
        a.send_text(json.dumps({"type": "ping"}))
        assert _recv(a) == {"type": "pong"}
    with tc.websocket_connect(_url("sign")) as a, tc.websocket_connect(_url("voice")) as b:
        _recv(a), _recv(a), _recv(b)
        a.send_text(json.dumps({"type": "say", "text": "   "}))
        assert _recv(a)["code"] == "bad_message"
        a.send_text(json.dumps({"type": "say", "text": "x" * 900, "source": "hack"}))
        m = _recv(a)
        assert len(m["text"]) == 500 and m["source"] == "typed"


def test_flood_is_cut(tc):
    with tc.websocket_connect(_url("sign")) as a, tc.websocket_connect(_url("voice")) as b:
        _recv(a), _recv(a), _recv(b)
        for _ in range(45):
            a.send_text(json.dumps({"type": "draft", "text": "x"}))
        for _ in range(40):
            assert _recv(b)["type"] == "draft"
        assert _recv(a)["code"] == "too_fast"


def test_video_call_signals_reach_the_other_person_only(tc):
    with tc.websocket_connect(_url("sign")) as a:
        _recv(a)
        with tc.websocket_connect(_url("voice")) as b:
            pb, pa = _recv(b), _recv(a)
            assert pa["offer"] is True and pb["offer"] is False   # exactly one side starts the call

            a.send_text(json.dumps({"type": "rtc", "kind": "offer", "sdp": "v=0 offer"}))
            assert _recv(b) == {"type": "rtc", "kind": "offer", "sdp": "v=0 offer"}
            b.send_text(json.dumps({"type": "rtc", "kind": "answer", "sdp": "v=0 answer"}))
            assert _recv(a) == {"type": "rtc", "kind": "answer", "sdp": "v=0 answer"}
            cand = {"candidate": "candidate:1 1 udp 1 1.2.3.4 5 typ host", "sdpMid": "0", "sdpMLineIndex": 0}
            b.send_text(json.dumps({"type": "rtc", "kind": "ice", "candidate": cand}))
            assert _recv(a) == {"type": "rtc", "kind": "ice", "candidate": cand}
            a.send_text(json.dumps({"type": "rtc", "kind": "cam", "on": True, "extra": "dropped"}))
            assert _recv(b) == {"type": "rtc", "kind": "cam", "on": True}

            a.send_text(json.dumps({"type": "rtc", "kind": "hack"}))
            assert _recv(a)["code"] == "bad_message"
            a.send_text(json.dumps({"type": "rtc", "kind": "offer", "sdp": "x" * 20000}))
            assert _recv(a)["code"] == "bad_message"


def test_video_call_needs_a_partner_and_ice_servers_are_listed(tc):
    with tc.websocket_connect(_url("sign", room="new")) as a:
        _recv(a)
        a.send_text(json.dumps({"type": "rtc", "kind": "offer", "sdp": "v=0"}))
        assert _recv(a)["code"] == "no_partner"
    ice = tc.get("/api/chat/ice").json()["ice_servers"]
    assert ice and all(s["urls"] for s in ice)
