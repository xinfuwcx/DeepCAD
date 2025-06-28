"""
@file models.py
@description SQLAlchemy数据模型
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Text, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from datetime import datetime

from src.database.session import Base

# 项目表
class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # 关系
    domains = relationship("Domain", back_populates="project", cascade="all, delete-orphan")
    soil_layers = relationship("SoilLayer", back_populates="project", cascade="all, delete-orphan")
    meshes = relationship("Mesh", back_populates="project", cascade="all, delete-orphan")
    computations = relationship("Computation", back_populates="project", cascade="all, delete-orphan")
    monitoring_data = relationship("MonitoringData", back_populates="project", cascade="all, delete-orphan")

# 计算域表
class Domain(Base):
    __tablename__ = "domains"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    width = Column(Float, nullable=False)  # X方向
    length = Column(Float, nullable=False)  # Y方向
    total_depth = Column(Float, nullable=False)  # Z方向
    created_at = Column(DateTime, default=func.now())
    
    # 关系
    project = relationship("Project", back_populates="domains")

# 土层表
class SoilLayer(Base):
    __tablename__ = "soil_layers"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    material_type = Column(String(50), nullable=False)
    thickness = Column(Float, nullable=False)
    top_elevation = Column(Float, nullable=False)
    bottom_elevation = Column(Float, nullable=False)
    properties = Column(JSON, nullable=True)  # 材料属性JSON
    created_at = Column(DateTime, default=func.now())
    
    # 关系
    project = relationship("Project", back_populates="soil_layers")

# 基坑表
class Excavation(Base):
    __tablename__ = "excavations"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    depth = Column(Float, nullable=False)
    contour_points = Column(JSON, nullable=True)  # 轮廓点JSON
    created_at = Column(DateTime, default=func.now())

# 地连墙表
class Wall(Base):
    __tablename__ = "walls"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    thickness = Column(Float, nullable=False)
    depth = Column(Float, nullable=False)
    elevation = Column(Float, nullable=False)
    material_properties = Column(JSON, nullable=True)  # 材料属性JSON
    created_at = Column(DateTime, default=func.now())

# 网格表
class Mesh(Base):
    __tablename__ = "meshes"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    element_size = Column(Float, nullable=False)
    algorithm = Column(String(50), default="delaunay")
    order = Column(Integer, default=2)
    node_count = Column(Integer, nullable=True)
    element_count = Column(Integer, nullable=True)
    mesh_quality = Column(Float, nullable=True)
    mesh_file_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    # 关系
    project = relationship("Project", back_populates="meshes")

# 计算任务表
class Computation(Base):
    __tablename__ = "computations"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    mesh_id = Column(Integer, ForeignKey("meshes.id"))
    analysis_type = Column(String(50), nullable=False)
    soil_model = Column(String(50), default="mohr-coulomb")
    max_iterations = Column(Integer, default=100)
    tolerance = Column(Float, default=1e-6)
    load_steps = Column(Integer, default=1)
    time_steps = Column(JSON, nullable=True)  # 时间步JSON
    status = Column(String(20), default="pending")  # pending, running, completed, failed
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    result_file_path = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    # 关系
    project = relationship("Project", back_populates="computations")
    mesh = relationship("Mesh")
    results = relationship("ComputationResult", back_populates="computation", cascade="all, delete-orphan")

# 计算结果表
class ComputationResult(Base):
    __tablename__ = "computation_results"
    
    id = Column(Integer, primary_key=True, index=True)
    computation_id = Column(Integer, ForeignKey("computations.id", ondelete="CASCADE"))
    result_type = Column(String(50), nullable=False)  # displacement, stress, strain, pore_pressure
    time_step = Column(Float, nullable=False)
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    result_file_path = Column(String(255), nullable=True)
    
    # 关系
    computation = relationship("Computation", back_populates="results")

# 监测数据表
class MonitoringData(Base):
    __tablename__ = "monitoring_data"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    data_type = Column(String(50), nullable=False)
    timestamp = Column(Float, nullable=False)
    location_x = Column(Float, nullable=False)
    location_y = Column(Float, nullable=False)
    location_z = Column(Float, nullable=False)
    value = Column(Float, nullable=False)
    sensor_id = Column(String(100), nullable=False)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
    
    # 关系
    project = relationship("Project", back_populates="monitoring_data")

# AI任务表
class AITask(Base):
    __tablename__ = "ai_tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(36), default=lambda: str(uuid.uuid4()), unique=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    task_type = Column(String(50), nullable=False)  # inversion, prediction
    settings = Column(JSON, nullable=True)
    status = Column(String(20), default="pending")  # pending, running, completed, failed
    progress = Column(Integer, default=0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    results = Column(JSON, nullable=True)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now()) 