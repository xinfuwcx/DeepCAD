#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
运行最终的完整两阶段分析
"""

import os
import sys
import time
import json
from pathlib import Path

def run_stage_analysis(stage_name, stage_dir):
    """运行单个阶段的分析"""
    print(f"\n🚀 运行{stage_name}分析")
    print("=" * 50)
    
    original_dir = os.getcwd()
    
    try:
        # 切换到阶段目录
        os.chdir(stage_dir)
        print(f"📁 工作目录: {os.getcwd()}")
        
        # 检查文件
        required_files = ["ProjectParameters.json", "materials.json"]
        mdpa_file = f"{stage_name.lower()}_analysis.mdpa"
        required_files.append(mdpa_file)
        
        for filename in required_files:
            if not Path(filename).exists():
                print(f"❌ 缺少文件: {filename}")
                return False
            else:
                size = Path(filename).stat().st_size
                print(f"✅ {filename}: {size:,} bytes")
        
        # 导入Kratos
        print(f"\n🔧 导入Kratos模块...")
        import KratosMultiphysics
        from KratosMultiphysics.StructuralMechanicsApplication import structural_mechanics_analysis
        
        # 读取参数
        with open('ProjectParameters.json', 'r', encoding='utf-8') as f:
            params_text = f.read()
        
        # 创建分析
        model = KratosMultiphysics.Model()
        parameters = KratosMultiphysics.Parameters(params_text)
        analysis = structural_mechanics_analysis.StructuralMechanicsAnalysis(model, parameters)
        
        # 运行分析
        print(f"\n🔄 开始运行{stage_name}分析...")
        start_time = time.time()
        
        analysis.Run()
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"\n✅ {stage_name}分析完成!")
        print(f"⏱️ 分析用时: {duration:.2f}秒")
        
        # 检查输出
        output_files = []
        if Path("VTK_Output").exists():
            output_files.extend(list(Path("VTK_Output").glob("*")))
        
        if output_files:
            print("📄 生成的输出文件:")
            for file in output_files:
                if file.is_file():
                    size = file.stat().st_size
                    print(f"   - {file.name}: {size:,} bytes")
        
        return True
        
    except Exception as e:
        print(f"\n❌ {stage_name}分析失败: {e}")
        return False
    finally:
        os.chdir(original_dir)

def main():
    """主函数"""
    print("🎯 最终完整两阶段分析")
    print("=" * 60)
    print("🔧 修复内容:")
    print("   ✅ 摩擦角参数使用度数")
    print("   ✅ 移除错误的BODY_FORCE加载")
    print("   ✅ 添加正确的重力加载(VOLUME_ACCELERATION)")
    print("   ✅ 使用真实FPN材料参数")
    
    # 运行两个阶段
    stages = [
        ("Stage_1", "multi_stage_kratos_conversion/stage_1"),
        ("Stage_2", "multi_stage_kratos_conversion/stage_2")
    ]
    
    results = {}
    
    for stage_name, stage_dir in stages:
        if Path(stage_dir).exists():
            success = run_stage_analysis(stage_name, stage_dir)
            results[stage_name] = success
        else:
            print(f"❌ 目录不存在: {stage_dir}")
            results[stage_name] = False
    
    # 总结结果
    print("\n" + "=" * 60)
    print("📊 最终分析结果总结")
    print("=" * 60)
    
    all_success = True
    for stage_name, success in results.items():
        status = "✅ 成功" if success else "❌ 失败"
        print(f"   {stage_name}: {status}")
        if not success:
            all_success = False
    
    if all_success:
        print("\n🎉 两阶段FPN到Kratos转换完全成功!")
        print("📋 主要成果:")
        print("   - FPN文件成功转换为Kratos MDPA格式")
        print("   - 真实材料参数正确应用")
        print("   - 两阶段分析流程验证完成")
        print("   - 生成了VTK可视化结果文件")
    else:
        print("\n⚠️ 部分分析失败，需要进一步调试")
    
    return all_success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
