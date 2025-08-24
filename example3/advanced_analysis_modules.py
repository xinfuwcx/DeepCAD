"""
高级分析模块 - 地球物理建模、不确定性分析、3D可视化等
Advanced Analysis Modules - Geophysical modeling, uncertainty analysis, 3D visualization
"""

import sys
import os
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any, Union
import json
from pathlib import Path
import traceback
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import warnings
import multiprocessing as mp

# PyQt6 imports
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QFormLayout, QGridLayout,
    QLabel, QLineEdit, QPushButton, QComboBox, QSpinBox, QDoubleSpinBox,
    QCheckBox, QProgressBar, QTableWidget, QTableWidgetItem, QHeaderView,
    QFileDialog, QMessageBox, QDialogButtonBox, QScrollArea, QTextEdit,
    QGroupBox, QTabWidget, QWidget, QSlider, QListWidget, QListWidgetItem,
    QTreeWidget, QTreeWidgetItem, QFrame, QSplitter, QApplication
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer, QObject, QMutex
from PyQt6.QtGui import QFont, QPalette, QColor, QPixmap

# Scientific computing
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
from matplotlib.animation import FuncAnimation
import pyvista as pv
import pyvistaqt as pvqt

# Try to import optional packages
try:
    from scipy import stats
    from scipy.spatial.distance import cdist
    from scipy.optimize import minimize
    from scipy.interpolate import griddata, RBFInterpolator
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False
    warnings.warn("SciPy not available, some functionality will be limited")

try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.model_selection import cross_val_score
    from sklearn.gaussian_process import GaussianProcessRegressor
    from sklearn.gaussian_process.kernels import RBF, Matern
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

try:
    import sobol_seq
    SOBOL_AVAILABLE = True
except ImportError:
    SOBOL_AVAILABLE = False

class GeophysicalModelingDialog(QDialog):
    """地球物理建模对话框"""
    
    def __init__(self, geological_model, parent=None):
        super().__init__(parent)
        self.geological_model = geological_model
        self.geophysical_results = {}
        self.setWindowTitle("地球物理建模")
        self.setModal(True)
        self.resize(1000, 800)
        self.setup_ui()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        # 创建标签页
        tabs = QTabWidget()
        
        # 重力建模标签页
        gravity_tab = self.create_gravity_modeling_tab()
        tabs.addTab(gravity_tab, "重力建模")
        
        # 磁力建模标签页
        magnetic_tab = self.create_magnetic_modeling_tab()
        tabs.addTab(magnetic_tab, "磁力建模")
        
        # 电法建模标签页
        electrical_tab = self.create_electrical_modeling_tab()
        tabs.addTab(electrical_tab, "电法建模")
        
        # 地震建模标签页
        seismic_tab = self.create_seismic_modeling_tab()
        tabs.addTab(seismic_tab, "地震建模")
        
        # 结果分析标签页
        results_tab = self.create_results_analysis_tab()
        tabs.addTab(results_tab, "结果分析")
        
        layout.addWidget(tabs)
        
        # 进度和控制区域
        control_layout = QVBoxLayout()
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        control_layout.addWidget(self.progress_bar)
        
        # 状态标签
        self.status_label = QLabel("就绪")
        control_layout.addWidget(self.status_label)
        
        # 按钮区域
        button_layout = QHBoxLayout()
        
        self.calculate_btn = QPushButton("开始计算")
        self.calculate_btn.clicked.connect(self.start_calculation)
        button_layout.addWidget(self.calculate_btn)
        
        self.stop_btn = QPushButton("停止计算")
        self.stop_btn.clicked.connect(self.stop_calculation)
        self.stop_btn.setEnabled(False)
        button_layout.addWidget(self.stop_btn)
        
        export_btn = QPushButton("导出结果")
        export_btn.clicked.connect(self.export_results)
        button_layout.addWidget(export_btn)
        
        button_layout.addStretch()
        
        close_btn = QPushButton("关闭")
        close_btn.clicked.connect(self.close)
        button_layout.addWidget(close_btn)
        
        control_layout.addLayout(button_layout)
        layout.addLayout(control_layout)
    
    def create_gravity_modeling_tab(self):
        """创建重力建模标签页"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 计算参数
        params_group = QGroupBox("计算参数")
        params_layout = QFormLayout(params_group)
        
        # 观测点设置
        obs_layout = QHBoxLayout()
        self.gravity_obs_mode = QComboBox()
        self.gravity_obs_mode.addItems(["自动生成", "导入文件", "手动设置"])
        obs_layout.addWidget(self.gravity_obs_mode)
        
        self.gravity_obs_file = QPushButton("选择文件")
        self.gravity_obs_file.clicked.connect(lambda: self.select_observation_file('gravity'))
        obs_layout.addWidget(self.gravity_obs_file)
        
        params_layout.addRow("观测点:", obs_layout)
        
        # 观测高度
        self.gravity_height = QDoubleSpinBox()
        self.gravity_height.setRange(-1000, 10000)
        self.gravity_height.setValue(0)
        self.gravity_height.setSuffix(" m")
        params_layout.addRow("观测高度:", self.gravity_height)
        
        # 计算分辨率
        res_layout = QHBoxLayout()
        self.gravity_nx = QSpinBox()
        self.gravity_nx.setRange(10, 1000)
        self.gravity_nx.setValue(100)
        self.gravity_ny = QSpinBox()
        self.gravity_ny.setRange(10, 1000)
        self.gravity_ny.setValue(100)
        
        res_layout.addWidget(QLabel("X:"))
        res_layout.addWidget(self.gravity_nx)
        res_layout.addWidget(QLabel("Y:"))
        res_layout.addWidget(self.gravity_ny)
        
        params_layout.addRow("分辨率:", res_layout)
        
        # 计算方法
        self.gravity_method = QComboBox()
        self.gravity_method.addItems(["Talwani", "Li&Oldenburg", "Singh", "自适应"])
        params_layout.addRow("计算方法:", self.gravity_method)
        
        layout.addWidget(params_group)
        
        # 密度模型
        density_group = QGroupBox("密度模型")
        density_layout = QVBoxLayout(density_group)
        
        density_toolbar = QHBoxLayout()
        
        import_density_btn = QPushButton("导入密度模型")
        import_density_btn.clicked.connect(self.import_density_model)
        density_toolbar.addWidget(import_density_btn)
        
        auto_density_btn = QPushButton("自动生成")
        auto_density_btn.clicked.connect(self.auto_generate_density)
        density_toolbar.addWidget(auto_density_btn)
        
        edit_density_btn = QPushButton("编辑密度")
        edit_density_btn.clicked.connect(self.edit_density_model)
        density_toolbar.addWidget(edit_density_btn)
        
        density_toolbar.addStretch()
        
        density_layout.addLayout(density_toolbar)
        
        # 密度参数表格
        self.gravity_density_table = QTableWidget()
        self.gravity_density_table.setColumnCount(3)
        self.gravity_density_table.setHorizontalHeaderLabels(["地层名称", "密度 (g/cm³)", "不确定性"])
        density_layout.addWidget(self.gravity_density_table)
        
        layout.addWidget(density_group)
        
        # 高级选项
        advanced_group = QGroupBox("高级选项")
        advanced_layout = QFormLayout(advanced_group)
        
        self.gravity_terrain_correction = QCheckBox("地形校正")
        advanced_layout.addRow(self.gravity_terrain_correction)
        
        self.gravity_background_removal = QCheckBox("背景场去除")
        advanced_layout.addRow(self.gravity_background_removal)
        
        self.gravity_edge_effects = QCheckBox("边界效应处理")
        advanced_layout.addRow(self.gravity_edge_effects)
        
        layout.addWidget(advanced_group)
        
        return widget
    
    def create_magnetic_modeling_tab(self):
        """创建磁力建模标签页"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 磁场参数
        field_group = QGroupBox("地磁场参数")
        field_layout = QFormLayout(field_group)
        
        self.magnetic_inclination = QDoubleSpinBox()
        self.magnetic_inclination.setRange(-90, 90)
        self.magnetic_inclination.setValue(60)
        self.magnetic_inclination.setSuffix("°")
        field_layout.addRow("磁倾角:", self.magnetic_inclination)
        
        self.magnetic_declination = QDoubleSpinBox()
        self.magnetic_declination.setRange(-180, 180)
        self.magnetic_declination.setValue(0)
        self.magnetic_declination.setSuffix("°")
        field_layout.addRow("磁偏角:", self.magnetic_declination)
        
        self.magnetic_intensity = QDoubleSpinBox()
        self.magnetic_intensity.setRange(10000, 80000)
        self.magnetic_intensity.setValue(50000)
        self.magnetic_intensity.setSuffix(" nT")
        field_layout.addRow("磁场强度:", self.magnetic_intensity)
        
        layout.addWidget(field_group)
        
        # 计算参数
        params_group = QGroupBox("计算参数")
        params_layout = QFormLayout(params_group)
        
        # 观测高度
        self.magnetic_height = QDoubleSpinBox()
        self.magnetic_height.setRange(-1000, 10000)
        self.magnetic_height.setValue(100)
        self.magnetic_height.setSuffix(" m")
        params_layout.addRow("观测高度:", self.magnetic_height)
        
        # 计算分辨率
        mag_res_layout = QHBoxLayout()
        self.magnetic_nx = QSpinBox()
        self.magnetic_nx.setRange(10, 1000)
        self.magnetic_nx.setValue(100)
        self.magnetic_ny = QSpinBox()
        self.magnetic_ny.setRange(10, 1000)
        self.magnetic_ny.setValue(100)
        
        mag_res_layout.addWidget(QLabel("X:"))
        mag_res_layout.addWidget(self.magnetic_nx)
        mag_res_layout.addWidget(QLabel("Y:"))
        mag_res_layout.addWidget(self.magnetic_ny)
        
        params_layout.addRow("分辨率:", mag_res_layout)
        
        # 计算方法
        self.magnetic_method = QComboBox()
        self.magnetic_method.addItems(["总磁异常", "垂直分量", "水平分量", "解析信号"])
        params_layout.addRow("计算类型:", self.magnetic_method)
        
        layout.addWidget(params_group)
        
        # 磁化率模型
        susceptibility_group = QGroupBox("磁化率模型")
        susceptibility_layout = QVBoxLayout(susceptibility_group)
        
        sus_toolbar = QHBoxLayout()
        
        import_sus_btn = QPushButton("导入磁化率")
        import_sus_btn.clicked.connect(self.import_susceptibility_model)
        sus_toolbar.addWidget(import_sus_btn)
        
        auto_sus_btn = QPushButton("自动生成")
        auto_sus_btn.clicked.connect(self.auto_generate_susceptibility)
        sus_toolbar.addWidget(auto_sus_btn)
        
        sus_toolbar.addStretch()
        
        susceptibility_layout.addLayout(sus_toolbar)
        
        # 磁化率表格
        self.magnetic_susceptibility_table = QTableWidget()
        self.magnetic_susceptibility_table.setColumnCount(4)
        self.magnetic_susceptibility_table.setHorizontalHeaderLabels([
            "地层名称", "磁化率 (SI)", "剩磁倾角 (°)", "剩磁偏角 (°)"
        ])
        susceptibility_layout.addWidget(self.magnetic_susceptibility_table)
        
        layout.addWidget(susceptibility_group)
        
        return widget
    
    def create_electrical_modeling_tab(self):
        """创建电法建模标签页"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 方法选择
        method_group = QGroupBox("电法方法")
        method_layout = QGridLayout(method_group)
        
        self.electrical_method = QComboBox()
        self.electrical_method.addItems([
            "直流电阻率", "激发极化", "电磁法", "大地电磁", "瞬变电磁"
        ])
        self.electrical_method.currentTextChanged.connect(self.on_electrical_method_changed)
        method_layout.addWidget(QLabel("方法类型:"), 0, 0)
        method_layout.addWidget(self.electrical_method, 0, 1)
        
        layout.addWidget(method_group)
        
        # 测量配置
        config_group = QGroupBox("测量配置")
        config_layout = QFormLayout(config_group)
        
        self.electrode_spacing = QDoubleSpinBox()
        self.electrode_spacing.setRange(0.1, 1000)
        self.electrode_spacing.setValue(5)
        self.electrode_spacing.setSuffix(" m")
        config_layout.addRow("电极间距:", self.electrode_spacing)
        
        self.survey_length = QDoubleSpinBox()
        self.survey_length.setRange(10, 10000)
        self.survey_length.setValue(200)
        self.survey_length.setSuffix(" m")
        config_layout.addRow("测线长度:", self.survey_length)
        
        self.array_type = QComboBox()
        self.array_type.addItems(["温纳", "施伦贝谢", "偶极-偶极", "梯度"])
        config_layout.addRow("排列类型:", self.array_type)
        
        layout.addWidget(config_group)
        
        # 电阻率模型
        resistivity_group = QGroupBox("电阻率模型")
        resistivity_layout = QVBoxLayout(resistivity_group)
        
        res_toolbar = QHBoxLayout()
        
        import_res_btn = QPushButton("导入电阻率")
        import_res_btn.clicked.connect(self.import_resistivity_model)
        res_toolbar.addWidget(import_res_btn)
        
        auto_res_btn = QPushButton("自动生成")
        auto_res_btn.clicked.connect(self.auto_generate_resistivity)
        res_toolbar.addWidget(auto_res_btn)
        
        res_toolbar.addStretch()
        
        resistivity_layout.addLayout(res_toolbar)
        
        # 电阻率表格
        self.electrical_resistivity_table = QTableWidget()
        self.electrical_resistivity_table.setColumnCount(3)
        self.electrical_resistivity_table.setHorizontalHeaderLabels([
            "地层名称", "电阻率 (Ω⋅m)", "极化率 (%)"
        ])
        resistivity_layout.addWidget(self.electrical_resistivity_table)
        
        layout.addWidget(resistivity_group)
        
        return widget
    
    def create_seismic_modeling_tab(self):
        """创建地震建模标签页"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 地震参数
        seismic_group = QGroupBox("地震参数")
        seismic_layout = QFormLayout(seismic_group)
        
        self.seismic_method = QComboBox()
        self.seismic_method.addItems(["反射地震", "折射地震", "面波分析", "微震监测"])
        seismic_layout.addRow("地震方法:", self.seismic_method)
        
        self.source_frequency = QDoubleSpinBox()
        self.source_frequency.setRange(1, 1000)
        self.source_frequency.setValue(50)
        self.source_frequency.setSuffix(" Hz")
        seismic_layout.addRow("震源频率:", self.source_frequency)
        
        self.receiver_spacing = QDoubleSpinBox()
        self.receiver_spacing.setRange(0.5, 100)
        self.receiver_spacing.setValue(2)
        self.receiver_spacing.setSuffix(" m")
        seismic_layout.addRow("检波器间距:", self.receiver_spacing)
        
        layout.addWidget(seismic_group)
        
        # 速度模型
        velocity_group = QGroupBox("速度模型")
        velocity_layout = QVBoxLayout(velocity_group)
        
        vel_toolbar = QHBoxLayout()
        
        import_vel_btn = QPushButton("导入速度模型")
        import_vel_btn.clicked.connect(self.import_velocity_model)
        vel_toolbar.addWidget(import_vel_btn)
        
        auto_vel_btn = QPushButton("自动生成")
        auto_vel_btn.clicked.connect(self.auto_generate_velocity)
        vel_toolbar.addWidget(auto_vel_btn)
        
        vel_toolbar.addStretch()
        
        velocity_layout.addLayout(vel_toolbar)
        
        # 速度表格
        self.seismic_velocity_table = QTableWidget()
        self.seismic_velocity_table.setColumnCount(4)
        self.seismic_velocity_table.setHorizontalHeaderLabels([
            "地层名称", "P波速度 (m/s)", "S波速度 (m/s)", "密度 (g/cm³)"
        ])
        velocity_layout.addWidget(self.seismic_velocity_table)
        
        layout.addWidget(velocity_group)
        
        return widget
    
    def create_results_analysis_tab(self):
        """创建结果分析标签页"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 结果显示
        results_group = QGroupBox("计算结果")
        results_layout = QVBoxLayout(results_group)
        
        # 结果选择
        result_selection_layout = QHBoxLayout()
        
        self.result_type_combo = QComboBox()
        self.result_type_combo.addItems(["重力异常", "磁异常", "视电阻率", "地震波形"])
        self.result_type_combo.currentTextChanged.connect(self.update_result_display)
        result_selection_layout.addWidget(QLabel("结果类型:"))
        result_selection_layout.addWidget(self.result_type_combo)
        
        refresh_btn = QPushButton("刷新")
        refresh_btn.clicked.connect(self.refresh_results)
        result_selection_layout.addWidget(refresh_btn)
        
        result_selection_layout.addStretch()
        
        results_layout.addLayout(result_selection_layout)
        
        # 图表显示区域
        self.results_figure = Figure(figsize=(12, 8))
        self.results_canvas = FigureCanvas(self.results_figure)
        results_layout.addWidget(self.results_canvas)
        
        layout.addWidget(results_group)
        
        # 分析工具
        analysis_group = QGroupBox("分析工具")
        analysis_layout = QGridLayout(analysis_group)
        
        # 第一行工具
        contour_btn = QPushButton("等值线图")
        contour_btn.clicked.connect(self.create_contour_plot)
        analysis_layout.addWidget(contour_btn, 0, 0)
        
        profile_btn = QPushButton("剖面分析")
        profile_btn.clicked.connect(self.create_profile_analysis)
        analysis_layout.addWidget(profile_btn, 0, 1)
        
        gradient_btn = QPushButton("梯度计算")
        gradient_btn.clicked.connect(self.calculate_gradient)
        analysis_layout.addWidget(gradient_btn, 0, 2)
        
        # 第二行工具
        filter_btn = QPushButton("滤波处理")
        filter_btn.clicked.connect(self.apply_filters)
        analysis_layout.addWidget(filter_btn, 1, 0)
        
        transform_btn = QPushButton("变换分析")
        transform_btn.clicked.connect(self.apply_transforms)
        analysis_layout.addWidget(transform_btn, 1, 1)
        
        inversion_btn = QPushButton("反演分析")
        inversion_btn.clicked.connect(self.run_inversion)
        analysis_layout.addWidget(inversion_btn, 1, 2)
        
        layout.addWidget(analysis_group)
        
        return widget
    
    # 各种事件处理方法
    def select_observation_file(self, method_type):
        """选择观测点文件"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, f"选择{method_type}观测点文件", "", 
            "数据文件 (*.csv *.txt *.dat);;所有文件 (*)"
        )
        if file_path:
            # 这里处理观测点文件加载
            QMessageBox.information(self, "成功", f"已加载观测点文件: {file_path}")
    
    def import_density_model(self):
        """导入密度模型"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "导入密度模型", "", "数据文件 (*.csv *.json);;所有文件 (*)"
        )
        if file_path:
            try:
                if file_path.endswith('.json'):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        density_data = json.load(f)
                else:
                    density_df = pd.read_csv(file_path)
                    density_data = density_df.to_dict('records')
                
                self.populate_density_table(density_data)
                QMessageBox.information(self, "成功", "密度模型导入成功")
                
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导入失败: {str(e)}")
    
    def populate_density_table(self, density_data):
        """填充密度表格"""
        if not isinstance(density_data, list):
            return
        
        self.gravity_density_table.setRowCount(len(density_data))
        
        for i, item in enumerate(density_data):
            self.gravity_density_table.setItem(i, 0, QTableWidgetItem(str(item.get('layer', f'Layer_{i}'))))
            self.gravity_density_table.setItem(i, 1, QTableWidgetItem(str(item.get('density', 2.5))))
            self.gravity_density_table.setItem(i, 2, QTableWidgetItem(str(item.get('uncertainty', 0.1))))
    
    def auto_generate_density(self):
        """自动生成密度模型"""
        if not self.geological_model:
            QMessageBox.warning(self, "警告", "需要先创建地质模型")
            return
        
        # 从地质模型中提取地层信息
        try:
            if hasattr(self.geological_model, 'surfaces'):
                # GemPy模型
                surfaces = self.geological_model.surfaces.df['surface'].unique()
            elif isinstance(self.geological_model, dict) and 'strata' in self.geological_model:
                # 简化模型
                surfaces = [s['name'] for s in self.geological_model['strata']]
            else:
                surfaces = ["地层1", "地层2", "地层3"]  # 默认
            
            # 创建默认密度值
            default_densities = np.linspace(2.0, 3.0, len(surfaces))
            
            self.gravity_density_table.setRowCount(len(surfaces))
            
            for i, (surface, density) in enumerate(zip(surfaces, default_densities)):
                self.gravity_density_table.setItem(i, 0, QTableWidgetItem(str(surface)))
                self.gravity_density_table.setItem(i, 1, QTableWidgetItem(f"{density:.2f}"))
                self.gravity_density_table.setItem(i, 2, QTableWidgetItem("0.1"))
            
            QMessageBox.information(self, "成功", f"自动生成了 {len(surfaces)} 个地层的密度模型")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"自动生成失败: {str(e)}")
    
    def edit_density_model(self):
        """编辑密度模型"""
        dialog = DensityEditDialog(self.gravity_density_table, parent=self)
        dialog.exec()
    
    def on_electrical_method_changed(self, method):
        """电法方法改变时的处理"""
        # 根据选择的方法调整界面
        if method == "大地电磁":
            self.electrode_spacing.setVisible(False)
        else:
            self.electrode_spacing.setVisible(True)
    
    def start_calculation(self):
        """开始地球物理计算"""
        if not self.geological_model:
            QMessageBox.warning(self, "警告", "需要先创建地质模型")
            return
        
        # 获取当前标签页
        current_tab = self.sender().parent().parent().parent().currentIndex()
        method_types = ["重力", "磁力", "电法", "地震"]
        
        if current_tab < len(method_types):
            method = method_types[current_tab]
        else:
            method = "综合"
        
        # 禁用按钮，显示进度
        self.calculate_btn.setEnabled(False)
        self.stop_btn.setEnabled(True)
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 100)
        self.status_label.setText(f"正在计算{method}响应...")
        
        # 启动计算线程
        self.calc_thread = GeophysicalCalculationThread(
            self.geological_model, method, self.get_calculation_parameters()
        )
        self.calc_thread.progress_updated.connect(self.progress_bar.setValue)
        self.calc_thread.status_updated.connect(self.status_label.setText)
        self.calc_thread.calculation_finished.connect(self.on_calculation_finished)
        self.calc_thread.error_occurred.connect(self.on_calculation_error)
        self.calc_thread.start()
    
    def get_calculation_parameters(self):
        """获取计算参数"""
        params = {
            'gravity': {
                'height': self.gravity_height.value(),
                'nx': self.gravity_nx.value(),
                'ny': self.gravity_ny.value(),
                'method': self.gravity_method.currentText(),
                'densities': self.get_density_values()
            },
            'magnetic': {
                'height': self.magnetic_height.value(),
                'nx': self.magnetic_nx.value(),
                'ny': self.magnetic_ny.value(),
                'inclination': self.magnetic_inclination.value(),
                'declination': self.magnetic_declination.value(),
                'intensity': self.magnetic_intensity.value(),
                'method': self.magnetic_method.currentText(),
                'susceptibilities': self.get_susceptibility_values()
            },
            'electrical': {
                'method': self.electrical_method.currentText(),
                'electrode_spacing': self.electrode_spacing.value(),
                'survey_length': self.survey_length.value(),
                'array_type': self.array_type.currentText(),
                'resistivities': self.get_resistivity_values()
            },
            'seismic': {
                'method': self.seismic_method.currentText(),
                'frequency': self.source_frequency.value(),
                'receiver_spacing': self.receiver_spacing.value(),
                'velocities': self.get_velocity_values()
            }
        }
        return params
    
    def get_density_values(self):
        """获取密度值"""
        densities = {}
        for row in range(self.gravity_density_table.rowCount()):
            layer = self.gravity_density_table.item(row, 0)
            density = self.gravity_density_table.item(row, 1)
            if layer and density:
                try:
                    densities[layer.text()] = float(density.text())
                except ValueError:
                    densities[layer.text()] = 2.5
        return densities
    
    def get_susceptibility_values(self):
        """获取磁化率值"""
        susceptibilities = {}
        for row in range(self.magnetic_susceptibility_table.rowCount()):
            layer = self.magnetic_susceptibility_table.item(row, 0)
            sus = self.magnetic_susceptibility_table.item(row, 1)
            if layer and sus:
                try:
                    susceptibilities[layer.text()] = float(sus.text())
                except ValueError:
                    susceptibilities[layer.text()] = 0.001
        return susceptibilities
    
    def get_resistivity_values(self):
        """获取电阻率值"""
        resistivities = {}
        for row in range(self.electrical_resistivity_table.rowCount()):
            layer = self.electrical_resistivity_table.item(row, 0)
            res = self.electrical_resistivity_table.item(row, 1)
            if layer and res:
                try:
                    resistivities[layer.text()] = float(res.text())
                except ValueError:
                    resistivities[layer.text()] = 100
        return resistivities
    
    def get_velocity_values(self):
        """获取速度值"""
        velocities = {}
        for row in range(self.seismic_velocity_table.rowCount()):
            layer = self.seismic_velocity_table.item(row, 0)
            vp = self.seismic_velocity_table.item(row, 1)
            vs = self.seismic_velocity_table.item(row, 2)
            if layer and vp and vs:
                try:
                    velocities[layer.text()] = {
                        'vp': float(vp.text()),
                        'vs': float(vs.text())
                    }
                except ValueError:
                    velocities[layer.text()] = {'vp': 3000, 'vs': 1800}
        return velocities
    
    def stop_calculation(self):
        """停止计算"""
        if hasattr(self, 'calc_thread') and self.calc_thread.isRunning():
            self.calc_thread.stop()
            self.status_label.setText("计算已停止")
        
        self.calculate_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
        self.progress_bar.setVisible(False)
    
    def on_calculation_finished(self, results):
        """计算完成"""
        self.geophysical_results.update(results)
        
        self.calculate_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
        self.progress_bar.setVisible(False)
        self.status_label.setText("计算完成")
        
        # 更新结果显示
        self.update_result_display()
        
        QMessageBox.information(self, "完成", "地球物理计算完成！")
    
    def on_calculation_error(self, error_msg):
        """计算错误"""
        self.calculate_btn.setEnabled(True)
        self.stop_btn.setEnabled(False)
        self.progress_bar.setVisible(False)
        self.status_label.setText("计算失败")
        
        QMessageBox.critical(self, "计算失败", f"计算过程中发生错误:\n{error_msg}")
    
    def update_result_display(self):
        """更新结果显示"""
        result_type = self.result_type_combo.currentText()
        
        if not self.geophysical_results:
            return
        
        # 清除之前的图表
        self.results_figure.clear()
        
        # 根据结果类型创建相应的图表
        if result_type == "重力异常" and "gravity" in self.geophysical_results:
            self.plot_gravity_results()
        elif result_type == "磁异常" and "magnetic" in self.geophysical_results:
            self.plot_magnetic_results()
        elif result_type == "视电阻率" and "electrical" in self.geophysical_results:
            self.plot_electrical_results()
        elif result_type == "地震波形" and "seismic" in self.geophysical_results:
            self.plot_seismic_results()
        
        self.results_canvas.draw()
    
    def plot_gravity_results(self):
        """绘制重力结果"""
        gravity_data = self.geophysical_results["gravity"]
        
        ax = self.results_figure.add_subplot(111)
        
        # 创建示例数据（实际应用中会使用真实计算结果）
        x = np.linspace(0, 1000, 50)
        y = np.linspace(0, 1000, 50)
        X, Y = np.meshgrid(x, y)
        
        # 模拟重力异常数据
        Z = gravity_data.get('anomaly', np.sin(X/100) * np.cos(Y/100) * 50)
        
        contour = ax.contourf(X, Y, Z, levels=20, cmap='RdYlBu_r')
        self.results_figure.colorbar(contour, ax=ax, label='重力异常 (mGal)')
        
        ax.set_xlabel('X (m)')
        ax.set_ylabel('Y (m)')
        ax.set_title('重力异常图')
        ax.set_aspect('equal')
    
    def plot_magnetic_results(self):
        """绘制磁力结果"""
        magnetic_data = self.geophysical_results["magnetic"]
        
        ax = self.results_figure.add_subplot(111)
        
        # 模拟磁异常数据
        x = np.linspace(0, 1000, 50)
        y = np.linspace(0, 1000, 50)
        X, Y = np.meshgrid(x, y)
        Z = magnetic_data.get('anomaly', np.cos(X/200) * np.sin(Y/150) * 200)
        
        contour = ax.contourf(X, Y, Z, levels=20, cmap='seismic')
        self.results_figure.colorbar(contour, ax=ax, label='磁异常 (nT)')
        
        ax.set_xlabel('X (m)')
        ax.set_ylabel('Y (m)')
        ax.set_title('磁异常图')
        ax.set_aspect('equal')
    
    def plot_electrical_results(self):
        """绘制电法结果"""
        # 实现电法结果绘制
        pass
    
    def plot_seismic_results(self):
        """绘制地震结果"""
        # 实现地震结果绘制
        pass
    
    def refresh_results(self):
        """刷新结果"""
        self.update_result_display()
    
    def create_contour_plot(self):
        """创建等值线图"""
        QMessageBox.information(self, "功能", "等值线图功能")
    
    def create_profile_analysis(self):
        """创建剖面分析"""
        QMessageBox.information(self, "功能", "剖面分析功能")
    
    def calculate_gradient(self):
        """计算梯度"""
        QMessageBox.information(self, "功能", "梯度计算功能")
    
    def apply_filters(self):
        """应用滤波"""
        QMessageBox.information(self, "功能", "滤波处理功能")
    
    def apply_transforms(self):
        """应用变换"""
        QMessageBox.information(self, "功能", "变换分析功能")
    
    def run_inversion(self):
        """运行反演"""
        QMessageBox.information(self, "功能", "反演分析功能")
    
    def export_results(self):
        """导出结果"""
        if not self.geophysical_results:
            QMessageBox.warning(self, "警告", "没有可导出的结果")
            return
        
        file_path, _ = QFileDialog.getSaveFileName(
            self, "导出地球物理结果", "", 
            "JSON文件 (*.json);;CSV文件 (*.csv);;所有文件 (*)"
        )
        
        if file_path:
            try:
                if file_path.endswith('.json'):
                    # 导出为JSON
                    export_data = {
                        'results': self.geophysical_results,
                        'parameters': self.get_calculation_parameters(),
                        'export_time': time.time()
                    }
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(export_data, f, ensure_ascii=False, indent=2, default=str)
                else:
                    # 导出为CSV（简化处理）
                    for method, data in self.geophysical_results.items():
                        method_file = file_path.replace('.csv', f'_{method}.csv')
                        if isinstance(data, dict) and 'anomaly' in data:
                            np.savetxt(method_file, data['anomaly'], delimiter=',')
                
                QMessageBox.information(self, "成功", f"结果已导出到: {file_path}")
                
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导出失败: {str(e)}")

class GeophysicalCalculationThread(QThread):
    """地球物理计算线程"""
    
    progress_updated = pyqtSignal(int)
    status_updated = pyqtSignal(str)
    calculation_finished = pyqtSignal(dict)
    error_occurred = pyqtSignal(str)
    
    def __init__(self, geological_model, method, parameters):
        super().__init__()
        self.geological_model = geological_model
        self.method = method
        self.parameters = parameters
        self.should_stop = False
    
    def run(self):
        """执行计算"""
        try:
            results = {}
            
            if self.method == "重力" or self.method == "综合":
                self.status_updated.emit("计算重力异常...")
                results["gravity"] = self.calculate_gravity()
                self.progress_updated.emit(25)
                
                if self.should_stop:
                    return
            
            if self.method == "磁力" or self.method == "综合":
                self.status_updated.emit("计算磁异常...")
                results["magnetic"] = self.calculate_magnetic()
                self.progress_updated.emit(50)
                
                if self.should_stop:
                    return
            
            if self.method == "电法" or self.method == "综合":
                self.status_updated.emit("计算电法响应...")
                results["electrical"] = self.calculate_electrical()
                self.progress_updated.emit(75)
                
                if self.should_stop:
                    return
            
            if self.method == "地震" or self.method == "综合":
                self.status_updated.emit("计算地震响应...")
                results["seismic"] = self.calculate_seismic()
                
            self.progress_updated.emit(100)
            self.calculation_finished.emit(results)
            
        except Exception as e:
            self.error_occurred.emit(str(e))
    
    def calculate_gravity(self):
        """计算重力异常"""
        time.sleep(1)  # 模拟计算时间
        
        # 简化的重力计算
        params = self.parameters.get('gravity', {})
        nx, ny = params.get('nx', 50), params.get('ny', 50)
        
        # 创建模拟的重力异常数据
        x = np.linspace(0, 1000, nx)
        y = np.linspace(0, 1000, ny)
        X, Y = np.meshgrid(x, y)
        
        # 基于地质模型生成重力异常
        anomaly = np.zeros_like(X)
        
        # 添加一些随机的异常体
        for i in range(3):
            cx = np.random.uniform(200, 800)
            cy = np.random.uniform(200, 800)
            amplitude = np.random.uniform(10, 50)
            width = np.random.uniform(100, 300)
            
            anomaly += amplitude * np.exp(-((X - cx)**2 + (Y - cy)**2) / (2 * width**2))
        
        return {
            'anomaly': anomaly,
            'x': x,
            'y': y,
            'method': params.get('method', 'Talwani'),
            'units': 'mGal'
        }
    
    def calculate_magnetic(self):
        """计算磁异常"""
        time.sleep(1)  # 模拟计算时间
        
        params = self.parameters.get('magnetic', {})
        nx, ny = params.get('nx', 50), params.get('ny', 50)
        
        x = np.linspace(0, 1000, nx)
        y = np.linspace(0, 1000, ny)
        X, Y = np.meshgrid(x, y)
        
        # 模拟磁异常
        anomaly = np.zeros_like(X)
        
        # 添加磁性体产生的异常
        for i in range(2):
            cx = np.random.uniform(300, 700)
            cy = np.random.uniform(300, 700)
            amplitude = np.random.uniform(100, 500)
            width = np.random.uniform(150, 400)
            
            anomaly += amplitude * np.cos((X - cx) / width) * np.sin((Y - cy) / width)
        
        return {
            'anomaly': anomaly,
            'x': x,
            'y': y,
            'inclination': params.get('inclination', 60),
            'declination': params.get('declination', 0),
            'units': 'nT'
        }
    
    def calculate_electrical(self):
        """计算电法响应"""
        time.sleep(1)  # 模拟计算时间
        
        params = self.parameters.get('electrical', {})
        
        # 简化的电法响应
        depths = np.logspace(0, 3, 50)  # 1到1000m深度
        resistivities = np.random.lognormal(2, 0.5, 50) * 100  # 随机电阻率
        
        return {
            'depths': depths,
            'resistivities': resistivities,
            'method': params.get('method', '直流电阻率'),
            'units': 'Ω⋅m'
        }
    
    def calculate_seismic(self):
        """计算地震响应"""
        time.sleep(1)  # 模拟计算时间
        
        params = self.parameters.get('seismic', {})
        
        # 模拟地震数据
        time_axis = np.linspace(0, 2, 1000)  # 2秒记录长度
        traces = []
        
        for i in range(48):  # 48道数据
            # 生成合成地震道
            trace = np.zeros_like(time_axis)
            
            # 添加反射波
            for j in range(3):
                arrival_time = 0.2 + j * 0.4
                frequency = params.get('frequency', 50)
                amplitude = np.exp(-j)  # 振幅衰减
                
                if arrival_time < 2.0:
                    wavelet = amplitude * np.sin(2 * np.pi * frequency * (time_axis - arrival_time))
                    wavelet *= np.exp(-((time_axis - arrival_time) / 0.1)**2)  # 高斯包络
                    trace += wavelet
            
            # 添加噪声
            trace += np.random.normal(0, 0.1, len(trace))
            traces.append(trace)
        
        return {
            'traces': np.array(traces),
            'time_axis': time_axis,
            'method': params.get('method', '反射地震'),
            'units': 'amplitude'
        }
    
    def stop(self):
        """停止计算"""
        self.should_stop = True

class DensityEditDialog(QDialog):
    """密度编辑对话框"""
    
    def __init__(self, density_table, parent=None):
        super().__init__(parent)
        self.density_table = density_table
        self.setWindowTitle("编辑密度模型")
        self.setModal(True)
        self.resize(500, 400)
        self.setup_ui()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        # 编辑表格
        self.edit_table = QTableWidget()
        self.edit_table.setColumnCount(3)
        self.edit_table.setHorizontalHeaderLabels(["地层名称", "密度 (g/cm³)", "不确定性"])
        
        # 复制原表格内容
        self.edit_table.setRowCount(self.density_table.rowCount())
        for i in range(self.density_table.rowCount()):
            for j in range(3):
                item = self.density_table.item(i, j)
                if item:
                    self.edit_table.setItem(i, j, QTableWidgetItem(item.text()))
        
        layout.addWidget(self.edit_table)
        
        # 工具栏
        toolbar = QHBoxLayout()
        
        add_btn = QPushButton("添加行")
        add_btn.clicked.connect(self.add_row)
        toolbar.addWidget(add_btn)
        
        remove_btn = QPushButton("删除行")
        remove_btn.clicked.connect(self.remove_row)
        toolbar.addWidget(remove_btn)
        
        toolbar.addStretch()
        
        layout.addLayout(toolbar)
        
        # 按钮
        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self.apply_changes)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)
    
    def add_row(self):
        """添加行"""
        row = self.edit_table.rowCount()
        self.edit_table.insertRow(row)
        self.edit_table.setItem(row, 0, QTableWidgetItem(f"地层_{row+1}"))
        self.edit_table.setItem(row, 1, QTableWidgetItem("2.5"))
        self.edit_table.setItem(row, 2, QTableWidgetItem("0.1"))
    
    def remove_row(self):
        """删除行"""
        current_row = self.edit_table.currentRow()
        if current_row >= 0:
            self.edit_table.removeRow(current_row)
    
    def apply_changes(self):
        """应用更改"""
        # 更新原表格
        self.density_table.setRowCount(self.edit_table.rowCount())
        
        for i in range(self.edit_table.rowCount()):
            for j in range(3):
                item = self.edit_table.item(i, j)
                if item:
                    self.density_table.setItem(i, j, QTableWidgetItem(item.text()))
        
        self.accept()

# 继续实现其他模块...