#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""增强版IoT数据收集器

本模块提供了增强版的IoT数据收集功能，支持实时数据采集、数据缓存、数据过滤和预处理。
适用于深基坑工程中的多种传感器数据采集和处理。
"""

import os
import sys
import time
import json
import datetime
import numpy as np
import pandas as pd
import logging
import threading
import queue
from enum import Enum
from typing import Dict, List, Tuple, Union, Optional, Any
from pathlib import Path

# 导入基础IoT模块
from src.ai.iot_data_collector import SensorType, SensorStatus, SimpleIoTDataReader

# 配置日志
logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(logs_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(logs_dir, "enhanced_iot_collector.log"), mode="a", encoding="utf-8")
    ]
)
logger = logging.getLogger("EnhancedIoTCollector")

class SensorConfig:
    """传感器配置类"""
    
    def __init__(
        self,
        sensor_id: str,
        sensor_type: SensorType,
        location: List[float],
        sampling_rate: float = 1.0,  # 采样率（Hz）
        buffer_size: int = 1000,     # 缓冲区大小
        preprocessing: List[str] = None  # 预处理方法列表
    ):
        self.sensor_id = sensor_id
        self.sensor_type = sensor_type
        self.location = location
        self.sampling_rate = sampling_rate
        self.buffer_size = buffer_size
        self.preprocessing = preprocessing or []
        self.status = SensorStatus.INACTIVE
        self.last_reading_time = None
        self.metadata = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            "sensor_id": self.sensor_id,
            "sensor_type": self.sensor_type,
            "location": self.location,
            "sampling_rate": self.sampling_rate,
            "buffer_size": self.buffer_size,
            "preprocessing": self.preprocessing,
            "status": self.status,
            "last_reading_time": self.last_reading_time,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SensorConfig':
        """从字典创建传感器配置"""
        config = cls(
            sensor_id=data["sensor_id"],
            sensor_type=data["sensor_type"],
            location=data["location"],
            sampling_rate=data.get("sampling_rate", 1.0),
            buffer_size=data.get("buffer_size", 1000),
            preprocessing=data.get("preprocessing", [])
        )
        config.status = data.get("status", SensorStatus.INACTIVE)
        config.last_reading_time = data.get("last_reading_time")
        config.metadata = data.get("metadata", {})
        return config

class EnhancedIoTCollector:
    """增强版IoT数据收集器"""
    
    def __init__(
        self,
        project_id: int,
        data_dir: str = None,
        config_file: str = None
    ):
        """
        初始化增强版IoT数据收集器
        
        Args:
            project_id: 项目ID
            data_dir: 数据目录
            config_file: 配置文件路径
        """
        self.project_id = project_id
        
        # 设置数据目录
        if data_dir is None:
            self.data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                        "data", "iot", f"project_{project_id}")
        else:
            self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)
        
        # 设置配置文件
        if config_file is None:
            self.config_file = os.path.join(self.data_dir, "sensor_config.json")
        else:
            self.config_file = config_file
        
        # 初始化传感器配置
        self.sensors = {}
        self.load_sensor_config()
        
        # 初始化数据缓冲区和采集线程
        self.data_buffers = {}
        self.collection_threads = {}
        self.is_collecting = False
        self.collection_stop_event = threading.Event()
        
        # 初始化数据处理队列
        self.processing_queue = queue.Queue()
        self.processing_thread = None
        
        # 初始化基础数据读取器
        self.reader = SimpleIoTDataReader()
        
        logger.info(f"增强版IoT数据收集器初始化完成，项目ID: {project_id}")
    
    def load_sensor_config(self) -> bool:
        """
        加载传感器配置
        
        Returns:
            是否成功加载
        """
        if not os.path.exists(self.config_file):
            logger.warning(f"传感器配置文件不存在: {self.config_file}")
            return False
        
        try:
            with open(self.config_file, 'r') as f:
                config_data = json.load(f)
            
            for sensor_data in config_data.get("sensors", []):
                sensor_config = SensorConfig.from_dict(sensor_data)
                self.sensors[sensor_config.sensor_id] = sensor_config
            
            logger.info(f"成功加载 {len(self.sensors)} 个传感器配置")
            return True
            
        except Exception as e:
            logger.error(f"加载传感器配置出错: {str(e)}")
            return False
    
    def save_sensor_config(self) -> bool:
        """
        保存传感器配置
        
        Returns:
            是否成功保存
        """
        try:
            config_data = {
                "project_id": self.project_id,
                "updated_at": datetime.datetime.now().isoformat(),
                "sensors": [sensor.to_dict() for sensor in self.sensors.values()]
            }
            
            with open(self.config_file, 'w') as f:
                json.dump(config_data, f, indent=2)
            
            logger.info(f"成功保存 {len(self.sensors)} 个传感器配置")
            return True
            
        except Exception as e:
            logger.error(f"保存传感器配置出错: {str(e)}")
            return False
    
    def add_sensor(self, sensor_config: SensorConfig) -> bool:
        """
        添加传感器
        
        Args:
            sensor_config: 传感器配置
            
        Returns:
            是否成功添加
        """
        if sensor_config.sensor_id in self.sensors:
            logger.warning(f"传感器已存在: {sensor_config.sensor_id}")
            return False
        
        self.sensors[sensor_config.sensor_id] = sensor_config
        self.data_buffers[sensor_config.sensor_id] = []
        
        logger.info(f"添加传感器: {sensor_config.sensor_id}, 类型: {sensor_config.sensor_type}")
        self.save_sensor_config()
        return True
    
    def remove_sensor(self, sensor_id: str) -> bool:
        """
        移除传感器
        
        Args:
            sensor_id: 传感器ID
            
        Returns:
            是否成功移除
        """
        if sensor_id not in self.sensors:
            logger.warning(f"传感器不存在: {sensor_id}")
            return False
        
        # 停止该传感器的数据采集
        if sensor_id in self.collection_threads and self.collection_threads[sensor_id].is_alive():
            self.stop_collection(sensor_id)
        
        # 移除传感器
        del self.sensors[sensor_id]
        if sensor_id in self.data_buffers:
            del self.data_buffers[sensor_id]
        
        logger.info(f"移除传感器: {sensor_id}")
        self.save_sensor_config()
        return True
    
    def start_collection(self, sensor_id: str = None) -> bool:
        """
        启动数据采集
        
        Args:
            sensor_id: 传感器ID，如果为None则启动所有传感器
            
        Returns:
            是否成功启动
        """
        if sensor_id is not None:
            if sensor_id not in self.sensors:
                logger.warning(f"传感器不存在: {sensor_id}")
                return False
            
            # 启动单个传感器的数据采集
            return self._start_sensor_collection(sensor_id)
        else:
            # 启动所有传感器的数据采集
            self.is_collecting = True
            self.collection_stop_event.clear()
            
            success = True
            for sid in self.sensors:
                if not self._start_sensor_collection(sid):
                    success = False
            
            # 启动数据处理线程
            if success and (self.processing_thread is None or not self.processing_thread.is_alive()):
                self.processing_thread = threading.Thread(target=self._processing_worker)
                self.processing_thread.daemon = True
                self.processing_thread.start()
            
            return success
    
    def _start_sensor_collection(self, sensor_id: str) -> bool:
        """
        启动单个传感器的数据采集
        
        Args:
            sensor_id: 传感器ID
            
        Returns:
            是否成功启动
        """
        if sensor_id in self.collection_threads and self.collection_threads[sensor_id].is_alive():
            logger.warning(f"传感器 {sensor_id} 已在采集数据")
            return True
        
        # 初始化数据缓冲区
        self.data_buffers[sensor_id] = []
        
        # 创建并启动采集线程
        thread = threading.Thread(
            target=self._collection_worker,
            args=(sensor_id,)
        )
        thread.daemon = True
        thread.start()
        
        self.collection_threads[sensor_id] = thread
        self.sensors[sensor_id].status = SensorStatus.ACTIVE
        
        logger.info(f"启动传感器 {sensor_id} 数据采集")
        return True
    
    def stop_collection(self, sensor_id: str = None) -> bool:
        """
        停止数据采集
        
        Args:
            sensor_id: 传感器ID，如果为None则停止所有传感器
            
        Returns:
            是否成功停止
        """
        if sensor_id is not None:
            if sensor_id not in self.sensors:
                logger.warning(f"传感器不存在: {sensor_id}")
                return False
            
            # 停止单个传感器的数据采集
            if sensor_id in self.collection_threads and self.collection_threads[sensor_id].is_alive():
                # 标记传感器状态为非活动
                self.sensors[sensor_id].status = SensorStatus.INACTIVE
                
                # 等待线程结束
                self.collection_threads[sensor_id].join(timeout=2.0)
                
                # 保存缓冲区数据
                self._save_buffer_data(sensor_id)
                
                logger.info(f"停止传感器 {sensor_id} 数据采集")
                return True
            else:
                logger.warning(f"传感器 {sensor_id} 未在采集数据")
                return False
        else:
            # 停止所有传感器的数据采集
            self.is_collecting = False
            self.collection_stop_event.set()
            
            # 等待所有线程结束
            for sid, thread in self.collection_threads.items():
                if thread.is_alive():
                    self.sensors[sid].status = SensorStatus.INACTIVE
                    thread.join(timeout=2.0)
                    
                    # 保存缓冲区数据
                    self._save_buffer_data(sid)
            
            # 等待处理线程结束
            if self.processing_thread and self.processing_thread.is_alive():
                self.processing_thread.join(timeout=2.0)
            
            logger.info("停止所有传感器数据采集")
            return True
    
    def _collection_worker(self, sensor_id: str):
        """
        数据采集工作线程
        
        Args:
            sensor_id: 传感器ID
        """
        sensor = self.sensors[sensor_id]
        
        while not self.collection_stop_event.is_set() and sensor.status == SensorStatus.ACTIVE:
            try:
                # 读取传感器数据
                raw_data = self.reader.read_sensor_data(sensor_id)
                
                # 构建数据记录
                timestamp = datetime.datetime.now().isoformat()
                data_record = {
                    "sensor_id": sensor_id,
                    "timestamp": timestamp,
                    "value": raw_data.get("value", 0.0),
                    "status": raw_data.get("status", SensorStatus.ACTIVE)
                }
                
                # 添加到缓冲区
                self.data_buffers[sensor_id].append(data_record)
                
                # 如果缓冲区已满，则提交处理
                if len(self.data_buffers[sensor_id]) >= sensor.buffer_size:
                    self.processing_queue.put((sensor_id, self.data_buffers[sensor_id][:]))
                    self.data_buffers[sensor_id] = []
                
                # 更新传感器状态
                sensor.last_reading_time = timestamp
                
                # 根据采样率休眠
                time.sleep(1.0 / sensor.sampling_rate)
                
            except Exception as e:
                logger.error(f"传感器 {sensor_id} 数据采集出错: {str(e)}")
                sensor.status = SensorStatus.ERROR
                time.sleep(5.0)  # 出错后等待5秒再重试
    
    def _processing_worker(self):
        """数据处理工作线程"""
        while self.is_collecting or not self.processing_queue.empty():
            try:
                # 获取待处理的数据
                sensor_id, buffer_data = self.processing_queue.get(timeout=1.0)
                
                # 处理数据
                processed_data = self._preprocess_data(sensor_id, buffer_data)
                
                # 保存处理后的数据
                self._save_processed_data(sensor_id, processed_data)
                
                self.processing_queue.task_done()
                
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"数据处理出错: {str(e)}")
    
    def _preprocess_data(self, sensor_id: str, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        预处理数据
        
        Args:
            sensor_id: 传感器ID
            data: 原始数据列表
            
        Returns:
            处理后的数据列表
        """
        if not data:
            return data
        
        sensor = self.sensors.get(sensor_id)
        if not sensor:
            return data
        
        processed_data = data
        
        # 应用预处理方法
        for method in sensor.preprocessing:
            if method == "remove_outliers":
                processed_data = self._remove_outliers(processed_data)
            elif method == "smooth":
                processed_data = self._smooth_data(processed_data)
            elif method == "interpolate":
                processed_data = self._interpolate_data(processed_data)
        
        return processed_data
    
    def _remove_outliers(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        移除异常值
        
        Args:
            data: 数据列表
            
        Returns:
            处理后的数据列表
        """
        if len(data) < 3:
            return data
        
        # 提取值
        values = [record.get("value", 0.0) for record in data]
        
        # 计算均值和标准差
        mean_val = np.mean(values)
        std_val = np.std(values)
        
        # 移除超过3个标准差的值
        threshold = 3.0 * std_val
        filtered_data = [
            record for record in data
            if abs(record.get("value", 0.0) - mean_val) <= threshold
        ]
        
        return filtered_data
    
    def _smooth_data(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        平滑数据
        
        Args:
            data: 数据列表
            
        Returns:
            处理后的数据列表
        """
        if len(data) < 5:
            return data
        
        # 提取值
        values = np.array([record.get("value", 0.0) for record in data])
        
        # 应用移动平均
        window_size = min(5, len(values))
        smoothed_values = np.convolve(values, np.ones(window_size)/window_size, mode='same')
        
        # 创建新的数据记录
        smoothed_data = []
        for i, record in enumerate(data):
            new_record = record.copy()
            new_record["value"] = float(smoothed_values[i])
            smoothed_data.append(new_record)
        
        return smoothed_data
    
    def _interpolate_data(self, data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        插值处理
        
        Args:
            data: 数据列表
            
        Returns:
            处理后的数据列表
        """
        # 简单实现，实际应用中可能需要更复杂的插值方法
        return data
    
    def _save_buffer_data(self, sensor_id: str):
        """
        保存缓冲区数据
        
        Args:
            sensor_id: 传感器ID
        """
        if not self.data_buffers.get(sensor_id):
            return
        
        # 提交剩余的缓冲区数据进行处理
        self.processing_queue.put((sensor_id, self.data_buffers[sensor_id][:]))
        self.data_buffers[sensor_id] = []
    
    def _save_processed_data(self, sensor_id: str, data: List[Dict[str, Any]]):
        """
        保存处理后的数据
        
        Args:
            sensor_id: 传感器ID
            data: 处理后的数据
        """
        if not data:
            return
        
        sensor = self.sensors.get(sensor_id)
        if not sensor:
            return
        
        # 创建传感器数据目录
        sensor_dir = os.path.join(self.data_dir, sensor.sensor_type, sensor_id)
        os.makedirs(sensor_dir, exist_ok=True)
        
        # 按日期保存数据
        today = datetime.datetime.now().strftime("%Y%m%d")
        data_file = os.path.join(sensor_dir, f"{today}.jsonl")
        
        # 追加写入数据
        with open(data_file, 'a') as f:
            for record in data:
                f.write(json.dumps(record) + '\n')
        
        logger.debug(f"保存 {len(data)} 条 {sensor_id} 传感器数据到 {data_file}")
    
    def get_sensor_data(
        self,
        sensor_id: str,
        start_date: str,
        end_date: str = None,
        limit: int = None
    ) -> List[Dict[str, Any]]:
        """
        获取传感器数据
        
        Args:
            sensor_id: 传感器ID
            start_date: 开始日期 (YYYYMMDD格式)
            end_date: 结束日期 (YYYYMMDD格式)，如果为None则与开始日期相同
            limit: 返回的最大记录数
            
        Returns:
            传感器数据列表
        """
        if sensor_id not in self.sensors:
            logger.warning(f"传感器不存在: {sensor_id}")
            return []
        
        sensor = self.sensors[sensor_id]
        
        # 设置结束日期
        if end_date is None:
            end_date = start_date
        
        # 解析日期
        try:
            start_dt = datetime.datetime.strptime(start_date, "%Y%m%d")
            end_dt = datetime.datetime.strptime(end_date, "%Y%m%d")
        except ValueError:
            logger.error(f"日期格式错误，应为YYYYMMDD: {start_date}, {end_date}")
            return []
        
        # 收集日期范围内的所有数据
        all_data = []
        current_dt = start_dt
        
        while current_dt <= end_dt:
            date_str = current_dt.strftime("%Y%m%d")
            data_file = os.path.join(self.data_dir, sensor.sensor_type, sensor_id, f"{date_str}.jsonl")
            
            if os.path.exists(data_file):
                with open(data_file, 'r') as f:
                    for line in f:
                        try:
                            record = json.loads(line.strip())
                            all_data.append(record)
                        except json.JSONDecodeError:
                            continue
            
            # 下一天
            current_dt += datetime.timedelta(days=1)
        
        # 按时间戳排序
        all_data.sort(key=lambda x: x.get("timestamp", ""))
        
        # 限制记录数
        if limit is not None and limit > 0:
            all_data = all_data[:limit]
        
        logger.info(f"获取传感器 {sensor_id} 数据: {len(all_data)} 条记录")
        return all_data
    
    def get_latest_data(self, sensor_id: str = None) -> Dict[str, Any]:
        """
        获取最新数据
        
        Args:
            sensor_id: 传感器ID，如果为None则返回所有传感器的最新数据
            
        Returns:
            最新数据字典
        """
        if sensor_id is not None:
            if sensor_id not in self.sensors:
                logger.warning(f"传感器不存在: {sensor_id}")
                return {}
            
            # 返回单个传感器的最新数据
            if self.data_buffers.get(sensor_id) and self.data_buffers[sensor_id]:
                return self.data_buffers[sensor_id][-1]
            else:
                # 尝试从文件中读取最新数据
                today = datetime.datetime.now().strftime("%Y%m%d")
                yesterday = (datetime.datetime.now() - datetime.timedelta(days=1)).strftime("%Y%m%d")
                
                for date_str in [today, yesterday]:
                    data = self.get_sensor_data(sensor_id, date_str, limit=1)
                    if data:
                        return data[0]
                
                return {}
        else:
            # 返回所有传感器的最新数据
            latest_data = {}
            for sid in self.sensors:
                data = self.get_latest_data(sid)
                if data:
                    latest_data[sid] = data
            
            return latest_data
    
    def get_sensor_status(self, sensor_id: str = None) -> Dict[str, Any]:
        """
        获取传感器状态
        
        Args:
            sensor_id: 传感器ID，如果为None则返回所有传感器的状态
            
        Returns:
            传感器状态字典
        """
        if sensor_id is not None:
            if sensor_id not in self.sensors:
                logger.warning(f"传感器不存在: {sensor_id}")
                return {}
            
            # 返回单个传感器的状态
            sensor = self.sensors[sensor_id]
            return {
                "sensor_id": sensor_id,
                "status": sensor.status,
                "last_reading_time": sensor.last_reading_time,
                "is_collecting": sensor_id in self.collection_threads and self.collection_threads[sensor_id].is_alive()
            }
        else:
            # 返回所有传感器的状态
            status_data = {}
            for sid in self.sensors:
                status_data[sid] = self.get_sensor_status(sid)
            
            return status_data

def main():
    """测试函数"""
    # 创建增强版IoT数据收集器
    collector = EnhancedIoTCollector(project_id=1)
    
    # 添加传感器
    sensor1 = SensorConfig(
        sensor_id="displacement_01",
        sensor_type=SensorType.DISPLACEMENT,
        location=[0.0, 0.0, -10.0],
        sampling_rate=0.5,  # 每2秒采样一次
        preprocessing=["remove_outliers", "smooth"]
    )
    
    sensor2 = SensorConfig(
        sensor_id="pressure_01",
        sensor_type=SensorType.PRESSURE,
        location=[0.0, 0.0, -10.0],
        sampling_rate=0.2,  # 每5秒采样一次
        preprocessing=["remove_outliers"]
    )
    
    collector.add_sensor(sensor1)
    collector.add_sensor(sensor2)
    
    # 启动数据采集
    collector.start_collection()
    
    try:
        # 运行一段时间
        print("数据采集中，按Ctrl+C停止...")
        time.sleep(30)
    except KeyboardInterrupt:
        pass
    finally:
        # 停止数据采集
        collector.stop_collection()
    
    # 获取最新数据
    latest_data = collector.get_latest_data()
    print("最新数据:", json.dumps(latest_data, indent=2))
    
    # 获取传感器状态
    sensor_status = collector.get_sensor_status()
    print("传感器状态:", json.dumps(sensor_status, indent=2))

if __name__ == "__main__":
    main() 