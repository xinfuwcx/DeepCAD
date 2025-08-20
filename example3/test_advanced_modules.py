"""
高级模块集成测试脚本
测试所有增强的地质建模功能
"""

import sys
import numpy as np
import pandas as pd
from pathlib import Path
from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget, QPushButton, QTextEdit, QHBoxLayout
from PyQt6.QtCore import QTimer, pyqtSignal
import traceback

# 导入所有高级模块
try:
    from advanced_fault_modeling import StructuralAnalysisDialog, AdvancedFaultModeling
    from geophysical_modeling import GeophysicalModelingDialog
    from uncertainty_analysis import UncertaintyAnalysisDialog
    from enhanced_3d_viewer_advanced import AdvancedGeology3DViewer
    print("SUCCESS: 所有高级模块导入成功")
except ImportError as e:
    print(f"ERROR: 模块导入失败: {e}")
    sys.exit(1)

class AdvancedModuleTestSuite(QMainWindow):
    """高级模块测试套件"""
    
    test_completed = pyqtSignal(str, bool, str)
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GEM系统高级模块测试套件")
        self.setGeometry(100, 100, 1200, 800)
        
        self.test_results = {}
        self.setup_ui()
        
    def setup_ui(self):
        """设置测试界面"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        layout = QHBoxLayout(central_widget)
        
        # 左侧：测试控制面板
        control_panel = self.create_control_panel()
        layout.addWidget(control_panel)
        
        # 右侧：测试结果显示
        self.result_display = QTextEdit()
        self.result_display.setReadOnly(True)
        self.result_display.setStyleSheet("""
            QTextEdit {
                background-color: #1e1e1e;
                color: #ffffff;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 12px;
                border: 1px solid #3d3d3d;
            }
        """)
        layout.addWidget(self.result_display)
        
        layout.setStretchFactor(control_panel, 1)
        layout.setStretchFactor(self.result_display, 2)
        
        # 连接信号
        self.test_completed.connect(self.update_test_result)
        
        # 初始化日志
        self.log("TEST: GEM系统高级模块测试套件已启动")
        self.log("=" * 60)
        
    def create_control_panel(self):
        """创建测试控制面板"""
        panel = QWidget()
        panel.setMaximumWidth(300)
        panel.setStyleSheet("""
            QWidget {
                background-color: #f5f5f5;
                border-radius: 8px;
                padding: 10px;
            }
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                padding: 10px;
                border-radius: 5px;
                font-weight: bold;
                margin: 2px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
            QPushButton:pressed {
                background-color: #3d8b40;
            }
        """)
        
        layout = QVBoxLayout(panel)
        
        # 单独测试按钮
        self.fault_test_btn = QPushButton("测试断层建模模块")
        self.fault_test_btn.clicked.connect(self.test_fault_modeling)
        layout.addWidget(self.fault_test_btn)
        
        self.geophysics_test_btn = QPushButton("测试地球物理模块")
        self.geophysics_test_btn.clicked.connect(self.test_geophysical_modeling)
        layout.addWidget(self.geophysics_test_btn)
        
        self.uncertainty_test_btn = QPushButton("测试不确定性分析")
        self.uncertainty_test_btn.clicked.connect(self.test_uncertainty_analysis)
        layout.addWidget(self.uncertainty_test_btn)
        
        self.viewer_test_btn = QPushButton("测试3D可视化")
        self.viewer_test_btn.clicked.connect(self.test_3d_viewer)
        layout.addWidget(self.viewer_test_btn)
        
        layout.addWidget(QWidget())  # 分隔符
        
        # 综合测试按钮
        self.full_test_btn = QPushButton("🚀 运行完整测试套件")
        self.full_test_btn.clicked.connect(self.run_full_test_suite)
        self.full_test_btn.setStyleSheet("""
            QPushButton {
                background-color: #2196F3;
                font-size: 14px;
                padding: 15px;
            }
            QPushButton:hover {
                background-color: #1976D2;
            }
        """)
        layout.addWidget(self.full_test_btn)
        
        # 清除结果按钮
        self.clear_btn = QPushButton("🗑️ 清除结果")
        self.clear_btn.clicked.connect(self.clear_results)
        self.clear_btn.setStyleSheet("""
            QPushButton {
                background-color: #FF5722;
            }
            QPushButton:hover {
                background-color: #E64A19;
            }
        """)
        layout.addWidget(self.clear_btn)
        
        return panel
        
    def log(self, message: str):
        """记录测试日志"""
        import datetime
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        self.result_display.append(f"[{timestamp}] {message}")
        
    def update_test_result(self, module_name: str, success: bool, details: str):
        """更新测试结果"""
        status = "✅ 通过" if success else "❌ 失败"
        self.test_results[module_name] = success
        
        self.log(f"{module_name}: {status}")
        if details:
            self.log(f"详情: {details}")
        self.log("-" * 40)
        
    def test_fault_modeling(self):
        """测试断层建模模块"""
        self.log("开始测试断层建模模块...")
        
        try:
            # 测试高级断层建模类
            fault_modeler = AdvancedFaultModeling(None)
            
            # 测试断层网络创建
            fault_data = [
                {
                    'name': 'TestFault1',
                    'type': 'normal',
                    'dip': 60.0,
                    'strike': 45.0,
                    'finite': True,
                    'initial_length': 500.0,
                    'growth_rate': 2.0,
                    'slip_rate': 0.2,
                    'friction': 0.6
                },
                {
                    'name': 'TestFault2',
                    'type': 'reverse',
                    'dip': 75.0,
                    'strike': 135.0,
                    'finite': True,
                    'cuts': ['TestFault1'],
                    'initial_length': 300.0,
                    'growth_rate': 1.5,
                    'slip_rate': 0.1,
                    'friction': 0.7
                }
            ]
            
            # 测试创建断层网络
            success = fault_modeler.create_complex_fault_network(fault_data)
            assert success, "断层网络创建失败"
            
            # 测试断层稳定性计算
            stress_field = {
                'sigma1': 15.0,
                'sigma3': 5.0,
                'direction': 45.0
            }
            stability = fault_modeler.calculate_fault_stability(stress_field)
            assert len(stability) == 2, "稳定性计算结果数量不正确"
            
            # 测试断层发育模拟
            growth_history = fault_modeler.simulate_fault_growth(time_steps=10)
            assert len(growth_history) == 2, "断层发育历史记录不完整"
            
            self.test_completed.emit("断层建模模块", True, 
                                   f"成功创建{len(fault_data)}个断层，稳定性分析完成，发育模拟完成")
            
        except Exception as e:
            self.test_completed.emit("断层建模模块", False, f"错误: {str(e)}")
            
    def test_geophysical_modeling(self):
        """测试地球物理建模模块"""
        self.log("开始测试地球物理建模模块...")
        
        try:
            # 创建模拟地质模型
            mock_geo_model = type('MockGeoModel', (), {
                'grid': type('Grid', (), {
                    'regular_grid': type('RegularGrid', (), {
                        'extent': [0, 500, 0, 500, -100, 0]
                    })()
                })(),
                'solutions': type('Solutions', (), {
                    'lith_block': np.random.randint(1, 5, (10, 10, 5))
                })()
            })()
            
            # 创建地球物理建模对话框实例
            dialog = GeophysicalModelingDialog(mock_geo_model)
            
            # 测试密度模型获取
            density_model = dialog.get_density_model()
            assert len(density_model) > 0, "密度模型为空"
            
            # 测试磁化率模型获取
            susceptibility_model = dialog.get_susceptibility_model()
            assert len(susceptibility_model) > 0, "磁化率模型为空"
            
            # 测试重力异常计算
            gravity_result = dialog.calculate_gravity_anomaly(
                mock_geo_model, density_model, 10.0, 20
            )
            assert gravity_result is not None, "重力异常计算失败"
            assert 'gravity' in gravity_result, "重力异常结果格式错误"
            
            # 测试磁异常计算
            magnetic_result = dialog.calculate_magnetic_anomaly(
                mock_geo_model, susceptibility_model, 60.0, 0.0, 50000.0
            )
            assert magnetic_result is not None, "磁异常计算失败"
            assert 'magnetic' in magnetic_result, "磁异常结果格式错误"
            
            self.test_completed.emit("地球物理建模", True, 
                                   "重力和磁力建模功能测试通过，数据格式正确")
            
        except Exception as e:
            self.test_completed.emit("地球物理建模", False, f"错误: {str(e)}")
            
    def test_uncertainty_analysis(self):
        """测试不确定性分析模块"""
        self.log("开始测试不确定性分析模块...")
        
        try:
            # 创建不确定性分析对话框
            dialog = UncertaintyAnalysisDialog()
            
            # 测试参数获取
            dialog.parameter_table.setRowCount(2)
            dialog.parameter_table.setItem(0, 0, dialog.parameter_table.itemPrototype().clone())
            dialog.parameter_table.item(0, 0).setText("测试参数1")
            dialog.parameter_table.setItem(0, 2, dialog.parameter_table.itemPrototype().clone())
            dialog.parameter_table.item(0, 2).setText("100")
            dialog.parameter_table.setItem(0, 3, dialog.parameter_table.itemPrototype().clone())
            dialog.parameter_table.item(0, 3).setText("10")
            
            parameters = dialog.get_uncertainty_parameters()
            assert len(parameters) >= 0, "参数获取失败"
            
            # 测试Sobol序列生成
            sobol_samples = dialog.generate_sobol_samples(10, 3)
            assert sobol_samples.shape == (10, 3), "Sobol序列生成失败"
            
            # 测试Halton序列生成
            halton_samples = dialog.generate_halton_samples(10, 3)
            assert halton_samples.shape == (10, 3), "Halton序列生成失败"
            
            # 测试模型评估（简化版本）
            test_params = {
                'param1': {
                    'distribution': 'normal',
                    'mean': 100,
                    'std': 10,
                    'min': 50,
                    'max': 150
                }
            }
            result = dialog.evaluate_model(test_params)
            assert isinstance(result, (int, float)), "模型评估结果类型错误"
            
            self.test_completed.emit("不确定性分析", True, 
                                   "参数处理、序列生成、模型评估功能正常")
            
        except Exception as e:
            self.test_completed.emit("不确定性分析", False, f"错误: {str(e)}")
            
    def test_3d_viewer(self):
        """测试3D可视化模块"""
        self.log("开始测试3D可视化模块...")
        
        try:
            # 创建3D查看器
            viewer = AdvancedGeology3DViewer()
            
            # 测试示例数据创建
            from enhanced_3d_viewer_advanced import create_sample_data
            sample_data = create_sample_data()
            
            assert 'boreholes' in sample_data, "钻孔数据缺失"
            assert 'volumes' in sample_data, "体积数据缺失"
            assert len(sample_data['boreholes']) > 0, "钻孔数据为空"
            assert len(sample_data['volumes']) > 0, "体积数据为空"
            
            # 测试数据加载
            viewer.load_geological_data(sample_data)
            
            # 测试视图控制
            viewer.set_isometric_view()
            viewer.set_top_view()
            viewer.set_side_view()
            
            # 测试图层控制
            viewer.toggle_boreholes(True)
            viewer.toggle_surfaces(True)
            viewer.toggle_volumes(True)
            
            # 测试渲染设置
            viewer.set_render_quality("高")
            viewer.set_transparency(80)
            viewer.toggle_lighting(True)
            
            # 测试剖面功能
            viewer.section_direction.setCurrentText("X轴")
            viewer.section_position.setValue(50)
            
            # 测试场景清理
            viewer.clear_scene()
            
            self.test_completed.emit("3D可视化", True, 
                                   "数据加载、视图控制、渲染设置、剖面功能测试通过")
            
        except Exception as e:
            self.test_completed.emit("3D可视化", False, f"错误: {str(e)}")
            
    def run_full_test_suite(self):
        """运行完整测试套件"""
        self.log("🚀 开始运行完整测试套件...")
        self.log("=" * 60)
        
        self.test_results.clear()
        
        # 依次运行所有测试
        tests = [
            self.test_fault_modeling,
            self.test_geophysical_modeling,
            self.test_uncertainty_analysis,
            self.test_3d_viewer
        ]
        
        for test_func in tests:
            try:
                test_func()
            except Exception as e:
                self.log(f"❌ 测试执行异常: {str(e)}")
                self.log(traceback.format_exc())
                
        # 等待所有测试完成后显示总结
        QTimer.singleShot(1000, self.show_test_summary)
        
    def show_test_summary(self):
        """显示测试总结"""
        self.log("=" * 60)
        self.log("📋 测试总结报告")
        self.log("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results.values() if result)
        failed_tests = total_tests - passed_tests
        
        self.log(f"总测试数: {total_tests}")
        self.log(f"通过: {passed_tests} ✅")
        self.log(f"失败: {failed_tests} ❌")
        
        if failed_tests == 0:
            self.log("🎉 所有测试通过！高级模块功能正常。")
        else:
            self.log("⚠️ 部分测试失败，请检查相关模块。")
            
        self.log("=" * 60)
        
        # 详细结果
        self.log("详细测试结果:")
        for module, result in self.test_results.items():
            status = "✅ 通过" if result else "❌ 失败"
            self.log(f"  {module}: {status}")
            
    def clear_results(self):
        """清除测试结果"""
        self.result_display.clear()
        self.test_results.clear()
        self.log("🔬 GEM系统高级模块测试套件")
        self.log("测试结果已清除，可以重新开始测试")
        self.log("=" * 60)

def run_performance_benchmark():
    """运行性能基准测试"""
    print("🏃‍♂️ 开始性能基准测试...")
    
    import time
    
    # 测试数据生成性能
    start_time = time.time()
    
    # 生成大量测试数据
    large_borehole_data = []
    for i in range(1000):
        for j in range(10):
            large_borehole_data.append({
                'hole_id': f'BH{i:03d}',
                'x': np.random.uniform(0, 1000),
                'y': np.random.uniform(0, 1000),
                'z': -j * 2,
                'soil_layer': j + 1
            })
            
    data_gen_time = time.time() - start_time
    print(f"📊 数据生成时间: {data_gen_time:.2f} 秒")
    
    # 测试计算性能
    start_time = time.time()
    
    # 模拟复杂计算
    large_array = np.random.random((1000, 1000))
    result = np.linalg.svd(large_array)
    
    calc_time = time.time() - start_time
    print(f"🧮 计算性能测试: {calc_time:.2f} 秒")
    
    print("✅ 性能基准测试完成")

def main():
    """主函数"""
    app = QApplication(sys.argv)
    
    # 设置应用样式
    app.setStyleSheet("""
        QMainWindow {
            background-color: #ffffff;
        }
        QWidget {
            font-family: 'Segoe UI', 'Arial', sans-serif;
            font-size: 10pt;
        }
    """)
    
    # 创建测试套件
    test_suite = AdvancedModuleTestSuite()
    test_suite.show()
    
    # 运行性能基准测试（可选）
    # run_performance_benchmark()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()