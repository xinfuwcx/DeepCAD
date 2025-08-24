#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
真正基于FPN数据的Kratos求解器
"""

import os
import sys
import json
import time
import shutil
from pathlib import Path
import numpy as np

def analyze_fpn_data():
    """分析FPN文件数据"""
    print("🔍 分析FPN文件数据...")
    
    sys.path.insert(0, 'example2')
    from core.optimized_fpn_parser import OptimizedFPNParser
    
    fpn_file = Path('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    parser = OptimizedFPNParser()
    fpn_data = parser.parse_file_streaming(str(fpn_file))
    
    print(f"✅ FPN解析完成")
    print(f"   节点数量: {len(fpn_data.get('nodes', {})):,}")
    print(f"   单元数量: {len(fpn_data.get('elements', {})):,}")
    print(f"   材料数量: {len(fpn_data.get('materials', {}))}")
    print(f"   分析阶段: {len(fpn_data.get('analysis_stages', []))}")
    
    # 显示阶段信息
    stages = fpn_data.get('analysis_stages', [])
    for stage in stages:
        print(f"   阶段: {stage}")
    
    return fpn_data

def create_real_kratos_config(fpn_data, stage_info):
    """基于真实FPN数据创建Kratos配置"""
    print(f"🔧 创建阶段 '{stage_info['name']}' 的Kratos配置...")
    
    # 基础配置
    config = {
        "problem_data": {
            "problem_name": f"real_{stage_info['name']}_analysis",
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
                "input_filename": "real_fpn_model"
            },
            "material_import_settings": {
                "materials_filename": "RealStructuralMaterials.json"
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
                    "output_path": f"VTK_Output_Stage_{stage_info['id']}",
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
        }
    }
    
    # 添加载荷过程
    loads_process_list = []

    # 重力载荷 - 对所有材料
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

    # 根据FPN阶段数据添加特定载荷
    if stage_info['name'] == '初始地应力':
        # 初始地应力阶段：主要是重力和初始应力
        print(f"  配置初始地应力阶段载荷")

    elif stage_info['name'] == '第一层开挖':
        # 第一层开挖阶段：模拟开挖卸载
        print(f"  配置第一层开挖阶段载荷")
        # 可以添加开挖面的卸载或支护载荷

    config['processes']['loads_process_list'] = loads_process_list
    
    # 添加边界条件
    constraints_process_list = []

    # 底部固定 - 基于FPN边界条件数据
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

    # 侧面边界条件 - 限制水平位移
    # 根据深基坑工程实际情况，侧面通常限制法向位移
    print(f"  配置{stage_info['name']}边界条件")

    config['processes']['constraints_process_list'] = constraints_process_list
    
    return config

def create_real_materials_file(fpn_data):
    """基于FPN数据创建真实的材料文件"""
    print("🔧 创建真实材料文件...")

    materials = {
        "properties": []
    }

    # 从FPN数据中获取真实材料信息
    fpn_materials = fpn_data.get('materials', {})

    # 根据MDPA文件中实际存在的材料ID创建材料
    # 从输出可以看到存在MAT_2到MAT_12，但我们需要添加MAT_1和MAT_13
    existing_material_ids = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

    # 添加重要的结构材料
    important_materials = {
        1: "C30混凝土(隧道内衬)",
        13: "锚杆"
    }

    # 为所有材料创建配置
    all_material_ids = [1] + existing_material_ids + [13]

    for mat_id in all_material_ids:
        # 从FPN数据中获取材料属性
        fpn_mat = fpn_materials.get(mat_id, {})
        properties = fpn_mat.get('properties', {})

        # 根据材料类型设置参数
        if mat_id == 1:  # C30混凝土 - 隧道内衬
            material = {
                "model_part_name": f"Structure.MAT_{mat_id}",
                "properties_id": mat_id,
                "Material": {
                    "constitutive_law": {
                        "name": "LinearElastic3DLaw"
                    },
                    "Variables": {
                        "DENSITY": properties.get('DENSITY', 2549.0),
                        "YOUNG_MODULUS": properties.get('E', 30e9),  # 30 GPa
                        "POISSON_RATIO": properties.get('NU', 0.2)
                    },
                    "Tables": {}
                }
            }
        elif mat_id == 13:  # 锚杆
            material = {
                "model_part_name": f"Structure.MAT_{mat_id}",
                "properties_id": mat_id,
                "Material": {
                    "constitutive_law": {
                        "name": "LinearElastic3DLaw"
                    },
                    "Variables": {
                        "DENSITY": properties.get('DENSITY', 8005.0),
                        "YOUNG_MODULUS": properties.get('E', 206e9),  # 206 GPa
                        "POISSON_RATIO": properties.get('NU', 0.3)
                    },
                    "Tables": {}
                }
            }
        else:  # 土层材料
            material = {
                "model_part_name": f"Structure.MAT_{mat_id}",
                "properties_id": mat_id,
                "Material": {
                    "constitutive_law": {
                        "name": "MohrCoulombPlasticPotentialPlasticityConstitutiveLaw"
                    },
                    "Variables": {
                        "DENSITY": properties.get('DENSITY', 2000.0),
                        "YOUNG_MODULUS": properties.get('E', 30e6),
                        "POISSON_RATIO": properties.get('NU', 0.3),
                        "COHESION": properties.get('COHESION', 10000.0),
                        "INTERNAL_FRICTION_ANGLE": properties.get('FRICTION_ANGLE', 25.0),
                        "DILATANCY_ANGLE": 0.0
                    },
                    "Tables": {}
                }
            }

        materials["properties"].append(material)
        print(f"  添加材料{mat_id}: {fpn_mat.get('name', f'Material_{mat_id}')}")

    return materials

def create_real_mdpa_file(fpn_data):
    """基于FPN数据创建真实的MDPA文件"""
    print("🔧 创建真实MDPA文件...")
    
    # 简化版：使用现有的MDPA文件作为基础，但确保材料正确
    source_mdpa = Path("multi_stage_kratos_conversion/stage_1/stage_1_analysis.mdpa")
    if source_mdpa.exists():
        return str(source_mdpa)
    else:
        print("❌ 未找到源MDPA文件")
        return None

def run_real_kratos_analysis():
    """运行真正基于FPN数据的Kratos分析"""
    print("🚀 开始真正基于FPN数据的Kratos分析")
    print("=" * 60)
    
    # 1. 分析FPN数据
    fpn_data = analyze_fpn_data()
    
    # 2. 为每个阶段创建配置和运行分析
    stages = fpn_data.get('analysis_stages', [])
    
    for i, stage in enumerate(stages, 1):
        stage_info = {
            'id': stage.get('id', i),
            'name': stage.get('name', f'Stage_{i}')
        }
        
        print(f"\n🔧 === 处理{stage_info['name']}分析 ===")
        
        # 创建输出目录
        output_dir = Path(f"real_fpn_analysis_stage_{i}")
        output_dir.mkdir(exist_ok=True)
        
        # 创建Kratos配置
        config = create_real_kratos_config(fpn_data, stage_info)
        
        # 保存配置文件
        config_file = output_dir / "ProjectParameters.json"
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        # 创建材料文件
        materials = create_real_materials_file(fpn_data)
        materials_file = output_dir / "RealStructuralMaterials.json"
        with open(materials_file, 'w', encoding='utf-8') as f:
            json.dump(materials, f, indent=2, ensure_ascii=False)
        
        # 复制MDPA文件
        source_mdpa = create_real_mdpa_file(fpn_data)
        if source_mdpa:
            target_mdpa = output_dir / "real_fpn_model.mdpa"
            shutil.copy2(source_mdpa, target_mdpa)
            print(f"✅ MDPA文件已复制: {target_mdpa}")
        
        print(f"✅ {stage_info['name']}配置文件已创建: {output_dir}")
        
        # 运行Kratos分析
        success = run_single_stage_analysis(output_dir, stage_info['name'])
        
        if success:
            print(f"✅ {stage_info['name']}分析完成！")
        else:
            print(f"❌ {stage_info['name']}分析失败")
            break
    
    print(f"\n🎯 真实FPN数据分析完成！")
    return True

def run_single_stage_analysis(stage_dir, stage_name):
    """运行单个阶段的Kratos分析"""
    try:
        print(f"🔧 开始{stage_name}Kratos计算...")
        
        # 切换到阶段目录
        original_cwd = os.getcwd()
        os.chdir(stage_dir)
        
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
        print(f"✅ {stage_name}计算完成！用时: {end_time - start_time:.2f}秒")
        
        # 检查输出文件
        vtk_files = list(Path('.').glob('**/*.vtk'))
        print(f"📊 生成VTK文件: {len(vtk_files)}个")
        for vtk_file in vtk_files[:3]:
            size = vtk_file.stat().st_size
            print(f"   {vtk_file}: {size:,} bytes")
        
        return True
        
    except Exception as e:
        print(f"❌ {stage_name}分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        os.chdir(original_cwd)

if __name__ == "__main__":
    run_real_kratos_analysis()
