"""
@file compute_router.py
@description 计算分析模块的API路由
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, File, UploadFile, Body
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, conlist
from enum import Enum
import time
import os
import json
import threading

from src.server.dependencies import get_db, get_compute_engine, validate_project_exists
from src.core.simulation.models import ComputeEngine

# 创建路由
router = APIRouter()

# 枚举定义
class AnalysisTypeEnum(str, Enum):
    STATIC = "static"
    CONSOLIDATION = "consolidation"
    DYNAMIC = "dynamic"
    STEADY_FLOW = "steady_flow"
    TRANSIENT_FLOW = "transient_flow"
    COUPLED = "coupled"

class MaterialModelEnum(str, Enum):
    LINEAR_ELASTIC = "linear_elastic"
    MOHR_COULOMB = "mohr_coulomb"
    DRUCKER_PRAGER = "drucker_prager"
    CAM_CLAY = "cam_clay"
    MODIFIED_CAM_CLAY = "modified_cam_clay"
    HYPOPLASTIC = "hypoplastic"
    DUNCAN_CHANG = "duncan_chang"
    SOFT_SOIL = "soft_soil"
    HARDENING_SOIL = "hardening_soil"
    USER_DEFINED = "user_defined"

class SolverTypeEnum(str, Enum):
    DIRECT = "direct"
    ITERATIVE = "iterative"
    MULTIGRID = "multigrid"
    NESTED = "nested"

# 数据模型
class ComputeSettings(BaseModel):
    """计算设置模型"""
    project_id: int = Field(..., description="项目ID")
    analysis_type: AnalysisTypeEnum = Field(..., description="分析类型")
    soil_model: MaterialModelEnum = Field(MaterialModelEnum.MOHR_COULOMB, description="土体本构模型")
    max_iterations: int = Field(100, description="最大迭代次数", ge=1)
    tolerance: float = Field(1e-6, description="收敛容差", gt=0)
    load_steps: int = Field(1, description="加载步数", ge=1)
    time_steps: Optional[List[float]] = Field(None, description="时间步列表")
    gravity: List[float] = Field([0, 0, -9.8], description="重力加速度向量")
    advanced_settings: Optional[Dict[str, Any]] = Field(None, description="高级设置")

class ComputeResponse(BaseModel):
    """计算响应模型"""
    id: Union[int, str]
    status: str
    message: str
    compute_info: Dict[str, Any] = Field(default_factory=dict)

# 计算任务状态
computation_tasks = {}

# 后台任务函数
def run_computation(task_id: int, settings: ComputeSettings):
    """模拟长时间运行的计算任务"""
    try:
        computation_tasks[task_id] = {"status": "running", "progress": 0, "started_at": time.time()}
        
        # 模拟计算过程
        steps = 10
        for i in range(steps + 1):
            time.sleep(1)  # 模拟计算时间
            computation_tasks[task_id]["progress"] = i * 100 // steps
        
        # 模拟计算完成
        computation_tasks[task_id].update({
            "status": "completed", 
            "progress": 100,
            "completed_at": time.time(),
            "results": {
                "max_displacement": 0.058,
                "max_stress": 250.5,
                "iterations": 45,
                "converged": True
            }
        })
    except Exception as e:
        computation_tasks[task_id].update({
            "status": "failed",
            "error": str(e),
            "completed_at": time.time()
        })

# 路由定义
@router.post("/solve", response_model=ComputeResponse, summary="开始计算分析")
async def start_computation(
    settings: ComputeSettings,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    开始计算分析
    
    - **settings**: 计算设置，包括分析类型、土体模型等
    """
    try:
        # 获取网格文件
        mesh_file = f"./data/mesh/project_{settings.project_id}/mesh.msh"
        
        # 启动计算任务
        task_id = engine.solve(
            mesh_file=mesh_file,
            analysis_type=settings.analysis_type.value,
            soil_model=settings.soil_model.value,
            max_iterations=settings.max_iterations,
            tolerance=settings.tolerance,
            load_steps=settings.load_steps,
            time_steps=settings.time_steps,
            gravity=settings.gravity,
            advanced_settings=settings.advanced_settings
        )
        
        return ComputeResponse(
            id=task_id,
            status="started",
            message="计算任务已启动",
            compute_info={
                "analysis_type": settings.analysis_type,
                "soil_model": settings.soil_model,
                "estimated_time": "约10分钟"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动计算任务失败: {str(e)}"
        )

@router.get("/{task_id}/status", response_model=ComputeResponse, summary="获取计算状态")
async def get_computation_status(
    task_id: str,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    获取计算任务状态
    
    - **task_id**: 计算任务ID
    """
    try:
        # 获取任务状态
        status_info = engine.get_status(task_id)
        
        if not status_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"计算任务 {task_id} 不存在"
            )
            
        return ComputeResponse(
            id=task_id,
            status=status_info.get("status", "unknown"),
            message=f"计算任务状态: {status_info.get('status', 'unknown')}",
            compute_info={
                "progress": status_info.get("progress", 0),
                "started_at": status_info.get("started_at"),
                "completed_at": status_info.get("completed_at"),
                "error": status_info.get("error", "")
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取计算状态失败: {str(e)}"
        )

@router.get("/{task_id}/results/{result_type}", response_model=Dict[str, Any], summary="获取计算结果")
async def get_computation_results(
    task_id: str,
    result_type: str,
    stage: Optional[int] = None,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    获取计算结果
    
    - **task_id**: 计算任务ID
    - **result_type**: 结果类型(displacement, stress, strain, pore_pressure)
    - **stage**: 施工阶段索引
    """
    try:
        # 获取结果数据
        result_data = engine.get_results(task_id, result_type)
        
        if not result_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"计算结果 {task_id}/{result_type} 不存在"
            )
            
        return result_data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取计算结果失败: {str(e)}"
        )
