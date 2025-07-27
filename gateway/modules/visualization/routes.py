"""
PyVista可视化路由 - 优化的前后端数据传输接口
提供高效的WebSocket和REST API端点
"""

import asyncio
import json
import logging
import os
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime

from .pyvista_state_manager import get_pyvista_state_manager
from .pyvista_web_bridge import get_pyvista_bridge
from ..websockets.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/visualization", tags=["PyVista Visualization"])

# 状态管理器和桥接器
state_manager = get_pyvista_state_manager()
bridge = get_pyvista_bridge()


class MeshLoadRequest(BaseModel):
    """网格加载请求"""
    session_id: str
    mesh_source: str
    render_type: str = "surface"
    color_by: Optional[str] = None
    enable_compression: bool = True


class ScalarUpdateRequest(BaseModel):
    """标量字段更新请求"""
    session_id: str
    scalar_name: str


class CameraStateUpdate(BaseModel):
    """相机状态更新"""
    session_id: str
    position: List[float]
    target: List[float]
    up: List[float]
    zoom: float = 1.0


class RenderSettingsUpdate(BaseModel):
    """渲染设置更新"""
    session_id: str
    render_mode: str = "solid"
    show_edges: bool = False
    opacity: float = 1.0
    color_map: str = "viridis"


class TimeSeriesRequest(BaseModel):
    """时间序列动画请求"""
    session_id: str
    time_series_files: List[str]
    frame_rate: int = 30


# Legacy models for backward compatibility
class VisualizationRequest(BaseModel):
    """Request for visualization rendering"""
    mesh_file_path: str
    client_id: str
    render_type: str = "surface"  # surface, wireframe, points, volume
    color_by: Optional[str] = None  # field name for coloring
    opacity: float = 1.0
    show_edges: bool = False
    background_color: List[float] = [0.1, 0.1, 0.1]


class VolumeRenderRequest(BaseModel):
    """Request for volume rendering"""
    volume_file_path: str
    client_id: str
    iso_values: List[float] = []  # Isosurface values
    opacity: List[float] = [0.5]
    color_map: str = "viridis"


class VisualizationResponse(BaseModel):
    """Response containing render results"""
    message: str
    gltf_url: str
    preview_image_url: Optional[str] = None
    render_stats: dict


async def render_mesh_to_gltf(request: VisualizationRequest):
    """
    Background task to render mesh data to glTF format for Three.js
    """
    client_id = request.client_id
    bridge = get_pyvista_bridge()
    
    start_payload = {
        "status": "starting", 
        "progress": 0, 
        "message": "Starting visualization rendering..."
    }
    await manager.send_personal_message(json.dumps(start_payload), client_id)
    
    try:
        # Check PyVista availability
        if not bridge.is_available:
            raise RuntimeError("PyVista not available for mesh processing")
        
        # Load mesh data
        load_payload = {
            "status": "processing", 
            "progress": 20, 
            "message": "Loading mesh data..."
        }
        await manager.send_personal_message(json.dumps(load_payload), client_id)
        
        mesh = bridge.load_mesh(request.mesh_file_path)
        if mesh is None:
            raise FileNotFoundError(f"Failed to load mesh file: {request.mesh_file_path}")
        
        # Process mesh based on render type
        process_payload = {
            "status": "processing", 
            "progress": 40, 
            "message": f"Processing {request.render_type} rendering..."
        }
        await manager.send_personal_message(json.dumps(process_payload), client_id)
        
        # Apply rendering settings using bridge
        processed_mesh = bridge.process_mesh_for_web(mesh, request.render_type, request.color_by)
        if processed_mesh is None:
            raise RuntimeError("Failed to process mesh for rendering")
        
        # Export to glTF
        export_payload = {
            "status": "processing", 
            "progress": 70, 
            "message": "Exporting to glTF format..."
        }
        await manager.send_personal_message(json.dumps(export_payload), client_id)
        
        # Export mesh to glTF using bridge
        gltf_path = bridge.mesh_to_web_format(processed_mesh, "gltf")
        if gltf_path is None:
            raise RuntimeError("Failed to export mesh to glTF format")
        
        # Generate preview image
        preview_payload = {
            "status": "processing", 
            "progress": 90, 
            "message": "Generating preview image..."
        }
        await manager.send_personal_message(json.dumps(preview_payload), client_id)
        
        # Generate preview using bridge
        preview_path = bridge.generate_preview_image(
            processed_mesh,
            camera_position='iso',
            window_size=(800, 600),
            background_color=request.background_color,
            show_edges=request.show_edges,
            opacity=request.opacity
        )
        
        # Collect rendering statistics using bridge
        stats = bridge.get_mesh_info(mesh)
        
        # Extract filename from full path for URL construction
        gltf_filename = os.path.basename(gltf_path)
        preview_filename = os.path.basename(preview_path) if preview_path else None
        
        complete_payload = {
            "status": "completed",
            "progress": 100,
            "message": "Visualization rendering complete.",
            "gltf_url": f"/static/web_exports/{gltf_filename}",
            "preview_url": f"/static/previews/{preview_filename}" if preview_filename else None,
            "stats": stats
        }
        await manager.send_personal_message(json.dumps(complete_payload), client_id)
        
    except Exception as e:
        error_message = f"Visualization rendering failed: {e}"
        error_payload = {"status": "error", "message": error_message}
        await manager.send_personal_message(json.dumps(error_payload), client_id)
        print(f"Visualization error: {error_message}")




async def render_volume_to_gltf(request: VolumeRenderRequest):
    """
    Background task for volume rendering with isosurfaces
    """
    client_id = request.client_id
    bridge = get_pyvista_bridge()
    
    start_payload = {
        "status": "starting",
        "progress": 0,
        "message": "Starting volume rendering..."
    }
    await manager.send_personal_message(json.dumps(start_payload), client_id)
    
    try:
        # Check PyVista availability
        if not bridge.is_available:
            raise RuntimeError("PyVista not available for volume processing")
        
        # Load volume data
        load_payload = {
            "status": "processing",
            "progress": 20,
            "message": "Loading volume data..."
        }
        await manager.send_personal_message(json.dumps(load_payload), client_id)
        
        volume = bridge.load_mesh(request.volume_file_path)
        if volume is None:
            raise FileNotFoundError(f"Failed to load volume file: {request.volume_file_path}")
        
        # Generate isosurfaces
        isosurface_payload = {
            "status": "processing",
            "progress": 50,
            "message": "Generating isosurfaces..."
        }
        await manager.send_personal_message(json.dumps(isosurface_payload), client_id)
        
        # Create isosurfaces using bridge
        contours = bridge.create_volume_isosurfaces(volume, request.iso_values)
        if contours is None:
            raise RuntimeError("Failed to generate isosurfaces")
        
        # Export contours to glTF
        export_payload = {
            "status": "processing",
            "progress": 80,
            "message": "Exporting volume render to glTF..."
        }
        await manager.send_personal_message(json.dumps(export_payload), client_id)
        
        # Export using bridge
        gltf_path = bridge.mesh_to_web_format(contours, "gltf")
        if gltf_path is None:
            raise RuntimeError("Failed to export volume contours to glTF format")
        
        # Generate preview using bridge
        preview_path = bridge.generate_preview_image(
            contours,
            camera_position='iso',
            window_size=(800, 600),
            opacity=request.opacity[0] if request.opacity else 0.5
        )
        
        # Extract filenames for URLs
        gltf_filename = os.path.basename(gltf_path)
        preview_filename = os.path.basename(preview_path) if preview_path else None
        
        # Get contour stats using bridge
        stats = bridge.get_mesh_info(contours)
        stats["iso_values"] = request.iso_values or []
        
        complete_payload = {
            "status": "completed",
            "progress": 100,
            "message": "Volume rendering complete.",
            "gltf_url": f"/static/web_exports/{gltf_filename}",
            "preview_url": f"/static/previews/{preview_filename}" if preview_filename else None,
            "stats": stats
        }
        await manager.send_personal_message(json.dumps(complete_payload), client_id)
        
    except Exception as e:
        error_message = f"Volume rendering failed: {e}"
        error_payload = {"status": "error", "message": error_message}
        await manager.send_personal_message(json.dumps(error_payload), client_id)
        print(f"Volume rendering error: {error_message}")


@router.post("/render-mesh")
async def render_mesh_endpoint(request: VisualizationRequest, background_tasks: BackgroundTasks):
    """
    Endpoint to start mesh visualization rendering
    """
    background_tasks.add_task(render_mesh_to_gltf, request)
    return {
        "message": "Mesh visualization rendering started in background.",
        "client_id": request.client_id
    }


@router.post("/render-volume")
async def render_volume_endpoint(request: VolumeRenderRequest, background_tasks: BackgroundTasks):
    """
    Endpoint to start volume visualization rendering
    """
    background_tasks.add_task(render_volume_to_gltf, request)
    return {
        "message": "Volume visualization rendering started in background.",
        "client_id": request.client_id
    }


@router.get("/formats")
async def get_supported_formats():
    """
    Get list of supported input/output formats
    """
    bridge = get_pyvista_bridge()
    return bridge.get_supported_formats()


@router.get("/presets")
async def get_render_presets():
    """
    Get predefined rendering presets for common use cases
    """
    return {
        "engineering": {
            "render_type": "surface",
            "show_edges": True,
            "opacity": 0.8,
            "background_color": [0.95, 0.95, 0.95]
        },
        "scientific": {
            "render_type": "surface", 
            "show_edges": False,
            "opacity": 1.0,
            "background_color": [0.1, 0.1, 0.1]
        },
        "transparent": {
            "render_type": "surface",
            "show_edges": True, 
            "opacity": 0.3,
            "background_color": [1.0, 1.0, 1.0]
        },
        "wireframe": {
            "render_type": "wireframe",
            "show_edges": True,
            "opacity": 1.0,
            "background_color": [0.0, 0.0, 0.0]
        }
    }


@router.get("/health")
async def visualization_health_check():
    """
    PyVista Web Bridge健康检查
    """
    bridge = get_pyvista_bridge()
    return bridge.health_check()


# New optimized API endpoints for enhanced state management

@router.post("/session/create")
async def create_visualization_session(client_id: str) -> JSONResponse:
    """创建新的可视化会话"""
    try:
        if not bridge.is_available:
            raise HTTPException(
                status_code=503, 
                detail="PyVista is not available on this server"
            )
        
        session_id = await state_manager.create_session(client_id)
        
        return JSONResponse({
            "success": True,
            "session_id": session_id,
            "bridge_status": bridge.health_check()
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to create session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mesh/load")
async def load_mesh_data(
    request: MeshLoadRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """异步加载网格数据"""
    try:
        # 验证文件路径
        mesh_path = Path(request.mesh_source)
        if not mesh_path.exists():
            raise HTTPException(
                status_code=404, 
                detail=f"Mesh file not found: {request.mesh_source}"
            )
        
        # 添加后台任务加载网格
        background_tasks.add_task(
            state_manager.load_mesh_async,
            request.session_id,
            client_id,
            request.mesh_source,
            {
                "render_type": request.render_type,
                "color_by": request.color_by,
                "enable_compression": request.enable_compression
            }
        )
        
        return JSONResponse({
            "success": True,
            "message": "Mesh loading started",
            "session_id": request.session_id
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to start mesh loading: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scalar/update")
async def update_scalar_field(
    request: ScalarUpdateRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """更新活动标量字段"""
    try:
        # 添加后台任务更新标量
        background_tasks.add_task(
            state_manager.update_scalar_field,
            request.session_id,
            client_id,
            request.scalar_name
        )
        
        return JSONResponse({
            "success": True,
            "message": "Scalar field update started",
            "active_scalar": request.scalar_name
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to update scalar field: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/camera/update")
async def update_camera_state(request: CameraStateUpdate) -> JSONResponse:
    """更新相机状态"""
    try:
        camera_state = {
            "position": request.position,
            "target": request.target,
            "up": request.up,
            "zoom": request.zoom
        }
        
        success = await state_manager.update_camera_state(
            request.session_id,
            camera_state
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return JSONResponse({
            "success": True,
            "message": "Camera state updated"
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to update camera state: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/render/settings")
async def update_render_settings(
    request: RenderSettingsUpdate,
    client_id: str
) -> JSONResponse:
    """更新渲染设置"""
    try:
        render_settings = {
            "render_mode": request.render_mode,
            "show_edges": request.show_edges,
            "opacity": request.opacity,
            "color_map": request.color_map
        }
        
        success = await state_manager.update_render_settings(
            request.session_id,
            client_id,
            render_settings
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return JSONResponse({
            "success": True,
            "message": "Render settings updated"
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to update render settings: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/animation/timeseries")
async def create_time_series_animation(
    request: TimeSeriesRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """创建时间序列动画"""
    try:
        # 验证所有文件存在
        missing_files = []
        for file_path in request.time_series_files:
            if not Path(file_path).exists():
                missing_files.append(file_path)
        
        if missing_files:
            raise HTTPException(
                status_code=404,
                detail=f"Missing files: {missing_files}"
            )
        
        # 添加后台任务创建动画
        background_tasks.add_task(
            state_manager.create_time_series_animation,
            request.session_id,
            client_id,
            request.time_series_files
        )
        
        return JSONResponse({
            "success": True,
            "message": "Time series animation creation started",
            "total_frames": len(request.time_series_files)
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to create time series animation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/session/{session_id}/state")
async def get_session_state(session_id: str) -> JSONResponse:
    """获取会话状态"""
    try:
        state = await state_manager.get_session_state(session_id)
        
        if state is None:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return JSONResponse({
            "success": True,
            "state": state
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to get session state: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/session/{session_id}")
async def cleanup_session(session_id: str, client_id: str) -> JSONResponse:
    """清理会话"""
    try:
        success = await state_manager.cleanup_session(session_id, client_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        
        return JSONResponse({
            "success": True,
            "message": "Session cleaned up"
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to cleanup session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_visualization_status() -> JSONResponse:
    """获取可视化服务状态"""
    try:
        bridge_health = bridge.health_check()
        performance_stats = state_manager.get_performance_stats()
        supported_formats = bridge.get_supported_formats()
        
        return JSONResponse({
            "success": True,
            "bridge_health": bridge_health,
            "performance": performance_stats,
            "supported_formats": supported_formats
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to get status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize")
async def optimize_performance(background_tasks: BackgroundTasks) -> JSONResponse:
    """触发性能优化"""
    try:
        background_tasks.add_task(state_manager.optimize_performance)
        
        return JSONResponse({
            "success": True,
            "message": "Performance optimization started"
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to start optimization: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mesh/convert")
async def convert_mesh_format(
    source_path: str,
    client_id: str,
    background_tasks: BackgroundTasks,
    target_format: str = "gltf"
) -> JSONResponse:
    """转换网格格式"""
    try:
        if not Path(source_path).exists():
            raise HTTPException(
                status_code=404,
                detail=f"Source file not found: {source_path}"
            )
        
        # 验证目标格式
        supported_formats = bridge.get_supported_formats()
        if f".{target_format}" not in supported_formats["output_formats"]:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported target format: {target_format}"
            )
        
        async def convert_task():
            try:
                # 加载网格
                mesh = bridge.load_mesh(source_path)
                if mesh is None:
                    await manager.send_personal_message(json.dumps({
                        "type": "conversion_error",
                        "message": "Failed to load source mesh"
                    }), client_id)
                    return
                
                # 转换格式
                output_path = bridge.mesh_to_web_format(mesh, target_format)
                if output_path:
                    await manager.send_personal_message(json.dumps({
                        "type": "conversion_complete",
                        "output_path": output_path,
                        "download_url": f"/static/web_exports/{Path(output_path).name}"
                    }), client_id)
                else:
                    await manager.send_personal_message(json.dumps({
                        "type": "conversion_error",
                        "message": "Failed to convert mesh format"
                    }), client_id)
                    
            except Exception as e:
                await manager.send_personal_message(json.dumps({
                    "type": "conversion_error",
                    "message": str(e)
                }), client_id)
        
        # 添加转换任务
        background_tasks.add_task(convert_task)
        
        return JSONResponse({
            "success": True,
            "message": "Mesh conversion started",
            "target_format": target_format
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to start mesh conversion: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# WebSocket端点用于实时数据流
@router.websocket("/ws/{client_id}")
async def visualization_websocket(websocket, client_id: str):
    """PyVista可视化专用WebSocket端点"""
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            # 接收客户端消息
            data = await websocket.receive_text()
            message = json.loads(data)
            
            message_type = message.get("type")
            
            if message_type == "ping":
                await manager.send_personal_message(json.dumps({
                    "type": "pong",
                    "timestamp": message.get("timestamp")
                }), client_id)
                
            elif message_type == "session_heartbeat":
                session_id = message.get("session_id")
                if session_id in state_manager.active_sessions:
                    state_manager.active_sessions[session_id].last_updated = datetime.now()
                    
            elif message_type == "request_status":
                status = state_manager.get_performance_stats()
                await manager.send_personal_message(json.dumps({
                    "type": "status_response",
                    "status": status
                }), client_id)
            
    except Exception as e:
        logger.error(f"❌ WebSocket error for client {client_id}: {e}")
    finally:
        await manager.disconnect(client_id)