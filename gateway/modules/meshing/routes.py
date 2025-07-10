import asyncio
import json
from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
import pyvista as pv
import pygmsh
import os
import time

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
    This function runs in the background.
    It generates the mesh and saves it to a file.
    It now also sends progress updates via WebSocket.
    """
    client_id = req.clientId
    
    start_payload = {"status": "starting", "progress": 0, "message": "Starting mesh generation..."}
    await manager.send_personal_message(json.dumps(start_payload), client_id)

    try:
        box_min = req.boundingBoxMin
        box_max = req.boundingBoxMax

        geom_payload = {"status": "processing", "progress": 25, "message": "Creating geometry..."}
        await manager.send_personal_message(json.dumps(geom_payload), client_id)
        await asyncio.sleep(1) 

        with pygmsh.occ.Geometry() as geom:
            box_dims = [box_max[0] - box_min[0], box_max[1] - box_min[1], box_max[2] - box_min[2]]
            geom.add_box(box_min, box_dims, mesh_size=req.meshSize)
            
            mesh_payload = {"status": "processing", "progress": 50, "message": "Generating mesh..."}
            await manager.send_personal_message(json.dumps(mesh_payload), client_id)
            await asyncio.sleep(1)
            
            mesh = geom.generate_mesh(dim=3)
        
        pv_mesh = pv.wrap(mesh)
        
        save_payload = {"status": "processing", "progress": 75, "message": "Saving mesh to file..."}
        await manager.send_personal_message(json.dumps(save_payload), client_id)
        await asyncio.sleep(1)

        output_dir = "./static_content"
        os.makedirs(output_dir, exist_ok=True)
        
        timestamp = int(time.time())
        filename = f"mesh_{timestamp}.vtk"
        file_path = os.path.join(output_dir, filename)
        
        pv_mesh.save(file_path, binary=True)
        
        complete_payload = {
            "status": "completed", 
            "progress": 100, 
            "message": "Mesh generation complete.", 
            "url": f"/static/{filename}"
        }
        await manager.send_personal_message(json.dumps(complete_payload), client_id)

    except Exception as e:
        error_message = f"An error occurred during mesh generation: {e}"
        error_payload = {"status": "error", "message": error_message}
        await manager.send_personal_message(json.dumps(error_payload), client_id)
        # Log the error for debugging
        print(error_message)


@router.post("/generate")
async def generate_mesh_endpoint(req: MeshGenerationRequest, background_tasks: BackgroundTasks):
    """
    Accepts mesh generation parameters and starts a background task.
    Immediately returns a confirmation response.
    Progress is sent via WebSocket.
    """
    background_tasks.add_task(generate_mesh_task, req)
    return {"message": "Mesh generation started in background.", "clientId": req.clientId} 