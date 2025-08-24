#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试简单材料设置，验证摩擦角问题
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 导入Kratos...")
    import KratosMultiphysics
    from KratosMultiphysics import ConstitutiveLawsApplication
    
    print("🏗️ 创建简单测试...")
    
    # 创建模型和模型部分
    model = KratosMultiphysics.Model()
    model_part = model.CreateModelPart("TestPart")
    
    # 设置维度
    model_part.ProcessInfo[KratosMultiphysics.DOMAIN_SIZE] = 3
    
    # 创建Properties
    props = model_part.CreateNewProperties(1)
    
    print("📋 设置材料参数...")
    
    # 设置基本参数
    props[KratosMultiphysics.YOUNG_MODULUS] = 15000000.0
    props[KratosMultiphysics.POISSON_RATIO] = 0.3
    props[KratosMultiphysics.DENSITY] = 2039.43
    
    # 设置摩擦角 - 测试不同值
    friction_angles = [0.0, 1.0, 10.0, 35.0]
    
    for friction_angle in friction_angles:
        print(f"\n🧪 测试摩擦角: {friction_angle}°")
        
        # 设置摩擦角
        props[ConstitutiveLawsApplication.FRICTION_ANGLE] = friction_angle
        props[ConstitutiveLawsApplication.COHESION] = 20000.0
        props[ConstitutiveLawsApplication.DILATANCY_ANGLE] = 0.0
        
        # 设置重力
        gravity = KratosMultiphysics.Vector(3)
        gravity[0] = 0.0
        gravity[1] = 0.0
        gravity[2] = -9.81
        props[KratosMultiphysics.VOLUME_ACCELERATION] = gravity
        
        # 创建本构模型
        const_law = ConstitutiveLawsApplication.SmallStrainDplusDminusDamageModifiedMohrCoulombVonMises3D()
        props.SetValue(KratosMultiphysics.CONSTITUTIVE_LAW, const_law)
        
        print(f"   设置的摩擦角: {props[ConstitutiveLawsApplication.FRICTION_ANGLE]}°")
        print(f"   本构模型: {const_law.Info()}")
        
        # 检查本构模型是否正确读取参数
        try:
            # 创建一个简单的应变向量来测试
            strain_vector = KratosMultiphysics.Vector(6)
            strain_vector[0] = 0.001  # 小应变
            
            # 创建应力向量
            stress_vector = KratosMultiphysics.Vector(6)
            
            # 创建本构矩阵
            constitutive_matrix = KratosMultiphysics.Matrix(6, 6)
            
            # 创建材料参数
            material_properties = KratosMultiphysics.ConstitutiveLaw.Parameters()
            material_properties.SetMaterialProperties(props)
            material_properties.SetStrainVector(strain_vector)
            material_properties.SetStressVector(stress_vector)
            material_properties.SetConstitutiveMatrix(constitutive_matrix)
            
            # 初始化材料
            const_law.InitializeMaterial(props, model_part.GetGeometry(), KratosMultiphysics.Vector())
            
            print(f"   ✅ 本构模型初始化成功")
            
            # 检查摩擦角是否被修改
            final_friction = props[ConstitutiveLawsApplication.FRICTION_ANGLE]
            if abs(final_friction - friction_angle) > 1e-6:
                print(f"   ⚠️ 摩擦角被修改: {friction_angle}° → {final_friction}°")
            else:
                print(f"   ✅ 摩擦角保持不变: {final_friction}°")
                
        except Exception as e:
            print(f"   ❌ 本构模型测试失败: {e}")
    
    print("\n" + "=" * 60)
    print("✅ 简单材料测试完成!")

except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
