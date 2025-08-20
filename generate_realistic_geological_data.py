#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate Realistic Geological Data - 生成真实的地质数据
包含断层、地层缺失、不规则地层界面
"""

import pandas as pd
import numpy as np
from pathlib import Path

def generate_realistic_borehole_data():
    """生成更真实的钻孔数据 - 包含断层效应"""
    
    # 基础参数
    area_size = 1000  # 1000m x 1000m
    num_boreholes = 100
    
    # 定义断层
    fault_zones = [
        {
            'name': 'F1',
            'center_x': 400,
            'center_y': 500, 
            'strike': 45,  # 走向角度
            'width': 100,  # 影响带宽度
            'displacement': 15  # 垂直位移
        },
        {
            'name': 'F2', 
            'center_x': 700,
            'center_y': 300,
            'strike': 120,
            'width': 80,
            'displacement': 8
        }
    ]
    
    # 标准地层序列
    standard_layers = [
        {'name': '填土', 'base_thickness': 3, 'base_depth': 0},
        {'name': '粘土', 'base_thickness': 8, 'base_depth': 3},
        {'name': '粉质粘土', 'base_thickness': 12, 'base_depth': 11},
        {'name': '细砂', 'base_thickness': 15, 'base_depth': 23},
        {'name': '中砂', 'base_thickness': 10, 'base_depth': 38},
        {'name': '粗砂', 'base_thickness': 8, 'base_depth': 48},
        {'name': '砾砂', 'base_thickness': 12, 'base_depth': 56},
        {'name': '卵石层', 'base_thickness': 18, 'base_depth': 68},
        {'name': '强风化岩', 'base_thickness': 25, 'base_depth': 86},
        {'name': '中风化岩', 'base_thickness': 30, 'base_depth': 111},
        {'name': '微风化岩', 'base_thickness': 35, 'base_depth': 141},
        {'name': '基岩', 'base_thickness': 50, 'base_depth': 176}
    ]
    
    # 生成钻孔位置
    np.random.seed(42)
    borehole_positions = []
    for i in range(num_boreholes):
        x = np.random.uniform(50, area_size - 50)
        y = np.random.uniform(50, area_size - 50)
        borehole_positions.append((f'ZK{i+1:03d}', x, y))
    
    all_data = []
    
    for borehole_id, x, y in borehole_positions:
        # 判断该钻孔是否在断层影响区
        in_fault_zone = False
        fault_displacement = 0
        affected_layers = []
        
        for fault in fault_zones:
            # 简化的断层影响判断
            dist_to_fault = abs((x - fault['center_x']) * np.cos(np.radians(fault['strike'])) + 
                              (y - fault['center_y']) * np.sin(np.radians(fault['strike'])))
            
            if dist_to_fault < fault['width'] / 2:
                in_fault_zone = True
                fault_displacement += fault['displacement']
                
                # 确定哪些地层受影响（比如中砂、粗砂、砾砂可能缺失）
                if fault['name'] == 'F1':
                    affected_layers.extend(['中砂', '粗砂'])
                elif fault['name'] == 'F2':
                    affected_layers.extend(['砾砂', '卵石层'])
        
        # 为该钻孔生成地层数据
        current_depth = 0
        borehole_data = []
        
        for layer in standard_layers:
            layer_name = layer['name']
            
            # 如果该层在断层影响区域且被列为受影响层，可能缺失
            if in_fault_zone and layer_name in affected_layers:
                if np.random.random() > 0.3:  # 70%概率缺失
                    continue
            
            # 计算实际厚度（加入随机变化）
            thickness_variation = np.random.normal(0, layer['base_thickness'] * 0.2)
            actual_thickness = max(0.5, layer['base_thickness'] + thickness_variation)
            
            # 计算深度（断层位移影响）
            base_top = current_depth
            if in_fault_zone and layer_name in ['强风化岩', '中风化岩', '微风化岩', '基岩']:
                # 基岩层受断层位移影响
                base_top += fault_displacement
            
            z_top = -base_top  # 负值表示地下
            z_bottom = -(base_top + actual_thickness)
            
            # 添加地形起伏
            terrain_variation = np.random.normal(0, 2)
            z_top += terrain_variation
            z_bottom += terrain_variation
            
            borehole_data.append({
                'borehole_id': borehole_id,
                'x': x,
                'y': y,
                'z_top': z_top,
                'z_bottom': z_bottom,
                'formation_id': len(borehole_data) + 1,
                'formation_name': layer_name,
                'thickness': z_top - z_bottom,
                'density': 1.6 + np.random.normal(0, 0.1),
                'in_fault_zone': in_fault_zone
            })
            
            current_depth += actual_thickness
            
            # 限制最大深度
            if current_depth > 200:
                break
        
        all_data.extend(borehole_data)
    
    # 创建DataFrame
    df = pd.DataFrame(all_data)
    
    # 添加颜色
    color_map = {
        '填土': '#8B4513',
        '粘土': '#FF0000', 
        '粉质粘土': '#FF8C00',
        '细砂': '#FFD700',
        '中砂': '#32CD32',
        '粗砂': '#00CED1',
        '砾砂': '#1E90FF',
        '卵石层': '#9932CC',
        '强风化岩': '#DC143C',
        '中风化岩': '#708090',
        '微风化岩': '#2F4F4F',
        '基岩': '#000000'
    }
    
    df['color'] = df['formation_name'].map(color_map)
    df['enhanced_color'] = df['color']  # 使用同样的颜色
    
    return df, fault_zones

def generate_fault_data(fault_zones):
    """生成断层数据"""
    fault_data = []
    
    for fault in fault_zones:
        # 为每个断层生成一些控制点
        for i in range(10):
            angle = fault['strike'] + np.random.normal(0, 5)
            distance = np.random.uniform(-fault['width']/2, fault['width']/2)
            
            x = fault['center_x'] + distance * np.cos(np.radians(angle))
            y = fault['center_y'] + distance * np.sin(np.radians(angle))
            z = np.random.uniform(-150, -20)
            
            fault_data.append({
                'fault_id': fault['name'],
                'x': x,
                'y': y,
                'z': z,
                'strike': fault['strike'],
                'displacement': fault['displacement']
            })
    
    return pd.DataFrame(fault_data)

def main():
    """生成并保存真实地质数据"""
    print(">> 生成真实地质模拟数据")
    print("=" * 50)
    
    # 生成数据
    borehole_df, fault_zones = generate_realistic_borehole_data()
    fault_df = generate_fault_data(fault_zones)
    
    # 创建输出目录
    output_dir = Path("example3/data")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 保存数据
    borehole_df.to_csv(output_dir / "realistic_borehole_data.csv", index=False, encoding='utf-8')
    fault_df.to_csv(output_dir / "realistic_fault_data.csv", index=False, encoding='utf-8')
    
    # 统计信息
    print(f"[OK] 生成钻孔数据: {len(borehole_df)} 条记录")
    print(f"[OK] 涉及钻孔: {borehole_df['borehole_id'].nunique()} 个")
    print(f"[OK] 地层类型: {borehole_df['formation_name'].nunique()} 种")
    print(f"[OK] 断层数据: {len(fault_df)} 个控制点")
    
    # 显示断层统计
    print("\n>> 断层影响统计:")
    fault_affected = borehole_df[borehole_df['in_fault_zone'] == True]
    print(f"  - 受断层影响的记录: {len(fault_affected)} 条")
    print(f"  - 受影响的钻孔: {fault_affected['borehole_id'].nunique()} 个")
    
    # 显示地层分布
    print("\n>> 地层分布:")
    layer_counts = borehole_df['formation_name'].value_counts()
    for layer, count in layer_counts.items():
        print(f"  - {layer}: {count} 条记录")
    
    print(f"\n[OK] 数据已保存到: {output_dir}")
    print("特点:")
    print("  - 真实的断层效应（某些地层缺失）")
    print("  - 地层厚度变化")
    print("  - 地形起伏")
    print("  - 断层位移影响")

if __name__ == "__main__":
    main()