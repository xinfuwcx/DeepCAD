#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 导入Kratos和GeoMechanicsApplication...")
    import KratosMultiphysics
    from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
    from KratosMultiphysics import GeoMechanicsApplication
    
    print("📖 读取参数...")
    with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
        params_text = f.read()
    
    print("🏗️ 创建模型...")
    model = KratosMultiphysics.Model()
    parameters = KratosMultiphysics.Parameters(params_text)
    
    print("⚙️ 初始化分析...")
    analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
    analysis.Initialize()
    
    print("🔍 验证GeoMechanics材料参数...")
    main_model_part = model["Structure"]
    
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            
            print(f"\n📋 材料 {i}:")
            
            # 检查GeoMechanics参数
            if props.Has(GeoMechanicsApplication.GEO_FRICTION_ANGLE):
                friction = props[GeoMechanicsApplication.GEO_FRICTION_ANGLE]
                print(f"   摩擦角: {friction}°")
            
            if props.Has(GeoMechanicsApplication.GEO_DILATANCY_ANGLE):
                dilatancy = props[GeoMechanicsApplication.GEO_DILATANCY_ANGLE]
                print(f"   剪胀角: {dilatancy}°")
            
            if props.Has(GeoMechanicsApplication.GEO_COHESION):
                cohesion = props[GeoMechanicsApplication.GEO_COHESION]
                print(f"   粘聚力: {cohesion/1000:.1f} kPa")
            
            if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
                const_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
                print(f"   本构模型: {const_law.Info()}")
    
    print("\n✅ GeoMechanics配置验证成功!")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
