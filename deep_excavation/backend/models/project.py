"""
项目模型定义
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, ForeignKey, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

from .user import Base

class Project(Base):
    """项目数据库模型"""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)
    description = Column(Text)
    location = Column(String(200))
    project_type = Column(String(50))
    status = Column(String(20), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

    # 项目配置，存储为JSON
    config = Column(JSON)
    
    # 关联
    owner = relationship("User", back_populates="projects")
    models = relationship("SeepageModel", back_populates="project", cascade="all, delete-orphan")


class SeepageModel(Base):
    """渗流分析模型数据库模型"""
    __tablename__ = "seepage_models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), index=True)
    description = Column(Text)
    status = Column(String(20), default="draft")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 关联到项目
    project_id = Column(Integer, ForeignKey("projects.id"))
    project = relationship("Project", back_populates="models")
    
    # 模型数据，存储为JSON
    soil_layers = Column(JSON)
    boundary_conditions = Column(JSON)
    mesh_config = Column(JSON)
    analysis_config = Column(JSON)
    
    # 结果
    results = relationship("SeepageResult", back_populates="model", uselist=False, cascade="all, delete-orphan")


class SeepageResult(Base):
    """渗流分析结果数据库模型"""
    __tablename__ = "seepage_results"

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("seepage_models.id"), unique=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="pending")
    
    # 存储计算结果，可能很大
    head_data = Column(JSON)
    pressure_data = Column(JSON)
    velocity_data = Column(JSON)
    flow_rate = Column(Float)
    
    # 安全评估指标
    safety_factor = Column(Float)
    gradient_ratio = Column(Float)
    
    # 关联到模型
    model = relationship("SeepageModel", back_populates="results")


# Pydantic模型，用于API请求和响应

class ProjectBase(BaseModel):
    """项目基础模型"""
    name: str
    description: Optional[str] = None
    location: Optional[str] = None
    project_type: Optional[str] = None


class ProjectCreate(ProjectBase):
    """项目创建请求模型"""
    pass


class ProjectUpdate(BaseModel):
    """项目更新请求模型"""
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    project_type: Optional[str] = None
    status: Optional[str] = None


class ProjectResponse(ProjectBase):
    """项目响应模型"""
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    user_id: int

    class Config:
        orm_mode = True


class SeepageModelBase(BaseModel):
    """渗流模型基础模型"""
    name: str
    description: Optional[str] = None
    soil_layers: Optional[List[Dict[str, Any]]] = None
    boundary_conditions: Optional[List[Dict[str, Any]]] = None
    mesh_config: Optional[Dict[str, Any]] = None
    analysis_config: Optional[Dict[str, Any]] = None


class SeepageModelCreate(SeepageModelBase):
    """渗流模型创建请求模型"""
    project_id: int


class SeepageModelUpdate(BaseModel):
    """渗流模型更新请求模型"""
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    soil_layers: Optional[List[Dict[str, Any]]] = None
    boundary_conditions: Optional[List[Dict[str, Any]]] = None
    mesh_config: Optional[Dict[str, Any]] = None
    analysis_config: Optional[Dict[str, Any]] = None


class SeepageModelResponse(SeepageModelBase):
    """渗流模型响应模型"""
    id: int
    status: str
    created_at: datetime
    updated_at: datetime
    project_id: int

    class Config:
        orm_mode = True


class SeepageResultBase(BaseModel):
    """渗流结果基础模型"""
    status: str
    flow_rate: Optional[float] = None
    safety_factor: Optional[float] = None
    gradient_ratio: Optional[float] = None


class SeepageResultResponse(SeepageResultBase):
    """渗流结果响应模型"""
    id: int
    model_id: int
    timestamp: datetime

    class Config:
        orm_mode = True 