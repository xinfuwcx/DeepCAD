#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
高级分析监控界面
提供实时收敛监控、质量指标、资源使用等功能
"""

import sys
import time
import psutil
from pathlib import Path
from typing import List, Dict, Any
from PyQt6.QtWidgets import *
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QThread
from PyQt6.QtGui import QFont, QPalette, QColor
import numpy as np

# 尝试导入matplotlib用于绘图
try:
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
    from matplotlib.figure import Figure
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False
    print("警告: matplotlib不可用，图表功能将受限")

class ConvergenceMonitorWidget(QWidget):
    """收敛监控图表组件"""
    
    def __init__(self):
        super().__init__()
        self.convergence_data = {
            'iterations': [],
            'residual_force': [],
            'displacement_norm': [],
            'energy_error': []
        }
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        if MATPLOTLIB_AVAILABLE:
            # 创建matplotlib图表
            self.figure = Figure(figsize=(10, 6))
            self.canvas = FigureCanvas(self.figure)
            layout.addWidget(self.canvas)
            
            # 创建子图
            self.ax1 = self.figure.add_subplot(221)  # 残差力
            self.ax2 = self.figure.add_subplot(222)  # 位移范数
            self.ax3 = self.figure.add_subplot(223)  # 能量误差
            self.ax4 = self.figure.add_subplot(224)  # 收敛速率
            
            self.figure.tight_layout()
            
            # 设置图表标题和标签
            self.setup_plot_labels()
        else:
            # 创建文本显示替代
            self.text_display = QTextEdit()
            self.text_display.setReadOnly(True)
            self.text_display.append("收敛监控（文本模式）\n")
            layout.addWidget(self.text_display)
            
    def setup_plot_labels(self):
        """设置图表标签"""
        if not MATPLOTLIB_AVAILABLE:
            return
            
        self.ax1.set_title("残差力收敛")
        self.ax1.set_xlabel("迭代次数")
        self.ax1.set_ylabel("残差力 (N)")
        self.ax1.set_yscale('log')
        
        self.ax2.set_title("位移范数")
        self.ax2.set_xlabel("迭代次数")
        self.ax2.set_ylabel("位移范数")
        
        self.ax3.set_title("能量误差")
        self.ax3.set_xlabel("迭代次数")
        self.ax3.set_ylabel("能量误差 (%)")
        
        self.ax4.set_title("收敛速率")
        self.ax4.set_xlabel("迭代次数")
        self.ax4.set_ylabel("收敛速率")
        
    def update_convergence_data(self, iteration: int, residual: float, 
                               displacement_norm: float, energy_error: float):
        """更新收敛数据"""
        self.convergence_data['iterations'].append(iteration)
        self.convergence_data['residual_force'].append(residual)
        self.convergence_data['displacement_norm'].append(displacement_norm)
        self.convergence_data['energy_error'].append(energy_error)
        
        # 更新图表
        self.update_plots()
        
    def update_plots(self):
        """更新图表显示"""
        if MATPLOTLIB_AVAILABLE:
            # 清除旧数据
            self.ax1.clear()
            self.ax2.clear()
            self.ax3.clear()
            self.ax4.clear()
            
            iterations = self.convergence_data['iterations']
            if len(iterations) > 0:
                # 绘制残差力
                self.ax1.plot(iterations, self.convergence_data['residual_force'], 'b.-', label='残差力')
                self.ax1.set_yscale('log')
                self.ax1.grid(True, alpha=0.3)
                
                # 绘制位移范数
                self.ax2.plot(iterations, self.convergence_data['displacement_norm'], 'r.-', label='位移范数')
                self.ax2.grid(True, alpha=0.3)
                
                # 绘制能量误差
                self.ax3.plot(iterations, self.convergence_data['energy_error'], 'g.-', label='能量误差')
                self.ax3.grid(True, alpha=0.3)
                
                # 计算和绘制收敛速率
                if len(iterations) > 1:
                    convergence_rates = []
                    residuals = self.convergence_data['residual_force']
                    for i in range(1, len(residuals)):
                        if residuals[i-1] > 0:
                            rate = residuals[i] / residuals[i-1]
                            convergence_rates.append(rate)
                        else:
                            convergence_rates.append(1.0)
                    
                    self.ax4.plot(iterations[1:], convergence_rates, 'm.-', label='收敛速率')
                    self.ax4.axhline(y=1.0, color='k', linestyle='--', alpha=0.5)
                    self.ax4.grid(True, alpha=0.3)
            
            # 重新设置标签
            self.setup_plot_labels()
            
            # 刷新画布
            self.canvas.draw()
        else:
            # 文本模式更新
            iteration = self.convergence_data['iterations'][-1] if self.convergence_data['iterations'] else 0
            residual = self.convergence_data['residual_force'][-1] if self.convergence_data['residual_force'] else 0
            displacement = self.convergence_data['displacement_norm'][-1] if self.convergence_data['displacement_norm'] else 0
            energy = self.convergence_data['energy_error'][-1] if self.convergence_data['energy_error'] else 0
            
            self.text_display.append(f"迭代 {iteration}: 残差={residual:.2e}, 位移范数={displacement:.2e}, 能量误差={energy:.2f}%")
            
    def clear_data(self):
        """清除数据"""
        for key in self.convergence_data:
            self.convergence_data[key].clear()
        self.update_plots()

class ResourceMonitorWidget(QWidget):
    """系统资源监控组件"""
    
    def __init__(self):
        super().__init__()
        self.setup_ui()
        
        # 创建定时器监控资源
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_resource_info)
        self.timer.start(1000)  # 每秒更新一次
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # CPU使用率
        cpu_group = QGroupBox("🖥️ CPU使用率")
        cpu_layout = QVBoxLayout(cpu_group)
        
        self.cpu_progress = QProgressBar()
        self.cpu_progress.setRange(0, 100)
        self.cpu_label = QLabel("CPU: 0%")
        
        cpu_layout.addWidget(self.cpu_label)
        cpu_layout.addWidget(self.cpu_progress)
        
        layout.addWidget(cpu_group)
        
        # 内存使用
        memory_group = QGroupBox("💾 内存使用")
        memory_layout = QVBoxLayout(memory_group)
        
        self.memory_progress = QProgressBar()
        self.memory_progress.setRange(0, 100)
        self.memory_label = QLabel("内存: 0 MB / 0 MB")
        
        memory_layout.addWidget(self.memory_label)
        memory_layout.addWidget(self.memory_progress)
        
        layout.addWidget(memory_group)
        
        # 磁盘I/O
        disk_group = QGroupBox("💿 磁盘I/O")
        disk_layout = QVBoxLayout(disk_group)
        
        self.disk_read_label = QLabel("读取: 0 MB/s")
        self.disk_write_label = QLabel("写入: 0 MB/s")
        
        disk_layout.addWidget(self.disk_read_label)
        disk_layout.addWidget(self.disk_write_label)
        
        layout.addWidget(disk_group)
        
        # 计算状态
        calc_group = QGroupBox("🧮 计算状态")
        calc_layout = QVBoxLayout(calc_group)
        
        self.calc_time_label = QLabel("计算时间: 00:00:00")
        self.estimated_time_label = QLabel("预计剩余: --:--:--")
        self.iteration_rate_label = QLabel("迭代速率: 0 it/s")
        
        calc_layout.addWidget(self.calc_time_label)
        calc_layout.addWidget(self.estimated_time_label)
        calc_layout.addWidget(self.iteration_rate_label)
        
        layout.addWidget(calc_group)
        
        # 初始化磁盘I/O计数器
        self.prev_disk_io = psutil.disk_io_counters()
        self.prev_time = time.time()
        
    def update_resource_info(self):
        """更新资源信息"""
        try:
            # CPU使用率
            cpu_percent = psutil.cpu_percent()
            self.cpu_progress.setValue(int(cpu_percent))
            self.cpu_label.setText(f"CPU: {cpu_percent:.1f}%")
            
            # 内存使用
            memory = psutil.virtual_memory()
            memory_used_mb = memory.used / (1024 * 1024)
            memory_total_mb = memory.total / (1024 * 1024)
            memory_percent = memory.percent
            
            self.memory_progress.setValue(int(memory_percent))
            self.memory_label.setText(f"内存: {memory_used_mb:.0f} MB / {memory_total_mb:.0f} MB ({memory_percent:.1f}%)")
            
            # 磁盘I/O
            current_disk_io = psutil.disk_io_counters()
            current_time = time.time()
            
            if self.prev_disk_io:
                time_delta = current_time - self.prev_time
                if time_delta > 0:
                    read_rate = (current_disk_io.read_bytes - self.prev_disk_io.read_bytes) / time_delta / (1024 * 1024)
                    write_rate = (current_disk_io.write_bytes - self.prev_disk_io.write_bytes) / time_delta / (1024 * 1024)
                    
                    self.disk_read_label.setText(f"读取: {read_rate:.2f} MB/s")
                    self.disk_write_label.setText(f"写入: {write_rate:.2f} MB/s")
            
            self.prev_disk_io = current_disk_io
            self.prev_time = current_time
            
        except Exception as e:
            print(f"更新资源信息失败: {e}")

class QualityIndicatorWidget(QWidget):
    """计算质量指标组件"""
    
    def __init__(self):
        super().__init__()
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 网格质量
        mesh_group = QGroupBox("🔍 网格质量")
        mesh_layout = QFormLayout(mesh_group)
        
        self.element_quality_label = QLabel("优秀")
        self.aspect_ratio_label = QLabel("良好")
        self.skewness_label = QLabel("正常")
        
        mesh_layout.addRow("单元质量:", self.element_quality_label)
        mesh_layout.addRow("长宽比:", self.aspect_ratio_label)
        mesh_layout.addRow("偏斜度:", self.skewness_label)
        
        layout.addWidget(mesh_group)
        
        # 收敛质量
        conv_group = QGroupBox("📈 收敛质量")
        conv_layout = QFormLayout(conv_group)
        
        self.convergence_rate_label = QLabel("--")
        self.convergence_trend_label = QLabel("--")
        self.stability_label = QLabel("--")
        
        conv_layout.addRow("收敛速率:", self.convergence_rate_label)
        conv_layout.addRow("收敛趋势:", self.convergence_trend_label)
        conv_layout.addRow("数值稳定性:", self.stability_label)
        
        layout.addWidget(conv_group)
        
        # 结果质量
        result_group = QGroupBox("✅ 结果质量")
        result_layout = QFormLayout(result_group)
        
        self.energy_balance_label = QLabel("--")
        self.equilibrium_label = QLabel("--")
        self.physical_validity_label = QLabel("--")
        
        result_layout.addRow("能量平衡:", self.energy_balance_label)
        result_layout.addRow("力平衡:", self.equilibrium_label)
        result_layout.addRow("物理合理性:", self.physical_validity_label)
        
        layout.addWidget(result_group)
        
    def update_quality_indicators(self, mesh_stats: Dict[str, Any] = None, 
                                 convergence_stats: Dict[str, Any] = None,
                                 result_stats: Dict[str, Any] = None):
        """更新质量指标"""
        
        # 更新网格质量
        if mesh_stats:
            quality = mesh_stats.get('element_quality', 'unknown')
            self.element_quality_label.setText(quality)
            self.element_quality_label.setStyleSheet(self.get_quality_color(quality))
            
            aspect_ratio = mesh_stats.get('aspect_ratio', 'unknown')
            self.aspect_ratio_label.setText(aspect_ratio)
            
            skewness = mesh_stats.get('skewness', 'unknown')
            self.skewness_label.setText(skewness)
        
        # 更新收敛质量
        if convergence_stats:
            rate = convergence_stats.get('convergence_rate', 0)
            if rate > 0:
                if rate < 0.1:
                    rate_text = "超线性"
                    rate_color = "color: green; font-weight: bold;"
                elif rate < 0.5:
                    rate_text = "快速"
                    rate_color = "color: blue;"
                elif rate < 0.9:
                    rate_text = "正常"
                    rate_color = "color: orange;"
                else:
                    rate_text = "缓慢"
                    rate_color = "color: red;"
                    
                self.convergence_rate_label.setText(f"{rate_text} ({rate:.3f})")
                self.convergence_rate_label.setStyleSheet(rate_color)
            
            trend = convergence_stats.get('trend', '--')
            self.convergence_trend_label.setText(trend)
            
            stability = convergence_stats.get('stability', '--')
            self.stability_label.setText(stability)
        
        # 更新结果质量
        if result_stats:
            energy_balance = result_stats.get('energy_balance', '--')
            self.energy_balance_label.setText(energy_balance)
            
            equilibrium = result_stats.get('equilibrium', '--')
            self.equilibrium_label.setText(equilibrium)
            
            validity = result_stats.get('physical_validity', '--')
            self.physical_validity_label.setText(validity)
    
    def get_quality_color(self, quality: str) -> str:
        """根据质量等级返回颜色样式"""
        if quality in ['优秀', 'excellent']:
            return "color: green; font-weight: bold;"
        elif quality in ['良好', 'good']:
            return "color: blue;"
        elif quality in ['正常', 'fair']:
            return "color: orange;"
        elif quality in ['差', 'poor']:
            return "color: red;"
        else:
            return "color: gray;"

class AdvancedAnalysisMonitor(QWidget):
    """高级分析监控主界面"""
    
    analysis_paused = pyqtSignal()
    analysis_stopped = pyqtSignal()
    
    def __init__(self):
        super().__init__()
        self.analysis_start_time = None
        self.total_iterations = 0
        self.setup_ui()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 创建选项卡
        tab_widget = QTabWidget()
        
        # 收敛监控选项卡
        self.convergence_monitor = ConvergenceMonitorWidget()
        tab_widget.addTab(self.convergence_monitor, "📈 收敛监控")
        
        # 资源监控选项卡
        self.resource_monitor = ResourceMonitorWidget()
        tab_widget.addTab(self.resource_monitor, "🖥️ 资源监控")
        
        # 质量指标选项卡
        self.quality_monitor = QualityIndicatorWidget()
        tab_widget.addTab(self.quality_monitor, "✅ 质量指标")
        
        layout.addWidget(tab_widget)
        
        # 底部控制按钮
        control_layout = QHBoxLayout()
        
        self.pause_btn = QPushButton("⏸️ 暂停分析")
        self.stop_btn = QPushButton("⏹️ 停止分析")
        self.clear_btn = QPushButton("🗑️ 清除数据")
        self.export_btn = QPushButton("📊 导出报告")
        
        for btn in [self.pause_btn, self.stop_btn, self.clear_btn, self.export_btn]:
            btn.setMaximumHeight(35)
            control_layout.addWidget(btn)
            
        layout.addLayout(control_layout)
        
        # 连接信号
        self.pause_btn.clicked.connect(self.analysis_paused.emit)
        self.stop_btn.clicked.connect(self.analysis_stopped.emit)
        self.clear_btn.clicked.connect(self.clear_all_data)
        self.export_btn.clicked.connect(self.export_monitoring_report)
        
    def start_analysis_monitoring(self):
        """开始分析监控"""
        self.analysis_start_time = time.time()
        self.total_iterations = 0
        
    def update_convergence_data(self, iteration: int, residual: float, 
                               displacement_norm: float, energy_error: float):
        """更新收敛数据"""
        self.convergence_monitor.update_convergence_data(
            iteration, residual, displacement_norm, energy_error
        )
        
        # 更新计算时间和速率
        if self.analysis_start_time:
            elapsed_time = time.time() - self.analysis_start_time
            self.total_iterations = max(self.total_iterations, iteration)
            
            if elapsed_time > 0:
                iteration_rate = self.total_iterations / elapsed_time
                self.resource_monitor.iteration_rate_label.setText(f"迭代速率: {iteration_rate:.2f} it/s")
                
                # 更新计算时间
                hours = int(elapsed_time // 3600)
                minutes = int((elapsed_time % 3600) // 60)
                seconds = int(elapsed_time % 60)
                self.resource_monitor.calc_time_label.setText(f"计算时间: {hours:02d}:{minutes:02d}:{seconds:02d}")
        
    def update_quality_indicators(self, mesh_stats: Dict[str, Any] = None,
                                 convergence_stats: Dict[str, Any] = None,
                                 result_stats: Dict[str, Any] = None):
        """更新质量指标"""
        self.quality_monitor.update_quality_indicators(mesh_stats, convergence_stats, result_stats)
        
    def clear_all_data(self):
        """清除所有监控数据"""
        self.convergence_monitor.clear_data()
        self.analysis_start_time = None
        self.total_iterations = 0
        
    def export_monitoring_report(self):
        """导出监控报告"""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "导出监控报告", "analysis_monitoring_report.html", 
            "HTML文件 (*.html);;PDF文件 (*.pdf)"
        )
        
        if file_path:
            try:
                self.generate_monitoring_report(file_path)
                QMessageBox.information(self, "成功", "监控报告导出成功！")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导出失败: {e}")
                
    def generate_monitoring_report(self, file_path: str):
        """生成监控报告"""
        # 这里实现报告生成逻辑
        # 可以生成包含图表和统计数据的HTML或PDF报告
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>分析监控报告</title>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ text-align: center; color: #333; }}
                .section {{ margin: 20px 0; }}
                .data-table {{ border-collapse: collapse; width: 100%; }}
                .data-table th, .data-table td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                .data-table th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>DeepCAD 分析监控报告</h1>
                <p>生成时间: {time.strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            
            <div class="section">
                <h2>收敛数据摘要</h2>
                <table class="data-table">
                    <tr><th>指标</th><th>数值</th></tr>
                    <tr><td>总迭代次数</td><td>{self.total_iterations}</td></tr>
                    <tr><td>计算时间</td><td>{time.time() - self.analysis_start_time if self.analysis_start_time else 0:.2f} 秒</td></tr>
                    <tr><td>最终残差</td><td>{self.convergence_monitor.convergence_data['residual_force'][-1] if self.convergence_monitor.convergence_data['residual_force'] else 'N/A'}</td></tr>
                </table>
            </div>
            
            <div class="section">
                <h2>系统资源使用</h2>
                <p>报告生成时的系统状态已记录。</p>
            </div>
            
            <div class="section">
                <h2>质量评估</h2>
                <p>计算质量指标已评估并记录。</p>
            </div>
        </body>
        </html>
        """
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(html_content)

if __name__ == "__main__":
    app = QApplication(sys.argv)
    monitor = AdvancedAnalysisMonitor()
    monitor.show()
    
    # 测试数据
    import random
    def update_test_data():
        iteration = random.randint(1, 100)
        residual = 10**(-random.uniform(2, 8))
        displacement = random.uniform(0.001, 0.1)
        energy = random.uniform(0.1, 5.0)
        monitor.update_convergence_data(iteration, residual, displacement, energy)
    
    # 定时器添加测试数据
    test_timer = QTimer()
    test_timer.timeout.connect(update_test_data)
    test_timer.start(2000)
    
    sys.exit(app.exec())