#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
FEM-PINN双向数据交换演示

该示例演示了有限元方法(FEM)和物理信息神经网络(PINN)之间的双向数据交换功能，
包括数据映射、实时交换和误差计算。

作者: Deep Excavation Team
版本: 1.0.0
"""

import os
import sys
import numpy as np
import matplotlib.pyplot as plt
import time
import logging
from pathlib import Path
import h5py
from typing import Dict, Any

# 添加项目根目录到路径
ROOT_DIR = str(Path(__file__).resolve().parent.parent.parent)
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

# 导入FEM-PINN耦合接口
from src.ai.fem_pinn_coupling import FEMPINNCoupling, create_coupling_interface

# 设置日志
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("FEMPINNExchangeDemo")

def setup_output_dir() -> str:
    """设置输出目录"""
    output_dir = os.path.join(ROOT_DIR, "results", "fem_pinn_exchange_demo")
    os.makedirs(output_dir, exist_ok=True)
    return output_dir

def generate_simple_fem_mesh() -> Dict[str, Any]:
    """生成简单的FEM网格数据，用于演示
    
    返回:
        网格数据字典
    """
    logger.info("生成简单FEM网格数据...")
    
    # 创建一个简单的2D网格
    nx, ny = 20, 20
    x = np.linspace(0, 10, nx)
    y = np.linspace(0, 10, ny)
    
    # 生成节点坐标
    nodes = []
    for j in range(ny):
        for i in range(nx):
            nodes.append([x[i], y[j], 0.0])
    nodes = np.array(nodes)
    
    # 生成四边形单元
    elements = []
    for j in range(ny-1):
        for i in range(nx-1):
            # 单元节点索引 (逆时针)
            n1 = j * nx + i
            n2 = j * nx + i + 1
            n3 = (j+1) * nx + i + 1
            n4 = (j+1) * nx + i
            elements.append([n1, n2, n3, n4])
    elements = np.array(elements)
    
    # 创建示例FEM结果数据
    num_nodes = len(nodes)
    
    # 位移场 (x方向, y方向, z方向)
    displacements = np.zeros((num_nodes, 3))
    for i in range(num_nodes):
        x, y = nodes[i, 0], nodes[i, 1]
        # 简单位移模型：中心下沉
        r = np.sqrt((x-5)**2 + (y-5)**2)
        mag = 0.1 * np.exp(-0.1*r**2)
        displacements[i, 2] = -mag  # z方向位移
    
    # 孔隙水压力场
    pore_pressures = np.zeros(num_nodes)
    for i in range(num_nodes):
        x, y = nodes[i, 0], nodes[i, 1]
        # 简单水压模型：线性分布
        pore_pressures[i] = 100 * (10 - y) / 10  # 从底部(100)到顶部(0)
    
    # 打包数据
    mesh_data = {
        "nodes": nodes,
        "elements": elements,
        "displacements": displacements,
        "pore_pressures": pore_pressures
    }
    
    logger.info(f"生成了简单FEM网格，节点数: {num_nodes}, 单元数: {len(elements)}")
    return mesh_data

def generate_simple_pinn_domain() -> Dict[str, Any]:
    """生成简单的PINN计算域数据，用于演示
    
    返回:
        PINN域数据字典
    """
    logger.info("生成简单PINN计算域数据...")
    
    # 创建一个规则的点云，覆盖相同区域但分辨率不同
    nx, ny = 30, 30  # 不同于FEM网格的分辨率
    x = np.linspace(0, 10, nx)
    y = np.linspace(0, 10, ny)
    
    # 生成点坐标
    points = []
    for j in range(ny):
        for i in range(nx):
            points.append([x[i], y[j], 0.0])
    points = np.array(points)
    
    # 创建边界条件信息
    boundary_points = []
    boundary_values = []
    
    # 边界点（简化为四个边）
    for i in range(nx):
        boundary_points.append([x[i], 0.0, 0.0])  # 底边
        boundary_points.append([x[i], 10.0, 0.0])  # 顶边
    
    for j in range(ny):
        boundary_points.append([0.0, y[j], 0.0])  # 左边
        boundary_points.append([10.0, y[j], 0.0])  # 右边
    
    boundary_points = np.array(boundary_points)
    
    # 边界值（示例：位移边界条件）
    boundary_values = np.zeros((len(boundary_points), 3))
    
    # 打包数据
    domain_data = {
        "points": points,
        "boundary_points": boundary_points,
        "boundary_values": boundary_values,
        "domain_bounds": {"x": (0, 10), "y": (0, 10), "z": (0, 0)}
    }
    
    logger.info(f"生成了简单PINN计算域，点数: {len(points)}, 边界点数: {len(boundary_points)}")
    return domain_data

def save_mesh_data(mesh_data: Dict[str, Any], output_dir: str) -> str:
    """保存网格数据到HDF5文件
    
    参数:
        mesh_data: 网格数据字典
        output_dir: 输出目录
        
    返回:
        保存的文件路径
    """
    file_path = os.path.join(output_dir, "simple_fem_mesh.h5")
    
    with h5py.File(file_path, 'w') as f:
        for key, value in mesh_data.items():
            f.create_dataset(key, data=value)
    
    logger.info(f"网格数据已保存到: {file_path}")
    return file_path

def run_fem_pinn_exchange(mesh_data: Dict[str, Any], 
                          domain_data: Dict[str, Any],
                          output_dir: str) -> Dict[str, Any]:
    """运行FEM-PINN数据交换
    
    参数:
        mesh_data: FEM网格数据
        domain_data: PINN域数据
        output_dir: 输出目录
        
    返回:
        交换结果
    """
    logger.info("开始FEM-PINN数据交换...")
    
    # 创建FEM-PINN耦合接口
    project_id = 1001  # 示例项目ID
    interface = create_coupling_interface(
        project_id=project_id,
        data_dir=os.path.join(output_dir, "exchange_data"),
        config={"mapping_method": "interpolation", "tolerance": 1e-6},
        enable_realtime=False  # 示例中使用非实时模式
    )
    
    # 准备域信息
    domain_bounds = domain_data["domain_bounds"]
    
    # 设置PINN计算域
    interface.setup_pinn_domain(
        domain_bounds=domain_bounds,
        resolution=[30, 30, 1]  # 与生成的PINN域匹配
    )
    
    # 保存并加载网格文件
    mesh_file = save_mesh_data(mesh_data, output_dir)
    
    # 加载FEM网格
    interface.load_fem_mesh(mesh_file)
    
    # 计算映射矩阵
    interface.compute_mapping_matrices()
    
    # 准备FEM结果数据
    fem_results = {
        "displacements": mesh_data["displacements"],
        "pore_pressures": mesh_data["pore_pressures"]
    }
    
    # FEM到PINN的数据映射
    logger.info("执行FEM到PINN的数据映射...")
    pinn_results = interface.fem_to_pinn(
        fem_results=fem_results,
        variables=["displacements", "pore_pressures"]
    )
    
    # 保存交换数据
    exchange_file = interface.save_exchange_data(
        data=pinn_results,
        data_type="pinn_results",
        prefix="fem_to_pinn"
    )
    logger.info(f"FEM到PINN的数据已保存到: {exchange_file}")
    
    # 修改PINN结果，模拟PINN计算过程
    logger.info("模拟PINN计算过程...")
    modified_pinn_results = {}
    for key, value in pinn_results.items():
        if key == "displacements":
            # 添加一些修改，模拟PINN计算结果
            modified = value.copy()
            modified[:, 2] = modified[:, 2] * 1.05  # 稍微增加z方向位移
            modified_pinn_results[key] = modified
        elif key == "pore_pressures":
            # 添加一些修改，模拟PINN计算结果
            modified = value.copy() * 0.95  # 稍微减少孔隙水压力
            modified_pinn_results[key] = modified
    
    # PINN到FEM的数据映射
    logger.info("执行PINN到FEM的数据映射...")
    fem_updated_results = interface.pinn_to_fem(
        pinn_results=modified_pinn_results,
        variables=["displacements", "pore_pressures"]
    )
    
    # 保存交换数据
    exchange_file = interface.save_exchange_data(
        data=fem_updated_results,
        data_type="fem_results",
        prefix="pinn_to_fem"
    )
    logger.info(f"PINN到FEM的数据已保存到: {exchange_file}")
    
    # 计算误差指标
    logger.info("计算误差指标...")
    error_metrics = interface.calculate_error_metrics(
        fem_data=fem_results,
        pinn_data=fem_updated_results,
        variables=["displacements", "pore_pressures"]
    )
    
    # 生成细化建议
    refinement_suggestions = interface.generate_refinement_suggestions(
        error_metrics=error_metrics,
        threshold=0.05,
        max_suggestions=3
    )
    
    # 获取最终状态
    status = interface.get_status()
    
    # 打包结果
    results = {
        "pinn_results": pinn_results,
        "fem_updated_results": fem_updated_results,
        "error_metrics": error_metrics,
        "refinement_suggestions": refinement_suggestions,
        "status": status
    }
    
    logger.info("FEM-PINN数据交换完成")
    return results

def plot_exchange_results(mesh_data: Dict[str, Any], 
                         exchange_results: Dict[str, Any],
                         output_dir: str) -> None:
    """绘制交换结果
    
    参数:
        mesh_data: 原始网格数据
        exchange_results: 交换结果
        output_dir: 输出目录
    """
    logger.info("绘制交换结果...")
    
    # 提取数据
    nodes = mesh_data["nodes"]
    original_displacements = mesh_data["displacements"]
    updated_displacements = exchange_results["fem_updated_results"]["displacements"]
    
    original_pore_pressures = mesh_data["pore_pressures"]
    updated_pore_pressures = exchange_results["fem_updated_results"]["pore_pressures"]
    
    error_metrics = exchange_results["error_metrics"]
    
    # 创建图表
    fig = plt.figure(figsize=(15, 10))
    
    # 位移对比图
    ax1 = fig.add_subplot(221)
    sc1 = ax1.scatter(nodes[:, 0], nodes[:, 1], c=original_displacements[:, 2], 
                     cmap='viridis', s=10, vmin=np.min(original_displacements[:, 2]), 
                     vmax=np.max(original_displacements[:, 2]))
    plt.colorbar(sc1, ax=ax1)
    ax1.set_title('原始FEM位移 (Z方向)')
    ax1.set_xlabel('X')
    ax1.set_ylabel('Y')
    
    ax2 = fig.add_subplot(222)
    sc2 = ax2.scatter(nodes[:, 0], nodes[:, 1], c=updated_displacements[:, 2], 
                     cmap='viridis', s=10, vmin=np.min(original_displacements[:, 2]), 
                     vmax=np.max(original_displacements[:, 2]))
    plt.colorbar(sc2, ax=ax2)
    ax2.set_title('PINN更新后的位移 (Z方向)')
    ax2.set_xlabel('X')
    ax2.set_ylabel('Y')
    
    # 孔隙水压力对比图
    ax3 = fig.add_subplot(223)
    sc3 = ax3.scatter(nodes[:, 0], nodes[:, 1], c=original_pore_pressures, 
                     cmap='Blues', s=10, vmin=np.min(original_pore_pressures), 
                     vmax=np.max(original_pore_pressures))
    plt.colorbar(sc3, ax=ax3)
    ax3.set_title('原始FEM孔隙水压力')
    ax3.set_xlabel('X')
    ax3.set_ylabel('Y')
    
    ax4 = fig.add_subplot(224)
    sc4 = ax4.scatter(nodes[:, 0], nodes[:, 1], c=updated_pore_pressures, 
                     cmap='Blues', s=10, vmin=np.min(original_pore_pressures), 
                     vmax=np.max(original_pore_pressures))
    plt.colorbar(sc4, ax=ax4)
    ax4.set_title('PINN更新后的孔隙水压力')
    ax4.set_xlabel('X')
    ax4.set_ylabel('Y')
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'fem_pinn_exchange_results.png'), dpi=300)
    
    # 误差直方图
    plt.figure(figsize=(12, 6))
    
    # 提取误差指标
    variables = list(error_metrics.keys())
    metrics = ['rmse', 'max_error', 'mean_error']
    
    bar_width = 0.25
    index = np.arange(len(variables))
    
    for i, metric in enumerate(metrics):
        values = [error_metrics[var][metric] for var in variables]
        plt.bar(index + i*bar_width, values, bar_width, 
                label=metric.replace('_', ' ').title())
    
    plt.xlabel('变量')
    plt.ylabel('误差')
    plt.title('FEM-PINN数据交换误差指标')
    plt.xticks(index + bar_width, variables)
    plt.legend()
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'exchange_error_metrics.png'), dpi=300)
    plt.close()
    
    logger.info(f"交换结果图表已保存到: {output_dir}")

def plot_refinement_suggestions(mesh_data: Dict[str, Any],
                              refinement_suggestions: list,
                              output_dir: str) -> None:
    """绘制网格细化建议
    
    参数:
        mesh_data: 网格数据
        refinement_suggestions: 细化建议列表
        output_dir: 输出目录
    """
    if not refinement_suggestions:
        logger.info("没有网格细化建议")
        return
    
    logger.info("绘制网格细化建议...")
    
    nodes = mesh_data["nodes"]
    elements = mesh_data["elements"]
    
    # 创建节点到细化建议的映射
    node_suggestions = np.zeros(len(nodes))
    
    # 标记建议细化的元素
    for suggestion in refinement_suggestions:
        element_id = suggestion["element_id"]
        error_value = suggestion["error_value"]
        node_indices = elements[element_id]
        for idx in node_indices:
            node_suggestions[idx] = max(node_suggestions[idx], error_value)
    
    # 绘制细化建议
    plt.figure(figsize=(10, 8))
    sc = plt.scatter(nodes[:, 0], nodes[:, 1], c=node_suggestions, 
                    cmap='hot', s=15, alpha=0.7)
    plt.colorbar(sc, label='细化优先级')
    
    # 标记建议细化的元素
    for suggestion in refinement_suggestions:
        element_id = suggestion["element_id"]
        element_nodes = elements[element_id]
        x = [nodes[idx, 0] for idx in element_nodes]
        y = [nodes[idx, 1] for idx in element_nodes]
        x.append(x[0])  # 闭合多边形
        y.append(y[0])
        plt.plot(x, y, 'k-', linewidth=1.5)
    
    plt.title('自适应网格细化建议')
    plt.xlabel('X')
    plt.ylabel('Y')
    plt.grid(True, linestyle='--', alpha=0.5)
    
    plt.savefig(os.path.join(output_dir, 'refinement_suggestions.png'), dpi=300)
    plt.close()
    
    logger.info(f"网格细化建议图表已保存到: {output_dir}")

def main():
    """主函数"""
    start_time = time.time()
    logger.info("开始FEM-PINN交换演示...")
    
    # 设置输出目录
    output_dir = setup_output_dir()
    logger.info(f"输出目录: {output_dir}")
    
    # 生成示例数据
    mesh_data = generate_simple_fem_mesh()
    domain_data = generate_simple_pinn_domain()
    
    # 运行FEM-PINN交换
    exchange_results = run_fem_pinn_exchange(mesh_data, domain_data, output_dir)
    
    # 绘制结果
    plot_exchange_results(mesh_data, exchange_results, output_dir)
    plot_refinement_suggestions(mesh_data, exchange_results["refinement_suggestions"], output_dir)
    
    elapsed_time = time.time() - start_time
    logger.info(f"FEM-PINN交换演示完成，总耗时: {elapsed_time:.2f}秒")

if __name__ == "__main__":
    main() 