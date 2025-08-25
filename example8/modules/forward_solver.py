"""
SimPEG 正演求解器
支持多种地球物理方法的正演建模
"""

import numpy as np
from typing import Dict, List, Optional, Union, Tuple
from SimPEG import (
    maps, utils, data_misfit, regularization, optimization, 
    inverse_problem, inversion, directives
)
from SimPEG.potential_fields import gravity, magnetics
from SimPEG.electromagnetics import frequency_domain as fdem, time_domain as tdem
from SimPEG.flow import richards
import matplotlib.pyplot as plt
import time


class ForwardSolver:
    """SimPEG 正演求解器"""
    
    def __init__(self):
        self.simulations = {}
        self.current_simulation = None
        self.mesh = None
        self.survey = None
        
    def setup_gravity_simulation(self, 
                                mesh,
                                survey,
                                density_model: np.ndarray = None,
                                reference_density: float = 0.0) -> object:
        """
        设置重力正演仿真
        
        Parameters:
        -----------
        mesh : discretize mesh
            计算网格
        survey : SimPEG survey
            观测系统
        density_model : array, optional
            密度模型 (kg/m³)
        reference_density : float
            参考密度
            
        Returns:
        --------
        simulation : SimPEG simulation
            重力仿真对象
        """
        self.mesh = mesh
        self.survey = survey
        
        # 创建重力仿真
        simulation = gravity.simulation.Simulation3DIntegral(
            survey=survey,
            mesh=mesh,
            rhoMap=maps.IdentityMap(mesh),
            actInd=None  # 活动网格索引，None表示全部网格
        )
        
        # 设置参考密度
        if hasattr(simulation, 'rho_reference'):
            simulation.rho_reference = reference_density
            
        self.simulations['gravity'] = simulation
        self.current_simulation = simulation
        
        print(f"重力正演仿真设置完成:")
        print(f"  网格单元数: {mesh.n_cells}")
        print(f"  观测点数: {survey.nD}")
        print(f"  参考密度: {reference_density} kg/m³")
        
        # 如果提供了密度模型，进行正演计算
        if density_model is not None:
            predicted_data = self.run_forward_gravity(density_model)
            print(f"  正演数据范围: {np.min(predicted_data):.3f} ~ {np.max(predicted_data):.3f} mGal")
            
        return simulation
        
    def run_forward_gravity(self, density_model: np.ndarray) -> np.ndarray:
        """
        运行重力正演
        
        Parameters:
        -----------
        density_model : array
            密度模型
            
        Returns:
        --------
        predicted_data : array
            预测的重力数据
        """
        if 'gravity' not in self.simulations:
            raise ValueError("重力仿真尚未设置")
            
        simulation = self.simulations['gravity']
        
        start_time = time.time()
        predicted_data = simulation.dpred(density_model)
        compute_time = time.time() - start_time
        
        print(f"重力正演计算完成，耗时: {compute_time:.2f} 秒")
        
        return predicted_data
        
    def setup_magnetic_simulation(self,
                                 mesh,
                                 survey,
                                 susceptibility_model: np.ndarray = None,
                                 background_field: List[float] = [50000, 60, 0],
                                 model_type: str = 'susceptibility') -> object:
        """
        设置磁法正演仿真
        
        Parameters:
        -----------
        mesh : discretize mesh
            计算网格
        survey : SimPEG survey
            观测系统
        susceptibility_model : array, optional
            磁化率模型
        background_field : list
            背景磁场 [强度(nT), 倾角(度), 偏角(度)]
        model_type : str
            模型类型 'susceptibility' 或 'vector'
            
        Returns:
        --------
        simulation : SimPEG simulation
            磁法仿真对象
        """
        self.mesh = mesh
        self.survey = survey
        
        # 转换背景磁场方向为向量
        inclination = np.radians(background_field[1])
        declination = np.radians(background_field[2])
        intensity = background_field[0]
        
        # 计算背景磁场向量
        b0 = intensity * np.array([
            np.cos(inclination) * np.cos(declination),
            np.cos(inclination) * np.sin(declination),
            np.sin(inclination)
        ])
        
        if model_type == 'susceptibility':
            # 磁化率模型
            simulation = magnetics.simulation.Simulation3DIntegral(
                survey=survey,
                mesh=mesh,
                chiMap=maps.IdentityMap(mesh),
                actInd=None,
                model_type='susceptibility'
            )
        else:
            # 矢量磁化模型
            simulation = magnetics.simulation.Simulation3DIntegral(
                survey=survey,
                mesh=mesh,
                model_type='vector'
            )
            
        # 设置背景磁场
        simulation.B0 = b0
        
        self.simulations['magnetics'] = simulation
        self.current_simulation = simulation
        
        print(f"磁法正演仿真设置完成:")
        print(f"  网格单元数: {mesh.n_cells}")
        print(f"  观测点数: {survey.nD}")
        print(f"  背景磁场: {intensity:.0f} nT, I={background_field[1]:.1f}°, D={background_field[2]:.1f}°")
        print(f"  模型类型: {model_type}")
        
        # 如果提供了磁化率模型，进行正演计算
        if susceptibility_model is not None:
            predicted_data = self.run_forward_magnetic(susceptibility_model)
            print(f"  正演数据范围: {np.min(predicted_data):.3f} ~ {np.max(predicted_data):.3f} nT")
            
        return simulation
        
    def run_forward_magnetic(self, susceptibility_model: np.ndarray) -> np.ndarray:
        """
        运行磁法正演
        
        Parameters:
        -----------
        susceptibility_model : array
            磁化率模型
            
        Returns:
        --------
        predicted_data : array
            预测的磁法数据
        """
        if 'magnetics' not in self.simulations:
            raise ValueError("磁法仿真尚未设置")
            
        simulation = self.simulations['magnetics']
        
        start_time = time.time()
        predicted_data = simulation.dpred(susceptibility_model)
        compute_time = time.time() - start_time
        
        print(f"磁法正演计算完成，耗时: {compute_time:.2f} 秒")
        
        return predicted_data
        
    def setup_dc_simulation(self,
                           mesh,
                           survey,
                           conductivity_model: np.ndarray = None,
                           boundary_conditions: str = 'Neumann') -> object:
        """
        设置直流电法正演仿真
        
        Parameters:
        -----------
        mesh : discretize mesh
            计算网格
        survey : SimPEG survey
            观测系统
        conductivity_model : array, optional
            电导率模型
        boundary_conditions : str
            边界条件类型
            
        Returns:
        --------
        simulation : SimPEG simulation
            直流电法仿真对象
        """
        from SimPEG.electromagnetics.static import resistivity as dc
        
        self.mesh = mesh
        self.survey = survey
        
        # 创建直流电法仿真
        simulation = dc.simulation.Simulation3DCellCentered(
            survey=survey,
            mesh=mesh,
            sigmaMap=maps.IdentityMap(mesh),
            bc_type=boundary_conditions
        )
        
        self.simulations['dc_resistivity'] = simulation
        self.current_simulation = simulation
        
        print(f"直流电法正演仿真设置完成:")
        print(f"  网格单元数: {mesh.n_cells}")
        print(f"  观测数据数: {survey.nD}")
        print(f"  边界条件: {boundary_conditions}")
        
        # 如果提供了电导率模型，进行正演计算
        if conductivity_model is not None:
            predicted_data = self.run_forward_dc(conductivity_model)
            print(f"  正演数据范围: {np.min(predicted_data):.3e} ~ {np.max(predicted_data):.3e} V")
            
        return simulation
        
    def run_forward_dc(self, conductivity_model: np.ndarray) -> np.ndarray:
        """
        运行直流电法正演
        
        Parameters:
        -----------
        conductivity_model : array
            电导率模型 (S/m)
            
        Returns:
        --------
        predicted_data : array
            预测的电位数据
        """
        if 'dc_resistivity' not in self.simulations:
            raise ValueError("直流电法仿真尚未设置")
            
        simulation = self.simulations['dc_resistivity']
        
        start_time = time.time()
        predicted_data = simulation.dpred(conductivity_model)
        compute_time = time.time() - start_time
        
        print(f"直流电法正演计算完成，耗时: {compute_time:.2f} 秒")
        
        return predicted_data
        
    def setup_em_simulation(self,
                           mesh,
                           survey,
                           conductivity_model: np.ndarray = None,
                           frequency_domain: bool = True,
                           formulation: str = 'EB') -> object:
        """
        设置电磁法正演仿真
        
        Parameters:
        -----------
        mesh : discretize mesh
            计算网格
        survey : SimPEG survey
            观测系统
        conductivity_model : array, optional
            电导率模型
        frequency_domain : bool
            是否为频率域（False为时间域）
        formulation : str
            公式类型 'EB' 或 'HJ'
            
        Returns:
        --------
        simulation : SimPEG simulation
            电磁法仿真对象
        """
        self.mesh = mesh
        self.survey = survey
        
        if frequency_domain:
            # 频率域电磁法
            if formulation == 'EB':
                simulation = fdem.simulation.Simulation3DElectricField(
                    survey=survey,
                    mesh=mesh,
                    sigmaMap=maps.IdentityMap(mesh)
                )
            else:  # HJ formulation
                simulation = fdem.simulation.Simulation3DMagneticFluxDensity(
                    survey=survey,
                    mesh=mesh,
                    sigmaMap=maps.IdentityMap(mesh)
                )
            method_name = 'frequency_em'
        else:
            # 时间域电磁法
            simulation = tdem.simulation.Simulation3DElectricField(
                survey=survey,
                mesh=mesh,
                sigmaMap=maps.IdentityMap(mesh)
            )
            method_name = 'time_em'
            
        self.simulations[method_name] = simulation
        self.current_simulation = simulation
        
        domain_type = "频率域" if frequency_domain else "时间域"
        print(f"{domain_type}电磁法正演仿真设置完成:")
        print(f"  网格单元数: {mesh.n_cells}")
        print(f"  观测数据数: {survey.nD}")
        print(f"  公式类型: {formulation}")
        
        # 如果提供了电导率模型，进行正演计算
        if conductivity_model is not None:
            predicted_data = self.run_forward_em(conductivity_model, frequency_domain)
            print(f"  正演数据范围: {np.min(np.abs(predicted_data)):.3e} ~ {np.max(np.abs(predicted_data)):.3e}")
            
        return simulation
        
    def run_forward_em(self, 
                      conductivity_model: np.ndarray, 
                      frequency_domain: bool = True) -> np.ndarray:
        """
        运行电磁法正演
        
        Parameters:
        -----------
        conductivity_model : array
            电导率模型
        frequency_domain : bool
            是否为频率域
            
        Returns:
        --------
        predicted_data : array
            预测的电磁数据
        """
        method_name = 'frequency_em' if frequency_domain else 'time_em'
        
        if method_name not in self.simulations:
            raise ValueError(f"{method_name} 仿真尚未设置")
            
        simulation = self.simulations[method_name]
        
        start_time = time.time()
        predicted_data = simulation.dpred(conductivity_model)
        compute_time = time.time() - start_time
        
        domain_type = "频率域" if frequency_domain else "时间域"
        print(f"{domain_type}电磁法正演计算完成，耗时: {compute_time:.2f} 秒")
        
        return predicted_data
        
    def create_starting_model(self, 
                             method: str,
                             model_type: str = 'homogeneous',
                             background_value: float = None,
                             bounds: Tuple[float, float] = None) -> np.ndarray:
        """
        创建初始模型
        
        Parameters:
        -----------
        method : str
            地球物理方法
        model_type : str
            模型类型 'homogeneous', 'random', 'layered'
        background_value : float, optional
            背景值
        bounds : tuple, optional
            模型参数范围 (min, max)
            
        Returns:
        --------
        starting_model : array
            初始模型
        """
        if self.mesh is None:
            raise ValueError("网格尚未设置")
            
        n_cells = self.mesh.n_cells
        
        # 设置默认背景值
        if background_value is None:
            if method == 'gravity':
                background_value = 0.0  # 密度对比
            elif method == 'magnetics':
                background_value = 0.001  # 磁化率
            elif method in ['dc_resistivity', 'frequency_em', 'time_em']:
                background_value = 0.01  # 电导率 S/m
            else:
                background_value = 1.0
                
        # 设置默认范围
        if bounds is None:
            if method == 'gravity':
                bounds = (-1000, 1000)  # kg/m³
            elif method == 'magnetics':
                bounds = (0, 0.1)  # SI单位
            elif method in ['dc_resistivity', 'frequency_em', 'time_em']:
                bounds = (1e-4, 1.0)  # S/m
            else:
                bounds = (0.1, 10.0)
                
        if model_type == 'homogeneous':
            starting_model = np.full(n_cells, background_value)
            
        elif model_type == 'random':
            # 在对数空间生成随机模型
            if method in ['dc_resistivity', 'frequency_em', 'time_em']:
                log_min, log_max = np.log10(bounds[0]), np.log10(bounds[1])
                log_model = np.random.uniform(log_min, log_max, n_cells)
                starting_model = 10 ** log_model
            else:
                starting_model = np.random.uniform(bounds[0], bounds[1], n_cells)
                
        elif model_type == 'layered':
            # 分层模型
            z_centers = self.mesh.cell_centers_z
            n_layers = 5
            layer_boundaries = np.linspace(z_centers.min(), z_centers.max(), n_layers + 1)
            
            starting_model = np.full(n_cells, background_value)
            for i in range(n_layers):
                layer_mask = (z_centers >= layer_boundaries[i]) & (z_centers < layer_boundaries[i + 1])
                if method in ['dc_resistivity', 'frequency_em', 'time_em']:
                    layer_value = background_value * (2 ** (i - n_layers // 2))
                else:
                    layer_value = background_value + (i - n_layers // 2) * background_value * 0.5
                starting_model[layer_mask] = layer_value
                
        else:
            raise ValueError(f"未知的模型类型: {model_type}")
            
        print(f"创建 {method} 初始模型:")
        print(f"  模型类型: {model_type}")
        print(f"  网格数量: {n_cells}")
        print(f"  参数范围: {np.min(starting_model):.3e} ~ {np.max(starting_model):.3e}")
        
        return starting_model
        
    def add_noise_to_data(self, 
                         data: np.ndarray,
                         noise_level: float = 0.05,
                         noise_floor: float = None) -> Tuple[np.ndarray, np.ndarray]:
        """
        向数据添加噪声
        
        Parameters:
        -----------
        data : array
            原始数据
        noise_level : float
            相对噪声水平 (百分比)
        noise_floor : float, optional
            噪声底限
            
        Returns:
        --------
        noisy_data : array
            含噪声数据
        uncertainties : array
            数据不确定性
        """
        # 计算相对噪声
        relative_noise = np.abs(data) * noise_level
        
        # 添加噪声底限
        if noise_floor is not None:
            relative_noise = np.maximum(relative_noise, noise_floor)
            
        # 生成随机噪声
        noise = np.random.normal(0, relative_noise)
        noisy_data = data + noise
        
        # 返回不确定性作为标准差
        uncertainties = relative_noise
        
        print(f"数据噪声添加:")
        print(f"  噪声水平: {noise_level * 100:.1f}%")
        if noise_floor:
            print(f"  噪声底限: {noise_floor:.3e}")
        print(f"  信噪比: {np.mean(np.abs(data)) / np.mean(uncertainties):.1f}")
        
        return noisy_data, uncertainties
        
    def plot_model_and_data(self, 
                           model: np.ndarray,
                           data: np.ndarray,
                           method: str,
                           show_mesh: bool = True):
        """
        绘制模型和数据
        
        Parameters:
        -----------
        model : array
            物性模型
        data : array
            观测数据
        method : str
            地球物理方法
        show_mesh : bool
            是否显示网格
        """
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        
        # 模型切片图
        if hasattr(self.mesh, 'plot_slice'):
            # XY 平面
            self.mesh.plot_slice(
                model, normal='Z', ind=0, ax=axes[0, 0],
                grid=show_mesh, pcolor_opts={'cmap': 'viridis'}
            )
            axes[0, 0].set_title(f'{method} 模型 - XY 切片')
            
            # XZ 平面
            y_ind = self.mesh.n_cells_y // 2 if hasattr(self.mesh, 'n_cells_y') else 0
            self.mesh.plot_slice(
                model, normal='Y', ind=y_ind, ax=axes[0, 1],
                grid=show_mesh, pcolor_opts={'cmap': 'viridis'}
            )
            axes[0, 1].set_title(f'{method} 模型 - XZ 切片')
            
        # 数据分布
        if self.survey is not None and hasattr(self.survey, 'receiver_locations'):
            locations = self.survey.receiver_locations
            if len(locations) == len(data):
                scatter = axes[1, 0].scatter(
                    locations[:, 0], locations[:, 1], c=data, 
                    cmap='RdBu_r', s=20
                )
                plt.colorbar(scatter, ax=axes[1, 0])
                axes[1, 0].set_title(f'{method} 观测数据分布')
                axes[1, 0].set_xlabel('X (m)')
                axes[1, 0].set_ylabel('Y (m)')
                
        # 数据直方图
        axes[1, 1].hist(data, bins=30, alpha=0.7, edgecolor='black')
        axes[1, 1].set_title(f'{method} 数据直方图')
        axes[1, 1].set_xlabel('数据值')
        axes[1, 1].set_ylabel('频数')
        axes[1, 1].grid(True, alpha=0.3)
        
        plt.tight_layout()
        plt.show()
        
        return fig
        
    def save_forward_results(self, 
                           file_path: str,
                           model: np.ndarray,
                           predicted_data: np.ndarray,
                           method: str):
        """
        保存正演结果
        
        Parameters:
        -----------
        file_path : str
            保存路径
        model : array
            物性模型
        predicted_data : array
            预测数据
        method : str
            地球物理方法
        """
        import h5py
        
        with h5py.File(file_path, 'w') as f:
            # 保存模型
            f.create_dataset('model', data=model)
            f.create_dataset('predicted_data', data=predicted_data)
            
            # 保存元信息
            f.attrs['method'] = method
            f.attrs['n_cells'] = len(model)
            f.attrs['n_data'] = len(predicted_data)
            f.attrs['timestamp'] = time.time()
            
            # 保存网格信息
            if self.mesh is not None:
                mesh_group = f.create_group('mesh')
                mesh_group.create_dataset('cell_centers', data=self.mesh.cell_centers)
                mesh_group.attrs['n_cells'] = self.mesh.n_cells
                
            # 保存观测系统信息
            if self.survey is not None and hasattr(self.survey, 'receiver_locations'):
                survey_group = f.create_group('survey')
                survey_group.create_dataset('receiver_locations', 
                                          data=self.survey.receiver_locations)
                
        print(f"正演结果已保存到: {file_path}")


# 示例使用
def create_forward_example():
    """创建正演示例"""
    from discretize import TensorMesh
    
    # 创建简单网格
    dx = np.ones(20) * 50
    dy = np.ones(15) * 50
    dz = np.ones(10) * 25
    mesh = TensorMesh([dx, dy, dz], origin=[0, 0, 0])
    
    # 创建正演求解器
    solver = ForwardSolver()
    
    print("=== 正演求解器示例 ===")
    print(f"网格信息: {mesh.n_cells} 个网格单元")
    
    # 创建初始模型
    gravity_model = solver.create_starting_model('gravity', 'layered', 0.0)
    magnetic_model = solver.create_starting_model('magnetics', 'random', 0.001)
    
    return solver


if __name__ == "__main__":
    # 运行示例
    forward_solver = create_forward_example()
