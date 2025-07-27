from pydantic import BaseModel
from typing import List, Tuple, Optional, Dict, Any
from enum import Enum

class InterpolationMethod(str, Enum):
    KRIGING_ORDINARY = "ordinary_kriging"
    KRIGING_UNIVERSAL = "universal_kriging" 
    KRIGING_SIMPLE = "simple_kriging"
    RBF = "rbf"
    IDW = "inverse_distance"

class VariogramModel(str, Enum):
    GAUSSIAN = "gaussian"
    EXPONENTIAL = "exponential"
    SPHERICAL = "spherical"
    MATERN = "matern"
    LINEAR = "linear"

class EnhancedBorehole(BaseModel):
    id: Optional[str] = None
    x: float
    y: float
    z: float
    soil_type: Optional[str] = None
    layer_id: Optional[int] = None
    description: Optional[str] = None

class SoilLayer(BaseModel):
    layer_id: int
    name: str
    density: float
    cohesion: float
    friction_angle: float
    permeability: Optional[float] = None

class GSToolsGeologyRequest(BaseModel):
    boreholes: List[EnhancedBorehole]
    soil_layers: Optional[List[SoilLayer]] = []
    interpolation_method: InterpolationMethod = InterpolationMethod.KRIGING_ORDINARY
    variogram_model: VariogramModel = VariogramModel.EXPONENTIAL
    grid_resolution: float = 2.0
    domain_expansion: Tuple[float, float] = (50.0, 50.0)
    auto_fit_variogram: bool = True
    colormap: str = "terrain"
    uncertainty_analysis: bool = True

class VariogramAnalysis(BaseModel):
    lag_distances: List[float]
    gamma_values: List[float]
    max_lag: float
    n_pairs: int
    model_type: str
    len_scale: float
    variance: float
    nugget: float
    fit_quality: str

class UncertaintyAnalysis(BaseModel):
    cross_validation: Dict[str, Any]
    variogram_model: Dict[str, Any]
    interpolation_quality: Dict[str, float]

class GSToolsGeologyResponse(BaseModel):
    message: str
    gltf_url: str
    interpolation_method: str
    variogram_analysis: Optional[VariogramAnalysis] = None
    uncertainty_analysis: Optional[UncertaintyAnalysis] = None
    mesh_info: Dict[str, Any]
    request_params: GSToolsGeologyRequest

# 兼容性：保留原有的简单模式
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