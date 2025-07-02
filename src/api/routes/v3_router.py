"""
API router for V3 analysis endpoints.
"""
from fastapi import APIRouter, Depends
from src.core.v3_runner import V3ExcavationModel, run_v3_analysis

router = APIRouter()

@router.post("/run-analysis", summary="Run a V3 Parametric Analysis")
async def run_analysis(model: V3ExcavationModel):
    """
    Receives a V3 excavation model from the frontend, runs the
    simulation pipeline, and returns the results.
    """
    results = run_v3_analysis(model)
    return {"message": "Analysis completed successfully", "data": results} 