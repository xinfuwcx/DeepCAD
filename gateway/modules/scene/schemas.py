from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid


class Borehole(BaseModel):
    """Represents a single borehole with its location and layer data."""
    name: str
    x: float
    y: float
    layers: List[dict]  # Example: [{"name": "Clay", "thickness": 10.0}, ...]


class Stratum(BaseModel):
    """Represents a geological stratum with its properties."""
    name: str
    material_id: str  # Link to a material in the material library


class Point3D(BaseModel):
    """A simple 3D point."""
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0


class Point2D(BaseModel):
    """A simple 2D point."""
    x: float
    y: float


class ComputationalDomain(BaseModel):
    """
    Updated computational domain for Sprint 2.
    It now supports multiple boreholes and stratums.
    """
    soil_layer_thickness: float = Field(
        100.0, description="Thickness of the single soil layer (legacy, for Sprint 1 compat.)"
    )
    boreholes: List[Borehole] = Field(
        default_factory=list, description="List of borehole data points."
    )
    stratums: List[Stratum] = Field(
        default_factory=list, description="List of geological stratums defined for the domain."
    )
    bounding_box_min: Optional[Point3D] = Field(
        None, description="The minimum corner of the computational domain's bounding box."
    )
    bounding_box_max: Optional[Point3D] = Field(
        None, description="The maximum corner of the computational domain's bounding box."
    )


class Material(BaseModel):
    """Represents a material with its properties."""
    id: str = Field(default_factory=lambda: f"mat_{uuid.uuid4().hex[:8]}")
    name: str = "Default Material"
    type: str = "Soil"  # e.g., Soil, Concrete, Steel
    parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Material-specific properties, e.g., {'E': 210e9, 'nu': 0.3}"
    )


class Excavation(BaseModel):
    """
    Represents an excavation, now defined by a 2D profile from a DXF and a depth.
    Replaces the simple cube from Sprint 1.
    """
    id: Optional[str] = None
    name: str = "Default Excavation"
    material_id: Optional[str] = None
    depth: float = Field(20.0, description="Depth of the excavation.")
    profile_points: List[Point2D] = Field(
        default_factory=list, description="List of 2D points defining the excavation outline."
    )


class TunnelProfile(BaseModel):
    """Defines the cross-section of the tunnel."""
    type: str = "circular"
    radius: float = 5.0


class Tunnel(BaseModel):
    """Represents a parameterized tunnel, defined by a centerline path and a profile."""
    id: Optional[str] = None
    name: str = "Default Tunnel"
    material_id: Optional[str] = None
    path: List[Point3D] = Field(default_factory=list, description="Centerline path of the tunnel.")
    profile: TunnelProfile = Field(default_factory=TunnelProfile, description="Cross-section profile of the tunnel.")


class MeshingParameters(BaseModel):
    """
    Simplified meshing parameters for Sprint 1.
    """
    global_size: float = Field(5.0, description="Global element size for meshing")


class ProjectScene(BaseModel):
    """
    The root model for a project scene, aligning with the "Single Source of Truth" principle.
    This version is simplified for Sprint 1.
    """
    id: Optional[str] = Field(None, description="Scene ID in the database")
    name: str = Field("New Project Scene", description="Name of the project scene")
    domain: ComputationalDomain = Field(default_factory=ComputationalDomain)
    excavations: List[Excavation] = Field(default_factory=list)
    tunnels: List[Tunnel] = Field(default_factory=list)
    materials: List[Material] = Field(default_factory=list)
    meshing: MeshingParameters = Field(default_factory=MeshingParameters)

    class Config:
        from_attributes = True 