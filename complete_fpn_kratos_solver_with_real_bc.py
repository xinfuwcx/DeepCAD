#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基于真实FPN载荷和边界条件的完整Kratos求解器
"""

import os
import sys
import json
import time
import shutil
from pathlib import Path

def parse_fpn_loads_boundaries():
    """解析FPN文件中的真实载荷和边界条件"""
    print("🔍 解析FPN文件中的真实载荷和边界条件...")
    
    fpn_file = Path('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    
    loads = {}
    boundaries = {}
    current_bset = None
    
    with open(fpn_file, 'r', encoding='gb18030') as f:
        lines = f.readlines()
    
    # 解析载荷
    for line in lines:
        line = line.strip()
        if line.startswith('GRAV'):
            # 重力载荷
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 6:
                load_id = parts[1]
                gx = float(parts[4]) if parts[4] else 0.0
                gy = float(parts[5]) if parts[5] else 0.0
                gz = float(parts[6]) if parts[6] else 0.0
                
                loads[load_id] = {
                    'type': 'gravity',
                    'acceleration': [gx, gy, gz]
                }
        
        elif line.startswith('BSET'):
            # 边界条件集合
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 2:
                current_bset = parts[1]
                boundaries[current_bset] = {
                    'name': parts[2] if len(parts) > 2 else f'Boundary_{current_bset}',
                    'constraints': []
                }
        
        elif line.startswith('CONST') and current_bset:
            # 约束条件
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 4:
                bset_id = parts[1]
                node_id = parts[2]
                constraint_code = parts[3]
                
                if bset_id == current_bset:
                    boundaries[current_bset]['constraints'].append({
                        'node': int(node_id),
                        'code': constraint_code
                    })
    
    print(f"✅ 解析完成: {len(loads)}种载荷, {len(boundaries)}个边界条件集")
    return loads, boundaries

def create_kratos_boundary_conditions(boundaries):
    """基于FPN边界条件创建Kratos约束过程"""
    print("🔒 创建Kratos边界条件...")
    
    constraints_process_list = []
    
    for bset_id, bset_data in boundaries.items():
        constraints = bset_data['constraints']
        
        # 按约束代码分组节点
        constraint_groups = {}
        for constraint in constraints:
            code = constraint['code']
            if code not in constraint_groups:
                constraint_groups[code] = []
            constraint_groups[code].append(constraint['node'])
        
        # 为每种约束代码创建约束过程
        for code, nodes in constraint_groups.items():
            # 解析约束代码 (6位二进制: UX UY UZ RX RY RZ)
            ux_fixed = code[0] == '1'
            uy_fixed = code[1] == '1'  
            uz_fixed = code[2] == '1'
            
            constraint_name = f"BOUNDARY_{bset_id}_{code}"
            
            # 创建节点组文件
            node_group_file = f"{constraint_name}_nodes.txt"
            with open(node_group_file, 'w') as f:
                for node in nodes:
                    f.write(f"{node}\n")
            
            # 创建约束过程
            constraint_process = {
                "python_module": "assign_vector_variable_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorVariableProcess",
                "Parameters": {
                    "model_part_name": f"Structure.{constraint_name}",
                    "variable_name": "DISPLACEMENT",
                    "constrained": [ux_fixed, uy_fixed, uz_fixed],
                    "value": [0.0, 0.0, 0.0],
                    "interval": [0.0, "End"]
                }
            }
            
            constraints_process_list.append(constraint_process)
            
            print(f"  约束{code}: {len(nodes)}个节点 (UX={ux_fixed}, UY={uy_fixed}, UZ={uz_fixed})")
    
    return constraints_process_list

def create_kratos_loads(loads):
    """基于FPN载荷创建Kratos载荷过程"""
    print("📐 创建Kratos载荷...")
    
    loads_process_list = []
    
    for load_id, load_data in loads.items():
        if load_data['type'] == 'gravity':
            gx, gy, gz = load_data['acceleration']
            
            # 重力载荷
            gravity_process = {
                "python_module": "assign_vector_by_direction_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "AssignVectorByDirectionProcess",
                "Parameters": {
                    "model_part_name": "Structure",
                    "variable_name": "VOLUME_ACCELERATION",
                    "modulus": (gx**2 + gy**2 + gz**2)**0.5,
                    "direction": [gx, gy, gz] if (gx**2 + gy**2 + gz**2) > 0 else [0.0, 0.0, -1.0],
                    "constrained": False,
                    "interval": [0.0, "End"]
                }
            }
            
            loads_process_list.append(gravity_process)
            print(f"  重力载荷: ({gx}, {gy}, {gz}) m/s²")
    
    return loads_process_list

def create_complete_kratos_config():
    """创建完整的Kratos配置"""
    print("🔧 创建完整的Kratos配置...")
    
    # 解析FPN载荷和边界条件
    loads, boundaries = parse_fpn_loads_boundaries()
    
    # 创建载荷和边界条件过程
    loads_process_list = create_kratos_loads(loads)
    constraints_process_list = create_kratos_boundary_conditions(boundaries)
    
    config = {
        "problem_data": {
            "problem_name": "complete_fpn_real_bc_analysis",
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
                "input_filename": "complete_fpn_model_with_boundaries"
            },
            "material_import_settings": {
                "materials_filename": "CompleteSoilMaterials.json"
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
            "max_iteration": 50,  # 增加迭代次数
            "use_old_stiffness_in_first_iteration": False,
            "problem_domain_sub_model_part_list": ["Structure"],
            "processes_sub_model_part_list": []
        },
        "processes": {
            "constraints_process_list": constraints_process_list,
            "loads_process_list": loads_process_list
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
                    "output_path": "VTK_Output_Complete_Real_BC",
                    "save_output_files_in_folder": True,
                    "nodal_solution_step_data_variables": [
                        "DISPLACEMENT",
                        "REACTION",
                        "VELOCITY",
                        "ACCELERATION"
                    ],
                    "gauss_point_variables_in_elements": [
                        "CAUCHY_STRESS_TENSOR",
                        "GREEN_LAGRANGE_STRAIN_TENSOR"
                    ],
                    "element_data_value_variables": [
                        "VON_MISES_STRESS"
                    ]
                }
            }]
        }
    }
    
    # 添加边界条件子模型部分到processes_sub_model_part_list
    for bset_id, bset_data in boundaries.items():
        constraints = bset_data['constraints']
        constraint_groups = {}
        for constraint in constraints:
            code = constraint['code']
            if code not in constraint_groups:
                constraint_groups[code] = []
            constraint_groups[code].append(constraint['node'])
        
        for code in constraint_groups.keys():
            constraint_name = f"BOUNDARY_{bset_id}_{code}"
            config["solver_settings"]["processes_sub_model_part_list"].append(constraint_name)
    
    return config

def run_complete_real_bc_analysis():
    """运行基于真实边界条件的完整分析"""
    print("🚀 开始基于真实FPN边界条件的完整分析")
    print("=" * 80)
    
    # 创建输出目录
    output_dir = Path("complete_fpn_real_bc_analysis")
    output_dir.mkdir(exist_ok=True)
    
    # 创建Kratos配置
    config = create_complete_kratos_config()
    
    # 保存配置文件
    config_file = output_dir / "ProjectParameters.json"
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    print(f"✅ 配置文件已创建: {config_file}")
    
    # 复制材料文件
    source_materials = Path("complete_soil_analysis/CompleteSoilMaterials.json")
    if source_materials.exists():
        target_materials = output_dir / "CompleteSoilMaterials.json"
        shutil.copy2(source_materials, target_materials)
        print(f"✅ 材料文件已复制: {target_materials}")
    
    # 复制MDPA文件
    source_mdpa = Path("complete_fpn_model_with_boundaries.mdpa")
    if source_mdpa.exists():
        target_mdpa = output_dir / "complete_fpn_model_with_boundaries.mdpa"
        shutil.copy2(source_mdpa, target_mdpa)
        print(f"✅ MDPA文件已复制: {target_mdpa}")
    
    print(f"\n🎯 完整配置已创建: {output_dir}")
    print(f"   载荷过程: {len(config['processes']['loads_process_list'])}个")
    print(f"   约束过程: {len(config['processes']['constraints_process_list'])}个")
    print(f"   边界条件子模型: {len(config['solver_settings']['processes_sub_model_part_list'])}个")
    
    # 运行Kratos分析
    print(f"\n🔧 开始Kratos计算...")
    success = run_kratos_analysis(output_dir)
    
    if success:
        print(f"\n🎉 基于真实FPN边界条件的完整分析成功！")
        return True
    else:
        print(f"\n❌ 分析失败")
        return False

def run_kratos_analysis(analysis_dir):
    """运行Kratos分析"""
    try:
        # 切换到分析目录
        original_cwd = os.getcwd()
        os.chdir(analysis_dir)
        
        # 运行Kratos
        import KratosMultiphysics
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
        
        start_time = time.time()
        
        with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
            params_text = f.read()
        
        parameters = KratosMultiphysics.Parameters(params_text)
        model = KratosMultiphysics.Model()
        analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
        analysis.Run()
        
        end_time = time.time()
        print(f"✅ 计算完成！用时: {end_time - start_time:.2f}秒")
        
        # 检查输出文件
        vtk_files = list(Path('.').glob('**/*.vtk'))
        print(f"📊 生成VTK文件: {len(vtk_files)}个")
        for vtk_file in vtk_files[:3]:
            size = vtk_file.stat().st_size
            print(f"   {vtk_file.name}: {size:,} bytes")
        
        return True
        
    except Exception as e:
        print(f"❌ 分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        os.chdir(original_cwd)

if __name__ == "__main__":
    success = run_complete_real_bc_analysis()
    if success:
        print("\n🎉 现在你有了基于真实FPN载荷和边界条件的完整且合理的计算结果！")
    else:
        print("\n💥 分析失败，请检查错误信息")
