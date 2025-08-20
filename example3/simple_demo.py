"""
Example3 简化演示版本
展示RBF插值和基础可视化功能，暂时绕过GemPy依赖问题
"""
import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QGridLayout, QTabWidget, QGroupBox, QLabel, QLineEdit, QSpinBox, 
    QComboBox, QPushButton, QProgressBar, QTextEdit, QFileDialog, 
    QMessageBox, QSlider, QFrame, QSplitter, QCheckBox
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal
from PyQt6.QtGui import QFont
from scipy.spatial.distance import cdist
from scipy.interpolate import RBFInterpolator

class ModernCard(QFrame):
    """现代化卡片组件"""
    def __init__(self, title="", parent=None):
        super().__init__(parent)
        self.setFrameStyle(QFrame.Shape.Box)
        self.setStyleSheet("""
            ModernCard {
                background-color: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                margin: 5px;
            }
            ModernCard:hover {
                border-color: #2196F3;
                box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
            }
        """)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(15, 15, 15, 15)
        
        if title:
            title_label = QLabel(title)
            title_label.setFont(QFont("Arial", 12, QFont.Weight.Bold))
            title_label.setStyleSheet("color: #333; margin-bottom: 10px;")
            layout.addWidget(title_label)
        
        self.content_layout = QVBoxLayout()
        layout.addLayout(self.content_layout)
        
    def add_widget(self, widget):
        self.content_layout.addWidget(widget)
        
    def add_layout(self, layout):
        self.content_layout.addLayout(layout)

class RBFInterpolationThread(QThread):
    """RBF插值计算线程"""
    progress_updated = pyqtSignal(int)
    status_updated = pyqtSignal(str)
    result_ready = pyqtSignal(dict)
    error_occurred = pyqtSignal(str)
    
    def __init__(self, coords, values, grid_coords, kernel='multiquadric', epsilon=1.0):
        super().__init__()
        self.coords = coords
        self.values = values
        self.grid_coords = grid_coords
        self.kernel = kernel
        self.epsilon = epsilon
        
    def run(self):
        try:
            self.status_updated.emit("正在初始化RBF插值器...")
            self.progress_updated.emit(20)
            
            # 创建RBF插值器
            rbf_interpolator = RBFInterpolator(
                self.coords, 
                self.values,
                kernel=self.kernel,
                epsilon=self.epsilon
            )
            
            self.progress_updated.emit(60)
            self.status_updated.emit("正在进行插值计算...")
            
            # 执行插值
            interpolated_values = rbf_interpolator(self.grid_coords)
            
            self.progress_updated.emit(100)
            self.status_updated.emit("插值完成")
            
            # 返回结果
            result = {
                'interpolated_values': interpolated_values,
                'grid_coords': self.grid_coords,
                'original_coords': self.coords,
                'original_values': self.values,
                'kernel': self.kernel,
                'epsilon': self.epsilon
            }
            
            self.result_ready.emit(result)
            
        except Exception as e:
            self.error_occurred.emit(str(e))

class Example3SimpleDemoGUI(QMainWindow):
    """Example3 简化演示界面"""
    
    def __init__(self):
        super().__init__()
        self.setup_ui()
        self.initialize_data()
        
    def setup_ui(self):
        """设置用户界面"""
        self.setWindowTitle("Example3 - 三维土体重建系统 (演示版)")
        self.setGeometry(100, 100, 1200, 800)
        
        # 设置样式
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f5f5f5;
            }
            QTabWidget::pane {
                border: 1px solid #c0c0c0;
                background-color: white;
                border-radius: 6px;
            }
            QTabBar::tab {
                background: #e0e0e0;
                color: #333;
                padding: 8px 20px;
                margin-right: 2px;
                border-top-left-radius: 6px;
                border-top-right-radius: 6px;
            }
            QTabBar::tab:selected {
                background: #2196F3;
                color: white;
            }
        """)
        
        # 中央部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QHBoxLayout(central_widget)
        splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(splitter)
        
        # 左侧控制面板
        self.create_control_panel(splitter)
        
        # 右侧显示面板
        self.create_display_panel(splitter)
        
        # 设置分割比例
        splitter.setSizes([350, 850])
        
        # 状态栏
        self.status_bar = self.statusBar()
        self.status_label = QLabel("就绪")
        self.status_bar.addWidget(self.status_label)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setMaximumWidth(200)
        self.status_bar.addPermanentWidget(self.progress_bar)
        
    def create_control_panel(self, parent):
        """创建控制面板"""
        control_widget = QWidget()
        control_layout = QVBoxLayout(control_widget)
        
        # 标题
        title = QLabel("三维土体重建系统")
        title.setFont(QFont("Arial", 16, QFont.Weight.Bold))
        title.setStyleSheet("color: #2196F3; margin: 10px 0;")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        control_layout.addWidget(title)
        
        # 数据生成卡片
        self.create_data_card(control_layout)
        
        # RBF参数卡片
        self.create_rbf_card(control_layout)
        
        # 插值控制卡片
        self.create_interpolation_card(control_layout)
        
        control_layout.addStretch()
        parent.addWidget(control_widget)
        
    def create_data_card(self, parent_layout):
        """创建数据生成卡片"""
        card = ModernCard("🕳️ 钻孔数据生成")
        
        # 数据参数
        params_layout = QGridLayout()
        
        params_layout.addWidget(QLabel("数据点数:"), 0, 0)
        self.n_points_spin = QSpinBox()
        self.n_points_spin.setRange(10, 200)
        self.n_points_spin.setValue(50)
        params_layout.addWidget(self.n_points_spin, 0, 1)
        
        params_layout.addWidget(QLabel("X范围:"), 1, 0)
        self.x_range_edit = QLineEdit("0-500")
        params_layout.addWidget(self.x_range_edit, 1, 1)
        
        params_layout.addWidget(QLabel("Y范围:"), 2, 0)
        self.y_range_edit = QLineEdit("0-500")
        params_layout.addWidget(self.y_range_edit, 2, 1)
        
        params_layout.addWidget(QLabel("Z范围:"), 3, 0)
        self.z_range_edit = QLineEdit("-50-0")
        params_layout.addWidget(self.z_range_edit, 3, 1)
        
        card.add_layout(params_layout)
        
        # 生成按钮
        generate_btn = QPushButton("生成示例数据")
        generate_btn.setStyleSheet("""
            QPushButton {
                background-color: #2196F3;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 8px 16px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #1976D2;
            }
        """)
        generate_btn.clicked.connect(self.generate_sample_data)
        card.add_widget(generate_btn)
        
        # 数据信息
        self.data_info_label = QLabel("暂无数据")
        self.data_info_label.setStyleSheet("""
            background-color: #FFF3E0;
            padding: 8px;
            border-radius: 4px;
            color: #F57C00;
        """)
        card.add_widget(self.data_info_label)
        
        parent_layout.addWidget(card)
        
    def create_rbf_card(self, parent_layout):
        """创建RBF参数卡片"""
        card = ModernCard("🔧 RBF插值参数")
        
        # 核函数选择
        kernel_layout = QHBoxLayout()
        kernel_layout.addWidget(QLabel("核函数:"))
        self.kernel_combo = QComboBox()
        self.kernel_combo.addItems([
            'multiquadric', 'inverse_multiquadric', 'gaussian',
            'linear', 'cubic', 'quintic', 'thin_plate_spline'
        ])
        kernel_layout.addWidget(self.kernel_combo)
        card.add_layout(kernel_layout)
        
        # Epsilon参数
        epsilon_layout = QHBoxLayout()
        epsilon_layout.addWidget(QLabel("Epsilon:"))
        self.epsilon_slider = QSlider(Qt.Orientation.Horizontal)
        self.epsilon_slider.setRange(1, 100)
        self.epsilon_slider.setValue(10)
        self.epsilon_value_label = QLabel("1.0")
        self.epsilon_slider.valueChanged.connect(
            lambda v: self.epsilon_value_label.setText(f"{v/10:.1f}")
        )
        epsilon_layout.addWidget(self.epsilon_slider)
        epsilon_layout.addWidget(self.epsilon_value_label)
        card.add_layout(epsilon_layout)
        
        parent_layout.addWidget(card)
        
    def create_interpolation_card(self, parent_layout):
        """创建插值控制卡片"""
        card = ModernCard("🚀 插值计算")
        
        # 网格分辨率
        grid_layout = QGridLayout()
        grid_layout.addWidget(QLabel("网格分辨率:"), 0, 0)
        self.grid_res_spin = QSpinBox()
        self.grid_res_spin.setRange(20, 100)
        self.grid_res_spin.setValue(50)
        grid_layout.addWidget(self.grid_res_spin, 0, 1)
        card.add_layout(grid_layout)
        
        # 计算按钮
        compute_btn = QPushButton("🚀 开始插值计算")
        compute_btn.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 6px;
                padding: 10px 20px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
        """)
        compute_btn.clicked.connect(self.start_interpolation)
        card.add_widget(compute_btn)
        
        # 显示选项
        self.show_points_check = QCheckBox("显示原始数据点")
        self.show_points_check.setChecked(True)
        card.add_widget(self.show_points_check)
        
        parent_layout.addWidget(card)
        
    def create_display_panel(self, parent):
        """创建显示面板"""
        self.display_tabs = QTabWidget()
        
        # 2D可视化页面
        self.create_2d_visualization_tab()
        
        # 统计信息页面
        self.create_stats_tab()
        
        parent.addWidget(self.display_tabs)
        
    def create_2d_visualization_tab(self):
        """创建2D可视化页面"""
        viz_widget = QWidget()
        layout = QVBoxLayout(viz_widget)
        
        # matplotlib图形
        self.figure = Figure(figsize=(12, 8), dpi=100)
        self.canvas = FigureCanvas(self.figure)
        layout.addWidget(self.canvas)
        
        self.display_tabs.addTab(viz_widget, "📊 2D可视化")
        
    def create_stats_tab(self):
        """创建统计信息页面"""
        stats_widget = QWidget()
        layout = QVBoxLayout(stats_widget)
        
        title = QLabel("📈 插值统计信息")
        title.setFont(QFont("Arial", 14, QFont.Weight.Bold))
        title.setStyleSheet("color: #2196F3; margin: 10px 0;")
        layout.addWidget(title)
        
        self.stats_text = QTextEdit()
        self.stats_text.setReadOnly(True)
        self.stats_text.setFont(QFont("Consolas", 10))
        self.stats_text.setStyleSheet("""
            QTextEdit {
                background-color: #f8f8f8;
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 10px;
            }
        """)
        layout.addWidget(self.stats_text)
        
        self.display_tabs.addTab(stats_widget, "📈 统计信息")
        
    def initialize_data(self):
        """初始化数据"""
        self.coords = None
        self.values = None
        self.interpolation_result = None
        
    def parse_range(self, range_text):
        """解析范围字符串"""
        try:
            parts = range_text.split('-')
            return float(parts[0]), float(parts[1])
        except:
            return 0, 100
            
    def generate_sample_data(self):
        """生成示例数据"""
        try:
            n_points = self.n_points_spin.value()
            x_min, x_max = self.parse_range(self.x_range_edit.text())
            y_min, y_max = self.parse_range(self.y_range_edit.text())
            z_min, z_max = self.parse_range(self.z_range_edit.text())
            
            # 生成随机数据点
            np.random.seed(42)
            x = np.random.uniform(x_min, x_max, n_points)
            y = np.random.uniform(y_min, y_max, n_points)
            z = np.random.uniform(z_min, z_max, n_points)
            
            self.coords = np.column_stack([x, y, z])
            
            # 生成模拟的土层值（基于高程的简单模型）
            self.values = np.sin(x/100) * np.cos(y/100) + z/10 + np.random.normal(0, 0.1, n_points)
            
            # 更新信息显示
            info_text = (f"数据点数: {n_points}\n"
                        f"X范围: {x.min():.1f} ~ {x.max():.1f} m\n"
                        f"Y范围: {y.min():.1f} ~ {y.max():.1f} m\n"
                        f"Z范围: {z.min():.1f} ~ {z.max():.1f} m\n"
                        f"值范围: {self.values.min():.2f} ~ {self.values.max():.2f}")
            self.data_info_label.setText(info_text)
            
            # 更新可视化
            self.update_visualization()
            
            self.status_label.setText("示例数据生成完成")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"生成数据失败: {str(e)}")
            
    def start_interpolation(self):
        """开始插值计算"""
        if self.coords is None or self.values is None:
            QMessageBox.warning(self, "警告", "请先生成数据")
            return
            
        try:
            # 创建插值网格
            x_min, x_max = self.parse_range(self.x_range_edit.text())
            y_min, y_max = self.parse_range(self.y_range_edit.text())
            z_min, z_max = self.parse_range(self.z_range_edit.text())
            
            res = self.grid_res_spin.value()
            x_grid = np.linspace(x_min, x_max, res)
            y_grid = np.linspace(y_min, y_max, res)
            z_mid = (z_min + z_max) / 2  # 在中间高程进行2D插值
            
            xx, yy = np.meshgrid(x_grid, y_grid)
            grid_coords = np.column_stack([xx.ravel(), yy.ravel(), 
                                         np.full(xx.ravel().shape, z_mid)])
            
            # 获取参数
            kernel = self.kernel_combo.currentText()
            epsilon = self.epsilon_slider.value() / 10.0
            
            # 启动计算线程
            self.progress_bar.setVisible(True)
            self.interpolation_thread = RBFInterpolationThread(
                self.coords, self.values, grid_coords, kernel, epsilon
            )
            
            self.interpolation_thread.progress_updated.connect(self.progress_bar.setValue)
            self.interpolation_thread.status_updated.connect(self.status_label.setText)
            self.interpolation_thread.result_ready.connect(self.on_interpolation_complete)
            self.interpolation_thread.error_occurred.connect(self.on_interpolation_error)
            
            self.interpolation_thread.start()
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"启动插值失败: {str(e)}")
            
    def on_interpolation_complete(self, result):
        """插值完成回调"""
        self.interpolation_result = result
        self.progress_bar.setVisible(False)
        
        # 更新可视化
        self.update_visualization()
        
        # 更新统计信息
        self.update_stats()
        
        QMessageBox.information(self, "成功", "RBF插值计算完成！")
        
    def on_interpolation_error(self, error_msg):
        """插值错误回调"""
        self.progress_bar.setVisible(False)
        QMessageBox.critical(self, "错误", f"插值计算失败: {error_msg}")
        
    def update_visualization(self):
        """更新可视化"""
        self.figure.clear()
        
        if self.coords is None:
            return
            
        # 创建子图
        if self.interpolation_result is not None:
            ax1 = self.figure.add_subplot(121)
            ax2 = self.figure.add_subplot(122)
        else:
            ax1 = self.figure.add_subplot(111)
            
        # 绘制原始数据点
        scatter = ax1.scatter(self.coords[:, 0], self.coords[:, 1], 
                             c=self.values, cmap='viridis', s=50, alpha=0.8)
        ax1.set_xlabel('X坐标 (m)')
        ax1.set_ylabel('Y坐标 (m)')
        ax1.set_title('原始钻孔数据分布')
        ax1.grid(True, alpha=0.3)
        self.figure.colorbar(scatter, ax=ax1, label='土层值')
        
        # 绘制插值结果
        if self.interpolation_result is not None:
            grid_coords = self.interpolation_result['grid_coords']
            interpolated_values = self.interpolation_result['interpolated_values']
            
            res = self.grid_res_spin.value()
            xx = grid_coords[:, 0].reshape(res, res)
            yy = grid_coords[:, 1].reshape(res, res)
            zz = interpolated_values.reshape(res, res)
            
            contour = ax2.contourf(xx, yy, zz, levels=20, cmap='viridis', alpha=0.8)
            
            if self.show_points_check.isChecked():
                ax2.scatter(self.coords[:, 0], self.coords[:, 1], 
                           c=self.values, cmap='viridis', s=30, 
                           edgecolors='white', linewidth=0.5)
                           
            ax2.set_xlabel('X坐标 (m)')
            ax2.set_ylabel('Y坐标 (m)')
            ax2.set_title(f'RBF插值结果 ({self.interpolation_result["kernel"]})')
            ax2.grid(True, alpha=0.3)
            self.figure.colorbar(contour, ax=ax2, label='插值结果')
        
        self.figure.tight_layout()
        self.canvas.draw()
        
    def update_stats(self):
        """更新统计信息"""
        if self.interpolation_result is None:
            return
            
        result = self.interpolation_result
        
        stats_text = f"""
=== RBF插值计算统计 ===

【数据信息】
原始数据点数: {len(result['original_coords'])}
插值网格点数: {len(result['grid_coords'])}
网格分辨率: {self.grid_res_spin.value()}×{self.grid_res_spin.value()}

【插值参数】
核函数: {result['kernel']}
Epsilon参数: {result['epsilon']:.2f}

【值域统计】
原始数据值域: {result['original_values'].min():.3f} ~ {result['original_values'].max():.3f}
插值结果值域: {result['interpolated_values'].min():.3f} ~ {result['interpolated_values'].max():.3f}
插值结果均值: {result['interpolated_values'].mean():.3f}
插值结果标准差: {result['interpolated_values'].std():.3f}

【计算状态】
插值计算成功完成
可视化更新完成
        """
        
        self.stats_text.setText(stats_text)

def main():
    """主函数"""
    app = QApplication(sys.argv)
    app.setApplicationName("Example3 简化演示")
    app.setApplicationVersion("1.0")
    
    window = Example3SimpleDemoGUI()
    window.show()
    
    return app.exec()

if __name__ == "__main__":
    main()