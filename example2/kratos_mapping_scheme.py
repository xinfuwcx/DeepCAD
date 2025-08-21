#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
两阶段-全锚杆-摩尔库伦.fpn 到 Kratos结构求解器的完整映射方案

基于FPN文件分析结果：
- 14种材料（包含多层土体和钢材）
- 2个施工阶段（初始应力 + 支护开挖）
- 120个预应力锚杆单元
- 复杂边界条件和荷载系统
"""

import numpy as np
from typing import Dict, List, Any, Tuple
import json

class ComplexFPNToKratosMapper:
    """复杂FPN文件到Kratos的映射器"""
    
    def __init__(self):
        self.fpn_analysis = self._analyze_fpn_structure()
        self.kratos_config = self._generate_kratos_config()
    
    def _analyze_fpn_structure(self) -> Dict[str, Any]:
        """分析FPN文件结构"""
        return {
            # 基本信息
            'project_name': '两阶段-全锚杆-摩尔库伦基坑工程',
            'analysis_type': 'STAGED_EXCAVATION_WITH_ANCHORS',
            
            # 材料信息（基于FPN文件分析）
            'materials': {
                1: {'name': 'C30混凝土', 'type': 'ELASTIC', 'E': 30000000, 'nu': 0.2, 'rho': 25.0},
                2: {'name': '细砂', 'type': 'MOHR_COULOMB', 'E': 15000, 'nu': 0.3, 'rho': 20.0, 'c': 0, 'phi': 20},
                3: {'name': '粉质粘土', 'type': 'MOHR_COULOMB', 'E': 5000, 'nu': 0.3, 'rho': 19.5, 'c': 26, 'phi': 9},
                4: {'name': '粉质粘土', 'type': 'MOHR_COULOMB', 'E': 5000, 'nu': 0.3, 'rho': 19.1, 'c': 24, 'phi': 10},
                5: {'name': '粉质粘土', 'type': 'MOHR_COULOMB', 'E': 5000, 'nu': 0.3, 'rho': 20.8, 'c': 22, 'phi': 13},
                6: {'name': '砂岩', 'type': 'MOHR_COULOMB', 'E': 40000, 'nu': 0.3, 'rho': 19.5, 'c': 0, 'phi': 21},
                7: {'name': '粉质粘土', 'type': 'MOHR_COULOMB', 'E': 8000, 'nu': 0.3, 'rho': 20.8, 'c': 14, 'phi': 25},
                8: {'name': '粉质粘土', 'type': 'MOHR_COULOMB', 'E': 9000, 'nu': 0.3, 'rho': 20.7, 'c': 20.7, 'phi': 20.5},
                9: {'name': '地方性粘土', 'type': 'MOHR_COULOMB', 'E': 9000, 'nu': 0.3, 'rho': 20.2, 'c': 23, 'phi': 14},
                10: {'name': '砂岩', 'type': 'MOHR_COULOMB', 'E': 40000, 'nu': 0.3, 'rho': 21.0, 'c': 0, 'phi': 35},
                11: {'name': '粉质粘土', 'type': 'MOHR_COULOMB', 'E': 12000, 'nu': 0.3, 'rho': 20.2, 'c': 24, 'phi': 17},
                12: {'name': '细砂', 'type': 'MOHR_COULOMB', 'E': 20000, 'nu': 0.3, 'rho': 20.3, 'c': 0, 'phi': 26},
                13: {'name': '钢材', 'type': 'ELASTIC', 'E': 206000000, 'nu': 0.3, 'rho': 78.5},
                14: {'name': '细砂加固', 'type': 'MODIFIED_MOHR_COULOMB', 'E': 15000, 'nu': 0.3, 'rho': 20.0}
            },
            
            # 施工阶段
            'analysis_stages': [
                {
                    'id': 1,
                    'name': '初始应力',
                    'type': 'INITIAL_STRESS_EQUILIBRIUM',
                    'description': '地应力平衡阶段，建立初始应力场'
                },
                {
                    'id': 2, 
                    'name': '支护开挖',
                    'type': 'EXCAVATION_WITH_SUPPORT',
                    'description': '基坑开挖并安装预应力锚杆支护'
                }
            ],
            
            # 预应力锚杆系统
            'anchor_system': {
                'material_id': 13,  # 钢材
                'prestress_levels': [345000, 360000, 450000, 670000, 640000, 550000],  # N
                'anchor_count': 120,
                'distribution': 'SYSTEMATIC_GRID'
            },
            
            # 重力荷载
            'gravity': {
                'acceleration': [0.0, 0.0, -9.80665],  # m/s²
                'load_group_id': 1
            }
        }
    
    def _generate_kratos_config(self) -> Dict[str, Any]:
        """生成Kratos配置"""
        return {
            "problem_data": {
                "problem_name": "两阶段全锚杆摩尔库伦基坑",
                "parallel_type": "OpenMP",
                "echo_level": 1,
                "start_time": 0.0,
                "end_time": 2.0
            },
            "solver_settings": {
                "solver_type": "Static",
                "model_part_name": "Structure",
                "domain_size": 3,
                "echo_level": 1,
                "analysis_type": "non_linear",
                "model_import_settings": {
                    "input_type": "mdpa",
                    "input_filename": "complex_excavation"
                },
                "material_import_settings": {
                    "materials_filename": "StructuralMaterials.json"
                },
                "time_stepping": {
                    "time_step": 1.0
                },
                "line_search": False,
                "convergence_criterion": "residual_criterion",
                "displacement_relative_tolerance": 1e-6,
                "displacement_absolute_tolerance": 1e-9,
                "residual_relative_tolerance": 1e-6,
                "residual_absolute_tolerance": 1e-9,
                "max_iteration": 50,
                "use_old_stiffness_in_first_iteration": False,
                "problem_domain_sub_model_part_list": ["Structure"],
                "processes_sub_model_part_list": ["DISPLACEMENT_Boundary", "SelfWeight_Structure", "Anchors_Structure"],
                "rotation_dofs": False
            }
        }
    
    def generate_material_properties(self) -> Dict[str, Any]:
        """生成材料属性配置"""
        materials_config = {"properties": []}
        
        for mat_id, mat_data in self.fpn_analysis['materials'].items():
            if mat_data['type'] == 'MOHR_COULOMB':
                # 摩尔-库伦材料
                phi_rad = np.radians(mat_data['phi'])
                K0 = 1 - np.sin(phi_rad)  # Jaky公式
                
                material_config = {
                    "model_part_name": f"Material_{mat_id}",
                    "properties_id": mat_id,
                    "Material": {
                        "constitutive_law": {
                            "name": "SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D"
                        },
                        "Variables": {
                            "DENSITY": mat_data['rho'] * 1000,  # kg/m³
                            "YOUNG_MODULUS": mat_data['E'] * 1000,  # Pa
                            "POISSON_RATIO": mat_data['nu'],
                            "YIELD_STRESS_TENSION": mat_data['c'] * 1000,  # Pa
                            "YIELD_STRESS_COMPRESSION": mat_data['c'] * 1000 * 10,  # Pa
                            "FRICTION_ANGLE": mat_data['phi'],  # degrees
                            "DILATANCY_ANGLE": max(0, mat_data['phi'] - 30),  # degrees
                            "K0": K0
                        },
                        "Tables": {}
                    }
                }
            elif mat_data['type'] == 'ELASTIC':
                # 弹性材料（混凝土、钢材）
                material_config = {
                    "model_part_name": f"Material_{mat_id}",
                    "properties_id": mat_id,
                    "Material": {
                        "constitutive_law": {
                            "name": "LinearElastic3DLaw"
                        },
                        "Variables": {
                            "DENSITY": mat_data['rho'] * 1000,  # kg/m³
                            "YOUNG_MODULUS": mat_data['E'] * 1000,  # Pa
                            "POISSON_RATIO": mat_data['nu']
                        },
                        "Tables": {}
                    }
                }
            
            materials_config["properties"].append(material_config)
        
        return materials_config
    
    def generate_initial_stress_equilibrium(self) -> Dict[str, Any]:
        """生成初始应力平衡配置"""
        return {
            "stage_1_initial_stress": {
                "description": "地应力平衡阶段",
                "analysis_type": "static",
                "time_parameters": {
                    "start_time": 0.0,
                    "end_time": 1.0,
                    "time_step": 1.0
                },
                "processes": {
                    "gravity_load": {
                        "python_module": "assign_vector_by_direction_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignVectorByDirectionProcess",
                        "Parameters": {
                            "model_part_name": "Structure",
                            "variable_name": "VOLUME_ACCELERATION",
                            "modulus": 9.80665,
                            "direction": [0.0, 0.0, -1.0],
                            "interval": [0.0, 1.0],
                            "constrained": False
                        }
                    },
                    "initial_stress_field": {
                        "description": "K0法初始应力场设置",
                        "method": "K0_STRESS_INITIALIZATION",
                        "parameters": {
                            "use_k0_formula": True,
                            "ground_water_level": -999,  # 假设无地下水
                            "stress_calculation": "JAKY_FORMULA"
                        }
                    },
                    "boundary_conditions": {
                        "bottom_fixed": {
                            "model_part_name": "DISPLACEMENT_Boundary",
                            "variable_name": "DISPLACEMENT",
                            "constrained": [True, True, True],
                            "value": [0.0, 0.0, 0.0]
                        },
                        "side_constraints": {
                            "model_part_name": "DISPLACEMENT_Boundary", 
                            "variable_name": "DISPLACEMENT",
                            "constrained": [True, True, False],
                            "value": [0.0, 0.0, 0.0]
                        }
                    }
                }
            }
        }
    
    def generate_excavation_stage(self) -> Dict[str, Any]:
        """生成开挖阶段配置"""
        return {
            "stage_2_excavation": {
                "description": "支护开挖阶段",
                "analysis_type": "static_nonlinear",
                "time_parameters": {
                    "start_time": 1.0,
                    "end_time": 2.0,
                    "time_step": 0.1
                },
                "processes": {
                    "element_deactivation": {
                        "description": "开挖土体单元失效",
                        "python_module": "assign_scalar_variable_process",
                        "process_name": "AssignScalarVariableProcess",
                        "Parameters": {
                            "model_part_name": "ExcavationZone",
                            "variable_name": "ACTIVATION_LEVEL",
                            "value": 0.0,
                            "interval": [1.0, 1.1]
                        }
                    },
                    "anchor_activation": {
                        "description": "预应力锚杆激活",
                        "python_module": "assign_vector_by_direction_process",
                        "process_name": "AssignVectorByDirectionProcess",
                        "Parameters": {
                            "model_part_name": "Anchors_Structure",
                            "variable_name": "POINT_LOAD",
                            "prestress_forces": [345000, 360000, 450000, 670000, 640000, 550000],
                            "interval": [1.1, 2.0]
                        }
                    },
                    "continued_gravity": {
                        "python_module": "assign_vector_by_direction_process",
                        "kratos_module": "KratosMultiphysics",
                        "process_name": "AssignVectorByDirectionProcess",
                        "Parameters": {
                            "model_part_name": "Structure",
                            "variable_name": "VOLUME_ACCELERATION",
                            "modulus": 9.80665,
                            "direction": [0.0, 0.0, -1.0],
                            "interval": [1.0, 2.0],
                            "constrained": False
                        }
                    }
                }
            }
        }

class GeostressEquilibriumSolver:
    """地应力平衡求解器"""
    
    def __init__(self, materials: Dict[int, Dict[str, Any]]):
        self.materials = materials
        
    def calculate_k0_stress_field(self, nodes: List[Dict[str, Any]], 
                                 ground_level: float = 0.0) -> np.ndarray:
        """计算K0法初始应力场"""
        print('\n' + '=' * 60)
        print('地应力平衡计算 - K0法初始应力场')
        print('=' * 60)
        
        stress_field = np.zeros((len(nodes), 6))  # [σxx, σyy, σzz, τxy, τyz, τzx]
        
        for i, node in enumerate(nodes):
            z = node['z']
            depth = max(0, ground_level - z)  # 埋深
            
            # 根据深度确定土层材料
            material = self._get_material_by_depth(depth)
            
            if material and material['type'] == 'MOHR_COULOMB':
                # 垂直有效应力
                gamma = material['rho']  # kN/m³
                sigma_v = depth * gamma * 1000  # Pa
                
                # 侧向土压力系数
                phi_rad = np.radians(material['phi'])
                K0 = 1 - np.sin(phi_rad)
                sigma_h = K0 * sigma_v
                
                # 应力张量
                stress_field[i] = [sigma_h, sigma_h, sigma_v, 0, 0, 0]
                
                if i % 1000 == 0:  # 每1000个节点输出一次
                    print(f'节点{i}: 深度={depth:.2f}m, σv={sigma_v/1000:.1f}kPa, σh={sigma_h/1000:.1f}kPa, K0={K0:.3f}')
        
        return stress_field
    
    def _get_material_by_depth(self, depth: float) -> Dict[str, Any]:
        """根据深度获取材料属性"""
        # 简化的分层逻辑（实际应根据地质剖面）
        if depth < 2:
            return self.materials.get(2)  # 细砂
        elif depth < 5:
            return self.materials.get(3)  # 粉质粘土
        elif depth < 10:
            return self.materials.get(4)  # 粉质粘土
        elif depth < 15:
            return self.materials.get(5)  # 粉质粘土
        elif depth < 20:
            return self.materials.get(6)  # 砂岩
        else:
            return self.materials.get(10)  # 深层砂岩

class AnchorSystemMapper:
    """锚杆系统映射器"""
    
    def __init__(self, anchor_data: Dict[str, Any]):
        self.anchor_data = anchor_data
        
    def generate_anchor_elements(self) -> Dict[str, Any]:
        """生成锚杆单元配置"""
        print('\n' + '=' * 60)
        print('预应力锚杆系统配置')
        print('=' * 60)
        
        prestress_forces = [345000, 360000, 450000, 670000, 640000, 550000]  # N
        
        anchor_config = {
            "anchor_elements": {
                "element_type": "TrussElement3D2N",
                "material_id": 13,  # 钢材
                "properties": {
                    "CROSS_AREA": 0.001,  # m² (假设锚杆截面积)
                    "PRESTRESS_CAUCHY": prestress_forces
                }
            },
            "anchor_nodes": {
                "description": "锚杆节点，连接基坑壁面和稳定土体",
                "node_pairs": "AUTO_GENERATED_FROM_FPN"
            },
            "prestress_application": {
                "method": "INITIAL_STRESS_APPLICATION",
                "timing": "STAGE_2_START",
                "force_distribution": "UNIFORM_ALONG_ANCHOR"
            }
        }
        
        print(f'预应力等级: {len(prestress_forces)}种')
        print(f'预应力范围: {min(prestress_forces)/1000:.0f} ~ {max(prestress_forces)/1000:.0f} kN')
        print(f'锚杆材料: 钢材 (E=206GPa)')
        
        return anchor_config

def generate_complete_kratos_mapping():
    """生成完整的Kratos映射方案"""
    print('=' * 80)
    print('生成完整Kratos结构求解器映射方案')
    print('=' * 80)
    
    # 创建映射器
    mapper = ComplexFPNToKratosMapper()
    
    # 生成各个组件
    materials_config = mapper.generate_material_properties()
    initial_stress_config = mapper.generate_initial_stress_equilibrium()
    excavation_config = mapper.generate_excavation_stage()
    
    # 地应力平衡求解器
    geostress_solver = GeostressEquilibriumSolver(mapper.fpn_analysis['materials'])
    
    # 锚杆系统映射器
    anchor_mapper = AnchorSystemMapper(mapper.fpn_analysis['anchor_system'])
    anchor_config = anchor_mapper.generate_anchor_elements()
    
    # 完整映射方案
    complete_mapping = {
        "project_info": mapper.fpn_analysis,
        "kratos_solver_config": mapper.kratos_config,
        "materials": materials_config,
        "analysis_stages": {
            **initial_stress_config,
            **excavation_config
        },
        "anchor_system": anchor_config,
        "implementation_notes": {
            "地应力平衡": "使用K0法初始应力场 + Kratos重力荷载",
            "摩尔库伦本构": "Kratos 10.3 SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D",
            "预应力锚杆": "TrussElement3D2N + 初始应力施加",
            "施工阶段": "单元激活/失效 + 荷载分步施加",
            "求解策略": "Newton-Raphson非线性迭代求解"
        }
    }
    
    # 保存映射方案
    with open('kratos_mapping_complete.json', 'w', encoding='utf-8') as f:
        json.dump(complete_mapping, f, ensure_ascii=False, indent=2)
    
    print('\n✅ 完整Kratos映射方案生成完成!')
    print('📁 保存文件: kratos_mapping_complete.json')
    
    return complete_mapping

if __name__ == '__main__':
    mapping = generate_complete_kratos_mapping()
    
    # 输出关键信息
    print('\n' + '=' * 60)
    print('映射方案关键信息')
    print('=' * 60)
    print(f"项目名称: {mapping['project_info']['project_name']}")
    print(f"分析类型: {mapping['project_info']['analysis_type']}")
    print(f"材料数量: {len(mapping['project_info']['materials'])}")
    print(f"施工阶段: {len(mapping['project_info']['analysis_stages'])}")
    print(f"锚杆数量: {mapping['project_info']['anchor_system']['anchor_count']}")
