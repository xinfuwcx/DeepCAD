"""
PyVista Web Bridge - 轻量级可视化桥接层
解决类缺失NameError，提供PyVista到Web的统一接口
"""

import os
import time
import tempfile
import logging
from typing import Optional, List, Dict, Any, Union, Tuple
from pathlib import Path
import numpy as np

logger = logging.getLogger(__name__)


class PyVistaWebBridge:
    """
    轻量级PyVista Web桥接器
    
    功能:
    - 安全的PyVista导入处理
    - 统一的网格处理接口
    - Web友好的数据转换
    - 错误处理和回退机制
    """
    
    def __init__(self):
        self._pyvista_available = False
        self._pv = None
        self._initialize_pyvista()
    
    def _initialize_pyvista(self):
        """安全初始化PyVista"""
        try:
            import pyvista as pv
            self._pv = pv
            self._pyvista_available = True
            logger.info("✅ PyVista Web Bridge initialized successfully")
        except ImportError as e:
            logger.warning(f"⚠️ PyVista not available: {e}")
            self._pyvista_available = False
        except Exception as e:
            logger.error(f"❌ Failed to initialize PyVista: {e}")
            self._pyvista_available = False
    
    @property
    def is_available(self) -> bool:
        """检查PyVista是否可用"""
        return self._pyvista_available
    
    def load_mesh(self, file_path: Union[str, Path]) -> Optional[Any]:
        """
        安全加载网格文件
        
        Args:
            file_path: 网格文件路径
            
        Returns:
            PyVista mesh object or None if failed
        """
        if not self.is_available:
            logger.error("PyVista not available for mesh loading")
            return None
        
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Mesh file not found: {file_path}")
            
            mesh = self._pv.read(str(file_path))
            logger.info(f"📦 Loaded mesh: {mesh.n_points} points, {mesh.n_cells} cells")
            return mesh
            
        except Exception as e:
            logger.error(f"❌ Failed to load mesh from {file_path}: {e}")
            return None
    
    def mesh_to_web_format(self, mesh: Any, format_type: str = "gltf") -> Optional[str]:
        """
        将网格转换为Web友好格式
        
        Args:
            mesh: PyVista mesh object
            format_type: 输出格式 ("gltf", "obj", "ply")
            
        Returns:
            输出文件路径或None
        """
        if not self.is_available or mesh is None:
            return None
        
        try:
            # 创建输出目录
            output_dir = Path("./static_content/web_exports")
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # 生成唯一文件名
            timestamp = int(time.time())
            if format_type.lower() == "gltf":
                filename = f"mesh_{timestamp}.gltf"
                file_path = output_dir / filename
                mesh.save(str(file_path), binary=False)
            elif format_type.lower() == "obj":
                filename = f"mesh_{timestamp}.obj"
                file_path = output_dir / filename
                mesh.save(str(file_path))
            elif format_type.lower() == "ply":
                filename = f"mesh_{timestamp}.ply"
                file_path = output_dir / filename
                mesh.save(str(file_path))
            else:
                raise ValueError(f"Unsupported format: {format_type}")
            
            logger.info(f"💾 Exported mesh to {format_type}: {file_path}")
            return str(file_path)
            
        except Exception as e:
            logger.error(f"❌ Failed to export mesh to {format_type}: {e}")
            return None
    
    def generate_preview_image(self, 
                             mesh: Any, 
                             camera_position: str = "iso",
                             window_size: Tuple[int, int] = (800, 600),
                             background_color: List[float] = [0.1, 0.1, 0.1],
                             show_edges: bool = False,
                             opacity: float = 1.0) -> Optional[str]:
        """
        生成网格预览图像
        
        Args:
            mesh: PyVista mesh object
            camera_position: 相机位置
            window_size: 窗口大小
            background_color: 背景颜色
            show_edges: 是否显示边缘
            opacity: 透明度
            
        Returns:
            预览图像路径或None
        """
        if not self.is_available or mesh is None:
            return None
        
        try:
            # 创建输出目录
            output_dir = Path("./static_content/previews")
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # 生成文件名
            timestamp = int(time.time())
            filename = f"preview_{timestamp}.png"
            file_path = output_dir / filename
            
            # 创建离屏渲染器
            plotter = self._pv.Plotter(off_screen=True, window_size=window_size)
            plotter.add_mesh(mesh, 
                           opacity=opacity,
                           show_edges=show_edges)
            plotter.background_color = background_color
            plotter.camera_position = camera_position
            
            # 截图
            plotter.screenshot(str(file_path), transparent_background=True)
            plotter.close()
            
            logger.info(f"📸 Generated preview image: {file_path}")
            return str(file_path)
            
        except Exception as e:
            logger.error(f"❌ Failed to generate preview: {e}")
            return None
    
    def get_mesh_info(self, mesh: Any) -> Dict[str, Any]:
        """
        获取网格统计信息
        
        Args:
            mesh: PyVista mesh object
            
        Returns:
            包含网格信息的字典
        """
        if not self.is_available or mesh is None:
            return {"error": "PyVista not available or mesh is None"}
        
        try:
            info = {
                "points": int(mesh.n_points),
                "cells": int(mesh.n_cells),
                "bounds": mesh.bounds.tolist(),
                "center": mesh.center.tolist(),
                "memory_usage": f"{mesh.memory_usage():.2f} MB" if hasattr(mesh, 'memory_usage') else "N/A"
            }
            
            # 添加可选属性
            if hasattr(mesh, 'volume') and mesh.volume is not None:
                info["volume"] = float(mesh.volume)
            
            if hasattr(mesh, 'area') and mesh.area is not None:
                info["surface_area"] = float(mesh.area)
            
            # 数据数组信息
            if mesh.array_names:
                info["data_arrays"] = list(mesh.array_names)
            
            return info
            
        except Exception as e:
            logger.error(f"❌ Failed to get mesh info: {e}")
            return {"error": str(e)}
    
    def process_mesh_for_web(self, 
                           mesh: Any, 
                           render_type: str = "surface",
                           color_by: Optional[str] = None) -> Optional[Any]:
        """
        为Web渲染处理网格
        
        Args:
            mesh: PyVista mesh object
            render_type: 渲染类型 ("surface", "wireframe", "points")
            color_by: 颜色映射字段名
            
        Returns:
            处理后的mesh或None
        """
        if not self.is_available or mesh is None:
            return None
        
        try:
            processed_mesh = mesh.copy()
            
            # 应用颜色映射
            if color_by and color_by in processed_mesh.array_names:
                processed_mesh.set_active_scalars(color_by)
            
            # 根据渲染类型处理
            if render_type == "wireframe":
                processed_mesh = processed_mesh.extract_all_edges()
            elif render_type == "points":
                processed_mesh = processed_mesh.extract_points()
            elif render_type == "surface":
                if processed_mesh.n_faces == 0:
                    processed_mesh = processed_mesh.extract_surface()
            
            logger.info(f"🔄 Processed mesh for {render_type} rendering")
            return processed_mesh
            
        except Exception as e:
            logger.error(f"❌ Failed to process mesh: {e}")
            return None
    
    def create_volume_isosurfaces(self, 
                                volume_mesh: Any, 
                                iso_values: Optional[List[float]] = None) -> Optional[Any]:
        """
        创建体数据等值面
        
        Args:
            volume_mesh: 体数据网格
            iso_values: 等值面数值列表
            
        Returns:
            等值面网格或None
        """
        if not self.is_available or volume_mesh is None:
            return None
        
        try:
            if iso_values:
                contours = volume_mesh.contour(iso_values)
            else:
                # 自动生成等值面
                data_range = volume_mesh.get_data_range()
                auto_values = np.linspace(data_range[0], data_range[1], 5)[1:-1]
                contours = volume_mesh.contour(auto_values.tolist())
            
            logger.info(f"📊 Created isosurfaces: {contours.n_points} points")
            return contours
            
        except Exception as e:
            logger.error(f"❌ Failed to create isosurfaces: {e}")
            return None
    
    def get_supported_formats(self) -> Dict[str, List[str]]:
        """获取支持的文件格式"""
        return {
            "input_formats": [
                ".vtk", ".vtu", ".vti", ".vtr", ".vts",  # VTK formats
                ".msh",  # Gmsh format
                ".ply", ".stl", ".obj",  # Mesh formats
                ".gltf", ".glb"  # 3D web formats
            ],
            "output_formats": [
                ".gltf",  # Primary output for Three.js
                ".glb",   # Binary glTF
                ".obj",   # Wavefront OBJ
                ".ply",   # Stanford PLY
                ".png"    # Preview images
            ]
        }
    
    def health_check(self) -> Dict[str, Any]:
        """健康检查"""
        status = {
            "pyvista_available": self.is_available,
            "bridge_version": "1.0.0",
            "timestamp": time.time()
        }
        
        if self.is_available:
            try:
                status["pyvista_version"] = self._pv.__version__
                status["vtk_version"] = self._pv.vtk_version_info
            except:
                status["version_info"] = "Unable to retrieve version info"
        
        return status


# 全局单例实例
_bridge_instance = None

def get_pyvista_bridge() -> PyVistaWebBridge:
    """获取PyVista Web Bridge单例实例"""
    global _bridge_instance
    if _bridge_instance is None:
        _bridge_instance = PyVistaWebBridge()
    return _bridge_instance


def reset_bridge():
    """重置桥接器实例（主要用于测试）"""
    global _bridge_instance
    _bridge_instance = None


# 便捷函数
def safe_load_mesh(file_path: Union[str, Path]) -> Optional[Any]:
    """安全加载网格文件的便捷函数"""
    bridge = get_pyvista_bridge()
    return bridge.load_mesh(file_path)


def safe_mesh_to_gltf(mesh: Any) -> Optional[str]:
    """安全转换网格到glTF的便捷函数"""
    bridge = get_pyvista_bridge()
    return bridge.mesh_to_web_format(mesh, "gltf")


def is_pyvista_available() -> bool:
    """检查PyVista是否可用的便捷函数"""
    bridge = get_pyvista_bridge()
    return bridge.is_available