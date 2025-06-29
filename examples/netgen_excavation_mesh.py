#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
使用Netgen生成深基坑工程网格的示例
"""

import os
import sys
import numpy as np
import netgen.meshing as ngmesh
import netgen.csg as csg
import matplotlib.pyplot as plt

try:
    import pyvista as pv
    HAS_PYVISTA = True
except ImportError:
    HAS_PYVISTA = False


def create_excavation_mesh(
    width=20.0,       # 基坑宽度
    length=20.0,      # 基坑长度
    depth=10.0,       # 基坑深度
    soil_width=60.0,  # 土体总宽度
    soil_length=60.0, # 土体总长度
    soil_depth=30.0,  # 土体总深度
    wall_thickness=1.0,  # 围护墙厚度
    mesh_size=2.0,    # 默认网格尺寸
    fine_mesh_size=0.5,  # 精细网格尺寸
    output_dir="data/mesh"
):
    """创建一个简单的深基坑工程网格"""
    print("创建深基坑工程网格...")
    
    # 创建几何模型
    geo = csg.CSGeometry()
    
    # 创建土体 (大立方体)
    soil_box = csg.OrthoBrick(
        csg.Pnt(-soil_width/2, -soil_length/2, -soil_depth), 
        csg.Pnt(soil_width/2, soil_length/2, 0)
    )
    
    # 创建基坑 (小立方体)
    excavation_box = csg.OrthoBrick(
        csg.Pnt(-width/2, -length/2, -depth), 
        csg.Pnt(width/2, length/2, 0)
    )
    
    # 创建围护墙 (四个矩形板)
    wall_front = csg.OrthoBrick(
        csg.Pnt(-width/2-wall_thickness, -length/2-wall_thickness, -depth-wall_thickness),
        csg.Pnt(width/2+wall_thickness, -length/2, 0)
    )
    
    wall_back = csg.OrthoBrick(
        csg.Pnt(-width/2-wall_thickness, length/2, -depth-wall_thickness),
        csg.Pnt(width/2+wall_thickness, length/2+wall_thickness, 0)
    )
    
    wall_left = csg.OrthoBrick(
        csg.Pnt(-width/2-wall_thickness, -length/2, -depth-wall_thickness),
        csg.Pnt(-width/2, length/2, 0)
    )
    
    wall_right = csg.OrthoBrick(
        csg.Pnt(width/2, -length/2, -depth-wall_thickness),
        csg.Pnt(width/2+wall_thickness, length/2, 0)
    )
    
    # 组合围护墙
    diaphragm_wall = wall_front + wall_back + wall_left + wall_right
    
    # 从土体中减去基坑
    soil = soil_box - excavation_box
    
    # 添加到几何模型
    geo.Add(soil.mat("soil"))
    geo.Add(diaphragm_wall.mat("wall"))
    
    # 设置网格参数
    mesh_params = ngmesh.MeshingParameters(maxh=mesh_size)
    
    # 设置局部网格尺寸 (围护墙附近更细)
    mesh_params.grading = 0.3  # 网格尺寸渐变因子
    
    # 生成网格
    mesh = ngmesh.GenerateMesh(geo, mesh_params)
    
    # 输出网格信息
    print("网格生成成功!")
    print(f"节点数: {mesh.nv}")
    print(f"单元数: {mesh.ne}")
    
    # 保存网格
    os.makedirs(output_dir, exist_ok=True)
    mesh.Export(os.path.join(output_dir, "excavation_model.vol"), "Netgen")
    print(f"网格已保存到 {os.path.join(output_dir, 'excavation_model.vol')}")
    
    # 如果有PyVista，则可视化网格
    if HAS_PYVISTA:
        visualize_mesh(mesh, os.path.join(output_dir, "excavation_model.vtk"))
    
    return mesh


def visualize_mesh(mesh, output_file=None):
    """使用PyVista可视化网格"""
    if not HAS_PYVISTA:
        print("PyVista未安装，无法可视化网格")
        return
    
    print("正在可视化网格...")
    
    # 导出为VTK格式
    if output_file:
        mesh.Export(output_file, "VTK")
    
    # 使用PyVista加载并显示
    mesh_pv = pv.read(output_file)
    
    # 创建绘图
    plotter = pv.Plotter()
    plotter.add_mesh(mesh_pv, show_edges=True, opacity=0.7)
    plotter.add_axes()
    plotter.show_grid()
    plotter.show()


def main():
    """主函数"""
    print("=" * 50)
    print("Netgen深基坑网格生成示例")
    print("=" * 50)
    
    # 创建网格
    mesh = create_excavation_mesh()
    
    print("=" * 50)


if __name__ == "__main__":
    main() 