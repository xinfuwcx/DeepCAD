#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整的两阶段FPN分析，计算完成后自动启动主界面显示结果
"""

import os
import sys
import json
import time
import shutil
import subprocess
from pathlib import Path

def parse_fpn_two_stages():
    """解析FPN文件中的两个分析阶段"""
    print("🔍 解析FPN文件中的两个分析阶段...")
    
    fpn_file = Path('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    
    stages = {}
    current_stage = None
    
    with open(fpn_file, 'r', encoding='gb18030') as f:
        lines = f.readlines()
    
    for line in lines:
        line = line.strip()
        if line.startswith('STAGE'):
            # 分析阶段定义
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 4:
                stage_id = parts[1]
                stage_name = parts[3]
                
                stages[stage_id] = {
                    'name': stage_name,
                    'materials': [],
                    'loads': []
                }
                current_stage = stage_id
                print(f"  阶段{stage_id}: {stage_name}")
        
        elif line.startswith('MADD') and current_stage:
            # 材料添加
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3:
                stage_id = parts[1]
                if stage_id == current_stage:
                    stages[current_stage]['materials'].append(parts[2:])
        
        elif line.startswith('LADD') and current_stage:
            # 载荷添加
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 3:
                stage_id = parts[1]
                if stage_id == current_stage:
                    stages[current_stage]['loads'].append(parts[2:])
    
    print(f"✅ 解析完成: {len(stages)}个分析阶段")
    return stages

def create_two_stage_kratos_config():
    """创建两阶段Kratos配置"""
    print("🔧 创建两阶段Kratos配置...")
    
    # 解析FPN阶段
    stages = parse_fpn_two_stages()
    
    config = {
        "problem_data": {
            "problem_name": "two_stage_fpn_analysis",
            "parallel_type": "OpenMP",
            "echo_level": 1,
            "start_time": 0.0,
            "end_time": 2.0  # 两个时间步
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
                "time_step": 1.0  # 每个阶段1个时间步
            },
            "line_search": False,
            "convergence_criterion": "residual_criterion",
            "displacement_relative_tolerance": 0.0001,
            "displacement_absolute_tolerance": 1e-09,
            "residual_relative_tolerance": 0.0001,
            "residual_absolute_tolerance": 1e-09,
            "max_iteration": 50,
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
                # 边界条件（整个分析过程有效）
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
            "loads_process_list": [
                # 阶段1: 初始应力 (0-1时间)
                {
                    "python_module": "assign_vector_by_direction_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "AssignVectorByDirectionProcess",
                    "Parameters": {
                        "model_part_name": "Structure",
                        "variable_name": "VOLUME_ACCELERATION",
                        "modulus": 9.80665,
                        "direction": [0.0, -1.0, 0.0],
                        "constrained": False,
                        "interval": [0.0, 1.0]  # 第一阶段
                    }
                },
                # 阶段2: 支护开挖 (1-2时间)
                {
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
            ]
        },
        "output_processes": {
            "vtk_output": [{
                "python_module": "vtk_output_process",
                "kratos_module": "KratosMultiphysics",
                "process_name": "VtkOutputProcess",
                "Parameters": {
                    "model_part_name": "Structure",
                    "output_control_type": "step",
                    "output_interval": 1,  # 每个阶段输出一次
                    "file_format": "ascii",
                    "output_precision": 7,
                    "output_sub_model_parts": False,
                    "output_path": "VTK_Output_Two_Stage",
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
    
    return config

def run_two_stage_analysis():
    """运行两阶段分析"""
    print("🚀 开始两阶段FPN分析")
    print("=" * 80)
    
    # 创建输出目录
    output_dir = Path("two_stage_fpn_analysis")
    output_dir.mkdir(exist_ok=True)
    
    # 创建Kratos配置
    config = create_two_stage_kratos_config()
    
    # 保存配置文件
    config_file = output_dir / "ProjectParameters.json"
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    print(f"✅ 两阶段配置文件已创建: {config_file}")
    
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
    
    print(f"\n🔧 开始两阶段Kratos计算...")
    success = run_kratos_two_stage_analysis(output_dir)
    
    if success:
        print(f"\n🎉 两阶段分析成功完成！")
        
        # 自动启动主界面显示结果
        print(f"\n🖥️ 自动启动主界面显示结果...")
        launch_gui_with_results()
        
        return True
    else:
        print(f"\n❌ 两阶段分析失败")
        return False

def run_kratos_two_stage_analysis(analysis_dir):
    """运行Kratos两阶段分析"""
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
        print(f"✅ 两阶段计算完成！用时: {end_time - start_time:.2f}秒")
        
        # 检查输出文件
        vtk_files = list(Path('.').glob('**/*.vtk'))
        print(f"📊 生成VTK文件: {len(vtk_files)}个")
        for vtk_file in vtk_files:
            size = vtk_file.stat().st_size
            print(f"   {vtk_file.name}: {size:,} bytes")
        
        return True
        
    except Exception as e:
        print(f"❌ 两阶段分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        os.chdir(original_cwd)

def launch_gui_with_results():
    """启动主界面显示结果"""
    try:
        print("🖥️ 启动主界面...")
        
        # 启动主界面
        gui_script = Path("example6/professional_main.py")
        if gui_script.exists():
            subprocess.Popen([sys.executable, str(gui_script)], 
                           cwd=str(gui_script.parent))
            print("✅ 主界面已启动，请点击'开始CFD计算'查看两阶段分析结果")
        else:
            print("❌ 主界面文件不存在")
            
    except Exception as e:
        print(f"❌ 启动主界面失败: {e}")

if __name__ == "__main__":
    success = run_two_stage_analysis()
    if success:
        print("\n🎉 两阶段FPN分析完成，主界面已自动启动！")
        print("💡 在主界面中点击'开始CFD计算'按钮查看两阶段分析结果")
    else:
        print("\n💥 两阶段分析失败，请检查错误信息")
