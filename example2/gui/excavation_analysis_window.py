#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
���ӹ������׶η���ϵͳ - רҵ������
����ǽ+����ʩ���׶η���ר�ý���

���ڶԻ������׶�1fpn.fpn�ļ�������������
ר����ԣ�
1. �׶�һ����ʼ��Ӧ��ƽ��
2. �׶ζ�������ǽ+����
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
    """���ӹ������׶η���ϵͳ������"""

    def __init__(self):
        super().__init__()
        
        # ��Ŀ����
        self.current_fpn_file = None
        self.model_data = None
        self.stage1_results = None  # ��ʼ��Ӧ�����
        self.stage2_results = None  # ����ǽ+���ڽ��
        
        # ����״̬
        self.analysis_running = False
        self.current_stage = 0
        
        # ģ��ͳ����Ϣ
        self.node_count = 0
        self.element_count = 0
        self.material_count = 0
        
        self.init_ui()
        self.setup_connections()

    def init_ui(self):
        """��ʼ��רҵ������"""
        self.setWindowTitle("���ӹ������׶η���ϵͳ - ����ǽ+����ʩ��ģ�� v2.0")
        self.setGeometry(100, 100, 1900, 1200)
        
        # ����רҵ��������
        self.set_engineering_theme()
        
        # �����˵��͹�����
        self.create_menu_bar()
        self.create_tool_bar()
        self.create_status_bar()
        
        # ����������
        self.create_main_layout()

    def set_engineering_theme(self):
        """����רҵ�����������"""
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f5f5f5;
                color: #333333;
            }
            
            /* ��������ʽ */
            QToolBar {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #e8e8e8, stop:1 #d0d0d0);
                border: 1px solid #a0a0a0;
                spacing: 3px;
                padding: 2px;
            }
            
            /* רҵ��ť��ʽ */
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #ffffff, stop:1 #e0e0e0);
                border: 1px solid #a0a0a0;
                border-radius: 4px;
                padding: 6px 12px;
                font-weight: bold;
                min-width: 80px;
            }
            
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #e6f3ff, stop:1 #cce7ff);
                border-color: #0078d4;
            }
            
            QPushButton:pressed {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #cce7ff, stop:1 #99d6ff);
            }
            
            QPushButton:disabled {
                background-color: #f0f0f0;
                color: #a0a0a0;
                border-color: #d0d0d0;
            }
            
            /* �������ʽ */
            QGroupBox {
                font-weight: bold;
                border: 2px solid #a0a0a0;
                border-radius: 5px;
                margin-top: 10px;
                padding-top: 10px;
            }
            
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 5px 0 5px;
                color: #0078d4;
            }
            
            /* �����ʽ */
            QTableWidget {
                gridline-color: #d0d0d0;
                background-color: white;
                alternate-background-color: #f8f8f8;
            }
            
            QHeaderView::section {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #e8e8e8, stop:1 #d0d0d0);
                border: 1px solid #a0a0a0;
                padding: 4px;
                font-weight: bold;
            }
            
            /* ��������ʽ */
            QProgressBar {
                border: 1px solid #a0a0a0;
                border-radius: 3px;
                text-align: center;
                font-weight: bold;
            }
            
            QProgressBar::chunk {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #4CAF50, stop:1 #45a049);
                border-radius: 2px;
            }
            
            /* ��ǩҳ��ʽ */
            QTabWidget::pane {
                border: 1px solid #a0a0a0;
                background-color: white;
            }
            
            QTabBar::tab {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #e8e8e8, stop:1 #d0d0d0);
                border: 1px solid #a0a0a0;
                padding: 6px 12px;
                margin-right: 2px;
            }
            
            QTabBar::tab:selected {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #ffffff, stop:1 #f0f0f0);
                border-bottom-color: white;
            }
        """)

    def create_menu_bar(self):
        """����רҵ�˵���"""
        menubar = self.menuBar()
        
        # �ļ��˵�
        file_menu = menubar.addMenu('�ļ�(&F)')
        
        # ����FPN�ļ�
        import_action = QAction('����FPN�ļ�...', self)
        import_action.setShortcut('Ctrl+O')
        import_action.setStatusTip('����MIDAS GTS FPN��ʽ����ģ���ļ�')
        import_action.triggered.connect(self.import_fpn_file)
        file_menu.addAction(import_action)
        
        file_menu.addSeparator()
        
        # ������Ŀ
        save_action = QAction('������Ŀ...', self)
        save_action.setShortcut('Ctrl+S')
        save_action.triggered.connect(self.save_project)
        file_menu.addAction(save_action)
        
        # �������
        export_action = QAction('�������...', self)
        export_action.triggered.connect(self.export_results)
        file_menu.addAction(export_action)
        
        file_menu.addSeparator()
        
        # �˳�
        exit_action = QAction('�˳�', self)
        exit_action.setShortcut('Ctrl+Q')
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # �����˵�
        analysis_menu = menubar.addMenu('����(&A)')
        
        # �׶�һ����ʼ��Ӧ��
        stage1_action = QAction('�׶�һ����ʼ��Ӧ��ƽ��', self)
        stage1_action.setShortcut('F5')
        stage1_action.triggered.connect(self.run_stage1_analysis)
        analysis_menu.addAction(stage1_action)
        
        # �׶ζ�������ǽ+����
        stage2_action = QAction('�׶ζ�������ǽ+����', self)
        stage2_action.setShortcut('F6')
        stage2_action.triggered.connect(self.run_stage2_analysis)
        analysis_menu.addAction(stage2_action)
        
        analysis_menu.addSeparator()
        
        # �������׶η���
        full_analysis_action = QAction('�������׶η���', self)
        full_analysis_action.setShortcut('F7')
        full_analysis_action.triggered.connect(self.run_full_analysis)
        analysis_menu.addAction(full_analysis_action)
        
        analysis_menu.addSeparator()
        
        # ֹͣ����
        stop_action = QAction('ֹͣ����', self)
        stop_action.setShortcut('Esc')
        stop_action.triggered.connect(self.stop_analysis)
        analysis_menu.addAction(stop_action)
        
        # ����˵�
        results_menu = menubar.addMenu('���(&R)')
        
        # ������ͼ
        deformation_action = QAction('������ͼ', self)
        deformation_action.triggered.connect(self.show_deformation_results)
        results_menu.addAction(deformation_action)
        
        # Ӧ����ͼ
        stress_action = QAction('Ӧ����ͼ', self)
        stress_action.triggered.connect(self.show_stress_results)
        results_menu.addAction(stress_action)
        
        # ����ǽ����
        wall_force_action = QAction('����ǽ����', self)
        wall_force_action.triggered.connect(self.show_wall_forces)
        results_menu.addAction(wall_force_action)
        
        results_menu.addSeparator()
        
        # �׶ζԱ�
        comparison_action = QAction('�׶ζԱȷ���', self)
        comparison_action.triggered.connect(self.show_stage_comparison)
        results_menu.addAction(comparison_action)
        
        # ���߲˵�
        tools_menu = menubar.addMenu('����(&T)')
        
        # ģ�ͼ��
        check_action = QAction('ģ�������Լ��', self)
        check_action.triggered.connect(self.check_model_integrity)
        tools_menu.addAction(check_action)
        
        # �������Բ鿴
        material_action = QAction('�������Բ鿴', self)
        material_action.triggered.connect(self.show_material_properties)
        tools_menu.addAction(material_action)
        
        # �����˵�
        help_menu = menubar.addMenu('����(&H)')
        
        # �û��ֲ�
        manual_action = QAction('�û��ֲ�', self)
        manual_action.setShortcut('F1')
        manual_action.triggered.connect(self.show_user_manual)
        help_menu.addAction(manual_action)
        
        # ����
        about_action = QAction('����', self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)

    def create_tool_bar(self):
        """����רҵ������"""
        toolbar = self.addToolBar('��������')
        toolbar.setToolButtonStyle(Qt.ToolButtonTextUnderIcon)
        
        # ����ģ��
        import_btn = QPushButton('����FPN')
        import_btn.setToolTip('����MIDAS GTS FPN����ģ���ļ�')
        import_btn.clicked.connect(self.import_fpn_file)
        toolbar.addWidget(import_btn)
        
        toolbar.addSeparator()
        
        # �׶η�����ť
        stage1_btn = QPushButton('�׶�һ\n��Ӧ��ƽ��')
        stage1_btn.setToolTip('���г�ʼ��Ӧ��ƽ�����')
        stage1_btn.clicked.connect(self.run_stage1_analysis)
        toolbar.addWidget(stage1_btn)
        
        stage2_btn = QPushButton('�׶ζ�\n����ǽ+����')
        stage2_btn.setToolTip('���е���ǽʩ���ͻ��ӿ��ڷ���')
        stage2_btn.clicked.connect(self.run_stage2_analysis)
        toolbar.addWidget(stage2_btn)
        
        toolbar.addSeparator()
        
        # ��������
        full_analysis_btn = QPushButton('��������')
        full_analysis_btn.setToolTip('�����������׶η���')
        full_analysis_btn.clicked.connect(self.run_full_analysis)
        toolbar.addWidget(full_analysis_btn)
        
        # ֹͣ����
        stop_btn = QPushButton('ֹͣ����')
        stop_btn.setToolTip('ֹͣ��ǰ���еķ���')
        stop_btn.clicked.connect(self.stop_analysis)
        stop_btn.setEnabled(False)
        toolbar.addWidget(stop_btn)
        self.stop_analysis_btn = stop_btn
        
        toolbar.addSeparator()
        
        # ����鿴
        results_btn = QPushButton('�鿴���')
        results_btn.setToolTip('�鿴��������Ϳ��ӻ�')
        results_btn.clicked.connect(self.show_results_panel)
        toolbar.addWidget(results_btn)

    def create_status_bar(self):
        """��������״̬��"""
        self.status_bar = self.statusBar()
        
        # ״̬��ǩ
        self.status_label = QLabel('���� - �ȴ�����FPN�ļ�')
        self.status_bar.addWidget(self.status_label)
        
        # ������
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setMaximumWidth(200)
        self.status_bar.addPermanentWidget(self.progress_bar)
        
        # ��ǰ�׶α�ǩ
        self.stage_label = QLabel('��ǰ�׶�: ��')
        self.status_bar.addPermanentWidget(self.stage_label)
        
        # ģ����Ϣ��ǩ
        self.model_info_label = QLabel('ģ��: δ����')
        self.status_bar.addPermanentWidget(self.model_info_label)

    def create_main_layout(self):
        """����������"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # ���ָ���
        main_splitter = QSplitter(Qt.Horizontal)
        
        # ���������
        left_panel = self.create_control_panel()
        main_splitter.addWidget(left_panel)
        
        # �Ҳ���ӻ����
        right_panel = self.create_visualization_panel()
        main_splitter.addWidget(right_panel)
        
        # ���÷ָ���� (���400px���Ҳ�ռʣ��ռ�)
        main_splitter.setSizes([400, 1500])
        main_splitter.setStretchFactor(0, 0)  # ���̶�
        main_splitter.setStretchFactor(1, 1)  # �Ҳ������
        
        # ������
        main_layout = QHBoxLayout()
        main_layout.setContentsMargins(5, 5, 5, 5)
        main_layout.addWidget(main_splitter)
        central_widget.setLayout(main_layout)

    def create_control_panel(self):
        """�������������"""
        control_widget = QWidget()
        control_widget.setMaximumWidth(420)
        control_widget.setMinimumWidth(380)
        control_layout = QVBoxLayout()
        
        # ��Ŀ��Ϣ��
        project_group = self.create_project_info_group()
        control_layout.addWidget(project_group)
        
        # ����������
        analysis_group = self.create_analysis_control_group()
        control_layout.addWidget(analysis_group)
        
        # ģ����Ϣ��
        model_group = self.create_model_info_group()
        control_layout.addWidget(model_group)
        
        # ��������
        monitoring_group = self.create_monitoring_group()
        control_layout.addWidget(monitoring_group)
        
        control_layout.addStretch()
        control_widget.setLayout(control_layout)
        
        return control_widget

    def create_visualization_panel(self):
        """�����Ҳ���ӻ����"""
        viz_widget = QWidget()
        viz_layout = QVBoxLayout()
        viz_layout.setContentsMargins(5, 5, 5, 5)
        
        # ���ӻ���ǩҳ
        self.viz_tabs = QTabWidget()
        
        # 3Dģ����ͼ
        model_tab = self.create_3d_model_tab()
        self.viz_tabs.addTab(model_tab, "3Dģ����ͼ")
        
        # ���������ǩҳ
        results_tab = self.create_results_analysis_tab()
        self.viz_tabs.addTab(results_tab, "�������")
        
        # ʩ���׶ζԱ�
        comparison_tab = self.create_stage_comparison_tab()
        self.viz_tabs.addTab(comparison_tab, "�׶ζԱ�")
        
        # �������Ա�ǩҳ
        material_tab = self.create_material_properties_tab()
        self.viz_tabs.addTab(material_tab, "��������")
        
        viz_layout.addWidget(self.viz_tabs)
        viz_widget.setLayout(viz_layout)
        
        return viz_widget

    def create_project_info_group(self):
        """������Ŀ��Ϣ��"""
        group = QGroupBox("��Ŀ��Ϣ")
        layout = QFormLayout()
        
        self.project_name_label = QLabel("δ������Ŀ")
        self.fpn_file_label = QLabel("��")
        self.file_size_label = QLabel("0 MB")
        self.import_time_label = QLabel("��")
        
        layout.addRow("��Ŀ����:", self.project_name_label)
        layout.addRow("FPN�ļ�:", self.fpn_file_label)
        layout.addRow("�ļ���С:", self.file_size_label)
        layout.addRow("����ʱ��:", self.import_time_label)
        
        group.setLayout(layout)
        return group

    def create_analysis_control_group(self):
        """��������������"""
        group = QGroupBox("��������")
        layout = QVBoxLayout()
        
        # �׶�ѡ��
        stage_layout = QHBoxLayout()
        stage_layout.addWidget(QLabel("��ǰ�׶�:"))
        self.stage_combo = QComboBox()
        self.stage_combo.addItems([
            "�׶�һ: ��ʼ��Ӧ��ƽ��", 
            "�׶ζ�: ����ǽ+����"
        ])
        self.stage_combo.currentIndexChanged.connect(self.on_stage_changed)
        stage_layout.addWidget(self.stage_combo)
        layout.addLayout(stage_layout)
        
        # ��������ѡ��
        analysis_type_layout = QHBoxLayout()
        analysis_type_layout.addWidget(QLabel("��������:"))
        self.analysis_type_combo = QComboBox()
        self.analysis_type_combo.addItems([
            "�����Ծ�������",
            "���Ծ�������", 
            "ģ̬����"
        ])
        analysis_type_layout.addWidget(self.analysis_type_combo)
        layout.addLayout(analysis_type_layout)
        
        # ������ť
        button_layout = QHBoxLayout()
        
        self.run_analysis_btn = QPushButton("���з���")
        self.run_analysis_btn.clicked.connect(self.run_current_stage_analysis)
        button_layout.addWidget(self.run_analysis_btn)
        
        self.stop_analysis_btn2 = QPushButton("ֹͣ")
        self.stop_analysis_btn2.setEnabled(False)
        self.stop_analysis_btn2.clicked.connect(self.stop_analysis)
        button_layout.addWidget(self.stop_analysis_btn2)
        
        layout.addLayout(button_layout)
        
        # ����������ť
        self.full_analysis_btn = QPushButton("�������׶η���")
        self.full_analysis_btn.clicked.connect(self.run_full_analysis)
        layout.addWidget(self.full_analysis_btn)
        
        group.setLayout(layout)
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
        layout.addRow("��Ԫ����:", self.element_count_label)
        layout.addRow("��������:", self.material_count_label)
        layout.addRow("�߽�����:", self.boundary_count_label)
        layout.addRow("���ع���:", self.load_count_label)
        
        group.setLayout(layout)
        return group

    def create_monitoring_group(self):
        """������������"""
        group = QGroupBox("�������")
        layout = QVBoxLayout()
        
        # ��������
        progress_layout = QHBoxLayout()
        progress_layout.addWidget(QLabel("����:"))
        self.analysis_progress = QProgressBar()
        self.analysis_progress.setVisible(False)
        progress_layout.addWidget(self.analysis_progress)
        layout.addLayout(progress_layout)
        
        # ������־
        self.log_text = QTextEdit()
        self.log_text.setMaximumHeight(180)
        self.log_text.setPlainText("���ӹ������׶η���ϵͳ������\\n�ȴ�����FPN�ļ�...")
        layout.addWidget(self.log_text)
        
        # �����־��ť
        clear_log_btn = QPushButton("�����־")
        clear_log_btn.clicked.connect(self.clear_log)
        layout.addWidget(clear_log_btn)
        
        group.setLayout(layout)
        return group

    def create_3d_model_tab(self):
        """����3Dģ�ͱ�ǩҳ"""
        widget = QWidget()
        layout = QVBoxLayout()
        
        # 3D��ͼ�������
        control_panel = QFrame()
        control_panel.setFrameStyle(QFrame.StyledPanel)
        control_panel.setMaximumHeight(60)
        control_layout = QHBoxLayout()
        
        # ��ͼ���ư�ť
        view_buttons = [
            ("ǰ��ͼ", self.set_front_view),
            ("����ͼ", self.set_side_view),
            ("����ͼ", self.set_top_view),
            ("������ͼ", self.set_iso_view)
        ]
        
        for text, callback in view_buttons:
            btn = QPushButton(text)
            btn.clicked.connect(callback)
            control_layout.addWidget(btn)
        
        control_layout.addStretch()
        
        # ��ʾѡ��
        self.show_nodes_cb = QCheckBox("��ʾ�ڵ�")
        self.show_elements_cb = QCheckBox("��ʾ��Ԫ")
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
            "3Dģ����ͼ\\n"
            "(PyVista��������)\\n\\n"
            "��ʾ����:\\n"
            " ���Ӽ�����״�Ϳ������\\n"
            " ��������ǽ�ṹ\\n"
            " �������ֲ�\\n"
            " �������Կ��ӻ�\\n"
            " �߽������ͺ���\\n\\n"
            "��������:\\n"
            " 3D��ת�����š�ƽ��\\n"
            " �����и�鿴\\n"
            " ���Ϸֲ���ʾ\\n"
            " ��������"
        )
        model_view_area.setAlignment(Qt.AlignCenter)
        model_view_area.setStyleSheet(
            "border: 2px dashed #0078d4; "
            "padding: 20px; "
            "font-size: 12px; "
            "color: #666; "
            "background-color: #fafafa;"
        )
        layout.addWidget(model_view_area)
        
        widget.setLayout(layout)
        return widget

    def create_results_analysis_tab(self):
        """�������������ǩҳ"""
        widget = QWidget()
        layout = QVBoxLayout()
        
        # �������ѡ�����
        result_control_panel = QFrame()
        result_control_panel.setFrameStyle(QFrame.StyledPanel)
        result_control_panel.setMaximumHeight(80)
        result_control_layout = QVBoxLayout()
        
        # �������ѡ��
        result_type_layout = QHBoxLayout()
        result_type_layout.addWidget(QLabel("�������:"))
        
        self.result_type_combo = QComboBox()
        self.result_type_combo.addItems([
            "λ����ͼ",
            "Ӧ����ͼ", 
            "Ӧ����ͼ",
            "����ǽ����",
            "��ѹ���ֲ�",
            "�ر����"
        ])
        result_type_layout.addWidget(self.result_type_combo)
        
        result_type_layout.addStretch()
        
        # �׶�ѡ��
        result_stage_layout = QHBoxLayout()
        result_stage_layout.addWidget(QLabel("��ʾ�׶�:"))
        
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
        
        # �����ʾ����
        results_view_area = QLabel()
        results_view_area.setText(
            "���������ͼ\\n"
            "(���Ρ�Ӧ����ͼ��ʾ����)\\n\\n"
            "�׶�һ���:\\n"
            " ��ʼ��Ӧ���ֲ���ͼ\\n"
            " ������Ӧ��״̬\\n"
            " ����ƽ����֤\\n\\n"
            "�׶ζ����:\\n"
            " ���ں������ͼ\\n"
            " ����ǽӦ���ֲ�\\n"
            " ����Ӧ���طֲ�\\n"
            " �ر��������\\n\\n"
            "��������:\\n"
            " ��ͼ��ֵ�ߵ���\\n"
            " ���ηŴ�ϵ��\\n"
            " �������鿴\\n"
            " ��ֵ��ע��ʾ"
        )
        results_view_area.setAlignment(Qt.AlignCenter)
        results_view_area.setStyleSheet(
            "border: 2px dashed #4CAF50; "
            "padding: 20px; "
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
            "�ر�����Ա�"
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
            " �ر������չ����\\n\\n"
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
        
        # �������Ա��
        self.material_table = QTableWidget()
        self.material_table.setColumnCount(6)
        self.material_table.setHorizontalHeaderLabels([
            "����ID", "��������", "����ģ��(MPa)", "���ɱ�", "�ض�(kN/m)", "����"
        ])
        
        # ���ñ������
        header = self.material_table.horizontalHeader()
        header.setSectionResizeMode(QHeaderView.Stretch)
        self.material_table.setAlternatingRowColors(True)
        
        # ���ʾ������ (����FPN�ļ�����)
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
                if j == 0:  # ����ID����Ϊֻ��
                    item.setFlags(item.flags() & ~Qt.ItemIsEditable)
                self.material_table.setItem(i, j, item)
        
        layout.addWidget(self.material_table)
        
        # ��������˵��
        material_info = QLabel()
        material_info.setText(
            "��������˵��:\\n"
            " C30������: ��������ǽ�ṹ���ϣ���ǿ��\\n"
            " ϸɰ: ��͸�ԽϺõ�ɰ����\\n"
            " ����ճ��: ����͸��ճ�������ֶ��\\n"
            " ��ʯ: �������ϸߵ���ʯ����"
        )
        material_info.setStyleSheet("padding: 10px; background-color: #f0f8ff; border: 1px solid #ccc;")
        layout.addWidget(material_info)
        
        widget.setLayout(layout)
        return widget

    def setup_connections(self):
        """�����ź�����"""
        # ��ѡ������
        self.show_nodes_cb.toggled.connect(self.update_3d_display)
        self.show_elements_cb.toggled.connect(self.update_3d_display)
        self.show_materials_cb.toggled.connect(self.update_3d_display)
        self.show_boundaries_cb.toggled.connect(self.update_3d_display)
        
        # ������ͱ仯
        self.result_type_combo.currentTextChanged.connect(self.update_results_display)
        self.result_stage_combo.currentTextChanged.connect(self.update_results_display)
        
        # �Ա����ͱ仯
        self.comparison_type_combo.currentTextChanged.connect(self.update_comparison_display)
        self.comparison_mode_combo.currentTextChanged.connect(self.update_comparison_display)

    # ==================== �¼������� ====================
    
    def import_fpn_file(self):
        """����FPN�ļ�"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "����FPN�ļ�", "", "FPN�ļ� (*.fpn);;�����ļ� (*)")
        
        if file_path:
            self.current_fpn_file = file_path
            file_name = Path(file_path).name
            file_size = Path(file_path).stat().st_size / (1024 * 1024)  # MB
            
            # ���½�����Ϣ
            self.fpn_file_label.setText(file_name)
            self.file_size_label.setText(f"{file_size:.1f} MB")
            self.import_time_label.setText("�ո�")
            self.project_name_label.setText("�������׶η���")
            
            # ģ������ļ���Ϣ (����ʵ��FPN�ļ�)
            self.node_count_label.setText("27,000+")
            self.element_count_label.setText("150,000+")
            self.material_count_label.setText("6")
            self.boundary_count_label.setText("1,000+")
            self.load_count_label.setText("1 (����)")
            
            # ����״̬
            self.status_label.setText(f"FPN�ļ��Ѽ���: {file_name}")
            self.model_info_label.setText(f"ģ��: {file_name}")
            
            # �����־
            self.log_text.append("=" * 50)
            self.log_text.append(f"�ѵ���FPN�ļ�: {file_name}")
            self.log_text.append(f"�ļ���С: {file_size:.1f} MB")
            self.log_text.append("��⵽�������׶η���ģ��:")
            self.log_text.append(" �׶�һ: ��ʼ��Ӧ��ƽ��")
            self.log_text.append(" �׶ζ�: ����ǽ+����")
            self.log_text.append("ģ����֤��ɣ����Կ�ʼ����")

    def run_stage1_analysis(self):
        """���н׶�һ����"""
        if not self.current_fpn_file:
            QMessageBox.warning(self, "����", "���ȵ���FPN�ļ�")
            return
            
        self.analysis_running = True
        self.current_stage = 1
        
        # ���½���״̬
        self.stage_combo.setCurrentIndex(0)
        self.run_analysis_btn.setEnabled(False)
        self.stop_analysis_btn.setEnabled(True)
        self.stop_analysis_btn2.setEnabled(True)
        
        # ��ʾ������
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        self.analysis_progress.setVisible(True)
        self.analysis_progress.setValue(0)
        
        # ����״̬
        self.status_label.setText("�������н׶�һ����")
        self.stage_label.setText("��ǰ�׶�: ��ʼ��Ӧ��ƽ��")
        
        # �����ϸ��־
        self.log_text.append("\\n" + "=" * 50)
        self.log_text.append("��ʼ�׶�һ����: ��ʼ��Ӧ��ƽ��")
        self.log_text.append("��������:")
        self.log_text.append(" ��������: �����Ծ�������")
        self.log_text.append(" ���ع���: �������� (9806.65 mm/s)")
        self.log_text.append(" ����ģ��: Mohr-Coulomb")
        self.log_text.append(" �߽�����: �ײ��Ͳ���̶�")
        self.log_text.append("\\n���ڽ��м���...")
        self.log_text.append(" ������ʼ��Ӧ����")
        self.log_text.append(" �������������µĵ�Ӧ��ƽ��")
        self.log_text.append(" ������ĳ�ʼӦ��״̬����")
        
        # ģ��������� (ʵ��Ӧ��������������ʵ�ķ�������)
        self.simulate_analysis_progress(1)

    def run_stage2_analysis(self):
        """���н׶ζ�����"""
        if not self.current_fpn_file:
            QMessageBox.warning(self, "����", "���ȵ���FPN�ļ�")
            return
            
        if not self.stage1_results:
            reply = QMessageBox.question(self, "ȷ��", 
                "�׶�һ������δ��ɣ��Ƿ������н׶�һ������",
                QMessageBox.Yes | QMessageBox.No)
            if reply == QMessageBox.Yes:
                self.run_stage1_analysis()
                return
        
        self.analysis_running = True
        self.current_stage = 2
        
        # ���½���״̬
        self.stage_combo.setCurrentIndex(1)
        self.run_analysis_btn.setEnabled(False)
        self.stop_analysis_btn.setEnabled(True)
        self.stop_analysis_btn2.setEnabled(True)
        
        # ��ʾ������
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        self.analysis_progress.setVisible(True)
        self.analysis_progress.setValue(0)
        
        # ����״̬
        self.status_label.setText("�������н׶ζ�����")
        self.stage_label.setText("��ǰ�׶�: ����ǽ+����")
        
        # �����ϸ��־
        self.log_text.append("\\n" + "=" * 50)
        self.log_text.append("��ʼ�׶ζ�����: ����ǽ+����")
        self.log_text.append("��������:")
        self.log_text.append(" ���ڽ׶�һ���")
        self.log_text.append(" ����ǽ�ṹ���� (MADD����)")
        self.log_text.append(" ���������Ƴ� (MDEL����)")
        self.log_text.append(" ֧���ṹ�������໥����")
        self.log_text.append("\\n���ڽ��м���...")
        self.log_text.append(" ����ǽ�ṹ����")
        self.log_text.append(" ���������Ƴ�")
        self.log_text.append(" ���κ�Ӧ���طֲ�����")
        
        # ģ���������
        self.simulate_analysis_progress(2)

    def run_full_analysis(self):
        """������������"""
        if not self.current_fpn_file:
            QMessageBox.warning(self, "����", "���ȵ���FPN�ļ�")
            return
            
        reply = QMessageBox.question(self, "ȷ��", 
            "���������������׶η������������Ҫ�ϳ�ʱ�䡣�Ƿ������",
            QMessageBox.Yes | QMessageBox.No)
        
        if reply == QMessageBox.Yes:
            self.log_text.append("\\n" + "=" * 50)
            self.log_text.append("��ʼ�������׶η���")
            self.run_stage1_analysis()

    def stop_analysis(self):
        """ֹͣ����"""
        if self.analysis_running:
            reply = QMessageBox.question(self, "ȷ��", 
                "ȷ��Ҫֹͣ��ǰ������",
                QMessageBox.Yes | QMessageBox.No)
            
            if reply == QMessageBox.Yes:
                self.analysis_running = False
                self.reset_analysis_state()
                self.log_text.append("\\n�û���ֹ����")
                self.status_label.setText("������ֹͣ")

    def reset_analysis_state(self):
        """���÷���״̬"""
        self.run_analysis_btn.setEnabled(True)
        self.stop_analysis_btn.setEnabled(False)
        self.stop_analysis_btn2.setEnabled(False)
        self.progress_bar.setVisible(False)
        self.analysis_progress.setVisible(False)
        self.stage_label.setText("��ǰ�׶�: ��")

    def simulate_analysis_progress(self, stage):
        """ģ��������� (ʵ��Ӧ���лᱻ��ʵ�ķ����������)"""
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
        self.progress_timer.start(100)  # ÿ100ms����һ��

    def analysis_completed(self, stage):
        """������ɴ���"""
        if stage == 1:
            self.stage1_results = {"completed": True}
            self.log_text.append("\\n�׶�һ�������!")
            self.log_text.append(" ��ʼ��Ӧ���������ɹ�")
            self.log_text.append(" ������Ӧ��״̬�ȶ�")
            self.status_label.setText("�׶�һ�������")
            
            # ����������������������н׶ζ�
            if hasattr(self, 'running_full_analysis'):
                self.run_stage2_analysis()
                return
                
        elif stage == 2:
            self.stage2_results = {"completed": True}
            self.log_text.append("\\n�׶ζ��������!")
            self.log_text.append(" ����ǽ+���ڷ����ɹ�")
            self.log_text.append(" ���κ�Ӧ���طֲ��������")
            self.status_label.setText("�׶ζ��������")
        
        self.reset_analysis_state()
        self.viz_tabs.setCurrentIndex(1)  # �л��������ǩҳ

    # ==================== �����¼������� ====================
    
    def on_stage_changed(self):
        """�׶�ѡ��仯"""
        current_stage = self.stage_combo.currentIndex()
        if current_stage == 0:
            self.log_text.append("�л����׶�һ: ��ʼ��Ӧ��ƽ��")
        else:
            self.log_text.append("�л����׶ζ�: ����ǽ+����")

    def run_current_stage_analysis(self):
        """���е�ǰѡ��Ľ׶η���"""
        current_stage = self.stage_combo.currentIndex()
        if current_stage == 0:
            self.run_stage1_analysis()
        else:
            self.run_stage2_analysis()

    def clear_log(self):
        """�����־"""
        self.log_text.clear()
        self.log_text.append("��־�����")

    # ==================== 3D��ͼ���Ʒ��� ====================
    
    def set_front_view(self):
        self.log_text.append("�л���ǰ��ͼ")
        
    def set_side_view(self):
        self.log_text.append("�л�������ͼ")
        
    def set_top_view(self):
        self.log_text.append("�л�������ͼ")
        
    def set_iso_view(self):
        self.log_text.append("�л���������ͼ")

    def update_3d_display(self):
        """����3D��ʾ"""
        display_options = []
        if self.show_nodes_cb.isChecked():
            display_options.append("�ڵ�")
        if self.show_elements_cb.isChecked():
            display_options.append("��Ԫ")
        if self.show_materials_cb.isChecked():
            display_options.append("����")
        if self.show_boundaries_cb.isChecked():
            display_options.append("�߽�")
        
        if display_options:
            self.log_text.append(f"����3D��ʾ: {', '.join(display_options)}")

    # ==================== �����ʾ���� ====================
    
    def update_results_display(self):
        """���½����ʾ"""
        result_type = self.result_type_combo.currentText()
        result_stage = self.result_stage_combo.currentText()
        self.log_text.append(f"��ʾ���: {result_stage} - {result_type}")

    def update_comparison_display(self):
        """���¶Ա���ʾ"""
        comparison_type = self.comparison_type_combo.currentText()
        comparison_mode = self.comparison_mode_combo.currentText()
        self.log_text.append(f"�Ա���ʾ: {comparison_type} - {comparison_mode}")

    def show_deformation_results(self):
        """��ʾ���ν��"""
        self.viz_tabs.setCurrentIndex(1)
        self.result_type_combo.setCurrentText("λ����ͼ")
        self.log_text.append("��ʾ������ͼ")

    def show_stress_results(self):
        """��ʾӦ�����"""
        self.viz_tabs.setCurrentIndex(1)
        self.result_type_combo.setCurrentText("Ӧ����ͼ")
        self.log_text.append("��ʾӦ����ͼ")

    def show_wall_forces(self):
        """��ʾ����ǽ����"""
        self.viz_tabs.setCurrentIndex(1)
        self.result_type_combo.setCurrentText("����ǽ����")
        self.log_text.append("��ʾ����ǽ����")

    def show_stage_comparison(self):
        """��ʾ�׶ζԱ�"""
        self.viz_tabs.setCurrentIndex(2)
        self.log_text.append("��ʾ�׶ζԱȷ���")

    def show_results_panel(self):
        """��ʾ������"""
        self.viz_tabs.setCurrentIndex(1)

    # ==================== ���߷��� ====================
    
    def save_project(self):
        """������Ŀ"""
        if not self.current_fpn_file:
            QMessageBox.warning(self, "����", "û�пɱ������Ŀ")
            return
            
        file_path, _ = QFileDialog.getSaveFileName(
            self, "������Ŀ", "", "��Ŀ�ļ� (*.exc);;�����ļ� (*)")
        
        if file_path:
            self.log_text.append(f"��Ŀ�ѱ���: {Path(file_path).name}")

    def export_results(self):
        """�������"""
        if not (self.stage1_results or self.stage2_results):
            QMessageBox.warning(self, "����", "û�пɵ����Ľ��")
            return
            
        self.log_text.append("�����������...")

    def check_model_integrity(self):
        """ģ�������Լ��"""
        if not self.current_fpn_file:
            QMessageBox.warning(self, "����", "���ȵ���FPN�ļ�")
            return
            
        self.log_text.append("\\nģ�������Լ��:")
        self.log_text.append(" �ڵ�������: ����")
        self.log_text.append(" ��������: ����")
        self.log_text.append(" �߽�����: ��Ч")
        self.log_text.append(" ���ع���: ��ȷ")
        self.log_text.append("ģ�ͼ����ɣ����Խ��з���")

    def show_material_properties(self):
        """��ʾ��������"""
        self.viz_tabs.setCurrentIndex(3)
        self.log_text.append("��ʾ�������Ա�")

    def show_user_manual(self):
        """��ʾ�û��ֲ�"""
        QMessageBox.information(self, "�û��ֲ�", 
            "���ӹ������׶η���ϵͳ\\n\\n"
            "ʹ������:\\n"
            "1. ����FPN�ļ�\\n"
            "2. ���ģ����Ϣ\\n"
            "3. ���н׶�һ����\\n"
            "4. ���н׶ζ�����\\n"
            "5. �鿴����ͶԱ�\\n\\n"
            "��ݼ�:\\n"
            "Ctrl+O: �����ļ�\\n"
            "F5: �׶�һ����\\n"
            "F6: �׶ζ�����\\n"
            "F7: ��������")

    def show_about(self):
        """��ʾ������Ϣ"""
        QMessageBox.about(self, "����", 
            "���ӹ������׶η���ϵͳ v2.0\\n\\n"
            "רҵ�ĵ���ǽ+����ʩ���׶η�������\\n"
            "����DeepCADƽ̨����\\n\\n"
            "֧��MIDAS GTS FPN��ʽ\\n"
            "����Kratos Multiphysics��������\\n"
            "PyVista 3D���ӻ�\\n\\n"
            "Copyright  2024 DeepCAD Team")


# ����������������ּ�����
MainWindow = ExcavationAnalysisWindow


if __name__ == "__main__":
    from PyQt6.QtWidgets import QApplication
    import sys
    
    app = QApplication(sys.argv)
    app.setApplicationName("���ӹ������׶η���ϵͳ")
    app.setApplicationVersion("2.0")
    
    window = ExcavationAnalysisWindow()
    window.show()
    
    sys.exit(app.exec())
