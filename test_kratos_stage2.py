#!/usr/bin/env python3
"""
测试Kratos阶段2分析
"""

import os
import sys

def test_kratos_import():
    """测试Kratos导入"""
    try:
        import KratosMultiphysics
        print("✅ KratosMultiphysics 导入成功")
        
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
        print("✅ StructuralMechanicsApplication 导入成功")
        
        return True
    except ImportError as e:
        print(f"❌ Kratos导入失败: {e}")
        return False

def test_file_reading():
    """测试文件读取"""
    stage_dir = "multi_stage_kratos_conversion/stage_2"
    
    # 检查文件是否存在
    files_to_check = [
        "ProjectParameters.json",
        "stage_2_analysis.mdpa", 
        "materials.json"
    ]
    
    for filename in files_to_check:
        filepath = os.path.join(stage_dir, filename)
        if os.path.exists(filepath):
            print(f"✅ {filename} 存在")
            # 检查文件大小
            size = os.path.getsize(filepath)
            print(f"   文件大小: {size:,} 字节")
        else:
            print(f"❌ {filename} 不存在")
            return False
    
    return True

def test_parameters_loading():
    """测试参数文件加载"""
    try:
        import json
        stage_dir = "multi_stage_kratos_conversion/stage_2"
        params_file = os.path.join(stage_dir, "ProjectParameters.json")
        
        with open(params_file, 'r') as f:
            params = json.load(f)
        
        print("✅ ProjectParameters.json 加载成功")
        print(f"   问题名称: {params.get('problem_data', {}).get('problem_name', 'N/A')}")
        print(f"   求解器类型: {params.get('solver_settings', {}).get('solver_type', 'N/A')}")
        
        return True
    except Exception as e:
        print(f"❌ 参数文件加载失败: {e}")
        return False

def test_materials_loading():
    """测试材料文件加载"""
    try:
        import json
        stage_dir = "multi_stage_kratos_conversion/stage_2"
        materials_file = os.path.join(stage_dir, "materials.json")
        
        with open(materials_file, 'r') as f:
            materials = json.load(f)
        
        print("✅ materials.json 加载成功")
        print(f"   材料数量: {len(materials.get('properties', []))}")
        
        # 检查是否有材料12
        material_ids = [prop.get('properties_id') for prop in materials.get('properties', [])]
        if 12 in material_ids:
            print("✅ 材料ID 12 存在")
        else:
            print("❌ 材料ID 12 不存在")
            print(f"   可用材料ID: {material_ids}")
        
        return True
    except Exception as e:
        print(f"❌ 材料文件加载失败: {e}")
        return False

def main():
    """主函数"""
    print("🔍 测试Kratos阶段2分析设置...")
    print("=" * 50)
    
    # 测试步骤
    tests = [
        ("Kratos导入", test_kratos_import),
        ("文件检查", test_file_reading),
        ("参数加载", test_parameters_loading),
        ("材料加载", test_materials_loading)
    ]
    
    all_passed = True
    for test_name, test_func in tests:
        print(f"\n📋 {test_name}:")
        if not test_func():
            all_passed = False
    
    print("\n" + "=" * 50)
    if all_passed:
        print("✅ 所有测试通过！可以尝试运行Kratos分析")
    else:
        print("❌ 部分测试失败，需要修复问题")

if __name__ == "__main__":
    main()
