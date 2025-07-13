import asyncio
import json
import os
import time
import tempfile
from typing import Optional, List
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
import numpy as np

from ..websockets.connection_manager import manager
from .pyvista_web_bridge import get_pyvista_bridge

router = APIRouter(prefix="/visualization")


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