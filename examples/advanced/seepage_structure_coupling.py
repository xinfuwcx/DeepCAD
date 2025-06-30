#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
渗流-结构耦合分析示例

本示例展示如何使用深基坑分析系统进行渗流-结构耦合分析，包括：
1. 模型设置和配置
2. 选择耦合策略
3. 完成整个耦合分析过程
4. 可视化结果

@author: Deep Excavation Team
@version: 1.5.0
"""

import os
import sys
import numpy as np
import argparse
import matplotlib.pyplot as plt
from pathlib import Path
import logging
import json
import time

# 添加项目根目录到路径
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(project_root, 'logs', 'seepage_structure_coupling.log'), 'w')
    ]
)

logger = logging.getLogger("SeepageStructureCoupling")

# 导入必要的模块
try:
    from src.core.simulation.flow_structure_coupling import (
        FlowStructureCoupling, 
        CouplingType, 
        CouplingScheme,
        create_coupling_analysis
    )
    from src.core.simulation.deep_excavation_system import DeepExcavationSystem
except ImportError as e:
    logger.error(f"导入模块失败: {str(e)}")
    sys.exit(1)

def parse_arguments():
    """解析命令行参数"""
    parser = argparse.ArgumentParser(description='渗流-结构耦合分析示例')
    
    parser.add_argument('--project_id', type=int, default=1001,
                        help='项目ID')
    parser.add_argument('--coupling_type', type=str, default='staggered',
                        choices=['monolithic', 'staggered', 'one_way'],
                        help='耦合类型')
    parser.add_argument('--coupling_scheme', type=str, default='biot',
                        choices=['biot', 'semi_coupled', 'volume_coupled', 'custom'],
                        help='耦合方案')
    parser.add_argument('--work_dir', type=str, default=None,
                        help='工作目录')
    parser.add_argument('--visualize', action='store_true',
                        help='是否可视化结果')
    
    return parser.parse_args()

def create_excavation_model(system, config):
    """创建基坑模型
    
    参数:
        system: 深基坑分析系统实例
        config: 配置参数
        
    返回:
        是否成功创建模型
    """
    # 创建几何模型
    logger.info("创建几何模型...")
    geo_params = {
        "width": config.get("domain_width", 100.0),
        "length": config.get("domain_length", 100.0),
        "depth": config.get("domain_depth", 30.0),
        "excavation_width": config.get("excavation_width", 50.0),
        "excavation_length": config.get("excavation_length", 50.0),
        "excavation_depth": config.get("excavation_depth", 15.0)
    }
    
    geo_file = system.create_geometry(geo_params)
    if not geo_file:
        return False
        
    # 生成网格
    logger.info("生成网格...")
    mesh_params = {
        "mesh_size": config.get("mesh_size", 2.0),
        "algorithm": config.get("mesh_algorithm", 6),
        "format": "msh"
    }
    
    mesh_file = system.generate_mesh(mesh_params)
    if not mesh_file:
        return False
    
    # 创建模型
    logger.info("创建计算模型...")
    model_params = {
        "analysis_type": "coupled_flow_structure",
        "solver_settings": {
            "solver_type": "quasi_static",
            "time_integration_method": "backward_euler",
            "solution_type": "full_newton_raphson",
            "convergence_criteria": "mixed_displacement_pressure",
            "max_iterations": 20,
            "displacement_tolerance": 1e-5,
            "pressure_tolerance": 1e-5
        }
    }
    
    model_id = system.create_model(model_params)
    if not model_id:
        return False
    
    # 添加材料
    logger.info("添加材料...")
    # 软黏土参数 (Modified Cam Clay)
    system.add_material(
        name="SoftClay",
        material_type="ModifiedCamClay",
        params={
            "lambda_param": 0.15,
            "kappa": 0.03,
            "M": 1.2,
            "e0": 0.9,
            "p0": 100.0,
            "poisson_ratio": 0.3,
            "density": 1800.0,
            "ocr": 1.2,
            "specific_gravity": 2.7,
            "permeability": 1e-9  # 渗透系数 (m/s)
        }
    )
    
    # 砂层参数
    system.add_material(
        name="Sand",
        material_type="MohrCoulomb",
        params={
            "young_modulus": 5e7,
            "poisson_ratio": 0.25,
            "cohesion": 1000.0,
            "friction_angle": 35.0,
            "dilatancy_angle": 5.0,
            "density": 2000.0,
            "permeability": 1e-6  # 渗透系数 (m/s)
        }
    )
    
    # 混凝土支护结构
    system.add_material(
        name="Concrete",
        material_type="LinearElastic",
        params={
            "young_modulus": 3e10,
            "poisson_ratio": 0.2,
            "density": 2500.0,
            "permeability": 1e-12  # 渗透系数 (m/s)
        }
    )
    
    logger.info("设置分层...")
    # 设置地层
    system.set_layer(
        name="TopLayer",
        material="Sand",
        elevation=(-5.0, 0.0)
    )
    
    system.set_layer(
        name="MiddleLayer",
        material="SoftClay",
        elevation=(-15.0, -5.0)
    )
    
    system.set_layer(
        name="BottomLayer",
        material="Sand",
        elevation=(-30.0, -15.0)
    )
    
    logger.info("添加支护结构...")
    # 添加支护结构
    system.add_diaphragm_wall(
        name="DiaphragmWall",
        material="Concrete",
        thickness=0.8,
        depth=25.0,
        top_elevation=0.0
    )
    
    logger.info("设置开挖与施工阶段...")
    # 设置分步开挖
    system.set_excavation_stages([
        {"name": "Initial", "type": "initial", "water_level": -2.0},
        {"name": "WallConstruction", "type": "construction", "elements": ["DiaphragmWall"]},
        {"name": "FirstExcavation", "type": "excavation", "depth": 5.0, "water_level": -5.0},
        {"name": "SecondExcavation", "type": "excavation", "depth": 10.0, "water_level": -10.0},
        {"name": "FinalExcavation", "type": "excavation", "depth": 15.0, "water_level": -15.0},
    ])
    
    logger.info("设置边界条件...")
    # 设置边界条件
    # 位移边界条件
    system.add_boundary_condition(
        type="displacement",
        direction="x",
        value=0.0,
        entities=["left_boundary", "right_boundary"]
    )
    
    system.add_boundary_condition(
        type="displacement",
        direction="y",
        value=0.0,
        entities=["bottom_boundary"]
    )
    
    system.add_boundary_condition(
        type="displacement",
        direction="z",
        value=0.0,
        entities=["front_boundary", "back_boundary"]
    )
    
    # 水压力边界条件
    system.add_boundary_condition(
        type="pressure",
        value=0.0,
        entities=["top_boundary"]
    )
    
    system.add_boundary_condition(
        type="seepage",
        flow_rate=0.0,  # 无流量边界
        entities=["bottom_boundary", "left_boundary", "right_boundary"]
    )
    
    logger.info("模型创建成功")
    return True

def setup_coupling_analysis(args, config):
    """设置渗流-结构耦合分析
    
    参数:
        args: 命令行参数
        config: 配置参数
        
    返回:
        耦合分析实例
    """
    # 设置工作目录
    if args.work_dir:
        work_dir = args.work_dir
    else:
        work_dir = os.path.join(project_root, "data", "projects", f"project_{args.project_id}")
    
    os.makedirs(work_dir, exist_ok=True)
    
    # 创建深基坑分析系统
    system = DeepExcavationSystem(
        project_id=args.project_id,
        project_name="SeepageStructureCoupling",
        work_dir=work_dir
    )
    
    # 创建模型
    if not create_excavation_model(system, config):
        logger.error("创建模型失败")
        return None
    
    # 创建耦合分析实例
    coupling_config = {
        "type": args.coupling_type,
        "scheme": args.coupling_scheme,
        "parameters": {
            "max_iterations": 30,
            "convergence_tolerance": 1e-5,
            "relaxation_factor": 0.6,
            "use_steady_state": False,
            "time_step": 3600.0,  # 1小时
            "total_time": 3600.0 * 72  # 72小时
        }
    }
    
    coupling_analysis = create_coupling_analysis(
        project_id=args.project_id,
        work_dir=work_dir,
        coupling_config=coupling_config
    )
    
    # 设置流体和结构模型
    coupling_analysis.set_flow_model(system.get_flow_model())
    coupling_analysis.set_structure_model(system.get_structure_model())
    
    return coupling_analysis

def run_coupling_analysis(coupling_analysis):
    """运行渗流-结构耦合分析
    
    参数:
        coupling_analysis: 耦合分析实例
        
    返回:
        是否成功完成分析
    """
    if coupling_analysis is None:
        logger.error("耦合分析实例为空")
        return False
    
    # 初始化分析
    logger.info("初始化耦合分析...")
    if not coupling_analysis.initialize():
        logger.error("初始化耦合分析失败")
        return False
    
    # 运行整个分析过程
    logger.info("开始耦合分析...")
    start_time = time.time()
    
    success = coupling_analysis.solve_complete()
    
    end_time = time.time()
    
    if success:
        logger.info(f"耦合分析完成，耗时: {end_time - start_time:.2f}秒")
        
        # 保存最终结果
        result_file = coupling_analysis.save_results("final_results")
        logger.info(f"最终结果已保存到: {result_file}")
        return True
    else:
        logger.error("耦合分析失败")
        return False

def visualize_results(project_id, work_dir, coupling_type):
    """可视化分析结果
    
    参数:
        project_id: 项目ID
        work_dir: 工作目录
        coupling_type: 耦合类型
    """
    if work_dir is None:
        work_dir = os.path.join(project_root, "data", "projects", f"project_{project_id}")
    
    results_dir = os.path.join(work_dir, "results", "coupled")
    
    # 查找最终结果文件
    result_file = os.path.join(results_dir, "final_results.json")
    
    if not os.path.exists(result_file):
        logger.error(f"结果文件不存在: {result_file}")
        return False
    
    try:
        with open(result_file, 'r') as f:
            results = json.load(f)
            
        # 绘制收敛历史
        plt.figure(figsize=(10, 6))
        plt.semilogy(results["convergence_history"], 'o-', linewidth=2)
        plt.grid(True)
        plt.xlabel('迭代次数')
        plt.ylabel('误差 (对数尺度)')
        plt.title(f'耦合分析收敛历史 (耦合类型: {coupling_type})')
        
        # 保存图表
        plot_file = os.path.join(results_dir, "convergence_history.png")
        plt.savefig(plot_file, dpi=300)
        logger.info(f"收敛历史图表已保存到: {plot_file}")
        
        # 显示图表（如果在交互环境中）
        if os.environ.get('DISPLAY'):
            plt.show()
    
    except Exception as e:
        logger.error(f"可视化结果失败: {str(e)}")
        return False
    
    return True

def main():
    """主函数"""
    args = parse_arguments()
    
    # 配置参数
    config = {
        "domain_width": 100.0,
        "domain_length": 100.0,
        "domain_depth": 30.0,
        "excavation_width": 50.0,
        "excavation_length": 50.0,
        "excavation_depth": 15.0,
        "mesh_size": 2.0,
        "mesh_algorithm": 6
    }
    
    # 设置工作目录
    if args.work_dir is None:
        args.work_dir = os.path.join(project_root, "data", "projects", f"project_{args.project_id}")
    
    # 创建日志目录
    os.makedirs(os.path.join(project_root, "logs"), exist_ok=True)
    
    logger.info(f"启动渗流-结构耦合分析示例")
    logger.info(f"项目ID: {args.project_id}")
    logger.info(f"耦合类型: {args.coupling_type}")
    logger.info(f"耦合方案: {args.coupling_scheme}")
    logger.info(f"工作目录: {args.work_dir}")
    
    # 设置耦合分析
    coupling_analysis = setup_coupling_analysis(args, config)
    
    # 运行分析
    success = run_coupling_analysis(coupling_analysis)
    
    # 可视化结果
    if success and args.visualize:
        visualize_results(args.project_id, args.work_dir, args.coupling_type)
    
    if success:
        logger.info("示例完成")
        return 0
    else:
        logger.error("示例失败")
        return 1

if __name__ == "__main__":
    sys.exit(main())
