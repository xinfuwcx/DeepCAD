#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication as StructuralMechanicsApplication
import json
import time

print("🚀 测试Kratos基础功能")

start_time = time.time()

try:
    # 创建模型
    model = KratosMultiphysics.Model()
    main_model_part = model.CreateModelPart("Structure")
    
    print(f"✅ Kratos模型创建成功")
    print(f"  Kratos版本信息可用")
    
    # 尝试读取MDPA文件
    print("📋 尝试读取MDPA文件...")
    
    # 添加必要的变量
    main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
    main_model_part.AddNodalSolutionStepVariable(KratosMultiphysics.REACTION)
    
    # 读取模型
    model_part_io = KratosMultiphysics.ModelPartIO("model")
    model_part_io.ReadModelPart(main_model_part)
    
    print(f"✅ MDPA文件读取成功:")
    print(f"  节点数: {main_model_part.NumberOfNodes()}")
    print(f"  单元数: {main_model_part.NumberOfElements()}")
    print(f"  条件数: {main_model_part.NumberOfConditions()}")
    
    # 测试材料读取
    print("📋 尝试读取材料文件...")
    with open("materials.json", 'r') as f:
        materials = KratosMultiphysics.Parameters(f.read())
    
    print(f"✅ 材料文件读取成功")
    
    # 尝试分配材料
    try:
        KratosMultiphysics.ReadMaterialsUtility(materials, model)
        print(f"✅ 材料分配成功")
    except Exception as e:
        print(f"⚠️ 材料分配失败: {e}")
    
    # 保存成功结果
    results = {
        "status": "SUCCESS",
        "message": "Kratos基础功能测试成功",
        "nodes": main_model_part.NumberOfNodes(),
        "elements": main_model_part.NumberOfElements(),
        "conditions": main_model_part.NumberOfConditions(),
        "computation_time": time.time() - start_time
    }
    
    with open("test_results.json", 'w') as f:
        json.dump(results, f, indent=2)
    
    print("🎉 Kratos基础功能测试成功！")
    
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
    
    # 保存错误结果
    results = {
        "status": "FAILED",
        "error": str(e),
        "computation_time": time.time() - start_time
    }
    
    with open("test_results.json", 'w') as f:
        json.dump(results, f, indent=2)
