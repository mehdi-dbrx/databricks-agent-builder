# Using databricks-tools-core to create a Genie room when creating a Genie block

**Scope:** How to use `databricks-tools-core` (agent_bricks) to create a Genie space (“room”) from the current project when the user adds a Genie block. No code changes in this repo — design and usage only.

**Decisions:**

- **Create after config.** When the user adds a Genie block, show a config panel first (warehouse, tables, optional display name/description); create the Genie room only when the user confirms (e.g. “Create Genie room” or “Save”). Do not create the room on drop.
- **Python for AgentBricksManager.** Run `AgentBricksManager()` in Python (e.g. FastAPI sidecar with `get_workspace_client()` / auth.py). Do not reimplement Genie/data-rooms in Node.

---

## 1. Current state

**Project (current):**

- A project is a YAML file in a Unity Catalog volume: `{ name, nodes, edges }`.
- Path: `/Volumes/<catalog>/<schema>/projects/<slug>.proj.yaml`.
- `name`: project display name (slug-like).
- `nodes`: list of flow nodes; each has `id`, `type: 'block'`, `position`, `data: { blockType, label }`.
- `edges`: connections between nodes.

**Genie block today:**

- When the user drags “Genie” onto the canvas, a node is added with `data: { blockType: 'genie', label: 'Genie' }`.
- There is no `space_id`, no warehouse, no tables — the block is not yet tied to a Databricks Genie space.

**Genie room (Databricks):**

- A Genie space is a “data room” in Databricks: SQL-based exploration over a set of tables, with a SQL warehouse, optional sample questions, and instructions.
- API: `/api/2.0/data-rooms` (create, get, update, delete, list).
- Identified by `space_id`. Has `display_name`, `warehouse_id`, `table_identifiers` (e.g. `["catalog.schema.table"]`), optional `description`, optional `parent_folder`, `run_as_type`, etc.

---

## 2. Where databricks-tools-core fits

**Module:** `databricks_tools_core.agent_bricks`

**Class:** `AgentBricksManager`

- Uses a `WorkspaceClient`. If you don’t pass one, it uses `get_workspace_client()` from `databricks_tools_core.auth` (so auth follows auth.py: OAuth M2M → context → env).
- Talks to `/api/2.0/data-rooms*` for all Genie operations.

**Relevant Genie operations:**

| Operation | Purpose |
|-----------|--------|
| `genie_create(display_name, warehouse_id, table_identifiers, description=..., parent_folder_path=..., parent_folder_id=..., create_dir=True, run_as_type="VIEWER")` | Create a new Genie space. Returns created room payload (includes `space_id`). |
| `genie_get(space_id)` | Fetch a Genie space by ID. |
| `genie_update(space_id, display_name=..., description=..., warehouse_id=..., table_identifiers=..., sample_questions=...)` | Update an existing space. |
| `genie_delete(space_id)` | Delete a Genie space. |
| `genie_find_by_name(display_name)` | List data-rooms and return `GenieIds(space_id, display_name)` for exact match, or `None`. |
| `get_best_warehouse_id()` | Returns a SQL warehouse ID suitable for Genie (RUNNING first, then size, with soft preference for current user’s warehouses). |
| `genie_add_sample_questions_batch(space_id, questions)` | Add sample questions without replacing existing ones. |
| `genie_update_sample_questions(space_id, questions)` | Replace all sample questions. |
| `genie_add_sql_instructions_batch(space_id, instructions)` | Add SQL instructions (list of `{ "title", "content" }`). |

**Models:** `GenieIds`, `GenieSpaceDict` (see `agent_bricks.models`).

---

## 3. Inputs: what “current project” can provide

When creating a Genie room **at the time the user adds a Genie block** (or when they confirm creation in a config panel), you have:

**From the current project:**

- **Project name** (`name` in project YAML): Use as basis for the Genie space `display_name`, e.g. `"{projectName} - Genie"` or `"{projectName} Genie"`. Must be unique if you call `genie_find_by_name` later; you can append a suffix (e.g. block id or timestamp) to avoid collisions.
- **UC schema (catalog.schema):** The app already has “Unity Catalog schema” from settings (e.g. `AGENT_BUILDER_UC_SCHEMA` → `catalog.schema`). You do **not** get a list of tables from the project YAML today; the project only stores nodes/edges. So **table_identifiers** cannot be fully derived from the project — they must come from user choice or a convention.

**Not from the project (must be chosen or derived):**

- **warehouse_id:** Required by `genie_create`. Options:
  1. Call `manager.get_best_warehouse_id()` and use that (best default).
  2. Let the user pick a warehouse in a config panel (list warehouses via SDK or existing backend).
- **table_identifiers:** Required; list of fully qualified table names, e.g. `["main.default.my_table"]`. Options:
  1. User selects one or more tables in a config panel (catalogs/schemas/tables from existing backend APIs).
  2. Use a convention, e.g. a single “default” table in the configured UC schema (only if that fits your product).
- **description:** Optional; e.g. `"Genie for project {projectName}"`.
- **parent_folder_path / parent_folder_id:** Optional; workspace folder for the Genie space. Can be left unset.
- **sample_questions / instructions:** Optional; can be added after creation with `genie_add_sample_questions_batch` or `genie_add_sql_instructions_batch`.

---

## 4. Flow: create Genie room when creating a Genie block

**Option A — Create on drop (with defaults):**

1. User adds a Genie block to the canvas (drag & drop).
2. Backend or a small Python/Node service:
   - Resolves auth (e.g. `get_workspace_client()` in Python, or Node calls a Python gateway that uses it).
   - Instantiates `AgentBricksManager()` (no args → uses `get_workspace_client()`).
   - Gets `warehouse_id = manager.get_best_warehouse_id()`; if `None`, fail with a clear message (“No SQL warehouse available”).
   - Chooses `display_name`, e.g. `"{projectName} - Genie"` (and optionally ensures uniqueness, e.g. via `genie_find_by_name` and appending a suffix if needed).
   - For `table_identifiers`: either use a default (e.g. one table from settings) or require the first “configure” step to supply them (see Option B).
   - Calls `manager.genie_create(display_name=..., warehouse_id=..., table_identifiers=..., description=...)`.
   - Reads `space_id` (and optionally `display_name`) from the returned payload.
3. Store in the new node’s `data`: e.g. `space_id`, `display_name`, and optionally `warehouse_id`, `table_identifiers`.
4. Persist the project (nodes + edges) so the YAML contains this block’s `space_id` and config.

**Option B — Create after config (recommended for UX):**

1. User adds a Genie block → a node appears with `blockType: 'genie'`, no `space_id` yet.
2. User opens a “Genie config” panel for that node: project name is known; show warehouse dropdown (or “Use recommended” = `get_best_warehouse_id()`), table picker (catalog/schema/table from existing APIs), optional display name and description.
3. User clicks “Create Genie room” (or “Save” that implies create).
4. Backend/service:
   - Same as in Option A: `AgentBricksManager()`, `get_best_warehouse_id()` if “recommended”, else user’s warehouse; `table_identifiers` from user selection; `display_name` from project + optional user override.
   - `manager.genie_create(...)`.
   - Return `space_id` (and metadata) to the frontend.
5. Frontend updates the node’s `data` with `space_id`, `display_name`, etc., and persists the project.

In both options, **creating the Genie room** = calling `AgentBricksManager().genie_create(...)` with the chosen inputs; **linking the block to the room** = storing `space_id` (and any needed metadata) in the node’s `data` and in the project YAML.

---

## 5. Uniqueness and reuse

- **Avoid duplicate display names:** Before create, you can call `genie_find_by_name(display_name)`. If it returns a `GenieIds`, you can either reuse that space (use its `space_id` for the block) or derive a new `display_name` (e.g. append `" (2)"` or the node id).
- **One block ↔ one room:** The natural model is one Genie block = one Genie space. If the user deletes the block, you can optionally call `genie_delete(space_id)` to clean up, or leave the space for reuse.

---

## 6. Where to run AgentBricksManager

- **Python (recommended):** Run `AgentBricksManager()` in a context where `get_workspace_client()` is available (e.g. a Python FastAPI sidecar that uses `auth.set_databricks_auth` / `clear_databricks_auth` per request, or a script with env-based auth). Then expose “create Genie room” as an operation (e.g. POST with `projectName`, `warehouse_id`, `table_identifiers`, optional `display_name`, `description`) and return `space_id` and optional `display_name`.
- **Node:** The current backend does not use Python. To use databricks-tools-core from Node you’d either call the data-rooms HTTP API directly (reimplementing what `genie_create` does) or call a Python gateway that uses `AgentBricksManager`. The plan in `DATABRICKS_AUTH_PLAN.md` describes the Python-sidecar option.

---

## 7. Summary

- **Create Genie room** = call `AgentBricksManager().genie_create(display_name, warehouse_id, table_identifiers, description=..., ...)`.
- **From current project:** Use project `name` for `display_name`; use UC schema from settings only to scope table picker or defaults — you still need user-selected (or convention-based) `table_identifiers`.
- **Warehouse:** Use `manager.get_best_warehouse_id()` as default, or let the user pick.
- **After create:** Put `space_id` (and optionally `display_name`, `warehouse_id`, `table_identifiers`) in the Genie node’s `data` and persist the project YAML.
- **Optional:** Use `genie_find_by_name` to reuse or avoid duplicate names; use `genie_add_sample_questions_batch` / `genie_add_sql_instructions_batch` after creation to enrich the room.

No code in this repo is altered; this document describes how to use databricks-tools-core to implement “create a Genie room from the current project when creating a Genie block.”
