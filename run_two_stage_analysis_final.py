#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
运行完整的两阶段深基坑开挖分析
使用修正摩尔-库伦模型
"""

import os
import sys
import time
from pathlib import Path

def run_stage_analysis(stage_dir, stage_name):
    """运行单个阶段的分析"""
    print(f"\n🔧 === {stage_name}分析开始 ===")
    print(f"📍 分析目录: {stage_dir}")
    
    # 切换到分析目录
    original_dir = os.getcwd()
    os.chdir(stage_dir)
    
    try:
        print(f"🚀 启动{stage_name}Kratos分析...")
        start_time = time.time()
        
        # 导入Kratos
        import KratosMultiphysics
        from KratosMultiphysics import ConstitutiveLawsApplication
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
        
        print(f"📖 读取{stage_name}参数文件...")
        with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
            parameters_text = f.read()
        
        print(f"🏗️ 创建{stage_name}模型...")
        model = KratosMultiphysics.Model()
        parameters = KratosMultiphysics.Parameters(parameters_text)
        
        print(f"⚙️ 初始化{stage_name}分析...")
        analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
        analysis.Initialize()
        
        # 检查本构模型
        main_model_part = model["Structure"]
        if main_model_part.HasProperties(2):
            props = main_model_part.GetProperties(2)
            if props.Has(KratosMultiphysics.CONSTITUTIVE_LAW):
                const_law = props[KratosMultiphysics.CONSTITUTIVE_LAW]
                print(f"✅ 材料2本构模型: {const_law.Info()}")

                # 检查弹性参数
                if props.Has(KratosMultiphysics.YOUNG_MODULUS):
                    E = props[KratosMultiphysics.YOUNG_MODULUS]
                    print(f"   弹性模量: {E/1e6:.1f} MPa")
                if props.Has(KratosMultiphysics.POISSON_RATIO):
                    nu = props[KratosMultiphysics.POISSON_RATIO]
                    print(f"   泊松比: {nu:.2f}")
                if props.Has(KratosMultiphysics.DENSITY):
                    rho = props[KratosMultiphysics.DENSITY]
                    print(f"   密度: {rho:.1f} kg/m³")
        
        print(f"🔄 运行{stage_name}求解...")
        analysis.RunSolutionLoop()
        
        print(f"📊 完成{stage_name}后处理...")
        analysis.Finalize()
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"✅ {stage_name}分析成功完成！")
        print(f"⏱️ 计算时间: {duration:.2f}秒")
        
        # 检查输出文件
        vtk_files = list(Path("VTK_Output").glob("*.vtk")) if Path("VTK_Output").exists() else []
        if vtk_files:
            print(f"📁 生成VTK文件: {len(vtk_files)}个")
            for vtk_file in vtk_files[:3]:  # 显示前3个
                print(f"   - {vtk_file.name}")
        
        return True
        
    except Exception as e:
        print(f"❌ {stage_name}分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        os.chdir(original_dir)

def main():
    """主函数"""
    print("🚧 深基坑两阶段开挖分析")
    print("=" * 60)
    print("🎯 本构模型: 修正摩尔-库伦塑性")
    print("⚡ 求解器: Kratos多物理场")
    
    # 设置路径
    base_dir = Path("E:/DeepCAD/multi_stage_kratos_conversion")
    stage1_dir = base_dir / "stage_1"
    stage2_dir = base_dir / "stage_2"
    
    # 检查目录存在
    if not stage1_dir.exists() or not stage2_dir.exists():
        print("❌ 分析目录不存在！")
        return False
    
    print(f"\n📂 分析配置:")
    print(f"   阶段1: {stage1_dir}")
    print(f"   阶段2: {stage2_dir}")
    
    # 运行阶段1
    success_stage1 = run_stage_analysis(stage1_dir, "阶段1")
    
    if not success_stage1:
        print("❌ 阶段1分析失败，停止后续分析")
        return False
    
    # 运行阶段2
    success_stage2 = run_stage_analysis(stage2_dir, "阶段2")
    
    if not success_stage2:
        print("❌ 阶段2分析失败")
        return False
    
    # 分析完成总结
    print(f"\n🎉 === 两阶段分析全部完成 ===")
    print(f"✅ 阶段1: 成功完成")
    print(f"✅ 阶段2: 成功完成")
    print(f"\n📈 结果文件位置:")
    print(f"   阶段1 VTK: {stage1_dir}/VTK_Output/")
    print(f"   阶段2 VTK: {stage2_dir}/VTK_Output/")
    print(f"\n🔍 分析建议:")
    print(f"   1. 使用ParaView打开VTK文件查看结果")
    print(f"   2. 重点关注位移场和应力分布")
    print(f"   3. 对比两阶段的变形差异")
    print(f"   4. 检查塑性区域的发展")
    
    return True

if __name__ == "__main__":
    success = main()
    
    if success:
        print(f"\n🎉 深基坑两阶段开挖分析全部完成！")
        print(f"📊 可以开始结果分析和工程评估")
    else:
        print(f"\n❌ 分析过程中出现问题")
    
    print(f"\n" + "="*60)
