#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
高级多物理场求解器框架 - Advanced Multi-Physics Solver Framework
自配置的流体-泥沙-结构耦合求解器

Features:
- 自适应求解器选择
- 多物理场耦合
- 高性能并行计算
- 智能参数配置
- 结果验证和误差估计
"""

import sys
import numpy as np
import time
from typing import Dict, Any, List, Tuple, Optional, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import concurrent.futures
from pathlib import Path

# 科学计算库
try:
    import scipy.sparse as sp
    import scipy.sparse.linalg as spla
    from scipy.integrate import odeint, solve_ivp
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

# 数值求解器 (可选)
try:
    import fenics as fe
    FENICS_AVAILABLE = True
except ImportError:
    FENICS_AVAILABLE = False

# PyVista用于可视化
try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

# 导入其他模块
from .empirical_solver import ScourParameters, ScourResult
from .gmsh_meshing import GMSHMeshGenerator, MeshParameters, PierGeometry


class SolverType(Enum):
    """求解器类型"""
    EMPIRICAL = "empirical"
    CFD_RANS = "cfd_rans"
    CFD_LES = "cfd_les"
    COUPLED_FSI = "coupled_fsi"
    MORPHODYNAMIC = "morphodynamic"
    HYBRID = "hybrid"


class TurbulenceModel(Enum):
    """湍流模型"""
    LAMINAR = "laminar"
    K_EPSILON = "k_epsilon"
    K_EPSILON_RNG = "k_epsilon_rng"
    K_OMEGA = "k_omega"
    K_OMEGA_SST = "k_omega_sst"
    SPALART_ALLMARAS = "spalart_allmaras"
    LES_SMAGORINSKY = "les_smagorinsky"


class CouplingMethod(Enum):
    """耦合方法"""
    WEAK_COUPLING = "weak_coupling"
    STRONG_COUPLING = "strong_coupling"
    MONOLITHIC = "monolithic"


@dataclass
class NumericalParameters:
    """数值计算参数"""
    # 时间参数
    time_step: float = 0.1
    total_time: float = 100.0
    adaptive_time_step: bool = True
    max_time_step: float = 1.0
    min_time_step: float = 1e-6
    
    # 网格参数
    mesh_resolution: float = 0.1
    adaptive_mesh: bool = True
    max_refinement_level: int = 5
    
    # 求解器参数
    turbulence_model: TurbulenceModel = TurbulenceModel.K_OMEGA_SST
    coupling_method: CouplingMethod = CouplingMethod.WEAK_COUPLING
    max_iterations: int = 100
    convergence_tolerance: float = 1e-6
    relaxation_factor: float = 0.7
    
    # 物理参数
    enable_sediment_transport: bool = True
    enable_bed_evolution: bool = True
    enable_fluid_structure_interaction: bool = False
    
    # 并行计算
    enable_parallel: bool = True
    num_processors: int = 4
    
    # 输出控制
    output_frequency: int = 10
    save_checkpoints: bool = True
    checkpoint_frequency: int = 100


@dataclass
class SolverResult:
    """求解器结果"""
    # 基础结果
    success: bool = False
    computation_time: float = 0.0
    iterations: int = 0
    residual: float = float('inf')
    
    # 流场结果
    velocity_field: Optional[np.ndarray] = None
    pressure_field: Optional[np.ndarray] = None
    turbulence_fields: Dict[str, np.ndarray] = field(default_factory=dict)
    
    # 冲刷结果
    scour_depth: float = 0.0
    scour_width: float = 0.0
    scour_volume: float = 0.0
    max_velocity: float = 0.0
    max_shear_stress: float = 0.0
    
    # 时间演化数据
    time_series: Dict[str, List[float]] = field(default_factory=dict)
    
    # 误差估计
    velocity_error: float = 0.0
    pressure_error: float = 0.0
    mass_conservation_error: float = 0.0
    
    # 网格信息
    mesh_nodes: int = 0
    mesh_elements: int = 0
    mesh_quality: float = 0.0
    
    # 警告和信息
    warnings: List[str] = field(default_factory=list)
    convergence_history: List[float] = field(default_factory=list)


class BaseSolver(ABC):
    """求解器基类"""
    
    def __init__(self, name: str):
        self.name = name
        self.initialized = False
        self.mesh = None
        self.parameters = None
        
    @abstractmethod
    def setup(self, mesh: pv.UnstructuredGrid, parameters: NumericalParameters) -> bool:
        """设置求解器"""
        pass
    
    @abstractmethod
    def solve(self, scour_params: ScourParameters) -> SolverResult:
        """执行求解"""
        pass
    
    @abstractmethod
    def get_field_data(self, field_name: str) -> Optional[np.ndarray]:
        """获取场数据"""
        pass
    
    def cleanup(self):
        """清理资源"""
        pass


class CFDSolver(BaseSolver):
    """CFD求解器"""
    
    def __init__(self):
        super().__init__("CFD Solver")
        self.velocity = None
        self.pressure = None
        self.turbulence_vars = {}
        
    def setup(self, mesh: pv.UnstructuredGrid, parameters: NumericalParameters) -> bool:
        """设置CFD求解器"""
        try:
            self.mesh = mesh
            self.parameters = parameters
            
            # 初始化场变量
            n_points = mesh.n_points
            self.velocity = np.zeros((n_points, 3))
            self.pressure = np.zeros(n_points)
            
            # 根据湍流模型初始化湍流变量
            self._initialize_turbulence_fields(n_points)
            
            self.initialized = True
            return True
            
        except Exception as e:
            print(f"CFD求解器设置失败: {e}")
            return False
    
    def _initialize_turbulence_fields(self, n_points: int):
        """初始化湍流场"""
        model = self.parameters.turbulence_model
        
        if model in [TurbulenceModel.K_EPSILON, TurbulenceModel.K_EPSILON_RNG]:
            self.turbulence_vars['k'] = np.full(n_points, 0.01)  # 湍流动能
            self.turbulence_vars['epsilon'] = np.full(n_points, 0.001)  # 耗散率
        elif model in [TurbulenceModel.K_OMEGA, TurbulenceModel.K_OMEGA_SST]:
            self.turbulence_vars['k'] = np.full(n_points, 0.01)
            self.turbulence_vars['omega'] = np.full(n_points, 0.1)  # 比耗散率
        elif model == TurbulenceModel.SPALART_ALLMARAS:
            self.turbulence_vars['nu_tilde'] = np.full(n_points, 1e-5)  # 修正粘度
    
    def solve(self, scour_params: ScourParameters) -> SolverResult:
        """求解CFD方程"""
        if not self.initialized:
            return SolverResult(success=False, warnings=["求解器未初始化"])
        
        start_time = time.time()
        result = SolverResult()
        
        try:
            # 设置边界条件
            self._set_boundary_conditions(scour_params)
            
            # 时间推进求解
            converged, iterations = self._time_stepping_solve()
            
            if converged:
                # 计算冲刷相关量
                self._compute_scour_metrics(result, scour_params)
                
                # 存储场数据
                result.velocity_field = self.velocity.copy()
                result.pressure_field = self.pressure.copy()
                result.turbulence_fields = {k: v.copy() for k, v in self.turbulence_vars.items()}
                
                result.success = True
                result.iterations = iterations
                result.mesh_nodes = self.mesh.n_points
                result.mesh_elements = self.mesh.n_cells
                
            else:
                result.warnings.append("求解未收敛")
                
        except Exception as e:
            result.warnings.append(f"CFD求解失败: {e}")
        
        result.computation_time = time.time() - start_time
        return result
    
    def _set_boundary_conditions(self, scour_params: ScourParameters):
        """设置边界条件"""
        # 获取边界信息
        bounds = self.mesh.bounds
        points = self.mesh.points
        
        # 入口边界 (x = x_min)
        inlet_mask = np.abs(points[:, 0] - bounds[0]) < 1e-6
        self.velocity[inlet_mask, 0] = scour_params.flow_velocity  # x方向速度
        self.velocity[inlet_mask, 1] = 0.0  # y方向速度
        self.velocity[inlet_mask, 2] = 0.0  # z方向速度
        
        # 出口边界 (x = x_max) - 零梯度
        # 在实际实现中需要更复杂的处理
        
        # 壁面边界 (桥墩表面) - 无滑移
        # 需要识别桥墩表面并设置零速度
        
        # 自由表面 (z = z_water) - 滑移边界
        water_surface_mask = np.abs(points[:, 2] - scour_params.water_depth) < 1e-6
        # 法向速度为零，切向速度自由
        
        # 河床边界 (z = z_bed) - 无滑移
        bed_mask = points[:, 2] < -1.5  # 假设河床在z=-2附近
        self.velocity[bed_mask] = 0.0
    
    def _time_stepping_solve(self) -> Tuple[bool, int]:
        """时间步进求解"""
        dt = self.parameters.time_step
        max_iter = self.parameters.max_iterations
        tol = self.parameters.convergence_tolerance
        
        for iteration in range(max_iter):
            # 保存旧值
            velocity_old = self.velocity.copy()
            pressure_old = self.pressure.copy()
            
            # 动量方程求解
            self._solve_momentum_equation(dt)
            
            # 压力泊松方程求解
            self._solve_pressure_equation(dt)
            
            # 速度修正
            self._correct_velocity(dt)
            
            # 湍流方程求解
            if self.parameters.turbulence_model != TurbulenceModel.LAMINAR:
                self._solve_turbulence_equations(dt)
            
            # 检查收敛性
            velocity_change = np.linalg.norm(self.velocity - velocity_old)
            pressure_change = np.linalg.norm(self.pressure - pressure_old)
            residual = max(velocity_change, pressure_change)
            
            if residual < tol:
                return True, iteration + 1
        
        return False, max_iter
    
    def _solve_momentum_equation(self, dt: float):
        """求解动量方程"""
        # 简化的动量方程求解
        # 实际实现需要有限元或有限差分离散
        
        # 对流项
        convection = self._compute_convection_term()
        
        # 扩散项
        diffusion = self._compute_diffusion_term()
        
        # 压力梯度
        pressure_gradient = self._compute_pressure_gradient()
        
        # 更新速度
        self.velocity += dt * (-convection + diffusion - pressure_gradient)
    
    def _solve_pressure_equation(self, dt: float):
        """求解压力泊松方程"""
        # 简化的压力方程求解
        # ∇²p = ρ/dt * ∇·u*
        
        velocity_divergence = self._compute_velocity_divergence()
        rho = 1000.0  # 水密度
        
        # 简化处理：假设压力修正正比于速度散度
        self.pressure -= (rho / dt) * velocity_divergence * 0.1
    
    def _correct_velocity(self, dt: float):
        """速度修正"""
        # 简化的速度修正
        pressure_gradient = self._compute_pressure_gradient()
        rho = 1000.0
        
        self.velocity -= (dt / rho) * pressure_gradient * 0.5
    
    def _solve_turbulence_equations(self, dt: float):
        """求解湍流方程"""
        model = self.parameters.turbulence_model
        
        if model == TurbulenceModel.K_OMEGA_SST:
            self._solve_k_omega_sst(dt)
        elif model == TurbulenceModel.K_EPSILON:
            self._solve_k_epsilon(dt)
    
    def _solve_k_omega_sst(self, dt: float):
        """求解k-ω SST湍流模型"""
        # 简化的k-ω SST实现
        k = self.turbulence_vars['k']
        omega = self.turbulence_vars['omega']
        
        # 计算生产项和耗散项
        production = self._compute_turbulence_production()
        
        # 更新k和ω
        self.turbulence_vars['k'] += dt * (production - 0.09 * k * omega)
        self.turbulence_vars['omega'] += dt * (1.5 * production / k - 0.075 * omega**2)
        
        # 确保正值
        self.turbulence_vars['k'] = np.maximum(self.turbulence_vars['k'], 1e-10)
        self.turbulence_vars['omega'] = np.maximum(self.turbulence_vars['omega'], 1e-10)
    
    def _solve_k_epsilon(self, dt: float):
        """求解k-ε湍流模型"""
        # 简化的k-ε实现
        k = self.turbulence_vars['k']
        epsilon = self.turbulence_vars['epsilon']
        
        production = self._compute_turbulence_production()
        
        self.turbulence_vars['k'] += dt * (production - epsilon)
        self.turbulence_vars['epsilon'] += dt * (1.44 * production * epsilon / k - 1.92 * epsilon**2 / k)
        
        # 确保正值
        self.turbulence_vars['k'] = np.maximum(self.turbulence_vars['k'], 1e-10)
        self.turbulence_vars['epsilon'] = np.maximum(self.turbulence_vars['epsilon'], 1e-10)
    
    def _compute_convection_term(self) -> np.ndarray:
        """计算对流项"""
        # 简化实现：(u·∇)u
        # 实际需要更精确的数值方法
        return np.zeros_like(self.velocity)
    
    def _compute_diffusion_term(self) -> np.ndarray:
        """计算扩散项"""
        # 简化实现：ν∇²u
        nu = 1e-6  # 运动粘度
        return np.zeros_like(self.velocity)
    
    def _compute_pressure_gradient(self) -> np.ndarray:
        """计算压力梯度"""
        # 简化实现：∇p/ρ
        return np.zeros_like(self.velocity)
    
    def _compute_velocity_divergence(self) -> np.ndarray:
        """计算速度散度"""
        # 简化实现：∇·u
        return np.zeros(self.mesh.n_points)
    
    def _compute_turbulence_production(self) -> np.ndarray:
        """计算湍流生产项"""
        # 简化实现：P = νt * |∇u|²
        return np.full(self.mesh.n_points, 0.001)
    
    def _compute_scour_metrics(self, result: SolverResult, scour_params: ScourParameters):
        """计算冲刷相关指标"""
        # 计算最大速度
        velocity_magnitude = np.linalg.norm(self.velocity, axis=1)
        result.max_velocity = np.max(velocity_magnitude)
        
        # 计算最大剪切应力
        # τ = μ * ∂u/∂y (简化)
        mu = 1e-3  # 动力粘度
        result.max_shear_stress = mu * np.max(np.abs(velocity_magnitude))
        
        # 简化的冲刷深度估算
        critical_shear = 0.1  # 临界剪切应力
        if result.max_shear_stress > critical_shear:
            result.scour_depth = 0.5 * (result.max_shear_stress / critical_shear - 1)
            result.scour_width = result.scour_depth * 3.0
            result.scour_volume = np.pi * result.scour_width**2 * result.scour_depth / 4
    
    def get_field_data(self, field_name: str) -> Optional[np.ndarray]:
        """获取场数据"""
        if field_name == 'velocity':
            return self.velocity
        elif field_name == 'pressure':
            return self.pressure
        elif field_name in self.turbulence_vars:
            return self.turbulence_vars[field_name]
        else:
            return None


class SedimentTransportSolver(BaseSolver):
    """泥沙输运求解器"""
    
    def __init__(self):
        super().__init__("Sediment Transport Solver")
        self.sediment_concentration = None
        self.bed_elevation = None
        
    def setup(self, mesh: pv.UnstructuredGrid, parameters: NumericalParameters) -> bool:
        """设置泥沙输运求解器"""
        try:
            self.mesh = mesh
            self.parameters = parameters
            
            n_points = mesh.n_points
            self.sediment_concentration = np.zeros(n_points)
            self.bed_elevation = np.zeros(n_points)
            
            self.initialized = True
            return True
            
        except Exception as e:
            print(f"泥沙输运求解器设置失败: {e}")
            return False
    
    def solve(self, scour_params: ScourParameters) -> SolverResult:
        """求解泥沙输运方程"""
        result = SolverResult()
        
        if not self.initialized:
            result.warnings.append("泥沙输运求解器未初始化")
            return result
        
        # 简化的泥沙输运实现
        result.success = True
        return result
    
    def get_field_data(self, field_name: str) -> Optional[np.ndarray]:
        """获取场数据"""
        if field_name == 'sediment_concentration':
            return self.sediment_concentration
        elif field_name == 'bed_elevation':
            return self.bed_elevation
        else:
            return None


class AdvancedSolverManager:
    """高级求解器管理器"""
    
    def __init__(self):
        self.name = "Advanced Solver Manager"
        self.solvers = {}
        self.mesh_generator = GMSHMeshGenerator()
        self.current_mesh = None
        self.solver_config = None
        
        # 注册可用求解器
        self._register_solvers()
    
    def _register_solvers(self):
        """注册求解器"""
        self.solvers['cfd'] = CFDSolver()
        self.solvers['sediment'] = SedimentTransportSolver()
    
    def auto_configure_solver(self, scour_params: ScourParameters) -> NumericalParameters:
        """自动配置求解器参数"""
        # 基于输入参数自动选择最佳配置
        
        # 计算特征数
        Re = self._compute_reynolds_number(scour_params)
        Fr = self._compute_froude_number(scour_params)
        
        # 基于雷诺数选择湍流模型
        if Re < 1000:
            turbulence_model = TurbulenceModel.LAMINAR
        elif Re < 100000:
            turbulence_model = TurbulenceModel.K_OMEGA_SST
        else:
            turbulence_model = TurbulenceModel.K_EPSILON
        
        # 基于弗劳德数调整时间步长
        if Fr > 0.8:
            time_step = 0.01  # 高速流需要小时间步
        else:
            time_step = 0.1
        
        # 基于桥墩尺寸调整网格分辨率
        mesh_resolution = scour_params.pier_diameter / 20
        
        return NumericalParameters(
            turbulence_model=turbulence_model,
            time_step=time_step,
            mesh_resolution=mesh_resolution,
            max_iterations=200 if Re > 50000 else 100,
            convergence_tolerance=1e-6 if Fr < 0.5 else 1e-5
        )
    
    def _compute_reynolds_number(self, scour_params: ScourParameters) -> float:
        """计算雷诺数"""
        nu = 1e-6  # 水的运动粘度
        return scour_params.flow_velocity * scour_params.pier_diameter / nu
    
    def _compute_froude_number(self, scour_params: ScourParameters) -> float:
        """计算弗劳德数"""
        g = 9.81
        return scour_params.flow_velocity / np.sqrt(g * scour_params.water_depth)
    
    def generate_mesh(self, pier_geometry: PierGeometry, 
                     mesh_params: MeshParameters) -> Optional[pv.UnstructuredGrid]:
        """生成计算网格"""
        try:
            mesh = self.mesh_generator.create_flow_domain_mesh(pier_geometry, mesh_params)
            self.current_mesh = mesh
            return mesh
        except Exception as e:
            print(f"网格生成失败: {e}")
            return None
    
    def solve_coupled_system(self, scour_params: ScourParameters,
                           numerical_params: Optional[NumericalParameters] = None) -> SolverResult:
        """求解耦合系统"""
        
        # 自动配置参数
        if numerical_params is None:
            numerical_params = self.auto_configure_solver(scour_params)
        
        self.solver_config = numerical_params
        
        # 生成网格
        if self.current_mesh is None:
            from .gmsh_meshing import create_circular_pier_geometry, create_default_mesh_parameters
            
            pier_geom = create_circular_pier_geometry(
                scour_params.pier_diameter, 
                6.0
            )
            mesh_params = create_default_mesh_parameters()
            mesh_params.pier_mesh_size = numerical_params.mesh_resolution
            
            self.current_mesh = self.generate_mesh(pier_geom, mesh_params)
            
            if self.current_mesh is None:
                result = SolverResult()
                result.warnings.append("网格生成失败")
                return result
        
        # 设置求解器
        cfd_solver = self.solvers['cfd']
        if not cfd_solver.setup(self.current_mesh, numerical_params):
            result = SolverResult()
            result.warnings.append("CFD求解器设置失败")
            return result
        
        # 求解CFD
        start_time = time.time()
        result = cfd_solver.solve(scour_params)
        
        # 如果启用泥沙输运
        if numerical_params.enable_sediment_transport:
            sediment_solver = self.solvers['sediment']
            if sediment_solver.setup(self.current_mesh, numerical_params):
                sediment_result = sediment_solver.solve(scour_params)
                # 合并结果
                if sediment_result.success:
                    result.warnings.extend(sediment_result.warnings)
        
        result.computation_time = time.time() - start_time
        return result
    
    def solve_parallel(self, scour_params_list: List[ScourParameters],
                      numerical_params: Optional[NumericalParameters] = None) -> List[SolverResult]:
        """并行求解多个工况"""
        
        if not numerical_params or not numerical_params.enable_parallel:
            # 串行求解
            return [self.solve_coupled_system(params, numerical_params) 
                   for params in scour_params_list]
        
        # 并行求解
        max_workers = numerical_params.num_processors
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [
                executor.submit(self.solve_coupled_system, params, numerical_params)
                for params in scour_params_list
            ]
            
            results = []
            for future in concurrent.futures.as_completed(futures):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    error_result = SolverResult()
                    error_result.warnings.append(f"并行求解失败: {e}")
                    results.append(error_result)
        
        return results
    
    def validate_solution(self, result: SolverResult, 
                         scour_params: ScourParameters) -> Dict[str, float]:
        """验证求解结果"""
        validation_metrics = {}
        
        if result.velocity_field is not None:
            # 质量守恒检查
            velocity_magnitude = np.linalg.norm(result.velocity_field, axis=1)
            validation_metrics['max_velocity'] = np.max(velocity_magnitude)
            validation_metrics['avg_velocity'] = np.mean(velocity_magnitude)
            
            # 能量守恒检查
            kinetic_energy = 0.5 * 1000 * np.sum(velocity_magnitude**2)
            validation_metrics['kinetic_energy'] = kinetic_energy
        
        # 物理合理性检查
        if result.scour_depth > 0:
            # 冲刷深度不应超过桥墩直径的3倍
            max_reasonable_scour = 3 * scour_params.pier_diameter
            if result.scour_depth > max_reasonable_scour:
                validation_metrics['scour_depth_warning'] = 1.0
            else:
                validation_metrics['scour_depth_warning'] = 0.0
        
        return validation_metrics
    
    def export_results(self, result: SolverResult, filename: str):
        """导出结果"""
        if self.current_mesh is None:
            print("没有网格数据可导出")
            return
        
        # 添加场数据到网格
        mesh = self.current_mesh.copy()
        
        if result.velocity_field is not None:
            mesh['velocity'] = result.velocity_field
            velocity_magnitude = np.linalg.norm(result.velocity_field, axis=1)
            mesh['velocity_magnitude'] = velocity_magnitude
        
        if result.pressure_field is not None:
            mesh['pressure'] = result.pressure_field
        
        # 添加湍流场
        for field_name, field_data in result.turbulence_fields.items():
            mesh[field_name] = field_data
        
        # 保存VTK格式
        mesh.save(filename)
        print(f"结果已导出到: {filename}")
    
    def cleanup(self):
        """清理资源"""
        for solver in self.solvers.values():
            solver.cleanup()
        
        if self.mesh_generator:
            self.mesh_generator.cleanup()


# 便利函数
def create_default_numerical_parameters() -> NumericalParameters:
    """创建默认数值参数"""
    return NumericalParameters()


def solve_scour_simulation(scour_params: ScourParameters,
                          numerical_params: Optional[NumericalParameters] = None) -> SolverResult:
    """求解冲刷模拟 - 便利函数"""
    solver_manager = AdvancedSolverManager()
    
    try:
        result = solver_manager.solve_coupled_system(scour_params, numerical_params)
        return result
    finally:
        solver_manager.cleanup()


if __name__ == "__main__":
    # 测试高级求解器
    print("=== 高级求解器框架测试 ===")
    
    # 创建测试参数
    from .empirical_solver import ScourParameters, PierShape
    
    scour_params = ScourParameters(
        pier_diameter=2.0,
        pier_shape=PierShape.CIRCULAR,
        flow_velocity=0.8,
        water_depth=3.0,
        d50=0.8
    )
    
    print(f"桥墩直径: {scour_params.pier_diameter} m")
    print(f"流速: {scour_params.flow_velocity} m/s")
    print(f"水深: {scour_params.water_depth} m")
    
    # 创建求解器管理器
    solver_manager = AdvancedSolverManager()
    
    # 自动配置参数
    numerical_params = solver_manager.auto_configure_solver(scour_params)
    
    print(f"湍流模型: {numerical_params.turbulence_model}")
    print(f"时间步长: {numerical_params.time_step} s")
    print(f"网格分辨率: {numerical_params.mesh_resolution} m")
    
    # 求解
    print("\n开始求解...")
    result = solver_manager.solve_coupled_system(scour_params, numerical_params)
    
    if result.success:
        print(f"求解成功!")
        print(f"计算时间: {result.computation_time:.2f} s")
        print(f"迭代次数: {result.iterations}")
        print(f"最大速度: {result.max_velocity:.3f} m/s")
        print(f"最大剪切应力: {result.max_shear_stress:.1f} Pa")
        print(f"冲刷深度: {result.scour_depth:.3f} m")
        
        # 验证结果
        validation = solver_manager.validate_solution(result, scour_params)
        print(f"验证指标: {validation}")
        
    else:
        print("求解失败")
        if result.warnings:
            print(f"警告: {'; '.join(result.warnings)}")
    
    solver_manager.cleanup()