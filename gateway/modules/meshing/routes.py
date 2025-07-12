import asyncio
import json
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
import pyvista as pv
import gmsh
import os
import time
import tempfile

from ..websockets.connection_manager import manager


router = APIRouter(prefix="/meshing")


class MeshGenerationRequest(BaseModel):
    boundingBoxMin: list[float]
    boundingBoxMax: list[float]
    meshSize: float
    clientId: str


class MeshGenerationResponse(BaseModel):
    message: str
    url: str


async def generate_mesh_task(req: MeshGenerationRequest):
    """
    Background mesh generation using native gmsh API.
    Improved performance and better geometry handling compared to pygmsh.
    """
    client_id = req.clientId
    
    start_payload = {"status": "starting", "progress": 0, "message": "Starting mesh generation..."}
    await manager.send_personal_message(json.dumps(start_payload), client_id)

    # Initialize gmsh
    gmsh.initialize()
    
    try:
        box_min = req.boundingBoxMin
        box_max = req.boundingBoxMax
        box_dims = [box_max[0] - box_min[0], box_max[1] - box_min[1], box_max[2] - box_min[2]]

        # Create a new model
        model_name = f"mesh_model_{int(time.time())}"
        gmsh.model.add(model_name)

        geom_payload = {"status": "processing", "progress": 25, "message": "Creating geometry with gmsh OCC..."}
        await manager.send_personal_message(json.dumps(geom_payload), client_id)
        await asyncio.sleep(1)

        # Create box using native gmsh OCC API
        box_tag = gmsh.model.occ.addBox(
            box_min[0], box_min[1], box_min[2],
            box_dims[0], box_dims[1], box_dims[2]
        )
        
        # Synchronize OCC geometry
        gmsh.model.occ.synchronize()
        
        # Set mesh size options
        gmsh.option.setNumber("Mesh.MeshSizeMin", req.meshSize / 2)
        gmsh.option.setNumber("Mesh.MeshSizeMax", req.meshSize)
        gmsh.option.setNumber("Mesh.Algorithm", 6)  # Frontal-Delaunay
        
        mesh_payload = {"status": "processing", "progress": 50, "message": "Generating 3D mesh..."}
        await manager.send_personal_message(json.dumps(mesh_payload), client_id)
        await asyncio.sleep(1)
        
        # Generate 3D mesh
        gmsh.model.mesh.generate(3)
        
        save_payload = {"status": "processing", "progress": 75, "message": "Saving mesh to file..."}
        await manager.send_personal_message(json.dumps(save_payload), client_id)
        await asyncio.sleep(1)

        # Create output directory
        output_dir = "./static_content/meshes"
        os.makedirs(output_dir, exist_ok=True)
        
        timestamp = int(time.time())
        
        # Save mesh in VTK format for PyVista to read
        vtk_filename = f"mesh_{timestamp}.vtk"
        vtk_path = os.path.join(output_dir, vtk_filename)
        gmsh.write(vtk_path)
        
        # Also save native gmsh format for advanced analysis
        msh_filename = f"mesh_{timestamp}.msh"
        msh_path = os.path.join(output_dir, msh_filename)
        gmsh.write(msh_path)
        
        # Load with PyVista for additional processing if needed
        pv_mesh = pv.read(vtk_path)
        
        complete_payload = {
            "status": "completed", 
            "progress": 100, 
            "message": "Mesh generation complete with native gmsh.", 
            "url": f"/static/meshes/{vtk_filename}",
            "mesh_url": f"/static/meshes/{msh_filename}",
            "stats": {
                "nodes": pv_mesh.n_points,
                "cells": pv_mesh.n_cells,
                "cell_types": str(pv_mesh.celltypes)
            }
        }
        await manager.send_personal_message(json.dumps(complete_payload), client_id)

    except Exception as e:
        error_message = f"An error occurred during mesh generation: {e}"
        error_payload = {"status": "error", "message": error_message}
        await manager.send_personal_message(json.dumps(error_payload), client_id)
        print(f"Mesh generation error: {error_message}")
        
    finally:
        # Always cleanup gmsh
        gmsh.finalize()


@router.post("/generate")
async def generate_mesh_endpoint(req: MeshGenerationRequest, background_tasks: BackgroundTasks):
    """
    Accepts mesh generation parameters and starts a background task.
    Immediately returns a confirmation response.
    Progress is sent via WebSocket.
    """
    background_tasks.add_task(generate_mesh_task, req)
    return {"message": "Mesh generation started in background.", "clientId": req.clientId} 