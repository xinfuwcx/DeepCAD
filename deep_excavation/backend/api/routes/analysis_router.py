from fastapi import APIRouter, Depends, HTTPException
from typing import List, Union, Literal
from pydantic import BaseModel, Field
import logging

# 配置日志
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

class DxfData(BaseModel):
    # 暂时只定义我们关心的部分
    entities: List[dict] 

class ExcavationParameters(BaseModel):
    dxf: DxfData
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

# 使用Union来代表任何一种场景对象
SceneObject = Union[SoilObject, ExcavationObject]

class SceneDescription(BaseModel):
    version: str
    objects: List[SceneObject] = Field(..., discriminator='type')

# --- API 路由 ---

@router.post("/analyze", tags=["Analysis"])
async def run_analysis(scene_data: SceneDescription):
    """
    接收前端发送的BIM场景描述，并触发后端分析流程。
    """
    logger.info("成功接收到来自前端的BIM场景数据")
    logger.info(f"场景版本: {scene_data.version}")
    
    soil_objects = [obj for obj in scene_data.objects if isinstance(obj, SoilObject)]
    excavation_objects = [obj for obj in scene_data.objects if isinstance(obj, ExcavationObject)]

    logger.info(f"接收到 {len(soil_objects)} 个土体对象和 {len(excavation_objects)} 个基坑对象。")

    # TODO: 在这里调用核心的几何重建和Kratos分析服务
    # 1. 使用 soil_objects 和 excavation_objects 重建最终的几何模型
    # 2. 将模型传递给Kratos进行网格划分和计算
    # 3. 返回分析结果

    return {
        "status": "success",
        "message": "BIM data received and understood. Analysis process (mock) started.",
        "received_objects": len(scene_data.objects)
    } 