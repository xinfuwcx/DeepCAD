#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
基坑渗流-结构耦合分析示例
使用现有的FSI和ConvectionDiffusion应用
"""

import KratosMultiphysics
try:
    import KratosMultiphysics.FSIApplication
    import KratosMultiphysics.ConvectionDiffusionApplication
    FSI_AVAILABLE = True
except ImportError:
    FSI_AVAILABLE = False

def create_seepage_structure_model():
    """创建渗流-结构耦合模型"""
    if not FSI_AVAILABLE:
        print("[WARNING] FSI应用不可用，显示概念模型")
        show_conceptual_model()
        return None
    
    print("=" * 60)
    print("基坑渗流-结构耦合分析")
    print("=" * 60)
    
    model = KratosMultiphysics.Model()
    
    # 结构部分
    structure_part = model.CreateModelPart("StructurePart")
    structure_part.ProcessInfo.SetValue(KratosMultiphysics.DOMAIN_SIZE, 2)
    
    # 流体部分
    fluid_part = model.CreateModelPart("FluidPart")
    fluid_part.ProcessInfo.SetValue(KratosMultiphysics.DOMAIN_SIZE, 2)
    
    # 添加变量
    structure_part.AddNodalSolutionStepVariable(KratosMultiphysics.DISPLACEMENT)
    structure_part.AddNodalSolutionStepVariable(KratosMultiphysics.WATER_PRESSURE)
    
    fluid_part.AddNodalSolutionStepVariable(KratosMultiphysics.PRESSURE)
    fluid_part.AddNodalSolutionStepVariable(KratosMultiphysics.VELOCITY)
    
    print("渗流-结构耦合模型创建完成!")
    return model

def show_conceptual_model():
    """显示概念模型说明"""
    print("=" * 60)
    print("基坑渗流-结构耦合分析概念")
    print("=" * 60)
    
    print("\n1. 物理过程:")
    print("   - 地下水渗流改变孔隙水压力")
    print("   - 孔隙水压力影响土体有效应力")
    print("   - 有效应力变化导致土体变形")
    print("   - 土体变形改变渗流边界条件")
    
    print("\n2. 数学模型:")
    print("   - 渗流方程: ∇·(k∇h) = Ss·∂h/∂t")
    print("   - 变形方程: ∇·σ' + γ'·∇h = 0")
    print("   - 耦合项: σ' = σ - χ·p·I")
    
    print("\n3. 边界条件:")
    print("   - 围护墙: 不透水边界")
    print("   - 地面: 大气压力边界")
    print("   - 远场: 固定水头边界")
    print("   - 基坑底: 排水边界")
    
    print("\n4. 分析步骤:")
    stages = [
        "初始稳态渗流分析",
        "第一层开挖 + 降水",
        "第二层开挖 + 降水", 
        "第三层开挖 + 降水",
        "最终开挖 + 降水"
    ]
    
    for i, stage in enumerate(stages, 1):
        print(f"   阶段{i}: {stage}")
    
    print("\n5. 关键参数:")
    print("   - 渗透系数: k = 1e-5 m/s (砂土)")
    print("   - 储水系数: Ss = 1e-4 /m")
    print("   - 比奥系数: χ = 0.8")
    print("   - 初始水位: -2.0 m")

def main():
    if FSI_AVAILABLE:
        model = create_seepage_structure_model()
        print("\n[OK] 可以进行完整的流固耦合分析!")
    else:
        show_conceptual_model()
        print("\n[INFO] 要进行实际分析，需要:")
        print("- FSIApplication (流固耦合)")
        print("- ConvectionDiffusionApplication (渗流)")
        print("- GeomechanicsApplication (土体力学)")

if __name__ == "__main__":
    main()
