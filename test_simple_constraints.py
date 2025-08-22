#!/usr/bin/env python3
"""测试简化的约束条件"""

import json
import os

def create_simple_constraints():
    """创建简化的约束条件 - 只对底部完全固定"""
    
    # 读取当前参数
    with open('temp_kratos_analysis/ProjectParameters.json', 'r') as f:
        params = json.load(f)
    
    # 简化约束条件 - 只保留底部完全固定
    simple_constraints = [
        {
            "python_module": "fix_scalar_variable_process",
            "kratos_module": "KratosMultiphysics", 
            "process_name": "FixScalarVariableProcess",
            "Parameters": {
                "model_part_name": "Structure.BND_BOTTOM",
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
                "model_part_name": "Structure.BND_BOTTOM",
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
                "model_part_name": "Structure.BND_BOTTOM", 
                "variable_name": "DISPLACEMENT_Z",
                "constrained": True,
                "interval": [0.0, "End"]
            }
        }
    ]
    
    # 更新约束条件
    params["processes"]["constraints_process_list"] = simple_constraints
    
    # 保存简化参数
    with open('temp_kratos_analysis/ProjectParameters_simple.json', 'w') as f:
        json.dump(params, f, indent=2)
    
    print("✅ 创建简化约束条件:")
    print("   - BND_BOTTOM: XYZ全约束 (1,867个节点)")
    print("   - 移除其他复杂约束")

def test_simple_constraints():
    """测试简化约束条件"""
    
    print("\n🧪 测试简化约束条件...")
    
    try:
        os.chdir('temp_kratos_analysis')
        
        import KratosMultiphysics
        from KratosMultiphysics.StructuralMechanicsApplication.structural_mechanics_analysis import StructuralMechanicsAnalysis
        
        with open('ProjectParameters_simple.json', 'r') as f:
            parameters = KratosMultiphysics.Parameters(f.read())
        
        print("⚡ 启动简化约束分析...")
        analysis = StructuralMechanicsAnalysis(KratosMultiphysics.Model(), parameters)
        analysis.Run()
        
        print("✅ 简化约束分析成功完成!")
        return True
        
    except Exception as e:
        print(f"❌ 简化约束分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        os.chdir('..')

if __name__ == "__main__":
    print("🔧 创建和测试简化约束条件...")
    
    create_simple_constraints()
    success = test_simple_constraints()
    
    print(f"\n🎯 简化约束测试结果: {'成功' if success else '失败'}")
    
    if not success:
        print("\n💡 建议:")
        print("   1. 检查BND_BOTTOM边界组是否存在")
        print("   2. 验证边界组包含足够的节点")
        print("   3. 考虑使用其他边界组合")
