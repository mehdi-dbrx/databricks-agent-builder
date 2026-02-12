#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Load .env.local so backend (and any future Python service) inherit DATABRICKS_* etc.
if [[ ! -f "$ROOT/.env.local" ]]; then
  echo "ERROR: .env.local not found at $ROOT/.env.local. Copy .env.template to .env.local and set DATABRICKS_HOST and DATABRICKS_TOKEN."
  exit 1
fi
set -a
# shellcheck source=/dev/null
source "$ROOT/.env.local"
set +a

kill_port() { lsof -ti :"$1" 2>/dev/null | xargs kill -9 2>/dev/null || true; }
kill_port 3002
kill_port 3001
kill_port 5173

# Long-running Python service (Genie/Databricks sidecar); inherits env from start.sh
(cd "$ROOT/backend/python-service" && uv run uvicorn app:app --host 127.0.0.1 --port 3002) &
cd "$ROOT/backend" && npm run dev &
cd "$ROOT/frontend" && npm run dev
wait
