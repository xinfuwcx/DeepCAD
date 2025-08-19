#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
并行性能优化模块
针对Kratos摩尔-库伦求解器的并行计算优化和性能监控
"""

import os
import psutil
import threading
import multiprocessing
import time
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import logging
import concurrent.futures

logger = logging.getLogger(__name__)


class ParallelStrategy(Enum):
    """并行策略枚举"""
    SINGLE_THREAD = "single"
    OPENMP = "openmp"
    MPI = "mpi"
    HYBRID = "hybrid"
    GPU = "gpu"


class PerformanceLevel(Enum):
    """性能级别枚举"""
    ECO = "eco"          # 节能模式
    BALANCED = "balanced" # 平衡模式
    PERFORMANCE = "performance"  # 性能模式
    EXTREME = "extreme"   # 极限模式


@dataclass
class SystemResources:
    """系统资源信息"""
    cpu_cores: int
    physical_cores: int
    memory_gb: float
    available_memory_gb: float
    cpu_frequency_ghz: float
    cache_size_mb: int
    has_hyperthreading: bool
    has_gpu: bool
    gpu_memory_gb: float = 0.0


@dataclass
class ParallelConfig:
    """并行配置"""
    strategy: ParallelStrategy
    num_threads: int
    chunk_size: int
    memory_limit_gb: float
    use_numa: bool
    gpu_enabled: bool
    mpi_processes: int


class SystemProfiler:
    """系统性能分析器"""
    
    def __init__(self):
        self.system_info = self._detect_system_resources()
        
    def _detect_system_resources(self) -> SystemResources:
        """检测系统资源"""
        # CPU信息
        cpu_count = psutil.cpu_count(logical=True)
        physical_cores = psutil.cpu_count(logical=False)
        
        # 内存信息
        memory = psutil.virtual_memory()
        memory_gb = memory.total / (1024**3)
        available_memory_gb = memory.available / (1024**3)
        
        # CPU频率
        cpu_freq = psutil.cpu_freq()
        cpu_frequency_ghz = cpu_freq.current / 1000 if cpu_freq else 2.5
        
        # 检测超线程
        has_hyperthreading = cpu_count > physical_cores
        
        # 检测GPU（简化检测）
        has_gpu = self._detect_gpu()
        gpu_memory_gb = self._get_gpu_memory() if has_gpu else 0.0
        
        # 缓存大小（估算）
        cache_size_mb = self._estimate_cache_size()
        
        return SystemResources(
            cpu_cores=cpu_count,
            physical_cores=physical_cores,
            memory_gb=memory_gb,
            available_memory_gb=available_memory_gb,
            cpu_frequency_ghz=cpu_frequency_ghz,
            cache_size_mb=cache_size_mb,
            has_hyperthreading=has_hyperthreading,
            has_gpu=has_gpu,
            gpu_memory_gb=gpu_memory_gb
        )
    
    def _detect_gpu(self) -> bool:
        """检测GPU可用性"""
        try:
            import pynvml
            pynvml.nvmlInit()
            return pynvml.nvmlDeviceGetCount() > 0
        except:
            # 检查AMD GPU
            try:
                import subprocess
                result = subprocess.run(['wmic', 'path', 'win32_VideoController', 'get', 'name'], 
                                      capture_output=True, text=True)
                return 'AMD' in result.stdout or 'NVIDIA' in result.stdout
            except:
                return False
    
    def _get_gpu_memory(self) -> float:
        """获取GPU内存大小"""
        try:
            import pynvml
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            return mem_info.total / (1024**3)  # GB
        except:
            return 4.0  # 默认4GB
    
    def _estimate_cache_size(self) -> int:
        """估算缓存大小"""
        # 基于CPU核心数估算L3缓存
        physical_cores = self.system_info.physical_cores if hasattr(self, 'system_info') else psutil.cpu_count(logical=False)
        return max(8, physical_cores * 2)  # 每核心2MB L3缓存
    
    def get_optimal_parallel_config(self, problem_size: int, 
                                  performance_level: PerformanceLevel = PerformanceLevel.BALANCED) -> ParallelConfig:
        """获取最优并行配置"""
        
        if performance_level == PerformanceLevel.ECO:
            return self._get_eco_config(problem_size)
        elif performance_level == PerformanceLevel.BALANCED:
            return self._get_balanced_config(problem_size)
        elif performance_level == PerformanceLevel.PERFORMANCE:
            return self._get_performance_config(problem_size)
        else:  # EXTREME
            return self._get_extreme_config(problem_size)
    
    def _get_eco_config(self, problem_size: int) -> ParallelConfig:
        """节能配置"""
        num_threads = min(4, self.system_info.physical_cores)
        
        return ParallelConfig(
            strategy=ParallelStrategy.OPENMP,
            num_threads=num_threads,
            chunk_size=max(1000, problem_size // (num_threads * 4)),
            memory_limit_gb=min(4.0, self.system_info.available_memory_gb * 0.5),
            use_numa=False,
            gpu_enabled=False,
            mpi_processes=1
        )
    
    def _get_balanced_config(self, problem_size: int) -> ParallelConfig:
        """平衡配置"""
        # 使用60%的物理核心
        num_threads = max(1, int(self.system_info.physical_cores * 0.6))
        
        # 根据问题规模选择策略
        if problem_size > 500000:
            strategy = ParallelStrategy.HYBRID if self.system_info.cpu_cores > 8 else ParallelStrategy.OPENMP
        else:
            strategy = ParallelStrategy.OPENMP
        
        return ParallelConfig(
            strategy=strategy,
            num_threads=num_threads,
            chunk_size=max(500, problem_size // (num_threads * 8)),
            memory_limit_gb=min(8.0, self.system_info.available_memory_gb * 0.7),
            use_numa=self.system_info.physical_cores > 8,
            gpu_enabled=self.system_info.has_gpu and problem_size > 100000,
            mpi_processes=1
        )
    
    def _get_performance_config(self, problem_size: int) -> ParallelConfig:
        """性能配置"""
        # 使用所有物理核心
        num_threads = self.system_info.physical_cores
        
        # 大问题使用混合并行
        if problem_size > 1000000 and self.system_info.cpu_cores > 16:
            strategy = ParallelStrategy.HYBRID
            mpi_processes = min(4, self.system_info.physical_cores // 4)
        else:
            strategy = ParallelStrategy.OPENMP
            mpi_processes = 1
        
        return ParallelConfig(
            strategy=strategy,
            num_threads=num_threads,
            chunk_size=max(200, problem_size // (num_threads * 16)),
            memory_limit_gb=min(16.0, self.system_info.available_memory_gb * 0.8),
            use_numa=True,
            gpu_enabled=self.system_info.has_gpu,
            mpi_processes=mpi_processes
        )
    
    def _get_extreme_config(self, problem_size: int) -> ParallelConfig:
        """极限配置"""
        # 使用超线程
        num_threads = self.system_info.cpu_cores if self.system_info.has_hyperthreading else self.system_info.physical_cores
        
        return ParallelConfig(
            strategy=ParallelStrategy.HYBRID,
            num_threads=num_threads,
            chunk_size=max(100, problem_size // (num_threads * 32)),
            memory_limit_gb=self.system_info.available_memory_gb * 0.9,
            use_numa=True,
            gpu_enabled=self.system_info.has_gpu,
            mpi_processes=min(8, self.system_info.physical_cores // 2)
        )


class PerformanceMonitor:
    """性能监控器"""
    
    def __init__(self):
        self.monitoring = False
        self.metrics = []
        self.monitor_thread = None
        
    def start_monitoring(self, interval: float = 1.0):
        """开始性能监控"""
        self.monitoring = True
        self.metrics = []
        self.monitor_thread = threading.Thread(target=self._monitor_loop, args=(interval,))
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        
    def stop_monitoring(self) -> Dict[str, Any]:
        """停止监控并返回统计信息"""
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=2.0)
        
        return self._compute_statistics()
    
    def _monitor_loop(self, interval: float):
        """监控循环"""
        while self.monitoring:
            try:
                # CPU使用率
                cpu_percent = psutil.cpu_percent(interval=0.1)
                
                # 内存使用
                memory = psutil.virtual_memory()
                memory_percent = memory.percent
                memory_used_gb = (memory.total - memory.available) / (1024**3)
                
                # 磁盘I/O
                disk_io = psutil.disk_io_counters()
                
                # 网络I/O
                net_io = psutil.net_io_counters()
                
                metric = {
                    'timestamp': time.time(),
                    'cpu_percent': cpu_percent,
                    'memory_percent': memory_percent,
                    'memory_used_gb': memory_used_gb,
                    'disk_read_mb': disk_io.read_bytes / (1024**2) if disk_io else 0,
                    'disk_write_mb': disk_io.write_bytes / (1024**2) if disk_io else 0,
                    'network_sent_mb': net_io.bytes_sent / (1024**2) if net_io else 0,
                    'network_recv_mb': net_io.bytes_recv / (1024**2) if net_io else 0
                }
                
                self.metrics.append(metric)
                
                time.sleep(interval)
                
            except Exception as e:
                logger.warning(f"性能监控异常: {e}")
                time.sleep(interval)
    
    def _compute_statistics(self) -> Dict[str, Any]:
        """计算性能统计"""
        if not self.metrics:
            return {"error": "无监控数据"}
        
        # 转换为numpy数组便于计算
        cpu_data = [m['cpu_percent'] for m in self.metrics]
        memory_data = [m['memory_percent'] for m in self.metrics]
        memory_gb_data = [m['memory_used_gb'] for m in self.metrics]
        
        duration = self.metrics[-1]['timestamp'] - self.metrics[0]['timestamp']
        
        return {
            'monitoring_duration': duration,
            'sample_count': len(self.metrics),
            'cpu_usage': {
                'mean': np.mean(cpu_data),
                'max': np.max(cpu_data),
                'min': np.min(cpu_data),
                'std': np.std(cpu_data)
            },
            'memory_usage': {
                'mean_percent': np.mean(memory_data),
                'max_percent': np.max(memory_data),
                'mean_gb': np.mean(memory_gb_data),
                'max_gb': np.max(memory_gb_data)
            },
            'disk_io': {
                'total_read_mb': self.metrics[-1]['disk_read_mb'] - self.metrics[0]['disk_read_mb'],
                'total_write_mb': self.metrics[-1]['disk_write_mb'] - self.metrics[0]['disk_write_mb']
            },
            'network_io': {
                'total_sent_mb': self.metrics[-1]['network_sent_mb'] - self.metrics[0]['network_sent_mb'],
                'total_recv_mb': self.metrics[-1]['network_recv_mb'] - self.metrics[0]['network_recv_mb']
            }
        }


class ParallelOptimizer:
    """并行优化器"""
    
    def __init__(self):
        self.profiler = SystemProfiler()
        self.monitor = PerformanceMonitor()
        
    def optimize_kratos_settings(self, 
                                problem_size: int,
                                performance_level: PerformanceLevel = PerformanceLevel.BALANCED) -> Dict[str, Any]:
        """优化Kratos求解器设置"""
        
        # 获取最优并行配置
        config = self.profiler.get_optimal_parallel_config(problem_size, performance_level)
        
        # 生成Kratos设置
        kratos_settings = self._generate_kratos_parallel_settings(config, problem_size)
        
        # 环境变量设置
        env_settings = self._generate_environment_settings(config)
        
        return {
            'kratos_settings': kratos_settings,
            'environment_settings': env_settings,
            'parallel_config': config,
            'system_info': self.profiler.system_info
        }
    
    def _generate_kratos_parallel_settings(self, config: ParallelConfig, problem_size: int) -> Dict[str, Any]:
        """生成Kratos并行设置"""
        
        # 基础求解器设置
        solver_settings = {
            "echo_level": 1,
            "parallel_type": "OpenMP" if config.strategy == ParallelStrategy.OPENMP else "MPI"
        }
        
        # 线性求解器优化
        if problem_size < 50000:
            # 小问题：直接法
            linear_solver = {
                "solver_type": "skyline_lu_factorization",
                "scaling": True
            }
        elif problem_size < 500000:
            # 中等问题：预处理共轭梯度
            linear_solver = {
                "solver_type": "amgcl",
                "tolerance": 1e-6,
                "max_iteration": min(1000, problem_size // 100),
                "scaling": True,
                "verbosity": 0,
                "smoother_type": "ilu0",
                "krylov_type": "cg",
                "coarsening": {
                    "type": "smoothed_aggregation",
                    "relax": 0.67
                }
            }
        else:
            # 大问题：多重网格
            linear_solver = {
                "solver_type": "amgcl",
                "tolerance": 1e-7,
                "max_iteration": min(2000, problem_size // 200),
                "scaling": True,
                "verbosity": 0,
                "smoother_type": "spai0",
                "krylov_type": "bicgstab",
                "coarsening": {
                    "type": "smoothed_aggregation",
                    "relax": 0.67,
                    "aggr": {
                        "eps_strong": 0.08,
                        "block_size": min(8, config.num_threads)
                    }
                }
            }
        
        # GPU加速设置
        if config.gpu_enabled:
            linear_solver["use_gpu"] = True
            linear_solver["gpu_memory_limit"] = min(config.memory_limit_gb, 
                                                   self.profiler.system_info.gpu_memory_gb * 0.8)
        
        solver_settings["linear_solver_settings"] = linear_solver
        
        # 并行设置
        if config.strategy in [ParallelStrategy.OPENMP, ParallelStrategy.HYBRID]:
            solver_settings["openmp_settings"] = {
                "num_threads": config.num_threads,
                "chunk_size": config.chunk_size,
                "schedule": "dynamic"
            }
        
        if config.strategy in [ParallelStrategy.MPI, ParallelStrategy.HYBRID]:
            solver_settings["mpi_settings"] = {
                "num_processes": config.mpi_processes,
                "domain_decomposition": "metis"
            }
        
        return solver_settings
    
    def _generate_environment_settings(self, config: ParallelConfig) -> Dict[str, str]:
        """生成环境变量设置"""
        env_vars = {}
        
        # OpenMP设置
        if config.strategy in [ParallelStrategy.OPENMP, ParallelStrategy.HYBRID]:
            env_vars["OMP_NUM_THREADS"] = str(config.num_threads)
            env_vars["OMP_SCHEDULE"] = "dynamic"
            env_vars["OMP_PROC_BIND"] = "close"
            
            if config.use_numa:
                env_vars["OMP_PLACES"] = "cores"
                env_vars["GOMP_CPU_AFFINITY"] = "0-{}".format(config.num_threads - 1)
        
        # 内存设置
        env_vars["OMP_STACKSIZE"] = "64M"
        env_vars["KMP_STACKSIZE"] = "64M"
        
        # Intel MKL设置（如果使用）
        env_vars["MKL_NUM_THREADS"] = str(config.num_threads)
        env_vars["MKL_DYNAMIC"] = "FALSE"
        
        # 内存分配器优化
        if config.memory_limit_gb > 16:
            env_vars["MALLOC_MMAP_THRESHOLD_"] = "65536"
            env_vars["MALLOC_TRIM_THRESHOLD_"] = "131072"
        
        return env_vars
    
    def benchmark_parallel_performance(self, problem_sizes: List[int]) -> Dict[str, Any]:
        """并行性能基准测试"""
        benchmark_results = {}
        
        for size in problem_sizes:
            logger.info(f"测试问题规模: {size:,}")
            
            size_results = {}
            
            # 测试不同并行策略
            for strategy in [ParallelStrategy.SINGLE_THREAD, ParallelStrategy.OPENMP]:
                if strategy == ParallelStrategy.SINGLE_THREAD:
                    threads = [1]
                else:
                    threads = [2, 4, 8, min(16, self.profiler.system_info.physical_cores)]
                
                for num_threads in threads:
                    if num_threads > self.profiler.system_info.cpu_cores:
                        continue
                    
                    # 模拟计算负载
                    start_time = time.time()
                    self.monitor.start_monitoring()
                    
                    # 模拟矩阵运算
                    self._simulate_computation(size, num_threads)
                    
                    execution_time = time.time() - start_time
                    performance_stats = self.monitor.stop_monitoring()
                    
                    key = f"{strategy.value}_{num_threads}threads"
                    size_results[key] = {
                        'execution_time': execution_time,
                        'performance_stats': performance_stats,
                        'efficiency': 1.0 / (execution_time * num_threads),
                        'speedup': size_results.get('single_1threads', {}).get('execution_time', execution_time) / execution_time
                    }
            
            benchmark_results[f"size_{size}"] = size_results
        
        return benchmark_results
    
    def _simulate_computation(self, problem_size: int, num_threads: int):
        """模拟计算负载"""
        # 设置线程数
        os.environ["OMP_NUM_THREADS"] = str(num_threads)
        
        # 模拟有限元矩阵运算
        matrix_size = int(np.sqrt(problem_size))
        
        # 生成随机矩阵
        A = np.random.rand(matrix_size, matrix_size).astype(np.float64)
        B = np.random.rand(matrix_size, matrix_size).astype(np.float64)
        
        # 矩阵乘法（使用BLAS）
        C = np.dot(A, B)
        
        # 特征值计算（模拟模态分析）
        if matrix_size < 1000:
            eigenvals = np.linalg.eigvals(A + A.T)  # 确保对称
        
        # 线性方程组求解（模拟有限元求解）
        if matrix_size < 2000:
            x = np.linalg.solve(A + np.eye(matrix_size), np.ones(matrix_size))
        
        return C


# 便捷函数
def get_optimal_kratos_config(problem_size: int, 
                             performance_level: PerformanceLevel = PerformanceLevel.BALANCED) -> Dict[str, Any]:
    """获取最优Kratos配置"""
    optimizer = ParallelOptimizer()
    return optimizer.optimize_kratos_settings(problem_size, performance_level)


def apply_environment_optimization(env_settings: Dict[str, str]):
    """应用环境变量优化"""
    for key, value in env_settings.items():
        os.environ[key] = value
        logger.info(f"设置环境变量: {key}={value}")


# 测试函数
def test_parallel_optimization():
    """测试并行优化功能"""
    print("=== 并行优化测试 ===")
    
    optimizer = ParallelOptimizer()
    
    # 系统信息
    system_info = optimizer.profiler.system_info
    print(f"系统信息:")
    print(f"  CPU核心: {system_info.physical_cores} 物理核心, {system_info.cpu_cores} 逻辑核心")
    print(f"  内存: {system_info.memory_gb:.1f} GB")
    print(f"  GPU: {'是' if system_info.has_gpu else '否'}")
    
    # 测试不同问题规模的优化配置
    problem_sizes = [10000, 100000, 500000]
    
    for size in problem_sizes:
        print(f"\n问题规模: {size:,}")
        config_result = optimizer.optimize_kratos_settings(size, PerformanceLevel.BALANCED)
        
        config = config_result['parallel_config']
        print(f"  并行策略: {config.strategy.value}")
        print(f"  线程数: {config.num_threads}")
        print(f"  内存限制: {config.memory_limit_gb:.1f} GB")
        print(f"  GPU启用: {'是' if config.gpu_enabled else '否'}")


if __name__ == "__main__":
    test_parallel_optimization()