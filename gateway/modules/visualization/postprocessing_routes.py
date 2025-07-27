"""
后处理可视化路由
提供CAE分析结果的可视化API端点
"""

import asyncio
import json
import logging
import numpy as np
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pathlib import Path
import time

from .pyvista_web_bridge import get_pyvista_bridge
from .pyvista_state_manager import get_pyvista_state_manager
from ..computation.postprocessing_generator import get_postprocessing_generator
from ..websockets.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/postprocessing", tags=["PostProcessing Visualization"])

# 获取服务实例
bridge = get_pyvista_bridge()
state_manager = get_pyvista_state_manager()
postprocessing_generator = get_postprocessing_generator()


class PostProcessingRequest(BaseModel):
    """后处理可视化请求"""
    session_id: str
    analysis_type: str  # "structural", "thermal", "geomechanics", "coupled"
    mesh_file_path: Optional[str] = None
    n_nodes: int = 1000
    n_elements: int = 500
    mesh_bounds: List[float] = [-10, 10, -10, 10, -20, 0]  # [xmin, xmax, ymin, ymax, zmin, zmax]
    field_name: str = "von_mises_stress"
    colormap: str = "viridis"
    show_deformation: bool = True
    deformation_scale: float = 1.0


class FieldUpdateRequest(BaseModel):
    """字段切换请求"""
    session_id: str
    field_name: str
    colormap: Optional[str] = None
    data_range: Optional[List[float]] = None
    show_deformation: bool = False
    deformation_scale: float = 1.0


class ColormapRequest(BaseModel):
    """颜色映射请求"""
    session_id: str
    colormap: str
    reverse: bool = False
    n_colors: int = 256


class DeformationRequest(BaseModel):
    """变形显示请求"""
    session_id: str
    show_deformation: bool
    scale_factor: float = 1.0
    reference_field: str = "displacement"


@router.post("/generate")
async def generate_analysis_results(
    request: PostProcessingRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """生成分析结果并可视化"""
    try:
        # 验证会话
        session_state = await state_manager.get_session_state(request.session_id)
        if not session_state:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # 添加后台任务生成结果
        background_tasks.add_task(
            _generate_and_visualize_results,
            request,
            client_id
        )
        
        return JSONResponse({
            "success": True,
            "message": f"Generating {request.analysis_type} analysis results",
            "session_id": request.session_id
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to start analysis generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/field/update")
async def update_visualization_field(
    request: FieldUpdateRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """更新可视化字段"""
    try:
        # 验证会话
        session_state = await state_manager.get_session_state(request.session_id)
        if not session_state:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # 添加后台任务更新字段
        background_tasks.add_task(
            _update_field_visualization,
            request,
            client_id
        )
        
        return JSONResponse({
            "success": True,
            "message": f"Updating visualization field: {request.field_name}",
            "field_name": request.field_name
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to update field: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/colormap/update")
async def update_colormap(
    request: ColormapRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """更新颜色映射"""
    try:
        # 验证会话
        session_state = await state_manager.get_session_state(request.session_id)
        if not session_state:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # 添加后台任务更新颜色映射
        background_tasks.add_task(
            _update_colormap_visualization,
            request,
            client_id
        )
        
        return JSONResponse({
            "success": True,
            "message": f"Updating colormap: {request.colormap}",
            "colormap": request.colormap
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to update colormap: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/deformation/update")
async def update_deformation_display(
    request: DeformationRequest,
    client_id: str
) -> JSONResponse:
    """更新变形显示"""
    try:
        # 验证会话
        session_state = await state_manager.get_session_state(request.session_id)
        if not session_state:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # 通知客户端变形设置更新
        await manager.send_personal_message(json.dumps({
            "type": "deformation_updated",
            "session_id": request.session_id,
            "show_deformation": request.show_deformation,
            "scale_factor": request.scale_factor,
            "reference_field": request.reference_field
        }), client_id)
        
        return JSONResponse({
            "success": True,
            "message": "Deformation display updated",
            "show_deformation": request.show_deformation,
            "scale_factor": request.scale_factor
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to update deformation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fields/available")
async def get_available_fields(
    session_id: str,
    analysis_type: str = Query(..., description="Analysis type")
) -> JSONResponse:
    """获取可用的后处理字段"""
    try:
        # 根据分析类型返回可用字段
        if analysis_type == "structural":
            fields = [
                {"name": "von_mises_stress", "display_name": "Von Mises应力", "unit": "MPa"},
                {"name": "displacement", "display_name": "位移", "unit": "mm"},
                {"name": "principal_stress", "display_name": "主应力", "unit": "MPa"},
                {"name": "strain_energy", "display_name": "应变能密度", "unit": "J/m³"}
            ]
        elif analysis_type == "thermal":
            fields = [
                {"name": "temperature", "display_name": "温度", "unit": "°C"},
                {"name": "heat_flux", "display_name": "热流密度", "unit": "W/m²"}
            ]
        elif analysis_type == "geomechanics":
            fields = [
                {"name": "settlement", "display_name": "沉降", "unit": "mm"},
                {"name": "pore_pressure", "display_name": "孔隙水压力", "unit": "kPa"},
                {"name": "safety_factor", "display_name": "安全系数", "unit": "-"},
                {"name": "displacement", "display_name": "位移", "unit": "mm"}
            ]
        else:
            fields = []
        
        return JSONResponse({
            "success": True,
            "fields": fields,
            "analysis_type": analysis_type
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to get available fields: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/colormaps/available")
async def get_available_colormaps() -> JSONResponse:
    """获取可用的颜色映射"""
    try:
        colormaps = [
            {"name": "viridis", "display_name": "Viridis", "description": "科学可视化标准"},
            {"name": "plasma", "display_name": "Plasma", "description": "高对比度连续色谱"},
            {"name": "jet", "display_name": "Jet", "description": "经典彩虹色谱"},
            {"name": "coolwarm", "display_name": "Cool-Warm", "description": "蓝红发散色谱"},
            {"name": "hot", "display_name": "Hot", "description": "热量分布色谱"},
            {"name": "blues", "display_name": "Blues", "description": "蓝色单色谱"},
            {"name": "RdYlGn", "display_name": "Red-Yellow-Green", "description": "红黄绿安全色谱"},
            {"name": "seismic", "display_name": "Seismic", "description": "地震数据色谱"},
            {"name": "rainbow", "display_name": "Rainbow", "description": "彩虹色谱"}
        ]
        
        return JSONResponse({
            "success": True,
            "colormaps": colormaps
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to get colormaps: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}/results")
async def get_session_results(session_id: str) -> JSONResponse:
    """获取会话的分析结果信息"""
    try:
        # 检查会话状态
        session_state = await state_manager.get_session_state(session_id)
        if not session_state:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # 获取结果信息（如果有的话）
        results_info = {
            "session_id": session_id,
            "has_results": session_state.get("mesh_id") is not None,
            "current_field": session_state.get("active_scalar"),
            "available_fields": session_state.get("scalar_fields", []),
            "mesh_info": session_state.get("mesh_info", {}),
            "bounds": session_state.get("bounds", [])
        }
        
        return JSONResponse({
            "success": True,
            "results": results_info
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to get session results: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _generate_and_visualize_results(request: PostProcessingRequest, client_id: str):
    """后台任务：生成分析结果并可视化"""
    try:
        # 通知开始生成
        await manager.send_personal_message(json.dumps({
            "type": "postprocessing_started",
            "session_id": request.session_id,
            "analysis_type": request.analysis_type,
            "message": f"开始生成{request.analysis_type}分析结果..."
        }), client_id)
        
        # 生成分析结果数据
        if request.analysis_type == "structural":
            results = postprocessing_generator.generate_structural_analysis(
                request.n_nodes,
                request.n_elements,
                request.mesh_bounds
            )
        elif request.analysis_type == "thermal":
            results = postprocessing_generator.generate_thermal_analysis(
                request.n_nodes,
                request.n_elements,
                request.mesh_bounds
            )
        elif request.analysis_type == "geomechanics":
            results = postprocessing_generator.generate_geomechanics_analysis(
                request.n_nodes,
                request.n_elements,
                request.mesh_bounds
            )
        else:
            raise ValueError(f"Unsupported analysis type: {request.analysis_type}")
        
        # 通知数据生成完成
        await manager.send_personal_message(json.dumps({
            "type": "data_generated",
            "session_id": request.session_id,
            "message": "分析数据生成完成，开始创建可视化网格..."
        }), client_id)
        
        # 创建PyVista网格用于可视化
        mesh = await _create_visualization_mesh(results, request.field_name)
        
        if mesh is None:
            raise RuntimeError("Failed to create visualization mesh")
        
        # 导出为Web格式
        export_path = bridge.mesh_to_web_format(mesh, "gltf")
        if not export_path:
            raise RuntimeError("Failed to export mesh to web format")
        
        # 生成预览图
        preview_path = bridge.generate_preview_image(
            mesh,
            camera_position='iso',
            window_size=(800, 600),
            show_edges=False,
            opacity=1.0
        )
        
        # 更新会话状态
        state = state_manager.active_sessions[request.session_id]
        state.mesh_url = f"/static/web_exports/{Path(export_path).name}"
        state.scalar_fields = list(results.fields.keys())
        state.active_scalar = request.field_name
        state.mesh_info = results.mesh_info
        state.bounds = results.mesh_info["bounds"]
        
        # 通知客户端完成
        await manager.send_personal_message(json.dumps({
            "type": "postprocessing_completed",
            "session_id": request.session_id,
            "mesh_url": state.mesh_url,
            "preview_url": f"/static/previews/{Path(preview_path).name}" if preview_path else None,
            "field_info": {
                "current_field": request.field_name,
                "available_fields": list(results.fields.keys()),
                "field_details": {name: {
                    "display_name": field.display_name,
                    "unit": field.unit,
                    "data_range": field.data_range,
                    "colormap": field.colormap
                } for name, field in results.fields.items()}
            },
            "mesh_info": results.mesh_info,
            "analysis_type": request.analysis_type
        }), client_id)
        
        logger.info(f"✅ PostProcessing visualization completed: {request.analysis_type}")
        
    except Exception as e:
        error_message = f"Failed to generate analysis results: {str(e)}"
        logger.error(f"❌ {error_message}")
        
        await manager.send_personal_message(json.dumps({
            "type": "postprocessing_error",
            "session_id": request.session_id,
            "message": error_message
        }), client_id)


async def _update_field_visualization(request: FieldUpdateRequest, client_id: str):
    """后台任务：更新字段可视化"""
    try:
        # 通知开始更新
        await manager.send_personal_message(json.dumps({
            "type": "field_update_started",
            "session_id": request.session_id,
            "field_name": request.field_name,
            "message": f"正在切换到字段: {request.field_name}"
        }), client_id)
        
        # 这里需要重新生成mesh或更新现有mesh的标量字段
        # 简化实现：直接通知更新完成
        await asyncio.sleep(1)  # 模拟处理时间
        
        # 更新会话状态
        if request.session_id in state_manager.active_sessions:
            state_manager.active_sessions[request.session_id].active_scalar = request.field_name
        
        # 通知客户端更新完成
        await manager.send_personal_message(json.dumps({
            "type": "field_updated",
            "session_id": request.session_id,
            "field_name": request.field_name,
            "colormap": request.colormap,
            "data_range": request.data_range,
            "show_deformation": request.show_deformation,
            "deformation_scale": request.deformation_scale
        }), client_id)
        
        logger.info(f"✅ Field visualization updated: {request.field_name}")
        
    except Exception as e:
        error_message = f"Failed to update field visualization: {str(e)}"
        logger.error(f"❌ {error_message}")
        
        await manager.send_personal_message(json.dumps({
            "type": "field_update_error",
            "session_id": request.session_id,
            "message": error_message
        }), client_id)


async def _update_colormap_visualization(request: ColormapRequest, client_id: str):
    """后台任务：更新颜色映射"""
    try:
        # 通知开始更新
        await manager.send_personal_message(json.dumps({
            "type": "colormap_update_started",
            "session_id": request.session_id,
            "colormap": request.colormap
        }), client_id)
        
        # 模拟颜色映射更新
        await asyncio.sleep(0.5)
        
        # 通知客户端更新完成
        await manager.send_personal_message(json.dumps({
            "type": "colormap_updated",
            "session_id": request.session_id,
            "colormap": request.colormap,
            "reverse": request.reverse,
            "n_colors": request.n_colors
        }), client_id)
        
        logger.info(f"✅ Colormap updated: {request.colormap}")
        
    except Exception as e:
        error_message = f"Failed to update colormap: {str(e)}"
        logger.error(f"❌ {error_message}")
        
        await manager.send_personal_message(json.dumps({
            "type": "colormap_update_error",
            "session_id": request.session_id,
            "message": error_message
        }), client_id)


async def _create_visualization_mesh(results, field_name: str):
    """创建用于可视化的PyVista网格"""
    try:
        import pyvista as pv
        
        # 获取网格边界
        bounds = results.mesh_info["bounds"]
        n_nodes = results.mesh_info["n_nodes"]
        
        # 创建结构化网格 (简化)
        # 在实际应用中，这里应该使用真实的网格几何
        dimensions = (10, 10, 10)  # 简化为规则网格
        mesh = pv.ImageData(
            dimensions=dimensions,
            origin=(bounds[0], bounds[2], bounds[4]),
            spacing=((bounds[1]-bounds[0])/9, (bounds[3]-bounds[2])/9, (bounds[5]-bounds[4])/9)
        )
        
        # 添加后处理数据
        if field_name in results.node_data:
            field_data = results.node_data[field_name]
            
            # 如果是矢量场，计算幅值
            if len(field_data.shape) > 1:
                if field_data.shape[1] == 3:  # 3D矢量
                    magnitude = np.sqrt(np.sum(field_data**2, axis=1))
                    mesh[f"{field_name}_magnitude"] = magnitude[:mesh.n_points]
                    mesh[field_name] = field_data[:mesh.n_points]
                else:
                    mesh[field_name] = field_data[:mesh.n_points, 0]
            else:
                # 标量场
                mesh[field_name] = field_data[:mesh.n_points]
        
        # 设置活动标量
        if field_name in mesh.array_names:
            mesh.set_active_scalars(field_name)
        elif f"{field_name}_magnitude" in mesh.array_names:
            mesh.set_active_scalars(f"{field_name}_magnitude")
        
        logger.info(f"📊 Created visualization mesh: {mesh.n_points} points, field: {field_name}")
        return mesh
        
    except Exception as e:
        logger.error(f"❌ Failed to create visualization mesh: {e}")
        return None