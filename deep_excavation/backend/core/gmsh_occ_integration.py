"""
Gmsh(OCC)集成系统实现
定义Gmsh在整个体系中的定位和数据交互流程
"""

import gmsh
import numpy as np
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import logging
import json
import hashlib

logger = logging.getLogger(__name__)

class GeometryType(Enum):
    """几何类型枚举"""
    EXCAVATION = "excavation"
    SOIL_VOLUME = "soil_volume"
    DIAPHRAGM_WALL = "diaphragm_wall"
    PILE = "pile"
    ANCHOR = "anchor"
    BUILDING = "building"

@dataclass
class GeometryFeature:
    """几何特征数据结构"""
    name: str
    geometry_type: GeometryType
    parameters: Dict[str, Any]
    gmsh_tags: List[int]
    parent_tags: List[int] = None
    material_id: int = None

@dataclass
class MeshStrategy:
    """网格策略数据结构"""
    element_size: float
    element_type: str
    refinement_zones: List[Dict[str, Any]]
    quality_targets: Dict[str, float]
    algorithm: str = "auto"

class GmshOCCKernel:
    """Gmsh OCC几何内核"""
    
    def __init__(self):
        self.gmsh_initialized = False
        self.current_model = None
        self.geometry_features = {}
        self.material_properties = {}
        
    async def initialize(self):
        """初始化Gmsh环境"""
        if not self.gmsh_initialized:
            gmsh.initialize()
            gmsh.model.add("DeepExcavationModel")
            self.current_model = gmsh.model
            self.gmsh_initialized = True
            
            # 设置OCC几何核心
            gmsh.model.occ.synchronize()
            
            # 配置基础参数
            await self._configure_gmsh_options()
            
            logger.info("Gmsh OCC内核初始化完成")
    
    async def _configure_gmsh_options(self):
        """配置Gmsh选项"""
        # 几何选项
        gmsh.option.setNumber("Geometry.Tolerance", 1e-8)
        gmsh.option.setNumber("Geometry.ToleranceBoolean", 1e-8)
        
        # 网格选项
        gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 12)
        gmsh.option.setNumber("Mesh.MeshSizeExtendFromBoundary", 0)
        gmsh.option.setNumber("Mesh.MeshSizeFromPoints", 0)
        gmsh.option.setNumber("Mesh.Algorithm", 6)  # Frontal-Delaunay
        gmsh.option.setNumber("Mesh.Algorithm3D", 10)  # HXT
        
        # 质量控制
        gmsh.option.setNumber("Mesh.QualityType", 2)
        gmsh.option.setNumber("Mesh.QualityInf", 0.3)
        gmsh.option.setNumber("Mesh.QualitySup", 0.95)
    
    async def create_excavation_geometry(self, parameters: Dict[str, Any]) -> GeometryFeature:
        """创建基坑几何"""
        if not self.gmsh_initialized:
            await self.initialize()
        
        # 提取参数
        depth = parameters.get('depth', 10.0)
        width = parameters.get('width', 20.0)
        length = parameters.get('length', 30.0)
        center_x = parameters.get('center_x', 0.0)
        center_y = parameters.get('center_y', 0.0)
        
        # 创建基坑几何
        excavation_box = gmsh.model.occ.addBox(
            center_x - width/2,
            center_y - length/2,
            -depth,
            width,
            length,
            depth
        )
        
        # 同步到模型
        gmsh.model.occ.synchronize()
        
        # 创建几何特征
        feature = GeometryFeature(
            name="excavation",
            geometry_type=GeometryType.EXCAVATION,
            parameters=parameters,
            gmsh_tags=[excavation_box]
        )
        
        self.geometry_features["excavation"] = feature
        
        logger.info(f"创建基坑几何: 深度={depth}m, 宽度={width}m, 长度={length}m")
        
        return feature
    
    async def create_soil_volume(self, excavation_feature: GeometryFeature, soil_parameters: Dict[str, Any]) -> GeometryFeature:
        """创建土体几何"""
        # 提取参数
        soil_depth = soil_parameters.get('soil_depth', 50.0)
        soil_width = soil_parameters.get('soil_width', 100.0)
        soil_length = soil_parameters.get('soil_length', 100.0)
        
        # 创建土体几何
        soil_box = gmsh.model.occ.addBox(
            -soil_width/2,
            -soil_length/2,
            -soil_depth,
            soil_width,
            soil_length,
            soil_depth
        )
        
        # 从土体中减去基坑
        excavation_tag = excavation_feature.gmsh_tags[0]
        soil_with_excavation = gmsh.model.occ.cut(
            [(3, soil_box)],
            [(3, excavation_tag)],
            removeObject=True,
            removeTool=False
        )
        
        # 同步到模型
        gmsh.model.occ.synchronize()
        
        # 创建几何特征
        feature = GeometryFeature(
            name="soil_volume",
            geometry_type=GeometryType.SOIL_VOLUME,
            parameters=soil_parameters,
            gmsh_tags=[soil_with_excavation[0][0][1]],
            parent_tags=[excavation_tag]
        )
        
        self.geometry_features["soil_volume"] = feature
        
        logger.info(f"创建土体几何: 深度={soil_depth}m, 范围={soil_width}x{soil_length}m")
        
        return feature
    
    async def create_diaphragm_wall(self, excavation_feature: GeometryFeature, wall_parameters: Dict[str, Any]) -> GeometryFeature:
        """创建地下连续墙"""
        # 提取参数
        thickness = wall_parameters.get('thickness', 0.8)
        depth = wall_parameters.get('depth', 25.0)
        
        # 获取基坑参数
        exc_params = excavation_feature.parameters
        exc_width = exc_params.get('width', 20.0)
        exc_length = exc_params.get('length', 30.0)
        exc_center_x = exc_params.get('center_x', 0.0)
        exc_center_y = exc_params.get('center_y', 0.0)
        
        # 创建墙体几何
        wall_tags = []
        
        # 四面墙
        walls = [
            # 前墙
            {
                'x': exc_center_x - exc_width/2 - thickness/2,
                'y': exc_center_y - exc_length/2 - thickness,
                'z': -depth,
                'dx': thickness,
                'dy': exc_length + 2*thickness,
                'dz': depth
            },
            # 后墙
            {
                'x': exc_center_x + exc_width/2 - thickness/2,
                'y': exc_center_y - exc_length/2 - thickness,
                'z': -depth,
                'dx': thickness,
                'dy': exc_length + 2*thickness,
                'dz': depth
            },
            # 左墙
            {
                'x': exc_center_x - exc_width/2,
                'y': exc_center_y - exc_length/2 - thickness/2,
                'z': -depth,
                'dx': exc_width,
                'dy': thickness,
                'dz': depth
            },
            # 右墙
            {
                'x': exc_center_x - exc_width/2,
                'y': exc_center_y + exc_length/2 - thickness/2,
                'z': -depth,
                'dx': exc_width,
                'dy': thickness,
                'dz': depth
            }
        ]
        
        for wall in walls:
            wall_box = gmsh.model.occ.addBox(
                wall['x'], wall['y'], wall['z'],
                wall['dx'], wall['dy'], wall['dz']
            )
            wall_tags.append(wall_box)
        
        # 同步到模型
        gmsh.model.occ.synchronize()
        
        # 创建几何特征
        feature = GeometryFeature(
            name="diaphragm_wall",
            geometry_type=GeometryType.DIAPHRAGM_WALL,
            parameters=wall_parameters,
            gmsh_tags=wall_tags,
            parent_tags=excavation_feature.gmsh_tags
        )
        
        self.geometry_features["diaphragm_wall"] = feature
        
        logger.info(f"创建地下连续墙: 厚度={thickness}m, 深度={depth}m")
        
        return feature
    
    async def create_anchors(self, wall_feature: GeometryFeature, anchor_parameters: Dict[str, Any]) -> GeometryFeature:
        """创建锚杆"""
        # 提取参数
        anchor_levels = anchor_parameters.get('levels', [3.0, 6.0, 9.0])
        anchor_length = anchor_parameters.get('length', 15.0)
        anchor_diameter = anchor_parameters.get('diameter', 0.15)
        anchor_spacing = anchor_parameters.get('spacing', 2.0)
        
        # 获取基坑参数
        exc_params = self.geometry_features["excavation"].parameters
        exc_width = exc_params.get('width', 20.0)
        exc_length = exc_params.get('length', 30.0)
        
        anchor_tags = []
        
        # 在每个水平面创建锚杆
        for level in anchor_levels:
            # 计算锚杆数量
            num_anchors_width = int(exc_width / anchor_spacing) + 1
            num_anchors_length = int(exc_length / anchor_spacing) + 1
            
            # 前后两面的锚杆
            for i in range(num_anchors_width):
                x = -exc_width/2 + i * anchor_spacing
                
                # 前面锚杆
                anchor_cyl = gmsh.model.occ.addCylinder(
                    x, -exc_length/2, -level,
                    0, -anchor_length, 0,
                    anchor_diameter/2
                )
                anchor_tags.append(anchor_cyl)
                
                # 后面锚杆
                anchor_cyl = gmsh.model.occ.addCylinder(
                    x, exc_length/2, -level,
                    0, anchor_length, 0,
                    anchor_diameter/2
                )
                anchor_tags.append(anchor_cyl)
            
            # 左右两面的锚杆
            for i in range(num_anchors_length):
                y = -exc_length/2 + i * anchor_spacing
                
                # 左面锚杆
                anchor_cyl = gmsh.model.occ.addCylinder(
                    -exc_width/2, y, -level,
                    -anchor_length, 0, 0,
                    anchor_diameter/2
                )
                anchor_tags.append(anchor_cyl)
                
                # 右面锚杆
                anchor_cyl = gmsh.model.occ.addCylinder(
                    exc_width/2, y, -level,
                    anchor_length, 0, 0,
                    anchor_diameter/2
                )
                anchor_tags.append(anchor_cyl)
        
        # 同步到模型
        gmsh.model.occ.synchronize()
        
        # 创建几何特征
        feature = GeometryFeature(
            name="anchors",
            geometry_type=GeometryType.ANCHOR,
            parameters=anchor_parameters,
            gmsh_tags=anchor_tags,
            parent_tags=wall_feature.gmsh_tags
        )
        
        self.geometry_features["anchors"] = feature
        
        logger.info(f"创建锚杆: {len(anchor_levels)}层, 总计{len(anchor_tags)}根")
        
        return feature
    
    async def assign_material_properties(self, feature_name: str, material_properties: Dict[str, Any]):
        """分配材料属性"""
        if feature_name in self.geometry_features:
            feature = self.geometry_features[feature_name]
            
            # 生成材料ID
            material_id = hash(json.dumps(material_properties, sort_keys=True)) % 10000
            feature.material_id = material_id
            
            # 存储材料属性
            self.material_properties[material_id] = material_properties
            
            # 为几何实体分配物理组
            for tag in feature.gmsh_tags:
                gmsh.model.addPhysicalGroup(3, [tag], material_id)
                gmsh.model.setPhysicalName(3, material_id, f"{feature_name}_{material_id}")
            
            logger.info(f"为{feature_name}分配材料属性: ID={material_id}")
        else:
            logger.warning(f"几何特征{feature_name}不存在")

class GmshMeshGenerator:
    """Gmsh网格生成器"""
    
    def __init__(self, gmsh_kernel: GmshOCCKernel):
        self.gmsh_kernel = gmsh_kernel
        self.mesh_cache = {}
        
    async def generate_mesh(self, mesh_strategy: MeshStrategy) -> Dict[str, Any]:
        """生成网格"""
        if not self.gmsh_kernel.gmsh_initialized:
            await self.gmsh_kernel.initialize()
        
        # 设置网格尺寸
        await self._set_mesh_sizes(mesh_strategy)
        
        # 设置细化区域
        await self._set_refinement_zones(mesh_strategy)
        
        # 生成网格
        gmsh.model.mesh.generate(3)
        
        # 优化网格质量
        await self._optimize_mesh_quality(mesh_strategy)
        
        # 提取网格数据
        mesh_data = await self._extract_mesh_data()
        
        # 验证网格质量
        quality_metrics = await self._calculate_quality_metrics(mesh_data)
        
        logger.info(f"网格生成完成: {mesh_data['element_count']}个单元, {mesh_data['node_count']}个节点")
        
        return {
            'mesh_data': mesh_data,
            'quality_metrics': quality_metrics,
            'strategy': mesh_strategy
        }
    
    async def _set_mesh_sizes(self, mesh_strategy: MeshStrategy):
        """设置网格尺寸"""
        # 全局网格尺寸
        gmsh.option.setNumber("Mesh.MeshSizeMax", mesh_strategy.element_size)
        gmsh.option.setNumber("Mesh.MeshSizeMin", mesh_strategy.element_size * 0.1)
        
        # 为不同几何特征设置不同的网格尺寸
        for feature_name, feature in self.gmsh_kernel.geometry_features.items():
            if feature.geometry_type == GeometryType.EXCAVATION:
                # 基坑边界需要较细的网格
                size = mesh_strategy.element_size * 0.5
            elif feature.geometry_type == GeometryType.DIAPHRAGM_WALL:
                # 地下连续墙需要很细的网格
                size = mesh_strategy.element_size * 0.3
            elif feature.geometry_type == GeometryType.ANCHOR:
                # 锚杆需要细网格
                size = mesh_strategy.element_size * 0.2
            else:
                # 土体使用标准网格
                size = mesh_strategy.element_size
            
            # 设置网格尺寸
            for tag in feature.gmsh_tags:
                gmsh.model.mesh.setSize(gmsh.model.getBoundary([(3, tag)]), size)
    
    async def _set_refinement_zones(self, mesh_strategy: MeshStrategy):
        """设置细化区域"""
        for zone in mesh_strategy.refinement_zones:
            zone_type = zone.get('type', 'sphere')
            
            if zone_type == 'sphere':
                center = zone.get('center', [0, 0, 0])
                radius = zone.get('radius', 5.0)
                size = zone.get('size', mesh_strategy.element_size * 0.3)
                
                # 创建细化球
                gmsh.model.mesh.field.add("Ball", len(mesh_strategy.refinement_zones))
                gmsh.model.mesh.field.setNumber(len(mesh_strategy.refinement_zones), "XCenter", center[0])
                gmsh.model.mesh.field.setNumber(len(mesh_strategy.refinement_zones), "YCenter", center[1])
                gmsh.model.mesh.field.setNumber(len(mesh_strategy.refinement_zones), "ZCenter", center[2])
                gmsh.model.mesh.field.setNumber(len(mesh_strategy.refinement_zones), "Radius", radius)
                gmsh.model.mesh.field.setNumber(len(mesh_strategy.refinement_zones), "VIn", size)
                gmsh.model.mesh.field.setNumber(len(mesh_strategy.refinement_zones), "VOut", mesh_strategy.element_size)
    
    async def _optimize_mesh_quality(self, mesh_strategy: MeshStrategy):
        """优化网格质量"""
        # 网格平滑
        gmsh.model.mesh.optimize("Netgen")
        
        # 高阶单元（如果需要）
        if mesh_strategy.quality_targets.get('high_order', False):
            gmsh.model.mesh.setOrder(2)
    
    async def _extract_mesh_data(self) -> Dict[str, Any]:
        """提取网格数据"""
        # 获取节点
        node_tags, node_coords, _ = gmsh.model.mesh.getNodes()
        
        # 获取单元
        element_types, element_tags, element_node_tags = gmsh.model.mesh.getElements()
        
        # 整理数据
        nodes = {}
        for i, tag in enumerate(node_tags):
            nodes[int(tag)] = [
                node_coords[i*3],
                node_coords[i*3+1],
                node_coords[i*3+2]
            ]
        
        elements = {}
        for elem_type, elem_tags, elem_nodes in zip(element_types, element_tags, element_node_tags):
            elements[elem_type] = {
                'tags': elem_tags.tolist(),
                'nodes': elem_nodes.tolist()
            }
        
        return {
            'nodes': nodes,
            'elements': elements,
            'node_count': len(nodes),
            'element_count': sum(len(elem_data['tags']) for elem_data in elements.values())
        }
    
    async def _calculate_quality_metrics(self, mesh_data: Dict[str, Any]) -> Dict[str, float]:
        """计算网格质量指标"""
        # 这里简化计算，实际应该计算各种质量指标
        node_count = mesh_data['node_count']
        element_count = mesh_data['element_count']
        
        # 简单的质量指标
        aspect_ratio = 1.0  # 应该计算实际长宽比
        skewness = 0.1     # 应该计算实际偏斜度
        jacobian = 0.9     # 应该计算实际雅可比
        
        return {
            'aspect_ratio': aspect_ratio,
            'skewness': skewness,
            'jacobian': jacobian,
            'node_count': node_count,
            'element_count': element_count
        }

class ParameterToGeometryMapper:
    """参数到几何的映射器"""
    
    def __init__(self, gmsh_kernel: GmshOCCKernel):
        self.gmsh_kernel = gmsh_kernel
        self.parameter_cache = {}
        
    async def map_parameters_to_geometry(self, parameters: Dict[str, Any]) -> List[GeometryFeature]:
        """将参数映射到几何"""
        # 计算参数哈希用于缓存
        param_hash = self._calculate_parameter_hash(parameters)
        
        if param_hash in self.parameter_cache:
            logger.info("使用缓存的几何")
            return self.parameter_cache[param_hash]
        
        geometry_features = []
        
        # 1. 创建基坑几何
        excavation_feature = await self.gmsh_kernel.create_excavation_geometry(parameters)
        geometry_features.append(excavation_feature)
        
        # 2. 创建土体几何
        soil_parameters = {
            'soil_depth': parameters.get('soil_depth', parameters.get('depth', 10) * 3),
            'soil_width': parameters.get('soil_width', parameters.get('width', 20) * 3),
            'soil_length': parameters.get('soil_length', parameters.get('length', 30) * 3)
        }
        soil_feature = await self.gmsh_kernel.create_soil_volume(excavation_feature, soil_parameters)
        geometry_features.append(soil_feature)
        
        # 3. 根据深度决定是否创建支护结构
        depth = parameters.get('depth', 0)
        if depth > 5:  # 深度大于5m需要支护
            # 创建地下连续墙
            wall_parameters = {
                'thickness': parameters.get('wall_thickness', 0.8),
                'depth': parameters.get('wall_depth', depth * 1.2)
            }
            wall_feature = await self.gmsh_kernel.create_diaphragm_wall(excavation_feature, wall_parameters)
            geometry_features.append(wall_feature)
            
            # 如果深度大于10m，创建锚杆
            if depth > 10:
                anchor_parameters = {
                    'levels': parameters.get('anchor_levels', [3, 6, 9]),
                    'length': parameters.get('anchor_length', 15),
                    'diameter': parameters.get('anchor_diameter', 0.15),
                    'spacing': parameters.get('anchor_spacing', 2.0)
                }
                anchor_feature = await self.gmsh_kernel.create_anchors(wall_feature, anchor_parameters)
                geometry_features.append(anchor_feature)
        
        # 4. 分配材料属性
        await self._assign_material_properties(parameters)
        
        # 缓存结果
        self.parameter_cache[param_hash] = geometry_features
        
        logger.info(f"参数映射完成: 创建了{len(geometry_features)}个几何特征")
        
        return geometry_features
    
    async def _assign_material_properties(self, parameters: Dict[str, Any]):
        """分配材料属性"""
        # 土体材料属性
        soil_properties = {
            'type': 'soil',
            'cohesion': parameters.get('cohesion', 20),
            'friction_angle': parameters.get('friction_angle', 25),
            'unit_weight': parameters.get('unit_weight', 18),
            'elastic_modulus': parameters.get('elastic_modulus', 10000),
            'poisson_ratio': parameters.get('poisson_ratio', 0.3)
        }
        await self.gmsh_kernel.assign_material_properties('soil_volume', soil_properties)
        
        # 混凝土材料属性（地下连续墙）
        if 'diaphragm_wall' in self.gmsh_kernel.geometry_features:
            concrete_properties = {
                'type': 'concrete',
                'compressive_strength': parameters.get('concrete_strength', 30),
                'elastic_modulus': parameters.get('concrete_modulus', 30000),
                'poisson_ratio': parameters.get('concrete_poisson', 0.2),
                'unit_weight': parameters.get('concrete_weight', 25)
            }
            await self.gmsh_kernel.assign_material_properties('diaphragm_wall', concrete_properties)
        
        # 钢材属性（锚杆）
        if 'anchors' in self.gmsh_kernel.geometry_features:
            steel_properties = {
                'type': 'steel',
                'yield_strength': parameters.get('steel_yield', 400),
                'elastic_modulus': parameters.get('steel_modulus', 200000),
                'poisson_ratio': parameters.get('steel_poisson', 0.3),
                'unit_weight': parameters.get('steel_weight', 78.5)
            }
            await self.gmsh_kernel.assign_material_properties('anchors', steel_properties)
    
    def _calculate_parameter_hash(self, parameters: Dict[str, Any]) -> str:
        """计算参数哈希"""
        # 只考虑几何相关的参数
        geo_params = {
            'depth': parameters.get('depth'),
            'width': parameters.get('width'),
            'length': parameters.get('length'),
            'wall_thickness': parameters.get('wall_thickness'),
            'anchor_levels': parameters.get('anchor_levels')
        }
        
        param_str = json.dumps(geo_params, sort_keys=True)
        return hashlib.md5(param_str.encode()).hexdigest()

class GmshDataExporter:
    """Gmsh数据导出器"""
    
    def __init__(self, gmsh_kernel: GmshOCCKernel):
        self.gmsh_kernel = gmsh_kernel
        
    async def export_to_vtk(self, filename: str):
        """导出到VTK格式"""
        gmsh.write(filename)
        logger.info(f"导出VTK文件: {filename}")
    
    async def export_to_msh(self, filename: str):
        """导出到MSH格式"""
        gmsh.write(filename)
        logger.info(f"导出MSH文件: {filename}")
    
    async def export_geometry_to_step(self, filename: str):
        """导出几何到STEP格式"""
        # 只导出几何，不包括网格
        gmsh.model.occ.synchronize()
        gmsh.write(filename)
        logger.info(f"导出STEP文件: {filename}")
    
    async def export_to_json(self, filename: str) -> Dict[str, Any]:
        """导出到JSON格式"""
        export_data = {
            'geometry_features': {},
            'material_properties': self.gmsh_kernel.material_properties,
            'model_info': {
                'name': gmsh.model.getCurrent(),
                'dimension': 3
            }
        }
        
        # 导出几何特征
        for name, feature in self.gmsh_kernel.geometry_features.items():
            export_data['geometry_features'][name] = {
                'name': feature.name,
                'type': feature.geometry_type.value,
                'parameters': feature.parameters,
                'gmsh_tags': feature.gmsh_tags,
                'material_id': feature.material_id
            }
        
        # 写入文件
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)
        
        logger.info(f"导出JSON文件: {filename}")
        
        return export_data

# 使用示例
async def main():
    """测试示例"""
    # 初始化Gmsh内核
    gmsh_kernel = GmshOCCKernel()
    await gmsh_kernel.initialize()
    
    # 创建参数映射器
    mapper = ParameterToGeometryMapper(gmsh_kernel)
    
    # 测试参数
    parameters = {
        'depth': 15.0,
        'width': 20.0,
        'length': 30.0,
        'wall_thickness': 0.8,
        'anchor_levels': [3, 6, 9, 12],
        'cohesion': 20,
        'friction_angle': 25,
        'unit_weight': 18
    }
    
    # 映射参数到几何
    geometry_features = await mapper.map_parameters_to_geometry(parameters)
    print(f"创建了{len(geometry_features)}个几何特征")
    
    # 生成网格
    mesh_generator = GmshMeshGenerator(gmsh_kernel)
    mesh_strategy = MeshStrategy(
        element_size=2.0,
        element_type='tetrahedron',
        refinement_zones=[
            {'type': 'sphere', 'center': [0, 0, -7.5], 'radius': 5.0, 'size': 0.5}
        ],
        quality_targets={'aspect_ratio': 3.0, 'skewness': 0.8}
    )
    
    mesh_result = await mesh_generator.generate_mesh(mesh_strategy)
    print(f"网格生成完成: {mesh_result['mesh_data']['element_count']}个单元")
    
    # 导出数据
    exporter = GmshDataExporter(gmsh_kernel)
    await exporter.export_to_json('test_model.json')
    
    # 清理
    gmsh.finalize()

if __name__ == "__main__":
    asyncio.run(main()) 