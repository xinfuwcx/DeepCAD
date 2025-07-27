#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD PDE约束管理系统
3号计算专家 - Week1架构设计

约束管理器负责：
- 多类型约束定义和管理
- 约束违反度计算
- 约束梯度计算
- 自适应约束权重调整

支持约束类型：
- 应力约束
- 位移约束  
- 几何约束
- 材料约束
- 工程规范约束
"""

import numpy as np
import json
from typing import Dict, List, Optional, Union, Callable, Tuple
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
from enum import Enum
import asyncio
import logging

class ConstraintType(Enum):
    """约束类型枚举"""
    EQUALITY = "equality"
    INEQUALITY = "inequality"
    BOUND = "bound"

class ConstraintCategory(Enum):
    """约束分类枚举"""
    STRESS = "stress"
    DISPLACEMENT = "displacement"
    GEOMETRY = "geometry"
    MATERIAL = "material"
    SAFETY = "safety"
    CUSTOM = "custom"

@dataclass
class ConstraintEvaluation:
    """约束评估结果"""
    constraint_id: str
    violation: float
    gradient: Dict[str, float] = field(default_factory=dict)
    active: bool = True
    feasible: bool = True

class BaseConstraint(ABC):
    """约束基类"""
    
    def __init__(self, 
                 constraint_id: str,
                 constraint_type: ConstraintType,
                 category: ConstraintCategory,
                 target_value: float,
                 tolerance: float = 1e-6,
                 weight: float = 1.0,
                 active: bool = True):
        """
        初始化约束
        
        Args:
            constraint_id: 约束标识符
            constraint_type: 约束类型
            category: 约束分类
            target_value: 目标值
            tolerance: 容差
            weight: 权重
            active: 是否激活
        """
        self.constraint_id = constraint_id
        self.constraint_type = constraint_type
        self.category = category
        self.target_value = target_value
        self.tolerance = tolerance
        self.weight = weight
        self.active = active
        
        # 约束历史记录
        self.violation_history: List[float] = []
        self.gradient_history: List[Dict[str, float]] = []
    
    @abstractmethod
    async def evaluate(self, design_variables: Dict[str, float], 
                      model_results: Dict) -> ConstraintEvaluation:
        """评估约束违反度"""
        pass
    
    @abstractmethod
    async def compute_gradient(self, design_variables: Dict[str, float],
                             model_results: Dict) -> Dict[str, float]:
        """计算约束梯度"""
        pass
    
    def update_weight(self, violation: float):
        """自适应权重更新"""
        if self.constraint_type == ConstraintType.EQUALITY:
            # 等式约束权重随违反度增加
            self.weight = max(1.0, abs(violation) * 10)
        elif self.constraint_type == ConstraintType.INEQUALITY:
            # 不等式约束仅在违反时增加权重
            if violation > self.tolerance:
                self.weight = min(100.0, self.weight * 1.5)
            else:
                self.weight = max(1.0, self.weight * 0.9)

class StressConstraint(BaseConstraint):
    """应力约束"""
    
    def __init__(self, constraint_id: str, max_stress: float, **kwargs):
        super().__init__(
            constraint_id=constraint_id,
            constraint_type=ConstraintType.INEQUALITY,
            category=ConstraintCategory.STRESS,
            target_value=max_stress,
            **kwargs
        )
        self.stress_type = kwargs.get('stress_type', 'von_mises')
        self.safety_factor = kwargs.get('safety_factor', 1.0)
    
    async def evaluate(self, design_variables: Dict[str, float], 
                      model_results: Dict) -> ConstraintEvaluation:
        """评估应力约束"""
        # 从模型结果中提取应力
        stresses = model_results.get('element_stresses', [])
        
        if self.stress_type == 'von_mises':
            max_stress = await self._compute_max_von_mises_stress(stresses)
        elif self.stress_type == 'principal':
            max_stress = await self._compute_max_principal_stress(stresses)
        else:
            max_stress = max(stresses) if stresses else 0.0
        
        # 考虑安全系数
        effective_stress = max_stress * self.safety_factor
        
        # 计算违反度
        violation = max(0.0, effective_stress - self.target_value)
        feasible = violation <= self.tolerance
        
        # 记录历史
        self.violation_history.append(violation)
        
        return ConstraintEvaluation(
            constraint_id=self.constraint_id,
            violation=violation,
            active=self.active and violation > 0,
            feasible=feasible
        )
    
    async def compute_gradient(self, design_variables: Dict[str, float],
                             model_results: Dict) -> Dict[str, float]:
        """计算应力约束梯度"""
        gradients = {}
        
        # 应力对设计变量的敏感性
        stress_sensitivities = model_results.get('stress_sensitivities', {})
        
        for var_name in design_variables:
            if var_name in stress_sensitivities:
                # 链式法则计算梯度
                stress_gradient = stress_sensitivities[var_name]
                
                if isinstance(stress_gradient, (list, np.ndarray)):
                    # 如果是数组，取最大值对应的梯度
                    max_idx = np.argmax(np.abs(stress_gradient))
                    gradients[var_name] = stress_gradient[max_idx] * self.safety_factor
                else:
                    gradients[var_name] = stress_gradient * self.safety_factor
            else:
                gradients[var_name] = 0.0
        
        self.gradient_history.append(gradients.copy())
        return gradients
    
    async def _compute_max_von_mises_stress(self, stresses: List) -> float:
        """计算最大von Mises应力"""
        if not stresses:
            return 0.0
        
        max_vm_stress = 0.0
        for stress_tensor in stresses:
            if len(stress_tensor) >= 6:  # 3D应力张量
                s11, s22, s33, s12, s13, s23 = stress_tensor[:6]
                vm_stress = np.sqrt(0.5 * ((s11-s22)**2 + (s22-s33)**2 + (s33-s11)**2 + 
                                         6*(s12**2 + s13**2 + s23**2)))
            else:  # 2D平面应力
                s11, s22, s12 = stress_tensor[:3]
                vm_stress = np.sqrt(s11**2 + s22**2 - s11*s22 + 3*s12**2)
            
            max_vm_stress = max(max_vm_stress, vm_stress)
        
        return max_vm_stress
    
    async def _compute_max_principal_stress(self, stresses: List) -> float:
        """计算最大主应力"""
        if not stresses:
            return 0.0
        
        max_principal = 0.0
        for stress_tensor in stresses:
            # 计算主应力（简化为2D情况）
            if len(stress_tensor) >= 3:
                s11, s22, s12 = stress_tensor[:3]
                principal1 = 0.5 * (s11 + s22 + np.sqrt((s11-s22)**2 + 4*s12**2))
                principal2 = 0.5 * (s11 + s22 - np.sqrt((s11-s22)**2 + 4*s12**2))
                max_principal = max(max_principal, abs(principal1), abs(principal2))
        
        return max_principal

class DisplacementConstraint(BaseConstraint):
    """位移约束"""
    
    def __init__(self, constraint_id: str, max_displacement: float, **kwargs):
        super().__init__(
            constraint_id=constraint_id,
            constraint_type=ConstraintType.INEQUALITY,
            category=ConstraintCategory.DISPLACEMENT,
            target_value=max_displacement,
            **kwargs
        )
        self.displacement_type = kwargs.get('displacement_type', 'magnitude')
        self.node_ids = kwargs.get('node_ids', None)  # 特定节点约束
    
    async def evaluate(self, design_variables: Dict[str, float], 
                      model_results: Dict) -> ConstraintEvaluation:
        """评估位移约束"""
        displacements = model_results.get('node_displacements', {})
        
        if self.node_ids:
            # 特定节点位移约束
            max_disp = 0.0
            for node_id in self.node_ids:
                if node_id in displacements:
                    disp = displacements[node_id]
                    if self.displacement_type == 'magnitude':
                        disp_mag = np.linalg.norm(disp)
                    elif self.displacement_type == 'x':
                        disp_mag = abs(disp[0])
                    elif self.displacement_type == 'y':
                        disp_mag = abs(disp[1])
                    else:
                        disp_mag = abs(disp[2]) if len(disp) > 2 else 0
                    
                    max_disp = max(max_disp, disp_mag)
        else:
            # 全局最大位移
            max_disp = 0.0
            for node_id, disp in displacements.items():
                if self.displacement_type == 'magnitude':
                    disp_mag = np.linalg.norm(disp)
                else:
                    disp_mag = max(abs(d) for d in disp)
                max_disp = max(max_disp, disp_mag)
        
        violation = max(0.0, max_disp - self.target_value)
        feasible = violation <= self.tolerance
        
        self.violation_history.append(violation)
        
        return ConstraintEvaluation(
            constraint_id=self.constraint_id,
            violation=violation,
            active=self.active and violation > 0,
            feasible=feasible
        )
    
    async def compute_gradient(self, design_variables: Dict[str, float],
                             model_results: Dict) -> Dict[str, float]:
        """计算位移约束梯度"""
        gradients = {}
        
        displacement_sensitivities = model_results.get('displacement_sensitivities', {})
        
        for var_name in design_variables:
            if var_name in displacement_sensitivities:
                disp_sens = displacement_sensitivities[var_name]
                
                if self.node_ids:
                    # 特定节点梯度
                    max_grad = 0.0
                    for node_id in self.node_ids:
                        if node_id in disp_sens:
                            node_grad = np.linalg.norm(disp_sens[node_id])
                            max_grad = max(max_grad, node_grad)
                    gradients[var_name] = max_grad
                else:
                    # 全局最大梯度
                    if isinstance(disp_sens, dict):
                        all_grads = [np.linalg.norm(grad) for grad in disp_sens.values()]
                        gradients[var_name] = max(all_grads) if all_grads else 0.0
                    else:
                        gradients[var_name] = np.linalg.norm(disp_sens)
            else:
                gradients[var_name] = 0.0
        
        return gradients

class GeometryConstraint(BaseConstraint):
    """几何约束"""
    
    def __init__(self, constraint_id: str, constraint_type: ConstraintType,
                 target_value: float, **kwargs):
        super().__init__(
            constraint_id=constraint_id,
            constraint_type=constraint_type,
            category=ConstraintCategory.GEOMETRY,
            target_value=target_value,
            **kwargs
        )
        self.geometry_parameter = kwargs.get('geometry_parameter', 'volume')
        self.reference_value = kwargs.get('reference_value', None)
    
    async def evaluate(self, design_variables: Dict[str, float], 
                      model_results: Dict) -> ConstraintEvaluation:
        """评估几何约束"""
        geometry_data = model_results.get('geometry_properties', {})
        
        if self.geometry_parameter == 'volume':
            current_value = geometry_data.get('total_volume', 0.0)
        elif self.geometry_parameter == 'surface_area':
            current_value = geometry_data.get('surface_area', 0.0)
        elif self.geometry_parameter == 'volume_fraction':
            if self.reference_value:
                current_volume = geometry_data.get('material_volume', 0.0)
                current_value = current_volume / self.reference_value
            else:
                current_value = geometry_data.get('volume_fraction', 0.0)
        else:
            current_value = geometry_data.get(self.geometry_parameter, 0.0)
        
        # 计算违反度
        if self.constraint_type == ConstraintType.EQUALITY:
            violation = abs(current_value - self.target_value)
        else:  # INEQUALITY
            violation = max(0.0, current_value - self.target_value)
        
        feasible = violation <= self.tolerance
        self.violation_history.append(violation)
        
        return ConstraintEvaluation(
            constraint_id=self.constraint_id,
            violation=violation,
            active=self.active,
            feasible=feasible
        )
    
    async def compute_gradient(self, design_variables: Dict[str, float],
                             model_results: Dict) -> Dict[str, float]:
        """计算几何约束梯度"""
        gradients = {}
        
        geometry_sensitivities = model_results.get('geometry_sensitivities', {})
        
        for var_name in design_variables:
            param_sens = geometry_sensitivities.get(self.geometry_parameter, {})
            gradients[var_name] = param_sens.get(var_name, 0.0)
        
        return gradients

class SafetyConstraint(BaseConstraint):
    """安全约束（深基坑工程专用）"""
    
    def __init__(self, constraint_id: str, min_safety_factor: float, **kwargs):
        super().__init__(
            constraint_id=constraint_id,
            constraint_type=ConstraintType.INEQUALITY,
            category=ConstraintCategory.SAFETY,
            target_value=min_safety_factor,
            **kwargs
        )
        self.failure_mode = kwargs.get('failure_mode', 'overall_stability')
    
    async def evaluate(self, design_variables: Dict[str, float], 
                      model_results: Dict) -> ConstraintEvaluation:
        """评估安全约束"""
        safety_data = model_results.get('safety_analysis', {})
        
        if self.failure_mode == 'overall_stability':
            current_sf = safety_data.get('overall_safety_factor', 1.0)
        elif self.failure_mode == 'local_stability':
            current_sf = safety_data.get('local_safety_factor', 1.0)
        elif self.failure_mode == 'sliding':
            current_sf = safety_data.get('sliding_safety_factor', 1.0)
        elif self.failure_mode == 'overturning':
            current_sf = safety_data.get('overturning_safety_factor', 1.0)
        else:
            current_sf = safety_data.get('safety_factor', 1.0)
        
        # 安全系数约束（最小值约束）
        violation = max(0.0, self.target_value - current_sf)
        feasible = violation <= self.tolerance
        
        self.violation_history.append(violation)
        
        return ConstraintEvaluation(
            constraint_id=self.constraint_id,
            violation=violation,
            active=self.active and violation > 0,
            feasible=feasible
        )
    
    async def compute_gradient(self, design_variables: Dict[str, float],
                             model_results: Dict) -> Dict[str, float]:
        """计算安全约束梯度"""
        gradients = {}
        
        safety_sensitivities = model_results.get('safety_sensitivities', {})
        failure_sens = safety_sensitivities.get(self.failure_mode, {})
        
        for var_name in design_variables:
            # 安全系数梯度为负（因为约束是最小值约束）
            gradients[var_name] = -failure_sens.get(var_name, 0.0)
        
        return gradients

class ConstraintManager:
    """约束管理器"""
    
    def __init__(self):
        """初始化约束管理器"""
        self.constraints: Dict[str, BaseConstraint] = {}
        self.constraint_evaluations: Dict[str, ConstraintEvaluation] = {}
        self.logger = logging.getLogger(__name__)
        
        # 约束求解参数
        self.penalty_parameter = 1.0
        self.barrier_parameter = 1.0
        self.adaptive_weights = True
    
    def add_constraint(self, constraint: BaseConstraint):
        """添加约束"""
        self.constraints[constraint.constraint_id] = constraint
        self.logger.info(f"添加约束: {constraint.constraint_id}")
    
    def remove_constraint(self, constraint_id: str):
        """移除约束"""
        if constraint_id in self.constraints:
            del self.constraints[constraint_id]
            if constraint_id in self.constraint_evaluations:
                del self.constraint_evaluations[constraint_id]
            self.logger.info(f"移除约束: {constraint_id}")
    
    def get_constraint(self, constraint_id: str) -> Optional[BaseConstraint]:
        """获取约束"""
        return self.constraints.get(constraint_id)
    
    async def evaluate_all_constraints(self, design_variables: Dict[str, float],
                                     model_results: Dict) -> Dict[str, ConstraintEvaluation]:
        """评估所有约束"""
        self.constraint_evaluations = {}
        
        # 并行评估所有约束
        evaluation_tasks = []
        for constraint_id, constraint in self.constraints.items():
            if constraint.active:
                task = constraint.evaluate(design_variables, model_results)
                evaluation_tasks.append((constraint_id, task))
        
        # 等待所有评估完成
        for constraint_id, task in evaluation_tasks:
            evaluation = await task
            self.constraint_evaluations[constraint_id] = evaluation
            
            # 自适应权重更新
            if self.adaptive_weights:
                constraint = self.constraints[constraint_id]
                constraint.update_weight(evaluation.violation)
        
        return self.constraint_evaluations
    
    async def compute_all_gradients(self, design_variables: Dict[str, float],
                                  model_results: Dict) -> Dict[str, Dict[str, float]]:
        """计算所有约束梯度"""
        all_gradients = {}
        
        # 并行计算所有约束梯度
        gradient_tasks = []
        for constraint_id, constraint in self.constraints.items():
            if constraint.active:
                task = constraint.compute_gradient(design_variables, model_results)
                gradient_tasks.append((constraint_id, task))
        
        # 等待所有梯度计算完成
        for constraint_id, task in gradient_tasks:
            gradients = await task
            all_gradients[constraint_id] = gradients
            
            # 更新约束评估中的梯度信息
            if constraint_id in self.constraint_evaluations:
                self.constraint_evaluations[constraint_id].gradient = gradients
        
        return all_gradients
    
    def get_total_constraint_violation(self) -> float:
        """计算总约束违反度"""
        total_violation = 0.0
        
        for constraint_id, evaluation in self.constraint_evaluations.items():
            if evaluation.active:
                constraint = self.constraints[constraint_id]
                weighted_violation = evaluation.violation * constraint.weight
                total_violation += weighted_violation
        
        return total_violation
    
    def get_constraint_feasibility(self) -> bool:
        """检查约束可行性"""
        for evaluation in self.constraint_evaluations.values():
            if evaluation.active and not evaluation.feasible:
                return False
        return True
    
    def get_active_constraints(self) -> List[str]:
        """获取激活的约束列表"""
        active_constraints = []
        for constraint_id, evaluation in self.constraint_evaluations.items():
            if evaluation.active:
                active_constraints.append(constraint_id)
        return active_constraints
    
    def update_penalty_parameters(self, iteration: int):
        """更新惩罚参数"""
        # 自适应更新惩罚参数
        total_violation = self.get_total_constraint_violation()
        
        if total_violation > 1e-3:
            self.penalty_parameter = min(1e6, self.penalty_parameter * 1.1)
        else:
            self.penalty_parameter = max(1.0, self.penalty_parameter * 0.95)
        
        # 障碍参数更新
        self.barrier_parameter = max(1e-6, self.barrier_parameter * 0.95)
    
    def export_constraint_status(self) -> Dict:
        """导出约束状态"""
        status = {
            "total_constraints": len(self.constraints),
            "active_constraints": len(self.get_active_constraints()),
            "feasible": self.get_constraint_feasibility(),
            "total_violation": self.get_total_constraint_violation(),
            "penalty_parameter": self.penalty_parameter,
            "constraint_details": {}
        }
        
        for constraint_id, evaluation in self.constraint_evaluations.items():
            constraint = self.constraints[constraint_id]
            status["constraint_details"][constraint_id] = {
                "type": constraint.constraint_type.value,
                "category": constraint.category.value,
                "violation": evaluation.violation,
                "feasible": evaluation.feasible,
                "active": evaluation.active,
                "weight": constraint.weight,
                "target_value": constraint.target_value
            }
        
        return status
    
    def create_deep_excavation_constraints(self) -> List[BaseConstraint]:
        """创建深基坑工程标准约束"""
        constraints = []
        
        # 最大位移约束（25mm）
        disp_constraint = DisplacementConstraint(
            constraint_id="max_displacement",
            max_displacement=0.025,
            tolerance=1e-6,
            weight=1.0
        )
        constraints.append(disp_constraint)
        
        # 最大应力约束（200MPa）
        stress_constraint = StressConstraint(
            constraint_id="max_stress",
            max_stress=200e6,
            stress_type="von_mises",
            safety_factor=1.0,
            tolerance=1e6,
            weight=1.0
        )
        constraints.append(stress_constraint)
        
        # 整体稳定性约束（安全系数≥1.3）
        safety_constraint = SafetyConstraint(
            constraint_id="overall_stability",
            min_safety_factor=1.3,
            failure_mode="overall_stability",
            tolerance=0.01,
            weight=2.0
        )
        constraints.append(safety_constraint)
        
        # 局部稳定性约束（安全系数≥1.2）
        local_safety_constraint = SafetyConstraint(
            constraint_id="local_stability",
            min_safety_factor=1.2,
            failure_mode="local_stability",
            tolerance=0.01,
            weight=1.5
        )
        constraints.append(local_safety_constraint)
        
        return constraints

# 约束工厂类
class ConstraintFactory:
    """约束工厂"""
    
    @staticmethod
    def create_stress_constraint(constraint_id: str, max_stress: float,
                               stress_type: str = "von_mises") -> StressConstraint:
        """创建应力约束"""
        return StressConstraint(
            constraint_id=constraint_id,
            max_stress=max_stress,
            stress_type=stress_type,
            tolerance=max_stress * 0.01,
            weight=1.0
        )
    
    @staticmethod
    def create_displacement_constraint(constraint_id: str, max_displacement: float,
                                     node_ids: Optional[List] = None) -> DisplacementConstraint:
        """创建位移约束"""
        return DisplacementConstraint(
            constraint_id=constraint_id,
            max_displacement=max_displacement,
            node_ids=node_ids,
            tolerance=max_displacement * 0.01,
            weight=1.0
        )
    
    @staticmethod
    def create_volume_constraint(constraint_id: str, target_fraction: float) -> GeometryConstraint:
        """创建体积分数约束"""
        return GeometryConstraint(
            constraint_id=constraint_id,
            constraint_type=ConstraintType.EQUALITY,
            target_value=target_fraction,
            geometry_parameter="volume_fraction",
            tolerance=0.01,
            weight=1.0
        )
    
    @staticmethod
    def create_safety_constraint(constraint_id: str, min_safety_factor: float,
                               failure_mode: str = "overall_stability") -> SafetyConstraint:
        """创建安全约束"""
        return SafetyConstraint(
            constraint_id=constraint_id,
            min_safety_factor=min_safety_factor,
            failure_mode=failure_mode,
            tolerance=0.01,
            weight=2.0
        )

if __name__ == "__main__":
    # 测试示例
    async def test_constraint_manager():
        """约束管理器测试"""
        print("🔧 DeepCAD约束管理系统测试 🔧")
        
        # 创建约束管理器
        manager = ConstraintManager()
        
        # 添加深基坑标准约束
        constraints = manager.create_deep_excavation_constraints()
        for constraint in constraints:
            manager.add_constraint(constraint)
        
        # 模拟设计变量和模型结果
        design_variables = {
            "support_stiffness": 1e8,
            "excavation_depth": 8.0,
            "soil_modulus": 30e6
        }
        
        model_results = {
            "element_stresses": [
                [150e6, 120e6, 0, 10e6, 0, 0],  # 应力张量
                [180e6, 140e6, 0, 15e6, 0, 0]
            ],
            "node_displacements": {
                1: [0.020, 0.015, 0.005],  # 20mm位移
                2: [0.018, 0.012, 0.003]
            },
            "safety_analysis": {
                "overall_safety_factor": 1.35,
                "local_safety_factor": 1.25
            },
            "stress_sensitivities": {
                "support_stiffness": [-1e-6, -0.8e-6],
                "soil_modulus": [2e-6, 1.5e-6]
            },
            "displacement_sensitivities": {
                "support_stiffness": {1: [-1e-10, -0.8e-10, -0.2e-10]},
                "soil_modulus": {1: [1.5e-10, 1.2e-10, 0.3e-10]}
            }
        }
        
        # 评估所有约束
        evaluations = await manager.evaluate_all_constraints(design_variables, model_results)
        
        # 计算约束梯度
        gradients = await manager.compute_all_gradients(design_variables, model_results)
        
        # 输出结果
        print(f"总约束违反度: {manager.get_total_constraint_violation():.6f}")
        print(f"约束可行性: {manager.get_constraint_feasibility()}")
        print(f"激活约束数: {len(manager.get_active_constraints())}")
        
        # 导出约束状态
        status = manager.export_constraint_status()
        with open("constraint_status.json", 'w', encoding='utf-8') as f:
            json.dump(status, f, indent=2, ensure_ascii=False)
        
        print("约束状态已导出至 constraint_status.json")
    
    # 运行测试
    asyncio.run(test_constraint_manager())