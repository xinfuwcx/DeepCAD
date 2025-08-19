#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
DeepCAD Professional CAE System
专业级CAE分析系统 - Abaqus风格界面

集成功能模块：
- 深基坑工程分析 (Example2)
- 地质隐式建模 (Example3/GemPy)
- 地球物理计算
- 材料管理系统
- 3D可视化与后处理
"""

import sys
import os
from pathlib import Path
from typing import Dict, List, Optional, Any
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

# 科学计算
import numpy as np
import pandas as pd

# 添加项目路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 图标库
try:
    import qtawesome as qta
    ICONS_AVAILABLE = True
except ImportError:
    ICONS_AVAILABLE = False

# 可视化库
try:
    import pyvista as pv
    import pyvistaqt as pvqt
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

try:
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
    from matplotlib.figure import Figure
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

# DeepCAD模块导入
try:
    from example2.modules.preprocessor import PreProcessor
    from example2.modules.analyzer import Analyzer
    from example2.modules.postprocessor import PostProcessor
    from example2.gui.material_manager import MaterialManager
    from example2.gui.analysis_monitor import AnalysisMonitor
    EXAMPLE2_AVAILABLE = True
except ImportError as e:
    print(f"Example2模块不可用: {e}")
    EXAMPLE2_AVAILABLE = False

try:
    from example3.professional_gempy_cae import AbaqusStyleSheet, ModelTreeWidget, PropertyPanel, MessageCenter
    from example3.gempy_main_window import GemPyViewport3D
    import gempy as gp
    EXAMPLE3_AVAILABLE = True
except ImportError as e:
    print(f"Example3模块不可用: {e}")
    EXAMPLE3_AVAILABLE = False


class AbaqusStyleMainWindow(QMainWindow):
    """DeepCAD专业级CAE主窗口 - Abaqus风格"""
    
    def __init__(self):
        super().__init__()
        
        # 初始化系统模块
        self.init_modules()
        
        # 设置窗口属性
        self.setWindowTitle("DeepCAD Professional CAE System v2.0")
        self.setGeometry(50, 50, 1800, 1200)
        self.setMinimumSize(1400, 900)
        
        # 应用Abaqus风格样式
        self.apply_abaqus_style()
        
        # 创建界面
        self.setup_ui()
        
        # 设置信号连接
        self.setup_connections()
        
        # 显示欢迎信息
        self.show_welcome_message()
        
    def init_modules(self):
        """初始化系统模块"""
        self.modules = {}
        
        # 初始化Example2模块
        if EXAMPLE2_AVAILABLE:
            try:
                self.modules['preprocessor'] = PreProcessor()
                self.modules['analyzer'] = Analyzer()
                self.modules['postprocessor'] = PostProcessor()
                print("✓ 深基坑CAE分析模块已加载")
            except Exception as e:
                print(f"× 深基坑CAE分析模块加载失败: {e}")
        
        # 初始化Example3模块
        if EXAMPLE3_AVAILABLE:
            try:
                self.modules['gempy_available'] = True
                print("✓ 地质建模模块已加载")
            except Exception as e:
                print(f"× 地质建模模块加载失败: {e}")
        
        # 当前项目状态
        self.current_project = None
        self.project_path = None
        self.analysis_results = None
        
    def apply_abaqus_style(self):
        """应用Abaqus专业级样式"""
        if EXAMPLE3_AVAILABLE:
            self.setStyleSheet(AbaqusStyleSheet.get_main_style() + """
            /* 扩展样式 */
            QMainWindow {
                background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                          stop: 0 #f8f9fa, stop: 1 #e9ecef);
            }
            
            QSplitter::handle {
                background-color: #dee2e6;
            }
            
            QSplitter::handle:horizontal {
                width: 3px;
            }
            
            QSplitter::handle:vertical {
                height: 3px;
            }
            
            QTabWidget::tab-bar {
                alignment: left;
            }
            
            /* 工具栏增强样式 */
            QToolBar QToolButton {
                min-width: 32px;
                min-height: 32px;
                border-radius: 4px;
                margin: 1px;
            }
            
            QToolBar QToolButton:checked {
                background-color: #0066cc;
                color: white;
                border: 1px solid #004499;
            }
            
            /* 状态栏增强 */
            QStatusBar::item {
                border: none;
            }
            
            QStatusBar QLabel {
                color: #495057;
                font-size: 11px;
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
        
        # 新建项目组
        new_menu = file_menu.addMenu('新建项目')
        if ICONS_AVAILABLE:
            new_menu.setIcon(qta.icon('fa5s.plus-circle'))
        
        new_deepexc_action = QAction('深基坑工程项目', self)
        new_deepexc_action.setShortcut('Ctrl+Shift+D')
        new_deepexc_action.triggered.connect(self.new_deep_excavation_project)
        new_menu.addAction(new_deepexc_action)
        
        new_geology_action = QAction('地质建模项目', self)
        new_geology_action.setShortcut('Ctrl+Shift+G')
        new_geology_action.triggered.connect(self.new_geology_project)
        new_menu.addAction(new_geology_action)
        
        new_geophysics_action = QAction('地球物理项目', self)
        new_geophysics_action.setShortcut('Ctrl+Shift+P')
        new_geophysics_action.triggered.connect(self.new_geophysics_project)
        new_menu.addAction(new_geophysics_action)
        
        file_menu.addSeparator()
        
        # 打开/保存
        open_action = QAction('打开项目(&O)', self)
        open_action.setShortcut(QKeySequence.StandardKey.Open)
        if ICONS_AVAILABLE:
            open_action.setIcon(qta.icon('fa5s.folder-open'))
        open_action.triggered.connect(self.open_project)
        file_menu.addAction(open_action)
        
        save_action = QAction('保存项目(&S)', self)
        save_action.setShortcut(QKeySequence.StandardKey.Save)
        if ICONS_AVAILABLE:
            save_action.setIcon(qta.icon('fa5s.save'))
        save_action.triggered.connect(self.save_project)
        file_menu.addAction(save_action)
        
        file_menu.addSeparator()
        
        # 导入/导出菜单
        import_menu = file_menu.addMenu('导入数据')
        import_menu.addAction('CAD几何模型...', self.import_cad_model)
        import_menu.addAction('钻孔数据...', self.import_borehole_data)
        import_menu.addAction('地层点数据...', self.import_surface_points)
        import_menu.addAction('地球物理数据...', self.import_geophysics_data)
        
        export_menu = file_menu.addMenu('导出结果')
        export_menu.addAction('分析报告...', self.export_analysis_report)
        export_menu.addAction('3D模型...', self.export_3d_model)
        export_menu.addAction('数据表格...', self.export_data_tables)
        
        file_menu.addSeparator()
        
        # 退出
        exit_action = QAction('退出(&X)', self)
        exit_action.setShortcut('Alt+F4')
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # 编辑菜单
        edit_menu = menubar.addMenu('编辑(&E)')
        edit_menu.addAction('撤销', self.undo_action).setShortcut('Ctrl+Z')
        edit_menu.addAction('重做', self.redo_action).setShortcut('Ctrl+Y')
        edit_menu.addSeparator()
        edit_menu.addAction('复制', self.copy_action).setShortcut('Ctrl+C')
        edit_menu.addAction('粘贴', self.paste_action).setShortcut('Ctrl+V')
        edit_menu.addAction('删除', self.delete_action).setShortcut('Delete')
        
        # 模型菜单
        model_menu = menubar.addMenu('模型(&M)')
        
        # 几何建模
        geometry_menu = model_menu.addMenu('几何建模')
        geometry_menu.addAction('创建基坑模型', self.create_excavation_model)
        geometry_menu.addAction('创建地质模型', self.create_geological_model)
        geometry_menu.addAction('编辑模型参数', self.edit_model_parameters)
        
        # 材料定义
        material_menu = model_menu.addMenu('材料定义')
        material_menu.addAction('土体材料', self.define_soil_materials)
        material_menu.addAction('支护材料', self.define_support_materials)
        material_menu.addAction('岩体材料', self.define_rock_materials)
        
        model_menu.addSeparator()
        
        # 网格生成
        mesh_menu = model_menu.addMenu('网格生成')
        mesh_menu.addAction('自动网格生成', self.auto_mesh_generation)
        mesh_menu.addAction('手动网格控制', self.manual_mesh_control)
        mesh_menu.addAction('网格质量检查', self.mesh_quality_check)
        
        # 分析菜单
        analysis_menu = menubar.addMenu('分析(&A)')
        
        # 分析类型
        analysis_menu.addAction('静力分析', self.static_analysis)
        analysis_menu.addAction('动力分析', self.dynamic_analysis)
        analysis_menu.addAction('稳定性分析', self.stability_analysis)
        analysis_menu.addAction('渗流分析', self.seepage_analysis)
        
        analysis_menu.addSeparator()
        
        # 地质分析
        geo_analysis_menu = analysis_menu.addMenu('地质分析')
        geo_analysis_menu.addAction('隐式建模', self.implicit_modeling)
        geo_analysis_menu.addAction('地层层序', self.stratigraphic_sequence)
        geo_analysis_menu.addAction('构造分析', self.structural_analysis)
        
        # 地球物理分析
        geophys_menu = analysis_menu.addMenu('地球物理')
        geophys_menu.addAction('重力建模', self.gravity_modeling)
        geophys_menu.addAction('磁力建模', self.magnetic_modeling)
        geophys_menu.addAction('反演计算', self.inversion_calculation)
        
        # 结果菜单
        results_menu = menubar.addMenu('结果(&R)')
        results_menu.addAction('应力分布', self.view_stress_distribution)
        results_menu.addAction('位移云图', self.view_displacement_contour)
        results_menu.addAction('安全系数', self.view_safety_factor)
        results_menu.addAction('地质剖面', self.view_geological_sections)
        results_menu.addSeparator()
        results_menu.addAction('生成报告', self.generate_report)
        
        # 工具菜单
        tools_menu = menubar.addMenu('工具(&T)')
        tools_menu.addAction('材料管理器', self.open_material_manager)
        tools_menu.addAction('参数优化', self.parameter_optimization)
        tools_menu.addAction('批量分析', self.batch_analysis)
        tools_menu.addAction('数据查询', self.data_query_tools)
        tools_menu.addSeparator()
        tools_menu.addAction('系统设置', self.system_settings)
        
        # 视图菜单
        view_menu = menubar.addMenu('视图(&V)')
        view_menu.addAction('重置视图', self.reset_view)
        view_menu.addAction('适应窗口', self.fit_to_window)
        view_menu.addSeparator()
        view_menu.addAction('模型树', self.toggle_model_tree)
        view_menu.addAction('属性面板', self.toggle_property_panel)
        view_menu.addAction('消息中心', self.toggle_message_center)
        view_menu.addAction('分析监控', self.toggle_analysis_monitor)
        
        # 帮助菜单
        help_menu = menubar.addMenu('帮助(&H)')
        help_menu.addAction('用户手册', self.show_user_manual)
        help_menu.addAction('视频教程', self.show_video_tutorials)
        help_menu.addAction('示例项目', self.open_example_projects)
        help_menu.addSeparator()
        help_menu.addAction('检查更新', self.check_updates)
        help_menu.addAction('关于DeepCAD', self.show_about)
        
    def create_toolbars(self):
        """创建专业级工具栏"""
        # 主工具栏
        main_toolbar = self.addToolBar('主工具栏')
        main_toolbar.setObjectName("MainToolBar")
        main_toolbar.setMovable(False)
        main_toolbar.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextUnderIcon)
        main_toolbar.setIconSize(QSize(32, 32))
        
        if ICONS_AVAILABLE:
            # 文件操作组
            main_toolbar.addAction(self.create_toolbar_action(
                'fa5s.plus', '新建', '新建项目', self.new_project_dialog))
            main_toolbar.addAction(self.create_toolbar_action(
                'fa5s.folder-open', '打开', '打开项目', self.open_project))
            main_toolbar.addAction(self.create_toolbar_action(
                'fa5s.save', '保存', '保存项目', self.save_project))
            
            main_toolbar.addSeparator()
            
            # 建模操作组
            main_toolbar.addAction(self.create_toolbar_action(
                'fa5s.cube', '建模', '几何建模', self.geometry_modeling))
            main_toolbar.addAction(self.create_toolbar_action(
                'fa5s.layer-group', '材料', '材料定义', self.open_material_manager))
            main_toolbar.addAction(self.create_toolbar_action(
                'fa5s.th', '网格', '网格生成', self.mesh_generation))
            
            main_toolbar.addSeparator()
            
            # 分析操作组
            main_toolbar.addAction(self.create_toolbar_action(
                'fa5s.calculator', '分析', '开始分析', self.start_analysis))
            main_toolbar.addAction(self.create_toolbar_action(
                'fa5s.chart-area', '结果', '查看结果', self.view_results))
            main_toolbar.addAction(self.create_toolbar_action(
                'fa5s.file-alt', '报告', '生成报告', self.generate_report))
        
        # 视图工具栏
        view_toolbar = self.addToolBar('视图工具栏')
        view_toolbar.setObjectName("ViewToolBar")
        view_toolbar.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonIconOnly)
        view_toolbar.setIconSize(QSize(24, 24))
        
        if ICONS_AVAILABLE:
            # 视图控制
            view_toolbar.addAction(self.create_toolbar_action(
                'fa5s.eye', '', '等轴视图', self.isometric_view))
            view_toolbar.addAction(self.create_toolbar_action(
                'fa5s.arrows-alt-h', '', '前视图', self.front_view))
            view_toolbar.addAction(self.create_toolbar_action(
                'fa5s.arrows-alt-v', '', '侧视图', self.side_view))
            view_toolbar.addAction(self.create_toolbar_action(
                'fa5s.compress-arrows-alt', '', '俯视图', self.top_view))
            
            view_toolbar.addSeparator()
            
            # 渲染模式
            view_toolbar.addAction(self.create_toolbar_action(
                'fa5s.project-diagram', '', '线框模式', self.wireframe_mode))
            view_toolbar.addAction(self.create_toolbar_action(
                'fa5s.fill', '', '填充模式', self.solid_mode))
            view_toolbar.addAction(self.create_toolbar_action(
                'fa5s.adjust', '', '透明模式', self.transparent_mode))
            
    def create_toolbar_action(self, icon_name: str, text: str, tooltip: str, callback):
        """创建工具栏动作"""
        action = QAction(text, self)
        if ICONS_AVAILABLE and icon_name:
            action.setIcon(qta.icon(icon_name, color='#2c3e50'))
        action.setToolTip(tooltip)
        action.triggered.connect(callback)
        return action
        
    def create_status_bar(self):
        """创建状态栏"""
        self.status_bar = self.statusBar()
        
        # 主状态标签
        self.status_label = QLabel("就绪")
        self.status_bar.addWidget(self.status_label)
        
        # 进度条（默认隐藏）
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setMaximumWidth(200)
        self.status_bar.addPermanentWidget(self.progress_bar)
        
        # 模块状态指示器
        self.module_status = QLabel()
        self.update_module_status()
        self.status_bar.addPermanentWidget(self.module_status)
        
        # 坐标显示
        self.coord_label = QLabel("坐标: (0, 0, 0)")
        self.status_bar.addPermanentWidget(self.coord_label)
        
        # 内存使用
        self.memory_label = QLabel("内存: 0 MB")
        self.status_bar.addPermanentWidget(self.memory_label)
        
        # 启动定时器更新状态
        self.status_timer = QTimer()
        self.status_timer.timeout.connect(self.update_status_info)
        self.status_timer.start(2000)  # 每2秒更新一次
        
    def update_module_status(self):
        """更新模块状态"""
        status_text = []
        if EXAMPLE2_AVAILABLE:
            status_text.append("CAE✓")
        if EXAMPLE3_AVAILABLE:
            status_text.append("地质✓")
        if PYVISTA_AVAILABLE:
            status_text.append("3D✓")
        
        self.module_status.setText(" | ".join(status_text) if status_text else "模块未加载")
        
    def update_status_info(self):
        """更新状态信息"""
        try:
            import psutil
            memory_mb = psutil.Process().memory_info().rss / 1024 / 1024
            self.memory_label.setText(f"内存: {memory_mb:.1f} MB")
        except ImportError:
            pass
            
    def create_central_area(self):
        """创建中央区域"""
        # 主分割器 - 水平分割
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        self.setCentralWidget(main_splitter)
        
        # 左侧：模型树
        if EXAMPLE3_AVAILABLE:
            self.model_tree = ModelTreeWidget()
        else:
            self.model_tree = QTreeWidget()
            self.model_tree.setHeaderLabels(["模型树"])
            
        left_dock = QDockWidget("模型树", self)
        left_dock.setWidget(self.model_tree)
        left_dock.setFeatures(QDockWidget.DockWidgetFeature.DockWidgetMovable | 
                              QDockWidget.DockWidgetFeature.DockWidgetFloatable)
        
        # 中央：工作区 - 标签页式布局
        self.central_tabs = QTabWidget()
        self.central_tabs.setTabPosition(QTabWidget.TabPosition.North)
        self.central_tabs.setTabsClosable(True)
        self.central_tabs.tabCloseRequested.connect(self.close_tab)
        
        # 3D视口标签页
        if PYVISTA_AVAILABLE and EXAMPLE3_AVAILABLE:
            self.viewport_3d = GemPyViewport3D()
            self.central_tabs.addTab(self.viewport_3d, "3D 视口")
        else:
            # 简单的3D视口替代
            simple_3d = QWidget()
            simple_3d_layout = QVBoxLayout(simple_3d)
            simple_3d_layout.addWidget(QLabel("3D视口 (需要PyVista支持)"))
            self.central_tabs.addTab(simple_3d, "3D 视口")
        
        # 欢迎页面
        welcome_widget = self.create_welcome_widget()
        self.central_tabs.addTab(welcome_widget, "欢迎")
        
        # 工作流管理标签页
        workflow_widget = self.create_workflow_widget()
        self.central_tabs.addTab(workflow_widget, "工作流")
        
        main_splitter.addWidget(self.central_tabs)
        
        # 设置分割器比例
        main_splitter.setSizes([250, 1200])
        
    def create_welcome_widget(self):
        """创建欢迎页面"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.setSpacing(20)
        layout.setContentsMargins(50, 50, 50, 50)
        
        # 标题
        title_label = QLabel("DeepCAD Professional CAE System")
        title_font = QFont("Arial", 24, QFont.Weight.Bold)
        title_label.setFont(title_font)
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title_label.setStyleSheet("color: #2c3e50; margin-bottom: 20px;")
        layout.addWidget(title_label)
        
        # 版本信息
        version_label = QLabel("版本 2.0 - 专业级工程分析平台")
        version_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        version_label.setStyleSheet("color: #7f8c8d; font-size: 14px;")
        layout.addWidget(version_label)
        
        layout.addWidget(QFrame())  # 分隔线
        
        # 快速开始按钮组
        buttons_layout = QGridLayout()
        buttons_layout.setSpacing(15)
        
        # 创建项目按钮
        projects_group = QGroupBox("创建新项目")
        projects_layout = QVBoxLayout(projects_group)
        
        deep_exc_btn = QPushButton("深基坑工程分析")
        if ICONS_AVAILABLE:
            deep_exc_btn.setIcon(qta.icon('fa5s.hard-hat', color='#e67e22'))
        deep_exc_btn.setMinimumHeight(50)
        deep_exc_btn.clicked.connect(self.new_deep_excavation_project)
        projects_layout.addWidget(deep_exc_btn)
        
        geology_btn = QPushButton("地质隐式建模")
        if ICONS_AVAILABLE:
            geology_btn.setIcon(qta.icon('fa5s.mountain', color='#27ae60'))
        geology_btn.setMinimumHeight(50)
        geology_btn.clicked.connect(self.new_geology_project)
        projects_layout.addWidget(geology_btn)
        
        geophysics_btn = QPushButton("地球物理计算")
        if ICONS_AVAILABLE:
            geophysics_btn.setIcon(qta.icon('fa5s.globe', color='#3498db'))
        geophysics_btn.setMinimumHeight(50)
        geophysics_btn.clicked.connect(self.new_geophysics_project)
        projects_layout.addWidget(geophysics_btn)
        
        buttons_layout.addWidget(projects_group, 0, 0)
        
        # 工具按钮组
        tools_group = QGroupBox("工具与管理")
        tools_layout = QVBoxLayout(tools_group)
        
        material_btn = QPushButton("材料管理器")
        if ICONS_AVAILABLE:
            material_btn.setIcon(qta.icon('fa5s.layer-group', color='#9b59b6'))
        material_btn.setMinimumHeight(50)
        material_btn.clicked.connect(self.open_material_manager)
        tools_layout.addWidget(material_btn)
        
        analysis_btn = QPushButton("分析监控器")
        if ICONS_AVAILABLE:
            analysis_btn.setIcon(qta.icon('fa5s.chart-line', color='#e74c3c'))
        analysis_btn.setMinimumHeight(50)
        analysis_btn.clicked.connect(self.open_analysis_monitor)
        tools_layout.addWidget(analysis_btn)
        
        data_btn = QPushButton("数据查询工具")
        if ICONS_AVAILABLE:
            data_btn.setIcon(qta.icon('fa5s.search', color='#f39c12'))
        data_btn.setMinimumHeight(50)
        data_btn.clicked.connect(self.open_data_query_tools)
        tools_layout.addWidget(data_btn)
        
        buttons_layout.addWidget(tools_group, 0, 1)
        
        layout.addLayout(buttons_layout)
        
        # 最近项目
        recent_group = QGroupBox("最近项目")
        recent_layout = QVBoxLayout(recent_group)
        
        recent_list = QListWidget()
        recent_list.addItem("深基坑_项目1.deepcad")
        recent_list.addItem("地质建模_示例.deepcad")
        recent_list.addItem("重力反演_测试.deepcad")
        recent_layout.addWidget(recent_list)
        
        open_recent_btn = QPushButton("打开选中项目")
        open_recent_btn.clicked.connect(self.open_recent_project)
        recent_layout.addWidget(open_recent_btn)
        
        layout.addWidget(recent_group)
        
        layout.addStretch()
        
        return widget
        
    def create_workflow_widget(self):
        """创建工作流管理页面"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 工作流标题
        title_label = QLabel("分析工作流管理")
        title_label.setFont(QFont("Arial", 16, QFont.Weight.Bold))
        layout.addWidget(title_label)
        
        # 工作流步骤表格
        workflow_table = QTableWidget(5, 4)
        workflow_table.setHorizontalHeaderLabels(["步骤", "模块", "状态", "操作"])
        
        # 填充工作流步骤
        workflow_steps = [
            ("1. 几何建模", "前处理", "待执行", "开始"),
            ("2. 材料定义", "前处理", "待执行", "配置"),
            ("3. 网格生成", "前处理", "待执行", "生成"),
            ("4. 分析计算", "求解器", "待执行", "运行"),
            ("5. 结果后处理", "后处理", "待执行", "查看")
        ]
        
        for i, (step, module, status, action) in enumerate(workflow_steps):
            workflow_table.setItem(i, 0, QTableWidgetItem(step))
            workflow_table.setItem(i, 1, QTableWidgetItem(module))
            workflow_table.setItem(i, 2, QTableWidgetItem(status))
            
            action_btn = QPushButton(action)
            workflow_table.setCellWidget(i, 3, action_btn)
        
        workflow_table.horizontalHeader().setStretchLastSection(True)
        layout.addWidget(workflow_table)
        
        # 工作流控制按钮
        control_layout = QHBoxLayout()
        
        auto_run_btn = QPushButton("自动运行全流程")
        if ICONS_AVAILABLE:
            auto_run_btn.setIcon(qta.icon('fa5s.play-circle'))
        control_layout.addWidget(auto_run_btn)
        
        pause_btn = QPushButton("暂停")
        if ICONS_AVAILABLE:
            pause_btn.setIcon(qta.icon('fa5s.pause-circle'))
        control_layout.addWidget(pause_btn)
        
        reset_btn = QPushButton("重置工作流")
        if ICONS_AVAILABLE:
            reset_btn.setIcon(qta.icon('fa5s.redo'))
        control_layout.addWidget(reset_btn)
        
        control_layout.addStretch()
        layout.addLayout(control_layout)
        
        return widget
        
    def create_dock_windows(self):
        """创建停靠窗口"""
        # 属性面板
        if EXAMPLE3_AVAILABLE:
            self.property_panel = PropertyPanel()
        else:
            self.property_panel = QDockWidget("属性", self)
            prop_widget = QWidget()
            prop_layout = QVBoxLayout(prop_widget)
            prop_layout.addWidget(QLabel("属性面板"))
            self.property_panel.setWidget(prop_widget)
            
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.property_panel)
        
        # 消息中心
        if EXAMPLE3_AVAILABLE:
            self.message_center = MessageCenter()
        else:
            self.message_center = QDockWidget("消息", self)
            msg_widget = QTextEdit()
            msg_widget.setMaximumHeight(200)
            self.message_center.setWidget(msg_widget)
            
        self.addDockWidget(Qt.DockWidgetArea.BottomDockWidgetArea, self.message_center)
        
        # 分析监控面板
        self.analysis_monitor_dock = QDockWidget("分析监控", self)
        if EXAMPLE2_AVAILABLE:
            try:
                from example2.gui.analysis_monitor import AnalysisMonitor
                self.analysis_monitor = AnalysisMonitor()
                self.analysis_monitor_dock.setWidget(self.analysis_monitor)
            except ImportError:
                monitor_widget = QWidget()
                monitor_layout = QVBoxLayout(monitor_widget)
                monitor_layout.addWidget(QLabel("分析监控器"))
                self.analysis_monitor_dock.setWidget(monitor_widget)
        else:
            monitor_widget = QWidget()
            monitor_layout = QVBoxLayout(monitor_widget)
            monitor_layout.addWidget(QLabel("分析监控器"))
            self.analysis_monitor_dock.setWidget(monitor_widget)
            
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.analysis_monitor_dock)
        
        # 设置停靠窗口初始大小
        self.resizeDocks([self.property_panel, self.analysis_monitor_dock], [300, 300], Qt.Orientation.Horizontal)
        self.resizeDocks([self.message_center], [150], Qt.Orientation.Vertical)
        
    def setup_connections(self):
        """设置信号连接"""
        # 模型树连接
        if hasattr(self.model_tree, 'item_activated'):
            self.model_tree.item_activated.connect(self.on_tree_item_activated)
            
        # 标签页关闭连接
        self.central_tabs.tabCloseRequested.connect(self.close_tab)
        
    def show_welcome_message(self):
        """显示欢迎信息"""
        welcome_msg = """
========================================
DeepCAD Professional CAE System v2.0
========================================

系统模块状态:
"""
        if EXAMPLE2_AVAILABLE:
            welcome_msg += "✓ 深基坑CAE分析模块\n"
        else:
            welcome_msg += "× 深基坑CAE分析模块 (未加载)\n"
            
        if EXAMPLE3_AVAILABLE:
            welcome_msg += "✓ 地质隐式建模模块\n"
        else:
            welcome_msg += "× 地质隐式建模模块 (未加载)\n"
            
        if PYVISTA_AVAILABLE:
            welcome_msg += "✓ 3D可视化模块\n"
        else:
            welcome_msg += "× 3D可视化模块 (未加载)\n"
            
        welcome_msg += "\n准备就绪，开始您的工程分析之旅！\n"
        
        if hasattr(self.message_center, 'add_message'):
            self.message_center.add_message(welcome_msg, "info")
        
        self.status_label.setText("系统已启动 - 准备就绪")
        
    # ===== 菜单动作实现 =====
    
    def new_project_dialog(self):
        """新建项目对话框"""
        dialog = QDialog(self)
        dialog.setWindowTitle("新建项目")
        dialog.setModal(True)
        layout = QVBoxLayout(dialog)
        
        # 项目类型选择
        type_group = QGroupBox("选择项目类型")
        type_layout = QVBoxLayout(type_group)
        
        deep_exc_radio = QRadioButton("深基坑工程分析")
        deep_exc_radio.setChecked(True)
        type_layout.addWidget(deep_exc_radio)
        
        geology_radio = QRadioButton("地质隐式建模")
        type_layout.addWidget(geology_radio)
        
        geophysics_radio = QRadioButton("地球物理计算")
        type_layout.addWidget(geophysics_radio)
        
        layout.addWidget(type_group)
        
        # 按钮
        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        buttons.accepted.connect(dialog.accept)
        buttons.rejected.connect(dialog.reject)
        layout.addWidget(buttons)
        
        if dialog.exec() == QDialog.DialogCode.Accepted:
            if deep_exc_radio.isChecked():
                self.new_deep_excavation_project()
            elif geology_radio.isChecked():
                self.new_geology_project()
            elif geophysics_radio.isChecked():
                self.new_geophysics_project()
    
    def new_deep_excavation_project(self):
        """新建深基坑工程项目"""
        if EXAMPLE2_AVAILABLE:
            try:
                from example2.gui.main_window import MainWindow as Example2MainWindow
                self.deep_exc_window = Example2MainWindow()
                
                # 在新标签页中显示
                self.central_tabs.addTab(self.deep_exc_window, "深基坑分析")
                self.central_tabs.setCurrentIndex(self.central_tabs.count() - 1)
                
                self.status_label.setText("深基坑工程项目已创建")
                if hasattr(self.message_center, 'add_message'):
                    self.message_center.add_message("深基坑工程项目已创建", "info")
            except Exception as e:
                QMessageBox.warning(self, "错误", f"创建深基坑项目失败: {e}")
        else:
            QMessageBox.information(self, "提示", "深基坑分析模块未加载")
    
    def new_geology_project(self):
        """新建地质建模项目"""
        if EXAMPLE3_AVAILABLE:
            try:
                from example3.gempy_main_window import GemPyMainWindow
                self.geology_window = GemPyMainWindow()
                
                # 在新标签页中显示
                self.central_tabs.addTab(self.geology_window, "地质建模")
                self.central_tabs.setCurrentIndex(self.central_tabs.count() - 1)
                
                self.status_label.setText("地质建模项目已创建")
                if hasattr(self.message_center, 'add_message'):
                    self.message_center.add_message("地质建模项目已创建", "info")
            except Exception as e:
                QMessageBox.warning(self, "错误", f"创建地质建模项目失败: {e}")
        else:
            QMessageBox.information(self, "提示", "地质建模模块未加载")
    
    def new_geophysics_project(self):
        """新建地球物理项目"""
        try:
            from example3.geophysical_modeling import GeophysicalModelingWindow
            self.geophysics_window = GeophysicalModelingWindow()
            
            # 在新标签页中显示
            self.central_tabs.addTab(self.geophysics_window, "地球物理")
            self.central_tabs.setCurrentIndex(self.central_tabs.count() - 1)
            
            self.status_label.setText("地球物理项目已创建")
            if hasattr(self.message_center, 'add_message'):
                self.message_center.add_message("地球物理项目已创建", "info")
        except Exception as e:
            QMessageBox.warning(self, "错误", f"创建地球物理项目失败: {e}")
    
    def open_material_manager(self):
        """打开材料管理器"""
        if EXAMPLE2_AVAILABLE:
            try:
                from example2.gui.material_manager import MaterialManager
                material_window = MaterialManager()
                
                # 在新标签页中显示
                self.central_tabs.addTab(material_window, "材料管理器")
                self.central_tabs.setCurrentIndex(self.central_tabs.count() - 1)
                
            except Exception as e:
                QMessageBox.warning(self, "错误", f"打开材料管理器失败: {e}")
        else:
            QMessageBox.information(self, "提示", "材料管理器模块未加载")
    
    def open_analysis_monitor(self):
        """打开分析监控器"""
        if EXAMPLE2_AVAILABLE:
            try:
                from example2.gui.analysis_monitor import AnalysisMonitor
                monitor_window = AnalysisMonitor()
                
                # 在新标签页中显示
                self.central_tabs.addTab(monitor_window, "分析监控")
                self.central_tabs.setCurrentIndex(self.central_tabs.count() - 1)
                
            except Exception as e:
                QMessageBox.warning(self, "错误", f"打开分析监控器失败: {e}")
        else:
            QMessageBox.information(self, "提示", "分析监控器模块未加载")
    
    def open_data_query_tools(self):
        """打开数据查询工具"""
        if EXAMPLE2_AVAILABLE:
            try:
                from example2.gui.data_query_tools import DataQueryTools
                query_window = DataQueryTools()
                
                # 在新标签页中显示
                self.central_tabs.addTab(query_window, "数据查询")
                self.central_tabs.setCurrentIndex(self.central_tabs.count() - 1)
                
            except Exception as e:
                QMessageBox.warning(self, "错误", f"打开数据查询工具失败: {e}")
        else:
            QMessageBox.information(self, "提示", "数据查询工具模块未加载")
    
    # 其他菜单动作（占位符实现）
    def open_project(self):
        filename, _ = QFileDialog.getOpenFileName(self, "打开项目", "", "DeepCAD项目 (*.deepcad);;所有文件 (*)")
        if filename:
            self.status_label.setText(f"打开项目: {filename}")
    
    def save_project(self):
        if self.project_path:
            self.status_label.setText(f"保存项目: {self.project_path}")
        else:
            filename, _ = QFileDialog.getSaveFileName(self, "保存项目", "", "DeepCAD项目 (*.deepcad)")
            if filename:
                self.project_path = filename
                self.status_label.setText(f"保存项目: {filename}")
    
    def close_tab(self, index):
        """关闭标签页"""
        if index > 0:  # 保护欢迎页面
            self.central_tabs.removeTab(index)
    
    def on_tree_item_activated(self, item_type: str, item_name: str):
        """处理树项目激活"""
        if hasattr(self.message_center, 'add_message'):
            self.message_center.add_message(f"选择了 {item_type}: {item_name}", "info")
    
    def show_about(self):
        """显示关于对话框"""
        about_text = """
        <h2>DeepCAD Professional CAE System</h2>
        <p><b>版本:</b> 2.0</p>
        <p><b>描述:</b> 专业级工程分析平台</p>
        <hr>
        <h3>集成模块:</h3>
        <ul>
        <li>深基坑工程分析系统</li>
        <li>地质隐式建模系统</li>
        <li>地球物理计算模块</li>
        <li>3D可视化与后处理</li>
        <li>材料管理与数据库</li>
        </ul>
        <hr>
        <p><b>开发团队:</b> DeepCAD Team</p>
        <p><b>技术支持:</b> support@deepcad.com</p>
        """
        QMessageBox.about(self, "关于 DeepCAD", about_text)
    
    # 占位符方法
    def undo_action(self): pass
    def redo_action(self): pass
    def copy_action(self): pass
    def paste_action(self): pass
    def delete_action(self): pass
    def import_cad_model(self): pass
    def import_borehole_data(self): pass
    def import_surface_points(self): pass
    def import_geophysics_data(self): pass
    def export_analysis_report(self): pass
    def export_3d_model(self): pass
    def export_data_tables(self): pass
    def create_excavation_model(self): pass
    def create_geological_model(self): pass
    def edit_model_parameters(self): pass
    def define_soil_materials(self): pass
    def define_support_materials(self): pass
    def define_rock_materials(self): pass
    def auto_mesh_generation(self): pass
    def manual_mesh_control(self): pass
    def mesh_quality_check(self): pass
    def static_analysis(self): pass
    def dynamic_analysis(self): pass
    def stability_analysis(self): pass
    def seepage_analysis(self): pass
    def implicit_modeling(self): pass
    def stratigraphic_sequence(self): pass
    def structural_analysis(self): pass
    def gravity_modeling(self): pass
    def magnetic_modeling(self): pass
    def inversion_calculation(self): pass
    def view_stress_distribution(self): pass
    def view_displacement_contour(self): pass
    def view_safety_factor(self): pass
    def view_geological_sections(self): pass
    def generate_report(self): pass
    def parameter_optimization(self): pass
    def batch_analysis(self): pass
    def data_query_tools(self): pass
    def system_settings(self): pass
    def reset_view(self): pass
    def fit_to_window(self): pass
    def toggle_model_tree(self): pass
    def toggle_property_panel(self): pass
    def toggle_message_center(self): pass
    def toggle_analysis_monitor(self): pass
    def show_user_manual(self): pass
    def show_video_tutorials(self): pass
    def open_example_projects(self): pass
    def check_updates(self): pass
    def geometry_modeling(self): pass
    def mesh_generation(self): pass
    def start_analysis(self): pass
    def view_results(self): pass
    def isometric_view(self): pass
    def front_view(self): pass
    def side_view(self): pass
    def top_view(self): pass
    def wireframe_mode(self): pass
    def solid_mode(self): pass
    def transparent_mode(self): pass
    def open_recent_project(self): pass


def main():
    """主函数"""
    app = QApplication(sys.argv)
    app.setApplicationName("DeepCAD Professional CAE")
    app.setApplicationVersion("2.0")
    app.setOrganizationName("DeepCAD Team")
    
    # 设置应用程序图标
    if ICONS_AVAILABLE:
        app.setWindowIcon(qta.icon('fa5s.cube', color='#2c3e50'))
    
    # 创建主窗口
    window = AbaqusStyleMainWindow()
    window.show()
    
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())