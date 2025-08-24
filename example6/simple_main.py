#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简洁美观的主界面 - Simple Beautiful Main Window
专注核心功能，现代化UI设计
"""

import sys
from pathlib import Path
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QLineEdit, QComboBox, QPushButton, QTextEdit, QProgressBar,
    QGroupBox, QSplitter, QStatusBar, QMessageBox, QDoubleSpinBox
)
from PyQt6.QtCore import QThread, pyqtSignal, Qt, QTimer
from PyQt6.QtGui import QFont, QPixmap

# 添加路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from core.empirical_solver import (
    EmpiricalScourSolver, ScourParameters, ScourResult, PierShape
)

# 现代化样式
MODERN_STYLE = """
QMainWindow {
    background-color: #f5f5f5;
    color: #333333;
}

QGroupBox {
    font-weight: bold;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    margin-top: 12px;
    padding-top: 8px;
    background-color: white;
}

QGroupBox::title {
    subcontrol-origin: margin;
    left: 10px;
    padding: 0 8px;
    color: #2c3e50;
    background-color: white;
}

QPushButton {
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: bold;
    min-height: 24px;
}

QPushButton:hover {
    background-color: #2980b9;
}

QPushButton:pressed {
    background-color: #21618c;
}

QPushButton:disabled {
    background-color: #bdc3c7;
}

QDoubleSpinBox, QComboBox {
    border: 2px solid #e0e0e0;
    border-radius: 4px;
    padding: 4px 8px;
    background-color: white;
    min-height: 20px;
}

QDoubleSpinBox:focus, QComboBox:focus {
    border-color: #3498db;
}

QTextEdit {
    border: 2px solid #e0e0e0;
    border-radius: 4px;
    background-color: white;
    font-family: 'Consolas', monospace;
}

QStatusBar {
    background-color: #ecf0f1;
    border-top: 1px solid #bdc3c7;
}

QLabel {
    color: #2c3e50;
}
"""


class CalculationThread(QThread):
    """计算线程"""
    finished = pyqtSignal(object)
    progress = pyqtSignal(int)
    
    def __init__(self, solver, parameters):
        super().__init__()
        self.solver = solver
        self.parameters = parameters
    
    def run(self):
        """执行计算"""
        try:
            self.progress.emit(30)
            result = self.solver.get_consensus_result(self.parameters)
            self.progress.emit(100)
            self.finished.emit(result)
        except Exception as e:
            self.finished.emit(None)


class SimpleMainWindow(QMainWindow):
    """简洁主界面"""
    
    def __init__(self):
        super().__init__()
        self.solver = EmpiricalScourSolver()
        self.calc_thread = None
        
        self.setWindowTitle("DeepCAD-SCOUR 桥墩冲刷分析系统")
        self.setMinimumSize(800, 600)
        self.resize(1000, 700)
        
        # 应用样式
        self.setStyleSheet(MODERN_STYLE)
        
        self.setup_ui()
        self.setup_status_bar()
        
        # 居中显示
        self.center_window()
    
    def center_window(self):
        """窗口居中"""
        screen = QApplication.primaryScreen().geometry()
        window = self.geometry()
        x = (screen.width() - window.width()) // 2
        y = (screen.height() - window.height()) // 2
        self.move(x, y)
    
    def setup_ui(self):
        """设置界面"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(10, 10, 10, 10)
        main_layout.setSpacing(15)
        
        # 创建分割器
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # 左侧参数面板
        left_panel = self.create_parameter_panel()
        splitter.addWidget(left_panel)
        
        # 右侧结果面板
        right_panel = self.create_result_panel()
        splitter.addWidget(right_panel)
        
        # 设置分割比例
        splitter.setSizes([400, 500])
        
        main_layout.addWidget(splitter)
    
    def create_parameter_panel(self):
        """创建参数面板"""
        widget = QWidget()
        widget.setMaximumWidth(450)
        layout = QVBoxLayout(widget)
        
        # 桥墩参数组
        pier_group = QGroupBox("🌉 桥墩参数")
        pier_layout = QGridLayout(pier_group)
        
        # 直径
        pier_layout.addWidget(QLabel("直径 (m):"), 0, 0)
        self.diameter_spin = QDoubleSpinBox()
        self.diameter_spin.setRange(0.5, 10.0)
        self.diameter_spin.setValue(2.0)
        self.diameter_spin.setDecimals(2)
        pier_layout.addWidget(self.diameter_spin, 0, 1)
        
        # 形状
        pier_layout.addWidget(QLabel("形状:"), 1, 0)
        self.shape_combo = QComboBox()
        self.shape_combo.addItems(["圆形", "矩形", "椭圆形"])
        pier_layout.addWidget(self.shape_combo, 1, 1)
        
        layout.addWidget(pier_group)
        
        # 流体参数组
        flow_group = QGroupBox("💧 流体参数")
        flow_layout = QGridLayout(flow_group)
        
        # 流速
        flow_layout.addWidget(QLabel("流速 (m/s):"), 0, 0)
        self.velocity_spin = QDoubleSpinBox()
        self.velocity_spin.setRange(0.1, 5.0)
        self.velocity_spin.setValue(1.5)
        self.velocity_spin.setDecimals(2)
        flow_layout.addWidget(self.velocity_spin, 0, 1)
        
        # 水深
        flow_layout.addWidget(QLabel("水深 (m):"), 1, 0)
        self.depth_spin = QDoubleSpinBox()
        self.depth_spin.setRange(1.0, 20.0)
        self.depth_spin.setValue(4.0)
        self.depth_spin.setDecimals(1)
        flow_layout.addWidget(self.depth_spin, 1, 1)
        
        layout.addWidget(flow_group)
        
        # 沉积物参数组
        sediment_group = QGroupBox("🏔️ 沉积物参数")
        sediment_layout = QGridLayout(sediment_group)
        
        # d50
        sediment_layout.addWidget(QLabel("d50 (mm):"), 0, 0)
        self.d50_spin = QDoubleSpinBox()
        self.d50_spin.setRange(0.1, 10.0)
        self.d50_spin.setValue(0.8)
        self.d50_spin.setDecimals(2)
        sediment_layout.addWidget(self.d50_spin, 0, 1)
        
        layout.addWidget(sediment_group)
        
        # 快速预设按钮
        preset_group = QGroupBox("⚡ 快速预设")
        preset_layout = QVBoxLayout(preset_group)
        
        self.shallow_btn = QPushButton("浅水桥墩 (h=2m)")
        self.deep_btn = QPushButton("深水桥墩 (h=8m)")
        self.high_flow_btn = QPushButton("高流速 (v=3m/s)")
        
        self.shallow_btn.clicked.connect(self.load_shallow_preset)
        self.deep_btn.clicked.connect(self.load_deep_preset)
        self.high_flow_btn.clicked.connect(self.load_high_flow_preset)
        
        preset_layout.addWidget(self.shallow_btn)
        preset_layout.addWidget(self.deep_btn)
        preset_layout.addWidget(self.high_flow_btn)
        
        layout.addWidget(preset_group)
        
        # 计算按钮
        calc_group = QGroupBox("🚀 计算控制")
        calc_layout = QVBoxLayout(calc_group)
        
        self.calc_btn = QPushButton("开始计算")
        self.calc_btn.setStyleSheet("""
            QPushButton {
                background-color: #e74c3c;
                font-size: 14px;
                font-weight: bold;
                min-height: 35px;
            }
            QPushButton:hover {
                background-color: #c0392b;
            }
        """)
        self.calc_btn.clicked.connect(self.start_calculation)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        
        calc_layout.addWidget(self.calc_btn)
        calc_layout.addWidget(self.progress_bar)
        
        layout.addWidget(calc_group)
        
        layout.addStretch()
        return widget
    
    def create_result_panel(self):
        """创建结果面板"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 主要结果显示
        result_group = QGroupBox("📊 计算结果")
        result_layout = QGridLayout(result_group)
        
        # 冲刷深度
        result_layout.addWidget(QLabel("冲刷深度:"), 0, 0)
        self.depth_label = QLabel("--")
        self.depth_label.setStyleSheet("""
            QLabel {
                font-size: 24px;
                font-weight: bold;
                color: #e74c3c;
                border: 2px solid #e74c3c;
                border-radius: 8px;
                padding: 10px;
                background-color: #ffeaa7;
                text-align: center;
            }
        """)
        result_layout.addWidget(self.depth_label, 0, 1)
        result_layout.addWidget(QLabel("m"), 0, 2)
        
        # 其他参数
        result_layout.addWidget(QLabel("计算方法:"), 1, 0)
        self.method_label = QLabel("--")
        result_layout.addWidget(self.method_label, 1, 1, 1, 2)
        
        result_layout.addWidget(QLabel("可信度:"), 2, 0)
        self.confidence_label = QLabel("--")
        result_layout.addWidget(self.confidence_label, 2, 1, 1, 2)
        
        result_layout.addWidget(QLabel("Froude数:"), 3, 0)
        self.froude_label = QLabel("--")
        result_layout.addWidget(self.froude_label, 3, 1, 1, 2)
        
        layout.addWidget(result_group)
        
        # 详细信息
        detail_group = QGroupBox("📝 详细信息")
        detail_layout = QVBoxLayout(detail_group)
        
        self.detail_text = QTextEdit()
        self.detail_text.setMaximumHeight(200)
        self.detail_text.setPlainText("等待计算...")
        
        detail_layout.addWidget(self.detail_text)
        layout.addWidget(detail_group)
        
        # 建议信息
        advice_group = QGroupBox("💡 工程建议")
        advice_layout = QVBoxLayout(advice_group)
        
        self.advice_text = QTextEdit()
        self.advice_text.setMaximumHeight(150)
        self.advice_text.setPlainText("计算完成后将显示工程建议...")
        
        advice_layout.addWidget(self.advice_text)
        layout.addWidget(advice_group)
        
        return widget
    
    def setup_status_bar(self):
        """设置状态栏"""
        self.statusBar().showMessage("就绪 - 请输入参数并开始计算")
    
    def get_parameters(self):
        """获取当前参数"""
        shape_map = {0: PierShape.CIRCULAR, 1: PierShape.RECTANGULAR, 2: PierShape.ELLIPTICAL}
        
        return ScourParameters(
            pier_diameter=self.diameter_spin.value(),
            pier_shape=shape_map[self.shape_combo.currentIndex()],
            flow_velocity=self.velocity_spin.value(),
            water_depth=self.depth_spin.value(),
            d50=self.d50_spin.value()
        )
    
    def load_shallow_preset(self):
        """加载浅水预设"""
        self.diameter_spin.setValue(1.5)
        self.velocity_spin.setValue(1.0)
        self.depth_spin.setValue(2.0)
        self.d50_spin.setValue(1.0)
        self.statusBar().showMessage("已加载浅水桥墩预设参数")
    
    def load_deep_preset(self):
        """加载深水预设"""
        self.diameter_spin.setValue(3.0)
        self.velocity_spin.setValue(1.8)
        self.depth_spin.setValue(8.0)
        self.d50_spin.setValue(0.5)
        self.statusBar().showMessage("已加载深水桥墩预设参数")
    
    def load_high_flow_preset(self):
        """加载高流速预设"""
        self.diameter_spin.setValue(2.5)
        self.velocity_spin.setValue(3.0)
        self.depth_spin.setValue(5.0)
        self.d50_spin.setValue(0.3)
        self.statusBar().showMessage("已加载高流速预设参数")
    
    def start_calculation(self):
        """开始计算"""
        if self.calc_thread and self.calc_thread.isRunning():
            return
        
        # 获取参数
        parameters = self.get_parameters()
        
        # 创建计算线程
        self.calc_thread = CalculationThread(self.solver, parameters)
        self.calc_thread.finished.connect(self.on_calculation_finished)
        self.calc_thread.progress.connect(self.on_progress_updated)
        
        # 更新界面
        self.calc_btn.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        self.statusBar().showMessage("正在计算...")
        
        # 开始计算
        self.calc_thread.start()
    
    def on_progress_updated(self, value):
        """进度更新"""
        self.progress_bar.setValue(value)
    
    def on_calculation_finished(self, result):
        """计算完成"""
        # 重置界面
        self.calc_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        
        if result is None or not result.success:
            QMessageBox.critical(self, "计算错误", "计算失败，请检查参数")
            self.statusBar().showMessage("计算失败")
            return
        
        # 显示结果
        self.depth_label.setText(f"{result.scour_depth:.3f}")
        self.method_label.setText(result.method)
        self.confidence_label.setText(f"{result.confidence:.2f}")
        self.froude_label.setText(f"{result.froude_number:.3f}")
        
        # 详细信息
        detail_text = f"""计算方法: {result.method}
冲刷深度: {result.scour_depth:.3f} m
冲刷宽度: {result.scour_width:.3f} m  
平衡时间: {result.equilibrium_time:.1f} h
临界流速: {result.critical_velocity:.3f} m/s
Reynolds数: {result.reynolds_number:.0f}
Froude数: {result.froude_number:.3f}
可信度: {result.confidence:.2f}
计算时间: {result.computation_time:.3f} s"""
        
        self.detail_text.setPlainText(detail_text)
        
        # 工程建议
        params = self.get_parameters()
        relative_depth = result.scour_depth / params.pier_diameter
        
        if relative_depth < 1.0:
            risk = "低风险"
            advice = "冲刷深度相对较小，建议常规防护措施。"
        elif relative_depth < 2.0:
            risk = "中等风险"
            advice = "冲刷深度中等，建议加强基础防护，考虑抛石护底。"
        elif relative_depth < 3.0:
            risk = "高风险"
            advice = "冲刷深度较大，必须采取有效防护措施，如抛石护底、沉箱等。"
        else:
            risk = "极高风险"
            advice = "冲刷深度极大，需要特殊设计和防护措施，建议专家论证。"
        
        advice_text = f"""风险评估: {risk}
相对冲刷深度: {relative_depth:.2f} (ds/D)
设计建议冲刷深度: {result.scour_depth * 1.3:.2f} m (含1.3安全系数)
桩基埋深建议: ≥ {result.scour_depth * 1.5:.2f} m

防护建议: {advice}

注意事项:
• 本计算基于经验公式，实际情况可能有所不同
• 建议结合水文地质条件综合分析
• 重要工程应进行模型试验验证"""
        
        self.advice_text.setPlainText(advice_text)
        
        # 更新状态栏
        self.statusBar().showMessage(f"计算完成 - 冲刷深度: {result.scour_depth:.3f}m ({risk})")


def main():
    """主程序入口"""
    app = QApplication(sys.argv)
    
    # 设置应用信息
    app.setApplicationName("DeepCAD-SCOUR")
    app.setApplicationVersion("2.0")
    
    # 设置字体
    font = QFont("微软雅黑", 9)
    app.setFont(font)
    
    # 创建主窗口
    window = SimpleMainWindow()
    window.show()
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()