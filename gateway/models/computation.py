"""
Simplified computation models for SQLite
"""
from sqlalchemy import Column, String, Text, Float, Integer, DateTime
from .base import BaseModel


class ComputationJob(BaseModel):
    """Simplified computation job model"""
    __tablename__ = 'computation_jobs'
    
    # Job configuration
    job_type = Column(String(50), nullable=False)
    status = Column(String(20), default='pending', nullable=False)
    progress_percentage = Column(Float, default=0.0)
    
    # Configuration and results
    input_parameters = Column(Text, nullable=False)  # JSON as text
    output_files = Column(Text, nullable=True)       # JSON as text
    error_log = Column(Text, nullable=True)
    
    # Scene reference
    scene_id = Column(String(36), nullable=True)