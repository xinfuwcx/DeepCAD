#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
深基坑围护结构分析示例
使用现有Kratos StructuralMechanicsApplication
"""

import KratosMultiphysics
import KratosMultiphysics.StructuralMechanicsApplication

def create_retaining_wall_model():
    """创建深基坑围护结构模型"""
    print("=" * 60)
    print("深基坑围护结构分析")
    print("=" * 60)
    
    # 创建模型
    model = KratosMultiphysics.Model()
    model_part = model.CreateModelPart("RetainingWallModelPart")
    model_part.ProcessInfo.SetValue(KratosMultiphysics.DOMAIN_SIZE, 2)
    
    # 添加结构力学变量
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.REACTION)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.FORCE)
    model_part.AddNodalSolutionStepVariable(KratosMultiphysics.VOLUME_ACCELERATION)
    
    # 围护墙材料属性 (混凝土)
    wall_properties = model_part.GetProperties()[1]
    wall_properties.SetValue(KratosMultiphysics.YOUNG_MODULUS, 30000000000.0)  # 30 GPa
    wall_properties.SetValue(KratosMultiphysics.POISSON_RATIO, 0.2)
    wall_properties.SetValue(KratosMultiphysics.DENSITY, 2500.0)  # kg/m³
    wall_properties.SetValue(KratosMultiphysics.THICKNESS, 0.8)   # 0.8m厚
    
    # 支撑系统材料属性 (钢支撑)
    support_properties = model_part.GetProperties()[2]
    support_properties.SetValue(KratosMultiphysics.YOUNG_MODULUS, 200000000000.0)  # 200 GPa
    support_properties.SetValue(KratosMultiphysics.POISSON_RATIO, 0.3)
    support_properties.SetValue(KratosMultiphysics.DENSITY, 7850.0)  # kg/m³
    
    # 创建围护墙节点 (简化为20m深，每2m一个节点)
    wall_height = 20.0  # 20米深
    node_spacing = 2.0  # 2米间距
    num_nodes = int(wall_height / node_spacing) + 1
    
    # 左侧围护墙
    for i in range(num_nodes):
        y = -i * node_spacing  # 从地面向下
        model_part.CreateNewNode(i+1, 0.0, y, 0.0)
    
    # 右侧围护墙 (基坑宽度15m)
    excavation_width = 15.0
    for i in range(num_nodes):
        y = -i * node_spacing
        model_part.CreateNewNode(i+1+num_nodes, excavation_width, y, 0.0)
    
    # 支撑系统节点 (三道支撑)
    support_levels = [-3.0, -8.0, -13.0]  # 支撑位置
    support_node_id = 2 * num_nodes + 1
    
    for level in support_levels:
        # 支撑梁节点
        for x in [0.0, excavation_width/4, excavation_width/2, 3*excavation_width/4, excavation_width]:
            model_part.CreateNewNode(support_node_id, x, level, 0.0)
            support_node_id += 1
    
    print(f"创建了 {model_part.NumberOfNodes()} 个节点")
    
    # 边界条件设置
    # 围护墙底部固定
    bottom_left = model_part.GetNode(num_nodes)
    bottom_right = model_part.GetNode(2 * num_nodes)
    
    bottom_left.Fix(KratosMultiphysics.DISPLACEMENT_X)
    bottom_left.Fix(KratosMultiphysics.DISPLACEMENT_Y)
    bottom_right.Fix(KratosMultiphysics.DISPLACEMENT_X)
    bottom_right.Fix(KratosMultiphysics.DISPLACEMENT_Y)
    
    # 围护墙顶部约束 (只约束水平位移)
    top_left = model_part.GetNode(1)
    top_right = model_part.GetNode(num_nodes + 1)
    top_left.Fix(KratosMultiphysics.DISPLACEMENT_X)
    top_right.Fix(KratosMultiphysics.DISPLACEMENT_X)
    
    # 施加土压力载荷 (简化为线性分布)
    for i in range(1, num_nodes):
        depth = (i-1) * node_spacing
        lateral_pressure = 20000.0 * depth  # 20 kPa/m 土压力系数
        
        # 左侧围护墙受向右的土压力
        left_node = model_part.GetNode(i)
        left_node.SetSolutionStepValue(KratosMultiphysics.FORCE_X, lateral_pressure)
        
        # 右侧围护墙受向左的土压力  
        right_node = model_part.GetNode(i + num_nodes)
        right_node.SetSolutionStepValue(KratosMultiphysics.FORCE_X, -lateral_pressure)
    
    print("边界条件和载荷已设置")
    
    # 输出模型信息
    print(f"\n模型信息:")
    print(f"- 基坑深度: {wall_height} m")
    print(f"- 基坑宽度: {excavation_width} m") 
    print(f"- 围护墙厚度: {wall_properties.GetValue(KratosMultiphysics.THICKNESS)} m")
    print(f"- 围护墙弹性模量: {wall_properties.GetValue(KratosMultiphysics.YOUNG_MODULUS)/1e9:.0f} GPa")
    print(f"- 支撑层数: {len(support_levels)}")
    print(f"- 总节点数: {model_part.NumberOfNodes()}")
    
    return model_part

def analyze_excavation_stages():
    """模拟分阶段开挖过程"""
    print("\n" + "=" * 40)
    print("分阶段开挖分析")
    print("=" * 40)
    
    excavation_stages = [
        {"depth": 3.0, "description": "第一层开挖到-3m，安装第一道支撑"},
        {"depth": 8.0, "description": "第二层开挖到-8m，安装第二道支撑"}, 
        {"depth": 13.0, "description": "第三层开挖到-13m，安装第三道支撑"},
        {"depth": 20.0, "description": "最终开挖到-20m，基坑见底"}
    ]
    
    for i, stage in enumerate(excavation_stages, 1):
        print(f"\n阶段 {i}: {stage['description']}")
        print(f"开挖深度: {stage['depth']} m")
        
        # 这里可以添加具体的阶段分析逻辑
        # 实际应用中需要：
        # 1. 移除开挖区域内的土体单元
        # 2. 重新计算土压力分布
        # 3. 激活对应深度的支撑系统
        # 4. 求解该阶段的位移和内力
        
        print(f"该阶段围护墙最大位移: 预估 {stage['depth'] * 0.002:.1f} m")
        print(f"该阶段支撑轴力: 预估 {stage['depth'] * 50:.0f} kN")

def main():
    try:
        # 创建围护结构模型
        model_part = create_retaining_wall_model()
        
        # 分阶段开挖分析
        analyze_excavation_stages()
        
        print("\n" + "=" * 60)
        print("深基坑围护结构分析示例完成!")
        print("=" * 60)
        print("\n注意: 这是一个简化的演示示例")
        print("实际工程分析需要:")
        print("- 更精确的土体本构模型")
        print("- 土-结构相互作用")
        print("- 渗流耦合分析")
        print("- 非线性几何和材料")
        print("- 施工阶段模拟")
        
    except Exception as e:
        print(f"错误: {e}")

if __name__ == "__main__":
    main()
