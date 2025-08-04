"""
基于RBF的非均匀钻孔数据插值模块
针对基坑密集+外围稀疏的钻孔分布优化
"""
import numpy as np
import pandas as pd
from scipy.interpolate import RBFInterpolator
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt
from typing import Tuple, Dict, List, Optional, Union
import warnings

class BoreholeRBFInterpolator:
    """
    钻孔数据RBF插值器
    支持分区域插值和自适应参数调整
    """
    
    def __init__(self, 
                 foundation_pit_bounds: Optional[Dict[str, Tuple[float, float]]] = None,
                 kernel: str = 'multiquadric',
                 epsilon: Union[float, str] = 'scale',
                 smoothing: float = 0.0,
                 degree: Optional[int] = None):
        """
        初始化RBF插值器
        
        Parameters:
        -----------
        foundation_pit_bounds : dict, optional
            基坑边界 {'x': (xmin, xmax), 'y': (ymin, ymax), 'z': (zmin, zmax)}
        kernel : str
            RBF核函数类型 ('multiquadric', 'inverse_multiquadric', 'gaussian', 
            'linear', 'cubic', 'quintic', 'thin_plate_spline')
        epsilon : float or 'scale'
            形状参数，'scale'表示自动调整
        smoothing : float
            平滑参数，用于处理噪声数据
        degree : int, optional
            多项式阶数，用于趋势面拟合
        """
        self.foundation_pit_bounds = foundation_pit_bounds
        self.kernel = kernel
        self.epsilon = epsilon
        self.smoothing = smoothing
        self.degree = degree
        
        # 插值器存储
        self.dense_interpolator = None
        self.sparse_interpolator = None
        self.global_interpolator = None
        
        # 数据预处理
        self.scaler_coords = StandardScaler()
        self.scaler_values = StandardScaler()
        
        # 分区标识
        self.dense_mask = None
        self.sparse_mask = None
        
    def _identify_regions(self, coords: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        识别密集区域和稀疏区域
        
        Parameters:
        -----------
        coords : array-like, shape (n_points, 2 or 3)
            坐标点 (x, y) 或 (x, y, z)
            
        Returns:
        --------
        dense_mask : array, shape (n_points,)
            密集区域掩码
        sparse_mask : array, shape (n_points,)
            稀疏区域掩码
        """
        coords = np.asarray(coords)
        n_points = coords.shape[0]
        
        if self.foundation_pit_bounds is None:
            # 如果没有指定基坑边界，自动识别密集区域
            return self._auto_identify_regions(coords)
        
        # 基于基坑边界识别
        dense_mask = np.ones(n_points, dtype=bool)
        
        if 'x' in self.foundation_pit_bounds:
            x_min, x_max = self.foundation_pit_bounds['x']
            dense_mask &= (coords[:, 0] >= x_min) & (coords[:, 0] <= x_max)
            
        if 'y' in self.foundation_pit_bounds:
            y_min, y_max = self.foundation_pit_bounds['y']
            dense_mask &= (coords[:, 1] >= y_min) & (coords[:, 1] <= y_max)
            
        if coords.shape[1] >= 3 and 'z' in self.foundation_pit_bounds:
            z_min, z_max = self.foundation_pit_bounds['z']
            dense_mask &= (coords[:, 2] >= z_min) & (coords[:, 2] <= z_max)
        
        sparse_mask = ~dense_mask
        
        return dense_mask, sparse_mask
    
    def _auto_identify_regions(self, coords: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        自动识别密集和稀疏区域
        基于最近邻距离统计
        """
        from sklearn.neighbors import NearestNeighbors
        
        # 计算每个点到最近邻的平均距离
        k = min(5, len(coords) - 1)  # 考虑最近的5个邻居
        nbrs = NearestNeighbors(n_neighbors=k+1).fit(coords[:, :2])  # 只考虑xy坐标
        distances, _ = nbrs.kneighbors(coords[:, :2])
        
        # 计算平均距离（排除自身）
        avg_distances = np.mean(distances[:, 1:], axis=1)
        
        # 基于距离阈值识别密集区域
        threshold = np.percentile(avg_distances, 50)  # 使用中位数作为阈值
        dense_mask = avg_distances <= threshold
        sparse_mask = ~dense_mask
        
        return dense_mask, sparse_mask
    
    def _optimize_epsilon(self, coords: np.ndarray, values: np.ndarray, 
                         mask: np.ndarray) -> float:
        """
        优化epsilon参数
        使用交叉验证选择最优值
        """
        if len(coords[mask]) < 4:
            return 1.0
            
        # 候选epsilon值
        epsilons = np.logspace(-3, 2, 10)
        scores = []
        
        coords_subset = coords[mask]
        values_subset = values[mask]
        
        for eps in epsilons:
            try:
                # 使用留一法交叉验证
                interpolator = RBFInterpolator(
                    coords_subset, values_subset,
                    kernel=self.kernel,
                    epsilon=eps,
                    smoothing=self.smoothing,
                    degree=self.degree
                )
                
                # 简单的hold-out验证（避免过度计算）
                if len(coords_subset) > 10:
                    test_idx = np.random.choice(len(coords_subset), 
                                              size=max(2, len(coords_subset)//5), 
                                              replace=False)
                    train_idx = np.setdiff1d(np.arange(len(coords_subset)), test_idx)
                    
                    train_interpolator = RBFInterpolator(
                        coords_subset[train_idx], values_subset[train_idx],
                        kernel=self.kernel, epsilon=eps,
                        smoothing=self.smoothing, degree=self.degree
                    )
                    
                    pred = train_interpolator(coords_subset[test_idx])
                    score = r2_score(values_subset[test_idx], pred)
                    scores.append(score)
                else:
                    scores.append(0.5)  # 默认分数
                    
            except Exception:
                scores.append(-1)  # 惩罚失败的参数
        
        # 选择最佳epsilon
        best_idx = np.argmax(scores)
        return epsilons[best_idx]
    
    def fit(self, coords: np.ndarray, values: np.ndarray, 
            optimize_params: bool = True) -> 'BoreholeRBFInterpolator':
        """
        拟合RBF插值器
        
        Parameters:
        -----------
        coords : array-like, shape (n_points, 2 or 3)
            坐标点
        values : array-like, shape (n_points,)
            对应的值（如地层标高、岩土参数等）
        optimize_params : bool
            是否优化参数
            
        Returns:
        --------
        self : BoreholeRBFInterpolator
        """
        coords = np.asarray(coords)
        values = np.asarray(values)
        
        if coords.shape[0] != len(values):
            raise ValueError("坐标点数量与值的数量不匹配")
        
        # 数据预处理
        coords_scaled = self.scaler_coords.fit_transform(coords)
        values_scaled = self.scaler_values.fit_transform(values.reshape(-1, 1)).ravel()
        
        # 识别区域
        self.dense_mask, self.sparse_mask = self._identify_regions(coords)
        
        print(f"密集区域点数: {np.sum(self.dense_mask)}")
        print(f"稀疏区域点数: {np.sum(self.sparse_mask)}")
        
        # 分区域拟合
        if np.sum(self.dense_mask) > 3:
            epsilon_dense = (self._optimize_epsilon(coords_scaled, values_scaled, self.dense_mask) 
                           if optimize_params and self.epsilon == 'scale' else self.epsilon)
            
            self.dense_interpolator = RBFInterpolator(
                coords_scaled[self.dense_mask],
                values_scaled[self.dense_mask],
                kernel=self.kernel,
                epsilon=epsilon_dense if epsilon_dense != 'scale' else 1.0,
                smoothing=self.smoothing,
                degree=self.degree
            )
            print(f"密集区域epsilon: {epsilon_dense}")
        
        if np.sum(self.sparse_mask) > 3:
            epsilon_sparse = (self._optimize_epsilon(coords_scaled, values_scaled, self.sparse_mask)
                            if optimize_params and self.epsilon == 'scale' else self.epsilon)
            
            # 稀疏区域使用更大的smoothing参数
            sparse_smoothing = max(self.smoothing, 0.1)
            
            self.sparse_interpolator = RBFInterpolator(
                coords_scaled[self.sparse_mask],
                values_scaled[self.sparse_mask],
                kernel='gaussian',  # 稀疏区域使用高斯核更平滑
                epsilon=epsilon_sparse if epsilon_sparse != 'scale' else 1.0,
                smoothing=sparse_smoothing,
                degree=1  # 使用线性趋势
            )
            print(f"稀疏区域epsilon: {epsilon_sparse}")
        
        # 全局插值器作为备选
        epsilon_global = (self._optimize_epsilon(coords_scaled, values_scaled, 
                                               np.ones(len(coords), dtype=bool))
                         if optimize_params and self.epsilon == 'scale' else self.epsilon)
        
        self.global_interpolator = RBFInterpolator(
            coords_scaled, values_scaled,
            kernel=self.kernel,
            epsilon=epsilon_global if epsilon_global != 'scale' else 1.0,
            smoothing=self.smoothing,
            degree=self.degree
        )
        
        return self
    
    def predict(self, coords: np.ndarray, 
                method: str = 'adaptive') -> np.ndarray:
        """
        预测新点的值
        
        Parameters:
        -----------
        coords : array-like, shape (n_points, 2 or 3)
            待预测的坐标点
        method : str
            插值方法 ('adaptive', 'dense', 'sparse', 'global', 'weighted')
            
        Returns:
        --------
        predictions : array, shape (n_points,)
            预测值
        """
        coords = np.asarray(coords)
        coords_scaled = self.scaler_coords.transform(coords)
        
        if method == 'global':
            pred_scaled = self.global_interpolator(coords_scaled)
        elif method == 'weighted':
            pred_scaled = self._weighted_prediction(coords_scaled)
        elif method == 'adaptive':
            pred_scaled = self._adaptive_prediction(coords_scaled)
        else:
            raise ValueError(f"不支持的方法: {method}")
        
        # 反标准化
        predictions = self.scaler_values.inverse_transform(
            pred_scaled.reshape(-1, 1)
        ).ravel()
        
        return predictions
    
    def _weighted_prediction(self, coords_scaled: np.ndarray) -> np.ndarray:
        """
        加权融合预测
        基于距离到各区域中心的权重
        """
        predictions = np.zeros(len(coords_scaled))
        
        # 计算到密集区域和稀疏区域中心的距离
        if self.dense_interpolator is not None and self.sparse_interpolator is not None:
            dense_coords = self.scaler_coords.transform(
                self.scaler_coords.inverse_transform(
                    self.scaler_coords.transform(coords_scaled)
                )[self.dense_mask]
            )
            sparse_coords = self.scaler_coords.transform(
                self.scaler_coords.inverse_transform(
                    self.scaler_coords.transform(coords_scaled)
                )[self.sparse_mask]  
            )
            
            dense_center = np.mean(dense_coords, axis=0)
            sparse_center = np.mean(sparse_coords, axis=0)
            
            # 计算距离权重
            dist_to_dense = np.linalg.norm(coords_scaled - dense_center, axis=1)
            dist_to_sparse = np.linalg.norm(coords_scaled - sparse_center, axis=1)
            
            # 权重计算（距离越近权重越大）
            weight_dense = 1.0 / (1.0 + dist_to_dense)
            weight_sparse = 1.0 / (1.0 + dist_to_sparse)
            
            # 归一化权重
            total_weight = weight_dense + weight_sparse
            weight_dense /= total_weight
            weight_sparse /= total_weight
            
            # 加权预测
            pred_dense = self.dense_interpolator(coords_scaled)
            pred_sparse = self.sparse_interpolator(coords_scaled)
            
            predictions = weight_dense * pred_dense + weight_sparse * pred_sparse
        else:
            predictions = self.global_interpolator(coords_scaled)
            
        return predictions
    
    def _adaptive_prediction(self, coords_scaled: np.ndarray) -> np.ndarray:
        """
        自适应预测
        根据预测点位置选择最适合的插值器
        """
        predictions = np.zeros(len(coords_scaled))
        
        # 判断预测点属于哪个区域
        coords_original = self.scaler_coords.inverse_transform(coords_scaled)
        pred_dense_mask, pred_sparse_mask = self._identify_regions(coords_original)
        
        # 对密集区域点使用密集插值器
        if self.dense_interpolator is not None and np.any(pred_dense_mask):
            predictions[pred_dense_mask] = self.dense_interpolator(
                coords_scaled[pred_dense_mask]
            )
        
        # 对稀疏区域点使用稀疏插值器或全局插值器
        if np.any(pred_sparse_mask):
            if self.sparse_interpolator is not None:
                predictions[pred_sparse_mask] = self.sparse_interpolator(
                    coords_scaled[pred_sparse_mask]
                )
            else:
                predictions[pred_sparse_mask] = self.global_interpolator(
                    coords_scaled[pred_sparse_mask]
                )
        
        # 对于没有对应插值器的区域，使用全局插值器
        no_interpolator_mask = np.zeros(len(coords_scaled), dtype=bool)
        if self.dense_interpolator is None:
            no_interpolator_mask |= pred_dense_mask
        if self.sparse_interpolator is None:
            no_interpolator_mask |= pred_sparse_mask
            
        if np.any(no_interpolator_mask):
            predictions[no_interpolator_mask] = self.global_interpolator(
                coords_scaled[no_interpolator_mask]
            )
        
        return predictions
    
    def cross_validate(self, coords: np.ndarray, values: np.ndarray, 
                      cv_folds: int = 5) -> Dict[str, float]:
        """
        交叉验证评估插值性能
        
        Parameters:
        -----------
        coords : array-like, shape (n_points, 2 or 3)
            坐标点
        values : array-like, shape (n_points,)
            对应的值
        cv_folds : int
            交叉验证折数
            
        Returns:
        --------
        scores : dict
            包含RMSE, MAE, R2等评估指标
        """
        from sklearn.model_selection import KFold
        
        coords = np.asarray(coords)
        values = np.asarray(values)
        
        kf = KFold(n_splits=cv_folds, shuffle=True, random_state=42)
        
        rmse_scores = []
        r2_scores = []
        mae_scores = []
        
        for train_idx, test_idx in kf.split(coords):
            # 训练
            self.fit(coords[train_idx], values[train_idx])
            
            # 预测
            pred = self.predict(coords[test_idx])
            
            # 评估
            rmse = np.sqrt(mean_squared_error(values[test_idx], pred))
            r2 = r2_score(values[test_idx], pred)
            mae = np.mean(np.abs(values[test_idx] - pred))
            
            rmse_scores.append(rmse)
            r2_scores.append(r2)
            mae_scores.append(mae)
        
        return {
            'RMSE': np.mean(rmse_scores),
            'RMSE_std': np.std(rmse_scores),
            'R2': np.mean(r2_scores),
            'R2_std': np.std(r2_scores),
            'MAE': np.mean(mae_scores),
            'MAE_std': np.std(mae_scores)
        }
    
    def plot_interpolation_result(self, coords: np.ndarray, values: np.ndarray,
                                 grid_resolution: int = 100,
                                 method: str = 'adaptive'):
        """
        可视化插值结果
        """
        # 创建网格
        x_min, x_max = coords[:, 0].min(), coords[:, 0].max()
        y_min, y_max = coords[:, 1].min(), coords[:, 1].max()
        
        x_range = x_max - x_min
        y_range = y_max - y_min
        x_min -= 0.1 * x_range
        x_max += 0.1 * x_range
        y_min -= 0.1 * y_range
        y_max += 0.1 * y_range
        
        xi = np.linspace(x_min, x_max, grid_resolution)
        yi = np.linspace(y_min, y_max, grid_resolution)
        xi_grid, yi_grid = np.meshgrid(xi, yi)
        
        grid_coords = np.column_stack([xi_grid.ravel(), yi_grid.ravel()])
        if coords.shape[1] == 3:
            # 如果原始数据是3D，使用平均Z值
            avg_z = np.mean(coords[:, 2])
            grid_coords = np.column_stack([grid_coords, 
                                         np.full(len(grid_coords), avg_z)])
        
        # 插值预测
        zi = self.predict(grid_coords, method=method)
        zi_grid = zi.reshape(xi_grid.shape)
        
        # 绘图
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # 插值结果
        im1 = ax1.contourf(xi_grid, yi_grid, zi_grid, levels=20, cmap='viridis')
        scatter = ax1.scatter(coords[:, 0], coords[:, 1], c=values, 
                            cmap='viridis', s=50, edgecolor='white', linewidth=1)
        ax1.set_title(f'RBF插值结果 ({method})')
        ax1.set_xlabel('X坐标')
        ax1.set_ylabel('Y坐标')
        plt.colorbar(im1, ax=ax1)
        
        # 数据分布
        if hasattr(self, 'dense_mask') and self.dense_mask is not None:
            ax2.scatter(coords[self.dense_mask, 0], coords[self.dense_mask, 1], 
                       c='red', label='密集区域', s=50, alpha=0.7)
            ax2.scatter(coords[self.sparse_mask, 0], coords[self.sparse_mask, 1], 
                       c='blue', label='稀疏区域', s=50, alpha=0.7)
        else:
            ax2.scatter(coords[:, 0], coords[:, 1], c='gray', s=50, alpha=0.7)
        
        if self.foundation_pit_bounds:
            # 绘制基坑边界
            x_bounds = self.foundation_pit_bounds.get('x', (x_min, x_max))
            y_bounds = self.foundation_pit_bounds.get('y', (y_min, y_max))
            
            rect = plt.Rectangle((x_bounds[0], y_bounds[0]), 
                               x_bounds[1] - x_bounds[0],
                               y_bounds[1] - y_bounds[0],
                               fill=False, edgecolor='red', linewidth=2,
                               linestyle='--', label='基坑边界')
            ax2.add_patch(rect)
        
        ax2.set_title('钻孔数据分布')
        ax2.set_xlabel('X坐标')
        ax2.set_ylabel('Y坐标')
        ax2.legend()
        ax2.grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.show()


def create_sample_borehole_data(n_dense: int = 20, n_sparse: int = 10,
                               pit_bounds: Dict[str, Tuple[float, float]] = None):
    """
    创建示例钻孔数据
    基坑区域密集，外围稀疏
    """
    if pit_bounds is None:
        pit_bounds = {'x': (40, 60), 'y': (40, 60)}
    
    np.random.seed(42)
    
    # 密集区域数据（基坑内）
    x_dense = np.random.uniform(pit_bounds['x'][0], pit_bounds['x'][1], n_dense)
    y_dense = np.random.uniform(pit_bounds['y'][0], pit_bounds['y'][1], n_dense)
    
    # 稀疏区域数据（基坑外）
    x_sparse = np.random.uniform(0, 100, n_sparse)
    y_sparse = np.random.uniform(0, 100, n_sparse)
    
    # 过滤掉落在基坑内的稀疏点
    mask = ((x_sparse < pit_bounds['x'][0]) | (x_sparse > pit_bounds['x'][1]) |
            (y_sparse < pit_bounds['y'][0]) | (y_sparse > pit_bounds['y'][1]))
    x_sparse = x_sparse[mask]
    y_sparse = y_sparse[mask]
    
    # 合并数据
    x_coords = np.concatenate([x_dense, x_sparse])
    y_coords = np.concatenate([y_dense, y_sparse])
    coords = np.column_stack([x_coords, y_coords])
    
    # 生成模拟的地层标高数据
    # 基坑区域有更复杂的变化，外围相对简单
    values = np.zeros(len(coords))
    for i, (x, y) in enumerate(coords):
        # 基础趋势面
        base_value = 100 - 0.1 * x - 0.05 * y
        
        # 基坑区域添加复杂变化
        if (pit_bounds['x'][0] <= x <= pit_bounds['x'][1] and 
            pit_bounds['y'][0] <= y <= pit_bounds['y'][1]):
            # 添加局部变化和噪声
            local_variation = 5 * np.sin(0.2 * x) * np.cos(0.2 * y)
            noise = np.random.normal(0, 1)
            values[i] = base_value + local_variation + noise
        else:
            # 外围区域相对简单，只有小幅噪声
            noise = np.random.normal(0, 0.5)
            values[i] = base_value + noise
    
    return coords, values, pit_bounds


if __name__ == "__main__":
    print("RBF插值模块测试")
    
    # 创建示例数据
    coords, values, pit_bounds = create_sample_borehole_data()
    
    print(f"总钻孔数: {len(coords)}")
    print(f"数据范围: X({coords[:, 0].min():.1f}, {coords[:, 0].max():.1f}), "
          f"Y({coords[:, 1].min():.1f}, {coords[:, 1].max():.1f})")
    print(f"值范围: ({values.min():.2f}, {values.max():.2f})")
    
    # 创建插值器
    interpolator = BoreholeRBFInterpolator(
        foundation_pit_bounds=pit_bounds,
        kernel='multiquadric',
        epsilon='scale'
    )
    
    # 拟合模型
    interpolator.fit(coords, values, optimize_params=True)
    
    # 交叉验证
    cv_scores = interpolator.cross_validate(coords, values)
    print("\n交叉验证结果:")
    for metric, score in cv_scores.items():
        print(f"{metric}: {score:.4f}")
    
    # 可视化结果
    interpolator.plot_interpolation_result(coords, values, method='adaptive')
    
    print("\nRBF插值器配置完成，等待您的指令！")