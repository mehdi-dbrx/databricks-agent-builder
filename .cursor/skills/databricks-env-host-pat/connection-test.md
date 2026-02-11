# Connection test endpoint

The test script validates host + PAT by calling one Databricks API with the token. Use this endpoint only; do not assume others work on all workspaces.

## Endpoint

**GET** `{DATABRICKS_HOST}/api/2.0/preview/scim/v2/Me`

- **Headers:** `Authorization: Bearer {DATABRICKS_TOKEN}`
- **Success:** HTTP 200
- **Failure:** 401 (invalid/expired token), 403 (forbidden), 404 (endpoint not found), etc.

## Why this path

- Some workspaces do **not** expose `/api/2.0/current-user` (it can return 404). Do not rely on it unless the workspace docs confirm it.
- **GET /api/2.0/preview/scim/v2/Me** was verified to return 200 with a valid PAT on an Azure Databricks workspace. Use it for the connection test in this skill.
- If a workspace documents a different “current user” or “whoami” endpoint, that can be used instead after verification.

## Example (curl)

```bash
curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $DATABRICKS_TOKEN" \
  "$DATABRICKS_HOST/api/2.0/preview/scim/v2/Me"
```

Parse the last line for the HTTP status code; the rest is the response body.

## Script behavior

`scripts/test-connection.sh`:

1. Loads `DATABRICKS_HOST` and `DATABRICKS_TOKEN` from `.env.local`.
2. Calls the endpoint above.
3. Prints `HTTP <code>` and, on non-200, the response body and exits 1.
4. On 200, prints `OK` and exits 0.

No assumptions: missing file or vars produce clear errors; non-200 produces the status and body.
