"""
智能算法参数自动调优系统
基于数据特征自动选择最优插值参数
2号几何专家
"""

import numpy as np
import logging
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum
import math

logger = logging.getLogger(__name__)

class DataCharacteristic(Enum):
    """数据特征类型"""
    SPARSE = "sparse"              # 稀疏分布
    DENSE = "dense"                # 密集分布  
    CLUSTERED = "clustered"        # 聚集分布
    UNIFORM = "uniform"            # 均匀分布
    LINEAR_TREND = "linear_trend"  # 线性趋势
    RANDOM = "random"              # 随机分布

@dataclass
class DataAnalysis:
    """数据分析结果"""
    point_count: int
    spatial_extent: Tuple[float, float]  # (width, height)
    density: float                       # 点/km²
    distribution_type: DataCharacteristic
    trend_strength: float               # 趋势强度 0-1
    clustering_index: float             # 聚集指数 0-1
    variance: float                     # 数据方差
    range_ratio: float                  # 最大最小值比

@dataclass
class OptimalParameters:
    """优化参数结果"""
    interpolation_method: str
    variogram_model: str
    grid_resolution: float
    len_scale: float
    nugget: float
    domain_expansion: float
    quality_target: int
    confidence: float                   # 参数置信度 0-1
    reasoning: str                      # 选择理由

class SmartParameterOptimizer:
    """智能参数优化器"""
    
    def __init__(self):
        self.parameter_rules = self._init_parameter_rules()
        self.quality_thresholds = self._init_quality_thresholds()
    
    def _init_parameter_rules(self) -> Dict[str, Dict]:
        """初始化参数选择规则"""
        return {
            # 稀疏数据 (< 20个点)
            "sparse": {
                "interpolation_method": "rbf",
                "variogram_model": "gaussian",
                "grid_resolution_factor": 0.8,  # 相对于数据范围
                "len_scale_factor": 0.3,
                "nugget": 0.1,
                "domain_expansion_factor": 0.4,
                "quality_target": 75,
                "reasoning": "稀疏数据使用RBF插值，保证稳定性"
            },
            
            # 密集数据 (> 50个点)
            "dense": {
                "interpolation_method": "ordinary_kriging",
                "variogram_model": "exponential", 
                "grid_resolution_factor": 0.5,
                "len_scale_factor": 0.2,
                "nugget": 0.05,
                "domain_expansion_factor": 0.2,
                "quality_target": 90,
                "reasoning": "密集数据使用Kriging插值，追求高精度"
            },
            
            # 聚集分布
            "clustered": {
                "interpolation_method": "ordinary_kriging",
                "variogram_model": "spherical",
                "grid_resolution_factor": 0.6,
                "len_scale_factor": 0.4,
                "nugget": 0.08,
                "domain_expansion_factor": 0.3,
                "quality_target": 85,
                "reasoning": "聚集数据使用球状变差函数，适应局部变化"
            },
            
            # 均匀分布
            "uniform": {
                "interpolation_method": "ordinary_kriging",
                "variogram_model": "exponential",
                "grid_resolution_factor": 0.4,
                "len_scale_factor": 0.25,
                "nugget": 0.06,
                "domain_expansion_factor": 0.25,
                "quality_target": 90,
                "reasoning": "均匀分布数据使用标准Kriging配置"
            },
            
            # 线性趋势
            "linear_trend": {
                "interpolation_method": "universal_kriging",
                "variogram_model": "linear",
                "grid_resolution_factor": 0.5,
                "len_scale_factor": 0.35,
                "nugget": 0.04,
                "domain_expansion_factor": 0.3,
                "quality_target": 88,
                "reasoning": "线性趋势数据使用泛Kriging，处理系统性变化"
            },
            
            # 随机分布
            "random": {
                "interpolation_method": "inverse_distance",
                "variogram_model": "gaussian",
                "grid_resolution_factor": 0.7,
                "len_scale_factor": 0.3,
                "nugget": 0.12,
                "domain_expansion_factor": 0.35,
                "quality_target": 80,
                "reasoning": "随机分布数据使用IDW插值，简单可靠"
            }
        }
    
    def _init_quality_thresholds(self) -> Dict[str, int]:
        """初始化质量阈值"""
        return {
            "excellent": 90,
            "good": 80,
            "acceptable": 70,
            "poor": 60
        }
    
    def analyze_data(self, boreholes: List[Dict[str, Any]]) -> DataAnalysis:
        """分析钻孔数据特征"""
        if not boreholes or len(boreholes) < 2:
            raise ValueError("需要至少2个钻孔点进行分析")
        
        # 提取坐标和值
        coords = np.array([[bh["x"], bh["y"]] for bh in boreholes])
        values = np.array([bh["z"] for bh in boreholes])
        
        # 基本统计
        point_count = len(boreholes)
        
        # 空间范围
        x_range = coords[:, 0].max() - coords[:, 0].min()
        y_range = coords[:, 1].max() - coords[:, 1].min()
        spatial_extent = (x_range, y_range)
        
        # 数据密度 (点/km²)
        area = max(x_range * y_range, 1.0) / 1e6  # 转换为km²
        density = point_count / area
        
        # 分布类型分析
        distribution_type = self._analyze_distribution(coords, values)
        
        # 趋势强度
        trend_strength = self._calculate_trend_strength(coords, values)
        
        # 聚集指数
        clustering_index = self._calculate_clustering_index(coords)
        
        # 数据方差
        variance = np.var(values)
        
        # 范围比
        range_ratio = (values.max() - values.min()) / max(abs(values.mean()), 1.0)
        
        return DataAnalysis(
            point_count=point_count,
            spatial_extent=spatial_extent,
            density=density,
            distribution_type=distribution_type,
            trend_strength=trend_strength,
            clustering_index=clustering_index,
            variance=variance,
            range_ratio=range_ratio
        )
    
    def optimize_parameters(self, boreholes: List[Dict[str, Any]], 
                          user_preferences: Optional[Dict[str, Any]] = None) -> OptimalParameters:
        """
        自动优化插值参数
        
        Args:
            boreholes: 钻孔数据
            user_preferences: 用户偏好设置
        
        Returns:
            OptimalParameters: 优化的参数配置
        """
        # 分析数据特征
        analysis = self.analyze_data(boreholes)
        
        # 获取基础参数规则
        base_rules = self.parameter_rules.get(
            analysis.distribution_type.value, 
            self.parameter_rules["uniform"]
        )
        
        # 计算实际参数值
        max_extent = max(analysis.spatial_extent)
        
        # 网格分辨率
        grid_resolution = max(
            0.5, 
            min(10.0, max_extent * base_rules["grid_resolution_factor"] / 20)
        )
        
        # 变程
        len_scale = max(
            5.0,
            min(max_extent, max_extent * base_rules["len_scale_factor"])
        )
        
        # 域扩展
        domain_expansion = max(
            10.0,
            min(200.0, max_extent * base_rules["domain_expansion_factor"])
        )
        
        # 根据数据特征微调
        interpolation_method = base_rules["interpolation_method"]
        variogram_model = base_rules["variogram_model"]
        nugget = base_rules["nugget"]
        quality_target = base_rules["quality_target"]
        
        # 应用微调规则
        if analysis.point_count < 10:
            # 极少数据点，强制使用IDW
            interpolation_method = "inverse_distance"
            grid_resolution *= 1.5
            quality_target = min(quality_target, 75)
        
        elif analysis.point_count > 100:
            # 大量数据点，可以提高精度
            if interpolation_method == "rbf":
                interpolation_method = "ordinary_kriging"
            quality_target = min(95, quality_target + 5)
            grid_resolution *= 0.8
        
        # 高方差数据调整
        if analysis.variance > 1.0:
            nugget *= 1.5
            if variogram_model == "linear":
                variogram_model = "gaussian"
        
        # 强趋势数据调整
        if analysis.trend_strength > 0.7:
            if interpolation_method == "ordinary_kriging":
                interpolation_method = "universal_kriging"
            variogram_model = "linear"
        
        # 应用用户偏好
        if user_preferences:
            if "speed_priority" in user_preferences and user_preferences["speed_priority"]:
                interpolation_method = "inverse_distance"
                grid_resolution *= 1.5
                quality_target = min(quality_target, 80)
            
            if "quality_priority" in user_preferences and user_preferences["quality_priority"]:
                if interpolation_method == "inverse_distance":
                    interpolation_method = "ordinary_kriging" 
                grid_resolution *= 0.7
                quality_target = min(95, quality_target + 10)
        
        # 计算置信度
        confidence = self._calculate_confidence(analysis, interpolation_method)
        
        return OptimalParameters(
            interpolation_method=interpolation_method,
            variogram_model=variogram_model,
            grid_resolution=grid_resolution,
            len_scale=len_scale,
            nugget=nugget,
            domain_expansion=domain_expansion,
            quality_target=quality_target,
            confidence=confidence,
            reasoning=base_rules["reasoning"] + f" (数据点: {analysis.point_count}, 密度: {analysis.density:.1f}点/km²)"
        )
    
    def _analyze_distribution(self, coords: np.ndarray, values: np.ndarray) -> DataCharacteristic:
        """分析数据分布类型"""
        n_points = len(coords)
        
        # 稀疏/密集判断
        if n_points < 20:
            return DataCharacteristic.SPARSE
        elif n_points > 50:
            return DataCharacteristic.DENSE
        
        # 聚集度分析
        clustering_index = self._calculate_clustering_index(coords)
        if clustering_index > 0.7:
            return DataCharacteristic.CLUSTERED
        
        # 趋势分析
        trend_strength = self._calculate_trend_strength(coords, values)
        if trend_strength > 0.6:
            return DataCharacteristic.LINEAR_TREND
        
        # 均匀性检验
        if self._is_uniform_distribution(coords):
            return DataCharacteristic.UNIFORM
        
        return DataCharacteristic.RANDOM
    
    def _calculate_trend_strength(self, coords: np.ndarray, values: np.ndarray) -> float:
        """计算趋势强度"""
        try:
            # 线性回归分析
            X = np.column_stack([coords, np.ones(len(coords))])
            coeffs, residuals, rank, s = np.linalg.lstsq(X, values, rcond=None)
            
            if len(residuals) > 0 and len(values) > 1:
                r_squared = 1 - residuals[0] / (np.var(values) * len(values))
                return max(0.0, min(1.0, r_squared))
        except:
            pass
        
        return 0.0
    
    def _calculate_clustering_index(self, coords: np.ndarray) -> float:
        """计算聚集指数"""
        if len(coords) < 3:
            return 0.0
        
        try:
            # 计算最近邻距离
            distances = []
            for i, point in enumerate(coords):
                other_points = np.delete(coords, i, axis=0)
                min_dist = np.min(np.sqrt(np.sum((other_points - point)**2, axis=1)))
                distances.append(min_dist)
            
            distances = np.array(distances)
            
            # 聚集指数 = 标准差 / 平均值
            if np.mean(distances) > 0:
                clustering = np.std(distances) / np.mean(distances)
                return max(0.0, min(1.0, clustering))
        except:
            pass
        
        return 0.5
    
    def _is_uniform_distribution(self, coords: np.ndarray) -> bool:
        """判断是否为均匀分布"""
        if len(coords) < 4:
            return False
        
        try:
            # 简单的均匀性检验：计算Voronoi单元面积的方差
            from scipy.spatial.distance import pdist
            distances = pdist(coords)
            cv = np.std(distances) / np.mean(distances)  # 变异系数
            return cv < 0.5  # 变异系数小于0.5认为相对均匀
        except:
            return False
    
    def _calculate_confidence(self, analysis: DataAnalysis, method: str) -> float:
        """计算参数选择的置信度"""
        confidence = 0.7  # 基础置信度
        
        # 数据点数量影响
        if analysis.point_count >= 30:
            confidence += 0.2
        elif analysis.point_count < 10:
            confidence -= 0.2
        
        # 分布类型影响
        if analysis.distribution_type in [DataCharacteristic.UNIFORM, DataCharacteristic.DENSE]:
            confidence += 0.1
        
        # 方法适配性
        if method == "ordinary_kriging" and analysis.point_count >= 20:
            confidence += 0.1
        elif method == "inverse_distance" and analysis.point_count < 15:
            confidence += 0.1
        
        return max(0.0, min(1.0, confidence))
    
    def get_performance_estimate(self, params: OptimalParameters, 
                                analysis: DataAnalysis) -> Dict[str, Any]:
        """估算性能指标"""
        # 计算时间估算 (秒)
        base_time = 5.0
        
        if params.interpolation_method == "ordinary_kriging":
            time_factor = 2.0
        elif params.interpolation_method == "universal_kriging":
            time_factor = 2.5
        elif params.interpolation_method == "rbf":
            time_factor = 1.5
        else:  # IDW
            time_factor = 1.0
        
        # 网格复杂度影响
        grid_complexity = (20.0 / params.grid_resolution) ** 2
        
        estimated_time = base_time * time_factor * (analysis.point_count / 30.0) * (grid_complexity / 100.0)
        
        # 内存使用估算 (MB)
        estimated_memory = max(50, int(grid_complexity * 2 + analysis.point_count * 0.1))
        
        # 精度估算
        if params.confidence > 0.8:
            accuracy_level = "高"
        elif params.confidence > 0.6:
            accuracy_level = "中"
        else:
            accuracy_level = "一般"
        
        return {
            "estimated_time": round(estimated_time, 1),
            "estimated_memory": estimated_memory,
            "accuracy_level": accuracy_level,
            "grid_points": int(grid_complexity),
            "confidence": params.confidence
        }

# 全局优化器实例
smart_optimizer = SmartParameterOptimizer()