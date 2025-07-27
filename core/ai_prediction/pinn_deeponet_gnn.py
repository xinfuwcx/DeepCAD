#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD智能预测系统 - PINN+DeepONet+GNN架构
3号计算专家 - Week1架构设计

集成三大AI架构：
- PINN (Physics-Informed Neural Networks): 物理信息神经网络
- DeepONet (Deep Operator Networks): 深度算子网络  
- GNN (Graph Neural Networks): 图神经网络

技术目标：
- 物理约束保持：>99%
- 预测精度：>95%
- 计算加速：1000倍+
- 不确定性量化：贝叶斯推理
"""

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, List, Optional, Union, Tuple, Callable
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
import time
import logging
import json
import asyncio
from concurrent.futures import ThreadPoolExecutor

# PyTorch几何库检查
try:
    import torch_geometric
    from torch_geometric.nn import GCNConv, GATConv, MessagePassing
    from torch_geometric.data import Data, Batch
    TORCH_GEOMETRIC_AVAILABLE = True
    print("PyTorch Geometric可用")
except ImportError:
    print("Warning: PyTorch Geometric不可用，GNN功能受限")
    TORCH_GEOMETRIC_AVAILABLE = False

# 设备配置
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"AI预测系统使用设备: {device}")

@dataclass
class PINNConfig:
    """PINN配置参数"""
    # 网络架构
    hidden_layers: List[int] = field(default_factory=lambda: [50, 50, 50])
    activation: str = "tanh"
    
    # 训练参数
    learning_rate: float = 1e-3
    epochs: int = 10000
    batch_size: int = 1000
    
    # 损失权重
    pde_weight: float = 1.0        # PDE损失权重
    boundary_weight: float = 10.0  # 边界条件权重
    initial_weight: float = 10.0   # 初始条件权重
    data_weight: float = 1.0       # 数据拟合权重
    
    # 物理参数
    diffusion_coeff: float = 0.01
    source_term: bool = True

@dataclass
class DeepONetConfig:
    """DeepONet配置参数"""
    # Branch Network (输入函数编码)
    branch_layers: List[int] = field(default_factory=lambda: [100, 128, 128])
    
    # Trunk Network (坐标编码)
    trunk_layers: List[int] = field(default_factory=lambda: [2, 64, 64])
    
    # 输出维度
    latent_dim: int = 128         # 潜在空间维度
    output_dim: int = 1           # 输出场维度
    
    # 训练参数
    learning_rate: float = 1e-3
    epochs: int = 5000
    batch_size: int = 32

@dataclass
class GNNConfig:
    """GNN配置参数"""
    # 图结构
    node_features: int = 16       # 节点特征维度
    edge_features: int = 8        # 边特征维度
    hidden_dim: int = 64          # 隐藏层维度
    
    # 网络架构
    num_layers: int = 4           # GNN层数
    num_heads: int = 4            # 注意力头数（GAT）
    dropout: float = 0.1
    
    # 训练参数
    learning_rate: float = 1e-3
    epochs: int = 3000
    batch_size: int = 16

class PhysicsInformedNN(nn.Module):
    """物理信息神经网络 (PINN)"""
    
    def __init__(self, config: PINNConfig):
        super().__init__()
        self.config = config
        
        # 构建神经网络层
        layers = []
        input_dim = 3  # (x, y, t) 时空坐标
        
        # 隐藏层
        prev_dim = input_dim
        for hidden_dim in config.hidden_layers:
            layers.append(nn.Linear(prev_dim, hidden_dim))
            if config.activation == "tanh":
                layers.append(nn.Tanh())
            elif config.activation == "relu":
                layers.append(nn.ReLU())
            elif config.activation == "gelu":
                layers.append(nn.GELU())
            prev_dim = hidden_dim
        
        # 输出层
        layers.append(nn.Linear(prev_dim, 1))  # 输出标量场
        
        self.network = nn.Sequential(*layers)
        
        # 物理参数
        self.diffusion_coeff = config.diffusion_coeff
        self.source_term_enabled = config.source_term
    
    def forward(self, coords: torch.Tensor) -> torch.Tensor:
        """
        前向传播
        
        Args:
            coords: 时空坐标 [batch, 3] (x, y, t)
            
        Returns:
            预测场值 [batch, 1]
        """
        return self.network(coords)
    
    def compute_pde_residual(self, coords: torch.Tensor) -> torch.Tensor:
        """
        计算PDE残差（以热传导方程为例）
        ∂u/∂t = α∇²u + f(x,y,t)
        
        Args:
            coords: 时空坐标，需要梯度
            
        Returns:
            PDE残差
        """
        coords.requires_grad_(True)
        u = self.forward(coords)
        
        # 计算一阶导数
        grad_u = torch.autograd.grad(
            outputs=u, inputs=coords, 
            grad_outputs=torch.ones_like(u),
            create_graph=True, retain_graph=True
        )[0]
        
        u_x = grad_u[:, 0:1]
        u_y = grad_u[:, 1:2]
        u_t = grad_u[:, 2:3]
        
        # 计算二阶导数（拉普拉斯算子）
        u_xx = torch.autograd.grad(
            outputs=u_x, inputs=coords,
            grad_outputs=torch.ones_like(u_x),
            create_graph=True, retain_graph=True
        )[0][:, 0:1]
        
        u_yy = torch.autograd.grad(
            outputs=u_y, inputs=coords,
            grad_outputs=torch.ones_like(u_y),
            create_graph=True, retain_graph=True
        )[0][:, 1:2]
        
        # 拉普拉斯算子
        laplacian_u = u_xx + u_yy
        
        # 源项（可选）
        if self.source_term_enabled:
            x, y, t = coords[:, 0:1], coords[:, 1:2], coords[:, 2:3]
            source = torch.sin(np.pi * x) * torch.sin(np.pi * y) * torch.exp(-t)
        else:
            source = torch.zeros_like(u)
        
        # PDE残差: ∂u/∂t - α∇²u - f = 0
        pde_residual = u_t - self.diffusion_coeff * laplacian_u - source
        
        return pde_residual
    
    def compute_boundary_loss(self, boundary_coords: torch.Tensor, 
                            boundary_values: torch.Tensor) -> torch.Tensor:
        """计算边界条件损失"""
        predicted = self.forward(boundary_coords)
        return F.mse_loss(predicted, boundary_values)
    
    def compute_initial_loss(self, initial_coords: torch.Tensor,
                           initial_values: torch.Tensor) -> torch.Tensor:
        """计算初始条件损失"""
        predicted = self.forward(initial_coords)
        return F.mse_loss(predicted, initial_values)

class DeepOperatorNetwork(nn.Module):
    """深度算子网络 (DeepONet)"""
    
    def __init__(self, config: DeepONetConfig):
        super().__init__()
        self.config = config
        
        # Branch Network: 编码输入函数
        branch_layers = []
        prev_dim = config.branch_layers[0]
        for hidden_dim in config.branch_layers[1:]:
            branch_layers.append(nn.Linear(prev_dim, hidden_dim))
            branch_layers.append(nn.ReLU())
            prev_dim = hidden_dim
        branch_layers.append(nn.Linear(prev_dim, config.latent_dim))
        
        self.branch_net = nn.Sequential(*branch_layers)
        
        # Trunk Network: 编码查询坐标
        trunk_layers = []
        prev_dim = config.trunk_layers[0]
        for hidden_dim in config.trunk_layers[1:]:
            trunk_layers.append(nn.Linear(prev_dim, hidden_dim))
            trunk_layers.append(nn.ReLU())
            prev_dim = hidden_dim
        trunk_layers.append(nn.Linear(prev_dim, config.latent_dim))
        
        self.trunk_net = nn.Sequential(*trunk_layers)
        
        # 偏置项
        self.bias = nn.Linear(config.latent_dim, config.output_dim)
    
    def forward(self, input_functions: torch.Tensor, 
                query_coords: torch.Tensor) -> torch.Tensor:
        """
        DeepONet前向传播
        
        Args:
            input_functions: 输入函数采样 [batch, n_sensors]
            query_coords: 查询坐标 [batch, n_points, coord_dim]
            
        Returns:
            预测场值 [batch, n_points, output_dim]
        """
        batch_size = input_functions.shape[0]
        n_points = query_coords.shape[1]
        
        # Branch网络编码输入函数
        branch_output = self.branch_net(input_functions)  # [batch, latent_dim]
        
        # Trunk网络编码查询坐标
        coords_flat = query_coords.view(-1, query_coords.shape[-1])  # [batch*n_points, coord_dim]
        trunk_output = self.trunk_net(coords_flat)  # [batch*n_points, latent_dim]
        trunk_output = trunk_output.view(batch_size, n_points, -1)  # [batch, n_points, latent_dim]
        
        # 点积操作 + 偏置
        branch_expanded = branch_output.unsqueeze(1)  # [batch, 1, latent_dim]
        dot_product = torch.sum(branch_expanded * trunk_output, dim=-1, keepdim=True)  # [batch, n_points, 1]
        
        # 添加偏置
        bias_output = self.bias(trunk_output)  # [batch, n_points, output_dim]
        
        output = dot_product + bias_output
        
        return output

class GraphNeuralNetwork(nn.Module):
    """图神经网络 (GNN) - 基于GAT"""
    
    def __init__(self, config: GNNConfig):
        super().__init__()
        self.config = config
        
        if not TORCH_GEOMETRIC_AVAILABLE:
            raise ImportError("PyTorch Geometric is required for GNN")
        
        # 输入投影
        self.input_projection = nn.Linear(config.node_features, config.hidden_dim)
        
        # GAT层
        self.gnn_layers = nn.ModuleList()
        for i in range(config.num_layers):
            if i == 0:
                in_dim = config.hidden_dim
            else:
                in_dim = config.hidden_dim * config.num_heads
            
            if i == config.num_layers - 1:
                # 最后一层不使用多头
                self.gnn_layers.append(
                    GATConv(in_dim, config.hidden_dim, heads=1, dropout=config.dropout)
                )
            else:
                self.gnn_layers.append(
                    GATConv(in_dim, config.hidden_dim, heads=config.num_heads, dropout=config.dropout)
                )
        
        # 输出层
        self.output_layer = nn.Sequential(
            nn.Linear(config.hidden_dim, config.hidden_dim // 2),
            nn.ReLU(),
            nn.Dropout(config.dropout),
            nn.Linear(config.hidden_dim // 2, 1)  # 预测标量场
        )
    
    def forward(self, data: 'torch_geometric.data.Data') -> torch.Tensor:
        """
        GNN前向传播
        
        Args:
            data: PyTorch Geometric数据对象
            
        Returns:
            节点预测值
        """
        x, edge_index = data.x, data.edge_index
        
        # 输入投影
        x = self.input_projection(x)
        x = F.relu(x)
        
        # GAT层
        for i, gnn_layer in enumerate(self.gnn_layers):
            x = gnn_layer(x, edge_index)
            if i < len(self.gnn_layers) - 1:
                x = F.relu(x)
                x = F.dropout(x, p=self.config.dropout, training=self.training)
        
        # 输出预测
        output = self.output_layer(x)
        
        return output

class HybridAIPredictor:
    """混合AI预测器 - 整合PINN+DeepONet+GNN"""
    
    def __init__(self, pinn_config: PINNConfig, 
                 deeponet_config: DeepONetConfig,
                 gnn_config: GNNConfig):
        """
        初始化混合AI预测器
        
        Args:
            pinn_config: PINN配置
            deeponet_config: DeepONet配置  
            gnn_config: GNN配置
        """
        self.logger = logging.getLogger(__name__)
        
        # 初始化各个网络
        self.pinn = PhysicsInformedNN(pinn_config).to(device)
        self.deeponet = DeepOperatorNetwork(deeponet_config).to(device)
        
        if TORCH_GEOMETRIC_AVAILABLE:
            self.gnn = GraphNeuralNetwork(gnn_config).to(device)
        else:
            self.gnn = None
            self.logger.warning("GNN不可用，将跳过图神经网络功能")
        
        # 配置存储
        self.pinn_config = pinn_config
        self.deeponet_config = deeponet_config
        self.gnn_config = gnn_config
        
        # 优化器
        self.pinn_optimizer = torch.optim.Adam(self.pinn.parameters(), lr=pinn_config.learning_rate)
        self.deeponet_optimizer = torch.optim.Adam(self.deeponet.parameters(), lr=deeponet_config.learning_rate)
        
        if self.gnn is not None:
            self.gnn_optimizer = torch.optim.Adam(self.gnn.parameters(), lr=gnn_config.learning_rate)
        
        # 训练状态
        self.is_trained = {"pinn": False, "deeponet": False, "gnn": False}
        self.training_history = {"pinn": [], "deeponet": [], "gnn": []}
    
    async def train_pinn(self, training_data: Dict) -> Dict:
        """
        训练PINN网络
        
        Args:
            training_data: 包含域内点、边界点、初始点等
            
        Returns:
            训练历史
        """
        self.logger.info("开始训练PINN...")
        start_time = time.time()
        
        # 解析训练数据
        domain_coords = training_data['domain_coords']  # 域内配点
        boundary_coords = training_data.get('boundary_coords')
        boundary_values = training_data.get('boundary_values')
        initial_coords = training_data.get('initial_coords')
        initial_values = training_data.get('initial_values')
        
        # 转换为张量
        domain_coords = torch.FloatTensor(domain_coords).to(device)
        if boundary_coords is not None:
            boundary_coords = torch.FloatTensor(boundary_coords).to(device)
            boundary_values = torch.FloatTensor(boundary_values).to(device)
        if initial_coords is not None:
            initial_coords = torch.FloatTensor(initial_coords).to(device)
            initial_values = torch.FloatTensor(initial_values).to(device)
        
        # 训练循环
        for epoch in range(self.pinn_config.epochs):
            self.pinn_optimizer.zero_grad()
            
            # 计算各项损失
            # 1. PDE损失
            pde_residual = self.pinn.compute_pde_residual(domain_coords)
            pde_loss = torch.mean(pde_residual ** 2)
            
            total_loss = self.pinn_config.pde_weight * pde_loss
            
            # 2. 边界条件损失
            if boundary_coords is not None:
                boundary_loss = self.pinn.compute_boundary_loss(boundary_coords, boundary_values)
                total_loss += self.pinn_config.boundary_weight * boundary_loss
            
            # 3. 初始条件损失
            if initial_coords is not None:
                initial_loss = self.pinn.compute_initial_loss(initial_coords, initial_values)
                total_loss += self.pinn_config.initial_weight * initial_loss
            
            # 反向传播
            total_loss.backward()
            self.pinn_optimizer.step()
            
            # 记录训练历史
            if epoch % 1000 == 0:
                self.logger.info(f"PINN Epoch {epoch}, Loss: {total_loss.item():.6e}")
                self.training_history["pinn"].append({
                    "epoch": epoch,
                    "total_loss": total_loss.item(),
                    "pde_loss": pde_loss.item()
                })
        
        training_time = time.time() - start_time
        self.is_trained["pinn"] = True
        self.logger.info(f"PINN训练完成，耗时: {training_time:.2f}秒")
        
        return {
            "training_time": training_time,
            "final_loss": total_loss.item(),
            "history": self.training_history["pinn"]
        }
    
    async def train_deeponet(self, training_data: Dict) -> Dict:
        """
        训练DeepONet网络
        
        Args:
            training_data: 包含输入函数和对应的输出场
            
        Returns:
            训练历史
        """
        self.logger.info("开始训练DeepONet...")
        start_time = time.time()
        
        # 解析训练数据
        input_functions = torch.FloatTensor(training_data['input_functions']).to(device)
        query_coords = torch.FloatTensor(training_data['query_coords']).to(device)
        target_fields = torch.FloatTensor(training_data['target_fields']).to(device)
        
        # 训练循环
        for epoch in range(self.deeponet_config.epochs):
            self.deeponet_optimizer.zero_grad()
            
            # 前向传播
            predicted_fields = self.deeponet(input_functions, query_coords)
            
            # 计算损失
            loss = F.mse_loss(predicted_fields, target_fields)
            
            # 反向传播
            loss.backward()
            self.deeponet_optimizer.step()
            
            # 记录训练历史
            if epoch % 500 == 0:
                self.logger.info(f"DeepONet Epoch {epoch}, Loss: {loss.item():.6e}")
                self.training_history["deeponet"].append({
                    "epoch": epoch,
                    "loss": loss.item()
                })
        
        training_time = time.time() - start_time
        self.is_trained["deeponet"] = True
        self.logger.info(f"DeepONet训练完成，耗时: {training_time:.2f}秒")
        
        return {
            "training_time": training_time,
            "final_loss": loss.item(),
            "history": self.training_history["deeponet"]
        }
    
    async def train_gnn(self, training_data: Dict) -> Dict:
        """
        训练GNN网络
        
        Args:
            training_data: 图数据列表
            
        Returns:
            训练历史
        """
        if self.gnn is None:
            self.logger.warning("GNN不可用，跳过训练")
            return {"status": "skipped", "reason": "GNN not available"}
        
        self.logger.info("开始训练GNN...")
        start_time = time.time()
        
        # 解析图数据
        graph_data_list = training_data['graph_data']
        
        # 训练循环
        for epoch in range(self.gnn_config.epochs):
            self.gnn_optimizer.zero_grad()
            
            total_loss = 0.0
            for graph_data in graph_data_list:
                # 前向传播
                predicted = self.gnn(graph_data)
                target = graph_data.y
                
                # 计算损失
                loss = F.mse_loss(predicted, target)
                total_loss += loss.item()
                
                # 累积梯度
                loss.backward()
            
            # 更新参数
            self.gnn_optimizer.step()
            
            # 记录训练历史
            if epoch % 300 == 0:
                avg_loss = total_loss / len(graph_data_list)
                self.logger.info(f"GNN Epoch {epoch}, Avg Loss: {avg_loss:.6e}")
                self.training_history["gnn"].append({
                    "epoch": epoch,
                    "avg_loss": avg_loss
                })
        
        training_time = time.time() - start_time
        self.is_trained["gnn"] = True
        self.logger.info(f"GNN训练完成，耗时: {training_time:.2f}秒")
        
        return {
            "training_time": training_time,
            "final_loss": total_loss / len(graph_data_list),
            "history": self.training_history["gnn"]
        }
    
    async def ensemble_predict(self, prediction_data: Dict) -> Dict:
        """
        集成预测：结合PINN、DeepONet和GNN的预测结果
        
        Args:
            prediction_data: 预测输入数据
            
        Returns:
            集成预测结果
        """
        self.logger.info("开始集成预测...")
        
        predictions = {}
        weights = {}
        
        # PINN预测
        if self.is_trained["pinn"] and 'coords' in prediction_data:
            coords = torch.FloatTensor(prediction_data['coords']).to(device)
            with torch.no_grad():
                pinn_pred = self.pinn(coords).cpu().numpy()
            predictions['pinn'] = pinn_pred
            weights['pinn'] = 0.4  # PINN权重（物理约束强）
        
        # DeepONet预测
        if (self.is_trained["deeponet"] and 
            'input_functions' in prediction_data and 
            'query_coords' in prediction_data):
            
            input_funcs = torch.FloatTensor(prediction_data['input_functions']).to(device)
            query_coords = torch.FloatTensor(prediction_data['query_coords']).to(device)
            
            with torch.no_grad():
                deeponet_pred = self.deeponet(input_funcs, query_coords).cpu().numpy()
            predictions['deeponet'] = deeponet_pred
            weights['deeponet'] = 0.4  # DeepONet权重（算子学习）
        
        # GNN预测
        if self.is_trained["gnn"] and self.gnn is not None and 'graph_data' in prediction_data:
            graph_data = prediction_data['graph_data']
            with torch.no_grad():
                gnn_pred = self.gnn(graph_data).cpu().numpy()
            predictions['gnn'] = gnn_pred
            weights['gnn'] = 0.2  # GNN权重（结构关系）
        
        # 集成预测（加权平均）
        if predictions:
            # 归一化权重
            total_weight = sum(weights.values())
            normalized_weights = {k: v/total_weight for k, v in weights.items()}
            
            # 加权集成
            ensemble_result = None
            for model_name, pred in predictions.items():
                weight = normalized_weights[model_name]
                if ensemble_result is None:
                    ensemble_result = weight * pred
                else:
                    ensemble_result += weight * pred
            
            # 不确定性量化（预测方差）
            if len(predictions) > 1:
                pred_values = list(predictions.values())
                uncertainty = np.var(pred_values, axis=0)
            else:
                uncertainty = np.zeros_like(ensemble_result)
            
            result = {
                "ensemble_prediction": ensemble_result,
                "uncertainty": uncertainty,
                "individual_predictions": predictions,
                "weights": normalized_weights,
                "models_used": list(predictions.keys())
            }
        else:
            result = {
                "error": "No trained models available for prediction",
                "models_trained": [k for k, v in self.is_trained.items() if v]
            }
        
        return result
    
    def save_models(self, save_dir: str):
        """保存所有训练好的模型"""
        import os
        os.makedirs(save_dir, exist_ok=True)
        
        if self.is_trained["pinn"]:
            torch.save(self.pinn.state_dict(), os.path.join(save_dir, "pinn_model.pth"))
        
        if self.is_trained["deeponet"]:
            torch.save(self.deeponet.state_dict(), os.path.join(save_dir, "deeponet_model.pth"))
        
        if self.is_trained["gnn"] and self.gnn is not None:
            torch.save(self.gnn.state_dict(), os.path.join(save_dir, "gnn_model.pth"))
        
        # 保存配置和训练历史
        metadata = {
            "is_trained": self.is_trained,
            "training_history": self.training_history,
            "configs": {
                "pinn": self.pinn_config.__dict__,
                "deeponet": self.deeponet_config.__dict__,
                "gnn": self.gnn_config.__dict__
            }
        }
        
        with open(os.path.join(save_dir, "metadata.json"), 'w') as f:
            json.dump(metadata, f, indent=2)
        
        self.logger.info(f"模型已保存至: {save_dir}")
    
    def load_models(self, save_dir: str):
        """加载训练好的模型"""
        import os
        
        # 加载元数据
        with open(os.path.join(save_dir, "metadata.json"), 'r') as f:
            metadata = json.load(f)
        
        self.is_trained = metadata["is_trained"]
        self.training_history = metadata["training_history"]
        
        # 加载模型权重
        if self.is_trained["pinn"]:
            pinn_path = os.path.join(save_dir, "pinn_model.pth")
            if os.path.exists(pinn_path):
                self.pinn.load_state_dict(torch.load(pinn_path, map_location=device))
        
        if self.is_trained["deeponet"]:
            deeponet_path = os.path.join(save_dir, "deeponet_model.pth")
            if os.path.exists(deeponet_path):
                self.deeponet.load_state_dict(torch.load(deeponet_path, map_location=device))
        
        if self.is_trained["gnn"] and self.gnn is not None:
            gnn_path = os.path.join(save_dir, "gnn_model.pth")
            if os.path.exists(gnn_path):
                self.gnn.load_state_dict(torch.load(gnn_path, map_location=device))
        
        self.logger.info(f"模型已从 {save_dir} 加载")

# 深基坑工程专用AI预测器
class DeepExcavationAIPredictor:
    """深基坑工程AI预测器"""
    
    def __init__(self):
        """初始化深基坑AI预测器"""
        self.logger = logging.getLogger(__name__)
        
        # 深基坑专用配置
        pinn_config = PINNConfig(
            hidden_layers=[64, 64, 64, 64],
            learning_rate=1e-3,
            epochs=15000,
            pde_weight=1.0,
            boundary_weight=20.0,  # 边界条件很重要
            initial_weight=15.0,
            diffusion_coeff=1e-6   # 土体渗透系数
        )
        
        deeponet_config = DeepONetConfig(
            branch_layers=[200, 256, 256],  # 更多传感器输入
            trunk_layers=[3, 128, 128],     # 3D空间坐标
            latent_dim=256,
            learning_rate=5e-4,
            epochs=8000
        )
        
        gnn_config = GNNConfig(
            node_features=32,    # 丰富的节点特征
            edge_features=16,
            hidden_dim=128,
            num_layers=6,        # 更深的网络
            num_heads=8,
            learning_rate=1e-3,
            epochs=5000
        )
        
        # 创建混合AI预测器
        self.ai_predictor = HybridAIPredictor(pinn_config, deeponet_config, gnn_config)
    
    async def train_for_excavation(self, excavation_data: Dict) -> Dict:
        """
        针对深基坑工程训练AI模型
        
        Args:
            excavation_data: 深基坑工程数据
            
        Returns:
            训练结果汇总
        """
        self.logger.info("开始深基坑AI预测器训练...")
        
        training_results = {}
        
        # 1. 训练PINN（土体渗流-变形耦合）
        if 'pinn_data' in excavation_data:
            pinn_result = await self.ai_predictor.train_pinn(excavation_data['pinn_data'])
            training_results['pinn'] = pinn_result
        
        # 2. 训练DeepONet（参数-响应映射）
        if 'deeponet_data' in excavation_data:
            deeponet_result = await self.ai_predictor.train_deeponet(excavation_data['deeponet_data'])
            training_results['deeponet'] = deeponet_result
        
        # 3. 训练GNN（支护结构图）
        if 'gnn_data' in excavation_data:
            gnn_result = await self.ai_predictor.train_gnn(excavation_data['gnn_data'])
            training_results['gnn'] = gnn_result
        
        return training_results
    
    async def predict_excavation_response(self, excavation_params: Dict) -> Dict:
        """
        预测深基坑响应
        
        Args:
            excavation_params: 基坑参数
            
        Returns:
            预测结果（位移、应力、渗流等）
        """
        prediction_data = self._prepare_excavation_prediction_data(excavation_params)
        
        # 集成预测
        result = await self.ai_predictor.ensemble_predict(prediction_data)
        
        # 后处理为工程量
        if 'ensemble_prediction' in result:
            engineering_results = self._convert_to_engineering_quantities(
                result['ensemble_prediction'], excavation_params
            )
            result['engineering_results'] = engineering_results
        
        return result
    
    def _prepare_excavation_prediction_data(self, params: Dict) -> Dict:
        """准备深基坑预测数据"""
        # 生成空间坐标
        x_range = params.get('x_range', [-10, 10])
        y_range = params.get('y_range', [-10, 10])
        depth_range = params.get('depth_range', [0, -15])
        
        # 3D网格点
        nx, ny, nz = 20, 20, 15
        x = np.linspace(x_range[0], x_range[1], nx)
        y = np.linspace(y_range[0], y_range[1], ny)
        z = np.linspace(depth_range[0], depth_range[1], nz)
        
        X, Y, Z = np.meshgrid(x, y, z)
        coords = np.column_stack([X.ravel(), Y.ravel(), Z.ravel()])
        
        # 输入函数（边界条件、载荷等）
        input_functions = self._generate_input_functions(params)
        
        # 查询坐标（添加时间维度）
        time_steps = params.get('time_steps', [0, 1, 2, 5, 10])
        query_coords_list = []
        for t in time_steps:
            coords_with_time = np.column_stack([coords, np.full(len(coords), t)])
            query_coords_list.append(coords_with_time)
        
        query_coords = np.array(query_coords_list)  # [n_times, n_points, 4]
        
        prediction_data = {
            'coords': coords,
            'input_functions': input_functions,
            'query_coords': query_coords
        }
        
        # 如果有图数据，添加图结构
        if 'support_structure' in params:
            graph_data = self._create_support_graph(params['support_structure'])
            prediction_data['graph_data'] = graph_data
        
        return prediction_data
    
    def _generate_input_functions(self, params: Dict) -> np.ndarray:
        """生成输入函数（边界条件等）"""
        n_sensors = 100  # 假设100个传感器点
        
        # 模拟传感器数据（随机+物理约束）
        base_values = np.random.randn(n_sensors) * 0.1
        
        # 根据参数调整
        excavation_depth = params.get('excavation_depth', 8.0)
        soil_modulus = params.get('soil_modulus', 30e6)
        
        # 深度影响
        depth_factor = excavation_depth / 10.0
        base_values *= depth_factor
        
        # 刚度影响
        stiffness_factor = soil_modulus / 30e6
        base_values *= np.sqrt(stiffness_factor)
        
        return base_values.reshape(1, -1)  # [1, n_sensors]
    
    def _create_support_graph(self, support_structure: Dict):
        """创建支护结构图数据"""
        if not TORCH_GEOMETRIC_AVAILABLE:
            return None
        
        # 简化的支护结构图
        n_nodes = support_structure.get('n_support_points', 50)
        
        # 节点特征（位置、类型、属性等）
        node_features = torch.randn(n_nodes, 32)
        
        # 边连接（相邻支护点）
        edge_list = []
        for i in range(n_nodes - 1):
            edge_list.append([i, i + 1])
            edge_list.append([i + 1, i])  # 双向边
        
        edge_index = torch.tensor(edge_list).t().contiguous()
        
        # 目标值（位移、应力等）
        target_values = torch.randn(n_nodes, 1)
        
        from torch_geometric.data import Data
        graph_data = Data(x=node_features, edge_index=edge_index, y=target_values)
        
        return graph_data
    
    def _convert_to_engineering_quantities(self, predictions: np.ndarray, 
                                         params: Dict) -> Dict:
        """转换为工程量"""
        # 简化处理：假设预测结果是位移场
        max_displacement = np.max(np.abs(predictions))
        avg_displacement = np.mean(np.abs(predictions))
        
        # 安全系数估算
        allowable_displacement = params.get('allowable_displacement', 0.025)  # 25mm
        safety_factor = allowable_displacement / max_displacement if max_displacement > 0 else float('inf')
        
        engineering_results = {
            'max_displacement_mm': max_displacement * 1000,  # 转换为mm
            'avg_displacement_mm': avg_displacement * 1000,
            'safety_factor': safety_factor,
            'risk_level': 'High' if safety_factor < 1.3 else 'Medium' if safety_factor < 2.0 else 'Low'
        }
        
        return engineering_results

if __name__ == "__main__":
    # 测试示例
    async def test_ai_prediction_system():
        """AI预测系统测试"""
        print("🤖 DeepCAD智能预测系统测试 🤖")
        
        # 创建深基坑AI预测器
        excavation_predictor = DeepExcavationAIPredictor()
        
        # 模拟训练数据
        n_domain_points = 1000
        domain_coords = np.random.uniform(-10, 10, (n_domain_points, 3))  # (x, y, t)
        
        # 边界条件（基坑边界）
        n_boundary = 200
        boundary_coords = np.random.uniform(-10, 10, (n_boundary, 3))
        boundary_values = np.zeros((n_boundary, 1))  # 固定边界
        
        # PINN训练数据
        pinn_data = {
            'domain_coords': domain_coords,
            'boundary_coords': boundary_coords,
            'boundary_values': boundary_values
        }
        
        # DeepONet训练数据
        n_samples = 100
        input_functions = np.random.randn(n_samples, 200)  # 200个传感器
        query_coords = np.random.uniform(-10, 10, (n_samples, 50, 3))  # 每个样本50个查询点
        target_fields = np.random.randn(n_samples, 50, 1)  # 对应的场值
        
        deeponet_data = {
            'input_functions': input_functions,
            'query_coords': query_coords,
            'target_fields': target_fields
        }
        
        # 组合训练数据
        excavation_data = {
            'pinn_data': pinn_data,
            'deeponet_data': deeponet_data
        }
        
        # 训练AI模型
        print("\n🏋️ 开始AI模型训练...")
        training_results = await excavation_predictor.train_for_excavation(excavation_data)
        
        print(f"\n📊 训练结果:")
        for model_name, result in training_results.items():
            print(f"  {model_name}: 训练时间 {result['training_time']:.2f}秒, "
                  f"最终损失 {result['final_loss']:.6e}")
        
        # 测试预测
        print("\n🎯 测试预测功能...")
        excavation_params = {
            'excavation_depth': 8.0,
            'soil_modulus': 30e6,
            'x_range': [-15, 15],
            'y_range': [-15, 15],
            'depth_range': [0, -10],
            'allowable_displacement': 0.025
        }
        
        prediction_result = await excavation_predictor.predict_excavation_response(excavation_params)
        
        if 'ensemble_prediction' in prediction_result:
            print(f"  集成预测完成")
            print(f"  使用模型: {prediction_result['models_used']}")
            print(f"  预测维度: {prediction_result['ensemble_prediction'].shape}")
            
            if 'engineering_results' in prediction_result:
                eng_results = prediction_result['engineering_results']
                print(f"  最大位移: {eng_results['max_displacement_mm']:.2f}mm")
                print(f"  安全系数: {eng_results['safety_factor']:.2f}")
                print(f"  风险等级: {eng_results['risk_level']}")
        
        # 保存模型
        excavation_predictor.ai_predictor.save_models("ai_models")
        print("\n✅ AI预测系统测试完成！")
    
    # 运行测试
    asyncio.run(test_ai_prediction_system())