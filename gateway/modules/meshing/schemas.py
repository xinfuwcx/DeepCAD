from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from enum import Enum


class FragmentType(str, Enum):
    """Domain fragment types"""
    SOIL_DOMAIN = "soil_domain"
    STRUCTURE = "structure"
    EXCAVATION = "excavation"
    INFINITE_BOUNDARY = "infinite_boundary"


class ElementType(str, Enum):
    """Mesh element types"""
    TRIANGULAR = "triangular"
    QUADRILATERAL = "quadrilateral"
    TETRAHEDRAL = "tetrahedral"
    HEXAHEDRAL = "hexahedral"
    INFINITE_TRIANGLE = "infinite_triangle"
    INFINITE_QUAD = "infinite_quad"


class MeshQuality(str, Enum):
    """Mesh quality levels"""
    COARSE = "coarse"
    MEDIUM = "medium"
    FINE = "fine"
    VERY_FINE = "very_fine"


class FragmentGeometry(BaseModel):
    """Fragment geometry definition"""
    type: str = Field(..., description="Geometry type: polygon, circle, rectangle, complex")
    coordinates: List[List[float]] = Field(..., description="Geometry coordinate points")
    holes: Optional[List[List[List[float]]]] = Field(None, description="Internal holes")
    depth_range: Optional[Dict[str, float]] = Field(None, description="3D depth range")


class InfiniteElementConfig(BaseModel):
    """Infinite element configuration"""
    enabled: bool = Field(False, description="Enable infinite elements")
    direction: str = Field("both", description="Direction: horizontal, vertical, both")
    layers: int = Field(3, description="Number of infinite element layers")
    distance_factor: float = Field(4.0, description="Distance factor from excavation")
    damping_coefficient: float = Field(0.05, description="Damping coefficient")


class FragmentMeshProperties(BaseModel):
    """Fragment mesh properties"""
    element_size: float = Field(..., description="Element size in meters")
    element_type: ElementType = Field(..., description="Element type")
    mesh_density: MeshQuality = Field(MeshQuality.MEDIUM, description="Mesh density")
    structured_mesh: bool = Field(False, description="Use structured mesh")
    infinite_elements: Optional[InfiniteElementConfig] = Field(None, description="Infinite element config")


class DomainFragment(BaseModel):
    """Domain fragment definition"""
    id: str = Field(..., description="Fragment unique identifier")
    name: str = Field(..., description="Fragment name")
    fragment_type: FragmentType = Field(..., description="Fragment type")
    geometry: FragmentGeometry = Field(..., description="Fragment geometry")
    mesh_properties: FragmentMeshProperties = Field(..., description="Mesh properties")
    material_assignment: Optional[str] = Field(None, description="Assigned material ID")
    boundary_conditions: List[str] = Field(default_factory=list, description="Boundary condition IDs")


class GlobalMeshSettings(BaseModel):
    """Global mesh settings"""
    element_type: ElementType = Field(ElementType.TRIANGULAR, description="Default element type")
    default_element_size: float = Field(2.0, description="Default element size in meters")
    mesh_quality: MeshQuality = Field(MeshQuality.MEDIUM, description="Overall mesh quality")
    max_element_size: float = Field(10.0, description="Maximum element size")
    min_element_size: float = Field(0.1, description="Minimum element size")
    mesh_smoothing: bool = Field(True, description="Enable mesh smoothing")


class RefinementZone(BaseModel):
    """Mesh refinement zone"""
    id: str = Field(..., description="Zone unique identifier")
    name: str = Field(..., description="Zone name")
    zone_type: str = Field(..., description="Zone type: excavation_boundary, structure_interface, etc.")
    geometry: FragmentGeometry = Field(..., description="Zone geometry")
    refinement_factor: float = Field(0.5, description="Refinement factor (smaller = finer)")
    transition_layers: int = Field(3, description="Number of transition layers")


class InfiniteLayer(BaseModel):
    """Infinite element layer configuration"""
    layer_number: int = Field(..., description="Layer number")
    element_size_factor: float = Field(..., description="Element size factor relative to inner layer")
    damping_coefficient: float = Field(..., description="Damping coefficient")


class OuterBoundary(BaseModel):
    """Outer boundary configuration for infinite elements"""
    distance_from_excavation: float = Field(50.0, description="Distance from excavation boundary")
    shape: str = Field("rectangular", description="Boundary shape: circular, rectangular")
    automatic_sizing: bool = Field(True, description="Automatic boundary sizing")


class InfiniteElementMesh(BaseModel):
    """Infinite element mesh configuration"""
    enabled: bool = Field(False, description="Enable infinite elements")
    outer_boundary: OuterBoundary = Field(default_factory=OuterBoundary, description="Outer boundary config")
    infinite_layers: List[InfiniteLayer] = Field(default_factory=list, description="Infinite layers")


class MeshConfig(BaseModel):
    """Complete mesh configuration"""
    id: str = Field(..., description="Mesh configuration ID")
    global_settings: GlobalMeshSettings = Field(..., description="Global mesh settings")
    domain_fragments: List[DomainFragment] = Field(..., description="Domain fragments")
    refinement_zones: List[RefinementZone] = Field(default_factory=list, description="Refinement zones")
    infinite_elements: InfiniteElementMesh = Field(default_factory=InfiniteElementMesh, description="Infinite elements")


class MeshGenerationRequest(BaseModel):
    """Mesh generation request"""
    project_id: str = Field(..., description="Project identifier")
    mesh_config: MeshConfig = Field(..., description="Mesh configuration")
    output_format: str = Field("vtk", description="Output format: vtk, msh, inp")
    generate_infinite_elements: bool = Field(False, description="Generate infinite elements")


class MeshGenerationResponse(BaseModel):
    """Response model after a successful mesh generation."""
    message: str = Field("Mesh generated successfully.")
    mesh_url: str = Field(..., description="The URL path to access the generated mesh file (e.g., a VTK file).")
    fragments_generated: List[str] = Field(default_factory=list, description="List of generated fragment IDs")
    infinite_elements_count: int = Field(0, description="Number of infinite elements generated")
    total_elements: int = Field(0, description="Total number of elements")
    total_nodes: int = Field(0, description="Total number of nodes")
    mesh_quality_metrics: Dict[str, float] = Field(default_factory=dict, description="Mesh quality metrics")


class MeshValidationResult(BaseModel):
    """Mesh validation result"""
    is_valid: bool = Field(..., description="Is mesh valid")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    quality_metrics: Dict[str, float] = Field(default_factory=dict, description="Quality metrics")


class FragmentMeshInfo(BaseModel):
    """Information about a meshed fragment"""
    fragment_id: str = Field(..., description="Fragment ID")
    element_count: int = Field(..., description="Number of elements")
    node_count: int = Field(..., description="Number of nodes")
    min_element_size: float = Field(..., description="Minimum element size")
    max_element_size: float = Field(..., description="Maximum element size")
    avg_element_quality: float = Field(..., description="Average element quality")
    material_id: Optional[str] = Field(None, description="Assigned material ID")