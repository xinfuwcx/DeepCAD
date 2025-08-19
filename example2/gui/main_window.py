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

# 优先使用稳定版本；若主实现不可用，则回退到 dev_archive 的备份实现
try:
    from example2.modules.preprocessor import PreProcessor
except Exception:
    from example2.dev_archive.preprocessor_backup import PreProcessor
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

        # 使用QSplitter确保3D视口不被压缩
        splitter = QSplitter(Qt.Orientation.Horizontal)

        # 左侧控制面板
        left_panel = self.create_preprocessor_controls()
        left_panel.setMaximumWidth(350)
        left_panel.setMinimumWidth(300)
        splitter.addWidget(left_panel)

        # 右侧3D视图
        right_panel = self.create_preprocessor_viewer()
        right_panel.setMinimumSize(640, 480)  # 确保3D视口有足够大小
        splitter.addWidget(right_panel)

        # 设置分割比例: 左侧300px，右侧占据剩余空间
        splitter.setSizes([300, 900])
        splitter.setStretchFactor(0, 0)  # 左侧面板不拉伸
        splitter.setStretchFactor(1, 1)  # 右侧3D视口可拉伸

        layout.addWidget(splitter)
        self.workflow_tabs.addTab(tab, "🔧 前处理")

    def create_preprocessor_controls(self):
        """创建前处理控制面板"""
        panel = QFrame()
        panel.setFrameStyle(QFrame.StyledPanel)

        # 添加滚动区域
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll_area.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)

        # 创建滚动内容容器
        scroll_content = QWidget()
        layout = QVBoxLayout(scroll_content)
        layout.setContentsMargins(6, 6, 6, 6)
        layout.setSpacing(8)

        # 精简项目管理组
        project_group = QGroupBox("📁 项目")
        project_group.setFont(QFont("Microsoft YaHei", 9, QFont.Weight.Bold))
        project_layout = QHBoxLayout(project_group)
        project_layout.setSpacing(4)

        self.new_project_btn = QPushButton("🆕")
        self.load_project_btn = QPushButton("📂")
        self.save_project_btn = QPushButton("💾")

        for btn in [self.new_project_btn, self.load_project_btn, self.save_project_btn]:
            btn.setMinimumHeight(28)
            btn.setMaximumWidth(35)
            btn.setToolTip({"🆕": "新建项目", "📂": "加载项目", "💾": "保存项目"}[btn.text()])
            project_layout.addWidget(btn)

        layout.addWidget(project_group)

        # 精简几何模型组
        geometry_group = QGroupBox("📐 模型")
        geometry_group.setFont(QFont("Microsoft YaHei", 9, QFont.Weight.Bold))
        geometry_layout = QVBoxLayout(geometry_group)
        geometry_layout.setSpacing(4)

        # 主要操作(两列布局)
        main_ops_layout = QHBoxLayout()

        self.import_fpn_btn = QPushButton("📁 导入FPN")
        self.import_fpn_btn.setToolTip("从MIDAS导入FPN文件 (Ctrl+I)")
        self.import_fpn_btn.setShortcut("Ctrl+I")
        self.demo_mesh_btn = QPushButton("🎯 演示网格")
        self.demo_mesh_btn.setToolTip("生成示例网格用于调试")

        for btn in [self.import_fpn_btn, self.demo_mesh_btn]:
            btn.setMinimumHeight(28)
            main_ops_layout.addWidget(btn)

        geometry_layout.addLayout(main_ops_layout)

        # 次要操作(两列布局)
        secondary_ops_layout = QHBoxLayout()

        self.generate_mesh_btn = QPushButton("⚙️ 生成网格")
        self.generate_mesh_btn.setToolTip("构造演示网格 (Ctrl+G)")
        self.generate_mesh_btn.setShortcut("Ctrl+G")
        self.refresh_3d_btn = QPushButton("🔄 刷新视图")
        self.refresh_3d_btn.setToolTip("重建3D视口并刷新 (Ctrl+R)")
        self.refresh_3d_btn.setShortcut("Ctrl+R")

        for btn in [self.generate_mesh_btn, self.refresh_3d_btn]:
            btn.setMinimumHeight(28)
            secondary_ops_layout.addWidget(btn)

        geometry_layout.addLayout(secondary_ops_layout)

        layout.addWidget(geometry_group)

        # 紧凑模型信息组
        info_group = QGroupBox("📋 信息")
        info_group.setFont(QFont("Microsoft YaHei", 9, QFont.Weight.Bold))
        info_layout = QGridLayout(info_group)
        info_layout.setSpacing(2)

        # 使用网格布局，两列显示
        self.nodes_count_label = QLabel("0")
        self.elements_count_label = QLabel("0")
        self.materials_count_label = QLabel("0")
        self.constraints_count_label = QLabel("0")
        self.loads_count_label = QLabel("0")

        info_layout.addWidget(QLabel("节点:"), 0, 0)
        info_layout.addWidget(self.nodes_count_label, 0, 1)
        info_layout.addWidget(QLabel("单元:"), 0, 2)
        info_layout.addWidget(self.elements_count_label, 0, 3)
        info_layout.addWidget(QLabel("材料:"), 1, 0)
        info_layout.addWidget(self.materials_count_label, 1, 1)
        info_layout.addWidget(QLabel("约束:"), 1, 2)
        info_layout.addWidget(self.constraints_count_label, 1, 3)
        info_layout.addWidget(QLabel("载荷:"), 2, 0)
        info_layout.addWidget(self.loads_count_label, 2, 1)

        layout.addWidget(info_group)

        # 精简物理组选择
        physics_group = QGroupBox("🧱 分组")
        physics_group.setFont(QFont("Microsoft YaHei", 9, QFont.Weight.Bold))
        physics_layout = QVBoxLayout(physics_group)
        physics_layout.setSpacing(3)

        # 合并下拉框到两列
        group_layout = QGridLayout()
        group_layout.setSpacing(2)

        self.material_group_combo = QComboBox()
        self.material_group_combo.addItem("所有材料组")
        self.load_group_combo = QComboBox()
        self.load_group_combo.addItem("所有荷载组")
        self.boundary_group_combo = QComboBox()
        self.boundary_group_combo.addItem("所有边界组")

        group_layout.addWidget(QLabel("材料:"), 0, 0)
        group_layout.addWidget(self.material_group_combo, 0, 1)
        group_layout.addWidget(QLabel("荷载:"), 1, 0)
        group_layout.addWidget(self.load_group_combo, 1, 1)
        group_layout.addWidget(QLabel("边界:"), 2, 0)
        group_layout.addWidget(self.boundary_group_combo, 2, 1)

        physics_layout.addLayout(group_layout)
        layout.addWidget(physics_group)

        # 分析步选择
        analysis_group = QGroupBox("📊 分析步")
        analysis_group.setFont(QFont("Microsoft YaHei", 9, QFont.Weight.Bold))
        analysis_layout = QVBoxLayout(analysis_group)
        analysis_layout.setSpacing(3)

        self.analysis_stage_combo = QComboBox()
        self.analysis_stage_combo.addItem("初始状态")
        analysis_layout.addWidget(self.analysis_stage_combo)

        layout.addWidget(analysis_group)

        # 重要：显示控制组
        display_group = QGroupBox("👁️ 显示控制")
        display_group.setFont(QFont("Microsoft YaHei", 9, QFont.Weight.Bold))
        display_layout = QVBoxLayout(display_group)
        display_layout.setSpacing(4)

        # 显示模式切换(紧凑布局)
        mode_layout = QHBoxLayout()
        mode_layout.setSpacing(2)

        self.wireframe_btn = QPushButton("线框 (&1)")
        self.solid_btn = QPushButton("实体 (&2)")
        self.transparent_btn = QPushButton("半透明 (&3)")

        # 标记为模式按钮，便于QSS样式区分
        for btn in [self.wireframe_btn, self.solid_btn, self.transparent_btn]:
            btn.setProperty("modeButton", True)

        # 设置按钮样式和状态
        for btn in [self.wireframe_btn, self.solid_btn, self.transparent_btn]:
            btn.setCheckable(True)
            btn.setMinimumHeight(26)
            btn.setFont(QFont("Microsoft YaHei", 8))
            mode_layout.addWidget(btn)

        # 创建互斥按钮组
        from PyQt6.QtWidgets import QButtonGroup
        self.view_mode_group = QButtonGroup(self)
        self.view_mode_group.setExclusive(True)
        self.view_mode_group.addButton(self.wireframe_btn)
        self.view_mode_group.addButton(self.solid_btn)
        self.view_mode_group.addButton(self.transparent_btn)

        # 默认选中半透明模式(稍后在setup_connections中调用逻辑以同步到预处理器)
        self.transparent_btn.setChecked(True)
        display_layout.addLayout(mode_layout)

        # 紧凑的复选框布局(两列)
        checkbox_grid = QGridLayout()
        checkbox_grid.setSpacing(3)

        # 创建复选框
        self.show_mesh_cb = QCheckBox("网格边")
        self.show_mesh_cb.setChecked(False)
        self.show_nodes_cb = QCheckBox("节点")
        self.show_supports_cb = QCheckBox("支承")
        self.show_supports_cb.setChecked(False)
        self.show_loads_cb = QCheckBox("荷载")
        self.show_loads_cb.setChecked(False)

        # 🎯 地下工程专业构件(精简优化版)
        self.show_soil_cb = QCheckBox("土体")
        self.show_soil_cb.setChecked(True)
        
        # 主要支护结构
        self.show_diaphragm_wall_cb = QCheckBox("地连墙")
        self.show_diaphragm_wall_cb.setChecked(True)
        self.show_anchors_cb = QCheckBox("锚杆")
        self.show_anchors_cb.setChecked(True)

        # 基础和支撑结构
        self.show_piles_cb = QCheckBox("桩基")
        self.show_piles_cb.setChecked(True)
        self.show_strutting_cb = QCheckBox("内撑")
        self.show_strutting_cb.setChecked(True)

        # 图例显示开关
        self.show_legend_cb = QCheckBox("图例")
        self.show_legend_cb.setChecked(True)

        # 🎯 精简专业布局：两列显示
        checkboxes = [
            (self.show_mesh_cb, self.show_nodes_cb),
            (self.show_supports_cb, self.show_loads_cb),
            (self.show_soil_cb, self.show_diaphragm_wall_cb),
            (self.show_anchors_cb, self.show_piles_cb),
            (self.show_strutting_cb, self.show_legend_cb)  # 加入图例开关
        ]

        for row, (cb1, cb2) in enumerate(checkboxes):
            checkbox_grid.addWidget(cb1, row, 0)
            if cb2:  # 处理最后一行只有一个复选框的情况
                checkbox_grid.addWidget(cb2, row, 1)

        display_layout.addLayout(checkbox_grid)

        layout.addWidget(display_group)

        # 添加弹性空间，把内容推到顶部
        layout.addStretch()

        # 设置滚动区域
        scroll_area.setWidget(scroll_content)

        # 主面板布局
        main_layout = QVBoxLayout(panel)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.addWidget(scroll_area)

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

        # 使用QSplitter确保3D视口不被压缩
        splitter = QSplitter(Qt.Orientation.Horizontal)

        # 左侧控制面板
        left_panel = self.create_postprocessor_controls()
        left_panel.setMaximumWidth(350)
        left_panel.setMinimumWidth(300)
        splitter.addWidget(left_panel)

        # 右侧3D视图
        right_panel = self.create_postprocessor_viewer()
        right_panel.setMinimumSize(640, 480)  # 确保3D视口有足够大小
        splitter.addWidget(right_panel)

        # 设置分割比例: 左侧300px，右侧占据剩余空间
        splitter.setSizes([300, 900])
        splitter.setStretchFactor(0, 0)  # 左侧面板不拉伸
        splitter.setStretchFactor(1, 1)  # 右侧3D视口可拉伸

        layout.addWidget(splitter)
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
        # 仅保留当前实现支持的类型：位移/应力
        self.result_type.addItems([
            "位移", "应力"
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
        try:
            self.show_wireframe.stateChanged.connect(
                lambda _: self.postprocessor.set_show_wireframe(self.show_wireframe.isChecked())
            )
        except Exception:
            pass

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

        # FPS与网格信息
        self.fps_label = QLabel("FPS: 0.0")
        statusbar.addPermanentWidget(self.fps_label)
        self.mesh_label = QLabel("Mesh: 0 / 0")
        statusbar.addPermanentWidget(self.mesh_label)

        # 启动状态刷新计时器
        try:
            self._status_timer = QTimer(self)
            self._status_timer.setInterval(500)
            self._status_timer.timeout.connect(self._update_status_metrics)
            self._status_timer.start()
        except Exception:
            pass

    def _update_status_metrics(self):
        """定期刷新状态栏指标(FPS/内存/网格规模)"""
        # FPS from preprocessor render time
        try:
            ms = float(getattr(self.preprocessor, 'last_render_ms', 0.0) or 0.0)
            fps = 0.0 if ms <= 0 else 1000.0 / ms
            self.fps_label.setText(f"FPS: {fps:.1f}")
        except Exception:
            pass

        # Mesh stats
        try:
            info = self.preprocessor.get_mesh_info() if hasattr(self.preprocessor, 'get_mesh_info') else {}
            npts = info.get('n_points', 0)
            ncells = info.get('n_cells', 0)
            self.mesh_label.setText(f"Mesh: {npts} / {ncells}")
        except Exception:
            pass

        # Process memory (optional psutil)
        try:
            import psutil  # type: ignore
            proc = psutil.Process()
            mem_mb = proc.memory_info().rss / 1024 / 1024
            self.memory_label.setText(f"内存: {mem_mb:.0f} MB")
        except Exception:
            # keep previous text
            pass

    def apply_modern_style(self):
        """应用现代化样式: 优先从资源QSS加载，失败则回退内置样式"""
        try:
            qss_path = Path(__file__).parent / 'resources' / 'styles' / 'modern_theme.qss'
            if qss_path.exists():
                with open(qss_path, 'r', encoding='utf-8') as f:
                    self.setStyleSheet(f.read())
                return
        except Exception:
            pass
        
        # 轻量回退(与旧版一致的核心规则)+ 模式按钮选中态
        self.setStyleSheet("""
        QMainWindow{background:#f5f5f5;}
        QFrame{background:#fff;border:1px solid #dee2e6;border-radius:8px;}
        QPushButton[modeButton="true"]{background:#f0f3f7;border:1px solid #cfd6e3;border-radius:6px;padding:4px 10px;}
        QPushButton[modeButton="true"]:checked{background:#2962FF;color:#fff;border:1px solid #2962FF;}
        """)

    def setup_connections(self):
        """设置信号连接"""
        # 前处理连接
        self.new_project_btn.clicked.connect(self.new_project)
        self.load_project_btn.clicked.connect(self.load_project)
        self.save_project_btn.clicked.connect(self.save_project)
        self.import_fpn_btn.clicked.connect(self.import_fpn)
        self.generate_mesh_btn.clicked.connect(self.generate_mesh)
        self.demo_mesh_btn.clicked.connect(self.generate_demo_mesh)
        self.refresh_3d_btn.clicked.connect(self.refresh_3d_viewport)

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
        # 图例开关联动
        try:
            if hasattr(self.preprocessor, 'set_show_material_legend'):
                self.show_legend_cb.stateChanged.connect(lambda _: self.preprocessor.set_show_material_legend(self.show_legend_cb.isChecked()))
        except Exception:
            pass
        # 新增：仅显示激活材料
        try:
            self.only_active_materials_cb.stateChanged.connect(self.update_display)
        except Exception:
            pass
        # 新增：part 类型显示
        for cb in [getattr(self, 'show_soil_cb', None)]:
            if cb:
                cb.stateChanged.connect(self.update_display)

        # 新增工程构件显示连接
        for cb in [getattr(self, 'show_diaphragm_wall_cb', None), getattr(self, 'show_piles_cb', None), getattr(self, 'show_strutting_cb', None)]:
            if cb:
                cb.stateChanged.connect(self.update_display)

        # 锚杆显示开关联动
        try:
            if hasattr(self.preprocessor, 'toggle_show_anchors'):
                self.show_anchors_cb.stateChanged.connect(
                    lambda _: self.preprocessor.toggle_show_anchors(self.show_anchors_cb.isChecked())
                )
        except Exception as e:
            print(f"板元/锚杆 显示复选框联动失败: {e}")
        # 配色主题联动
        try:
            if hasattr(self.preprocessor, 'set_color_theme'):
                self.color_theme_combo.currentTextChanged.connect(
                    lambda t: self.preprocessor.set_color_theme(t)
                )
        except Exception as e:
            print(f"配色主题联动失败: {e}")


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
        # 后处理图例按钮：切换材料图例
        try:
            if hasattr(self, 'post_legend_btn') and hasattr(self, 'postprocessor'):
                def _toggle_post_legend():
                    try:
                        cur = bool(getattr(self.postprocessor, 'show_material_legend', True))
                        if hasattr(self.postprocessor, 'set_show_material_legend'):
                            self.postprocessor.set_show_material_legend(not cur)
                        else:
                            self.postprocessor.show_material_legend = not cur
                            if hasattr(self.postprocessor, 'display_results'):
                                self.postprocessor.display_results()
                    except Exception:
                        pass
                self.post_legend_btn.clicked.connect(_toggle_post_legend)
        except Exception:
            pass

        # 确保默认模式与UI一致：触发一次半透明模式
        try:
            self.set_transparent_mode()
        except Exception:
            pass
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
        """导入FPN文件(使用多线程)"""
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
                # 回退到同步处理(手动导入,强制加载)
                try:
                    # 兼容性调用：优先带 force_load，若旧实现不支持则回退无参
                    import inspect
                    print("Using:", type(self.preprocessor).__module__)
                    try:
                        print("Sig:", inspect.signature(self.preprocessor.load_fpn_file))
                    except Exception:
                        pass
                    try:
                        self.preprocessor.load_fpn_file(file_path, force_load=True)
                    except TypeError:
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
            # 将材料类型映射传给后处理(用于part过滤显示)
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

            # 大模型显示保护：在首次显示前关闭高负载渲染选项，避免导入即崩溃
            try:
                n_cells = 0
                if hasattr(self.preprocessor, 'mesh') and self.preprocessor.mesh is not None:
                    try:
                        n_cells = int(getattr(self.preprocessor.mesh, 'n_cells', 0))
                    except Exception:
                        n_cells = 0
                if n_cells > 500_000:
                    print(f"🛡️ 大模型保护生效: 单元 {n_cells}，关闭边/叠加层以防崩溃")
                    # 1) 关闭前处理的标志位(即使复选框尚未同步)
                    for attr in [
                        'show_mesh_edges','show_nodes','show_supports','show_loads',
                        'show_plates','show_anchors','show_diaphragm_wall','show_piles',
                        'show_strutting','show_steel']:
                        if hasattr(self.preprocessor, attr):
                            try:
                                setattr(self.preprocessor, attr, False)
                            except Exception:
                                pass
                    # 2) 同步关闭UI复选框,防止 update_display 再次打开
                    for cb in [
                        getattr(self, 'show_mesh_cb', None),
                        getattr(self, 'show_nodes_cb', None),
                        getattr(self, 'show_supports_cb', None),
                        getattr(self, 'show_loads_cb', None),
                        getattr(self, 'show_plates_cb', None),
                        getattr(self, 'show_anchors_cb', None),
                        getattr(self, 'show_diaphragm_wall_cb', None),
                        getattr(self, 'show_piles_cb', None),
                        getattr(self, 'show_strutting_cb', None),
                        getattr(self, 'show_steel_cb', None),
                    ]:
                        try:
                            if cb:
                                cb.setChecked(False)
                        except Exception:
                            pass
            except Exception as e:
                print(f"大模型显示保护设置失败: {e}")


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

    def generate_demo_mesh(self):
        """生成演示网格用于测试复选框功能"""
        print("🎯 生成演示网格...")
        self.status_label.setText("正在生成演示网格...")

        try:
            # 调用前处理器创建演示网格
            if hasattr(self.preprocessor, '_create_demo_mesh'):
                self.preprocessor._create_demo_mesh()
                self.status_label.setText("演示网格生成完成 - 可测试复选框功能")
                print("✅ 演示网格生成成功，可以测试复选框了！")

                # 更新模型信息
                self.update_model_info()

                # 提示用户可以测试复选框
                from PyQt6.QtWidgets import QMessageBox
                QMessageBox.information(
                    self,
                    "演示网格已就绪",
                    "演示网格已生成！\n\n现在您可以测试以下复选框功能：\n"
                    "• 显示网格边\n"
                    "• 显示节点\n"
                    "• 显示支承\n"
                    "• 显示荷载\n"
                    "• 线框/实体/半透明模式\n\n"
                    "点击复选框即可看到实时效果！"
                )
            else:
                self.status_label.setText("演示网格功能不可用")
                print("❌ 前处理器不支持演示网格功能")
        except Exception as e:
            error_msg = f"生成演示网格失败: {e}"
            self.status_label.setText(error_msg)
            print(f"❌ {error_msg}")

    def refresh_3d_viewport(self):
        """刷新3D视口 - 重新初始化PyVista"""
        print("🔄 刷新3D视口...")
        self.status_label.setText("正在刷新3D视口...")

        try:
            # 重新创建前处理器的视图组件
            old_viewer = self.preprocessor.viewer_widget

            # 创建新的视图组件
            self.preprocessor.create_viewer_widget()
            new_viewer = self.preprocessor.get_viewer_widget()

            if new_viewer and old_viewer:
                # 在前处理标签页中替换视图组件
                # 找到当前的分割器
                pre_tab = self.workflow_tabs.widget(0)  # 前处理是第一个标签
                if pre_tab:
                    layout = pre_tab.layout()
                    if layout and layout.count() > 0:
                        splitter = layout.itemAt(0).widget()
                        if hasattr(splitter, 'widget') and splitter.count() >= 2:
                            # 移除旧的视图
                            old_widget = splitter.widget(1)
                            if old_widget:
                                old_widget.setParent(None)

                            # 添加新的视图
                            new_viewer.setMinimumSize(640, 480)
                            splitter.addWidget(new_viewer)
                            splitter.setSizes([300, 900])

                            self.status_label.setText("3D视口刷新成功")
                            print("✅ 3D视口刷新成功")

                            # 如果有网格数据，重新显示
                            if hasattr(self.preprocessor, 'mesh') and self.preprocessor.mesh:
                                self.preprocessor.display_mesh()

                            return

            self.status_label.setText("3D视口刷新完成")
            print("✅ 3D视口刷新完成")

        except Exception as e:
            error_msg = f"刷新3D视口失败: {e}"
            self.status_label.setText(error_msg)
            print(f"❌ {error_msg}")

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
        try:
            self.run_analysis_btn.setEnabled(False)
            self.pause_analysis_btn.setEnabled(True)
            self.stop_analysis_btn.setEnabled(True)

            self.status_label.setText("开始运行分析...")
            if hasattr(self, 'analysis_log'):
                self.analysis_log.append("启动Kratos分析引擎...")

            # 集成真实的Kratos计算引擎
            self.start_real_analysis()
        except Exception as e:
            # 防御性处理，避免点击后异常导致应用退出
            if hasattr(self, 'analysis_log'):
                self.analysis_log.append(f"分析启动失败: {e}")
            self.status_label.setText("分析启动失败")
            # 恢复按钮状态
            self.run_analysis_btn.setEnabled(True)
            self.pause_analysis_btn.setEnabled(False)
            self.stop_analysis_btn.setEnabled(False)

    def start_real_analysis(self):
        """启动真实的Kratos分析"""
        try:
            # 导入DeepCAD的Kratos集成模块
            from core.kratos_integration import KratosIntegration

            self.kratos_solver = KratosIntegration()

            # 检查前处理数据
            if not hasattr(self.preprocessor, 'fpn_data') or not self.preprocessor.fpn_data:
                raise ValueError("缺少前处理数据，请先导入FPN文件")

            # 启动真实计算
            self.analyzer.set_fpn_data(self.preprocessor.fpn_data)
            self.analyzer.set_kratos_interface(self.kratos_solver)

            if hasattr(self, 'analysis_log'):
                self.analysis_log.append("正在启动Kratos计算引擎...")

            # 连接分析器信号
            self.analyzer.progress_updated.connect(self.on_analysis_progress)
            self.analyzer.step_finished.connect(self.on_analysis_step_finished)
            self.analyzer.analysis_finished.connect(self.analysis_finished)

            # 开始计算
            self.analyzer.start_analysis()

        except ImportError:
            if hasattr(self, 'analysis_log'):
                self.analysis_log.append("Kratos集成模块不可用，请检查安装")
            self.run_analysis_btn.setEnabled(True)
            self.pause_analysis_btn.setEnabled(False)
            self.stop_analysis_btn.setEnabled(False)
        except Exception as e:
            if hasattr(self, 'analysis_log'):
                self.analysis_log.append(f"启动分析失败: {e}")
            self.run_analysis_btn.setEnabled(True)
            self.pause_analysis_btn.setEnabled(False)
            self.stop_analysis_btn.setEnabled(False)

    def on_analysis_progress(self, progress_data):
        """真实分析进度回调"""
        try:
            overall_progress = progress_data.get('overall_progress', 0)
            step_progress = progress_data.get('step_progress', 0)
            iteration_progress = progress_data.get('iteration_progress', 0)

            self.overall_progress.setValue(int(overall_progress))
            self.step_progress.setValue(int(step_progress))
            self.iteration_progress.setValue(int(iteration_progress))

            # 更新状态标签
            current_step = progress_data.get('current_step', 'Unknown')
            current_iteration = progress_data.get('current_iteration', '0/0')
            convergence_status = progress_data.get('convergence_status', 'N/A')

            self.current_step_label.setText(str(current_step))
            self.current_iteration_label.setText(str(current_iteration))
            self.convergence_label.setText(str(convergence_status))

            # 添加日志
            log_message = progress_data.get('log_message', '')
            if log_message and hasattr(self, 'analysis_log'):
                self.analysis_log.append(log_message)

        except Exception as e:
            if hasattr(self, 'analysis_log'):
                self.analysis_log.append(f"进度更新失败: {e}")

    def on_analysis_step_finished(self, step_data):
        """分析步完成回调"""
        try:
            step_name = step_data.get('step_name', 'Unknown')
            if hasattr(self, 'analysis_log'):
                self.analysis_log.append(f"✅ 分析步完成: {step_name}")
        except Exception as e:
            if hasattr(self, 'analysis_log'):
                self.analysis_log.append(f"步骤完成处理失败: {e}")

    def analysis_finished(self):
        """分析完成"""
        try:
            self.run_analysis_btn.setEnabled(True)
            self.pause_analysis_btn.setEnabled(False)
            self.stop_analysis_btn.setEnabled(False)

            self.status_label.setText("分析完成")
            if hasattr(self, 'analysis_log'):
                self.analysis_log.append("分析成功完成！")

            # 获取真实计算结果
            model_data = getattr(self.preprocessor, 'fpn_data', None)
            if hasattr(self, 'analyzer') and hasattr(self.analyzer, 'analysis_results') and self.analyzer.analysis_results:
                last_result = self.analyzer.analysis_results[-1]
                try:
                    self.postprocessor.set_analysis_results(model_data, last_result)
                    self.status_label.setText("分析完成，真实结果已加载到后处理模块。")
                except Exception as e:
                    if hasattr(self, 'analysis_log'):
                        self.analysis_log.append(f"设置后处理结果失败: {e}")
                    self.status_label.setText("分析完成，但结果加载失败")
            else:
                if hasattr(self, 'analysis_log'):
                    self.analysis_log.append("⚠️ 未获取到计算结果")
                self.status_label.setText("分析完成，但未获取到结果")

            # 自动切换到后处理标签页
            try:
                tabs = getattr(self, 'workflow_tabs', None)
                if tabs is not None:
                    tabs.setCurrentIndex(2)  # 切到“后处理”
            except Exception:
                pass
        except Exception as e:
            try:
                if hasattr(self, 'analysis_log'):
                    self.analysis_log.append(f"分析完成阶段出错: {e}")
            except Exception:
                pass
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

        # 更新材料组(使用网格集合信息)
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

        # 填充“土体分层”下拉(按材料ID切换土层)
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

        # 启用/禁用：板元与锚杆控件
        try:
            pe = fpn_data.get('plate_elements') or {}
            has_plates = bool(pe)
            if hasattr(self, 'show_plates_cb'):
                self.show_plates_cb.setEnabled(has_plates)
                self.show_plates_cb.setToolTip("" if has_plates else "当前模型未检测到板单元")
            if has_plates and hasattr(self.preprocessor, '_plates_cached'):
                self.preprocessor._plates_cached = None  # 强制重建
        except Exception:
            pass
        try:
            le = fpn_data.get('line_elements') or {}
            has_lines = bool(le)
            if hasattr(self, 'show_anchors_cb'):
                self.show_anchors_cb.setEnabled(has_lines)
                self.show_anchors_cb.setToolTip("" if has_lines else "当前模型未检测到预应力线元")
            if hasattr(self, 'filter_anchors_by_stage_cb'):
                self.filter_anchors_by_stage_cb.setEnabled(has_lines)
        except Exception:
            pass

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
                # 处理stage不是字典的情况(例如直接是ID)
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
                # 设置预处理器的当前分析步(通过索引)
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
            # 从下拉取选中的材料ID(存储在 itemData)
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
        print("🔄 切换到线框模式")
        self.wireframe_btn.setChecked(True)
        self.solid_btn.setChecked(False)
        self.transparent_btn.setChecked(False)

        if hasattr(self.preprocessor, 'set_display_mode'):
            self.preprocessor.set_display_mode('wireframe')
            print("✅ 线框模式已激活")
        self.status_label.setText("显示模式: 线框")

    def set_solid_mode(self):
        """设置实体模式"""
        print("🔄 切换到实体模式")
        self.wireframe_btn.setChecked(False)
        self.solid_btn.setChecked(True)
        self.transparent_btn.setChecked(False)

        if hasattr(self.preprocessor, 'set_display_mode'):
            self.preprocessor.set_display_mode('solid')
            print("✅ 实体模式已激活")
        self.status_label.setText("显示模式: 实体")

    def set_transparent_mode(self):
        """设置半透明模式"""
        print("🔄 切换到半透明模式")
        self.wireframe_btn.setChecked(False)
        self.solid_btn.setChecked(False)
        self.transparent_btn.setChecked(True)

        if hasattr(self.preprocessor, 'set_display_mode'):
            self.preprocessor.set_display_mode('transparent')
            print("✅ 半透明模式已激活")
        self.status_label.setText("显示模式: 半透明")

    def update_display(self):
        """🚨 阶段1 UI保护机制：非阻塞显示更新"""
        # 防抖保护：避免频繁调用
        if hasattr(self, '_display_update_timer'):
            self._display_update_timer.stop()
        
        self._display_update_timer = QTimer()
        self._display_update_timer.setSingleShot(True)
        self._display_update_timer.timeout.connect(self._protected_update_display)
        self._display_update_timer.start(150)  # 150ms防抖延迟

    def _protected_update_display(self):
        """受保护的显示更新实现 - 异步非阻塞"""
        print("🔄 启动受保护的显示更新...")
        
        if not hasattr(self.preprocessor, 'display_mesh'):
            return
            
        # 🚨 UI保护：显示加载状态
        try:
            if hasattr(self, 'status_label'):
                self.status_label.setText("🔄 正在更新显示...")
        except Exception:
            pass
            
        # 大模型保护：若当前网格过大，强制关闭高负载选项并回写到复选框
            try:
                n_cells = 0
                if hasattr(self.preprocessor, 'mesh') and self.preprocessor.mesh is not None:
                    try:
                        n_cells = int(getattr(self.preprocessor.mesh, 'n_cells', 0))
                    except Exception:
                        n_cells = 0
                is_big_model = n_cells > 500_000
                if is_big_model:
                    for cb in [
                        getattr(self, 'show_mesh_cb', None),
                        getattr(self, 'show_plates_cb', None),
                        getattr(self, 'show_anchors_cb', None),
                        getattr(self, 'show_diaphragm_wall_cb', None),
                        getattr(self, 'show_piles_cb', None),
                        getattr(self, 'show_strutting_cb', None),
                        getattr(self, 'show_steel_cb', None),
                    ]:
                        try:
                            if cb and cb.isChecked():
                                cb.setChecked(False)
                        except Exception:
                            pass
            except Exception as e:
                print(f"大模型保护回写失败: {e}")

            # 🔧 修复：将复选框状态正确同步到预处理器
            try:
                # 基础显示控制
                if hasattr(self, 'show_mesh_cb'):
                    self.preprocessor.show_mesh_edges = self.show_mesh_cb.isChecked()
                    print(f"网格边: {self.preprocessor.show_mesh_edges}")

                if hasattr(self, 'show_nodes_cb'):
                    self.preprocessor.show_nodes = self.show_nodes_cb.isChecked()
                    print(f"节点: {self.preprocessor.show_nodes}")
                    
                # 🔧 修复：工程构件显示同步
                if hasattr(self, 'show_soil_cb'):
                    self.preprocessor.show_soil = getattr(self, 'show_soil_cb').isChecked()
                    print(f"土体: {self.preprocessor.show_soil}")
                    
                if hasattr(self, 'show_diaphragm_wall_cb'):
                    self.preprocessor.show_diaphragm_wall = getattr(self, 'show_diaphragm_wall_cb').isChecked()
                    print(f"地连墙: {self.preprocessor.show_diaphragm_wall}")
                    
                if hasattr(self, 'show_anchors_cb'):
                    self.preprocessor.show_anchors = getattr(self, 'show_anchors_cb').isChecked()
                    print(f"锚杆: {self.preprocessor.show_anchors}")
                    
                if hasattr(self, 'show_piles_cb'):
                    self.preprocessor.show_piles = getattr(self, 'show_piles_cb').isChecked()
                    print(f"桩基: {self.preprocessor.show_piles}")
                    
                if hasattr(self, 'show_strutting_cb'):
                    self.preprocessor.show_strutting = getattr(self, 'show_strutting_cb').isChecked()
                    print(f"内撑: {self.preprocessor.show_strutting}")
                    print(f"节点: {self.preprocessor.show_nodes}")

                if hasattr(self, 'show_supports_cb'):
                    self.preprocessor.show_supports = self.show_supports_cb.isChecked()
                    print(f"支承: {self.preprocessor.show_supports}")

                if hasattr(self, 'show_loads_cb'):
                    self.preprocessor.show_loads = self.show_loads_cb.isChecked()
                    print(f"荷载: {self.preprocessor.show_loads}")

                # 材料类型显示控制
                if hasattr(self, 'show_soil_cb'):
                    self.preprocessor.show_soil = self.show_soil_cb.isChecked()
                    print(f"土体: {self.preprocessor.show_soil}")

                # 专业地下工程构件设置
                # (已删除冗余的混凝土、钢材、板单元选项)

                if hasattr(self, 'show_anchors_cb'):
                    self.preprocessor.show_anchors = self.show_anchors_cb.isChecked()
                    print(f"锚杆: {self.preprocessor.show_anchors}")

                # 可选：节点/支承/荷载在大模型也可能较重，这里已在 on_fpn_import_success 初次关闭

                # 新增工程构件显示控制
                if hasattr(self, 'show_diaphragm_wall_cb'):
                    self.preprocessor.show_diaphragm_wall = self.show_diaphragm_wall_cb.isChecked()
                    print(f"地连墙: {self.preprocessor.show_diaphragm_wall}")

                if hasattr(self, 'show_piles_cb'):
                    self.preprocessor.show_piles = self.show_piles_cb.isChecked()
                    print(f"桩基: {self.preprocessor.show_piles}")

                if hasattr(self, 'show_strutting_cb'):
                    self.preprocessor.show_strutting = self.show_strutting_cb.isChecked()
                    print(f"内撑: {self.preprocessor.show_strutting}")

                # 🚨 UI保护：异步非阻塞显示刷新
                self._start_async_display_update()

                # 更新状态栏提示
                active_options = []
                if getattr(self.preprocessor, 'show_mesh_edges', False):
                    active_options.append("网格边")
                if getattr(self.preprocessor, 'show_nodes', False):
                    active_options.append("节点")
                if getattr(self.preprocessor, 'show_supports', False):
                    active_options.append("支承")
                if getattr(self.preprocessor, 'show_loads', False):
                    active_options.append("荷载")

                status_msg = f"显示选项: {', '.join(active_options) if active_options else '无'}"
                if hasattr(self, 'status_label'):
                    self.status_label.setText(status_msg)
                print(f"✅ {status_msg}")

            except Exception as e:
                error_msg = f"同步显示开关失败: {e}"
                print(f"❌ {error_msg}")
                if hasattr(self, 'status_label'):
                    self.status_label.setText(error_msg)
        else:
            print("❌ 前处理器不可用")
            if hasattr(self, 'status_label'):
                self.status_label.setText("前处理器不可用")

    def _start_async_display_update(self):
        """🚨 启动异步显示更新：防止UI阻塞"""
        try:
            # 防止重复启动
            if hasattr(self, '_display_thread') and self._display_thread.isRunning():
                print("⚠️ 显示更新已在进行中，跳过重复请求")
                return
                
            # 创建异步显示线程
            self._display_thread = DisplayUpdateThread(self.preprocessor)
            self._display_thread.finished.connect(self._on_display_update_finished)
            self._display_thread.error.connect(self._on_display_update_error)
            
            # 显示进度状态
            if hasattr(self, 'status_label'):
                self.status_label.setText("🔄 正在更新3D显示...")
                
            # 禁用相关UI控件避免冲突操作
            self._disable_display_controls(True)
            
            # 启动线程
            self._display_thread.start()
            print("🚀 异步显示更新已启动")
            
        except Exception as e:
            print(f"❌ 启动异步显示更新失败: {e}")
            if hasattr(self, 'status_label'):
                self.status_label.setText(f"显示更新失败: {e}")
            self._disable_display_controls(False)

    def _on_display_update_finished(self):
        """显示更新完成回调"""
        try:
            print("✅ 异步显示更新完成")
            if hasattr(self, 'status_label'):
                self.status_label.setText("✅ 3D显示更新完成")
            self._disable_display_controls(False)
        except Exception as e:
            print(f"⚠️ 显示更新完成回调异常: {e}")

    def _on_display_update_error(self, error_msg):
        """显示更新错误回调"""
        try:
            print(f"❌ 异步显示更新失败: {error_msg}")
            if hasattr(self, 'status_label'):
                self.status_label.setText(f"❌ 显示更新失败: {error_msg}")
            self._disable_display_controls(False)
        except Exception as e:
            print(f"⚠️ 显示更新错误回调异常: {e}")

    def _disable_display_controls(self, disabled=True):
        """临时禁用显示控件防止并发操作"""
        try:
            # 禁用/启用显示模式按钮
            for btn_name in ['wireframe_btn', 'solid_btn', 'transparent_btn']:
                btn = getattr(self, btn_name, None)
                if btn:
                    btn.setEnabled(not disabled)
                    
            # 禁用/启用复选框
            checkbox_names = [
                'show_mesh_cb', 'show_nodes_cb', 'show_supports_cb', 'show_loads_cb',
                'show_soil_cb', 'show_anchors_cb', 'show_diaphragm_wall_cb', 
                'show_piles_cb', 'show_strutting_cb'
            ]
            for cb_name in checkbox_names:
                cb = getattr(self, cb_name, None)
                if cb:
                    cb.setEnabled(not disabled)
                    
        except Exception as e:
            print(f"⚠️ 控件状态切换失败: {e}")


class DisplayUpdateThread(QThread):
    """专用的显示更新线程"""
    finished = pyqtSignal()
    error = pyqtSignal(str)
    
    def __init__(self, preprocessor):
        super().__init__()
        self.preprocessor = preprocessor
        
    def run(self):
        """执行显示更新操作"""
        try:
            if hasattr(self.preprocessor, 'display_mesh'):
                # 🔧 修复：根据当前显示模式重新渲染
                current_mode = getattr(self.preprocessor, 'display_mode', 'transparent')
                print(f"🔄 重新渲染，当前模式: {current_mode}")
                
                # 清空现有显示
                if hasattr(self.preprocessor, 'plotter'):
                    self.preprocessor.plotter.clear()
                    # 重新设置背景
                    if hasattr(self.preprocessor, 'set_abaqus_style_background'):
                        self.preprocessor.set_abaqus_style_background()
                    
                # 根据模式重新渲染
                if current_mode == 'transparent':
                    self.preprocessor.display_transparent_layers()
                elif current_mode == 'wireframe':
                    self.preprocessor.display_wireframe_mode()
                else:
                    self.preprocessor.display_mesh()
                    
                self.finished.emit()
            else:
                self.error.emit("预处理器无display_mesh方法")
        except Exception as e:
            self.error.emit(str(e))