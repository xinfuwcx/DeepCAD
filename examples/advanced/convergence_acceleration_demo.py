#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
非线性收敛加速示例

该示例展示了不同的收敛加速策略在求解非线性问题中的效果。
包括固定松弛因子、动态松弛因子、Aitken加速、线搜索和Anderson加速。
"""

import os
import sys
import numpy as np
import time
import logging
import matplotlib.pyplot as plt
from pathlib import Path

# 添加项目根目录到Python路径
project_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_dir))

from src.core.simulation.flow_structure_coupling import (
    CouplingConvergenceAccelerator,
    ConvergenceStrategy,
    ConvergenceParams,
    create_convergence_params
)

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("ConvergenceAccelerationDemo")

# 定义一个非线性问题类（用于演示）
class NonlinearProblemDemo:
    """演示用非线性问题类"""
    
    def __init__(self, problem_type='standard', dimension=20, nonlinearity=2.0):
        """
        初始化非线性问题
        
        参数:
            problem_type: 问题类型 ('standard', 'stiff', 'oscillatory')
            dimension: 问题维度
            nonlinearity: 非线性强度
        """
        self.problem_type = problem_type
        self.dimension = dimension
        self.nonlinearity = nonlinearity
        self.solution = np.zeros(dimension)
        self.iterations = 0
        self.residuals = []
        
        # 模拟解向量（用于计算残差）
        if problem_type == 'standard':
            # 标准非线性问题
            self.exact_solution = np.linspace(1, 0, dimension)
        elif problem_type == 'stiff':
            # 刚性问题
            self.exact_solution = np.logspace(0, -3, dimension)
        elif problem_type == 'oscillatory':
            # 震荡问题
            x = np.linspace(0, 2 * np.pi, dimension)
            self.exact_solution = 0.5 * (np.sin(3 * x) + 1)
        else:
            raise ValueError(f"未知的问题类型: {problem_type}")
            
        # 规范化
        self.exact_solution = self.exact_solution / np.linalg.norm(self.exact_solution)
    
    def solve_step(self, initial_guess=None, max_iter=50, tol=1e-6):
        """
        求解非线性问题
        
        参数:
            initial_guess: 初始猜测解向量
            max_iter: 最大迭代次数
            tol: 收敛容差
            
        返回:
            (是否收敛, 迭代次数, 最终残差, 解向量)
        """
        if initial_guess is None:
            x = np.random.rand(self.dimension)
            x = x / np.linalg.norm(x)  # 归一化
        else:
            x = initial_guess.copy()
            
        self.solution = x.copy()
        self.iterations = 0
        self.residuals = []
        
        for i in range(max_iter):
            # 计算新的解向量
            x_new = self._iterate(x)
            
            # 计算残差
            residual = np.linalg.norm(x_new - x) / np.linalg.norm(x_new)
            self.residuals.append(residual)
            
            # 更新解
            x = x_new.copy()
            self.solution = x
            self.iterations += 1
            
            # 检查收敛性
            if residual < tol:
                return True, self.iterations, residual, x
                
        # 迭代达到最大次数仍未收敛
        return False, self.iterations, self.residuals[-1], x
    
    def _iterate(self, x):
        """
        执行一步迭代
        
        参数:
            x: 当前解向量
            
        返回:
            下一步解向量
        """
        # 模拟非线性迭代过程
        # 这里使用一个简化的非线性映射
        if self.problem_type == 'standard':
            # 标准非线性问题: x_{n+1} = f(x_n)
            f_x = 0.5 * (x + self.exact_solution / (1.0 + self.nonlinearity * np.linalg.norm(x - self.exact_solution)))
            
        elif self.problem_type == 'stiff':
            # 刚性问题: 不同分量有不同的收敛速度
            stiffness = np.logspace(0, 2, self.dimension)
            f_x = x + (self.exact_solution - x) / stiffness
            
        elif self.problem_type == 'oscillatory':
            # 震荡问题: 解的分量震荡收敛
            angle = np.pi * self.iterations / 10
            f_x = x * np.cos(angle) + self.exact_solution * (1 - np.cos(angle))
            f_x = f_x + 0.1 * np.sin(angle) * (np.random.rand(self.dimension) - 0.5)
            
        # 添加一些随机扰动，使问题更具挑战性
        noise = 0.01 * np.random.randn(self.dimension) * np.exp(-self.iterations / 5)
        f_x = f_x + noise
        
        # 归一化
        return f_x / np.linalg.norm(f_x)
    
    def get_error(self):
        """计算当前解与精确解之间的误差"""
        return np.linalg.norm(self.solution - self.exact_solution)


def test_convergence_strategy(problem, strategy_name, 
                              max_iterations=50, tolerance=1e-6,
                              **strategy_params):
    """
    测试指定的收敛策略
    
    参数:
        problem: 非线性问题实例
        strategy_name: 收敛策略名称
        max_iterations: 最大迭代次数
        tolerance: 收敛容差
        **strategy_params: 策略特定参数
        
    返回:
        (收敛历史, 解向量, 迭代次数, 求解时间)
    """
    # 创建收敛参数
    conv_params = create_convergence_params(
        strategy_name=strategy_name,
        max_iterations=max_iterations,
        tolerance=tolerance,
        **strategy_params
    )
    
    # 创建加速器
    accelerator = CouplingConvergenceAccelerator(conv_params)
    
    # 初始猜测
    initial_guess = np.random.rand(problem.dimension)
    initial_guess = initial_guess / np.linalg.norm(initial_guess)
    x = initial_guess.copy()
    
    # 开始计时
    start_time = time.time()
    
    # 迭代求解
    for i in range(max_iterations):
        # 进行一步原始迭代
        x_raw = problem._iterate(x)
        
        # 应用加速策略
        x_accelerated, residual = accelerator.apply(x_raw)
        
        # 更新解向量
        x = x_accelerated
        
        # 检查收敛性
        if accelerator.converged:
            break
    
    # 计算求解时间
    solve_time = time.time() - start_time
    
    return accelerator.convergence_history, x, accelerator.iterations, solve_time


def run_convergence_demo():
    """运行收敛加速演示"""
    logger.info("开始非线性收敛加速演示...")
    
    # 创建结果目录
    output_dir = os.path.join(project_dir, "examples", "case_results", "convergence")
    os.makedirs(output_dir, exist_ok=True)
    
    # 创建不同类型的问题
    problems = {
        'standard': NonlinearProblemDemo(problem_type='standard', dimension=50, nonlinearity=1.5),
        'stiff': NonlinearProblemDemo(problem_type='stiff', dimension=50, nonlinearity=2.0),
        'oscillatory': NonlinearProblemDemo(problem_type='oscillatory', dimension=50, nonlinearity=1.0)
    }
    
    # 测试不同的收敛策略
    strategies = [
        ('fixed_relaxation', {'relaxation_factor': 0.8}),
        ('dynamic_relaxation', {'relaxation_factor': 0.5}),
        ('aitken', {'aitken_initial_relaxation': 0.5}),
        ('line_search', {'line_search_steps': 10}),
        ('anderson', {'anderson_depth': 5})
    ]
    
    # 对每个问题测试所有策略
    results = {}
    
    for problem_name, problem in problems.items():
        results[problem_name] = {}
        
        logger.info(f"测试问题: {problem_name}")
        
        for strategy_name, strategy_params in strategies:
            logger.info(f"  使用策略: {strategy_name}")
            
            # 测试当前策略
            convergence_history, solution, iterations, solve_time = test_convergence_strategy(
                problem, strategy_name, **strategy_params
            )
            
            # 计算误差
            problem.solution = solution
            error = problem.get_error()
            
            # 保存结果
            results[problem_name][strategy_name] = {
                'convergence_history': convergence_history,
                'iterations': iterations,
                'solve_time': solve_time,
                'error': error
            }
            
            # 输出结果
            logger.info(f"    迭代次数: {iterations}")
            logger.info(f"    求解时间: {solve_time:.4f}秒")
            logger.info(f"    误差: {error:.6e}")
    
    # 绘制收敛历史对比图
    plot_convergence_comparison(results, output_dir)
    
    return results


def plot_convergence_comparison(results, output_dir):
    """绘制收敛历史对比图"""
    strategy_colors = {
        'fixed_relaxation': 'b',
        'dynamic_relaxation': 'g',
        'aitken': 'r',
        'line_search': 'c',
        'anderson': 'm'
    }
    
    strategy_labels = {
        'fixed_relaxation': '固定松弛因子',
        'dynamic_relaxation': '动态松弛因子',
        'aitken': 'Aitken加速',
        'line_search': '线搜索',
        'anderson': 'Anderson加速'
    }
    
    problem_titles = {
        'standard': '标准非线性问题',
        'stiff': '刚性非线性问题',
        'oscillatory': '震荡非线性问题'
    }
    
    # 创建图形
    for problem_name, problem_results in results.items():
        plt.figure(figsize=(10, 6))
        
        for strategy_name, strategy_results in problem_results.items():
            history = strategy_results['convergence_history']
            iters = range(1, len(history) + 1)
            
            plt.semilogy(
                iters, history,
                color=strategy_colors[strategy_name],
                label=f"{strategy_labels[strategy_name]} ({strategy_results['iterations']}次迭代)"
            )
        
        plt.title(f"{problem_titles[problem_name]} - 收敛历史对比")
        plt.xlabel('迭代次数')
        plt.ylabel('相对残差 (对数刻度)')
        plt.grid(True)
        plt.legend()
        
        # 保存图形
        plt.savefig(os.path.join(output_dir, f"convergence_{problem_name}.png"))
        logger.info(f"收敛历史对比图已保存到: {os.path.join(output_dir, f'convergence_{problem_name}.png')}")
        
        plt.close()
    
    # 创建性能对比条形图
    plt.figure(figsize=(14, 8))
    
    # 每个策略的迭代次数对比
    ax1 = plt.subplot(2, 1, 1)
    
    width = 0.15
    x = np.arange(len(results))
    
    for i, (strategy_name, _) in enumerate(strategies):
        iterations = [results[problem][strategy_name]['iterations'] for problem in results]
        ax1.bar(x + i * width, iterations, width, label=strategy_labels[strategy_name], color=strategy_colors[strategy_name])
    
    ax1.set_title('不同收敛策略性能对比 - 迭代次数')
    ax1.set_xticks(x + width * 2)
    ax1.set_xticklabels([problem_titles[p] for p in results])
    ax1.set_ylabel('迭代次数')
    ax1.grid(True, axis='y')
    ax1.legend()
    
    # 每个策略的求解时间对比
    ax2 = plt.subplot(2, 1, 2)
    
    for i, (strategy_name, _) in enumerate(strategies):
        solve_times = [results[problem][strategy_name]['solve_time'] for problem in results]
        ax2.bar(x + i * width, solve_times, width, label=strategy_labels[strategy_name], color=strategy_colors[strategy_name])
    
    ax2.set_title('不同收敛策略性能对比 - 求解时间')
    ax2.set_xticks(x + width * 2)
    ax2.set_xticklabels([problem_titles[p] for p in results])
    ax2.set_ylabel('求解时间 (秒)')
    ax2.grid(True, axis='y')
    ax2.legend()
    
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, "performance_comparison.png"))
    logger.info(f"性能对比图已保存到: {os.path.join(output_dir, 'performance_comparison.png')}")
    
    plt.close()


if __name__ == "__main__":
    try:
        results = run_convergence_demo()
        logger.info("非线性收敛加速演示完成")
    except Exception as e:
        logger.exception(f"演示过程中出错: {str(e)}") 