"""
计算模块 - 边界条件设置路由
处理流体边界条件、热边界条件等多物理场边界条件的配置和管理
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

router = APIRouter(prefix="/computation/boundary-conditions", tags=["Computation - Boundary Conditions"])

# 边界条件类型枚举
class BoundaryConditionType(str, Enum):
    FLUID_PRESSURE = "fluid_pressure"              # 流体压力边界
    FLUID_FLOW = "fluid_flow"                      # 流体流量边界
    SEEPAGE_HEAD = "seepage_head"                  # 渗流水头边界
    SEEPAGE_FLOW = "seepage_flow"                  # 渗流流量边界  
    THERMAL_TEMPERATURE = "thermal_temperature"     # 温度边界
    THERMAL_FLUX = "thermal_flux"                  # 热流密度边界
    CONVECTION = "convection"                      # 对流边界
    RADIATION = "radiation"                        # 辐射边界
    MASS_TRANSFER = "mass_transfer"                # 质量传递边界
    CHEMICAL_CONCENTRATION = "chemical_concentration"  # 化学浓度边界

class BoundaryApplication(str, Enum):
    SURFACE = "surface"      # 面边界
    EDGE = "edge"           # 边边界  
    NODE = "node"           # 点边界
    REGION = "region"       # 区域边界
    VOLUME = "volume"       # 体边界

class FlowDirection(str, Enum):
    INFLOW = "inflow"       # 流入
    OUTFLOW = "outflow"     # 流出
    NORMAL = "normal"       # 法向
    TANGENTIAL = "tangential"  # 切向

# 边界条件数据模型
class BoundaryGeometry(BaseModel):
    """边界几何定义"""
    application_type: BoundaryApplication = Field(..., description="边界施加类型")
    target_entities: List[int] = Field(..., description="目标实体ID列表")
    coordinates: Optional[List[List[float]]] = Field(None, description="坐标点")
    normal_vector: Optional[List[float]] = Field(None, description="法向量")
    area: Optional[float] = Field(None, description="边界面积")

class BoundaryValue(BaseModel):
    """边界条件值定义"""
    magnitude: float = Field(..., description="数值大小")
    unit: str = Field(..., description="单位")
    direction: Optional[FlowDirection] = Field(None, description="方向")
    distribution_pattern: str = Field("uniform", description="分布模式: uniform, linear, parabolic")
    time_variation: Optional[str] = Field(None, description="时间变化模式")
    
    # 特殊参数
    temperature: Optional[float] = Field(None, description="温度值（热边界）")
    pressure: Optional[float] = Field(None, description="压力值（流体边界）")
    flow_rate: Optional[float] = Field(None, description="流量值")
    heat_flux: Optional[float] = Field(None, description="热流密度")
    convection_coefficient: Optional[float] = Field(None, description="对流传热系数")
    concentration: Optional[float] = Field(None, description="浓度值")

class BoundaryTiming(BaseModel):
    """边界条件时间特性"""
    boundary_case: str = Field(..., description="边界工况名称")
    start_time: float = Field(0.0, description="开始时间")
    end_time: Optional[float] = Field(None, description="结束时间")
    time_function: str = Field("constant", description="时间函数: constant, linear, sinusoidal, step")
    cycle_period: Optional[float] = Field(None, description="循环周期")

class BoundaryConditionDefinition(BaseModel):
    """完整边界条件定义"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="边界条件ID")
    name: str = Field(..., description="边界条件名称")
    description: Optional[str] = Field(None, description="边界条件描述")
    bc_type: BoundaryConditionType = Field(..., description="边界条件类型")
    geometry: BoundaryGeometry = Field(..., description="边界几何")
    boundary_value: BoundaryValue = Field(..., description="边界条件值")
    timing: BoundaryTiming = Field(..., description="边界条件时间特性")
    is_active: bool = Field(True, description="是否激活")
    color: Optional[str] = Field("#2196F3", description="可视化颜色")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BoundaryCase(BaseModel):
    """边界条件工况"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="工况ID")
    name: str = Field(..., description="工况名称")
    description: Optional[str] = Field(None, description="工况描述")
    boundary_conditions: List[str] = Field(default_factory=list, description="包含的边界条件ID列表")
    combination_factors: Dict[str, float] = Field(default_factory=dict, description="边界条件组合系数")
    analysis_type: str = Field("seepage", description="分析类型: seepage, thermal, fluid, coupled")
    is_default: bool = Field(False, description="是否为默认工况")
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 请求和响应模型
class CreateBoundaryConditionRequest(BaseModel):
    project_id: str = Field(..., description="项目ID")
    boundary_condition: BoundaryConditionDefinition = Field(..., description="边界条件定义")

class UpdateBoundaryConditionRequest(BaseModel):
    boundary_condition: BoundaryConditionDefinition = Field(..., description="更新的边界条件定义")

class CreateBoundaryCaseRequest(BaseModel):
    project_id: str = Field(..., description="项目ID")
    boundary_case: BoundaryCase = Field(..., description="边界条件工况")

class BoundaryConditionResponse(BaseModel):
    success: bool = Field(..., description="操作是否成功")
    message: str = Field(..., description="响应消息")
    bc_id: Optional[str] = Field(None, description="边界条件ID")
    data: Optional[Dict[str, Any]] = Field(None, description="附加数据")

class BoundaryConditionListResponse(BaseModel):
    boundary_conditions: List[BoundaryConditionDefinition] = Field(..., description="边界条件列表")
    total_count: int = Field(..., description="总数量")
    active_count: int = Field(..., description="激活数量")
    boundary_cases: List[BoundaryCase] = Field(default_factory=list, description="边界条件工况")

# 内存存储（实际项目中应使用数据库）
boundary_conditions_storage: Dict[str, Dict[str, BoundaryConditionDefinition]] = {}  # {project_id: {bc_id: BoundaryConditionDefinition}}
boundary_cases_storage: Dict[str, Dict[str, BoundaryCase]] = {}   # {project_id: {case_id: BoundaryCase}}

@router.post("/create", response_model=BoundaryConditionResponse)
async def create_boundary_condition(request: CreateBoundaryConditionRequest):
    """创建新边界条件"""
    try:
        project_id = request.project_id
        bc_def = request.boundary_condition
        
        # 初始化项目存储
        if project_id not in boundary_conditions_storage:
            boundary_conditions_storage[project_id] = {}
        
        # 验证边界条件定义
        if not bc_def.geometry.target_entities:
            raise HTTPException(status_code=400, detail="目标实体不能为空")
        
        if bc_def.boundary_value.magnitude is None:
            raise HTTPException(status_code=400, detail="边界条件数值不能为空")
        
        # 保存边界条件
        boundary_conditions_storage[project_id][bc_def.id] = bc_def
        
        return BoundaryConditionResponse(
            success=True,
            message=f"边界条件 '{bc_def.name}' 创建成功",
            bc_id=bc_def.id,
            data={
                "bc_type": bc_def.bc_type,
                "magnitude": bc_def.boundary_value.magnitude,
                "entities_count": len(bc_def.geometry.target_entities)
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建边界条件失败: {str(e)}")

@router.get("/list/{project_id}", response_model=BoundaryConditionListResponse)
async def get_boundary_conditions(project_id: str):
    """获取项目的所有边界条件"""
    try:
        project_bcs = boundary_conditions_storage.get(project_id, {})
        project_cases = boundary_cases_storage.get(project_id, {})
        
        bcs_list = list(project_bcs.values())
        cases_list = list(project_cases.values())
        
        active_count = sum(1 for bc in bcs_list if bc.is_active)
        
        return BoundaryConditionListResponse(
            boundary_conditions=bcs_list,
            total_count=len(bcs_list),
            active_count=active_count,
            boundary_cases=cases_list
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取边界条件列表失败: {str(e)}")

@router.put("/update/{bc_id}", response_model=BoundaryConditionResponse)
async def update_boundary_condition(bc_id: str, request: UpdateBoundaryConditionRequest):
    """更新边界条件"""
    try:
        # 查找边界条件
        found_project = None
        for project_id, bcs in boundary_conditions_storage.items():
            if bc_id in bcs:
                found_project = project_id
                break
        
        if not found_project:
            raise HTTPException(status_code=404, detail="边界条件不存在")
        
        # 更新边界条件
        boundary_conditions_storage[found_project][bc_id] = request.boundary_condition
        
        return BoundaryConditionResponse(
            success=True,
            message=f"边界条件 '{request.boundary_condition.name}' 更新成功",
            bc_id=bc_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新边界条件失败: {str(e)}")

@router.delete("/delete/{bc_id}", response_model=BoundaryConditionResponse)
async def delete_boundary_condition(bc_id: str):
    """删除边界条件"""
    try:
        # 查找并删除边界条件
        found_project = None
        for project_id, bcs in boundary_conditions_storage.items():
            if bc_id in bcs:
                del bcs[bc_id]
                found_project = project_id
                break
        
        if not found_project:
            raise HTTPException(status_code=404, detail="边界条件不存在")
        
        return BoundaryConditionResponse(
            success=True,
            message="边界条件删除成功",
            bc_id=bc_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除边界条件失败: {str(e)}")

@router.post("/boundary-cases/create", response_model=BoundaryConditionResponse)
async def create_boundary_case(request: CreateBoundaryCaseRequest):
    """创建边界条件工况"""
    try:
        project_id = request.project_id
        boundary_case = request.boundary_case
        
        # 初始化项目存储
        if project_id not in boundary_cases_storage:
            boundary_cases_storage[project_id] = {}
        
        # 保存边界条件工况
        boundary_cases_storage[project_id][boundary_case.id] = boundary_case
        
        return BoundaryConditionResponse(
            success=True,
            message=f"边界条件工况 '{boundary_case.name}' 创建成功",
            bc_id=boundary_case.id,
            data={
                "boundary_conditions_count": len(boundary_case.boundary_conditions),
                "analysis_type": boundary_case.analysis_type,
                "is_default": boundary_case.is_default
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建边界条件工况失败: {str(e)}")

@router.get("/templates")
async def get_boundary_condition_templates():
    """获取边界条件模板"""
    templates = {
        "渗流分析": {
            "description": "地下水渗流分析边界条件模板",
            "boundary_conditions": [
                {
                    "name": "定水头边界",
                    "type": "seepage_head",
                    "description": "固定水头边界条件",
                    "typical_value": 10.0,
                    "unit": "m",
                    "application": "surface"
                },
                {
                    "name": "渗流流量边界",
                    "type": "seepage_flow",
                    "description": "指定渗流流量边界",
                    "typical_value": 0.001,
                    "unit": "m³/s/m²",
                    "application": "surface"
                },
                {
                    "name": "不透水边界",
                    "type": "seepage_flow",
                    "description": "零渗流边界条件",
                    "typical_value": 0.0,
                    "unit": "m³/s/m²",
                    "application": "surface"
                },
                {
                    "name": "自由水面",
                    "type": "seepage_head",
                    "description": "自由水面边界条件",
                    "typical_value": "variable",
                    "unit": "m",
                    "application": "surface"
                }
            ]
        },
        "热传导分析": {
            "description": "热传导分析边界条件模板",
            "boundary_conditions": [
                {
                    "name": "定温边界",
                    "type": "thermal_temperature",
                    "description": "固定温度边界条件",
                    "typical_value": 20.0,
                    "unit": "°C",
                    "application": "surface"
                },
                {
                    "name": "定热流边界",
                    "type": "thermal_flux",
                    "description": "指定热流密度边界",
                    "typical_value": 100.0,
                    "unit": "W/m²",
                    "application": "surface"
                },
                {
                    "name": "对流边界",
                    "type": "convection",
                    "description": "对流换热边界条件",
                    "typical_value": 25.0,
                    "unit": "W/m²·K",
                    "application": "surface"
                },
                {
                    "name": "绝热边界",
                    "type": "thermal_flux",
                    "description": "零热流边界条件",
                    "typical_value": 0.0,
                    "unit": "W/m²",
                    "application": "surface"
                }
            ]
        },
        "流体分析": {
            "description": "流体力学分析边界条件模板",
            "boundary_conditions": [
                {
                    "name": "压力入口",
                    "type": "fluid_pressure",
                    "description": "压力入口边界条件",
                    "typical_value": 101325.0,
                    "unit": "Pa",
                    "application": "surface"
                },
                {
                    "name": "流量入口",
                    "type": "fluid_flow",
                    "description": "流量入口边界条件",
                    "typical_value": 0.1,
                    "unit": "m³/s",
                    "application": "surface"
                },
                {
                    "name": "压力出口",
                    "type": "fluid_pressure",
                    "description": "压力出口边界条件",
                    "typical_value": 0.0,
                    "unit": "Pa",
                    "application": "surface"
                },
                {
                    "name": "壁面",
                    "type": "fluid_flow",
                    "description": "无滑移壁面边界",
                    "typical_value": 0.0,
                    "unit": "m/s",
                    "application": "surface"
                }
            ]
        },
        "多物理场耦合": {
            "description": "多物理场耦合分析边界条件模板",
            "boundary_conditions": [
                {
                    "name": "流固耦合界面",
                    "type": "fluid_pressure",
                    "description": "流固耦合交界面",
                    "typical_value": "coupled",
                    "unit": "Pa",
                    "application": "surface"
                },
                {
                    "name": "热流耦合边界",
                    "type": "thermal_temperature",
                    "description": "热流耦合边界条件",
                    "typical_value": "coupled",
                    "unit": "°C",
                    "application": "surface"
                },
                {
                    "name": "渗流-应力耦合",
                    "type": "seepage_head",
                    "description": "渗流应力耦合边界",
                    "typical_value": "coupled",
                    "unit": "m",
                    "application": "surface"
                }
            ]
        }
    }
    
    return {"templates": templates}

@router.post("/validate")
async def validate_boundary_conditions(project_id: str):
    """验证边界条件配置"""
    try:
        project_bcs = boundary_conditions_storage.get(project_id, {})
        
        validation_results = {
            "is_valid": True,
            "warnings": [],
            "errors": [],
            "statistics": {
                "total_boundary_conditions": len(project_bcs),
                "active_boundary_conditions": sum(1 for bc in project_bcs.values() if bc.is_active),
                "bc_types": {}
            }
        }
        
        # 统计边界条件类型
        for bc in project_bcs.values():
            bc_type = bc.bc_type
            validation_results["statistics"]["bc_types"][bc_type] = \
                validation_results["statistics"]["bc_types"].get(bc_type, 0) + 1
        
        # 基本验证
        if not project_bcs:
            validation_results["warnings"].append("项目中没有定义任何边界条件")
        
        # 检查每个边界条件
        for bc in project_bcs.values():
            if bc.boundary_value.magnitude is None:
                validation_results["errors"].append(f"边界条件 '{bc.name}' 没有指定数值")
                validation_results["is_valid"] = False
            
            if not bc.geometry.target_entities:
                validation_results["errors"].append(f"边界条件 '{bc.name}' 没有指定目标实体")
                validation_results["is_valid"] = False
                
            # 检查单位一致性
            if bc.bc_type in ["thermal_temperature", "thermal_flux"] and bc.boundary_value.unit not in ["°C", "K", "W/m²"]:
                validation_results["warnings"].append(f"边界条件 '{bc.name}' 的单位可能不正确")
        
        return validation_results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"验证边界条件失败: {str(e)}")

@router.post("/export/{project_id}")
async def export_boundary_conditions(project_id: str, format: str = "json"):
    """导出边界条件配置"""
    try:
        project_bcs = boundary_conditions_storage.get(project_id, {})
        project_cases = boundary_cases_storage.get(project_id, {})
        
        export_data = {
            "project_id": project_id,
            "export_time": datetime.utcnow().isoformat(),
            "boundary_conditions": [bc.dict() for bc in project_bcs.values()],
            "boundary_cases": [case.dict() for case in project_cases.values()],
            "summary": {
                "total_boundary_conditions": len(project_bcs),
                "total_cases": len(project_cases)
            }
        }
        
        return {
            "success": True,
            "data": export_data,
            "format": format
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出边界条件失败: {str(e)}")