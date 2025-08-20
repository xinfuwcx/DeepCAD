"""
不确定性分析系统
Uncertainty Analysis System

实现贝叶斯推理、蒙特卡洛模拟和地质模型的不确定性分析
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from scipy import stats, optimize, integrate
from scipy.spatial.distance import cdist
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, Matern, WhiteKernel
from sklearn.model_selection import cross_val_score
import json
from typing import Dict, List, Tuple, Optional, Any, Union, Callable
from dataclasses import dataclass
from enum import Enum
import warnings
warnings.filterwarnings('ignore')


@dataclass
class UncertaintyParams:
    """不确定性参数"""
    measurement_error: float    # 测量误差标准差
    model_error: float         # 模型误差标准差
    prior_mean: float          # 先验均值
    prior_std: float           # 先验标准差
    correlation_length: float  # 相关长度


class BayesianInference:
    """贝叶斯推理器"""
    
    def __init__(self, prior_distribution: str = "normal"):
        """
        初始化贝叶斯推理器
        
        Args:
            prior_distribution: 先验分布类型 ("normal", "uniform", "exponential")
        """
        self.prior_distribution = prior_distribution
        self.posterior_samples = None
        self.evidence = None
        self.hyperparameters = {}
        
        print(f"✓ 贝叶斯推理器已初始化 (先验: {prior_distribution})")
    
    def set_prior(self, **kwargs):
        """设置先验分布参数"""
        self.hyperparameters = kwargs
        
        if self.prior_distribution == "normal":
            if 'mean' not in kwargs or 'std' not in kwargs:
                raise ValueError("正态先验需要 mean 和 std 参数")
        elif self.prior_distribution == "uniform":
            if 'low' not in kwargs or 'high' not in kwargs:
                raise ValueError("均匀先验需要 low 和 high 参数")
        elif self.prior_distribution == "exponential":
            if 'scale' not in kwargs:
                raise ValueError("指数先验需要 scale 参数")
        
        print(f"✓ 先验分布已设置: {self.prior_distribution} {kwargs}")
    
    def log_prior(self, parameters: np.ndarray) -> float:
        """计算参数的对数先验概率"""
        if self.prior_distribution == "normal":
            mean = self.hyperparameters['mean']
            std = self.hyperparameters['std']
            return -0.5 * np.sum(((parameters - mean) / std) ** 2)
            
        elif self.prior_distribution == "uniform":
            low = self.hyperparameters['low']
            high = self.hyperparameters['high']
            if np.all((parameters >= low) & (parameters <= high)):
                return 0.0
            else:
                return -np.inf
                
        elif self.prior_distribution == "exponential":
            scale = self.hyperparameters['scale']
            if np.all(parameters >= 0):
                return np.sum(-parameters / scale - np.log(scale))
            else:
                return -np.inf
        
        return -np.inf
    
    def log_likelihood(self, parameters: np.ndarray, data: Dict) -> float:
        """计算对数似然函数"""
        observed_values = data['observations']
        predicted_values = data['predictions'](parameters)
        measurement_error = data.get('error', 1.0)
        
        # 假设高斯似然
        residuals = observed_values - predicted_values
        log_likelihood = -0.5 * np.sum((residuals / measurement_error) ** 2)
        log_likelihood -= 0.5 * len(observed_values) * np.log(2 * np.pi * measurement_error**2)
        
        return log_likelihood
    
    def log_posterior(self, parameters: np.ndarray, data: Dict) -> float:
        """计算对数后验概率"""
        log_prior_val = self.log_prior(parameters)
        if log_prior_val == -np.inf:
            return -np.inf
            
        log_likelihood_val = self.log_likelihood(parameters, data)
        return log_prior_val + log_likelihood_val
    
    def metropolis_hastings(self, data: Dict, n_samples: int = 10000, 
                           initial_params: np.ndarray = None,
                           proposal_std: float = 0.1) -> np.ndarray:
        """
        使用Metropolis-Hastings算法进行MCMC采样
        
        Args:
            data: 包含观测数据和预测函数的字典
            n_samples: 采样数量
            initial_params: 初始参数
            proposal_std: 提议分布标准差
            
        Returns:
            后验样本
        """
        print(f"🔄 开始MCMC采样 ({n_samples} 样本)...")
        
        if initial_params is None:
            if self.prior_distribution == "normal":
                initial_params = np.array([self.hyperparameters['mean']])
            else:
                initial_params = np.array([1.0])  # 默认初始值
        
        n_params = len(initial_params)
        samples = np.zeros((n_samples, n_params))
        current_params = initial_params.copy()
        current_log_posterior = self.log_posterior(current_params, data)
        
        n_accepted = 0
        
        for i in range(n_samples):
            if i % max(1, n_samples//10) == 0:
                print(f"  进度: {i}/{n_samples} ({100*i/n_samples:.1f}%), 接受率: {100*n_accepted/(i+1):.1f}%")
            
            # 生成提议参数
            proposal = current_params + np.random.normal(0, proposal_std, n_params)
            proposal_log_posterior = self.log_posterior(proposal, data)
            
            # Metropolis-Hastings接受准则
            log_alpha = proposal_log_posterior - current_log_posterior
            alpha = min(1.0, np.exp(log_alpha))
            
            if np.random.random() < alpha:
                current_params = proposal.copy()
                current_log_posterior = proposal_log_posterior
                n_accepted += 1
            
            samples[i] = current_params.copy()
        
        acceptance_rate = n_accepted / n_samples
        print(f"✓ MCMC采样完成")
        print(f"  总接受率: {100*acceptance_rate:.1f}%")
        
        self.posterior_samples = samples
        return samples
    
    def compute_posterior_statistics(self, burn_in: int = 1000) -> Dict:
        """计算后验统计量"""
        if self.posterior_samples is None:
            raise ValueError("需要先进行MCMC采样")
        
        # 去除burn-in样本
        samples = self.posterior_samples[burn_in:]
        
        statistics = {
            'mean': np.mean(samples, axis=0),
            'std': np.std(samples, axis=0),
            'median': np.median(samples, axis=0),
            'quantiles': {
                '2.5%': np.percentile(samples, 2.5, axis=0),
                '25%': np.percentile(samples, 25, axis=0),
                '75%': np.percentile(samples, 75, axis=0),
                '97.5%': np.percentile(samples, 97.5, axis=0)
            },
            'effective_sample_size': self._compute_ess(samples),
            'rhat': self._compute_rhat(samples) if samples.shape[0] > 100 else 1.0
        }
        
        print("✓ 后验统计量:")
        print(f"  均值: {statistics['mean']}")
        print(f"  标准差: {statistics['std']}")
        print(f"  95%置信区间: [{statistics['quantiles']['2.5%'][0]:.3f}, {statistics['quantiles']['97.5%'][0]:.3f}]")
        
        return statistics
    
    def _compute_ess(self, samples: np.ndarray) -> float:
        """计算有效样本数"""
        # 简化的有效样本数估计
        n_samples = samples.shape[0]
        
        # 计算自相关函数
        autocorr = np.correlate(samples.flatten(), samples.flatten(), mode='full')
        autocorr = autocorr[autocorr.size // 2:]
        autocorr = autocorr / autocorr[0]  # 归一化
        
        # 找到第一个负值或足够小的值
        cutoff = 1
        for i in range(1, min(len(autocorr), n_samples//4)):
            if autocorr[i] <= 0.05:  # 5%阈值
                cutoff = i
                break
        
        # 计算自相关时间
        tau = 1 + 2 * np.sum(autocorr[1:cutoff])
        ess = n_samples / (2 * tau + 1)
        
        return max(1, ess)
    
    def _compute_rhat(self, samples: np.ndarray) -> float:
        """计算Rhat收敛诊断统计量"""
        # 简化的Rhat计算 (需要多条链)
        # 这里使用单链的简化版本
        n = samples.shape[0]
        first_half = samples[:n//2]
        second_half = samples[n//2:]
        
        w = 0.5 * (np.var(first_half, axis=0) + np.var(second_half, axis=0))
        b = 0.5 * (np.mean(first_half, axis=0) - np.mean(second_half, axis=0))**2
        
        var_est = ((n//2 - 1) * w + b) / (n//2)
        rhat = np.sqrt(var_est / w) if w > 0 else 1.0
        
        return float(rhat)


class MonteCarloUncertainty:
    """蒙特卡洛不确定性分析器"""
    
    def __init__(self):
        """初始化蒙特卡洛分析器"""
        self.parameter_distributions = {}
        self.correlation_matrix = None
        self.samples = None
        self.results = None
        
        print("✓ 蒙特卡洛不确定性分析器已初始化")
    
    def add_uncertain_parameter(self, name: str, distribution: str, **kwargs):
        """
        添加不确定参数
        
        Args:
            name: 参数名称
            distribution: 分布类型 ("normal", "uniform", "triangular", "lognormal")
            **kwargs: 分布参数
        """
        if distribution == "normal":
            dist = stats.norm(loc=kwargs['mean'], scale=kwargs['std'])
        elif distribution == "uniform":
            dist = stats.uniform(loc=kwargs['low'], scale=kwargs['high']-kwargs['low'])
        elif distribution == "triangular":
            c = (kwargs['mode'] - kwargs['low']) / (kwargs['high'] - kwargs['low'])
            dist = stats.triang(c=c, loc=kwargs['low'], scale=kwargs['high']-kwargs['low'])
        elif distribution == "lognormal":
            dist = stats.lognorm(s=kwargs['sigma'], scale=np.exp(kwargs['mu']))
        else:
            raise ValueError(f"不支持的分布类型: {distribution}")
        
        self.parameter_distributions[name] = dist
        print(f"✓ 添加不确定参数: {name} ({distribution})")
    
    def set_correlation_matrix(self, param_names: List[str], 
                              correlation_matrix: np.ndarray):
        """设置参数间的相关矩阵"""
        if len(param_names) != correlation_matrix.shape[0]:
            raise ValueError("参数数量与相关矩阵维度不匹配")
        
        # 检查相关矩阵的有效性
        if not np.allclose(correlation_matrix, correlation_matrix.T):
            raise ValueError("相关矩阵必须是对称的")
        
        eigenvals = np.linalg.eigvals(correlation_matrix)
        if np.any(eigenvals <= 0):
            raise ValueError("相关矩阵必须是正定的")
        
        self.correlation_matrix = correlation_matrix
        self.correlated_params = param_names
        
        print(f"✓ 相关矩阵已设置 ({len(param_names)}x{len(param_names)})")
    
    def generate_samples(self, n_samples: int) -> np.ndarray:
        """生成参数样本"""
        print(f"🔄 生成蒙特卡洛样本 ({n_samples} 个)...")
        
        param_names = list(self.parameter_distributions.keys())
        n_params = len(param_names)
        
        # 生成独立样本
        samples = np.zeros((n_samples, n_params))
        
        for i, param_name in enumerate(param_names):
            dist = self.parameter_distributions[param_name]
            samples[:, i] = dist.rvs(n_samples)
        
        # 如果设置了相关性，应用相关变换
        if self.correlation_matrix is not None:
            # 转换为标准正态分布
            normal_samples = np.zeros_like(samples)
            for i, param_name in enumerate(param_names):
                if param_name in self.correlated_params:
                    idx = self.correlated_params.index(param_name)
                    dist = self.parameter_distributions[param_name]
                    # 转换为标准正态
                    normal_samples[:, i] = stats.norm.ppf(dist.cdf(samples[:, i]))
            
            # 应用Cholesky分解引入相关性
            try:
                L = np.linalg.cholesky(self.correlation_matrix)
                corr_indices = [param_names.index(name) for name in self.correlated_params]
                
                correlated_normal = (L @ normal_samples[:, corr_indices].T).T
                
                # 转换回原分布
                for i, param_name in enumerate(self.correlated_params):
                    param_idx = param_names.index(param_name)
                    dist = self.parameter_distributions[param_name]
                    normal_vals = correlated_normal[:, i]
                    samples[:, param_idx] = dist.ppf(stats.norm.cdf(normal_vals))
                    
            except np.linalg.LinAlgError:
                print("  警告: Cholesky分解失败，使用独立样本")
        
        self.samples = samples
        
        print("✓ 样本生成完成")
        return samples
    
    def propagate_uncertainty(self, model_function: Callable, 
                             samples: np.ndarray = None) -> np.ndarray:
        """
        传播不确定性
        
        Args:
            model_function: 模型函数，接受参数数组返回结果
            samples: 参数样本，如果为None则使用之前生成的样本
            
        Returns:
            模型输出的样本
        """
        if samples is None:
            if self.samples is None:
                raise ValueError("需要先生成样本或提供样本")
            samples = self.samples
        
        print(f"🔄 传播不确定性 ({len(samples)} 个样本)...")
        
        n_samples = samples.shape[0]
        results = []
        
        for i, sample in enumerate(samples):
            if i % max(1, n_samples//10) == 0:
                print(f"  进度: {i}/{n_samples} ({100*i/n_samples:.1f}%)")
            
            try:
                result = model_function(sample)
                results.append(result)
            except Exception as e:
                print(f"  警告: 样本 {i} 计算失败: {e}")
                results.append(np.nan)
        
        results = np.array(results)
        self.results = results
        
        print("✓ 不确定性传播完成")
        return results
    
    def compute_sensitivity_indices(self, samples: np.ndarray, 
                                  results: np.ndarray) -> Dict:
        """计算敏感性指标"""
        print("🔄 计算敏感性指标...")
        
        param_names = list(self.parameter_distributions.keys())
        n_params = len(param_names)
        
        # 过滤有效结果
        valid_mask = ~np.isnan(results)
        valid_samples = samples[valid_mask]
        valid_results = results[valid_mask]
        
        if len(valid_results) < 10:
            print("  警告: 有效样本数量太少")
            return {}
        
        # 计算总方差
        total_variance = np.var(valid_results)
        
        sensitivity_indices = {}
        
        # 一阶敏感性指标 (Spearman相关系数)
        for i, param_name in enumerate(param_names):
            correlation, p_value = stats.spearmanr(
                valid_samples[:, i], valid_results
            )
            
            # 一阶敏感性指标 (简化版)
            first_order_si = correlation**2 if not np.isnan(correlation) else 0
            
            sensitivity_indices[param_name] = {
                'first_order': first_order_si,
                'correlation': correlation,
                'p_value': p_value
            }
        
        # 总敏感性指标 (通过方差分解估计)
        for i, param_name in enumerate(param_names):
            # 将参数分为高低两组
            param_values = valid_samples[:, i]
            median_val = np.median(param_values)
            
            low_mask = param_values <= median_val
            high_mask = param_values > median_val
            
            if np.sum(low_mask) > 5 and np.sum(high_mask) > 5:
                low_var = np.var(valid_results[low_mask])
                high_var = np.var(valid_results[high_mask])
                within_group_var = (low_var + high_var) / 2
                
                total_si = 1 - within_group_var / total_variance
                sensitivity_indices[param_name]['total'] = max(0, total_si)
        
        print("✓ 敏感性分析完成")
        
        # 按敏感性排序
        sorted_params = sorted(sensitivity_indices.keys(), 
                             key=lambda x: sensitivity_indices[x]['first_order'], 
                             reverse=True)
        
        print("  敏感性排序:")
        for i, param in enumerate(sorted_params[:3]):
            si = sensitivity_indices[param]['first_order']
            print(f"    {i+1}. {param}: {si:.3f}")
        
        return sensitivity_indices
    
    def compute_uncertainty_statistics(self, results: np.ndarray = None) -> Dict:
        """计算不确定性统计量"""
        if results is None:
            if self.results is None:
                raise ValueError("需要先进行不确定性传播")
            results = self.results
        
        # 过滤有效结果
        valid_results = results[~np.isnan(results)]
        
        if len(valid_results) == 0:
            return {'error': '无有效结果'}
        
        statistics = {
            'mean': np.mean(valid_results),
            'std': np.std(valid_results),
            'variance': np.var(valid_results),
            'median': np.median(valid_results),
            'min': np.min(valid_results),
            'max': np.max(valid_results),
            'skewness': stats.skew(valid_results),
            'kurtosis': stats.kurtosis(valid_results),
            'percentiles': {
                '1%': np.percentile(valid_results, 1),
                '5%': np.percentile(valid_results, 5),
                '25%': np.percentile(valid_results, 25),
                '75%': np.percentile(valid_results, 75),
                '95%': np.percentile(valid_results, 95),
                '99%': np.percentile(valid_results, 99)
            },
            'coefficient_of_variation': np.std(valid_results) / np.mean(valid_results) if np.mean(valid_results) != 0 else np.inf,
            'valid_samples': len(valid_results),
            'total_samples': len(results)
        }
        
        print("✓ 不确定性统计量:")
        print(f"  均值 ± 标准差: {statistics['mean']:.3f} ± {statistics['std']:.3f}")
        print(f"  95%置信区间: [{statistics['percentiles']['2.5%']:.3f}, {statistics['percentiles']['97.5%']:.3f}]")
        print(f"  变异系数: {statistics['coefficient_of_variation']:.3f}")
        
        return statistics


class GeologicalUncertaintyAnalyzer:
    """地质模型不确定性分析器"""
    
    def __init__(self):
        """初始化地质不确定性分析器"""
        self.bayesian_inference = BayesianInference()
        self.monte_carlo = MonteCarloUncertainty()
        
        # 地质参数不确定性
        self.geological_parameters = {}
        self.spatial_uncertainty = None
        
        print("✓ 地质模型不确定性分析器已初始化")
    
    def add_geological_uncertainty(self, param_name: str, uncertainty_type: str,
                                 spatial_data: np.ndarray = None, **kwargs):
        """
        添加地质参数不确定性
        
        Args:
            param_name: 参数名称 ('density', 'thickness', 'depth', etc.)
            uncertainty_type: 不确定性类型 ('measurement', 'interpolation', 'model')
            spatial_data: 空间数据点 [[x,y,z,value], ...]
            **kwargs: 不确定性参数
        """
        self.geological_parameters[param_name] = {
            'type': uncertainty_type,
            'spatial_data': spatial_data,
            'params': kwargs
        }
        
        # 自动添加到蒙特卡洛分析器
        if uncertainty_type == 'measurement':
            # 测量不确定性 - 正态分布
            mean_val = kwargs.get('mean', 0)
            std_val = kwargs.get('std', 1)
            self.monte_carlo.add_uncertain_parameter(
                param_name, 'normal', mean=mean_val, std=std_val
            )
        elif uncertainty_type == 'interpolation':
            # 插值不确定性 - 基于克里金方差
            if spatial_data is not None:
                self._add_spatial_uncertainty(param_name, spatial_data, **kwargs)
        
        print(f"✓ 地质不确定性已添加: {param_name} ({uncertainty_type})")
    
    def _add_spatial_uncertainty(self, param_name: str, spatial_data: np.ndarray, **kwargs):
        """添加空间不确定性"""
        # 使用高斯过程回归估计空间不确定性
        coords = spatial_data[:, :3]  # x, y, z
        values = spatial_data[:, 3]   # 参数值
        
        # 配置高斯过程
        length_scale = kwargs.get('length_scale', 1000)  # 相关长度
        variance = kwargs.get('variance', np.var(values))
        
        kernel = RBF(length_scale=length_scale) * variance + WhiteKernel(noise_level=0.1)
        
        gp = GaussianProcessRegressor(
            kernel=kernel,
            n_restarts_optimizer=3,
            random_state=42
        )
        
        try:
            gp.fit(coords, values)
            
            # 存储高斯过程模型
            self.geological_parameters[param_name]['gp_model'] = gp
            
            print(f"  高斯过程模型已拟合: {param_name}")
            print(f"    长度尺度: {gp.kernel_.k1.length_scale:.1f}")
            print(f"    方差: {gp.kernel_.k1.k2.constant_value:.3f}")
            
        except Exception as e:
            print(f"  警告: 高斯过程拟合失败 ({e})")
    
    def predict_with_uncertainty(self, param_name: str, 
                                prediction_points: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        在指定点预测参数值及其不确定性
        
        Args:
            param_name: 参数名称
            prediction_points: 预测点坐标 [[x1,y1,z1], [x2,y2,z2], ...]
            
        Returns:
            (均值预测, 标准差预测)
        """
        if param_name not in self.geological_parameters:
            raise ValueError(f"参数 {param_name} 未定义")
        
        param_info = self.geological_parameters[param_name]
        
        if 'gp_model' in param_info:
            # 使用高斯过程预测
            gp_model = param_info['gp_model']
            mean_pred, std_pred = gp_model.predict(prediction_points, return_std=True)
            
            return mean_pred, std_pred
        else:
            # 使用简单的空间插值 + 不确定性估计
            spatial_data = param_info['spatial_data']
            if spatial_data is None:
                raise ValueError(f"参数 {param_name} 缺少空间数据")
            
            coords = spatial_data[:, :3]
            values = spatial_data[:, 3]
            
            # 简单的反距离加权插值
            predictions = []
            uncertainties = []
            
            for point in prediction_points:
                distances = np.linalg.norm(coords - point, axis=1)
                
                # 避免除零
                distances = np.maximum(distances, 1e-10)
                
                # 反距离权重
                weights = 1 / distances**2
                weights /= np.sum(weights)
                
                # 插值预测
                pred_val = np.sum(weights * values)
                
                # 不确定性估计 (基于最近邻方差)
                k_nearest = min(5, len(values))
                nearest_indices = np.argsort(distances)[:k_nearest]
                local_variance = np.var(values[nearest_indices])
                uncertainty = np.sqrt(local_variance)
                
                predictions.append(pred_val)
                uncertainties.append(uncertainty)
            
            return np.array(predictions), np.array(uncertainties)
    
    def analyze_model_uncertainty(self, geological_model: Dict, 
                                 analysis_points: np.ndarray,
                                 n_realizations: int = 100) -> Dict:
        """
        分析地质模型的整体不确定性
        
        Args:
            geological_model: 地质模型字典
            analysis_points: 分析点坐标
            n_realizations: 实现次数
            
        Returns:
            不确定性分析结果
        """
        print(f"🔄 分析地质模型不确定性 ({n_realizations} 次实现)...")
        
        results = {
            'realizations': [],
            'statistics': {},
            'uncertainty_maps': {}
        }
        
        # 生成多个地质模型实现
        for i in range(n_realizations):
            if i % max(1, n_realizations//10) == 0:
                print(f"  进度: {i}/{n_realizations} ({100*i/n_realizations:.1f}%)")
            
            try:
                # 为每个不确定参数生成随机值
                uncertain_params = {}
                for param_name, param_info in self.geological_parameters.items():
                    if param_info['type'] == 'measurement':
                        # 从分布中采样
                        dist = self.monte_carlo.parameter_distributions[param_name]
                        uncertain_params[param_name] = dist.rvs()
                    elif param_info['type'] == 'interpolation':
                        # 使用条件高斯过程采样
                        if 'gp_model' in param_info:
                            gp_model = param_info['gp_model']
                            # 简化: 在分析点生成一个随机实现
                            samples = gp_model.sample_y(analysis_points, n_samples=1)
                            uncertain_params[param_name] = samples.flatten()
                
                # 使用不确定参数运行地质模型
                realization = self._run_geological_model_realization(
                    geological_model, analysis_points, uncertain_params
                )
                
                results['realizations'].append(realization)
                
            except Exception as e:
                print(f"  警告: 实现 {i} 失败: {e}")
        
        # 计算统计量
        if len(results['realizations']) > 0:
            realizations_array = np.array(results['realizations'])
            
            results['statistics'] = {
                'mean': np.mean(realizations_array, axis=0),
                'std': np.std(realizations_array, axis=0),
                'percentiles': {
                    '5%': np.percentile(realizations_array, 5, axis=0),
                    '25%': np.percentile(realizations_array, 25, axis=0),
                    '75%': np.percentile(realizations_array, 75, axis=0),
                    '95%': np.percentile(realizations_array, 95, axis=0)
                },
                'probability_maps': {}
            }
            
            # 计算概率图 (例如: 某岩性存在概率)
            unique_values = np.unique(realizations_array)
            for value in unique_values:
                prob_map = np.mean(realizations_array == value, axis=0)
                results['statistics']['probability_maps'][f'prob_{value}'] = prob_map
        
        print("✓ 地质模型不确定性分析完成")
        print(f"  成功实现: {len(results['realizations'])}/{n_realizations}")
        
        return results
    
    def _run_geological_model_realization(self, geological_model: Dict,
                                        analysis_points: np.ndarray,
                                        uncertain_params: Dict) -> np.ndarray:
        """运行单次地质模型实现"""
        # 这是一个简化的示例实现
        # 在实际应用中，这里应该调用完整的地质建模流程
        
        n_points = len(analysis_points)
        
        # 模拟地质模型输出 (岩性ID)
        base_lithology = np.ones(n_points, dtype=int)
        
        # 根据不确定参数修改结果
        for param_name, param_value in uncertain_params.items():
            if param_name == 'density':
                # 基于密度调整岩性分布 (示例逻辑)
                if isinstance(param_value, (int, float)):
                    if param_value > 2.5:
                        base_lithology[n_points//3:] = 2  # 高密度岩石
                else:
                    high_density_mask = param_value > 2.5
                    base_lithology[high_density_mask] = 2
        
        return base_lithology


def create_demo_uncertainty_analysis():
    """创建不确定性分析演示"""
    print("📊 创建不确定性分析演示...")
    
    # 创建贝叶斯推理演示
    print("\n1. 贝叶斯推理演示")
    bayesian = BayesianInference("normal")
    bayesian.set_prior(mean=2.5, std=0.2)  # 密度先验
    
    # 模拟观测数据
    np.random.seed(42)
    true_density = 2.7
    n_obs = 20
    measurement_error = 0.1
    observations = true_density + np.random.normal(0, measurement_error, n_obs)
    
    # 定义简单的预测函数
    def prediction_function(params):
        return np.full(n_obs, params[0])  # 常数模型
    
    data = {
        'observations': observations,
        'predictions': prediction_function,
        'error': measurement_error
    }
    
    # MCMC采样
    samples = bayesian.metropolis_hastings(data, n_samples=5000, 
                                         initial_params=np.array([2.5]),
                                         proposal_std=0.05)
    
    # 计算后验统计
    posterior_stats = bayesian.compute_posterior_statistics(burn_in=1000)
    
    # 创建蒙特卡洛演示
    print("\n2. 蒙特卡洛不确定性分析演示")
    mc_analyzer = MonteCarloUncertainty()
    
    # 添加不确定参数
    mc_analyzer.add_uncertain_parameter('density', 'normal', mean=2.6, std=0.2)
    mc_analyzer.add_uncertain_parameter('thickness', 'uniform', low=50, high=150)
    mc_analyzer.add_uncertain_parameter('depth', 'triangular', low=100, mode=200, high=300)
    
    # 设置参数相关性
    correlation_matrix = np.array([
        [1.0, 0.3, -0.2],  # density vs thickness vs depth
        [0.3, 1.0, 0.1],
        [-0.2, 0.1, 1.0]
    ])
    mc_analyzer.set_correlation_matrix(['density', 'thickness', 'depth'], correlation_matrix)
    
    # 生成样本
    samples_mc = mc_analyzer.generate_samples(n_samples=1000)
    
    # 定义地质模型函数
    def geological_model(params):
        density, thickness, depth = params
        # 简化的地质响应函数
        gravity_response = density * thickness * (1 / depth)
        return gravity_response
    
    # 传播不确定性
    model_results = mc_analyzer.propagate_uncertainty(geological_model, samples_mc)
    
    # 计算敏感性指标
    sensitivity = mc_analyzer.compute_sensitivity_indices(samples_mc, model_results)
    
    # 计算不确定性统计
    uncertainty_stats = mc_analyzer.compute_uncertainty_statistics(model_results)
    
    # 创建地质不确定性分析演示
    print("\n3. 地质模型不确定性分析演示")
    geo_analyzer = GeologicalUncertaintyAnalyzer()
    
    # 生成模拟空间数据
    n_points = 50
    coords = np.random.uniform(0, 1000, (n_points, 3))
    density_values = 2.5 + 0.3 * np.sin(coords[:, 0] / 200) + np.random.normal(0, 0.1, n_points)
    spatial_data = np.column_stack([coords, density_values])
    
    # 添加地质不确定性
    geo_analyzer.add_geological_uncertainty(
        'spatial_density', 'interpolation', 
        spatial_data=spatial_data,
        length_scale=300, variance=0.1
    )
    
    # 预测点
    pred_points = np.random.uniform(0, 1000, (100, 3))
    
    # 预测及不确定性
    try:
        mean_pred, std_pred = geo_analyzer.predict_with_uncertainty('spatial_density', pred_points)
        
        print(f"  空间预测完成:")
        print(f"    预测均值范围: {mean_pred.min():.3f} - {mean_pred.max():.3f}")
        print(f"    不确定性范围: {std_pred.min():.3f} - {std_pred.max():.3f}")
    except Exception as e:
        print(f"  空间预测失败: {e}")
    
    print("\n🎉 不确定性分析演示完成!")
    
    return {
        'bayesian': bayesian,
        'posterior_stats': posterior_stats,
        'monte_carlo': mc_analyzer,
        'mc_samples': samples_mc,
        'mc_results': model_results,
        'sensitivity': sensitivity,
        'uncertainty_stats': uncertainty_stats,
        'geological_analyzer': geo_analyzer
    }


if __name__ == "__main__":
    # 运行演示
    demo_results = create_demo_uncertainty_analysis()
    
    # 可视化结果
    fig, axes = plt.subplots(2, 3, figsize=(15, 10))
    
    # 1. 后验分布
    if demo_results['bayesian'].posterior_samples is not None:
        samples = demo_results['bayesian'].posterior_samples[1000:]  # 去除burn-in
        axes[0, 0].hist(samples.flatten(), bins=50, alpha=0.7, density=True)
        axes[0, 0].axvline(demo_results['posterior_stats']['mean'][0], color='r', 
                          linestyle='--', label='后验均值')
        axes[0, 0].set_xlabel('密度 (g/cm³)')
        axes[0, 0].set_ylabel('概率密度')
        axes[0, 0].set_title('贝叶斯后验分布')
        axes[0, 0].legend()
    
    # 2. 参数样本散点图
    samples_mc = demo_results['mc_samples']
    scatter = axes[0, 1].scatter(samples_mc[:, 0], samples_mc[:, 1], 
                                c=samples_mc[:, 2], alpha=0.6, cmap='viridis')
    axes[0, 1].set_xlabel('密度 (g/cm³)')
    axes[0, 1].set_ylabel('厚度 (m)')
    axes[0, 1].set_title('参数样本分布')
    plt.colorbar(scatter, ax=axes[0, 1], label='深度 (m)')
    
    # 3. 模型输出分布
    mc_results = demo_results['mc_results']
    valid_results = mc_results[~np.isnan(mc_results)]
    axes[0, 2].hist(valid_results, bins=50, alpha=0.7, density=True)
    axes[0, 2].set_xlabel('模型输出')
    axes[0, 2].set_ylabel('概率密度')
    axes[0, 2].set_title('模型输出不确定性')
    
    # 4. 敏感性分析
    sensitivity = demo_results['sensitivity']
    param_names = list(sensitivity.keys())
    first_order_si = [sensitivity[p]['first_order'] for p in param_names]
    
    bars = axes[1, 0].bar(param_names, first_order_si)
    axes[1, 0].set_ylabel('一阶敏感性指标')
    axes[1, 0].set_title('参数敏感性分析')
    axes[1, 0].tick_params(axis='x', rotation=45)
    
    # 5. 不确定性统计
    stats = demo_results['uncertainty_stats']
    percentiles = [1, 5, 25, 50, 75, 95, 99]
    values = [stats['percentiles'][f'{p}%'] for p in percentiles]
    
    axes[1, 1].plot(percentiles, values, 'o-')
    axes[1, 1].set_xlabel('百分位数')
    axes[1, 1].set_ylabel('模型输出')
    axes[1, 1].set_title('不确定性分位数')
    axes[1, 1].grid(True)
    
    # 6. 收敛诊断
    if demo_results['bayesian'].posterior_samples is not None:
        samples = demo_results['bayesian'].posterior_samples
        running_mean = np.cumsum(samples.flatten()) / np.arange(1, len(samples.flatten()) + 1)
        axes[1, 2].plot(running_mean)
        axes[1, 2].axhline(demo_results['posterior_stats']['mean'][0], 
                          color='r', linestyle='--', label='后验均值')
        axes[1, 2].set_xlabel('迭代次数')
        axes[1, 2].set_ylabel('累积均值')
        axes[1, 2].set_title('MCMC收敛诊断')
        axes[1, 2].legend()
    
    plt.tight_layout()
    plt.savefig('example3/uncertainty_analysis_results.png', dpi=150, bbox_inches='tight')
    plt.show()
    
    print("📊 不确定性分析图表已保存到: example3/uncertainty_analysis_results.png")