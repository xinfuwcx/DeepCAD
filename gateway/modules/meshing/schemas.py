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


# === Gmsh Physical Group Management Schemas ===

class PhysicalGroupType(str, Enum):
    """Physical group types for different entity dimensions"""
    POINT = "point"          # 0D entities
    CURVE = "curve"          # 1D entities  
    SURFACE = "surface"      # 2D entities
    VOLUME = "volume"        # 3D entities


class MaterialType(str, Enum):
    """Engineering material types for CAE analysis"""
    SOIL = "soil"
    CONCRETE = "concrete"
    STEEL = "steel"
    ROCK = "rock"
    GROUT = "grout"
    WATER = "water"
    EXCAVATION = "excavation"  # For air/void regions


class PhysicalGroupDefinition(BaseModel):
    """Physical group definition for Gmsh"""
    name: str = Field(..., description="Physical group name")
    group_type: PhysicalGroupType = Field(..., description="Entity dimension type")
    material_type: MaterialType = Field(..., description="Material type")
    description: Optional[str] = Field(None, description="Group description")
    color: Optional[str] = Field(None, description="Visualization color (hex)")
    properties: Dict[str, Any] = Field(default_factory=dict, description="Material properties")


class PhysicalGroupInfo(BaseModel):
    """Physical group information from Gmsh"""
    tag: int = Field(..., description="Gmsh physical group tag")
    name: str = Field(..., description="Physical group name")
    dimension: int = Field(..., description="Entity dimension (0-3)")
    entity_count: int = Field(..., description="Number of entities in group")
    material_type: Optional[MaterialType] = Field(None, description="Material type")
    properties: Dict[str, Any] = Field(default_factory=dict, description="Material properties")


class CreatePhysicalGroupRequest(BaseModel):
    """Request to create physical group"""
    definition: PhysicalGroupDefinition = Field(..., description="Physical group definition")
    entity_tags: List[int] = Field(..., description="Entity tags to include in group")
    auto_tag: bool = Field(True, description="Auto-assign tag number")
    custom_tag: Optional[int] = Field(None, description="Custom tag number")


class UpdatePhysicalGroupRequest(BaseModel):
    """Request to update physical group"""
    name: Optional[str] = Field(None, description="New name")
    description: Optional[str] = Field(None, description="New description")
    material_type: Optional[MaterialType] = Field(None, description="New material type")
    properties: Optional[Dict[str, Any]] = Field(None, description="New properties")
    entity_tags: Optional[List[int]] = Field(None, description="New entity tags")


class PhysicalGroupResponse(BaseModel):
    """Response after physical group operation"""
    success: bool = Field(..., description="Operation success")
    message: str = Field(..., description="Response message")
    group_info: Optional[PhysicalGroupInfo] = Field(None, description="Group information")
    

class PhysicalGroupListResponse(BaseModel):
    """Response with list of physical groups"""
    groups: List[PhysicalGroupInfo] = Field(..., description="List of physical groups")
    total_count: int = Field(..., description="Total number of groups")
    by_dimension: Dict[str, int] = Field(..., description="Groups count by dimension")


class EntityInfo(BaseModel):
    """Gmsh entity information"""
    tag: int = Field(..., description="Entity tag")
    dimension: int = Field(..., description="Entity dimension")
    bounding_box: Optional[List[float]] = Field(None, description="Bounding box coordinates")
    parent_entities: List[int] = Field(default_factory=list, description="Parent entity tags")
    child_entities: List[int] = Field(default_factory=list, description="Child entity tags")


class GeometryEntitiesResponse(BaseModel):
    """Response with geometry entities information"""
    entities: List[EntityInfo] = Field(..., description="Geometry entities")
    by_dimension: Dict[str, List[EntityInfo]] = Field(..., description="Entities grouped by dimension")
    total_count: int = Field(..., description="Total entity count")


# === Advanced Mesh Algorithm Configuration ===

class MeshAlgorithmType(str, Enum):
    """Mesh generation algorithms"""
    DELAUNAY = "delaunay"           # Delaunay triangulation
    FRONTAL = "frontal"             # Frontal-Delaunay
    FRONTAL_QUAD = "frontal_quad"   # Frontal quadrilateral
    MMG = "mmg"                     # MMG remeshing
    NETGEN = "netgen"               # Netgen algorithm  
    TETGEN = "tetgen"               # TetGen algorithm
    GMSH_PACK = "gmsh_pack"         # Gmsh packing algorithm

class Element2DType(str, Enum):
    """2D element types"""
    TRIANGLE = "triangle"           # Triangular elements
    QUADRANGLE = "quadrangle"       # Quadrilateral elements
    MIXED = "mixed"                 # Mixed triangles and quads

class Element3DType(str, Enum):
    """3D element types"""
    TETRAHEDRON = "tetrahedron"     # Tetrahedral elements
    HEXAHEDRON = "hexahedron"       # Hexahedral elements
    PRISM = "prism"                 # Prismatic elements
    PYRAMID = "pyramid"             # Pyramid elements
    MIXED_3D = "mixed_3d"           # Mixed 3D elements

class MeshQualityMode(str, Enum):
    """Mesh quality optimization modes"""
    FAST = "fast"                   # Fast generation, lower quality
    BALANCED = "balanced"           # Balanced speed/quality
    HIGH_QUALITY = "high_quality"   # High quality, slower
    ADAPTIVE = "adaptive"           # Adaptive based on geometry

class RefinementStrategy(str, Enum):
    """Mesh refinement strategies"""
    UNIFORM = "uniform"             # Uniform refinement
    ADAPTIVE = "adaptive"           # Adaptive refinement
    CURVATURE_BASED = "curvature_based"  # Based on surface curvature
    FEATURE_BASED = "feature_based" # Based on geometric features
    GRADIENT_BASED = "gradient_based"    # Based on field gradients

class MeshSmoothingAlgorithm(str, Enum):
    """Mesh smoothing algorithms"""
    LAPLACIAN = "laplacian"         # Laplacian smoothing
    TAUBIN = "taubin"               # Taubin smoothing
    ANGLE_BASED = "angle_based"     # Angle-based smoothing
    SPRING_ANALOGY = "spring_analogy"    # Spring analogy
    OPTIMIZATION_BASED = "optimization_based"  # Optimization-based

class AlgorithmParameters(BaseModel):
    """Algorithm-specific parameters"""
    # Delaunay parameters
    delaunay_edge_length_factor: Optional[float] = Field(1.0, description="Edge length factor for Delaunay")
    
    # Frontal parameters
    frontal_quad_ratio: Optional[float] = Field(0.5, description="Quad ratio for frontal algorithm")
    frontal_recombination: Optional[bool] = Field(True, description="Enable triangle recombination")
    
    # MMG parameters
    mmg_hausdorff_distance: Optional[float] = Field(0.01, description="Hausdorff distance for MMG")
    mmg_gradation: Optional[float] = Field(1.3, description="Gradation parameter for MMG")
    
    # Netgen parameters
    netgen_fineness: Optional[int] = Field(3, description="Netgen fineness level (1-5)")
    netgen_second_order: Optional[bool] = Field(False, description="Generate second-order elements")
    
    # Quality parameters
    min_element_quality: Optional[float] = Field(0.3, description="Minimum element quality")
    max_aspect_ratio: Optional[float] = Field(10.0, description="Maximum aspect ratio")
    
    # Optimization parameters
    optimization_iterations: Optional[int] = Field(5, description="Number of optimization iterations")
    node_relocation_factor: Optional[float] = Field(0.5, description="Node relocation factor")

class SizeFieldConfiguration(BaseModel):
    """Size field configuration for adaptive meshing"""
    enable_size_field: bool = Field(False, description="Enable size field")
    size_field_type: str = Field("distance", description="Size field type: distance, curvature, custom")
    min_size: float = Field(0.1, description="Minimum element size")
    max_size: float = Field(10.0, description="Maximum element size")
    growth_rate: float = Field(1.2, description="Size growth rate")
    
    # Distance-based size field
    distance_entities: List[int] = Field(default_factory=list, description="Entities for distance calculation")
    distance_threshold: float = Field(5.0, description="Distance threshold")
    
    # Curvature-based size field
    curvature_adaptation: bool = Field(False, description="Enable curvature adaptation")
    curvature_threshold: float = Field(0.1, description="Curvature threshold")
    min_elements_per_curve: int = Field(10, description="Minimum elements per curve")

class BoundaryLayerConfiguration(BaseModel):
    """Boundary layer mesh configuration"""
    enable_boundary_layers: bool = Field(False, description="Enable boundary layers")
    boundary_entities: List[int] = Field(default_factory=list, description="Boundary surface entities")
    number_of_layers: int = Field(3, description="Number of boundary layers")
    first_layer_thickness: float = Field(0.01, description="First layer thickness")
    growth_ratio: float = Field(1.3, description="Layer thickness growth ratio")
    layer_element_type: Element3DType = Field(Element3DType.PRISM, description="Boundary layer element type")

class ParallelConfiguration(BaseModel):
    """Parallel meshing configuration"""
    enable_parallel: bool = Field(False, description="Enable parallel meshing")
    num_threads: int = Field(4, description="Number of threads")
    partitioning_algorithm: str = Field("metis", description="Partitioning algorithm")
    load_balancing: bool = Field(True, description="Enable load balancing")

class AdvancedMeshConfiguration(BaseModel):
    """Advanced mesh generation configuration"""
    # Basic settings
    global_element_size: float = Field(1.0, description="Global element size")
    algorithm_2d: MeshAlgorithmType = Field(MeshAlgorithmType.DELAUNAY, description="2D meshing algorithm")
    algorithm_3d: MeshAlgorithmType = Field(MeshAlgorithmType.DELAUNAY, description="3D meshing algorithm")
    
    # Element types
    element_2d_type: Element2DType = Field(Element2DType.TRIANGLE, description="2D element type")
    element_3d_type: Element3DType = Field(Element3DType.TETRAHEDRON, description="3D element type")
    
    # Quality settings
    quality_mode: MeshQualityMode = Field(MeshQualityMode.BALANCED, description="Quality mode")
    refinement_strategy: RefinementStrategy = Field(RefinementStrategy.UNIFORM, description="Refinement strategy")
    smoothing_algorithm: MeshSmoothingAlgorithm = Field(MeshSmoothingAlgorithm.LAPLACIAN, description="Smoothing algorithm")
    
    # Algorithm parameters
    algorithm_params: AlgorithmParameters = Field(default_factory=AlgorithmParameters, description="Algorithm parameters")
    
    # Advanced features
    size_field: SizeFieldConfiguration = Field(default_factory=SizeFieldConfiguration, description="Size field configuration")
    boundary_layers: BoundaryLayerConfiguration = Field(default_factory=BoundaryLayerConfiguration, description="Boundary layer configuration")
    parallel_config: ParallelConfiguration = Field(default_factory=ParallelConfiguration, description="Parallel configuration")
    
    # Post-processing
    enable_smoothing: bool = Field(True, description="Enable mesh smoothing")
    smoothing_iterations: int = Field(3, description="Number of smoothing iterations")
    enable_optimization: bool = Field(True, description="Enable mesh optimization")
    
    # Output options
    generate_second_order: bool = Field(False, description="Generate second-order elements")
    subdivision_algorithm: Optional[str] = Field(None, description="Subdivision algorithm")

class ConfigurableMeshRequest(BaseModel):
    """Request for configurable mesh generation"""
    project_id: str = Field(..., description="Project ID")
    geometry_id: str = Field(..., description="Geometry ID")
    config: AdvancedMeshConfiguration = Field(..., description="Mesh configuration")
    physical_groups: List[int] = Field(default_factory=list, description="Physical group tags to mesh")
    output_formats: List[str] = Field(["vtk", "msh"], description="Output formats")

class MeshGenerationStatus(BaseModel):
    """Mesh generation status"""
    status: str = Field(..., description="Generation status")
    progress: float = Field(..., description="Progress percentage")
    current_stage: str = Field(..., description="Current processing stage")
    estimated_time_remaining: Optional[float] = Field(None, description="Estimated time remaining (seconds)")
    memory_usage: Optional[float] = Field(None, description="Memory usage (MB)")
    
class ConfigurableMeshResponse(BaseModel):
    """Response for configurable mesh generation"""
    mesh_id: str = Field(..., description="Generated mesh ID")
    status: MeshGenerationStatus = Field(..., description="Generation status")
    mesh_statistics: Dict[str, Any] = Field(default_factory=dict, description="Mesh statistics")
    output_files: List[str] = Field(default_factory=list, description="Generated output files")
    quality_metrics: Dict[str, float] = Field(default_factory=dict, description="Quality metrics")
    generation_time: float = Field(..., description="Generation time (seconds)")

class AlgorithmPreset(BaseModel):
    """Predefined algorithm preset"""
    name: str = Field(..., description="Preset name")
    description: str = Field(..., description="Preset description")
    config: AdvancedMeshConfiguration = Field(..., description="Preset configuration")
    use_case: str = Field(..., description="Recommended use case")
    performance_level: str = Field(..., description="Performance level: fast, balanced, quality")

class AlgorithmPresetsResponse(BaseModel):
    """Response with available algorithm presets"""
    presets: List[AlgorithmPreset] = Field(..., description="Available presets")
    total_count: int = Field(..., description="Total preset count")
    categories: Dict[str, List[str]] = Field(..., description="Presets by category")