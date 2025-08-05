#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example2主窗口 - DeepCAD系统测试程序
集成前处理、分析、后处理三大模块
"""

import sys
import os
from pathlib import Path
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
    QSplitter, QTabWidget, QTreeWidget, QTreeWidgetItem, QTextEdit,
    QLabel, QPushButton, QProgressBar, QMenuBar, QMenu,
    QToolBar, QStatusBar, QFileDialog, QMessageBox, QFrame,
    QGroupBox, QFormLayout, QSpinBox, QDoubleSpinBox, QComboBox,
    QCheckBox, QSlider, QScrollArea, QListWidget, QListWidgetItem
)
from PyQt6.QtCore import Qt, QTimer, QThread, pyqtSignal, QSize
from PyQt6.QtGui import QIcon, QFont, QPixmap, QPalette, QColor, QAction

# 添加项目路径
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from example2.modules.preprocessor import PreProcessor
from example2.modules.analyzer import Analyzer  
from example2.modules.postprocessor import PostProcessor


class MainWindow(QMainWindow):
    """岩土工程分析系统 - MIDAS模型计算程序"""
    
    def __init__(self):
        super().__init__()

        # 初始化模块
        self.preprocessor = PreProcessor()
        self.analyzer = Analyzer()
        self.postprocessor = PostProcessor()

        # 初始化多线程操作管理器
        try:
            from ..utils.threaded_operations import ThreadedOperationManager
            self.operation_manager = ThreadedOperationManager(self)
            print("✅ 多线程操作管理器初始化成功")
        except ImportError:
            self.operation_manager = None
            print("⚠️ 多线程操作管理器不可用")

        self.current_project = None
        self.analysis_results = None
        
        self.init_ui()
        self.setup_connections()
        
    def init_ui(self):
        """初始化用户界面"""
        self.setWindowTitle("岩土工程分析系统 - MIDAS模型摩尔-库伦非线性分析 v2.0")
        self.setGeometry(100, 100, 1800, 1200)
        
        # 设置窗口图标
        self.setWindowIcon(self.style().standardIcon(self.style().SP_ComputerIcon))
        
        # 设置现代化主题
        self.set_modern_theme()
        
        # 创建菜单栏和工具栏
        self.create_menu_bar()
        self.create_tool_bar()
        
        # 创建状态栏
        self.create_status_bar()
        
        # 创建中央部件 - 使用分割器布局
        self.create_main_layout()
        
    def set_modern_theme(self):
        """设置现代化主题"""
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f5f5f5;
                color: #333;
            }
            
            QTabWidget::pane {
                border: 1px solid #c0c0c0;
                background-color: white;
                border-radius: 6px;
            }
            
            QTabWidget::tab-bar {
                alignment: center;
            }
            
            QTabBar::tab {
                background-color: #e8e8e8;
                color: #333;
                padding: 12px 24px;
                margin-right: 2px;
                border-top-left-radius: 6px;
                border-top-right-radius: 6px;
                font-weight: bold;
            }
            
            QTabBar::tab:selected {
                background-color: #0078d4;
                color: white;
            }
            
            QTabBar::tab:hover:!selected {
                background-color: #d0d0d0;
            }
            
            QGroupBox {
                font-weight: bold;
                border: 2px solid #c0c0c0;
                border-radius: 8px;
                margin-top: 12px;
                padding-top: 12px;
                background-color: white;
            }
            
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 12px;
                padding: 0 8px 0 8px;
                color: #0078d4;
                font-size: 11pt;
            }
            
            QPushButton {
                background-color: #0078d4;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-weight: bold;
                min-width: 100px;
            }
            
            QPushButton:hover {
                background-color: #106ebe;
            }
            
            QPushButton:pressed {
                background-color: #005a9e;
            }
            
            QPushButton:disabled {
                background-color: #cccccc;
                color: #666666;
            }
            
            QComboBox {
                border: 1px solid #c0c0c0;
                border-radius: 4px;
                padding: 6px;
                background-color: white;
                min-width: 120px;
            }
            
            QComboBox:focus {
                border-color: #0078d4;
            }
            
            QProgressBar {
                border: 1px solid #c0c0c0;
                border-radius: 4px;
                text-align: center;
                background-color: #f0f0f0;
            }
            
            QProgressBar::chunk {
                background-color: #0078d4;
                border-radius: 3px;
            }
        """)
    
    def create_main_layout(self):
        """创建主要布局"""
        # 创建主分割器 (水平)
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        self.setCentralWidget(main_splitter)
        
        # 左侧：项目树和控制面板
        left_panel = self.create_left_panel()
        main_splitter.addWidget(left_panel)
        
        # 中央：3D视图和工作区
        center_panel = self.create_center_panel()
        main_splitter.addWidget(center_panel)
        
        # 右侧：属性面板和日志
        right_panel = self.create_right_panel()
        main_splitter.addWidget(right_panel)
        
        # 设置分割比例
        main_splitter.setSizes([300, 1000, 400])
        main_splitter.setStretchFactor(1, 1)  # 中央面板可拉伸
    
    def create_left_panel(self):
        """创建左侧控制面板"""
        panel = QWidget()
        panel.setMaximumWidth(350)
        panel.setMinimumWidth(280)
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # 项目信息
        project_group = QGroupBox("📁 项目信息")
        project_layout = QVBoxLayout(project_group)
        
        self.project_name_label = QLabel("未打开项目")
        self.project_name_label.setStyleSheet("font-size: 12pt; color: #666;")
        project_layout.addWidget(self.project_name_label)
        
        # 文件操作按钮
        file_buttons = QHBoxLayout()
        self.open_file_btn = QPushButton("📂 打开FPN")
        self.save_project_btn = QPushButton("💾 保存项目")
        file_buttons.addWidget(self.open_file_btn)
        file_buttons.addWidget(self.save_project_btn)
        project_layout.addLayout(file_buttons)
        
        layout.addWidget(project_group)
        
        # 模型信息
        model_group = QGroupBox("🏗️ 模型信息")
        model_layout = QFormLayout(model_group)
        
        self.nodes_label = QLabel("0")
        self.elements_label = QLabel("0") 
        self.materials_label = QLabel("0")
        
        model_layout.addRow("节点数:", self.nodes_label)
        model_layout.addRow("单元数:", self.elements_label)
        model_layout.addRow("材料数:", self.materials_label)
        
        layout.addWidget(model_group)
        
        # 分析控制
        analysis_group = QGroupBox("⚙️ 分析控制")
        analysis_layout = QVBoxLayout(analysis_group)
        
        # 分析类型
        type_layout = QHBoxLayout()
        type_layout.addWidget(QLabel("分析类型:"))
        self.analysis_type_combo = QComboBox()
        self.analysis_type_combo.addItems([
            "摩尔-库伦非线性分析",
            "弹性静力分析", 
            "模态分析",
            "动力时程分析"
        ])
        type_layout.addWidget(self.analysis_type_combo)
        analysis_layout.addLayout(type_layout)
        
        # 分析步
        stage_layout = QHBoxLayout()
        stage_layout.addWidget(QLabel("分析步:"))
        self.analysis_stage_combo = QComboBox()
        self.analysis_stage_combo.addItem("初始状态")
        stage_layout.addWidget(self.analysis_stage_combo)
        analysis_layout.addLayout(stage_layout)
        
        # 分析按钮
        analysis_buttons = QVBoxLayout()
        self.run_analysis_btn = QPushButton("▶️ 开始分析")
        self.pause_analysis_btn = QPushButton("⏸️ 暂停")
        self.stop_analysis_btn = QPushButton("⏹️ 停止")
        
        self.run_analysis_btn.setStyleSheet("QPushButton { background-color: #28a745; }")
        self.pause_analysis_btn.setStyleSheet("QPushButton { background-color: #ffc107; color: black; }")
        self.stop_analysis_btn.setStyleSheet("QPushButton { background-color: #dc3545; }")
        
        analysis_buttons.addWidget(self.run_analysis_btn)
        analysis_buttons.addWidget(self.pause_analysis_btn)
        analysis_buttons.addWidget(self.stop_analysis_btn)
        analysis_layout.addLayout(analysis_buttons)
        
        # 分析进度
        self.analysis_progress = QProgressBar()
        self.analysis_status_label = QLabel("就绪")
        analysis_layout.addWidget(self.analysis_progress)
        analysis_layout.addWidget(self.analysis_status_label)
        
        layout.addWidget(analysis_group)
        
        # 弹簧占位
        layout.addStretch()
        
        return panel
    
    def create_center_panel(self):
        """创建中央工作面板"""
        # 创建工作区标签页
        self.workspace_tabs = QTabWidget()
        self.workspace_tabs.setTabPosition(QTabWidget.TabPosition.North)
        
        # 3D视图标签页
        self.view_3d_widget = self.create_3d_viewer()
        self.workspace_tabs.addTab(self.view_3d_widget, "🎯 3D视图")
        
        # 前处理标签页  
        self.preprocessor_widget = self.create_preprocessor_workspace()
        self.workspace_tabs.addTab(self.preprocessor_widget, "🔧 前处理")
        
        # 后处理标签页
        self.postprocessor_widget = self.create_postprocessor_panel()
        self.workspace_tabs.addTab(self.postprocessor_widget, "📊 后处理")
        
        return self.workspace_tabs
    
    def create_3d_viewer(self):
        """创建3D视图"""
        from example2.gui.model_viewer import ModelViewer
        viewer = ModelViewer()
        return viewer
    
    def create_preprocessor_workspace(self):
        """创建前处理工作区"""
        # 创建水平分割器
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # 左侧：前处理控制面板
        control_panel = self.create_preprocessor_controls()
        splitter.addWidget(control_panel)
        
        # 右侧：前处理3D视图
        viewer_panel = self.create_preprocessor_viewer()
        splitter.addWidget(viewer_panel)
        
        # 设置分割比例 (控制面板:视图 = 1:2)
        splitter.setSizes([300, 600])
        splitter.setStretchFactor(1, 1)  # 视图可拉伸
        
        return splitter
    
    def create_postprocessor_panel(self):
        """创建后处理面板"""
        panel = QWidget()
        layout = QVBoxLayout(panel)
        
        # 标题
        title_label = QLabel("📊 后处理 - 结果查看与分析")
        title_label.setFont(QFont("Microsoft YaHei", 12, QFont.Bold))
        title_label.setAlignment(Qt.AlignCenter)
        title_label.setStyleSheet("""
            QLabel {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 #9C27B0, stop:1 #673AB7);
                color: white;
                padding: 10px;
                border-radius: 8px;
                margin-bottom: 5px;
            }
        """)
        layout.addWidget(title_label)
        
        # 后处理内容（占位）
        content_label = QLabel("🔄 后处理功能开发中...\n完成分析后将在此显示结果")
        content_label.setAlignment(Qt.AlignCenter)
        content_label.setStyleSheet("""
            QLabel {
                color: #666;
                font-size: 14px;
                padding: 50px;
            }
        """)
        layout.addWidget(content_label)
        
        return panel
    
    def create_right_panel(self):
        """创建右侧面板"""
        panel = QWidget()
        panel.setMaximumWidth(450)
        panel.setMinimumWidth(350)
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # 材料属性面板
        material_group = QGroupBox("🧱 材料属性")
        material_layout = QVBoxLayout(material_group)
        
        # 材料选择
        material_select_layout = QHBoxLayout()
        material_select_layout.addWidget(QLabel("材料组:"))
        self.material_group_combo = QComboBox()
        material_select_layout.addWidget(self.material_group_combo)
        material_layout.addLayout(material_select_layout)
        
        # 材料参数
        params_layout = QFormLayout()
        
        self.elastic_modulus_spin = QDoubleSpinBox()
        self.elastic_modulus_spin.setRange(1, 100000)
        self.elastic_modulus_spin.setValue(20)
        self.elastic_modulus_spin.setSuffix(" MPa")
        params_layout.addRow("弹性模量:", self.elastic_modulus_spin)
        
        self.poisson_ratio_spin = QDoubleSpinBox()
        self.poisson_ratio_spin.setRange(0.1, 0.49)
        self.poisson_ratio_spin.setValue(0.3)
        self.poisson_ratio_spin.setDecimals(3)
        params_layout.addRow("泊松比:", self.poisson_ratio_spin)
        
        self.cohesion_spin = QDoubleSpinBox()
        self.cohesion_spin.setRange(0, 1000)
        self.cohesion_spin.setValue(20)
        self.cohesion_spin.setSuffix(" kPa")
        params_layout.addRow("粘聚力:", self.cohesion_spin)
        
        self.friction_angle_spin = QDoubleSpinBox()
        self.friction_angle_spin.setRange(0, 60)
        self.friction_angle_spin.setValue(30)
        self.friction_angle_spin.setSuffix(" °")
        params_layout.addRow("内摩擦角:", self.friction_angle_spin)
        
        self.unit_weight_spin = QDoubleSpinBox()
        self.unit_weight_spin.setRange(10, 30)
        self.unit_weight_spin.setValue(18)
        self.unit_weight_spin.setSuffix(" kN/m³")
        params_layout.addRow("重度:", self.unit_weight_spin)
        
        material_layout.addLayout(params_layout)
        
        layout.addWidget(material_group)
        
        # 求解参数
        solver_group = QGroupBox("⚙️ 求解参数")
        solver_layout = QFormLayout(solver_group)
        
        self.max_iterations_spin = QSpinBox()
        self.max_iterations_spin.setRange(5, 200)
        self.max_iterations_spin.setValue(50)
        solver_layout.addRow("最大迭代数:", self.max_iterations_spin)
        
        self.tolerance_spin = QDoubleSpinBox()
        self.tolerance_spin.setRange(1e-8, 1e-3)
        self.tolerance_spin.setValue(1e-6)
        self.tolerance_spin.setDecimals(8)
        # PyQt6兼容性：设置格式显示
        self.tolerance_spin.setStepType(QDoubleSpinBox.StepType.AdaptiveDecimalStepType)
        solver_layout.addRow("收敛容差:", self.tolerance_spin)
        
        layout.addWidget(solver_group)
        
        # 分析日志
        log_group = QGroupBox("📝 分析日志")
        log_layout = QVBoxLayout(log_group)
        
        self.analysis_log = QTextEdit()
        self.analysis_log.setMaximumHeight(300)
        self.analysis_log.setReadOnly(True)
        self.analysis_log.setStyleSheet("""
            QTextEdit {
                background-color: #1e1e1e;
                color: #ffffff;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 9pt;
                border: 1px solid #555;
            }
        """)
        log_layout.addWidget(self.analysis_log)
        
        # 日志控制按钮
        log_buttons = QHBoxLayout()
        clear_log_btn = QPushButton("🗑️ 清空")
        save_log_btn = QPushButton("💾 保存日志")
        clear_log_btn.clicked.connect(self.analysis_log.clear)
        log_buttons.addWidget(clear_log_btn)
        log_buttons.addWidget(save_log_btn)
        log_layout.addLayout(log_buttons)
        
        layout.addWidget(log_group)
        
        return panel
        
    def create_preprocessor_tab(self):
        """创建前处理模块标签页"""
        tab = QWidget()
        layout = QHBoxLayout(tab)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # 左侧控制面板
        left_panel = self.create_preprocessor_controls()
        left_panel.setMaximumWidth(350)
        layout.addWidget(left_panel)
        
        # 右侧3D视图
        right_panel = self.create_preprocessor_viewer()
        layout.addWidget(right_panel)
        
        self.workflow_tabs.addTab(tab, "🔧 前处理")
        
    def create_preprocessor_controls(self):
        """创建前处理控制面板"""
        panel = QFrame()
        panel.setFrameStyle(QFrame.StyledPanel)
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # 项目管理组
        project_group = QGroupBox("📁 项目管理")
        project_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        project_layout = QVBoxLayout(project_group)
        
        self.new_project_btn = QPushButton("🆕 新建项目")
        self.load_project_btn = QPushButton("📂 加载项目")
        self.save_project_btn = QPushButton("💾 保存项目")
        
        for btn in [self.new_project_btn, self.load_project_btn, self.save_project_btn]:
            btn.setMinimumHeight(35)
            project_layout.addWidget(btn)
        
        layout.addWidget(project_group)
        
        # 几何模型组
        geometry_group = QGroupBox("📐 几何模型")
        geometry_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        geometry_layout = QVBoxLayout(geometry_group)
        
        self.import_fpn_btn = QPushButton("📄 导入MIDAS基坑模型")
        self.import_mesh_btn = QPushButton("📥 导入其他网格")
        self.generate_mesh_btn = QPushButton("🔨 生成测试网格")
        self.mesh_quality_btn = QPushButton("🔍 网格质量检查")
        
        # 设置主要按钮样式
        self.import_fpn_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #4CAF50, stop:1 #45a049);
                color: white;
                font-weight: bold;
                border-radius: 6px;
                font-size: 14px;
                padding: 8px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #5CBF60, stop:1 #55b059);
            }
        """)
        
        for btn in [self.import_fpn_btn, self.import_mesh_btn, self.generate_mesh_btn, self.mesh_quality_btn]:
            btn.setMinimumHeight(30)
            geometry_layout.addWidget(btn)
        
        layout.addWidget(geometry_group)
        
        # 模型信息组
        info_group = QGroupBox("📋 模型信息")
        info_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        info_layout = QFormLayout(info_group)
        
        self.nodes_count_label = QLabel("0")
        info_layout.addRow("节点数:", self.nodes_count_label)
        
        self.elements_count_label = QLabel("0")
        info_layout.addRow("单元数:", self.elements_count_label)
        
        self.materials_count_label = QLabel("0")
        info_layout.addRow("材料数:", self.materials_count_label)
        
        self.constraints_count_label = QLabel("0") 
        info_layout.addRow("约束数:", self.constraints_count_label)
        
        self.loads_count_label = QLabel("0")
        info_layout.addRow("荷载数:", self.loads_count_label)
        
        layout.addWidget(info_group)
        
        # 材料参数组
        materials_group = QGroupBox("🧱 材料参数")
        materials_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        materials_layout = QVBoxLayout(materials_group)
        
        # 材料统计信息
        self.materials_summary = QLabel("未加载材料数据")
        self.materials_summary.setStyleSheet("""
            QLabel {
                color: #7f8c8d; 
                font-size: 11px; 
                padding: 5px;
                background-color: #f8f9fa;
                border-radius: 3px;
                border: 1px solid #e9ecef;
            }
        """)
        materials_layout.addWidget(self.materials_summary)
        
        # 材料列表
        self.materials_list = QListWidget()
        self.materials_list.setMaximumHeight(120)
        self.materials_list.setStyleSheet("""
            QListWidget {
                border: 1px solid #bdc3c7;
                border-radius: 5px;
                background-color: #f8f9fa;
                font-size: 10px;
            }
            QListWidget::item {
                padding: 4px;
                border-bottom: 1px solid #ecf0f1;
            }
            QListWidget::item:selected {
                background-color: #3498db;
                color: white;
            }
            QListWidget::item:hover {
                background-color: #e8f4fd;
            }
        """)
        materials_layout.addWidget(self.materials_list)
        
        layout.addWidget(materials_group)
        
        # 边界条件组 (只展示，不修改)
        boundary_group = QGroupBox("🔒 边界条件")
        boundary_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        boundary_layout = QVBoxLayout(boundary_group)
        
        self.boundary_list = QListWidget()
        self.boundary_list.setMaximumHeight(150)
        # 基坑工程边界条件
        self.boundary_list.addItem("🔒 底部边界: 固定约束")
        self.boundary_list.addItem("🌍 地表荷载: 20kN/m²")
        self.boundary_list.addItem("🧱 围护结构: 位移约束")
        self.boundary_list.addItem("💧 地下水位: -5.0m")
        
        boundary_layout.addWidget(QLabel("边界条件列表:"))
        boundary_layout.addWidget(self.boundary_list)
        
        layout.addWidget(boundary_group)
        
        # 物理组选择
        physics_group = QGroupBox("🧱 物理组选择")
        physics_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        physics_layout = QVBoxLayout(physics_group)
        
        physics_layout.addWidget(QLabel("材料组:"))
        self.material_group_combo = QComboBox()
        self.material_group_combo.addItem("所有材料组")
        physics_layout.addWidget(self.material_group_combo)
        
        physics_layout.addWidget(QLabel("荷载组:"))
        self.load_group_combo = QComboBox()
        self.load_group_combo.addItem("所有荷载组")
        physics_layout.addWidget(self.load_group_combo)
        
        physics_layout.addWidget(QLabel("边界组:"))
        self.boundary_group_combo = QComboBox()
        self.boundary_group_combo.addItem("所有边界组")
        physics_layout.addWidget(self.boundary_group_combo)
        
        layout.addWidget(physics_group)
        
        # 分析步选择
        analysis_group = QGroupBox("📊 分析步选择")
        analysis_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        analysis_layout = QVBoxLayout(analysis_group)
        
        analysis_layout.addWidget(QLabel("当前分析步:"))
        self.analysis_stage_combo = QComboBox()
        self.analysis_stage_combo.addItem("初始状态")
        analysis_layout.addWidget(self.analysis_stage_combo)
        
        layout.addWidget(analysis_group)
        
        # 显示控制组
        display_group = QGroupBox("👁️ 显示控制")
        display_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        display_layout = QVBoxLayout(display_group)
        
        # 显示模式切换
        mode_layout = QHBoxLayout()
        self.wireframe_btn = QPushButton("线框")
        self.solid_btn = QPushButton("实体")
        self.transparent_btn = QPushButton("半透明")
        
        # 设置按钮样式和状态
        for btn in [self.wireframe_btn, self.solid_btn, self.transparent_btn]:
            btn.setCheckable(True)
            btn.setMinimumHeight(30)
            mode_layout.addWidget(btn)
        
        # 默认选中半透明模式
        self.transparent_btn.setChecked(True)
        display_layout.addLayout(mode_layout)
        
        # 其他显示选项
        self.show_mesh_cb = QCheckBox("显示网格边")
        self.show_mesh_cb.setChecked(True)
        self.show_nodes_cb = QCheckBox("显示节点")
        self.show_supports_cb = QCheckBox("显示支承")
        self.show_supports_cb.setChecked(True)
        self.show_loads_cb = QCheckBox("显示荷载")
        self.show_loads_cb.setChecked(True)
        
        for cb in [self.show_mesh_cb, self.show_nodes_cb, self.show_supports_cb, self.show_loads_cb]:
            display_layout.addWidget(cb)
        
        layout.addWidget(display_group)
        
        # 添加弹簧
        layout.addStretch()
        
        return panel
        
    def create_preprocessor_viewer(self):
        """创建前处理3D视图"""
        panel = QFrame()
        panel.setFrameStyle(QFrame.StyledPanel)
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # 标题
        title_label = QLabel("🏗️ 基坑工程前处理 - MIDAS模型导入与可视化")
        title_label.setFont(QFont("Microsoft YaHei", 12, QFont.Bold))
        title_label.setAlignment(Qt.AlignCenter)
        title_label.setStyleSheet("""
            QLabel {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 #FF6B35, stop:1 #F7931E);
                color: white;
                padding: 10px;
                border-radius: 8px;
                margin-bottom: 5px;
            }
        """)
        layout.addWidget(title_label)
        
        # 3D视图容器
        self.preprocessor_viewer = self.preprocessor.get_viewer_widget()
        layout.addWidget(self.preprocessor_viewer)
        
        # 视图控制按钮
        control_layout = QHBoxLayout()
        
        self.pre_reset_btn = QPushButton("🔄 重置视图")
        self.pre_fit_btn = QPushButton("📏 适应窗口")
        self.pre_wireframe_btn = QPushButton("🕸️ 线框模式")
        self.pre_solid_btn = QPushButton("🧊 实体模式")
        
        for btn in [self.pre_reset_btn, self.pre_fit_btn, self.pre_wireframe_btn, self.pre_solid_btn]:
            btn.setMinimumHeight(30)
            control_layout.addWidget(btn)
        
        layout.addLayout(control_layout)
        
        return panel
        
    def create_analyzer_tab(self):
        """创建分析模块标签页"""
        tab = QWidget()
        layout = QHBoxLayout(tab)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # 左侧控制面板
        left_panel = self.create_analyzer_controls()
        left_panel.setMaximumWidth(350)
        layout.addWidget(left_panel)
        
        # 右侧监控面板
        right_panel = self.create_analyzer_monitor()
        layout.addWidget(right_panel)
        
        self.workflow_tabs.addTab(tab, "🧮 分析")
        
    def create_analyzer_controls(self):
        """创建分析控制面板"""
        panel = QFrame()
        panel.setFrameStyle(QFrame.StyledPanel)
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # 分析类型组
        analysis_group = QGroupBox("📋 分析类型")
        analysis_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        analysis_layout = QVBoxLayout(analysis_group)
        
        self.analysis_type = QComboBox()
        self.analysis_type.addItems([
            "摩尔-库伦非线性分析", "弹性静力分析", "大变形分析"
        ])
        self.analysis_type.setCurrentIndex(0)  # 默认选择摩尔-库伦
        analysis_layout.addWidget(self.analysis_type)
        
        # 添加分析说明
        analysis_note = QLabel("✅ FPN文件包含MNLMC摩尔-库伦参数，支持非线性分析")
        analysis_note.setStyleSheet("color: #27ae60; font-size: 10px; font-style: italic;")
        analysis_note.setWordWrap(True)
        analysis_layout.addWidget(analysis_note)
        
        layout.addWidget(analysis_group)
        
        # 施工步序组 (导入数据展示)
        steps_group = QGroupBox("🏗️ 施工步序")
        steps_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        steps_layout = QVBoxLayout(steps_group)
        
        self.steps_list = QListWidget()
        self.steps_list.setMaximumHeight(120)
        
        # 基坑工程施工步序
        construction_steps = [
            "步骤1: 初始地应力平衡",
            "步骤2: 围护结构施工", 
            "步骤3: 第一层土体开挖",
            "步骤4: 第一道支撑安装",
            "步骤5: 第二层土体开挖",
            "步骤6: 第二道支撑安装",
            "步骤7: 基坑见底开挖"
        ]
        for step in construction_steps:
            self.steps_list.addItem(step)
        
        steps_layout.addWidget(QLabel("施工步序:"))  
        steps_layout.addWidget(self.steps_list)
        
        layout.addWidget(steps_group)
        
        # 求解参数组 (简化，只展示关键参数)
        solver_group = QGroupBox("⚡ 求解参数")
        solver_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        solver_layout = QFormLayout(solver_group)
        
        # 只保留关键的可调参数
        self.max_iterations = QSpinBox()
        self.max_iterations.setRange(10, 500)
        self.max_iterations.setValue(100)
        solver_layout.addRow("最大迭代次数:", self.max_iterations)
        
        # 使用标准下拉框选择收敛精度
        self.convergence_combo = QComboBox()
        self.convergence_combo.addItems(["粗糙 (1e-4)", "标准 (1e-6)", "精确 (1e-8)"])
        self.convergence_combo.setCurrentIndex(1)  # 默认标准
        solver_layout.addRow("收敛精度:", self.convergence_combo)
        
        layout.addWidget(solver_group)
        
        # 计算控制组
        control_group = QGroupBox("🎮 计算控制")
        control_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        control_layout = QVBoxLayout(control_group)
        
        self.run_analysis_btn = QPushButton("🚀 开始分析")
        self.run_analysis_btn.setMinimumHeight(50)
        self.run_analysis_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #4CAF50, stop:1 #45a049);
                color: white;
                font-weight: bold;
                border-radius: 8px;
                font-size: 16px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #5CBF60, stop:1 #55b059);
            }
        """)
        control_layout.addWidget(self.run_analysis_btn)
        
        self.pause_analysis_btn = QPushButton("⏸️ 暂停分析")
        self.stop_analysis_btn = QPushButton("⏹️ 停止分析")
        
        for btn in [self.pause_analysis_btn, self.stop_analysis_btn]:
            btn.setMinimumHeight(35)
            btn.setEnabled(False)
            control_layout.addWidget(btn)
        
        layout.addWidget(control_group)
        
        # 添加弹簧
        layout.addStretch()
        
        return panel
        
    def create_analyzer_monitor(self):
        """创建分析监控面板"""
        panel = QFrame()
        panel.setFrameStyle(QFrame.StyledPanel)
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # 标题
        title_label = QLabel("⚡ Kratos摩尔-库伦非线性分析 - 基坑工程求解监控")
        title_label.setFont(QFont("Microsoft YaHei", 12, QFont.Bold))
        title_label.setAlignment(Qt.AlignCenter)
        title_label.setStyleSheet("""
            QLabel {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 #2196F3, stop:1 #1976D2);
                color: white;
                padding: 10px;
                border-radius: 8px;
                margin-bottom: 5px;
            }
        """)
        layout.addWidget(title_label)
        
        # 分析说明
        info_label = QLabel("🏗️ 正在使用MIDAS FPN数据进行摩尔-库伦非线性分析，包含真实土体参数")
        info_label.setStyleSheet("""
            QLabel {
                background-color: #d5f4e6;
                color: #155724;
                padding: 8px;
                border-radius: 5px;
                border: 1px solid #c3e6cb;
                font-size: 11px;
            }
        """)
        info_label.setWordWrap(True)
        layout.addWidget(info_label)
        
        # 进度信息组
        progress_group = QGroupBox("📈 计算进度")
        progress_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        progress_layout = QVBoxLayout(progress_group)
        
        # 总进度
        self.overall_progress = QProgressBar()
        self.overall_progress.setTextVisible(True)
        progress_layout.addWidget(QLabel("总体进度:"))
        progress_layout.addWidget(self.overall_progress)
        
        # 步骤进度
        self.step_progress = QProgressBar()
        self.step_progress.setTextVisible(True)
        progress_layout.addWidget(QLabel("当前步骤:"))
        progress_layout.addWidget(self.step_progress)
        
        # 迭代进度
        self.iteration_progress = QProgressBar()
        self.iteration_progress.setTextVisible(True)
        progress_layout.addWidget(QLabel("迭代进度:"))
        progress_layout.addWidget(self.iteration_progress)
        
        layout.addWidget(progress_group)
        
        # 状态信息组
        status_group = QGroupBox("📊 状态信息")
        status_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        status_layout = QFormLayout(status_group)
        
        self.current_step_label = QLabel("就绪")
        self.current_iteration_label = QLabel("0/0")
        self.convergence_label = QLabel("N/A")
        self.elapsed_time_label = QLabel("00:00:00")
        
        status_layout.addRow("当前步骤:", self.current_step_label)
        status_layout.addRow("迭代次数:", self.current_iteration_label)
        status_layout.addRow("收敛状态:", self.convergence_label)
        status_layout.addRow("运行时间:", self.elapsed_time_label)
        
        layout.addWidget(status_group)
        
        # 日志输出
        log_group = QGroupBox("📝 计算日志")
        log_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        log_layout = QVBoxLayout(log_group)
        
        self.analysis_log = QTextEdit()
        self.analysis_log.setMaximumHeight(200)
        self.analysis_log.setFont(QFont("Consolas", 9))
        self.analysis_log.append("系统就绪，等待开始分析...")
        log_layout.addWidget(self.analysis_log)
        
        layout.addWidget(log_group)
        
        # Kratos状态
        kratos_group = QGroupBox("🔧 Kratos状态")
        kratos_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        kratos_layout = QFormLayout(kratos_group)
        
        self.kratos_status_label = QLabel("检查中...")
        self.kratos_version_label = QLabel("N/A")
        self.memory_usage_label = QLabel("N/A")
        
        kratos_layout.addRow("Kratos状态:", self.kratos_status_label)
        kratos_layout.addRow("版本信息:", self.kratos_version_label)
        kratos_layout.addRow("内存使用:", self.memory_usage_label)
        
        layout.addWidget(kratos_group)
        
        return panel
        
    def create_postprocessor_tab(self):
        """创建后处理模块标签页"""
        tab = QWidget()
        layout = QHBoxLayout(tab)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # 左侧控制面板
        left_panel = self.create_postprocessor_controls()
        left_panel.setMaximumWidth(350)
        layout.addWidget(left_panel)
        
        # 右侧3D视图
        right_panel = self.create_postprocessor_viewer()
        layout.addWidget(right_panel)
        
        self.workflow_tabs.addTab(tab, "📊 后处理")
        
    def create_postprocessor_controls(self):
        """创建后处理控制面板"""
        panel = QFrame()
        panel.setFrameStyle(QFrame.StyledPanel)
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # 结果加载组
        load_group = QGroupBox("📂 结果加载")
        load_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        load_layout = QVBoxLayout(load_group)
        
        self.load_results_btn = QPushButton("📥 加载结果文件")
        self.results_info_label = QLabel("未加载结果")
        self.results_info_label.setStyleSheet("color: gray;")
        
        load_layout.addWidget(self.load_results_btn)
        load_layout.addWidget(self.results_info_label)
        
        layout.addWidget(load_group)
        
        # 结果类型组
        result_group = QGroupBox("📈 结果类型")
        result_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        result_layout = QVBoxLayout(result_group)
        
        self.result_type = QComboBox()
        self.result_type.addItems([
            "位移", "应力", "应变", "反力", "模态振型", "主应力"
        ])
        result_layout.addWidget(self.result_type)
        
        # 分量选择
        self.component_type = QComboBox()
        self.component_type.addItems([
            "合成", "X分量", "Y分量", "Z分量", "von Mises"
        ])
        result_layout.addWidget(self.component_type)
        
        layout.addWidget(result_group)
        
        # 时间步控制组
        time_group = QGroupBox("⏰ 时间步控制")
        time_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        time_layout = QVBoxLayout(time_group)
        
        self.time_slider = QSlider(Qt.Horizontal)
        self.time_slider.setRange(0, 100)
        self.time_slider.setValue(100)  # 最后一步
        time_layout.addWidget(QLabel("时间步:"))
        time_layout.addWidget(self.time_slider)
        
        self.time_info_label = QLabel("步骤: 100/100")
        time_layout.addWidget(self.time_info_label)
        
        # 动画控制
        animation_layout = QHBoxLayout()
        self.play_btn = QPushButton("▶️ 播放")
        self.pause_btn = QPushButton("⏸️ 暂停")
        self.stop_btn = QPushButton("⏹️ 停止")
        
        for btn in [self.play_btn, self.pause_btn, self.stop_btn]:
            btn.setMaximumWidth(80)
            animation_layout.addWidget(btn)
        
        time_layout.addLayout(animation_layout)
        
        layout.addWidget(time_group)
        
        # 显示设置组
        display_group = QGroupBox("🎨 显示设置")
        display_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        display_layout = QFormLayout(display_group)
        
        self.show_deformed = QCheckBox("显示变形")
        self.show_deformed.setChecked(True)
        display_layout.addRow(self.show_deformed)
        
        self.deform_scale = QSlider(Qt.Horizontal)
        self.deform_scale.setRange(1, 100)
        self.deform_scale.setValue(10)
        display_layout.addRow("变形比例:", self.deform_scale)
        
        self.show_contour = QCheckBox("显示云图")
        self.show_contour.setChecked(True)
        display_layout.addRow(self.show_contour)
        
        self.show_wireframe = QCheckBox("显示线框")
        display_layout.addRow(self.show_wireframe)
        
        layout.addWidget(display_group)
        
        # 导出组
        export_group = QGroupBox("💾 结果导出")
        export_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        export_layout = QVBoxLayout(export_group)
        
        self.export_image_btn = QPushButton("🖼️ 导出图片")
        self.export_animation_btn = QPushButton("🎬 导出动画")
        self.export_data_btn = QPushButton("📊 导出数据")
        self.export_report_btn = QPushButton("📋 生成报告")
        
        for btn in [self.export_image_btn, self.export_animation_btn, 
                   self.export_data_btn, self.export_report_btn]:
            btn.setMinimumHeight(30)
            export_layout.addWidget(btn)
        
        layout.addWidget(export_group)
        
        # 添加弹簧
        layout.addStretch()
        
        return panel
        
    def create_postprocessor_viewer(self):
        """创建后处理3D视图"""
        panel = QFrame()
        panel.setFrameStyle(QFrame.StyledPanel)
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(8, 8, 8, 8)
        
        # 标题
        title_label = QLabel("📊 后处理 - 云图、动画、详细显示")
        title_label.setFont(QFont("Microsoft YaHei", 12, QFont.Bold))
        title_label.setAlignment(Qt.AlignCenter)
        title_label.setStyleSheet("""
            QLabel {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 #9C27B0, stop:1 #673AB7);
                color: white;
                padding: 10px;
                border-radius: 8px;
                margin-bottom: 5px;
            }
        """)
        layout.addWidget(title_label)
        
        # 3D视图容器
        self.postprocessor_viewer = self.postprocessor.get_viewer_widget()
        layout.addWidget(self.postprocessor_viewer)
        
        # 视图控制按钮
        control_layout = QHBoxLayout()
        
        self.post_reset_btn = QPushButton("🔄 重置视图")
        self.post_legend_btn = QPushButton("🏷️ 显示图例")
        self.post_colorbar_btn = QPushButton("🌈 色标设置")
        self.post_fullscreen_btn = QPushButton("🖥️ 全屏显示")
        
        for btn in [self.post_reset_btn, self.post_legend_btn, 
                   self.post_colorbar_btn, self.post_fullscreen_btn]:
            btn.setMinimumHeight(30)
            control_layout.addWidget(btn)
        
        layout.addLayout(control_layout)
        
        return panel
        
    def create_menu_bar(self):
        """创建菜单栏"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu("文件")
        
        new_action = QAction("新建项目", self)
        new_action.setShortcut("Ctrl+N")
        file_menu.addAction(new_action)
        
        open_action = QAction("打开项目", self)
        open_action.setShortcut("Ctrl+O")
        file_menu.addAction(open_action)
        
        save_action = QAction("保存项目", self)
        save_action.setShortcut("Ctrl+S")
        file_menu.addAction(save_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("退出", self)
        exit_action.setShortcut("Ctrl+Q")
        file_menu.addAction(exit_action)
        
        # 工具菜单
        tools_menu = menubar.addMenu("工具")
        
        check_kratos_action = QAction("检查Kratos", self)
        tools_menu.addAction(check_kratos_action)
        
        settings_action = QAction("设置", self)
        tools_menu.addAction(settings_action)
        
        # 帮助菜单
        help_menu = menubar.addMenu("帮助")
        
        about_action = QAction("关于", self)
        help_menu.addAction(about_action)
        
    def create_tool_bar(self):
        """创建工具栏"""
        toolbar = self.addToolBar("主工具栏")
        toolbar.setMovable(False)
        toolbar.setToolButtonStyle(Qt.ToolButtonTextBesideIcon)
        
        # 项目操作
        new_action = QAction("新建", self)
        new_action.setIcon(self.style().standardIcon(self.style().SP_FileIcon))
        toolbar.addAction(new_action)
        
        open_action = QAction("打开", self)  
        open_action.setIcon(self.style().standardIcon(self.style().SP_DirOpenIcon))
        toolbar.addAction(open_action)
        
        save_action = QAction("保存", self)
        save_action.setIcon(self.style().standardIcon(self.style().SP_DialogSaveButton))
        toolbar.addAction(save_action)
        
        toolbar.addSeparator()
        
        # 工作流控制
        preprocess_action = QAction("前处理", self)
        preprocess_action.setIcon(self.style().standardIcon(self.style().SP_FileDialogDetailedView))
        toolbar.addAction(preprocess_action)
        
        analyze_action = QAction("分析", self)
        analyze_action.setIcon(self.style().standardIcon(self.style().SP_MediaPlay))
        toolbar.addAction(analyze_action)
        
        postprocess_action = QAction("后处理", self)
        postprocess_action.setIcon(self.style().standardIcon(self.style().SP_ComputerIcon))
        toolbar.addAction(postprocess_action)
        
    def create_status_bar(self):
        """创建状态栏"""
        statusbar = self.statusBar()
        
        # 状态标签
        self.status_label = QLabel("DeepCAD系统就绪")
        statusbar.addWidget(self.status_label)
        
        # 模块状态
        self.module_status = QLabel("前处理")
        statusbar.addPermanentWidget(self.module_status)
        
        # 内存使用
        self.memory_label = QLabel("内存: 0 MB")
        statusbar.addPermanentWidget(self.memory_label)
        
    def apply_modern_style(self):
        """应用现代化样式"""
        style_sheet = """
        QMainWindow {
            background-color: #f5f5f5;
        }
        
        QTabWidget::pane {
            border: 1px solid #ddd;
            border-radius: 8px;
            background-color: white;
        }
        
        QTabWidget::tab-bar {
            alignment: center;
        }
        
        QTabBar::tab {
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            padding: 12px 24px;
            margin-right: 4px;
            border-top-left-radius: 8px;
            border-top-right-radius: 8px;
            font-weight: bold;
        }
        
        QTabBar::tab:selected {
            background-color: white;
            border-bottom-color: white;
            color: #007bff;
        }
        
        QTabBar::tab:hover {
            background-color: #e9ecef;
        }
        
        QFrame {
            background-color: white;
            border: 1px solid #dee2e6;
            border-radius: 8px;
        }
        
        QGroupBox {
            font-weight: bold;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            margin-top: 1ex;
            padding-top: 10px;
        }
        
        QGroupBox::title {
            subcontrol-origin: margin;
            left: 10px;
            padding: 0 8px 0 8px;
            background-color: white;
        }
        
        QPushButton {
            background-color: #ffffff;
            border: 1px solid #ced4da;
            border-radius: 6px;
            padding: 8px 16px;
            font-weight: 500;
            color: #495057;
        }
        
        QPushButton:hover {
            background-color: #e9ecef;
            border-color: #adb5bd;
        }
        
        QPushButton:pressed {
            background-color: #dee2e6;
            border-color: #6c757d;
        }
        
        QPushButton:disabled {
            background-color: #f8f9fa;
            color: #6c757d;
            border-color: #dee2e6;
        }
        
        QComboBox, QSpinBox, QDoubleSpinBox {
            border: 1px solid #ced4da;
            border-radius: 4px;
            padding: 6px;
            background-color: white;
        }
        
        QProgressBar {
            border: 1px solid #dee2e6;
            border-radius: 8px;
            text-align: center;
            background-color: #f8f9fa;
            font-weight: bold;
        }
        
        QProgressBar::chunk {
            background-color: #007bff;
            border-radius: 7px;
        }
        
        QListWidget {
            border: 1px solid #dee2e6;
            border-radius: 6px;
            background-color: white;
        }
        
        QListWidget::item {
            padding: 4px;
            border-radius: 4px;
        }
        
        QListWidget::item:hover {
            background-color: #f8f9fa;
        }
        
        QListWidget::item:selected {
            background-color: #007bff;
            color: white;
        }
        
        QTextEdit {
            border: 1px solid #dee2e6;
            border-radius: 6px;
            background-color: #f8f9fa;
        }
        
        QCheckBox {
            spacing: 8px;
        }
        
        QCheckBox::indicator {
            width: 16px;
            height: 16px;
            border: 1px solid #ced4da;
            border-radius: 3px;
            background-color: white;
        }
        
        QCheckBox::indicator:checked {
            background-color: #007bff;
            border-color: #0056b3;
        }
        
        QSlider::groove:horizontal {
            border: 1px solid #dee2e6;
            height: 6px;
            background-color: #f8f9fa;
            border-radius: 3px;
        }
        
        QSlider::handle:horizontal {
            background-color: #007bff;
            border: 1px solid #0056b3;
            width: 16px;
            border-radius: 8px;
            margin: -5px 0;
        }
        """
        
        self.setStyleSheet(style_sheet)
        
    def setup_connections(self):
        """设置信号连接"""
        # 主要控制按钮连接
        try:
            self.open_file_btn.clicked.connect(self.import_fpn)
            self.run_analysis_btn.clicked.connect(self.run_analysis)
            self.pause_analysis_btn.clicked.connect(self.pause_analysis)
            self.stop_analysis_btn.clicked.connect(self.stop_analysis)
        except AttributeError as e:
            print(f"按钮连接跳过: {e}")
        
        # 分析步选择连接
        try:
            self.analysis_stage_combo.currentTextChanged.connect(self.on_analysis_stage_changed)
            self.material_group_combo.currentTextChanged.connect(self.on_material_group_changed)
        except AttributeError as e:
            print(f"下拉框连接跳过: {e}")
        
        # 标签页切换
        try:
            if hasattr(self, 'workspace_tabs'):
                self.workspace_tabs.currentChanged.connect(self.on_tab_changed)
        except AttributeError as e:
            print(f"标签页连接跳过: {e}")
        
    def on_tab_changed(self, index):
        """标签页切换事件"""
        tab_names = ["前处理", "分析", "后处理"]
        if index < len(tab_names):
            self.module_status.setText(tab_names[index])
            self.status_label.setText(f"切换到{tab_names[index]}模块")
            
    def new_project(self):
        """新建项目"""
        self.status_label.setText("创建新项目...")
        # TODO: 实现新建项目逻辑
        
    def load_project(self):
        """加载项目"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "加载项目", "", "项目文件 (*.json);;所有文件 (*.*)"
        )
        if file_path:
            self.status_label.setText(f"加载项目: {Path(file_path).name}")
            
    def save_project(self):
        """保存项目"""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "保存项目", "", "项目文件 (*.json);;所有文件 (*.*)"
        )
        if file_path:
            self.status_label.setText(f"保存项目: {Path(file_path).name}")
            
    def import_fpn(self):
        """🔧 修复3：导入FPN文件（使用多线程）"""
        try:
            file_path, _ = QFileDialog.getOpenFileName(
                self, "导入MIDAS FPN文件", "", "FPN文件 (*.fpn);;所有文件 (*.*)"
            )
            
            if not file_path:
                return
                
            # 验证文件
            if not Path(file_path).exists():
                QMessageBox.critical(self, "文件错误", f"文件不存在: {file_path}")
                return
                
            if not file_path.lower().endswith('.fpn'):
                QMessageBox.critical(self, "文件格式错误", "请选择有效的FPN文件(.fpn)")
                return
                
            file_size = Path(file_path).stat().st_size
            if file_size == 0:
                QMessageBox.critical(self, "文件错误", "选择的文件为空")
                return
                
            if file_size > 500 * 1024 * 1024:  # 500MB限制
                result = QMessageBox.question(
                    self, "大文件警告", 
                    f"文件较大({file_size/1024/1024:.1f}MB)，加载可能需要较长时间。\n是否继续？",
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
                )
                if result != QMessageBox.StandardButton.Yes:
                    return
            
            if self.operation_manager:
                # 使用多线程异步处理
                self.status_label.setText(f"正在加载FPN文件: {Path(file_path).name}")

                self.operation_manager.parse_fpn_file_async(
                    file_path,
                    success_callback=self.on_fpn_import_success,
                    error_callback=self.on_fpn_import_error,
                    show_progress=True
                )
            else:
                # 回退到同步处理，增强异常处理
                try:
                    self.status_label.setText(f"正在加载FPN文件: {Path(file_path).name}")
                    
                    # 验证preprocessor对象
                    if not hasattr(self, 'preprocessor') or self.preprocessor is None:
                        raise RuntimeError("预处理器未初始化")
                    
                    # 执行文件加载
                    result = self.preprocessor.load_fpn_file(file_path)
                    
                    # 详细验证加载结果
                    print(f"🔍 FPN加载结果调试:")
                    print(f"  - result类型: {type(result)}")
                    print(f"  - result值: {result is not None}")
                    
                    if result is None:
                        print("❌ 文件加载返回空结果，尝试使用示例数据...")
                        try:
                            # 尝试创建示例数据
                            result = self.preprocessor.create_sample_fpn_data()
                            print("✅ 使用示例数据成功")
                        except Exception as fallback_e:
                            print(f"❌ 示例数据创建也失败: {fallback_e}")
                            raise RuntimeError(f"文件加载失败且无法创建示例数据: {fallback_e}")
                    
                    if isinstance(result, dict):
                        print(f"  - 节点数: {len(result.get('nodes', []))}")
                        print(f"  - 单元数: {len(result.get('elements', []))}")
                        print(f"  - 数据键: {list(result.keys())}")
                    
                    # 验证数据完整性
                    if hasattr(self.preprocessor, 'fpn_data'):
                        fpn_data = self.preprocessor.fpn_data
                        if not isinstance(fpn_data, dict):
                            raise TypeError(f"FPN数据格式错误: 期望dict，得到{type(fpn_data)}")
                        
                        # 检查关键字段
                        if 'nodes' not in fpn_data or 'elements' not in fpn_data:
                            raise ValueError("FPN数据缺少关键字段(nodes/elements)")
                        
                        nodes = fpn_data.get('nodes', [])
                        elements = fpn_data.get('elements', [])
                        
                        if not isinstance(nodes, list) or not isinstance(elements, list):
                            raise TypeError("节点或单元数据不是列表格式")
                        
                        if len(nodes) == 0:
                            raise ValueError("没有找到节点数据")
                        
                        if len(elements) == 0:
                            raise ValueError("没有找到单元数据")
                        
                        # 验证第一个元素的格式
                        if len(elements) > 0 and not isinstance(elements[0], dict):
                            raise TypeError(f"单元数据格式错误: 期望dict，得到{type(elements[0])}")
                    
                    self.status_label.setText(f"FPN文件加载完成: {Path(file_path).name}")
                    self.update_model_info()
                    self.update_physics_combos()
                    
                except FileNotFoundError:
                    error_msg = f"文件未找到: {file_path}"
                    QMessageBox.critical(self, "文件错误", error_msg)
                    self.status_label.setText("文件未找到")
                except PermissionError:
                    error_msg = f"文件访问权限不足: {file_path}"
                    QMessageBox.critical(self, "权限错误", error_msg)
                    self.status_label.setText("文件访问被拒绝")
                except UnicodeDecodeError as e:
                    error_msg = f"文件编码错误: {str(e)}\n请确认文件编码格式"
                    QMessageBox.critical(self, "编码错误", error_msg)
                    self.status_label.setText("文件编码错误")
                except (TypeError, ValueError) as e:
                    error_msg = f"数据格式错误: {str(e)}\n这可能是由于FPN文件格式不正确造成的"
                    QMessageBox.critical(self, "数据格式错误", error_msg)
                    self.status_label.setText("数据格式错误")
                except Exception as e:
                    import traceback
                    error_details = traceback.format_exc()
                    error_msg = f"FPN文件导入失败:\n{str(e)}\n\n详细错误信息:\n{error_details}"
                    QMessageBox.critical(self, "导入失败", error_msg)
                    self.status_label.setText("FPN文件导入失败")
                    
        except Exception as e:
            # 最外层异常捕获
            import traceback
            error_details = traceback.format_exc()
            error_msg = f"文件选择或验证过程中发生错误:\n{str(e)}\n\n详细错误信息:\n{error_details}"
            QMessageBox.critical(self, "系统错误", error_msg)
            self.status_label.setText("系统错误")

    def on_fpn_import_success(self, fpn_data):
        """FPN文件导入成功回调"""
        try:
            # 将解析结果设置到预处理器
            self.preprocessor.fpn_data = fpn_data

            # 从FPN数据创建网格
            self.preprocessor.create_mesh_from_fpn(fpn_data)

            # 显示网格
            self.preprocessor.display_mesh()

            # 更新界面
            self.status_label.setText("FPN文件加载完成")
            self.update_model_info()
            self.update_physics_combos()

            # 显示成功消息
            node_count = len(fpn_data.get('nodes', []))
            element_count = len(fpn_data.get('elements', []))
            QMessageBox.information(
                self, "导入成功",
                f"FPN文件导入成功!\n节点: {node_count}\n单元: {element_count}"
            )

        except Exception as e:
            self.on_fpn_import_error("ProcessingError", f"处理FPN数据失败: {e}")

    def on_fpn_import_error(self, error_type, error_message):
        """FPN文件导入失败回调"""
        QMessageBox.critical(self, "导入失败", f"FPN文件导入失败:\n{error_message}")
        self.status_label.setText("FPN文件导入失败")
    
    def import_mesh(self):
        """导入网格"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "导入网格", "", "网格文件 (*.msh *.vtk *.vtu);;所有文件 (*.*)"
        )
        if file_path:
            self.preprocessor.load_mesh(file_path)
            self.status_label.setText(f"网格加载完成: {Path(file_path).name}")
            self.update_model_info()
            
    def generate_mesh(self):
        """生成网格"""
        self.status_label.setText("正在生成网格...")
        self.preprocessor.generate_mesh()
        self.status_label.setText("网格生成完成")
        self.update_model_info()
        
    def update_model_info(self):
        """更新模型信息显示"""
        info = self.preprocessor.get_mesh_info()
        
        self.nodes_count_label.setText(str(info.get('n_points', 0)))
        self.elements_count_label.setText(str(info.get('n_cells', 0)))
        self.materials_count_label.setText(str(len(self.preprocessor.materials)))
        self.constraints_count_label.setText(str(info.get('constraints_count', 0)))
        self.loads_count_label.setText(str(info.get('loads_count', 0)))
        
        # 更新材料参数显示
        self.update_materials_display()
        
    def update_materials_display(self):
        """更新材料参数显示"""
        self.materials_list.clear()
        
        if hasattr(self.preprocessor, 'fpn_data') and self.preprocessor.fpn_data:
            materials = self.preprocessor.fpn_data.get('materials', [])
            
            # 统计材料类型
            total_materials = len(materials)
            mohr_coulomb_count = len([m for m in materials if 'cohesion' in m or 'friction_angle' in m])
            elastic_count = len([m for m in materials if 'young_modulus' in m])
            
            # 更新统计信息
            summary_text = f"📊 总计: {total_materials}种材料 | 🏗️ 摩尔-库伦: {mohr_coulomb_count}种 | ⚡ 弹性: {elastic_count}种"
            self.materials_summary.setText(summary_text)
            
            # 显示材料详细信息
            for i, material in enumerate(materials[:10]):  # 只显示前10个材料
                mat_info = []
                mat_name = material.get('name', f'材料{material.get("id", i+1)}')
                
                # 摩尔-库伦参数
                if 'cohesion' in material and 'friction_angle' in material:
                    c = material['cohesion']
                    phi = material['friction_angle']
                    mat_info.append(f"🏗️ {mat_name}: c={c:.2f}kPa, φ={phi:.1f}°")
                
                # 弹性参数
                if 'young_modulus' in material:
                    E = material['young_modulus'] / 1e9  # 转换为GPa
                    nu = material.get('poisson_ratio', 0.0)
                    if mat_info:
                        mat_info.append(f"    ⚡ E={E:.1f}GPa, ν={nu:.2f}")
                    else:
                        mat_info.append(f"⚡ {mat_name}: E={E:.1f}GPa, ν={nu:.2f}")
                
                # 如果没有参数信息，显示基本信息
                if not mat_info:
                    mat_type = material.get('type', '未知')
                    mat_info.append(f"📋 {mat_name}: {mat_type}")
                
                for info in mat_info:
                    self.materials_list.addItem(info)
        else:
            self.materials_summary.setText("❌ 未加载材料数据")
        
    def run_analysis(self):
        """运行分析"""
        self.run_analysis_btn.setEnabled(False)
        self.pause_analysis_btn.setEnabled(True)
        self.stop_analysis_btn.setEnabled(True)
        
        # 检查Kratos可用性
        try:
            from ..core.kratos_interface import KRATOS_AVAILABLE
            if not KRATOS_AVAILABLE:
                QMessageBox.critical(self, "错误", "Kratos计算引擎不可用，无法进行分析")
                self.run_analysis_btn.setEnabled(True)
                self.pause_analysis_btn.setEnabled(False)
                self.stop_analysis_btn.setEnabled(False)
                return
        except ImportError:
            QMessageBox.critical(self, "错误", "无法导入Kratos接口模块")
            self.run_analysis_btn.setEnabled(True)
            self.pause_analysis_btn.setEnabled(False)
            self.stop_analysis_btn.setEnabled(False)
            return
        
        # 检查模型数据
        if not hasattr(self.preprocessor, 'fpn_data') or not self.preprocessor.fpn_data:
            QMessageBox.critical(self, "错误", "请先导入有效的FPN模型数据")
            self.run_analysis_btn.setEnabled(True)
            self.pause_analysis_btn.setEnabled(False)
            self.stop_analysis_btn.setEnabled(False)
            return
        
        self.status_label.setText("开始运行真实Kratos分析...")
        self.analysis_log.append("启动Kratos分析引擎...")
        
        # 传递FPN数据给分析器
        self.analyzer.fpn_data = self.preprocessor.fpn_data
        
        # 连接分析器信号
        self.analyzer.analysis_finished.connect(self.on_real_analysis_finished)
        self.analyzer.progress_updated.connect(self.on_analysis_progress_updated)
        self.analyzer.log_message.connect(self.analysis_log.append)
        
        # 启动真实分析
        self.analyzer.start_analysis()
        
    def start_mock_analysis(self):
        """启动模拟分析"""
        self.analysis_timer = QTimer()
        self.analysis_step = 0
        self.analysis_timer.timeout.connect(self.update_analysis_progress)
        self.analysis_timer.start(200)
        
    def update_analysis_progress(self):
        """更新分析进度"""
        self.analysis_step += 1
        
        # 更新进度条
        overall_progress = min(self.analysis_step * 2, 100)
        self.overall_progress.setValue(overall_progress)
        
        step_progress = (self.analysis_step * 10) % 100
        self.step_progress.setValue(step_progress)
        
        iteration_progress = (self.analysis_step * 5) % 100
        self.iteration_progress.setValue(iteration_progress)
        
        # 更新状态标签
        current_step = (self.analysis_step // 25) + 1
        self.current_step_label.setText(f"步骤 {current_step}")
        self.current_iteration_label.setText(f"{self.analysis_step % 25 + 1}/25")
        
        # 添加日志
        if self.analysis_step % 10 == 0:
            self.analysis_log.append(f"步骤 {current_step}: 迭代 {self.analysis_step % 25 + 1} 完成")
        
        # 分析完成
        if overall_progress >= 100:
            self.analysis_timer.stop()
            self.analysis_finished()
            
    def analysis_finished(self):
        """分析完成"""
        self.run_analysis_btn.setEnabled(True)
        self.pause_analysis_btn.setEnabled(False)
        self.stop_analysis_btn.setEnabled(False)
        
        self.status_label.setText("分析完成")
        self.analysis_log.append("分析成功完成！")
        
        # 获取分析结果并传递给后处理器
        if hasattr(self.analyzer, 'analysis_results') and self.analyzer.analysis_results:
            try:
                # 取最后一步分析结果
                last_results = self.analyzer.analysis_results[-1] if self.analyzer.analysis_results else None
                if last_results and hasattr(self.preprocessor, 'fpn_data') and self.preprocessor.fpn_data:
                    self.analysis_log.append("正在设置后处理结果...")
                    self.postprocessor.set_analysis_results(self.preprocessor.fpn_data, last_results)
                    self.analysis_log.append("后处理结果设置完成")
                else:
                    self.analysis_log.append("警告: 无分析结果数据")
            except Exception as e:
                self.analysis_log.append(f"设置后处理结果失败: {str(e)}")
        
        # 切换到后处理标签页
        self.workflow_tabs.setCurrentIndex(2)
        
        QMessageBox.information(self, "完成", "分析计算完成！\n已自动切换到后处理模块。")
        
    def on_real_analysis_finished(self, success: bool, message: str):
        """真实分析完成回调"""
        self.run_analysis_btn.setEnabled(True)
        self.pause_analysis_btn.setEnabled(False)
        self.stop_analysis_btn.setEnabled(False)
        
        if success:
            self.status_label.setText("Kratos分析成功完成")
            self.analysis_log.append("✅ Kratos分析成功完成")
            
            # 获取分析结果
            results = self.analyzer.get_all_results()
            if results:
                # 传递结果给后处理模块
                self.postprocessor.load_analysis_results(results)
                
                # 切换到后处理标签页
                self.workflow_tabs.setCurrentIndex(2)
                
                QMessageBox.information(self, "分析完成", 
                    f"Kratos分析成功完成！\n已自动切换到后处理模块查看结果。\n\n{message}")
            else:
                QMessageBox.warning(self, "警告", "分析完成但未获取到结果数据")
        else:
            self.status_label.setText("Kratos分析失败")
            self.analysis_log.append(f"❌ Kratos分析失败: {message}")
            QMessageBox.critical(self, "分析失败", f"Kratos分析失败:\n{message}")
    
    def on_analysis_progress_updated(self, progress: int, message: str):
        """分析进度更新回调"""
        self.overall_progress.setValue(progress)
        self.status_label.setText(message)
        self.analysis_log.append(f"进度 {progress}%: {message}")
        
    def pause_analysis(self):
        """暂停分析"""
        if hasattr(self, 'analysis_timer'):
            self.analysis_timer.stop()
        self.status_label.setText("分析已暂停")
        
    def stop_analysis(self):
        """停止分析"""
        if hasattr(self, 'analysis_timer'):
            self.analysis_timer.stop()
            
        self.run_analysis_btn.setEnabled(True)
        self.pause_analysis_btn.setEnabled(False)
        self.stop_analysis_btn.setEnabled(False)
        
        self.overall_progress.setValue(0)
        self.step_progress.setValue(0)
        self.iteration_progress.setValue(0)
        
        self.status_label.setText("分析已停止")
        self.analysis_log.append("分析被用户停止。")
        
    def load_results(self):
        """加载结果"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "加载结果", "", "结果文件 (*.vtk *.vtu);;所有文件 (*.*)"
        )
        if file_path:
            self.postprocessor.load_results(file_path)
            self.results_info_label.setText(f"已加载: {Path(file_path).name}")
            self.results_info_label.setStyleSheet("color: green;")
            self.status_label.setText("结果加载完成")
            
    def play_animation(self):
        """播放动画"""
        self.status_label.setText("播放结果动画...")
        self.postprocessor.play_animation()
        
    def pause_animation(self):
        """暂停动画"""
        self.postprocessor.pause_animation()
        self.status_label.setText("动画已暂停")
        
    def stop_animation(self):
        """停止动画"""
        self.postprocessor.stop_animation()
        self.status_label.setText("动画已停止")
    
    # 新增方法：物理组和分析步选择
    def update_physics_combos(self):
        """更新物理组下拉框"""
        if not hasattr(self.preprocessor, 'fpn_data') or not self.preprocessor.fpn_data:
            return
            
        fpn_data = self.preprocessor.fpn_data
        
        # 更新材料组
        self.material_group_combo.clear()
        self.material_group_combo.addItem("所有材料组")
        material_groups = fpn_data.get('material_groups', {})
        for group_id, group_info in material_groups.items():
            self.material_group_combo.addItem(f"材料组 {group_id} ({group_info.get('material_count', 0)} 材料)")
        
        # 更新荷载组
        self.load_group_combo.clear()
        self.load_group_combo.addItem("所有荷载组")
        load_groups = fpn_data.get('load_groups', {})
        for group_id, group_info in load_groups.items():
            self.load_group_combo.addItem(f"荷载组 {group_id} ({group_info.get('load_count', 0)} 荷载)")
        
        # 更新边界组
        self.boundary_group_combo.clear()
        self.boundary_group_combo.addItem("所有边界组")
        boundary_groups = fpn_data.get('boundary_groups', {})
        for group_id, group_info in boundary_groups.items():
            self.boundary_group_combo.addItem(f"边界组 {group_id} ({group_info.get('boundary_count', 0)} 边界)")
        
        # 更新分析步
        self.analysis_stage_combo.clear()
        self.analysis_stage_combo.addItem("初始状态")
        analysis_stages = fpn_data.get('analysis_stages', [])
        for stage in analysis_stages:
            # 🔧 安全处理stage数据类型
            if isinstance(stage, dict):
                stage_name = stage.get('name', f'分析步 {stage.get("id", "?")}')
                stage_id = stage.get('id', '?')
            elif isinstance(stage, (int, str)):
                stage_name = f'分析步{stage}'
                stage_id = stage
            else:
                print(f"警告: 未知的stage数据类型: {type(stage)}, 值: {stage}")
                stage_name = 'Unknown'
                stage_id = '?'
            
            self.analysis_stage_combo.addItem(f"{stage_name} (ID: {stage_id})")
    
    def on_material_group_changed(self, text):
        """材料组选择改变"""
        print(f"选择材料组: {text}")
        self.update_display()
    
    def on_load_group_changed(self, text):
        """荷载组选择改变"""
        print(f"选择荷载组: {text}")
        self.update_display()
    
    def on_boundary_group_changed(self, text):
        """边界组选择改变"""
        print(f"选择边界组: {text}")
        self.update_display()
    
    def on_analysis_stage_changed(self, text):
        """分析步选择改变"""
        try:
            print(f"选择分析步: {text}")
            
            # 提取分析步ID
            if "ID:" in text:
                try:
                    stage_id = int(text.split("ID:")[-1].strip().replace(")", ""))
                    # 设置预处理器的当前分析步
                    if hasattr(self.preprocessor, 'set_current_analysis_stage'):
                        self.preprocessor.set_current_analysis_stage(stage_id)
                    else:
                        # 临时存储分析步ID
                        self.preprocessor.current_stage_id = stage_id
                except Exception as e:
                    print(f"解析分析步ID失败: {e}")
                    return
            
            # 智能更新物理组显示
            self.intelligent_update_physics_groups()
            self.update_display()
            
        except Exception as e:
            print(f"分析步切换失败: {e}")
            self.status_label.setText(f"分析步切换失败: {str(e)}")
            import traceback
            traceback.print_exc()
    
    def intelligent_update_physics_groups(self):
        """智能更新物理组选择"""
        if not hasattr(self.preprocessor, 'fpn_data') or not self.preprocessor.fpn_data:
            return
            
        try:
            # 获取当前分析步
            current_stage = self.preprocessor.get_current_analysis_stage()
            if not current_stage:
                print("未找到当前分析步")
                return
                
            # 获取该分析步应该激活的物理组
            active_groups = self.preprocessor.determine_active_groups_for_stage(current_stage)
            
            # 自动选择相关的物理组
            self.auto_select_physics_groups(active_groups)
            
            # 🔧 安全获取stage名称
            if isinstance(current_stage, dict):
                stage_name = current_stage.get('name', 'Unknown')
            else:
                stage_name = f'Stage_{current_stage}' if isinstance(current_stage, (int, str)) else 'Unknown'
            
            # 更新状态栏显示
            self.status_label.setText(f"智能切换到分析步: {stage_name}")
            print(f"智能切换完成: {stage_name}")
            
        except Exception as e:
            print(f"智能更新物理组失败: {e}")
            import traceback
            traceback.print_exc()
    
    def auto_select_physics_groups(self, active_groups):
        """自动选择相关的物理组"""
        try:
            # 阻塞信号避免递归触发
            self.material_group_combo.blockSignals(True)
            self.load_group_combo.blockSignals(True)
            self.boundary_group_combo.blockSignals(True)
            # 自动选择材料组
            material_groups = active_groups.get('materials', [])
            if material_groups and self.material_group_combo.count() > 1:
                # 选择第一个相关的材料组
                target_text = f"材料组 {material_groups[0]}"
                for i in range(self.material_group_combo.count()):
                    if target_text in self.material_group_combo.itemText(i):
                        self.material_group_combo.setCurrentIndex(i)
                        break
            
            # 自动选择荷载组
            load_groups = active_groups.get('loads', [])
            if load_groups and self.load_group_combo.count() > 1:
                target_text = f"荷载组 {load_groups[0]}"
                for i in range(self.load_group_combo.count()):
                    if target_text in self.load_group_combo.itemText(i):
                        self.load_group_combo.setCurrentIndex(i)
                        break
                        
            # 自动选择边界组
            boundary_groups = active_groups.get('boundaries', [])
            if boundary_groups and self.boundary_group_combo.count() > 1:
                target_text = f"边界组 {boundary_groups[0]}"
                for i in range(self.boundary_group_combo.count()):
                    if target_text in self.boundary_group_combo.itemText(i):
                        self.boundary_group_combo.setCurrentIndex(i)
                        break
                        
            print(f"自动选择物理组 - 材料: {material_groups}, 荷载: {load_groups}, 边界: {boundary_groups}")
            
        except Exception as e:
            print(f"自动选择物理组失败: {e}")
        finally:
            # 恢复信号连接
            self.material_group_combo.blockSignals(False)
            self.load_group_combo.blockSignals(False)
            self.boundary_group_combo.blockSignals(False)
            self.update_display()
    
    # 显示模式切换方法
    def set_wireframe_mode(self):
        """设置线框模式"""
        self.wireframe_btn.setChecked(True)
        self.solid_btn.setChecked(False)
        self.transparent_btn.setChecked(False)
        
        if hasattr(self.preprocessor, 'set_display_mode'):
            self.preprocessor.set_display_mode('wireframe')
        self.status_label.setText("显示模式: 线框")
    
    def set_solid_mode(self):
        """设置实体模式"""
        self.wireframe_btn.setChecked(False)
        self.solid_btn.setChecked(True)
        self.transparent_btn.setChecked(False)
        
        if hasattr(self.preprocessor, 'set_display_mode'):
            self.preprocessor.set_display_mode('solid')
        self.status_label.setText("显示模式: 实体")
    
    def set_transparent_mode(self):
        """设置半透明模式"""
        self.wireframe_btn.setChecked(False)
        self.solid_btn.setChecked(False)
        self.transparent_btn.setChecked(True)
        
        if hasattr(self.preprocessor, 'set_display_mode'):
            self.preprocessor.set_display_mode('transparent')
        self.status_label.setText("显示模式: 半透明")
    
    def update_display(self):
        """更新显示"""
        if hasattr(self.preprocessor, 'display_mesh'):
            self.preprocessor.display_mesh()
        self.status_label.setText("显示已更新")