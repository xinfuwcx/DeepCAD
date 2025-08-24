#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试ConstitutiveLawsApplication安装后的变量可用性
"""

try:
    print("🔧 测试ConstitutiveLawsApplication变量")
    print("=" * 50)
    
    import KratosMultiphysics
    from KratosMultiphysics import ConstitutiveLawsApplication
    from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
    
    print("✅ ConstitutiveLawsApplication导入成功")
    
    # 测试关键变量
    variables_to_test = [
        'COHESION',
        'FRICTION_ANGLE', 
        'DILATANCY_ANGLE',
        'INTERNAL_FRICTION_ANGLE',
        'INTERNAL_DILATANCY_ANGLE',
        'YIELD_STRESS_TENSION',
        'YIELD_STRESS_COMPRESSION'
    ]
    
    print("\n🔍 测试塑性变量:")
    available_vars = []
    
    for var_name in variables_to_test:
        try:
            var = getattr(KratosMultiphysics, var_name)
            available_vars.append(var_name)
            print(f"   ✅ {var_name}: {var}")
        except AttributeError:
            try:
                var = getattr(ConstitutiveLawsApplication, var_name)
                available_vars.append(var_name)
                print(f"   ✅ {var_name}: {var} (from ConstitutiveLawsApplication)")
            except AttributeError:
                print(f"   ❌ {var_name}: 未找到")
    
    print(f"\n📊 总结:")
    print(f"   可用变量: {len(available_vars)}/{len(variables_to_test)}")
    print(f"   可用列表: {available_vars}")
    
    if 'COHESION' in available_vars:
        print(f"   🎯 COHESION变量可用！可以使用摩尔-库伦模型")
    else:
        print(f"   ❌ COHESION变量仍不可用")
        
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
