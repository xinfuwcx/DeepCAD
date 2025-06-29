#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file staged_construction_analysis.py
@description 分步施工模拟分析示例
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import json
import logging
import time
from pathlib import Path

# 添加项目根目录到路径中
sys.path.append(str(Path(__file__).resolve().parent.parent.parent))

# 导入分步施工模拟模块
from src.core.simulation.staged_construction import (
    StagedConstructionAnalysis,
    StageType,
    ConstructionStage
)

# 配置日志
logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("StageConstructionExample")


def main():
    """主函数，运行分步施工模拟示例"""
    logger.info("开始运行分步施工模拟示例")

    # 创建工作目录
    project_id = "demo_stage_construction"
    work_dir = os.path.join(os.path.dirname(__file__), "case_results", "staged_construction")
    os.makedirs(work_dir, exist_ok=True)

    # 示例模型文件，实际使用时需替换为真实的模型文件
    model_file = os.path.join(os.path.dirname(__file__),
                              "case_results", "excavation_model.geo")
    if not os.path.exists(model_file):
        logger.warning(f"模型文件不存在: {model_file}，将使用模拟路径")
        model_file = "simulated_model_path.geo"

    # 创建分步施工模拟分析对象
    analysis = StagedConstructionAnalysis(
        project_id=project_id,
        model_file=model_file,
        work_dir=work_dir,
        config={
            "solver_type": "direct",
            "max_iterations": 50,
            "tolerance": 1e-6,
            "time_step": 1.0,
        }
    )

    # 添加初始阶段
    analysis.add_initial_stage(
        name="初始平衡阶段",
        parameters={
            "water_level": -5.0,        # 初始水位高程
            "initial_stress_method": "k0_procedure",  # K0程序法
            "k0": 0.5                   # 静止侧压力系数
        }
    )

    # 添加第一次开挖阶段 (0m ~ -3.0m)
    analysis.add_excavation_stage(
        name="第一次开挖",
        elements=[101, 102, 103, 104, 105],  # 示例开挖单元编号
        water_level=-5.0,                    # 开挖后水位
        parameters={
            "excavation_depth": 3.0          # 开挖深度
        }
    )

    # 添加围护墙安装阶段
    analysis.add_support_stage(
        name="安装地下连续墙",
        stage_type=StageType.WALL_INSTALLATION,
        entities={
            "wall": [201, 202, 203, 204]     # 示例墙体单元编号
        },
        parameters={
            "wall_thickness": 0.8,           # 墙厚(m)
            "wall_depth": 25.0,              # 墙深(m)
            "elastic_modulus": 3.0e10,       # 弹性模量(Pa)
            "poisson_ratio": 0.2             # 泊松比
        }
    )

    # 添加第二次开挖阶段 (-3.0m ~ -6.0m)
    analysis.add_excavation_stage(
        name="第二次开挖",
        elements=[106, 107, 108, 109, 110],  # 示例开挖单元编号
        water_level=-6.5,                    # 开挖后水位
        parameters={
            "excavation_depth": 3.0          # 开挖深度
        }
    )

    # 添加第一道支撑安装阶段
    analysis.add_support_stage(
        name="安装第一道支撑",
        stage_type=StageType.STRUT_INSTALLATION,
        entities={
            "strut": [301, 302, 303, 304]    # 示例支撑单元编号
        },
        parameters={
            "strut_level": -2.5,             # 支撑高程(m)
            "elastic_modulus": 2.1e11,       # 弹性模量(Pa)
            "section_area": 0.01             # 截面面积(m²)
        }
    )

    # 添加第一道锚杆安装阶段
    analysis.add_support_stage(
        name="安装第一道锚杆",
        stage_type=StageType.ANCHOR_INSTALLATION,
        entities={
            "anchor": [401, 402, 403, 404]   # 示例锚杆单元编号
        },
        parameters={
            "anchor_level": -1.5,            # 锚杆高程(m)
            "anchor_length": 15.0,           # 锚杆长度(m)
            "free_length": 8.0,              # 自由段长度(m)
            "prestress": {                   # 预应力(N)
                "401": 1.0e5,
                "402": 1.0e5,
                "403": 1.0e5,
                "404": 1.0e5
            }
        }
    )

    # 添加降水阶段
    analysis.add_dewatering_stage(
        name="基坑降水",
        water_level=-8.0,                   # 降水后水位
        area=[501, 502, 503, 504],          # 示例降水区域单元编号
        parameters={
            "pumping_rate": 100.0,          # 抽水速率(m³/day)
            "dewatering_time": 5.0          # 降水时间(day)
        }
    )

    # 添加第三次开挖阶段 (-6.0m ~ -9.0m)
    analysis.add_excavation_stage(
        name="第三次开挖",
        elements=[111, 112, 113, 114, 115],  # 示例开挖单元编号
        water_level=-10.0,                   # 开挖后水位
        parameters={
            "excavation_depth": 3.0          # 开挖深度
        }
    )

    # 添加第二道支撑安装阶段
    analysis.add_support_stage(
        name="安装第二道支撑",
        stage_type=StageType.STRUT_INSTALLATION,
        entities={
            "strut": [305, 306, 307, 308]    # 示例支撑单元编号
        },
        parameters={
            "strut_level": -5.5,             # 支撑高程(m)
            "elastic_modulus": 2.1e11,       # 弹性模量(Pa)
            "section_area": 0.012            # 截面面积(m²)
        }
    )

    # 添加第四次开挖阶段 (-9.0m ~ -12.0m)
    analysis.add_excavation_stage(
        name="第四次开挖",
        elements=[116, 117, 118, 119, 120],  # 示例开挖单元编号
        water_level=-12.5,                   # 开挖后水位
        parameters={
            "excavation_depth": 3.0          # 开挖深度
        }
    )

    # 添加第三道支撑安装阶段
    analysis.add_support_stage(
        name="安装第三道支撑",
        stage_type=StageType.STRUT_INSTALLATION,
        entities={
            "strut": [309, 310, 311, 312]    # 示例支撑单元编号
        },
        parameters={
            "strut_level": -8.5,             # 支撑高程(m)
            "elastic_modulus": 2.1e11,       # 弹性模量(Pa)
            "section_area": 0.015            # 截面面积(m²)
        }
    )

    # 添加第五次开挖阶段 (-12.0m ~ -15.0m)
    analysis.add_excavation_stage(
        name="第五次开挖",
        elements=[121, 122, 123, 124, 125],  # 示例开挖单元编号
        water_level=-15.5,                   # 开挖后水位
        parameters={
            "excavation_depth": 3.0          # 开挖深度
        }
    )

    # 添加荷载施加阶段（模拟底板浇筑）
    custom_stage = ConstructionStage(
        stage_id=f"stage_{len(analysis.stages)}",
        stage_type=StageType.LOAD_APPLICATION,
        stage_name="底板浇筑荷载",
        stage_description="模拟底板浇筑产生的荷载",
        parameters={
            "loads": {
                "bottom_slab": {
                    "type": "surface",
                    "value": [0, 0, -25000],   # 25 kPa向下的荷载
                    "entities": [601, 602, 603, 604]  # 底板表面单元
                }
            }
        }
    )
    analysis.add_stage(custom_stage)

    # 保存分析配置
    config_file = analysis.save("staged_construction_config.json")
    logger.info(f"分析配置已保存到: {config_file}")

    # 运行分析
    logger.info("开始运行分步施工模拟分析...")
    try:
        results = analysis.run_analysis()
        
        if results["status"] == "completed":
            logger.info(f"分析成功完成！总计{results['total_stages']}个阶段，"
                        f"耗时: {results['computation_time']:.2f}秒")
            logger.info(f"结果文件: {results['result_file']}")
            
            # 输出各阶段关键结果
            for stage_id, stage_result in results["results_summary"].items():
                stage_name = stage_result["name"]
                stage_type = stage_result["type"]
                
                # 这里假设结果中包含最大位移和最大应力
                if "results" in stage_result and stage_result["results"]:
                    max_disp = stage_result["results"].get("max_displacement", "N/A")
                    max_stress = stage_result["results"].get("max_stress", "N/A")
                    logger.info(f"阶段: {stage_name} (类型: {stage_type}), "
                                f"最大位移: {max_disp} m, 最大应力: {max_stress} Pa")
                else:
                    logger.info(f"阶段: {stage_name} (类型: {stage_type}), 无结果数据")
                    
            # 导出最终结果
            vtk_file = os.path.join(work_dir, "final_results.vtk")
            analysis.export_results(vtk_file, "vtk")
            logger.info(f"最终结果已导出到: {vtk_file}")
            
        else:
            logger.error(f"分析失败: {results.get('error', '未知错误')}")
    
    except Exception as e:
        logger.error(f"运行分析时发生错误: {str(e)}")
    
    logger.info("示例结束")


if __name__ == "__main__":
    main() 