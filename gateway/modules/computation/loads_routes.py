"""
计算模块 - 荷载设置路由
处理各种荷载类型的配置和管理
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from sqlalchemy.orm import Session
from datetime import datetime
from enum import Enum
import uuid

from gateway.database import get_db
from ..websockets.connection_manager import manager

router = APIRouter(prefix="/computation/loads", tags=["Computation - Loads"])

# 荷载类型枚举
class LoadType(str, Enum):
    FORCE = "force"                    # 集中力
    DISTRIBUTED = "distributed"       # 分布荷载
    PRESSURE = "pressure"              # 压力荷载
    SELF_WEIGHT = "self_weight"        # 自重
    EARTH_PRESSURE = "earth_pressure"  # 土压力
    WATER_PRESSURE = "water_pressure"  # 水压力
    THERMAL = "thermal"                # 温度荷载
    SEISMIC = "seismic"               # 地震荷载
    TRAFFIC = "traffic"               # 交通荷载
    CONSTRUCTION = "construction"      # 施工荷载

class LoadDirection(str, Enum):
    X = "x"
    Y = "y"  
    Z = "z"
    NORMAL = "normal"      # 法向
    TANGENTIAL = "tangential"  # 切向

class LoadApplication(str, Enum):
    NODE = "node"          # 节点荷载
    ELEMENT = "element"    # 单元荷载
    SURFACE = "surface"    # 面荷载
    VOLUME = "volume"      # 体荷载
    EDGE = "edge"          # 边荷载

# 荷载数据模型
class LoadGeometry(BaseModel):
    """荷载几何定义"""
    application_type: LoadApplication = Field(..., description="荷载施加类型")
    target_entities: List[int] = Field(..., description="目标实体ID列表")
    coordinates: Optional[List[List[float]]] = Field(None, description="坐标点（用于精确定义）")

class LoadMagnitude(BaseModel):
    """荷载量值定义"""
    value: float = Field(..., description="荷载值")
    unit: str = Field(..., description="荷载单位")
    direction: LoadDirection = Field(..., description="荷载方向")
    distribution_pattern: Optional[str] = Field("uniform", description="分布模式: uniform, linear, parabolic")
    
class LoadTiming(BaseModel):
    """荷载时间特性"""
    load_case: str = Field(..., description="荷载工况名称")
    start_time: float = Field(0.0, description="开始时间")
    end_time: Optional[float] = Field(None, description="结束时间")
    time_function: Optional[str] = Field("constant", description="时间函数: constant, linear, sine, ramp")
    amplification_factor: float = Field(1.0, description="放大系数")

class LoadDefinition(BaseModel):
    """完整荷载定义"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="荷载ID")
    name: str = Field(..., description="荷载名称")
    description: Optional[str] = Field(None, description="荷载描述")
    load_type: LoadType = Field(..., description="荷载类型")
    geometry: LoadGeometry = Field(..., description="荷载几何")
    magnitude: LoadMagnitude = Field(..., description="荷载量值")
    timing: LoadTiming = Field(..., description="荷载时间特性")
    is_active: bool = Field(True, description="是否激活")
    color: Optional[str] = Field("#FF6B6B", description="可视化颜色")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LoadCase(BaseModel):
    """荷载工况"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="工况ID")
    name: str = Field(..., description="工况名称")
    description: Optional[str] = Field(None, description="工况描述")
    loads: List[str] = Field(default_factory=list, description="包含的荷载ID列表")
    combination_factors: Dict[str, float] = Field(default_factory=dict, description="荷载组合系数")
    is_default: bool = Field(False, description="是否为默认工况")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LoadCombination(BaseModel):
    """荷载组合"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="组合ID")
    name: str = Field(..., description="组合名称")
    description: Optional[str] = Field(None, description="组合描述")
    load_cases: Dict[str, float] = Field(..., description="工况及其组合系数")
    combination_type: str = Field("linear", description="组合类型: linear, envelope, modal")
    design_code: Optional[str] = Field(None, description="设计规范")

# 请求和响应模型
class CreateLoadRequest(BaseModel):
    project_id: str = Field(..., description="项目ID")
    load_definition: LoadDefinition = Field(..., description="荷载定义")

class UpdateLoadRequest(BaseModel):
    load_definition: LoadDefinition = Field(..., description="更新的荷载定义")

class CreateLoadCaseRequest(BaseModel):
    project_id: str = Field(..., description="项目ID")
    load_case: LoadCase = Field(..., description="荷载工况")

class LoadResponse(BaseModel):
    success: bool = Field(..., description="操作是否成功")
    message: str = Field(..., description="响应消息")
    load_id: Optional[str] = Field(None, description="荷载ID")
    data: Optional[Dict[str, Any]] = Field(None, description="附加数据")

class LoadListResponse(BaseModel):
    loads: List[LoadDefinition] = Field(..., description="荷载列表")
    total_count: int = Field(..., description="总数量")
    active_count: int = Field(..., description="激活数量")
    load_cases: List[LoadCase] = Field(default_factory=list, description="荷载工况")

# 内存存储（实际项目中应使用数据库）
loads_storage: Dict[str, Dict[str, LoadDefinition]] = {}  # {project_id: {load_id: LoadDefinition}}
load_cases_storage: Dict[str, Dict[str, LoadCase]] = {}   # {project_id: {case_id: LoadCase}}
combinations_storage: Dict[str, Dict[str, LoadCombination]] = {}  # {project_id: {combo_id: LoadCombination}}

@router.post("/create", response_model=LoadResponse)
async def create_load(request: CreateLoadRequest):
    """创建新荷载"""
    try:
        project_id = request.project_id
        load_def = request.load_definition
        
        # 初始化项目存储
        if project_id not in loads_storage:
            loads_storage[project_id] = {}
        
        # 验证荷载定义
        if not load_def.geometry.target_entities:
            raise HTTPException(status_code=400, detail="目标实体不能为空")
        
        if load_def.magnitude.value == 0:
            raise HTTPException(status_code=400, detail="荷载值不能为零")
        
        # 保存荷载
        loads_storage[project_id][load_def.id] = load_def
        
        return LoadResponse(
            success=True,
            message=f"荷载 '{load_def.name}' 创建成功",
            load_id=load_def.id,
            data={
                "load_type": load_def.load_type,
                "magnitude": load_def.magnitude.value,
                "unit": load_def.magnitude.unit,
                "entities_count": len(load_def.geometry.target_entities)
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建荷载失败: {str(e)}")

@router.get("/list/{project_id}", response_model=LoadListResponse)
async def get_loads(project_id: str):
    """获取项目的所有荷载"""
    try:
        project_loads = loads_storage.get(project_id, {})
        project_cases = load_cases_storage.get(project_id, {})
        
        loads_list = list(project_loads.values())
        cases_list = list(project_cases.values())
        
        active_count = sum(1 for load in loads_list if load.is_active)
        
        return LoadListResponse(
            loads=loads_list,
            total_count=len(loads_list),
            active_count=active_count,
            load_cases=cases_list
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取荷载列表失败: {str(e)}")

@router.put("/update/{load_id}", response_model=LoadResponse)
async def update_load(load_id: str, request: UpdateLoadRequest):
    """更新荷载"""
    try:
        # 查找荷载
        found_project = None
        for project_id, loads in loads_storage.items():
            if load_id in loads:
                found_project = project_id
                break
        
        if not found_project:
            raise HTTPException(status_code=404, detail="荷载不存在")
        
        # 更新荷载
        loads_storage[found_project][load_id] = request.load_definition
        
        return LoadResponse(
            success=True,
            message=f"荷载 '{request.load_definition.name}' 更新成功",
            load_id=load_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新荷载失败: {str(e)}")

@router.delete("/delete/{load_id}", response_model=LoadResponse)
async def delete_load(load_id: str):
    """删除荷载"""
    try:
        # 查找并删除荷载
        found_project = None
        for project_id, loads in loads_storage.items():
            if load_id in loads:
                del loads[load_id]
                found_project = project_id
                break
        
        if not found_project:
            raise HTTPException(status_code=404, detail="荷载不存在")
        
        return LoadResponse(
            success=True,
            message="荷载删除成功",
            load_id=load_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除荷载失败: {str(e)}")

@router.post("/load-cases/create", response_model=LoadResponse)
async def create_load_case(request: CreateLoadCaseRequest):
    """创建荷载工况"""
    try:
        project_id = request.project_id
        load_case = request.load_case
        
        # 初始化项目存储
        if project_id not in load_cases_storage:
            load_cases_storage[project_id] = {}
        
        # 保存荷载工况
        load_cases_storage[project_id][load_case.id] = load_case
        
        return LoadResponse(
            success=True,
            message=f"荷载工况 '{load_case.name}' 创建成功",
            load_id=load_case.id,
            data={
                "loads_count": len(load_case.loads),
                "is_default": load_case.is_default
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建荷载工况失败: {str(e)}")

@router.get("/templates")
async def get_load_templates():
    """获取荷载模板"""
    templates = {
        "深基坑工程": {
            "description": "深基坑工程常用荷载模板",
            "loads": [
                {
                    "name": "土压力",
                    "type": "earth_pressure",
                    "description": "支护结构承受的主动土压力",
                    "typical_values": "20-80 kN/m²",
                    "application": "surface"
                },
                {
                    "name": "水压力", 
                    "type": "water_pressure",
                    "description": "地下水产生的静水压力",
                    "typical_values": "10-50 kN/m²",
                    "application": "surface"
                },
                {
                    "name": "交通荷载",
                    "type": "traffic", 
                    "description": "地面交通产生的附加荷载",
                    "typical_values": "10-20 kN/m²",
                    "application": "surface"
                },
                {
                    "name": "施工荷载",
                    "type": "construction",
                    "description": "施工设备和材料荷载", 
                    "typical_values": "5-15 kN/m²",
                    "application": "surface"
                }
            ]
        },
        "桩基工程": {
            "description": "桩基工程常用荷载模板",
            "loads": [
                {
                    "name": "轴向压力",
                    "type": "force",
                    "description": "桩顶轴向压力荷载",
                    "typical_values": "1000-5000 kN",
                    "application": "node"
                },
                {
                    "name": "侧向力",
                    "type": "force", 
                    "description": "桩身侧向荷载",
                    "typical_values": "50-500 kN",
                    "application": "node"
                },
                {
                    "name": "负摩阻力",
                    "type": "distributed",
                    "description": "软土引起的负摩阻力",
                    "typical_values": "10-30 kN/m",
                    "application": "surface"
                }
            ]
        },
        "隧道工程": {
            "description": "隧道工程常用荷载模板", 
            "loads": [
                {
                    "name": "围岩压力",
                    "type": "pressure",
                    "description": "围岩对衬砌的压力",
                    "typical_values": "50-200 kN/m²",
                    "application": "surface"
                },
                {
                    "name": "地下水压",
                    "type": "water_pressure",
                    "description": "地下水对衬砌的压力",
                    "typical_values": "20-100 kN/m²", 
                    "application": "surface"
                }
            ]
        }
    }
    
    return {"templates": templates}

@router.post("/validate")
async def validate_loads(project_id: str):
    """验证荷载配置"""
    try:
        project_loads = loads_storage.get(project_id, {})
        
        validation_results = {
            "is_valid": True,
            "warnings": [],
            "errors": [],
            "statistics": {
                "total_loads": len(project_loads),
                "active_loads": sum(1 for load in project_loads.values() if load.is_active),
                "load_types": {}
            }
        }
        
        # 统计荷载类型
        for load in project_loads.values():
            load_type = load.load_type
            validation_results["statistics"]["load_types"][load_type] = \
                validation_results["statistics"]["load_types"].get(load_type, 0) + 1
        
        # 基本验证
        if not project_loads:
            validation_results["warnings"].append("项目中没有定义任何荷载")
        
        # 检查每个荷载
        for load in project_loads.values():
            if load.magnitude.value == 0:
                validation_results["warnings"].append(f"荷载 '{load.name}' 的值为零")
            
            if not load.geometry.target_entities:
                validation_results["errors"].append(f"荷载 '{load.name}' 没有指定目标实体")
                validation_results["is_valid"] = False
        
        return validation_results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"验证荷载失败: {str(e)}")

@router.post("/export/{project_id}")
async def export_loads(project_id: str, format: str = "json"):
    """导出荷载配置"""
    try:
        project_loads = loads_storage.get(project_id, {})
        project_cases = load_cases_storage.get(project_id, {})
        
        export_data = {
            "project_id": project_id,
            "export_time": datetime.utcnow().isoformat(),
            "loads": [load.dict() for load in project_loads.values()],
            "load_cases": [case.dict() for case in project_cases.values()],
            "summary": {
                "total_loads": len(project_loads),
                "total_cases": len(project_cases)
            }
        }
        
        return {
            "success": True,
            "data": export_data,
            "format": format
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出荷载失败: {str(e)}")