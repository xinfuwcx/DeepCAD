#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file test_deep_excavation_system.py
@description 测试深基坑CAE系统的功能
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import time
import json
import logging
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 导入深基坑CAE系统
from src.core.simulation.deep_excavation_system import DeepExcavationSystem

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("test_deep_excavation_system.log", mode="a", encoding="utf-8")
    ]
)
logger = logging.getLogger("TestDeepExcavationSystem")

def test_create_geometry(system):
    """测试创建几何模型"""
    logger.info("测试创建几何模型")
    
    # 几何参数
    geometry_params = {
        "width": 100.0,
        "length": 100.0,
        "depth": 30.0,
        "excavation_width": 50.0,
        "excavation_length": 50.0,
        "excavation_depth": 15.0
    }
    
    # 创建几何模型
    geo_file = system.create_geometry(geometry_params)
    logger.info(f"几何模型创建成功: {geo_file}")
    
    return geo_file

def test_generate_mesh(system):
    """测试生成网格"""
    logger.info("测试生成网格")
    
    # 网格参数
    mesh_params = {
        "mesh_size": 2.0,
        "algorithm": 6,
        "format": "msh"
    }
    
    # 生成网格
    mesh_file = system.generate_mesh(mesh_params)
    logger.info(f"网格生成成功: {mesh_file}")
    
    return mesh_file

def test_create_model(system):
    """测试创建计算模型"""
    logger.info("测试创建计算模型")
    
    # 模型参数
    model_params = {
        "name": "test_model",
        "soil_layers": [
            {
                "name": "黏土层",
                "material_model": "mohr_coulomb",
                "parameters": {
                    "young_modulus": 2.0e7,
                    "poisson_ratio": 0.3,
                    "cohesion": 20000.0,
                    "friction_angle": 20.0,
                    "density": 1800.0
                },
                "group_id": 1
            },
            {
                "name": "砂土层",
                "material_model": "mohr_coulomb",
                "parameters": {
                    "young_modulus": 5.0e7,
                    "poisson_ratio": 0.25,
                    "cohesion": 5000.0,
                    "friction_angle": 30.0,
                    "density": 2000.0
                },
                "group_id": 2
            }
        ],
        "boundary_conditions": [
            {
                "type": "fixed",
                "entities": [1, 2, 3, 4, 5, 6]
            }
        ],
        "loads": [
            {
                "type": "surface_load",
                "entities": [7, 8],
                "values": [10000.0, 0.0, 0.0]
            }
        ],
        "excavation_stages": [
            {
                "name": "第一阶段开挖",
                "entities": [9, 10, 11],
                "water_level": -5.0,
                "time_step": 1.0
            },
            {
                "name": "第二阶段开挖",
                "entities": [12, 13, 14],
                "water_level": -10.0,
                "time_step": 1.0
            }
        ]
    }
    
    # 创建计算模型
    model_file = system.create_model(model_params)
    logger.info(f"计算模型创建成功: {model_file}")
    
    return model_file

def test_run_analysis(system):
    """测试运行分析"""
    logger.info("测试运行分析")
    
    # 分析参数
    analysis_params = {
        "num_threads": 4
    }
    
    # 运行分析
    result = system.run_analysis(analysis_params)
    logger.info(f"分析完成: {result}")
    
    return result

def test_integrated_analysis(system):
    """测试集成分析"""
    logger.info("测试集成分析")
    
    # 集成分析参数
    integrated_params = {
        "sensor_data_config": {
            "data_types": ["displacement", "stress"],
            "start_date": "20250101",
            "end_date": "20250201"
        },
        "pinn_config": {
            "pde_type": "elasticity",
            "layers": [20, 20, 20],
            "iterations": 5000,
            "learning_rate": 0.001
        },
        "cae_config": {
            "num_threads": 4,
            "solver_type": "direct"
        }
    }
    
    # 运行集成分析
    result = system.run_integrated_analysis(integrated_params)
    logger.info(f"集成分析启动: {result}")
    
    return result

def test_get_results(system):
    """测试获取结果"""
    logger.info("测试获取结果")
    
    # 等待分析完成
    for _ in range(10):
        status = system.get_analysis_status()
        if status["analysis_status"] == "completed":
            break
        logger.info(f"等待分析完成: {status['analysis_status']}")
        time.sleep(2)
    
    # 获取位移结果
    try:
        displacement_results = system.get_results("displacement")
        logger.info(f"位移结果: {len(displacement_results)} 个节点")
    except Exception as e:
        logger.error(f"获取位移结果失败: {str(e)}")
    
    # 获取应力结果
    try:
        stress_results = system.get_results("stress")
        logger.info(f"应力结果: {len(stress_results)} 个节点")
    except Exception as e:
        logger.error(f"获取应力结果失败: {str(e)}")
    
    # 导出结果
    try:
        output_file = os.path.join(system.results_dir, "test_results.vtk")
        export_file = system.export_results(output_file)
        logger.info(f"结果导出成功: {export_file}")
    except Exception as e:
        logger.error(f"导出结果失败: {str(e)}")

def main():
    """主函数"""
    logger.info("开始测试深基坑CAE系统")
    
    # 创建深基坑系统
    project_id = int(time.time())
    project_name = f"test_project_{project_id}"
    
    system = DeepExcavationSystem(
        project_id=project_id,
        project_name=project_name
    )
    
    try:
        # 测试创建几何模型
        geo_file = test_create_geometry(system)
        
        # 测试生成网格
        mesh_file = test_generate_mesh(system)
        
        # 测试创建计算模型
        model_file = test_create_model(system)
        
        # 测试运行分析
        analysis_result = test_run_analysis(system)
        
        # 测试获取结果
        test_get_results(system)
        
        # 测试集成分析
        integrated_result = test_integrated_analysis(system)
        
        logger.info("测试完成")
        
    except Exception as e:
        logger.error(f"测试过程中出错: {str(e)}", exc_info=True)
    
if __name__ == "__main__":
    main()


