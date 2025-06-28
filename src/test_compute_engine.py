#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
测试计算引擎
包括材料模型、荷载、边界条件和计算功能
"""

import os
import sys
import time
import logging
import json
from core.simulation.models import ComputeEngine
from core.meshing.gmsh_wrapper import GmshWrapper, FragmentType, MeshAlgorithm

def setup_logging():
    """设置日志"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("compute_test.log", mode='w', encoding='utf-8')
        ]
    )
    return logging.getLogger("ComputeTest")

def create_test_mesh():
    """创建测试网格"""
    logger = logging.getLogger("MeshTest")
    logger.info("创建测试网格...")
    
    # 创建Gmsh包装器
    gmsh = GmshWrapper(verbose=True)
    
    # 创建新模型
    gmsh.create_new_model("excavation_test")
    
    # 创建土体域 (50x50x30)
    soil_box = gmsh.add_box(0, 0, 0, 50, 50, 30)
    
    # 创建挖坑区域 (30x30x15)，中心与soil_box相同
    excavation = gmsh.add_box(10, 10, 0, 30, 30, 15)
    
    # 创建支护结构 (壁厚0.5)
    wall_outer = gmsh.add_box(9.5, 9.5, 0, 31, 31, 20)
    wall_inner = gmsh.add_box(10, 10, 0, 30, 30, 20)
    wall = gmsh.boolean_difference(wall_outer, wall_inner)
    
    # 对挖坑区域进行更精细的网格剖分
    gmsh.add_mesh_field_box(12, excavation, 0.8)
    
    # 对支护结构进行更精细的网格剖分
    gmsh.add_mesh_field_box(13, wall, 0.5)
    
    # 设置全局网格参数
    gmsh.set_mesh_size(2.0)
    
    # 同步模型
    gmsh.synchronize()
    
    # 设置物理组
    soil_group = gmsh.add_physical_group(3, [soil_box], "Soil")
    excavation_group = gmsh.add_physical_group(3, [excavation], "Excavation")
    wall_group = gmsh.add_physical_group(3, [wall], "Wall")
    
    # 底面固定边界
    bottom_surface, _ = gmsh.get_boundary(soil_box)
    bottom_surfaces = [s for s in bottom_surface if gmsh.get_center_of_mass(s)[2] < 0.1]
    bottom_group = gmsh.add_physical_group(2, bottom_surfaces, "Bottom")
    
    # 侧面固定边界
    side_surfaces = [s for s in bottom_surface if s not in bottom_surfaces and gmsh.get_center_of_mass(s)[2] > 0.1]
    side_group = gmsh.add_physical_group(2, side_surfaces, "Side")
    
    # 生成网格
    gmsh.generate_mesh(dim=3, algorithm=MeshAlgorithm.DELAUNAY)
    
    # 保存网格
    mesh_dir = "./data/mesh"
    os.makedirs(mesh_dir, exist_ok=True)
    
    msh_file = os.path.join(mesh_dir, "excavation_test.msh")
    gmsh.save_mesh(msh_file)
    
    vtk_file = os.path.join(mesh_dir, "excavation_test.vtk")
    gmsh.save_mesh(vtk_file, format="vtk")
    
    logger.info(f"测试网格已保存到: {msh_file}")
    
    # 返回网格文件路径和物理组信息
    groups = {
        "soil": soil_group,
        "excavation": excavation_group,
        "wall": wall_group,
        "bottom": bottom_group,
        "side": side_group
    }
    
    # 释放Gmsh资源
    gmsh.finalize()
    
    return msh_file, groups

def test_basic_compute():
    """测试基本计算功能"""
    logger = setup_logging()
    logger.info("开始测试计算引擎基本功能...")
    
    # 创建测试网格
    mesh_file, groups = create_test_mesh()
    
    # 创建计算引擎
    engine = ComputeEngine()
    
    # 启动计算任务
    task_id = engine.solve(
        mesh_file=mesh_file,
        analysis_type="static",
        soil_model="mohr_coulomb",
        max_iterations=100,
        tolerance=1e-6,
        load_steps=1,
        gravity=[0, 0, -9.8],
        advanced_settings={
            "material_params": {
                "young_modulus": 3.0e7,  # Pa
                "poisson_ratio": 0.3,
                "density": 2000.0,       # kg/m³
                "cohesion": 20000.0,     # Pa
                "friction_angle": 30.0,  # degrees
                "dilatancy_angle": 0.0   # degrees
            }
        }
    )
    
    logger.info(f"计算任务已启动: {task_id}")
    
    # 等待计算完成
    max_wait = 30  # 最多等待30秒
    for _ in range(max_wait):
        status = engine.get_status(task_id)
        logger.info(f"计算状态: {status.get('status', 'unknown')}, 进度: {status.get('progress', 0)}%")
        
        if status.get("status") == "completed":
            logger.info("计算已完成!")
            break
        elif status.get("status") == "failed":
            logger.error(f"计算失败: {status.get('error', 'unknown error')}")
            break
        
        time.sleep(1)
    
    # 获取计算结果
    logger.info("获取计算结果...")
    displacement = engine.get_results(task_id, "displacement")
    stress = engine.get_results(task_id, "stress")
    
    logger.info(f"位移结果: {displacement}")
    logger.info(f"应力结果: {stress}")
    
    # 导出结果
    result_file = engine.export_results(task_id, "vtk")
    logger.info(f"结果已导出到: {result_file}")
    
    return task_id

def test_advanced_compute():
    """测试高级计算功能"""
    logger = setup_logging()
    logger.info("开始测试计算引擎高级功能...")
    
    # 创建测试网格
    mesh_file, groups = create_test_mesh()
    
    # 创建计算引擎
    engine = ComputeEngine()
    
    # 创建任务
    task_id = engine.create_task_id() if hasattr(engine, "create_task_id") else str(hash(mesh_file) % 10000)
    
    # 加载网格
    if hasattr(engine, "load_mesh"):
        success = engine.load_mesh(mesh_file)
        if not success:
            logger.error(f"加载网格失败: {mesh_file}")
            return None
    
    # 设置分析类型
    if hasattr(engine, "set_analysis_type"):
        engine.set_analysis_type(task_id, "static")
    
    # 添加材料
    logger.info("添加材料...")
    
    # 土体材料
    soil_params = {
        "young_modulus": 3.0e7,  # Pa
        "poisson_ratio": 0.3,
        "density": 2000.0,       # kg/m³
        "cohesion": 20000.0,     # Pa
        "friction_angle": 30.0   # degrees
    }
    
    if hasattr(engine, "add_material"):
        soil_id = engine.add_material(task_id, "土体", "mohr_coulomb", soil_params, [groups["soil"]])
        logger.info(f"添加土体材料: {soil_id}")
        
        # 支护结构材料
        wall_params = {
            "young_modulus": 2.8e10,  # Pa
            "poisson_ratio": 0.2,
            "density": 2500.0        # kg/m³
        }
        
        wall_id = engine.add_material(task_id, "支护结构", "linear_elastic", wall_params, [groups["wall"]])
        logger.info(f"添加支护结构材料: {wall_id}")
    
    # 设置单元类型
    if hasattr(engine, "set_element_type"):
        engine.set_element_type(task_id, "solid", [groups["soil"], groups["excavation"]])
        engine.set_element_type(task_id, "solid", [groups["wall"]])
    
    # 添加边界条件
    logger.info("添加边界条件...")
    if hasattr(engine, "add_boundary_condition"):
        # 底部固定
        bc_bottom = engine.add_boundary_condition(task_id, "fixed", [groups["bottom"]])
        logger.info(f"添加底部固定边界: {bc_bottom}")
        
        # 侧面水平方向固定
        bc_side_x = engine.add_boundary_condition(task_id, "displacement", [groups["side"]], [0, None, None])
        logger.info(f"添加侧面X方向固定边界: {bc_side_x}")
        
        bc_side_y = engine.add_boundary_condition(task_id, "displacement", [groups["side"]], [None, 0, None])
        logger.info(f"添加侧面Y方向固定边界: {bc_side_y}")
    
    # 添加荷载
    logger.info("添加荷载...")
    if hasattr(engine, "add_load"):
        # 重力荷载
        load_gravity = engine.add_load(task_id, "body_force", 
                                      [groups["soil"], groups["wall"], groups["excavation"]], 
                                      [0, 0, -9.8])
        logger.info(f"添加重力荷载: {load_gravity}")
    
    # 添加开挖阶段
    logger.info("添加开挖阶段...")
    if hasattr(engine, "add_excavation_stage"):
        # 第1阶段：开挖上半部分
        stage1 = engine.add_excavation_stage(
            task_id, 
            "第一阶段", 
            [groups["excavation"]],
            water_level=10.0
        )
        logger.info(f"添加开挖阶段1: {stage1}")
    
    # 设置求解器参数
    logger.info("设置求解器参数...")
    if hasattr(engine, "set_solver_settings"):
        solver_settings = {
            "max_iterations": 200,
            "tolerance": 1e-6,
            "load_steps": 5,
            "num_threads": 4
        }
        
        engine.set_solver_settings(task_id, "direct", solver_settings)
    
    # 运行计算
    logger.info("开始计算...")
    if hasattr(engine, "run_analysis"):
        success = engine.run_analysis(task_id)
        if not success:
            logger.error("计算失败")
            return task_id
    
    # 等待计算完成
    max_wait = 30  # 最多等待30秒
    for _ in range(max_wait):
        status = engine.get_status(task_id)
        logger.info(f"计算状态: {status.get('status', 'unknown')}, 进度: {status.get('progress', 0)}%")
        
        if status.get("status") == "completed":
            logger.info("计算已完成!")
            break
        elif status.get("status") == "failed":
            logger.error(f"计算失败: {status.get('error', 'unknown error')}")
            break
        
        time.sleep(1)
    
    # 获取计算结果
    logger.info("获取计算结果...")
    displacement = engine.get_results(task_id, "displacement")
    stress = engine.get_results(task_id, "stress")
    
    logger.info(f"位移结果: {displacement}")
    logger.info(f"应力结果: {stress}")
    
    # 导出结果
    if hasattr(engine, "export_results"):
        result_file = engine.export_results(task_id, "vtk")
        logger.info(f"结果已导出到: {result_file}")
    
    return task_id

def test_import_export():
    """测试导入导出功能"""
    logger = setup_logging()
    logger.info("开始测试导入导出功能...")
    
    # 创建计算引擎
    engine = ComputeEngine()
    
    # 创建测试网格和模型
    mesh_file, groups = create_test_mesh()
    
    # 先创建一个简单模型
    task_id = test_basic_compute()
    
    if not task_id:
        logger.error("创建测试模型失败")
        return
    
    # 导出不同格式
    logger.info("测试模型导出...")
    
    # 创建导出目录
    export_dir = "./data/export"
    os.makedirs(export_dir, exist_ok=True)
    
    formats = ["terra_json", "midas_fpn", "abaqus_inp"]
    for format in formats:
        if hasattr(engine, "export_model"):
            output_file = os.path.join(export_dir, f"model_{format}.{format}")
            try:
                result_file = engine.export_model(task_id, output_file, format)
                if result_file:
                    logger.info(f"导出 {format} 成功: {result_file}")
                else:
                    logger.warning(f"导出 {format} 返回空")
            except Exception as e:
                logger.error(f"导出 {format} 失败: {e}")
    
    # 测试导入
    logger.info("测试模型导入...")
    
    # 选择已导出的文件进行导入测试
    terra_json_file = os.path.join(export_dir, "model_terra_json.terra_json")
    if os.path.exists(terra_json_file) and hasattr(engine, "import_model"):
        try:
            new_task_id = engine.import_model(terra_json_file, "terra_json")
            if new_task_id:
                logger.info(f"导入模型成功，新任务ID: {new_task_id}")
                
                # 尝试运行导入的模型
                if hasattr(engine, "run_analysis"):
                    success = engine.run_analysis(new_task_id)
                    if success:
                        logger.info("导入模型计算成功")
                    else:
                        logger.error("导入模型计算失败")
            else:
                logger.warning("导入模型失败，返回空任务ID")
        except Exception as e:
            logger.error(f"导入模型失败: {e}")
    
    return task_id

def main():
    """主函数"""
    logger = setup_logging()
    logger.info("计算引擎测试开始...")
    
    # 测试基本计算功能
    logger.info("=== 测试1：基本计算功能 ===")
    test_basic_compute()
    
    # 测试高级计算功能
    logger.info("=== 测试2：高级计算功能 ===")
    test_advanced_compute()
    
    # 测试导入导出功能
    logger.info("=== 测试3：导入导出功能 ===")
    test_import_export()
    
    logger.info("计算引擎测试完成!")

if __name__ == "__main__":
    main() 