#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Netgen与Kratos集成示例
演示如何将Netgen生成的网格导入到Kratos中进行分析
"""

import os

# 检查必要的库是否已安装
try:
    import netgen.meshing as ngmesh
    import netgen.csg as csg
    import meshio
    HAS_NETGEN = True
except ImportError:
    print("警告: Netgen库未安装，请安装netgen-mesher")
    HAS_NETGEN = False

try:
    import KratosMultiphysics
    # 导入结构力学应用
    HAS_KRATOS = True
except ImportError:
    print("警告: Kratos库未安装，请安装KratosMultiphysics")
    HAS_KRATOS = False


def generate_excavation_mesh(output_dir="data/mesh"):
    """使用Netgen生成深基坑网格"""
    if not HAS_NETGEN:
        print("错误: 无法生成网格，Netgen未安装")
        return None
    
    print("使用Netgen生成深基坑网格...")
    
    # 创建几何模型
    geo = csg.CSGeometry()
    
    # 定义参数
    width = 20.0        # 基坑宽度
    length = 20.0       # 基坑长度
    depth = 10.0        # 基坑深度
    soil_width = 60.0   # 土体总宽度
    soil_length = 60.0  # 土体总长度
    soil_depth = 30.0   # 土体总深度
    wall_thickness = 1.0  # 围护墙厚度
    
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
    mesh_params = ngmesh.MeshingParameters(maxh=2.0)
    mesh_params.grading = 0.3  # 网格尺寸渐变因子
    
    # 生成网格
    mesh = ngmesh.GenerateMesh(geo, mesh_params)
    
    # 输出网格信息
    print(f"网格生成成功!")
    print(f"节点数: {mesh.nv}")
    print(f"单元数: {mesh.ne}")
    
    # 保存网格
    os.makedirs(output_dir, exist_ok=True)
    vtk_file = os.path.join(output_dir, "excavation_model.vtk")
    vol_file = os.path.join(output_dir, "excavation_model.vol")
    
    mesh.Export(vol_file, "Netgen")
    mesh.Export(vtk_file, "VTK")
    
    print(f"网格已保存到 {vtk_file}")
    
    return mesh, vtk_file


def convert_mesh_to_kratos(vtk_file, output_dir="data/mesh"):
    """将VTK格式的网格转换为Kratos可用的格式"""
    if not os.path.exists(vtk_file):
        print(f"错误: 找不到VTK文件 {vtk_file}")
        return None
    
    print(f"转换网格从VTK到Kratos格式...")
    
    # 使用meshio读取VTK文件
    mesh = meshio.read(vtk_file)
    
    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)
    
    # 输出为MDPA格式 (Kratos模型部分定义格式)
    mdpa_file = os.path.join(output_dir, "excavation_model.mdpa")
    
    # 注意: meshio不直接支持MDPA格式，这里我们需要手动创建
    # 在实际应用中，可以使用Kratos的导入工具或编写自定义转换器
    
    # 为简化演示，我们这里只是将VTK保存为Kratos可读的格式
    # 实际项目中应该实现完整的转换
    print(f"注意: 此示例不执行完整的MDPA转换")
    print(f"在实际项目中，应使用Kratos的导入工具或自定义转换器")
    
    # 返回原始VTK文件路径，Kratos可以直接读取VTK
    return vtk_file


def setup_kratos_analysis(mesh_file):
    """设置Kratos分析"""
    if not HAS_KRATOS:
        print("错误: 无法设置分析，Kratos未安装")
        return None
    
    print("设置Kratos分析...")
    
    # 创建Kratos模型
    model = KratosMultiphysics.Model()
    model_part = model.CreateModelPart("ExcavationModelPart")
    
    # 设置模型部分属性
    model_part.ProcessInfo[KratosMultiphysics.DOMAIN_SIZE] = 3  # 3D问题
    
    # 在实际应用中，这里应该导入网格
    # 由于这是一个演示，我们只打印一条消息
    print(f"将从 {mesh_file} 导入网格到Kratos")
    print("注意: 此示例不执行实际的Kratos分析")
    
    # 在实际应用中，这里应该设置材料属性、边界条件等
    # 然后创建求解器并运行分析
    
    return model


def main():
    """主函数"""
    print("=" * 50)
    print("Netgen与Kratos集成示例")
    print("=" * 50)
    
    # 检查必要的库
    if not HAS_NETGEN:
        print("错误: 需要安装Netgen才能运行此示例")
        return
    
    if not HAS_KRATOS:
        print("警告: Kratos未安装，将只演示网格生成部分")
    
    # 创建输出目录
    output_dir = "data/mesh"
    os.makedirs(output_dir, exist_ok=True)
    
    # 生成网格
    mesh, vtk_file = generate_excavation_mesh(output_dir)
    
    if mesh is None:
        print("错误: 网格生成失败")
        return
    
    # 转换网格
    kratos_mesh_file = convert_mesh_to_kratos(vtk_file, output_dir)
    
    if kratos_mesh_file is None:
        print("错误: 网格转换失败")
        return
    
    # 设置Kratos分析
    if HAS_KRATOS:
        model = setup_kratos_analysis(kratos_mesh_file)
        
        # 在实际应用中，这里应该运行分析
        print("\n在实际应用中，这里将执行Kratos分析并输出结果")
    
    print("\n示例完成!")
    print("=" * 50)


if __name__ == "__main__":
    main() 