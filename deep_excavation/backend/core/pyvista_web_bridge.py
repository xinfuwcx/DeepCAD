"""
GemPy Web Bridge
Converts GemPy model outputs to web-friendly formats for frontend visualization
"""

from typing import Dict, Any
from pathlib import Path
import logging

import pyvista as pv

logger = logging.getLogger(__name__)

def pyvista_mesh_to_json(mesh: pv.PolyData, name: str) -> Dict[str, Any]:
    """
    Converts a PyVista mesh object to a web-friendly JSON format.

    Args:
        mesh: The PyVista PolyData mesh.
        name: The name to assign to the mesh.

    Returns:
        A JSON-compatible dictionary representing the mesh.
    """
    if not isinstance(mesh, pv.PolyData):
        raise TypeError("Input mesh must be a PyVista PolyData object.")

    if mesh.n_faces == 0:
        logger.warning(f"Mesh '{name}' has no faces, skipping serialization.")
        return {}

    # PyVista faces array is [n_points, p1, p2, ..., pn, ...].
    # We convert it to a list of lists [[p1, p2, p3], ...].
    faces = mesh.faces.reshape((-1, 4))[:, 1:]

    return {
        "name": name,
        "type": "surface",
        "vertices": mesh.points.tolist(),
        "faces": faces.tolist(),
        "color": mesh.field_data.get("color", ["#C4A484"])[0]
    }

def gempy_mesh_to_json(model_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Converts GemPy model data to a web-friendly JSON format.
    
    Args:
        model_data: Dictionary containing GemPy model data
        
    Returns:
        JSON-compatible dictionary with model data
    """
    logger.info("Converting GemPy model data to JSON format")
    
    meshes = model_data.get("meshes", [])
    processed_meshes = []
    
    for mesh in meshes:
        processed_mesh = {
            "name": mesh.get("name", "unknown"),
            "type": mesh.get("type", "surface"),
            "color": mesh.get("color", "#AAAAAA"),
        }
        
        if "vertices" in mesh:
            vertices = mesh["vertices"]
            processed_mesh["vertices"] = (
                vertices.tolist() if hasattr(vertices, 'tolist') else vertices
            )
            
        if "faces" in mesh:
            faces = mesh["faces"]
            processed_mesh["faces"] = (
                faces.tolist() if hasattr(faces, 'tolist') else faces
            )
        
        if mesh.get("type") == "volume" and "volume_data" in mesh:
            processed_mesh["volume_data"] = mesh["volume_data"]
            processed_mesh["lith_id"] = mesh.get("lith_id")
            
        processed_meshes.append(processed_mesh)
    
    web_data = {
        "meshes": processed_meshes,
        "preview_image": model_data.get("preview_image"),
        "model_info": model_data.get("model_info", {})
    }
    
    logger.info(
        f"Successfully converted model with {len(processed_meshes)} meshes to JSON"
    )
    return web_data

class GemPyWebBridge:
    """
    GemPy to Web data bridge
    
    Core functionality:
    1. Converts GemPy model outputs to web-friendly formats
    2. Provides utilities for serializing geological models
    3. Handles image generation and conversion
    """
    
    def __init__(self, cache_dir: str = None):
        """
        Initialize the GemPy Web Bridge
        
        Args:
            cache_dir: Cache directory path
        """
        self.cache_dir = Path(cache_dir) if cache_dir else Path.cwd() / "gempy_cache"
        self.cache_dir.mkdir(exist_ok=True)
        logger.info(f"GemPy Web Bridge initialized, cache directory: {self.cache_dir}")
    
    async def serialize_model(self, model_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Serialize a GemPy model for web visualization
        
        Args:
            model_data: Dictionary containing GemPy model data
            
        Returns:
            Web-friendly serialized model data
        """
        return gempy_mesh_to_json(model_data)
    
    async def generate_preview_image(self, image_data: str) -> Dict[str, Any]:
        """
        Process a base64 image from GemPy for web display
        
        Args:
            image_data: Base64-encoded image data
            
        Returns:
            Dictionary with processed image data
        """
        return {
            "preview_image": image_data,
            "thumbnail": image_data
        }