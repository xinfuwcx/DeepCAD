#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
参数敏感性分析和不确定性量化演示

该示例演示了使用参数敏感性分析器和不确定性量化器进行深基坑分析
中的参数重要性评估和反演参数不确定性量化。

作者: Deep Excavation Team
版本: 1.0.0
"""

import os
import sys
import numpy as np
import matplotlib.pyplot as plt
import time
import logging
from typing import Dict, Any
from pathlib import Path

# 添加项目根目录到路径
ROOT_DIR = str(Path(__file__).resolve().parent.parent.parent)
if ROOT_DIR not in sys.path:
    sys.path.append(ROOT_DIR)

# 导入敏感性分析器和不确定性量化器
from src.ai.param_inverse.sensitivity_analyzer import SensitivityAnalyzer, analyze_sensitivity
from src.ai.param_inverse.uncertainty_quantifier import UncertaintyQuantifier, quantify_uncertainty

# 设置日志
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ParamUncertaintyDemo")

def setup_output_dir() -> str:
    """设置输出目录"""
    output_dir = os.path.join(ROOT_DIR, "results", "param_uncertainty_demo")
    os.makedirs(output_dir, exist_ok=True)
    return output_dir

def simplified_fem_model(params: Dict[str, float]) -> float:
    """简化的FEM模型，用于演示
    
    这是一个简化的模型，模拟土体变形计算，返回最大位移
    
    参数:
        params: 模型参数字典，包含:
            - 'E': 弹性模量 (kPa)
            - 'v': 泊松比
            - 'c': 黏聚力 (kPa)
            - 'phi': 内摩擦角 (度)
            - 'gamma': 重度 (kN/m³)
            
    返回:
        最大位移值 (mm)
    """
    # 提取参数
    E = params.get('E', 20000)         # 弹性模量 (kPa)
    v = params.get('v', 0.3)           # 泊松比
    c = params.get('c', 10)            # 黏聚力 (kPa)
    phi = params.get('phi', 30)        # 内摩擦角 (度)
    gamma = params.get('gamma', 19)    # 重度 (kN/m³)
    
    # 简化的计算模型
    # 这里使用一个简化公式来模拟FEM计算结果
    # 实际应用中，这里会调用真实的FEM求解器
    
    # 将phi从度转为弧度
    phi_rad = np.radians(phi)
    
    # 基本刚度影响因子
    stiffness_factor = E / (1 - v**2)
    
    # 强度影响因子
    strength_factor = c * np.cos(phi_rad) + gamma * 10 * np.sin(phi_rad)  # 假设深度10m
    
    # 模拟位移计算
    base_displacement = 100.0 / stiffness_factor * 1000  # 基础位移，转换为mm
    
    # 加入一些非线性影响和参数相互作用
    displacement = base_displacement * (1 + 0.5 * np.exp(-strength_factor/10))
    
    # 加入随机扰动以模拟计算不确定性
    noise = np.random.normal(0, displacement * 0.05)
    displacement = max(0, displacement + noise)
    
    return displacement

# 定义全局的损失函数，避免并行计算序列化问题
def loss_function(params: Dict[str, float]) -> float:
    """损失函数，用于不确定性量化
    
    计算模型预测值与目标值之间的平方差
    
    参数:
        params: 模型参数字典
        
    返回:
        损失值
    """
    # 模拟的"观测值"
    target_displacement = 25.0  # mm
    
    # 计算模型预测值
    predicted = simplified_fem_model(params)
    
    # 计算误差（平方差）
    loss = (predicted - target_displacement) ** 2
    return loss

def run_sensitivity_analysis(output_dir: str) -> Dict[str, Any]:
    """运行参数敏感性分析
    
    参数:
        output_dir: 输出目录
        
    返回:
        敏感性分析结果
    """
    logger.info("开始参数敏感性分析...")
    
    # 定义参数名称和范围
    param_names = ['E', 'v', 'c', 'phi', 'gamma']
    param_bounds = {
        'E': (10000, 50000),    # 弹性模量范围 (kPa)
        'v': (0.2, 0.4),        # 泊松比范围
        'c': (5, 30),           # 黏聚力范围 (kPa)
        'phi': (25, 40),        # 内摩擦角范围 (度)
        'gamma': (17, 21)       # 重度范围 (kN/m³)
    }
    
    # 使用包装函数进行分析
    results = analyze_sensitivity(
        param_names=param_names,
        param_bounds=param_bounds,
        model_fn=simplified_fem_model,
        method="basic",
        num_samples=500,
        parallel=True,
        plot=True,
        output_dir=output_dir
    )
    
    logger.info("参数敏感性分析完成")
    return results

def run_uncertainty_quantification(output_dir: str) -> Dict[str, Any]:
    """运行参数不确定性量化
    
    参数:
        output_dir: 输出目录
        
    返回:
        不确定性量化结果
    """
    logger.info("开始参数不确定性量化...")
    
    # 定义参数名称、最优值和范围
    param_names = ['E', 'v', 'c', 'phi', 'gamma']
    param_values = {
        'E': 25000,      # 弹性模量最优值 (kPa)
        'v': 0.3,        # 泊松比最优值
        'c': 15,         # 黏聚力最优值 (kPa)
        'phi': 32,       # 内摩擦角最优值 (度)
        'gamma': 19      # 重度最优值 (kN/m³)
    }
    param_bounds = {
        'E': (10000, 50000),    # 弹性模量范围 (kPa)
        'v': (0.2, 0.4),        # 泊松比范围
        'c': (5, 30),           # 黏聚力范围 (kPa)
        'phi': (25, 40),        # 内摩擦角范围 (度)
        'gamma': (17, 21)       # 重度范围 (kN/m³)
    }
    
    # 使用包装函数进行分析
    results = quantify_uncertainty(
        param_names=param_names,
        param_values=param_values,
        param_bounds=param_bounds,
        loss_fn=loss_function,  # 使用全局函数
        sampling_method="latin_hypercube",
        num_samples=1000,
        confidence_level=0.95,
        parallel=True,
        output_dir=output_dir
    )
    
    logger.info("参数不确定性量化完成")
    return results

def plot_combined_results(sensitivity_results: Dict[str, Any], 
                          uncertainty_results: Dict[str, Any],
                          output_dir: str) -> None:
    """绘制敏感性分析和不确定性量化的组合结果
    
    参数:
        sensitivity_results: 敏感性分析结果
        uncertainty_results: 不确定性量化结果
        output_dir: 输出目录
    """
    logger.info("生成组合结果可视化...")
    
    # 创建图表
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
    
    # 提取数据
    param_importance = sensitivity_results['parameter_importance']
    confidence_intervals = uncertainty_results['confidence_intervals']
    param_stats = uncertainty_results['parameter_statistics']
    
    # 定义参数范围 - 这里和run_uncertainty_quantification中保持一致
    param_bounds = {
        'E': (10000, 50000),    # 弹性模量范围 (kPa)
        'v': (0.2, 0.4),        # 泊松比范围
        'c': (5, 30),           # 黏聚力范围 (kPa)
        'phi': (25, 40),        # 内摩擦角范围 (度)
        'gamma': (17, 21)       # 重度范围 (kN/m³)
    }
    
    # 绘制敏感性分析结果
    params = list(param_importance.keys())
    importance_values = [param_importance[p] for p in params]
    
    ax1.bar(params, importance_values, color='royalblue')
    ax1.set_title('参数敏感性分析')
    ax1.set_xlabel('参数')
    ax1.set_ylabel('敏感度')
    ax1.set_ylim(0, max(importance_values) * 1.1)
    for i, v in enumerate(importance_values):
        ax1.text(i, v + 0.02, f'{v:.3f}', ha='center')
    
    # 绘制不确定性量化结果
    params = list(confidence_intervals.keys())
    means = [param_stats[p]['mean'] for p in params]
    lower_bounds = [confidence_intervals[p][0] for p in params]
    upper_bounds = [confidence_intervals[p][1] for p in params]
    
    # 计算误差棒
    yerr_lower = [means[i] - lower_bounds[i] for i in range(len(params))]
    yerr_upper = [upper_bounds[i] - means[i] for i in range(len(params))]
    yerr = [yerr_lower, yerr_upper]
    
    # 归一化显示
    normalized_means = []
    normalized_yerr = [[],[]]
    for i, param in enumerate(params):
        param_range = param_bounds[param][1] - param_bounds[param][0]
        normalized_mean = (means[i] - param_bounds[param][0]) / param_range
        normalized_means.append(normalized_mean)
        normalized_yerr[0].append(yerr[0][i] / param_range)
        normalized_yerr[1].append(yerr[1][i] / param_range)
    
    ax2.errorbar(params, normalized_means, yerr=normalized_yerr, fmt='o', capsize=5, color='forestgreen')
    ax2.set_title('参数不确定性分析 (95% 置信区间)')
    ax2.set_xlabel('参数')
    ax2.set_ylabel('归一化参数值')
    ax2.set_ylim(0, 1)
    ax2.grid(True, linestyle='--', alpha=0.7)
    
    # 添加标签，显示原始值
    for i, param in enumerate(params):
        ax2.text(i, normalized_means[i] + 0.05, 
                f'{means[i]:.2f}\n({lower_bounds[i]:.2f}-{upper_bounds[i]:.2f})', 
                ha='center', fontsize=8)
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'combined_analysis_results.png'), dpi=300)
    plt.close()
    
    logger.info(f"组合结果图表已保存到: {output_dir}")

def main():
    """主函数"""
    start_time = time.time()
    logger.info("开始参数分析演示...")
    
    # 设置输出目录
    output_dir = setup_output_dir()
    logger.info(f"输出目录: {output_dir}")
    
    # 运行参数敏感性分析
    sensitivity_results = run_sensitivity_analysis(output_dir)
    
    # 运行参数不确定性量化
    uncertainty_results = run_uncertainty_quantification(output_dir)
    
    # 绘制组合结果
    plot_combined_results(sensitivity_results, uncertainty_results, output_dir)
    
    elapsed_time = time.time() - start_time
    logger.info(f"参数分析演示完成，总耗时: {elapsed_time:.2f}秒")

if __name__ == "__main__":
    main() 