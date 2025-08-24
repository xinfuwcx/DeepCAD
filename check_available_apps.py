#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查Kratos中可用的应用程序和本构模型
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 导入Kratos...")
    import KratosMultiphysics
    
    print("📋 检查可用的应用程序:")
    
    # 检查StructuralMechanicsApplication
    try:
        from KratosMultiphysics import StructuralMechanicsApplication
        print("✅ StructuralMechanicsApplication - 可用")
    except ImportError as e:
        print(f"❌ StructuralMechanicsApplication - 不可用: {e}")
    
    # 检查ConstitutiveLawsApplication
    try:
        from KratosMultiphysics import ConstitutiveLawsApplication
        print("✅ ConstitutiveLawsApplication - 可用")
    except ImportError as e:
        print(f"❌ ConstitutiveLawsApplication - 不可用: {e}")
    
    # 检查GeoMechanicsApplication
    try:
        from KratosMultiphysics import GeoMechanicsApplication
        print("✅ GeoMechanicsApplication - 可用")
    except ImportError as e:
        print(f"❌ GeoMechanicsApplication - 不可用: {e}")
    
    # 检查其他可能的应用
    other_apps = [
        "FluidDynamicsApplication",
        "DEMApplication", 
        "ContactStructuralMechanicsApplication",
        "MeshingApplication"
    ]
    
    print("\n📋 检查其他应用程序:")
    for app_name in other_apps:
        try:
            app = getattr(KratosMultiphysics, app_name)
            print(f"✅ {app_name} - 可用")
        except AttributeError:
            print(f"❌ {app_name} - 不可用")
    
    # 列出ConstitutiveLawsApplication中的摩尔-库伦相关模型
    print("\n🔍 检查ConstitutiveLawsApplication中的摩尔-库伦模型:")
    try:
        from KratosMultiphysics import ConstitutiveLawsApplication
        import inspect
        
        mohr_coulomb_models = []
        for name, obj in inspect.getmembers(ConstitutiveLawsApplication):
            if inspect.isclass(obj) and ('MohrCoulomb' in name or 'Coulomb' in name):
                mohr_coulomb_models.append(name)
        
        if mohr_coulomb_models:
            print("找到的摩尔-库伦相关模型:")
            for model in mohr_coulomb_models:
                print(f"   - {model}")
        else:
            print("❌ 未找到摩尔-库伦相关模型")
            
        # 检查所有包含Damage的模型
        print("\n🔍 检查损伤相关模型:")
        damage_models = []
        for name, obj in inspect.getmembers(ConstitutiveLawsApplication):
            if inspect.isclass(obj) and 'Damage' in name:
                damage_models.append(name)
        
        if damage_models:
            print("找到的损伤相关模型:")
            for model in damage_models[:10]:  # 只显示前10个
                print(f"   - {model}")
            if len(damage_models) > 10:
                print(f"   ... 还有 {len(damage_models) - 10} 个模型")
        
    except Exception as e:
        print(f"❌ 检查本构模型失败: {e}")
    
    print("\n" + "=" * 60)
    print("✅ 应用程序检查完成!")

except Exception as e:
    print(f"❌ 检查失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
