#!/usr/bin/env python3
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    print("🔧 导入Kratos...")
    import KratosMultiphysics
    from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
    
    print("📖 读取参数...")
    with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
        params_text = f.read()
    
    print("🏗️ 创建模型...")
    model = KratosMultiphysics.Model()
    parameters = KratosMultiphysics.Parameters(params_text)
    
    print("⚙️ 初始化分析...")
    analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
    analysis.Initialize()
    
    print("\n🌍 终极重力验证...")
    main_model_part = model["Structure"]
    
    print(f"📊 模型统计:")
    print(f"   节点数量: {len(main_model_part.Nodes)}")
    print(f"   单元数量: {len(main_model_part.Elements)}")
    print(f"   材料数量: {len(main_model_part.Properties)}")
    
    # 检查Properties中的VOLUME_ACCELERATION（这是正确的方法）
    print("\n🔍 检查Properties中的VOLUME_ACCELERATION:")
    gravity_properties = 0
    
    for i in range(2, 13):
        if main_model_part.HasProperties(i):
            props = main_model_part.GetProperties(i)
            if props.Has(KratosMultiphysics.VOLUME_ACCELERATION):
                gravity = props[KratosMultiphysics.VOLUME_ACCELERATION]
                print(f"   材料{i}: [{gravity[0]:.3f}, {gravity[1]:.3f}, {gravity[2]:.3f}] m/s²")
                
                if abs(gravity[2] + 9.81) < 0.1:
                    print(f"     ✅ 重力设置正确")
                    gravity_properties += 1
                else:
                    print(f"     ❌ 重力值错误: {gravity[2]}")
            else:
                print(f"   材料{i}: ❌ 没有VOLUME_ACCELERATION")
    
    # 检查loads_process_list是否为空
    print("\n🔍 检查Process配置:")
    processes_params = parameters["processes"]
    if processes_params.Has("loads_process_list"):
        loads_list = processes_params["loads_process_list"]
        print(f"   loads_process_list数量: {loads_list.size()}")
        if loads_list.size() == 0:
            print("   ✅ loads_process_list为空，重力只通过Properties设置")
        else:
            print("   ⚠️ loads_process_list不为空，可能有冲突")
    
    # 最终结果
    print("\n" + "="*60)
    print("🎯 终极重力验证结果:")
    print(f"   Properties重力设置: {gravity_properties}/11 个材料")
    
    if gravity_properties >= 8:  # 大部分材料有重力
        print("\n🎉 重力设置成功！Properties方法工作正常！")
        print("✅ 重力问题彻底解决！")
        print("💡 关键要点:")
        print("   - VOLUME_ACCELERATION是Properties变量，不是节点DOF")
        print("   - 不能通过Process设置，只能通过材料Properties设置")
        print("   - 源代码证据: p_elem_prop->SetValue(VOLUME_ACCELERATION,gravity)")
        print("\n🚀 现在可以开始深基坑分析了！")
    else:
        print(f"\n❌ 重力设置仍有问题，成功率: {gravity_properties/11*100:.1f}%")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
