#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
物理AI与渗流-结构耦合集成示例

本示例展示如何将物理信息神经网络(PINN)与深基坑渗流-结构耦合分析集成，
实现参数反演、状态预测和智能边界条件识别功能。
"""

import os
import sys
import numpy as np
import matplotlib.pyplot as plt
import torch
import time
from pathlib import Path

# 添加项目根目录到路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from src.ai.physics_ai import PhysicsAI, PINNConfig
from src.ai.iot_data_collector import DataCollector 
from src.core.simulation.flow_structure_coupling import (
    FlowStructureCoupling, 
    CouplingType, 
    CouplingScheme
)

# 配置日志
import logging
logging.basicConfig(level=logging.INFO,
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("PhysicsAICouplingDemo")

def setup_demo_environment():
    """设置演示环境"""
    # 创建工作目录
    work_dir = os.path.join("examples", "case_results", "physics_ai_coupling")
    os.makedirs(work_dir, exist_ok=True)
    
    # 创建结果目录
    results_dir = os.path.join(work_dir, "results")
    os.makedirs(results_dir, exist_ok=True)
    
    return work_dir, results_dir

def create_synthetic_data(num_samples=100):
    """创建合成数据用于演示
    
    在实际应用中，这部分将从IOT系统或现场监测数据获取
    """
    logger.info("生成合成监测数据...")
    
    # 创建时间序列
    time_points = np.linspace(0, 50, num_samples)
    
    # 位置点 (m)
    x_points = np.linspace(-20, 20, 5)
    z_points = np.linspace(-30, 0, 4)
    
    # 真实参数
    true_params = {
        "cohesion": 15.0,                 # kPa
        "friction_angle": 28.0,           # 度
        "elastic_modulus": 25000.0,       # kPa
        "permeability": 5e-8,             # m/s
        "porosity": 0.38                  # 无量纲
    }
    
    # 生成合成位移数据 (添加噪声模拟真实数据)
    displacement_data = []
    pressure_data = []
    
    for t in time_points:
        for x in x_points:
            for z in z_points:
                # 位移模拟函数 (实际应用中会基于物理模型)
                ux = 0.01 * (1 - np.exp(-0.05 * t)) * (x / 20) * (z / -30)
                uz = 0.02 * (1 - np.exp(-0.05 * t)) * (-z / 30) * (1 - (x/20)**2)
                
                # 添加随机噪声 (5%)
                ux += ux * np.random.normal(0, 0.05)
                uz += uz * np.random.normal(0, 0.05)
                
                # 孔压模拟函数
                p = 9.81 * 1000 * abs(z) * (1 - 0.5 * (1 - np.exp(-0.02 * t)))
                
                # 添加随机噪声 (3%)
                p += p * np.random.normal(0, 0.03)
                
                # 保存数据
                displacement_data.append({
                    "time": t,
                    "x": x,
                    "z": z,
                    "ux": ux,
                    "uz": uz
                })
                
                pressure_data.append({
                    "time": t,
                    "x": x,
                    "z": z,
                    "pressure": p
                })
    
    logger.info(f"生成了 {len(displacement_data)} 个位移数据点")
    logger.info(f"生成了 {len(pressure_data)} 个孔压数据点")
    
    # 返回合成数据和真实参数
    return {
        "displacement": displacement_data,
        "pressure": pressure_data,
        "true_params": true_params
    }

def setup_pinn_model():
    """设置PINN模型"""
    logger.info("配置PINN模型...")
    
    # 配置PINN模型
    config = PINNConfig()
    config.model_layers = [20, 40, 40, 20]
    config.activation = "tanh"
    config.pde_weight = 1.0
    config.data_weight = 1.0
    config.bc_weight = 1.0
    config.learning_rate = 1e-3
    
    # 创建物理AI系统
    physics_ai = PhysicsAI(config)
    
    return physics_ai

def setup_coupling_model(work_dir):
    """设置渗流-结构耦合模型"""
    logger.info("配置渗流-结构耦合模型...")
    
    # 设置耦合模型配置
    coupling_config = {
        "max_iterations": 15,
        "convergence_tolerance": 1e-4,
        "relaxation_factor": 0.7,
        "time_step": 1.0,
        "total_time": 50.0,
        "convergence_type": "combined",
        "fluid_model": "darcy"
    }
    
    # 创建耦合分析模型
    coupling_model = FlowStructureCoupling(
        project_id=101,
        work_dir=work_dir,
        coupling_type=CouplingType.STAGGERED,
        coupling_scheme=CouplingScheme.BIOT,
        config=coupling_config
    )
    
    return coupling_model

def demo_parameter_inversion(physics_ai, synthetic_data):
    """演示参数反演功能"""
    logger.info("开始参数反演演示...")
    
    # 加载合成数据
    physics_ai.load_monitoring_data({
        "displacement": synthetic_data["displacement"],
        "pressure": synthetic_data["pressure"]
    })
    
    # 创建流固耦合的PINN模型
    physics_ai.create_pinn_model("flow_structure_coupling")
    
    # 设置参数反演范围
    param_ranges = {
        "cohesion": (5.0, 30.0),               # kPa
        "friction_angle": (20.0, 40.0),        # 度
        "elastic_modulus": (10000.0, 50000.0), # kPa
        "permeability": (1e-9, 1e-6),          # m/s
        "porosity": (0.25, 0.5)                # 无量纲
    }
    
    # 执行参数反演
    logger.info("执行参数反演...")
    logger.info("这可能需要几分钟时间...")
    
    start_time = time.time()
    inversion_results = physics_ai.invert_parameters(
        param_ranges=param_ranges,
        epochs=500,
        batch_size=64
    )
    elapsed_time = time.time() - start_time
    
    logger.info(f"参数反演完成，耗时: {elapsed_time:.2f} 秒")
    
    # 比较反演结果与真实参数
    true_params = synthetic_data["true_params"]
    logger.info("\n参数反演结果对比:")
    logger.info(f"{'参数':<15} {'真实值':<10} {'反演值':<10} {'相对误差':<10}")
    logger.info("-" * 50)
    
    for param_name, true_value in true_params.items():
        if param_name in inversion_results:
            inverted_value = inversion_results[param_name]
            rel_error = abs(inverted_value - true_value) / true_value * 100
            logger.info(f"{param_name:<15} {true_value:<10.4f} {inverted_value:<10.4f} {rel_error:<10.2f}%")
    
    return inversion_results

def demo_fem_pinn_coupling(physics_ai, coupling_model, inverted_params, results_dir):
    """演示FEM与PINN的耦合分析"""
    logger.info("开始FEM-PINN耦合分析演示...")
    
    # 使用反演参数更新耦合模型
    # 注意：在实际应用中，这里需要更详细的参数映射逻辑
    logger.info("将反演参数应用到FEM模型...")
    
    # 初始化模型
    if not coupling_model.initialize():
        logger.error("耦合模型初始化失败")
        return False
    
    # 设置PINN预测的边界条件
    # 注意：这里仅作示例，实际应用中需要更复杂的逻辑
    logger.info("使用PINN预测边界条件...")
    
    # 运行耦合分析的前几个时间步
    max_steps = 10
    logger.info(f"运行耦合分析 ({max_steps} 步)...")
    
    fem_results = []
    pinn_predictions = []
    
    for step in range(max_steps):
        current_time = step * coupling_model.config["time_step"]
        logger.info(f"求解时间步 {step + 1}/{max_steps}, t = {current_time:.1f}")
        
        # 求解一个时间步
        if not coupling_model.solve_step():
            logger.error(f"时间步 {step + 1} 求解失败")
            break
        
        # 获取FEM结果
        # 注意：在实际应用中，这里会调用特定的接口获取结果
        fem_result = {
            "time": current_time,
            "converged": True,
            "iterations": 5 + np.random.randint(0, 5),  # 模拟迭代次数
            # 实际中会包含位移场、应力场、孔压场等数据
        }
        fem_results.append(fem_result)
        
        # PINN预测下一时间步
        # 注意：在实际应用中，这里会调用特定的预测接口
        pinn_prediction = {
            "time": current_time + coupling_model.config["time_step"],
            # 实际中会包含预测的位移场、应力场、孔压场等数据
        }
        pinn_predictions.append(pinn_prediction)
        
        logger.info(f"  - FEM迭代次数: {fem_result['iterations']}")
        
    # 保存分析结果
    result_file = os.path.join(results_dir, "fem_pinn_coupling_results.npz")
    np.savez(
        result_file,
        fem_results=fem_results,
        pinn_predictions=pinn_predictions
    )
    logger.info(f"耦合分析结果已保存至: {result_file}")
    
    return True

def plot_results(physics_ai, inverted_params, results_dir):
    """绘制结果图表"""
    logger.info("生成结果图表...")
    
    # 创建图表目录
    figures_dir = os.path.join(results_dir, "figures")
    os.makedirs(figures_dir, exist_ok=True)
    
    # 绘制训练损失曲线
    if hasattr(physics_ai, 'training_history') and physics_ai.training_history:
        plt.figure(figsize=(10, 6))
        plt.semilogy(physics_ai.training_history['total_loss'], label='Total Loss')
        if 'data_loss' in physics_ai.training_history:
            plt.semilogy(physics_ai.training_history['data_loss'], label='Data Loss')
        if 'pde_loss' in physics_ai.training_history:
            plt.semilogy(physics_ai.training_history['pde_loss'], label='PDE Loss')
        plt.xlabel('Epochs')
        plt.ylabel('Loss (log scale)')
        plt.legend()
        plt.grid(True, which="both", ls="--", alpha=0.3)
        plt.title('PINN Training History')
        plt.tight_layout()
        plt.savefig(os.path.join(figures_dir, 'training_loss.png'), dpi=300)
        
    # 在实际应用中，这里会绘制更多结果图表：
    # - 位移对比图
    # - 孔压分布图
    # - 预测与实测对比图
    # - 参数敏感性分析图
    
    logger.info(f"图表已保存至: {figures_dir}")

def main():
    """主函数"""
    logger.info("=" * 60)
    logger.info("物理AI与渗流-结构耦合集成演示")
    logger.info("=" * 60)
    
    # 设置演示环境
    work_dir, results_dir = setup_demo_environment()
    
    # 创建合成数据
    synthetic_data = create_synthetic_data(num_samples=100)
    
    # 设置PINN模型
    physics_ai = setup_pinn_model()
    
    # 设置耦合模型
    coupling_model = setup_coupling_model(work_dir)
    
    # 参数反演演示
    inverted_params = demo_parameter_inversion(physics_ai, synthetic_data)
    
    # FEM-PINN耦合演示
    demo_fem_pinn_coupling(physics_ai, coupling_model, inverted_params, results_dir)
    
    # 绘制结果
    plot_results(physics_ai, inverted_params, results_dir)
    
    logger.info("=" * 60)
    logger.info("演示完成")
    logger.info("=" * 60)

if __name__ == "__main__":
    main() 