"""
Simplified material models for SQLite
"""
from sqlalchemy import Column, String, Text, Boolean
from .base import BaseModel


class Material(BaseModel):
    """
    Represents a material in the database.
    The detailed properties are stored as a JSON string in 'parameters_data'.
    """
    __tablename__ = 'materials'
    
    name = Column(String(100), nullable=False, unique=True)
    material_type = Column(String(50), nullable=False, index=True)
    
    # Store all other parameters as a JSON string
    parameters_data = Column(Text, nullable=False)
    
    # To distinguish between default library materials and user-defined ones
    is_library_material = Column(Boolean, default=False)