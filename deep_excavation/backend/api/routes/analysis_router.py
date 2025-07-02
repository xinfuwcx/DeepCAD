from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Union, Literal, Annotated, Any, Dict, Optional
import logging
import tempfile
import os
from starlette.responses import FileResponse

# --- 真实计算库 ---
from netgen.occ import WorkPlane, OCCGeometry
import netgen.meshing as meshing
import meshio

# --- 自定义模块 ---
from ..core.dxf_processor import extract_polyline_from_dxf
from ..core.kratos_solver import run_kratos_analysis

# --- 日志配置 ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


router = APIRouter()


# --- Pydantic 模型定义 ---
class Point3D(BaseModel):
    x: float
    y: float
    z: float


class SoilParameters(BaseModel):
    surfacePoints: List[Point3D]
    thickness: float
    infiniteElement: bool


class ExcavationParameters(BaseModel):
    dxf: Any  # 前端现在直接发送文件内容字符串
    depth: float


class SoilObject(BaseModel):
    id: str
    name: str
    type: Literal['soil']
    parameters: SoilParameters


class ExcavationObject(BaseModel):
    id: str
    name: str
    type: Literal['excavation']
    parameters: ExcavationParameters


SceneObject = Union[SoilObject, ExcavationObject]


class SceneDescription(BaseModel):
    version: str
    objects: List[Annotated[SceneObject, Field(discriminator="type")]]


class AnalysisResult(BaseModel):
    status: str
    message: str
    mesh_statistics: Dict[str, Any]
    mesh_filename: Optional[str] = None


# --- 核心几何与网格生成逻辑 ---
def create_geometry_and_mesh(
    scene_data: SceneDescription,
) -> tuple[meshio.Mesh, str]:
    """
    真正的几何建模和网格生成函数
    1. 从SceneDescription中提取几何定义
    2. 使用Netgen/OCC进行实体建模和布尔运算
    3. 生成网格
    4. 返回meshio.Mesh对象和文件名
    """
    logger.info("开始真实的几何建模与网格生成...")

    soil_obj = next(
        (o for o in scene_data.objects if isinstance(o, SoilObject)), None
    )
    excavation_obj = next(
        (o for o in scene_data.objects if isinstance(o, ExcavationObject)),
        None,
    )

    if not soil_obj:
        raise ValueError("几何错误: 场景中必须包含一个土体对象。")

    # 1. 创建土体几何
    wp = WorkPlane()
    points = soil_obj.parameters.surfacePoints
    wp.MoveTo(points[0].x, points[0].z)
    for p in points[1:]:
        wp.LineTo(p.x, p.z)
    wp.LineTo(points[0].x, points[0].z)
    face = wp.Face()
    
    ground_level = points[0].y
    soil_solid = face.Extrude(
        -soil_obj.parameters.thickness, bot=ground_level
    )
    
    final_geo = soil_solid

    # 2. 如果有基坑，进行布尔减法
    if excavation_obj:
        logger.info("发现基坑对象，开始创建冲头并进行布尔减法...")
        dxf_content = excavation_obj.parameters.dxf
        
        vertices = extract_polyline_from_dxf(dxf_content)

        exc_wp = WorkPlane()
        exc_wp.MoveTo(vertices[0][0], vertices[0][1])
        for v in vertices[1:]:
            exc_wp.LineTo(v[0], v[1])
        exc_wp.LineTo(vertices[0][0], vertices[0][1])
        exc_face = exc_wp.Face()

        punch_height = excavation_obj.parameters.depth + 10
        exc_punch = exc_face.Extrude(
            punch_height,
            bot=(ground_level - excavation_obj.parameters.depth),
        )

        final_geo = final_geo - exc_punch
        logger.info("布尔减法完成。")

    # 3. 生成网格
    logger.info("开始网格划分...")
    occ_geo = OCCGeometry(final_geo)
    mesh_gen = meshing.Mesh()
    mesh_gen.Generate(occ_geo, maxh=5.0)
    logger.info("网格划分完成。")

    # 4. 导出为 Kratos 所需的 MDPA 格式
    with tempfile.NamedTemporaryFile(suffix=".mdpa", delete=False, mode="w") as tmp:
        filename = tmp.name
    
    # mesh_gen.Save(filename) # Netgen的Save可能不支持mdpa, 我们用meshio来转换
    
    # 先导出为VTK，再用meshio读取并写入MDPA
    with tempfile.NamedTemporaryFile(suffix=".vtk", delete=False) as vtk_tmp:
        vtk_filename = vtk_tmp.name
    mesh_gen.Save(vtk_filename)
    
    mesh_data = meshio.read(vtk_filename)

    # 在MDPA中，不同的物理组/边界需要命名
    # 这里我们做一个简化：假设所有外表面都是边界
    # 在真实应用中，这些需要在OCC建模时精确定义
    # TODO: 精确定义边界
    # For now, we will create dummy boundaries for Kratos to work.
    # This part is complex and needs careful geometric selection.
    
    meshio.write(filename, mesh_data, file_format="mdpa")

    # 清理临时的VTK文件
    os.remove(vtk_filename)
    
    logger.info(
        "网格已成功转换为MDPA格式并保存到: %s", filename
    )

    return mesh_data, filename


@router.get("/results/{filename_with_ext}", tags=["BIM Analysis"])
async def get_analysis_result_file(filename_with_ext: str):
    """
    从临时目录中提供结果文件（例如VTK网格）的下载。

    注意: 这是为开发设计的简化方法。在生产环境中，
    需要更健obt文件存储和访问控制机制。
    """
    # 基础的安全检查，防止目录遍历
    if ".." in filename_with_ext or filename_with_ext.startswith(("/", "\\")):
        raise HTTPException(status_code=400, detail="无效的文件名。")

    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, filename_with_ext)

    logger.info(f"尝试从以下路径提供文件: {file_path}")

    if not os.path.isfile(file_path):
        logger.error(f"文件未找到: {file_path}")
        raise HTTPException(status_code=404, detail="文件未找到。")

    return FileResponse(
        path=file_path,
        media_type='application/octet-stream',
        filename=os.path.basename(file_path)
    )


@router.post("/analyze", response_model=AnalysisResult, tags=["BIM Analysis"])
async def run_true_meshing_analysis(scene_data: SceneDescription):
    """
    接收前端BIM场景，进行建模、网格划分、Kratos计算，并返回结果。
    """
    logger.info("成功接收到BIM场景数据，开始完整分析流程...")
    
    try:
        # 1. 生成用于计算的MDPA网格文件
        mesh_data, mdpa_filename = create_geometry_and_mesh(scene_data)
        
        # 2. 调用Kratos求解器进行计算
        # 这个函数会返回带有结果的VTK文件的路径
        result_vtk_filename = run_kratos_analysis(mdpa_filename)
        
        # 3. 准备返回给前端的信息
        stats = {
            "num_points": len(mesh_data.points),
            "num_cells": sum(
                len(cell_block.data) for cell_block in mesh_data.cells
            ),
            "cell_types": [cell_block.type for cell_block in mesh_data.cells],
        }

        logger.info(f"完整分析流程成功: {stats}")
        
        # 从完整路径中提取文件名
        final_result_filename = os.path.basename(result_vtk_filename)

        return {
            "status": "success",
            "message": "建模、网格划分和Kratos计算全部成功。",
            "mesh_statistics": stats,
            "mesh_filename": final_result_filename
        }

    except Exception as e:
        logger.error(f"完整分析流程中发生错误: {e}", exc_info=True)
        return {
            "status": "error",
            "message": f"分析失败: {str(e)}",
            "mesh_statistics": {},
            "mesh_filename": None,
        } 