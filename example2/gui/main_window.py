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
from example2.utils.error_handler import ErrorHandler, ErrorLevel


class MainWindow(QMainWindow):
    """Example2主窗口 - DeepCAD系统测试程序"""

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
            print("多线程操作管理器初始化成功")
        except ImportError:
            self.operation_manager = None
            print("多线程操作管理器不可用")

        self.current_project = None
        self.analysis_results = None

        self.init_ui()
        self.setup_connections()

    def init_ui(self):
        """初始化用户界面"""
        self.setWindowTitle("Example2 - DeepCAD系统测试程序 v1.0")
        self.setGeometry(100, 100, 1600, 1000)

        # 设置窗口图标
        self.setWindowIcon(self.style().standardIcon(self.style().SP_ComputerIcon))

        # 创建中央部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        # 创建主布局
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(8, 8, 8, 8)
        main_layout.setSpacing(8)

        # 创建工作流标签页
        self.workflow_tabs = QTabWidget()
        main_layout.addWidget(self.workflow_tabs)

        # 创建三大模块
        self.create_preprocessor_tab()
        self.create_analyzer_tab()
        self.create_postprocessor_tab()

        # 创建菜单栏
        self.create_menu_bar()

        # 创建工具栏
        self.create_tool_bar()

        # 创建状态栏
        self.create_status_bar()

        # 应用现代化样式
        self.apply_modern_style()

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

        self.import_fpn_btn = QPushButton("📄 导入FPN文件")
        self.generate_mesh_btn = QPushButton("🔨 生成网格")
        self.mesh_quality_btn = QPushButton("🔍 网格质量检查")

        for btn in [self.import_fpn_btn, self.generate_mesh_btn, self.mesh_quality_btn]:
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

        # 边界条件组 (只展示，不修改)
        boundary_group = QGroupBox("🔒 边界条件")
        boundary_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        boundary_layout = QVBoxLayout(boundary_group)

        self.boundary_list = QListWidget()
        self.boundary_list.setMaximumHeight(150)
        # 添加示例边界条件
        self.boundary_list.addItem("固定约束: 底面全约束")
        self.boundary_list.addItem("荷载: 顶面 100kN/m²")
        self.boundary_list.addItem("侧向约束: 法向约束")

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
        # 新增：仅显示激活材料（基于分析步）
        self.only_active_materials_cb = QCheckBox("仅显示激活材料")
        self.only_active_materials_cb.setChecked(False)
        # 新增：按材料类型分层显示（part 开关）
        self.show_soil_cb = QCheckBox("显示土体")
        self.show_soil_cb.setChecked(True)
        self.show_concrete_cb = QCheckBox("显示混凝土")
        self.show_concrete_cb.setChecked(True)
        self.show_steel_cb = QCheckBox("显示钢构/钢筋")
        self.show_steel_cb.setChecked(True)
        # 预应力路径显示（锚杆线元）
        self.show_anchors_cb = QCheckBox("显示预应力路径")
        self.show_anchors_cb.setChecked(False)

        # 土体分层选择
        soil_layer_layout = QHBoxLayout()
        soil_layer_layout.addWidget(QLabel("土体分层:"))
        self.soil_layer_combo = QComboBox()
        self.soil_layer_combo.addItem("全部土体", None)
        soil_layer_layout.addWidget(self.soil_layer_combo)
        display_layout.addLayout(soil_layer_layout)

        # 按阶段过滤预应力路径
        self.filter_anchors_by_stage_cb = QCheckBox("按分析步过滤预应力路径")
        self.filter_anchors_by_stage_cb.setChecked(False)


        for cb in [
            self.show_mesh_cb,
            self.show_nodes_cb,
            self.show_supports_cb,
            self.show_loads_cb,
            self.only_active_materials_cb,
            self.show_soil_cb,
            self.show_concrete_cb,
            self.show_steel_cb,
            self.show_anchors_cb,
            self.filter_anchors_by_stage_cb,
        ]:
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
        title_label = QLabel("🔧 前处理 - 网格、约束、荷载")
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

        # 分析类型说明
        self.analysis_type_label = QLabel("基坑工程专用分析")
        self.analysis_type_label.setStyleSheet("font-weight: bold; color: #007bff; font-size: 12px;")
        analysis_layout.addWidget(self.analysis_type_label)

        # 分析详情
        analysis_details = QLabel("• 非线性静力分析\n• 摩尔-库伦本构模型\n• 多阶段施工序列")
        analysis_details.setStyleSheet("color: #666; font-size: 10px; margin-left: 10px;")
        analysis_layout.addWidget(analysis_details)

        layout.addWidget(analysis_group)

        # 施工步序组 (导入数据展示)
        steps_group = QGroupBox("🏗️ 施工步序")
        steps_group.setFont(QFont("Microsoft YaHei", 10, QFont.Bold))
        steps_layout = QVBoxLayout(steps_group)

        self.steps_list = QListWidget()
        self.steps_list.setMaximumHeight(120)

        # 示例施工步序
        construction_steps = [
            "步骤1: 重力平衡",
            "步骤2: 开挖至-5m",
            "步骤3: 安装第一道支撑",
            "步骤4: 开挖至-10m",
            "步骤5: 安装第二道支撑"
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
        title_label = QLabel("🧮 分析监控 - 计算进度与状态")
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

        # 勾选变化时刷新结果显示
        self.show_deformed.stateChanged.connect(lambda _: self.postprocessor.set_show_deformed(self.show_deformed.isChecked()))
        self.show_contour.stateChanged.connect(lambda _: self.postprocessor.set_show_contour(self.show_contour.isChecked()))

        self.show_wireframe = QCheckBox("显示线框")
        display_layout.addRow(self.show_wireframe)

        # 新增：使用 StageVisible 过滤
        self.use_stage_visible_cb = QCheckBox("使用StageVisible过滤")
        display_layout.addRow(self.use_stage_visible_cb)

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
        # 前处理连接
        self.new_project_btn.clicked.connect(self.new_project)
        self.load_project_btn.clicked.connect(self.load_project)
        self.save_project_btn.clicked.connect(self.save_project)
        self.import_fpn_btn.clicked.connect(self.import_fpn)
        self.generate_mesh_btn.clicked.connect(self.generate_mesh)

        # 物理组和分析步选择连接
        self.material_group_combo.currentTextChanged.connect(self.on_material_group_changed)
        self.load_group_combo.currentTextChanged.connect(self.on_load_group_changed)
        self.boundary_group_combo.currentTextChanged.connect(self.on_boundary_group_changed)
        self.analysis_stage_combo.currentTextChanged.connect(self.on_analysis_stage_changed)

        # 显示模式切换连接
        self.wireframe_btn.clicked.connect(self.set_wireframe_mode)
        self.solid_btn.clicked.connect(self.set_solid_mode)
        self.transparent_btn.clicked.connect(self.set_transparent_mode)

        # 前处理器控制面板按钮连接
        self.pre_wireframe_btn.clicked.connect(self.set_wireframe_mode)
        self.pre_solid_btn.clicked.connect(self.set_solid_mode)

        # 显示选项连接
        self.show_mesh_cb.stateChanged.connect(self.update_display)
        self.show_nodes_cb.stateChanged.connect(self.update_display)
        self.show_supports_cb.stateChanged.connect(self.update_display)
        self.show_loads_cb.stateChanged.connect(self.update_display)
        # 新增：仅显示激活材料
        try:
            self.only_active_materials_cb.stateChanged.connect(self.update_display)
        except Exception:
            pass
        # 新增：part 类型显示
        for cb in [getattr(self, 'show_soil_cb', None), getattr(self, 'show_concrete_cb', None), getattr(self, 'show_steel_cb', None)]:
            if cb:
                cb.stateChanged.connect(self.update_display)

        # 锚杆显示开关联动
        try:
            if hasattr(self.preprocessor, 'toggle_show_anchors'):
                self.show_anchors_cb.stateChanged.connect(
                    lambda _: self.preprocessor.toggle_show_anchors(self.show_anchors_cb.isChecked())
                )
        except Exception as e:
            print(f"锚杆显示复选框联动失败: {e}")

        # 土体分层选择联动
        try:
            if hasattr(self, 'soil_layer_combo'):
                self.soil_layer_combo.currentIndexChanged.connect(self.on_soil_layer_changed)
        except Exception as e:
            print(f"土体分层联动失败: {e}")

        # 预应力路径阶段过滤联动
        try:
            if hasattr(self.preprocessor, 'filter_anchors_by_stage'):
                self.filter_anchors_by_stage_cb.stateChanged.connect(
                    lambda _: setattr(self.preprocessor, 'filter_anchors_by_stage', self.filter_anchors_by_stage_cb.isChecked()) or self.preprocessor.display_mesh()
                )
        except Exception as e:
            print(f"预应力阶段过滤复选框联动失败: {e}")

        # 分析连接
        self.run_analysis_btn.clicked.connect(self.run_analysis)
        self.pause_analysis_btn.clicked.connect(self.pause_analysis)
        self.stop_analysis_btn.clicked.connect(self.stop_analysis)

        # 后处理连接
        self.load_results_btn.clicked.connect(self.load_results)
        self.play_btn.clicked.connect(self.play_animation)
        self.pause_btn.clicked.connect(self.pause_animation)
        self.stop_btn.clicked.connect(self.stop_animation)
        # StageVisible过滤联动
        try:
            self.use_stage_visible_cb.stateChanged.connect(lambda _: self._toggle_stage_visible_filter())
        except Exception:
            pass

        # 标签页切换

        def _toggle_stage_visible_filter(self):
            """切换后处理StageVisible过滤"""
            try:
                use_filter = self.use_stage_visible_cb.isChecked()
                if hasattr(self.postprocessor, 'use_stage_visible_filter'):
                    self.postprocessor.use_stage_visible_filter = use_filter
                    # 刷新显示
                    self.postprocessor.display_results()
            except Exception as e:
                print(f"StageVisible复选框联动失败: {e}")

        self.workflow_tabs.currentChanged.connect(self.on_tab_changed)

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
        """导入FPN文件（使用多线程）"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "导入MIDAS FPN文件", "", "FPN文件 (*.fpn);;所有文件 (*.*)"
        )
        if file_path:
            if self.operation_manager:
                # 显示进度条
                self.overall_progress.setValue(0)
                self.overall_progress.show()
                self.step_progress.setValue(0)
                self.step_progress.show()

                # 使用多线程异步处理
                self.status_label.setText(f"正在解析FPN文件: {Path(file_path).name}")

                self.operation_manager.parse_fpn_file_async(
                    file_path,
                    success_callback=self.on_fpn_import_success,
                    error_callback=self.on_fpn_import_error,
                    show_progress=True
                )
            else:
                # 回退到同步处理
                try:
                    self.preprocessor.load_fpn_file(file_path)
                    self.status_label.setText(f"FPN文件加载完成: {Path(file_path).name}")
                    self.update_model_info()
                    self.update_physics_combos()
                except Exception as e:
                    QMessageBox.warning(self, "导入失败", f"FPN文件导入失败:\n{str(e)}")
                    self.status_label.setText("FPN文件导入失败")

    def on_fpn_import_success(self, fpn_data):
        """FPN文件导入成功回调"""
        try:
            # 隐藏进度条
            self.overall_progress.hide()
            # 将材料类型映射传给后处理（用于part过滤显示）
            try:
                if hasattr(self.preprocessor, 'materials') and hasattr(self.postprocessor, 'mesh'):
                    # 构建 id->type 的映射
                    mat_type_map = {int(mid): info.get('properties', {}).get('type') for mid, info in self.preprocessor.materials.items()}
                    setattr(self.postprocessor, 'material_type_map', mat_type_map)
            except Exception as e:
                print(f"传递材料类型映射失败: {e}")

            self.step_progress.hide()
            # 将解析结果设置到预处理器
            self.preprocessor.fpn_data = fpn_data

            # 传递FPN数据给分析器
            self.analyzer.load_fpn_analysis_steps(fpn_data)
            print("FPN数据已传递给分析器")

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
            analysis_stages = len(fpn_data.get('analysis_stages', []))

            # 显示分析步摘要
            analysis_summary = self.analyzer.get_fpn_analysis_summary()
            print(analysis_summary)

            QMessageBox.information(
                self, "导入成功",
                f"FPN文件导入成功!\n节点: {node_count}\n单元: {element_count}\n分析步: {analysis_stages}"
            )

        except Exception as e:
            self.on_fpn_import_error("ProcessingError", f"处理FPN数据失败: {e}")

    def on_fpn_import_progress(self, progress_info):
        """FPN文件导入进度回调"""
        try:
            if isinstance(progress_info, dict):
                # 更新进度条
                overall_progress = progress_info.get('overall_progress', 0)
                current_section = progress_info.get('current_section', '')
                processed_lines = progress_info.get('processed_lines', 0)
                total_lines = progress_info.get('total_lines', 0)

                self.overall_progress.setValue(int(overall_progress))

                if total_lines > 0:
                    step_progress = (processed_lines / total_lines) * 100
                    self.step_progress.setValue(int(step_progress))

                # 更新状态文本
                status_text = f"解析FPN文件 - {current_section}: {processed_lines}/{total_lines} 行"
                self.status_label.setText(status_text)

        except Exception as e:
            print(f"进度回调处理失败: {e}")

    def on_fpn_import_error(self, error_type, error_message):
        """FPN文件导入失败回调"""
        # 隐藏进度条
        self.overall_progress.hide()
        self.step_progress.hide()

        # 使用专业错误处理器
        error_handler = ErrorHandler()

        # 根据错误类型显示专业错误信息
        if "encoding" in error_message.lower() or "decode" in error_message.lower():
            error_handler.show_user_friendly_error(
                self, "PARSE_ENCODING_ERROR",
                "FPN文件编码问题", error_message
            )
        elif "node" in error_message.lower():
            error_handler.show_user_friendly_error(
                self, "PARSE_DATA_INCOMPLETE",
                "FPN文件缺少节点数据", error_message
            )
        elif "element" in error_message.lower() or "tetra" in error_message.lower():
            error_handler.show_user_friendly_error(
                self, "PARSE_DATA_INCOMPLETE",
                "FPN文件缺少单元数据", error_message
            )
        else:
            error_handler.show_user_friendly_error(
                self, "PARSE_FORMAT_ERROR",
                "FPN文件格式问题", f"{error_type}: {error_message}"
            )

        self.status_label.setText("FPN文件导入失败")

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

    def run_analysis(self):
        """运行分析"""
        self.run_analysis_btn.setEnabled(False)
        self.pause_analysis_btn.setEnabled(True)
        self.stop_analysis_btn.setEnabled(True)

        self.status_label.setText("开始运行分析...")
        self.analysis_log.append("启动Kratos分析引擎...")

        # TODO: 实现真实的分析逻辑
        self.start_mock_analysis()

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

        # 修复：将分析结果传递给后处理模块
        if hasattr(self, 'analysis_results') and self.analysis_results:
            # 假设 self.analysis_results 是一个包含所有步骤结果的列表
            # 我们传递最后一个步骤的结果
            last_result = self.analysis_results[-1]
            model_data = self.preprocessor.fpn_data

            if model_data and last_result:
                self.postprocessor.set_analysis_results(model_data, last_result)
                self.status_label.setText("分析完成，结果已加载到后处理模块。")
            else:
                self.status_label.setText("分析完成，但无法加载结果（缺少数据）。")
        else:
            # 如果没有真实结果，加载示例结果用于演示
            self.postprocessor.create_sample_results()
            self.status_label.setText("分析完成，已加载示例结果。")

        # 切换到后处理标签页
        self.workflow_tabs.setCurrentIndex(2)

        QMessageBox.information(self, "完成", "分析计算完成！\n已自动切换到后处理模块。")

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

        # 更新分析步下拉框
        if hasattr(self, 'analysis_stage_combo'):
            self.analysis_stage_combo.clear()
            analysis_stages = fpn_data.get('analysis_stages', [])
            if analysis_stages:
                for stage in analysis_stages:
                    self.analysis_stage_combo.addItem(f"{stage['name']} (ID: {stage['id']})")
            else:
                self.analysis_stage_combo.addItem("无分析步")

        # 更新材料组（使用网格集合信息）
        self.material_group_combo.clear()
        self.material_group_combo.addItem("所有材料组")

        # 从网格集合获取材料信息
        mesh_sets = fpn_data.get('mesh_sets', {})
        if mesh_sets:
            for mesh_id, mesh_info in mesh_sets.items():
                material_name = mesh_info.get('name', f'Material_{mesh_id}')
                self.material_group_combo.addItem(f"{material_name} (ID: {mesh_id})")
        else:
            # 回退到材料组
            material_groups = fpn_data.get('material_groups', {})
            for group_id, group_info in material_groups.items():
                self.material_group_combo.addItem(f"材料组 {group_id} ({group_info.get('material_count', 0)} 材料)")

        # 填充“土体分层”下拉（按材料ID切换土层）
        try:
            if hasattr(self, 'soil_layer_combo'):
                self.soil_layer_combo.clear()
                self.soil_layer_combo.addItem("全部土体", None)

                # 优先使用解析到的材料字典，并筛选出 type=='soil'
                materials = getattr(self.preprocessor, 'materials', {}) or {}
                if materials:
                    for mid in sorted(materials.keys(), key=lambda x: int(x)):
                        info = materials[mid]
                        mtype = (info.get('properties') or {}).get('type')
                        if mtype == 'soil':
                            name = info.get('name', f'Material_{mid}')
                            self.soil_layer_combo.addItem(f"{mid}: {name}", int(mid))
                # 回退：从网格 MaterialID 提取
                elif hasattr(self.preprocessor, 'mesh') and hasattr(self.preprocessor.mesh, 'cell_data') and 'MaterialID' in self.preprocessor.mesh.cell_data:
                    import numpy as np
                    for mid in sorted(np.unique(self.preprocessor.mesh.cell_data['MaterialID'])):
                        self.soil_layer_combo.addItem(f"{int(mid)}", int(mid))
        except Exception as e:
            print(f"填充土体分层失败: {e}")

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
            if isinstance(stage, dict):
                stage_name = stage.get('name', f'分析步 {stage.get("id", "?")}')
                stage_id = stage.get('id', '?')
                self.analysis_stage_combo.addItem(f"{stage_name} (ID: {stage_id})")
            else:
                # 处理stage不是字典的情况（例如直接是ID）
                self.analysis_stage_combo.addItem(f"分析步 ID: {stage}")

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

            # 获取当前选择的索引
            current_index = self.analysis_stage_combo.currentIndex()

            if current_index >= 0:
                # 设置预处理器的当前分析步（通过索引）
                if hasattr(self.preprocessor, 'set_current_analysis_stage'):
                    self.preprocessor.set_current_analysis_stage(current_index)
                    print(f"设置分析步索引: {current_index}")
                else:
                    print("预处理器没有set_current_analysis_stage方法")

                # 将当前激活材料同步给 Analyzer，保证计算一致
                try:
                    if hasattr(self.preprocessor, 'current_active_materials'):
                        mats = sorted(list(self.preprocessor.current_active_materials))
                        if hasattr(self.analyzer, 'set_active_materials'):
                            self.analyzer.set_active_materials(mats)
                except Exception as e:
                    print(f"同步激活材料到计算失败: {e}")

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
        try:
            if not hasattr(self.preprocessor, 'fpn_data') or not self.preprocessor.fpn_data:
                return

            # 获取当前分析步
            current_stage = self.preprocessor.get_current_analysis_stage()
            if not current_stage:
                return

            stage_name = current_stage.get('name', '').lower()
            print(f"根据分析步 '{current_stage['name']}' 智能调整物理组显示")

            # 根据分析步名称智能选择物理组
            if '初始' in stage_name or 'initial' in stage_name:
                # 初始应力分析：重点显示土体材料
                self.select_soil_materials()
            elif '开挖' in stage_name or 'excavation' in stage_name:
                # 开挖分析：显示剩余土体和支护结构
                self.select_excavation_materials()
            elif '支护' in stage_name or '围护' in stage_name or '墙' in stage_name:
                # 支护分析：重点显示结构材料
                self.select_structure_materials()
            else:
                # 默认显示所有材料
                self.material_group_combo.setCurrentIndex(0)  # "所有材料组"

        except Exception as e:
            print(f"智能物理组更新失败: {e}")

    def select_soil_materials(self):
        """选择土体材料组"""
        # 查找包含土体关键词的材料组
        soil_keywords = ['土', '砂', '粘', '淤', '粉']
        for i in range(self.material_group_combo.count()):
            text = self.material_group_combo.itemText(i)
            if any(keyword in text for keyword in soil_keywords):
                self.material_group_combo.setCurrentIndex(i)
                break

    def select_structure_materials(self):
        """选择结构材料组"""
        # 查找包含结构关键词的材料组
        structure_keywords = ['墙', '桩', '支护', '围护', '混凝土', '钢']
        for i in range(self.material_group_combo.count()):
            text = self.material_group_combo.itemText(i)
            if any(keyword in text for keyword in structure_keywords):
                self.material_group_combo.setCurrentIndex(i)
                break

    def select_excavation_materials(self):
        """选择开挖相关材料组"""
        # 开挖阶段通常需要显示所有材料以观察开挖效果
        self.material_group_combo.setCurrentIndex(0)  # "所有材料组"
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

            # 更新状态栏显示
            stage_name = current_stage.get('name', 'Unknown')
            self.status_label.setText(f"智能切换到分析步: {stage_name}")
            print(f"智能切换完成: {stage_name}")

        except Exception as e:
            print(f"智能更新物理组失败: {e}")
            import traceback
            traceback.print_exc()

    def on_soil_layer_changed(self):
        """切换土体分层过滤"""
        try:
            if not hasattr(self.preprocessor, 'materials'):
                return
            # 从下拉取选中的材料ID（存储在 itemData）
            mid = self.soil_layer_combo.currentData()
            if mid is None:
                # 显示全部土体
                self.preprocessor.display_mesh()
                return
            # 只显示选中的单一土体材料
            self.preprocessor.filter_materials_by_stage([int(mid)])
            self.preprocessor.display_mesh()
        except Exception as e:
            print(f"切换土体分层失败: {e}")

    def auto_select_physics_groups(self, active_groups):
        """自动选择相关的物理组"""
        try:
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
            # 如果勾选“仅显示激活材料”，根据当前分析步过滤
            try:
                if hasattr(self, 'only_active_materials_cb') and self.only_active_materials_cb.isChecked():
                    if hasattr(self.preprocessor, 'get_current_analysis_stage'):
                        stage = self.preprocessor.get_current_analysis_stage()
                        if stage:
                            groups = self.preprocessor.determine_active_groups_for_stage(stage)
                            mats = groups.get('materials', [])
                            if mats:
                                self.preprocessor.filter_materials_by_stage(mats)
            except Exception as e:
                print(f"仅显示激活材料过滤失败: {e}")

            self.preprocessor.display_mesh()
        self.status_label.setText("显示已更新")