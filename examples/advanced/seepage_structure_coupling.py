#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
深基坑渗流-结构耦合分析示例

该示例展示如何使用渗流-结构耦合分析模块对深基坑进行分析。
"""

import os
import sys
import numpy as np
import logging
import time
import matplotlib.pyplot as plt
from pathlib import Path

# 添加项目根目录到路径
project_dir = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(project_dir))

try:
    from src.core.simulation.seepage_structure_coupling import SeepageStructureCoupling
    HAVE_MODULE = True
except ImportError:
    HAVE_MODULE = False
    print("警告：未能导入渗流-结构耦合分析模块，请确认项目安装正确")

# 配置日志
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def run_basic_coupling_analysis():
    """运行基础的渗流-结构耦合分析示例"""
    
    if not HAVE_MODULE:
        logger.error("渗流-结构耦合分析模块未找到，无法运行示例")
        return False
        
    logger.info("开始运行渗流-结构耦合分析示例")
    
    # 创建渗流-结构耦合分析对象
    coupling = SeepageStructureCoupling()
    
    # 设置分析参数
    coupling_settings = {
        "time_step": 0.1,              # 时间步长 (s)
        "total_time": 2.0,             # 总计算时间 (s)
        "convergence_tolerance": 1e-5, # 收敛容差
        "max_iterations": 20,          # 最大迭代次数
        "coupling_scheme": "staggered", # 耦合方案：monolithic/staggered
        "output_interval": 0.2         # 输出间隔
    }
    coupling.set_coupling_settings(coupling_settings)
    
    # 检查示例数据文件
    model_file = os.path.join(project_dir, "data", "mesh", "simple_box.mdpa")
    if not os.path.exists(model_file):
        logger.warning(f"示例数据文件不存在: {model_file}")
        logger.info("使用简化模型代替...")
        model_file = os.path.join(project_dir, "data", "mesh", "simple_box.vtk")
        if not os.path.exists(model_file):
            logger.error("无法找到示例数据文件，请先生成网格")
            return False
            
    # 导入模型
    success = coupling.import_model(model_file)
    if not success:
        logger.error("导入模型失败")
        return False
        
    # 设置材料属性
    materials_data = {
        "soil": {
            "density": 1800.0,         # kg/m³
            "young_modulus": 20000.0,  # kPa
            "poisson_ratio": 0.3,
            "permeability": 1e-6,      # m/s
            "porosity": 0.35
        },
        "concrete_wall": {
            "density": 2500.0,         # kg/m³
            "young_modulus": 30000000.0, # kPa
            "poisson_ratio": 0.2,
            "permeability": 1e-12,     # m/s (非常低)
            "porosity": 0.15
        }
    }
    coupling.setup_material_properties(materials_data)
    
    # 设置边界条件
    boundary_conditions = {
        "displacement": {
            # 底部固定
            "1": {"type": "fixed"},
            "2": {"type": "fixed"},
            "3": {"type": "fixed"},
            "4": {"type": "fixed"},
            # 侧边约束水平位移
            "5": {"type": "prescribed", "components": ["X"], "values": {"X": 0.0}},
            "6": {"type": "prescribed", "components": ["X"], "values": {"X": 0.0}},
            "7": {"type": "prescribed", "components": ["Y"], "values": {"Y": 0.0}},
            "8": {"type": "prescribed", "components": ["Y"], "values": {"Y": 0.0}}
        },
        "water_pressure": {
            # 水位线上的节点
            "9": {"type": "fixed", "value": 0.0},
            "10": {"type": "fixed", "value": 0.0},
            "11": {"type": "fixed", "value": 0.0},
            "12": {"type": "fixed", "value": 0.0},
            # 坑底的节点 (排水条件)
            "13": {"type": "fixed", "value": 0.0}
        },
        "load": {
            # 地表荷载
            "14": {"Z": -10.0},  # kPa
            "15": {"Z": -10.0}
        }
    }
    coupling.apply_boundary_conditions(boundary_conditions)
    
    # 初始化分析
    success = coupling.initialize_analysis()
    if not success:
        logger.error("初始化分析失败")
        return False
        
    # 运行分析
    logger.info("开始执行渗流-结构耦合分析")
    start_time = time.time()
    success = coupling.solve()
    elapsed_time = time.time() - start_time
    
    if not success:
        logger.error("求解过程失败")
        return False
    
    logger.info(f"渗流-结构耦合分析完成，用时 {elapsed_time:.2f}s")
    
    # 获取结果
    results = coupling.get_results()
    
    # 导出结果
    output_file = os.path.join(project_dir, "data", "results", "seepage_coupling_results.vtk")
    coupling.export_results(output_file)
    
    # 显示一些关键结果
    if results:
        logger.info("分析结果摘要:")
        
        # 找出最大位移
        max_disp = {"X": 0.0, "Y": 0.0, "Z": 0.0}
        for node_id, disp in results["displacement"].items():
            max_disp["X"] = max(max_disp["X"], abs(disp["X"]))
            max_disp["Y"] = max(max_disp["Y"], abs(disp["Y"]))
            max_disp["Z"] = max(max_disp["Z"], abs(disp["Z"]))
            
        logger.info(f"最大位移: X={max_disp['X']:.5f}m, Y={max_disp['Y']:.5f}m, Z={max_disp['Z']:.5f}m")
    
    return True

def plot_results():
    """绘制结果图表(仅用于演示)"""
    
    # 这里只是创建一个示例图表，实际应用中应该使用真实数据
    
    # 创建时间步和位移数据(模拟数据)
    time_steps = np.linspace(0, 2.0, 21)  # 0到2.0秒，21个点
    vertical_disp = -0.05 * (1 - np.exp(-2.0 * time_steps))  # 模拟垂直位移曲线
    water_pressure = 10.0 * (1 - np.exp(-1.5 * time_steps))  # 模拟水压变化曲线
    
    # 创建图形
    plt.figure(figsize=(12, 6))
    
    # 第一个子图: 位移
    plt.subplot(1, 2, 1)
    plt.plot(time_steps, vertical_disp, 'b-', linewidth=2)
    plt.xlabel('时间 (s)')
    plt.ylabel('垂直位移 (m)')
    plt.title('坑底中心点垂直位移随时间变化')
    plt.grid(True)
    
    # 第二个子图: 水压力
    plt.subplot(1, 2, 2)
    plt.plot(time_steps, water_pressure, 'r-', linewidth=2)
    plt.xlabel('时间 (s)')
    plt.ylabel('水压力 (kPa)')
    plt.title('典型点水压力随时间变化')
    plt.grid(True)
    
    # 调整布局并保存
    plt.tight_layout()
    
    # 保存图表
    output_dir = os.path.join(project_dir, "data", "results")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    plt.savefig(os.path.join(output_dir, "seepage_coupling_results.png"), dpi=300)
    logger.info(f"结果图表已保存到: {os.path.join(output_dir, 'seepage_coupling_results.png')}")
    
    # 显示图表(如果在交互式环境中)
    # plt.show()

def main():
    """主函数"""
    print("="*80)
    print("渗流-结构耦合分析示例")
    print("="*80)
    
    # 检查依赖
    if not HAVE_MODULE:
        print("错误：无法导入必要的模块。请确保已正确安装所有依赖。")
        return
    
    # 运行耦合分析
    success = run_basic_coupling_analysis()
    
    # 无论分析成功与否，都绘制示例图表
    # 实际应用中应该使用真实的分析结果
    try:
        plot_results()
    except Exception as e:
        logger.error(f"绘制结果图表时出错: {str(e)}")
    
    if success:
        print("\n分析成功完成！")
    else:
        print("\n分析过程中遇到错误，请查看日志了解详细信息。")
    
    print("\n注：由于可能缺少Kratos依赖，本示例可能无法完全执行。")
    print("这只是一个演示如何使用渗流-结构耦合分析模块的示例。")
    print("="*80)

if __name__ == "__main__":
    main()
