from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Union, Literal, Annotated, Any, Dict, Optional, Tuple
import logging
import tempfile
import os
from starlette.responses import FileResponse
import uuid

# --- 真实计算库 ---
import gmsh
import meshio

# --- 自定义模块 ---
from ..core.kratos_solver import run_kratos_analysis
from ..core.analysis_runner import (
    DeepExcavationModel, run_deep_excavation_analysis,
    SoilLayer, StructuralElement, BoundaryCondition, ExcavationStage
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
    ],
    Field(discriminator="type")
]


# --- 场景顶层模型 ---
class ParametricScene(BaseModel):
    version: str = "2.0-parametric"
    features: List[AnyFeature]


class AnalysisResult(BaseModel):
    status: str
    message: str
    mesh_statistics: Dict[str, Any]
    mesh_filename: Optional[str] = None


# ############################################################################
# ### 后端特征重放引擎 (The Backend Replay Engine)
# ############################################################################

def replay_features_and_mesh(scene: ParametricScene) -> tuple[meshio.Mesh, str]:
    """
    后端的特征重放与网格生成引擎
    1. 遍历特征树
    2. 使用Gmsh/OCC执行几何操作
    3. 使用Gmsh/OCC指派物理组
    4. 生成网格并导出
    """
    logger.info("开始后端特征重放与网格生成...")
    gmsh.initialize()
    try:
        gmsh.model.add("parametric_model")
        
        # 这个字典将用于存储特征ID与其在Gmsh中生成的几何实体tag的映射
        feature_to_gmsh_tags: Dict[
            str, Union[int, List[int], List[Tuple[int, int]]]
        ] = {}

        for feature in scene.features:
            logger.info(
                f"正在处理特征: {feature.name} (类型: {feature.type})"
            )

            if feature.type == 'CreateBox':
                p = feature.parameters
                box_tag = gmsh.model.occ.addBox(
                    p.position.x - p.width / 2,
                    p.position.y - p.height / 2,
                    p.position.z - p.depth / 2,
                    p.width, p.height, p.depth
                )
                gmsh.model.occ.synchronize()
                feature_to_gmsh_tags[feature.id] = box_tag
                logger.info(
                    f"特征 '{feature.name}' (ID: {feature.id}) 已创建Box, "
                    f"Gmsh Tag: {box_tag}"
                )

            elif feature.type == 'CreateSketch':
                p = feature.parameters
                # 在选定的平面上创建一系列点，然后连接成线
                points_tags = []
                for point2d in p.points:
                    if p.plane == 'XY':
                        pt = gmsh.model.occ.addPoint(
                            point2d.x, point2d.y, p.plane_offset
                        )
                        points_tags.append(pt)
                    elif p.plane == 'XZ':
                        pt = gmsh.model.occ.addPoint(
                            point2d.x, p.plane_offset, point2d.y
                        )
                        points_tags.append(pt)
                    elif p.plane == 'YZ':
                        pt = gmsh.model.occ.addPoint(
                            p.plane_offset, point2d.x, point2d.y
                        )
                        points_tags.append(pt)
                
                # 连接点成线
                lines_tags = []
                for i in range(len(points_tags)):
                    p1 = points_tags[i]
                    p2 = points_tags[(i + 1) % len(points_tags)]  # 循环连接
                    lines_tags.append(gmsh.model.occ.addLine(p1, p2))

                # 从线创建一个线圈 (Wire)
                curve_loop = gmsh.model.occ.addCurveLoop(lines_tags)
                feature_to_gmsh_tags[feature.id] = curve_loop
                logger.info(
                    f"特征 '{feature.name}' 已创建Sketch, "
                    f"Gmsh CurveLoop Tag: {curve_loop}"
                )

            elif feature.type == 'Extrude':
                p = feature.parameters
                parent_id = feature.parentId
                if not parent_id or parent_id not in feature_to_gmsh_tags:
                    raise ValueError(
                        f"Extrude feature '{feature.name}' has a missing or "
                        f"invalid parent sketch."
                    )
                
                sketch_tag = feature_to_gmsh_tags[parent_id]
                
                # 从线圈创建一个平面
                surface = gmsh.model.occ.addPlaneSurface([sketch_tag])

                # 拉伸平面成体 (暂时只支持沿Z轴正向拉伸)
                extrude_dim_tags = gmsh.model.occ.extrude(
                    [(2, surface)], 0, 0, p.depth
                )
                gmsh.model.occ.synchronize()

                # 从拉伸结果中找到体的tag
                volume_tag = next(
                    (tag for dim, tag in extrude_dim_tags if dim == 3), None
                )
                if volume_tag is None:
                    raise ValueError("Extrusion did not result in a 3D volume.")
                
                feature_to_gmsh_tags[feature.id] = volume_tag
                logger.info(
                    f"特征 '{feature.name}' 已拉伸父草图 '{parent_id}', "
                    f"Gmsh Volume Tag: {volume_tag}"
                )

            elif feature.type == 'AddInfiniteDomain':
                p = feature.parameters
                parent_id = feature.parentId
                if not parent_id or parent_id not in feature_to_gmsh_tags:
                    raise ValueError(
                        f"InfiniteDomain feature '{feature.name}' has a "
                        f"missing or invalid parent body."
                    )
                
                parent_tag = feature_to_gmsh_tags[parent_id]
                if not isinstance(parent_tag, int):
                    raise ValueError("InfiniteDomain can only be applied to a single 3D volume.")
                
                # 创建一个更大的外壳
                min_x, min_y, min_z, max_x, max_y, max_z = gmsh.model.occ.getBoundingBox(3, parent_tag)
                
                shell_tag = gmsh.model.occ.addBox(
                    min_x - p.thickness, min_y - p.thickness, min_z - p.thickness,
                    (max_x - min_x) + 2 * p.thickness,
                    (max_y - min_y) + 2 * p.thickness,
                    (max_z - min_z) + 2 * p.thickness
                )

                # 执行 fragment 操作
                logger.info(f"对体 {parent_tag} 和外壳 {shell_tag} 执行 Fragment 操作...")
                out_tags, out_map = gmsh.model.occ.fragment([(3, parent_tag)], [(3, shell_tag)])
                gmsh.model.occ.synchronize()

                # out_map[0] 是原始parent_tag被切碎后的结果
                # 一般来说，如果完全包含，结果只有一个，就是它自己
                inner_soil_tag = out_map[0][0][1]
                
                # out_map[1] 是原始shell_tag被切碎后的结果
                # 它会被切成两部分：与内部体相减的部分（壳），和内部体本身
                # 我们需要找到那个 "壳"
                all_shell_fragments = [tag for dim, tag in out_map[1]]
                infinite_domain_tag = next(tag for tag in all_shell_fragments if tag != inner_soil_tag)
                
                # 为新的区域创建物理组
                gmsh.model.addPhysicalGroup(3, [inner_soil_tag], name="SOIL_CORE")
                gmsh.model.addPhysicalGroup(3, [infinite_domain_tag], name="INFINITE_DOMAIN")
                logger.info(
                    f"Fragment 操作成功. 核心土体: {inner_soil_tag}, "
                    f"无限元域: {infinite_domain_tag}"
                )

                # 更新父级特征的几何ID，以便后续操作能找到正确的几何体
                feature_to_gmsh_tags[parent_id] = inner_soil_tag

            elif feature.type == 'AssignGroup':
                # **这是最体现Fusion思想的地方**
                # 我们需要找到这个组所要附加到的几何实体
                # 在一个更复杂的场景中,我们需要一个复杂的映射逻辑
                # 但在这里我们简化: 假设物理组是直接附加在某个几何特征上
                # 并且前端已经通过某种方式(如拾取)获取了表面的tag
                p = feature.parameters
                if p.entity_type == 'face':
                    # 前端直接提供了面的tags, 我们直接用
                    pg_tag = gmsh.model.addPhysicalGroup(2, p.entity_tags, name=p.group_name)
                    logger.info(f"特征 '{feature.name}' 已指派物理组, Gmsh Physical Tag: {pg_tag}")
                # TODO: 添加对volume的处理
        
        # 3. 生成网格
        logger.info("开始网格划分...")
        gmsh.model.mesh.setSize(gmsh.model.getEntities(0), 10.0) # 暂时使用较粗的网格
        gmsh.model.mesh.generate(3)
        logger.info("网格划分完成。")

        # 4. 导出为 Kratos 所需的 MDPA 格式
        unique_id = uuid.uuid4()
        msh_filename = os.path.join(tempfile.gettempdir(), f"{unique_id}.msh")
        mdpa_filename = os.path.join(tempfile.gettempdir(), f"{unique_id}.mdpa")

        gmsh.write(msh_filename)
        mesh_data = meshio.read(msh_filename)
        meshio.write(mdpa_filename, mesh_data, file_format="mdpa")
        
        os.remove(msh_filename)
        logger.info(f"网格已成功转换为MDPA格式: {mdpa_filename}")
        
        return mesh_data, mdpa_filename

    finally:
        gmsh.finalize()


# ############################################################################
# ### API Endpoints
# ############################################################################

@router.post("/analyze", response_model=AnalysisResult, tags=["Parametric Analysis"])
async def run_parametric_analysis(scene: ParametricScene):
    """
    接收前端参数化场景, 进行特征重放、建模、网格划分、Kratos计算, 并返回结果。
    """
    logger.info("接收到V2.0参数化场景数据，开始完整分析流程...")
    
    try:
        mesh_data, mdpa_filename = replay_features_and_mesh(scene)
        result_vtk_filename = run_kratos_analysis(mdpa_filename)
        
        stats = {
            "num_points": len(mesh_data.points),
            "num_cells": sum(len(cell.data) for cell in mesh_data.cells),
            "cell_types": [cell.type for cell in mesh_data.cells],
        }

        final_result_filename = os.path.basename(result_vtk_filename)
        return {
            "status": "success",
            "message": "参数化场景分析成功。",
            "mesh_statistics": stats,
            "mesh_filename": final_result_filename
        }

    except Exception as e:
        logger.error(f"参数化分析流程中发生错误: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")


@router.get("/results/{filename_with_ext}", tags=["Parametric Analysis"])
async def get_analysis_result_file(filename_with_ext: str):
    """ 提供结果文件的下载 """
    if ".." in filename_with_ext or filename_with_ext.startswith(("/", "\\")):
        raise HTTPException(status_code=400, detail="无效的文件名。")
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, filename_with_ext)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="文件未找到。")
    return FileResponse(path=file_path, filename=os.path.basename(file_path))


# ############################################################################
# ### 深基坑工程统一分析API
# ############################################################################

@router.post("/deep-excavation/analyze", tags=["Deep Excavation Analysis"])
async def analyze_deep_excavation(model: DeepExcavationModel):
    """
    执行深基坑工程统一分析，可包含多种分析类型
    """
    logger.info(f"收到深基坑工程分析请求: {model.project_name}")
    
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

@router.get("/deep-excavation/results/{project_id}", tags=["Deep Excavation Analysis"])
async def get_deep_excavation_results(project_id: str):
    """
    获取深基坑工程分析结果
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

@router.get("/deep-excavation/result-file/{project_id}/{analysis_type}", tags=["Deep Excavation Analysis"])
async def get_deep_excavation_result_file(project_id: str, analysis_type: str):
    """
    获取深基坑工程分析结果文件
    """
    logger.info(f"获取深基坑工程分析结果文件: {project_id}, 分析类型: {analysis_type}")
    
    # 这里应该从文件系统中获取结果文件
    # 简化处理，返回错误
    raise HTTPException(
        status_code=404,
        detail=f"未找到项目 {project_id} 的 {analysis_type} 分析结果文件"
    ) 