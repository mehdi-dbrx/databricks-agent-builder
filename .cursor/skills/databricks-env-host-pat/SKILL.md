---
name: databricks-env-host-pat
description: "Configure Databricks workspace host and PAT (Personal Access Token) for scripts and apps. Use when setting up .env.local, connecting CLI, creating PAT, or testing connection from an empty repo."
---

# Databricks env: host + PAT

Set up Databricks workspace host and Personal Access Token (PAT) for use in scripts, BFFs, and apps. All secrets live in `.env.local`; never commit them. Use the Databricks CLI to configure profiles and create PATs.

## When to Use This Skill

Use this skill when:
- Starting from an empty repo and need host + PAT for Databricks API calls
- Creating or updating `.env.local` and `.env.template`
- Connecting the Databricks CLI using existing credentials or a chosen profile
- Listing CLI profiles and asking the user which profile to use
- Creating a 90-day PAT and writing it (and host) into `.env.local`
- Testing that the connection works with a GET request

## Prerequisites

- **Databricks CLI** installed (e.g. `databricks --version`)
- **jq** installed (for `create-pat-and-update-env.sh`)
- Either:
  - A PAT and workspace host URL (to fill `.env.local` and connect CLI), or
  - An existing CLI profile in `~/.databrickscfg` (to create a new PAT and fill `.env.local`)

## Step-by-Step: From Empty Repo

### Step 1: Ignore env files in version control

Create or update `.gitignore` so env files are never committed:

```
.env
.env.local
.env*.local
```

### Step 2: Create env template

Create `.env.template` with placeholders. This file **is** committed; users copy it to `.env.local` and fill real values.

**File: `.env.template`**

```
# Databricks — copy to .env.local and set real values.

DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_TOKEN=your-personal-access-token
```

### Step 3: Create .env.local

Copy the template to `.env.local`:

```bash
cp .env.template .env.local
```

User then edits `.env.local` and sets:
- `DATABRICKS_HOST` — workspace URL (e.g. `https://adb-xxxx.11.azuredatabricks.net`)
- `DATABRICKS_TOKEN` — Personal Access Token

If the user will get the PAT from the CLI (Step 6), they can leave the token placeholder; the create-PAT script will overwrite it.

### Step 4: List CLI profiles and ask which profile to use

If the user already has the Databricks CLI configured, list profiles:

```bash
databricks auth profiles
```

Example output (contents of `~/.databrickscfg`):

```
azure
e2-demo
total-workspace
DEFAULT
```

Ask the user: **Which profile do you want to use?** (e.g. `DEFAULT`, `azure`). Use that profile name when:
- Running the connect script (set `DATABRICKS_PROFILE` or document the default)
- Running the create-PAT script: `./scripts/create-pat-and-update-env.sh <profile>`

If the user has no profiles yet, they must fill `.env.local` with host + token (from Databricks UI: Settings → Developer → Access tokens), then run the connect script to create a profile.

### Step 5: Connect CLI from .env.local (optional)

If the user has filled `.env.local` and wants to register those credentials as a CLI profile, add a script and run it.

**Script: `scripts/connect-databricks.sh`**  
(Full contents in [scripts.md](scripts.md).)

Usage:
- Default profile name is `agent-builder`. To use another name, set `DATABRICKS_PROFILE` before running:
  ```bash
  export DATABRICKS_PROFILE=azure
  ./scripts/connect-databricks.sh
  ```
- Or run with no export to create/update the `agent-builder` profile.

After running, verify:

```bash
databricks auth describe -p <profile>
```

### Step 6: Create a 90-day PAT and fill .env.local (optional)

If the user has a CLI profile (e.g. already logged in via `databricks configure` or OAuth), you can create a new PAT and write it (and host) into `.env.local`.

**Script: `scripts/create-pat-and-update-env.sh`**  
(Full contents in [scripts.md](scripts.md).)

Usage:

```bash
# Use DEFAULT profile
./scripts/create-pat-and-update-env.sh

# Use a specific profile (e.g. azure)
./scripts/create-pat-and-update-env.sh azure
```

The script:
1. Reads `host` from `~/.databrickscfg` for the given profile
2. Runs `databricks tokens create --lifetime-seconds 7776000 -o json -p <profile>` (90 days)
3. Parses `token_value` with jq
4. Writes/updates `.env.local` with `DATABRICKS_HOST` and `DATABRICKS_TOKEN`

Requires: **jq**, and a profile that already has host (and token or OAuth) in `~/.databrickscfg`.

### Step 7: Test the connection

Validate that `.env.local` works by calling a Databricks API with the token.

**Script: `scripts/test-connection.sh`**  
(Full contents in [scripts.md](scripts.md).)

Usage:

```bash
./scripts/test-connection.sh
```

The script:
1. Ensures `.env.local` exists and has `DATABRICKS_HOST` and `DATABRICKS_TOKEN`
2. Loads vars (no process substitution; plain `while read` so it works in any shell)
3. Sends **GET** `$DATABRICKS_HOST/api/2.0/preview/scim/v2/Me` with `Authorization: Bearer $DATABRICKS_TOKEN`
4. Prints HTTP status; on 200 prints OK; on non-200 prints body and exits 1

See [connection-test.md](connection-test.md) for why this endpoint is used.

### Step 8: Scripts directory and executability

Create the scripts directory and make scripts executable:

```bash
mkdir -p scripts
chmod +x scripts/connect-databricks.sh scripts/create-pat-and-update-env.sh scripts/test-connection.sh
```

## File layout (summary)

```
project/
├── .env.template      # Committed; placeholders only
├── .env.local         # Not committed; real host + token
├── .gitignore         # Include .env, .env.local, .env*.local
└── scripts/
    ├── connect-databricks.sh       # .env.local → CLI profile
    ├── create-pat-and-update-env.sh  # CLI profile → new PAT → .env.local
    └── test-connection.sh          # GET .../Me → validate
```

## Reference Files

- [scripts.md](scripts.md) — Full contents of all three scripts
- [connection-test.md](connection-test.md) — Endpoint used for connection test and why

## Common Issues

| Issue | What to do |
|-------|------------|
| **DATABRICKS_HOST or DATABRICKS_TOKEN not set** | Ensure `.env.local` exists, has no comments on the same line as the values, and uses `KEY=value` with no spaces around `=`. Script loads with `while read`; avoid `source <(...)` for portability. |
| **create-pat: "Failed to get token"** | Profile must exist in `~/.databrickscfg` with valid auth. Run `databricks auth describe -p <profile>`. |
| **create-pat: host empty in .env.local** | Script reads host from `~/.databrickscfg` for the profile. Ensure the profile has a `host = https://...` line. |
| **test-connection: HTTP 401/403** | Token invalid or expired. Create a new PAT (Step 6) or update `.env.local` from Databricks UI. |
| **test-connection: HTTP 404 on other endpoints** | Do not assume other paths (e.g. `/api/2.0/current-user`). Use **GET /api/2.0/preview/scim/v2/Me** as in this skill. |

## Security

- **Never commit** `.env.local` or any file containing real tokens.
- **Never print** token values in logs or output; redact as `[REDACTED]` if showing config.
- Prefer the backend (BFF) holding PAT; frontend should not receive PAT in production.
