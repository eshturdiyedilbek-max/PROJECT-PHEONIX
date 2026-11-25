#!/usr/bin/env bash
# Kept for convenience; the logic lives in download_models.py (reads config/sign_languages.json).
set -euo pipefail
cd "$(dirname "$0")/.."
exec "${PYTHON:-python}" scripts/download_models.py "$@"
