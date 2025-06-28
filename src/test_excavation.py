#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""深基坑测试案例
测试从建模到计算到可视化的完整流程
"""

import os
import sys
import logging
import json
import time
import subprocess
import numpy as np
from pathlib import Path

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("TestExcavation")

# 确保数据目录存在
os.makedirs("data/mesh", exist_ok=True)
os.makedirs("data/results", exist_ok=True)

def create_excavation_mesh():
    """创建深基坑网格"""
    logger.info("开始创建深基坑网格...")
    
    # 使用Gmsh创建网格
    try:
        # 检查Gmsh是否可用
        try:
            import gmsh
            gmsh_available = True
        except ImportError:
            logger.warning("Gmsh Python API导入失败，无法创建网格")
            raise ImportError("Gmsh Python API不可用，请安装gmsh包")
            
        # 设置网格参数
        length = 50.0  # 基坑长度 (m)
        width = 50.0   # 基坑宽度 (m)
        depth = 35.0   # 基坑深度 (m)
        soil_depth = 50.0  # 土层总深度 (m)
        element_size = 0.5  # 网格单元大小 (m)
        
        # 输出文件
        mesh_file = os.path.join("data", "mesh", f"excavation_{length}x{width}x{depth}.msh")
        geo_file = os.path.join("data", "mesh", f"excavation_{length}x{width}x{depth}.geo")
        
        # 计算几何参数
        boundary_extension = max(length, width) * 2
        x_min = -boundary_extension
        x_max = length + boundary_extension
        y_min = -boundary_extension
        y_max = width + boundary_extension
        z_min = -soil_depth
        z_max = 0.0  # 地表高程为0
        
        # 使用Gmsh Python API
        gmsh.initialize()
        gmsh.model.add("DeepExcavation")
        
        # 创建几何模型
        # 创建土体边界点
        p1 = gmsh.model.geo.addPoint(x_min, y_min, z_min)
        p2 = gmsh.model.geo.addPoint(x_max, y_min, z_min)
        p3 = gmsh.model.geo.addPoint(x_max, y_max, z_min)
        p4 = gmsh.model.geo.addPoint(x_min, y_max, z_min)
        p5 = gmsh.model.geo.addPoint(x_min, y_min, z_max)
        p6 = gmsh.model.geo.addPoint(x_max, y_min, z_max)
        p7 = gmsh.model.geo.addPoint(x_max, y_max, z_max)
        p8 = gmsh.model.geo.addPoint(x_min, y_max, z_max)
        
        # 创建基坑边界点
        p9 = gmsh.model.geo.addPoint(0, 0, z_max - depth)
        p10 = gmsh.model.geo.addPoint(length, 0, z_max - depth)
        p11 = gmsh.model.geo.addPoint(length, width, z_max - depth)
        p12 = gmsh.model.geo.addPoint(0, width, z_max - depth)
        
        # 创建底部面
        l1 = gmsh.model.geo.addLine(p1, p2)
        l2 = gmsh.model.geo.addLine(p2, p3)
        l3 = gmsh.model.geo.addLine(p3, p4)
        l4 = gmsh.model.geo.addLine(p4, p1)
        bottom_loop = gmsh.model.geo.addCurveLoop([l1, l2, l3, l4])
        bottom_surface = gmsh.model.geo.addPlaneSurface([bottom_loop])
        
        # 创建侧面
        l5 = gmsh.model.geo.addLine(p1, p5)
        l6 = gmsh.model.geo.addLine(p2, p6)
        l7 = gmsh.model.geo.addLine(p3, p7)
        l8 = gmsh.model.geo.addLine(p4, p8)
        
        # 创建顶部边界
        l9 = gmsh.model.geo.addLine(p5, p6)
        l10 = gmsh.model.geo.addLine(p6, p7)
        l11 = gmsh.model.geo.addLine(p7, p8)
        l12 = gmsh.model.geo.addLine(p8, p5)
        top_loop = gmsh.model.geo.addCurveLoop([l9, l10, l11, l12])
        
        # 创建基坑边界
        l13 = gmsh.model.geo.addLine(p9, p10)
        l14 = gmsh.model.geo.addLine(p10, p11)
        l15 = gmsh.model.geo.addLine(p11, p12)
        l16 = gmsh.model.geo.addLine(p12, p9)
        pit_loop = gmsh.model.geo.addCurveLoop([l13, l14, l15, l16])
        
        # 创建基坑面
        pit_surface = gmsh.model.geo.addPlaneSurface([pit_loop])
        
        # 创建顶部面（带基坑洞）
        top_surface = gmsh.model.geo.addPlaneSurface([top_loop, pit_loop])
        
        # 创建侧面
        side1 = gmsh.model.geo.addCurveLoop([l1, l6, -l9, -l5])
        side1_surface = gmsh.model.geo.addPlaneSurface([side1])
        
        side2 = gmsh.model.geo.addCurveLoop([l2, l7, -l10, -l6])
        side2_surface = gmsh.model.geo.addPlaneSurface([side2])
        
        side3 = gmsh.model.geo.addCurveLoop([l3, l8, -l11, -l7])
        side3_surface = gmsh.model.geo.addPlaneSurface([side3])
        
        side4 = gmsh.model.geo.addCurveLoop([l4, l5, -l12, -l8])
        side4_surface = gmsh.model.geo.addPlaneSurface([side4])
        
        # 创建基坑侧面
        # 连接基坑顶部点和底部点
        l17 = gmsh.model.geo.addLine(p5, p9)
        l18 = gmsh.model.geo.addLine(p6, p10)
        l19 = gmsh.model.geo.addLine(p7, p11)
        l20 = gmsh.model.geo.addLine(p8, p12)
        
        # 创建基坑侧面
        pit_side1 = gmsh.model.geo.addCurveLoop([l13, -l18, -l9, l17])
        pit_side1_surface = gmsh.model.geo.addPlaneSurface([pit_side1])
        
        pit_side2 = gmsh.model.geo.addCurveLoop([l14, -l19, -l10, l18])
        pit_side2_surface = gmsh.model.geo.addPlaneSurface([pit_side2])
        
        pit_side3 = gmsh.model.geo.addCurveLoop([l15, -l20, -l11, l19])
        pit_side3_surface = gmsh.model.geo.addPlaneSurface([pit_side3])
        
        pit_side4 = gmsh.model.geo.addCurveLoop([l16, -l17, -l12, l20])
        pit_side4_surface = gmsh.model.geo.addPlaneSurface([pit_side4])
        
        # 创建表面环
        surface_loop = gmsh.model.geo.addSurfaceLoop([
            bottom_surface, top_surface, 
            side1_surface, side2_surface, side3_surface, side4_surface,
            pit_surface,
            pit_side1_surface, pit_side2_surface, pit_side3_surface, pit_side4_surface
        ])
        
        # 创建体积
        volume = gmsh.model.geo.addVolume([surface_loop])
        
        # 同步几何模型
        gmsh.model.geo.synchronize()
        
        # 创建物理组
        # 1. 整个土体
        gmsh.model.addPhysicalGroup(3, [volume], 1)
        gmsh.model.setPhysicalName(3, 1, "Soil")
        
        # 2. 底部边界
        gmsh.model.addPhysicalGroup(2, [bottom_surface], 2)
        gmsh.model.setPhysicalName(2, 2, "BottomBoundary")
        
        # 3. 侧面边界
        gmsh.model.addPhysicalGroup(2, [side1_surface, side2_surface, side3_surface, side4_surface], 3)
        gmsh.model.setPhysicalName(2, 3, "SideBoundary")
        
        # 4. 顶部边界
        gmsh.model.addPhysicalGroup(2, [top_surface], 4)
        gmsh.model.setPhysicalName(2, 4, "TopBoundary")
        
        # 5. 基坑面
        gmsh.model.addPhysicalGroup(2, [pit_surface], 5)
        gmsh.model.setPhysicalName(2, 5, "PitBottom")
        
        # 6. 基坑侧面
        gmsh.model.addPhysicalGroup(2, [pit_side1_surface, pit_side2_surface, pit_side3_surface, pit_side4_surface], 6)
        gmsh.model.setPhysicalName(2, 6, "PitSide")
        
        # 设置网格大小
        gmsh.model.mesh.setSize(gmsh.model.getEntities(0), element_size)
        
        # 生成网格
        gmsh.model.mesh.generate(3)
        
        # 保存网格
        gmsh.write(mesh_file)
        
        # 保存几何文件
        gmsh.write(geo_file)
        
        # 获取网格信息
        nodes = gmsh.model.mesh.getNodeCount()
        elements = gmsh.model.mesh.getElementCount()
        
        # 转换为VTK格式（用于可视化）
        vtk_file = os.path.join("data", "mesh", f"excavation_{length}x{width}x{depth}.vtk")
        gmsh.write(vtk_file)
        
        # 释放资源
        gmsh.finalize()
        
        logger.info(f"使用Gmsh API创建网格成功，节点数: {nodes}，单元数: {elements}")
        
        return mesh_file, vtk_file
    except Exception as e:
        logger.error(f"创建网格失败: {str(e)}")
        raise

def run_simulation(mesh_file):
    """运行有限元分析"""
    logger.info("开始运行有限元分析...")
    
    try:
        # 导入Terra包装器
        from src.core.simulation.terra_wrapper import TerraWrapper
        
        # 创建Terra包装器
        terra = TerraWrapper()
        
        # 设置网格
        terra.set_mesh(mesh_file)
        
        # 创建计算模型
        model_name = "excavation_test"
        output_dir = os.path.join("data", "results")
        model_file = terra.create_model(model_name, output_dir)
        
        # 添加土层材料（线弹性本构）
        # 合理的土参数：
        # - 弹性模量：50MPa
        # - 泊松比：0.3
        # - 密度：2000kg/m³
        terra.add_soil_layer(
            name="土层",
            material_model="linear_elastic",
            parameters={
                "young_modulus": 5.0e7,  # Pa
                "poisson_ratio": 0.3,
                "density": 2000.0  # kg/m³
            }
        )
        
        # 添加边界条件
        # 底部固定
        terra.add_boundary_condition(
            bc_type="fixed",
            entities=["BottomBoundary"],
            values=[0.0, 0.0, 0.0]
        )
        
        # 侧面水平方向固定
        terra.add_boundary_condition(
            bc_type="roller",
            entities=["SideBoundary"],
            values=[0.0, 0.0, None]  # X和Y方向固定，Z方向自由
        )
        
        # 运行地应力平衡分析
        result_file = terra.run_analysis()
        
        # 导出VTK格式结果（用于可视化）
        vtk_result_file = os.path.join(output_dir, f"{model_name}_results.vtk")
        terra.export_vtk(vtk_result_file)
        
        return result_file, vtk_result_file
    except Exception as e:
        logger.error(f"运行有限元分析失败: {str(e)}")
        raise

def visualize_results(result_file, vtk_file=None):
    """可视化计算结果"""
    logger.info("开始可视化计算结果...")
    
    try:
        # 导入Trame服务器
        from src.core.visualization.trame_server import TrameServer, TRAME_AVAILABLE
        
        if not TRAME_AVAILABLE:
            logger.error("Trame不可用，无法可视化结果")
            return False
        
        # 创建结果文件副本（用于Trame服务器读取）
        trame_result_file = os.path.join("data", "results", "excavation_results.json")
        
        # 读取原始结果
        with open(result_file, 'r', encoding='utf-8') as f:
            results = json.load(f)
        
        # 添加网格文件路径
        if vtk_file and os.path.exists(vtk_file):
            results["mesh_file"] = vtk_file
        
        # 保存到Trame结果文件
        with open(trame_result_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
        
        # 创建Trame服务器
        server = TrameServer(port=8080)
        
        # 启动服务器
        success = server.start()
        
        if success:
            logger.info("Trame服务器启动成功，请访问 http://localhost:8080")
            return True
        else:
            logger.error("Trame服务器启动失败")
            return False
    except Exception as e:
        logger.error(f"可视化结果失败: {str(e)}")
        return False

def main():
    """主函数"""
    try:
        # 步骤1：创建网格
        logger.info("===== 步骤1：创建网格 =====")
        mesh_file, vtk_file = create_excavation_mesh()
        logger.info(f"网格文件: {mesh_file}")
        logger.info(f"VTK文件: {vtk_file}")
        
        # 步骤2：运行有限元分析
        logger.info("\n===== 步骤2：运行有限元分析 =====")
        result_file, vtk_result_file = run_simulation(mesh_file)
        logger.info(f"结果文件: {result_file}")
        logger.info(f"VTK结果文件: {vtk_result_file}")
        
        # 步骤3：可视化结果
        logger.info("\n===== 步骤3：可视化结果 =====")
        success = visualize_results(result_file, vtk_file)
        
        if success:
            logger.info("测试案例执行成功！")
        else:
            logger.warning("测试案例执行完成，但可视化失败")
    except Exception as e:
        logger.error(f"测试案例执行失败: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
