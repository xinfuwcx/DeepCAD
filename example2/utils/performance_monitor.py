#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
性能监控工具
监控内存使用、处理时间和系统资源
"""

import time
import psutil
import threading
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from contextlib import contextmanager


@dataclass
class PerformanceMetrics:
    """性能指标数据类"""
    start_time: float = field(default_factory=time.time)
    end_time: Optional[float] = None
    duration: Optional[float] = None
    
    # 内存指标
    memory_start: float = 0.0
    memory_peak: float = 0.0
    memory_end: float = 0.0
    
    # CPU指标
    cpu_percent: float = 0.0
    
    # 自定义指标
    custom_metrics: Dict[str, Any] = field(default_factory=dict)
    
    def finish(self):
        """完成性能测量"""
        self.end_time = time.time()
        self.duration = self.end_time - self.start_time
        self.memory_end = self._get_memory_usage()
    
    def _get_memory_usage(self) -> float:
        """获取当前内存使用量（MB）"""
        process = psutil.Process()
        return process.memory_info().rss / 1024 / 1024


class PerformanceMonitor:
    """性能监控器"""
    
    def __init__(self, name: str = "Unknown", auto_start: bool = True):
        self.name = name
        self.metrics = PerformanceMetrics()
        self.is_monitoring = False
        self.monitor_thread = None
        self.callbacks = []
        
        if auto_start:
            self.start()
    
    def start(self):
        """开始监控"""
        if self.is_monitoring:
            return
        
        self.metrics = PerformanceMetrics()
        self.metrics.memory_start = self.metrics._get_memory_usage()
        self.metrics.memory_peak = self.metrics.memory_start
        
        self.is_monitoring = True
        
        # 启动监控线程
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        
        print(f"🔍 开始性能监控: {self.name}")
    
    def stop(self) -> PerformanceMetrics:
        """停止监控并返回结果"""
        if not self.is_monitoring:
            return self.metrics
        
        self.is_monitoring = False
        self.metrics.finish()
        
        # 等待监控线程结束
        if self.monitor_thread and self.monitor_thread.is_alive():
            self.monitor_thread.join(timeout=1.0)
        
        # 调用回调函数
        for callback in self.callbacks:
            try:
                callback(self.metrics)
            except Exception as e:
                print(f"性能监控回调错误: {e}")
        
        self._print_summary()
        return self.metrics
    
    def _monitor_loop(self):
        """监控循环"""
        while self.is_monitoring:
            try:
                # 更新内存峰值
                current_memory = self.metrics._get_memory_usage()
                self.metrics.memory_peak = max(self.metrics.memory_peak, current_memory)
                
                # 更新CPU使用率
                self.metrics.cpu_percent = psutil.cpu_percent(interval=None)
                
                time.sleep(0.1)  # 100ms间隔
                
            except Exception as e:
                print(f"性能监控循环错误: {e}")
                break
    
    def add_custom_metric(self, key: str, value: Any):
        """添加自定义指标"""
        self.metrics.custom_metrics[key] = value
    
    def add_callback(self, callback: Callable[[PerformanceMetrics], None]):
        """添加性能监控完成回调"""
        self.callbacks.append(callback)
    
    def _print_summary(self):
        """打印性能总结"""
        print(f"\n📊 性能监控结果: {self.name}")
        print(f"⏱️  执行时间: {self.metrics.duration:.2f}秒")
        print(f"💾 内存使用: 开始{self.metrics.memory_start:.1f}MB, "
              f"峰值{self.metrics.memory_peak:.1f}MB, "
              f"结束{self.metrics.memory_end:.1f}MB")
        print(f"🖥️  平均CPU: {self.metrics.cpu_percent:.1f}%")
        
        if self.metrics.custom_metrics:
            print("📈 自定义指标:")
            for key, value in self.metrics.custom_metrics.items():
                print(f"   {key}: {value}")
        print()


@contextmanager
def performance_monitor(name: str = "Operation", 
                       print_summary: bool = True,
                       callback: Optional[Callable[[PerformanceMetrics], None]] = None):
    """性能监控上下文管理器"""
    monitor = PerformanceMonitor(name, auto_start=False)
    
    if callback:
        monitor.add_callback(callback)
    
    try:
        monitor.start()
        yield monitor
    finally:
        metrics = monitor.stop()
        if not print_summary:
            # 如果不打印总结，至少显示基本信息
            print(f"✅ {name} 完成: {metrics.duration:.2f}秒, "
                  f"内存峰值: {metrics.memory_peak:.1f}MB")


class FileProcessingMonitor(PerformanceMonitor):
    """文件处理专用监控器"""
    
    def __init__(self, file_path: str, file_size: Optional[int] = None):
        self.file_path = file_path
        self.file_size = file_size or self._get_file_size()
        super().__init__(f"文件处理: {Path(file_path).name}")
    
    def _get_file_size(self) -> int:
        """获取文件大小"""
        try:
            from pathlib import Path
            return Path(self.file_path).stat().st_size
        except Exception:
            return 0
    
    def update_progress(self, processed_bytes: int):
        """更新处理进度"""
        if self.file_size > 0:
            progress = (processed_bytes / self.file_size) * 100
            self.add_custom_metric("progress_percent", progress)
            self.add_custom_metric("processed_bytes", processed_bytes)
    
    def _print_summary(self):
        """打印文件处理总结"""
        super()._print_summary()
        
        if self.file_size > 0:
            throughput = self.file_size / (1024 * 1024) / self.metrics.duration  # MB/s
            print(f"📁 文件大小: {self.file_size / (1024 * 1024):.1f}MB")
            print(f"🚀 处理速度: {throughput:.1f}MB/s")


def benchmark_function(func: Callable, *args, **kwargs) -> tuple:
    """
    对函数进行性能基准测试
    
    Returns:
        (函数返回值, 性能指标)
    """
    with performance_monitor(f"函数: {func.__name__}") as monitor:
        result = func(*args, **kwargs)
        
        # 添加函数相关指标
        monitor.add_custom_metric("function_name", func.__name__)
        monitor.add_custom_metric("args_count", len(args))
        monitor.add_custom_metric("kwargs_count", len(kwargs))
    
    return result, monitor.metrics


def compare_performance(functions: Dict[str, Callable], *args, **kwargs) -> Dict[str, PerformanceMetrics]:
    """
    比较多个函数的性能
    
    Args:
        functions: {名称: 函数} 字典
        *args, **kwargs: 传递给函数的参数
    
    Returns:
        {名称: 性能指标} 字典
    """
    results = {}
    
    print(f"🏁 开始性能比较测试，共{len(functions)}个函数")
    
    for name, func in functions.items():
        print(f"\n测试: {name}")
        try:
            _, metrics = benchmark_function(func, *args, **kwargs)
            results[name] = metrics
        except Exception as e:
            print(f"❌ {name} 测试失败: {e}")
            continue
    
    # 打印比较结果
    print("\n" + "="*60)
    print("性能比较结果:")
    print("="*60)
    
    # 按执行时间排序
    sorted_results = sorted(results.items(), key=lambda x: x[1].duration)
    
    for i, (name, metrics) in enumerate(sorted_results):
        rank = "🥇" if i == 0 else "🥈" if i == 1 else "🥉" if i == 2 else f"{i+1}."
        print(f"{rank} {name:20} {metrics.duration:8.2f}s  {metrics.memory_peak:8.1f}MB")
    
    return results


# 装饰器：自动性能监控
def monitor_performance(name: Optional[str] = None, print_summary: bool = True):
    """性能监控装饰器"""
    def decorator(func: Callable):
        def wrapper(*args, **kwargs):
            monitor_name = name or f"函数: {func.__name__}"
            with performance_monitor(monitor_name, print_summary):
                return func(*args, **kwargs)
        return wrapper
    return decorator


# 测试和示例
if __name__ == "__main__":
    import numpy as np
    from pathlib import Path
    
    print("🧪 性能监控工具测试")
    
    # 测试1: 基本性能监控
    with performance_monitor("矩阵计算测试") as monitor:
        # 模拟一些计算
        data = np.random.random((1000, 1000))
        result = np.dot(data, data.T)
        
        monitor.add_custom_metric("matrix_size", "1000x1000")
        monitor.add_custom_metric("result_shape", result.shape)
    
    # 测试2: 函数基准测试
    @monitor_performance("装饰器测试")
    def test_function():
        time.sleep(0.5)
        return "测试完成"
    
    result = test_function()
    print(f"函数返回: {result}")
    
    # 测试3: 性能比较
    def method_a():
        return sum(range(100000))
    
    def method_b():
        return sum(i for i in range(100000))
    
    def method_c():
        return np.sum(np.arange(100000))
    
    compare_performance({
        "传统循环": method_a,
        "生成器": method_b,
        "NumPy": method_c
    })
    
    print("✅ 性能监控工具测试完成")
