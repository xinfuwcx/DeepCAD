#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调试本构模型加载问题
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 导入Kratos...")
    import KratosMultiphysics
    
    # 检查ConstitutiveLawsApplication是否可用
    try:
        from KratosMultiphysics import ConstitutiveLawsApplication
        print("✅ ConstitutiveLawsApplication导入成功")
        
        # 检查具体的本构模型是否可用
        try:
            # 尝试创建本构模型
            const_law = ConstitutiveLawsApplication.SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D()
            print("✅ SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D创建成功")
            print(f"   模型信息: {const_law.Info()}")
        except Exception as e:
            print(f"❌ 无法创建SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D: {e}")
            
            # 列出可用的本构模型
            print("\n🔍 尝试列出ConstitutiveLawsApplication中的可用模型:")
            import inspect
            for name, obj in inspect.getmembers(ConstitutiveLawsApplication):
                if inspect.isclass(obj) and 'ConstitutiveLaw' in str(obj):
                    print(f"   - {name}")
        
    except Exception as e:
        print(f"❌ ConstitutiveLawsApplication导入失败: {e}")
    
    # 检查StructuralMechanicsApplication
    try:
        from KratosMultiphysics import StructuralMechanicsApplication
        print("✅ StructuralMechanicsApplication导入成功")
    except Exception as e:
        print(f"❌ StructuralMechanicsApplication导入失败: {e}")
    
    print("\n🔍 检查材料文件中的本构模型名称...")
    import json
    with open('StructuralMaterials.json', 'r', encoding='utf-8') as f:
        materials = json.load(f)
    
    for material in materials["properties"][:3]:  # 只检查前3个
        mat_id = material["properties_id"]
        const_law_name = material["Material"]["constitutive_law"]["name"]
        print(f"   材料{mat_id}: {const_law_name}")
    
    print("\n🔍 尝试通过工厂创建本构模型...")
    try:
        # 使用Kratos的工厂方法创建本构模型
        const_law_name = "SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D"
        const_law = KratosMultiphysics.ConstitutiveLawFactory().Create(const_law_name)
        print(f"✅ 通过工厂创建成功: {const_law.Info()}")
    except Exception as e:
        print(f"❌ 通过工厂创建失败: {e}")
        
        # 尝试列出所有可用的本构模型
        print("\n🔍 列出所有注册的本构模型:")
        try:
            factory = KratosMultiphysics.ConstitutiveLawFactory()
            # 这个方法可能不存在，但我们试试
            print("   工厂创建成功，但无法列出可用模型")
        except Exception as e2:
            print(f"   无法访问工厂: {e2}")

except Exception as e:
    print(f"❌ 调试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
