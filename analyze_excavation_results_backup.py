#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深基坑两阶段开挖分析结果快速分析
"""

import os
import json
import numpy as np
from pathlib import Path

def analyze_excavation_results():
    """分析深基坑开挖结果"""
    print("📊 深基坑两阶段开挖分析结果分析")
    print("=" * 60)
    
    # 读取结果配置
    config_file = "two_stage_analysis_results.json"
    if os.path.exists(config_file):
        with open(config_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
        print(f"✅ 读取分析配置: {config['project_name']}")
    else:
        print(f"❌ 未找到配置文件: {config_file}")
        return
    
    # 分析结果文件
    print(f"\n📁 结果文件分析:")
    
    for i, stage in enumerate(config['stages'], 1):
        print(f"\n🔧 {stage['name']}:")
        print(f"   描述: {stage['description']}")
        print(f"   节点数: {stage['nodes']:,}")
        print(f"   单元数: {stage['elements']:,}")
        print(f"   计算时间: {stage['computation_time']}")
        
        vtk_file = Path(stage['vtk_file'])
        if vtk_file.exists():
            size_mb = vtk_file.stat().st_size / (1024*1024)
            print(f"   文件大小: {size_mb:.1f} MB")
            print(f"   文件路径: {vtk_file}")
            print(f"   ✅ 结果文件存在")
        else:
            print(f"   ❌ 结果文件不存在: {vtk_file}")
    
    # 材料信息
    print(f"\n🧱 材料配置:")
    materials = config['materials']
    print(f"   材料总数: {materials['total_materials']}")
    print(f"   土体类型: {', '.join(materials['soil_types'])}")
    print(f"   本构模型: {materials['constitutive_law']}")
    
    # 分析总结
    print(f"\n📈 分析总结:")
    summary = config['analysis_summary']
    print(f"   总计算时间: {summary['total_time']}")
    print(f"   收敛状态: {summary['convergence']}")
    print(f"   分析状态: {summary['status']}")
    print(f"   建议: {summary['recommendation']}")
    
    # 工程评估
    print(f"\n🏗️ 工程评估建议:")
    print(f"   1. 位移分析:")
    print(f"      - 检查基坑周边地表沉降")
    print(f"      - 分析支护结构变形")
    print(f"      - 对比两阶段位移增量")
    
    print(f"   2. 应力分析:")
    print(f"      - 查看土体应力重分布")
    print(f"      - 检查支护结构受力")
    print(f"      - 识别应力集中区域")
    
    print(f"   3. 稳定性评估:")
    print(f"      - 分析塑性区发展")
    print(f"      - 评估边坡稳定性")
    print(f"      - 检查潜在滑移面")
    
    print(f"   4. 施工建议:")
    print(f"      - 基于变形控制开挖速度")
    print(f"      - 及时安装支护结构")
    print(f"      - 加强变形监测")
    
    # ParaView使用指南
    print(f"\n🎨 ParaView查看指南:")
    print(f"   1. 打开ParaView软件")
    print(f"   2. 加载VTK文件:")
    for i, stage in enumerate(config['stages'], 1):
        print(f"      - {stage['name']}: {stage['vtk_file']}")
    
    print(f"   3. 推荐查看变量:")
    print(f"      - DISPLACEMENT: 位移场")
    print(f"      - STRESS: 应力场")
    print(f"      - PLASTIC_STRAIN: 塑性应变")
    print(f"      - DAMAGE: 损伤变量")
    
    print(f"   4. 可视化技巧:")
    print(f"      - 使用Warp by Vector显示变形")
    print(f"      - 设置合适的变形放大系数")
    print(f"      - 使用切片查看内部应力")
    print(f"      - 对比两阶段结果差异")
    
    # 生成简化报告
    report_file = "excavation_analysis_report.txt"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("深基坑两阶段开挖分析报告\n")
        f.write("=" * 40 + "\n\n")
        f.write(f"项目名称: {config['project_name']}\n")
        f.write(f"分析类型: {config['analysis_type']}\n")
        f.write(f"本构模型: {config['constitutive_model']}\n\n")
        
        f.write("分析结果:\n")
        for stage in config['stages']:
            f.write(f"- {stage['name']}: {stage['elements']:,}个单元, 计算时间{stage['computation_time']}\n")
        
        f.write(f"\n总计算时间: {summary['total_time']}\n")
        f.write(f"分析状态: {summary['status']}\n")
        f.write(f"收敛状态: {summary['convergence']}\n")
        
        f.write("\n工程建议:\n")
        f.write("1. 使用ParaView查看详细的位移和应力分布\n")
        f.write("2. 重点关注基坑周边的地表沉降\n")
        f.write("3. 分析支护结构的受力和变形\n")
        f.write("4. 评估两阶段开挖的累积效应\n")
    
    print(f"\n📄 简化报告已生成: {report_file}")
    
    print(f"\n🎯 分析完成！")
    print(f"   - 主界面已启动，可查看3D结果")
    print(f"   - VTK文件可用ParaView打开")
    print(f"   - 建议进行详细的工程评估")

if __name__ == "__main__":
    analyze_excavation_results()
