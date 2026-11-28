"""WS /ws/chat and GET /api/chat/stats: pair a signing person with a speaking person and relay
their text both ways. Protocol: docs/API.md §10. The hub itself is in app/chat/hub.py."""

import asyncio
import json
import time

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect

from app.chat.hub import ROLES, ChatError, ChatHub, Peer, clean_name
from app.deps import parse_client_id

router = APIRouter(tags=["chat"])

WAIT_TIMEOUT_S = 15 * 60      # nobody came: stop waiting after 15 minutes
TALK_IDLE_S = 30 * 60         # a paired conversation with no message at all for 30 minutes ends
MAX_MSGS_PER_10S = 40         # drafts included; plenty for live captions, too few for a flood
MAX_RTC_PER_10S = 120         # video call setup sends a burst of network candidates; counted apart


def hub_of(app) -> ChatHub:
    if getattr(app.state, "chat_hub", None) is None:
        app.state.chat_hub = ChatHub()
    return app.state.chat_hub


@router.get("/api/chat/stats")
async def chat_stats(request: Request):
    """How many people wait for a partner, per role. The site shows it on the search screen."""
    return hub_of(request.app).stats()


DEFAULT_ICE = [{"urls": ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"]}]


@router.get("/api/chat/ice")
async def chat_ice(request: Request):
    """ICE servers for the video call (WebRTC). Set CHAT_ICE_SERVERS to add a TURN relay."""
    raw = (getattr(request.app.state, "settings", None) and request.app.state.settings.chat_ice_servers) or ""
    servers = DEFAULT_ICE
    if raw.strip():
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list) and all(isinstance(s, dict) and s.get("urls") for s in parsed):
                servers = parsed
        except json.JSONDecodeError:
            pass
    return {"ice_servers": servers}


@router.websocket("/ws/chat")
async def chat_ws(ws: WebSocket, client_id: str | None = None, role: str = "", room: str = "",
                  name: str = ""):
    await ws.accept()
    hub = hub_of(ws.app)

    async def reject(code: str, message: str):
        await ws.send_text(json.dumps({"type": "error", "code": code, "message": message}))
        await ws.close(code=4400)

    if parse_client_id(client_id) is None:
        return await reject("invalid_client_id", "client_id query param must be a UUID")
    if role not in ROLES:
        return await reject("bad_role", "role must be sign or voice")

    peer = Peer(ws=ws, role=role, name=clean_name(name))
    try:
        try:
            if room == "new":
                r = await hub.create_room(peer)
                await peer.send({"type": "waiting", "mode": "room", "room": r.code})
            elif room:
                r = await hub.join_room(peer, room)
                if len(r.peers) < 2:
                    await peer.send({"type": "waiting", "mode": "room", "room": r.code})
            else:
                r = await hub.join_random(peer)
                if r is None:
                    await peer.send({"type": "waiting", "mode": "random", **hub.stats()})
        except ChatError as e:
            return await reject(e.code, e.message)

        window, count, rtc_count = time.monotonic(), 0, 0
        while True:
            timeout = TALK_IDLE_S if peer.room and len(peer.room.peers) == 2 else WAIT_TIMEOUT_S
            try:
                msg = await asyncio.wait_for(ws.receive(), timeout=timeout)
            except asyncio.TimeoutError:
                await peer.send({"type": "error", "code": "idle_timeout", "message": "Closed after a long silence"})
                await ws.close(code=4408)
                break
            if msg["type"] == "websocket.disconnect":
                break
            raw = msg.get("text")
            if raw is None:
                await peer.send({"type": "error", "code": "bad_message", "message": "Send JSON text"})
                continue
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                data = None
            kind = data.get("type") if isinstance(data, dict) else None
            now = time.monotonic()
            if now - window > 10:
                window, count, rtc_count = now, 0, 0
            if kind == "rtc":
                rtc_count += 1
                over, limit = rtc_count > MAX_RTC_PER_10S, rtc_count == MAX_RTC_PER_10S + 1
            else:
                count += 1
                over, limit = count > MAX_MSGS_PER_10S, count == MAX_MSGS_PER_10S + 1
            if over:
                if limit:
                    await peer.send({"type": "error", "code": "too_fast", "message": "Too many messages, slow down"})
                continue
            try:
                if kind == "rtc":
                    await hub.signal(peer, data)
                elif kind == "say":
                    await hub.say(peer, data.get("text", ""), data.get("source", "typed"), data.get("lang"))
                elif kind == "draft":
                    await hub.draft(peer, data.get("text", ""))
                elif kind == "ping":
                    await peer.send({"type": "pong"})
                elif kind == "leave":
                    break
                else:
                    await peer.send({"type": "error", "code": "bad_message",
                                     "message": "Expected JSON with type say, draft, rtc, ping or leave"})
            except ChatError as e:
                await peer.send({"type": "error", "code": e.code, "message": e.message})
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        await hub.leave(peer)
        try:
            await ws.close()
        except Exception:
            pass
