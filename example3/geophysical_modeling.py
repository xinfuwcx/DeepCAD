"""
地球物理建模系统
Geophysical Modeling System

实现重力场、磁场正演计算和地球物理数据反演
"""

import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import pandas as pd
import pyvista as pv
from scipy import interpolate, optimize, fftpack
from scipy.spatial import cKDTree
from scipy.integrate import quad
import json
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass
from enum import Enum
import warnings
warnings.filterwarnings('ignore')


@dataclass
class GeophysicalProperties:
    """地球物理属性"""
    density: float              # 密度 (g/cm³)
    susceptibility: float       # 磁化率 (SI)
    resistivity: float          # 电阻率 (Ω·m)
    velocity_p: float           # P波速度 (m/s)
    velocity_s: float           # S波速度 (m/s)
    porosity: float            # 孔隙率 (%)
    
    def __post_init__(self):
        """属性验证"""
        if self.density <= 0:
            raise ValueError("密度必须大于0")
        if self.porosity < 0 or self.porosity > 100:
            raise ValueError("孔隙率必须在0-100%之间")


class GeophysicalModeler:
    """地球物理建模器"""
    
    def __init__(self, model_bounds: Tuple[float, float, float, float, float, float],
                 resolution: Tuple[int, int, int]):
        """
        初始化地球物理建模器
        
        Args:
            model_bounds: (x_min, x_max, y_min, y_max, z_min, z_max)
            resolution: (nx, ny, nz) 网格分辨率
        """
        self.model_bounds = model_bounds
        self.resolution = resolution
        
        # 创建坐标网格
        self.x = np.linspace(model_bounds[0], model_bounds[1], resolution[0])
        self.y = np.linspace(model_bounds[2], model_bounds[3], resolution[1])
        self.z = np.linspace(model_bounds[4], model_bounds[5], resolution[2])
        
        self.X, self.Y, self.Z = np.meshgrid(self.x, self.y, self.z, indexing='ij')
        
        # 初始化属性网格
        self.density_model = np.zeros(self.resolution)
        self.susceptibility_model = np.zeros(self.resolution)
        self.resistivity_model = np.ones(self.resolution) * 100  # 默认100Ω·m
        
        # 地球物理场数据
        self.gravity_field = None
        self.magnetic_field = None
        self.electrical_field = None
        
        # 观测点数据
        self.observation_points = None
        self.gravity_observations = None
        self.magnetic_observations = None
        
        print(f"✓ 地球物理建模器已初始化:")
        print(f"  模型范围: {model_bounds}")
        print(f"  网格分辨率: {resolution}")
        print(f"  总网格点数: {np.prod(resolution):,}")
        
    def set_rock_properties(self, lithology_model: np.ndarray, 
                           property_dict: Dict[int, GeophysicalProperties]):
        """
        设置岩石物理属性
        
        Args:
            lithology_model: 岩性模型 (整数数组，不同值代表不同岩性)
            property_dict: 属性字典 {岩性ID: GeophysicalProperties}
        """
        if lithology_model.shape != self.resolution:
            raise ValueError("岩性模型尺寸与网格分辨率不匹配")
        
        # 根据岩性分配物理属性
        for lith_id, props in property_dict.items():
            mask = lithology_model == lith_id
            
            self.density_model[mask] = props.density
            self.susceptibility_model[mask] = props.susceptibility
            self.resistivity_model[mask] = props.resistivity
        
        print(f"✓ 岩石物理属性已设置:")
        print(f"  岩性类型: {len(property_dict)} 种")
        print(f"  密度范围: {self.density_model.min():.2f} - {self.density_model.max():.2f} g/cm³")
        print(f"  磁化率范围: {self.susceptibility_model.min():.4f} - {self.susceptibility_model.max():.4f} SI")
        
    def compute_gravity_forward(self, observation_height: float = 0) -> np.ndarray:
        """
        重力正演计算
        
        Args:
            observation_height: 观测高度 (m，相对于地表)
        
        Returns:
            重力异常网格 (mGal)
        """
        print("🔄 计算重力正演...")
        
        # 常数
        G = 6.67430e-11  # 万有引力常数 (m³/kg·s²)
        
        # 计算网格单元体积
        dx = self.x[1] - self.x[0] if len(self.x) > 1 else 1000
        dy = self.y[1] - self.y[0] if len(self.y) > 1 else 1000
        dz = self.z[1] - self.z[0] if len(self.z) > 1 else 50
        dV = dx * dy * dz
        
        # 观测面网格 (地表 + 观测高度)
        obs_z = self.model_bounds[5] + observation_height
        obs_x, obs_y = np.meshgrid(self.x, self.y, indexing='ij')
        
        # 初始化重力异常
        gravity_anomaly = np.zeros_like(obs_x)
        
        # 计算每个观测点的重力异常
        print("  计算重力核函数...")
        
        for i in range(len(self.x)):
            if i % max(1, len(self.x)//10) == 0:
                print(f"    进度: {i}/{len(self.x)} ({100*i/len(self.x):.1f}%)")
                
            for j in range(len(self.y)):
                # 当前观测点
                obs_point = np.array([obs_x[i, j], obs_y[i, j], obs_z])
                
                # 计算与所有网格单元的距离和重力贡献
                for ki in range(len(self.x)):
                    for kj in range(len(self.y)):
                        for kk in range(len(self.z)):
                            
                            # 网格单元中心
                            grid_point = np.array([self.X[ki, kj, kk], 
                                                 self.Y[ki, kj, kk], 
                                                 self.Z[ki, kj, kk]])
                            
                            # 距离向量
                            r_vec = obs_point - grid_point
                            r = np.linalg.norm(r_vec)
                            
                            if r > 0:  # 避免除零
                                # 密度转换 (g/cm³ -> kg/m³)
                                density_kg_m3 = self.density_model[ki, kj, kk] * 1000
                                
                                # 质量
                                mass = density_kg_m3 * dV
                                
                                # 重力加速度的垂直分量 (向下为正)
                                gz = G * mass * r_vec[2] / (r**3)
                                
                                # 累加到重力异常 (转换为mGal: 1 m/s² = 10⁵ mGal)
                                gravity_anomaly[i, j] += gz * 1e5
        
        # 去除背景重力场 (简化处理)
        gravity_anomaly -= np.mean(gravity_anomaly)
        
        self.gravity_field = gravity_anomaly
        
        print(f"✓ 重力正演计算完成")
        print(f"  异常范围: {gravity_anomaly.min():.2f} - {gravity_anomaly.max():.2f} mGal")
        
        return gravity_anomaly
        
    def compute_magnetic_forward(self, inclination: float = 60, 
                               declination: float = 0,
                               field_strength: float = 50000) -> np.ndarray:
        """
        磁场正演计算
        
        Args:
            inclination: 地磁倾角 (度)
            declination: 地磁偏角 (度) 
            field_strength: 地磁场强度 (nT)
        
        Returns:
            总磁场异常 (nT)
        """
        print("🔄 计算磁场正演...")
        
        # 地磁场方向单位向量
        inc_rad = np.radians(inclination)
        dec_rad = np.radians(declination)
        
        h0 = np.array([
            np.cos(inc_rad) * np.cos(dec_rad),  # x分量
            np.cos(inc_rad) * np.sin(dec_rad),  # y分量
            np.sin(inc_rad)                     # z分量 (向下为正)
        ])
        
        # 磁导率常数
        mu_0 = 4 * np.pi * 1e-7  # H/m
        
        # 计算网格单元体积
        dx = self.x[1] - self.x[0] if len(self.x) > 1 else 1000
        dy = self.y[1] - self.y[0] if len(self.y) > 1 else 1000
        dz = self.z[1] - self.z[0] if len(self.z) > 1 else 50
        dV = dx * dy * dz
        
        # 观测面网格 (地表上方10m)
        obs_z = self.model_bounds[5] + 10
        obs_x, obs_y = np.meshgrid(self.x, self.y, indexing='ij')
        
        # 初始化磁异常
        magnetic_anomaly = np.zeros_like(obs_x)
        
        print("  计算磁偶极子场...")
        
        for i in range(len(self.x)):
            if i % max(1, len(self.x)//10) == 0:
                print(f"    进度: {i}/{len(self.x)} ({100*i/len(self.x):.1f}%)")
                
            for j in range(len(self.y)):
                # 当前观测点
                obs_point = np.array([obs_x[i, j], obs_y[i, j], obs_z])
                
                # 累积磁场
                total_field = np.zeros(3)
                
                for ki in range(len(self.x)):
                    for kj in range(len(self.y)):
                        for kk in range(len(self.z)):
                            
                            # 网格单元中心
                            grid_point = np.array([self.X[ki, kj, kk], 
                                                 self.Y[ki, kj, kk], 
                                                 self.Z[ki, kj, kk]])
                            
                            # 距离向量
                            r_vec = obs_point - grid_point
                            r = np.linalg.norm(r_vec)
                            
                            if r > 10:  # 避免奇点，设置最小距离
                                # 磁化强度
                                susceptibility = self.susceptibility_model[ki, kj, kk]
                                magnetization = susceptibility * field_strength / mu_0
                                
                                # 磁偶极矩 (假设与地磁场同向)
                                m = magnetization * h0 * dV
                                
                                # 磁偶极子场计算
                                r_hat = r_vec / r
                                
                                # 磁场 = (μ₀/4π) * [3(m·r̂)r̂ - m] / r³
                                m_dot_r = np.dot(m, r_hat)
                                
                                field_contrib = (mu_0 / (4 * np.pi)) * \
                                              (3 * m_dot_r * r_hat - m) / (r**3)
                                
                                total_field += field_contrib
                
                # 计算总磁场异常 (沿地磁场方向的分量)
                magnetic_anomaly[i, j] = np.dot(total_field, h0) * 1e9  # 转换为nT
        
        # 去除背景磁场
        magnetic_anomaly -= np.mean(magnetic_anomaly)
        
        self.magnetic_field = magnetic_anomaly
        
        print(f"✓ 磁场正演计算完成")
        print(f"  异常范围: {magnetic_anomaly.min():.1f} - {magnetic_anomaly.max():.1f} nT")
        
        return magnetic_anomaly
    
    def add_observation_data(self, obs_points: np.ndarray, 
                           gravity_obs: np.ndarray = None,
                           magnetic_obs: np.ndarray = None):
        """
        添加观测数据
        
        Args:
            obs_points: 观测点坐标 [[x1,y1,z1], [x2,y2,z2], ...]
            gravity_obs: 重力观测值 (mGal)
            magnetic_obs: 磁场观测值 (nT)
        """
        self.observation_points = np.array(obs_points)
        self.gravity_observations = gravity_obs
        self.magnetic_observations = magnetic_obs
        
        print(f"✓ 观测数据已添加:")
        print(f"  观测点数: {len(obs_points)}")
        if gravity_obs is not None:
            print(f"  重力观测范围: {gravity_obs.min():.2f} - {gravity_obs.max():.2f} mGal")
        if magnetic_obs is not None:
            print(f"  磁场观测范围: {magnetic_obs.min():.1f} - {magnetic_obs.max():.1f} nT")
    
    def simple_gravity_inversion(self, regularization: float = 0.1) -> np.ndarray:
        """
        简单重力反演
        
        Args:
            regularization: 正则化参数
            
        Returns:
            反演得到的密度模型
        """
        if self.observation_points is None or self.gravity_observations is None:
            raise ValueError("需要先添加重力观测数据")
        
        print("🔄 开始重力反演...")
        
        n_obs = len(self.observation_points)
        n_cells = np.prod(self.resolution)
        
        # 构建核矩阵 (简化版本)
        print("  构建核矩阵...")
        G_matrix = np.zeros((n_obs, n_cells))
        
        # 网格单元索引到3D坐标的映射
        cell_coords = np.array([
            [self.X.flat[i], self.Y.flat[i], self.Z.flat[i]] 
            for i in range(n_cells)
        ])
        
        # 计算网格单元体积
        dx = self.x[1] - self.x[0] if len(self.x) > 1 else 1000
        dy = self.y[1] - self.y[0] if len(self.y) > 1 else 1000  
        dz = self.z[1] - self.z[0] if len(self.z) > 1 else 50
        dV = dx * dy * dz
        
        G_const = 6.67430e-11 * dV * 1e5  # 包含常数和单位转换
        
        for i, obs_point in enumerate(self.observation_points):
            if i % max(1, n_obs//10) == 0:
                print(f"    进度: {i}/{n_obs} ({100*i/n_obs:.1f}%)")
            
            # 计算观测点到所有网格单元的距离
            distances = np.linalg.norm(cell_coords - obs_point, axis=1)
            
            # 避免除零
            distances = np.maximum(distances, 10)
            
            # 重力核函数 (简化为点质量)
            G_matrix[i, :] = G_const / (distances**3) * \
                           (obs_point[2] - cell_coords[:, 2])
        
        # 正则化最小二乘反演
        print("  执行正则化反演...")
        
        # 构建正则化矩阵 (平滑算子)
        L = self._build_smoothing_matrix()
        
        # 正规方程: (G^T G + λ L^T L) m = G^T d
        GTG = G_matrix.T @ G_matrix
        LTL = L.T @ L
        GTd = G_matrix.T @ self.gravity_observations
        
        # 求解
        A = GTG + regularization * LTL
        density_vec = np.linalg.solve(A, GTd)
        
        # 重塑为3D数组
        inverted_density = density_vec.reshape(self.resolution)
        
        # 计算拟合误差
        predicted = G_matrix @ density_vec
        rms_error = np.sqrt(np.mean((predicted - self.gravity_observations)**2))
        
        print(f"✓ 重力反演完成")
        print(f"  拟合误差 (RMS): {rms_error:.3f} mGal")
        print(f"  反演密度范围: {inverted_density.min():.3f} - {inverted_density.max():.3f} g/cm³")
        
        return inverted_density
    
    def _build_smoothing_matrix(self) -> np.ndarray:
        """构建平滑正则化矩阵"""
        n_cells = np.prod(self.resolution)
        nx, ny, nz = self.resolution
        
        # 简化的拉普拉斯算子
        from scipy.sparse import diags, lil_matrix
        
        L = lil_matrix((n_cells, n_cells))
        
        for i in range(n_cells):
            # 转换为3D索引
            ix = i // (ny * nz)
            iy = (i % (ny * nz)) // nz
            iz = i % nz
            
            # 中心权重
            L[i, i] = -6
            
            # 邻居权重
            neighbors = [
                (ix+1, iy, iz), (ix-1, iy, iz),
                (ix, iy+1, iz), (ix, iy-1, iz),
                (ix, iy, iz+1), (ix, iy, iz-1)
            ]
            
            for nx_idx, ny_idx, nz_idx in neighbors:
                if (0 <= nx_idx < nx and 0 <= ny_idx < ny and 0 <= nz_idx < nz):
                    neighbor_i = nx_idx * (ny * nz) + ny_idx * nz + nz_idx
                    L[i, neighbor_i] = 1
        
        return L.tocsr()
    
    def compute_spectral_analysis(self, field_data: np.ndarray) -> Dict:
        """
        频谱分析
        
        Args:
            field_data: 2D场数据
            
        Returns:
            频谱分析结果
        """
        print("🔄 执行频谱分析...")
        
        # 2D傅里叶变换
        fft_2d = fftpack.fft2(field_data)
        power_spectrum = np.abs(fft_2d)**2
        
        # 波数网格
        kx = fftpack.fftfreq(field_data.shape[0], d=self.x[1]-self.x[0])
        ky = fftpack.fftfreq(field_data.shape[1], d=self.y[1]-self.y[0])
        
        KX, KY = np.meshgrid(kx, ky, indexing='ij')
        k_radial = np.sqrt(KX**2 + KY**2)
        
        # 径向平均功率谱
        k_bins = np.linspace(0, k_radial.max(), 50)
        radial_power = np.zeros(len(k_bins)-1)
        
        for i in range(len(k_bins)-1):
            mask = (k_radial >= k_bins[i]) & (k_radial < k_bins[i+1])
            if np.any(mask):
                radial_power[i] = np.mean(power_spectrum[mask])
        
        k_centers = (k_bins[1:] + k_bins[:-1]) / 2
        
        # 估算源体深度 (基于频谱衰减)
        # 简化方法: 寻找功率谱-3dB点
        max_power = np.max(radial_power[radial_power > 0])
        half_power_idx = np.where(radial_power < max_power/2)[0]
        
        if len(half_power_idx) > 0:
            cutoff_k = k_centers[half_power_idx[0]]
            estimated_depth = 1 / (2 * cutoff_k) if cutoff_k > 0 else 0
        else:
            estimated_depth = 0
        
        results = {
            'power_spectrum_2d': power_spectrum,
            'radial_power': radial_power,
            'wavenumbers': k_centers,
            'estimated_depth': estimated_depth,
            'dominant_wavelength': 1/k_centers[np.argmax(radial_power)] if np.max(radial_power) > 0 else 0
        }
        
        print(f"✓ 频谱分析完成")
        print(f"  估算源体深度: {estimated_depth:.1f} m")
        print(f"  主要波长: {results['dominant_wavelength']:.1f} m")
        
        return results
    
    def create_visualization_data(self) -> Dict[str, Any]:
        """创建可视化数据"""
        vis_data = {}
        
        # 密度模型
        if np.any(self.density_model > 0):
            density_grid = pv.StructuredGrid(self.X, self.Y, self.Z)
            density_grid['density'] = self.density_model.ravel('F')
            vis_data['density_model'] = density_grid
        
        # 磁化率模型  
        if np.any(self.susceptibility_model != 0):
            suscept_grid = pv.StructuredGrid(self.X, self.Y, self.Z)
            suscept_grid['susceptibility'] = self.susceptibility_model.ravel('F')
            vis_data['susceptibility_model'] = suscept_grid
        
        # 重力场
        if self.gravity_field is not None:
            grav_surface = pv.StructuredGrid()
            xx, yy = np.meshgrid(self.x, self.y, indexing='ij')
            zz = np.full_like(xx, self.model_bounds[5] + 10)  # 地表上10m
            
            grav_surface.points = np.column_stack([
                xx.ravel(), yy.ravel(), zz.ravel()
            ])
            grav_surface.dimensions = [len(self.x), len(self.y), 1]
            grav_surface['gravity_anomaly'] = self.gravity_field.ravel()
            vis_data['gravity_field'] = grav_surface
        
        # 磁场
        if self.magnetic_field is not None:
            mag_surface = pv.StructuredGrid()
            xx, yy = np.meshgrid(self.x, self.y, indexing='ij')
            zz = np.full_like(xx, self.model_bounds[5] + 10)
            
            mag_surface.points = np.column_stack([
                xx.ravel(), yy.ravel(), zz.ravel()
            ])
            mag_surface.dimensions = [len(self.x), len(self.y), 1]
            mag_surface['magnetic_anomaly'] = self.magnetic_field.ravel()
            vis_data['magnetic_field'] = mag_surface
        
        # 观测点
        if self.observation_points is not None:
            obs_points = pv.PolyData(self.observation_points)
            
            if self.gravity_observations is not None:
                obs_points['gravity_obs'] = self.gravity_observations
            if self.magnetic_observations is not None:
                obs_points['magnetic_obs'] = self.magnetic_observations
                
            vis_data['observation_points'] = obs_points
        
        return vis_data
    
    def export_geophysical_data(self, filepath: str):
        """导出地球物理数据"""
        try:
            export_data = {
                'model_bounds': self.model_bounds,
                'resolution': self.resolution,
                'density_model': self.density_model.tolist(),
                'susceptibility_model': self.susceptibility_model.tolist(),
                'gravity_field': self.gravity_field.tolist() if self.gravity_field is not None else None,
                'magnetic_field': self.magnetic_field.tolist() if self.magnetic_field is not None else None,
                'observation_points': self.observation_points.tolist() if self.observation_points is not None else None,
                'gravity_observations': self.gravity_observations.tolist() if self.gravity_observations is not None else None,
                'magnetic_observations': self.magnetic_observations.tolist() if self.magnetic_observations is not None else None
            }
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False)
            
            print(f"✓ 地球物理数据已导出: {filepath}")
            
        except Exception as e:
            print(f"❌ 导出地球物理数据失败: {str(e)}")


def create_demo_geophysical_model():
    """创建演示地球物理模型"""
    print("🌍 创建地球物理建模演示...")
    
    # 创建建模器 (2km x 2km x 500m 区域)
    modeler = GeophysicalModeler(
        model_bounds=(0, 2000, 0, 2000, -500, 0),
        resolution=(40, 40, 20)
    )
    
    # 创建简单的岩性模型
    print("  创建岩性模型...")
    lithology_model = np.ones(modeler.resolution, dtype=int)
    
    # 添加一个高密度异常体 (侵入岩体)
    center_x, center_y, center_z = 20, 20, 15  # 网格索引
    size = 8
    
    lithology_model[
        center_x-size:center_x+size,
        center_y-size:center_y+size,
        center_z-size:center_z+size
    ] = 2  # 侵入岩
    
    # 添加一个磁性异常体
    mag_x, mag_y, mag_z = 30, 10, 12
    mag_size = 6
    
    lithology_model[
        mag_x-mag_size:mag_x+mag_size,
        mag_y-mag_size:mag_y+mag_size,
        mag_z-mag_size:mag_z+mag_size
    ] = 3  # 磁性岩石
    
    # 设置岩石物理属性
    properties = {
        1: GeophysicalProperties(  # 沉积岩
            density=2.3, susceptibility=0.001, resistivity=100,
            velocity_p=3000, velocity_s=1500, porosity=15
        ),
        2: GeophysicalProperties(  # 侵入岩
            density=2.8, susceptibility=0.01, resistivity=1000,
            velocity_p=5000, velocity_s=3000, porosity=2
        ),
        3: GeophysicalProperties(  # 磁性岩石
            density=2.7, susceptibility=0.05, resistivity=500,
            velocity_p=4500, velocity_s=2500, porosity=5
        )
    }
    
    modeler.set_rock_properties(lithology_model, properties)
    
    # 重力正演计算
    print("  计算重力场...")
    gravity_field = modeler.compute_gravity_forward(observation_height=10)
    
    # 磁场正演计算  
    print("  计算磁场...")
    magnetic_field = modeler.compute_magnetic_forward(
        inclination=60, declination=0, field_strength=50000
    )
    
    # 生成合成观测数据
    print("  生成观测数据...")
    n_obs = 100
    obs_x = np.random.uniform(200, 1800, n_obs)
    obs_y = np.random.uniform(200, 1800, n_obs)
    obs_z = np.full(n_obs, 10)  # 地表上10m观测
    
    obs_points = np.column_stack([obs_x, obs_y, obs_z])
    
    # 从正演结果插值观测值
    from scipy.interpolate import griddata
    
    grid_points = np.column_stack([
        modeler.X[:,:,0].ravel(), 
        modeler.Y[:,:,0].ravel()
    ])
    
    gravity_obs = griddata(
        grid_points, gravity_field.ravel(),
        (obs_x, obs_y), method='linear'
    )
    
    magnetic_obs = griddata(
        grid_points, magnetic_field.ravel(), 
        (obs_x, obs_y), method='linear'
    )
    
    # 添加噪声
    gravity_obs += np.random.normal(0, 0.1, n_obs)  # 0.1 mGal噪声
    magnetic_obs += np.random.normal(0, 5, n_obs)   # 5 nT噪声
    
    modeler.add_observation_data(obs_points, gravity_obs, magnetic_obs)
    
    # 简单反演
    print("  执行重力反演...")
    try:
        inverted_density = modeler.simple_gravity_inversion(regularization=0.01)
    except Exception as e:
        print(f"  反演失败: {e}")
        inverted_density = None
    
    # 频谱分析
    print("  执行频谱分析...")
    spectral_results = modeler.compute_spectral_analysis(gravity_field)
    
    # 创建可视化数据
    vis_data = modeler.create_visualization_data()
    
    # 导出数据
    modeler.export_geophysical_data("example3/geophysical_model.json")
    
    print("🎉 地球物理建模演示完成！")
    print(f"  - 岩性模型: ✓ 3种岩性")
    print(f"  - 重力正演: ✓ 异常范围 {gravity_field.min():.2f} - {gravity_field.max():.2f} mGal")
    print(f"  - 磁场正演: ✓ 异常范围 {magnetic_field.min():.1f} - {magnetic_field.max():.1f} nT")
    print(f"  - 观测数据: ✓ {n_obs} 个观测点")
    print(f"  - 频谱分析: ✓ 估算深度 {spectral_results['estimated_depth']:.1f} m")
    if inverted_density is not None:
        print(f"  - 重力反演: ✓")
    
    return modeler, vis_data, spectral_results


if __name__ == "__main__":
    # 运行演示
    modeler, vis_data, spectral = create_demo_geophysical_model()
    
    # 简单可视化
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    
    # 重力异常
    if modeler.gravity_field is not None:
        im1 = axes[0,0].imshow(modeler.gravity_field.T, origin='lower', 
                              extent=[modeler.x[0], modeler.x[-1], 
                                     modeler.y[0], modeler.y[-1]],
                              cmap='RdBu_r')
        axes[0,0].set_title('重力异常 (mGal)')
        axes[0,0].set_xlabel('X (m)')
        axes[0,0].set_ylabel('Y (m)')
        plt.colorbar(im1, ax=axes[0,0])
    
    # 磁场异常
    if modeler.magnetic_field is not None:
        im2 = axes[0,1].imshow(modeler.magnetic_field.T, origin='lower',
                              extent=[modeler.x[0], modeler.x[-1],
                                     modeler.y[0], modeler.y[-1]], 
                              cmap='RdBu_r')
        axes[0,1].set_title('磁场异常 (nT)')
        axes[0,1].set_xlabel('X (m)')
        axes[0,1].set_ylabel('Y (m)')
        plt.colorbar(im2, ax=axes[0,1])
    
    # 功率谱
    if 'radial_power' in spectral:
        axes[1,0].loglog(spectral['wavenumbers'], spectral['radial_power'])
        axes[1,0].set_title('径向功率谱')
        axes[1,0].set_xlabel('波数 (1/m)')
        axes[1,0].set_ylabel('功率')
        axes[1,0].grid(True)
    
    # 观测点分布
    if modeler.observation_points is not None:
        scatter = axes[1,1].scatter(
            modeler.observation_points[:, 0],
            modeler.observation_points[:, 1],
            c=modeler.gravity_observations,
            cmap='RdBu_r'
        )
        axes[1,1].set_title('重力观测点')
        axes[1,1].set_xlabel('X (m)')
        axes[1,1].set_ylabel('Y (m)')
        plt.colorbar(scatter, ax=axes[1,1])
    
    plt.tight_layout()
    plt.savefig('example3/geophysical_results.png', dpi=150, bbox_inches='tight')
    plt.show()
    
    print("📊 地球物理图表已保存到: example3/geophysical_results.png")