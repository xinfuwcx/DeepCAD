#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
高级深基坑有限元分析示例

本示例展示如何使用增强的深基坑有限元分析模块进行多阶段施工模拟，
包括初始应力平衡、分阶段开挖、支护结构安装和水位变化等。
"""

import os
import sys
import logging
import time
from pathlib import Path

# 添加项目根目录到路径
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# 导入高级深基坑分析模块
from src.core.simulation.advanced_excavation_solver import (
    AdvancedExcavationSolver, 
    MaterialModelType, 
    AnalysisType, 
    StageType
)

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("AdvancedExcavationExample")

def run_advanced_excavation_analysis():
    """运行高级深基坑分析示例"""
    logger.info("=" * 60)
    logger.info("高级深基坑有限元分析示例")
    logger.info("=" * 60)
    
    # 创建结果目录
    results_dir = os.path.join(os.path.dirname(__file__), "..", "case_results", "advanced_excavation")
    os.makedirs(results_dir, exist_ok=True)
    
    try:
        # 创建高级深基坑分析求解器
        solver = AdvancedExcavationSolver(work_dir=results_dir)
        
        # 设置分析参数
        logger.info("设置分析参数...")
        solver.set_model_parameters(
            analysis_type=AnalysisType.STATIC, 
            solver_type="newton_raphson",
            max_iterations=50,
            convergence_criteria="displacement_criterion",
            displacement_tolerance=1.0e-5,
            residual_tolerance=1.0e-5,
            domain_size=3
        )
        
        # 加载网格
        logger.info("加载网格文件...")
        mesh_file = os.path.join("..", "..", "data", "mesh", "simple_box.mdpa")
        if not os.path.exists(mesh_file):
            logger.warning(f"网格文件不存在: {mesh_file}，使用示例中的VTK网格")
            mesh_file = os.path.join("..", "..", "data", "mesh", "simple_box.vtk")
        
        success = solver.load_mesh(mesh_file)
        if not success:
            raise RuntimeError("加载网格失败")
        
        # 添加材料
        logger.info("添加材料...")
        # 添加土体材料
        soil_id = solver.add_soil_material(
            name="砂质粘土",
            model_type=MaterialModelType.MOHR_COULOMB,
            parameters={
                "young_modulus": 3.0e7,    # 弹性模量(Pa)
                "poisson_ratio": 0.3,      # 泊松比
                "density": 1800.0,         # 密度(kg/m³)
                "cohesion": 15000.0,       # 黏聚力(Pa)
                "friction_angle": 25.0,    # 内摩擦角(度)
                "dilatancy_angle": 0.0     # 膨胀角(度)
            },
            group_id=1
        )
        
        # 添加结构材料(地下连续墙)
        wall_id = solver.add_structural_material(
            name="地下连续墙",
            parameters={
                "young_modulus": 3.0e10,   # 弹性模量(Pa)
                "poisson_ratio": 0.2,      # 泊松比
                "density": 2500.0          # 密度(kg/m³)
            },
            group_id=2
        )
        
        # 添加分析阶段
        logger.info("添加分析阶段...")
        
        # 初始应力平衡阶段
        solver.add_water_level_change_stage(
            name="初始水位",
            water_level=-2.0
        )
        
        # 第一次开挖
        solver.add_excavation_stage(
            name="第一次开挖",
            depth=5.0,
            elements_to_remove=[101, 102, 103, 104, 105],
            water_level=-5.0
        )
        
        # 安装支护结构
        solver.add_support_stage(
            name="安装支护结构",
            support_type="wall",
            elements_to_add=[201, 202, 203],
            material_id=wall_id
        )
        
        # 第二次开挖
        solver.add_excavation_stage(
            name="第二次开挖",
            depth=10.0,
            elements_to_remove=[106, 107, 108, 109, 110],
            water_level=-10.0
        )
        
        # 初始化分析
        logger.info("初始化分析...")
        success = solver.initialize()
        if not success:
            raise RuntimeError("初始化分析失败")
        
        # 执行分析
        logger.info("开始执行分析...")
        start_time = time.time()
        success = solver.solve()
        end_time = time.time()
        
        if not success:
            raise RuntimeError("分析计算失败")
        
        logger.info(f"分析计算完成，耗时: {end_time - start_time:.2f}秒")
        
        # 获取结果
        logger.info("获取分析结果...")
        last_stage_displacements = solver.get_displacement_results()
        max_displacement = max([sum(d[0]**2 + d[1]**2 + d[2]**2) ** 0.5 for d in last_stage_displacements.values()])
        logger.info(f"最大位移: {max_displacement:.4f} m")
        
        # 导出结果
        logger.info("导出分析结果...")
        vtk_file = os.path.join(results_dir, "excavation_results.vtk")
        success = solver.export_results(vtk_file, format="vtk")
        if success:
            logger.info(f"结果导出成功: {vtk_file}")
        
        json_file = os.path.join(results_dir, "excavation_results.json")
        success = solver.export_results(json_file, format="json")
        if success:
            logger.info(f"结果导出成功: {json_file}")
        
        logger.info("分析示例执行完成")
        return True
    
    except Exception as e:
        logger.error(f"分析示例执行失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    run_advanced_excavation_analysis() 