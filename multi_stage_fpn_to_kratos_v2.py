#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
方案B：严格按照FPN结果的多阶段Kratos转换器
"""

import os
import sys
import json
import shutil
from pathlib import Path
from typing import Dict, List, Any

def analyze_fpn_stages(fpn_data: Dict[str, Any]) -> Dict[str, Any]:
    """深度分析FPN文件中的阶段信息"""
    print("🔍 分析FPN文件中的阶段定义...")
    
    stages_info = {}
    
    # 解析analysis_stages
    for stage in fpn_data.get('analysis_stages', []):
        stage_id = stage.get('id', 'unknown')
        stage_name = stage.get('name', f'Stage_{stage_id}')
        
        print(f"   发现阶段: {stage_name} (ID: {stage_id})")
        
        stages_info[stage_id] = {
            'name': stage_name,
            'description': stage.get('description', ''),
            'active_elements': [],
            'inactive_elements': [],
            'loads': [],
            'boundaries': [],
            'anchors': []
        }
    
    # 解析stage_elements（单元激活/失活）
    for stage_id, elements in fpn_data.get('stage_elements', {}).items():
        if stage_id in stages_info:
            stages_info[stage_id]['active_elements'] = elements.get('active', [])
            stages_info[stage_id]['inactive_elements'] = elements.get('inactive', [])
            print(f"   阶段{stage_id}: 激活{len(elements.get('active', []))}个单元组, 失活{len(elements.get('inactive', []))}个单元组")
    
    # 解析stage_loads（阶段载荷）
    for stage_id, loads in fpn_data.get('stage_loads', {}).items():
        if stage_id in stages_info:
            stages_info[stage_id]['loads'] = loads
            print(f"   阶段{stage_id}: {len(loads)}个载荷条件")
    
    # 解析stage_boundaries（阶段边界）
    for stage_id, boundaries in fpn_data.get('stage_boundaries', {}).items():
        if stage_id in stages_info:
            stages_info[stage_id]['boundaries'] = boundaries
            print(f"   阶段{stage_id}: {len(boundaries)}个边界条件")
    
    return stages_info

def create_stage_kratos_config(stage_info: Dict[str, Any], base_config: Dict[str, Any], fpn_data: Dict[str, Any]) -> Dict[str, Any]:
    """为特定阶段创建Kratos配置"""
    config = base_config.copy()
    
    # 修改问题名称
    config['problem_data']['problem_name'] = f"{stage_info['name'].lower()}_analysis"
    
    # 设置载荷过程
    loads_process_list = []
    
    # 1. 重力载荷（所有阶段都有）
    loads_process_list.append({
        "python_module": "assign_vector_by_direction_process",
        "kratos_module": "KratosMultiphysics",
        "process_name": "AssignVectorByDirectionProcess",
        "Parameters": {
            "model_part_name": "Structure",
            "variable_name": "VOLUME_ACCELERATION",
            "modulus": 9.80665,
            "direction": [0.0, 0.0, -1.0],
            "constrained": False,
            "interval": [0.0, "End"]
        }
    })
    
    # 2. 阶段特定载荷
    load_groups = fpn_data.get('load_groups', {})
    for load_id in stage_info.get('active_loads', []):
        # 根据FPN载荷类型转换为Kratos载荷
        kratos_load = convert_fpn_load_to_kratos(load_id, load_groups)
        if kratos_load:
            loads_process_list.append(kratos_load)
    
    config['processes']['loads_process_list'] = loads_process_list
    
    # 设置边界条件
    constraints_process_list = []
    
    # 默认底部固定
    constraints_process_list.append({
        "python_module": "assign_vector_variable_process",
        "kratos_module": "KratosMultiphysics",
        "process_name": "AssignVectorVariableProcess",
        "Parameters": {
            "model_part_name": "Structure.BOTTOM_SUPPORT",
            "variable_name": "DISPLACEMENT",
            "constrained": [True, True, True],
            "value": [0.0, 0.0, 0.0],
            "interval": [0.0, "End"]
        }
    })
    
    # 阶段特定边界条件
    boundary_groups = fpn_data.get('boundary_groups', {})
    for boundary_id in stage_info.get('active_boundaries', []):
        kratos_boundary = convert_fpn_boundary_to_kratos(boundary_id, boundary_groups)
        if kratos_boundary:
            constraints_process_list.append(kratos_boundary)
    
    config['processes']['constraints_process_list'] = constraints_process_list
    
    # 设置单元激活/失活
    auxiliar_process_list = []
    
    # 失活开挖单元
    for element_group in stage_info.get('inactive_elements', []):
        auxiliar_process_list.append({
            "python_module": "activate_elements_process",
            "kratos_module": "KratosMultiphysics",
            "Parameters": {
                "model_part_name": f"Structure.{element_group}",
                "active": False,
                "interval": [0.0, "End"]
            }
        })
    
    # 激活支护单元
    for element_group in stage_info.get('active_elements', []):
        auxiliar_process_list.append({
            "python_module": "activate_elements_process",
            "kratos_module": "KratosMultiphysics", 
            "Parameters": {
                "model_part_name": f"Structure.{element_group}",
                "active": True,
                "interval": [0.0, "End"]
            }
        })
    
    if auxiliar_process_list:
        config['processes']['auxiliar_process_list'] = auxiliar_process_list
    
    # 修改VTK输出路径和配置
    stage_name = stage_info['name'].replace(' ', '_').replace('-', '_')
    config['output_processes']['vtk_output'][0]['Parameters']['output_path'] = f"data\\VTK_Output_{stage_name}"
    
    # 确保输出应力数据
    vtk_params = config['output_processes']['vtk_output'][0]['Parameters']
    vtk_params['gauss_point_variables_in_elements'] = [
        "CAUCHY_STRESS_TENSOR",
        "GREEN_LAGRANGE_STRAIN_TENSOR",
        "PLASTIC_STRAIN_TENSOR"
    ]
    vtk_params['element_data_value_variables'] = [
        "VON_MISES_STRESS"
    ]
    
    return config

def convert_fpn_load_to_kratos(fpn_load: Dict[str, Any], load_groups: Dict[str, Any]) -> Dict[str, Any]:
    """将FPN载荷转换为Kratos载荷配置"""
    try:
        # 根据载荷组ID获取载荷详细信息
        load_group = load_groups.get(fpn_load, {})
        load_type = load_group.get('type', 'unknown')

        if load_type == 'surface_pressure':
            # 表面压力载荷
            return {
                "python_module": "assign_vector_by_direction_to_condition_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorByDirectionToConditionProcess",
                "Parameters": {
                    "model_part_name": f"Structure.LOAD_GROUP_{fpn_load}",
                    "variable_name": "SURFACE_LOAD",
                    "modulus": load_group.get('magnitude', 1000.0),
                    "direction": load_group.get('direction', [0.0, 0.0, -1.0]),
                    "interval": [0.0, "End"]
                }
            }
        elif load_type == 'point_load':
            # 点载荷
            return {
                "python_module": "assign_vector_by_direction_to_condition_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorByDirectionToConditionProcess",
                "Parameters": {
                    "model_part_name": f"Structure.LOAD_GROUP_{fpn_load}",
                    "variable_name": "POINT_LOAD",
                    "modulus": load_group.get('magnitude', 1000.0),
                    "direction": load_group.get('direction', [0.0, 0.0, -1.0]),
                    "interval": [0.0, "End"]
                }
            }
        else:
            # 默认作为体力处理
            return {
                "python_module": "assign_vector_by_direction_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorByDirectionProcess",
                "Parameters": {
                    "model_part_name": f"Structure.LOAD_GROUP_{fpn_load}",
                    "variable_name": "VOLUME_ACCELERATION",
                    "modulus": load_group.get('magnitude', 9.80665),
                    "direction": load_group.get('direction', [0.0, 0.0, -1.0]),
                    "interval": [0.0, "End"]
                }
            }
    except Exception as e:
        print(f"载荷转换失败: {e}")
        return None

def convert_fpn_boundary_to_kratos(fpn_boundary: Dict[str, Any], boundary_groups: Dict[str, Any]) -> Dict[str, Any]:
    """将FPN边界条件转换为Kratos边界条件配置"""
    try:
        # 根据边界组ID获取边界详细信息
        boundary_group = boundary_groups.get(fpn_boundary, {})
        boundary_type = boundary_group.get('type', 'displacement')

        if boundary_type == 'displacement':
            # 位移约束
            constraints = boundary_group.get('constraints', [True, True, True])
            values = boundary_group.get('values', [0.0, 0.0, 0.0])

            return {
                "python_module": "assign_vector_variable_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorVariableProcess",
                "Parameters": {
                    "model_part_name": f"Structure.BOUNDARY_GROUP_{fpn_boundary}",
                    "variable_name": "DISPLACEMENT",
                    "constrained": constraints,
                    "value": values,
                    "interval": [0.0, "End"]
                }
            }
        elif boundary_type == 'rotation':
            # 转角约束
            constraints = boundary_group.get('constraints', [True, True, True])
            values = boundary_group.get('values', [0.0, 0.0, 0.0])

            return {
                "python_module": "assign_vector_variable_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorVariableProcess",
                "Parameters": {
                    "model_part_name": f"Structure.BOUNDARY_GROUP_{fpn_boundary}",
                    "variable_name": "ROTATION",
                    "constrained": constraints,
                    "value": values,
                    "interval": [0.0, "End"]
                }
            }
        else:
            # 默认全约束
            return {
                "python_module": "assign_vector_variable_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorVariableProcess",
                "Parameters": {
                    "model_part_name": f"Structure.BOUNDARY_GROUP_{fpn_boundary}",
                    "variable_name": "DISPLACEMENT",
                    "constrained": [True, True, True],
                    "value": [0.0, 0.0, 0.0],
                    "interval": [0.0, "End"]
                }
            }
    except Exception as e:
        print(f"边界条件转换失败: {e}")
        return None

def create_base_kratos_config() -> Dict[str, Any]:
    """创建基础Kratos配置模板"""
    return {
        "problem_data": {
            "problem_name": "stage_analysis",
            "parallel_type": "OpenMP",
            "echo_level": 1,
            "start_time": 0.0,
            "end_time": 1.0
        },
        "solver_settings": {
            "solver_type": "Static",
            "model_part_name": "Structure",
            "domain_size": 3,
            "echo_level": 1,
            "analysis_type": "non_linear",
            "model_import_settings": {
                "input_type": "mdpa",
                "input_filename": "stage_analysis"
            },
            "material_import_settings": {
                "materials_filename": "StructuralMaterials.json"
            },
            "time_stepping": {
                "time_step": 1.0
            },
            "line_search": False,
            "convergence_criterion": "residual_criterion",
            "displacement_relative_tolerance": 0.0001,
            "displacement_absolute_tolerance": 1e-09,
            "residual_relative_tolerance": 0.0001,
            "residual_absolute_tolerance": 1e-09,
            "max_iteration": 20,
            "use_old_stiffness_in_first_iteration": False,
            "problem_domain_sub_model_part_list": ["Structure"],
            "processes_sub_model_part_list": ["BOTTOM_SUPPORT"]
        },
        "processes": {
            "constraints_process_list": [],
            "loads_process_list": []
        },
        "output_processes": {
            "vtk_output": [{
                "python_module": "vtk_output_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "VtkOutputProcess",
                "Parameters": {
                    "model_part_name": "Structure",
                    "output_control_type": "step",
                    "output_interval": 1,
                    "file_format": "ascii",
                    "output_precision": 7,
                    "output_sub_model_parts": False,
                    "output_path": "VTK_Output",
                    "save_output_files_in_folder": True,
                    "nodal_solution_step_data_variables": [
                        "DISPLACEMENT",
                        "REACTION",
                        "VELOCITY",
                        "ACCELERATION"
                    ],
                    "gauss_point_variables_in_elements": [
                        "CAUCHY_STRESS_TENSOR",
                        "GREEN_LAGRANGE_STRAIN_TENSOR",
                        "PLASTIC_STRAIN_TENSOR"
                    ],
                    "element_data_value_variables": [
                        "VON_MISES_STRESS"
                    ]
                }
            }]
        },
        "import_modules": {
            "applications": [
                "KratosMultiphysics.StructuralMechanicsApplication",
                "KratosMultiphysics.ConstitutiveLawsApplication"
            ]
        }
    }

def main():
    """主函数"""
    print("🚀 方案B：严格按照FPN结果的多阶段分析")
    print("=" * 60)
    
    # 1. 解析FPN文件
    print("📖 解析FPN文件...")
    try:
        from example2.core.optimized_fpn_parser import OptimizedFPNParser
        
        # 使用绝对路径确保找到FPN文件
        fpn_file = Path("E:/DeepCAD/example2/data/两阶段-全锚杆-摩尔库伦.fpn")
        
        parser = OptimizedFPNParser()
        fpn_data = parser.parse_file_streaming(str(fpn_file))
        
        print(f"✅ FPN文件解析成功")
        print(f"   节点数量: {len(fpn_data.get('nodes', {}))}")
        print(f"   单元数量: {len(fpn_data.get('elements', {}))}")
        print(f"   分析阶段: {len(fpn_data.get('analysis_stages', []))}")
        
    except Exception as e:
        print(f"❌ FPN解析失败: {e}")
        return False
    
    # 2. 分析阶段信息
    stages_info = analyze_fpn_stages(fpn_data)
    
    if not stages_info:
        print("❌ 未找到阶段信息")
        return False
    
    # 3. 为每个阶段创建Kratos配置
    base_config = create_base_kratos_config()
    
    for stage_id, stage_info in stages_info.items():
        print(f"\n🔧 创建阶段 {stage_info['name']} 的Kratos配置...")
        
        stage_config = create_stage_kratos_config(stage_info, base_config, fpn_data)
        
        # 保存配置文件
        output_dir = Path(f"multi_stage_kratos_v2/stage_{stage_id}")
        output_dir.mkdir(parents=True, exist_ok=True)
        
        config_file = output_dir / "ProjectParameters.json"
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(stage_config, f, indent=2, ensure_ascii=False)
        
        print(f"✅ 配置文件已保存: {config_file}")
    
    print(f"\n✅ 多阶段配置创建完成！")
    return True

if __name__ == "__main__":
    main()
