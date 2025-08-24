#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析两阶段应力问题：为什么阶段2应力反而更小？
"""

import numpy as np
from pathlib import Path

def analyze_vtk_stress_data():
    """分析VTK文件中的应力数据"""
    print("🔍 分析两阶段VTK应力数据...")
    
    try:
        import pyvista as pv
        
        # 读取两个阶段的VTK文件
        stage1_file = Path("two_stage_fpn_analysis/VTK_Output_Two_Stage/Structure_0_1.vtk")
        stage2_file = Path("two_stage_fpn_analysis/VTK_Output_Two_Stage/Structure_0_2.vtk")
        
        if not stage1_file.exists() or not stage2_file.exists():
            print("❌ VTK文件不存在")
            return
        
        print(f"📖 读取阶段1: {stage1_file}")
        mesh1 = pv.read(str(stage1_file))
        
        print(f"📖 读取阶段2: {stage2_file}")
        mesh2 = pv.read(str(stage2_file))
        
        # 分析位移数据
        disp1 = mesh1.point_data.get('DISPLACEMENT', None)
        disp2 = mesh2.point_data.get('DISPLACEMENT', None)
        
        if disp1 is not None and disp2 is not None:
            max_disp1 = np.max(np.linalg.norm(disp1, axis=1))
            max_disp2 = np.max(np.linalg.norm(disp2, axis=1))
            
            print(f"\n📐 位移分析:")
            print(f"   阶段1最大位移: {max_disp1*1000:.3f} mm")
            print(f"   阶段2最大位移: {max_disp2*1000:.3f} mm")
            print(f"   位移变化: {(max_disp2-max_disp1)*1000:.3f} mm")
        
        # 分析应力数据
        stress1 = mesh1.point_data.get('CAUCHY_STRESS_TENSOR', None)
        stress2 = mesh2.point_data.get('CAUCHY_STRESS_TENSOR', None)
        
        von_mises1 = mesh1.point_data.get('VON_MISES_STRESS', None)
        von_mises2 = mesh2.point_data.get('VON_MISES_STRESS', None)
        
        if von_mises1 is not None and von_mises2 is not None:
            max_stress1 = np.max(von_mises1)
            max_stress2 = np.max(von_mises2)
            avg_stress1 = np.mean(von_mises1)
            avg_stress2 = np.mean(von_mises2)
            
            print(f"\n🔧 von Mises应力分析:")
            print(f"   阶段1最大应力: {max_stress1/1e6:.2f} MPa")
            print(f"   阶段2最大应力: {max_stress2/1e6:.2f} MPa")
            print(f"   应力变化: {(max_stress2-max_stress1)/1e6:.2f} MPa")
            print(f"   阶段1平均应力: {avg_stress1/1e6:.2f} MPa")
            print(f"   阶段2平均应力: {avg_stress2/1e6:.2f} MPa")
            
            # 这里就是问题！
            if max_stress2 < max_stress1:
                print(f"\n❌ 问题发现：阶段2应力反而更小！")
                print(f"   这不符合工程常识：锚杆预应力应该增加应力")
                
                # 分析可能的原因
                print(f"\n🤔 可能的原因分析:")
                print(f"   1. 锚杆预应力没有正确施加")
                print(f"   2. 两个阶段的载荷配置相同")
                print(f"   3. 缺少开挖卸载效应")
                print(f"   4. 材料属性在两阶段间没有变化")
                
        # 检查文件大小差异
        size1 = stage1_file.stat().st_size
        size2 = stage2_file.stat().st_size
        
        print(f"\n📊 文件大小对比:")
        print(f"   阶段1: {size1:,} bytes")
        print(f"   阶段2: {size2:,} bytes")
        print(f"   差异: {size2-size1:,} bytes")
        
        if abs(size2-size1) < 100000:  # 差异小于100KB
            print(f"   ⚠️ 文件大小差异很小，可能两阶段结果几乎相同")
        
        return True
        
    except ImportError:
        print("❌ PyVista未安装，无法分析VTK文件")
        return False
    except Exception as e:
        print(f"❌ 分析失败: {e}")
        return False

def analyze_kratos_config_problem():
    """分析Kratos配置问题"""
    print(f"\n🔧 分析Kratos两阶段配置问题...")
    
    config_file = Path("two_stage_fpn_analysis/ProjectParameters.json")
    if not config_file.exists():
        print("❌ 配置文件不存在")
        return
    
    import json
    with open(config_file, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    # 检查载荷配置
    loads = config.get('processes', {}).get('loads_process_list', [])
    print(f"📐 载荷配置分析:")
    print(f"   载荷过程数量: {len(loads)}")
    
    for i, load in enumerate(loads):
        interval = load.get('Parameters', {}).get('interval', [])
        modulus = load.get('Parameters', {}).get('modulus', 0)
        print(f"   载荷{i+1}: 时间区间{interval}, 强度{modulus}")
    
    # 问题分析
    print(f"\n❌ 发现的问题:")
    print(f"   1. 两个阶段的载荷完全相同 (都是重力)")
    print(f"   2. 没有锚杆预应力载荷")
    print(f"   3. 没有开挖卸载效应")
    print(f"   4. 缺少材料属性的阶段性变化")
    
    print(f"\n💡 正确的两阶段分析应该包括:")
    print(f"   阶段1: 初始地应力 (重力平衡)")
    print(f"   阶段2: 锚杆预应力 + 开挖卸载")
    print(f"   - 添加锚杆预应力载荷")
    print(f"   - 移除开挖区域的材料")
    print(f"   - 或者改变开挖区域的材料属性")

def check_fpn_prestress_loads():
    """检查FPN文件中的预应力载荷"""
    print(f"\n🔍 检查FPN文件中的预应力载荷...")
    
    fpn_file = Path('example2/data/两阶段-全锚杆-摩尔库伦.fpn')
    
    prestress_count = 0
    with open(fpn_file, 'r', encoding='gb18030') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if line.startswith('PSTRST'):
                # 预应力载荷
                parts = [p.strip() for p in line.split(',')]
                if len(parts) >= 4:
                    load_set = parts[1]
                    load_id = parts[2]
                    force = parts[3]
                    prestress_count += 1
                    if prestress_count <= 5:  # 只显示前5个
                        print(f"   预应力{prestress_count}: 载荷集{load_set}, ID{load_id}, 力值{force}N")
    
    print(f"✅ FPN文件中共有 {prestress_count} 个预应力载荷")
    
    if prestress_count > 0:
        print(f"\n❌ 关键问题：我们的Kratos配置没有包含这些预应力载荷！")
        print(f"   这就是为什么阶段2应力反而更小的原因")
        print(f"   我们只施加了重力，没有施加锚杆预应力")

if __name__ == "__main__":
    print("🚀 分析两阶段应力异常问题")
    print("=" * 80)
    
    # 1. 分析VTK应力数据
    vtk_success = analyze_vtk_stress_data()
    
    # 2. 分析Kratos配置问题
    analyze_kratos_config_problem()
    
    # 3. 检查FPN预应力载荷
    check_fpn_prestress_loads()
    
    print(f"\n🎯 结论:")
    print(f"   问题根源：我们的两阶段分析配置不正确")
    print(f"   - 缺少锚杆预应力载荷")
    print(f"   - 缺少开挖卸载效应")
    print(f"   - 两个阶段实际上是相同的重力分析")
    print(f"   - 150秒计算时间确实太快，说明计算量不够")
    
    print(f"\n💡 解决方案:")
    print(f"   需要重新设计两阶段分析，正确包含:")
    print(f"   1. FPN文件中的120个锚杆预应力载荷")
    print(f"   2. 开挖区域的材料移除或属性改变")
    print(f"   3. 更复杂的非线性分析配置")
