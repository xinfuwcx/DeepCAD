from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict
from pydantic import BaseModel, Field, ConfigDict
from loguru import logger

from deep_excavation.backend.services.geology_service import GeologyService

router = APIRouter()


# --- Pydantic Models for Data Validation ---

class BoreholeData(BaseModel):
    x: float
    y: float
    z: float
    formation: str


class ThreeJsGeometry(BaseModel):
    vertices: List[float]
    normals: List[float]
    faces: List[int]


class GeologicalLayer(BaseModel):
    name: str
    color: str
    opacity: float
    geometry: ThreeJsGeometry


class GeologyOptions(BaseModel):
    """Defines the structure for geological modeling options, handling camelCase from frontend."""
    model_config = ConfigDict(populate_by_name=True)

    resolution_x: int = Field(50, alias='resolutionX')
    resolution_y: int = Field(50, alias='resolutionY')
    variogram_model: str = Field('linear', alias='variogramModel')


class GeologyModelRequest(BaseModel):
    # Allow population by field name OR alias, enabling camelCase from frontend
    model_config = ConfigDict(populate_by_name=True)

    borehole_data: List[BoreholeData] = Field(..., alias="boreholeData", example=[
        {"x": 0, "y": 0, "z": -10, "formation": "sand"},
        {"x": 100, "y": 0, "z": -12, "formation": "sand"},
    ])
    formations: Dict[str, str] = Field(..., example={"DefaultSeries": "sand,clay,rock"})
    options: GeologyOptions = Field(default_factory=GeologyOptions)


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