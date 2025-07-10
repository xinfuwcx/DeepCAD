import asyncio
import json
from fastapi import APIRouter, Body, BackgroundTasks, status
from typing import Dict
from uuid import UUID
from datetime import datetime
from pathlib import Path

from .schemas import ComputationJob, JobStatus, ComputationRequest
from ..websockets.connection_manager import manager
from .kratos_handler import get_kratos_handler

router = APIRouter(prefix="/computation", tags=["Computation"])
kratos_handler = get_kratos_handler()

# In-memory storage for computation jobs
jobs: Dict[UUID, ComputationJob] = {}


async def run_solver_task(job_id: UUID, client_id: str):
    """
    This is the background task that runs the structural analysis using Kratos.
    If Kratos is not available, it falls back to the simulation mode.
    """
    # Update job status to running
    jobs[job_id].status = JobStatus.RUNNING
    jobs[job_id].started_at = datetime.utcnow()

    # Check if Kratos is available
    if kratos_handler.is_available():
        # Use Kratos for real computation
        try:
            # Set up paths
            mesh_file = f"static_content/meshes/mesh_{job_id}.mdpa"
            output_dir = f"static_content/results/{job_id}"
            
            # Create output directory if it doesn't exist
            Path(output_dir).mkdir(parents=True, exist_ok=True)
            
            # Run analysis
            success = await kratos_handler.run_analysis(
                mesh_file=mesh_file,
                output_dir=output_dir,
                connection_manager=manager,
                client_id=client_id
            )
            
            if success:
                # Update job status
                jobs[job_id].status = JobStatus.COMPLETED
                jobs[job_id].completed_at = datetime.utcnow()
                jobs[job_id].result_url = f"/static/results/{job_id}/result.vtk"
            else:
                # Analysis failed
                jobs[job_id].status = JobStatus.FAILED
                jobs[job_id].completed_at = datetime.utcnow()
                
        except Exception as e:
            jobs[job_id].status = JobStatus.FAILED
            jobs[job_id].completed_at = datetime.utcnow()
            await manager.send_personal_message(json.dumps({
                "status": "error", 
                "message": f"An error occurred during Kratos computation: {e}"
            }), client_id)
    else:
        # Fallback to simulation mode
        try:
            await manager.send_personal_message(json.dumps({
                "status": "processing", 
                "progress": 0, 
                "message": f"Job {job_id} started. Initializing solver (simulation mode)..."
            }), client_id)
            await asyncio.sleep(2)

            for i in range(1, 11):
                await manager.send_personal_message(json.dumps({
                    "status": "processing", 
                    "progress": i * 10, 
                    "message": f"Computation step {i}/10 finished."
                }), client_id)
                await asyncio.sleep(1)  # Simulate work for one step

            # Finalize
            jobs[job_id].status = JobStatus.COMPLETED
            jobs[job_id].completed_at = datetime.utcnow()
            # In simulation mode, we use a dummy result URL
            jobs[job_id].result_url = f"/static/results/dummy_result_{job_id}.vtk"
            
            await manager.send_personal_message(json.dumps({
                "status": "completed", 
                "progress": 100, 
                "message": "Computation finished successfully (simulation mode).",
                "url": jobs[job_id].result_url
            }), client_id)

        except Exception as e:
            jobs[job_id].status = JobStatus.FAILED
            jobs[job_id].completed_at = datetime.utcnow()
            await manager.send_personal_message(json.dumps({
                "status": "error", "message": f"An error occurred during computation: {e}"
            }), client_id)


@router.post("/start", response_model=ComputationJob, status_code=status.HTTP_202_ACCEPTED)
async def start_computation(
    req: ComputationRequest = Body(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Starts a new computation job in the background.
    """
    new_job = ComputationJob()
    jobs[new_job.id] = new_job
    
    background_tasks.add_task(run_solver_task, new_job.id, req.client_id)
    
    return new_job 