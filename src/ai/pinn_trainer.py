#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""物理信息神经网络(PINN)训练器

本模块提供了物理信息神经网络(PINN)的训练功能，用于深基坑工程中的物理参数反演、
状态预测和异常检测。结合物理规律和数据驱动的方法，提高AI模型的物理合理性和泛化能力。
"""

import os
import sys
import time
import json
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import logging
from typing import Dict, List, Tuple, Union, Optional, Any
from pathlib import Path
import datetime

# 尝试导入PyTorch
try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, TensorDataset
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    print("警告: PyTorch未安装，PINN功能将不可用")

# 导入物理AI模块
from src.ai.physics_ai import (
    PhysicsInformedNN, 
    HeatEquationPINN, 
    WaveEquationPINN, 
    ElasticityPINN, 
    PDEInverseAnalysis
)

# 配置日志
logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(logs_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(logs_dir, "pinn_trainer.log"), mode="a", encoding="utf-8")
    ]
)
logger = logging.getLogger("PINNTrainer")

class PINNTrainer:
    """物理信息神经网络训练器"""
    
    def __init__(
        self,
        project_id: int,
        models_dir: str = None,
        results_dir: str = None
    ):
        """
        初始化PINN训练器
        
        Args:
            project_id: 项目ID
            models_dir: 模型目录
            results_dir: 结果目录
        """
        self.project_id = project_id
        
        # 设置模型目录
        if models_dir is None:
            self.models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                          "data", "models", "pinn")
        else:
            self.models_dir = models_dir
        os.makedirs(self.models_dir, exist_ok=True)
        
        # 设置结果目录
        if results_dir is None:
            self.results_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                           "data", "results", "pinn")
        else:
            self.results_dir = results_dir
        os.makedirs(self.results_dir, exist_ok=True)
        
        # 检查PyTorch是否可用
        self.torch_available = HAS_TORCH
        if not self.torch_available:
            logger.warning("PyTorch未安装，PINN功能将不可用")
        
        # 初始化模型字典
        self.models = {}
        
        logger.info(f"PINN训练器初始化完成，项目ID: {project_id}")
    
    def create_model(
        self,
        model_name: str,
        model_type: str = "elasticity",
        config: Dict[str, Any] = None
    ) -> bool:
        """
        创建PINN模型
        
        Args:
            model_name: 模型名称
            model_type: 模型类型 (elasticity, heat, wave)
            config: 配置参数
            
        Returns:
            是否成功创建
        """
        if not self.torch_available:
            logger.error("PyTorch未安装，无法创建PINN模型")
            return False
        
        if model_name in self.models:
            logger.warning(f"模型已存在: {model_name}")
            return False
        
        config = config or {}
        
        try:
            if model_type == "elasticity":
                # 创建弹性力学模型
                domain_bounds = config.get("domain_bounds", [[-10, 10], [-10, 10]])
                young_modulus = config.get("young_modulus", 3e6)
                poisson_ratio = config.get("poisson_ratio", 0.3)
                hidden_layers = config.get("hidden_layers", [20, 20, 20])
                activation = config.get("activation", "tanh")
                
                model = ElasticityPINN(
                    domain_bounds=domain_bounds,
                    young_modulus=young_modulus,
                    poisson_ratio=poisson_ratio,
                    hidden_layers=hidden_layers,
                    activation=activation
                )
                
                # 设置优化器
                optimizer = config.get("optimizer", "adam")
                learning_rate = config.get("learning_rate", 0.001)
                model.setup_optimizer(optimizer, learning_rate)
                
            elif model_type == "heat":
                # 创建热传导模型
                domain_bounds = config.get("domain_bounds", [[-10, 10], [-10, 10]])
                alpha = config.get("alpha", 1.0)  # 热扩散系数
                hidden_layers = config.get("hidden_layers", [20, 20, 20])
                activation = config.get("activation", "tanh")
                
                model = HeatEquationPINN(
                    domain_bounds=domain_bounds,
                    alpha=alpha,
                    hidden_layers=hidden_layers,
                    activation=activation
                )
                
                # 设置优化器
                optimizer = config.get("optimizer", "adam")
                learning_rate = config.get("learning_rate", 0.001)
                model.setup_optimizer(optimizer, learning_rate)
                
            elif model_type == "wave":
                # 创建波动方程模型
                domain_bounds = config.get("domain_bounds", [[-10, 10], [-10, 10]])
                c = config.get("c", 1.0)  # 波速
                hidden_layers = config.get("hidden_layers", [20, 20, 20])
                activation = config.get("activation", "tanh")
                
                model = WaveEquationPINN(
                    domain_bounds=domain_bounds,
                    c=c,
                    hidden_layers=hidden_layers,
                    activation=activation
                )
                
                # 设置优化器
                optimizer = config.get("optimizer", "adam")
                learning_rate = config.get("learning_rate", 0.001)
                model.setup_optimizer(optimizer, learning_rate)
                
            else:
                logger.error(f"不支持的模型类型: {model_type}")
                return False
            
            # 保存模型
            self.models[model_name] = {
                "model": model,
                "type": model_type,
                "config": config,
                "created_at": datetime.datetime.now().isoformat()
            }
            
            logger.info(f"创建模型 '{model_name}' 成功，类型: {model_type}")
            return True
            
        except Exception as e:
            logger.error(f"创建模型出错: {str(e)}")
            return False
    
    def train_model(
        self,
        model_name: str,
        training_data: Dict[str, Any],
        training_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        训练PINN模型
        
        Args:
            model_name: 模型名称
            training_data: 训练数据
            training_config: 训练配置
            
        Returns:
            训练结果
        """
        if not self.torch_available:
            logger.error("PyTorch未安装，无法训练PINN模型")
            return {"success": False, "error": "PyTorch未安装"}
        
        if model_name not in self.models:
            logger.error(f"模型 '{model_name}' 不存在")
            return {"success": False, "error": f"模型 '{model_name}' 不存在"}
        
        model_info = self.models[model_name]
        model = model_info["model"]
        model_type = model_info["type"]
        
        training_config = training_config or {}
        
        try:
            # 提取训练参数
            epochs = training_config.get("epochs", 10000)
            batch_size = training_config.get("batch_size", None)
            pde_weight = training_config.get("pde_weight", 1.0)
            bc_weight = training_config.get("bc_weight", 1.0)
            data_weight = training_config.get("data_weight", 1.0)
            save_interval = training_config.get("save_interval", 1000)
            verbose = training_config.get("verbose", True)
            
            # 准备训练数据
            X_data = self._prepare_tensor_data(training_data.get("X_data", []))
            y_data = self._prepare_tensor_data(training_data.get("y_data", []))
            
            # 准备PDE点
            if "pde_points" in training_config:
                X_pde = self._prepare_tensor_data(training_config["pde_points"])
            else:
                # 生成均匀网格
                domain_bounds = model.domain_bounds
                n_pde_samples = training_config.get("n_pde_samples", 1000)
                X_pde = self._generate_grid_points(domain_bounds, n_pde_samples)
            
            # 定义边界条件函数
            def boundary_condition(model):
                # 简单实现，实际应用中应根据具体问题定义
                return torch.tensor(0.0, device=model.device)
            
            # 训练循环
            start_time = time.time()
            losses = []
            
            for epoch in range(epochs):
                # 如果使用批次训练
                if batch_size and X_data.shape[0] > batch_size:
                    # 随机选择批次
                    idx = torch.randperm(X_data.shape[0])[:batch_size]
                    X_batch = X_data[idx]
                    y_batch = y_data[idx]
                else:
                    X_batch = X_data
                    y_batch = y_data
                
                # 训练步骤
                loss = model.train_step(
                    x_data=X_batch,
                    y_data=y_batch,
                    x_pde=X_pde,
                    boundary_condition=boundary_condition,
                    pde_weight=pde_weight,
                    bc_weight=bc_weight,
                    data_weight=data_weight
                )
                
                losses.append(loss)
                
                # 打印进度
                if verbose and (epoch + 1) % (epochs // 10) == 0:
                    elapsed = time.time() - start_time
                    logger.info(f"Epoch {epoch+1}/{epochs}, Loss: {loss:.6f}, Time: {elapsed:.2f}s")
                
                # 保存检查点
                if (epoch + 1) % save_interval == 0:
                    checkpoint_path = os.path.join(
                        self.models_dir,
                        f"{model_name}_checkpoint_{epoch+1}.pt"
                    )
                    model.save_model(checkpoint_path)
                    
                    if verbose:
                        logger.info(f"保存检查点: {checkpoint_path}")
            
            # 保存最终模型
            model_path = os.path.join(self.models_dir, f"{model_name}.pt")
            model.save_model(model_path)
            
            # 保存损失历史
            loss_path = os.path.join(self.results_dir, f"{model_name}_loss_history.json")
            with open(loss_path, 'w') as f:
                json.dump({"epochs": list(range(epochs)), "losses": losses}, f)
            
            # 可视化损失
            self._plot_loss_history(losses, model_name)
            
            elapsed_time = time.time() - start_time
            logger.info(f"模型 '{model_name}' 训练完成，耗时: {elapsed_time:.2f}s")
            
            return {
                "success": True,
                "model_path": model_path,
                "loss_path": loss_path,
                "epochs": epochs,
                "final_loss": losses[-1] if losses else None,
                "elapsed_time": elapsed_time
            }
            
        except Exception as e:
            logger.error(f"训练模型出错: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _prepare_tensor_data(self, data: List[List[float]]) -> torch.Tensor:
        """
        准备张量数据
        
        Args:
            data: 数据列表
            
        Returns:
            PyTorch张量
        """
        if not data:
            return torch.tensor([])
        
        return torch.tensor(data, dtype=torch.float32)
    
    def _generate_grid_points(self, domain_bounds: List[List[float]], n_points: int) -> torch.Tensor:
        """
        生成网格点
        
        Args:
            domain_bounds: 定义域边界 [[x_min, x_max], [y_min, y_max], ...]
            n_points: 点数量
            
        Returns:
            网格点张量
        """
        if not domain_bounds:
            return torch.tensor([])
        
        # 计算每个维度的点数
        dim = len(domain_bounds)
        points_per_dim = int(n_points ** (1/dim))
        
        # 生成每个维度的坐标
        coords = []
        for bounds in domain_bounds:
            coords.append(np.linspace(bounds[0], bounds[1], points_per_dim))
        
        # 生成网格点
        mesh_coords = np.meshgrid(*coords)
        grid_points = np.vstack([coord.flatten() for coord in mesh_coords]).T
        
        return torch.tensor(grid_points, dtype=torch.float32)
    
    def _plot_loss_history(self, losses: List[float], model_name: str):
        """
        绘制损失历史
        
        Args:
            losses: 损失列表
            model_name: 模型名称
        """
        plt.figure(figsize=(10, 6))
        plt.plot(losses)
        plt.title(f"Training Loss - {model_name}")
        plt.xlabel("Epoch")
        plt.ylabel("Loss")
        plt.yscale("log")
        plt.grid(True)
        
        # 保存图像
        plot_path = os.path.join(self.results_dir, f"{model_name}_loss_plot.png")
        plt.savefig(plot_path)
        plt.close()
    
    def predict(
        self,
        model_name: str,
        query_points: List[List[float]]
    ) -> Dict[str, Any]:
        """
        使用PINN模型进行预测
        
        Args:
            model_name: 模型名称
            query_points: 查询点坐标列表
            
        Returns:
            预测结果
        """
        if not self.torch_available:
            logger.error("PyTorch未安装，无法使用PINN模型进行预测")
            return {"success": False, "error": "PyTorch未安装"}
        
        if model_name not in self.models:
            logger.error(f"模型 '{model_name}' 不存在")
            return {"success": False, "error": f"模型 '{model_name}' 不存在"}
        
        model_info = self.models[model_name]
        model = model_info["model"]
        
        try:
            # 准备查询点
            x = self._prepare_tensor_data(query_points)
            
            # 预测
            with torch.no_grad():
                y_pred = model.forward(x).cpu().numpy()
            
            return {
                "success": True,
                "predictions": y_pred.tolist()
            }
            
        except Exception as e:
            logger.error(f"预测出错: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def load_model(self, model_path: str, model_name: str = None) -> bool:
        """
        加载PINN模型
        
        Args:
            model_path: 模型文件路径
            model_name: 模型名称，如果为None则使用文件名
            
        Returns:
            是否成功加载
        """
        if not self.torch_available:
            logger.error("PyTorch未安装，无法加载PINN模型")
            return False
        
        if model_name is None:
            model_name = os.path.basename(model_path).split('.')[0]
        
        try:
            # 加载模型元数据
            checkpoint = torch.load(model_path, map_location='cpu')
            
            # 检查模型类型
            if 'model_type' not in checkpoint:
                logger.error(f"无效的模型文件: {model_path}")
                return False
            
            model_type = checkpoint['model_type']
            config = checkpoint.get('config', {})
            
            # 创建模型
            if self.create_model(model_name, model_type, config):
                # 加载模型参数
                model = self.models[model_name]["model"]
                model.load_model(model_path)
                
                logger.info(f"成功加载模型 '{model_name}' 从 {model_path}")
                return True
            else:
                return False
            
        except Exception as e:
            logger.error(f"加载模型出错: {str(e)}")
            return False
    
    def save_model(self, model_name: str, model_path: str = None) -> bool:
        """
        保存PINN模型
        
        Args:
            model_name: 模型名称
            model_path: 模型文件路径，如果为None则使用默认路径
            
        Returns:
            是否成功保存
        """
        if not self.torch_available:
            logger.error("PyTorch未安装，无法保存PINN模型")
            return False
        
        if model_name not in self.models:
            logger.error(f"模型 '{model_name}' 不存在")
            return False
        
        if model_path is None:
            model_path = os.path.join(self.models_dir, f"{model_name}.pt")
        
        try:
            model_info = self.models[model_name]
            model = model_info["model"]
            
            # 保存模型
            model.save_model(model_path)
            
            logger.info(f"成功保存模型 '{model_name}' 到 {model_path}")
            return True
            
        except Exception as e:
            logger.error(f"保存模型出错: {str(e)}")
            return False
    
    def evaluate_model(
        self,
        model_name: str,
        test_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        评估PINN模型
        
        Args:
            model_name: 模型名称
            test_data: 测试数据
            
        Returns:
            评估结果
        """
        if not self.torch_available:
            logger.error("PyTorch未安装，无法评估PINN模型")
            return {"success": False, "error": "PyTorch未安装"}
        
        if model_name not in self.models:
            logger.error(f"模型 '{model_name}' 不存在")
            return {"success": False, "error": f"模型 '{model_name}' 不存在"}
        
        model_info = self.models[model_name]
        model = model_info["model"]
        
        try:
            # 准备测试数据
            X_test = self._prepare_tensor_data(test_data.get("X_test", []))
            y_test = self._prepare_tensor_data(test_data.get("y_test", []))
            
            if X_test.shape[0] == 0 or y_test.shape[0] == 0:
                return {"success": False, "error": "测试数据为空"}
            
            # 预测
            with torch.no_grad():
                y_pred = model.forward(X_test)
            
            # 计算误差
            mse = torch.nn.MSELoss()(y_pred, y_test).item()
            mae = torch.mean(torch.abs(y_pred - y_test)).item()
            
            # 可视化结果
            self._plot_prediction_comparison(y_test.cpu().numpy(), y_pred.cpu().numpy(), model_name)
            
            return {
                "success": True,
                "mse": mse,
                "mae": mae,
                "n_samples": X_test.shape[0]
            }
            
        except Exception as e:
            logger.error(f"评估模型出错: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _plot_prediction_comparison(self, y_true: np.ndarray, y_pred: np.ndarray, model_name: str):
        """
        绘制预测对比图
        
        Args:
            y_true: 真实值
            y_pred: 预测值
            model_name: 模型名称
        """
        # 确保数据是二维的
        if y_true.ndim == 1:
            y_true = y_true.reshape(-1, 1)
        if y_pred.ndim == 1:
            y_pred = y_pred.reshape(-1, 1)
        
        n_outputs = y_true.shape[1]
        
        plt.figure(figsize=(12, 4 * n_outputs))
        
        for i in range(n_outputs):
            plt.subplot(n_outputs, 1, i + 1)
            
            plt.scatter(range(len(y_true)), y_true[:, i], label='True', alpha=0.7)
            plt.scatter(range(len(y_pred)), y_pred[:, i], label='Predicted', alpha=0.7)
            
            plt.title(f"Output {i+1}")
            plt.xlabel("Sample")
            plt.ylabel("Value")
            plt.legend()
            plt.grid(True)
        
        plt.tight_layout()
        
        # 保存图像
        plot_path = os.path.join(self.results_dir, f"{model_name}_prediction_comparison.png")
        plt.savefig(plot_path)
        plt.close()
    
    def perform_inverse_analysis(
        self,
        model_name: str,
        observation_data: Dict[str, Any],
        parameters_to_invert: List[str],
        inverse_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        执行反演分析
        
        Args:
            model_name: 模型名称
            observation_data: 观测数据
            parameters_to_invert: 需要反演的参数列表
            inverse_config: 反演配置
            
        Returns:
            反演结果
        """
        if not self.torch_available:
            logger.error("PyTorch未安装，无法执行反演分析")
            return {"success": False, "error": "PyTorch未安装"}
        
        if model_name not in self.models:
            logger.error(f"模型 '{model_name}' 不存在")
            return {"success": False, "error": f"模型 '{model_name}' 不存在"}
        
        model_info = self.models[model_name]
        model_type = model_info["type"]
        
        try:
            # 创建反演分析器
            inverse_analyzer = PDEInverseAnalysis(equation_type=model_type)
            
            # 准备观测数据
            X_obs = observation_data.get("coordinates", [])
            y_obs = observation_data.get("values", [])
            
            # 准备初始参数
            initial_parameters = {}
            for param in parameters_to_invert:
                if param == "young_modulus" and model_type == "elasticity":
                    initial_parameters[param] = model_info["config"].get(param, 3e6)
                elif param == "poisson_ratio" and model_type == "elasticity":
                    initial_parameters[param] = model_info["config"].get(param, 0.3)
                elif param == "alpha" and model_type == "heat":
                    initial_parameters[param] = model_info["config"].get(param, 1.0)
                elif param == "c" and model_type == "wave":
                    initial_parameters[param] = model_info["config"].get(param, 1.0)
            
            # 执行反演
            inverse_config = inverse_config or {}
            max_iterations = inverse_config.get("max_iterations", 100)
            tolerance = inverse_config.get("tolerance", 1e-6)
            
            # 简单实现，实际应用中需要更复杂的反演算法
            result = inverse_analyzer.inverse_solve(
                data={"X": X_obs, "y": y_obs},
                parameters=initial_parameters
            )
            
            if result["status"] == "success":
                # 更新模型参数
                for param, value in result["parameters"].items():
                    if param in model_info["config"]:
                        model_info["config"][param] = value
                
                logger.info(f"反演分析成功，参数: {result['parameters']}")
                return {
                    "success": True,
                    "parameters": result["parameters"],
                    "iterations": result.get("iterations", 0),
                    "final_error": result.get("final_error", 0.0)
                }
            else:
                logger.error(f"反演分析失败: {result.get('error', '未知错误')}")
                return {
                    "success": False,
                    "error": result.get("error", "反演分析失败")
                }
            
        except Exception as e:
            logger.error(f"执行反演分析出错: {str(e)}")
            return {"success": False, "error": str(e)}

def main():
    """测试函数"""
    if not HAS_TORCH:
        print("PyTorch未安装，无法运行测试")
        return
    
    # 创建PINN训练器
    trainer = PINNTrainer(project_id=1)
    
    # 创建弹性力学模型
    model_name = "elasticity_test"
    config = {
        "domain_bounds": [[-1, 1], [-1, 1]],
        "young_modulus": 1e6,
        "poisson_ratio": 0.3,
        "hidden_layers": [20, 20, 20],
        "activation": "tanh",
        "learning_rate": 0.001
    }
    
    trainer.create_model(model_name, "elasticity", config)
    
    # 生成合成训练数据
    n_samples = 100
    X_data = np.random.uniform(-1, 1, (n_samples, 2))
    
    # 简单的位移函数
    def displacement_function(x, y):
        u = 0.01 * (x**2 - y**2)
        v = 0.02 * x * y
        return np.column_stack((u, v))
    
    y_data = displacement_function(X_data[:, 0], X_data[:, 1])
    
    # 训练模型
    training_data = {
        "X_data": X_data.tolist(),
        "y_data": y_data.tolist()
    }
    
    training_config = {
        "epochs": 1000,
        "batch_size": 32,
        "pde_weight": 0.1,
        "data_weight": 1.0,
        "save_interval": 500,
        "verbose": True
    }
    
    result = trainer.train_model(model_name, training_data, training_config)
    print("训练结果:", result)
    
    # 测试预测
    test_points = np.random.uniform(-1, 1, (10, 2)).tolist()
    pred_result = trainer.predict(model_name, test_points)
    print("预测结果:", pred_result)

if __name__ == "__main__":
    main() 