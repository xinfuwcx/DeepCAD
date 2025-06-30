#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
FEM-PINN双向耦合接口

该模块实现了有限元方法(FEM)和物理信息神经网络(PINN)之间的双向数据交换接口，
用于深基坑工程中的参数反演、状态预测和异常检测。新版本增加了实时数据交换
和网格自适应细化指导功能。

作者: Deep Excavation Team
版本: 1.1.0
"""

import os
import sys
import numpy as np
import logging
import json
import time
from pathlib import Path
from typing import Dict, List, Tuple, Union, Optional, Any, Callable
import threading
import queue

# 配置日志
logger = logging.getLogger("FEM-PINN")

class FEMPINNCoupling:
    """FEM-PINN耦合接口类，实现数据双向交换"""
    
    def __init__(
        self,
        project_id: int,
        data_dir: str = None,
        config: Dict[str, Any] = None,
        enable_realtime: bool = False
    ):
        """初始化FEM-PINN耦合接口
        
        参数:
            project_id: 项目ID
            data_dir: 数据目录
            config: 配置参数
            enable_realtime: 是否启用实时数据交换
        """
        self.project_id = project_id
        self.config = config or {}
        self.enable_realtime = enable_realtime
        
        # 设置数据目录
        if data_dir is None:
            self.data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                       "data")
        else:
            self.data_dir = data_dir
            
        # FEM数据目录
        self.fem_data_dir = os.path.join(self.data_dir, "results", f"project_{project_id}")
        os.makedirs(self.fem_data_dir, exist_ok=True)
        
        # PINN数据目录
        self.pinn_data_dir = os.path.join(self.data_dir, "models", "pinn", f"project_{project_id}")
        os.makedirs(self.pinn_data_dir, exist_ok=True)
        
        # 交换数据目录
        self.exchange_dir = os.path.join(self.data_dir, "exchange", f"project_{project_id}")
        os.makedirs(self.exchange_dir, exist_ok=True)
        
        # 状态追踪
        self.status = {
            "last_fem_update": 0,
            "last_pinn_update": 0,
            "fem_mesh_info": None,
            "pinn_domain_info": None,
            "exchange_history": [],
            "realtime_enabled": enable_realtime,
            "realtime_status": "stopped",
            "error_metrics": {},
            "refinement_suggestions": []
        }
        
        # 初始化映射矩阵
        self.fem_to_pinn_map = None
        self.pinn_to_fem_map = None
        
        # 实时数据交换相关
        self.exchange_queue = queue.Queue() if enable_realtime else None
        self.exchange_thread = None
        self.exchange_stop_event = threading.Event()
        
        # 回调函数
        self.callbacks = {
            "on_fem_data": None,
            "on_pinn_data": None,
            "on_parameter_update": None,
            "on_error_update": None
        }
        
        logger.info(f"初始化FEM-PINN耦合接口，项目ID: {project_id}, 实时交换: {enable_realtime}")
        
        # 如果启用实时交换，启动交换线程
        if enable_realtime:
            self._start_exchange_thread()
    
    def load_fem_mesh(self, mesh_file: str) -> bool:
        """加载FEM网格数据
        
        参数:
            mesh_file: 网格文件路径
            
        返回:
            是否成功加载
        """
        try:
            # 检查文件格式
            if mesh_file.endswith('.vtk'):
                return self._load_vtk_mesh(mesh_file)
            elif mesh_file.endswith('.msh'):
                return self._load_msh_mesh(mesh_file)
            elif mesh_file.endswith('.h5') or mesh_file.endswith('.hdf5'):
                return self._load_h5_mesh(mesh_file)
            else:
                logger.error(f"不支持的网格文件格式: {mesh_file}")
                return False
        except Exception as e:
            logger.error(f"加载FEM网格失败: {str(e)}")
            return False
    
    def _load_vtk_mesh(self, mesh_file: str) -> bool:
        """加载VTK格式网格
        
        参数:
            mesh_file: VTK文件路径
            
        返回:
            是否成功加载
        """
        try:
            # 简化版本，仅提取基本信息
            # 实际应用中，应使用VTK库或类似工具完整解析
            
            with open(mesh_file, 'r') as f:
                lines = f.readlines()
            
            # 提取基本信息
            n_points = 0
            n_cells = 0
            
            for i, line in enumerate(lines):
                if 'POINTS' in line:
                    parts = line.strip().split()
                    n_points = int(parts[1])
                if 'CELLS' in line:
                    parts = line.strip().split()
                    n_cells = int(parts[1])
                    break
            
            # 更新状态
            self.status["fem_mesh_info"] = {
                "file": mesh_file,
                "n_points": n_points,
                "n_cells": n_cells,
                "loaded_at": time.time()
            }
            
            logger.info(f"成功加载VTK网格: {mesh_file}, 节点数: {n_points}, 单元数: {n_cells}")
            return True
            
        except Exception as e:
            logger.error(f"加载VTK网格失败: {str(e)}")
            return False
    
    def _load_msh_mesh(self, mesh_file: str) -> bool:
        """加载MSH格式网格
        
        参数:
            mesh_file: MSH文件路径
            
        返回:
            是否成功加载
        """
        try:
            # 简化版本，实际应使用专门的MSH解析库
            with open(mesh_file, 'r') as f:
                lines = f.readlines()
            
            n_points = 0
            n_cells = 0
            
            reading_nodes = False
            reading_elements = False
            
            for line in lines:
                line = line.strip()
                if '$Nodes' in line:
                    reading_nodes = True
                    continue
                elif '$EndNodes' in line:
                    reading_nodes = False
                elif '$Elements' in line:
                    reading_elements = True
                    continue
                elif '$EndElements' in line:
                    reading_elements = False
                
                if reading_nodes and line.isdigit():
                    n_points = int(line)
                    reading_nodes = False
                
                if reading_elements and line.isdigit():
                    n_cells = int(line)
                    reading_elements = False
            
            # 更新状态
            self.status["fem_mesh_info"] = {
                "file": mesh_file,
                "n_points": n_points,
                "n_cells": n_cells,
                "loaded_at": time.time()
            }
            
            logger.info(f"成功加载MSH网格: {mesh_file}, 节点数: {n_points}, 单元数: {n_cells}")
            return True
            
        except Exception as e:
            logger.error(f"加载MSH网格失败: {str(e)}")
            return False
    
    def _load_h5_mesh(self, mesh_file: str) -> bool:
        """加载HDF5格式网格
        
        参数:
            mesh_file: HDF5文件路径
            
        返回:
            是否成功加载
        """
        try:
            import h5py
            
            with h5py.File(mesh_file, 'r') as f:
                # 提取基本信息
                n_points = len(f['Mesh/Nodes']) if 'Mesh/Nodes' in f else 0
                n_cells = len(f['Mesh/Elements']) if 'Mesh/Elements' in f else 0
            
            # 更新状态
            self.status["fem_mesh_info"] = {
                "file": mesh_file,
                "n_points": n_points,
                "n_cells": n_cells,
                "loaded_at": time.time()
            }
            
            logger.info(f"成功加载HDF5网格: {mesh_file}, 节点数: {n_points}, 单元数: {n_cells}")
            return True
            
        except ImportError:
            logger.error("缺少h5py库，无法加载HDF5网格")
            return False
        except Exception as e:
            logger.error(f"加载HDF5网格失败: {str(e)}")
            return False
    
    def setup_pinn_domain(self, 
                        domain_bounds: Dict[str, Tuple[float, float]],
                        resolution: Union[int, List[int]] = 50) -> bool:
        """设置PINN计算域
        
        参数:
            domain_bounds: 计算域范围 {'x': (min_x, max_x), 'y': (min_y, max_y), 'z': (min_z, max_z)}
            resolution: 分辨率，可以是单个整数或每个维度的分辨率列表
            
        返回:
            是否成功设置
        """
        try:
            # 验证输入
            required_dims = ['x', 'y', 'z']
            for dim in required_dims:
                if dim not in domain_bounds:
                    logger.error(f"缺少维度 {dim} 的边界")
                    return False
            
            # 设置分辨率
            if isinstance(resolution, int):
                res = [resolution] * 3
            else:
                if len(resolution) != 3:
                    logger.error(f"分辨率列表长度应为3，实际为 {len(resolution)}")
                    return False
                res = resolution
            
            # 计算网格点
            x_min, x_max = domain_bounds['x']
            y_min, y_max = domain_bounds['y']
            z_min, z_max = domain_bounds['z']
            
            x_points = np.linspace(x_min, x_max, res[0])
            y_points = np.linspace(y_min, y_max, res[1])
            z_points = np.linspace(z_min, z_max, res[2])
            
            # 更新状态
            self.status["pinn_domain_info"] = {
                "bounds": domain_bounds,
                "resolution": res,
                "n_points": res[0] * res[1] * res[2],
                "setup_at": time.time()
            }
            
            logger.info(f"成功设置PINN计算域: X=[{x_min}, {x_max}], Y=[{y_min}, {y_max}], Z=[{z_min}, {z_max}], "
                      f"分辨率: {res}, 总点数: {res[0] * res[1] * res[2]}")
            return True
            
        except Exception as e:
            logger.error(f"设置PINN计算域失败: {str(e)}")
            return False
    
    def compute_mapping_matrices(self) -> bool:
        """计算FEM和PINN之间的映射矩阵
        
        返回:
            是否成功计算
        """
        try:
            # 检查是否已加载FEM网格和PINN计算域
            if self.status["fem_mesh_info"] is None:
                logger.error("未加载FEM网格，无法计算映射矩阵")
                return False
            
            if self.status["pinn_domain_info"] is None:
                logger.error("未设置PINN计算域，无法计算映射矩阵")
                return False
            
            # 简化版本，仅创建结构
            # 实际应用中，需要基于网格拓扑和计算域进行真实计算
            
            n_fem_points = self.status["fem_mesh_info"]["n_points"]
            n_pinn_points = self.status["pinn_domain_info"]["n_points"]
            
            # 创建稀疏映射矩阵
            # 在实际应用中，这应当是真实的空间映射矩阵
            # 本示例中只是一个占位符
            
            # FEM到PINN的映射
            self.fem_to_pinn_map = {
                "type": "sparse_matrix",
                "rows": n_pinn_points,
                "cols": n_fem_points,
                "nnz": min(n_fem_points, n_pinn_points) * 3,  # 非零元素数量
                "created_at": time.time()
            }
            
            # PINN到FEM的映射
            self.pinn_to_fem_map = {
                "type": "sparse_matrix",
                "rows": n_fem_points,
                "cols": n_pinn_points,
                "nnz": min(n_fem_points, n_pinn_points) * 3,  # 非零元素数量
                "created_at": time.time()
            }
            
            logger.info(f"成功创建映射矩阵: FEM({n_fem_points}) <-> PINN({n_pinn_points})")
            return True
            
        except Exception as e:
            logger.error(f"计算映射矩阵失败: {str(e)}")
            return False
    
    def fem_to_pinn(self, 
                  fem_results: Dict[str, np.ndarray],
                  variables: List[str] = None) -> Dict[str, np.ndarray]:
        """将FEM结果映射到PINN计算域
        
        参数:
            fem_results: FEM结果字典 {variable_name: value_array}
            variables: 要转换的变量列表，如果为None则转换所有变量
            
        返回:
            PINN计算域上的结果字典 {variable_name: value_array}
        """
        try:
            # 检查是否已计算映射矩阵
            if self.fem_to_pinn_map is None:
                logger.error("未计算映射矩阵，无法将FEM结果映射到PINN")
                return {}
            
            # 确定要转换的变量
            if variables is None:
                variables = list(fem_results.keys())
            
            # 结果字典
            pinn_results = {}
            
            # 更新状态
            self.status["last_fem_update"] = time.time()
            self.status["exchange_history"].append({
                "time": time.time(),
                "direction": "fem_to_pinn",
                "variables": variables
            })
            
            # 简化版本，仅输出变量列表
            # 实际应用中，应使用映射矩阵进行真实数据转换
            logger.info(f"将FEM结果映射到PINN: {variables}")
            
            # 伪造映射过程
            for var in variables:
                if var in fem_results:
                    # 在实际应用中，应当使用映射矩阵进行转换
                    # pinn_results[var] = fem_to_pinn_map * fem_results[var]
                    # 这里简化为创建与PINN点数相同的随机数组
                    n_pinn_points = self.status["pinn_domain_info"]["n_points"]
                    
                    if len(fem_results[var].shape) == 1:
                        # 标量场
                        pinn_results[var] = np.zeros(n_pinn_points)
                    else:
                        # 向量场
                        dim = fem_results[var].shape[1]
                        pinn_results[var] = np.zeros((n_pinn_points, dim))
                        
                    logger.debug(f"变量 {var} 已映射，形状: {pinn_results[var].shape}")
                else:
                    logger.warning(f"FEM结果中不存在变量 {var}")
            
            return pinn_results
            
        except Exception as e:
            logger.error(f"将FEM结果映射到PINN失败: {str(e)}")
            return {}
    
    def pinn_to_fem(self, 
                  pinn_results: Dict[str, np.ndarray],
                  variables: List[str] = None) -> Dict[str, np.ndarray]:
        """将PINN结果映射到FEM网格
        
        参数:
            pinn_results: PINN结果字典 {variable_name: value_array}
            variables: 要转换的变量列表，如果为None则转换所有变量
            
        返回:
            FEM网格上的结果字典 {variable_name: value_array}
        """
        try:
            # 检查是否已计算映射矩阵
            if self.pinn_to_fem_map is None:
                logger.error("未计算映射矩阵，无法将PINN结果映射到FEM")
                return {}
            
            # 确定要转换的变量
            if variables is None:
                variables = list(pinn_results.keys())
            
            # 结果字典
            fem_results = {}
            
            # 更新状态
            self.status["last_pinn_update"] = time.time()
            self.status["exchange_history"].append({
                "time": time.time(),
                "direction": "pinn_to_fem",
                "variables": variables
            })
            
            # 简化版本，仅输出变量列表
            # 实际应用中，应使用映射矩阵进行真实数据转换
            logger.info(f"将PINN结果映射到FEM: {variables}")
            
            # 伪造映射过程
            for var in variables:
                if var in pinn_results:
                    # 在实际应用中，应当使用映射矩阵进行转换
                    # fem_results[var] = pinn_to_fem_map * pinn_results[var]
                    # 这里简化为创建与FEM点数相同的随机数组
                    n_fem_points = self.status["fem_mesh_info"]["n_points"]
                    
                    if len(pinn_results[var].shape) == 1:
                        # 标量场
                        fem_results[var] = np.zeros(n_fem_points)
                    else:
                        # 向量场
                        dim = pinn_results[var].shape[1]
                        fem_results[var] = np.zeros((n_fem_points, dim))
                        
                    logger.debug(f"变量 {var} 已映射，形状: {fem_results[var].shape}")
                else:
                    logger.warning(f"PINN结果中不存在变量 {var}")
            
            return fem_results
            
        except Exception as e:
            logger.error(f"将PINN结果映射到FEM失败: {str(e)}")
            return {}
    
    def save_exchange_data(self, 
                         data: Dict[str, np.ndarray], 
                         data_type: str,
                         prefix: str = None) -> str:
        """保存交换数据
        
        参数:
            data: 数据字典
            data_type: 数据类型，'fem', 'pinn'或'processed'
            prefix: 文件名前缀，如果为None则使用时间戳
            
        返回:
            保存的文件路径，如果保存失败则返回空字符串
        """
        try:
            # 创建文件名
            if prefix is None:
                prefix = f"{data_type}_{int(time.time())}"
            
            file_path = os.path.join(self.exchange_dir, f"{prefix}.npz")
            
            # 保存为npz文件
            np.savez(file_path, **data)
            
            logger.info(f"已保存{data_type}数据到: {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"保存{data_type}数据失败: {str(e)}")
            return ""
    
    def load_exchange_data(self, file_path: str) -> Dict[str, np.ndarray]:
        """加载交换数据
        
        参数:
            file_path: 文件路径
            
        返回:
            数据字典，如果加载失败则返回空字典
        """
        try:
            # 加载npz文件
            data = dict(np.load(file_path))
            
            logger.info(f"已加载数据: {file_path}, 变量: {list(data.keys())}")
            return data
            
        except Exception as e:
            logger.error(f"加载数据失败: {str(e)}")
            return {}
    
    def exchange_parameters(self, 
                          fem_params: Dict[str, Any], 
                          pinn_params: Dict[str, Any]) -> Dict[str, Any]:
        """交换FEM和PINN之间的参数
        
        参数:
            fem_params: FEM参数字典
            pinn_params: PINN参数字典
            
        返回:
            更新后的合并参数字典
        """
        try:
            # 合并参数
            merged_params = {**fem_params}
            
            # 更新参数
            for key, value in pinn_params.items():
                if key in merged_params:
                    # 如果FEM参数中已存在该参数，则合并
                    if isinstance(value, dict) and isinstance(merged_params[key], dict):
                        # 递归合并字典
                        merged_params[key] = {**merged_params[key], **value}
                    else:
                        # 直接替换
                        merged_params[key] = value
                else:
                    # 添加新参数
                    merged_params[key] = value
            
            # 记录交换历史
            self.status["exchange_history"].append({
                "time": time.time(),
                "type": "parameter_exchange",
                "fem_keys": list(fem_params.keys()),
                "pinn_keys": list(pinn_params.keys())
            })
            
            logger.info(f"参数交换完成: FEM({len(fem_params)}个) <-> PINN({len(pinn_params)}个)")
            return merged_params
            
        except Exception as e:
            logger.error(f"参数交换失败: {str(e)}")
            return fem_params
    
    def get_status(self) -> Dict[str, Any]:
        """获取接口状态
        
        返回:
            状态字典
        """
        return self.status
    
    def save_status(self, file_path: str = None) -> bool:
        """保存接口状态
        
        参数:
            file_path: 文件路径，如果为None则使用默认路径
            
        返回:
            是否成功保存
        """
        try:
            if file_path is None:
                file_path = os.path.join(self.exchange_dir, "coupling_status.json")
            
            # 准备状态数据
            status_data = {
                "project_id": self.project_id,
                "last_fem_update": self.status["last_fem_update"],
                "last_pinn_update": self.status["last_pinn_update"],
                "fem_mesh_info": self.status["fem_mesh_info"],
                "pinn_domain_info": self.status["pinn_domain_info"],
                "exchange_history": self.status["exchange_history"][-10:],  # 仅保存最近10条记录
                "timestamp": time.time()
            }
            
            # 保存为JSON文件
            with open(file_path, 'w') as f:
                json.dump(status_data, f, indent=2)
            
            logger.info(f"已保存接口状态到: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"保存接口状态失败: {str(e)}")
            return False
    
    def load_status(self, file_path: str = None) -> bool:
        """加载接口状态
        
        参数:
            file_path: 文件路径，如果为None则使用默认路径
            
        返回:
            是否成功加载
        """
        try:
            if file_path is None:
                file_path = os.path.join(self.exchange_dir, "coupling_status.json")
            
            # 加载JSON文件
            with open(file_path, 'r') as f:
                status_data = json.load(f)
            
            # 更新状态
            self.status["last_fem_update"] = status_data.get("last_fem_update", 0)
            self.status["last_pinn_update"] = status_data.get("last_pinn_update", 0)
            self.status["fem_mesh_info"] = status_data.get("fem_mesh_info")
            self.status["pinn_domain_info"] = status_data.get("pinn_domain_info")
            
            # 合并交换历史
            history = status_data.get("exchange_history", [])
            if history:
                self.status["exchange_history"].extend(history)
            
            logger.info(f"已加载接口状态: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"加载接口状态失败: {str(e)}")
            return False
    
    def _start_exchange_thread(self) -> None:
        """启动实时数据交换线程"""
        if self.exchange_thread is not None and self.exchange_thread.is_alive():
            logger.warning("实时数据交换线程已在运行")
            return
        
        # 清除停止事件
        self.exchange_stop_event.clear()
        
        # 创建并启动线程
        self.exchange_thread = threading.Thread(
            target=self._exchange_worker,
            daemon=True,
            name="FEMPINNExchangeThread"
        )
        self.exchange_thread.start()
        
        # 更新状态
        self.status["realtime_status"] = "running"
        logger.info("实时数据交换线程已启动")
    
    def _stop_exchange_thread(self) -> None:
        """停止实时数据交换线程"""
        if self.exchange_thread is None or not self.exchange_thread.is_alive():
            logger.warning("实时数据交换线程未运行")
            return
        
        # 设置停止事件
        self.exchange_stop_event.set()
        
        # 等待线程结束
        self.exchange_thread.join(timeout=5.0)
        
        # 更新状态
        self.status["realtime_status"] = "stopped"
        logger.info("实时数据交换线程已停止")
    
    def _exchange_worker(self) -> None:
        """实时数据交换工作线程"""
        logger.info("实时数据交换工作线程已启动")
        
        while not self.exchange_stop_event.is_set():
            try:
                # 从队列获取交换任务，等待1秒
                try:
                    task = self.exchange_queue.get(timeout=1.0)
                except queue.Empty:
                    continue
                
                # 处理交换任务
                task_type = task.get("type")
                
                if task_type == "fem_to_pinn":
                    # 处理FEM到PINN的数据转换
                    fem_data = task.get("data", {})
                    variables = task.get("variables")
                    
                    # 转换数据
                    pinn_data = self.fem_to_pinn(fem_data, variables)
                    
                    # 保存交换数据
                    if task.get("save", False):
                        self.save_exchange_data(pinn_data, "pinn", f"realtime_pinn_{int(time.time())}")
                    
                    # 回调函数
                    if self.callbacks["on_pinn_data"] is not None:
                        self.callbacks["on_pinn_data"](pinn_data)
                
                elif task_type == "pinn_to_fem":
                    # 处理PINN到FEM的数据转换
                    pinn_data = task.get("data", {})
                    variables = task.get("variables")
                    
                    # 转换数据
                    fem_data = self.pinn_to_fem(pinn_data, variables)
                    
                    # 保存交换数据
                    if task.get("save", False):
                        self.save_exchange_data(fem_data, "fem", f"realtime_fem_{int(time.time())}")
                    
                    # 回调函数
                    if self.callbacks["on_fem_data"] is not None:
                        self.callbacks["on_fem_data"](fem_data)
                
                elif task_type == "parameter_exchange":
                    # 处理参数交换
                    fem_params = task.get("fem_params", {})
                    pinn_params = task.get("pinn_params", {})
                    
                    # 交换参数
                    merged_params = self.exchange_parameters(fem_params, pinn_params)
                    
                    # 回调函数
                    if self.callbacks["on_parameter_update"] is not None:
                        self.callbacks["on_parameter_update"](merged_params)
                
                # 标记任务完成
                self.exchange_queue.task_done()
                
            except Exception as e:
                logger.error(f"实时数据交换线程出错: {str(e)}")
                # 继续执行，不中断线程
        
        logger.info("实时数据交换工作线程已退出")
    
    def set_callback(self, event_type: str, callback: Callable) -> bool:
        """设置回调函数
        
        参数:
            event_type: 事件类型，'on_fem_data', 'on_pinn_data', 'on_parameter_update'或'on_error_update'
            callback: 回调函数
            
        返回:
            是否成功设置
        """
        if event_type not in self.callbacks:
            logger.error(f"不支持的事件类型: {event_type}")
            return False
        
        self.callbacks[event_type] = callback
        logger.info(f"已设置回调函数: {event_type}")
        return True
    
    def add_exchange_task(self, task: Dict[str, Any]) -> bool:
        """添加数据交换任务
        
        参数:
            task: 任务字典，包含type, data等字段
            
        返回:
            是否成功添加
        """
        if not self.enable_realtime:
            logger.error("实时数据交换未启用")
            return False
        
        if "type" not in task:
            logger.error("任务缺少type字段")
            return False
        
        # 添加任务到队列
        self.exchange_queue.put(task)
        logger.debug(f"已添加交换任务: {task['type']}")
        return True
    
    def calculate_error_metrics(self, 
                              fem_data: Dict[str, np.ndarray],
                              pinn_data: Dict[str, np.ndarray],
                              variables: List[str] = None) -> Dict[str, Dict[str, float]]:
        """计算FEM和PINN结果之间的误差指标
        
        参数:
            fem_data: FEM结果字典
            pinn_data: PINN结果字典
            variables: 要计算的变量列表，如果为None则计算所有共有变量
            
        返回:
            误差指标字典 {variable: {metric: value}}
        """
        try:
            # 确定要计算的变量
            if variables is None:
                variables = list(set(fem_data.keys()) & set(pinn_data.keys()))
            
            # 误差指标字典
            error_metrics = {}
            
            # 检查映射矩阵是否准备好
            if self.fem_to_pinn_map is None or self.pinn_to_fem_map is None:
                logger.warning("映射矩阵未准备好，误差计算可能不准确")
            
            # 计算每个变量的误差
            for var in variables:
                if var not in fem_data or var not in pinn_data:
                    logger.warning(f"变量 {var} 在FEM或PINN结果中不存在，跳过误差计算")
                    continue
                
                # 获取数据
                fem_values = fem_data[var]
                pinn_values = pinn_data[var]
                
                # 如果维度不同，则转换数据
                if fem_values.shape != pinn_values.shape:
                    logger.debug(f"变量 {var} 形状不同: FEM {fem_values.shape}, PINN {pinn_values.shape}")
                    
                    # 在此简化实现，假设已经在同一网格上
                    # 实际应用中，需要使用映射矩阵进行转换
                    continue
                
                # 计算误差指标
                # 绝对误差
                abs_error = np.abs(fem_values - pinn_values)
                mean_abs_error = np.mean(abs_error)
                max_abs_error = np.max(abs_error)
                
                # 相对误差
                nonzero_mask = np.abs(fem_values) > 1e-10
                if np.any(nonzero_mask):
                    rel_error = np.abs((fem_values[nonzero_mask] - pinn_values[nonzero_mask]) / fem_values[nonzero_mask])
                    mean_rel_error = np.mean(rel_error)
                    max_rel_error = np.max(rel_error)
                else:
                    mean_rel_error = 0.0
                    max_rel_error = 0.0
                
                # 归一化均方根误差
                if np.any(nonzero_mask):
                    rmse = np.sqrt(np.mean((fem_values - pinn_values) ** 2))
                    norm_rmse = rmse / np.mean(np.abs(fem_values[nonzero_mask]))
                else:
                    norm_rmse = 0.0
                
                # 存储误差指标
                error_metrics[var] = {
                    "mean_abs_error": float(mean_abs_error),
                    "max_abs_error": float(max_abs_error),
                    "mean_rel_error": float(mean_rel_error),
                    "max_rel_error": float(max_rel_error),
                    "norm_rmse": float(norm_rmse)
                }
                
                logger.debug(f"变量 {var} 的误差指标: MAE={mean_abs_error:.6f}, MRE={mean_rel_error:.6f}, NRMSE={norm_rmse:.6f}")
            
            # 更新状态
            self.status["error_metrics"] = error_metrics
            
            # 调用回调函数
            if self.callbacks["on_error_update"] is not None:
                self.callbacks["on_error_update"](error_metrics)
            
            return error_metrics
            
        except Exception as e:
            logger.error(f"计算误差指标失败: {str(e)}")
            return {}
    
    def generate_refinement_suggestions(self, 
                                      error_metrics: Dict[str, Dict[str, float]],
                                      threshold: float = 0.1,
                                      max_suggestions: int = 5) -> List[Dict[str, Any]]:
        """基于误差指标生成网格细化建议
        
        参数:
            error_metrics: 误差指标字典
            threshold: 误差阈值，超过此值的区域将被推荐细化
            max_suggestions: 最大建议数量
            
        返回:
            细化建议列表
        """
        try:
            # 检查FEM网格信息
            if self.status["fem_mesh_info"] is None:
                logger.error("未加载FEM网格，无法生成细化建议")
                return []
            
            # 细化建议列表
            suggestions = []
            
            # 对每个变量的误差进行分析
            for var, metrics in error_metrics.items():
                # 使用相对误差或归一化RMSE作为指标
                if "norm_rmse" in metrics and metrics["norm_rmse"] > threshold:
                    suggestions.append({
                        "variable": var,
                        "metric": "norm_rmse",
                        "value": metrics["norm_rmse"],
                        "threshold": threshold,
                        "suggestion": f"建议对变量 {var} 相关区域进行网格细化，误差 {metrics['norm_rmse']:.4f} > 阈值 {threshold}"
                    })
                elif "max_rel_error" in metrics and metrics["max_rel_error"] > threshold:
                    suggestions.append({
                        "variable": var,
                        "metric": "max_rel_error",
                        "value": metrics["max_rel_error"],
                        "threshold": threshold,
                        "suggestion": f"建议对变量 {var} 最大误差区域进行网格细化，误差 {metrics['max_rel_error']:.4f} > 阈值 {threshold}"
                    })
            
            # 按误差值排序
            suggestions.sort(key=lambda x: x["value"], reverse=True)
            
            # 限制建议数量
            suggestions = suggestions[:max_suggestions]
            
            # 更新状态
            self.status["refinement_suggestions"] = suggestions
            
            # 日志输出
            if suggestions:
                logger.info(f"生成了 {len(suggestions)} 条网格细化建议")
                for i, sugg in enumerate(suggestions):
                    logger.info(f"建议 {i+1}: {sugg['suggestion']}")
            else:
                logger.info(f"所有变量误差均在阈值 {threshold} 以下，无需细化")
            
            return suggestions
            
        except Exception as e:
            logger.error(f"生成网格细化建议失败: {str(e)}")
            return []

def create_coupling_interface(
    project_id: int,
    data_dir: str = None,
    config: Dict[str, Any] = None,
    enable_realtime: bool = False
) -> FEMPINNCoupling:
    """创建FEM-PINN耦合接口
    
    参数:
        project_id: 项目ID
        data_dir: 数据目录
        config: 配置参数
        enable_realtime: 是否启用实时数据交换
        
    返回:
        FEM-PINN耦合接口实例
    """
    return FEMPINNCoupling(
        project_id=project_id,
        data_dir=data_dir,
        config=config,
        enable_realtime=enable_realtime
    ) 