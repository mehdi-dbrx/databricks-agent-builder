#!/usr/bin/env bash
# List Unity Catalog catalogs via REST API.
# Loads DATABRICKS_HOST and DATABRICKS_TOKEN from ../.env.local
# Usage: run from repo root: ./sandbox/list-uc-catalogs.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: .env.local not found at $ENV_FILE"
  exit 1
fi

set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

if [[ -z "${DATABRICKS_HOST:-}" ]]; then
  echo "ERROR: DATABRICKS_HOST not set in .env.local"
  exit 1
fi
if [[ -z "${DATABRICKS_TOKEN:-}" ]]; then
  echo "ERROR: DATABRICKS_TOKEN not set in .env.local"
  exit 1
fi

# Databricks Unity Catalog: list catalogs
# https://docs.databricks.com/api/workspace/catalogs/list
# GET /api/2.1/unity-catalog/catalogs
URL="${DATABRICKS_HOST}/api/2.1/unity-catalog/catalogs"
echo "GET $URL"
curl -s -S -X GET "$URL" \
  -H "Authorization: Bearer $DATABRICKS_TOKEN" \
  -H "Content-Type: application/json" \
  | jq .
