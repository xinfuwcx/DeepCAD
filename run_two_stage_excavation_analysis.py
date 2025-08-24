#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
运行完整的两阶段深基坑开挖分析
基于E:\DeepCAD\example2\data\两阶段-全锚杆-摩尔库伦.fpn
"""

import os
import sys
import time
import shutil
from pathlib import Path

def run_two_stage_analysis():
    """运行完整的两阶段深基坑开挖分析"""
    print("🚧 开始两阶段深基坑开挖分析")
    print("=" * 60)
    print("📁 原始FPN文件: E:\\DeepCAD\\example2\\data\\两阶段-全锚杆-摩尔库伦.fpn")
    print("🎯 分析目标: 深基坑多阶段开挖的位移和应力分析")
    
    # 设置路径
    base_dir = Path("E:/DeepCAD/multi_stage_kratos_conversion")
    stage1_dir = base_dir / "stage_1"
    stage2_dir = base_dir / "stage_2"
    
    # 检查目录存在
    if not stage1_dir.exists() or not stage2_dir.exists():
        print("❌ 分析目录不存在！")
        return False
    
    print(f"\n📂 分析目录:")
    print(f"   阶段1: {stage1_dir}")
    print(f"   阶段2: {stage2_dir}")
    
    # 运行阶段1分析
    print(f"\n🔧 === 阶段1分析开始 ===")
    print(f"📋 阶段1: 初始开挖和支护安装")
    
    success_stage1 = run_single_stage_analysis(stage1_dir, "阶段1")
    
    if not success_stage1:
        print("❌ 阶段1分析失败！")
        return False
    
    # 运行阶段2分析
    print(f"\n🔧 === 阶段2分析开始 ===")
    print(f"📋 阶段2: 进一步开挖和最终状态")
    
    success_stage2 = run_single_stage_analysis(stage2_dir, "阶段2")
    
    if not success_stage2:
        print("❌ 阶段2分析失败！")
        return False
    
    # 分析完成总结
    print(f"\n🎉 === 两阶段分析完成 ===")
    print(f"✅ 阶段1: 成功完成")
    print(f"✅ 阶段2: 成功完成")
    
    # 检查输出文件
    check_output_files(stage1_dir, stage2_dir)
    
    return True

def run_single_stage_analysis(stage_dir, stage_name):
    """运行单个阶段的分析"""
    print(f"\n📍 当前目录: {stage_dir}")
    
    # 检查必要文件
    required_files = [
        "ProjectParameters.json",
        "StructuralMaterials.json", 
        f"{stage_dir.name}_analysis.mdpa"
    ]
    
    missing_files = []
    for file in required_files:
        if not (stage_dir / file).exists():
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ {stage_name}缺少必要文件: {missing_files}")
        return False
    
    print(f"✅ {stage_name}所有必要文件存在")
    
    # 切换到分析目录
    original_dir = os.getcwd()
    os.chdir(stage_dir)
    
    try:
        print(f"🚀 启动{stage_name}Kratos分析...")
        start_time = time.time()
        
        # 导入Kratos
        sys.path.append(str(stage_dir))
        import KratosMultiphysics
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
        
        print(f"🔄 运行{stage_name}求解...")
        analysis.RunSolutionLoop()
        
        print(f"📊 完成{stage_name}后处理...")
        analysis.Finalize()
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"✅ {stage_name}分析成功完成！")
        print(f"⏱️ 计算时间: {duration:.2f}秒")
        
        # 检查结果文件
        check_stage_results(stage_dir, stage_name)
        
        return True
        
    except Exception as e:
        print(f"❌ {stage_name}分析失败: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        os.chdir(original_dir)

def check_stage_results(stage_dir, stage_name):
    """检查单个阶段的结果文件"""
    print(f"\n📋 检查{stage_name}结果文件:")
    
    # 可能的输出文件
    output_patterns = [
        "*.post.res",
        "*.vtk", 
        "VTK_Output/*.vtk",
        "*.h5",
        "*.dat"
    ]
    
    found_files = []
    for pattern in output_patterns:
        files = list(stage_dir.glob(pattern))
        found_files.extend(files)
    
    if found_files:
        print(f"   ✅ 找到{len(found_files)}个输出文件:")
        for file in found_files[:5]:  # 只显示前5个
            print(f"      - {file.name}")
        if len(found_files) > 5:
            print(f"      ... 还有{len(found_files)-5}个文件")
    else:
        print(f"   ⚠️ 未找到标准输出文件")

def check_output_files(stage1_dir, stage2_dir):
    """检查两个阶段的输出文件"""
    print(f"\n📊 === 分析结果总结 ===")
    
    print(f"\n📁 阶段1结果:")
    check_stage_results(stage1_dir, "阶段1")
    
    print(f"\n📁 阶段2结果:")
    check_stage_results(stage2_dir, "阶段2")
    
    print(f"\n🎯 分析建议:")
    print(f"   1. 检查位移场分布，关注基坑变形")
    print(f"   2. 分析应力集中区域，评估支护效果") 
    print(f"   3. 对比两阶段结果，了解开挖影响")
    print(f"   4. 使用ParaView或GiD查看VTK结果文件")

if __name__ == "__main__":
    print("🚧 深基坑两阶段开挖分析程序")
    print("🎯 基于FPN文件: 两阶段-全锚杆-摩尔库伦.fpn")
    print("⚡ 使用Kratos多物理场求解器")
    
    success = run_two_stage_analysis()
    
    if success:
        print(f"\n🎉 两阶段深基坑开挖分析全部完成！")
        print(f"📈 可以开始结果分析和工程评估")
    else:
        print(f"\n❌ 分析过程中出现问题，请检查配置")
    
    print(f"\n" + "="*60)
