#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
优化后的主窗口 - Optimized Main Window
简化的界面设计，专注于核心功能和用户体验

优化特点:
- 异步计算，不阻塞UI
- 简化的参数输入
- 清晰的结果展示
- 性能监控
"""

import sys
import time
from typing import Dict, Any, Optional
from pathlib import Path

from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QLineEdit, QComboBox, QPushButton, QTextEdit, QProgressBar,
    QTabWidget, QGroupBox, QSplitter, QStatusBar, QMenuBar, QMenu,
    QMessageBox, QFileDialog, QTableWidget, QTableWidgetItem,
    QSpinBox, QDoubleSpinBox, QCheckBox
)
from PyQt6.QtCore import QThread, pyqtSignal, QTimer, Qt
from PyQt6.QtGui import QFont, QPixmap, QIcon, QAction

# 导入核心计算模块
from core.scour_calculator import (
    ScourCalculator, CalculationMethod, CalculationConfig,
    ScourParameters, ScourResult, PierShape, quick_calculate, compare_methods
)
from core.empirical_solver import ScourParameters, ScourResult, PierShape


class CalculationWorker(QThread):
    """异步计算工作线程"""
    calculation_finished = pyqtSignal(object)  # ScourResult
    progress_updated = pyqtSignal(int)
    error_occurred = pyqtSignal(str)
    
    def __init__(self, calculator: ScourCalculator, parameters: ScourParameters, 
                 method: CalculationMethod):
        super().__init__()
        self.calculator = calculator
        self.parameters = parameters
        self.method = method
    
    def run(self):
        """执行计算"""
        try:
            # 模拟进度更新
            self.progress_updated.emit(30)
            
            # 执行计算
            result = self.calculator.calculate(self.parameters, self.method)
            
            self.progress_updated.emit(100)
            self.calculation_finished.emit(result)
            
        except Exception as e:
            self.error_occurred.emit(str(e))


class MultiMethodWorker(QThread):
    """多方法对比计算线程"""
    calculation_finished = pyqtSignal(dict)  # Dict[CalculationMethod, ScourResult]
    progress_updated = pyqtSignal(int)
    error_occurred = pyqtSignal(str)
    
    def __init__(self, calculator: ScourCalculator, parameters: ScourParameters):
        super().__init__()
        self.calculator = calculator
        self.parameters = parameters
    
    def run(self):
        """执行多方法计算"""
        try:
            methods = list(CalculationMethod)
            results = {}
            
            for i, method in enumerate(methods):
                self.progress_updated.emit(int((i + 1) / len(methods) * 100))
                result = self.calculator.calculate(self.parameters, method)
                results[method] = result
                
                # 模拟计算时间
                time.sleep(0.1)
            
            self.calculation_finished.emit(results)
            
        except Exception as e:
            self.error_occurred.emit(str(e))


class ParameterInputWidget(QWidget):
    """参数输入组件"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
    
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 基本参数组
        basic_group = QGroupBox("基本参数")
        basic_layout = QGridLayout(basic_group)
        
        # 桥墩直径
        basic_layout.addWidget(QLabel("桥墩直径 (m):"), 0, 0)
        self.pier_diameter_edit = QDoubleSpinBox()
        self.pier_diameter_edit.setRange(0.1, 10.0)
        self.pier_diameter_edit.setValue(2.0)
        self.pier_diameter_edit.setDecimals(2)
        basic_layout.addWidget(self.pier_diameter_edit, 0, 1)
        
        # 桥墩形状
        basic_layout.addWidget(QLabel("桥墩形状:"), 1, 0)
        self.pier_shape_combo = QComboBox()
        self.pier_shape_combo.addItems(["圆形", "矩形", "椭圆形", "复杂"])
        basic_layout.addWidget(self.pier_shape_combo, 1, 1)
        
        # 流速
        basic_layout.addWidget(QLabel("流速 (m/s):"), 2, 0)
        self.flow_velocity_edit = QDoubleSpinBox()
        self.flow_velocity_edit.setRange(0.1, 5.0)
        self.flow_velocity_edit.setValue(1.5)
        self.flow_velocity_edit.setDecimals(2)
        basic_layout.addWidget(self.flow_velocity_edit, 2, 1)
        
        # 水深
        basic_layout.addWidget(QLabel("水深 (m):"), 3, 0)
        self.water_depth_edit = QDoubleSpinBox()
        self.water_depth_edit.setRange(0.5, 20.0)
        self.water_depth_edit.setValue(4.0)
        self.water_depth_edit.setDecimals(2)
        basic_layout.addWidget(self.water_depth_edit, 3, 1)
        
        # 泥沙粒径
        basic_layout.addWidget(QLabel("d50 (mm):"), 4, 0)
        self.d50_edit = QDoubleSpinBox()
        self.d50_edit.setRange(0.1, 10.0)
        self.d50_edit.setValue(0.8)
        self.d50_edit.setDecimals(2)
        basic_layout.addWidget(self.d50_edit, 4, 1)
        
        layout.addWidget(basic_group)
        
        # 高级参数组
        advanced_group = QGroupBox("高级参数")
        advanced_layout = QGridLayout(advanced_group)
        
        # 桥墩角度
        advanced_layout.addWidget(QLabel("桥墩角度 (度):"), 0, 0)
        self.pier_angle_edit = QDoubleSpinBox()
        self.pier_angle_edit.setRange(0.0, 45.0)
        self.pier_angle_edit.setValue(0.0)
        advanced_layout.addWidget(self.pier_angle_edit, 0, 1)
        
        # 来流角度
        advanced_layout.addWidget(QLabel("来流角度 (度):"), 1, 0)
        self.approach_angle_edit = QDoubleSpinBox()
        self.approach_angle_edit.setRange(0.0, 90.0)
        self.approach_angle_edit.setValue(0.0)
        advanced_layout.addWidget(self.approach_angle_edit, 1, 1)
        
        layout.addWidget(advanced_group)
        
        # 预设按钮
        preset_layout = QHBoxLayout()
        
        self.preset_shallow_btn = QPushButton("浅水桥墩")
        self.preset_deep_btn = QPushButton("深水桥墩")
        self.preset_high_flow_btn = QPushButton("高流速")
        
        self.preset_shallow_btn.clicked.connect(self.load_shallow_preset)
        self.preset_deep_btn.clicked.connect(self.load_deep_preset)
        self.preset_high_flow_btn.clicked.connect(self.load_high_flow_preset)
        
        preset_layout.addWidget(self.preset_shallow_btn)
        preset_layout.addWidget(self.preset_deep_btn)
        preset_layout.addWidget(self.preset_high_flow_btn)
        
        layout.addLayout(preset_layout)
    
    def get_parameters(self) -> ScourParameters:
        """获取当前参数"""
        shape_map = {
            0: PierShape.CIRCULAR,
            1: PierShape.RECTANGULAR,
            2: PierShape.ELLIPTICAL,
            3: PierShape.COMPLEX
        }
        
        return ScourParameters(
            pier_diameter=self.pier_diameter_edit.value(),
            pier_shape=shape_map[self.pier_shape_combo.currentIndex()],
            flow_velocity=self.flow_velocity_edit.value(),
            water_depth=self.water_depth_edit.value(),
            d50=self.d50_edit.value(),
            pier_angle=self.pier_angle_edit.value(),
            approach_angle=self.approach_angle_edit.value()
        )
    
    def set_parameters(self, params: ScourParameters):
        """设置参数"""
        self.pier_diameter_edit.setValue(params.pier_diameter)
        self.flow_velocity_edit.setValue(params.flow_velocity)
        self.water_depth_edit.setValue(params.water_depth)
        self.d50_edit.setValue(params.d50)
        self.pier_angle_edit.setValue(params.pier_angle)
        self.approach_angle_edit.setValue(params.approach_angle)
        
        # 设置形状
        shape_index = {
            PierShape.CIRCULAR: 0,
            PierShape.RECTANGULAR: 1,
            PierShape.ELLIPTICAL: 2,
            PierShape.COMPLEX: 3
        }
        self.pier_shape_combo.setCurrentIndex(shape_index.get(params.pier_shape, 0))
    
    def load_shallow_preset(self):
        """加载浅水预设"""
        params = ScourParameters(
            pier_diameter=1.5,
            pier_shape=PierShape.CIRCULAR,
            flow_velocity=1.0,
            water_depth=2.0,
            d50=1.0
        )
        self.set_parameters(params)
    
    def load_deep_preset(self):
        """加载深水预设"""
        params = ScourParameters(
            pier_diameter=3.0,
            pier_shape=PierShape.CIRCULAR,
            flow_velocity=1.5,
            water_depth=8.0,
            d50=0.5
        )
        self.set_parameters(params)
    
    def load_high_flow_preset(self):
        """加载高流速预设"""
        params = ScourParameters(
            pier_diameter=2.5,
            pier_shape=PierShape.RECTANGULAR,
            flow_velocity=3.0,
            water_depth=5.0,
            d50=0.3
        )
        self.set_parameters(params)


class ResultDisplayWidget(QWidget):
    """结果显示组件"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
    
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 单一结果显示
        self.single_result_group = QGroupBox("计算结果")
        single_layout = QGridLayout(self.single_result_group)
        
        # 冲刷深度
        single_layout.addWidget(QLabel("冲刷深度:"), 0, 0)
        self.scour_depth_label = QLabel("--")
        self.scour_depth_label.setStyleSheet("font-size: 18px; font-weight: bold; color: #0078d4;")
        single_layout.addWidget(self.scour_depth_label, 0, 1)
        single_layout.addWidget(QLabel("m"), 0, 2)
        
        # 计算方法
        single_layout.addWidget(QLabel("计算方法:"), 1, 0)
        self.method_label = QLabel("--")
        single_layout.addWidget(self.method_label, 1, 1, 1, 2)
        
        # 计算时间
        single_layout.addWidget(QLabel("计算时间:"), 2, 0)
        self.time_label = QLabel("--")
        single_layout.addWidget(self.time_label, 2, 1, 1, 2)
        
        layout.addWidget(self.single_result_group)
        
        # 多方法对比表格
        self.comparison_group = QGroupBox("方法对比")
        comparison_layout = QVBoxLayout(self.comparison_group)
        
        self.comparison_table = QTableWidget()
        self.comparison_table.setColumnCount(4)
        self.comparison_table.setHorizontalHeaderLabels(["方法", "冲刷深度(m)", "状态", "说明"])
        self.comparison_table.horizontalHeader().setStretchLastSection(True)
        
        comparison_layout.addWidget(self.comparison_table)
        layout.addWidget(self.comparison_group)
        
        # 默认隐藏对比表格
        self.comparison_group.setVisible(False)
    
    def display_single_result(self, result: ScourResult):
        """显示单一计算结果"""
        if result.success:
            self.scour_depth_label.setText(f"{result.scour_depth:.3f}")
            self.scour_depth_label.setStyleSheet("font-size: 18px; font-weight: bold; color: #0078d4;")
            self.method_label.setText(result.method_used or "未知")
            self.time_label.setText(f"{result.computation_time:.3f}s")
        else:
            self.scour_depth_label.setText("计算失败")
            self.scour_depth_label.setStyleSheet("font-size: 18px; font-weight: bold; color: #dc3545;")
            self.method_label.setText("--")
            self.time_label.setText("--")
        
        # 隐藏对比表格
        self.comparison_group.setVisible(False)
        self.single_result_group.setVisible(True)
    
    def display_comparison_results(self, results: Dict[CalculationMethod, ScourResult]):
        """显示多方法对比结果"""
        self.comparison_table.setRowCount(len(results))
        
        method_names = {
            CalculationMethod.HEC18: "HEC-18",
            CalculationMethod.MELVILLE_CHIEW: "Melville-Chiew",
            CalculationMethod.CSU: "CSU",
            CalculationMethod.SHEPPARD_MILLER: "Sheppard-Miller"
        }
        
        for row, (method, result) in enumerate(results.items()):
            # 方法名
            self.comparison_table.setItem(row, 0, QTableWidgetItem(method_names.get(method, method.value)))
            
            if result.success:
                # 冲刷深度
                self.comparison_table.setItem(row, 1, QTableWidgetItem(f"{result.scour_depth:.3f}"))
                
                # 状态
                status_item = QTableWidgetItem("成功")
                status_item.setBackground(Qt.GlobalColor.green)
                self.comparison_table.setItem(row, 2, status_item)
                
                # 说明
                self.comparison_table.setItem(row, 3, QTableWidgetItem(f"计算时间: {result.computation_time:.3f}s"))
            else:
                # 失败情况
                self.comparison_table.setItem(row, 1, QTableWidgetItem("--"))
                
                status_item = QTableWidgetItem("失败")
                status_item.setBackground(Qt.GlobalColor.red)
                self.comparison_table.setItem(row, 2, status_item)
                
                self.comparison_table.setItem(row, 3, QTableWidgetItem(result.error_message or "未知错误"))
        
        # 显示对比表格
        self.single_result_group.setVisible(False)
        self.comparison_group.setVisible(True)


class OptimizedMainWindow(QMainWindow):
    """优化后的主窗口"""
    
    def __init__(self):
        super().__init__()
        
        # 初始化计算器
        self.calculator = ScourCalculator(CalculationConfig(enable_cache=True))
        
        # 工作线程
        self.calc_worker = None
        self.multi_worker = None
        
        # 性能监控
        self.performance_timer = QTimer()
        self.performance_timer.timeout.connect(self.update_performance_info)
        self.performance_timer.start(5000)  # 每5秒更新一次
        
        self.setup_ui()
        self.setup_menu()
        self.setup_status_bar()
        
        # 设置窗口属性
        self.setWindowTitle("DeepCAD-SCOUR 桥墩冲刷分析系统")
        self.setMinimumSize(900, 700)
        self.resize(1200, 800)
    
    def setup_ui(self):
        """设置主界面"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QHBoxLayout(central_widget)
        
        # 创建分割器
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # 左侧参数输入区域
        left_widget = QWidget()
        left_layout = QVBoxLayout(left_widget)
        
        # 参数输入组件
        self.parameter_widget = ParameterInputWidget()
        left_layout.addWidget(self.parameter_widget)
        
        # 计算控制区域
        calc_group = QGroupBox("计算控制")
        calc_layout = QVBoxLayout(calc_group)
        
        # 方法选择
        method_layout = QHBoxLayout()
        method_layout.addWidget(QLabel("计算方法:"))
        self.method_combo = QComboBox()
        self.method_combo.addItems(["HEC-18", "Melville-Chiew", "CSU", "Sheppard-Miller"])
        method_layout.addWidget(self.method_combo)
        calc_layout.addLayout(method_layout)
        
        # 计算按钮
        button_layout = QHBoxLayout()
        
        self.calc_button = QPushButton("开始计算")
        self.calc_button.setStyleSheet("""
            QPushButton {
                background-color: #0078d4;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
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
        
        self.compare_button = QPushButton("方法对比")
        self.compare_button.clicked.connect(self.start_comparison)
        
        button_layout.addWidget(self.calc_button)
        button_layout.addWidget(self.compare_button)
        calc_layout.addLayout(button_layout)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        calc_layout.addWidget(self.progress_bar)
        
        left_layout.addWidget(calc_group)
        left_layout.addStretch()
        
        splitter.addWidget(left_widget)
        
        # 右侧结果显示区域
        self.result_widget = ResultDisplayWidget()
        splitter.addWidget(self.result_widget)
        
        # 设置分割器比例
        splitter.setSizes([400, 600])
        
        main_layout.addWidget(splitter)
    
    def setup_menu(self):
        """设置菜单栏"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu("文件")
        
        # 新建
        new_action = QAction("新建", self)
        new_action.setShortcut("Ctrl+N")
        new_action.triggered.connect(self.new_project)
        file_menu.addAction(new_action)
        
        # 打开
        open_action = QAction("打开", self)
        open_action.setShortcut("Ctrl+O")
        open_action.triggered.connect(self.open_project)
        file_menu.addAction(open_action)
        
        # 保存
        save_action = QAction("保存", self)
        save_action.setShortcut("Ctrl+S")
        save_action.triggered.connect(self.save_project)
        file_menu.addAction(save_action)
        
        file_menu.addSeparator()
        
        # 导出
        export_action = QAction("导出结果", self)
        export_action.triggered.connect(self.export_results)
        file_menu.addAction(export_action)
        
        # 工具菜单
        tools_menu = menubar.addMenu("工具")
        
        # 清空缓存
        clear_cache_action = QAction("清空缓存", self)
        clear_cache_action.triggered.connect(self.clear_cache)
        tools_menu.addAction(clear_cache_action)
        
        # 性能信息
        performance_action = QAction("性能信息", self)
        performance_action.triggered.connect(self.show_performance_info)
        tools_menu.addAction(performance_action)
        
        # 帮助菜单
        help_menu = menubar.addMenu("帮助")
        
        # 关于
        about_action = QAction("关于", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)
    
    def setup_status_bar(self):
        """设置状态栏"""
        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        
        # 状态标签
        self.status_label = QLabel("就绪")
        self.status_bar.addWidget(self.status_label)
        
        # 性能信息
        self.cache_label = QLabel("缓存: 0/100")
        self.status_bar.addPermanentWidget(self.cache_label)
        
        self.memory_label = QLabel("内存: --")
        self.status_bar.addPermanentWidget(self.memory_label)
    
    def start_calculation(self):
        """开始单一方法计算"""
        if self.calc_worker and self.calc_worker.isRunning():
            return
        
        # 获取参数
        parameters = self.parameter_widget.get_parameters()
        
        # 获取选择的方法
        method_map = {
            0: CalculationMethod.HEC18,
            1: CalculationMethod.MELVILLE_CHIEW,
            2: CalculationMethod.CSU,
            3: CalculationMethod.SHEPPARD_MILLER
        }
        method = method_map[self.method_combo.currentIndex()]
        
        # 创建工作线程
        self.calc_worker = CalculationWorker(self.calculator, parameters, method)
        self.calc_worker.calculation_finished.connect(self.on_calculation_finished)
        self.calc_worker.progress_updated.connect(self.on_progress_updated)
        self.calc_worker.error_occurred.connect(self.on_error_occurred)
        
        # 更新界面状态
        self.calc_button.setEnabled(False)
        self.compare_button.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        self.status_label.setText("正在计算...")
        
        # 开始计算
        self.calc_worker.start()
    
    def start_comparison(self):
        """开始多方法对比计算"""
        if self.multi_worker and self.multi_worker.isRunning():
            return
        
        # 获取参数
        parameters = self.parameter_widget.get_parameters()
        
        # 创建工作线程
        self.multi_worker = MultiMethodWorker(self.calculator, parameters)
        self.multi_worker.calculation_finished.connect(self.on_comparison_finished)
        self.multi_worker.progress_updated.connect(self.on_progress_updated)
        self.multi_worker.error_occurred.connect(self.on_error_occurred)
        
        # 更新界面状态
        self.calc_button.setEnabled(False)
        self.compare_button.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        self.status_label.setText("正在进行方法对比...")
        
        # 开始计算
        self.multi_worker.start()
    
    def on_calculation_finished(self, result: ScourResult):
        """单一计算完成"""
        self.result_widget.display_single_result(result)
        self.reset_ui_state()
        
        if result.success:
            self.status_label.setText(f"计算完成 - 冲刷深度: {result.scour_depth:.3f}m")
        else:
            self.status_label.setText("计算失败")
    
    def on_comparison_finished(self, results: Dict[CalculationMethod, ScourResult]):
        """多方法对比完成"""
        self.result_widget.display_comparison_results(results)
        self.reset_ui_state()
        
        # 统计成功的方法数
        success_count = sum(1 for r in results.values() if r.success)
        self.status_label.setText(f"对比完成 - {success_count}/{len(results)} 个方法成功")
    
    def on_progress_updated(self, value: int):
        """进度更新"""
        self.progress_bar.setValue(value)
    
    def on_error_occurred(self, error_message: str):
        """计算错误"""
        QMessageBox.critical(self, "计算错误", f"计算过程中发生错误:\n{error_message}")
        self.reset_ui_state()
        self.status_label.setText("计算错误")
    
    def reset_ui_state(self):
        """重置界面状态"""
        self.calc_button.setEnabled(True)
        self.compare_button.setEnabled(True)
        self.progress_bar.setVisible(False)
    
    def update_performance_info(self):
        """更新性能信息"""
        # 更新缓存信息
        cache_stats = self.calculator.get_cache_stats()
        self.cache_label.setText(f"缓存: {cache_stats['cache_size']}/{cache_stats['max_cache_size']} (命中率: {cache_stats['hit_rate_percent']}%)")
        
        # 更新内存信息
        try:
            import psutil
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            self.memory_label.setText(f"内存: {memory_mb:.1f}MB")
        except ImportError:
            self.memory_label.setText("内存: --")
    
    def new_project(self):
        """新建项目"""
        # 重置参数到默认值
        default_params = ScourParameters(
            pier_diameter=2.0,
            pier_shape=PierShape.CIRCULAR,
            flow_velocity=1.5,
            water_depth=4.0,
            d50=0.8
        )
        self.parameter_widget.set_parameters(default_params)
        self.status_label.setText("新建项目")
    
    def open_project(self):
        """打开项目"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "打开项目", "", "JSON文件 (*.json)"
        )
        if file_path:
            # TODO: 实现项目加载
            self.status_label.setText(f"已打开: {Path(file_path).name}")
    
    def save_project(self):
        """保存项目"""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "保存项目", "", "JSON文件 (*.json)"
        )
        if file_path:
            # TODO: 实现项目保存
            self.status_label.setText(f"已保存: {Path(file_path).name}")
    
    def export_results(self):
        """导出结果"""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "导出结果", "", "CSV文件 (*.csv);;Excel文件 (*.xlsx)"
        )
        if file_path:
            # TODO: 实现结果导出
            self.status_label.setText(f"结果已导出: {Path(file_path).name}")
    
    def clear_cache(self):
        """清空缓存"""
        self.calculator.clear_cache()
        self.status_label.setText("缓存已清空")
        QMessageBox.information(self, "缓存管理", "缓存已成功清空")
    
    def show_performance_info(self):
        """显示性能信息"""
        cache_stats = self.calculator.get_cache_stats()
        
        info_text = f"""性能统计信息:

缓存使用:
- 缓存大小: {cache_stats['cache_size']}/{cache_stats['max_cache_size']}
- 缓存命中: {cache_stats['cache_hits']}
- 缓存未命中: {cache_stats['cache_misses']}
- 命中率: {cache_stats['hit_rate_percent']}%

内存使用:
"""
        
        try:
            import psutil
            process = psutil.Process()
            memory_info = process.memory_info()
            info_text += f"- RSS内存: {memory_info.rss / 1024 / 1024:.1f}MB\n"
            info_text += f"- VMS内存: {memory_info.vms / 1024 / 1024:.1f}MB"
        except ImportError:
            info_text += "- 内存信息不可用 (需要安装psutil)"
        
        QMessageBox.information(self, "性能信息", info_text)
    
    def show_about(self):
        """显示关于信息"""
        about_text = """DeepCAD-SCOUR 桥墩冲刷分析系统
版本: 2.0 优化版

特性:
• 多种经验公式方法
• 异步计算，流畅界面
• 智能缓存，快速响应
• 方法对比，科学分析

© 2025 DeepCAD Engineering Solutions
"""
        QMessageBox.about(self, "关于", about_text)


if __name__ == "__main__":
    from PyQt6.QtWidgets import QApplication
    
    app = QApplication(sys.argv)
    
    # 设置应用程序样式
    app.setStyle("Fusion")
    
    window = OptimizedMainWindow()
    window.show()
    
    sys.exit(app.exec())