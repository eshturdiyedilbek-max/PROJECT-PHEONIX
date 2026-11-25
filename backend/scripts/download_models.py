"""Download the sign model chosen for each enabled language, plus the Whisper model.

Uses config/sign_languages.json and the same env vars as the server
(SIGN_VARIANTS, SIGN_LANGUAGES_ENABLED, STT_MODEL). Run from the repo root:
    python scripts/download_models.py            # all enabled languages
    python scripts/download_models.py --skip-stt
"""

import argparse
import os
import shutil
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import Settings  # noqa: E402
from app.sign.registry import load_registry  # noqa: E402


def fetch(url: str, dest: Path) -> None:
    if dest.exists() and dest.stat().st_size > 0:
        print(f"ok      {dest} (already there)")
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".part")
    print(f"get     {url}")
    with urllib.request.urlopen(url, timeout=60) as r, open(tmp, "wb") as f:
        shutil.copyfileobj(r, f, length=1 << 20)
    tmp.rename(dest)
    print(f"saved   {dest} ({dest.stat().st_size / 1e6:.0f} MB)")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--skip-stt", action="store_true")
    a = p.parse_args()
    s = Settings()
    failed = False
    for code, spec in load_registry(s.sign_languages_path, s.sign_variants, s.sign_languages_enabled).items():
        v = spec.variant
        if not v.download_url:
            print(f"skip    {code}: variant {v.name} has no download_url; place it at {v.model_path}")
            continue
        try:
            fetch(v.download_url, Path(v.model_path))
        except Exception as e:  # keep going so one bad host doesn't block the rest
            failed = True
            print(f"FAILED  {code} ({v.name}): {e}", file=sys.stderr)
    if not a.skip_stt:
        from faster_whisper import WhisperModel

        WhisperModel(s.stt_model, device="cpu", compute_type="int8")
        print(f"ok      whisper {s.stt_model}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
