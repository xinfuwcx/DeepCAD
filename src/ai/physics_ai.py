#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""物理约束的AI系统核心模块

本模块实现了物理约束的神经网络基类，用于深基坑工程中的参数反演、状态预测和异常检测。
结合物理规律和数据驱动的方法，提高AI模型的物理合理性和泛化能力。
"""

import os
import sys
import numpy as np
import logging
import json
from typing import Dict, List, Tuple, Union, Optional, Any
from pathlib import Path

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.autograd import grad
    from torch.utils.data import DataLoader, TensorDataset
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    print("Warning: PyTorch not available, Physics AI features will be limited")

# 配置日志
logger = logging.getLogger("PhysicsAI")

class PhysicsInformedNN:
    """物理约束的神经网络基类"""
    
    def __init__(self, 
                input_dim: int, 
                hidden_layers: List[int], 
                output_dim: int, 
                activation: str = "tanh",
                learning_rate: float = 0.001,
                physics_model=None):
        """初始化物理约束神经网络
        
        参数:
            input_dim: 输入维度
            hidden_layers: 隐藏层节点数列表
            output_dim: 输出维度
            activation: 激活函数类型，支持'tanh'、'relu'、'sigmoid'
            learning_rate: 学习率
            physics_model: 物理模型函数
        """
        self.input_dim = input_dim
        self.hidden_layers = hidden_layers
        self.output_dim = output_dim
        self.activation = activation
        self.learning_rate = learning_rate
        self.physics_model = physics_model
        
        if not HAS_TORCH:
            logger.warning("PyTorch not available, using dummy implementation")
            return
        
        # 创建神经网络
        layers = []
        # 输入层到第一个隐藏层
        layers.append(nn.Linear(input_dim, hidden_layers[0]))
        
        # 选择激活函数
        if activation == "tanh":
            act_func = nn.Tanh()
        elif activation == "relu":
            act_func = nn.ReLU()
        elif activation == "sigmoid":
            act_func = nn.Sigmoid()
        else:
            act_func = nn.Tanh()
            
        layers.append(act_func)
        
        # 隐藏层
        for i in range(len(hidden_layers)-1):
            layers.append(nn.Linear(hidden_layers[i], hidden_layers[i+1]))
            layers.append(act_func)
            
        # 输出层
        layers.append(nn.Linear(hidden_layers[-1], output_dim))
        
        self.network = nn.Sequential(*layers)
        
        # 初始化参数
        self._initialize_weights()
        
        # 优化器
        self.optimizer = optim.Adam(self.network.parameters(), lr=learning_rate)
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', factor=0.5, patience=100, 
            min_lr=1e-6, verbose=True
        )
        
        # 训练历史
        self.history = {
            "total_loss": [], 
            "data_loss": [], 
            "physics_loss": []
        }
    
    def _initialize_weights(self):
        """初始化网络权重"""
        if not HAS_TORCH:
            return
            
        for layer in self.network:
            if isinstance(layer, nn.Linear):
                nn.init.xavier_normal_(layer.weight)
                nn.init.zeros_(layer.bias)
    
    def forward(self, x):
        """前向传播"""
        if not HAS_TORCH:
            return np.zeros((len(x), self.output_dim))
            
        # 确保输入是张量
        if not isinstance(x, torch.Tensor):
            x = torch.tensor(x, dtype=torch.float32)
            
        return self.network(x)
    
    def compute_gradients(self, x, y):
        """计算梯度
        
        用于计算物理损失中的偏导数
        """
        if not HAS_TORCH:
            return None
            
        # 确保x需要梯度计算
        if not x.requires_grad:
            x.requires_grad = True
            
        # 前向传播
        y_pred = self.forward(x)
        
        # 创建单位张量作为梯度的基础
        grad_outputs = torch.ones_like(y_pred)
        
        # 计算一阶导数 dy/dx
        dy_dx = grad(outputs=y_pred, inputs=x, 
                    grad_outputs=grad_outputs, 
                    create_graph=True)[0]
                    
        return dy_dx
    
    def compute_laplacian(self, x, y):
        """计算拉普拉斯算子
        
        用于计算物理损失中的二阶导数
        """
        if not HAS_TORCH:
            return None
            
        # 计算一阶导数
        dy_dx = self.compute_gradients(x, y)
        
        # 计算二阶导数（拉普拉斯算子）
        laplacian = 0
        for i in range(x.shape[1]):
            # 对每个空间维度的二阶导数求和
            d2y_dx2i = grad(outputs=dy_dx[:, i], inputs=x,
                         grad_outputs=torch.ones_like(dy_dx[:, i]),
                         create_graph=True)[0][:, i]
            laplacian += d2y_dx2i
            
        return laplacian
    
    def physics_loss(self, x, y_pred):
        """计算物理损失"""
        if not self.physics_model or not HAS_TORCH:
            return torch.tensor(0.0)
        return self.physics_model(x, y_pred)
    
    def train_step(self, x, y_true=None, physics_weight=0.1):
        """训练步骤
        
        参数:
            x: 输入数据
            y_true: 真实值（可选，用于监督学习部分）
            physics_weight: 物理损失权重
        """
        if not HAS_TORCH:
            return {"data_loss": 0.0, "physics_loss": 0.0, "total_loss": 0.0}
        
        self.optimizer.zero_grad()
        
        # 确保是张量
        if not isinstance(x, torch.Tensor):
            x = torch.tensor(x, dtype=torch.float32)
        
        # 前向传播
        y_pred = self.forward(x)
        
        # 数据拟合损失
        if y_true is not None:
            if not isinstance(y_true, torch.Tensor):
                y_true = torch.tensor(y_true, dtype=torch.float32)
            data_loss = nn.MSELoss()(y_pred, y_true)
        else:
            data_loss = torch.tensor(0.0)
        
        # 物理损失
        physics_loss = self.physics_loss(x, y_pred)
        
        # 总损失
        total_loss = data_loss + physics_weight * physics_loss
        
        # 反向传播
        total_loss.backward()
        self.optimizer.step()
        
        # 更新学习率
        self.scheduler.step(total_loss)
        
        # 记录历史
        self.history["total_loss"].append(total_loss.item())
        self.history["data_loss"].append(data_loss.item())
        self.history["physics_loss"].append(
            physics_loss.item() if isinstance(physics_loss, torch.Tensor) else physics_loss
        )
        
        return {
            "data_loss": data_loss.item(),
            "physics_loss": physics_loss.item() if isinstance(physics_loss, torch.Tensor) else physics_loss,
            "total_loss": total_loss.item()
        }
    
    def train(self, x_train, y_train=None, epochs=1000, batch_size=None, 
             physics_weight=0.1, verbose=True, validation_data=None):
        """训练模型
        
        参数:
            x_train: 训练输入数据
            y_train: 训练目标数据（可选）
            epochs: 训练轮数
            batch_size: 批次大小（如果为None则使用全部数据）
            physics_weight: 物理损失权重
            verbose: 是否显示进度
            validation_data: 验证数据(x_val, y_val)
        
        返回:
            训练历史
        """
        if not HAS_TORCH:
            logger.warning("PyTorch not available, skipping training")
            return self.history
        
        # 转换为张量
        if not isinstance(x_train, torch.Tensor):
            x_train = torch.tensor(x_train, dtype=torch.float32)
        
        if y_train is not None and not isinstance(y_train, torch.Tensor):
            y_train = torch.tensor(y_train, dtype=torch.float32)
        
        # 创建数据集和数据加载器
        if y_train is not None:
            dataset = TensorDataset(x_train, y_train)
        else:
            dataset = TensorDataset(x_train)
        
        # 如果指定了批次大小，则使用DataLoader
        if batch_size:
            loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
        else:
            loader = [(x_train, y_train) if y_train is not None else (x_train,)]
        
        # 训练循环
        for epoch in range(epochs):
            epoch_loss = 0.0
            
            for batch in loader:
                if y_train is not None:
                    x_batch, y_batch = batch
                    loss_dict = self.train_step(x_batch, y_batch, physics_weight)
                else:
                    x_batch = batch[0]
                    loss_dict = self.train_step(x_batch, None, physics_weight)
                
                epoch_loss += loss_dict["total_loss"]
            
            # 验证
            if validation_data is not None:
                x_val, y_val = validation_data
                if not isinstance(x_val, torch.Tensor):
                    x_val = torch.tensor(x_val, dtype=torch.float32)
                if not isinstance(y_val, torch.Tensor):
                    y_val = torch.tensor(y_val, dtype=torch.float32)
                
                with torch.no_grad():
                    y_pred = self.forward(x_val)
                    val_loss = nn.MSELoss()(y_pred, y_val).item()
            else:
                val_loss = None
            
            # 显示进度
            if verbose and (epoch % 100 == 0 or epoch == epochs - 1):
                val_str = f", val_loss: {val_loss:.6f}" if val_loss is not None else ""
                logger.info(f"Epoch {epoch+1}/{epochs}, loss: {epoch_loss:.6f}{val_str}")
        
        return self.history
    
    def save_model(self, filepath):
        """保存模型"""
        if not HAS_TORCH:
            logger.warning("PyTorch not available, model not saved")
            return
            
        # 创建目录
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # 保存模型
        state = {
            "network_state": self.network.state_dict(),
            "optimizer_state": self.optimizer.state_dict(),
            "scheduler_state": self.scheduler.state_dict(),
            "history": self.history,
            "input_dim": self.input_dim,
            "hidden_layers": self.hidden_layers,
            "output_dim": self.output_dim,
            "activation": self.activation,
            "learning_rate": self.learning_rate
        }
        torch.save(state, filepath)
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath):
        """加载模型"""
        if not HAS_TORCH:
            logger.warning("PyTorch not available, model not loaded")
            return
            
        if not os.path.exists(filepath):
            logger.error(f"Model file not found: {filepath}")
            return
            
        # 加载模型
        state = torch.load(filepath)
        
        # 重建网络
        self.input_dim = state["input_dim"]
        self.hidden_layers = state["hidden_layers"]
        self.output_dim = state["output_dim"]
        self.activation = state["activation"]
        self.learning_rate = state["learning_rate"]
        
        # 加载权重
        self.network.load_state_dict(state["network_state"])
        self.optimizer.load_state_dict(state["optimizer_state"])
        self.scheduler.load_state_dict(state["scheduler_state"])
        self.history = state["history"]
        
        logger.info(f"Model loaded from {filepath}")

class HeatEquationPINN(PhysicsInformedNN):
    """热传导方程的物理约束神经网络"""
    
    def __init__(self, input_dim=2, hidden_dim=64, output_dim=1):
        super().__init__(input_dim, [hidden_dim], output_dim)
        self.alpha = 1.0  # 热扩散系数
    
    def physics_loss(self, x, t, u):
        """计算物理损失（热传导方程）"""
        if not HAS_TORCH:
            return np.array(0.0)
        return torch.tensor(0.0)  # 简化实现

class WaveEquationPINN(PhysicsInformedNN):
    """波动方程的物理约束神经网络"""
    
    def __init__(self, input_dim=2, hidden_dim=64, output_dim=1):
        super().__init__(input_dim, [hidden_dim], output_dim)
        self.c = 1.0  # 波速
    
    def physics_loss(self, x, t, u):
        """计算物理损失（波动方程）"""
        if not HAS_TORCH:
            return np.array(0.0)
        return torch.tensor(0.0)  # 简化实现

class ElasticityPINN(PhysicsInformedNN):
    """弹性力学的物理约束神经网络"""
    
    def __init__(self, input_dim=2, hidden_dim=64, output_dim=2):
        super().__init__(input_dim, [hidden_dim], output_dim)
        self.E = 200e9  # 弹性模量
        self.nu = 0.3   # 泊松比
    
    def physics_loss(self, x, y, u, v):
        """计算物理损失（弹性力学方程）"""
        if not HAS_TORCH:
            return np.array(0.0)
        return torch.tensor(0.0)  # 简化实现

class FluidStructurePINN(PhysicsInformedNN):
    """流固耦合的物理约束神经网络
    
    用于模拟深基坑中的渗流-结构耦合问题
    """
    
    def __init__(self, 
                input_dim=3, 
                hidden_layers=[20, 20, 20], 
                output_dim=4,
                soil_params=None,
                fluid_params=None,
                activation="tanh"):
        """初始化流固耦合PINN
        
        参数:
            input_dim: 输入维度 (x,y,t)
            hidden_layers: 隐藏层节点数列表
            output_dim: 输出维度 (u,v,w,p) 位移和孔压
            soil_params: 土体参数字典
            fluid_params: 流体参数字典
            activation: 激活函数类型
        """
        super().__init__(input_dim, hidden_layers, output_dim, activation)
        
        # 默认土体参数
        self.soil_params = soil_params or {
            "E": 1e7,           # 弹性模量 (Pa)
            "nu": 0.3,          # 泊松比
            "rho_s": 1800.0,    # 土体密度 (kg/m^3)
            "phi": 30.0,        # 内摩擦角 (度)
            "c": 10000.0,       # 黏聚力 (Pa)
            "k": 1e-8           # 渗透系数 (m/s)
        }
        
        # 默认流体参数
        self.fluid_params = fluid_params or {
            "rho_f": 1000.0,    # 水密度 (kg/m^3)
            "mu": 1e-3,         # 动力粘度 (Pa·s)
            "K_f": 2.2e9        # 水的体积模量 (Pa)
        }
        
        # 计算拉梅常数
        E = self.soil_params["E"]
        nu = self.soil_params["nu"]
        self.lambda_s = E * nu / ((1 + nu) * (1 - 2 * nu))  # 拉梅第一常数
        self.mu_s = E / (2 * (1 + nu))                      # 拉梅第二常数(剪切模量)
    
    def physics_loss(self, x, y_pred):
        """计算流固耦合物理损失
        
        参数:
            x: 输入张量 (batch_size, 3) - (x,y,t)
            y_pred: 预测张量 (batch_size, 4) - (u,v,w,p)
            
        返回:
            物理损失值
        """
        if not HAS_TORCH:
            return np.array(0.0)
        
        # 从预测中分离位移和孔压
        u = y_pred[:, 0:1]  # x方向位移
        v = y_pred[:, 1:2]  # y方向位移
        w = y_pred[:, 2:3]  # z方向位移
        p = y_pred[:, 3:4]  # 孔隙水压力
        
        # 计算位移梯度
        # 这里简化为一维梯度计算，完整实现需要计算应变张量
        if x.requires_grad:
            # 简化的应变计算
            grad_u = self.compute_gradients(x, u)
            grad_v = self.compute_gradients(x, v)
            grad_w = self.compute_gradients(x, w)
            grad_p = self.compute_gradients(x, p)
            
            # 简化的平衡方程损失 (力的平衡)
            balance_loss = torch.mean(torch.abs(grad_u[:, 0] + grad_v[:, 1] + grad_w[:, 2]))
            
            # 简化的渗流方程损失 (达西定律)
            seepage_loss = torch.mean(torch.abs(grad_p[:, 0] + grad_p[:, 1] + grad_p[:, 2]))
            
            # 总物理损失
            physics_loss = balance_loss + seepage_loss
            
            return physics_loss
        else:
            return torch.tensor(0.0)

class SoilParameterPINN(PhysicsInformedNN):
    """土体参数识别的物理约束神经网络"""
    
    def __init__(self, 
                input_dim=2, 
                hidden_layers=[20, 20, 20], 
                output_dim=1,
                activation="tanh"):
        """初始化土体参数识别PINN
        
        用于识别土体参数如弹性模量、强度参数等
        """
        super().__init__(input_dim, hidden_layers, output_dim, activation)
        
        # 土体参数的先验估计及其范围
        self.param_bounds = {
            "E": (1e6, 1e8),     # 弹性模量范围 (Pa)
            "nu": (0.2, 0.45),   # 泊松比范围
            "c": (5e3, 1e5),     # 黏聚力范围 (Pa)
            "phi": (20, 40)      # 内摩擦角范围 (度)
        }
        
        # 参数的当前估计值
        self.current_params = {
            "E": 3e7,     # 弹性模量 (Pa)
            "nu": 0.3,    # 泊松比
            "c": 2e4,     # 黏聚力 (Pa)
            "phi": 30     # 内摩擦角 (度)
        }
        
        # 创建参数张量，需要梯度
        if HAS_TORCH:
            self.param_tensors = {}
            for param, value in self.current_params.items():
                self.param_tensors[param] = nn.Parameter(torch.tensor([value], dtype=torch.float32))
                
            # 注册参数
            for param_name, param_tensor in self.param_tensors.items():
                self.register_parameter(param_name, param_tensor)
    
    def get_params(self):
        """获取当前参数估计值"""
        if not HAS_TORCH:
            return self.current_params
            
        params = {}
        for param, tensor in self.param_tensors.items():
            params[param] = tensor.item()
        return params
    
    def set_params(self, params):
        """设置参数估计值"""
        if not HAS_TORCH:
            self.current_params.update(params)
            return
            
        for param, value in params.items():
            if param in self.param_tensors:
                with torch.no_grad():
                    self.param_tensors[param].copy_(torch.tensor([value], dtype=torch.float32))
    
    def clamp_params(self):
        """确保参数在有效范围内"""
        if not HAS_TORCH:
            return
            
        with torch.no_grad():
            for param, tensor in self.param_tensors.items():
                if param in self.param_bounds:
                    lower, upper = self.param_bounds[param]
                    tensor.clamp_(lower, upper)
    
    def physics_loss(self, x, y_pred):
        """计算基于当前参数的物理损失"""
        if not HAS_TORCH:
            return np.array(0.0)
            
        # 从参数中获取物理属性
        E = self.param_tensors["E"]  
        nu = self.param_tensors["nu"]
        
        # 计算拉梅常数
        lambda_s = E * nu / ((1 + nu) * (1 - 2 * nu))
        mu_s = E / (2 * (1 + nu))
        
        # 简化的弹性力学方程损失
        # 完整实现应包括应力-应变关系和平衡方程
        
        # 这里使用简化的胡克定律检验
        grad_u = self.compute_gradients(x, y_pred)
        div_u = grad_u[:, 0] + grad_u[:, 1]  # 简化的散度
        
        # 胡克定律下的体应变与孔压关系
        hookean_loss = torch.mean(torch.square(lambda_s * div_u - y_pred[:, -1]))
        
        return hookean_loss
    
    def train_step(self, x, y_true, physics_weight=0.1, param_reg_weight=0.01):
        """训练步骤，包括参数学习
        
        参数:
            x: 输入数据
            y_true: 真实值（传感器数据）
            physics_weight: 物理损失权重
            param_reg_weight: 参数正则化权重
        """
        if not HAS_TORCH:
            return {"data_loss": 0.0, "physics_loss": 0.0, "param_loss": 0.0, "total_loss": 0.0}
        
        self.optimizer.zero_grad()
        
        # 确保是张量
        if not isinstance(x, torch.Tensor):
            x = torch.tensor(x, dtype=torch.float32)
        if not isinstance(y_true, torch.Tensor):
            y_true = torch.tensor(y_true, dtype=torch.float32)
        
        # 前向传播
        y_pred = self.forward(x)
        
        # 数据拟合损失
        data_loss = nn.MSELoss()(y_pred, y_true)
        
        # 物理损失
        physics_loss = self.physics_loss(x, y_pred)
        
        # 参数正则化损失
        param_loss = 0.0
        for param_name, param_tensor in self.param_tensors.items():
            # 如果参数超出范围，添加惩罚
            if param_name in self.param_bounds:
                lower, upper = self.param_bounds[param_name]
                param_loss += torch.sum(torch.relu(lower - param_tensor) + torch.relu(param_tensor - upper))
        
        # 总损失
        total_loss = data_loss + physics_weight * physics_loss + param_reg_weight * param_loss
        
        # 反向传播
        total_loss.backward()
        self.optimizer.step()
        
        # 确保参数在有效范围内
        self.clamp_params()
        
        return {
            "data_loss": data_loss.item(),
            "physics_loss": physics_loss.item(),
            "param_loss": param_loss.item(),
            "total_loss": total_loss.item(),
            "params": self.get_params()
        }

class PDEInverseAnalysis:
    """偏微分方程反演分析"""
    
    def __init__(self, equation_type="elasticity", config=None):
        """初始化PDE反演分析器
        
        参数:
            equation_type: 方程类型 (elasticity, fluid_structure, soil_param)
            config: 配置参数
        """
        self.equation_type = equation_type
        self.config = config or {}
        self.pinn = None
        self.results = None
        
        # 创建合适的PINN模型
        self._create_pinn()
    
    def _create_pinn(self):
        """创建PINN模型"""
        # 提取配置
        input_dim = self.config.get("input_dim", 3)
        hidden_layers = self.config.get("hidden_layers", [20, 20, 20, 20])
        output_dim = self.config.get("output_dim", 1)
        activation = self.config.get("activation", "tanh")
        
        # 根据方程类型创建模型
        if self.equation_type == "elasticity":
            self.pinn = ElasticityPINN(input_dim, hidden_layers, output_dim)
        elif self.equation_type == "heat":
            self.pinn = HeatEquationPINN(input_dim, hidden_layers, output_dim)
        elif self.equation_type == "wave":
            self.pinn = WaveEquationPINN(input_dim, hidden_layers, output_dim)
        elif self.equation_type == "fluid_structure":
            self.pinn = FluidStructurePINN(
                input_dim, 
                hidden_layers, 
                output_dim,
                soil_params=self.config.get("soil_params"),
                fluid_params=self.config.get("fluid_params"),
                activation=activation
            )
        elif self.equation_type == "soil_param":
            self.pinn = SoilParameterPINN(
                input_dim,
                hidden_layers,
                output_dim,
                activation=activation
            )
            # 如果提供了初始参数估计，设置它们
            if "initial_params" in self.config:
                self.pinn.set_params(self.config["initial_params"])
        else:
            logger.warning(f"Unknown equation type: {self.equation_type}, using default PINN")
            self.pinn = PhysicsInformedNN(input_dim, hidden_layers[0], output_dim)
    
    def inverse_solve(self, sensor_data, domain_points=None, training_config=None):
        """反演求解
        
        参数:
            sensor_data: 传感器数据字典 
                {
                    "coordinates": array [[x,y,z],...], 
                    "values": array [[u,v,w,p],...]
                }
            domain_points: 用于物理损失的领域采样点
            training_config: 训练配置
        
        返回:
            反演结果字典
        """
        if not HAS_TORCH:
            logger.warning("PyTorch not available, using dummy results")
            dummy_params = self.config.get("initial_params", {"E": 3e7, "nu": 0.3})
            return {"status": "success", "parameters": dummy_params}
        
        # 默认训练配置
        default_config = {
            "epochs": 5000,
            "batch_size": None,
            "physics_weight": 0.1,
            "param_reg_weight": 0.01,
            "learning_rate": 0.001,
            "verbose": True
        }
        
        # 合并配置
        config = {**default_config, **(training_config or {})}
        
        # 准备传感器数据
        sensor_coords = torch.tensor(sensor_data["coordinates"], dtype=torch.float32)
        sensor_values = torch.tensor(sensor_data["values"], dtype=torch.float32)
        
        # 准备领域采样点（用于物理损失）
        if domain_points is not None:
            domain_coords = torch.tensor(domain_points, dtype=torch.float32, requires_grad=True)
        else:
            # 如果没有提供，使用传感器位置
            domain_coords = sensor_coords.clone().detach().requires_grad_(True)
        
        # 调整学习率
        if hasattr(self.pinn, "optimizer"):
            for param_group in self.pinn.optimizer.param_groups:
                param_group['lr'] = config["learning_rate"]
        
        # 训练模型
        logger.info(f"Starting inverse analysis training for {config['epochs']} epochs...")
        history = self.pinn.train(
            sensor_coords, 
            sensor_values, 
            epochs=config["epochs"],
            batch_size=config["batch_size"],
            physics_weight=config["physics_weight"],
            verbose=config["verbose"]
        )
        
        # 保存结果
        if self.equation_type == "soil_param":
            parameters = self.pinn.get_params()
            prediction = self.pinn.forward(sensor_coords).detach().numpy()
            
            self.results = {
                "status": "success",
                "parameters": parameters,
                "prediction": prediction,
                "history": {k: v for k, v in history.items()},
                "error": np.mean((prediction - sensor_values.numpy())**2)
            }
        else:
            # 对于非参数识别模型，返回模型预测
            prediction = self.pinn.forward(sensor_coords).detach().numpy()
            
            self.results = {
                "status": "success",
                "prediction": prediction,
                "history": {k: v for k, v in history.items()},
                "error": np.mean((prediction - sensor_values.numpy())**2)
            }
        
        return self.results
    
    def save_results(self, filepath):
        """保存反演结果"""
        if self.results is None:
            logger.warning("No results to save")
            return
        
        # 创建目录
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # 保存结果
        with open(filepath, 'w') as f:
            # 将numpy数组转换为列表以便JSON序列化
            results_copy = {}
            for k, v in self.results.items():
                if isinstance(v, np.ndarray):
                    results_copy[k] = v.tolist()
                elif isinstance(v, dict):
                    results_copy[k] = {}
                    for kk, vv in v.items():
                        if isinstance(vv, list) and isinstance(vv[0], np.ndarray):
                            results_copy[k][kk] = [arr.tolist() for arr in vv]
                        elif isinstance(vv, np.ndarray):
                            results_copy[k][kk] = vv.tolist()
                        else:
                            results_copy[k][kk] = vv
                else:
                    results_copy[k] = v
            
            json.dump(results_copy, f, indent=2)
        
        # 如果有PINN模型，保存模型
        if hasattr(self, "pinn") and hasattr(self.pinn, "save_model"):
            model_path = filepath.replace(".json", "_model.pt")
            self.pinn.save_model(model_path)
        
        logger.info(f"Results saved to {filepath}")
    
    def load_results(self, filepath):
        """加载反演结果"""
        if not os.path.exists(filepath):
            logger.error(f"Results file not found: {filepath}")
            return False
        
        try:
            with open(filepath, 'r') as f:
                self.results = json.load(f)
                
            # 如果有PINN模型，尝试加载模型
            model_path = filepath.replace(".json", "_model.pt")
            if os.path.exists(model_path) and hasattr(self, "pinn") and hasattr(self.pinn, "load_model"):
                self.pinn.load_model(model_path)
            
            logger.info(f"Results loaded from {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to load results: {e}")
            return False
    
    def get_results(self):
        """获取反演结果"""
        return self.results
