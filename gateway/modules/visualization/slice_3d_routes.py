"""
3D切片可视化API路由 - 任意平面切片显示功能
"""

import asyncio
import json
import logging
import numpy as np
from typing import Dict, Any, Optional, List, Tuple
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from pathlib import Path
from datetime import datetime
import io

from .pyvista_state_manager import get_pyvista_state_manager
from .pyvista_web_bridge import get_pyvista_bridge
from ..websockets.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/3d-slice", tags=["3D Slice Visualization"])

# 状态管理器和桥接器
state_manager = get_pyvista_state_manager()
bridge = get_pyvista_bridge()


class SliceConfig(BaseModel):
    """单个切面配置"""
    direction: str  # 'x', 'y', 'z'
    position: float  # 0-1之间的位置
    thickness: float = 0.01
    variable: str = 'displacement'
    component: str = 'magnitude'


class MultiSliceConfig(BaseModel):
    """多切面配置"""
    direction: str  # 'x', 'y', 'z'
    count: int
    spacing: float
    start_position: float
    end_position: float
    variable: str = 'displacement'
    component: str = 'magnitude'


class VisualSettings(BaseModel):
    """可视化设置"""
    opacity: float = 0.8
    color: str = '#1890ff'
    interpolation: str = 'linear'
    show_bounding_box: bool = True
    show_axes: bool = True
    show_slice_intersections: bool = True
    enable_shadows: bool = False
    background_transparency: float = 0.1


class Slice3DRequest(BaseModel):
    """3D切片请求"""
    result_id: str
    slice_config: SliceConfig
    visual_settings: VisualSettings


class MultiSlice3DRequest(BaseModel):
    """多切面请求"""
    result_id: str
    multi_slice_config: MultiSliceConfig
    visual_settings: VisualSettings


class AnimationRequest(BaseModel):
    """切片动画请求"""
    result_id: str
    animation_config: Dict[str, Any]
    slice_config: SliceConfig


def generate_slice_plane(direction: str, position: float, bounds: List[float]) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """生成切面平面参数"""
    xmin, xmax, ymin, ymax, zmin, zmax = bounds
    
    if direction == 'x':
        # YZ平面
        x_pos = xmin + position * (xmax - xmin)
        normal = np.array([1, 0, 0])
        origin = np.array([x_pos, (ymin + ymax) / 2, (zmin + zmax) / 2])
        
        # 创建平面网格
        y_range = np.linspace(ymin, ymax, 50)
        z_range = np.linspace(zmin, zmax, 50)
        Y, Z = np.meshgrid(y_range, z_range)
        X = np.full_like(Y, x_pos)
        
    elif direction == 'y':
        # XZ平面
        y_pos = ymin + position * (ymax - ymin)
        normal = np.array([0, 1, 0])
        origin = np.array([(xmin + xmax) / 2, y_pos, (zmin + zmax) / 2])
        
        x_range = np.linspace(xmin, xmax, 50)
        z_range = np.linspace(zmin, zmax, 50)
        X, Z = np.meshgrid(x_range, z_range)
        Y = np.full_like(X, y_pos)
        
    elif direction == 'z':
        # XY平面
        z_pos = zmin + position * (zmax - zmin)
        normal = np.array([0, 0, 1])
        origin = np.array([(xmin + xmax) / 2, (ymin + ymax) / 2, z_pos])
        
        x_range = np.linspace(xmin, xmax, 50)
        y_range = np.linspace(ymin, ymax, 50)
        X, Y = np.meshgrid(x_range, y_range)
        Z = np.full_like(X, z_pos)
        
    else:
        raise ValueError(f"Invalid direction: {direction}")
    
    return X, Y, Z


def extract_slice_data(result_data: Any, slice_config: SliceConfig, bounds: List[float]) -> Dict[str, Any]:
    """从3D数据中提取切面数据"""
    try:
        # 生成切面网格
        X, Y, Z = generate_slice_plane(slice_config.direction, slice_config.position, bounds)
        
        # 模拟在切面上插值得到标量值
        # 实际实现中需要使用PyVista的切面功能
        if slice_config.variable == 'displacement' and slice_config.component == 'magnitude':
            # 模拟位移模长分布
            center_x, center_y, center_z = (bounds[0] + bounds[1]) / 2, (bounds[2] + bounds[3]) / 2, (bounds[4] + bounds[5]) / 2
            
            if slice_config.direction == 'x':
                dist = np.sqrt((Y - center_y)**2 + (Z - center_z)**2)
                values = 0.1 * np.exp(-dist * 5) * (1 + 0.3 * np.sin(dist * 10))
            elif slice_config.direction == 'y':
                dist = np.sqrt((X - center_x)**2 + (Z - center_z)**2)
                values = 0.1 * np.exp(-dist * 5) * (1 + 0.3 * np.cos(dist * 8))
            else:  # z direction
                dist = np.sqrt((X - center_x)**2 + (Y - center_y)**2)
                values = 0.1 * np.exp(-dist * 3) * (1 + 0.5 * np.sin(dist * 6))
        
        elif slice_config.variable == 'stress' and slice_config.component == 'von_mises':
            # 模拟应力分布
            if slice_config.direction == 'x':
                values = 100 * (1 + 0.5 * np.sin(Y * 10) * np.cos(Z * 8))
            elif slice_config.direction == 'y':
                values = 100 * (1 + 0.3 * np.cos(X * 8) * np.sin(Z * 12))
            else:
                values = 100 * (1 + 0.4 * np.sin(X * 6) * np.cos(Y * 9))
        
        else:
            # 默认分布
            values = np.sin(X * 5) * np.cos(Y * 4) * np.sin(Z * 3)
        
        # 添加噪声
        noise = 0.05 * np.random.normal(0, 1, values.shape)
        values = values + noise
        
        return {
            "coordinates": {
                "x": X.flatten().tolist(),
                "y": Y.flatten().tolist(),
                "z": Z.flatten().tolist()
            },
            "values": values.flatten().tolist(),
            "grid_shape": list(X.shape),
            "bounds": bounds,
            "slice_metadata": {
                "direction": slice_config.direction,
                "position": slice_config.position,
                "thickness": slice_config.thickness,
                "variable": slice_config.variable,
                "component": slice_config.component
            },
            "statistics": {
                "min": float(np.min(values)),
                "max": float(np.max(values)),
                "mean": float(np.mean(values)),
                "std": float(np.std(values))
            }
        }
    
    except Exception as e:
        logger.error(f"Failed to extract slice data: {e}")
        raise


def generate_multi_slice_data(result_data: Any, multi_config: MultiSliceConfig, bounds: List[float]) -> List[Dict[str, Any]]:
    """生成多个切面数据"""
    try:
        slices_data = []
        
        # 计算切面位置
        positions = np.linspace(multi_config.start_position, multi_config.end_position, multi_config.count)
        
        for i, position in enumerate(positions):
            slice_config = SliceConfig(
                direction=multi_config.direction,
                position=position,
                thickness=0.01,  # 固定厚度
                variable=multi_config.variable,
                component=multi_config.component
            )
            
            slice_data = extract_slice_data(result_data, slice_config, bounds)
            slice_data["slice_index"] = i
            slice_data["slice_id"] = f"slice_{multi_config.direction}_{i}"
            slices_data.append(slice_data)
        
        return slices_data
    
    except Exception as e:
        logger.error(f"Failed to generate multi-slice data: {e}")
        raise


@router.post("/generate")
async def generate_3d_slice(
    request: Slice3DRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """生成3D切面"""
    try:
        async def process_3d_slice():
            try:
                # 发送开始消息
                await manager.send_personal_message(json.dumps({
                    "type": "slice_3d_started",
                    "message": "开始生成3D切面...",
                    "progress": 0
                }), client_id)
                
                # 1. 加载结果数据
                await manager.send_personal_message(json.dumps({
                    "type": "slice_3d_progress",
                    "message": "加载3D结果数据...",
                    "progress": 20
                }), client_id)
                
                # 模拟数据边界
                bounds = [-1, 1, -1, 1, -1, 1]  # [xmin, xmax, ymin, ymax, zmin, zmax]
                
                # 2. 生成切面数据
                await manager.send_personal_message(json.dumps({
                    "type": "slice_3d_progress",
                    "message": "生成切面数据...",
                    "progress": 50
                }), client_id)
                
                slice_data = extract_slice_data(None, request.slice_config, bounds)
                
                # 3. 应用可视化设置
                await manager.send_personal_message(json.dumps({
                    "type": "slice_3d_progress",
                    "message": "应用可视化设置...",
                    "progress": 70
                }), client_id)
                
                # 添加可视化设置到数据中
                slice_data["visual_settings"] = request.visual_settings.dict()
                
                # 4. 保存切面数据
                await manager.send_personal_message(json.dumps({
                    "type": "slice_3d_progress",
                    "message": "保存切面数据...",
                    "progress": 90
                }), client_id)
                
                slice_id = f"slice3d_{int(datetime.now().timestamp())}"
                output_dir = Path("static/3d_slices")
                output_dir.mkdir(parents=True, exist_ok=True)
                
                # 保存数据
                data_to_save = {
                    "slice_id": slice_id,
                    "slice_data": slice_data,
                    "created": datetime.now().isoformat()
                }
                
                data_path = output_dir / f"{slice_id}.json"
                with open(data_path, 'w') as f:
                    json.dump(data_to_save, f, indent=2)
                
                # 发送完成消息
                await manager.send_personal_message(json.dumps({
                    "type": "slice_3d_completed",
                    "message": "3D切面生成完成",
                    "progress": 100,
                    "slice_result": {
                        "slice_id": slice_id,
                        "slice_data": slice_data,
                        "data_url": f"/static/3d_slices/{slice_id}.json"
                    }
                }), client_id)
                
            except Exception as e:
                error_message = f"3D切面生成失败: {str(e)}"
                await manager.send_personal_message(json.dumps({
                    "type": "slice_3d_error",
                    "message": error_message
                }), client_id)
                logger.error(f"3D slice generation failed: {e}")
        
        # 添加后台任务
        background_tasks.add_task(process_3d_slice)
        
        return JSONResponse({
            "success": True,
            "message": "3D切面生成已开始"
        })
        
    except Exception as e:
        logger.error(f"Failed to start 3D slice generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-multi")
async def generate_multi_3d_slice(
    request: MultiSlice3DRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """生成多个3D切面"""
    try:
        async def process_multi_3d_slice():
            try:
                # 发送开始消息
                await manager.send_personal_message(json.dumps({
                    "type": "multi_slice_3d_started",
                    "message": "开始生成多个3D切面...",
                    "progress": 0
                }), client_id)
                
                # 1. 加载结果数据
                await manager.send_personal_message(json.dumps({
                    "type": "multi_slice_3d_progress",
                    "message": "加载3D结果数据...",
                    "progress": 10
                }), client_id)
                
                bounds = [-1, 1, -1, 1, -1, 1]
                
                # 2. 生成多个切面
                await manager.send_personal_message(json.dumps({
                    "type": "multi_slice_3d_progress",
                    "message": f"生成 {request.multi_slice_config.count} 个切面...",
                    "progress": 30
                }), client_id)
                
                multi_slice_data = generate_multi_slice_data(None, request.multi_slice_config, bounds)
                
                # 3. 应用可视化设置
                await manager.send_personal_message(json.dumps({
                    "type": "multi_slice_3d_progress",
                    "message": "应用可视化设置...",
                    "progress": 70
                }), client_id)
                
                for slice_data in multi_slice_data:
                    slice_data["visual_settings"] = request.visual_settings.dict()
                
                # 4. 保存多切面数据
                await manager.send_personal_message(json.dumps({
                    "type": "multi_slice_3d_progress",
                    "message": "保存多切面数据...",
                    "progress": 90
                }), client_id)
                
                multi_slice_id = f"multislice3d_{int(datetime.now().timestamp())}"
                output_dir = Path("static/3d_slices")
                output_dir.mkdir(parents=True, exist_ok=True)
                
                # 保存数据
                data_to_save = {
                    "multi_slice_id": multi_slice_id,
                    "slices_data": multi_slice_data,
                    "multi_slice_config": request.multi_slice_config.dict(),
                    "created": datetime.now().isoformat()
                }
                
                data_path = output_dir / f"{multi_slice_id}.json"
                with open(data_path, 'w') as f:
                    json.dump(data_to_save, f, indent=2)
                
                # 发送完成消息
                await manager.send_personal_message(json.dumps({
                    "type": "multi_slice_3d_completed",
                    "message": "多3D切面生成完成",
                    "progress": 100,
                    "multi_slice_result": {
                        "multi_slice_id": multi_slice_id,
                        "slices_data": multi_slice_data,
                        "slice_count": len(multi_slice_data),
                        "data_url": f"/static/3d_slices/{multi_slice_id}.json"
                    }
                }), client_id)
                
            except Exception as e:
                error_message = f"多3D切面生成失败: {str(e)}"
                await manager.send_personal_message(json.dumps({
                    "type": "multi_slice_3d_error",
                    "message": error_message
                }), client_id)
                logger.error(f"Multi 3D slice generation failed: {e}")
        
        # 添加后台任务
        background_tasks.add_task(process_multi_3d_slice)
        
        return JSONResponse({
            "success": True,
            "message": "多3D切面生成已开始"
        })
        
    except Exception as e:
        logger.error(f"Failed to start multi 3D slice generation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/animation")
async def create_slice_animation(
    request: AnimationRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """创建切面动画"""
    try:
        async def process_slice_animation():
            try:
                # 发送开始消息
                await manager.send_personal_message(json.dumps({
                    "type": "slice_animation_started",
                    "message": "开始创建切面动画...",
                    "progress": 0
                }), client_id)
                
                bounds = [-1, 1, -1, 1, -1, 1]
                total_frames = request.animation_config.get("total_frames", 50)
                
                animation_frames = []
                
                for frame_index in range(total_frames):
                    # 计算当前帧的切面位置
                    position = frame_index / (total_frames - 1) if total_frames > 1 else 0
                    
                    # 更新切面配置
                    frame_slice_config = SliceConfig(
                        direction=request.slice_config.direction,
                        position=position,
                        thickness=request.slice_config.thickness,
                        variable=request.slice_config.variable,
                        component=request.slice_config.component
                    )
                    
                    # 生成当前帧的切面数据
                    frame_data = extract_slice_data(None, frame_slice_config, bounds)
                    frame_data["frame_index"] = frame_index
                    frame_data["position"] = position
                    
                    animation_frames.append(frame_data)
                    
                    # 更新进度
                    progress = 20 + int(60 * frame_index / total_frames)
                    await manager.send_personal_message(json.dumps({
                        "type": "slice_animation_progress",
                        "message": f"生成第 {frame_index + 1}/{total_frames} 帧...",
                        "progress": progress
                    }), client_id)
                
                # 保存动画数据
                await manager.send_personal_message(json.dumps({
                    "type": "slice_animation_progress",
                    "message": "保存动画数据...",
                    "progress": 90
                }), client_id)
                
                animation_id = f"sliceanimation_{int(datetime.now().timestamp())}"
                output_dir = Path("static/3d_slices/animations")
                output_dir.mkdir(parents=True, exist_ok=True)
                
                # 保存动画数据
                data_to_save = {
                    "animation_id": animation_id,
                    "frames": animation_frames,
                    "animation_config": request.animation_config,
                    "slice_config": request.slice_config.dict(),
                    "total_frames": total_frames,
                    "created": datetime.now().isoformat()
                }
                
                data_path = output_dir / f"{animation_id}.json"
                with open(data_path, 'w') as f:
                    json.dump(data_to_save, f, indent=2)
                
                # 发送完成消息
                await manager.send_personal_message(json.dumps({
                    "type": "slice_animation_completed",
                    "message": "切面动画创建完成",
                    "progress": 100,
                    "animation_result": {
                        "animation_id": animation_id,
                        "total_frames": total_frames,
                        "data_url": f"/static/3d_slices/animations/{animation_id}.json"
                    }
                }), client_id)
                
            except Exception as e:
                error_message = f"切面动画创建失败: {str(e)}"
                await manager.send_personal_message(json.dumps({
                    "type": "slice_animation_error",
                    "message": error_message
                }), client_id)
                logger.error(f"Slice animation creation failed: {e}")
        
        # 添加后台任务
        background_tasks.add_task(process_slice_animation)
        
        return JSONResponse({
            "success": True,
            "message": "切面动画创建已开始"
        })
        
    except Exception as e:
        logger.error(f"Failed to start slice animation creation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_3d_slices() -> JSONResponse:
    """获取所有3D切面列表"""
    try:
        slices_dir = Path("static/3d_slices")
        if not slices_dir.exists():
            return JSONResponse({"success": True, "slices": []})
        
        slices = []
        
        # 获取单个切面
        for json_file in slices_dir.glob("slice3d_*.json"):
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                
                slices.append({
                    "slice_id": data.get("slice_id", json_file.stem),
                    "type": "single",
                    "metadata": data.get("slice_data", {}).get("slice_metadata", {}),
                    "statistics": data.get("slice_data", {}).get("statistics", {}),
                    "created": data.get("created", datetime.fromtimestamp(json_file.stat().st_mtime).isoformat()),
                    "data_url": f"/static/3d_slices/{json_file.name}"
                })
            except Exception as e:
                logger.warning(f"Failed to read slice file {json_file}: {e}")
                continue
        
        # 获取多切面
        for json_file in slices_dir.glob("multislice3d_*.json"):
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                
                slices.append({
                    "slice_id": data.get("multi_slice_id", json_file.stem),
                    "type": "multi",
                    "slice_count": len(data.get("slices_data", [])),
                    "config": data.get("multi_slice_config", {}),
                    "created": data.get("created", datetime.fromtimestamp(json_file.stat().st_mtime).isoformat()),
                    "data_url": f"/static/3d_slices/{json_file.name}"
                })
            except Exception as e:
                logger.warning(f"Failed to read multi-slice file {json_file}: {e}")
                continue
        
        # 获取动画
        animations_dir = slices_dir / "animations"
        if animations_dir.exists():
            for json_file in animations_dir.glob("sliceanimation_*.json"):
                try:
                    with open(json_file, 'r') as f:
                        data = json.load(f)
                    
                    slices.append({
                        "slice_id": data.get("animation_id", json_file.stem),
                        "type": "animation",
                        "total_frames": data.get("total_frames", 0),
                        "config": data.get("slice_config", {}),
                        "created": data.get("created", datetime.fromtimestamp(json_file.stat().st_mtime).isoformat()),
                        "data_url": f"/static/3d_slices/animations/{json_file.name}"
                    })
                except Exception as e:
                    logger.warning(f"Failed to read animation file {json_file}: {e}")
                    continue
        
        # 按创建时间排序
        slices.sort(key=lambda x: x["created"], reverse=True)
        
        return JSONResponse({
            "success": True,
            "slices": slices
        })
        
    except Exception as e:
        logger.error(f"Failed to list 3D slices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{slice_id}")
async def delete_3d_slice(slice_id: str) -> JSONResponse:
    """删除3D切面"""
    try:
        slices_dir = Path("static/3d_slices")
        
        # 尝试删除不同类型的文件
        possible_files = [
            slices_dir / f"{slice_id}.json",
            slices_dir / "animations" / f"{slice_id}.json"
        ]
        
        deleted_files = []
        for file_path in possible_files:
            if file_path.exists():
                file_path.unlink()
                deleted_files.append(str(file_path))
        
        if not deleted_files:
            raise HTTPException(status_code=404, detail="Slice not found")
        
        return JSONResponse({
            "success": True,
            "message": f"删除了 {len(deleted_files)} 个文件",
            "deleted_files": deleted_files
        })
        
    except Exception as e:
        logger.error(f"Failed to delete 3D slice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bounds/{result_id}")
async def get_result_bounds(result_id: str) -> JSONResponse:
    """获取结果数据的边界信息"""
    try:
        # 实际实现中应该从result_id对应的数据中获取真实边界
        # 这里返回模拟边界
        bounds = {
            "xmin": -1.0, "xmax": 1.0,
            "ymin": -1.0, "ymax": 1.0,
            "zmin": -1.0, "zmax": 1.0,
            "center": [0.0, 0.0, 0.0],
            "size": [2.0, 2.0, 2.0]
        }
        
        return JSONResponse({
            "success": True,
            "bounds": bounds
        })
        
    except Exception as e:
        logger.error(f"Failed to get result bounds: {e}")
        raise HTTPException(status_code=500, detail=str(e))