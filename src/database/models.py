"""
@file models.py
@description SQLAlchemy数据模型
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, Text, Boolean
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
    computations = relationship("Computation", back_populates="project", cascade="all, delete-orphan")
    monitoring_data = relationship("MonitoringData", back_populates="project", cascade="all, delete-orphan")
    iga_geometries = relationship("IGAGeometry", back_populates="project", cascade="all, delete-orphan")

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

# IGA几何模型表
class IGAGeometry(Base):
    __tablename__ = "iga_geometries"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    dimension = Column(Integer, default=2)  # 2D或3D
    degree_u = Column(Integer, default=3)
    degree_v = Column(Integer, default=3)
    degree_w = Column(Integer, nullable=True)  # 仅3D时使用
    control_points = Column(JSON, nullable=False)  # 控制点坐标JSON
    weights = Column(JSON, nullable=True)  # 权重JSON
    knot_vector_u = Column(JSON, nullable=False)  # U方向节点矢量
    knot_vector_v = Column(JSON, nullable=False)  # V方向节点矢量
    knot_vector_w = Column(JSON, nullable=True)  # W方向节点矢量（仅3D时使用）
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # 关系
    project = relationship("Project", back_populates="iga_geometries")
    patches = relationship("IGAPatch", back_populates="iga_geometry", cascade="all, delete-orphan")
    computations = relationship("Computation", back_populates="iga_geometry")

# IGA曲面片表
class IGAPatch(Base):
    __tablename__ = "iga_patches"
    
    id = Column(Integer, primary_key=True, index=True)
    iga_geometry_id = Column(Integer, ForeignKey("iga_geometries.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    patch_type = Column(String(50), default="nurbs")  # nurbs, t-spline等
    material_id = Column(Integer, nullable=True)  # 关联的材料ID
    boundary_conditions = Column(JSON, nullable=True)  # 边界条件
    created_at = Column(DateTime, default=func.now())
    
    # 关系
    iga_geometry = relationship("IGAGeometry", back_populates="patches")

# 几何模型表
class GeometryModel(Base):
    __tablename__ = "geometry_models"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String(100), nullable=False)
    model_type = Column(String(50), default="nurbs")  # nurbs, brep等
    control_points = Column(JSON, nullable=True)  # 控制点JSON
    weights = Column(JSON, nullable=True)  # 权重JSON
    knot_vectors = Column(JSON, nullable=True)  # 节点矢量JSON
    degree = Column(JSON, nullable=True)  # 阶次JSON
    file_path = Column(String(255), nullable=True)  # 几何文件路径
    created_at = Column(DateTime, default=func.now())
    
    # 关系
    project = relationship("Project")
    computations = relationship("Computation", back_populates="geometry_model")

# 计算任务表
class Computation(Base):
    __tablename__ = "computations"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"))
    geometry_model_id = Column(Integer, ForeignKey("geometry_models.id"), nullable=True)
    iga_geometry_id = Column(Integer, ForeignKey("iga_geometries.id"), nullable=True)
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
    use_iga = Column(Boolean, default=True)  # 是否使用IGA进行计算
    
    # 关系
    project = relationship("Project", back_populates="computations")
    geometry_model = relationship("GeometryModel", back_populates="computations")
    iga_geometry = relationship("IGAGeometry", back_populates="computations")
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
    control_point_values = Column(JSON, nullable=True)  # IGA控制点结果值
    
    # 关系
    computation = relationship("Computation", back_populates="results")

# 监测数据表
class MonitoringData(Base):
    """监测数据模型"""
    __tablename__ = "monitoring_data"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    monitoring_point_id = Column(String(50))
    # 位移、应力、水位等
    monitoring_type = Column(String(50))
    value = Column(Float)
    unit = Column(String(20))
    # 将保留名称metadata改为meta_info
    meta_info = Column(JSON)  # 其他元数据
    
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