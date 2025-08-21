#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD FEM数据传递处理器
3号计算专家 - 响应2号专家指令

处理 FEMDataTransfer 数据结构
支持 compactionZone: true 标识
验证数据完整性
"""

import numpy as np
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, field
import logging
import json
from pathlib import Path

@dataclass
class FEMElement:
    """FEM单元数据结构"""
    element_id: int
    element_type: str           # 'beam', 'shell', 'solid', 'compacting_pile'
    node_ids: List[int]         # 节点ID列表
    material_id: int            # 材料ID
    
    # 挤密区域标识（重要！）
    compactionZone: bool = False    # 是否为挤密区域
    
    # 几何属性
    geometry_properties: Dict[str, float] = field(default_factory=dict)
    
    # 物理属性
    physical_properties: Dict[str, Any] = field(default_factory=dict)

@dataclass
class FEMMaterial:
    """FEM材料数据结构"""
    material_id: int
    material_type: str          # 'concrete', 'soil', 'compacted_soil', 'steel'
    name: str
    density: float
    youngs_modulus: float
    poissons_ratio: float
    
    # 挤密区域标识（重要！）
    compactionZone: bool = False    # 是否为挤密土体材料
    
    # 强度属性
    cohesion: Optional[float] = None
    friction_angle: Optional[float] = None
    tensile_strength: Optional[float] = None
    
    # 挤密信息（仅对compacted_soil有效）
    compaction_info: Optional[Dict[str, Any]] = None

@dataclass
class FEMDataTransfer:
    """FEM数据传递主数据结构"""
    # 基本信息
    project_id: str
    analysis_type: str          # 'static', 'dynamic', 'nonlinear'
    timestamp: str
    
    # 几何数据
    nodes: Dict[int, Dict[str, float]]      # 节点坐标
    elements: Dict[int, FEMElement]         # 单元数据
    materials: Dict[int, FEMMaterial]       # 材料数据
    
    # 边界条件
    boundary_conditions: Dict[str, Any] = field(default_factory=dict)
    loads: Dict[str, Any] = field(default_factory=dict)
    
    # 挤密区域统计（新增）
    compaction_statistics: Dict[str, Any] = field(default_factory=dict)
    
    # 求解参数
    solver_parameters: Dict[str, Any] = field(default_factory=dict)

class FEMDataTransferHandler:
    """FEM数据传递处理器"""
    
    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.FEMDataTransferHandler")
        
        # 支持的挤密材料类型
        self.compacted_material_types = {
            'compacted_soil',
            'cfg_pile_soil',
            'swm_improved_soil',
            'jet_grouted_soil'
        }
        
        # 支持的挤密单元类型
        self.compacted_element_types = {
            'compacting_pile',
            'improvement_zone',
            'compacted_soil_element'
        }
    
    def process_geometry_update_request(
        self, 
        update_request: Dict[str, Any]
    ) -> FEMDataTransfer:
        """处理几何更新请求 - 从2号专家传来的数据"""
        
        self.logger.info("处理几何系统更新请求")
        
        # 解析更新请求
        project_id = update_request.get('project_id', 'default')
        pile_data = update_request.get('pile_data', {})
        soil_modifications = update_request.get('soil_modifications', {})
        physics_group_updates = update_request.get('physics_group_updates', {})
        
        # 创建FEM数据传递对象
        fem_data = FEMDataTransfer(
            project_id=project_id,
            analysis_type='nonlinear',  # 挤密分析通常需要非线性
            timestamp=update_request.get('timestamp', ''),
            nodes={},
            elements={},
            materials={}
        )
        
        # 处理桩基数据
        self._process_pile_elements(fem_data, pile_data)
        
        # 处理土体改良数据
        self._process_soil_improvements(fem_data, soil_modifications)
        
        # 处理物理分组更新
        self._process_physics_groups(fem_data, physics_group_updates)
        
        # 生成挤密区域统计
        self._generate_compaction_statistics(fem_data)
        
        # 验证数据完整性
        validation_result = self.validate_fem_data_integrity(fem_data)
        if not validation_result['is_valid']:
            self.logger.error(f"FEM数据验证失败: {validation_result['errors']}")
            raise ValueError(f"FEM数据不完整: {validation_result['errors']}")
        
        self.logger.info("几何更新请求处理完成")
        return fem_data
    
    def _process_pile_elements(
        self, 
        fem_data: FEMDataTransfer, 
        pile_data: Dict[str, Any]
    ):
        """处理桩基单元数据"""
        
        piles = pile_data.get('piles', [])
        
        for pile_info in piles:
            pile_id = pile_info['pile_id']
            pile_type = pile_info['properties']['pileType']
            modeling_strategy = pile_info['properties']['pileModeling']['strategy']
            
            # 判断是否为挤密型桩基
            is_compacting = pile_type in ['SWM_METHOD', 'CFG_PILE', 'HIGH_PRESSURE_JET']
            
            if is_compacting:
                # 创建挤密桩基单元
                element = FEMElement(
                    element_id=int(pile_id.replace('PILE_', '')),
                    element_type='compacting_pile',
                    node_ids=pile_info.get('nodes', []),
                    material_id=pile_info.get('material_id', 1),
                    compactionZone=True,  # 重要标识！
                    geometry_properties={
                        'diameter': pile_info['diameter'],
                        'length': pile_info['length'],
                        'improvement_diameter': pile_info.get('improvement_diameter', pile_info['diameter'] * 1.5)
                    },
                    physical_properties={
                        'pile_type': pile_type,
                        'modeling_strategy': modeling_strategy,
                        'cement_content': pile_info.get('cement_content', 0.12),
                        'improvement_factor': pile_info.get('improvement_factor', 2.0)
                    }
                )
                
                fem_data.elements[element.element_id] = element
                
                # 创建对应的挤密土体材料
                self._create_compacted_soil_material(fem_data, pile_info)
    
    def _process_soil_improvements(
        self, 
        fem_data: FEMDataTransfer,
        soil_modifications: Dict[str, Any]
    ):
        """处理土体改良数据"""
        
        improved_zones = soil_modifications.get('improved_zones', [])
        
        for zone_info in improved_zones:
            zone_id = zone_info['zone_id']
            improvement_type = zone_info['improvement_type']
            
            # 创建改良区域单元
            element = FEMElement(
                element_id=zone_id,
                element_type='improvement_zone',
                node_ids=zone_info.get('nodes', []),
                material_id=zone_info.get('material_id', 100),
                compactionZone=True,  # 重要标识！
                geometry_properties={
                    'radius': zone_info.get('radius', 1.0),
                    'depth': zone_info.get('depth', 10.0),
                    'volume': zone_info.get('volume', 0.0)
                },
                physical_properties={
                    'improvement_type': improvement_type,
                    'improvement_factor': zone_info.get('improvement_factor', 1.5),
                    'original_soil_id': zone_info.get('original_soil_id', 1),
                    'treatment_parameters': zone_info.get('treatment_parameters', {})
                }
            )
            
            fem_data.elements[element.element_id] = element
    
    def _process_physics_groups(
        self, 
        fem_data: FEMDataTransfer,
        physics_updates: Dict[str, Any]
    ):
        """处理物理分组更新"""
        
        # 更新边界条件
        if 'boundary_conditions' in physics_updates:
            fem_data.boundary_conditions.update(physics_updates['boundary_conditions'])
        
        # 更新荷载条件
        if 'loads' in physics_updates:
            fem_data.loads.update(physics_updates['loads'])
        
        # 更新求解参数
        if 'solver_parameters' in physics_updates:
            fem_data.solver_parameters.update(physics_updates['solver_parameters'])
            
            # 针对挤密分析的特殊求解参数
            fem_data.solver_parameters.update({
                'nonlinear_analysis': True,
                'large_displacement': False,
                'plasticity_model': 'MohrCoulomb',
                'convergence_criteria': {
                    'displacement_tolerance': 1e-6,
                    'residual_tolerance': 1e-8,
                    'energy_tolerance': 1e-10
                },
                'load_stepping': {
                    'initial_step': 0.1,
                    'minimum_step': 0.01,
                    'maximum_step': 0.5
                }
            })
    
    def _create_compacted_soil_material(
        self, 
        fem_data: FEMDataTransfer,
        pile_info: Dict[str, Any]
    ):
        """创建挤密土体材料"""
        
        from .compacted_soil_material_handler import create_compacted_soil_material, compacted_soil_handler
        
        # 获取原始土体属性
        original_soil = pile_info.get('surrounding_soil', {
            'cohesion': 20.0,
            'friction_angle': 18.0,
            'modulus': 8.0,
            'unit_weight': 18.5
        })
        
        # 创建挤密土体
        compacted_soil = create_compacted_soil_material(
            original_properties=original_soil,
            compaction_method=pile_info['properties']['pileType'],
            improvement_factor=pile_info.get('improvement_factor', 2.0),
            cement_content=pile_info.get('cement_content', 0.12),
            treatment_radius=pile_info.get('improvement_diameter', pile_info['diameter'] * 1.5) / 2,
            compaction_energy=pile_info.get('compaction_energy', 150.0)
        )
        
        # 生成材料卡片
        material_card = compacted_soil_handler.generate_fem_material_card(
            compacted_soil, 
            pile_info.get('material_id', 100)
        )
        
        # 转换为FEMMaterial对象
        material = FEMMaterial(
            material_id=material_card['material_id'],
            material_type=material_card['material_type'],
            name=material_card['name'],
            compactionZone=material_card['compactionZone'],  # 重要标识！
            density=material_card['density'],
            youngs_modulus=material_card['youngs_modulus'],
            poissons_ratio=material_card['poissons_ratio'],
            cohesion=material_card['cohesion'],
            friction_angle=material_card['friction_angle'],
            tensile_strength=material_card['tensile_strength'],
            compaction_info=material_card['compaction_info']
        )
        
        fem_data.materials[material.material_id] = material
    
    def _generate_compaction_statistics(self, fem_data: FEMDataTransfer):
        """生成挤密区域统计"""
        
        # 统计挤密单元
        compacted_elements = [
            elem for elem in fem_data.elements.values() 
            if elem.compactionZone
        ]
        
        # 统计挤密材料
        compacted_materials = [
            mat for mat in fem_data.materials.values() 
            if mat.compactionZone
        ]
        
        # 计算影响范围
        total_elements = len(fem_data.elements)
        compacted_element_count = len(compacted_elements)
        compaction_ratio = compacted_element_count / total_elements if total_elements > 0 else 0
        
        # 统计不同挤密方法
        compaction_methods = {}
        for material in compacted_materials:
            if material.compaction_info:
                method = material.compaction_info['method']
                compaction_methods[method] = compaction_methods.get(method, 0) + 1
        
        fem_data.compaction_statistics = {
            'total_elements': total_elements,
            'compacted_elements': compacted_element_count,
            'compaction_ratio': compaction_ratio,
            'compacted_materials': len(compacted_materials),
            'compaction_methods': compaction_methods,
            'performance_impact': self._estimate_performance_impact(compaction_ratio),
            'validation_status': 'pending'
        }
    
    def _estimate_performance_impact(self, compaction_ratio: float) -> Dict[str, float]:
        """估算性能影响 - 符合2号专家预估的10-25%"""
        
        # 基础计算量增加
        base_increase = compaction_ratio * 0.15  # 15%基础增加
        
        # 非线性迭代增加
        nonlinear_increase = compaction_ratio * 0.1  # 10%非线性增加
        
        # 总计算量增加（限制在10%-25%）
        total_increase = max(0.10, min(0.25, base_increase + nonlinear_increase))
        
        return {
            'computational_increase': total_increase,
            'memory_increase': compaction_ratio * 0.08,
            'convergence_iterations': int(compaction_ratio * 5) + 1,  # 额外迭代次数
            'disk_space_increase': compaction_ratio * 0.12
        }
    
    def validate_fem_data_integrity(
        self, 
        fem_data: FEMDataTransfer
    ) -> Dict[str, Any]:
        """验证FEM数据完整性 - 计算开始前验证"""
        
        self.logger.info("开始FEM数据完整性验证")
        
        errors = []
        warnings = []
        
        # 1. 基本数据完整性检查
        if not fem_data.elements:
            errors.append("缺少单元数据")
        
        if not fem_data.materials:
            errors.append("缺少材料数据")
        
        # 2. 挤密区域数据检查
        compacted_elements = [e for e in fem_data.elements.values() if e.compactionZone]
        compacted_materials = [m for m in fem_data.materials.values() if m.compactionZone]
        
        if compacted_elements and not compacted_materials:
            errors.append("存在挤密单元但缺少对应的挤密材料")
        
        # 3. 材料-单元关联检查
        for element in compacted_elements:
            if element.material_id not in fem_data.materials:
                errors.append(f"挤密单元 {element.element_id} 引用的材料 {element.material_id} 不存在")
            else:
                material = fem_data.materials[element.material_id]
                if not material.compactionZone:
                    warnings.append(f"挤密单元 {element.element_id} 使用非挤密材料 {element.material_id}")
        
        # 4. 挤密材料属性检查
        for material in compacted_materials:
            if material.material_type not in self.compacted_material_types:
                warnings.append(f"材料 {material.material_id} 类型 {material.material_type} 不在标准挤密材料类型列表中")
            
            if not material.compaction_info:
                errors.append(f"挤密材料 {material.material_id} 缺少挤密信息")
            
            # 检查弹性参数
            if material.youngs_modulus <= 0:
                errors.append(f"材料 {material.material_id} 杨氏模量无效")
            
            if material.poissons_ratio < 0 or material.poissons_ratio >= 0.5:
                errors.append(f"材料 {material.material_id} 泊松比无效")
        
        # 5. 求解参数检查
        if compacted_elements and not fem_data.solver_parameters.get('nonlinear_analysis'):
            warnings.append("存在挤密单元但未启用非线性分析")
        
        # 6. 性能影响评估
        compaction_ratio = len(compacted_elements) / len(fem_data.elements) if fem_data.elements else 0
        if compaction_ratio > 0.5:
            warnings.append(f"挤密单元比例过高 ({compaction_ratio:.2%})，可能显著影响计算性能")
        
        validation_result = {
            'is_valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'compaction_ratio': compaction_ratio,
            'compacted_elements_count': len(compacted_elements),
            'compacted_materials_count': len(compacted_materials),
            'estimated_performance_impact': self._estimate_performance_impact(compaction_ratio)
        }
        
        # 更新统计信息
        fem_data.compaction_statistics['validation_status'] = 'passed' if validation_result['is_valid'] else 'failed'
        fem_data.compaction_statistics['validation_errors'] = errors
        fem_data.compaction_statistics['validation_warnings'] = warnings
        
        self.logger.info(f"数据验证完成 - 有效: {validation_result['is_valid']}, 错误: {len(errors)}, 警告: {len(warnings)}")
        
        return validation_result
    
    def export_to_kratos_format(
        self, 
        fem_data: FEMDataTransfer,
        output_path: Path
    ) -> Dict[str, str]:
        """导出为Kratos格式"""
        
        self.logger.info(f"导出FEM数据到Kratos格式: {output_path}")
        
        # 创建输出目录
        output_path.mkdir(parents=True, exist_ok=True)
        
        # 导出材料文件
        materials_file = output_path / "materials.json"
        materials_data = {}
        
        for mat_id, material in fem_data.materials.items():
            materials_data[f"material_{mat_id}"] = {
                "constitutive_law": {
                    "name": "MohrCoulombPlastic3DLaw" if material.compactionZone else "LinearElastic3DLaw"
                },
                "parameters": {
                    "YOUNG_MODULUS": material.youngs_modulus,
                    "POISSON_RATIO": material.poissons_ratio,
                    "DENSITY": material.density
                }
            }
            
            # 添加塑性参数（仅对挤密材料）
            if material.compactionZone and material.cohesion:
                materials_data[f"material_{mat_id}"]["parameters"].update({
                    "COHESION": material.cohesion / 1000,  # 转换为MPa
                    "INTERNAL_FRICTION_ANGLE": np.radians(material.friction_angle),
                    "INTERNAL_DILATANCY_ANGLE": np.radians(max(0.0, material.friction_angle - 30.0))
                })
        
        with open(materials_file, 'w', encoding='utf-8') as f:
            json.dump(materials_data, f, indent=2, ensure_ascii=False)
        
        # 导出求解参数文件
        solver_file = output_path / "solver_parameters.json"
        with open(solver_file, 'w', encoding='utf-8') as f:
            json.dump(fem_data.solver_parameters, f, indent=2)
        
        # 导出挤密统计文件
        stats_file = output_path / "compaction_statistics.json"
        with open(stats_file, 'w', encoding='utf-8') as f:
            json.dump(fem_data.compaction_statistics, f, indent=2, ensure_ascii=False)
        
        return {
            'materials_file': str(materials_file),
            'solver_file': str(solver_file),
            'statistics_file': str(stats_file)
        }

# 全局处理器实例
fem_data_transfer_handler = FEMDataTransferHandler()

if __name__ == "__main__":
    # 测试示例
    logging.basicConfig(level=logging.INFO)
    
    # 模拟从2号专家传来的更新请求
    test_update_request = {
        'project_id': 'TEST_PROJECT_001',
        'timestamp': '2024-01-26 15:30:00',
        'pile_data': {
            'piles': [
                {
                    'pile_id': 'PILE_001',
                    'diameter': 0.6,
                    'length': 15.0,
                    'improvement_diameter': 1.2,
                    'material_id': 101,
                    'properties': {
                        'pileType': 'CFG_PILE',
                        'pileModeling': {'strategy': 'SHELL_ELEMENT'}
                    },
                    'cement_content': 0.12,
                    'improvement_factor': 2.5,
                    'nodes': [1, 2, 3, 4],
                    'surrounding_soil': {
                        'cohesion': 20.0,
                        'friction_angle': 18.0,
                        'modulus': 8.0,
                        'unit_weight': 18.5
                    }
                }
            ]
        },
        'soil_modifications': {
            'improved_zones': []
        },
        'physics_group_updates': {
            'boundary_conditions': {'fixed_base': True},
            'loads': {'vertical_load': 1000.0}
        }
    }
    
    # 处理更新请求
    try:
        fem_data = fem_data_transfer_handler.process_geometry_update_request(test_update_request)
        
        print("=== FEM数据传递处理结果 ===")
        print(f"项目ID: {fem_data.project_id}")
        print(f"单元数量: {len(fem_data.elements)}")
        print(f"材料数量: {len(fem_data.materials)}")
        print(f"挤密单元数量: {sum(1 for e in fem_data.elements.values() if e.compactionZone)}")
        print(f"挤密材料数量: {sum(1 for m in fem_data.materials.values() if m.compactionZone)}")
        print(f"计算量增加: {fem_data.compaction_statistics['performance_impact']['computational_increase']:.1%}")
        
    except Exception as e:
        print(f"处理失败: {e}")