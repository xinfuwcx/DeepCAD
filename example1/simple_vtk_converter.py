#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单VTK格式转换器
直接修复Web兼容性问题
"""

import os
import re

def convert_vtk_file(input_file, output_file):
    """转换单个VTK文件"""
    
    with open(input_file, 'r') as f:
        content = f.read()
    
    # 解析点数据
    points_match = re.search(r'POINTS (\d+) float\n(.*?)POINT_DATA', content, re.DOTALL)
    if not points_match:
        print(f"Failed to parse points from {input_file}")
        return
    
    point_count = int(points_match.group(1))
    points_data = points_match.group(2).strip()
    
    # 解析位移向量
    vectors_match = re.search(r'VECTORS displacement float\n(.*)', content, re.DOTALL)
    vectors_data = ""
    if vectors_match:
        vectors_data = vectors_match.group(1).strip()
    
    # 创建10x10网格的单元连接
    grid_size = 10
    
    # 写入新的VTK文件
    with open(output_file, 'w') as f:
        f.write("# vtk DataFile Version 3.0\n")
        f.write("MSH Example1 Results - Web Compatible\n")
        f.write("ASCII\n")
        f.write("DATASET UNSTRUCTURED_GRID\n\n")
        
        # 写入点数据
        f.write(f"POINTS {point_count} float\n")
        f.write(points_data)
        f.write("\n\n")
        
        # 写入单元连接 (9x9 = 81个四边形单元)
        num_cells = (grid_size - 1) * (grid_size - 1)
        f.write(f"CELLS {num_cells} {num_cells * 5}\n")
        
        for i in range(grid_size - 1):
            for j in range(grid_size - 1):
                p1 = i * grid_size + j
                p2 = i * grid_size + j + 1
                p3 = (i + 1) * grid_size + j + 1
                p4 = (i + 1) * grid_size + j
                f.write(f"4 {p1} {p2} {p3} {p4}\n")
        f.write("\n")
        
        # 写入单元类型 (VTK_QUAD = 9)
        f.write(f"CELL_TYPES {num_cells}\n")
        for _ in range(num_cells):
            f.write("9\n")
        f.write("\n")
        
        # 写入点数据
        f.write(f"POINT_DATA {point_count}\n")
        if vectors_data:
            f.write("VECTORS displacement float\n")
            f.write(vectors_data)
            f.write("\n")

def main():
    """转换所有VTK文件"""
    
    input_dir = "H:/DeepCAD/output/vtk_output"
    output_dir = "H:/DeepCAD/output/vtk_web_compatible"
    
    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)
    
    # 转换所有VTK文件
    for filename in os.listdir(input_dir):
        if filename.endswith('.vtk'):
            input_path = os.path.join(input_dir, filename)
            output_path = os.path.join(output_dir, filename)
            
            print(f"Converting {filename}...")
            convert_vtk_file(input_path, output_path)
            print(f"Web-compatible VTK saved to: {output_path}")

if __name__ == "__main__":
    main()
    print("All VTK files converted to web-compatible format!")