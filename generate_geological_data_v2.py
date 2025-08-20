#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate Geological Data V2 - 生成地质数据V2
包含1处地层交叉 + 1处断层
"""

import pandas as pd
import numpy as np
import math
from pathlib import Path

def generate_undulating_terrain(x, y, base_depth, formation_index):
    """生成起伏地形"""
    # 使用正弦波创建地形起伏
    wave1 = 3 * np.sin(x * 2 * np.pi / 200) * np.cos(y * 2 * np.pi / 300)
    wave2 = 2 * np.cos(x * 2 * np.pi / 150) * np.sin(y * 2 * np.pi / 250)
    
    # 不同地层有不同的起伏模式
    terrain_variation = wave1 + wave2 + formation_index * 0.5
    
    return base_depth + terrain_variation

def check_fault_zone(x, y):
    """检查是否在断层影响区"""
    # 断层位置：中心在(600, 400)，走向45度，影响带宽度100m
    fault_center_x = 600
    fault_center_y = 400
    fault_strike = 45  # 度
    fault_width = 100
    
    # 计算点到断层线的距离
    strike_rad = math.radians(fault_strike)
    
    # 断层线方向向量
    dx = x - fault_center_x
    dy = y - fault_center_y
    
    # 点到断层线的垂直距离
    dist_to_fault = abs(dx * math.cos(strike_rad + math.pi/2) + dy * math.sin(strike_rad + math.pi/2))
    
    return dist_to_fault < fault_width / 2

def check_fold_zone(x, y):
    """检查是否在褶皱（地层交叉）区域"""
    # 褶皱区域：中心在(300, 700)，半径150m
    fold_center_x = 300
    fold_center_y = 700
    fold_radius = 150
    
    distance = math.sqrt((x - fold_center_x)**2 + (y - fold_center_y)**2)
    return distance < fold_radius

def generate_borehole_data():
    """生成钻孔数据"""
    print(">> 生成地质钻孔数据 V2")
    print("=" * 40)
    
    # 基础参数
    area_size = 1000  # 1000m x 1000m
    num_boreholes = 100
    
    # 12层地质序列（从上到下）
    formations = [
        {'name': '填土', 'base_thickness': 3, 'color': '#8B4513'},
        {'name': '粘土', 'base_thickness': 8, 'color': '#FF0000'},
        {'name': '粉质粘土', 'base_thickness': 12, 'color': '#FF8C00'},
        {'name': '细砂', 'base_thickness': 15, 'color': '#FFD700'},
        {'name': '中砂', 'base_thickness': 10, 'color': '#32CD32'},
        {'name': '粗砂', 'base_thickness': 8, 'color': '#00CED1'},
        {'name': '砾砂', 'base_thickness': 12, 'color': '#1E90FF'},
        {'name': '卵石层', 'base_thickness': 18, 'color': '#9932CC'},
        {'name': '强风化岩', 'base_thickness': 25, 'color': '#DC143C'},
        {'name': '中风化岩', 'base_thickness': 30, 'color': '#708090'},
        {'name': '微风化岩', 'base_thickness': 35, 'color': '#2F4F4F'},
        {'name': '基岩', 'base_thickness': 50, 'color': '#000000'}
    ]
    
    # 生成钻孔位置（不规则分布）
    np.random.seed(42)
    borehole_positions = []
    for i in range(num_boreholes):
        x = np.random.uniform(50, area_size - 50)
        y = np.random.uniform(50, area_size - 50)
        borehole_positions.append((f'ZK{i+1:03d}', x, y))
    
    all_data = []
    
    for borehole_id, x, y in borehole_positions:
        print(f"处理钻孔: {borehole_id} at ({x:.1f}, {y:.1f})")
        
        # 检查特殊地质条件
        in_fault_zone = check_fault_zone(x, y)
        in_fold_zone = check_fold_zone(x, y)
        
        # 生成该钻孔的地层序列
        current_depth = 0
        borehole_data = []
        
        for layer_index, layer in enumerate(formations):
            layer_name = layer['name']
            
            # 1. 断层影响：某些地层可能缺失
            if in_fault_zone:
                # 中砂、粗砂在断层区经常缺失
                if layer_name in ['中砂', '粗砂'] and np.random.random() > 0.3:
                    print(f"  断层区缺失: {layer_name}")
                    continue
            
            # 2. 褶皱影响：地层可能重复或交叉
            layer_repeat = 1
            if in_fold_zone:
                # 在褶皱区，某些地层可能重复出现
                if layer_name in ['粘土', '细砂', '砾砂'] and np.random.random() > 0.5:
                    layer_repeat = 2  # 地层重复
                    print(f"  褶皱区重复: {layer_name}")
            
            for repeat in range(layer_repeat):
                # 计算地层厚度（加入变化）
                thickness_variation = np.random.normal(0, layer['base_thickness'] * 0.3)
                actual_thickness = max(0.5, layer['base_thickness'] + thickness_variation)
                
                # 褶皱区地层可能变厚或变薄
                if in_fold_zone:
                    fold_factor = 0.7 + 0.6 * np.random.random()  # 0.7-1.3倍
                    actual_thickness *= fold_factor
                
                # 断层区地层可能变薄
                if in_fault_zone:
                    actual_thickness *= 0.8
                
                # 计算起伏地形
                base_top = current_depth
                terrain_top = generate_undulating_terrain(x, y, base_top, layer_index)
                terrain_bottom = terrain_top - actual_thickness
                
                # 断层位移
                fault_displacement = 0
                if in_fault_zone and layer_index >= 8:  # 深层岩石受断层影响
                    fault_displacement = np.random.uniform(5, 15)
                    terrain_top -= fault_displacement
                    terrain_bottom -= fault_displacement
                
                # 添加地形微起伏
                terrain_variation = np.random.normal(0, 1)
                z_top = terrain_top + terrain_variation
                z_bottom = terrain_bottom + terrain_variation
                
                # 记录数据
                borehole_data.append({
                    'borehole_id': borehole_id,
                    'x': x,
                    'y': y,
                    'z_top': z_top,
                    'z_bottom': z_bottom,
                    'formation_id': layer_index + 1,
                    'formation_name': layer_name,
                    'thickness': z_top - z_bottom,
                    'density': 1.6 + np.random.normal(0, 0.1),
                    'in_fault_zone': in_fault_zone,
                    'in_fold_zone': in_fold_zone,
                    'fault_displacement': fault_displacement,
                    'layer_repeat': repeat + 1,
                    'color': layer['color'],
                    'enhanced_color': layer['color']
                })
                
                current_depth += actual_thickness
                
                # 限制最大深度
                if current_depth > 250:
                    break
            
            # 限制最大深度
            if current_depth > 250:
                break
        
        all_data.extend(borehole_data)
    
    # 创建DataFrame
    df = pd.DataFrame(all_data)
    
    return df

def generate_geological_structures():
    """生成地质构造信息"""
    structures = {
        'fault': {
            'name': 'F1_主断层',
            'type': 'normal_fault',
            'center_x': 600,
            'center_y': 400,
            'strike': 45,
            'dip': 75,
            'length': 300,
            'width': 100,
            'displacement': 15,
            'description': '正断层，切断中砂、粗砂等地层'
        },
        'fold': {
            'name': 'A1_背斜',
            'type': 'anticline',
            'center_x': 300,
            'center_y': 700,
            'axis_strike': 30,
            'radius': 150,
            'amplitude': 20,
            'description': '背斜构造，造成地层重复和交叉'
        }
    }
    
    return structures

def main():
    """主函数"""
    print(">> 生成地质数据 V2")
    print("包含：1处断层 + 1处地层交叉（褶皱）")
    print("=" * 50)
    
    # 生成钻孔数据
    borehole_df = generate_borehole_data()
    
    # 生成地质构造数据
    structures = generate_geological_structures()
    
    # 创建输出目录
    output_dir = Path("example3/data")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 保存钻孔数据
    borehole_df.to_csv(output_dir / "geological_data_v2.csv", index=False, encoding='utf-8')
    
    # 保存构造数据
    import json
    with open(output_dir / "geological_structures_v2.json", 'w', encoding='utf-8') as f:
        json.dump(structures, f, ensure_ascii=False, indent=2)
    
    # 统计信息
    print(f"\n[OK] 生成钻孔数据: {len(borehole_df)} 条记录")
    print(f"[OK] 涉及钻孔: {borehole_df['borehole_id'].nunique()} 个")
    print(f"[OK] 地层类型: {borehole_df['formation_name'].nunique()} 种")
    
    # 断层统计
    fault_affected = borehole_df[borehole_df['in_fault_zone'] == True]
    print(f"\n>> 断层影响统计:")
    print(f"  - 受断层影响的记录: {len(fault_affected)} 条")
    print(f"  - 受影响的钻孔: {fault_affected['borehole_id'].nunique()} 个")
    
    # 褶皱统计
    fold_affected = borehole_df[borehole_df['in_fold_zone'] == True]
    print(f"\n>> 褶皱影响统计:")
    print(f"  - 受褶皱影响的记录: {len(fold_affected)} 条")
    print(f"  - 受影响的钻孔: {fold_affected['borehole_id'].nunique()} 个")
    print(f"  - 地层重复记录: {len(borehole_df[borehole_df['layer_repeat'] > 1])} 条")
    
    # 显示地层分布
    print(f"\n>> 地层分布:")
    layer_counts = borehole_df['formation_name'].value_counts()
    for layer, count in layer_counts.items():
        print(f"  - {layer}: {count} 条记录")
    
    print(f"\n[OK] 数据已保存到: {output_dir}")
    print("特点:")
    print("  - 1处断层：位于(600,400)，影响中砂、粗砂等")
    print("  - 1处褶皱：位于(300,700)，造成地层交叉重复")
    print("  - 起伏地形：非平面地层界面")
    print("  - 不规则钻孔分布")
    print("  - 12层完整地质序列")

if __name__ == "__main__":
    main()