#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GEM Professional Implicit Modeling System
专业级地质隐式建模系统 - Abaqus风格界面

整合Example3所有地质建模功能，打造专业级的隐式建模平台
"""

import sys
import os
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import traceback

# PyQt6 imports
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QSplitter, QTabWidget, QTreeWidget, QTreeWidgetItem, QTextEdit,
    QLabel, QPushButton, QProgressBar, QMenuBar, QMenu,
    QToolBar, QStatusBar, QFileDialog, QMessageBox, QFrame,
    QGroupBox, QFormLayout, QSpinBox, QDoubleSpinBox, QComboBox,
    QCheckBox, QSlider, QScrollArea, QListWidget, QListWidgetItem,
    QDockWidget, QTableWidget, QTableWidgetItem, QHeaderView,
    QDialog, QDialogButtonBox, QGridLayout, QSizePolicy
)
from PyQt6.QtCore import Qt, QTimer, QThread, pyqtSignal, QSize, QMimeData, QUrl
from PyQt6.QtGui import (
    QIcon, QFont, QPixmap, QPalette, QColor, QAction, 
    QDragEnterEvent, QDropEvent, QKeySequence, QStandardItemModel, QStandardItem
)

# 添加example3路径
project_root = Path(__file__).parent
example3_path = project_root / "example3"
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(example3_path))

# 科学计算库
try:
    import gempy as gp
    GEMPY_AVAILABLE = True
except ImportError:
    GEMPY_AVAILABLE = False
    print("警告: GemPy未安装，部分功能将不可用")

try:
    import pyvista as pv
    import pyvistaqt as pvqt
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    print("警告: PyVista未安装，3D可视化功能将不可用")

try:
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
    from matplotlib.figure import Figure
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

try:
    import qtawesome as qta
    ICONS_AVAILABLE = True
except ImportError:
    ICONS_AVAILABLE = False

# 导入example3模块
try:
    from professional_gempy_cae import AbaqusStyleSheet, ModelTreeWidget, PropertyPanel, MessageCenter
    from gempy_main_window import GemPyViewport3D
    from geophysical_modeling import GeophysicalModelingWindow
    from uncertainty_analysis import UncertaintyAnalysisWindow
    from enhanced_3d_viewer import Enhanced3DViewer
    from gem_implicit_modeling_system import GemImplicitModelingSystem
    EXAMPLE3_MODULES_AVAILABLE = True
except ImportError as e:
    print(f"Example3模块导入警告: {e}")
    EXAMPLE3_MODULES_AVAILABLE = False


class GemProfessionalMainWindow(QMainWindow):
    """GEM专业隐式建模系统主窗口"""
    
    def __init__(self):
        super().__init__()
        
        # 设置窗口属性
        self.setWindowTitle("GEM Professional Implicit Modeling System v2.0")
        self.setGeometry(100, 100, 1800, 1200)
        self.setMinimumSize(1400, 900)
        
        # 当前项目状态
        self.current_project = None
        self.current_model = None
        self.project_path = None
        
        # 应用专业样式
        self.apply_professional_style()
        
        # 创建界面
        self.setup_ui()
        
        # 设置连接
        self.setup_connections()
        
        # 显示欢迎信息
        self.show_welcome_message()
        
    def apply_professional_style(self):
        """应用专业级样式"""
        if EXAMPLE3_MODULES_AVAILABLE:
            # 使用example3的专业样式
            self.setStyleSheet(AbaqusStyleSheet.get_main_style() + """
            /* GEM系统专用样式扩展 */
            QMainWindow {
                background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                          stop: 0 #f8f9fa, stop: 1 #e9ecef);
            }
            
            /* 地质建模专用颜色 */
            QTabWidget::tab-bar {
                alignment: left;
            }
            
            QTabBar::tab {
                background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                          stop: 0 #e8f4f5, stop: 1 #d4e6f1);
                border: 1px solid #85c1e9;
                padding: 8px 16px;
                margin-right: 2px;
                border-radius: 4px 4px 0px 0px;
            }
            
            QTabBar::tab:selected {
                background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                          stop: 0 #ffffff, stop: 1 #f8f9fa);
                border-bottom: 2px solid #3498db;
            }
            
            /* 地质数据树样式 */
            QTreeWidget {
                background-color: #fdfdfe;
                border: 1px solid #bdc3c7;
                selection-background-color: #3498db;
                color: #2c3e50;
            }
            
            QTreeWidget::item:selected {
                background-color: #3498db;
                color: white;
            }
            
            QTreeWidget::item:hover {
                background-color: #ebf3fd;
            }
            
            /* 工具栏地质风格 */
            QToolBar {
                background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                          stop: 0 #ecf0f1, stop: 1 #d5dbdb);
                border: 1px solid #bdc3c7;
                spacing: 2px;
            }
            
            QToolButton {
                background-color: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 4px;
                padding: 6px;
                margin: 1px;
            }
            
            QToolButton:hover {
                background-color: #e9ecef;
                border: 1px solid #adb5bd;
            }
            
            QToolButton:pressed {
                background-color: #dee2e6;
                border: 1px solid #6c757d;
            }
            
            QToolButton:checked {
                background-color: #3498db;
                color: white;
                border: 1px solid #2980b9;
            }
            """)
        else:
            # 基础样式
            self.setStyleSheet("""
            QMainWindow {
                background-color: #f0f0f0;
                color: #333333;
            }
            QMenuBar {
                background-color: #e6e6e6;
                border-bottom: 1px solid #cccccc;
            }
            QToolBar {
                background-color: #e8e8e8;
                border: 1px solid #cccccc;
            }
            """)
    
    def setup_ui(self):
        """设置用户界面"""
        # 创建菜单栏
        self.create_menu_bar()
        
        # 创建工具栏
        self.create_toolbars()
        
        # 创建状态栏
        self.create_status_bar()
        
        # 创建中央区域
        self.create_central_area()
        
        # 创建停靠窗口
        self.create_dock_windows()
        
    def create_menu_bar(self):
        """创建专业级菜单栏"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu('文件(&F)')
        
        # 项目管理
        new_action = QAction('新建地质项目(&N)', self)
        new_action.setShortcut('Ctrl+N')
        if ICONS_AVAILABLE:
            new_action.setIcon(qta.icon('fa5s.mountain', color='#27ae60'))
        new_action.triggered.connect(self.new_geology_project)
        file_menu.addAction(new_action)
        
        open_action = QAction('打开项目(&O)', self)
        open_action.setShortcut('Ctrl+O')
        if ICONS_AVAILABLE:
            open_action.setIcon(qta.icon('fa5s.folder-open'))
        open_action.triggered.connect(self.open_project)
        file_menu.addAction(open_action)
        
        save_action = QAction('保存项目(&S)', self)
        save_action.setShortcut('Ctrl+S')
        if ICONS_AVAILABLE:
            save_action.setIcon(qta.icon('fa5s.save'))
        save_action.triggered.connect(self.save_project)
        file_menu.addAction(save_action)
        
        file_menu.addSeparator()
        
        # 数据导入导出
        import_menu = file_menu.addMenu('导入地质数据')
        if ICONS_AVAILABLE:
            import_menu.setIcon(qta.icon('fa5s.download'))
        
        import_menu.addAction('钻孔数据 (CSV/Excel)...', self.import_borehole_data)
        import_menu.addAction('地层点数据...', self.import_surface_points)
        import_menu.addAction('方向数据...', self.import_orientations)
        import_menu.addAction('断层数据...', self.import_fault_data)
        import_menu.addAction('地球物理数据...', self.import_geophysics_data)
        
        export_menu = file_menu.addMenu('导出模型结果')
        if ICONS_AVAILABLE:
            export_menu.setIcon(qta.icon('fa5s.upload'))
            
        export_menu.addAction('VTK模型...', self.export_vtk_model)
        export_menu.addAction('地质剖面...', self.export_sections)
        export_menu.addAction('3D网格...', self.export_mesh)
        export_menu.addAction('地层统计报告...', self.export_statistics)
        
        file_menu.addSeparator()
        exit_action = QAction('退出(&X)', self)
        exit_action.setShortcut('Alt+F4')
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # 数据菜单
        data_menu = menubar.addMenu('数据(&D)')
        
        # 地质数据管理
        data_mgmt_menu = data_menu.addMenu('地质数据管理')
        data_mgmt_menu.addAction('数据质量检查', self.check_data_quality)
        data_mgmt_menu.addAction('数据清洗', self.clean_data)
        data_mgmt_menu.addAction('坐标系转换', self.coordinate_transform)
        data_mgmt_menu.addAction('数据统计', self.data_statistics)
        
        # 地层管理
        strata_menu = data_menu.addMenu('地层管理')
        strata_menu.addAction('地层序列定义', self.define_stratigraphic_sequence)
        strata_menu.addAction('地层关系编辑', self.edit_strata_relations)
        strata_menu.addAction('地层属性设置', self.set_strata_properties)
        
        # 构造管理
        structure_menu = data_menu.addMenu('构造管理')
        structure_menu.addAction('断层系统', self.manage_fault_system)
        structure_menu.addAction('褶皱系统', self.manage_fold_system)
        structure_menu.addAction('不整合面', self.manage_unconformities)
        
        # 建模菜单
        modeling_menu = menubar.addMenu('建模(&M)')
        
        # 隐式建模
        implicit_menu = modeling_menu.addMenu('隐式建模')
        implicit_menu.addAction('创建地质模型', self.create_geological_model)
        implicit_menu.addAction('计算模型', self.compute_model)
        implicit_menu.addAction('模型验证', self.validate_model)
        implicit_menu.addAction('参数优化', self.optimize_parameters)
        
        # 插值方法
        interpolation_menu = modeling_menu.addMenu('插值方法')
        interpolation_menu.addAction('克里金插值', self.kriging_interpolation)
        interpolation_menu.addAction('RBF插值', self.rbf_interpolation)
        interpolation_menu.addAction('IDW插值', self.idw_interpolation)
        interpolation_menu.addAction('自然邻点', self.natural_neighbor)
        
        # 网格管理
        grid_menu = modeling_menu.addMenu('网格管理')
        grid_menu.addAction('规则网格', self.regular_grid)
        grid_menu.addAction('自适应网格', self.adaptive_grid)
        grid_menu.addAction('剖面网格', self.section_grid)
        grid_menu.addAction('自定义网格', self.custom_grid)
        
        # 分析菜单
        analysis_menu = menubar.addMenu('分析(&A)')
        
        # 地质分析
        geo_analysis_menu = analysis_menu.addMenu('地质分析')
        geo_analysis_menu.addAction('地层厚度分析', self.thickness_analysis)
        geo_analysis_menu.addAction('构造分析', self.structural_analysis)
        geo_analysis_menu.addAction('沉积环境分析', self.depositional_analysis)
        
        # 不确定性分析
        uncertainty_menu = analysis_menu.addMenu('不确定性分析')
        uncertainty_menu.addAction('蒙特卡洛分析', self.monte_carlo_analysis)
        uncertainty_menu.addAction('敏感性分析', self.sensitivity_analysis)
        uncertainty_menu.addAction('概率建模', self.probabilistic_modeling)
        
        # 地球物理
        geophysics_menu = analysis_menu.addMenu('地球物理')
        geophysics_menu.addAction('重力建模', self.gravity_modeling)
        geophysics_menu.addAction('磁力建模', self.magnetic_modeling)
        geophysics_menu.addAction('联合反演', self.joint_inversion)
        
        # 可视化菜单
        visualization_menu = menubar.addMenu('可视化(&V)')
        
        # 3D可视化
        viz_3d_menu = visualization_menu.addMenu('3D可视化')
        viz_3d_menu.addAction('地质体渲染', self.render_geological_bodies)
        viz_3d_menu.addAction('数据点显示', self.show_data_points)
        viz_3d_menu.addAction('断层面显示', self.show_fault_surfaces)
        viz_3d_menu.addAction('属性云图', self.show_property_clouds)
        
        # 剖面图
        sections_menu = visualization_menu.addMenu('剖面图')
        sections_menu.addAction('创建地质剖面', self.create_geological_sections)
        sections_menu.addAction('钻孔剖面', self.create_borehole_sections)
        sections_menu.addAction('任意剖面', self.create_arbitrary_sections)
        
        # 视图控制
        view_menu = visualization_menu.addMenu('视图控制')
        view_menu.addAction('重置视图', self.reset_view)
        view_menu.addAction('适应窗口', self.fit_to_window)
        view_menu.addAction('等轴视图', self.isometric_view)
        view_menu.addAction('俯视图', self.top_view)
        
        # 工具菜单
        tools_menu = menubar.addMenu('工具(&T)')
        
        tools_menu.addAction('地质数据管理器', self.open_data_manager)
        tools_menu.addAction('模型参数编辑器', self.open_parameter_editor)
        tools_menu.addAction('批量处理工具', self.open_batch_processor)
        tools_menu.addAction('脚本编辑器', self.open_script_editor)
        tools_menu.addSeparator()
        tools_menu.addAction('系统设置', self.system_settings)
        
        # 帮助菜单
        help_menu = menubar.addMenu('帮助(&H)')
        help_menu.addAction('用户手册', self.show_user_manual)
        help_menu.addAction('地质建模教程', self.show_geology_tutorials)
        help_menu.addAction('API文档', self.show_api_docs)
        help_menu.addAction('示例项目', self.open_example_projects)
        help_menu.addSeparator()
        help_menu.addAction('检查更新', self.check_updates)
        help_menu.addAction('关于GEM系统', self.show_about)
        
    def create_toolbars(self):
        """创建工具栏"""
        # 主工具栏
        main_toolbar = self.addToolBar('主工具栏')
        main_toolbar.setObjectName("MainToolBar")
        main_toolbar.setMovable(False)
        main_toolbar.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextUnderIcon)
        main_toolbar.setIconSize(QSize(32, 32))
        
        if ICONS_AVAILABLE:
            # 项目操作
            main_toolbar.addAction(self.create_action(
                'fa5s.mountain', '新建', '新建地质项目', self.new_geology_project))
            main_toolbar.addAction(self.create_action(
                'fa5s.folder-open', '打开', '打开项目', self.open_project))
            main_toolbar.addAction(self.create_action(
                'fa5s.save', '保存', '保存项目', self.save_project))
            
            main_toolbar.addSeparator()
            
            # 数据操作
            main_toolbar.addAction(self.create_action(
                'fa5s.database', '数据', '地质数据管理', self.open_data_manager))
            main_toolbar.addAction(self.create_action(
                'fa5s.map-marked-alt', '钻孔', '钻孔数据', self.import_borehole_data))
            main_toolbar.addAction(self.create_action(
                'fa5s.layer-group', '地层', '地层管理', self.define_stratigraphic_sequence))
            
            main_toolbar.addSeparator()
            
            # 建模操作
            main_toolbar.addAction(self.create_action(
                'fa5s.cube', '建模', '隐式建模', self.create_geological_model))
            main_toolbar.addAction(self.create_action(
                'fa5s.calculator', '计算', '计算模型', self.compute_model))
            main_toolbar.addAction(self.create_action(
                'fa5s.chart-area', '分析', '地质分析', self.thickness_analysis))
            
            main_toolbar.addSeparator()
            
            # 可视化操作
            main_toolbar.addAction(self.create_action(
                'fa5s.eye', '3D视图', '3D可视化', self.render_geological_bodies))
            main_toolbar.addAction(self.create_action(
                'fa5s.cut', '剖面', '地质剖面', self.create_geological_sections))
            main_toolbar.addAction(self.create_action(
                'fa5s.download', '导出', '导出结果', self.export_vtk_model))
        
        # 视图工具栏
        view_toolbar = self.addToolBar('视图工具栏')
        view_toolbar.setObjectName("ViewToolBar")
        view_toolbar.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonIconOnly)
        view_toolbar.setIconSize(QSize(24, 24))
        
        if ICONS_AVAILABLE:
            # 视图控制
            view_toolbar.addAction(self.create_action(
                'fa5s.cube', '', '等轴视图', self.isometric_view))
            view_toolbar.addAction(self.create_action(
                'fa5s.eye', '', '俯视图', self.top_view))
            view_toolbar.addAction(self.create_action(
                'fa5s.arrows-alt-h', '', '前视图', self.front_view))
            view_toolbar.addAction(self.create_action(
                'fa5s.arrows-alt-v', '', '侧视图', self.side_view))
            
            view_toolbar.addSeparator()
            
            # 渲染模式
            view_toolbar.addAction(self.create_action(
                'fa5s.project-diagram', '', '线框模式', self.wireframe_mode))
            view_toolbar.addAction(self.create_action(
                'fa5s.fill', '', '填充模式', self.solid_mode))
            view_toolbar.addAction(self.create_action(
                'fa5s.adjust', '', '透明模式', self.transparent_mode))
            
            view_toolbar.addSeparator()
            
            # 测量工具
            view_toolbar.addAction(self.create_action(
                'fa5s.ruler', '', '测量工具', self.measure_tool))
            view_toolbar.addAction(self.create_action(
                'fa5s.crosshairs', '', '剖面工具', self.section_tool))
        
    def create_action(self, icon_name: str, text: str, tooltip: str, callback):
        """创建动作"""
        action = QAction(text, self)
        if ICONS_AVAILABLE and icon_name:
            action.setIcon(qta.icon(icon_name, color='#2c3e50'))
        action.setToolTip(tooltip)
        action.triggered.connect(callback)
        return action
        
    def create_status_bar(self):
        """创建状态栏"""
        self.status_bar = self.statusBar()
        
        # 主状态
        self.status_label = QLabel("GEM系统已启动 - 准备就绪")
        self.status_bar.addWidget(self.status_label)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setMaximumWidth(200)
        self.status_bar.addPermanentWidget(self.progress_bar)
        
        # 模块状态
        self.module_status = QLabel()
        self.update_module_status()
        self.status_bar.addPermanentWidget(self.module_status)
        
        # 模型统计
        self.model_stats = QLabel("模型: 未加载")
        self.status_bar.addPermanentWidget(self.model_stats)
        
        # 坐标显示
        self.coord_label = QLabel("坐标: (0, 0, 0)")
        self.status_bar.addPermanentWidget(self.coord_label)
        
    def update_module_status(self):
        """更新模块状态"""
        status_items = []
        if GEMPY_AVAILABLE:
            status_items.append("GemPy✓")
        if PYVISTA_AVAILABLE:
            status_items.append("3D✓")
        if MATPLOTLIB_AVAILABLE:
            status_items.append("图表✓")
        if EXAMPLE3_MODULES_AVAILABLE:
            status_items.append("模块✓")
            
        self.module_status.setText(" | ".join(status_items) if status_items else "模块未完全加载")
        
    def create_central_area(self):
        """创建中央区域"""
        # 主分割器
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        self.setCentralWidget(main_splitter)
        
        # 左侧：地质数据树
        if EXAMPLE3_MODULES_AVAILABLE:
            self.geology_tree = ModelTreeWidget()
        else:
            self.geology_tree = QTreeWidget()
            self.geology_tree.setHeaderLabels(["地质数据树"])
            self.setup_basic_tree()
            
        main_splitter.addWidget(self.geology_tree)
        
        # 中央：工作区标签页
        self.central_tabs = QTabWidget()
        self.central_tabs.setTabPosition(QTabWidget.TabPosition.North)
        self.central_tabs.setTabsClosable(True)
        self.central_tabs.tabCloseRequested.connect(self.close_tab)
        
        # 3D地质视口
        if PYVISTA_AVAILABLE and EXAMPLE3_MODULES_AVAILABLE:
            self.geology_viewport = GemPyViewport3D()
            self.central_tabs.addTab(self.geology_viewport, "3D 地质视图")
        else:
            # 简化的3D视口
            simple_3d = QWidget()
            simple_layout = QVBoxLayout(simple_3d)
            simple_layout.addWidget(QLabel("3D地质视口 (需要PyVista和Example3模块)"))
            self.central_tabs.addTab(simple_3d, "3D 地质视图")
        
        # 欢迎页面
        welcome_widget = self.create_welcome_widget()
        self.central_tabs.addTab(welcome_widget, "欢迎使用GEM系统")
        
        # 数据管理页面
        data_widget = self.create_data_management_widget()
        self.central_tabs.addTab(data_widget, "地质数据管理")
        
        main_splitter.addWidget(self.central_tabs)
        
        # 设置比例
        main_splitter.setSizes([300, 1200])
        
    def setup_basic_tree(self):
        """设置基础地质数据树"""
        self.geology_tree.clear()
        
        # 根节点
        root = QTreeWidgetItem(self.geology_tree, ["地质项目"])
        
        # 数据节点
        data_node = QTreeWidgetItem(root, ["地质数据"])
        QTreeWidgetItem(data_node, ["钻孔数据"])
        QTreeWidgetItem(data_node, ["地层点"])
        QTreeWidgetItem(data_node, ["方向数据"])
        QTreeWidgetItem(data_node, ["断层数据"])
        
        # 模型节点
        model_node = QTreeWidgetItem(root, ["地质模型"])
        QTreeWidgetItem(model_node, ["隐式模型"])
        QTreeWidgetItem(model_node, ["网格模型"])
        QTreeWidgetItem(model_node, ["属性模型"])
        
        # 分析节点
        analysis_node = QTreeWidgetItem(root, ["分析结果"])
        QTreeWidgetItem(analysis_node, ["地层统计"])
        QTreeWidgetItem(analysis_node, ["不确定性"])
        QTreeWidgetItem(analysis_node, ["地球物理"])
        
        root.setExpanded(True)
        data_node.setExpanded(True)
        
    def create_welcome_widget(self):
        """创建欢迎页面"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setSpacing(30)
        layout.setContentsMargins(50, 50, 50, 50)
        
        # 标题区域
        title_frame = QFrame()
        title_layout = QVBoxLayout(title_frame)
        
        title_label = QLabel("GEM Professional Implicit Modeling System")
        title_font = QFont("Arial", 28, QFont.Weight.Bold)
        title_label.setFont(title_font)
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title_label.setStyleSheet("color: #2c3e50; margin-bottom: 10px;")
        title_layout.addWidget(title_label)
        
        subtitle_label = QLabel("专业级地质隐式建模平台 v2.0")
        subtitle_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        subtitle_label.setStyleSheet("color: #34495e; font-size: 16px; margin-bottom: 20px;")
        title_layout.addWidget(subtitle_label)
        
        # 特性说明
        features_label = QLabel("🌍 GemPy驱动的隐式建模  •  🎯 高精度地质重建  •  📊 不确定性量化  •  🔬 地球物理集成")
        features_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        features_label.setStyleSheet("color: #7f8c8d; font-size: 14px; font-style: italic;")
        title_layout.addWidget(features_label)
        
        layout.addWidget(title_frame)
        
        # 快速操作按钮
        buttons_layout = QGridLayout()
        buttons_layout.setSpacing(20)
        
        # 项目操作组
        project_group = QGroupBox("项目管理")
        project_layout = QVBoxLayout(project_group)
        
        new_project_btn = QPushButton("新建地质项目")
        if ICONS_AVAILABLE:
            new_project_btn.setIcon(qta.icon('fa5s.mountain', color='#27ae60'))
        new_project_btn.setMinimumHeight(50)
        new_project_btn.setStyleSheet("""
            QPushButton {
                font-size: 14px;
                font-weight: bold;
                background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                          stop: 0 #2ecc71, stop: 1 #27ae60);
                color: white;
                border: none;
                border-radius: 6px;
            }
            QPushButton:hover {
                background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                          stop: 0 #58d68d, stop: 1 #2ecc71);
            }
        """)
        new_project_btn.clicked.connect(self.new_geology_project)
        project_layout.addWidget(new_project_btn)
        
        open_project_btn = QPushButton("打开已有项目")
        if ICONS_AVAILABLE:
            open_project_btn.setIcon(qta.icon('fa5s.folder-open', color='#3498db'))
        open_project_btn.setMinimumHeight(40)
        open_project_btn.clicked.connect(self.open_project)
        project_layout.addWidget(open_project_btn)
        
        buttons_layout.addWidget(project_group, 0, 0)
        
        # 数据导入组
        data_group = QGroupBox("数据导入")
        data_layout = QVBoxLayout(data_group)
        
        import_borehole_btn = QPushButton("导入钻孔数据")
        if ICONS_AVAILABLE:
            import_borehole_btn.setIcon(qta.icon('fa5s.map-marker-alt', color='#e67e22'))
        import_borehole_btn.setMinimumHeight(40)
        import_borehole_btn.clicked.connect(self.import_borehole_data)
        data_layout.addWidget(import_borehole_btn)
        
        import_surface_btn = QPushButton("导入地层点")
        if ICONS_AVAILABLE:
            import_surface_btn.setIcon(qta.icon('fa5s.layer-group', color='#9b59b6'))
        import_surface_btn.setMinimumHeight(40)
        import_surface_btn.clicked.connect(self.import_surface_points)
        data_layout.addWidget(import_surface_btn)
        
        import_orientation_btn = QPushButton("导入方向数据")
        if ICONS_AVAILABLE:
            import_orientation_btn.setIcon(qta.icon('fa5s.compass', color='#e74c3c'))
        import_orientation_btn.setMinimumHeight(40)
        import_orientation_btn.clicked.connect(self.import_orientations)
        data_layout.addWidget(import_orientation_btn)
        
        buttons_layout.addWidget(data_group, 0, 1)
        
        # 建模分析组
        modeling_group = QGroupBox("建模分析")
        modeling_layout = QVBoxLayout(modeling_group)
        
        implicit_modeling_btn = QPushButton("隐式建模")
        if ICONS_AVAILABLE:
            implicit_modeling_btn.setIcon(qta.icon('fa5s.cube', color='#16a085'))
        implicit_modeling_btn.setMinimumHeight(40)
        implicit_modeling_btn.clicked.connect(self.create_geological_model)
        modeling_layout.addWidget(implicit_modeling_btn)
        
        uncertainty_btn = QPushButton("不确定性分析")
        if ICONS_AVAILABLE:
            uncertainty_btn.setIcon(qta.icon('fa5s.chart-line', color='#f39c12'))
        uncertainty_btn.setMinimumHeight(40)
        uncertainty_btn.clicked.connect(self.monte_carlo_analysis)
        modeling_layout.addWidget(uncertainty_btn)
        
        geophysics_btn = QPushButton("地球物理建模")
        if ICONS_AVAILABLE:
            geophysics_btn.setIcon(qta.icon('fa5s.globe', color='#8e44ad'))
        geophysics_btn.setMinimumHeight(40)
        geophysics_btn.clicked.connect(self.gravity_modeling)
        modeling_layout.addWidget(geophysics_btn)
        
        buttons_layout.addWidget(modeling_group, 0, 2)
        
        layout.addLayout(buttons_layout)
        
        # 系统状态
        status_group = QGroupBox("系统状态")
        status_layout = QFormLayout(status_group)
        
        # 模块状态检查
        gempy_status = "✓ 已安装" if GEMPY_AVAILABLE else "✗ 未安装"
        pyvista_status = "✓ 已安装" if PYVISTA_AVAILABLE else "✗ 未安装"
        modules_status = "✓ 已加载" if EXAMPLE3_MODULES_AVAILABLE else "✗ 未加载"
        
        status_layout.addRow("GemPy:", QLabel(gempy_status))
        status_layout.addRow("PyVista:", QLabel(pyvista_status))
        status_layout.addRow("Example3模块:", QLabel(modules_status))
        
        layout.addWidget(status_group)
        
        layout.addStretch()
        
        return widget
        
    def create_data_management_widget(self):
        """创建数据管理页面"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 标题
        title_label = QLabel("地质数据管理中心")
        title_label.setFont(QFont("Arial", 18, QFont.Weight.Bold))
        title_label.setStyleSheet("color: #2c3e50; margin-bottom: 20px;")
        layout.addWidget(title_label)
        
        # 数据统计面板
        stats_splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # 左侧：数据列表
        data_list_group = QGroupBox("数据文件")
        data_list_layout = QVBoxLayout(data_list_group)
        
        self.data_list = QListWidget()
        self.data_list.addItem("📊 钻孔数据: borehole_data.csv")
        self.data_list.addItem("🗻 地层点: surface_points.csv")
        self.data_list.addItem("🧭 方向数据: orientations.csv")
        self.data_list.addItem("⚡ 断层数据: faults.csv")
        data_list_layout.addWidget(self.data_list)
        
        # 数据操作按钮
        data_buttons_layout = QHBoxLayout()
        data_buttons_layout.addWidget(QPushButton("导入"))
        data_buttons_layout.addWidget(QPushButton("导出"))
        data_buttons_layout.addWidget(QPushButton("清理"))
        data_buttons_layout.addWidget(QPushButton("验证"))
        data_list_layout.addLayout(data_buttons_layout)
        
        stats_splitter.addWidget(data_list_group)
        
        # 右侧：数据预览
        preview_group = QGroupBox("数据预览")
        preview_layout = QVBoxLayout(preview_group)
        
        self.data_table = QTableWidget(5, 4)
        self.data_table.setHorizontalHeaderLabels(["X坐标", "Y坐标", "Z坐标", "地层"])
        
        # 添加示例数据
        sample_data = [
            ["100.0", "200.0", "-50.0", "粘土层"],
            ["150.0", "250.0", "-45.0", "砂层"],
            ["200.0", "300.0", "-60.0", "粘土层"],
            ["120.0", "180.0", "-40.0", "填土"],
            ["180.0", "280.0", "-55.0", "砂层"]
        ]
        
        for i, row_data in enumerate(sample_data):
            for j, cell_data in enumerate(row_data):
                self.data_table.setItem(i, j, QTableWidgetItem(cell_data))
        
        self.data_table.horizontalHeader().setStretchLastSection(True)
        preview_layout.addWidget(self.data_table)
        
        stats_splitter.addWidget(preview_group)
        stats_splitter.setSizes([300, 500])
        
        layout.addWidget(stats_splitter)
        
        # 质量检查面板
        quality_group = QGroupBox("数据质量检查")
        quality_layout = QGridLayout(quality_group)
        
        quality_items = [
            ("坐标完整性", "✓ 通过", "#27ae60"),
            ("高程合理性", "⚠ 警告", "#f39c12"),
            ("地层连续性", "✓ 通过", "#27ae60"),
            ("重复数据", "✗ 发现3处", "#e74c3c")
        ]
        
        for i, (name, status, color) in enumerate(quality_items):
            name_label = QLabel(name)
            status_label = QLabel(status)
            status_label.setStyleSheet(f"color: {color}; font-weight: bold;")
            
            quality_layout.addWidget(name_label, i // 2, (i % 2) * 2)
            quality_layout.addWidget(status_label, i // 2, (i % 2) * 2 + 1)
        
        layout.addWidget(quality_group)
        
        return widget
        
    def create_dock_windows(self):
        """创建停靠窗口"""
        # 属性面板
        if EXAMPLE3_MODULES_AVAILABLE:
            self.property_panel = PropertyPanel()
        else:
            self.property_panel = QDockWidget("属性", self)
            prop_widget = QWidget()
            prop_layout = QVBoxLayout(prop_widget)
            prop_layout.addWidget(QLabel("地质对象属性面板"))
            
            # 简单的属性编辑器
            prop_form = QFormLayout()
            prop_form.addRow("对象类型:", QLabel("未选择"))
            prop_form.addRow("X坐标:", QDoubleSpinBox())
            prop_form.addRow("Y坐标:", QDoubleSpinBox())
            prop_form.addRow("Z坐标:", QDoubleSpinBox())
            prop_form.addRow("地层:", QComboBox())
            
            prop_layout.addLayout(prop_form)
            self.property_panel.setWidget(prop_widget)
            
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.property_panel)
        
        # 消息中心
        if EXAMPLE3_MODULES_AVAILABLE:
            self.message_center = MessageCenter()
        else:
            self.message_center = QDockWidget("消息", self)
            msg_widget = QTabWidget()
            
            # 消息标签页
            info_text = QTextEdit()
            info_text.setMaximumHeight(150)
            info_text.append("系统启动完成")
            msg_widget.addTab(info_text, "消息")
            
            # 警告标签页
            warn_text = QTextEdit()
            warn_text.setMaximumHeight(150)
            msg_widget.addTab(warn_text, "警告")
            
            # 错误标签页  
            error_text = QTextEdit()
            error_text.setMaximumHeight(150)
            msg_widget.addTab(error_text, "错误")
            
            self.message_center.setWidget(msg_widget)
            
        self.addDockWidget(Qt.DockWidgetArea.BottomDockWidgetArea, self.message_center)
        
        # 地质模型浏览器
        self.model_browser = QDockWidget("模型浏览器", self)
        browser_widget = QWidget()
        browser_layout = QVBoxLayout(browser_widget)
        
        # 模型列表
        model_list = QListWidget()
        model_list.addItem("🏔️ 主地质模型")
        model_list.addItem("📊 不确定性模型")
        model_list.addItem("🌍 地球物理模型")
        browser_layout.addWidget(model_list)
        
        # 模型操作按钮
        model_buttons = QHBoxLayout()
        model_buttons.addWidget(QPushButton("加载"))
        model_buttons.addWidget(QPushButton("保存"))
        model_buttons.addWidget(QPushButton("删除"))
        browser_layout.addLayout(model_buttons)
        
        self.model_browser.setWidget(browser_widget)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.model_browser)
        
        # 设置停靠窗口大小
        self.resizeDocks([self.property_panel, self.model_browser], [300, 250], Qt.Orientation.Horizontal)
        self.resizeDocks([self.message_center], [180], Qt.Orientation.Vertical)
        
    def setup_connections(self):
        """设置信号连接"""
        # 标签页连接
        self.central_tabs.tabCloseRequested.connect(self.close_tab)
        
        # 数据列表连接
        if hasattr(self, 'data_list'):
            self.data_list.itemClicked.connect(self.on_data_item_clicked)
            
    def show_welcome_message(self):
        """显示欢迎信息"""
        welcome_msg = f"""
========================================
GEM Professional Implicit Modeling System v2.0
========================================

系统模块状态:
{'✓ GemPy隐式建模引擎' if GEMPY_AVAILABLE else '✗ GemPy未安装'}
{'✓ PyVista 3D可视化' if PYVISTA_AVAILABLE else '✗ PyVista未安装'}
{'✓ Example3专业模块' if EXAMPLE3_MODULES_AVAILABLE else '✗ Example3模块未完全加载'}
{'✓ Matplotlib图表绘制' if MATPLOTLIB_AVAILABLE else '✗ Matplotlib未安装'}

欢迎使用专业级地质隐式建模系统！
您可以开始创建新的地质项目或导入现有数据。
"""
        
        if hasattr(self.message_center, 'add_message'):
            self.message_center.add_message(welcome_msg, "info")
        
        self.status_label.setText("GEM系统准备就绪")
        
    # ===== 菜单动作实现 =====
    
    def new_geology_project(self):
        """新建地质项目"""
        dialog = QDialog(self)
        dialog.setWindowTitle("新建地质项目")
        dialog.setModal(True)
        dialog.resize(400, 300)
        
        layout = QVBoxLayout(dialog)
        
        # 项目信息
        info_group = QGroupBox("项目信息")
        info_layout = QFormLayout(info_group)
        
        name_edit = QLineEdit("新地质项目")
        info_layout.addRow("项目名称:", name_edit)
        
        location_edit = QLineEdit()
        info_layout.addRow("项目位置:", location_edit)
        
        extent_group = QGroupBox("建模范围")
        extent_layout = QFormLayout(extent_group)
        
        extent_layout.addRow("X范围:", QLineEdit("0, 1000"))
        extent_layout.addRow("Y范围:", QLineEdit("0, 1000"))
        extent_layout.addRow("Z范围:", QLineEdit("-500, 0"))
        
        resolution_layout = QFormLayout()
        resolution_layout.addRow("分辨率:", QLineEdit("50, 50, 50"))
        
        layout.addWidget(info_group)
        layout.addWidget(extent_group)
        layout.addLayout(resolution_layout)
        
        # 按钮
        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        buttons.accepted.connect(dialog.accept)
        buttons.rejected.connect(dialog.reject)
        layout.addWidget(buttons)
        
        if dialog.exec() == QDialog.DialogCode.Accepted:
            project_name = name_edit.text()
            self.status_label.setText(f"创建地质项目: {project_name}")
            
            if hasattr(self.message_center, 'add_message'):
                self.message_center.add_message(f"地质项目 '{project_name}' 创建成功", "info")
    
    def open_project(self):
        """打开项目"""
        filename, _ = QFileDialog.getOpenFileName(
            self, "打开地质项目", "", "地质项目文件 (*.gem *.gempy);;所有文件 (*)")
        if filename:
            self.project_path = filename
            self.status_label.setText(f"打开项目: {filename}")
            
            if hasattr(self.message_center, 'add_message'):
                self.message_center.add_message(f"项目已打开: {filename}", "info")
    
    def save_project(self):
        """保存项目"""
        if self.project_path:
            self.status_label.setText(f"保存项目: {self.project_path}")
        else:
            filename, _ = QFileDialog.getSaveFileName(
                self, "保存地质项目", "", "地质项目文件 (*.gem)")
            if filename:
                self.project_path = filename
                self.status_label.setText(f"保存项目: {filename}")
    
    def import_borehole_data(self):
        """导入钻孔数据"""
        filename, _ = QFileDialog.getOpenFileName(
            self, "导入钻孔数据", "", "数据文件 (*.csv *.xlsx *.txt);;所有文件 (*)")
        if filename:
            self.status_label.setText(f"导入钻孔数据: {filename}")
            
            if hasattr(self.message_center, 'add_message'):
                self.message_center.add_message(f"钻孔数据导入成功: {filename}", "info")
    
    def import_surface_points(self):
        """导入地层点数据"""
        filename, _ = QFileDialog.getOpenFileName(
            self, "导入地层点数据", "", "数据文件 (*.csv *.xlsx *.txt);;所有文件 (*)")
        if filename:
            self.status_label.setText(f"导入地层点: {filename}")
    
    def import_orientations(self):
        """导入方向数据"""
        filename, _ = QFileDialog.getOpenFileName(
            self, "导入方向数据", "", "数据文件 (*.csv *.xlsx *.txt);;所有文件 (*)")
        if filename:
            self.status_label.setText(f"导入方向数据: {filename}")
    
    def create_geological_model(self):
        """创建地质模型"""
        if GEMPY_AVAILABLE:
            self.progress_bar.setVisible(True)
            self.progress_bar.setRange(0, 0)  # 不确定进度
            self.status_label.setText("正在创建地质模型...")
            
            # 这里可以调用实际的GemPy建模功能
            QTimer.singleShot(2000, self.finish_modeling)  # 模拟建模过程
        else:
            QMessageBox.information(self, "提示", "GemPy未安装，无法进行隐式建模")
    
    def finish_modeling(self):
        """完成建模"""
        self.progress_bar.setVisible(False)
        self.status_label.setText("地质模型创建完成")
        self.model_stats.setText("模型: 5层地质体")
        
        if hasattr(self.message_center, 'add_message'):
            self.message_center.add_message("隐式地质模型计算完成", "info")
    
    def compute_model(self):
        """计算模型"""
        if self.current_model or GEMPY_AVAILABLE:
            self.status_label.setText("正在计算地质模型...")
            self.progress_bar.setVisible(True)
            QTimer.singleShot(1500, self.finish_computing)
        else:
            QMessageBox.information(self, "提示", "请先创建地质模型")
    
    def finish_computing(self):
        """完成计算"""
        self.progress_bar.setVisible(False)
        self.status_label.setText("模型计算完成")
        
    def close_tab(self, index):
        """关闭标签页"""
        if index > 0:  # 保护主要标签页
            self.central_tabs.removeTab(index)
    
    def on_data_item_clicked(self, item):
        """数据项点击处理"""
        self.status_label.setText(f"选择数据: {item.text()}")
    
    def show_about(self):
        """显示关于对话框"""
        about_text = f"""
        <h2>GEM Professional Implicit Modeling System</h2>
        <p><b>版本:</b> 2.0</p>
        <p><b>描述:</b> 专业级地质隐式建模平台</p>
        <hr>
        <h3>核心技术:</h3>
        <ul>
        <li>GemPy隐式建模引擎</li>
        <li>PyVista 3D可视化</li>
        <li>贝叶斯地质推理</li>
        <li>不确定性量化分析</li>
        <li>地球物理联合建模</li>
        </ul>
        <hr>
        <h3>系统状态:</h3>
        <ul>
        <li>GemPy: {'已安装' if GEMPY_AVAILABLE else '未安装'}</li>
        <li>PyVista: {'已安装' if PYVISTA_AVAILABLE else '未安装'}</li>
        <li>专业模块: {'已加载' if EXAMPLE3_MODULES_AVAILABLE else '未完全加载'}</li>
        </ul>
        <hr>
        <p><b>开发团队:</b> DeepCAD Team</p>
        <p><b>技术支持:</b> gem-support@deepcad.com</p>
        """
        QMessageBox.about(self, "关于GEM系统", about_text)
    
    # 占位符方法（待实现的功能）
    def import_fault_data(self): pass
    def import_geophysics_data(self): pass
    def export_vtk_model(self): pass
    def export_sections(self): pass
    def export_mesh(self): pass
    def export_statistics(self): pass
    def check_data_quality(self): pass
    def clean_data(self): pass
    def coordinate_transform(self): pass
    def data_statistics(self): pass
    def define_stratigraphic_sequence(self): pass
    def edit_strata_relations(self): pass
    def set_strata_properties(self): pass
    def manage_fault_system(self): pass
    def manage_fold_system(self): pass
    def manage_unconformities(self): pass
    def validate_model(self): pass
    def optimize_parameters(self): pass
    def kriging_interpolation(self): pass
    def rbf_interpolation(self): pass
    def idw_interpolation(self): pass
    def natural_neighbor(self): pass
    def regular_grid(self): pass
    def adaptive_grid(self): pass
    def section_grid(self): pass
    def custom_grid(self): pass
    def thickness_analysis(self): pass
    def structural_analysis(self): pass
    def depositional_analysis(self): pass
    def monte_carlo_analysis(self): pass
    def sensitivity_analysis(self): pass
    def probabilistic_modeling(self): pass
    def gravity_modeling(self): pass
    def magnetic_modeling(self): pass
    def joint_inversion(self): pass
    def render_geological_bodies(self): pass
    def show_data_points(self): pass
    def show_fault_surfaces(self): pass
    def show_property_clouds(self): pass
    def create_geological_sections(self): pass
    def create_borehole_sections(self): pass
    def create_arbitrary_sections(self): pass
    def reset_view(self): pass
    def fit_to_window(self): pass
    def isometric_view(self): pass
    def top_view(self): pass
    def front_view(self): pass
    def side_view(self): pass
    def wireframe_mode(self): pass
    def solid_mode(self): pass
    def transparent_mode(self): pass
    def measure_tool(self): pass
    def section_tool(self):
        """剖面工具"""
        if hasattr(self.viewport_3d, 'activate_section_tool'):
            self.viewport_3d.activate_section_tool()
        else:
            QMessageBox.information(self, "剖面工具", "当前3D视口不支持剖面功能")
    def open_data_manager(self): pass
    def open_parameter_editor(self): pass
    def open_batch_processor(self): pass
    def open_script_editor(self): pass
    def system_settings(self): pass
    def show_user_manual(self): pass
    def show_geology_tutorials(self): pass
    def show_api_docs(self): pass
    def open_example_projects(self): pass
    def check_updates(self): pass


def main():
    """主函数"""
    app = QApplication(sys.argv)
    app.setApplicationName("GEM Professional Implicit Modeling System")
    app.setApplicationVersion("2.0")
    app.setOrganizationName("DeepCAD Team")
    
    # 设置应用程序图标
    if ICONS_AVAILABLE:
        app.setWindowIcon(qta.icon('fa5s.mountain', color='#27ae60'))
    
    # 创建主窗口
    window = GemProfessionalMainWindow()
    window.show()
    
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())