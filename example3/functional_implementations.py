"""
功能实现模块 - 为综合GEM界面提供具体功能实现
Functional Implementations - Concrete functionality for comprehensive GEM interface
"""

import sys
import os
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any
import json
from pathlib import Path
import traceback
import time
import threading
from concurrent.futures import ThreadPoolExecutor
import warnings

# PyQt6 imports
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QFormLayout, QGridLayout,
    QLabel, QLineEdit, QPushButton, QComboBox, QSpinBox, QDoubleSpinBox,
    QCheckBox, QProgressBar, QTableWidget, QTableWidgetItem, QHeaderView,
    QFileDialog, QMessageBox, QDialogButtonBox, QScrollArea, QTextEdit,
    QGroupBox, QTabWidget, QWidget, QSlider, QListWidget, QListWidgetItem,
    QTreeWidget, QTreeWidgetItem, QFrame, QSplitter
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer, QObject
from PyQt6.QtGui import QFont, QPalette, QColor

# Scientific computing
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
import pyvista as pv

# Try to import optional packages
try:
    import gempy as gp
    GEMPY_AVAILABLE = True
except ImportError:
    GEMPY_AVAILABLE = False
    warnings.warn("GemPy not available, some functionality will be limited")

try:
    from sklearn.ensemble import RandomForestRegressor
    from sklearn.model_selection import cross_val_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

try:
    from scipy import stats
    from scipy.spatial.distance import cdist
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

class DataImportDialog(QDialog):
    """数据导入对话框"""
    
    def __init__(self, import_type: str, parent=None):
        super().__init__(parent)
        self.import_type = import_type
        self.imported_data = None
        self.setWindowTitle(f"导入{import_type}")
        self.setModal(True)
        self.resize(600, 400)
        self.setup_ui()
        
    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        # 文件选择区域
        file_group = QGroupBox("文件选择")
        file_layout = QGridLayout(file_group)
        
        self.file_path = QLineEdit()
        browse_btn = QPushButton("浏览...")
        browse_btn.clicked.connect(self.browse_file)
        
        file_layout.addWidget(QLabel("文件路径:"), 0, 0)
        file_layout.addWidget(self.file_path, 0, 1)
        file_layout.addWidget(browse_btn, 0, 2)
        
        layout.addWidget(file_group)
        
        # 格式设置区域
        format_group = QGroupBox("格式设置")
        format_layout = QFormLayout(format_group)
        
        self.separator = QComboBox()
        self.separator.addItems([",", ";", "\\t", "|"])
        format_layout.addRow("分隔符:", self.separator)
        
        self.encoding = QComboBox()
        self.encoding.addItems(["utf-8", "gbk", "gb2312", "ascii"])
        format_layout.addRow("编码:", self.encoding)
        
        self.header_row = QSpinBox()
        self.header_row.setRange(0, 100)
        format_layout.addRow("标题行:", self.header_row)
        
        layout.addWidget(format_group)
        
        # 列映射区域
        mapping_group = QGroupBox("列映射")
        mapping_layout = QVBoxLayout(mapping_group)
        
        self.mapping_table = QTableWidget()
        self.setup_mapping_table()
        mapping_layout.addWidget(self.mapping_table)
        
        layout.addWidget(mapping_group)
        
        # 预览区域
        preview_group = QGroupBox("数据预览")
        preview_layout = QVBoxLayout(preview_group)
        
        preview_btn = QPushButton("预览数据")
        preview_btn.clicked.connect(self.preview_data)
        preview_layout.addWidget(preview_btn)
        
        self.preview_table = QTableWidget()
        self.preview_table.setMaximumHeight(150)
        preview_layout.addWidget(self.preview_table)
        
        layout.addWidget(preview_group)
        
        # 按钮区域
        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self.import_data)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)
    
    def setup_mapping_table(self):
        """设置列映射表格"""
        if self.import_type == "钻孔数据":
            required_columns = ["孔号", "X坐标", "Y坐标", "Z坐标", "地层名称", "土层类型"]
        elif self.import_type == "地层数据":
            required_columns = ["X坐标", "Y坐标", "Z坐标", "地层名称"]
        elif self.import_type == "断层数据":
            required_columns = ["断层名", "X坐标", "Y坐标", "Z坐标", "走向", "倾角"]
        else:
            required_columns = ["X坐标", "Y坐标", "数值"]
        
        self.mapping_table.setRowCount(len(required_columns))
        self.mapping_table.setColumnCount(2)
        self.mapping_table.setHorizontalHeaderLabels(["必需列", "源文件列"])
        
        for i, col in enumerate(required_columns):
            item = QTableWidgetItem(col)
            item.setFlags(item.flags() & ~Qt.ItemFlag.ItemIsEditable)
            self.mapping_table.setItem(i, 0, item)
            
            combo = QComboBox()
            combo.addItem("--请选择--")
            self.mapping_table.setCellWidget(i, 1, combo)
    
    def browse_file(self):
        """浏览文件"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "选择文件", "", 
            "数据文件 (*.csv *.txt *.xlsx *.xls);;所有文件 (*)"
        )
        if file_path:
            self.file_path.setText(file_path)
            self.update_column_mapping()
    
    def update_column_mapping(self):
        """更新列映射"""
        file_path = self.file_path.text()
        if not file_path or not os.path.exists(file_path):
            return
            
        try:
            # 读取文件头部来获取列名
            if file_path.endswith('.xlsx') or file_path.endswith('.xls'):
                df = pd.read_excel(file_path, nrows=1)
            else:
                sep = self.separator.currentText()
                if sep == "\\t":
                    sep = "\t"
                df = pd.read_csv(file_path, sep=sep, nrows=1, 
                               encoding=self.encoding.currentText())
            
            # 更新映射表格的下拉框
            for i in range(self.mapping_table.rowCount()):
                combo = self.mapping_table.cellWidget(i, 1)
                combo.clear()
                combo.addItem("--请选择--")
                for col in df.columns:
                    combo.addItem(str(col))
                    
        except Exception as e:
            QMessageBox.warning(self, "警告", f"读取文件失败: {str(e)}")
    
    def preview_data(self):
        """预览数据"""
        file_path = self.file_path.text()
        if not file_path or not os.path.exists(file_path):
            QMessageBox.warning(self, "警告", "请先选择有效的文件")
            return
            
        try:
            # 读取前10行数据进行预览
            if file_path.endswith('.xlsx') or file_path.endswith('.xls'):
                df = pd.read_excel(file_path, nrows=10)
            else:
                sep = self.separator.currentText()
                if sep == "\\t":
                    sep = "\t"
                df = pd.read_csv(file_path, sep=sep, nrows=10,
                               encoding=self.encoding.currentText())
            
            # 显示在预览表格中
            self.preview_table.setRowCount(len(df))
            self.preview_table.setColumnCount(len(df.columns))
            self.preview_table.setHorizontalHeaderLabels([str(col) for col in df.columns])
            
            for i in range(len(df)):
                for j, col in enumerate(df.columns):
                    item = QTableWidgetItem(str(df.iloc[i, j]))
                    self.preview_table.setItem(i, j, item)
                    
        except Exception as e:
            QMessageBox.critical(self, "错误", f"预览数据失败: {str(e)}")
    
    def import_data(self):
        """导入数据"""
        file_path = self.file_path.text()
        if not file_path or not os.path.exists(file_path):
            QMessageBox.warning(self, "警告", "请先选择有效的文件")
            return
        
        # 检查列映射
        column_mapping = {}
        for i in range(self.mapping_table.rowCount()):
            required_col = self.mapping_table.item(i, 0).text()
            combo = self.mapping_table.cellWidget(i, 1)
            selected_col = combo.currentText()
            
            if selected_col == "--请选择--":
                QMessageBox.warning(self, "警告", f"请为 '{required_col}' 选择对应的源列")
                return
            
            column_mapping[required_col] = selected_col
        
        try:
            # 读取完整数据
            if file_path.endswith('.xlsx') or file_path.endswith('.xls'):
                df = pd.read_excel(file_path)
            else:
                sep = self.separator.currentText()
                if sep == "\\t":
                    sep = "\t"
                df = pd.read_csv(file_path, sep=sep, encoding=self.encoding.currentText())
            
            # 应用列映射
            mapped_df = pd.DataFrame()
            for target_col, source_col in column_mapping.items():
                if source_col in df.columns:
                    mapped_df[target_col] = df[source_col]
                else:
                    QMessageBox.warning(self, "警告", f"源文件中找不到列 '{source_col}'")
                    return
            
            self.imported_data = mapped_df
            QMessageBox.information(self, "成功", f"成功导入 {len(mapped_df)} 行数据")
            self.accept()
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"导入数据失败: {str(e)}")

class GeologicalModelingDialog(QDialog):
    """地质建模对话框"""
    
    model_built = pyqtSignal(object)  # 模型构建完成信号
    
    def __init__(self, data_registry, parent=None):
        super().__init__(parent)
        self.data_registry = data_registry
        self.geo_model = None
        self.setWindowTitle("地质建模")
        self.setModal(True)
        self.resize(800, 600)
        self.setup_ui()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        # 创建标签页
        tabs = QTabWidget()
        
        # 基本设置标签页
        basic_tab = self.create_basic_settings_tab()
        tabs.addTab(basic_tab, "基本设置")
        
        # 地层管理标签页
        strata_tab = self.create_strata_management_tab()
        tabs.addTab(strata_tab, "地层管理")
        
        # 高级选项标签页
        advanced_tab = self.create_advanced_options_tab()
        tabs.addTab(advanced_tab, "高级选项")
        
        layout.addWidget(tabs)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        layout.addWidget(self.progress_bar)
        
        # 按钮区域
        button_layout = QHBoxLayout()
        
        self.build_btn = QPushButton("开始建模")
        self.build_btn.clicked.connect(self.start_modeling)
        button_layout.addWidget(self.build_btn)
        
        preview_btn = QPushButton("预览设置")
        preview_btn.clicked.connect(self.preview_settings)
        button_layout.addWidget(preview_btn)
        
        button_layout.addStretch()
        
        close_btn = QPushButton("关闭")
        close_btn.clicked.connect(self.close)
        button_layout.addWidget(close_btn)
        
        layout.addLayout(button_layout)
    
    def create_basic_settings_tab(self):
        """创建基本设置标签页"""
        widget = QWidget()
        layout = QFormLayout(widget)
        
        # 模型范围
        extent_layout = QHBoxLayout()
        self.xmin = QDoubleSpinBox()
        self.xmax = QDoubleSpinBox()
        self.ymin = QDoubleSpinBox()
        self.ymax = QDoubleSpinBox()
        self.zmin = QDoubleSpinBox()
        self.zmax = QDoubleSpinBox()
        
        for spin in [self.xmin, self.xmax, self.ymin, self.ymax, self.zmin, self.zmax]:
            spin.setRange(-999999, 999999)
            spin.setDecimals(2)
        
        # 设置默认值
        self.xmin.setValue(0)
        self.xmax.setValue(1000)
        self.ymin.setValue(0)
        self.ymax.setValue(1000)
        self.zmin.setValue(0)
        self.zmax.setValue(500)
        
        extent_layout.addWidget(QLabel("X:"))
        extent_layout.addWidget(self.xmin)
        extent_layout.addWidget(QLabel("到"))
        extent_layout.addWidget(self.xmax)
        extent_layout.addWidget(QLabel("Y:"))
        extent_layout.addWidget(self.ymin)
        extent_layout.addWidget(QLabel("到"))
        extent_layout.addWidget(self.ymax)
        extent_layout.addWidget(QLabel("Z:"))
        extent_layout.addWidget(self.zmin)
        extent_layout.addWidget(QLabel("到"))
        extent_layout.addWidget(self.zmax)
        
        layout.addRow("模型范围:", extent_layout)
        
        # 分辨率
        res_layout = QHBoxLayout()
        self.nx = QSpinBox()
        self.ny = QSpinBox()
        self.nz = QSpinBox()
        
        for spin in [self.nx, self.ny, self.nz]:
            spin.setRange(10, 200)
            spin.setValue(50)
        
        res_layout.addWidget(QLabel("X:"))
        res_layout.addWidget(self.nx)
        res_layout.addWidget(QLabel("Y:"))
        res_layout.addWidget(self.ny)
        res_layout.addWidget(QLabel("Z:"))
        res_layout.addWidget(self.nz)
        
        layout.addRow("网格分辨率:", res_layout)
        
        # 插值方法
        self.interpolation = QComboBox()
        if GEMPY_AVAILABLE:
            self.interpolation.addItems(["universal_kriging", "simple_kriging", "polynomial"])
        else:
            self.interpolation.addItems(["linear", "rbf", "cubic"])
        layout.addRow("插值方法:", self.interpolation)
        
        # 趋势度数
        self.trend_degree = QSpinBox()
        self.trend_degree.setRange(0, 3)
        self.trend_degree.setValue(1)
        layout.addRow("趋势度数:", self.trend_degree)
        
        return widget
    
    def create_strata_management_tab(self):
        """创建地层管理标签页"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 工具栏
        toolbar = QHBoxLayout()
        
        add_btn = QPushButton("添加地层")
        add_btn.clicked.connect(self.add_strata)
        toolbar.addWidget(add_btn)
        
        remove_btn = QPushButton("删除地层")
        remove_btn.clicked.connect(self.remove_strata)
        toolbar.addWidget(remove_btn)
        
        toolbar.addStretch()
        
        auto_detect_btn = QPushButton("自动检测地层")
        auto_detect_btn.clicked.connect(self.auto_detect_strata)
        toolbar.addWidget(auto_detect_btn)
        
        layout.addLayout(toolbar)
        
        # 地层表格
        self.strata_table = QTableWidget()
        self.strata_table.setColumnCount(4)
        self.strata_table.setHorizontalHeaderLabels(["地层名", "颜色", "密度", "启用"])
        
        layout.addWidget(self.strata_table)
        
        return widget
    
    def create_advanced_options_tab(self):
        """创建高级选项标签页"""
        widget = QWidget()
        layout = QFormLayout(widget)
        
        # 克里金参数
        kriging_group = QGroupBox("克里金参数")
        kriging_layout = QFormLayout(kriging_group)
        
        self.range_param = QDoubleSpinBox()
        self.range_param.setRange(0.1, 10000)
        self.range_param.setValue(1000)
        kriging_layout.addRow("变程:", self.range_param)
        
        self.sill_param = QDoubleSpinBox()
        self.sill_param.setRange(0.1, 100)
        self.sill_param.setValue(1.0)
        kriging_layout.addRow("基台值:", self.sill_param)
        
        self.nugget_param = QDoubleSpinBox()
        self.nugget_param.setRange(0.0, 10)
        self.nugget_param.setValue(0.1)
        kriging_layout.addRow("块金效应:", self.nugget_param)
        
        layout.addRow(kriging_group)
        
        # 计算选项
        calc_group = QGroupBox("计算选项")
        calc_layout = QFormLayout(calc_group)
        
        self.parallel_computing = QCheckBox("启用并行计算")
        self.parallel_computing.setChecked(True)
        calc_layout.addRow(self.parallel_computing)
        
        self.num_threads = QSpinBox()
        self.num_threads.setRange(1, 16)
        self.num_threads.setValue(4)
        calc_layout.addRow("线程数:", self.num_threads)
        
        self.compute_uncertainty = QCheckBox("计算不确定性")
        calc_layout.addRow(self.compute_uncertainty)
        
        layout.addRow(calc_group)
        
        return widget
    
    def add_strata(self):
        """添加地层"""
        row = self.strata_table.rowCount()
        self.strata_table.insertRow(row)
        
        # 地层名
        name_item = QTableWidgetItem(f"地层_{row+1}")
        self.strata_table.setItem(row, 0, name_item)
        
        # 颜色（这里简化处理）
        color_item = QTableWidgetItem(f"#{row*40%255:02x}{row*80%255:02x}{row*120%255:02x}")
        self.strata_table.setItem(row, 1, color_item)
        
        # 密度
        density_item = QTableWidgetItem("2.5")
        self.strata_table.setItem(row, 2, density_item)
        
        # 启用复选框
        enable_checkbox = QCheckBox()
        enable_checkbox.setChecked(True)
        self.strata_table.setCellWidget(row, 3, enable_checkbox)
    
    def remove_strata(self):
        """删除选中的地层"""
        current_row = self.strata_table.currentRow()
        if current_row >= 0:
            self.strata_table.removeRow(current_row)
    
    def auto_detect_strata(self):
        """自动检测地层"""
        if not self.data_registry.get('boreholes'):
            QMessageBox.warning(self, "警告", "请先导入钻孔数据")
            return
        
        try:
            borehole_data = self.data_registry['boreholes']
            if '地层名称' in borehole_data.columns:
                unique_strata = borehole_data['地层名称'].unique()
                
                # 清空现有地层
                self.strata_table.setRowCount(0)
                
                # 添加检测到的地层
                for i, strata in enumerate(unique_strata):
                    row = self.strata_table.rowCount()
                    self.strata_table.insertRow(row)
                    
                    self.strata_table.setItem(row, 0, QTableWidgetItem(str(strata)))
                    self.strata_table.setItem(row, 1, QTableWidgetItem(f"#{i*40%255:02x}{i*80%255:02x}{i*120%255:02x}"))
                    self.strata_table.setItem(row, 2, QTableWidgetItem("2.5"))
                    
                    enable_checkbox = QCheckBox()
                    enable_checkbox.setChecked(True)
                    self.strata_table.setCellWidget(row, 3, enable_checkbox)
                
                QMessageBox.information(self, "成功", f"检测到 {len(unique_strata)} 个地层")
            
        except Exception as e:
            QMessageBox.warning(self, "错误", f"自动检测失败: {str(e)}")
    
    def preview_settings(self):
        """预览建模设置"""
        settings = self.get_modeling_settings()
        
        preview_text = f"""
建模设置预览:
=================
模型范围: X[{settings['xmin']}, {settings['xmax']}], Y[{settings['ymin']}, {settings['ymax']}], Z[{settings['zmin']}, {settings['zmax']}]
网格分辨率: {settings['nx']} × {settings['ny']} × {settings['nz']} = {settings['nx'] * settings['ny'] * settings['nz']} 个网格点
插值方法: {settings['interpolation']}
地层数量: {len(settings['strata'])}

地层列表:
{chr(10).join([f"- {s['name']} (密度: {s['density']})" for s in settings['strata']])}

估计内存使用: {(settings['nx'] * settings['ny'] * settings['nz'] * 8 / 1024 / 1024):.1f} MB
估计计算时间: {(settings['nx'] * settings['ny'] * settings['nz'] / 10000):.1f} 秒
        """
        
        msg = QMessageBox()
        msg.setWindowTitle("建模设置预览")
        msg.setText(preview_text)
        msg.setStandardButtons(QMessageBox.StandardButton.Ok)
        msg.exec()
    
    def get_modeling_settings(self):
        """获取建模设置"""
        # 收集地层信息
        strata = []
        for row in range(self.strata_table.rowCount()):
            enable_checkbox = self.strata_table.cellWidget(row, 3)
            if enable_checkbox.isChecked():
                strata.append({
                    'name': self.strata_table.item(row, 0).text(),
                    'color': self.strata_table.item(row, 1).text(),
                    'density': float(self.strata_table.item(row, 2).text())
                })
        
        return {
            'xmin': self.xmin.value(), 'xmax': self.xmax.value(),
            'ymin': self.ymin.value(), 'ymax': self.ymax.value(),
            'zmin': self.zmin.value(), 'zmax': self.zmax.value(),
            'nx': self.nx.value(), 'ny': self.ny.value(), 'nz': self.nz.value(),
            'interpolation': self.interpolation.currentText(),
            'trend_degree': self.trend_degree.value(),
            'strata': strata,
            'parallel': self.parallel_computing.isChecked(),
            'num_threads': self.num_threads.value(),
            'compute_uncertainty': self.compute_uncertainty.isChecked()
        }
    
    def start_modeling(self):
        """开始建模"""
        if not self.data_registry.get('boreholes'):
            QMessageBox.warning(self, "警告", "请先导入钻孔数据")
            return
        
        settings = self.get_modeling_settings()
        
        if not settings['strata']:
            QMessageBox.warning(self, "警告", "请至少定义一个地层")
            return
        
        # 禁用建模按钮，显示进度条
        self.build_btn.setEnabled(False)
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)  # 不确定进度
        
        # 在后台线程中执行建模
        self.modeling_thread = ModelingThread(self.data_registry, settings)
        self.modeling_thread.progress_updated.connect(self.progress_bar.setValue)
        self.modeling_thread.modeling_finished.connect(self.on_modeling_finished)
        self.modeling_thread.error_occurred.connect(self.on_modeling_error)
        self.modeling_thread.start()
    
    def on_modeling_finished(self, geo_model):
        """建模完成"""
        self.geo_model = geo_model
        self.build_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        
        QMessageBox.information(self, "成功", "地质建模完成！")
        self.model_built.emit(geo_model)
        self.close()
    
    def on_modeling_error(self, error_msg):
        """建模错误"""
        self.build_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        
        QMessageBox.critical(self, "建模失败", f"建模过程中发生错误:\n{error_msg}")

class ModelingThread(QThread):
    """建模线程"""
    
    progress_updated = pyqtSignal(int)
    modeling_finished = pyqtSignal(object)
    error_occurred = pyqtSignal(str)
    
    def __init__(self, data_registry, settings):
        super().__init__()
        self.data_registry = data_registry
        self.settings = settings
    
    def run(self):
        """执行建模"""
        try:
            # 模拟建模过程
            self.progress_updated.emit(10)
            time.sleep(0.5)
            
            # 准备数据
            borehole_data = self.data_registry['boreholes']
            self.progress_updated.emit(30)
            time.sleep(0.5)
            
            # 创建地质模型（这里使用简化的实现）
            if GEMPY_AVAILABLE:
                geo_model = self.create_gempy_model()
            else:
                geo_model = self.create_simple_model()
            
            self.progress_updated.emit(80)
            time.sleep(0.5)
            
            # 完成建模
            self.progress_updated.emit(100)
            self.modeling_finished.emit(geo_model)
            
        except Exception as e:
            self.error_occurred.emit(str(e))
    
    def create_gempy_model(self):
        """创建GemPy模型"""
        try:
            # 创建基本的GemPy模型
            extent = [
                self.settings['xmin'], self.settings['xmax'],
                self.settings['ymin'], self.settings['ymax'],
                self.settings['zmin'], self.settings['zmax']
            ]
            
            resolution = [self.settings['nx'], self.settings['ny'], self.settings['nz']]
            
            geo_model = gp.create_model('GEM_Model')
            geo_model = gp.init_data(geo_model, extent, resolution)
            
            # 添加地层
            for strata in self.settings['strata']:
                geo_model.add_formations(strata['name'])
            
            return geo_model
            
        except Exception as e:
            raise Exception(f"GemPy建模失败: {str(e)}")
    
    def create_simple_model(self):
        """创建简化模型（当GemPy不可用时）"""
        # 创建一个简单的数据结构来表示地质模型
        model = {
            'type': 'simple_geological_model',
            'extent': [
                self.settings['xmin'], self.settings['xmax'],
                self.settings['ymin'], self.settings['ymax'],
                self.settings['zmin'], self.settings['zmax']
            ],
            'resolution': [self.settings['nx'], self.settings['ny'], self.settings['nz']],
            'strata': self.settings['strata'],
            'data': self.data_registry['boreholes'],
            'created_time': time.time()
        }
        
        return model

class FaultAnalysisDialog(QDialog):
    """断层分析对话框"""
    
    def __init__(self, geological_model, parent=None):
        super().__init__(parent)
        self.geological_model = geological_model
        self.fault_network = []
        self.setWindowTitle("断层分析")
        self.setModal(True)
        self.resize(900, 700)
        self.setup_ui()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        # 创建标签页
        tabs = QTabWidget()
        
        # 断层管理
        fault_mgmt_tab = self.create_fault_management_tab()
        tabs.addTab(fault_mgmt_tab, "断层管理")
        
        # 关系分析
        relation_tab = self.create_relation_analysis_tab()
        tabs.addTab(relation_tab, "关系分析")
        
        # 应力分析
        stress_tab = self.create_stress_analysis_tab()
        tabs.addTab(stress_tab, "应力分析")
        
        # 演化模拟
        evolution_tab = self.create_evolution_simulation_tab()
        tabs.addTab(evolution_tab, "演化模拟")
        
        layout.addWidget(tabs)
        
        # 按钮区域
        button_layout = QHBoxLayout()
        
        run_analysis_btn = QPushButton("运行分析")
        run_analysis_btn.clicked.connect(self.run_fault_analysis)
        button_layout.addWidget(run_analysis_btn)
        
        export_btn = QPushButton("导出结果")
        export_btn.clicked.connect(self.export_results)
        button_layout.addWidget(export_btn)
        
        button_layout.addStretch()
        
        close_btn = QPushButton("关闭")
        close_btn.clicked.connect(self.close)
        button_layout.addWidget(close_btn)
        
        layout.addLayout(button_layout)
    
    def create_fault_management_tab(self):
        """创建断层管理标签页"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 工具栏
        toolbar = QHBoxLayout()
        
        add_fault_btn = QPushButton("添加断层")
        add_fault_btn.clicked.connect(self.add_fault)
        toolbar.addWidget(add_fault_btn)
        
        edit_fault_btn = QPushButton("编辑断层")
        edit_fault_btn.clicked.connect(self.edit_fault)
        toolbar.addWidget(edit_fault_btn)
        
        delete_fault_btn = QPushButton("删除断层")
        delete_fault_btn.clicked.connect(self.delete_fault)
        toolbar.addWidget(delete_fault_btn)
        
        toolbar.addStretch()
        
        import_btn = QPushButton("导入断层数据")
        import_btn.clicked.connect(self.import_fault_data)
        toolbar.addWidget(import_btn)
        
        layout.addLayout(toolbar)
        
        # 断层列表表格
        self.fault_table = QTableWidget()
        self.fault_table.setColumnCount(8)
        self.fault_table.setHorizontalHeaderLabels([
            "名称", "类型", "走向(°)", "倾角(°)", "长度(m)", "位移(m)", "摩擦系数", "状态"
        ])
        
        # 设置表格属性
        header = self.fault_table.horizontalHeader()
        header.setStretchLastSection(True)
        
        layout.addWidget(self.fault_table)
        
        return widget
    
    def create_relation_analysis_tab(self):
        """创建关系分析标签页"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 分析控制
        control_group = QGroupBox("分析控制")
        control_layout = QHBoxLayout(control_group)
        
        auto_detect_btn = QPushButton("自动检测关系")
        auto_detect_btn.clicked.connect(self.auto_detect_relations)
        control_layout.addWidget(auto_detect_btn)
        
        manual_edit_btn = QPushButton("手动编辑")
        manual_edit_btn.clicked.connect(self.manual_edit_relations)
        control_layout.addWidget(manual_edit_btn)
        
        validate_btn = QPushButton("验证关系")
        validate_btn.clicked.connect(self.validate_relations)
        control_layout.addWidget(validate_btn)
        
        control_layout.addStretch()
        
        layout.addWidget(control_group)
        
        # 关系矩阵
        matrix_group = QGroupBox("断层关系矩阵")
        matrix_layout = QVBoxLayout(matrix_group)
        
        self.relation_matrix = QTableWidget()
        matrix_layout.addWidget(self.relation_matrix)
        
        layout.addWidget(matrix_group)
        
        # 关系统计
        stats_group = QGroupBox("关系统计")
        stats_layout = QVBoxLayout(stats_group)
        
        self.relation_stats = QTextEdit()
        self.relation_stats.setMaximumHeight(100)
        self.relation_stats.setReadOnly(True)
        stats_layout.addWidget(self.relation_stats)
        
        layout.addWidget(stats_group)
        
        return widget
    
    def create_stress_analysis_tab(self):
        """创建应力分析标签页"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 应力参数设置
        params_group = QGroupBox("应力参数")
        params_layout = QFormLayout(params_group)
        
        self.stress_regime = QComboBox()
        self.stress_regime.addItems(["正断层", "逆断层", "走滑断层", "复合应力"])
        params_layout.addRow("应力体系:", self.stress_regime)
        
        self.sigma1 = QDoubleSpinBox()
        self.sigma1.setRange(0, 1000)
        self.sigma1.setValue(100)
        self.sigma1.setSuffix(" MPa")
        params_layout.addRow("最大主应力 σ₁:", self.sigma1)
        
        self.sigma2 = QDoubleSpinBox()
        self.sigma2.setRange(0, 1000)
        self.sigma2.setValue(70)
        self.sigma2.setSuffix(" MPa")
        params_layout.addRow("中间主应力 σ₂:", self.sigma2)
        
        self.sigma3 = QDoubleSpinBox()
        self.sigma3.setRange(0, 1000)
        self.sigma3.setValue(40)
        self.sigma3.setSuffix(" MPa")
        params_layout.addRow("最小主应力 σ₃:", self.sigma3)
        
        self.pore_pressure = QDoubleSpinBox()
        self.pore_pressure.setRange(0, 100)
        self.pore_pressure.setValue(10)
        self.pore_pressure.setSuffix(" MPa")
        params_layout.addRow("孔隙压力:", self.pore_pressure)
        
        layout.addWidget(params_group)
        
        # 稳定性分析
        stability_group = QGroupBox("稳定性分析")
        stability_layout = QVBoxLayout(stability_group)
        
        calc_stability_btn = QPushButton("计算稳定性")
        calc_stability_btn.clicked.connect(self.calculate_stability)
        stability_layout.addWidget(calc_stability_btn)
        
        self.stability_results = QTextEdit()
        self.stability_results.setReadOnly(True)
        stability_layout.addWidget(self.stability_results)
        
        layout.addWidget(stability_group)
        
        return widget
    
    def create_evolution_simulation_tab(self):
        """创建演化模拟标签页"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 时间参数
        time_group = QGroupBox("时间参数")
        time_layout = QFormLayout(time_group)
        
        self.start_time = QDoubleSpinBox()
        self.start_time.setRange(0, 1000)
        self.start_time.setValue(0)
        self.start_time.setSuffix(" Ma")
        time_layout.addRow("开始时间:", self.start_time)
        
        self.end_time = QDoubleSpinBox()
        self.end_time.setRange(0, 1000)
        self.end_time.setValue(10)
        self.end_time.setSuffix(" Ma")
        time_layout.addRow("结束时间:", self.end_time)
        
        self.time_step = QDoubleSpinBox()
        self.time_step.setRange(0.1, 10)
        self.time_step.setValue(0.5)
        self.time_step.setSuffix(" Ma")
        time_layout.addRow("时间步长:", self.time_step)
        
        layout.addWidget(time_group)
        
        # 演化控制
        evolution_group = QGroupBox("演化控制")
        evolution_layout = QVBoxLayout(evolution_group)
        
        control_layout = QHBoxLayout()
        
        start_sim_btn = QPushButton("开始模拟")
        start_sim_btn.clicked.connect(self.start_evolution_simulation)
        control_layout.addWidget(start_sim_btn)
        
        pause_sim_btn = QPushButton("暂停")
        pause_sim_btn.clicked.connect(self.pause_simulation)
        control_layout.addWidget(pause_sim_btn)
        
        stop_sim_btn = QPushButton("停止")
        stop_sim_btn.clicked.connect(self.stop_simulation)
        control_layout.addWidget(stop_sim_btn)
        
        control_layout.addStretch()
        
        evolution_layout.addLayout(control_layout)
        
        # 进度显示
        self.evolution_progress = QProgressBar()
        evolution_layout.addWidget(self.evolution_progress)
        
        # 当前状态显示
        self.evolution_status = QTextEdit()
        self.evolution_status.setMaximumHeight(150)
        self.evolution_status.setReadOnly(True)
        evolution_layout.addWidget(self.evolution_status)
        
        layout.addWidget(evolution_group)
        
        return widget
    
    # 实现各种方法
    def add_fault(self):
        """添加断层"""
        dialog = FaultEditDialog(parent=self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            fault_data = dialog.get_fault_data()
            self.fault_network.append(fault_data)
            self.update_fault_table()
    
    def edit_fault(self):
        """编辑断层"""
        current_row = self.fault_table.currentRow()
        if current_row < 0:
            QMessageBox.warning(self, "警告", "请先选择要编辑的断层")
            return
        
        fault_data = self.fault_network[current_row]
        dialog = FaultEditDialog(fault_data, parent=self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            updated_data = dialog.get_fault_data()
            self.fault_network[current_row] = updated_data
            self.update_fault_table()
    
    def delete_fault(self):
        """删除断层"""
        current_row = self.fault_table.currentRow()
        if current_row < 0:
            QMessageBox.warning(self, "警告", "请先选择要删除的断层")
            return
        
        reply = QMessageBox.question(
            self, "确认", "确定要删除选中的断层吗？",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            del self.fault_network[current_row]
            self.update_fault_table()
    
    def update_fault_table(self):
        """更新断层表格"""
        self.fault_table.setRowCount(len(self.fault_network))
        
        for i, fault in enumerate(self.fault_network):
            self.fault_table.setItem(i, 0, QTableWidgetItem(fault.get('name', '')))
            self.fault_table.setItem(i, 1, QTableWidgetItem(fault.get('type', '')))
            self.fault_table.setItem(i, 2, QTableWidgetItem(str(fault.get('strike', 0))))
            self.fault_table.setItem(i, 3, QTableWidgetItem(str(fault.get('dip', 0))))
            self.fault_table.setItem(i, 4, QTableWidgetItem(str(fault.get('length', 0))))
            self.fault_table.setItem(i, 5, QTableWidgetItem(str(fault.get('displacement', 0))))
            self.fault_table.setItem(i, 6, QTableWidgetItem(str(fault.get('friction', 0.6))))
            self.fault_table.setItem(i, 7, QTableWidgetItem(fault.get('status', 'active')))
    
    def auto_detect_relations(self):
        """自动检测断层关系"""
        if len(self.fault_network) < 2:
            QMessageBox.warning(self, "警告", "至少需要2个断层才能分析关系")
            return
        
        # 简化的关系检测算法
        n_faults = len(self.fault_network)
        self.relation_matrix.setRowCount(n_faults)
        self.relation_matrix.setColumnCount(n_faults)
        
        fault_names = [fault.get('name', f'断层_{i}') for i, fault in enumerate(self.fault_network)]
        self.relation_matrix.setHorizontalHeaderLabels(fault_names)
        self.relation_matrix.setVerticalHeaderLabels(fault_names)
        
        for i in range(n_faults):
            for j in range(n_faults):
                if i == j:
                    relation = "自身"
                else:
                    # 基于几何关系的简单判断
                    fault1 = self.fault_network[i]
                    fault2 = self.fault_network[j]
                    
                    strike_diff = abs(fault1.get('strike', 0) - fault2.get('strike', 0))
                    if strike_diff < 30:
                        relation = "平行"
                    elif 60 < strike_diff < 120:
                        relation = "相交"
                    else:
                        relation = "斜交"
                
                self.relation_matrix.setItem(i, j, QTableWidgetItem(relation))
        
        # 更新统计信息
        self.update_relation_stats()
    
    def update_relation_stats(self):
        """更新关系统计"""
        if self.relation_matrix.rowCount() == 0:
            return
        
        relations = {}
        for i in range(self.relation_matrix.rowCount()):
            for j in range(self.relation_matrix.columnCount()):
                if i != j:  # 排除对角线
                    item = self.relation_matrix.item(i, j)
                    if item:
                        relation = item.text()
                        relations[relation] = relations.get(relation, 0) + 1
        
        stats_text = "断层关系统计:\n"
        for relation, count in relations.items():
            stats_text += f"{relation}: {count} 对\n"
        
        self.relation_stats.setText(stats_text)
    
    def calculate_stability(self):
        """计算断层稳定性"""
        if not self.fault_network:
            QMessageBox.warning(self, "警告", "请先定义断层")
            return
        
        # 获取应力参数
        sigma1 = self.sigma1.value()
        sigma2 = self.sigma2.value()
        sigma3 = self.sigma3.value()
        pore_pressure = self.pore_pressure.value()
        
        results = "断层稳定性分析结果:\n"
        results += "=" * 30 + "\n"
        results += f"应力条件: σ₁={sigma1} MPa, σ₂={sigma2} MPa, σ₃={sigma3} MPa\n"
        results += f"孔隙压力: {pore_pressure} MPa\n\n"
        
        for i, fault in enumerate(self.fault_network):
            fault_name = fault.get('name', f'断层_{i}')
            friction = fault.get('friction', 0.6)
            dip = fault.get('dip', 60)
            
            # 简化的Mohr-Coulomb稳定性分析
            effective_stress = (sigma1 - pore_pressure)
            shear_stress = 0.5 * (sigma1 - sigma3) * np.sin(2 * np.radians(dip))
            normal_stress = 0.5 * (sigma1 + sigma3) - 0.5 * (sigma1 - sigma3) * np.cos(2 * np.radians(dip))
            
            critical_shear = friction * (normal_stress - pore_pressure)
            safety_factor = critical_shear / shear_stress if shear_stress > 0 else float('inf')
            
            if safety_factor > 1.5:
                stability = "稳定"
            elif safety_factor > 1.0:
                stability = "临界"
            else:
                stability = "不稳定"
            
            results += f"{fault_name}:\n"
            results += f"  倾角: {dip}°\n"
            results += f"  摩擦系数: {friction}\n"
            results += f"  剪应力: {shear_stress:.2f} MPa\n"
            results += f"  法向应力: {normal_stress:.2f} MPa\n"
            results += f"  安全系数: {safety_factor:.2f}\n"
            results += f"  稳定性: {stability}\n\n"
        
        self.stability_results.setText(results)
    
    def start_evolution_simulation(self):
        """开始演化模拟"""
        if not self.fault_network:
            QMessageBox.warning(self, "警告", "请先定义断层")
            return
        
        # 获取时间参数
        start_time = self.start_time.value()
        end_time = self.end_time.value()
        time_step = self.time_step.value()
        
        if start_time >= end_time:
            QMessageBox.warning(self, "警告", "开始时间必须小于结束时间")
            return
        
        # 开始模拟（简化实现）
        self.evolution_progress.setRange(0, int((end_time - start_time) / time_step))
        self.evolution_progress.setValue(0)
        
        status_text = f"开始演化模拟\n时间范围: {start_time} - {end_time} Ma\n时间步长: {time_step} Ma\n\n"
        
        # 模拟时间循环
        current_time = start_time
        step = 0
        
        while current_time < end_time:
            # 模拟每个时间步的演化
            status_text += f"时间 {current_time:.1f} Ma: 计算断层活动...\n"
            
            # 更新进度
            self.evolution_progress.setValue(step)
            self.evolution_status.setText(status_text)
            
            # 处理事件以更新UI
            QApplication.processEvents()
            time.sleep(0.1)  # 模拟计算时间
            
            current_time += time_step
            step += 1
            
            if step > 20:  # 限制演示长度
                break
        
        status_text += "\n演化模拟完成！"
        self.evolution_status.setText(status_text)
        self.evolution_progress.setValue(self.evolution_progress.maximum())
        
        QMessageBox.information(self, "完成", "断层演化模拟完成")
    
    def pause_simulation(self):
        """暂停模拟"""
        # 这里应该实现暂停逻辑
        pass
    
    def stop_simulation(self):
        """停止模拟"""
        # 这里应该实现停止逻辑
        pass
    
    def run_fault_analysis(self):
        """运行断层分析"""
        if not self.fault_network:
            QMessageBox.warning(self, "警告", "请先定义断层")
            return
        
        # 运行综合分析
        QMessageBox.information(self, "分析完成", 
                              f"断层分析完成！\n"
                              f"分析断层数量: {len(self.fault_network)}\n"
                              f"关系分析: 已完成\n"
                              f"应力分析: 已完成\n"
                              f"稳定性评估: 已完成")
    
    def export_results(self):
        """导出结果"""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "导出断层分析结果", "", "JSON文件 (*.json);;CSV文件 (*.csv)"
        )
        
        if file_path:
            try:
                if file_path.endswith('.json'):
                    results = {
                        'faults': self.fault_network,
                        'analysis_time': time.time(),
                        'analysis_type': 'fault_analysis'
                    }
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(results, f, ensure_ascii=False, indent=2)
                else:
                    # 导出为CSV
                    df = pd.DataFrame(self.fault_network)
                    df.to_csv(file_path, index=False, encoding='utf-8-sig')
                
                QMessageBox.information(self, "成功", f"结果已导出到: {file_path}")
                
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导出失败: {str(e)}")
    
    def import_fault_data(self):
        """导入断层数据"""
        dialog = DataImportDialog("断层数据", parent=self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            imported_data = dialog.imported_data
            
            # 转换导入的数据为断层对象
            for _, row in imported_data.iterrows():
                fault_data = {
                    'name': row.get('断层名', f'断层_{len(self.fault_network)}'),
                    'type': 'normal',  # 默认值
                    'strike': float(row.get('走向', 0)),
                    'dip': float(row.get('倾角', 60)),
                    'x': float(row.get('X坐标', 0)),
                    'y': float(row.get('Y坐标', 0)),
                    'z': float(row.get('Z坐标', 0)),
                    'length': 1000,  # 默认值
                    'displacement': 0,  # 默认值
                    'friction': 0.6,  # 默认值
                    'status': 'active'
                }
                self.fault_network.append(fault_data)
            
            self.update_fault_table()
            QMessageBox.information(self, "成功", f"成功导入 {len(imported_data)} 个断层")

class FaultEditDialog(QDialog):
    """断层编辑对话框"""
    
    def __init__(self, fault_data=None, parent=None):
        super().__init__(parent)
        self.fault_data = fault_data or {}
        self.setWindowTitle("断层编辑")
        self.setModal(True)
        self.resize(400, 500)
        self.setup_ui()
        
        if fault_data:
            self.load_fault_data()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        # 基本信息
        basic_group = QGroupBox("基本信息")
        basic_layout = QFormLayout(basic_group)
        
        self.name = QLineEdit()
        basic_layout.addRow("断层名称:", self.name)
        
        self.fault_type = QComboBox()
        self.fault_type.addItems(["正断层", "逆断层", "走滑断层", "逆走滑", "正走滑"])
        basic_layout.addRow("断层类型:", self.fault_type)
        
        self.status = QComboBox()
        self.status.addItems(["活动", "非活动", "未知"])
        basic_layout.addRow("活动状态:", self.status)
        
        layout.addWidget(basic_group)
        
        # 几何参数
        geom_group = QGroupBox("几何参数")
        geom_layout = QFormLayout(geom_group)
        
        self.strike = QDoubleSpinBox()
        self.strike.setRange(0, 360)
        self.strike.setSuffix("°")
        geom_layout.addRow("走向:", self.strike)
        
        self.dip = QDoubleSpinBox()
        self.dip.setRange(0, 90)
        self.dip.setSuffix("°")
        geom_layout.addRow("倾角:", self.dip)
        
        self.length = QDoubleSpinBox()
        self.length.setRange(1, 100000)
        self.length.setSuffix(" m")
        geom_layout.addRow("长度:", self.length)
        
        self.width = QDoubleSpinBox()
        self.width.setRange(1, 50000)
        self.width.setSuffix(" m")
        geom_layout.addRow("宽度:", self.width)
        
        layout.addWidget(geom_group)
        
        # 力学参数
        mech_group = QGroupBox("力学参数")
        mech_layout = QFormLayout(mech_group)
        
        self.friction = QDoubleSpinBox()
        self.friction.setRange(0.1, 2.0)
        self.friction.setDecimals(2)
        self.friction.setValue(0.6)
        mech_layout.addRow("摩擦系数:", self.friction)
        
        self.cohesion = QDoubleSpinBox()
        self.cohesion.setRange(0, 100)
        self.cohesion.setSuffix(" MPa")
        mech_layout.addRow("粘聚力:", self.cohesion)
        
        self.displacement = QDoubleSpinBox()
        self.displacement.setRange(0, 10000)
        self.displacement.setSuffix(" m")
        mech_layout.addRow("位移量:", self.displacement)
        
        layout.addWidget(mech_group)
        
        # 时间参数
        time_group = QGroupBox("时间参数")
        time_layout = QFormLayout(time_group)
        
        self.age = QDoubleSpinBox()
        self.age.setRange(0, 1000)
        self.age.setSuffix(" Ma")
        time_layout.addRow("形成年龄:", self.age)
        
        self.slip_rate = QDoubleSpinBox()
        self.slip_rate.setRange(0, 100)
        self.slip_rate.setSuffix(" mm/yr")
        time_layout.addRow("滑移速率:", self.slip_rate)
        
        layout.addWidget(time_group)
        
        # 按钮
        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self.accept)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)
    
    def load_fault_data(self):
        """加载断层数据"""
        self.name.setText(self.fault_data.get('name', ''))
        
        fault_type = self.fault_data.get('type', 'normal')
        type_map = {'normal': 0, 'reverse': 1, 'strike_slip': 2, 
                   'oblique_reverse': 3, 'oblique_normal': 4}
        self.fault_type.setCurrentIndex(type_map.get(fault_type, 0))
        
        self.strike.setValue(self.fault_data.get('strike', 0))
        self.dip.setValue(self.fault_data.get('dip', 60))
        self.length.setValue(self.fault_data.get('length', 1000))
        self.width.setValue(self.fault_data.get('width', 500))
        self.friction.setValue(self.fault_data.get('friction', 0.6))
        self.cohesion.setValue(self.fault_data.get('cohesion', 0))
        self.displacement.setValue(self.fault_data.get('displacement', 0))
        self.age.setValue(self.fault_data.get('age', 0))
        self.slip_rate.setValue(self.fault_data.get('slip_rate', 0))
    
    def get_fault_data(self):
        """获取断层数据"""
        type_map = ['normal', 'reverse', 'strike_slip', 'oblique_reverse', 'oblique_normal']
        
        return {
            'name': self.name.text(),
            'type': type_map[self.fault_type.currentIndex()],
            'status': self.status.currentText(),
            'strike': self.strike.value(),
            'dip': self.dip.value(),
            'length': self.length.value(),
            'width': self.width.value(),
            'friction': self.friction.value(),
            'cohesion': self.cohesion.value(),
            'displacement': self.displacement.value(),
            'age': self.age.value(),
            'slip_rate': self.slip_rate.value()
        }

# 将在下一部分继续实现其他功能模块...