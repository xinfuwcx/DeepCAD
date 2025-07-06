from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Union, Literal, Annotated, Any, Dict, Optional, Tuple
import logging
import os
import tempfile
import json
import uuid
import shutil
from datetime import datetime

# --- 自定义模块 ---
from ...core.v5_runner import run_v5_analysis
from ...core.analysis_runner import (
    DeepExcavationModel, run_deep_excavation_analysis
)
from ...core.kratos_solver import KratosSolver

# --- 日志配置 ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


router = APIRouter()


# ############################################################################
# ### 全新的、与前端同步的参数化数据模型 (The New Backend Blueprint)
# ############################################################################

class Point2D(BaseModel):
    x: float
    y: float


class Point3D(BaseModel):
    x: float
    y: float
    z: float


# --- 特征基础模型 ---
class BaseFeature(BaseModel):
    id: str
    name: str
    parentId: Optional[str] = None


# --- 几何特征 ---
class CreateBoxParameters(BaseModel):
    width: float
    height: float
    depth: float
    position: Point3D


class CreateBoxFeature(BaseFeature):
    type: Literal['CreateBox'] = 'CreateBox'
    parameters: CreateBoxParameters


# --- 2D 草图特征 ---
class CreateSketchParameters(BaseModel):
    plane: Literal['XY', 'XZ', 'YZ']
    plane_offset: float
    # 为了简化，我们先假设草图就是一个闭合的矩形
    points: List[Point2D]


class CreateSketchFeature(BaseFeature):
    type: Literal['CreateSketch'] = 'CreateSketch'
    parameters: CreateSketchParameters


# --- 从草图拉伸的特征 ---
class ExtrudeParameters(BaseModel):
    depth: float


class ExtrudeFeature(BaseFeature):
    type: Literal['Extrude'] = 'Extrude'
    parentId: str  # 拉伸特征必须依赖于一个草图特征
    parameters: ExtrudeParameters


# --- 高级分析特征 (Fusion-Style) ---
class AddInfiniteDomainParameters(BaseModel):
    thickness: float  # 无限元层的厚度


class AddInfiniteDomainFeature(BaseFeature):
    type: Literal['AddInfiniteDomain'] = 'AddInfiniteDomain'
    parentId: str  # 必须依附于一个已经存在的3D体
    parameters: AddInfiniteDomainParameters


# --- 分析特征 ---
class AssignGroupParameters(BaseModel):
    group_name: str
    entity_type: Literal['face', 'volume']
    entity_tags: List[int]  # 前端在选择时, 会获取到几何实体的唯一标识(tag)


class AssignGroupFeature(BaseFeature):
    type: Literal['AssignGroup'] = 'AssignGroup'
    parameters: AssignGroupParameters


# --- 新增的工程特征 (New Engineering Features) ---


class CreateDiaphragmWallParameters(BaseModel):
    """地连墙参数"""
    path: Tuple[Point3D, Point3D]
    thickness: float
    height: float
    analysis_model: Literal['shell', 'solid'] = 'shell'


class CreateDiaphragmWallFeature(BaseFeature):
    type: Literal['CreateDiaphragmWall'] = 'CreateDiaphragmWall'
    parameters: CreateDiaphragmWallParameters


class CreatePileRaftParameters(BaseModel):
    """排桩参数"""
    path: Tuple[Point3D, Point3D]
    pile_diameter: float
    pile_spacing: float
    pile_length: float
    cap_beam_width: float
    cap_beam_height: float
    pile_analysis_model: Literal['beam', 'solid'] = 'beam'
    cap_beam_analysis_model: Literal['beam', 'solid'] = 'beam'


class CreatePileRaftFeature(BaseFeature):
    type: Literal['CreatePileRaft'] = 'CreatePileRaft'
    parameters: CreatePileRaftParameters


class CreateAnchorSystemParameters(BaseModel):
    """锚杆系统参数"""
    row_count: int
    horizontal_spacing: float
    vertical_spacing: float
    start_height: float
    anchor_length: float
    angle: float
    prestress: float
    waler_width: float
    waler_height: float
    anchor_analysis_model: Literal['beam', 'truss'] = 'beam'
    waler_analysis_model: Literal['beam', 'solid'] = 'beam'


class CreateAnchorSystemFeature(BaseFeature):
    type: Literal['CreateAnchorSystem'] = 'CreateAnchorSystem'
    parentId: str  # 锚杆必须依附于一个父对象 (如墙)
    parameters: CreateAnchorSystemParameters


class CreateExcavationParameters(BaseModel):
    """通过轮廓点和深度定义开挖"""
    points: List[Point2D]
    depth: float


class CreateExcavationFeature(BaseFeature):
    type: Literal['CreateExcavation'] = 'CreateExcavation'
    parameters: CreateExcavationParameters


class CreateExcavationFromDXFParameters(BaseModel):
    """通过DXF文件和图层名定义开挖"""
    dxfFileContent: str
    layerName: str
    depth: float


class CreateExcavationFromDXFFeature(BaseFeature):
    type: Literal['CreateExcavationFromDXF'] = 'CreateExcavationFromDXF'
    parameters: CreateExcavationFromDXFParameters


class CreateGeologicalModelParameters(BaseModel):
    csvData: str
    terrainParams: Optional[Dict[str, Any]] = None
    layerInfo: Optional[List[Dict[str, Any]]] = None


class CreateGeologicalModelFeature(BaseFeature):
    type: Literal['CreateGeologicalModel'] = 'CreateGeologicalModel'
    parameters: CreateGeologicalModelParameters


# --- 新增：分析设置模型 (FEABench能力融合) ---
class MeshSettings(BaseModel):
    """网格划分设置"""
    global_mesh_size: float = Field(10.0, description="全局最大网格尺寸")
    refinement_level: int = Field(1, description="局部细化等级, 1-5")


class AnalysisSettings(BaseModel):
    """分析工况设置"""
    analysis_type: Literal['static', 'staged_construction'] = Field(
        'static', description="分析类型")
    num_steps: int = Field(1, description="分析步数")


# --- 特征联合体 ---
AnyFeature = Annotated[
    Union[
        CreateBoxFeature,
        CreateSketchFeature,
        ExtrudeFeature,
        AddInfiniteDomainFeature,
        AssignGroupFeature,
        CreateDiaphragmWallFeature,
        CreatePileRaftFeature,
        CreateAnchorSystemFeature,
        CreateExcavationFeature,
        CreateExcavationFromDXFFeature,
        CreateGeologicalModelFeature,
    ],
    Field(discriminator="type")
]


# --- 场景顶层模型 ---
class ParametricScene(BaseModel):
    version: str = "2.0-parametric"
    features: List[AnyFeature]
    mesh_settings: Optional[MeshSettings] = None
    analysis_settings: Optional[AnalysisSettings] = None


class AnalysisRequest(BaseModel):
    """Analysis request with scene data"""
    scene: ParametricScene
    settings: Dict[str, Any] = {}


class Material(BaseModel):
    """材料定义"""
    id: str
    name: str
    type: str = "soil"
    properties: Dict[str, float]


class BoundaryCondition(BaseModel):
    """边界条件定义"""
    id: str
    name: str
    type: str
    target: str
    value: Union[float, List[float]]
    constrained: Optional[List[bool]] = None


class Load(BaseModel):
    """荷载定义"""
    id: str
    name: str
    type: str
    target: str
    value: Union[float, List[float]]


class KratosAnalysisSettings(BaseModel):
    """Kratos分析设置"""
    analysis_type: str = "static"
    solver_type: str = "direct"
    tolerance: float = 1e-6
    max_iterations: int = 1000
    time_step: Optional[float] = None
    end_time: Optional[float] = None


class StructuralAnalysisRequest(BaseModel):
    """结构分析请求"""
    mesh_file: str
    materials: List[Material]
    boundary_conditions: List[BoundaryCondition]
    loads: Optional[List[Load]] = None
    settings: KratosAnalysisSettings


class SeepageAnalysisRequest(BaseModel):
    """渗流分析请求"""
    mesh_file: str
    materials: List[Material]
    boundary_conditions: List[BoundaryCondition]
    settings: KratosAnalysisSettings


class CoupledAnalysisRequest(BaseModel):
    """流固耦合分析请求"""
    mesh_file: str
    materials: List[Material]
    boundary_conditions: List[BoundaryCondition]
    coupling_settings: Dict[str, Any]
    settings: KratosAnalysisSettings


class AnalysisResponse(BaseModel):
    """Analysis response"""
    status: str
    message: str
    result_id: Optional[str] = None
    mesh_filename: Optional[str] = None
    visualization_data: Optional[Dict[str, Any]] = None


# ############################################################################
# ### API Endpoints
# ############################################################################

@router.post("/analyze", response_model=AnalysisResult,
             tags=["Parametric Analysis"])
async def run_parametric_analysis(scene: ParametricScene):
    """
    接收参数化场景，调用V5分析引擎，并返回分析结果。
    """
    logger.info(f"接收到对 v5 引擎的参数化分析请求: {scene.version}")
    try:
        results = run_v5_analysis(scene)
        fem_results = results.get("results", {})

        if fem_results.get("status") == "failed":
            raise HTTPException(
                status_code=500,
                detail=fem_results.get("message", "V5 Runner failed")
            )

        return AnalysisResult(
            status=fem_results.get("status", "unknown"),
            message=fem_results.get(
                "message",
                "Analysis finished with unknown status."
            ),
            mesh_statistics=fem_results.get("mesh_statistics", {}),
            mesh_filename=fem_results.get("mesh_filename")
        )

    except Exception as e:
        logger.error(f"参数化分析失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred in router: {str(e)}"
        )


@router.get("/results/{filename_with_ext}", tags=["Parametric Analysis"])
async def get_analysis_result_file(filename_with_ext: str):
    """获取参数化分析的结果文件（如VTK）。"""
    import tempfile
    temp_dir = tempfile.gettempdir()
    all_temp_dirs = [os.path.join(temp_dir, d) for d in os.listdir(temp_dir)]
    kratos_dirs = [
        d for d in all_temp_dirs
        if os.path.isdir(d) and os.path.basename(d).startswith('kratos_v5_')
    ]

    if not kratos_dirs:
        raise HTTPException(
            status_code=404, detail="找不到Kratos运行器的临时目录。"
        )

    latest_dir = max(kratos_dirs, key=os.path.getmtime)
    file_path = os.path.join(latest_dir, filename_with_ext)

    if not os.path.isfile(file_path):
        raise HTTPException(
            status_code=404,
            detail=f"结果文件未找到: {file_path}"
        )
    return FileResponse(file_path)


# ############################################################################
# ### Legacy Deep Excavation API (To be deprecated)
# ############################################################################


@router.post("/deep-excavation/analyze", tags=["Legacy Analysis"])
async def analyze_deep_excavation(model: DeepExcavationModel):
    """
    (旧) 执行深基坑工程统一分析，可包含多种分析类型
    """
    logger.info(f"收到旧版深基坑工程分析请求: {model.project_name}")
    
    try:
        result = run_deep_excavation_analysis(model)
        
        return {
            "status": "success",
            "project_name": model.project_name,
            "results": result
        }
    except Exception as e:
        logger.error(f"深基坑工程分析失败: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"分析过程中发生错误: {str(e)}"
        )


@router.get(
    "/deep-excavation/results/{project_id}", tags=["Legacy Analysis"]
)
async def get_deep_excavation_results(project_id: str):
    """
    (旧) 获取深基坑工程分析结果
    """
    logger.info(f"获取深基坑工程分析结果: {project_id}")
    
    return {
        "project_id": project_id,
        "status": "completed",
        "results": {
            "seepage": {
                "total_discharge_m3_per_s": 0.005,
                "max_head_difference": 5.0
            },
            "structural": {
                "max_displacement_mm": 15.3,
                "max_bending_moment_kNm": 320.5
            },
            "deformation": {
                "max_vertical_displacement_mm": 25.8,
                "max_horizontal_displacement_mm": 18.2
            },
            "stability": {
                "safety_factor": 1.35
            },
            "settlement": {
                "max_settlement_mm": 32.5,
                "influence_range_m": 45.2
            }
        }
    }


@router.get(
    "/deep-excavation/result-file/{project_id}/{analysis_type}",
    tags=["Legacy Analysis"]
)
async def get_deep_excavation_result_file(project_id: str, analysis_type: str):
    """
    (旧) 获取深基坑工程分析结果文件
    """
    logger.info(f"获取深基坑工程分析结果文件: {project_id}, 分析类型: {analysis_type}")
    
    raise HTTPException(
        status_code=404,
        detail=f"未找到项目 {project_id} 的 {analysis_type} 分析结果文件"
    )


@router.post("/run", response_model=AnalysisResponse)
async def run_analysis(request: AnalysisRequest):
    """
    Run a parametric analysis based on the provided scene.
    """
    try:
        # 运行V5分析
        result = run_v5_analysis(request.scene.dict())
        
        return {
            "status": "success",
            "message": "Analysis completed successfully",
            "result_id": result.get("result_id", str(uuid.uuid4())),
            "mesh_filename": result.get("mesh_filename"),
            "visualization_data": result.get("visualization_data")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results/{filename}")
async def get_analysis_result(filename: str):
    """
    Get an analysis result file by filename.
    """
    # 安全检查，确保文件名不包含路径遍历
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    # 假设结果文件存储在临时目录中
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Result file not found")
    
    return FileResponse(file_path)


@router.post("/structural", response_model=AnalysisResponse)
async def run_structural_analysis(request: StructuralAnalysisRequest, background_tasks: BackgroundTasks):
    """
    运行结构分析
    """
    try:
        # 创建唯一的工作目录
        work_dir = tempfile.mkdtemp(prefix="kratos_structural_")
        
        # 准备材料数据
        materials_data = []
        for material in request.materials:
            kratos_material = {
                "model_part_name": f"Structure.{material.name}",
                "properties_id": material.id,
                "Material": {
                    "constitutive_law": {"name": "LinearElastic3DLaw"},
                    "Variables": material.properties
                }
            }
            materials_data.append(kratos_material)
        
        # 准备边界条件
        boundary_conditions = []
        for bc in request.boundary_conditions:
            boundary_conditions.append(bc.dict())
        
        # 准备荷载
        loads = []
        if request.loads:
            for load in request.loads:
                loads.append(load.dict())
        
        # 准备求解器设置
        solver_settings = {
            "solver_type": request.settings.solver_type,
            "linear_solver_settings": {
                "solver_type": request.settings.solver_type,
                "tolerance": request.settings.tolerance,
                "max_iteration": request.settings.max_iterations
            }
        }
        
        if request.settings.time_step and request.settings.end_time:
            solver_settings["time_stepping"] = {
                "time_step": request.settings.time_step,
                "end_time": request.settings.end_time
            }
        
        # 创建求解器实例
        solver = KratosSolver(work_dir)
        
        # 在后台任务中运行分析
        result_id = str(uuid.uuid4())
        
        def run_analysis_task():
            try:
                # 复制网格文件到工作目录
                mesh_src = request.mesh_file
                mesh_dest = os.path.join(work_dir, os.path.basename(mesh_src))
                shutil.copy(mesh_src, mesh_dest)
                
                # 运行分析
                result_file = solver.run_structural_analysis(
                    mesh_dest,
                    materials_data,
                    request.settings.analysis_type,
                    solver_settings,
                    boundary_conditions,
                    loads
                )
                
                # 保存结果元数据
                result_meta = {
                    "id": result_id,
                    "type": "structural",
                    "timestamp": datetime.now().isoformat(),
                    "result_file": result_file,
                    "settings": request.settings.dict()
                }
                
                with open(os.path.join(work_dir, "result_meta.json"), "w") as f:
                    json.dump(result_meta, f)
                
            except Exception as e:
                print(f"Analysis failed: {str(e)}")
        
        # 添加后台任务
        background_tasks.add_task(run_analysis_task)
        
        return {
            "status": "processing",
            "message": "Structural analysis started",
            "result_id": result_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/seepage", response_model=AnalysisResponse)
async def run_seepage_analysis(request: SeepageAnalysisRequest, background_tasks: BackgroundTasks):
    """
    运行渗流分析
    """
    try:
        # 创建唯一的工作目录
        work_dir = tempfile.mkdtemp(prefix="kratos_seepage_")
        
        # 准备材料数据
        materials_data = []
        for material in request.materials:
            materials_data.append({
                "name": material.name,
                "hydraulic_conductivity_x": material.properties.get("hydraulic_conductivity_x", 1e-5),
                "hydraulic_conductivity_y": material.properties.get("hydraulic_conductivity_y", 1e-5),
                "hydraulic_conductivity_z": material.properties.get("hydraulic_conductivity_z", 1e-5),
                "porosity": material.properties.get("porosity", 0.3)
            })
        
        # 准备边界条件
        boundary_conditions = []
        for bc in request.boundary_conditions:
            boundary_conditions.append(bc.dict())
        
        # 准备求解器设置
        solver_settings = {
            "solver_type": request.settings.solver_type,
            "linear_solver_settings": {
                "solver_type": request.settings.solver_type,
                "tolerance": request.settings.tolerance,
                "max_iteration": request.settings.max_iterations
            }
        }
        
        if request.settings.time_step and request.settings.end_time:
            solver_settings["time_stepping"] = {
                "time_step": request.settings.time_step,
                "end_time": request.settings.end_time
            }
        
        # 创建求解器实例
        solver = KratosSolver(work_dir)
        
        # 在后台任务中运行分析
        result_id = str(uuid.uuid4())
        
        def run_analysis_task():
            try:
                # 复制网格文件到工作目录
                mesh_src = request.mesh_file
                mesh_dest = os.path.join(work_dir, os.path.basename(mesh_src))
                shutil.copy(mesh_src, mesh_dest)
                
                # 运行分析
                result_file = solver.run_seepage_analysis(
                    mesh_dest,
                    materials_data,
                    boundary_conditions,
                    "steady_state" if request.settings.analysis_type == "steady_state" else "transient",
                    solver_settings
                )
                
                # 保存结果元数据
                result_meta = {
                    "id": result_id,
                    "type": "seepage",
                    "timestamp": datetime.now().isoformat(),
                    "result_file": result_file,
                    "settings": request.settings.dict()
                }
                
                with open(os.path.join(work_dir, "result_meta.json"), "w") as f:
                    json.dump(result_meta, f)
                
            except Exception as e:
                print(f"Analysis failed: {str(e)}")
        
        # 添加后台任务
        background_tasks.add_task(run_analysis_task)
        
        return {
            "status": "processing",
            "message": "Seepage analysis started",
            "result_id": result_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/coupled", response_model=AnalysisResponse)
async def run_coupled_analysis(request: CoupledAnalysisRequest, background_tasks: BackgroundTasks):
    """
    运行流固耦合分析
    """
    try:
        # 创建唯一的工作目录
        work_dir = tempfile.mkdtemp(prefix="kratos_coupled_")
        
        # 准备材料数据
        materials_data = []
        for material in request.materials:
            materials_data.append(material.dict())
        
        # 准备边界条件
        boundary_conditions = []
        for bc in request.boundary_conditions:
            boundary_conditions.append(bc.dict())
        
        # 创建求解器实例
        solver = KratosSolver(work_dir)
        
        # 在后台任务中运行分析
        result_id = str(uuid.uuid4())
        
        def run_analysis_task():
            try:
                # 复制网格文件到工作目录
                mesh_src = request.mesh_file
                mesh_dest = os.path.join(work_dir, os.path.basename(mesh_src))
                shutil.copy(mesh_src, mesh_dest)
                
                # 运行分析
                result_file = solver.run_coupled_analysis(
                    mesh_dest,
                    materials_data,
                    boundary_conditions,
                    request.coupling_settings
                )
                
                # 保存结果元数据
                result_meta = {
                    "id": result_id,
                    "type": "coupled",
                    "timestamp": datetime.now().isoformat(),
                    "result_file": result_file,
                    "settings": request.settings.dict(),
                    "coupling_settings": request.coupling_settings
                }
                
                with open(os.path.join(work_dir, "result_meta.json"), "w") as f:
                    json.dump(result_meta, f)
                
            except Exception as e:
                print(f"Analysis failed: {str(e)}")
        
        # 添加后台任务
        background_tasks.add_task(run_analysis_task)
        
        return {
            "status": "processing",
            "message": "Coupled analysis started",
            "result_id": result_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{result_id}")
async def get_analysis_status(result_id: str):
    """
    获取分析状态
    """
    # 在临时目录中查找结果元数据
    temp_dir = tempfile.gettempdir()
    
    # 搜索包含结果ID的目录
    result_dirs = []
    for root, dirs, files in os.walk(temp_dir):
        for dir_name in dirs:
            if "kratos_" in dir_name:
                meta_file = os.path.join(temp_dir, dir_name, "result_meta.json")
                if os.path.exists(meta_file):
                    try:
                        with open(meta_file, "r") as f:
                            meta = json.load(f)
                            if meta.get("id") == result_id:
                                result_dirs.append(os.path.join(temp_dir, dir_name))
                    except:
                        pass
    
    if not result_dirs:
        raise HTTPException(status_code=404, detail="Analysis result not found")
    
    # 使用找到的第一个目录
    result_dir = result_dirs[0]
    meta_file = os.path.join(result_dir, "result_meta.json")
    
    with open(meta_file, "r") as f:
        meta = json.load(f)
    
    # 检查结果文件是否存在
    if "result_file" in meta and os.path.exists(meta["result_file"]):
        return {
            "status": "completed",
            "message": "Analysis completed",
            "result_id": result_id,
            "result_file": os.path.basename(meta["result_file"]),
            "type": meta.get("type", "unknown"),
            "timestamp": meta.get("timestamp")
        }
    else:
        return {
            "status": "processing",
            "message": "Analysis is still running",
            "result_id": result_id,
            "type": meta.get("type", "unknown"),
            "timestamp": meta.get("timestamp")
        } 