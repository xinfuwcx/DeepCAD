"""
完整地质建模服务
RBF插值 + GMSH几何建模 + 物理组定义 + PyVista可视化 + Three.js渲染
"""

import numpy as np
from scipy.interpolate import Rbf
import gmsh
import pyvista as pv
import logging
from typing import List, Dict, Tuple, Optional, Any
import os
import uuid
import json

logger = logging.getLogger(__name__)

class CompleteGeologyService:
    """
    完整地质建模服务
    
    功能流程：
    1. SciPy RBF大范围外推插值
    2. GMSH+OCC几何建模
    3. 物理组定义（土层、边界、接触面）
    4. PyVista网格可视化
    5. Three.js数据导出
    """
    
    def __init__(self):
        self.boreholes = []
        self.computation_domain = None
        self.interpolated_data = None
        self.gmsh_model = None
        self.physical_groups = {}
        self.mesh_data = None
        
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
        
    def set_computation_domain(self, x_min: float, x_max: float, 
                             y_min: float, y_max: float, 
                             z_min: float, z_max: float,
                             buffer_ratio: float = 0.1) -> None:
        """设置计算域（支持大范围外推）"""
        
        # 计算钻孔范围
        if self.boreholes:
            bh_coords = np.array([[bh['x'], bh['y'], bh['z']] for bh in self.boreholes])
            bh_extent = {
                'x_range': [bh_coords[:, 0].min(), bh_coords[:, 0].max()],
                'y_range': [bh_coords[:, 1].min(), bh_coords[:, 1].max()],
                'z_range': [bh_coords[:, 2].min(), bh_coords[:, 2].max()]
            }
            
            # 如果没有指定计算域，自动扩展钻孔范围
            if x_min is None:
                dx = bh_extent['x_range'][1] - bh_extent['x_range'][0]
                x_min = bh_extent['x_range'][0] - dx * buffer_ratio
                x_max = bh_extent['x_range'][1] + dx * buffer_ratio
                
            if y_min is None:
                dy = bh_extent['y_range'][1] - bh_extent['y_range'][0]
                y_min = bh_extent['y_range'][0] - dy * buffer_ratio
                y_max = bh_extent['y_range'][1] + dy * buffer_ratio
                
            if z_min is None:
                z_min = bh_extent['z_range'][0] - 20  # 向下扩展20m
                z_max = bh_extent['z_range'][1] + 5   # 向上扩展5m
        
        self.computation_domain = {
            'x_range': [x_min, x_max],
            'y_range': [y_min, y_max],
            'z_range': [z_min, z_max],
            'volume': (x_max - x_min) * (y_max - y_min) * (z_max - z_min)
        }
        
        # 计算外推信息
        if self.boreholes:
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
            
        logger.info(f"🔄 开始SciPy RBF插值")
        logger.info(f"  RBF函数: {rbf_function}, 平滑参数: {smooth}")
        
        # 提取钻孔数据
        coords = np.array([[bh['x'], bh['y']] for bh in self.boreholes])
        elevations = np.array([bh['z'] for bh in self.boreholes])
        layer_ids = np.array([bh['layer_id'] for bh in self.boreholes])
        ground_elevations = np.array([bh['ground_elevation'] for bh in self.boreholes])
        
        # 创建计算域网格
        x_range = self.computation_domain['x_range']
        y_range = self.computation_domain['y_range']
        
        x_coords = np.arange(x_range[0], x_range[1], grid_resolution)
        y_coords = np.arange(y_range[0], y_range[1], grid_resolution)
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
        
        logger.info(f"✓ RBF插值完成:")
        logger.info(f"  网格尺寸: {grid_x.shape[0]} × {grid_x.shape[1]} = {grid_x.size} 点")
        logger.info(f"  底标高范围: [{grid_bottom.min():.2f}, {grid_bottom.max():.2f}] m")
        logger.info(f"  顶标高范围: [{grid_top.min():.2f}, {grid_top.max():.2f}] m")
        logger.info(f"  土层厚度: [{grid_thickness.min():.2f}, {grid_thickness.max():.2f}] m")
        
        return self.interpolated_data
        
    def create_gmsh_geometry_with_physical_groups(self, 
                                                characteristic_length: float = 5.0,
                                                create_volume: bool = True) -> int:
        """使用GMSH创建几何模型并定义物理组"""
        
        if not self.interpolated_data:
            raise ValueError("需要先进行RBF插值")
            
        logger.info("🔄 开始GMSH几何建模")
        
        # 初始化GMSH
        gmsh.initialize()
        gmsh.clear()
        gmsh.model.add("GeologyModel")
        
        try:
            # 获取插值数据
            grid_x = self.interpolated_data['grid_x']
            grid_y = self.interpolated_data['grid_y']
            grid_bottom = self.interpolated_data['grid_bottom']
            grid_top = self.interpolated_data['grid_top']
            grid_layers = self.interpolated_data['grid_layer_ids']
            
            domain = self.computation_domain
            
            # 创建计算域的六个面
            # 1. 底面 (z = domain['z_range'][0])
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
            
            # 创建底面的边和面
            bottom_lines = []
            for i in range(4):
                line = gmsh.model.geo.addLine(bottom_points[i], bottom_points[(i+1)%4])
                bottom_lines.append(line)
            
            bottom_loop = gmsh.model.geo.addCurveLoop(bottom_lines)
            bottom_surface = gmsh.model.geo.addPlaneSurface([bottom_loop])
            
            # 2. 地面（基于RBF插值的复杂曲面）
            # 简化处理：创建平均高程的平面作为顶面
            avg_top_elevation = float(np.mean(grid_top))
            
            top_points = []
            for i, (x, y, _) in enumerate(corners):
                point_tag = gmsh.model.geo.addPoint(x, y, avg_top_elevation, characteristic_length)
                top_points.append(point_tag)
            
            # 创建顶面
            top_lines = []
            for i in range(4):
                line = gmsh.model.geo.addLine(top_points[i], top_points[(i+1)%4])
                top_lines.append(line)
            
            top_loop = gmsh.model.geo.addCurveLoop(top_lines)
            top_surface = gmsh.model.geo.addPlaneSurface([top_loop])
            
            # 3. 创建侧面
            side_surfaces = []
            for i in range(4):
                # 连接底面和顶面对应的点
                vertical_line = gmsh.model.geo.addLine(bottom_points[i], top_points[i])
                
                # 创建侧面（四边形）
                side_lines = [
                    bottom_lines[i],
                    gmsh.model.geo.addLine(bottom_points[(i+1)%4], top_points[(i+1)%4]),
                    -top_lines[i],
                    -vertical_line
                ]
                
                side_loop = gmsh.model.geo.addCurveLoop(side_lines)
                side_surface = gmsh.model.geo.addPlaneSurface([side_loop])
                side_surfaces.append(side_surface)
            
            # 4. 创建封闭的几何体
            if create_volume:
                all_surfaces = [bottom_surface, top_surface] + side_surfaces
                surface_loop = gmsh.model.geo.addSurfaceLoop(all_surfaces)
                volume = gmsh.model.geo.addVolume([surface_loop])
            
            # 同步几何
            gmsh.model.geo.synchronize()
            
            # 5. 定义物理组
            self._define_physical_groups(
                bottom_surface, top_surface, side_surfaces, 
                volume if create_volume else None
            )
            
            # 设置网格参数
            gmsh.option.setNumber("Mesh.CharacteristicLengthMin", characteristic_length * 0.5)
            gmsh.option.setNumber("Mesh.CharacteristicLengthMax", characteristic_length * 2.0)
            
            logger.info(f"✓ GMSH几何模型创建完成")
            logger.info(f"  特征长度: {characteristic_length}m")
            logger.info(f"  物理组数量: {len(self.physical_groups)}")
            
            self.gmsh_model = gmsh.model
            return volume if create_volume else top_surface
            
        except Exception as e:
            logger.error(f"❌ GMSH几何创建失败: {e}")
            gmsh.finalize()
            raise
            
    def _define_physical_groups(self, bottom_surface, top_surface, side_surfaces, volume):
        """定义物理组（关键功能）"""
        
        logger.info("🔄 定义物理组")
        
        # 1. 体物理组 - 按土层分区
        if volume:
            # 主土体（将来可以细分为多个土层）
            unique_layers = set(bh['layer_id'] for bh in self.boreholes)
            
            for layer_id in unique_layers:
                # 找到该土层的土质类型
                soil_type = next(bh['soil_type'] for bh in self.boreholes if bh['layer_id'] == layer_id)
                
                # 为每个土层创建物理组
                physical_tag = gmsh.model.addPhysicalGroup(3, [volume], tag=100 + layer_id)
                physical_name = f"SoilLayer_{layer_id}_{soil_type}"
                gmsh.model.setPhysicalName(3, physical_tag, physical_name)
                
                self.physical_groups[physical_name] = {
                    'dimension': 3,
                    'tag': physical_tag,
                    'entities': [volume],
                    'type': 'soil_volume',
                    'layer_id': layer_id,
                    'soil_type': soil_type
                }
                
                logger.info(f"  ✓ 土层物理组: {physical_name} (ID: {physical_tag})")
        
        # 2. 边界面物理组
        # 底面 - 固定边界
        bottom_tag = gmsh.model.addPhysicalGroup(2, [bottom_surface], tag=201)
        gmsh.model.setPhysicalName(2, bottom_tag, "BottomBoundary")
        self.physical_groups["BottomBoundary"] = {
            'dimension': 2, 'tag': bottom_tag, 'entities': [bottom_surface],
            'type': 'boundary', 'boundary_type': 'fixed'
        }
        
        # 顶面 - 自由表面/荷载面
        top_tag = gmsh.model.addPhysicalGroup(2, [top_surface], tag=202)
        gmsh.model.setPhysicalName(2, top_tag, "TopSurface")
        self.physical_groups["TopSurface"] = {
            'dimension': 2, 'tag': top_tag, 'entities': [top_surface],
            'type': 'boundary', 'boundary_type': 'free_surface'
        }
        
        # 侧面 - 对称或约束边界
        for i, side_surf in enumerate(side_surfaces):
            side_names = ["LeftBoundary", "RightBoundary", "FrontBoundary", "BackBoundary"]
            side_types = ["symmetric", "symmetric", "symmetric", "symmetric"]
            
            side_tag = gmsh.model.addPhysicalGroup(2, [side_surf], tag=210 + i)
            side_name = side_names[i]
            gmsh.model.setPhysicalName(2, side_tag, side_name)
            
            self.physical_groups[side_name] = {
                'dimension': 2, 'tag': side_tag, 'entities': [side_surf],
                'type': 'boundary', 'boundary_type': side_types[i]
            }
        
        # 3. 钻孔点物理组（用于验证和可视化）
        borehole_points = []
        for i, bh in enumerate(self.boreholes):
            point_tag = gmsh.model.geo.addPoint(bh['x'], bh['y'], bh['z'], 1.0)
            borehole_points.append(point_tag)
        
        if borehole_points:
            gmsh.model.geo.synchronize()
            borehole_tag = gmsh.model.addPhysicalGroup(0, borehole_points, tag=301)
            gmsh.model.setPhysicalName(0, borehole_tag, "BoreholePoints")
            self.physical_groups["BoreholePoints"] = {
                'dimension': 0, 'tag': borehole_tag, 'entities': borehole_points,
                'type': 'measurement_points'
            }
        
        logger.info(f"✓ 物理组定义完成，共 {len(self.physical_groups)} 个组")
        
    def generate_mesh(self, dimension: int = 3, algorithm: int = 6) -> pv.UnstructuredGrid:
        """生成网格并转换为PyVista格式"""
        
        if not self.gmsh_model:
            raise ValueError("需要先创建GMSH几何模型")
            
        logger.info("🔄 开始网格生成")
        
        try:
            # 设置网格算法
            gmsh.option.setNumber("Mesh.Algorithm", algorithm)
            gmsh.option.setNumber("Mesh.Algorithm3D", 4)  # Delaunay 3D
            
            # 生成网格
            gmsh.model.mesh.generate(dimension)
            
            # 获取网格信息
            node_tags, node_coords, _ = gmsh.model.mesh.getNodes()
            node_coords = node_coords.reshape(-1, 3)
            
            # 获取单元信息
            element_types, element_tags, element_node_tags = gmsh.model.mesh.getElements(dimension)
            
            logger.info(f"✓ 网格生成完成:")
            logger.info(f"  节点数量: {len(node_tags)}")
            logger.info(f"  单元类型数: {len(element_types)}")
            
            # 转换为PyVista格式
            pyvista_mesh = self._convert_to_pyvista(
                node_tags, node_coords, element_types, element_tags, element_node_tags
            )
            
            self.mesh_data = pyvista_mesh
            return pyvista_mesh
            
        except Exception as e:
            logger.error(f"❌ 网格生成失败: {e}")
            raise
        finally:
            gmsh.finalize()
            
    def _convert_to_pyvista(self, node_tags, node_coords, element_types, element_tags, element_node_tags):
        """转换GMSH网格为PyVista格式"""
        
        # 创建点云
        points = node_coords
        
        # 处理单元
        cells = []
        cell_types = []
        
        for i, elem_type in enumerate(element_types):
            elem_tags = element_tags[i]
            elem_nodes = element_node_tags[i]
            
            # GMSH到VTK单元类型映射
            gmsh_to_vtk = {
                1: pv.CellType.LINE,         # 线单元
                2: pv.CellType.TRIANGLE,     # 三角形
                4: pv.CellType.TETRA,        # 四面体
                5: pv.CellType.HEXAHEDRON,   # 六面体
                9: pv.CellType.QUAD          # 四边形
            }
            
            if elem_type in gmsh_to_vtk:
                vtk_type = gmsh_to_vtk[elem_type]
                nodes_per_elem = len(elem_nodes) // len(elem_tags)
                
                for j in range(len(elem_tags)):
                    start_idx = j * nodes_per_elem
                    end_idx = (j + 1) * nodes_per_elem
                    cell_nodes = elem_nodes[start_idx:end_idx] - 1  # GMSH从1开始，VTK从0开始
                    
                    cells.extend([nodes_per_elem] + cell_nodes.tolist())
                    cell_types.append(vtk_type)
        
        # 创建PyVista网格
        if cells:
            mesh = pv.UnstructuredGrid(cells, cell_types, points)
            
            # 添加物理组信息作为数据
            self._add_physical_group_data(mesh)
            
            return mesh
        else:
            # 如果没有体单元，返回点云
            return pv.PolyData(points)
            
    def _add_physical_group_data(self, mesh):
        """添加物理组信息到网格数据"""
        
        # 添加材料ID
        n_cells = mesh.n_cells
        material_ids = np.ones(n_cells, dtype=int)  # 默认材料ID为1
        
        # 根据位置分配材料ID（简化处理）
        if self.interpolated_data:
            cell_centers = mesh.cell_centers()
            
            for i, center in enumerate(cell_centers.points):
                # 根据位置查找最近的插值点，获取土层ID
                # 这里简化处理，实际应该更精确
                x, y, z = center
                
                # 找最近的钻孔
                min_dist = float('inf')
                nearest_layer = 1
                
                for bh in self.boreholes:
                    dist = np.sqrt((x - bh['x'])**2 + (y - bh['y'])**2)
                    if dist < min_dist:
                        min_dist = dist
                        nearest_layer = bh['layer_id']
                
                material_ids[i] = nearest_layer
        
        mesh.cell_data['MaterialID'] = material_ids
        mesh.cell_data['PhysicalGroup'] = material_ids + 100  # 对应物理组标签
        
    def export_to_threejs_data(self) -> Dict[str, Any]:
        """导出Three.js渲染数据"""
        
        if not self.mesh_data:
            # 如果没有网格，使用插值数据
            return self._export_interpolation_data()
        
        # 导出网格数据
        return self._export_mesh_data()
        
    def _export_interpolation_data(self) -> Dict[str, Any]:
        """导出插值数据给Three.js"""
        
        if not self.interpolated_data:
            raise ValueError("没有可用的插值数据")
            
        grid_x = self.interpolated_data['grid_x']
        grid_y = self.interpolated_data['grid_y']
        grid_top = self.interpolated_data['grid_top']
        grid_layers = self.interpolated_data['grid_layer_ids']
        
        rows, cols = grid_x.shape
        
        # 生成顶点（地表面）
        vertices = []
        colors = []
        layer_attributes = []
        
        # 土层颜色映射
        layer_colors = {
            1: [0.8, 0.4, 0.2],  # 棕色 - 粘土
            2: [0.9, 0.8, 0.4],  # 黄色 - 砂土  
            3: [0.6, 0.6, 0.8],  # 蓝灰 - 粉土
            4: [0.7, 0.9, 0.5],  # 绿色 - 其他
        }
        
        for i in range(rows):
            for j in range(cols):
                vertices.extend([
                    float(grid_x[i, j]),
                    float(grid_y[i, j]),
                    float(grid_top[i, j])  # 使用地表标高
                ])
                
                layer_id = int(grid_layers[i, j])
                color = layer_colors.get(layer_id, [0.5, 0.5, 0.5])
                colors.extend(color)
                layer_attributes.append(layer_id)
        
        # 生成三角形索引
        indices = []
        for i in range(rows - 1):
            for j in range(cols - 1):
                bottom_left = i * cols + j
                bottom_right = i * cols + (j + 1)
                top_left = (i + 1) * cols + j
                top_right = (i + 1) * cols + (j + 1)
                
                indices.extend([bottom_left, bottom_right, top_left])
                indices.extend([bottom_right, top_right, top_left])
        
        # 钻孔点数据
        borehole_points = []
        borehole_colors = []
        
        for bh in self.boreholes:
            # 地面点
            borehole_points.extend([bh['x'], bh['y'], bh['ground_elevation']])
            borehole_colors.extend([0.0, 1.0, 0.0])  # 绿色地面点
            
            # 钻孔底点
            borehole_points.extend([bh['x'], bh['y'], bh['z']])
            borehole_colors.extend([1.0, 0.0, 0.0])  # 红色钻孔底
        
        return {
            "vertices": vertices,
            "indices": indices,
            "colors": colors,
            "layer_attributes": layer_attributes,
            "borehole_points": borehole_points,
            "borehole_colors": borehole_colors,
            "physical_groups": self.physical_groups,
            "metadata": {
                "modeling_method": "RBF_GMSH_Complete",
                "grid_resolution": self.interpolated_data['resolution'],
                "computation_domain": self.computation_domain,
                "n_vertices": len(vertices) // 3,
                "n_triangles": len(indices) // 3,
                "n_boreholes": len(self.boreholes),
                "n_physical_groups": len(self.physical_groups),
                "has_mesh": self.mesh_data is not None
            }
        }
        
    def _export_mesh_data(self) -> Dict[str, Any]:
        """导出网格数据给Three.js"""
        
        mesh = self.mesh_data
        
        # 提取表面网格用于显示
        surface_mesh = mesh.extract_surface()
        
        vertices = surface_mesh.points.flatten().tolist()
        
        # 获取面数据
        faces = surface_mesh.faces
        indices = []
        
        i = 0
        while i < len(faces):
            n_points = faces[i]
            if n_points == 3:  # 三角形
                indices.extend([faces[i+1], faces[i+2], faces[i+3]])
            elif n_points == 4:  # 四边形，分解为两个三角形
                indices.extend([faces[i+1], faces[i+2], faces[i+3]])
                indices.extend([faces[i+1], faces[i+3], faces[i+4]])
            i += n_points + 1
        
        # 材料颜色
        colors = []
        if 'MaterialID' in surface_mesh.cell_data:
            material_ids = surface_mesh.cell_data['MaterialID']
            layer_colors = {
                1: [0.8, 0.4, 0.2],  # 棕色
                2: [0.9, 0.8, 0.4],  # 黄色
                3: [0.6, 0.6, 0.8],  # 蓝灰
                4: [0.7, 0.9, 0.5],  # 绿色
            }
            
            for mat_id in material_ids:
                color = layer_colors.get(mat_id, [0.5, 0.5, 0.5])
                colors.extend(color * 3)  # 每个三角形3个顶点
        else:
            colors = [0.7, 0.7, 0.7] * len(vertices) // 3  # 默认灰色
        
        return {
            "vertices": vertices,
            "indices": indices,
            "colors": colors,
            "physical_groups": self.physical_groups,
            "mesh_info": {
                "n_nodes": mesh.n_points,
                "n_cells": mesh.n_cells,
                "n_surface_triangles": len(indices) // 3
            },
            "metadata": {
                "modeling_method": "RBF_GMSH_Complete_Mesh",
                "computation_domain": self.computation_domain,
                "n_vertices": len(vertices) // 3,
                "n_triangles": len(indices) // 3,
                "n_boreholes": len(self.boreholes),
                "n_physical_groups": len(self.physical_groups),
                "has_mesh": True
            }
        }
        
    def get_statistics(self) -> Dict:
        """获取完整统计信息"""
        
        stats = {
            "service_type": "Complete_RBF_GMSH_Geology",
            "n_boreholes": len(self.boreholes),
            "computation_domain": self.computation_domain,
            "interpolation_completed": self.interpolated_data is not None,
            "geometry_created": self.gmsh_model is not None,
            "mesh_generated": self.mesh_data is not None,
            "n_physical_groups": len(self.physical_groups)
        }
        
        if self.boreholes:
            coords = np.array([[bh['x'], bh['y'], bh['z']] for bh in self.boreholes])
            unique_layers = set(bh['layer_id'] for bh in self.boreholes)
            
            stats.update({
                "borehole_extent": {
                    "x_range": [float(coords[:, 0].min()), float(coords[:, 0].max())],
                    "y_range": [float(coords[:, 1].min()), float(coords[:, 1].max())],
                    "z_range": [float(coords[:, 2].min()), float(coords[:, 2].max())]
                },
                "soil_layers": len(unique_layers),
                "layer_info": {bh['layer_id']: bh['soil_type'] for bh in self.boreholes}
            })
        
        if self.interpolated_data:
            stats["interpolation_info"] = {
                "grid_size": f"{self.interpolated_data['grid_x'].shape[0]} × {self.interpolated_data['grid_x'].shape[1]}",
                "resolution": self.interpolated_data['resolution'],
                "rbf_function": self.interpolated_data['rbf_function']
            }
        
        if self.physical_groups:
            stats["physical_groups"] = {
                name: {
                    'type': group['type'],
                    'dimension': group['dimension'],
                    'tag': group['tag']
                }
                for name, group in self.physical_groups.items()
            }
        
        if self.mesh_data:
            stats["mesh_info"] = {
                "n_nodes": self.mesh_data.n_points,
                "n_cells": self.mesh_data.n_cells,
                "cell_types": list(set(self.mesh_data.celltypes))
            }
        
        return stats

# 全局服务实例
complete_geology_service = CompleteGeologyService()

def get_complete_geology_service() -> CompleteGeologyService:
    """获取完整地质建模服务实例"""
    return complete_geology_service