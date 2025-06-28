#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file physics_group_updater.py
@description 物理组自动更新模块，提供深基坑工程的物理组参数自动更新功能
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import numpy as np
import torch
import logging
from typing import Dict, List, Tuple, Union, Callable, Optional, Any
import json
import time
import threading
import queue
import pandas as pd
from pathlib import Path
from datetime import datetime
import matplotlib.pyplot as plt
from scipy.interpolate import griddata

# 导入物理AI模块
from src.ai.physics_ai import PhysicsAI, PhysicsInformedNN, HeatEquationPINN, WaveEquationPINN, ElasticityPINN, PDEInverseAnalysis

# 配置日志
logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(logs_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(logs_dir, 'physics_group_updater.log'), mode='a', encoding='utf-8')
    ]
)
logger = logging.getLogger("PhysicsGroupUpdater")

class PhysicsModelGroup:
    """物理模型组类"""
    
    def __init__(
        self,
        name: str,
        models_dir: str = None,
        results_dir: str = None,
        max_models: int = 5
    ):
        """
        初始化物理模型组
        
        参数:
            name: 模型组名称
            models_dir: 模型保存目录
            results_dir: 结果保存目录
            max_models: 最大模型数量
        """
        self.name = name
        self.max_models = max_models
        self.models = {}  # 模型字典
        self.model_metadata = {}  # 模型元数据
        self.active_model_id = None  # 当前激活的模型ID
        
        # 设置模型保存目录
        if models_dir is None:
            self.models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                          "data", "models", name)
        else:
            self.models_dir = models_dir
        os.makedirs(self.models_dir, exist_ok=True)
        
        # 设置结果保存目录
        if results_dir is None:
            self.results_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                           "data", "results", name)
        else:
            self.results_dir = results_dir
        os.makedirs(self.results_dir, exist_ok=True)
        
        # 加载现有模型元数据
        self._load_metadata()
    
    def _load_metadata(self):
        """加载模型元数据"""
        metadata_path = os.path.join(self.models_dir, "metadata.json")
        
        if os.path.exists(metadata_path):
            try:
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                self.model_metadata = data.get("models", {})
                self.active_model_id = data.get("active_model_id")
                
                logger.info(f"已加载模型元数据，共有 {len(self.model_metadata)} 个模型")
            except Exception as e:
                logger.error(f"加载模型元数据失败: {str(e)}")
                self.model_metadata = {}
                self.active_model_id = None
    
    def _save_metadata(self):
        """保存模型元数据"""
        metadata_path = os.path.join(self.models_dir, "metadata.json")
        
        try:
            data = {
                "models": self.model_metadata,
                "active_model_id": self.active_model_id,
                "last_updated": time.time()
            }
            
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            
            logger.info(f"已保存模型元数据，共有 {len(self.model_metadata)} 个模型")
        except Exception as e:
            logger.error(f"保存模型元数据失败: {str(e)}")
    
    def add_model(self, model_id: str, model: Any, metadata: Dict[str, Any] = None) -> bool:
        """
        添加模型到组
        
        参数:
            model_id: 模型ID
            model: 模型对象
            metadata: 模型元数据
        
        返回:
            添加是否成功
        """
        # 检查是否已达到最大模型数量
        if len(self.models) >= self.max_models and model_id not in self.models:
            logger.warning(f"模型组 {self.name} 已达到最大模型数量 {self.max_models}")
            return False
        
        # 添加模型
        self.models[model_id] = model
        
        # 添加或更新元数据
        if model_id not in self.model_metadata:
            self.model_metadata[model_id] = {
                "created_at": time.time(),
                "updated_at": time.time(),
                "type": model.__class__.__name__,
                "performance": {}
            }
        else:
            self.model_metadata[model_id]["updated_at"] = time.time()
        
        # 更新元数据
        if metadata:
            self.model_metadata[model_id].update(metadata)
        
        # 如果没有激活的模型，则激活当前模型
        if self.active_model_id is None:
            self.active_model_id = model_id
        
        # 保存元数据
        self._save_metadata()
        
        logger.info(f"已添加模型 {model_id} 到模型组 {self.name}")
        return True
    
    def remove_model(self, model_id: str) -> bool:
        """
        从组中移除模型
        
        参数:
            model_id: 模型ID
        
        返回:
            移除是否成功
        """
        if model_id not in self.models:
            logger.warning(f"模型组 {self.name} 中不存在模型 {model_id}")
            return False
        
        # 移除模型
        del self.models[model_id]
        
        # 如果移除的是当前激活的模型，则激活另一个模型
        if model_id == self.active_model_id:
            if self.models:
                self.active_model_id = list(self.models.keys())[0]
            else:
                self.active_model_id = None
        
        # 保存元数据
        self._save_metadata()
        
        logger.info(f"已从模型组 {self.name} 中移除模型 {model_id}")
        return True
    
    def get_model(self, model_id: str = None) -> Any:
        """
        获取模型
        
        参数:
            model_id: 模型ID，如果为None则返回当前激活的模型
        
        返回:
            模型对象
        """
        if model_id is None:
            model_id = self.active_model_id
        
        if model_id not in self.models:
            logger.warning(f"模型组 {self.name} 中不存在模型 {model_id}")
            return None
        
        return self.models[model_id]
    
    def activate_model(self, model_id: str) -> bool:
        """
        激活模型
        
        参数:
            model_id: 模型ID
        
        返回:
            激活是否成功
        """
        if model_id not in self.models:
            logger.warning(f"模型组 {self.name} 中不存在模型 {model_id}")
            return False
        
        self.active_model_id = model_id
        
        # 保存元数据
        self._save_metadata()
        
        logger.info(f"已激活模型 {model_id}")
        return True
    
    def save_model(self, model_id: str = None, filename: str = None) -> bool:
        """
        保存模型
        
        参数:
            model_id: 模型ID，如果为None则保存当前激活的模型
            filename: 文件名，如果为None则使用模型ID
        
        返回:
            保存是否成功
        """
        if model_id is None:
            model_id = self.active_model_id
        
        if model_id not in self.models:
            logger.warning(f"模型组 {self.name} 中不存在模型 {model_id}")
            return False
        
        model = self.models[model_id]
        
        if filename is None:
            filename = f"{model_id}.pt"
        
        try:
            # 对于PINN模型，使用其自身的保存方法
            if isinstance(model, PhysicsInformedNN):
                model.save_model(filename)
            else:
                # 对于其他模型，使用PyTorch保存
                model_path = os.path.join(self.models_dir, filename)
                torch.save(model.state_dict(), model_path)
                logger.info(f"已保存模型 {model_id} 到 {model_path}")
            
            # 更新元数据
            self.model_metadata[model_id]["saved_at"] = time.time()
            self.model_metadata[model_id]["filename"] = filename
            
            # 保存元数据
            self._save_metadata()
            
            return True
        except Exception as e:
            logger.error(f"保存模型 {model_id} 失败: {str(e)}")
            return False
    
    def load_model(self, model_id: str, filename: str = None, model_class = None) -> bool:
        """
        加载模型
        
        参数:
            model_id: 模型ID
            filename: 文件名，如果为None则使用模型ID
            model_class: 模型类，如果为None则使用元数据中的类型
        
        返回:
            加载是否成功
        """
        if filename is None:
            if model_id in self.model_metadata and "filename" in self.model_metadata[model_id]:
                filename = self.model_metadata[model_id]["filename"]
            else:
                filename = f"{model_id}.pt"
        
        model_path = os.path.join(self.models_dir, filename)
        
        if not os.path.exists(model_path):
            logger.warning(f"模型文件 {model_path} 不存在")
            return False
        
        try:
            # 确定模型类
            if model_class is None and model_id in self.model_metadata:
                model_type = self.model_metadata[model_id].get("type")
                if model_type == "HeatEquationPINN":
                    model_class = HeatEquationPINN
                elif model_type == "WaveEquationPINN":
                    model_class = WaveEquationPINN
                elif model_type == "ElasticityPINN":
                    model_class = ElasticityPINN
            
            if model_class is None:
                logger.warning(f"无法确定模型 {model_id} 的类型")
                return False
            
            # 创建模型实例
            if issubclass(model_class, PhysicsInformedNN):
                # 对于PINN模型，需要先创建实例
                model_params = self.model_metadata[model_id].get("params", {})
                model = model_class(**model_params)
                model.load_model(filename)
            else:
                # 对于其他模型，直接加载状态字典
                model = model_class()
                model.load_state_dict(torch.load(model_path))
            
            # 添加到模型字典
            self.models[model_id] = model
            
            # 更新元数据
            if model_id not in self.model_metadata:
                self.model_metadata[model_id] = {
                    "created_at": time.time(),
                    "updated_at": time.time(),
                    "type": model.__class__.__name__,
                    "filename": filename
                }
            else:
                self.model_metadata[model_id]["updated_at"] = time.time()
                self.model_metadata[model_id]["loaded_at"] = time.time()
            
            # 保存元数据
            self._save_metadata()
            
            logger.info(f"已加载模型 {model_id} 从 {model_path}")
            return True
        except Exception as e:
            logger.error(f"加载模型 {model_id} 失败: {str(e)}")
            return False
    
    def update_model_performance(self, model_id: str, metrics: Dict[str, float]) -> bool:
        """
        更新模型性能指标
        
        参数:
            model_id: 模型ID
            metrics: 性能指标
        
        返回:
            更新是否成功
        """
        if model_id not in self.model_metadata:
            logger.warning(f"模型组 {self.name} 中不存在模型 {model_id} 的元数据")
            return False
        
        # 更新性能指标
        if "performance" not in self.model_metadata[model_id]:
            self.model_metadata[model_id]["performance"] = {}
        
        self.model_metadata[model_id]["performance"].update(metrics)
        self.model_metadata[model_id]["performance_updated_at"] = time.time()
        
        # 保存元数据
        self._save_metadata()
        
        logger.info(f"已更新模型 {model_id} 的性能指标")
        return True
    
    def get_best_model(self, metric: str = "mse", higher_is_better: bool = False) -> str:
        """
        获取性能最好的模型ID
        
        参数:
            metric: 性能指标名称
            higher_is_better: 是否越高越好
        
        返回:
            性能最好的模型ID
        """
        best_model_id = None
        best_score = float("-inf") if higher_is_better else float("inf")
        
        for model_id, metadata in self.model_metadata.items():
            if "performance" in metadata and metric in metadata["performance"]:
                score = metadata["performance"][metric]
                
                if higher_is_better:
                    if score > best_score:
                        best_score = score
                        best_model_id = model_id
                else:
                    if score < best_score:
                        best_score = score
                        best_model_id = model_id
        
        return best_model_id
    
    def list_models(self) -> List[Dict[str, Any]]:
        """
        列出所有模型及其元数据
        
        返回:
            模型列表
        """
        models_list = []
        
        for model_id, metadata in self.model_metadata.items():
            model_info = {
                "id": model_id,
                "active": model_id == self.active_model_id,
                "loaded": model_id in self.models,
                **metadata
            }
            models_list.append(model_info)
        
        return models_list


class PhysicsGroupUpdater:
    """物理模型组更新器"""
    
    def __init__(self, update_interval: int = 3600):
        """
        初始化物理模型组更新器
        
        参数:
            update_interval: 更新间隔（秒）
        """
        self.update_interval = update_interval
        self.model_groups = {}  # 模型组字典
        self.update_thread = None
        self.stop_event = threading.Event()
        self.update_queue = queue.Queue()
    
    def register_model_group(self, group_name: str, model_group: PhysicsModelGroup) -> bool:
        """
        注册模型组
        
        参数:
            group_name: 模型组名称
            model_group: 模型组对象
        
        返回:
            注册是否成功
        """
        if group_name in self.model_groups:
            logger.warning(f"模型组 {group_name} 已存在")
            return False
        
        self.model_groups[group_name] = model_group
        logger.info(f"已注册模型组 {group_name}")
        return True
    
    def unregister_model_group(self, group_name: str) -> bool:
        """
        注销模型组
        
        参数:
            group_name: 模型组名称
        
        返回:
            注销是否成功
        """
        if group_name not in self.model_groups:
            logger.warning(f"模型组 {group_name} 不存在")
            return False
        
        del self.model_groups[group_name]
        logger.info(f"已注销模型组 {group_name}")
        return True
    
    def get_model_group(self, group_name: str) -> PhysicsModelGroup:
        """
        获取模型组
        
        参数:
            group_name: 模型组名称
        
        返回:
            模型组对象
        """
        if group_name not in self.model_groups:
            logger.warning(f"模型组 {group_name} 不存在")
            return None
        
        return self.model_groups[group_name]
    
    def start_update_thread(self):
        """启动更新线程"""
        if self.update_thread is not None and self.update_thread.is_alive():
            logger.warning("更新线程已在运行")
            return
        
        self.stop_event.clear()
        self.update_thread = threading.Thread(target=self._update_loop)
        self.update_thread.daemon = True
        self.update_thread.start()
        
        logger.info("已启动更新线程")
    
    def stop_update_thread(self):
        """停止更新线程"""
        if self.update_thread is None or not self.update_thread.is_alive():
            logger.warning("更新线程未在运行")
            return
        
        self.stop_event.set()
        self.update_thread.join(timeout=5)
        
        logger.info("已停止更新线程")
    
    def _update_loop(self):
        """更新循环"""
        logger.info("更新线程已启动")
        
        while not self.stop_event.is_set():
            try:
                # 检查是否有待处理的更新任务
                try:
                    update_task = self.update_queue.get(block=False)
                    self._process_update_task(update_task)
                    self.update_queue.task_done()
                except queue.Empty:
                    pass
                
                # 定期更新所有模型组
                for group_name, model_group in self.model_groups.items():
                    try:
                        logger.info(f"正在更新模型组 {group_name}")
                        self._update_model_group(model_group)
                    except Exception as e:
                        logger.error(f"更新模型组 {group_name} 失败: {str(e)}")
                
                # 等待下一次更新
                for _ in range(self.update_interval):
                    if self.stop_event.is_set():
                        break
                    time.sleep(1)
            
            except Exception as e:
                logger.error(f"更新线程异常: {str(e)}")
                time.sleep(10)  # 出错后等待一段时间再继续
        
        logger.info("更新线程已停止")
    
    def _update_model_group(self, model_group: PhysicsModelGroup):
        """
        更新模型组
        
        参数:
            model_group: 模型组对象
        """
        # 保存所有已加载的模型
        for model_id in list(model_group.models.keys()):
            try:
                model_group.save_model(model_id)
            except Exception as e:
                logger.error(f"保存模型 {model_id} 失败: {str(e)}")
    
    def _process_update_task(self, task: Dict[str, Any]):
        """
        处理更新任务
        
        参数:
            task: 更新任务
        """
        task_type = task.get("type")
        group_name = task.get("group_name")
        
        if group_name not in self.model_groups:
            logger.warning(f"模型组 {group_name} 不存在，无法处理任务")
            return
        
        model_group = self.model_groups[group_name]
        
        if task_type == "save_model":
            model_id = task.get("model_id")
            filename = task.get("filename")
            model_group.save_model(model_id, filename)
        
        elif task_type == "load_model":
            model_id = task.get("model_id")
            filename = task.get("filename")
            model_class = task.get("model_class")
            model_group.load_model(model_id, filename, model_class)
        
        elif task_type == "update_performance":
            model_id = task.get("model_id")
            metrics = task.get("metrics", {})
            model_group.update_model_performance(model_id, metrics)
        
        elif task_type == "activate_best":
            metric = task.get("metric", "mse")
            higher_is_better = task.get("higher_is_better", False)
            best_model_id = model_group.get_best_model(metric, higher_is_better)
            if best_model_id:
                model_group.activate_model(best_model_id)
        
        else:
            logger.warning(f"未知的任务类型: {task_type}")
    
    def schedule_task(self, task: Dict[str, Any]):
        """
        调度更新任务
        
        参数:
            task: 更新任务
        """
        self.update_queue.put(task)
        logger.info(f"已调度任务: {task}")
    
    def save_all_models(self):
        """保存所有模型组中的所有模型"""
        for group_name, model_group in self.model_groups.items():
            for model_id in list(model_group.models.keys()):
                try:
                    model_group.save_model(model_id)
                except Exception as e:
                    logger.error(f"保存模型组 {group_name} 的模型 {model_id} 失败: {str(e)}")
        
        logger.info("已保存所有模型")


# 全局物理组更新器实例
global_physics_updater = PhysicsGroupUpdater()

# 示例用法
if __name__ == "__main__":
    # 创建物理模型组
    heat_model_group = PhysicsModelGroup("heat_equation")
    
    # 创建热传导方程PINN
    heat_pinn = HeatEquationPINN(
        domain_bounds=[(0, 1), (0, 1)],
        diffusivity=0.1,
        num_domain=400,
        num_boundary=80,
        num_initial=80,
        layers=[2, 20, 20, 20, 1],
        activation="tanh",
        iterations=5000
    )
    
    # 添加模型到组
    heat_model_group.add_model(
        "heat_model_1",
        heat_pinn,
        metadata={
            "description": "热传导方程PINN模型",
            "params": {
                "domain_bounds": [(0, 1), (0, 1)],
                "diffusivity": 0.1,
                "num_domain": 400,
                "num_boundary": 80,
                "num_initial": 80,
                "layers": [2, 20, 20, 20, 1],
                "activation": "tanh",
                "iterations": 5000
            }
        }
    )
    
    # 注册模型组到更新器
    global_physics_updater.register_model_group("heat_equation", heat_model_group)
    
    # 启动更新线程
    global_physics_updater.start_update_thread()
    
    # 等待一段时间
    time.sleep(10)
    
    # 停止更新线程
    global_physics_updater.stop_update_thread()
    
    # 保存所有模型
    global_physics_updater.save_all_models()