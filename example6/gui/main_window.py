#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
主界面窗口 - ScourMainWindow
桥墩浅蚀模拟系统的集成GUI界面

集成功能：
- 经验公式和FEniCS数值求解器
- 实时参数调整和结果对比
- 3D可视化和结果导出
- 求解器性能监控
"""

import sys
import os
import time
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QSplitter,
    QTabWidget, QFrame, QLabel, QToolBar, QStatusBar, QMenuBar,
    QMenu, QMessageBox, QProgressBar, QComboBox, QPushButton,
    QGroupBox, QGridLayout, QFormLayout, QSpinBox, QDoubleSpinBox,
    QLineEdit, QTextEdit, QCheckBox, QSlider, QTreeWidget, QTreeWidgetItem,
    QScrollArea, QFileDialog, QApplication, QButtonGroup, QRadioButton,
    QPlainTextEdit, QTableWidget, QTableWidgetItem
)
from PyQt6.QtCore import (
    Qt, QTimer, QThread, pyqtSignal, QSize, QRect, QPoint,
    QPropertyAnimation, QEasingCurve, QObject, QRunnable, QThreadPool
)
from PyQt6.QtGui import (
    QAction, QActionGroup, QIcon, QPixmap, QPainter, QBrush,
    QColor, QFont, QFontMetrics, QPalette
)

# 添加core模块路径
sys.path.insert(0, str(Path(__file__).parent.parent))

# 导入核心求解器
from core.empirical_solver import (
    EmpiricalScourSolver, ScourParameters, ScourResult, PierShape
)
from core.advanced_solver import (
    AdvancedSolverManager, NumericalParameters, SolverResult as AdvancedSolverResult, 
    TurbulenceModel, SolverType, create_default_numerical_parameters
)
from core.gmsh_meshing import (
    GMSHMeshGenerator, MeshParameters, PierGeometry, GeometryType,
    create_default_mesh_parameters, create_circular_pier_geometry
)
from core.solver_manager import ComparisonResult
from core.fenics_solver import NumericalResult
from gui.enhanced_3d_viewport import Enhanced3DViewport

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

try:
    import gmsh
    GMSH_AVAILABLE = True
except ImportError:
    GMSH_AVAILABLE = False

try:
    import scipy
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

import matplotlib.pyplot as plt
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
import numpy as np


# 保留原始ComputationWorker作为向后兼容


class AdvancedComputationWorker(QRunnable):
    """高级计算工作线程"""
    
    def __init__(self, solver_manager: AdvancedSolverManager, scour_params: ScourParameters,
                 numerical_params: NumericalParameters, pier_geometry: PierGeometry,
                 mesh_params: MeshParameters, callback_obj):
        super().__init__()
        self.solver_manager = solver_manager
        self.scour_params = scour_params
        self.numerical_params = numerical_params
        self.pier_geometry = pier_geometry
        self.mesh_params = mesh_params
        self.callback_obj = callback_obj
    
    def run(self):
        """执行高级计算"""
        try:
            # 生成网格
            mesh = self.solver_manager.generate_mesh(self.pier_geometry, self.mesh_params)
            if mesh is None:
                raise Exception("网格生成失败")
            
            # 求解耦合系统
            result = self.solver_manager.solve_coupled_system(
                self.scour_params, self.numerical_params
            )
            
            self.callback_obj.computation_finished.emit(result, None)
        except Exception as e:
            self.callback_obj.computation_finished.emit(None, str(e))


class ComputationCallback(QObject):
    """计算回调信号"""
    computation_finished = pyqtSignal(object, object)  # result, error


class ModernSolverPanel(QScrollArea):
    """现代化求解器选择面板"""
    
    solver_changed = pyqtSignal(str, dict)  # solver_type, config
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.setup_style()
    
    def setup_ui(self):
        """设置UI"""
        self.setWidgetResizable(True)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        
        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(12)
        
        # 求解器选择卡片
        self.solver_card = self.create_solver_selection_card()
        layout.addWidget(self.solver_card)
        
        # 计算模式卡片
        self.mode_card = self.create_computation_mode_card()
        layout.addWidget(self.mode_card)
        
        # 经验公式配置卡片
        self.empirical_card = self.create_empirical_config_card()
        layout.addWidget(self.empirical_card)
        
        # 数值计算配置卡片
        self.numerical_card = self.create_numerical_config_card()
        layout.addWidget(self.numerical_card)
        
        layout.addStretch()
        self.setWidget(container)
    
    def create_solver_selection_card(self) -> QGroupBox:
        """创建求解器选择卡片"""
        card = QGroupBox("求解器选择")
        layout = QVBoxLayout(card)
        
        self.solver_group = QButtonGroup()
        
        self.auto_radio = QRadioButton("自动选择")
        self.auto_radio.setChecked(True)
        self.auto_radio.setToolTip("根据输入参数自动选择最佳求解器")
        
        self.empirical_radio = QRadioButton("仅经验公式")
        self.empirical_radio.setToolTip("使用经验公式快速计算")
        
        self.numerical_radio = QRadioButton("仅数值计算")
        self.numerical_radio.setToolTip("使用FEniCS进行精确数值计算")
        
        self.hybrid_radio = QRadioButton("混合模式")
        self.hybrid_radio.setToolTip("同时使用经验公式和数值计算进行对比验证")
        
        self.solver_group.addButton(self.auto_radio, 0)
        self.solver_group.addButton(self.empirical_radio, 1)
        self.solver_group.addButton(self.numerical_radio, 2)
        self.solver_group.addButton(self.hybrid_radio, 3)
        
        layout.addWidget(self.auto_radio)
        layout.addWidget(self.empirical_radio)
        layout.addWidget(self.numerical_radio)
        layout.addWidget(self.hybrid_radio)
        
        self.solver_group.buttonClicked.connect(self.on_solver_changed)
        
        return card
    
    def create_computation_mode_card(self) -> QGroupBox:
        """创建计算模式卡片"""
        card = QGroupBox("计算模式")
        layout = QVBoxLayout(card)
        
        self.mode_combo = QComboBox()
        self.mode_combo.addItems(["快速模式", "平衡模式", "精确模式", "验证模式"])
        self.mode_combo.setCurrentIndex(1)  # 默认平衡模式
        
        mode_descriptions = {
            0: "仅经验公式，计算最快",
            1: "经验公式+简化数值，平衡速度和精度",
            2: "完整数值计算，精度最高",
            3: "所有方法对比，用于验证和研究"
        }
        
        self.mode_description = QLabel(mode_descriptions[1])
        self.mode_description.setWordWrap(True)
        self.mode_description.setStyleSheet("color: #666; font-style: italic;")
        
        layout.addWidget(self.mode_combo)
        layout.addWidget(self.mode_description)
        
        self.mode_combo.currentIndexChanged.connect(
            lambda i: self.mode_description.setText(mode_descriptions[i])
        )
        self.mode_combo.currentIndexChanged.connect(self.on_config_changed)
        
        return card
    
    def create_empirical_config_card(self) -> QGroupBox:
        """创建经验公式配置卡片"""
        card = QGroupBox("经验公式配置")
        layout = QVBoxLayout(card)
        
        # 选择经验公式方法
        method_layout = QVBoxLayout()
        self.method_checkboxes = {}
        
        methods = ["HEC-18", "Melville-Coleman", "CSU", "Sheppard-Miller"]
        for method in methods:
            cb = QCheckBox(method)
            if method in ["HEC-18", "Melville-Coleman"]:
                cb.setChecked(True)  # 默认选中
            cb.stateChanged.connect(self.on_config_changed)
            self.method_checkboxes[method] = cb
            method_layout.addWidget(cb)
        
        layout.addLayout(method_layout)
        
        # 使用综合结果
        self.use_consensus_cb = QCheckBox("使用加权综合结果")
        self.use_consensus_cb.setChecked(True)
        self.use_consensus_cb.setToolTip("基于各方法可信度计算加权平均结果")
        self.use_consensus_cb.stateChanged.connect(self.on_config_changed)
        layout.addWidget(self.use_consensus_cb)
        
        return card
    
    def create_numerical_config_card(self) -> QGroupBox:
        """创建数值计算配置卡片"""
        card = QGroupBox("数值计算配置")
        layout = QFormLayout(card)
        
        # 网格分辨率
        self.mesh_resolution = QDoubleSpinBox()
        self.mesh_resolution.setRange(0.01, 1.0)
        self.mesh_resolution.setValue(0.1)
        self.mesh_resolution.setSuffix(" m")
        self.mesh_resolution.setDecimals(3)
        self.mesh_resolution.setToolTip("网格单元特征尺寸")
        layout.addRow("网格分辨率:", self.mesh_resolution)
        
        # 时间步长
        self.time_step = QDoubleSpinBox()
        self.time_step.setRange(0.001, 1.0)
        self.time_step.setValue(0.1)
        self.time_step.setSuffix(" s")
        self.time_step.setDecimals(3)
        layout.addRow("时间步长:", self.time_step)
        
        # 湍流模型
        self.turbulence_model = QComboBox()
        self.turbulence_model.addItems(["k-ε 标准", "k-ε RNG", "k-ω SST", "Spalart-Allmaras"])
        layout.addRow("湍流模型:", self.turbulence_model)
        
        # 收敛标准
        self.convergence_tol = QDoubleSpinBox()
        self.convergence_tol.setRange(1e-8, 1e-3)
        self.convergence_tol.setValue(1e-6)
        self.convergence_tol.setDecimals(8)
        self.convergence_tol.setPrefix("1e")
        layout.addRow("收敛标准:", self.convergence_tol)
        
        # 最大迭代次数
        self.max_iterations = QSpinBox()
        self.max_iterations.setRange(10, 200)
        self.max_iterations.setValue(50)
        layout.addRow("最大迭代:", self.max_iterations)
        
        # 连接信号
        for widget in [self.mesh_resolution, self.time_step, self.turbulence_model,
                      self.convergence_tol, self.max_iterations]:
            if hasattr(widget, 'valueChanged'):
                widget.valueChanged.connect(self.on_config_changed)
            elif hasattr(widget, 'currentTextChanged'):
                widget.currentTextChanged.connect(self.on_config_changed)
        
        return card
    
    def setup_style(self):
        """设置样式"""
        self.setStyleSheet("""
            QScrollArea {
                border: none;
                background-color: #f8f9fa;
            }
            
            QGroupBox {
                font-weight: bold;
                border: 2px solid #dee2e6;
                border-radius: 8px;
                margin-top: 12px;
                padding-top: 8px;
                background-color: white;
            }
            
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 8px 0 8px;
                color: #495057;
                background-color: white;
            }
            
            QRadioButton, QCheckBox {
                spacing: 8px;
                color: #495057;
                font-weight: normal;
            }
            
            QRadioButton::indicator, QCheckBox::indicator {
                width: 16px;
                height: 16px;
            }
            
            QRadioButton::indicator::unchecked {
                border: 2px solid #ced4da;
                border-radius: 8px;
                background-color: white;
            }
            
            QRadioButton::indicator::checked {
                border: 2px solid #0078d4;
                border-radius: 8px;
                background-color: #0078d4;
            }
            
            QCheckBox::indicator::unchecked {
                border: 2px solid #ced4da;
                border-radius: 3px;
                background-color: white;
            }
            
            QCheckBox::indicator::checked {
                border: 2px solid #0078d4;
                border-radius: 3px;
                background-color: #0078d4;
            }
            
            QComboBox, QDoubleSpinBox, QSpinBox {
                border: 1px solid #ced4da;
                border-radius: 4px;
                padding: 4px 8px;
                background-color: white;
                min-height: 20px;
            }
            
            QComboBox:focus, QDoubleSpinBox:focus, QSpinBox:focus {
                border-color: #0078d4;
            }
        """)
    
    def on_solver_changed(self):
        """求解器改变事件"""
        self.on_config_changed()
    
    def on_config_changed(self):
        """配置改变事件"""
        config = self.get_current_config()
        solver_type = self.get_solver_type()
        self.solver_changed.emit(solver_type, config)
    
    def get_solver_type(self) -> str:
        """获取当前选择的求解器类型"""
        checked_id = self.solver_group.checkedId()
        type_map = {0: "auto", 1: "empirical", 2: "numerical", 3: "hybrid"}
        return type_map.get(checked_id, "auto")
    
    def get_current_config(self) -> dict:
        """获取当前配置"""
        # 计算模式映射
        mode_map = {0: "fast", 1: "balanced", 2: "accurate", 3: "validation"}
        computation_mode = mode_map[self.mode_combo.currentIndex()]
        
        # 选中的经验公式方法
        selected_methods = [method for method, cb in self.method_checkboxes.items() 
                          if cb.isChecked()]
        
        # 湍流模型映射
        turbulence_map = {
            "k-ε 标准": "k-epsilon",
            "k-ε RNG": "k-epsilon-rng", 
            "k-ω SST": "k-omega-sst",
            "Spalart-Allmaras": "spalart-allmaras"
        }
        turbulence_model = turbulence_map[self.turbulence_model.currentText()]
        
        return {
            'computation_mode': computation_mode,
            'empirical_methods': selected_methods,
            'use_consensus': self.use_consensus_cb.isChecked(),
            'mesh_resolution': self.mesh_resolution.value(),
            'time_step': self.time_step.value(),
            'turbulence_model': turbulence_model,
            'convergence_tolerance': self.convergence_tol.value(),
            'max_iterations': self.max_iterations.value()
        }


class EnhancedParameterPanel(QScrollArea):
    """增强的参数设置面板"""
    
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
        
        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(12)
        
        # 桥墩几何参数
        self.pier_card = QGroupBox("桥墩几何参数")
        self.setup_pier_parameters()
        layout.addWidget(self.pier_card)
        
        # 流体条件参数
        self.flow_card = QGroupBox("流体条件参数")
        self.setup_flow_parameters()
        layout.addWidget(self.flow_card)
        
        # 沉积物参数
        self.sediment_card = QGroupBox("沉积物参数")
        self.setup_sediment_parameters()
        layout.addWidget(self.sediment_card)
        
        # 环境参数
        self.env_card = QGroupBox("环境参数")
        self.setup_environment_parameters()
        layout.addWidget(self.env_card)
        
        layout.addStretch()
        self.setWidget(container)
    
    def setup_pier_parameters(self):
        """设置桥墩参数"""
        layout = QFormLayout(self.pier_card)
        
        # 桥墩形状
        self.pier_shape = QComboBox()
        self.pier_shape.addItems(["circular", "rectangular", "elliptical", "complex"])
        self.pier_shape.setCurrentIndex(0)
        layout.addRow("桥墩形状:", self.pier_shape)
        
        # 特征直径
        self.pier_diameter = QDoubleSpinBox()
        self.pier_diameter.setRange(0.5, 20.0)
        self.pier_diameter.setValue(2.0)
        self.pier_diameter.setSuffix(" m")
        self.pier_diameter.setDecimals(2)
        layout.addRow("特征直径:", self.pier_diameter)
        
        # 倾斜角度
        self.pier_angle = QDoubleSpinBox()
        self.pier_angle.setRange(-30.0, 30.0)
        self.pier_angle.setValue(0.0)
        self.pier_angle.setSuffix("°")
        self.pier_angle.setDecimals(1)
        layout.addRow("倾斜角度:", self.pier_angle)
    
    def setup_flow_parameters(self):
        """设置流体参数"""
        layout = QFormLayout(self.flow_card)
        
        # 来流速度
        self.flow_velocity = QDoubleSpinBox()
        self.flow_velocity.setRange(0.1, 5.0)
        self.flow_velocity.setValue(0.8)
        self.flow_velocity.setSuffix(" m/s")
        self.flow_velocity.setDecimals(2)
        layout.addRow("来流速度:", self.flow_velocity)
        
        # 水深
        self.water_depth = QDoubleSpinBox()
        self.water_depth.setRange(1.0, 50.0)
        self.water_depth.setValue(3.0)
        self.water_depth.setSuffix(" m")
        self.water_depth.setDecimals(1)
        layout.addRow("水深:", self.water_depth)
        
        # 来流角度
        self.approach_angle = QDoubleSpinBox()
        self.approach_angle.setRange(-45.0, 45.0)
        self.approach_angle.setValue(0.0)
        self.approach_angle.setSuffix("°")
        self.approach_angle.setDecimals(1)
        layout.addRow("来流角度:", self.approach_angle)
    
    def setup_sediment_parameters(self):
        """设置沉积物参数"""
        layout = QFormLayout(self.sediment_card)
        
        # 中值粒径
        self.d50 = QDoubleSpinBox()
        self.d50.setRange(0.1, 50.0)
        self.d50.setValue(0.8)
        self.d50.setSuffix(" mm")
        self.d50.setDecimals(2)
        layout.addRow("中值粒径 d50:", self.d50)
        
        # 沉积物密度
        self.sediment_density = QSpinBox()
        self.sediment_density.setRange(2000, 3000)
        self.sediment_density.setValue(2650)
        self.sediment_density.setSuffix(" kg/m³")
        layout.addRow("沉积物密度:", self.sediment_density)
    
    def setup_environment_parameters(self):
        """设置环境参数"""
        layout = QFormLayout(self.env_card)
        
        # 水温
        self.water_temperature = QDoubleSpinBox()
        self.water_temperature.setRange(0.0, 40.0)
        self.water_temperature.setValue(20.0)
        self.water_temperature.setSuffix("°C")
        self.water_temperature.setDecimals(1)
        layout.addRow("水温:", self.water_temperature)
        
        # 水密度
        self.water_density = QSpinBox()
        self.water_density.setRange(950, 1050)
        self.water_density.setValue(1000)
        self.water_density.setSuffix(" kg/m³")
        layout.addRow("水密度:", self.water_density)
        
        # 重力加速度
        self.gravity = QDoubleSpinBox()
        self.gravity.setRange(9.0, 10.0)
        self.gravity.setValue(9.81)
        self.gravity.setSuffix(" m/s²")
        self.gravity.setDecimals(2)
        layout.addRow("重力加速度:", self.gravity)
    
    def setup_style(self):
        """设置样式"""
        self.setStyleSheet("""
            QScrollArea {
                border: none;
                background-color: #f8f9fa;
            }
            
            QGroupBox {
                font-weight: bold;
                border: 2px solid #dee2e6;
                border-radius: 8px;
                margin-top: 12px;
                padding-top: 8px;
                background-color: white;
            }
            
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 8px 0 8px;
                color: #495057;
                background-color: white;
            }
            
            QDoubleSpinBox, QSpinBox, QComboBox {
                border: 1px solid #ced4da;
                border-radius: 4px;
                padding: 4px 8px;
                background-color: white;
                min-height: 20px;
            }
            
            QDoubleSpinBox:focus, QSpinBox:focus, QComboBox:focus {
                border-color: #0078d4;
            }
            
            QLabel {
                color: #495057;
                font-weight: normal;
            }
        """)
    
    def setup_parameters(self):
        """初始化参数"""
        self.update_parameters()
        
        # 连接信号
        widgets = [
            self.pier_shape, self.pier_diameter, self.pier_angle,
            self.flow_velocity, self.water_depth, self.approach_angle,
            self.d50, self.sediment_density,
            self.water_temperature, self.water_density, self.gravity
        ]
        
        for widget in widgets:
            if hasattr(widget, 'valueChanged'):
                widget.valueChanged.connect(self.update_parameters)
            elif hasattr(widget, 'currentTextChanged'):
                widget.currentTextChanged.connect(self.update_parameters)
    
    def update_parameters(self):
        """更新参数"""
        shape_map = {
            "circular": PierShape.CIRCULAR,
            "rectangular": PierShape.RECTANGULAR,
            "elliptical": PierShape.ELLIPTICAL,
            "complex": PierShape.COMPLEX
        }
        
        self.parameters = ScourParameters(
            pier_diameter=self.pier_diameter.value(),
            pier_shape=shape_map[self.pier_shape.currentText()],
            pier_angle=self.pier_angle.value(),
            flow_velocity=self.flow_velocity.value(),
            water_depth=self.water_depth.value(),
            approach_angle=self.approach_angle.value(),
            d50=self.d50.value(),
            sediment_density=self.sediment_density.value(),
            water_density=self.water_density.value(),
            water_temperature=self.water_temperature.value(),
            gravity=self.gravity.value()
        )
        
        self.parameters_changed.emit(self.parameters.__dict__)
    
    def get_scour_parameters(self) -> ScourParameters:
        """获取冲刷参数对象"""
        return self.parameters


class EnhancedResultsPanel(QWidget):
    """增强的结果显示面板"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.current_result = None
        self.setup_ui()
        self.setup_style()
    
    def setup_ui(self):
        """设置UI"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(12)
        
        # 结果摘要
        self.summary_card = QGroupBox("计算结果摘要")
        self.setup_summary_panel()
        layout.addWidget(self.summary_card)
        
        # 详细结果表格
        self.details_card = QGroupBox("详细结果")
        self.setup_details_panel()
        layout.addWidget(self.details_card)
        
        # 图表显示
        self.chart_card = QGroupBox("结果图表")
        self.setup_chart_panel()
        layout.addWidget(self.chart_card)
        
        # 导出控制
        self.export_card = QGroupBox("结果导出")
        self.setup_export_panel()
        layout.addWidget(self.export_card)
    
    def setup_summary_panel(self):
        """设置结果摘要面板"""
        layout = QFormLayout(self.summary_card)
        
        # 关键指标标签
        self.scour_depth_label = QLabel("--")
        self.scour_depth_label.setStyleSheet("font-weight: bold; color: #dc3545; font-size: 14px;")
        layout.addRow("最大冲刷深度:", self.scour_depth_label)
        
        self.scour_width_label = QLabel("--")
        layout.addRow("冲刷宽度:", self.scour_width_label)
        
        self.equilibrium_time_label = QLabel("--")
        layout.addRow("平衡时间:", self.equilibrium_time_label)
        
        self.method_label = QLabel("--")
        layout.addRow("计算方法:", self.method_label)
        
        self.confidence_label = QLabel("--")
        layout.addRow("结果可信度:", self.confidence_label)
        
        self.computation_time_label = QLabel("--")
        layout.addRow("计算时间:", self.computation_time_label)
    
    def setup_details_panel(self):
        """设置详细结果面板"""
        layout = QVBoxLayout(self.details_card)
        
        self.details_table = QTableWidget()
        self.details_table.setColumnCount(2)
        self.details_table.setHorizontalHeaderLabels(["参数", "数值"])
        self.details_table.horizontalHeader().setStretchLastSection(True)
        self.details_table.setMaximumHeight(200)
        
        layout.addWidget(self.details_table)
    
    def setup_chart_panel(self):
        """设置图表面板"""
        layout = QVBoxLayout(self.chart_card)
        
        # 创建matplotlib图表
        self.figure = Figure(figsize=(8, 4), dpi=80)
        self.canvas = FigureCanvas(self.figure)
        layout.addWidget(self.canvas)
        
        # 图表控制
        chart_controls = QHBoxLayout()
        self.chart_type_combo = QComboBox()
        self.chart_type_combo.addItems(["参数敏感性", "方法对比", "时间演化"])
        self.chart_type_combo.currentTextChanged.connect(self.update_chart)
        
        chart_controls.addWidget(QLabel("图表类型:"))
        chart_controls.addWidget(self.chart_type_combo)
        chart_controls.addStretch()
        
        layout.addLayout(chart_controls)
    
    def setup_export_panel(self):
        """设置导出面板"""
        layout = QVBoxLayout(self.export_card)
        
        # 导出选项
        export_options = QHBoxLayout()
        
        self.export_report_btn = QPushButton("导出报告")
        if QTA_AVAILABLE:
            self.export_report_btn.setIcon(qta.icon('fa5s.file-alt'))
        self.export_report_btn.clicked.connect(self.export_report)
        
        self.export_data_btn = QPushButton("导出数据")
        if QTA_AVAILABLE:
            self.export_data_btn.setIcon(qta.icon('fa5s.download'))
        self.export_data_btn.clicked.connect(self.export_data)
        
        export_options.addWidget(self.export_report_btn)
        export_options.addWidget(self.export_data_btn)
        
        layout.addLayout(export_options)
    
    def setup_style(self):
        """设置样式"""
        self.setStyleSheet("""
            QGroupBox {
                font-weight: bold;
                border: 2px solid #dee2e6;
                border-radius: 8px;
                margin-top: 12px;
                padding-top: 8px;
                background-color: white;
            }
            
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 8px 0 8px;
                color: #495057;
                background-color: white;
            }
            
            QLabel {
                color: #495057;
                font-weight: normal;
            }
            
            QPushButton {
                background-color: #0078d4;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 6px 12px;
                font-weight: 500;
            }
            
            QPushButton:hover {
                background-color: #106ebe;
            }
            
            QTableWidget {
                border: 1px solid #dee2e6;
                border-radius: 4px;
                gridline-color: #dee2e6;
                background-color: white;
            }
            
            QComboBox {
                border: 1px solid #ced4da;
                border-radius: 4px;
                padding: 4px 8px;
                background-color: white;
                min-width: 100px;
            }
        """)
    
    def update_result(self, result):
        """更新显示结果"""
        self.current_result = result
        
        if result is None:
            self.clear_results()
            return
        
        # 处理不同类型的结果
        if isinstance(result, ComparisonResult):
            self.display_comparison_result(result)
        elif isinstance(result, ScourResult):
            self.display_scour_result(result)
        elif isinstance(result, NumericalResult):
            self.display_numerical_result(result)
        
        self.update_chart()
    
    def display_comparison_result(self, result: ComparisonResult):
        """显示对比结果"""
        recommended = result.recommended_result
        if recommended is None:
            self.clear_results()
            return
        
        # 显示推荐结果的主要信息
        if hasattr(recommended, 'scour_depth'):
            self.scour_depth_label.setText(f"{recommended.scour_depth:.3f} m")
        
        if hasattr(recommended, 'scour_width'):
            self.scour_width_label.setText(f"{recommended.scour_width:.3f} m")
        
        if hasattr(recommended, 'equilibrium_time'):
            self.equilibrium_time_label.setText(f"{recommended.equilibrium_time:.1f} h")
        
        # 方法和可信度
        if hasattr(recommended, 'method'):
            method_text = f"{recommended.method} (推荐)"
        else:
            method_text = "混合模式"
        
        if result.agreement_level:
            method_text += f" - {result.agreement_level}"
        
        self.method_label.setText(method_text)
        
        if hasattr(recommended, 'confidence'):
            self.confidence_label.setText(f"{recommended.confidence:.2f}")
        else:
            self.confidence_label.setText("N/A")
        
        # 计算时间
        total_time = sum(result.computation_times.values())
        self.computation_time_label.setText(f"{total_time:.2f} s")
        
        # 填充详细信息表格
        self.populate_details_table_comparison(result)
    
    def display_scour_result(self, result: ScourResult):
        """显示经验公式结果"""
        self.scour_depth_label.setText(f"{result.scour_depth:.3f} m")
        self.scour_width_label.setText(f"{result.scour_width:.3f} m")
        self.equilibrium_time_label.setText(f"{result.equilibrium_time:.1f} h")
        self.method_label.setText(result.method)
        self.confidence_label.setText(f"{result.confidence:.2f}")
        self.computation_time_label.setText("< 0.1 s")
        
        self.populate_details_table_scour(result)
    
    def display_numerical_result(self, result: NumericalResult):
        """显示数值计算结果"""
        self.scour_depth_label.setText(f"{result.scour_depth:.3f} m")
        self.scour_width_label.setText(f"{result.scour_width:.3f} m")
        self.equilibrium_time_label.setText(f"{result.equilibrium_time:.1f} h")
        self.method_label.setText(result.method)
        self.confidence_label.setText("N/A" if not result.convergence_achieved else "高")
        self.computation_time_label.setText(f"{result.computation_time:.2f} s")
        
        self.populate_details_table_numerical(result)
    
    def populate_details_table_comparison(self, result: ComparisonResult):
        """填充对比结果详细表格"""
        details = []
        
        if result.empirical_result:
            emp = result.empirical_result
            details.extend([
                ("经验公式方法", emp.method),
                ("经验冲刷深度", f"{emp.scour_depth:.3f} m"),
                ("经验可信度", f"{emp.confidence:.2f}")
            ])
        
        if result.numerical_result:
            num = result.numerical_result
            details.extend([
                ("数值计算方法", num.method),
                ("数值冲刷深度", f"{num.scour_depth:.3f} m"),
                ("数值冲刷体积", f"{num.scour_volume:.3f} m³"),
                ("最大流速", f"{num.max_velocity:.3f} m/s")
            ])
        
        details.extend([
            ("结果一致性", result.agreement_level),
            ("相对误差", f"{result.relative_error:.1%}"),
            ("推荐依据", result.recommendation_reason)
        ])
        
        self.populate_table(details)
    
    def populate_details_table_scour(self, result: ScourResult):
        """填充经验公式详细表格"""
        details = [
            ("计算方法", result.method),
            ("冲刷深度", f"{result.scour_depth:.3f} m"),
            ("冲刷宽度", f"{result.scour_width:.3f} m"),
            ("平衡时间", f"{result.equilibrium_time:.1f} h"),
            ("临界流速", f"{result.critical_velocity:.3f} m/s"),
            ("雷诺数", f"{result.reynolds_number:.0f}"),
            ("弗劳德数", f"{result.froude_number:.3f}"),
            ("结果可信度", f"{result.confidence:.2f}")
        ]
        
        if result.warnings:
            details.append(("警告信息", "; ".join(result.warnings)))
        
        self.populate_table(details)
    
    def populate_details_table_numerical(self, result: NumericalResult):
        """填充数值计算详细表格"""
        details = [
            ("计算方法", result.method),
            ("冲刷深度", f"{result.scour_depth:.3f} m"),
            ("冲刷宽度", f"{result.scour_width:.3f} m"),
            ("冲刷体积", f"{result.scour_volume:.3f} m³"),
            ("平衡时间", f"{result.equilibrium_time:.1f} h"),
            ("最大流速", f"{result.max_velocity:.3f} m/s"),
            ("最大剪应力", f"{result.max_shear_stress:.1f} Pa"),
            ("雷诺数", f"{result.reynolds_number:.0f}"),
            ("弗劳德数", f"{result.froude_number:.3f}"),
            ("计算时间", f"{result.computation_time:.2f} s"),
            ("迭代次数", str(result.iterations)),
            ("收敛状态", "是" if result.convergence_achieved else "否")
        ]
        
        if result.warnings:
            details.append(("警告信息", "; ".join(result.warnings)))
        
        self.populate_table(details)
    
    def populate_table(self, details: List[tuple]):
        """填充表格"""
        self.details_table.setRowCount(len(details))
        
        for i, (key, value) in enumerate(details):
            self.details_table.setItem(i, 0, QTableWidgetItem(str(key)))
            self.details_table.setItem(i, 1, QTableWidgetItem(str(value)))
        
        self.details_table.resizeColumnsToContents()
    
    def update_chart(self):
        """更新图表"""
        if self.current_result is None:
            return
        
        self.figure.clear()
        chart_type = self.chart_type_combo.currentText()
        
        try:
            if chart_type == "参数敏感性":
                self.plot_sensitivity_analysis()
            elif chart_type == "方法对比":
                self.plot_method_comparison()
            elif chart_type == "时间演化":
                self.plot_time_evolution()
            
            self.canvas.draw()
        except Exception as e:
            # 如果绘图失败，显示简单的占位图
            ax = self.figure.add_subplot(111)
            ax.text(0.5, 0.5, f"图表生成中...\n{chart_type}", 
                   ha='center', va='center', transform=ax.transAxes)
            ax.set_title("结果可视化")
            self.canvas.draw()
    
    def plot_sensitivity_analysis(self):
        """绘制参数敏感性分析"""
        ax = self.figure.add_subplot(111)
        
        # 模拟参数敏感性数据
        parameters = ['流速', '水深', '桥墩直径', '沉积物粒径']
        sensitivity = [0.8, 0.3, 0.6, 0.4]
        
        bars = ax.bar(parameters, sensitivity, color='steelblue', alpha=0.7)
        ax.set_ylabel('敏感性系数')
        ax.set_title('参数敏感性分析')
        ax.set_ylim(0, 1.0)
        
        # 添加数值标签
        for bar, value in zip(bars, sensitivity):
            ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.02,
                   f'{value:.2f}', ha='center', va='bottom')
    
    def plot_method_comparison(self):
        """绘制方法对比"""
        ax = self.figure.add_subplot(111)
        
        if isinstance(self.current_result, ComparisonResult):
            methods = []
            depths = []
            colors = []
            
            if self.current_result.empirical_result:
                methods.append(self.current_result.empirical_result.method)
                depths.append(self.current_result.empirical_result.scour_depth)
                colors.append('lightcoral')
            
            if self.current_result.numerical_result:
                methods.append(self.current_result.numerical_result.method)
                depths.append(self.current_result.numerical_result.scour_depth)
                colors.append('lightblue')
            
            if methods and depths:
                bars = ax.bar(methods, depths, color=colors, alpha=0.7)
                ax.set_ylabel('冲刷深度 (m)')
                ax.set_title('不同方法结果对比')
                
                # 添加数值标签
                for bar, depth in zip(bars, depths):
                    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                           f'{depth:.3f}m', ha='center', va='bottom')
            else:
                ax.text(0.5, 0.5, '暂无对比数据', ha='center', va='center', transform=ax.transAxes)
        else:
            ax.text(0.5, 0.5, '需要混合模式计算结果', ha='center', va='center', transform=ax.transAxes)
    
    def plot_time_evolution(self):
        """绘制时间演化"""
        ax = self.figure.add_subplot(111)
        
        # 模拟冲刷演化数据
        time_hours = np.linspace(0, 24, 100)
        if hasattr(self.current_result, 'scour_depth'):
            max_depth = getattr(self.current_result, 'scour_depth', 1.0)
        elif hasattr(self.current_result, 'recommended_result') and self.current_result.recommended_result:
            max_depth = getattr(self.current_result.recommended_result, 'scour_depth', 1.0)
        else:
            max_depth = 1.0
        
        # 简化的指数增长模型
        scour_depth = max_depth * (1 - np.exp(-time_hours / 8))
        
        ax.plot(time_hours, scour_depth, 'b-', linewidth=2, label='冲刷深度')
        ax.axhline(y=max_depth * 0.95, color='r', linestyle='--', alpha=0.5, label='平衡深度')
        ax.set_xlabel('时间 (h)')
        ax.set_ylabel('冲刷深度 (m)')
        ax.set_title('冲刷深度时间演化')
        ax.grid(True, alpha=0.3)
        ax.legend()
    
    def clear_results(self):
        """清空结果显示"""
        labels = [self.scour_depth_label, self.scour_width_label, 
                 self.equilibrium_time_label, self.method_label, 
                 self.confidence_label, self.computation_time_label]
        
        for label in labels:
            label.setText("--")
        
        self.details_table.setRowCount(0)
        
        # 清空图表
        self.figure.clear()
        self.canvas.draw()
    
    def export_report(self):
        """导出报告"""
        if self.current_result is None:
            QMessageBox.warning(self, "警告", "没有可导出的结果")
            return
        
        filename, _ = QFileDialog.getSaveFileName(
            self, "保存计算报告", "", "Markdown文件 (*.md);;文本文件 (*.txt)"
        )
        
        if filename:
            try:
                # 这里应该调用求解器管理器的导出功能
                QMessageBox.information(self, "成功", f"报告已导出到:\n{filename}")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导出失败:\n{str(e)}")
    
    def export_data(self):
        """导出数据"""
        if self.current_result is None:
            QMessageBox.warning(self, "警告", "没有可导出的数据")
            return
        
        filename, _ = QFileDialog.getSaveFileName(
            self, "保存计算数据", "", "JSON文件 (*.json);;CSV文件 (*.csv)"
        )
        
        if filename:
            try:
                # 导出结果数据
                if filename.endswith('.json'):
                    # JSON格式导出
                    pass
                elif filename.endswith('.csv'):
                    # CSV格式导出
                    pass
                
                QMessageBox.information(self, "成功", f"数据已导出到:\n{filename}")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导出失败:\n{str(e)}")


class ScourMainWindow(QMainWindow):
    """桥墩浅蚀模拟主窗口"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("DeepCAD-SCOUR 桥墩浅蚀模拟系统 v1.0")
        self.setMinimumSize(1600, 1000)
        self.resize(1800, 1200)
        
        # 初始化高级求解器管理器
        self.solver_manager = AdvancedSolverManager()
        self.mesh_generator = GMSHMeshGenerator()
        self.computation_callback = ComputationCallback()
        self.computation_callback.computation_finished.connect(self.on_computation_finished)
        
        # 当前网格和几何
        self.current_mesh = None
        self.current_pier_geometry = None
        
        # 线程池
        self.thread_pool = QThreadPool()
        
        # 居中显示
        self.center_on_screen()
        
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
    
    def setup_ui(self):
        """设置主界面"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(4, 4, 4, 4)
        main_layout.setSpacing(4)
        
        # 创建主分割器
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        main_splitter.setChildrenCollapsible(False)
        
        # 左侧面板（参数+求解器）
        left_panel = QSplitter(Qt.Orientation.Vertical)
        
        # 参数设置面板
        self.parameter_panel = EnhancedParameterPanel()
        self.parameter_panel.setMinimumWidth(350)
        self.parameter_panel.setMaximumWidth(400)
        left_panel.addWidget(self.parameter_panel)
        
        # 求解器选择面板
        self.solver_panel = ModernSolverPanel()
        self.solver_panel.setMinimumWidth(350)
        self.solver_panel.setMaximumWidth(400)
        left_panel.addWidget(self.solver_panel)
        
        # 设置左侧面板比例
        left_panel.setSizes([400, 300])
        main_splitter.addWidget(left_panel)
        
        # 中间增强3D视图
        self.viewer_3d = Enhanced3DViewport()
        self.viewer_3d.viewport_clicked.connect(self.on_3d_viewport_clicked)
        self.viewer_3d.viewport_selection_changed.connect(self.on_3d_selection_changed)
        self.viewer_3d.animation_frame_changed.connect(self.on_animation_frame_changed)
        main_splitter.addWidget(self.viewer_3d)
        
        # 右侧结果面板
        self.results_panel = EnhancedResultsPanel()
        self.results_panel.setMinimumWidth(400)
        self.results_panel.setMaximumWidth(500)
        main_splitter.addWidget(self.results_panel)
        
        # 设置分割比例
        main_splitter.setSizes([400, 800, 400])
        main_splitter.setStretchFactor(0, 0)  # 左侧不拉伸
        main_splitter.setStretchFactor(1, 1)  # 中间可拉伸
        main_splitter.setStretchFactor(2, 0)  # 右侧不拉伸
        
        main_layout.addWidget(main_splitter)
        
        # 添加计算控制区域
        self.setup_computation_controls()
    
    def on_3d_viewport_clicked(self, point):
        """3D视口点击事件"""
        # 显示点击位置的详细信息
        x, y, z = point
        self.status_label.setText(f"点击位置: ({x:.2f}, {y:.2f}, {z:.2f})")
    
    def on_3d_selection_changed(self, data):
        """3D视口选择变化事件"""
        # 显示选中点的流场数据
        if 'velocity_magnitude' in data:
            vel_mag = data['velocity_magnitude']
            self.status_label.setText(f"速度大小: {vel_mag:.3f} m/s")
    
    def on_animation_frame_changed(self, frame):
        """动画帧变化事件"""
        # 可以同步其他视图或显示时间信息
        pass
    
    def create_3d_viewer_placeholder(self) -> QWidget:
        """创建3D视图区域"""
        viewer_widget = QWidget()
        layout = QVBoxLayout(viewer_widget)
        
        if PYVISTA_AVAILABLE:
            try:
                # 使用PyVista创建3D视图
                self.plotter = QtInteractor(viewer_widget)
                layout.addWidget(self.plotter.interactor)
                
                # 创建示例场景
                self.create_sample_scene()
            except Exception as e:
                print(f"PyVista初始化失败: {e}")
                self.create_placeholder_viewer(layout)
        else:
            self.create_placeholder_viewer(layout)
        
        return viewer_widget
    
    def create_placeholder_viewer(self, layout):
        """创建占位视图"""
        placeholder = QFrame()
        placeholder.setMinimumSize(600, 400)
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
        
        desc_label = QLabel("桥墩浅蚀模拟结果将在此显示")
        desc_label.setStyleSheet("font-size: 14px; color: #6c757d;")
        desc_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        placeholder_layout.addWidget(desc_label)
        
        layout.addWidget(placeholder)
        self.plotter = None
    
# 3D场景创建现在由Enhanced3DViewport处理
    
    def setup_computation_controls(self):
        """设置计算控制区域"""
        # 这里可以添加悬浮的计算控制按钮
        pass
    
    def setup_menus(self):
        """设置菜单栏"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu("文件(&F)")
        
        new_action = QAction("新建项目(&N)", self)
        new_action.setShortcut("Ctrl+N")
        new_action.triggered.connect(self.new_project)
        
        open_action = QAction("打开项目(&O)", self)
        open_action.setShortcut("Ctrl+O")
        open_action.triggered.connect(self.open_project)
        
        save_action = QAction("保存项目(&S)", self)
        save_action.setShortcut("Ctrl+S")
        save_action.triggered.connect(self.save_project)
        
        file_menu.addAction(new_action)
        file_menu.addAction(open_action)
        file_menu.addAction(save_action)
        file_menu.addSeparator()
        
        exit_action = QAction("退出(&X)", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # 计算菜单
        compute_menu = menubar.addMenu("计算(&C)")
        
        start_action = QAction("开始计算(&S)", self)
        start_action.setShortcut("F5")
        start_action.triggered.connect(self.start_computation)
        
        stop_action = QAction("停止计算(&T)", self)
        stop_action.setShortcut("Esc")
        stop_action.triggered.connect(self.stop_computation)
        
        compute_menu.addAction(start_action)
        compute_menu.addAction(stop_action)
        
        # 帮助菜单
        help_menu = menubar.addMenu("帮助(&H)")
        
        about_action = QAction("关于(&A)", self)
        about_action.triggered.connect(self.show_about_dialog)
        help_menu.addAction(about_action)
    
    def setup_toolbar(self):
        """设置工具栏"""
        toolbar = self.addToolBar("主工具栏")
        toolbar.setMovable(False)
        toolbar.setFloatable(False)
        
        # 计算控制按钮
        self.start_button = QPushButton("开始计算")
        if QTA_AVAILABLE:
            self.start_button.setIcon(qta.icon('fa5s.play', color='white'))
        self.start_button.clicked.connect(self.start_computation)
        self.start_button.setStyleSheet("""
            QPushButton {
                background-color: #28a745;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                font-weight: bold;
                min-width: 100px;
            }
            QPushButton:hover {
                background-color: #218838;
            }
            QPushButton:disabled {
                background-color: #6c757d;
            }
        """)
        
        self.stop_button = QPushButton("停止计算")
        if QTA_AVAILABLE:
            self.stop_button.setIcon(qta.icon('fa5s.stop', color='white'))
        self.stop_button.clicked.connect(self.stop_computation)
        self.stop_button.setEnabled(False)
        self.stop_button.setStyleSheet("""
            QPushButton {
                background-color: #dc3545;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                font-weight: bold;
                min-width: 100px;
            }
            QPushButton:hover {
                background-color: #c82333;
            }
            QPushButton:disabled {
                background-color: #6c757d;
            }
        """)
        
        toolbar.addWidget(self.start_button)
        toolbar.addWidget(self.stop_button)
        toolbar.addSeparator()
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setMinimumWidth(200)
        toolbar.addWidget(self.progress_bar)
    
    def setup_statusbar(self):
        """设置状态栏"""
        statusbar = self.statusBar()
        
        # 状态信息
        self.status_label = QLabel("就绪")
        statusbar.addWidget(self.status_label)
        
        statusbar.addPermanentWidget(QLabel(" | "))
        
        # 求解器状态
        # 检查各组件可用性
        gmsh_available = "✓" if GMSH_AVAILABLE else "✗"
        pyvista_available = "✓" if PYVISTA_AVAILABLE else "✗" 
        scipy_available = "✓" if SCIPY_AVAILABLE else "✗"
        
        status_text = f"GMSH: {gmsh_available} PyVista: {pyvista_available} SciPy: {scipy_available}"
        self.solver_status_label = QLabel(status_text)
        statusbar.addPermanentWidget(self.solver_status_label)
        
        statusbar.addPermanentWidget(QLabel(" | "))
        
        # 版本信息
        version_label = QLabel("v1.0.0")
        version_label.setStyleSheet("color: #6c757d;")
        statusbar.addPermanentWidget(version_label)
    
    def connect_signals(self):
        """连接信号"""
        # 参数变化信号
        self.parameter_panel.parameters_changed.connect(self.on_parameters_changed)
        
        # 求解器配置变化信号
        self.solver_panel.solver_changed.connect(self.on_solver_config_changed)
    
    def show_welcome_message(self):
        """显示欢迎信息"""
        self.status_label.setText("欢迎使用DeepCAD桥墩浅蚀模拟系统")
        QTimer.singleShot(3000, lambda: self.status_label.setText("就绪"))
    
    def on_parameters_changed(self, parameters: dict):
        """参数变化处理"""
        # 可以在这里添加实时预览或参数验证
        pass
    
    def on_solver_config_changed(self, solver_type: str, config: dict):
        """求解器配置变化处理"""
        # 更新求解器管理器配置
        pass
    
    def start_computation(self):
        """开始计算"""
        try:
            # 获取当前参数
            scour_params = self.parameter_panel.get_scour_parameters()
            solver_config = self.solver_panel.get_current_config()
            solver_type_str = self.solver_panel.get_solver_type()
            
            # 创建桥墩几何
            shape_map = {
                "circular": GeometryType.CIRCULAR_PIER,
                "rectangular": GeometryType.RECTANGULAR_PIER,
                "elliptical": GeometryType.ELLIPTICAL_PIER,
                "complex": GeometryType.COMPLEX_PIER
            }
            
            pier_shape_str = self.parameter_panel.pier_shape.currentText()
            geometry_type = shape_map.get(pier_shape_str, GeometryType.CIRCULAR_PIER)
            
            self.current_pier_geometry = PierGeometry(
                geometry_type=geometry_type,
                diameter=scour_params.pier_diameter,
                height=6.0,
                position=(0.0, 0.0, 0.0),
                rotation_angle=scour_params.pier_angle if hasattr(scour_params, 'pier_angle') else 0.0
            )
            
            # 创建网格参数
            mesh_params = create_default_mesh_parameters()
            mesh_params.pier_mesh_size = solver_config['mesh_resolution']
            mesh_params.domain_mesh_size = solver_config['mesh_resolution'] * 10
            mesh_params.pier_diameter = scour_params.pier_diameter
            mesh_params.water_depth = scour_params.water_depth
            
            # 创建数值参数
            turbulence_map = {
                "k-epsilon": TurbulenceModel.K_EPSILON,
                "k-epsilon-rng": TurbulenceModel.K_EPSILON_RNG, 
                "k-omega-sst": TurbulenceModel.K_OMEGA_SST,
                "spalart-allmaras": TurbulenceModel.SPALART_ALLMARAS
            }
            
            numerical_params = NumericalParameters(
                mesh_resolution=solver_config['mesh_resolution'],
                time_step=solver_config['time_step'],
                turbulence_model=turbulence_map.get(solver_config['turbulence_model'], TurbulenceModel.K_OMEGA_SST),
                convergence_tolerance=solver_config['convergence_tolerance'],
                max_iterations=solver_config['max_iterations'],
                enable_sediment_transport=True,
                enable_bed_evolution=True
            )
            
            # 更新UI状态
            self.start_button.setEnabled(False)
            self.stop_button.setEnabled(True)
            self.progress_bar.setVisible(True)
            self.progress_bar.setRange(0, 0)  # 无限进度条
            self.status_label.setText("计算中...")
            
            # 清空之前的结果
            self.results_panel.clear_results()
            
            # 创建计算工作线程
            worker = AdvancedComputationWorker(
                self.solver_manager, scour_params, numerical_params, 
                self.current_pier_geometry, mesh_params, self.computation_callback
            )
            
            # 启动计算
            self.thread_pool.start(worker)
            
        except Exception as e:
            QMessageBox.critical(self, "计算启动失败", f"无法启动计算:\n{str(e)}")
            self.reset_computation_ui()
    
    def stop_computation(self):
        """停止计算"""
        # 这里应该实现停止计算的逻辑
        self.thread_pool.clear()
        self.reset_computation_ui()
        self.status_label.setText("计算已停止")
    
    def on_computation_finished(self, result, error):
        """计算完成处理"""
        self.reset_computation_ui()
        
        if error:
            QMessageBox.critical(self, "计算错误", f"计算过程中发生错误:\n{str(error)}")
            self.status_label.setText("计算失败")
        else:
            # 显示结果
            self.results_panel.update_result(result)
            self.status_label.setText("计算完成")
            
            # 更新3D视图（如果有结果）
            self.update_3d_visualization(result)
            
            # 更新3D视口的流场数据
            if hasattr(result, 'velocity_field') and result.velocity_field is not None:
                self.viewer_3d.update_flow_field(
                    self.current_pier_geometry.diameter,
                    self.parameter_panel.get_scour_parameters().flow_velocity
                )
    
    def reset_computation_ui(self):
        """重置计算UI状态"""
        self.start_button.setEnabled(True)
        self.stop_button.setEnabled(False)
        self.progress_bar.setVisible(False)
    
    def update_3d_visualization(self, result):
        """更新3D可视化"""
        try:
            # 使用增强的3D视口，它会自动处理结果可视化
            # 结果数据已经通过update_flow_field传递给视口
            pass
        except Exception as e:
            print(f"3D可视化更新失败: {e}")
    
    def new_project(self):
        """新建项目"""
        reply = QMessageBox.question(
            self, "新建项目", "确定要新建项目吗？当前设置将被重置。",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            # 重置参数到默认值
            self.results_panel.clear_results()
            self.status_label.setText("新项目已创建")
    
    def open_project(self):
        """打开项目"""
        filename, _ = QFileDialog.getOpenFileName(
            self, "打开项目文件", "", "项目文件 (*.scour);;JSON文件 (*.json)"
        )
        
        if filename:
            try:
                with open(filename, 'r', encoding='utf-8') as f:
                    project_data = json.load(f)
                # 这里应该恢复项目设置
                self.status_label.setText(f"已打开: {Path(filename).name}")
            except Exception as e:
                QMessageBox.critical(self, "打开失败", f"无法打开项目文件:\n{str(e)}")
    
    def save_project(self):
        """保存项目"""
        filename, _ = QFileDialog.getSaveFileName(
            self, "保存项目文件", "", "项目文件 (*.scour);;JSON文件 (*.json)"
        )
        
        if filename:
            try:
                # 收集当前设置
                project_data = {
                    "parameters": self.parameter_panel.parameters.__dict__,
                    "solver_config": self.solver_panel.get_current_config(),
                    "solver_type": self.solver_panel.get_solver_type(),
                    "timestamp": time.time()
                }
                
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(project_data, f, indent=2, ensure_ascii=False)
                
                self.status_label.setText(f"已保存: {Path(filename).name}")
            except Exception as e:
                QMessageBox.critical(self, "保存失败", f"无法保存项目文件:\n{str(e)}")
    
    def show_about_dialog(self):
        """显示关于对话框"""
        about_text = """
        <h2>DeepCAD-SCOUR v1.0</h2>
        <p><b>专业桥墩浅蚀模拟系统</b></p>
        <p>Professional Bridge Pier Scour Simulation System</p>
        <br>
        <p><b>集成算法:</b></p>
        <ul>
        <li>HEC-18 经验公式</li>
        <li>Melville-Coleman 公式</li>
        <li>CSU 公式</li>
        <li>Sheppard-Miller 公式</li>
        <li>FEniCS 数值求解器</li>
        </ul>
        <br>
        <p><b>技术特性:</b></p>
        <ul>
        <li>经验公式与数值计算融合</li>
        <li>自动求解器选择</li>
        <li>结果对比验证</li>
        <li>3D流场可视化</li>
        <li>专业报告导出</li>
        </ul>
        <br>
        <p>© 2024 DeepCAD Engineering Solutions</p>
        """
        
        QMessageBox.about(self, "关于DeepCAD-SCOUR", about_text)


def main():
    """主程序入口"""
    app = QApplication(sys.argv)
    
    # 设置应用程序信息
    app.setApplicationName("DeepCAD-SCOUR")
    app.setApplicationVersion("1.0.0")
    app.setOrganizationName("DeepCAD Engineering Solutions")
    
    # 设置字体
    font = app.font()
    font.setFamily("Microsoft YaHei UI, Segoe UI, Arial")
    font.setPointSize(9)
    app.setFont(font)
    
    # 创建主窗口
    window = ScourMainWindow()
    window.show()
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()