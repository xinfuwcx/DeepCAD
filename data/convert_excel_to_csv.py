#!/usr/bin/env python3
"""
Excel地质数据转换为CSV格式的脚本
处理10层土的真实地质数据
"""

import pandas as pd
import numpy as np

def convert_excel_to_csv():
    print("=== 地质数据转换工具 ===")
    
    # 读取Excel文件
    print("正在读取Excel文件...")
    df = pd.read_excel('地层点数据（原始)-改坐标-2.xls')
    
    print(f"原始数据形状: {df.shape}")
    
    # 分析数据结构
    # 第0行: 地层名称 (第1层, 第2层, ..., 第10层)
    # 第1行: 坐标轴名称 (X, Y, Z)
    # 第2行开始: 实际数据点
    
    # 提取地层信息
    layer_names = []
    layer_columns = {}
    
    # 从第一行提取地层名称
    first_row = df.iloc[0]
    current_layer = None
    col_index = 0
    
    for i, cell in enumerate(first_row):
        if pd.notna(cell) and str(cell).startswith('第') and str(cell).endswith('层'):
            current_layer = str(cell)
            layer_names.append(current_layer)
            layer_columns[current_layer] = {'start': i, 'cols': []}
        elif current_layer and pd.notna(cell):
            # 如果有其他信息也记录
            pass
    
    # 从第二行提取坐标轴信息
    second_row = df.iloc[1]
    for layer in layer_names:
        start_col = layer_columns[layer]['start']
        # 查找该层的X, Y, Z列
        for j in range(start_col, min(start_col + 10, len(second_row))):
            if pd.notna(second_row.iloc[j]):
                coord = str(second_row.iloc[j]).strip()
                if coord in ['X', 'Y', 'Z']:
                    layer_columns[layer]['cols'].append({'coord': coord, 'col_idx': j})
    
    print(f"检测到地层: {layer_names}")
    
    # 提取实际数据 (从第3行开始)
    data_rows = df.iloc[2:].reset_index(drop=True)
    
    # 创建标准化的CSV数据
    csv_data = []
    
    for layer in layer_names:
        layer_info = layer_columns[layer]
        if len(layer_info['cols']) >= 3:  # 确保有X, Y, Z三列
            # 找到X, Y, Z列的索引
            x_col = None
            y_col = None
            z_col = None
            
            for col_info in layer_info['cols']:
                if col_info['coord'] == 'X':
                    x_col = col_info['col_idx']
                elif col_info['coord'] == 'Y':
                    y_col = col_info['col_idx']
                elif col_info['coord'] == 'Z':
                    z_col = col_info['col_idx']
            
            if x_col is not None and y_col is not None and z_col is not None:
                # 提取该层的所有数据点
                for idx, row in data_rows.iterrows():
                    x_val = row.iloc[x_col]
                    y_val = row.iloc[y_col]
                    z_val = row.iloc[z_col]
                    
                    # 检查数据有效性
                    if pd.notna(x_val) and pd.notna(y_val) and pd.notna(z_val):
                        try:
                            x = float(x_val)
                            y = float(y_val)
                            z = float(z_val)
                            
                            # 添加到CSV数据
                            csv_data.append({
                                'X': x,
                                'Y': y, 
                                'Z': z,
                                'surface': layer.replace('第', 'surface_').replace('层', '')
                            })
                        except (ValueError, TypeError):
                            continue
    
    # 创建DataFrame
    csv_df = pd.DataFrame(csv_data)
    
    if len(csv_df) == 0:
        print("错误: 没有提取到有效数据!")
        return
    
    print(f"提取到 {len(csv_df)} 个有效数据点")
    print(f"地层分布:")
    surface_counts = csv_df['surface'].value_counts().sort_index()
    for surface, count in surface_counts.items():
        print(f"  {surface}: {count} 个点")
    
    # 计算计算域
    x_min, x_max = csv_df['X'].min(), csv_df['X'].max()
    y_min, y_max = csv_df['Y'].min(), csv_df['Y'].max()
    z_min, z_max = csv_df['Z'].min(), csv_df['Z'].max()
    
    # 添加边界缓冲区 (10%)
    x_buffer = (x_max - x_min) * 0.1
    y_buffer = (y_max - y_min) * 0.1
    z_buffer = (z_max - z_min) * 0.1
    
    domain = {
        'x_min': x_min - x_buffer,
        'x_max': x_max + x_buffer,
        'y_min': y_min - y_buffer,
        'y_max': y_max + y_buffer,
        'z_min': z_min - z_buffer,
        'z_max': z_max + z_buffer,
        'width': (x_max - x_min) + 2 * x_buffer,
        'length': (y_max - y_min) + 2 * y_buffer,
        'height': (z_max - z_min) + 2 * z_buffer
    }
    
    print("\n=== 计算域信息 ===")
    print(f"原始数据范围:")
    print(f"  X: {x_min:.2f} ~ {x_max:.2f} (跨度: {x_max-x_min:.2f}m)")
    print(f"  Y: {y_min:.2f} ~ {y_max:.2f} (跨度: {y_max-y_min:.2f}m)")
    print(f"  Z: {z_min:.2f} ~ {z_max:.2f} (跨度: {z_max-z_min:.2f}m)")
    
    print(f"\n推荐计算域 (含10%缓冲区):")
    print(f"  X: {domain['x_min']:.2f} ~ {domain['x_max']:.2f}")
    print(f"  Y: {domain['y_min']:.2f} ~ {domain['y_max']:.2f}")
    print(f"  Z: {domain['z_min']:.2f} ~ {domain['z_max']:.2f}")
    print(f"  尺寸: {domain['width']:.2f} × {domain['length']:.2f} × {domain['height']:.2f} m")
    
    # 保存CSV文件
    output_filename = 'real_borehole_data_10_layers.csv'
    csv_df.to_csv(output_filename, index=False)
    print(f"\n✅ CSV文件已保存: {output_filename}")
    
    # 保存计算域信息
    domain_filename = 'computation_domain.txt'
    with open(domain_filename, 'w', encoding='utf-8') as f:
        f.write("=== 地质建模计算域信息 ===\n\n")
        f.write(f"数据来源: 地层点数据（原始)-改坐标-2.xls\n")
        f.write(f"地层数量: {len(surface_counts)} 层\n")
        f.write(f"数据点总数: {len(csv_df)} 个\n\n")
        
        f.write("地层分布:\n")
        for surface, count in surface_counts.items():
            f.write(f"  {surface}: {count} 个点\n")
        
        f.write(f"\n原始数据范围:\n")
        f.write(f"  X: {x_min:.2f} ~ {x_max:.2f} m (跨度: {x_max-x_min:.2f}m)\n")
        f.write(f"  Y: {y_min:.2f} ~ {y_max:.2f} m (跨度: {y_max-y_min:.2f}m)\n")
        f.write(f"  Z: {z_min:.2f} ~ {z_max:.2f} m (跨度: {z_max-z_min:.2f}m)\n")
        
        f.write(f"\n推荐计算域 (含10%缓冲区):\n")
        f.write(f"  X_MIN = {domain['x_min']:.2f}\n")
        f.write(f"  X_MAX = {domain['x_max']:.2f}\n")
        f.write(f"  Y_MIN = {domain['y_min']:.2f}\n")
        f.write(f"  Y_MAX = {domain['y_max']:.2f}\n")
        f.write(f"  Z_MIN = {domain['z_min']:.2f}\n")
        f.write(f"  Z_MAX = {domain['z_max']:.2f}\n")
        f.write(f"  WIDTH = {domain['width']:.2f}\n")
        f.write(f"  LENGTH = {domain['length']:.2f}\n")
        f.write(f"  HEIGHT = {domain['height']:.2f}\n")
        
        f.write(f"\nGemPy建模建议:\n")
        f.write(f"  - 分辨率: [60, 60, 30] (可根据需要调整)\n")
        f.write(f"  - 网格尺寸: 5.0 ~ 10.0 m\n")
        f.write(f"  - 使用Gmsh OCC进行高质量网格生成\n")
        f.write(f"  - 地层顺序: surface_1 (最上层) → surface_10 (最下层)\n")
    
    print(f"✅ 计算域信息已保存: {domain_filename}")
    
    # 显示样本数据
    print(f"\n=== 样本数据 ===")
    print(csv_df.head(10))
    
    return csv_df, domain

if __name__ == "__main__":
    convert_excel_to_csv() 