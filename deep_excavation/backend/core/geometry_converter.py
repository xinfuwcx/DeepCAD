"""
This module provides utility functions to convert geometry objects from PyVista
into a JSON-serializable format that is optimized for consumption by frontend
frameworks like three.js.
"""
import pyvista as pv
from loguru import logger


def pyvista_to_threejs_json(mesh: pv.PolyData) -> dict:
    """
    Converts a PyVista mesh to a three.js JSON format.
    The format includes vertices, normals, and faces.
    """
    logger.debug(f"Converting PyVista mesh '{mesh}' to three.js format.")

    # Ensure the mesh is triangulated for consistent rendering
    if not mesh.is_all_triangles:
        mesh = mesh.triangulate()
        logger.debug("Mesh was not fully triangulated. Triangulating now.")

    # Extract vertices
    vertices = mesh.points.flatten().tolist()

    # Ensure normals are present
    if mesh.point_data.active_normals is not None:
        normals = mesh.point_data.active_normals.flatten().tolist()
    else:
        logger.warning("No normals found on mesh. Computing normals now.")
        # Compute normals if they don't exist
        mesh.compute_normals(point_normals=True, cell_normals=False, inplace=True)
        normals = mesh.point_data.active_normals.flatten().tolist()

    # PyVista's faces array is like [3, p1, p2, p3, 3, p4, p5, p6, ...]
    # We need to extract just the vertex indices [p1, p2, p3, p4, p5, p6, ...]
    faces = mesh.faces.reshape(-1, 4)[:, 1:].flatten().tolist()

    logger.debug("Successfully converted mesh to three.js format.")

    return {
        "vertices": vertices,
        "normals": normals,
        "faces": faces,
    } 