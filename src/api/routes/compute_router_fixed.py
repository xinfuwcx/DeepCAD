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
# IGA solver已废弃，不再使用

try:
    # from src.core.simulation.seepage_structure_coupling import SeepageStructureCoupling
    # HAS_SEEPAGE_COUPLING = True
    HAS_SEEPAGE_COUPLING = False
    print("警告: 渗流-结构耦合分析模块暂时禁用")
except ImportError:
    HAS_SEEPAGE_COUPLING = False
    print("警告: 渗流-结构耦合分析模块未找到，相关API将不可用")

# 创建路由�?router = APIRouter()

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
    friction_angle: Optional[float] = Field(None, description="摩擦角度", ge=0)
    dilatancy_angle: Optional[float] = Field(None, description="膨胀角度", ge=0)
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
    """开挖阶段模�?""
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

# 模拟计算任务状�?computation_tasks = {}

# 分步施工分析存储
staged_analyses = {}

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
                "max_displacement": 0.058,  # 示例�?                "max_stress": 250.5,  # 示例�?                "iterations": 45,  # 示例�?                "converged": True
            }
        })
    except Exception as e:
        computation_tasks[task_id].update({
            "status": "failed",
            "error": str(e),
            "completed_at": time.time()
        })

# 渗流-结构耦合分析相关的数据模�?class CouplingTypeEnum(str, Enum):
    MONOLITHIC = "monolithic"  # 一体化求解
    STAGGERED = "staggered"    # 分离式求�?
class SeepageCouplingRequest(BaseModel):
    """渗流-结构耦合分析请求"""
    project_id: int = Field(..., description="项目ID")
    model_file: str = Field(..., description="模型文件路径")
    coupling_scheme: CouplingTypeEnum = Field(CouplingTypeEnum.STAGGERED, description="耦合方案")
    time_step: float = Field(0.1, description="时间步长(s)", gt=0)
    total_time: float = Field(10.0, description="总计算时�?s)", gt=0)
    convergence_tolerance: float = Field(1e-5, description="收敛容差", gt=0)
    max_iterations: int = Field(20, description="最大迭代次�?, ge=1)
    consider_porosity_change: bool = Field(True, description="是否考虑孔隙率变�?)
    output_interval: float = Field(1.0, description="输出间隔(s)", gt=0)
    materials: Dict[str, Dict[str, Any]] = Field(..., description="材料属�?)
    boundary_conditions: Dict[str, Any] = Field(..., description="边界条件")

class SeepageCouplingResponse(BaseModel):
    """渗流-结构耦合分析响应"""
    task_id: str
    status: str
    message: str
    info: Optional[Dict[str, Any]] = None

# 渗流-结构耦合分析任务状�?seepage_coupling_tasks = {}

# 渗流-结构耦合分析后台任务
def run_seepage_coupling(task_id: str, settings: SeepageCouplingRequest):
    """执行渗流-结构耦合分析后台任务"""
    try:
        seepage_coupling_tasks[task_id] = {"status": "running", "progress": 0, "started_at": time.time()}
        
        if not HAS_SEEPAGE_COUPLING:
            seepage_coupling_tasks[task_id].update({
                "status": "failed",
                "message": "渗流-结构耦合分析模块未找�?
            })
            return
            
        # 创建渗流-结构耦合分析对象
        coupling = SeepageStructureCoupling()
        
        # 设置耦合参数
        coupling_settings = {
            "time_step": settings.time_step,
            "total_time": settings.total_time,
            "convergence_tolerance": settings.convergence_tolerance,
            "max_iterations": settings.max_iterations,
            "coupling_scheme": settings.coupling_scheme,
            "consider_porosity_change": settings.consider_porosity_change,
            "output_interval": settings.output_interval
        }
        coupling.set_coupling_settings(coupling_settings)
        
        # 更新进度
        seepage_coupling_tasks[task_id]["progress"] = 10
        
        # 导入模型
        model_path = settings.model_file
        if not os.path.exists(model_path):
            seepage_coupling_tasks[task_id].update({
                "status": "failed",
                "message": f"模型文件不存�? {model_path}"
            })
            return
            
        success = coupling.import_model(model_path)
        if not success:
            seepage_coupling_tasks[task_id].update({
                "status": "failed",
                "message": "导入模型失败"
            })
            return
        
        # 更新进度
        seepage_coupling_tasks[task_id]["progress"] = 30
        
        # 设置材料属�?        coupling.setup_material_properties(settings.materials)
        
        # 更新进度
        seepage_coupling_tasks[task_id]["progress"] = 40
        
        # 设置边界条件
        coupling.apply_boundary_conditions(settings.boundary_conditions)
        
        # 更新进度
        seepage_coupling_tasks[task_id]["progress"] = 50
        
        # 初始化分�?        success = coupling.initialize_analysis()
        if not success:
            seepage_coupling_tasks[task_id].update({
                "status": "failed",
                "message": "初始化分析失�?
            })
            return
        
        # 更新进度
        seepage_coupling_tasks[task_id]["progress"] = 60
        
        # 运行分析
        success = coupling.solve()
        if not success:
            seepage_coupling_tasks[task_id].update({
                "status": "failed",
                "message": "求解过程失败"
            })
            return
        
        # 更新进度
        seepage_coupling_tasks[task_id]["progress"] = 90
        
        # 获取结果
        results = coupling.get_results()
        
        # 导出结果
        output_dir = os.path.join(os.path.dirname(model_path), "results")
        os.makedirs(output_dir, exist_ok=True)
        output_file = os.path.join(output_dir, f"seepage_coupling_{task_id}.vtk")
        coupling.export_results(output_file)
        
        # 分析完成
        seepage_coupling_tasks[task_id].update({
            "status": "completed",
            "progress": 100,
            "completed_at": time.time(),
            "results_summary": {
                "output_file": output_file,
                "max_displacement": {
                    "X": max([abs(disp["X"]) for disp in results["displacement"].values()], default=0),
                    "Y": max([abs(disp["Y"]) for disp in results["displacement"].values()], default=0),
                    "Z": max([abs(disp["Z"]) for disp in results["displacement"].values()], default=0)
                },
                "execution_time": time.time() - seepage_coupling_tasks[task_id]["started_at"]
            }
        })
        
    except Exception as e:
        seepage_coupling_tasks[task_id].update({
            "status": "failed",
            "message": f"渗流-结构耦合分析出错: {str(e)}"
        })

# 路由定义
@router.post("/solve", response_model=ComputeResponse, summary="开始计算分�?)
async def start_computation(
    settings: ComputeSettings,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    开始计算分�?    
    - **settings**: 计算设置，包括分析类型、土体模型等
    """
    try:
        # 验证项目存在
        # �?..
        
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
            message="计算任务已启�?,
            compute_info={
                "analysis_type": settings.analysis_type,
                "soil_model": settings.soil_model,
                "estimated_time": "�?10 �?  # 示例�?            }
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
        # �?..
        
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
        # �?..
        
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
    
    - **condition**: 边界条件，包括类型、实体ID和�?    """
    try:
        # 验证项目存在
        # �?..
        
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
    
    - **load**: 荷载定义，包括类型、实体ID和�?    """
    try:
        # 验证项目存在
        # �?..
        
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

@router.post("/excavation-stages", response_model=ComputeResponse, summary="添加开挖阶�?)
async def add_excavation_stage(
    stage: ExcavationStage,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    添加开挖阶�?    
    - **stage**: 开挖阶段定义，包括名称、单元列表和水位高程
    """
    try:
        # 验证项目存在
        # �?..
        
        # 获取任务ID
        task_id = str(stage.project_id)  # 在实际实现中应使用真实的任务ID
        
        # 添加开挖阶�?        stage_idx = engine.add_excavation_stage(
            task_id=task_id,
            name=stage.name,
            elements=stage.elements,
            water_level=stage.water_level,
            time_step=stage.time_step
        )
        
        return ComputeResponse(
            id=stage_idx,
            status="success",
            message="开挖阶段添加成�?,
            compute_info={
                "stage_name": stage.name,
                "element_count": len(stage.elements),
                "water_level": stage.water_level
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"添加开挖阶段失�? {str(e)}"
        )

@router.post("/solver-settings", response_model=ComputeResponse, summary="设置求解器参�?)
async def set_solver_settings(
    settings: SolverSettings,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    设置求解器参�?    
    - **settings**: 求解器设置，包括求解器类型和迭代参数
    """
    try:
        # 验证项目存在
        # �?..
        
        # 获取任务ID
        task_id = str(settings.project_id)  # 在实际实现中应使用真实的任务ID
        
        # 设置求解器参�?        solver_settings = {
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
            raise ValueError("设置求解器参数失�?)
        
        return ComputeResponse(
            id=task_id,
            status="success",
            message="求解器参数设置成�?,
            compute_info={
                "solver_type": settings.solver_type,
                "max_iterations": settings.max_iterations,
                "tolerance": settings.tolerance
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"设置求解器参数失�? {str(e)}"
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
    
    - **import_info**: 导入信息，包括项目ID和格�?    - **file**: 导入的模型文�?    """
    try:
        # 保存上传的文�?        temp_dir = f"./data/temp/project_{import_info.project_id}"
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
    
    - **export_info**: 导出信息，包括项目ID、任务ID和格�?    """
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

@router.get("/{task_id}/status", response_model=ComputeResponse, summary="获取计算状�?)
async def get_computation_status(
    task_id: str,
    db: Session = Depends(get_db),
    engine: ComputeEngine = Depends(get_compute_engine)
):
    """
    获取计算任务状�?    
    - **task_id**: 计算任务ID
    """
    try:
        # 获取任务状�?        status_info = engine.get_status(task_id)
        
        if not status_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"计算任务 {task_id} 不存�?
            )
            
        return ComputeResponse(
            id=task_id,
            status=status_info.get("status", "unknown"),
            message=f"计算任务状�? {status_info.get('status', 'unknown')}",
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
            detail=f"获取计算状态失�? {str(e)}"
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
                detail=f"计算结果 {task_id}/{result_type} 不存�?
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

@router.post("/seepage-coupling", response_model=SeepageCouplingResponse, summary="开始渗�?结构耦合分析")
async def start_seepage_coupling(
    request: SeepageCouplingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    开始渗�?结构耦合分析
    
    此API用于启动渗流-结构耦合分析，考虑地下水流动与土体变形的相互作用�?    分析将在后台运行，可通过返回的task_id查询状态和结果�?    
    - **project_id**: 项目ID
    - **model_file**: 模型文件路径
    - **coupling_scheme**: 耦合方案 (monolithic/staggered)
    - **materials**: 材料属�?    - **boundary_conditions**: 边界条件
    """
    try:
        # 检查模块是否可�?        if not HAS_SEEPAGE_COUPLING:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="渗流-结构耦合分析模块未安装或不可�?
            )
        
        # 检查项目存在�?        # ... 这里应该调用实际的项目验证逻辑 ...
        
        # 生成任务ID
        task_id = f"seepage_coupling_{int(time.time())}"
        
        # 初始化任务状�?        seepage_coupling_tasks[task_id] = {
            "status": "pending",
            "project_id": request.project_id,
            "created_at": time.time()
        }
        
        # 启动后台任务
        background_tasks.add_task(run_seepage_coupling, task_id, request)
        
        return {
            "task_id": task_id,
            "status": "pending",
            "message": "渗流-结构耦合分析任务已创建并在后台运�?
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"创建渗流-结构耦合分析任务失败: {str(e)}"
        )

@router.get("/seepage-coupling/{task_id}/status", response_model=SeepageCouplingResponse, summary="获取渗流-结构耦合分析状�?)
async def get_seepage_coupling_status(task_id: str):
    """
    获取渗流-结构耦合分析任务状�?    
    通过任务ID获取渗流-结构耦合分析的当前状态和进度�?    
    - **task_id**: 任务ID
    """
    if task_id not in seepage_coupling_tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到渗�?结构耦合分析任务: {task_id}"
        )
        
    task_info = seepage_coupling_tasks[task_id]
    
    return {
        "task_id": task_id,
        "status": task_info["status"],
        "message": task_info.get("message", ""),
        "info": {
            "progress": task_info.get("progress", 0),
            "created_at": task_info.get("created_at", 0),
            "started_at": task_info.get("started_at", 0),
            "completed_at": task_info.get("completed_at", 0) if task_info.get("status") == "completed" else None
        }
    }

@router.get("/seepage-coupling/{task_id}/results", response_model=Dict[str, Any], summary="获取渗流-结构耦合分析结果")
async def get_seepage_coupling_results(task_id: str, result_type: str = "displacement"):
    """
    获取渗流-结构耦合分析结果
    
    获取指定任务ID的渗�?结构耦合分析结果�?    
    - **task_id**: 任务ID
    - **result_type**: 结果类型，可选�? displacement(位移), water_pressure(水压�?, stress(应力), flow_velocity(流�?
    """
    if task_id not in seepage_coupling_tasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"未找到渗�?结构耦合分析任务: {task_id}"
        )
        
    task_info = seepage_coupling_tasks[task_id]
    
    if task_info["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"渗流-结构耦合分析任务尚未完成，当前状�? {task_info['status']}"
        )
        
    if "results_summary" not in task_info:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="未找到分析结�?
        )
        
    # 返回结果摘要
    return {
        "task_id": task_id,
        "result_type": result_type,
        "summary": task_info["results_summary"],
        "message": "详细结果请通过导出API获取完整数据"
    }

@router.post("/staged-construction/create", response_model=dict)
def create_staged_construction_analysis(
    project_id: str = Body(...),
    model_file: str = Body(...),
    config: dict = Body(None),
):
    """
    创建分步施工模拟分析
    
    参数:
        project_id: 项目ID
        model_file: 模型文件路径
        config: 配置参数
    
    返回:
        分析ID和状�?    """
    try:
        # 导入分步施工模拟模块
        from src.core.simulation.staged_construction import StagedConstructionAnalysis
        
        # 创建工作目录
        work_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 
                                "data", "projects", project_id, "staged_construction")
        os.makedirs(work_dir, exist_ok=True)
        
        # 创建分析对象
        analysis = StagedConstructionAnalysis(
            project_id=project_id,
            model_file=model_file,
            work_dir=work_dir,
            config=config or {}
        )
        
        # 生成分析ID
        analysis_id = f"staged_const_{project_id}_{int(time.time())}"
        
        # 保存分析配置
        config_file = analysis.save(f"{analysis_id}.json")
        
        # 将分析对象存储到全局变量�?        # 这里只是一个简化的示例，实际应用中应该使用更可靠的存储方式
        staged_analyses[analysis_id] = analysis
        
        return {
            "status": "success",
            "analysis_id": analysis_id,
            "message": "分步施工模拟分析已创�?,
            "config_file": config_file
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"创建分步施工模拟分析失败: {str(e)}"
        )

@router.post("/staged-construction/{analysis_id}/add-stage", response_model=dict)
def add_construction_stage(
    analysis_id: str,
    stage_type: str = Body(...),
    stage_name: str = Body(...),
    stage_data: dict = Body(...),
):
    """
    添加施工阶段
    
    参数:
        analysis_id: 分析ID
        stage_type: 阶段类型
        stage_name: 阶段名称
        stage_data: 阶段数据
    
    返回:
        阶段ID和状�?    """
    try:
        # 导入分步施工模拟模块
        from src.core.simulation.staged_construction import StageType, ConstructionStage
        
        # 获取分析对象
        if not hasattr(compute_router, "staged_analyses") or analysis_id not in staged_analyses:
            raise HTTPException(
                status_code=404,
                detail=f"未找到分析ID: {analysis_id}"
            )
        
        analysis = staged_analyses[analysis_id]
        
        # 根据阶段类型添加不同的阶�?        stage_id = None
        
        if stage_type == "initial":
            stage_id = analysis.add_initial_stage(
                name=stage_name,
                parameters=stage_data.get("parameters", {})
            )
        elif stage_type == "excavation":
            stage_id = analysis.add_excavation_stage(
                name=stage_name,
                elements=stage_data.get("elements", []),
                water_level=stage_data.get("water_level"),
                time_step=stage_data.get("time_step", 0.0),
                parameters=stage_data.get("parameters", {})
            )
        elif stage_type in ["wall", "anchor", "strut"]:
            # 将字符串类型转换为枚�?            enum_type = StageType(stage_type)
            stage_id = analysis.add_support_stage(
                name=stage_name,
                stage_type=enum_type,
                entities=stage_data.get("entities", {}),
                time_step=stage_data.get("time_step", 0.0),
                parameters=stage_data.get("parameters", {})
            )
        elif stage_type == "dewatering":
            stage_id = analysis.add_dewatering_stage(
                name=stage_name,
                water_level=stage_data.get("water_level"),
                area=stage_data.get("area", []),
                time_step=stage_data.get("time_step", 0.0),
                parameters=stage_data.get("parameters", {})
            )
        else:
            # 自定义阶�?            custom_stage = ConstructionStage(
                stage_id=f"stage_{len(analysis.stages)}",
                stage_type=StageType(stage_type),
                stage_name=stage_name,
                stage_description=stage_data.get("description", ""),
                time_step=stage_data.get("time_step", 0.0),
                elements=stage_data.get("elements", []),
                entities=stage_data.get("entities", {}),
                parameters=stage_data.get("parameters", {})
            )
            stage_id = analysis.add_stage(custom_stage)
        
        # 保存更新后的配置
        config_file = analysis.save()
        
        return {
            "status": "success",
            "stage_id": stage_id,
            "message": f"已添加施工阶�? {stage_name}",
            "config_file": config_file
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"添加施工阶段失败: {str(e)}"
        )

@router.post("/staged-construction/{analysis_id}/run", response_model=dict)
def run_staged_construction_analysis(
    analysis_id: str,
    background: bool = Body(True),
):
    """
    运行分步施工模拟分析
    
    参数:
        analysis_id: 分析ID
        background: 是否在后台运�?    
    返回:
        分析状�?    """
    try:
        # 获取分析对象
        if not hasattr(compute_router, "staged_analyses") or analysis_id not in staged_analyses:
            raise HTTPException(
                status_code=404,
                detail=f"未找到分析ID: {analysis_id}"
            )
        
        analysis = staged_analyses[analysis_id]
        
        if background:
            # 后台运行
            thread = threading.Thread(target=analysis.run_analysis)
            thread.daemon = True
            thread.start()
            
            return {
                "status": "success",
                "message": "分步施工模拟分析已在后台启动",
                "analysis_status": analysis.get_status()
            }
        else:
            # 同步运行
            results = analysis.run_analysis()
            return {
                "status": "success",
                "message": "分步施工模拟分析已完�?,
                "analysis_status": analysis.get_status(),
                "results": results
            }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"运行分步施工模拟分析失败: {str(e)}"
        )

@router.get("/staged-construction/{analysis_id}/status", response_model=dict)
def get_staged_construction_status(analysis_id: str):
    """
    获取分步施工模拟分析状�?    
    参数:
        analysis_id: 分析ID
    
    返回:
        分析状�?    """
    try:
        # 获取分析对象
        if not hasattr(compute_router, "staged_analyses") or analysis_id not in staged_analyses:
            raise HTTPException(
                status_code=404,
                detail=f"未找到分析ID: {analysis_id}"
            )
        
        analysis = staged_analyses[analysis_id]
        
        return {
            "status": "success",
            "analysis_status": analysis.get_status(),
            "current_stage": analysis.get_current_stage().to_dict() if analysis.get_current_stage() else None,
            "total_stages": len(analysis.stages)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取分析状态失�? {str(e)}"
        )

@router.get("/staged-construction/{analysis_id}/results/{stage_id}", response_model=dict)
def get_staged_construction_results(analysis_id: str, stage_id: str):
    """
    获取施工阶段的分析结�?    
    参数:
        analysis_id: 分析ID
        stage_id: 阶段ID
    
    返回:
        阶段分析结果
    """
    try:
        # 获取分析对象
        if not hasattr(compute_router, "staged_analyses") or analysis_id not in staged_analyses:
            raise HTTPException(
                status_code=404,
                detail=f"未找到分析ID: {analysis_id}"
            )
        
        analysis = staged_analyses[analysis_id]
        
        # 获取结果
        results = analysis.get_results(stage_id)
        
        # 获取阶段信息
        stage = analysis.get_stage(stage_id)
        if not stage:
            return {
                "status": "error",
                "message": f"未找到阶段ID: {stage_id}"
            }
        
        return {
            "status": "success",
            "stage": stage.to_dict(),
            "results": results
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"获取分析结果失败: {str(e)}"
        )

@router.post("/staged-construction/{analysis_id}/export", response_model=dict)
def export_staged_construction_results(
    analysis_id: str,
    file_format: str = Body("vtk"),
    stage_id: str = Body(None),
    output_path: str = Body(None),
):
    """
    导出分步施工模拟分析结果
    
    参数:
        analysis_id: 分析ID
        file_format: 导出格式
        stage_id: 阶段ID，如果为None则导出最后一个阶�?        output_path: 输出路径，如果为None则使用默认路�?    
    返回:
        导出文件路径
    """
    try:
        # 获取分析对象
        if not hasattr(compute_router, "staged_analyses") or analysis_id not in staged_analyses:
            raise HTTPException(
                status_code=404,
                detail=f"未找到分析ID: {analysis_id}"
            )
        
        analysis = staged_analyses[analysis_id]
        
        # 设置默认输出路径
        if not output_path:
            output_path = os.path.join(
                analysis.work_dir, 
                f"results_{analysis_id}_{stage_id if stage_id else 'final'}.{file_format}"
            )
        
        # 导出结果
        exported_file = analysis.export_results(output_path, file_format, stage_id)
        
        return {
            "status": "success",
            "message": "分析结果已导�?,
            "file_path": exported_file
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"导出分析结果失败: {str(e)}"
        ) 
