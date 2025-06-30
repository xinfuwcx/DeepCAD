"""
@file visualization_router.py
@description 可视化模块的API路由
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path, BackgroundTasks, Response, UploadFile, File, Form
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import os
from pathlib import Path
import json
from enum import Enum
import logging
import traceback
import time

from src.server.dependencies import get_db, get_visualization_engine, validate_project_exists
from src.core.visualization.models import VisualizationEngine
from src.core.visualization.result_processor import ResultProcessor
from src.core.visualization.three_renderer import ThreeRenderer
from src.core.simulation.kratos_iga_solver import KratosIgaSolver
from src.core.visualization.data_converter import DataConverter

# 导入可视化组件
try:
    from src.core.visualization.trame_fem_visualizer import TrameFEMVisualizer
    HAS_TRAME = True
except ImportError:
    HAS_TRAME = False
    logging.warning("Trame可视化库未安装，可视化功能将受限")

# 创建路由器
router = APIRouter(
    prefix="/visualization",
    tags=["visualization"],
    responses={404: {"description": "Not found"}},
)

# 创建全局可视化器实例
visualizer = None
if HAS_TRAME:
    try:
        visualizer = TrameFEMVisualizer(
            title="深基坑FEM分析结果可视化",
            show_ui_controls=True,
            default_theme="dark"
        )
    except Exception as e:
        logging.error(f"初始化可视化器失败: {e}")

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

class ModelRequest(BaseModel):
    """模型数据请求"""
    model_id: int = Field(..., description="模型ID")
    detail_level: str = Field("medium", description="细节级别(low/medium/high)")
    optimize: bool = Field(True, description="是否优化数据")
    include_materials: bool = Field(True, description="是否包含材质信息")

class SceneRequest(BaseModel):
    """场景数据请求"""
    project_id: int = Field(..., description="项目ID")
    models: List[int] = Field(..., description="模型ID列表")
    detail_level: str = Field("medium", description="细节级别(low/medium/high)")
    include_lights: bool = Field(True, description="是否包含灯光")
    camera_position: Optional[List[float]] = Field(None, description="相机位置")

class ExportRequest(BaseModel):
    """导出请求"""
    scene_id: str = Field(..., description="场景ID")
    format: str = Field("json", description="导出格式(json/gltf)")
    filename: Optional[str] = Field(None, description="文件名")

# 结果目录
RESULTS_DIR = os.environ.get("RESULTS_DIR", "data/results")

# 数据目录
DATA_DIR = Path("data/visualization")
DATA_DIR.mkdir(parents=True, exist_ok=True)

# 定义数据目录
UPLOAD_DIR = os.path.join("data", "uploads")

# 确保目录存在
for directory in [UPLOAD_DIR, RESULTS_DIR]:
    if not os.path.exists(directory):
        try:
            os.makedirs(directory)
        except:
            logging.error(f"无法创建目录: {directory}")

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

@router.get("/model/{model_id}", summary="获取单个模型数据")
async def get_model(
    model_id: int,
    detail_level: str = "medium",
    optimize: bool = True,
    engine: VisualizationEngine = Depends(get_visualization_engine)
):
    """
    获取单个模型的Three.js格式数据
    
    - **model_id**: 模型ID
    - **detail_level**: 细节级别(low/medium/high)
    - **optimize**: 是否优化数据
    """
    try:
        # 从数据库或缓存获取模型数据
        model_data = engine.get_model_data(model_id)
        
        if not model_data:
            raise HTTPException(status_code=404, detail=f"模型ID {model_id} 不存在")
            
        # 使用转换器转换为Three.js格式
        converter = DataConverter(use_compression=optimize)
        threejs_data = converter.occ_to_threejs(model_data, optimize=optimize, detail_level=detail_level)
        
        return JSONResponse(content=threejs_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取模型数据失败: {str(e)}")

@router.post("/scene", summary="获取场景数据")
async def get_scene(
    request: SceneRequest,
    engine: VisualizationEngine = Depends(get_visualization_engine)
):
    """
    获取包含多个模型的完整场景数据
    
    - **project_id**: 项目ID
    - **models**: 模型ID列表
    - **detail_level**: 细节级别
    - **include_lights**: 是否包含灯光
    - **camera_position**: 相机位置
    """
    try:
        # 获取每个模型的数据
        model_data_list = []
        for model_id in request.models:
            model_data = engine.get_model_data(model_id)
            if model_data:
                model_data_list.append(model_data)
        
        if not model_data_list:
            raise HTTPException(status_code=404, detail="未找到有效的模型数据")
            
        # 转换为Three.js格式
        converter = DataConverter(use_compression=True)
        threejs_models = [
            converter.occ_to_threejs(model, optimize=True, detail_level=request.detail_level)
            for model in model_data_list
        ]
        
        # 创建完整场景
        scene = converter.create_three_scene(threejs_models)
        
        # 添加灯光
        if request.include_lights:
            if "object" in scene and "children" in scene["object"]:
                # 添加环境光
                scene["object"]["children"].append({
                    "uuid": "ambient_light",
                    "type": "AmbientLight",
                    "color": 0xffffff,
                    "intensity": 0.4
                })
                
                # 添加平行光
                scene["object"]["children"].append({
                    "uuid": "directional_light",
                    "type": "DirectionalLight",
                    "color": 0xffffff,
                    "intensity": 0.6,
                    "position": [100, 100, 100],
                    "castShadow": True
                })
        
        # 添加相机设置
        if request.camera_position:
            scene["camera"] = {
                "position": request.camera_position,
                "target": [0, 0, 0]
            }
        
        # 生成唯一场景ID
        scene_id = engine.create_scene(request.project_id, scene)
        
        # 返回场景数据
        return {
            "scene_id": scene_id,
            "data": scene
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取场景数据失败: {str(e)}")

@router.post("/export", summary="导出场景")
async def export_scene(
    request: ExportRequest,
    engine: VisualizationEngine = Depends(get_visualization_engine)
):
    """
    导出场景为文件
    
    - **scene_id**: 场景ID
    - **format**: 导出格式(json/gltf)
    - **filename**: 文件名(可选)
    """
    try:
        # 获取场景数据
        scene_data = engine.get_scene(request.scene_id)
        
        if not scene_data:
            raise HTTPException(status_code=404, detail=f"场景ID {request.scene_id} 不存在")
            
        # 设置文件名
        filename = request.filename
        if not filename:
            filename = f"scene_{request.scene_id}"
            
        # 根据格式导出
        if request.format.lower() == "json":
            # 创建临时文件
            with tempfile.NamedTemporaryFile(delete=False, suffix=".json") as tmp:
                tmp_path = tmp.name
                json.dump(scene_data, tmp)
                
            # 设置响应头，使浏览器下载文件
            return FileResponse(
                tmp_path,
                filename=f"{filename}.json",
                media_type="application/json",
                background=None  # 文件传输后删除
            )
        elif request.format.lower() == "gltf":
            # 在实际实现中，这里需要调用转换为GLTF的功能
            # 目前简单返回JSON格式
            raise HTTPException(status_code=501, detail="GLTF导出功能尚未实现")
        else:
            raise HTTPException(status_code=400, detail=f"不支持的导出格式: {request.format}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出场景失败: {str(e)}")

@router.get("/viewer/{scene_id}", summary="获取场景查看器HTML")
async def get_scene_viewer(
    scene_id: str,
    engine: VisualizationEngine = Depends(get_visualization_engine)
):
    """
    获取包含Three.js查看器的HTML页面
    
    - **scene_id**: 场景ID
    """
    try:
        # 检查场景是否存在
        scene_data = engine.get_scene(scene_id)
        
        if not scene_data:
            raise HTTPException(status_code=404, detail=f"场景ID {scene_id} 不存在")
            
        # 生成HTML查看器
        html_content = f"""
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>深基坑CAE系统 - 3D查看器</title>
            <style>
                body {{ margin: 0; overflow: hidden; }}
                #viewer {{ width: 100%; height: 100vh; }}
                #info {{ 
                    position: absolute; 
                    top: 10px; 
                    width: 100%; 
                    text-align: center; 
                    color: white;
                    font-family: Arial, sans-serif;
                    text-shadow: 1px 1px 1px rgba(0,0,0,0.5);
                    pointer-events: none;
                }}
            </style>
        </head>
        <body>
            <div id="info">深基坑CAE系统 - 场景查看器</div>
            <div id="viewer"></div>
            
            <script src="https://cdn.jsdelivr.net/npm/three@0.132.0/build/three.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/three@0.132.0/examples/js/controls/OrbitControls.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/three@0.132.0/examples/js/loaders/GLTFLoader.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/pako@2.0.4/dist/pako.min.js"></script>
            
            <script>
                // 场景数据
                const sceneData = {JSON.stringify(scene_data)};
                
                // 初始化Three.js
                const container = document.getElementById('viewer');
                const scene = new THREE.Scene();
                const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
                const renderer = new THREE.WebGLRenderer({{ antialias: true }});
                
                renderer.setSize(window.innerWidth, window.innerHeight);
                renderer.setPixelRatio(window.devicePixelRatio);
                renderer.shadowMap.enabled = true;
                container.appendChild(renderer.domElement);
                
                // 设置相机位置
                camera.position.set(50, 50, 50);
                camera.lookAt(0, 0, 0);
                
                // 添加控制器
                const controls = new THREE.OrbitControls(camera, renderer.domElement);
                controls.enableDamping = true;
                controls.dampingFactor = 0.05;
                
                // 添加灯光
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
                scene.add(ambientLight);
                
                const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
                directionalLight.position.set(100, 100, 100);
                directionalLight.castShadow = true;
                scene.add(directionalLight);
                
                // 加载场景
                loadScene(sceneData);
                
                // 窗口大小调整
                window.addEventListener('resize', onWindowResize);
                
                // 动画循环
                animate();
                
                function loadScene(data) {{
                    // 解析材质
                    const materials = {{}};
                    if (data.materials) {{
                        data.materials.forEach(matData => {{
                            const material = createMaterial(matData);
                            materials[matData.uuid] = material;
                        }});
                    }}
                    
                    // 解析几何体
                    const geometries = {{}};
                    if (data.geometries) {{
                        data.geometries.forEach(geoData => {{
                            const geometry = createGeometry(geoData);
                            geometries[geoData.uuid] = geometry;
                        }});
                    }}
                    
                    // 创建对象
                    if (data.object && data.object.children) {{
                        data.object.children.forEach(objData => {{
                            const object = createObject(objData, geometries, materials);
                            if (object) {{
                                scene.add(object);
                            }}
                        }});
                    }}
                    
                    // 添加网格和坐标轴
                    const gridHelper = new THREE.GridHelper(100, 100);
                    scene.add(gridHelper);
                    
                    const axesHelper = new THREE.AxesHelper(20);
                    scene.add(axesHelper);
                }}
                
                function createMaterial(data) {{
                    let material;
                    
                    switch(data.type) {{
                        case 'MeshBasicMaterial':
                            material = new THREE.MeshBasicMaterial();
                            break;
                        case 'MeshLambertMaterial':
                            material = new THREE.MeshLambertMaterial();
                            break;
                        case 'MeshPhongMaterial':
                            material = new THREE.MeshPhongMaterial();
                            break;
                        default:
                            material = new THREE.MeshStandardMaterial();
                    }}
                    
                    // 设置属性
                    if (data.color !== undefined) material.color.setHex(data.color);
                    if (data.emissive !== undefined) material.emissive.setHex(data.emissive);
                    if (data.specular !== undefined) material.specular.setHex(data.specular);
                    if (data.shininess !== undefined) material.shininess = data.shininess;
                    if (data.transparent !== undefined) material.transparent = data.transparent;
                    if (data.opacity !== undefined) material.opacity = data.opacity;
                    if (data.wireframe !== undefined) material.wireframe = data.wireframe;
                    if (data.side !== undefined) material.side = data.side;
                    
                    return material;
                }}
                
                function createGeometry(data) {{
                    let geometry;
                    
                    switch(data.type) {{
                        case 'BoxGeometry':
                            geometry = new THREE.BoxGeometry(
                                data.width || 1,
                                data.height || 1,
                                data.depth || 1
                            );
                            break;
                        case 'CylinderGeometry':
                            geometry = new THREE.CylinderGeometry(
                                data.radiusTop || 1,
                                data.radiusBottom || 1,
                                data.height || 1,
                                data.radialSegments || 32
                            );
                            break;
                        case 'SphereGeometry':
                            geometry = new THREE.SphereGeometry(
                                data.radius || 1,
                                data.widthSegments || 32,
                                data.heightSegments || 32
                            );
                            break;
                        default:
                            console.warn('不支持的几何体类型:', data.type);
                            geometry = new THREE.BoxGeometry(1, 1, 1);
                    }}
                    
                    return geometry;
                }}
                
                function createObject(data, geometries, materials) {{
                    let object;
                    
                    if (data.type === 'Mesh') {{
                        // 获取几何体和材质
                        const geometry = geometries[data.geometry];
                        const material = materials[data.material];
                        
                        if (geometry && material) {{
                            object = new THREE.Mesh(geometry, material);
                        }} else {{
                            console.warn('找不到几何体或材质:', data.geometry, data.material);
                            return null;
                        }}
                    }} else if (data.type === 'DirectionalLight') {{
                        object = new THREE.DirectionalLight(data.color, data.intensity);
                    }} else if (data.type === 'AmbientLight') {{
                        object = new THREE.AmbientLight(data.color, data.intensity);
                    }} else {{
                        console.warn('不支持的对象类型:', data.type);
                        return null;
                    }}
                    
                    // 设置位置、旋转和缩放
                    if (data.position) {{
                        object.position.set(data.position[0], data.position[1], data.position[2]);
                    }}
                    
                    if (data.quaternion) {{
                        object.quaternion.set(
                            data.quaternion[0],
                            data.quaternion[1],
                            data.quaternion[2],
                            data.quaternion[3]
                        );
                    }}
                    
                    if (data.scale) {{
                        object.scale.set(data.scale[0], data.scale[1], data.scale[2]);
                    }}
                    
                    return object;
                }}
                
                function onWindowResize() {{
                    camera.aspect = window.innerWidth / window.innerHeight;
                    camera.updateProjectionMatrix();
                    renderer.setSize(window.innerWidth, window.innerHeight);
                }}
                
                function animate() {{
                    requestAnimationFrame(animate);
                    controls.update();
                    renderer.render(scene, camera);
                }}
            </script>
        </body>
        </html>
        """
        
        return HTMLResponse(content=html_content, status_code=200)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取场景查看器失败: {str(e)}")

@router.get("/status")
async def check_status():
    """检查可视化服务状态"""
    return {
        "status": "ok" if visualizer else "unavailable",
        "trame_available": HAS_TRAME,
        "service_ready": visualizer is not None
    }

@router.post("/launch")
async def launch_visualizer(port: int = 8080):
    """启动可视化服务器"""
    global visualizer
    
    if not HAS_TRAME:
        raise HTTPException(status_code=400, detail="Trame库未安装，无法启动可视化服务")
        
    if not visualizer:
        try:
            visualizer = TrameFEMVisualizer(
                title="深基坑FEM分析结果可视化",
                show_ui_controls=True,
                default_theme="dark"
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"初始化可视化器失败: {str(e)}")
    
    try:
        # 检查服务器是否已启动
        if hasattr(visualizer, 'server') and visualizer.server.running:
            return {
                "status": "already_running",
                "url": f"http://localhost:{visualizer.server.port}",
                "port": visualizer.server.port
            }
            
        # 启动服务器
        server = visualizer.start(port=port, open_browser=False)
        
        return {
            "status": "started",
            "url": f"http://localhost:{port}",
            "port": port
        }
    except Exception as e:
        logging.error(f"启动可视化服务器失败: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"启动可视化服务器失败: {str(e)}")

@router.post("/load-mesh")
async def load_mesh(
    mesh_file: UploadFile = File(...),
    auto_visualize: bool = Form(False)
):
    """上传并加载网格文件"""
    if not visualizer:
        raise HTTPException(status_code=400, detail="可视化服务未初始化")
        
    # 检查文件类型
    filename = mesh_file.filename
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in ['.vtk', '.vtu']:
        raise HTTPException(status_code=400, detail="仅支持VTK或VTU格式的网格文件")
        
    try:
        # 保存上传的文件
        file_path = os.path.join(UPLOAD_DIR, filename)
        with open(file_path, 'wb') as f:
            content = await mesh_file.read()
            f.write(content)
            
        # 如果需要自动可视化
        if auto_visualize:
            success = visualizer.visualize_fem_results(file_path)
            if not success:
                raise HTTPException(status_code=500, detail="可视化网格失败")
                
        return {
            "status": "success",
            "file_path": file_path,
            "visualized": auto_visualize
        }
    except Exception as e:
        logging.error(f"加载网格失败: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"加载网格失败: {str(e)}")

@router.post("/load-results")
async def load_results(
    mesh_file: str,
    result_file: Optional[UploadFile] = File(None),
    result_data: Optional[str] = Form(None),
    auto_visualize: bool = Form(True)
):
    """加载FEM结果数据"""
    if not visualizer:
        raise HTTPException(status_code=400, detail="可视化服务未初始化")
        
    if not os.path.exists(mesh_file):
        raise HTTPException(status_code=400, detail=f"网格文件不存在: {mesh_file}")
        
    try:
        result_file_path = None
        result_data_dict = None
        
        # 处理结果文件
        if result_file:
            filename = result_file.filename
            ext = os.path.splitext(filename)[1].lower()
            
            if ext not in ['.vtk', '.vtu']:
                raise HTTPException(status_code=400, detail="仅支持VTK或VTU格式的结果文件")
                
            # 保存上传的文件
            result_file_path = os.path.join(RESULTS_DIR, filename)
            with open(result_file_path, 'wb') as f:
                content = await result_file.read()
                f.write(content)
        
        # 处理结果数据
        if result_data:
            try:
                result_data_dict = json.loads(result_data)
            except:
                raise HTTPException(status_code=400, detail="结果数据格式错误，应为有效的JSON")
        
        # 如果需要自动可视化
        if auto_visualize:
            success = visualizer.visualize_fem_results(
                mesh_file,
                result_data=result_data_dict,
                result_file=result_file_path
            )
            
            if not success:
                raise HTTPException(status_code=500, detail="可视化结果失败")
                
        return {
            "status": "success",
            "mesh_file": mesh_file,
            "result_file": result_file_path,
            "has_result_data": result_data_dict is not None,
            "visualized": auto_visualize
        }
    except Exception as e:
        logging.error(f"加载结果失败: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"加载结果失败: {str(e)}")

@router.get("/available-results")
async def get_available_results():
    """获取可用的结果类型"""
    if not visualizer or not hasattr(visualizer, 'server'):
        raise HTTPException(status_code=400, detail="可视化服务未初始化")
        
    try:
        available_results = visualizer.server.state.available_results
        
        return {
            "status": "success",
            "results": available_results
        }
    except Exception as e:
        logging.error(f"获取可用结果失败: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"获取可用结果失败: {str(e)}")

@router.post("/update-display")
async def update_display(
    result_type: Optional[str] = None,
    scale_factor: Optional[float] = None,
    color_map: Optional[str] = None,
    show_mesh: Optional[bool] = None,
    show_edges: Optional[bool] = None,
    show_deformed: Optional[bool] = None,
    opacity: Optional[float] = None,
    slice_enabled: Optional[bool] = None,
    slice_position: Optional[float] = None,
    theme: Optional[str] = None
):
    """更新可视化显示参数"""
    if not visualizer or not hasattr(visualizer, 'server'):
        raise HTTPException(status_code=400, detail="可视化服务未初始化")
        
    try:
        # 更新状态
        state = visualizer.server.state
        
        updates = {}
        
        if result_type is not None:
            state.result_type = result_type
            updates["result_type"] = result_type
            
        if scale_factor is not None:
            state.scale_factor = scale_factor
            updates["scale_factor"] = scale_factor
            
        if color_map is not None:
            state.color_map = color_map
            updates["color_map"] = color_map
            
        if show_mesh is not None:
            state.show_mesh = show_mesh
            updates["show_mesh"] = show_mesh
            
        if show_edges is not None:
            state.show_edges = show_edges
            updates["show_edges"] = show_edges
            
        if show_deformed is not None:
            state.show_deformed = show_deformed
            updates["show_deformed"] = show_deformed
            
        if opacity is not None:
            state.opacity = opacity
            updates["opacity"] = opacity
            
        if slice_enabled is not None:
            state.slice_enabled = slice_enabled
            updates["slice_enabled"] = slice_enabled
            
        if slice_position is not None:
            state.slice_position = slice_position
            updates["slice_position"] = slice_position
            
        if theme is not None:
            state.theme = theme
            updates["theme"] = theme
        
        # 触发更新
        state.modified()
        
        return {
            "status": "success",
            "updates": updates
        }
    except Exception as e:
        logging.error(f"更新显示参数失败: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"更新显示参数失败: {str(e)}")

@router.get("/stop")
async def stop_visualizer():
    """停止可视化服务器"""
    global visualizer
    
    if not visualizer or not hasattr(visualizer, 'server'):
        return {"status": "not_running"}
        
    try:
        # 检查服务器是否正在运行
        if visualizer.server.running:
            # 停止服务器
            visualizer.server.stop()
            
        return {"status": "stopped"}
    except Exception as e:
        logging.error(f"停止可视化服务器失败: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"停止可视化服务器失败: {str(e)}")

@router.get("/screenshot")
async def take_screenshot(width: int = 800, height: int = 600, filename: Optional[str] = None):
    """获取当前可视化视图的截图"""
    if not visualizer or not hasattr(visualizer, 'server'):
        raise HTTPException(status_code=400, detail="可视化服务未初始化")
        
    try:
        # 如果未指定文件名，使用临时文件
        if not filename:
            filename = os.path.join(RESULTS_DIR, f"screenshot_{int(time.time())}.png")
            
        # 确保文件夹存在
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        # 获取渲染窗口
        render_window = visualizer.renderer.GetRenderWindow()
        
        # 设置窗口大小
        render_window.SetSize(width, height)
        
        # 创建窗口到图像过滤器
        window_to_image = vtk.vtkWindowToImageFilter()
        window_to_image.SetInput(render_window)
        window_to_image.SetScale(1)  # 可以设置缩放因子
        window_to_image.SetInputBufferTypeToRGBA()
        window_to_image.ReadFrontBufferOff()
        window_to_image.Update()
        
        # 创建PNG写入器
        writer = vtk.vtkPNGWriter()
        writer.SetFileName(filename)
        writer.SetInputConnection(window_to_image.GetOutputPort())
        writer.Write()
        
        return {
            "status": "success",
            "filename": filename,
            "width": width,
            "height": height
        }
    except Exception as e:
        logging.error(f"获取截图失败: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"获取截图失败: {str(e)}") 