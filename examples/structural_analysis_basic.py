#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
基本结构力学分析示例
使用现有Kratos安装
"""

import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication

def create_simple_beam_model():
    """创建简单梁模型"""
    print("创建结构力学模型...")
    
    # 创建模型
    model = KratosMultiphysics.Model()
    model_part = model.CreateModelPart("BeamModelPart")
    model_part.ProcessInfo.SetValue(KratosMultiphysics.DOMAIN_SIZE, 2)
    
    # 添加变量
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.REACTION)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.VOLUME_ACCELERATION)
    
    # 创建材料属性
    properties = model_part.GetProperties()[1]
    properties.SetValue(KratosMultiphysics.YOUNG_MODULUS, 200000000000.0)  # 200 GPa (钢)
    properties.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
    properties.SetValue(KratosMultiphysics.DENSITY, 7850.0)  # kg/m³
    
    # 创建节点 (简单梁，10m长)
    for i in range(11):
        x = i * 1.0  # 每1m一个节点
        model_part.CreateNewNode(i+1, x, 0.0, 0.0)
    
    print(f"创建了 {model_part.NumberOfNodes()} 个节点")
    
    # 设置边界条件 (左端固定)
    left_node = model_part.GetNode(1)
    left_node.Fix(KratosMultiphysics.DISPLACEMENT_X)
    left_node.Fix(KratosMultiphysics.DISPLACEMENT_Y)
    left_node.Fix(KratosMultiphysics.DISPLACEMENT_Z)
    
    # 施加载荷 (中点向下10kN)
    middle_node = model_part.GetNode(6)
    middle_node.SetSolutionStepValue(KratosMultiphysics.VOLUME_ACCELERATION_Y, -10000.0)
    
    print("边界条件和载荷已设置")
    print("模型创建完成!")
    
    return model_part

def main():
    print("=" * 50)
    print("Kratos结构力学分析示例")
    print("=" * 50)
    
    try:
        model_part = create_simple_beam_model()
        print(f"\n模型信息:")
        print(f"- 节点数: {model_part.NumberOfNodes()}")
        print(f"- 单元数: {model_part.NumberOfElements()}")
        print(f"- 材料属性: E={model_part.GetProperties()[1].GetValue(KratosMultiphysics.YOUNG_MODULUS)/1e9:.0f} GPa")
        
        print("\n基本模型创建成功!")
        print("这展示了Kratos的基本建模能力。")
        
    except Exception as e:
        print(f"错误: {e}")

if __name__ == "__main__":
    main()
