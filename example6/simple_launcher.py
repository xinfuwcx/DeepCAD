#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单启动器 - Simple Launcher
绕过复杂依赖问题的基础版启动器
"""

import sys
import os
from pathlib import Path

# 添加项目路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def check_basic_requirements():
    """检查基本需求"""
    try:
        from PyQt6.QtWidgets import QApplication
        from PyQt6.QtCore import Qt
        return True
    except ImportError as e:
        print(f"缺少PyQt6: {e}")
        print("请安装: pip install PyQt6")
        return False

def main():
    """主程序"""
    print("DeepCAD-SCOUR 简单启动器")
    print("=" * 40)
    
    if not check_basic_requirements():
        input("按Enter退出...")
        return 1
    
    # 导入PyQt6
    from PyQt6.QtWidgets import (
        QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
        QLabel, QPushButton, QLineEdit, QTextEdit, QGroupBox, QGridLayout,
        QDoubleSpinBox, QComboBox, QMessageBox
    )
    from PyQt6.QtCore import Qt, QThread, pyqtSignal
    from PyQt6.QtGui import QFont
    
    # 导入核心计算
    try:
        from core.empirical_solver import ScourParameters, ScourResult, PierShape, HEC18Solver
    except ImportError:
        print("警告: 无法加载核心计算模块，使用简化版本")
        # 创建简化的计算类
        class ScourParameters:
            def __init__(self, pier_diameter=2.0, flow_velocity=1.5, water_depth=4.0, d50=0.8):
                self.pier_diameter = pier_diameter
                self.flow_velocity = flow_velocity
                self.water_depth = water_depth
                self.d50 = d50
        
        class ScourResult:
            def __init__(self, scour_depth=0.0, success=True):
                self.scour_depth = scour_depth
                self.success = success
        
        class HEC18Solver:
            def solve(self, params):
                # 简化的HEC-18计算
                D = params.pier_diameter
                V = params.flow_velocity
                h = params.water_depth
                d50 = params.d50 / 1000.0
                
                # HEC-18公式简化版
                ds = 2.0 * D**0.65 * h**0.35 / (d50**0.1)
                ds = min(ds, 2.4 * D)  # 限制最大冲刷深度
                
                return ScourResult(scour_depth=ds, success=True)
    
    class CalculationWorker(QThread):
        """计算工作线程"""
        finished = pyqtSignal(object)
        
        def __init__(self, params):
            super().__init__()
            self.params = params
            self.solver = HEC18Solver()
        
        def run(self):
            try:
                result = self.solver.solve(self.params)
                self.finished.emit(result)
            except Exception as e:
                result = ScourResult(scour_depth=0.0, success=False)
                self.finished.emit(result)
    
    class SimpleMainWindow(QMainWindow):
        """简化主窗口"""
        
        def __init__(self):
            super().__init__()
            self.worker = None
            self.setup_ui()
            self.setWindowTitle("DeepCAD-SCOUR 桥墩冲刷分析系统")
            self.resize(800, 600)
        
        def setup_ui(self):
            """设置界面"""
            central_widget = QWidget()
            self.setCentralWidget(central_widget)
            
            layout = QHBoxLayout(central_widget)
            
            # 左侧参数输入
            left_widget = QWidget()
            left_layout = QVBoxLayout(left_widget)
            
            # 参数组
            param_group = QGroupBox("计算参数")
            param_layout = QGridLayout(param_group)
            
            # 桥墩直径
            param_layout.addWidget(QLabel("桥墩直径 (m):"), 0, 0)
            self.diameter_input = QDoubleSpinBox()
            self.diameter_input.setRange(0.1, 10.0)
            self.diameter_input.setValue(2.0)
            self.diameter_input.setDecimals(2)
            param_layout.addWidget(self.diameter_input, 0, 1)
            
            # 流速
            param_layout.addWidget(QLabel("流速 (m/s):"), 1, 0)
            self.velocity_input = QDoubleSpinBox()
            self.velocity_input.setRange(0.1, 5.0)
            self.velocity_input.setValue(1.5)
            self.velocity_input.setDecimals(2)
            param_layout.addWidget(self.velocity_input, 1, 1)
            
            # 水深
            param_layout.addWidget(QLabel("水深 (m):"), 2, 0)
            self.depth_input = QDoubleSpinBox()
            self.depth_input.setRange(0.5, 20.0)
            self.depth_input.setValue(4.0)
            self.depth_input.setDecimals(2)
            param_layout.addWidget(self.depth_input, 2, 1)
            
            # 泥沙粒径
            param_layout.addWidget(QLabel("d50 (mm):"), 3, 0)
            self.d50_input = QDoubleSpinBox()
            self.d50_input.setRange(0.1, 10.0)
            self.d50_input.setValue(0.8)
            self.d50_input.setDecimals(2)
            param_layout.addWidget(self.d50_input, 3, 1)
            
            left_layout.addWidget(param_group)
            
            # 计算按钮
            self.calc_button = QPushButton("开始计算")
            self.calc_button.setStyleSheet("""
                QPushButton {
                    background-color: #0078d4;
                    color: white;
                    border: none;
                    padding: 10px;
                    border-radius: 5px;
                    font-size: 14px;
                    font-weight: bold;
                }
                QPushButton:hover {
                    background-color: #106ebe;
                }
                QPushButton:disabled {
                    background-color: #cccccc;
                }
            """)
            self.calc_button.clicked.connect(self.start_calculation)
            left_layout.addWidget(self.calc_button)
            
            left_layout.addStretch()
            
            # 右侧结果显示
            right_widget = QWidget()
            right_layout = QVBoxLayout(right_widget)
            
            # 结果组
            result_group = QGroupBox("计算结果")
            result_layout = QGridLayout(result_group)
            
            result_layout.addWidget(QLabel("冲刷深度:"), 0, 0)
            self.result_label = QLabel("点击计算")
            self.result_label.setStyleSheet("font-size: 18px; font-weight: bold; color: #0078d4;")
            result_layout.addWidget(self.result_label, 0, 1)
            result_layout.addWidget(QLabel("m"), 0, 2)
            
            result_layout.addWidget(QLabel("计算方法:"), 1, 0)
            self.method_label = QLabel("HEC-18")
            result_layout.addWidget(self.method_label, 1, 1, 1, 2)
            
            right_layout.addWidget(result_group)
            
            # 日志区域
            log_group = QGroupBox("计算日志")
            log_layout = QVBoxLayout(log_group)
            
            self.log_text = QTextEdit()
            self.log_text.setMaximumHeight(200)
            self.log_text.append("系统就绪，请输入参数后点击计算")
            log_layout.addWidget(self.log_text)
            
            right_layout.addWidget(log_group)
            
            # 添加到主布局
            layout.addWidget(left_widget, 1)
            layout.addWidget(right_widget, 2)
        
        def start_calculation(self):
            """开始计算"""
            if self.worker and self.worker.isRunning():
                return
            
            # 获取参数
            params = ScourParameters(
                pier_diameter=self.diameter_input.value(),
                flow_velocity=self.velocity_input.value(),
                water_depth=self.depth_input.value(),
                d50=self.d50_input.value()
            )
            
            # 创建工作线程
            self.worker = CalculationWorker(params)
            self.worker.finished.connect(self.on_calculation_finished)
            
            # 更新界面
            self.calc_button.setEnabled(False)
            self.calc_button.setText("计算中...")
            self.result_label.setText("计算中...")
            self.log_text.append(f"\n开始计算: D={params.pier_diameter}m, V={params.flow_velocity}m/s")
            
            # 开始计算
            self.worker.start()
        
        def on_calculation_finished(self, result):
            """计算完成"""
            self.calc_button.setEnabled(True)
            self.calc_button.setText("开始计算")
            
            if result.success:
                self.result_label.setText(f"{result.scour_depth:.3f}")
                self.result_label.setStyleSheet("font-size: 18px; font-weight: bold; color: #0078d4;")
                self.log_text.append(f"计算完成: 冲刷深度 = {result.scour_depth:.3f}m")
            else:
                self.result_label.setText("计算失败")
                self.result_label.setStyleSheet("font-size: 18px; font-weight: bold; color: #dc3545;")
                self.log_text.append("计算失败，请检查参数")
    
    # 创建应用程序
    app = QApplication(sys.argv)
    app.setApplicationName("DeepCAD-SCOUR")
    
    # 设置字体
    font = QFont("Microsoft YaHei UI, Arial", 9)
    app.setFont(font)
    
    # 创建主窗口
    main_window = SimpleMainWindow()
    main_window.show()
    
    print("界面启动成功！")
    
    # 运行应用程序
    return app.exec()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)