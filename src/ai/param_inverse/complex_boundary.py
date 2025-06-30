#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
复杂边界条件处理模块

该模块提供用于处理深基坑工程中复杂边界条件的功能，
包括混合边界、非线性边界和时变边界条件。

作者: Deep Excavation Team
版本: 1.0.0
"""

import os
import sys
import numpy as np
import logging
from enum import Enum, auto
from typing import Dict, List, Tuple, Union, Optional, Any, Callable
from pathlib import Path

# 配置日志
logger = logging.getLogger("ComplexBoundary")

class BoundaryType(Enum):
    """边界条件类型"""
    DIRICHLET = auto()        # 第一类边界条件（固定值）
    NEUMANN = auto()          # 第二类边界条件（固定梯度/流量）
    ROBIN = auto()            # 第三类边界条件（混合）
    CONTACT = auto()          # 接触边界条件
    SEEPAGE = auto()          # 渗流面边界条件
    INTERFACE = auto()        # 界面边界条件
    NONLINEAR = auto()        # 非线性边界条件
    TIME_DEPENDENT = auto()   # 时变边界条件
    COUPLED = auto()          # 耦合边界条件

class BoundaryCondition:
    """边界条件基类"""
    
    def __init__(
        self, 
        bc_id: str,
        bc_type: BoundaryType,
        entity_ids: List[int],
        dimension: int = 3,
        components: List[int] = None,
        enabled: bool = True
    ):
        """初始化边界条件
        
        参数:
            bc_id: 边界条件ID
            bc_type: 边界条件类型
            entity_ids: 应用边界条件的实体ID列表
            dimension: 空间维度
            components: 应用的分量，None表示所有分量
            enabled: 是否启用
        """
        self.bc_id = bc_id
        self.bc_type = bc_type
        self.entity_ids = entity_ids
        self.dimension = dimension
        self.components = components or list(range(dimension))
        self.enabled = enabled
        
        # 边界条件参数
        self.parameters = {}
        
        # 时间依赖性
        self.time_dependent = False
        self.time_function = None
        
        # 空间依赖性
        self.space_dependent = False
        self.space_function = None
        
        logger.debug(f"创建边界条件: {bc_id}, 类型: {bc_type.name}, 实体: {len(entity_ids)}")
    
    def set_value(self, value: Union[float, List[float], np.ndarray]) -> None:
        """设置边界条件值
        
        参数:
            value: 边界条件值
        """
        if isinstance(value, (int, float)):
            # 标量值，扩展到所有分量
            self.parameters["value"] = np.full(len(self.components), float(value))
        elif isinstance(value, (list, tuple, np.ndarray)):
            # 向量值，检查长度
            if len(value) != len(self.components):
                raise ValueError(f"值的长度 ({len(value)}) 与分量数 ({len(self.components)}) 不匹配")
            self.parameters["value"] = np.array(value, dtype=float)
        else:
            raise TypeError(f"不支持的值类型: {type(value)}")
            
        logger.debug(f"边界条件 {self.bc_id} 值设置为: {self.parameters['value']}")
    
    def set_time_function(self, time_function: Callable[[float], Union[float, np.ndarray]]) -> None:
        """设置时间函数
        
        参数:
            time_function: 时间函数，接收时间参数，返回边界值
        """
        self.time_dependent = True
        self.time_function = time_function
        logger.debug(f"边界条件 {self.bc_id} 设置为时变")
    
    def set_space_function(self, space_function: Callable[[np.ndarray], Union[float, np.ndarray]]) -> None:
        """设置空间函数
        
        参数:
            space_function: 空间函数，接收坐标参数，返回边界值
        """
        self.space_dependent = True
        self.space_function = space_function
        logger.debug(f"边界条件 {self.bc_id} 设置为空间变化")
    
    def evaluate(self, time: float = 0.0, coordinates: np.ndarray = None) -> np.ndarray:
        """评估边界条件值
        
        参数:
            time: 评估时间
            coordinates: 评估坐标
            
        返回:
            边界条件值
        """
        # 基本值
        if "value" not in self.parameters:
            raise ValueError(f"边界条件 {self.bc_id} 未设置值")
        
        value = self.parameters["value"].copy()
        
        # 应用时间函数
        if self.time_dependent and self.time_function is not None:
            time_factor = self.time_function(time)
            if isinstance(time_factor, (int, float)):
                value *= time_factor
            else:
                value = time_factor
        
        # 应用空间函数
        if self.space_dependent and self.space_function is not None and coordinates is not None:
            space_factor = self.space_function(coordinates)
            if isinstance(space_factor, (int, float)):
                value *= space_factor
            else:
                value = space_factor
        
        return value
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典表示
        
        返回:
            边界条件字典
        """
        return {
            "bc_id": self.bc_id,
            "bc_type": self.bc_type.name,
            "entity_ids": self.entity_ids,
            "dimension": self.dimension,
            "components": self.components,
            "enabled": self.enabled,
            "parameters": {k: v.tolist() if isinstance(v, np.ndarray) else v 
                          for k, v in self.parameters.items()},
            "time_dependent": self.time_dependent,
            "space_dependent": self.space_dependent
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'BoundaryCondition':
        """从字典创建边界条件
        
        参数:
            data: 边界条件字典
            
        返回:
            边界条件对象
        """
        bc_type = BoundaryType[data["bc_type"]] if isinstance(data["bc_type"], str) else data["bc_type"]
        
        bc = cls(
            bc_id=data["bc_id"],
            bc_type=bc_type,
            entity_ids=data["entity_ids"],
            dimension=data["dimension"],
            components=data["components"],
            enabled=data["enabled"]
        )
        
        # 恢复参数
        for k, v in data["parameters"].items():
            if isinstance(v, list):
                bc.parameters[k] = np.array(v)
            else:
                bc.parameters[k] = v
        
        # 恢复时间和空间依赖性标志
        bc.time_dependent = data.get("time_dependent", False)
        bc.space_dependent = data.get("space_dependent", False)
        
        return bc


class DirichletBC(BoundaryCondition):
    """第一类边界条件（固定值）"""
    
    def __init__(
        self, 
        bc_id: str,
        entity_ids: List[int],
        value: Union[float, List[float], np.ndarray],
        dimension: int = 3,
        components: List[int] = None,
        enabled: bool = True
    ):
        """初始化Dirichlet边界条件
        
        参数:
            bc_id: 边界条件ID
            entity_ids: 应用边界条件的实体ID列表
            value: 边界条件值
            dimension: 空间维度
            components: 应用的分量
            enabled: 是否启用
        """
        super().__init__(
            bc_id=bc_id,
            bc_type=BoundaryType.DIRICHLET,
            entity_ids=entity_ids,
            dimension=dimension,
            components=components,
            enabled=enabled
        )
        
        self.set_value(value)


class NeumannBC(BoundaryCondition):
    """第二类边界条件（固定梯度/流量）"""
    
    def __init__(
        self, 
        bc_id: str,
        entity_ids: List[int],
        value: Union[float, List[float], np.ndarray],
        dimension: int = 3,
        components: List[int] = None,
        enabled: bool = True
    ):
        """初始化Neumann边界条件
        
        参数:
            bc_id: 边界条件ID
            entity_ids: 应用边界条件的实体ID列表
            value: 边界条件值（梯度或流量）
            dimension: 空间维度
            components: 应用的分量
            enabled: 是否启用
        """
        super().__init__(
            bc_id=bc_id,
            bc_type=BoundaryType.NEUMANN,
            entity_ids=entity_ids,
            dimension=dimension,
            components=components,
            enabled=enabled
        )
        
        self.set_value(value)


class RobinBC(BoundaryCondition):
    """第三类边界条件（混合）"""
    
    def __init__(
        self, 
        bc_id: str,
        entity_ids: List[int],
        alpha: Union[float, List[float], np.ndarray],
        beta: Union[float, List[float], np.ndarray],
        dimension: int = 3,
        components: List[int] = None,
        enabled: bool = True
    ):
        """初始化Robin边界条件
        
        参数:
            bc_id: 边界条件ID
            entity_ids: 应用边界条件的实体ID列表
            alpha: alpha系数
            beta: beta系数
            dimension: 空间维度
            components: 应用的分量
            enabled: 是否启用
        """
        super().__init__(
            bc_id=bc_id,
            bc_type=BoundaryType.ROBIN,
            entity_ids=entity_ids,
            dimension=dimension,
            components=components,
            enabled=enabled
        )
        
        # 设置alpha系数
        if isinstance(alpha, (int, float)):
            self.parameters["alpha"] = np.full(len(self.components), float(alpha))
        elif isinstance(alpha, (list, tuple, np.ndarray)):
            if len(alpha) != len(self.components):
                raise ValueError(f"alpha长度 ({len(alpha)}) 与分量数 ({len(self.components)}) 不匹配")
            self.parameters["alpha"] = np.array(alpha, dtype=float)
        else:
            raise TypeError(f"不支持的alpha类型: {type(alpha)}")
        
        # 设置beta系数
        if isinstance(beta, (int, float)):
            self.parameters["beta"] = np.full(len(self.components), float(beta))
        elif isinstance(beta, (list, tuple, np.ndarray)):
            if len(beta) != len(self.components):
                raise ValueError(f"beta长度 ({len(beta)}) 与分量数 ({len(self.components)}) 不匹配")
            self.parameters["beta"] = np.array(beta, dtype=float)
        else:
            raise TypeError(f"不支持的beta类型: {type(beta)}")
            
        logger.debug(f"边界条件 {self.bc_id} alpha设置为: {self.parameters['alpha']}, "
                    f"beta设置为: {self.parameters['beta']}")


class SeepageBC(BoundaryCondition):
    """渗流面边界条件"""
    
    def __init__(
        self, 
        bc_id: str,
        entity_ids: List[int],
        pressure: float = 0.0,
        max_flux: float = None,
        enabled: bool = True
    ):
        """初始化渗流面边界条件
        
        参数:
            bc_id: 边界条件ID
            entity_ids: 应用边界条件的实体ID列表
            pressure: 大气压力（通常为0）
            max_flux: 最大流量（如果为None，则无限制）
            enabled: 是否启用
        """
        super().__init__(
            bc_id=bc_id,
            bc_type=BoundaryType.SEEPAGE,
            entity_ids=entity_ids,
            dimension=1,  # 标量问题
            components=[0],
            enabled=enabled
        )
        
        self.parameters["pressure"] = float(pressure)
        if max_flux is not None:
            self.parameters["max_flux"] = float(max_flux)
            
        logger.debug(f"渗流面边界条件 {self.bc_id} 创建，压力: {pressure}, 最大流量: {max_flux}")


class InterfaceBC(BoundaryCondition):
    """界面边界条件"""
    
    def __init__(
        self, 
        bc_id: str,
        master_entity_ids: List[int],
        slave_entity_ids: List[int],
        interface_type: str = "continuity",
        transfer_coefficient: float = 1.0,
        enabled: bool = True
    ):
        """初始化界面边界条件
        
        参数:
            bc_id: 边界条件ID
            master_entity_ids: 主实体ID列表
            slave_entity_ids: 从实体ID列表
            interface_type: 界面类型，可选"continuity"（连续）,"jump"（跳跃）,"transfer"（传递）
            transfer_coefficient: 传递系数
            enabled: 是否启用
        """
        super().__init__(
            bc_id=bc_id,
            bc_type=BoundaryType.INTERFACE,
            entity_ids=master_entity_ids,
            dimension=3,
            components=[0, 1, 2],
            enabled=enabled
        )
        
        self.parameters["slave_entity_ids"] = slave_entity_ids
        self.parameters["interface_type"] = interface_type
        self.parameters["transfer_coefficient"] = float(transfer_coefficient)
        
        logger.debug(f"界面边界条件 {self.bc_id} 创建，类型: {interface_type}, "
                    f"传递系数: {transfer_coefficient}")


class TimeDependentBC(BoundaryCondition):
    """时变边界条件"""
    
    def __init__(
        self, 
        bc_id: str,
        entity_ids: List[int],
        base_bc_type: BoundaryType,
        initial_value: Union[float, List[float], np.ndarray],
        time_function_type: str = "linear",
        time_function_params: Dict[str, Any] = None,
        dimension: int = 3,
        components: List[int] = None,
        enabled: bool = True
    ):
        """初始化时变边界条件
        
        参数:
            bc_id: 边界条件ID
            entity_ids: 应用边界条件的实体ID列表
            base_bc_type: 基础边界条件类型
            initial_value: 初始值
            time_function_type: 时间函数类型
            time_function_params: 时间函数参数
            dimension: 空间维度
            components: 应用的分量
            enabled: 是否启用
        """
        super().__init__(
            bc_id=bc_id,
            bc_type=BoundaryType.TIME_DEPENDENT,
            entity_ids=entity_ids,
            dimension=dimension,
            components=components,
            enabled=enabled
        )
        
        self.parameters["base_bc_type"] = base_bc_type.name
        self.set_value(initial_value)
        self.parameters["time_function_type"] = time_function_type
        self.parameters["time_function_params"] = time_function_params or {}
        
        # 根据函数类型创建时间函数
        self.time_dependent = True
        self._create_time_function()
        
        logger.debug(f"时变边界条件 {self.bc_id} 创建，基础类型: {base_bc_type.name}, "
                    f"函数类型: {time_function_type}")
    
    def _create_time_function(self) -> None:
        """创建时间函数"""
        time_type = self.parameters["time_function_type"]
        params = self.parameters["time_function_params"]
        
        if time_type == "linear":
            # 线性函数: value = initial_value + rate * t
            rate = params.get("rate", 0.0)
            
            def linear_function(t):
                return self.parameters["value"] + rate * t
            
            self.time_function = linear_function
            
        elif time_type == "exponential":
            # 指数函数: value = initial_value * exp(rate * t)
            rate = params.get("rate", 0.0)
            
            def exp_function(t):
                return self.parameters["value"] * np.exp(rate * t)
            
            self.time_function = exp_function
            
        elif time_type == "sinusoidal":
            # 正弦函数: value = initial_value + amplitude * sin(frequency * t + phase)
            amplitude = params.get("amplitude", 0.0)
            frequency = params.get("frequency", 1.0)
            phase = params.get("phase", 0.0)
            
            def sin_function(t):
                return self.parameters["value"] + amplitude * np.sin(frequency * t + phase)
            
            self.time_function = sin_function
            
        elif time_type == "stepwise":
            # 阶梯函数
            time_points = params.get("time_points", [])
            values = params.get("values", [])
            
            if len(time_points) != len(values):
                raise ValueError("时间点和值的数量不匹配")
                
            def step_function(t):
                # 找到小于t的最大时间点
                idx = 0
                while idx < len(time_points) and time_points[idx] <= t:
                    idx += 1
                
                if idx == 0:
                    return self.parameters["value"]
                else:
                    return values[idx-1]
            
            self.time_function = step_function
            
        elif time_type == "custom":
            # 自定义函数，需要外部设置
            logger.warning(f"边界条件 {self.bc_id} 使用自定义时间函数，请使用set_time_function设置")
            
        else:
            raise ValueError(f"不支持的时间函数类型: {time_type}")


class BoundaryManager:
    """边界条件管理器"""
    
    def __init__(self):
        """初始化边界条件管理器"""
        self.boundaries = {}
        logger.info("边界条件管理器初始化")
    
    def add_boundary(self, boundary: BoundaryCondition) -> None:
        """添加边界条件
        
        参数:
            boundary: 边界条件
        """
        if boundary.bc_id in self.boundaries:
            logger.warning(f"边界条件 {boundary.bc_id} 已存在，将被替换")
            
        self.boundaries[boundary.bc_id] = boundary
        logger.info(f"添加边界条件: {boundary.bc_id}, 类型: {boundary.bc_type.name}")
    
    def get_boundary(self, bc_id: str) -> Optional[BoundaryCondition]:
        """获取边界条件
        
        参数:
            bc_id: 边界条件ID
            
        返回:
            边界条件，如果不存在则返回None
        """
        return self.boundaries.get(bc_id)
    
    def remove_boundary(self, bc_id: str) -> bool:
        """移除边界条件
        
        参数:
            bc_id: 边界条件ID
            
        返回:
            是否成功移除
        """
        if bc_id in self.boundaries:
            del self.boundaries[bc_id]
            logger.info(f"移除边界条件: {bc_id}")
            return True
        else:
            logger.warning(f"边界条件 {bc_id} 不存在，无法移除")
            return False
    
    def get_boundaries_by_type(self, bc_type: BoundaryType) -> List[BoundaryCondition]:
        """获取指定类型的边界条件
        
        参数:
            bc_type: 边界条件类型
            
        返回:
            边界条件列表
        """
        return [bc for bc in self.boundaries.values() if bc.bc_type == bc_type and bc.enabled]
    
    def get_boundaries_by_entity(self, entity_id: int) -> List[BoundaryCondition]:
        """获取应用于指定实体的边界条件
        
        参数:
            entity_id: 实体ID
            
        返回:
            边界条件列表
        """
        return [bc for bc in self.boundaries.values() 
                if entity_id in bc.entity_ids and bc.enabled]
    
    def evaluate_all(self, time: float = 0.0, coordinates: Dict[int, np.ndarray] = None) -> Dict[str, Dict[int, np.ndarray]]:
        """评估所有边界条件
        
        参数:
            time: 评估时间
            coordinates: 评估坐标，字典 {entity_id: coordinates_array}
            
        返回:
            评估结果，字典 {bc_id: {entity_id: value_array}}
        """
        results = {}
        
        for bc_id, bc in self.boundaries.items():
            if not bc.enabled:
                continue
                
            entity_results = {}
            for entity_id in bc.entity_ids:
                coords = None
                if coordinates is not None and entity_id in coordinates:
                    coords = coordinates[entity_id]
                    
                value = bc.evaluate(time, coords)
                entity_results[entity_id] = value
                
            results[bc_id] = entity_results
            
        return results
    
    def to_dict(self) -> Dict[str, Dict[str, Any]]:
        """转换为字典表示
        
        返回:
            边界条件字典
        """
        return {bc_id: bc.to_dict() for bc_id, bc in self.boundaries.items()}
    
    def save_to_file(self, file_path: str) -> bool:
        """保存到文件
        
        参数:
            file_path: 文件路径
            
        返回:
            是否成功保存
        """
        try:
            import json
            
            data = self.to_dict()
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
                
            logger.info(f"边界条件保存到文件: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"保存边界条件失败: {str(e)}")
            return False
    
    @classmethod
    def load_from_file(cls, file_path: str) -> Optional['BoundaryManager']:
        """从文件加载
        
        参数:
            file_path: 文件路径
            
        返回:
            边界条件管理器，如果加载失败则返回None
        """
        try:
            import json
            
            with open(file_path, 'r') as f:
                data = json.load(f)
                
            manager = cls()
            
            for bc_id, bc_data in data.items():
                bc_type = BoundaryType[bc_data["bc_type"]]
                
                # 根据类型创建边界条件
                if bc_type == BoundaryType.DIRICHLET:
                    bc = DirichletBC.from_dict(bc_data)
                elif bc_type == BoundaryType.NEUMANN:
                    bc = NeumannBC.from_dict(bc_data)
                elif bc_type == BoundaryType.ROBIN:
                    bc = RobinBC.from_dict(bc_data)
                elif bc_type == BoundaryType.SEEPAGE:
                    bc = SeepageBC.from_dict(bc_data)
                elif bc_type == BoundaryType.INTERFACE:
                    bc = InterfaceBC.from_dict(bc_data)
                elif bc_type == BoundaryType.TIME_DEPENDENT:
                    bc = TimeDependentBC.from_dict(bc_data)
                else:
                    bc = BoundaryCondition.from_dict(bc_data)
                    
                manager.add_boundary(bc)
                
            logger.info(f"从文件加载边界条件: {file_path}, 加载了 {len(manager.boundaries)} 个边界条件")
            return manager
            
        except Exception as e:
            logger.error(f"加载边界条件失败: {str(e)}")
            return None