#!/usr/bin/env python3
"""调试Kratos求解器问题 - 简化测试"""

import KratosMultiphysics
from KratosMultiphysics.StructuralMechanicsApplication.structural_mechanics_analysis import StructuralMechanicsAnalysis
import json
import os

def create_simple_test_case():
    """创建一个简单的测试用例"""
    
    # 简化的ProjectParameters
    simple_params = {
        "problem_data": {
            "problem_name": "simple_test",
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
            "analysis_type": "linear",  # 先用线性测试
            "rotation_dofs": True,
            "model_import_settings": {
                "input_type": "mdpa",
                "input_filename": "model"
            },
            "material_import_settings": {
                "materials_filename": "materials.json"
            },
            "time_stepping": {
                "time_step": 1.0
            },
            "max_iteration": 1,
            "line_search": False,
            "convergence_criterion": "and_criterion",
            "displacement_relative_tolerance": 1e-6,
            "residual_relative_tolerance": 1e-6,
            "displacement_absolute_tolerance": 1e-9,
            "residual_absolute_tolerance": 1e-9,
            "linear_solver_settings": {
                "solver_type": "skyline_lu_factorization",
                "scaling": True
            }
        },
        "processes": {
            "constraints_process_list": [
                {
                    "python_module": "fix_scalar_variable_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "FixScalarVariableProcess",
                    "Parameters": {
                        "model_part_name": "Structure.BND_8_C111",
                        "variable_name": "DISPLACEMENT_X",
                        "constrained": True,
                        "interval": [0.0, "End"]
                    }
                },
                {
                    "python_module": "fix_scalar_variable_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "FixScalarVariableProcess",
                    "Parameters": {
                        "model_part_name": "Structure.BND_8_C111",
                        "variable_name": "DISPLACEMENT_Y",
                        "constrained": True,
                        "interval": [0.0, "End"]
                    }
                },
                {
                    "python_module": "fix_scalar_variable_process",
                    "kratos_module": "KratosMultiphysics",
                    "process_name": "FixScalarVariableProcess",
                    "Parameters": {
                        "model_part_name": "Structure.BND_8_C111",
                        "variable_name": "DISPLACEMENT_Z",
                        "constrained": True,
                        "interval": [0.0, "End"]
                    }
                }
            ],
            "loads_process_list": [
                {
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
                }
            ]
        },
        "output_processes": {}
    }
    
    return simple_params

def test_simple_kratos():
    """测试简化的Kratos分析"""
    
    print("🧪 创建简化测试用例...")
    
    # 切换到分析目录
    os.chdir('temp_kratos_analysis')
    
    # 创建简化参数
    simple_params = create_simple_test_case()
    
    # 保存简化参数文件
    with open('SimpleParameters.json', 'w') as f:
        json.dump(simple_params, f, indent=2)
    
    print("📋 简化配置:")
    print(f"   - 分析类型: {simple_params['solver_settings']['analysis_type']}")
    print(f"   - 线性求解器: {simple_params['solver_settings']['linear_solver_settings']['solver_type']}")
    print(f"   - 重力荷载: 启用")
    print(f"   - 边界约束: BND_8_C111 (XYZ全约束)")
    
    try:
        print("\n🚀 启动简化Kratos分析...")
        
        # 使用简化参数
        parameters = KratosMultiphysics.Parameters(json.dumps(simple_params))
        analysis = StructuralMechanicsAnalysis(KratosMultiphysics.Model(), parameters)
        
        print("⚡ 开始求解...")
        analysis.Run()
        
        print("✅ 简化分析成功完成!")
        return True
        
    except Exception as e:
        print(f"❌ 简化分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_simple_kratos()
    print(f'\n🎯 简化测试结果: {"成功" if success else "失败"}')
