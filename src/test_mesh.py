#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试网格模块
包括网格生成和片段化功能
"""

import os
import sys
import logging
from core.meshing.gmsh_wrapper import GmshWrapper, FragmentType, MeshAlgorithm

def setup_logging():
    """设置日志"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("mesh_test.log", mode='w', encoding='utf-8')
        ]
    )
    return logging.getLogger("MeshTest")

def test_simple_box():
    """测试创建简单盒体并生成网格"""
    logger = setup_logging()
    logger.info("开始测试简单盒体网格生成...")
    
    # 创建Gmsh包装器
    gmsh = GmshWrapper(verbose=True)
    
    # 创建新模型
    gmsh.create_new_model("simple_box")
    
    # 创建长方体
    box = gmsh.add_box(0, 0, 0, 10, 10, 10)
    logger.info(f"创建了长方体，ID: {box}")
    
    # 添加物理组
    group_tag = gmsh.add_physical_group(3, [box], "domain")
    logger.info(f"添加了物理组，ID: {group_tag}")
    
    # 设置全局网格尺寸
    element_size = 1.0
    logger.info(f"全局网格尺寸: {element_size}")
    
    # 生成网格
    mesh_info = gmsh.generate_mesh(
        algorithm=MeshAlgorithm.DELAUNAY,
        element_size=element_size,
        order=2,
        optimize_steps=10,
        output_file="./data/mesh/simple_box.msh",
        dimension=3
    )
    
    logger.info(f"网格生成完成，详细信息:")
    for key, value in mesh_info.items():
        logger.info(f"  {key}: {value}")
    
    # 导出VTK格式
    gmsh.export_mesh("./data/mesh/simple_box.vtk", "vtk")
    logger.info("导出VTK格式完成")
    
    logger.info("简单盒体测试完成")
    
def test_fragments():
    """测试片段化功能"""
    logger = setup_logging()
    logger.info("开始测试片段化功能...")
    
    # 创建Gmsh包装器
    gmsh = GmshWrapper(verbose=True)
    
    # 创建新模型
    gmsh.create_new_model("fragment_test")
    
    # 创建基本几何体
    box = gmsh.add_box(0, 0, 0, 20, 20, 20)
    logger.info(f"创建了基础长方体，ID: {box}")
    
    # 添加物理组
    group_tag = gmsh.add_physical_group(3, [box], "domain")
    logger.info(f"添加了物理组，ID: {group_tag}")
    
    # 设置全局网格尺寸
    base_size = 2.0
    logger.info(f"全局网格尺寸: {base_size}")
    
    # 添加片段场 - 盒体
    box_field = gmsh.add_fragment_mesh_field(
        fragment_type=FragmentType.BOX,
        location=[5, 5, 5],
        size=0.5,
        params={
            "width": 5,
            "length": 5,
            "height": 5,
            "transition": 0.3
        }
    )
    logger.info(f"添加了盒体片段场，ID: {box_field}")
    
    # 添加片段场 - 球体
    sphere_field = gmsh.add_fragment_mesh_field(
        fragment_type=FragmentType.SPHERE,
        location=[15, 15, 15],
        size=0.3,
        params={
            "radius": 3,
            "transition": 0.3
        }
    )
    logger.info(f"添加了球体片段场，ID: {sphere_field}")
    
    # 添加片段场 - 平面
    plane_field = gmsh.add_fragment_mesh_field(
        fragment_type=FragmentType.PLANE,
        location=[0, 0, 10],
        size=0.4,
        params={
            "a": 0,
            "b": 0,
            "c": 1,
            "transition": 0.5
        }
    )
    logger.info(f"添加了平面片段场，ID: {plane_field}")
    
    # 组合片段场
    min_field = gmsh.add_min_field([box_field, sphere_field, plane_field])
    logger.info(f"添加了最小值场，ID: {min_field}")
    
    # 设置背景场
    gmsh.set_background_mesh_field(min_field)
    logger.info(f"设置了背景场")
    
    # 生成网格
    mesh_info = gmsh.generate_mesh(
        algorithm=MeshAlgorithm.DELAUNAY,
        element_size=base_size,
        order=2,
        optimize_steps=10,
        output_file="./data/mesh/fragment_test.msh",
        dimension=3
    )
    
    logger.info(f"网格生成完成，详细信息:")
    for key, value in mesh_info.items():
        logger.info(f"  {key}: {value}")
    
    # 导出VTK格式
    gmsh.export_mesh("./data/mesh/fragment_test.vtk", "vtk")
    logger.info("导出VTK格式完成")
    
    logger.info("片段化测试完成")

def test_excavation_model():
    """测试深基坑模型"""
    logger = setup_logging()
    logger.info("开始测试深基坑模型...")
    
    # 创建Gmsh包装器
    gmsh = GmshWrapper(verbose=True)
    
    # 创建新模型
    gmsh.create_new_model("deep_excavation")
    
    # 创建地层模型 (总体是一个长方体)
    soil_domain = gmsh.add_box(-20, -20, -30, 40, 40, 30)
    logger.info(f"创建了土体域，ID: {soil_domain}")
    
    # 创建基坑几何 (从土体中挖出一个长方体)
    excavation = gmsh.add_box(-10, -10, -10, 20, 20, 10)
    logger.info(f"创建了基坑几何，ID: {excavation}")
    
    # 执行布尔差运算
    soil_with_excavation = gmsh.boolean_difference([(3, soil_domain)], [(3, excavation)])
    logger.info(f"执行布尔差运算，结果: {soil_with_excavation}")
    
    # 获取操作后的体标识
    soil_volume_tag = soil_with_excavation[0][1]
    
    # 添加物理组
    soil_group = gmsh.add_physical_group(3, [soil_volume_tag], "soil_domain")
    logger.info(f"添加了土体物理组，ID: {soil_group}")
    
    # 识别基坑表面
    surface_tags = []
    # 在实际应用中，应该从几何中提取基坑表面
    # 这里简化为创建表面物理组
    # 假设表面标签为1-6
    for i in range(1, 7):
        surface_tags.append(i)
    
    excavation_group = gmsh.add_physical_group(2, surface_tags, "excavation_surface")
    logger.info(f"添加了基坑表面物理组，ID: {excavation_group}")
    
    # 设置全局网格尺寸
    base_size = 2.0
    logger.info(f"全局网格尺寸: {base_size}")
    
    # 添加基坑内部细化区域
    box_field = gmsh.add_fragment_mesh_field(
        fragment_type=FragmentType.BOX,
        location=[0, 0, -5],
        size=0.5,
        params={
            "width": 25,
            "length": 25,
            "height": 15,
            "transition": 1.0
        }
    )
    logger.info(f"添加了基坑内部细化区域，ID: {box_field}")
    
    # 添加支护结构细化区域
    wall_field = gmsh.add_fragment_mesh_field(
        fragment_type=FragmentType.BOX,
        location=[0, 0, -7],
        size=0.2,
        params={
            "width": 22,
            "length": 22,
            "height": 15,
            "transition": 0.5
        }
    )
    logger.info(f"添加了支护结构细化区域，ID: {wall_field}")
    
    # 组合片段场
    min_field = gmsh.add_min_field([box_field, wall_field])
    logger.info(f"添加了最小值场，ID: {min_field}")
    
    # 设置背景场
    gmsh.set_background_mesh_field(min_field)
    logger.info(f"设置了背景场")
    
    # 生成网格
    mesh_info = gmsh.generate_mesh(
        algorithm=MeshAlgorithm.DELAUNAY,
        element_size=base_size,
        order=2,
        optimize_steps=10,
        output_file="./data/mesh/deep_excavation.msh",
        dimension=3
    )
    
    logger.info(f"网格生成完成，详细信息:")
    for key, value in mesh_info.items():
        logger.info(f"  {key}: {value}")
    
    # 导出VTK格式
    gmsh.export_mesh("./data/mesh/deep_excavation.vtk", "vtk")
    logger.info("导出VTK格式完成")
    
    logger.info("深基坑模型测试完成")

if __name__ == "__main__":
    # 确保输出目录存在
    os.makedirs("./data/mesh", exist_ok=True)
    
    # 运行测试
    try:
        print("=== 测试简单盒体 ===")
        test_simple_box()
        
        print("\n=== 测试片段化功能 ===")
        test_fragments()
        
        print("\n=== 测试深基坑模型 ===")
        test_excavation_model()
        
        print("\n所有测试完成")
    except Exception as e:
        print(f"测试过程中出现错误: {e}") 