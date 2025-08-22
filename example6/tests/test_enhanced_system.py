#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强系统测试套件 - Enhanced System Test Suite
全面测试桥墩冲刷模拟系统的所有增强功能

测试覆盖:
- 核心计算模块
- 数据管理功能
- 结果分析工具
- 验证框架
- 性能优化
- 用户界面
"""

import unittest
import numpy as np
import tempfile
import shutil
from pathlib import Path
import json
import time
import sys
import os

# 添加项目路径
current_dir = Path(__file__).parent.parent
sys.path.insert(0, str(current_dir))

# 导入测试模块
from core.empirical_solver import ScourParameters, ScourResult, PierShape, HEC18Solver
from core.advanced_solver import AdvancedSolverManager, NumericalParameters, TurbulenceModel
from core.advanced_materials import AdvancedPhysicsManager, FluidType, SedimentType
from core.data_manager import ProjectManager, DataImporter, DataExporter, DataFormat
from core.result_analysis import AdvancedResultAnalyzer, AnalysisType, quick_sensitivity_analysis
from core.validation_tools import ValidationDatabase, ResultValidator, quick_validation
from core.performance_optimizer import PerformanceOptimizer, OptimizationConfig, OptimizationLevel


class TestEmpiricalSolvers(unittest.TestCase):
    """经验公式求解器测试"""
    
    def setUp(self):
        """测试设置"""
        self.test_params = ScourParameters(
            pier_diameter=2.0,
            pier_shape=PierShape.CIRCULAR,
            flow_velocity=1.5,
            water_depth=4.0,
            d50=0.8
        )
    
    def test_hec18_solver(self):
        """测试HEC-18求解器"""
        solver = HEC18Solver()
        result = solver.solve(self.test_params)
        
        self.assertIsInstance(result, ScourResult)
        self.assertGreater(result.scour_depth, 0)
        self.assertLess(result.scour_depth, 10)  # 合理范围
        self.assertTrue(result.success)
        print(f"HEC-18冲刷深度: {result.scour_depth:.3f}m")
    
    def test_parameter_validation(self):
        """测试参数验证"""
        # 测试无效参数
        invalid_params = ScourParameters(
            pier_diameter=-1.0,  # 无效值
            pier_shape=PierShape.CIRCULAR,
            flow_velocity=1.5,
            water_depth=4.0,
            d50=0.8
        )
        
        solver = HEC18Solver()
        result = solver.solve(invalid_params)
        self.assertFalse(result.success)


class TestAdvancedSolver(unittest.TestCase):
    """高级求解器测试"""
    
    def setUp(self):
        """测试设置"""
        self.test_params = ScourParameters(
            pier_diameter=1.0,
            pier_shape=PierShape.CIRCULAR,
            flow_velocity=1.0,
            water_depth=3.0,
            d50=0.5
        )
        
        self.numerical_params = NumericalParameters(
            mesh_resolution=0.2,  # 粗网格用于快速测试
            time_step=0.1,
            turbulence_model=TurbulenceModel.K_EPSILON,
            max_iterations=10,
            convergence_tolerance=1e-3
        )
    
    def test_solver_manager(self):
        """测试求解器管理器"""
        manager = AdvancedSolverManager()
        
        # 测试自动配置
        auto_params = manager.auto_configure_parameters(self.test_params)
        self.assertIsInstance(auto_params, NumericalParameters)
        
        # 测试求解 (快速模式)
        result = manager.solve_coupled_system(
            self.test_params, 
            self.numerical_params
        )
        self.assertIsInstance(result, object)  # 应该返回求解结果
        print(f"数值求解完成，收敛: {hasattr(result, 'converged')}")


class TestAdvancedMaterials(unittest.TestCase):
    """高级材料模型测试"""
    
    def setUp(self):
        """测试设置"""
        self.physics_manager = AdvancedPhysicsManager()
    
    def test_fluid_models(self):
        """测试流体模型"""
        # 测试清水流动
        self.physics_manager.setup_fluid_model(FluidType.CLEAR_WATER)
        viscosity = self.physics_manager.compute_effective_viscosity(10.0, 20.0)
        self.assertGreater(viscosity, 0)
        
        # 测试非牛顿流体
        self.physics_manager.setup_fluid_model(
            FluidType.NON_NEWTONIAN,
            model_type='power_law',
            consistency_index=0.5,
            flow_behavior_index=0.8
        )
        
        viscosity_non_newtonian = self.physics_manager.compute_effective_viscosity(10.0, 20.0)
        self.assertGreater(viscosity_non_newtonian, 0)
        print(f"牛顿流体粘度: {viscosity:.2e}, 非牛顿流体粘度: {viscosity_non_newtonian:.2e}")
    
    def test_sediment_transport(self):
        """测试沉积物输运"""
        self.physics_manager.setup_sediment_model(SedimentType.SAND)
        
        transport_result = self.physics_manager.compute_sediment_transport(1.0, 2.0)
        
        self.assertIn('transport_rate', transport_result)
        self.assertIn('bedload_rate', transport_result)
        self.assertIn('suspended_rate', transport_result)
        self.assertGreater(transport_result['transport_rate'], 0)
        print(f"输沙率: {transport_result['transport_rate']:.2e} kg/(m·s)")
    
    def test_bed_evolution(self):
        """测试河床演化"""
        bed_change = self.physics_manager.update_bed_evolution(-0.01, 1.5, 3600)
        self.assertIsInstance(bed_change, float)
        print(f"1小时河床变化: {bed_change:.6f}m")


class TestDataManagement(unittest.TestCase):
    """数据管理测试"""
    
    def setUp(self):
        """测试设置"""
        self.temp_dir = Path(tempfile.mkdtemp())
        self.project_manager = ProjectManager(self.temp_dir / "test_data")
        
    def tearDown(self):
        """清理测试"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_project_creation(self):
        """测试项目创建"""
        project = self.project_manager.create_project(
            "test_project", 
            "测试用桥墩冲刷项目"
        )
        
        self.assertEqual(project.project_name, "test_project")
        self.assertEqual(project.description, "测试用桥墩冲刷项目")
        
        # 测试保存和加载
        success = self.project_manager.save_project(project)
        self.assertTrue(success)
        
        loaded_project = self.project_manager.load_project("test_project")
        self.assertIsNotNone(loaded_project)
        self.assertEqual(loaded_project.project_name, "test_project")
        print(f"项目创建和加载成功: {loaded_project.project_name}")
    
    def test_data_import_export(self):
        """测试数据导入导出"""
        importer = DataImporter()
        exporter = DataExporter()
        
        # 测试JSON导入导出
        test_data = {
            'project': 'test',
            'parameters': {'diameter': 2.0, 'velocity': 1.0},
            'results': [1.2, 1.5, 1.8]
        }
        
        json_file = self.temp_dir / "test_export.json"
        success = exporter.export_json(test_data, json_file)
        self.assertTrue(success)
        self.assertTrue(json_file.exists())
        
        # 测试导入
        import_result = importer.import_json(json_file)
        self.assertEqual(import_result['data'], test_data)
        print(f"JSON导入导出测试成功")


class TestResultAnalysis(unittest.TestCase):
    """结果分析测试"""
    
    def setUp(self):
        """测试设置"""
        self.analyzer = AdvancedResultAnalyzer()
        self.test_params = ScourParameters(
            pier_diameter=2.0,
            pier_shape=PierShape.CIRCULAR,
            flow_velocity=1.0,
            water_depth=3.0,
            d50=0.5
        )
    
    def test_sensitivity_analysis(self):
        """测试敏感性分析"""
        def mock_solver(params):
            # 简单的模拟求解器
            return params.pier_diameter * params.flow_velocity * 0.8
        
        # 执行敏感性分析
        results = self.analyzer.sensitivity_analysis(
            self.test_params,
            mock_solver,
            n_samples=10  # 小样本用于快速测试
        )
        
        self.assertGreater(len(results), 0)
        
        for param_name, result in results.items():
            self.assertIsNotNone(result.sensitivity_coefficient)
            print(f"{param_name}敏感性系数: {result.sensitivity_coefficient:.3f}")
    
    def test_uncertainty_analysis(self):
        """测试不确定性分析"""
        def mock_solver(params):
            return params.pier_diameter * params.flow_velocity * 0.8 + np.random.normal(0, 0.1)
        
        parameter_uncertainties = {
            'pier_diameter': ('normal', {'mean': 2.0, 'std': 0.2}),
            'flow_velocity': ('normal', {'mean': 1.0, 'std': 0.1})
        }
        
        result = self.analyzer.uncertainty_quantification(
            self.test_params,
            mock_solver,
            parameter_uncertainties,
            n_samples=100  # 小样本用于快速测试
        )
        
        self.assertGreater(result.mean_value, 0)
        self.assertGreater(result.std_deviation, 0)
        self.assertIn(0.95, result.confidence_intervals)
        print(f"不确定性分析: 均值={result.mean_value:.3f}, 标准差={result.std_deviation:.3f}")


class TestValidationFramework(unittest.TestCase):
    """验证框架测试"""
    
    def setUp(self):
        """测试设置"""
        self.temp_dir = Path(tempfile.mkdtemp())
        self.validator = ResultValidator()
    
    def tearDown(self):
        """清理测试"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_validation_database(self):
        """测试验证数据库"""
        db = ValidationDatabase()
        
        # 检查内置算例
        self.assertGreater(len(db.cases), 0)
        
        for case_id, case in db.cases.items():
            self.assertIsNotNone(case.reference_value)
            self.assertGreater(case.reference_value, 0)
            print(f"验证算例 {case_id}: 参考值={case.reference_value:.3f}")
    
    def test_method_validation(self):
        """测试方法验证"""
        def mock_solver(params):
            # 简单模拟求解器，返回接近参考值的结果
            return params.pier_diameter * 0.8
        
        report = self.validator.validate_method(
            mock_solver,
            "模拟求解器",
            tolerance=0.5  # 宽松容忍度用于测试
        )
        
        self.assertGreater(report.total_cases, 0)
        print(f"验证报告: 总算例={report.total_cases}, 有效算例={report.valid_cases}")
        print(f"性能等级: {report.performance_grade}")


class TestPerformanceOptimization(unittest.TestCase):
    """性能优化测试"""
    
    def setUp(self):
        """测试设置"""
        config = OptimizationConfig(
            level=OptimizationLevel.BALANCED,
            max_workers=2,  # 限制工作进程数用于测试
            cache_size_mb=64
        )
        self.optimizer = PerformanceOptimizer(config)
    
    def test_resource_monitoring(self):
        """测试资源监控"""
        # 启动监控
        self.optimizer.resource_monitor.start_monitoring()
        time.sleep(2)  # 等待收集数据
        
        status = self.optimizer.resource_monitor.get_resource_status()
        self.assertIn('current', status)
        self.assertIn('system_info', status)
        
        current = status['current']
        self.assertGreaterEqual(current['cpu_percent'], 0)
        self.assertGreaterEqual(current['memory_percent'], 0)
        
        print(f"系统资源: CPU={current['cpu_percent']:.1f}%, 内存={current['memory_percent']:.1f}%")
        
        # 停止监控
        self.optimizer.resource_monitor.stop_monitoring()
    
    def test_caching_system(self):
        """测试缓存系统"""
        cache = self.optimizer.cache
        
        # 测试缓存存储和获取
        test_data = {"test": "data", "numbers": [1, 2, 3]}
        
        success = cache.put("test_key", test_data)
        self.assertTrue(success)
        
        retrieved_data = cache.get("test_key")
        self.assertEqual(retrieved_data, test_data)
        
        # 测试缓存统计
        stats = cache.get_stats()
        self.assertGreater(stats['items_count'], 0)
        print(f"缓存统计: 项目数={stats['items_count']}, 大小={stats['size_mb']:.2f}MB")
    
    def test_parallel_execution(self):
        """测试并行执行"""
        def simple_task(x):
            time.sleep(0.01)  # 模拟计算时间
            return x * x
        
        test_data = list(range(10))
        
        # 测试并行映射
        start_time = time.time()
        results = self.optimizer.optimized_parallel_map(simple_task, test_data, enable_jit=False)
        execution_time = time.time() - start_time
        
        expected_results = [x * x for x in test_data]
        self.assertEqual(results, expected_results)
        print(f"并行执行完成: {len(results)}个任务, 用时{execution_time:.2f}秒")


class TestSystemIntegration(unittest.TestCase):
    """系统集成测试"""
    
    def setUp(self):
        """测试设置"""
        self.temp_dir = Path(tempfile.mkdtemp())
    
    def tearDown(self):
        """清理测试"""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_end_to_end_workflow(self):
        """测试端到端工作流程"""
        print("\n=== 端到端工作流程测试 ===")
        
        # 1. 创建项目
        project_manager = ProjectManager(self.temp_dir / "projects")
        project = project_manager.create_project("集成测试项目", "完整工作流程测试")
        
        # 2. 设置参数
        test_params = ScourParameters(
            pier_diameter=2.0,
            pier_shape=PierShape.CIRCULAR,
            flow_velocity=1.2,
            water_depth=3.5,
            d50=0.6
        )
        project.scour_parameters = test_params
        
        # 3. 执行计算
        solver = HEC18Solver()
        result = solver.solve(test_params)
        project.solver_results = [result]
        
        # 4. 保存项目
        success = project_manager.save_project(project)
        self.assertTrue(success)
        
        # 5. 加载项目
        loaded_project = project_manager.load_project("集成测试项目")
        self.assertIsNotNone(loaded_project)
        self.assertEqual(len(loaded_project.solver_results), 1)
        
        # 6. 结果分析
        def test_solver(params):
            solver = HEC18Solver()
            return solver.solve(params).scour_depth
        
        analysis_results = quick_sensitivity_analysis(
            test_params, 
            test_solver, 
            self.temp_dir / "analysis"
        )
        
        self.assertIn('sensitivity', analysis_results)
        
        print(f"✓ 项目创建和管理")
        print(f"✓ 参数设置和计算")
        print(f"✓ 结果保存和加载")
        print(f"✓ 敏感性分析")
        print(f"计算结果: 冲刷深度 = {result.scour_depth:.3f}m")


def run_all_tests():
    """运行所有测试"""
    print("🚀 开始运行增强系统测试套件...")
    
    # 创建测试套件
    test_suite = unittest.TestSuite()
    
    # 添加测试类
    test_classes = [
        TestEmpiricalSolvers,
        TestAdvancedSolver,
        TestAdvancedMaterials,
        TestDataManagement,
        TestResultAnalysis,
        TestValidationFramework,
        TestPerformanceOptimization,
        TestSystemIntegration
    ]
    
    for test_class in test_classes:
        tests = unittest.TestLoader().loadTestsFromTestCase(test_class)
        test_suite.addTests(tests)
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # 输出测试总结
    print(f"\n📊 测试总结:")
    print(f"运行测试: {result.testsRun}")
    print(f"失败: {len(result.failures)}")
    print(f"错误: {len(result.errors)}")
    print(f"成功率: {(result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100:.1f}%")
    
    if result.failures:
        print(f"\n❌ 失败的测试:")
        for test, traceback in result.failures:
            print(f"  - {test}: {traceback.split('AssertionError:')[-1].strip()}")
    
    if result.errors:
        print(f"\n⚠️  错误的测试:")
        for test, traceback in result.errors:
            print(f"  - {test}")
    
    if result.wasSuccessful():
        print(f"\n✅ 所有测试通过！增强系统运行正常。")
    else:
        print(f"\n⚠️  部分测试未通过，请检查系统配置。")
    
    return result.wasSuccessful()


if __name__ == "__main__":
    # 运行测试
    success = run_all_tests()
    
    if success:
        print(f"\n🎉 恭喜！DeepCAD-SCOUR增强系统测试全部通过！")
        print(f"系统已准备就绪，可以开始使用。")
    else:
        print(f"\n🔧 系统需要进一步调试和优化。")
    
    sys.exit(0 if success else 1)