"""
@file excavation_models.py
@description 深基坑工程数据库模型定义
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, Table
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import json

from src.database.session import Base

# 项目表
class Project(Base):
    """项目表"""
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    location = Column(String(200))
    owner = Column(String(100))
    designer = Column(String(100))
    constructor = Column(String(100))
    supervisor = Column(String(100))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    status = Column(String(50), default="created")
    metadata = Column(JSON)
    
    # 关系
    geometries = relationship("Geometry", back_populates="project", cascade="all, delete-orphan")
    meshes = relationship("Mesh", back_populates="project", cascade="all, delete-orphan")
    models = relationship("Model", back_populates="project", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="project", cascade="all, delete-orphan")
    sensor_data = relationship("SensorData", back_populates="project", cascade="all, delete-orphan")
    pinn_models = relationship("PINNModel", back_populates="project", cascade="all, delete-orphan")
    inverse_analyses = relationship("InverseAnalysis", back_populates="project", cascade="all, delete-orphan")

# 几何模型表
class Geometry(Base):
    """几何模型表"""
    __tablename__ = "geometries"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String(100), nullable=False)
    file_path = Column(String(255))
    width = Column(Float)
    length = Column(Float)
    depth = Column(Float)
    excavation_width = Column(Float)
    excavation_length = Column(Float)
    excavation_depth = Column(Float)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    metadata = Column(JSON)
    
    # 关系
    project = relationship("Project", back_populates="geometries")
    meshes = relationship("Mesh", back_populates="geometry", cascade="all, delete-orphan")

# 网格表
class Mesh(Base):
    """网格表"""
    __tablename__ = "meshes"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    geometry_id = Column(Integer, ForeignKey("geometries.id"))
    name = Column(String(100), nullable=False)
    file_path = Column(String(255))
    format = Column(String(10))
    mesh_size = Column(Float)
    algorithm = Column(Integer)
    node_count = Column(Integer)
    element_count = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    metadata = Column(JSON)
    
    # 关系
    project = relationship("Project", back_populates="meshes")
    geometry = relationship("Geometry", back_populates="meshes")
    models = relationship("Model", back_populates="mesh", cascade="all, delete-orphan")

# 土层表
class SoilLayer(Base):
    """土层表"""
    __tablename__ = "soil_layers"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("models.id"))
    name = Column(String(100), nullable=False)
    material_model = Column(String(50))
    group_id = Column(Integer)
    parameters = Column(JSON)
    created_at = Column(DateTime, default=datetime.now)
    
    # 关系
    model = relationship("Model", back_populates="soil_layers")

# 边界条件表
class BoundaryCondition(Base):
    """边界条件表"""
    __tablename__ = "boundary_conditions"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("models.id"))
    type = Column(String(50))
    entities = Column(JSON)  # 存储实体ID列表
    values = Column(JSON)    # 存储边界条件值
    created_at = Column(DateTime, default=datetime.now)
    
    # 关系
    model = relationship("Model", back_populates="boundary_conditions")

# 荷载表
class Load(Base):
    """荷载表"""
    __tablename__ = "loads"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("models.id"))
    type = Column(String(50))
    entities = Column(JSON)  # 存储实体ID列表
    values = Column(JSON)    # 存储荷载值
    stage = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)
    
    # 关系
    model = relationship("Model", back_populates="loads")

# 开挖阶段表
class ExcavationStage(Base):
    """开挖阶段表"""
    __tablename__ = "excavation_stages"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("models.id"))
    name = Column(String(100), nullable=False)
    entities = Column(JSON)  # 存储开挖单元列表
    water_level = Column(Float)
    time_step = Column(Float)
    sequence = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)
    
    # 关系
    model = relationship("Model", back_populates="excavation_stages")

# 计算模型表
class Model(Base):
    """计算模型表"""
    __tablename__ = "models"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    mesh_id = Column(Integer, ForeignKey("meshes.id"))
    name = Column(String(100), nullable=False)
    file_path = Column(String(255))
    analysis_type = Column(String(50), default="static")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    metadata = Column(JSON)
    
    # 关系
    project = relationship("Project", back_populates="models")
    mesh = relationship("Mesh", back_populates="models")
    soil_layers = relationship("SoilLayer", back_populates="model", cascade="all, delete-orphan")
    boundary_conditions = relationship("BoundaryCondition", back_populates="model", cascade="all, delete-orphan")
    loads = relationship("Load", back_populates="model", cascade="all, delete-orphan")
    excavation_stages = relationship("ExcavationStage", back_populates="model", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="model", cascade="all, delete-orphan")

# 分析表
class Analysis(Base):
    """分析表"""
    __tablename__ = "analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    model_id = Column(Integer, ForeignKey("models.id"))
    name = Column(String(100), nullable=False)
    type = Column(String(50))
    status = Column(String(50), default="pending")
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    parameters = Column(JSON)
    result_file = Column(String(255))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # 关系
    project = relationship("Project", back_populates="analyses")
    model = relationship("Model", back_populates="analyses")
    results = relationship("Result", back_populates="analysis", cascade="all, delete-orphan")

# 结果表
class Result(Base):
    """结果表"""
    __tablename__ = "results"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("analyses.id"))
    type = Column(String(50))
    stage = Column(Integer)
    file_path = Column(String(255))
    summary = Column(JSON)
    created_at = Column(DateTime, default=datetime.now)
    
    # 关系
    analysis = relationship("Analysis", back_populates="results")

# 传感器数据表
class SensorData(Base):
    """传感器数据表"""
    __tablename__ = "sensor_data"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    sensor_id = Column(String(100))
    sensor_type = Column(String(50))
    timestamp = Column(DateTime)
    location_x = Column(Float)
    location_y = Column(Float)
    location_z = Column(Float)
    value = Column(Float)
    unit = Column(String(20))
    quality = Column(Float)
    file_path = Column(String(255))
    created_at = Column(DateTime, default=datetime.now)
    metadata = Column(JSON)
    
    # 关系
    project = relationship("Project", back_populates="sensor_data")

# PINN模型表
class PINNModel(Base):
    """PINN模型表"""
    __tablename__ = "pinn_models"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String(100), nullable=False)
    pde_type = Column(String(50))
    layers = Column(JSON)
    iterations = Column(Integer)
    learning_rate = Column(Float)
    loss_history = Column(JSON)
    file_path = Column(String(255))
    status = Column(String(50), default="pending")
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    metadata = Column(JSON)
    
    # 关系
    project = relationship("Project", back_populates="pinn_models")

# 反演分析表
class InverseAnalysis(Base):
    """反演分析表"""
    __tablename__ = "inverse_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String(100), nullable=False)
    data_type = Column(String(50))
    pde_type = Column(String(50))
    initial_params = Column(JSON)
    final_params = Column(JSON)
    iterations = Column(Integer)
    convergence = Column(JSON)
    status = Column(String(50), default="pending")
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    result_file = Column(String(255))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    metadata = Column(JSON)
    
    # 关系
    project = relationship("Project", back_populates="inverse_analyses")

# 集成分析表
class IntegratedAnalysis(Base):
    """集成分析表"""
    __tablename__ = "integrated_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String(100), nullable=False)
    sensor_data_config = Column(JSON)
    pinn_config = Column(JSON)
    cae_config = Column(JSON)
    status = Column(String(50), default="pending")
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    result_file = Column(String(255))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    metadata = Column(JSON)


