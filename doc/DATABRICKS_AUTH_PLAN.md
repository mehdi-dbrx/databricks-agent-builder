# Plan: Option A — Python layer using databricks-tools-core auth

**Goal:** Move all Databricks authentication and API calls behind a Python service that uses `databricks-tools-core` (`auth.py` + SDK). No code changes yet — planning only.

---

## 0. Critical assessment: Does this change make sense?

**Short answer:** It depends. For the *current* state of the code, the change is **hard to justify**. For a *future* where you need OAuth, multi-user, or many more Databricks features, it can make sense.

**Current reality:**

| Aspect | Today | What Option A adds |
|--------|--------|--------------------|
| **Backend** | Single Node process, ~380 lines total (index.js + databricks-client.js). No Python. | Second process (Python), new HTTP contract, startup order, health checks, error mapping. |
| **Auth** | Two env vars (DATABRICKS_HOST, DATABRICKS_TOKEN). PAT only. Single tenant. | Same env in v1; the “robustness” is about *future* OAuth / multi-user. |
| **Databricks surface** | ~10 distinct operations (Me, catalogs, schemas, volumes, FS dir/file). Simple paths. | You’d reimplement each as an “op” in Python and call SDK/databricks-tools-core. No current pain is solved. |
| **databricks-tools-core** | **Not used by the backend.** It lives in the repo for other use (CLI, notebooks, etc.). The backend is 100% Node. | You’d introduce a dependency from the backend (via the Python service) to databricks-tools-core. |

**When Option A *does* make sense:**

- You have a **concrete near-term need**: OAuth M2M (Databricks Apps), or per-user tokens, or many other scripts/services already using databricks-tools-core and you want one auth stack.
- You expect the backend to **grow** into many more Databricks APIs (jobs, clusters, SQL, etc.) and want to lean on the SDK instead of hand-rolling every path in Node.
- You’re **already** running a Python service for something else, so adding Databricks there is a small step.

**When Option A *does not* make sense:**

- You’re **only** “future-proofing” with no concrete plan for OAuth or multi-user. That’s speculative.
- The backend will likely **stay small** (catalogs, schemas, volumes, a few files). The current Node client is trivial to maintain; a second runtime is a lot of moving parts for little gain.
- **YAGNI:** You Ain’t Gonna Need It. If multi-user never happens, you’ve added complexity for no benefit.

**Recommendation relative to current code:**

- **Stay with the current Node-only setup** unless you have a clear need (OAuth, multi-user, or heavy Databricks feature growth). Option B (centralize auth in one Node module, keep the simple fetch client) is enough for now and keeps a single runtime.
- **Adopt Option A** when one of the above drivers is real: e.g. “We’re moving to Databricks Apps and need OAuth M2M,” or “We’re adding 20 more Databricks features and want the SDK.”

The rest of this document describes *how* to do Option A if you decide the trade-off is worth it.

---

## 1. Current state

- **Backend:** Node/Express (`backend/index.js`). Loads `.env.local` via dotenv. Uses `backend/lib/databricks-client.js` for all Databricks calls.
- **Auth:** Single-tenant. `databricks-client.js` reads `DATABRICKS_HOST` and `DATABRICKS_TOKEN` from `process.env`; no per-request auth.
- **Databricks usage:** Raw HTTP: GET/POST/PUT/putBinary to paths such as:
  - SCIM Me: `/api/2.0/preview/scim/v2/Me`
  - UC: `/api/2.1/unity-catalog/catalogs`, schemas, volumes
  - FS: `/api/2.0/fs/directories/...`, `/api/2.0/fs/files/...` (Unity Catalog volume paths)
- **Non-Databricks:** UC schema setting read/write from `.env.local` file; health check; request routing. These stay in Node.

---

## 2. Target architecture

- **Express** remains the single entrypoint (port 3001). It continues to serve the same HTTP API to the frontend.
- **Python service** runs alongside Express (same host/container). It is the only component that talks to Databricks. It:
  - Uses `set_databricks_auth(host, token)` at the start of each request and `clear_databricks_auth()` at the end.
  - Uses `get_workspace_client()` (and thus auth.py’s priority: OAuth M2M → context → env).
  - Implements the **Databricks-facing operations** currently done by `databricks-client.js` (see §4).
- **Node → Python:** Express calls the Python service over a **local** channel (HTTP on localhost or stdio). Each call carries request-scoped auth when needed (see §3).
- **databricks-client.js:** Eventually removed or reduced to a thin “call Python” wrapper. All real Databricks calls go through Python + SDK.

---

## 3. Auth flow (request-scoped)

- **Today:** Every request uses the same credentials from `process.env` (DATABRICKS_HOST, DATABRICKS_TOKEN).
- **Target:** Same behavior initially: Python service reads host/token from **its** environment (e.g. same `.env.local` or env vars set by the process manager). No per-request auth payload from Node in v1.
- **Per-request context in Python:** For each incoming call from Node, the Python service:
  1. Sets context: `set_databricks_auth(host, token)` with host/token from env (and later, if needed, from the request body/headers).
  2. Runs the requested operation (all SDK calls use `get_workspace_client()`).
  3. Cleans up: `clear_databricks_auth()` in a `finally` so credentials never leak to the next request.
- **Future multi-user:** When you add per-user or per-session auth, Node will pass host/token (or a session id that Python resolves to host/token) on each request. Python continues to use `set_databricks_auth` / `clear_databricks_auth` per call; no change to auth.py usage.

---

## 4. Contract: what the Python service exposes

Express today uses these Databricks operations. The Python service should expose a **minimal, explicit API** that covers them (and nothing else). Two sub-options:

### 4a. Operation-based API (recommended)

Python exposes one endpoint (or a few) that accept **operation names + parameters**, and return JSON (or binary where needed). Node sends e.g. `{ "op": "me" }`, `{ "op": "list_catalogs" }`, `{ "op": "list_schemas", "catalog": "..." }`, etc. Python maps these to databricks-tools-core or SDK calls and returns results. Benefits: single place to add new ops; easy to add auth params later (e.g. `host`, `token` in the same payload).

### 4b. Path-proxy API

Python exposes a thin proxy that accepts HTTP method + path + body and forwards to the Databricks SDK (or low-level client). Closer to current Node behavior but couples the contract to Databricks URL shapes and spreads logic.

**Recommendation:** 4a. Define a small set of operations that mirror current backend needs; implement each in Python using `get_workspace_client()` and, where possible, existing databricks-tools-core modules (catalogs, schemas, volumes, volume_files).

**Concrete operations to support (from current backend):**

| Backend need | Python implementation |
|--------------|------------------------|
| Current user (Me) | `get_current_username()` or `w.current_user.me()`; return a small JSON object compatible with current frontend (e.g. `userName` / `email`). |
| List catalogs | `lakebase.catalogs.list_catalogs()` or `unity_catalog.catalogs.list_catalogs()`; return list shape expected by frontend. |
| List schemas | `unity_catalog.schemas.list_schemas(catalog_name)`; same. |
| List volumes / create volume | `unity_catalog.volumes.list_volumes`, `create_volume` (ensure volume exists). |
| Create directory (FS) | `unity_catalog.volume_files.create_volume_directory(volume_path)`. |
| List directory (FS) | `unity_catalog.volume_files.list_volume_files(volume_path)`; map to same shape as current API (e.g. `contents` with `name`). |
| Read file (FS) | Read file content from volume. databricks-tools-core has `download_from_volume` (to local path); may need a small helper that reads to bytes/string (e.g. temp file or SDK stream if available) and returns content. |
| Write file (FS) | Write bytes to volume. Same: `upload_to_volume` is file-path–based; add a helper that writes from bytes/string (temp file or SDK) if not already present. |

Any new operation (e.g. new UC or FS feature) is added once in Python and exposed via the same operation-based contract.

---

## 5. Where Python runs and how Node calls it

- **Option 5a — HTTP sidecar:** Python runs as a separate process (e.g. FastAPI or Flask) on a fixed port (e.g. 3002). Express calls `http://127.0.0.1:3002/...` with a JSON body (operation + params). Pros: simple, language-agnostic, easy to restart independently. Cons: two processes, two ports, need to manage startup order and health.
- **Option 5b — Subprocess / stdio:** Node spawns the Python process; communication over stdin/stdout (e.g. JSON-RPC or newline-delimited JSON). Pros: single logical “app”, no extra port. Cons: lifecycle tied to Node; harder to scale Python separately; more complex if you want to reuse the same process for many requests (connection pooling vs one process per request).
- **Option 5c — Same process (embedded):** Not recommended: embedding Python in Node (e.g. node-gyp) is heavy and context vars are per-Python-context; you’d still need to set/clear auth per request.

**Recommendation:** 5a (HTTP sidecar) for clarity and ops. Start both from the same script or `start.sh`; Express only starts serving after Python health check succeeds (or fail fast after a short timeout).

---

## 6. Deployment and startup

- **Local dev:** `scripts/start.sh` (or equivalent) starts backend and frontend. Extend it to also start the Python service (e.g. `uv run fastapi` or `python -m service`) and wait until its health endpoint returns 200 before starting Express (or start both in parallel and have Express retry once on first use). Document required env (e.g. `DATABRICKS_HOST`, `DATABRICKS_TOKEN`) for both Node and Python; they can share the same `.env.local` if the Python app loads it.
- **Single container (e.g. Docker):** One Dockerfile or compose that runs both Node and Python (e.g. supervisor or two processes). Python service binds to 127.0.0.1 only; no external exposure. Same env vars passed to both.
- **Credentials:** No code in repo. Python reads from environment (and later from request payload if you add per-request auth). Keep using `.env.local` for local dev and inject env in production.

---

## 7. Error handling and robustness

- **Python down or unreachable:** Express should treat this as a 503 (or 500) and return a clear message (“Databricks service unavailable”). No silent fallback to old Node client if you remove it.
- **Databricks API errors:** Python catches SDK/exceptions and returns a structured error (e.g. `{ "error": "...", "status": 4xx }`). Express forwards status and message to the client so the frontend can show the same behavior as today.
- **Auth failures (e.g. invalid token):** Handled in Python; same structured error. No need to expose internal auth details.
- **Health:** Python exposes `/health` that returns 200 when the process is up (and optionally when it can create a WorkspaceClient from env, without calling a real API). Express can call it at startup and/or periodically.

---

## 8. What stays in Node (no Python)

- **HTTP server and routing:** Express. All existing routes remain; only the *implementation* of Databricks-dependent routes changes (call Python instead of `databricks-client.js`).
- **Unity Catalog schema setting:** Read/write of `AGENT_BUILDER_UC_SCHEMA` in `.env.local` stays in Node (file I/O on the server). No Databricks call needed for that.
- **Validation, query parsing, status codes:** Request validation (e.g. `catalog` required for schemas), `slugFromName`, `parseCatalogSchema`, response status codes and JSON shapes — all remain in Node so the public API contract is unchanged.
- **Frontend:** No change. It keeps calling the same Express endpoints.

---

## 9. Migration steps (order of work, no code yet)

1. **Add Python service:** New directory (e.g. `backend/python-service` or `services/databricks-gateway`). FastAPI app with one POST endpoint (e.g. `/run`) that accepts `{ "op": "...", ... }`. Implement auth: read host/token from env; for each request call `set_databricks_auth` / `clear_databricks_auth`; implement operations one by one (me, list_catalogs, list_schemas, ensure_volume, create_directory, list_directory, read_file, write_file). Add `/health`. Dependencies: `databricks-tools-core` (local path or published), `databricks-sdk`, FastAPI.
2. **Wire startup:** Update `start.sh` (or dev script) to start Python service first (or in parallel), then Node. Document env vars. Optionally: Express pings Python `/health` before listening.
3. **Node: replace databricks-client usage:** For each route that uses `get`/`post`/`put`/`putBinary`, replace with a call to the Python service (e.g. a small `databricksGateway.request(op, params)` that POSTs to localhost). Keep the same response shapes and status codes so the frontend does not change.
4. **Remove or slim `databricks-client.js`:** Once all call sites use the gateway, remove the old client or reduce it to the gateway caller only.
5. **Tests:** Backend tests that today hit the real Databricks API (or mocks) should be updated to either (a) call the Python service (with real or mocked Databricks), or (b) mock the Python service at the Node boundary. Integration test: run both services, one request through Express → Python → Databricks.
6. **Docs and env:** Update README and `.env.template` to mention the Python service and shared env (e.g. `DATABRICKS_HOST`, `DATABRICKS_TOKEN`). Note that OAuth M2M uses `DATABRICKS_CLIENT_ID` / `DATABRICKS_CLIENT_SECRET` in Python.

---

## 10. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Python service adds latency | Keep it on localhost; use a single HTTP request per logical operation; avoid multiple round-trips Node→Python for one user action. |
| Two runtimes, two failure modes | Clear health checks; Express fails fast if Python is down; good logging on both sides. |
| Auth drift (env in Node vs Python) | Use one source of truth (e.g. same `.env.local` or env block); document that Databricks auth is only consumed by Python. |
| SDK or auth.py changes | Pin databricks-tools-core (and SDK) version; upgrade in one place; run integration tests after upgrades. |

---

## 11. Summary

- **Single Databricks-facing layer:** Python only, using `auth.py` + SDK + databricks-tools-core.
- **Express** keeps the same API; it delegates Databricks work to the Python service via a small operation-based contract over HTTP (sidecar).
- **Auth:** Request-scoped context in Python (`set`/`clear`); v1 credentials from env; later, optional per-request host/token from Node.
- **No code in this repo yet:** This document is the plan. Implementation follows in the order of §9.
