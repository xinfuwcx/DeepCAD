#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
参数反演优化器模块

该模块提供用于深基坑工程参数反演的高级优化算法，支持多参数同时反演、
约束条件自适应权重调整和不确定性量化。

作者: Deep Excavation Team
版本: 1.0.0
"""

import os
import sys
import numpy as np
import time
import logging
from typing import Dict, List, Tuple, Union, Optional, Any, Callable
from pathlib import Path

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    print("警告: 未找到PyTorch，参数反演功能将受限")

# 配置日志
logger = logging.getLogger("ParamInverse")

class ParameterOptimizer:
    """参数反演优化器类，用于深基坑工程参数反演"""
    
    def __init__(
        self,
        param_names: List[str],
        param_bounds: Dict[str, Tuple[float, float]],
        loss_fn: Callable,
        optimizer_type: str = "adam",
        learning_rate: float = 0.001,
        weight_decay: float = 0.0,
        max_iterations: int = 1000,
        convergence_tol: float = 1e-5,
        device: str = "auto"
    ):
        """初始化参数优化器
        
        参数:
            param_names: 参数名称列表
            param_bounds: 参数上下界字典 {param_name: (lower_bound, upper_bound)}
            loss_fn: 损失函数，接收当前参数值并返回损失
            optimizer_type: 优化器类型，支持'adam', 'lbfgs', 'sgd'
            learning_rate: 学习率
            weight_decay: 权重衰减系数
            max_iterations: 最大迭代次数
            convergence_tol: 收敛容差
            device: 计算设备，'cpu', 'cuda'或'auto'
        """
        self.param_names = param_names
        self.param_bounds = param_bounds
        self.loss_fn = loss_fn
        self.optimizer_type = optimizer_type
        self.learning_rate = learning_rate
        self.weight_decay = weight_decay
        self.max_iterations = max_iterations
        self.convergence_tol = convergence_tol
        
        # 参数数量
        self.n_params = len(param_names)
        
        # 验证所有参数都有界限
        for name in param_names:
            if name not in param_bounds:
                raise ValueError(f"参数 {name} 没有指定边界")
        
        # 设置设备
        if not HAS_TORCH:
            self.device = "cpu"
        elif device == "auto":
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
            
        logger.info(f"参数优化器初始化，使用设备: {self.device}")
        
        # 初始化参数
        if HAS_TORCH:
            self.params = nn.ParameterDict()
            for name in param_names:
                lower, upper = param_bounds[name]
                # 使用界限中点作为初始值
                init_value = (lower + upper) / 2.0
                self.params[name] = nn.Parameter(torch.tensor([init_value], 
                                               device=self.device, 
                                               dtype=torch.float32))
            
            # 创建优化器
            if optimizer_type.lower() == "adam":
                self.optimizer = optim.Adam(self.params.values(), 
                                          lr=learning_rate, 
                                          weight_decay=weight_decay)
            elif optimizer_type.lower() == "lbfgs":
                self.optimizer = optim.LBFGS(self.params.values(), 
                                           lr=learning_rate)
            elif optimizer_type.lower() == "sgd":
                self.optimizer = optim.SGD(self.params.values(), 
                                         lr=learning_rate, 
                                         momentum=0.9, 
                                         weight_decay=weight_decay)
            else:
                raise ValueError(f"不支持的优化器类型: {optimizer_type}")
        
        # 优化历史
        self.history = {
            "loss": [],
            "params": [],
            "grad_norm": [],
            "learning_rates": [],
            "weight_factors": []
        }
        
        # 自适应权重
        self.adaptive_weights = {
            "enabled": False,
            "factors": {name: 1.0 for name in param_names},
            "history": []
        }
        
        # 不确定性量化
        self.uncertainty = {
            "enabled": False,
            "samples": 100,
            "results": {},
            "confidence_intervals": {}
        }
    
    def set_initial_values(self, initial_values: Dict[str, float]) -> None:
        """设置参数初始值
        
        参数:
            initial_values: 参数初始值字典 {param_name: value}
        """
        if not HAS_TORCH:
            logger.warning("PyTorch未找到，无法设置初始值")
            return
            
        for name, value in initial_values.items():
            if name in self.params:
                # 检查边界
                lower, upper = self.param_bounds[name]
                if value < lower or value > upper:
                    logger.warning(f"参数 {name} 的初始值 {value} 超出范围 [{lower}, {upper}]")
                    # 调整到边界内
                    value = max(lower, min(value, upper))
                
                # 设置初始值
                with torch.no_grad():
                    self.params[name].copy_(torch.tensor([value], 
                                                     device=self.device,
                                                     dtype=torch.float32))
                logger.info(f"参数 {name} 初始值设置为: {value}")
            else:
                logger.warning(f"参数 {name} 未在优化器中定义")
    
    def enable_adaptive_weights(self, 
                               update_interval: int = 50, 
                               sensitivity_threshold: float = 0.1) -> None:
        """启用自适应权重调整
        
        参数:
            update_interval: 权重更新间隔（迭代次数）
            sensitivity_threshold: 敏感度阈值
        """
        self.adaptive_weights["enabled"] = True
        self.adaptive_weights["update_interval"] = update_interval
        self.adaptive_weights["sensitivity_threshold"] = sensitivity_threshold
        logger.info("启用自适应权重调整")
    
    def enable_uncertainty_quantification(self, 
                                        samples: int = 100, 
                                        confidence_level: float = 0.95) -> None:
        """启用不确定性量化
        
        参数:
            samples: 采样数量
            confidence_level: 置信水平
        """
        self.uncertainty["enabled"] = True
        self.uncertainty["samples"] = samples
        self.uncertainty["confidence_level"] = confidence_level
        logger.info(f"启用不确定性量化，采样数: {samples}, 置信水平: {confidence_level}")
    
    def _clip_parameters(self) -> None:
        """将参数剪裁到指定范围内"""
        if not HAS_TORCH:
            return
            
        with torch.no_grad():
            for name in self.param_names:
                lower, upper = self.param_bounds[name]
                clipped_value = torch.clamp(self.params[name], min=lower, max=upper)
                self.params[name].copy_(clipped_value)
    
    def _update_adaptive_weights(self, iteration: int) -> None:
        """更新自适应权重
        
        基于参数敏感度分析调整各参数的权重
        
        参数:
            iteration: 当前迭代次数
        """
        if not self.adaptive_weights["enabled"]:
            return
            
        if not HAS_TORCH:
            return
            
        # 检查是否需要更新
        if iteration % self.adaptive_weights["update_interval"] != 0:
            return
            
        # 计算参数敏感度
        sensitivities = {}
        
        # 保存当前参数值
        current_values = {name: self.params[name].item() for name in self.param_names}
        current_loss = self.loss_fn({name: self.params[name].item() for name in self.param_names})
        
        # 对每个参数进行微小扰动
        for name in self.param_names:
            lower, upper = self.param_bounds[name]
            param_range = upper - lower
            delta = param_range * 0.01  # 使用参数范围的1%作为扰动量
            
            # 正向扰动
            with torch.no_grad():
                self.params[name].add_(delta)
            pos_loss = self.loss_fn({n: self.params[n].item() for n in self.param_names})
            
            # 负向扰动
            with torch.no_grad():
                self.params[name].add_(-2*delta)  # 从+delta到-delta
            neg_loss = self.loss_fn({n: self.params[n].item() for n in self.param_names})
            
            # 恢复原值
            with torch.no_grad():
                self.params[name].copy_(torch.tensor([current_values[name]], 
                                                  device=self.device,
                                                  dtype=torch.float32))
            
            # 计算敏感度（中心差分近似）
            sensitivity = abs((pos_loss - neg_loss) / (2 * delta))
            sensitivities[name] = sensitivity
        
        # 归一化敏感度
        max_sensitivity = max(sensitivities.values()) if sensitivities else 1.0
        normalized_sensitivities = {name: s/max_sensitivity for name, s in sensitivities.items()}
        
        # 更新权重因子
        threshold = self.adaptive_weights["sensitivity_threshold"]
        for name in self.param_names:
            sensitivity = normalized_sensitivities.get(name, 0.0)
            # 敏感度高的参数减小学习率，敏感度低的参数增大学习率
            if sensitivity > threshold:
                # 敏感参数权重降低
                self.adaptive_weights["factors"][name] = 1.0 / (1.0 + sensitivity)
            else:
                # 不敏感参数权重提高
                self.adaptive_weights["factors"][name] = 1.0 + (threshold - sensitivity)
        
        # 记录权重因子
        self.adaptive_weights["history"].append({
            "iteration": iteration,
            "sensitivities": normalized_sensitivities.copy(),
            "weights": self.adaptive_weights["factors"].copy()
        })
        
        logger.info(f"迭代 {iteration}: 更新自适应权重因子: {self.adaptive_weights['factors']}")
    
    def optimize(self, callback: Optional[Callable] = None) -> Dict[str, Any]:
        """执行参数优化
        
        参数:
            callback: 回调函数，接收当前状态信息
            
        返回:
            优化结果字典
        """
        if not HAS_TORCH:
            logger.error("PyTorch未找到，无法执行优化")
            return {"success": False, "error": "PyTorch未找到"}
            
        start_time = time.time()
        logger.info("开始参数优化...")
        
        # 迭代优化
        for iteration in range(self.max_iterations):
            # 执行优化步骤
            if self.optimizer_type.lower() == "lbfgs":
                # L-BFGS需要闭包函数
                def closure():
                    self.optimizer.zero_grad()
                    current_params = {name: self.params[name].item() for name in self.param_names}
                    loss = torch.tensor(self.loss_fn(current_params), 
                                     device=self.device, 
                                     dtype=torch.float32, 
                                     requires_grad=True)
                    loss.backward()
                    return loss
                self.optimizer.step(closure)
                
                # 获取当前损失
                current_params = {name: self.params[name].item() for name in self.param_names}
                loss = self.loss_fn(current_params)
            else:
                # 标准优化器（如Adam, SGD）
                self.optimizer.zero_grad()
                current_params = {name: self.params[name].item() for name in self.param_names}
                loss = torch.tensor(self.loss_fn(current_params), 
                                 device=self.device, 
                                 dtype=torch.float32, 
                                 requires_grad=True)
                loss.backward()
                
                # 应用自适应权重
                if self.adaptive_weights["enabled"]:
                    with torch.no_grad():
                        for name in self.param_names:
                            if self.params[name].grad is not None:
                                weight = self.adaptive_weights["factors"][name]
                                self.params[name].grad.mul_(weight)
                
                self.optimizer.step()
            
            # 剪裁参数到合法范围
            self._clip_parameters()
            
            # 计算梯度范数
            grad_norm = 0.0
            with torch.no_grad():
                for name in self.param_names:
                    if self.params[name].grad is not None:
                        grad_norm += torch.norm(self.params[name].grad).item() ** 2
                grad_norm = np.sqrt(grad_norm)
            
            # 记录历史
            current_params = {name: self.params[name].item() for name in self.param_names}
            self.history["loss"].append(loss.item() if isinstance(loss, torch.Tensor) else loss)
            self.history["params"].append(current_params.copy())
            self.history["grad_norm"].append(grad_norm)
            
            # 获取当前学习率
            for param_group in self.optimizer.param_groups:
                current_lr = param_group['lr']
                self.history["learning_rates"].append(current_lr)
                break
            
            # 更新自适应权重
            self._update_adaptive_weights(iteration)
            
            # 显示进度
            if iteration % 10 == 0 or iteration == self.max_iterations - 1:
                param_str = ", ".join([f"{name}: {current_params[name]:.6f}" for name in self.param_names])
                logger.info(f"迭代 {iteration}: 损失 = {loss:.6e}, 梯度范数 = {grad_norm:.6e}, 参数 = {{{param_str}}}")
                
                # 调用回调函数
                if callback is not None:
                    callback({
                        "iteration": iteration,
                        "loss": loss.item() if isinstance(loss, torch.Tensor) else loss,
                        "params": current_params,
                        "grad_norm": grad_norm
                    })
            
            # 检查收敛
            if iteration > 10 and grad_norm < self.convergence_tol:
                logger.info(f"在迭代 {iteration} 收敛，梯度范数 = {grad_norm:.6e} < 容差 {self.convergence_tol}")
                break
        
        # 优化完成
        end_time = time.time()
        elapsed_time = end_time - start_time
        
        # 获取最终参数
        final_params = {name: self.params[name].item() for name in self.param_names}
        final_loss = self.loss_fn(final_params)
        
        logger.info(f"参数优化完成，耗时 {elapsed_time:.2f} 秒")
        logger.info(f"最终损失: {final_loss:.6e}")
        logger.info(f"最终参数: {final_params}")
        
        # 执行不确定性量化（如果启用）
        if self.uncertainty["enabled"]:
            self._quantify_uncertainty(final_params)
        
        # 构建结果
        result = {
            "success": True,
            "params": final_params,
            "loss": final_loss,
            "iterations": len(self.history["loss"]),
            "elapsed_time": elapsed_time,
            "history": self.history,
            "uncertainty": self.uncertainty if self.uncertainty["enabled"] else None
        }
        
        return result
    
    def _quantify_uncertainty(self, optimal_params: Dict[str, float]) -> None:
        """对优化参数进行不确定性量化
        
        使用拉丁超立方采样方法在参数空间进行采样，评估参数的不确定性
        
        参数:
            optimal_params: 最优参数值
        """
        if not HAS_TORCH:
            return
            
        logger.info("开始执行不确定性量化...")
        
        # 参数数量
        n_params = len(self.param_names)
        n_samples = self.uncertainty["samples"]
        
        # 采样范围：以最优值为中心，参数范围的±10%
        sampling_ranges = {}
        for name in self.param_names:
            optimal_value = optimal_params[name]
            lower, upper = self.param_bounds[name]
            param_range = upper - lower
            
            # 采样范围
            sample_lower = max(lower, optimal_value - 0.1 * param_range)
            sample_upper = min(upper, optimal_value + 0.1 * param_range)
            sampling_ranges[name] = (sample_lower, sample_upper)
        
        # 拉丁超立方采样
        try:
            from scipy.stats import qmc
            
            # 创建采样器
            sampler = qmc.LatinHypercube(d=n_params)
            samples = sampler.random(n=n_samples)
            
            # 转换到参数空间
            param_samples = []
            for i in range(n_samples):
                sample_dict = {}
                for j, name in enumerate(self.param_names):
                    lower, upper = sampling_ranges[name]
                    sample_dict[name] = lower + samples[i, j] * (upper - lower)
                param_samples.append(sample_dict)
                
            # 评估样本
            losses = []
            for sample in param_samples:
                loss = self.loss_fn(sample)
                losses.append(loss)
                
            # 计算统计量
            mean_loss = np.mean(losses)
            std_loss = np.std(losses)
            
            # 计算参数的平均值和标准差
            param_stats = {}
            for name in self.param_names:
                values = [sample[name] for sample in param_samples]
                param_stats[name] = {
                    "mean": np.mean(values),
                    "std": np.std(values),
                    "min": np.min(values),
                    "max": np.max(values)
                }
                
            # 计算置信区间
            alpha = 1 - self.uncertainty["confidence_level"]
            confidence_intervals = {}
            for name in self.param_names:
                values = [sample[name] for sample in param_samples]
                lower_percentile = alpha / 2 * 100
                upper_percentile = (1 - alpha / 2) * 100
                lower_bound = np.percentile(values, lower_percentile)
                upper_bound = np.percentile(values, upper_percentile)
                confidence_intervals[name] = (lower_bound, upper_bound)
            
            # 保存结果
            self.uncertainty["results"] = {
                "samples": param_samples,
                "losses": losses,
                "mean_loss": mean_loss,
                "std_loss": std_loss,
                "param_stats": param_stats
            }
            self.uncertainty["confidence_intervals"] = confidence_intervals
            
            # 输出结果
            logger.info(f"不确定性量化完成，样本数: {n_samples}")
            logger.info(f"损失均值: {mean_loss:.6e}, 标准差: {std_loss:.6e}")
            for name in self.param_names:
                ci = confidence_intervals[name]
                logger.info(f"参数 {name}: {optimal_params[name]:.6f}, "
                          f"95%置信区间: [{ci[0]:.6f}, {ci[1]:.6f}]")
                
        except ImportError:
            logger.warning("未找到SciPy，不能执行拉丁超立方采样")
            
            # 使用简单的随机采样作为替代
            import random
            
            # 随机采样
            param_samples = []
            for _ in range(n_samples):
                sample_dict = {}
                for name in self.param_names:
                    lower, upper = sampling_ranges[name]
                    sample_dict[name] = random.uniform(lower, upper)
                param_samples.append(sample_dict)
                
            # 其余代码与上面相同
            # ...（省略重复代码）

def create_optimizer(param_config: Dict[str, Any], loss_fn: Callable) -> ParameterOptimizer:
    """创建参数优化器
    
    参数:
        param_config: 参数配置字典
        loss_fn: 损失函数
        
    返回:
        参数优化器实例
    """
    # 提取配置
    param_names = param_config.get("names", [])
    param_bounds = param_config.get("bounds", {})
    initial_values = param_config.get("initial_values", {})
    optimizer_type = param_config.get("optimizer", "adam")
    learning_rate = param_config.get("learning_rate", 0.001)
    weight_decay = param_config.get("weight_decay", 0.0)
    max_iterations = param_config.get("max_iterations", 1000)
    convergence_tol = param_config.get("convergence_tol", 1e-5)
    
    # 创建优化器
    optimizer = ParameterOptimizer(
        param_names=param_names,
        param_bounds=param_bounds,
        loss_fn=loss_fn,
        optimizer_type=optimizer_type,
        learning_rate=learning_rate,
        weight_decay=weight_decay,
        max_iterations=max_iterations,
        convergence_tol=convergence_tol
    )
    
    # 设置初始值
    if initial_values:
        optimizer.set_initial_values(initial_values)
    
    # 配置自适应权重
    adaptive_weights = param_config.get("adaptive_weights", {})
    if adaptive_weights.get("enabled", False):
        optimizer.enable_adaptive_weights(
            update_interval=adaptive_weights.get("update_interval", 50),
            sensitivity_threshold=adaptive_weights.get("sensitivity_threshold", 0.1)
        )
    
    # 配置不确定性量化
    uncertainty = param_config.get("uncertainty", {})
    if uncertainty.get("enabled", False):
        optimizer.enable_uncertainty_quantification(
            samples=uncertainty.get("samples", 100),
            confidence_level=uncertainty.get("confidence_level", 0.95)
        )
    
    return optimizer 