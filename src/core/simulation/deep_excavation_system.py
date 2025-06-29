#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file deep_excavation_system.py
@description 深基坑CAE系统主控模块，整合物理AI系统和CAE分析功能
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import numpy as np
import pandas as pd
import json
import logging
import time
from pathlib import Path
from typing import Dict, List, Tuple, Union, Optional, Any
from enum import Enum

# 导入CAE模块
from src.core.simulation.terra_wrapper import TerraWrapper
from src.core.simulation.compute_base import (
    ComputeBase, 
    AnalysisType, 
    MaterialModelType, 
    ElementType,
    LoadType,
    BoundaryType,
    SolverType,
    ResultType
)

# 导入物理AI系统
from src.ai.physics_ai_system import PhysicsAISystem

# 导入网格模块
from src.core.meshing.gmsh_wrapper import GmshWrapper
from src.core.meshing.models import MeshingParameters

# 配置日志
logs_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "logs")
os.makedirs(logs_dir, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(logs_dir, "deep_excavation_system.log"), mode="a", encoding="utf-8")
    ]
)
logger = logging.getLogger("DeepExcavationSystem")

class ExcavationStageType(Enum):
    """开挖阶段类型枚举"""
    INITIAL = "initial"              # 初始阶段
    EXCAVATION = "excavation"        # 开挖阶段
    SUPPORT = "support"              # 支护阶段
    DEWATERING = "dewatering"        # 降水阶段
    CONSOLIDATION = "consolidation"  # 固结阶段
    CONSTRUCTION = "construction"    # 施工阶段
    COMPLETION = "completion"        # 完工阶段

class DeepExcavationSystem:
    """深基坑CAE系统主控类，整合物理AI系统和CAE分析功能"""
    
    def __init__(
        self,
        project_id: int,
        project_name: str,
        work_dir: str = None,
        config: Dict[str, Any] = None
    ):
        """
        初始化深基坑CAE系统
        
        参数:
            project_id: 项目ID
            project_name: 项目名称
            work_dir: 工作目录
            config: 配置参数
        """
        self.project_id = project_id
        self.project_name = project_name
        self.config = config or {}
        
        # 设置工作目录
        if work_dir is None:
            self.work_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 
                                        "data", "projects", f"project_{project_id}")
        else:
            self.work_dir = work_dir
        
        # 创建项目目录结构
        self.mesh_dir = os.path.join(self.work_dir, "mesh")
        self.model_dir = os.path.join(self.work_dir, "model")
        self.results_dir = os.path.join(self.work_dir, "results")
        self.sensor_data_dir = os.path.join(self.work_dir, "sensor_data")
        self.ai_models_dir = os.path.join(self.work_dir, "ai_models")
        
        os.makedirs(self.mesh_dir, exist_ok=True)
        os.makedirs(self.model_dir, exist_ok=True)
        os.makedirs(self.results_dir, exist_ok=True)
        os.makedirs(self.sensor_data_dir, exist_ok=True)
        os.makedirs(self.ai_models_dir, exist_ok=True)
        
        # 初始化CAE引擎
        try:
            self.cae_engine = TerraWrapper()
            logger.info("CAE引擎初始化成功")
        except Exception as e:
            self.cae_engine = None
            logger.error(f"CAE引擎初始化失败: {str(e)}")
        
        # 初始化物理AI系统
        try:
            self.physics_ai = PhysicsAISystem(
                project_id=project_id,
                data_dir=self.work_dir,
                models_dir=self.ai_models_dir,
                results_dir=os.path.join(self.results_dir, "ai")
            )
            logger.info("物理AI系统初始化成功")
        except Exception as e:
            self.physics_ai = None
            logger.error(f"物理AI系统初始化失败: {str(e)}")
        
        # 初始化网格生成器
        try:
            self.mesher = GmshWrapper()
            logger.info("网格生成器初始化成功")
        except Exception as e:
            self.mesher = None
            logger.error(f"网格生成器初始化失败: {str(e)}")
        
        # 项目状态
        self.project_status = {
            "created_at": time.time(),
            "last_modified": time.time(),
            "mesh_status": "not_created",
            "model_status": "not_created",
            "analysis_status": "not_run",
            "ai_status": "not_initialized",
            "stages": []
        }
        
        # 保存项目配置
        self._save_project_config()
        
        logger.info(f"初始化深基坑CAE系统，项目ID: {project_id}, 项目名称: {project_name}")
    
    def _save_project_config(self):
        """保存项目配置"""
        config_file = os.path.join(self.work_dir, "project_config.json")
        
        config_data = {
            "project_id": self.project_id,
            "project_name": self.project_name,
            "created_at": time.time(),
            "last_modified": time.time(),
            "config": self.config,
            "status": self.project_status
        }
        
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config_data, f, indent=2)
        
        logger.info(f"保存项目配置: {config_file}")
    
    def create_geometry(self, geometry_params: Dict[str, Any]) -> str:
        """
        创建几何模型
        
        参数:
            geometry_params: 几何参数
            
        返回:
            几何文件路径
        """
        if self.mesher is None:
            raise RuntimeError("网格生成器未初始化")
        
        # 提取几何参数
        width = geometry_params.get("width", 100.0)
        length = geometry_params.get("length", 100.0)
        depth = geometry_params.get("depth", 30.0)
        excavation_width = geometry_params.get("excavation_width", 50.0)
        excavation_length = geometry_params.get("excavation_length", 50.0)
        excavation_depth = geometry_params.get("excavation_depth", 15.0)
        
        # 创建几何文件
        geo_file = os.path.join(self.mesh_dir, f"{self.project_name}_geometry.geo")
        
        # 调用网格生成器创建几何
        self.mesher.create_box_excavation(
            geo_file=geo_file,
            width=width,
            length=length,
            depth=depth,
            excavation_width=excavation_width,
            excavation_length=excavation_length,
            excavation_depth=excavation_depth
        )
        
        # 更新项目状态
        self.project_status["geometry_file"] = geo_file
        self.project_status["last_modified"] = time.time()
        self._save_project_config()
        
        logger.info(f"创建几何模型: {geo_file}")
        return geo_file
    
    def generate_mesh(self, mesh_params: Dict[str, Any]) -> str:
        """
        生成有限元网格
        
        参数:
            mesh_params: 网格参数
            
        返回:
            网格文件路径
        """
        if self.mesher is None:
            raise RuntimeError("网格生成器未初始化")
        
        # 检查几何文件
        if "geometry_file" not in self.project_status:
            raise ValueError("请先创建几何模型")
        
        geo_file = self.project_status["geometry_file"]
        
        # 提取网格参数
        mesh_size = mesh_params.get("mesh_size", 2.0)
        mesh_algorithm = mesh_params.get("algorithm", 6)  # 默认使用Frontal-Delaunay算法
        mesh_format = mesh_params.get("format", "msh")
        
        # 创建网格参数对象
        meshing_params = MeshingParameters(
            mesh_size=mesh_size,
            algorithm=mesh_algorithm,
            dimension=3,
            order=2  # 二阶单元
        )
        
        # 生成网格
        mesh_file = os.path.join(self.mesh_dir, f"{self.project_name}_mesh.{mesh_format}")
        
        self.mesher.generate_mesh(
            geo_file=geo_file,
            mesh_file=mesh_file,
            parameters=meshing_params
        )
        
        # 更新项目状态
        self.project_status["mesh_file"] = mesh_file
        self.project_status["mesh_status"] = "created"
        self.project_status["last_modified"] = time.time()
        self._save_project_config()
        
        logger.info(f"生成网格: {mesh_file}")
        return mesh_file
    
    def create_model(self, model_params: Dict[str, Any]) -> str:
        """
        创建计算模型
        
        参数:
            model_params: 模型参数
            
        返回:
            模型文件路径
        """
        if self.cae_engine is None:
            raise RuntimeError("CAE引擎未初始化")
        
        # 检查网格文件
        if "mesh_file" not in self.project_status or self.project_status["mesh_status"] != "created":
            raise ValueError("请先生成有效的网格")
        
        mesh_file = self.project_status["mesh_file"]
        
        # 设置网格文件
        self.cae_engine.set_mesh(mesh_file)
        
        # 创建模型
        model_name = model_params.get("name", self.project_name)
        output_dir = os.path.join(self.model_dir, model_name)
        os.makedirs(output_dir, exist_ok=True)
        
        model_file = self.cae_engine.create_model(model_name, output_dir)
        
        # 添加土层材料
        soil_layers = model_params.get("soil_layers", [])
        for layer in soil_layers:
            self.cae_engine.add_soil_layer(
                name=layer["name"],
                material_model=layer["material_model"],
                parameters=layer["parameters"],
                group_id=layer.get("group_id")
            )
        
        # 添加边界条件
        boundary_conditions = model_params.get("boundary_conditions", [])
        for bc in boundary_conditions:
            self.cae_engine.add_boundary_condition(
                bc_type=bc["type"],
                entities=bc["entities"],
                values=bc.get("values")
            )
        
        # 添加荷载
        loads = model_params.get("loads", [])
        for load in loads:
            self.cae_engine.add_load(
                load_type=load["type"],
                entities=load["entities"],
                values=load["values"],
                stage=load.get("stage", 0)
            )
        
        # 添加开挖阶段
        excavation_stages = model_params.get("excavation_stages", [])
        for stage in excavation_stages:
            self.cae_engine.add_excavation_stage(
                name=stage["name"],
                excavation_entities=stage["entities"],
                water_level=stage.get("water_level"),
                time_step=stage.get("time_step", 1.0)
            )
        
        # 更新项目状态
        self.project_status["model_file"] = model_file
        self.project_status["model_status"] = "created"
        self.project_status["last_modified"] = time.time()
        self._save_project_config()
        
        logger.info(f"创建计算模型: {model_file}")
        return model_file
    
    def run_analysis(self, analysis_params: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        运行分析
        
        参数:
            analysis_params: 分析参数
            
        返回:
            分析结果
        """
        if self.cae_engine is None:
            raise RuntimeError("CAE引擎未初始化")
        
        # 检查模型文件
        if "model_file" not in self.project_status or self.project_status["model_status"] != "created":
            raise ValueError("请先创建有效的计算模型")
        
        # 设置分析参数
        analysis_params = analysis_params or {}
        num_threads = analysis_params.get("num_threads", None)
        
        # 运行分析
        start_time = time.time()
        result = self.cae_engine.run_analysis(num_threads=num_threads)
        end_time = time.time()
        
        # 导出结果
        result_file = os.path.join(self.results_dir, f"{self.project_name}_results.vtk")
        self.cae_engine.export_vtk(result_file)
        
        # 更新项目状态
        self.project_status["analysis_status"] = "completed"
        self.project_status["analysis_time"] = end_time - start_time
        self.project_status["result_file"] = result_file
        self.project_status["last_modified"] = time.time()
        self._save_project_config()
        
        logger.info(f"分析完成，耗时: {end_time - start_time:.2f}秒，结果文件: {result_file}")
        
        # 返回分析结果摘要
        return {
            "status": "completed",
            "analysis_time": end_time - start_time,
            "result_file": result_file
        }
    
    def run_integrated_analysis(self, integrated_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        运行集成分析（CAE + AI）
        
        参数:
            integrated_params: 集成分析参数
            
        返回:
            集成分析结果
        """
        if self.physics_ai is None:
            raise RuntimeError("物理AI系统未初始化")
        
        # 检查模型文件
        if "model_file" not in self.project_status:
            raise ValueError("请先创建有效的计算模型")
        
        model_file = self.project_status["model_file"]
        
        # 提取参数
        sensor_data_config = integrated_params.get("sensor_data_config", {})
        pinn_config = integrated_params.get("pinn_config", {})
        cae_config = integrated_params.get("cae_config", {})
        
        # 运行集成分析
        task_ids = self.physics_ai.run_integrated_analysis(
            model_file=model_file,
            sensor_data_config=sensor_data_config,
            pinn_config=pinn_config,
            cae_config=cae_config
        )
        
        # 更新项目状态
        self.project_status["ai_status"] = "running"
        self.project_status["ai_task_ids"] = task_ids
        self.project_status["last_modified"] = time.time()
        self._save_project_config()
        
        logger.info(f"启动集成分析，任务ID: {task_ids}")
        
        return {
            "status": "running",
            "task_ids": task_ids
        }
    
    def get_analysis_status(self) -> Dict[str, Any]:
        """
        获取分析状态
        
        返回:
            分析状态
        """
        # 如果有AI任务，检查AI任务状态
        if "ai_task_ids" in self.project_status and self.physics_ai is not None:
            ai_status = {}
            for task_type, task_id in self.project_status["ai_task_ids"].items():
                ai_status[task_type] = self.physics_ai.get_task_status(task_id)
            
            # 更新项目状态
            all_completed = all(status["status"] == "completed" for status in ai_status.values())
            if all_completed:
                self.project_status["ai_status"] = "completed"
            
            self.project_status["ai_tasks_status"] = ai_status
            self.project_status["last_modified"] = time.time()
            self._save_project_config()
        
        return self.project_status
    
    def get_results(self, result_type: str, stage_index: int = -1) -> Dict[str, Any]:
        """
        获取分析结果
        
        参数:
            result_type: 结果类型
            stage_index: 阶段索引
            
        返回:
            分析结果
        """
        if self.cae_engine is None:
            raise RuntimeError("CAE引擎未初始化")
        
        # 检查是否已完成分析
        if self.project_status["analysis_status"] != "completed":
            raise ValueError("分析尚未完成")
        
        # 获取结果
        return self.cae_engine.get_results(result_type, stage_index)
    
    def export_results(self, output_file: str, format: str = "vtk", stage_index: int = -1) -> str:
        """
        导出分析结果
        
        参数:
            output_file: 输出文件路径
            format: 输出格式
            stage_index: 阶段索引
            
        返回:
            输出文件路径
        """
        if self.cae_engine is None:
            raise RuntimeError("CAE引擎未初始化")
        
        # 检查是否已完成分析
        if self.project_status["analysis_status"] != "completed":
            raise ValueError("分析尚未完成")
        
        # 导出结果
        return self.cae_engine.export_vtk(output_file, stage_index)
    
    def import_sensor_data(self, sensor_data_file: str, sensor_type: str) -> Dict[str, Any]:
        """
        导入传感器数据
        
        参数:
            sensor_data_file: 传感器数据文件
            sensor_type: 传感器类型
            
        返回:
            导入结果
        """
        if self.physics_ai is None:
            raise RuntimeError("物理AI系统未初始化")
        
        # 复制传感器数据到项目目录
        import shutil
        target_file = os.path.join(self.sensor_data_dir, os.path.basename(sensor_data_file))
        shutil.copy(sensor_data_file, target_file)
        
        # 提交数据处理任务
        task_id = self.physics_ai.submit_task(
            task_type="data_fusion",
            data_file=target_file,
            sensor_type=sensor_type
        )
        
        # 更新项目状态
        if "sensor_data" not in self.project_status:
            self.project_status["sensor_data"] = []
        
        self.project_status["sensor_data"].append({
            "file": target_file,
            "type": sensor_type,
            "imported_at": time.time(),
            "task_id": task_id
        })
        
        self.project_status["last_modified"] = time.time()
        self._save_project_config()
        
        logger.info(f"导入传感器数据: {target_file}, 类型: {sensor_type}, 任务ID: {task_id}")
        
        return {
            "status": "processing",
            "task_id": task_id,
            "file": target_file
        }
    
    def train_pinn_model(self, pinn_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        训练PINN模型
        
        参数:
            pinn_params: PINN参数
            
        返回:
            训练结果
        """
        if self.physics_ai is None:
            raise RuntimeError("物理AI系统未初始化")
        
        # 提交PINN训练任务
        task_id = self.physics_ai.submit_task(
            task_type="pinn_training",
            **pinn_params
        )
        
        # 更新项目状态
        if "pinn_models" not in self.project_status:
            self.project_status["pinn_models"] = []
        
        self.project_status["pinn_models"].append({
            "params": pinn_params,
            "trained_at": time.time(),
            "task_id": task_id
        })
        
        self.project_status["last_modified"] = time.time()
        self._save_project_config()
        
        logger.info(f"训练PINN模型，任务ID: {task_id}")
        
        return {
            "status": "training",
            "task_id": task_id
        }
    
    def run_inverse_analysis(self, inverse_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        运行反演分析
        
        参数:
            inverse_params: 反演参数
            
        返回:
            反演结果
        """
        if self.physics_ai is None:
            raise RuntimeError("物理AI系统未初始化")
        
        # 提交反演分析任务
        task_id = self.physics_ai.submit_task(
            task_type="inverse_analysis",
            **inverse_params
        )
        
        # 更新项目状态
        if "inverse_analysis" not in self.project_status:
            self.project_status["inverse_analysis"] = []
        
        self.project_status["inverse_analysis"].append({
            "params": inverse_params,
            "submitted_at": time.time(),
            "task_id": task_id
        })
        
        self.project_status["last_modified"] = time.time()
        self._save_project_config()
        
        logger.info(f"运行反演分析，任务ID: {task_id}")
        
        return {
            "status": "running",
            "task_id": task_id
        }







