"""
@file compute_router.py
@description 计算分析模块的API路由
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, File, UploadFile
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, conlist
from enum import Enum
import time
import os

from src.server.dependencies import get_db, get_compute_engine, validate_project_exists
from src.core.simulation.models import ComputeEngine

# 创建路由器
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

class ElementTypeEnum(str, Enum):
    SOLID = "solid"
    SHELL = "shell"
    BEAM = "beam"
    TRUSS = "truss"
    MEMBRANE = "membrane"
    INTERFACE = "interface"
    CONNECTOR = "connector"
    SPRING = "spring"

class LoadTypeEnum(str, Enum):
    POINT_LOAD = "point_load"
    LINE_LOAD = "line_load"
    SURFACE_LOAD = "surface_load"
    BODY_FORCE = "body_force"
    PRESSURE = "pressure"
    TEMPERATURE = "temperature"
    HYDROSTATIC = "hydrostatic"
    PRESCRIBED_DISP = "prescribed_disp"

class BoundaryTypeEnum(str, Enum):
    FIXED = "fixed"
    DISPLACEMENT = "displacement"
    VELOCITY = "velocity"
    ACCELERATION = "acceleration"
    FORCE = "force"
    PRESSURE = "pressure"
    FLOW = "flow"
    HEAD = "head"
    CONTACT = "contact"
    SYMMETRY = "symmetry"
    SPRING = "spring"

class SolverTypeEnum(str, Enum):
    DIRECT = "direct"
    ITERATIVE = "iterative"
    MULTIGRID = "multigrid"
    NESTED = "nested"

class ModelFormatEnum(str, Enum):
    TERRA_JSON = "terra_json"
    MIDAS_FPN = "midas_fpn"
    ABAQUS_INP = "abaqus_inp"
    PLAXIS_SOIL = "plaxis_soil"

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

class MaterialParams(BaseModel):
    """材料参数模型"""
    young_modulus: float = Field(..., description="杨氏模量(Pa)", gt=0)
    poisson_ratio: float = Field(..., description="泊松比", ge=0, lt=0.5)
    density: float = Field(..., description="密度(kg/m³)", gt=0)
    cohesion: Optional[float] = Field(None, description="粘聚力(Pa)", ge=0)
    friction_angle: Optional[float] = Field(None, description="摩擦角(度)", ge=0)
    dilatancy_angle: Optional[float] = Field(None, description="膨胀角(度)", ge=0)
    void_ratio: Optional[float] = Field(None, description="孔隙比", gt=0)
    permeability: Optional[float] = Field(None, description="渗透系数(m/s)", gt=0)
    advanced_params: Optional[Dict[str, Any]] = Field(None, description="高级参数")

class MaterialDefinition(BaseModel):
    """材料定义模型"""
    project_id: int = Field(..., description="项目ID")
    name: str = Field(..., description="材料名称")
    material_type: MaterialModelEnum = Field(..., description="材料类型")
    parameters: MaterialParams = Field(..., description="材料参数")
    group_ids: Optional[List[int]] = Field(None, description="物理组ID列表")

class ElementDefinition(BaseModel):
    """单元定义模型"""
    project_id: int = Field(..., description="项目ID")
    element_type: ElementTypeEnum = Field(..., description="单元类型")
    group_ids: Optional[List[int]] = Field(None, description="物理组ID列表")

class BoundaryCondition(BaseModel):
    """边界条件模型"""
    project_id: int = Field(..., description="项目ID")
    bc_type: BoundaryTypeEnum = Field(..., description="边界条件类型")
    entities: List[int] = Field(..., description="实体ID列表")
    values: Optional[List[float]] = Field(None, description="边界条件值")
    stage: Optional[int] = Field(None, description="施工阶段索引")

class LoadDefinition(BaseModel):
    """荷载定义模型"""
    project_id: int = Field(..., description="项目ID")
    load_type: LoadTypeEnum = Field(..., description="荷载类型")
    entities: List[int] = Field(..., description="实体ID列表")
    values: List[float] = Field(..., description="荷载值")
    stage: Optional[int] = Field(None, description="施工阶段索引")

class ExcavationStage(BaseModel):
    """开挖阶段模型"""
    project_id: int = Field(..., description="项目ID")
    name: str = Field(..., description="阶段名称")
    elements: List[int] = Field(..., description="开挖单元列表")
    water_level: Optional[float] = Field(None, description="水位高程")
    time_step: float = Field(1.0, description="时间步长")

class SolverSettings(BaseModel):
    """求解器设置模型"""
    project_id: int = Field(..., description="项目ID")
    solver_type: SolverTypeEnum = Field(SolverTypeEnum.DIRECT, description="求解器类型")
    max_iterations: int = Field(100, description="最大迭代次数", ge=1)
    tolerance: float = Field(1e-6, description="收敛容差", gt=0)
    load_steps: int = Field(1, description="加载步数", ge=1)
    time_steps: Optional[List[float]] = Field(None, description="时间步列表")
    num_threads: Optional[int] = Field(None, description="线程数")
    advanced_settings: Optional[Dict[str, Any]] = Field(None, description="高级设置")

class ImportModel(BaseModel):
    """导入模型模型"""
    project_id: int = Field(..., description="项目ID")
    format: ModelFormatEnum = Field(..., description="导入格式")

class ExportModel(BaseModel):
    """导出模型模型"""
    project_id: int = Field(..., description="项目ID")
    task_id: str = Field(..., description="计算任务ID")
    format: ModelFormatEnum = Field(..., description="导出格式")

class ComputeResponse(BaseModel):
    """计算响应模型"""
    id: Union[int, str]
    status: str
    message: str
    compute_info: Dict[str, Any] = Field(default_factory=dict)

# 模拟计算任务状态
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
                "max_displacement": 0.058,  # 示例值
                "max_stress": 250.5,  # 示例值
                "iterations": 45,  # 示例值
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
        # 验证项目存在
        # 略...
        
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
                "estimated_time": "约 10 秒"  # 示例值
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"启动计算任务失败: {str(e)}"
        )

@router.post("/materials", response_model=ComputeResponse, summary="添加材料")
async def add_material(
    material: MaterialDefinition,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    添加材料
    
    - **material**: 材料定义，包括材料类型和参数
    """
    try:
        # 验证项目存在
        # 略...
        
        # 获取任务ID
        task_id = str(material.project_id)  # 在实际实现中应使用真实的任务ID
        
        # 添加材料
        material_id = engine.add_material(
            task_id=task_id,
            name=material.name,
            material_type=material.material_type.value,
            parameters=material.parameters.dict(),
            group_ids=material.group_ids
        )
        
        return ComputeResponse(
            id=material_id,
            status="success",
            message="材料添加成功",
            compute_info={
                "material_name": material.name,
                "material_type": material.material_type
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"添加材料失败: {str(e)}"
        )

@router.post("/elements", response_model=ComputeResponse, summary="设置单元类型")
async def set_element_type(
    element: ElementDefinition,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    设置单元类型
    
    - **element**: 单元定义，包括单元类型和物理组ID
    """
    try:
        # 验证项目存在
        # 略...
        
        # 获取任务ID
        task_id = str(element.project_id)  # 在实际实现中应使用真实的任务ID
        
        # 设置单元类型
        success = engine.set_element_type(
            task_id=task_id,
            element_type=element.element_type.value,
            group_ids=element.group_ids
        )
        
        if not success:
            raise ValueError("设置单元类型失败")
            
        return ComputeResponse(
            id=task_id,
            status="success",
            message="单元类型设置成功",
            compute_info={
                "element_type": element.element_type,
                "group_ids": element.group_ids
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"设置单元类型失败: {str(e)}"
        )

@router.post("/boundary-conditions", response_model=ComputeResponse, summary="添加边界条件")
async def add_boundary_condition(
    condition: BoundaryCondition,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    添加边界条件
    
    - **condition**: 边界条件，包括类型、实体ID和值
    """
    try:
        # 验证项目存在
        # 略...
        
        # 获取任务ID
        task_id = str(condition.project_id)  # 在实际实现中应使用真实的任务ID
        
        # 添加边界条件
        bc_id = engine.add_boundary_condition(
            task_id=task_id,
            bc_type=condition.bc_type.value,
            entities=condition.entities,
            values=condition.values
        )
        
        return ComputeResponse(
            id=bc_id,
            status="success",
            message="边界条件添加成功",
            compute_info={
                "bc_type": condition.bc_type,
                "entity_count": len(condition.entities)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"添加边界条件失败: {str(e)}"
        )

@router.post("/loads", response_model=ComputeResponse, summary="添加荷载")
async def add_load(
    load: LoadDefinition,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    添加荷载
    
    - **load**: 荷载定义，包括类型、实体ID和值
    """
    try:
        # 验证项目存在
        # 略...
        
        # 获取任务ID
        task_id = str(load.project_id)  # 在实际实现中应使用真实的任务ID
        
        # 添加荷载
        load_id = engine.add_load(
            task_id=task_id,
            load_type=load.load_type.value,
            entities=load.entities,
            values=load.values,
            stage=load.stage
        )
        
        return ComputeResponse(
            id=load_id,
            status="success",
            message="荷载添加成功",
            compute_info={
                "load_type": load.load_type,
                "entity_count": len(load.entities),
                "stage": load.stage
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"添加荷载失败: {str(e)}"
        )

@router.post("/excavation-stages", response_model=ComputeResponse, summary="添加开挖阶段")
async def add_excavation_stage(
    stage: ExcavationStage,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    添加开挖阶段
    
    - **stage**: 开挖阶段定义，包括名称、单元列表和水位高程
    """
    try:
        # 验证项目存在
        # 略...
        
        # 获取任务ID
        task_id = str(stage.project_id)  # 在实际实现中应使用真实的任务ID
        
        # 添加开挖阶段
        stage_idx = engine.add_excavation_stage(
            task_id=task_id,
            name=stage.name,
            elements=stage.elements,
            water_level=stage.water_level,
            time_step=stage.time_step
        )
        
        return ComputeResponse(
            id=stage_idx,
            status="success",
            message="开挖阶段添加成功",
            compute_info={
                "stage_name": stage.name,
                "element_count": len(stage.elements),
                "water_level": stage.water_level
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"添加开挖阶段失败: {str(e)}"
        )

@router.post("/solver-settings", response_model=ComputeResponse, summary="设置求解器参数")
async def set_solver_settings(
    settings: SolverSettings,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    设置求解器参数
    
    - **settings**: 求解器设置，包括求解器类型和迭代参数
    """
    try:
        # 验证项目存在
        # 略...
        
        # 获取任务ID
        task_id = str(settings.project_id)  # 在实际实现中应使用真实的任务ID
        
        # 设置求解器参数
        solver_settings = {
            "max_iterations": settings.max_iterations,
            "tolerance": settings.tolerance,
            "load_steps": settings.load_steps,
            "time_steps": settings.time_steps,
            "num_threads": settings.num_threads
        }
        
        if settings.advanced_settings:
            solver_settings.update(settings.advanced_settings)
        
        success = engine.set_solver_settings(
            task_id=task_id,
            solver_type=settings.solver_type.value,
            settings=solver_settings
        )
        
        if not success:
            raise ValueError("设置求解器参数失败")
        
        return ComputeResponse(
            id=task_id,
            status="success",
            message="求解器参数设置成功",
            compute_info={
                "solver_type": settings.solver_type,
                "max_iterations": settings.max_iterations,
                "tolerance": settings.tolerance
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"设置求解器参数失败: {str(e)}"
        )

@router.post("/import", response_model=ComputeResponse, summary="导入模型")
async def import_model(
    import_info: ImportModel,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    导入模型
    
    - **import_info**: 导入信息，包括项目ID和格式
    - **file**: 导入的模型文件
    """
    try:
        # 保存上传的文件
        temp_dir = f"./data/temp/project_{import_info.project_id}"
        os.makedirs(temp_dir, exist_ok=True)
        file_path = os.path.join(temp_dir, file.filename)
        
        with open(file_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # 导入模型
        task_id = engine.import_model(file_path, import_info.format.value)
        
        return ComputeResponse(
            id=task_id,
            status="success",
            message="模型导入成功",
            compute_info={
                "file_name": file.filename,
                "format": import_info.format,
                "task_id": task_id
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导入模型失败: {str(e)}"
        )

@router.post("/export", response_model=ComputeResponse, summary="导出模型")
async def export_model(
    export_info: ExportModel,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    导出模型
    
    - **export_info**: 导出信息，包括项目ID、任务ID和格式
    """
    try:
        # 创建导出目录
        export_dir = f"./data/export/project_{export_info.project_id}"
        os.makedirs(export_dir, exist_ok=True)
        
        # 设置导出文件路径
        file_name = f"model_{export_info.task_id}.{export_info.format.value}"
        output_file = os.path.join(export_dir, file_name)
        
        # 导出模型
        result_file = engine.export_model(
            task_id=export_info.task_id,
            output_file=output_file,
            format=export_info.format.value
        )
        
        if not result_file:
            raise ValueError("导出模型失败")
            
        return ComputeResponse(
            id=export_info.task_id,
            status="success",
            message="模型导出成功",
            compute_info={
                "file_path": result_file,
                "format": export_info.format
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出模型失败: {str(e)}"
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

@router.get("/{task_id}/export-results", response_model=ComputeResponse, summary="导出计算结果")
async def export_computation_results(
    task_id: str,
    format: str = "vtk",
    stage: Optional[int] = None,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    导出计算结果
    
    - **task_id**: 计算任务ID
    - **format**: 导出格式
    - **stage**: 施工阶段索引
    """
    try:
        # 导出结果
        result_file = engine.export_results(task_id, format)
        
        if not result_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"无法导出计算结果 {task_id}"
            )
            
        return ComputeResponse(
            id=task_id,
            status="success",
            message="计算结果导出成功",
            compute_info={
                "result_file": result_file,
                "format": format
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"导出计算结果失败: {str(e)}"
        ) 