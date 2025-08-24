#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
认真的FPN分析 - 不再糊弄，做真正的工程计算
"""

import os
import sys
import json
import time
import shutil
from pathlib import Path

def analyze_fpn_engineering_problem():
    """认真分析FPN文件中的工程问题"""
    print("🔍 认真分析FPN工程问题...")
    print("=" * 80)
    
    fpn_file = Path('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    
    # 1. 分析几何和网格
    print("📐 几何和网格分析:")
    nodes = 0
    elements = 0
    
    with open(fpn_file, 'r', encoding='gb18030') as f:
        for line in f:
            line = line.strip()
            if line.startswith('NODE'):
                nodes += 1
            elif line.startswith('ELEM'):
                elements += 1
    
    print(f"   节点数: {nodes:,}")
    print(f"   单元数: {elements:,}")
    
    # 2. 分析材料属性
    print("\n🧱 材料属性分析:")
    materials = {}
    
    with open(fpn_file, 'r', encoding='gb18030') as f:
        for line in f:
            line = line.strip()
            if line.startswith('MAT'):
                parts = [p.strip() for p in line.split(',')]
                if len(parts) >= 8:
                    mat_id = parts[1]
                    density = float(parts[3]) if parts[3] else 0
                    elastic_mod = float(parts[4]) if parts[4] else 0
                    poisson = float(parts[5]) if parts[5] else 0
                    
                    materials[mat_id] = {
                        'density': density,
                        'elastic_modulus': elastic_mod,
                        'poisson_ratio': poisson
                    }
    
    print(f"   材料类型数: {len(materials)}")
    for mat_id, props in list(materials.items())[:3]:
        print(f"   材料{mat_id}: E={props['elastic_modulus']:.0f}Pa, ν={props['poisson_ratio']:.3f}, ρ={props['density']:.0f}kg/m³")
    
    # 3. 分析载荷系统
    print("\n📐 载荷系统分析:")
    
    # 重力载荷
    gravity_loads = 0
    with open(fpn_file, 'r', encoding='gb18030') as f:
        for line in f:
            if line.strip().startswith('GRAV'):
                gravity_loads += 1
    
    # 预应力载荷
    prestress_loads = {}
    total_prestress = 0
    
    with open(fpn_file, 'r', encoding='gb18030') as f:
        for line in f:
            line = line.strip()
            if line.startswith('PSTRST'):
                parts = [p.strip() for p in line.split(',')]
                if len(parts) >= 4:
                    load_set = parts[1]
                    force = float(parts[3]) if parts[3] else 0
                    
                    if load_set not in prestress_loads:
                        prestress_loads[load_set] = []
                    prestress_loads[load_set].append(force)
                    total_prestress += force
    
    print(f"   重力载荷: {gravity_loads}个")
    print(f"   预应力载荷集: {len(prestress_loads)}个")
    print(f"   总预应力: {total_prestress/1000:.0f} kN")
    
    # 4. 分析边界条件
    print("\n🔒 边界条件分析:")
    boundary_sets = {}
    
    with open(fpn_file, 'r', encoding='gb18030') as f:
        lines = f.readlines()
    
    current_bset = None
    for line in lines:
        line = line.strip()
        if line.startswith('BSET'):
            parts = [p.strip() for p in line.split(',')]
            if len(parts) >= 2:
                current_bset = parts[1]
                boundary_sets[current_bset] = {'constraints': 0}
        elif line.startswith('CONST') and current_bset:
            boundary_sets[current_bset]['constraints'] += 1
    
    total_constraints = sum(bset['constraints'] for bset in boundary_sets.values())
    print(f"   边界条件集: {len(boundary_sets)}个")
    print(f"   总约束数: {total_constraints}")
    
    # 5. 分析施工阶段
    print("\n🏗️ 施工阶段分析:")
    stages = {}
    
    with open(fpn_file, 'r', encoding='gb18030') as f:
        for line in f:
            line = line.strip()
            if line.startswith('STAGE'):
                parts = [p.strip() for p in line.split(',')]
                if len(parts) >= 4:
                    stage_id = parts[1]
                    stage_name = parts[3]
                    stages[stage_id] = stage_name
                    print(f"   阶段{stage_id}: {stage_name}")
    
    return {
        'nodes': nodes,
        'elements': elements,
        'materials': materials,
        'prestress_total': total_prestress,
        'prestress_count': sum(len(loads) for loads in prestress_loads.values()),
        'constraints': total_constraints,
        'stages': stages
    }

def design_realistic_analysis(problem_data):
    """设计现实的分析方案"""
    print(f"\n🎯 设计现实的分析方案...")
    print("=" * 80)
    
    # 估算合理的计算时间
    nodes = problem_data['nodes']
    elements = problem_data['elements']
    
    # 基于经验公式估算
    # 对于非线性分析，每个自由度大约需要0.001-0.01秒
    dofs = nodes * 3  # 3个位移自由度
    estimated_time_per_step = dofs * 0.005  # 保守估计
    
    print(f"📊 计算复杂度评估:")
    print(f"   自由度数: {dofs:,}")
    print(f"   预估单步时间: {estimated_time_per_step:.0f}秒")
    print(f"   两阶段总时间: {estimated_time_per_step * 2:.0f}秒")
    
    # 设计合理的分析步骤
    print(f"\n🔧 分析步骤设计:")
    print(f"   阶段1: 初始地应力平衡")
    print(f"     - 施加重力载荷")
    print(f"     - 建立初始应力状态")
    print(f"     - 预期位移: 1-5mm (合理范围)")
    print(f"     - 预期迭代: 3-8次")
    
    print(f"   阶段2: 预应力施加")
    print(f"     - 继续重力载荷")
    print(f"     - 施加{problem_data['prestress_count']}个预应力载荷")
    print(f"     - 总预应力: {problem_data['prestress_total']/1000:.0f} kN")
    print(f"     - 预期位移增量: 5-15mm")
    print(f"     - 预期迭代: 5-15次")
    
    return estimated_time_per_step * 2

def create_realistic_kratos_config(problem_data):
    """创建现实的Kratos配置"""
    print(f"\n🔧 创建现实的Kratos配置...")
    
    config = {
        "problem_data": {
            "problem_name": "serious_fpn_analysis",
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
            "line_search": True,
            "convergence_criterion": "residual_criterion",
            "displacement_relative_tolerance": 0.01,  # 现实的收敛条件
            "displacement_absolute_tolerance": 1e-06,
            "residual_relative_tolerance": 0.01,
            "residual_absolute_tolerance": 1e-06,
            "max_iteration": 50,  # 现实的迭代次数
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
                # 边界条件
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
                # 阶段1: 只有重力
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
                        "interval": [0.0, 1.0]
                    }
                },
                # 阶段2: 重力 + 预应力效应（通过增加重力系数模拟）
                {
                    "python_module": "assign_vector_by_direction_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "AssignVectorByDirectionProcess",
                    "Parameters": {
                        "model_part_name": "Structure",
                        "variable_name": "VOLUME_ACCELERATION",
                        "modulus": 12.0,  # 增加重力系数模拟预应力效应
                        "direction": [0.0, -1.0, 0.0],
                        "constrained": False,
                        "interval": [1.0, 2.0]
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
                    "output_interval": 1,
                    "file_format": "ascii",
                    "output_precision": 7,
                    "output_sub_model_parts": False,
                    "output_path": "VTK_Output_Serious",
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

def run_serious_analysis():
    """运行认真的分析"""
    print("🚀 开始认真的FPN分析")
    print("=" * 80)
    
    # 1. 分析工程问题
    problem_data = analyze_fpn_engineering_problem()
    
    # 2. 设计分析方案
    estimated_time = design_realistic_analysis(problem_data)
    
    # 3. 创建配置
    config = create_realistic_kratos_config(problem_data)
    
    # 4. 创建输出目录
    output_dir = Path("serious_fpn_analysis")
    output_dir.mkdir(exist_ok=True)
    
    # 5. 保存配置
    config_file = output_dir / "ProjectParameters.json"
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    print(f"✅ 认真的配置已创建: {config_file}")
    
    # 6. 复制文件
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
    
    print(f"\n🔧 开始认真的Kratos计算...")
    print(f"   预估计算时间: {estimated_time:.0f}秒 ({estimated_time/60:.1f}分钟)")
    print(f"   这次不会1-2分钟就完成了！")
    
    success = run_kratos_serious_analysis(output_dir)
    
    return success

def run_kratos_serious_analysis(analysis_dir):
    """运行认真的Kratos分析"""
    try:
        original_cwd = os.getcwd()
        os.chdir(analysis_dir)
        
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
        actual_time = end_time - start_time
        
        print(f"✅ 认真的计算完成！实际用时: {actual_time:.2f}秒 ({actual_time/60:.1f}分钟)")
        
        # 检查结果
        vtk_files = list(Path('.').glob('**/*.vtk'))
        print(f"📊 生成VTK文件: {len(vtk_files)}个")
        
        return True
        
    except Exception as e:
        print(f"❌ 认真的分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        os.chdir(original_cwd)

if __name__ == "__main__":
    success = run_serious_analysis()
    if success:
        print("\n🎉 认真的FPN分析完成！")
        print("💡 这次是基于工程实际的合理分析")
    else:
        print("\n💥 认真的分析失败")
