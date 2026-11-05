#!/bin/sh
set -eu

python3 -m flask --app backend.app run --host 127.0.0.1 --port 5000 &
FLASK_PID=$!

cleanup() {
  kill "$FLASK_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

pnpm start
