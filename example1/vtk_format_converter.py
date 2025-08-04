#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VTK格式转换器
修复VTK文件缺少拓扑信息的问题，使其兼容Web VTK加载器
"""

import os
import numpy as np

def fix_vtk_format(input_file, output_file):
    """
    修复VTK文件格式，添加缺失的拓扑信息
    
    Args:
        input_file: 输入VTK文件路径
        output_file: 输出VTK文件路径
    """
    
    with open(input_file, 'r') as f:
        lines = f.readlines()
    
    # 解析点数据
    points = []
    vectors = []
    point_count = 0
    
    reading_points = False
    reading_vectors = False
    
    for line in lines:
        line = line.strip()
        
        if line.startswith('POINTS'):
            point_count = int(line.split()[1])
            reading_points = True
            continue
            
        if line.startswith('POINT_DATA'):
            reading_points = False
            continue
            
        if line.startswith('VECTORS'):
            reading_vectors = True
            continue
            
        if reading_points and line and not line.startswith('POINT_DATA'):
            try:
                coords = [float(x) for x in line.split()]
                if len(coords) >= 3:
                    points.append(coords[:3])
            except ValueError:
                continue
                
        if reading_vectors and line and not line.startswith(('#', 'VECTORS')):
            try:
                vec = [float(x) for x in line.split()]
                if len(vec) >= 3:
                    vectors.append(vec[:3])
            except ValueError:
                continue
    
    # 创建规则网格拓扑
    # 假设是10x10的规则网格
    grid_size = int(np.sqrt(point_count))
    if grid_size * grid_size != point_count:
        grid_size = 10  # 默认10x10网格
    
    # 生成单元连接
    cells = []
    cell_types = []
    
    for i in range(grid_size - 1):
        for j in range(grid_size - 1):
            # 四边形单元 (QUAD)
            p1 = i * grid_size + j
            p2 = i * grid_size + j + 1
            p3 = (i + 1) * grid_size + j + 1
            p4 = (i + 1) * grid_size + j
            
            cells.append([4, p1, p2, p3, p4])  # VTK_QUAD = 9
            cell_types.append(9)
    
    # 写入修复后的VTK文件
    with open(output_file, 'w') as f:
        # 写入头部信息
        f.write("# vtk DataFile Version 3.0\n")
        f.write("MSH Example1 Results - Fixed Format\n")
        f.write("ASCII\n")
        f.write("DATASET UNSTRUCTURED_GRID\n\n")
        
        # 写入点数据
        f.write(f"POINTS {len(points)} float\n")
        for point in points:
            f.write(f"{point[0]:.2f} {point[1]:.2f} {point[2]:.2f}\n")
        f.write("\n")
        
        # 写入单元数据
        total_cell_size = sum(len(cell) for cell in cells)
        f.write(f"CELLS {len(cells)} {total_cell_size}\n")
        for cell in cells:
            f.write(" ".join(map(str, cell)) + "\n")
        f.write("\n")
        
        # 写入单元类型
        f.write(f"CELL_TYPES {len(cell_types)}\n")
        for cell_type in cell_types:
            f.write(f"{cell_type}\n")
        f.write("\n")
        
        # 写入点数据
        f.write(f"POINT_DATA {len(points)}\n")
        if vectors:
            f.write("VECTORS displacement float\n")
            for vector in vectors:
                f.write(f"{vector[0]:.6f} {vector[1]:.6f} {vector[2]:.6f}\n")

def convert_all_vtk_files():
    """转换所有VTK文件"""
    
    input_dir = "H:/DeepCAD/output/vtk_output"
    output_dir = "H:/DeepCAD/output/vtk_output_fixed"
    
    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)
    
    # 转换所有VTK文件
    vtk_files = [f for f in os.listdir(input_dir) if f.endswith('.vtk')]
    
    for vtk_file in vtk_files:
        input_path = os.path.join(input_dir, vtk_file)
        output_path = os.path.join(output_dir, vtk_file)
        
        print(f"Converting {vtk_file}...")
        fix_vtk_format(input_path, output_path)
        print(f"Fixed VTK saved to: {output_path}")

if __name__ == "__main__":
    convert_all_vtk_files()
    print("All VTK files have been converted successfully!")