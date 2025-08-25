"""
重力方法模块
完整的重力数据处理、正演建模和反演功能
"""

import numpy as np
from typing import Dict, List, Optional, Union, Tuple
import matplotlib.pyplot as plt
from SimPEG import maps, utils
from SimPEG.potential_fields import gravity
from SimPEG.utils import plot2Ddata, surface2ind_topo
import pandas as pd


class GravityModule:
    """重力方法完整模块"""
    
    def __init__(self):
        self.mesh = None
        self.survey = None
        self.simulation = None
        self.active_cells = None
        self.topo = None
        
    def create_gravity_survey(self, 
                            receiver_locations: np.ndarray,
                            components: List[str] = ['gz']) -> gravity.survey.Survey:
        """
        创建重力观测系统
        
        Parameters:
        -----------
        receiver_locations : array
            接收器位置 (n_receivers, 3)
        components : list
            重力分量 ['gz', 'gx', 'gy', 'gxx', 'gxy', etc.]
            
        Returns:
        --------
        survey : gravity.survey.Survey
            重力观测系统
        """
        # 创建接收器
        receivers = []
        for component in components:
            if component == 'gz':
                receiver = gravity.receivers.Point(receiver_locations, components=['gz'])
            elif component == 'gx':
                receiver = gravity.receivers.Point(receiver_locations, components=['gx'])
            elif component == 'gy':
                receiver = gravity.receivers.Point(receiver_locations, components=['gy'])
            elif component in ['gxx', 'gxy', 'gxz', 'gyy', 'gyz', 'gzz']:
                receiver = gravity.receivers.Point(receiver_locations, components=[component])
            else:
                raise ValueError(f"不支持的重力分量: {component}")
            receivers.append(receiver)
        
        # 创建源（重力是自然场源）
        source = gravity.sources.SourceField(receiver_list=receivers)
        
        # 创建观测系统
        survey = gravity.survey.Survey(source)
        
        self.survey = survey
        
        print(f"重力观测系统创建完成:")
        print(f"  接收器数量: {len(receiver_locations)}")
        print(f"  观测分量: {components}")
        print(f"  数据点数: {survey.nD}")
        
        return survey
        
    def load_gravity_data(self, 
                         file_path: str,
                         format: str = 'xyz',
                         data_columns: Dict = None) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        加载重力数据
        
        Parameters:
        -----------
        file_path : str
            数据文件路径
        format : str
            数据格式 'xyz', 'csv', 'surfer'
        data_columns : dict
            数据列定义 {'x': 0, 'y': 1, 'z': 2, 'gz': 3, 'error': 4}
            
        Returns:
        --------
        locations : array
            观测点位置
        data : array
            重力数据
        uncertainties : array
            数据不确定性
        """
        if data_columns is None:
            data_columns = {'x': 0, 'y': 1, 'z': 2, 'gz': 3}
            
        if format == 'xyz':
            # 读取文本文件
            raw_data = np.loadtxt(file_path)
            
        elif format == 'csv':
            # 读取CSV文件
            df = pd.read_csv(file_path)
            raw_data = df.values
            
        elif format == 'surfer':
            # Surfer格式（简化处理）
            with open(file_path, 'r') as f:
                lines = f.readlines()
                # 跳过头部信息，读取数据
                data_lines = [line for line in lines if not line.startswith('#')]
                raw_data = np.array([list(map(float, line.split())) for line in data_lines])
                
        else:
            raise ValueError(f"不支持的数据格式: {format}")
            
        # 提取坐标
        x_col = data_columns['x']
        y_col = data_columns['y']
        z_col = data_columns.get('z', 2)
        
        locations = raw_data[:, [x_col, y_col, z_col]]
        
        # 提取重力数据
        gz_col = data_columns.get('gz', 3)
        data = raw_data[:, gz_col]
        
        # 提取不确定性（如果有的话）
        if 'error' in data_columns:
            error_col = data_columns['error']
            uncertainties = raw_data[:, error_col]
        else:
            # 使用默认不确定性（数据的5%）
            uncertainties = np.abs(data) * 0.05
            uncertainties = np.maximum(uncertainties, 0.01)  # 最小0.01 mGal
            
        print(f"重力数据加载完成:")
        print(f"  数据点数: {len(data)}")
        print(f"  数据范围: {np.min(data):.3f} ~ {np.max(data):.3f} mGal")
        print(f"  平均不确定性: {np.mean(uncertainties):.3f} mGal")
        
        return locations, data, uncertainties
        
    def preprocess_gravity_data(self,
                              locations: np.ndarray,
                              data: np.ndarray,
                              remove_trend: bool = True,
                              apply_terrain_correction: bool = False,
                              terrain_data: np.ndarray = None) -> Tuple[np.ndarray, Dict]:
        """
        重力数据预处理
        
        Parameters:
        -----------
        locations : array
            观测点位置
        data : array
            原始重力数据
        remove_trend : bool
            是否去除区域趋势
        apply_terrain_correction : bool
            是否应用地形校正
        terrain_data : array, optional
            地形数据
            
        Returns:
        --------
        processed_data : array
            处理后的重力数据
        corrections : dict
            应用的校正信息
        """
        processed_data = data.copy()
        corrections = {}
        
        # 1. 去除区域趋势
        if remove_trend:
            # 使用一次或二次多项式拟合区域趋势
            x, y = locations[:, 0], locations[:, 1]
            
            # 构建设计矩阵（二次多项式）
            A = np.column_stack([
                np.ones(len(x)),  # 常数项
                x, y,             # 一次项
                x*y, x**2, y**2   # 二次项
            ])
            
            # 最小二乘拟合
            coeffs, residuals, rank, s = np.linalg.lstsq(A, data, rcond=None)
            regional_trend = A @ coeffs
            
            processed_data = data - regional_trend
            corrections['regional_trend'] = regional_trend
            corrections['trend_coefficients'] = coeffs
            
            print(f"区域趋势去除: {np.std(regional_trend):.3f} mGal")
            
        # 2. 地形校正
        if apply_terrain_correction and terrain_data is not None:
            terrain_correction = self._calculate_terrain_correction(locations, terrain_data)
            processed_data = processed_data - terrain_correction
            corrections['terrain_correction'] = terrain_correction
            
            print(f"地形校正应用: {np.std(terrain_correction):.3f} mGal")
            
        # 3. 统计信息
        corrections['statistics'] = {
            'original_mean': np.mean(data),
            'original_std': np.std(data),
            'processed_mean': np.mean(processed_data),
            'processed_std': np.std(processed_data),
            'data_range_original': [np.min(data), np.max(data)],
            'data_range_processed': [np.min(processed_data), np.max(processed_data)]
        }
        
        print(f"数据预处理完成:")
        print(f"  原始数据: 均值={np.mean(data):.3f}, 标准差={np.std(data):.3f} mGal")
        print(f"  处理后: 均值={np.mean(processed_data):.3f}, 标准差={np.std(processed_data):.3f} mGal")
        
        return processed_data, corrections
        
    def _calculate_terrain_correction(self, locations, terrain_data):
        """计算地形校正（简化版本）"""
        # 这是一个简化的地形校正计算
        # 实际应用中需要更复杂的算法
        
        # 假设terrain_data包含每个观测点的高程和周围地形信息
        terrain_correction = np.zeros(len(locations))
        
        for i, loc in enumerate(locations):
            # 简化计算：基于观测点高程的线性校正
            elevation = loc[2]
            # 自由空气校正：0.3086 mGal/m
            free_air = 0.3086 * elevation
            # 布格校正：假设密度2.67 g/cm³
            bouguer = -0.1119 * 2.67 * elevation
            
            terrain_correction[i] = free_air + bouguer
            
        return terrain_correction
        
    def setup_forward_modeling(self,
                             mesh,
                             survey,
                             topography: np.ndarray = None,
                             active_cells: np.ndarray = None) -> gravity.simulation.Simulation3DIntegral:
        """
        设置重力正演建模
        
        Parameters:
        -----------
        mesh : discretize mesh
            计算网格
        survey : gravity survey
            观测系统
        topography : array, optional
            地形数据
        active_cells : array, optional
            活动网格标记
            
        Returns:
        --------
        simulation : gravity simulation
            重力仿真对象
        """
        self.mesh = mesh
        self.survey = survey
        
        # 处理地形
        if topography is not None:
            # 根据地形确定活动网格
            active_cells = surface2ind_topo(mesh, topography)
            self.topo = topography
        elif active_cells is None:
            # 所有网格都是活动的
            active_cells = np.ones(mesh.n_cells, dtype=bool)
            
        self.active_cells = active_cells
        n_active = np.sum(active_cells)
        
        # 创建映射
        model_map = maps.IdentityMap(nP=n_active)
        
        # 创建重力仿真
        simulation = gravity.simulation.Simulation3DIntegral(
            survey=survey,
            mesh=mesh,
            rhoMap=model_map,
            actInd=active_cells,
            store_sensitivities='forward_only'
        )
        
        self.simulation = simulation
        
        print(f"重力正演建模设置完成:")
        print(f"  网格单元总数: {mesh.n_cells}")
        print(f"  活动单元数: {n_active}")
        print(f"  观测数据数: {survey.nD}")
        print(f"  是否包含地形: {'是' if topography is not None else '否'}")
        
        return simulation
        
    def run_forward_gravity(self, density_model: np.ndarray) -> np.ndarray:
        """
        运行重力正演
        
        Parameters:
        -----------
        density_model : array
            密度模型 (kg/m³)
            
        Returns:
        --------
        predicted_data : array
            预测的重力数据 (mGal)
        """
        if self.simulation is None:
            raise ValueError("正演仿真尚未设置")
            
        # 确保模型大小正确
        if len(density_model) != np.sum(self.active_cells):
            raise ValueError(f"模型大小 {len(density_model)} 与活动网格数量 {np.sum(self.active_cells)} 不匹配")
            
        # 运行正演
        predicted_data = self.simulation.dpred(density_model)
        
        # 转换单位：从 m/s² 到 mGal
        predicted_data_mgal = predicted_data * 1e5  # 1 m/s² = 1e5 mGal
        
        print(f"重力正演计算完成:")
        print(f"  模型参数范围: {np.min(density_model):.1f} ~ {np.max(density_model):.1f} kg/m³")
        print(f"  预测数据范围: {np.min(predicted_data_mgal):.3f} ~ {np.max(predicted_data_mgal):.3f} mGal")
        
        return predicted_data_mgal
        
    def create_density_model(self,
                           model_type: str = 'layered',
                           parameters: Dict = None) -> np.ndarray:
        """
        创建密度模型
        
        Parameters:
        -----------
        model_type : str
            模型类型 'homogeneous', 'layered', 'spherical', 'block'
        parameters : dict
            模型参数
            
        Returns:
        --------
        density_model : array
            密度模型
        """
        if self.mesh is None or self.active_cells is None:
            raise ValueError("网格和活动单元尚未设置")
            
        n_active = np.sum(self.active_cells)
        cell_centers = self.mesh.cell_centers[self.active_cells]
        
        if parameters is None:
            parameters = {}
            
        if model_type == 'homogeneous':
            # 均匀模型
            density = parameters.get('density', 1000.0)  # kg/m³
            density_model = np.full(n_active, density)
            
        elif model_type == 'layered':
            # 分层模型
            n_layers = parameters.get('n_layers', 3)
            density_range = parameters.get('density_range', [500, 2000])
            
            z_coords = cell_centers[:, 2]
            z_min, z_max = np.min(z_coords), np.max(z_coords)
            layer_boundaries = np.linspace(z_min, z_max, n_layers + 1)
            
            density_model = np.zeros(n_active)
            for i in range(n_layers):
                layer_mask = (z_coords >= layer_boundaries[i]) & (z_coords < layer_boundaries[i + 1])
                layer_density = density_range[0] + i * (density_range[1] - density_range[0]) / (n_layers - 1)
                density_model[layer_mask] = layer_density
                
        elif model_type == 'spherical':
            # 球形异常体
            center = parameters.get('center', [0, 0, -100])
            radius = parameters.get('radius', 50)
            density_contrast = parameters.get('density_contrast', 500)
            background_density = parameters.get('background_density', 0)
            
            # 计算每个网格中心到球心的距离
            distances = np.sqrt(np.sum((cell_centers - center)**2, axis=1))
            
            density_model = np.full(n_active, background_density)
            sphere_mask = distances <= radius
            density_model[sphere_mask] = background_density + density_contrast
            
        elif model_type == 'block':
            # 矩形块体
            x_range = parameters.get('x_range', [-50, 50])
            y_range = parameters.get('y_range', [-50, 50])
            z_range = parameters.get('z_range', [-150, -50])
            density_contrast = parameters.get('density_contrast', 1000)
            background_density = parameters.get('background_density', 0)
            
            x_coords = cell_centers[:, 0]
            y_coords = cell_centers[:, 1]
            z_coords = cell_centers[:, 2]
            
            block_mask = (
                (x_coords >= x_range[0]) & (x_coords <= x_range[1]) &
                (y_coords >= y_range[0]) & (y_coords <= y_range[1]) &
                (z_coords >= z_range[0]) & (z_coords <= z_range[1])
            )
            
            density_model = np.full(n_active, background_density)
            density_model[block_mask] = background_density + density_contrast
            
        else:
            raise ValueError(f"不支持的模型类型: {model_type}")
            
        print(f"密度模型创建完成:")
        print(f"  模型类型: {model_type}")
        print(f"  密度范围: {np.min(density_model):.1f} ~ {np.max(density_model):.1f} kg/m³")
        print(f"  活动网格数: {n_active}")
        
        return density_model
        
    def plot_gravity_data(self,
                        locations: np.ndarray,
                        data: np.ndarray,
                        title: str = "重力数据",
                        contour_levels: int = 20,
                        colormap: str = 'RdBu_r') -> plt.Figure:
        """
        绘制重力数据
        
        Parameters:
        -----------
        locations : array
            观测点位置
        data : array
            重力数据
        title : str
            图标题
        contour_levels : int
            等值线数量
        colormap : str
            颜色映射
            
        Returns:
        --------
        fig : matplotlib figure
            图形对象
        """
        fig, axes = plt.subplots(1, 2, figsize=(12, 5))
        
        # 散点图
        scatter = axes[0].scatter(
            locations[:, 0], locations[:, 1], c=data,
            cmap=colormap, s=20, edgecolors='black', linewidth=0.5
        )
        axes[0].set_xlabel('X (m)')
        axes[0].set_ylabel('Y (m)')
        axes[0].set_title(f'{title} - 散点图')
        axes[0].grid(True, alpha=0.3)
        axes[0].set_aspect('equal')
        cbar1 = plt.colorbar(scatter, ax=axes[0])
        cbar1.set_label('重力异常 (mGal)')
        
        # 等值线图
        try:
            from scipy.interpolate import griddata
            
            # 创建规则网格
            x_min, x_max = np.min(locations[:, 0]), np.max(locations[:, 0])
            y_min, y_max = np.min(locations[:, 1]), np.max(locations[:, 1])
            
            xi = np.linspace(x_min, x_max, 100)
            yi = np.linspace(y_min, y_max, 100)
            Xi, Yi = np.meshgrid(xi, yi)
            
            # 插值到规则网格
            Zi = griddata(
                (locations[:, 0], locations[:, 1]), data,
                (Xi, Yi), method='cubic'
            )
            
            # 绘制等值线
            contour = axes[1].contourf(Xi, Yi, Zi, levels=contour_levels, cmap=colormap)
            contour_lines = axes[1].contour(Xi, Yi, Zi, levels=contour_levels, colors='black', linewidths=0.5)
            axes[1].clabel(contour_lines, inline=True, fontsize=8)
            
            axes[1].set_xlabel('X (m)')
            axes[1].set_ylabel('Y (m)')
            axes[1].set_title(f'{title} - 等值线图')
            axes[1].set_aspect('equal')
            cbar2 = plt.colorbar(contour, ax=axes[1])
            cbar2.set_label('重力异常 (mGal)')
            
        except ImportError:
            axes[1].text(0.5, 0.5, '需要 scipy 来绘制等值线图', 
                        transform=axes[1].transAxes, ha='center', va='center')
            
        plt.tight_layout()
        plt.show()
        
        return fig
        
    def plot_density_model(self,
                          density_model: np.ndarray,
                          slice_type: str = 'horizontal',
                          slice_position: float = None,
                          title: str = "密度模型") -> plt.Figure:
        """
        绘制密度模型
        
        Parameters:
        -----------
        density_model : array
            密度模型
        slice_type : str
            切片类型 'horizontal', 'vertical_x', 'vertical_y'
        slice_position : float, optional
            切片位置
        title : str
            图标题
            
        Returns:
        --------
        fig : matplotlib figure
            图形对象
        """
        if self.mesh is None:
            raise ValueError("网格尚未设置")
            
        # 创建完整模型（包括非活动网格）
        full_model = np.zeros(self.mesh.n_cells)
        full_model[self.active_cells] = density_model
        
        fig, ax = plt.subplots(1, 1, figsize=(10, 8))
        
        if slice_type == 'horizontal':
            # 水平切片
            if slice_position is None:
                slice_position = 0  # 默认在z=0处切片
                
            if hasattr(self.mesh, 'plot_slice'):
                slice_plot = self.mesh.plot_slice(
                    full_model, normal='Z', ind=slice_position,
                    ax=ax, pcolor_opts={'cmap': 'viridis'}
                )
                ax.set_title(f'{title} - 水平切片 (Z={slice_position})')
                
        elif slice_type == 'vertical_x':
            # X方向垂直切片
            if slice_position is None:
                slice_position = self.mesh.n_cells_y // 2
                
            if hasattr(self.mesh, 'plot_slice'):
                slice_plot = self.mesh.plot_slice(
                    full_model, normal='Y', ind=slice_position,
                    ax=ax, pcolor_opts={'cmap': 'viridis'}
                )
                ax.set_title(f'{title} - Y方向切片')
                
        elif slice_type == 'vertical_y':
            # Y方向垂直切片
            if slice_position is None:
                slice_position = self.mesh.n_cells_x // 2
                
            if hasattr(self.mesh, 'plot_slice'):
                slice_plot = self.mesh.plot_slice(
                    full_model, normal='X', ind=slice_position,
                    ax=ax, pcolor_opts={'cmap': 'viridis'}
                )
                ax.set_title(f'{title} - X方向切片')
                
        ax.set_xlabel('X (m)')
        ax.set_ylabel('Y (m)' if slice_type == 'horizontal' else 'Z (m)')
        
        # 添加颜色条
        cbar = plt.colorbar(slice_plot, ax=ax)
        cbar.set_label('密度 (kg/m³)')
        
        plt.tight_layout()
        plt.show()
        
        return fig
        
    def export_results(self,
                      file_path: str,
                      density_model: np.ndarray,
                      predicted_data: np.ndarray = None,
                      observed_data: np.ndarray = None):
        """
        导出结果
        
        Parameters:
        -----------
        file_path : str
            输出文件路径
        density_model : array
            密度模型
        predicted_data : array, optional
            预测数据
        observed_data : array, optional
            观测数据
        """
        import h5py
        
        with h5py.File(file_path, 'w') as f:
            # 保存密度模型
            f.create_dataset('density_model', data=density_model)
            
            # 保存网格信息
            if self.mesh is not None:
                mesh_group = f.create_group('mesh')
                mesh_group.create_dataset('cell_centers', data=self.mesh.cell_centers)
                mesh_group.create_dataset('active_cells', data=self.active_cells)
                mesh_group.attrs['n_cells'] = self.mesh.n_cells
                mesh_group.attrs['n_active'] = np.sum(self.active_cells)
                
            # 保存观测系统
            if self.survey is not None:
                survey_group = f.create_group('survey')
                survey_group.create_dataset('receiver_locations', 
                                          data=self.survey.receiver_locations)
                survey_group.attrs['n_data'] = self.survey.nD
                
            # 保存数据
            if predicted_data is not None:
                f.create_dataset('predicted_data', data=predicted_data)
            if observed_data is not None:
                f.create_dataset('observed_data', data=observed_data)
                
            # 保存元信息
            f.attrs['method'] = 'gravity'
            f.attrs['timestamp'] = time.time()
            
        print(f"重力方法结果已导出到: {file_path}")


# 示例使用
def create_gravity_example():
    """创建重力方法示例"""
    gravity_module = GravityModule()
    
    print("=== 重力方法模块示例 ===")
    
    # 创建观测点
    x = np.arange(-200, 201, 25)
    y = np.arange(-200, 201, 25)
    X, Y = np.meshgrid(x, y)
    receiver_locations = np.column_stack([
        X.ravel(), Y.ravel(), np.zeros(X.size)
    ])
    
    # 创建观测系统
    survey = gravity_module.create_gravity_survey(receiver_locations)
    
    print(f"\n观测系统创建完成，包含 {len(receiver_locations)} 个测点")
    
    return gravity_module


if __name__ == "__main__":
    # 运行示例
    import time
    gravity_module = create_gravity_example()
