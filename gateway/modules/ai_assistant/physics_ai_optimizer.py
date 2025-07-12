"""
物理AI优化模块
结合IoT数据、PDE约束和机器学习的智能优化系统
"""

import asyncio
import json
import numpy as np
import logging
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import pandas as pd
from datetime import datetime, timedelta
import pickle
import os
from pathlib import Path

# 尝试导入机器学习库
try:
    import scipy.optimize
    from scipy.interpolate import RBFInterpolator
    from scipy.integrate import solve_ivp
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    print("SciPy不可用 - 部分优化功能将受限")

try:
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.gaussian_process import GaussianProcessRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import mean_squared_error, r2_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    print("scikit-learn不可用 - 机器学习功能将受限")

logger = logging.getLogger(__name__)

class OptimizationType(Enum):
    """优化类型"""
    PARAMETER_TUNING = "parameter_tuning"      # 参数调优
    DESIGN_OPTIMIZATION = "design_optimization" # 设计优化
    MONITORING_PREDICTION = "monitoring_prediction" # 监测预测
    SAFETY_ASSESSMENT = "safety_assessment"    # 安全评估
    COST_OPTIMIZATION = "cost_optimization"    # 成本优化

class IoTDataType(Enum):
    """IoT数据类型"""
    DISPLACEMENT = "displacement"     # 位移监测
    STRESS = "stress"                # 应力监测
    PORE_PRESSURE = "pore_pressure"  # 孔隙水压力
    TEMPERATURE = "temperature"      # 温度
    HUMIDITY = "humidity"           # 湿度
    VIBRATION = "vibration"         # 振动
    LOAD = "load"                   # 荷载

@dataclass
class IoTSensorData:
    """IoT传感器数据"""
    sensor_id: str
    sensor_type: IoTDataType
    location: Dict[str, float]  # {"x": 0, "y": 0, "z": 0}
    timestamp: datetime
    value: float
    unit: str
    quality: float = 1.0  # 数据质量 0-1
    metadata: Optional[Dict[str, Any]] = None

@dataclass
class PDEConstraint:
    """偏微分方程约束"""
    name: str
    equation_type: str  # "diffusion", "wave", "elasticity", "seepage"
    domain: Dict[str, Any]
    boundary_conditions: List[Dict[str, Any]]
    parameters: Dict[str, float]
    tolerance: float = 1e-6

@dataclass
class OptimizationObjective:
    """优化目标"""
    name: str
    type: str  # "minimize", "maximize", "target"
    expression: str  # 目标函数表达式
    weight: float = 1.0
    target_value: Optional[float] = None

@dataclass
class DesignVariable:
    """设计变量"""
    name: str
    lower_bound: float
    upper_bound: float
    initial_value: float
    variable_type: str = "continuous"  # "continuous", "discrete", "integer"

@dataclass
class OptimizationResult:
    """优化结果"""
    success: bool
    optimal_values: Dict[str, float]
    objective_value: float
    convergence_history: List[float]
    computation_time: float
    iterations: int
    sensitivity_analysis: Optional[Dict[str, float]] = None
    confidence_interval: Optional[Dict[str, Tuple[float, float]]] = None

class PhysicsAIOptimizer:
    """物理AI优化器"""
    
    def __init__(self, work_dir: str = "./physics_ai_data"):
        self.work_dir = Path(work_dir)
        self.work_dir.mkdir(exist_ok=True)
        
        # 数据存储
        self.iot_data: List[IoTSensorData] = []
        self.pde_constraints: List[PDEConstraint] = []
        self.ml_models: Dict[str, Any] = {}
        self.optimization_history: List[OptimizationResult] = []
        
        # 初始化机器学习模型
        if SKLEARN_AVAILABLE:
            self._initialize_ml_models()
    
    def _initialize_ml_models(self):
        """初始化机器学习模型"""
        self.ml_models = {
            "displacement_predictor": RandomForestRegressor(n_estimators=100, random_state=42),
            "safety_classifier": GradientBoostingRegressor(n_estimators=100, random_state=42),
            "parameter_optimizer": GaussianProcessRegressor(random_state=42),
            "cost_estimator": RandomForestRegressor(n_estimators=50, random_state=42)
        }
        logger.info("机器学习模型初始化完成")
    
    async def add_iot_data(self, sensor_data: List[IoTSensorData]):
        """添加IoT传感器数据"""
        self.iot_data.extend(sensor_data)
        logger.info(f"添加了 {len(sensor_data)} 条IoT数据")
        
        # 自动触发数据质量检查
        await self._validate_iot_data()
        
        # 如果数据量足够，更新机器学习模型
        if len(self.iot_data) > 100:
            await self._update_ml_models()
    
    async def _validate_iot_data(self):
        """验证IoT数据质量"""
        if not self.iot_data:
            return
        
        # 检查数据时间序列连续性
        df = pd.DataFrame([{
            'timestamp': data.timestamp,
            'sensor_id': data.sensor_id,
            'value': data.value,
            'quality': data.quality
        } for data in self.iot_data])
        
        # 标记异常数据
        for sensor_id in df['sensor_id'].unique():
            sensor_data = df[df['sensor_id'] == sensor_id].sort_values('timestamp')
            
            # 检查数值异常
            Q1 = sensor_data['value'].quantile(0.25)
            Q3 = sensor_data['value'].quantile(0.75)
            IQR = Q3 - Q1
            outlier_mask = (sensor_data['value'] < Q1 - 1.5 * IQR) | (sensor_data['value'] > Q3 + 1.5 * IQR)
            
            if outlier_mask.any():
                logger.warning(f"传感器 {sensor_id} 检测到 {outlier_mask.sum()} 个异常值")
    
    async def _update_ml_models(self):
        """更新机器学习模型"""
        if not SKLEARN_AVAILABLE or not self.iot_data:
            return
        
        try:
            # 准备训练数据
            df = pd.DataFrame([{
                'sensor_type': data.sensor_type.value,
                'x': data.location.get('x', 0),
                'y': data.location.get('y', 0),
                'z': data.location.get('z', 0),
                'value': data.value,
                'quality': data.quality,
                'hour': data.timestamp.hour,
                'day': data.timestamp.day,
                'month': data.timestamp.month
            } for data in self.iot_data])
            
            # 特征工程
            feature_columns = ['x', 'y', 'z', 'hour', 'day', 'month', 'quality']
            
            # 为不同类型的传感器训练模型
            for sensor_type in df['sensor_type'].unique():
                sensor_df = df[df['sensor_type'] == sensor_type]
                
                if len(sensor_df) < 50:  # 数据量不足
                    continue
                
                X = sensor_df[feature_columns]
                y = sensor_df['value']
                
                # 分割训练集和测试集
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, test_size=0.2, random_state=42
                )
                
                # 标准化
                scaler = StandardScaler()
                X_train_scaled = scaler.fit_transform(X_train)
                X_test_scaled = scaler.transform(X_test)
                
                # 训练模型
                model = RandomForestRegressor(n_estimators=100, random_state=42)
                model.fit(X_train_scaled, y_train)
                
                # 评估模型
                y_pred = model.predict(X_test_scaled)
                r2 = r2_score(y_test, y_pred)
                
                # 保存模型和标准化器
                model_key = f"{sensor_type}_predictor"
                self.ml_models[model_key] = {
                    'model': model,
                    'scaler': scaler,
                    'r2_score': r2,
                    'last_updated': datetime.now()
                }
                
                logger.info(f"更新了 {sensor_type} 预测模型，R² = {r2:.4f}")
        
        except Exception as e:
            logger.error(f"更新机器学习模型失败: {str(e)}")
    
    def add_pde_constraint(self, constraint: PDEConstraint):
        """添加PDE约束"""
        self.pde_constraints.append(constraint)
        logger.info(f"添加PDE约束: {constraint.name}")
    
    async def solve_pde_constraint(self, constraint: PDEConstraint) -> Dict[str, Any]:
        """求解PDE约束"""
        if not SCIPY_AVAILABLE:
            raise RuntimeError("SciPy不可用，无法求解PDE约束")
        
        try:
            if constraint.equation_type == "diffusion":
                return await self._solve_diffusion_equation(constraint)
            elif constraint.equation_type == "elasticity":
                return await self._solve_elasticity_equation(constraint)
            elif constraint.equation_type == "seepage":
                return await self._solve_seepage_equation(constraint)
            else:
                raise ValueError(f"不支持的PDE类型: {constraint.equation_type}")
        
        except Exception as e:
            logger.error(f"求解PDE约束失败: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _solve_diffusion_equation(self, constraint: PDEConstraint) -> Dict[str, Any]:
        """求解扩散方程"""
        # 简化的1D扩散方程求解
        def diffusion_ode(t, y, D):
            # ∂u/∂t = D * ∂²u/∂x²
            dydt = np.zeros_like(y)
            n = len(y)
            dx = 1.0 / (n - 1)
            
            for i in range(1, n-1):
                dydt[i] = D * (y[i+1] - 2*y[i] + y[i-1]) / (dx**2)
            
            return dydt
        
        # 初始条件
        n_points = 100
        y0 = np.zeros(n_points)
        y0[n_points//2] = 1.0  # 中心点初始值
        
        # 求解参数
        D = constraint.parameters.get('diffusion_coefficient', 0.1)
        t_span = (0, constraint.parameters.get('end_time', 1.0))
        
        # 求解ODE
        sol = solve_ivp(
            lambda t, y: diffusion_ode(t, y, D),
            t_span,
            y0,
            dense_output=True,
            rtol=constraint.tolerance
        )
        
        return {
            "success": sol.success,
            "solution": sol.y.tolist(),
            "times": sol.t.tolist(),
            "message": sol.message
        }
    
    async def _solve_elasticity_equation(self, constraint: PDEConstraint) -> Dict[str, Any]:
        """求解弹性力学方程（简化版）"""
        # 简化的弹性力学问题
        # 这里实现一个简单的1D杆件拉伸问题
        
        E = constraint.parameters.get('elastic_modulus', 210e9)  # 弹性模量
        A = constraint.parameters.get('cross_section_area', 0.01)  # 截面积
        L = constraint.parameters.get('length', 1.0)  # 长度
        F = constraint.parameters.get('applied_force', 1000)  # 外力
        
        # 解析解：δ = FL/(EA)
        displacement = F * L / (E * A)
        stress = F / A
        
        return {
            "success": True,
            "displacement": displacement,
            "stress": stress,
            "solution_type": "analytical"
        }
    
    async def _solve_seepage_equation(self, constraint: PDEConstraint) -> Dict[str, Any]:
        """求解渗流方程"""
        # Darcy's law: v = -k * ∇h
        # 连续性方程: ∇ · v = 0
        # 结合: ∇ · (k * ∇h) = 0
        
        k = constraint.parameters.get('permeability', 1e-5)  # 渗透系数
        h_inlet = constraint.parameters.get('inlet_head', 10.0)  # 入口水头
        h_outlet = constraint.parameters.get('outlet_head', 0.0)  # 出口水头
        length = constraint.parameters.get('length', 1.0)  # 长度
        
        # 1D稳态渗流的解析解
        n_points = 100
        x = np.linspace(0, length, n_points)
        h = h_inlet - (h_inlet - h_outlet) * x / length
        
        # 渗流速度
        v = -k * (h_outlet - h_inlet) / length
        
        return {
            "success": True,
            "head_distribution": h.tolist(),
            "positions": x.tolist(),
            "seepage_velocity": v,
            "flow_rate": v * constraint.parameters.get('cross_section_area', 1.0)
        }
    
    async def optimize_design(self,
                            objectives: List[OptimizationObjective],
                            design_variables: List[DesignVariable],
                            constraints: Optional[List[PDEConstraint]] = None,
                            optimization_type: OptimizationType = OptimizationType.DESIGN_OPTIMIZATION) -> OptimizationResult:
        """设计优化"""
        
        if not SCIPY_AVAILABLE:
            raise RuntimeError("SciPy不可用，无法进行优化")
        
        start_time = datetime.now()
        
        try:
            # 准备优化问题
            x0 = [var.initial_value for var in design_variables]
            bounds = [(var.lower_bound, var.upper_bound) for var in design_variables]
            
            # 目标函数
            def objective_function(x):
                var_dict = {var.name: x[i] for i, var in enumerate(design_variables)}
                
                total_objective = 0.0
                for obj in objectives:
                    value = self._evaluate_objective(obj, var_dict)
                    if obj.type == "minimize":
                        total_objective += obj.weight * value
                    elif obj.type == "maximize":
                        total_objective -= obj.weight * value
                    elif obj.type == "target" and obj.target_value is not None:
                        total_objective += obj.weight * (value - obj.target_value)**2
                
                return total_objective
            
            # 约束函数
            constraint_functions = []
            if constraints:
                for constraint in constraints:
                    def constraint_func(x, constraint=constraint):
                        # 简化的约束检查
                        return self._evaluate_constraint(constraint, 
                                                       {var.name: x[i] for i, var in enumerate(design_variables)})
                    constraint_functions.append({'type': 'ineq', 'fun': constraint_func})
            
            # 优化历史记录
            optimization_history = []
            
            def callback(x):
                optimization_history.append(objective_function(x))
            
            # 执行优化
            result = scipy.optimize.minimize(
                objective_function,
                x0,
                method='SLSQP',
                bounds=bounds,
                constraints=constraint_functions if constraint_functions else None,
                callback=callback,
                options={'maxiter': 1000, 'ftol': 1e-9}
            )
            
            # 敏感性分析
            sensitivity = await self._perform_sensitivity_analysis(
                objective_function, result.x, design_variables
            )
            
            # 构建结果
            optimal_values = {var.name: result.x[i] for i, var in enumerate(design_variables)}
            
            optimization_result = OptimizationResult(
                success=result.success,
                optimal_values=optimal_values,
                objective_value=result.fun,
                convergence_history=optimization_history,
                computation_time=(datetime.now() - start_time).total_seconds(),
                iterations=result.nit,
                sensitivity_analysis=sensitivity
            )
            
            # 保存结果
            self.optimization_history.append(optimization_result)
            await self._save_optimization_result(optimization_result)
            
            return optimization_result
        
        except Exception as e:
            logger.error(f"设计优化失败: {str(e)}")
            return OptimizationResult(
                success=False,
                optimal_values={},
                objective_value=float('inf'),
                convergence_history=[],
                computation_time=(datetime.now() - start_time).total_seconds(),
                iterations=0
            )
    
    def _evaluate_objective(self, objective: OptimizationObjective, variables: Dict[str, float]) -> float:
        """评估目标函数"""
        try:
            # 简化的目标函数评估
            # 在实际应用中，这里会调用复杂的仿真或分析函数
            
            if "displacement" in objective.expression:
                # 位移目标
                return sum(variables.values()) * 0.1  # 简化计算
            elif "stress" in objective.expression:
                # 应力目标
                return sum(v**2 for v in variables.values()) * 0.01
            elif "cost" in objective.expression:
                # 成本目标
                return sum(v * 100 for v in variables.values())
            else:
                # 默认计算
                return sum(variables.values())
        
        except Exception as e:
            logger.warning(f"目标函数评估失败: {str(e)}")
            return float('inf')
    
    def _evaluate_constraint(self, constraint: PDEConstraint, variables: Dict[str, float]) -> float:
        """评估约束条件"""
        try:
            # 简化的约束评估
            # 返回值 > 0 表示约束满足，< 0 表示约束违反
            
            if constraint.equation_type == "elasticity":
                # 应力约束
                stress_limit = constraint.parameters.get('stress_limit', 250e6)
                current_stress = sum(v**2 for v in variables.values()) * 1e6
                return stress_limit - current_stress
            
            elif constraint.equation_type == "displacement":
                # 位移约束
                displacement_limit = constraint.parameters.get('displacement_limit', 0.01)
                current_displacement = sum(variables.values()) * 0.001
                return displacement_limit - current_displacement
            
            else:
                return 1.0  # 默认满足约束
        
        except Exception as e:
            logger.warning(f"约束评估失败: {str(e)}")
            return -1.0  # 约束违反
    
    async def _perform_sensitivity_analysis(self,
                                          objective_function,
                                          optimal_point: np.ndarray,
                                          design_variables: List[DesignVariable]) -> Dict[str, float]:
        """执行敏感性分析"""
        sensitivity = {}
        base_value = objective_function(optimal_point)
        
        for i, var in enumerate(design_variables):
            # 计算数值梯度
            delta = abs(optimal_point[i] * 0.01) or 0.01
            
            x_plus = optimal_point.copy()
            x_plus[i] += delta
            
            x_minus = optimal_point.copy()
            x_minus[i] -= delta
            
            gradient = (objective_function(x_plus) - objective_function(x_minus)) / (2 * delta)
            sensitivity[var.name] = gradient
        
        return sensitivity
    
    async def predict_iot_value(self,
                               sensor_type: IoTDataType,
                               location: Dict[str, float],
                               timestamp: datetime) -> Optional[float]:
        """预测IoT传感器值"""
        if not SKLEARN_AVAILABLE:
            return None
        
        model_key = f"{sensor_type.value}_predictor"
        if model_key not in self.ml_models:
            return None
        
        try:
            model_data = self.ml_models[model_key]
            model = model_data['model']
            scaler = model_data['scaler']
            
            # 准备预测数据
            features = np.array([[
                location.get('x', 0),
                location.get('y', 0),
                location.get('z', 0),
                timestamp.hour,
                timestamp.day,
                timestamp.month,
                1.0  # 假设质量为1.0
            ]])
            
            # 标准化
            features_scaled = scaler.transform(features)
            
            # 预测
            prediction = model.predict(features_scaled)[0]
            
            return prediction
        
        except Exception as e:
            logger.error(f"IoT值预测失败: {str(e)}")
            return None
    
    async def assess_safety_status(self, current_data: Dict[str, float]) -> Dict[str, Any]:
        """评估安全状态"""
        try:
            safety_score = 1.0
            warnings = []
            
            # 基于IoT数据的安全评估
            for sensor_data in self.iot_data[-100:]:  # 最近100条数据
                if sensor_data.sensor_type == IoTDataType.DISPLACEMENT:
                    if sensor_data.value > 0.05:  # 5cm位移警告
                        safety_score *= 0.8
                        warnings.append(f"位移过大: {sensor_data.value:.3f}m")
                
                elif sensor_data.sensor_type == IoTDataType.STRESS:
                    if sensor_data.value > 200e6:  # 200MPa应力警告
                        safety_score *= 0.7
                        warnings.append(f"应力过高: {sensor_data.value/1e6:.1f}MPa")
            
            # 基于PDE约束的安全评估
            for constraint in self.pde_constraints:
                constraint_result = await self.solve_pde_constraint(constraint)
                if not constraint_result.get("success", False):
                    safety_score *= 0.6
                    warnings.append(f"约束违反: {constraint.name}")
            
            # 安全等级
            if safety_score >= 0.9:
                safety_level = "安全"
                color = "green"
            elif safety_score >= 0.7:
                safety_level = "注意"
                color = "yellow"
            elif safety_score >= 0.5:
                safety_level = "警告"
                color = "orange"
            else:
                safety_level = "危险"
                color = "red"
            
            return {
                "safety_score": safety_score,
                "safety_level": safety_level,
                "color": color,
                "warnings": warnings,
                "recommendations": self._generate_safety_recommendations(safety_score, warnings),
                "timestamp": datetime.now().isoformat()
            }
        
        except Exception as e:
            logger.error(f"安全状态评估失败: {str(e)}")
            return {
                "safety_score": 0.0,
                "safety_level": "未知",
                "color": "gray",
                "warnings": [f"评估失败: {str(e)}"],
                "recommendations": [],
                "timestamp": datetime.now().isoformat()
            }
    
    def _generate_safety_recommendations(self, safety_score: float, warnings: List[str]) -> List[str]:
        """生成安全建议"""
        recommendations = []
        
        if safety_score < 0.5:
            recommendations.append("立即停止施工，进行全面安全检查")
            recommendations.append("增加监测点密度，提高监测频率")
        elif safety_score < 0.7:
            recommendations.append("加强监测，准备应急预案")
            recommendations.append("检查关键结构部位")
        elif safety_score < 0.9:
            recommendations.append("继续密切监测")
            recommendations.append("定期检查设备状态")
        
        # 基于具体警告的建议
        for warning in warnings:
            if "位移" in warning:
                recommendations.append("检查支护结构，考虑加固措施")
            elif "应力" in warning:
                recommendations.append("检查荷载分布，必要时减载")
        
        return list(set(recommendations))  # 去重
    
    async def _save_optimization_result(self, result: OptimizationResult):
        """保存优化结果"""
        try:
            result_file = self.work_dir / f"optimization_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            with open(result_file, 'w', encoding='utf-8') as f:
                json.dump(asdict(result), f, indent=2, ensure_ascii=False, default=str)
            
            logger.info(f"优化结果已保存: {result_file}")
        
        except Exception as e:
            logger.error(f"保存优化结果失败: {str(e)}")
    
    async def export_models(self) -> str:
        """导出训练好的模型"""
        if not SKLEARN_AVAILABLE:
            raise RuntimeError("scikit-learn不可用")
        
        try:
            models_file = self.work_dir / "ml_models.pkl"
            
            with open(models_file, 'wb') as f:
                pickle.dump(self.ml_models, f)
            
            logger.info(f"机器学习模型已导出: {models_file}")
            return str(models_file)
        
        except Exception as e:
            logger.error(f"导出模型失败: {str(e)}")
            raise
    
    async def import_models(self, models_file: str):
        """导入训练好的模型"""
        if not SKLEARN_AVAILABLE:
            raise RuntimeError("scikit-learn不可用")
        
        try:
            with open(models_file, 'rb') as f:
                self.ml_models = pickle.load(f)
            
            logger.info(f"机器学习模型已导入: {models_file}")
        
        except Exception as e:
            logger.error(f"导入模型失败: {str(e)}")
            raise

# 全局优化器实例
physics_ai_optimizer = PhysicsAIOptimizer()

def get_physics_ai_optimizer() -> PhysicsAIOptimizer:
    """获取物理AI优化器实例"""
    return physics_ai_optimizer