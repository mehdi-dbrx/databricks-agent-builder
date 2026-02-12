# Design notes

## Stack and general

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, @xyflow/react, lucide-react.
- **Backend:** Node, Express; single Databricks client (get/post, Bearer from env); routes only; no service layer unless shared logic appears.
- **Env:** `.env.local` (gitignored), `.env.template`; Databricks host + PAT; optional `AGENT_BUILDER_UC_SCHEMA` (catalog.schema) saved from Settings.
- **Dev:** Backend `npm run dev` (nodemon) for auto-restart on file changes; frontend Vite dev server.
- **Docs:** `doc/STACK.md` (stack details), `doc/DROPDOWN_DESIGN.md` (filterable dropdown spec), `doc/GUIDELINES.md`, `doc/HANDOFF.md`.

## Principles

- Keep options open. Avoid rigid, irreversible design choices. Leave room for evolution, change, and adding (REST/CLI/SDK, new block types, new routes, new persistence). Prefer small, replaceable pieces over big, locked-in ones.

## Blocks and Databricks

- Each block type (Agent, Genie, Vector Search, MCP) corresponds to an existing Databricks component.
- The canvas block is the logical representation of that component; config and behavior map to Databricks APIs/resources.

## Projects and persistence

- A project is saved and restored as a YAML file.
- Projects are stored in Unity Catalog (location TBD; e.g. volume or table).
- One YAML file per project = flow definition (nodes, edges, config).

## UI

- Project menu: top-right of the header. Opens a list of projects (empty for now). Used later to open/save/switch projects.

## Backend / Databricks API

- **Backend:** Minimal BFF. One Databricks HTTP client (host + PAT from env). Route handlers call the client. No separate “service layer” unless shared logic appears. PAT only in backend.
- **Client:** Single module: `get(path)`, `post(path, body)`; Bearer from env; return JSON; map or throw on errors.
- **Debug traces:** Optional logging at client and route boundaries only; env-controlled (e.g. `DEBUG=1`); no per-line logging. Keep code maintainable.
- **Frontend:** Calls only backend routes; never PAT or direct Databricks calls.

## REST vs CLI vs SDK

- Some functionality may not be in the REST API and may require CLI or SDK calls. Keep the rest of the codebase unchanged: only the backend “Databricks” layer varies.
- **Single layer:** One place (e.g. `backend/lib/`) that chooses per operation: REST (current client), CLI (spawn `databricks ...` with same env), or SDK (official SDK, same host + token). Routes and frontend call “list catalogs”, “create X”, etc.; they don’t care which backend is used.
- **REST:** Use for everything the REST API supports. **CLI:** Where only CLI exists, shell out from Node (`child_process`), same env; parse stdout and normalize to same response shape. **SDK:** Add SDK only where needed; map SDK results to same types as REST.
- **Types:** One set of types (catalog, schema, etc.); REST/CLI/SDK paths all map into them so routes get a single, consistent shape.
- **Bloat:** Add CLI or SDK only where REST is insufficient. One thin “Databricks” layer (REST + optional CLI wrapper + optional SDK), one entry point per operation. Keeps the codebase maintainable.

## Building steps (short)

1. Add minimal backend (e.g. Node + Express or FastAPI); read PAT + host from env.
2. Add one Databricks client: `get(path)`, `post(path, body)`; Bearer token; no per-area “service” unless needed.
3. Add routes that call the client (e.g. `GET /api/catalogs` → client.get(`/api/2.1/unity-catalog/catalogs`)).
4. Add shared types for API responses (catalog, schema, etc.); use in backend and frontend.
5. Frontend calls backend only.
6. Add minimal debug traces at boundaries; keep logic clean.
