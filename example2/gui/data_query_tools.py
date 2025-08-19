#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据查询工具
提供点击查询、路径积分、剖面分析等功能
"""

import sys
import numpy as np
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from PyQt6.QtWidgets import *
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QPoint
from PyQt6.QtGui import QFont, QAction, QCursor, QPainter, QPen
import json

try:
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
    from matplotlib.figure import Figure
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

class DataQueryWidget(QWidget):
    """数据查询主控件"""
    
    query_point_selected = pyqtSignal(float, float, float)  # 查询点选择信号
    path_selected = pyqtSignal(list)  # 路径选择信号
    
    def __init__(self):
        super().__init__()
        self.query_mode = "point"  # point, path, region
        self.query_results = []
        self.selected_points = []
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 查询模式选择
        mode_group = QGroupBox("🔍 查询模式")
        mode_group.setFont(QFont("Microsoft YaHei", 10, QFont.Weight.Bold))
        mode_layout = QVBoxLayout(mode_group)
        
        self.mode_radio_group = QButtonGroup()
        
        self.point_radio = QRadioButton("点查询")
        self.point_radio.setChecked(True)
        self.point_radio.setToolTip("点击模型查询单点数值")
        
        self.path_radio = QRadioButton("路径查询")
        self.path_radio.setToolTip("绘制路径查询沿线数值变化")
        
        self.region_radio = QRadioButton("区域查询")
        self.region_radio.setToolTip("框选区域查询统计信息")
        
        self.slice_radio = QRadioButton("剖面查询")
        self.slice_radio.setToolTip("创建剖面查询断面数值")
        
        for radio in [self.point_radio, self.path_radio, self.region_radio, self.slice_radio]:
            mode_layout.addWidget(radio)
            self.mode_radio_group.addButton(radio)
            
        layout.addWidget(mode_group)
        
        # 查询选项
        options_group = QGroupBox("⚙️ 查询选项")
        options_group.setFont(QFont("Microsoft YaHei", 10, QFont.Weight.Bold))
        options_layout = QFormLayout(options_group)
        
        # 查询半径（用于点查询）
        self.query_radius = QDoubleSpinBox()
        self.query_radius.setRange(0.01, 10.0)
        self.query_radius.setValue(0.1)
        self.query_radius.setSuffix(" m")
        options_layout.addRow("查询半径:", self.query_radius)
        
        # 插值方法
        self.interpolation_method = QComboBox()
        self.interpolation_method.addItems([
            "最近邻", "线性插值", "三次样条", "径向基函数"
        ])
        options_layout.addRow("插值方法:", self.interpolation_method)
        
        # 坐标系选择
        self.coordinate_system = QComboBox()
        self.coordinate_system.addItems([
            "全局坐标系", "局部坐标系", "柱坐标系", "球坐标系"
        ])
        options_layout.addRow("坐标系:", self.coordinate_system)
        
        layout.addWidget(options_group)
        
        # 查询结果显示
        results_group = QGroupBox("📊 查询结果")
        results_group.setFont(QFont("Microsoft YaHei", 10, QFont.Weight.Bold))
        results_layout = QVBoxLayout(results_group)
        
        # 结果表格
        self.results_table = QTableWidget()
        self.results_table.setMaximumHeight(200)
        results_layout.addWidget(self.results_table)
        
        # 结果操作按钮
        results_btn_layout = QHBoxLayout()
        
        self.clear_results_btn = QPushButton("🗑️ 清除结果")
        self.export_results_btn = QPushButton("📤 导出结果")
        self.plot_results_btn = QPushButton("📈 绘制图表")
        
        for btn in [self.clear_results_btn, self.export_results_btn, self.plot_results_btn]:
            btn.setMaximumHeight(30)
            results_btn_layout.addWidget(btn)
            
        results_layout.addLayout(results_btn_layout)
        layout.addWidget(results_group)
        
        # 统计信息
        stats_group = QGroupBox("📈 统计信息")
        stats_group.setFont(QFont("Microsoft YaHei", 10, QFont.Weight.Bold))
        stats_layout = QFormLayout(stats_group)
        
        self.stats_count_label = QLabel("0")
        self.stats_min_label = QLabel("--")
        self.stats_max_label = QLabel("--")
        self.stats_mean_label = QLabel("--")
        self.stats_std_label = QLabel("--")
        
        stats_layout.addRow("数据点数:", self.stats_count_label)
        stats_layout.addRow("最小值:", self.stats_min_label)
        stats_layout.addRow("最大值:", self.stats_max_label)
        stats_layout.addRow("平均值:", self.stats_mean_label)
        stats_layout.addRow("标准差:", self.stats_std_label)
        
        layout.addWidget(stats_group)
        
        # 连接信号
        self.connect_signals()
        
    def connect_signals(self):
        """连接信号"""
        self.mode_radio_group.buttonClicked.connect(self.on_mode_changed)
        self.clear_results_btn.clicked.connect(self.clear_results)
        self.export_results_btn.clicked.connect(self.export_results)
        self.plot_results_btn.clicked.connect(self.plot_results)
        
    def on_mode_changed(self, button):
        """查询模式改变"""
        if button == self.point_radio:
            self.query_mode = "point"
        elif button == self.path_radio:
            self.query_mode = "path"
        elif button == self.region_radio:
            self.query_mode = "region"
        elif button == self.slice_radio:
            self.query_mode = "slice"
            
        print(f"查询模式切换到: {self.query_mode}")
        
    def add_query_result(self, x: float, y: float, z: float, 
                        result_type: str, value: float, 
                        extra_data: Dict[str, Any] = None):
        """添加查询结果"""
        result = {
            'x': x, 'y': y, 'z': z,
            'type': result_type,
            'value': value,
            'extra': extra_data or {}
        }
        
        self.query_results.append(result)
        self.update_results_display()
        self.update_statistics()
        
    def update_results_display(self):
        """更新结果显示"""
        if not self.query_results:
            self.results_table.setRowCount(0)
            return
            
        # 设置表格
        self.results_table.setRowCount(len(self.query_results))
        self.results_table.setColumnCount(6)
        self.results_table.setHorizontalHeaderLabels([
            "X坐标", "Y坐标", "Z坐标", "结果类型", "数值", "单位"
        ])
        
        # 填充数据
        for i, result in enumerate(self.query_results):
            self.results_table.setItem(i, 0, QTableWidgetItem(f"{result['x']:.3f}"))
            self.results_table.setItem(i, 1, QTableWidgetItem(f"{result['y']:.3f}"))
            self.results_table.setItem(i, 2, QTableWidgetItem(f"{result['z']:.3f}"))
            self.results_table.setItem(i, 3, QTableWidgetItem(result['type']))
            self.results_table.setItem(i, 4, QTableWidgetItem(f"{result['value']:.6f}"))
            
            # 根据结果类型设置单位
            unit = self.get_unit_for_result_type(result['type'])
            self.results_table.setItem(i, 5, QTableWidgetItem(unit))
            
        self.results_table.resizeColumnsToContents()
        
    def get_unit_for_result_type(self, result_type: str) -> str:
        """根据结果类型获取单位"""
        unit_map = {
            '位移': 'm',
            '速度': 'm/s',
            '加速度': 'm/s²',
            '应力': 'Pa',
            '应变': '',
            '孔隙水压力': 'Pa',
            '安全系数': '',
            '塑性应变': '',
            '损伤指标': ''
        }
        return unit_map.get(result_type, '')
        
    def update_statistics(self):
        """更新统计信息"""
        if not self.query_results:
            self.stats_count_label.setText("0")
            self.stats_min_label.setText("--")
            self.stats_max_label.setText("--")
            self.stats_mean_label.setText("--")
            self.stats_std_label.setText("--")
            return
            
        values = [result['value'] for result in self.query_results]
        
        self.stats_count_label.setText(str(len(values)))
        self.stats_min_label.setText(f"{min(values):.6f}")
        self.stats_max_label.setText(f"{max(values):.6f}")
        self.stats_mean_label.setText(f"{np.mean(values):.6f}")
        self.stats_std_label.setText(f"{np.std(values):.6f}")
        
    def clear_results(self):
        """清除结果"""
        self.query_results.clear()
        self.selected_points.clear()
        self.update_results_display()
        self.update_statistics()
        
    def export_results(self):
        """导出结果"""
        if not self.query_results:
            QMessageBox.warning(self, "警告", "没有查询结果可导出！")
            return
            
        file_path, _ = QFileDialog.getSaveFileName(
            self, "导出查询结果", "query_results.xlsx",
            "Excel文件 (*.xlsx);;CSV文件 (*.csv);;JSON文件 (*.json)"
        )
        
        if file_path:
            try:
                self.save_results(file_path)
                QMessageBox.information(self, "成功", "查询结果导出成功！")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导出失败: {e}")
                
    def save_results(self, file_path: str):
        """保存结果到文件"""
        if file_path.endswith('.json'):
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(self.query_results, f, ensure_ascii=False, indent=2)
        elif file_path.endswith('.csv'):
            import csv
            with open(file_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['X坐标', 'Y坐标', 'Z坐标', '结果类型', '数值', '单位'])
                for result in self.query_results:
                    unit = self.get_unit_for_result_type(result['type'])
                    writer.writerow([
                        result['x'], result['y'], result['z'],
                        result['type'], result['value'], unit
                    ])
        # Excel导出需要openpyxl库
        
    def plot_results(self):
        """绘制结果图表"""
        if not self.query_results:
            QMessageBox.warning(self, "警告", "没有查询结果可绘制！")
            return
            
        dialog = QueryResultsPlotDialog(self.query_results, self.query_mode)
        dialog.exec()

class QueryResultsPlotDialog(QDialog):
    """查询结果绘图对话框"""
    
    def __init__(self, query_results: List[Dict], query_mode: str):
        super().__init__()
        self.query_results = query_results
        self.query_mode = query_mode
        self.setWindowTitle(f"查询结果图表 - {query_mode}")
        self.setModal(True)
        self.resize(800, 600)
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        if MATPLOTLIB_AVAILABLE:
            # 创建matplotlib图表
            self.figure = Figure(figsize=(10, 8))
            self.canvas = FigureCanvas(self.figure)
            layout.addWidget(self.canvas)
            
            # 创建图表
            self.create_plots()
        else:
            # 文本显示替代
            text_widget = QTextEdit()
            text_widget.setReadOnly(True)
            text_widget.append(f"查询结果统计 ({self.query_mode} 模式)\n")
            
            values = [result['value'] for result in self.query_results]
            text_widget.append(f"数据点数: {len(values)}")
            text_widget.append(f"最小值: {min(values):.6f}")
            text_widget.append(f"最大值: {max(values):.6f}")
            text_widget.append(f"平均值: {np.mean(values):.6f}")
            text_widget.append(f"标准差: {np.std(values):.6f}")
            
            layout.addWidget(text_widget)
            
        # 控制按钮
        btn_layout = QHBoxLayout()
        
        self.save_plot_btn = QPushButton("💾 保存图表")
        self.close_btn = QPushButton("❌ 关闭")
        
        btn_layout.addWidget(self.save_plot_btn)
        btn_layout.addWidget(self.close_btn)
        
        layout.addLayout(btn_layout)
        
        # 连接信号
        self.save_plot_btn.clicked.connect(self.save_plot)
        self.close_btn.clicked.connect(self.accept)
        
    def create_plots(self):
        """创建图表"""
        if not MATPLOTLIB_AVAILABLE:
            return
            
        # 提取数据
        x_coords = [result['x'] for result in self.query_results]
        y_coords = [result['y'] for result in self.query_results]
        z_coords = [result['z'] for result in self.query_results]
        values = [result['value'] for result in self.query_results]
        
        if self.query_mode == "point":
            # 点查询：散点图
            self.figure.clear()
            
            # 3D散点图
            ax1 = self.figure.add_subplot(221, projection='3d')
            scatter = ax1.scatter(x_coords, y_coords, z_coords, c=values, cmap='viridis')
            ax1.set_xlabel('X坐标')
            ax1.set_ylabel('Y坐标')
            ax1.set_zlabel('Z坐标')
            ax1.set_title('3D空间分布')
            self.figure.colorbar(scatter, ax=ax1, shrink=0.5)
            
            # 数值分布直方图
            ax2 = self.figure.add_subplot(222)
            ax2.hist(values, bins=20, alpha=0.7, color='skyblue')
            ax2.set_xlabel('数值')
            ax2.set_ylabel('频次')
            ax2.set_title('数值分布直方图')
            ax2.grid(True, alpha=0.3)
            
            # XY平面投影
            ax3 = self.figure.add_subplot(223)
            scatter_xy = ax3.scatter(x_coords, y_coords, c=values, cmap='viridis')
            ax3.set_xlabel('X坐标')
            ax3.set_ylabel('Y坐标')
            ax3.set_title('XY平面投影')
            self.figure.colorbar(scatter_xy, ax=ax3)
            
            # 统计信息
            ax4 = self.figure.add_subplot(224)
            ax4.axis('off')
            
            stats_text = f"""
            统计信息:
            数据点数: {len(values)}
            最小值: {min(values):.6f}
            最大值: {max(values):.6f}
            平均值: {np.mean(values):.6f}
            标准差: {np.std(values):.6f}
            中位数: {np.median(values):.6f}
            """
            ax4.text(0.1, 0.5, stats_text, fontsize=12, verticalalignment='center')
            
        elif self.query_mode == "path":
            # 路径查询：沿路径的数值变化
            self.figure.clear()
            
            # 计算沿路径的距离
            distances = [0]
            for i in range(1, len(x_coords)):
                dx = x_coords[i] - x_coords[i-1]
                dy = y_coords[i] - y_coords[i-1]
                dz = z_coords[i] - z_coords[i-1]
                dist = np.sqrt(dx**2 + dy**2 + dz**2)
                distances.append(distances[-1] + dist)
            
            # 沿路径的数值变化
            ax1 = self.figure.add_subplot(211)
            ax1.plot(distances, values, 'b.-', linewidth=2, markersize=6)
            ax1.set_xlabel('沿路径距离 (m)')
            ax1.set_ylabel('数值')
            ax1.set_title('沿路径数值变化')
            ax1.grid(True, alpha=0.3)
            
            # 3D路径显示
            ax2 = self.figure.add_subplot(212, projection='3d')
            ax2.plot(x_coords, y_coords, z_coords, 'r-', linewidth=2)
            scatter = ax2.scatter(x_coords, y_coords, z_coords, c=values, cmap='viridis', s=50)
            ax2.set_xlabel('X坐标')
            ax2.set_ylabel('Y坐标')
            ax2.set_zlabel('Z坐标')
            ax2.set_title('3D路径显示')
            self.figure.colorbar(scatter, ax=ax2, shrink=0.5)
            
        self.figure.tight_layout()
        self.canvas.draw()
        
    def save_plot(self):
        """保存图表"""
        if not MATPLOTLIB_AVAILABLE:
            QMessageBox.warning(self, "警告", "matplotlib不可用，无法保存图表！")
            return
            
        file_path, _ = QFileDialog.getSaveFileName(
            self, "保存图表", "query_plot.png",
            "PNG图像 (*.png);;JPG图像 (*.jpg);;PDF文件 (*.pdf);;SVG文件 (*.svg)"
        )
        
        if file_path:
            try:
                self.figure.savefig(file_path, dpi=300, bbox_inches='tight')
                QMessageBox.information(self, "成功", "图表保存成功！")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"保存失败: {e}")

class SliceAnalysisDialog(QDialog):
    """剖面分析对话框"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("剖面分析")
        self.setModal(True)
        self.resize(600, 500)
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 剖面定义
        slice_group = QGroupBox("📐 剖面定义")
        slice_group.setFont(QFont("Microsoft YaHei", 10, QFont.Weight.Bold))
        slice_layout = QFormLayout(slice_group)
        
        # 剖面类型
        self.slice_type = QComboBox()
        self.slice_type.addItems([
            "XY平面剖面", "XZ平面剖面", "YZ平面剖面",
            "任意平面剖面", "圆柱面剖面", "球面剖面"
        ])
        slice_layout.addRow("剖面类型:", self.slice_type)
        
        # 剖面位置
        self.slice_position = QDoubleSpinBox()
        self.slice_position.setRange(-1000, 1000)
        self.slice_position.setValue(0)
        slice_layout.addRow("剖面位置:", self.slice_position)
        
        # 剖面厚度
        self.slice_thickness = QDoubleSpinBox()
        self.slice_thickness.setRange(0.01, 10.0)
        self.slice_thickness.setValue(0.1)
        self.slice_thickness.setSuffix(" m")
        slice_layout.addRow("剖面厚度:", self.slice_thickness)
        
        layout.addWidget(slice_group)
        
        # 分析选项
        analysis_group = QGroupBox("🔬 分析选项")
        analysis_group.setFont(QFont("Microsoft YaHei", 10, QFont.Weight.Bold))
        analysis_layout = QVBoxLayout(analysis_group)
        
        self.show_contour_cb = QCheckBox("显示等值线")
        self.show_contour_cb.setChecked(True)
        
        self.show_vectors_cb = QCheckBox("显示矢量场")
        
        self.show_streamlines_cb = QCheckBox("显示流线")
        
        self.export_data_cb = QCheckBox("导出剖面数据")
        
        for cb in [self.show_contour_cb, self.show_vectors_cb, 
                  self.show_streamlines_cb, self.export_data_cb]:
            analysis_layout.addWidget(cb)
            
        layout.addWidget(analysis_group)
        
        # 按钮
        btn_layout = QHBoxLayout()
        
        self.create_slice_btn = QPushButton("✂️ 创建剖面")
        self.preview_btn = QPushButton("👁️ 预览")
        self.ok_btn = QPushButton("✅ 确定")
        self.cancel_btn = QPushButton("❌ 取消")
        
        for btn in [self.create_slice_btn, self.preview_btn, self.ok_btn, self.cancel_btn]:
            btn_layout.addWidget(btn)
            
        layout.addLayout(btn_layout)
        
        # 连接信号
        self.create_slice_btn.clicked.connect(self.create_slice)
        self.preview_btn.clicked.connect(self.preview_slice)
        self.ok_btn.clicked.connect(self.accept)
        self.cancel_btn.clicked.connect(self.reject)
        
    def create_slice(self):
        """创建剖面"""
        slice_type = self.slice_type.currentText()
        position = self.slice_position.value()
        thickness = self.slice_thickness.value()
        
        QMessageBox.information(self, "剖面创建", 
                               f"创建{slice_type}\n位置: {position}\n厚度: {thickness} m")
        
    def preview_slice(self):
        """预览剖面"""
        QMessageBox.information(self, "预览", "剖面预览功能正在开发中...")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    
    # 测试数据查询工具
    query_widget = DataQueryWidget()
    query_widget.show()
    
    # 添加一些测试数据
    import random
    for i in range(10):
        x = random.uniform(-10, 10)
        y = random.uniform(-5, 5)
        z = random.uniform(-20, 0)
        value = random.uniform(-0.1, 0.05)
        query_widget.add_query_result(x, y, z, "位移", value)
    
    sys.exit(app.exec())