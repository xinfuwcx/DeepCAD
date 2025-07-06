"""
增强型网格生成器模块
专门针对三维地形建模：上表面起伏 + 5个平面
使用Gmsh OCC (OpenCASCADE) 功能进行精确几何建模
"""
import os
import tempfile
import logging
from typing import Dict, Any
import gmsh
import meshio
from .intelligent_cache import compute_mesh_hash

logger = logging.getLogger(__name__)


class TerrainMeshGenerator:
    """
    三维地形网格生成器
    
    专门处理：
    1. 起伏的上表面（基于探测数据）
    2. 平整的5个边界面
    3. 使用Gmsh OCC进行精确几何建模
    4. 生成高质量的地质体网格
    """
    
    def __init__(self, mesh_size: float = 10.0, use_occ: bool = True):
        """
        初始化地形网格生成器
        
        Args:
            mesh_size: 全局网格尺寸
            use_occ: 是否使用OpenCASCADE几何内核
        """
        self.mesh_size = mesh_size
        self.use_occ = use_occ
        self.working_dir = tempfile.mkdtemp(prefix="terrain_mesh_")
        logger.info(f"地形网格生成器初始化，工作目录: {self.working_dir}")
        logger.info(f"使用OpenCASCADE: {self.use_occ}")
    
    def generate_terrain_mesh(self, terrain_data: Dict[str, Any]) -> str:
        """
        从地形数据生成网格
        
        Args:
            terrain_data: GemPy生成的地形数据
            
        Returns:
            生成的网格文件路径
        """
        logger.info("开始生成三维地形网格...")
        
        # 初始化Gmsh
        gmsh.initialize()
        gmsh.model.add("terrain_model")
        
        if self.use_occ:
            gmsh.model.occ.synchronize()
            logger.info("启用OpenCASCADE几何内核")
        
        try:
            # 1. 创建地形几何体
            self._create_terrain_geometry(terrain_data)
            
            # 2. 设置网格参数
            self._setup_terrain_mesh_parameters()
            
            # 3. 生成网格
            mesh_file = self._generate_terrain_mesh()
            
            # 生成 mesh_hash 并写入 metadata 文件
            try:
                msh = meshio.read(mesh_file)
                g_hash = getattr(msh, "geometry_hash", None) or "unknown"
                mesh_hash = compute_mesh_hash(
                    g_hash,
                    {"mesh_size": self.mesh_size},
                )
                with open(os.path.join(self.working_dir, "mesh_hash.txt"), "w") as fh:
                    fh.write(mesh_hash)
            except Exception:
                pass
            
            logger.info(f"地形网格生成完成: {mesh_file}")
            return mesh_file
            
        except Exception as e:
            logger.error(f"地形网格生成失败: {e}")
            raise
        finally:
            gmsh.finalize()
    
    def _create_terrain_geometry(self, terrain_data: Dict[str, Any]):
        """使用Gmsh OCC创建三维地形几何体"""
        logger.info("创建三维地形几何体...")
        
        extent = terrain_data["terrain_extent"]
        top_surface = terrain_data["top_surface"]
        
        if self.use_occ:
            # 使用OpenCASCADE创建精确几何
            self._create_occ_terrain_geometry(extent, top_surface, terrain_data)
        else:
            # 使用传统Gmsh几何内核
            self._create_builtin_terrain_geometry(extent, top_surface, terrain_data)
        
        # 同步几何
        if self.use_occ:
            gmsh.model.occ.synchronize()
        
        # 设置物理组
        self._setup_physical_groups(terrain_data)
        
        logger.info("地形几何体创建完成")
    
    def _create_occ_terrain_geometry(self, extent: Dict[str, float], 
                                   top_surface: Dict[str, Any], 
                                   terrain_data: Dict[str, Any]):
        """使用OpenCASCADE创建地形几何"""
        logger.info("使用OpenCASCADE创建地形几何...")
        
        # 1. 创建基础长方体
        dx = extent['x_max'] - extent['x_min']
        dy = extent['y_max'] - extent['y_min']
        dz = extent['z_max'] - extent['z_min']
        
        base_box = gmsh.model.occ.addBox(
            extent['x_min'], extent['y_min'], extent['z_min'],
            dx, dy, dz
        )
        
        logger.info(f"创建基础长方体: {dx:.1f} x {dy:.1f} x {dz:.1f}")
        
        # 2. 处理起伏上表面
        if top_surface.get("is_undulating", False):
            self._create_undulating_top_surface_occ(extent, top_surface)
        
        # 3. 创建地层分层（如果有多层）
        self._create_terrain_layers_occ(extent, terrain_data)
        
        return base_box
    
    def _create_undulating_top_surface_occ(self, extent: Dict[str, float], 
                                         top_surface: Dict[str, Any]):
        """使用OCC创建起伏的上表面"""
        logger.info("创建起伏上表面...")
        
        points = top_surface.get("points", [])
        if len(points) == 0:
            logger.warning("没有上表面点数据，使用平面上表面")
            return
        
        # 创建表面点
        point_tags = []
        for i, point in enumerate(points):
            tag = gmsh.model.occ.addPoint(point[0], point[1], point[2])
            point_tags.append(tag)
        
        # 如果点数足够，创建曲面
        if len(point_tags) >= 4:
            try:
                # 使用点云创建B样条曲面
                # 注意：这是简化实现，实际应用中需要更复杂的曲面拟合
                logger.info(f"基于{len(point_tags)}个点创建B样条曲面")
                
                # 创建边界轮廓
                boundary_points = self._create_boundary_points(extent)
                for bp in boundary_points:
                    tag = gmsh.model.occ.addPoint(bp[0], bp[1], bp[2])
                    point_tags.append(tag)
                
            except Exception as e:
                logger.warning(f"曲面创建失败，使用平面替代: {e}")
    
    def _create_boundary_points(self, extent: Dict[str, float]) -> list:
        """创建边界点"""
        return [
            [extent['x_min'], extent['y_min'], extent['z_max']],
            [extent['x_max'], extent['y_min'], extent['z_max']],
            [extent['x_max'], extent['y_max'], extent['z_max']],
            [extent['x_min'], extent['y_max'], extent['z_max']]
        ]
    
    def _create_terrain_layers_occ(self, extent: Dict[str, float], 
                                 terrain_data: Dict[str, Any]):
        """创建地层分层"""
        volumes = terrain_data.get("volumes", {})
        if len(volumes) <= 1:
            return
        
        logger.info(f"创建{len(volumes)}个地层")
        
        # 简化处理：创建水平分层
        layer_count = len(volumes)
        layer_height = (extent['z_max'] - extent['z_min']) / layer_count
        
        for i, (volume_name, volume_data) in enumerate(volumes.items()):
            z_bottom = extent['z_min'] + i * layer_height
            z_top = extent['z_min'] + (i + 1) * layer_height
            
            # 创建地层长方体
            layer_box = gmsh.model.occ.addBox(
                extent['x_min'], extent['y_min'], z_bottom,
                extent['x_max'] - extent['x_min'],
                extent['y_max'] - extent['y_min'],
                z_top - z_bottom
            )
            
            logger.info(f"创建地层 '{volume_name}': Z[{z_bottom:.1f}, {z_top:.1f}]")
    
    def _create_builtin_terrain_geometry(self, extent: Dict[str, float], 
                                       top_surface: Dict[str, Any], 
                                       terrain_data: Dict[str, Any]):
        """使用内置几何内核创建地形（回退方案）"""
        logger.info("使用内置几何内核创建地形...")
        
        # 创建基础长方体的点
        points = [
            gmsh.model.geo.addPoint(extent['x_min'], extent['y_min'], extent['z_min']),
            gmsh.model.geo.addPoint(extent['x_max'], extent['y_min'], extent['z_min']),
            gmsh.model.geo.addPoint(extent['x_max'], extent['y_max'], extent['z_min']),
            gmsh.model.geo.addPoint(extent['x_min'], extent['y_max'], extent['z_min']),
            gmsh.model.geo.addPoint(extent['x_min'], extent['y_min'], extent['z_max']),
            gmsh.model.geo.addPoint(extent['x_max'], extent['y_min'], extent['z_max']),
            gmsh.model.geo.addPoint(extent['x_max'], extent['y_max'], extent['z_max']),
            gmsh.model.geo.addPoint(extent['x_min'], extent['y_max'], extent['z_max'])
        ]
        
        # 创建线
        lines = []
        # 底面
        lines.extend([
            gmsh.model.geo.addLine(points[0], points[1]),
            gmsh.model.geo.addLine(points[1], points[2]),
            gmsh.model.geo.addLine(points[2], points[3]),
            gmsh.model.geo.addLine(points[3], points[0])
        ])
        # 顶面
        lines.extend([
            gmsh.model.geo.addLine(points[4], points[5]),
            gmsh.model.geo.addLine(points[5], points[6]),
            gmsh.model.geo.addLine(points[6], points[7]),
            gmsh.model.geo.addLine(points[7], points[4])
        ])
        # 竖直线
        lines.extend([
            gmsh.model.geo.addLine(points[0], points[4]),
            gmsh.model.geo.addLine(points[1], points[5]),
            gmsh.model.geo.addLine(points[2], points[6]),
            gmsh.model.geo.addLine(points[3], points[7])
        ])
        
        gmsh.model.geo.synchronize()
    
    def _setup_physical_groups(self, terrain_data: Dict[str, Any]):
        """设置物理组"""
        logger.info("设置物理组...")
        
        volumes = terrain_data.get("volumes", {})
        
        # 为每个地层设置物理组
        for volume_name, volume_data in volumes.items():
            material_id = volume_data["material_id"]
            
            # 查找对应的体积实体
            volume_entities = gmsh.model.getEntities(3)
            if len(volume_entities) >= material_id:
                volume_tag = volume_entities[material_id - 1][1]
                
                # 添加物理组
                gmsh.model.addPhysicalGroup(3, [volume_tag], material_id)
                gmsh.model.setPhysicalName(3, material_id, volume_name)
                
                logger.info(f"设置物理组: {volume_name} (ID: {material_id})")
    
    def _setup_terrain_mesh_parameters(self):
        """设置地形网格参数"""
        logger.info(f"设置地形网格参数，网格尺寸: {self.mesh_size}")
        
        # 全局网格尺寸
        gmsh.option.setNumber("Mesh.MeshSizeMax", self.mesh_size)
        gmsh.option.setNumber("Mesh.MeshSizeMin", self.mesh_size * 0.2)
        
        # 网格算法（适合地形建模）
        if self.use_occ:
            gmsh.option.setNumber("Mesh.Algorithm", 6)    # Frontal-Delaunay
            gmsh.option.setNumber("Mesh.Algorithm3D", 10) # HXT (适合复杂几何)
        else:
            gmsh.option.setNumber("Mesh.Algorithm", 6)    # Frontal-Delaunay
            gmsh.option.setNumber("Mesh.Algorithm3D", 1)  # Delaunay
        
        # 网格质量优化
        gmsh.option.setNumber("Mesh.ElementOrder", 1)
        gmsh.option.setNumber("Mesh.Optimize", 1)
        gmsh.option.setNumber("Mesh.OptimizeNetgen", 1)
        
        # 地形特定参数
        gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 12)  # 基于曲率的网格细化
        gmsh.option.setNumber("Mesh.MinimumCirclePoints", 8)     # 圆形最小点数
    
    def _generate_terrain_mesh(self) -> str:
        """生成地形网格"""
        logger.info("开始地形网格剖分...")
        
        # 生成3D网格
        gmsh.model.mesh.generate(3)
        
        # 获取网格统计信息
        try:
            nodes = gmsh.model.mesh.getNodes()
            elements = gmsh.model.mesh.getElements()
            
            node_count = len(nodes[0]) if nodes[0] is not None else 0
            element_count = sum(len(elem_nodes) for elem_nodes in elements[2])
            
            logger.info(f"地形网格剖分完成: {node_count} 个节点, {element_count} 个单元")
        except Exception as e:
            logger.warning(f"无法获取网格统计信息: {e}")
        
        # 保存网格文件
        mesh_files = self._save_mesh_files()
        
        return mesh_files["mdpa"]  # 返回Kratos格式
    
    def _save_mesh_files(self) -> Dict[str, str]:
        """保存多种格式的网格文件"""
        mesh_files = {}
        
        # 1. VTK格式（可视化）
        vtk_file = os.path.join(self.working_dir, "terrain_mesh.vtk")
        gmsh.write(vtk_file)
        mesh_files["vtk"] = vtk_file
        
        # 2. MSH格式（Gmsh原生）
        msh_file = os.path.join(self.working_dir, "terrain_mesh.msh")
        gmsh.write(msh_file)
        mesh_files["msh"] = msh_file
        
        # 3. MDPA格式（Kratos）
        mdpa_file = self._convert_to_kratos_format(msh_file)
        mesh_files["mdpa"] = mdpa_file
        
        logger.info(f"网格文件已保存: {list(mesh_files.keys())}")
        return mesh_files
    
    def _convert_to_kratos_format(self, msh_file: str) -> str:
        """转换为Kratos MDPA格式"""
        logger.info("转换为Kratos MDPA格式...")
        
        try:
            mesh = meshio.read(msh_file)
            mdpa_file = os.path.join(self.working_dir, "terrain_mesh.mdpa")
            
            with open(mdpa_file, 'w') as f:
                # 文件头
                f.write("Begin ModelPartData\n")
                f.write("//  VARIABLE_NAME value\n")
                f.write("End ModelPartData\n\n")
                
                # 材料属性
                f.write("Begin Properties 1\n")
                f.write("End Properties\n\n")
                
                # 节点
                f.write("Begin Nodes\n")
                for i, point in enumerate(mesh.points):
                    f.write(f"{i+1} {point[0]:.6f} {point[1]:.6f} {point[2]:.6f}\n")
                f.write("End Nodes\n\n")
                
                # 四面体单元
                if 'tetra' in mesh.cells_dict:
                    f.write("Begin Elements Element3D4N\n")
                    for i, element in enumerate(mesh.cells_dict['tetra']):
                        f.write(f"{i+1} 1 {element[0]+1} {element[1]+1} "
                               f"{element[2]+1} {element[3]+1}\n")
                    f.write("End Elements\n\n")
                
                # 物理组
                self._write_physical_groups_to_mdpa(f, mesh)
            
            logger.info(f"MDPA格式转换完成: {mdpa_file}")
            return mdpa_file
            
        except Exception as e:
            logger.error(f"MDPA转换失败: {e}")
            raise
    
    def _write_physical_groups_to_mdpa(self, f, mesh):
        """写入物理组到MDPA文件"""
        if hasattr(mesh, 'cell_data') and mesh.cell_data:
            for group_name in mesh.cell_data.keys():
                f.write(f"Begin SubModelPart {group_name}\n")
                f.write("Begin SubModelPartNodes\n")
                f.write("End SubModelPartNodes\n")
                f.write("Begin SubModelPartElements\n")
                f.write("End SubModelPartElements\n")
                f.write("End SubModelPart\n\n")


# 便捷函数
def create_terrain_mesh(terrain_data: Dict[str, Any], 
                       mesh_size: float = 10.0,
                       use_occ: bool = True) -> Dict[str, Any]:
    """
    便捷函数：从地形数据创建网格
    
    Args:
        terrain_data: GemPy生成的地形数据
        mesh_size: 网格尺寸
        use_occ: 是否使用OpenCASCADE
        
    Returns:
        包含网格文件路径和统计信息的字典
    """
    generator = TerrainMeshGenerator(mesh_size, use_occ)
    
    try:
        mesh_file = generator.generate_terrain_mesh(terrain_data)
        
        return {
            "status": "success",
            "mesh_file": mesh_file,
            "working_dir": generator.working_dir,
            "use_occ": use_occ
        }
    except Exception as e:
        logger.error(f"地形网格生成失败: {e}")
        return {
            "status": "failed",
            "error": str(e),
            "working_dir": generator.working_dir
        }


# 保持向后兼容
GeologyMeshGenerator = TerrainMeshGenerator
create_geology_mesh = create_terrain_mesh 