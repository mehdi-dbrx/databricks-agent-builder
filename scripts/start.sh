#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
kill_port() { lsof -ti :"$1" 2>/dev/null | xargs kill -9 2>/dev/null || true; }
kill_port 3001
kill_port 5173
cd "$ROOT/backend" && npm run dev &
cd "$ROOT/frontend" && npm run dev
wait
