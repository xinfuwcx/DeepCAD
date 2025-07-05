from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Union, Literal, Annotated, Any, Dict, Optional, Tuple
import logging
import os
from starlette.responses import FileResponse

# --- 自定义模块 ---
from ..core.v5_runner import run_v5_analysis
from ..core.analysis_runner import (
    DeepExcavationModel, run_deep_excavation_analysis
)

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
    analysis_type: Literal['static', 'staged_construction'] = Field('static', description="分析类型")
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


class AnalysisResult(BaseModel):
    status: str
    message: str
    mesh_statistics: Dict[str, Any]
    mesh_filename: Optional[str] = None


# ############################################################################
# ### 后端特征重放引擎 (The Backend Replay Engine)
# ############################################################################

# This function is now obsolete and will be removed.
# The logic has been moved to v5_runner.py
# def replay_features_and_mesh(scene: ParametricScene) -> tuple[meshio.Mesh, str]:
#    ... (rest of the old function)


# ############################################################################
# ### API Endpoints
# ############################################################################

@router.post("/analyze", response_model=AnalysisResult, tags=["Parametric Analysis"])
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
    # 安全警告: 在真实应用中, 这是一个潜在的安全风险。
    # 应当使用安全的临时目录，并将用户的会话ID映射到结果。
    # 为简化项目，我们假设文件名是安全的。
    import tempfile  # 局部导入以避免混乱

    # Hack: 查找临时目录。真实实现应使用共享缓存（如Redis）来存储路径。
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

    # 找到最新的一个
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
        # 调用统一分析入口函数
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
    
    # 这里应该从数据库或文件系统中获取结果
    # 简化处理，返回模拟结果
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
    
    # 这里应该从文件系统中获取结果文件
    # 简化处理，返回错误
    raise HTTPException(
        status_code=404,
        detail=f"未找到项目 {project_id} 的 {analysis_type} 分析结果文件"
    ) 