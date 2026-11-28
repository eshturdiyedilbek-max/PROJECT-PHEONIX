"""Two-person conversation rooms: pairing and text relay. Protocol: docs/API.md §10.

A conversation always has two seats. One person signs (their recognized signs arrive here as text),
the other speaks (their speech arrives as subtitles). The hub only pairs people and relays text; it
never sees camera frames or audio. Everything lives in memory of this one server process, which is
what the single-instance Colab/Kaggle deployment runs.

Two ways in:
- random: wait in a queue until someone with the other role arrives;
- room code: one person creates a 6-character code and tells it to the other, who joins with it.
"""

import asyncio
import json
import secrets
import time
from collections import deque
from dataclasses import dataclass, field

from fastapi import WebSocket

ROLES = ("sign", "voice")
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I: codes are read out loud
CODE_LEN = 6
MAX_ROOMS = 500
MAX_TEXT = 500
MAX_DRAFT = 200
MAX_NAME = 24


def other_role(role: str) -> str:
    return "voice" if role == "sign" else "sign"


class ChatError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass(eq=False)
class Peer:
    ws: WebSocket | None
    role: str
    name: str = ""
    room: "Room | None" = None
    send_lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    closed: bool = False

    async def send(self, payload: dict) -> None:
        if self.closed or self.ws is None:
            return
        async with self.send_lock:
            try:
                await self.ws.send_text(json.dumps(payload, ensure_ascii=False))
            except Exception:  # the socket went away mid-send; the reader loop cleans up
                self.closed = True

    def public(self) -> dict:
        return {"role": self.role, "name": self.name}


@dataclass(eq=False)
class Room:
    code: str
    kind: str  # "random" or "code"
    peers: list[Peer] = field(default_factory=list)
    created: float = field(default_factory=time.monotonic)
    next_id: int = 1

    def partner(self, peer: Peer) -> Peer | None:
        return next((p for p in self.peers if p is not peer), None)


class ChatHub:
    def __init__(self) -> None:
        self.rooms: dict[str, Room] = {}
        self.queue: dict[str, deque[Peer]] = {r: deque() for r in ROLES}
        self.lock = asyncio.Lock()

    # ---- state for /api/chat/stats ---------------------------------------
    def stats(self) -> dict:
        return {
            "waiting": {r: len(q) for r, q in self.queue.items()},
            "conversations": sum(1 for r in self.rooms.values() if len(r.peers) == 2),
        }

    def _new_code(self) -> str:
        for _ in range(50):
            code = "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LEN))
            if code not in self.rooms:
                return code
        raise ChatError("busy", "Could not make a free room code, try again")

    def _make_room(self, kind: str) -> Room:
        if len(self.rooms) >= MAX_ROOMS:
            raise ChatError("busy", "Too many conversations right now, try again in a minute")
        room = Room(code=self._new_code(), kind=kind)
        self.rooms[room.code] = room
        return room

    # ---- ways in ----------------------------------------------------------
    async def join_random(self, peer: Peer) -> Room | None:
        """Pair with the longest-waiting person of the other role, or wait in the queue."""
        async with self.lock:
            q = self.queue[other_role(peer.role)]
            while q and q[0].closed:
                q.popleft()
            if not q:
                self.queue[peer.role].append(peer)
                return None
            partner = q.popleft()
            room = self._make_room("random")
            room.peers = [partner, peer]
            partner.room = peer.room = room
        await self._announce(room)
        return room

    async def create_room(self, peer: Peer) -> Room:
        async with self.lock:
            room = self._make_room("code")
            room.peers = [peer]
            peer.room = room
        return room

    async def join_room(self, peer: Peer, code: str) -> Room:
        code = (code or "").strip().upper()
        async with self.lock:
            room = self.rooms.get(code)
            if room is None or room.kind != "code":
                raise ChatError("room_not_found", "No conversation with this code")
            room.peers = [p for p in room.peers if not p.closed]
            if len(room.peers) >= 2:
                raise ChatError("room_full", "Two people are already talking in this room")
            room.peers.append(peer)
            peer.room = room
            ready = len(room.peers) == 2
        if ready:
            await self._announce(room)
        return room

    async def _announce(self, room: Room) -> None:
        a, b = room.peers
        await a.send({"type": "paired", "room": room.code, "kind": room.kind, "partner": b.public()})
        await b.send({"type": "paired", "room": room.code, "kind": room.kind, "partner": a.public()})

    # ---- talking ----------------------------------------------------------
    async def say(self, peer: Peer, text: str, source: str, lang: str | None) -> None:
        room = peer.room
        if room is None or len(room.peers) < 2:
            raise ChatError("no_partner", "Nobody is in the conversation yet")
        text = " ".join(str(text or "").split())[:MAX_TEXT]
        if not text:
            raise ChatError("bad_message", "text must not be empty")
        msg = {
            "type": "message",
            "id": room.next_id,
            "role": peer.role,
            "text": text,
            "source": source if source in ("sign", "speech", "typed") else "typed",
            "lang": lang if lang in ("uz", "ru", "en") else None,
            "ts": int(time.time() * 1000),
        }
        room.next_id += 1
        partner = room.partner(peer)
        await peer.send({**msg, "from": "me"})
        if partner:
            await partner.send({**msg, "from": "partner"})

    async def draft(self, peer: Peer, text: str) -> None:
        """Words still being signed or spoken: shown greyed out on the other screen, never stored."""
        room = peer.room
        partner = room.partner(peer) if room else None
        if partner:
            await partner.send({"type": "draft", "text": " ".join(str(text or "").split())[:MAX_DRAFT]})

    # ---- leaving ----------------------------------------------------------
    async def leave(self, peer: Peer) -> None:
        peer.closed = True
        async with self.lock:
            q = self.queue[peer.role]
            if peer in q:
                q.remove(peer)
            room, peer.room = peer.room, None
            partner = None
            if room is not None:
                room.peers = [p for p in room.peers if p is not peer]
                partner = room.partner(peer)
                # a code room stays open for the one still there (the other can come back with the code);
                # a random pairing ends with either person
                if room.kind == "random" and partner:
                    room.peers = []
                    partner.room = None
                if not room.peers:
                    self.rooms.pop(room.code, None)
        if partner:
            await partner.send({"type": "partner_left", "room_open": partner.room is not None})


def clean_name(raw: str | None) -> str:
    name = " ".join(str(raw or "").split())
    return "".join(c for c in name if c.isprintable())[:MAX_NAME]
