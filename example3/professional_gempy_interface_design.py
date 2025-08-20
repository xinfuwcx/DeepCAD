"""
专业级GemPy 2025界面设计
Professional GemPy 2025 Interface Design
基于GemPy 2025.2.0的完整功能设计工业级地质建模CAE系统
"""

import sys
import os
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import json
import pickle
from datetime import datetime

# PyQt6 imports
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QSplitter, QTreeWidget, QTreeWidgetItem, QTabWidget, QTextEdit,
    QToolBar, QMenuBar, QStatusBar, QDockWidget, QGroupBox, QFormLayout,
    QLabel, QLineEdit, QPushButton, QComboBox, QSpinBox, QDoubleSpinBox,
    QCheckBox, QProgressBar, QTableWidget, QTableWidgetItem, QHeaderView,
    QFileDialog, QMessageBox, QDialog, QDialogButtonBox, QScrollArea,
    QFrame, QButtonGroup, QRadioButton, QSlider, QListWidget, QGridLayout,
    QStackedWidget, QToolButton, QMenu, QActionGroup, QSizePolicy
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer, QMimeData, QUrl, QSize
from PyQt6.QtGui import (
    QAction, QIcon, QFont, QPixmap, QPalette, QColor, QDragEnterEvent, 
    QDropEvent, QStandardItemModel, QStandardItem, QKeySequence
)

# Scientific computing
import gempy as gp
import gempy_engine as gpe
import gempy_viewer as gpv
import pyvista as pv
import pyvistaqt as pvqt
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure

# Optional imports
try:
    import qtawesome as qta
    ICONS_AVAILABLE = True
except ImportError:
    ICONS_AVAILABLE = False

class ProfessionalStyleSheet:
    """专业级CAE软件样式表"""
    
    @staticmethod
    def get_main_style():
        return """
        /* 主窗口 - 仿Abaqus/ANSYS风格 */
        QMainWindow {
            background-color: #f5f5f5;
            color: #2c3e50;
            font-family: 'Segoe UI', 'Arial', sans-serif;
        }
        
        /* 菜单栏 */
        QMenuBar {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #ffffff, stop:1 #e8e8e8);
            border-bottom: 1px solid #bdc3c7;
            padding: 2px;
            font-size: 13px;
        }
        
        QMenuBar::item {
            background: transparent;
            padding: 8px 16px;
            margin: 0px;
            border-radius: 4px;
        }
        
        QMenuBar::item:selected {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #e3f2fd, stop:1 #bbdefb);
            border: 1px solid #2196f3;
        }
        
        /* 工具栏 */
        QToolBar {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #fafafa, stop:1 #eeeeee);
            border: 1px solid #d0d0d0;
            spacing: 2px;
            padding: 4px;
            min-height: 40px;
        }
        
        QToolButton {
            background: transparent;
            border: 1px solid transparent;
            border-radius: 4px;
            padding: 6px;
            margin: 1px;
            min-width: 24px;
            min-height: 24px;
        }
        
        QToolButton:hover {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #e1f5fe, stop:1 #b3e5fc);
            border: 1px solid #4fc3f7;
        }
        
        QToolButton:pressed {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #b3e5fc, stop:1 #81d4fa);
        }
        
        QToolButton:checked {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #c8e6c9, stop:1 #a5d6a7);
            border: 1px solid #66bb6a;
        }
        
        /* 状态栏 */
        QStatusBar {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #f8f9fa, stop:1 #e9ecef);
            border-top: 1px solid #dee2e6;
            padding: 2px;
        }
        
        /* 停靠窗口 */
        QDockWidget {
            background: #ffffff;
            border: 1px solid #d0d0d0;
            titlebar-close-icon: url(close.png);
            titlebar-normal-icon: url(float.png);
        }
        
        QDockWidget::title {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #f0f0f0, stop:1 #e0e0e0);
            border-bottom: 1px solid #c0c0c0;
            padding: 8px;
            font-weight: bold;
            color: #2c3e50;
        }
        
        /* 树形控件 */
        QTreeWidget {
            background: #ffffff;
            border: 1px solid #d0d0d0;
            outline: none;
            font-size: 12px;
        }
        
        QTreeWidget::item {
            height: 24px;
            border-bottom: 1px solid #f0f0f0;
            padding: 2px 4px;
        }
        
        QTreeWidget::item:selected {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #e3f2fd, stop:1 #bbdefb);
            border: 1px solid #2196f3;
        }
        
        QTreeWidget::item:hover {
            background: #f5f5f5;
        }
        
        /* 选项卡 */
        QTabWidget::pane {
            border: 1px solid #d0d0d0;
            background: #ffffff;
            border-radius: 4px;
        }
        
        QTabBar::tab {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #f0f0f0, stop:1 #e0e0e0);
            border: 1px solid #d0d0d0;
            padding: 8px 16px;
            margin-right: 2px;
            border-top-left-radius: 4px;
            border-top-right-radius: 4px;
            min-width: 80px;
        }
        
        QTabBar::tab:selected {
            background: #ffffff;
            border-bottom-color: #ffffff;
            font-weight: bold;
            color: #1976d2;
        }
        
        QTabBar::tab:hover {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #f8f9fa, stop:1 #e9ecef);
        }
        
        /* 按钮 */
        QPushButton {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #ffffff, stop:1 #f8f9fa);
            border: 1px solid #d0d0d0;
            border-radius: 4px;
            padding: 6px 12px;
            font-size: 12px;
            min-height: 24px;
        }
        
        QPushButton:hover {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #e3f2fd, stop:1 #e1f5fe);
            border: 1px solid #2196f3;
        }
        
        QPushButton:pressed {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #bbdefb, stop:1 #90caf9);
        }
        
        QPushButton:disabled {
            background: #f5f5f5;
            color: #9e9e9e;
            border-color: #e0e0e0;
        }
        
        /* 主要按钮 */
        QPushButton[class="primary"] {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #2196f3, stop:1 #1976d2);
            border: 1px solid #1565c0;
            color: white;
            font-weight: bold;
        }
        
        QPushButton[class="primary"]:hover {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #1976d2, stop:1 #1565c0);
        }
        
        /* 输入控件 */
        QLineEdit, QSpinBox, QDoubleSpinBox, QComboBox {
            background: #ffffff;
            border: 1px solid #d0d0d0;
            border-radius: 4px;
            padding: 4px 8px;
            font-size: 12px;
            min-height: 20px;
        }
        
        QLineEdit:focus, QSpinBox:focus, QDoubleSpinBox:focus, QComboBox:focus {
            border: 2px solid #2196f3;
            background: #fafafa;
        }
        
        /* 表格 */
        QTableWidget {
            background: #ffffff;
            border: 1px solid #d0d0d0;
            gridline-color: #e0e0e0;
            font-size: 12px;
        }
        
        QTableWidget::item {
            padding: 4px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        QTableWidget::item:selected {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #e3f2fd, stop:1 #bbdefb);
        }
        
        QHeaderView::section {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #f8f9fa, stop:1 #e9ecef);
            border: 1px solid #dee2e6;
            padding: 4px 8px;
            font-weight: bold;
            color: #495057;
        }
        
        /* 进度条 */
        QProgressBar {
            border: 1px solid #d0d0d0;
            border-radius: 4px;
            text-align: center;
            background: #f8f9fa;
            font-size: 11px;
            font-weight: bold;
        }
        
        QProgressBar::chunk {
            background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                stop:0 #4caf50, stop:1 #388e3c);
            border-radius: 3px;
        }
        
        /* 分组框 */
        QGroupBox {
            font-weight: bold;
            border: 2px solid #d0d0d0;
            border-radius: 6px;
            margin-top: 12px;
            padding-top: 8px;
            background: #fafafa;
        }
        
        QGroupBox::title {
            subcontrol-origin: margin;
            left: 10px;
            padding: 0 8px;
            background: #ffffff;
            color: #1976d2;
            border: 1px solid #d0d0d0;
            border-radius: 4px;
        }
        """

class ModelTreeWidget(QTreeWidget):
    """专业模型树组件"""
    
    item_selected = pyqtSignal(str, dict)  # item_type, item_data
    item_context_menu = pyqtSignal(str, dict, object)  # item_type, item_data, pos
    
    def __init__(self):
        super().__init__()
        self.setup_ui()
        self.setup_model_structure()
        
    def setup_ui(self):
        """设置界面"""
        self.setHeaderLabel("地质模型结构")
        self.setAlternatingRowColors(True)
        self.setAnimated(True)
        self.setExpandsOnDoubleClick(True)
        
        # 连接信号
        self.itemClicked.connect(self.on_item_clicked)
        self.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.customContextMenuRequested.connect(self.show_context_menu)
        
    def setup_model_structure(self):
        """建立标准地质模型树结构"""
        # 项目根节点
        self.project_item = QTreeWidgetItem(self, ["地质建模项目"])
        self.project_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "project", "id": "main"})
        if ICONS_AVAILABLE:
            self.project_item.setIcon(0, qta.icon('fa.folder-open', color='#f39c12'))
        
        # 数据管理
        self.data_item = QTreeWidgetItem(self.project_item, ["数据管理"])
        self.data_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "data_manager"})
        if ICONS_AVAILABLE:
            self.data_item.setIcon(0, qta.icon('fa.database', color='#3498db'))
            
        # 钻孔数据
        self.borehole_item = QTreeWidgetItem(self.data_item, ["钻孔数据"])
        self.borehole_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "borehole_data"})
        if ICONS_AVAILABLE:
            self.borehole_item.setIcon(0, qta.icon('fa.circle-o', color='#e67e22'))
            
        # 地层界面点
        self.surface_item = QTreeWidgetItem(self.data_item, ["地层界面点"])
        self.surface_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "surface_points"})
        if ICONS_AVAILABLE:
            self.surface_item.setIcon(0, qta.icon('fa.map-marker', color='#e74c3c'))
            
        # 产状数据
        self.orientation_item = QTreeWidgetItem(self.data_item, ["产状数据"])
        self.orientation_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "orientations"})
        if ICONS_AVAILABLE:
            self.orientation_item.setIcon(0, qta.icon('fa.compass', color='#9b59b6'))
            
        # 地球物理数据
        self.geophysics_item = QTreeWidgetItem(self.data_item, ["地球物理数据"])
        self.geophysics_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "geophysics"})
        if ICONS_AVAILABLE:
            self.geophysics_item.setIcon(0, qta.icon('fa.signal', color='#1abc9c'))
            
        # 地质模型
        self.model_item = QTreeWidgetItem(self.project_item, ["地质模型"])
        self.model_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "geological_model"})
        if ICONS_AVAILABLE:
            self.model_item.setIcon(0, qta.icon('fa.cube', color='#2ecc71'))
            
        # 地层系列
        self.series_item = QTreeWidgetItem(self.model_item, ["地层系列"])
        self.series_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "series"})
        if ICONS_AVAILABLE:
            self.series_item.setIcon(0, qta.icon('fa.layer-group', color='#27ae60'))
            
        # 断层系统
        self.faults_item = QTreeWidgetItem(self.model_item, ["断层系统"])
        self.faults_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "faults"})
        if ICONS_AVAILABLE:
            self.faults_item.setIcon(0, qta.icon('fa.random', color='#e74c3c'))
            
        # 地形数据
        self.topography_item = QTreeWidgetItem(self.model_item, ["地形数据"])
        self.topography_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "topography"})
        if ICONS_AVAILABLE:
            self.topography_item.setIcon(0, qta.icon('fa.mountain', color='#8bc34a'))
            
        # 计算设置
        self.computation_item = QTreeWidgetItem(self.project_item, ["计算设置"])
        self.computation_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "computation"})
        if ICONS_AVAILABLE:
            self.computation_item.setIcon(0, qta.icon('fa.cogs', color='#95a5a6'))
            
        # 插值设置
        self.interpolation_item = QTreeWidgetItem(self.computation_item, ["插值设置"])
        self.interpolation_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "interpolation"})
        if ICONS_AVAILABLE:
            self.interpolation_item.setIcon(0, qta.icon('fa.bezier-curve', color='#6c5ce7'))
            
        # 网格设置
        self.grid_item = QTreeWidgetItem(self.computation_item, ["网格设置"])
        self.grid_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "grid"})
        if ICONS_AVAILABLE:
            self.grid_item.setIcon(0, qta.icon('fa.th', color='#74b9ff'))
            
        # 结果分析
        self.results_item = QTreeWidgetItem(self.project_item, ["结果分析"])
        self.results_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "results"})
        if ICONS_AVAILABLE:
            self.results_item.setIcon(0, qta.icon('fa.chart-bar', color='#fd79a8'))
            
        # 不确定性分析
        self.uncertainty_item = QTreeWidgetItem(self.results_item, ["不确定性分析"])
        self.uncertainty_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "uncertainty"})
        if ICONS_AVAILABLE:
            self.uncertainty_item.setIcon(0, qta.icon('fa.question-circle', color='#fdcb6e'))
            
        # 敏感性分析
        self.sensitivity_item = QTreeWidgetItem(self.results_item, ["敏感性分析"])
        self.sensitivity_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "sensitivity"})
        if ICONS_AVAILABLE:
            self.sensitivity_item.setIcon(0, qta.icon('fa.balance-scale', color='#fd79a8'))
            
        # 展开主要节点
        self.project_item.setExpanded(True)
        self.data_item.setExpanded(True)
        self.model_item.setExpanded(True)
        
    def on_item_clicked(self, item, column):
        """处理项目点击"""
        item_data = item.data(0, Qt.ItemDataRole.UserRole)
        if item_data:
            self.item_selected.emit(item_data["type"], item_data)
            
    def show_context_menu(self, position):
        """显示上下文菜单"""
        item = self.itemAt(position)
        if item:
            item_data = item.data(0, Qt.ItemDataRole.UserRole)
            if item_data:
                self.item_context_menu.emit(item_data["type"], item_data, self.mapToGlobal(position))
                
    def add_borehole(self, name, data):
        """添加钻孔"""
        borehole_item = QTreeWidgetItem(self.borehole_item, [name])
        borehole_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "borehole", "name": name, "data": data})
        if ICONS_AVAILABLE:
            borehole_item.setIcon(0, qta.icon('fa.circle', color='#e67e22'))
        self.borehole_item.setExpanded(True)
        
    def add_surface(self, name, data):
        """添加地层面"""
        surface_item = QTreeWidgetItem(self.series_item, [name])
        surface_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "surface", "name": name, "data": data})
        if ICONS_AVAILABLE:
            surface_item.setIcon(0, qta.icon('fa.square', color='#27ae60'))
        self.series_item.setExpanded(True)
        
    def add_fault(self, name, data):
        """添加断层"""
        fault_item = QTreeWidgetItem(self.faults_item, [name])
        fault_item.setData(0, Qt.ItemDataRole.UserRole, {"type": "fault", "name": name, "data": data})
        if ICONS_AVAILABLE:
            fault_item.setIcon(0, qta.icon('fa.cut', color='#e74c3c'))
        self.faults_item.setExpanded(True)

class PropertyPanel(QWidget):
    """属性编辑面板"""
    
    property_changed = pyqtSignal(str, str, object)  # object_type, property_name, value
    
    def __init__(self):
        super().__init__()
        self.current_object = None
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        layout.setSpacing(8)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # 标题
        title_label = QLabel("属性编辑器")
        title_label.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        title_label.setStyleSheet("color: #2c3e50; padding: 8px;")
        layout.addWidget(title_label)
        
        # 滚动区域
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        
        self.content_widget = QWidget()
        self.content_layout = QVBoxLayout(self.content_widget)
        scroll.setWidget(self.content_widget)
        
        layout.addWidget(scroll)
        
        # 显示默认信息
        self.show_welcome_message()
        
    def show_welcome_message(self):
        """显示欢迎信息"""
        self.clear_content()
        
        welcome_label = QLabel("请在模型树中选择要编辑的对象")
        welcome_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        welcome_label.setStyleSheet("""
            QLabel {
                color: #7f8c8d;
                font-style: italic;
                padding: 20px;
                border: 2px dashed #bdc3c7;
                border-radius: 8px;
                background: #ecf0f1;
            }
        """)
        self.content_layout.addWidget(welcome_label)
        self.content_layout.addStretch()
        
    def clear_content(self):
        """清空内容"""
        while self.content_layout.count():
            child = self.content_layout.takeAt(0)
            if child.widget():
                child.widget().deleteLater()
                
    def show_object_properties(self, object_type, object_data):
        """显示对象属性"""
        self.current_object = (object_type, object_data)
        self.clear_content()
        
        # 对象标题
        title = object_data.get("name", object_type)
        title_label = QLabel(f"编辑: {title}")
        title_label.setFont(QFont("Arial", 11, QFont.Weight.Bold))
        title_label.setStyleSheet("color: #2980b9; padding: 4px;")
        self.content_layout.addWidget(title_label)
        
        # 根据对象类型显示不同属性
        if object_type == "borehole":
            self.create_borehole_properties(object_data)
        elif object_type == "surface":
            self.create_surface_properties(object_data)
        elif object_type == "fault":
            self.create_fault_properties(object_data)
        elif object_type == "interpolation":
            self.create_interpolation_properties(object_data)
        elif object_type == "grid":
            self.create_grid_properties(object_data)
        else:
            self.create_generic_properties(object_data)
            
        self.content_layout.addStretch()
        
    def create_borehole_properties(self, data):
        """创建钻孔属性界面"""
        group = QGroupBox("钻孔属性")
        layout = QFormLayout(group)
        
        # 钻孔名称
        name_edit = QLineEdit(data.get("name", ""))
        layout.addRow("名称:", name_edit)
        
        # 坐标
        x_spin = QDoubleSpinBox()
        x_spin.setRange(-999999, 999999)
        x_spin.setValue(data.get("x", 0.0))
        layout.addRow("X坐标:", x_spin)
        
        y_spin = QDoubleSpinBox()
        y_spin.setRange(-999999, 999999)
        y_spin.setValue(data.get("y", 0.0))
        layout.addRow("Y坐标:", y_spin)
        
        # 钻孔深度
        depth_spin = QDoubleSpinBox()
        depth_spin.setRange(0, 9999)
        depth_spin.setValue(data.get("depth", 100.0))
        layout.addRow("深度:", depth_spin)
        
        # 地面高程
        elevation_spin = QDoubleSpinBox()
        elevation_spin.setRange(-999, 9999)
        elevation_spin.setValue(data.get("elevation", 0.0))
        layout.addRow("地面高程:", elevation_spin)
        
        self.content_layout.addWidget(group)
        
    def create_surface_properties(self, data):
        """创建地层面属性界面"""
        group = QGroupBox("地层面属性")
        layout = QFormLayout(group)
        
        # 地层面名称
        name_edit = QLineEdit(data.get("name", ""))
        layout.addRow("名称:", name_edit)
        
        # 地层时代
        age_combo = QComboBox()
        age_combo.addItems(["第四系", "新近系", "古近系", "白垩系", "侏罗系", "三叠系", "二叠系", "石炭系", "泥盆系", "志留系", "奥陶系", "寒武系", "前寒武系"])
        layout.addRow("地质时代:", age_combo)
        
        # 岩性
        lithology_combo = QComboBox()
        lithology_combo.addItems(["砂岩", "泥岩", "灰岩", "白云岩", "花岗岩", "玄武岩", "片麻岩", "板岩", "砾岩", "页岩"])
        layout.addRow("岩性:", lithology_combo)
        
        # 颜色
        color_combo = QComboBox()
        color_combo.addItems(["自动", "红色", "绿色", "蓝色", "黄色", "紫色", "橙色", "灰色"])
        layout.addRow("显示颜色:", color_combo)
        
        # 透明度
        opacity_slider = QSlider(Qt.Orientation.Horizontal)
        opacity_slider.setRange(0, 100)
        opacity_slider.setValue(80)
        layout.addRow("透明度:", opacity_slider)
        
        self.content_layout.addWidget(group)
        
    def create_fault_properties(self, data):
        """创建断层属性界面"""
        group = QGroupBox("断层属性")
        layout = QFormLayout(group)
        
        # 断层名称
        name_edit = QLineEdit(data.get("name", ""))
        layout.addRow("名称:", name_edit)
        
        # 断层类型
        type_combo = QComboBox()
        type_combo.addItems(["正断层", "逆断层", "走滑断层", "平移断层", "复合断层"])
        layout.addRow("断层类型:", type_combo)
        
        # 断层面产状
        strike_spin = QDoubleSpinBox()
        strike_spin.setRange(0, 360)
        strike_spin.setValue(data.get("strike", 0.0))
        layout.addRow("走向:", strike_spin)
        
        dip_spin = QDoubleSpinBox()
        dip_spin.setRange(0, 90)
        dip_spin.setValue(data.get("dip", 90.0))
        layout.addRow("倾角:", dip_spin)
        
        # 断距
        throw_spin = QDoubleSpinBox()
        throw_spin.setRange(0, 9999)
        throw_spin.setValue(data.get("throw", 0.0))
        layout.addRow("断距:", throw_spin)
        
        self.content_layout.addWidget(group)
        
    def create_interpolation_properties(self, data):
        """创建插值属性界面"""
        group = QGroupBox("插值设置")
        layout = QFormLayout(group)
        
        # 插值方法
        method_combo = QComboBox()
        method_combo.addItems([
            "Universal Cokriging (推荐)",
            "Simple Kriging", 
            "Ordinary Kriging",
            "RBF Linear",
            "RBF Cubic",
            "RBF Gaussian",
            "RBF Multiquadric",
            "RBF Thin Plate Spline"
        ])
        layout.addRow("插值方法:", method_combo)
        
        # 变程
        range_spin = QDoubleSpinBox()
        range_spin.setRange(1, 99999)
        range_spin.setValue(data.get("range", 1000.0))
        layout.addRow("变程:", range_spin)
        
        # 块金值
        nugget_spin = QDoubleSpinBox()
        nugget_spin.setRange(0, 1)
        nugget_spin.setDecimals(4)
        nugget_spin.setValue(data.get("nugget", 0.01))
        layout.addRow("块金值:", nugget_spin)
        
        # 基台值
        sill_spin = QDoubleSpinBox()
        sill_spin.setRange(0, 999)
        sill_spin.setValue(data.get("sill", 1.0))
        layout.addRow("基台值:", sill_spin)
        
        # 梯度惩罚
        gradient_check = QCheckBox("启用梯度惩罚")
        gradient_check.setChecked(data.get("gradient_penalty", True))
        layout.addRow("", gradient_check)
        
        self.content_layout.addWidget(group)
        
    def create_grid_properties(self, data):
        """创建网格属性界面"""
        group = QGroupBox("网格设置")
        layout = QFormLayout(group)
        
        # 网格类型
        type_combo = QComboBox()
        type_combo.addItems(["Regular Grid", "Octree Grid", "Custom Grid"])
        layout.addRow("网格类型:", type_combo)
        
        # 分辨率
        x_res_spin = QSpinBox()
        x_res_spin.setRange(10, 500)
        x_res_spin.setValue(data.get("x_resolution", 50))
        layout.addRow("X分辨率:", x_res_spin)
        
        y_res_spin = QSpinBox()
        y_res_spin.setRange(10, 500)
        y_res_spin.setValue(data.get("y_resolution", 50))
        layout.addRow("Y分辨率:", y_res_spin)
        
        z_res_spin = QSpinBox()
        z_res_spin.setRange(10, 200)
        z_res_spin.setValue(data.get("z_resolution", 30))
        layout.addRow("Z分辨率:", z_res_spin)
        
        # 八叉树设置
        if type_combo.currentText() == "Octree Grid":
            octree_levels_spin = QSpinBox()
            octree_levels_spin.setRange(1, 10)
            octree_levels_spin.setValue(data.get("octree_levels", 5))
            layout.addRow("八叉树层级:", octree_levels_spin)
            
            refinement_spin = QDoubleSpinBox()
            refinement_spin.setRange(0.01, 1.0)
            refinement_spin.setValue(data.get("refinement_threshold", 0.1))
            layout.addRow("细化阈值:", refinement_spin)
        
        self.content_layout.addWidget(group)
        
    def create_generic_properties(self, data):
        """创建通用属性界面"""
        group = QGroupBox("基本属性")
        layout = QFormLayout(group)
        
        # 显示数据中的所有键值对
        for key, value in data.items():
            if key != "type":
                if isinstance(value, (int, float)):
                    spin = QDoubleSpinBox()
                    spin.setRange(-999999, 999999)
                    spin.setValue(value)
                    layout.addRow(f"{key}:", spin)
                elif isinstance(value, str):
                    edit = QLineEdit(value)
                    layout.addRow(f"{key}:", edit)
                elif isinstance(value, bool):
                    check = QCheckBox()
                    check.setChecked(value)
                    layout.addRow(f"{key}:", check)
        
        self.content_layout.addWidget(group)

class Advanced3DViewer(QWidget):
    """高级3D可视化组件"""
    
    def __init__(self):
        super().__init__()
        self.plotter = None
        self.current_model = None
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 工具栏
        toolbar_layout = QHBoxLayout()
        toolbar_layout.setSpacing(4)
        
        # 视图控制按钮
        self.iso_btn = QPushButton("等轴")
        self.front_btn = QPushButton("前视")
        self.top_btn = QPushButton("俯视")
        self.side_btn = QPushButton("侧视")
        
        for btn in [self.iso_btn, self.front_btn, self.top_btn, self.side_btn]:
            btn.setMaximumWidth(60)
            toolbar_layout.addWidget(btn)
            
        toolbar_layout.addStretch()
        
        # 渲染模式
        self.render_combo = QComboBox()
        self.render_combo.addItems(["表面", "线框", "点云", "体渲染"])
        toolbar_layout.addWidget(QLabel("渲染:"))
        toolbar_layout.addWidget(self.render_combo)
        
        # 显示选项
        self.show_axes_check = QCheckBox("坐标轴")
        self.show_axes_check.setChecked(True)
        self.show_legend_check = QCheckBox("图例")
        self.show_legend_check.setChecked(True)
        
        toolbar_layout.addWidget(self.show_axes_check)
        toolbar_layout.addWidget(self.show_legend_check)
        
        layout.addLayout(toolbar_layout)
        
        # PyVista 3D视图
        try:
            self.plotter = pvqt.QtInteractor(self)
            self.plotter.setMinimumSize(600, 400)
            layout.addWidget(self.plotter.interactor)
            
            # 设置默认场景
            self.setup_default_scene()
            
        except Exception as e:
            # 如果PyVista不可用，显示占位符
            placeholder = QLabel("3D可视化不可用\n请检查PyVista安装")
            placeholder.setAlignment(Qt.AlignmentFlag.AlignCenter)
            placeholder.setStyleSheet("""
                QLabel {
                    color: #e74c3c;
                    font-size: 16px;
                    font-weight: bold;
                    border: 2px dashed #e74c3c;
                    padding: 40px;
                }
            """)
            layout.addWidget(placeholder)
            
        # 连接信号
        self.iso_btn.clicked.connect(lambda: self.set_camera_position('iso'))
        self.front_btn.clicked.connect(lambda: self.set_camera_position('front'))
        self.top_btn.clicked.connect(lambda: self.set_camera_position('top'))
        self.side_btn.clicked.connect(lambda: self.set_camera_position('side'))
        
        self.render_combo.currentTextChanged.connect(self.update_render_mode)
        self.show_axes_check.toggled.connect(self.toggle_axes)
        self.show_legend_check.toggled.connect(self.toggle_legend)
        
    def setup_default_scene(self):
        """设置默认场景"""
        if not self.plotter:
            return
            
        self.plotter.set_background('white')
        self.plotter.show_axes()
        
        # 添加欢迎信息
        self.plotter.add_text(
            "GemPy 2025 专业级地质建模系统\n等待加载地质模型...",
            position='upper_left',
            font_size=12,
            color='blue'
        )
        
    def load_geological_model(self, geo_model):
        """加载地质模型"""
        if not self.plotter:
            return
            
        try:
            self.current_model = geo_model
            self.plotter.clear()
            
            # 使用GemPy 2025的新API显示模型
            if hasattr(geo_model, 'solutions') and geo_model.solutions:
                # 显示地质体
                geological_grid = geo_model.solutions.octrees_output[0]
                self.plotter.add_mesh(
                    geological_grid,
                    scalars='id',
                    cmap='viridis',
                    show_scalar_bar=True,
                    scalar_bar_args={'title': '地层ID'}
                )
                
            # 显示地层界面点
            if hasattr(geo_model, 'surface_points'):
                points = geo_model.surface_points.df[['X', 'Y', 'Z']].values
                point_cloud = pv.PolyData(points)
                self.plotter.add_mesh(
                    point_cloud,
                    color='red',
                    point_size=8,
                    render_points_as_spheres=True
                )
                
            # 显示产状数据
            if hasattr(geo_model, 'orientations'):
                orientations_points = geo_model.orientations.df[['X', 'Y', 'Z']].values
                orient_cloud = pv.PolyData(orientations_points)
                self.plotter.add_mesh(
                    orient_cloud,
                    color='blue',
                    point_size=10,
                    render_points_as_spheres=True
                )
                
            self.plotter.reset_camera()
            
        except Exception as e:
            print(f"加载地质模型失败: {e}")
            
    def set_camera_position(self, position):
        """设置相机位置"""
        if not self.plotter:
            return
            
        if position == 'iso':
            self.plotter.camera_position = 'iso'
        elif position == 'front':
            self.plotter.camera_position = 'xy'
        elif position == 'top':
            self.plotter.camera_position = 'xz'
        elif position == 'side':
            self.plotter.camera_position = 'yz'
            
    def update_render_mode(self, mode):
        """更新渲染模式"""
        # 实现渲染模式切换
        pass
        
    def toggle_axes(self, show):
        """切换坐标轴显示"""
        if not self.plotter:
            return
            
        if show:
            self.plotter.show_axes()
        else:
            self.plotter.hide_axes()
            
    def toggle_legend(self, show):
        """切换图例显示"""
        # 实现图例显示切换
        pass

class GemPy2025MainWindow(QMainWindow):
    """GemPy 2025 专业级主界面"""
    
    def __init__(self):
        super().__init__()
        self.current_project = None
        self.geo_model = None
        self.setup_ui()
        self.setup_menubar()
        self.setup_toolbar()
        self.setup_statusbar()
        
    def setup_ui(self):
        """设置用户界面"""
        self.setWindowTitle("GemPy 2025 - 专业级地质建模CAE系统")
        self.setGeometry(100, 100, 1600, 1000)
        
        # 应用样式
        self.setStyleSheet(ProfessionalStyleSheet.get_main_style())
        
        # 创建中央部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主分割器
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        central_layout = QHBoxLayout(central_widget)
        central_layout.addWidget(main_splitter)
        
        # 左侧面板 - 模型树
        left_dock = QDockWidget("模型树", self)
        left_dock.setFeatures(QDockWidget.DockWidgetFeature.DockWidgetMovable | 
                             QDockWidget.DockWidgetFeature.DockWidgetFloatable)
        self.model_tree = ModelTreeWidget()
        left_dock.setWidget(self.model_tree)
        self.addDockWidget(Qt.DockWidgetArea.LeftDockWidgetArea, left_dock)
        
        # 中央面板 - 3D视图和工作区
        center_widget = QWidget()
        center_layout = QVBoxLayout(center_widget)
        
        # 标签页
        self.main_tabs = QTabWidget()
        center_layout.addWidget(self.main_tabs)
        
        # 3D可视化标签
        self.viewer_3d = Advanced3DViewer()
        self.main_tabs.addTab(self.viewer_3d, "3D可视化")
        
        # 数据管理标签
        self.data_tab = self.create_data_management_tab()
        self.main_tabs.addTab(self.data_tab, "数据管理")
        
        # 建模设置标签
        self.modeling_tab = self.create_modeling_tab()
        self.main_tabs.addTab(self.modeling_tab, "建模设置")
        
        # 结果分析标签
        self.analysis_tab = self.create_analysis_tab()
        self.main_tabs.addTab(self.analysis_tab, "结果分析")
        
        main_splitter.addWidget(center_widget)
        
        # 右侧面板 - 属性编辑器
        right_dock = QDockWidget("属性编辑器", self)
        right_dock.setFeatures(QDockWidget.DockWidgetFeature.DockWidgetMovable | 
                              QDockWidget.DockWidgetFeature.DockWidgetFloatable)
        self.property_panel = PropertyPanel()
        right_dock.setWidget(self.property_panel)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, right_dock)
        
        # 设置分割比例
        main_splitter.setSizes([300, 1000, 300])
        
        # 连接信号
        self.model_tree.item_selected.connect(self.on_tree_item_selected)
        
    def create_data_management_tab(self):
        """创建数据管理标签"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 数据导入区域
        import_group = QGroupBox("数据导入")
        import_layout = QGridLayout(import_group)
        
        # 钻孔数据导入
        self.import_borehole_btn = QPushButton("导入钻孔数据")
        self.import_borehole_btn.setProperty("class", "primary")
        self.import_borehole_btn.clicked.connect(self.import_borehole_data)
        import_layout.addWidget(self.import_borehole_btn, 0, 0)
        
        # 地层界面点导入
        self.import_surface_btn = QPushButton("导入地层界面点")
        self.import_surface_btn.clicked.connect(self.import_surface_points)
        import_layout.addWidget(self.import_surface_btn, 0, 1)
        
        # 产状数据导入
        self.import_orientation_btn = QPushButton("导入产状数据")
        self.import_orientation_btn.clicked.connect(self.import_orientations)
        import_layout.addWidget(self.import_orientation_btn, 1, 0)
        
        # 地球物理数据导入
        self.import_geophysics_btn = QPushButton("导入地球物理数据")
        self.import_geophysics_btn.clicked.connect(self.import_geophysics_data)
        import_layout.addWidget(self.import_geophysics_btn, 1, 1)
        
        layout.addWidget(import_group)
        
        # 数据预览表格
        preview_group = QGroupBox("数据预览")
        preview_layout = QVBoxLayout(preview_group)
        
        self.data_table = QTableWidget()
        self.data_table.setAlternatingRowColors(True)
        preview_layout.addWidget(self.data_table)
        
        layout.addWidget(preview_group)
        
        return widget
        
    def create_modeling_tab(self):
        """创建建模设置标签"""
        widget = QWidget()
        layout = QHBoxLayout(widget)
        
        # 左侧设置面板
        settings_scroll = QScrollArea()
        settings_widget = QWidget()
        settings_layout = QVBoxLayout(settings_widget)
        
        # 模型域设置
        domain_group = QGroupBox("模型域设置")
        domain_layout = QFormLayout(domain_group)
        
        self.extent_x_min = QDoubleSpinBox()
        self.extent_x_min.setRange(-99999, 99999)
        domain_layout.addRow("X最小值:", self.extent_x_min)
        
        self.extent_x_max = QDoubleSpinBox()
        self.extent_x_max.setRange(-99999, 99999)
        self.extent_x_max.setValue(1000)
        domain_layout.addRow("X最大值:", self.extent_x_max)
        
        self.extent_y_min = QDoubleSpinBox()
        self.extent_y_min.setRange(-99999, 99999)
        domain_layout.addRow("Y最小值:", self.extent_y_min)
        
        self.extent_y_max = QDoubleSpinBox()
        self.extent_y_max.setRange(-99999, 99999)
        self.extent_y_max.setValue(1000)
        domain_layout.addRow("Y最大值:", self.extent_y_max)
        
        self.extent_z_min = QDoubleSpinBox()
        self.extent_z_min.setRange(-99999, 99999)
        self.extent_z_min.setValue(-500)
        domain_layout.addRow("Z最小值:", self.extent_z_min)
        
        self.extent_z_max = QDoubleSpinBox()
        self.extent_z_max.setRange(-99999, 99999)
        domain_layout.addRow("Z最大值:", self.extent_z_max)
        
        settings_layout.addWidget(domain_group)
        
        # 网格设置
        grid_group = QGroupBox("网格设置")
        grid_layout = QFormLayout(grid_group)
        
        self.grid_type_combo = QComboBox()
        self.grid_type_combo.addItems(["Regular Grid", "Octree Grid"])
        grid_layout.addRow("网格类型:", self.grid_type_combo)
        
        self.resolution_x = QSpinBox()
        self.resolution_x.setRange(10, 500)
        self.resolution_x.setValue(50)
        grid_layout.addRow("X分辨率:", self.resolution_x)
        
        self.resolution_y = QSpinBox()
        self.resolution_y.setRange(10, 500)
        self.resolution_y.setValue(50)
        grid_layout.addRow("Y分辨率:", self.resolution_y)
        
        self.resolution_z = QSpinBox()
        self.resolution_z.setRange(10, 200)
        self.resolution_z.setValue(30)
        grid_layout.addRow("Z分辨率:", self.resolution_z)
        
        settings_layout.addWidget(grid_group)
        
        # 插值设置
        interp_group = QGroupBox("插值设置")
        interp_layout = QFormLayout(interp_group)
        
        self.interpolator_combo = QComboBox()
        self.interpolator_combo.addItems([
            "universal_cokriging",
            "simple_kriging",
            "ordinary_kriging",
            "rbf_linear",
            "rbf_cubic",
            "rbf_gaussian"
        ])
        interp_layout.addRow("插值方法:", self.interpolator_combo)
        
        self.range_spin = QDoubleSpinBox()
        self.range_spin.setRange(1, 99999)
        self.range_spin.setValue(1000)
        interp_layout.addRow("变程:", self.range_spin)
        
        self.nugget_spin = QDoubleSpinBox()
        self.nugget_spin.setRange(0, 1)
        self.nugget_spin.setDecimals(4)
        self.nugget_spin.setValue(0.01)
        interp_layout.addRow("块金值:", self.nugget_spin)
        
        settings_layout.addWidget(interp_group)
        
        # 控制按钮
        buttons_layout = QHBoxLayout()
        
        self.create_model_btn = QPushButton("创建地质模型")
        self.create_model_btn.setProperty("class", "primary")
        self.create_model_btn.clicked.connect(self.create_geological_model)
        buttons_layout.addWidget(self.create_model_btn)
        
        self.compute_model_btn = QPushButton("计算模型")
        self.compute_model_btn.setProperty("class", "primary")
        self.compute_model_btn.clicked.connect(self.compute_model)
        self.compute_model_btn.setEnabled(False)
        buttons_layout.addWidget(self.compute_model_btn)
        
        settings_layout.addLayout(buttons_layout)
        settings_layout.addStretch()
        
        settings_scroll.setWidget(settings_widget)
        settings_scroll.setWidgetResizable(True)
        settings_scroll.setMaximumWidth(350)
        
        layout.addWidget(settings_scroll)
        
        # 右侧预览
        preview_widget = QWidget()
        preview_layout = QVBoxLayout(preview_widget)
        
        preview_label = QLabel("模型预览")
        preview_label.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        preview_layout.addWidget(preview_label)
        
        # 2D预览图
        self.preview_figure = Figure(figsize=(8, 6))
        self.preview_canvas = FigureCanvas(self.preview_figure)
        preview_layout.addWidget(self.preview_canvas)
        
        layout.addWidget(preview_widget)
        
        return widget
        
    def create_analysis_tab(self):
        """创建结果分析标签"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 分析选项
        analysis_group = QGroupBox("分析选项")
        analysis_layout = QGridLayout(analysis_group)
        
        self.uncertainty_btn = QPushButton("不确定性分析")
        self.uncertainty_btn.clicked.connect(self.run_uncertainty_analysis)
        analysis_layout.addWidget(self.uncertainty_btn, 0, 0)
        
        self.sensitivity_btn = QPushButton("敏感性分析")
        self.sensitivity_btn.clicked.connect(self.run_sensitivity_analysis)
        analysis_layout.addWidget(self.sensitivity_btn, 0, 1)
        
        self.export_btn = QPushButton("导出结果")
        self.export_btn.clicked.connect(self.export_results)
        analysis_layout.addWidget(self.export_btn, 1, 0)
        
        self.report_btn = QPushButton("生成报告")
        self.report_btn.clicked.connect(self.generate_report)
        analysis_layout.addWidget(self.report_btn, 1, 1)
        
        layout.addWidget(analysis_group)
        
        # 结果显示区域
        results_group = QGroupBox("分析结果")
        results_layout = QVBoxLayout(results_group)
        
        self.results_text = QTextEdit()
        self.results_text.setReadOnly(True)
        self.results_text.setFont(QFont("Consolas", 10))
        results_layout.addWidget(self.results_text)
        
        layout.addWidget(results_group)
        
        return widget
        
    def setup_menubar(self):
        """设置菜单栏"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu("文件(&F)")
        
        new_action = QAction("新建项目", self)
        new_action.setShortcut(QKeySequence.StandardKey.New)
        new_action.triggered.connect(self.new_project)
        file_menu.addAction(new_action)
        
        open_action = QAction("打开项目", self)
        open_action.setShortcut(QKeySequence.StandardKey.Open)
        open_action.triggered.connect(self.open_project)
        file_menu.addAction(open_action)
        
        save_action = QAction("保存项目", self)
        save_action.setShortcut(QKeySequence.StandardKey.Save)
        save_action.triggered.connect(self.save_project)
        file_menu.addAction(save_action)
        
        file_menu.addSeparator()
        
        import_menu = file_menu.addMenu("导入")
        import_menu.addAction("钻孔数据", self.import_borehole_data)
        import_menu.addAction("地层界面点", self.import_surface_points)
        import_menu.addAction("产状数据", self.import_orientations)
        
        export_menu = file_menu.addMenu("导出")
        export_menu.addAction("VTK格式", self.export_vtk)
        export_menu.addAction("STL格式", self.export_stl)
        export_menu.addAction("OBJ格式", self.export_obj)
        
        file_menu.addSeparator()
        exit_action = QAction("退出", self)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # 编辑菜单
        edit_menu = menubar.addMenu("编辑(&E)")
        edit_menu.addAction("撤销", lambda: None)
        edit_menu.addAction("重做", lambda: None)
        edit_menu.addSeparator()
        edit_menu.addAction("偏好设置", self.show_preferences)
        
        # 视图菜单
        view_menu = menubar.addMenu("视图(&V)")
        view_menu.addAction("重置视图", lambda: self.viewer_3d.set_camera_position('iso'))
        view_menu.addAction("适合窗口", lambda: None)
        view_menu.addSeparator()
        view_menu.addAction("显示/隐藏模型树", lambda: None)
        view_menu.addAction("显示/隐藏属性面板", lambda: None)
        
        # 模型菜单
        model_menu = menubar.addMenu("模型(&M)")
        model_menu.addAction("创建地质模型", self.create_geological_model)
        model_menu.addAction("计算模型", self.compute_model)
        model_menu.addSeparator()
        model_menu.addAction("添加断层", self.add_fault)
        model_menu.addAction("添加地层面", self.add_surface)
        
        # 分析菜单
        analysis_menu = menubar.addMenu("分析(&A)")
        analysis_menu.addAction("不确定性分析", self.run_uncertainty_analysis)
        analysis_menu.addAction("敏感性分析", self.run_sensitivity_analysis)
        analysis_menu.addAction("地球物理正演", self.run_geophysics_forward)
        
        # 帮助菜单
        help_menu = menubar.addMenu("帮助(&H)")
        help_menu.addAction("用户手册", self.show_manual)
        help_menu.addAction("API文档", self.show_api_docs)
        help_menu.addAction("关于", self.show_about)
        
    def setup_toolbar(self):
        """设置工具栏"""
        # 主工具栏
        main_toolbar = self.addToolBar("主工具栏")
        main_toolbar.setIconSize(QSize(24, 24))
        
        # 文件操作
        if ICONS_AVAILABLE:
            new_action = main_toolbar.addAction(qta.icon('fa.file'), "新建", self.new_project)
            open_action = main_toolbar.addAction(qta.icon('fa.folder-open'), "打开", self.open_project)
            save_action = main_toolbar.addAction(qta.icon('fa.save'), "保存", self.save_project)
        else:
            main_toolbar.addAction("新建", self.new_project)
            main_toolbar.addAction("打开", self.open_project)
            main_toolbar.addAction("保存", self.save_project)
            
        main_toolbar.addSeparator()
        
        # 建模操作
        if ICONS_AVAILABLE:
            create_action = main_toolbar.addAction(qta.icon('fa.cube'), "创建模型", self.create_geological_model)
            compute_action = main_toolbar.addAction(qta.icon('fa.play'), "计算", self.compute_model)
        else:
            main_toolbar.addAction("创建模型", self.create_geological_model)
            main_toolbar.addAction("计算", self.compute_model)
            
        main_toolbar.addSeparator()
        
        # 视图操作
        if ICONS_AVAILABLE:
            iso_action = main_toolbar.addAction(qta.icon('fa.cube'), "等轴视图", 
                                              lambda: self.viewer_3d.set_camera_position('iso'))
        else:
            main_toolbar.addAction("等轴视图", lambda: self.viewer_3d.set_camera_position('iso'))
            
    def setup_statusbar(self):
        """设置状态栏"""
        self.status_bar = self.statusBar()
        
        # 状态标签
        self.status_label = QLabel("就绪")
        self.status_bar.addWidget(self.status_label)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setMaximumWidth(200)
        self.status_bar.addPermanentWidget(self.progress_bar)
        
        # 模型信息
        self.model_info_label = QLabel("无模型")
        self.status_bar.addPermanentWidget(self.model_info_label)
        
    # 事件处理方法
    def on_tree_item_selected(self, item_type, item_data):
        """处理树项目选择"""
        self.property_panel.show_object_properties(item_type, item_data)
        
    def new_project(self):
        """新建项目"""
        self.status_label.setText("创建新项目...")
        # 实现新建项目逻辑
        
    def open_project(self):
        """打开项目"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "打开项目", "", "GemPy项目文件 (*.gempy);;所有文件 (*.*)"
        )
        if file_path:
            self.status_label.setText(f"打开项目: {file_path}")
            
    def save_project(self):
        """保存项目"""
        if self.geo_model:
            file_path, _ = QFileDialog.getSaveFileName(
                self, "保存项目", "", "GemPy项目文件 (*.gempy);;所有文件 (*.*)"
            )
            if file_path:
                # 使用GemPy 2025的二进制序列化功能
                gp.save_model_binary(self.geo_model, file_path, compression='lzma')
                self.status_label.setText(f"项目已保存: {file_path}")
                
    def import_borehole_data(self):
        """导入钻孔数据"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "导入钻孔数据", "", "CSV文件 (*.csv);;Excel文件 (*.xlsx);;所有文件 (*.*)"
        )
        if file_path:
            try:
                data = pd.read_csv(file_path)
                # 添加到模型树
                self.model_tree.add_borehole(f"钻孔_{len(data)}", {"data": data, "file": file_path})
                self.status_label.setText(f"成功导入 {len(data)} 条钻孔数据")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导入失败: {str(e)}")
                
    def import_surface_points(self):
        """导入地层界面点"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "导入地层界面点", "", "CSV文件 (*.csv);;所有文件 (*.*)"
        )
        if file_path:
            try:
                data = pd.read_csv(file_path)
                self.status_label.setText(f"成功导入 {len(data)} 个地层界面点")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导入失败: {str(e)}")
                
    def import_orientations(self):
        """导入产状数据"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "导入产状数据", "", "CSV文件 (*.csv);;所有文件 (*.*)"
        )
        if file_path:
            try:
                data = pd.read_csv(file_path)
                self.status_label.setText(f"成功导入 {len(data)} 个产状数据")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导入失败: {str(e)}")
                
    def import_geophysics_data(self):
        """导入地球物理数据"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "导入地球物理数据", "", "CSV文件 (*.csv);;所有文件 (*.*)"
        )
        if file_path:
            try:
                data = pd.read_csv(file_path)
                self.status_label.setText(f"成功导入地球物理数据")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导入失败: {str(e)}")
                
    def create_geological_model(self):
        """创建地质模型"""
        try:
            self.status_label.setText("正在创建地质模型...")
            self.progress_bar.setVisible(True)
            
            # 获取模型域参数
            extent = [
                self.extent_x_min.value(), self.extent_x_max.value(),
                self.extent_y_min.value(), self.extent_y_max.value(),
                self.extent_z_min.value(), self.extent_z_max.value()
            ]
            
            # 创建GemPy 2025模型
            self.geo_model = gp.create_geomodel(
                project_name='GemPy_2025_Model',
                extent=extent,
                resolution=[
                    self.resolution_x.value(),
                    self.resolution_y.value(), 
                    self.resolution_z.value()
                ]
            )
            
            self.compute_model_btn.setEnabled(True)
            self.model_info_label.setText("模型已创建")
            self.status_label.setText("地质模型创建完成")
            self.progress_bar.setVisible(False)
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"创建模型失败: {str(e)}")
            self.progress_bar.setVisible(False)
            
    def compute_model(self):
        """计算模型"""
        if not self.geo_model:
            QMessageBox.warning(self, "警告", "请先创建地质模型")
            return
            
        try:
            self.status_label.setText("正在计算地质模型...")
            self.progress_bar.setVisible(True)
            
            # 使用GemPy 2025的compute_model函数
            solutions = gp.compute_model(self.geo_model)
            
            # 在3D视图中显示结果
            self.viewer_3d.load_geological_model(self.geo_model)
            
            self.model_info_label.setText("模型已计算")
            self.status_label.setText("模型计算完成")
            self.progress_bar.setVisible(False)
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"计算模型失败: {str(e)}")
            self.progress_bar.setVisible(False)
            
    def add_fault(self):
        """添加断层"""
        # 实现添加断层对话框
        pass
        
    def add_surface(self):
        """添加地层面"""
        # 实现添加地层面对话框
        pass
        
    def run_uncertainty_analysis(self):
        """运行不确定性分析"""
        if not self.geo_model:
            QMessageBox.warning(self, "警告", "请先创建并计算地质模型")
            return
            
        self.results_text.append("开始不确定性分析...")
        # 实现不确定性分析
        
    def run_sensitivity_analysis(self):
        """运行敏感性分析"""
        if not self.geo_model:
            QMessageBox.warning(self, "警告", "请先创建并计算地质模型")
            return
            
        self.results_text.append("开始敏感性分析...")
        # 实现敏感性分析
        
    def run_geophysics_forward(self):
        """运行地球物理正演"""
        if not self.geo_model:
            QMessageBox.warning(self, "警告", "请先创建并计算地质模型")
            return
            
        self.results_text.append("开始地球物理正演计算...")
        # 实现地球物理正演
        
    def export_vtk(self):
        """导出VTK格式"""
        if not self.geo_model:
            QMessageBox.warning(self, "警告", "没有可导出的模型")
            return
        # 实现VTK导出
        
    def export_stl(self):
        """导出STL格式"""
        # 实现STL导出
        pass
        
    def export_obj(self):
        """导出OBJ格式"""
        # 实现OBJ导出
        pass
        
    def export_results(self):
        """导出结果"""
        # 实现结果导出
        pass
        
    def generate_report(self):
        """生成报告"""
        # 实现报告生成
        pass
        
    def show_preferences(self):
        """显示偏好设置"""
        # 实现偏好设置对话框
        pass
        
    def show_manual(self):
        """显示用户手册"""
        # 打开用户手册
        pass
        
    def show_api_docs(self):
        """显示API文档"""
        # 打开API文档
        pass
        
    def show_about(self):
        """显示关于对话框"""
        QMessageBox.about(self, "关于", 
                         "GemPy 2025 专业级地质建模CAE系统\n\n"
                         "基于GemPy 2025.2.0构建\n"
                         "提供工业级地质建模解决方案\n\n"
                         "版本: 1.0.0\n"
                         "技术栈: PyQt6 + GemPy 2025 + PyVista\n\n"
                         "© 2025 DeepCAD Team")

def main():
    """主函数"""
    app = QApplication(sys.argv)
    app.setApplicationName("GemPy 2025 Professional")
    app.setApplicationVersion("1.0.0")
    
    # 设置应用图标
    if ICONS_AVAILABLE:
        app.setWindowIcon(qta.icon('fa.mountain'))
    
    # 创建主窗口
    window = GemPy2025MainWindow()
    window.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()