"""
GemPy集成的专业地质三维重建服务
专门为层状地质结构和不均匀钻孔分布设计
"""

import numpy as np
import pandas as pd
import gempy as gp
import pyvista as pv
import logging
from typing import List, Dict, Tuple, Optional, Union, Any
from dataclasses import dataclass
from enum import Enum
import os
import uuid
import tempfile

logger = logging.getLogger(__name__)

class GeologyModelType(Enum):
    """地质建模类型"""
    LAYERED = "layered"  # 层状建模
    FAULT_SYSTEM = "fault_system"  # 断层系统
    MIXED = "mixed"  # 混合建模

class InterpolationMethod(Enum):
    """插值方法"""
    KRIGING = "kriging"
    CO_KRIGING = "co_kriging" 
    DUAL_KRIGING = "dual_kriging"

@dataclass
class BoreholePoint:
    """钻孔点数据"""
    id: str
    x: float
    y: float
    z: float
    formation: str
    series: str
    description: Optional[str] = None

@dataclass
class DomainBounds:
    """计算域边界"""
    x_min: float
    x_max: float
    y_min: float
    y_max: float
    z_min: float
    z_max: float
    
    @property
    def extent(self) -> List[float]:
        return [self.x_min, self.x_max, self.y_min, self.y_max, self.z_min, self.z_max]

class GemPyGeologyService:
    """
    基于GemPy的专业地质三维重建服务
    
    特别适合：
    - 基坑工程的不均匀钻孔分布
    - 层状地质结构建模
    - 边界约束建模
    - 与PyVista的无缝集成
    """
    
    def __init__(self, model_type: GeologyModelType = GeologyModelType.LAYERED):
        self.model_type = model_type
        self.geo_model = None
        self.boreholes: List[BoreholePoint] = []
        self.domain_bounds: Optional[DomainBounds] = None
        self.surface_points_df = None
        self.orientations_df = None
        
    def load_borehole_data(self, boreholes_data: List[Dict]) -> None:
        """
        加载钻孔数据
        
        Args:
            boreholes_data: 钻孔数据列表，包含x,y,z坐标和地层信息
        """
        self.boreholes.clear()
        
        for bh in boreholes_data:
            point = BoreholePoint(
                id=str(bh.get('id', uuid.uuid4())),
                x=float(bh['x']),
                y=float(bh['y']),
                z=float(bh['z']),
                formation=str(bh.get('formation', bh.get('soil_type', 'Unknown'))),
                series=str(bh.get('series', 'Default')),
                description=bh.get('description', '')
            )
            self.boreholes.append(point)
            
        logger.info(f"✓ 已加载 {len(self.boreholes)} 个钻孔数据点")
        
    def set_domain_bounds(self, bounds: DomainBounds) -> None:
        """设置计算域边界"""
        self.domain_bounds = bounds
        logger.info(f"✓ 设置计算域: {bounds.extent}")
        
    def auto_detect_domain(self, expansion_factor: float = 1.2) -> DomainBounds:
        """
        根据钻孔数据自动检测计算域边界
        
        Args:
            expansion_factor: 扩展因子，>1表示扩大域边界
        """
        if not self.boreholes:
            raise ValueError("需要先加载钻孔数据")
            
        coords = np.array([[bh.x, bh.y, bh.z] for bh in self.boreholes])
        
        # 计算边界
        mins = coords.min(axis=0)
        maxs = coords.max(axis=0)
        ranges = maxs - mins
        
        # 扩展边界
        expansion = ranges * (expansion_factor - 1) / 2
        
        bounds = DomainBounds(
            x_min=mins[0] - expansion[0],
            x_max=maxs[0] + expansion[0],
            y_min=mins[1] - expansion[1],
            y_max=maxs[1] + expansion[1],
            z_min=mins[2] - expansion[2],
            z_max=maxs[2] + expansion[2]
        )
        
        self.set_domain_bounds(bounds)
        return bounds
        
    def prepare_gempy_data(self, resolution: Tuple[int, int, int] = (50, 50, 25)) -> None:
        """
        准备GemPy建模数据
        
        Args:
            resolution: 网格分辨率 (nx, ny, nz)
        """
        if not self.boreholes:
            raise ValueError("需要先加载钻孔数据")
            
        if not self.domain_bounds:
            self.auto_detect_domain()
            
        # 准备表面点数据
        surface_points = []
        for bh in self.boreholes:
            surface_points.append({
                'X': bh.x,
                'Y': bh.y,
                'Z': bh.z,
                'surface': bh.formation,
                'series': bh.series
            })
            
        self.surface_points_df = pd.DataFrame(surface_points)
        
        # 生成一些默认的方向数据（基于地层层序）
        # 在实际项目中，这些应该从地质解释中获得
        orientations = []
        unique_formations = self.surface_points_df['surface'].unique()
        
        for i, formation in enumerate(unique_formations):
            # 为每个地层添加一个默认的水平方向
            representative_point = self.surface_points_df[
                self.surface_points_df['surface'] == formation
            ].iloc[0]
            
            orientations.append({
                'X': representative_point['X'],
                'Y': representative_point['Y'],
                'Z': representative_point['Z'],
                'surface': formation,
                'series': representative_point['series'],
                'dip': 0.0,  # 水平层
                'azimuth': 0.0,
                'polarity': 1.0
            })
            
        self.orientations_df = pd.DataFrame(orientations)
        
        logger.info(f"✓ 准备了 {len(surface_points)} 个表面点")
        logger.info(f"✓ 准备了 {len(orientations)} 个方向约束")
        
    def create_geological_model(self, resolution: Tuple[int, int, int] = (50, 50, 25)) -> None:
        """
        创建GemPy地质模型
        
        Args:
            resolution: 网格分辨率
        """
        if self.surface_points_df is None:
            self.prepare_gempy_data(resolution)
            
        try:
            # 创建GemPy数据对象
            geo_data = gp.create_data(
                extent=self.domain_bounds.extent,
                resolution=resolution,
                surface_points=self.surface_points_df,
                orientations=self.orientations_df
            )
            
            # 创建地质模型
            self.geo_model = gp.create_model(geo_data)
            
            # 设置插值器
            gp.set_interpolator(
                self.geo_model,
                compile_theano=True,
                theano_optimizer='fast_compile'
            )
            
            logger.info("✓ GemPy地质模型创建成功")
            
        except Exception as e:
            logger.error(f"❌ GemPy模型创建失败: {e}")
            raise
            
    def compute_model(self) -> Dict[str, Any]:
        """
        计算地质模型
        
        Returns:
            包含计算结果的字典
        """
        if self.geo_model is None:
            raise ValueError("需要先创建地质模型")
            
        try:
            # 计算模型
            sol = gp.compute_model(self.geo_model, compute_mesh=True)
            
            logger.info("✓ 地质模型计算完成")
            
            # 提取结果信息
            results = {
                "success": True,
                "vertices": sol.vertices,
                "edges": sol.edges,
                "geology_ids": sol.geology_ids,
                "formations": self.geo_model.surfaces.df['surface'].tolist(),
                "n_formations": len(self.geo_model.surfaces.df),
                "resolution": self.geo_model.grid.regular_grid.resolution,
                "extent": self.geo_model.grid.regular_grid.extent
            }
            
            return results
            
        except Exception as e:
            logger.error(f"❌ 地质模型计算失败: {e}")
            return {"success": False, "error": str(e)}
            
    def export_to_pyvista(self) -> pv.UnstructuredGrid:
        """
        导出为PyVista网格对象
        
        Returns:
            PyVista UnstructuredGrid对象
        """
        if self.geo_model is None:
            raise ValueError("需要先创建并计算地质模型")
            
        try:
            # 从GemPy获取网格数据
            vertices = self.geo_model.solutions.vertices
            simplices = self.geo_model.solutions.edges
            
            # 创建PyVista网格
            if vertices is not None and simplices is not None:
                # 创建UnstructuredGrid
                cells = []
                cell_types = []
                
                # 假设是三角形单元
                for simplex in simplices:
                    if len(simplex) == 3:  # 三角形
                        cells.extend([3, simplex[0], simplex[1], simplex[2]])
                        cell_types.append(pv.CellType.TRIANGLE)
                    elif len(simplex) == 4:  # 四面体
                        cells.extend([4, simplex[0], simplex[1], simplex[2], simplex[3]])
                        cell_types.append(pv.CellType.TETRA)
                
                mesh = pv.UnstructuredGrid(cells, cell_types, vertices)
                
                # 添加地层ID作为标量字段
                if hasattr(self.geo_model.solutions, 'geology_ids'):
                    mesh['formation_id'] = self.geo_model.solutions.geology_ids
                    
            else:
                # 如果没有网格数据，创建点云
                points = np.array([[bh.x, bh.y, bh.z] for bh in self.boreholes])
                mesh = pv.PolyData(points)
                
                # 添加地层信息
                formations = [bh.formation for bh in self.boreholes]
                unique_formations = list(set(formations))
                formation_ids = [unique_formations.index(f) for f in formations]
                mesh['formation_id'] = formation_ids
                mesh['formation_name'] = formations
                
            logger.info(f"✓ 成功导出PyVista网格：{mesh.n_points}个点，{mesh.n_cells}个单元")
            return mesh
            
        except Exception as e:
            logger.error(f"❌ 导出PyVista网格失败: {e}")
            raise
            
    def export_to_gltf(self, output_dir: str = "output/geology", 
                       colormap: str = "tab10") -> str:
        """
        导出为glTF格式
        
        Args:
            output_dir: 输出目录
            colormap: 颜色映射
            
        Returns:
            glTF文件路径
        """
        os.makedirs(output_dir, exist_ok=True)
        
        try:
            # 获取PyVista网格
            mesh = self.export_to_pyvista()
            
            # 生成文件名
            filename = f"gempy_geology_{uuid.uuid4().hex[:8]}.gltf"
            output_path = os.path.join(output_dir, filename)
            
            # 使用PyVista的离屏渲染器导出
            plotter = pv.Plotter(off_screen=True)
            
            if 'formation_id' in mesh.array_names:
                plotter.add_mesh(
                    mesh,
                    scalars='formation_id',
                    cmap=colormap,
                    show_edges=False,
                    opacity=0.8
                )
            else:
                plotter.add_mesh(mesh, color='lightblue', opacity=0.8)
                
            # 添加钻孔点
            if self.boreholes:
                borehole_points = np.array([[bh.x, bh.y, bh.z] for bh in self.boreholes])
                plotter.add_points(
                    borehole_points,
                    color='red',
                    point_size=8,
                    render_points_as_spheres=True
                )
                
            # 导出glTF
            plotter.export_gltf(output_path)
            plotter.close()
            
            logger.info(f"✓ GemPy地质模型已导出: {output_path}")
            return output_path
            
        except Exception as e:
            logger.error(f"❌ glTF导出失败: {e}")
            raise
            
    def get_model_statistics(self) -> Dict[str, Any]:
        """获取模型统计信息"""
        if not self.geo_model:
            return {"error": "模型未创建"}
            
        stats = {
            "n_boreholes": len(self.boreholes),
            "n_formations": len(self.surface_points_df['surface'].unique()) if self.surface_points_df is not None else 0,
            "domain_bounds": self.domain_bounds.extent if self.domain_bounds else None,
            "resolution": self.geo_model.grid.regular_grid.resolution if self.geo_model else None,
            "model_type": self.model_type.value
        }
        
        return stats

# 创建全局服务实例
gempy_service = GemPyGeologyService()

def get_gempy_service() -> GemPyGeologyService:
    """获取GemPy地质服务实例"""
    return gempy_service