"""
Simplified component models for SQLite
"""
from sqlalchemy import Column, String, Text, Float, Boolean, ForeignKey
from .base import BaseModel


class Component(BaseModel):
    """Simplified component model"""
    __tablename__ = 'components'
    
    # Component type and configuration
    component_type = Column(String(50), nullable=False)
    geometry_data = Column(Text, nullable=False)  # JSON as text for SQLite
    
    # Analysis properties
    is_active = Column(Boolean, default=True)
    
    # Simple scene reference (string for SQLite)
    scene_id = Column(String(36), nullable=True)