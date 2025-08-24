#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简化但稳定的CAE界面
"""

import sys
import json
import time
from pathlib import Path
from typing import Dict, Any

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QGridLayout, QGroupBox, QLabel, QLineEdit, QPushButton,
    QTextEdit, QProgressBar, QComboBox, QDoubleSpinBox
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal
from PyQt6.QtGui import QFont

# 修复导入路径
import os
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, parent_dir)

from example6.example6_service import Example6Service


class SimpleCAEThread(QThread):
    """简单的CAE计算线程"""
    finished_signal = pyqtSignal(dict)
    error_signal = pyqtSignal(str)
    progress_signal = pyqtSignal(str)
    
    def __init__(self, service, params):
        super().__init__()
        self.service = service
        self.params = params
        
    def run(self):
        try:
            self.progress_signal.emit("开始计算...")
            
            # 不在线程中使用Gmsh，避免信号问题
            # 但使用真正的有限元计算！
            simple_params = {
                "pier_diameter": self.params["pier_diameter"],
                "flow_velocity": self.params["flow_velocity"], 
                "water_depth": self.params["water_depth"],
                "d50": self.params["d50"],
                "use_gmsh": False,  # 避免线程问题
                "use_advanced": True,  # 使用高级求解器
                "solver_method": "pure_fem"  # 指定使用纯Python有限元
            }
            
            self.progress_signal.emit("正在计算流场...")
            result = self.service.cae_simulate(simple_params)
            
            self.progress_signal.emit("计算完成")
            self.finished_signal.emit(result)
            
        except Exception as e:
            self.error_signal.emit(f"计算失败: {str(e)}")


class SimpleCAEMainWindow(QMainWindow):
    """简单但稳定的CAE主界面"""
    
    def __init__(self):
        super().__init__()
        self.service = Example6Service()
        self.thread = None
        self.setup_ui()
        
    def setup_ui(self):
        self.setWindowTitle("CAE桥墩冲刷计算")
        self.setGeometry(200, 200, 800, 600)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        layout = QHBoxLayout(central_widget)
        
        # 左侧参数面板
        left_panel = QWidget()
        left_panel.setFixedWidth(300)
        left_layout = QVBoxLayout(left_panel)
        
        # 参数输入
        params_group = QGroupBox("计算参数")
        params_layout = QGridLayout(params_group)
        
        # 参数控件
        self.pier_diameter = QDoubleSpinBox()
        self.pier_diameter.setRange(0.5, 20.0)
        self.pier_diameter.setValue(2.0)
        self.pier_diameter.setSuffix(" m")
        
        self.flow_velocity = QDoubleSpinBox()
        self.flow_velocity.setRange(0.1, 10.0)
        self.flow_velocity.setValue(1.5)
        self.flow_velocity.setSuffix(" m/s")
        
        self.water_depth = QDoubleSpinBox()
        self.water_depth.setRange(1.0, 50.0)
        self.water_depth.setValue(4.0)
        self.water_depth.setSuffix(" m")
        
        self.d50 = QDoubleSpinBox()
        self.d50.setRange(0.1, 10.0)
        self.d50.setValue(0.5)
        self.d50.setSuffix(" mm")
        
        # 布局参数
        params_layout.addWidget(QLabel("桥墩直径:"), 0, 0)
        params_layout.addWidget(self.pier_diameter, 0, 1)
        params_layout.addWidget(QLabel("流速:"), 1, 0)
        params_layout.addWidget(self.flow_velocity, 1, 1)
        params_layout.addWidget(QLabel("水深:"), 2, 0)
        params_layout.addWidget(self.water_depth, 2, 1)
        params_layout.addWidget(QLabel("泥沙D50:"), 3, 0)
        params_layout.addWidget(self.d50, 3, 1)
        
        left_layout.addWidget(params_group)
        
        # 控制按钮
        self.compute_btn = QPushButton("开始计算")
        self.compute_btn.setStyleSheet("""
            QPushButton {
                background-color: #3498db;
                color: white;
                border: none;
                padding: 10px;
                border-radius: 5px;
                font-size: 14px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #2980b9;
            }
        """)
        self.compute_btn.clicked.connect(self.start_computation)
        left_layout.addWidget(self.compute_btn)
        
        self.validate_btn = QPushButton("验证环境")
        self.validate_btn.clicked.connect(self.validate_environment)
        left_layout.addWidget(self.validate_btn)
        
        # 进度显示
        self.progress_label = QLabel("就绪")
        left_layout.addWidget(self.progress_label)
        
        left_layout.addStretch()
        
        # 右侧结果面板
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        
        # 主要结果
        results_group = QGroupBox("计算结果")
        results_layout = QVBoxLayout(results_group)
        
        self.scour_label = QLabel("冲刷深度: --")
        self.velocity_label = QLabel("最大流速: --")
        self.reynolds_label = QLabel("雷诺数: --")
        self.time_label = QLabel("计算时间: --")
        
        # 设置结果标签样式
        for label in [self.scour_label, self.velocity_label, self.reynolds_label, self.time_label]:
            label.setStyleSheet("font-size: 14px; padding: 5px; background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px;")
        
        results_layout.addWidget(self.scour_label)
        results_layout.addWidget(self.velocity_label)
        results_layout.addWidget(self.reynolds_label)
        results_layout.addWidget(self.time_label)
        
        right_layout.addWidget(results_group)
        
        # 详细结果
        details_group = QGroupBox("详细结果")
        details_layout = QVBoxLayout(details_group)
        
        self.details_text = QTextEdit()
        self.details_text.setReadOnly(True)
        details_layout.addWidget(self.details_text)
        
        right_layout.addWidget(details_group)
        
        # 添加到主布局
        layout.addWidget(left_panel)
        layout.addWidget(right_panel)
        
        # 设置整体样式
        self.setStyleSheet("""
            QGroupBox {
                font-weight: bold;
                border: 2px solid #bdc3c7;
                border-radius: 8px;
                margin-top: 1ex;
                padding-top: 10px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 5px 0 5px;
            }
        """)
        
    def validate_environment(self):
        """验证环境"""
        try:
            result = self.service.cae_validate()
            self.details_text.setText(json.dumps(result, ensure_ascii=False, indent=2))
            self.progress_label.setText("环境验证完成")
        except Exception as e:
            self.progress_label.setText(f"环境验证失败: {e}")
            
    def start_computation(self):
        """开始计算"""
        if self.thread and self.thread.isRunning():
            return
            
        params = {
            "pier_diameter": self.pier_diameter.value(),
            "flow_velocity": self.flow_velocity.value(),
            "water_depth": self.water_depth.value(),
            "d50": self.d50.value()
        }
        
        self.compute_btn.setEnabled(False)
        self.progress_label.setText("正在计算...")
        
        self.thread = SimpleCAEThread(self.service, params)
        self.thread.finished_signal.connect(self.show_results)
        self.thread.error_signal.connect(self.show_error)
        self.thread.progress_signal.connect(self.update_progress)
        self.thread.start()
        
    def update_progress(self, message):
        """更新进度"""
        self.progress_label.setText(message)
        
    def show_results(self, results):
        """显示结果"""
        try:
            scour_depth = results.get("scour_depth", 0.0)
            max_velocity = results.get("max_velocity", 0.0)
            reynolds = results.get("reynolds_number", 0.0)
            comp_time = results.get("computation_time", 0.0)
            
            self.scour_label.setText(f"冲刷深度: {scour_depth:.2f} m")
            self.velocity_label.setText(f"最大流速: {max_velocity:.2f} m/s")
            self.reynolds_label.setText(f"雷诺数: {reynolds:.0f}")
            self.time_label.setText(f"计算时间: {comp_time:.2f} s")
            
            self.details_text.setText(json.dumps(results, ensure_ascii=False, indent=2))
            self.progress_label.setText("✅ 计算完成")
            
        except Exception as e:
            self.show_error(f"结果显示错误: {e}")
            
        finally:
            self.compute_btn.setEnabled(True)
            
    def show_error(self, error_msg):
        """显示错误"""
        self.progress_label.setText(f"❌ {error_msg}")
        self.compute_btn.setEnabled(True)


def main():
    app = QApplication(sys.argv)
    window = SimpleCAEMainWindow()
    window.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
