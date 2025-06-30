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
import shutil
from pathlib import Path

from src.server.dependencies import get_db, get_mesh_engine, validate_project_exists
from src.core.meshing.models import MeshEngine
from src.core.meshing.gmsh_wrapper import GmshWrapper, FragmentType
from src.core.meshing.netgen_reader import NetgenReader

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

class NetgenMeshImportSettings(BaseModel):
    """Netgen网格导入设置"""
    project_id: int = Field(..., description="项目ID")
    convert_units: Optional[float] = Field(1.0, description="单位转换系数")
    coordinate_system: Optional[str] = Field("cartesian", description="坐标系")
    merge_tolerance: Optional[float] = Field(1e-6, description="合并公差")
    auto_detect_physical_groups: Optional[bool] = Field(True, description="自动检测物理组")

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
    导入一般网格文件
    
    - **project_id**: 项目ID
    - **mesh_file**: 网格文件
    """
    try:
        # 创建临时文件
        temp_file = f"temp_{mesh_file.filename}"
        with open(temp_file, "wb") as f:
            content = await mesh_file.read()
            f.write(content)
        
        # 导入网格
        mesh_id = 1  # 实际应该从数据库分配
        
        # 获取网格信息
        mesh_info = {
            "id": mesh_id,
            "filename": mesh_file.filename,
            "size": len(content),
            "format": os.path.splitext(mesh_file.filename)[1][1:]
        }
        
        # 清理临时文件
        os.remove(temp_file)
        
        return MeshResponse(
            id=mesh_id,
            message="网格导入成功",
            mesh_info=mesh_info
        )
    except Exception as e:
        # 确保清理临时文件
        if os.path.exists(temp_file):
            os.remove(temp_file)
            
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"网格导入失败: {str(e)}"
        )

@router.post("/import-netgen", response_model=MeshResponse, summary="导入Netgen网格文件")
async def import_netgen_mesh(
    settings: NetgenMeshImportSettings = Depends(),
    mesh_file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    导入Netgen格式的网格文件(.vol或.vtk)
    
    - **project_id**: 项目ID
    - **mesh_file**: Netgen网格文件(.vol或.vtk格式)
    - **convert_units**: 单位转换系数(默认为1.0)
    - **coordinate_system**: 坐标系(默认为cartesian)
    - **merge_tolerance**: 合并公差(默认为1e-6)
    - **auto_detect_physical_groups**: 是否自动检测物理组(默认为True)
    """
    # 验证文件扩展名
    file_ext = os.path.splitext(mesh_file.filename)[1].lower()
    if file_ext not in ['.vol', '.vtk']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的文件格式，仅支持.vol或.vtk格式的Netgen网格文件"
        )
    
    # 创建上传目录
    upload_dir = Path("data/uploads/mesh")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # 生成唯一文件名
    import uuid
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = upload_dir / unique_filename
    
    try:
        # 保存上传文件
        with open(file_path, "wb") as f:
            content = await mesh_file.read()
            f.write(content)
        
        # 创建Netgen读取器并解析网格
        reader = NetgenReader()
        if not reader.read_mesh_file(str(file_path)):
            raise Exception("无法读取网格文件")
        
        # 获取网格信息
        nodes = reader.get_nodes()
        elements = reader.get_elements()
        physical_groups = reader.get_physical_groups()
        
        # 生成网格ID和网格信息
        mesh_id = 1  # 实际应该从数据库分配
        mesh_info = {
            "id": mesh_id,
            "project_id": settings.project_id,
            "filename": mesh_file.filename,
            "stored_path": str(file_path),
            "node_count": len(nodes),
            "element_count": len(elements),
            "physical_groups": list(physical_groups.keys()),
            "dimension": reader.mesh_data.get("dimension", 3),
            "import_settings": {
                "convert_units": settings.convert_units,
                "coordinate_system": settings.coordinate_system
            }
        }
        
        # TODO: 将网格信息保存到数据库
        
        return MeshResponse(
            id=mesh_id,
            message="Netgen网格导入成功",
            mesh_info=mesh_info
        )
    except Exception as e:
        # 清理上传文件
        if file_path.exists():
            file_path.unlink()
            
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Netgen网格导入失败: {str(e)}"
        )

@router.get("/{mesh_id}/export", summary="导出网格文件")
async def export_mesh(
    mesh_id: int,
    format: str = "msh",
    db: Session = Depends(get_db),
    engine: MeshEngine = Depends(get_mesh_engine)
):
    """
    导出指定ID的网格文件
    
    - **mesh_id**: 网格ID
    - **format**: 导出格式(msh, vtk, unv)
    """
    try:
        # 导出网格
        mesh_file = engine.export_mesh(mesh_id, format)
        
        if not os.path.exists(mesh_file):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"网格文件未找到"
            )
            
        # 返回文件名
        return {"file_path": mesh_file}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出网格文件失败: {str(e)}"
        )

@router.get("/fragments/{project_id}", response_model=List[FragmentResponse], summary="获取项目的网格片段列表")
async def get_project_fragments(
    project_id: int,
    db: Session = Depends(get_db)
):
    """
    获取指定项目的网格片段列表
    
    - **project_id**: 项目ID
    """
    try:
        # 实际应该从数据库查询
        fragments = [
            {
                "id": 1,
                "project_id": project_id,
                "mesh_id": 1,
                "message": "网格片段1",
                "fragment_info": {
                    "id": 1,
                    "type": "box",
                    "location": [0, 0, 0],
                    "size": 0.5
                }
            },
            {
                "id": 2,
                "project_id": project_id,
                "mesh_id": 1,
                "message": "网格片段2",
                "fragment_info": {
                    "id": 2,
                    "type": "sphere",
                    "location": [10, 10, -5],
                    "size": 0.3
                }
            }
        ]
        
        return [FragmentResponse(**fragment) for fragment in fragments]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取网格片段列表失败: {str(e)}"
        )

@router.get("/netgen/{mesh_id}", response_model=Dict[str, Any], summary="获取Netgen网格详细信息")
async def get_netgen_mesh_details(
    mesh_id: int,
    db: Session = Depends(get_db)
):
    """
    获取指定ID的Netgen网格详细信息，包括物理组和统计数据
    
    - **mesh_id**: 网格ID
    """
    try:
        # 从数据库获取网格文件路径
        # 实际应该查询数据库
        mesh_file = f"data/uploads/mesh/mesh_{mesh_id}.vtk"
        
        if not os.path.exists(mesh_file):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"网格文件未找到"
            )
            
        # 创建Netgen读取器并解析网格
        reader = NetgenReader()
        if not reader.read_mesh_file(mesh_file):
            raise Exception("无法读取网格文件")
        
        # 获取物理组和统计信息
        nodes = reader.get_nodes()
        elements = reader.get_elements()
        physical_groups = reader.get_physical_groups()
        
        # 统计每种类型的单元数量
        element_types = {}
        for elem in elements:
            elem_type = elem["type"]
            if elem_type in element_types:
                element_types[elem_type] += 1
            else:
                element_types[elem_type] = 1
        
        # 统计每个物理组中的单元数量
        group_statistics = {}
        for group_name, group_data in physical_groups.items():
            group_statistics[group_name] = {
                "element_count": len(group_data.get("elements", [])),
                "dimension": group_data.get("dimension", 3)
            }
        
        # 构建详细信息
        mesh_details = {
            "id": mesh_id,
            "node_count": len(nodes),
            "element_count": len(elements),
            "element_types": element_types,
            "physical_groups": group_statistics,
            "bounding_box": {
                "min": [
                    min([n[0] for n in nodes]) if nodes else 0,
                    min([n[1] for n in nodes]) if nodes else 0,
                    min([n[2] for n in nodes]) if nodes else 0
                ],
                "max": [
                    max([n[0] for n in nodes]) if nodes else 0,
                    max([n[1] for n in nodes]) if nodes else 0,
                    max([n[2] for n in nodes]) if nodes else 0
                ]
            }
        }
        
        return mesh_details
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取Netgen网格详细信息失败: {str(e)}"
        )

@router.delete("/fragments/{fragment_id}", response_model=Dict[str, str], summary="删除网格片段")
async def delete_fragment(
    fragment_id: int,
    db: Session = Depends(get_db)
):
    """
    删除指定ID的网格片段
    
    - **fragment_id**: 网格片段ID
    """
    try:
        # 删除网格片段
        # 实际应该从数据库删除
        
        return {"message": f"成功删除网格片段 {fragment_id}"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"删除网格片段失败: {str(e)}"
        )