"""
@file excavation_router.py
@description 深基坑CAE系统API路由
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status, BackgroundTasks
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
import time
import uuid
import os
import datetime
import json
from pathlib import Path

from src.server.dependencies import get_db, validate_project_exists
from src.core.simulation.deep_excavation_system import DeepExcavationSystem

# 创建路由器
router = APIRouter()

# 深基坑系统实例字典
excavation_systems = {}

# 数据模型
class ProjectInfo(BaseModel):
    """项目信息模型"""
    project_name: str = Field(..., description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")
    location: Optional[str] = Field(None, description="项目位置")
    owner: Optional[str] = Field(None, description="业主单位")
    designer: Optional[str] = Field(None, description="设计单位")
    constructor: Optional[str] = Field(None, description="施工单位")
    supervisor: Optional[str] = Field(None, description="监理单位")
    metadata: Optional[Dict[str, Any]] = Field(None, description="元数据")

class GeometryParams(BaseModel):
    """几何参数模型"""
    width: float = Field(100.0, description="模型宽度(m)")
    length: float = Field(100.0, description="模型长度(m)")
    depth: float = Field(30.0, description="模型深度(m)")
    excavation_width: float = Field(50.0, description="开挖宽度(m)")
    excavation_length: float = Field(50.0, description="开挖长度(m)")
    excavation_depth: float = Field(15.0, description="开挖深度(m)")
    metadata: Optional[Dict[str, Any]] = Field(None, description="元数据")

class MeshParams(BaseModel):
    """网格参数模型"""
    mesh_size: float = Field(2.0, description="网格尺寸(m)")
    algorithm: int = Field(6, description="网格算法(1-9)")
    format: str = Field("msh", description="网格格式(msh/vtk)")
    metadata: Optional[Dict[str, Any]] = Field(None, description="元数据")

class SoilLayer(BaseModel):
    """土层参数模型"""
    name: str = Field(..., description="土层名称")
    material_model: str = Field("mohr_coulomb", description="材料模型")
    parameters: Dict[str, float] = Field(..., description="材料参数")
    group_id: Optional[int] = Field(None, description="物理组ID")

class BoundaryCondition(BaseModel):
    """边界条件模型"""
    type: str = Field(..., description="边界条件类型")
    entities: List[int] = Field(..., description="实体ID列表")
    values: Optional[List[float]] = Field(None, description="边界条件值")

class Load(BaseModel):
    """荷载模型"""
    type: str = Field(..., description="荷载类型")
    entities: List[int] = Field(..., description="实体ID列表")
    values: List[float] = Field(..., description="荷载值")
    stage: Optional[int] = Field(0, description="施工阶段索引")

class ExcavationStage(BaseModel):
    """开挖阶段模型"""
    name: str = Field(..., description="阶段名称")
    entities: List[int] = Field(..., description="开挖单元列表")
    water_level: Optional[float] = Field(None, description="水位高程")
    time_step: Optional[float] = Field(1.0, description="时间步长")

class ModelParams(BaseModel):
    """模型参数模型"""
    name: str = Field(..., description="模型名称")
    soil_layers: List[SoilLayer] = Field([], description="土层列表")
    boundary_conditions: List[BoundaryCondition] = Field([], description="边界条件列表")
    loads: List[Load] = Field([], description="荷载列表")
    excavation_stages: List[ExcavationStage] = Field([], description="开挖阶段列表")
    metadata: Optional[Dict[str, Any]] = Field(None, description="元数据")

class AnalysisParams(BaseModel):
    """分析参数模型"""
    num_threads: Optional[int] = Field(None, description="线程数")
    metadata: Optional[Dict[str, Any]] = Field(None, description="元数据")

class IntegratedParams(BaseModel):
    """集成分析参数模型"""
    sensor_data_config: Dict[str, Any] = Field(..., description="传感器数据配置")
    pinn_config: Dict[str, Any] = Field(..., description="PINN模型配置")
    cae_config: Dict[str, Any] = Field(..., description="CAE分析配置")
    metadata: Optional[Dict[str, Any]] = Field(None, description="元数据")

class SensorDataImport(BaseModel):
    """传感器数据导入模型"""
    sensor_type: str = Field(..., description="传感器类型")
    file_path: str = Field(..., description="文件路径")

class PINNParams(BaseModel):
    """PINN参数模型"""
    pde_type: str = Field("elasticity", description="PDE类型")
    layers: List[int] = Field([20, 20, 20], description="网络层结构")
    iterations: int = Field(10000, description="训练迭代次数")
    learning_rate: float = Field(0.001, description="学习率")
    metadata: Optional[Dict[str, Any]] = Field(None, description="元数据")

class InverseParams(BaseModel):
    """反演参数模型"""
    data_type: str = Field("displacement", description="数据类型")
    pde_type: str = Field("elasticity", description="PDE类型")
    initial_params: Dict[str, float] = Field(..., description="初始参数")
    max_iter: int = Field(20, description="最大迭代次数")
    metadata: Optional[Dict[str, Any]] = Field(None, description="元数据")

class ExcavationResponse(BaseModel):
    """响应模型"""
    project_id: int
    status: str
    message: str
    result: Optional[Dict[str, Any]] = None

# 获取深基坑系统
def get_excavation_system(project_id: int, project_name: str = None) -> DeepExcavationSystem:
    """获取或创建项目的深基坑系统"""
    if project_id not in excavation_systems:
        if project_name is None:
            project_name = f"project_{project_id}"
        
        excavation_systems[project_id] = DeepExcavationSystem(
            project_id=project_id,
            project_name=project_name
        )
    
    return excavation_systems[project_id]

# 路由定义
@router.post("/projects", response_model=ExcavationResponse, summary="创建新项目")
async def create_project(
    project_info: ProjectInfo,
    db: Session = Depends(get_db)
):
    """
    创建新的深基坑项目
    
    - **project_info**: 项目基本信息
    """
    try:
        # 在实际实现中，这应该将项目信息保存到数据库并返回项目ID
        project_id = int(time.time())  # 示例ID
        
        # 创建深基坑系统
        system = get_excavation_system(project_id, project_info.project_name)
        
        return ExcavationResponse(
            project_id=project_id,
            status="success",
            message="项目创建成功",
            result={
                "project_name": project_info.project_name,
                "created_at": time.time()
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建项目失败: {str(e)}"
        )

@router.post("/projects/{project_id}/geometry", response_model=ExcavationResponse, summary="创建几何模型")
async def create_geometry(
    geometry_params: GeometryParams,
    project_id: int = Depends(validate_project_exists),
    db: Session = Depends(get_db)
):
    """
    创建几何模型
    
    - **geometry_params**: 几何参数
    """
    try:
        # 获取深基坑系统
        system = get_excavation_system(project_id)
        
        # 创建几何模型
        geo_file = system.create_geometry(geometry_params.dict())
        
        return ExcavationResponse(
            project_id=project_id,
            status="success",
            message="几何模型创建成功",
            result={
                "geometry_file": geo_file,
                "parameters": geometry_params.dict(exclude={"metadata"})
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建几何模型失败: {str(e)}"
        )

@router.post("/projects/{project_id}/mesh", response_model=ExcavationResponse, summary="生成网格")
async def generate_mesh(
    mesh_params: MeshParams,
    project_id: int = Depends(validate_project_exists),
    db: Session = Depends(get_db)
):
    """
    生成有限元网格
    
    - **mesh_params**: 网格参数
    """
    try:
        # 获取深基坑系统
        system = get_excavation_system(project_id)
        
        # 生成网格
        mesh_file = system.generate_mesh(mesh_params.dict())
        
        return ExcavationResponse(
            project_id=project_id,
            status="success",
            message="网格生成成功",
            result={
                "mesh_file": mesh_file,
                "parameters": mesh_params.dict(exclude={"metadata"})
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成网格失败: {str(e)}"
        )

@router.post("/projects/{project_id}/model", response_model=ExcavationResponse, summary="创建计算模型")
async def create_model(
    model_params: ModelParams,
    project_id: int = Depends(validate_project_exists),
    db: Session = Depends(get_db)
):
    """
    创建计算模型
    
    - **model_params**: 模型参数
    """
    try:
        # 获取深基坑系统
        system = get_excavation_system(project_id)
        
        # 创建计算模型
        model_file = system.create_model(model_params.dict())
        
        return ExcavationResponse(
            project_id=project_id,
            status="success",
            message="计算模型创建成功",
            result={
                "model_file": model_file,
                "model_name": model_params.name
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建计算模型失败: {str(e)}"
        )

@router.post("/projects/{project_id}/analysis", response_model=ExcavationResponse, summary="运行分析")
async def run_analysis(
    analysis_params: AnalysisParams,
    background_tasks: BackgroundTasks,
    project_id: int = Depends(validate_project_exists),
    db: Session = Depends(get_db)
):
    """
    运行有限元分析
    
    - **analysis_params**: 分析参数
    """
    try:
        # 获取深基坑系统
        system = get_excavation_system(project_id)
        
        # 在后台任务中运行分析
        def run_analysis_task():
            try:
                system.run_analysis(analysis_params.dict())
            except Exception as e:
                # 记录错误，但不影响API响应
                print(f"分析任务执行错误: {str(e)}")
        
        background_tasks.add_task(run_analysis_task)
        
        return ExcavationResponse(
            project_id=project_id,
            status="started",
            message="分析任务已启动",
            result={
                "num_threads": analysis_params.num_threads
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动分析失败: {str(e)}"
        )

@router.get("/projects/{project_id}/analysis/status", response_model=ExcavationResponse, summary="获取分析状态")
async def get_analysis_status(
    project_id: int = Depends(validate_project_exists),
    db: Session = Depends(get_db)
):
    """
    获取分析状态
    """
    try:
        # 获取深基坑系统
        system = get_excavation_system(project_id)
        
        # 获取分析状态
        status_info = system.get_analysis_status()
        
        return ExcavationResponse(
            project_id=project_id,
            status="success",
            message="获取分析状态成功",
            result=status_info
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取分析状态失败: {str(e)}"
        )

@router.post("/projects/{project_id}/integrated-analysis", response_model=ExcavationResponse, summary="运行集成分析")
async def run_integrated_analysis(
    integrated_params: IntegratedParams,
    background_tasks: BackgroundTasks,
    project_id: int = Depends(validate_project_exists),
    db: Session = Depends(get_db)
):
    """
    运行集成分析（CAE + AI）
    
    - **integrated_params**: 集成分析参数
    """
    try:
        # 获取深基坑系统
        system = get_excavation_system(project_id)
        
        # 在后台任务中运行集成分析
        def run_integrated_analysis_task():
            try:
                system.run_integrated_analysis(integrated_params.dict())
            except Exception as e:
                # 记录错误，但不影响API响应
                print(f"集成分析任务执行错误: {str(e)}")
        
        background_tasks.add_task(run_integrated_analysis_task)
        
        return ExcavationResponse(
            project_id=project_id,
            status="started",
            message="集成分析任务已启动",
            result={
                "sensor_data_config": integrated_params.sensor_data_config,
                "pinn_config": integrated_params.pinn_config,
                "cae_config": integrated_params.cae_config
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动集成分析失败: {str(e)}"
        )

@router.post("/projects/{project_id}/sensor-data", response_model=ExcavationResponse, summary="导入传感器数据")
async def import_sensor_data(
    sensor_data: SensorDataImport,
    project_id: int = Depends(validate_project_exists),
    db: Session = Depends(get_db)
):
    """
    导入传感器数据
    
    - **sensor_data**: 传感器数据导入参数
    """
    try:
        # 获取深基坑系统
        system = get_excavation_system(project_id)
        
        # 导入传感器数据
        result = system.import_sensor_data(
            sensor_data_file=sensor_data.file_path,
            sensor_type=sensor_data.sensor_type
        )
        
        return ExcavationResponse(
            project_id=project_id,
            status="success",
            message="传感器数据导入成功",
            result=result
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导入传感器数据失败: {str(e)}"
        )

@router.post("/projects/{project_id}/pinn", response_model=ExcavationResponse, summary="训练PINN模型")
async def train_pinn_model(
    pinn_params: PINNParams,
    project_id: int = Depends(validate_project_exists),
    db: Session = Depends(get_db)
):
    """
    训练PINN模型
    
    - **pinn_params**: PINN参数
    """
    try:
        # 获取深基坑系统
        system = get_excavation_system(project_id)
        
        # 训练PINN模型
        result = system.train_pinn_model(pinn_params.dict())
        
        return ExcavationResponse(
            project_id=project_id,
            status="success",
            message="PINN模型训练已启动",
            result=result
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动PINN模型训练失败: {str(e)}"
        )

@router.post("/projects/{project_id}/inverse-analysis", response_model=ExcavationResponse, summary="运行反演分析")
async def run_inverse_analysis(
    inverse_params: InverseParams,
    project_id: int = Depends(validate_project_exists),
    db: Session = Depends(get_db)
):
    """
    运行反演分析
    
    - **inverse_params**: 反演参数
    """
    try:
        # 获取深基坑系统
        system = get_excavation_system(project_id)
        
        # 运行反演分析
        result = system.run_inverse_analysis(inverse_params.dict())
        
        return ExcavationResponse(
            project_id=project_id,
            status="success",
            message="反演分析已启动",
            result=result
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动反演分析失败: {str(e)}"
        )

@router.get("/projects/{project_id}/results/{result_type}", response_model=ExcavationResponse, summary="获取分析结果")
async def get_results(
    result_type: str,
    stage_index: int = -1,
    project_id: int = Depends(validate_project_exists),
    db: Session = Depends(get_db)
):
    """
    获取分析结果
    
    - **result_type**: 结果类型
    - **stage_index**: 阶段索引，默认为最后一个阶段
    """
    try:
        # 获取深基坑系统
        system = get_excavation_system(project_id)
        
        # 获取结果
        results = system.get_results(result_type, stage_index)
        
        return ExcavationResponse(
            project_id=project_id,
            status="success",
            message=f"获取 {result_type} 结果成功",
            result=results
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取结果失败: {str(e)}"
        )

@router.post("/projects/{project_id}/export", response_model=ExcavationResponse, summary="导出分析结果")
async def export_results(
    output_file: str = Query(..., description="输出文件路径"),
    format: str = Query("vtk", description="输出格式"),
    stage_index: int = Query(-1, description="阶段索引"),
    project_id: int = Depends(validate_project_exists),
    db: Session = Depends(get_db)
):
    """
    导出分析结果
    
    - **output_file**: 输出文件路径
    - **format**: 输出格式，默认为vtk
    - **stage_index**: 阶段索引，默认为最后一个阶段
    """
    try:
        # 获取深基坑系统
        system = get_excavation_system(project_id)
        
        # 导出结果
        file_path = system.export_results(output_file, format, stage_index)
        
        return ExcavationResponse(
            project_id=project_id,
            status="success",
            message="结果导出成功",
            result={
                "file_path": file_path,
                "format": format,
                "stage_index": stage_index
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出结果失败: {str(e)}"
        )


