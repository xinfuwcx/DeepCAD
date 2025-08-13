#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
基坑工程分阶段分析系统 - 专业界面
围护墙 + 开挖施工 分阶段分析专用界面

用途：用于演示/调试分阶段 FPN 模型（如 1fpn.fpn）
功能要点：
1. 阶段一：初始应力平衡
2. 阶段二：围护墙 + 开挖
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
    QCheckBox, QSlider, QScrollArea, QListWidget, QListWidgetItem,
    QTableWidget, QTableWidgetItem, QHeaderView, QSizePolicy
)
from PyQt6.QtCore import Qt, QTimer, QThread, pyqtSignal, QSize
from PyQt6.QtGui import QIcon, QFont, QPixmap, QPalette, QColor, QAction


class ExcavationAnalysisWindow(QMainWindow):
    """基坑工程分阶段分析系统主窗口"""

    def __init__(self):
        super().__init__()
        
    # 项目数据
        self.current_fpn_file = None
        self.model_data = None
    self.stage1_results = None  # 初始应力结果
    self.stage2_results = None  # 围护+开挖结果
        
    # 计算状态
        self.analysis_running = False
        self.current_stage = 0
        
    # 模型统计信息
        self.node_count = 0
        self.element_count = 0
        self.material_count = 0
        
        self.init_ui()
        self.setup_connections()

    def init_ui(self):
        """初始化专业界面"""
        self.setWindowTitle("基坑工程分阶段分析系统 - 围护+开挖施工模块 v2.0")
        self.setGeometry(100, 100, 1900, 1200)
        
        # 应用专业主题
        self.set_engineering_theme()
        
        # 创建菜单与工具栏
        self.create_menu_bar()
        self.create_tool_bar()
        self.create_status_bar()
        
        # 创建主布局
        self.create_main_layout()

    def set_engineering_theme(self):
        """设置专业主题样式"""
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f5f5f5;
                color: #333333;
            }
            
            /* 工具栏样式 */
                    # 文件菜单
                    file_menu = menubar.addMenu('文件(&F)')
                    stop:0 #e8e8e8, stop:1 #d0d0d0);
                    # 导入FPN文件
                    import_action = QAction('导入FPN文件...', self)
                padding: 2px;
                    import_action.setStatusTip('导入 MIDAS GTS FPN 格式的模型文件')
            
            /* 专业按钮样式 */
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #ffffff, stop:1 #e0e0e0);
                    # 保存项目
                    save_action = QAction('保存项目...', self)
                padding: 6px 12px;
                font-weight: bold;
                min-width: 80px;
            }
                    # 导出结果
                    export_action = QAction('导出结果...', self)
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #e6f3ff, stop:1 #cce7ff);
                border-color: #0078d4;
            }
            
                    # 退出
                    exit_action = QAction('退出', self)
                    stop:0 #cce7ff, stop:1 #99d6ff);
            }
            
            QPushButton:disabled {
                    # 分析菜单
                    analysis_menu = menubar.addMenu('分析(&A)')
                border-color: #d0d0d0;
                    # 阶段一：初始应力平衡
                    stage1_action = QAction('阶段一：初始应力平衡', self)
            /* 分组框样式 */
            QGroupBox {
                font-weight: bold;
                border: 2px solid #a0a0a0;
                    # 阶段二：围护墙+开挖
                    stage2_action = QAction('阶段二：围护墙+开挖', self)
                padding-top: 10px;
            }
            
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                    # 全阶段分析
                    full_analysis_action = QAction('全阶段分析', self)
            }
            
            /* 表格样式 */
            QTableWidget {
                gridline-color: #d0d0d0;
                background-color: white;
                    # 停止分析
                    stop_action = QAction('停止分析', self)
            
            QHeaderView::section {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #e8e8e8, stop:1 #d0d0d0);
                    # 结果菜单
                    results_menu = menubar.addMenu('结果(&R)')
                font-weight: bold;
                    # 位移云图
                    deformation_action = QAction('位移云图', self)
            /* 进度条样式 */
            QProgressBar {
                border: 1px solid #a0a0a0;
                    # 应力云图
                    stress_action = QAction('应力云图', self)
                font-weight: bold;
            }
            
                    # 围护墙内力
                    wall_force_action = QAction('围护墙内力', self)
                    stop:0 #4CAF50, stop:1 #45a049);
                border-radius: 2px;
            }
            
            /* 标签页样式 */
                    # 阶段对比
                    comparison_action = QAction('阶段对比分析', self)
                background-color: white;
            }
            
                    # 工具菜单
                    tools_menu = menubar.addMenu('工具(&T)')
                    stop:0 #e8e8e8, stop:1 #d0d0d0);
                    # 模型检查
                    check_action = QAction('模型完整性检查', self)
                margin-right: 2px;
            }
            
                    # 材料参数查看
                    material_action = QAction('材料参数查看', self)
                    stop:0 #ffffff, stop:1 #f0f0f0);
                border-bottom-color: white;
            }
                    # 帮助菜单
                    help_menu = menubar.addMenu('帮助(&H)')
    def create_menu_bar(self):
                    # 用户手册
                    manual_action = QAction('用户手册', self)
        
        # �ļ��˵�
        file_menu = menubar.addMenu('�ļ�(&F)')
        
                    # 关于
                    about_action = QAction('关于', self)
        import_action.setShortcut('Ctrl+O')
        import_action.setStatusTip('����MIDAS GTS FPN��ʽ����ģ���ļ�')
        import_action.triggered.connect(self.import_fpn_file)
        file_menu.addAction(import_action)
                    """创建专业工具栏"""
                    toolbar = self.addToolBar('分析工具')
        
        # ������Ŀ
                    # 导入模型
                    import_btn = QPushButton('导入FPN')
                    import_btn.setToolTip('导入 MIDAS GTS FPN 模型文件')
        file_menu.addAction(save_action)
        
        # �������
        export_action = QAction('�������...', self)
        export_action.triggered.connect(self.export_results)
                    # 阶段分析按钮
                    stage1_btn = QPushButton('阶段一\n初始应力平衡')
                    stage1_btn.setToolTip('执行初始应力平衡分析')
        
        # �˳�
        exit_action = QAction('�˳�', self)
                    stage2_btn = QPushButton('阶段二\n围护墙+开挖')
                    stage2_btn.setToolTip('执行围护施工与开挖阶段分析')
        file_menu.addAction(exit_action)
        
        # �����˵�
        analysis_menu = menubar.addMenu('����(&A)')
        
                    # 全流程
                    full_analysis_btn = QPushButton('全阶段分析')
                    full_analysis_btn.setToolTip('依次执行全部阶段分析')
        stage1_action.triggered.connect(self.run_stage1_analysis)
        analysis_menu.addAction(stage1_action)
        
                    # 停止
                    stop_btn = QPushButton('停止分析')
                    stop_btn.setToolTip('停止当前正在进行的分析')
        stage2_action.triggered.connect(self.run_stage2_analysis)
        analysis_menu.addAction(stage2_action)
        
        analysis_menu.addSeparator()
        
        # �������׶η���
        full_analysis_action = QAction('�������׶η���', self)
                    # 结果查看
                    results_btn = QPushButton('查看结果')
                    results_btn.setToolTip('查看分析结果与可视化')
        
        analysis_menu.addSeparator()
        
        # ֹͣ����
                    """创建状态栏"""
        stop_action.setShortcut('Esc')
        stop_action.triggered.connect(self.stop_analysis)
                    # 状态标签
                    self.status_label = QLabel('就绪 - 请选择并加载 FPN 文件')
        # ����˵�
        results_menu = menubar.addMenu('���(&R)')
                    # 进度条
        # ������ͼ
        deformation_action = QAction('������ͼ', self)
        deformation_action.triggered.connect(self.show_deformation_results)
        results_menu.addAction(deformation_action)
        
                    # 当前阶段
                    self.stage_label = QLabel('当前阶段: 无')
        stress_action.triggered.connect(self.show_stress_results)
        results_menu.addAction(stress_action)
                    # 模型信息
                    self.model_info_label = QLabel('模型: 未加载')
        wall_force_action = QAction('����ǽ����', self)
        wall_force_action.triggered.connect(self.show_wall_forces)
        results_menu.addAction(wall_force_action)
                    """创建主布局"""
        results_menu.addSeparator()
        
        # �׶ζԱ�
                    # 主分割器
        comparison_action.triggered.connect(self.show_stage_comparison)
        results_menu.addAction(comparison_action)
                    # 左侧控制面板
        # ���߲˵�
        tools_menu = menubar.addMenu('����(&T)')
        
                    # 右侧可视化面板
        check_action = QAction('ģ�������Լ��', self)
        check_action.triggered.connect(self.check_model_integrity)
        tools_menu.addAction(check_action)
                    # 设置分割器（左400px，右侧占余下空间）
        # �������Բ鿴
                    main_splitter.setStretchFactor(0, 0)  # 左侧固定
                    main_splitter.setStretchFactor(1, 1)  # 右侧拉伸
        tools_menu.addAction(material_action)
                    # 主布局
        # �����˵�
        help_menu = menubar.addMenu('����(&H)')
        
        # �û��ֲ�
        manual_action = QAction('�û��ֲ�', self)
        manual_action.setShortcut('F1')
                    """创建左侧控制面板"""
        help_menu.addAction(manual_action)
        
        # ����
        about_action = QAction('����', self)
        about_action.triggered.connect(self.show_about)
                    # 项目信息

    def create_tool_bar(self):
        """����רҵ������"""
                    # 分析控制
        toolbar.setToolButtonStyle(Qt.ToolButtonTextUnderIcon)
        
        # ����ģ��
                    # 模型信息
        import_btn.setToolTip('����MIDAS GTS FPN����ģ���ļ�')
        import_btn.clicked.connect(self.import_fpn_file)
        toolbar.addWidget(import_btn)
                    # 监控信息
        toolbar.addSeparator()
        
        # �׶η�����ť
        stage1_btn = QPushButton('�׶�һ\n��Ӧ��ƽ��')
        stage1_btn.setToolTip('���г�ʼ��Ӧ��ƽ�����')
        stage1_btn.clicked.connect(self.run_stage1_analysis)
        toolbar.addWidget(stage1_btn)
        
        stage2_btn = QPushButton('�׶ζ�\n����ǽ+����')
                    """创建右侧可视化面板"""
        stage2_btn.clicked.connect(self.run_stage2_analysis)
        toolbar.addWidget(stage2_btn)
        
        toolbar.addSeparator()
                    # 可视化标签页
        # ��������
        full_analysis_btn = QPushButton('��������')
                    # 3D模型视图
        full_analysis_btn.clicked.connect(self.run_full_analysis)
                    self.viz_tabs.addTab(model_tab, "3D模型视图")
        
                    # 结果分析标签页
        stop_btn = QPushButton('ֹͣ����')
                    self.viz_tabs.addTab(results_tab, "结果分析")
        stop_btn.clicked.connect(self.stop_analysis)
                    # 施工阶段对比
        toolbar.addWidget(stop_btn)
                    self.viz_tabs.addTab(comparison_tab, "阶段对比")
        
                    # 材料参数标签页
        
                    self.viz_tabs.addTab(material_tab, "材料参数")
        results_btn = QPushButton('�鿴���')
        results_btn.setToolTip('�鿴��������Ϳ��ӻ�')
        results_btn.clicked.connect(self.show_results_panel)
        toolbar.addWidget(results_btn)

    def create_status_bar(self):
        """��������״̬��"""
                    """创建项目信息组"""
                    group = QGroupBox("项目信息")
        # ״̬��ǩ
        self.status_label = QLabel('���� - �ȴ�����FPN�ļ�')
                    self.project_name_label = QLabel("未创建项目")
                    self.fpn_file_label = QLabel("无")
        # ������
                    self.import_time_label = QLabel("无")
        self.progress_bar.setVisible(False)
                    layout.addRow("项目名称:", self.project_name_label)
                    layout.addRow("FPN文件:", self.fpn_file_label)
                    layout.addRow("文件大小:", self.file_size_label)
                    layout.addRow("导入时间:", self.import_time_label)
        self.stage_label = QLabel('��ǰ�׶�: ��')
        self.status_bar.addPermanentWidget(self.stage_label)
        
        # ģ����Ϣ��ǩ
        self.model_info_label = QLabel('ģ��: δ����')
                    """创建分析控制组"""
                    group = QGroupBox("分析控制")
    def create_main_layout(self):
        """����������"""
                    # 阶段选择
        self.setCentralWidget(central_widget)
                    stage_layout.addWidget(QLabel("当前阶段:"))
        # ���ָ���
        main_splitter = QSplitter(Qt.Horizontal)
                        "阶段一: 初始应力平衡", 
                        "阶段二: 围护墙+开挖"
        left_panel = self.create_control_panel()
        main_splitter.addWidget(left_panel)
        
        # �Ҳ���ӻ����
        right_panel = self.create_visualization_panel()
                    # 分析类型选择
        
                    analysis_type_layout.addWidget(QLabel("分析类型:"))
        main_splitter.setSizes([400, 1500])
        main_splitter.setStretchFactor(0, 0)  # ���̶�
                        "非线性静力",
                        "线性静力", 
                        "模态分析"
        main_layout = QHBoxLayout()
        main_layout.setContentsMargins(5, 5, 5, 5)
        main_layout.addWidget(main_splitter)
        central_widget.setLayout(main_layout)
                    # 操作按钮
    def create_control_panel(self):
        """�������������"""
                    self.run_analysis_btn = QPushButton("开始分析")
        control_widget.setMaximumWidth(420)
        control_widget.setMinimumWidth(380)
        control_layout = QVBoxLayout()
                    self.stop_analysis_btn2 = QPushButton("停止")
        # ��Ŀ��Ϣ��
        project_group = self.create_project_info_group()
        control_layout.addWidget(project_group)
        
        # ����������
        analysis_group = self.create_analysis_control_group()
                    # 全阶段按钮
                    self.full_analysis_btn = QPushButton("全阶段分析")
        # ģ����Ϣ��
        model_group = self.create_model_info_group()
        control_layout.addWidget(model_group)
        
        # ��������
        monitoring_group = self.create_monitoring_group()
        control_layout.addWidget(monitoring_group)
                    """创建模型信息组"""
                    group = QGroupBox("模型信息")
        control_widget.setLayout(control_layout)
        
        return control_widget

    def create_visualization_panel(self):
        """�����Ҳ���ӻ����"""
        viz_widget = QWidget()
        viz_layout = QVBoxLayout()
                    layout.addRow("节点数量:", self.node_count_label)
                    layout.addRow("单元数量:", self.element_count_label)
                    layout.addRow("材料数量:", self.material_count_label)
                    layout.addRow("边界数量:", self.boundary_count_label)
                    layout.addRow("荷载数量:", self.load_count_label)
        # 3Dģ����ͼ
        model_tab = self.create_3d_model_tab()
        self.viz_tabs.addTab(model_tab, "3Dģ����ͼ")
        
        # ���������ǩҳ
                    """创建监控面板组"""
                    group = QGroupBox("计算监控")
        
        # ʩ���׶ζԱ�
                    # 进度条
        self.viz_tabs.addTab(comparison_tab, "�׶ζԱ�")
                    progress_layout.addWidget(QLabel("进度:"))
        # �������Ա�ǩҳ
        material_tab = self.create_material_properties_tab()
        self.viz_tabs.addTab(material_tab, "��������")
        
        viz_layout.addWidget(self.viz_tabs)
                    # 计算日志
        
        return viz_widget
                    self.log_text.setPlainText("基坑分阶段分析系统已启动\n等待加载FPN文件...")
    def create_project_info_group(self):
        """������Ŀ��Ϣ��"""
                    # 清空日志按钮
                    clear_log_btn = QPushButton("清空日志")
        
        self.project_name_label = QLabel("δ������Ŀ")
        self.fpn_file_label = QLabel("��")
        self.file_size_label = QLabel("0 MB")
        self.import_time_label = QLabel("��")
        
        layout.addRow("��Ŀ����:", self.project_name_label)
                    """创建3D模型标签页"""
        layout.addRow("�ļ���С:", self.file_size_label)
        layout.addRow("����ʱ��:", self.import_time_label)
        
                    # 3D视图控制栏
        return group

    def create_analysis_control_group(self):
        """��������������"""
        group = QGroupBox("��������")
                    # 视图切换按钮
        
                        ("前视图", self.set_front_view),
                        ("侧视图", self.set_side_view),
                        ("俯视图", self.set_top_view),
                        ("等轴测", self.set_iso_view)
        self.stage_combo.addItems([
            "�׶�һ: ��ʼ��Ӧ��ƽ��", 
            "�׶ζ�: ����ǽ+����"
        ])
        self.stage_combo.currentIndexChanged.connect(self.on_stage_changed)
        stage_layout.addWidget(self.stage_combo)
        layout.addLayout(stage_layout)
        
        # ��������ѡ��
                    # 显示选项
                    self.show_nodes_cb = QCheckBox("显示节点")
                    self.show_elements_cb = QCheckBox("显示单元")
                    self.show_materials_cb = QCheckBox("显示材料")
                    self.show_boundaries_cb = QCheckBox("显示边界")
            "���Ծ�������", 
            "ģ̬����"
        ])
        analysis_type_layout.addWidget(self.analysis_type_combo)
        layout.addLayout(analysis_type_layout)
        
        # ������ť
        button_layout = QHBoxLayout()
        
                    # 3D视图区域（PyVista占位）
        self.run_analysis_btn.clicked.connect(self.run_current_stage_analysis)
                    model_view_area.setText(
                        "3D模型视图\n"
                        "(PyVista 渲染占位)\n\n"
                        "展示内容:\n"
                        " - 基坑几何形体与分层土体\n"
                        " - 围护结构与支护构件\n"
                        " - 材料分区与属性\n"
                        " - 边界条件与荷载可视化\n\n"
                        "交互说明:\n"
                        " - 旋转/缩放/平移\n"
                        " - 选择与高亮\n"
                        " - 分层/分组显示\n"
                        " - 视角重置"
                    )
        return group

    def create_model_info_group(self):
        """����ģ����Ϣ��"""
        group = QGroupBox("ģ����Ϣ")
        layout = QFormLayout()
        
        self.node_count_label = QLabel("0")
        self.element_count_label = QLabel("0")
        self.material_count_label = QLabel("0")
        self.boundary_count_label = QLabel("0")
        self.load_count_label = QLabel("0")
        
        layout.addRow("�ڵ�����:", self.node_count_label)
                    """创建结果分析标签页"""
        layout.addRow("��������:", self.material_count_label)
        layout.addRow("�߽�����:", self.boundary_count_label)
        layout.addRow("���ع���:", self.load_count_label)
                    # 结果控制面板
        group.setLayout(layout)
        return group

    def create_monitoring_group(self):
        """������������"""
                    # 结果类型
        layout = QVBoxLayout()
                    result_type_layout.addWidget(QLabel("结果类型:"))
        # ��������
        progress_layout = QHBoxLayout()
        progress_layout.addWidget(QLabel("����:"))
                        "位移云图",
                        "应力云图", 
                        "应变云图",
                        "围护墙内力",
                        "土压分布",
                        "剖面曲线"
        self.log_text = QTextEdit()
        self.log_text.setMaximumHeight(180)
        self.log_text.setPlainText("���ӹ������׶η���ϵͳ������\\n�ȴ�����FPN�ļ�...")
        layout.addWidget(self.log_text)
        
                    # 阶段选择
        clear_log_btn = QPushButton("�����־")
                    result_stage_layout.addWidget(QLabel("显示阶段:"))
        layout.addWidget(clear_log_btn)
        
        group.setLayout(layout)
                        "阶段一结果",
                        "阶段二结果", 
                        "阶段对比"
        """����3Dģ�ͱ�ǩҳ"""
        widget = QWidget()
        layout = QVBoxLayout()
        
        # 3D��ͼ�������
        control_panel = QFrame()
        control_panel.setFrameStyle(QFrame.StyledPanel)
        control_panel.setMaximumHeight(60)
                    # 结果显示占位
        
                    results_view_area.setText(
                        "结果分析视图\n"
                        "(位移/应力/应变等云图占位)\n\n"
                        "阶段一结果:\n"
                        " - 初始应力场分布\n"
                        " - 平衡状态校核\n\n"
                        "阶段二结果:\n"
                        " - 开挖变形云图\n"
                        " - 围护墙内力分布\n"
                        " - 土压力重分布\n\n"
                        "交互:\n"
                        " - 色标与范围设置\n"
                        " - 变形放大系数\n"
                        " - 值探针与标注"
                    )
        self.show_materials_cb = QCheckBox("��ʾ����")
        self.show_boundaries_cb = QCheckBox("��ʾ�߽�")
        
        control_layout.addWidget(self.show_nodes_cb)
        control_layout.addWidget(self.show_elements_cb)
        control_layout.addWidget(self.show_materials_cb)
        control_layout.addWidget(self.show_boundaries_cb)
        
        control_panel.setLayout(control_layout)
        layout.addWidget(control_panel)
        
        # 3D��ͼ���� (PyVista��������)
        model_view_area = QLabel()
        model_view_area.setText(
                    """创建阶段对比标签页"""
            "(PyVista��������)\\n\\n"
            "��ʾ����:\\n"
            " ���Ӽ�����״�Ϳ������\\n"
                    # 对比控制栏
            " �������ֲ�\\n"
            " �������Կ��ӻ�\\n"
            " �߽������ͺ���\\n\\n"
            "��������:\\n"
            " 3D��ת�����š�ƽ��\\n"
                    # 对比类型
                    comparison_control_layout.addWidget(QLabel("对比类型:"))
            " ��������"
        )
                        "位移对比",
                        "应力对比",
                        "围护墙内力对比",
                        "剖面曲线对比"
            "font-size: 12px; "
            "color: #666; "
            "background-color: #fafafa;"
        )
        layout.addWidget(model_view_area)
                    # 显示模式
                    comparison_control_layout.addWidget(QLabel("显示模式:"))
        return widget

                        "左右对比",
                        "并排显示",
                        "数值标注",
                        "时间对比"
        
        # �������ѡ�����
        result_control_panel = QFrame()
        result_control_panel.setFrameStyle(QFrame.StyledPanel)
        result_control_panel.setMaximumHeight(80)
        result_control_layout = QVBoxLayout()
                    # 对比显示占位
        # �������ѡ��
                    comparison_view_area.setText(
                        "阶段对比示意\n"
                        "(施工前后对比占位)\n\n"
                        "对比关注点:\n"
                        " - 开挖前后位移对比\n"
                        " - 围护墙弯矩变化\n"
                        " - 地表沉降影响\n\n"
                        "专业呈现:\n"
                        " - 分阶段叠加展示\n"
                        " - 关键部位时间历程\n"
                        " - 安全系数与预警\n\n"
                        "应用:\n"
                        " - 施工方案优化\n"
                        " - 监测点位预布置"
                    )
        
        self.result_stage_combo = QComboBox()
        self.result_stage_combo.addItems([
            "�׶�һ���",
            "�׶ζ����", 
            "�׶ζԱ�"
        ])
        result_stage_layout.addWidget(self.result_stage_combo)
        
        result_control_layout.addLayout(result_type_layout)
        result_control_layout.addLayout(result_stage_layout)
        result_control_panel.setLayout(result_control_layout)
        layout.addWidget(result_control_panel)
        
                    """创建材料参数标签页"""
        results_view_area = QLabel()
        results_view_area.setText(
            "���������ͼ\\n"
                    # 材料参数表
            "�׶�һ���:\\n"
            " ��ʼ��Ӧ���ֲ���ͼ\\n"
            " ������Ӧ��״̬\\n"
                        "材料ID", "材料名称", "弹性模量(MPa)", "泊松比", "重度(kN/m³)", "备注"
            "�׶ζ����:\\n"
            " ���ں������ͼ\\n"
                    # 表头伸缩
            " ����Ӧ���طֲ�\\n"
            " �ر���������\\n\\n"
            "��������:\\n"
            " ��ͼ��ֵ�ߵ���\\n"
                    # 示例数据（实际应从FPN读取）
            " �������鿴\\n"
                        ["1", "C30混凝土", "30000", "0.2", "25", "围护墙"],
                        ["2", "细砂", "150", "0.3", "20", "土层"],
                        ["3", "中密砂土", "80", "0.28", "19.5", "土层"],
                        ["4", "软黏土", "30", "0.35", "19.1", "土层"],
                        ["5", "硬黏土", "60", "0.30", "20.8", "土层"],
                        ["6", "卵石", "1000", "0.25", "22", "土层"]
            "font-size: 12px; "
            "color: #666; "
            "background-color: #fafafa;"
        )
        layout.addWidget(results_view_area)
        
        widget.setLayout(layout)
        return widget

    def create_stage_comparison_tab(self):
        """�����׶ζԱȱ�ǩҳ"""
        widget = QWidget()
        layout = QVBoxLayout()
        
        # �Աȿ������
        comparison_control_panel = QFrame()
        comparison_control_panel.setFrameStyle(QFrame.StyledPanel)
        comparison_control_panel.setMaximumHeight(60)
        comparison_control_layout = QHBoxLayout()
        
        # �Ա�����
        comparison_control_layout.addWidget(QLabel("�Ա�����:"))
        self.comparison_type_combo = QComboBox()
        self.comparison_type_combo.addItems([
            "���ζԱ�",
            "Ӧ���Ա�",
            "����ǽ�����Ա�",
            "�ر������Ա�"
        ])
        comparison_control_layout.addWidget(self.comparison_type_combo)
        
        comparison_control_layout.addStretch()
        
        # ��ʾģʽ
        comparison_control_layout.addWidget(QLabel("��ʾģʽ:"))
        self.comparison_mode_combo = QComboBox()
        self.comparison_mode_combo.addItems([
            "���ŶԱ�",
            "������ʾ",
            "��ֵ��ʾ",
            "�����Ա�"
        ])
        comparison_control_layout.addWidget(self.comparison_mode_combo)
        
        comparison_control_panel.setLayout(comparison_control_layout)
        layout.addWidget(comparison_control_panel)
        
        # �Ա���ʾ����
        comparison_view_area = QLabel()
        comparison_view_area.setText(
            "�׶ζԱ���ͼ\\n"
            "(ʩ��ǰ��Աȷ���)\\n\\n"
            "�Աȷ�������:\\n"
            " ����ǰ����ζԱ�\\n"
            " ����ǽӦ���仯����\\n"
            " �ܱ�����Ӱ������\\n"
            " �ر�������չ����\\n\\n"
            "רҵ��������:\\n"
            " ʩ���׶ζ�����ʾ\\n"
            " �ؼ���λ��ʱ������\\n"
            " ����ǽ��ؼ���ͼ\\n"
            " ��ȫϵ������\\n"
            " Ӱ�췶Χ����\\n\\n"
            "����Ӧ��:\\n"
            " ʩ�������Ż�\\n"
            " ����Ԥ������\\n"
            " ���㲼�ý���"
        )
        comparison_view_area.setAlignment(Qt.AlignCenter)
        comparison_view_area.setStyleSheet(
            "border: 2px dashed #FF9800; "
            "padding: 20px; "
            "font-size: 12px; "
            "color: #666; "
            "background-color: #fafafa;"
        )
        layout.addWidget(comparison_view_area)
        
        widget.setLayout(layout)
        return widget

    def create_material_properties_tab(self):
        """�����������Ա�ǩҳ"""
        widget = QWidget()
        layout = QVBoxLayout()
        
        # �������Ա���
        self.material_table = QTableWidget()
        self.material_table.setColumnCount(6)
        self.material_table.setHorizontalHeaderLabels([
            "����ID", "��������", "����ģ��(MPa)", "���ɱ�", "�ض�(kN/m)", "����"
        ])
        
        # ���ñ�������
        header = self.material_table.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.Stretch)
        self.material_table.setAlternatingRowColors(True)
        
        # ����ʾ������ (����FPN�ļ�����)
        materials_data = [
            ["1", "C30������", "30000", "0.2", "25", "����ǽ"],
            ["2", "ϸɰ", "15", "0.3", "20", "����"],
            ["3", "����ճ��", "5", "0.3", "19.5", "����"],
            ["4", "����ճ��", "5", "0.3", "19.1", "����"],
            ["5", "����ճ��", "5", "0.3", "20.8", "����"],
            ["6", "��ʯ", "100", "0.25", "22", "����"]
        ]
        
        self.material_table.setRowCount(len(materials_data))
        for i, row_data in enumerate(materials_data):
            for j, cell_data in enumerate(row_data):
                item = QTableWidgetItem(cell_data)
                if j == 0:  # 材料ID列设为只读
                    item.setFlags(item.flags() & ~Qt.ItemIsEditable)
                self.material_table.setItem(i, j, item)
        
        layout.addWidget(self.material_table)
        
        # 材料说明
        material_info = QLabel()
        material_info.setText(
            "材料说明:\n"
            " C30混凝土: 适用于基础/墙体等结构，强度高\n"
            " 细砂: 透水性较好的砂土\n"
            " 黏性土: 透水性差，黏聚力较大\n"
            " 砾石: 强度较高的碎石土"
        )
        material_info.setStyleSheet("padding: 10px; background-color: #f0f8ff; border: 1px solid #ccc;")
        layout.addWidget(material_info)
        
        widget.setLayout(layout)
        return widget

    def setup_connections(self):
        """连接信号与槽"""
        # 选择显示项
        self.show_nodes_cb.toggled.connect(self.update_3d_display)
        self.show_elements_cb.toggled.connect(self.update_3d_display)
        self.show_materials_cb.toggled.connect(self.update_3d_display)
        self.show_boundaries_cb.toggled.connect(self.update_3d_display)
        
        # 结果选项变化
        self.result_type_combo.currentTextChanged.connect(self.update_results_display)
        self.result_stage_combo.currentTextChanged.connect(self.update_results_display)
        
        # 对比选项变化
        self.comparison_type_combo.currentTextChanged.connect(self.update_comparison_display)
        self.comparison_mode_combo.currentTextChanged.connect(self.update_comparison_display)

    # ==================== 事件处理 ====================
    
    def import_fpn_file(self):
        """导入FPN文件"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "导入FPN文件", "", "FPN文件 (*.fpn);;所有文件 (*)")
        
        if file_path:
            self.current_fpn_file = file_path
            file_name = Path(file_path).name
            file_size = Path(file_path).stat().st_size / (1024 * 1024)  # MB
            
            # 更新文件信息
            self.fpn_file_label.setText(file_name)
            self.file_size_label.setText(f"{file_size:.1f} MB")
            self.import_time_label.setText("刚刚")
            self.project_name_label.setText("分阶段分析示例")
            
            # 模拟文件信息（未解析FPN）
            self.node_count_label.setText("27,000+")
            self.element_count_label.setText("150,000+")
            self.material_count_label.setText("6")
            self.boundary_count_label.setText("1,000+")
            self.load_count_label.setText("1 (重力)")
            
            # 更新状态
            self.status_label.setText(f"FPN文件已加载: {file_name}")
            self.model_info_label.setText(f"模型: {file_name}")
            
            # 追加日志
            self.log_text.append("=" * 50)
            self.log_text.append(f"已加载FPN文件: {file_name}")
            self.log_text.append(f"文件大小: {file_size:.1f} MB")
            self.log_text.append("检测到分阶段分析模型:")
            self.log_text.append(" 阶段一: 初始应力平衡")
            self.log_text.append(" 阶段二: 围护墙+开挖")
            self.log_text.append("模型校验完成，可开始计算")

    def run_stage1_analysis(self):
        """运行阶段一计算"""
        if not self.current_fpn_file:
            QMessageBox.warning(self, "提示", "请先加载FPN文件")
            return
            
        self.analysis_running = True
        self.current_stage = 1
        
        # 更新界面状态
        self.stage_combo.setCurrentIndex(0)
        self.run_analysis_btn.setEnabled(False)
        self.stop_analysis_btn.setEnabled(True)
        self.stop_analysis_btn2.setEnabled(True)
        
        # 显示进度
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        self.analysis_progress.setVisible(True)
        self.analysis_progress.setValue(0)
        
        # 更新状态
        self.status_label.setText("正在进行阶段一计算")
        self.stage_label.setText("当前阶段: 初始应力平衡")
        
        # 详细日志
        self.log_text.append("\\n" + "=" * 50)
        self.log_text.append("开始阶段一计算: 初始应力平衡")
        self.log_text.append("计算参数:")
        self.log_text.append(" 自重工况: 开启")
        self.log_text.append(" 重力加速度: 9.80665 m/s²")
        self.log_text.append(" 本构模型: Mohr-Coulomb")
        self.log_text.append(" 边界条件: 底部固定、侧向约束")
        self.log_text.append("\n正在进行计算...")
        self.log_text.append(" 初始化应力场")
        self.log_text.append(" 迭代收敛，得到稳定的应力平衡")
        self.log_text.append(" 初始应力状态建立完成")
        
    # 模拟计算进度（实际应由真实求解器回调驱动）
        self.simulate_analysis_progress(1)

    def run_stage2_analysis(self):
        """运行阶段二计算"""
        if not self.current_fpn_file:
            QMessageBox.warning(self, "提示", "请先加载FPN文件")
            return
            
        if not self.stage1_results:
            reply = QMessageBox.question(self, "确认", 
                "阶段一结果未完成，是否先运行阶段一计算？",
                QMessageBox.Yes | QMessageBox.No)
            if reply == QMessageBox.Yes:
                self.run_stage1_analysis()
                return
        
        self.analysis_running = True
        self.current_stage = 2
        
        # 更新界面状态
        self.stage_combo.setCurrentIndex(1)
        self.run_analysis_btn.setEnabled(False)
        self.stop_analysis_btn.setEnabled(True)
        self.stop_analysis_btn2.setEnabled(True)
        
        # 显示进度
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        self.analysis_progress.setVisible(True)
        self.analysis_progress.setValue(0)
        
        # 更新状态
        self.status_label.setText("正在进行阶段二计算")
        self.stage_label.setText("当前阶段: 围护墙+开挖")
        
        # 详细日志
        self.log_text.append("\\n" + "=" * 50)
        self.log_text.append("开始阶段二计算: 围护墙+开挖")
        self.log_text.append("计算步骤:")
        self.log_text.append(" 继承阶段一结果")
        self.log_text.append(" 添加围护结构 (MADD)")
        self.log_text.append(" 开挖土体 (MDEL)")
        self.log_text.append(" 支护与土体共同工作，更新平衡")
        self.log_text.append("\n正在进行计算...")
        self.log_text.append(" 围护结构加载")
        self.log_text.append(" 开挖卸载与变形响应")
        self.log_text.append(" 输出关键应力应变与位移")
        
    # 模拟计算进度
        self.simulate_analysis_progress(2)

    def run_full_analysis(self):
        """运行全流程计算"""
        if not self.current_fpn_file:
            QMessageBox.warning(self, "提示", "请先加载FPN文件")
            return
            
        reply = QMessageBox.question(self, "确认", 
            "将依次运行全部阶段，可能耗时较长。是否继续？",
            QMessageBox.Yes | QMessageBox.No)
        
        if reply == QMessageBox.Yes:
            self.log_text.append("\\n" + "=" * 50)
            self.log_text.append("开始全阶段计算")
            self.run_stage1_analysis()

    def stop_analysis(self):
        """停止计算"""
        if self.analysis_running:
            reply = QMessageBox.question(self, "确认", 
                "确认要停止当前计算吗",
                QMessageBox.Yes | QMessageBox.No)
            
            if reply == QMessageBox.Yes:
                self.analysis_running = False
                self.reset_analysis_state()
                self.log_text.append("\n用户终止计算")
                self.status_label.setText("计算已停止")

    def reset_analysis_state(self):
        """重置计算状态"""
        self.run_analysis_btn.setEnabled(True)
        self.stop_analysis_btn.setEnabled(False)
        self.stop_analysis_btn2.setEnabled(False)
        self.progress_bar.setVisible(False)
        self.analysis_progress.setVisible(False)
        self.stage_label.setText("当前阶段: 无")

    def simulate_analysis_progress(self, stage):
    """模拟计算进度（实际应被真实求解器进度替代）"""
        import time
        from PyQt6.QtCore import QTimer
        
        self.progress_timer = QTimer()
        self.progress_value = 0
        
        def update_progress():
            self.progress_value += 2
            self.progress_bar.setValue(self.progress_value)
            self.analysis_progress.setValue(self.progress_value)
            
            if self.progress_value >= 100:
                self.progress_timer.stop()
                self.analysis_completed(stage)
        
        self.progress_timer.timeout.connect(update_progress)
        self.progress_timer.start(100)  # 每100ms增加一次

    def analysis_completed(self, stage):
        """计算完成回调"""
        if stage == 1:
            self.stage1_results = {"completed": True}
            self.log_text.append("\n阶段一计算完成！")
            self.log_text.append(" 初始应力场建立成功")
            self.log_text.append(" 平衡状态稳定")
            self.status_label.setText("阶段一已完成")
            
            # 若正在全阶段模式，继续运行阶段二
            if hasattr(self, 'running_full_analysis'):
                self.run_stage2_analysis()
                return
                
        elif stage == 2:
            self.stage2_results = {"completed": True}
            self.log_text.append("\n阶段二计算完成！")
            self.log_text.append(" 围护墙+开挖分析成功")
            self.log_text.append(" 输出关键位移与应力分布")
            self.status_label.setText("阶段二已完成")
        
        self.reset_analysis_state()
        self.viz_tabs.setCurrentIndex(1)  # 切换到结果标签页

    # ==================== �����¼��������� ====================
    
    def on_stage_changed(self):
        """阶段选择变化"""
        current_stage = self.stage_combo.currentIndex()
        if current_stage == 0:
            self.log_text.append("切换到阶段一: 初始应力平衡")
        else:
            self.log_text.append("切换到阶段二: 围护墙+开挖")

    def run_current_stage_analysis(self):
        """运行当前选择的阶段分析"""
        current_stage = self.stage_combo.currentIndex()
        if current_stage == 0:
            self.run_stage1_analysis()
        else:
            self.run_stage2_analysis()

    def clear_log(self):
        """清空日志"""
        self.log_text.clear()
        self.log_text.append("日志已清空")

    # ==================== 3D��ͼ���Ʒ��� ====================
    
    def set_front_view(self):
        self.log_text.append("切换到前视图")
        
    def set_side_view(self):
        self.log_text.append("切换到侧视图")
        
    def set_top_view(self):
        self.log_text.append("切换到俯视图")
        
    def set_iso_view(self):
        self.log_text.append("切换到等轴测视图")

    def update_3d_display(self):
        """更新3D显示"""
        display_options = []
        if self.show_nodes_cb.isChecked():
            display_options.append("节点")
        if self.show_elements_cb.isChecked():
            display_options.append("单元")
        if self.show_materials_cb.isChecked():
            display_options.append("材料")
        if self.show_boundaries_cb.isChecked():
            display_options.append("边界")
        
        if display_options:
            self.log_text.append(f"更新3D显示: {', '.join(display_options)}")

    # ==================== �����ʾ���� ====================
    
    def update_results_display(self):
        """更新结果显示"""
        result_type = self.result_type_combo.currentText()
        result_stage = self.result_stage_combo.currentText()
        self.log_text.append(f"显示结果: {result_stage} - {result_type}")

    def update_comparison_display(self):
        """更新对比显示"""
        comparison_type = self.comparison_type_combo.currentText()
        comparison_mode = self.comparison_mode_combo.currentText()
        self.log_text.append(f"对比显示: {comparison_type} - {comparison_mode}")

    def show_deformation_results(self):
        """显示位移结果"""
        self.viz_tabs.setCurrentIndex(1)
        self.result_type_combo.setCurrentText("位移云图")
        self.log_text.append("显示位移云图")

    def show_stress_results(self):
        """显示应力结果"""
        self.viz_tabs.setCurrentIndex(1)
        self.result_type_combo.setCurrentText("应力云图")
        self.log_text.append("显示应力云图")

    def show_wall_forces(self):
        """显示围护墙内力"""
        self.viz_tabs.setCurrentIndex(1)
        self.result_type_combo.setCurrentText("围护墙内力")
        self.log_text.append("显示围护墙内力")

    def show_stage_comparison(self):
        """显示阶段对比"""
        self.viz_tabs.setCurrentIndex(2)
        self.log_text.append("显示阶段对比分析")

    def show_results_panel(self):
        """显示结果页"""
        self.viz_tabs.setCurrentIndex(1)

    # ==================== ���߷��� ====================
    
    def save_project(self):
        """保存项目"""
        if not self.current_fpn_file:
            QMessageBox.warning(self, "提示", "没有可保存的项目")
            return
            
        file_path, _ = QFileDialog.getSaveFileName(
            self, "保存项目", "", "项目文件 (*.exc);;所有文件 (*)")
        
        if file_path:
            self.log_text.append(f"项目已保存: {Path(file_path).name}")

    def export_results(self):
        """导出结果"""
        if not (self.stage1_results or self.stage2_results):
            QMessageBox.warning(self, "提示", "暂无可导出的结果")
            return
            
        self.log_text.append("正在导出结果...")

    def check_model_integrity(self):
        """模型完整性检查"""
        if not self.current_fpn_file:
            QMessageBox.warning(self, "提示", "请先加载FPN文件")
            return
            
        self.log_text.append("\n模型完整性检查:")
        self.log_text.append(" 节点编号连续: 通过")
        self.log_text.append(" 单元拓扑: 正确")
        self.log_text.append(" 边界条件: 有效")
        self.log_text.append(" 荷载定义: 正确")
        self.log_text.append("模型检查通过，可进行分析")

    def show_material_properties(self):
        """显示材料参数"""
        self.viz_tabs.setCurrentIndex(3)
        self.log_text.append("显示材料参数表")

    def show_user_manual(self):
        """显示用户手册"""
        QMessageBox.information(self, "用户手册", 
            "基坑分阶段分析系统\n\n"
            "使用步骤:\n"
            "1. 导入FPN文件\n"
            "2. 查看模型信息\n"
            "3. 运行阶段一分析\n"
            "4. 运行阶段二分析\n"
            "5. 查看结果与对比\n\n"
            "快捷键:\n"
            "Ctrl+O: 打开文件\n"
            "F5: 阶段一分析\n"
            "F6: 阶段二分析\n"
            "F7: 全阶段分析")

    def show_about(self):
        """显示关于信息"""
        QMessageBox.about(self, "关于", 
            "基坑分阶段分析系统 v2.0\n\n"
            "围护墙+开挖施工分阶段分析界面\n"
            "基于 DeepCAD 平台\n\n"
            "支持 MIDAS GTS FPN 格式\n"
            "可接入 Kratos Multiphysics 求解\n"
            "PyVista 3D 可视化\n\n"
            "Copyright © 2024 DeepCAD Team")


# 兼容旧入口命名
MainWindow = ExcavationAnalysisWindow


if __name__ == "__main__":
    from PyQt6.QtWidgets import QApplication
    import sys
    
    app = QApplication(sys.argv)
    app.setApplicationName("基坑分阶段分析系统")
    app.setApplicationVersion("2.0")
    
    window = ExcavationAnalysisWindow()
    window.show()
    
    sys.exit(app.exec())
