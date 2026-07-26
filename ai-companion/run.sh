#!/usr/bin/env bash
# Dev server. Creates the venv on first run.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
  .venv/bin/pip install -q -r requirements.txt
fi

exec .venv/bin/python -m uvicorn server.main:app --reload \
  --host "${HOST:-127.0.0.1}" --port "${PORT:-8000}"
