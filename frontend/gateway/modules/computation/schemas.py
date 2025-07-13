from enum import Enum
from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel, Field

# --- Enums based on Specification ---

class LoadType(str, Enum):
    gravity = "gravity"
    surface_uniform = "surface_uniform"
    hydrostatic = "hydrostatic"
    prestress = "prestress"

class BoundaryType(str, Enum):
    fixed = "fixed"
    roller = "roller"
    water_head = "water_head"
    contact = "contact"
    linear_mpc = "linear_mpc"
    nonlinear_mpc = "nonlinear_mpc"

class ElementType(str, Enum):
    hex8_sri = "Hex8_SRI"
    shell = "Shell"
    beam = "Beam"
    truss = "Truss"
    interface = "Interface"
    infinite = "Infinite"

class AnalysisType(str, Enum):
    geostatic = "geostatic"
    static_construction = "static_construction"
    seepage_steady = "seepage_steady"

class PrestressMode(str, Enum):
    force = "force"
    displacement = "displacement"

class NonlinearMPCForm(str, Enum):
    tension_only = "tension_only"
    compression_only = "compression_only"
    gap = "gap"

# --- Base Models for CAE Objects ---

class BaseIdentifiedModel(BaseModel):
    id: str = Field(..., description="Unique identifier for the object.")
    name: Optional[str] = None

class Load(BaseIdentifiedModel):
    type: LoadType

class Boundary(BaseIdentifiedModel):
    type: BoundaryType

# --- Specific Load Models ---

class GravityLoad(Load):
    type: LoadType = Field(LoadType.gravity, const=True)
    g: float = 9.81
    direction: List[float] = [0.0, -1.0, 0.0]

class SurfaceUniformLoad(Load):
    type: LoadType = Field(LoadType.surface_uniform, const=True)
    q: float = Field(..., description="Pressure value (e.g., in kPa).")
    area_id: str = Field(..., description="Identifier of the target surface area.")

class HydrostaticLoad(Load):
    type: LoadType = Field(LoadType.hydrostatic, const=True)
    water_density: float = 1000.0
    water_level: float = Field(..., description="Elevation of the water table.")

class PrestressLoad(Load):
    type: LoadType = Field(LoadType.prestress, const=True)
    element_set: str = Field(..., description="Identifier of the element set to apply prestress.")
    mode: PrestressMode
    value: float

# --- Specific Boundary Models ---

class FixedBoundary(Boundary):
    type: BoundaryType = Field(BoundaryType.fixed, const=True)
    target: str = Field(..., description="Identifier for faces or nodes.")

class RollerBoundary(Boundary):
    type: BoundaryType = Field(BoundaryType.roller, const=True)
    target: str = Field(..., description="Identifier for faces or nodes.")
    normal_direction: List[float]

class WaterHeadBoundary(Boundary):
    type: BoundaryType = Field(BoundaryType.water_head, const=True)
    head_value: float
    target: str = Field(..., description="Identifier for faces or nodes.")

class ContactBoundary(Boundary):
    type: BoundaryType = Field(BoundaryType.contact, const=True)
    master_surface: str
    slave_surface: str
    friction_angle: float
    cohesion: float
    gap_init: float = 0.0
    method: str = "penalty"

class LinearMPCBoundary(Boundary):
    type: BoundaryType = Field(BoundaryType.linear_mpc, const=True)
    master_nodes: str
    slave_nodes: str
    dofs: List[str]
    ratio: float = 1.0

class NonlinearMPCBoundary(Boundary):
    type: BoundaryType = Field(BoundaryType.nonlinear_mpc, const=True)
    form: NonlinearMPCForm
    master_nodes: str
    slave_nodes: str
    stiffness: float
    gap_value: float = 0.0

# --- Discriminated Unions ---

AnyLoad = Union[GravityLoad, SurfaceUniformLoad, HydrostaticLoad, PrestressLoad]
AnyBoundary = Union[FixedBoundary, RollerBoundary, WaterHeadBoundary, ContactBoundary, LinearMPCBoundary, NonlinearMPCBoundary]

# --- Analysis Setup ---

class ElementDefinition(BaseModel):
    element_type: ElementType
    material: str

class AnalysisStepAction(BaseModel):
    deactivate_elements: Optional[List[str]] = None
    activate_elements: Optional[List[str]] = None
    apply_loads: Optional[List[str]] = None
    activate_constraints: Optional[List[str]] = None

class AnalysisStep(BaseModel):
    step_name: str
    type: AnalysisType
    params: Optional[Dict[str, Any]] = None
    actions: Optional[AnalysisStepAction] = None

class AnalysisSettings(BaseModel):
    sequence: List[AnalysisStep]

class FullAnalysisModel(BaseModel):
    analysis_settings: AnalysisSettings
    loads: List[AnyLoad]
    boundaries: List[AnyBoundary]
    elements: Dict[str, ElementDefinition]
