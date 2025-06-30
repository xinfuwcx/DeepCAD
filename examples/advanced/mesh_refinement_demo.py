#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
自适应网格细化与FEM-PINN耦合示例

本示例展示了自适应网格细化和FEM-PINN双向数据交换的基本用法，
包括基于误差估计的网格优化和物理AI系统与CAE耦合计算。

作者: Deep Excavation Team
版本: 1.0.0
"""

import os
import sys
import numpy as np
import matplotlib.pyplot as plt
import time
from pathlib import Path

# 添加项目根目录到Python路径
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

# 导入自适应网格细化模块
from src.core.meshing.adaptive_mesh_refiner import (
    AdaptiveMeshRefiner, 
    RefinementCriterion,
    RefinementStrategy,
    MeshQuality
)

# 导入FEM-PINN耦合模块
from src.ai.fem_pinn_coupling import FEMPINNCoupling

# 设置项目ID
PROJECT_ID = 1001

# 简单的网格类，仅用于演示
class SimpleMesh:
    def __init__(self, n_elements=100, n_nodes=None):
        """初始化简单网格
        
        参数:
            n_elements: 单元数量
            n_nodes: 节点数量，如果为None则设置为(n_elements+1)*(n_elements+1)
        """
        if n_nodes is None:
            n_nodes = (n_elements + 1) * (n_elements + 1)
            
        self.n_elements = n_elements
        self.n_nodes = n_nodes
        
        # 创建伪单元和节点
        self.elements = [{'id': i, 'nodes': []} for i in range(n_elements)]
        self.nodes = [{'id': i, 'coords': np.random.rand(3)} for i in range(n_nodes)]
        
        # 为每个单元随机分配节点
        for element in self.elements:
            # 每个单元随机分配4个节点
            element['nodes'] = np.random.choice(n_nodes, size=4, replace=False).tolist()

# 简单的分析结果生成函数
def generate_dummy_results(mesh, timestep=0):
    """生成伪分析结果，仅用于演示
    
    参数:
        mesh: 网格对象
        timestep: 时间步
        
    返回:
        结果字典
    """
    # 创建伪位移结果
    displacements = np.zeros((mesh.n_nodes, 3))
    for i in range(mesh.n_nodes):
        # 生成随机位移，添加时间因子使结果随时间变化
        displacements[i] = np.sin(i * 0.01 + timestep * 0.1) * np.random.rand(3) * 0.01
    
    # 创建伪应力结果
    stresses = np.zeros((mesh.n_elements, 6))  # 6分量应力张量
    for i in range(mesh.n_elements):
        # 生成随机应力，添加时间因子
        stresses[i] = np.cos(i * 0.02 + timestep * 0.1) * np.random.rand(6) * 10.0
    
    # 创建伪孔隙水压力结果
    pore_pressures = np.zeros(mesh.n_nodes)
    for i in range(mesh.n_nodes):
        # 生成随机孔隙水压力，添加时间因子
        pore_pressures[i] = np.max([0, np.sin(i * 0.03 + timestep * 0.05)]) * 10.0
    
    return {
        'displacements': displacements,
        'stresses': stresses,
        'pore_pressures': pore_pressures,
        'timestep': timestep
    }

# 自定义误差估计函数
def custom_error_estimator(mesh, results):
    """自定义误差估计函数，基于应力梯度
    
    参数:
        mesh: 网格对象
        results: 分析结果
        
    返回:
        单元误差字典
    """
    if 'stresses' not in results:
        print("结果中不包含应力数据，使用随机误差")
        return {i: np.random.random() for i in range(len(mesh.elements))}
    
    # 获取应力结果
    stresses = results['stresses']
    
    # 计算误差指标
    errors = {}
    for i, element in enumerate(mesh.elements):
        # 在实际应用中，应基于相邻单元的应力差计算误差
        # 这里简化为应力的范数
        if i < len(stresses):
            errors[i] = np.linalg.norm(stresses[i])
    
    # 归一化误差
    max_error = max(errors.values()) if errors else 1.0
    for i in errors:
        errors[i] /= max_error
    
    return errors

# 示例1：自适应网格细化
def adaptive_refinement_example():
    """自适应网格细化示例"""
    print("\n=== 自适应网格细化示例 ===")
    
    # 创建简单网格
    mesh = SimpleMesh(n_elements=100)
    print(f"初始网格: {mesh.n_elements}个单元, {mesh.n_nodes}个节点")
    
    # 创建自适应网格细化器
    refiner = AdaptiveMeshRefiner(
        project_id=PROJECT_ID,
        config={
            "max_refinement_iterations": 3,
            "error_threshold": 0.3,
            "refinement_ratio": 0.2
        }
    )
    
    # 设置网格
    refiner.set_mesh(mesh)
    
    # 设置细化策略
    refiner.set_refinement_criterion(RefinementCriterion.ENERGY_ERROR)
    refiner.set_refinement_strategy(RefinementStrategy.ADAPTIVE)
    refiner.set_quality_metric(MeshQuality.COMBINED)
    
    # 添加目标区域
    refiner.add_targeted_region(region_id=1, refinement_level=2)
    
    # 设置自定义误差估计器
    refiner.set_error_estimator(custom_error_estimator)
    
    # 生成伪分析结果
    results = generate_dummy_results(mesh)
    
    # 定义误差回调函数
    def error_callback(mesh, iteration):
        """每次迭代后重新生成分析结果"""
        return generate_dummy_results(mesh, timestep=iteration)
    
    # 运行自适应细化
    success = refiner.run_adaptive_refinement(
        max_iterations=3,
        results=results,
        error_callback=error_callback
    )
    
    if success:
        print("自适应细化成功完成")
        
        # 获取统计信息
        stats = refiner.get_statistics()
        print(f"细化统计: 初始单元数={stats.get('initial_elements', 0)}, "
              f"最终单元数={stats.get('final_elements', 0)}, "
              f"增长率={stats.get('element_growth', 0):.2f}")
        
        # 保存细化历史
        refiner.save_refinement_history()
    else:
        print("自适应细化失败")
    
    return mesh, refiner

# 示例2：FEM-PINN双向数据交换
def fem_pinn_coupling_example(mesh):
    """FEM-PINN双向数据交换示例"""
    print("\n=== FEM-PINN双向数据交换示例 ===")
    
    # 创建FEM-PINN耦合接口
    coupling = FEMPINNCoupling(
        project_id=PROJECT_ID,
        config={
            "mapping_type": "interpolation",
            "exchange_variables": ["displacements", "pore_pressures"],
            "auto_update": True
        }
    )
    
    # 创建简单网格文件
    mesh_file = os.path.join(root_dir, "data", "mesh", "simple_box.vtk")
    os.makedirs(os.path.dirname(mesh_file), exist_ok=True)
    
    # 加载FEM网格
    success = coupling.load_fem_mesh(mesh_file)
    if not success:
        print(f"警告: 加载网格文件 {mesh_file} 失败，使用虚拟数据继续")
    
    # 设置PINN计算域
    domain_bounds = {
        'x': (0.0, 10.0),
        'y': (0.0, 10.0),
        'z': (-20.0, 0.0)
    }
    coupling.setup_pinn_domain(domain_bounds, resolution=[20, 20, 10])
    
    # 计算映射矩阵
    coupling.compute_mapping_matrices()
    
    # 生成FEM分析结果
    fem_results = generate_dummy_results(mesh)
    
    print(f"FEM结果: {', '.join(fem_results.keys())}")
    
    # 将FEM结果映射到PINN
    pinn_results = coupling.fem_to_pinn(fem_results, variables=['displacements', 'pore_pressures'])
    
    print(f"PINN结果: {', '.join(pinn_results.keys())}")
    print(f"PINN位移数据形状: {pinn_results.get('displacements', np.array([])).shape}")
    
    # 保存交换数据
    fem_file = coupling.save_exchange_data(fem_results, data_type='fem', prefix='example_fem')
    pinn_file = coupling.save_exchange_data(pinn_results, data_type='pinn', prefix='example_pinn')
    
    print(f"保存FEM数据: {fem_file}")
    print(f"保存PINN数据: {pinn_file}")
    
    # 修改PINN结果（模拟PINN计算）
    for key in pinn_results:
        if isinstance(pinn_results[key], np.ndarray):
            # 对数据进行简单修改，模拟PINN计算
            pinn_results[key] = pinn_results[key] * 1.2 + 0.01
    
    # 将PINN结果映射回FEM
    updated_fem_results = coupling.pinn_to_fem(pinn_results)
    
    print(f"更新的FEM结果: {', '.join(updated_fem_results.keys())}")
    
    # 参数交换示例
    fem_params = {
        'material': {
            'youngs_modulus': 20000.0,
            'poisson_ratio': 0.3,
            'cohesion': 10.0,
            'friction_angle': 30.0
        },
        'simulation': {
            'time_step': 0.1,
            'max_iterations': 100
        }
    }
    
    pinn_params = {
        'material': {
            'youngs_modulus': 22000.0,  # PINN反演的新值
            'permeability': 1e-5        # PINN新增参数
        },
        'training': {
            'learning_rate': 0.001,
            'batch_size': 64
        }
    }
    
    # 交换参数
    merged_params = coupling.exchange_parameters(fem_params, pinn_params)
    
    print("合并后的参数:")
    for key, value in merged_params.items():
        if isinstance(value, dict):
            print(f"  {key}:")
            for k, v in value.items():
                print(f"    {k}: {v}")
        else:
            print(f"  {key}: {value}")
    
    # 保存接口状态
    coupling.save_status()
    
    return coupling

# 主函数
def main():
    """主函数"""
    print("开始深基坑分析系统高级功能演示")
    
    # 运行自适应网格细化示例
    mesh, refiner = adaptive_refinement_example()
    
    # 运行FEM-PINN耦合示例
    coupling = fem_pinn_coupling_example(mesh)
    
    print("\n演示完成！")

if __name__ == "__main__":
    main() 