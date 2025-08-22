#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
高级结果分析工具 - Advanced Result Analysis Tools
专业的桥墩冲刷分析后处理系统

Features:
- 参数敏感性分析
- 时间序列分析
- 统计分析和不确定性量化
- 多方法结果对比
- 专业报告生成
- 风险评估和可靠性分析
"""

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.gridspec import GridSpec
from matplotlib.colors import LinearSegmentedColormap
import seaborn as sns
from typing import Dict, Any, List, Tuple, Optional, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import json
import pandas as pd
from datetime import datetime
import warnings

# 科学计算库
try:
    from scipy import stats, interpolate, optimize
    from scipy.spatial.distance import pdist, squareform
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

# 机器学习库
try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.metrics import r2_score, mean_squared_error
    from sklearn.preprocessing import StandardScaler
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

# 本地模块
from .empirical_solver import ScourParameters, ScourResult, PierShape
from .advanced_solver import SolverResult, NumericalParameters
from .advanced_materials import FluidProperties, SedimentProperties, BedProperties


class AnalysisType(Enum):
    """分析类型"""
    SENSITIVITY = "sensitivity"
    UNCERTAINTY = "uncertainty"
    MONTE_CARLO = "monte_carlo"
    TIME_SERIES = "time_series"
    COMPARATIVE = "comparative"
    STATISTICAL = "statistical"
    RELIABILITY = "reliability"


class VisualizationStyle(Enum):
    """可视化风格"""
    SCIENTIFIC = "scientific"
    ENGINEERING = "engineering"
    PRESENTATION = "presentation"
    PUBLICATION = "publication"


@dataclass
class SensitivityResult:
    """敏感性分析结果"""
    parameter_name: str
    parameter_values: List[float]
    output_values: List[float]
    sensitivity_coefficient: float
    correlation_coefficient: float
    p_value: float
    confidence_interval: Tuple[float, float]
    relative_importance: float


@dataclass 
class UncertaintyResult:
    """不确定性分析结果"""
    mean_value: float
    std_deviation: float
    confidence_intervals: Dict[float, Tuple[float, float]]  # 置信水平 -> (下界, 上界)
    percentiles: Dict[float, float]  # 百分位数
    distribution_type: str
    distribution_parameters: Dict[str, float]
    monte_carlo_samples: List[float]


@dataclass
class ComparativeResult:
    """对比分析结果"""
    method_names: List[str]
    results: List[float]
    relative_errors: List[float]
    correlation_matrix: np.ndarray
    statistical_tests: Dict[str, Dict[str, float]]
    ranking: List[int]  # 按准确性排名


@dataclass
class ReliabilityResult:
    """可靠性分析结果"""
    failure_probability: float
    reliability_index: float
    design_margins: Dict[str, float]
    critical_parameters: List[str]
    safety_factors: Dict[str, float]


class AdvancedResultAnalyzer:
    """高级结果分析器"""
    
    def __init__(self, style: VisualizationStyle = VisualizationStyle.SCIENTIFIC):
        self.style = style
        self.setup_plotting_style()
        
        # 分析历史
        self.analysis_history = []
        
        # 默认参数范围
        self.default_parameter_ranges = {
            'pier_diameter': (0.5, 5.0),
            'flow_velocity': (0.2, 3.0), 
            'water_depth': (1.0, 10.0),
            'd50': (0.1, 5.0),
            'pier_angle': (0, 45)
        }
        
        # 统计模型
        self.surrogate_model = None
        self.sensitivity_cache = {}
    
    def setup_plotting_style(self):
        """设置绘图风格"""
        plt.style.use('default')
        
        if self.style == VisualizationStyle.SCIENTIFIC:
            plt.rcParams.update({
                'font.family': 'serif',
                'font.size': 10,
                'axes.linewidth': 1.0,
                'grid.alpha': 0.3,
                'legend.frameon': True,
                'legend.fancybox': False
            })
        elif self.style == VisualizationStyle.ENGINEERING:
            plt.rcParams.update({
                'font.family': 'sans-serif',
                'font.size': 11,
                'axes.linewidth': 1.2,
                'grid.alpha': 0.5,
                'axes.grid': True
            })
        elif self.style == VisualizationStyle.PRESENTATION:
            plt.rcParams.update({
                'font.family': 'sans-serif',
                'font.size': 14,
                'axes.linewidth': 2.0,
                'lines.linewidth': 2.5,
                'legend.fontsize': 12
            })
    
    def sensitivity_analysis(self, 
                           base_params: ScourParameters,
                           solver_function: Callable,
                           parameter_ranges: Optional[Dict[str, Tuple[float, float]]] = None,
                           n_samples: int = 20,
                           method: str = 'local') -> Dict[str, SensitivityResult]:
        """参数敏感性分析"""
        
        if parameter_ranges is None:
            parameter_ranges = self.default_parameter_ranges
        
        results = {}
        base_result = solver_function(base_params)
        base_scour = base_result.scour_depth if hasattr(base_result, 'scour_depth') else base_result
        
        for param_name, (min_val, max_val) in parameter_ranges.items():
            if not hasattr(base_params, param_name):
                continue
                
            # 生成参数值序列
            param_values = np.linspace(min_val, max_val, n_samples)
            output_values = []
            
            for param_val in param_values:
                # 创建新参数组合
                params_copy = ScourParameters(
                    pier_diameter=base_params.pier_diameter,
                    pier_shape=base_params.pier_shape,
                    flow_velocity=base_params.flow_velocity,
                    water_depth=base_params.water_depth,
                    d50=base_params.d50,
                    pier_angle=getattr(base_params, 'pier_angle', 0)
                )
                
                setattr(params_copy, param_name, param_val)
                
                # 计算结果
                result = solver_function(params_copy)
                scour_depth = result.scour_depth if hasattr(result, 'scour_depth') else result
                output_values.append(scour_depth)
            
            # 计算敏感性系数
            if SCIPY_AVAILABLE:
                # 线性回归计算敏感性
                slope, intercept, r_value, p_value, std_err = stats.linregress(param_values, output_values)
                
                # 标准化敏感性系数
                base_param_val = getattr(base_params, param_name)
                sensitivity_coeff = slope * base_param_val / base_scour
                
                # 置信区间
                t_val = stats.t.ppf(0.975, len(param_values) - 2)
                conf_interval = (slope - t_val * std_err, slope + t_val * std_err)
                
                results[param_name] = SensitivityResult(
                    parameter_name=param_name,
                    parameter_values=param_values.tolist(),
                    output_values=output_values,
                    sensitivity_coefficient=sensitivity_coeff,
                    correlation_coefficient=r_value,
                    p_value=p_value,
                    confidence_interval=conf_interval,
                    relative_importance=abs(sensitivity_coeff)
                )
            else:
                # 简化计算
                delta_output = max(output_values) - min(output_values)
                delta_input = max_val - min_val
                sensitivity_coeff = delta_output / delta_input
                
                results[param_name] = SensitivityResult(
                    parameter_name=param_name,
                    parameter_values=param_values.tolist(),
                    output_values=output_values,
                    sensitivity_coefficient=sensitivity_coeff,
                    correlation_coefficient=0.0,
                    p_value=1.0,
                    confidence_interval=(0.0, 0.0),
                    relative_importance=abs(sensitivity_coeff)
                )
        
        # 记录分析历史
        self.analysis_history.append({
            'type': AnalysisType.SENSITIVITY,
            'timestamp': datetime.now(),
            'parameters': parameter_ranges,
            'results': results
        })
        
        return results
    
    def uncertainty_quantification(self,
                                 base_params: ScourParameters,
                                 solver_function: Callable,
                                 parameter_uncertainties: Dict[str, Tuple[str, Dict]],
                                 n_samples: int = 1000) -> UncertaintyResult:
        """不确定性量化分析"""
        
        # Monte Carlo采样
        samples = []
        
        for i in range(n_samples):
            # 创建参数副本
            params_copy = ScourParameters(
                pier_diameter=base_params.pier_diameter,
                pier_shape=base_params.pier_shape,
                flow_velocity=base_params.flow_velocity,
                water_depth=base_params.water_depth,
                d50=base_params.d50
            )
            
            # 根据不确定性分布采样
            for param_name, (dist_type, dist_params) in parameter_uncertainties.items():
                if not hasattr(params_copy, param_name):
                    continue
                
                if SCIPY_AVAILABLE:
                    if dist_type == 'normal':
                        value = np.random.normal(dist_params['mean'], dist_params['std'])
                    elif dist_type == 'uniform':
                        value = np.random.uniform(dist_params['low'], dist_params['high'])
                    elif dist_type == 'lognormal':
                        value = np.random.lognormal(dist_params['mean'], dist_params['sigma'])
                    else:
                        value = getattr(base_params, param_name)  # 默认值
                else:
                    # 简化为正态分布
                    if 'mean' in dist_params and 'std' in dist_params:
                        value = np.random.normal(dist_params['mean'], dist_params['std'])
                    else:
                        value = getattr(base_params, param_name)
                
                setattr(params_copy, param_name, value)
            
            # 计算结果
            result = solver_function(params_copy)
            scour_depth = result.scour_depth if hasattr(result, 'scour_depth') else result
            samples.append(scour_depth)
        
        samples = np.array(samples)
        
        # 统计分析
        mean_val = np.mean(samples)
        std_val = np.std(samples)
        
        # 置信区间
        confidence_intervals = {}
        for level in [0.90, 0.95, 0.99]:
            alpha = 1 - level
            lower = np.percentile(samples, 100 * alpha / 2)
            upper = np.percentile(samples, 100 * (1 - alpha / 2))
            confidence_intervals[level] = (lower, upper)
        
        # 百分位数
        percentiles = {}
        for p in [5, 10, 25, 50, 75, 90, 95]:
            percentiles[p] = np.percentile(samples, p)
        
        # 分布拟合
        dist_type = "normal"
        dist_params = {"mean": mean_val, "std": std_val}
        
        if SCIPY_AVAILABLE:
            # 尝试拟合不同分布
            distributions = [stats.norm, stats.lognorm, stats.gamma]
            best_dist = None
            best_p = 0
            
            for dist in distributions:
                try:
                    params = dist.fit(samples)
                    ks_stat, p_value = stats.kstest(samples, lambda x: dist.cdf(x, *params))
                    if p_value > best_p:
                        best_p = p_value
                        best_dist = dist
                        best_params = params
                except:
                    continue
            
            if best_dist is not None:
                dist_type = best_dist.name
                if dist_type == "norm":
                    dist_params = {"mean": best_params[0], "std": best_params[1]}
                elif dist_type == "lognorm":
                    dist_params = {"s": best_params[0], "scale": best_params[2]}
        
        return UncertaintyResult(
            mean_value=mean_val,
            std_deviation=std_val,
            confidence_intervals=confidence_intervals,
            percentiles=percentiles,
            distribution_type=dist_type,
            distribution_parameters=dist_params,
            monte_carlo_samples=samples.tolist()
        )
    
    def comparative_analysis(self,
                           params: ScourParameters,
                           solver_methods: Dict[str, Callable],
                           reference_value: Optional[float] = None) -> ComparativeResult:
        """多方法对比分析"""
        
        method_names = list(solver_methods.keys())
        results = []
        
        # 计算各方法结果
        for method_name, solver_func in solver_methods.items():
            try:
                result = solver_func(params)
                scour_depth = result.scour_depth if hasattr(result, 'scour_depth') else result
                results.append(scour_depth)
            except Exception as e:
                print(f"方法 {method_name} 计算失败: {e}")
                results.append(np.nan)
        
        results = np.array(results)
        valid_mask = ~np.isnan(results)
        valid_results = results[valid_mask]
        valid_names = [name for i, name in enumerate(method_names) if valid_mask[i]]
        
        # 相对误差计算
        if reference_value is not None:
            relative_errors = np.abs(results - reference_value) / reference_value * 100
        else:
            # 使用平均值作为参考
            mean_result = np.nanmean(results)
            relative_errors = np.abs(results - mean_result) / mean_result * 100
        
        # 相关性矩阵
        correlation_matrix = np.eye(len(valid_results))
        if len(valid_results) > 1 and SCIPY_AVAILABLE:
            correlation_matrix = np.corrcoef(valid_results.reshape(1, -1), valid_results.reshape(1, -1))
        
        # 统计检验
        statistical_tests = {}
        if len(valid_results) >= 3 and SCIPY_AVAILABLE:
            # Friedman检验
            try:
                stat, p_value = stats.friedmanchisquare(*valid_results)
                statistical_tests['friedman'] = {'statistic': stat, 'p_value': p_value}
            except:
                pass
        
        # 排名 (按误差排序)
        valid_errors = relative_errors[valid_mask]
        ranking = np.argsort(valid_errors).tolist()
        
        return ComparativeResult(
            method_names=method_names,
            results=results.tolist(),
            relative_errors=relative_errors.tolist(),
            correlation_matrix=correlation_matrix,
            statistical_tests=statistical_tests,
            ranking=ranking
        )
    
    def reliability_analysis(self,
                           base_params: ScourParameters,
                           solver_function: Callable,
                           design_criteria: Dict[str, float],
                           safety_margins: Dict[str, float] = None) -> ReliabilityResult:
        """可靠性分析"""
        
        if safety_margins is None:
            safety_margins = {'scour_depth': 1.5, 'flow_velocity': 1.2}
        
        # 基础计算
        base_result = solver_function(base_params)
        base_scour = base_result.scour_depth if hasattr(base_result, 'scour_depth') else base_result
        
        # 失效概率计算 (简化)
        allowable_scour = design_criteria.get('max_scour_depth', base_scour * 2)
        safety_factor = safety_margins.get('scour_depth', 1.5)
        
        # 使用正态分布假设计算失效概率
        if SCIPY_AVAILABLE:
            # 假设结果的变异系数为20%
            cov = 0.2
            sigma = base_scour * cov
            
            # 计算可靠性指标
            beta = (allowable_scour / safety_factor - base_scour) / sigma
            failure_prob = stats.norm.cdf(-beta)
        else:
            beta = 2.0  # 假设值
            failure_prob = 0.02  # 近似2%
        
        # 关键参数识别
        critical_parameters = ['pier_diameter', 'flow_velocity', 'water_depth']
        
        return ReliabilityResult(
            failure_probability=failure_prob,
            reliability_index=beta,
            design_margins={'scour_depth': allowable_scour - base_scour},
            critical_parameters=critical_parameters,
            safety_factors=safety_margins
        )
    
    def plot_sensitivity_analysis(self, 
                                sensitivity_results: Dict[str, SensitivityResult],
                                save_path: Optional[Path] = None,
                                show_confidence: bool = True) -> plt.Figure:
        """绘制敏感性分析图表"""
        
        n_params = len(sensitivity_results)
        if n_params == 0:
            return None
        
        # 创建子图
        fig = plt.figure(figsize=(15, 5 * ((n_params + 1) // 2)))
        gs = GridSpec(2, 3, figure=fig, hspace=0.3, wspace=0.3)
        
        # 1. 参数响应曲线
        ax1 = fig.add_subplot(gs[:, :2])
        
        colors = plt.cm.Set1(np.linspace(0, 1, n_params))
        
        for i, (param_name, result) in enumerate(sensitivity_results.items()):
            ax1.plot(result.parameter_values, result.output_values, 
                    'o-', color=colors[i], label=param_name, linewidth=2, markersize=4)
            
            if show_confidence and SCIPY_AVAILABLE:
                # 拟合置信带
                x = np.array(result.parameter_values)
                y = np.array(result.output_values)
                
                # 多项式拟合
                z = np.polyfit(x, y, 2)
                p = np.poly1d(z)
                x_smooth = np.linspace(x.min(), x.max(), 100)
                y_smooth = p(x_smooth)
                
                # 置信带 (简化)
                y_err = np.std(y - p(x)) * 1.96
                ax1.fill_between(x_smooth, y_smooth - y_err, y_smooth + y_err,
                               alpha=0.2, color=colors[i])
        
        ax1.set_xlabel('标准化参数值')
        ax1.set_ylabel('冲刷深度 (m)')
        ax1.set_title('参数敏感性响应曲线')
        ax1.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        ax1.grid(True, alpha=0.3)
        
        # 2. 敏感性系数柱状图
        ax2 = fig.add_subplot(gs[0, 2])
        
        param_names = list(sensitivity_results.keys())
        sensitivity_coeffs = [result.sensitivity_coefficient for result in sensitivity_results.values()]
        
        bars = ax2.barh(param_names, sensitivity_coeffs, color=colors[:len(param_names)])
        ax2.set_xlabel('敏感性系数')
        ax2.set_title('参数敏感性排序')
        ax2.grid(True, alpha=0.3, axis='x')
        
        # 添加数值标签
        for i, (bar, coeff) in enumerate(zip(bars, sensitivity_coeffs)):
            ax2.text(coeff + 0.01 * max(sensitivity_coeffs), bar.get_y() + bar.get_height()/2,
                    f'{coeff:.3f}', va='center', fontsize=9)
        
        # 3. 相关性分析
        ax3 = fig.add_subplot(gs[1, 2])
        
        correlations = [result.correlation_coefficient for result in sensitivity_results.values()]
        p_values = [result.p_value for result in sensitivity_results.values()]
        
        # 颜色编码显著性
        colors_corr = ['green' if p < 0.05 else 'orange' if p < 0.1 else 'red' 
                      for p in p_values]
        
        bars_corr = ax3.barh(param_names, correlations, color=colors_corr)
        ax3.set_xlabel('相关系数')
        ax3.set_title('参数相关性 (p<0.05显著)')
        ax3.grid(True, alpha=0.3, axis='x')
        ax3.set_xlim(-1, 1)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        
        return fig
    
    def plot_uncertainty_analysis(self,
                                uncertainty_result: UncertaintyResult,
                                save_path: Optional[Path] = None) -> plt.Figure:
        """绘制不确定性分析图表"""
        
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        
        samples = np.array(uncertainty_result.monte_carlo_samples)
        
        # 1. 直方图和密度估计
        ax1 = axes[0, 0]
        ax1.hist(samples, bins=50, density=True, alpha=0.7, color='skyblue', edgecolor='black')
        
        if SCIPY_AVAILABLE:
            # 拟合分布曲线
            x = np.linspace(samples.min(), samples.max(), 100)
            if uncertainty_result.distribution_type == 'normal':
                mean = uncertainty_result.distribution_parameters['mean']
                std = uncertainty_result.distribution_parameters['std']
                y = stats.norm.pdf(x, mean, std)
                ax1.plot(x, y, 'r-', linewidth=2, label=f'拟合分布: {uncertainty_result.distribution_type}')
        
        ax1.axvline(uncertainty_result.mean_value, color='red', linestyle='--', 
                   label=f'均值: {uncertainty_result.mean_value:.3f}')
        ax1.set_xlabel('冲刷深度 (m)')
        ax1.set_ylabel('概率密度')
        ax1.set_title('Monte Carlo结果分布')
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        
        # 2. 置信区间图
        ax2 = axes[0, 1]
        
        levels = list(uncertainty_result.confidence_intervals.keys())
        lower_bounds = [uncertainty_result.confidence_intervals[level][0] for level in levels]
        upper_bounds = [uncertainty_result.confidence_intervals[level][1] for level in levels]
        widths = [upper - lower for lower, upper in zip(lower_bounds, upper_bounds)]
        
        y_pos = np.arange(len(levels))
        
        for i, (level, width, lower) in enumerate(zip(levels, widths, lower_bounds)):
            ax2.barh(y_pos[i], width, left=lower, alpha=0.7, 
                    label=f'{level*100:.0f}% CI')
        
        ax2.axvline(uncertainty_result.mean_value, color='red', linestyle='--', linewidth=2)
        ax2.set_yticks(y_pos)
        ax2.set_yticklabels([f'{level*100:.0f}%' for level in levels])
        ax2.set_xlabel('冲刷深度 (m)')
        ax2.set_ylabel('置信水平')
        ax2.set_title('置信区间')
        ax2.grid(True, alpha=0.3)
        
        # 3. 累积分布函数
        ax3 = axes[1, 0]
        
        sorted_samples = np.sort(samples)
        y_cdf = np.arange(1, len(sorted_samples) + 1) / len(sorted_samples)
        
        ax3.plot(sorted_samples, y_cdf, 'b-', linewidth=2)
        
        # 标记百分位数
        for p in [5, 50, 95]:
            value = uncertainty_result.percentiles[p]
            ax3.axvline(value, color='red', linestyle=':', alpha=0.7)
            ax3.text(value, 0.1 + p/200, f'P{p}', rotation=90, va='bottom')
        
        ax3.set_xlabel('冲刷深度 (m)')
        ax3.set_ylabel('累积概率')
        ax3.set_title('累积分布函数')
        ax3.grid(True, alpha=0.3)
        
        # 4. 统计摘要
        ax4 = axes[1, 1]
        ax4.axis('off')
        
        # 创建统计表格
        stats_text = f"""
统计摘要:
-----------------
样本数量: {len(samples):,}
均值: {uncertainty_result.mean_value:.3f} m
标准差: {uncertainty_result.std_deviation:.3f} m
变异系数: {uncertainty_result.std_deviation/uncertainty_result.mean_value*100:.1f}%

百分位数:
P5:  {uncertainty_result.percentiles[5]:.3f} m
P25: {uncertainty_result.percentiles[25]:.3f} m
P50: {uncertainty_result.percentiles[50]:.3f} m
P75: {uncertainty_result.percentiles[75]:.3f} m
P95: {uncertainty_result.percentiles[95]:.3f} m

分布类型: {uncertainty_result.distribution_type}
        """
        
        ax4.text(0.1, 0.9, stats_text, transform=ax4.transAxes, fontsize=10,
                verticalalignment='top', fontfamily='monospace',
                bbox=dict(boxstyle='round', facecolor='lightgray', alpha=0.8))
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
        
        return fig
    
    def generate_analysis_report(self,
                               analysis_results: Dict[str, Any],
                               output_path: Path,
                               template_style: str = 'comprehensive') -> bool:
        """生成分析报告"""
        
        try:
            report_content = {
                'metadata': {
                    'title': '桥墩冲刷分析报告',
                    'subtitle': 'Bridge Pier Scour Analysis Report',
                    'generated_at': datetime.now().isoformat(),
                    'software': 'DeepCAD-SCOUR Enhanced v2.0',
                    'template': template_style
                },
                'executive_summary': self._generate_executive_summary(analysis_results),
                'analysis_results': analysis_results,
                'recommendations': self._generate_recommendations(analysis_results),
                'technical_details': self._generate_technical_details(analysis_results)
            }
            
            # 保存JSON格式报告
            json_path = output_path.with_suffix('.json')
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(report_content, f, indent=2, ensure_ascii=False, default=str)
            
            # 生成HTML报告 (如果需要)
            if template_style in ['comprehensive', 'presentation']:
                html_path = output_path.with_suffix('.html')
                self._generate_html_report(report_content, html_path)
            
            return True
            
        except Exception as e:
            print(f"生成报告失败: {e}")
            return False
    
    def _generate_executive_summary(self, results: Dict[str, Any]) -> str:
        """生成执行摘要"""
        summary = "# 执行摘要\n\n"
        
        if 'sensitivity' in results:
            sens_results = results['sensitivity']
            max_sens_param = max(sens_results.keys(), 
                               key=lambda x: abs(sens_results[x].sensitivity_coefficient))
            summary += f"- 最敏感参数: {max_sens_param}\n"
        
        if 'uncertainty' in results:
            unc_result = results['uncertainty']
            cov = unc_result.std_deviation / unc_result.mean_value * 100
            summary += f"- 结果不确定性: 变异系数 {cov:.1f}%\n"
        
        if 'reliability' in results:
            rel_result = results['reliability']
            summary += f"- 可靠性指标: β = {rel_result.reliability_index:.2f}\n"
            summary += f"- 失效概率: {rel_result.failure_probability*100:.2f}%\n"
        
        return summary
    
    def _generate_recommendations(self, results: Dict[str, Any]) -> List[str]:
        """生成建议"""
        recommendations = []
        
        if 'sensitivity' in results:
            sens_results = results['sensitivity']
            critical_params = [name for name, result in sens_results.items() 
                             if abs(result.sensitivity_coefficient) > 0.5]
            if critical_params:
                recommendations.append(f"重点控制参数: {', '.join(critical_params)}")
        
        if 'uncertainty' in results:
            unc_result = results['uncertainty']
            if unc_result.std_deviation / unc_result.mean_value > 0.3:
                recommendations.append("建议进行更详细的现场调查以减少不确定性")
        
        if 'reliability' in results:
            rel_result = results['reliability']
            if rel_result.failure_probability > 0.1:
                recommendations.append("当前设计存在较高风险，建议增加安全余量")
        
        return recommendations
    
    def _generate_technical_details(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """生成技术细节"""
        details = {
            'analysis_methods': [],
            'computational_details': {},
            'validation_info': {}
        }
        
        for analysis_type in results.keys():
            if analysis_type == 'sensitivity':
                details['analysis_methods'].append('局部敏感性分析')
            elif analysis_type == 'uncertainty':
                details['analysis_methods'].append('Monte Carlo不确定性量化')
            elif analysis_type == 'reliability':
                details['analysis_methods'].append('一次二阶矩可靠性分析')
        
        return details
    
    def _generate_html_report(self, content: Dict[str, Any], output_path: Path):
        """生成HTML报告"""
        html_template = f"""
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{content['metadata']['title']}</title>
    <style>
        body {{ font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 40px; }}
        .header {{ text-align: center; margin-bottom: 30px; }}
        .section {{ margin: 20px 0; }}
        .summary {{ background-color: #f0f8ff; padding: 15px; border-radius: 5px; }}
        .recommendations {{ background-color: #fff8dc; padding: 15px; border-radius: 5px; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{content['metadata']['title']}</h1>
        <h2>{content['metadata']['subtitle']}</h2>
        <p>生成时间: {content['metadata']['generated_at']}</p>
    </div>
    
    <div class="section summary">
        <h3>执行摘要</h3>
        <p>{content['executive_summary'].replace('\n', '<br>')}</p>
    </div>
    
    <div class="section recommendations">
        <h3>建议</h3>
        <ul>
            {''.join([f'<li>{rec}</li>' for rec in content['recommendations']])}
        </ul>
    </div>
    
    <div class="section">
        <h3>分析方法</h3>
        <ul>
            {''.join([f'<li>{method}</li>' for method in content['technical_details']['analysis_methods']])}
        </ul>
    </div>
</body>
</html>
        """
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_template)


# 便利函数
def quick_sensitivity_analysis(params: ScourParameters, 
                             solver_func: Callable,
                             output_dir: Path = Path("analysis_results")) -> Dict[str, Any]:
    """快速敏感性分析"""
    output_dir.mkdir(exist_ok=True)
    
    analyzer = AdvancedResultAnalyzer()
    results = analyzer.sensitivity_analysis(params, solver_func)
    
    # 生成图表
    fig = analyzer.plot_sensitivity_analysis(results)
    if fig:
        fig.savefig(output_dir / "sensitivity_analysis.png", dpi=300, bbox_inches='tight')
        plt.close(fig)
    
    return {'sensitivity': results}


def comprehensive_analysis(params: ScourParameters,
                         solver_func: Callable,
                         output_dir: Path = Path("comprehensive_analysis")) -> Dict[str, Any]:
    """综合分析"""
    output_dir.mkdir(exist_ok=True)
    
    analyzer = AdvancedResultAnalyzer()
    
    # 敏感性分析
    sensitivity_results = analyzer.sensitivity_analysis(params, solver_func)
    
    # 不确定性分析
    parameter_uncertainties = {
        'pier_diameter': ('normal', {'mean': params.pier_diameter, 'std': params.pier_diameter * 0.1}),
        'flow_velocity': ('normal', {'mean': params.flow_velocity, 'std': params.flow_velocity * 0.15}),
        'd50': ('lognormal', {'mean': np.log(params.d50), 'sigma': 0.3})
    }
    uncertainty_results = analyzer.uncertainty_quantification(params, solver_func, parameter_uncertainties)
    
    # 可靠性分析
    design_criteria = {'max_scour_depth': 2.0}
    reliability_results = analyzer.reliability_analysis(params, solver_func, design_criteria)
    
    # 生成图表
    sens_fig = analyzer.plot_sensitivity_analysis(sensitivity_results)
    if sens_fig:
        sens_fig.savefig(output_dir / "sensitivity_analysis.png", dpi=300, bbox_inches='tight')
        plt.close(sens_fig)
    
    unc_fig = analyzer.plot_uncertainty_analysis(uncertainty_results)
    if unc_fig:
        unc_fig.savefig(output_dir / "uncertainty_analysis.png", dpi=300, bbox_inches='tight')
        plt.close(unc_fig)
    
    # 综合结果
    all_results = {
        'sensitivity': sensitivity_results,
        'uncertainty': uncertainty_results,
        'reliability': reliability_results
    }
    
    # 生成报告
    analyzer.generate_analysis_report(all_results, output_dir / "analysis_report")
    
    return all_results


if __name__ == "__main__":
    # 测试高级结果分析
    print("=== 高级结果分析工具测试 ===")
    
    # 创建测试参数
    from .empirical_solver import HEC18Solver
    
    test_params = ScourParameters(
        pier_diameter=2.0,
        pier_shape=PierShape.CIRCULAR,
        flow_velocity=1.0,
        water_depth=3.0,
        d50=0.5
    )
    
    # 测试求解器
    def test_solver(params):
        solver = HEC18Solver()
        return solver.solve(params)
    
    # 快速敏感性分析
    print("进行敏感性分析...")
    sensitivity_results = quick_sensitivity_analysis(test_params, test_solver, Path("test_analysis"))
    
    print(f"分析完成，发现 {len(sensitivity_results['sensitivity'])} 个参数的敏感性")
    
    for param_name, result in sensitivity_results['sensitivity'].items():
        print(f"  {param_name}: 敏感性系数 = {result.sensitivity_coefficient:.3f}")
    
    print("\n=== 综合分析测试 ===")
    comprehensive_results = comprehensive_analysis(test_params, test_solver, Path("comprehensive_test"))
    
    print("综合分析完成!")
    print(f"不确定性: 均值={comprehensive_results['uncertainty'].mean_value:.3f}, "
          f"标准差={comprehensive_results['uncertainty'].std_deviation:.3f}")
    print(f"可靠性: β={comprehensive_results['reliability'].reliability_index:.2f}, "
          f"Pf={comprehensive_results['reliability'].failure_probability:.3f}")