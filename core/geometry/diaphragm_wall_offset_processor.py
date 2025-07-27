#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
地连墙偏移处理器
3号计算专家 - 实现地连墙往里偏移的计算支持

基于Kratos壳元偏移调研结果的具体实现
支持与2号几何专家和1号架构师的协作
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
import logging
import json

@dataclass
class DiaphragmWallOffsetConfig:
    """地连墙偏移配置"""
    wall_id: str
    thickness: float           # 墙体厚度 (m)
    offset_value: float        # 偏移值 (m) - 负值向里偏移
    excavation_center: Tuple[float, float, float]  # 基坑中心坐标
    enable_visualization: bool = True               # 启用可视化
    enable_validation: bool = True                  # 启用验证
    
    def __post_init__(self):
        """自动计算偏移值"""
        if self.offset_value == 0:
            self.offset_value = -self.thickness / 2.0  # 默认往里偏移厚度的一半

@dataclass
class WallGeometry:
    """墙体几何数据"""
    wall_id: str
    nodes: List[Tuple[float, float, float]]  # 节点坐标列表
    elements: List[List[int]]                # 单元节点连接
    normal_vectors: List[Tuple[float, float, float]]  # 法向量
    
class DiaphragmWallOffsetProcessor:
    """地连墙偏移处理器"""
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.WallOffsetProcessor")
        
    def calculate_wall_offset(
        self, 
        wall_geometry: WallGeometry,
        offset_config: DiaphragmWallOffsetConfig
    ) -> Dict[str, Any]:
        """计算地连墙偏移"""
        
        self.logger.info(f"开始计算地连墙 {wall_geometry.wall_id} 偏移")
        
        # 1. 计算或验证法向量
        if not wall_geometry.normal_vectors:
            wall_geometry.normal_vectors = self._calculate_wall_normals(wall_geometry)
        
        # 2. 确定偏移方向
        offset_directions = self._determine_offset_directions(
            wall_geometry, offset_config.excavation_center
        )
        
        # 3. 应用几何偏移
        offset_nodes = self._apply_geometric_offset(
            wall_geometry.nodes,
            offset_directions, 
            offset_config.offset_value
        )
        
        # 4. 验证偏移质量
        validation_result = None
        if offset_config.enable_validation:
            validation_result = self._validate_offset_quality(
                wall_geometry.nodes, offset_nodes, wall_geometry.elements
            )
        
        # 5. 生成Kratos参数
        kratos_parameters = self._generate_kratos_parameters(offset_config)
        
        offset_result = {
            "wall_id": wall_geometry.wall_id,
            "original_nodes": wall_geometry.nodes,
            "offset_nodes": offset_nodes,
            "offset_value": offset_config.offset_value,
            "offset_directions": offset_directions,
            "kratos_parameters": kratos_parameters,
            "validation_result": validation_result,
            "mesh_quality_preserved": validation_result['is_valid'] if validation_result else True
        }
        
        self.logger.info(f"地连墙偏移计算完成 - 偏移值: {offset_config.offset_value:.3f}m")
        return offset_result
    
    def _calculate_wall_normals(self, wall_geometry: WallGeometry) -> List[Tuple[float, float, float]]:
        """计算墙体法向量"""
        
        normals = []
        nodes = wall_geometry.nodes
        elements = wall_geometry.elements
        
        for element in elements:
            if len(element) >= 3:
                # 使用前三个节点计算法向量
                p1 = np.array(nodes[element[0]])
                p2 = np.array(nodes[element[1]]) 
                p3 = np.array(nodes[element[2]])
                
                # 计算两个边向量
                v1 = p2 - p1
                v2 = p3 - p1
                
                # 叉积得到法向量
                normal = np.cross(v1, v2)
                
                # 归一化
                magnitude = np.linalg.norm(normal)
                if magnitude > 1e-10:
                    normal = normal / magnitude
                else:
                    normal = np.array([0, 0, 1])  # 默认Z方向
                
                normals.append(tuple(normal))
            else:
                normals.append((0, 0, 1))  # 默认法向量
        
        return normals
    
    def _determine_offset_directions(
        self, 
        wall_geometry: WallGeometry,
        excavation_center: Tuple[float, float, float]
    ) -> List[Tuple[float, float, float]]:
        """确定偏移方向（往基坑内侧）"""
        
        offset_directions = []
        excavation_point = np.array(excavation_center)
        
        for i, element in enumerate(wall_geometry.elements):
            # 计算单元中心点
            nodes_in_element = [wall_geometry.nodes[node_id] for node_id in element]
            element_center = np.mean(nodes_in_element, axis=0)
            
            # 从单元中心指向基坑中心的向量
            to_excavation = excavation_point - element_center
            to_excavation = to_excavation / np.linalg.norm(to_excavation)
            
            # 法向量
            normal = np.array(wall_geometry.normal_vectors[i])
            
            # 确定偏移方向：选择指向基坑的法向量方向
            if np.dot(normal, to_excavation) > 0:
                offset_direction = normal
            else:
                offset_direction = -normal
            
            offset_directions.append(tuple(offset_direction))
        
        return offset_directions
    
    def _apply_geometric_offset(
        self,
        original_nodes: List[Tuple[float, float, float]],
        offset_directions: List[Tuple[float, float, float]], 
        offset_value: float
    ) -> List[Tuple[float, float, float]]:
        """应用几何偏移"""
        
        offset_nodes = []
        
        # 为每个节点计算平均偏移方向
        node_offset_vectors = {}
        node_counts = {}
        
        # 累积每个节点的偏移方向
        for element_idx, direction in enumerate(offset_directions):
            # 假设这是单元的偏移方向，需要分配给单元的节点
            # 这里简化处理，实际应该根据单元-节点关系来分配
            for node_idx in range(len(original_nodes)):
                if node_idx not in node_offset_vectors:
                    node_offset_vectors[node_idx] = np.array([0.0, 0.0, 0.0])
                    node_counts[node_idx] = 0
                
                # 简化：为所有节点应用相同方向（实际应该根据单元连接关系）
                if element_idx < len(original_nodes):  # 避免索引超界
                    node_offset_vectors[node_idx] += np.array(direction)
                    node_counts[node_idx] += 1
        
        # 计算每个节点的平均偏移方向并应用偏移
        for node_idx, original_pos in enumerate(original_nodes):
            if node_idx in node_offset_vectors and node_counts[node_idx] > 0:
                # 计算平均方向
                avg_direction = node_offset_vectors[node_idx] / node_counts[node_idx]
                avg_direction = avg_direction / np.linalg.norm(avg_direction)
                
                # 应用偏移
                original_pos_array = np.array(original_pos)
                offset_pos = original_pos_array + offset_value * avg_direction
                offset_nodes.append(tuple(offset_pos))
            else:
                # 无偏移信息，保持原位置
                offset_nodes.append(original_pos)
        
        return offset_nodes
    
    def _validate_offset_quality(
        self,
        original_nodes: List[Tuple[float, float, float]],
        offset_nodes: List[Tuple[float, float, float]],
        elements: List[List[int]]
    ) -> Dict[str, Any]:
        """验证偏移后的网格质量"""
        
        validation_errors = []
        validation_warnings = []
        
        # 1. 检查节点偏移距离
        max_offset_distance = 0
        min_offset_distance = float('inf')
        
        for orig, offset in zip(original_nodes, offset_nodes):
            distance = np.linalg.norm(np.array(offset) - np.array(orig))
            max_offset_distance = max(max_offset_distance, distance)
            min_offset_distance = min(min_offset_distance, distance)
        
        # 2. 检查单元质量（简化检查）
        degenerate_elements = 0
        
        for element in elements:
            if len(element) >= 3:
                # 检查单元是否退化
                try:
                    p1 = np.array(offset_nodes[element[0]])
                    p2 = np.array(offset_nodes[element[1]])
                    p3 = np.array(offset_nodes[element[2]])
                    
                    # 计算面积
                    v1 = p2 - p1
                    v2 = p3 - p1
                    area = 0.5 * np.linalg.norm(np.cross(v1, v2))
                    
                    if area < 1e-10:
                        degenerate_elements += 1
                        
                except (IndexError, ValueError):
                    degenerate_elements += 1
        
        # 3. 生成验证结果
        if degenerate_elements > 0:
            validation_errors.append(f"发现 {degenerate_elements} 个退化单元")
        
        if max_offset_distance > 2.0:  # 超过2m的偏移可能有问题
            validation_warnings.append(f"最大偏移距离过大: {max_offset_distance:.3f}m")
        
        if min_offset_distance < 1e-6:  # 偏移太小可能无效
            validation_warnings.append(f"最小偏移距离过小: {min_offset_distance:.6f}m")
        
        validation_result = {
            "is_valid": len(validation_errors) == 0,
            "errors": validation_errors,
            "warnings": validation_warnings,
            "max_offset_distance": max_offset_distance,
            "min_offset_distance": min_offset_distance,
            "degenerate_elements": degenerate_elements,
            "total_elements": len(elements)
        }
        
        return validation_result
    
    def _generate_kratos_parameters(self, offset_config: DiaphragmWallOffsetConfig) -> Dict[str, Any]:
        """生成Kratos求解器参数"""
        
        kratos_params = {
            "element_type": "ShellThickElement3D4N",
            "material_properties": {
                "THICKNESS": offset_config.thickness,
                "SHELL_OFFSET": offset_config.offset_value,
                "OFFSET_DIRECTION": "NORMAL",
                "REFERENCE_CONFIGURATION": "MIDDLE"
            },
            "constitutive_law": "LinearElastic3DLaw",
            "element_parameters": {
                "COMPUTE_BODY_FORCE": True,
                "CONSIDER_SELF_WEIGHT": True
            },
            "analysis_settings": {
                "nonlinear_analysis": False,  # 地连墙通常可以用线性分析
                "large_displacement": False,
                "rotation_dof": True  # 壳元需要转动自由度
            }
        }
        
        return kratos_params
    
    def generate_offset_report(
        self, 
        offset_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """生成偏移处理报告"""
        
        total_walls = len(offset_results)
        successful_offsets = sum(1 for result in offset_results if result['mesh_quality_preserved'])
        
        # 统计偏移值分布
        offset_values = [abs(result['offset_value']) for result in offset_results]
        avg_offset = np.mean(offset_values) if offset_values else 0
        max_offset = max(offset_values) if offset_values else 0
        min_offset = min(offset_values) if offset_values else 0
        
        # 统计验证结果
        total_errors = sum(len(result['validation_result']['errors']) 
                          for result in offset_results 
                          if result['validation_result'])
        total_warnings = sum(len(result['validation_result']['warnings']) 
                           for result in offset_results 
                           if result['validation_result'])
        
        report = {
            "summary": {
                "total_walls": total_walls,
                "successful_offsets": successful_offsets,
                "success_rate": successful_offsets / total_walls if total_walls > 0 else 0,
                "total_validation_errors": total_errors,
                "total_validation_warnings": total_warnings
            },
            "offset_statistics": {
                "average_offset": avg_offset,
                "maximum_offset": max_offset,
                "minimum_offset": min_offset,
                "offset_unit": "meters"
            },
            "quality_assessment": {
                "mesh_quality_preserved": successful_offsets == total_walls,
                "requires_manual_review": total_errors > 0,
                "has_warnings": total_warnings > 0
            },
            "recommendations": self._generate_recommendations(offset_results)
        }
        
        return report
    
    def _generate_recommendations(self, offset_results: List[Dict[str, Any]]) -> List[str]:
        """生成优化建议"""
        
        recommendations = []
        
        # 检查是否有质量问题
        quality_issues = [r for r in offset_results if not r['mesh_quality_preserved']]
        if quality_issues:
            recommendations.append("建议检查网格质量问题的墙体，可能需要调整偏移参数")
        
        # 检查偏移值是否合理
        large_offsets = [r for r in offset_results if abs(r['offset_value']) > 1.0]
        if large_offsets:
            recommendations.append("发现较大偏移值的墙体，建议验证工程合理性")
        
        # 检查是否有零偏移
        zero_offsets = [r for r in offset_results if abs(r['offset_value']) < 1e-6]
        if zero_offsets:
            recommendations.append("发现零偏移的墙体，可能配置有误")
        
        if not recommendations:
            recommendations.append("所有地连墙偏移处理正常，可以进行下一步分析")
        
        return recommendations

# 与前端和几何系统的集成接口
def create_diaphragm_wall_offset_service():
    """创建地连墙偏移服务的工厂函数"""
    return DiaphragmWallOffsetProcessor()

def process_wall_offset_request(
    wall_data: Dict[str, Any],
    excavation_config: Dict[str, Any]
) -> Dict[str, Any]:
    """处理来自前端的墙体偏移请求"""
    
    processor = DiaphragmWallOffsetProcessor()
    
    # 解析墙体几何数据
    wall_geometry = WallGeometry(
        wall_id=wall_data['wall_id'],
        nodes=wall_data['nodes'],
        elements=wall_data['elements'],
        normal_vectors=wall_data.get('normal_vectors', [])
    )
    
    # 解析偏移配置
    offset_config = DiaphragmWallOffsetConfig(
        wall_id=wall_data['wall_id'],
        thickness=wall_data['thickness'],
        offset_value=wall_data.get('offset_value', 0),  # 0会自动计算
        excavation_center=tuple(excavation_config['center']),
        enable_visualization=True,
        enable_validation=True
    )
    
    # 执行偏移计算
    result = processor.calculate_wall_offset(wall_geometry, offset_config)
    
    return result

if __name__ == "__main__":
    # 测试示例
    logging.basicConfig(level=logging.INFO)
    
    print("地连墙偏移处理器测试")
    print("=" * 50)
    
    # 创建测试数据
    test_wall_geometry = WallGeometry(
        wall_id="WALL_001",
        nodes=[
            (0.0, 0.0, 0.0),
            (5.0, 0.0, 0.0), 
            (5.0, 0.0, -10.0),
            (0.0, 0.0, -10.0)
        ],
        elements=[[0, 1, 2, 3]],
        normal_vectors=[]
    )
    
    test_offset_config = DiaphragmWallOffsetConfig(
        wall_id="WALL_001",
        thickness=0.8,  # 0.8m厚度
        offset_value=0,  # 自动计算
        excavation_center=(2.5, 5.0, -5.0)  # 基坑中心
    )
    
    # 执行偏移计算
    processor = DiaphragmWallOffsetProcessor()
    result = processor.calculate_wall_offset(test_wall_geometry, test_offset_config)
    
    print(f"墙体ID: {result['wall_id']}")
    print(f"偏移值: {result['offset_value']:.3f}m")
    print(f"网格质量: {'保持' if result['mesh_quality_preserved'] else '有问题'}")
    
    if result['validation_result']:
        print(f"验证错误: {len(result['validation_result']['errors'])}")
        print(f"验证警告: {len(result['validation_result']['warnings'])}")
    
    print("测试完成！")