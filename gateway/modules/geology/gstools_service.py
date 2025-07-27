"""
GSTools集成的地质三维重建服务
结合Kriging插值和PyVista可视化
"""

import numpy as np
import gstools as gs
import pyvista as pv
import logging
from typing import List, Dict, Tuple, Optional, Union
from dataclasses import dataclass
from enum import Enum
import os
import uuid

logger = logging.getLogger(__name__)

class InterpolationMethod(Enum):
    """插值方法枚举"""
    KRIGING_ORDINARY = "ordinary_kriging"
    KRIGING_UNIVERSAL = "universal_kriging" 
    KRIGING_SIMPLE = "simple_kriging"
    RBF = "rbf"
    IDW = "inverse_distance"

class VariogramModel(Enum):
    """变差函数模型"""
    GAUSSIAN = "gaussian"
    EXPONENTIAL = "exponential"
    SPHERICAL = "spherical"
    MATERN = "matern"
    LINEAR = "linear"

@dataclass
class SoilLayer:
    """土层数据类"""
    layer_id: int
    name: str
    density: float
    cohesion: float
    friction_angle: float
    permeability: Optional[float] = None

@dataclass
class EnhancedBorehole:
    """增强钻孔数据类"""
    id: str
    x: float
    y: float
    z: float
    soil_type: Optional[str] = None
    layer_id: Optional[int] = None
    description: Optional[str] = None

class GSToolsGeologyService:
    """
    基于GSTools的专业地质三维重建服务
    
    功能：
    - 多种Kriging插值方法
    - 变差函数自动拟合
    - 各向异性建模
    - 不确定性量化
    - 与PyVista完美集成
    """
    
    def __init__(self):
        self.boreholes: List[EnhancedBorehole] = []
        self.soil_layers: Dict[int, SoilLayer] = {}
        self.variogram_model = None
        self.kriging_model = None
        self.interpolation_method = InterpolationMethod.KRIGING_ORDINARY
        
    def load_borehole_data(self, boreholes: List[Dict]) -> None:
        """加载钻孔数据"""
        self.boreholes = [
            EnhancedBorehole(
                id=str(bh.get('id', uuid.uuid4())),
                x=float(bh['x']),
                y=float(bh['y']), 
                z=float(bh['z']),
                soil_type=bh.get('soil_type'),
                layer_id=bh.get('layer_id'),
                description=bh.get('description')
            ) for bh in boreholes
        ]
        logger.info(f"✓ 已加载 {len(self.boreholes)} 个钻孔数据点")
        
    def load_soil_layers(self, layers: List[Dict]) -> None:
        """加载土层属性数据"""
        for layer in layers:
            layer_id = layer['layer_id']
            self.soil_layers[layer_id] = SoilLayer(
                layer_id=layer_id,
                name=layer['name'],
                density=layer['density'],
                cohesion=layer['cohesion'],
                friction_angle=layer['friction_angle'],
                permeability=layer.get('permeability')
            )
        logger.info(f"✓ 已加载 {len(self.soil_layers)} 种土层类型")
    
    def analyze_spatial_structure(self, 
                                 max_lag: Optional[float] = None,
                                 n_lags: int = 20) -> Dict:
        """分析空间结构 - 计算实验变差函数"""
        
        if len(self.boreholes) < 3:
            raise ValueError("至少需要3个钻孔点进行空间结构分析")
            
        # 提取坐标和高程数据
        coords = np.array([[bh.x, bh.y] for bh in self.boreholes])
        values = np.array([bh.z for bh in self.boreholes])
        
        # 自动计算最大lag距离
        if max_lag is None:
            from scipy.spatial.distance import pdist
            distances = pdist(coords)
            max_lag = np.max(distances) / 3  # 使用最大距离的1/3
            
        # 计算实验变差函数
        try:
            bin_center, gamma = gs.vario_estimate(
                (coords[:, 0], coords[:, 1]), 
                values,
                bin_no=n_lags,    # 使用bin_no参数
                max_dist=max_lag
            )
            
            logger.info(f"✓ 实验变差函数计算完成，lag点数: {len(bin_center)}")
            
            return {
                "lag_distances": bin_center.tolist(),
                "gamma_values": gamma.tolist(),
                "max_lag": max_lag,
                "n_pairs": len(values)
            }
            
        except Exception as e:
            logger.error(f"❌ 变差函数计算失败: {e}")
            raise
    
    def fit_variogram_model(self, 
                           model_type: VariogramModel = VariogramModel.EXPONENTIAL,
                           auto_fit: bool = True) -> Dict:
        """拟合变差函数模型"""
        
        # 首先计算实验变差函数
        variogram_data = self.analyze_spatial_structure()
        bin_center = np.array(variogram_data["lag_distances"])
        gamma = np.array(variogram_data["gamma_values"])
        
        # 选择变差函数模型
        if model_type == VariogramModel.GAUSSIAN:
            model = gs.Gaussian(dim=2)
        elif model_type == VariogramModel.EXPONENTIAL:
            model = gs.Exponential(dim=2)
        elif model_type == VariogramModel.SPHERICAL:
            model = gs.Spherical(dim=2)
        elif model_type == VariogramModel.MATERN:
            model = gs.Matern(dim=2)
        else:
            model = gs.Exponential(dim=2)  # 默认使用指数模型
            
        if auto_fit:
            # 自动拟合变差函数参数
            try:
                model.fit_variogram(bin_center, gamma, nugget=False)
                logger.info(f"✓ 自动拟合{model_type.value}变差函数成功")
                logger.info(f"  - 变程(range): {model.len_scale:.2f}")
                logger.info(f"  - 基台值(sill): {model.var:.2f}")
                
            except Exception as e:
                logger.warning(f"⚠️ 自动拟合失败: {e}，使用默认参数")
                # 使用默认参数
                model.len_scale = np.max(bin_center) / 3
                model.var = np.var(gamma)
        
        self.variogram_model = model
        
        return {
            "model_type": model_type.value,
            "len_scale": float(model.len_scale),
            "variance": float(model.var),
            "nugget": float(getattr(model, 'nugget', 0.0)),
            "fit_quality": "auto_fitted" if auto_fit else "manual"
        }
    
    def perform_kriging_interpolation(self,
                                    grid_resolution: float = 2.0,
                                    domain_expansion: Tuple[float, float] = (50.0, 50.0),
                                    method: InterpolationMethod = InterpolationMethod.KRIGING_ORDINARY) -> pv.StructuredGrid:
        """执行Kriging插值"""
        
        if not self.variogram_model:
            # 如果没有变差函数模型，先自动拟合
            logger.info("📊 未找到变差函数模型，正在自动拟合...")
            self.fit_variogram_model()
        
        # 准备数据
        coords = np.array([[bh.x, bh.y] for bh in self.boreholes])
        values = np.array([bh.z for bh in self.boreholes])
        
        # 定义插值网格
        min_coords = coords.min(axis=0) - np.array(domain_expansion)
        max_coords = coords.max(axis=0) + np.array(domain_expansion)
        
        x_coords = np.arange(min_coords[0], max_coords[0], grid_resolution)
        y_coords = np.arange(min_coords[1], max_coords[1], grid_resolution)
        
        # 创建网格
        grid_x, grid_y = np.meshgrid(x_coords, y_coords)
        
        try:
            # 根据选择的方法进行Kriging插值
            if method == InterpolationMethod.KRIGING_ORDINARY:
                krig = gs.krige.Ordinary(
                    model=self.variogram_model,
                    cond_pos=(coords[:, 0], coords[:, 1]),
                    cond_val=values
                )
            elif method == InterpolationMethod.KRIGING_UNIVERSAL:
                krig = gs.krige.Universal(
                    model=self.variogram_model,
                    cond_pos=(coords[:, 0], coords[:, 1]),
                    cond_val=values,
                    drift="linear"  # 线性趋势
                )
            else:
                # 默认使用普通Kriging
                krig = gs.krige.Ordinary(
                    model=self.variogram_model,
                    cond_pos=(coords[:, 0], coords[:, 1]),
                    cond_val=values
                )
            
            # 执行插值
            field, error_var = krig.structured([x_coords, y_coords])
            
            logger.info(f"✓ {method.value}插值完成")
            logger.info(f"  - 网格尺寸: {field.shape}")
            logger.info(f"  - 高程范围: {field.min():.2f} ~ {field.max():.2f}")
            
            # 创建PyVista结构化网格
            mesh = pv.StructuredGrid(grid_x, grid_y, field)
            
            # 添加标量字段
            mesh['elevation'] = field.ravel(order='F')
            mesh['kriging_variance'] = error_var.ravel(order='F') 
            mesh['kriging_std'] = np.sqrt(error_var.ravel(order='F'))
            
            # 添加元数据
            mesh.field_data['interpolation_method'] = method.value
            mesh.field_data['grid_resolution'] = grid_resolution
            mesh.field_data['n_boreholes'] = len(self.boreholes)
            
            self.kriging_model = krig
            
            return mesh
            
        except Exception as e:
            logger.error(f"❌ Kriging插值失败: {e}")
            raise
    
    def export_to_gltf(self, 
                      mesh: pv.StructuredGrid,
                      output_dir: str = "output/geology",
                      colormap: str = "terrain") -> str:
        """导出为glTF格式"""
        
        os.makedirs(output_dir, exist_ok=True)
        filename = f"gstools_geology_{uuid.uuid4().hex[:8]}.gltf"
        output_path = os.path.join(output_dir, filename)
        
        try:
            # 使用PyVista的离屏渲染器
            plotter = pv.Plotter(off_screen=True)
            plotter.add_mesh(
                mesh, 
                scalars='elevation',
                cmap=colormap,
                show_edges=False,
                opacity=0.9
            )
            
            # 添加钻孔点
            if self.boreholes:
                borehole_points = np.array([[bh.x, bh.y, bh.z] for bh in self.boreholes])
                plotter.add_points(
                    borehole_points,
                    color='red',
                    point_size=10,
                    render_points_as_spheres=True
                )
            
            plotter.export_gltf(output_path)
            plotter.close()
            
            logger.info(f"✓ 地质模型已导出: {output_path}")
            
            return output_path
            
        except Exception as e:
            logger.error(f"❌ glTF导出失败: {e}")
            raise
    
    def get_uncertainty_analysis(self) -> Dict:
        """获取不确定性分析结果"""
        
        if not self.kriging_model:
            raise ValueError("需要先执行Kriging插值才能进行不确定性分析")
        
        # 从Kriging模型获取误差方差
        coords = np.array([[bh.x, bh.y] for bh in self.boreholes])
        
        # 计算交叉验证统计
        cv_results = self._cross_validation()
        
        return {
            "cross_validation": cv_results,
            "variogram_model": {
                "type": type(self.variogram_model).__name__,
                "range": float(self.variogram_model.len_scale),
                "sill": float(self.variogram_model.var),
                "nugget": float(getattr(self.variogram_model, 'nugget', 0.0))
            },
            "interpolation_quality": {
                "mean_error": float(cv_results["mean_error"]),
                "rmse": float(cv_results["rmse"]),
                "r_squared": float(cv_results["r_squared"])
            }
        }
    
    def _cross_validation(self) -> Dict:
        """留一法交叉验证"""
        
        coords = np.array([[bh.x, bh.y] for bh in self.boreholes])
        values = np.array([bh.z for bh in self.boreholes])
        
        predictions = []
        
        for i in range(len(self.boreholes)):
            # 留出第i个点
            train_coords = np.delete(coords, i, axis=0)
            train_values = np.delete(values, i)
            test_coord = coords[i:i+1]
            true_value = values[i]
            
            # 用剩余点建模
            krig = gs.krige.Ordinary(
                model=self.variogram_model,
                cond_pos=(train_coords[:, 0], train_coords[:, 1]),
                cond_val=train_values
            )
            
            # 预测
            pred_value, _ = krig([test_coord[0, 0]], [test_coord[0, 1]])
            predictions.append(pred_value[0])
        
        predictions = np.array(predictions)
        errors = predictions - values
        
        return {
            "predictions": predictions.tolist(),
            "true_values": values.tolist(), 
            "errors": errors.tolist(),
            "mean_error": float(np.mean(errors)),
            "mae": float(np.mean(np.abs(errors))),
            "rmse": float(np.sqrt(np.mean(errors**2))),
            "r_squared": float(1 - np.var(errors) / np.var(values))
        }

# 创建全局服务实例
gstools_service = GSToolsGeologyService()

def get_gstools_service() -> GSToolsGeologyService:
    """获取GSTools地质服务实例"""
    return gstools_service