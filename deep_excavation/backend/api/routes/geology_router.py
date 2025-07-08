from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import logging

from deep_excavation.backend.services.geology_service import (
    GeologyService, get_geology_service
)

router = APIRouter(prefix="/api/geology", tags=["Geology"])
logger = logging.getLogger(__name__)


# --- Pydantic Models ---
# These models define the expected request and response structures for the API.


class GeologyModelRequest(BaseModel):
    """
    Defines the data structure for a request to create a geological model.
    This matches the payload sent from the frontend service.
    """
    project_id: str
    surface_points: List[List[float]]
    borehole_data: List[Dict[str, Any]]
    formations: Dict[str, str]
    options: Dict[str, Any] = {}


class FeatureRequest(BaseModel):
    """
    Defines the feature-like structure that the frontend sends.
    """
    id: str
    name: str
    type: str
    parameters: Dict[str, Any]


class GeologyModelResponse(BaseModel):
    """
    Defines the response structure after a model has been created.
    """
    message: str
    previewData: Dict[str, Any]


@router.post("/create-geological-model", response_model=GeologyModelResponse)
async def create_geological_model_endpoint(
    request: FeatureRequest,
    geology_service: GeologyService = Depends(get_geology_service)
):
    """
    This endpoint receives data from the frontend to generate a 3D geological model.
    It uses the GeologyService to orchestrate the model creation with GemPy.
    """
    logger.info(f"Received request to create geological model: {request.name}")
    try:
        model_data = await geology_service.process_frontend_request(request.dict())
        logger.info("Geological model created successfully.")
        return GeologyModelResponse(
            message="Geological model created successfully",
            previewData=model_data
        )
    except Exception as e:
        logger.error(f"Failed to create geological model: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=(
                "An internal error occurred while creating the geological "
                f"model: {e}"
            )
        ) 