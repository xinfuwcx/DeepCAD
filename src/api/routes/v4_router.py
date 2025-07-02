from fastapi import APIRouter, HTTPException
from src.core.v4_runner import (
    run_v4_analysis,
    V4AnalysisModel,
    run_seepage_analysis,
    SeepageAnalysisModel
)

router = APIRouter()

@router.post(
    "/run-structural-analysis",
    response_model=dict,
    summary="V4 Structural Analysis"
)
async def run_v4_structural_analysis_endpoint(model: V4AnalysisModel):
    """
    Main endpoint for the V4 structural analysis pipeline.
    Accepts a composite model that includes excavation profiles from DXF
    and definitions for undulating soil layers.
    """
    try:
        print("--- V4 API Endpoint Hit (Structural) ---")
        results = run_v4_analysis(model)
        print("--- V4 API Endpoint Finished (Structural) ---")
        return results
    except ValueError as ve:
        # Catch specific, known errors (e.g., from DXF processing)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Catch any other unexpected errors during the process
        print(f"An unexpected server error occurred: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"An internal server error occurred during V4 analysis."
        )

@router.post(
    "/run-seepage-analysis",
    response_model=dict,
    summary="V4 Seepage Analysis"
)
async def run_v4_seepage_analysis_endpoint(model: SeepageAnalysisModel):
    """
    Main endpoint for the V4 seepage analysis pipeline.
    Accepts a composite model that includes geometry, materials with
    hydraulic conductivity, and hydraulic boundary conditions.
    """
    try:
        print("--- V4 API Endpoint Hit (Seepage) ---")
        results = run_seepage_analysis(model)
        print("--- V4 API Endpoint Finished (Seepage) ---")
        return results
    except ValueError as ve:
        # Catch specific, known errors (e.g., from DXF processing)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Catch generic server errors
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected server error occurred: {e}"
        )

@router.get("/health", response_model=dict)
async def health_check():
    """A simple health check endpoint for the V4 router."""
    return {"status": "V4 router is healthy"} 