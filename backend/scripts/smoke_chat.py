"""Check two-person conversations (/ws/chat) on a running backend.

Opens a room as the sign-mode person, joins it as the voice-mode person, sends one line each way and
checks both sides see it. Text only, no camera or microphone needed.

  python scripts/smoke_chat.py --url ws://localhost:8000
  python scripts/smoke_chat.py --url wss://xxxx.trycloudflare.com
"""

import argparse
import asyncio
import json
import sys
import uuid

import websockets


async def recv_type(ws, wanted: str, timeout: float = 10):
    """Wait for the next message of one type, skipping others (waiting, draft, rtc...)."""
    while True:
        msg = json.loads(await asyncio.wait_for(ws.recv(), timeout))
        if msg.get("type") == "error":
            raise RuntimeError(f"server error: {msg}")
        if msg.get("type") == wanted:
            return msg


async def main(url: str) -> None:
    base = url.rstrip("/") + "/ws/chat"
    sign_url = f"{base}?client_id={uuid.uuid4()}&role=sign&room=new&name=Test-sign"
    async with websockets.connect(sign_url, open_timeout=20) as a:
        room = (await recv_type(a, "waiting"))["room"]
        print(f"room opened: {room}")
        voice_url = f"{base}?client_id={uuid.uuid4()}&role=voice&room={room}&name=Test-voice"
        async with websockets.connect(voice_url, open_timeout=20) as b:
            pa, pb = await recv_type(a, "paired"), await recv_type(b, "paired")
            print(f"paired: sign sees {pa['partner']}, voice sees {pb['partner']}")

            await a.send(json.dumps({"type": "say", "text": "Salom", "source": "sign", "lang": "uz"}))
            got_a, got_b = await recv_type(a, "message"), await recv_type(b, "message")
            assert got_a["from"] == "me" and got_b["from"] == "partner" and got_b["text"] == "Salom", (got_a, got_b)
            print(f"sign -> voice: {got_b['text']!r}")

            await b.send(json.dumps({"type": "say", "text": "Assalomu alaykum", "source": "speech", "lang": "uz"}))
            got_a = await recv_type(a, "message")
            assert got_a["from"] == "partner" and got_a["text"] == "Assalomu alaykum", got_a
            print(f"voice -> sign: {got_a['text']!r}")
    print("OK: two-person conversation works")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--url", default="ws://localhost:8000", help="ws:// or wss:// base of the server")
    try:
        asyncio.run(main(p.parse_args().url))
    except Exception as e:  # one clear line for the notebook
        print(f"FAILED: {type(e).__name__}: {e}")
        sys.exit(1)
