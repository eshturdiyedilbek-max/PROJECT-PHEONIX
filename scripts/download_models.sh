#!/usr/bin/env bash
# Download model weights on the machine that runs the backend.
# Slovo models: CC BY-SA 4.0 (ai-forever/slovo). Whisper: MIT (OpenAI), via faster-whisper.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p models

SIGN_MODEL="${SIGN_MODEL_NAME:-mvit32-2}"
BASE="https://rndml-team-cv.obs.ru-moscow-1.hc.sbercloud.ru/datasets/slovo/models"
case "$SIGN_MODEL" in
  mvit*)   URL="$BASE/mvit/onnx/$SIGN_MODEL.onnx" ;;
  swin*)   URL="$BASE/swin/onnx/$SIGN_MODEL.onnx" ;;
  resnet*) URL="$BASE/resnet/onnx/$SIGN_MODEL.onnx" ;;
  *) echo "unknown SIGN_MODEL_NAME=$SIGN_MODEL" >&2; exit 1 ;;
esac

if [ ! -s "models/$SIGN_MODEL.onnx" ]; then
  echo "Downloading $URL"
  curl -fL --retry 4 -o "models/$SIGN_MODEL.onnx.part" "$URL"
  mv "models/$SIGN_MODEL.onnx.part" "models/$SIGN_MODEL.onnx"
fi
ls -lh "models/$SIGN_MODEL.onnx"

# Pre-fetch the Whisper model into the HuggingFace cache so the first request is fast.
PY="${PYTHON:-python}"
"$PY" - <<PYEOF
import os
from faster_whisper import WhisperModel
WhisperModel(os.environ.get("STT_MODEL", "small"), device="cpu", compute_type="int8")
print("whisper model ready")
PYEOF
