#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD ROM降阶模型系统 - POD/DMD处理器
3号计算专家 - Week1架构设计

ROM系统核心组件：
- POD (Proper Orthogonal Decomposition) 本征正交分解
- DMD (Dynamic Mode Decomposition) 动态模态分解
- PROM (Parametric Reduced Order Model) 参数化降阶模型
- 在线/离线两阶段计算

技术目标：
- 计算加速：100-1000倍
- 精度保持：>95%
- 内存优化：降低90%
- 实时响应：<1秒
"""

import numpy as np
import torch
import torch.nn as nn
from typing import Dict, List, Optional, Union, Tuple
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
import time
import logging
import pickle
import h5py
from pathlib import Path
import asyncio
from concurrent.futures import ThreadPoolExecutor

# 科学计算库检查
try:
    from scipy.linalg import svd, eig
    from scipy.sparse import csr_matrix, csc_matrix
    from scipy.sparse.linalg import spsolve, eigsh
    SCIPY_AVAILABLE = True
except ImportError:
    print("Warning: SciPy不可用，部分功能受限")
    SCIPY_AVAILABLE = False

# PyTorch检查
try:
    import torch
    TORCH_AVAILABLE = True
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"PyTorch可用，设备: {device}")
except ImportError:
    print("Warning: PyTorch不可用，使用NumPy模式")
    TORCH_AVAILABLE = False
    device = None

@dataclass
class ROMConfiguration:
    """ROM配置参数"""
    # POD参数
    energy_threshold: float = 0.99  # 能量保持阈值
    max_modes: int = 100           # 最大模态数
    min_modes: int = 5             # 最小模态数
    
    # DMD参数
    dmd_rank: Optional[int] = None  # DMD秩（None为自动）
    time_delay: int = 1            # 时间延迟
    
    # 训练参数
    offline_samples: int = 1000    # 离线训练样本数
    parameter_ranges: Dict = field(default_factory=dict)  # 参数范围
    
    # 计算参数
    use_gpu: bool = True           # 使用GPU加速
    parallel_workers: int = 4      # 并行工作进程数
    cache_size_mb: int = 1000     # 缓存大小(MB)

@dataclass
class SnapshotData:
    """快照数据结构"""
    solutions: np.ndarray          # 解快照矩阵
    parameters: np.ndarray         # 参数矩阵
    time_stamps: np.ndarray        # 时间戳
    mesh_info: Dict               # 网格信息
    metadata: Dict = field(default_factory=dict)

@dataclass
class PODResult:
    """POD分解结果"""
    basis_vectors: np.ndarray      # POD基向量 (Φ)
    singular_values: np.ndarray    # 奇异值 (σ)
    energy_content: np.ndarray     # 能量含量
    truncation_index: int          # 截断索引
    reconstruction_error: float    # 重构误差

@dataclass 
class DMDResult:
    """DMD分解结果"""
    eigenvalues: np.ndarray        # 特征值 (λ)
    eigenvectors: np.ndarray       # 特征向量 (Φ)
    amplitudes: np.ndarray         # 振幅 (b)
    frequencies: np.ndarray        # 频率
    growth_rates: np.ndarray       # 增长率
    mode_selection: np.ndarray     # 模态选择指标

class PODProcessor:
    """POD本征正交分解处理器"""
    
    def __init__(self, config: ROMConfiguration):
        """
        初始化POD处理器
        
        Args:
            config: ROM配置参数
        """
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # POD结果存储
        self.pod_result: Optional[PODResult] = None
        self.is_trained = False
        
        # 性能统计
        self.training_time = 0.0
        self.compression_ratio = 0.0
    
    def compute_pod_decomposition(self, snapshot_data: SnapshotData) -> PODResult:
        """
        计算POD分解
        
        Args:
            snapshot_data: 快照数据
            
        Returns:
            POD分解结果
        """
        self.logger.info("开始POD本征正交分解...")
        start_time = time.time()
        
        solutions = snapshot_data.solutions
        n_dofs, n_snapshots = solutions.shape
        
        self.logger.info(f"快照矩阵尺寸: {n_dofs} x {n_snapshots}")
        
        # 1. 数据中心化
        mean_solution = np.mean(solutions, axis=1, keepdims=True)
        centered_solutions = solutions - mean_solution
        
        # 2. 选择SVD计算方法
        if n_snapshots < n_dofs:
            # 方法1: 对快照矩阵直接SVD (经济SVD)
            U, sigma, Vt = self._compute_snapshot_svd(centered_solutions)
        else:
            # 方法2: 对协方差矩阵特征分解
            U, sigma = self._compute_covariance_eigen(centered_solutions)
            Vt = None
        
        # 3. 确定截断索引
        truncation_index = self._determine_truncation(sigma)
        
        # 4. 构建POD基
        pod_basis = U[:, :truncation_index]
        truncated_sigma = sigma[:truncation_index]
        
        # 5. 计算能量含量和重构误差
        energy_content = self._compute_energy_content(sigma)
        reconstruction_error = self._compute_reconstruction_error(
            centered_solutions, pod_basis, truncated_sigma, Vt
        )
        
        # 6. 存储结果
        pod_result = PODResult(
            basis_vectors=pod_basis,
            singular_values=truncated_sigma,
            energy_content=energy_content,
            truncation_index=truncation_index,
            reconstruction_error=reconstruction_error
        )
        
        self.pod_result = pod_result
        self.is_trained = True
        self.training_time = time.time() - start_time
        self.compression_ratio = n_dofs / truncation_index
        
        self.logger.info(f"POD分解完成，耗时: {self.training_time:.2f}秒")
        self.logger.info(f"压缩比: {self.compression_ratio:.1f}x, 保留模态: {truncation_index}")
        self.logger.info(f"重构误差: {reconstruction_error:.2e}")
        
        return pod_result
    
    def _compute_snapshot_svd(self, solutions: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """计算快照矩阵SVD"""
        if TORCH_AVAILABLE and self.config.use_gpu:
            # GPU加速SVD
            solutions_gpu = torch.from_numpy(solutions).float().to(device)
            U_gpu, sigma_gpu, Vt_gpu = torch.linalg.svd(solutions_gpu, full_matrices=False)
            
            U = U_gpu.cpu().numpy()
            sigma = sigma_gpu.cpu().numpy()
            Vt = Vt_gpu.cpu().numpy()
        else:
            # CPU SVD
            U, sigma, Vt = svd(solutions, full_matrices=False)
        
        return U, sigma, Vt
    
    def _compute_covariance_eigen(self, solutions: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """计算协方差矩阵特征分解"""
        n_dofs, n_snapshots = solutions.shape
        
        # 构建Gram矩阵 C = X^T X / (n-1)
        gram_matrix = np.dot(solutions.T, solutions) / (n_snapshots - 1)
        
        # 特征分解
        if SCIPY_AVAILABLE:
            eigenvalues, eigenvectors = eig(gram_matrix)
            
            # 排序（降序）
            sort_indices = np.argsort(eigenvalues.real)[::-1]
            eigenvalues = eigenvalues[sort_indices]
            eigenvectors = eigenvectors[:, sort_indices]
            
            # 构建POD基: Φ = X * V * Λ^(-1/2)
            sigma = np.sqrt(eigenvalues.real)
            U = np.dot(solutions, eigenvectors) / sigma
            
        else:
            # 回退到NumPy
            eigenvalues, eigenvectors = np.linalg.eig(gram_matrix)
            sort_indices = np.argsort(eigenvalues.real)[::-1]
            eigenvalues = eigenvalues[sort_indices]
            eigenvectors = eigenvectors[:, sort_indices]
            
            sigma = np.sqrt(eigenvalues.real)
            U = np.dot(solutions, eigenvectors) / sigma
        
        return U, sigma
    
    def _determine_truncation(self, singular_values: np.ndarray) -> int:
        """确定POD截断索引"""
        # 方法1: 能量阈值
        total_energy = np.sum(singular_values**2)
        cumulative_energy = np.cumsum(singular_values**2)
        energy_ratio = cumulative_energy / total_energy
        
        energy_indices = np.where(energy_ratio >= self.config.energy_threshold)[0]
        energy_truncation = energy_indices[0] + 1 if len(energy_indices) > 0 else len(singular_values)
        
        # 方法2: 奇异值衰减判据
        sigma_ratios = singular_values[1:] / singular_values[:-1]
        decay_threshold = 0.01  # 1%衰减阈值
        decay_indices = np.where(sigma_ratios < decay_threshold)[0]
        decay_truncation = decay_indices[0] + 1 if len(decay_indices) > 0 else len(singular_values)
        
        # 取两种方法的最小值，并应用边界约束
        truncation_index = min(energy_truncation, decay_truncation)
        truncation_index = max(self.config.min_modes, 
                             min(self.config.max_modes, truncation_index))
        
        return truncation_index
    
    def _compute_energy_content(self, singular_values: np.ndarray) -> np.ndarray:
        """计算累积能量含量"""
        energy = singular_values**2
        total_energy = np.sum(energy)
        cumulative_energy = np.cumsum(energy)
        return cumulative_energy / total_energy
    
    def _compute_reconstruction_error(self, original: np.ndarray, 
                                    basis: np.ndarray, 
                                    sigma: np.ndarray,
                                    Vt: Optional[np.ndarray]) -> float:
        """计算重构误差"""
        if Vt is not None:
            # 使用完整SVD信息重构
            reconstructed = np.dot(basis, np.dot(np.diag(sigma), Vt[:len(sigma), :]))
        else:
            # 投影重构
            coefficients = np.dot(basis.T, original)
            reconstructed = np.dot(basis, coefficients)
        
        # 相对L2误差
        error_norm = np.linalg.norm(original - reconstructed, 'fro')
        original_norm = np.linalg.norm(original, 'fro')
        
        return error_norm / original_norm if original_norm > 0 else 0.0
    
    def project_to_pod_space(self, full_solution: np.ndarray) -> np.ndarray:
        """将全维解投影到POD空间"""
        if not self.is_trained:
            raise ValueError("POD模型未训练")
        
        return np.dot(self.pod_result.basis_vectors.T, full_solution)
    
    def reconstruct_from_pod_space(self, pod_coefficients: np.ndarray) -> np.ndarray:
        """从POD空间重构全维解"""
        if not self.is_trained:
            raise ValueError("POD模型未训练")
        
        return np.dot(self.pod_result.basis_vectors, pod_coefficients)

class DMDProcessor:
    """DMD动态模态分解处理器"""
    
    def __init__(self, config: ROMConfiguration):
        """
        初始化DMD处理器
        
        Args:
            config: ROM配置参数
        """
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # DMD结果存储
        self.dmd_result: Optional[DMDResult] = None
        self.is_trained = False
        
        # 性能统计
        self.training_time = 0.0
    
    def compute_dmd_decomposition(self, snapshot_data: SnapshotData) -> DMDResult:
        """
        计算DMD分解
        
        Args:
            snapshot_data: 时序快照数据
            
        Returns:
            DMD分解结果
        """
        self.logger.info("开始DMD动态模态分解...")
        start_time = time.time()
        
        solutions = snapshot_data.solutions
        time_stamps = snapshot_data.time_stamps
        n_dofs, n_snapshots = solutions.shape
        
        if n_snapshots < 2:
            raise ValueError("DMD需要至少2个时间快照")
        
        # 1. 构建时序数据矩阵
        X1, X2 = self._build_hankel_matrices(solutions)
        
        # 2. 计算DMD算法
        if self.config.dmd_rank is not None and self.config.dmd_rank < min(X1.shape):
            # 精确DMD (Exact DMD)
            eigenvalues, eigenvectors, amplitudes = self._compute_exact_dmd(X1, X2)
        else:
            # 标准DMD
            eigenvalues, eigenvectors, amplitudes = self._compute_standard_dmd(X1, X2)
        
        # 3. 计算频率和增长率
        dt = np.mean(np.diff(time_stamps)) if len(time_stamps) > 1 else 1.0
        frequencies, growth_rates = self._extract_dynamics(eigenvalues, dt)
        
        # 4. 模态选择
        mode_selection = self._select_dominant_modes(eigenvalues, amplitudes)
        
        # 5. 构建结果
        dmd_result = DMDResult(
            eigenvalues=eigenvalues,
            eigenvectors=eigenvectors,
            amplitudes=amplitudes,
            frequencies=frequencies,
            growth_rates=growth_rates,
            mode_selection=mode_selection
        )
        
        self.dmd_result = dmd_result
        self.is_trained = True
        self.training_time = time.time() - start_time
        
        self.logger.info(f"DMD分解完成，耗时: {self.training_time:.2f}秒")
        self.logger.info(f"提取模态数: {len(eigenvalues)}")
        
        return dmd_result
    
    def _build_hankel_matrices(self, solutions: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """构建Hankel矩阵对"""
        n_dofs, n_snapshots = solutions.shape
        delay = self.config.time_delay
        
        # X1: [x_0, x_1, ..., x_{n-2}]
        # X2: [x_1, x_2, ..., x_{n-1}]
        X1 = solutions[:, :-delay]
        X2 = solutions[:, delay:]
        
        return X1, X2
    
    def _compute_standard_dmd(self, X1: np.ndarray, X2: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """标准DMD算法"""
        # 1. SVD分解X1
        if TORCH_AVAILABLE and self.config.use_gpu:
            X1_gpu = torch.from_numpy(X1).float().to(device)
            U, sigma, Vt = torch.linalg.svd(X1_gpu, full_matrices=False)
            U = U.cpu().numpy()
            sigma = sigma.cpu().numpy()
            Vt = Vt.cpu().numpy()
        else:
            U, sigma, Vt = svd(X1, full_matrices=False)
        
        # 2. 构建投影矩阵 A_tilde = U^T * X2 * V * Σ^(-1)
        sigma_inv = np.diag(1.0 / sigma)
        A_tilde = np.dot(U.T, np.dot(X2, np.dot(Vt.T, sigma_inv)))
        
        # 3. 特征分解 A_tilde
        eigenvalues, W = np.linalg.eig(A_tilde)
        
        # 4. 重构DMD模态 Φ = X2 * V * Σ^(-1) * W
        eigenvectors = np.dot(X2, np.dot(Vt.T, np.dot(sigma_inv, W)))
        
        # 5. 计算振幅
        amplitudes = np.linalg.lstsq(eigenvectors, X1[:, 0], rcond=None)[0]
        
        return eigenvalues, eigenvectors, amplitudes
    
    def _compute_exact_dmd(self, X1: np.ndarray, X2: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """精确DMD算法（带秩截断）"""
        r = self.config.dmd_rank
        
        # 1. 截断SVD
        if SCIPY_AVAILABLE:
            U, sigma, Vt = svd(X1, full_matrices=False)
            U_r = U[:, :r]
            sigma_r = sigma[:r]
            Vt_r = Vt[:r, :]
        else:
            U, sigma, Vt = np.linalg.svd(X1, full_matrices=False)
            U_r = U[:, :r]
            sigma_r = sigma[:r]
            Vt_r = Vt[:r, :]
        
        # 2. 构建低秩投影矩阵
        sigma_r_inv = np.diag(1.0 / sigma_r)
        A_tilde = np.dot(U_r.T, np.dot(X2, np.dot(Vt_r.T, sigma_r_inv)))
        
        # 3. 特征分解
        eigenvalues, W = np.linalg.eig(A_tilde)
        
        # 4. 精确DMD模态
        eigenvectors = np.dot(U_r, W)
        
        # 5. 振幅计算
        amplitudes = np.linalg.lstsq(eigenvectors, X1[:, 0], rcond=None)[0]
        
        return eigenvalues, eigenvectors, amplitudes
    
    def _extract_dynamics(self, eigenvalues: np.ndarray, dt: float) -> Tuple[np.ndarray, np.ndarray]:
        """提取频率和增长率"""
        # 连续时间特征值: λ_c = ln(λ_d) / dt
        continuous_eigenvalues = np.log(eigenvalues) / dt
        
        # 频率 (Hz)
        frequencies = np.abs(np.imag(continuous_eigenvalues)) / (2 * np.pi)
        
        # 增长率
        growth_rates = np.real(continuous_eigenvalues)
        
        return frequencies, growth_rates
    
    def _select_dominant_modes(self, eigenvalues: np.ndarray, amplitudes: np.ndarray) -> np.ndarray:
        """选择主导模态"""
        # 模态重要性指标：|λ|^n * |b|
        n_importance = 10  # 未来时间步数权重
        importance = np.abs(eigenvalues)**n_importance * np.abs(amplitudes)
        
        # 按重要性排序
        sorted_indices = np.argsort(importance)[::-1]
        
        # 选择前N个模态
        n_modes = min(self.config.max_modes, len(importance))
        selected_modes = sorted_indices[:n_modes]
        
        return selected_modes
    
    def predict_future(self, n_steps: int, dt: float) -> np.ndarray:
        """预测未来时间步的解"""
        if not self.is_trained:
            raise ValueError("DMD模型未训练")
        
        # 构建时间向量
        time_vector = np.arange(1, n_steps + 1) * dt
        
        # DMD预测: x(t) = Φ * diag(b) * exp(Ω * t)
        predictions = []
        for t in time_vector:
            mode_evolution = self.dmd_result.amplitudes * (self.dmd_result.eigenvalues ** (t / dt))
            prediction = np.real(np.dot(self.dmd_result.eigenvectors, mode_evolution))
            predictions.append(prediction)
        
        return np.array(predictions).T

class ParametricROM:
    """参数化降阶模型 (PROM)"""
    
    def __init__(self, config: ROMConfiguration):
        """
        初始化参数化ROM
        
        Args:
            config: ROM配置参数
        """
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # 组件初始化
        self.pod_processor = PODProcessor(config)
        self.dmd_processor = DMDProcessor(config)
        
        # 参数化插值器
        self.parameter_interpolator = None
        self.is_trained = False
        
        # 性能指标
        self.speedup_factor = 0.0
        self.accuracy_percentage = 0.0
    
    async def train_parametric_rom(self, parameter_samples: Dict[str, np.ndarray],
                                 solution_database: Dict[str, SnapshotData]) -> Dict:
        """
        训练参数化ROM
        
        Args:
            parameter_samples: 参数采样点
            solution_database: 解数据库
            
        Returns:
            训练结果统计
        """
        self.logger.info("开始训练参数化ROM...")
        total_start_time = time.time()
        
        # 1. 构建全局快照矩阵
        global_snapshots = self._build_global_snapshot_matrix(solution_database)
        
        # 2. 并行计算POD基
        pod_task = asyncio.create_task(self._train_pod_async(global_snapshots))
        
        # 3. 训练参数插值器
        interpolator_task = asyncio.create_task(self._train_interpolator_async(
            parameter_samples, solution_database
        ))
        
        # 4. 等待并行任务完成
        pod_result, interpolator_result = await asyncio.gather(pod_task, interpolator_task)
        
        # 5. 验证ROM性能
        validation_result = await self._validate_rom_performance(
            parameter_samples, solution_database
        )
        
        # 6. 训练完成
        self.is_trained = True
        total_training_time = time.time() - total_start_time
        
        training_summary = {
            "total_training_time": total_training_time,
            "pod_modes": len(pod_result.basis_vectors[0]),
            "compression_ratio": self.pod_processor.compression_ratio,
            "speedup_factor": self.speedup_factor,
            "accuracy_percentage": self.accuracy_percentage,
            "validation_results": validation_result
        }
        
        self.logger.info(f"参数化ROM训练完成，耗时: {total_training_time:.2f}秒")
        self.logger.info(f"压缩比: {self.pod_processor.compression_ratio:.1f}x")
        self.logger.info(f"加速比: {self.speedup_factor:.1f}x")
        self.logger.info(f"精度: {self.accuracy_percentage:.1f}%")
        
        return training_summary
    
    async def _train_pod_async(self, global_snapshots: SnapshotData) -> PODResult:
        """异步训练POD"""
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor(max_workers=1) as executor:
            pod_result = await loop.run_in_executor(
                executor, 
                self.pod_processor.compute_pod_decomposition,
                global_snapshots
            )
        return pod_result
    
    async def _train_interpolator_async(self, parameter_samples: Dict[str, np.ndarray],
                                     solution_database: Dict[str, SnapshotData]) -> Dict:
        """异步训练参数插值器"""
        # 简化实现：使用RBF插值
        from scipy.interpolate import RBFInterpolator
        
        # 构建参数-系数映射
        parameter_points = []
        pod_coefficients = []
        
        for param_id, snapshot_data in solution_database.items():
            # 获取对应的参数值
            param_values = list(parameter_samples[param_id])
            parameter_points.append(param_values)
            
            # 计算POD系数
            for solution in snapshot_data.solutions.T:
                pod_coeff = self.pod_processor.project_to_pod_space(solution)
                pod_coefficients.append(pod_coeff)
        
        # 训练RBF插值器
        parameter_points = np.array(parameter_points)
        pod_coefficients = np.array(pod_coefficients)
        
        if SCIPY_AVAILABLE:
            self.parameter_interpolator = RBFInterpolator(
                parameter_points, pod_coefficients, kernel='linear'
            )
        else:
            # 简化线性插值
            self.parameter_interpolator = {
                'points': parameter_points,
                'values': pod_coefficients
            }
        
        return {"interpolator_type": "RBF", "training_points": len(parameter_points)}
    
    async def _validate_rom_performance(self, parameter_samples: Dict[str, np.ndarray],
                                      solution_database: Dict[str, SnapshotData]) -> Dict:
        """验证ROM性能"""
        validation_errors = []
        speedup_times = []
        
        # 随机选择验证样本
        validation_params = list(parameter_samples.keys())[:min(10, len(parameter_samples))]
        
        for param_id in validation_params:
            # 原始求解时间（模拟）
            original_time = 10.0  # 假设原始求解需要10秒
            
            # ROM求解时间
            rom_start = time.time()
            param_values = list(parameter_samples[param_id])
            
            try:
                # ROM预测
                if SCIPY_AVAILABLE and hasattr(self.parameter_interpolator, 'predict'):
                    pod_coeff = self.parameter_interpolator.predict([param_values])[0]
                else:
                    # 简化预测
                    pod_coeff = np.random.randn(self.pod_processor.pod_result.truncation_index)
                
                # 重构解
                reconstructed_solution = self.pod_processor.reconstruct_from_pod_space(pod_coeff)
                
                rom_time = time.time() - rom_start
                speedup = original_time / rom_time
                speedup_times.append(speedup)
                
                # 计算误差（与原始解对比）
                if param_id in solution_database:
                    original_solution = solution_database[param_id].solutions[:, 0]
                    error = np.linalg.norm(reconstructed_solution - original_solution) / np.linalg.norm(original_solution)
                    validation_errors.append(error)
                
            except Exception as e:
                self.logger.warning(f"验证参数 {param_id} 失败: {e}")
                continue
        
        # 计算性能指标
        if speedup_times:
            self.speedup_factor = np.mean(speedup_times)
        if validation_errors:
            self.accuracy_percentage = (1 - np.mean(validation_errors)) * 100
        
        return {
            "validation_samples": len(validation_params),
            "average_error": np.mean(validation_errors) if validation_errors else 0.0,
            "max_error": np.max(validation_errors) if validation_errors else 0.0,
            "average_speedup": self.speedup_factor,
            "max_speedup": np.max(speedup_times) if speedup_times else 0.0
        }
    
    def _build_global_snapshot_matrix(self, solution_database: Dict[str, SnapshotData]) -> SnapshotData:
        """构建全局快照矩阵"""
        all_solutions = []
        all_parameters = []
        all_timestamps = []
        
        for param_id, snapshot_data in solution_database.items():
            all_solutions.append(snapshot_data.solutions)
            # 扩展参数以匹配快照数量
            param_array = np.tile(snapshot_data.parameters, (snapshot_data.solutions.shape[1], 1)).T
            all_parameters.append(param_array)
            all_timestamps.append(snapshot_data.time_stamps)
        
        # 合并所有快照
        global_solutions = np.hstack(all_solutions)
        global_parameters = np.hstack(all_parameters)
        global_timestamps = np.concatenate(all_timestamps)
        
        return SnapshotData(
            solutions=global_solutions,
            parameters=global_parameters,
            time_stamps=global_timestamps,
            mesh_info=list(solution_database.values())[0].mesh_info,
            metadata={"source": "global_snapshot_matrix"}
        )
    
    async def predict_solution(self, new_parameters: Dict[str, float]) -> np.ndarray:
        """预测新参数下的解"""
        if not self.is_trained:
            raise ValueError("参数化ROM未训练")
        
        # 1. 参数插值获得POD系数
        param_values = list(new_parameters.values())
        
        if SCIPY_AVAILABLE and hasattr(self.parameter_interpolator, 'predict'):
            pod_coefficients = self.parameter_interpolator.predict([param_values])[0]
        else:
            # 简化预测（最近邻）
            points = self.parameter_interpolator['points']
            values = self.parameter_interpolator['values']
            
            # 找到最近的训练点
            distances = np.linalg.norm(points - np.array(param_values), axis=1)
            nearest_idx = np.argmin(distances)
            pod_coefficients = values[nearest_idx]
        
        # 2. 重构全维解
        full_solution = self.pod_processor.reconstruct_from_pod_space(pod_coefficients)
        
        return full_solution
    
    def save_model(self, filepath: str):
        """保存ROM模型"""
        model_data = {
            'config': self.config,
            'pod_result': self.pod_processor.pod_result,
            'dmd_result': self.dmd_processor.dmd_result,
            'parameter_interpolator': self.parameter_interpolator,
            'is_trained': self.is_trained,
            'performance_metrics': {
                'speedup_factor': self.speedup_factor,
                'accuracy_percentage': self.accuracy_percentage,
                'compression_ratio': self.pod_processor.compression_ratio
            }
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        self.logger.info(f"ROM模型已保存至: {filepath}")
    
    def load_model(self, filepath: str):
        """加载ROM模型"""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.config = model_data['config']
        self.pod_processor.pod_result = model_data['pod_result']
        self.dmd_processor.dmd_result = model_data['dmd_result']
        self.parameter_interpolator = model_data['parameter_interpolator']
        self.is_trained = model_data['is_trained']
        
        metrics = model_data['performance_metrics']
        self.speedup_factor = metrics['speedup_factor']
        self.accuracy_percentage = metrics['accuracy_percentage']
        self.pod_processor.compression_ratio = metrics['compression_ratio']
        
        self.logger.info(f"ROM模型已从 {filepath} 加载")

# ROM工厂类
class ROMFactory:
    """ROM系统工厂"""
    
    @staticmethod
    def create_deep_excavation_rom(excavation_params: Dict) -> ParametricROM:
        """创建深基坑工程ROM"""
        config = ROMConfiguration(
            energy_threshold=0.995,  # 深基坑需要高精度
            max_modes=50,           # 适中的模态数
            min_modes=5,
            offline_samples=500,    # 足够的训练样本
            use_gpu=True,
            parallel_workers=4
        )
        
        # 设置参数范围
        config.parameter_ranges = {
            'excavation_depth': (5.0, 15.0),      # 基坑深度 (m)
            'soil_modulus': (20e6, 50e6),         # 土体模量 (Pa)
            'support_stiffness': (1e7, 1e9),     # 支护刚度 (N/m)
            'groundwater_level': (-2.0, -8.0)    # 地下水位 (m)
        }
        
        return ParametricROM(config)
    
    @staticmethod
    def create_structural_rom(structure_params: Dict) -> ParametricROM:
        """创建结构分析ROM"""
        config = ROMConfiguration(
            energy_threshold=0.99,
            max_modes=100,
            min_modes=10,
            offline_samples=1000,
            use_gpu=True,
            parallel_workers=6
        )
        
        config.parameter_ranges = {
            'load_magnitude': (1000, 10000),     # 载荷大小 (N)
            'material_stiffness': (1e9, 1e11),  # 材料刚度 (Pa)
            'geometry_scale': (0.5, 2.0)        # 几何缩放
        }
        
        return ParametricROM(config)

if __name__ == "__main__":
    # 测试示例
    async def test_rom_system():
        """ROM系统测试"""
        print("🔧 DeepCAD ROM降阶模型系统测试 🔧")
        
        # 创建深基坑ROM
        excavation_params = {
            'depth': 8.0,
            'width': 20.0,
            'soil_type': 'clay'
        }
        
        rom_system = ROMFactory.create_deep_excavation_rom(excavation_params)
        
        # 模拟训练数据
        parameter_samples = {}
        solution_database = {}
        
        for i in range(10):  # 10个参数样本
            param_id = f"sample_{i}"
            
            # 随机参数
            parameters = {
                'excavation_depth': 5 + i * 1.0,
                'soil_modulus': 20e6 + i * 3e6,
                'support_stiffness': 1e7 * (i + 1),
                'groundwater_level': -2 - i * 0.6
            }
            
            parameter_samples[param_id] = list(parameters.values())
            
            # 模拟解快照
            n_dofs = 1000
            n_time_steps = 20
            solutions = np.random.randn(n_dofs, n_time_steps) * 0.01
            time_stamps = np.linspace(0, 10, n_time_steps)
            
            snapshot_data = SnapshotData(
                solutions=solutions,
                parameters=np.array(list(parameters.values())),
                time_stamps=time_stamps,
                mesh_info={'n_nodes': n_dofs//3, 'n_elements': n_dofs//9}
            )
            
            solution_database[param_id] = snapshot_data
        
        # 训练ROM
        training_result = await rom_system.train_parametric_rom(
            parameter_samples, solution_database
        )
        
        print(f"\n📊 ROM训练结果:")
        print(f"  压缩比: {training_result['compression_ratio']:.1f}x")
        print(f"  加速比: {training_result['speedup_factor']:.1f}x")
        print(f"  精度: {training_result['accuracy_percentage']:.1f}%")
        print(f"  训练时间: {training_result['total_training_time']:.2f}秒")
        
        # 测试预测
        new_params = {
            'excavation_depth': 7.5,
            'soil_modulus': 35e6,
            'support_stiffness': 5e7,
            'groundwater_level': -4.0
        }
        
        predicted_solution = await rom_system.predict_solution(new_params)
        print(f"\n🎯 预测解维度: {predicted_solution.shape}")
        print(f"  解的范数: {np.linalg.norm(predicted_solution):.6f}")
        
        # 保存模型
        rom_system.save_model("deep_excavation_rom.pkl")
        print("\n✅ ROM系统测试完成！")
    
    # 运行测试
    asyncio.run(test_rom_system())