"""
Enhanced geotechnical material models for SQLite with MIDAS compatibility
"""
from sqlalchemy import Column, String, Text, Boolean, Float, Integer, DateTime
from datetime import datetime
from .base import BaseModel


class GeotechnicalMaterial(BaseModel):
    """
    Enhanced geotechnical material model with full MIDAS GTS compatibility
    """
    __tablename__ = 'geotechnical_materials'
    
    # Basic information
    name = Column(String(200), nullable=False)
    material_type = Column(String(50), nullable=False, index=True)
    constitutive_model = Column(String(50), nullable=False, index=True)
    description = Column(Text, nullable=True)
    source = Column(String(100), nullable=True)
    standard = Column(String(100), nullable=True)
    reliability = Column(String(20), nullable=False, default='empirical')
    
    # Status and version control
    status = Column(String(20), nullable=False, default='draft')
    validated = Column(Boolean, default=False)
    version = Column(String(20), nullable=False, default='1.0.0')
    
    # Material properties (JSON storage for flexibility)
    properties_data = Column(Text, nullable=False)
    
    # MIDAS compatibility
    midas_format_data = Column(Text, nullable=True)
    staged_properties_data = Column(Text, nullable=True)
    
    # Usage tracking
    usage_count = Column(Integer, default=0)
    last_used = Column(DateTime, nullable=True)
    project_ids_data = Column(Text, nullable=True)  # JSON array
    
    # Tags and categorization
    tags_data = Column(Text, nullable=True)  # JSON array
    category = Column(String(50), nullable=True)
    sub_category = Column(String(50), nullable=True)
    
    # Parameter ranges for validation
    parameter_ranges_data = Column(Text, nullable=True)
    
    # Metadata
    created_by = Column(String(100), nullable=True)
    modified_by = Column(String(100), nullable=True)
    
    # Library type
    is_library_material = Column(Boolean, default=False)
    is_standard = Column(Boolean, default=False)


class MaterialLibrary(BaseModel):
    """
    Material library model for organizing materials
    """
    __tablename__ = 'material_libraries'
    
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    library_type = Column(String(20), nullable=False, default='personal')  # standard, project, personal, template
    is_read_only = Column(Boolean, default=False)
    is_public = Column(Boolean, default=False)
    owner = Column(String(100), nullable=False)
    
    # Version control
    version = Column(String(20), nullable=False, default='1.0.0')
    
    # Permissions (JSON storage)
    permissions_data = Column(Text, nullable=True)
    
    # Statistics (JSON storage)
    statistics_data = Column(Text, nullable=True)


class MaterialAssignment(BaseModel):
    """
    Material assignment to geometry regions
    """
    __tablename__ = 'material_assignments'
    
    geometry_id = Column(String(36), nullable=False)
    material_id = Column(String(36), nullable=False)
    region_name = Column(String(100), nullable=True)
    
    # Local modifications (JSON storage)
    local_modifications_data = Column(Text, nullable=True)
    
    # Assignment metadata
    assigned_by = Column(String(100), nullable=False)
    assigned_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    
    # Computation status
    computation_status = Column(String(20), nullable=True)
    last_computed_at = Column(DateTime, nullable=True)


# Legacy model for backward compatibility
class Material(BaseModel):
    """
    Legacy material model for backward compatibility
    """
    __tablename__ = 'materials'
    
    name = Column(String(100), nullable=False, unique=True)
    material_type = Column(String(50), nullable=False, index=True)
    
    # Store all other parameters as a JSON string
    parameters_data = Column(Text, nullable=False)
    
    # To distinguish between default library materials and user-defined ones
    is_library_material = Column(Boolean, default=False)