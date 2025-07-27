import asyncio
import json
from fastapi import APIRouter, Body, BackgroundTasks, status, Depends
from typing import Dict
from uuid import UUID
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session

from .schemas import ComputationJob as ComputationJobSchema, JobStatus, ComputationRequest
from ..websockets.connection_manager import manager
from .kratos_handler import get_kratos_handler
from .terra_routes import router as terra_router
from .loads_routes import router as loads_router
from .terra_solver import get_terra_solver
from gateway.database import get_db
from gateway.models.computation import ComputationJob

router = APIRouter(prefix="/computation", tags=["Computation"])
kratos_handler = get_kratos_handler()
terra_solver = get_terra_solver()

# 包含子路由
router.include_router(terra_router)
router.include_router(loads_router)


async def run_solver_task(job_id: str, client_id: str):
    """
    This is the background task that runs the structural analysis using Kratos.
    If Kratos is not available, it falls back to the simulation mode.
    """
    # Get database session and update job status
    from gateway.database import SessionLocal
    db = SessionLocal()
    try:
        job = db.query(ComputationJob).filter(ComputationJob.id == job_id).first()
        if not job:
            return
        
        # Update job status to running
        job.status = "running"
        db.commit()
    finally:
        db.close()

    # Simplified: Always use simulation for now since we don't have Kratos installed
    # TODO: Enable real Kratos when dependencies are installed
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


@router.post("/start", response_model=ComputationJobSchema, status_code=status.HTTP_202_ACCEPTED)
async def start_computation(
    req: ComputationRequest = Body(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """
    Starts a new computation job in the background.
    """
    # Create new job in database
    db_job = ComputationJob(
        name=f"Job {datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        job_type="structural_analysis",
        status="pending",
        input_parameters=json.dumps(req.model_dump())
    )
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    # Create schema response
    new_job = ComputationJobSchema()
    new_job.id = UUID(db_job.id)
    
    background_tasks.add_task(run_solver_task, db_job.id, req.client_id)
    
    return new_job

@router.get("/solvers")
async def get_available_solvers():
    """获取所有可用的求解器信息"""
    
    # 检查Kratos原始处理器
    kratos_status = "available" if kratos_handler.is_available() else "unavailable"
    
    # 检查Terra求解器 
    terra_status = "available" if terra_solver.is_available() else "unavailable"
    
    # 检查PyVista后处理
    pyvista_status = "available" if (hasattr(terra_solver, 'pyvista_processor') and 
                                   terra_solver.pyvista_processor is not None) else "unavailable"
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "solvers": {
            "kratos_original": {
                "name": "Kratos原始处理器",
                "status": kratos_status,
                "description": "基础结构分析处理器",
                "capabilities": ["structural_analysis", "basic_fem"]
            },
            "terra": {
                "name": "Terra深基坑求解器", 
                "status": terra_status,
                "description": "专业深基坑地质力学分析引擎",
                "capabilities": [
                    "excavation_analysis", 
                    "seepage_analysis",
                    "coupled_analysis",
                    "support_design",
                    "staged_construction"
                ],
                "supported_materials": ["clay", "sand", "rock", "concrete", "steel"],
                "version": "Terra v1.0"
            }
        },
        "post_processing": {
            "pyvista": {
                "name": "PyVista后处理引擎",
                "status": pyvista_status,
                "description": "专业可视化数据处理",
                "capabilities": [
                    "vtk_processing",
                    "contour_generation", 
                    "slice_computation",
                    "web_format_export"
                ]
            }
        },
        "summary": {
            "total_solvers": 2,
            "available_solvers": sum([1 for status in [kratos_status, terra_status] if status == "available"]),
            "post_processing_available": pyvista_status == "available"
        }
    }

@router.get("/status")
async def get_computation_status(db: Session = Depends(get_db)):
    """获取计算模块总体状态"""
    
    # Query job statistics from database
    all_jobs = db.query(ComputationJob).filter(ComputationJob.is_deleted == False).all()
    active_jobs = len([job for job in all_jobs if job.status == "running"])
    completed_jobs = len([job for job in all_jobs if job.status == "completed"])
    failed_jobs = len([job for job in all_jobs if job.status == "failed"])
    
    return {
        "module": "计算引擎",
        "status": "operational",
        "timestamp": datetime.utcnow().isoformat(),
        "job_statistics": {
            "active": active_jobs,
            "completed": completed_jobs, 
            "failed": failed_jobs,
            "total": len(all_jobs)
        },
        "solvers": {
            "kratos_available": kratos_handler.is_available(),
            "terra_available": terra_solver.is_available()
        }
    } 