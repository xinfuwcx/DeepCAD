"""
剖面分析API路由 - 2D剖面切片和分析功能
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
import matplotlib
matplotlib.use('Agg')  # 使用非GUI后端
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
import pandas as pd

from .pyvista_state_manager import get_pyvista_state_manager
from .pyvista_web_bridge import get_pyvista_bridge
from ..websockets.connection_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cross-section", tags=["Cross Section Analysis"])

# 状态管理器和桥接器
state_manager = get_pyvista_state_manager()
bridge = get_pyvista_bridge()


class PlaneConfig(BaseModel):
    """切面配置"""
    type: str  # 'xy', 'xz', 'yz', 'custom'
    position: float  # 0-1之间的位置
    normal: Optional[List[float]] = None  # 自定义平面的法向量
    origin: Optional[List[float]] = None  # 自定义平面的原点


class AnalysisSettings(BaseModel):
    """分析设置"""
    variable: str  # 'displacement', 'stress', 'strain'
    component: str  # 'x', 'y', 'z', 'magnitude', 'von_mises'等
    smoothing: bool = False
    interpolation: str = 'linear'
    resolution: int = 100


class VisualSettings(BaseModel):
    """可视化设置"""
    show_contours: bool = True
    show_vectors: bool = False
    contour_levels: int = 10
    colormap: str = 'viridis'
    opacity: float = 0.8


class CrossSectionRequest(BaseModel):
    """剖面生成请求"""
    result_id: str
    plane_config: PlaneConfig
    analysis_settings: AnalysisSettings
    visual_settings: VisualSettings


class CrossSectionExportRequest(BaseModel):
    """剖面导出请求"""
    section_id: str
    format: str = 'svg'  # 'svg', 'png', 'pdf', 'json'


class ProfileLineRequest(BaseModel):
    """剖面线数据请求"""
    section_id: str
    start_point: List[float]  # [x, y]
    end_point: List[float]   # [x, y]
    num_points: int = 100


def generate_predefined_plane(plane_type: str, position: float, mesh_bounds: List[float]) -> Tuple[np.ndarray, np.ndarray]:
    """生成预定义平面的法向量和原点"""
    xmin, xmax, ymin, ymax, zmin, zmax = mesh_bounds
    
    if plane_type == 'xy':
        normal = np.array([0, 0, 1])
        z_pos = zmin + position * (zmax - zmin)
        origin = np.array([(xmin + xmax) / 2, (ymin + ymax) / 2, z_pos])
    elif plane_type == 'xz':
        normal = np.array([0, 1, 0])
        y_pos = ymin + position * (ymax - ymin)
        origin = np.array([(xmin + xmax) / 2, y_pos, (zmin + zmax) / 2])
    elif plane_type == 'yz':
        normal = np.array([1, 0, 0])
        x_pos = xmin + position * (xmax - xmin)
        origin = np.array([x_pos, (ymin + ymax) / 2, (zmin + zmax) / 2])
    else:
        raise ValueError(f"Unknown plane type: {plane_type}")
    
    return normal, origin


def extract_cross_section_data(mesh_data: Any, normal: np.ndarray, origin: np.ndarray, 
                              variable: str, component: str) -> Dict[str, Any]:
    """从网格数据中提取剖面数据"""
    try:
        # 这里需要使用PyVista进行剖面切割
        # 实际实现中需要调用bridge的方法
        if not bridge.is_available:
            raise RuntimeError("PyVista not available")
        
        # 模拟剖面数据提取
        # 实际实现需要调用PyVista的plane切割功能
        section_data = {
            "points": [],  # 剖面上的点坐标
            "values": [],  # 对应的标量值
            "vectors": [], # 对应的矢量值（如果需要）
            "connectivity": [],  # 连接关系
            "bounds": [0, 1, 0, 1],  # 剖面边界
            "metadata": {
                "variable": variable,
                "component": component,
                "plane_normal": normal.tolist(),
                "plane_origin": origin.tolist(),
                "num_points": 0
            }
        }
        
        return section_data
    
    except Exception as e:
        logger.error(f"Failed to extract cross section data: {e}")
        raise


def generate_contour_plot(section_data: Dict[str, Any], visual_settings: VisualSettings) -> io.BytesIO:
    """生成等值线图"""
    try:
        fig, ax = plt.subplots(figsize=(10, 8))
        
        # 这里需要根据section_data生成实际的等值线图
        # 模拟数据
        x = np.linspace(0, 1, 50)
        y = np.linspace(0, 1, 50)
        X, Y = np.meshgrid(x, y)
        Z = np.sin(2 * np.pi * X) * np.cos(2 * np.pi * Y)
        
        if visual_settings.show_contours:
            contours = ax.contour(X, Y, Z, levels=visual_settings.contour_levels, 
                                colors='black', linewidths=0.5)
            ax.clabel(contours, inline=True, fontsize=8)
            
            # 填充等值线
            contourf = ax.contourf(X, Y, Z, levels=visual_settings.contour_levels, 
                                 cmap=visual_settings.colormap, alpha=visual_settings.opacity)
            plt.colorbar(contourf, ax=ax)
        
        if visual_settings.show_vectors:
            # 添加矢量场显示
            skip = 5
            ax.quiver(X[::skip, ::skip], Y[::skip, ::skip], 
                     Z[::skip, ::skip], Z[::skip, ::skip], 
                     alpha=0.7, scale=10)
        
        ax.set_xlabel('X坐标')
        ax.set_ylabel('Y坐标')
        ax.set_title(f'剖面分析 - {section_data["metadata"]["variable"]}')
        ax.grid(True, alpha=0.3)
        ax.set_aspect('equal')
        
        # 保存为BytesIO
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', dpi=150, bbox_inches='tight')
        plt.close(fig)
        buffer.seek(0)
        
        return buffer
    
    except Exception as e:
        logger.error(f"Failed to generate contour plot: {e}")
        raise


@router.post("/generate")
async def generate_cross_section(
    request: CrossSectionRequest,
    background_tasks: BackgroundTasks,
    client_id: str
) -> JSONResponse:
    """生成剖面分析"""
    try:
        async def process_cross_section():
            try:
                # 发送开始消息
                await manager.send_personal_message(json.dumps({
                    "type": "cross_section_started",
                    "message": "开始生成剖面分析...",
                    "progress": 0
                }), client_id)
                
                # 1. 加载结果数据
                await manager.send_personal_message(json.dumps({
                    "type": "cross_section_progress",
                    "message": "加载结果数据...",
                    "progress": 20
                }), client_id)
                
                # 这里需要根据result_id加载对应的结果数据
                # 模拟数据加载
                mesh_bounds = [-1, 1, -1, 1, -1, 1]  # [xmin, xmax, ymin, ymax, zmin, zmax]
                
                # 2. 计算切面参数
                await manager.send_personal_message(json.dumps({
                    "type": "cross_section_progress",
                    "message": "计算切面参数...",
                    "progress": 40
                }), client_id)
                
                if request.plane_config.type != 'custom':
                    normal, origin = generate_predefined_plane(
                        request.plane_config.type,
                        request.plane_config.position,
                        mesh_bounds
                    )
                else:
                    normal = np.array(request.plane_config.normal or [0, 0, 1])
                    origin = np.array(request.plane_config.origin or [0, 0, 0])
                
                # 3. 提取剖面数据
                await manager.send_personal_message(json.dumps({
                    "type": "cross_section_progress",
                    "message": "提取剖面数据...",
                    "progress": 60
                }), client_id)
                
                # 模拟剖面数据
                section_data = extract_cross_section_data(
                    None,  # 实际应传入mesh_data
                    normal,
                    origin,
                    request.analysis_settings.variable,
                    request.analysis_settings.component
                )
                
                # 4. 生成可视化
                await manager.send_personal_message(json.dumps({
                    "type": "cross_section_progress",
                    "message": "生成可视化图像...",
                    "progress": 80
                }), client_id)
                
                contour_buffer = generate_contour_plot(section_data, request.visual_settings)
                
                # 5. 保存结果
                section_id = f"section_{int(datetime.now().timestamp())}"
                output_dir = Path("static/cross_sections")
                output_dir.mkdir(parents=True, exist_ok=True)
                
                # 保存图像
                image_path = output_dir / f"{section_id}.png"
                with open(image_path, 'wb') as f:
                    f.write(contour_buffer.getvalue())
                
                # 保存数据
                data_path = output_dir / f"{section_id}.json"
                with open(data_path, 'w') as f:
                    json.dump(section_data, f, indent=2)
                
                # 发送完成消息
                await manager.send_personal_message(json.dumps({
                    "type": "cross_section_completed",
                    "message": "剖面分析完成",
                    "progress": 100,
                    "section_data": {
                        "section_id": section_id,
                        "image_url": f"/static/cross_sections/{section_id}.png",
                        "data_url": f"/static/cross_sections/{section_id}.json",
                        "metadata": section_data["metadata"]
                    }
                }), client_id)
                
            except Exception as e:
                error_message = f"剖面分析失败: {str(e)}"
                await manager.send_personal_message(json.dumps({
                    "type": "cross_section_error",
                    "message": error_message
                }), client_id)
                logger.error(f"Cross section analysis failed: {e}")
        
        # 添加后台任务
        background_tasks.add_task(process_cross_section)
        
        return JSONResponse({
            "success": True,
            "message": "剖面分析已开始"
        })
        
    except Exception as e:
        logger.error(f"Failed to start cross section analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export")
async def export_cross_section(request: CrossSectionExportRequest) -> StreamingResponse:
    """导出剖面分析结果"""
    try:
        section_path = Path("static/cross_sections")
        
        if request.format == 'png':
            file_path = section_path / f"{request.section_id}.png"
            if not file_path.exists():
                raise HTTPException(status_code=404, detail="Section image not found")
            
            def iter_file():
                with open(file_path, 'rb') as f:
                    yield from f
            
            return StreamingResponse(
                iter_file(),
                media_type="image/png",
                headers={"Content-Disposition": f"attachment; filename={request.section_id}.png"}
            )
        
        elif request.format == 'json':
            file_path = section_path / f"{request.section_id}.json"
            if not file_path.exists():
                raise HTTPException(status_code=404, detail="Section data not found")
            
            def iter_file():
                with open(file_path, 'rb') as f:
                    yield from f
            
            return StreamingResponse(
                iter_file(),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename={request.section_id}.json"}
            )
        
        elif request.format == 'svg':
            # 重新生成SVG格式
            data_path = section_path / f"{request.section_id}.json"
            if not data_path.exists():
                raise HTTPException(status_code=404, detail="Section data not found")
            
            with open(data_path, 'r') as f:
                section_data = json.load(f)
            
            # 生成SVG图像
            fig, ax = plt.subplots(figsize=(10, 8))
            
            # 模拟重新绘制
            x = np.linspace(0, 1, 50)
            y = np.linspace(0, 1, 50)
            X, Y = np.meshgrid(x, y)
            Z = np.sin(2 * np.pi * X) * np.cos(2 * np.pi * Y)
            
            contourf = ax.contourf(X, Y, Z, levels=10, cmap='viridis')
            plt.colorbar(contourf, ax=ax)
            
            ax.set_xlabel('X坐标')
            ax.set_ylabel('Y坐标')
            ax.set_title('剖面分析')
            
            buffer = io.BytesIO()
            plt.savefig(buffer, format='svg', bbox_inches='tight')
            plt.close(fig)
            buffer.seek(0)
            
            return StreamingResponse(
                io.BytesIO(buffer.getvalue()),
                media_type="image/svg+xml",
                headers={"Content-Disposition": f"attachment; filename={request.section_id}.svg"}
            )
        
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {request.format}")
    
    except Exception as e:
        logger.error(f"Failed to export cross section: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/profile-line")
async def extract_profile_line(request: ProfileLineRequest) -> JSONResponse:
    """提取剖面线数据"""
    try:
        # 加载剖面数据
        data_path = Path("static/cross_sections") / f"{request.section_id}.json"
        if not data_path.exists():
            raise HTTPException(status_code=404, detail="Section data not found")
        
        with open(data_path, 'r') as f:
            section_data = json.load(f)
        
        # 计算剖面线上的点
        start = np.array(request.start_point)
        end = np.array(request.end_point)
        
        # 生成线上的点
        t = np.linspace(0, 1, request.num_points)
        points = start[:, None] + t * (end - start)[:, None]
        
        # 模拟插值得到值
        # 实际实现中需要从section_data中插值
        distances = np.linalg.norm(points.T - start, axis=1)
        values = np.sin(2 * np.pi * distances / distances.max())
        
        profile_data = {
            "distances": distances.tolist(),
            "values": values.tolist(),
            "points": points.T.tolist(),
            "variable": section_data["metadata"]["variable"],
            "component": section_data["metadata"]["component"],
            "start_point": request.start_point,
            "end_point": request.end_point
        }
        
        return JSONResponse({
            "success": True,
            "profile_data": profile_data
        })
        
    except Exception as e:
        logger.error(f"Failed to extract profile line: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
async def list_cross_sections() -> JSONResponse:
    """获取所有剖面分析列表"""
    try:
        sections_dir = Path("static/cross_sections")
        if not sections_dir.exists():
            return JSONResponse({"success": True, "sections": []})
        
        sections = []
        for json_file in sections_dir.glob("*.json"):
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                
                section_id = json_file.stem
                sections.append({
                    "section_id": section_id,
                    "metadata": data.get("metadata", {}),
                    "created": datetime.fromtimestamp(
                        json_file.stat().st_mtime
                    ).isoformat(),
                    "image_url": f"/static/cross_sections/{section_id}.png",
                    "data_url": f"/static/cross_sections/{section_id}.json"
                })
            except Exception as e:
                logger.warning(f"Failed to read section file {json_file}: {e}")
                continue
        
        # 按创建时间排序
        sections.sort(key=lambda x: x["created"], reverse=True)
        
        return JSONResponse({
            "success": True,
            "sections": sections
        })
        
    except Exception as e:
        logger.error(f"Failed to list cross sections: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{section_id}")
async def delete_cross_section(section_id: str) -> JSONResponse:
    """删除剖面分析"""
    try:
        sections_dir = Path("static/cross_sections")
        
        # 删除相关文件
        files_to_delete = [
            sections_dir / f"{section_id}.json",
            sections_dir / f"{section_id}.png"
        ]
        
        deleted_files = []
        for file_path in files_to_delete:
            if file_path.exists():
                file_path.unlink()
                deleted_files.append(str(file_path))
        
        if not deleted_files:
            raise HTTPException(status_code=404, detail="Section not found")
        
        return JSONResponse({
            "success": True,
            "message": f"删除了 {len(deleted_files)} 个文件",
            "deleted_files": deleted_files
        })
        
    except Exception as e:
        logger.error(f"Failed to delete cross section: {e}")
        raise HTTPException(status_code=500, detail=str(e))