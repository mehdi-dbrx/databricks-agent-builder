#!/usr/bin/env bash
# Test list schemas API. Usage: ./playground/list-schemas.sh <catalog_name>
# Example: ./playground/list-schemas.sh main
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"
CATALOG="${1:-main}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env.local not found"
  exit 1
fi
set -a; source "$ENV_FILE"; set +a
[[ -n "$DATABRICKS_HOST" ]] || { echo "ERROR: DATABRICKS_HOST not set"; exit 1; }
[[ -n "$DATABRICKS_TOKEN" ]] || { echo "ERROR: DATABRICKS_TOKEN not set"; exit 1; }

URL="${DATABRICKS_HOST}/api/2.1/unity-catalog/schemas?catalog_name=${CATALOG}"
echo "GET $URL"
curl -s -S -w "\nHTTP %{http_code}\n" -X GET "$URL" \
  -H "Authorization: Bearer $DATABRICKS_TOKEN" \
  -H "Content-Type: application/json" \
  | head -100
