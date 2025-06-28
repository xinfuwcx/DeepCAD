"""
@file ai_router.py
@description 物理AI模块的API路由
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import time
import uuid
import os
import datetime

from src.server.dependencies import get_db, validate_project_exists
from src.ai.iot_data_collector import SensorType, SensorStatus
from src.ai.physics_ai_system import PhysicsAISystem

# 创建路由器
router = APIRouter()

# 创建物理AI系统实例
ai_systems = {}

# 数据模型
class MonitoringData(BaseModel):
    """监测数据模型"""
    project_id: int = Field(..., description="项目ID")
    data_type: str = Field(..., description="数据类型", pattern="^(displacement|stress|strain|water_level)$")
    timestamp: float = Field(..., description="时间戳")
    location: List[float] = Field(..., description="监测点位置[x,y,z]")
    value: float = Field(..., description="监测值")
    sensor_id: str = Field(..., description="传感器ID")
    metadata: Optional[Dict[str, Any]] = Field(None, description="元数据")

class MonitoringDataBatch(BaseModel):
    """批量监测数据模型"""
    project_id: int = Field(..., description="项目ID")
    data: List[MonitoringData] = Field(..., description="监测数据列表")

class InversionSettings(BaseModel):
    """参数反演设置模型"""
    project_id: int = Field(..., description="项目ID")
    data_type: str = Field("displacement", description="数据类型", pattern="^(displacement|stress|strain|water_level|temperature)$")
    start_date: str = Field(..., description="起始日期 (YYYYMMDD格式)")
    end_date: Optional[str] = Field(None, description="结束日期 (YYYYMMDD格式)")
    pde_type: str = Field("elasticity", description="PDE类型", pattern="^(elasticity|heat|wave)$")
    initial_params: Dict[str, float] = Field(..., description="初始参数")
    max_iter: int = Field(20, description="最大迭代次数", gt=0)

class PINNSettings(BaseModel):
    """PINN训练设置模型"""
    project_id: int = Field(..., description="项目ID")
    data_type: str = Field("displacement", description="数据类型", pattern="^(displacement|stress|strain|water_level|temperature)$")
    start_date: str = Field(..., description="起始日期 (YYYYMMDD格式)")
    end_date: Optional[str] = Field(None, description="结束日期 (YYYYMMDD格式)")
    model_type: str = Field("elasticity", description="模型类型", pattern="^(elasticity|heat|wave)$")
    iterations: int = Field(10000, description="训练迭代次数", gt=0)

class DataFusionSettings(BaseModel):
    """数据融合设置模型"""
    project_id: int = Field(..., description="项目ID")
    sensor_types: List[str] = Field(..., description="传感器类型列表")
    start_date: str = Field(..., description="起始日期 (YYYYMMDD格式)")
    end_date: Optional[str] = Field(None, description="结束日期 (YYYYMMDD格式)")
    fusion_method: str = Field("weighted_average", description="融合方法", pattern="^(weighted_average|kalman|pca)$")
    weights: Optional[Dict[str, float]] = Field(None, description="权重字典")

class IntegratedAnalysisSettings(BaseModel):
    """集成分析设置模型"""
    project_id: int = Field(..., description="项目ID")
    model_file: str = Field(..., description="模型文件路径")
    sensor_data_config: Dict[str, Any] = Field(..., description="传感器数据配置")
    pinn_config: Dict[str, Any] = Field(..., description="PINN模型配置")
    cae_config: Dict[str, Any] = Field(..., description="CAE分析配置")

class PredictionSettings(BaseModel):
    """预测设置模型"""
    project_id: int = Field(..., description="项目ID")
    prediction_type: str = Field(..., description="预测类型", pattern="^(displacement|stability|settlement)$")
    time_range: List[float] = Field(..., description="预测时间范围[起始,结束]")
    time_steps: int = Field(10, description="时间步数", gt=0)
    confidence_level: float = Field(0.95, description="置信水平", gt=0, lt=1)

class AIResponse(BaseModel):
    """AI响应模型"""
    id: int
    task_id: str
    status: str
    message: str
    result: Optional[Dict[str, Any]] = None

# 获取物理AI系统
def get_ai_system(project_id: int) -> PhysicsAISystem:
    """获取或创建项目的物理AI系统"""
    if project_id not in ai_systems:
        ai_systems[project_id] = PhysicsAISystem(project_id=project_id)
        ai_systems[project_id].start_worker()
    
    return ai_systems[project_id]

# 路由定义
@router.post("/monitoring-data", response_model=AIResponse, summary="上传监测数据")
async def upload_monitoring_data(
    data: MonitoringData,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists)
):
    """
    上传单个监测数据
    
    - **data**: 监测数据，包括类型、时间戳、位置和值
    """
    try:
        # 在实际实现中，这应该将数据保存到数据库
        data_id = int(time.time())  # 示例ID
        
        return AIResponse(
            id=data.project_id,
            task_id=str(data_id),
            status="success",
            message="监测数据上传成功",
            result={
                "data_type": data.data_type,
                "timestamp": data.timestamp,
                "location": data.location,
                "value": data.value,
                "sensor_id": data.sensor_id
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"上传监测数据失败: {str(e)}"
        )

@router.post("/monitoring-data/batch", response_model=AIResponse, summary="批量上传监测数据")
async def upload_monitoring_data_batch(
    data_batch: MonitoringDataBatch,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists)
):
    """
    批量上传监测数据
    
    - **data_batch**: 包含多个监测数据的批量数据
    """
    try:
        # 在实际实现中，这应该将数据批量保存到数据库
        data_count = len(data_batch.data)
        batch_id = int(time.time())  # 示例ID
        
        return AIResponse(
            id=data_batch.project_id,
            task_id=str(batch_id),
            status="success",
            message=f"成功上传 {data_count} 条监测数据",
            result={
                "count": data_count,
                "data_types": set(item.data_type for item in data_batch.data),
                "time_range": [
                    min(item.timestamp for item in data_batch.data),
                    max(item.timestamp for item in data_batch.data)
                ]
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"批量上传监测数据失败: {str(e)}"
        )

@router.post("/inversion", response_model=AIResponse, summary="启动参数反演")
async def start_inversion(
    settings: InversionSettings,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists)
):
    """
    启动土体参数反演
    
    - **settings**: 反演设置，包括目标参数、算法、约束等
    """
    try:
        # 获取物理AI系统
        ai_system = get_ai_system(settings.project_id)
        
        # 提交反演分析任务
        task_id = ai_system.submit_task(
            "inverse_analysis",
            data_type=settings.data_type,
            start_date=settings.start_date,
            end_date=settings.end_date,
            pde_type=settings.pde_type,
            initial_params=settings.initial_params,
            max_iter=settings.max_iter
        )
        
        return AIResponse(
            id=settings.project_id,
            task_id=task_id,
            status="started",
            message="参数反演任务已启动",
            result={
                "data_type": settings.data_type,
                "pde_type": settings.pde_type,
                "initial_params": settings.initial_params,
                "max_iter": settings.max_iter
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动参数反演失败: {str(e)}"
        )

@router.get("/inversion/{task_id}", response_model=AIResponse, summary="获取反演状态")
async def get_inversion_status(
    task_id: str,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists)
):
    """
    获取参数反演任务状态
    
    - **task_id**: 任务ID
    """
    try:
        # 获取物理AI系统
        ai_system = get_ai_system(project_id)
        
        # 获取任务状态
        status_info = ai_system.get_task_status(task_id)
        
        if status_info.get("status") == "not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"任务 {task_id} 不存在"
            )
        
        return AIResponse(
            id=project_id,
            task_id=task_id,
            status=status_info["status"],
            message=f"参数反演任务状态: {status_info['status']}",
            result=status_info
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取反演状态失败: {str(e)}"
        )

@router.post("/pinn", response_model=AIResponse, summary="启动PINN训练")
async def start_pinn_training(
    settings: PINNSettings,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists)
):
    """
    启动PINN模型训练
    
    - **settings**: PINN训练设置，包括数据类型、模型类型、迭代次数等
    """
    try:
        # 获取物理AI系统
        ai_system = get_ai_system(settings.project_id)
        
        # 提交PINN训练任务
        task_id = ai_system.submit_task(
            "pinn_training",
            data_type=settings.data_type,
            start_date=settings.start_date,
            end_date=settings.end_date,
            model_type=settings.model_type,
            iterations=settings.iterations
        )
        
        return AIResponse(
            id=settings.project_id,
            task_id=task_id,
            status="started",
            message="PINN训练任务已启动",
            result={
                "data_type": settings.data_type,
                "model_type": settings.model_type,
                "iterations": settings.iterations
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动PINN训练失败: {str(e)}"
        )

@router.get("/pinn/{task_id}", response_model=AIResponse, summary="获取PINN训练状态")
async def get_pinn_status(
    task_id: str,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists)
):
    """
    获取PINN训练任务状态
    
    - **task_id**: 任务ID
    """
    try:
        # 获取物理AI系统
        ai_system = get_ai_system(project_id)
        
        # 获取任务状态
        status_info = ai_system.get_task_status(task_id)
        
        if status_info.get("status") == "not_found":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"任务 {task_id} 不存在"
            )
        
        return AIResponse(
            id=project_id,
            task_id=task_id,
            status=status_info["status"],
            message=f"PINN训练任务状态: {status_info['status']}",
            result=status_info
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取PINN训练状态失败: {str(e)}"
        )

@router.post("/data-fusion", response_model=AIResponse, summary="启动数据融合")
async def start_data_fusion(
    settings: DataFusionSettings,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists)
):
    """
    启动传感器数据融合
    
    - **settings**: 数据融合设置，包括传感器类型、融合方法等
    """
    try:
        # 获取物理AI系统
        ai_system = get_ai_system(settings.project_id)
        
        # 转换传感器类型
        sensor_types = []
        for st in settings.sensor_types:
            try:
                sensor_types.append(getattr(SensorType, st.upper()))
            except AttributeError:
                sensor_types.append(st)
        
        # 提交数据融合任务
        task_id = ai_system.submit_task(
            "data_fusion",
            sensor_types=sensor_types,
            start_date=settings.start_date,
            end_date=settings.end_date,
            fusion_method=settings.fusion_method,
            weights=settings.weights
        )
        
        return AIResponse(
            id=settings.project_id,
            task_id=task_id,
            status="started",
            message="数据融合任务已启动",
            result={
                "sensor_types": settings.sensor_types,
                "fusion_method": settings.fusion_method
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动数据融合失败: {str(e)}"
        )

@router.post("/integrated-analysis", response_model=AIResponse, summary="启动集成分析")
async def start_integrated_analysis(
    settings: IntegratedAnalysisSettings,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists)
):
    """
    启动集成分析，结合IoT数据、PINN模型和CAE分析
    
    - **settings**: 集成分析设置
    """
    try:
        # 获取物理AI系统
        ai_system = get_ai_system(settings.project_id)
        
        # 检查模型文件是否存在
        if not os.path.exists(settings.model_file):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"模型文件不存在: {settings.model_file}"
            )
        
        # 运行集成分析
        task_ids = ai_system.run_integrated_analysis(
            model_file=settings.model_file,
            sensor_data_config=settings.sensor_data_config,
            pinn_config=settings.pinn_config,
            cae_config=settings.cae_config
        )
        
        return AIResponse(
            id=settings.project_id,
            task_id=task_ids["cae_task_id"] or task_ids["inverse_task_id"],
            status="started",
            message="集成分析任务已启动",
            result={
                "task_ids": task_ids
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动集成分析失败: {str(e)}"
        )

@router.post("/prediction", response_model=AIResponse, summary="启动行为预测")
async def start_prediction(
    settings: PredictionSettings,
    db: Session = Depends(get_db),
    project_id: int = Depends(validate_project_exists)
):
    """
    启动行为预测
    
    - **settings**: 预测设置，包括预测类型、时间范围等
    """
    try:
        # 生成任务ID
        task_id = str(uuid.uuid4())
        
        # 在实际实现中，这应该启动后台任务进行行为预测
        # 目前只是简单模拟
        
        return AIResponse(
            id=settings.project_id,
            task_id=task_id,
            status="started",
            message="行为预测任务已启动",
            result={
                "prediction_type": settings.prediction_type,
                "time_range": settings.time_range,
                "time_steps": settings.time_steps
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动行为预测失败: {str(e)}"
        ) 