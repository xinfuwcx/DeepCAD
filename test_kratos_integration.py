#!/usr/bin/env python3
"""
Kratos集成测试脚本
验证所有必要的模块是否正确安装和可用
"""

import sys
import traceback

def test_kratos_core():
    """测试Kratos核心"""
    try:
        import KratosMultiphysics
        print("✅ KratosMultiphysics 核心模块导入成功")
        
        # 测试基本功能
        model = KratosMultiphysics.Model()
        model_part = model.CreateModelPart("test")
        print("✅ Kratos基本功能测试通过")
        
        return True
    except Exception as e:
        print(f"❌ Kratos核心测试失败: {e}")
        traceback.print_exc()
        return False

def test_geo_mechanics():
    """测试地质力学模块"""
    try:
        import KratosMultiphysics.GeoMechanicsApplication
        print("✅ GeoMechanicsApplication 导入成功")
        return True
    except Exception as e:
        print(f"⚠️ GeoMechanicsApplication 不可用: {e}")
        return False

def test_structural_mechanics():
    """测试结构力学模块"""
    try:
        import KratosMultiphysics.StructuralMechanicsApplication
        print("✅ StructuralMechanicsApplication 导入成功")
        return True
    except Exception as e:
        print(f"⚠️ StructuralMechanicsApplication 不可用: {e}")
        return False

def test_fluid_dynamics():
    """测试流体力学模块"""
    try:
        import KratosMultiphysics.FluidDynamicsApplication
        print("✅ FluidDynamicsApplication 导入成功")
        return True
    except Exception as e:
        print(f"⚠️ FluidDynamicsApplication 不可用: {e}")
        return False

def test_constitutive_laws():
    """测试本构定律模块"""
    try:
        import KratosMultiphysics.ConstitutiveLawsApplication
        print("✅ ConstitutiveLawsApplication 导入成功")
        return True
    except Exception as e:
        print(f"⚠️ ConstitutiveLawsApplication 不可用: {e}")
        return False

def main():
    """主测试函数"""
    print("="*50)
    print("Kratos集成测试开始")
    print("="*50)
    
    tests = [
        ("Kratos核心", test_kratos_core),
        ("地质力学", test_geo_mechanics),
        ("结构力学", test_structural_mechanics),
        ("流体力学", test_fluid_dynamics),
        ("本构定律", test_constitutive_laws)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n🧪 测试 {test_name}...")
        result = test_func()
        results.append((test_name, result))
    
    print("\n" + "="*50)
    print("测试结果汇总:")
    print("="*50)
    
    critical_passed = 0
    total_tests = len(tests)
    
    for test_name, passed in results:
        status = "✅ 通过" if passed else "❌ 失败"
        print(f"{test_name}: {status}")
        if passed and test_name in ["Kratos核心", "地质力学"]:
            critical_passed += 1
    
    print(f"\n总体状态: {sum(1 for _, p in results if p)}/{total_tests} 测试通过")
    
    if critical_passed >= 1:  # 至少核心模块可用
        print("🎉 DeepCAD可以基本运行（核心功能可用）")
        return True
    else:
        print("⚠️ DeepCAD无法正常运行（缺少关键模块）")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
