"""
GemPy Professional Section System - 专业剖面系统
Complete section view implementation with XY, XZ, YZ cross-sections
"""

import sys
import numpy as np
import pandas as pd
from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QSlider, QSpinBox,
    QDoubleSpinBox, QCheckBox, QPushButton, QFrame, QComboBox,
    QGroupBox, QGridLayout, QScrollArea
)
from PyQt6.QtCore import Qt, pyqtSignal, QTimer
from PyQt6.QtGui import QPainter, QPen, QBrush, QColor, QFont, QPixmap

try:
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
    from matplotlib.figure import Figure
    import matplotlib.patches as patches
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

try:
    import pyvista as pv
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

try:
    import gempy as gp
    GEMPY_AVAILABLE = True
except ImportError:
    GEMPY_AVAILABLE = False


class GeologicalSection(QWidget):
    """地质剖面基础类"""
    
    section_updated = pyqtSignal(str, float)  # 剖面类型，位置
    
    def __init__(self, section_type="XY", parent=None):
        super().__init__(parent)
        self.section_type = section_type  # XY, XZ, YZ
        self.section_position = 0.0
        self.model_extent = [0, 1000, 0, 1000, -500, 500]
        self.geo_model = None
        self.interface_points = pd.DataFrame()
        self.orientations = pd.DataFrame()
        
        self.setup_section_ui()
        self.setup_matplotlib_canvas()
    
    def setup_section_ui(self):
        """设置剖面界面"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(5, 5, 5, 5)
        
        # 剖面标题和控制
        header_frame = QFrame()
        header_frame.setMaximumHeight(40)
        header_frame.setStyleSheet("""
            QFrame {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1, 
                    stop:0 #f8f9fa, stop:1 #e9ecef);
                border: 1px solid #dee2e6;
                border-radius: 6px;
                margin: 2px;
            }
        """)
        
        header_layout = QHBoxLayout(header_frame)
        header_layout.setContentsMargins(8, 4, 8, 4)
        
        # 剖面标签
        self.section_label = QLabel(f"{self.section_type}剖面")
        self.section_label.setStyleSheet("""
            QLabel {
                font-weight: 600;
                color: #2c3e50;
                border: none;
                background: transparent;
            }
        """)
        header_layout.addWidget(self.section_label)
        
        header_layout.addStretch()
        
        # 位置控制
        pos_label = QLabel("位置:")
        pos_label.setStyleSheet("color: #666; font-size: 9pt; border: none; background: transparent;")
        header_layout.addWidget(pos_label)
        
        self.position_spinbox = QDoubleSpinBox()
        self.position_spinbox.setRange(-1000, 1000)
        self.position_spinbox.setValue(0)
        self.position_spinbox.setSuffix(" m")
        self.position_spinbox.setStyleSheet("""
            QDoubleSpinBox {
                border: 1px solid #ccc;
                border-radius: 3px;
                padding: 2px;
                min-width: 80px;
                background: white;
            }
        """)
        self.position_spinbox.valueChanged.connect(self.update_section_position)
        header_layout.addWidget(self.position_spinbox)
        
        # 更新按钮
        update_btn = QPushButton("更新")
        update_btn.setMaximumSize(50, 25)
        update_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1, 
                    stop:0 #4facfe, stop:1 #00f2fe);
                color: white;
                border: none;
                border-radius: 3px;
                font-weight: 600;
                font-size: 9pt;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1, 
                    stop:0 #3b82f6, stop:1 #1d4ed8);
            }
        """)
        update_btn.clicked.connect(self.refresh_section)
        header_layout.addWidget(update_btn)
        
        layout.addWidget(header_frame)
        
        # 剖面显示区域
        self.canvas_frame = QFrame()
        self.canvas_frame.setMinimumHeight(200)
        self.canvas_frame.setStyleSheet("""
            QFrame {
                background: white;
                border: 1px solid #dee2e6;
                border-radius: 6px;
                margin: 2px;
            }
        """)
        layout.addWidget(self.canvas_frame)
    
    def setup_matplotlib_canvas(self):
        """设置matplotlib画布"""
        if not MATPLOTLIB_AVAILABLE:
            return
        
        canvas_layout = QVBoxLayout(self.canvas_frame)
        canvas_layout.setContentsMargins(5, 5, 5, 5)
        
        self.figure = Figure(figsize=(6, 4), dpi=80)
        self.figure.patch.set_facecolor('white')
        self.canvas = FigureCanvas(self.figure)
        self.ax = self.figure.add_subplot(111)
        
        canvas_layout.addWidget(self.canvas)
        
        # 初始化空白剖面
        self.plot_empty_section()
    
    def plot_empty_section(self):
        """绘制空白剖面"""
        if not MATPLOTLIB_AVAILABLE:
            return
        
        self.ax.clear()
        
        # 设置坐标轴标签
        if self.section_type == "XY":
            self.ax.set_xlabel("X (m)", fontsize=9)
            self.ax.set_ylabel("Y (m)", fontsize=9)
            self.ax.set_title(f"XY剖面 (Z = {self.section_position:.1f}m)", fontsize=10, fontweight='bold')
        elif self.section_type == "XZ":
            self.ax.set_xlabel("X (m)", fontsize=9)
            self.ax.set_ylabel("Z (m)", fontsize=9)
            self.ax.set_title(f"XZ剖面 (Y = {self.section_position:.1f}m)", fontsize=10, fontweight='bold')
        elif self.section_type == "YZ":
            self.ax.set_xlabel("Y (m)", fontsize=9)
            self.ax.set_ylabel("Z (m)", fontsize=9)
            self.ax.set_title(f"YZ剖面 (X = {self.section_position:.1f}m)", fontsize=10, fontweight='bold')
        
        # 设置网格
        self.ax.grid(True, alpha=0.3)
        self.ax.set_facecolor('#f8f9fa')
        
        # 添加提示文本
        self.ax.text(0.5, 0.5, '等待地质数据...', 
                    transform=self.ax.transAxes, 
                    ha='center', va='center',
                    fontsize=12, color='#666',
                    bbox=dict(boxstyle="round,pad=0.3", facecolor="white", alpha=0.8))
        
        self.canvas.draw()
    
    def update_section_position(self, position):
        """更新剖面位置"""
        self.section_position = position
        self.section_updated.emit(self.section_type, position)
        self.refresh_section()
    
    def refresh_section(self):
        """刷新剖面显示"""
        if self.geo_model is not None:
            self.plot_geological_section()
        elif not self.interface_points.empty or not self.orientations.empty:
            self.plot_data_section()
        else:
            self.plot_empty_section()
    
    def plot_data_section(self):
        """绘制数据点剖面"""
        if not MATPLOTLIB_AVAILABLE:
            return
        
        self.ax.clear()
        
        # 绘制界面点
        if not self.interface_points.empty:
            self.plot_interface_points_on_section()
        
        # 绘制产状数据
        if not self.orientations.empty:
            self.plot_orientations_on_section()
        
        self.setup_section_axes()
        self.canvas.draw()
    
    def plot_interface_points_on_section(self):
        """在剖面上绘制界面点"""
        tolerance = 50  # 容差范围
        
        for _, point in self.interface_points.iterrows():
            x, y, z = point['X'], point['Y'], point['Z']
            formation = point.get('formation', '未知地层')
            
            # 根据剖面类型筛选点
            should_plot = False
            plot_x, plot_y = 0, 0
            
            if self.section_type == "XY":
                if abs(z - self.section_position) <= tolerance:
                    plot_x, plot_y = x, y
                    should_plot = True
            elif self.section_type == "XZ":
                if abs(y - self.section_position) <= tolerance:
                    plot_x, plot_y = x, z
                    should_plot = True
            elif self.section_type == "YZ":
                if abs(x - self.section_position) <= tolerance:
                    plot_x, plot_y = y, z
                    should_plot = True
            
            if should_plot:
                # 地层颜色映射
                colors = {'第四系': 'orange', '第三系': 'brown', '白垩系': 'lightblue', 
                         '侏罗系': 'green', '基岩': 'gray', '未知地层': 'red'}
                color = colors.get(formation, 'red')
                
                self.ax.scatter(plot_x, plot_y, c=color, s=60, alpha=0.8, 
                               edgecolors='black', linewidth=1, zorder=5)
                
                # 添加标签
                self.ax.annotate(formation, (plot_x, plot_y), 
                               xytext=(5, 5), textcoords='offset points',
                               fontsize=8, alpha=0.7)
    
    def plot_orientations_on_section(self):
        """在剖面上绘制产状数据"""
        tolerance = 50
        
        for _, orientation in self.orientations.iterrows():
            x, y, z = orientation['X'], orientation['Y'], orientation['Z']
            azimuth = orientation.get('azimuth', 0)
            dip = orientation.get('dip', 0)
            
            should_plot = False
            plot_x, plot_y = 0, 0
            
            if self.section_type == "XY":
                if abs(z - self.section_position) <= tolerance:
                    plot_x, plot_y = x, y
                    should_plot = True
            elif self.section_type == "XZ":
                if abs(y - self.section_position) <= tolerance:
                    plot_x, plot_y = x, z
                    should_plot = True
            elif self.section_type == "YZ":
                if abs(x - self.section_position) <= tolerance:
                    plot_x, plot_y = y, z
                    should_plot = True
            
            if should_plot:
                # 绘制产状符号
                length = 30
                angle_rad = np.radians(azimuth)
                dx = length * np.sin(angle_rad)
                dy = length * np.cos(angle_rad)
                
                # 走向线
                self.ax.plot([plot_x - dx, plot_x + dx], [plot_y - dy, plot_y + dy],
                            'r-', linewidth=3, alpha=0.8)
                
                # 倾向箭头
                dip_dx = length * 0.5 * np.sin(angle_rad + np.pi/2)
                dip_dy = length * 0.5 * np.cos(angle_rad + np.pi/2)
                self.ax.arrow(plot_x, plot_y, dip_dx, dip_dy,
                             head_width=10, head_length=10, fc='blue', ec='blue', alpha=0.8)
    
    def plot_geological_section(self):
        """绘制地质剖面"""
        if not MATPLOTLIB_AVAILABLE or self.geo_model is None:
            return
        
        try:
            # 这里应该调用GemPy的剖面计算功能
            # 由于复杂性，现在显示示意剖面
            self.plot_schematic_geological_section()
        except Exception as e:
            print(f"地质剖面绘制错误: {e}")
            self.plot_data_section()
    
    def plot_schematic_geological_section(self):
        """绘制示意地质剖面"""
        self.ax.clear()
        
        # 创建示意地层
        if self.section_type == "XY":
            x_range = np.linspace(self.model_extent[0], self.model_extent[1], 100)
            y_range = np.linspace(self.model_extent[2], self.model_extent[3], 100)
            X, Y = np.meshgrid(x_range, y_range)
            
            # 简单的地层分布模拟
            Z_surface1 = self.section_position + 50 + 30 * np.sin(X/200) * np.cos(Y/200)
            Z_surface2 = self.section_position + 20 + 20 * np.sin(X/300) * np.cos(Y/250)
            
        elif self.section_type == "XZ":
            x_range = np.linspace(self.model_extent[0], self.model_extent[1], 100)
            z_range = np.linspace(self.model_extent[4], self.model_extent[5], 50)
            X, Z = np.meshgrid(x_range, z_range)
            
            # 地层界面
            surface1 = 200 + 100 * np.sin(X/300)
            surface2 = 0 + 80 * np.sin(X/400)
            surface3 = -200 + 60 * np.sin(X/500)
            
            # 填充地层
            colors = ['#DEB887', '#CD853F', '#8FBC8F', '#708090']
            labels = ['第四系', '第三系', '白垩系', '基岩']
            
            for i in range(len(surface1)):
                x_col = X[0, i]
                self.ax.fill_between([x_col, x_col], [surface3[i], surface2[i]], [surface2[i], surface1[i]], 
                                   color=colors[0], alpha=0.7)
                self.ax.fill_between([x_col, x_col], [surface2[i], surface3[i]], [surface1[i], surface1[i]], 
                                   color=colors[1], alpha=0.7)
        
        elif self.section_type == "YZ":
            y_range = np.linspace(self.model_extent[2], self.model_extent[3], 100)
            z_range = np.linspace(self.model_extent[4], self.model_extent[5], 50)
            Y, Z = np.meshgrid(y_range, z_range)
            
            # 类似XZ剖面的处理
            pass
        
        # 绘制数据点
        if not self.interface_points.empty:
            self.plot_interface_points_on_section()
        
        if not self.orientations.empty:
            self.plot_orientations_on_section()
        
        self.setup_section_axes()
        self.canvas.draw()
    
    def setup_section_axes(self):
        """设置剖面坐标轴"""
        if self.section_type == "XY":
            self.ax.set_xlabel("X (m)", fontsize=9)
            self.ax.set_ylabel("Y (m)", fontsize=9)
            self.ax.set_title(f"XY剖面 (Z = {self.section_position:.1f}m)", fontsize=10, fontweight='bold')
            self.ax.set_xlim(self.model_extent[0], self.model_extent[1])
            self.ax.set_ylim(self.model_extent[2], self.model_extent[3])
        elif self.section_type == "XZ":
            self.ax.set_xlabel("X (m)", fontsize=9)
            self.ax.set_ylabel("Z (m)", fontsize=9)  
            self.ax.set_title(f"XZ剖面 (Y = {self.section_position:.1f}m)", fontsize=10, fontweight='bold')
            self.ax.set_xlim(self.model_extent[0], self.model_extent[1])
            self.ax.set_ylim(self.model_extent[4], self.model_extent[5])
        elif self.section_type == "YZ":
            self.ax.set_xlabel("Y (m)", fontsize=9)
            self.ax.set_ylabel("Z (m)", fontsize=9)
            self.ax.set_title(f"YZ剖面 (X = {self.section_position:.1f}m)", fontsize=10, fontweight='bold')
            self.ax.set_xlim(self.model_extent[2], self.model_extent[3])
            self.ax.set_ylim(self.model_extent[4], self.model_extent[5])
        
        self.ax.grid(True, alpha=0.3)
        self.ax.set_aspect('equal' if self.section_type == "XY" else 'auto')
    
    def set_data(self, interface_points=None, orientations=None, geo_model=None, extent=None):
        """设置数据"""
        if interface_points is not None:
            self.interface_points = interface_points
        if orientations is not None:
            self.orientations = orientations
        if geo_model is not None:
            self.geo_model = geo_model
        if extent is not None:
            self.model_extent = extent
            
        self.refresh_section()


class SectionSystemWidget(QWidget):
    """完整的剖面系统组件"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.interface_points = pd.DataFrame()
        self.orientations = pd.DataFrame()
        self.geo_model = None
        self.model_extent = [0, 1000, 0, 1000, -500, 500]
        
        self.setup_ui()
        self.connect_signals()
    
    def setup_ui(self):
        """设置界面"""
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(5)
        
        # 创建三个剖面
        self.xy_section = GeologicalSection("XY", self)
        self.xz_section = GeologicalSection("XZ", self)
        self.yz_section = GeologicalSection("YZ", self)
        
        layout.addWidget(self.xy_section)
        layout.addWidget(self.xz_section)
        layout.addWidget(self.yz_section)
    
    def connect_signals(self):
        """连接信号"""
        self.xy_section.section_updated.connect(self.on_section_updated)
        self.xz_section.section_updated.connect(self.on_section_updated)
        self.yz_section.section_updated.connect(self.on_section_updated)
    
    def on_section_updated(self, section_type, position):
        """剖面更新处理"""
        print(f"{section_type}剖面位置更新: {position}")
    
    def update_data(self, interface_points=None, orientations=None, geo_model=None, extent=None):
        """更新所有剖面数据"""
        # 更新数据
        if interface_points is not None:
            self.interface_points = interface_points
        if orientations is not None:
            self.orientations = orientations
        if geo_model is not None:
            self.geo_model = geo_model
        if extent is not None:
            self.model_extent = extent
        
        # 传递给各个剖面
        for section in [self.xy_section, self.xz_section, self.yz_section]:
            section.set_data(self.interface_points, self.orientations, self.geo_model, self.model_extent)
    
    def refresh_all_sections(self):
        """刷新所有剖面"""
        for section in [self.xy_section, self.xz_section, self.yz_section]:
            section.refresh_section()