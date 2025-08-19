#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强后处理界面
扩展结果类型、添加专业分析工具、完善数据查询功能
"""

import sys
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from PyQt6.QtWidgets import *
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QThread
from PyQt6.QtGui import QFont, QAction, QCursor
import json

# 尝试导入可视化库
try:
    import pyvista as pv
    from pyvistaqt import QtInteractor
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

try:
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
    from matplotlib.figure import Figure
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

class ExcavationAnalysisTools(QWidget):
    """基坑专业分析工具"""
    
    def __init__(self):
        super().__init__()
        self.monitoring_points = []
        self.deformation_profiles = []
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 监测点管理
        monitoring_group = QGroupBox("📍 监测点管理")
        monitoring_group.setFont(QFont("Microsoft YaHei", 10, QFont.Weight.Bold))
        monitoring_layout = QVBoxLayout(monitoring_group)
        
        # 监测点列表
        self.monitoring_list = QListWidget()
        self.monitoring_list.setMaximumHeight(120)
        monitoring_layout.addWidget(QLabel("监测点列表:"))
        monitoring_layout.addWidget(self.monitoring_list)
        
        # 监测点操作按钮
        monitoring_btn_layout = QHBoxLayout()
        self.add_point_btn = QPushButton("➕ 添加点")
        self.delete_point_btn = QPushButton("🗑️ 删除点")
        self.export_points_btn = QPushButton("📤 导出数据")
        
        for btn in [self.add_point_btn, self.delete_point_btn, self.export_points_btn]:
            btn.setMaximumHeight(30)
            monitoring_btn_layout.addWidget(btn)
            
        monitoring_layout.addLayout(monitoring_btn_layout)
        layout.addWidget(monitoring_group)
        
        # 变形分析
        deformation_group = QGroupBox("📏 变形分析")
        deformation_group.setFont(QFont("Microsoft YaHei", 10, QFont.Weight.Bold))
        deformation_layout = QVBoxLayout(deformation_group)
        
        # 分析类型选择
        analysis_type_layout = QHBoxLayout()
        self.analysis_type_combo = QComboBox()
        self.analysis_type_combo.addItems([
            "水平位移分析",
            "竖向位移分析", 
            "总位移分析",
            "地表沉降曲线",
            "围护结构变形"
        ])
        analysis_type_layout.addWidget(QLabel("分析类型:"))
        analysis_type_layout.addWidget(self.analysis_type_combo)
        deformation_layout.addLayout(analysis_type_layout)
        
        # 分析操作按钮
        deformation_btn_layout = QHBoxLayout()
        self.create_profile_btn = QPushButton("📊 创建剖面")
        self.analyze_trend_btn = QPushButton("📈 趋势分析")
        self.safety_check_btn = QPushButton("⚠️ 安全检查")
        
        for btn in [self.create_profile_btn, self.analyze_trend_btn, self.safety_check_btn]:
            btn.setMaximumHeight(30)
            deformation_btn_layout.addWidget(btn)
            
        deformation_layout.addLayout(deformation_btn_layout)
        layout.addWidget(deformation_group)
        
        # 支护结构分析
        support_group = QGroupBox("🏗️ 支护结构分析")
        support_group.setFont(QFont("Microsoft YaHei", 10, QFont.Weight.Bold))
        support_layout = QVBoxLayout(support_group)
        
        # 支护类型选择
        support_type_layout = QHBoxLayout()
        self.support_type_combo = QComboBox()
        self.support_type_combo.addItems([
            "地连墙内力",
            "支撑轴力",
            "锚杆拉力",
            "桩基内力",
            "围护结构应力"
        ])
        support_type_layout.addWidget(QLabel("支护类型:"))
        support_type_layout.addWidget(self.support_type_combo)
        support_layout.addLayout(support_type_layout)
        
        # 支护分析按钮
        support_btn_layout = QHBoxLayout()
        self.support_force_btn = QPushButton("🔧 内力分析")
        self.support_safety_btn = QPushButton("🛡️ 安全评估")
        self.support_optimize_btn = QPushButton("⚙️ 优化建议")
        
        for btn in [self.support_force_btn, self.support_safety_btn, self.support_optimize_btn]:
            btn.setMaximumHeight(30)
            support_btn_layout.addWidget(btn)
            
        support_layout.addLayout(support_btn_layout)
        layout.addWidget(support_group)
        
        # 连接信号
        self.connect_signals()
        
    def connect_signals(self):
        """连接信号"""
        self.add_point_btn.clicked.connect(self.add_monitoring_point)
        self.delete_point_btn.clicked.connect(self.delete_monitoring_point)
        self.export_points_btn.clicked.connect(self.export_monitoring_data)
        
        self.create_profile_btn.clicked.connect(self.create_deformation_profile)
        self.analyze_trend_btn.clicked.connect(self.analyze_deformation_trend)
        self.safety_check_btn.clicked.connect(self.perform_safety_check)
        
        self.support_force_btn.clicked.connect(self.analyze_support_forces)
        self.support_safety_btn.clicked.connect(self.evaluate_support_safety)
        self.support_optimize_btn.clicked.connect(self.suggest_support_optimization)
        
    def add_monitoring_point(self):
        """添加监测点"""
        dialog = MonitoringPointDialog(self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            point_data = dialog.get_point_data()
            self.monitoring_points.append(point_data)
            self.monitoring_list.addItem(f"监测点 {len(self.monitoring_points)}: {point_data['name']}")
            
    def delete_monitoring_point(self):
        """删除监测点"""
        current_row = self.monitoring_list.currentRow()
        if current_row >= 0:
            reply = QMessageBox.question(self, "确认删除", "确定要删除该监测点吗？")
            if reply == QMessageBox.StandardButton.Yes:
                del self.monitoring_points[current_row]
                self.monitoring_list.takeItem(current_row)
                
    def export_monitoring_data(self):
        """导出监测数据"""
        if not self.monitoring_points:
            QMessageBox.warning(self, "警告", "没有监测点数据可导出！")
            return
            
        file_path, _ = QFileDialog.getSaveFileName(
            self, "导出监测数据", "monitoring_data.xlsx", 
            "Excel文件 (*.xlsx);;CSV文件 (*.csv);;JSON文件 (*.json)"
        )
        
        if file_path:
            try:
                self.save_monitoring_data(file_path)
                QMessageBox.information(self, "成功", "监测数据导出成功！")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导出失败: {e}")
                
    def save_monitoring_data(self, file_path: str):
        """保存监测数据"""
        if file_path.endswith('.json'):
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(self.monitoring_points, f, ensure_ascii=False, indent=2)
        elif file_path.endswith('.csv'):
            # 实现CSV导出
            pass
        elif file_path.endswith('.xlsx'):
            # 实现Excel导出（需要openpyxl库）
            pass
            
    def create_deformation_profile(self):
        """创建变形剖面"""
        if not self.monitoring_points:
            QMessageBox.warning(self, "警告", "请先添加监测点！")
            return
            
        analysis_type = self.analysis_type_combo.currentText()
        
        # 创建剖面分析对话框
        dialog = DeformationProfileDialog(self.monitoring_points, analysis_type)
        dialog.exec()
        
    def analyze_deformation_trend(self):
        """分析变形趋势"""
        QMessageBox.information(self, "功能开发中", "变形趋势分析功能正在开发中...")
        
    def perform_safety_check(self):
        """执行安全检查"""
        # 实现基坑安全检查逻辑
        safety_results = self.calculate_safety_factors()
        
        dialog = SafetyCheckDialog(safety_results)
        dialog.exec()
        
    def calculate_safety_factors(self) -> Dict[str, Any]:
        """计算安全系数"""
        # 示例安全系数计算
        return {
            "overall_stability": 2.1,
            "sliding_stability": 1.8,
            "overturning_stability": 2.5,
            "bearing_capacity": 3.2,
            "warnings": [
                "地连墙顶部位移超过警戒值",
                "支撑轴力接近设计值"
            ],
            "recommendations": [
                "增加监测频率",
                "考虑增加支撑点"
            ]
        }
        
    def analyze_support_forces(self):
        """分析支护内力"""
        support_type = self.support_type_combo.currentText()
        QMessageBox.information(self, "内力分析", f"正在分析{support_type}...")
        
    def evaluate_support_safety(self):
        """评估支护安全性"""
        QMessageBox.information(self, "安全评估", "支护结构安全评估功能正在开发中...")
        
    def suggest_support_optimization(self):
        """建议支护优化"""
        QMessageBox.information(self, "优化建议", "支护优化建议功能正在开发中...")

class MonitoringPointDialog(QDialog):
    """监测点对话框"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("添加监测点")
        self.setModal(True)
        self.resize(400, 300)
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        layout = QFormLayout(self)
        
        self.name_edit = QLineEdit()
        self.x_edit = QDoubleSpinBox()
        self.x_edit.setRange(-10000, 10000)
        self.y_edit = QDoubleSpinBox()
        self.y_edit.setRange(-10000, 10000)
        self.z_edit = QDoubleSpinBox()
        self.z_edit.setRange(-1000, 1000)
        
        self.type_combo = QComboBox()
        self.type_combo.addItems([
            "地表沉降点",
            "围护结构测斜点",
            "地下水位观测点",
            "建筑物沉降点",
            "支撑轴力点"
        ])
        
        layout.addRow("点名称:", self.name_edit)
        layout.addRow("X坐标:", self.x_edit)
        layout.addRow("Y坐标:", self.y_edit)
        layout.addRow("Z坐标:", self.z_edit)
        layout.addRow("监测类型:", self.type_combo)
        
        # 按钮
        button_layout = QHBoxLayout()
        self.ok_btn = QPushButton("确定")
        self.cancel_btn = QPushButton("取消")
        
        button_layout.addWidget(self.ok_btn)
        button_layout.addWidget(self.cancel_btn)
        
        layout.addRow(button_layout)
        
        # 连接信号
        self.ok_btn.clicked.connect(self.accept)
        self.cancel_btn.clicked.connect(self.reject)
        
    def get_point_data(self) -> Dict[str, Any]:
        """获取点数据"""
        return {
            "name": self.name_edit.text(),
            "x": self.x_edit.value(),
            "y": self.y_edit.value(),
            "z": self.z_edit.value(),
            "type": self.type_combo.currentText()
        }

class DeformationProfileDialog(QDialog):
    """变形剖面对话框"""
    
    def __init__(self, monitoring_points: List[Dict], analysis_type: str):
        super().__init__()
        self.monitoring_points = monitoring_points
        self.analysis_type = analysis_type
        self.setWindowTitle(f"变形剖面 - {analysis_type}")
        self.setModal(True)
        self.resize(800, 600)
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        if MATPLOTLIB_AVAILABLE:
            # 创建matplotlib图表
            self.figure = Figure(figsize=(10, 6))
            self.canvas = FigureCanvas(self.figure)
            layout.addWidget(self.canvas)
            
            # 创建剖面图
            self.create_profile_plot()
        else:
            # 文本显示替代
            text_widget = QTextEdit()
            text_widget.setReadOnly(True)
            text_widget.append(f"变形剖面分析: {self.analysis_type}\n")
            
            for i, point in enumerate(self.monitoring_points):
                text_widget.append(f"监测点 {i+1}: {point['name']} ({point['x']:.2f}, {point['y']:.2f}, {point['z']:.2f})")
                
            layout.addWidget(text_widget)
            
        # 关闭按钮
        close_btn = QPushButton("关闭")
        close_btn.clicked.connect(self.accept)
        layout.addWidget(close_btn)
        
    def create_profile_plot(self):
        """创建剖面图"""
        if not MATPLOTLIB_AVAILABLE:
            return
            
        ax = self.figure.add_subplot(111)
        
        # 提取坐标和模拟变形数据
        x_coords = [point['x'] for point in self.monitoring_points]
        y_coords = [point['y'] for point in self.monitoring_points]
        
        # 模拟变形数据（实际使用时应从分析结果中获取）
        deformations = np.random.uniform(-0.05, 0.02, len(x_coords))
        
        if "水平位移" in self.analysis_type:
            ax.plot(x_coords, deformations, 'bo-', label='水平位移')
            ax.set_ylabel('水平位移 (m)')
            ax.set_xlabel('X坐标 (m)')
        elif "竖向位移" in self.analysis_type:
            ax.plot(x_coords, deformations, 'ro-', label='竖向位移')
            ax.set_ylabel('竖向位移 (m)')
            ax.set_xlabel('X坐标 (m)')
        elif "总位移" in self.analysis_type:
            total_disp = np.sqrt(deformations**2 + np.random.uniform(0, 0.01, len(deformations))**2)
            ax.plot(x_coords, total_disp, 'go-', label='总位移')
            ax.set_ylabel('总位移 (m)')
            ax.set_xlabel('X坐标 (m)')
            
        ax.grid(True, alpha=0.3)
        ax.legend()
        ax.set_title(f'{self.analysis_type}剖面图')
        
        # 添加警戒线
        if "竖向位移" in self.analysis_type or "沉降" in self.analysis_type:
            ax.axhline(y=-0.03, color='r', linestyle='--', alpha=0.7, label='警戒值')
            
        self.canvas.draw()

class SafetyCheckDialog(QDialog):
    """安全检查对话框"""
    
    def __init__(self, safety_results: Dict[str, Any]):
        super().__init__()
        self.safety_results = safety_results
        self.setWindowTitle("基坑安全检查结果")
        self.setModal(True)
        self.resize(500, 400)
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 安全系数表格
        safety_group = QGroupBox("🛡️ 安全系数")
        safety_layout = QVBoxLayout(safety_group)
        
        safety_table = QTableWidget(4, 2)
        safety_table.setHorizontalHeaderLabels(["检查项目", "安全系数"])
        
        safety_items = [
            ("整体稳定性", self.safety_results.get("overall_stability", 0)),
            ("滑移稳定性", self.safety_results.get("sliding_stability", 0)),
            ("倾覆稳定性", self.safety_results.get("overturning_stability", 0)),
            ("承载力", self.safety_results.get("bearing_capacity", 0))
        ]
        
        for i, (item, value) in enumerate(safety_items):
            safety_table.setItem(i, 0, QTableWidgetItem(item))
            
            value_item = QTableWidgetItem(f"{value:.2f}")
            if value >= 2.0:
                value_item.setBackground(Qt.GlobalColor.green)
            elif value >= 1.5:
                value_item.setBackground(Qt.GlobalColor.yellow)
            else:
                value_item.setBackground(Qt.GlobalColor.red)
                
            safety_table.setItem(i, 1, value_item)
            
        safety_table.resizeColumnsToContents()
        safety_layout.addWidget(safety_table)
        layout.addWidget(safety_group)
        
        # 警告信息
        warnings = self.safety_results.get("warnings", [])
        if warnings:
            warning_group = QGroupBox("⚠️ 警告信息")
            warning_layout = QVBoxLayout(warning_group)
            
            for warning in warnings:
                warning_label = QLabel(f"• {warning}")
                warning_label.setStyleSheet("color: red;")
                warning_layout.addWidget(warning_label)
                
            layout.addWidget(warning_group)
            
        # 建议措施
        recommendations = self.safety_results.get("recommendations", [])
        if recommendations:
            rec_group = QGroupBox("💡 建议措施")
            rec_layout = QVBoxLayout(rec_group)
            
            for rec in recommendations:
                rec_label = QLabel(f"• {rec}")
                rec_label.setStyleSheet("color: blue;")
                rec_layout.addWidget(rec_label)
                
            layout.addWidget(rec_group)
            
        # 关闭按钮
        close_btn = QPushButton("关闭")
        close_btn.clicked.connect(self.accept)
        layout.addWidget(close_btn)

class EnhancedResultTypeWidget(QWidget):
    """增强的结果类型选择组件"""
    
    result_type_changed = pyqtSignal(str, str)  # 结果类型, 分量
    
    def __init__(self):
        super().__init__()
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 结果类型组
        result_group = QGroupBox("📈 结果类型")
        result_group.setFont(QFont("Microsoft YaHei", 10, QFont.Weight.Bold))
        result_layout = QVBoxLayout(result_group)
        
        self.result_type = QComboBox()
        self.result_type.addItems([
            "位移", "速度", "加速度",
            "应力", "应变", "塑性应变", 
            "孔隙水压力", "有效应力", "安全系数",
            "塑性指示器", "损伤指标", "能量密度"
        ])
        result_layout.addWidget(self.result_type)
        
        # 分量选择
        self.component_type = QComboBox()
        self.update_component_options("位移")  # 默认位移
        result_layout.addWidget(self.component_type)
        
        # 额外选项
        options_layout = QHBoxLayout()
        
        self.show_deformed_cb = QCheckBox("显示变形")
        self.show_deformed_cb.setChecked(True)
        
        self.show_contour_cb = QCheckBox("显示云图")
        self.show_contour_cb.setChecked(True)
        
        self.show_vectors_cb = QCheckBox("显示矢量")
        
        options_layout.addWidget(self.show_deformed_cb)
        options_layout.addWidget(self.show_contour_cb)
        options_layout.addWidget(self.show_vectors_cb)
        
        result_layout.addLayout(options_layout)
        layout.addWidget(result_group)
        
        # 高级选项
        advanced_group = QGroupBox("🔧 高级选项")
        advanced_group.setFont(QFont("Microsoft YaHei", 10, QFont.Weight.Bold))
        advanced_layout = QFormLayout(advanced_group)
        
        # 变形比例
        self.deformation_scale = QDoubleSpinBox()
        self.deformation_scale.setRange(0.1, 100.0)
        self.deformation_scale.setValue(10.0)
        self.deformation_scale.setSuffix("x")
        advanced_layout.addRow("变形比例:", self.deformation_scale)
        
        # 云图范围
        self.contour_range_auto = QCheckBox("自动范围")
        self.contour_range_auto.setChecked(True)
        advanced_layout.addRow("云图范围:", self.contour_range_auto)
        
        self.contour_min = QDoubleSpinBox()
        self.contour_min.setEnabled(False)
        self.contour_max = QDoubleSpinBox()
        self.contour_max.setEnabled(False)
        
        range_layout = QHBoxLayout()
        range_layout.addWidget(QLabel("最小值:"))
        range_layout.addWidget(self.contour_min)
        range_layout.addWidget(QLabel("最大值:"))
        range_layout.addWidget(self.contour_max)
        
        advanced_layout.addRow("手动范围:", range_layout)
        
        # 云图样式
        self.colormap_combo = QComboBox()
        self.colormap_combo.addItems([
            "viridis", "plasma", "inferno", "magma",
            "jet", "rainbow", "cool", "hot"
        ])
        advanced_layout.addRow("配色方案:", self.colormap_combo)
        
        layout.addWidget(advanced_group)
        
        # 连接信号
        self.connect_signals()
        
    def connect_signals(self):
        """连接信号"""
        self.result_type.currentTextChanged.connect(self.on_result_type_changed)
        self.component_type.currentTextChanged.connect(self.on_component_changed)
        self.contour_range_auto.toggled.connect(self.on_auto_range_toggled)
        
    def on_result_type_changed(self, result_type: str):
        """结果类型改变"""
        self.update_component_options(result_type)
        self.result_type_changed.emit(result_type, self.component_type.currentText())
        
    def on_component_changed(self, component: str):
        """分量改变"""
        self.result_type_changed.emit(self.result_type.currentText(), component)
        
    def on_auto_range_toggled(self, auto: bool):
        """自动范围切换"""
        self.contour_min.setEnabled(not auto)
        self.contour_max.setEnabled(not auto)
        
    def update_component_options(self, result_type: str):
        """更新分量选项"""
        self.component_type.clear()
        
        if result_type in ["位移", "速度", "加速度"]:
            self.component_type.addItems([
                "合成", "X分量", "Y分量", "Z分量"
            ])
        elif result_type in ["应力", "有效应力"]:
            self.component_type.addItems([
                "von Mises", "最大主应力", "最小主应力",
                "XX分量", "YY分量", "ZZ分量", 
                "XY分量", "YZ分量", "XZ分量"
            ])
        elif result_type in ["应变", "塑性应变"]:
            self.component_type.addItems([
                "等效应变", "最大主应变", "最小主应变",
                "XX分量", "YY分量", "ZZ分量",
                "XY分量", "YZ分量", "XZ分量"
            ])
        elif result_type == "孔隙水压力":
            self.component_type.addItems(["压力值"])
        elif result_type == "安全系数":
            self.component_type.addItems([
                "整体安全系数", "滑移安全系数", "倾覆安全系数"
            ])
        elif result_type in ["塑性指示器", "损伤指标"]:
            self.component_type.addItems(["指标值"])
        elif result_type == "能量密度":
            self.component_type.addItems([
                "应变能密度", "动能密度", "总能量密度"
            ])
        else:
            self.component_type.addItems(["数值"])

if __name__ == "__main__":
    app = QApplication(sys.argv)
    
    # 测试专业分析工具
    tools = ExcavationAnalysisTools()
    tools.show()
    
    sys.exit(app.exec())