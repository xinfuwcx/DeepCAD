"""
This module defines the Pydantic models for geological data structures,
used for API request/response validation and data interchange.
"""
from typing import List, Dict
from pydantic import BaseModel, Field, ConfigDict


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
    alpha: float = Field(2.0, alias='alpha')


class GeologyModelRequest(BaseModel):
    # Allow population by field name OR alias, enabling camelCase from frontend
    model_config = ConfigDict(populate_by_name=True)

    borehole_data: List[BoreholeData] = Field(..., alias="boreholeData", example=[
        {"x": 0, "y": 0, "z": -10, "formation": "sand"},
        {"x": 100, "y": 0, "z": -12, "formation": "sand"},
    ])
    formations: Dict[str, str] = Field(..., example={"DefaultSeries": "sand,clay,rock"})
    options: GeologyOptions = Field(default_factory=GeologyOptions) 