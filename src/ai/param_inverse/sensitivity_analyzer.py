#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
参数敏感性分析模块

该模块提供全局参数敏感性分析功能，支持多种分析方法，包括Morris方法和基本分析法，
用于确定哪些参数对模型输出有显著影响。

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
logger = logging.getLogger("SensitivityAnalysis")

class SensitivityAnalyzer:
    """参数敏感性分析器，用于评估模型参数的重要性"""
    
    def __init__(
        self,
        param_names: List[str],
        param_bounds: Dict[str, Tuple[float, float]],
        model_fn: Callable,
        method: str = "morris",
        num_samples: int = 1000,
        parallel: bool = True
    ):
        """初始化敏感性分析器
        
        参数:
            param_names: 参数名称列表
            param_bounds: 参数上下界字典 {param_name: (lower_bound, upper_bound)}
            model_fn: 模型函数，接收参数字典返回输出(可以是标量或向量)
            method: 分析方法，支持'morris'和'basic'
            num_samples: 样本数量
            parallel: 是否使用并行计算
        """
        self.param_names = param_names
        self.param_bounds = param_bounds
        self.model_fn = model_fn
        self.method = method.lower()
        self.num_samples = num_samples
        self.parallel = parallel
        
        # 初始化结果
        self.results = None
        self.samples = None
        self.model_outputs = None
        
        logger.info(f"敏感性分析器初始化完成，使用方法: {self.method}, 样本数: {num_samples}")
    
    def _prepare_samples(self) -> np.ndarray:
        """准备采样点
        
        返回:
            样本数组，形状为(样本数, 参数数)
        """
        # 使用拉丁超立方采样
        try:
            from scipy.stats import qmc
            sampler = qmc.LatinHypercube(d=len(self.param_names))
            samples = sampler.random(n=self.num_samples)
            
            # 缩放到参数范围
            for i, name in enumerate(self.param_names):
                lower, upper = self.param_bounds[name]
                samples[:, i] = lower + samples[:, i] * (upper - lower)
            
            return samples
        except ImportError:
            # 退回到简单随机采样
            logger.warning("未找到SciPy，使用简单随机采样")
            samples = np.random.random((self.num_samples, len(self.param_names)))
            
            # 缩放到参数范围
            for i, name in enumerate(self.param_names):
                lower, upper = self.param_bounds[name]
                samples[:, i] = lower + samples[:, i] * (upper - lower)
            
            return samples
    
    def _evaluate_model(self, samples: np.ndarray) -> np.ndarray:
        """评估模型在所有采样点上的输出
        
        参数:
            samples: 样本数组，形状为(样本数, 参数数)
            
        返回:
            模型输出数组
        """
        outputs = []
        sample_dicts = []
        
        # 准备样本字典
        for i in range(samples.shape[0]):
            sample_dict = {}
            for j, name in enumerate(self.param_names):
                sample_dict[name] = samples[i, j]
            sample_dicts.append(sample_dict)
        
        # 并行计算
        if self.parallel:
            with ProcessPoolExecutor() as executor:
                # 提交所有任务
                futures = [executor.submit(self.model_fn, params) for params in sample_dicts]
                
                # 收集结果
                for future in as_completed(futures):
                    outputs.append(future.result())
        else:
            # 串行计算
            for params in sample_dicts:
                outputs.append(self.model_fn(params))
        
        # 转换为数组
        return np.array(outputs)
    
    def _analyze_basic(self, samples: np.ndarray, outputs: np.ndarray) -> Dict[str, Dict[str, float]]:
        """基础敏感性分析
        
        使用相关性和单参数扰动分析
        
        参数:
            samples: 样本数组
            outputs: 输出数组
            
        返回:
            分析结果字典
        """
        results = {}
        
        # 确保输出是一维的
        if len(outputs.shape) > 1:
            logger.warning("模型输出是多维的，将使用第一维进行分析")
            outputs = outputs[:, 0]
        
        # 计算相关系数
        correlations = {}
        for i, name in enumerate(self.param_names):
            corr = np.corrcoef(samples[:, i], outputs)[0, 1]
            correlations[name] = corr
            
        # 计算单参数扰动敏感度
        sensitivities = {}
        for i, name in enumerate(self.param_names):
            # 参数范围
            lower, upper = self.param_bounds[name]
            param_range = upper - lower
            
            # 选择代表性样本点（使用中位数）
            median_indices = np.argsort(samples[:, i])
            median_idx = median_indices[len(median_indices) // 2]
            base_point = samples[median_idx].copy()
            base_output = outputs[median_idx]
            
            # 正向扰动
            pos_point = base_point.copy()
            pos_point[i] = min(base_point[i] + 0.05 * param_range, upper)
            
            # 负向扰动
            neg_point = base_point.copy()
            neg_point[i] = max(base_point[i] - 0.05 * param_range, lower)
            
            # 计算模型输出
            pos_params = {name: pos_point[j] for j, name in enumerate(self.param_names)}
            neg_params = {name: neg_point[j] for j, name in enumerate(self.param_names)}
            
            pos_output = self.model_fn(pos_params)
            neg_output = self.model_fn(neg_params)
            
            # 计算敏感度
            if isinstance(pos_output, (list, np.ndarray)):
                pos_output = pos_output[0]
                neg_output = neg_output[0]
            
            sensitivity = abs((pos_output - neg_output) / (pos_point[i] - neg_point[i]))
            normalized_sensitivity = sensitivity * param_range / abs(base_output) if base_output != 0 else sensitivity * param_range
            
            sensitivities[name] = normalized_sensitivity
        
        # 归一化敏感度
        max_sensitivity = max(sensitivities.values()) if sensitivities else 1.0
        normalized_sensitivities = {name: s/max_sensitivity for name, s in sensitivities.items()}
        
        results = {
            "correlations": correlations,
            "sensitivities": sensitivities,
            "normalized_sensitivities": normalized_sensitivities
        }
        
        return results
    
    def analyze(self) -> Dict[str, Any]:
        """执行敏感性分析
        
        返回:
            分析结果
        """
        start_time = time.time()
        logger.info(f"开始执行敏感性分析: {self.method}...")
        
        # 准备样本
        self.samples = self._prepare_samples()
        logger.info(f"样本准备完成，样本数: {self.samples.shape[0]}")
        
        # 评估模型
        logger.info("开始评估模型...")
        self.model_outputs = self._evaluate_model(self.samples)
        logger.info("模型评估完成")
        
        # 分析结果
        self.results = self._analyze_basic(self.samples, self.model_outputs)
        
        # 处理结果
        processed_results = self._process_results()
        
        end_time = time.time()
        elapsed_time = end_time - start_time
        logger.info(f"敏感性分析完成，耗时: {elapsed_time:.2f}秒")
        
        return processed_results
    
    def _process_results(self) -> Dict[str, Any]:
        """将分析结果处理为统一格式
        
        返回:
            分析结果
        """
        # 已经处理为字典格式
        importance = {name: abs(sens) for name, sens in self.results["normalized_sensitivities"].items()}
        return {
            "method": "basic",
            "parameter_importance": importance,
            "correlations": self.results["correlations"],
            "detailed_results": self.results
        }
    
    def plot_results(self, output_file: Optional[str] = None) -> None:
        """绘制敏感性分析图
        
        参数:
            output_file: 输出文件路径，None表示显示图
        """
        if self.results is None:
            logger.error("请先执行analyze()")
            return
        
        # 获取分析结果
        processed_results = self._process_results()
        importance = processed_results["parameter_importance"]
        
        # 排序
        sorted_items = sorted(importance.items(), key=lambda x: x[1], reverse=True)
        param_names = [item[0] for item in sorted_items]
        param_importance = [item[1] for item in sorted_items]
        
        # 绘制图表
        plt.figure(figsize=(10, 6))
        bars = plt.bar(param_names, param_importance)
        
        # 添加数值标签
        for bar in bars:
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height + 0.01,
                    f'{height:.3f}', ha='center', va='bottom')
        
        plt.xlabel('参数')
        plt.ylabel('敏感度')
        plt.title(f'敏感性分析图 (方法: {self.method})')
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        # 显示图表
        if output_file:
            plt.savefig(output_file, dpi=300)
            logger.info(f"图表保存到: {output_file}")
        else:
            plt.show()
    
    def generate_report(self, output_file: str) -> None:
        """生成敏感性分析报告
        
        参数:
            output_file: 输出文件路径
        """
        if self.results is None:
            logger.error("请先执行analyze()")
            return
        
        # 获取分析结果
        processed_results = self._process_results()
        
        # 生成报告
        report = []
        report.append("# 敏感性分析报告")
        report.append(f"分析方法: {self.method}")
        report.append(f"样本数: {self.samples.shape[0]}")
        report.append(f"参数数: {len(self.param_names)}")
        report.append("")
        
        report.append("## 重要参数")
        importance = processed_results["parameter_importance"]
        sorted_items = sorted(importance.items(), key=lambda x: x[1], reverse=True)
        
        report.append("| 序号 | 参数 | 敏感度 |")
        report.append("|------|------|--------|")
        for i, (name, value) in enumerate(sorted_items):
            report.append(f"| {i+1} | {name} | {value:.6f} |")
        report.append("")
        
        # 写入文件
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(report))
        
        logger.info(f"敏感性分析报告保存到: {output_file}")


def analyze_sensitivity(
    param_names: List[str],
    param_bounds: Dict[str, Tuple[float, float]],
    model_fn: Callable,
    method: str = "basic",
    num_samples: int = 1000,
    parallel: bool = True,
    plot: bool = True,
    output_dir: Optional[str] = None
) -> Dict[str, Any]:
    """执行敏感性分析
    
    参数:
        param_names: 参数名称列表
        param_bounds: 参数上下界字典 {param_name: (lower_bound, upper_bound)}
        model_fn: 模型函数，接收参数字典返回输出
        method: 分析方法，支持'basic'
        num_samples: 样本数量
        parallel: 是否使用并行计算
        plot: 是否生成平面图
        output_dir: 输出目录，None表示不保存文件
        
    返回:
        敏感性分析结果
    """
    # 创建分析器
    analyzer = SensitivityAnalyzer(
        param_names=param_names,
        param_bounds=param_bounds,
        model_fn=model_fn,
        method=method,
        num_samples=num_samples,
        parallel=parallel
    )
    
    # 执行分析
    results = analyzer.analyze()
    
    # 保存文件
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
        timestamp = time.strftime("%Y%m%d-%H%M%S")
        
        # 生成报告
        report_file = os.path.join(output_dir, f"sensitivity_report_{method}_{timestamp}.md")
        analyzer.generate_report(report_file)
        
        # 生成图表
        if plot:
            plot_file = os.path.join(output_dir, f"sensitivity_plot_{method}_{timestamp}.png")
            analyzer.plot_results(plot_file)
    elif plot:
        # 显示图表
        analyzer.plot_results()
    
    return results
