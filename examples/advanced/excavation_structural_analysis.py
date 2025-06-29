#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
深基坑有限元结构分析示例

本示例展示如何使用系统进行深基坑工程的有限元分析，
包括几何建模、网格生成、材料属性定义、边界条件设置、分阶段开挖分析和结果处理。
"""

import os
import sys
import numpy as np
import matplotlib.pyplot as plt
import time
from pathlib import Path

# 添加项目根目录到路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# 导入系统模块
from src.core.simulation.terra_wrapper import TerraWrapper
from src.core.simulation.models import ComputeEngine
from src.core.meshing.gmsh_wrapper import GmshWrapper
from src.core.visualization.result_processor import ResultProcessor

def create_excavation_geometry():
    """创建深基坑几何模型"""
    print("\n" + "=" * 40)
    print("创建深基坑几何模型")
    print("=" * 40)
    
    # 创建网格生成器
    mesher = GmshWrapper()
    
    # 几何参数
    width = 100.0        # 计算域宽度(m)
    length = 100.0       # 计算域长度(m)
    depth = 40.0         # 计算域深度(m)
    exc_width = 30.0     # 基坑宽度(m)
    exc_length = 30.0    # 基坑长度(m)
    exc_depth = 20.0     # 基坑深度(m)
    wall_thickness = 1.0 # 地下连续墙厚度(m)
    wall_depth = 30.0    # 地下连续墙深度(m)
    
    # 创建几何文件
    geo_file = "examples/case_results/excavation_model.geo"
    os.makedirs(os.path.dirname(geo_file), exist_ok=True)
    
    # 调用网格生成器创建几何
    mesher.create_box_excavation(
        geo_file=geo_file,
        width=width,
        length=length,
        depth=depth,
        excavation_width=exc_width,
        excavation_length=exc_length,
        excavation_depth=exc_depth,
        wall_thickness=wall_thickness,
        wall_depth=wall_depth
    )
    
    print(f"几何模型已创建: {geo_file}")
    
    # 定义土层分界面
    soil_layers = [
        {"depth": 5.0, "name": "填土层"},
        {"depth": 15.0, "name": "粉质粘土层"},
        {"depth": 25.0, "name": "砂土层"},
        {"depth": 40.0, "name": "粘土层"}
    ]
    
    # 添加土层分界面
    mesher.add_soil_layers(geo_file, soil_layers)
    
    print(f"已添加 {len(soil_layers)} 个土层")
    
    return geo_file

def generate_mesh(geo_file):
    """生成有限元网格"""
    print("\n" + "=" * 40)
    print("生成有限元网格")
    print("=" * 40)
    
    # 创建网格生成器
    mesher = GmshWrapper()
    
    # 网格参数
    mesh_params = {
        "max_element_size": 5.0,        # 最大单元尺寸(m)
        "min_element_size": 0.5,        # 最小单元尺寸(m)
        "size_factor": 0.1,             # 尺寸因子
        "excavation_refinement": 1.0,   # 开挖区域细化因子
        "wall_refinement": 0.5,         # 地下连续墙细化因子
        "format": "msh"                 # 输出格式
    }
    
    # 生成网格
    mesh_file = "examples/case_results/excavation_model.msh"
    mesher.generate_mesh(
        geo_file=geo_file,
        mesh_file=mesh_file,
        **mesh_params
    )
    
    # 获取网格统计信息
    mesh_stats = mesher.get_mesh_statistics(mesh_file)
    
    print(f"网格已生成: {mesh_file}")
    print(f"节点数: {mesh_stats['nodes']}")
    print(f"单元数: {mesh_stats['elements']}")
    print(f"物理组数: {len(mesh_stats['physical_groups'])}")
    
    # 打印物理组信息
    print("\n物理组信息:")
    for group_name, group_info in mesh_stats['physical_groups'].items():
        print(f"  - {group_name}: {group_info['element_count']} 个单元")
    
    return mesh_file

def setup_compute_model(mesh_file):
    """设置计算模型"""
    print("\n" + "=" * 40)
    print("设置计算模型")
    print("=" * 40)
    
    # 创建计算引擎
    engine = ComputeEngine()
    
    # 创建计算模型
    model_name = "excavation_model"
    model_file = engine.create_model(model_name, mesh_file)
    
    # 设置材料属性
    soil_materials = [
        {
            "name": "填土层",
            "model": "mohr_coulomb",
            "group_id": 1,
            "parameters": {
                "young_modulus": 1.0e7,   # 弹性模量(Pa)
                "poisson_ratio": 0.3,      # 泊松比
                "cohesion": 10000.0,       # 黏聚力(Pa)
                "friction_angle": 20.0,    # 内摩擦角(度)
                "dilatancy_angle": 0.0,    # 膨胀角(度)
                "density": 1800.0          # 密度(kg/m³)
            }
        },
        {
            "name": "粉质粘土层",
            "model": "mohr_coulomb",
            "group_id": 2,
            "parameters": {
                "young_modulus": 2.0e7,    # 弹性模量(Pa)
                "poisson_ratio": 0.32,     # 泊松比
                "cohesion": 15000.0,       # 黏聚力(Pa)
                "friction_angle": 22.0,    # 内摩擦角(度)
                "dilatancy_angle": 0.0,    # 膨胀角(度)
                "density": 1850.0          # 密度(kg/m³)
            }
        },
        {
            "name": "砂土层",
            "model": "mohr_coulomb",
            "group_id": 3,
            "parameters": {
                "young_modulus": 4.0e7,    # 弹性模量(Pa)
                "poisson_ratio": 0.28,     # 泊松比
                "cohesion": 5000.0,        # 黏聚力(Pa)
                "friction_angle": 30.0,    # 内摩擦角(度)
                "dilatancy_angle": 5.0,    # 膨胀角(度)
                "density": 2000.0          # 密度(kg/m³)
            }
        },
        {
            "name": "粘土层",
            "model": "mohr_coulomb",
            "group_id": 4,
            "parameters": {
                "young_modulus": 3.0e7,    # 弹性模量(Pa)
                "poisson_ratio": 0.35,     # 泊松比
                "cohesion": 25000.0,       # 黏聚力(Pa)
                "friction_angle": 18.0,    # 内摩擦角(度)
                "dilatancy_angle": 0.0,    # 膨胀角(度)
                "density": 1900.0          # 密度(kg/m³)
            }
        }
    ]
    
    # 添加土体材料
    for material in soil_materials:
        engine.add_material(
            model_file,
            name=material["name"],
            material_type="soil",
            model=material["model"],
            parameters=material["parameters"],
            group_id=material["group_id"]
        )
    
    # 添加结构材料(地下连续墙)
    wall_material = {
        "name": "地下连续墙",
        "model": "linear_elastic",
        "group_id": 10,
        "parameters": {
            "young_modulus": 3.0e10,    # 弹性模量(Pa)
            "poisson_ratio": 0.2,       # 泊松比
            "density": 2500.0           # 密度(kg/m³)
        }
    }
    
    engine.add_material(
        model_file,
        name=wall_material["name"],
        material_type="structure",
        model=wall_material["model"],
        parameters=wall_material["parameters"],
        group_id=wall_material["group_id"]
    )
    
    # 设置边界条件
    # 底部固定
    engine.add_boundary_condition(
        model_file,
        bc_type="displacement",
        entities=["bottom"],
        values={"x": 0.0, "y": 0.0, "z": 0.0}
    )
    
    # 侧面水平方向固定
    engine.add_boundary_condition(
        model_file,
        bc_type="displacement",
        entities=["left", "right", "front", "back"],
        values={"x": 0.0, "y": 0.0}
    )
    
    # 设置初始应力(K0程序法)
    engine.set_initial_stress(
        model_file,
        method="k0",
        parameters={"k0": 0.5}
    )
    
    # 设置地下水位
    engine.set_water_level(model_file, -5.0)
    
    print(f"计算模型已设置: {model_file}")
    print(f"添加了 {len(soil_materials) + 1} 种材料")
    
    return model_file, engine

def analyze_excavation_stages(model_file, engine):
    """模拟分阶段开挖过程"""
    print("\n" + "=" * 40)
    print("分阶段开挖分析")
    print("=" * 40)
    
    # 定义开挖阶段
    excavation_stages = [
        {"name": "初始平衡阶段", "depth": 0.0, "description": "初始地应力平衡"},
        {"name": "第一层开挖", "depth": 5.0, "description": "第一层开挖到-5m，安装第一道支撑"},
        {"name": "第二层开挖", "depth": 10.0, "description": "第二层开挖到-10m，安装第二道支撑"}, 
        {"name": "第三层开挖", "depth": 15.0, "description": "第三层开挖到-15m，安装第三道支撑"},
        {"name": "最终开挖", "depth": 20.0, "description": "最终开挖到-20m，基坑见底"}
    ]
    
    # 设置分析参数
    analysis_params = {
        "analysis_type": "static",
        "solver_type": "newton_raphson",
        "max_iterations": 50,
        "tolerance": 1e-5,
        "output_frequency": 1
    }
    
    # 设置计算参数
    engine.set_analysis_parameters(model_file, analysis_params)
    
    # 添加开挖阶段
    for i, stage in enumerate(excavation_stages):
        print(f"\n添加阶段 {i}: {stage['name']} - {stage['description']}")
        
        if i == 0:
            # 初始平衡阶段
            engine.add_stage(
                model_file,
                name=stage["name"],
                stage_type="initial",
                parameters={"reset_displacements": True}
            )
        else:
            # 开挖阶段
            engine.add_excavation_stage(
                model_file,
                name=stage["name"],
                depth=stage["depth"],
                water_level=-5.0,  # 保持水位不变
                parameters={"reset_displacements": False}
            )
        
        print(f"  - 开挖深度: {stage['depth']} m")
    
    # 运行分析
    print("\n开始运行分析...")
    task_id = engine.run_analysis(model_file)
    
    # 等待分析完成
    max_wait = 300  # 最多等待300秒
    for i in range(max_wait):
        status = engine.get_status(task_id)
        progress = status.get("progress", 0)
        
        print(f"\r分析进度: {progress}%", end="")
        
        if status.get("status") == "completed":
            print("\n分析已完成!")
            break
        elif status.get("status") == "failed":
            print(f"\n分析失败: {status.get('error', '未知错误')}")
            return None
        
        time.sleep(1)
    
    print(f"分析结果ID: {task_id}")
    return task_id

def process_results(task_id, engine):
    """处理分析结果"""
    print("\n" + "=" * 40)
    print("处理分析结果")
    print("=" * 40)
    
    # 获取位移结果
    displacement_results = []
    wall_displacement_results = []
    
    # 获取各阶段结果
    num_stages = len(engine.get_stages(task_id))
    
    for stage in range(num_stages):
        # 获取整体位移结果
        displacement = engine.get_results(task_id, "displacement", stage=stage)
        displacement_results.append(displacement)
        
        # 获取墙体位移结果
        wall_displacement = engine.get_results(
            task_id, 
            "displacement", 
            stage=stage,
            entity_group="wall"
        )
        wall_displacement_results.append(wall_displacement)
        
        # 打印最大位移
        max_disp = np.max(displacement["magnitude"])
        max_wall_disp = np.max(wall_displacement["magnitude"])
        
        print(f"阶段 {stage} 最大位移: {max_disp:.2f} mm")
        print(f"阶段 {stage} 墙体最大位移: {max_wall_disp:.2f} mm")
    
    # 导出最终阶段结果为VTK格式
    result_file = "examples/case_results/excavation_results.vtk"
    engine.export_results(task_id, result_file, format="vtk", stage=-1)
    
    print(f"结果已导出到: {result_file}")
    
    # 绘制墙体位移随深度变化图
    plot_wall_displacement(wall_displacement_results)
    
    return displacement_results, wall_displacement_results

def plot_wall_displacement(wall_displacement_results):
    """绘制墙体位移随深度变化图"""
    plt.figure(figsize=(10, 8))
    
    # 每个阶段使用不同颜色
    colors = ['b', 'g', 'r', 'c', 'm']
    
    for i, result in enumerate(wall_displacement_results):
        if i == 0:
            continue  # 跳过初始阶段
            
        # 提取深度和水平位移
        depth = -result["coordinates"][:, 2]  # 转为正值表示深度
        x_displacement = result["x"] * 1000  # 转为mm
        
        # 按深度排序
        sort_idx = np.argsort(depth)
        depth = depth[sort_idx]
        x_displacement = x_displacement[sort_idx]
        
        # 绘制曲线
        plt.plot(x_displacement, depth, 
                 color=colors[i % len(colors)], 
                 linewidth=2, 
                 label=f"阶段 {i}")
    
    plt.grid(True)
    plt.xlabel("水平位移 (mm)")
    plt.ylabel("深度 (m)")
    plt.title("地下连续墙水平位移随深度变化")
    plt.legend()
    plt.gca().invert_yaxis()  # 反转Y轴，使深度增加向下
    
    # 保存图片
    plt.savefig("examples/case_results/wall_displacement.png", dpi=300)
    plt.close()
    
    print(f"墙体位移图已保存到: examples/case_results/wall_displacement.png")

def main():
    """主函数"""
    print("=" * 60)
    print("深基坑有限元结构分析示例")
    print("=" * 60)
    
    try:
        # 创建几何模型
        geo_file = create_excavation_geometry()
        
        # 生成网格
        mesh_file = generate_mesh(geo_file)
        
        # 设置计算模型
        model_file, engine = setup_compute_model(mesh_file)
        
        # 分阶段开挖分析
        task_id = analyze_excavation_stages(model_file, engine)
        
        if task_id:
            # 处理分析结果
            displacement_results, wall_displacement_results = process_results(task_id, engine)
            
            print("\n分析流程已成功完成!")
        else:
            print("\n分析未能完成，请检查错误信息。")
    
    except Exception as e:
        print(f"\n分析过程中出现错误: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
