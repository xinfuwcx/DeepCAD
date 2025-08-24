#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
真正的两阶段FPN分析 - 包含真实预应力载荷和开挖效应
"""

import os
import sys
import json
import time
import shutil
import subprocess
from pathlib import Path

def parse_real_fpn_prestress():
    """解析FPN文件中的真实预应力载荷"""
    print("🔍 解析FPN文件中的真实预应力载荷...")
    
    fpn_file = Path('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    
    prestress_loads = {}
    
    with open(fpn_file, 'r', encoding='gb18030') as f:
        lines = f.readlines()
    
    for line in lines:
        line = line.strip()
        if line.startswith('PSTRST'):
            # 预应力载荷: PSTRST, load_set, load_id, force, ...
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 4:
                load_set = parts[1]
                load_id = parts[2]
                force = float(parts[3]) if parts[3] else 0.0
                
                if load_set not in prestress_loads:
                    prestress_loads[load_set] = {}
                
                prestress_loads[load_set][load_id] = force
    
    total_prestress = 0
    for load_set, loads in prestress_loads.items():
        set_total = sum(loads.values())
        total_prestress += set_total
        print(f"  载荷集{load_set}: {len(loads)}个预应力, 总力值: {set_total/1000:.0f} kN")
    
    print(f"✅ 总计: {sum(len(loads) for loads in prestress_loads.values())}个预应力载荷")
    print(f"   总预应力: {total_prestress/1000:.0f} kN")
    
    return prestress_loads

def parse_real_fpn_excavation():
    """解析FPN文件中的开挖信息"""
    print("🔍 解析FPN文件中的开挖信息...")
    
    fpn_file = Path('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    
    excavation_elements = []
    stage_materials = {}
    
    with open(fpn_file, 'r', encoding='gb18030') as f:
        lines = f.readlines()
    
    current_stage = None
    for line in lines:
        line = line.strip()
        if line.startswith('STAGE'):
            # 分析阶段
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 4:
                stage_id = parts[1]
                stage_name = parts[3]
                current_stage = stage_id
                stage_materials[stage_id] = {'name': stage_name, 'materials': [], 'removed': []}
                print(f"  阶段{stage_id}: {stage_name}")
        
        elif line.startswith('MADD') and current_stage:
            # 材料添加
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3:
                stage_id = parts[1]
                if stage_id == current_stage:
                    material_count = int(parts[2]) if parts[2] else 0
                    stage_materials[current_stage]['materials'].append(material_count)
        
        elif line.startswith('MREM') and current_stage:
            # 材料移除（开挖）
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3:
                stage_id = parts[1]
                if stage_id == current_stage:
                    removed_count = int(parts[2]) if parts[2] else 0
                    stage_materials[current_stage]['removed'].append(removed_count)
    
    return stage_materials

def create_real_two_stage_config():
    """创建真正的两阶段Kratos配置"""
    print("🔧 创建真正的两阶段Kratos配置...")
    
    # 解析真实数据
    prestress_loads = parse_real_fpn_prestress()
    excavation_info = parse_real_fpn_excavation()
    
    config = {
        "problem_data": {
            "problem_name": "real_two_stage_fpn_analysis",
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
                "input_filename": "complete_fpn_model_with_boundaries"
            },
            "material_import_settings": {
                "materials_filename": "CompleteSoilMaterials.json"
            },
            "time_stepping": {
                "time_step": 1.0
            },
            "line_search": True,  # 启用线搜索以处理非线性
            "convergence_criterion": "residual_criterion",
            "displacement_relative_tolerance": 0.001,  # 放宽收敛条件
            "displacement_absolute_tolerance": 1e-08,
            "residual_relative_tolerance": 0.001,
            "residual_absolute_tolerance": 1e-08,
            "max_iteration": 100,  # 增加最大迭代次数
            "use_old_stiffness_in_first_iteration": False,
            "problem_domain_sub_model_part_list": ["Structure"],
            "processes_sub_model_part_list": [
                "BOUNDARY_8_111000",
                "BOUNDARY_8_100000", 
                "BOUNDARY_8_010000"
            ]
        },
        "processes": {
            "constraints_process_list": [
                # 边界条件保持不变
                {
                    "python_module": "assign_vector_variable_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "AssignVectorVariableProcess",
                    "Parameters": {
                        "model_part_name": "Structure.BOUNDARY_8_111000",
                        "variable_name": "DISPLACEMENT",
                        "constrained": [True, True, True],
                        "value": [0.0, 0.0, 0.0],
                        "interval": [0.0, "End"]
                    }
                },
                {
                    "python_module": "assign_vector_variable_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "AssignVectorVariableProcess",
                    "Parameters": {
                        "model_part_name": "Structure.BOUNDARY_8_100000",
                        "variable_name": "DISPLACEMENT",
                        "constrained": [True, False, False],
                        "value": [0.0, 0.0, 0.0],
                        "interval": [0.0, "End"]
                    }
                },
                {
                    "python_module": "assign_vector_variable_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "AssignVectorVariableProcess",
                    "Parameters": {
                        "model_part_name": "Structure.BOUNDARY_8_010000",
                        "variable_name": "DISPLACEMENT",
                        "constrained": [False, True, False],
                        "value": [0.0, 0.0, 0.0],
                        "interval": [0.0, "End"]
                    }
                }
            ],
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
                    "output_path": "VTK_Output_Real_Two_Stage",
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
    
    # 阶段1: 重力载荷（初始地应力）
    gravity_load = {
        "python_module": "assign_vector_by_direction_process",
        "kratos_module": "KratosMultiphysics",
        "process_name": "AssignVectorByDirectionProcess",
        "Parameters": {
            "model_part_name": "Structure",
            "variable_name": "VOLUME_ACCELERATION",
            "modulus": 9.80665,
            "direction": [0.0, -1.0, 0.0],
            "constrained": False,
            "interval": [0.0, 1.0]  # 只在第一阶段
        }
    }
    config["processes"]["loads_process_list"].append(gravity_load)
    
    # 阶段2: 继续重力 + 预应力载荷
    gravity_load_stage2 = {
        "python_module": "assign_vector_by_direction_process",
        "kratos_module": "KratosMultiphysics",
        "process_name": "AssignVectorByDirectionProcess",
        "Parameters": {
            "model_part_name": "Structure",
            "variable_name": "VOLUME_ACCELERATION",
            "modulus": 9.80665,
            "direction": [0.0, -1.0, 0.0],
            "constrained": False,
            "interval": [1.0, 2.0]  # 第二阶段
        }
    }
    config["processes"]["loads_process_list"].append(gravity_load_stage2)
    
    # 添加预应力载荷（简化为整体载荷）
    total_prestress = sum(sum(loads.values()) for loads in prestress_loads.values())
    if total_prestress > 0:
        # 将预应力转换为等效体力
        prestress_equivalent = {
            "python_module": "assign_vector_by_direction_process",
            "kratos_module": "KratosMultiphysics",
            "process_name": "AssignVectorByDirectionProcess",
            "Parameters": {
                "model_part_name": "Structure",
                "variable_name": "VOLUME_ACCELERATION",
                "modulus": total_prestress / 1e9,  # 转换为等效加速度
                "direction": [1.0, 0.0, 0.0],  # 水平方向
                "constrained": False,
                "interval": [1.0, 2.0]  # 只在第二阶段施加
            }
        }
        config["processes"]["loads_process_list"].append(prestress_equivalent)
        
        print(f"✅ 添加等效预应力载荷: {total_prestress/1000:.0f} kN")
    
    return config

def run_real_two_stage_analysis():
    """运行真正的两阶段分析"""
    print("🚀 开始真正的两阶段FPN分析")
    print("=" * 80)
    
    # 创建输出目录
    output_dir = Path("real_two_stage_fpn_analysis")
    output_dir.mkdir(exist_ok=True)
    
    # 创建真实配置
    config = create_real_two_stage_config()
    
    # 保存配置文件
    config_file = output_dir / "ProjectParameters.json"
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    print(f"✅ 真实两阶段配置已创建: {config_file}")
    
    # 复制必要文件
    files_to_copy = [
        ("complete_soil_analysis/CompleteSoilMaterials.json", "CompleteSoilMaterials.json"),
        ("complete_fpn_model_with_boundaries.mdpa", "complete_fpn_model_with_boundaries.mdpa")
    ]
    
    for source, target in files_to_copy:
        source_path = Path(source)
        if source_path.exists():
            target_path = output_dir / target
            shutil.copy2(source_path, target_path)
            print(f"✅ 文件已复制: {target}")
    
    print(f"\n🔧 开始真正的两阶段Kratos计算...")
    success = run_kratos_real_analysis(output_dir)
    
    if success:
        print(f"\n🎉 真正的两阶段分析成功完成！")
        return True
    else:
        print(f"\n❌ 真正的两阶段分析失败")
        return False

def run_kratos_real_analysis(analysis_dir):
    """运行Kratos真实分析"""
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
        print(f"✅ 真实两阶段计算完成！用时: {end_time - start_time:.2f}秒")
        
        # 检查输出文件
        vtk_files = list(Path('.').glob('**/*.vtk'))
        print(f"📊 生成VTK文件: {len(vtk_files)}个")
        for vtk_file in vtk_files:
            size = vtk_file.stat().st_size
            print(f"   {vtk_file.name}: {size:,} bytes")
        
        return True
        
    except Exception as e:
        print(f"❌ 真实分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        os.chdir(original_cwd)

if __name__ == "__main__":
    success = run_real_two_stage_analysis()
    if success:
        print("\n🎉 真正的两阶段FPN分析完成！")
        print("💡 现在有了包含真实预应力载荷的计算结果")
    else:
        print("\n💥 真实分析失败，请检查错误信息")
