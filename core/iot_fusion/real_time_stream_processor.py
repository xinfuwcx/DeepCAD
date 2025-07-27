#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD IoT实时数据流处理器 - 核心算法实现
3号计算专家 - Week2-3核心算法实现

实时数据流处理核心算法：
- 滑动窗口数据聚合
- 在线异常检测算法
- 自适应流量控制
- 分布式流处理架构
- GPU加速数据处理

技术指标：
- 处理能力：10,000点/秒
- 延迟：<100ms
- 吞吐量：1000+传感器并发
- 异常检测精度：>99%
"""

import numpy as np
import asyncio
import time
import logging
from typing import Dict, List, Optional, Union, Tuple, Callable, Any
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
import json
import pickle
from collections import deque, defaultdict
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import queue
import heapq
import statistics

# 数据处理库
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    print("Warning: Pandas不可用，使用基础数据结构")
    PANDAS_AVAILABLE = False

# 机器学习库
try:
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    from sklearn.decomposition import PCA
    SKLEARN_AVAILABLE = True
except ImportError:
    print("Warning: Scikit-learn不可用，使用基础异常检测")
    SKLEARN_AVAILABLE = False

# GPU加速
try:
    import cupy as cp
    CUPY_AVAILABLE = True
    print("CuPy可用，启用GPU加速")
except ImportError:
    print("CuPy不可用，使用CPU处理")
    CUPY_AVAILABLE = False

@dataclass
class StreamData:
    """流数据点"""
    sensor_id: str
    timestamp: float
    value: float
    metadata: Dict = field(default_factory=dict)
    processed: bool = False

@dataclass
class ProcessingResult:
    """处理结果"""
    original_data: StreamData
    processed_value: float
    anomaly_score: float
    is_anomaly: bool
    processing_time: float
    stage: str

@dataclass
class WindowState:
    """滑动窗口状态"""
    window_size: int
    data_buffer: deque = field(default_factory=deque)
    statistics: Dict = field(default_factory=dict)
    last_update: float = 0.0

class SlidingWindowAggregator:
    """滑动窗口数据聚合器"""
    
    def __init__(self, window_size: int = 1000, stride: int = 100):
        """
        初始化滑动窗口聚合器
        
        Args:
            window_size: 窗口大小（数据点数）
            stride: 滑动步长
        """
        self.window_size = window_size
        self.stride = stride
        self.windows: Dict[str, WindowState] = {}
        self.logger = logging.getLogger(__name__)
        
        # 聚合函数
        self.aggregation_functions = {
            'mean': np.mean,
            'std': np.std,
            'min': np.min,
            'max': np.max,
            'median': np.median,
            'percentile_95': lambda x: np.percentile(x, 95),
            'rms': lambda x: np.sqrt(np.mean(np.square(x)))
        }
    
    def add_data_point(self, data: StreamData) -> Optional[Dict]:
        """
        添加数据点到滑动窗口
        
        Args:
            data: 流数据点
            
        Returns:
            聚合统计结果（如果窗口已满）
        """
        sensor_id = data.sensor_id
        
        # 初始化传感器窗口
        if sensor_id not in self.windows:
            self.windows[sensor_id] = WindowState(
                window_size=self.window_size,
                data_buffer=deque(maxlen=self.window_size)
            )
        
        window = self.windows[sensor_id]
        
        # 添加数据点
        window.data_buffer.append(data.value)
        window.last_update = data.timestamp
        
        # 检查是否需要计算聚合统计
        if len(window.data_buffer) >= self.window_size:
            if len(window.data_buffer) % self.stride == 0:
                return self._compute_window_statistics(sensor_id)
        
        return None
    
    def _compute_window_statistics(self, sensor_id: str) -> Dict:
        """计算窗口统计信息"""
        window = self.windows[sensor_id]
        data_array = np.array(list(window.data_buffer))
        
        statistics = {}
        
        # 计算基础统计量
        for stat_name, func in self.aggregation_functions.items():
            try:
                statistics[stat_name] = float(func(data_array))
            except Exception as e:
                self.logger.warning(f"计算{stat_name}失败: {e}")
                statistics[stat_name] = 0.0
        
        # 趋势分析
        if len(data_array) >= 10:
            statistics['trend'] = self._compute_trend(data_array)
            statistics['volatility'] = self._compute_volatility(data_array)
        
        # 更新窗口统计
        window.statistics = statistics
        
        return {
            'sensor_id': sensor_id,
            'timestamp': window.last_update,
            'window_size': len(data_array),
            'statistics': statistics
        }
    
    def _compute_trend(self, data: np.ndarray) -> float:
        """计算数据趋势（线性回归斜率）"""
        n = len(data)
        x = np.arange(n)
        
        # 线性回归 y = ax + b
        a = (n * np.sum(x * data) - np.sum(x) * np.sum(data)) / (n * np.sum(x**2) - np.sum(x)**2)
        
        return float(a)
    
    def _compute_volatility(self, data: np.ndarray) -> float:
        """计算波动性（滚动标准差）"""
        if len(data) < 5:
            return 0.0
        
        # 计算滚动标准差
        window_size = min(10, len(data) // 2)
        rolling_stds = []
        
        for i in range(window_size, len(data)):
            window_data = data[i-window_size:i]
            rolling_stds.append(np.std(window_data))
        
        return float(np.mean(rolling_stds)) if rolling_stds else 0.0
    
    def get_window_state(self, sensor_id: str) -> Optional[WindowState]:
        """获取传感器窗口状态"""
        return self.windows.get(sensor_id)

class OnlineAnomalyDetector:
    """在线异常检测器"""
    
    def __init__(self, contamination: float = 0.1, window_size: int = 1000):
        """
        初始化在线异常检测器
        
        Args:
            contamination: 异常比例
            window_size: 训练窗口大小
        """
        self.contamination = contamination
        self.window_size = window_size
        self.logger = logging.getLogger(__name__)
        
        # 检测器字典（每个传感器一个）
        self.detectors: Dict[str, Any] = {}
        self.scalers: Dict[str, Any] = {}
        self.training_data: Dict[str, deque] = {}
        
        # 阈值字典
        self.thresholds: Dict[str, Dict[str, float]] = {}
        
        # 统计信息
        self.detection_stats = defaultdict(lambda: {
            'total_points': 0,
            'anomalies_detected': 0,
            'false_positives': 0,
            'false_negatives': 0
        })
    
    def detect_anomaly(self, data: StreamData, window_stats: Optional[Dict] = None) -> Tuple[bool, float]:
        """
        检测数据点是否为异常
        
        Args:
            data: 流数据点
            window_stats: 滑动窗口统计信息
            
        Returns:
            (是否异常, 异常分数)
        """
        sensor_id = data.sensor_id
        
        # 初始化传感器检测器
        if sensor_id not in self.detectors:
            self._initialize_detector(sensor_id)
        
        # 更新训练数据
        self._update_training_data(sensor_id, data.value)
        
        # 多重异常检测策略
        anomaly_scores = []
        
        # 1. 统计异常检测
        stat_score = self._statistical_anomaly_detection(sensor_id, data.value)
        anomaly_scores.append(stat_score)
        
        # 2. 机器学习异常检测
        if SKLEARN_AVAILABLE and self._has_sufficient_data(sensor_id):
            ml_score = self._ml_anomaly_detection(sensor_id, data.value)
            anomaly_scores.append(ml_score)
        
        # 3. 基于窗口统计的异常检测
        if window_stats:
            window_score = self._window_based_anomaly_detection(data.value, window_stats)
            anomaly_scores.append(window_score)
        
        # 集成异常分数
        final_score = np.mean(anomaly_scores) if anomaly_scores else 0.0
        
        # 判断是否异常
        is_anomaly = self._is_anomaly(sensor_id, final_score)
        
        # 更新统计
        self.detection_stats[sensor_id]['total_points'] += 1
        if is_anomaly:
            self.detection_stats[sensor_id]['anomalies_detected'] += 1
        
        return is_anomaly, float(final_score)
    
    def _initialize_detector(self, sensor_id: str):
        """初始化传感器检测器"""
        self.training_data[sensor_id] = deque(maxlen=self.window_size)
        
        if SKLEARN_AVAILABLE:
            self.detectors[sensor_id] = IsolationForest(
                contamination=self.contamination,
                random_state=42,
                n_estimators=50
            )
            self.scalers[sensor_id] = StandardScaler()
        
        # 初始化统计阈值
        self.thresholds[sensor_id] = {
            'z_score': 3.0,    # Z-score阈值
            'iqr_factor': 1.5,  # IQR因子
            'percentile': 0.95  # 百分位阈值
        }
    
    def _update_training_data(self, sensor_id: str, value: float):
        """更新训练数据"""
        self.training_data[sensor_id].append(value)
        
        # 定期重训练模型
        if (len(self.training_data[sensor_id]) >= self.window_size and 
            len(self.training_data[sensor_id]) % 500 == 0):
            self._retrain_detector(sensor_id)
    
    def _retrain_detector(self, sensor_id: str):
        """重训练检测器"""
        if not SKLEARN_AVAILABLE or sensor_id not in self.detectors:
            return
        
        try:
            data = np.array(list(self.training_data[sensor_id])).reshape(-1, 1)
            
            # 标准化数据
            self.scalers[sensor_id].fit(data)
            normalized_data = self.scalers[sensor_id].transform(data)
            
            # 训练异常检测器
            self.detectors[sensor_id].fit(normalized_data)
            
            self.logger.info(f"传感器 {sensor_id} 检测器重训练完成")
            
        except Exception as e:
            self.logger.error(f"传感器 {sensor_id} 检测器重训练失败: {e}")
    
    def _statistical_anomaly_detection(self, sensor_id: str, value: float) -> float:
        """统计方法异常检测"""
        if len(self.training_data[sensor_id]) < 10:
            return 0.0
        
        data = list(self.training_data[sensor_id])
        
        # Z-score检测
        mean_val = statistics.mean(data)
        std_val = statistics.stdev(data) if len(data) > 1 else 1.0
        z_score = abs(value - mean_val) / std_val if std_val > 0 else 0.0
        
        # IQR检测
        q1 = np.percentile(data, 25)
        q3 = np.percentile(data, 75)
        iqr = q3 - q1
        iqr_lower = q1 - 1.5 * iqr
        iqr_upper = q3 + 1.5 * iqr
        iqr_score = 1.0 if value < iqr_lower or value > iqr_upper else 0.0
        
        # 组合分数
        statistical_score = min(1.0, z_score / self.thresholds[sensor_id]['z_score']) * 0.7 + iqr_score * 0.3
        
        return statistical_score
    
    def _ml_anomaly_detection(self, sensor_id: str, value: float) -> float:
        """机器学习异常检测"""
        if sensor_id not in self.detectors or not self._has_sufficient_data(sensor_id):
            return 0.0
        
        try:
            # 标准化输入
            value_array = np.array([[value]])
            normalized_value = self.scalers[sensor_id].transform(value_array)
            
            # 异常分数
            anomaly_score = self.detectors[sensor_id].decision_function(normalized_value)[0]
            
            # 转换为0-1范围
            normalized_score = max(0.0, min(1.0, -anomaly_score))
            
            return normalized_score
            
        except Exception as e:
            self.logger.warning(f"ML异常检测失败: {e}")
            return 0.0
    
    def _window_based_anomaly_detection(self, value: float, window_stats: Dict) -> float:
        """基于窗口统计的异常检测"""
        if 'statistics' not in window_stats:
            return 0.0
        
        stats = window_stats['statistics']
        
        # 相对于窗口均值的偏差
        mean_val = stats.get('mean', 0.0)
        std_val = stats.get('std', 1.0)
        
        if std_val > 0:
            deviation_score = abs(value - mean_val) / std_val / 3.0  # 3-sigma规则
        else:
            deviation_score = 0.0
        
        # 相对于窗口范围的位置
        min_val = stats.get('min', value)
        max_val = stats.get('max', value)
        
        if max_val > min_val:
            range_score = 0.0
            if value < min_val or value > max_val:
                range_score = min(abs(value - min_val), abs(value - max_val)) / (max_val - min_val)
        else:
            range_score = 0.0
        
        # 组合分数
        window_score = min(1.0, deviation_score * 0.8 + range_score * 0.2)
        
        return window_score
    
    def _has_sufficient_data(self, sensor_id: str) -> bool:
        """检查是否有足够的训练数据"""
        return len(self.training_data[sensor_id]) >= 50
    
    def _is_anomaly(self, sensor_id: str, score: float) -> bool:
        """判断是否为异常"""
        # 自适应阈值
        base_threshold = 0.6
        
        # 根据历史异常率调整阈值
        stats = self.detection_stats[sensor_id]
        if stats['total_points'] > 100:
            anomaly_rate = stats['anomalies_detected'] / stats['total_points']
            
            # 如果异常率过高，提高阈值
            if anomaly_rate > self.contamination * 2:
                base_threshold = min(0.9, base_threshold + 0.1)
            # 如果异常率过低，降低阈值
            elif anomaly_rate < self.contamination * 0.5:
                base_threshold = max(0.3, base_threshold - 0.1)
        
        return score > base_threshold
    
    def get_detection_statistics(self) -> Dict:
        """获取检测统计信息"""
        return dict(self.detection_stats)

class AdaptiveFlowController:
    """自适应流量控制器"""
    
    def __init__(self, max_throughput: int = 10000, 
                 latency_threshold: float = 0.1,
                 adaptation_interval: float = 1.0):
        """
        初始化自适应流量控制器
        
        Args:
            max_throughput: 最大吞吐量（点/秒）
            latency_threshold: 延迟阈值（秒）
            adaptation_interval: 适应间隔（秒）
        """
        self.max_throughput = max_throughput
        self.latency_threshold = latency_threshold
        self.adaptation_interval = adaptation_interval
        
        # 流量控制状态
        self.current_throughput = 0
        self.current_latency = 0.0
        self.drop_rate = 0.0
        
        # 统计信息
        self.throughput_history = deque(maxlen=100)
        self.latency_history = deque(maxlen=100)
        self.last_adaptation = time.time()
        
        # 控制参数
        self.backpressure_factor = 1.0
        self.priority_weights = defaultdict(float)
        
        self.logger = logging.getLogger(__name__)
    
    def should_process(self, data: StreamData) -> bool:
        """
        判断是否应该处理该数据点
        
        Args:
            data: 流数据点
            
        Returns:
            是否应该处理
        """
        # 获取传感器优先级
        priority = self._get_sensor_priority(data.sensor_id)
        
        # 计算处理概率
        process_probability = self._calculate_process_probability(priority)
        
        # 随机采样决策
        return np.random.random() < process_probability
    
    def update_metrics(self, processing_time: float, queue_size: int):
        """
        更新性能指标
        
        Args:
            processing_time: 处理时间
            queue_size: 队列大小
        """
        current_time = time.time()
        
        # 更新延迟
        self.current_latency = processing_time
        self.latency_history.append(processing_time)
        
        # 更新吞吐量（基于队列大小估算）
        estimated_throughput = min(self.max_throughput, 1.0 / processing_time if processing_time > 0 else self.max_throughput)
        self.current_throughput = estimated_throughput
        self.throughput_history.append(estimated_throughput)
        
        # 检查是否需要适应
        if current_time - self.last_adaptation >= self.adaptation_interval:
            self._adapt_flow_control()
            self.last_adaptation = current_time
    
    def _get_sensor_priority(self, sensor_id: str) -> float:
        """获取传感器优先级"""
        # 默认优先级权重
        default_weights = {
            'displacement': 1.0,    # 位移传感器（高优先级）
            'strain': 0.9,          # 应变传感器
            'pressure': 0.8,        # 压力传感器
            'temperature': 0.5,     # 温度传感器（低优先级）
            'humidity': 0.3         # 湿度传感器
        }
        
        # 根据传感器ID判断类型
        for sensor_type, weight in default_weights.items():
            if sensor_type in sensor_id.lower():
                return weight
        
        # 使用自适应权重
        if sensor_id in self.priority_weights:
            return self.priority_weights[sensor_id]
        
        # 默认中等优先级
        return 0.7
    
    def _calculate_process_probability(self, priority: float) -> float:
        """计算处理概率"""
        # 基础概率
        base_probability = 1.0
        
        # 根据当前延迟调整
        if self.current_latency > self.latency_threshold:
            latency_penalty = min(0.5, (self.current_latency - self.latency_threshold) / self.latency_threshold)
            base_probability -= latency_penalty
        
        # 根据吞吐量调整
        if self.current_throughput > self.max_throughput * 0.9:
            throughput_penalty = 0.3
            base_probability -= throughput_penalty
        
        # 应用优先级权重
        final_probability = base_probability * priority * self.backpressure_factor
        
        return max(0.1, min(1.0, final_probability))  # 限制在[0.1, 1.0]范围
    
    def _adapt_flow_control(self):
        """自适应流量控制"""
        if not self.latency_history or not self.throughput_history:
            return
        
        # 计算平均延迟和吞吐量
        avg_latency = statistics.mean(self.latency_history)
        avg_throughput = statistics.mean(self.throughput_history)
        
        # 调整背压因子
        if avg_latency > self.latency_threshold * 1.2:
            # 延迟过高，增加背压
            self.backpressure_factor = max(0.5, self.backpressure_factor - 0.1)
            self.logger.info(f"延迟过高({avg_latency:.3f}s)，降低背压因子至{self.backpressure_factor:.2f}")
        elif avg_latency < self.latency_threshold * 0.8:
            # 延迟较低，可以放松背压
            self.backpressure_factor = min(1.0, self.backpressure_factor + 0.05)
            self.logger.info(f"延迟良好({avg_latency:.3f}s)，提高背压因子至{self.backpressure_factor:.2f}")
        
        # 更新丢弃率统计
        self.drop_rate = 1.0 - self.backpressure_factor
    
    def get_flow_statistics(self) -> Dict:
        """获取流量控制统计"""
        return {
            'current_throughput': self.current_throughput,
            'current_latency': self.current_latency,
            'drop_rate': self.drop_rate,
            'backpressure_factor': self.backpressure_factor,
            'avg_latency': statistics.mean(self.latency_history) if self.latency_history else 0.0,
            'avg_throughput': statistics.mean(self.throughput_history) if self.throughput_history else 0.0
        }

class DistributedStreamProcessor:
    """分布式流处理器"""
    
    def __init__(self, num_workers: int = 4, buffer_size: int = 10000):
        """
        初始化分布式流处理器
        
        Args:
            num_workers: 工作线程数
            buffer_size: 缓冲区大小
        """
        self.num_workers = num_workers
        self.buffer_size = buffer_size
        self.logger = logging.getLogger(__name__)
        
        # 处理组件
        self.window_aggregator = SlidingWindowAggregator()
        self.anomaly_detector = OnlineAnomalyDetector()
        self.flow_controller = AdaptiveFlowController()
        
        # 线程池和队列
        self.executor = ThreadPoolExecutor(max_workers=num_workers)
        self.input_queue = queue.Queue(maxsize=buffer_size)
        self.output_queue = queue.Queue(maxsize=buffer_size)
        
        # 处理状态
        self.is_running = False
        self.worker_threads = []
        self.stats_thread = None
        
        # 性能统计
        self.processing_stats = {
            'total_processed': 0,
            'total_anomalies': 0,
            'total_dropped': 0,
            'processing_times': deque(maxlen=1000),
            'start_time': time.time()
        }
        
        # GPU处理支持
        self.use_gpu = CUPY_AVAILABLE
        if self.use_gpu:
            self.gpu_batch_size = 1000
            self.gpu_buffer = []
    
    async def start_processing(self):
        """启动流处理"""
        if self.is_running:
            self.logger.warning("流处理器已在运行")
            return
        
        self.is_running = True
        self.logger.info(f"启动分布式流处理器，工作线程数: {self.num_workers}")
        
        # 启动工作线程
        for i in range(self.num_workers):
            thread = threading.Thread(target=self._worker_loop, args=(i,), daemon=True)
            thread.start()
            self.worker_threads.append(thread)
        
        # 启动统计线程
        self.stats_thread = threading.Thread(target=self._stats_loop, daemon=True)
        self.stats_thread.start()
    
    def stop_processing(self):
        """停止流处理"""
        self.is_running = False
        self.logger.info("停止分布式流处理器")
        
        # 等待工作线程结束
        for thread in self.worker_threads:
            thread.join(timeout=5.0)
        
        self.worker_threads.clear()
        
        # 关闭线程池
        self.executor.shutdown(wait=True)
    
    async def process_stream_data(self, data: StreamData) -> Optional[ProcessingResult]:
        """
        处理流数据
        
        Args:
            data: 流数据点
            
        Returns:
            处理结果
        """
        # 流量控制检查
        if not self.flow_controller.should_process(data):
            self.processing_stats['total_dropped'] += 1
            return None
        
        try:
            # 添加到输入队列
            self.input_queue.put_nowait(data)
            return await self._get_processing_result()
        except queue.Full:
            self.processing_stats['total_dropped'] += 1
            self.logger.warning("输入队列已满，丢弃数据点")
            return None
    
    def _worker_loop(self, worker_id: int):
        """工作线程主循环"""
        self.logger.info(f"工作线程 {worker_id} 启动")
        
        while self.is_running:
            try:
                # 获取输入数据
                data = self.input_queue.get(timeout=1.0)
                
                # 处理数据
                result = self._process_single_data(data)
                
                # 输出结果
                if result:
                    self.output_queue.put_nowait(result)
                
                # 标记任务完成
                self.input_queue.task_done()
                
            except queue.Empty:
                continue
            except queue.Full:
                self.logger.warning(f"工作线程 {worker_id}: 输出队列已满")
            except Exception as e:
                self.logger.error(f"工作线程 {worker_id} 处理错误: {e}")
        
        self.logger.info(f"工作线程 {worker_id} 结束")
    
    def _process_single_data(self, data: StreamData) -> Optional[ProcessingResult]:
        """处理单个数据点"""
        start_time = time.time()
        
        try:
            # 1. 滑动窗口聚合
            window_stats = self.window_aggregator.add_data_point(data)
            
            # 2. 异常检测
            is_anomaly, anomaly_score = self.anomaly_detector.detect_anomaly(data, window_stats)
            
            # 3. 数据预处理（如果使用GPU）
            processed_value = self._preprocess_value(data.value)
            
            # 4. 创建处理结果
            processing_time = time.time() - start_time
            
            result = ProcessingResult(
                original_data=data,
                processed_value=processed_value,
                anomaly_score=anomaly_score,
                is_anomaly=is_anomaly,
                processing_time=processing_time,
                stage='complete'
            )
            
            # 5. 更新统计
            self.processing_stats['total_processed'] += 1
            if is_anomaly:
                self.processing_stats['total_anomalies'] += 1
            self.processing_stats['processing_times'].append(processing_time)
            
            # 6. 更新流量控制指标
            self.flow_controller.update_metrics(processing_time, self.input_queue.qsize())
            
            return result
            
        except Exception as e:
            self.logger.error(f"数据处理失败: {e}")
            return None
    
    def _preprocess_value(self, value: float) -> float:
        """预处理数值"""
        if self.use_gpu and len(self.gpu_buffer) < self.gpu_batch_size:
            # GPU批处理模式
            self.gpu_buffer.append(value)
            
            if len(self.gpu_buffer) >= self.gpu_batch_size:
                processed_batch = self._gpu_batch_process()
                self.gpu_buffer.clear()
                return processed_batch[-1]  # 返回当前值的处理结果
            else:
                return value  # 等待批处理
        else:
            # CPU单点处理
            return self._cpu_process_value(value)
    
    def _gpu_batch_process(self) -> List[float]:
        """GPU批处理"""
        try:
            # 转换为GPU数组
            gpu_data = cp.array(self.gpu_buffer, dtype=cp.float32)
            
            # GPU并行处理（示例：标准化 + 滤波）
            gpu_normalized = (gpu_data - cp.mean(gpu_data)) / cp.std(gpu_data)
            
            # 简单低通滤波
            kernel = cp.array([0.2, 0.6, 0.2], dtype=cp.float32)
            gpu_filtered = cp.convolve(gpu_normalized, kernel, mode='same')
            
            # 转回CPU
            return gpu_filtered.get().tolist()
            
        except Exception as e:
            self.logger.error(f"GPU批处理失败: {e}")
            # 回退到CPU处理
            return [self._cpu_process_value(v) for v in self.gpu_buffer]
    
    def _cpu_process_value(self, value: float) -> float:
        """CPU单点处理"""
        # 简单的数据预处理
        # 1. 去除明显错误值
        if abs(value) > 1e6:
            return 0.0
        
        # 2. 简单平滑
        # 这里可以实现更复杂的滤波算法
        return float(value)
    
    async def _get_processing_result(self) -> Optional[ProcessingResult]:
        """获取处理结果"""
        try:
            # 异步等待结果
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None, 
                lambda: self.output_queue.get(timeout=5.0)
            )
            self.output_queue.task_done()
            return result
        except queue.Empty:
            return None
    
    def _stats_loop(self):
        """统计信息收集循环"""
        while self.is_running:
            try:
                time.sleep(5.0)  # 每5秒收集一次统计
                self._log_performance_stats()
            except Exception as e:
                self.logger.error(f"统计收集错误: {e}")
    
    def _log_performance_stats(self):
        """记录性能统计"""
        stats = self.get_performance_statistics()
        
        self.logger.info(
            f"性能统计 - 处理总数: {stats['total_processed']}, "
            f"异常检测: {stats['total_anomalies']}, "
            f"平均延迟: {stats['avg_processing_time']:.3f}s, "
            f"吞吐量: {stats['throughput']:.1f}/s"
        )
    
    def get_performance_statistics(self) -> Dict:
        """获取性能统计"""
        current_time = time.time()
        elapsed_time = current_time - self.processing_stats['start_time']
        
        stats = {
            'total_processed': self.processing_stats['total_processed'],
            'total_anomalies': self.processing_stats['total_anomalies'],
            'total_dropped': self.processing_stats['total_dropped'],
            'elapsed_time': elapsed_time,
            'throughput': self.processing_stats['total_processed'] / elapsed_time if elapsed_time > 0 else 0.0,
            'anomaly_rate': (self.processing_stats['total_anomalies'] / 
                           max(1, self.processing_stats['total_processed'])),
            'drop_rate': (self.processing_stats['total_dropped'] / 
                         max(1, self.processing_stats['total_processed'] + self.processing_stats['total_dropped']))
        }
        
        # 处理时间统计
        if self.processing_stats['processing_times']:
            processing_times = list(self.processing_stats['processing_times'])
            stats.update({
                'avg_processing_time': statistics.mean(processing_times),
                'min_processing_time': min(processing_times),
                'max_processing_time': max(processing_times),
                'p95_processing_time': np.percentile(processing_times, 95)
            })
        else:
            stats.update({
                'avg_processing_time': 0.0,
                'min_processing_time': 0.0,
                'max_processing_time': 0.0,
                'p95_processing_time': 0.0
            })
        
        # 添加组件统计
        stats['flow_control'] = self.flow_controller.get_flow_statistics()
        stats['anomaly_detection'] = self.anomaly_detector.get_detection_statistics()
        
        return stats
    
    def get_system_health(self) -> Dict:
        """获取系统健康状态"""
        stats = self.get_performance_statistics()
        
        # 健康评分算法
        health_score = 100.0
        
        # 延迟健康
        if stats['avg_processing_time'] > 0.2:
            health_score -= 20.0
        elif stats['avg_processing_time'] > 0.1:
            health_score -= 10.0
        
        # 丢弃率健康
        if stats['drop_rate'] > 0.1:
            health_score -= 30.0
        elif stats['drop_rate'] > 0.05:
            health_score -= 15.0
        
        # 异常率健康
        if stats['anomaly_rate'] > 0.2:
            health_score -= 20.0
        elif stats['anomaly_rate'] > 0.1:
            health_score -= 10.0
        
        # 吞吐量健康
        if stats['throughput'] < 1000:
            health_score -= 20.0
        elif stats['throughput'] < 5000:
            health_score -= 10.0
        
        health_score = max(0.0, health_score)
        
        # 健康等级
        if health_score >= 90:
            health_level = "Excellent"
        elif health_score >= 75:
            health_level = "Good"
        elif health_score >= 60:
            health_level = "Fair"
        elif health_score >= 40:
            health_level = "Poor"
        else:
            health_level = "Critical"
        
        return {
            'health_score': health_score,
            'health_level': health_level,
            'is_running': self.is_running,
            'worker_count': len(self.worker_threads),
            'queue_sizes': {
                'input': self.input_queue.qsize(),
                'output': self.output_queue.qsize()
            },
            'recommendations': self._get_health_recommendations(health_score, stats)
        }
    
    def _get_health_recommendations(self, health_score: float, stats: Dict) -> List[str]:
        """获取健康改善建议"""
        recommendations = []
        
        if stats['avg_processing_time'] > 0.1:
            recommendations.append("考虑增加工作线程数量以降低处理延迟")
        
        if stats['drop_rate'] > 0.05:
            recommendations.append("优化流量控制策略或增加缓冲区大小")
        
        if stats['anomaly_rate'] > 0.15:
            recommendations.append("检查传感器数据质量或调整异常检测阈值")
        
        if stats['throughput'] < 5000:
            recommendations.append("启用GPU加速或优化数据处理算法")
        
        if health_score < 60:
            recommendations.append("建议进行系统维护和性能调优")
        
        return recommendations

# 深基坑工程专用流处理器
class DeepExcavationStreamProcessor(DistributedStreamProcessor):
    """深基坑工程流处理器"""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        
        # 深基坑专用配置
        self._configure_for_excavation()
    
    def _configure_for_excavation(self):
        """深基坑工程专用配置"""
        # 调整异常检测参数（深基坑对安全要求高）
        self.anomaly_detector.contamination = 0.05  # 降低异常容忍度
        
        # 设置传感器优先级
        excavation_priorities = {
            'displacement_sensor': 1.0,      # 位移传感器最高优先级
            'inclinometer': 0.95,            # 倾斜仪
            'strain_gauge': 0.9,             # 应变计
            'piezometer': 0.85,              # 孔隙水压力计
            'settlement_marker': 0.9,        # 沉降标
            'crack_monitor': 0.95,           # 裂缝监测
            'load_cell': 0.8,                # 荷重传感器
            'temperature_sensor': 0.4,       # 温度传感器
            'humidity_sensor': 0.3           # 湿度传感器
        }
        
        self.flow_controller.priority_weights.update(excavation_priorities)
        
        # 调整流量控制参数
        self.flow_controller.latency_threshold = 0.05  # 更严格的延迟要求
        
        self.logger.info("深基坑工程流处理器配置完成")

if __name__ == "__main__":
    # 测试示例
    async def test_stream_processor():
        """流处理器测试"""
        print("🌊 DeepCAD实时数据流处理器测试 🌊")
        
        # 创建深基坑流处理器
        processor = DeepExcavationStreamProcessor(
            num_workers=6,
            buffer_size=5000
        )
        
        # 启动处理器
        await processor.start_processing()
        
        print("⚡ 开始模拟数据流...")
        
        # 模拟传感器数据流
        sensor_types = [
            'displacement_sensor_1', 'displacement_sensor_2',
            'inclinometer_1', 'strain_gauge_1', 'piezometer_1',
            'settlement_marker_1', 'temperature_sensor_1'
        ]
        
        start_time = time.time()
        processed_count = 0
        
        # 模拟10000个数据点
        for i in range(10000):
            # 随机选择传感器
            sensor_id = np.random.choice(sensor_types)
            
            # 生成模拟数据（包含一些异常值）
            if np.random.random() < 0.05:  # 5%异常数据
                value = np.random.normal(0, 10)  # 异常值
            else:
                value = np.random.normal(0, 1)   # 正常值
            
            # 创建数据点
            data = StreamData(
                sensor_id=sensor_id,
                timestamp=time.time(),
                value=value,
                metadata={'source': 'simulation'}
            )
            
            # 处理数据
            result = await processor.process_stream_data(data)
            if result:
                processed_count += 1
                
                # 每1000个点输出一次进度
                if processed_count % 1000 == 0:
                    print(f"  已处理: {processed_count}/10000 "
                          f"(异常: {'是' if result.is_anomaly else '否'}, "
                          f"分数: {result.anomaly_score:.3f})")
            
            # 控制数据生成速率
            if i % 100 == 0:
                await asyncio.sleep(0.01)  # 10ms延迟
        
        # 等待处理完成
        await asyncio.sleep(2.0)
        
        # 获取统计信息
        stats = processor.get_performance_statistics()
        health = processor.get_system_health()
        
        print(f"\n📊 处理统计:")
        print(f"  总处理数: {stats['total_processed']}")
        print(f"  异常检测: {stats['total_anomalies']}")
        print(f"  丢弃数据: {stats['total_dropped']}")
        print(f"  平均延迟: {stats['avg_processing_time']:.3f}秒")
        print(f"  吞吐量: {stats['throughput']:.1f}点/秒")
        print(f"  异常率: {stats['anomaly_rate']:.1%}")
        
        print(f"\n🏥 系统健康:")
        print(f"  健康评分: {health['health_score']:.1f}/100")
        print(f"  健康等级: {health['health_level']}")
        print(f"  队列状态: 输入{health['queue_sizes']['input']}, 输出{health['queue_sizes']['output']}")
        
        if health['recommendations']:
            print(f"  改善建议:")
            for rec in health['recommendations']:
                print(f"    - {rec}")
        
        # 停止处理器
        processor.stop_processing()
        
        print("\n✅ 实时数据流处理器测试完成！")
    
    # 运行测试
    asyncio.run(test_stream_processor())