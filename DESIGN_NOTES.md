# Design notes

## Blocks and Databricks

- Each block type (Agent, Genie, Vector Search, MCP) corresponds to an existing Databricks component.
- The canvas block is the logical representation of that component; config and behavior map to Databricks APIs/resources.

## Projects and persistence

- A project is saved and restored as a YAML file.
- Projects are stored in Unity Catalog (location TBD; e.g. volume or table).
- One YAML file per project = flow definition (nodes, edges, config).

## UI

- Project menu: top-right of the header. Opens a list of projects (empty for now). Used later to open/save/switch projects.
