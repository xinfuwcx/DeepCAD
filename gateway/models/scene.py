"""
Simplified scene models for SQLite
"""
from sqlalchemy import Column, String, Text, Float
from .base import BaseModel


class Scene(BaseModel):
    """Simplified scene model"""
    __tablename__ = 'scenes'
    
    # Scene configuration
    scene_type = Column(String(50), nullable=False, default='static_analysis')
    domain_bounds = Column(Text, nullable=True)  # JSON as text