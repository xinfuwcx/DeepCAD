from fastapi import APIRouter, Depends, HTTPException
from typing import List
from loguru import logger

from deep_excavation.backend.services.geology_service import GeologyService
from deep_excavation.backend.models.geology import (
    GeologicalLayer,
    GeologyModelRequest,
)

router = APIRouter()


# --- Pydantic Models are now in models/geology.py ---


# --- API Endpoint ---

@router.post(
    "/create-geological-model",
    response_model=List[GeologicalLayer],
    summary="Create Geological Model Geometry",
    description="Receives borehole data and returns a list of geological layers with three.js-compatible geometry."
)
async def create_geological_model_endpoint(
    request_body: GeologyModelRequest,
    geology_service: GeologyService = Depends(GeologyService)
):
    """
    Endpoint to generate geological model geometry from borehole data.
    """
    logger.info("Received request to generate geological model geometry.")
    try:
        serialized_layers = await geology_service.create_geological_model(
            borehole_data=[b.model_dump() for b in request_body.borehole_data],
            formations=request_body.formations,
            options=request_body.options
        )
        return serialized_layers
    except Exception as e:
        logger.error(f"Failed to create geological model geometry: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An internal server error occurred: {str(e)}"
        ) 