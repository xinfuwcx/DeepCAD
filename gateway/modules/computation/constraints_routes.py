"""
计算模块 - 约束设置路由
处理位移约束、边界条件等约束类型的配置和管理
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

router = APIRouter(prefix="/computation/constraints", tags=["Computation - Constraints"])

# 约束类型枚举
class ConstraintType(str, Enum):
    FIXED = "fixed"                    # 固定约束
    PINNED = "pinned"                  # 铰支约束
    ROLLER = "roller"                  # 滑动约束
    DISPLACEMENT = "displacement"       # 位移约束
    ROTATION = "rotation"              # 转角约束
    ELASTIC_SUPPORT = "elastic_support"  # 弹性支撑
    SYMMETRY = "symmetry"              # 对称约束
    CONTACT = "contact"                # 接触约束
    INTERFACE = "interface"            # 界面约束
    INFINITE_BOUNDARY = "infinite_boundary"  # 无限边界

class ConstraintDOF(str, Enum):
    UX = "ux"    # X方向位移
    UY = "uy"    # Y方向位移  
    UZ = "uz"    # Z方向位移
    RX = "rx"    # X轴转角
    RY = "ry"    # Y轴转角
    RZ = "rz"    # Z轴转角
    ALL = "all"  # 全约束

class ConstraintApplication(str, Enum):
    NODE = "node"        # 节点约束
    ELEMENT = "element"  # 单元约束
    SURFACE = "surface"  # 面约束
    EDGE = "edge"        # 边约束
    REGION = "region"    # 区域约束

# 约束数据模型
class ConstraintGeometry(BaseModel):
    """约束几何定义"""
    application_type: ConstraintApplication = Field(..., description="约束施加类型")
    target_entities: List[int] = Field(..., description="目标实体ID列表")
    coordinates: Optional[List[List[float]]] = Field(None, description="坐标点（用于精确定义）")
    normal_vector: Optional[List[float]] = Field(None, description="法向量（用于方向性约束）")

class ConstraintValue(BaseModel):
    """约束值定义"""
    constrained_dofs: List[ConstraintDOF] = Field(..., description="约束自由度")
    prescribed_values: Dict[str, float] = Field(default_factory=dict, description="预设值")
    stiffness_values: Optional[Dict[str, float]] = Field(None, description="刚度值（弹性支撑）")
    damping_values: Optional[Dict[str, float]] = Field(None, description="阻尼值")

class ConstraintTiming(BaseModel):
    """约束时间特性"""
    constraint_case: str = Field(..., description="约束工况名称")
    start_time: float = Field(0.0, description="开始时间")
    end_time: Optional[float] = Field(None, description="结束时间")
    time_function: Optional[str] = Field("constant", description="时间函数: constant, linear, step")

class ConstraintDefinition(BaseModel):
    """完整约束定义"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="约束ID")
    name: str = Field(..., description="约束名称")
    description: Optional[str] = Field(None, description="约束描述")
    constraint_type: ConstraintType = Field(..., description="约束类型")
    geometry: ConstraintGeometry = Field(..., description="约束几何")
    constraint_value: ConstraintValue = Field(..., description="约束值")
    timing: ConstraintTiming = Field(..., description="约束时间特性")
    is_active: bool = Field(True, description="是否激活")
    color: Optional[str] = Field("#4CAF50", description="可视化颜色")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ConstraintCase(BaseModel):
    """约束工况"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="工况ID")
    name: str = Field(..., description="工况名称")
    description: Optional[str] = Field(None, description="工况描述")
    constraints: List[str] = Field(default_factory=list, description="包含的约束ID列表")
    combination_factors: Dict[str, float] = Field(default_factory=dict, description="约束组合系数")
    is_default: bool = Field(False, description="是否为默认工况")
    created_at: datetime = Field(default_factory=datetime.utcnow)

# 请求和响应模型
class CreateConstraintRequest(BaseModel):
    project_id: str = Field(..., description="项目ID")
    constraint_definition: ConstraintDefinition = Field(..., description="约束定义")

class UpdateConstraintRequest(BaseModel):
    constraint_definition: ConstraintDefinition = Field(..., description="更新的约束定义")

class CreateConstraintCaseRequest(BaseModel):
    project_id: str = Field(..., description="项目ID")
    constraint_case: ConstraintCase = Field(..., description="约束工况")

class ConstraintResponse(BaseModel):
    success: bool = Field(..., description="操作是否成功")
    message: str = Field(..., description="响应消息")
    constraint_id: Optional[str] = Field(None, description="约束ID")
    data: Optional[Dict[str, Any]] = Field(None, description="附加数据")

class ConstraintListResponse(BaseModel):
    constraints: List[ConstraintDefinition] = Field(..., description="约束列表")
    total_count: int = Field(..., description="总数量")
    active_count: int = Field(..., description="激活数量")
    constraint_cases: List[ConstraintCase] = Field(default_factory=list, description="约束工况")

# 内存存储（实际项目中应使用数据库）
constraints_storage: Dict[str, Dict[str, ConstraintDefinition]] = {}  # {project_id: {constraint_id: ConstraintDefinition}}
constraint_cases_storage: Dict[str, Dict[str, ConstraintCase]] = {}   # {project_id: {case_id: ConstraintCase}}

@router.post("/create", response_model=ConstraintResponse)
async def create_constraint(request: CreateConstraintRequest):
    """创建新约束"""
    try:
        project_id = request.project_id
        constraint_def = request.constraint_definition
        
        # 初始化项目存储
        if project_id not in constraints_storage:
            constraints_storage[project_id] = {}
        
        # 验证约束定义
        if not constraint_def.geometry.target_entities:
            raise HTTPException(status_code=400, detail="目标实体不能为空")
        
        if not constraint_def.constraint_value.constrained_dofs:
            raise HTTPException(status_code=400, detail="约束自由度不能为空")
        
        # 保存约束
        constraints_storage[project_id][constraint_def.id] = constraint_def
        
        return ConstraintResponse(
            success=True,
            message=f"约束 '{constraint_def.name}' 创建成功",
            constraint_id=constraint_def.id,
            data={
                "constraint_type": constraint_def.constraint_type,
                "constrained_dofs": constraint_def.constraint_value.constrained_dofs,
                "entities_count": len(constraint_def.geometry.target_entities)
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建约束失败: {str(e)}")

@router.get("/list/{project_id}", response_model=ConstraintListResponse)
async def get_constraints(project_id: str):
    """获取项目的所有约束"""
    try:
        project_constraints = constraints_storage.get(project_id, {})
        project_cases = constraint_cases_storage.get(project_id, {})
        
        constraints_list = list(project_constraints.values())
        cases_list = list(project_cases.values())
        
        active_count = sum(1 for constraint in constraints_list if constraint.is_active)
        
        return ConstraintListResponse(
            constraints=constraints_list,
            total_count=len(constraints_list),
            active_count=active_count,
            constraint_cases=cases_list
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取约束列表失败: {str(e)}")

@router.put("/update/{constraint_id}", response_model=ConstraintResponse)
async def update_constraint(constraint_id: str, request: UpdateConstraintRequest):
    """更新约束"""
    try:
        # 查找约束
        found_project = None
        for project_id, constraints in constraints_storage.items():
            if constraint_id in constraints:
                found_project = project_id
                break
        
        if not found_project:
            raise HTTPException(status_code=404, detail="约束不存在")
        
        # 更新约束
        constraints_storage[found_project][constraint_id] = request.constraint_definition
        
        return ConstraintResponse(
            success=True,
            message=f"约束 '{request.constraint_definition.name}' 更新成功",
            constraint_id=constraint_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新约束失败: {str(e)}")

@router.delete("/delete/{constraint_id}", response_model=ConstraintResponse)
async def delete_constraint(constraint_id: str):
    """删除约束"""
    try:
        # 查找并删除约束
        found_project = None
        for project_id, constraints in constraints_storage.items():
            if constraint_id in constraints:
                del constraints[constraint_id]
                found_project = project_id
                break
        
        if not found_project:
            raise HTTPException(status_code=404, detail="约束不存在")
        
        return ConstraintResponse(
            success=True,
            message="约束删除成功",
            constraint_id=constraint_id
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除约束失败: {str(e)}")

@router.post("/constraint-cases/create", response_model=ConstraintResponse)
async def create_constraint_case(request: CreateConstraintCaseRequest):
    """创建约束工况"""
    try:
        project_id = request.project_id
        constraint_case = request.constraint_case
        
        # 初始化项目存储
        if project_id not in constraint_cases_storage:
            constraint_cases_storage[project_id] = {}
        
        # 保存约束工况
        constraint_cases_storage[project_id][constraint_case.id] = constraint_case
        
        return ConstraintResponse(
            success=True,
            message=f"约束工况 '{constraint_case.name}' 创建成功",
            constraint_id=constraint_case.id,
            data={
                "constraints_count": len(constraint_case.constraints),
                "is_default": constraint_case.is_default
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建约束工况失败: {str(e)}")

@router.get("/templates")
async def get_constraint_templates():
    """获取约束模板"""
    templates = {
        "深基坑工程": {
            "description": "深基坑工程常用约束模板",
            "constraints": [
                {
                    "name": "基坑底部固定约束",
                    "type": "fixed",
                    "description": "基坑底部完全固定约束",
                    "typical_dofs": ["ux", "uy", "uz"],
                    "application": "surface"
                },
                {
                    "name": "围护结构底部铰接",
                    "type": "pinned",
                    "description": "围护结构底部铰接约束",
                    "typical_dofs": ["ux", "uy", "uz"],
                    "application": "node"
                },
                {
                    "name": "对称边界",
                    "type": "symmetry",
                    "description": "对称边界约束条件",
                    "typical_dofs": ["ux"],
                    "application": "surface"
                },
                {
                    "name": "弹性支撑",
                    "type": "elastic_support",
                    "description": "土体弹性支撑约束",
                    "typical_dofs": ["ux", "uy"],
                    "application": "surface"
                }
            ]
        },
        "桩基工程": {
            "description": "桩基工程常用约束模板",
            "constraints": [
                {
                    "name": "桩底固定约束",
                    "type": "fixed",
                    "description": "桩底完全固定约束",
                    "typical_dofs": ["ux", "uy", "uz", "rx", "ry", "rz"],
                    "application": "node"
                },
                {
                    "name": "土体弹性约束",
                    "type": "elastic_support",
                    "description": "桩侧土体弹性约束",
                    "typical_dofs": ["ux", "uy"],
                    "application": "surface"
                },
                {
                    "name": "桩顶铰接",
                    "type": "pinned",
                    "description": "桩顶铰接约束",
                    "typical_dofs": ["ux", "uy", "uz"],
                    "application": "node"
                }
            ]
        },
        "隧道工程": {
            "description": "隧道工程常用约束模板",
            "constraints": [
                {
                    "name": "隧道底部固定",
                    "type": "fixed",
                    "description": "隧道底部完全固定",
                    "typical_dofs": ["ux", "uy", "uz"],
                    "application": "surface"
                },
                {
                    "name": "围岩接触",
                    "type": "contact",
                    "description": "衬砌与围岩接触约束",
                    "typical_dofs": ["ux", "uy", "uz"],
                    "application": "surface"
                },
                {
                    "name": "对称轴约束",
                    "type": "symmetry",
                    "description": "隧道中心轴对称约束",
                    "typical_dofs": ["ux"],
                    "application": "surface"
                }
            ]
        }
    }
    
    return {"templates": templates}

@router.post("/validate")
async def validate_constraints(project_id: str):
    """验证约束配置"""
    try:
        project_constraints = constraints_storage.get(project_id, {})
        
        validation_results = {
            "is_valid": True,
            "warnings": [],
            "errors": [],
            "statistics": {
                "total_constraints": len(project_constraints),
                "active_constraints": sum(1 for constraint in project_constraints.values() if constraint.is_active),
                "constraint_types": {}
            }
        }
        
        # 统计约束类型
        for constraint in project_constraints.values():
            constraint_type = constraint.constraint_type
            validation_results["statistics"]["constraint_types"][constraint_type] = \
                validation_results["statistics"]["constraint_types"].get(constraint_type, 0) + 1
        
        # 基本验证
        if not project_constraints:
            validation_results["warnings"].append("项目中没有定义任何约束")
        
        # 检查每个约束
        for constraint in project_constraints.values():
            if not constraint.constraint_value.constrained_dofs:
                validation_results["errors"].append(f"约束 '{constraint.name}' 没有指定约束自由度")
                validation_results["is_valid"] = False
            
            if not constraint.geometry.target_entities:
                validation_results["errors"].append(f"约束 '{constraint.name}' 没有指定目标实体")
                validation_results["is_valid"] = False
        
        return validation_results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"验证约束失败: {str(e)}")

@router.post("/export/{project_id}")
async def export_constraints(project_id: str, format: str = "json"):
    """导出约束配置"""
    try:
        project_constraints = constraints_storage.get(project_id, {})
        project_cases = constraint_cases_storage.get(project_id, {})
        
        export_data = {
            "project_id": project_id,
            "export_time": datetime.utcnow().isoformat(),
            "constraints": [constraint.dict() for constraint in project_constraints.values()],
            "constraint_cases": [case.dict() for case in project_cases.values()],
            "summary": {
                "total_constraints": len(project_constraints),
                "total_cases": len(project_cases)
            }
        }
        
        return {
            "success": True,
            "data": export_data,
            "format": format
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出约束失败: {str(e)}")