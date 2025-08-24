"""
不确定性分析和3D可视化模块
Uncertainty Analysis and 3D Visualization Modules
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
    from scipy.stats import qmc  # quasi-Monte Carlo
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

class UncertaintyAnalysisDialog(QDialog):
    """不确定性分析对话框"""
    
    def __init__(self, geological_model, parent=None):
        super().__init__(parent)
        self.geological_model = geological_model
        self.uncertain_parameters = []
        self.analysis_results = {}
        self.setWindowTitle("不确定性分析")
        self.setModal(True)
        self.resize(1200, 900)
        self.setup_ui()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        # 创建标签页
        tabs = QTabWidget()
        
        # 参数设置标签页
        params_tab = self.create_parameters_tab()
        tabs.addTab(params_tab, "参数设置")
        
        # 分析方法标签页
        methods_tab = self.create_methods_tab()
        tabs.addTab(methods_tab, "分析方法")
        
        # 结果分析标签页
        results_tab = self.create_results_tab()
        tabs.addTab(results_tab, "结果分析")
        
        # 敏感性分析标签页
        sensitivity_tab = self.create_sensitivity_tab()
        tabs.addTab(sensitivity_tab, "敏感性分析")
        
        layout.addWidget(tabs)
        
        # 控制区域
        control_layout = QVBoxLayout()
        
        # 进度条和状态
        progress_layout = QHBoxLayout()
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        progress_layout.addWidget(self.progress_bar)
        
        self.status_label = QLabel("就绪")
        progress_layout.addWidget(self.status_label)
        
        control_layout.addLayout(progress_layout)
        
        # 按钮区域
        button_layout = QHBoxLayout()
        
        self.run_analysis_btn = QPushButton("运行分析")
        self.run_analysis_btn.clicked.connect(self.start_uncertainty_analysis)
        button_layout.addWidget(self.run_analysis_btn)
        
        self.stop_analysis_btn = QPushButton("停止分析")
        self.stop_analysis_btn.clicked.connect(self.stop_analysis)
        self.stop_analysis_btn.setEnabled(False)
        button_layout.addWidget(self.stop_analysis_btn)
        
        export_btn = QPushButton("导出结果")
        export_btn.clicked.connect(self.export_results)
        button_layout.addWidget(export_btn)
        
        button_layout.addStretch()
        
        close_btn = QPushButton("关闭")
        close_btn.clicked.connect(self.close)
        button_layout.addWidget(close_btn)
        
        control_layout.addLayout(button_layout)
        layout.addLayout(control_layout)
    
    def create_parameters_tab(self):
        """创建参数设置标签页"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 参数管理工具栏
        toolbar = QHBoxLayout()
        
        add_param_btn = QPushButton("添加参数")
        add_param_btn.clicked.connect(self.add_uncertain_parameter)
        toolbar.addWidget(add_param_btn)
        
        remove_param_btn = QPushButton("删除参数")
        remove_param_btn.clicked.connect(self.remove_uncertain_parameter)
        toolbar.addWidget(remove_param_btn)
        
        edit_param_btn = QPushButton("编辑参数")
        edit_param_btn.clicked.connect(self.edit_uncertain_parameter)
        toolbar.addWidget(edit_param_btn)
        
        toolbar.addStretch()
        
        import_params_btn = QPushButton("导入参数")
        import_params_btn.clicked.connect(self.import_parameters)
        toolbar.addWidget(import_params_btn)
        
        layout.addLayout(toolbar)
        
        # 参数表格
        self.parameters_table = QTableWidget()
        self.parameters_table.setColumnCount(7)
        self.parameters_table.setHorizontalHeaderLabels([
            "参数名", "类型", "分布类型", "参数1", "参数2", "最小值", "最大值"
        ])
        
        # 设置表格属性
        header = self.parameters_table.horizontalHeader()
        header.setStretchLastSection(True)
        
        layout.addWidget(self.parameters_table)
        
        # 参数统计信息
        stats_group = QGroupBox("参数统计")
        stats_layout = QVBoxLayout(stats_group)
        
        self.param_stats_text = QTextEdit()
        self.param_stats_text.setMaximumHeight(100)
        self.param_stats_text.setReadOnly(True)
        stats_layout.addWidget(self.param_stats_text)
        
        layout.addWidget(stats_group)
        
        return widget
    
    def create_methods_tab(self):
        """创建分析方法标签页"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 方法选择
        method_group = QGroupBox("分析方法选择")
        method_layout = QGridLayout(method_group)
        
        # 蒙特卡洛方法
        self.monte_carlo_check = QCheckBox("蒙特卡洛模拟")
        self.monte_carlo_check.setChecked(True)
        method_layout.addWidget(self.monte_carlo_check, 0, 0)
        
        # 拉丁超立方采样
        self.latin_hypercube_check = QCheckBox("拉丁超立方采样")
        method_layout.addWidget(self.latin_hypercube_check, 0, 1)
        
        # Sobol序列
        self.sobol_check = QCheckBox("Sobol序列")
        method_layout.addWidget(self.sobol_check, 1, 0)
        
        # Halton序列
        self.halton_check = QCheckBox("Halton序列")
        method_layout.addWidget(self.halton_check, 1, 1)
        
        # 敏感性分析
        self.sensitivity_check = QCheckBox("敏感性分析")
        method_layout.addWidget(self.sensitivity_check, 2, 0)
        
        # 贝叶斯分析
        self.bayesian_check = QCheckBox("贝叶斯分析")
        method_layout.addWidget(self.bayesian_check, 2, 1)
        
        layout.addWidget(method_group)
        
        # 计算参数
        calc_group = QGroupBox("计算参数")
        calc_layout = QFormLayout(calc_group)
        
        # 样本数量
        self.n_samples = QSpinBox()
        self.n_samples.setRange(100, 1000000)
        self.n_samples.setValue(10000)
        calc_layout.addRow("样本数量:", self.n_samples)
        
        # 并行处理
        self.n_workers = QSpinBox()
        self.n_workers.setRange(1, mp.cpu_count())
        self.n_workers.setValue(min(4, mp.cpu_count()))
        calc_layout.addRow("并行线程数:", self.n_workers)
        
        # 随机种子
        self.random_seed = QSpinBox()
        self.random_seed.setRange(0, 999999)
        self.random_seed.setValue(42)
        calc_layout.addRow("随机种子:", self.random_seed)
        
        # 批处理大小
        self.batch_size = QSpinBox()
        self.batch_size.setRange(100, 10000)
        self.batch_size.setValue(1000)
        calc_layout.addRow("批处理大小:", self.batch_size)
        
        layout.addWidget(calc_group)
        
        # 收敛设置
        convergence_group = QGroupBox("收敛设置")
        convergence_layout = QFormLayout(convergence_group)
        
        self.convergence_check = QCheckBox("启用收敛检查")
        convergence_layout.addRow(self.convergence_check)
        
        self.convergence_tolerance = QDoubleSpinBox()
        self.convergence_tolerance.setRange(0.001, 0.1)
        self.convergence_tolerance.setValue(0.01)
        self.convergence_tolerance.setDecimals(4)
        convergence_layout.addRow("收敛容差:", self.convergence_tolerance)
        
        self.convergence_window = QSpinBox()
        self.convergence_window.setRange(100, 5000)
        self.convergence_window.setValue(1000)
        convergence_layout.addRow("收敛窗口:", self.convergence_window)
        
        layout.addWidget(convergence_group)
        
        return widget
    
    def create_results_tab(self):
        """创建结果分析标签页"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 结果选择和控制
        control_layout = QHBoxLayout()
        
        self.result_type_combo = QComboBox()
        self.result_type_combo.addItems([
            "参数分布", "统计摘要", "相关性分析", "概率密度", "累积分布"
        ])
        self.result_type_combo.currentTextChanged.connect(self.update_results_display)
        control_layout.addWidget(QLabel("结果类型:"))
        control_layout.addWidget(self.result_type_combo)
        
        refresh_btn = QPushButton("刷新")
        refresh_btn.clicked.connect(self.update_results_display)
        control_layout.addWidget(refresh_btn)
        
        control_layout.addStretch()
        
        layout.addLayout(control_layout)
        
        # 结果显示区域
        self.results_figure = Figure(figsize=(12, 8))
        self.results_canvas = FigureCanvas(self.results_figure)
        layout.addWidget(self.results_canvas)
        
        # 统计信息文本
        stats_group = QGroupBox("统计信息")
        stats_layout = QVBoxLayout(stats_group)
        
        self.results_stats_text = QTextEdit()
        self.results_stats_text.setMaximumHeight(150)
        self.results_stats_text.setReadOnly(True)
        stats_layout.addWidget(self.results_stats_text)
        
        layout.addWidget(stats_group)
        
        return widget
    
    def create_sensitivity_tab(self):
        """创建敏感性分析标签页"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 敏感性方法选择
        method_group = QGroupBox("敏感性分析方法")
        method_layout = QGridLayout(method_group)
        
        self.local_sensitivity = QCheckBox("局部敏感性分析")
        self.local_sensitivity.setChecked(True)
        method_layout.addWidget(self.local_sensitivity, 0, 0)
        
        self.global_sensitivity = QCheckBox("全局敏感性分析")
        method_layout.addWidget(self.global_sensitivity, 0, 1)
        
        self.sobol_indices = QCheckBox("Sobol指数分析")
        method_layout.addWidget(self.sobol_indices, 1, 0)
        
        self.morris_screening = QCheckBox("Morris筛选法")
        method_layout.addWidget(self.morris_screening, 1, 1)
        
        layout.addWidget(method_group)
        
        # 敏感性参数
        sensitivity_params_group = QGroupBox("敏感性参数")
        sensitivity_params_layout = QFormLayout(sensitivity_params_group)
        
        self.perturbation_size = QDoubleSpinBox()
        self.perturbation_size.setRange(0.001, 0.5)
        self.perturbation_size.setValue(0.01)
        self.perturbation_size.setDecimals(4)
        sensitivity_params_layout.addRow("扰动大小:", self.perturbation_size)
        
        self.morris_trajectories = QSpinBox()
        self.morris_trajectories.setRange(10, 1000)
        self.morris_trajectories.setValue(100)
        sensitivity_params_layout.addRow("Morris轨迹数:", self.morris_trajectories)
        
        layout.addWidget(sensitivity_params_group)
        
        # 敏感性结果显示
        self.sensitivity_figure = Figure(figsize=(12, 6))
        self.sensitivity_canvas = FigureCanvas(self.sensitivity_figure)
        layout.addWidget(self.sensitivity_canvas)
        
        # 敏感性排序表格
        ranking_group = QGroupBox("敏感性排序")
        ranking_layout = QVBoxLayout(ranking_group)
        
        self.sensitivity_table = QTableWidget()
        self.sensitivity_table.setColumnCount(4)
        self.sensitivity_table.setHorizontalHeaderLabels([
            "参数名", "敏感性指数", "标准误差", "排名"
        ])
        ranking_layout.addWidget(self.sensitivity_table)
        
        layout.addWidget(ranking_group)
        
        return widget
    
    def add_uncertain_parameter(self):
        """添加不确定参数"""
        dialog = ParameterEditDialog(parent=self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            param_data = dialog.get_parameter_data()
            self.uncertain_parameters.append(param_data)
            self.update_parameters_table()
            self.update_parameter_stats()
    
    def remove_uncertain_parameter(self):
        """删除选中的不确定参数"""
        current_row = self.parameters_table.currentRow()
        if current_row < 0:
            QMessageBox.warning(self, "警告", "请先选择要删除的参数")
            return
        
        reply = QMessageBox.question(
            self, "确认", "确定要删除选中的参数吗？",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            del self.uncertain_parameters[current_row]
            self.update_parameters_table()
            self.update_parameter_stats()
    
    def edit_uncertain_parameter(self):
        """编辑选中的不确定参数"""
        current_row = self.parameters_table.currentRow()
        if current_row < 0:
            QMessageBox.warning(self, "警告", "请先选择要编辑的参数")
            return
        
        param_data = self.uncertain_parameters[current_row]
        dialog = ParameterEditDialog(param_data, parent=self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            updated_data = dialog.get_parameter_data()
            self.uncertain_parameters[current_row] = updated_data
            self.update_parameters_table()
            self.update_parameter_stats()
    
    def update_parameters_table(self):
        """更新参数表格"""
        self.parameters_table.setRowCount(len(self.uncertain_parameters))
        
        for i, param in enumerate(self.uncertain_parameters):
            self.parameters_table.setItem(i, 0, QTableWidgetItem(param['name']))
            self.parameters_table.setItem(i, 1, QTableWidgetItem(param['type']))
            self.parameters_table.setItem(i, 2, QTableWidgetItem(param['distribution']))
            self.parameters_table.setItem(i, 3, QTableWidgetItem(str(param['param1'])))
            self.parameters_table.setItem(i, 4, QTableWidgetItem(str(param['param2'])))
            self.parameters_table.setItem(i, 5, QTableWidgetItem(str(param['min_val'])))
            self.parameters_table.setItem(i, 6, QTableWidgetItem(str(param['max_val'])))
    
    def update_parameter_stats(self):
        """更新参数统计信息"""
        if not self.uncertain_parameters:
            self.param_stats_text.setText("暂无参数")
            return
        
        stats_text = f"不确定参数统计:\n"
        stats_text += f"参数总数: {len(self.uncertain_parameters)}\n"
        
        # 按分布类型统计
        dist_counts = {}
        for param in self.uncertain_parameters:
            dist = param['distribution']
            dist_counts[dist] = dist_counts.get(dist, 0) + 1
        
        stats_text += "分布类型统计:\n"
        for dist, count in dist_counts.items():
            stats_text += f"  {dist}: {count} 个\n"
        
        self.param_stats_text.setText(stats_text)
    
    def import_parameters(self):
        """导入参数设置"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "导入参数设置", "", "JSON文件 (*.json);;CSV文件 (*.csv)"
        )
        
        if file_path:
            try:
                if file_path.endswith('.json'):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        params_data = json.load(f)
                    
                    if isinstance(params_data, list):
                        self.uncertain_parameters.extend(params_data)
                    elif isinstance(params_data, dict) and 'parameters' in params_data:
                        self.uncertain_parameters.extend(params_data['parameters'])
                
                elif file_path.endswith('.csv'):
                    df = pd.read_csv(file_path)
                    for _, row in df.iterrows():
                        param_data = {
                            'name': row.get('name', 'param'),
                            'type': row.get('type', 'geological'),
                            'distribution': row.get('distribution', 'normal'),
                            'param1': float(row.get('param1', 0)),
                            'param2': float(row.get('param2', 1)),
                            'min_val': float(row.get('min_val', -np.inf)),
                            'max_val': float(row.get('max_val', np.inf))
                        }
                        self.uncertain_parameters.append(param_data)
                
                self.update_parameters_table()
                self.update_parameter_stats()
                QMessageBox.information(self, "成功", f"成功导入参数设置")
                
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导入失败: {str(e)}")
    
    def start_uncertainty_analysis(self):
        """开始不确定性分析"""
        if not self.uncertain_parameters:
            QMessageBox.warning(self, "警告", "请先定义不确定参数")
            return
        
        # 检查至少选择了一种方法
        methods_selected = any([
            self.monte_carlo_check.isChecked(),
            self.latin_hypercube_check.isChecked(),
            self.sobol_check.isChecked(),
            self.halton_check.isChecked(),
            self.sensitivity_check.isChecked(),
            self.bayesian_check.isChecked()
        ])
        
        if not methods_selected:
            QMessageBox.warning(self, "警告", "请至少选择一种分析方法")
            return
        
        # 准备分析参数
        analysis_params = {
            'parameters': self.uncertain_parameters,
            'n_samples': self.n_samples.value(),
            'n_workers': self.n_workers.value(),
            'random_seed': self.random_seed.value(),
            'batch_size': self.batch_size.value(),
            'methods': {
                'monte_carlo': self.monte_carlo_check.isChecked(),
                'latin_hypercube': self.latin_hypercube_check.isChecked(),
                'sobol': self.sobol_check.isChecked(),
                'halton': self.halton_check.isChecked(),
                'sensitivity': self.sensitivity_check.isChecked(),
                'bayesian': self.bayesian_check.isChecked()
            },
            'sensitivity_params': {
                'perturbation_size': self.perturbation_size.value(),
                'morris_trajectories': self.morris_trajectories.value(),
                'local': self.local_sensitivity.isChecked(),
                'global': self.global_sensitivity.isChecked(),
                'sobol_indices': self.sobol_indices.isChecked(),
                'morris_screening': self.morris_screening.isChecked()
            },
            'convergence': {
                'enabled': self.convergence_check.isChecked(),
                'tolerance': self.convergence_tolerance.value(),
                'window': self.convergence_window.value()
            }
        }
        
        # 禁用控制按钮，启动分析
        self.run_analysis_btn.setEnabled(False)
        self.stop_analysis_btn.setEnabled(True)
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 100)
        self.status_label.setText("初始化不确定性分析...")
        
        # 启动分析线程
        self.analysis_thread = UncertaintyAnalysisThread(
            self.geological_model, analysis_params
        )
        self.analysis_thread.progress_updated.connect(self.progress_bar.setValue)
        self.analysis_thread.status_updated.connect(self.status_label.setText)
        self.analysis_thread.analysis_finished.connect(self.on_analysis_finished)
        self.analysis_thread.error_occurred.connect(self.on_analysis_error)
        self.analysis_thread.start()
    
    def stop_analysis(self):
        """停止分析"""
        if hasattr(self, 'analysis_thread') and self.analysis_thread.isRunning():
            self.analysis_thread.stop()
            self.status_label.setText("分析已停止")
        
        self.run_analysis_btn.setEnabled(True)
        self.stop_analysis_btn.setEnabled(False)
        self.progress_bar.setVisible(False)
    
    def on_analysis_finished(self, results):
        """分析完成处理"""
        self.analysis_results = results
        
        self.run_analysis_btn.setEnabled(True)
        self.stop_analysis_btn.setEnabled(False)
        self.progress_bar.setVisible(False)
        self.status_label.setText("分析完成")
        
        # 更新结果显示
        self.update_results_display()
        self.update_sensitivity_results()
        
        # 显示完成消息
        n_samples = results.get('n_samples', 0)
        methods_used = [k for k, v in results.get('methods_used', {}).items() if v]
        
        QMessageBox.information(
            self, "分析完成",
            f"不确定性分析完成！\n\n"
            f"样本数量: {n_samples:,}\n"
            f"使用方法: {', '.join(methods_used)}\n"
            f"分析参数: {len(self.uncertain_parameters)} 个"
        )
    
    def on_analysis_error(self, error_msg):
        """分析错误处理"""
        self.run_analysis_btn.setEnabled(True)
        self.stop_analysis_btn.setEnabled(False)
        self.progress_bar.setVisible(False)
        self.status_label.setText("分析失败")
        
        QMessageBox.critical(self, "分析失败", f"分析过程中发生错误:\n{error_msg}")
    
    def update_results_display(self):
        """更新结果显示"""
        if not self.analysis_results:
            return
        
        result_type = self.result_type_combo.currentText()
        
        # 清除之前的图表
        self.results_figure.clear()
        
        try:
            if result_type == "参数分布":
                self.plot_parameter_distributions()
            elif result_type == "统计摘要":
                self.plot_statistical_summary()
            elif result_type == "相关性分析":
                self.plot_correlation_analysis()
            elif result_type == "概率密度":
                self.plot_probability_density()
            elif result_type == "累积分布":
                self.plot_cumulative_distribution()
            
            self.results_canvas.draw()
            
        except Exception as e:
            print(f"绘图错误: {e}")
            # 显示错误信息
            ax = self.results_figure.add_subplot(111)
            ax.text(0.5, 0.5, f"绘图错误:\n{str(e)}", 
                   ha='center', va='center', transform=ax.transAxes)
            self.results_canvas.draw()
    
    def plot_parameter_distributions(self):
        """绘制参数分布图"""
        samples = self.analysis_results.get('samples', {})
        if not samples:
            return
        
        n_params = len(samples)
        if n_params == 0:
            return
        
        # 计算子图布局
        n_cols = min(3, n_params)
        n_rows = (n_params + n_cols - 1) // n_cols
        
        for i, (param_name, param_samples) in enumerate(samples.items()):
            ax = self.results_figure.add_subplot(n_rows, n_cols, i + 1)
            
            # 绘制直方图
            ax.hist(param_samples, bins=50, alpha=0.7, density=True)
            ax.set_xlabel(param_name)
            ax.set_ylabel('概率密度')
            ax.set_title(f'{param_name} 分布')
            ax.grid(True, alpha=0.3)
        
        self.results_figure.tight_layout()
    
    def plot_statistical_summary(self):
        """绘制统计摘要"""
        samples = self.analysis_results.get('samples', {})
        if not samples:
            return
        
        # 计算统计量
        stats_data = []
        for param_name, param_samples in samples.items():
            stats_data.append({
                'Parameter': param_name,
                'Mean': np.mean(param_samples),
                'Std': np.std(param_samples),
                'Min': np.min(param_samples),
                'Max': np.max(param_samples),
                'P5': np.percentile(param_samples, 5),
                'P95': np.percentile(param_samples, 95)
            })
        
        # 创建表格式显示
        ax = self.results_figure.add_subplot(111)
        ax.axis('tight')
        ax.axis('off')
        
        # 准备表格数据
        table_data = []
        headers = ['参数', '均值', '标准差', '最小值', '最大值', 'P5', 'P95']
        
        for stat in stats_data:
            row = [
                stat['Parameter'],
                f"{stat['Mean']:.3f}",
                f"{stat['Std']:.3f}",
                f"{stat['Min']:.3f}",
                f"{stat['Max']:.3f}",
                f"{stat['P5']:.3f}",
                f"{stat['P95']:.3f}"
            ]
            table_data.append(row)
        
        table = ax.table(cellText=table_data, colLabels=headers,
                        cellLoc='center', loc='center')
        table.auto_set_font_size(False)
        table.set_fontsize(9)
        table.scale(1.2, 1.5)
        
        ax.set_title('参数统计摘要', fontsize=14, fontweight='bold')
        
        # 更新统计信息文本
        stats_text = "不确定性分析结果统计:\n"
        stats_text += f"样本数量: {self.analysis_results.get('n_samples', 0):,}\n"
        stats_text += f"参数数量: {len(samples)}\n\n"
        
        for stat in stats_data:
            stats_text += f"{stat['Parameter']}:\n"
            stats_text += f"  均值±标准差: {stat['Mean']:.3f}±{stat['Std']:.3f}\n"
            stats_text += f"  95%置信区间: [{stat['P5']:.3f}, {stat['P95']:.3f}]\n"
        
        self.results_stats_text.setText(stats_text)
    
    def plot_correlation_analysis(self):
        """绘制相关性分析"""
        samples = self.analysis_results.get('samples', {})
        if len(samples) < 2:
            return
        
        # 准备数据
        param_names = list(samples.keys())
        data_matrix = np.column_stack([samples[name] for name in param_names])
        
        # 计算相关矩阵
        correlation_matrix = np.corrcoef(data_matrix.T)
        
        # 绘制热图
        ax = self.results_figure.add_subplot(111)
        im = ax.imshow(correlation_matrix, cmap='RdBu_r', vmin=-1, vmax=1)
        
        # 设置标签
        ax.set_xticks(range(len(param_names)))
        ax.set_yticks(range(len(param_names)))
        ax.set_xticklabels(param_names, rotation=45)
        ax.set_yticklabels(param_names)
        
        # 添加数值标注
        for i in range(len(param_names)):
            for j in range(len(param_names)):
                text = ax.text(j, i, f'{correlation_matrix[i, j]:.2f}',
                             ha="center", va="center", color="black")
        
        ax.set_title('参数相关性矩阵')
        self.results_figure.colorbar(im, ax=ax, label='相关系数')
    
    def plot_probability_density(self):
        """绘制概率密度函数"""
        samples = self.analysis_results.get('samples', {})
        if not samples:
            return
        
        ax = self.results_figure.add_subplot(111)
        
        for param_name, param_samples in samples.items():
            # 计算概率密度
            from scipy.stats import gaussian_kde
            kde = gaussian_kde(param_samples)
            x_range = np.linspace(param_samples.min(), param_samples.max(), 100)
            density = kde(x_range)
            
            ax.plot(x_range, density, label=param_name, alpha=0.7)
        
        ax.set_xlabel('参数值')
        ax.set_ylabel('概率密度')
        ax.set_title('参数概率密度函数')
        ax.legend()
        ax.grid(True, alpha=0.3)
    
    def plot_cumulative_distribution(self):
        """绘制累积分布函数"""
        samples = self.analysis_results.get('samples', {})
        if not samples:
            return
        
        ax = self.results_figure.add_subplot(111)
        
        for param_name, param_samples in samples.items():
            # 排序数据
            sorted_samples = np.sort(param_samples)
            n = len(sorted_samples)
            cumulative_prob = np.arange(1, n + 1) / n
            
            ax.plot(sorted_samples, cumulative_prob, label=param_name, alpha=0.7)
        
        ax.set_xlabel('参数值')
        ax.set_ylabel('累积概率')
        ax.set_title('参数累积分布函数')
        ax.legend()
        ax.grid(True, alpha=0.3)
    
    def update_sensitivity_results(self):
        """更新敏感性分析结果"""
        sensitivity_results = self.analysis_results.get('sensitivity', {})
        if not sensitivity_results:
            return
        
        # 更新敏感性表格
        indices = sensitivity_results.get('indices', {})
        if indices:
            self.sensitivity_table.setRowCount(len(indices))
            
            # 按敏感性指数排序
            sorted_indices = sorted(indices.items(), key=lambda x: x[1], reverse=True)
            
            for i, (param_name, sensitivity_value) in enumerate(sorted_indices):
                self.sensitivity_table.setItem(i, 0, QTableWidgetItem(param_name))
                self.sensitivity_table.setItem(i, 1, QTableWidgetItem(f"{sensitivity_value:.4f}"))
                self.sensitivity_table.setItem(i, 2, QTableWidgetItem("N/A"))  # 标准误差
                self.sensitivity_table.setItem(i, 3, QTableWidgetItem(str(i + 1)))
        
        # 绘制敏感性图表
        self.plot_sensitivity_results()
    
    def plot_sensitivity_results(self):
        """绘制敏感性分析结果"""
        sensitivity_results = self.analysis_results.get('sensitivity', {})
        if not sensitivity_results:
            return
        
        # 清除之前的图表
        self.sensitivity_figure.clear()
        
        indices = sensitivity_results.get('indices', {})
        if not indices:
            return
        
        # 排序
        sorted_indices = sorted(indices.items(), key=lambda x: x[1], reverse=True)
        param_names = [item[0] for item in sorted_indices]
        sensitivity_values = [item[1] for item in sorted_indices]
        
        # 绘制条形图
        ax = self.sensitivity_figure.add_subplot(111)
        bars = ax.barh(param_names, sensitivity_values)
        
        # 设置颜色
        colors = plt.cm.viridis(np.linspace(0, 1, len(bars)))
        for bar, color in zip(bars, colors):
            bar.set_color(color)
        
        ax.set_xlabel('敏感性指数')
        ax.set_title('参数敏感性分析结果')
        ax.grid(True, alpha=0.3)
        
        # 添加数值标注
        for i, (bar, value) in enumerate(zip(bars, sensitivity_values)):
            ax.text(value + max(sensitivity_values) * 0.01, i,
                   f'{value:.4f}', va='center')
        
        self.sensitivity_figure.tight_layout()
        self.sensitivity_canvas.draw()
    
    def export_results(self):
        """导出结果"""
        if not self.analysis_results:
            QMessageBox.warning(self, "警告", "没有可导出的结果")
            return
        
        file_path, _ = QFileDialog.getSaveFileName(
            self, "导出不确定性分析结果", "", 
            "JSON文件 (*.json);;Excel文件 (*.xlsx);;CSV文件 (*.csv)"
        )
        
        if file_path:
            try:
                if file_path.endswith('.json'):
                    # 导出为JSON
                    export_data = {
                        'analysis_results': self.analysis_results,
                        'parameters': self.uncertain_parameters,
                        'export_time': time.time()
                    }
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(export_data, f, ensure_ascii=False, indent=2, default=str)
                
                elif file_path.endswith('.xlsx'):
                    # 导出为Excel
                    with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
                        # 导出样本数据
                        samples_df = pd.DataFrame(self.analysis_results.get('samples', {}))
                        samples_df.to_excel(writer, sheet_name='Samples', index=False)
                        
                        # 导出敏感性结果
                        if 'sensitivity' in self.analysis_results:
                            sensitivity_data = self.analysis_results['sensitivity'].get('indices', {})
                            sensitivity_df = pd.DataFrame([
                                {'Parameter': k, 'Sensitivity': v} 
                                for k, v in sensitivity_data.items()
                            ])
                            sensitivity_df.to_excel(writer, sheet_name='Sensitivity', index=False)
                
                elif file_path.endswith('.csv'):
                    # 导出样本数据为CSV
                    samples_df = pd.DataFrame(self.analysis_results.get('samples', {}))
                    samples_df.to_csv(file_path, index=False, encoding='utf-8-sig')
                
                QMessageBox.information(self, "成功", f"结果已导出到: {file_path}")
                
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导出失败: {str(e)}")

class ParameterEditDialog(QDialog):
    """参数编辑对话框"""
    
    def __init__(self, param_data=None, parent=None):
        super().__init__(parent)
        self.param_data = param_data or {}
        self.setWindowTitle("编辑不确定参数")
        self.setModal(True)
        self.resize(400, 500)
        self.setup_ui()
        
        if param_data:
            self.load_parameter_data()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        # 基本信息
        basic_group = QGroupBox("基本信息")
        basic_layout = QFormLayout(basic_group)
        
        self.name = QLineEdit()
        basic_layout.addRow("参数名称:", self.name)
        
        self.param_type = QComboBox()
        self.param_type.addItems([
            "地质参数", "物性参数", "几何参数", "边界条件", "计算参数"
        ])
        basic_layout.addRow("参数类型:", self.param_type)
        
        self.description = QTextEdit()
        self.description.setMaximumHeight(60)
        basic_layout.addRow("参数描述:", self.description)
        
        layout.addWidget(basic_group)
        
        # 分布设置
        dist_group = QGroupBox("概率分布")
        dist_layout = QFormLayout(dist_group)
        
        self.distribution = QComboBox()
        self.distribution.addItems([
            "正态分布", "对数正态分布", "均匀分布", "三角分布", 
            "Beta分布", "Gamma分布", "指数分布"
        ])
        self.distribution.currentTextChanged.connect(self.on_distribution_changed)
        dist_layout.addRow("分布类型:", self.distribution)
        
        self.param1 = QDoubleSpinBox()
        self.param1.setRange(-9999999, 9999999)
        self.param1.setDecimals(6)
        self.param1_label = QLabel("参数1:")
        dist_layout.addRow(self.param1_label, self.param1)
        
        self.param2 = QDoubleSpinBox()
        self.param2.setRange(-9999999, 9999999)
        self.param2.setDecimals(6)
        self.param2_label = QLabel("参数2:")
        dist_layout.addRow(self.param2_label, self.param2)
        
        layout.addWidget(dist_group)
        
        # 约束条件
        constraint_group = QGroupBox("约束条件")
        constraint_layout = QFormLayout(constraint_group)
        
        self.min_val = QDoubleSpinBox()
        self.min_val.setRange(-9999999, 9999999)
        self.min_val.setValue(-9999999)
        self.min_val.setDecimals(6)
        constraint_layout.addRow("最小值:", self.min_val)
        
        self.max_val = QDoubleSpinBox()
        self.max_val.setRange(-9999999, 9999999)
        self.max_val.setValue(9999999)
        self.max_val.setDecimals(6)
        constraint_layout.addRow("最大值:", self.max_val)
        
        layout.addWidget(constraint_group)
        
        # 预览
        preview_group = QGroupBox("分布预览")
        preview_layout = QVBoxLayout(preview_group)
        
        self.preview_figure = Figure(figsize=(6, 3))
        self.preview_canvas = FigureCanvas(self.preview_figure)
        preview_layout.addWidget(self.preview_canvas)
        
        preview_btn = QPushButton("更新预览")
        preview_btn.clicked.connect(self.update_preview)
        preview_layout.addWidget(preview_btn)
        
        layout.addWidget(preview_group)
        
        # 按钮
        button_box = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        button_box.accepted.connect(self.accept)
        button_box.rejected.connect(self.reject)
        layout.addWidget(button_box)
        
        # 初始化分布标签
        self.on_distribution_changed()
    
    def on_distribution_changed(self):
        """分布类型改变时更新参数标签"""
        dist_type = self.distribution.currentText()
        
        if dist_type == "正态分布":
            self.param1_label.setText("均值:")
            self.param2_label.setText("标准差:")
        elif dist_type == "对数正态分布":
            self.param1_label.setText("对数均值:")
            self.param2_label.setText("对数标准差:")
        elif dist_type == "均匀分布":
            self.param1_label.setText("下界:")
            self.param2_label.setText("上界:")
        elif dist_type == "三角分布":
            self.param1_label.setText("最小值:")
            self.param2_label.setText("最大值:")
        elif dist_type == "Beta分布":
            self.param1_label.setText("形状参数α:")
            self.param2_label.setText("形状参数β:")
        elif dist_type == "Gamma分布":
            self.param1_label.setText("形状参数:")
            self.param2_label.setText("尺度参数:")
        elif dist_type == "指数分布":
            self.param1_label.setText("率参数:")
            self.param2_label.setText("(未使用)")
        
        self.update_preview()
    
    def update_preview(self):
        """更新分布预览"""
        self.preview_figure.clear()
        ax = self.preview_figure.add_subplot(111)
        
        try:
            dist_type = self.distribution.currentText()
            param1 = self.param1.value()
            param2 = self.param2.value()
            min_val = self.min_val.value()
            max_val = self.max_val.value()
            
            # 生成样本用于预览
            if dist_type == "正态分布":
                samples = np.random.normal(param1, param2, 1000)
            elif dist_type == "对数正态分布":
                samples = np.random.lognormal(param1, param2, 1000)
            elif dist_type == "均匀分布":
                samples = np.random.uniform(param1, param2, 1000)
            elif dist_type == "三角分布":
                # 简化处理，使用均匀分布
                samples = np.random.uniform(param1, param2, 1000)
            else:
                samples = np.random.normal(0, 1, 1000)
            
            # 应用约束
            if min_val > -9999999:
                samples = samples[samples >= min_val]
            if max_val < 9999999:
                samples = samples[samples <= max_val]
            
            # 绘制直方图
            ax.hist(samples, bins=50, alpha=0.7, density=True)
            ax.set_xlabel('参数值')
            ax.set_ylabel('概率密度')
            ax.set_title(f'{dist_type} 预览')
            ax.grid(True, alpha=0.3)
            
        except Exception as e:
            ax.text(0.5, 0.5, f"预览错误:\n{str(e)}", 
                   ha='center', va='center', transform=ax.transAxes)
        
        self.preview_figure.tight_layout()
        self.preview_canvas.draw()
    
    def load_parameter_data(self):
        """加载参数数据"""
        self.name.setText(self.param_data.get('name', ''))
        
        param_type = self.param_data.get('type', '地质参数')
        type_index = self.param_type.findText(param_type)
        if type_index >= 0:
            self.param_type.setCurrentIndex(type_index)
        
        self.description.setPlainText(self.param_data.get('description', ''))
        
        distribution = self.param_data.get('distribution', '正态分布')
        dist_index = self.distribution.findText(distribution)
        if dist_index >= 0:
            self.distribution.setCurrentIndex(dist_index)
        
        self.param1.setValue(self.param_data.get('param1', 0))
        self.param2.setValue(self.param_data.get('param2', 1))
        self.min_val.setValue(self.param_data.get('min_val', -9999999))
        self.max_val.setValue(self.param_data.get('max_val', 9999999))
        
        self.update_preview()
    
    def get_parameter_data(self):
        """获取参数数据"""
        return {
            'name': self.name.text(),
            'type': self.param_type.currentText(),
            'description': self.description.toPlainText(),
            'distribution': self.distribution.currentText(),
            'param1': self.param1.value(),
            'param2': self.param2.value(),
            'min_val': self.min_val.value(),
            'max_val': self.max_val.value()
        }

class UncertaintyAnalysisThread(QThread):
    """不确定性分析线程"""
    
    progress_updated = pyqtSignal(int)
    status_updated = pyqtSignal(str)
    analysis_finished = pyqtSignal(dict)
    error_occurred = pyqtSignal(str)
    
    def __init__(self, geological_model, analysis_params):
        super().__init__()
        self.geological_model = geological_model
        self.analysis_params = analysis_params
        self.should_stop = False
    
    def run(self):
        """执行不确定性分析"""
        try:
            results = {}
            
            # 生成样本
            self.status_updated.emit("生成参数样本...")
            samples = self.generate_samples()
            results['samples'] = samples
            results['n_samples'] = len(next(iter(samples.values())))
            self.progress_updated.emit(30)
            
            if self.should_stop:
                return
            
            # 执行模型评估（简化）
            self.status_updated.emit("评估模型响应...")
            model_responses = self.evaluate_model(samples)
            results['model_responses'] = model_responses
            self.progress_updated.emit(60)
            
            if self.should_stop:
                return
            
            # 敏感性分析
            if self.analysis_params['methods']['sensitivity']:
                self.status_updated.emit("执行敏感性分析...")
                sensitivity_results = self.perform_sensitivity_analysis(samples, model_responses)
                results['sensitivity'] = sensitivity_results
            
            self.progress_updated.emit(90)
            
            # 完成分析
            results['methods_used'] = self.analysis_params['methods']
            results['analysis_time'] = time.time()
            
            self.progress_updated.emit(100)
            self.analysis_finished.emit(results)
            
        except Exception as e:
            self.error_occurred.emit(str(e))
    
    def generate_samples(self):
        """生成参数样本"""
        np.random.seed(self.analysis_params['random_seed'])
        
        n_samples = self.analysis_params['n_samples']
        parameters = self.analysis_params['parameters']
        
        samples = {}
        
        for param in parameters:
            param_name = param['name']
            dist_type = param['distribution']
            param1 = param['param1']
            param2 = param['param2']
            min_val = param.get('min_val', -np.inf)
            max_val = param.get('max_val', np.inf)
            
            # 根据分布类型生成样本
            if dist_type == "正态分布":
                param_samples = np.random.normal(param1, param2, n_samples)
            elif dist_type == "对数正态分布":
                param_samples = np.random.lognormal(param1, param2, n_samples)
            elif dist_type == "均匀分布":
                param_samples = np.random.uniform(param1, param2, n_samples)
            elif dist_type == "三角分布":
                # 简化为均匀分布
                param_samples = np.random.uniform(param1, param2, n_samples)
            else:
                # 默认正态分布
                param_samples = np.random.normal(param1, param2, n_samples)
            
            # 应用约束
            param_samples = np.clip(param_samples, min_val, max_val)
            
            samples[param_name] = param_samples
        
        return samples
    
    def evaluate_model(self, samples):
        """评估模型响应（简化实现）"""
        # 这里应该是实际的地质模型计算
        # 简化处理，生成一些合成响应
        
        n_samples = len(next(iter(samples.values())))
        
        # 模拟一个简单的地质响应函数
        responses = {}
        
        # 假设我们计算重力异常
        if 'density' in samples:
            density_samples = samples['density']
            # 简化的重力响应计算
            gravity_responses = density_samples * 100 + np.random.normal(0, 10, n_samples)
            responses['gravity_anomaly'] = gravity_responses
        
        # 假设我们计算模型体积
        volume_responses = np.random.lognormal(5, 0.5, n_samples)
        responses['model_volume'] = volume_responses
        
        return responses
    
    def perform_sensitivity_analysis(self, samples, model_responses):
        """执行敏感性分析"""
        sensitivity_results = {}
        
        # 选择一个响应变量进行敏感性分析
        if 'model_volume' in model_responses:
            response_var = model_responses['model_volume']
            
            # 计算每个参数的敏感性指数（基于相关性）
            indices = {}
            for param_name, param_samples in samples.items():
                # 计算Pearson相关系数作为敏感性指数
                correlation = np.corrcoef(param_samples, response_var)[0, 1]
                indices[param_name] = abs(correlation)
            
            sensitivity_results['indices'] = indices
        
        return sensitivity_results
    
    def stop(self):
        """停止分析"""
        self.should_stop = True

# 继续实现3D可视化模块...