#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file visualize_results.py
@description 基坑开挖结果可视化
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import json
import argparse
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path
from mpl_toolkits.mplot3d import Axes3D

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 导入可视化模块
from src.core.visualization.result_processor import ResultProcessor
from src.core.visualization.three_renderer import ThreeRenderer

def plot_displacement_contour(result_file, output_file=None):
    """绘制位移云图"""
    # 加载结果数据
    processor = ResultProcessor(result_file)
    nodes, values = processor.get_displacement_data()
    
    # 提取坐标和位移值
    x = [node['x'] for node in nodes]
    y = [node['y'] for node in nodes]
    z = [node['z'] for node in nodes]
    disp = [value['magnitude'] for value in values]
    
    # 创建3D图
    fig = plt.figure(figsize=(12, 10))
    ax = fig.add_subplot(111, projection='3d')
    
    # 绘制散点图，颜色表示位移大小
    scatter = ax.scatter(x, y, z, c=disp, cmap='jet', s=10, alpha=0.7)
    
    # 添加颜色条
    cbar = plt.colorbar(scatter)
    cbar.set_label('位移 (m)')
    
    # 设置轴标签和标题
    ax.set_xlabel('X (m)')
    ax.set_ylabel('Y (m)')
    ax.set_zlabel('Z (m)')
    ax.set_title('基坑开挖位移云图')
    
    # 设置视角
    ax.view_init(elev=30, azim=45)
    
    # 保存或显示图像
    if output_file:
        plt.savefig(output_file, dpi=300, bbox_inches='tight')
        print(f"位移云图已保存至: {output_file}")
    else:
        plt.show()
    
    return fig

def plot_stress_contour(result_file, output_file=None):
    """绘制应力云图"""
    # 加载结果数据
    processor = ResultProcessor(result_file)
    nodes, values = processor.get_stress_data()
    
    # 提取坐标和应力值
    x = [node['x'] for node in nodes]
    y = [node['y'] for node in nodes]
    z = [node['z'] for node in nodes]
    stress = [value['von_mises'] for value in values]  # von Mises应力
    
    # 创建3D图
    fig = plt.figure(figsize=(12, 10))
    ax = fig.add_subplot(111, projection='3d')
    
    # 绘制散点图，颜色表示应力大小
    scatter = ax.scatter(x, y, z, c=stress, cmap='jet', s=10, alpha=0.7)
    
    # 添加颜色条
    cbar = plt.colorbar(scatter)
    cbar.set_label('von Mises应力 (Pa)')
    
    # 设置轴标签和标题
    ax.set_xlabel('X (m)')
    ax.set_ylabel('Y (m)')
    ax.set_zlabel('Z (m)')
    ax.set_title('基坑开挖应力云图')
    
    # 设置视角
    ax.view_init(elev=30, azim=45)
    
    # 保存或显示图像
    if output_file:
        plt.savefig(output_file, dpi=300, bbox_inches='tight')
        print(f"应力云图已保存至: {output_file}")
    else:
        plt.show()
    
    return fig

def plot_excavation_section(result_file, output_file=None):
    """绘制基坑开挖剖面图"""
    # 加载结果数据
    processor = ResultProcessor(result_file)
    nodes, disp_values = processor.get_displacement_data()
    _, stress_values = processor.get_stress_data()
    
    # 提取Y=0剖面上的点
    y_section = []
    for i, node in enumerate(nodes):
        if abs(node['y']) < 0.1:  # 选择接近Y=0的点
            y_section.append({
                'x': node['x'],
                'z': node['z'],
                'disp': disp_values[i]['magnitude'],
                'stress': stress_values[i]['von_mises']
            })
    
    # 按X坐标排序
    y_section.sort(key=lambda p: p['x'])
    
    # 提取数据
    x = [p['x'] for p in y_section]
    z = [p['z'] for p in y_section]
    disp = [p['disp'] for p in y_section]
    stress = [p['stress'] for p in y_section]
    
    # 创建图形
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))
    
    # 绘制位移剖面
    scatter1 = ax1.scatter(x, z, c=disp, cmap='jet', s=20, alpha=0.8)
    ax1.set_xlabel('X (m)')
    ax1.set_ylabel('Z (m)')
    ax1.set_title('基坑开挖位移剖面图 (Y=0)')
    ax1.grid(True)
    cbar1 = plt.colorbar(scatter1, ax=ax1)
    cbar1.set_label('位移 (m)')
    
    # 绘制应力剖面
    scatter2 = ax2.scatter(x, z, c=stress, cmap='jet', s=20, alpha=0.8)
    ax2.set_xlabel('X (m)')
    ax2.set_ylabel('Z (m)')
    ax2.set_title('基坑开挖应力剖面图 (Y=0)')
    ax2.grid(True)
    cbar2 = plt.colorbar(scatter2, ax=ax2)
    cbar2.set_label('von Mises应力 (Pa)')
    
    # 绘制基坑轮廓
    # 基坑宽度15m，深度10m
    ax1.plot([-7.5, 7.5], [-10, -10], 'k-', linewidth=2)  # 基坑底部
    ax1.plot([-7.5, -7.5], [0, -10], 'k-', linewidth=2)   # 左侧壁
    ax1.plot([7.5, 7.5], [0, -10], 'k-', linewidth=2)     # 右侧壁
    
    ax2.plot([-7.5, 7.5], [-10, -10], 'k-', linewidth=2)  # 基坑底部
    ax2.plot([-7.5, -7.5], [0, -10], 'k-', linewidth=2)   # 左侧壁
    ax2.plot([7.5, 7.5], [0, -10], 'k-', linewidth=2)     # 右侧壁
    
    # 绘制地连墙
    # 地连墙厚度0.8m，深度12m
    ax1.plot([-7.9, -7.9], [0, -12], 'r-', linewidth=2)   # 左侧地连墙外侧
    ax1.plot([-7.1, -7.1], [0, -12], 'r-', linewidth=2)   # 左侧地连墙内侧
    ax1.plot([7.1, 7.1], [0, -12], 'r-', linewidth=2)     # 右侧地连墙内侧
    ax1.plot([7.9, 7.9], [0, -12], 'r-', linewidth=2)     # 右侧地连墙外侧
    
    ax2.plot([-7.9, -7.9], [0, -12], 'r-', linewidth=2)   # 左侧地连墙外侧
    ax2.plot([-7.1, -7.1], [0, -12], 'r-', linewidth=2)   # 左侧地连墙内侧
    ax2.plot([7.1, 7.1], [0, -12], 'r-', linewidth=2)     # 右侧地连墙内侧
    ax2.plot([7.9, 7.9], [0, -12], 'r-', linewidth=2)     # 右侧地连墙外侧
    
    # 调整布局
    plt.tight_layout()
    
    # 保存或显示图像
    if output_file:
        plt.savefig(output_file, dpi=300, bbox_inches='tight')
        print(f"剖面图已保存至: {output_file}")
    else:
        plt.show()
    
    return fig

def plot_displacement_time_history(result_file, output_file=None):
    """绘制位移时程曲线"""
    # 加载结果数据
    processor = ResultProcessor(result_file)
    time_history = processor.get_time_history_data()
    
    # 提取时间和位移数据
    times = time_history['times']
    disp_max = time_history['displacement_max']
    disp_avg = time_history['displacement_avg']
    
    # 创建图形
    fig, ax = plt.subplots(figsize=(10, 6))
    
    # 绘制最大位移和平均位移曲线
    ax.plot(times, disp_max, 'r-', linewidth=2, label='最大位移')
    ax.plot(times, disp_avg, 'b--', linewidth=2, label='平均位移')
    
    # 设置轴标签和标题
    ax.set_xlabel('时间步')
    ax.set_ylabel('位移 (m)')
    ax.set_title('基坑开挖位移时程曲线')
    ax.grid(True)
    ax.legend()
    
    # 保存或显示图像
    if output_file:
        plt.savefig(output_file, dpi=300, bbox_inches='tight')
        print(f"位移时程曲线已保存至: {output_file}")
    else:
        plt.show()
    
    return fig

def create_3d_visualization(mesh_file, result_file, output_file=None):
    """创建3D可视化"""
    # 初始化3D渲染器
    renderer = ThreeRenderer(mesh_file, result_file)
    
    # 设置场景
    renderer.setup_scene()
    
    # 添加位移场
    renderer.add_displacement_field()
    
    # 添加应力场
    renderer.add_stress_field()
    
    # 添加基坑轮廓
    renderer.add_excavation_outline(
        width=15.0,
        length=15.0,
        depth=10.0,
        wall_thickness=0.8,
        wall_depth=12.0
    )
    
    # 渲染场景
    if output_file:
        renderer.render_to_file(output_file)
        print(f"3D可视化已保存至: {output_file}")
    else:
        renderer.show()
    
    return renderer

def main():
    """主函数"""
    # 解析命令行参数
    parser = argparse.ArgumentParser(description='基坑开挖结果可视化')
    parser.add_argument('--result', type=str, required=True, help='结果文件路径')
    parser.add_argument('--mesh', type=str, help='网格文件路径')
    parser.add_argument('--output-dir', type=str, default='./examples/case_results/figures', help='输出目录')
    parser.add_argument('--type', type=str, choices=['displacement', 'stress', 'section', 'time-history', '3d', 'all'], 
                        default='all', help='可视化类型')
    args = parser.parse_args()
    
    # 创建输出目录
    os.makedirs(args.output_dir, exist_ok=True)
    
    # 检查结果文件
    if not os.path.exists(args.result):
        print(f"错误: 结果文件不存在: {args.result}")
        return 1
    
    # 根据类型生成可视化
    if args.type == 'displacement' or args.type == 'all':
        output_file = os.path.join(args.output_dir, 'displacement_contour.png')
        plot_displacement_contour(args.result, output_file)
    
    if args.type == 'stress' or args.type == 'all':
        output_file = os.path.join(args.output_dir, 'stress_contour.png')
        plot_stress_contour(args.result, output_file)
    
    if args.type == 'section' or args.type == 'all':
        output_file = os.path.join(args.output_dir, 'excavation_section.png')
        plot_excavation_section(args.result, output_file)
    
    if args.type == 'time-history' or args.type == 'all':
        output_file = os.path.join(args.output_dir, 'displacement_time_history.png')
        plot_displacement_time_history(args.result, output_file)
    
    if (args.type == '3d' or args.type == 'all') and args.mesh:
        output_file = os.path.join(args.output_dir, 'excavation_3d.html')
        create_3d_visualization(args.mesh, args.result, output_file)
    
    print("可视化完成")
    return 0

if __name__ == "__main__":
    sys.exit(main())


