# Stack

## Frontend

| Layer      | Choice                |
| ---------- | --------------------- |
| Runtime    | React 18, TypeScript  |
| Build      | Vite                  |
| Canvas     | @xyflow/react         |
| Styling    | Tailwind CSS          |
| Icons      | lucide-react          |

## Backend

Not implemented yet.

## Env / tooling

- `.env.local` (gitignored), `.env.template` for Databricks host + PAT.
- Scripts: `scripts/connect-databricks.sh`, `scripts/create-pat-and-update-env.sh`, `scripts/test-connection.sh`.
