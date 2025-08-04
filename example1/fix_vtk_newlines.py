#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复VTK文件换行符问题并添加拓扑信息
"""

import os

def fix_vtk_file(input_file, output_file):
    """修复VTK文件"""
    
    with open(input_file, 'r') as f:
        content = f.read()
    
    # 替换\n为真正的换行符
    content = content.replace('\\n', '\n')
    
    # 分割为行
    lines = content.split('\n')
    
    # 解析数据
    points = []
    vectors = []
    reading_points = False
    reading_vectors = False
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        if line.startswith('POINTS'):
            reading_points = True
            continue
        elif line.startswith('POINT_DATA'):
            reading_points = False
            continue
        elif line.startswith('VECTORS'):
            reading_vectors = True
            continue
            
        if reading_points and not line.startswith(('POINT_DATA', 'VECTORS')):
            try:
                coords = [float(x) for x in line.split()]
                if len(coords) >= 3:
                    points.append(coords[:3])
            except ValueError:
                continue
                
        if reading_vectors:
            try:
                vec = [float(x) for x in line.split()]
                if len(vec) >= 3:
                    vectors.append(vec[:3])
            except ValueError:
                continue
    
    print(f"Parsed {len(points)} points and {len(vectors)} vectors")
    
    # 创建10x10网格
    grid_size = 10
    num_cells = (grid_size - 1) * (grid_size - 1)
    
    # 写入修复后的VTK文件
    with open(output_file, 'w') as f:
        f.write("# vtk DataFile Version 3.0\n")
        f.write("MSH Example1 Results - Web Compatible\n")
        f.write("ASCII\n")
        f.write("DATASET UNSTRUCTURED_GRID\n\n")
        
        # 写入点数据
        f.write(f"POINTS {len(points)} float\n")
        for point in points:
            f.write(f"{point[0]:.2f} {point[1]:.2f} {point[2]:.2f}\n")
        f.write("\n")
        
        # 写入单元连接
        f.write(f"CELLS {num_cells} {num_cells * 5}\n")
        for i in range(grid_size - 1):
            for j in range(grid_size - 1):
                p1 = i * grid_size + j
                p2 = i * grid_size + j + 1
                p3 = (i + 1) * grid_size + j + 1
                p4 = (i + 1) * grid_size + j
                f.write(f"4 {p1} {p2} {p3} {p4}\n")
        f.write("\n")
        
        # 写入单元类型
        f.write(f"CELL_TYPES {num_cells}\n")
        for _ in range(num_cells):
            f.write("9\n")
        f.write("\n")
        
        # 写入点数据
        f.write(f"POINT_DATA {len(points)}\n")
        if vectors:
            f.write("VECTORS displacement float\n")
            for vector in vectors:
                f.write(f"{vector[0]:.6f} {vector[1]:.6f} {vector[2]:.6f}\n")

def main():
    """转换所有VTK文件"""
    
    input_dir = "H:/DeepCAD/output/vtk_output"
    output_dir = "H:/DeepCAD/output/vtk_web_ready"
    
    os.makedirs(output_dir, exist_ok=True)
    
    for filename in os.listdir(input_dir):
        if filename.endswith('.vtk'):
            input_path = os.path.join(input_dir, filename)
            output_path = os.path.join(output_dir, filename)
            
            print(f"\nProcessing {filename}...")
            fix_vtk_file(input_path, output_path)
            print(f"Fixed file saved to: {output_path}")

if __name__ == "__main__":
    main()
    print("\nAll VTK files have been fixed and are now web-compatible!")