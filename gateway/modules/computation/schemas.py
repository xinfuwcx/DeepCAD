from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from uuid import UUID, uuid4
from datetime import datetime
from enum import Enum


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ConstitutiveModelType(str, Enum):
    """Constitutive model types"""
    LINEAR_ELASTIC = "linear_elastic"
    MOHR_COULOMB = "mohr_coulomb"
    DRUCKER_PRAGER = "drucker_prager"
    CAM_CLAY = "cam_clay"
    HARDENING_SOIL = "hardening_soil"
    HYPOPLASTIC = "hypoplastic"


class AnalysisType(str, Enum):
    """Analysis types"""
    STATIC = "static"
    DYNAMIC = "dynamic"
    CONSTRUCTION_SEQUENCE = "construction_sequence"


class SolverType(str, Enum):
    """Solver types"""
    DIRECT = "direct"
    ITERATIVE = "iterative"


class ConstitutiveModel(BaseModel):
    """Constitutive model configuration"""
    type: ConstitutiveModelType = Field(..., description="Constitutive model type")
    parameters: Dict[str, float] = Field(..., description="Model parameters")
    advanced_options: Optional[Dict[str, Any]] = Field(None, description="Advanced model options")


class PhysicalProperties(BaseModel):
    """Physical properties of soil/material"""
    unit_weight: float = Field(..., description="Unit weight (kN/m³)")
    water_content: Optional[float] = Field(None, description="Water content (%)")
    void_ratio: Optional[float] = Field(None, description="Void ratio")
    saturation: Optional[float] = Field(None, description="Saturation (%)")
    permeability: Optional[float] = Field(None, description="Permeability (m/s)")


class SoilLayer(BaseModel):
    """Soil layer definition"""
    id: str = Field(..., description="Layer unique identifier")
    name: str = Field(..., description="Layer name")
    depth_range: Dict[str, float] = Field(..., description="Depth range {from, to}")
    soil_type: str = Field(..., description="Soil type: clay, sand, silt, rock, mixed")
    constitutive_model: ConstitutiveModel = Field(..., description="Constitutive model")
    physical_properties: PhysicalProperties = Field(..., description="Physical properties")
    enabled: bool = Field(True, description="Is layer enabled")


class BoundaryCondition(BaseModel):
    """Boundary condition definition"""
    id: str = Field(..., description="Boundary condition ID")
    name: str = Field(..., description="Boundary condition name")
    condition_type: str = Field(..., description="Type: displacement, force, pressure, spring")
    application_region: Dict[str, Any] = Field(..., description="Application region")
    values: Dict[str, Any] = Field(..., description="Boundary condition values")
    time_function: Optional[Dict[str, Any]] = Field(None, description="Time function")


class AnchorRow(BaseModel):
    """Anchor row configuration"""
    id: str = Field(..., description="Row unique identifier")
    row_number: int = Field(..., description="Row number")
    position: Dict[str, float] = Field(..., description="Position {depth, horizontal_offset}")
    geometry: Dict[str, float] = Field(..., description="Geometry {free_length, bonded_length, diameter, angle}")
    spacing: Dict[str, float] = Field(..., description="Spacing {horizontal, vertical}")
    anchor_count: int = Field(..., description="Number of anchors in row")
    prestress: float = Field(0.0, description="Prestress value (kN)")
    enabled: bool = Field(True, description="Is row enabled")


class AnchorSystem(BaseModel):
    """Anchor system configuration"""
    id: str = Field(..., description="Anchor system ID")
    name: str = Field(..., description="Anchor system name")
    anchor_type: str = Field(..., description="Anchor type: tension, compression, both")
    layout_config: Dict[str, Any] = Field(..., description="Layout configuration")
    prestress_config: Dict[str, Any] = Field(..., description="Prestress configuration")
    material_properties: Dict[str, Any] = Field(..., description="Material properties")
    anchor_rows: List[AnchorRow] = Field(default_factory=list, description="Anchor rows")


class SoilDomain(BaseModel):
    """Soil domain configuration"""
    id: str = Field(..., description="Domain unique identifier")
    name: str = Field(..., description="Domain name")
    geometry: Dict[str, Any] = Field(..., description="Domain geometry")
    soil_layers: List[SoilLayer] = Field(..., description="Soil layers")
    water_table_depth: float = Field(..., description="Water table depth (m)")
    boundary_conditions: List[BoundaryCondition] = Field(default_factory=list, description="Boundary conditions")
    infinite_elements: Optional[Dict[str, Any]] = Field(None, description="Infinite element configuration")


class SolverSettings(BaseModel):
    """Solver settings"""
    solver_type: SolverType = Field(SolverType.DIRECT, description="Solver type")
    linear_solver: str = Field("skyline_lu", description="Linear solver")
    nonlinear_solver: str = Field("newton_raphson", description="Nonlinear solver")
    max_iterations: int = Field(50, description="Maximum iterations")
    tolerance: float = Field(1e-6, description="Convergence tolerance")


class AnalysisConfig(BaseModel):
    """Analysis configuration"""
    analysis_type: AnalysisType = Field(AnalysisType.STATIC, description="Analysis type")
    solver_settings: SolverSettings = Field(default_factory=SolverSettings, description="Solver settings")
    time_integration: Optional[Dict[str, Any]] = Field(None, description="Time integration settings")
    construction_stages: List[Dict[str, Any]] = Field(default_factory=list, description="Construction stages")
    convergence_criteria: Dict[str, Any] = Field(default_factory=dict, description="Convergence criteria")


class ProjectConfiguration(BaseModel):
    """Complete project configuration"""
    project_info: Dict[str, Any] = Field(..., description="Project information")
    soil_domain: SoilDomain = Field(..., description="Soil domain configuration")
    anchor_system: Optional[AnchorSystem] = Field(None, description="Anchor system configuration")
    mesh_config: Dict[str, Any] = Field(..., description="Mesh configuration")
    analysis_config: AnalysisConfig = Field(..., description="Analysis configuration")


class ComputationJob(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    status: JobStatus = JobStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result_url: Optional[str] = None
    project_config: Optional[ProjectConfiguration] = Field(None, description="Project configuration")
    kratos_files: Optional[Dict[str, str]] = Field(None, description="Generated Kratos input files")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class ComputationRequest(BaseModel):
    """Computation request with full project configuration"""
    client_id: str = Field(..., description="Client ID for WebSocket communication")
    project_config: ProjectConfiguration = Field(..., description="Complete project configuration")
    generate_kratos_files: bool = Field(True, description="Generate Kratos input files")
    run_analysis: bool = Field(False, description="Run analysis immediately")


class ComputationResult(BaseModel):
    """Computation result"""
    job_id: UUID = Field(..., description="Job identifier")
    status: JobStatus = Field(..., description="Job status")
    results: Optional[Dict[str, Any]] = Field(None, description="Analysis results")
    output_files: List[str] = Field(default_factory=list, description="Output file paths")
    mesh_info: Optional[Dict[str, Any]] = Field(None, description="Mesh information")
    analysis_summary: Optional[Dict[str, Any]] = Field(None, description="Analysis summary")


class KratosFileGeneration(BaseModel):
    """Kratos file generation request"""
    project_config: ProjectConfiguration = Field(..., description="Project configuration")
    output_directory: str = Field(..., description="Output directory path")
    file_format: str = Field("json", description="File format: json, mdpa")


class KratosFileGenerationResult(BaseModel):
    """Kratos file generation result"""
    success: bool = Field(..., description="Generation success")
    files_generated: Dict[str, str] = Field(..., description="Generated files {filename: filepath}")
    validation_results: Optional[Dict[str, Any]] = Field(None, description="Validation results")
    warnings: List[str] = Field(default_factory=list, description="Generation warnings")
    errors: List[str] = Field(default_factory=list, description="Generation errors")