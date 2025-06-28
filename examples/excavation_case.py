#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file excavation_case.py
@description 基坑开挖案例测试
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

# 导入系统模块
from src.core.simulation.deep_excavation_system import DeepExcavationSystem
from src.core.meshing.gmsh_wrapper import GmshWrapper
from src.core.simulation.terra_wrapper import TerraWrapper
from src.core.visualization.trame_server import TrameServer
from src.config.excavation_config import get_system_config

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("ExcavationCase")

def main():
    """主函数"""
    logger.info("开始基坑开挖案例测试")
    
    # 创建工作目录
    work_dir = Path("./examples/case_results")
    os.makedirs(work_dir, exist_ok=True)
    
    # 创建项目
    project_id = int(time.time())
    project_name = "基坑开挖案例"
    
    logger.info(f"创建项目: {project_name} (ID: {project_id})")
    system = DeepExcavationSystem(
        project_id=project_id,
        project_name=project_name,
        work_dir=str(work_dir)
    )
    
    # 几何参数定义
    # 土体大小40m*40m*25m，基坑15m*15m*10m
    geometry_params = {
        "width": 40.0,        # 土体宽度
        "length": 40.0,       # 土体长度
        "depth": 25.0,        # 土体深度
        "excavation_width": 15.0,  # 基坑宽度
        "excavation_length": 15.0, # 基坑长度
        "excavation_depth": 10.0,  # 基坑深度
        "diaphragm_wall_thickness": 0.8,  # 地连墙厚度
        "diaphragm_wall_depth": 12.0      # 地连墙深度
    }
    
    # 步骤1：创建几何模型
    logger.info("步骤1：创建几何模型")
    try:
        geo_file = system.create_geometry(geometry_params)
        logger.info(f"几何模型创建成功: {geo_file}")
    except Exception as e:
        logger.error(f"几何模型创建失败: {str(e)}")
        return
    
    # 网格参数定义
    # 网格大小0.5m
    mesh_params = {
        "mesh_size": 0.5,     # 网格大小
        "algorithm": 6,       # 四面体网格算法
        "format": "msh"       # 网格文件格式
    }
    
    # 步骤2：生成网格
    logger.info("步骤2：生成网格")
    try:
        mesh_file = system.generate_mesh(mesh_params)
        logger.info(f"网格生成成功: {mesh_file}")
    except Exception as e:
        logger.error(f"网格生成失败: {str(e)}")
        return
    
    # 计算模型参数定义
    model_params = {
        "name": "基坑开挖模型",
        # 土层参数 - 摩尔库仑本构
        "soil_layers": [
            {
                "name": "表层土",
                "material_model": "mohr_coulomb",
                "parameters": {
                    "young_modulus": 3.0e7,    # 弹性模量 Pa
                    "poisson_ratio": 0.3,      # 泊松比
                    "cohesion": 15000.0,       # 粘聚力 Pa
                    "friction_angle": 25.0,    # 内摩擦角 度
                    "density": 1800.0          # 密度 kg/m³
                },
                "group_id": 1
            }
        ],
        # 地连墙参数 - C35混凝土
        "diaphragm_wall": {
            "name": "地连墙",
            "material_model": "linear_elastic",
            "parameters": {
                "young_modulus": 3.15e10,  # C35混凝土弹性模量 Pa
                "poisson_ratio": 0.2,      # 混凝土泊松比
                "density": 2500.0          # 混凝土密度 kg/m³
            },
            "thickness": 0.8,
            "depth": 12.0,
            "element_type": "shell",
            "group_id": 2
        },
        # 边界条件
        "boundary_conditions": [
            {
                "type": "fixed",
                "entities": ["bottom"]  # 底部固定约束
            },
            {
                "type": "roller",
                "entities": ["sides"]   # 侧面滚动约束
            }
        ],
        # 荷载
        "loads": [
            {
                "type": "gravity",
                "value": 9.81
            }
        ],
        # 开挖阶段
        "excavation_stages": [
            {
                "name": "初始地应力平衡",
                "type": "initial",
                "excavation_depth": 0.0
            },
            {
                "name": "基坑开挖",
                "type": "excavation",
                "excavation_depth": 10.0,  # 一次挖至10m
                "water_level": -10.0
            }
        ]
    }
    
    # 步骤3：创建计算模型
    logger.info("步骤3：创建计算模型")
    try:
        model_file = system.create_model(model_params)
        logger.info(f"计算模型创建成功: {model_file}")
    except Exception as e:
        logger.error(f"计算模型创建失败: {str(e)}")
        return
    
    # 分析参数
    analysis_params = {
        "solver": "direct",        # 直接求解器
        "max_iterations": 100,     # 最大迭代次数
        "convergence_tol": 1e-6,   # 收敛容差
        "num_threads": 4           # 线程数
    }
    
    # 步骤4：运行分析
    logger.info("步骤4：运行分析")
    try:
        result = system.run_analysis(analysis_params)
        logger.info(f"分析完成: {result}")
    except Exception as e:
        logger.error(f"分析失败: {str(e)}")
        return
    
    # 步骤5：获取结果
    logger.info("步骤5：获取结果")
    try:
        # 获取位移结果
        disp_result = system.get_results("displacement", stage_index=1)
        logger.info(f"最大位移: {disp_result['max_value']} m")
        
        # 获取应力结果
        stress_result = system.get_results("stress", stage_index=1)
        logger.info(f"最大应力: {stress_result['max_value']} Pa")
        
        # 保存结果到文件
        result_file = os.path.join(work_dir, "result_summary.json")
        with open(result_file, "w", encoding="utf-8") as f:
            json.dump({
                "displacement": {
                    "max": disp_result["max_value"],
                    "min": disp_result["min_value"]
                },
                "stress": {
                    "max": stress_result["max_value"],
                    "min": stress_result["min_value"]
                }
            }, f, indent=2)
        logger.info(f"结果摘要已保存至: {result_file}")
    except Exception as e:
        logger.error(f"获取结果失败: {str(e)}")
        return
    
    # 步骤6：可视化结果
    logger.info("步骤6：可视化结果")
    try:
        # 启动可视化服务器
        vis_server = TrameServer(
            mesh_file=system.project_status["mesh_file"],
            result_file=system.project_status["result_file"]
        )
        
        # 显示位移云图
        vis_server.show_displacement()
        
        # 显示应力云图
        vis_server.show_stress()
        
        # 启动服务器
        server_url = vis_server.start_server()
        logger.info(f"可视化服务器启动成功，请访问: {server_url}")
        
        # 导出可视化结果为图片
        vis_server.export_image(os.path.join(work_dir, "displacement.png"), "displacement")
        vis_server.export_image(os.path.join(work_dir, "stress.png"), "stress")
        logger.info("可视化结果已导出为图片")
    except Exception as e:
        logger.error(f"可视化结果失败: {str(e)}")
        return
    
    logger.info("基坑开挖案例测试完成")
    
    # 返回结果摘要
    return {
        "project_id": project_id,
        "project_name": project_name,
        "geometry_file": system.project_status.get("geometry_file"),
        "mesh_file": system.project_status.get("mesh_file"),
        "model_file": system.project_status.get("model_file"),
        "result_file": system.project_status.get("result_file"),
        "max_displacement": disp_result["max_value"],
        "max_stress": stress_result["max_value"],
        "visualization_url": server_url
    }

if __name__ == "__main__":
    try:
        result = main()
        if result:
            print("\n结果摘要:")
            for key, value in result.items():
                print(f"  {key}: {value}")
    except Exception as e:
        logger.error(f"程序执行出错: {str(e)}")
        traceback.print_exc()



