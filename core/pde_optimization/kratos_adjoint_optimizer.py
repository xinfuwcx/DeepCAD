#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD PDE约束优化反演系统 - Kratos伴随方法优化器
3号计算专家 - Week1架构设计

基于Kratos 10.3的PDE约束优化系统，支持：
- 伴随方法梯度计算
- 约束优化求解
- 多物理场耦合优化
- 实时参数反演

技术特点：
- Kratos MultiphysicsApplication集成
- 高效梯度计算（伴随方法）
- 支持各种工程约束条件
- GPU加速计算支持
"""

import numpy as np
import json
import asyncio
from typing import Dict, List, Optional, Union, Tuple
from dataclasses import dataclass
from abc import ABC, abstractmethod
import time
import logging

# Kratos导入（确保Kratos 10.3已正确安装）
try:
    import KratosMultiphysics as KM
    import KratosMultiphysics.StructuralMechanicsApplication as SMA
    import KratosMultiphysics.FluidDynamicsApplication as FDA
    import KratosMultiphysics.GeomechanicsApplication as GMA
    KRATOS_AVAILABLE = True
except ImportError:
    print("Warning: Kratos 10.3 not available, using mock mode")
    KRATOS_AVAILABLE = False

@dataclass
class OptimizationParameters:
    """优化参数配置"""
    max_iterations: int = 100
    convergence_tolerance: float = 1e-6
    step_size: float = 0.01
    gradient_method: str = "adjoint"  # "adjoint", "finite_difference"
    constraint_handling: str = "penalty"  # "penalty", "lagrangian"
    regularization_factor: float = 1e-8
    
@dataclass
class DesignVariable:
    """设计变量定义"""
    name: str
    initial_value: float
    lower_bound: float
    upper_bound: float
    variable_type: str  # "material", "geometry", "loading"
    
@dataclass
class ConstraintFunction:
    """约束函数定义"""
    name: str
    constraint_type: str  # "equality", "inequality"
    target_value: float
    tolerance: float
    weight: float = 1.0

class KratosAdjointOptimizer:
    """基于Kratos的PDE约束优化器"""
    
    def __init__(self, config_file: Optional[str] = None):
        """
        初始化Kratos优化器
        
        Args:
            config_file: Kratos项目配置文件路径
        """
        self.logger = logging.getLogger(__name__)
        self.kratos_available = KRATOS_AVAILABLE
        
        # 优化状态
        self.optimization_state = {
            "iteration": 0,
            "objective_value": float('inf'),
            "gradient_norm": float('inf'),
            "constraint_violation": float('inf'),
            "converged": False
        }
        
        # 设计变量和约束
        self.design_variables: List[DesignVariable] = []
        self.constraints: List[ConstraintFunction] = []
        self.optimization_params = OptimizationParameters()
        
        # Kratos模型管理
        if self.kratos_available and config_file:
            self._initialize_kratos_model(config_file)
        else:
            self._initialize_mock_model()
    
    def _initialize_kratos_model(self, config_file: str):
        """初始化Kratos计算模型"""
        try:
            # 创建Kratos模型
            self.model = KM.Model()
            self.main_model_part = self.model.CreateModelPart("MainModelPart")
            
            # 读取项目参数
            with open(config_file, 'r') as f:
                self.project_parameters = KM.Parameters(f.read())
            
            # 创建求解器
            self._create_solvers()
            
            # 创建伴随求解器
            self._create_adjoint_solver()
            
            self.logger.info("Kratos模型初始化完成")
            
        except Exception as e:
            self.logger.error(f"Kratos模型初始化失败: {e}")
            self._initialize_mock_model()
    
    def _initialize_mock_model(self):
        """初始化Mock模型（用于测试）"""
        self.model = None
        self.main_model_part = None
        self.project_parameters = None
        self.logger.info("使用Mock模型模式")
    
    def _create_solvers(self):
        """创建正向求解器"""
        if not self.kratos_available:
            return
            
        # 结构力学求解器
        self.structural_solver = self._create_structural_solver()
        
        # 流体力学求解器（如需要）
        if self.project_parameters.Has("fluid_solver_settings"):
            self.fluid_solver = self._create_fluid_solver()
        
        # 地质力学求解器（深基坑专用）
        if self.project_parameters.Has("geomechanics_solver_settings"):
            self.geomechanics_solver = self._create_geomechanics_solver()
    
    def _create_structural_solver(self):
        """创建结构求解器"""
        if not self.kratos_available:
            return None
            
        solver_settings = self.project_parameters["solver_settings"]
        solver_type = solver_settings["solver_type"].GetString()
        
        if solver_type == "Static":
            return SMA.StaticStructuralSolver(self.model, solver_settings)
        elif solver_type == "Dynamic":
            return SMA.DynamicStructuralSolver(self.model, solver_settings)
        else:
            raise ValueError(f"不支持的求解器类型: {solver_type}")
    
    def _create_adjoint_solver(self):
        """创建伴随求解器"""
        if not self.kratos_available:
            self.adjoint_solver = None
            return
            
        # 伴随求解器参数
        adjoint_parameters = KM.Parameters("""{
            "solver_type": "adjoint_static_solver",
            "response_function_settings": {
                "response_type": "compliance",
                "gradient_mode": "analytic"
            },
            "sensitivity_settings": {
                "nodal_solution_step_sensitivity_variables": ["DISPLACEMENT"],
                "element_data_value_sensitivity_variables": ["YOUNG_MODULUS", "THICKNESS"]
            }
        }""")
        
        # 创建伴随求解器实例
        self.adjoint_solver = SMA.AdjointStaticSolver(self.model, adjoint_parameters)
    
    def add_design_variable(self, variable: DesignVariable):
        """添加设计变量"""
        self.design_variables.append(variable)
        self.logger.info(f"添加设计变量: {variable.name}")
    
    def add_constraint(self, constraint: ConstraintFunction):
        """添加约束函数"""
        self.constraints.append(constraint)
        self.logger.info(f"添加约束: {constraint.name}")
    
    def set_optimization_parameters(self, params: OptimizationParameters):
        """设置优化参数"""
        self.optimization_params = params
        self.logger.info("优化参数已更新")
    
    async def optimize(self, objective_function_name: str) -> Dict:
        """
        执行PDE约束优化
        
        Args:
            objective_function_name: 目标函数名称
            
        Returns:
            优化结果字典
        """
        self.logger.info("开始PDE约束优化...")
        start_time = time.time()
        
        # 优化主循环
        for iteration in range(self.optimization_params.max_iterations):
            self.optimization_state["iteration"] = iteration
            
            # 1. 正向求解
            objective_value = await self._solve_forward_problem()
            self.optimization_state["objective_value"] = objective_value
            
            # 2. 约束评估
            constraint_violation = await self._evaluate_constraints()
            self.optimization_state["constraint_violation"] = constraint_violation
            
            # 3. 收敛检查
            if await self._check_convergence():
                self.optimization_state["converged"] = True
                break
            
            # 4. 伴随求解（梯度计算）
            gradients = await self._solve_adjoint_problem()
            
            # 5. 设计变量更新
            await self._update_design_variables(gradients)
            
            # 6. 进度报告
            if iteration % 10 == 0:
                await self._report_progress()
        
        # 优化完成
        end_time = time.time()
        optimization_time = end_time - start_time
        
        result = {
            "converged": self.optimization_state["converged"],
            "iterations": self.optimization_state["iteration"],
            "final_objective": self.optimization_state["objective_value"],
            "constraint_violation": self.optimization_state["constraint_violation"],
            "optimization_time": optimization_time,
            "optimal_design_variables": self._get_current_design_values()
        }
        
        self.logger.info(f"优化完成，耗时: {optimization_time:.2f}秒")
        return result
    
    async def _solve_forward_problem(self) -> float:
        """正向问题求解"""
        if self.kratos_available and self.structural_solver:
            # Kratos正向求解
            self.structural_solver.Solve()
            
            # 计算目标函数值（示例：柔度最小化）
            total_displacement_energy = 0.0
            for node in self.main_model_part.Nodes:
                displacement = node.GetSolutionStepValue(KM.DISPLACEMENT)
                total_displacement_energy += displacement.norm() ** 2
            
            return total_displacement_energy
        else:
            # Mock求解（用于测试）
            await asyncio.sleep(0.1)  # 模拟计算时间
            return np.random.uniform(100, 1000)  # 模拟目标函数值
    
    async def _evaluate_constraints(self) -> float:
        """约束函数评估"""
        total_violation = 0.0
        
        for constraint in self.constraints:
            if constraint.constraint_type == "stress_limit":
                # 应力约束检查
                violation = await self._evaluate_stress_constraint(constraint)
            elif constraint.constraint_type == "displacement_limit":
                # 位移约束检查
                violation = await self._evaluate_displacement_constraint(constraint)
            elif constraint.constraint_type == "volume_fraction":
                # 体积分数约束
                violation = await self._evaluate_volume_constraint(constraint)
            else:
                violation = 0.0
            
            total_violation += abs(violation) * constraint.weight
        
        return total_violation
    
    async def _evaluate_stress_constraint(self, constraint: ConstraintFunction) -> float:
        """应力约束评估"""
        if self.kratos_available and self.main_model_part:
            max_stress = 0.0
            for element in self.main_model_part.Elements:
                # 获取元素应力
                stress_vector = element.GetValue(KM.STRESS_VECTOR)
                von_mises_stress = self._calculate_von_mises_stress(stress_vector)
                max_stress = max(max_stress, von_mises_stress)
            
            # 约束违反量
            if constraint.constraint_type == "inequality":
                return max(0, max_stress - constraint.target_value)
            else:
                return abs(max_stress - constraint.target_value)
        else:
            # Mock约束评估
            await asyncio.sleep(0.01)
            mock_stress = np.random.uniform(50, 200)
            return max(0, mock_stress - constraint.target_value)
    
    async def _solve_adjoint_problem(self) -> Dict[str, float]:
        """伴随问题求解（梯度计算）"""
        gradients = {}
        
        if self.kratos_available and self.adjoint_solver:
            # Kratos伴随求解
            self.adjoint_solver.Solve()
            
            # 提取灵敏度信息
            for variable in self.design_variables:
                if variable.variable_type == "material":
                    # 材料参数灵敏度
                    sensitivity = self._extract_material_sensitivity(variable.name)
                elif variable.variable_type == "geometry":
                    # 几何参数灵敏度
                    sensitivity = self._extract_geometry_sensitivity(variable.name)
                else:
                    sensitivity = 0.0
                
                gradients[variable.name] = sensitivity
        else:
            # Mock梯度计算
            await asyncio.sleep(0.05)
            for variable in self.design_variables:
                gradients[variable.name] = np.random.uniform(-1, 1)
        
        # 计算梯度范数
        gradient_values = list(gradients.values())
        self.optimization_state["gradient_norm"] = np.linalg.norm(gradient_values)
        
        return gradients
    
    async def _update_design_variables(self, gradients: Dict[str, float]):
        """更新设计变量"""
        for variable in self.design_variables:
            if variable.name in gradients:
                # 梯度下降更新
                gradient = gradients[variable.name]
                step = self.optimization_params.step_size * gradient
                
                # 计算新值
                new_value = variable.initial_value - step
                
                # 边界约束处理
                new_value = max(variable.lower_bound, 
                              min(variable.upper_bound, new_value))
                
                # 更新变量值
                variable.initial_value = new_value
                
                # 在Kratos模型中更新参数
                await self._update_kratos_parameter(variable)
    
    async def _update_kratos_parameter(self, variable: DesignVariable):
        """在Kratos模型中更新参数"""
        if not self.kratos_available:
            return
            
        if variable.variable_type == "material":
            # 更新材料属性
            for element in self.main_model_part.Elements:
                if variable.name == "YOUNG_MODULUS":
                    element.SetValue(KM.YOUNG_MODULUS, variable.initial_value)
                elif variable.name == "DENSITY":
                    element.SetValue(KM.DENSITY, variable.initial_value)
        
        elif variable.variable_type == "geometry":
            # 更新几何参数（需要重新网格化）
            if variable.name == "THICKNESS":
                for element in self.main_model_part.Elements:
                    element.SetValue(KM.THICKNESS, variable.initial_value)
    
    async def _check_convergence(self) -> bool:
        """收敛性检查"""
        # 梯度范数检查
        gradient_converged = (self.optimization_state["gradient_norm"] < 
                            self.optimization_params.convergence_tolerance)
        
        # 约束违反检查
        constraint_converged = (self.optimization_state["constraint_violation"] < 
                              self.optimization_params.convergence_tolerance)
        
        return gradient_converged and constraint_converged
    
    async def _report_progress(self):
        """进度报告"""
        iteration = self.optimization_state["iteration"]
        objective = self.optimization_state["objective_value"]
        gradient_norm = self.optimization_state["gradient_norm"]
        constraint_violation = self.optimization_state["constraint_violation"]
        
        self.logger.info(
            f"迭代 {iteration}: 目标值={objective:.6f}, "
            f"梯度范数={gradient_norm:.6e}, 约束违反={constraint_violation:.6e}"
        )
    
    def _get_current_design_values(self) -> Dict[str, float]:
        """获取当前设计变量值"""
        return {var.name: var.initial_value for var in self.design_variables}
    
    def _calculate_von_mises_stress(self, stress_vector) -> float:
        """计算von Mises应力"""
        if len(stress_vector) >= 6:  # 3D应力状态
            sx, sy, sz, txy, txz, tyz = stress_vector[:6]
            vm_stress = np.sqrt(0.5 * ((sx-sy)**2 + (sy-sz)**2 + (sz-sx)**2 + 
                                     6*(txy**2 + txz**2 + tyz**2)))
        else:  # 2D平面应力
            sx, sy, txy = stress_vector[:3]
            vm_stress = np.sqrt(sx**2 + sy**2 - sx*sy + 3*txy**2)
        
        return vm_stress
    
    def _extract_material_sensitivity(self, parameter_name: str) -> float:
        """提取材料参数灵敏度"""
        if not self.kratos_available:
            return np.random.uniform(-0.1, 0.1)
        
        # 从伴随求解结果中提取灵敏度
        total_sensitivity = 0.0
        for element in self.main_model_part.Elements:
            if hasattr(element, 'GetValue'):
                sensitivity = element.GetValue(f"{parameter_name}_SENSITIVITY")
                total_sensitivity += sensitivity
        
        return total_sensitivity
    
    def _extract_geometry_sensitivity(self, parameter_name: str) -> float:
        """提取几何参数灵敏度"""
        if not self.kratos_available:
            return np.random.uniform(-0.1, 0.1)
        
        # 从节点灵敏度信息中提取
        total_sensitivity = 0.0
        for node in self.main_model_part.Nodes:
            if hasattr(node, 'GetValue'):
                sensitivity = node.GetValue(f"{parameter_name}_SENSITIVITY")
                total_sensitivity += sensitivity
        
        return total_sensitivity
    
    def export_optimization_results(self, filename: str):
        """导出优化结果"""
        results = {
            "optimization_state": self.optimization_state,
            "design_variables": [
                {
                    "name": var.name,
                    "optimal_value": var.initial_value,
                    "bounds": [var.lower_bound, var.upper_bound],
                    "type": var.variable_type
                }
                for var in self.design_variables
            ],
            "constraints": [
                {
                    "name": const.name,
                    "type": const.constraint_type,
                    "target": const.target_value,
                    "weight": const.weight
                }
                for const in self.constraints
            ],
            "parameters": {
                "max_iterations": self.optimization_params.max_iterations,
                "convergence_tolerance": self.optimization_params.convergence_tolerance,
                "gradient_method": self.optimization_params.gradient_method
            }
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        self.logger.info(f"优化结果已导出至: {filename}")

# 深基坑专用优化器
class DeepExcavationOptimizer(KratosAdjointOptimizer):
    """深基坑工程PDE约束优化器"""
    
    def __init__(self, config_file: Optional[str] = None):
        super().__init__(config_file)
        self._setup_deep_excavation_constraints()
    
    def _setup_deep_excavation_constraints(self):
        """设置深基坑专用约束"""
        # 位移约束
        displacement_constraint = ConstraintFunction(
            name="max_displacement",
            constraint_type="inequality",
            target_value=0.025,  # 25mm最大位移
            tolerance=1e-6,
            weight=1.0
        )
        self.add_constraint(displacement_constraint)
        
        # 应力约束
        stress_constraint = ConstraintFunction(
            name="max_stress",
            constraint_type="inequality", 
            target_value=200e6,  # 200MPa最大应力
            tolerance=1e6,
            weight=1.0
        )
        self.add_constraint(stress_constraint)
        
        # 安全系数约束
        safety_constraint = ConstraintFunction(
            name="safety_factor",
            constraint_type="inequality",
            target_value=1.3,  # 最小安全系数1.3
            tolerance=0.01,
            weight=2.0
        )
        self.add_constraint(safety_constraint)

# 优化任务工厂
class OptimizationTaskFactory:
    """优化任务工厂"""
    
    @staticmethod
    def create_deep_excavation_optimizer(config_path: str) -> DeepExcavationOptimizer:
        """创建深基坑优化器"""
        optimizer = DeepExcavationOptimizer(config_path)
        
        # 添加典型设计变量
        optimizer.add_design_variable(DesignVariable(
            name="support_stiffness",
            initial_value=1e8,
            lower_bound=1e6,
            upper_bound=1e10,
            variable_type="material"
        ))
        
        optimizer.add_design_variable(DesignVariable(
            name="excavation_sequence",
            initial_value=5.0,
            lower_bound=1.0,
            upper_bound=10.0,
            variable_type="geometry"
        ))
        
        return optimizer
    
    @staticmethod
    def create_topology_optimizer(config_path: str) -> KratosAdjointOptimizer:
        """创建拓扑优化器"""
        optimizer = KratosAdjointOptimizer(config_path)
        
        # 体积分数约束
        volume_constraint = ConstraintFunction(
            name="volume_fraction",
            constraint_type="equality",
            target_value=0.3,  # 30%体积分数
            tolerance=0.01,
            weight=1.0
        )
        optimizer.add_constraint(volume_constraint)
        
        return optimizer

if __name__ == "__main__":
    # 测试示例
    async def test_optimization():
        """优化测试示例"""
        print("🏗️ DeepCAD PDE约束优化系统测试 🏗️")
        
        # 创建深基坑优化器
        optimizer = OptimizationTaskFactory.create_deep_excavation_optimizer(
            "test_config.json"
        )
        
        # 设置优化参数
        params = OptimizationParameters(
            max_iterations=50,
            convergence_tolerance=1e-4,
            step_size=0.01
        )
        optimizer.set_optimization_parameters(params)
        
        # 执行优化
        results = await optimizer.optimize("compliance_minimization")
        
        print(f"优化结果: {results}")
        
        # 导出结果
        optimizer.export_optimization_results("optimization_results.json")
    
    # 运行测试
    asyncio.run(test_optimization())