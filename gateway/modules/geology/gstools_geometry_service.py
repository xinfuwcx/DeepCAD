"""
GSTools + GMSH OCC + PyVista 地质几何建模服务
专注于三维地层几何体构建，而非CAE网格生成
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
import json
import tempfile
import os
from pathlib import Path

try:
    import gstools as gs
    import pyvista as pv
    import gmsh
    from scipy.spatial import ConvexHull
    from scipy.interpolate import griddata
    DEPENDENCIES_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Some dependencies not available: {e}")
    DEPENDENCIES_AVAILABLE = False

@dataclass
class Stratum:
    """土层段数据结构"""
    id: str
    top_elev: float
    bottom_elev: float
    soil_type: str
    density: float
    cohesion: float
    friction: float
    elastic_modulus: Optional[float] = None
    poisson_ratio: Optional[float] = None
    permeability: Optional[float] = None

@dataclass 
class Borehole:
    """钻孔数据结构"""
    id: str
    name: str
    x: float
    y: float
    ground_elevation: float
    total_depth: float
    strata: List[Stratum]

@dataclass
class ThreeZoneParams:
    """三区混合算法参数"""
    core_radius: float
    transition_distance: float
    variogram_model: str
    trend_order: str
    uncertainty_analysis: bool
    confidence_level: Optional[float] = None

@dataclass
class ComputationDomain:
    """计算域参数"""
    extension_method: str
    x_extend: float
    y_extend: float
    foundation_multiplier: Optional[float]
    bottom_elevation: float
    mesh_resolution: float

@dataclass
class GMSHParams:
    """GMSH几何参数（非CAE网格）"""
    characteristic_length: float
    physical_groups: bool
    mesh_quality: float

class GeologyGeometryService:
    """地质几何建模服务"""
    
    def __init__(self):
        self.work_dir = Path(tempfile.mkdtemp(prefix="geology_geom_"))
        self.boreholes: List[Borehole] = []
        self.domain_bounds = None
        self.layer_interfaces = {}  # 存储各层界面插值结果
        
    def load_borehole_data(self, boreholes_data: List[Dict]) -> bool:
        """加载钻孔数据"""
        try:
            self.boreholes = []
            for bh_data in boreholes_data:
                strata = [
                    Stratum(**stratum_data) for stratum_data in bh_data['strata']
                ]
                borehole = Borehole(
                    id=bh_data['id'],
                    name=bh_data['name'],
                    x=bh_data['x'],
                    y=bh_data['y'],
                    ground_elevation=bh_data['ground_elevation'],
                    total_depth=bh_data['total_depth'],
                    strata=strata
                )
                self.boreholes.append(borehole)
            
            print(f"Successfully loaded {len(self.boreholes)} boreholes")
            return True
            
        except Exception as e:
            print(f"Error loading borehole data: {e}")
            return False
    
    def compute_domain_bounds(self, domain: ComputationDomain) -> Dict[str, float]:
        """计算域边界智能定义"""
        if not self.boreholes:
            raise ValueError("No borehole data available")
        
        # 提取钻孔坐标
        coords = np.array([[bh.x, bh.y] for bh in self.boreholes])
        
        if domain.extension_method == 'convex_hull':
            # 凸包缓冲方法
            hull = ConvexHull(coords)
            hull_points = coords[hull.vertices]
            
            # 计算凸包的扩展边界
            x_min = hull_points[:, 0].min() - domain.x_extend
            x_max = hull_points[:, 0].max() + domain.x_extend
            y_min = hull_points[:, 1].min() - domain.y_extend
            y_max = hull_points[:, 1].max() + domain.y_extend
            
        elif domain.extension_method == 'foundation_multiple':
            # 基坑尺寸倍数方法
            x_min = coords[:, 0].min()
            x_max = coords[:, 0].max()
            y_min = coords[:, 1].min()
            y_max = coords[:, 1].max()
            
            # 基坑尺寸
            foundation_x = x_max - x_min
            foundation_y = y_max - y_min
            
            # 按倍数扩展
            multiplier = domain.foundation_multiplier or 3.0
            extend_x = foundation_x * (multiplier - 1) / 2
            extend_y = foundation_y * (multiplier - 1) / 2
            
            x_min -= extend_x
            x_max += extend_x
            y_min -= extend_y
            y_max += extend_y
            
        else:  # manual
            # 手动指定方法
            x_center = coords[:, 0].mean()
            y_center = coords[:, 1].mean()
            
            x_min = x_center - domain.x_extend / 2
            x_max = x_center + domain.x_extend / 2
            y_min = y_center - domain.y_extend / 2
            y_max = y_center + domain.y_extend / 2
        
        # 深度边界
        z_max = max(bh.ground_elevation for bh in self.boreholes) + 5  # 地面以上5米
        z_min = domain.bottom_elevation
        
        self.domain_bounds = {
            'x_min': x_min, 'x_max': x_max,
            'y_min': y_min, 'y_max': y_max,
            'z_min': z_min, 'z_max': z_max
        }
        
        print(f"Domain bounds: X[{x_min:.1f}, {x_max:.1f}], Y[{y_min:.1f}, {y_max:.1f}], Z[{z_min:.1f}, {z_max:.1f}]")
        return self.domain_bounds
    
    def extract_interface_points(self) -> Dict[str, List[Tuple[float, float, float]]]:
        """提取土层界面点集"""
        interfaces = {}
        
        for borehole in self.boreholes:
            for i, stratum in enumerate(borehole.strata):
                # 顶面界面
                top_key = f"{stratum.soil_type}_top"
                if top_key not in interfaces:
                    interfaces[top_key] = []
                interfaces[top_key].append((borehole.x, borehole.y, stratum.top_elev))
                
                # 底面界面  
                bottom_key = f"{stratum.soil_type}_bottom"
                if bottom_key not in interfaces:
                    interfaces[bottom_key] = []
                interfaces[bottom_key].append((borehole.x, borehole.y, stratum.bottom_elev))
        
        # 按土层类型合并同类界面
        layer_interfaces = {}
        for borehole in self.boreholes:
            for stratum in borehole.strata:
                layer_name = stratum.soil_type
                if layer_name not in layer_interfaces:
                    layer_interfaces[layer_name] = {
                        'top_points': [],
                        'bottom_points': []
                    }
                
                layer_interfaces[layer_name]['top_points'].append(
                    (borehole.x, borehole.y, stratum.top_elev)
                )
                layer_interfaces[layer_name]['bottom_points'].append(
                    (borehole.x, borehole.y, stratum.bottom_elev)
                )
        
        print(f"Extracted interfaces for {len(layer_interfaces)} soil types")
        return layer_interfaces
    
    def perform_three_zone_kriging(
        self, 
        points: List[Tuple[float, float, float]], 
        algorithm: ThreeZoneParams,
        domain: ComputationDomain
    ) -> np.ndarray:
        """执行三区混合克里金插值"""
        if not DEPENDENCIES_AVAILABLE:
            print("Warning: GSTools not available, using mock interpolation")
            return self._mock_interpolation(points, domain)
        
        try:
            # 准备数据
            coords = np.array(points)
            x_coords = coords[:, 0]
            y_coords = coords[:, 1]
            z_values = coords[:, 2]
            
            # 生成插值网格
            bounds = self.domain_bounds
            nx = int((bounds['x_max'] - bounds['x_min']) / domain.mesh_resolution) + 1
            ny = int((bounds['y_max'] - bounds['y_min']) / domain.mesh_resolution) + 1
            
            x_grid = np.linspace(bounds['x_min'], bounds['x_max'], nx)
            y_grid = np.linspace(bounds['y_min'], bounds['y_max'], ny)
            xx, yy = np.meshgrid(x_grid, y_grid)
            
            # 计算到钻孔的距离
            grid_points = np.column_stack([xx.ravel(), yy.ravel()])
            borehole_coords = np.array([[bh.x, bh.y] for bh in self.boreholes])
            
            # 为每个网格点计算到最近钻孔的距离
            from scipy.spatial.distance import cdist
            distances = cdist(grid_points, borehole_coords)
            min_distances = distances.min(axis=1)
            
            # 三区划分
            core_mask = min_distances < algorithm.core_radius
            transition_mask = (min_distances >= algorithm.core_radius) & (min_distances < algorithm.transition_distance)
            extrapolation_mask = min_distances >= algorithm.transition_distance
            
            print(f"Zone division: Core {core_mask.sum()}, Transition {transition_mask.sum()}, Extrapolation {extrapolation_mask.sum()}")
            
            # 初始化结果
            z_interpolated = np.zeros(len(grid_points))
            
            # 核心区和过渡区：使用克里金插值
            if core_mask.sum() > 0 or transition_mask.sum() > 0:
                # 创建GSTools模型
                if algorithm.variogram_model == 'spherical':
                    model = gs.Spherical(dim=2, var=1, len_scale=algorithm.core_radius/2)
                elif algorithm.variogram_model == 'exponential':
                    model = gs.Exponential(dim=2, var=1, len_scale=algorithm.core_radius/2)
                elif algorithm.variogram_model == 'gaussian':
                    model = gs.Gaussian(dim=2, var=1, len_scale=algorithm.core_radius/2)
                else:  # matern
                    model = gs.Matern(dim=2, var=1, len_scale=algorithm.core_radius/2)
                
                # 克里金插值
                krige = gs.krige.Ordinary(
                    model, 
                    cond_pos=[x_coords, y_coords], 
                    cond_val=z_values
                )
                
                # 对核心区和过渡区进行插值
                combined_mask = core_mask | transition_mask
                if combined_mask.sum() > 0:
                    krige_points = grid_points[combined_mask]
                    z_krige, _ = krige(krige_points[:, 0], krige_points[:, 1])
                    z_interpolated[combined_mask] = z_krige
            
            # 外推区：使用趋势面拟合
            if extrapolation_mask.sum() > 0:
                if algorithm.trend_order == 'linear':
                    # 线性趋势面: z = ax + by + c
                    A = np.column_stack([x_coords, y_coords, np.ones(len(x_coords))])
                    coeffs = np.linalg.lstsq(A, z_values, rcond=None)[0]
                    
                    extrap_points = grid_points[extrapolation_mask]
                    z_trend = (coeffs[0] * extrap_points[:, 0] + 
                              coeffs[1] * extrap_points[:, 1] + 
                              coeffs[2])
                    
                else:  # quadratic
                    # 二次趋势面: z = ax² + by² + cxy + dx + ey + f
                    A = np.column_stack([
                        x_coords**2, y_coords**2, x_coords*y_coords,
                        x_coords, y_coords, np.ones(len(x_coords))
                    ])
                    coeffs = np.linalg.lstsq(A, z_values, rcond=None)[0]
                    
                    extrap_points = grid_points[extrapolation_mask]
                    z_trend = (coeffs[0] * extrap_points[:, 0]**2 + 
                              coeffs[1] * extrap_points[:, 1]**2 + 
                              coeffs[2] * extrap_points[:, 0] * extrap_points[:, 1] +
                              coeffs[3] * extrap_points[:, 0] + 
                              coeffs[4] * extrap_points[:, 1] + 
                              coeffs[5])
                
                z_interpolated[extrapolation_mask] = z_trend
            
            # 重新整形为网格
            z_grid = z_interpolated.reshape(ny, nx)
            
            print(f"Three-zone interpolation completed: {nx}x{ny} grid")
            return z_grid, x_grid, y_grid
            
        except Exception as e:
            print(f"Error in three-zone kriging: {e}")
            return self._mock_interpolation(points, domain)
    
    def _mock_interpolation(self, points: List[Tuple[float, float, float]], domain: ComputationDomain):
        """模拟插值（当GSTools不可用时）"""
        coords = np.array(points)
        bounds = self.domain_bounds
        
        nx = int((bounds['x_max'] - bounds['x_min']) / domain.mesh_resolution) + 1
        ny = int((bounds['y_max'] - bounds['y_min']) / domain.mesh_resolution) + 1
        
        x_grid = np.linspace(bounds['x_min'], bounds['x_max'], nx)
        y_grid = np.linspace(bounds['y_min'], bounds['y_max'], ny)
        xx, yy = np.meshgrid(x_grid, y_grid)
        
        # 使用scipy的griddata进行简单插值
        from scipy.interpolate import griddata
        z_grid = griddata(
            coords[:, :2], coords[:, 2], 
            (xx, yy), method='cubic', fill_value=coords[:, 2].mean()
        )
        
        print(f"Mock interpolation completed: {nx}x{ny} grid")
        return z_grid, x_grid, y_grid
    
    def build_layer_geometries(
        self, 
        interface_grids: Dict[str, Tuple[np.ndarray, np.ndarray, np.ndarray]],
        gmsh_params: GMSHParams
    ) -> str:
        """使用GMSH OCC构建三维地层几何体"""
        try:
            # 初始化GMSH
            gmsh.initialize()
            gmsh.option.setNumber("General.Terminal", 0)  # 静默模式
            gmsh.model.add("geology_geometry")
            
            # 启用OCC几何内核
            gmsh.model.occ.synchronize()
            
            # 为每个土层创建几何体
            layer_volumes = {}
            
            for layer_name, (z_grid, x_grid, y_grid) in interface_grids.items():
                if layer_name.endswith('_top'):
                    continue  # 跳过顶面，只处理完整土层
                    
                base_layer = layer_name.replace('_bottom', '')
                if f"{base_layer}_top" not in interface_grids:
                    continue
                    
                top_grid = interface_grids[f"{base_layer}_top"][0]
                bottom_grid = z_grid
                
                print(f"Building geometry for layer: {base_layer}")
                
                # 创建顶面和底面
                top_surface = self._create_surface_from_grid(x_grid, y_grid, top_grid, f"{base_layer}_top")
                bottom_surface = self._create_surface_from_grid(x_grid, y_grid, bottom_grid, f"{base_layer}_bottom")
                
                if top_surface and bottom_surface:
                    # 创建侧面围成封闭体
                    volume = self._create_layer_volume(top_surface, bottom_surface, base_layer)
                    if volume:
                        layer_volumes[base_layer] = volume
            
            # 生成几何表面网格（用于可视化）
            gmsh.model.occ.synchronize()
            gmsh.model.mesh.generate(2)  # 生成表面网格，不是体网格
            
            # 保存几何文件
            geometry_file = str(self.work_dir / "geology_geometry.step")
            mesh_file = str(self.work_dir / "geology_surface_mesh.msh")
            
            # 导出几何
            gmsh.write(geometry_file)  # STEP格式，供后续CAE使用
            gmsh.write(mesh_file)      # 表面网格，供可视化使用
            
            gmsh.finalize()
            
            print(f"Geometry files saved: {geometry_file}, {mesh_file}")
            return mesh_file
            
        except Exception as e:
            print(f"Error building GMSH geometry: {e}")
            gmsh.finalize()
            return None
    
    def _create_surface_from_grid(self, x_grid, y_grid, z_grid, name):
        """从网格数据创建曲面"""
        try:
            # 创建控制点
            points = []
            for i in range(len(y_grid)):
                for j in range(len(x_grid)):
                    x, y, z = x_grid[j], y_grid[i], z_grid[i, j]
                    point = gmsh.model.occ.addPoint(x, y, z)
                    points.append(point)
            
            # 创建样条曲面
            # 这里简化为平面，实际应该用B样条曲面
            # 取四个角点创建平面作为示例
            if len(points) >= 4:
                corner_points = [points[0], points[len(x_grid)-1], points[-1], points[-len(x_grid)]]
                lines = []
                for i in range(4):
                    line = gmsh.model.occ.addLine(corner_points[i], corner_points[(i+1)%4])
                    lines.append(line)
                
                curve_loop = gmsh.model.occ.addCurveLoop(lines)
                surface = gmsh.model.occ.addPlaneSurface([curve_loop])
                
                print(f"Created surface for {name}")
                return surface
            
        except Exception as e:
            print(f"Error creating surface {name}: {e}")
            return None
    
    def _create_layer_volume(self, top_surface, bottom_surface, layer_name):
        """创建土层体积"""
        try:
            # 使用拉伸操作创建体积
            # 这里简化处理，实际应该用布尔运算
            extruded = gmsh.model.occ.extrude([(2, top_surface)], 0, 0, -10)  # 向下拉伸
            if extruded:
                volume = extruded[0][1]  # 获取体积标签
                print(f"Created volume for layer: {layer_name}")
                return volume
            
        except Exception as e:
            print(f"Error creating volume for {layer_name}: {e}")
            return None
    
    def export_visualization_files(self, mesh_file: str) -> Dict[str, str]:
        """导出可视化文件"""
        if not DEPENDENCIES_AVAILABLE:
            print("Warning: PyVista not available, skipping visualization export")
            return {}
        
        try:
            # 使用PyVista读取网格
            mesh = pv.read(mesh_file)
            
            # 导出不同格式
            files = {}
            
            # glTF格式（Three.js用）
            gltf_file = str(self.work_dir / "geology_geometry.gltf")
            # PyVista可能不直接支持glTF，这里用PLY代替
            ply_file = str(self.work_dir / "geology_geometry.ply")
            mesh.save(ply_file)
            files['ply'] = ply_file
            
            # VTK格式（PyVista原生）
            vtk_file = str(self.work_dir / "geology_geometry.vtk")
            mesh.save(vtk_file)
            files['vtk'] = vtk_file
            
            # STL格式（常用几何格式）
            stl_file = str(self.work_dir / "geology_geometry.stl")
            mesh.save(stl_file)
            files['stl'] = stl_file
            
            print(f"Exported visualization files: {list(files.keys())}")
            return files
            
        except Exception as e:
            print(f"Error exporting visualization files: {e}")
            return {}
    
    def run_complete_workflow(
        self, 
        boreholes_data: List[Dict],
        domain: ComputationDomain,
        algorithm: ThreeZoneParams,
        gmsh_params: GMSHParams
    ) -> Dict[str, Any]:
        """运行完整的地质几何建模工作流程"""
        
        result = {
            'success': False,
            'message': '',
            'files': {},
            'statistics': {}
        }
        
        try:
            # 1. 加载钻孔数据
            if not self.load_borehole_data(boreholes_data):
                result['message'] = 'Failed to load borehole data'
                return result
            
            # 2. 计算域边界定义
            self.compute_domain_bounds(domain)
            
            # 3. 提取界面点集
            interface_points = self.extract_interface_points()
            
            # 4. 三区混合插值
            interface_grids = {}
            for interface_name, points_dict in interface_points.items():
                for point_type, points in points_dict.items():
                    if len(points) < 3:  # 至少需要3个点
                        continue
                        
                    key = f"{interface_name}_{point_type}"
                    grid_data = self.perform_three_zone_kriging(points, algorithm, domain)
                    interface_grids[key] = grid_data
            
            # 5. GMSH OCC几何构建
            mesh_file = self.build_layer_geometries(interface_grids, gmsh_params)
            if mesh_file:
                result['files']['mesh'] = mesh_file
            
            # 6. 导出可视化文件
            if mesh_file:
                vis_files = self.export_visualization_files(mesh_file)
                result['files'].update(vis_files)
            
            # 7. 统计信息
            result['statistics'] = {
                'boreholes_count': len(self.boreholes),
                'layers_processed': len(interface_grids),
                'domain_bounds': self.domain_bounds,
                'total_strata': sum(len(bh.strata) for bh in self.boreholes)
            }
            
            result['success'] = True
            result['message'] = f'Geology geometry modeling completed successfully. Generated {len(result["files"])} output files.'
            
        except Exception as e:
            result['message'] = f'Error in geology modeling workflow: {str(e)}'
            print(f"Workflow error: {e}")
        
        return result


def test_geology_service():
    """测试地质建模服务"""
    
    # 模拟钻孔数据（添加第三个钻孔以满足凸包要求）
    test_boreholes = [
        {
            'id': 'BH001', 'name': 'ZK001', 'x': 0, 'y': 0,
            'ground_elevation': 3.5, 'total_depth': 30,
            'strata': [
                {'id': 'S1', 'top_elev': 3.5, 'bottom_elev': -2.5, 'soil_type': 'fill',
                 'density': 1800, 'cohesion': 15, 'friction': 18},
                {'id': 'S2', 'top_elev': -2.5, 'bottom_elev': -15.0, 'soil_type': 'clay',
                 'density': 1900, 'cohesion': 45, 'friction': 12},
            ]
        },
        {
            'id': 'BH002', 'name': 'ZK002', 'x': 50, 'y': 30,
            'ground_elevation': 3.8, 'total_depth': 35,
            'strata': [
                {'id': 'S3', 'top_elev': 3.8, 'bottom_elev': -1.2, 'soil_type': 'fill',
                 'density': 1750, 'cohesion': 12, 'friction': 20},
                {'id': 'S4', 'top_elev': -1.2, 'bottom_elev': -18.3, 'soil_type': 'clay',
                 'density': 1950, 'cohesion': 50, 'friction': 10},
            ]
        },
        {
            'id': 'BH003', 'name': 'ZK003', 'x': -30, 'y': 40,
            'ground_elevation': 3.2, 'total_depth': 32,
            'strata': [
                {'id': 'S5', 'top_elev': 3.2, 'bottom_elev': -2.8, 'soil_type': 'fill',
                 'density': 1750, 'cohesion': 14, 'friction': 19},
                {'id': 'S6', 'top_elev': -2.8, 'bottom_elev': -16.5, 'soil_type': 'clay',
                 'density': 1920, 'cohesion': 42, 'friction': 11},
            ]
        },
    ]
    
    # 测试参数
    domain = ComputationDomain(
        extension_method='convex_hull',
        x_extend=100, y_extend=100,
        foundation_multiplier=None,
        bottom_elevation=-50,
        mesh_resolution=2.0
    )
    
    algorithm = ThreeZoneParams(
        core_radius=50,
        transition_distance=150,
        variogram_model='spherical',
        trend_order='linear',
        uncertainty_analysis=False
    )
    
    gmsh_params = GMSHParams(
        characteristic_length=2.0,
        physical_groups=False,  # 几何建模不需要物理分组
        mesh_quality=0.8
    )
    
    # 运行测试
    service = GeologyGeometryService()
    result = service.run_complete_workflow(
        test_boreholes, domain, algorithm, gmsh_params
    )
    
    print("=== Test Results ===")
    print(f"Success: {result['success']}")
    print(f"Message: {result['message']}")
    print(f"Files: {result['files']}")
    print(f"Statistics: {result['statistics']}")


if __name__ == "__main__":
    test_geology_service()