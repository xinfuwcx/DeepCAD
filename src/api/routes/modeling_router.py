"""
@file modeling_router.py
@description 建模模块的API路由
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Body, status
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import numpy as np

from src.server.dependencies import get_db, get_modeling_engine, validate_project_exists
from src.core.modeling.models import ModelingEngine

# 创建路由器
router = APIRouter()

# 数据模型
class DomainCreate(BaseModel):
    """创建计算域请求模型"""
    width: float = Field(..., description="宽度(X方向，米)", gt=0)
    length: float = Field(..., description="长度(Y方向，米)", gt=0)
    total_depth: float = Field(..., description="总深度(Z方向，米)", gt=0)
    
class SoilLayer(BaseModel):
    """土层模型"""
    name: str = Field(..., description="土层名称")
    material_type: str = Field(..., description="材料类型")
    thickness: float = Field(..., description="厚度(米)", gt=0)
    properties: Dict[str, Any] = Field(default_factory=dict, description="材料属性")

class LayersCreate(BaseModel):
    """创建土层请求模型"""
    project_id: int = Field(..., description="项目ID")
    layers: List[SoilLayer] = Field(..., description="土层列表")

class ExcavationCreate(BaseModel):
    """创建基坑请求模型"""
    project_id: int = Field(..., description="项目ID")
    depth: float = Field(..., description="基坑深度(米)", gt=0)
    
class WallCreate(BaseModel):
    """创建地连墙请求模型"""
    project_id: int = Field(..., description="项目ID")
    thickness: float = Field(..., description="墙厚(米)", gt=0)
    depth: float = Field(..., description="墙深(米)", gt=0)
    
class TunnelCreate(BaseModel):
    """创建隧道请求模型"""
    project_id: int = Field(..., description="项目ID")
    diameter: float = Field(..., description="隧道直径(米)", gt=0)
    direction: str = Field(..., description="隧道方向", pattern="^(x|y)$")
    position_x: float = Field(..., description="X方向位置(米)")
    position_y: float = Field(..., description="Y方向位置(米)")
    position_z: float = Field(..., description="Z方向位置(米)")
    
class AnchorCreate(BaseModel):
    """创建预应力锚杆请求模型"""
    project_id: int = Field(..., description="项目ID")
    length: float = Field(..., description="锚杆长度(米)", gt=0)
    angle: float = Field(..., description="锚杆角度(度)")
    position_x: float = Field(..., description="X方向位置(米)")
    position_y: float = Field(..., description="Y方向位置(米)")
    position_z: float = Field(..., description="Z方向位置(米)")

class ModelResponse(BaseModel):
    """模型响应"""
    id: int
    message: str
    model_info: Dict[str, Any] = Field(default_factory=dict)

# 路由定义
@router.post("/domain", response_model=ModelResponse, summary="创建计算域")
async def create_domain(
    domain: DomainCreate,
    db: Session = Depends(get_db),
    engine: ModelingEngine = Depends(get_modeling_engine)
):
    """
    创建土体计算域
    
    - **width**: X方向宽度(米)
    - **length**: Y方向长度(米)
    - **total_depth**: Z方向总深度(米)
    """
    try:
        # 在实际实现中，这应该调用建模引擎创建域
        domain_id = 1  # 示例ID
        
        return ModelResponse(
            id=domain_id,
            message="计算域创建成功",
            model_info={
                "width": domain.width,
                "length": domain.length,
                "total_depth": domain.total_depth,
                "volume": domain.width * domain.length * domain.total_depth
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建计算域失败: {str(e)}"
        )

@router.post("/layers", response_model=ModelResponse, summary="添加土层")
async def add_soil_layers(
    layers: LayersCreate,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists),
    engine: ModelingEngine = Depends(get_modeling_engine)
):
    """
    添加土层到现有计算域
    
    - **project_id**: 项目ID
    - **layers**: 土层列表，每个包含名称、材料类型、厚度和属性
    """
    try:
        # 在实际实现中，这应该调用建模引擎添加土层
        return ModelResponse(
            id=layers.project_id,
            message=f"成功添加 {len(layers.layers)} 个土层",
            model_info={
                "layers": [
                    {
                        "name": layer.name,
                        "material_type": layer.material_type,
                        "thickness": layer.thickness
                    }
                    for layer in layers.layers
                ],
                "total_thickness": sum(layer.thickness for layer in layers.layers)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"添加土层失败: {str(e)}"
        )

@router.post("/import-dxf", response_model=ModelResponse, summary="导入DXF文件")
async def import_dxf(
    file: UploadFile = File(...),
    project_id: int = Query(..., description="项目ID"),
    db: Session = Depends(get_db),
    engine: ModelingEngine = Depends(get_modeling_engine)
):
    """
    导入DXF文件为基坑平面轮廓
    
    - **file**: DXF文件
    - **project_id**: 项目ID
    """
    try:
        # 验证文件类型
        if not file.filename.endswith('.dxf'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="只接受DXF文件"
            )
            
        # 在实际实现中，这应该调用建模引擎导入DXF
        return ModelResponse(
            id=project_id,
            message=f"成功导入DXF文件: {file.filename}",
            model_info={
                "filename": file.filename,
                "size": len(await file.read()),
                "contour_points": 0  # 实际实现中应返回轮廓点数
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导入DXF文件失败: {str(e)}"
        )

@router.post("/excavation", response_model=ModelResponse, summary="创建基坑")
async def create_excavation(
    excavation: ExcavationCreate,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists),
    engine: ModelingEngine = Depends(get_modeling_engine)
):
    """
    基于DXF轮廓创建基坑
    
    - **project_id**: 项目ID
    - **depth**: 基坑深度(米)
    """
    try:
        # 在实际实现中，这应该调用建模引擎创建基坑
        return ModelResponse(
            id=excavation.project_id,
            message=f"成功创建深度为 {excavation.depth} 米的基坑",
            model_info={
                "depth": excavation.depth,
                "volume": 0  # 实际实现中应计算体积
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建基坑失败: {str(e)}"
        )

@router.post("/wall", response_model=ModelResponse, summary="创建地连墙")
async def create_wall(
    wall: WallCreate,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists),
    engine: ModelingEngine = Depends(get_modeling_engine)
):
    """
    创建地连墙
    
    - **project_id**: 项目ID
    - **thickness**: 墙厚(米)
    - **depth**: 墙深(米)
    """
    try:
        # 在实际实现中，这应该调用建模引擎创建地连墙
        return ModelResponse(
            id=wall.project_id,
            message=f"成功创建厚度为 {wall.thickness} 米，深度为 {wall.depth} 米的地连墙",
            model_info={
                "thickness": wall.thickness,
                "depth": wall.depth,
                "area": 0  # 实际实现中应计算面积
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建地连墙失败: {str(e)}"
        )

@router.post("/tunnel", response_model=ModelResponse, summary="创建隧道")
async def create_tunnel(
    tunnel: TunnelCreate,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists),
    engine: ModelingEngine = Depends(get_modeling_engine)
):
    """
    创建隧道
    
    - **project_id**: 项目ID
    - **diameter**: 隧道直径(米)
    - **direction**: 隧道方向(x或y)
    - **position_x**: X方向位置(米)
    - **position_y**: Y方向位置(米)
    - **position_z**: Z方向位置(米)
    """
    try:
        # 在实际实现中，这应该调用建模引擎创建隧道
        return ModelResponse(
            id=tunnel.project_id,
            message=f"成功创建直径为 {tunnel.diameter} 米的隧道",
            model_info={
                "diameter": tunnel.diameter,
                "direction": tunnel.direction,
                "position": [tunnel.position_x, tunnel.position_y, tunnel.position_z]
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建隧道失败: {str(e)}"
        )

@router.post("/anchor", response_model=ModelResponse, summary="创建预应力锚杆")
async def create_anchor(
    anchor: AnchorCreate,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists),
    engine: ModelingEngine = Depends(get_modeling_engine)
):
    """
    创建预应力锚杆
    
    - **project_id**: 项目ID
    - **length**: 锚杆长度(米)
    - **angle**: 锚杆角度(度)
    - **position_x**: X方向位置(米)
    - **position_y**: Y方向位置(米)
    - **position_z**: Z方向位置(米)
    """
    try:
        # 在实际实现中，这应该调用建模引擎创建锚杆
        return ModelResponse(
            id=anchor.project_id,
            message=f"成功创建长度为 {anchor.length} 米的预应力锚杆",
            model_info={
                "length": anchor.length,
                "angle": anchor.angle,
                "position": [anchor.position_x, anchor.position_y, anchor.position_z]
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建预应力锚杆失败: {str(e)}"
        ) 