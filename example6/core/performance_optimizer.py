#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
性能优化器 - Performance Optimizer
桥墩冲刷模拟系统性能和用户体验优化

Features:
- 计算性能监控和优化
- 内存管理和缓存策略
- 并行计算调度
- 用户界面响应性优化
- 智能预处理和批处理
- 系统资源监控
"""

import os
import sys
import time
import psutil
import threading
import multiprocessing as mp
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from typing import Dict, Any, List, Tuple, Optional, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import json
import numpy as np
from datetime import datetime, timedelta
import warnings
import functools
import weakref
import gc

# 性能分析库
try:
    import cProfile
    import pstats
    PROFILING_AVAILABLE = True
except ImportError:
    PROFILING_AVAILABLE = False

# 内存分析库
try:
    import tracemalloc
    MEMORY_TRACING_AVAILABLE = True
except ImportError:
    MEMORY_TRACING_AVAILABLE = False

# 数值计算优化
try:
    import numba
    from numba import jit, njit, prange
    NUMBA_AVAILABLE = True
except ImportError:
    NUMBA_AVAILABLE = False

# GPU计算
try:
    import cupy as cp
    GPU_AVAILABLE = True
except ImportError:
    GPU_AVAILABLE = False

# 本地模块
from .empirical_solver import ScourParameters, ScourResult
from .advanced_solver import SolverResult, NumericalParameters


class OptimizationLevel(Enum):
    """优化级别"""
    CONSERVATIVE = "conservative"    # 保守模式，保证稳定性
    BALANCED = "balanced"           # 平衡模式，性能与稳定性兼顾
    AGGRESSIVE = "aggressive"       # 激进模式，最大化性能
    CUSTOM = "custom"               # 自定义模式


class ResourceType(Enum):
    """资源类型"""
    CPU = "cpu"
    MEMORY = "memory"
    GPU = "gpu"
    DISK = "disk"
    NETWORK = "network"


@dataclass
class PerformanceMetrics:
    """性能指标"""
    execution_time: float
    memory_peak: float
    memory_average: float
    cpu_usage: float
    gpu_usage: float = 0.0
    
    # 计算效率
    operations_per_second: float = 0.0
    cache_hit_ratio: float = 0.0
    
    # 并行性能
    parallel_efficiency: float = 0.0
    scaling_factor: float = 1.0
    
    # 用户体验
    response_time: float = 0.0
    ui_fps: float = 60.0


@dataclass
class OptimizationConfig:
    """优化配置"""
    level: OptimizationLevel = OptimizationLevel.BALANCED
    
    # 并行设置
    enable_multiprocessing: bool = True
    max_workers: int = 0  # 0 = auto-detect
    enable_gpu: bool = False
    
    # 缓存设置
    enable_caching: bool = True
    cache_size_mb: int = 256
    cache_ttl_seconds: int = 3600
    
    # 内存管理
    enable_memory_optimization: bool = True
    memory_limit_mb: int = 0  # 0 = no limit
    gc_frequency: int = 100  # 每N次操作触发垃圾回收
    
    # 数值优化
    enable_jit_compilation: bool = True
    enable_vectorization: bool = True
    precision_mode: str = "float64"  # float32, float64
    
    # UI优化
    enable_progressive_rendering: bool = True
    frame_rate_limit: int = 60
    lazy_loading: bool = True


class ResourceMonitor:
    """系统资源监控器"""
    
    def __init__(self, monitoring_interval: float = 1.0):
        self.monitoring_interval = monitoring_interval
        self.is_monitoring = False
        self.monitor_thread = None
        
        # 历史数据
        self.cpu_history = []
        self.memory_history = []
        self.gpu_history = []
        self.timestamps = []
        
        # 当前状态
        self.current_metrics = {
            'cpu_percent': 0.0,
            'memory_percent': 0.0,
            'memory_available_gb': 0.0,
            'gpu_percent': 0.0,
            'gpu_memory_gb': 0.0
        }
        
        # 系统信息
        self.system_info = self._get_system_info()
    
    def _get_system_info(self) -> Dict[str, Any]:
        """获取系统信息"""
        info = {
            'cpu_count': psutil.cpu_count(),
            'cpu_count_logical': psutil.cpu_count(logical=True),
            'memory_total_gb': psutil.virtual_memory().total / (1024**3),
            'platform': sys.platform,
            'python_version': sys.version
        }
        
        # GPU信息
        if GPU_AVAILABLE:
            try:
                gpu_count = cp.cuda.runtime.getDeviceCount()
                info['gpu_count'] = gpu_count
                if gpu_count > 0:
                    meminfo = cp.cuda.runtime.memGetInfo()
                    info['gpu_memory_total_gb'] = meminfo[1] / (1024**3)
            except:
                info['gpu_count'] = 0
        else:
            info['gpu_count'] = 0
        
        return info
    
    def start_monitoring(self):
        """开始监控"""
        if self.is_monitoring:
            return
        
        self.is_monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
    
    def stop_monitoring(self):
        """停止监控"""
        self.is_monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=2.0)
    
    def _monitor_loop(self):
        """监控循环"""
        while self.is_monitoring:
            try:
                # CPU使用率
                cpu_percent = psutil.cpu_percent(interval=None)
                
                # 内存使用率
                memory = psutil.virtual_memory()
                memory_percent = memory.percent
                memory_available_gb = memory.available / (1024**3)
                
                # GPU使用率 (如果可用)
                gpu_percent = 0.0
                gpu_memory_gb = 0.0
                
                if GPU_AVAILABLE:
                    try:
                        # CuPy方式获取GPU信息
                        meminfo = cp.cuda.runtime.memGetInfo()
                        gpu_memory_used = (meminfo[1] - meminfo[0]) / (1024**3)
                        gpu_memory_total = meminfo[1] / (1024**3)
                        gpu_memory_gb = gpu_memory_used
                        gpu_percent = (gpu_memory_used / gpu_memory_total) * 100
                    except:
                        pass
                
                # 更新当前指标
                self.current_metrics.update({
                    'cpu_percent': cpu_percent,
                    'memory_percent': memory_percent,
                    'memory_available_gb': memory_available_gb,
                    'gpu_percent': gpu_percent,
                    'gpu_memory_gb': gpu_memory_gb
                })
                
                # 记录历史数据
                current_time = time.time()
                self.timestamps.append(current_time)
                self.cpu_history.append(cpu_percent)
                self.memory_history.append(memory_percent)
                self.gpu_history.append(gpu_percent)
                
                # 限制历史数据长度
                max_history = 3600  # 1小时的数据
                if len(self.timestamps) > max_history:
                    self.timestamps = self.timestamps[-max_history:]
                    self.cpu_history = self.cpu_history[-max_history:]
                    self.memory_history = self.memory_history[-max_history:]
                    self.gpu_history = self.gpu_history[-max_history:]
                
                time.sleep(self.monitoring_interval)
                
            except Exception as e:
                print(f"资源监控错误: {e}")
                time.sleep(self.monitoring_interval)
    
    def get_resource_status(self) -> Dict[str, Any]:
        """获取资源状态"""
        return {
            'current': self.current_metrics.copy(),
            'system_info': self.system_info.copy(),
            'monitoring_active': self.is_monitoring
        }
    
    def get_resource_recommendations(self) -> List[str]:
        """获取资源使用建议"""
        recommendations = []
        
        cpu_percent = self.current_metrics['cpu_percent']
        memory_percent = self.current_metrics['memory_percent']
        memory_available_gb = self.current_metrics['memory_available_gb']
        
        if cpu_percent > 90:
            recommendations.append("CPU使用率过高，建议减少并行进程数或启用GPU加速")
        elif cpu_percent < 30:
            recommendations.append("CPU使用率较低，可以增加并行进程数以提高性能")
        
        if memory_percent > 90:
            recommendations.append("内存使用率过高，建议减少缓存大小或释放未使用的数据")
        elif memory_available_gb < 1.0:
            recommendations.append("可用内存不足1GB，建议关闭其他应用程序")
        
        if self.system_info['gpu_count'] > 0 and not GPU_AVAILABLE:
            recommendations.append("检测到GPU但未安装CuPy，建议安装GPU加速库")
        
        return recommendations


class SmartCache:
    """智能缓存系统"""
    
    def __init__(self, max_size_mb: int = 256, ttl_seconds: int = 3600):
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.ttl_seconds = ttl_seconds
        self.cache = {}
        self.access_times = {}
        self.creation_times = {}
        self.current_size = 0
        self._lock = threading.RLock()
        
        # 统计信息
        self.hits = 0
        self.misses = 0
        self.evictions = 0
    
    def _estimate_size(self, obj) -> int:
        """估算对象大小"""
        try:
            if isinstance(obj, np.ndarray):
                return obj.nbytes
            elif isinstance(obj, (list, tuple)):
                return sys.getsizeof(obj) + sum(sys.getsizeof(item) for item in obj)
            elif isinstance(obj, dict):
                return sys.getsizeof(obj) + sum(
                    sys.getsizeof(k) + sys.getsizeof(v) for k, v in obj.items())
            else:
                return sys.getsizeof(obj)
        except:
            return 1024  # 默认估算值
    
    def _cleanup_expired(self):
        """清理过期缓存"""
        current_time = time.time()
        expired_keys = []
        
        for key, creation_time in self.creation_times.items():
            if current_time - creation_time > self.ttl_seconds:
                expired_keys.append(key)
        
        for key in expired_keys:
            self._remove_key(key)
    
    def _remove_key(self, key):
        """移除缓存项"""
        if key in self.cache:
            obj = self.cache[key]
            obj_size = self._estimate_size(obj)
            self.current_size -= obj_size
            
            del self.cache[key]
            del self.access_times[key]
            del self.creation_times[key]
            self.evictions += 1
    
    def _evict_lru(self):
        """LRU淘汰策略"""
        if not self.access_times:
            return
        
        # 找到最久未访问的键
        lru_key = min(self.access_times.keys(), key=self.access_times.get)
        self._remove_key(lru_key)
    
    def get(self, key: str, default=None):
        """获取缓存值"""
        with self._lock:
            self._cleanup_expired()
            
            if key in self.cache:
                self.access_times[key] = time.time()
                self.hits += 1
                return self.cache[key]
            else:
                self.misses += 1
                return default
    
    def put(self, key: str, value):
        """存储缓存值"""
        with self._lock:
            obj_size = self._estimate_size(value)
            
            # 检查是否超出单个对象大小限制
            if obj_size > self.max_size_bytes:
                return False
            
            # 清理过期项
            self._cleanup_expired()
            
            # 如果键已存在，先移除
            if key in self.cache:
                self._remove_key(key)
            
            # 释放空间直到能容纳新对象
            while self.current_size + obj_size > self.max_size_bytes and self.cache:
                self._evict_lru()
            
            # 存储新对象
            current_time = time.time()
            self.cache[key] = value
            self.access_times[key] = current_time
            self.creation_times[key] = current_time
            self.current_size += obj_size
            
            return True
    
    def clear(self):
        """清空缓存"""
        with self._lock:
            self.cache.clear()
            self.access_times.clear()
            self.creation_times.clear()
            self.current_size = 0
    
    def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计"""
        with self._lock:
            total_requests = self.hits + self.misses
            hit_ratio = self.hits / total_requests if total_requests > 0 else 0.0
            
            return {
                'size_mb': self.current_size / (1024 * 1024),
                'max_size_mb': self.max_size_bytes / (1024 * 1024),
                'items_count': len(self.cache),
                'hits': self.hits,
                'misses': self.misses,
                'evictions': self.evictions,
                'hit_ratio': hit_ratio
            }


class ParallelExecutor:
    """并行执行器"""
    
    def __init__(self, config: OptimizationConfig):
        self.config = config
        
        # 确定工作进程数
        if config.max_workers <= 0:
            self.max_workers = min(mp.cpu_count(), 8)  # 限制最大进程数
        else:
            self.max_workers = config.max_workers
        
        # 执行器池
        self.thread_pool = None
        self.process_pool = None
        
        # 性能统计
        self.execution_stats = {
            'sequential_time': 0.0,
            'parallel_time': 0.0,
            'speedup_ratio': 1.0
        }
    
    def __enter__(self):
        if self.config.enable_multiprocessing:
            self.thread_pool = ThreadPoolExecutor(max_workers=self.max_workers)
            # 进程池用于CPU密集型任务
            self.process_pool = ProcessPoolExecutor(max_workers=self.max_workers)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.thread_pool:
            self.thread_pool.shutdown(wait=True)
        if self.process_pool:
            self.process_pool.shutdown(wait=True)
    
    def map_parallel(self, 
                    func: Callable,
                    iterable: List,
                    use_processes: bool = True,
                    chunk_size: Optional[int] = None) -> List:
        """并行映射执行"""
        
        if not self.config.enable_multiprocessing or len(iterable) < 2:
            # 串行执行
            start_time = time.time()
            result = [func(item) for item in iterable]
            self.execution_stats['sequential_time'] = time.time() - start_time
            return result
        
        # 并行执行
        start_time = time.time()
        
        if chunk_size is None:
            chunk_size = max(1, len(iterable) // (self.max_workers * 2))
        
        try:
            if use_processes and self.process_pool:
                # 使用进程池
                futures = []
                for i in range(0, len(iterable), chunk_size):
                    chunk = iterable[i:i + chunk_size]
                    future = self.process_pool.submit(self._process_chunk, func, chunk)
                    futures.append(future)
                
                result = []
                for future in as_completed(futures):
                    result.extend(future.result())
                    
            elif self.thread_pool:
                # 使用线程池
                futures = [self.thread_pool.submit(func, item) for item in iterable]
                result = [future.result() for future in as_completed(futures)]
            else:
                # 回退到串行
                result = [func(item) for item in iterable]
            
            parallel_time = time.time() - start_time
            self.execution_stats['parallel_time'] = parallel_time
            
            # 计算加速比
            if self.execution_stats['sequential_time'] > 0:
                self.execution_stats['speedup_ratio'] = (
                    self.execution_stats['sequential_time'] / parallel_time
                )
            
            return result
            
        except Exception as e:
            print(f"并行执行失败，回退到串行: {e}")
            return [func(item) for item in iterable]
    
    @staticmethod
    def _process_chunk(func: Callable, chunk: List) -> List:
        """处理数据块"""
        return [func(item) for item in chunk]
    
    def get_performance_stats(self) -> Dict[str, float]:
        """获取性能统计"""
        return self.execution_stats.copy()


class NumbaOptimizer:
    """Numba JIT优化器"""
    
    def __init__(self, enabled: bool = True):
        self.enabled = enabled and NUMBA_AVAILABLE
        self.compiled_functions = {}
    
    def jit_compile(self, func: Callable, **jit_kwargs) -> Callable:
        """JIT编译函数"""
        if not self.enabled:
            return func
        
        func_id = f"{func.__module__}.{func.__name__}"
        
        if func_id not in self.compiled_functions:
            try:
                # 默认JIT设置
                default_kwargs = {
                    'nopython': True,
                    'cache': True,
                    'fastmath': True
                }
                default_kwargs.update(jit_kwargs)
                
                compiled_func = numba.jit(**default_kwargs)(func)
                self.compiled_functions[func_id] = compiled_func
                return compiled_func
            except Exception as e:
                print(f"JIT编译失败 {func_id}: {e}")
                return func
        
        return self.compiled_functions[func_id]
    
    def vectorize(self, func: Callable, signature: str = None) -> Callable:
        """向量化函数"""
        if not self.enabled:
            return func
        
        try:
            if signature:
                return numba.vectorize([signature], target='cpu')(func)
            else:
                return numba.vectorize(target='cpu')(func)
        except Exception as e:
            print(f"向量化失败: {e}")
            return func


class PerformanceOptimizer:
    """性能优化器主类"""
    
    def __init__(self, config: OptimizationConfig = None):
        self.config = config or OptimizationConfig()
        
        # 组件初始化
        self.resource_monitor = ResourceMonitor()
        self.cache = SmartCache(
            max_size_mb=self.config.cache_size_mb,
            ttl_seconds=self.config.cache_ttl_seconds
        ) if self.config.enable_caching else None
        
        self.numba_optimizer = NumbaOptimizer(self.config.enable_jit_compilation)
        
        # 性能分析器
        self.profiler = None
        self.profile_data = {}
        
        # 垃圾回收计数器
        self.operation_count = 0
        
        # 启动监控
        self.resource_monitor.start_monitoring()
    
    def __del__(self):
        """析构函数"""
        if hasattr(self, 'resource_monitor'):
            self.resource_monitor.stop_monitoring()
    
    def start_profiling(self):
        """开始性能分析"""
        if not PROFILING_AVAILABLE:
            return
        
        self.profiler = cProfile.Profile()
        self.profiler.enable()
        
        if MEMORY_TRACING_AVAILABLE:
            tracemalloc.start()
    
    def stop_profiling(self) -> Dict[str, Any]:
        """停止性能分析并返回结果"""
        if not self.profiler:
            return {}
        
        self.profiler.disable()
        
        # 分析CPU性能
        stats_stream = io.StringIO()
        stats = pstats.Stats(self.profiler, stream=stats_stream)
        stats.sort_stats('cumulative')
        stats.print_stats(20)  # 显示前20个函数
        
        profile_result = {
            'cpu_profile': stats_stream.getvalue(),
            'function_stats': {}
        }
        
        # 提取关键统计信息
        for func_name, (cc, nc, tt, ct, callers) in stats.stats.items():
            profile_result['function_stats'][str(func_name)] = {
                'call_count': cc,
                'total_time': tt,
                'cumulative_time': ct
            }
        
        # 内存分析
        if MEMORY_TRACING_AVAILABLE:
            current, peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
            
            profile_result['memory_stats'] = {
                'current_mb': current / (1024 * 1024),
                'peak_mb': peak / (1024 * 1024)
            }
        
        self.profile_data = profile_result
        return profile_result
    
    def cached_computation(self, 
                          cache_key: str,
                          computation_func: Callable,
                          *args, **kwargs):
        """缓存计算结果"""
        if not self.cache:
            return computation_func(*args, **kwargs)
        
        # 尝试从缓存获取
        result = self.cache.get(cache_key)
        if result is not None:
            return result
        
        # 计算并缓存
        result = computation_func(*args, **kwargs)
        self.cache.put(cache_key, result)
        
        return result
    
    def optimized_parallel_map(self,
                              func: Callable,
                              iterable: List,
                              enable_jit: bool = True,
                              use_gpu: bool = False) -> List:
        """优化的并行映射"""
        
        # JIT编译优化
        if enable_jit and self.config.enable_jit_compilation:
            func = self.numba_optimizer.jit_compile(func)
        
        # GPU加速 (如果可用且启用)
        if use_gpu and self.config.enable_gpu and GPU_AVAILABLE:
            try:
                return self._gpu_parallel_map(func, iterable)
            except Exception as e:
                print(f"GPU计算失败，回退到CPU: {e}")
        
        # CPU并行计算
        with ParallelExecutor(self.config) as executor:
            result = executor.map_parallel(func, iterable)
        
        # 触发垃圾回收
        self._maybe_gc()
        
        return result
    
    def _gpu_parallel_map(self, func: Callable, iterable: List) -> List:
        """GPU并行映射 (CuPy实现)"""
        if not GPU_AVAILABLE:
            raise RuntimeError("GPU不可用")
        
        # 将数据转移到GPU
        gpu_data = cp.array(iterable)
        
        # GPU计算 (需要适配具体的计算函数)
        # 这里是示例，实际需要根据具体函数调整
        gpu_result = cp.apply_along_axis(func, 0, gpu_data)
        
        # 将结果转回CPU
        return gpu_result.get().tolist()
    
    def _maybe_gc(self):
        """条件性垃圾回收"""
        if not self.config.enable_memory_optimization:
            return
        
        self.operation_count += 1
        
        if self.operation_count >= self.config.gc_frequency:
            gc.collect()
            self.operation_count = 0
    
    def optimize_array_operations(self, 
                                 arrays: List[np.ndarray],
                                 operation: str = "auto") -> List[np.ndarray]:
        """优化数组操作"""
        
        if not arrays:
            return arrays
        
        # 精度优化
        if self.config.precision_mode == "float32":
            arrays = [arr.astype(np.float32) if arr.dtype == np.float64 else arr 
                     for arr in arrays]
        
        # 内存布局优化
        optimized_arrays = []
        for arr in arrays:
            if not arr.flags['C_CONTIGUOUS']:
                arr = np.ascontiguousarray(arr)
            optimized_arrays.append(arr)
        
        return optimized_arrays
    
    def adaptive_optimization(self, 
                            workload_size: int,
                            complexity: str = "medium") -> OptimizationConfig:
        """自适应优化配置"""
        
        # 获取系统资源状态
        resource_status = self.resource_monitor.get_resource_status()
        cpu_count = resource_status['system_info']['cpu_count']
        memory_gb = resource_status['system_info']['memory_total_gb']
        
        # 基于工作负载大小和系统资源调整配置
        adaptive_config = OptimizationConfig()
        
        # 并行度调整
        if workload_size < 10:
            adaptive_config.enable_multiprocessing = False
        elif workload_size < 100:
            adaptive_config.max_workers = min(2, cpu_count)
        else:
            adaptive_config.max_workers = cpu_count
        
        # 缓存大小调整
        if memory_gb > 16:
            adaptive_config.cache_size_mb = 512
        elif memory_gb > 8:
            adaptive_config.cache_size_mb = 256
        else:
            adaptive_config.cache_size_mb = 128
        
        # 复杂度相关优化
        if complexity == "high":
            adaptive_config.enable_jit_compilation = True
            adaptive_config.precision_mode = "float64"
            adaptive_config.gc_frequency = 50
        elif complexity == "low":
            adaptive_config.precision_mode = "float32"
            adaptive_config.gc_frequency = 200
        
        # GPU使用决策
        gpu_count = resource_status['system_info']['gpu_count']
        adaptive_config.enable_gpu = (gpu_count > 0 and workload_size > 1000)
        
        return adaptive_config
    
    def get_performance_report(self) -> Dict[str, Any]:
        """获取性能报告"""
        
        report = {
            'timestamp': datetime.now().isoformat(),
            'config': {
                'optimization_level': self.config.level.value,
                'multiprocessing_enabled': self.config.enable_multiprocessing,
                'max_workers': self.config.max_workers,
                'caching_enabled': self.config.enable_caching,
                'jit_enabled': self.config.enable_jit_compilation,
                'gpu_enabled': self.config.enable_gpu
            },
            'resource_status': self.resource_monitor.get_resource_status(),
            'cache_stats': self.cache.get_stats() if self.cache else {},
            'profile_data': self.profile_data,
            'recommendations': self.resource_monitor.get_resource_recommendations()
        }
        
        return report
    
    def save_performance_report(self, output_path: Path):
        """保存性能报告"""
        report = self.get_performance_report()
        
        try:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(report, f, indent=2, ensure_ascii=False, default=str)
        except Exception as e:
            print(f"保存性能报告失败: {e}")


# 装饰器工具
def performance_monitor(cache_key_func: Optional[Callable] = None):
    """性能监控装饰器"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            start_memory = psutil.Process().memory_info().rss
            
            try:
                result = func(*args, **kwargs)
                
                end_time = time.time()
                end_memory = psutil.Process().memory_info().rss
                
                # 记录性能指标
                execution_time = end_time - start_time
                memory_delta = end_memory - start_memory
                
                # 可以在这里添加日志记录或其他处理
                if execution_time > 1.0:  # 超过1秒的函数记录警告
                    print(f"函数 {func.__name__} 执行时间: {execution_time:.2f}s, "
                          f"内存变化: {memory_delta / 1024 / 1024:.1f}MB")
                
                return result
                
            except Exception as e:
                print(f"函数 {func.__name__} 执行失败: {e}")
                raise
        
        return wrapper
    return decorator


def cached_function(cache_ttl: int = 3600):
    """函数结果缓存装饰器"""
    def decorator(func):
        cache = {}
        cache_times = {}
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # 创建缓存键
            cache_key = str(hash((args, tuple(sorted(kwargs.items())))))
            current_time = time.time()
            
            # 检查缓存
            if (cache_key in cache and 
                current_time - cache_times[cache_key] < cache_ttl):
                return cache[cache_key]
            
            # 计算结果并缓存
            result = func(*args, **kwargs)
            cache[cache_key] = result
            cache_times[cache_key] = current_time
            
            # 清理过期缓存
            expired_keys = [k for k, t in cache_times.items() 
                          if current_time - t > cache_ttl]
            for k in expired_keys:
                cache.pop(k, None)
                cache_times.pop(k, None)
            
            return result
        
        return wrapper
    return decorator


# 便利函数
def optimize_solver_performance(solver_function: Callable,
                               optimization_level: OptimizationLevel = OptimizationLevel.BALANCED) -> Callable:
    """优化求解器性能"""
    
    config = OptimizationConfig(level=optimization_level)
    optimizer = PerformanceOptimizer(config)
    
    @functools.wraps(solver_function)
    def optimized_solver(*args, **kwargs):
        # 生成缓存键
        cache_key = f"solver_{hash(str(args) + str(kwargs))}"
        
        def computation():
            return solver_function(*args, **kwargs)
        
        # 使用缓存计算
        if optimizer.cache:
            return optimizer.cached_computation(cache_key, computation)
        else:
            return computation()
    
    return optimized_solver


def benchmark_solver_performance(solver_functions: Dict[str, Callable],
                                test_cases: List,
                                output_dir: Path = Path("benchmark_results")) -> Dict[str, PerformanceMetrics]:
    """基准测试求解器性能"""
    
    output_dir.mkdir(exist_ok=True)
    results = {}
    
    for solver_name, solver_func in solver_functions.items():
        print(f"基准测试: {solver_name}")
        
        # 预热
        for _ in range(3):
            solver_func(test_cases[0])
        
        # 性能测试
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss
        
        for case in test_cases:
            solver_func(case)
        
        end_time = time.time()
        end_memory = psutil.Process().memory_info().rss
        
        execution_time = end_time - start_time
        memory_usage = (end_memory - start_memory) / 1024 / 1024  # MB
        
        # 创建性能指标
        metrics = PerformanceMetrics(
            execution_time=execution_time,
            memory_peak=memory_usage,
            memory_average=memory_usage,
            cpu_usage=psutil.cpu_percent(),
            operations_per_second=len(test_cases) / execution_time
        )
        
        results[solver_name] = metrics
        
        print(f"  执行时间: {execution_time:.2f}s")
        print(f"  内存使用: {memory_usage:.1f}MB") 
        print(f"  处理速度: {metrics.operations_per_second:.1f} cases/s")
    
    # 保存基准测试结果
    benchmark_data = {
        'timestamp': datetime.now().isoformat(),
        'test_cases_count': len(test_cases),
        'results': {
            name: {
                'execution_time': metrics.execution_time,
                'memory_usage_mb': metrics.memory_peak,
                'operations_per_second': metrics.operations_per_second
            }
            for name, metrics in results.items()
        }
    }
    
    with open(output_dir / "benchmark_results.json", 'w') as f:
        json.dump(benchmark_data, f, indent=2, default=str)
    
    return results


if __name__ == "__main__":
    # 测试性能优化器
    print("=== 性能优化器测试 ===")
    
    # 创建优化器
    config = OptimizationConfig(level=OptimizationLevel.AGGRESSIVE)
    optimizer = PerformanceOptimizer(config)
    
    print("系统信息:")
    resource_status = optimizer.resource_monitor.get_resource_status()
    system_info = resource_status['system_info']
    
    print(f"  CPU核心数: {system_info['cpu_count']}")
    print(f"  内存总量: {system_info['memory_total_gb']:.1f} GB")
    print(f"  GPU数量: {system_info['gpu_count']}")
    
    # 测试缓存系统
    print(f"\n缓存系统测试:")
    cache_stats = optimizer.cache.get_stats()
    print(f"  缓存大小: {cache_stats['size_mb']:.1f} MB")
    print(f"  命中率: {cache_stats['hit_ratio']:.2%}")
    
    # 测试并行计算
    print(f"\n并行计算测试:")
    
    def test_function(x):
        time.sleep(0.01)  # 模拟计算
        return x ** 2
    
    test_data = list(range(20))
    
    # 串行执行
    start_time = time.time()
    serial_result = [test_function(x) for x in test_data]
    serial_time = time.time() - start_time
    
    # 并行执行
    parallel_result = optimizer.optimized_parallel_map(test_function, test_data)
    
    print(f"  串行执行时间: {serial_time:.2f}s")
    print(f"  结果一致性: {serial_result == parallel_result}")
    
    # 生成性能报告
    print(f"\n生成性能报告...")
    report_path = Path("performance_report.json")
    optimizer.save_performance_report(report_path)
    print(f"  报告已保存到: {report_path}")
    
    # 资源使用建议
    recommendations = optimizer.resource_monitor.get_resource_recommendations()
    if recommendations:
        print(f"\n资源使用建议:")
        for rec in recommendations:
            print(f"  - {rec}")
    
    print("\n性能优化器测试完成!")