# Sandbox API findings

## List Unity Catalog catalogs

- **Method:** GET
- **URL:** `{DATABRICKS_HOST}/api/2.1/unity-catalog/catalogs`
- **Auth:** `Authorization: Bearer {DATABRICKS_TOKEN}`
- **Response:** JSON object with key `catalogs` (array). Each catalog has at least `name`, `owner`, `comment`, `catalog_type`, `metastore_id`, `full_name`, etc.

Verified with `./sandbox/list-uc-catalogs.sh` (uses `.env.local` from repo root).
