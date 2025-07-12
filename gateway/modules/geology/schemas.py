from pydantic import BaseModel
from typing import List, Tuple

class Borehole(BaseModel):
    x: float
    y: float
    z: float

class SoilDomainRequest(BaseModel):
    boreholes: List[Borehole]
    domain_expansion: Tuple[float, float] = (50.0, 50.0)
    bottom_elevation: float = -30.0
    transition_distance: float = 50.0
    grid_resolution: float = 2.0

class SoilDomainResponse(BaseModel):
    message: str
    gltf_url: str
    request_params: SoilDomainRequest 