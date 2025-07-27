"""
可视化模块 - 约束和荷载符号显示
专门处理约束和荷载的三维符号显示和可视化渲染
"""

import asyncio
import json
import logging
import numpy as np
from typing import Dict, Any, Optional, List, Tuple
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

from .pyvista_state_manager import get_pyvista_state_manager
from .pyvista_web_bridge import get_pyvista_bridge
from ..websockets.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/visualization/symbols", tags=["Constraint Load Symbols"])

# 状态管理器和桥接器
state_manager = get_pyvista_state_manager()
bridge = get_pyvista_bridge()

# 约束符号类型枚举
class ConstraintSymbolType(str, Enum):
    FIXED = "fixed"                     # 固定支座
    PINNED = "pinned"                   # 铰支座
    ROLLER = "roller"                   # 滚支座
    SLIDING = "sliding"                 # 滑动支座
    ELASTIC = "elastic"                 # 弹性支座
    ROTATIONAL = "rotational"           # 转动约束
    DISPLACEMENT_X = "displacement_x"    # X向位移约束
    DISPLACEMENT_Y = "displacement_y"    # Y向位移约束
    DISPLACEMENT_Z = "displacement_z"    # Z向位移约束
    CUSTOM = "custom"                   # 自定义约束

# 荷载符号类型枚举
class LoadSymbolType(str, Enum):
    POINT_FORCE = "point_force"         # 集中力
    DISTRIBUTED_FORCE = "distributed_force"  # 分布力
    MOMENT = "moment"                   # 力矩
    PRESSURE = "pressure"               # 压力
    BODY_FORCE = "body_force"           # 体力
    SURFACE_LOAD = "surface_load"       # 面荷载
    LINE_LOAD = "line_load"             # 线荷载
    TEMPERATURE_LOAD = "temperature_load"  # 温度荷载
    SEISMIC_LOAD = "seismic_load"       # 地震荷载
    WIND_LOAD = "wind_load"             # 风荷载

# 符号显示样式
class SymbolStyle(str, Enum):
    STANDARD = "standard"               # 标准样式
    ENGINEERING = "engineering"         # 工程样式
    SIMPLIFIED = "simplified"           # 简化样式
    DETAILED = "detailed"              # 详细样式

# 请求和响应模型
class ConstraintSymbolRequest(BaseModel):
    """约束符号显示请求"""
    session_id: str = Field(..., description="会话ID")
    constraint_id: str = Field(..., description="约束ID")
    symbol_type: ConstraintSymbolType = Field(..., description="约束符号类型")
    position: List[float] = Field(..., description="约束位置坐标")
    orientation: Optional[List[float]] = Field([0, 0, 0], description="约束方向角度")
    scale: Optional[float] = Field(1.0, description="符号大小比例")
    color: Optional[str] = Field("#FF0000", description="符号颜色")
    style: Optional[SymbolStyle] = Field(SymbolStyle.STANDARD, description="显示样式")
    show_label: Optional[bool] = Field(True, description="显示标签")
    dof_constrained: Optional[List[str]] = Field([], description="被约束的自由度")

class LoadSymbolRequest(BaseModel):
    """荷载符号显示请求"""
    session_id: str = Field(..., description="会话ID")
    load_id: str = Field(..., description="荷载ID")
    symbol_type: LoadSymbolType = Field(..., description="荷载符号类型")
    position: List[float] = Field(..., description="荷载位置坐标")
    direction: List[float] = Field(..., description="荷载方向矢量")
    magnitude: float = Field(..., description="荷载大小")
    unit: str = Field("N", description="荷载单位")
    scale: Optional[float] = Field(1.0, description="符号大小比例")
    color: Optional[str] = Field("#0066CC", description="符号颜色")
    style: Optional[SymbolStyle] = Field(SymbolStyle.STANDARD, description="显示样式")
    show_value: Optional[bool] = Field(True, description="显示数值")
    arrow_style: Optional[str] = Field("3d", description="箭头样式")

class SymbolGroupRequest(BaseModel):
    """符号组显示请求"""
    session_id: str = Field(..., description="会话ID")
    group_name: str = Field(..., description="符号组名称")
    constraint_symbols: List[ConstraintSymbolRequest] = Field([], description="约束符号列表")
    load_symbols: List[LoadSymbolRequest] = Field([], description="荷载符号列表")
    global_scale: Optional[float] = Field(1.0, description="全局缩放")
    show_legend: Optional[bool] = Field(True, description="显示图例")

class SymbolResponse(BaseModel):
    """符号显示响应"""
    success: bool = Field(..., description="是否成功")
    message: str = Field(..., description="响应消息")
    symbol_count: Optional[int] = Field(None, description="符号数量")
    render_info: Optional[Dict[str, Any]] = Field(None, description="渲染信息")

@router.post("/constraints/display", response_model=SymbolResponse)
async def display_constraint_symbols(
    request: ConstraintSymbolRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """显示约束符号"""
    try:
        logger.info(f"🔗 Processing constraint symbol: {request.constraint_id} - {request.symbol_type}")
        
        background_tasks.add_task(
            _process_constraint_symbol,
            request,
            client_id
        )
        
        return JSONResponse({
            "success": True,
            "message": f"Constraint symbol rendering started: {request.constraint_id}",
            "symbol_type": request.symbol_type,
            "position": request.position
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to process constraint symbol: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _process_constraint_symbol(request: ConstraintSymbolRequest, client_id: str):
    """后台处理约束符号显示"""
    try:
        # 发送开始消息
        start_payload = {
            "status": "processing",
            "progress": 10,
            "message": f"Creating constraint symbol: {request.symbol_type}..."
        }
        await manager.send_personal_message(json.dumps(start_payload), client_id)
        
        # 获取会话数据
        session_data = state_manager.get_session(request.session_id)
        if not session_data:
            raise ValueError("Session not found")
        
        # 创建约束符号几何体
        progress_payload = {
            "status": "processing",
            "progress": 40,
            "message": "Generating constraint geometry..."
        }
        await manager.send_personal_message(json.dumps(progress_payload), client_id)
        
        constraint_mesh = await _create_constraint_symbol_geometry(
            request.symbol_type,
            request.position,
            request.orientation,
            request.scale,
            request.dof_constrained
        )
        
        # 应用样式和颜色
        style_payload = {
            "status": "processing",
            "progress": 70,
            "message": "Applying symbol style..."
        }
        await manager.send_personal_message(json.dumps(style_payload), client_id)
        
        styled_mesh = _apply_constraint_style(
            constraint_mesh, 
            request.color, 
            request.style,
            request.show_label,
            request.constraint_id
        )
        
        # 更新会话数据
        if 'constraint_symbols' not in session_data:
            session_data['constraint_symbols'] = {}
        session_data['constraint_symbols'][request.constraint_id] = styled_mesh
        
        # 发送完成消息
        complete_payload = {
            "status": "completed",
            "progress": 100,
            "message": f"Constraint symbol created: {request.constraint_id}",
            "symbol_info": {
                "id": request.constraint_id,
                "type": request.symbol_type,
                "position": request.position,
                "dof_count": len(request.dof_constrained)
            }
        }
        await manager.send_personal_message(json.dumps(complete_payload), client_id)
        
    except Exception as e:
        error_payload = {
            "status": "error",
            "progress": 0,
            "message": f"Error creating constraint symbol: {str(e)}"
        }
        await manager.send_personal_message(json.dumps(error_payload), client_id)
        logger.error(f"❌ Error in constraint symbol processing: {e}")

@router.post("/loads/display", response_model=SymbolResponse)
async def display_load_symbols(
    request: LoadSymbolRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """显示荷载符号"""
    try:
        logger.info(f"⚡ Processing load symbol: {request.load_id} - {request.symbol_type}")
        
        background_tasks.add_task(
            _process_load_symbol,
            request,
            client_id
        )
        
        return JSONResponse({
            "success": True,
            "message": f"Load symbol rendering started: {request.load_id}",
            "symbol_type": request.symbol_type,
            "magnitude": request.magnitude
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to process load symbol: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _process_load_symbol(request: LoadSymbolRequest, client_id: str):
    """后台处理荷载符号显示"""
    try:
        # 发送开始消息
        start_payload = {
            "status": "processing",
            "progress": 10,
            "message": f"Creating load symbol: {request.symbol_type}..."
        }
        await manager.send_personal_message(json.dumps(start_payload), client_id)
        
        # 获取会话数据
        session_data = state_manager.get_session(request.session_id)
        if not session_data:
            raise ValueError("Session not found")
        
        # 创建荷载符号几何体
        progress_payload = {
            "status": "processing",
            "progress": 40,
            "message": "Generating load geometry..."
        }
        await manager.send_personal_message(json.dumps(progress_payload), client_id)
        
        load_mesh = await _create_load_symbol_geometry(
            request.symbol_type,
            request.position,
            request.direction,
            request.magnitude,
            request.scale,
            request.arrow_style
        )
        
        # 应用样式和颜色
        style_payload = {
            "status": "processing",
            "progress": 70,
            "message": "Applying load style..."
        }
        await manager.send_personal_message(json.dumps(style_payload), client_id)
        
        styled_mesh = _apply_load_style(
            load_mesh, 
            request.color, 
            request.style,
            request.show_value,
            request.load_id,
            request.magnitude,
            request.unit
        )
        
        # 更新会话数据
        if 'load_symbols' not in session_data:
            session_data['load_symbols'] = {}
        session_data['load_symbols'][request.load_id] = styled_mesh
        
        # 发送完成消息
        complete_payload = {
            "status": "completed",
            "progress": 100,
            "message": f"Load symbol created: {request.load_id}",
            "symbol_info": {
                "id": request.load_id,
                "type": request.symbol_type,
                "magnitude": request.magnitude,
                "unit": request.unit,
                "direction": request.direction
            }
        }
        await manager.send_personal_message(json.dumps(complete_payload), client_id)
        
    except Exception as e:
        error_payload = {
            "status": "error",
            "progress": 0,
            "message": f"Error creating load symbol: {str(e)}"
        }
        await manager.send_personal_message(json.dumps(error_payload), client_id)
        logger.error(f"❌ Error in load symbol processing: {e}")

async def _create_constraint_symbol_geometry(
    symbol_type: ConstraintSymbolType,
    position: List[float],
    orientation: List[float],
    scale: float,
    dof_constrained: List[str]
):
    """创建约束符号几何体"""
    try:
        # 基础符号尺寸
        base_size = 0.1 * scale
        pos = np.array(position)
        
        if symbol_type == ConstraintSymbolType.FIXED:
            # 固定支座：三角形基座 + 约束线
            return _create_fixed_support_geometry(pos, base_size, orientation)
            
        elif symbol_type == ConstraintSymbolType.PINNED:
            # 铰支座：圆形基座 + 铰接符号
            return _create_pinned_support_geometry(pos, base_size, orientation)
            
        elif symbol_type == ConstraintSymbolType.ROLLER:
            # 滚支座：滚轮符号
            return _create_roller_support_geometry(pos, base_size, orientation)
            
        elif symbol_type == ConstraintSymbolType.ELASTIC:
            # 弹性支座：弹簧符号
            return _create_elastic_support_geometry(pos, base_size, orientation)
            
        elif symbol_type in [ConstraintSymbolType.DISPLACEMENT_X, 
                           ConstraintSymbolType.DISPLACEMENT_Y, 
                           ConstraintSymbolType.DISPLACEMENT_Z]:
            # 单向位移约束：箭头 + 约束符号
            axis = symbol_type.value.split('_')[1].upper()  # X, Y, Z
            return _create_displacement_constraint_geometry(pos, base_size, axis)
            
        else:
            # 默认约束符号
            return _create_default_constraint_geometry(pos, base_size, dof_constrained)
            
    except Exception as e:
        logger.error(f"Error creating constraint geometry: {e}")
        # 返回简单的点几何体作为fallback
        return _create_point_geometry(position, scale)

async def _create_load_symbol_geometry(
    symbol_type: LoadSymbolType,
    position: List[float],
    direction: List[float],
    magnitude: float,
    scale: float,
    arrow_style: str
):
    """创建荷载符号几何体"""
    try:
        # 标准化方向矢量
        dir_vec = np.array(direction)
        if np.linalg.norm(dir_vec) > 0:
            dir_vec = dir_vec / np.linalg.norm(dir_vec)
        else:
            dir_vec = np.array([0, 0, 1])  # 默认Z方向
        
        # 根据大小计算箭头长度
        arrow_length = min(max(magnitude / 10000, 0.05), 1.0) * scale
        pos = np.array(position)
        
        if symbol_type == LoadSymbolType.POINT_FORCE:
            # 集中力：箭头符号
            return _create_force_arrow_geometry(pos, dir_vec, arrow_length, arrow_style)
            
        elif symbol_type == LoadSymbolType.DISTRIBUTED_FORCE:
            # 分布力：多个箭头
            return _create_distributed_force_geometry(pos, dir_vec, arrow_length, arrow_style)
            
        elif symbol_type == LoadSymbolType.MOMENT:
            # 力矩：弯曲箭头
            return _create_moment_geometry(pos, dir_vec, arrow_length)
            
        elif symbol_type == LoadSymbolType.PRESSURE:
            # 压力：法向箭头
            return _create_pressure_geometry(pos, dir_vec, arrow_length)
            
        elif symbol_type == LoadSymbolType.SURFACE_LOAD:
            # 面荷载：面分布箭头
            return _create_surface_load_geometry(pos, dir_vec, arrow_length)
            
        elif symbol_type == LoadSymbolType.TEMPERATURE_LOAD:
            # 温度荷载：温度符号
            return _create_temperature_load_geometry(pos, magnitude, scale)
            
        else:
            # 默认荷载符号：简单箭头
            return _create_simple_arrow_geometry(pos, dir_vec, arrow_length)
            
    except Exception as e:
        logger.error(f"Error creating load geometry: {e}")
        # 返回简单的箭头几何体作为fallback
        return _create_simple_arrow_geometry(position, direction, scale)

def _create_fixed_support_geometry(position, size, orientation):
    """创建固定支座几何体"""
    # 创建三角形基座
    vertices = np.array([
        position + [-size, 0, 0],
        position + [size, 0, 0],
        position + [0, 0, -size*1.5],
        position  # 顶点
    ])
    
    # 添加约束线条
    constraint_lines = np.array([
        position + [-size*0.5, 0, -size*1.5],
        position + [size*0.5, 0, -size*1.5]
    ])
    
    return {
        "type": "fixed_support",
        "vertices": vertices.tolist(),
        "constraint_lines": constraint_lines.tolist(),
        "size": size
    }

def _create_pinned_support_geometry(position, size, orientation):
    """创建铰支座几何体"""
    # 创建圆形基座
    theta = np.linspace(0, 2*np.pi, 16)
    circle_points = []
    for t in theta:
        x = position[0] + size * np.cos(t)
        y = position[1] + size * np.sin(t)
        z = position[2] - size
        circle_points.append([x, y, z])
    
    return {
        "type": "pinned_support",
        "circle_points": circle_points,
        "center": position,
        "size": size
    }

def _create_roller_support_geometry(position, size, orientation):
    """创建滚支座几何体"""
    # 创建滚轮符号（圆形 + 底座）
    theta = np.linspace(0, 2*np.pi, 12)
    roller_points = []
    for t in theta:
        x = position[0] + size * 0.6 * np.cos(t)
        y = position[1] + size * 0.6 * np.sin(t)
        z = position[2] - size * 0.5
        roller_points.append([x, y, z])
    
    # 底座线条
    base_line = [
        position + [-size, 0, -size],
        position + [size, 0, -size]
    ]
    
    return {
        "type": "roller_support",
        "roller_points": roller_points,
        "base_line": base_line,
        "size": size
    }

def _create_elastic_support_geometry(position, size, orientation):
    """创建弹性支座几何体"""
    # 创建弹簧符号（锯齿状线条）
    spring_points = []
    n_coils = 8
    for i in range(n_coils * 2):
        t = i / (n_coils * 2 - 1)
        x = position[0] + ((-1) ** i) * size * 0.3
        y = position[1]
        z = position[2] - t * size * 1.5
        spring_points.append([x, y, z])
    
    return {
        "type": "elastic_support",
        "spring_points": spring_points,
        "size": size
    }

def _create_displacement_constraint_geometry(position, size, axis):
    """创建位移约束几何体"""
    pos = np.array(position)
    
    # 根据轴向创建约束符号
    if axis == 'X':
        arrow_dir = np.array([1, 0, 0])
    elif axis == 'Y':
        arrow_dir = np.array([0, 1, 0])
    else:  # Z
        arrow_dir = np.array([0, 0, 1])
    
    # 创建约束箭头和限制符号
    arrow_end = pos + arrow_dir * size
    constraint_symbol = [
        pos - arrow_dir * size * 0.2,
        pos + arrow_dir * size * 0.2
    ]
    
    return {
        "type": f"displacement_{axis.lower()}",
        "arrow_start": pos.tolist(),
        "arrow_end": arrow_end.tolist(),
        "constraint_symbol": constraint_symbol,
        "axis": axis
    }

def _create_force_arrow_geometry(position, direction, length, style):
    """创建力箭头几何体"""
    pos = np.array(position)
    dir_vec = np.array(direction)
    
    # 箭头主体
    arrow_end = pos + dir_vec * length
    
    # 箭头头部
    # 创建垂直于方向的两个向量
    if abs(dir_vec[2]) < 0.9:
        perp1 = np.cross(dir_vec, [0, 0, 1])
    else:
        perp1 = np.cross(dir_vec, [1, 0, 0])
    perp1 = perp1 / np.linalg.norm(perp1)
    perp2 = np.cross(dir_vec, perp1)
    perp2 = perp2 / np.linalg.norm(perp2)
    
    # 箭头头部顶点
    head_size = length * 0.2
    head_back = arrow_end - dir_vec * head_size
    head_points = [
        head_back + perp1 * head_size,
        head_back - perp1 * head_size,
        head_back + perp2 * head_size,
        head_back - perp2 * head_size
    ]
    
    return {
        "type": "force_arrow",
        "shaft_start": pos.tolist(),
        "shaft_end": arrow_end.tolist(),
        "head_points": [p.tolist() for p in head_points],
        "length": length,
        "style": style
    }

def _create_distributed_force_geometry(position, direction, length, style):
    """创建分布力几何体"""
    pos = np.array(position)
    dir_vec = np.array(direction)
    
    # 创建多个小箭头来表示分布力
    arrows = []
    n_arrows = 5
    spacing = length / n_arrows
    
    for i in range(n_arrows):
        arrow_pos = pos + np.array([i * spacing * 0.2, 0, 0])
        arrow_data = _create_force_arrow_geometry(arrow_pos, direction, length * 0.8, style)
        arrows.append(arrow_data)
    
    return {
        "type": "distributed_force",
        "arrows": arrows,
        "spacing": spacing
    }

def _create_moment_geometry(position, direction, length):
    """创建力矩几何体"""
    pos = np.array(position)
    
    # 创建弯曲箭头表示力矩
    theta = np.linspace(0, 1.5 * np.pi, 20)
    moment_points = []
    
    for t in theta:
        radius = length * 0.8
        x = pos[0] + radius * np.cos(t)
        y = pos[1] + radius * np.sin(t)
        z = pos[2]
        moment_points.append([x, y, z])
    
    return {
        "type": "moment",
        "curve_points": moment_points,
        "center": pos.tolist(),
        "radius": length * 0.8
    }

def _create_temperature_load_geometry(position, magnitude, scale):
    """创建温度荷载几何体"""
    pos = np.array(position)
    size = scale * 0.1
    
    # 创建温度符号（类似温度计）
    temp_body = [
        pos + [0, 0, size],
        pos + [0, 0, -size]
    ]
    
    # 温度球
    theta = np.linspace(0, 2*np.pi, 12)
    temp_bulb = []
    for t in theta:
        x = pos[0] + size * 0.3 * np.cos(t)
        y = pos[1] + size * 0.3 * np.sin(t)
        z = pos[2] - size
        temp_bulb.append([x, y, z])
    
    return {
        "type": "temperature_load",
        "body": temp_body,
        "bulb_points": temp_bulb,
        "magnitude": magnitude
    }

def _create_simple_arrow_geometry(position, direction, length):
    """创建简单箭头几何体"""
    pos = np.array(position)
    if isinstance(direction, list):
        dir_vec = np.array(direction)
    else:
        dir_vec = direction
    
    if np.linalg.norm(dir_vec) > 0:
        dir_vec = dir_vec / np.linalg.norm(dir_vec)
    else:
        dir_vec = np.array([0, 0, 1])
    
    arrow_end = pos + dir_vec * length
    
    return {
        "type": "simple_arrow",
        "start": pos.tolist(),
        "end": arrow_end.tolist(),
        "direction": dir_vec.tolist(),
        "length": length
    }

def _create_default_constraint_geometry(position, size, dof_constrained):
    """创建默认约束几何体"""
    pos = np.array(position)
    
    # 根据约束自由度数量创建不同符号
    n_dof = len(dof_constrained)
    
    if n_dof >= 6:  # 全约束
        return _create_fixed_support_geometry(position, size, [0, 0, 0])
    elif n_dof >= 3:  # 部分约束
        return _create_pinned_support_geometry(position, size, [0, 0, 0])
    else:  # 简单约束
        return _create_point_geometry(position, size)

def _create_point_geometry(position, scale):
    """创建点几何体"""
    return {
        "type": "point",
        "position": position,
        "scale": scale
    }

def _create_pressure_geometry(position, direction, length):
    """创建压力几何体"""
    # 压力通常是法向分布的，创建多个法向箭头
    return _create_force_arrow_geometry(position, direction, length, "pressure")

def _create_surface_load_geometry(position, direction, length):
    """创建面荷载几何体"""
    # 面荷载表示为面上分布的箭头
    return _create_distributed_force_geometry(position, direction, length, "surface")

def _apply_constraint_style(mesh, color, style, show_label, constraint_id):
    """应用约束样式"""
    styled_mesh = mesh.copy()
    styled_mesh['color'] = color
    styled_mesh['style'] = style.value
    styled_mesh['show_label'] = show_label
    styled_mesh['id'] = constraint_id
    
    # 根据样式调整显示参数
    if style == SymbolStyle.ENGINEERING:
        styled_mesh['line_width'] = 3
        styled_mesh['opacity'] = 0.9
    elif style == SymbolStyle.SIMPLIFIED:
        styled_mesh['line_width'] = 1
        styled_mesh['opacity'] = 0.7
    elif style == SymbolStyle.DETAILED:
        styled_mesh['line_width'] = 2
        styled_mesh['opacity'] = 1.0
        styled_mesh['show_annotations'] = True
    
    return styled_mesh

def _apply_load_style(mesh, color, style, show_value, load_id, magnitude, unit):
    """应用荷载样式"""
    styled_mesh = mesh.copy()
    styled_mesh['color'] = color
    styled_mesh['style'] = style.value
    styled_mesh['show_value'] = show_value
    styled_mesh['id'] = load_id
    styled_mesh['magnitude'] = magnitude
    styled_mesh['unit'] = unit
    
    # 根据样式调整显示参数
    if style == SymbolStyle.ENGINEERING:
        styled_mesh['arrow_width'] = 0.02
        styled_mesh['opacity'] = 0.9
        styled_mesh['show_magnitude'] = True
    elif style == SymbolStyle.SIMPLIFIED:
        styled_mesh['arrow_width'] = 0.01
        styled_mesh['opacity'] = 0.7
    elif style == SymbolStyle.DETAILED:
        styled_mesh['arrow_width'] = 0.025
        styled_mesh['opacity'] = 1.0
        styled_mesh['show_magnitude'] = True
        styled_mesh['show_components'] = True
    
    return styled_mesh

@router.post("/group/display", response_model=SymbolResponse)
async def display_symbol_group(
    request: SymbolGroupRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """显示符号组"""
    try:
        logger.info(f"🎯 Processing symbol group: {request.group_name}")
        
        background_tasks.add_task(
            _process_symbol_group,
            request,
            client_id
        )
        
        return JSONResponse({
            "success": True,
            "message": f"Symbol group rendering started: {request.group_name}",
            "constraint_count": len(request.constraint_symbols),
            "load_count": len(request.load_symbols)
        })
        
    except Exception as e:
        logger.error(f"❌ Failed to process symbol group: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def _process_symbol_group(request: SymbolGroupRequest, client_id: str):
    """后台处理符号组显示"""
    try:
        session_data = state_manager.get_session(request.session_id)
        if not session_data:
            raise ValueError("Session not found")
        
        total_symbols = len(request.constraint_symbols) + len(request.load_symbols)
        processed_count = 0
        
        # 处理约束符号
        for constraint_req in request.constraint_symbols:
            constraint_req.scale *= request.global_scale
            await _process_constraint_symbol(constraint_req, client_id)
            processed_count += 1
            
            progress = int((processed_count / total_symbols) * 80)
            progress_payload = {
                "status": "processing",
                "progress": progress,
                "message": f"Processing symbols: {processed_count}/{total_symbols}"
            }
            await manager.send_personal_message(json.dumps(progress_payload), client_id)
        
        # 处理荷载符号
        for load_req in request.load_symbols:
            load_req.scale *= request.global_scale
            await _process_load_symbol(load_req, client_id)
            processed_count += 1
            
            progress = int((processed_count / total_symbols) * 80)
            progress_payload = {
                "status": "processing",
                "progress": progress,
                "message": f"Processing symbols: {processed_count}/{total_symbols}"
            }
            await manager.send_personal_message(json.dumps(progress_payload), client_id)
        
        # 创建图例
        if request.show_legend:
            legend_payload = {
                "status": "processing",
                "progress": 90,
                "message": "Creating symbol legend..."
            }
            await manager.send_personal_message(json.dumps(legend_payload), client_id)
            
            legend_data = _create_symbol_legend(request.constraint_symbols, request.load_symbols)
            session_data['symbol_legend'] = legend_data
        
        # 完成
        complete_payload = {
            "status": "completed",
            "progress": 100,
            "message": f"Symbol group created: {request.group_name}",
            "group_info": {
                "name": request.group_name,
                "constraint_count": len(request.constraint_symbols),
                "load_count": len(request.load_symbols),
                "total_symbols": total_symbols
            }
        }
        await manager.send_personal_message(json.dumps(complete_payload), client_id)
        
    except Exception as e:
        error_payload = {
            "status": "error",
            "progress": 0,
            "message": f"Error processing symbol group: {str(e)}"
        }
        await manager.send_personal_message(json.dumps(error_payload), client_id)

def _create_symbol_legend(constraint_symbols, load_symbols):
    """创建符号图例"""
    legend_items = []
    
    # 约束符号图例
    for constraint in constraint_symbols:
        legend_items.append({
            "type": "constraint",
            "symbol_type": constraint.symbol_type,
            "name": constraint.constraint_id,
            "color": constraint.color,
            "description": f"约束: {constraint.symbol_type}"
        })
    
    # 荷载符号图例
    for load in load_symbols:
        legend_items.append({
            "type": "load",
            "symbol_type": load.symbol_type,
            "name": load.load_id,
            "color": load.color,
            "magnitude": load.magnitude,
            "unit": load.unit,
            "description": f"荷载: {load.magnitude} {load.unit}"
        })
    
    return {
        "items": legend_items,
        "created_at": datetime.now().isoformat()
    }

@router.get("/types")
async def get_symbol_types() -> JSONResponse:
    """获取可用的符号类型"""
    return JSONResponse({
        "success": True,
        "constraint_types": [
            {
                "key": ct.value,
                "label": _get_constraint_type_label(ct),
                "description": _get_constraint_type_description(ct)
            }
            for ct in ConstraintSymbolType
        ],
        "load_types": [
            {
                "key": lt.value,
                "label": _get_load_type_label(lt),
                "description": _get_load_type_description(lt)
            }
            for lt in LoadSymbolType
        ],
        "styles": [
            {
                "key": st.value,
                "label": _get_style_label(st),
                "description": _get_style_description(st)
            }
            for st in SymbolStyle
        ]
    })

def _get_constraint_type_label(constraint_type: ConstraintSymbolType) -> str:
    """获取约束类型标签"""
    labels = {
        ConstraintSymbolType.FIXED: "固定支座",
        ConstraintSymbolType.PINNED: "铰支座",
        ConstraintSymbolType.ROLLER: "滚支座",
        ConstraintSymbolType.SLIDING: "滑动支座",
        ConstraintSymbolType.ELASTIC: "弹性支座",
        ConstraintSymbolType.ROTATIONAL: "转动约束",
        ConstraintSymbolType.DISPLACEMENT_X: "X向位移约束",
        ConstraintSymbolType.DISPLACEMENT_Y: "Y向位移约束",
        ConstraintSymbolType.DISPLACEMENT_Z: "Z向位移约束",
        ConstraintSymbolType.CUSTOM: "自定义约束"
    }
    return labels.get(constraint_type, constraint_type.value)

def _get_load_type_label(load_type: LoadSymbolType) -> str:
    """获取荷载类型标签"""
    labels = {
        LoadSymbolType.POINT_FORCE: "集中力",
        LoadSymbolType.DISTRIBUTED_FORCE: "分布力",
        LoadSymbolType.MOMENT: "力矩",
        LoadSymbolType.PRESSURE: "压力",
        LoadSymbolType.BODY_FORCE: "体力",
        LoadSymbolType.SURFACE_LOAD: "面荷载",
        LoadSymbolType.LINE_LOAD: "线荷载",
        LoadSymbolType.TEMPERATURE_LOAD: "温度荷载",
        LoadSymbolType.SEISMIC_LOAD: "地震荷载",
        LoadSymbolType.WIND_LOAD: "风荷载"
    }
    return labels.get(load_type, load_type.value)

def _get_constraint_type_description(constraint_type: ConstraintSymbolType) -> str:
    """获取约束类型描述"""
    descriptions = {
        ConstraintSymbolType.FIXED: "限制所有平移和转动自由度",
        ConstraintSymbolType.PINNED: "限制平移自由度，允许转动",
        ConstraintSymbolType.ROLLER: "限制法向平移，允许切向移动和转动",
        ConstraintSymbolType.SLIDING: "允许特定方向的平移运动",
        ConstraintSymbolType.ELASTIC: "提供弹性约束力",
        ConstraintSymbolType.ROTATIONAL: "限制转动自由度",
        ConstraintSymbolType.DISPLACEMENT_X: "限制X方向位移",
        ConstraintSymbolType.DISPLACEMENT_Y: "限制Y方向位移",
        ConstraintSymbolType.DISPLACEMENT_Z: "限制Z方向位移",
        ConstraintSymbolType.CUSTOM: "用户自定义约束条件"
    }
    return descriptions.get(constraint_type, "")

def _get_load_type_description(load_type: LoadSymbolType) -> str:
    """获取荷载类型描述"""
    descriptions = {
        LoadSymbolType.POINT_FORCE: "作用在点上的集中力",
        LoadSymbolType.DISTRIBUTED_FORCE: "沿线或面分布的力",
        LoadSymbolType.MOMENT: "产生转动效应的力偶",
        LoadSymbolType.PRESSURE: "垂直于表面的压力荷载",
        LoadSymbolType.BODY_FORCE: "作用在整个体积上的力",
        LoadSymbolType.SURFACE_LOAD: "作用在表面上的分布荷载",
        LoadSymbolType.LINE_LOAD: "沿线分布的荷载",
        LoadSymbolType.TEMPERATURE_LOAD: "由温度变化引起的荷载",
        LoadSymbolType.SEISMIC_LOAD: "地震动力荷载",
        LoadSymbolType.WIND_LOAD: "风压荷载"
    }
    return descriptions.get(load_type, "")

def _get_style_label(style: SymbolStyle) -> str:
    """获取样式标签"""
    labels = {
        SymbolStyle.STANDARD: "标准样式",
        SymbolStyle.ENGINEERING: "工程样式",
        SymbolStyle.SIMPLIFIED: "简化样式",
        SymbolStyle.DETAILED: "详细样式"
    }
    return labels.get(style, style.value)

def _get_style_description(style: SymbolStyle) -> str:
    """获取样式描述"""
    descriptions = {
        SymbolStyle.STANDARD: "标准的符号显示样式",
        SymbolStyle.ENGINEERING: "适合工程制图的样式",
        SymbolStyle.SIMPLIFIED: "简化的符号样式",
        SymbolStyle.DETAILED: "详细的符号样式，包含更多信息"
    }
    return descriptions.get(style, "")