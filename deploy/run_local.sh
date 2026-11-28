#!/usr/bin/env bash
# Phoenix backend on this computer (no Colab, no GPU needed) + a free public HTTPS address.
#
#   ./deploy/run_local.sh            install (first time only) and start server + tunnel
#   ./deploy/run_local.sh stop       stop both
#   ./deploy/run_local.sh status     is it running, and on which address
#   ./deploy/run_local.sh logs       last server / tunnel log lines
#
# Needs: Linux x86_64, internet. No sudo: Python (via uv) and cloudflared are downloaded into
# ~/.phoenix. Sign models run on the CPU with ONNX Runtime (slower than a GPU, fine for a demo).
#
# Optional, in backend/.env (git-ignored): GEMINI_API_KEY=...   (better speech-to-text)
# Optional env: GITHUB_TOKEN=... (Contents: Read and write) -> also writes the new address into
#   frontend/server.json on main, so the Vercel site follows it automatically.
# Optional env: PORT (8000), RSL_MODEL (mvit32-2 | mvit16-4 lighter), ENABLE_ASL (1), SIGN_STRIDE (16).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
HOME_DIR="${PHOENIX_HOME:-$HOME/.phoenix}"
BIN="$HOME_DIR/bin"
VENV="$HOME_DIR/venv"
PORT="${PORT:-8000}"
REPO="${REPO:-eshturdiyedilbek-max/PROJECT-PHEONIX}"
mkdir -p "$BIN" "$HOME_DIR/uploads"
export PATH="$BIN:$PATH"

say() { printf '\033[1;31m▸\033[0m %s\n' "$*"; }
die() { printf '\033[1;31mXATO:\033[0m %s\n' "$*" >&2; exit 1; }

stop_all() {
  for name in tunnel server; do
    if [[ -f "$HOME_DIR/$name.pid" ]]; then
      kill "$(cat "$HOME_DIR/$name.pid")" 2>/dev/null || true
      rm -f "$HOME_DIR/$name.pid"
    fi
  done
  pkill -f "uvicorn app.main:app --host 127.0.0.1 --port $PORT" 2>/dev/null || true
  pkill -f "cloudflared tunnel --no-autoupdate --url http://127.0.0.1:$PORT" 2>/dev/null || true
}

alive() { [[ -f "$HOME_DIR/$1.pid" ]] && kill -0 "$(cat "$HOME_DIR/$1.pid")" 2>/dev/null; }

case "${1:-start}" in
  stop) stop_all; say "to'xtatildi"; exit 0 ;;
  status)
    alive server && say "server: ishlayapti (port $PORT)" || say "server: o'chiq"
    alive tunnel && say "tunnel: $(cat "$HOME_DIR/url.txt" 2>/dev/null)" || say "tunnel: o'chiq"
    exit 0 ;;
  logs) tail -n 40 "$HOME_DIR/server.log" "$HOME_DIR/tunnel.log" 2>/dev/null; exit 0 ;;
  start) ;;
  *) die "noma'lum buyruq: $1 (start | stop | status | logs)" ;;
esac

[[ "$(uname -s)" == Linux && "$(uname -m)" == x86_64 ]] || die "bu skript Linux x86_64 uchun"

# 1. Tools: uv (brings its own Python 3.12) and cloudflared. Downloaded once.
if ! command -v uv >/dev/null; then
  say "uv yuklanmoqda (Python o'rnatuvchi)..."
  curl -LsSf https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-unknown-linux-gnu.tar.gz \
    | tar -xz -C "$BIN" --strip-components=1
fi
if ! command -v cloudflared >/dev/null; then
  say "cloudflared yuklanmoqda (bepul ochiq manzil)..."
  curl -LsSf -o "$BIN/cloudflared" \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
  chmod +x "$BIN/cloudflared"
fi

# 2. Python env + backend. Reinstalls only when pyproject.toml changed.
PY="$VENV/bin/python"
[[ -x "$PY" ]] || { say "Python 3.12 muhiti yaratilmoqda..."; uv venv -q --python 3.12 "$VENV"; }
STAMP="$HOME_DIR/installed.sha"
WANT="$(sha1sum "$BACKEND/pyproject.toml" | cut -d' ' -f1)"
if [[ "$(cat "$STAMP" 2>/dev/null)" != "$WANT" ]]; then
  say "kutubxonalar o'rnatilmoqda (birinchi marta ~3 daqiqa)..."
  VIRTUAL_ENV="$VENV" uv pip install -q -e "$BACKEND"
  echo "$WANT" > "$STAMP"
fi

# 3. Settings shared by the model download and the server.
RSL_MODEL="${RSL_MODEL:-mvit32-2}"
export SIGN_VARIANTS="rsl=$RSL_MODEL,asl=signflow-a"
export SIGN_LANGUAGES_ENABLED="$([[ "${ENABLE_ASL:-1}" == 1 ]] && echo rsl,asl || echo rsl)"
export SIGN_STRIDE="${SIGN_STRIDE:-16}"           # CPU: fewer inferences per second of video
export MAX_CONCURRENT_INFERENCES="${MAX_CONCURRENT_INFERENCES:-2}"
export STT_DEVICE=cpu STT_COMPUTE_TYPE=int8 STT_MODEL="${STT_MODEL:-small}"
export HF_HOME="$HOME_DIR/hf_cache"
export CORS_ORIGINS="${CORS_ORIGINS:-*}"
export DATABASE_URL="sqlite+aiosqlite:///$HOME_DIR/phoenix.db"
export UPLOAD_DIR="$HOME_DIR/uploads"

say "modellar tekshirilmoqda (birinchi marta ~300 MB)..."
(cd "$BACKEND" && "$PY" scripts/download_models.py)

# 4. Start the server (localhost only; the tunnel is the public door).
stop_all
say "server ishga tushmoqda..."
(cd "$BACKEND" && nohup "$PY" -m uvicorn app.main:app --host 127.0.0.1 --port "$PORT" \
   --workers 1 --ws-max-size 1048576 --timeout-graceful-shutdown 10 \
   > "$HOME_DIR/server.log" 2>&1 & echo $! > "$HOME_DIR/server.pid")
for i in $(seq 180); do
  alive server || { tail -n 40 "$HOME_DIR/server.log"; die "server yiqildi (log yuqorida)"; }
  curl -fs "http://127.0.0.1:$PORT/api/health" >/dev/null && break
  sleep 2
  [[ $i == 180 ]] && die "server 6 daqiqada ochilmadi: $HOME_DIR/server.log"
done
say "server tayyor: $(curl -fs "http://127.0.0.1:$PORT/api/health")"

# 5. Public HTTPS + WSS address (Cloudflare quick tunnel: free, no account).
nohup cloudflared tunnel --no-autoupdate --url "http://127.0.0.1:$PORT" \
  > "$HOME_DIR/tunnel.log" 2>&1 & echo $! > "$HOME_DIR/tunnel.pid"
URL=""
for _ in $(seq 60); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$HOME_DIR/tunnel.log" \
         | grep -v '^https://api\.trycloudflare\.com$' | head -n1 || true)"
  [[ -n "$URL" ]] && break
  sleep 1
done
[[ -n "$URL" ]] || { tail -n 30 "$HOME_DIR/tunnel.log"; die "tunnel ochilmadi"; }
echo "$URL" > "$HOME_DIR/url.txt"
for _ in $(seq 30); do curl -fs "$URL/api/health" >/dev/null && break; sleep 2; done

# 6. Optional: point the Vercel site at this address (frontend/server.json on main).
if [[ -n "${GITHUB_TOKEN:-}" ]]; then
  URL="$URL" REPO="$REPO" "$PY" - <<'PYEOF' || say "server.json yangilanmadi (token faqat o'qiy oladimi?)"
import base64, json, os, urllib.request
repo, url, tok = os.environ["REPO"], os.environ["URL"], os.environ["GITHUB_TOKEN"]
def gh(method, path, body=None):
    req = urllib.request.Request(f"https://api.github.com/repos/{repo}/{path}", method=method,
        data=json.dumps(body).encode() if body else None,
        headers={"Authorization": f"Bearer {tok}", "User-Agent": "phoenix-local",
                 "Accept": "application/vnd.github+json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())
want = json.dumps({"api": url}, indent=2) + "\n"
cur = gh("GET", "contents/frontend/server.json?ref=main")
if base64.b64decode(cur["content"]).decode() != want:
    gh("PUT", "contents/frontend/server.json", {"message": "Point the site at the current server",
       "content": base64.b64encode(want.encode()).decode(), "sha": cur["sha"], "branch": "main",
       "committer": {"name": "Phoenix", "email": "phoenix@localhost"}})
print("frontend/server.json ->", url)
PYEOF
fi

cat <<EOF

================== PHOENIX ISHLAYAPTI ==================
 Sayt + API:        $URL
 Sign WebSocket:    ${URL/https:/wss:}/ws/sign?lang=rsl
 Holat:             $URL/api/health
 To'xtatish:        $0 stop
 Kompyuter yoqiq va internetga ulangan turishi kerak.
 Har qayta ishga tushirganda manzil o'zgaradi.
========================================================
EOF
