import asyncio
import json
import os
import time
import tempfile
from typing import Optional, List
from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
import pyvista as pv
import numpy as np

from ..websockets.connection_manager import manager

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
    
    start_payload = {
        "status": "starting", 
        "progress": 0, 
        "message": "Starting visualization rendering..."
    }
    await manager.send_personal_message(json.dumps(start_payload), client_id)
    
    try:
        # Load mesh data
        load_payload = {
            "status": "processing", 
            "progress": 20, 
            "message": "Loading mesh data..."
        }
        await manager.send_personal_message(json.dumps(load_payload), client_id)
        
        if not os.path.exists(request.mesh_file_path):
            raise FileNotFoundError(f"Mesh file not found: {request.mesh_file_path}")
        
        mesh = pv.read(request.mesh_file_path)
        
        # Process mesh based on render type
        process_payload = {
            "status": "processing", 
            "progress": 40, 
            "message": f"Processing {request.render_type} rendering..."
        }
        await manager.send_personal_message(json.dumps(process_payload), client_id)
        
        # Apply rendering settings
        processed_mesh = _process_mesh_for_rendering(mesh, request)
        
        # Export to glTF
        export_payload = {
            "status": "processing", 
            "progress": 70, 
            "message": "Exporting to glTF format..."
        }
        await manager.send_personal_message(json.dumps(export_payload), client_id)
        
        output_dir = "./static_content/visualizations"
        os.makedirs(output_dir, exist_ok=True)
        
        timestamp = int(time.time())
        gltf_filename = f"render_{timestamp}.gltf"
        gltf_path = os.path.join(output_dir, gltf_filename)
        
        # Export mesh to glTF
        processed_mesh.save(gltf_path, binary=False)
        
        # Generate preview image
        preview_payload = {
            "status": "processing", 
            "progress": 90, 
            "message": "Generating preview image..."
        }
        await manager.send_personal_message(json.dumps(preview_payload), client_id)
        
        preview_filename = f"preview_{timestamp}.png"
        preview_path = os.path.join(output_dir, preview_filename)
        
        # Create a quick preview render
        plotter = pv.Plotter(off_screen=True, window_size=(800, 600))
        plotter.add_mesh(processed_mesh, 
                        opacity=request.opacity,
                        show_edges=request.show_edges)
        plotter.background_color = request.background_color
        plotter.camera_position = 'iso'
        plotter.screenshot(preview_path, transparent_background=True)
        plotter.close()
        
        # Collect rendering statistics
        stats = {
            "points": mesh.n_points,
            "cells": mesh.n_cells,
            "bounds": mesh.bounds.tolist(),
            "center": mesh.center.tolist(),
            "volume": float(mesh.volume) if hasattr(mesh, 'volume') else None,
            "surface_area": float(mesh.area) if hasattr(mesh, 'area') else None
        }
        
        complete_payload = {
            "status": "completed",
            "progress": 100,
            "message": "Visualization rendering complete.",
            "gltf_url": f"/static/visualizations/{gltf_filename}",
            "preview_url": f"/static/visualizations/{preview_filename}",
            "stats": stats
        }
        await manager.send_personal_message(json.dumps(complete_payload), client_id)
        
    except Exception as e:
        error_message = f"Visualization rendering failed: {e}"
        error_payload = {"status": "error", "message": error_message}
        await manager.send_personal_message(json.dumps(error_payload), client_id)
        print(f"Visualization error: {error_message}")


def _process_mesh_for_rendering(mesh: pv.DataSet, request: VisualizationRequest) -> pv.DataSet:
    """Process mesh based on rendering requirements"""
    
    processed_mesh = mesh.copy()
    
    # Apply color mapping if requested
    if request.color_by and request.color_by in processed_mesh.array_names:
        # Ensure the array is active for rendering
        processed_mesh.set_active_scalars(request.color_by)
    
    # Apply rendering type specific processing
    if request.render_type == "wireframe":
        # Extract edges for wireframe rendering
        processed_mesh = processed_mesh.extract_all_edges()
    elif request.render_type == "points":
        # Convert to point cloud
        processed_mesh = processed_mesh.extract_points()
    elif request.render_type == "surface":
        # Ensure we have surface representation
        if processed_mesh.n_faces == 0:
            processed_mesh = processed_mesh.extract_surface()
    
    return processed_mesh


async def render_volume_to_gltf(request: VolumeRenderRequest):
    """
    Background task for volume rendering with isosurfaces
    """
    client_id = request.client_id
    
    start_payload = {
        "status": "starting",
        "progress": 0,
        "message": "Starting volume rendering..."
    }
    await manager.send_personal_message(json.dumps(start_payload), client_id)
    
    try:
        # Load volume data
        load_payload = {
            "status": "processing",
            "progress": 20,
            "message": "Loading volume data..."
        }
        await manager.send_personal_message(json.dumps(load_payload), client_id)
        
        volume = pv.read(request.volume_file_path)
        
        # Generate isosurfaces
        isosurface_payload = {
            "status": "processing",
            "progress": 50,
            "message": "Generating isosurfaces..."
        }
        await manager.send_personal_message(json.dumps(isosurface_payload), client_id)
        
        # Create multiple isosurfaces if values provided
        if request.iso_values:
            contours = volume.contour(request.iso_values)
        else:
            # Auto-generate some contours
            data_range = volume.get_data_range()
            iso_values = np.linspace(data_range[0], data_range[1], 5)[1:-1]  # Skip min/max
            contours = volume.contour(iso_values.tolist())
        
        # Export contours to glTF
        export_payload = {
            "status": "processing",
            "progress": 80,
            "message": "Exporting volume render to glTF..."
        }
        await manager.send_personal_message(json.dumps(export_payload), client_id)
        
        output_dir = "./static_content/visualizations"
        os.makedirs(output_dir, exist_ok=True)
        
        timestamp = int(time.time())
        gltf_filename = f"volume_{timestamp}.gltf"
        gltf_path = os.path.join(output_dir, gltf_filename)
        
        contours.save(gltf_path, binary=False)
        
        # Generate preview
        preview_filename = f"volume_preview_{timestamp}.png"
        preview_path = os.path.join(output_dir, preview_filename)
        
        plotter = pv.Plotter(off_screen=True, window_size=(800, 600))
        plotter.add_mesh(contours, 
                        opacity=request.opacity[0] if request.opacity else 0.5,
                        cmap=request.color_map)
        plotter.camera_position = 'iso'
        plotter.screenshot(preview_path, transparent_background=True)
        plotter.close()
        
        complete_payload = {
            "status": "completed",
            "progress": 100,
            "message": "Volume rendering complete.",
            "gltf_url": f"/static/visualizations/{gltf_filename}",
            "preview_url": f"/static/visualizations/{preview_filename}",
            "stats": {
                "points": contours.n_points,
                "cells": contours.n_cells,
                "iso_values": request.iso_values or iso_values.tolist()
            }
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
    return {
        "input_formats": [
            ".vtk", ".vtu", ".vti", ".vtr", ".vts",  # VTK formats
            ".msh",  # Gmsh format
            ".ply", ".stl", ".obj",  # Mesh formats
            ".gltf", ".glb"  # 3D web formats
        ],
        "output_formats": [
            ".gltf",  # Primary output for Three.js
            ".glb",   # Binary glTF
            ".png"    # Preview images
        ]
    }


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