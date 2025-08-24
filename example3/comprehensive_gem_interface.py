"""
GEM综合建模系统 - 完整功能界面设计
Comprehensive GEM Modeling System - Complete Functional Interface

重新设计的专业级地质建模CAE系统，展示所有功能模块
基于现代CAE软件的工作流设计理念
"""

import sys
import os
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any
import json
from pathlib import Path
import traceback

# PyQt6 imports
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QSplitter, QTabWidget, QTextEdit, QToolBar, QMenuBar, QStatusBar, 
    QDockWidget, QGroupBox, QFormLayout, QLabel, QLineEdit, QPushButton, 
    QComboBox, QSpinBox, QDoubleSpinBox, QCheckBox, QProgressBar, 
    QFileDialog, QMessageBox, QDialog, QDialogButtonBox, QScrollArea,
    QFrame, QButtonGroup, QRadioButton, QSlider, QListWidget, QGridLayout,
    QToolButton, QSizePolicy, QTreeWidget, QTreeWidgetItem, QTableWidget,
    QTableWidgetItem, QHeaderView, QStackedWidget, QStackedLayout
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer, QMimeData, QUrl, QSize
from PyQt6.QtGui import (
    QAction, QIcon, QFont, QPixmap, QPalette, QColor, QDragEnterEvent, 
    QDropEvent, QStandardItemModel, QStandardItem, QKeySequence
)

# Scientific computing
import pyvista as pv
import pyvistaqt as pvqt
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure

# Import existing modules
try:
    import gempy as gp
    GEMPY_AVAILABLE = True
except ImportError:
    GEMPY_AVAILABLE = False

try:
    import qtawesome as qta
    ICONS_AVAILABLE = True
except ImportError:
    ICONS_AVAILABLE = False

class WorkflowManager:
    """工作流管理器 - 管理各个功能模块的状态和数据流"""
    
    def __init__(self):
        self.current_project = None
        self.data_registry = {
            'boreholes': None,
            'geological_model': None,
            'fault_network': None,
            'geophysical_results': None,
            'uncertainty_results': None
        }
        self.workflow_state = {
            'data_loaded': False,
            'model_built': False,
            'faults_analyzed': False,
            'geophysics_calculated': False,
            'uncertainty_completed': False
        }
    
    def update_data(self, data_type: str, data: Any):
        """更新数据注册表"""
        self.data_registry[data_type] = data
        self.check_workflow_state()
    
    def check_workflow_state(self):
        """检查工作流状态"""
        self.workflow_state['data_loaded'] = self.data_registry['boreholes'] is not None
        self.workflow_state['model_built'] = self.data_registry['geological_model'] is not None
        # 其他状态检查...

class ComprehensiveGEMInterface(QMainWindow):
    """综合GEM建模系统主界面"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GEM综合建模系统 - Comprehensive Geological Modeling")
        self.setGeometry(100, 100, 1600, 1000)
        
        # 初始化组件
        self.workflow_manager = WorkflowManager()
        self.init_ui()
        self.create_menu_system()
        self.create_toolbar_system()
        self.create_status_system()
        self.apply_modern_styling()
        
    def init_ui(self):
        """初始化用户界面"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 创建主布局
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(5, 5, 5, 5)
        
        # 创建主要工作区域
        self.create_main_workspace(main_layout)
        
        # 创建停靠窗口
        self.create_dock_widgets()
    
    def create_main_workspace(self, main_layout):
        """创建主工作区域"""
        # 创建主分割器
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(main_splitter)
        
        # 左侧面板 (项目浏览器 + 快速工具)
        self.create_left_panel(main_splitter)
        
        # 中央工作区域
        self.create_central_workspace(main_splitter)
        
        # 右侧面板 (属性 + 结果)
        self.create_right_panel(main_splitter)
        
        # 设置分割器比例
        main_splitter.setSizes([250, 1000, 300])
    
    def create_left_panel(self, splitter):
        """创建左侧面板"""
        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)
        
        # 项目浏览器
        project_group = QGroupBox("项目浏览器")
        project_layout = QVBoxLayout(project_group)
        
        self.project_tree = QTreeWidget()
        self.project_tree.setHeaderLabels(['项目结构'])
        self.setup_project_tree()
        project_layout.addWidget(self.project_tree)
        
        left_layout.addWidget(project_group)
        
        # 快速工具面板
        tools_group = QGroupBox("快速工具")
        tools_layout = QGridLayout(tools_group)
        
        # 添加快速工具按钮
        self.add_quick_tool_buttons(tools_layout)
        
        left_layout.addWidget(tools_group)
        
        # 工作流状态面板
        workflow_group = QGroupBox("工作流状态")
        workflow_layout = QVBoxLayout(workflow_group)
        
        self.workflow_status = QLabel("准备就绪")
        self.workflow_progress = QProgressBar()
        workflow_layout.addWidget(self.workflow_status)
        workflow_layout.addWidget(self.workflow_progress)
        
        left_layout.addWidget(workflow_group)
        
        left_layout.addStretch()
        splitter.addWidget(left_panel)
    
    def create_central_workspace(self, splitter):
        """创建中央工作区域"""
        central_widget = QWidget()
        central_layout = QVBoxLayout(central_widget)
        
        # 创建标签页工作区
        self.main_tabs = QTabWidget()
        self.main_tabs.setTabPosition(QTabWidget.TabPosition.North)
        self.main_tabs.setMovable(True)
        
        # 添加各个功能标签页
        self.create_data_management_tab()
        self.create_geological_modeling_tab()
        self.create_fault_analysis_tab()
        self.create_geophysical_modeling_tab()
        self.create_uncertainty_analysis_tab()
        self.create_visualization_tab()
        self.create_results_analysis_tab()
        
        central_layout.addWidget(self.main_tabs)
        splitter.addWidget(central_widget)
    
    def create_data_management_tab(self):
        """创建数据管理标签页"""
        data_tab = QWidget()
        data_layout = QVBoxLayout(data_tab)
        
        # 数据导入区域
        import_group = QGroupBox("数据导入与管理")
        import_layout = QGridLayout(import_group)
        
        # 钻孔数据导入
        borehole_label = QLabel("钻孔数据:")
        borehole_button = QPushButton("导入钻孔数据")
        borehole_button.clicked.connect(self.import_borehole_data)
        import_layout.addWidget(borehole_label, 0, 0)
        import_layout.addWidget(borehole_button, 0, 1)
        
        # 地层数据导入
        strata_label = QLabel("地层数据:")
        strata_button = QPushButton("导入地层数据")
        strata_button.clicked.connect(self.import_strata_data)
        import_layout.addWidget(strata_label, 1, 0)
        import_layout.addWidget(strata_button, 1, 1)
        
        # 断层数据导入
        fault_label = QLabel("断层数据:")
        fault_button = QPushButton("导入断层数据")
        fault_button.clicked.connect(self.import_fault_data)
        import_layout.addWidget(fault_label, 2, 0)
        import_layout.addWidget(fault_button, 2, 1)
        
        # 地球物理数据导入
        geophys_label = QLabel("地球物理数据:")
        geophys_button = QPushButton("导入物探数据")
        geophys_button.clicked.connect(self.import_geophysical_data)
        import_layout.addWidget(geophys_label, 3, 0)
        import_layout.addWidget(geophys_button, 3, 1)
        
        data_layout.addWidget(import_group)
        
        # 数据预览区域
        preview_group = QGroupBox("数据预览")
        preview_layout = QVBoxLayout(preview_group)
        
        self.data_table = QTableWidget()
        preview_layout.addWidget(self.data_table)
        
        data_layout.addWidget(preview_group)
        
        # 数据质量检查
        quality_group = QGroupBox("数据质量检查")
        quality_layout = QHBoxLayout(quality_group)
        
        check_button = QPushButton("数据质量检查")
        check_button.clicked.connect(self.check_data_quality)
        validate_button = QPushButton("数据验证")
        validate_button.clicked.connect(self.validate_data)
        clean_button = QPushButton("数据清理")
        clean_button.clicked.connect(self.clean_data)
        
        quality_layout.addWidget(check_button)
        quality_layout.addWidget(validate_button)
        quality_layout.addWidget(clean_button)
        
        data_layout.addWidget(quality_group)
        
        self.main_tabs.addTab(data_tab, "数据管理")
    
    def create_geological_modeling_tab(self):
        """创建地质建模标签页"""
        modeling_tab = QWidget()
        modeling_layout = QVBoxLayout(modeling_tab)
        
        # 建模参数设置
        params_group = QGroupBox("建模参数设置")
        params_layout = QFormLayout(params_group)
        
        # 模型范围设置
        self.model_extent = QLineEdit("0,1000,0,1000,0,500")
        params_layout.addRow("模型范围 (xmin,xmax,ymin,ymax,zmin,zmax):", self.model_extent)
        
        # 分辨率设置
        self.model_resolution = QLineEdit("50,50,50")
        params_layout.addRow("模型分辨率 (nx,ny,nz):", self.model_resolution)
        
        # 插值方法
        self.interpolation_method = QComboBox()
        self.interpolation_method.addItems(["universal_kriging", "simple_kriging", "polynomial"])
        params_layout.addRow("插值方法:", self.interpolation_method)
        
        modeling_layout.addWidget(params_group)
        
        # 地层序列管理
        strata_group = QGroupBox("地层序列管理")
        strata_layout = QVBoxLayout(strata_group)
        
        strata_toolbar = QHBoxLayout()
        add_strata_btn = QPushButton("添加地层")
        remove_strata_btn = QPushButton("删除地层")
        edit_strata_btn = QPushButton("编辑地层")
        
        strata_toolbar.addWidget(add_strata_btn)
        strata_toolbar.addWidget(remove_strata_btn)
        strata_toolbar.addWidget(edit_strata_btn)
        strata_toolbar.addStretch()
        
        strata_layout.addLayout(strata_toolbar)
        
        self.strata_list = QListWidget()
        strata_layout.addWidget(self.strata_list)
        
        modeling_layout.addWidget(strata_group)
        
        # 建模控制
        control_group = QGroupBox("建模控制")
        control_layout = QHBoxLayout(control_group)
        
        build_model_btn = QPushButton("构建模型")
        build_model_btn.clicked.connect(self.build_geological_model)
        
        preview_model_btn = QPushButton("预览模型")
        preview_model_btn.clicked.connect(self.preview_model)
        
        export_model_btn = QPushButton("导出模型")
        export_model_btn.clicked.connect(self.export_model)
        
        control_layout.addWidget(build_model_btn)
        control_layout.addWidget(preview_model_btn)
        control_layout.addWidget(export_model_btn)
        control_layout.addStretch()
        
        modeling_layout.addWidget(control_group)
        
        self.main_tabs.addTab(modeling_tab, "地质建模")
    
    def create_fault_analysis_tab(self):
        """创建断层分析标签页"""
        fault_tab = QWidget()
        fault_layout = QVBoxLayout(fault_tab)
        
        # 断层网络管理
        network_group = QGroupBox("断层网络管理")
        network_layout = QVBoxLayout(network_group)
        
        # 断层工具栏
        fault_toolbar = QHBoxLayout()
        add_fault_btn = QPushButton("添加断层")
        add_fault_btn.clicked.connect(self.add_fault)
        
        edit_fault_btn = QPushButton("编辑断层")
        edit_fault_btn.clicked.connect(self.edit_fault)
        
        delete_fault_btn = QPushButton("删除断层")
        delete_fault_btn.clicked.connect(self.delete_fault)
        
        fault_toolbar.addWidget(add_fault_btn)
        fault_toolbar.addWidget(edit_fault_btn)
        fault_toolbar.addWidget(delete_fault_btn)
        fault_toolbar.addStretch()
        
        network_layout.addLayout(fault_toolbar)
        
        # 断层列表
        self.fault_list = QListWidget()
        network_layout.addWidget(self.fault_list)
        
        fault_layout.addWidget(network_group)
        
        # 断层关系矩阵
        relations_group = QGroupBox("断层关系矩阵")
        relations_layout = QVBoxLayout(relations_group)
        
        matrix_toolbar = QHBoxLayout()
        auto_detect_btn = QPushButton("自动检测关系")
        auto_detect_btn.clicked.connect(self.auto_detect_fault_relations)
        
        edit_matrix_btn = QPushButton("编辑矩阵")
        edit_matrix_btn.clicked.connect(self.edit_fault_matrix)
        
        matrix_toolbar.addWidget(auto_detect_btn)
        matrix_toolbar.addWidget(edit_matrix_btn)
        matrix_toolbar.addStretch()
        
        relations_layout.addLayout(matrix_toolbar)
        
        # 关系矩阵显示
        self.fault_matrix_table = QTableWidget()
        relations_layout.addWidget(self.fault_matrix_table)
        
        fault_layout.addWidget(relations_group)
        
        # 构造分析
        analysis_group = QGroupBox("构造分析")
        analysis_layout = QHBoxLayout(analysis_group)
        
        stress_analysis_btn = QPushButton("应力分析")
        stress_analysis_btn.clicked.connect(self.perform_stress_analysis)
        
        stability_btn = QPushButton("稳定性计算")
        stability_btn.clicked.connect(self.calculate_fault_stability)
        
        evolution_btn = QPushButton("演化模拟")
        evolution_btn.clicked.connect(self.simulate_fault_evolution)
        
        analysis_layout.addWidget(stress_analysis_btn)
        analysis_layout.addWidget(stability_btn)
        analysis_layout.addWidget(evolution_btn)
        analysis_layout.addStretch()
        
        fault_layout.addWidget(analysis_group)
        
        self.main_tabs.addTab(fault_tab, "断层分析")
    
    def create_geophysical_modeling_tab(self):
        """创建地球物理建模标签页"""
        geophys_tab = QWidget()
        geophys_layout = QVBoxLayout(geophys_tab)
        
        # 方法选择
        method_group = QGroupBox("地球物理方法")
        method_layout = QGridLayout(method_group)
        
        # 重力建模
        gravity_btn = QPushButton("重力建模")
        gravity_btn.clicked.connect(self.open_gravity_modeling)
        method_layout.addWidget(gravity_btn, 0, 0)
        
        # 磁力建模
        magnetic_btn = QPushButton("磁力建模")
        magnetic_btn.clicked.connect(self.open_magnetic_modeling)
        method_layout.addWidget(magnetic_btn, 0, 1)
        
        # 电法建模
        electrical_btn = QPushButton("电法建模")
        electrical_btn.clicked.connect(self.open_electrical_modeling)
        method_layout.addWidget(electrical_btn, 1, 0)
        
        # 地震建模
        seismic_btn = QPushButton("地震建模")
        seismic_btn.clicked.connect(self.open_seismic_modeling)
        method_layout.addWidget(seismic_btn, 1, 1)
        
        geophys_layout.addWidget(method_group)
        
        # 参数设置
        params_group = QGroupBox("建模参数")
        params_layout = QFormLayout(params_group)
        
        # 观测点设置
        self.obs_points = QLineEdit("自动生成")
        params_layout.addRow("观测点:", self.obs_points)
        
        # 观测高度
        self.obs_height = QDoubleSpinBox()
        self.obs_height.setRange(0, 1000)
        self.obs_height.setValue(10)
        params_layout.addRow("观测高度 (m):", self.obs_height)
        
        # 计算分辨率
        self.calc_resolution = QSpinBox()
        self.calc_resolution.setRange(10, 500)
        self.calc_resolution.setValue(50)
        params_layout.addRow("计算分辨率:", self.calc_resolution)
        
        geophys_layout.addWidget(params_group)
        
        # 物性参数管理
        properties_group = QGroupBox("物性参数管理")
        properties_layout = QVBoxLayout(properties_group)
        
        properties_toolbar = QHBoxLayout()
        import_properties_btn = QPushButton("导入物性参数")
        import_properties_btn.clicked.connect(self.import_physical_properties)
        
        edit_properties_btn = QPushButton("编辑物性参数")
        edit_properties_btn.clicked.connect(self.edit_physical_properties)
        
        properties_toolbar.addWidget(import_properties_btn)
        properties_toolbar.addWidget(edit_properties_btn)
        properties_toolbar.addStretch()
        
        properties_layout.addLayout(properties_toolbar)
        
        # 物性参数表格
        self.properties_table = QTableWidget()
        self.properties_table.setColumnCount(4)
        self.properties_table.setHorizontalHeaderLabels(['地层', '密度', '磁化率', '电阻率'])
        properties_layout.addWidget(self.properties_table)
        
        geophys_layout.addWidget(properties_group)
        
        # 计算控制
        calc_group = QGroupBox("计算控制")
        calc_layout = QHBoxLayout(calc_group)
        
        calculate_btn = QPushButton("开始计算")
        calculate_btn.clicked.connect(self.start_geophysical_calculation)
        
        stop_calc_btn = QPushButton("停止计算")
        stop_calc_btn.clicked.connect(self.stop_calculation)
        
        export_results_btn = QPushButton("导出结果")
        export_results_btn.clicked.connect(self.export_geophysical_results)
        
        calc_layout.addWidget(calculate_btn)
        calc_layout.addWidget(stop_calc_btn)
        calc_layout.addWidget(export_results_btn)
        calc_layout.addStretch()
        
        geophys_layout.addWidget(calc_group)
        
        self.main_tabs.addTab(geophys_tab, "地球物理建模")
    
    def create_uncertainty_analysis_tab(self):
        """创建不确定性分析标签页"""
        uncertainty_tab = QWidget()
        uncertainty_layout = QVBoxLayout(uncertainty_tab)
        
        # 参数不确定性设置
        params_group = QGroupBox("参数不确定性设置")
        params_layout = QVBoxLayout(params_group)
        
        params_toolbar = QHBoxLayout()
        add_param_btn = QPushButton("添加不确定参数")
        add_param_btn.clicked.connect(self.add_uncertain_parameter)
        
        remove_param_btn = QPushButton("删除参数")
        remove_param_btn.clicked.connect(self.remove_uncertain_parameter)
        
        params_toolbar.addWidget(add_param_btn)
        params_toolbar.addWidget(remove_param_btn)
        params_toolbar.addStretch()
        
        params_layout.addLayout(params_toolbar)
        
        # 参数表格
        self.uncertain_params_table = QTableWidget()
        self.uncertain_params_table.setColumnCount(6)
        self.uncertain_params_table.setHorizontalHeaderLabels(
            ['参数名', '分布类型', '均值/最小值', '标准差/最大值', '最小值', '最大值']
        )
        params_layout.addWidget(self.uncertain_params_table)
        
        uncertainty_layout.addWidget(params_group)
        
        # 分析方法选择
        method_group = QGroupBox("分析方法")
        method_layout = QGridLayout(method_group)
        
        # 蒙特卡洛模拟
        monte_carlo_btn = QPushButton("蒙特卡洛模拟")
        monte_carlo_btn.clicked.connect(self.run_monte_carlo)
        method_layout.addWidget(monte_carlo_btn, 0, 0)
        
        # 敏感性分析
        sensitivity_btn = QPushButton("敏感性分析")
        sensitivity_btn.clicked.connect(self.run_sensitivity_analysis)
        method_layout.addWidget(sensitivity_btn, 0, 1)
        
        # 贝叶斯分析
        bayesian_btn = QPushButton("贝叶斯分析")
        bayesian_btn.clicked.connect(self.run_bayesian_analysis)
        method_layout.addWidget(bayesian_btn, 1, 0)
        
        # Sobol分析
        sobol_btn = QPushButton("Sobol指数分析")
        sobol_btn.clicked.connect(self.run_sobol_analysis)
        method_layout.addWidget(sobol_btn, 1, 1)
        
        uncertainty_layout.addWidget(method_group)
        
        # 分析设置
        settings_group = QGroupBox("分析设置")
        settings_layout = QFormLayout(settings_group)
        
        # 采样数量
        self.n_samples = QSpinBox()
        self.n_samples.setRange(100, 100000)
        self.n_samples.setValue(1000)
        settings_layout.addRow("采样数量:", self.n_samples)
        
        # 并行处理
        self.parallel_workers = QSpinBox()
        self.parallel_workers.setRange(1, 16)
        self.parallel_workers.setValue(4)
        settings_layout.addRow("并行工作线程:", self.parallel_workers)
        
        # 随机种子
        self.random_seed = QSpinBox()
        self.random_seed.setRange(0, 999999)
        self.random_seed.setValue(42)
        settings_layout.addRow("随机种子:", self.random_seed)
        
        uncertainty_layout.addWidget(settings_group)
        
        # 进度监控
        progress_group = QGroupBox("计算进度")
        progress_layout = QVBoxLayout(progress_group)
        
        self.uncertainty_progress = QProgressBar()
        progress_layout.addWidget(self.uncertainty_progress)
        
        self.uncertainty_status = QLabel("准备就绪")
        progress_layout.addWidget(self.uncertainty_status)
        
        uncertainty_layout.addWidget(progress_group)
        
        self.main_tabs.addTab(uncertainty_tab, "不确定性分析")
    
    def create_visualization_tab(self):
        """创建可视化标签页"""
        viz_tab = QWidget()
        viz_layout = QVBoxLayout(viz_tab)
        
        # 3D视图控制
        view_group = QGroupBox("3D视图控制")
        view_layout = QVBoxLayout(view_group)
        
        # 视图工具栏
        view_toolbar = QHBoxLayout()
        
        if ICONS_AVAILABLE:
            iso_btn = QPushButton(qta.icon('fa5s.cube'), "等轴视图")
            top_btn = QPushButton(qta.icon('fa5s.eye'), "俯视图")
            front_btn = QPushButton(qta.icon('fa5s.arrow-up'), "前视图")
            side_btn = QPushButton(qta.icon('fa5s.arrow-right'), "侧视图")
        else:
            iso_btn = QPushButton("等轴视图")
            top_btn = QPushButton("俯视图")
            front_btn = QPushButton("前视图")
            side_btn = QPushButton("侧视图")
        
        iso_btn.clicked.connect(self.set_isometric_view)
        top_btn.clicked.connect(self.set_top_view)
        front_btn.clicked.connect(self.set_front_view)
        side_btn.clicked.connect(self.set_side_view)
        
        view_toolbar.addWidget(iso_btn)
        view_toolbar.addWidget(top_btn)
        view_toolbar.addWidget(front_btn)
        view_toolbar.addWidget(side_btn)
        view_toolbar.addStretch()
        
        view_layout.addLayout(view_toolbar)
        
        # 渲染设置
        render_toolbar = QHBoxLayout()
        
        wireframe_btn = QPushButton("线框模式")
        surface_btn = QPushButton("表面模式")
        transparent_btn = QPushButton("透明模式")
        
        wireframe_btn.clicked.connect(self.set_wireframe_mode)
        surface_btn.clicked.connect(self.set_surface_mode)
        transparent_btn.clicked.connect(self.set_transparent_mode)
        
        render_toolbar.addWidget(wireframe_btn)
        render_toolbar.addWidget(surface_btn)
        render_toolbar.addWidget(transparent_btn)
        render_toolbar.addStretch()
        
        view_layout.addLayout(render_toolbar)
        
        viz_layout.addWidget(view_group)
        
        # 图层控制
        layers_group = QGroupBox("图层控制")
        layers_layout = QVBoxLayout(layers_group)
        
        # 图层列表
        self.layers_list = QListWidget()
        self.layers_list.setSelectionMode(QListWidget.SelectionMode.MultiSelection)
        layers_layout.addWidget(self.layers_list)
        
        # 图层工具栏
        layers_toolbar = QHBoxLayout()
        
        show_all_btn = QPushButton("显示全部")
        hide_all_btn = QPushButton("隐藏全部")
        invert_selection_btn = QPushButton("反选")
        
        show_all_btn.clicked.connect(self.show_all_layers)
        hide_all_btn.clicked.connect(self.hide_all_layers)
        invert_selection_btn.clicked.connect(self.invert_layer_selection)
        
        layers_toolbar.addWidget(show_all_btn)
        layers_toolbar.addWidget(hide_all_btn)
        layers_toolbar.addWidget(invert_selection_btn)
        layers_toolbar.addStretch()
        
        layers_layout.addLayout(layers_toolbar)
        
        viz_layout.addWidget(layers_group)
        
        # 剖面工具
        section_group = QGroupBox("剖面工具")
        section_layout = QVBoxLayout(section_group)
        
        section_toolbar = QHBoxLayout()
        
        create_section_btn = QPushButton("创建剖面")
        edit_section_btn = QPushButton("编辑剖面")
        delete_section_btn = QPushButton("删除剖面")
        
        create_section_btn.clicked.connect(self.create_cross_section)
        edit_section_btn.clicked.connect(self.edit_cross_section)
        delete_section_btn.clicked.connect(self.delete_cross_section)
        
        section_toolbar.addWidget(create_section_btn)
        section_toolbar.addWidget(edit_section_btn)
        section_toolbar.addWidget(delete_section_btn)
        section_toolbar.addStretch()
        
        section_layout.addLayout(section_toolbar)
        
        # 剖面列表
        self.sections_list = QListWidget()
        section_layout.addWidget(self.sections_list)
        
        viz_layout.addWidget(section_group)
        
        # 动画控制
        animation_group = QGroupBox("动画控制")
        animation_layout = QVBoxLayout(animation_group)
        
        anim_toolbar = QHBoxLayout()
        
        start_anim_btn = QPushButton("开始动画")
        stop_anim_btn = QPushButton("停止动画")
        record_btn = QPushButton("录制视频")
        
        start_anim_btn.clicked.connect(self.start_animation)
        stop_anim_btn.clicked.connect(self.stop_animation)
        record_btn.clicked.connect(self.record_animation)
        
        anim_toolbar.addWidget(start_anim_btn)
        anim_toolbar.addWidget(stop_anim_btn)
        anim_toolbar.addWidget(record_btn)
        anim_toolbar.addStretch()
        
        animation_layout.addLayout(anim_toolbar)
        
        viz_layout.addWidget(animation_group)
        
        self.main_tabs.addTab(viz_tab, "3D可视化")
    
    def create_results_analysis_tab(self):
        """创建结果分析标签页"""
        results_tab = QWidget()
        results_layout = QVBoxLayout(results_tab)
        
        # 结果类型选择
        type_group = QGroupBox("结果类型")
        type_layout = QGridLayout(type_group)
        
        # 添加结果类型按钮
        model_results_btn = QPushButton("地质模型结果")
        fault_results_btn = QPushButton("断层分析结果")
        geophys_results_btn = QPushButton("地球物理结果")
        uncertainty_results_btn = QPushButton("不确定性结果")
        
        model_results_btn.clicked.connect(self.show_model_results)
        fault_results_btn.clicked.connect(self.show_fault_results)
        geophys_results_btn.clicked.connect(self.show_geophysical_results)
        uncertainty_results_btn.clicked.connect(self.show_uncertainty_results)
        
        type_layout.addWidget(model_results_btn, 0, 0)
        type_layout.addWidget(fault_results_btn, 0, 1)
        type_layout.addWidget(geophys_results_btn, 1, 0)
        type_layout.addWidget(uncertainty_results_btn, 1, 1)
        
        results_layout.addWidget(type_group)
        
        # 结果展示区域
        display_group = QGroupBox("结果展示")
        display_layout = QVBoxLayout(display_group)
        
        # 创建结果展示的标签页
        self.results_tabs = QTabWidget()
        
        # 图表展示
        charts_widget = QWidget()
        charts_layout = QVBoxLayout(charts_widget)
        
        # 这里可以添加matplotlib图表
        self.results_figure = Figure(figsize=(10, 6))
        self.results_canvas = FigureCanvas(self.results_figure)
        charts_layout.addWidget(self.results_canvas)
        
        self.results_tabs.addTab(charts_widget, "图表")
        
        # 表格展示
        table_widget = QWidget()
        table_layout = QVBoxLayout(table_widget)
        
        self.results_table = QTableWidget()
        table_layout.addWidget(self.results_table)
        
        self.results_tabs.addTab(table_widget, "数据表格")
        
        # 统计分析
        stats_widget = QWidget()
        stats_layout = QVBoxLayout(stats_widget)
        
        self.stats_text = QTextEdit()
        self.stats_text.setReadOnly(True)
        stats_layout.addWidget(self.stats_text)
        
        self.results_tabs.addTab(stats_widget, "统计分析")
        
        display_layout.addWidget(self.results_tabs)
        results_layout.addWidget(display_group)
        
        # 导出控制
        export_group = QGroupBox("结果导出")
        export_layout = QHBoxLayout(export_group)
        
        export_chart_btn = QPushButton("导出图表")
        export_data_btn = QPushButton("导出数据")
        export_report_btn = QPushButton("生成报告")
        
        export_chart_btn.clicked.connect(self.export_chart)
        export_data_btn.clicked.connect(self.export_data)
        export_report_btn.clicked.connect(self.generate_report)
        
        export_layout.addWidget(export_chart_btn)
        export_layout.addWidget(export_data_btn)
        export_layout.addWidget(export_report_btn)
        export_layout.addStretch()
        
        results_layout.addWidget(export_group)
        
        self.main_tabs.addTab(results_tab, "结果分析")
    
    def create_right_panel(self, splitter):
        """创建右侧面板"""
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        
        # 属性面板
        properties_group = QGroupBox("属性面板")
        properties_layout = QVBoxLayout(properties_group)
        
        self.properties_tree = QTreeWidget()
        self.properties_tree.setHeaderLabels(['属性', '值'])
        properties_layout.addWidget(self.properties_tree)
        
        right_layout.addWidget(properties_group)
        
        # 实时监控
        monitor_group = QGroupBox("实时监控")
        monitor_layout = QVBoxLayout(monitor_group)
        
        # 计算状态
        self.calc_status_label = QLabel("计算状态: 空闲")
        monitor_layout.addWidget(self.calc_status_label)
        
        # 内存使用
        self.memory_label = QLabel("内存使用: 0 MB")
        monitor_layout.addWidget(self.memory_label)
        
        # 处理时间
        self.time_label = QLabel("处理时间: 0 s")
        monitor_layout.addWidget(self.time_label)
        
        right_layout.addWidget(monitor_group)
        
        right_layout.addStretch()
        splitter.addWidget(right_panel)
    
    def create_dock_widgets(self):
        """创建停靠窗口"""
        # 3D视口停靠窗口
        self.viewport_dock = QDockWidget("3D视口", self)
        self.viewport_dock.setAllowedAreas(Qt.DockWidgetArea.AllDockWidgetAreas)
        
        viewport_widget = QWidget()
        viewport_layout = QVBoxLayout(viewport_widget)
        
        # 创建PyVista渲染器
        try:
            self.plotter = pvqt.QtInteractor(viewport_widget)
            self.plotter.set_background([0.2, 0.3, 0.4])
            viewport_layout.addWidget(self.plotter)
            
            # 添加坐标轴
            self.plotter.add_axes()
            
        except Exception as e:
            print(f"3D视口初始化失败: {e}")
            error_label = QLabel("3D视口加载失败，请检查PyVista安装")
            viewport_layout.addWidget(error_label)
        
        self.viewport_dock.setWidget(viewport_widget)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.viewport_dock)
        
        # 消息中心停靠窗口
        self.messages_dock = QDockWidget("消息中心", self)
        self.messages_dock.setAllowedAreas(Qt.DockWidgetArea.BottomDockWidgetArea)
        
        self.message_text = QTextEdit()
        self.message_text.setMaximumHeight(150)
        self.message_text.setReadOnly(True)
        self.messages_dock.setWidget(self.message_text)
        
        self.addDockWidget(Qt.DockWidgetArea.BottomDockWidgetArea, self.messages_dock)
    
    def setup_project_tree(self):
        """设置项目树结构"""
        # 数据项
        data_item = QTreeWidgetItem(self.project_tree, ["数据"])
        QTreeWidgetItem(data_item, ["钻孔数据 (0)"])
        QTreeWidgetItem(data_item, ["地层数据 (0)"])
        QTreeWidgetItem(data_item, ["断层数据 (0)"])
        QTreeWidgetItem(data_item, ["物探数据 (0)"])
        
        # 模型项
        model_item = QTreeWidgetItem(self.project_tree, ["模型"])
        QTreeWidgetItem(model_item, ["地质模型"])
        QTreeWidgetItem(model_item, ["断层网络"])
        QTreeWidgetItem(model_item, ["物性模型"])
        
        # 分析结果项
        results_item = QTreeWidgetItem(self.project_tree, ["分析结果"])
        QTreeWidgetItem(results_item, ["地球物理结果"])
        QTreeWidgetItem(results_item, ["不确定性结果"])
        QTreeWidgetItem(results_item, ["构造分析结果"])
        
        self.project_tree.expandAll()
    
    def add_quick_tool_buttons(self, layout):
        """添加快速工具按钮"""
        # 第一行
        new_project_btn = QPushButton("新建项目")
        open_project_btn = QPushButton("打开项目")
        layout.addWidget(new_project_btn, 0, 0)
        layout.addWidget(open_project_btn, 0, 1)
        
        # 第二行
        import_data_btn = QPushButton("导入数据")
        build_model_btn = QPushButton("构建模型")
        layout.addWidget(import_data_btn, 1, 0)
        layout.addWidget(build_model_btn, 1, 1)
        
        # 第三行
        run_analysis_btn = QPushButton("运行分析")
        export_results_btn = QPushButton("导出结果")
        layout.addWidget(run_analysis_btn, 2, 0)
        layout.addWidget(export_results_btn, 2, 1)
        
        # 连接信号
        new_project_btn.clicked.connect(self.new_project)
        open_project_btn.clicked.connect(self.open_project)
        import_data_btn.clicked.connect(self.quick_import_data)
        build_model_btn.clicked.connect(self.quick_build_model)
        run_analysis_btn.clicked.connect(self.quick_run_analysis)
        export_results_btn.clicked.connect(self.quick_export_results)
    
    def create_menu_system(self):
        """创建菜单系统"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu('文件')
        
        new_action = QAction('新建项目', self)
        new_action.setShortcut(QKeySequence.StandardKey.New)
        new_action.triggered.connect(self.new_project)
        file_menu.addAction(new_action)
        
        open_action = QAction('打开项目', self)
        open_action.setShortcut(QKeySequence.StandardKey.Open)
        open_action.triggered.connect(self.open_project)
        file_menu.addAction(open_action)
        
        save_action = QAction('保存项目', self)
        save_action.setShortcut(QKeySequence.StandardKey.Save)
        save_action.triggered.connect(self.save_project)
        file_menu.addAction(save_action)
        
        file_menu.addSeparator()
        
        import_menu = file_menu.addMenu('导入')
        import_menu.addAction('钻孔数据', self.import_borehole_data)
        import_menu.addAction('地层数据', self.import_strata_data)
        import_menu.addAction('断层数据', self.import_fault_data)
        import_menu.addAction('地球物理数据', self.import_geophysical_data)
        
        export_menu = file_menu.addMenu('导出')
        export_menu.addAction('地质模型', self.export_model)
        export_menu.addAction('分析结果', self.export_results)
        export_menu.addAction('完整项目', self.export_project)
        
        # 编辑菜单
        edit_menu = menubar.addMenu('编辑')
        edit_menu.addAction('撤销', self.undo_action)
        edit_menu.addAction('重做', self.redo_action)
        edit_menu.addSeparator()
        edit_menu.addAction('项目设置', self.project_settings)
        edit_menu.addAction('系统设置', self.system_settings)
        
        # 建模菜单
        modeling_menu = menubar.addMenu('建模')
        modeling_menu.addAction('地质建模', lambda: self.main_tabs.setCurrentIndex(1))
        modeling_menu.addAction('断层分析', lambda: self.main_tabs.setCurrentIndex(2))
        modeling_menu.addAction('地球物理建模', lambda: self.main_tabs.setCurrentIndex(3))
        
        # 分析菜单
        analysis_menu = menubar.addMenu('分析')
        analysis_menu.addAction('不确定性分析', lambda: self.main_tabs.setCurrentIndex(4))
        analysis_menu.addAction('敏感性分析', self.run_sensitivity_analysis)
        analysis_menu.addAction('贝叶斯分析', self.run_bayesian_analysis)
        
        # 可视化菜单
        viz_menu = menubar.addMenu('可视化')
        viz_menu.addAction('3D可视化', lambda: self.main_tabs.setCurrentIndex(5))
        viz_menu.addAction('2D剖面', self.create_2d_section)
        viz_menu.addAction('统计图表', self.create_statistics_chart)
        
        # 工具菜单
        tools_menu = menubar.addMenu('工具')
        tools_menu.addAction('数据质量检查', self.check_data_quality)
        tools_menu.addAction('模型验证', self.validate_model)
        tools_menu.addAction('性能监控', self.show_performance_monitor)
        tools_menu.addAction('批处理', self.open_batch_processor)
        
        # 帮助菜单
        help_menu = menubar.addMenu('帮助')
        help_menu.addAction('用户手册', self.show_user_manual)
        help_menu.addAction('快速教程', self.show_tutorial)
        help_menu.addAction('关于', self.show_about)
    
    def create_toolbar_system(self):
        """创建工具栏系统"""
        # 主工具栏
        main_toolbar = self.addToolBar('主工具栏')
        main_toolbar.setMovable(False)
        
        if ICONS_AVAILABLE:
            new_icon = qta.icon('fa5s.file')
            open_icon = qta.icon('fa5s.folder-open')
            save_icon = qta.icon('fa5s.save')
            build_icon = qta.icon('fa5s.hammer')
            run_icon = qta.icon('fa5s.play')
        else:
            new_icon = self.style().standardIcon(self.style().StandardPixmap.SP_FileIcon)
            open_icon = self.style().standardIcon(self.style().StandardPixmap.SP_DirOpenIcon)
            save_icon = self.style().standardIcon(self.style().StandardPixmap.SP_DialogSaveButton)
            build_icon = self.style().standardIcon(self.style().StandardPixmap.SP_ComputerIcon)
            run_icon = self.style().standardIcon(self.style().StandardPixmap.SP_MediaPlay)
        
        new_action = QAction(new_icon, '新建', self)
        new_action.triggered.connect(self.new_project)
        main_toolbar.addAction(new_action)
        
        open_action = QAction(open_icon, '打开', self)
        open_action.triggered.connect(self.open_project)
        main_toolbar.addAction(open_action)
        
        save_action = QAction(save_icon, '保存', self)
        save_action.triggered.connect(self.save_project)
        main_toolbar.addAction(save_action)
        
        main_toolbar.addSeparator()
        
        build_action = QAction(build_icon, '构建模型', self)
        build_action.triggered.connect(self.build_geological_model)
        main_toolbar.addAction(build_action)
        
        run_action = QAction(run_icon, '运行分析', self)
        run_action.triggered.connect(self.quick_run_analysis)
        main_toolbar.addAction(run_action)
    
    def create_status_system(self):
        """创建状态栏系统"""
        status_bar = self.statusBar()
        
        # 主状态信息
        self.status_label = QLabel("就绪")
        status_bar.addWidget(self.status_label)
        
        # 进度条
        self.main_progress = QProgressBar()
        self.main_progress.setMaximumWidth(200)
        self.main_progress.setVisible(False)
        status_bar.addPermanentWidget(self.main_progress)
        
        # 系统信息
        self.system_info = QLabel("内存: 0MB | CPU: 0%")
        status_bar.addPermanentWidget(self.system_info)
        
        # 定时更新系统信息
        self.status_timer = QTimer()
        self.status_timer.timeout.connect(self.update_system_info)
        self.status_timer.start(2000)  # 每2秒更新一次
    
    def apply_modern_styling(self):
        """应用现代化样式"""
        style = """
        QMainWindow {
            background-color: #f5f5f5;
            color: #333333;
        }
        
        QTabWidget::pane {
            border: 1px solid #c0c0c0;
            background-color: white;
        }
        
        QTabWidget::tab-bar {
            alignment: left;
        }
        
        QTabBar::tab {
            background-color: #e1e1e1;
            color: #333333;
            border: 1px solid #c0c0c0;
            border-bottom: none;
            padding: 8px 16px;
            margin-right: 2px;
        }
        
        QTabBar::tab:selected {
            background-color: white;
            border-bottom: 2px solid #2196F3;
        }
        
        QTabBar::tab:hover {
            background-color: #f0f0f0;
        }
        
        QGroupBox {
            font-weight: bold;
            border: 2px solid #cccccc;
            border-radius: 5px;
            margin-top: 10px;
            padding-top: 10px;
            background-color: white;
        }
        
        QGroupBox::title {
            subcontrol-origin: margin;
            left: 10px;
            padding: 0 5px 0 5px;
            color: #2196F3;
        }
        
        QPushButton {
            background-color: #2196F3;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: bold;
        }
        
        QPushButton:hover {
            background-color: #1976D2;
        }
        
        QPushButton:pressed {
            background-color: #0D47A1;
        }
        
        QTreeWidget {
            border: 1px solid #d0d0d0;
            background-color: white;
            alternate-background-color: #f9f9f9;
        }
        
        QTableWidget {
            border: 1px solid #d0d0d0;
            background-color: white;
            gridline-color: #e0e0e0;
        }
        
        QDockWidget {
            border: 1px solid #c0c0c0;
            titlebar-close-icon: url(close.png);
            titlebar-normal-icon: url(float.png);
        }
        
        QDockWidget::title {
            text-align: left;
            background: #e1e1e1;
            padding-left: 5px;
            padding-top: 3px;
            padding-bottom: 3px;
        }
        """
        
        self.setStyleSheet(style)
    
    def log_message(self, message: str, level: str = "INFO"):
        """记录消息到消息中心"""
        import datetime
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        formatted_message = f"[{timestamp}] {level}: {message}"
        self.message_text.append(formatted_message)
        print(formatted_message)  # 同时输出到控制台
    
    def update_system_info(self):
        """更新系统信息"""
        try:
            import psutil
            memory_mb = psutil.virtual_memory().used // (1024 * 1024)
            cpu_percent = psutil.cpu_percent()
            self.system_info.setText(f"内存: {memory_mb}MB | CPU: {cpu_percent:.1f}%")
        except ImportError:
            self.system_info.setText("系统监控不可用")
    
    # ========== 事件处理方法 ==========
    
    # 项目管理
    def new_project(self):
        """新建项目"""
        self.log_message("创建新项目")
        # 这里添加新建项目的逻辑
        
    def open_project(self):
        """打开项目"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "打开项目", "", "GEM项目文件 (*.gem);;所有文件 (*)"
        )
        if file_path:
            self.log_message(f"打开项目: {file_path}")
            # 这里添加打开项目的逻辑
    
    def save_project(self):
        """保存项目"""
        self.log_message("保存项目")
        # 这里添加保存项目的逻辑
    
    # 数据导入
    def import_borehole_data(self):
        """导入钻孔数据"""
        self.log_message("导入钻孔数据")
        # 这里添加钻孔数据导入逻辑
        
    def import_strata_data(self):
        """导入地层数据"""
        self.log_message("导入地层数据")
        
    def import_fault_data(self):
        """导入断层数据"""
        self.log_message("导入断层数据")
        
    def import_geophysical_data(self):
        """导入地球物理数据"""
        self.log_message("导入地球物理数据")
    
    # 地质建模
    def build_geological_model(self):
        """构建地质模型"""
        self.log_message("开始构建地质模型")
        # 这里添加地质建模逻辑
    
    # 其他方法的实现...
    # (为了保持代码长度合理，这里省略了所有方法的具体实现)
    # 实际使用时需要根据具体功能需求来实现这些方法
    
    def show_about(self):
        """显示关于对话框"""
        QMessageBox.about(
            self, 
            "关于GEM系统", 
            "GEM综合建模系统 v2.0\n"
            "专业级地质隐式建模CAE软件\n"
            "支持断层分析、地球物理建模、不确定性分析等高级功能\n\n"
            "© 2024 DeepCAD Team"
        )

def main():
    """主函数"""
    app = QApplication(sys.argv)
    
    # 设置应用程序信息
    app.setApplicationName("GEM综合建模系统")
    app.setApplicationVersion("2.0.0")
    app.setOrganizationName("DeepCAD")
    
    # 创建主窗口
    window = ComprehensiveGEMInterface()
    window.show()
    
    # 显示启动信息
    window.log_message("GEM综合建模系统启动成功")
    window.log_message("所有功能模块已加载")
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()