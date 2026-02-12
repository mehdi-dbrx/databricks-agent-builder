# Plan: Long-running Python service + call on Genie block drop

**Goal:** start.sh starts a long-running Python process (Genie/Databricks sidecar) with env from start.sh; when the user drags and drops a Genie block, the app calls that Python process (for now: get_genie logic; you’ll change later). Step-by-step, test every step. No action until you say go.

---

## Step 1: Long-running Python process in start.sh

**What:** Add a Python process that stays up for the whole app session. It must inherit env from start.sh (no .env.local load inside Python).

**Implementation outline:**
- Create a minimal Python “service” that just runs until killed (e.g. a tiny HTTP server that listens on a fixed port, or a FastAPI app with a `/health` route). Place it e.g. in `backend/python-service/` or `services/databricks-gateway/` (one app file + dependency on databricks-tools-core).
- In start.sh, after `set +a`, start this Python process in the background (same shell that sourced .env.local), e.g. `cd "$ROOT/..." && uv run ... python -m service &` or `uv run uvicorn app:app --host 127.0.0.1 --port 3002 &`. Then start backend and frontend as today.
- Ensure the Python process is a child of the shell that ran start.sh so it inherits DATABRICKS_HOST, DATABRICKS_TOKEN, etc.

**Test:**
1. Run `./scripts/start.sh`.
2. Verify the Python process is running (e.g. `curl -s http://127.0.0.1:3002/health` returns 200 or similar).
3. Verify backend and frontend still work (e.g. open app, load project, health check).
4. Stop start.sh (Ctrl+C); verify all processes stop.

**Exit criteria:** One long-running Python process started by start.sh; health check passes; backend/frontend unchanged.

---

## Step 2: Python service exposes “get Genie” (genie_get)

**What:** Add an endpoint in the Python service that performs the same logic as get_genie.py: call `AgentBricksManager().genie_get(space_id)` and return the result (e.g. JSON).

**Implementation outline:**
- In the Python service, add a route, e.g. `GET /genie/get?space_id=...` or `POST /genie/get` with body `{"space_id": "..."}`. Handler: instantiate `AgentBricksManager()` (no client; uses `get_workspace_client()` from env), call `manager.genie_get(space_id)`, return result as JSON (or error status).
- No .env.local loading in the service; env was set when start.sh started the process.

**Test:**
1. With start.sh running (Step 1), call the new endpoint with the known space_id, e.g. `curl -s "http://127.0.0.1:3002/genie/get?space_id=01f0eca3dc1b1cbc9b65fa58f94c18ad"`.
2. Verify response is the same shape as running `playground/get_genie.py` (when run with env set): space dict with display_name, warehouse_id, table_identifiers, etc.
3. Verify invalid or missing space_id returns a sensible error (e.g. 404 or 400).

**Exit criteria:** Python service exposes a get_genie (genie_get) endpoint; curl returns correct space data using env from start.sh.

---

## Step 3: Backend route that calls the Python service

**What:** Add a backend route (e.g. `GET /api/genie/get?space_id=...` or `POST /api/genie/get`) that the frontend (or other clients) can call. The backend proxies the request to the Python service (e.g. `http://127.0.0.1:3002/genie/get?space_id=...`) and returns the response (or error).

**Implementation outline:**
- In backend (Node), add a route that: reads space_id from query or body, calls the Python service (fetch to `http://127.0.0.1:3002/...`), forwards status and body to the client. Handle Python service down (e.g. 503) and timeouts.
- No Databricks calls in Node for this flow; Node is a proxy to the Python process.

**Test:**
1. With start.sh running (Python + backend + frontend), call the backend route, e.g. `curl -s "http://localhost:3001/api/genie/get?space_id=01f0eca3dc1b1cbc9b65fa58f94c18ad"`.
2. Verify response matches Step 2 (same space data).
3. Stop the Python process only; call the backend route again; verify backend returns 503 or similar (no silent failure).

**Exit criteria:** Backend exposes an API that proxies to the Python service; curl to backend returns correct Genie space data; failure when Python is down is visible.

---

## Step 4: Frontend calls backend when user drops a Genie block

**What:** When the user drags and drops a Genie block onto the canvas, the frontend (or backend) triggers a call to the backend route from Step 3 (for now with a fixed space_id or a placeholder; you’ll change later). Goal: prove the full chain (drop → backend → Python → genie_get).

**Implementation outline:**
- In the frontend, in the same place where a Genie block is added (e.g. onDrop when blockType is 'genie'), after adding the node, call the new backend API (e.g. `fetch('/api/genie/get?space_id=01f0eca3dc1b1cbc9b65fa58f94c18ad')` or with a param you’ll wire later). Optionally show the result (e.g. console.log, or a toast, or prefill node data with display_name).
- For now the space_id can be hardcoded (the one you used in get_genie.py); later you’ll replace with “create Genie room” or user-selected space_id.

**Test:**
1. With start.sh running, open the app in the browser.
2. Drag a Genie block onto the canvas and drop it.
3. Verify in network tab (or backend logs) that the frontend called the backend and the backend called the Python service.
4. Verify no errors (or a clear error if Python is down). Optionally verify the new node shows something from the response (e.g. display_name) if you surface it.

**Exit criteria:** Dropping a Genie block triggers a request to the backend, which calls the Python service and returns; full chain works; you can change the exact trigger or payload later.

---

## Summary

| Step | What | Test |
|------|------|------|
| 1 | Long-running Python process in start.sh, env from start.sh | start.sh runs; curl Python /health; backend/frontend ok |
| 2 | Python service exposes get_genie (genie_get) endpoint | curl Python /genie/get?space_id=... returns space |
| 3 | Backend route that proxies to Python service | curl backend /api/genie/get?space_id=... returns space; 503 when Python down |
| 4 | Frontend: on Genie block drop, call backend API | Drop Genie block → backend → Python → response |

**Dependencies:** Step 2 depends on Step 1. Step 3 depends on Step 2. Step 4 depends on Step 3. Run in order; test after each step before moving on.

**No action until you say go.**
