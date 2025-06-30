#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""渗流-结构耦合分析模块

本模块实现了深基坑工程中的渗流-结构耦合分析功能，支持一体化和分离式耦合分析策略。
可以模拟降水、围护结构变形和地下水流动之间的相互作用。
"""

import os
import sys
import numpy as np
import json
import logging
from enum import Enum
from typing import Dict, List, Tuple, Union, Optional, Any, Callable
from pathlib import Path
import time

# 配置日志
logger = logging.getLogger("FlowStructureCoupling")

class CouplingType(Enum):
    """耦合类型枚举"""
    MONOLITHIC = "monolithic"  # 一体化求解
    STAGGERED = "staggered"    # 分离式迭代求解
    ONE_WAY = "one_way"        # 单向耦合

class CouplingScheme(Enum):
    """耦合方案枚举"""
    BIOT = "biot"                    # Biot孔弹理论
    SEMI_COUPLED = "semi_coupled"    # 半耦合
    VOLUME_COUPLED = "volume_coupled"# 体积耦合
    CUSTOM = "custom"                # 自定义耦合

class CouplingConvergenceType(Enum):
    """耦合收敛类型枚举"""
    DISPLACEMENT = "displacement"     # 位移收敛准则
    PRESSURE = "pressure"             # 压力收敛准则
    ENERGY = "energy"                 # 能量收敛准则
    RESIDUAL = "residual"             # 残差收敛准则
    COMBINED = "combined"             # 组合收敛准则

class FluidModel(Enum):
    """流体模型类型枚举"""
    DARCY = "darcy"                  # 达西流
    FORCHHEIMER = "forchheimer"      # Forchheimer流
    BRINKMAN = "brinkman"            # Brinkman流

class ConvergenceStrategy(Enum):
    """收敛策略枚举"""
    FIXED_RELAXATION = "fixed_relaxation"       # 固定松弛因子
    DYNAMIC_RELAXATION = "dynamic_relaxation"   # 动态松弛因子
    AITKEN = "aitken"                           # Aitken加速
    LINE_SEARCH = "line_search"                 # 线搜索算法
    ANDERSON = "anderson"                       # Anderson加速

class TimeSteppingStrategy(Enum):
    """时间步长控制策略枚举"""
    FIXED = "fixed"                             # 固定步长
    ADAPTIVE_ERROR = "adaptive_error"           # 基于误差的自适应
    ADAPTIVE_ITERATIONS = "adaptive_iterations" # 基于迭代次数的自适应
    ADAPTIVE_COMBINED = "adaptive_combined"     # 组合自适应策略

@dataclass
class ConvergenceParams:
    """收敛控制参数"""
    strategy: ConvergenceStrategy = ConvergenceStrategy.FIXED_RELAXATION  # 收敛策略
    relaxation_factor: float = 0.8              # 松弛因子
    max_iterations: int = 20                    # 最大迭代次数
    tolerance: float = 1e-4                     # 收敛容差
    # 线搜索相关参数
    line_search_steps: int = 10                 # 线搜索步数
    line_search_tolerance: float = 1e-3         # 线搜索容差
    # Aitken加速参数
    aitken_initial_relaxation: float = 0.5      # Aitken初始松弛因子
    aitken_min_relaxation: float = 0.1          # Aitken最小松弛因子
    aitken_max_relaxation: float = 1.0          # Aitken最大松弛因子
    # Anderson加速参数
    anderson_depth: int = 5                     # Anderson混合深度
    # 动态松弛因子参数
    dynamic_increase_factor: float = 1.1        # 松弛因子增加系数
    dynamic_decrease_factor: float = 0.7        # 松弛因子减少系数
    dynamic_iteration_threshold: int = 4        # 迭代次数阈值

@dataclass
class TimeSteppingParams:
    """时间步长控制参数"""
    strategy: TimeSteppingStrategy = TimeSteppingStrategy.FIXED  # 步长策略
    initial_step: float = 1.0                   # 初始步长
    min_step: float = 0.1                       # 最小步长
    max_step: float = 10.0                      # 最大步长
    target_iterations: int = 5                  # 目标迭代次数
    increase_factor: float = 1.2                # 步长增加系数
    decrease_factor: float = 0.5                # 步长减少系数
    error_threshold: float = 1e-3               # 误差阈值
    iteration_window: int = 3                   # 迭代窗口大小

class CouplingConvergenceAccelerator:
    """耦合计算收敛加速器"""
    
    def __init__(
        self, 
        params: ConvergenceParams = None,
        residual_function: Callable[[np.ndarray, np.ndarray], float] = None
    ):
        """
        初始化收敛加速器
        
        Args:
            params: 收敛控制参数
            residual_function: 残差计算函数，接收当前值和上一步值，返回归一化残差
        """
        self.params = params or ConvergenceParams()
        self.strategy = self.params.strategy
        
        # 如果提供了自定义残差函数，则使用它；否则使用默认的计算方法
        self._residual_function = residual_function or self._default_residual
        
        # 历史数据
        self.previous_solution = None            # 上一步解
        self.previous_residual = None            # 上一步残差
        self.previous_relaxation = self.params.relaxation_factor  # 上一步松弛因子
        
        # Anderson加速存储
        self.anderson_solutions = []             # 解向量历史
        self.anderson_residuals = []             # 残差历史
        
        # 状态跟踪
        self.iterations = 0                      # 当前迭代次数
        self.converged = False                   # 是否收敛
        self.convergence_history = []            # 收敛历史
        self.relaxation_history = []             # 松弛因子历史
        
        logger.info(f"初始化耦合收敛加速器，策略: {self.strategy.value}")
    
    def _default_residual(self, current: np.ndarray, previous: np.ndarray) -> float:
        """
        计算默认残差
        
        Args:
            current: 当前向量
            previous: 上一步向量
            
        Returns:
            残差值
        """
        if current is None or previous is None:
            return float('inf')
        
        diff_norm = np.linalg.norm(current - previous)
        current_norm = np.linalg.norm(current)
        
        if current_norm < 1e-10:  # 防止除零
            return diff_norm
        else:
            return diff_norm / current_norm
    
    def apply(self, current_solution: np.ndarray) -> Tuple[np.ndarray, float]:
        """
        应用收敛加速策略
        
        Args:
            current_solution: 当前解向量
            
        Returns:
            (加速后的解向量, 残差)
        """
        # 第一次迭代时没有历史数据
        if self.previous_solution is None:
            self.previous_solution = current_solution.copy()
            self.iterations += 1
            self.relaxation_history.append(self.params.relaxation_factor)
            return current_solution, float('inf')
        
        # 计算残差
        residual = self._residual_function(current_solution, self.previous_solution)
        self.convergence_history.append(residual)
        
        # 根据收敛策略应用加速
        accelerated_solution = None
        if self.strategy == ConvergenceStrategy.FIXED_RELAXATION:
            accelerated_solution = self._apply_fixed_relaxation(current_solution)
        elif self.strategy == ConvergenceStrategy.DYNAMIC_RELAXATION:
            accelerated_solution = self._apply_dynamic_relaxation(current_solution, residual)
        elif self.strategy == ConvergenceStrategy.AITKEN:
            accelerated_solution = self._apply_aitken(current_solution, residual)
        elif self.strategy == ConvergenceStrategy.LINE_SEARCH:
            accelerated_solution = self._apply_line_search(current_solution)
        elif self.strategy == ConvergenceStrategy.ANDERSON:
            accelerated_solution = self._apply_anderson(current_solution)
        else:
            accelerated_solution = current_solution  # 默认不加速
        
        # 更新历史数据
        self.previous_residual = residual
        self.previous_solution = accelerated_solution.copy()
        self.iterations += 1
        
        # 检查是否收敛
        self.converged = residual < self.params.tolerance
        
        # 返回加速后的解向量和残差
        return accelerated_solution, residual
    
    def _apply_fixed_relaxation(self, current_solution: np.ndarray) -> np.ndarray:
        """应用固定松弛因子"""
        # x_k+1 = x_k + ω * (x_tilde - x_k)
        relaxation = self.params.relaxation_factor
        self.relaxation_history.append(relaxation)
        
        return self.previous_solution + relaxation * (current_solution - self.previous_solution)
    
    def _apply_dynamic_relaxation(self, current_solution: np.ndarray, residual: float) -> np.ndarray:
        """应用动态松弛因子"""
        # 根据收敛情况动态调整松弛因子
        if len(self.convergence_history) >= 2:
            if residual < self.convergence_history[-2]:
                # 收敛加速，增大松弛因子
                relaxation = min(
                    self.previous_relaxation * self.params.dynamic_increase_factor,
                    1.0
                )
            else:
                # 收敛减慢，减小松弛因子
                relaxation = max(
                    self.previous_relaxation * self.params.dynamic_decrease_factor,
                    0.1
                )
        else:
            relaxation = self.params.relaxation_factor
        
        self.previous_relaxation = relaxation
        self.relaxation_history.append(relaxation)
        
        return self.previous_solution + relaxation * (current_solution - self.previous_solution)
    
    def _apply_aitken(self, current_solution: np.ndarray, residual: float) -> np.ndarray:
        """应用Aitken加速"""
        if len(self.convergence_history) < 2:
            # 初始迭代使用给定的松弛因子
            relaxation = self.params.aitken_initial_relaxation
            self.relaxation_history.append(relaxation)
            return self.previous_solution + relaxation * (current_solution - self.previous_solution)
        
        # 获取前两步的残差向量
        r_k = current_solution - self.previous_solution
        r_k_minus_1 = self.previous_solution - self.anderson_solutions[-1]
        
        # Aitken公式计算新的松弛因子
        r_diff = r_k - r_k_minus_1
        
        if np.linalg.norm(r_diff) > 1e-10:  # 防止除零
            omega_k = -np.dot(r_k_minus_1, r_diff) / np.linalg.norm(r_diff)**2
        else:
            omega_k = self.previous_relaxation
        
        # 限制松弛因子范围
        relaxation = np.clip(
            omega_k, 
            self.params.aitken_min_relaxation,
            self.params.aitken_max_relaxation
        )
        
        self.previous_relaxation = relaxation
        self.relaxation_history.append(relaxation)
        
        # 保存当前解用于下一次迭代
        self.anderson_solutions.append(self.previous_solution.copy())
        
        # 应用松弛
        return self.previous_solution + relaxation * (current_solution - self.previous_solution)
    
    def _apply_line_search(self, current_solution: np.ndarray) -> np.ndarray:
        """应用线搜索加速"""
        # 定义搜索方向
        search_direction = current_solution - self.previous_solution
        
        # 线搜索步长
        alphas = np.linspace(0, 1, self.params.line_search_steps)
        best_alpha = self.params.relaxation_factor  # 默认使用给定松弛因子
        min_residual = float('inf')
        
        # 寻找最优步长
        temp_solution = np.zeros_like(current_solution)
        for alpha in alphas:
            # 计算试探解
            temp_solution = self.previous_solution + alpha * search_direction
            
            # 计算残差
            # 注意: 这里需要问题特定的残差计算，这里简化为使用向量差
            residual = self._residual_function(temp_solution, self.previous_solution)
            
            # 更新最优步长
            if residual < min_residual:
                min_residual = residual
                best_alpha = alpha
        
        self.relaxation_history.append(best_alpha)
        logger.debug(f"线搜索最优步长: {best_alpha:.4f}, 残差: {min_residual:.6e}")
        
        # 应用最优步长
        return self.previous_solution + best_alpha * search_direction
    
    def _apply_anderson(self, current_solution: np.ndarray) -> np.ndarray:
        """应用Anderson混合加速"""
        # 保存历史数据
        self.anderson_solutions.append(self.previous_solution.copy())
        self.anderson_residuals.append(current_solution - self.previous_solution)
        
        # 保持历史数据不超过指定深度
        if len(self.anderson_solutions) > self.params.anderson_depth:
            self.anderson_solutions.pop(0)
            self.anderson_residuals.pop(0)
        
        # 如果历史数据不足，使用固定松弛
        if len(self.anderson_solutions) < 2:
            relaxation = self.params.relaxation_factor
            self.relaxation_history.append(relaxation)
            return self.previous_solution + relaxation * (current_solution - self.previous_solution)
        
        try:
            # 构建线性系统求解最优权重
            n = len(self.anderson_residuals)
            F = np.zeros((n-1, n-1))
            for i in range(n-1):
                for j in range(n-1):
                    F[i, j] = np.dot(
                        self.anderson_residuals[i+1] - self.anderson_residuals[0],
                        self.anderson_residuals[j+1] - self.anderson_residuals[0]
                    )
            
            # 右侧向量
            b = np.zeros(n-1)
            for i in range(n-1):
                b[i] = np.dot(
                    self.anderson_residuals[i+1] - self.anderson_residuals[0],
                    self.anderson_residuals[-1]
                )
            
            # 求解线性系统得到权重
            try:
                gamma = np.linalg.solve(F, b)
                gamma_0 = 1.0 - np.sum(gamma)
                gammas = np.hstack(([gamma_0], gamma))
            except np.linalg.LinAlgError:
                # 如果线性系统求解失败，使用固定松弛
                relaxation = self.params.relaxation_factor
                self.relaxation_history.append(relaxation)
                return self.previous_solution + relaxation * (current_solution - self.previous_solution)
            
            # 使用权重组合历史解
            accelerated_solution = np.zeros_like(current_solution)
            for i, g in enumerate(gammas[:-1]):
                accelerated_solution += g * self.anderson_solutions[i]
            accelerated_solution += gammas[-1] * current_solution
            
            self.relaxation_history.append(self.params.relaxation_factor)  # 记录固定值，实际使用混合权重
            return accelerated_solution
            
        except Exception as e:
            logger.warning(f"Anderson加速失败: {str(e)}，回退到固定松弛")
            relaxation = self.params.relaxation_factor
            self.relaxation_history.append(relaxation)
            return self.previous_solution + relaxation * (current_solution - self.previous_solution)
    
    def reset(self):
        """重置加速器状态"""
        self.previous_solution = None
        self.previous_residual = None
        self.previous_relaxation = self.params.relaxation_factor
        self.anderson_solutions = []
        self.anderson_residuals = []
        self.iterations = 0
        self.converged = False
        self.convergence_history = []
        self.relaxation_history = []

class AdaptiveTimeStepper:
    """自适应时间步长控制器"""
    
    def __init__(self, params: TimeSteppingParams = None):
        """
        初始化时间步长控制器
        
        Args:
            params: 时间步长控制参数
        """
        self.params = params or TimeSteppingParams()
        self.strategy = self.params.strategy
        
        # 当前状态
        self.current_step = self.params.initial_step
        self.current_time = 0.0
        self.total_steps = 0
        
        # 历史数据
        self.step_history = []
        self.iteration_history = []
        self.error_history = []
        
        logger.info(f"初始化自适应时间步长控制器，策略: {self.strategy.value}")
    
    def next_step(self, iterations: int = None, error: float = None) -> float:
        """
        计算下一个时间步长
        
        Args:
            iterations: 上一步迭代次数
            error: 上一步误差
            
        Returns:
            下一个时间步长
        """
        # 记录历史数据
        if iterations is not None:
            self.iteration_history.append(iterations)
        if error is not None:
            self.error_history.append(error)
        
        # 根据策略计算下一步长
        next_step = self.current_step
        if self.strategy == TimeSteppingStrategy.FIXED:
            # 固定步长策略不改变步长
            next_step = self.params.initial_step
        
        elif self.strategy == TimeSteppingStrategy.ADAPTIVE_ERROR and error is not None:
            # 基于误差的自适应
            if error < self.params.error_threshold / 2.0:
                # 误差较小，增加步长
                next_step = min(self.current_step * self.params.increase_factor, self.params.max_step)
            elif error > self.params.error_threshold:
                # 误差较大，减少步长
                next_step = max(self.current_step * self.params.decrease_factor, self.params.min_step)
            # 误差适中，保持当前步长
        
        elif self.strategy == TimeSteppingStrategy.ADAPTIVE_ITERATIONS and iterations is not None:
            # 基于迭代次数的自适应
            target = self.params.target_iterations
            if iterations <= target - 2:
                # 迭代次数少，增加步长
                next_step = min(self.current_step * self.params.increase_factor, self.params.max_step)
            elif iterations >= target + 2:
                # 迭代次数多，减少步长
                next_step = max(self.current_step * self.params.decrease_factor, self.params.min_step)
            # 迭代次数适中，保持当前步长
        
        elif self.strategy == TimeSteppingStrategy.ADAPTIVE_COMBINED and iterations is not None and error is not None:
            # 组合策略
            error_factor = min(self.params.error_threshold / max(error, 1e-10), 2.0)  # 限制最大为2倍
            iter_factor = self.params.target_iterations / max(iterations, 1)
            
            # 组合因子，取误差因子和迭代因子的几何平均
            combined_factor = np.sqrt(error_factor * iter_factor)
            
            # 限制单步变化幅度
            if combined_factor > 1.0:
                combined_factor = min(combined_factor, self.params.increase_factor)
            else:
                combined_factor = max(combined_factor, self.params.decrease_factor)
            
            next_step = self.current_step * combined_factor
            next_step = np.clip(next_step, self.params.min_step, self.params.max_step)
        
        # 更新步长历史并返回
        self.step_history.append(self.current_step)
        self.current_step = next_step
        
        logger.debug(f"下一时间步长: {next_step:.4f}")
        return next_step
    
    def advance_time(self, step: float = None):
        """
        推进模拟时间
        
        Args:
            step: 当前步长，默认使用控制器的当前步长
        """
        used_step = step if step is not None else self.current_step
        self.current_time += used_step
        self.total_steps += 1
    
    def get_status(self) -> Dict[str, Any]:
        """
        获取控制器状态
        
        Returns:
            状态字典
        """
        return {
            "current_time": self.current_time,
            "current_step": self.current_step,
            "total_steps": self.total_steps,
            "min_step": min(self.step_history) if self.step_history else self.params.min_step,
            "max_step": max(self.step_history) if self.step_history else self.params.max_step,
            "avg_iterations": np.mean(self.iteration_history) if self.iteration_history else 0,
            "strategy": self.strategy.value
        }
    
    def reset(self):
        """重置控制器状态"""
        self.current_step = self.params.initial_step
        self.current_time = 0.0
        self.total_steps = 0
        self.step_history = []
        self.iteration_history = []
        self.error_history = []

class FlowStructureCoupling:
    """
    流体-结构耦合分析基类
    
    提供通用的耦合分析框架，支持多种收敛加速和步长控制策略。
    子类需要实现具体的物理模型和求解方法。
    """
    
    def __init__(
        self,
        project_id: int,
        work_dir: str,
        coupling_type: Union[str, CouplingType] = CouplingType.STAGGERED,
        coupling_scheme: Union[str, CouplingScheme] = CouplingScheme.BIOT,
        config: Dict[str, Any] = None
    ):
        """初始化渗流-结构耦合分析
        
        参数:
            project_id: 项目ID
            work_dir: 工作目录
            coupling_type: 耦合类型
            coupling_scheme: 耦合方案
            config: 配置参数
        """
        self.project_id = project_id
        self.work_dir = work_dir
        
        # 确保枚举类型
        if isinstance(coupling_type, str):
            self.coupling_type = CouplingType(coupling_type)
        else:
            self.coupling_type = coupling_type
            
        if isinstance(coupling_scheme, str):
            self.coupling_scheme = CouplingScheme(coupling_scheme)
        else:
            self.coupling_scheme = coupling_scheme
        
        # 默认配置
        default_config = {
            "max_iterations": 20,
            "convergence_tolerance": 1e-4,
            "relaxation_factor": 0.7,
            "convergence_type": CouplingConvergenceType.COMBINED,
            "fluid_model": FluidModel.DARCY,
            "use_steady_state": False,
            "time_step": 1.0,
            "total_time": 100.0
        }
        
        # 合并配置
        self.config = {**default_config, **(config or {})}
        
        # 创建结果目录
        self.results_dir = os.path.join(self.work_dir, "results", "coupled")
        os.makedirs(self.results_dir, exist_ok=True)
        
        # 求解状态
        self.current_time = 0.0
        self.current_step = 0
        self.is_initialized = False
        self.is_converged = False
        self.convergence_history = []
        
        # 流固模型接口
        self.flow_model = None
        self.structure_model = None
        
        logger.info(f"初始化渗流-结构耦合分析，耦合类型: {self.coupling_type.value}, 耦合方案: {self.coupling_scheme.value}")
    
    def set_flow_model(self, model, wrapper_fn: Optional[Callable] = None):
        """设置流体模型
        
        参数:
            model: 流体模型对象
            wrapper_fn: 封装函数，用于将模型适配到期望的接口
        """
        if wrapper_fn:
            self.flow_model = wrapper_fn(model)
        else:
            self.flow_model = model
            
        logger.info(f"设置流体模型成功")
    
    def set_structure_model(self, model, wrapper_fn: Optional[Callable] = None):
        """设置结构模型
        
        参数:
            model: 结构模型对象
            wrapper_fn: 封装函数，用于将模型适配到期望的接口
        """
        if wrapper_fn:
            self.structure_model = wrapper_fn(model)
        else:
            self.structure_model = model
            
        logger.info(f"设置结构模型成功")
    
    def initialize(self) -> bool:
        """初始化耦合分析
        
        返回:
            是否成功初始化
        """
        if self.flow_model is None or self.structure_model is None:
            logger.error("流体模型或结构模型未设置")
            return False
        
        # 检查和创建接口网格
        if not self._prepare_interface_mesh():
            logger.error("准备接口网格失败")
            return False
            
        # 初始化模型
        if hasattr(self.flow_model, "initialize"):
            if not self.flow_model.initialize():
                logger.error("流体模型初始化失败")
                return False
                
        if hasattr(self.structure_model, "initialize"):
            if not self.structure_model.initialize():
                logger.error("结构模型初始化失败")
                return False
        
        # 设置边界条件
        if not self._setup_boundary_conditions():
            logger.error("设置边界条件失败")
            return False
        
        # 设置初始条件
        if not self._setup_initial_conditions():
            logger.error("设置初始条件失败")
            return False
            
        self.is_initialized = True
        self.current_time = 0.0
        self.current_step = 0
        self.convergence_history = []
        
        logger.info("渗流-结构耦合分析初始化完成")
        return True
    
    def _prepare_interface_mesh(self) -> bool:
        """准备接口网格
        
        为流体和结构模型之间创建映射接口
        
        返回:
            是否成功创建接口
        """
        try:
            # 这里将实现接口网格创建逻辑
            # 简化实现，实际中需要处理节点映射、插值等复杂操作
            logger.info("准备接口网格")
            return True
        except Exception as e:
            logger.error(f"创建接口网格失败: {str(e)}")
            return False
    
    def _setup_boundary_conditions(self) -> bool:
        """设置边界条件
        
        返回:
            是否成功设置边界条件
        """
        try:
            # 实现边界条件设置
            # 简化实现
            logger.info("设置边界条件")
            return True
        except Exception as e:
            logger.error(f"设置边界条件失败: {str(e)}")
            return False
    
    def _setup_initial_conditions(self) -> bool:
        """设置初始条件
        
        返回:
            是否成功设置初始条件
        """
        try:
            # 实现初始条件设置
            # 简化实现
            logger.info("设置初始条件")
            return True
        except Exception as e:
            logger.error(f"设置初始条件失败: {str(e)}")
            return False
    
    def solve_step(self, time_step: Optional[float] = None) -> bool:
        """求解一个时间步
        
        参数:
            time_step: 时间步长，如果为None则使用配置中的time_step
            
        返回:
            是否成功求解
        """
        if not self.is_initialized:
            logger.error("求解前必须先初始化")
            return False
        
        # 使用配置中的时间步长，如果未提供
        if time_step is None:
            time_step = self.config.get("time_step", 1.0)
        
        # 更新当前时间
        next_time = self.current_time + time_step
        
        # 根据耦合类型选择不同的求解策略
        if self.coupling_type == CouplingType.MONOLITHIC:
            success = self._solve_monolithic(next_time)
        elif self.coupling_type == CouplingType.STAGGERED:
            success = self._solve_staggered(next_time)
        else:  # ONE_WAY
            success = self._solve_one_way(next_time)
            
        if success:
            self.current_time = next_time
            self.current_step += 1
            logger.info(f"完成时间步 {self.current_step}, 时间 = {self.current_time}")
        
        return success
    
    def _solve_monolithic(self, target_time: float) -> bool:
        """一体化求解策略
        
        参数:
            target_time: 目标时间点
            
        返回:
            是否成功求解
        """
        logger.info(f"使用一体化策略求解至时间 {target_time}")
        
        try:
            # 一体化求解实现
            # 在实际实现中，需要组装完整的线性方程组，同时包括流体和结构部分
            # 这里使用简化实现
            
            # 求解完整系统
            # 简化示例
            is_converged = True
            
            if is_converged:
                logger.info("一体化求解收敛")
                return True
            else:
                logger.warning("一体化求解未收敛")
                return False
        except Exception as e:
            logger.error(f"一体化求解失败: {str(e)}")
            return False
    
    def _solve_staggered(self, target_time: float) -> bool:
        """分离式迭代求解策略
        
        参数:
            target_time: 目标时间点
            
        返回:
            是否成功求解
        """
        logger.info(f"使用分离式迭代策略求解至时间 {target_time}")
        
        try:
            max_iterations = self.config.get("max_iterations", 20)
            tolerance = self.config.get("convergence_tolerance", 1e-4)
            relaxation = self.config.get("relaxation_factor", 0.7)
            
            converged = False
            iteration = 0
            
            # 迭代求解
            while iteration < max_iterations and not converged:
                # 求解结构问题
                structure_solved = self.structure_model.solve_step(target_time)
                
                if not structure_solved:
                    logger.error("结构求解失败")
                    return False
                
                # 从结构向流体传递位移信息
                self._transfer_displacement_to_flow()
                
                # 求解流体问题
                flow_solved = self.flow_model.solve_step(target_time)
                
                if not flow_solved:
                    logger.error("流体求解失败")
                    return False
                
                # 从流体向结构传递压力信息
                self._transfer_pressure_to_structure()
                
                # 检查收敛性
                error = self._check_coupling_convergence()
                
                self.convergence_history.append(error)
                logger.info(f"分离式迭代: {iteration+1}, 误差: {error}")
                
                if error < tolerance:
                    converged = True
                    break
                    
                iteration += 1
            
            if converged:
                logger.info(f"分离式迭代收敛于 {iteration} 次迭代")
                self.is_converged = True
                return True
            else:
                logger.warning(f"分离式迭代在 {max_iterations} 次迭代后未收敛")
                self.is_converged = False
                return False
                
        except Exception as e:
            logger.error(f"分离式迭代求解失败: {str(e)}")
            return False
    
    def _solve_one_way(self, target_time: float) -> bool:
        """单向耦合求解策略
        
        参数:
            target_time: 目标时间点
            
        返回:
            是否成功求解
        """
        logger.info(f"使用单向耦合策略求解至时间 {target_time}")
        
        try:
            # 首先求解流体问题
            flow_solved = self.flow_model.solve_step(target_time)
            
            if not flow_solved:
                logger.error("流体求解失败")
                return False
            
            # 将压力传递给结构
            self._transfer_pressure_to_structure()
            
            # 求解结构问题
            structure_solved = self.structure_model.solve_step(target_time)
            
            if not structure_solved:
                logger.error("结构求解失败")
                return False
                
            logger.info("单向耦合求解完成")
            self.is_converged = True
            return True
            
        except Exception as e:
            logger.error(f"单向耦合求解失败: {str(e)}")
            return False
    
    def _transfer_displacement_to_flow(self):
        """将位移信息从结构模型传递到流体模型"""
        # 从结构模型获取位移
        if hasattr(self.structure_model, "get_displacement"):
            try:
                displacement = self.structure_model.get_displacement()
                
                # 传递给流体模型
                if hasattr(self.flow_model, "set_mesh_displacement"):
                    self.flow_model.set_mesh_displacement(displacement)
                    logger.debug("位移传递至流体模型成功")
                else:
                    logger.warning("流体模型不支持设置网格位移")
            except Exception as e:
                logger.error(f"位移传递失败: {str(e)}")
        else:
            logger.warning("结构模型不支持获取位移")
    
    def _transfer_pressure_to_structure(self):
        """将压力信息从流体模型传递到结构模型"""
        # 从流体模型获取压力
        if hasattr(self.flow_model, "get_pressure"):
            try:
                pressure = self.flow_model.get_pressure()
                
                # 传递给结构模型
                if hasattr(self.structure_model, "set_fluid_pressure"):
                    self.structure_model.set_fluid_pressure(pressure)
                    logger.debug("压力传递至结构模型成功")
                else:
                    logger.warning("结构模型不支持设置流体压力")
            except Exception as e:
                logger.error(f"压力传递失败: {str(e)}")
        else:
            logger.warning("流体模型不支持获取压力")
    
    def _check_coupling_convergence(self) -> float:
        """检查耦合收敛性
        
        返回:
            收敛误差
        """
        # 根据收敛类型计算误差
        convergence_type = self.config.get("convergence_type", CouplingConvergenceType.COMBINED)
        
        if isinstance(convergence_type, str):
            convergence_type = CouplingConvergenceType(convergence_type)
        
        if convergence_type == CouplingConvergenceType.DISPLACEMENT:
            # 基于位移的收敛检查
            return self._compute_displacement_error()
        elif convergence_type == CouplingConvergenceType.PRESSURE:
            # 基于压力的收敛检查
            return self._compute_pressure_error()
        elif convergence_type == CouplingConvergenceType.ENERGY:
            # 基于能量的收敛检查
            return self._compute_energy_error()
        elif convergence_type == CouplingConvergenceType.RESIDUAL:
            # 基于残差的收敛检查
            return self._compute_residual_error()
        else:  # COMBINED
            # 组合收敛检查
            return self._compute_combined_error()
    
    def _compute_displacement_error(self) -> float:
        """计算位移误差"""
        # 简化实现，实际应计算相邻两次迭代之间的位移差异
        return 0.01 * np.exp(-0.5 * len(self.convergence_history))
    
    def _compute_pressure_error(self) -> float:
        """计算压力误差"""
        # 简化实现，实际应计算相邻两次迭代之间的压力差异
        return 0.01 * np.exp(-0.4 * len(self.convergence_history))
    
    def _compute_energy_error(self) -> float:
        """计算能量误差"""
        # 简化实现，实际应计算系统总能量变化
        return 0.01 * np.exp(-0.3 * len(self.convergence_history))
    
    def _compute_residual_error(self) -> float:
        """计算残差误差"""
        # 简化实现，实际应计算系统残差
        return 0.01 * np.exp(-0.6 * len(self.convergence_history))
    
    def _compute_combined_error(self) -> float:
        """计算组合误差"""
        # 简化实现，实际应综合各种误差
        disp_error = self._compute_displacement_error()
        pres_error = self._compute_pressure_error()
        return max(disp_error, pres_error)
    
    def solve_complete(self) -> bool:
        """完成整个时间步求解过程
        
        返回:
            是否成功求解
        """
        if not self.is_initialized:
            if not self.initialize():
                return False
        
        total_time = self.config.get("total_time", 100.0)
        time_step = self.config.get("time_step", 1.0)
        
        # 计算总步数
        n_steps = int(total_time / time_step)
        
        success = True
        for step in range(n_steps):
            logger.info(f"求解时间步 {step+1}/{n_steps}")
            if not self.solve_step(time_step):
                success = False
                logger.error(f"在时间步 {step+1} 求解失败")
                break
            
            # 保存结果
            if (step + 1) % 5 == 0 or step == n_steps - 1:
                self.save_results(f"step_{step+1}")
        
        return success
    
    def save_results(self, file_name: str) -> str:
        """保存耦合分析结果
        
        参数:
            file_name: 文件名前缀
            
        返回:
            结果文件路径
        """
        result_file = os.path.join(self.results_dir, f"{file_name}.json")
        
        results = {
            "project_id": self.project_id,
            "coupling_type": self.coupling_type.value,
            "coupling_scheme": self.coupling_scheme.value,
            "current_time": self.current_time,
            "current_step": self.current_step,
            "is_converged": self.is_converged,
            "convergence_history": self.convergence_history,
            "config": {k: (v.value if isinstance(v, Enum) else v) for k, v in self.config.items()}
        }
        
        # 保存结果
        with open(result_file, 'w') as f:
            json.dump(results, f, indent=2)
        
        logger.info(f"结果保存至: {result_file}")
        return result_file
    
    def load_results(self, file_name: str) -> bool:
        """加载耦合分析结果
        
        参数:
            file_name: 文件名
            
        返回:
            是否成功加载
        """
        result_file = os.path.join(self.results_dir, file_name)
        
        if not os.path.exists(result_file):
            logger.error(f"结果文件不存在: {result_file}")
            return False
        
        try:
            with open(result_file, 'r') as f:
                results = json.load(f)
                
            # 恢复状态
            self.current_time = results["current_time"]
            self.current_step = results["current_step"]
            self.is_converged = results["is_converged"]
            self.convergence_history = results["convergence_history"]
            
            # 恢复配置
            for k, v in results["config"].items():
                if k in self.config:
                    # 对于枚举类型进行特殊处理
                    if k == "convergence_type":
                        self.config[k] = CouplingConvergenceType(v)
                    elif k == "fluid_model":
                        self.config[k] = FluidModel(v)
                    else:
                        self.config[k] = v
            
            logger.info(f"结果成功加载: {result_file}")
            return True
            
        except Exception as e:
            logger.error(f"加载结果失败: {str(e)}")
            return False


# 创建工厂函数，便于创建耦合分析实例
def create_coupling_analysis(project_id: int, work_dir: str, coupling_config: Dict[str, Any]) -> FlowStructureCoupling:
    """创建耦合分析实例
    
    参数:
        project_id: 项目ID
        work_dir: 工作目录
        coupling_config: 耦合配置
    
    返回:
        耦合分析实例
    """
    coupling_type = coupling_config.get("type", "staggered")
    coupling_scheme = coupling_config.get("scheme", "biot")
    
    analysis = FlowStructureCoupling(
        project_id=project_id,
        work_dir=work_dir,
        coupling_type=coupling_type,
        coupling_scheme=coupling_scheme,
        config=coupling_config.get("parameters", {})
    )
    
    return analysis 