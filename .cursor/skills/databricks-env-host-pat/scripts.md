# Scripts: connect, create PAT, test connection

Full contents of the three scripts. Create `scripts/` in project root and make each file executable: `chmod +x scripts/*.sh`.

---

## 1. connect-databricks.sh

Configures the Databricks CLI from `.env.local` (host + token). Run from project root after `.env.local` is filled.

**Usage:**
- Default profile name: `agent-builder`. Override with `DATABRICKS_PROFILE`:
  ```bash
  export DATABRICKS_PROFILE=azure
  ./scripts/connect-databricks.sh
  ```
- Or run without export to use `agent-builder`.

**File: `scripts/connect-databricks.sh`**

```bash
#!/usr/bin/env bash
# Configure Databricks CLI from .env.local (host + token).
# Run from project root after filling .env.local.

set -e
cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "No .env.local found. Copy .env.template to .env.local and set DATABRICKS_HOST and DATABRICKS_TOKEN."
  exit 1
fi

# Load .env.local (skip comments and empty lines)
set -a
source <(grep -v '^#' .env.local | grep -v '^$')
set +a

if [[ -z "$DATABRICKS_HOST" || -z "$DATABRICKS_TOKEN" ]]; then
  echo "DATABRICKS_HOST and DATABRICKS_TOKEN must be set in .env.local."
  exit 1
fi

PROFILE="${DATABRICKS_PROFILE:-agent-builder}"
echo "$DATABRICKS_TOKEN" | databricks configure --host "$DATABRICKS_HOST" --profile "$PROFILE"
echo "Databricks CLI configured for $DATABRICKS_HOST (profile: $PROFILE). Verify with: databricks auth describe -p $PROFILE"
```

---

## 2. create-pat-and-update-env.sh

Creates a 90-day PAT via the CLI, reads host from `~/.databrickscfg` for the given profile, and writes/updates `.env.local` with `DATABRICKS_HOST` and `DATABRICKS_TOKEN`.

**Requires:** Databricks CLI configured (profile in `~/.databrickscfg` with host and auth), and **jq**.

**Usage:**
```bash
# Use DEFAULT profile
./scripts/create-pat-and-update-env.sh

# Use specific profile (e.g. azure)
./scripts/create-pat-and-update-env.sh azure
```

**File: `scripts/create-pat-and-update-env.sh`**

```bash
#!/usr/bin/env bash
# Create a 90-day PAT via CLI, parse output, update .env.local.
# Requires: CLI already configured (e.g. connect-databricks.sh), jq.

set -e
cd "$(dirname "$0")/.."
PROFILE="${1:-DEFAULT}"
LIFETIME=7776000   # 90 days

cfg="${DATABRICKS_CONFIG_FILE:-$HOME/.databrickscfg}"
host=$(awk -v p="$PROFILE" '
  $0 == "["p"]" { in_block=1; next }
  in_block && /^\[/ { exit }
  in_block && /^host[[:space:]]*=/ { gsub(/^host[[:space:]]*=[[:space:]]*/, ""); print; exit }
' "$cfg" 2>/dev/null)

json=$(databricks tokens create --lifetime-seconds "$LIFETIME" -o json -p "$PROFILE")
token=$(echo "$json" | jq -r '.token_value')

[[ -z "$token" ]] && { echo "Failed to get token from output."; exit 1; }

if [[ -f .env.local ]]; then
  grep -v '^DATABRICKS_HOST=' .env.local | grep -v '^DATABRICKS_TOKEN=' > .env.local.tmp || true
else
  : > .env.local.tmp
fi
echo "DATABRICKS_HOST=${host:-https://your-workspace.cloud.databricks.com}" >> .env.local.tmp
echo "DATABRICKS_TOKEN=$token" >> .env.local.tmp
mv .env.local.tmp .env.local
echo "Updated .env.local with new PAT (90 days). Host: ${host:-<set manually if missing>}"
```

---

## 3. test-connection.sh

Loads `.env.local`, checks `DATABRICKS_HOST` and `DATABRICKS_TOKEN` are set, then calls **GET** `$DATABRICKS_HOST/api/2.0/preview/scim/v2/Me` with Bearer token. Exits 0 on HTTP 200, 1 otherwise and prints status and body.

**Usage:**
```bash
./scripts/test-connection.sh
```

**File: `scripts/test-connection.sh`**

```bash
#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."

[[ ! -f .env.local ]] && { echo "ERROR: .env.local not found"; exit 1; }
echo "--- .env.local ---"
cat .env.local
echo "---"
while IFS= read -r line; do
  [[ "$line" =~ ^#.*$ ]] && continue
  [[ -z "$line" ]] && continue
  export "$line"
done < .env.local

[[ -z "$DATABRICKS_HOST" ]] && { echo "ERROR: DATABRICKS_HOST not set in .env.local"; exit 1; }
[[ -z "$DATABRICKS_TOKEN" ]] && { echo "ERROR: DATABRICKS_TOKEN not set in .env.local"; exit 1; }

resp=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $DATABRICKS_TOKEN" "$DATABRICKS_HOST/api/2.0/preview/scim/v2/Me")
code=$(echo "$resp" | tail -n 1)
body=$(echo "$resp" | sed '$d')

echo "HTTP $code"
[[ "$code" != "200" ]] && { echo "$body"; exit 1; }
echo OK
```

**Notes:**
- Loading env uses `while read` and `export` so it works in shells that do not support `source <(...)`.
- Response body is separated from status with `tail -n 1` and `sed '$d'` (portable; avoid `head -n -1` on macOS).
- Endpoint: **GET /api/2.0/preview/scim/v2/Me** — see [connection-test.md](connection-test.md).
