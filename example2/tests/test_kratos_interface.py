#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Kratos接口单元测试
"""

import unittest
import sys
import json
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

# 添加项目路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from core.kratos_interface import (
    KratosInterface, AnalysisSettings, AnalysisType, SolverType,
    MaterialProperties, create_static_analysis, create_modal_analysis
)


class TestMaterialProperties(unittest.TestCase):
    """材料属性测试"""
    
    def test_material_creation(self):
        """测试材料创建"""
        material = MaterialProperties(
            id=1,
            name="测试材料",
            density=2000.0,
            young_modulus=25e9,
            poisson_ratio=0.3
        )
        
        self.assertEqual(material.id, 1)
        self.assertEqual(material.name, "测试材料")
        self.assertEqual(material.density, 2000.0)
        self.assertEqual(material.young_modulus, 25e9)
        self.assertEqual(material.poisson_ratio, 0.3)
    
    def test_to_kratos_dict(self):
        """测试转换为Kratos格式"""
        material = MaterialProperties(1, "测试材料", 2000.0, 25e9, 0.3)
        kratos_dict = material.to_kratos_dict()
        
        self.assertIn("material_id", kratos_dict)
        self.assertIn("DENSITY", kratos_dict)
        self.assertIn("YOUNG_MODULUS", kratos_dict)
        self.assertIn("POISSON_RATIO", kratos_dict)
        
        self.assertEqual(kratos_dict["material_id"], 1)
        self.assertEqual(kratos_dict["DENSITY"], 2000.0)


class TestAnalysisSettings(unittest.TestCase):
    """分析设置测试"""
    
    def test_default_settings(self):
        """测试默认设置"""
        settings = AnalysisSettings()
        
        self.assertEqual(settings.analysis_type, AnalysisType.STATIC)
        self.assertEqual(settings.solver_type, SolverType.LINEAR)
        self.assertEqual(settings.max_iterations, 100)
        self.assertEqual(settings.convergence_tolerance, 1e-6)
    
    def test_custom_settings(self):
        """测试自定义设置"""
        settings = AnalysisSettings(
            analysis_type=AnalysisType.NONLINEAR,
            solver_type=SolverType.NEWTON_RAPHSON,
            max_iterations=200,
            convergence_tolerance=1e-8
        )
        
        self.assertEqual(settings.analysis_type, AnalysisType.NONLINEAR)
        self.assertEqual(settings.solver_type, SolverType.NEWTON_RAPHSON)
        self.assertEqual(settings.max_iterations, 200)
        self.assertEqual(settings.convergence_tolerance, 1e-8)
    
    def test_to_kratos_dict(self):
        """测试转换为Kratos格式"""
        settings = AnalysisSettings()
        kratos_dict = settings.to_kratos_dict()
        
        self.assertIn("analysis_type", kratos_dict)
        self.assertIn("solver_type", kratos_dict)
        self.assertIn("max_iterations", kratos_dict)
        self.assertEqual(kratos_dict["analysis_type"], "static")


class TestKratosInterface(unittest.TestCase):
    """Kratos接口测试"""
    
    def setUp(self):
        """测试设置"""
        self.interface = KratosInterface()
        self.test_fpn_data = {
            "nodes": [
                {"id": 1, "x": 0.0, "y": 0.0, "z": 0.0},
                {"id": 2, "x": 1.0, "y": 0.0, "z": 0.0},
                {"id": 3, "x": 0.0, "y": 1.0, "z": 0.0},
                {"id": 4, "x": 0.0, "y": 0.0, "z": 1.0}
            ],
            "elements": [
                {"id": 1, "type": "tetra", "nodes": [1, 2, 3, 4], "material_id": 1}
            ]
        }
    
    def test_interface_initialization(self):
        """测试接口初始化"""
        self.assertIsNotNone(self.interface)
        self.assertIsInstance(self.interface.analysis_settings, AnalysisSettings)
        self.assertEqual(len(self.interface.materials), 0)
    
    def test_setup_model(self):
        """测试模型设置"""
        success = self.interface.setup_model(self.test_fpn_data)
        
        self.assertTrue(success)
        self.assertIsNotNone(self.interface.model_data)
        self.assertIn("nodes", self.interface.model_data)
        self.assertIn("elements", self.interface.model_data)
        self.assertIn("materials", self.interface.model_data)
        
        # 检查节点转换
        nodes = self.interface.model_data["nodes"]
        self.assertEqual(len(nodes), 4)
        self.assertEqual(nodes[0]["id"], 1)
        self.assertEqual(nodes[0]["coordinates"], [0.0, 0.0, 0.0])
    
    def test_element_type_mapping(self):
        """测试单元类型映射"""
        self.assertEqual(self.interface._map_element_type("tetra"), "Tetrahedra3D4N")
        self.assertEqual(self.interface._map_element_type("hexa"), "Hexahedra3D8N")
        self.assertEqual(self.interface._map_element_type("unknown"), "Tetrahedra3D4N")
    
    def test_default_materials_setup(self):
        """测试默认材料设置"""
        self.interface.setup_model(self.test_fpn_data)
        
        # 检查是否创建了默认材料
        self.assertGreater(len(self.interface.materials), 0)
        self.assertIn(1, self.interface.materials)
        
        # 检查材料属性
        material = self.interface.materials[1]
        self.assertEqual(material.name, "填土")
        self.assertEqual(material.density, 1800)
    
    def test_analysis_settings_update(self):
        """测试分析设置更新"""
        new_settings = AnalysisSettings(
            analysis_type=AnalysisType.MODAL,
            max_iterations=50
        )
        
        self.interface.set_analysis_settings(new_settings)
        
        self.assertEqual(self.interface.analysis_settings.analysis_type, AnalysisType.MODAL)
        self.assertEqual(self.interface.analysis_settings.max_iterations, 50)
    
    def test_run_analysis_without_model(self):
        """测试没有模型时运行分析"""
        success, result = self.interface.run_analysis()
        
        self.assertFalse(success)
        self.assertIn("error", result)
        self.assertIn("模型数据未设置", result["error"])
    
    def test_run_analysis_with_model(self):
        """测试有模型时运行分析"""
        self.interface.setup_model(self.test_fpn_data)
        success, result = self.interface.run_analysis()
        
        # 应该成功（使用模拟模式）
        self.assertTrue(success)
        self.assertIn("displacement", result)
        self.assertIn("stress", result)
        self.assertIn("strain", result)
        self.assertIn("analysis_info", result)
    
    def test_export_results(self):
        """测试结果导出"""
        self.interface.setup_model(self.test_fpn_data)
        success, results = self.interface.run_analysis()
        
        if success:
            # 测试JSON导出
            test_file = Path(__file__).parent / "test_results.json"
            export_success = self.interface.export_results(str(test_file), "json")
            
            self.assertTrue(export_success)
            self.assertTrue(test_file.exists())
            
            # 验证导出的文件
            with open(test_file, 'r', encoding='utf-8') as f:
                exported_data = json.load(f)
            
            self.assertIn("displacement", exported_data)
            self.assertIn("analysis_info", exported_data)
            
            # 清理测试文件
            test_file.unlink()


class TestConvenienceFunctions(unittest.TestCase):
    """便捷函数测试"""
    
    def test_create_static_analysis(self):
        """测试创建静力分析"""
        interface = create_static_analysis()
        
        self.assertIsInstance(interface, KratosInterface)
        self.assertEqual(interface.analysis_settings.analysis_type, AnalysisType.STATIC)
        self.assertEqual(interface.analysis_settings.solver_type, SolverType.LINEAR)
    
    def test_create_modal_analysis(self):
        """测试创建模态分析"""
        interface = create_modal_analysis()
        
        self.assertIsInstance(interface, KratosInterface)
        self.assertEqual(interface.analysis_settings.analysis_type, AnalysisType.MODAL)
        self.assertEqual(interface.analysis_settings.solver_type, SolverType.LINEAR)


class TestKratosIntegration(unittest.TestCase):
    """Kratos集成测试"""
    
    def test_kratos_available(self):
        """测试Kratos可用时的行为"""
        # 由于Kratos集成的复杂性，这里只测试基本逻辑
        # 实际的Kratos集成测试需要真实的Kratos环境
        interface = KratosInterface()

        # 检查接口是否正确初始化
        self.assertIsNotNone(interface)

        # 如果Kratos不可用，应该回退到模拟模式
        # 这个测试主要验证代码不会崩溃
        pass
    
    def test_kratos_unavailable(self):
        """测试Kratos不可用时的行为"""
        # 当前的实现应该回退到高级模拟模式
        interface = KratosInterface()
        interface.setup_model({
            "nodes": [{"id": 1, "x": 0, "y": 0, "z": 0}],
            "elements": [{"id": 1, "type": "tetra", "nodes": [1], "material_id": 1}]
        })
        
        success, results = interface.run_analysis()
        
        # 应该使用模拟模式成功
        self.assertTrue(success)
        self.assertIn("analysis_info", results)
        self.assertEqual(results["analysis_info"]["simulation_mode"], "advanced_fem")


if __name__ == "__main__":
    # 运行测试
    unittest.main(verbosity=2)
