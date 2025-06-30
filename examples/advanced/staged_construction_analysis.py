#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
分步施工模拟分析示例

该示例展示如何使用StagedConstructionAnalysis类模拟深基坑工程的分步施工过程，
包括支护结构与土体之间的接触分析。
"""

import os
import sys
import logging
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

# 添加项目根目录到Python路径
project_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_dir))

from src.core.simulation.staged_construction import (
    StagedConstructionAnalysis,
    ConstructionStage,
    StageType,
    ContactDefinition,
    ContactType
)

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("StagedConstructionExample")

def run_staged_construction_with_contacts():
    """运行分步施工模拟示例（带接触分析）"""
    logger.info("运行带接触分析的分步施工模拟示例")
    
    # 创建工作目录
    output_dir = os.path.join(project_dir, "examples", "case_results", "staged_construction")
    os.makedirs(output_dir, exist_ok=True)
    
    # 示例模型文件（在实际应用中，这应该是一个有效的模型文件）
    model_file = os.path.join(project_dir, "data", "mesh", "simple_box.msh")
    
    # 创建分步施工分析实例
    analysis = StagedConstructionAnalysis(
        project_id="contact_example_001",
        model_file=model_file,
        work_dir=output_dir,
        config={
            "solver": "static",
            "max_iterations": 50,
            "convergence_tolerance": 1e-5,
            "contact_config": {
                "algorithm": "mortar",
                "search_radius": 0.5,
                "auto_detection": True,
                "friction_model": "coulomb",
                "stabilization": 1e-5,
                "max_iterations": 10
            }
        }
    )
    
    # 定义材料和实体（用于演示）
    # 在实际应用中，这些信息会从模型文件中读取
    soil_entities = {
        "soil_top": [1, 2, 3],
        "soil_middle": [4, 5, 6],
        "soil_bottom": [7, 8, 9]
    }
    
    structure_entities = {
        "diaphragm_wall": [10, 11],
        "anchor_1": [12],
        "anchor_2": [13],
        "strut_1": [14]
    }
    
    # 1. 添加初始阶段 - 建立初始地应力场
    analysis.add_initial_stage(
        name="初始状态",
        parameters={
            "gravity": 9.81,
            "water_level": 0.0,  # 地表水位
            "k0": 0.5,  # 静止土压力系数
            "soil_unit_weight": 20.0  # 土体单位重(kN/m³)
        }
    )
    
    # 2. 添加围护结构安装阶段
    wall_entities = {"diaphragm_wall": structure_entities["diaphragm_wall"]}
    analysis.add_support_stage(
        name="围护结构安装",
        stage_type=StageType.WALL_INSTALLATION,
        entities=wall_entities,
        parameters={
            "wall_type": "diaphragm",
            "elastic_modulus": 3.0e7,  # 混凝土弹性模量(kPa)
            "poisson_ratio": 0.2,      # 混凝土泊松比
            "thickness": 0.6           # 墙厚(m)
        }
    )
    
    # 3. 添加围护墙与土体的接触定义
    analysis.add_frictional_contact(
        master_entity="diaphragm_wall",
        slave_entity="soil_top",
        friction_coefficient=0.3,
        normal_stiffness=1.0e9,
        description="围护墙与上层土体接触"
    )
    
    analysis.add_frictional_contact(
        master_entity="diaphragm_wall",
        slave_entity="soil_middle",
        friction_coefficient=0.35,
        normal_stiffness=1.0e9,
        description="围护墙与中层土体接触"
    )
    
    # 4. 添加接触初始化阶段
    analysis.add_contact_stage(
        name="接触初始化",
        contacts=["contact_diaphragm_wall_soil_top", "contact_diaphragm_wall_soil_middle"],
        parameters={
            "contact_controls": {
                "normal_penalty_factor": 1.0,
                "tangential_penalty_factor": 0.8
            }
        }
    )
    
    # 5. 第一次开挖阶段
    analysis.add_excavation_stage(
        name="第一次开挖",
        elements=soil_entities["soil_top"],
        water_level=-2.0,
        parameters={
            "excavation_depth": 2.0,
            "unloading_factor": 1.0  # 卸载因子
        }
    )
    
    # 6. 添加第一道支撑
    strut_entities = {"strut_1": structure_entities["strut_1"]}
    analysis.add_support_stage(
        name="第一道支撑安装",
        stage_type=StageType.STRUT_INSTALLATION,
        entities=strut_entities,
        parameters={
            "strut_type": "steel",
            "elastic_modulus": 2.0e8,  # 钢材弹性模量(kPa)
            "cross_section_area": 0.01,  # 截面积(m²)
            "prestress": 100.0  # 预应力(kN)
        }
    )
    
    # 7. 添加支撑与围护墙的刚性连接（绑定接触）
    analysis.add_tied_contact(
        master_entity="diaphragm_wall",
        slave_entity="strut_1",
        normal_stiffness=1.0e10,
        description="支撑与围护墙的连接"
    )
    
    # 8. 接触更新阶段
    analysis.add_contact_stage(
        name="支撑接触初始化",
        contacts=["contact_diaphragm_wall_strut_1"],
        parameters={
            "contact_controls": {
                "normal_penalty_factor": 10.0
            }
        }
    )
    
    # 9. 第二次开挖阶段
    analysis.add_excavation_stage(
        name="第二次开挖",
        elements=soil_entities["soil_middle"],
        water_level=-5.0,
        parameters={
            "excavation_depth": 3.0,
            "unloading_factor": 1.0  # 卸载因子
        }
    )
    
    # 10. 添加锚杆
    anchor_entities = {
        "anchor_1": structure_entities["anchor_1"],
        "anchor_2": structure_entities["anchor_2"]
    }
    analysis.add_support_stage(
        name="锚杆安装",
        stage_type=StageType.ANCHOR_INSTALLATION,
        entities=anchor_entities,
        parameters={
            "anchor_type": "prestressed",
            "elastic_modulus": 2.0e8,  # 钢材弹性模量(kPa)
            "cross_section_area": 0.0005,  # 截面积(m²)
            "free_length": 8.0,  # 自由段长度(m)
            "fixed_length": 5.0,  # 锚固段长度(m)
            "prestress": [200.0, 200.0],  # 各锚杆的预应力(kN)
            "installation_angle": 15.0  # 安装角度(°)
        }
    )
    
    # 11. 添加锚杆与围护墙的接触
    analysis.add_tied_contact(
        master_entity="diaphragm_wall",
        slave_entity="anchor_1",
        normal_stiffness=1.0e10,
        description="锚杆1与围护墙的连接"
    )
    
    analysis.add_tied_contact(
        master_entity="diaphragm_wall",
        slave_entity="anchor_2",
        normal_stiffness=1.0e10,
        description="锚杆2与围护墙的连接"
    )
    
    # 12. 接触更新阶段
    analysis.add_contact_stage(
        name="锚杆接触初始化",
        contacts=["contact_diaphragm_wall_anchor_1", "contact_diaphragm_wall_anchor_2"]
    )
    
    # 13. 施加地面荷载
    analysis.add_load_stage(
        name="施加地面荷载",
        loads={
            "surface_load": {
                "entities": [15, 16],  # 地面单元
                "type": "pressure",
                "value": 20.0,  # 荷载大小(kPa)
                "direction": [0, 0, -1]  # 荷载方向
            }
        }
    )
    
    # 14. 完工阶段
    analysis.add_stage(
        ConstructionStage(
            stage_id=f"stage_{len(analysis.stages)}",
            stage_type=StageType.COMPLETION,
            stage_name="完工阶段",
            stage_description="建设完成阶段，进行长期安全性评估",
            parameters={
                "long_term": True,
                "consolidation_time": 3650.0  # 模拟10年长期性能
            }
        )
    )
    
    # 运行分析
    logger.info("开始运行分步施工模拟分析...")
    analysis.run_analysis()
    
    # 保存分析结果
    result_file = analysis.save("staged_construction_contact_results.json")
    logger.info(f"分析结果已保存到: {result_file}")
    
    # 导出结果
    vtk_file = analysis.export_results(
        os.path.join(output_dir, "staged_construction_final_result.vtk"),
        format="vtk"
    )
    logger.info(f"结果已导出到VTK文件: {vtk_file}")
    
    # 打印接触分析结果
    logger.info("接触分析结果:")
    contact_results = analysis.get_contact_results()
    for contact_id, result in contact_results.items():
        logger.info(f"接触 {contact_id}:")
        for key, value in result.items():
            logger.info(f"  {key}: {value}")
    
    return analysis

def plot_wall_displacement(analysis):
    """绘制围护墙位移曲线"""
    try:
        # 假设我们能从分析结果中获取墙位移数据
        # 在实际应用中，这些数据应该来自分析结果
        
        # 模拟墙的深度和水平位移数据
        wall_depth = np.linspace(0, 15, 50)  # 0到15m的墙深度
        
        # 不同阶段的水平位移（模拟数据）
        stages = ["初始状态", "第一次开挖", "第一道支撑安装", "第二次开挖", "锚杆安装", "完工阶段"]
        displacements = [
            np.zeros_like(wall_depth),  # 初始状态
            0.02 * wall_depth * np.exp(-wall_depth / 5),  # 第一次开挖
            0.015 * wall_depth * np.exp(-wall_depth / 5),  # 第一道支撑安装
            0.03 * wall_depth * np.exp(-wall_depth / 6),  # 第二次开挖
            0.025 * wall_depth * np.exp(-wall_depth / 6),  # 锚杆安装
            0.028 * wall_depth * np.exp(-wall_depth / 6)   # 完工阶段
        ]
        
        # 创建图形
        plt.figure(figsize=(10, 8))
        
        # 绘制位移曲线
        for i, stage_name in enumerate(stages):
            plt.plot(displacements[i] * 100, wall_depth, label=stage_name)
        
        # 设置图表属性
        plt.xlabel('水平位移 (cm)')
        plt.ylabel('深度 (m)')
        plt.title('分步施工过程中围护墙的水平位移')
        plt.legend()
        plt.grid(True)
        
        # 翻转Y轴方向（深度增加向下）
        plt.gca().invert_yaxis()
        
        # 保存图形
        output_dir = os.path.join(project_dir, "examples", "case_results", "staged_construction")
        plt.savefig(os.path.join(output_dir, "wall_displacement.png"))
        logger.info(f"围护墙位移图已保存到: {os.path.join(output_dir, 'wall_displacement.png')}")
        
        plt.close()
        
    except Exception as e:
        logger.error(f"绘制围护墙位移图失败: {str(e)}")

def plot_contact_stresses(analysis):
    """绘制接触应力分布"""
    try:
        # 假设墙的深度方向
        wall_depth = np.linspace(0, 15, 50)  # 0到15m的墙深度
        
        # 模拟不同接触面的接触应力（法向和切向）
        # 在实际应用中，这些数据应该来自分析结果
        normal_stress = 50 * np.exp(-wall_depth / 10) + 20  # 法向应力 (kPa)
        shear_stress = 15 * np.exp(-wall_depth / 8)        # 剪切应力 (kPa)
        
        # 创建图形
        plt.figure(figsize=(10, 8))
        
        # 绘制应力曲线
        plt.plot(normal_stress, wall_depth, 'b-', label='法向接触应力')
        plt.plot(shear_stress, wall_depth, 'r-', label='切向接触应力')
        
        # 设置图表属性
        plt.xlabel('接触应力 (kPa)')
        plt.ylabel('深度 (m)')
        plt.title('围护墙与土体的接触应力分布')
        plt.legend()
        plt.grid(True)
        
        # 翻转Y轴方向（深度增加向下）
        plt.gca().invert_yaxis()
        
        # 保存图形
        output_dir = os.path.join(project_dir, "examples", "case_results", "staged_construction")
        plt.savefig(os.path.join(output_dir, "contact_stresses.png"))
        logger.info(f"接触应力图已保存到: {os.path.join(output_dir, 'contact_stresses.png')}")
        
        plt.close()
        
    except Exception as e:
        logger.error(f"绘制接触应力分布图失败: {str(e)}")

if __name__ == "__main__":
    try:
        analysis = run_staged_construction_with_contacts()
        plot_wall_displacement(analysis)
        plot_contact_stresses(analysis)
    except Exception as e:
        logger.exception(f"分析过程中出错: {str(e)}") 