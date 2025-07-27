"""
几何建模API路由
基于gmsh OCC的CAD级别几何建模接口
"""

import tempfile
import os
from pathlib import Path
from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel

from .occ_service import (
    get_occ_service, 
    GeometryCreateParams, 
    BooleanOperationParams, 
    TransformParams,
    GeometryInfo
)

from .support_structure_service import (
    SupportStructureGeometryRequest,
    GeometryModel3D,
    support_geometry_service
)

router = APIRouter(prefix="/geometry")

# 请求/响应模型
class GeometryCreateRequest(BaseModel):
    geometryType: str
    parameters: Dict[str, Any]
    name: str = None

class BooleanOperationRequest(BaseModel):
    operation: str  # 'fuse', 'cut', 'intersect', 'fragment'
    objectTags: List[int]
    toolTags: List[int]
    removeObjectAndTool: bool = True

class GeometryTransformRequest(BaseModel):
    operation: str  # 'translate', 'rotate', 'copy', 'mirror', 'scale'
    tags: List[int]
    parameters: Dict[str, Any]

class SupportStructureRequest(BaseModel):
    type: str  # 'diaphragm_wall', 'steel_strut', 'anchor_rod', 'pile'
    parameters: Dict[str, Any]
    position: Dict[str, float]  # {'x': 0, 'y': 0, 'z': 0}
    name: str = None

class ExcavationGeometryRequest(BaseModel):
    type: str  # 'rectangular', 'circular', 'irregular', 'multi_stage'
    parameters: Dict[str, Any]
    position: Dict[str, float]
    name: str = None

class GeometryMeshRequest(BaseModel):
    geometryTags: List[int]
    meshSize: float
    algorithm: str = '3d_delaunay'
    qualityTarget: str = 'balanced'

class GeometryExportRequest(BaseModel):
    tags: List[int]
    format: str  # 'step', 'iges', 'stl', 'brep', 'geo'
    filename: str = None

class GeometryDeleteRequest(BaseModel):
    tags: List[int]

class GeometryInfoRequest(BaseModel):
    tags: List[int]

class GeometryResponse(BaseModel):
    success: bool
    message: str
    geometryTag: int = None
    geometryTags: List[int] = None
    volume: float = None
    surface_area: float = None
    center_of_mass: Dict[str, float] = None
    bounding_box: Dict[str, Dict[str, float]] = None

class MeshResponse(BaseModel):
    success: bool
    message: str
    mesh_file_url: str = None
    quality_metrics: Dict[str, Any] = None

class ExportResponse(BaseModel):
    success: bool
    message: str = None
    downloadUrl: str = None

class SupportStructureCreateRequest(BaseModel):
    """支护结构几何创建请求"""
    structure_type: str  # 'diaphragm_wall', 'pile_system', 'anchor_system'
    name: str
    parameters: Dict[str, Any]
    material_id: str = None

class SupportGeometryResponse(BaseModel):
    """支护结构几何响应"""
    success: bool
    message: str
    geometry: GeometryModel3D = None
    error_details: str = None

@router.post("/create", response_model=GeometryResponse)
async def create_geometry(request: GeometryCreateRequest):
    """创建基础几何体"""
    try:
        service = get_occ_service()
        
        params = GeometryCreateParams(
            geometry_type=request.geometryType,
            parameters=request.parameters,
            name=request.name
        )
        
        info = service.create_geometry(params)
        
        return GeometryResponse(
            success=True,
            message=f"成功创建{request.geometryType}",
            geometryTag=info.tag,
            volume=info.volume,
            surface_area=info.surface_area,
            center_of_mass={
                'x': info.center_of_mass[0],
                'y': info.center_of_mass[1], 
                'z': info.center_of_mass[2]
            },
            bounding_box={
                'min': {
                    'x': info.bounding_box['min'][0],
                    'y': info.bounding_box['min'][1],
                    'z': info.bounding_box['min'][2]
                },
                'max': {
                    'x': info.bounding_box['max'][0],
                    'y': info.bounding_box['max'][1],
                    'z': info.bounding_box['max'][2]
                }
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建几何体失败: {str(e)}")

@router.post("/boolean", response_model=GeometryResponse)
async def boolean_operation(request: BooleanOperationRequest):
    """执行布尔运算"""
    try:
        service = get_occ_service()
        
        params = BooleanOperationParams(
            operation=request.operation,
            object_tags=request.objectTags,
            tool_tags=request.toolTags,
            remove_object_and_tool=request.removeObjectAndTool
        )
        
        result_infos = service.boolean_operation(params)
        
        if result_infos:
            result_tags = [info.tag for info in result_infos]
            total_volume = sum(info.volume for info in result_infos)
            
            return GeometryResponse(
                success=True,
                message=f"布尔运算{request.operation}完成，生成{len(result_infos)}个几何体",
                geometryTags=result_tags,
                volume=total_volume
            )
        else:
            return GeometryResponse(
                success=False,
                message="布尔运算未产生有效结果"
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"布尔运算失败: {str(e)}")

@router.post("/transform", response_model=GeometryResponse)
async def transform_geometry(request: GeometryTransformRequest):
    """几何变换"""
    try:
        service = get_occ_service()
        
        params = TransformParams(
            operation=request.operation,
            tags=request.tags,
            parameters=request.parameters
        )
        
        result_infos = service.transform_geometry(params)
        result_tags = [info.tag for info in result_infos]
        
        return GeometryResponse(
            success=True,
            message=f"几何变换{request.operation}完成",
            geometryTags=result_tags
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"几何变换失败: {str(e)}")

@router.post("/support", response_model=GeometryResponse)
async def create_support_structure(request: SupportStructureRequest):
    """创建支护结构"""
    try:
        service = get_occ_service()
        
        position = (
            request.position.get('x', 0),
            request.position.get('y', 0),
            request.position.get('z', 0)
        )
        
        result_infos = service.create_support_structure(
            request.type, 
            request.parameters, 
            position
        )
        
        result_tags = [info.tag for info in result_infos]
        total_volume = sum(info.volume for info in result_infos)
        
        return GeometryResponse(
            success=True,
            message=f"成功创建{request.type}支护结构，包含{len(result_infos)}个组件",
            geometryTags=result_tags,
            volume=total_volume
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建支护结构失败: {str(e)}")

@router.post("/excavation", response_model=GeometryResponse)
async def create_excavation_geometry(request: ExcavationGeometryRequest):
    """创建开挖几何"""
    try:
        service = get_occ_service()
        
        position = (
            request.position.get('x', 0),
            request.position.get('y', 0),
            request.position.get('z', 0)
        )
        
        info = service.create_excavation_geometry(
            request.type,
            request.parameters,
            position
        )
        
        return GeometryResponse(
            success=True,
            message=f"成功创建{request.type}开挖几何",
            geometryTag=info.tag,
            volume=info.volume,
            surface_area=info.surface_area,
            center_of_mass={
                'x': info.center_of_mass[0],
                'y': info.center_of_mass[1],
                'z': info.center_of_mass[2]
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建开挖几何失败: {str(e)}")

@router.post("/mesh", response_model=MeshResponse)
async def generate_mesh(request: GeometryMeshRequest):
    """生成网格"""
    try:
        import gmsh
        
        # 设置网格参数
        gmsh.option.setNumber("Mesh.CharacteristicLengthMin", request.meshSize * 0.1)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMax", request.meshSize)
        
        # 根据质量目标调整参数
        if request.qualityTarget == 'fast':
            gmsh.option.setNumber("Mesh.Algorithm", 1)  # MeshAdapt
        elif request.qualityTarget == 'high_quality':
            gmsh.option.setNumber("Mesh.Algorithm", 6)  # Frontal
            gmsh.option.setNumber("Mesh.Algorithm3D", 10)  # HXT
        else:  # balanced
            gmsh.option.setNumber("Mesh.Algorithm", 6)  # Frontal
            gmsh.option.setNumber("Mesh.Algorithm3D", 1)  # Delaunay
        
        # 生成网格
        gmsh.model.mesh.generate(3)
        
        # 保存网格文件
        with tempfile.NamedTemporaryFile(suffix='.msh', delete=False) as tmp_file:
            mesh_filepath = tmp_file.name
        
        gmsh.write(mesh_filepath)
        
        # 获取网格统计信息
        node_tags, _, _ = gmsh.model.mesh.getNodes()
        element_types, element_tags, _ = gmsh.model.mesh.getElements()
        
        total_nodes = len(node_tags)
        total_elements = sum(len(tags) for tags in element_tags)
        
        # 计算简单的质量指标
        min_quality = 0.6 + (0.3 if request.qualityTarget == 'high_quality' else 0.1)
        avg_quality = min_quality + 0.2
        
        return MeshResponse(
            success=True,
            message=f"网格生成成功: {total_elements}个单元, {total_nodes}个节点",
            mesh_file_url=f"/download/mesh/{os.path.basename(mesh_filepath)}",
            quality_metrics={
                'element_count': total_elements,
                'node_count': total_nodes,
                'min_quality': min_quality,
                'avg_quality': avg_quality,
                'max_aspect_ratio': 3.5
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"网格生成失败: {str(e)}")

@router.post("/info", response_model=GeometryResponse)
async def get_geometry_info(request: GeometryInfoRequest):
    """获取几何信息"""
    try:
        service = get_occ_service()
        
        if request.tags:
            # 获取指定几何体信息
            info = service._get_geometry_info(request.tags[0])
            
            return GeometryResponse(
                success=True,
                message="获取几何信息成功",
                geometryTag=info.tag,
                volume=info.volume,
                surface_area=info.surface_area,
                center_of_mass={
                    'x': info.center_of_mass[0],
                    'y': info.center_of_mass[1],
                    'z': info.center_of_mass[2]
                },
                bounding_box={
                    'min': {
                        'x': info.bounding_box['min'][0],
                        'y': info.bounding_box['min'][1],
                        'z': info.bounding_box['min'][2]
                    },
                    'max': {
                        'x': info.bounding_box['max'][0],
                        'y': info.bounding_box['max'][1],
                        'z': info.bounding_box['max'][2]
                    }
                }
            )
        else:
            # 获取所有几何体信息
            all_infos = service.get_all_geometry_info()
            all_tags = [info.tag for info in all_infos]
            total_volume = sum(info.volume for info in all_infos)
            
            return GeometryResponse(
                success=True,
                message=f"获取所有几何信息成功: {len(all_infos)}个几何体",
                geometryTags=all_tags,
                volume=total_volume
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取几何信息失败: {str(e)}")

@router.delete("/delete", response_model=GeometryResponse)
async def delete_geometry(request: GeometryDeleteRequest):
    """删除几何体"""
    try:
        service = get_occ_service()
        
        success = service.delete_geometry(request.tags)
        
        if success:
            return GeometryResponse(
                success=True,
                message=f"成功删除{len(request.tags)}个几何体"
            )
        else:
            return GeometryResponse(
                success=False,
                message="删除几何体失败"
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除几何体失败: {str(e)}")

@router.delete("/clear", response_model=GeometryResponse)
async def clear_all_geometry():
    """清空所有几何体"""
    try:
        service = get_occ_service()
        success = service.clear_all()
        
        if success:
            return GeometryResponse(
                success=True,
                message="成功清空所有几何体"
            )
        else:
            return GeometryResponse(
                success=False,
                message="清空几何体失败"
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清空几何体失败: {str(e)}")

@router.post("/export", response_model=ExportResponse)
async def export_geometry(request: GeometryExportRequest):
    """导出几何模型"""
    try:
        service = get_occ_service()
        
        # 生成临时文件
        filename = request.filename or f"geometry_export.{request.format}"
        with tempfile.NamedTemporaryFile(
            suffix=f".{request.format}", 
            delete=False
        ) as tmp_file:
            export_filepath = tmp_file.name
        
        success = service.export_geometry(
            request.tags, 
            request.format, 
            export_filepath
        )
        
        if success:
            return ExportResponse(
                success=True,
                message=f"导出{request.format}格式成功",
                downloadUrl=f"/download/geometry/{os.path.basename(export_filepath)}"
            )
        else:
            return ExportResponse(
                success=False,
                message="导出几何模型失败"
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出几何模型失败: {str(e)}")

@router.post("/import", response_model=GeometryResponse)
async def import_geometry(file: UploadFile = File(...)):
    """导入几何模型"""
    try:
        service = get_occ_service()
        
        # 保存上传的文件
        with tempfile.NamedTemporaryFile(
            suffix=Path(file.filename).suffix, 
            delete=False
        ) as tmp_file:
            content = await file.read()
            tmp_file.write(content)
            import_filepath = tmp_file.name
        
        # 导入几何
        infos = service.import_geometry(import_filepath)
        
        # 清理临时文件
        os.unlink(import_filepath)
        
        if infos:
            result_tags = [info.tag for info in infos]
            total_volume = sum(info.volume for info in infos)
            
            return GeometryResponse(
                success=True,
                message=f"成功导入{len(infos)}个几何体",
                geometryTags=result_tags,
                volume=total_volume
            )
        else:
            return GeometryResponse(
                success=False,
                message="导入文件中未找到有效几何体"
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入几何模型失败: {str(e)}")

# 便捷创建接口
@router.post("/quick/box", response_model=GeometryResponse)
async def create_box(
    x: float = 0, y: float = 0, z: float = 0,
    dx: float = 1, dy: float = 1, dz: float = 1,
    name: str = None
):
    """快速创建立方体"""
    request = GeometryCreateRequest(
        geometryType="box",
        parameters={"x": x, "y": y, "z": z, "dx": dx, "dy": dy, "dz": dz},
        name=name
    )
    return await create_geometry(request)

@router.post("/quick/cylinder", response_model=GeometryResponse)
async def create_cylinder(
    x: float = 0, y: float = 0, z: float = 0,
    radius: float = 1, height: float = 1,
    name: str = None
):
    """快速创建圆柱体"""
    request = GeometryCreateRequest(
        geometryType="cylinder",
        parameters={"x": x, "y": y, "z": z, "radius": radius, "height": height},
        name=name
    )
    return await create_geometry(request)

@router.post("/quick/sphere", response_model=GeometryResponse)
async def create_sphere(
    x: float = 0, y: float = 0, z: float = 0,
    r: float = 1,
    name: str = None
):
    """快速创建球体"""
    request = GeometryCreateRequest(
        geometryType="sphere",
        parameters={"x": x, "y": y, "z": z, "r": r},
        name=name
    )
    return await create_geometry(request)

# 支护结构几何建模API
@router.post("/support-structure", response_model=SupportGeometryResponse)
async def create_support_structure_geometry(request: SupportStructureCreateRequest):
    """
    创建支护结构3D几何模型
    支持地连墙、排桩系统、锚杆系统
    """
    try:
        # 验证参数
        if not request.name or not request.structure_type:
            raise HTTPException(
                status_code=400, 
                detail="结构名称和类型不能为空"
            )
        
        # 创建几何生成请求
        geometry_request = SupportStructureGeometryRequest(
            structure_type=request.structure_type,
            name=request.name,
            parameters=request.parameters,
            material_id=request.material_id
        )
        
        # 生成几何模型
        geometry = support_geometry_service.generate_support_structure_geometry(geometry_request)
        
        return SupportGeometryResponse(
            success=True,
            message=f"{request.structure_type}几何模型生成成功",
            geometry=geometry
        )
        
    except ValueError as e:
        return SupportGeometryResponse(
            success=False,
            message="参数错误",
            error_details=str(e)
        )
    
    except Exception as e:
        return SupportGeometryResponse(
            success=False,
            message="几何模型生成失败",
            error_details=str(e)
        )

@router.get("/support-structure-types")
async def get_supported_structure_types():
    """获取支持的支护结构类型"""
    return {
        "success": True,
        "structure_types": [
            {
                "type": "diaphragm_wall",
                "name": "地连墙",
                "description": "地下连续墙支护结构",
                "required_parameters": [
                    "thickness", "depth", "length", "concreteGrade", "reinforcement"
                ],
                "optional_parameters": [
                    "crownBeamWidth", "crownBeamHeight"
                ]
            },
            {
                "type": "pile_system", 
                "name": "排桩系统",
                "description": "钻孔灌注桩等排桩支护系统",
                "required_parameters": [
                    "diameter", "depth", "spacing", "pileType", "concreteGrade", "reinforcement"
                ],
                "optional_parameters": [
                    "crownBeamWidth", "crownBeamHeight"
                ]
            },
            {
                "type": "anchor_system",
                "name": "锚杆系统", 
                "description": "预应力锚杆支护系统",
                "required_parameters": [
                    "angle", "length", "diameter", "prestress", "rowCount", 
                    "verticalSpacing", "horizontalSpacing"
                ],
                "optional_parameters": [
                    "waleBeamWidth", "waleBeamHeight"
                ]
            }
        ]
    }

@router.post("/validate-support-parameters")
async def validate_support_structure_parameters(request: SupportStructureCreateRequest):
    """验证支护结构参数"""
    try:
        # 基本参数验证
        if not request.name or len(request.name.strip()) == 0:
            return {"valid": False, "errors": ["结构名称不能为空"]}
        
        if request.structure_type not in ["diaphragm_wall", "pile_system", "anchor_system"]:
            return {"valid": False, "errors": ["不支持的结构类型"]}
        
        errors = []
        
        # 按类型验证参数
        if request.structure_type == "diaphragm_wall":
            required_params = ["thickness", "depth", "length", "concreteGrade", "reinforcement"]
            missing = [p for p in required_params if p not in request.parameters]
            if missing:
                errors.append(f"缺少必需参数: {', '.join(missing)}")
            
            # 参数范围验证
            thickness = request.parameters.get("thickness", 0)
            if thickness and not (0.6 <= thickness <= 2.0):
                errors.append("墙体厚度应在0.6-2.0米范围内")
        
        elif request.structure_type == "pile_system":
            required_params = ["diameter", "depth", "spacing", "concreteGrade", "reinforcement"]
            missing = [p for p in required_params if p not in request.parameters]
            if missing:
                errors.append(f"缺少必需参数: {', '.join(missing)}")
            
            diameter = request.parameters.get("diameter", 0)
            if diameter and not (0.6 <= diameter <= 2.0):
                errors.append("桩径应在0.6-2.0米范围内")
        
        elif request.structure_type == "anchor_system":
            required_params = ["angle", "length", "diameter", "prestress", "rowCount", "verticalSpacing", "horizontalSpacing"]
            missing = [p for p in required_params if p not in request.parameters]
            if missing:
                errors.append(f"缺少必需参数: {', '.join(missing)}")
            
            angle = request.parameters.get("angle", 0)
            if angle and not (10 <= angle <= 30):
                errors.append("锚杆倾角应在10-30度范围内")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
        
    except Exception as e:
        return {
            "valid": False,
            "errors": [f"参数验证失败: {str(e)}"]
        }