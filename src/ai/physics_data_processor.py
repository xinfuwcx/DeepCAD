#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""物理AI数据处理工具

本模块提供了处理和准备物理信息神经网络(PINN)训练数据的工具函数。
包括数据采样、预处理和转换等功能。
"""

import os
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import logging
from typing import Dict, List, Tuple, Union, Optional, Any
from pathlib import Path
import json
import datetime

# 配置日志
logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
os.makedirs(logs_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(logs_dir, "physics_data_processor.log"), mode="a", encoding="utf-8")
    ]
)
logger = logging.getLogger("PhysicsDataProcessor")

class PhysicsDataProcessor:
    """物理AI数据处理器"""
    
    def __init__(
        self,
        project_id: int,
        data_dir: str = None,
        results_dir: str = None
    ):
        """
        初始化物理数据处理器
        
        Args:
            project_id: 项目ID
            data_dir: 数据目录
            results_dir: 结果目录
        """
        self.project_id = project_id
        
        # 设置数据目录
        if data_dir is None:
            self.data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                                        "data")
        else:
            self.data_dir = data_dir
        
        # 设置结果目录
        if results_dir is None:
            self.results_dir = os.path.join(self.data_dir, "results", "physics_ai")
        else:
            self.results_dir = results_dir
        os.makedirs(self.results_dir, exist_ok=True)
        
        logger.info(f"物理数据处理器初始化完成，项目ID: {project_id}")
    
    def generate_training_data(
        self,
        domain_bounds: List[List[float]],
        n_samples: int = 1000,
        sampling_method: str = "uniform",
        seed: int = None
    ) -> Dict[str, np.ndarray]:
        """
        生成训练数据点
        
        Args:
            domain_bounds: 定义域边界 [[x_min, x_max], [y_min, y_max], ...]
            n_samples: 采样点数量
            sampling_method: 采样方法 ('uniform', 'random', 'grid')
            seed: 随机种子
            
        Returns:
            采样点字典
        """
        if seed is not None:
            np.random.seed(seed)
        
        dim = len(domain_bounds)
        
        if sampling_method == "uniform":
            # 均匀随机采样
            samples = np.zeros((n_samples, dim))
            for i, bounds in enumerate(domain_bounds):
                samples[:, i] = np.random.uniform(bounds[0], bounds[1], n_samples)
                
        elif sampling_method == "grid":
            # 网格采样
            points_per_dim = int(n_samples ** (1/dim))
            grid_points = points_per_dim ** dim
            
            if grid_points > n_samples:
                logger.warning(f"网格采样将生成 {grid_points} 个点，超过请求的 {n_samples} 个点")
            
            # 创建每个维度的坐标
            coords = []
            for bounds in domain_bounds:
                coords.append(np.linspace(bounds[0], bounds[1], points_per_dim))
            
            # 生成网格点
            mesh_coords = np.meshgrid(*coords)
            samples = np.vstack([coord.flatten() for coord in mesh_coords]).T
            
        else:  # 默认为随机采样
            # 随机采样
            samples = np.zeros((n_samples, dim))
            for i, bounds in enumerate(domain_bounds):
                samples[:, i] = np.random.uniform(bounds[0], bounds[1], n_samples)
        
        logger.info(f"生成 {len(samples)} 个训练数据点，采样方法: {sampling_method}")
        
        return {
            "samples": samples,
            "domain_bounds": domain_bounds,
            "sampling_method": sampling_method
        }
    
    def generate_pde_points(
        self,
        domain_bounds: List[List[float]],
        n_samples: int = 5000,
        sampling_method: str = "uniform",
        seed: int = None
    ) -> Dict[str, np.ndarray]:
        """
        生成PDE约束点
        
        Args:
            domain_bounds: 定义域边界 [[x_min, x_max], [y_min, y_max], ...]
            n_samples: 采样点数量
            sampling_method: 采样方法 ('uniform', 'random', 'grid')
            seed: 随机种子
            
        Returns:
            PDE约束点字典
        """
        # 使用与训练数据相同的生成方法
        pde_data = self.generate_training_data(
            domain_bounds=domain_bounds,
            n_samples=n_samples,
            sampling_method=sampling_method,
            seed=seed
        )
        
        logger.info(f"生成 {len(pde_data['samples'])} 个PDE约束点")
        
        return pde_data
    
    def generate_boundary_points(
        self,
        domain_bounds: List[List[float]],
        n_samples_per_boundary: int = 100,
        seed: int = None
    ) -> Dict[str, np.ndarray]:
        """
        生成边界点
        
        Args:
            domain_bounds: 定义域边界 [[x_min, x_max], [y_min, y_max], ...]
            n_samples_per_boundary: 每个边界的采样点数量
            seed: 随机种子
            
        Returns:
            边界点字典
        """
        if seed is not None:
            np.random.seed(seed)
        
        dim = len(domain_bounds)
        boundary_points = []
        boundary_normals = []
        boundary_ids = []
        
        for i in range(dim):
            for j, bound_value in enumerate([domain_bounds[i][0], domain_bounds[i][1]]):
                # 为该边界生成点
                points = np.zeros((n_samples_per_boundary, dim))
                
                # 固定当前维度的值为边界值
                points[:, i] = bound_value
                
                # 其他维度随机采样
                for k in range(dim):
                    if k != i:
                        points[:, k] = np.random.uniform(
                            domain_bounds[k][0],
                            domain_bounds[k][1],
                            n_samples_per_boundary
                        )
                
                # 计算边界法向量
                normal = np.zeros(dim)
                normal[i] = 1.0 if j == 0 else -1.0
                
                # 添加到结果中
                boundary_points.append(points)
                boundary_normals.extend([normal] * n_samples_per_boundary)
                boundary_ids.extend([i * 2 + j] * n_samples_per_boundary)
        
        # 合并所有边界点
        boundary_points = np.vstack(boundary_points)
        boundary_normals = np.array(boundary_normals)
        boundary_ids = np.array(boundary_ids)
        
        logger.info(f"生成 {len(boundary_points)} 个边界点")
        
        return {
            "points": boundary_points,
            "normals": boundary_normals,
            "boundary_ids": boundary_ids,
            "domain_bounds": domain_bounds
        }
    
    def load_sensor_data(
        self,
        sensor_file: str,
        columns: List[str] = None,
        filter_criteria: Dict[str, Any] = None
    ) -> pd.DataFrame:
        """
        加载传感器数据
        
        Args:
            sensor_file: 传感器数据文件路径
            columns: 要加载的列名列表
            filter_criteria: 过滤条件
            
        Returns:
            传感器数据DataFrame
        """
        try:
            # 确定文件类型
            file_ext = os.path.splitext(sensor_file)[1].lower()
            
            if file_ext == '.csv':
                df = pd.read_csv(sensor_file)
            elif file_ext in ['.xls', '.xlsx']:
                df = pd.read_excel(sensor_file)
            elif file_ext == '.json':
                df = pd.read_json(sensor_file)
            else:
                logger.error(f"不支持的文件格式: {file_ext}")
                return pd.DataFrame()
            
            # 选择列
            if columns is not None:
                df = df[columns]
            
            # 应用过滤条件
            if filter_criteria is not None:
                for column, value in filter_criteria.items():
                    if isinstance(value, list):
                        df = df[df[column].isin(value)]
                    else:
                        df = df[df[column] == value]
            
            logger.info(f"加载 {len(df)} 条传感器数据记录，来自 {sensor_file}")
            return df
            
        except Exception as e:
            logger.error(f"加载传感器数据出错: {str(e)}")
            return pd.DataFrame()
    
    def preprocess_data(
        self,
        data: Union[np.ndarray, pd.DataFrame],
        normalize: bool = True,
        remove_outliers: bool = True,
        fill_missing: bool = True
    ) -> Union[np.ndarray, pd.DataFrame]:
        """
        预处理数据
        
        Args:
            data: 输入数据
            normalize: 是否标准化
            remove_outliers: 是否移除异常值
            fill_missing: 是否填充缺失值
            
        Returns:
            处理后的数据
        """
        if isinstance(data, pd.DataFrame):
            # 处理DataFrame
            df = data.copy()
            
            # 填充缺失值
            if fill_missing and df.isnull().any().any():
                df = df.fillna(df.mean())
                logger.info("填充缺失值")
            
            # 移除异常值
            if remove_outliers:
                for col in df.select_dtypes(include=[np.number]).columns:
                    mean_val = df[col].mean()
                    std_val = df[col].std()
                    df = df[(df[col] - mean_val).abs() <= 3 * std_val]
                logger.info(f"移除异常值后剩余 {len(df)} 条记录")
            
            # 标准化
            if normalize:
                for col in df.select_dtypes(include=[np.number]).columns:
                    df[col] = (df[col] - df[col].mean()) / df[col].std()
                logger.info("数据已标准化")
            
            return df
            
        elif isinstance(data, np.ndarray):
            # 处理NumPy数组
            processed_data = data.copy()
            
            # 填充缺失值
            if fill_missing and np.isnan(processed_data).any():
                col_means = np.nanmean(processed_data, axis=0)
                inds = np.where(np.isnan(processed_data))
                processed_data[inds] = np.take(col_means, inds[1])
                logger.info("填充缺失值")
            
            # 移除异常值
            if remove_outliers:
                mask = np.ones(processed_data.shape[0], dtype=bool)
                for j in range(processed_data.shape[1]):
                    column = processed_data[:, j]
                    mean_val = np.mean(column)
                    std_val = np.std(column)
                    mask = mask & (np.abs(column - mean_val) <= 3 * std_val)
                
                processed_data = processed_data[mask]
                logger.info(f"移除异常值后剩余 {len(processed_data)} 条记录")
            
            # 标准化
            if normalize:
                mean_vals = np.mean(processed_data, axis=0)
                std_vals = np.std(processed_data, axis=0)
                processed_data = (processed_data - mean_vals) / std_vals
                logger.info("数据已标准化")
            
            return processed_data
            
        else:
            logger.error(f"不支持的数据类型: {type(data)}")
            return data
    
    def split_data(
        self,
        data: Union[np.ndarray, pd.DataFrame],
        target_columns: Union[List[str], List[int]] = None,
        test_size: float = 0.2,
        validation_size: float = 0.1,
        shuffle: bool = True,
        seed: int = None
    ) -> Dict[str, Any]:
        """
        拆分数据为训练集、验证集和测试集
        
        Args:
            data: 输入数据
            target_columns: 目标列（特征列之外的列）
            test_size: 测试集比例
            validation_size: 验证集比例
            shuffle: 是否打乱数据
            seed: 随机种子
            
        Returns:
            拆分后的数据字典
        """
        if seed is not None:
            np.random.seed(seed)
        
        if isinstance(data, pd.DataFrame):
            # 处理DataFrame
            if target_columns is None:
                logger.error("使用DataFrame时必须指定target_columns")
                return {}
            
            # 提取特征和目标
            X = data.drop(columns=target_columns).values
            y = data[target_columns].values
            
        elif isinstance(data, np.ndarray):
            # 处理NumPy数组
            if target_columns is None:
                # 假设最后一列是目标
                X = data[:, :-1]
                y = data[:, -1:]
            else:
                # 使用指定的列作为目标
                feature_cols = [i for i in range(data.shape[1]) if i not in target_columns]
                X = data[:, feature_cols]
                y = data[:, target_columns]
        else:
            logger.error(f"不支持的数据类型: {type(data)}")
            return {}
        
        # 计算各集合的大小
        n_samples = len(X)
        n_test = int(test_size * n_samples)
        n_val = int(validation_size * n_samples)
        n_train = n_samples - n_test - n_val
        
        # 打乱数据
        if shuffle:
            indices = np.random.permutation(n_samples)
            X = X[indices]
            y = y[indices]
        
        # 拆分数据
        X_train = X[:n_train]
        y_train = y[:n_train]
        
        X_val = X[n_train:n_train+n_val]
        y_val = y[n_train:n_train+n_val]
        
        X_test = X[n_train+n_val:]
        y_test = y[n_train+n_val:]
        
        logger.info(f"数据拆分完成: 训练集 {len(X_train)}，验证集 {len(X_val)}，测试集 {len(X_test)}")
        
        return {
            "X_train": X_train,
            "y_train": y_train,
            "X_val": X_val,
            "y_val": y_val,
            "X_test": X_test,
            "y_test": y_test
        }
    
    def save_processed_data(
        self,
        data: Dict[str, Any],
        output_file: str = None
    ) -> str:
        """
        保存处理后的数据
        
        Args:
            data: 数据字典
            output_file: 输出文件路径
            
        Returns:
            保存的文件路径
        """
        if output_file is None:
            # 生成默认文件名
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(self.results_dir, f"processed_data_{timestamp}.npz")
        
        try:
            # 确保目录存在
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            
            # 保存为NumPy压缩文件
            np.savez_compressed(output_file, **data)
            
            logger.info(f"数据已保存到 {output_file}")
            return output_file
            
        except Exception as e:
            logger.error(f"保存数据出错: {str(e)}")
            return ""
    
    def load_processed_data(self, input_file: str) -> Dict[str, Any]:
        """
        加载处理后的数据
        
        Args:
            input_file: 输入文件路径
            
        Returns:
            加载的数据字典
        """
        try:
            data = dict(np.load(input_file))
            logger.info(f"从 {input_file} 加载数据")
            return data
            
        except Exception as e:
            logger.error(f"加载数据出错: {str(e)}")
            return {}
    
    def visualize_data(
        self,
        data: Union[np.ndarray, pd.DataFrame, Dict[str, np.ndarray]],
        plot_type: str = "scatter",
        x_column: Union[str, int] = 0,
        y_column: Union[str, int] = 1,
        z_column: Union[str, int] = None,
        title: str = "Data Visualization",
        save_path: str = None
    ) -> bool:
        """
        可视化数据
        
        Args:
            data: 输入数据
            plot_type: 图表类型 ('scatter', 'line', 'surface', 'contour')
            x_column: X轴列
            y_column: Y轴列
            z_column: Z轴列（用于3D图）
            title: 图表标题
            save_path: 保存路径
            
        Returns:
            是否成功可视化
        """
        try:
            plt.figure(figsize=(10, 8))
            
            # 提取数据
            if isinstance(data, dict):
                # 如果是字典，尝试使用X_train和y_train
                if "X_train" in data and "y_train" in data:
                    X = data["X_train"]
                    y = data["y_train"]
                else:
                    # 使用字典中的第一个数组
                    X = list(data.values())[0]
                    y = list(data.values())[1] if len(data) > 1 else None
            elif isinstance(data, pd.DataFrame):
                # 如果是DataFrame，使用指定的列
                X = data[x_column].values if isinstance(x_column, str) else data.iloc[:, x_column].values
                Y = data[y_column].values if isinstance(y_column, str) else data.iloc[:, y_column].values
                Z = None
                if z_column is not None:
                    Z = data[z_column].values if isinstance(z_column, str) else data.iloc[:, z_column].values
            elif isinstance(data, np.ndarray):
                # 如果是NumPy数组，使用指定的列
                X = data[:, x_column]
                Y = data[:, y_column]
                Z = None
                if z_column is not None and data.shape[1] > z_column:
                    Z = data[:, z_column]
            else:
                logger.error(f"不支持的数据类型: {type(data)}")
                return False
            
            # 绘制图表
            if plot_type == "scatter":
                if Z is not None:
                    ax = plt.figure().add_subplot(111, projection='3d')
                    scatter = ax.scatter(X, Y, Z, c=Z, cmap='viridis')
                    ax.set_zlabel('Z')
                    plt.colorbar(scatter)
                else:
                    plt.scatter(X, Y)
            
            elif plot_type == "line":
                plt.plot(X, Y)
            
            elif plot_type == "surface" and Z is not None:
                # 对于surface图，需要重塑数据为网格
                from matplotlib import cm
                ax = plt.figure().add_subplot(111, projection='3d')
                
                # 尝试将数据重塑为网格
                try:
                    n_points = int(np.sqrt(len(X)))
                    X_grid = X.reshape(n_points, n_points)
                    Y_grid = Y.reshape(n_points, n_points)
                    Z_grid = Z.reshape(n_points, n_points)
                    
                    surf = ax.plot_surface(X_grid, Y_grid, Z_grid, cmap=cm.coolwarm)
                    plt.colorbar(surf)
                except:
                    logger.warning("无法将数据重塑为网格，使用散点图代替")
                    ax.scatter(X, Y, Z, c=Z, cmap='viridis')
                
                ax.set_zlabel('Z')
            
            elif plot_type == "contour" and Z is not None:
                # 对于contour图，需要重塑数据为网格
                try:
                    n_points = int(np.sqrt(len(X)))
                    X_grid = X.reshape(n_points, n_points)
                    Y_grid = Y.reshape(n_points, n_points)
                    Z_grid = Z.reshape(n_points, n_points)
                    
                    contour = plt.contourf(X_grid, Y_grid, Z_grid, cmap='viridis')
                    plt.colorbar(contour)
                except:
                    logger.warning("无法将数据重塑为网格，使用散点图代替")
                    plt.scatter(X, Y, c=Z, cmap='viridis')
                    plt.colorbar()
            
            else:
                plt.scatter(X, Y)
            
            plt.title(title)
            plt.xlabel('X')
            plt.ylabel('Y')
            plt.grid(True)
            
            # 保存图表
            if save_path:
                plt.savefig(save_path)
                logger.info(f"图表已保存到 {save_path}")
            
            plt.close()
            return True
            
        except Exception as e:
            logger.error(f"可视化数据出错: {str(e)}")
            return False

def main():
    """测试函数"""
    # 创建物理数据处理器
    processor = PhysicsDataProcessor(project_id=1)
    
    # 生成训练数据
    domain_bounds = [[-1, 1], [-1, 1]]
    training_data = processor.generate_training_data(
        domain_bounds=domain_bounds,
        n_samples=500,
        sampling_method="uniform",
        seed=42
    )
    
    # 生成合成目标值（简单的二次函数）
    X = training_data["samples"]
    y = np.zeros((X.shape[0], 1))
    for i in range(X.shape[0]):
        x, y_coord = X[i]
        y[i, 0] = 0.5 * (x**2 + y_coord**2)
    
    # 合并特征和目标
    data = np.hstack((X, y))
    
    # 预处理数据
    processed_data = processor.preprocess_data(data, normalize=True)
    
    # 拆分数据
    split_data = processor.split_data(processed_data, target_columns=[-1], test_size=0.2)
    
    # 可视化数据
    processor.visualize_data(
        split_data,
        plot_type="scatter",
        x_column=0,
        y_column=1,
        z_column=2,
        title="训练数据可视化",
        save_path=os.path.join(processor.results_dir, "training_data_visualization.png")
    )
    
    # 保存处理后的数据
    output_file = os.path.join(processor.results_dir, "training_data.npz")
    processor.save_processed_data(split_data, output_file)
    
    print(f"处理完成，数据已保存到 {output_file}")

if __name__ == "__main__":
    main() 