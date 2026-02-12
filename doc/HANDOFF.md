# Handoff: Agent Builder + Databricks env skill

Short summary for the next agent.

---

## Intent

- **Project:** Databricks Agent Builder (from plan `databricks_agent_builder_web_app_aad91be6.plan.md`) — eventually a drag-drop-deploy web app for agentic AI on Databricks. **Do not trust the plan as source of truth;** verify against official docs and real behavior.
- **Done so far:** Setup and auth only: env template/local, CLI connect, create PAT, test connection. A **Cursor skill** was created so any agent can reproduce this setup from an empty repo.

---

## What was done so far

| Item | Location / note |
|------|------------------|
| Build log | `BUILD_LOG.md` — incremental log (entries still empty) |
| Env | `.env.template`, `.env.local` (gitignored), `.gitignore` with `.env`, `.env.local`, `.env*.local` |
| Scripts | `scripts/connect-databricks.sh`, `scripts/create-pat-and-update-env.sh`, `scripts/test-connection.sh` — connect CLI from .env.local, create 90-day PAT and write host+token to .env.local, test via GET `/api/2.0/preview/scim/v2/Me` |
| Cursor skill | `databricks-skills/databricks-env-host-pat/` (SKILL.md, scripts.md, connection-test.md). **Also copied to** `~/.cursor/skills/databricks-env-host-pat/` (user-level). |

Connection test endpoint used: **GET** `$DATABRICKS_HOST/api/2.0/preview/scim/v2/Me` (Bearer token). Do not assume `/api/2.0/current-user` works on all workspaces.

---

## Incremental step-by-step approach (critical)

These are **hard guidelines** from the user. Follow them strictly.

1. **No blind coding.** Do not implement large chunks or the whole plan in one go. The chance of building everything in one shot is zero. Work in **small, concrete slices** (one feature, one script, one check at a time). After each slice: verify, then decide next step.

2. **"NA" / "NO ACTION".** If the user starts a message with **na**, **NA**, or **NO ACTION**, you must **only think** (reason, analyze, reflect). Do **not** run tools, edit code, or suggest concrete next steps. Do not take any action.

3. **Bias towards action is wrong.** The user explicitly said the agent is biased towards doing things. Resist that. Do not act when the user is only asking for thinking or has said no action. Do not suggest they "run X" as a default.

4. **Who runs.** Never tell the user to run something. The agent runs. When something could be run, ask: **"Want me to run it?"** — do not say "you can run X" or "run X to …".

5. **No assumptions.** Do not assume. When in doubt, **stop**. Do not use "likely" or state unverified things as fact. If you don't know (e.g. an API path, why a fetch failed), say you don't know; do not fill in with guesses.

6. **Certainties, not assumptions in code.** Scripts and checks must fail with **clear, explicit messages** (e.g. "ERROR: .env.local not found", "ERROR: DATABRICKS_HOST not set"). No silent failures; no behavior that depends on unstated assumptions.

7. **Plan vs reality.** The file `databricks_agent_builder_web_app_aad91be6.plan.md` is **not** trusted as accurate (e.g. wrong or missing API paths). Verify against official Databricks docs and real behavior (e.g. user's curl, workspace response).

8. **Short answers.** Prefer short replies. Avoid long "vomit" unless the user asks for detail.

9. **Build log.** Use `BUILD_LOG.md` for incremental progress: each entry = Date | Scope | Done | Decisions/notes | Next. One slice at a time.

---

## Next

- No next step was specified. Use the build log and the above guidelines to pick the next small slice when the user is ready.
