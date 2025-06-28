#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
物理AI模块
用于PDE反演分析和物理信息神经网络(PINN)
"""

import os
import sys
import numpy as np
import matplotlib.pyplot as plt
import torch
import torch.nn as nn
import torch.optim as optim
import deepxde as dde
from typing import Dict, List, Tuple, Union, Callable, Optional
import logging

# 配置日志
logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(logs_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(logs_dir, 'physics_ai.log'), mode='a', encoding='utf-8')
    ]
)
logger = logging.getLogger("PhysicsAI")

class PhysicsInformedNN:
    """物理信息神经网络基类"""
    
    def __init__(
        self, 
        domain_bounds: List[Tuple[float, float]], 
        pde_func: Callable, 
        ic_func: Optional[Callable] = None,
        bc_func: Optional[Callable] = None,
        num_domain: int = 1000,
        num_boundary: int = 100,
        num_initial: int = 100,
        num_test: int = 1000,
        layers: List[int] = [2, 20, 20, 20, 1],
        activation: str = "tanh",
        optimizer: str = "adam",
        learning_rate: float = 0.001,
        iterations: int = 10000,
        model_dir: str = None
    ):
        """
        初始化物理信息神经网络
        
        参数:
            domain_bounds: 定义域边界，例如 [(t_min, t_max), (x_min, x_max)]
            pde_func: PDE残差函数
            ic_func: 初始条件函数
            bc_func: 边界条件函数
            num_domain: 内部点数量
            num_boundary: 边界点数量
            num_initial: 初始点数量
            num_test: 测试点数量
            layers: 网络层结构
            activation: 激活函数
            optimizer: 优化器
            learning_rate: 学习率
            iterations: 迭代次数
            model_dir: 模型保存目录
        """
        self.domain_bounds = domain_bounds
        self.pde_func = pde_func
        self.ic_func = ic_func
        self.bc_func = bc_func
        self.num_domain = num_domain
        self.num_boundary = num_boundary
        self.num_initial = num_initial
        self.num_test = num_test
        self.layers = layers
        self.activation = activation
        self.optimizer = optimizer
        self.learning_rate = learning_rate
        self.iterations = iterations
        
        # 设置模型保存目录
        if model_dir is None:
            self.model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                         "data", "models", "pinn")
        else:
            self.model_dir = model_dir
        os.makedirs(self.model_dir, exist_ok=True)
        
        # 创建DeepXDE几何体和PDE问题
        self._setup_geometry()
        self._setup_pde_problem()
    
    def _setup_geometry(self):
        """设置计算域几何"""
        # 默认实现：矩形域
        if len(self.domain_bounds) == 1:
            # 1D问题
            self.geometry = dde.geometry.Interval(self.domain_bounds[0][0], self.domain_bounds[0][1])
        elif len(self.domain_bounds) == 2:
            # 2D问题
            self.geometry = dde.geometry.Rectangle(
                [self.domain_bounds[0][0], self.domain_bounds[1][0]],
                [self.domain_bounds[0][1], self.domain_bounds[1][1]]
            )
        else:
            # 高维问题
            raise NotImplementedError("暂不支持2D以上的几何")
    
    def _setup_pde_problem(self):
        """设置PDE问题"""
        # 时间相关问题
        if self.ic_func:
            self.time_domain = dde.geometry.TimeDomain(self.domain_bounds[0][0], self.domain_bounds[0][1])
            self.geom_time_domain = dde.geometry.GeometryXTime(self.geometry, self.time_domain)
            
            # 设置边界条件
            bc = []
            if self.bc_func:
                bc.append(dde.icbc.DirichletBC(self.geom_time_domain, self.bc_func, lambda _, on_boundary: on_boundary))
            
            # 设置初始条件
            if self.ic_func:
                ic = dde.icbc.IC(self.geom_time_domain, self.ic_func, lambda _, on_initial: on_initial)
                bc.append(ic)
            
            # 创建PDE问题
            self.data = dde.data.TimePDE(
                self.geom_time_domain, 
                self.pde_func,
                bc,
                num_domain=self.num_domain,
                num_boundary=self.num_boundary,
                num_initial=self.num_initial,
                num_test=self.num_test
            )
        else:
            # 静态问题
            # 设置边界条件
            bc = []
            if self.bc_func:
                bc.append(dde.icbc.DirichletBC(self.geometry, self.bc_func, lambda _, on_boundary: on_boundary))
            
            # 创建PDE问题
            self.data = dde.data.PDE(
                self.geometry, 
                self.pde_func,
                bc,
                num_domain=self.num_domain,
                num_boundary=self.num_boundary,
                num_test=self.num_test
            )
        
        # 创建网络
        self.net = dde.nn.FNN(self.layers, self.activation, "Glorot uniform")
        self.model = dde.Model(self.data, self.net)
    
    def train(self, display_every: int = 1000):
        """训练模型"""
        logger.info(f"开始训练物理信息神经网络，总迭代次数: {self.iterations}")
        
        # 编译模型
        self.model.compile(self.optimizer, lr=self.learning_rate)
        
        # 训练模型
        loss_history, train_state = self.model.train(iterations=self.iterations, display_every=display_every)
        
        # 保存模型
        self.save_model()
        
        return loss_history
    
    def save_model(self, filename: str = None):
        """保存模型"""
        if filename is None:
            filename = f"pinn_model_{self.layers}_{self.activation}.pt"
        
        model_path = os.path.join(self.model_dir, filename)
        self.model.save(model_path)
        logger.info(f"模型已保存到 {model_path}")
    
    def load_model(self, filename: str):
        """加载模型"""
        model_path = os.path.join(self.model_dir, filename)
        self.model.restore(model_path)
        logger.info(f"模型已从 {model_path} 加载")
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """预测函数值"""
        return self.model.predict(X)
    
    def plot_result(self, X: np.ndarray, Y_true: np.ndarray = None, title: str = "PINN预测结果", save_path: str = None):
        """绘制预测结果"""
        Y_pred = self.predict(X)
        
        # 根据输入维度决定绘图方式
        if X.shape[1] == 1:
            # 1D问题
            plt.figure(figsize=(10, 6))
            plt.plot(X, Y_pred, 'r-', label='预测值')
            if Y_true is not None:
                plt.plot(X, Y_true, 'b--', label='真实值')
            plt.xlabel('x')
            plt.ylabel('u(x)')
            plt.title(title)
            plt.legend()
            plt.grid(True)
        
        elif X.shape[1] == 2:
            # 2D问题
            fig = plt.figure(figsize=(12, 5))
            
            # 预测值
            ax1 = fig.add_subplot(121, projection='3d')
            ax1.scatter(X[:, 0], X[:, 1], Y_pred[:, 0], c=Y_pred[:, 0], cmap='viridis')
            ax1.set_xlabel('x')
            ax1.set_ylabel('y')
            ax1.set_zlabel('u(x,y)')
            ax1.set_title('预测值')
            
            # 真实值（如果提供）
            if Y_true is not None:
                ax2 = fig.add_subplot(122, projection='3d')
                ax2.scatter(X[:, 0], X[:, 1], Y_true[:, 0], c=Y_true[:, 0], cmap='viridis')
                ax2.set_xlabel('x')
                ax2.set_ylabel('y')
                ax2.set_zlabel('u(x,y)')
                ax2.set_title('真实值')
            
            plt.suptitle(title)
        
        else:
            logger.warning(f"不支持绘制{X.shape[1]}维数据")
            return
        
        plt.tight_layout()
        
        # 保存图像
        if save_path:
            plt.savefig(save_path)
            logger.info(f"图像已保存到 {save_path}")
        
        plt.show()


class HeatEquationPINN(PhysicsInformedNN):
    """热传导方程的物理信息神经网络"""
    
    def __init__(
        self,
        domain_bounds: List[Tuple[float, float]] = [(0, 1), (0, 1)],  # [t, x]
        diffusivity: float = 1.0,
        **kwargs
    ):
        """
        初始化热传导方程PINN
        
        参数:
            domain_bounds: 定义域边界，格式为 [(t_min, t_max), (x_min, x_max)]
            diffusivity: 热扩散系数
        """
        self.diffusivity = diffusivity
        
        # 定义PDE残差函数：热传导方程 u_t - k * u_xx = 0
        def pde(x, y):
            u = y
            u_t = dde.grad.jacobian(y, x, i=0, j=0)
            u_xx = dde.grad.hessian(y, x, i=0, j=1, k=1)
            return u_t - self.diffusivity * u_xx
        
        # 定义初始条件：u(0, x) = sin(pi*x)
        def initial_condition(x):
            return np.sin(np.pi * x[:, 1:2])
        
        # 定义边界条件：u(t, 0) = u(t, 1) = 0
        def boundary_condition(x):
            return 0
        
        super().__init__(
            domain_bounds=domain_bounds,
            pde_func=pde,
            ic_func=initial_condition,
            bc_func=boundary_condition,
            **kwargs
        )


class WaveEquationPINN(PhysicsInformedNN):
    """波动方程的物理信息神经网络"""
    
    def __init__(
        self,
        domain_bounds: List[Tuple[float, float]] = [(0, 1), (0, 1)],  # [t, x]
        wave_speed: float = 1.0,
        **kwargs
    ):
        """
        初始化波动方程PINN
        
        参数:
            domain_bounds: 定义域边界，格式为 [(t_min, t_max), (x_min, x_max)]
            wave_speed: 波速
        """
        self.wave_speed = wave_speed
        
        # 定义PDE残差函数：波动方程 u_tt - c^2 * u_xx = 0
        def pde(x, y):
            u = y
            u_tt = dde.grad.hessian(y, x, i=0, j=0, k=0)
            u_xx = dde.grad.hessian(y, x, i=0, j=1, k=1)
            return u_tt - self.wave_speed**2 * u_xx
        
        # 定义初始条件：u(0, x) = sin(pi*x), u_t(0, x) = 0
        def initial_condition(x):
            return np.sin(np.pi * x[:, 1:2])
        
        # 定义边界条件：u(t, 0) = u(t, 1) = 0
        def boundary_condition(x):
            return 0
        
        super().__init__(
            domain_bounds=domain_bounds,
            pde_func=pde,
            ic_func=initial_condition,
            bc_func=boundary_condition,
            **kwargs
        )


class ElasticityPINN(PhysicsInformedNN):
    """弹性力学方程的物理信息神经网络"""
    
    def __init__(
        self,
        domain_bounds: List[Tuple[float, float]] = [(0, 1), (0, 1)],  # [x, y]
        youngs_modulus: float = 1.0,
        poisson_ratio: float = 0.3,
        **kwargs
    ):
        """
        初始化弹性力学方程PINN
        
        参数:
            domain_bounds: 定义域边界，格式为 [(x_min, x_max), (y_min, y_max)]
            youngs_modulus: 杨氏模量
            poisson_ratio: 泊松比
        """
        self.E = youngs_modulus
        self.nu = poisson_ratio
        self.lambda_ = self.E * self.nu / ((1 + self.nu) * (1 - 2 * self.nu))
        self.mu = self.E / (2 * (1 + self.nu))
        
        # 定义PDE残差函数：弹性力学方程
        def pde(x, y):
            # y[:, 0:1]是x方向位移，y[:, 1:2]是y方向位移
            u = y[:, 0:1]
            v = y[:, 1:2]
            
            u_x = dde.grad.jacobian(y, x, i=0, j=0)
            u_y = dde.grad.jacobian(y, x, i=0, j=1)
            v_x = dde.grad.jacobian(y, x, i=1, j=0)
            v_y = dde.grad.jacobian(y, x, i=1, j=1)
            
            u_xx = dde.grad.hessian(y, x, i=0, j=0, k=0)
            u_yy = dde.grad.hessian(y, x, i=0, j=1, k=1)
            v_xx = dde.grad.hessian(y, x, i=1, j=0, k=0)
            v_yy = dde.grad.hessian(y, x, i=1, j=1, k=1)
            
            # 平面应变条件下的纳维方程
            eq_u = (self.lambda_ + 2 * self.mu) * u_xx + self.mu * u_yy + self.lambda_ * v_xy
            eq_v = (self.lambda_ + 2 * self.mu) * v_yy + self.mu * v_xx + self.lambda_ * u_xy
            
            return [eq_u, eq_v]
        
        # 定义边界条件
        def boundary_condition(x):
            # 固定左边界
            return [0, 0]
        
        super().__init__(
            domain_bounds=domain_bounds,
            pde_func=pde,
            ic_func=None,  # 静态问题，无初始条件
            bc_func=boundary_condition,
            layers=[2, 20, 20, 20, 2],  # 输出两个位移分量
            **kwargs
        )


class PDEInverseAnalysis:
    """PDE反演分析类"""
    
    def __init__(
        self,
        pde_type: str,
        domain_bounds: List[Tuple[float, float]],
        observation_data: Dict[str, np.ndarray],
        initial_params: Dict[str, float],
        param_bounds: Dict[str, Tuple[float, float]],
        **pinn_kwargs
    ):
        """
        初始化PDE反演分析
        
        参数:
            pde_type: PDE类型，如 'heat', 'wave', 'elasticity'
            domain_bounds: 定义域边界
            observation_data: 观测数据，包含 'X' 和 'Y'
            initial_params: 参数初始值
            param_bounds: 参数边界
            pinn_kwargs: PINN的其他参数
        """
        self.pde_type = pde_type
        self.domain_bounds = domain_bounds
        self.observation_data = observation_data
        self.initial_params = initial_params
        self.param_bounds = param_bounds
        self.pinn_kwargs = pinn_kwargs
        
        # 创建结果目录
        self.results_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                       "data", "results", "inverse_analysis")
        os.makedirs(self.results_dir, exist_ok=True)
        
        # 初始化PINN模型
        self._create_pinn_model(self.initial_params)
        
        # 优化历史
        self.optimization_history = {
            'parameters': [],
            'loss': []
        }
    
    def _create_pinn_model(self, params: Dict[str, float]):
        """创建PINN模型"""
        if self.pde_type == 'heat':
            self.pinn = HeatEquationPINN(
                domain_bounds=self.domain_bounds,
                diffusivity=params.get('diffusivity', 1.0),
                **self.pinn_kwargs
            )
        elif self.pde_type == 'wave':
            self.pinn = WaveEquationPINN(
                domain_bounds=self.domain_bounds,
                wave_speed=params.get('wave_speed', 1.0),
                **self.pinn_kwargs
            )
        elif self.pde_type == 'elasticity':
            self.pinn = ElasticityPINN(
                domain_bounds=self.domain_bounds,
                youngs_modulus=params.get('youngs_modulus', 1.0),
                poisson_ratio=params.get('poisson_ratio', 0.3),
                **self.pinn_kwargs
            )
        else:
            raise ValueError(f"不支持的PDE类型: {self.pde_type}")
    
    def _compute_loss(self, params: Dict[str, float]) -> float:
        """计算给定参数下的损失"""
        # 创建新的PINN模型
        self._create_pinn_model(params)
        
        # 训练模型（少量迭代）
        self.pinn.train(display_every=1000)
        
        # 计算与观测数据的误差
        X = self.observation_data['X']
        Y_true = self.observation_data['Y']
        Y_pred = self.pinn.predict(X)
        
        mse = np.mean((Y_pred - Y_true)**2)
        
        # 记录优化历史
        self.optimization_history['parameters'].append(params.copy())
        self.optimization_history['loss'].append(mse)
        
        logger.info(f"参数: {params}, 损失: {mse}")
        
        return mse
    
    def optimize(self, method: str = 'Nelder-Mead', max_iter: int = 20):
        """
        优化PDE参数
        
        参数:
            method: 优化方法，如 'Nelder-Mead', 'BFGS', 'L-BFGS-B'
            max_iter: 最大迭代次数
        """
        from scipy.optimize import minimize
        
        # 定义目标函数
        def objective(x):
            # 将一维数组转换为参数字典
            params = {}
            for i, key in enumerate(self.initial_params.keys()):
                params[key] = x[i]
            
            return self._compute_loss(params)
        
        # 初始参数
        x0 = np.array([self.initial_params[key] for key in self.initial_params.keys()])
        
        # 参数边界
        if method in ['L-BFGS-B', 'TNC', 'SLSQP']:
            bounds = []
            for key in self.initial_params.keys():
                if key in self.param_bounds:
                    bounds.append(self.param_bounds[key])
                else:
                    bounds.append((None, None))
        else:
            bounds = None
        
        # 优化
        logger.info(f"开始优化PDE参数，方法: {method}, 最大迭代次数: {max_iter}")
        result = minimize(
            objective,
            x0,
            method=method,
            bounds=bounds,
            options={'maxiter': max_iter}
        )
        
        # 获取优化结果
        optimized_params = {}
        for i, key in enumerate(self.initial_params.keys()):
            optimized_params[key] = result.x[i]
        
        logger.info(f"优化完成，最优参数: {optimized_params}")
        logger.info(f"优化结果: {result}")
        
        # 使用最优参数创建最终模型
        self._create_pinn_model(optimized_params)
        self.pinn.train(display_every=1000)
        
        return optimized_params, result
    
    def plot_optimization_history(self, save_path: str = None):
        """绘制优化历史"""
        if not self.optimization_history['loss']:
            logger.warning("没有优化历史可绘制")
            return
        
        plt.figure(figsize=(12, 6))
        
        # 绘制损失历史
        plt.subplot(1, 2, 1)
        plt.plot(self.optimization_history['loss'], 'o-')
        plt.xlabel('迭代次数')
        plt.ylabel('损失')
        plt.title('优化损失历史')
        plt.grid(True)
        
        # 绘制参数历史
        plt.subplot(1, 2, 2)
        for i, key in enumerate(self.initial_params.keys()):
            values = [params[key] for params in self.optimization_history['parameters']]
            plt.plot(values, 'o-', label=key)
        
        plt.xlabel('迭代次数')
        plt.ylabel('参数值')
        plt.title('参数优化历史')
        plt.legend()
        plt.grid(True)
        
        plt.tight_layout()
        
        # 保存图像
        if save_path:
            plt.savefig(save_path)
            logger.info(f"优化历史图像已保存到 {save_path}")
        
        plt.show()
    
    def save_results(self, filename: str = None):
        """保存反演结果"""
        if filename is None:
            filename = f"inverse_analysis_{self.pde_type}_{len(self.optimization_history['loss'])}.npz"
        
        save_path = os.path.join(self.results_dir, filename)
        
        # 保存优化历史和最终参数
        np.savez(
            save_path,
            pde_type=self.pde_type,
            domain_bounds=self.domain_bounds,
            initial_params=self.initial_params,
            optimization_history_params=self.optimization_history['parameters'],
            optimization_history_loss=self.optimization_history['loss'],
            final_params=self.optimization_history['parameters'][-1] if self.optimization_history['parameters'] else self.initial_params
        )
        
        logger.info(f"反演结果已保存到 {save_path}")
    
    def load_results(self, filename: str):
        """加载反演结果"""
        load_path = os.path.join(self.results_dir, filename)
        
        data = np.load(load_path, allow_pickle=True)
        
        self.pde_type = str(data['pde_type'])
        self.domain_bounds = data['domain_bounds'].tolist()
        self.initial_params = data['initial_params'].item()
        
        # 加载优化历史
        self.optimization_history['parameters'] = data['optimization_history_params'].tolist()
        self.optimization_history['loss'] = data['optimization_history_loss'].tolist()
        
        # 创建最终模型
        final_params = data['final_params'].item()
        self._create_pinn_model(final_params)
        
        logger.info(f"反演结果已从 {load_path} 加载")
        logger.info(f"最终参数: {final_params}")
        
        return final_params


# 示例用法
if __name__ == "__main__":
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
    
    # 训练模型
    heat_pinn.train(display_every=1000)
    
    # 生成测试点
    t_test = np.linspace(0, 1, 100)
    x_test = np.linspace(0, 1, 100)
    T, X = np.meshgrid(t_test, x_test)
    X_test = np.vstack((T.flatten(), X.flatten())).T
    
    # 计算解析解
    diffusivity = 0.1
    Y_true = np.exp(-diffusivity * np.pi**2 * X_test[:, 0:1]) * np.sin(np.pi * X_test[:, 1:2])
    
    # 绘制结果
    heat_pinn.plot_result(
        X_test, 
        Y_true, 
        title="热传导方程PINN结果", 
        save_path=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                              "data", "results", "heat_equation_pinn.png")
    )