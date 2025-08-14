#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的两阶段分析结果查看器
"""

import json
import sys
from pathlib import Path

def load_analysis_results(results_dir="output/two_stage_analysis"):
    """加载分析结果"""
    results_path = Path(results_dir)
    
    if not results_path.exists():
        print(f"❌ 结果目录不存在: {results_path}")
        return None
    
    # 加载分析报告
    report_file = results_path / "analysis_report.json"
    if not report_file.exists():
        print(f"❌ 分析报告不存在: {report_file}")
        return None
    
    try:
        with open(report_file, 'r', encoding='utf-8') as f:
            report = json.load(f)
        return report
    except Exception as e:
        print(f"❌ 加载分析报告失败: {e}")
        return None

def print_analysis_summary(report):
    """打印分析摘要"""
    print("\n" + "="*80)
    print("🏗️ 两阶段基坑开挖分析结果报告")
    print("="*80)
    
    # 分析信息
    analysis_info = report.get('analysis_info', {})
    print(f"\n📋 分析配置:")
    print(f"   FPN文件: {analysis_info.get('fpn_file', 'N/A')}")
    print(f"   分析类型: {analysis_info.get('analysis_type', 'N/A')}")
    print(f"   单元类型: {analysis_info.get('element_type', 'N/A')}")
    print(f"   本构模型: {analysis_info.get('constitutive_model', 'N/A')}")
    print(f"   求解器: {analysis_info.get('solver', 'N/A')}")
    print(f"   分析时间: {analysis_info.get('timestamp', 'N/A')}")
    
    # 模型统计
    model_stats = report.get('model_statistics', {})
    print(f"\n🔢 模型统计:")
    print(f"   节点数: {model_stats.get('total_nodes', 'N/A'):,}")
    print(f"   单元数: {model_stats.get('total_elements', 'N/A'):,}")
    print(f"   材料数: {model_stats.get('total_materials', 'N/A')}")
    
    # 分析结果
    stage_results = report.get('stage_results', {})
    print(f"\n🎯 分析结果:")
    
    for stage_name, results in stage_results.items():
        stage_num = stage_name.replace('stage_', '')
        print(f"\n   阶段 {stage_num}:")
        
        if results.get('success'):
            print(f"     ✅ 状态: 成功")
            print(f"     📏 最大位移: {results.get('displacement_max', 0):.6f} m")
            print(f"     🔧 最大应力: {results.get('stress_max', 0):,.0f} Pa")
            print(f"     🏗️ 塑性单元: {results.get('plastic_elements', 0)} 个")
            print(f"     🧱 激活材料: {len(results.get('active_materials', []))} 种")
            
            # 详细材料信息
            active_materials = results.get('active_materials', [])
            if len(active_materials) <= 5:
                print(f"     📦 材料ID: {active_materials}")
            else:
                print(f"     📦 材料ID: {active_materials[:3]}...等{len(active_materials)}种")
        else:
            print(f"     ❌ 状态: 失败")
    
    print(f"\n📁 详细结果文件位置: {Path('output/two_stage_analysis').absolute()}")
    print("="*80)

def print_detailed_results(report):
    """打印详细结果"""
    print("\n" + "="*80)
    print("📊 详细分析结果")
    print("="*80)
    
    stage_results = report.get('stage_results', {})
    
    for stage_name, results in stage_results.items():
        stage_num = stage_name.replace('stage_', '')
        print(f"\n🔍 阶段 {stage_num} 详细信息:")
        print("-" * 40)
        
        if results.get('success'):
            # 位移分析
            disp_max = results.get('displacement_max', 0)
            print(f"位移分析:")
            print(f"  最大位移幅值: {disp_max:.6f} m = {disp_max*1000:.3f} mm")
            
            if disp_max > 0.01:
                print(f"  ⚠️ 位移较大，需要关注结构安全")
            elif disp_max > 0.005:
                print(f"  ⚡ 位移适中，在正常范围内")
            else:
                print(f"  ✅ 位移较小，结构稳定")
            
            # 应力分析
            stress_max = results.get('stress_max', 0)
            print(f"\n应力分析:")
            print(f"  最大应力: {stress_max:,.0f} Pa = {stress_max/1e6:.3f} MPa")
            
            if stress_max > 50e6:  # 50 MPa
                print(f"  ⚠️ 应力较高，需要检查材料强度")
            elif stress_max > 10e6:  # 10 MPa
                print(f"  ⚡ 应力适中，在合理范围内")
            else:
                print(f"  ✅ 应力较低，安全裕度充足")
            
            # 塑性分析
            plastic_elements = results.get('plastic_elements', 0)
            print(f"\n塑性分析:")
            print(f"  塑性单元数: {plastic_elements} 个")
            
            if plastic_elements > 0:
                print(f"  ⚠️ 存在塑性变形，需要关注")
            else:
                print(f"  ✅ 无塑性变形，材料在弹性范围内")
            
            # 材料激活状态
            active_materials = results.get('active_materials', [])
            print(f"\n材料状态:")
            print(f"  激活材料数: {len(active_materials)} 种")
            print(f"  材料ID列表: {active_materials}")
            
        else:
            print("❌ 该阶段分析失败")

def show_file_list(results_dir="output/two_stage_analysis"):
    """显示结果文件列表"""
    results_path = Path(results_dir)
    
    print(f"\n📂 结果文件列表 ({results_path.absolute()}):")
    print("-" * 60)
    
    if not results_path.exists():
        print("❌ 结果目录不存在")
        return
    
    files = list(results_path.glob("*"))
    if not files:
        print("📭 目录为空")
        return
    
    for file_path in sorted(files):
        if file_path.is_file():
            size = file_path.stat().st_size
            if size > 1024*1024:
                size_str = f"{size/(1024*1024):.1f} MB"
            elif size > 1024:
                size_str = f"{size/1024:.1f} KB"
            else:
                size_str = f"{size} B"
            
            print(f"📄 {file_path.name:<35} ({size_str})")
        else:
            print(f"📁 {file_path.name}/")

def main():
    """主函数"""
    print("🎨 两阶段基坑开挖分析结果查看器")
    print("基于E:\\DeepCAD\\example2\\data\\两阶段计算2.fpn的真实计算结果")
    
    # 加载分析结果
    report = load_analysis_results()
    if not report:
        return
    
    # 显示分析摘要
    print_analysis_summary(report)
    
    # 交互式菜单
    while True:
        print(f"\n{'='*50}")
        print("📋 操作菜单:")
        print("1. 显示详细结果")
        print("2. 显示文件列表")
        print("3. 重新加载结果")
        print("4. 退出")
        print("="*50)
        
        try:
            choice = input("请选择操作 (1-4): ").strip()
            
            if choice == '1':
                print_detailed_results(report)
            elif choice == '2':
                show_file_list()
            elif choice == '3':
                report = load_analysis_results()
                if report:
                    print("✅ 结果重新加载成功")
                    print_analysis_summary(report)
            elif choice == '4':
                print("👋 再见！")
                break
            else:
                print("❌ 无效选择，请输入1-4")
                
        except KeyboardInterrupt:
            print("\n👋 再见！")
            break
        except Exception as e:
            print(f"❌ 操作失败: {e}")

if __name__ == "__main__":
    main()
