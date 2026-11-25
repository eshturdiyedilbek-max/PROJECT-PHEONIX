"""Time one sign inference per enabled language, on whatever device ONNX Runtime picks.

Uses the same config/env vars as the server (SIGN_VARIANTS, SIGN_LANGUAGES_ENABLED).
Run from the repo root after scripts/download_models.py:
    python scripts/gpu_bench.py              # 10 timed runs per language
    python scripts/gpu_bench.py --runs 20 --json

"Per word" = one model call on a full window (e.g. 32 frames) + turning the 32 camera
JPEGs into model frames. Network time to the browser is not included.
"""

import argparse
import json
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import cv2  # noqa: E402
import numpy as np  # noqa: E402

from app.config import Settings  # noqa: E402
from app.sign.preprocess import decode_jpeg  # noqa: E402
from app.sign.recognizer import load_recognizer_for  # noqa: E402
from app.sign.registry import registry_for  # noqa: E402


def bench(rec, runs: int) -> dict:
    rng = np.random.default_rng(0)
    # Camera-like 640x480 JPEGs, decoded + letterboxed exactly like the WebSocket path does.
    jpeg = cv2.imencode(".jpg", rng.integers(0, 255, (480, 640, 3), np.uint8),
                        [cv2.IMWRITE_JPEG_QUALITY, 70])[1].tobytes()
    t = time.perf_counter()
    frames = [rec.to_frame(decode_jpeg(jpeg)) for _ in range(rec.window)]
    prep_ms = (time.perf_counter() - t) * 1000

    t = time.perf_counter()
    rec.predict(frames)  # first call: CUDA/cuDNN warm-up, often several seconds
    first_ms = (time.perf_counter() - t) * 1000
    rec.predict(frames)

    times = []
    for _ in range(runs):
        t = time.perf_counter()
        rec.predict(frames)
        times.append((time.perf_counter() - t) * 1000)
    infer_ms = statistics.median(times)
    return {
        "model": rec.name,
        "device": rec.device,
        "window_frames": rec.window,
        "first_call_ms": round(first_ms),
        "inference_ms_median": round(infer_ms, 1),
        "inference_ms_max": round(max(times), 1),
        "preprocess_ms_per_window": round(prep_ms, 1),
        "per_word_ms": round(infer_ms + prep_ms, 1),
    }


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--runs", type=int, default=10)
    p.add_argument("--json", action="store_true", help="print one JSON object instead of a table")
    a = p.parse_args()
    results, ok = {}, True
    for code, spec in registry_for(Settings()).items():
        rec = load_recognizer_for(spec)
        if rec is None:
            results[code] = {"error": f"model missing at {spec.variant.model_path}"}
            ok = False
            continue
        results[code] = bench(rec, a.runs)
        del rec
    if a.json:
        print(json.dumps(results))
    else:
        for code, r in results.items():
            if "error" in r:
                print(f"{code}: {r['error']}")
                continue
            print(f"{code} {r['model']} on {r['device'].upper()}: {r['inference_ms_median']} ms/inference "
                  f"(max {r['inference_ms_max']}), +{r['preprocess_ms_per_window']} ms preprocessing "
                  f"= {r['per_word_ms']} ms per word; first call {r['first_call_ms']} ms")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
