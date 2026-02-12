"""
Databricks gateway: long-running HTTP service for Genie/Databricks (AgentBricksManager).
Env must be set by start.sh (DATABRICKS_HOST, DATABRICKS_TOKEN); no .env load here.
"""
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse

app = FastAPI(title="Databricks Gateway")


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/genie/get")
def genie_get(space_id: str = Query(..., description="Genie space ID")):
    """Get a Genie space by ID. Uses AgentBricksManager().genie_get(space_id)."""
    from databricks_tools_core.agent_bricks import AgentBricksManager

    try:
        manager = AgentBricksManager()
        result = manager.genie_get(space_id)
        if result is None:
            return JSONResponse(status_code=404, content={"error": "Genie space not found"})
        return result
    except Exception as e:
        if "not found" in str(e).lower() or "does not exist" in str(e).lower():
            return JSONResponse(status_code=404, content={"error": "Genie space not found"})
        raise
