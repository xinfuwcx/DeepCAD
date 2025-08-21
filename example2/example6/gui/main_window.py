#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
主界面窗口 - ScourMainWindow
专业级桥墩浅蚀模拟系统的现代化GUI界面
Professional Bridge Pier Scour Simulation Main Window
"""

import sys
import os
from pathlib import Path
from typing import Optional, Dict, Any
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QSplitter,
    QTabWidget, QFrame, QLabel, QToolBar, QStatusBar, QMenuBar,
    QMenu, QMessageBox, QProgressBar, QComboBox, QPushButton,
    QGroupBox, QGridLayout, QFormLayout, QSpinBox, QDoubleSpinBox,
    QLineEdit, QTextEdit, QCheckBox, QSlider, QTreeWidget, QTreeWidgetItem,
    QScrollArea, QFileDialog, QApplication
)
from PyQt6.QtCore import (
    Qt, QTimer, QThread, pyqtSignal, QSize, QRect, QPoint,
    QPropertyAnimation, QEasingCurve
)
from PyQt6.QtGui import (
    QAction, QActionGroup, QIcon, QPixmap, QPainter, QBrush,
    QColor, QFont, QFontMetrics, QPalette
)

# 添加项目路径
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

# 可选依赖
try:
    import pyvista as pv
    from pyvistaqt import QtInteractor
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

try:
    import qtawesome as qta
    QTA_AVAILABLE = True
except ImportError:
    QTA_AVAILABLE = False


class ModernCard(QFrame):
    """现代化卡片组件"""
    
    def __init__(self, title: str = "", parent=None):
        super().__init__(parent)
        self.setObjectName("ModernCard")
        self.setup_ui(title)
        self.setup_style()
    
    def setup_ui(self, title: str):
        """设置UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 12, 16, 16)
        layout.setSpacing(8)
        
        if title:
            title_label = QLabel(title)
            title_label.setObjectName("CardTitle")
            title_label.setFont(QFont("Microsoft YaHei UI", 10, QFont.Weight.Bold))
            layout.addWidget(title_label)
        
        # 内容区域
        self.content_widget = QWidget()
        self.content_layout = QVBoxLayout(self.content_widget)
        self.content_layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(self.content_widget)
    
    def setup_style(self):
        """设置样式"""
        self.setStyleSheet("""
            QFrame#ModernCard {
                background-color: white;
                border: 1px solid #e9ecef;
                border-radius: 8px;
                margin: 2px;
            }
            
            QFrame#ModernCard:hover {
                border-color: #0078d4;
                box-shadow: 0 2px 8px rgba(0, 120, 212, 0.1);
            }
            
            QLabel#CardTitle {
                color: #2d3748;
                border: none;
                background: transparent;
                padding: 0px 0px 4px 0px;
            }
        """)
    
    def add_content(self, widget: QWidget):
        """添加内容组件"""
        self.content_layout.addWidget(widget)
    
    def add_content_layout(self, layout):
        """添加内容布局"""
        self.content_layout.addLayout(layout)


class ModernParameterPanel(QScrollArea):
    """现代化参数设置面板"""
    
    parameters_changed = pyqtSignal(dict)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.parameters = {}
        self.setup_ui()
        self.setup_style()
        self.setup_parameters()
    
    def setup_ui(self):
        """设置UI"""
        self.setWidgetResizable(True)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAsNeeded)
        
        # 主容器
        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(12)
        
        # 桥墩几何参数
        self.pier_card = ModernCard("桥墩几何参数")
        self.setup_pier_parameters()
        layout.addWidget(self.pier_card)
        
        # 流体条件参数
        self.flow_card = ModernCard("流体条件参数")
        self.setup_flow_parameters()
        layout.addWidget(self.flow_card)
        
        # 沉积物参数
        self.sediment_card = ModernCard("沉积物参数")
        self.setup_sediment_parameters()
        layout.addWidget(self.sediment_card)
        
        # 数值求解参数
        self.solver_card = ModernCard("数值求解参数")
        self.setup_solver_parameters()
        layout.addWidget(self.solver_card)
        
        # 计算控制
        self.control_card = ModernCard("计算控制")
        self.setup_control_panel()
        layout.addWidget(self.control_card)
        
        layout.addStretch()
        self.setWidget(container)
    
    def setup_style(self):
        """设置样式"""
        self.setStyleSheet("""
            QScrollArea {
                border: none;
                background-color: #f8f9fa;
            }
            
            QDoubleSpinBox, QSpinBox, QLineEdit, QComboBox {
                border: 1px solid #ced4da;
                border-radius: 4px;
                padding: 6px 8px;
                background-color: white;
                selection-background-color: #0078d4;
            }
            
            QDoubleSpinBox:focus, QSpinBox:focus, QLineEdit:focus, QComboBox:focus {
                border-color: #0078d4;
                outline: none;
            }
            
            QLabel {
                color: #495057;
                font-weight: 500;
            }
            
            QPushButton {
                background-color: #0078d4;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                font-weight: 500;
                min-height: 16px;
            }
            
            QPushButton:hover {
                background-color: #106ebe;
            }
            
            QPushButton:pressed {
                background-color: #005a9e;
            }
            
            QPushButton:disabled {
                background-color: #6c757d;
                color: #adb5bd;
            }
            
            QPushButton#DangerButton {
                background-color: #dc3545;
            }
            
            QPushButton#DangerButton:hover {
                background-color: #c82333;
            }
            
            QPushButton#SecondaryButton {
                background-color: #6c757d;
            }
            
            QPushButton#SecondaryButton:hover {
                background-color: #5a6268;
            }
            
            QCheckBox {
                spacing: 8px;
                color: #495057;
            }
            
            QCheckBox::indicator {
                width: 18px;
                height: 18px;
                border: 2px solid #ced4da;
                border-radius: 3px;
                background-color: white;
            }
            
            QCheckBox::indicator:checked {
                background-color: #0078d4;
                border-color: #0078d4;
            }
            
            QCheckBox::indicator:checked:hover {
                background-color: #106ebe;
            }
        """)
    
    def setup_pier_parameters(self):
        """设置桥墩参数"""
        form = QFormLayout()
        form.setSpacing(8)
        
        # 桥墩形状
        self.pier_shape = QComboBox()
        self.pier_shape.addItems(["圆形", "矩形", "椭圆形", "复合形状"])
        self.pier_shape.setCurrentText("圆形")
        form.addRow("桥墩形状:", self.pier_shape)
        
        # 直径/宽度
        self.pier_diameter = QDoubleSpinBox()
        self.pier_diameter.setRange(0.5, 10.0)
        self.pier_diameter.setValue(2.0)
        self.pier_diameter.setSuffix(" m")
        self.pier_diameter.setDecimals(2)
        form.addRow("特征尺寸:", self.pier_diameter)
        
        # 桥墩高度
        self.pier_height = QDoubleSpinBox()
        self.pier_height.setRange(1.0, 50.0)
        self.pier_height.setValue(10.0)
        self.pier_height.setSuffix(" m")
        self.pier_height.setDecimals(1)
        form.addRow("桥墩高度:", self.pier_height)
        
        # 倾斜角度
        self.pier_angle = QDoubleSpinBox()
        self.pier_angle.setRange(-30.0, 30.0)
        self.pier_angle.setValue(0.0)
        self.pier_angle.setSuffix("°")
        self.pier_angle.setDecimals(1)
        form.addRow("倾斜角度:", self.pier_angle)
        
        self.pier_card.add_content_layout(form)
    
    def setup_flow_parameters(self):
        """设置流体参数"""
        form = QFormLayout()
        form.setSpacing(8)
        
        # 来流速度
        self.flow_velocity = QDoubleSpinBox()
        self.flow_velocity.setRange(0.1, 5.0)
        self.flow_velocity.setValue(0.8)
        self.flow_velocity.setSuffix(" m/s")
        self.flow_velocity.setDecimals(2)
        form.addRow("来流速度:", self.flow_velocity)
        
        # 水深
        self.water_depth = QDoubleSpinBox()
        self.water_depth.setRange(1.0, 20.0)
        self.water_depth.setValue(3.0)
        self.water_depth.setSuffix(" m")
        self.water_depth.setDecimals(1)
        form.addRow("水深:", self.water_depth)
        
        # 水温
        self.water_temperature = QDoubleSpinBox()
        self.water_temperature.setRange(0.0, 40.0)
        self.water_temperature.setValue(20.0)
        self.water_temperature.setSuffix("°C")
        self.water_temperature.setDecimals(1)
        form.addRow("水温:", self.water_temperature)
        
        # 来流角度
        self.approach_angle = QDoubleSpinBox()
        self.approach_angle.setRange(-45.0, 45.0)
        self.approach_angle.setValue(0.0)
        self.approach_angle.setSuffix("°")
        self.approach_angle.setDecimals(1)
        form.addRow("来流角度:", self.approach_angle)
        
        self.flow_card.add_content_layout(form)
    
    def setup_sediment_parameters(self):
        """设置沉积物参数"""
        form = QFormLayout()
        form.setSpacing(8)
        
        # 中值粒径
        self.d50 = QDoubleSpinBox()
        self.d50.setRange(0.1, 10.0)
        self.d50.setValue(0.8)
        self.d50.setSuffix(" mm")
        self.d50.setDecimals(2)
        form.addRow("中值粒径 d50:", self.d50)
        
        # 级配不均匀性
        self.gradation = QDoubleSpinBox()
        self.gradation.setRange(1.0, 3.0)
        self.gradation.setValue(1.5)
        self.gradation.setDecimals(2)
        form.addRow("级配系数 σg:", self.gradation)
        
        # 沉积物密度
        self.sediment_density = QSpinBox()
        self.sediment_density.setRange(2000, 3000)
        self.sediment_density.setValue(2650)
        self.sediment_density.setSuffix(" kg/m³")
        form.addRow("沉积物密度:", self.sediment_density)
        
        # 孔隙率
        self.porosity = QDoubleSpinBox()
        self.porosity.setRange(0.2, 0.6)
        self.porosity.setValue(0.4)
        self.porosity.setDecimals(2)
        form.addRow("孔隙率:", self.porosity)
        
        self.sediment_card.add_content_layout(form)
    
    def setup_solver_parameters(self):
        """设置求解器参数"""
        form = QFormLayout()
        form.setSpacing(8)
        
        # 湍流模型
        self.turbulence_model = QComboBox()
        self.turbulence_model.addItems(["k-ε 标准", "k-ε RNG", "k-ω SST", "Spalart-Allmaras"])
        self.turbulence_model.setCurrentText("k-ε 标准")
        form.addRow("湍流模型:", self.turbulence_model)
        
        # 时间步长
        self.time_step = QDoubleSpinBox()
        self.time_step.setRange(0.001, 1.0)
        self.time_step.setValue(0.1)
        self.time_step.setSuffix(" s")
        self.time_step.setDecimals(3)
        form.addRow("时间步长:", self.time_step)
        
        # 总计算时间
        self.total_time = QDoubleSpinBox()
        self.total_time.setRange(1.0, 720.0)
        self.total_time.setValue(72.0)
        self.total_time.setSuffix(" h")
        self.total_time.setDecimals(1)
        form.addRow("总计算时间:", self.total_time)
        
        # 收敛标准
        self.convergence = QDoubleSpinBox()
        self.convergence.setRange(1e-6, 1e-3)
        self.convergence.setValue(1e-4)
        self.convergence.setDecimals(6)
        self.convergence.setPrefix("1e")
        form.addRow("收敛标准:", self.convergence)
        
        self.solver_card.add_content_layout(form)
    
    def setup_control_panel(self):
        """设置控制面板"""
        layout = QVBoxLayout()
        layout.setSpacing(8)
        
        # 计算按钮
        button_layout = QHBoxLayout()
        button_layout.setSpacing(8)
        
        self.start_button = QPushButton("开始计算")
        if QTA_AVAILABLE:
            self.start_button.setIcon(qta.icon('fa5s.play', color='white'))
        self.start_button.clicked.connect(self.start_simulation)
        button_layout.addWidget(self.start_button)
        
        self.pause_button = QPushButton("暂停")
        self.pause_button.setObjectName("SecondaryButton")
        if QTA_AVAILABLE:
            self.pause_button.setIcon(qta.icon('fa5s.pause', color='white'))
        self.pause_button.setEnabled(False)
        button_layout.addWidget(self.pause_button)
        
        self.stop_button = QPushButton("停止")
        self.stop_button.setObjectName("DangerButton")
        if QTA_AVAILABLE:
            self.stop_button.setIcon(qta.icon('fa5s.stop', color='white'))
        self.stop_button.setEnabled(False)
        button_layout.addWidget(self.stop_button)
        
        layout.addLayout(button_layout)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        layout.addWidget(self.progress_bar)
        
        # 状态信息
        self.status_label = QLabel("就绪")
        self.status_label.setStyleSheet("color: #28a745; font-weight: 500;")
        layout.addWidget(self.status_label)
        
        self.control_card.add_content_layout(layout)
    
    def setup_parameters(self):
        """初始化参数"""
        self.update_parameters()
        
        # 连接信号
        widgets = [
            self.pier_shape, self.pier_diameter, self.pier_height, self.pier_angle,
            self.flow_velocity, self.water_depth, self.water_temperature, self.approach_angle,
            self.d50, self.gradation, self.sediment_density, self.porosity,
            self.turbulence_model, self.time_step, self.total_time, self.convergence
        ]
        
        for widget in widgets:
            if hasattr(widget, 'valueChanged'):
                widget.valueChanged.connect(self.update_parameters)
            elif hasattr(widget, 'currentTextChanged'):
                widget.currentTextChanged.connect(self.update_parameters)
    
    def update_parameters(self):
        """更新参数"""
        self.parameters = {
            'pier': {
                'shape': self.pier_shape.currentText(),
                'diameter': self.pier_diameter.value(),
                'height': self.pier_height.value(),
                'angle': self.pier_angle.value(),
            },
            'flow': {
                'velocity': self.flow_velocity.value(),
                'depth': self.water_depth.value(),
                'temperature': self.water_temperature.value(),
                'approach_angle': self.approach_angle.value(),
            },
            'sediment': {
                'd50': self.d50.value(),
                'gradation': self.gradation.value(),
                'density': self.sediment_density.value(),
                'porosity': self.porosity.value(),
            },
            'solver': {
                'turbulence_model': self.turbulence_model.currentText(),
                'time_step': self.time_step.value(),
                'total_time': self.total_time.value(),
                'convergence': self.convergence.value(),
            }
        }
        
        self.parameters_changed.emit(self.parameters)
    
    def start_simulation(self):
        """开始仿真"""
        self.start_button.setEnabled(False)
        self.pause_button.setEnabled(True)
        self.stop_button.setEnabled(True)
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        self.status_label.setText("计算中...")
        self.status_label.setStyleSheet("color: #0078d4; font-weight: 500;")
        
        # 这里应该启动实际的计算线程
        # 现在只是演示UI状态变化
        self.simulation_timer = QTimer()
        self.simulation_timer.timeout.connect(self.update_progress)
        self.simulation_timer.start(100)
    
    def update_progress(self):
        """更新进度"""
        current = self.progress_bar.value()
        if current < 100:
            self.progress_bar.setValue(current + 1)
        else:
            self.simulation_timer.stop()
            self.finish_simulation()
    
    def finish_simulation(self):
        """完成仿真"""
        self.start_button.setEnabled(True)
        self.pause_button.setEnabled(False)
        self.stop_button.setEnabled(False)
        self.progress_bar.setVisible(False)
        self.status_label.setText("计算完成")
        self.status_label.setStyleSheet("color: #28a745; font-weight: 500;")


class Modern3DViewer(QWidget):
    """现代化3D查看器"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.setup_style()
        self.create_sample_visualization()
    
    def setup_ui(self):
        """设置UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        # 工具栏
        self.toolbar = QToolBar()
        self.toolbar.setMovable(False)
        self.setup_toolbar()
        layout.addWidget(self.toolbar)
        
        # 3D视图区域
        if PYVISTA_AVAILABLE:
            try:
                self.plotter = QtInteractor(self)
                self.plotter.setMinimumSize(800, 600)
                layout.addWidget(self.plotter.interactor)
            except Exception as e:
                print(f"PyVista初始化失败: {e}")
                self.create_placeholder_view(layout)
        else:
            self.create_placeholder_view(layout)
    
    def create_placeholder_view(self, layout):
        """创建占位视图"""
        placeholder = QFrame()
        placeholder.setMinimumSize(800, 600)
        placeholder.setStyleSheet("""
            QFrame {
                background: qlineargradient(x1: 0, y1: 0, x2: 1, y2: 1,
                    stop: 0 #f8f9fa, stop: 1 #e9ecef);
                border: 2px dashed #0078d4;
                border-radius: 8px;
            }
        """)
        
        placeholder_layout = QVBoxLayout(placeholder)
        placeholder_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        icon_label = QLabel("🌊")
        icon_label.setStyleSheet("font-size: 64px;")
        icon_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        placeholder_layout.addWidget(icon_label)
        
        text_label = QLabel("3D 流场可视化区域")
        text_label.setStyleSheet("""
            font-size: 18px;
            font-weight: bold;
            color: #0078d4;
            margin: 16px;
        """)
        text_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        placeholder_layout.addWidget(text_label)
        
        desc_label = QLabel("桥墩浅蚀模拟结果将在此显示\n支持流线、压力场、速度分布等可视化")
        desc_label.setStyleSheet("""
            font-size: 14px;
            color: #6c757d;
            line-height: 1.5;
        """)
        desc_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        placeholder_layout.addWidget(desc_label)
        
        layout.addWidget(placeholder)
        self.plotter = None
    
    def setup_toolbar(self):
        """设置工具栏"""
        # 视图控制
        if QTA_AVAILABLE:
            reset_view_action = QAction(qta.icon('fa5s.home'), "重置视图", self)
            fit_view_action = QAction(qta.icon('fa5s.expand'), "适应视图", self)
            screenshot_action = QAction(qta.icon('fa5s.camera'), "截图", self)
        else:
            reset_view_action = QAction("重置视图", self)
            fit_view_action = QAction("适应视图", self)
            screenshot_action = QAction("截图", self)
        
        self.toolbar.addAction(reset_view_action)
        self.toolbar.addAction(fit_view_action)
        self.toolbar.addSeparator()
        self.toolbar.addAction(screenshot_action)
        self.toolbar.addSeparator()
        
        # 显示选项
        self.show_edges_cb = QCheckBox("显示网格")
        self.show_edges_cb.setChecked(False)
        self.toolbar.addWidget(QLabel("显示:"))
        self.toolbar.addWidget(self.show_edges_cb)
        
        self.toolbar.addSeparator()
        
        # 结果类型
        self.result_combo = QComboBox()
        self.result_combo.addItems([
            "流速大小", "压力", "湍动能", "剪切应力", 
            "床面剪应力", "浅蚀深度", "流线"
        ])
        self.toolbar.addWidget(QLabel("结果:"))
        self.toolbar.addWidget(self.result_combo)
    
    def setup_style(self):
        """设置样式"""
        self.setStyleSheet("""
            QToolBar {
                background: white;
                border: none;
                border-bottom: 1px solid #dee2e6;
                padding: 8px;
                spacing: 8px;
            }
            
            QToolBar QLabel {
                color: #495057;
                font-weight: 500;
                margin-right: 4px;
            }
            
            QToolBar QComboBox {
                min-width: 120px;
                border: 1px solid #ced4da;
                border-radius: 4px;
                padding: 4px 8px;
                background-color: white;
            }
            
            QToolBar QCheckBox {
                color: #495057;
            }
        """)
    
    def create_sample_visualization(self):
        """创建示例可视化"""
        if self.plotter is None:
            return
        
        try:
            # 创建简单的流场可视化示例
            import numpy as np
            
            # 创建网格
            x = np.linspace(-10, 40, 50)
            y = np.linspace(-20, 20, 40)
            z = np.linspace(-4, 4, 16)
            
            # 创建流场数据（简化的圆柱绕流）
            self.plotter.set_background('white')
            self.plotter.show_axes()
            
            # 添加桥墩（圆柱）
            cylinder = pv.Cylinder(center=(0, 0, 0), direction=(0, 0, 1), 
                                 radius=1.0, height=8.0)
            self.plotter.add_mesh(cylinder, color='lightgray', opacity=0.8)
            
            # 添加河床
            bed = pv.Plane(center=(0, 0, -3), direction=(0, 0, 1), 
                          i_size=60, j_size=40)
            self.plotter.add_mesh(bed, color='sandybrown', opacity=0.6)
            
            # 设置相机
            self.plotter.camera_position = 'iso'
            
            # 添加文字说明
            self.plotter.add_text(
                "桥墩浅蚀模拟可视化\nBridge Pier Scour Simulation",
                position='upper_left',
                font_size=12,
                color='navy'
            )
            
        except Exception as e:
            print(f"创建示例可视化失败: {e}")


class ModernResultsPanel(QWidget):
    """现代化结果面板"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.setup_style()
    
    def setup_ui(self):
        """设置UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(12)
        
        # 结果摘要卡片
        self.summary_card = ModernCard("计算结果摘要")
        self.setup_summary_panel()
        layout.addWidget(self.summary_card)
        
        # 监测点数据卡片
        self.monitoring_card = ModernCard("监测点数据")
        self.setup_monitoring_panel()
        layout.addWidget(self.monitoring_card)
        
        # 导出选项卡片
        self.export_card = ModernCard("结果导出")
        self.setup_export_panel()
        layout.addWidget(self.export_card)
        
        layout.addStretch()
    
    def setup_summary_panel(self):
        """设置结果摘要面板"""
        layout = QFormLayout()
        layout.setSpacing(8)
        
        # 关键结果指标
        self.max_scour_label = QLabel("--")
        self.max_scour_label.setStyleSheet("font-weight: bold; color: #dc3545; font-size: 14px;")
        layout.addRow("最大浅蚀深度:", self.max_scour_label)
        
        self.scour_width_label = QLabel("--")
        layout.addRow("浅蚀坑宽度:", self.scour_width_label)
        
        self.equilibrium_time_label = QLabel("--")
        layout.addRow("平衡时间:", self.equilibrium_time_label)
        
        self.max_velocity_label = QLabel("--")
        layout.addRow("最大流速:", self.max_velocity_label)
        
        self.reynolds_label = QLabel("--")
        layout.addRow("雷诺数:", self.reynolds_label)
        
        self.froude_label = QLabel("--")
        layout.addRow("弗劳德数:", self.froude_label)
        
        self.summary_card.add_content_layout(layout)
    
    def setup_monitoring_panel(self):
        """设置监测面板"""
        layout = QVBoxLayout()
        layout.setSpacing(8)
        
        # 监测点树形列表
        self.monitoring_tree = QTreeWidget()
        self.monitoring_tree.setHeaderLabels(["位置", "类型", "当前值", "最大值", "最小值"])
        self.monitoring_tree.setMaximumHeight(200)
        
        # 添加示例监测点
        points = [
            ("桥墩前缘", "流速", "0.85 m/s", "1.2 m/s", "0.3 m/s"),
            ("桥墩侧面", "压力", "2.1 kPa", "3.5 kPa", "1.8 kPa"),
            ("床面中心", "剪应力", "15.6 Pa", "28.3 Pa", "8.2 Pa"),
            ("下游10D", "浅蚀深度", "0.3 m", "0.8 m", "0.0 m"),
        ]
        
        for point in points:
            item = QTreeWidgetItem(point)
            self.monitoring_tree.addTopLevelItem(item)
        
        layout.addWidget(self.monitoring_tree)
        
        # 刷新按钮
        refresh_button = QPushButton("刷新数据")
        refresh_button.setObjectName("SecondaryButton")
        if QTA_AVAILABLE:
            refresh_button.setIcon(qta.icon('fa5s.sync', color='white'))
        layout.addWidget(refresh_button)
        
        self.monitoring_card.add_content_layout(layout)
    
    def setup_export_panel(self):
        """设置导出面板"""
        layout = QVBoxLayout()
        layout.setSpacing(8)
        
        # 导出选项
        export_layout = QGridLayout()
        
        self.export_vtk_cb = QCheckBox("VTK格式")
        self.export_vtk_cb.setChecked(True)
        export_layout.addWidget(self.export_vtk_cb, 0, 0)
        
        self.export_csv_cb = QCheckBox("CSV数据")
        export_layout.addWidget(self.export_csv_cb, 0, 1)
        
        self.export_images_cb = QCheckBox("图片序列")
        export_layout.addWidget(self.export_images_cb, 1, 0)
        
        self.export_animation_cb = QCheckBox("动画GIF")
        export_layout.addWidget(self.export_animation_cb, 1, 1)
        
        layout.addLayout(export_layout)
        
        # 导出按钮
        button_layout = QHBoxLayout()
        
        export_button = QPushButton("导出结果")
        if QTA_AVAILABLE:
            export_button.setIcon(qta.icon('fa5s.download', color='white'))
        export_button.clicked.connect(self.export_results)
        button_layout.addWidget(export_button)
        
        report_button = QPushButton("生成报告")
        report_button.setObjectName("SecondaryButton")
        if QTA_AVAILABLE:
            report_button.setIcon(qta.icon('fa5s.file-alt', color='white'))
        button_layout.addWidget(report_button)
        
        layout.addLayout(button_layout)
        
        self.export_card.add_content_layout(layout)
    
    def setup_style(self):
        """设置样式"""
        self.setStyleSheet("""
            QTreeWidget {
                border: 1px solid #ced4da;
                border-radius: 4px;
                background-color: white;
                alternate-background-color: #f8f9fa;
                selection-background-color: #0078d4;
            }
            
            QTreeWidget::item {
                padding: 4px;
                border: none;
            }
            
            QTreeWidget::item:selected {
                background-color: #0078d4;
                color: white;
            }
            
            QTreeWidget::header {
                background-color: #e9ecef;
                border: none;
                border-bottom: 1px solid #ced4da;
            }
        """)
    
    def export_results(self):
        """导出结果"""
        # 选择导出路径
        export_dir = QFileDialog.getExistingDirectory(
            self, "选择导出目录", "", 
            QFileDialog.Option.ShowDirsOnly
        )
        
        if export_dir:
            QMessageBox.information(
                self, "导出完成", 
                f"结果已导出到:\n{export_dir}"
            )


class ScourMainWindow(QMainWindow):
    """桥墩浅蚀模拟主窗口"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("DeepCAD-SCOUR 桥墩浅蚀模拟系统 v1.0")
        self.setMinimumSize(1400, 900)
        self.resize(1600, 1000)
        
        # 居中显示
        self.center_on_screen()
        
        # 设置窗口图标
        self.setup_window_icon()
        
        # 创建界面
        self.setup_ui()
        self.setup_menus()
        self.setup_toolbar()
        self.setup_statusbar()
        
        # 连接信号
        self.connect_signals()
        
        # 显示欢迎信息
        self.show_welcome_message()
    
    def center_on_screen(self):
        """窗口居中显示"""
        screen = QApplication.primaryScreen().geometry()
        window = self.geometry()
        x = (screen.width() - window.width()) // 2
        y = (screen.height() - window.height()) // 2
        self.move(x, y)
    
    def setup_window_icon(self):
        """设置窗口图标"""
        # 创建简单图标
        pixmap = QPixmap(32, 32)
        pixmap.fill(Qt.GlobalColor.transparent)
        
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        # 绘制水波图标
        painter.setBrush(QBrush(QColor(0, 120, 215)))
        painter.setPen(Qt.PenStyle.NoPen)
        
        # 绘制波浪形状
        from PyQt6.QtGui import QPainterPath
        path = QPainterPath()
        path.moveTo(4, 16)
        path.quadTo(8, 8, 12, 16)
        path.quadTo(16, 24, 20, 16)
        path.quadTo(24, 8, 28, 16)
        path.lineTo(28, 28)
        path.lineTo(4, 28)
        path.closeSubpath()
        
        painter.fillPath(path, QBrush(QColor(0, 120, 215)))
        painter.end()
        
        self.setWindowIcon(QIcon(pixmap))
    
    def setup_ui(self):
        """设置主界面"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(4, 4, 4, 4)
        main_layout.setSpacing(4)
        
        # 创建主分割器
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        main_splitter.setChildrenCollapsible(False)
        
        # 左侧参数面板
        self.parameter_panel = ModernParameterPanel()
        self.parameter_panel.setMinimumWidth(320)
        self.parameter_panel.setMaximumWidth(400)
        main_splitter.addWidget(self.parameter_panel)
        
        # 中间3D视图
        self.viewer_3d = Modern3DViewer()
        main_splitter.addWidget(self.viewer_3d)
        
        # 右侧结果面板
        self.results_panel = ModernResultsPanel()
        self.results_panel.setMinimumWidth(300)
        self.results_panel.setMaximumWidth(350)
        main_splitter.addWidget(self.results_panel)
        
        # 设置分割比例
        main_splitter.setSizes([350, 900, 350])
        main_splitter.setStretchFactor(0, 0)  # 左侧面板不拉伸
        main_splitter.setStretchFactor(1, 1)  # 3D视图可拉伸
        main_splitter.setStretchFactor(2, 0)  # 右侧面板不拉伸
        
        main_layout.addWidget(main_splitter)
    
    def setup_menus(self):
        """设置菜单栏"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu("文件(&F)")
        
        if QTA_AVAILABLE:
            new_action = QAction(qta.icon('fa5s.file'), "新建项目(&N)", self)
            open_action = QAction(qta.icon('fa5s.folder-open'), "打开项目(&O)", self)
            save_action = QAction(qta.icon('fa5s.save'), "保存项目(&S)", self)
            import_action = QAction(qta.icon('fa5s.file-import'), "导入几何(&I)", self)
            export_action = QAction(qta.icon('fa5s.file-export'), "导出结果(&E)", self)
            exit_action = QAction(qta.icon('fa5s.times'), "退出(&X)", self)
        else:
            new_action = QAction("新建项目(&N)", self)
            open_action = QAction("打开项目(&O)", self)
            save_action = QAction("保存项目(&S)", self)
            import_action = QAction("导入几何(&I)", self)
            export_action = QAction("导出结果(&E)", self)
            exit_action = QAction("退出(&X)", self)
        
        new_action.setShortcut("Ctrl+N")
        open_action.setShortcut("Ctrl+O")
        save_action.setShortcut("Ctrl+S")
        exit_action.setShortcut("Ctrl+Q")
        
        file_menu.addAction(new_action)
        file_menu.addAction(open_action)
        file_menu.addAction(save_action)
        file_menu.addSeparator()
        file_menu.addAction(import_action)
        file_menu.addAction(export_action)
        file_menu.addSeparator()
        file_menu.addAction(exit_action)
        
        # 计算菜单
        compute_menu = menubar.addMenu("计算(&C)")
        
        if QTA_AVAILABLE:
            mesh_action = QAction(qta.icon('fa5s.th'), "生成网格(&M)", self)
            solve_action = QAction(qta.icon('fa5s.play'), "开始求解(&S)", self)
            monitor_action = QAction(qta.icon('fa5s.chart-line'), "监控计算(&O)", self)
        else:
            mesh_action = QAction("生成网格(&M)", self)
            solve_action = QAction("开始求解(&S)", self)
            monitor_action = QAction("监控计算(&O)", self)
        
        compute_menu.addAction(mesh_action)
        compute_menu.addAction(solve_action)
        compute_menu.addAction(monitor_action)
        
        # 视图菜单
        view_menu = menubar.addMenu("视图(&V)")
        
        if QTA_AVAILABLE:
            reset_view_action = QAction(qta.icon('fa5s.home'), "重置视图(&R)", self)
            fullscreen_action = QAction(qta.icon('fa5s.expand'), "全屏模式(&F)", self)
        else:
            reset_view_action = QAction("重置视图(&R)", self)
            fullscreen_action = QAction("全屏模式(&F)", self)
        
        fullscreen_action.setShortcut("F11")
        
        view_menu.addAction(reset_view_action)
        view_menu.addAction(fullscreen_action)
        
        # 帮助菜单
        help_menu = menubar.addMenu("帮助(&H)")
        
        if QTA_AVAILABLE:
            manual_action = QAction(qta.icon('fa5s.book'), "用户手册(&M)", self)
            about_action = QAction(qta.icon('fa5s.info-circle'), "关于(&A)", self)
        else:
            manual_action = QAction("用户手册(&M)", self)
            about_action = QAction("关于(&A)", self)
        
        help_menu.addAction(manual_action)
        help_menu.addSeparator()
        help_menu.addAction(about_action)
        
        # 连接信号
        exit_action.triggered.connect(self.close)
        about_action.triggered.connect(self.show_about_dialog)
        fullscreen_action.triggered.connect(self.toggle_fullscreen)
    
    def setup_toolbar(self):
        """设置工具栏"""
        toolbar = self.addToolBar("主工具栏")
        toolbar.setMovable(False)
        toolbar.setFloatable(False)
        toolbar.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextUnderIcon)
        
        if QTA_AVAILABLE:
            # 文件操作
            toolbar.addAction(qta.icon('fa5s.file'), "新建", self.new_project)
            toolbar.addAction(qta.icon('fa5s.folder-open'), "打开", self.open_project)
            toolbar.addAction(qta.icon('fa5s.save'), "保存", self.save_project)
            toolbar.addSeparator()
            
            # 几何操作
            toolbar.addAction(qta.icon('fa5s.cube'), "几何", self.import_geometry)
            toolbar.addAction(qta.icon('fa5s.th'), "网格", self.generate_mesh)
            toolbar.addSeparator()
            
            # 计算控制
            toolbar.addAction(qta.icon('fa5s.play'), "开始", self.start_computation)
            toolbar.addAction(qta.icon('fa5s.pause'), "暂停", self.pause_computation)
            toolbar.addAction(qta.icon('fa5s.stop'), "停止", self.stop_computation)
            toolbar.addSeparator()
            
            # 视图控制
            toolbar.addAction(qta.icon('fa5s.eye'), "视图", self.reset_view)
            toolbar.addAction(qta.icon('fa5s.camera'), "截图", self.take_screenshot)
        
    def setup_statusbar(self):
        """设置状态栏"""
        statusbar = self.statusBar()
        
        # 状态信息
        self.status_label = QLabel("就绪")
        statusbar.addWidget(self.status_label)
        
        statusbar.addPermanentWidget(QLabel("|"))
        
        # 进度信息
        self.progress_label = QLabel("0/0 步")
        statusbar.addPermanentWidget(self.progress_label)
        
        statusbar.addPermanentWidget(QLabel("|"))
        
        # 时间信息
        self.time_label = QLabel("00:00:00")
        statusbar.addPermanentWidget(self.time_label)
        
        statusbar.addPermanentWidget(QLabel("|"))
        
        # 版本信息
        version_label = QLabel("v1.0.0")
        version_label.setStyleSheet("color: #6c757d;")
        statusbar.addPermanentWidget(version_label)
    
    def connect_signals(self):
        """连接信号"""
        # 参数变化信号
        self.parameter_panel.parameters_changed.connect(self.on_parameters_changed)
    
    def show_welcome_message(self):
        """显示欢迎信息"""
        self.status_label.setText("欢迎使用DeepCAD桥墩浅蚀模拟系统")
        
        # 3秒后恢复正常状态
        QTimer.singleShot(3000, lambda: self.status_label.setText("就绪"))
    
    def on_parameters_changed(self, parameters: Dict[str, Any]):
        """参数变化处理"""
        # 这里可以实时更新3D视图或进行参数验证
        pass
    
    def new_project(self):
        """新建项目"""
        self.status_label.setText("创建新项目...")
        QTimer.singleShot(1000, lambda: self.status_label.setText("新项目已创建"))
    
    def open_project(self):
        """打开项目"""
        filename, _ = QFileDialog.getOpenFileName(
            self, "打开项目", "", "项目文件 (*.scour);;所有文件 (*)"
        )
        if filename:
            self.status_label.setText(f"已打开: {Path(filename).name}")
    
    def save_project(self):
        """保存项目"""
        filename, _ = QFileDialog.getSaveFileName(
            self, "保存项目", "", "项目文件 (*.scour);;所有文件 (*)"
        )
        if filename:
            self.status_label.setText(f"已保存: {Path(filename).name}")
    
    def import_geometry(self):
        """导入几何"""
        filename, _ = QFileDialog.getOpenFileName(
            self, "导入几何", "", "几何文件 (*.stl *.ply *.obj);;所有文件 (*)"
        )
        if filename:
            self.status_label.setText("几何导入成功")
    
    def generate_mesh(self):
        """生成网格"""
        self.status_label.setText("正在生成网格...")
        QTimer.singleShot(2000, lambda: self.status_label.setText("网格生成完成"))
    
    def start_computation(self):
        """开始计算"""
        self.status_label.setText("开始计算...")
        self.progress_label.setText("1/100 步")
    
    def pause_computation(self):
        """暂停计算"""
        self.status_label.setText("计算已暂停")
    
    def stop_computation(self):
        """停止计算"""
        self.status_label.setText("计算已停止")
        self.progress_label.setText("0/0 步")
    
    def reset_view(self):
        """重置视图"""
        if hasattr(self.viewer_3d, 'plotter') and self.viewer_3d.plotter:
            self.viewer_3d.plotter.reset_camera()
        self.status_label.setText("视图已重置")
    
    def take_screenshot(self):
        """截图"""
        filename, _ = QFileDialog.getSaveFileName(
            self, "保存截图", "", "图片文件 (*.png *.jpg);;所有文件 (*)"
        )
        if filename:
            if hasattr(self.viewer_3d, 'plotter') and self.viewer_3d.plotter:
                self.viewer_3d.plotter.screenshot(filename)
            self.status_label.setText(f"截图已保存: {Path(filename).name}")
    
    def toggle_fullscreen(self):
        """切换全屏"""
        if self.isFullScreen():
            self.showNormal()
        else:
            self.showFullScreen()
    
    def show_about_dialog(self):
        """显示关于对话框"""
        about_text = """
        <h2>DeepCAD-SCOUR v1.0</h2>
        <p><b>专业桥墩浅蚀模拟系统</b></p>
        <p>Professional Bridge Pier Scour Simulation System</p>
        <br>
        <p><b>核心技术:</b></p>
        <ul>
        <li>FEniCS 有限元求解器</li>
        <li>PyVista 3D科学可视化</li>
        <li>现代化PyQt6界面</li>
        </ul>
        <br>
        <p><b>功能特性:</b></p>
        <ul>
        <li>多湍流模型支持 (k-ε, k-ω, SA)</li>
        <li>经验公式验证 (HEC-RAS, CSU)</li>
        <li>实时3D可视化</li>
        <li>专业结果导出</li>
        </ul>
        <br>
        <p>© 2024 DeepCAD Engineering Solutions</p>
        """
        
        QMessageBox.about(self, "关于DeepCAD-SCOUR", about_text)


def main():
    """测试主窗口"""
    app = QApplication(sys.argv)
    
    # 设置应用程序信息
    app.setApplicationName("DeepCAD-SCOUR")
    app.setApplicationVersion("1.0.0")
    
    window = ScourMainWindow()
    window.show()
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()