#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kratos结果分析器 - 快速分析FPN转换后的计算结果
"""

import os
import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib import cm
import json
from pathlib import Path

# 设置中文字体
plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei']
plt.rcParams['axes.unicode_minus'] = False

def read_vtk_file(vtk_path):
    """读取VTK文件并提取关键数据"""
    print(f"📖 读取VTK文件: {vtk_path}")
    
    nodes = []
    displacements = []
    stresses = []
    elements = []
    
    with open(vtk_path, 'r') as f:
        lines = f.readlines()
    
    # 解析VTK文件
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # 读取节点坐标
        if line.startswith('POINTS'):
            num_points = int(line.split()[1])
            print(f"   节点数量: {num_points}")
            i += 1
            for j in range(num_points):
                coords = list(map(float, lines[i].split()[:3]))
                nodes.append(coords)
                i += 1
            continue
            
        # 读取单元连接
        elif line.startswith('CELLS'):
            num_cells = int(line.split()[1])
            print(f"   单元数量: {num_cells}")
            i += 1
            for j in range(num_cells):
                cell_data = list(map(int, lines[i].split()))
                if len(cell_data) >= 5:  # 四面体单元
                    elements.append(cell_data[1:5])  # 跳过第一个数字（节点数）
                i += 1
            continue
            
        # 读取位移数据
        elif 'DISPLACEMENT' in line:
            print("   找到位移数据")
            i += 1
            for j in range(len(nodes)):
                if i < len(lines):
                    disp = list(map(float, lines[i].split()[:3]))
                    displacements.append(disp)
                    i += 1
            continue
            
        # 读取应力数据
        elif 'STRESS' in line or 'VON_MISES_STRESS' in line:
            print("   找到应力数据")
            i += 1
            for j in range(len(nodes)):
                if i < len(lines):
                    stress_val = float(lines[i].split()[0])
                    stresses.append(stress_val)
                    i += 1
            continue
            
        i += 1
    
    return {
        'nodes': np.array(nodes),
        'displacements': np.array(displacements) if displacements else None,
        'stresses': np.array(stresses) if stresses else None,
        'elements': np.array(elements) if elements else None
    }

def analyze_results(data):
    """分析计算结果"""
    print("\n🔍 分析计算结果...")
    
    results = {
        'node_count': len(data['nodes']),
        'model_bounds': {
            'x_range': [float(data['nodes'][:, 0].min()), float(data['nodes'][:, 0].max())],
            'y_range': [float(data['nodes'][:, 1].min()), float(data['nodes'][:, 1].max())],
            'z_range': [float(data['nodes'][:, 2].min()), float(data['nodes'][:, 2].max())]
        }
    }
    
    # 分析位移
    if data['displacements'] is not None:
        disp_magnitude = np.sqrt(np.sum(data['displacements']**2, axis=1))
        results['displacement'] = {
            'max_magnitude': float(disp_magnitude.max()),
            'mean_magnitude': float(disp_magnitude.mean()),
            'max_x': float(data['displacements'][:, 0].max()),
            'max_y': float(data['displacements'][:, 1].max()),
            'max_z': float(data['displacements'][:, 2].max()),
            'min_x': float(data['displacements'][:, 0].min()),
            'min_y': float(data['displacements'][:, 1].min()),
            'min_z': float(data['displacements'][:, 2].min())
        }
        print(f"   最大位移: {results['displacement']['max_magnitude']:.6f} m")
        print(f"   平均位移: {results['displacement']['mean_magnitude']:.6f} m")
    
    # 分析应力
    if data['stresses'] is not None:
        results['stress'] = {
            'max_stress': float(data['stresses'].max()),
            'min_stress': float(data['stresses'].min()),
            'mean_stress': float(data['stresses'].mean()),
            'std_stress': float(data['stresses'].std())
        }
        print(f"   最大应力: {results['stress']['max_stress']:.2f} Pa")
        print(f"   最小应力: {results['stress']['min_stress']:.2f} Pa")
        print(f"   平均应力: {results['stress']['mean_stress']:.2f} Pa")
    
    return results

def create_visualizations(data, results, output_dir):
    """创建可视化图表"""
    print("\n📊 生成可视化图表...")
    
    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. 模型几何图
    fig = plt.figure(figsize=(15, 10))
    
    # 3D散点图显示节点
    ax1 = fig.add_subplot(221, projection='3d')
    nodes = data['nodes']
    ax1.scatter(nodes[:, 0], nodes[:, 1], nodes[:, 2], 
               c=nodes[:, 2], cmap='terrain', s=0.1, alpha=0.6)
    ax1.set_title('模型几何 - 节点分布')
    ax1.set_xlabel('X (m)')
    ax1.set_ylabel('Y (m)')
    ax1.set_zlabel('Z (m)')
    
    # 2. 位移分析
    if data['displacements'] is not None:
        ax2 = fig.add_subplot(222, projection='3d')
        disp_mag = np.sqrt(np.sum(data['displacements']**2, axis=1))
        scatter = ax2.scatter(nodes[:, 0], nodes[:, 1], nodes[:, 2], 
                             c=disp_mag, cmap='jet', s=0.5)
        ax2.set_title('位移分布 (总位移)')
        ax2.set_xlabel('X (m)')
        ax2.set_ylabel('Y (m)')
        ax2.set_zlabel('Z (m)')
        plt.colorbar(scatter, ax=ax2, shrink=0.5, label='位移 (m)')
        
        # 位移直方图
        ax3 = fig.add_subplot(223)
        ax3.hist(disp_mag, bins=50, alpha=0.7, color='blue')
        ax3.set_title('位移分布直方图')
        ax3.set_xlabel('位移大小 (m)')
        ax3.set_ylabel('节点数量')
        ax3.grid(True, alpha=0.3)
    
    # 3. 应力分析
    if data['stresses'] is not None:
        ax4 = fig.add_subplot(224, projection='3d')
        scatter = ax4.scatter(nodes[:, 0], nodes[:, 1], nodes[:, 2], 
                             c=data['stresses'], cmap='coolwarm', s=0.5)
        ax4.set_title('应力分布')
        ax4.set_xlabel('X (m)')
        ax4.set_ylabel('Y (m)')
        ax4.set_zlabel('Z (m)')
        plt.colorbar(scatter, ax=ax4, shrink=0.5, label='应力 (Pa)')
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'kratos_results_analysis.png'), 
                dpi=300, bbox_inches='tight')
    print(f"   保存图表: {output_dir}/kratos_results_analysis.png")
    
    # 创建详细的位移分析图
    if data['displacements'] is not None:
        fig2, axes = plt.subplots(2, 2, figsize=(15, 10))
        
        # X方向位移
        axes[0,0].hist(data['displacements'][:, 0], bins=50, alpha=0.7, color='red')
        axes[0,0].set_title('X方向位移分布')
        axes[0,0].set_xlabel('X位移 (m)')
        axes[0,0].set_ylabel('节点数量')
        axes[0,0].grid(True, alpha=0.3)
        
        # Y方向位移
        axes[0,1].hist(data['displacements'][:, 1], bins=50, alpha=0.7, color='green')
        axes[0,1].set_title('Y方向位移分布')
        axes[0,1].set_xlabel('Y位移 (m)')
        axes[0,1].set_ylabel('节点数量')
        axes[0,1].grid(True, alpha=0.3)
        
        # Z方向位移
        axes[1,0].hist(data['displacements'][:, 2], bins=50, alpha=0.7, color='blue')
        axes[1,0].set_title('Z方向位移分布')
        axes[1,0].set_xlabel('Z位移 (m)')
        axes[1,0].set_ylabel('节点数量')
        axes[1,0].grid(True, alpha=0.3)
        
        # 位移大小分布
        disp_mag = np.sqrt(np.sum(data['displacements']**2, axis=1))
        axes[1,1].hist(disp_mag, bins=50, alpha=0.7, color='purple')
        axes[1,1].set_title('总位移大小分布')
        axes[1,1].set_xlabel('位移大小 (m)')
        axes[1,1].set_ylabel('节点数量')
        axes[1,1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.savefig(os.path.join(output_dir, 'displacement_detailed_analysis.png'), 
                    dpi=300, bbox_inches='tight')
        print(f"   保存位移分析图: {output_dir}/displacement_detailed_analysis.png")

def main():
    """主函数"""
    print("🚀 Kratos结果分析器启动...")
    
    # 查找VTK文件
    vtk_dir = "VTK_Output"
    if not os.path.exists(vtk_dir):
        print(f"❌ 未找到VTK输出目录: {vtk_dir}")
        return
    
    vtk_files = [f for f in os.listdir(vtk_dir) if f.endswith('.vtk')]
    if not vtk_files:
        print(f"❌ 在 {vtk_dir} 中未找到VTK文件")
        return
    
    # 分析最新的VTK文件
    vtk_file = os.path.join(vtk_dir, vtk_files[0])
    print(f"📁 分析文件: {vtk_file}")
    
    # 读取和分析数据
    data = read_vtk_file(vtk_file)
    results = analyze_results(data)
    
    # 创建输出目录
    output_dir = "kratos_analysis_results"
    
    # 生成可视化
    create_visualizations(data, results, output_dir)
    
    # 保存分析结果
    results_file = os.path.join(output_dir, 'analysis_results.json')
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"   保存分析结果: {results_file}")
    
    # 生成报告
    report_file = os.path.join(output_dir, 'analysis_report.txt')
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write("=== Kratos FPN分析结果报告 ===\n\n")
        f.write(f"模型规模:\n")
        f.write(f"  - 节点数量: {results['node_count']:,}\n")
        f.write(f"  - 模型范围: X[{results['model_bounds']['x_range'][0]:.2f}, {results['model_bounds']['x_range'][1]:.2f}] m\n")
        f.write(f"             Y[{results['model_bounds']['y_range'][0]:.2f}, {results['model_bounds']['y_range'][1]:.2f}] m\n")
        f.write(f"             Z[{results['model_bounds']['z_range'][0]:.2f}, {results['model_bounds']['z_range'][1]:.2f}] m\n\n")
        
        if 'displacement' in results:
            f.write(f"位移分析:\n")
            f.write(f"  - 最大位移: {results['displacement']['max_magnitude']:.6f} m\n")
            f.write(f"  - 平均位移: {results['displacement']['mean_magnitude']:.6f} m\n")
            f.write(f"  - X方向: [{results['displacement']['min_x']:.6f}, {results['displacement']['max_x']:.6f}] m\n")
            f.write(f"  - Y方向: [{results['displacement']['min_y']:.6f}, {results['displacement']['max_y']:.6f}] m\n")
            f.write(f"  - Z方向: [{results['displacement']['min_z']:.6f}, {results['displacement']['max_z']:.6f}] m\n\n")
        
        if 'stress' in results:
            f.write(f"应力分析:\n")
            f.write(f"  - 最大应力: {results['stress']['max_stress']:.2f} Pa\n")
            f.write(f"  - 最小应力: {results['stress']['min_stress']:.2f} Pa\n")
            f.write(f"  - 平均应力: {results['stress']['mean_stress']:.2f} Pa\n")
            f.write(f"  - 应力标准差: {results['stress']['std_stress']:.2f} Pa\n")
    
    print(f"   保存分析报告: {report_file}")
    
    print(f"\n🎉 分析完成！结果保存在: {output_dir}/")
    print(f"📊 查看图表: {output_dir}/kratos_results_analysis.png")
    print(f"📋 查看报告: {output_dir}/analysis_report.txt")

if __name__ == "__main__":
    main()
