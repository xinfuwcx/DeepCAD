#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
@file test_excavation_system.py
@description 深基坑CAE系统单元测试
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

import os
import sys
import unittest
import tempfile
import json
import shutil
from pathlib import Path
from unittest import mock

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# 导入被测试模块
from src.core.simulation.deep_excavation_system import DeepExcavationSystem, ExcavationStageType
from src.utils.excavation_error_handler import (
    ExcavationError, ProjectError, GeometryError, MeshError, 
    ModelError, AnalysisError, AIError
)

class TestDeepExcavationSystem(unittest.TestCase):
    """深基坑CAE系统单元测试类"""

    def setUp(self):
        """测试前准备"""
        # 创建临时目录
        self.temp_dir = tempfile.mkdtemp(prefix="test_excavation_")
        
        # 创建测试项目
        self.project_id = 9999
        self.project_name = "test_project"
        
        # 模拟系统
        self.system = DeepExcavationSystem(
            project_id=self.project_id,
            project_name=self.project_name,
            work_dir=self.temp_dir
        )
        
        # 测试数据
        self.geometry_params = {
            "width": 100.0,
            "length": 100.0,
            "depth": 30.0,
            "excavation_width": 50.0,
            "excavation_length": 50.0,
            "excavation_depth": 15.0
        }
        
        self.mesh_params = {
            "mesh_size": 2.0,
            "algorithm": 6,
            "format": "msh"
        }
        
        self.model_params = {
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
                }
            ],
            "boundary_conditions": [
                {
                    "type": "fixed",
                    "entities": [1, 2, 3]
                }
            ],
            "loads": [
                {
                    "type": "surface_load",
                    "entities": [4, 5],
                    "values": [10000.0, 0.0, 0.0]
                }
            ],
            "excavation_stages": [
                {
                    "name": "第一阶段",
                    "entities": [6, 7],
                    "water_level": -5.0
                }
            ]
        }
        
        self.analysis_params = {
            "num_threads": 2
        }
        
        self.integrated_params = {
            "sensor_data_config": {
                "data_types": ["displacement", "stress"],
                "start_date": "20250101",
                "end_date": "20250201"
            },
            "pinn_config": {
                "pde_type": "elasticity",
                "layers": [20, 20, 20],
                "iterations": 1000
            },
            "cae_config": {
                "num_threads": 2
            }
        }
    
    def tearDown(self):
        """测试后清理"""
        # 删除临时目录
        shutil.rmtree(self.temp_dir)
    
    def test_initialization(self):
        """测试初始化"""
        self.assertEqual(self.system.project_id, self.project_id)
        self.assertEqual(self.system.project_name, self.project_name)
        self.assertEqual(self.system.work_dir, self.temp_dir)
        
        # 检查目录结构
        self.assertTrue(os.path.exists(self.system.mesh_dir))
        self.assertTrue(os.path.exists(self.system.model_dir))
        self.assertTrue(os.path.exists(self.system.results_dir))
        self.assertTrue(os.path.exists(self.system.sensor_data_dir))
        self.assertTrue(os.path.exists(self.system.ai_models_dir))
        
        # 检查项目状态
        self.assertIn("created_at", self.system.project_status)
        self.assertIn("last_modified", self.system.project_status)
        self.assertEqual(self.system.project_status["mesh_status"], "not_created")
        self.assertEqual(self.system.project_status["model_status"], "not_created")
        self.assertEqual(self.system.project_status["analysis_status"], "not_run")
        
        # 检查配置文件
        config_file = os.path.join(self.temp_dir, "project_config.json")
        self.assertTrue(os.path.exists(config_file))
        
        with open(config_file, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
            self.assertEqual(config_data["project_id"], self.project_id)
            self.assertEqual(config_data["project_name"], self.project_name)
    
    @mock.patch('src.core.meshing.gmsh_wrapper.GmshWrapper.create_box_excavation')
    def test_create_geometry(self, mock_create_box):
        """测试创建几何模型"""
        # 模拟几何创建
        mock_create_box.return_value = "test_geometry.geo"
        
        # 调用方法
        geo_file = self.system.create_geometry(self.geometry_params)
        
        # 验证结果
        self.assertIsNotNone(geo_file)
        self.assertTrue(mock_create_box.called)
        mock_create_box.assert_called_with(
            geo_file=os.path.join(self.system.mesh_dir, f"{self.project_name}_geometry.geo"),
            width=self.geometry_params["width"],
            length=self.geometry_params["length"],
            depth=self.geometry_params["depth"],
            excavation_width=self.geometry_params["excavation_width"],
            excavation_length=self.geometry_params["excavation_length"],
            excavation_depth=self.geometry_params["excavation_depth"]
        )
        
        # 检查项目状态
        self.assertIn("geometry_file", self.system.project_status)
    
    @mock.patch('src.core.meshing.gmsh_wrapper.GmshWrapper.generate_mesh')
    def test_generate_mesh(self, mock_generate_mesh):
        """测试生成网格"""
        # 设置前提条件
        self.system.project_status["geometry_file"] = os.path.join(self.system.mesh_dir, "test_geometry.geo")
        
        # 模拟网格生成
        mock_generate_mesh.return_value = "test_mesh.msh"
        
        # 调用方法
        mesh_file = self.system.generate_mesh(self.mesh_params)
        
        # 验证结果
        self.assertIsNotNone(mesh_file)
        self.assertTrue(mock_generate_mesh.called)
        
        # 检查项目状态
        self.assertIn("mesh_file", self.system.project_status)
        self.assertEqual(self.system.project_status["mesh_status"], "created")
    
    @mock.patch('src.core.simulation.terra_wrapper.TerraWrapper.set_mesh')
    @mock.patch('src.core.simulation.terra_wrapper.TerraWrapper.create_model')
    @mock.patch('src.core.simulation.terra_wrapper.TerraWrapper.add_soil_layer')
    @mock.patch('src.core.simulation.terra_wrapper.TerraWrapper.add_boundary_condition')
    @mock.patch('src.core.simulation.terra_wrapper.TerraWrapper.add_load')
    @mock.patch('src.core.simulation.terra_wrapper.TerraWrapper.add_excavation_stage')
    def test_create_model(self, mock_add_stage, mock_add_load, mock_add_bc, 
                         mock_add_soil, mock_create_model, mock_set_mesh):
        """测试创建计算模型"""
        # 设置前提条件
        self.system.project_status["mesh_file"] = os.path.join(self.system.mesh_dir, "test_mesh.msh")
        self.system.project_status["mesh_status"] = "created"
        
        # 模拟模型创建
        mock_create_model.return_value = os.path.join(self.system.model_dir, "test_model", "test_model.json")
        
        # 调用方法
        model_file = self.system.create_model(self.model_params)
        
        # 验证结果
        self.assertIsNotNone(model_file)
        self.assertTrue(mock_set_mesh.called)
        self.assertTrue(mock_create_model.called)
        self.assertTrue(mock_add_soil.called)
        self.assertTrue(mock_add_bc.called)
        self.assertTrue(mock_add_load.called)
        self.assertTrue(mock_add_stage.called)
        
        # 检查项目状态
        self.assertIn("model_file", self.system.project_status)
        self.assertEqual(self.system.project_status["model_status"], "created")
    
    @mock.patch('src.core.simulation.terra_wrapper.TerraWrapper.run_analysis')
    @mock.patch('src.core.simulation.terra_wrapper.TerraWrapper.export_vtk')
    def test_run_analysis(self, mock_export_vtk, mock_run_analysis):
        """测试运行分析"""
        # 设置前提条件
        self.system.project_status["model_file"] = os.path.join(self.system.model_dir, "test_model.json")
        self.system.project_status["model_status"] = "created"
        
        # 模拟分析运行
        mock_run_analysis.return_value = {"status": "completed"}
        mock_export_vtk.return_value = os.path.join(self.system.results_dir, "test_results.vtk")
        
        # 调用方法
        result = self.system.run_analysis(self.analysis_params)
        
        # 验证结果
        self.assertIsNotNone(result)
        self.assertEqual(result["status"], "completed")
        self.assertTrue(mock_run_analysis.called)
        self.assertTrue(mock_export_vtk.called)
        
        # 检查项目状态
        self.assertEqual(self.system.project_status["analysis_status"], "completed")
        self.assertIn("result_file", self.system.project_status)
    
    @mock.patch('src.ai.physics_ai_system.PhysicsAISystem.run_integrated_analysis')
    def test_run_integrated_analysis(self, mock_run_integrated):
        """测试运行集成分析"""
        # 设置前提条件
        self.system.project_status["model_file"] = os.path.join(self.system.model_dir, "test_model.json")
        
        # 模拟集成分析
        mock_run_integrated.return_value = {
            "inverse_analysis": "task_1",
            "pinn_training": "task_2",
            "data_fusion": "task_3"
        }
        
        # 调用方法
        result = self.system.run_integrated_analysis(self.integrated_params)
        
        # 验证结果
        self.assertIsNotNone(result)
        self.assertEqual(result["status"], "running")
        self.assertIn("task_ids", result)
        self.assertTrue(mock_run_integrated.called)
        
        # 检查项目状态
        self.assertEqual(self.system.project_status["ai_status"], "running")
        self.assertIn("ai_task_ids", self.system.project_status)
    
    @mock.patch('src.ai.physics_ai_system.PhysicsAISystem.submit_task')
    def test_train_pinn_model(self, mock_submit_task):
        """测试训练PINN模型"""
        # 模拟任务提交
        mock_submit_task.return_value = "pinn_task_1"
        
        # 调用方法
        pinn_params = {
            "pde_type": "elasticity",
            "layers": [20, 20, 20],
            "iterations": 10000
        }
        result = self.system.train_pinn_model(pinn_params)
        
        # 验证结果
        self.assertIsNotNone(result)
        self.assertEqual(result["status"], "training")
        self.assertEqual(result["task_id"], "pinn_task_1")
        self.assertTrue(mock_submit_task.called)
        
        # 检查项目状态
        self.assertIn("pinn_models", self.system.project_status)
    
    @mock.patch('src.ai.physics_ai_system.PhysicsAISystem.submit_task')
    def test_run_inverse_analysis(self, mock_submit_task):
        """测试运行反演分析"""
        # 模拟任务提交
        mock_submit_task.return_value = "inverse_task_1"
        
        # 调用方法
        inverse_params = {
            "data_type": "displacement",
            "pde_type": "elasticity",
            "initial_params": {"young_modulus": 2.0e7, "poisson_ratio": 0.3}
        }
        result = self.system.run_inverse_analysis(inverse_params)
        
        # 验证结果
        self.assertIsNotNone(result)
        self.assertEqual(result["status"], "running")
        self.assertEqual(result["task_id"], "inverse_task_1")
        self.assertTrue(mock_submit_task.called)
        
        # 检查项目状态
        self.assertIn("inverse_analysis", self.system.project_status)
    
    def test_get_analysis_status(self):
        """测试获取分析状态"""
        # 设置项目状态
        self.system.project_status["analysis_status"] = "completed"
        self.system.project_status["ai_status"] = "running"
        self.system.project_status["ai_task_ids"] = {
            "inverse_analysis": "task_1",
            "pinn_training": "task_2"
        }
        
        # 模拟物理AI系统
        self.system.physics_ai = mock.MagicMock()
        self.system.physics_ai.get_task_status.side_effect = lambda task_id: {
            "task_1": {"status": "completed", "progress": 100},
            "task_2": {"status": "running", "progress": 50}
        }.get(task_id, {"status": "not_found"})
        
        # 调用方法
        status = self.system.get_analysis_status()
        
        # 验证结果
        self.assertIsNotNone(status)
        self.assertEqual(status["analysis_status"], "completed")
        self.assertEqual(status["ai_status"], "running")
        self.assertIn("ai_tasks_status", status)
    
    @mock.patch('src.core.simulation.terra_wrapper.TerraWrapper.get_results')
    def test_get_results(self, mock_get_results):
        """测试获取结果"""
        # 设置前提条件
        self.system.project_status["analysis_status"] = "completed"
        
        # 模拟结果获取
        mock_results = {
            "nodes": [
                {"id": 1, "x": 0.0, "y": 0.0, "z": 0.0, "value": 0.01},
                {"id": 2, "x": 1.0, "y": 0.0, "z": 0.0, "value": 0.02}
            ],
            "max_value": 0.02,
            "min_value": 0.01
        }
        mock_get_results.return_value = mock_results
        
        # 调用方法
        result = self.system.get_results("displacement")
        
        # 验证结果
        self.assertEqual(result, mock_results)
        self.assertTrue(mock_get_results.called)
        mock_get_results.assert_called_with("displacement", -1)
    
    def test_error_handling(self):
        """测试错误处理"""
        # 测试缺少几何文件
        with self.assertRaises(ValueError):
            self.system.generate_mesh(self.mesh_params)
        
        # 测试缺少网格文件
        with self.assertRaises(ValueError):
            self.system.create_model(self.model_params)
        
        # 测试缺少模型文件
        with self.assertRaises(ValueError):
            self.system.run_analysis(self.analysis_params)
        
        # 测试未完成分析
        self.system.project_status["analysis_status"] = "not_run"
        with self.assertRaises(ValueError):
            self.system.get_results("displacement")

if __name__ == "__main__":
    unittest.main()







