#!/usr/bin/env python3
"""
网格尺寸建议合理性验证
3号计算专家对2号几何专家建议的技术验证
"""

import numpy as np
from typing import Dict, Any, List, Tuple
import json

class MeshSizeValidator:
    """网格尺寸建议验证器"""
    
    def __init__(self):
        # 基于深基坑工程经验的网格尺寸标准
        self.engineering_standards = {
            'excavation_depth': {
                'shallow': (0, 5),      # 0-5m: 浅基坑
                'medium': (5, 15),      # 5-15m: 中等深度
                'deep': (15, 30),       # 15-30m: 深基坑
                'ultra_deep': (30, 100) # 30m以上: 超深基坑
            },
            'element_size_ratio': {
                'shallow': 0.2,     # 基坑深度的1/5
                'medium': 0.15,     # 基坑深度的1/6.7
                'deep': 0.1,        # 基坑深度的1/10
                'ultra_deep': 0.05  # 基坑深度的1/20
            },
            'computational_limits': {
                'max_elements_32gb': 2000000,   # 32GB内存限制
                'max_elements_16gb': 1000000,   # 16GB内存限制
                'max_elements_8gb': 500000,     # 8GB内存限制
            }
        }
    
    def validate_geometry_mesh_guidance(self, geometry_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        验证2号提供的网格尺寸建议
        
        Args:
            geometry_data: 2号提供的几何数据，包含meshGuidance
            
        Returns:
            验证结果和3号的修正建议
        """
        
        mesh_guidance = geometry_data.get('meshGuidance', {})
        suggested_size = mesh_guidance.get('suggestedElementSize', 2.0)
        refinement_zones = mesh_guidance.get('refinementZones', [])
        
        # 分析基坑几何特征
        excavation_analysis = self._analyze_excavation_geometry(geometry_data)
        
        # 验证基础网格尺寸
        size_validation = self._validate_base_element_size(
            suggested_size, excavation_analysis
        )
        
        # 验证细化区域设置
        refinement_validation = self._validate_refinement_zones(
            refinement_zones, excavation_analysis
        )
        
        # 计算资源评估
        resource_assessment = self._assess_computational_resources(
            suggested_size, refinement_zones, excavation_analysis
        )
        
        # 工程精度评估
        accuracy_assessment = self._assess_engineering_accuracy(
            suggested_size, excavation_analysis
        )
        
        return {
            'validation_results': {
                'base_size_valid': size_validation['valid'],
                'refinement_zones_valid': refinement_validation['valid'],
                'resource_feasible': resource_assessment['feasible'],
                'accuracy_sufficient': accuracy_assessment['sufficient']
            },
            'corrections': {
                'suggested_base_size': size_validation.get('corrected_size', suggested_size),
                'refined_zones': refinement_validation.get('corrected_zones', refinement_zones),
                'memory_optimized': resource_assessment.get('optimized_config', {})
            },
            'recommendations': {
                'size_adjustments': size_validation.get('recommendations', []),
                'refinement_improvements': refinement_validation.get('recommendations', []),
                'performance_notes': resource_assessment.get('recommendations', []),
                'accuracy_notes': accuracy_assessment.get('recommendations', [])
            },
            'validation_score': self._calculate_overall_score([
                size_validation, refinement_validation, 
                resource_assessment, accuracy_assessment
            ])
        }
    
    def _analyze_excavation_geometry(self, geometry_data: Dict[str, Any]) -> Dict[str, Any]:
        """分析开挖几何特征"""
        
        # 从几何数据提取基坑特征
        excavation_info = geometry_data.get('stageInfo', {})
        
        # 估算基坑深度（从boundingBox或stageInfo）
        depth = 10.0  # 默认值
        if 'stageInfo' in geometry_data:
            stage_volumes = excavation_info.get('stageVolumes', [])
            if stage_volumes:
                # 根据开挖体积估算深度
                total_volume = sum(stage_volumes)
                estimated_area = total_volume / len(stage_volumes) if stage_volumes else 100
                depth = max(stage_volumes) / estimated_area if estimated_area > 0 else 10.0
        
        # 确定基坑类型
        excavation_type = 'medium'
        for category, (min_depth, max_depth) in self.engineering_standards['excavation_depth'].items():
            if min_depth <= depth < max_depth:
                excavation_type = category
                break
        
        # 分析几何复杂度
        vertices_count = len(geometry_data.get('vertices', []))
        faces_count = len(geometry_data.get('faces', []))
        complexity_score = min(1.0, (vertices_count + faces_count) / 20000)
        
        return {
            'depth': depth,
            'type': excavation_type,
            'complexity_score': complexity_score,
            'vertices_count': vertices_count,
            'faces_count': faces_count,
            'estimated_volume': excavation_info.get('excavationVolume', depth * 100)
        }
    
    def _validate_base_element_size(
        self, 
        suggested_size: float, 
        excavation_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """验证基础网格尺寸"""
        
        depth = excavation_analysis['depth']
        excavation_type = excavation_analysis['type']
        complexity = excavation_analysis['complexity_score']
        
        # 基于工程标准的推荐尺寸
        standard_ratio = self.engineering_standards['element_size_ratio'][excavation_type]
        recommended_size = depth * standard_ratio
        
        # 复杂度修正
        complexity_factor = 1.0 - 0.3 * complexity  # 复杂几何需要更小的网格
        recommended_size *= complexity_factor
        
        # 验证2号的建议
        size_ratio = suggested_size / recommended_size
        valid = 0.7 <= size_ratio <= 1.5  # 允许30%的偏差
        
        recommendations = []
        corrected_size = suggested_size
        
        if size_ratio > 1.5:
            recommendations.append(f"建议网格尺寸过大，推荐减小到{recommended_size:.2f}m")
            corrected_size = recommended_size
        elif size_ratio < 0.7:
            recommendations.append(f"建议网格尺寸过小，可适当增大到{recommended_size:.2f}m以提高效率")
            corrected_size = recommended_size
        else:
            recommendations.append("网格尺寸设置合理")
        
        return {
            'valid': valid,
            'recommended_size': recommended_size,
            'corrected_size': corrected_size,
            'size_ratio': size_ratio,
            'recommendations': recommendations
        }
    
    def _validate_refinement_zones(
        self, 
        refinement_zones: List[Dict], 
        excavation_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """验证细化区域设置"""
        
        valid = True
        recommendations = []
        corrected_zones = refinement_zones.copy()
        
        for i, zone in enumerate(refinement_zones):
            zone_type = zone.get('region', 'unknown')
            target_size = zone.get('targetSize', 1.0)
            priority = zone.get('priority', 'medium')
            
            # 验证细化尺寸合理性
            if zone_type == 'corner':
                # 角落区域应该有最小的网格尺寸
                max_corner_size = excavation_analysis['depth'] * 0.05
                if target_size > max_corner_size:
                    recommendations.append(f"角落区域网格尺寸过大，建议小于{max_corner_size:.3f}m")
                    corrected_zones[i]['targetSize'] = max_corner_size
                    valid = False
            
            elif zone_type == 'contact':
                # 接触面区域需要中等细化
                max_contact_size = excavation_analysis['depth'] * 0.1
                if target_size > max_contact_size:
                    recommendations.append(f"接触面区域网格尺寸建议小于{max_contact_size:.3f}m")
                    corrected_zones[i]['targetSize'] = max_contact_size
        
        if not recommendations:
            recommendations.append("细化区域设置合理")
        
        return {
            'valid': valid,
            'corrected_zones': corrected_zones,
            'recommendations': recommendations
        }
    
    def _assess_computational_resources(
        self, 
        base_size: float, 
        refinement_zones: List[Dict], 
        excavation_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """评估计算资源需求"""
        
        # 估算单元数量
        estimated_volume = excavation_analysis['estimated_volume']
        base_element_volume = (base_size ** 3) / 6  # 四面体体积近似
        base_elements = int(estimated_volume / base_element_volume)
        
        # 考虑细化区域的影响
        refinement_factor = 1.0
        for zone in refinement_zones:
            zone_target_size = zone.get('targetSize', base_size)
            size_ratio = zone_target_size / base_size
            # 细化区域会增加总单元数
            refinement_factor += (1 / size_ratio**3 - 1) * 0.1  # 假设细化区域占10%
        
        total_elements = int(base_elements * refinement_factor)
        
        # 内存需求估算 (每个单元约需要200字节)
        estimated_memory_gb = total_elements * 200 / (1024**3)
        
        # 计算时间估算 (基于经验公式)
        estimated_solve_time_minutes = total_elements * 0.001 / 60  # 假设每个单元1毫秒
        
        # 可行性评估
        feasible = total_elements <= self.engineering_standards['computational_limits']['max_elements_16gb']
        
        recommendations = []
        optimized_config = {}
        
        if not feasible:
            recommendations.append(f"预估单元数{total_elements:,}过多，建议增大基础网格尺寸")
            # 计算优化的网格尺寸
            max_elements = self.engineering_standards['computational_limits']['max_elements_16gb']
            size_factor = (total_elements / max_elements) ** (1/3)
            optimized_size = base_size * size_factor
            optimized_config['optimized_base_size'] = optimized_size
        else:
            recommendations.append(f"计算资源需求合理 (预估{total_elements:,}单元, {estimated_memory_gb:.1f}GB)")
        
        return {
            'feasible': feasible,
            'estimated_elements': total_elements,
            'estimated_memory_gb': estimated_memory_gb,
            'estimated_solve_time_minutes': estimated_solve_time_minutes,
            'optimized_config': optimized_config,
            'recommendations': recommendations
        }
    
    def _assess_engineering_accuracy(
        self, 
        element_size: float, 
        excavation_analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """评估工程精度充分性"""
        
        depth = excavation_analysis['depth']
        
        # 基于深基坑工程精度要求
        # 一般要求网格尺寸小于基坑深度的1/10以保证精度
        accuracy_ratio = element_size / depth
        sufficient = accuracy_ratio <= 0.15  # 允许稍微宽松的标准
        
        recommendations = []
        
        if accuracy_ratio > 0.2:
            recommendations.append("网格尺寸相对基坑深度过大，可能影响计算精度")
        elif accuracy_ratio > 0.15:
            recommendations.append("网格尺寸处于精度边界，建议谨慎评估")
        elif accuracy_ratio <= 0.05:
            recommendations.append("网格尺寸非常精细，计算精度充分但可能过度细化")
        else:
            recommendations.append("网格尺寸与工程精度要求匹配良好")
        
        return {
            'sufficient': sufficient,
            'accuracy_ratio': accuracy_ratio,
            'recommendations': recommendations
        }
    
    def _calculate_overall_score(self, validations: List[Dict[str, Any]]) -> float:
        """计算总体验证评分"""
        scores = []
        
        for validation in validations:
            if 'valid' in validation:
                scores.append(1.0 if validation['valid'] else 0.0)
            elif 'feasible' in validation:
                scores.append(1.0 if validation['feasible'] else 0.0)
            elif 'sufficient' in validation:
                scores.append(1.0 if validation['sufficient'] else 0.0)
        
        return sum(scores) / len(scores) if scores else 0.0

# 测试验证器
def test_mesh_size_validator():
    """测试网格尺寸验证器"""
    
    # 模拟2号提供的几何数据
    test_geometry_data = {
        'vertices': [0] * 5000,  # 模拟5000个顶点
        'faces': [0] * 10000,    # 模拟10000个面片
        'stageInfo': {
            'excavationVolume': 1000,  # 1000立方米
            'stageVolumes': [300, 400, 300]  # 三阶段开挖
        },
        'meshGuidance': {
            'suggestedElementSize': 1.5,  # 2号建议的网格尺寸
            'refinementZones': [
                {
                    'region': 'corner',
                    'targetSize': 0.3,
                    'priority': 'high'
                },
                {
                    'region': 'contact',
                    'targetSize': 0.8,
                    'priority': 'medium'
                }
            ]
        }
    }
    
    validator = MeshSizeValidator()
    results = validator.validate_geometry_mesh_guidance(test_geometry_data)
    
    print("=== 3号对2号网格尺寸建议的验证结果 ===")
    print(json.dumps(results, indent=2, ensure_ascii=False))
    
    return results

if __name__ == "__main__":
    test_mesh_size_validator()