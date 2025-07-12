"""
物理AI优化模块API路由
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from .physics_ai_optimizer import (
    get_physics_ai_optimizer,
    IoTSensorData, IoTDataType, PDEConstraint,
    OptimizationObjective, DesignVariable, OptimizationType
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/physics-ai", tags=["物理AI优化"])

# Pydantic模型
class IoTSensorDataRequest(BaseModel):
    sensor_id: str = Field(..., description="传感器ID")
    sensor_type: str = Field(..., description="传感器类型")
    location: Dict[str, float] = Field(..., description="传感器位置")
    timestamp: datetime = Field(..., description="时间戳")
    value: float = Field(..., description="测量值")
    unit: str = Field(..., description="单位")
    quality: float = Field(1.0, ge=0, le=1, description="数据质量")
    metadata: Optional[Dict[str, Any]] = Field(None, description="元数据")

class PDEConstraintRequest(BaseModel):
    name: str = Field(..., description="约束名称")
    equation_type: str = Field(..., description="方程类型")
    domain: Dict[str, Any] = Field(..., description="求解域")
    boundary_conditions: List[Dict[str, Any]] = Field(..., description="边界条件")
    parameters: Dict[str, float] = Field(..., description="方程参数")
    tolerance: float = Field(1e-6, description="求解精度")

class OptimizationObjectiveRequest(BaseModel):
    name: str = Field(..., description="目标名称")
    type: str = Field(..., description="目标类型")
    expression: str = Field(..., description="目标表达式")
    weight: float = Field(1.0, description="权重")
    target_value: Optional[float] = Field(None, description="目标值")

class DesignVariableRequest(BaseModel):
    name: str = Field(..., description="变量名称")
    lower_bound: float = Field(..., description="下界")
    upper_bound: float = Field(..., description="上界")
    initial_value: float = Field(..., description="初值")
    variable_type: str = Field("continuous", description="变量类型")

class OptimizationRequest(BaseModel):
    objectives: List[OptimizationObjectiveRequest] = Field(..., description="优化目标")
    design_variables: List[DesignVariableRequest] = Field(..., description="设计变量")
    optimization_type: str = Field("design_optimization", description="优化类型")
    constraints: Optional[List[PDEConstraintRequest]] = Field(None, description="约束条件")

class PredictionRequest(BaseModel):
    sensor_type: str = Field(..., description="传感器类型")
    location: Dict[str, float] = Field(..., description="位置")
    timestamp: datetime = Field(..., description="预测时间")

@router.get("/status")
async def get_physics_ai_status():
    """获取物理AI优化器状态"""
    optimizer = get_physics_ai_optimizer()
    
    return {
        "service": "物理AI优化器",
        "status": "operational",
        "iot_data_count": len(optimizer.iot_data),
        "pde_constraints_count": len(optimizer.pde_constraints),
        "ml_models_count": len(optimizer.ml_models),
        "optimization_history_count": len(optimizer.optimization_history),
        "capabilities": [
            "iot_data_processing",
            "pde_constraint_solving", 
            "ml_prediction",
            "design_optimization",
            "safety_assessment"
        ]
    }

@router.post("/iot-data/add")
async def add_iot_data(sensor_data_list: List[IoTSensorDataRequest]):
    """添加IoT传感器数据"""
    try:
        optimizer = get_physics_ai_optimizer()
        
        # 转换数据格式
        iot_data = []
        for data_req in sensor_data_list:
            try:
                sensor_type = IoTDataType(data_req.sensor_type)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"不支持的传感器类型: {data_req.sensor_type}")
            
            sensor_data = IoTSensorData(
                sensor_id=data_req.sensor_id,
                sensor_type=sensor_type,
                location=data_req.location,
                timestamp=data_req.timestamp,
                value=data_req.value,
                unit=data_req.unit,
                quality=data_req.quality,
                metadata=data_req.metadata
            )
            iot_data.append(sensor_data)
        
        # 添加数据
        await optimizer.add_iot_data(iot_data)
        
        return {
            "status": "success",
            "message": f"成功添加 {len(iot_data)} 条IoT数据",
            "total_data_count": len(optimizer.iot_data)
        }
    
    except Exception as e:
        logger.error(f"添加IoT数据失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"添加IoT数据失败: {str(e)}")

@router.get("/iot-data/summary")
async def get_iot_data_summary():
    """获取IoT数据摘要"""
    optimizer = get_physics_ai_optimizer()
    
    if not optimizer.iot_data:
        return {
            "total_count": 0,
            "sensor_types": [],
            "sensors": [],
            "time_range": None
        }
    
    # 统计数据
    sensor_types = {}
    sensors = set()
    timestamps = []
    
    for data in optimizer.iot_data:
        sensor_type = data.sensor_type.value
        sensor_types[sensor_type] = sensor_types.get(sensor_type, 0) + 1
        sensors.add(data.sensor_id)
        timestamps.append(data.timestamp)
    
    timestamps.sort()
    
    return {
        "total_count": len(optimizer.iot_data),
        "sensor_types": sensor_types,
        "sensors": list(sensors),
        "time_range": {
            "start": timestamps[0].isoformat(),
            "end": timestamps[-1].isoformat()
        } if timestamps else None
    }

@router.post("/pde-constraint/add")
async def add_pde_constraint(constraint_req: PDEConstraintRequest):
    """添加PDE约束"""
    try:
        optimizer = get_physics_ai_optimizer()
        
        constraint = PDEConstraint(
            name=constraint_req.name,
            equation_type=constraint_req.equation_type,
            domain=constraint_req.domain,
            boundary_conditions=constraint_req.boundary_conditions,
            parameters=constraint_req.parameters,
            tolerance=constraint_req.tolerance
        )
        
        optimizer.add_pde_constraint(constraint)
        
        return {
            "status": "success",
            "message": f"成功添加PDE约束: {constraint.name}",
            "total_constraints": len(optimizer.pde_constraints)
        }
    
    except Exception as e:
        logger.error(f"添加PDE约束失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"添加PDE约束失败: {str(e)}")

@router.post("/pde-constraint/{constraint_name}/solve")
async def solve_pde_constraint(constraint_name: str):
    """求解指定的PDE约束"""
    try:
        optimizer = get_physics_ai_optimizer()
        
        # 查找约束
        constraint = None
        for c in optimizer.pde_constraints:
            if c.name == constraint_name:
                constraint = c
                break
        
        if not constraint:
            raise HTTPException(status_code=404, detail=f"未找到约束: {constraint_name}")
        
        # 求解约束
        result = await optimizer.solve_pde_constraint(constraint)
        
        return {
            "constraint_name": constraint_name,
            "result": result
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"求解PDE约束失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"求解PDE约束失败: {str(e)}")

@router.post("/optimization/start")
async def start_optimization(optimization_req: OptimizationRequest, background_tasks: BackgroundTasks):
    """启动设计优化"""
    try:
        optimizer = get_physics_ai_optimizer()
        
        # 转换优化类型
        try:
            opt_type = OptimizationType(optimization_req.optimization_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"不支持的优化类型: {optimization_req.optimization_type}")
        
        # 转换目标函数
        objectives = []
        for obj_req in optimization_req.objectives:
            objective = OptimizationObjective(
                name=obj_req.name,
                type=obj_req.type,
                expression=obj_req.expression,
                weight=obj_req.weight,
                target_value=obj_req.target_value
            )
            objectives.append(objective)
        
        # 转换设计变量
        design_variables = []
        for var_req in optimization_req.design_variables:
            variable = DesignVariable(
                name=var_req.name,
                lower_bound=var_req.lower_bound,
                upper_bound=var_req.upper_bound,
                initial_value=var_req.initial_value,
                variable_type=var_req.variable_type
            )
            design_variables.append(variable)
        
        # 转换约束
        constraints = None
        if optimization_req.constraints:
            constraints = []
            for const_req in optimization_req.constraints:
                constraint = PDEConstraint(
                    name=const_req.name,
                    equation_type=const_req.equation_type,
                    domain=const_req.domain,
                    boundary_conditions=const_req.boundary_conditions,
                    parameters=const_req.parameters,
                    tolerance=const_req.tolerance
                )
                constraints.append(constraint)
        
        # 启动后台优化任务
        async def run_optimization():
            result = await optimizer.optimize_design(
                objectives=objectives,
                design_variables=design_variables,
                constraints=constraints,
                optimization_type=opt_type
            )
            logger.info(f"优化完成: {result.success}, 目标值: {result.objective_value}")
        
        background_tasks.add_task(run_optimization)
        
        return {
            "status": "started",
            "message": "优化任务已启动",
            "objectives_count": len(objectives),
            "variables_count": len(design_variables),
            "constraints_count": len(constraints) if constraints else 0
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"启动优化失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"启动优化失败: {str(e)}")

@router.get("/optimization/history")
async def get_optimization_history():
    """获取优化历史"""
    optimizer = get_physics_ai_optimizer()
    
    history = []
    for result in optimizer.optimization_history:
        history.append({
            "success": result.success,
            "objective_value": result.objective_value,
            "computation_time": result.computation_time,
            "iterations": result.iterations,
            "optimal_values": result.optimal_values,
            "has_sensitivity_analysis": result.sensitivity_analysis is not None
        })
    
    return {
        "total_optimizations": len(history),
        "history": history
    }

@router.post("/predict")
async def predict_iot_value(prediction_req: PredictionRequest):
    """预测IoT传感器值"""
    try:
        optimizer = get_physics_ai_optimizer()
        
        # 转换传感器类型
        try:
            sensor_type = IoTDataType(prediction_req.sensor_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"不支持的传感器类型: {prediction_req.sensor_type}")
        
        # 进行预测
        prediction = await optimizer.predict_iot_value(
            sensor_type=sensor_type,
            location=prediction_req.location,
            timestamp=prediction_req.timestamp
        )
        
        if prediction is None:
            return {
                "success": False,
                "message": "预测失败，可能是模型未训练或数据不足"
            }
        
        return {
            "success": True,
            "prediction": prediction,
            "sensor_type": prediction_req.sensor_type,
            "location": prediction_req.location,
            "timestamp": prediction_req.timestamp.isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"IoT值预测失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"IoT值预测失败: {str(e)}")

@router.get("/safety/assessment")
async def assess_safety_status():
    """评估当前安全状态"""
    try:
        optimizer = get_physics_ai_optimizer()
        
        # 获取最新的IoT数据作为当前状态
        current_data = {}
        if optimizer.iot_data:
            latest_data = optimizer.iot_data[-10:]  # 最近10条数据
            for data in latest_data:
                current_data[f"{data.sensor_type.value}_{data.sensor_id}"] = data.value
        
        # 执行安全评估
        safety_result = await optimizer.assess_safety_status(current_data)
        
        return safety_result
    
    except Exception as e:
        logger.error(f"安全状态评估失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"安全状态评估失败: {str(e)}")

@router.get("/models/export")
async def export_ml_models():
    """导出机器学习模型"""
    try:
        optimizer = get_physics_ai_optimizer()
        models_file = await optimizer.export_models()
        
        return {
            "status": "success",
            "message": "模型导出成功",
            "file_path": models_file
        }
    
    except Exception as e:
        logger.error(f"导出模型失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"导出模型失败: {str(e)}")

@router.post("/models/import")
async def import_ml_models(models_file: str):
    """导入机器学习模型"""
    try:
        optimizer = get_physics_ai_optimizer()
        await optimizer.import_models(models_file)
        
        return {
            "status": "success",
            "message": "模型导入成功"
        }
    
    except Exception as e:
        logger.error(f"导入模型失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"导入模型失败: {str(e)}")

@router.get("/health")
async def physics_ai_health_check():
    """物理AI模块健康检查"""
    optimizer = get_physics_ai_optimizer()
    
    return {
        "service": "物理AI优化模块",
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "data_status": {
            "iot_data_available": len(optimizer.iot_data) > 0,
            "ml_models_available": len(optimizer.ml_models) > 0,
            "pde_constraints_available": len(optimizer.pde_constraints) > 0
        },
        "capabilities_status": {
            "prediction": len(optimizer.ml_models) > 0,
            "optimization": True,  # 总是可用（基于数学优化）
            "pde_solving": True,   # 基于SciPy
            "safety_assessment": True
        }
    }