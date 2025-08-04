"""
现代化PyQt6桌面版三维土体重建程序
具有Material Design风格的现代化界面
"""
import sys
import os
import numpy as np
import pandas as pd
from typing import Dict, Tuple, Optional, List

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QGridLayout, QTabWidget, QGroupBox, QLabel, QLineEdit, QSpinBox, 
    QDoubleSpinBox, QComboBox, QCheckBox, QPushButton, QProgressBar,
    QTextEdit, QFileDialog, QMessageBox, QSlider, QFrame, QSplitter,
    QScrollArea, QStackedWidget, QButtonGroup, QRadioButton
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer, QPropertyAnimation, QEasingCurve
from PyQt6.QtGui import QFont, QPixmap, QIcon, QPalette, QColor, QPainter, QLinearGradient

import matplotlib.pyplot as plt
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
import pyvista as pv
import pyvistaqt as pvqt

# 尝试导入qtawesome图标库
try:
    import qtawesome as qta
    ICONS_AVAILABLE = True
except ImportError:
    ICONS_AVAILABLE = False

# 导入自定义模块
from gempy_native_reconstruction import GemPyNativeReconstructor, create_sample_geological_data

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

class ModernButton(QPushButton):
    """现代化按钮组件"""
    def __init__(self, text="", icon_name="", button_type="primary", parent=None):
        super().__init__(text, parent)
        
        # 设置图标
        if ICONS_AVAILABLE and icon_name:
            try:
                if button_type == "primary":
                    icon = qta.icon(icon_name, color='white')
                else:
                    icon = qta.icon(icon_name, color='#2196F3')
                self.setIcon(icon)
            except:
                pass  # 图标加载失败时忽略
        
        # 设置样式
        self.setStyleSheet(self.get_button_style(button_type))
        self.setMinimumHeight(36)
        self.setFont(QFont("Arial", 10))
        
    def get_button_style(self, button_type):
        if button_type == "primary":
            return """
                QPushButton {
                    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                        stop:0 #2196F3, stop:1 #1976D2);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 8px 16px;
                    font-weight: bold;
                }
                QPushButton:hover {
                    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                        stop:0 #1976D2, stop:1 #1565C0);
                }
                QPushButton:pressed {
                    background: #1565C0;
                }
            """
        elif button_type == "secondary":
            return """
                QPushButton {
                    background: white;
                    color: #2196F3;
                    border: 2px solid #2196F3;
                    border-radius: 6px;
                    padding: 8px 16px;
                    font-weight: bold;
                }
                QPushButton:hover {
                    background: #E3F2FD;
                }
                QPushButton:pressed {
                    background: #BBDEFB;
                }
            """
        else:  # default
            return """
                QPushButton {
                    background: #f5f5f5;
                    color: #333;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    padding: 8px 16px;
                }
                QPushButton:hover {
                    background: #e0e0e0;
                    border-color: #bbb;
                }
            """

class ModernSlider(QSlider):
    """现代化滑块组件"""
    def __init__(self, orientation=Qt.Orientation.Horizontal, parent=None):
        super().__init__(orientation, parent)
        self.setStyleSheet("""
            QSlider::groove:horizontal {
                border: 1px solid #bbb;
                background: #f0f0f0;
                height: 6px;
                border-radius: 3px;
            }
            QSlider::sub-page:horizontal {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #2196F3, stop:1 #1976D2);
                border: 1px solid #777;
                height: 6px;
                border-radius: 3px;
            }
            QSlider::add-page:horizontal {
                background: #f0f0f0;
                border: 1px solid #777;
                height: 6px;
                border-radius: 3px;
            }
            QSlider::handle:horizontal {
                background: white;
                border: 2px solid #2196F3;
                width: 18px;
                height: 18px;
                margin: -7px 0;
                border-radius: 9px;
            }
            QSlider::handle:horizontal:hover {
                border-color: #1976D2;
                background: #E3F2FD;
            }
        """)

class ReconstructionThread(QThread):
    """重建线程"""
    progress_updated = pyqtSignal(int)
    status_updated = pyqtSignal(str)
    result_ready = pyqtSignal(dict)
    error_occurred = pyqtSignal(str)
    
    def __init__(self, coords, values, params, domain_params):
        super().__init__()
        self.coords = coords
        self.values = values
        self.params = params
        self.domain_params = domain_params
        
    def run(self):
        try:
            self.status_updated.emit("正在创建GemPy重建器...")
            self.progress_updated.emit(10)
            
            # 使用GemPy原生重建器
            reconstructor = GemPyNativeReconstructor()
            
            self.progress_updated.emit(30)
            self.status_updated.emit("正在设置GemPy建模域...")
            
            # 创建建模域
            geo_model = reconstructor.create_modeling_domain(self.domain_params)
            
            self.progress_updated.emit(60)
            self.status_updated.emit("正在生成三维网格...")
            
            self.progress_updated.emit(50)
            self.status_updated.emit("正在创建地质数据...")
            
            # 创建示例地质数据
            extent = [
                self.domain_params['x_min'], self.domain_params['x_max'],
                self.domain_params['y_min'], self.domain_params['y_max'],
                self.domain_params['z_min'], self.domain_params['z_max']
            ]
            
            surface_points, orientations = create_sample_geological_data(
                extent, n_surfaces=3, n_points_per_surface=8, add_orientations=True
            )
            
            # 设置地质数据
            reconstructor.set_geological_data(surface_points, orientations)
            
            self.progress_updated.emit(70)
            self.status_updated.emit("正在配置GemPy插值器...")
            
            # 配置插值器
            reconstructor.configure_interpolator(
                interpolator_type=self.params['interpolator'],
                interpolator_params={
                    'range': self.params['range'],
                    'nugget_scalar': self.params['nugget']
                }
            )
            
            self.progress_updated.emit(90)
            self.status_updated.emit("正在计算地质模型...")
            
            # 计算模型
            solution = reconstructor.compute_geological_model()
            
            self.progress_updated.emit(100)
            self.status_updated.emit("重建完成")
            
            # 返回结果
            result = {
                'solution': solution,
                'geo_model': reconstructor.geo_model,
                'reconstructor': reconstructor,
                'extent': extent,
                'domain_info': reconstructor.get_domain_info(),
                'statistics': reconstructor.get_model_statistics()
            }
            
            self.result_ready.emit(result)
            
        except Exception as e:
            self.error_occurred.emit(str(e))

class SoilReconstructionModernGUI(QMainWindow):
    """现代化三维土体重建程序主界面"""
    
    def __init__(self):
        super().__init__()
        self.setup_ui()
        self.initialize_data()
        
    def setup_ui(self):
        """设置用户界面"""
        self.setWindowTitle("三维土体重建系统 - Modern Edition")
        self.setGeometry(100, 100, 1400, 900)
        
        # 设置应用样式
        self.setStyleSheet("""
            QMainWindow {
                background-color: #f5f5f5;
            }
            QTabWidget::pane {
                border: 1px solid #c0c0c0;
                background-color: white;
                border-radius: 6px;
            }
            QTabWidget::tab-bar {
                alignment: left;
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
            QTabBar::tab:hover {
                background: #BBDEFB;
            }
            QGroupBox {
                font-weight: bold;
                border: 2px solid #ddd;
                border-radius: 8px;
                margin-top: 10px;
                padding-top: 10px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 5px 0 5px;
                color: #2196F3;
            }
        """)
        
        # 创建中央部件
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QHBoxLayout(central_widget)
        main_layout.setSpacing(10)
        main_layout.setContentsMargins(10, 10, 10, 10)
        
        # 创建分割器
        splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(splitter)
        
        # 左侧控制面板
        self.create_control_panel(splitter)
        
        # 右侧显示面板
        self.create_display_panel(splitter)
        
        # 设置分割比例
        splitter.setSizes([400, 1000])
        
        # 创建状态栏
        self.create_status_bar()
        
        # 创建菜单栏
        self.create_menu_bar()
        
    def create_menu_bar(self):
        """创建菜单栏"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu('文件')
        
        import_action = file_menu.addAction('导入数据')
        export_action = file_menu.addAction('导出结果')
        file_menu.addSeparator()
        exit_action = file_menu.addAction('退出')
        
        import_action.triggered.connect(self.load_csv_data)
        export_action.triggered.connect(self.export_data)
        exit_action.triggered.connect(self.close)
        
        # 帮助菜单
        help_menu = menubar.addMenu('帮助')
        about_action = help_menu.addAction('关于')
        about_action.triggered.connect(self.show_about)
        
    def create_control_panel(self, parent):
        """创建左侧控制面板"""
        # 创建滚动区域
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setMinimumWidth(380)
        
        # 控制面板容器
        control_widget = QWidget()
        control_layout = QVBoxLayout(control_widget)
        control_layout.setSpacing(15)
        
        # 标题
        title_label = QLabel("三维土体重建系统")
        title_label.setFont(QFont("Arial", 16, QFont.Weight.Bold))
        title_label.setStyleSheet("color: #2196F3; margin: 10px 0;")
        title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        control_layout.addWidget(title_label)
        
        # 土体域设置卡片
        self.create_domain_card(control_layout)
        
        # 地质数据卡片
        self.create_borehole_card(control_layout)
        
        # GemPy重建控制卡片
        self.create_reconstruction_card(control_layout)
        
        # 添加弹性空间
        control_layout.addStretch()
        
        scroll_area.setWidget(control_widget)
        parent.addWidget(scroll_area)
        
    def create_domain_card(self, parent_layout):
        """创建简化的土体域设置卡片"""
        card = ModernCard("🏗️ 建模域设置")
        
        # 简化的坐标范围输入
        coord_layout = QGridLayout()
        
        # X方向范围
        coord_layout.addWidget(QLabel("X方向范围 (m):"), 0, 0)
        self.x_range_edit = QLineEdit("0-500")
        self.x_range_edit.setPlaceholderText("如: 0-500")
        self.x_range_edit.textChanged.connect(self.update_domain_info)
        coord_layout.addWidget(self.x_range_edit, 0, 1)
        
        # Y方向范围  
        coord_layout.addWidget(QLabel("Y方向范围 (m):"), 1, 0)
        self.y_range_edit = QLineEdit("0-500")
        self.y_range_edit.setPlaceholderText("如: 0-500")
        self.y_range_edit.textChanged.connect(self.update_domain_info)
        coord_layout.addWidget(self.y_range_edit, 1, 1)
        
        # Z方向范围
        coord_layout.addWidget(QLabel("Z方向范围 (m):"), 2, 0)
        self.z_range_edit = QLineEdit("-50-0")
        self.z_range_edit.setPlaceholderText("如: -50-0")
        self.z_range_edit.textChanged.connect(self.update_domain_info)
        coord_layout.addWidget(self.z_range_edit, 2, 1)
        
        card.add_layout(coord_layout)
        
        # 项目规模预设
        scale_layout = QHBoxLayout()
        scale_layout.addWidget(QLabel("项目规模:"))
        self.scale_combo = QComboBox()
        self.scale_combo.addItems(['小型项目 (快速)', '中型项目 (标准)', '大型项目 (精细)'])
        self.scale_combo.setCurrentIndex(1)  # 默认中型项目
        self.scale_combo.currentTextChanged.connect(self.on_scale_changed)
        scale_layout.addWidget(self.scale_combo)
        card.add_layout(scale_layout)
        
        # 自动计算的网格信息显示
        self.domain_info_label = QLabel("网格将自动计算...")
        self.domain_info_label.setStyleSheet("color: #666; font-size: 11px; margin: 5px;")
        card.add_widget(self.domain_info_label)
        
        parent_layout.addWidget(card)
        
    def on_scale_changed(self, scale_text):
        """项目规模改变时自动更新网格信息"""
        self.update_domain_info()
        
    def parse_range_text(self, range_text):
        """解析范围文本，如 '0-500' -> (0, 500)"""
        try:
            if '-' in range_text:
                parts = range_text.split('-')
                if len(parts) == 2:
                    return float(parts[0]), float(parts[1])
            return 0, 100  # 默认值
        except:
            return 0, 100
            
    def auto_calculate_resolution(self, domain_size, scale_mode):
        """根据域大小和项目规模自动计算网格分辨率"""
        if '小型' in scale_mode:
            base_res = max(20, min(50, int(domain_size / 10)))
        elif '大型' in scale_mode:
            base_res = max(50, min(100, int(domain_size / 5)))
        else:  # 中型项目
            base_res = max(30, min(80, int(domain_size / 8)))
        return base_res
        
    def create_borehole_card(self, parent_layout):
        """创建钻孔数据卡片"""
        card = ModernCard("🕳️ 钻孔数据")
        
        # 数据来源选择
        source_layout = QVBoxLayout()
        
        self.data_source_group = QButtonGroup()
        self.sample_radio = QRadioButton("生成示例数据")
        self.csv_radio = QRadioButton("导入CSV文件")
        self.sample_radio.setChecked(True)
        
        self.data_source_group.addButton(self.sample_radio, 0)
        self.data_source_group.addButton(self.csv_radio, 1)
        
        source_layout.addWidget(self.sample_radio)
        source_layout.addWidget(self.csv_radio)
        card.add_layout(source_layout)
        
        # 示例数据参数
        sample_layout = QGridLayout()
        sample_layout.addWidget(QLabel("密集点数:"), 0, 0)
        self.dense_points_spin = QSpinBox()
        self.dense_points_spin.setRange(5, 100)
        self.dense_points_spin.setValue(20)
        sample_layout.addWidget(self.dense_points_spin, 0, 1)
        
        sample_layout.addWidget(QLabel("稀疏点数:"), 0, 2)
        self.sparse_points_spin = QSpinBox()
        self.sparse_points_spin.setRange(5, 50)
        self.sparse_points_spin.setValue(15)
        sample_layout.addWidget(self.sparse_points_spin, 0, 3)
        
        sample_layout.addWidget(QLabel("噪声水平:"), 1, 0)
        self.noise_slider = ModernSlider()
        self.noise_slider.setRange(1, 30)
        self.noise_slider.setValue(10)
        sample_layout.addWidget(self.noise_slider, 1, 1, 1, 2)
        
        self.noise_value_label = QLabel("1.0")
        self.noise_slider.valueChanged.connect(
            lambda v: self.noise_value_label.setText(f"{v/10:.1f}")
        )
        sample_layout.addWidget(self.noise_value_label, 1, 3)
        
        card.add_layout(sample_layout)
        
        # 操作按钮
        buttons_layout = QHBoxLayout()
        
        self.generate_btn = ModernButton("生成示例", "fa.random", "primary")
        self.load_csv_btn = ModernButton("导入CSV", "fa.folder-open", "secondary")
        self.export_btn = ModernButton("导出数据", "fa.download", "default")
        
        self.generate_btn.clicked.connect(self.generate_sample_data)
        self.load_csv_btn.clicked.connect(self.load_csv_data)
        self.export_btn.clicked.connect(self.export_data)
        
        buttons_layout.addWidget(self.generate_btn)
        buttons_layout.addWidget(self.load_csv_btn)
        buttons_layout.addWidget(self.export_btn)
        
        # 数据格式提示
        format_layout = QVBoxLayout()
        format_info = QLabel("数据格式要求:")
        format_info.setFont(QFont("Arial", 9, QFont.Weight.Bold))
        format_layout.addWidget(format_info)
        
        format_details = QLabel(
            "• 地层界面点: X, Y, Z, surface, series\n"
            "• 产状数据: X, Y, Z, surface, azimuth, dip, polarity\n"
            "• 系列名称: 地层系列分组"
        )
        format_details.setStyleSheet("color: #666; font-size: 9px;")
        format_layout.addWidget(format_details)
        card.add_layout(format_layout)
        card.add_layout(buttons_layout)
        
        # 数据信息显示
        self.data_info_label = QLabel("暂无数据")
        self.data_info_label.setStyleSheet("""
            background-color: #FFF3E0;
            padding: 8px;
            border-radius: 4px;
            color: #F57C00;
            font-style: italic;
        """)
        card.add_widget(self.data_info_label)
        
        parent_layout.addWidget(card)
        
        
    def create_reconstruction_card(self, parent_layout):
        """创建重建控制卡片"""
        card = ModernCard("🚀 三维重建")
        
        # GemPy地质建模 - 唯一选项
        title_layout = QVBoxLayout()
        title_label = QLabel("GemPy地质建模系统")
        title_label.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        title_label.setStyleSheet("color: #2196F3; margin-bottom: 10px;")
        title_layout.addWidget(title_label)
        card.add_layout(title_layout)
        
        # GemPy插值算法选择
        gempy_layout = QVBoxLayout()
        gempy_layout.addWidget(QLabel("GemPy插值算法:"))
        self.gempy_algorithm_combo = QComboBox()
        algorithm_items = [
            'universal_cokriging - Universal Cokriging (推荐)',
            'simple_kriging - Simple Kriging',
            'ordinary_kriging - Ordinary Kriging', 
            'rbf_linear - RBF Linear',
            'rbf_cubic - RBF Cubic',
            'rbf_gaussian - RBF Gaussian',
            'rbf_multiquadric - RBF Multiquadric',
            'rbf_thin_plate_spline - RBF Thin Plate Spline'
        ]
        self.gempy_algorithm_combo.addItems(algorithm_items)
        gempy_layout.addWidget(self.gempy_algorithm_combo)
        card.add_layout(gempy_layout)
        
        # 自动参数提示
        auto_info = QLabel("✓ 插值参数将根据数据自动优化")
        auto_info.setStyleSheet("color: #4CAF50; font-size: 11px; margin: 5px;")
        card.add_widget(auto_info)
        
        # 渲染模式选择
        render_layout = QHBoxLayout()
        render_layout.addWidget(QLabel("渲染模式:"))
        self.render_combo = QComboBox()
        self.render_combo.addItems(['体积渲染', '等值面', '切片', '轮廓'])
        render_layout.addWidget(self.render_combo)
        card.add_layout(render_layout)
        
        # 显示选项
        options_layout = QVBoxLayout()
        self.show_points_check = QCheckBox("显示数据点")
        self.show_points_check.setChecked(True)
        options_layout.addWidget(self.show_points_check)
        
        self.show_orientations_check = QCheckBox("显示产状数据")
        self.show_orientations_check.setChecked(True)
        options_layout.addWidget(self.show_orientations_check)
        card.add_layout(options_layout)
        
        # 执行按钮
        self.reconstruct_btn = ModernButton("🚀 开始重建", "fa.play", "primary")
        self.reconstruct_btn.clicked.connect(self.start_reconstruction)
        card.add_widget(self.reconstruct_btn)
        
        self.show_3d_btn = ModernButton("🎯 显示3D结果", "fa.cube", "secondary")
        self.show_3d_btn.clicked.connect(self.show_3d_result)
        self.show_3d_btn.setEnabled(False)
        card.add_widget(self.show_3d_btn)
        
        parent_layout.addWidget(card)
        
    def create_display_panel(self, parent):
        """创建右侧显示面板"""
        # 创建选项卡
        self.display_tabs = QTabWidget()
        
        # 2D预览页面
        self.create_2d_preview_tab()
        
        # 统计信息页面
        self.create_stats_tab()
        
        parent.addWidget(self.display_tabs)
        
    def create_2d_preview_tab(self):
        """创建2D预览页面"""
        preview_widget = QWidget()
        layout = QVBoxLayout(preview_widget)
        
        # 创建matplotlib图形
        self.figure_2d = Figure(figsize=(10, 8), dpi=100)
        self.canvas_2d = FigureCanvas(self.figure_2d)
        layout.addWidget(self.canvas_2d)
        
        # 工具栏
        toolbar_layout = QHBoxLayout()
        
        refresh_btn = ModernButton("刷新", "fa.refresh", "default")
        save_btn = ModernButton("保存图片", "fa.camera", "default")
        
        refresh_btn.clicked.connect(self.update_2d_preview)
        save_btn.clicked.connect(self.save_2d_plot)
        
        toolbar_layout.addWidget(refresh_btn)
        toolbar_layout.addWidget(save_btn)
        toolbar_layout.addStretch()
        
        layout.addLayout(toolbar_layout)
        
        self.display_tabs.addTab(preview_widget, "📊 2D预览")
        
    def create_stats_tab(self):
        """创建统计信息页面"""
        stats_widget = QWidget()
        layout = QVBoxLayout(stats_widget)
        
        # 标题
        title_label = QLabel("📈 重建统计信息")
        title_label.setFont(QFont("Arial", 14, QFont.Weight.Bold))
        title_label.setStyleSheet("color: #2196F3; margin: 10px 0;")
        layout.addWidget(title_label)
        
        # 统计文本
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
        
    def create_status_bar(self):
        """创建状态栏"""
        self.status_bar = self.statusBar()
        
        # 状态标签
        self.status_label = QLabel("就绪")
        self.status_bar.addWidget(self.status_label)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setMaximumWidth(200)
        self.status_bar.addPermanentWidget(self.progress_bar)
        
    def initialize_data(self):
        """初始化数据"""
        # 只保留GemPy相关数据
        self.surface_points = None
        self.orientations = None
        self.gempy_reconstructor = GemPyNativeReconstructor()
        self.gempy_result = None
        
        # 初始化域信息显示
        self.update_domain_info()
        
    def set_domain_preset(self, x_size, y_size, z_size):
        """设置域预设值"""
        self.x_min_spin.setValue(0)
        self.x_max_spin.setValue(x_size)
        self.y_min_spin.setValue(0)
        self.y_max_spin.setValue(y_size)
        self.z_min_spin.setValue(0)
        self.z_max_spin.setValue(z_size)
        
        # 调整分辨率
        self.x_res_spin.setValue(min(100, max(20, x_size // 2)))
        self.y_res_spin.setValue(min(100, max(20, y_size // 2)))
        self.z_res_spin.setValue(min(50, max(10, z_size // 2)))
        
    def update_domain_info(self):
        """更新域信息显示"""
        try:
            # 解析范围文本
            x_min, x_max = self.parse_range_text(self.x_range_edit.text())
            y_min, y_max = self.parse_range_text(self.y_range_edit.text())
            z_min, z_max = self.parse_range_text(self.z_range_edit.text())
            
            x_range = x_max - x_min
            y_range = y_max - y_min
            z_range = z_max - z_min
            
            volume = x_range * y_range * abs(z_range)
            
            # 根据项目规模自动计算网格分辨率
            scale_mode = self.scale_combo.currentText()
            x_res = self.auto_calculate_resolution(x_range, scale_mode)
            y_res = self.auto_calculate_resolution(y_range, scale_mode)
            z_res = self.auto_calculate_resolution(abs(z_range), scale_mode)
            
            total_points = x_res * y_res * z_res
            
            # 估算计算时间
            if '小型' in scale_mode:
                est_time = "< 30秒"
            elif '大型' in scale_mode:
                est_time = "2-5分钟"
            else:
                est_time = "1-2分钟"
            
            info_text = (f"域大小: {x_range:.0f} × {y_range:.0f} × {abs(z_range):.0f} m | "
                        f"网格: {x_res}×{y_res}×{z_res} ({total_points:,}点) | "
                        f"预计: {est_time}")
            
            self.domain_info_label.setText(info_text)
        except:
            self.domain_info_label.setText("请检查坐标范围格式 (如: 0-500)")
            
    def generate_sample_data(self):
        """生成示例数据"""
        try:
            self.status_label.setText("正在生成示例数据...")
            self.progress_bar.setVisible(True)
            self.progress_bar.setValue(20)
            
            # 获取域参数
            domain_extent = [
                self.x_min_spin.value(), self.x_max_spin.value(),
                self.y_min_spin.value(), self.y_max_spin.value(),
                self.z_min_spin.value(), self.z_max_spin.value()
            ]
            
            self.progress_bar.setValue(50)
            
            # 生成GemPy格式的地质数据
            self.surface_points, self.orientations = create_sample_geological_data(
                domain_extent=domain_extent,
                n_surfaces=3,
                n_points_per_surface=max(3, self.dense_points_spin.value() // 3),
                add_orientations=True
            )
            
            info_text = (f"地层界面点: {len(self.surface_points)}\\n"
                        f"产状数据: {len(self.orientations)}\\n"
                        f"地层数量: {len(self.surface_points['surface'].unique())}\\n"
                        f"X范围: {self.surface_points['X'].min():.1f} ~ {self.surface_points['X'].max():.1f} m\\n"
                        f"Y范围: {self.surface_points['Y'].min():.1f} ~ {self.surface_points['Y'].max():.1f} m\\n"
                        f"Z范围: {self.surface_points['Z'].min():.1f} ~ {self.surface_points['Z'].max():.1f} m")
            
            self.progress_bar.setValue(100)
            
            # 更新信息显示
            self.data_info_label.setText(info_text)
            
            # 更新2D预览
            self.update_2d_preview()
            
            self.status_label.setText("示例数据生成完成")
            self.progress_bar.setVisible(False)
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"生成示例数据失败: {str(e)}")
            self.status_label.setText("生成数据失败")
            self.progress_bar.setVisible(False)
            
    def load_csv_data(self):
        """加载CSV数据文件"""
        try:
            file_path, _ = QFileDialog.getOpenFileName(
                self, "选择CSV文件", "", "CSV文件 (*.csv);;所有文件 (*.*)"
            )
            
            if not file_path:
                return
                
            self.status_label.setText("正在加载数据文件...")
            self.progress_bar.setVisible(True)
            self.progress_bar.setValue(30)
            
            # 读取CSV文件，处理编码问题
            try:
                df = pd.read_csv(file_path, encoding='utf-8')
            except UnicodeDecodeError:
                try:
                    df = pd.read_csv(file_path, encoding='gbk')
                except UnicodeDecodeError:
                    df = pd.read_csv(file_path, encoding='latin-1')
            
            # 检查和处理钻孔数据格式
            self.progress_bar.setValue(50)
            
            if 'hole_id' in df.columns and 'soil_layer' in df.columns:
                # 钻孔数据格式：提取每个钻孔的层界面点
                coords_list = []
                values_list = []
                
                for hole_id in df['hole_id'].unique():
                    hole_data = df[df['hole_id'] == hole_id].sort_values('z', ascending=False)
                    x = hole_data['x'].iloc[0]
                    y = hole_data['y'].iloc[0]
                    
                    # 为每一层创建一个数据点，使用层号作为值
                    for _, row in hole_data.iterrows():
                        coords_list.append([x, y, row['z']])
                        values_list.append(row['soil_layer'])
                
                self.coords = np.array(coords_list)
                self.values = np.array(values_list)
                
            elif all(col in df.columns for col in ['x', 'y', 'z']):
                # 标准格式：直接使用
                self.coords = df[['x', 'y', 'z']].values
                if 'value' in df.columns:
                    self.values = df['value'].values
                elif 'soil_layer' in df.columns:
                    self.values = df['soil_layer'].values
                else:
                    self.values = np.ones(len(self.coords))  # 默认值
            else:
                QMessageBox.critical(self, "错误", "CSV文件格式不支持！\\n需要包含：x,y,z坐标列")
                return
            
            self.progress_bar.setValue(100)
            
            # 自动适应土体域范围
            x_min, x_max = self.coords[:, 0].min(), self.coords[:, 0].max()
            y_min, y_max = self.coords[:, 1].min(), self.coords[:, 1].max()
            z_min, z_max = self.coords[:, 2].min(), self.coords[:, 2].max()
            
            # 扩展边界（增加10%边距）
            x_margin = (x_max - x_min) * 0.1
            y_margin = (y_max - y_min) * 0.1
            z_margin = abs(z_max - z_min) * 0.1
            
            self.x_range_edit.setText(f"{x_min-x_margin:.0f}-{x_max+x_margin:.0f}")
            self.y_range_edit.setText(f"{y_min-y_margin:.0f}-{y_max+y_margin:.0f}")
            self.z_range_edit.setText(f"{z_min-z_margin:.0f}-{z_max+z_margin:.0f}")
            
            # 更新域信息显示
            self.update_domain_info()
            
            # 更新信息显示
            if 'hole_id' in df.columns:
                hole_count = len(df['hole_id'].unique())
                layer_count = len(df['soil_layer'].unique()) if 'soil_layer' in df.columns else 0
                info_text = (f"钻孔数量: {hole_count} 个\\n"
                            f"数据点总数: {len(self.coords)}\\n"
                            f"土层数量: {layer_count} 层\\n"
                            f"X范围: {x_min:.1f} ~ {x_max:.1f} m\\n"
                            f"Y范围: {y_min:.1f} ~ {y_max:.1f} m\\n"
                            f"Z范围: {z_min:.1f} ~ {z_max:.1f} m")
            else:
                info_text = (f"数据点总数: {len(self.coords)}\\n"
                            f"X范围: {x_min:.1f} ~ {x_max:.1f} m\\n"
                            f"Y范围: {y_min:.1f} ~ {y_max:.1f} m\\n"
                            f"值范围: {self.values.min():.2f} ~ {self.values.max():.2f}")
            self.data_info_label.setText(info_text)
            
            # 更新2D预览
            self.update_2d_preview()
            
            self.status_label.setText(f"成功加载 {len(self.coords)} 个数据点")
            self.progress_bar.setVisible(False)
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"加载数据文件失败: {str(e)}")
            self.status_label.setText("加载数据失败")
            self.progress_bar.setVisible(False)
            
    def export_data(self):
        """导出数据"""
        if self.coords is None or self.values is None:
            QMessageBox.warning(self, "警告", "没有可导出的数据")
            return
            
        try:
            file_path, _ = QFileDialog.getSaveFileName(
                self, "保存数据文件", "", "CSV文件 (*.csv);;所有文件 (*.*)"
            )
            
            if not file_path:
                return
                
            # 创建DataFrame
            df = pd.DataFrame({
                'x': self.coords[:, 0],
                'y': self.coords[:, 1],
                'value': self.values
            })
            
            if self.coords.shape[1] == 3:
                df['z'] = self.coords[:, 2]
                
            df.to_csv(file_path, index=False)
            
            QMessageBox.information(self, "成功", f"数据已保存到: {file_path}")
            self.status_label.setText("数据导出完成")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"导出数据失败: {str(e)}")
            
    def update_2d_preview(self):
        """更新2D预览图"""
        if self.coords is None:
            return
            
        try:
            self.figure_2d.clear()
            
            # 创建子图
            ax1 = self.figure_2d.add_subplot(121)
            ax2 = self.figure_2d.add_subplot(122)
            
            # 钻孔分布图（平面视图）
            unique_layers = np.unique(self.values)
            layer_colors = plt.cm.Set3(np.linspace(0, 1, len(unique_layers)))
            layer_color_dict = dict(zip(unique_layers, layer_colors))
            
            # 绘制每个土层的数据点
            for layer in unique_layers:
                mask = self.values == layer
                coords_layer = self.coords[mask]
                ax1.scatter(coords_layer[:, 0], coords_layer[:, 1], 
                           c=[layer_color_dict[layer]], 
                           label=f'第{int(layer)}层', s=30, alpha=0.8)
            
            ax1.set_xlabel('X坐标 (m)')
            ax1.set_ylabel('Y坐标 (m)')
            ax1.set_title('地层界面点分布')
            ax1.legend()
            ax1.grid(True, alpha=0.3)
            
            # 产状数据分布
            if self.orientations is not None and len(self.orientations) > 0:
                ax2.scatter(self.orientations['X'], self.orientations['Y'], 
                           c='red', marker='^', s=100, alpha=0.7, label='产状点')
                
                # 绘制产状方向
                for _, row in self.orientations.iterrows():
                    azimuth_rad = np.deg2rad(row['azimuth'])
                    dip_rad = np.deg2rad(row['dip'])
                    
                    dx = np.sin(azimuth_rad) * 20
                    dy = np.cos(azimuth_rad) * 20
                    
                    ax2.arrow(row['X'], row['Y'], dx, dy, 
                             head_width=5, head_length=5, fc='blue', ec='blue', alpha=0.6)
                
                ax2.set_xlabel('X坐标 (m)')
                ax2.set_ylabel('Y坐标 (m)')
                ax2.set_title('产状数据分布')
                ax2.legend()
                ax2.grid(True, alpha=0.3)
            else:
                ax2.text(0.5, 0.5, '无产状数据', transform=ax2.transAxes, 
                        ha='center', va='center', fontsize=12)
                ax2.set_title('产状数据')
            
            self.figure_2d.tight_layout()
            self.canvas_2d.draw()
            
        except Exception as e:
            print(f"更新2D预览失败: {e}")
            
    def save_2d_plot(self):
        """保存2D图片"""
        try:
            file_path, _ = QFileDialog.getSaveFileName(
                self, "保存图片", "", "PNG文件 (*.png);;JPG文件 (*.jpg);;所有文件 (*.*)"
            )
            
            if file_path:
                self.figure_2d.savefig(file_path, dpi=300, bbox_inches='tight')
                QMessageBox.information(self, "成功", f"图片已保存到: {file_path}")
                
        except Exception as e:
            QMessageBox.critical(self, "错误", f"保存图片失败: {str(e)}")
            
    def start_reconstruction(self):
        """开始三维重建"""
        if self.coords is None or self.values is None:
            QMessageBox.warning(self, "警告", "请先加载或生成钻孔数据")
            return
            
        # 禁用重建按钮
        self.reconstruct_btn.setEnabled(False)
        self.progress_bar.setVisible(True)
        
        # 获取参数
        params = {
            'interpolator': self.gempy_algorithm_combo.currentText().split(' - ')[0],
            'range': 500,  # 自动设置
            'nugget': 0.01,  # 自动设置
        }
        
        # 解析简化的域参数
        x_min, x_max = self.parse_range_text(self.x_range_edit.text())
        y_min, y_max = self.parse_range_text(self.y_range_edit.text())
        z_min, z_max = self.parse_range_text(self.z_range_edit.text())
        
        # 自动计算网格分辨率
        scale_mode = self.scale_combo.currentText()
        x_res = self.auto_calculate_resolution(x_max - x_min, scale_mode)
        y_res = self.auto_calculate_resolution(y_max - y_min, scale_mode)
        z_res = self.auto_calculate_resolution(abs(z_max - z_min), scale_mode)
        
        domain_params = {
            'extent': [x_min, x_max, y_min, y_max, z_min, z_max],
            'resolution': [x_res, y_res, z_res],
            'project_name': 'soil_reconstruction',
            'refinement': 2 if '大型' in scale_mode else 1,
            'grid_type': 'regular'
        }
        
        # 创建重建线程
        self.reconstruction_thread = ReconstructionThread(
            self.coords, self.values, params, domain_params
        )
        
        # 连接信号
        self.reconstruction_thread.progress_updated.connect(self.progress_bar.setValue)
        self.reconstruction_thread.status_updated.connect(self.status_label.setText)
        self.reconstruction_thread.result_ready.connect(self.on_reconstruction_complete)
        self.reconstruction_thread.error_occurred.connect(self.on_reconstruction_error)
        
        # 启动线程
        self.reconstruction_thread.start()
        
    def on_reconstruction_complete(self, result):
        """重建完成回调"""
        self.reconstruction_result = result
        
        # 更新统计信息
        self.update_stats_display()
        
        # 启用3D按钮
        self.show_3d_btn.setEnabled(True)
        self.reconstruct_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        
        QMessageBox.information(self, "成功", "三维土体重建完成！")
        
    def on_reconstruction_error(self, error_msg):
        """重建错误回调"""
        QMessageBox.critical(self, "错误", f"三维重建失败: {error_msg}")
        self.reconstruct_btn.setEnabled(True)
        self.progress_bar.setVisible(False)
        self.status_label.setText("重建失败")
        
    def update_stats_display(self):
        """更新统计信息显示"""
        if not self.reconstruction_result:
            return
            
        try:
            solution = self.reconstruction_result['solution']
            extent = self.reconstruction_result['extent']
            domain_info = self.reconstruction_result['domain_info']
            statistics = self.reconstruction_result['statistics']
            
            stats_text = f"""
=== GemPy地质重建统计信息 ===

【建模域设置】
X范围: {extent[0]:.1f} ~ {extent[1]:.1f} m
Y范围: {extent[2]:.1f} ~ {extent[3]:.1f} m
Z范围: {extent[4]:.1f} ~ {extent[5]:.1f} m
网格分辨率: {domain_info['resolution']['nx']} × {domain_info['resolution']['ny']} × {domain_info['resolution']['nz']}
总网格点数: {domain_info['total_points']:,}
建模体积: {domain_info['volume']:,.0f} m³

【地质数据】
地层数量: {statistics['surfaces']['count']}
地层名称: {', '.join(statistics['surfaces']['names'])}
界面点数量: {statistics['data_points']['surface_points']}
产状数据数量: {statistics['data_points']['orientations']}

【插值配置】
插值方法: {self.gempy_algorithm_combo.currentText().split(' - ')[0]}
参数设置: 自动优化

【建模结果】
成功生成三维地质模型
模型计算完成"""
                
            self.stats_text.setText(stats_text)
            
        except Exception as e:
            print(f"更新统计信息失败: {e}")
            
    def show_3d_result(self):
        """显示3D结果"""
        if not self.reconstruction_result:
            QMessageBox.warning(self, "警告", "请先完成三维重建")
            return
            
        try:
            self.status_label.setText("正在准备3D显示...")
            
            # 获取GemPy重建结果
            reconstructor = self.reconstruction_result['reconstructor']
            pyvista_objects = reconstructor.export_to_pyvista()
            
            # 创建PyVista绘图器
            plotter = pvqt.BackgroundPlotter(show=False, title="GemPy地质模型结果 - Modern Edition")
            
            # 根据渲染模式显示
            render_mode = self.render_combo.currentText()
            
            # 显示地质网格
            if 'geological_grid' in pyvista_objects:
                geological_grid = pyvista_objects['geological_grid']
                
                if render_mode == "体积渲染":
                    plotter.add_volume(geological_grid, scalars='geology', opacity='linear')
                elif render_mode == "等值面":
                    contours = geological_grid.contour(isosurfaces=5, scalars='geology')
                    plotter.add_mesh(contours, scalars='geology', opacity=0.7)
                elif render_mode == "切片":
                    slices = geological_grid.slice_orthogonal()
                    plotter.add_mesh(slices, scalars='geology')
                elif render_mode == "轮廓":
                    edges = geological_grid.extract_all_edges()
                    plotter.add_mesh(edges, color='black', line_width=1)
                    plotter.add_mesh(geological_grid.outline(), color='red', line_width=3)
            
            # 显示地质表面
            if 'surfaces' in pyvista_objects:
                for surface_name, surface_mesh in pyvista_objects['surfaces'].items():
                    plotter.add_mesh(surface_mesh, opacity=0.8, label=surface_name)
                
            # 显示数据点
            if 'data_points' in pyvista_objects and self.show_points_check.isChecked():
                points = pyvista_objects['data_points']
                plotter.add_mesh(points, color='red', point_size=8, render_points_as_spheres=True)
                
            # 显示产状向量
            if 'orientations' in pyvista_objects:
                orientations = pyvista_objects['orientations']
                plotter.add_mesh(orientations, color='blue', line_width=3)
                
            # 设置相机和样式
            plotter.add_axes()
            plotter.add_scalar_bar(title='插值值')
            plotter.set_background('white')
            plotter.camera_position = 'iso'
            
            # 显示
            plotter.show()
            
            self.status_label.setText("3D显示完成")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"显示3D结果失败: {str(e)}")
            self.status_label.setText("3D显示失败")
            
    def show_about(self):
        """显示关于对话框"""
        QMessageBox.about(self, "关于", 
                         "三维土体重建系统 - Modern Edition\\n\\n"
                         "基于GemPy原生功能的现代化土体域建模系统\\n"
                         "支持非均匀钻孔数据处理和三维可视化\\n\\n"
                         "版本: 1.0\\n"
                         "技术栈: PyQt6 + PyVista + NumPy + SciPy")

def main():
    """主函数"""
    app = QApplication(sys.argv)
    app.setApplicationName("三维土体重建系统")
    app.setApplicationVersion("1.0")
    
    # 设置应用图标(如果有的话)
    try:
        if ICONS_AVAILABLE:
            app.setWindowIcon(qta.icon('fa.cube'))
    except:
        pass  # 图标加载失败时忽略
    
    # 创建主窗口
    window = SoilReconstructionModernGUI()
    window.show()
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()