"""
基于GMSH OCC的临近建筑物简化建模
矩形底板 + 均匀布桩 + 外间距 → 建筑物3D模型
2号几何专家 - 与地质建模统一技术栈
"""

import gmsh
import numpy as np
import logging
import math
from typing import List, Dict, Tuple, Any, Optional

logger = logging.getLogger(__name__)

class GMSHOCCBuildingBuilder:
    """GMSH OCC临近建筑物构建器"""
    
    def __init__(self):
        self.model_name = "BuildingModel"
        self.foundation_volumes = {}   # 存储基础体
        self.pile_volumes = {}         # 存储桩体
        self.building_volumes = {}     # 存储建筑物体
        self.physical_groups = {}
        
    def initialize_gmsh(self):
        """初始化GMSH环境"""
        try:
            gmsh.initialize()
            gmsh.clear()
            gmsh.model.add(self.model_name)
            logger.info("✓ GMSH OCC建筑物建模环境初始化完成")
        except Exception as e:
            logger.error(f"GMSH初始化失败: {e}")
            raise
    
    def create_rectangular_foundation(self,
                                    center_x: float,
                                    center_y: float,
                                    length: float,
                                    width: float,
                                    top_elevation: float = 0.0,
                                    thickness: float = 1.0) -> int:
        """
        创建矩形底板基础
        
        Args:
            center_x: 中心X坐标(m)
            center_y: 中心Y坐标(m)  
            length: 长度(m)
            width: 宽度(m)
            top_elevation: 顶面标高(m)
            thickness: 厚度(m)
            
        Returns:
            基础体标签
        """
        try:
            # 创建矩形底板
            foundation_box = gmsh.model.occ.addBox(
                center_x - length/2,        # x起点
                center_y - width/2,         # y起点  
                top_elevation - thickness,  # z起点
                length,                     # x长度
                width,                      # y长度
                thickness                   # z长度
            )
            
            self.foundation_volumes['main_foundation'] = foundation_box
            
            logger.info(f"✓ 创建矩形基础: {length}×{width}×{thickness}m, 中心({center_x}, {center_y})")
            
            return foundation_box
            
        except Exception as e:
            logger.error(f"创建矩形基础失败: {e}")
            raise
    
    def create_uniform_pile_layout(self,
                                 foundation_center_x: float,
                                 foundation_center_y: float,
                                 foundation_length: float,
                                 foundation_width: float,
                                 spacing_x: float,
                                 spacing_y: float,
                                 edge_distance: float,
                                 pile_diameter: float,
                                 pile_length: float,
                                 pile_top_elevation: float = 0.0) -> List[int]:
        """
        创建均匀布桩
        
        Args:
            foundation_center_x: 基础中心X坐标
            foundation_center_y: 基础中心Y坐标
            foundation_length: 基础长度
            foundation_width: 基础宽度
            spacing_x: X方向桩间距(m)
            spacing_y: Y方向桩间距(m)
            edge_distance: 外间距(m) - 桩到基础边缘的距离
            pile_diameter: 桩径(mm)
            pile_length: 桩长(m)
            pile_top_elevation: 桩顶标高(m)
            
        Returns:
            桩体标签列表
        """
        try:
            pile_radius = pile_diameter / 2000.0  # mm转m
            
            # 计算有效布桩区域
            effective_length = foundation_length - 2 * edge_distance
            effective_width = foundation_width - 2 * edge_distance
            
            if effective_length <= 0 or effective_width <= 0:
                raise ValueError(f"外间距{edge_distance}m过大，有效布桩区域为负")
            
            # 计算桩数量
            piles_x = max(1, int(effective_length / spacing_x) + 1)
            piles_y = max(1, int(effective_width / spacing_y) + 1)
            
            # 计算实际间距(均匀分布)
            actual_spacing_x = effective_length / (piles_x - 1) if piles_x > 1 else 0
            actual_spacing_y = effective_width / (piles_y - 1) if piles_y > 1 else 0
            
            # 计算起始位置
            start_x = foundation_center_x - effective_length/2
            start_y = foundation_center_y - effective_width/2
            
            pile_volumes = []
            pile_positions = []
            
            # 生成桩位
            for i in range(piles_x):
                for j in range(piles_y):
                    # 计算桩中心坐标
                    pile_x = start_x + i * actual_spacing_x
                    pile_y = start_y + j * actual_spacing_y
                    pile_z_top = pile_top_elevation
                    pile_z_bottom = pile_top_elevation - pile_length
                    
                    # 创建桩体(圆柱)
                    pile_volume = gmsh.model.occ.addCylinder(
                        pile_x, pile_y, pile_z_bottom,  # 底部中心
                        0, 0, pile_length,              # 高度向量
                        pile_radius                     # 半径
                    )
                    
                    pile_volumes.append(pile_volume)
                    pile_positions.append((pile_x, pile_y, pile_z_top, pile_z_bottom))
            
            # Save pile information
            self.pile_volumes['piles'] = pile_volumes
            
            logger.info(f"✓ Created uniform pile layout: {piles_x}×{piles_y}={len(pile_volumes)} piles")
            logger.info(f"   Pile diameter: Φ{pile_diameter}mm, Pile length: {pile_length}m")
            logger.info(f"   Actual spacing: X={actual_spacing_x:.2f}m, Y={actual_spacing_y:.2f}m")
            logger.info(f"   Edge distance: {edge_distance}m")\n            \n            return pile_volumes\n            \n        except Exception as e:\n            logger.error(f\"创建均匀布桩失败: {e}\")\n            raise\n    \n    def create_building_superstructure(self,\n                                     foundation_center_x: float,\n                                     foundation_center_y: float,\n                                     foundation_length: float,\n                                     foundation_width: float,\n                                     foundation_top_elevation: float,\n                                     building_height: float,\n                                     floors: int = 15) -> int:\n        \"\"\"\n        创建建筑物上部结构(简化为长方体)\n        \n        Args:\n            foundation_center_x: 基础中心X坐标\n            foundation_center_y: 基础中心Y坐标\n            foundation_length: 基础长度\n            foundation_width: 基础宽度  \n            foundation_top_elevation: 基础顶面标高\n            building_height: 建筑物高度(m)\n            floors: 楼层数\n            \n        Returns:\n            建筑物体标签\n        \"\"\"\n        try:\n            # 建筑物通常比基础小一些\n            building_length = foundation_length * 0.9\n            building_width = foundation_width * 0.9\n            \n            # 创建建筑物长方体\n            building_volume = gmsh.model.occ.addBox(\n                foundation_center_x - building_length/2,  # x起点\n                foundation_center_y - building_width/2,   # y起点\n                foundation_top_elevation,                 # z起点 \n                building_length,                          # x长度\n                building_width,                           # y长度\n                building_height                           # z长度\n            )\n            \n            self.building_volumes['main_building'] = building_volume\n            \n            logger.info(f\"✓ 创建建筑物上部结构: {building_length:.1f}×{building_width:.1f}×{building_height}m\")\n            logger.info(f\"   楼层数: {floors}层, 平均层高: {building_height/floors:.2f}m\")\n            \n            return building_volume\n            \n        except Exception as e:\n            logger.error(f\"创建建筑物上部结构失败: {e}\")\n            raise\n    \n    def calculate_safety_distance(self,\n                                building_center_x: float,\n                                building_center_y: float,\n                                building_length: float,\n                                building_width: float,\n                                excavation_boundary: List[Tuple[float, float]]) -> Dict[str, float]:\n        \"\"\"\n        计算建筑物到基坑的安全距离\n        \n        Args:\n            building_center_x: 建筑物中心X坐标\n            building_center_y: 建筑物中心Y坐标\n            building_length: 建筑物长度\n            building_width: 建筑物宽度\n            excavation_boundary: 基坑边界点列表\n            \n        Returns:\n            距离信息字典\n        \"\"\"\n        try:\n            # 建筑物角点\n            building_corners = [\n                (building_center_x - building_length/2, building_center_y - building_width/2),\n                (building_center_x + building_length/2, building_center_y - building_width/2),\n                (building_center_x + building_length/2, building_center_y + building_width/2),\n                (building_center_x - building_length/2, building_center_y + building_width/2)\n            ]\n            \n            min_distance = float('inf')\n            closest_building_point = None\n            closest_excavation_point = None\n            \n            # 计算建筑物各角点到基坑边界的最短距离\n            for bx, by in building_corners:\n                for ex, ey in excavation_boundary:\n                    distance = math.sqrt((bx - ex)**2 + (by - ey)**2)\n                    if distance < min_distance:\n                        min_distance = distance\n                        closest_building_point = (bx, by)\n                        closest_excavation_point = (ex, ey)\n            \n            # 判断安全等级\n            if min_distance >= 20.0:\n                safety_level = \"安全\"\n                risk_color = \"green\"\n            elif min_distance >= 10.0:\n                safety_level = \"注意\"\n                risk_color = \"yellow\"\n            elif min_distance >= 5.0:\n                safety_level = \"警告\"\n                risk_color = \"orange\"\n            else:\n                safety_level = \"危险\"\n                risk_color = \"red\"\n            \n            result = {\n                'min_distance': min_distance,\n                'safety_level': safety_level,\n                'risk_color': risk_color,\n                'closest_building_point': closest_building_point,\n                'closest_excavation_point': closest_excavation_point\n            }\n            \n            logger.info(f\"✓ 安全距离分析: {min_distance:.2f}m - {safety_level}\")\n            \n            return result\n            \n        except Exception as e:\n            logger.error(f\"安全距离计算失败: {e}\")\n            return {\n                'min_distance': 0.0,\n                'safety_level': \"未知\",\n                'risk_color': \"gray\",\n                'closest_building_point': None,\n                'closest_excavation_point': None\n            }\n    \n    def define_building_physical_groups(self,\n                                      foundation_volume: int,\n                                      pile_volumes: List[int],\n                                      building_volume: int,\n                                      building_materials: Dict[str, Dict[str, Any]]) -> Dict[str, int]:\n        \"\"\"\n        定义建筑物物理组\n        \n        Args:\n            foundation_volume: 基础体标签\n            pile_volumes: 桩体标签列表\n            building_volume: 建筑物体标签\n            building_materials: 材料信息\n            \n        Returns:\n            物理组映射\n        \"\"\"\n        try:\n            physical_groups = {}\n            \n            # 基础物理组\n            if foundation_volume:\n                foundation_group_id = 4000\n                gmsh.model.addPhysicalGroup(3, [foundation_volume], foundation_group_id)\n                gmsh.model.setPhysicalName(3, foundation_group_id, \"Foundation\")\n                physical_groups['foundation'] = foundation_group_id\n            \n            # 桩基物理组\n            if pile_volumes:\n                pile_group_id = 4001\n                gmsh.model.addPhysicalGroup(3, pile_volumes, pile_group_id)\n                gmsh.model.setPhysicalName(3, pile_group_id, \"Piles\")\n                physical_groups['piles'] = pile_group_id\n            \n            # 建筑物物理组\n            if building_volume:\n                building_group_id = 4002\n                gmsh.model.addPhysicalGroup(3, [building_volume], building_group_id)\n                gmsh.model.setPhysicalName(3, building_group_id, \"Building\")\n                physical_groups['building'] = building_group_id\n            \n            self.physical_groups = physical_groups\n            \n            logger.info(f\"✓ 定义建筑物物理组: {len(physical_groups)}个组\")\n            \n            return physical_groups\n            \n        except Exception as e:\n            logger.error(f\"定义物理组失败: {e}\")\n            raise\n    \n    def generate_building_mesh(self, mesh_size: float = 2.0) -> str:\n        \"\"\"生成建筑物网格\"\"\"\n        try:\n            # 设置网格参数\n            gmsh.option.setNumber(\"Mesh.CharacteristicLengthMax\", mesh_size)\n            gmsh.option.setNumber(\"Mesh.CharacteristicLengthMin\", mesh_size * 0.5)\n            gmsh.option.setNumber(\"Mesh.Algorithm\", 6)\n            gmsh.option.setNumber(\"Mesh.Algorithm3D\", 10)\n            \n            # 生成网格\n            logger.info(\"🔄 开始生成建筑物网格...\")\n            gmsh.model.mesh.generate(3)\n            \n            # 保存网格\n            mesh_file = f\"building_mesh_{self.model_name}.msh\"\n            gmsh.write(mesh_file)\n            \n            # 统计信息\n            node_count = len(gmsh.model.mesh.getNodes()[0])\n            element_info = gmsh.model.mesh.getElements()\n            element_count = sum(len(elements) for elements in element_info[2]) if element_info[2] else 0\n            \n            logger.info(f\"✓ 建筑物网格生成完成: {node_count}节点, {element_count}单元\")\n            return mesh_file\n            \n        except Exception as e:\n            logger.error(f\"建筑物网格生成失败: {e}\")\n            raise\n    \n    def build_complete_building_model(self,\n                                    building_config: Dict[str, Any]) -> Dict[str, Any]:\n        \"\"\"\n        完整的临近建筑物建模流程\n        \n        Args:\n            building_config: 建筑物配置参数\n            \n        Returns:\n            建模结果字典\n        \"\"\"\n        try:\n            # 1. 初始化GMSH\n            self.initialize_gmsh()\n            \n            # 2. 创建矩形基础\n            foundation_volume = self.create_rectangular_foundation(\n                center_x=building_config['foundation']['center_x'],\n                center_y=building_config['foundation']['center_y'],\n                length=building_config['foundation']['length'],\n                width=building_config['foundation']['width'],\n                top_elevation=building_config['foundation'].get('top_elevation', 0.0),\n                thickness=building_config['foundation'].get('thickness', 1.0)\n            )\n            \n            # 3. 创建均匀布桩\n            pile_volumes = self.create_uniform_pile_layout(\n                foundation_center_x=building_config['foundation']['center_x'],\n                foundation_center_y=building_config['foundation']['center_y'],\n                foundation_length=building_config['foundation']['length'],\n                foundation_width=building_config['foundation']['width'],\n                spacing_x=building_config['piles']['spacing_x'],\n                spacing_y=building_config['piles']['spacing_y'],\n                edge_distance=building_config['piles']['edge_distance'],\n                pile_diameter=building_config['piles']['diameter'],\n                pile_length=building_config['piles']['length'],\n                pile_top_elevation=building_config['piles'].get('top_elevation', 0.0)\n            )\n            \n            # 4. 创建建筑物上部结构\n            building_volume = self.create_building_superstructure(\n                foundation_center_x=building_config['foundation']['center_x'],\n                foundation_center_y=building_config['foundation']['center_y'],\n                foundation_length=building_config['foundation']['length'],\n                foundation_width=building_config['foundation']['width'],\n                foundation_top_elevation=building_config['foundation'].get('top_elevation', 0.0),\n                building_height=building_config['building']['height'],\n                floors=building_config['building'].get('floors', 15)\n            )\n            \n            # 5. 定义物理组\n            building_materials = building_config.get('materials', {})\n            physical_groups = self.define_building_physical_groups(\n                foundation_volume, pile_volumes, building_volume, building_materials\n            )\n            \n            # 6. 计算安全距离\n            safety_info = {}\n            if 'excavation_boundary' in building_config:\n                safety_info = self.calculate_safety_distance(\n                    building_center_x=building_config['foundation']['center_x'],\n                    building_center_y=building_config['foundation']['center_y'],\n                    building_length=building_config['foundation']['length'],\n                    building_width=building_config['foundation']['width'],\n                    excavation_boundary=building_config['excavation_boundary']\n                )\n            \n            # 7. 同步几何\n            gmsh.model.occ.synchronize()\n            \n            # 8. 生成网格\n            mesh_file = self.generate_building_mesh(\n                mesh_size=building_config.get('mesh_size', 2.0)\n            )\n            \n            result = {\n                'success': True,\n                'building_name': building_config.get('name', 'DefaultBuilding'),\n                'foundation_volume': foundation_volume,\n                'pile_volumes': pile_volumes,\n                'pile_count': len(pile_volumes),\n                'building_volume': building_volume,\n                'physical_groups': physical_groups,\n                'safety_info': safety_info,\n                'mesh_file': mesh_file\n            }\n            \n            logger.info(\"🎉 临近建筑物建模完成!\")\n            return result\n            \n        except Exception as e:\n            logger.error(f\"临近建筑物建模失败: {e}\")\n            return {\n                'success': False,\n                'error': str(e)\n            }\n    \n    def finalize(self):\n        \"\"\"清理GMSH环境\"\"\"\n        try:\n            gmsh.finalize()\n            logger.info(\"✓ GMSH建筑物建模环境清理完成\")\n        except:\n            pass\n\n# 全局构建器实例\nbuilding_builder = GMSHOCCBuildingBuilder()"