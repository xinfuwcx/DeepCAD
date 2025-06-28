"""
@file mesh_router.py
@description 网格划分模块的API路由
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import os
import json
from enum import Enum

from src.server.dependencies import get_db, get_mesh_engine, validate_project_exists
from src.core.meshing.models import MeshEngine
from src.core.meshing.gmsh_wrapper import GmshWrapper, FragmentType

# 创建路由器
router = APIRouter()

# 数据模型
class MeshAlgorithmEnum(str, Enum):
    """网格划分算法枚举"""
    DELAUNAY = "delaunay"
    FRONTAL = "frontal"
    FRONTAL_DELAUNAY = "frontal-delaunay"
    MESHADAPT = "meshadapt"

class FragmentTypeEnum(str, Enum):
    """网格片段类型枚举"""
    BOX = "box"
    SPHERE = "sphere"
    CYLINDER = "cylinder"
    PLANE = "plane"
    CUSTOM = "custom"

class MeshSettings(BaseModel):
    """网格划分设置模型"""
    project_id: int = Field(..., description="项目ID")
    element_size: float = Field(..., description="全局网格尺寸(米)", gt=0)
    algorithm: MeshAlgorithmEnum = Field(MeshAlgorithmEnum.DELAUNAY, description="网格划分算法")
    order: int = Field(2, description="单元阶数", ge=1, le=2)
    min_size: Optional[float] = Field(None, description="最小网格尺寸(米)", gt=0)
    refinement_regions: Optional[List[Dict[str, Any]]] = Field(None, description="局部加密区域")
    boundary_layer: Optional[bool] = Field(False, description="是否添加边界层网格")
    optimize_steps: Optional[int] = Field(10, description="优化步数", ge=0)
    dimension: Optional[int] = Field(3, description="网格维度", ge=1, le=3)

class FragmentSettings(BaseModel):
    """网格片段设置模型"""
    project_id: int = Field(..., description="项目ID")
    mesh_id: Optional[int] = Field(None, description="网格ID")
    fragment_type: FragmentTypeEnum = Field(..., description="片段类型")
    location: List[float] = Field(..., description="位置坐标", min_items=3, max_items=3)
    size: float = Field(..., description="局部网格尺寸", gt=0)
    params: Optional[Dict[str, Any]] = Field(None, description="附加参数")

class MeshResponse(BaseModel):
    """网格响应模型"""
    id: int
    message: str
    mesh_info: Dict[str, Any] = Field(default_factory=dict)

class FragmentResponse(BaseModel):
    """网格片段响应模型"""
    id: int
    project_id: int
    mesh_id: Optional[int]
    message: str
    fragment_info: Dict[str, Any] = Field(default_factory=dict)

# 路由定义
@router.post("/generate", response_model=MeshResponse, summary="生成网格")
async def generate_mesh(
    settings: MeshSettings,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists),
    engine: MeshEngine = Depends(get_mesh_engine)
):
    """
    为模型生成有限元网格
    
    - **project_id**: 项目ID
    - **element_size**: 全局网格尺寸(米)
    - **algorithm**: 网格划分算法(默认为delaunay)
    - **order**: 单元阶数(1或2，默认为2)
    - **min_size**: 最小网格尺寸(米，可选)
    - **refinement_regions**: 局部加密区域(可选)
    - **boundary_layer**: 是否添加边界层网格(可选)
    - **optimize_steps**: 优化步数(默认为10)
    - **dimension**: 网格维度(1, 2或3，默认为3)
    """
    try:
        # 获取模型数据
        model_data = {
            "project_id": settings.project_id,
            "width": 10,  # 示例值，实际应从数据库获取
            "length": 10,
            "total_depth": 10
        }
        
        # 生成网格
        success, mesh_info = engine.generate_mesh(
            model_data=model_data,
            element_size=settings.element_size,
            algorithm=settings.algorithm.value,
            order=settings.order,
            min_size=settings.min_size,
            refinement_regions=settings.refinement_regions,
            boundary_layer=settings.boundary_layer
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="网格生成失败"
            )
        
        return MeshResponse(
            id=mesh_info["id"],
            message="网格生成成功",
            mesh_info=mesh_info
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"网格生成失败: {str(e)}"
        )

@router.post("/fragment", response_model=FragmentResponse, summary="添加网格片段")
async def add_mesh_fragment(
    settings: FragmentSettings,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists)
):
    """
    添加网格片段，用于局部细化网格
    
    - **project_id**: 项目ID
    - **mesh_id**: 网格ID(可选，如果提供则在现有网格上添加片段)
    - **fragment_type**: 片段类型(box, sphere, cylinder, plane, custom)
    - **location**: 位置坐标[x, y, z]
    - **size**: 局部网格尺寸
    - **params**: 附加参数，根据片段类型不同而不同
    """
    try:
        # 创建Gmsh包装器
        gmsh_wrapper = GmshWrapper()
        
        # 根据参数添加片段
        fragment_type = FragmentType(settings.fragment_type.value)
        fragment_id = gmsh_wrapper.add_fragment_mesh_field(
            fragment_type=fragment_type,
            location=settings.location,
            size=settings.size,
            params=settings.params
        )
        
        # 获取片段信息
        fragment_info = {
            "id": fragment_id,
            "type": settings.fragment_type.value,
            "location": settings.location,
            "size": settings.size
        }
        
        if settings.params:
            fragment_info["params"] = settings.params
        
        return FragmentResponse(
            id=fragment_id,
            project_id=settings.project_id,
            mesh_id=settings.mesh_id,
            message="添加网格片段成功",
            fragment_info=fragment_info
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"添加网格片段失败: {str(e)}"
        )

@router.get("/{mesh_id}", response_model=MeshResponse, summary="获取网格信息")
async def get_mesh_info(
    mesh_id: int,
    db: Session = Depends(get_db),
    engine: MeshEngine = Depends(get_mesh_engine)
):
    """
    获取指定ID的网格信息
    
    - **mesh_id**: 网格ID
    """
    try:
        # 获取网格信息
        mesh_info = engine.get_mesh_info(mesh_id)
        
        if not mesh_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"网格ID {mesh_id} 不存在"
            )
            
        return MeshResponse(
            id=mesh_id,
            message="获取网格信息成功",
            mesh_info=mesh_info
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取网格信息失败: {str(e)}"
        )

@router.put("/{mesh_id}/refine", response_model=MeshResponse, summary="优化网格")
async def refine_mesh(
    mesh_id: int,
    settings: MeshSettings,
    db: Session = Depends(get_db),
    engine: MeshEngine = Depends(get_mesh_engine)
):
    """
    优化指定ID的网格
    
    - **mesh_id**: 网格ID
    - **settings**: 优化设置
    """
    try:
        # 优化网格
        success, mesh_info = engine.refine_mesh(
            mesh_id=mesh_id,
            element_size=settings.element_size,
            algorithm=settings.algorithm.value,
            order=settings.order,
            min_size=settings.min_size,
            refinement_regions=settings.refinement_regions,
            boundary_layer=settings.boundary_layer
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="网格优化失败"
            )
        
        return MeshResponse(
            id=mesh_id,
            message="网格优化成功",
            mesh_info=mesh_info
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"网格优化失败: {str(e)}"
        )

@router.post("/import", response_model=MeshResponse, summary="导入网格文件")
async def import_mesh(
    project_id: int = Form(...),
    mesh_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    导入网格文件
    
    - **project_id**: 项目ID
    - **mesh_file**: 网格文件(.msh, .vtk等)
    """
    try:
        # 检查文件格式
        filename = mesh_file.filename
        file_ext = os.path.splitext(filename)[1].lower()
        
        allowed_exts = [".msh", ".vtk", ".unv", ".med"]
        if file_ext not in allowed_exts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的文件格式，允许的格式: {', '.join(allowed_exts)}"
            )
        
        # 保存文件到临时位置
        content = await mesh_file.read()
        upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))),
                                 "data", "mesh")
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, f"project_{project_id}_{filename}")
        with open(file_path, "wb") as f:
            f.write(content)
            
        # 在实际实现中，这里应该解析网格文件获取节点和单元信息
        # 这里只是模拟返回结果
        
        # 创建网格ID
        mesh_id = project_id  # 示例值
        
        # 模拟网格信息
        mesh_info = {
            "id": mesh_id,
            "file_path": file_path,
            "file_name": filename,
            "file_format": file_ext[1:],
            "node_count": 5000,  # 示例值
            "element_count": 10000  # 示例值
        }
        
        return MeshResponse(
            id=mesh_id,
            message=f"网格文件 {filename} 导入成功",
            mesh_info=mesh_info
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"网格文件导入失败: {str(e)}"
        )

@router.get("/{mesh_id}/export", summary="导出网格文件")
async def export_mesh(
    mesh_id: int,
    format: str = "msh",
    db: Session = Depends(get_db),
    engine: MeshEngine = Depends(get_mesh_engine)
):
    """
    导出指定ID的网格
    
    - **mesh_id**: 网格ID
    - **format**: 导出格式(默认为msh)
    """
    try:
        # 导出网格
        file_path = engine.export_mesh(mesh_id, format)
        
        if not file_path:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="网格导出失败"
            )
        
        # 在实际实现中，这里应该返回文件下载链接或文件内容
        # 这里只是返回文件路径
        return {
            "message": f"网格导出成功，格式: {format}",
            "file_path": file_path
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"网格导出失败: {str(e)}"
        )

@router.get("/fragments/{project_id}", response_model=List[FragmentResponse], summary="获取项目的网格片段列表")
async def get_project_fragments(
    project_id: int,
    db: Session = Depends(get_db)
):
    """
    获取项目的网格片段列表
    
    - **project_id**: 项目ID
    """
    try:
        # 在实际实现中，这里应该从数据库获取项目的网格片段列表
        # 这里只是模拟返回结果
        fragments = [
            FragmentResponse(
                id=1,
                project_id=project_id,
                mesh_id=project_id,
                message="",
                fragment_info={
                    "id": 1,
                    "type": "box",
                    "location": [0, 0, -5],
                    "size": 0.5,
                    "params": {
                        "width": 10,
                        "length": 10,
                        "height": 5,
                        "transition": 0.3
                    }
                }
            ),
            FragmentResponse(
                id=2,
                project_id=project_id,
                mesh_id=project_id,
                message="",
                fragment_info={
                    "id": 2,
                    "type": "sphere",
                    "location": [5, 5, -2],
                    "size": 0.2,
                    "params": {
                        "radius": 2,
                        "transition": 0.3
                    }
                }
            )
        ]
        
        return fragments
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取网格片段列表失败: {str(e)}"
        )

@router.delete("/fragments/{fragment_id}", response_model=Dict[str, str], summary="删除网格片段")
async def delete_fragment(
    fragment_id: int,
    db: Session = Depends(get_db)
):
    """
    删除指定ID的网格片段
    
    - **fragment_id**: 片段ID
    """
    try:
        # 在实际实现中，这里应该从数据库删除网格片段
        # 这里只是模拟返回结果
        return {
            "message": f"网格片段 {fragment_id} 删除成功"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除网格片段失败: {str(e)}"
        )