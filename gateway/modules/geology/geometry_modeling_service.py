"""
几何建模服务
RBF插值 + GMSH+OCC几何重建 + 物理组定义 + Three.js数据导出
专注于几何建模阶段，不涉及网格划分和后处理
"""

import numpy as np
from scipy.interpolate import Rbf
import gmsh
import logging
from typing import List, Dict, Tuple, Optional, Any
import os
import uuid
import json

logger = logging.getLogger(__name__)

class GeometryModelingService:
    """
    几何建模服务
    
    功能流程：
    1. SciPy RBF大范围外推插值
    2. GMSH+OCC几何建模
    3. 物理组定义（为后续网格划分准备）
    4. Three.js几何数据导出
    """
    
    def __init__(self):
        self.boreholes = []
        self.computation_domain = None
        self.interpolated_data = None
        self.gmsh_model = None
        self.physical_groups = {}
        self.geometry_entities = {}
        
    def load_borehole_data(self, boreholes_data: List[Dict]) -> None:
        """加载钻孔数据"""
        self.boreholes = []
        for bh in boreholes_data:
            self.boreholes.append({
                'id': str(bh.get('id', uuid.uuid4())),
                'x': float(bh['x']),
                'y': float(bh['y']),
                'z': float(bh['z']),
                'soil_type': str(bh.get('soil_type', 'Unknown')),
                'layer_id': int(bh.get('layer_id', 1)),
                'ground_elevation': float(bh.get('ground_elevation', bh['z'] + bh.get('depth', 0))),
                'depth': float(bh.get('depth', abs(bh.get('ground_elevation', 0) - bh['z'])))
            })
        
        logger.info(f"✓ 加载了 {len(self.boreholes)} 个钻孔数据")
        
        # 统计土层信息
        unique_layers = set(bh['layer_id'] for bh in self.boreholes)
        layer_types = {}
        for bh in self.boreholes:
            if bh['layer_id'] not in layer_types:
                layer_types[bh['layer_id']] = bh['soil_type']
        
        logger.info(f"✓ 识别到 {len(unique_layers)} 个土层: {layer_types}")
        
    def set_computation_domain(self, x_min: float = None, x_max: float = None, 
                             y_min: float = None, y_max: float = None, 
                             z_min: float = None, z_max: float = None,
                             buffer_ratio: float = 0.2) -> None:
        """设置计算域（支持大范围外推）"""
        
        if not self.boreholes:
            raise ValueError("需要先加载钻孔数据")
            
        # 计算钻孔范围
        bh_coords = np.array([[bh['x'], bh['y'], bh['z']] for bh in self.boreholes])
        ground_elevations = np.array([bh['ground_elevation'] for bh in self.boreholes])
        
        bh_extent = {
            'x_range': [bh_coords[:, 0].min(), bh_coords[:, 0].max()],
            'y_range': [bh_coords[:, 1].min(), bh_coords[:, 1].max()],
            'z_range': [bh_coords[:, 2].min(), ground_elevations.max()]  # 从钻孔底到地面
        }
        
        # 自动计算计算域范围
        if x_min is None or x_max is None:
            dx = bh_extent['x_range'][1] - bh_extent['x_range'][0]
            x_min = bh_extent['x_range'][0] - dx * buffer_ratio
            x_max = bh_extent['x_range'][1] + dx * buffer_ratio
            
        if y_min is None or y_max is None:
            dy = bh_extent['y_range'][1] - bh_extent['y_range'][0]
            y_min = bh_extent['y_range'][0] - dy * buffer_ratio
            y_max = bh_extent['y_range'][1] + dy * buffer_ratio
            
        if z_min is None or z_max is None:
            z_min = bh_extent['z_range'][0] - 30  # 向下扩展30m
            z_max = bh_extent['z_range'][1] + 10  # 向上扩展10m
        
        self.computation_domain = {
            'x_range': [x_min, x_max],
            'y_range': [y_min, y_max],
            'z_range': [z_min, z_max],
            'volume': (x_max - x_min) * (y_max - y_min) * (z_max - z_min)
        }
        
        # 计算外推信息
        x_extrapolation = max(
            abs(x_min - bh_extent['x_range'][0]),
            abs(x_max - bh_extent['x_range'][1])
        )
        y_extrapolation = max(
            abs(y_min - bh_extent['y_range'][0]),
            abs(y_max - bh_extent['y_range'][1])
        )
        
        logger.info(f"✓ 计算域设置完成:")
        logger.info(f"  计算域: X[{x_min:.1f}, {x_max:.1f}] Y[{y_min:.1f}, {y_max:.1f}] Z[{z_min:.1f}, {z_max:.1f}]")
        logger.info(f"  钻孔分布: X{bh_extent['x_range']} Y{bh_extent['y_range']} Z{bh_extent['z_range']}")
        logger.info(f"  外推距离: X±{x_extrapolation:.1f}m Y±{y_extrapolation:.1f}m")
        logger.info(f"  计算域体积: {self.computation_domain['volume']:.0f} m³")
        
    def rbf_interpolation_with_extrapolation(self, 
                                           grid_resolution: float = 10.0,
                                           rbf_function: str = 'multiquadric',
                                           smooth: float = 0.1,
                                           epsilon: float = None) -> Dict:
        """使用SciPy RBF进行大范围外推插值"""
        
        if len(self.boreholes) < 3:
            raise ValueError("至少需要3个钻孔点进行RBF插值")
            
        if not self.computation_domain:
            raise ValueError("必须先设置计算域范围")
            
        logger.info(f"🔄 开始SciPy RBF插值 (专业外推)")
        logger.info(f"  RBF函数: {rbf_function}, 平滑参数: {smooth}")
        
        # 提取钻孔数据
        coords = np.array([[bh['x'], bh['y']] for bh in self.boreholes])
        elevations = np.array([bh['z'] for bh in self.boreholes])
        layer_ids = np.array([bh['layer_id'] for bh in self.boreholes])
        ground_elevations = np.array([bh['ground_elevation'] for bh in self.boreholes])
        
        # 创建计算域网格
        x_range = self.computation_domain['x_range']
        y_range = self.computation_domain['y_range']
        
        x_coords = np.arange(x_range[0], x_range[1] + grid_resolution, grid_resolution)
        y_coords = np.arange(y_range[0], y_range[1] + grid_resolution, grid_resolution)
        grid_x, grid_y = np.meshgrid(x_coords, y_coords)
        
        # RBF插值 - 钻孔底标高
        rbf_bottom = Rbf(
            coords[:, 0], coords[:, 1], elevations,
            function=rbf_function, 
            smooth=smooth,
            epsilon=epsilon
        )
        grid_bottom = rbf_bottom(grid_x, grid_y)
        
        # RBF插值 - 地面标高
        rbf_top = Rbf(
            coords[:, 0], coords[:, 1], ground_elevations,
            function=rbf_function,
            smooth=smooth,
            epsilon=epsilon
        )
        grid_top = rbf_top(grid_x, grid_y)
        
        # RBF插值 - 土层ID（用于材料分区）
        rbf_layer = Rbf(
            coords[:, 0], coords[:, 1], layer_ids,
            function='linear',  # 土层ID用线性插值更合适
            smooth=0.5
        )
        grid_layer_ids = np.round(rbf_layer(grid_x, grid_y)).astype(int)
        
        # 计算土层厚度
        grid_thickness = grid_top - grid_bottom
        
        self.interpolated_data = {
            'grid_x': grid_x,
            'grid_y': grid_y,
            'grid_bottom': grid_bottom,      # 钻孔底标高
            'grid_top': grid_top,            # 地面标高  
            'grid_thickness': grid_thickness, # 土层厚度
            'grid_layer_ids': grid_layer_ids, # 土层分区
            'resolution': grid_resolution,
            'rbf_function': rbf_function,
            'domain': self.computation_domain
        }
        
        logger.info(f"✓ RBF插值完成 (专业外推):")
        logger.info(f"  网格尺寸: {grid_x.shape[0]} × {grid_x.shape[1]} = {grid_x.size} 点")
        logger.info(f"  底标高范围: [{grid_bottom.min():.2f}, {grid_bottom.max():.2f}] m")
        logger.info(f"  顶标高范围: [{grid_top.min():.2f}, {grid_top.max():.2f}] m")
        logger.info(f"  土层厚度: [{grid_thickness.min():.2f}, {grid_thickness.max():.2f}] m")
        
        return self.interpolated_data
        
    def create_gmsh_geometry_with_occ(self, 
                                     characteristic_length: float = 5.0,
                                     use_bspline_surface: bool = True) -> int:
        """使用GMSH+OCC创建几何模型并定义物理组"""
        
        if not self.interpolated_data:
            raise ValueError("需要先进行RBF插值")
            
        logger.info("🔄 开始GMSH+OCC几何建模")
        
        # 初始化GMSH
        gmsh.initialize()
        gmsh.clear()
        gmsh.model.add("GeologyGeometryModel")
        
        try:
            domain = self.computation_domain
            
            # 1. 创建计算域的基本几何框架
            logger.info("  创建基础几何框架...")
            
            # 底面四个角点
            bottom_points = []
            corners = [
                (domain['x_range'][0], domain['y_range'][0], domain['z_range'][0]),
                (domain['x_range'][1], domain['y_range'][0], domain['z_range'][0]),
                (domain['x_range'][1], domain['y_range'][1], domain['z_range'][0]),
                (domain['x_range'][0], domain['y_range'][1], domain['z_range'][0])
            ]
            
            for i, (x, y, z) in enumerate(corners):
                point_tag = gmsh.model.geo.addPoint(x, y, z, characteristic_length)
                bottom_points.append(point_tag)
            
            # 创建底面
            bottom_lines = []
            for i in range(4):
                line = gmsh.model.geo.addLine(bottom_points[i], bottom_points[(i+1)%4])
                bottom_lines.append(line)
            
            bottom_loop = gmsh.model.geo.addCurveLoop(bottom_lines)
            bottom_surface = gmsh.model.geo.addPlaneSurface([bottom_loop])
            
            # 2. 创建复杂地表面（基于RBF插值）
            logger.info("  创建RBF插值地表面...")
            top_surface = self._create_interpolated_surface(characteristic_length, use_bspline_surface)
            
            # 3. 创建侧面连接
            logger.info("  创建侧面几何...")
            side_surfaces = self._create_side_surfaces(bottom_points, characteristic_length)
            
            # 4. 创建封闭几何体
            logger.info("  创建封闭几何体...")
            if top_surface and side_surfaces:
                try:
                    all_surfaces = [bottom_surface, top_surface] + side_surfaces
                    surface_loop = gmsh.model.geo.addSurfaceLoop(all_surfaces)
                    volume = gmsh.model.geo.addVolume([surface_loop])
                    
                    self.geometry_entities = {
                        'volume': volume,
                        'bottom_surface': bottom_surface,
                        'top_surface': top_surface,
                        'side_surfaces': side_surfaces,
                        'bottom_points': bottom_points
                    }
                except Exception as e:
                    logger.warning(f"创建封闭体失败，使用简化几何: {e}")
                    volume = self._create_simplified_volume(bottom_surface, characteristic_length)
            else:
                volume = self._create_simplified_volume(bottom_surface, characteristic_length)
            
            # 同步几何
            gmsh.model.geo.synchronize()
            
            # 5. 定义物理组（关键！）
            logger.info("  定义物理组...")
            self._define_physical_groups_for_geometry()
            
            # 设置几何建模参数（兼容性处理）
            try:
                gmsh.option.setNumber("Geometry.Tolerance", 1e-6)
                logger.info("  ✓ 设置几何容差")
            except Exception as e:
                logger.warning(f"无法设置Geometry.Tolerance选项: {e}")
                
            # 跳过可能不兼容的OCC选项
            # try:
            #     gmsh.option.setNumber("Geometry.OCCTargetUnit", 1.0)  # 米为单位
            # except Exception as e:
            #     logger.warning(f"无法设置Geometry.OCCTargetUnit选项: {e}")
            
            logger.info(f"✓ GMSH+OCC几何建模完成")
            logger.info(f"  特征长度: {characteristic_length}m")
            logger.info(f"  物理组数量: {len(self.physical_groups)}")
            
            self.gmsh_model = gmsh.model
            return volume
            
        except Exception as e:
            logger.error(f"❌ GMSH+OCC几何创建失败: {e}")
            gmsh.finalize()
            raise
            
    def _create_interpolated_surface(self, characteristic_length: float, use_bspline: bool) -> int:
        """创建基于RBF插值的复杂地表面"""
        
        grid_x = self.interpolated_data['grid_x']
        grid_y = self.interpolated_data['grid_y']
        grid_top = self.interpolated_data['grid_top']
        
        if use_bspline:
            try:
                # 使用GMSH的B-Spline功能创建复杂曲面
                # 这里简化处理，使用角点创建平面，实际可以用更多控制点
                domain = self.computation_domain
                avg_elevation = float(np.mean(grid_top))
                
                top_points = []
                top_corners = [
                    (domain['x_range'][0], domain['y_range'][0], avg_elevation),
                    (domain['x_range'][1], domain['y_range'][0], avg_elevation),
                    (domain['x_range'][1], domain['y_range'][1], avg_elevation),
                    (domain['x_range'][0], domain['y_range'][1], avg_elevation)
                ]
                
                for x, y, z in top_corners:
                    point_tag = gmsh.model.geo.addPoint(x, y, z, characteristic_length)
                    top_points.append(point_tag)
                
                # 创建顶面
                top_lines = []
                for i in range(4):
                    line = gmsh.model.geo.addLine(top_points[i], top_points[(i+1)%4])
                    top_lines.append(line)
                
                top_loop = gmsh.model.geo.addCurveLoop(top_lines)
                top_surface = gmsh.model.geo.addPlaneSurface([top_loop])
                
                return top_surface
                
            except Exception as e:
                logger.warning(f"B-Spline曲面创建失败，使用平面: {e}")
                return None
        
        return None
        
    def _create_side_surfaces(self, bottom_points: List[int], characteristic_length: float) -> List[int]:
        """创建侧面"""
        
        domain = self.computation_domain
        avg_top_elevation = float(np.mean(self.interpolated_data['grid_top']))
        
        # 创建顶面对应点
        top_points = []
        for i in range(4):
            x, y = [(domain['x_range'][0], domain['y_range'][0]),
                   (domain['x_range'][1], domain['y_range'][0]),
                   (domain['x_range'][1], domain['y_range'][1]),
                   (domain['x_range'][0], domain['y_range'][1])][i]
            
            point_tag = gmsh.model.geo.addPoint(x, y, avg_top_elevation, characteristic_length)
            top_points.append(point_tag)
        
        # 创建侧面
        side_surfaces = []
        for i in range(4):
            # 创建侧面的四条边
            bottom_line = gmsh.model.geo.addLine(bottom_points[i], bottom_points[(i+1)%4])
            top_line = gmsh.model.geo.addLine(top_points[i], top_points[(i+1)%4])
            left_line = gmsh.model.geo.addLine(bottom_points[i], top_points[i])
            right_line = gmsh.model.geo.addLine(bottom_points[(i+1)%4], top_points[(i+1)%4])
            
            # 创建侧面
            side_loop = gmsh.model.geo.addCurveLoop([bottom_line, right_line, -top_line, -left_line])
            side_surface = gmsh.model.geo.addPlaneSurface([side_loop])
            side_surfaces.append(side_surface)
        
        return side_surfaces
        
    def _create_simplified_volume(self, bottom_surface: int, characteristic_length: float) -> int:
        """创建简化的几何体"""
        
        domain = self.computation_domain
        dx = domain['x_range'][1] - domain['x_range'][0]
        dy = domain['y_range'][1] - domain['y_range'][0]
        dz = domain['z_range'][1] - domain['z_range'][0]
        
        # 使用GMSH的盒子几何
        box_tag = gmsh.model.occ.addBox(
            domain['x_range'][0], domain['y_range'][0], domain['z_range'][0],
            dx, dy, dz
        )
        
        gmsh.model.occ.synchronize()
        return box_tag
        
    def _define_physical_groups_for_geometry(self):
        """为几何模型定义物理组（关键功能）"""
        
        logger.info("🔄 定义几何物理组")
        
        entities = self.geometry_entities
        
        # 1. 体物理组 - 按土层分区  
        if 'volume' in entities:
            volume = entities['volume']
            
            # 为每个土层创建物理组
            unique_layers = set(bh['layer_id'] for bh in self.boreholes)
            
            for layer_id in unique_layers:
                soil_type = next(bh['soil_type'] for bh in self.boreholes if bh['layer_id'] == layer_id)
                
                # 几何阶段：整个体作为一个物理组（后续网格阶段再细分）
                physical_tag = gmsh.model.addPhysicalGroup(3, [volume], tag=100 + layer_id)
                physical_name = f"SoilVolume_{layer_id}_{soil_type}"
                gmsh.model.setPhysicalName(3, physical_tag, physical_name)
                
                self.physical_groups[physical_name] = {
                    'dimension': 3,
                    'tag': physical_tag,
                    'entities': [volume],
                    'type': 'soil_volume',
                    'layer_id': layer_id,
                    'soil_type': soil_type,
                    'stage': 'geometry'
                }
                
                logger.info(f"  ✓ 土层几何组: {physical_name} (ID: {physical_tag})")
        
        # 2. 边界面物理组
        boundary_info = [
            ('bottom_surface', 'BottomBoundary', 'fixed', 201),
            ('top_surface', 'TopSurface', 'free_surface', 202)
        ]
        
        for entity_key, name, boundary_type, tag in boundary_info:
            if entity_key in entities:
                surface = entities[entity_key]
                physical_tag = gmsh.model.addPhysicalGroup(2, [surface], tag=tag)
                gmsh.model.setPhysicalName(2, physical_tag, name)
                
                self.physical_groups[name] = {
                    'dimension': 2, 
                    'tag': physical_tag, 
                    'entities': [surface],
                    'type': 'boundary', 
                    'boundary_type': boundary_type,
                    'stage': 'geometry'
                }
                
                logger.info(f"  ✓ 边界几何组: {name} (ID: {physical_tag})")
        
        # 侧面边界
        if 'side_surfaces' in entities:
            side_names = ["LeftBoundary", "RightBoundary", "FrontBoundary", "BackBoundary"]
            
            for i, side_surf in enumerate(entities['side_surfaces']):
                side_tag = gmsh.model.addPhysicalGroup(2, [side_surf], tag=210 + i)
                side_name = side_names[i]
                gmsh.model.setPhysicalName(2, side_tag, side_name)
                
                self.physical_groups[side_name] = {
                    'dimension': 2, 
                    'tag': side_tag, 
                    'entities': [side_surf],
                    'type': 'boundary', 
                    'boundary_type': 'symmetric',
                    'stage': 'geometry'
                }
        
        # 3. 钻孔参考点（用于验证）
        borehole_points = []
        for i, bh in enumerate(self.boreholes):
            try:
                point_tag = gmsh.model.geo.addPoint(bh['x'], bh['y'], bh['z'], 1.0)
                borehole_points.append(point_tag)
            except:
                continue  # 点可能已存在
        
        if borehole_points:
            gmsh.model.geo.synchronize()
            borehole_tag = gmsh.model.addPhysicalGroup(0, borehole_points, tag=301)
            gmsh.model.setPhysicalName(0, borehole_tag, "BoreholePoints")
            self.physical_groups["BoreholePoints"] = {
                'dimension': 0, 
                'tag': borehole_tag, 
                'entities': borehole_points,
                'type': 'reference_points',
                'stage': 'geometry'
            }
        
        logger.info(f"✓ 几何物理组定义完成，共 {len(self.physical_groups)} 个组")
        
    def export_geometry_to_threejs(self) -> Dict[str, Any]:
        """导出几何数据给Three.js（专注几何，不涉及网格）"""
        
        if not self.interpolated_data:
            raise ValueError("需要先进行RBF插值")
            
        logger.info("🔄 导出几何数据给Three.js")
        
        # 基于RBF插值结果生成几何表面数据
        grid_x = self.interpolated_data['grid_x']
        grid_y = self.interpolated_data['grid_y']
        grid_top = self.interpolated_data['grid_top']
        grid_bottom = self.interpolated_data['grid_bottom']
        grid_layers = self.interpolated_data['grid_layer_ids']
        
        rows, cols = grid_x.shape
        
        # 生成地表面顶点
        surface_vertices = []
        surface_colors = []
        surface_layer_attributes = []
        
        # 土层颜色映射
        layer_colors = {
            1: [0.8, 0.4, 0.2],  # 棕色 - 粘土
            2: [0.9, 0.8, 0.4],  # 黄色 - 砂土  
            3: [0.6, 0.6, 0.8],  # 蓝灰 - 粉土
            4: [0.7, 0.9, 0.5],  # 绿色 - 其他
        }
        
        # 地表面数据
        for i in range(rows):
            for j in range(cols):
                surface_vertices.extend([
                    float(grid_x[i, j]),
                    float(grid_y[i, j]),
                    float(grid_top[i, j])  # 地表标高
                ])
                
                layer_id = int(grid_layers[i, j])
                color = layer_colors.get(layer_id, [0.5, 0.5, 0.5])
                surface_colors.extend(color)
                surface_layer_attributes.append(layer_id)
        
        # 生成地表面三角形索引
        surface_indices = []
        for i in range(rows - 1):
            for j in range(cols - 1):
                bottom_left = i * cols + j
                bottom_right = i * cols + (j + 1)
                top_left = (i + 1) * cols + j
                top_right = (i + 1) * cols + (j + 1)
                
                surface_indices.extend([bottom_left, bottom_right, top_left])
                surface_indices.extend([bottom_right, top_right, top_left])
        
        # 钻孔几何数据
        borehole_lines = []  # 钻孔柱状图
        borehole_points = []
        borehole_colors = []
        
        for bh in self.boreholes:
            # 地面点（绿色）
            borehole_points.extend([bh['x'], bh['y'], bh['ground_elevation']])
            borehole_colors.extend([0.0, 1.0, 0.0])
            
            # 钻孔底点（红色）
            borehole_points.extend([bh['x'], bh['y'], bh['z']])
            borehole_colors.extend([1.0, 0.0, 0.0])
            
            # 钻孔连线（表示钻孔柱）
            borehole_lines.extend([
                bh['x'], bh['y'], bh['ground_elevation'],
                bh['x'], bh['y'], bh['z']
            ])
        
        # 计算域边界框（用于参考）
        domain = self.computation_domain
        domain_box = {
            'min': [domain['x_range'][0], domain['y_range'][0], domain['z_range'][0]],
            'max': [domain['x_range'][1], domain['y_range'][1], domain['z_range'][1]]
        }
        
        return {
            "surface_vertices": surface_vertices,
            "surface_indices": surface_indices,
            "surface_colors": surface_colors,
            "surface_layer_attributes": surface_layer_attributes,
            "borehole_points": borehole_points,
            "borehole_colors": borehole_colors,
            "borehole_lines": borehole_lines,
            "domain_box": domain_box,
            "physical_groups": self.physical_groups,
            "metadata": {
                "modeling_stage": "geometry",
                "modeling_method": "RBF_GMSH_OCC_Geometry",
                "grid_resolution": self.interpolated_data['resolution'],
                "computation_domain": self.computation_domain,
                "n_surface_vertices": len(surface_vertices) // 3,
                "n_surface_triangles": len(surface_indices) // 3,
                "n_boreholes": len(self.boreholes),
                "n_physical_groups": len(self.physical_groups),
                "interpolation_method": self.interpolated_data['rbf_function'],
                "has_gmsh_geometry": self.gmsh_model is not None
            }
        }
        
    def export_gmsh_geometry_files(self, output_dir: str = "output/geometry") -> Dict[str, str]:
        """导出GMSH几何文件"""
        
        if not self.gmsh_model:
            raise ValueError("需要先创建GMSH几何模型")
            
        os.makedirs(output_dir, exist_ok=True)
        
        exported_files = {}
        timestamp = uuid.uuid4().hex[:8]
        
        try:
            # 导出GMSH几何文件
            geo_filename = f"geology_geometry_{timestamp}.geo_unrolled"
            geo_path = os.path.join(output_dir, geo_filename)
            gmsh.write(geo_path)
            exported_files['geometry'] = geo_path
            
            # 导出STEP文件（如果支持）
            try:
                step_filename = f"geology_geometry_{timestamp}.step"
                step_path = os.path.join(output_dir, step_filename)
                gmsh.write(step_path)
                exported_files['step'] = step_path
            except:
                logger.warning("STEP文件导出失败")
            
            logger.info(f"✓ GMSH几何文件导出完成: {len(exported_files)} 个文件")
            
        except Exception as e:
            logger.error(f"❌ 几何文件导出失败: {e}")
        finally:
            gmsh.finalize()
            
        return exported_files
        
    def get_geometry_statistics(self) -> Dict:
        """获取几何建模统计信息"""
        
        stats = {
            "service_type": "Geometry_Modeling_RBF_GMSH_OCC",
            "stage": "geometry",
            "n_boreholes": len(self.boreholes),
            "computation_domain": self.computation_domain,
            "interpolation_completed": self.interpolated_data is not None,
            "geometry_created": self.gmsh_model is not None,
            "n_physical_groups": len(self.physical_groups)
        }
        
        if self.boreholes:
            coords = np.array([[bh['x'], bh['y'], bh['z']] for bh in self.boreholes])
            ground_elevations = np.array([bh['ground_elevation'] for bh in self.boreholes])
            unique_layers = set(bh['layer_id'] for bh in self.boreholes)
            
            stats.update({
                "borehole_extent": {
                    "x_range": [float(coords[:, 0].min()), float(coords[:, 0].max())],
                    "y_range": [float(coords[:, 1].min()), float(coords[:, 1].max())],
                    "z_range": [float(coords[:, 2].min()), float(ground_elevations.max())]
                },
                "soil_layers": len(unique_layers),
                "layer_info": {str(bh['layer_id']): bh['soil_type'] 
                              for bh in self.boreholes if bh['layer_id'] in unique_layers}
            })
        
        if self.interpolated_data:
            stats["interpolation_info"] = {
                "grid_size": f"{self.interpolated_data['grid_x'].shape[0]} × {self.interpolated_data['grid_x'].shape[1]}",
                "resolution": self.interpolated_data['resolution'],
                "rbf_function": self.interpolated_data['rbf_function'],
                "extrapolation_capable": True
            }
        
        if self.physical_groups:
            stats["physical_groups_info"] = {
                name: {
                    'type': group['type'],
                    'dimension': group['dimension'],
                    'tag': group['tag'],
                    'stage': group.get('stage', 'geometry')
                }
                for name, group in self.physical_groups.items()
            }
        
        return stats

# 全局服务实例
geometry_modeling_service = GeometryModelingService()

def get_geometry_modeling_service() -> GeometryModelingService:
    """获取几何建模服务实例"""
    return geometry_modeling_service