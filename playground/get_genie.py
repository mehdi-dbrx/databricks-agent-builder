#!/usr/bin/env python3
"""
Playground: get one Genie space by ID via databricks-tools-core (genie_get).
Expects env already set (e.g. by start.sh). Run from repo root when started by start.sh.
"""
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "databricks-tools-core"))
from databricks_tools_core.agent_bricks import AgentBricksManager

SPACE_ID = "01f0eca3dc1b1cbc9b65fa58f94c18ad"


def main() -> None:
    manager = AgentBricksManager()
    result = manager.genie_get(SPACE_ID)
    print("genie_get(%r):" % SPACE_ID)
    print(result)


if __name__ == "__main__":
    main()
