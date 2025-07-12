"""
Simplified material models for SQLite
"""
from sqlalchemy import Column, String, Text, Float, Boolean
from .base import BaseModel


class Material(BaseModel):
    """Simplified material model"""
    __tablename__ = 'materials'
    
    # Basic properties
    material_type = Column(String(20), nullable=False)
    density = Column(Float, nullable=False)  # kg/m³
    
    # Properties as JSON text
    properties = Column(Text, nullable=False)  # All properties as JSON
    
    # Library vs project-specific
    is_library_material = Column(Boolean, default=False)