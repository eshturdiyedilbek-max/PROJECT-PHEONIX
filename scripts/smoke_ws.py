"""Stream frames to a running backend and print what comes back.

  python scripts/smoke_ws.py --url ws://localhost:8000 --video some_sign.mp4
  python scripts/smoke_ws.py --url ws://localhost:8000            # synthetic grey frames
  python scripts/smoke_ws.py --lang asl --video hello.mp4         # American Sign Language
"""

import argparse
import asyncio
import json
import uuid

import cv2
import numpy as np
import websockets


def frames(video: str | None, fps: int, seconds: float):
    if video:
        cap = cv2.VideoCapture(video)
        src_fps = cap.get(cv2.CAP_PROP_FPS) or 30
        step = max(1, round(src_fps / fps))
        i = 0
        while True:
            ok, img = cap.read()
            if not ok:
                break
            if i % step == 0:
                yield img
            i += 1
    else:
        for i in range(int(fps * seconds)):
            yield np.full((360, 480, 3), (i * 3) % 255, np.uint8)


async def main(a):
    async with websockets.connect(f"{a.url}/ws/sign?client_id={uuid.uuid4()}&lang={a.lang}") as ws:
        await ws.send(json.dumps({"type": "start", "fps": a.fps}))
        print(await ws.recv())

        async def reader():
            async for m in ws:
                print(m)
                if json.loads(m).get("type") == "final":
                    return

        task = asyncio.create_task(reader())
        for img in frames(a.video, a.fps, a.seconds):
            ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 70])
            await ws.send(buf.tobytes())
            await asyncio.sleep(1 / a.fps)
        await ws.send(json.dumps({"type": "stop"}))
        await asyncio.wait_for(task, 30)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--url", default="ws://localhost:8000")
    p.add_argument("--video")
    p.add_argument("--lang", default="rsl", help="sign language code: rsl or asl")
    p.add_argument("--fps", type=int, default=15)
    p.add_argument("--seconds", type=float, default=4)
    asyncio.run(main(p.parse_args()))
