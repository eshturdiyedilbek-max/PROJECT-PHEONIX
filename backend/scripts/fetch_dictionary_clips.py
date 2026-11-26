"""Put one short Slovo video on every Russian (RSL) dictionary word, served by the site itself.

Slovo (© SberDevices, CC BY-SA 4.0) has 20 clips for each of its 1000 words. This picks one clip per
word, shrinks it for phones (360 px, no sound, ~100-200 KB) and writes:

    frontend/assets/dict/rsl/<n>.mp4 and <n>.jpg   (the clip and its poster frame)
    frontend/assets/dict/rsl.json                  (word -> clip, read by js/learn.js)

By default it reads the 16 GB slovo.zip in place with HTTP range requests (only the chosen clips are
downloaded, about 1-2 GB). If the server refuses ranges, pass --download to fetch the whole zip, or
--zip-path to use a copy you already have (for example from Kaggle: kapitanov/slovo).

Needs ffmpeg on PATH and `pip install remotezip` (Colab has ffmpeg). Safe to re-run: finished clips
are skipped.

    python scripts/fetch_dictionary_clips.py            # all words
    python scripts/fetch_dictionary_clips.py --limit 20 # quick try
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import shutil
import subprocess
import sys
import tempfile
import zipfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
OUT = REPO / "frontend" / "assets" / "dict"
SLOVO_ZIP = "https://rndml-team-cv.obs.ru-moscow-1.hc.sbercloud.ru/datasets/slovo/slovo.zip"
CREDIT = "Slovo © SberDevices, CC BY-SA 4.0"
SKIP = {"no_event"}


def open_zip(args) -> zipfile.ZipFile:
    if args.zip_path:
        return zipfile.ZipFile(args.zip_path)
    if args.download:
        dest = Path(args.download_to)
        if not dest.exists():
            print(f"downloading {args.url} -> {dest} (~16 GB)")
            subprocess.run(["curl", "-L", "--fail", "-C", "-", "-o", str(dest), args.url], check=True)
        return zipfile.ZipFile(dest)
    try:
        from remotezip import RemoteZip
    except ImportError:
        sys.exit("pip install remotezip  (or use --download / --zip-path)")
    url = args.url
    print(f"reading {url} in place (range requests)")
    try:
        return RemoteZip(url)
    except Exception:  # some servers refuse "last N bytes" ranges; ask for explicit ones instead
        try:
            return RemoteZip(url, support_suffix_range=False)
        except Exception as e:
            sys.exit(f"range requests failed ({e}). Re-run with --download (fetches the whole 16 GB zip).")


def pick_clips(zf: zipfile.ZipFile, words: list[str]) -> dict[str, zipfile.ZipInfo]:
    names = zf.infolist()
    ann = next((i for i in names if i.filename.endswith("annotations.csv")), None)
    if not ann:
        sys.exit("annotations.csv not found in the zip")
    videos = {Path(i.filename).stem: i for i in names if i.filename.lower().endswith((".mp4", ".mov", ".webm"))}
    raw = zf.read(ann).decode("utf-8-sig")
    delim = "\t" if raw.split("\n", 1)[0].count("\t") > raw.split("\n", 1)[0].count(",") else ","
    rows = list(csv.DictReader(io.StringIO(raw), delimiter=delim))
    # exact text first: the letter "Я" and the word "я" are different signs
    by_word: dict[str, list[dict]] = {}
    by_lower: dict[str, list[dict]] = {}
    for r in rows:
        if r.get("attachment_id") in videos:
            by_word.setdefault(r["text"].strip(), []).append(r)
            by_lower.setdefault(r["text"].strip().lower(), []).append(r)
    chosen = {}
    for w in words:
        cands = by_word.get(w) or (by_lower.get(w.lower()) if w.lower() == w else None)
        if not cands:
            continue
        # a test-split clip of typical length: clear, not cut short, not a slow outlier
        cands.sort(key=lambda r: (str(r.get("train", "")).lower() == "true", float(r.get("length") or 0)))
        test = [r for r in cands if str(r.get("train", "")).lower() != "true"] or cands
        chosen[w] = videos[test[len(test) // 2]["attachment_id"]]
    return chosen


def shrink(zf_lock, zf, info: zipfile.ZipInfo, mp4: Path, jpg: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / Path(info.filename).name
        with zf_lock:
            with zf.open(info) as f, open(src, "wb") as out:
                shutil.copyfileobj(f, out)
        vf = "scale='if(gt(iw,ih),-2,360)':'if(gt(iw,ih),360,-2)',fps=24"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-vf", vf, "-an", "-c:v", "libx264",
                        "-preset", "veryfast", "-crf", "30", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                        str(mp4)], check=True)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", "0.6", "-i", str(mp4), "-frames:v", "1",
                        "-q:v", "6", str(jpg)], check=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--zip-path", help="use a local slovo.zip")
    ap.add_argument("--url", default=SLOVO_ZIP, help="slovo.zip URL")
    ap.add_argument("--download", action="store_true", help="download the whole zip first")
    ap.add_argument("--download-to", default="/content/slovo.zip")
    ap.add_argument("--limit", type=int, default=0, help="only the first N words (for a quick try)")
    ap.add_argument("--workers", type=int, default=6)
    ap.add_argument("--out", default=str(OUT), help="where assets/dict lives (default: frontend/assets/dict)")
    args = ap.parse_args()
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg not found")

    words = [w for w in json.loads((HERE.parent / "data" / "rsl_classes.json").read_text("utf-8")) if w not in SKIP]
    if args.limit:
        words = words[: args.limit]
    zf = open_zip(args)
    chosen = pick_clips(zf, words)
    print(f"{len(chosen)} of {len(words)} words have a Slovo clip")

    out = Path(args.out)
    dest = out / "rsl"
    dest.mkdir(parents=True, exist_ok=True)
    manifest_path = out / "rsl.json"
    clips = json.loads(manifest_path.read_text("utf-8")).get("clips", {}) if manifest_path.exists() else {}
    import threading
    lock = threading.Lock()

    def job(item):
        n, (word, info) = item
        mp4, jpg = dest / f"{n}.mp4", dest / f"{n}.jpg"
        if not (mp4.exists() and jpg.exists()):
            shrink(lock, zf, info, mp4, jpg)
        return word, {"src": f"assets/dict/rsl/{n}.mp4", "poster": f"assets/dict/rsl/{n}.jpg"}

    order = {w: i + 1 for i, w in enumerate(words)}
    done = 0
    with ThreadPoolExecutor(args.workers) as pool:
        for word, entry in pool.map(job, [(order[w], (w, i)) for w, i in chosen.items()]):
            clips[word] = entry
            done += 1
            if done % 50 == 0:
                print(f"  {done}/{len(chosen)}")
                manifest_path.write_text(json.dumps({"credit": CREDIT, "clips": clips}, ensure_ascii=False), "utf-8")
    manifest_path.write_text(json.dumps({"credit": CREDIT, "clips": clips}, ensure_ascii=False), "utf-8")
    size = sum(p.stat().st_size for p in dest.glob("*")) / 1e6
    print(f"done: {len(clips)} words in {manifest_path} ({size:.0f} MB of clips)")


if __name__ == "__main__":
    main()
