"""
Advanced Geological Modeling Algorithms - 高级地质建模算法
Sophisticated algorithms for geological modeling and analysis
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple, Optional, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
import warnings
from abc import ABC, abstractmethod

from scipy import interpolate, spatial, optimize
from scipy.spatial import Delaunay, ConvexHull, cKDTree
from scipy.interpolate import griddata, RBFInterpolator, interp1d
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import RBF, Matern, WhiteKernel
from sklearn.cluster import DBSCAN, KMeans
from sklearn.preprocessing import StandardScaler

from PyQt6.QtCore import QObject, pyqtSignal, QThread, QTimer
from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
                           QLabel, QPushButton, QProgressBar, QComboBox,
                           QSpinBox, QDoubleSpinBox, QCheckBox, QGroupBox,
                           QTabWidget, QTextEdit, QSlider)
from PyQt6.QtGui import QFont, QColor
from PyQt6.QtCore import Qt

try:
    import gempy as gp
    import gempy_viewer as gpv
    GEMPY_AVAILABLE = True
except ImportError:
    GEMPY_AVAILABLE = False

try:
    import pykrige
    from pykrige.ok import OrdinaryKriging
    from pykrige.uk import UniversalKriging
    KRIGING_AVAILABLE = True
except ImportError:
    KRIGING_AVAILABLE = False


class ModelingAlgorithm(Enum):
    """建模算法类型"""
    DELAUNAY_TRIANGULATION = "delaunay"
    RADIAL_BASIS_FUNCTION = "rbf"
    KRIGING = "kriging"
    GAUSSIAN_PROCESS = "gaussian_process"
    IMPLICIT_SURFACE = "implicit_surface"
    GEMPY_IMPLICIT = "gempy_implicit"
    VORONOI_TESSELLATION = "voronoi"
    SPLINE_INTERPOLATION = "spline"


class InterpolationMethod(Enum):
    """插值方法"""
    LINEAR = "linear"
    CUBIC = "cubic"
    QUINTIC = "quintic"
    MULTIQUADRIC = "multiquadric"
    INVERSE_MULTIQUADRIC = "inverse_multiquadric"
    GAUSSIAN = "gaussian"
    THIN_PLATE_SPLINE = "thin_plate"


class QualityMetric(Enum):
    """质量评估指标"""
    RMSE = "rmse"
    MAE = "mae"
    R2_SCORE = "r2"
    CROSS_VALIDATION = "cross_validation"
    LOG_LIKELIHOOD = "log_likelihood"
    AIC = "aic"
    BIC = "bic"


@dataclass
class ModelingParameters:
    """建模参数"""
    algorithm: ModelingAlgorithm = ModelingAlgorithm.RBF
    interpolation_method: InterpolationMethod = InterpolationMethod.MULTIQUADRIC
    resolution: Tuple[int, int, int] = (50, 50, 50)
    extent: Tuple[float, float, float, float, float, float] = field(
        default_factory=lambda: (0.0, 1000.0, 0.0, 1000.0, -500.0, 500.0)
    )  # xmin, xmax, ymin, ymax, zmin, zmax
    smoothing_factor: float = 0.0
    nugget_effect: float = 0.1
    range_parameter: float = 100.0
    sill: float = 1.0
    anisotropy_ratio: float = 1.0
    anisotropy_angle: float = 0.0
    cross_validate: bool = True
    quality_threshold: float = 0.8


@dataclass
class ModelingResults:
    """建模结果"""
    grid_coordinates: np.ndarray
    interpolated_values: np.ndarray
    formation_probabilities: Optional[Dict[str, np.ndarray]] = None
    uncertainty: Optional[np.ndarray] = None
    quality_metrics: Dict[str, float] = field(default_factory=dict)
    cross_validation_scores: Optional[np.ndarray] = None
    model_parameters: Optional[Dict[str, Any]] = None
    execution_time: float = 0.0


class BaseGeologicalAlgorithm(ABC):
    """地质算法基类"""
    
    def __init__(self, parameters: ModelingParameters):
        self.parameters = parameters
        self.fitted_model = None
        self.training_data = None
        
    @abstractmethod
    def fit(self, points: np.ndarray, values: np.ndarray) -> bool:
        """拟合模型"""
        pass
    
    @abstractmethod
    def predict(self, query_points: np.ndarray) -> np.ndarray:
        """预测值"""
        pass
    
    @abstractmethod
    def predict_with_uncertainty(self, query_points: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """带不确定性的预测"""
        pass
    
    def cross_validate(self, points: np.ndarray, values: np.ndarray, folds: int = 5) -> np.ndarray:
        """交叉验证"""
        n_samples = len(points)
        fold_size = n_samples // folds
        scores = []
        
        for i in range(folds):
            start_idx = i * fold_size
            end_idx = start_idx + fold_size if i < folds - 1 else n_samples
            
            # 测试集
            test_points = points[start_idx:end_idx]
            test_values = values[start_idx:end_idx]
            
            # 训练集
            train_points = np.concatenate([points[:start_idx], points[end_idx:]])
            train_values = np.concatenate([values[:start_idx], values[end_idx:]])
            
            # 训练和预测
            if self.fit(train_points, train_values):
                predictions = self.predict(test_points)
                score = self.calculate_rmse(test_values, predictions)
                scores.append(score)
        
        return np.array(scores)
    
    def calculate_rmse(self, true_values: np.ndarray, predictions: np.ndarray) -> float:
        """计算RMSE"""
        return np.sqrt(np.mean((true_values - predictions) ** 2))
    
    def calculate_r2(self, true_values: np.ndarray, predictions: np.ndarray) -> float:
        """计算R²分数"""
        ss_res = np.sum((true_values - predictions) ** 2)
        ss_tot = np.sum((true_values - np.mean(true_values)) ** 2)
        return 1 - (ss_res / ss_tot) if ss_tot > 0 else 0


class RBFAlgorithm(BaseGeologicalAlgorithm):
    """径向基函数算法"""
    
    def __init__(self, parameters: ModelingParameters):
        super().__init__(parameters)
        self.rbf_interpolator = None
        
    def fit(self, points: np.ndarray, values: np.ndarray) -> bool:
        """拟合RBF模型"""
        try:
            self.training_data = (points, values)
            
            # 选择RBF核函数
            kernel_map = {
                InterpolationMethod.MULTIQUADRIC: 'multiquadric',
                InterpolationMethod.INVERSE_MULTIQUADRIC: 'inverse_multiquadric',
                InterpolationMethod.GAUSSIAN: 'gaussian',
                InterpolationMethod.THIN_PLATE_SPLINE: 'thin_plate_spline',
                InterpolationMethod.LINEAR: 'linear',
                InterpolationMethod.CUBIC: 'cubic',
                InterpolationMethod.QUINTIC: 'quintic'
            }
            
            kernel = kernel_map.get(self.parameters.interpolation_method, 'multiquadric')
            
            # 创建RBF插值器
            self.rbf_interpolator = RBFInterpolator(
                points, values,
                kernel=kernel,
                smoothing=self.parameters.smoothing_factor,
                epsilon=1.0  # 可以基于参数调整
            )
            
            self.fitted_model = self.rbf_interpolator
            return True
            
        except Exception as e:
            print(f"RBF fitting error: {e}")
            return False
    
    def predict(self, query_points: np.ndarray) -> np.ndarray:
        """预测值"""
        if self.fitted_model is None:
            raise ValueError("Model not fitted yet")
        
        return self.fitted_model(query_points)
    
    def predict_with_uncertainty(self, query_points: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """带不确定性的预测（RBF不直接提供不确定性，使用距离作为代理）"""
        predictions = self.predict(query_points)
        
        # 使用到最近训练点的距离作为不确定性度量
        if self.training_data is not None:
            train_points, _ = self.training_data
            tree = cKDTree(train_points)
            distances, _ = tree.query(query_points, k=1)
            
            # 标准化距离作为不确定性
            max_distance = np.max(distances)
            uncertainty = distances / max_distance if max_distance > 0 else np.zeros_like(distances)
        else:
            uncertainty = np.ones(len(query_points)) * 0.5
        
        return predictions, uncertainty


class KrigingAlgorithm(BaseGeologicalAlgorithm):
    """克里金算法"""
    
    def __init__(self, parameters: ModelingParameters):
        super().__init__(parameters)
        self.kriging_model = None
        
    def fit(self, points: np.ndarray, values: np.ndarray) -> bool:
        """拟合克里金模型"""
        if not KRIGING_AVAILABLE:
            print("PyKrige not available, using fallback")
            return False
        
        try:
            self.training_data = (points, values)
            
            # 提取坐标
            x, y = points[:, 0], points[:, 1]
            
            # 创建普通克里金模型
            self.kriging_model = OrdinaryKriging(
                x, y, values,
                variogram_model='gaussian',  # 可以基于参数选择
                verbose=False,
                enable_plotting=False,
                nugget=self.parameters.nugget_effect
            )
            
            self.fitted_model = self.kriging_model
            return True
            
        except Exception as e:
            print(f"Kriging fitting error: {e}")
            return False
    
    def predict(self, query_points: np.ndarray) -> np.ndarray:
        """预测值"""
        if self.fitted_model is None:
            raise ValueError("Model not fitted yet")
        
        x, y = query_points[:, 0], query_points[:, 1]
        predictions, _ = self.fitted_model.execute('points', x, y)
        return predictions
    
    def predict_with_uncertainty(self, query_points: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """带不确定性的预测"""
        if self.fitted_model is None:
            raise ValueError("Model not fitted yet")
        
        x, y = query_points[:, 0], query_points[:, 1]
        predictions, variance = self.fitted_model.execute('points', x, y)
        uncertainty = np.sqrt(variance)
        
        return predictions, uncertainty


class GaussianProcessAlgorithm(BaseGeologicalAlgorithm):
    """高斯过程算法"""
    
    def __init__(self, parameters: ModelingParameters):
        super().__init__(parameters)
        self.gp_model = None
        
    def fit(self, points: np.ndarray, values: np.ndarray) -> bool:
        """拟合高斯过程模型"""
        try:
            self.training_data = (points, values)
            
            # 标准化输入
            self.scaler = StandardScaler()
            points_scaled = self.scaler.fit_transform(points)
            
            # 创建核函数
            length_scale = self.parameters.range_parameter
            kernel = (RBF(length_scale=length_scale) + 
                     WhiteKernel(noise_level=self.parameters.nugget_effect))
            
            # 创建高斯过程回归器
            self.gp_model = GaussianProcessRegressor(
                kernel=kernel,
                n_restarts_optimizer=2,
                normalize_y=True
            )
            
            # 拟合模型
            self.gp_model.fit(points_scaled, values)
            self.fitted_model = self.gp_model
            
            return True
            
        except Exception as e:
            print(f"Gaussian Process fitting error: {e}")
            return False
    
    def predict(self, query_points: np.ndarray) -> np.ndarray:
        """预测值"""
        if self.fitted_model is None:
            raise ValueError("Model not fitted yet")
        
        query_points_scaled = self.scaler.transform(query_points)
        predictions, _ = self.fitted_model.predict(query_points_scaled, return_std=False)
        return predictions
    
    def predict_with_uncertainty(self, query_points: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """带不确定性的预测"""
        if self.fitted_model is None:
            raise ValueError("Model not fitted yet")
        
        query_points_scaled = self.scaler.transform(query_points)
        predictions, std = self.fitted_model.predict(query_points_scaled, return_std=True)
        
        return predictions, std


class DelaunayAlgorithm(BaseGeologicalAlgorithm):
    """Delaunay三角化算法"""
    
    def __init__(self, parameters: ModelingParameters):
        super().__init__(parameters)
        self.triangulation = None
        
    def fit(self, points: np.ndarray, values: np.ndarray) -> bool:
        """拟合Delaunay模型"""
        try:
            self.training_data = (points, values)
            
            # 创建Delaunay三角化
            self.triangulation = Delaunay(points)
            self.values = values
            
            return True
            
        except Exception as e:
            print(f"Delaunay fitting error: {e}")
            return False
    
    def predict(self, query_points: np.ndarray) -> np.ndarray:
        """使用线性插值预测"""
        if self.triangulation is None:
            raise ValueError("Model not fitted yet")
        
        train_points, train_values = self.training_data
        
        # 使用scipy的griddata进行线性插值
        predictions = griddata(
            train_points, train_values, query_points,
            method='linear', fill_value=np.nan
        )
        
        # 填充NaN值
        mask = np.isnan(predictions)
        if np.any(mask):
            # 使用最近邻填充
            predictions_nn = griddata(
                train_points, train_values, query_points,
                method='nearest'
            )
            predictions[mask] = predictions_nn[mask]
        
        return predictions
    
    def predict_with_uncertainty(self, query_points: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """带不确定性的预测"""
        predictions = self.predict(query_points)
        
        # 基于与训练点距离估计不确定性
        train_points, _ = self.training_data
        tree = cKDTree(train_points)
        distances, _ = tree.query(query_points, k=3)  # 使用3个最近邻
        
        # 使用平均距离作为不确定性度量
        avg_distances = np.mean(distances, axis=1)
        max_distance = np.max(avg_distances)
        uncertainty = avg_distances / max_distance if max_distance > 0 else np.zeros_like(avg_distances)
        
        return predictions, uncertainty


class ImplicitSurfaceAlgorithm(BaseGeologicalAlgorithm):
    """隐式曲面算法"""
    
    def __init__(self, parameters: ModelingParameters):
        super().__init__(parameters)
        self.surface_functions = {}
        
    def fit(self, points: np.ndarray, values: np.ndarray) -> bool:
        """拟合隐式曲面模型"""
        try:
            self.training_data = (points, values)
            
            # 按地层分组拟合隐式函数
            unique_formations = np.unique(values)
            
            for formation in unique_formations:
                formation_mask = values == formation
                formation_points = points[formation_mask]
                
                if len(formation_points) >= 4:  # 至少需要4个点
                    # 使用RBF作为隐式函数的基础
                    rbf = RBFInterpolator(
                        formation_points,
                        np.zeros(len(formation_points)),  # 隐式函数在边界上为0
                        kernel='thin_plate_spline',
                        smoothing=self.parameters.smoothing_factor
                    )
                    self.surface_functions[formation] = rbf
            
            return len(self.surface_functions) > 0
            
        except Exception as e:
            print(f"Implicit surface fitting error: {e}")
            return False
    
    def predict(self, query_points: np.ndarray) -> np.ndarray:
        """预测地层"""
        if not self.surface_functions:
            raise ValueError("Model not fitted yet")
        
        predictions = np.full(len(query_points), -1, dtype=int)
        
        # 对每个查询点，找到最近的隐式曲面
        for i, point in enumerate(query_points):
            min_distance = float('inf')
            best_formation = -1
            
            for formation, surface_func in self.surface_functions.items():
                try:
                    distance = abs(surface_func(point.reshape(1, -1))[0])
                    if distance < min_distance:
                        min_distance = distance
                        best_formation = formation
                except:
                    continue
            
            predictions[i] = best_formation
        
        return predictions
    
    def predict_with_uncertainty(self, query_points: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """带不确定性的预测"""
        predictions = self.predict(query_points)
        
        # 计算到最近曲面的距离作为不确定性
        uncertainty = np.zeros(len(query_points))
        
        for i, point in enumerate(query_points):
            distances = []
            for surface_func in self.surface_functions.values():
                try:
                    distance = abs(surface_func(point.reshape(1, -1))[0])
                    distances.append(distance)
                except:
                    continue
            
            if distances:
                uncertainty[i] = min(distances)
        
        # 标准化不确定性
        max_uncertainty = np.max(uncertainty)
        if max_uncertainty > 0:
            uncertainty = uncertainty / max_uncertainty
        
        return predictions, uncertainty


class AdvancedGeologicalModeler:
    """高级地质建模器"""
    
    def __init__(self):
        self.algorithms = {
            ModelingAlgorithm.RBF: RBFAlgorithm,
            ModelingAlgorithm.KRIGING: KrigingAlgorithm,
            ModelingAlgorithm.GAUSSIAN_PROCESS: GaussianProcessAlgorithm,
            ModelingAlgorithm.DELAUNAY_TRIANGULATION: DelaunayAlgorithm,
            ModelingAlgorithm.IMPLICIT_SURFACE: ImplicitSurfaceAlgorithm
        }
        
        self.current_model = None
        self.last_results = None
        
    def create_model(self, parameters: ModelingParameters) -> BaseGeologicalAlgorithm:
        """创建模型"""
        algorithm_class = self.algorithms.get(parameters.algorithm)
        if algorithm_class is None:
            raise ValueError(f"Unsupported algorithm: {parameters.algorithm}")
        
        return algorithm_class(parameters)
    
    def fit_and_predict(self, 
                       points: np.ndarray, 
                       values: np.ndarray,
                       parameters: ModelingParameters) -> ModelingResults:
        """拟合模型并进行预测"""
        
        import time
        start_time = time.time()
        
        # 创建模型
        model = self.create_model(parameters)
        
        # 拟合模型
        if not model.fit(points, values):
            raise RuntimeError("Model fitting failed")
        
        # 创建预测网格
        grid_coords = self._create_prediction_grid(parameters.extent, parameters.resolution)
        
        # 预测
        predictions, uncertainty = model.predict_with_uncertainty(grid_coords)
        
        # 计算质量指标
        quality_metrics = {}
        if parameters.cross_validate:
            cv_scores = model.cross_validate(points, values)
            quality_metrics['cv_rmse_mean'] = np.mean(cv_scores)
            quality_metrics['cv_rmse_std'] = np.std(cv_scores)
        
        # 训练集上的R²分数
        train_predictions = model.predict(points)
        quality_metrics['r2_train'] = model.calculate_r2(values, train_predictions)
        quality_metrics['rmse_train'] = model.calculate_rmse(values, train_predictions)
        
        execution_time = time.time() - start_time
        
        # 创建结果对象
        results = ModelingResults(
            grid_coordinates=grid_coords,
            interpolated_values=predictions,
            uncertainty=uncertainty,
            quality_metrics=quality_metrics,
            cross_validation_scores=cv_scores if parameters.cross_validate else None,
            execution_time=execution_time
        )
        
        self.current_model = model
        self.last_results = results
        
        return results
    
    def _create_prediction_grid(self, extent: Tuple, resolution: Tuple) -> np.ndarray:
        """创建预测网格"""
        xmin, xmax, ymin, ymax, zmin, zmax = extent
        nx, ny, nz = resolution
        
        # 创建网格坐标
        x = np.linspace(xmin, xmax, nx)
        y = np.linspace(ymin, ymax, ny)
        z = np.linspace(zmin, zmax, nz)
        
        # 创建网格点
        xx, yy, zz = np.meshgrid(x, y, z, indexing='ij')
        grid_coords = np.column_stack([xx.ravel(), yy.ravel(), zz.ravel()])
        
        return grid_coords
    
    def compare_algorithms(self, 
                          points: np.ndarray,
                          values: np.ndarray,
                          base_parameters: ModelingParameters,
                          algorithms: List[ModelingAlgorithm]) -> Dict[ModelingAlgorithm, ModelingResults]:
        """比较不同算法"""
        results = {}
        
        for algorithm in algorithms:
            try:
                params = ModelingParameters(
                    algorithm=algorithm,
                    interpolation_method=base_parameters.interpolation_method,
                    resolution=base_parameters.resolution,
                    extent=base_parameters.extent,
                    cross_validate=True
                )
                
                result = self.fit_and_predict(points, values, params)
                results[algorithm] = result
                
            except Exception as e:
                print(f"Algorithm {algorithm.value} failed: {e}")
                continue
        
        return results
    
    def optimize_parameters(self,
                          points: np.ndarray,
                          values: np.ndarray,
                          algorithm: ModelingAlgorithm,
                          param_ranges: Dict[str, Tuple[float, float]]) -> ModelingParameters:
        """优化参数"""
        
        def objective(params):
            try:
                # 解包参数
                param_dict = {}
                param_names = list(param_ranges.keys())
                
                for i, name in enumerate(param_names):
                    param_dict[name] = params[i]
                
                # 创建参数对象
                modeling_params = ModelingParameters(
                    algorithm=algorithm,
                    **param_dict
                )
                
                # 快速交叉验证
                model = self.create_model(modeling_params)
                if model.fit(points, values):
                    cv_scores = model.cross_validate(points, values, folds=3)
                    return np.mean(cv_scores)  # 最小化RMSE
                else:
                    return float('inf')
                    
            except Exception:
                return float('inf')
        
        # 设置优化边界
        bounds = list(param_ranges.values())
        
        # 使用差分进化优化
        result = optimize.differential_evolution(
            objective,
            bounds,
            seed=42,
            maxiter=20,  # 限制迭代次数以节省时间
            popsize=10
        )
        
        # 构造最优参数
        optimal_params = {}
        param_names = list(param_ranges.keys())
        for i, name in enumerate(param_names):
            optimal_params[name] = result.x[i]
        
        return ModelingParameters(
            algorithm=algorithm,
            **optimal_params
        )


class GeologicalModelingWidget(QWidget):
    """地质建模界面组件"""
    
    modeling_completed = pyqtSignal(object)  # ModelingResults
    modeling_progress = pyqtSignal(int, str)
    modeling_error = pyqtSignal(str)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.modeler = AdvancedGeologicalModeler()
        self.data = None
        self.results = None
        self.setup_ui()
        self.connect_signals()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 标题
        title = QLabel("🏔️ Advanced Geological Modeling")
        title.setStyleSheet("""
            QLabel {
                font-size: 16pt;
                font-weight: 700;
                color: #f97316;
                padding: 15px;
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 rgba(249, 115, 22, 0.1),
                    stop:1 rgba(249, 115, 22, 0.05));
                border-radius: 10px;
                margin-bottom: 10px;
            }
        """)
        layout.addWidget(title)
        
        # 参数设置区域
        params_group = QGroupBox("Modeling Parameters")
        params_group.setStyleSheet("""
            QGroupBox {
                font-weight: 700;
                color: #e5e7eb;
                border: 2px solid #374151;
                border-radius: 8px;
                margin-top: 10px;
                padding-top: 10px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 10px 0 10px;
                background: rgba(55, 65, 81, 0.8);
            }
        """)
        
        params_layout = QGridLayout(params_group)
        
        # 算法选择
        params_layout.addWidget(QLabel("Algorithm:"), 0, 0)
        self.algorithm_combo = QComboBox()
        self.algorithm_combo.addItems([alg.value.title().replace('_', ' ') for alg in ModelingAlgorithm])
        params_layout.addWidget(self.algorithm_combo, 0, 1)
        
        # 插值方法
        params_layout.addWidget(QLabel("Interpolation:"), 1, 0)
        self.interp_combo = QComboBox()
        self.interp_combo.addItems([method.value.title().replace('_', ' ') for method in InterpolationMethod])
        params_layout.addWidget(self.interp_combo, 1, 1)
        
        # 分辨率设置
        params_layout.addWidget(QLabel("Resolution:"), 2, 0)
        resolution_layout = QHBoxLayout()
        
        self.res_x_spin = QSpinBox()
        self.res_x_spin.setRange(10, 200)
        self.res_x_spin.setValue(50)
        
        self.res_y_spin = QSpinBox()
        self.res_y_spin.setRange(10, 200)
        self.res_y_spin.setValue(50)
        
        self.res_z_spin = QSpinBox()
        self.res_z_spin.setRange(10, 200)
        self.res_z_spin.setValue(50)
        
        resolution_layout.addWidget(self.res_x_spin)
        resolution_layout.addWidget(QLabel("×"))
        resolution_layout.addWidget(self.res_y_spin)
        resolution_layout.addWidget(QLabel("×"))
        resolution_layout.addWidget(self.res_z_spin)
        
        params_layout.addLayout(resolution_layout, 2, 1)
        
        # 平滑因子
        params_layout.addWidget(QLabel("Smoothing:"), 3, 0)
        self.smoothing_slider = QSlider(Qt.Orientation.Horizontal)
        self.smoothing_slider.setRange(0, 100)
        self.smoothing_slider.setValue(0)
        params_layout.addWidget(self.smoothing_slider, 3, 1)
        
        # 交叉验证
        self.cv_check = QCheckBox("Cross Validation")
        self.cv_check.setChecked(True)
        params_layout.addWidget(self.cv_check, 4, 0, 1, 2)
        
        layout.addWidget(params_group)
        
        # 控制按钮
        button_layout = QHBoxLayout()
        
        self.model_btn = QPushButton("🏗️ Build Model")
        self.model_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(249, 115, 22, 0.9),
                    stop:1 rgba(234, 88, 12, 0.9));
                border: 2px solid #f97316;
                border-radius: 8px;
                color: white;
                font-weight: 700;
                font-size: 11pt;
                padding: 12px 24px;
                min-width: 150px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(255, 135, 42, 0.9),
                    stop:1 rgba(255, 108, 32, 0.9));
            }
            QPushButton:disabled {
                background: rgba(107, 114, 128, 0.5);
                border: 2px solid #6b7280;
                color: #9ca3af;
            }
        """)
        
        self.compare_btn = QPushButton("🔍 Compare Algorithms")
        self.compare_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(139, 92, 246, 0.9),
                    stop:1 rgba(124, 58, 237, 0.9));
                border: 2px solid #8b5cf6;
                border-radius: 8px;
                color: white;
                font-weight: 700;
                font-size: 11pt;
                padding: 12px 24px;
                min-width: 150px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(159, 122, 255, 0.9),
                    stop:1 rgba(144, 78, 255, 0.9));
            }
            QPushButton:disabled {
                background: rgba(107, 114, 128, 0.5);
                border: 2px solid #6b7280;
                color: #9ca3af;
            }
        """)
        
        self.optimize_btn = QPushButton("⚙️ Optimize Parameters")
        self.optimize_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(16, 185, 129, 0.9),
                    stop:1 rgba(5, 150, 105, 0.9));
                border: 2px solid #10b981;
                border-radius: 8px;
                color: white;
                font-weight: 700;
                font-size: 11pt;
                padding: 12px 24px;
                min-width: 150px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(34, 197, 94, 0.9),
                    stop:1 rgba(21, 128, 61, 0.9));
            }
            QPushButton:disabled {
                background: rgba(107, 114, 128, 0.5);
                border: 2px solid #6b7280;
                color: #9ca3af;
            }
        """)
        
        button_layout.addWidget(self.model_btn)
        button_layout.addWidget(self.compare_btn)
        button_layout.addWidget(self.optimize_btn)
        button_layout.addStretch()
        
        layout.addLayout(button_layout)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setStyleSheet("""
            QProgressBar {
                background: rgba(51, 65, 85, 0.8);
                border: 2px solid #374151;
                border-radius: 10px;
                text-align: center;
                color: white;
                font-weight: 600;
                font-size: 10pt;
                padding: 2px;
            }
            QProgressBar::chunk {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 #f97316, stop:1 #ea580c);
                border-radius: 8px;
            }
        """)
        self.progress_bar.hide()
        layout.addWidget(self.progress_bar)
        
        # 结果显示
        self.results_text = QTextEdit()
        self.results_text.setStyleSheet("""
            QTextEdit {
                background: rgba(30, 41, 59, 0.8);
                border: 2px solid #374151;
                border-radius: 8px;
                color: #e5e7eb;
                font-family: 'Consolas', monospace;
                font-size: 10pt;
                padding: 10px;
            }
        """)
        self.results_text.setMaximumHeight(200)
        layout.addWidget(self.results_text)
        
        # 应用样式到控件
        self.apply_control_styles()
        
    def apply_control_styles(self):
        """应用控件样式"""
        style = """
            QComboBox, QSpinBox {
                background: rgba(51, 65, 85, 0.9);
                border: 2px solid #6b7280;
                border-radius: 4px;
                color: #e5e7eb;
                padding: 4px 8px;
                font-weight: 600;
            }
            QSlider::groove:horizontal {
                border: 2px solid #374151;
                height: 8px;
                background: rgba(51, 65, 85, 0.8);
                border-radius: 4px;
            }
            QSlider::handle:horizontal {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #f97316, stop:1 #ea580c);
                border: 2px solid #ea580c;
                width: 18px;
                margin: -2px 0;
                border-radius: 9px;
            }
            QCheckBox {
                color: #e5e7eb;
                font-weight: 600;
            }
            QCheckBox::indicator {
                width: 16px;
                height: 16px;
                border: 2px solid #6b7280;
                border-radius: 3px;
                background: rgba(51, 65, 85, 0.8);
            }
            QCheckBox::indicator:checked {
                background: #f97316;
                border-color: #ea580c;
            }
            QLabel {
                color: #e5e7eb;
                font-weight: 600;
            }
        """
        
        for widget in self.findChildren((QComboBox, QSpinBox, QSlider, QCheckBox, QLabel)):
            widget.setStyleSheet(style)
        
    def connect_signals(self):
        """连接信号"""
        self.model_btn.clicked.connect(self.build_model)
        self.compare_btn.clicked.connect(self.compare_algorithms)
        self.optimize_btn.clicked.connect(self.optimize_parameters)
        
    def set_data(self, data: pd.DataFrame):
        """设置数据"""
        self.data = data
        self.model_btn.setEnabled(True)
        self.compare_btn.setEnabled(True)
        self.optimize_btn.setEnabled(True)
        
        # 显示数据信息
        info = f"Data loaded: {len(data)} points\n"
        if 'Formation' in data.columns:
            formations = data['Formation'].unique()
            info += f"Formations: {len(formations)}\n"
        
        self.results_text.setText(info)
        
    def get_current_parameters(self) -> ModelingParameters:
        """获取当前参数"""
        algorithm_name = self.algorithm_combo.currentText().lower().replace(' ', '_')
        algorithm = ModelingAlgorithm(algorithm_name)
        
        interp_name = self.interp_combo.currentText().lower().replace(' ', '_')
        interpolation = InterpolationMethod(interp_name)
        
        resolution = (
            self.res_x_spin.value(),
            self.res_y_spin.value(),
            self.res_z_spin.value()
        )
        
        # 从数据计算范围
        extent = (0, 1000, 0, 1000, -500, 500)  # 默认值
        if self.data is not None and all(col in self.data.columns for col in ['X', 'Y', 'Z']):
            x_min, x_max = self.data['X'].min(), self.data['X'].max()
            y_min, y_max = self.data['Y'].min(), self.data['Y'].max()
            z_min, z_max = self.data['Z'].min(), self.data['Z'].max()
            
            # 扩展边界
            x_range = x_max - x_min
            y_range = y_max - y_min
            z_range = z_max - z_min
            
            extent = (
                x_min - x_range * 0.1, x_max + x_range * 0.1,
                y_min - y_range * 0.1, y_max + y_range * 0.1,
                z_min - z_range * 0.1, z_max + z_range * 0.1
            )
        
        smoothing = self.smoothing_slider.value() / 100.0
        
        return ModelingParameters(
            algorithm=algorithm,
            interpolation_method=interpolation,
            resolution=resolution,
            extent=extent,
            smoothing_factor=smoothing,
            cross_validate=self.cv_check.isChecked()
        )
        
    def build_model(self):
        """构建模型"""
        if self.data is None:
            return
        
        try:
            # 显示进度
            self.progress_bar.show()
            self.progress_bar.setRange(0, 0)  # 无限进度条
            self.model_btn.setEnabled(False)
            
            # 准备数据
            points = self.data[['X', 'Y', 'Z']].values
            
            if 'Formation' in self.data.columns:
                # 地层数据 - 转换为数值
                formations = self.data['Formation'].values
                unique_formations = np.unique(formations)
                formation_map = {name: i for i, name in enumerate(unique_formations)}
                values = np.array([formation_map[f] for f in formations])
            else:
                # 使用Z坐标作为值
                values = points[:, 2]
            
            # 获取参数
            parameters = self.get_current_parameters()
            
            # 构建模型
            results = self.modeler.fit_and_predict(points, values, parameters)
            
            # 显示结果
            self.display_results(results)
            
            self.modeling_completed.emit(results)
            
        except Exception as e:
            self.results_text.append(f"\n❌ Modeling failed: {str(e)}")
            self.modeling_error.emit(str(e))
            
        finally:
            self.progress_bar.hide()
            self.model_btn.setEnabled(True)
            
    def compare_algorithms(self):
        """比较算法"""
        if self.data is None:
            return
        
        try:
            self.progress_bar.show()
            self.progress_bar.setRange(0, 0)
            self.compare_btn.setEnabled(False)
            
            # 准备数据
            points = self.data[['X', 'Y', 'Z']].values
            
            if 'Formation' in self.data.columns:
                formations = self.data['Formation'].values
                unique_formations = np.unique(formations)
                formation_map = {name: i for i, name in enumerate(unique_formations)}
                values = np.array([formation_map[f] for f in formations])
            else:
                values = points[:, 2]
            
            # 选择要比较的算法
            algorithms_to_compare = [
                ModelingAlgorithm.RBF,
                ModelingAlgorithm.DELAUNAY_TRIANGULATION,
                ModelingAlgorithm.GAUSSIAN_PROCESS
            ]
            
            if KRIGING_AVAILABLE:
                algorithms_to_compare.append(ModelingAlgorithm.KRIGING)
            
            # 比较算法
            base_params = self.get_current_parameters()
            comparison_results = self.modeler.compare_algorithms(
                points, values, base_params, algorithms_to_compare
            )
            
            # 显示比较结果
            self.display_comparison_results(comparison_results)
            
        except Exception as e:
            self.results_text.append(f"\n❌ Algorithm comparison failed: {str(e)}")
            
        finally:
            self.progress_bar.hide()
            self.compare_btn.setEnabled(True)
            
    def optimize_parameters(self):
        """优化参数"""
        if self.data is None:
            return
        
        try:
            self.progress_bar.show()
            self.progress_bar.setRange(0, 0)
            self.optimize_btn.setEnabled(False)
            
            # 准备数据
            points = self.data[['X', 'Y', 'Z']].values
            
            if 'Formation' in self.data.columns:
                formations = self.data['Formation'].values
                unique_formations = np.unique(formations)
                formation_map = {name: i for i, name in enumerate(unique_formations)}
                values = np.array([formation_map[f] for f in formations])
            else:
                values = points[:, 2]
            
            # 当前算法
            current_params = self.get_current_parameters()
            algorithm = current_params.algorithm
            
            # 定义参数搜索范围
            param_ranges = {
                'smoothing_factor': (0.0, 1.0),
                'nugget_effect': (0.01, 0.5)
            }
            
            # 优化参数
            optimal_params = self.modeler.optimize_parameters(
                points, values, algorithm, param_ranges
            )
            
            # 应用优化结果
            self.smoothing_slider.setValue(int(optimal_params.smoothing_factor * 100))
            
            self.results_text.append(f"\n🎯 Parameter Optimization Completed:")
            self.results_text.append(f"   Smoothing Factor: {optimal_params.smoothing_factor:.3f}")
            self.results_text.append(f"   Nugget Effect: {optimal_params.nugget_effect:.3f}")
            
        except Exception as e:
            self.results_text.append(f"\n❌ Parameter optimization failed: {str(e)}")
            
        finally:
            self.progress_bar.hide()
            self.optimize_btn.setEnabled(True)
            
    def display_results(self, results: ModelingResults):
        """显示建模结果"""
        self.results_text.append(f"\n🏗️ Modeling Results:")
        self.results_text.append(f"   Execution Time: {results.execution_time:.2f}s")
        self.results_text.append(f"   Grid Points: {len(results.grid_coordinates):,}")
        
        for metric, value in results.quality_metrics.items():
            if 'cv' in metric:
                self.results_text.append(f"   {metric.upper()}: {value:.4f}")
            else:
                self.results_text.append(f"   {metric.upper()}: {value:.4f}")
        
        if results.uncertainty is not None:
            mean_uncertainty = np.mean(results.uncertainty)
            self.results_text.append(f"   Mean Uncertainty: {mean_uncertainty:.4f}")
            
    def display_comparison_results(self, results: Dict):
        """显示算法比较结果"""
        self.results_text.append(f"\n🔍 Algorithm Comparison:")
        
        sorted_results = sorted(
            results.items(),
            key=lambda x: x[1].quality_metrics.get('cv_rmse_mean', float('inf'))
        )
        
        for i, (algorithm, result) in enumerate(sorted_results):
            rank_emoji = ["🥇", "🥈", "🥉", "📊"][min(i, 3)]
            
            cv_rmse = result.quality_metrics.get('cv_rmse_mean', 'N/A')
            execution_time = result.execution_time
            
            self.results_text.append(
                f"   {rank_emoji} {algorithm.value.title()}: "
                f"CV-RMSE={cv_rmse:.4f if cv_rmse != 'N/A' else cv_rmse}, "
                f"Time={execution_time:.2f}s"
            )


if __name__ == "__main__":
    from PyQt6.QtWidgets import QApplication
    import sys
    
    app = QApplication(sys.argv)
    
    # 创建测试数据
    n_points = 500
    test_data = pd.DataFrame({
        'X': np.random.uniform(0, 1000, n_points),
        'Y': np.random.uniform(0, 1000, n_points),
        'Z': np.random.uniform(-200, 200, n_points),
        'Formation': np.random.choice([
            'Quaternary', 'Tertiary', 'Cretaceous', 'Jurassic'
        ], n_points)
    })
    
    # 创建建模组件
    widget = GeologicalModelingWidget()
    widget.set_data(test_data)
    widget.setWindowTitle("🏔️ Advanced Geological Modeling")
    widget.resize(900, 700)
    widget.show()
    
    print(f"Loaded {len(test_data)} data points")
    print(f"Available algorithms: {[alg.value for alg in ModelingAlgorithm]}")
    print(f"GemPy available: {GEMPY_AVAILABLE}")
    print(f"Kriging available: {KRIGING_AVAILABLE}")
    
    sys.exit(app.exec())