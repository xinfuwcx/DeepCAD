#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file test_physics_ai_system.py
@description 物理AI系统集成测试
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import time
import datetime
import logging
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

# 导入物理AI系统
from src.ai.physics_ai_system import PhysicsAISystem

# 导入IoT数据模块
from src.ai.iot_data_collector import (
    SimulatedIoTDataCollector,
    SensorType,
    SensorStatus
)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("PhysicsAISystemTest")

def generate_test_data(project_id: int = 1, duration: int = 60):
    """生成测试数据"""
    logger.info("生成测试数据...")
    
    # 创建模拟IoT数据采集器
    collector = SimulatedIoTDataCollector(
        project_id=project_id,
        sampling_interval=1,  # 1秒采样一次
        noise_level=0.02
    )
    
    # 注册位移传感器
    for i in range(5):
        x = 10.0 + i * 5.0
        y = 20.0
        z = 0.0
        
        collector.register_sensor(
            sensor_id=f"disp_{i+1:02d}",
            sensor_type=SensorType.DISPLACEMENT,
            location=[x, y, z],
            description=f"位移传感器{i+1}",
            base_value=0.0,
            trend="linear",
            parameters={"rate": 0.001 * (i+1)}  # 不同的增长率
        )
    
    # 注册应力传感器
    for i in range(3):
        x = 10.0 + i * 10.0
        y = 15.0
        z = 0.0
        
        collector.register_sensor(
            sensor_id=f"stress_{i+1:02d}",
            sensor_type=SensorType.STRESS,
            location=[x, y, z],
            description=f"应力传感器{i+1}",
            base_value=100.0,
            trend="linear",
            parameters={"rate": 0.05 * (i+1)}  # 不同的增长率
        )
    
    # 注册温度传感器
    collector.register_sensor(
        sensor_id="temp_01",
        sensor_type=SensorType.TEMPERATURE,
        location=[15.0, 15.0, 0.0],
        description="温度传感器1",
        base_value=25.0,
        trend="sine",
        parameters={"amplitude": 2.0, "period": 60}  # 振幅2度，周期60秒
    )
    
    # 开始采集数据
    logger.info(f"开始采集数据，持续{duration}秒...")
    collector.start_collection(duration=duration)
    logger.info("数据采集完成")
    
    return True

def test_inverse_analysis(system: PhysicsAISystem):
    """测试参数反演分析"""
    logger.info("测试参数反演分析...")
    
    # 获取今天的日期
    today = datetime.datetime.now().strftime("%Y%m%d")
    
    # 提交反演分析任务
    task_id = system.submit_task(
        "inverse_analysis",
        data_type=SensorType.DISPLACEMENT,
        start_date=today,
        pde_type="elasticity",
        initial_params={
            "youngs_modulus": 30000,  # 初始弹性模量
            "poisson_ratio": 0.3      # 初始泊松比
        },
        max_iter=5  # 为了快速测试，使用较小的迭代次数
    )
    
    logger.info(f"提交反演分析任务: {task_id}")
    
    # 等待任务完成
    while True:
        status = system.get_task_status(task_id)
        logger.info(f"任务状态: {status['status']}, 进度: {status.get('progress', 0)}%")
        
        if status["status"] in ["completed", "failed"]:
            break
        
        time.sleep(1)
    
    # 检查结果
    if status["status"] == "completed":
        result = status.get("result", {})
        logger.info(f"反演分析完成: {result}")
        return True
    else:
        logger.error(f"反演分析失败: {status.get('error', '未知错误')}")
        return False

def test_pinn_training(system: PhysicsAISystem):
    """测试PINN模型训练"""
    logger.info("测试PINN模型训练...")
    
    # 获取今天的日期
    today = datetime.datetime.now().strftime("%Y%m%d")
    
    # 提交PINN训练任务
    task_id = system.submit_task(
        "pinn_training",
        data_type=SensorType.DISPLACEMENT,
        start_date=today,
        model_type="elasticity",
        iterations=100  # 为了快速测试，使用较小的迭代次数
    )
    
    logger.info(f"提交PINN训练任务: {task_id}")
    
    # 等待任务完成
    while True:
        status = system.get_task_status(task_id)
        logger.info(f"任务状态: {status['status']}, 进度: {status.get('progress', 0)}%")
        
        if status["status"] in ["completed", "failed"]:
            break
        
        time.sleep(1)
    
    # 检查结果
    if status["status"] == "completed":
        result = status.get("result", {})
        logger.info(f"PINN训练完成: {result}")
        return True
    else:
        logger.error(f"PINN训练失败: {status.get('error', '未知错误')}")
        return False

def test_data_fusion(system: PhysicsAISystem):
    """测试数据融合"""
    logger.info("测试数据融合...")
    
    # 获取今天的日期
    today = datetime.datetime.now().strftime("%Y%m%d")
    
    # 提交数据融合任务
    task_id = system.submit_task(
        "data_fusion",
        sensor_types=[SensorType.DISPLACEMENT, SensorType.STRESS],
        start_date=today,
        fusion_method="weighted_average",
        weights={
            SensorType.DISPLACEMENT.value: 0.7,
            SensorType.STRESS.value: 0.3
        }
    )
    
    logger.info(f"提交数据融合任务: {task_id}")
    
    # 等待任务完成
    while True:
        status = system.get_task_status(task_id)
        logger.info(f"任务状态: {status['status']}, 进度: {status.get('progress', 0)}%")
        
        if status["status"] in ["completed", "failed"]:
            break
        
        time.sleep(1)
    
    # 检查结果
    if status["status"] == "completed":
        result = status.get("result", {})
        logger.info(f"数据融合完成: {result}")
        return True
    else:
        logger.error(f"数据融合失败: {status.get('error', '未知错误')}")
        return False

def test_integrated_analysis(system: PhysicsAISystem):
    """测试集成分析"""
    logger.info("测试集成分析...")
    
    # 获取今天的日期
    today = datetime.datetime.now().strftime("%Y%m%d")
    
    # 准备模型文件（示例）
    model_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 
                             "data", "mesh", "simple_box.msh")
    
    # 如果模型文件不存在，则跳过此测试
    if not os.path.exists(model_file):
        logger.warning(f"模型文件不存在: {model_file}, 跳过集成分析测试")
        return None
    
    # 传感器数据配置
    sensor_data_config = {
        "sensor_types": [SensorType.DISPLACEMENT, SensorType.STRESS],
        "start_date": today,
        "fusion_method": "weighted_average",
        "weights": {
            SensorType.DISPLACEMENT.value: 0.7,
            SensorType.STRESS.value: 0.3
        }
    }
    
    # PINN配置
    pinn_config = {
        "data_type": SensorType.DISPLACEMENT,
        "start_date": today,
        "pde_type": "elasticity",
        "model_type": "elasticity",
        "initial_params": {
            "youngs_modulus": 30000,
            "poisson_ratio": 0.3
        },
        "iterations": 100,  # 为了快速测试，使用较小的迭代次数
        "max_iter": 5       # 为了快速测试，使用较小的迭代次数
    }
    
    # CAE配置
    cae_config = {
        "analysis_type": "static",
        "material_params": {
            "soil": {
                "youngs_modulus": 30000,
                "poisson_ratio": 0.3,
                "density": 1800
            }
        },
        "boundary_conditions": {
            "bottom": {"type": "fixed", "nodes": "bottom"},
            "sides": {"type": "roller", "nodes": "sides"}
        }
    }
    
    # 运行集成分析
    try:
        task_ids = system.run_integrated_analysis(
            model_file=model_file,
            sensor_data_config=sensor_data_config,
            pinn_config=pinn_config,
            cae_config=cae_config
        )
        
        logger.info(f"集成分析任务IDs: {task_ids}")
        
        # 检查CAE任务是否提交
        if task_ids["cae_task_id"] is not None:
            # 等待CAE任务完成
            while True:
                status = system.get_task_status(task_ids["cae_task_id"])
                logger.info(f"CAE任务状态: {status['status']}, 进度: {status.get('progress', 0)}%")
                
                if status["status"] in ["completed", "failed"]:
                    break
                
                time.sleep(1)
            
            # 检查结果
            if status["status"] == "completed":
                result = status.get("result", {})
                logger.info(f"集成分析完成: {result}")
                return True
            else:
                logger.error(f"集成分析失败: {status.get('error', '未知错误')}")
                return False
        else:
            logger.warning("未提交CAE任务，可能是参数反演失败")
            return False
    
    except Exception as e:
        logger.error(f"集成分析异常: {str(e)}", exc_info=True)
        return False

def run_all_tests():
    """运行所有测试"""
    project_id = 1
    
    # 生成测试数据
    success = generate_test_data(project_id=project_id, duration=60)
    if not success:
        logger.error("生成测试数据失败")
        return False
    
    # 创建物理AI系统
    system = PhysicsAISystem(project_id=project_id)
    
    # 启动工作线程
    system.start_worker()
    
    try:
        # 测试参数反演
        inverse_success = test_inverse_analysis(system)
        logger.info(f"参数反演测试: {'成功' if inverse_success else '失败'}")
        
        # 测试PINN训练
        pinn_success = test_pinn_training(system)
        logger.info(f"PINN训练测试: {'成功' if pinn_success else '失败'}")
        
        # 测试数据融合
        fusion_success = test_data_fusion(system)
        logger.info(f"数据融合测试: {'成功' if fusion_success else '失败'}")
        
        # 测试集成分析
        integrated_success = test_integrated_analysis(system)
        if integrated_success is not None:
            logger.info(f"集成分析测试: {'成功' if integrated_success else '失败'}")
        else:
            logger.info("集成分析测试: 跳过")
        
        # 汇总结果
        all_success = all([
            inverse_success,
            pinn_success,
            fusion_success,
            integrated_success if integrated_success is not None else True
        ])
        
        logger.info(f"所有测试: {'全部通过' if all_success else '部分失败'}")
        return all_success
        
    finally:
        # 停止工作线程
        system.stop_worker()

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1) 