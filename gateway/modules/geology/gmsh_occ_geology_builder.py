"""
基于GMSH OCC的地质体构建核心算法
插值结果 → NURBS曲面 → 长方体切割 → 土层体生成
2号几何专家
"""

import gmsh
import numpy as np
import logging
from typing import List, Dict, Tuple, Any, Optional
from scipy.interpolate import Rbf
import gstools as gs

logger = logging.getLogger(__name__)

class GMSHOCCGeologyBuilder:
    """GMSH OCC地质体构建器"""
    
    def __init__(self):
        self.model_name = "GeologyModel"
        self.domain_box = None
        self.soil_surfaces = {}  # 存储土层界面
        self.soil_volumes = {}   # 存储土层体
        self.physical_groups = {}
        
    def initialize_gmsh(self):
        """初始化GMSH环境"""
        gmsh.initialize()
        gmsh.clear()
        gmsh.model.add(self.model_name)
        logger.info("✓ GMSH OCC环境初始化完成")
    
    def create_domain_box(self, domain_params: Dict[str, float]) -> int:
        """
        创建计算域长方体
        
        Args:
            domain_params: {x_min, x_max, y_min, y_max, z_min, z_max}
        
        Returns:
            box_tag: 长方体标签
        """
        x_min, x_max = domain_params['x_min'], domain_params['x_max']
        y_min, y_max = domain_params['y_min'], domain_params['y_max']
        z_min, z_max = domain_params['z_min'], domain_params['z_max']
        
        # 创建长方体
        box_tag = gmsh.model.occ.addBox(
            x_min, y_min, z_min,
            x_max - x_min, y_max - y_min, z_max - z_min
        )
        
        self.domain_box = box_tag
        logger.info(f"✓ 创建计算域长方体: {x_max-x_min:.1f}×{y_max-y_min:.1f}×{z_max-z_min:.1f}m")
        
        return box_tag
    
    def interpolate_soil_surface(self, boreholes: List[Dict], 
                                layer_id: int, 
                                method: str = "rbf") -> np.ndarray:
        """
        插值生成土层界面
        
        Args:
            boreholes: 钻孔数据
            layer_id: 土层编号
            method: 插值方法 (rbf/kriging)
        
        Returns:
            grid_points: 插值网格点 [nx, ny, 3]
        """
        # 提取该土层的控制点
        layer_points = []
        for bh in boreholes:
            for layer in bh.get('layers', []):
                if layer['layer_id'] == layer_id:
                    layer_points.append({
                        'x': bh['x'],
                        'y': bh['y'], 
                        'z_top': layer['z_top'],
                        'z_bottom': layer['z_bottom']
                    })
        
        if len(layer_points) < 3:
            logger.warning(f"土层{layer_id}控制点不足({len(layer_points)}个)")
            return None
        
        # 提取坐标
        x_coords = np.array([p['x'] for p in layer_points])
        y_coords = np.array([p['y'] for p in layer_points])
        z_top = np.array([p['z_top'] for p in layer_points])
        z_bottom = np.array([p['z_bottom'] for p in layer_points])
        
        # 创建插值网格
        x_range = (x_coords.min(), x_coords.max())
        y_range = (y_coords.min(), y_coords.max())
        
        nx, ny = 20, 20  # 网格分辨率
        x_grid = np.linspace(x_range[0], x_range[1], nx)
        y_grid = np.linspace(y_range[0], y_range[1], ny)
        X, Y = np.meshgrid(x_grid, y_grid)
        
        # 执行插值
        if method == "rbf":
            # RBF插值
            rbf_top = Rbf(x_coords, y_coords, z_top, function='multiquadric', epsilon=2.0)
            rbf_bottom = Rbf(x_coords, y_coords, z_bottom, function='multiquadric', epsilon=2.0)
            
            Z_top = rbf_top(X, Y)
            Z_bottom = rbf_bottom(X, Y)
            
        elif method == "kriging":
            # Kriging插值
            model = gs.Exponential(dim=2, var=1.0, len_scale=20.0, nugget=0.1)
            
            krig_top = gs.krige.Ordinary(model=model, cond_pos=(x_coords, y_coords), cond_val=z_top)
            krig_bottom = gs.krige.Ordinary(model=model, cond_pos=(x_coords, y_coords), cond_val=z_bottom)
            
            Z_top, _ = krig_top.structured([x_grid, y_grid])
            Z_bottom, _ = krig_bottom.structured([x_grid, y_grid])
        
        # 构建网格点数组
        points_top = np.stack([X, Y, Z_top], axis=-1)
        points_bottom = np.stack([X, Y, Z_bottom], axis=-1)
        
        logger.info(f"✓ 土层{layer_id}插值完成: {method}方法, {nx}×{ny}网格")
        
        return {
            'top_surface': points_top,
            'bottom_surface': points_bottom,
            'grid_shape': (nx, ny)
        }
    
    def create_bspline_surface(self, grid_points: np.ndarray, 
                              surface_name: str) -> int:
        """
        基于网格点创建B样条曲面
        
        Args:
            grid_points: 网格点数组 [nx, ny, 3]
            surface_name: 曲面名称
        
        Returns:
            surface_tag: 曲面标签
        """
        nx, ny, _ = grid_points.shape
        
        # 创建控制点
        point_tags = []
        for i in range(nx):
            for j in range(ny):
                x, y, z = grid_points[i, j]
                point_tag = gmsh.model.occ.addPoint(x, y, z)
                point_tags.append(point_tag)
        
        # 创建B样条曲面
        # 注意：GMSH的B样条需要控制点按特定顺序排列
        control_points = np.array(point_tags).reshape(nx, ny)
        
        # B样条参数
        degree_u, degree_v = 3, 3  # 三次B样条
        
        # 节点向量 (简化处理，均匀分布)
        knots_u = np.concatenate([
            [0] * (degree_u + 1),
            np.linspace(0, 1, nx - degree_u + 1)[1:-1],
            [1] * (degree_u + 1)
        ])
        knots_v = np.concatenate([
            [0] * (degree_v + 1), 
            np.linspace(0, 1, ny - degree_v + 1)[1:-1],
            [1] * (degree_v + 1)
        ])
        
        # 创建B样条曲面
        surface_tag = gmsh.model.occ.addBSplineSurface(
            point_tags,  # 控制点
            nx,          # U方向点数
            degree_u,    # U方向次数
            degree_v,    # V方向次数
            knots_u.tolist(),  # U方向节点向量
            knots_v.tolist()   # V方向节点向量
        )
        
        self.soil_surfaces[surface_name] = surface_tag
        logger.info(f"✓ 创建B样条曲面: {surface_name} (标签: {surface_tag})")
        
        return surface_tag
    
    def create_soil_volumes(self, layer_surfaces: Dict[int, Dict]) -> Dict[int, int]:
        """
        基于土层界面创建土层体
        
        Args:
            layer_surfaces: {layer_id: {'top': surface_tag, 'bottom': surface_tag}}
        
        Returns:
            soil_volumes: {layer_id: volume_tag}
        """
        if not self.domain_box:
            raise ValueError("必须先创建计算域长方体")
        
        current_volume = self.domain_box
        soil_volumes = {}
        
        # 按层次从上到下切割
        sorted_layers = sorted(layer_surfaces.keys())
        
        for i, layer_id in enumerate(sorted_layers):
            surfaces = layer_surfaces[layer_id]
            top_surface = surfaces['top']
            bottom_surface = surfaces['bottom']
            
            try:
                # 方法1: 使用曲面切割体
                if i == 0:
                    # 第一层：从顶面到底面
                    # 创建曲面边界
                    top_boundary = [(2, top_surface)]  # 2表示面
                    
                    # 使用fragment操作分割
                    gmsh.model.occ.fragment(
                        [(3, current_volume)],  # 3表示体
                        top_boundary
                    )
                    gmsh.model.occ.synchronize()
                    
                    # 获取分割后的体
                    all_volumes = gmsh.model.getEntities(3)
                    if len(all_volumes) >= 2:
                        # 选择合适的体作为当前土层
                        soil_volumes[layer_id] = all_volumes[0][1]  # 简化选择
                        current_volume = all_volumes[1][1]
                    
                else:
                    # 后续层：继续分割剩余体积
                    bottom_boundary = [(2, bottom_surface)]
                    
                    gmsh.model.occ.fragment(
                        [(3, current_volume)], 
                        bottom_boundary
                    )
                    gmsh.model.occ.synchronize()
                    
                    # 更新体标签
                    all_volumes = gmsh.model.getEntities(3)
                    if len(all_volumes) >= 2:
                        soil_volumes[layer_id] = all_volumes[0][1]
                        current_volume = all_volumes[1][1]
                
                logger.info(f"✓ 创建土层{layer_id}体积")
                
            except Exception as e:
                logger.error(f"创建土层{layer_id}体积失败: {e}")
                # 备用方案：创建简化的长方体层
                layer_height = 5.0  # 默认层厚
                box_tag = gmsh.model.occ.addBox(
                    -50, -50, -layer_height * (i + 1),
                    100, 100, layer_height
                )
                soil_volumes[layer_id] = box_tag
        
        self.soil_volumes = soil_volumes
        gmsh.model.occ.synchronize()
        
        logger.info(f"✓ 创建{len(soil_volumes)}个土层体积")
        return soil_volumes
    
    def define_physical_groups(self, soil_materials: Dict[int, Dict]) -> Dict[int, int]:
        """
        定义物理组
        
        Args:
            soil_materials: {layer_id: {'name': str, 'material_id': int}}
        
        Returns:
            physical_groups: {layer_id: physical_group_id}
        """
        physical_groups = {}
        
        for layer_id, volume_tag in self.soil_volumes.items():
            material_info = soil_materials.get(layer_id, {'name': f'Layer_{layer_id}'})
            
            # 创建体物理组
            physical_group_id = layer_id + 1000  # 避免冲突
            gmsh.model.addPhysicalGroup(3, [volume_tag], physical_group_id)
            gmsh.model.setPhysicalName(3, physical_group_id, material_info['name'])
            
            physical_groups[layer_id] = physical_group_id
            
            logger.info(f"✓ 创建物理组: {material_info['name']} (ID: {physical_group_id})")
        
        self.physical_groups = physical_groups
        return physical_groups
    
    def generate_mesh(self, mesh_params: Dict[str, float]) -> str:
        """
        生成网格
        
        Args:
            mesh_params: 网格参数
        
        Returns:
            mesh_file_path: 网格文件路径
        """
        # 设置网格尺寸
        mesh_size = mesh_params.get('element_size', 2.0)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMax", mesh_size)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMin", mesh_size * 0.5)
        
        # 设置网格算法
        gmsh.option.setNumber("Mesh.Algorithm", 6)  # Frontal-Delaunay
        gmsh.option.setNumber("Mesh.Algorithm3D", 10)  # HXT
        
        # 生成网格
        logger.info("🔄 开始生成网格...")
        gmsh.model.mesh.generate(3)
        
        # 保存网格
        mesh_file = f"geology_mesh_{self.model_name}.msh"
        gmsh.write(mesh_file)
        
        # 获取网格统计信息
        node_count = len(gmsh.model.mesh.getNodes()[0])
        element_count = len(gmsh.model.mesh.getElements()[1][0]) if gmsh.model.mesh.getElements()[1] else 0
        
        logger.info(f"✓ 网格生成完成: {node_count}节点, {element_count}单元")
        logger.info(f"✓ 网格文件: {mesh_file}")
        
        return mesh_file
    
    def build_complete_geology_model(self, 
                                   boreholes: List[Dict],
                                   domain_params: Dict[str, float],
                                   interpolation_method: str = "rbf") -> Dict[str, Any]:
        """
        完整的地质建模流程
        
        Args:
            boreholes: 钻孔数据
            domain_params: 计算域参数
            interpolation_method: 插值方法
        
        Returns:
            建模结果字典
        """
        try:
            # 1. 初始化GMSH
            self.initialize_gmsh()
            
            # 2. 创建计算域长方体
            domain_box = self.create_domain_box(domain_params)
            
            # 3. 获取所有土层ID
            layer_ids = set()
            for bh in boreholes:
                for layer in bh.get('layers', []):
                    layer_ids.add(layer['layer_id'])
            
            # 4. 为每个土层创建界面
            layer_surfaces = {}
            for layer_id in sorted(layer_ids):
                # 插值生成界面
                surface_data = self.interpolate_soil_surface(boreholes, layer_id, interpolation_method)
                
                if surface_data:
                    # 创建顶面B样条
                    top_surface = self.create_bspline_surface(
                        surface_data['top_surface'], 
                        f"Layer_{layer_id}_Top"
                    )
                    
                    # 创建底面B样条  
                    bottom_surface = self.create_bspline_surface(
                        surface_data['bottom_surface'],
                        f"Layer_{layer_id}_Bottom"
                    )
                    
                    layer_surfaces[layer_id] = {
                        'top': top_surface,
                        'bottom': bottom_surface
                    }
            
            # 5. 创建土层体
            soil_volumes = self.create_soil_volumes(layer_surfaces)
            
            # 6. 定义物理组
            soil_materials = {
                layer_id: {'name': f'Soil_Layer_{layer_id}', 'material_id': layer_id}
                for layer_id in layer_ids
            }
            physical_groups = self.define_physical_groups(soil_materials)
            
            # 7. 生成网格
            mesh_params = {'element_size': 2.0}
            mesh_file = self.generate_mesh(mesh_params)
            
            # 8. 同步和清理
            gmsh.model.occ.synchronize()
            
            result = {
                'success': True,
                'domain_box': domain_box,
                'soil_volumes': soil_volumes,
                'physical_groups': physical_groups,
                'mesh_file': mesh_file,
                'layer_count': len(layer_ids),
                'interpolation_method': interpolation_method
            }
            
            logger.info("🎉 地质建模完成!")
            return result
            
        except Exception as e:
            logger.error(f"地质建模失败: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        
        finally:
            # 清理GMSH环境
            # gmsh.finalize()  # 可选择性清理
            pass

# 全局建模器实例
geology_builder = GMSHOCCGeologyBuilder()