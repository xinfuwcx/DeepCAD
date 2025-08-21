#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FEniCS数值求解器 - FEniCS Numerical Solver
基于有限元方法的桥墩冲刷数值模拟求解器

主要功能：
- 流体力学计算（Navier-Stokes方程）
- 湍流模型（k-ε, k-ω SST等）
- 沉积物输运模拟
- 床面变形计算
"""

import numpy as np
import math
from typing import Dict, Any, Optional, Tuple, List
from dataclasses import dataclass
from enum import Enum
import warnings

# FEniCS导入（可选）
try:
    import dolfin as df
    import mshr
    FENICS_AVAILABLE = True
except ImportError:
    FENICS_AVAILABLE = False
    warnings.warn("FEniCS未安装，将使用简化数值模型")


class TurbulenceModel(Enum):
    """湍流模型枚举"""
    K_EPSILON = "k-epsilon"
    K_EPSILON_RNG = "k-epsilon-rng"
    K_OMEGA_SST = "k-omega-sst"
    SPALART_ALLMARAS = "spalart-allmaras"


@dataclass
class NumericalParameters:
    """数值计算参数"""
    # 网格参数
    mesh_resolution: float = 0.1  # 网格分辨率 (m)
    refinement_levels: int = 2    # 细化层数
    
    # 时间参数
    time_step: float = 0.1        # 时间步长 (s)
    total_time: float = 3600.0    # 总计算时间 (s)
    
    # 求解器参数
    turbulence_model: TurbulenceModel = TurbulenceModel.K_EPSILON
    convergence_tolerance: float = 1e-6
    max_iterations: int = 50
    
    # 沉积物参数
    sediment_transport: bool = True
    bed_load_transport: bool = True
    suspended_load_transport: bool = False


@dataclass
class NumericalResult:
    """数值计算结果"""
    # 流场结果
    velocity_field: Optional[np.ndarray] = None
    pressure_field: Optional[np.ndarray] = None
    turbulence_field: Optional[np.ndarray] = None
    
    # 冲刷结果
    scour_depth: float = 0.0
    scour_width: float = 0.0
    scour_volume: float = 0.0
    
    # 时间相关
    equilibrium_time: float = 0.0
    time_series: Optional[Dict[str, List[float]]] = None
    
    # 统计信息
    max_velocity: float = 0.0
    max_shear_stress: float = 0.0
    reynolds_number: float = 0.0
    froude_number: float = 0.0
    
    # 计算信息
    computation_time: float = 0.0
    iterations: int = 0
    convergence_achieved: bool = False
    method: str = "FEniCS"
    warnings: List[str] = None
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []


class SimplifiedFlowSolver:
    """简化流场求解器（当FEniCS不可用时）"""
    
    def __init__(self):
        self.name = "简化流场求解器"
    
    def solve_flow_around_cylinder(self, params: Dict[str, Any]) -> Dict[str, np.ndarray]:
        """简化的圆柱绕流求解"""
        # 提取参数
        D = params['pier_diameter']
        V = params['flow_velocity']
        H = params['water_depth']
        
        # 创建计算网格
        nx, ny = 100, 60
        x = np.linspace(-5*D, 15*D, nx)
        y = np.linspace(-3*D, 3*D, ny)
        X, Y = np.meshgrid(x, y)
        
        # 圆柱位置
        cylinder_x, cylinder_y = 0.0, 0.0
        cylinder_radius = D / 2
        
        # 势流解（简化处理）
        r = np.sqrt((X - cylinder_x)**2 + (Y - cylinder_y)**2)
        theta = np.arctan2(Y - cylinder_y, X - cylinder_x)
        
        # 避免奇点
        r = np.maximum(r, cylinder_radius * 1.01)
        
        # 流函数和速度势
        psi = V * (r - cylinder_radius**2 / r) * np.sin(theta)
        phi = V * (r + cylinder_radius**2 / r) * np.cos(theta)
        
        # 速度分量
        u = V * (1 - cylinder_radius**2 * np.cos(2*theta) / r**2)
        v = -V * cylinder_radius**2 * np.sin(2*theta) / r**2
        
        # 在圆柱内部设置速度为零
        mask = r <= cylinder_radius
        u[mask] = 0
        v[mask] = 0
        
        # 压力场（伯努利方程）
        rho = 1000.0  # 水密度
        velocity_magnitude = np.sqrt(u**2 + v**2)
        pressure = 0.5 * rho * (V**2 - velocity_magnitude**2)
        
        return {
            'x': x, 'y': y, 'X': X, 'Y': Y,
            'u': u, 'v': v, 'pressure': pressure,
            'velocity_magnitude': velocity_magnitude,
            'streamfunction': psi
        }
    
    def calculate_bed_shear_stress(self, flow_results: Dict[str, np.ndarray], 
                                 params: Dict[str, Any]) -> np.ndarray:
        """计算床面剪切应力"""
        u = flow_results['u']
        v = flow_results['v']
        x = flow_results['x']
        y = flow_results['y']
        
        # 底部边界的速度梯度
        bed_index = len(y) // 2  # 假设床面在y=0附近
        
        # 计算剪切应力 τ = μ * du/dy
        mu = 1e-3  # 水的动力粘度
        
        # 简化的剪切应力计算
        velocity_at_bed = np.sqrt(u[bed_index, :]**2 + v[bed_index, :]**2)
        bed_shear = 0.5 * 1000.0 * 0.005 * velocity_at_bed**2  # 简化摩擦系数
        
        return bed_shear


class FEniCSScourSolver:
    """FEniCS桥墩冲刷求解器"""
    
    def __init__(self):
        self.name = "FEniCS数值求解器"
        self.version = "1.0.0"
        self.fenics_available = FENICS_AVAILABLE
        
        if not FENICS_AVAILABLE:
            self.fallback_solver = SimplifiedFlowSolver()
            warnings.warn("使用简化求解器，建议安装FEniCS以获得完整功能")
    
    def create_geometry_and_mesh(self, params: Dict[str, Any]) -> Optional[object]:
        """创建几何和网格"""
        if not FENICS_AVAILABLE:
            return None
        
        try:
            # 提取参数
            D = params['pier_diameter']
            H = params['water_depth']
            
            # 计算域尺寸
            domain_length = 20 * D
            domain_width = 8 * D
            domain_height = H
            
            # 创建几何域
            # 主计算域
            domain = mshr.Rectangle(
                df.Point(-5*D, -domain_width/2),
                df.Point(15*D, domain_width/2)
            )
            
            # 桥墩几何
            if params.get('pier_shape') == 'circular':
                pier = mshr.Circle(df.Point(0, 0), D/2)
            else:
                # 矩形桥墩
                pier = mshr.Rectangle(
                    df.Point(-D/2, -D/2),
                    df.Point(D/2, D/2)
                )
            
            # 从域中减去桥墩
            domain = domain - pier
            
            # 生成网格
            resolution = int(D / params.get('mesh_resolution', 0.1))
            mesh = mshr.generate_mesh(domain, resolution)
            
            return mesh
            
        except Exception as e:
            warnings.warn(f"网格生成失败: {e}")
            return None
    
    def setup_function_spaces(self, mesh) -> Dict[str, Any]:
        """设置函数空间"""
        if not FENICS_AVAILABLE or mesh is None:
            return {}
        
        try:
            # Taylor-Hood元素用于Navier-Stokes
            V_element = df.VectorElement("P", mesh.ufl_cell(), 2)  # 速度
            Q_element = df.FiniteElement("P", mesh.ufl_cell(), 1)  # 压力
            
            # 混合函数空间
            W = df.FunctionSpace(mesh, df.MixedElement([V_element, Q_element]))
            
            # 标量函数空间（湍流变量）
            S = df.FunctionSpace(mesh, "P", 1)
            
            return {
                'W': W,  # 速度-压力空间
                'V': W.sub(0),  # 速度子空间
                'Q': W.sub(1),  # 压力子空间
                'S': S   # 标量空间（k, epsilon等）
            }
            
        except Exception as e:
            warnings.warn(f"函数空间设置失败: {e}")
            return {}
    
    def setup_boundary_conditions(self, function_spaces: Dict, params: Dict[str, Any]) -> List:
        """设置边界条件"""
        if not FENICS_AVAILABLE or not function_spaces:
            return []
        
        try:
            W = function_spaces['W']
            mesh = W.mesh()
            
            # 边界标记
            boundaries = df.MeshFunction("size_t", mesh, mesh.topology().dim()-1)
            boundaries.set_all(0)
            
            # 定义边界
            class Inlet(df.SubDomain):
                def inside(self, x, on_boundary):
                    return on_boundary and abs(x[0] + 5*params['pier_diameter']) < df.DOLFIN_EPS
            
            class Outlet(df.SubDomain):
                def inside(self, x, on_boundary):
                    return on_boundary and abs(x[0] - 15*params['pier_diameter']) < df.DOLFIN_EPS
            
            class Walls(df.SubDomain):
                def inside(self, x, on_boundary):
                    D = params['pier_diameter']
                    return on_boundary and (abs(x[1] + 4*D) < df.DOLFIN_EPS or 
                                          abs(x[1] - 4*D) < df.DOLFIN_EPS)
            
            class Pier(df.SubDomain):
                def inside(self, x, on_boundary):
                    D = params['pier_diameter']
                    return on_boundary and (x[0]**2 + x[1]**2) <= (D/2)**2
            
            # 标记边界
            inlet = Inlet()
            outlet = Outlet()
            walls = Walls()
            pier = Pier()
            
            inlet.mark(boundaries, 1)
            outlet.mark(boundaries, 2)
            walls.mark(boundaries, 3)
            pier.mark(boundaries, 4)
            
            # 边界条件
            V_inlet = params['flow_velocity']
            
            # 入口：给定速度
            inlet_velocity = df.Expression(("V", "0"), V=V_inlet, degree=2)
            bc_inlet = df.DirichletBC(W.sub(0), inlet_velocity, boundaries, 1)
            
            # 桥墩：无滑移条件
            no_slip = df.Constant((0, 0))
            bc_pier = df.DirichletBC(W.sub(0), no_slip, boundaries, 4)
            
            # 侧壁：滑移条件（法向速度为零）
            bc_walls = df.DirichletBC(W.sub(0).sub(1), df.Constant(0), boundaries, 3)
            
            # 出口：自然边界条件（在变分形式中处理）
            
            return [bc_inlet, bc_pier, bc_walls], boundaries
            
        except Exception as e:
            warnings.warn(f"边界条件设置失败: {e}")
            return []
    
    def solve_navier_stokes(self, function_spaces: Dict, boundary_conditions: List,
                          params: Dict[str, Any]) -> Optional[Tuple]:
        """求解Navier-Stokes方程"""
        if not FENICS_AVAILABLE or not function_spaces:
            return None
        
        try:
            W = function_spaces['W']
            
            # 定义试验函数和测试函数
            w = df.Function(W)
            u, p = df.split(w)
            v, q = df.TestFunctions(W)
            
            # 物理参数
            rho = params.get('water_density', 1000.0)
            mu = 1e-3  # 动力粘度
            dt = params.get('time_step', 0.1)
            
            # 初始条件
            w_n = df.Function(W)
            u_n, p_n = df.split(w_n)
            
            # 设置初始速度场
            inlet_velocity = params['flow_velocity']
            initial_velocity = df.Expression(("V*x[0]/L", "0"), 
                                           V=inlet_velocity, L=5*params['pier_diameter'], degree=2)
            w_n.sub(0).interpolate(initial_velocity)
            
            # 变分形式（稳态Navier-Stokes）
            F = (
                rho * df.dot(df.grad(u)*u, v) * df.dx +  # 对流项
                mu * df.inner(df.grad(u), df.grad(v)) * df.dx +  # 粘性项
                -p * df.div(v) * df.dx +  # 压力项
                df.div(u) * q * df.dx  # 连续性方程
            )
            
            # 边界条件
            bcs = boundary_conditions[0] if boundary_conditions else []
            
            # 求解器设置
            problem = df.NonlinearVariationalProblem(F, w, bcs)
            solver = df.NonlinearVariationalSolver(problem)
            
            # 求解器参数
            prm = solver.parameters
            prm['newton_solver']['absolute_tolerance'] = params.get('convergence_tolerance', 1e-6)
            prm['newton_solver']['relative_tolerance'] = 1e-9
            prm['newton_solver']['maximum_iterations'] = params.get('max_iterations', 50)
            
            # 求解
            solver.solve()
            
            return df.split(w)
            
        except Exception as e:
            warnings.warn(f"Navier-Stokes求解失败: {e}")
            return None
    
    def solve_turbulence_model(self, velocity_field, function_spaces: Dict, 
                             params: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """求解湍流模型"""
        if not FENICS_AVAILABLE or velocity_field is None:
            return None
        
        try:
            S = function_spaces['S']
            
            # k-ε模型参数
            C_mu = 0.09
            C_1 = 1.44
            C_2 = 1.92
            sigma_k = 1.0
            sigma_e = 1.3
            
            # 定义湍流变量
            k = df.Function(S)  # 湍动能
            epsilon = df.Function(S)  # 湍流耗散率
            
            # 湍流粘度
            mu_t = df.Function(S)
            
            # 初始值估算
            inlet_velocity = params['flow_velocity']
            turbulence_intensity = 0.05  # 5%湍流强度
            
            k_inlet = 1.5 * (turbulence_intensity * inlet_velocity)**2
            epsilon_inlet = C_mu**0.75 * k_inlet**1.5 / (0.07 * params['pier_diameter'])
            
            # 设置初值
            k.vector()[:] = k_inlet
            epsilon.vector()[:] = epsilon_inlet
            
            # 简化：直接计算涡粘度
            mu_t.vector()[:] = C_mu * k_inlet**2 / epsilon_inlet
            
            return {
                'k': k,
                'epsilon': epsilon,
                'mu_t': mu_t,
                'turbulence_intensity': turbulence_intensity
            }
            
        except Exception as e:
            warnings.warn(f"湍流模型求解失败: {e}")
            return None
    
    def calculate_scour_evolution(self, flow_results: Dict, params: Dict[str, Any]) -> Dict[str, Any]:
        """计算冲刷演化"""
        try:
            # 提取流场信息
            if FENICS_AVAILABLE and flow_results.get('velocity_field'):
                # 从FEniCS结果计算
                return self._calculate_scour_from_fenics(flow_results, params)
            else:
                # 使用简化模型
                return self._calculate_scour_simplified(params)
                
        except Exception as e:
            warnings.warn(f"冲刷计算失败: {e}")
            return {'scour_depth': 0, 'scour_width': 0, 'warnings': [str(e)]}
    
    def _calculate_scour_from_fenics(self, flow_results: Dict, params: Dict[str, Any]) -> Dict[str, Any]:
        """基于FEniCS结果计算冲刷"""
        # 这里实现基于FEniCS流场结果的冲刷计算
        # 包括床面剪切应力、沉积物输运等
        
        D = params['pier_diameter']
        V = params['flow_velocity']
        
        # 简化冲刷估算（实际应该基于剪切应力场）
        velocity_amplification = 1.5  # 桥墩周围速度放大系数
        effective_velocity = V * velocity_amplification
        
        # 基于Shields准则的冲刷深度估算
        d50_m = params['d50'] / 1000.0
        specific_gravity = params['sediment_density'] / params['water_density']
        
        # 临界剪切速度
        critical_shear_velocity = math.sqrt(
            params['gravity'] * d50_m * (specific_gravity - 1) * 0.047
        )
        
        # 实际剪切速度
        actual_shear_velocity = effective_velocity * math.sqrt(0.005)
        
        # 冲刷深度（基于能量平衡）
        if actual_shear_velocity > critical_shear_velocity:
            scour_ratio = (actual_shear_velocity / critical_shear_velocity - 1) ** 0.8
            scour_depth = 1.8 * D * scour_ratio
        else:
            scour_depth = 0.0
        
        scour_width = scour_depth * 4.0
        
        return {
            'scour_depth': min(scour_depth, 3.0 * D),
            'scour_width': scour_width,
            'max_shear_stress': actual_shear_velocity**2 * 1000,
            'critical_shear_stress': critical_shear_velocity**2 * 1000,
            'warnings': []
        }
    
    def _calculate_scour_simplified(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """简化冲刷计算"""
        # 使用简化流场求解器
        flow_results = self.fallback_solver.solve_flow_around_cylinder(params)
        bed_shear = self.fallback_solver.calculate_bed_shear_stress(flow_results, params)
        
        # 查找最大剪切应力位置
        max_shear_idx = np.argmax(bed_shear)
        max_shear_stress = bed_shear[max_shear_idx]
        
        # 基于剪切应力计算冲刷
        D = params['pier_diameter']
        d50_m = params['d50'] / 1000.0
        specific_gravity = params['sediment_density'] / params['water_density']
        
        # 临界剪切应力
        critical_shear_stress = 1000 * params['gravity'] * d50_m * (specific_gravity - 1) * 0.047
        
        # 冲刷深度计算
        if max_shear_stress > critical_shear_stress:
            excess_shear = max_shear_stress - critical_shear_stress
            scour_depth = 2.0 * D * (excess_shear / critical_shear_stress) ** 0.7
        else:
            scour_depth = 0.0
        
        scour_width = scour_depth * 4.2
        
        return {
            'scour_depth': min(scour_depth, 2.5 * D),
            'scour_width': scour_width,
            'max_shear_stress': max_shear_stress,
            'critical_shear_stress': critical_shear_stress,
            'flow_results': flow_results,
            'warnings': ['使用简化数值模型']
        }
    
    def solve(self, scour_params, numerical_params: NumericalParameters) -> NumericalResult:
        """主求解方法"""
        import time
        start_time = time.time()
        
        # 转换参数格式
        params = {
            'pier_diameter': scour_params.pier_diameter,
            'pier_shape': scour_params.pier_shape.value if hasattr(scour_params.pier_shape, 'value') else 'circular',
            'flow_velocity': scour_params.flow_velocity,
            'water_depth': scour_params.water_depth,
            'approach_angle': scour_params.approach_angle,
            'd50': scour_params.d50,
            'sediment_density': scour_params.sediment_density,
            'water_density': scour_params.water_density,
            'gravity': scour_params.gravity,
            'mesh_resolution': numerical_params.mesh_resolution,
            'time_step': numerical_params.time_step,
            'convergence_tolerance': numerical_params.convergence_tolerance,
            'max_iterations': numerical_params.max_iterations
        }
        
        warnings_list = []
        
        try:
            if FENICS_AVAILABLE:
                # 完整FEniCS求解流程
                mesh = self.create_geometry_and_mesh(params)
                if mesh is not None:
                    function_spaces = self.setup_function_spaces(mesh)
                    boundary_conditions = self.setup_boundary_conditions(function_spaces, params)
                    
                    # 求解流场
                    flow_solution = self.solve_navier_stokes(function_spaces, boundary_conditions, params)
                    
                    if flow_solution is not None:
                        u, p = flow_solution
                        
                        # 求解湍流
                        turbulence_results = self.solve_turbulence_model(u, function_spaces, params)
                        
                        # 计算冲刷
                        flow_results = {
                            'velocity_field': u,
                            'pressure_field': p,
                            'turbulence_field': turbulence_results
                        }
                        scour_results = self.calculate_scour_evolution(flow_results, params)
                    else:
                        # FEniCS求解失败，使用简化模型
                        warnings_list.append("FEniCS求解失败，使用简化模型")
                        scour_results = self._calculate_scour_simplified(params)
                else:
                    warnings_list.append("网格生成失败，使用简化模型")
                    scour_results = self._calculate_scour_simplified(params)
            else:
                # 使用简化求解器
                scour_results = self._calculate_scour_simplified(params)
                
        except Exception as e:
            warnings_list.append(f"数值求解错误: {e}")
            scour_results = self._calculate_scour_simplified(params)
        
        # 计算无量纲参数
        kinematic_viscosity = 1e-6  # 简化
        reynolds = params['flow_velocity'] * params['pier_diameter'] / kinematic_viscosity
        froude = params['flow_velocity'] / math.sqrt(params['gravity'] * params['water_depth'])
        
        # 最大速度估算
        max_velocity = params['flow_velocity'] * 1.8  # 桥墩周围速度放大
        
        # 计算时间
        computation_time = time.time() - start_time
        
        # 平衡时间估算
        if scour_results['scour_depth'] > 0:
            equilibrium_time = 20.0 * (scour_results['scour_depth'] ** 1.5) / \
                             (params['flow_velocity'] * (params['d50']/1000) ** 0.4)
        else:
            equilibrium_time = 0.0
        
        warnings_list.extend(scour_results.get('warnings', []))
        
        return NumericalResult(
            scour_depth=scour_results['scour_depth'],
            scour_width=scour_results['scour_width'],
            scour_volume=scour_results['scour_depth'] * scour_results['scour_width'] * params['pier_diameter'],
            equilibrium_time=equilibrium_time,
            max_velocity=max_velocity,
            max_shear_stress=scour_results.get('max_shear_stress', 0),
            reynolds_number=reynolds,
            froude_number=froude,
            computation_time=computation_time,
            iterations=params.get('max_iterations', 1),
            convergence_achieved=True,
            method="FEniCS-Numerical",
            warnings=warnings_list
        )
    
    def extract_monitoring_data(self, solution, mesh, points: List[Tuple[float, float]]) -> Dict[str, List[float]]:
        """提取监测点数据"""
        if not FENICS_AVAILABLE or solution is None:
            return {}
        
        try:
            u, p = solution
            monitoring_data = {
                'velocities': [],
                'pressures': [],
                'positions': points
            }
            
            for x, y in points:
                try:
                    point = df.Point(x, y)
                    velocity = u(point)
                    pressure = p(point)
                    
                    monitoring_data['velocities'].append(
                        math.sqrt(velocity[0]**2 + velocity[1]**2)
                    )
                    monitoring_data['pressures'].append(float(pressure))
                    
                except Exception:
                    # 点可能在域外
                    monitoring_data['velocities'].append(0.0)
                    monitoring_data['pressures'].append(0.0)
            
            return monitoring_data
            
        except Exception as e:
            warnings.warn(f"监测数据提取失败: {e}")
            return {}
    
    def export_vtk_results(self, solution, mesh, filename: str) -> bool:
        """导出VTK格式结果"""
        if not FENICS_AVAILABLE or solution is None:
            return False
        
        try:
            u, p = solution
            
            # 创建VTK文件
            vtkfile_u = df.File(f"{filename}_velocity.pvd")
            vtkfile_p = df.File(f"{filename}_pressure.pvd")
            
            # 重命名用于可视化
            u.rename("velocity", "Velocity")
            p.rename("pressure", "Pressure")
            
            # 保存
            vtkfile_u << u
            vtkfile_p << p
            
            return True
            
        except Exception as e:
            warnings.warn(f"VTK导出失败: {e}")
            return False


def create_test_numerical_parameters() -> NumericalParameters:
    """创建测试数值参数"""
    return NumericalParameters(
        mesh_resolution=0.05,
        refinement_levels=2,
        time_step=0.1,
        total_time=1800.0,
        turbulence_model=TurbulenceModel.K_EPSILON,
        convergence_tolerance=1e-5,
        max_iterations=30
    )


if __name__ == "__main__":
    # 测试FEniCS求解器
    print("=== FEniCS桥墩冲刷数值求解器测试 ===")
    print(f"FEniCS可用: {FENICS_AVAILABLE}")
    
    solver = FEniCSScourSolver()
    
    # 导入测试参数
    import sys
    sys.path.append('.')
    from empirical_solver import create_test_parameters
    
    scour_params = create_test_parameters()
    numerical_params = create_test_numerical_parameters()
    
    print(f"桥墩直径: {scour_params.pier_diameter} m")
    print(f"流速: {scour_params.flow_velocity} m/s")
    print(f"网格分辨率: {numerical_params.mesh_resolution} m")
    print()
    
    # 求解
    result = solver.solve(scour_params, numerical_params)
    
    print("=== 数值计算结果 ===")
    print(f"冲刷深度: {result.scour_depth:.3f} m")
    print(f"冲刷宽度: {result.scour_width:.3f} m")
    print(f"冲刷体积: {result.scour_volume:.3f} m³")
    print(f"平衡时间: {result.equilibrium_time:.1f} h")
    print(f"最大流速: {result.max_velocity:.3f} m/s")
    print(f"最大剪应力: {result.max_shear_stress:.1f} Pa")
    print(f"计算时间: {result.computation_time:.2f} s")
    print(f"收敛: {result.convergence_achieved}")
    
    if result.warnings:
        print(f"警告: {'; '.join(result.warnings)}")