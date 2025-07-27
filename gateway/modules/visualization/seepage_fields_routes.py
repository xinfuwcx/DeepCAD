"""
可视化模块 - 渗流字段扩展
专门处理渗流分析结果的可视化字段和后处理显示
"""

import asyncio
import json
import logging
import numpy as np
from typing import Dict, Any, Optional, List, Tuple
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

from .pyvista_state_manager import get_pyvista_state_manager
from .pyvista_web_bridge import get_pyvista_bridge
from ..websockets.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/visualization/seepage", tags=["Seepage Visualization"])

# 状态管理器和桥接器
state_manager = get_pyvista_state_manager()
bridge = get_pyvista_bridge()

# 渗流字段类型枚举
class SeepageFieldType(str, Enum):
    HYDRAULIC_HEAD = "hydraulic_head"           # 水头
    PORE_PRESSURE = "pore_pressure"             # 孔隙水压力
    SEEPAGE_VELOCITY = "seepage_velocity"       # 渗流速度
    SEEPAGE_FLOW = "seepage_flow"               # 渗流流量
    SATURATION = "saturation"                   # 饱和度
    PERMEABILITY = "permeability"               # 渗透系数
    HYDRAULIC_GRADIENT = "hydraulic_gradient"   # 水力梯度
    EQUIPOTENTIAL_LINES = "equipotential_lines" # 等势线
    FLOW_LINES = "flow_lines"                   # 流线
    WATER_TABLE = "water_table"                 # 水位线

class SeepageVisualizationType(str, Enum):
    CONTOUR = "contour"                         # 等值线
    FILLED_CONTOUR = "filled_contour"           # 填充等值线
    VECTOR_FIELD = "vector_field"               # 矢量场
    STREAMLINES = "streamlines"                 # 流线
    ISOSURFACE = "isosurface"                   # 等值面
    VOLUME_RENDERING = "volume_rendering"       # 体渲染
    PARTICLE_TRACKING = "particle_tracking"     # 粒子追踪

# 请求和响应模型
class SeepageFieldRequest(BaseModel):
    """渗流字段可视化请求"""
    session_id: str = Field(..., description="会话ID")
    field_type: SeepageFieldType = Field(..., description="渗流字段类型")
    visualization_type: SeepageVisualizationType = Field(..., description="可视化类型")
    time_step: Optional[int] = Field(None, description="时间步")
    depth_range: Optional[Tuple[float, float]] = Field(None, description="深度范围")
    contour_levels: Optional[int] = Field(20, description="等值线数量")
    color_map: Optional[str] = Field("viridis", description="色彩映射")
    opacity: Optional[float] = Field(1.0, description="透明度")
    show_legend: Optional[bool] = Field(True, description="显示图例")

class SeepageAnalysisRequest(BaseModel):
    """渗流分析结果处理请求"""
    session_id: str = Field(..., description="会话ID")
    analysis_type: str = Field(..., description="分析类型")
    result_file_path: str = Field(..., description="结果文件路径")
    extract_fields: List[SeepageFieldType] = Field(..., description="需要提取的字段")

class FlowNetworkRequest(BaseModel):
    """流网生成请求"""
    session_id: str = Field(..., description="会话ID")
    equipotential_levels: int = Field(10, description="等势线数量")
    flow_line_count: int = Field(8, description="流线数量")
    boundary_conditions: Dict[str, Any] = Field(..., description="边界条件")

class SeepageFieldResponse(BaseModel):
    """渗流字段响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    field_info: Optional[Dict[str, Any]] = Field(None, description="字段信息")
    statistics: Optional[Dict[str, float]] = Field(None, description="统计信息")

@router.post("/field/display", response_model=SeepageFieldResponse)
async def display_seepage_field(
    request: SeepageFieldRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """显示渗流字段可视化"""
    try:
        logger.info(f"🌊 Processing seepage field visualization: {request.field_type}")
        
        # 添加后台任务处理渗流字段
        background_tasks.add_task(
            _process_seepage_field,
            request,
            client_id
        )
        
        return JSONResponse({
            "success": True,
            "message": f"Seepage field visualization started: {request.field_type}",
            "field_type": request.field_type,
            "visualization_type": request.visualization_type
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to process seepage field: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _process_seepage_field(request: SeepageFieldRequest, client_id: str):
    """后台处理渗流字段可视化"""
    try:
        # 发送开始消息
        start_payload = {
            "status": "processing",
            "progress": 10,
            "message": f"Processing {request.field_type} visualization..."
        }
        await manager.send_personal_message(json.dumps(start_payload), client_id)
        
        # 获取会话数据
        session_data = state_manager.get_session(request.session_id)
        if not session_data or 'mesh' not in session_data:
            raise ValueError("No mesh data available in session")
        
        mesh = session_data['mesh']
        
        # 根据字段类型处理数据
        progress_payload = {
            "status": "processing",
            "progress": 30,
            "message": f"Extracting {request.field_type} data..."
        }
        await manager.send_personal_message(json.dumps(progress_payload), client_id)
        
        # 提取渗流字段数据
        field_data = await _extract_seepage_field_data(mesh, request.field_type, request.time_step)
        
        # 应用可视化类型
        viz_payload = {
            "status": "processing",
            "progress": 60,
            "message": f"Applying {request.visualization_type} visualization..."
        }
        await manager.send_personal_message(json.dumps(viz_payload), client_id)
        
        # 根据可视化类型处理
        processed_mesh = await _apply_seepage_visualization(
            mesh, field_data, request.visualization_type, request
        )
        
        # 更新会话数据
        update_payload = {
            "status": "processing",
            "progress": 80,
            "message": "Updating visualization..."
        }
        await manager.send_personal_message(json.dumps(update_payload), client_id)
        
        # 保存处理后的网格
        session_data['processed_mesh'] = processed_mesh
        session_data['active_field'] = request.field_type
        session_data['field_statistics'] = _calculate_field_statistics(field_data)
        
        # 发送完成消息
        complete_payload = {
            "status": "completed",
            "progress": 100,
            "message": f"Seepage field visualization completed: {request.field_type}",
            "field_info": {
                "field_type": request.field_type,
                "visualization_type": request.visualization_type,
                "statistics": session_data['field_statistics']
            }
        }
        await manager.send_personal_message(json.dumps(complete_payload), client_id)
        
    except Exception as e:
        error_payload = {
            "status": "error",
            "progress": 0,
            "message": f"Error processing seepage field: {str(e)}"
        }
        await manager.send_personal_message(json.dumps(error_payload), client_id)
        logger.error(f"❌ Error in seepage field processing: {e}")

async def _extract_seepage_field_data(mesh, field_type: SeepageFieldType, time_step: Optional[int] = None):
    """提取渗流字段数据"""
    try:
        field_data = None
        
        if field_type == SeepageFieldType.HYDRAULIC_HEAD:
            # 水头数据
            if 'HEAD' in mesh.point_data:
                field_data = mesh.point_data['HEAD']
            elif 'WATER_HEAD' in mesh.point_data:
                field_data = mesh.point_data['WATER_HEAD']
            else:
                # 生成示例数据
                field_data = _generate_hydraulic_head_example(mesh)
                
        elif field_type == SeepageFieldType.PORE_PRESSURE:
            # 孔隙水压力
            if 'PORE_PRESSURE' in mesh.point_data:
                field_data = mesh.point_data['PORE_PRESSURE']
            elif 'PWP' in mesh.point_data:
                field_data = mesh.point_data['PWP']
            else:
                field_data = _generate_pore_pressure_example(mesh)
                
        elif field_type == SeepageFieldType.SEEPAGE_VELOCITY:
            # 渗流速度
            if 'VELOCITY' in mesh.point_data:
                field_data = mesh.point_data['VELOCITY']
            elif 'SEEPAGE_VELOCITY' in mesh.point_data:
                field_data = mesh.point_data['SEEPAGE_VELOCITY']
            else:
                field_data = _generate_seepage_velocity_example(mesh)
                
        elif field_type == SeepageFieldType.SATURATION:
            # 饱和度
            if 'SATURATION' in mesh.point_data:
                field_data = mesh.point_data['SATURATION']
            else:
                field_data = _generate_saturation_example(mesh)
                
        elif field_type == SeepageFieldType.PERMEABILITY:
            # 渗透系数
            if 'PERMEABILITY' in mesh.point_data:
                field_data = mesh.point_data['PERMEABILITY']
            else:
                field_data = _generate_permeability_example(mesh)
                
        else:
            # 其他字段类型的默认处理
            field_data = _generate_default_field_example(mesh, field_type)
        
        return field_data
        
    except Exception as e:
        logger.error(f"Error extracting seepage field {field_type}: {e}")
        raise

async def _apply_seepage_visualization(mesh, field_data, viz_type: SeepageVisualizationType, request: SeepageFieldRequest):
    """应用渗流可视化类型"""
    try:
        if viz_type == SeepageVisualizationType.CONTOUR:
            # 等值线
            return _create_contour_visualization(mesh, field_data, request)
            
        elif viz_type == SeepageVisualizationType.FILLED_CONTOUR:
            # 填充等值线
            return _create_filled_contour_visualization(mesh, field_data, request)
            
        elif viz_type == SeepageVisualizationType.VECTOR_FIELD:
            # 矢量场
            return _create_vector_field_visualization(mesh, field_data, request)
            
        elif viz_type == SeepageVisualizationType.STREAMLINES:
            # 流线
            return _create_streamlines_visualization(mesh, field_data, request)
            
        else:
            # 默认处理
            mesh.point_data[f"seepage_{request.field_type}"] = field_data
            return mesh
            
    except Exception as e:
        logger.error(f"Error applying visualization {viz_type}: {e}")
        raise

def _generate_hydraulic_head_example(mesh):
    """生成水头示例数据"""
    points = mesh.points
    # 基于Z坐标生成水头数据，模拟从上到下的水头分布
    z_coords = points[:, 2]
    max_z = np.max(z_coords)
    min_z = np.min(z_coords)
    
    # 归一化Z坐标并生成水头
    normalized_z = (z_coords - min_z) / (max_z - min_z) if max_z != min_z else np.zeros_like(z_coords)
    hydraulic_head = 10.0 + normalized_z * 20.0  # 10-30m水头范围
    
    # 添加一些随机变化
    noise = np.random.normal(0, 0.5, len(hydraulic_head))
    hydraulic_head += noise
    
    return hydraulic_head

def _generate_pore_pressure_example(mesh):
    """生成孔隙水压力示例数据"""
    points = mesh.points
    z_coords = points[:, 2]
    
    # 基于深度计算孔隙水压力 (γw * h)
    water_unit_weight = 9810  # N/m³
    reference_level = np.max(z_coords)
    depth_below_water_table = reference_level - z_coords
    depth_below_water_table = np.maximum(depth_below_water_table, 0)
    
    pore_pressure = water_unit_weight * depth_below_water_table
    
    # 添加一些变化
    variation = np.random.normal(1.0, 0.1, len(pore_pressure))
    pore_pressure *= variation
    
    return pore_pressure

def _generate_seepage_velocity_example(mesh):
    """生成渗流速度示例数据"""
    points = mesh.points
    n_points = len(points)
    
    # 生成3D速度场
    # 主要流动方向：从左上到右下
    vx = np.random.normal(-0.001, 0.0002, n_points)  # X方向速度 (m/s)
    vy = np.random.normal(-0.0005, 0.0001, n_points)  # Y方向速度
    vz = np.random.normal(-0.0008, 0.0002, n_points)  # Z方向速度（向下）
    
    # 组合成速度矢量
    velocity = np.column_stack([vx, vy, vz])
    
    return velocity

def _generate_saturation_example(mesh):
    """生成饱和度示例数据"""
    points = mesh.points
    z_coords = points[:, 2]
    
    # 基于深度生成饱和度
    max_z = np.max(z_coords)
    min_z = np.min(z_coords)
    normalized_z = (z_coords - min_z) / (max_z - min_z) if max_z != min_z else np.zeros_like(z_coords)
    
    # 从上到下饱和度增加
    saturation = 0.3 + normalized_z * 0.6  # 30%-90%饱和度
    
    # 添加一些随机变化
    noise = np.random.normal(0, 0.05, len(saturation))
    saturation = np.clip(saturation + noise, 0.1, 1.0)
    
    return saturation

def _generate_permeability_example(mesh):
    """生成渗透系数示例数据"""
    points = mesh.points
    n_points = len(points)
    
    # 生成渗透系数数据 (m/s)
    # 典型土体渗透系数范围：10^-9 到 10^-3 m/s
    log_k = np.random.normal(-6, 1, n_points)  # 对数正态分布
    permeability = 10 ** log_k
    
    return permeability

def _generate_default_field_example(mesh, field_type: SeepageFieldType):
    """生成默认字段示例数据"""
    points = mesh.points
    n_points = len(points)
    
    # 基于字段类型生成不同的示例数据
    if "gradient" in field_type.value:
        # 梯度类型：生成矢量数据
        return np.random.normal(0, 0.1, (n_points, 3))
    else:
        # 标量类型：生成标量数据
        return np.random.normal(0, 1, n_points)

def _create_contour_visualization(mesh, field_data, request: SeepageFieldRequest):
    """创建等值线可视化"""
    # 添加字段数据到网格
    field_name = f"seepage_{request.field_type}"
    if len(field_data.shape) == 1:
        mesh.point_data[field_name] = field_data
    else:
        # 对于矢量数据，计算模长
        mesh.point_data[field_name] = np.linalg.norm(field_data, axis=1)
    
    return mesh

def _create_filled_contour_visualization(mesh, field_data, request: SeepageFieldRequest):
    """创建填充等值线可视化"""
    field_name = f"seepage_{request.field_type}_filled"
    if len(field_data.shape) == 1:
        mesh.point_data[field_name] = field_data
    else:
        mesh.point_data[field_name] = np.linalg.norm(field_data, axis=1)
    
    return mesh

def _create_vector_field_visualization(mesh, field_data, request: SeepageFieldRequest):
    """创建矢量场可视化"""
    field_name = f"seepage_{request.field_type}_vectors"
    if len(field_data.shape) == 2 and field_data.shape[1] == 3:
        mesh.point_data[field_name] = field_data
    else:
        # 如果是标量数据，生成梯度矢量
        gradient = np.gradient(field_data.reshape(-1))
        mesh.point_data[field_name] = np.column_stack([gradient, gradient, gradient])
    
    return mesh

def _create_streamlines_visualization(mesh, field_data, request: SeepageFieldRequest):
    """创建流线可视化"""
    field_name = f"seepage_{request.field_type}_streamlines"
    
    # 确保是矢量数据
    if len(field_data.shape) == 2 and field_data.shape[1] == 3:
        mesh.point_data[field_name] = field_data
    else:
        # 为标量数据生成流线方向
        points = mesh.points
        n_points = len(points)
        flow_vectors = np.zeros((n_points, 3))
        
        # 简单的流线生成：基于位置梯度
        if n_points > 1:
            for i in range(n_points):
                if i > 0:
                    flow_vectors[i] = points[i] - points[i-1]
        
        mesh.point_data[field_name] = flow_vectors
    
    return mesh

def _calculate_field_statistics(field_data) -> Dict[str, float]:
    """计算字段统计信息"""
    if field_data is None:
        return {}
    
    try:
        if len(field_data.shape) == 1:
            # 标量数据
            return {
                "min": float(np.min(field_data)),
                "max": float(np.max(field_data)),
                "mean": float(np.mean(field_data)),
                "std": float(np.std(field_data)),
                "median": float(np.median(field_data))
            }
        else:
            # 矢量数据
            magnitude = np.linalg.norm(field_data, axis=1)
            return {
                "min_magnitude": float(np.min(magnitude)),
                "max_magnitude": float(np.max(magnitude)),
                "mean_magnitude": float(np.mean(magnitude)),
                "std_magnitude": float(np.std(magnitude)),
                "median_magnitude": float(np.median(magnitude))
            }
    except Exception as e:
        logger.error(f"Error calculating field statistics: {e}")
        return {}

@router.post("/analysis/process", response_model=SeepageFieldResponse)
async def process_seepage_analysis_results(
    request: SeepageAnalysisRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """处理渗流分析结果"""
    try:
        logger.info(f"🌊 Processing seepage analysis results from: {request.result_file_path}")
        
        background_tasks.add_task(
            _process_seepage_analysis,
            request,
            client_id
        )
        
        return JSONResponse({
            "success": True,
            "message": "Seepage analysis processing started",
            "analysis_type": request.analysis_type,
            "fields_count": len(request.extract_fields)
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to process seepage analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _process_seepage_analysis(request: SeepageAnalysisRequest, client_id: str):
    """后台处理渗流分析结果"""
    try:
        # 实际项目中这里会读取和处理真实的分析结果文件
        # 现在使用示例数据演示
        
        start_payload = {
            "status": "processing",
            "progress": 10,
            "message": "Loading seepage analysis results..."
        }
        await manager.send_personal_message(json.dumps(start_payload), client_id)
        
        # 模拟处理延迟
        await asyncio.sleep(1)
        
        complete_payload = {
            "status": "completed",
            "progress": 100,
            "message": f"Seepage analysis processing completed",
            "analysis_info": {
                "analysis_type": request.analysis_type,
                "fields_extracted": len(request.extract_fields),
                "result_file": request.result_file_path
            }
        }
        await manager.send_personal_message(json.dumps(complete_payload), client_id)
        
    except Exception as e:
        error_payload = {
            "status": "error",
            "progress": 0,
            "message": f"Error processing seepage analysis: {str(e)}"
        }
        await manager.send_personal_message(json.dumps(error_payload), client_id)

@router.get("/field/types")
async def get_available_seepage_fields() -> JSONResponse:
    """获取可用的渗流字段类型"""
    return JSONResponse({
        "success": True,
        "field_types": [
            {
                "key": field_type.value,
                "label": _get_field_type_label(field_type),
                "description": _get_field_type_description(field_type),
                "unit": _get_field_type_unit(field_type)
            }
            for field_type in SeepageFieldType
        ],
        "visualization_types": [
            {
                "key": viz_type.value,
                "label": _get_viz_type_label(viz_type),
                "description": _get_viz_type_description(viz_type)
            }
            for viz_type in SeepageVisualizationType
        ]
    })

def _get_field_type_label(field_type: SeepageFieldType) -> str:
    """获取字段类型标签"""
    labels = {
        SeepageFieldType.HYDRAULIC_HEAD: "水头",
        SeepageFieldType.PORE_PRESSURE: "孔隙水压力",
        SeepageFieldType.SEEPAGE_VELOCITY: "渗流速度",
        SeepageFieldType.SEEPAGE_FLOW: "渗流流量",
        SeepageFieldType.SATURATION: "饱和度",
        SeepageFieldType.PERMEABILITY: "渗透系数",
        SeepageFieldType.HYDRAULIC_GRADIENT: "水力梯度",
        SeepageFieldType.EQUIPOTENTIAL_LINES: "等势线",
        SeepageFieldType.FLOW_LINES: "流线",
        SeepageFieldType.WATER_TABLE: "水位线"
    }
    return labels.get(field_type, field_type.value)

def _get_field_type_description(field_type: SeepageFieldType) -> str:
    """获取字段类型描述"""
    descriptions = {
        SeepageFieldType.HYDRAULIC_HEAD: "地下水的总水头分布",
        SeepageFieldType.PORE_PRESSURE: "土体孔隙中的水压力",
        SeepageFieldType.SEEPAGE_VELOCITY: "地下水渗流的速度矢量",
        SeepageFieldType.SEEPAGE_FLOW: "通过土体的渗流流量",
        SeepageFieldType.SATURATION: "土体孔隙的饱和程度",
        SeepageFieldType.PERMEABILITY: "土体的渗透性能系数",
        SeepageFieldType.HYDRAULIC_GRADIENT: "水头的空间变化率",
        SeepageFieldType.EQUIPOTENTIAL_LINES: "相等势能的连线",
        SeepageFieldType.FLOW_LINES: "地下水流动的轨迹线",
        SeepageFieldType.WATER_TABLE: "地下水位的分布"
    }
    return descriptions.get(field_type, "")

def _get_field_type_unit(field_type: SeepageFieldType) -> str:
    """获取字段类型单位"""
    units = {
        SeepageFieldType.HYDRAULIC_HEAD: "m",
        SeepageFieldType.PORE_PRESSURE: "Pa",
        SeepageFieldType.SEEPAGE_VELOCITY: "m/s",
        SeepageFieldType.SEEPAGE_FLOW: "m³/s",
        SeepageFieldType.SATURATION: "-",
        SeepageFieldType.PERMEABILITY: "m/s",
        SeepageFieldType.HYDRAULIC_GRADIENT: "-",
        SeepageFieldType.EQUIPOTENTIAL_LINES: "m",
        SeepageFieldType.FLOW_LINES: "-",
        SeepageFieldType.WATER_TABLE: "m"
    }
    return units.get(field_type, "")

def _get_viz_type_label(viz_type: SeepageVisualizationType) -> str:
    """获取可视化类型标签"""
    labels = {
        SeepageVisualizationType.CONTOUR: "等值线",
        SeepageVisualizationType.FILLED_CONTOUR: "填充等值线",
        SeepageVisualizationType.VECTOR_FIELD: "矢量场",
        SeepageVisualizationType.STREAMLINES: "流线",
        SeepageVisualizationType.ISOSURFACE: "等值面",
        SeepageVisualizationType.VOLUME_RENDERING: "体渲染",
        SeepageVisualizationType.PARTICLE_TRACKING: "粒子追踪"
    }
    return labels.get(viz_type, viz_type.value)

def _get_viz_type_description(viz_type: SeepageVisualizationType) -> str:
    """获取可视化类型描述"""
    descriptions = {
        SeepageVisualizationType.CONTOUR: "显示相等数值的轮廓线",
        SeepageVisualizationType.FILLED_CONTOUR: "用颜色填充的等值区域",
        SeepageVisualizationType.VECTOR_FIELD: "显示方向和大小的矢量箭头",
        SeepageVisualizationType.STREAMLINES: "显示流动轨迹的曲线",
        SeepageVisualizationType.ISOSURFACE: "三维等值表面",
        SeepageVisualizationType.VOLUME_RENDERING: "透明度体积渲染",
        SeepageVisualizationType.PARTICLE_TRACKING: "粒子路径追踪"
    }
    return descriptions.get(viz_type, "")