"""
Professional GemPy CAE System
Abaqus-Style Geological Modeling Interface
专业级地质建模CAE系统 - 模仿Abaqus界面风格
"""

import sys
import os
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any
import json
from pathlib import Path

# PyQt6 imports
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QSplitter, QTreeWidget, QTreeWidgetItem, QTabWidget, QTextEdit,
    QToolBar, QMenuBar, QStatusBar, QDockWidget, QGroupBox, QFormLayout,
    QLabel, QLineEdit, QPushButton, QComboBox, QSpinBox, QDoubleSpinBox,
    QCheckBox, QProgressBar, QTableWidget, QTableWidgetItem, QHeaderView,
    QFileDialog, QMessageBox, QDialog, QDialogButtonBox, QScrollArea,
    QFrame, QButtonGroup, QRadioButton, QSlider, QListWidget, QGridLayout
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer, QMimeData, QUrl
from PyQt6.QtGui import (
    QAction, QIcon, QFont, QPixmap, QPalette, QColor, QDragEnterEvent, 
    QDropEvent, QStandardItemModel, QStandardItem
)

# Scientific computing
import gempy as gp
import pyvista as pv
import pyvistaqt as pvqt
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure

# Try to import optional packages
try:
    import vtk
    VTK_AVAILABLE = True
except ImportError:
    VTK_AVAILABLE = False

try:
    import qtawesome as qta
    ICONS_AVAILABLE = True
except ImportError:
    ICONS_AVAILABLE = False

class AbaqusStyleSheet:
    """Abaqus风格样式表"""
    
    @staticmethod
    def get_main_style():
        return """
        /* 主窗口样式 */
        QMainWindow {
            background-color: #f0f0f0;
            color: #333333;
        }
        
        /* 菜单栏样式 */
        QMenuBar {
            background-color: #e6e6e6;
            border-bottom: 1px solid #cccccc;
            font-size: 12px;
            padding: 2px;
        }
        
        QMenuBar::item {
            background-color: transparent;
            padding: 6px 12px;
            margin: 0px;
        }
        
        QMenuBar::item:selected {
            background-color: #d4e6f1;
            border: 1px solid #85c1e9;
        }
        
        QMenuBar::item:pressed {
            background-color: #aed6f1;
        }
        
        /* 工具栏样式 */
        QToolBar {
            background-color: #e8e8e8;
            border: 1px solid #cccccc;
            spacing: 3px;
            padding: 2px;
        }
        
        QToolButton {
            background-color: #f5f5f5;
            border: 1px solid transparent;
            border-radius: 3px;
            padding: 5px;
            margin: 1px;
        }
        
        QToolButton:hover {
            background-color: #e0e0e0;
            border: 1px solid #bfbfbf;
        }
        
        QToolButton:pressed {
            background-color: #d0d0d0;
            border: 1px solid #999999;
        }
        
        /* 状态栏样式 */
        QStatusBar {
            background-color: #e6e6e6;
            border-top: 1px solid #cccccc;
            font-size: 11px;
        }
        
        /* 停靠窗口样式 */
        QDockWidget {
            background-color: #f8f8f8;
            border: 1px solid #cccccc;
            titlebar-close-icon: url(close.png);
            titlebar-normal-icon: url(float.png);
        }
        
        QDockWidget::title {
            background-color: #e0e0e0;
            text-align: left;
            padding: 5px;
            border-bottom: 1px solid #cccccc;
            font-weight: bold;
        }
        
        /* 树形控件样式 */
        QTreeWidget {
            background-color: white;
            border: 1px solid #cccccc;
            font-size: 12px;
            selection-background-color: #3875d7;
        }
        
        QTreeWidget::item {
            padding: 2px;
            border-bottom: 1px solid #f0f0f0;
        }
        
        QTreeWidget::item:selected {
            background-color: #3875d7;
            color: white;
        }
        
        QTreeWidget::item:hover {
            background-color: #e6f2ff;
        }
        
        /* 标签页样式 */
        QTabWidget::pane {
            border: 1px solid #cccccc;
            background-color: white;
        }
        
        QTabBar::tab {
            background-color: #e0e0e0;
            border: 1px solid #cccccc;
            border-bottom: none;
            padding: 6px 12px;
            margin-right: 1px;
        }
        
        QTabBar::tab:selected {
            background-color: white;
            border-bottom: 1px solid white;
        }
        
        QTabBar::tab:hover {
            background-color: #f0f0f0;
        }
        
        /* 按钮样式 */
        QPushButton {
            background-color: #f0f0f0;
            border: 1px solid #999999;
            border-radius: 3px;
            padding: 5px 15px;
            font-size: 12px;
        }
        
        QPushButton:hover {
            background-color: #e0e0e0;
            border: 1px solid #777777;
        }
        
        QPushButton:pressed {
            background-color: #d0d0d0;
            border: 1px solid #555555;
        }
        
        QPushButton:disabled {
            background-color: #f8f8f8;
            color: #999999;
            border: 1px solid #cccccc;
        }
        
        /* 输入框样式 */
        QLineEdit, QSpinBox, QDoubleSpinBox {
            background-color: white;
            border: 1px solid #cccccc;
            border-radius: 2px;
            padding: 3px;
            font-size: 12px;
        }
        
        QLineEdit:focus, QSpinBox:focus, QDoubleSpinBox:focus {
            border: 2px solid #3875d7;
        }
        
        /* 组框样式 */
        QGroupBox {
            font-weight: bold;
            border: 2px solid #cccccc;
            border-radius: 5px;
            margin: 10px 0px;
            padding-top: 10px;
        }
        
        QGroupBox::title {
            subcontrol-origin: margin;
            subcontrol-position: top left;
            padding: 0 5px;
            background-color: #f0f0f0;
            color: #333333;
        }
        
        /* 进度条样式 */
        QProgressBar {
            border: 1px solid #cccccc;
            border-radius: 3px;
            text-align: center;
            font-size: 11px;
        }
        
        QProgressBar::chunk {
            background-color: #3875d7;
            border-radius: 2px;
        }
        """

class ModelTreeWidget(QTreeWidget):
    """模型树浏览器 - Abaqus风格"""
    
    # 信号定义
    item_activated = pyqtSignal(str, str)  # (item_type, item_name)
    context_menu_requested = pyqtSignal(str, str, object)  # (item_type, item_name, position)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_tree()
        self.populate_model_structure()
        
    def setup_tree(self):
        """设置树形控件"""
        self.setHeaderLabels(["模型树"])
        self.setRootIsDecorated(True)
        self.setAlternatingRowColors(True)
        self.setSelectionMode(QTreeWidget.SelectionMode.SingleSelection)
        self.setDragDropMode(QTreeWidget.DragDropMode.InternalMove)
        
        # 连接信号
        self.itemDoubleClicked.connect(self._on_item_double_clicked)
        self.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.customContextMenuRequested.connect(self._on_context_menu)
        
    def populate_model_structure(self):
        """填充模型结构"""
        # 根节点
        self.clear()
        
        # 模型根节点
        model_root = QTreeWidgetItem(self, ["地质模型"])
        model_root.setData(0, Qt.ItemDataRole.UserRole, {"type": "model", "name": "GeoModel"})
        self.set_item_icon(model_root, "model")
        
        # 数据管理节点
        data_node = QTreeWidgetItem(model_root, ["数据管理"])
        data_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "data_manager", "name": "DataManager"})
        self.set_item_icon(data_node, "database")
        
        # 钻孔数据
        boreholes_node = QTreeWidgetItem(data_node, ["钻孔数据"])
        boreholes_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "boreholes", "name": "Boreholes"})
        self.set_item_icon(boreholes_node, "drill")
        
        # 地层点
        surface_points_node = QTreeWidgetItem(data_node, ["地层点"])
        surface_points_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "surface_points", "name": "SurfacePoints"})
        self.set_item_icon(surface_points_node, "points")
        
        # 方向数据
        orientations_node = QTreeWidgetItem(data_node, ["方向数据"])
        orientations_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "orientations", "name": "Orientations"})
        self.set_item_icon(orientations_node, "compass")
        
        # 地层管理节点
        strata_node = QTreeWidgetItem(model_root, ["地层管理"])
        strata_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "strata_manager", "name": "StrataManager"})
        self.set_item_icon(strata_node, "layers")
        
        # 构造地质节点
        structure_node = QTreeWidgetItem(model_root, ["构造地质"])
        structure_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "structure", "name": "Structure"})
        self.set_item_icon(structure_node, "structure")
        
        # 断层系统
        faults_node = QTreeWidgetItem(structure_node, ["断层系统"])
        faults_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "faults", "name": "Faults"})
        self.set_item_icon(faults_node, "fault")
        
        # 褶皱系统
        folds_node = QTreeWidgetItem(structure_node, ["褶皱系统"])
        folds_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "folds", "name": "Folds"})
        self.set_item_icon(folds_node, "fold")
        
        # 网格系统节点
        grid_node = QTreeWidgetItem(model_root, ["网格系统"])
        grid_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "grid_manager", "name": "GridManager"})
        self.set_item_icon(grid_node, "grid")
        
        # 规则网格
        regular_grid_node = QTreeWidgetItem(grid_node, ["规则网格"])
        regular_grid_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "regular_grid", "name": "RegularGrid"})
        
        # 剖面网格
        section_grid_node = QTreeWidgetItem(grid_node, ["剖面网格"])
        section_grid_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "section_grid", "name": "SectionGrid"})
        
        # 自定义网格
        custom_grid_node = QTreeWidgetItem(grid_node, ["自定义网格"])
        custom_grid_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "custom_grid", "name": "CustomGrid"})
        
        # 地球物理节点
        geophysics_node = QTreeWidgetItem(model_root, ["地球物理"])
        geophysics_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "geophysics", "name": "Geophysics"})
        self.set_item_icon(geophysics_node, "geophysics")
        
        # 重力场
        gravity_node = QTreeWidgetItem(geophysics_node, ["重力场"])
        gravity_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "gravity", "name": "Gravity"})
        
        # 磁场
        magnetic_node = QTreeWidgetItem(geophysics_node, ["磁场"])
        magnetic_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "magnetic", "name": "Magnetic"})
        
        # 计算结果节点
        results_node = QTreeWidgetItem(model_root, ["计算结果"])
        results_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "results", "name": "Results"})
        self.set_item_icon(results_node, "results")
        
        # 地质模型结果
        geo_results_node = QTreeWidgetItem(results_node, ["地质模型"])
        geo_results_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "geo_results", "name": "GeoResults"})
        
        # 地球物理结果
        physics_results_node = QTreeWidgetItem(results_node, ["地球物理"])
        physics_results_node.setData(0, Qt.ItemDataRole.UserRole, {"type": "physics_results", "name": "PhysicsResults"})
        
        # 展开主要节点
        model_root.setExpanded(True)
        data_node.setExpanded(True)
        structure_node.setExpanded(True)
        
    def set_item_icon(self, item: QTreeWidgetItem, icon_type: str):
        """设置节点图标"""
        if not ICONS_AVAILABLE:
            return
            
        icon_map = {
            "model": "fa5s.mountain",
            "database": "fa5s.database",
            "drill": "fa5s.search-location",
            "points": "fa5s.map-marker-alt",
            "compass": "fa5s.compass",
            "layers": "fa5s.layer-group",
            "structure": "fa5s.cubes",
            "fault": "fa5s.code-branch",
            "fold": "fa5s.wave-square",
            "grid": "fa5s.th",
            "geophysics": "fa5s.globe",
            "results": "fa5s.chart-area"
        }
        
        icon_name = icon_map.get(icon_type, "fa5s.circle")
        try:
            icon = qta.icon(icon_name, color='#2c3e50')
            item.setIcon(0, icon)
        except:
            pass
            
    def _on_item_double_clicked(self, item: QTreeWidgetItem, column: int):
        """处理双击事件"""
        data = item.data(0, Qt.ItemDataRole.UserRole)
        if data:
            self.item_activated.emit(data["type"], data["name"])
            
    def _on_context_menu(self, position):
        """处理右键菜单"""
        item = self.itemAt(position)
        if item:
            data = item.data(0, Qt.ItemDataRole.UserRole)
            if data:
                self.context_menu_requested.emit(data["type"], data["name"], position)
                
    def add_data_item(self, parent_type: str, item_name: str, item_type: str):
        """添加数据项到树中"""
        # 找到父节点
        parent_item = self.find_item_by_type(parent_type)
        if parent_item:
            new_item = QTreeWidgetItem(parent_item, [item_name])
            new_item.setData(0, Qt.ItemDataRole.UserRole, {"type": item_type, "name": item_name})
            self.set_item_icon(new_item, item_type)
            parent_item.setExpanded(True)
            
    def find_item_by_type(self, item_type: str) -> Optional[QTreeWidgetItem]:
        """根据类型查找树节点"""
        def search_recursive(item: QTreeWidgetItem) -> Optional[QTreeWidgetItem]:
            data = item.data(0, Qt.ItemDataRole.UserRole)
            if data and data["type"] == item_type:
                return item
                
            for i in range(item.childCount()):
                result = search_recursive(item.child(i))
                if result:
                    return result
            return None
            
        root = self.invisibleRootItem()
        for i in range(root.childCount()):
            result = search_recursive(root.child(i))
            if result:
                return result
        return None

class PropertyPanel(QDockWidget):
    """属性面板 - Abaqus风格"""
    
    def __init__(self, parent=None):
        super().__init__("属性", parent)
        self.setup_ui()
        self.current_object = None
        
    def setup_ui(self):
        """设置界面"""
        main_widget = QWidget()
        self.setWidget(main_widget)
        
        layout = QVBoxLayout(main_widget)
        
        # 对象信息标签
        self.object_label = QLabel("未选择对象")
        self.object_label.setFont(QFont("Arial", 10, QFont.Weight.Bold))
        self.object_label.setStyleSheet("color: #2c3e50; padding: 5px; background-color: #ecf0f1;")
        layout.addWidget(self.object_label)
        
        # 滚动区域
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        layout.addWidget(scroll_area)
        
        # 属性容器
        self.properties_widget = QWidget()
        self.properties_layout = QVBoxLayout(self.properties_widget)
        scroll_area.setWidget(self.properties_widget)
        
        # 默认显示空属性面板
        self.show_empty_properties()
        
    def show_empty_properties(self):
        """显示空属性面板"""
        self.clear_properties()
        
        empty_label = QLabel("请选择一个对象以查看其属性")
        empty_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        empty_label.setStyleSheet("color: #7f8c8d; font-style: italic; padding: 20px;")
        self.properties_layout.addWidget(empty_label)
        
    def clear_properties(self):
        """清空属性面板"""
        while self.properties_layout.count():
            child = self.properties_layout.takeAt(0)
            if child.widget():
                child.widget().deleteLater()
                
    def show_object_properties(self, obj_type: str, obj_name: str, properties: Dict[str, Any]):
        """显示对象属性"""
        self.current_object = (obj_type, obj_name)
        self.object_label.setText(f"{obj_type}: {obj_name}")
        
        self.clear_properties()
        
        # 根据对象类型显示不同的属性
        if obj_type == "surface_points":
            self.show_surface_points_properties(properties)
        elif obj_type == "orientations":
            self.show_orientations_properties(properties)
        elif obj_type == "faults":
            self.show_faults_properties(properties)
        elif obj_type == "regular_grid":
            self.show_grid_properties(properties)
        else:
            self.show_generic_properties(properties)
            
    def show_surface_points_properties(self, properties: Dict[str, Any]):
        """显示地层点属性"""
        # 坐标信息组
        coords_group = QGroupBox("坐标信息")
        coords_layout = QFormLayout(coords_group)
        
        coords_layout.addRow("X坐标:", QLineEdit(str(properties.get("x", "0.0"))))
        coords_layout.addRow("Y坐标:", QLineEdit(str(properties.get("y", "0.0"))))
        coords_layout.addRow("Z坐标:", QLineEdit(str(properties.get("z", "0.0"))))
        
        self.properties_layout.addWidget(coords_group)
        
        # 地层信息组
        surface_group = QGroupBox("地层信息")
        surface_layout = QFormLayout(surface_group)
        
        surface_combo = QComboBox()
        surface_combo.addItems(["地层1", "地层2", "地层3", "基岩"])
        surface_layout.addRow("地层:", surface_combo)
        
        formation_combo = QComboBox()
        formation_combo.addItems(["组1", "组2", "组3"])
        surface_layout.addRow("地层组:", formation_combo)
        
        self.properties_layout.addWidget(surface_group)
        
    def show_orientations_properties(self, properties: Dict[str, Any]):
        """显示方向数据属性"""
        # 位置信息
        position_group = QGroupBox("位置信息")
        position_layout = QFormLayout(position_group)
        
        position_layout.addRow("X坐标:", QLineEdit(str(properties.get("x", "0.0"))))
        position_layout.addRow("Y坐标:", QLineEdit(str(properties.get("y", "0.0"))))
        position_layout.addRow("Z坐标:", QLineEdit(str(properties.get("z", "0.0"))))
        
        self.properties_layout.addWidget(position_group)
        
        # 方向信息
        orientation_group = QGroupBox("方向信息")
        orientation_layout = QFormLayout(orientation_group)
        
        orientation_layout.addRow("倾向 (°):", QDoubleSpinBox())
        orientation_layout.addRow("倾角 (°):", QDoubleSpinBox())
        orientation_layout.addRow("极性:", QComboBox())
        
        self.properties_layout.addWidget(orientation_group)
        
    def show_faults_properties(self, properties: Dict[str, Any]):
        """显示断层属性"""
        # 断层基本信息
        basic_group = QGroupBox("基本信息")
        basic_layout = QFormLayout(basic_group)
        
        basic_layout.addRow("断层名称:", QLineEdit(properties.get("name", "")))
        basic_layout.addRow("断层类型:", QComboBox())
        basic_layout.addRow("断层影响半径:", QDoubleSpinBox())
        
        self.properties_layout.addWidget(basic_group)
        
        # 断层关系
        relation_group = QGroupBox("断层关系")
        relation_layout = QFormLayout(relation_group)
        
        relation_layout.addRow("是否有限断层:", QCheckBox())
        relation_layout.addRow("断层优先级:", QSpinBox())
        
        self.properties_layout.addWidget(relation_group)
        
    def show_grid_properties(self, properties: Dict[str, Any]):
        """显示网格属性"""
        # 网格范围
        extent_group = QGroupBox("网格范围")
        extent_layout = QFormLayout(extent_group)
        
        extent_layout.addRow("X范围:", QLineEdit("0, 1000"))
        extent_layout.addRow("Y范围:", QLineEdit("0, 1000"))
        extent_layout.addRow("Z范围:", QLineEdit("-500, 0"))
        
        self.properties_layout.addWidget(extent_group)
        
        # 网格分辨率
        resolution_group = QGroupBox("网格分辨率")
        resolution_layout = QFormLayout(resolution_group)
        
        resolution_layout.addRow("X分辨率:", QSpinBox())
        resolution_layout.addRow("Y分辨率:", QSpinBox())
        resolution_layout.addRow("Z分辨率:", QSpinBox())
        
        self.properties_layout.addWidget(resolution_group)
        
    def show_generic_properties(self, properties: Dict[str, Any]):
        """显示通用属性"""
        if not properties:
            self.show_empty_properties()
            return
            
        generic_group = QGroupBox("属性")
        generic_layout = QFormLayout(generic_group)
        
        for key, value in properties.items():
            if isinstance(value, (int, float)):
                widget = QDoubleSpinBox()
                widget.setValue(float(value))
            elif isinstance(value, bool):
                widget = QCheckBox()
                widget.setChecked(value)
            else:
                widget = QLineEdit(str(value))
                
            generic_layout.addRow(f"{key}:", widget)
            
        self.properties_layout.addWidget(generic_group)
        
        # 添加拉伸空间
        self.properties_layout.addStretch()

class MessageCenter(QDockWidget):
    """消息中心 - Abaqus风格"""
    
    def __init__(self, parent=None):
        super().__init__("消息", parent)
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        main_widget = QWidget()
        self.setWidget(main_widget)
        
        layout = QVBoxLayout(main_widget)
        
        # 标签页
        self.tab_widget = QTabWidget()
        layout.addWidget(self.tab_widget)
        
        # 消息标签页
        self.message_text = QTextEdit()
        self.message_text.setReadOnly(True)
        self.message_text.setFont(QFont("Consolas", 10))
        self.tab_widget.addTab(self.message_text, "消息")
        
        # 警告标签页
        self.warning_text = QTextEdit()
        self.warning_text.setReadOnly(True)
        self.warning_text.setFont(QFont("Consolas", 10))
        self.tab_widget.addTab(self.warning_text, "警告")
        
        # 错误标签页
        self.error_text = QTextEdit()
        self.error_text.setReadOnly(True)
        self.error_text.setFont(QFont("Consolas", 10))
        self.tab_widget.addTab(self.error_text, "错误")
        
        # 控制按钮
        button_layout = QHBoxLayout()
        
        clear_btn = QPushButton("清空")
        clear_btn.clicked.connect(self.clear_messages)
        button_layout.addWidget(clear_btn)
        
        save_btn = QPushButton("保存日志")
        save_btn.clicked.connect(self.save_log)
        button_layout.addWidget(save_btn)
        
        button_layout.addStretch()
        layout.addLayout(button_layout)
        
    def add_message(self, message: str, msg_type: str = "info"):
        """添加消息"""
        timestamp = pd.Timestamp.now().strftime("%H:%M:%S")
        formatted_msg = f"[{timestamp}] {message}\n"
        
        if msg_type == "info":
            self.message_text.append(formatted_msg)
        elif msg_type == "warning":
            self.warning_text.append(formatted_msg)
        elif msg_type == "error":
            self.error_text.append(formatted_msg)
            
    def clear_messages(self):
        """清空消息"""
        current_tab = self.tab_widget.currentIndex()
        if current_tab == 0:
            self.message_text.clear()
        elif current_tab == 1:
            self.warning_text.clear()
        elif current_tab == 2:
            self.error_text.clear()
            
    def save_log(self):
        """保存日志"""
        filename, _ = QFileDialog.getSaveFileName(
            self, "保存日志", "gempy_log.txt", "文本文件 (*.txt)")
        if filename:
            with open(filename, 'w', encoding='utf-8') as f:
                f.write("=== GemPy CAE 日志 ===\n\n")
                f.write("消息:\n")
                f.write(self.message_text.toPlainText())
                f.write("\n\n警告:\n")
                f.write(self.warning_text.toPlainText())
                f.write("\n\n错误:\n")
                f.write(self.error_text.toPlainText())

if __name__ == "__main__":
    # 这个文件是模块的一部分，将在主程序中使用
    pass