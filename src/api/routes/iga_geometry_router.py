"""
@file iga_geometry_router.py
@description IGA几何建模的API路由
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import os
import json
from enum import Enum
import numpy as np
from datetime import datetime

from src.server.dependencies import get_db, validate_project_exists
from src.database.models import IGAGeometry, IGAPatch
from src.core.modeling.iga_terrain_modeler import IGATerrainModeler
from src.core.modeling.iga_support_modeler import IGASupportModeler

# 创建路由器
router = APIRouter(
    prefix="/api/iga-geometry",
    tags=["IGA Geometry"],
    responses={404: {"description": "Not found"}},
)

# 数据模型
class NURBSDegree(BaseModel):
    """NURBS基函数阶次"""
    u: int = Field(3, description="U方向阶次", ge=1, le=5)
    v: int = Field(3, description="V方向阶次", ge=1, le=5)
    w: Optional[int] = Field(None, description="W方向阶次(3D)", ge=1, le=5)

class NURBSSettings(BaseModel):
    """NURBS几何设置模型"""
    project_id: int = Field(..., description="项目ID")
    name: str = Field(..., description="模型名称")
    dimension: int = Field(2, description="维度(2或3)", ge=2, le=3)
    degree: NURBSDegree = Field(..., description="NURBS阶次")
    control_points_count: Dict[str, int] = Field(..., description="控制点数量")
    domain_size: Dict[str, float] = Field(..., description="域大小")

class ControlPointData(BaseModel):
    """控制点数据"""
    coordinates: List[List[float]] = Field(..., description="控制点坐标列表 [[x,y,z], ...]")
    weights: Optional[List[float]] = Field(None, description="权重列表")

class NURBSPatchData(BaseModel):
    """NURBS曲面片数据"""
    project_id: int = Field(..., description="项目ID")
    geometry_id: Optional[int] = Field(None, description="几何ID(用于更新)")
    name: str = Field(..., description="名称")
    dimension: int = Field(..., description="维度")
    degree: NURBSDegree = Field(..., description="阶次")
    control_points: ControlPointData = Field(..., description="控制点数据")
    knot_vectors: Dict[str, List[float]] = Field(..., description="节点矢量")

class GeometryResponse(BaseModel):
    """几何模型响应"""
    id: int
    name: str
    message: str
    geometry_info: Dict[str, Any] = Field(default_factory=dict)

class NURBSData(BaseModel):
    """NURBS数据模型"""
    dimension: int = Field(2, description="几何维度(2或3)")
    degree_u: int = Field(3, description="U方向阶次")
    degree_v: int = Field(3, description="V方向阶次")
    degree_w: Optional[int] = Field(None, description="W方向阶次(仅3D)")
    control_points: List[List[float]] = Field(..., description="控制点坐标")
    weights: Optional[List[float]] = Field(None, description="控制点权重")
    knot_vector_u: List[float] = Field(..., description="U方向节点矢量")
    knot_vector_v: List[float] = Field(..., description="V方向节点矢量")
    knot_vector_w: Optional[List[float]] = Field(None, description="W方向节点矢量(仅3D)")
    
class TerrainParams(BaseModel):
    """地形参数模型"""
    width: float = Field(100.0, description="宽度(X方向)")
    length: float = Field(100.0, description="长度(Y方向)")
    base_elevation: float = Field(-10.0, description="基准高程")
    num_control_points_u: int = Field(10, description="U方向控制点数量")
    num_control_points_v: int = Field(10, description="V方向控制点数量")
    degree_u: int = Field(3, description="U方向阶次")
    degree_v: int = Field(3, description="V方向阶次")
    features: Optional[List[Dict[str, Any]]] = Field(None, description="地形特征")

class TerrainFeature(BaseModel):
    """地形特征模型"""
    type: str = Field(..., description="特征类型(hill, excavation, etc)")
    parameters: Dict[str, Any] = Field(..., description="特征参数")

class IGAGeometryCreate(BaseModel):
    """IGA几何模型创建请求"""
    name: str = Field(..., description="几何名称")
    project_id: int = Field(..., description="所属项目ID")
    geometry_type: str = Field("nurbs", description="几何类型")
    nurbs_data: Optional[NURBSData] = Field(None, description="NURBS数据")
    terrain_params: Optional[TerrainParams] = Field(None, description="地形参数(自动生成时使用)")
    
class PatchCreate(BaseModel):
    """IGA几何片创建请求"""
    name: str = Field(..., description="片名称")
    patch_type: str = Field("nurbs", description="片类型")
    material_id: Optional[int] = Field(None, description="材料ID")
    boundary_conditions: Optional[Dict[str, Any]] = Field(None, description="边界条件")

class IGAGeometryResponse(BaseModel):
    """IGA几何模型响应"""
    id: int
    name: str
    project_id: int
    dimension: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True

class IGAGeometryDetailResponse(IGAGeometryResponse):
    """IGA几何模型详细响应"""
    nurbs_data: Dict[str, Any]
    patches: List[Dict[str, Any]]
    
    class Config:
        orm_mode = True

# 路由定义
@router.post("/", response_model=IGAGeometryResponse, status_code=status.HTTP_201_CREATED)
def create_iga_geometry(
    geometry: IGAGeometryCreate, 
    db: Session = Depends(get_db)
):
    """创建IGA几何模型"""
    try:
        # 创建IGA几何记录
        new_geometry = IGAGeometry(
            name=geometry.name,
            project_id=geometry.project_id,
            dimension=geometry.nurbs_data.dimension if geometry.nurbs_data else 2
        )
        
        # 如果提供了NURBS数据
        if geometry.nurbs_data:
            nurbs_data = geometry.nurbs_data
            new_geometry.degree_u = nurbs_data.degree_u
            new_geometry.degree_v = nurbs_data.degree_v
            new_geometry.degree_w = nurbs_data.degree_w
            new_geometry.control_points = nurbs_data.control_points
            new_geometry.weights = nurbs_data.weights or [1.0] * len(nurbs_data.control_points)
            new_geometry.knot_vector_u = nurbs_data.knot_vector_u
            new_geometry.knot_vector_v = nurbs_data.knot_vector_v
            new_geometry.knot_vector_w = nurbs_data.knot_vector_w
        
        # 如果提供了地形参数，自动生成地形
        elif geometry.terrain_params:
            params = geometry.terrain_params
            terrain_modeler = IGATerrainModeler()
            
            # 初始化平坦地形
            terrain_modeler.initialize_flat_terrain(
                domain_width=params.width,
                domain_length=params.length,
                degree_u=params.degree_u,
                degree_v=params.degree_v,
                num_control_points_u=params.num_control_points_u,
                num_control_points_v=params.num_control_points_v,
                base_elevation=params.base_elevation
            )
            
            # 添加地形特征
            if params.features:
                for feature in params.features:
                    if feature["type"] == "hill":
                        terrain_modeler.add_hill_feature(**feature["parameters"])
                    elif feature["type"] == "excavation":
                        terrain_modeler.add_excavation_feature(**feature["parameters"])
                    elif feature["type"] == "random":
                        terrain_modeler.add_random_perturbation(**feature["parameters"])
            
            # 获取NURBS数据
            nurbs_data = terrain_modeler.get_nurbs_data()
            
            # 更新几何对象
            new_geometry.dimension = 2
            new_geometry.degree_u = nurbs_data["degrees"]["u"]
            new_geometry.degree_v = nurbs_data["degrees"]["v"]
            new_geometry.control_points = nurbs_data["control_points"]
            new_geometry.weights = nurbs_data["weights"]
            new_geometry.knot_vector_u = nurbs_data["knot_vectors"]["u"]
            new_geometry.knot_vector_v = nurbs_data["knot_vectors"]["v"]
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="必须提供NURBS数据或地形参数"
            )
        
        # 保存到数据库
        db.add(new_geometry)
        db.commit()
        db.refresh(new_geometry)
        
        return new_geometry
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建IGA几何模型失败: {str(e)}"
        )

@router.get("/{geometry_id}", response_model=IGAGeometryDetailResponse)
def get_iga_geometry(geometry_id: int, db: Session = Depends(get_db)):
    """获取IGA几何模型详情"""
    geometry = db.query(IGAGeometry).filter(IGAGeometry.id == geometry_id).first()
    
    if not geometry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="IGA几何模型不存在"
        )
    
    # 获取曲面片信息
    patches = db.query(IGAPatch).filter(IGAPatch.iga_geometry_id == geometry_id).all()
    
    # 构建NURBS数据
    nurbs_data = {
        "dimension": geometry.dimension,
        "degrees": {
            "u": geometry.degree_u,
            "v": geometry.degree_v
        },
        "control_points": geometry.control_points,
        "weights": geometry.weights,
        "knot_vectors": {
            "u": geometry.knot_vector_u,
            "v": geometry.knot_vector_v
        }
    }
    
    if geometry.dimension == 3:
        nurbs_data["degrees"]["w"] = geometry.degree_w
        nurbs_data["knot_vectors"]["w"] = geometry.knot_vector_w
    
    # 构建响应
    response = {
        "id": geometry.id,
        "name": geometry.name,
        "project_id": geometry.project_id,
        "dimension": geometry.dimension,
        "created_at": geometry.created_at,
        "updated_at": geometry.updated_at,
        "nurbs_data": nurbs_data,
        "patches": [
            {
                "id": patch.id,
                "name": patch.name,
                "patch_type": patch.patch_type,
                "material_id": patch.material_id,
                "boundary_conditions": patch.boundary_conditions
            }
            for patch in patches
        ]
    }
    
    return response

@router.get("/", response_model=List[IGAGeometryResponse])
def list_iga_geometries(
    project_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """列出IGA几何模型"""
    query = db.query(IGAGeometry)
    
    if project_id is not None:
        query = query.filter(IGAGeometry.project_id == project_id)
    
    geometries = query.offset(skip).limit(limit).all()
    return geometries

@router.put("/{geometry_id}", response_model=IGAGeometryResponse)
def update_iga_geometry(
    geometry_id: int,
    update_data: Dict[str, Any] = Depends(Body(...)),
    db: Session = Depends(get_db)
):
    """更新IGA几何模型"""
    geometry = db.query(IGAGeometry).filter(IGAGeometry.id == geometry_id).first()
    
    if not geometry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="IGA几何模型不存在"
        )
    
    try:
        # 更新基本信息
        if "name" in update_data:
            geometry.name = update_data["name"]
        
        # 更新NURBS数据
        if "nurbs_data" in update_data:
            nurbs_data = update_data["nurbs_data"]
            
            if "control_points" in nurbs_data:
                geometry.control_points = nurbs_data["control_points"]
            
            if "weights" in nurbs_data:
                geometry.weights = nurbs_data["weights"]
            
            if "knot_vector_u" in nurbs_data:
                geometry.knot_vector_u = nurbs_data["knot_vector_u"]
                
            if "knot_vector_v" in nurbs_data:
                geometry.knot_vector_v = nurbs_data["knot_vector_v"]
                
            if "knot_vector_w" in nurbs_data and geometry.dimension == 3:
                geometry.knot_vector_w = nurbs_data["knot_vector_w"]
        
        # 更新时间戳
        geometry.updated_at = datetime.utcnow()
        
        db.commit()
        db.refresh(geometry)
        
        return geometry
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"更新IGA几何模型失败: {str(e)}"
        )

@router.delete("/{geometry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_iga_geometry(
    geometry_id: int,
    db: Session = Depends(get_db)
):
    """删除IGA几何模型"""
    geometry = db.query(IGAGeometry).filter(IGAGeometry.id == geometry_id).first()
    
    if not geometry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="IGA几何模型不存在"
        )
    
    try:
        db.delete(geometry)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除IGA几何模型失败: {str(e)}"
        )

@router.post("/{geometry_id}/patches", response_model=Dict[str, Any])
def add_patch(
    geometry_id: int,
    patch: PatchCreate,
    db: Session = Depends(get_db)
):
    """添加IGA曲面片"""
    geometry = db.query(IGAGeometry).filter(IGAGeometry.id == geometry_id).first()
    
    if not geometry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="IGA几何模型不存在"
        )
    
    try:
        new_patch = IGAPatch(
            iga_geometry_id=geometry_id,
            name=patch.name,
            patch_type=patch.patch_type,
            material_id=patch.material_id,
            boundary_conditions=patch.boundary_conditions
        )
        
        db.add(new_patch)
        db.commit()
        db.refresh(new_patch)
        
        return {
            "id": new_patch.id,
            "name": new_patch.name,
            "patch_type": new_patch.patch_type,
            "material_id": new_patch.material_id,
            "boundary_conditions": new_patch.boundary_conditions,
            "created_at": new_patch.created_at
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"添加IGA曲面片失败: {str(e)}"
        )

@router.get("/{geometry_id}/evaluate", response_model=Dict[str, Any])
def evaluate_nurbs_surface(
    geometry_id: int,
    resolution_u: int = Query(20, description="U方向评估点数"),
    resolution_v: int = Query(20, description="V方向评估点数"),
    db: Session = Depends(get_db)
):
    """评估NURBS曲面点"""
    geometry = db.query(IGAGeometry).filter(IGAGeometry.id == geometry_id).first()
    
    if not geometry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="IGA几何模型不存在"
        )
    
    try:
        # 创建临时地形建模器
        terrain_modeler = IGATerrainModeler()
        
        # 设置NURBS数据
        terrain_modeler.set_nurbs_data({
            "control_points": geometry.control_points,
            "weights": geometry.weights,
            "knot_vectors": {
                "u": geometry.knot_vector_u,
                "v": geometry.knot_vector_v
            },
            "degrees": {
                "u": geometry.degree_u,
                "v": geometry.degree_v
            }
        })
        
        # 评估曲面
        surface_points = terrain_modeler.evaluate_surface(resolution_u, resolution_v)
        
        # 转换为可JSON序列化格式
        surface_points = [list(point) for point in surface_points]
        
        return {
            "surface_points": surface_points,
            "resolution_u": resolution_u,
            "resolution_v": resolution_v
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"评估NURBS曲面失败: {str(e)}"
        ) 