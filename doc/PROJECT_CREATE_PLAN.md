# Create new project — step-by-step plan

**Goal:** In the project menu, add a "+" button. On validate with a name (e.g. `abc`), create `abc.proj.yaml` (YAML) in the Unity Catalog **projects** volume under the schema from Settings. Create the volume/folder if missing. YAML contains at least `name: abc`.

**UC location:** `AGENT_BUILDER_UC_SCHEMA` = `catalog.schema` (from Settings). Store projects in volume `projects` in that schema:  
path = `/Volumes/{catalog}/{schema}/projects/{name}.proj.yaml`.

---

## Steps (validate each before moving on)

### Step 1 — UI: "+" button and modal
- Add a "+" (or "New project") button in the project menu dropdown.
- Click opens a small modal: text input (project name) + Cancel + Create.
- No backend yet. **Validate:** button opens modal; Cancel closes it.

### Step 2 — Name validation (client)
- Validate name: non-empty; allow only `a-z`, `0-9`, `-` (slug); normalize to lowercase.
- Show inline error if invalid. Disable Create or clear error on change.
- **Validate:** invalid names rejected; valid name enables Create.

### Step 3 — Backend: read UC schema and volume path
- New route: `POST /api/projects` body `{ name: string }`.
- Backend reads `AGENT_BUILDER_UC_SCHEMA` from `.env.local` (same as GET settings). Parse `catalog.schema`. If missing or invalid, return 400 with clear message.
- Compute volume path: `/Volumes/{catalog}/{schema}/projects/{name}.proj.yaml`.
- For now return 200 + `{ path }` (no file creation). **Validate:** calling with valid name returns path; without schema returns 400.

### Step 4 — Backend: ensure volume exists
- Use Databricks Volumes API: list or get volume in schema; create volume `projects` in that schema if it does not exist.
- **Validate:** after step, volume `projects` exists in the schema (check in UI or API).

### Step 5 — Backend: create directory (if needed)
- Use Files API: create directory for `/Volumes/{catalog}/{schema}/projects` (idempotent). No-op if already exists.
- **Validate:** directory exists; repeated call still succeeds.

### Step 6 — Backend: write YAML file
- Build minimal YAML: `name: {name}\n` (or a small object with `name`).
- Use Files API: PUT upload file (body = raw bytes, not JSON). Path = `/Volumes/{catalog}/{schema}/projects/{name}.proj.yaml`.
- On success return 201 + `{ path, name }`. **Validate:** file appears in volume with correct content.

### Step 7 — Frontend: call API and close modal
- On Create: POST `/api/projects` with `{ name }`. On success close modal and optionally refresh project list or show toast. On error show message.
- **Validate:** full flow: enter name → Create → file in UC; error handling works.

---

## APIs to use (Databricks)

- **Volumes:** create/list in schema (e.g. `POST /api/2.1/unity-catalog/volumes` or equivalent).
- **Files:** create directory `POST /api/2.0/fs/directories` (path in body/query); upload file `PUT /api/2.0/fs/files{path}` (body = raw bytes, `Content-Type: application/octet-stream`).

Exact endpoints and payloads to be confirmed from [Databricks Files API](https://docs.databricks.com/api/workspace/files) and Volumes API when implementing.

---

## YAML shape (minimal)

```yaml
name: abc
```

Later: add `nodes`, `edges`, `config` per DESIGN_NOTES.
