#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
参数不确定性量化模块

该模块提供对反演参数进行不确定性量化的功能，包括蒙特卡洛采样、
置信区间分析和参数相关性分析。用于评估反演参数的可靠性和稳定性。

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
import matplotlib.pyplot as plt
from concurrent.futures import ProcessPoolExecutor, as_completed

# 配置日志
logger = logging.getLogger("UncertaintyQuantification")

class UncertaintyQuantifier:
    """参数不确定性量化器，用于评估反演参数的不确定性"""
    
    def __init__(
        self,
        param_names: List[str],
        param_values: Dict[str, float],
        param_bounds: Dict[str, Tuple[float, float]],
        loss_fn: Callable,
        sampling_method: str = "monte_carlo",
        num_samples: int = 1000,
        confidence_level: float = 0.95,
        parallel: bool = True,
        max_workers: int = None
    ):
        """初始化不确定性量化器
        
        参数:
            param_names: 参数名称列表
            param_values: 参数最优值字典 {param_name: value}
            param_bounds: 参数上下界字典 {param_name: (lower_bound, upper_bound)}
            loss_fn: 损失函数，接收参数字典返回损失值
            sampling_method: 采样方法，支持'monte_carlo', 'latin_hypercube'
            num_samples: 样本数量
            confidence_level: 置信水平
            parallel: 是否使用并行计算
            max_workers: 最大工作进程数，None表示使用CPU核心数
        """
        self.param_names = param_names
        self.param_values = param_values
        self.param_bounds = param_bounds
        self.loss_fn = loss_fn
        self.sampling_method = sampling_method.lower()
        self.num_samples = num_samples
        self.confidence_level = confidence_level
        self.parallel = parallel
        self.max_workers = max_workers
        
        # 初始化结果
        self.samples = None
        self.losses = None
        self.confidence_intervals = None
        self.parameter_statistics = None
        self.correlation_matrix = None
        
        logger.info(f"不确定性量化器初始化完成，采样方法: {sampling_method}, 样本数: {num_samples}")
    
    def _generate_samples(self) -> List[Dict[str, float]]:
        """生成参数样本
        
        返回:
            参数样本列表，每个样本是一个参数字典
        """
        # 计算采样范围
        sampling_ranges = {}
        for name in self.param_names:
            lower, upper = self.param_bounds[name]
            optimal_value = self.param_values[name]
            
            # 默认使用参数范围的±10%
            param_range = upper - lower
            range_factor = 0.1
            
            # 采样范围
            sample_lower = max(lower, optimal_value - range_factor * param_range)
            sample_upper = min(upper, optimal_value + range_factor * param_range)
            sampling_ranges[name] = (sample_lower, sample_upper)
            
        # 生成样本
        if self.sampling_method == "latin_hypercube":
            try:
                from scipy.stats import qmc
                
                # 创建拉丁超立方采样器
                sampler = qmc.LatinHypercube(d=len(self.param_names))
                sample_points = sampler.random(n=self.num_samples)
                
                # 转换到参数空间
                samples = []
                for i in range(self.num_samples):
                    sample_dict = {}
                    for j, name in enumerate(self.param_names):
                        lower, upper = sampling_ranges[name]
                        sample_dict[name] = lower + sample_points[i, j] * (upper - lower)
                    samples.append(sample_dict)
                
                return samples
            except ImportError:
                logger.warning("未找到SciPy，回退到蒙特卡洛采样")
                self.sampling_method = "monte_carlo"
        
        # 蒙特卡洛采样
        if self.sampling_method == "monte_carlo":
            samples = []
            for _ in range(self.num_samples):
                sample_dict = {}
                for name in self.param_names:
                    lower, upper = sampling_ranges[name]
                    sample_dict[name] = np.random.uniform(lower, upper)
                samples.append(sample_dict)
            
            return samples
    
    def _evaluate_samples(self, samples: List[Dict[str, float]]) -> np.ndarray:
        """评估样本的损失值
        
        参数:
            samples: 参数样本列表
            
        返回:
            损失值数组
        """
        losses = []
        
        # 并行计算
        if self.parallel:
            with ProcessPoolExecutor(max_workers=self.max_workers) as executor:
                # 提交所有任务
                futures = [executor.submit(self.loss_fn, sample) for sample in samples]
                
                # 收集结果
                for future in as_completed(futures):
                    losses.append(future.result())
        else:
            # 串行计算
            for sample in samples:
                losses.append(self.loss_fn(sample))
        
        return np.array(losses)
    
    def _calculate_confidence_intervals(self) -> Dict[str, Tuple[float, float]]:
        """计算参数置信区间
        
        返回:
            参数置信区间字典 {param_name: (lower, upper)}
        """
        alpha = 1 - self.confidence_level
        confidence_intervals = {}
        
        # 提取每个参数的样本值
        param_samples = {}
        for name in self.param_names:
            param_samples[name] = [sample[name] for sample in self.samples]
        
        # 计算置信区间
        for name in self.param_names:
            values = param_samples[name]
            lower_percentile = alpha / 2 * 100
            upper_percentile = (1 - alpha / 2) * 100
            lower_bound = np.percentile(values, lower_percentile)
            upper_bound = np.percentile(values, upper_percentile)
            confidence_intervals[name] = (lower_bound, upper_bound)
        
        return confidence_intervals
    
    def _calculate_parameter_statistics(self) -> Dict[str, Dict[str, float]]:
        """计算参数统计信息
        
        返回:
            参数统计信息字典 {param_name: {mean, std, min, max}}
        """
        # 提取每个参数的样本值
        param_samples = {}
        for name in self.param_names:
            param_samples[name] = [sample[name] for sample in self.samples]
        
        # 计算统计信息
        stats = {}
        for name in self.param_names:
            values = np.array(param_samples[name])
            stats[name] = {
                "mean": np.mean(values),
                "std": np.std(values),
                "min": np.min(values),
                "max": np.max(values),
                "median": np.median(values)
            }
        
        return stats
    
    def _calculate_correlation_matrix(self) -> np.ndarray:
        """计算参数相关性矩阵
        
        返回:
            相关性矩阵
        """
        # 提取每个参数的样本值
        param_samples = {}
        for name in self.param_names:
            param_samples[name] = [sample[name] for sample in self.samples]
        
        # 构建参数值矩阵
        param_values = np.zeros((self.num_samples, len(self.param_names)))
        for i, name in enumerate(self.param_names):
            param_values[:, i] = param_samples[name]
        
        # 计算相关性矩阵
        correlation_matrix = np.corrcoef(param_values.T)
        
        return correlation_matrix
    
    def quantify(self) -> Dict[str, Any]:
        """执行不确定性量化
        
        返回:
            不确定性量化结果
        """
        start_time = time.time()
        logger.info(f"开始参数不确定性量化，采样方法: {self.sampling_method}...")
        
        # 生成样本
        self.samples = self._generate_samples()
        logger.info(f"生成样本完成，样本数: {len(self.samples)}")
        
        # 评估样本
        self.losses = self._evaluate_samples(self.samples)
        logger.info("样本评估完成")
        
        # 计算置信区间
        self.confidence_intervals = self._calculate_confidence_intervals()
        
        # 计算参数统计信息
        self.parameter_statistics = self._calculate_parameter_statistics()
        
        # 计算相关性矩阵
        self.correlation_matrix = self._calculate_correlation_matrix()
        
        end_time = time.time()
        elapsed_time = end_time - start_time
        logger.info(f"不确定性量化完成，耗时: {elapsed_time:.2f}秒")
        
        # 构建结果
        result = {
            "optimal_parameters": self.param_values.copy(),
            "confidence_intervals": self.confidence_intervals,
            "parameter_statistics": self.parameter_statistics,
            "correlation_matrix": self.correlation_matrix.tolist(),
            "sampling_method": self.sampling_method,
            "num_samples": self.num_samples,
            "confidence_level": self.confidence_level
        }
        
        # 输出结果摘要
        for name in self.param_names:
            ci = self.confidence_intervals[name]
            stats = self.parameter_statistics[name]
            logger.info(f"参数 {name}: 最优值 = {self.param_values[name]:.6f}, " +
                      f"{self.confidence_level*100:.1f}%置信区间 = [{ci[0]:.6f}, {ci[1]:.6f}], " +
                      f"均值 = {stats['mean']:.6f}, 标准差 = {stats['std']:.6f}")
        
        return result
    
    def plot_histograms(self, output_dir: Optional[str] = None) -> None:
        """绘制参数直方图
        
        参数:
            output_dir: 输出目录，None表示仅显示图形
        """
        if self.samples is None:
            logger.error("请先运行quantify()方法")
            return
        
        # 为每个参数绘制直方图
        for name in self.param_names:
            # 提取参数值
            values = [sample[name] for sample in self.samples]
            
            # 创建图形
            plt.figure(figsize=(10, 6))
            
            # 绘制直方图
            n, bins, patches = plt.hist(values, bins=30, alpha=0.7, color='skyblue')
            
            # 添加最优值和置信区间
            optimal_value = self.param_values[name]
            ci_lower, ci_upper = self.confidence_intervals[name]
            
            # 最优值线
            plt.axvline(optimal_value, color='red', linestyle='dashed', linewidth=2, label=f'最优值: {optimal_value:.6f}')
            
            # 置信区间
            plt.axvline(ci_lower, color='green', linestyle='dashed', linewidth=1.5, label=f'下限: {ci_lower:.6f}')
            plt.axvline(ci_upper, color='green', linestyle='dashed', linewidth=1.5, label=f'上限: {ci_upper:.6f}')
            
            # 添加标题和标签
            plt.title(f'参数 {name} 的不确定性分布')
            plt.xlabel(name)
            plt.ylabel('频率')
            plt.legend()
            plt.grid(True, alpha=0.3)
            plt.tight_layout()
            
            # 保存或显示
            if output_dir:
                os.makedirs(output_dir, exist_ok=True)
                plt.savefig(os.path.join(output_dir, f"uncertainty_{name}.png"), dpi=300)
                plt.close()
            else:
                plt.show()
    
    def plot_correlation_matrix(self, output_file: Optional[str] = None) -> None:
        """绘制参数相关性矩阵
        
        参数:
            output_file: 输出文件路径，None表示仅显示图形
        """
        if self.correlation_matrix is None:
            logger.error("请先运行quantify()方法")
            return
        
        # 创建图形
        plt.figure(figsize=(10, 8))
        
        # 绘制热力图
        im = plt.imshow(self.correlation_matrix, cmap='coolwarm', vmin=-1, vmax=1)
        
        # 添加颜色条
        cbar = plt.colorbar(im)
        cbar.set_label('相关系数')
        
        # 设置刻度和标签
        tick_marks = np.arange(len(self.param_names))
        plt.xticks(tick_marks, self.param_names, rotation=45)
        plt.yticks(tick_marks, self.param_names)
        
        # 添加相关系数文本
        for i in range(len(self.param_names)):
            for j in range(len(self.param_names)):
                text = plt.text(j, i, f'{self.correlation_matrix[i, j]:.2f}',
                               ha="center", va="center", color="black" if abs(self.correlation_matrix[i, j]) < 0.7 else "white")
        
        # 添加标题
        plt.title('参数相关性矩阵')
        plt.tight_layout()
        
        # 保存或显示
        if output_file:
            plt.savefig(output_file, dpi=300)
            logger.info(f"相关性矩阵已保存至: {output_file}")
            plt.close()
        else:
            plt.show()
    
    def generate_report(self, output_file: str) -> None:
        """生成不确定性分析报告
        
        参数:
            output_file: 输出文件路径
        """
        if self.confidence_intervals is None:
            logger.error("请先运行quantify()方法")
            return
        
        # 创建报告
        report = []
        report.append("# 参数不确定性分析报告")
        report.append(f"采样方法: {self.sampling_method}")
        report.append(f"样本数量: {self.num_samples}")
        report.append(f"置信水平: {self.confidence_level*100:.1f}%")
        report.append("")
        
        report.append("## 参数置信区间")
        report.append("| 参数 | 最优值 | 均值 | 标准差 | 置信区间下限 | 置信区间上限 | 相对不确定性 |")
        report.append("|------|--------|------|--------|--------------|--------------|--------------|")
        
        for name in self.param_names:
            optimal = self.param_values[name]
            stats = self.parameter_statistics[name]
            ci_lower, ci_upper = self.confidence_intervals[name]
            
            # 计算相对不确定性
            uncertainty = (ci_upper - ci_lower) / (2 * abs(optimal)) if optimal != 0 else float('inf')
            uncertainty_percent = uncertainty * 100
            
            report.append(f"| {name} | {optimal:.6f} | {stats['mean']:.6f} | {stats['std']:.6f} | " +
                        f"{ci_lower:.6f} | {ci_upper:.6f} | {uncertainty_percent:.2f}% |")
        
        report.append("")
        report.append("## 参数相关性矩阵")
        report.append("| 参数 | " + " | ".join(self.param_names) + " |")
        
        # 添加分隔行
        separator = "|------|" + "".join(["------|" for _ in self.param_names])
        report.append(separator)
        
        # 添加相关性数据
        for i, name1 in enumerate(self.param_names):
            row = f"| {name1} |"
            for j, name2 in enumerate(self.param_names):
                row += f" {self.correlation_matrix[i, j]:.3f} |"
            report.append(row)
        
        # 写入文件
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(report))
        
        logger.info(f"不确定性分析报告已保存至: {output_file}")

def quantify_uncertainty(
    param_names: List[str],
    param_values: Dict[str, float],
    param_bounds: Dict[str, Tuple[float, float]],
    loss_fn: Callable,
    sampling_method: str = "latin_hypercube",
    num_samples: int = 1000,
    confidence_level: float = 0.95,
    parallel: bool = True,
    output_dir: Optional[str] = None
) -> Dict[str, Any]:
    """量化参数不确定性
    
    参数:
        param_names: 参数名称列表
        param_values: 参数最优值字典
        param_bounds: 参数上下界字典
        loss_fn: 损失函数
        sampling_method: 采样方法
        num_samples: 样本数量
        confidence_level: 置信水平
        parallel: 是否使用并行计算
        output_dir: 输出目录
        
    返回:
        不确定性量化结果
    """
    # 创建量化器
    quantifier = UncertaintyQuantifier(
        param_names=param_names,
        param_values=param_values,
        param_bounds=param_bounds,
        loss_fn=loss_fn,
        sampling_method=sampling_method,
        num_samples=num_samples,
        confidence_level=confidence_level,
        parallel=parallel
    )
    
    # 执行量化
    result = quantifier.quantify()
    
    # 输出文件
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        
        # 生成报告
        report_file = os.path.join(output_dir, f"uncertainty_report_{timestamp}.md")
        quantifier.generate_report(report_file)
        
        # 绘制直方图
        hist_dir = os.path.join(output_dir, f"histograms_{timestamp}")
        quantifier.plot_histograms(hist_dir)
        
        # 绘制相关性矩阵
        corr_file = os.path.join(output_dir, f"correlation_matrix_{timestamp}.png")
        quantifier.plot_correlation_matrix(corr_file)
    
    return result 