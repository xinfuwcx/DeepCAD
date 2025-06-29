"""
@file visualization_router.py
@description 可视化模块的API路由
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, BackgroundTasks, Response
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import os
from pathlib import Path
import json
from enum import Enum

from src.server.dependencies import get_db, get_visualization_engine, validate_project_exists
from src.core.visualization.models import VisualizationEngine
from src.core.visualization.result_processor import ResultProcessor
from src.core.visualization.three_renderer import ThreeRenderer
from src.core.simulation.kratos_iga_solver import KratosIgaSolver

# 创建路由器
router = APIRouter(
    prefix="/visualization",
    tags=["visualization"],
    responses={404: {"description": "Not found"}},
)

# 数据模型
class VisualizationSettings(BaseModel):
    """可视化设置模型"""
    project_id: int = Field(..., description="项目ID")
    result_id: int = Field(..., description="结果ID")
    result_type: str = Field(..., description="结果类型", pattern="^(displacement|stress|strain|pore_pressure)$")
    component: Optional[str] = Field("magnitude", description="结果分量")
    colormap: Optional[str] = Field("viridis", description="色彩映射")
    scale_factor: Optional[float] = Field(1.0, description="变形放大系数", gt=0)
    
class SceneSettings(BaseModel):
    """场景设置模型"""
    project_id: int = Field(..., description="项目ID")
    camera_position: Optional[List[float]] = Field(None, description="相机位置")
    look_at: Optional[List[float]] = Field(None, description="视点位置")
    background_color: Optional[List[float]] = Field([0.1, 0.1, 0.2], description="背景色")
    lighting: Optional[Dict[str, Any]] = Field(None, description="光照设置")

class ExportSettings(BaseModel):
    """导出设置模型"""
    project_id: int = Field(..., description="项目ID")
    result_id: int = Field(..., description="结果ID")
    format: str = Field(..., description="导出格式", pattern="^(png|jpg|pdf|html)$")
    width: int = Field(1920, description="图像宽度", gt=0)
    height: int = Field(1080, description="图像高度", gt=0)
    dpi: Optional[int] = Field(300, description="图像DPI", gt=0)

class VisualizationResponse(BaseModel):
    """可视化响应模型"""
    id: int
    message: str
    url: Optional[str] = None
    visualization_info: Dict[str, Any] = Field(default_factory=dict)

class VisualizationOptions(BaseModel):
    """可视化选项模型"""
    scale_factor: float = Field(100.0, description="放大系数")
    color_map: str = Field("jet", description="颜色映射")
    show_control_net: bool = Field(True, description="显示控制网格")
    show_wireframe: bool = Field(False, description="显示线框")
    
class IGAVisualizationRequest(BaseModel):
    """IGA可视化请求模型"""
    analysis_id: int = Field(..., description="分析ID")
    result_type: str = Field("displacement", description="结果类型")
    component: str = Field("magnitude", description="分量")
    visualization_options: Optional[VisualizationOptions] = Field(None, description="可视化选项")

# 结果目录
RESULTS_DIR = os.environ.get("RESULTS_DIR", "data/results")

# 数据目录
DATA_DIR = Path("data/visualization")
DATA_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/projects", response_model=List[Dict[str, Any]])
async def get_projects(db: Session = Depends(get_db)):
    """
    获取所有项目列表
    """
    try:
        # 获取项目目录列表
        results_path = Path(RESULTS_DIR)
        if not results_path.exists():
            return []
        
        projects = []
        for project_dir in results_path.iterdir():
            if project_dir.is_dir() and (project_dir / "model.json").exists():
                # 尝试加载项目基本信息
                processor = ResultProcessor(RESULTS_DIR)
                if processor.load_results(project_dir.name):
                    projects.append({
                        "id": project_dir.name,
                        "name": processor.metadata.get("name", project_dir.name),
                        "description": processor.metadata.get("description", ""),
                        "stages": len(processor.stages),
                        "created_at": processor.metadata.get("created_at", ""),
                        "updated_at": processor.metadata.get("updated_at", "")
                    })
        
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取项目列表失败: {str(e)}")

@router.get("/projects/{project_id}", response_model=Dict[str, Any])
async def get_project_metadata(project_id: str):
    """
    获取项目元数据
    """
    try:
        processor = ResultProcessor(RESULTS_DIR)
        if not processor.load_results(project_id):
            raise HTTPException(status_code=404, detail=f"项目 {project_id} 不存在")
        
        return {
            "id": project_id,
            "metadata": processor.metadata,
            "stages": processor.get_stage_names(),
            "result_types": processor.get_available_result_types()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取项目元数据失败: {str(e)}")

@router.get("/projects/{project_id}/visualization-data", response_model=Dict[str, Any])
async def get_visualization_data(
    project_id: str,
    include_nodes: bool = Query(True, description="是否包含节点数据"),
    include_elements: bool = Query(True, description="是否包含单元数据"),
    include_stages: bool = Query(True, description="是否包含阶段数据"),
    stage_indices: Optional[str] = Query(None, description="要包含的阶段索引，逗号分隔，如'0,1,2'")
):
    """
    获取项目可视化数据
    """
    try:
        processor = ResultProcessor(RESULTS_DIR)
        if not processor.load_results(project_id):
            raise HTTPException(status_code=404, detail=f"项目 {project_id} 不存在")
        
        # 获取完整数据
        data = processor.get_visualization_data()
        
        # 根据参数过滤数据
        result = {"metadata": data["metadata"]}
        
        if include_nodes:
            result["nodes"] = data["nodes"]
        
        if include_elements:
            result["elements"] = data["elements"]
        
        if include_stages:
            if stage_indices:
                try:
                    indices = [int(idx.strip()) for idx in stage_indices.split(",")]
                    result["stages"] = [data["stages"][idx] for idx in indices if 0 <= idx < len(data["stages"])]
                except (ValueError, IndexError):
                    raise HTTPException(status_code=400, detail="无效的阶段索引")
            else:
                result["stages"] = data["stages"]
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取可视化数据失败: {str(e)}")

@router.get("/projects/{project_id}/statistics", response_model=Dict[str, Any])
async def get_result_statistics(project_id: str):
    """
    获取项目结果统计信息
    """
    try:
        processor = ResultProcessor(RESULTS_DIR)
        if not processor.load_results(project_id):
            raise HTTPException(status_code=404, detail=f"项目 {project_id} 不存在")
        
        return processor.get_result_statistics()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取结果统计信息失败: {str(e)}")

@router.get("/projects/{project_id}/interpolate", response_model=Dict[str, Any])
async def interpolate_result(
    project_id: str,
    x: float = Query(..., description="X坐标"),
    y: float = Query(..., description="Y坐标"),
    z: float = Query(..., description="Z坐标"),
    result_type: str = Query(..., description="结果类型"),
    stage_index: int = Query(-1, description="阶段索引，默认为最后一个阶段")
):
    """
    在指定点插值计算结果
    """
    try:
        processor = ResultProcessor(RESULTS_DIR)
        if not processor.load_results(project_id):
            raise HTTPException(status_code=404, detail=f"项目 {project_id} 不存在")
        
        value = processor.interpolate_results(x, y, z, result_type, stage_index)
        
        return {
            "x": x,
            "y": y,
            "z": z,
            "result_type": result_type,
            "stage_index": stage_index if stage_index >= 0 else len(processor.stages) - 1,
            "value": value
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"插值计算结果失败: {str(e)}")

@router.post("/projects/{project_id}/export", response_model=Dict[str, str])
async def export_visualization_data(project_id: str):
    """
    导出项目可视化数据为JSON文件
    """
    try:
        processor = ResultProcessor(RESULTS_DIR)
        if not processor.load_results(project_id):
            raise HTTPException(status_code=404, detail=f"项目 {project_id} 不存在")
        
        # 创建导出目录
        export_dir = Path(RESULTS_DIR) / project_id / "exports"
        export_dir.mkdir(exist_ok=True, parents=True)
        
        # 导出文件路径
        export_file = export_dir / "visualization_data.json"
        
        # 导出数据
        if processor.export_to_json(str(export_file)):
            return {"message": "导出成功", "file_path": str(export_file)}
        else:
            raise HTTPException(status_code=500, detail="导出失败")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出可视化数据失败: {str(e)}")

# 路由定义
@router.post("/contour", response_model=VisualizationResponse, summary="生成云图")
async def generate_contour(
    settings: VisualizationSettings,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists),
    engine: VisualizationEngine = Depends(get_visualization_engine)
):
    """
    生成云图
    
    - **project_id**: 项目ID
    - **result_id**: 结果ID
    - **result_type**: 结果类型(位移、应力、应变或孔隙水压力)
    - **component**: 结果分量(可选，默认为magnitude)
    - **colormap**: 色彩映射(可选，默认为viridis)
    - **scale_factor**: 变形放大系数(可选，默认为1.0)
    """
    try:
        # 在实际实现中，这应该调用可视化引擎生成云图
        viz_id = settings.project_id  # 示例值
        
        return VisualizationResponse(
            id=viz_id,
            message=f"成功生成{settings.result_type}云图",
            url=f"/api/visualization/{viz_id}/view",
            visualization_info={
                "result_type": settings.result_type,
                "component": settings.component,
                "colormap": settings.colormap,
                "scale_factor": settings.scale_factor,
                "min_value": 0.0,  # 示例值
                "max_value": 10.5  # 示例值
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成云图失败: {str(e)}"
        )

@router.post("/vector", response_model=VisualizationResponse, summary="生成矢量图")
async def generate_vector(
    settings: VisualizationSettings,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists),
    engine: VisualizationEngine = Depends(get_visualization_engine)
):
    """
    生成矢量图
    
    - **project_id**: 项目ID
    - **result_id**: 结果ID
    - **result_type**: 结果类型(位移、应力、应变或孔隙水压力)
    - **scale_factor**: 矢量放大系数(可选，默认为1.0)
    """
    try:
        # 在实际实现中，这应该调用可视化引擎生成矢量图
        viz_id = settings.project_id  # 示例值
        
        return VisualizationResponse(
            id=viz_id,
            message=f"成功生成{settings.result_type}矢量图",
            url=f"/api/visualization/{viz_id}/view",
            visualization_info={
                "result_type": settings.result_type,
                "scale_factor": settings.scale_factor,
                "arrow_count": 1000,  # 示例值
                "max_magnitude": 0.12  # 示例值
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成矢量图失败: {str(e)}"
        )

@router.post("/scene", response_model=VisualizationResponse, summary="设置场景")
async def set_scene(
    settings: SceneSettings,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists),
    engine: VisualizationEngine = Depends(get_visualization_engine)
):
    """
    设置可视化场景
    
    - **project_id**: 项目ID
    - **camera_position**: 相机位置(可选)
    - **look_at**: 视点位置(可选)
    - **background_color**: 背景色RGB值(可选)
    - **lighting**: 光照设置(可选)
    """
    try:
        # 在实际实现中，这应该调用可视化引擎设置场景
        scene_id = settings.project_id  # 示例值
        
        return VisualizationResponse(
            id=scene_id,
            message="场景设置成功",
            visualization_info={
                "camera_position": settings.camera_position,
                "look_at": settings.look_at,
                "background_color": settings.background_color
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"设置场景失败: {str(e)}"
        )

@router.post("/export", response_model=VisualizationResponse, summary="导出可视化")
async def export_visualization(
    settings: ExportSettings,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists),
    engine: VisualizationEngine = Depends(get_visualization_engine)
):
    """
    导出可视化结果
    
    - **project_id**: 项目ID
    - **result_id**: 结果ID
    - **format**: 导出格式(png, jpg, pdf, html)
    - **width**: 图像宽度(像素)
    - **height**: 图像高度(像素)
    - **dpi**: 图像DPI(可选)
    """
    try:
        # 在实际实现中，这应该调用可视化引擎导出结果
        export_id = settings.project_id  # 示例值
        
        return VisualizationResponse(
            id=export_id,
            message=f"成功导出{settings.format}格式的可视化结果",
            url=f"/api/visualization/exports/{export_id}.{settings.format}",
            visualization_info={
                "format": settings.format,
                "width": settings.width,
                "height": settings.height,
                "dpi": settings.dpi,
                "file_size": 1024 * 1024  # 示例值
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出可视化结果失败: {str(e)}"
        )

@router.get("/scene")
async def get_scene_data(scene_id: Optional[str] = None):
    """
    获取场景数据
    
    参数:
        scene_id: 场景ID，如果不提供则返回默认场景
        
    返回:
        场景数据
    """
    if scene_id:
        scene_path = DATA_DIR / f"{scene_id}.json"
        if not scene_path.exists():
            raise HTTPException(status_code=404, detail=f"Scene {scene_id} not found")
    else:
        # 使用默认场景
        scene_path = DATA_DIR / "default_scene.json"
        if not scene_path.exists():
            # 创建默认场景
            renderer = ThreeRenderer(output_dir=str(DATA_DIR))
            renderer.create_excavation_model(
                excavation_width=300,
                excavation_length=300,
                excavation_depth=150,
                water_level=80
            )
            renderer.export_scene("default_scene.json")
    
    # 读取场景数据
    with open(scene_path, "r", encoding="utf-8") as f:
        scene_data = json.load(f)
    
    return scene_data

@router.post("/scene")
async def create_scene(
    scene_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    创建场景
    
    参数:
        scene_data: 场景数据
        
    返回:
        创建的场景ID
    """
    # 生成场景ID
    scene_id = f"scene_{len(os.listdir(DATA_DIR)) + 1}"
    
    # 创建场景渲染器
    renderer = ThreeRenderer(output_dir=str(DATA_DIR))
    
    # 提取场景参数
    excavation_width = scene_data.get("excavation_width", 300)
    excavation_length = scene_data.get("excavation_length", 300)
    excavation_depth = scene_data.get("excavation_depth", 150)
    water_level = scene_data.get("water_level")
    soil_layers = scene_data.get("soil_layers")
    
    # 创建场景
    background_tasks.add_task(
        renderer.create_excavation_model,
        excavation_width=excavation_width,
        excavation_length=excavation_length,
        excavation_depth=excavation_depth,
        soil_layers=soil_layers,
        water_level=water_level
    )
    
    # 导出场景
    scene_path = renderer.export_scene(f"{scene_id}.json")
    
    return {"scene_id": scene_id, "scene_path": scene_path}

@router.get("/results/{analysis_id}")
async def get_analysis_results(analysis_id: str, db: Session = Depends(get_db)):
    """
    获取分析结果
    
    参数:
        analysis_id: 分析ID
        
    返回:
        分析结果数据
    """
    # 检查分析结果是否存在
    result_path = DATA_DIR / f"results_{analysis_id}.json"
    if not result_path.exists():
        raise HTTPException(status_code=404, detail=f"Analysis results {analysis_id} not found")
    
    # 读取分析结果
    with open(result_path, "r", encoding="utf-8") as f:
        result_data = json.load(f)
    
    return result_data

@router.post("/process_results")
async def process_analysis_results(
    analysis_data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    处理分析结果
    
    参数:
        analysis_data: 分析数据
        
    返回:
        处理后的结果ID
    """
    # 生成结果ID
    result_id = f"result_{len(os.listdir(DATA_DIR)) + 1}"
    
    # 创建结果处理器
    processor = ResultProcessor(output_dir=str(DATA_DIR))
    
    # 在后台处理结果
    background_tasks.add_task(
        processor.process_results,
        analysis_data=analysis_data,
        result_id=result_id
    )
    
    return {"result_id": result_id}

@router.post("/iga", response_model=VisualizationResponse, summary="创建IGA可视化任务")
async def create_iga_visualization(
    request: IGAVisualizationRequest,
    db: Session = Depends(get_db)
):
    """
    创建IGA结果可视化任务
    
    - **analysis_id**: 分析ID
    - **result_type**: 结果类型(displacement, stress, strain, pore_pressure)
    - **component**: 分量(magnitude, x, y, z)
    - **visualization_options**: 可视化选项
    """
    try:
        # 验证分析结果存在
        # 实际应从数据库查询，这里简化处理
        
        # 创建可视化任务ID
        visual_id = 1
        
        # 返回可视化任务信息
        return VisualizationResponse(
            id=visual_id,
            analysis_id=request.analysis_id,
            message="可视化任务创建成功",
            view_url=f"/api/visualization/iga/{visual_id}/view",
            export_url=f"/api/visualization/iga/{visual_id}/export"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建可视化任务失败: {str(e)}"
        )

@router.get("/iga/{visual_id}/data", summary="获取IGA可视化数据")
async def get_iga_visualization_data(
    visual_id: int,
    db: Session = Depends(get_db)
):
    """
    获取IGA可视化数据以在前端渲染
    
    - **visual_id**: 可视化任务ID
    """
    try:
        # 模拟获取可视化数据
        # 实际应从数据库查询关联的分析结果，然后处理可视化数据
        
        # 初始化Kratos求解器
        solver = KratosIgaSolver(output_dir="./results")
        
        # 获取位移结果作为示例
        results = solver.get_results("DISPLACEMENT")
        
        # 构造可视化数据
        # 模拟NURBS数据
        nurbs_data = {
            "control_points": [[i*2.0, j*2.0, 0.0] for i in range(5) for j in range(5)],
            "weights": [1.0] * 25,
            "knot_vectors": {
                "u": [0.0, 0.0, 0.0, 0.0, 0.5, 1.0, 1.0, 1.0, 1.0],
                "v": [0.0, 0.0, 0.0, 0.0, 0.5, 1.0, 1.0, 1.0, 1.0]
            },
            "degrees": {
                "u": 3,
                "v": 3
            }
        }
        
        # 处理结果数据
        result_values = []
        for i in range(25):  # 假设有25个控制点
            node_id = i + 1
            if node_id in results:
                # 如果是向量结果，计算模长作为标量值
                value = results[node_id]
                if isinstance(value, list):
                    # 计算向量模长
                    import math
                    magnitude = math.sqrt(sum(v*v for v in value))
                    result_values.append(magnitude)
                else:
                    result_values.append(value)
            else:
                result_values.append(0.0)
        
        return {
            "id": visual_id,
            "analysis_id": 1,  # 假设分析ID为1
            "nurbs_data": nurbs_data,
            "result_data": {
                "type": "displacement",
                "component": "magnitude",
                "values": result_values,
                "min": min(result_values) if result_values else 0.0,
                "max": max(result_values) if result_values else 0.0
            },
            "visualization_options": {
                "scale_factor": 100,
                "color_map": "jet",
                "show_control_net": True,
                "show_wireframe": False
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取可视化数据失败: {str(e)}"
        )

@router.get("/iga/{visual_id}/view", summary="查看IGA可视化结果")
async def view_iga_visualization(
    visual_id: int,
    db: Session = Depends(get_db)
):
    """
    查看IGA可视化结果（HTML页面）
    
    - **visual_id**: 可视化任务ID
    """
    try:
        # 这里简化处理，实际应返回HTML页面或重定向到前端可视化页面
        return {
            "message": "请使用前端可视化页面查看结果",
            "data_url": f"/api/visualization/iga/{visual_id}/data"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"查看可视化结果失败: {str(e)}"
        )

@router.get("/iga/{visual_id}/export", summary="导出IGA可视化结果")
async def export_iga_visualization(
    visual_id: int,
    format: str = "vtk",
    db: Session = Depends(get_db)
):
    """
    导出IGA可视化结果为特定格式文件
    
    - **visual_id**: 可视化任务ID
    - **format**: 导出格式(vtk, json, html)
    """
    try:
        # 模拟导出过程
        # 实际应调用相应的导出函数生成文件
        
        if format == "vtk":
            # 初始化Kratos求解器
            solver = KratosIgaSolver(output_dir="./results")
            
            # 导出结果
            output_file = f"./results/visual_{visual_id}.vtk"
            success = solver.export_results(output_file, format)
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="导出VTK结果失败"
                )
            
            # 读取文件内容
            with open(output_file, "rb") as f:
                content = f.read()
            
            # 返回文件
            return Response(
                content=content,
                media_type="application/octet-stream",
                headers={"Content-Disposition": f"attachment; filename=visual_{visual_id}.vtk"}
            )
        elif format == "json":
            # 创建JSON结果
            result = {
                "id": visual_id,
                "type": "iga_visualization",
                "nurbs_data": {
                    "control_points": [[i*2.0, j*2.0, 0.0] for i in range(5) for j in range(5)],
                    "weights": [1.0] * 25,
                    "knot_vectors": {
                        "u": [0.0, 0.0, 0.0, 0.0, 0.5, 1.0, 1.0, 1.0, 1.0],
                        "v": [0.0, 0.0, 0.0, 0.0, 0.5, 1.0, 1.0, 1.0, 1.0]
                    },
                    "degrees": {
                        "u": 3,
                        "v": 3
                    }
                },
                "result_data": {
                    "type": "displacement",
                    "component": "magnitude",
                    "values": [0.001 * i for i in range(25)]
                }
            }
            
            # 返回JSON
            return Response(
                content=json.dumps(result, indent=2),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename=visual_{visual_id}.json"}
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"不支持的导出格式: {format}"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出可视化结果失败: {str(e)}"
        ) 