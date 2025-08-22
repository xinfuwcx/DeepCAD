#!/usr/bin/env python3
"""坐标归一化处理"""

import numpy as np
from pathlib import Path
import shutil

def normalize_mdpa_coordinates():
    """归一化MDPA文件中的坐标"""
    
    mdpa_file = Path('temp_kratos_analysis/model.mdpa')
    backup_file = Path('temp_kratos_analysis/model_original.mdpa')
    
    if not mdpa_file.exists():
        print("❌ MDPA文件不存在")
        return False
    
    # 备份原文件
    shutil.copy2(mdpa_file, backup_file)
    print(f"📋 备份原文件到: {backup_file}")
    
    # 读取文件
    with open(mdpa_file, 'r') as f:
        lines = f.readlines()
    
    print("🔍 分析坐标范围...")
    
    # 第一遍：找到坐标范围
    nodes_data = []
    reading_nodes = False
    
    for i, line in enumerate(lines):
        line_stripped = line.strip()
        
        if line_stripped.startswith('Begin Nodes'):
            reading_nodes = True
            continue
        elif line_stripped.startswith('End Nodes'):
            reading_nodes = False
            continue
            
        if reading_nodes and line_stripped:
            parts = line_stripped.split()
            if len(parts) >= 4:
                try:
                    node_id = int(parts[0])
                    x, y, z = float(parts[1]), float(parts[2]), float(parts[3])
                    nodes_data.append({
                        'line_idx': i,
                        'id': node_id,
                        'coords': np.array([x, y, z])
                    })
                except ValueError:
                    continue
    
    if not nodes_data:
        print("❌ 未找到节点数据")
        return False
    
    # 计算坐标范围和中心
    coords = np.array([node['coords'] for node in nodes_data])
    min_coords = coords.min(axis=0)
    max_coords = coords.max(axis=0)
    center = (min_coords + max_coords) / 2
    
    print(f"📐 原始坐标范围:")
    print(f"   X: [{min_coords[0]:.2f}, {max_coords[0]:.2f}] 中心: {center[0]:.2f}")
    print(f"   Y: [{min_coords[1]:.2f}, {max_coords[1]:.2f}] 中心: {center[1]:.2f}")
    print(f"   Z: [{min_coords[2]:.2f}, {max_coords[2]:.2f}] 中心: {center[2]:.2f}")
    
    # 计算偏移量（移动到原点附近）
    offset = center
    print(f"🎯 应用偏移量: ({offset[0]:.2f}, {offset[1]:.2f}, {offset[2]:.2f})")
    
    # 第二遍：应用坐标变换
    new_lines = lines.copy()
    
    for node in nodes_data:
        line_idx = node['line_idx']
        old_coords = node['coords']
        new_coords = old_coords - offset
        
        # 重构行
        parts = lines[line_idx].strip().split()
        new_line = f"{parts[0]} {new_coords[0]:.6f} {new_coords[1]:.6f} {new_coords[2]:.6f}"
        if len(parts) > 4:  # 保留其他字段
            new_line += " " + " ".join(parts[4:])
        new_line += "\n"
        
        new_lines[line_idx] = new_line
    
    # 写入新文件
    with open(mdpa_file, 'w') as f:
        f.writelines(new_lines)
    
    # 验证结果
    print("✅ 坐标归一化完成")
    
    # 重新计算范围验证
    new_coords = coords - offset
    new_min = new_coords.min(axis=0)
    new_max = new_coords.max(axis=0)
    new_center = (new_min + new_max) / 2
    
    print(f"📐 归一化后坐标范围:")
    print(f"   X: [{new_min[0]:.2f}, {new_max[0]:.2f}] 中心: {new_center[0]:.2f}")
    print(f"   Y: [{new_min[1]:.2f}, {new_max[1]:.2f}] 中心: {new_center[1]:.2f}")
    print(f"   Z: [{new_min[2]:.2f}, {new_max[2]:.2f}] 中心: {new_center[2]:.2f}")
    
    max_abs_coord = np.abs(new_coords).max()
    print(f"   最大坐标绝对值: {max_abs_coord:.2f}")
    
    return True

def test_normalized_kratos():
    """测试归一化后的Kratos分析"""
    
    print("\n🚀 测试归一化后的Kratos分析...")
    
    try:
        import os
        os.chdir('temp_kratos_analysis')
        
        import KratosMultiphysics
        from KratosMultiphysics.StructuralMechanicsApplication.structural_mechanics_analysis import StructuralMechanicsAnalysis
        
        with open('ProjectParameters.json', 'r') as f:
            parameters = KratosMultiphysics.Parameters(f.read())
        
        print("⚡ 启动分析...")
        analysis = StructuralMechanicsAnalysis(KratosMultiphysics.Model(), parameters)
        analysis.Run()
        
        print("✅ 归一化后分析成功完成!")
        return True
        
    except Exception as e:
        print(f"❌ 归一化后分析失败: {e}")
        return False
    finally:
        os.chdir('..')

if __name__ == "__main__":
    print("🔧 开始坐标归一化...")
    
    if normalize_mdpa_coordinates():
        success = test_normalized_kratos()
        print(f"\n🎯 归一化测试结果: {'成功' if success else '失败'}")
    else:
        print("\n❌ 坐标归一化失败")
