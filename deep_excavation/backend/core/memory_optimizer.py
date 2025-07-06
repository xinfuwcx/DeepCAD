"""
后端内存优化器
@author Deep Excavation Team
@date 2025-01-27
"""

import gc
import psutil
import numpy as np
from typing import Iterator, Any, Dict, Optional, List, Callable
from contextlib import contextmanager
from dataclasses import dataclass
from loguru import logger
import asyncio
from concurrent.futures import ProcessPoolExecutor
import threading
import time
from functools import wraps


@dataclass
class MemoryStats:
    """内存统计信息"""
    total_mb: float
    used_mb: float
    available_mb: float
    percent: float
    process_mb: float
    process_percent: float


class MemoryMonitor:
    """内存监控器"""
    
    def __init__(self, max_memory_mb: int = 4096, 
                 warning_threshold: float = 0.8):
        self.max_memory_mb = max_memory_mb
        self.warning_threshold = warning_threshold
        self.process = psutil.Process()
        self.monitoring = False
        self.monitor_thread: Optional[threading.Thread] = None
        self.callbacks: List[Callable[[MemoryStats], None]] = []
        
    def add_callback(self, callback: Callable[[MemoryStats], None]):
        """添加内存状态回调"""
        self.callbacks.append(callback)
        
    def get_memory_stats(self) -> MemoryStats:
        """获取当前内存统计"""
        # 系统内存
        system_memory = psutil.virtual_memory()
        
        # 进程内存
        process_memory = self.process.memory_info()
        
        return MemoryStats(
            total_mb=system_memory.total / 1024 / 1024,
            used_mb=system_memory.used / 1024 / 1024,
            available_mb=system_memory.available / 1024 / 1024,
            percent=system_memory.percent,
            process_mb=process_memory.rss / 1024 / 1024,
            process_percent=(process_memory.rss / system_memory.total) * 100
        )
    
    def start_monitoring(self, interval: float = 5.0):
        """开始内存监控"""
        if self.monitoring:
            return
            
        self.monitoring = True
        self.monitor_thread = threading.Thread(
            target=self._monitor_loop, 
            args=(interval,)
        )
        self.monitor_thread.daemon = True
        self.monitor_thread.start()
        logger.info(f"内存监控已启动，间隔: {interval}秒")
    
    def stop_monitoring(self):
        """停止内存监控"""
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join()
        logger.info("内存监控已停止")
    
    def _monitor_loop(self, interval: float):
        """监控循环"""
        while self.monitoring:
            try:
                stats = self.get_memory_stats()
                
                # 检查是否超过警告阈值
                threshold = self.max_memory_mb * self.warning_threshold
                if stats.process_mb > threshold:
                    logger.warning(
                        f"内存使用警告: {stats.process_mb:.1f}MB / "
                        f"{self.max_memory_mb}MB"
                    )
                
                # 调用回调函数
                for callback in self.callbacks:
                    try:
                        callback(stats)
                    except Exception as e:
                        logger.error(f"内存监控回调出错: {e}")
                
                time.sleep(interval)
                
            except Exception as e:
                logger.error(f"内存监控出错: {e}")
                time.sleep(interval)


class MemoryOptimizer:
    """内存优化器"""
    
    def __init__(self, max_memory_mb: int = 4096):
        self.max_memory_mb = max_memory_mb
        self.monitor = MemoryMonitor(max_memory_mb)
        self.monitor.add_callback(self._on_memory_stats)
        
    def _on_memory_stats(self, stats: MemoryStats):
        """内存统计回调"""
        if stats.process_mb > self.max_memory_mb * 0.9:
            logger.warning(
                f"内存使用过高，触发垃圾回收: {stats.process_mb:.1f}MB"
            )
            self.force_garbage_collection()
    
    @contextmanager
    def memory_limit(self, operation_name: str = "unknown"):
        """内存限制上下文管理器"""
        initial_stats = self.monitor.get_memory_stats()
        logger.debug(
            f"开始操作 '{operation_name}', "
            f"初始内存: {initial_stats.process_mb:.1f}MB"
        )
        
        try:
            yield
        finally:
            final_stats = self.monitor.get_memory_stats()
            memory_delta = final_stats.process_mb - initial_stats.process_mb
            
            logger.debug(
                f"完成操作 '{operation_name}', "
                f"内存变化: {memory_delta:+.1f}MB"
            )
            
            # 如果内存增长过多，触发垃圾回收
            if memory_delta > 100:  # 100MB
                logger.info(
                    f"操作 '{operation_name}' 内存增长过多，触发垃圾回收"
                )
                self.force_garbage_collection()
            
            # 如果超过限制，抛出异常
            if final_stats.process_mb > self.max_memory_mb:
                raise MemoryError(
                    f"内存使用超限: {final_stats.process_mb:.1f}MB > "
                    f"{self.max_memory_mb}MB"
                )
    
    def force_garbage_collection(self):
        """强制垃圾回收"""
        before_stats = self.monitor.get_memory_stats()
        
        # 执行垃圾回收
        collected = gc.collect()
        
        after_stats = self.monitor.get_memory_stats()
        freed_mb = before_stats.process_mb - after_stats.process_mb
        
        logger.info(
            f"垃圾回收完成: 释放 {freed_mb:.1f}MB, 回收对象 {collected} 个"
        )
    
    def optimize_numpy_arrays(self, arrays: List[np.ndarray]) -> List[np.ndarray]:
        """优化NumPy数组内存使用"""
        optimized_arrays = []
        
        for i, arr in enumerate(arrays):
            # 检查是否可以使用更小的数据类型
            if arr.dtype == np.float64:
                # 检查是否可以安全转换为float32
                if np.allclose(arr, arr.astype(np.float32)):
                    optimized_arr = arr.astype(np.float32)
                    saved_bytes = arr.nbytes - optimized_arr.nbytes
                    logger.debug(
                        f"数组 {i} 从 float64 优化为 float32，"
                        f"节省 {saved_bytes} 字节"
                    )
                    optimized_arrays.append(optimized_arr)
                else:
                    optimized_arrays.append(arr)
            elif arr.dtype == np.int64:
                # 检查是否可以使用更小的整数类型
                int32_info = np.iinfo(np.int32)
                if (arr.min() >= int32_info.min and 
                    arr.max() <= int32_info.max):
                    optimized_arr = arr.astype(np.int32)
                    saved_bytes = arr.nbytes - optimized_arr.nbytes
                    logger.debug(
                        f"数组 {i} 从 int64 优化为 int32，"
                        f"节省 {saved_bytes} 字节"
                    )
                    optimized_arrays.append(optimized_arr)
                else:
                    optimized_arrays.append(arr)
            else:
                optimized_arrays.append(arr)
        
        return optimized_arrays
    
    def process_large_dataset_streaming(
        self, 
        data_iterator: Iterator[Any], 
        chunk_processor: Callable[[Any], Any],
        chunk_size: int = 1000
    ) -> Iterator[Any]:
        """流式处理大数据集"""
        chunk = []
        
        for item in data_iterator:
            chunk.append(item)
            
            if len(chunk) >= chunk_size:
                # 处理当前块
                with self.memory_limit(f"processing_chunk_{len(chunk)}"):
                    result = chunk_processor(chunk)
                    yield result
                
                # 清理块数据
                chunk.clear()
                self.force_garbage_collection()
        
        # 处理剩余数据
        if chunk:
            with self.memory_limit(f"processing_final_chunk_{len(chunk)}"):
                result = chunk_processor(chunk)
                yield result
    
    async def process_large_dataset_parallel(
        self, 
        data_chunks: List[Any],
        chunk_processor: Callable[[Any], Any],
        max_workers: int = 4
    ) -> List[Any]:
        """并行处理大数据集"""
        results = []
        
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            # 提交所有任务
            futures = []
            for i, chunk in enumerate(data_chunks):
                future = executor.submit(chunk_processor, chunk)
                futures.append(future)
            
            # 收集结果
            for i, future in enumerate(futures):
                try:
                    with self.memory_limit(f"collecting_result_{i}"):
                        result = await asyncio.wrap_future(future)
                        results.append(result)
                except Exception as e:
                    logger.error(f"处理数据块 {i} 时出错: {e}")
                    results.append(None)
        
        return results
    
    def get_memory_usage_summary(self) -> Dict[str, Any]:
        """获取内存使用摘要"""
        stats = self.monitor.get_memory_stats()
        
        return {
            "system_memory": {
                "total_gb": round(stats.total_mb / 1024, 2),
                "used_gb": round(stats.used_mb / 1024, 2),
                "available_gb": round(stats.available_mb / 1024, 2),
                "usage_percent": round(stats.percent, 1)
            },
            "process_memory": {
                "used_mb": round(stats.process_mb, 1),
                "limit_mb": self.max_memory_mb,
                "usage_percent": round(
                    (stats.process_mb / self.max_memory_mb) * 100, 1
                )
            },
            "gc_stats": {
                "collections": gc.get_stats(),
                "objects": len(gc.get_objects())
            }
        }


def memory_efficient(max_memory_mb: int = 2048):
    """内存高效装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            optimizer = MemoryOptimizer(max_memory_mb)
            
            with optimizer.memory_limit(func.__name__):
                return func(*args, **kwargs)
        
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            optimizer = MemoryOptimizer(max_memory_mb)
            
            with optimizer.memory_limit(func.__name__):
                return await func(*args, **kwargs)
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else wrapper
    return decorator


class DataStreamProcessor:
    """数据流处理器"""
    
    def __init__(self, memory_optimizer: MemoryOptimizer):
        self.memory_optimizer = memory_optimizer
    
    def process_mesh_data_streaming(self, vertices: np.ndarray, 
                                  indices: np.ndarray,
                                  chunk_size: int = 10000) -> Iterator[Dict[str, np.ndarray]]:
        """流式处理网格数据"""
        vertex_count = len(vertices)
        
        for start_idx in range(0, vertex_count, chunk_size):
            end_idx = min(start_idx + chunk_size, vertex_count)
            
            with self.memory_optimizer.memory_limit(f"mesh_chunk_{start_idx}_{end_idx}"):
                # 提取顶点块
                vertex_chunk = vertices[start_idx:end_idx].copy()
                
                # 提取相关的索引
                relevant_indices = []
                for i in range(0, len(indices), 3):
                    triangle = indices[i:i+3]
                    if all(start_idx <= idx < end_idx for idx in triangle):
                        # 重新映射索引
                        relevant_indices.extend(triangle - start_idx)
                
                index_chunk = np.array(relevant_indices, dtype=indices.dtype)
                
                yield {
                    'vertices': vertex_chunk,
                    'indices': index_chunk,
                    'start_idx': start_idx,
                    'end_idx': end_idx
                }
                
                # 清理临时数据
                del vertex_chunk, index_chunk
                gc.collect()
    
    def process_analysis_results_streaming(self, result_data: Dict[str, np.ndarray],
                                         chunk_size: int = 5000) -> Iterator[Dict[str, Any]]:
        """流式处理分析结果"""
        # 获取数据长度
        data_length = len(next(iter(result_data.values())))
        
        for start_idx in range(0, data_length, chunk_size):
            end_idx = min(start_idx + chunk_size, data_length)
            
            with self.memory_optimizer.memory_limit(f"result_chunk_{start_idx}_{end_idx}"):
                chunk_data = {}
                
                for field_name, field_data in result_data.items():
                    chunk_data[field_name] = field_data[start_idx:end_idx].copy()
                
                # 计算统计信息
                stats = {}
                for field_name, field_data in chunk_data.items():
                    stats[field_name] = {
                        'min': float(np.min(field_data)),
                        'max': float(np.max(field_data)),
                        'mean': float(np.mean(field_data)),
                        'std': float(np.std(field_data))
                    }
                
                yield {
                    'data': chunk_data,
                    'stats': stats,
                    'start_idx': start_idx,
                    'end_idx': end_idx
                }
                
                # 清理临时数据
                del chunk_data
                gc.collect()


# 全局内存优化器实例
global_memory_optimizer = MemoryOptimizer()

# 启动内存监控
global_memory_optimizer.monitor.start_monitoring()

# 注册退出清理
import atexit
atexit.register(global_memory_optimizer.monitor.stop_monitoring) 