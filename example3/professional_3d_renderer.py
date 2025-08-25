"""
Professional 3D Renderer - 专业3D渲染引擎
Advanced 3D visualization system for geological modeling
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple, Optional, Union
from dataclasses import dataclass
from enum import Enum
import warnings

from PyQt6.QtCore import QObject, pyqtSignal, QThread, QTimer, Qt
from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QGridLayout, 
                           QLabel, QPushButton, QSlider, QComboBox, QSpinBox, 
                           QDoubleSpinBox, QCheckBox, QGroupBox, QTabWidget,
                           QFrame, QSplitter, QProgressBar)
from PyQt6.QtGui import QFont, QColor
from PyQt6.QtOpenGLWidgets import QOpenGLWidget
from PyQt6.QtOpenGL import QOpenGLBuffer, QOpenGLVertexArrayObject, QOpenGLShaderProgram
from PyQt6.QtGui import QMatrix4x4, QVector3D, QQuaternion

try:
    import pyvista as pv
    import vtk
    from pyvistaqt import QtInteractor
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

try:
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
    from matplotlib.figure import Figure
    from mpl_toolkits.mplot3d import Axes3D
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False


class RenderingMode(Enum):
    """渲染模式"""
    POINTS = "points"
    WIREFRAME = "wireframe"
    SURFACE = "surface"
    VOLUME = "volume"
    HYBRID = "hybrid"


class ColorScheme(Enum):
    """颜色方案"""
    GEOLOGICAL = "geological"
    DEPTH = "depth"
    ELEVATION = "elevation"
    FORMATION = "formation"
    RAINBOW = "rainbow"
    GRAYSCALE = "grayscale"
    CUSTOM = "custom"


class LightingMode(Enum):
    """光照模式"""
    AMBIENT = "ambient"
    DIRECTIONAL = "directional"
    POINT = "point"
    SPOT = "spot"
    MULTI_LIGHT = "multi_light"


@dataclass
class RenderingSettings:
    """渲染设置"""
    mode: RenderingMode = RenderingMode.SURFACE
    color_scheme: ColorScheme = ColorScheme.GEOLOGICAL
    lighting: LightingMode = LightingMode.DIRECTIONAL
    opacity: float = 0.8
    wireframe_thickness: float = 1.0
    point_size: float = 5.0
    smooth_shading: bool = True
    show_edges: bool = False
    ambient_intensity: float = 0.3
    diffuse_intensity: float = 0.7
    specular_intensity: float = 0.2
    shininess: float = 32.0


@dataclass
class CameraSettings:
    """相机设置"""
    position: Tuple[float, float, float] = (0.0, 0.0, 1000.0)
    target: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    up_vector: Tuple[float, float, float] = (0.0, 0.0, 1.0)
    fov: float = 45.0
    near_plane: float = 0.1
    far_plane: float = 10000.0
    orthographic: bool = False


class Professional3DRenderer(QObject):
    """专业3D渲染器核心"""
    
    rendering_started = pyqtSignal()
    rendering_completed = pyqtSignal()
    rendering_progress = pyqtSignal(int, str)
    rendering_error = pyqtSignal(str)
    
    def __init__(self):
        super().__init__()
        self.settings = RenderingSettings()
        self.camera_settings = CameraSettings()
        self.data = None
        self.mesh = None
        self.actors = []
        
        # 地质颜色映射
        self.geological_colors = {
            'quaternary': '#FF6B35',      # 第四纪 - 橙红色
            'tertiary': '#F7931E',        # 第三纪 - 橙色
            'cretaceous': '#87CEEB',      # 白垩纪 - 天蓝色
            'jurassic': '#32CD32',        # 侏罗纪 - 酸橙绿
            'triassic': '#DC143C',        # 三叠纪 - 深红色
            'permian': '#800080',         # 二叠纪 - 紫色
            'carboniferous': '#2F4F4F',   # 石炭纪 - 暗灰色
            'devonian': '#8B4513',        # 泥盆纪 - 棕色
            'silurian': '#4682B4',        # 志留纪 - 钢蓝色
            'ordovician': '#228B22',      # 奥陶纪 - 森林绿
            'cambrian': '#FF1493',        # 寒武纪 - 深粉红
            'precambrian': '#696969'      # 前寒武纪 - 暗灰色
        }
        
    def set_data(self, data: pd.DataFrame):
        """设置数据"""
        self.data = data
        self.rendering_progress.emit(10, "Data loaded")
        
    def set_rendering_settings(self, settings: RenderingSettings):
        """设置渲染参数"""
        self.settings = settings
        
    def set_camera_settings(self, camera_settings: CameraSettings):
        """设置相机参数"""
        self.camera_settings = camera_settings
        
    def create_mesh_from_data(self) -> bool:
        """从数据创建网格"""
        if self.data is None:
            self.rendering_error.emit("No data available")
            return False
        
        try:
            self.rendering_progress.emit(30, "Creating mesh...")
            
            # 检查必要的坐标列
            coord_cols = ['X', 'Y', 'Z']
            missing_cols = [col for col in coord_cols if col not in self.data.columns]
            
            if missing_cols:
                self.rendering_error.emit(f"Missing coordinate columns: {missing_cols}")
                return False
            
            # 提取坐标
            points = self.data[coord_cols].values
            
            if PYVISTA_AVAILABLE:
                # 创建点云
                self.mesh = pv.PolyData(points)
                
                # 如果有地层信息，添加为标量
                if 'Formation' in self.data.columns:
                    formations = self.data['Formation'].values
                    # 将地层名称转换为数值
                    unique_formations = np.unique(formations)
                    formation_map = {name: i for i, name in enumerate(unique_formations)}
                    formation_scalars = np.array([formation_map.get(f, 0) for f in formations])
                    self.mesh['formations'] = formation_scalars
                    
                # 如果有深度信息，添加为标量
                self.mesh['depth'] = points[:, 2]
                
                self.rendering_progress.emit(60, "Mesh created successfully")
                return True
            else:
                self.rendering_error.emit("PyVista not available for mesh creation")
                return False
                
        except Exception as e:
            self.rendering_error.emit(f"Mesh creation failed: {str(e)}")
            return False
    
    def create_surface_from_points(self, method='delaunay') -> bool:
        """从点创建表面"""
        if self.mesh is None:
            return False
        
        try:
            self.rendering_progress.emit(70, f"Creating surface using {method}...")
            
            if method == 'delaunay':
                # Delaunay三角化
                self.mesh = self.mesh.delaunay_3d()
            elif method == 'poisson':
                # Poisson重建（需要法向量）
                self.mesh = self.mesh.compute_normals()
                # 注意：PyVista没有直接的Poisson重建，这里用替代方法
                self.mesh = self.mesh.delaunay_3d()
            
            self.rendering_progress.emit(90, "Surface created")
            return True
            
        except Exception as e:
            self.rendering_error.emit(f"Surface creation failed: {str(e)}")
            return False
    
    def apply_color_scheme(self, scheme: ColorScheme = None):
        """应用颜色方案"""
        if self.mesh is None:
            return
        
        if scheme is None:
            scheme = self.settings.color_scheme
        
        try:
            if scheme == ColorScheme.DEPTH:
                # 基于深度着色
                self.mesh['colors'] = self.mesh.points[:, 2]
            elif scheme == ColorScheme.FORMATION:
                # 基于地层着色
                if 'formations' in self.mesh.array_names:
                    self.mesh['colors'] = self.mesh['formations']
            elif scheme == ColorScheme.GEOLOGICAL:
                # 地质标准着色
                if 'Formation' in self.data.columns:
                    colors = []
                    for formation in self.data['Formation']:
                        # 简化的地层名称匹配
                        formation_lower = str(formation).lower()
                        color = '#808080'  # 默认灰色
                        
                        for period, period_color in self.geological_colors.items():
                            if period in formation_lower:
                                color = period_color
                                break
                        colors.append(color)
                    
                    # 转换颜色到RGB值
                    rgb_colors = []
                    for color in colors:
                        r = int(color[1:3], 16) / 255.0
                        g = int(color[3:5], 16) / 255.0
                        b = int(color[5:7], 16) / 255.0
                        rgb_colors.append([r, g, b])
                    
                    self.mesh['rgb_colors'] = np.array(rgb_colors)
            
        except Exception as e:
            self.rendering_error.emit(f"Color scheme application failed: {str(e)}")
    
    def get_color_for_formation(self, formation: str) -> str:
        """获取地层颜色"""
        formation_lower = str(formation).lower()
        
        # 关键词匹配
        for period, color in self.geological_colors.items():
            if period in formation_lower:
                return color
        
        # 默认颜色
        return '#808080'


class PyVistaRenderer(QWidget):
    """基于PyVista的渲染器"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.renderer_core = Professional3DRenderer()
        
        if PYVISTA_AVAILABLE:
            self.setup_pyvista_renderer()
        else:
            self.setup_fallback_renderer()
            
    def setup_pyvista_renderer(self):
        """设置PyVista渲染器"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 创建PyVista交互器
        self.plotter = QtInteractor(self)
        
        # 设置背景渐变
        self.plotter.set_background('navy', top='lightblue')
        
        # 添加坐标轴
        self.plotter.add_axes(
            xlabel='X (m)',
            ylabel='Y (m)', 
            zlabel='Z (m)',
            line_width=3,
            labels_off=False
        )
        
        layout.addWidget(self.plotter.interactor)
        
        # 连接渲染器信号
        self.renderer_core.rendering_completed.connect(self.update_visualization)
        
    def setup_fallback_renderer(self):
        """设置后备渲染器"""
        layout = QVBoxLayout(self)
        
        if MATPLOTLIB_AVAILABLE:
            # 使用matplotlib 3D
            self.figure = Figure(figsize=(10, 8), facecolor='#0f172a')
            self.canvas = FigureCanvas(self.figure)
            self.ax = self.figure.add_subplot(111, projection='3d', facecolor='#1e293b')
            
            # 设置matplotlib样式
            self.ax.xaxis.label.set_color('#e5e7eb')
            self.ax.yaxis.label.set_color('#e5e7eb')
            self.ax.zaxis.label.set_color('#e5e7eb')
            self.ax.tick_params(colors='#e5e7eb')
            
            layout.addWidget(self.canvas)
        else:
            # 纯Qt实现的基础3D渲染
            placeholder = QLabel("3D Visualization\n(Advanced rendering requires PyVista)")
            placeholder.setAlignment(Qt.AlignmentFlag.AlignCenter)
            placeholder.setStyleSheet("""
                QLabel {
                    background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                        stop:0 rgba(15, 23, 42, 0.9),
                        stop:1 rgba(30, 41, 59, 0.9));
                    border: 2px dashed #6b7280;
                    border-radius: 12px;
                    color: #9ca3af;
                    font-size: 16pt;
                    font-weight: 600;
                    padding: 60px;
                }
            """)
            layout.addWidget(placeholder)
    
    def set_data(self, data: pd.DataFrame):
        """设置数据"""
        self.renderer_core.set_data(data)
        
        if PYVISTA_AVAILABLE:
            self.render_with_pyvista(data)
        elif MATPLOTLIB_AVAILABLE:
            self.render_with_matplotlib(data)
    
    def render_with_pyvista(self, data: pd.DataFrame):
        """使用PyVista渲染"""
        try:
            # 清除现有actor
            self.plotter.clear()
            
            # 创建网格
            if self.renderer_core.create_mesh_from_data():
                mesh = self.renderer_core.mesh
                
                # 应用颜色方案
                self.renderer_core.apply_color_scheme()
                
                # 根据渲染模式添加actor
                settings = self.renderer_core.settings
                
                if settings.mode == RenderingMode.POINTS:
                    self.plotter.add_mesh(mesh, style='points', 
                                        point_size=settings.point_size,
                                        opacity=settings.opacity)
                elif settings.mode == RenderingMode.WIREFRAME:
                    self.plotter.add_mesh(mesh, style='wireframe',
                                        line_width=settings.wireframe_thickness,
                                        opacity=settings.opacity)
                elif settings.mode == RenderingMode.SURFACE:
                    # 创建表面
                    if self.renderer_core.create_surface_from_points():
                        surface = self.renderer_core.mesh
                        
                        # 设置渲染属性
                        render_kwargs = {
                            'opacity': settings.opacity,
                            'smooth_shading': settings.smooth_shading,
                            'show_edges': settings.show_edges
                        }
                        
                        # 添加颜色
                        if 'rgb_colors' in surface.array_names:
                            render_kwargs['rgb'] = True
                        elif 'colors' in surface.array_names:
                            render_kwargs['scalars'] = 'colors'
                            render_kwargs['cmap'] = 'viridis'
                        
                        self.plotter.add_mesh(surface, **render_kwargs)
                
                # 设置相机
                camera = self.renderer_core.camera_settings
                self.plotter.camera_position = [
                    camera.position,
                    camera.target,
                    camera.up_vector
                ]
                
                # 添加标尺
                self.plotter.add_scalar_bar()
                
                # 重置相机以适应数据
                self.plotter.reset_camera()
                
                print(f"Rendered {len(data)} points using PyVista")
            
        except Exception as e:
            print(f"PyVista rendering error: {e}")
    
    def render_with_matplotlib(self, data: pd.DataFrame):
        """使用matplotlib渲染"""
        try:
            self.ax.clear()
            
            # 检查坐标列
            if all(col in data.columns for col in ['X', 'Y', 'Z']):
                x, y, z = data['X'], data['Y'], data['Z']
                
                # 根据地层着色
                if 'Formation' in data.columns:
                    formations = data['Formation'].unique()
                    colors = plt.cm.Set1(np.linspace(0, 1, len(formations)))
                    
                    for i, formation in enumerate(formations):
                        mask = data['Formation'] == formation
                        self.ax.scatter(x[mask], y[mask], z[mask], 
                                      c=[colors[i]], label=formation, s=20)
                    
                    self.ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
                else:
                    # 基于深度着色
                    scatter = self.ax.scatter(x, y, z, c=z, cmap='viridis', s=20)
                    self.figure.colorbar(scatter, ax=self.ax, label='Depth (m)')
                
                # 设置标签
                self.ax.set_xlabel('X (m)', color='#e5e7eb')
                self.ax.set_ylabel('Y (m)', color='#e5e7eb')
                self.ax.set_zlabel('Z (m)', color='#e5e7eb')
                
                # 设置标题
                self.ax.set_title(f'Geological Model ({len(data)} points)', 
                                color='#e5e7eb', fontsize=14, fontweight='bold')
                
                self.canvas.draw()
                
                print(f"Rendered {len(data)} points using matplotlib")
            
        except Exception as e:
            print(f"Matplotlib rendering error: {e}")
    
    def update_visualization(self):
        """更新可视化"""
        if hasattr(self, 'plotter') and PYVISTA_AVAILABLE:
            self.plotter.render()
        elif hasattr(self, 'canvas') and MATPLOTLIB_AVAILABLE:
            self.canvas.draw()
    
    def reset_view(self):
        """重置视图"""
        if hasattr(self, 'plotter') and PYVISTA_AVAILABLE:
            self.plotter.reset_camera()
        elif hasattr(self, 'ax') and MATPLOTLIB_AVAILABLE:
            self.ax.view_init(elev=20, azim=45)
            self.canvas.draw()
    
    def save_screenshot(self, filename: str):
        """保存截图"""
        if hasattr(self, 'plotter') and PYVISTA_AVAILABLE:
            self.plotter.screenshot(filename)
        elif hasattr(self, 'figure') and MATPLOTLIB_AVAILABLE:
            self.figure.savefig(filename, dpi=300, bbox_inches='tight',
                              facecolor='#0f172a', edgecolor='none')


class RenderingControlPanel(QWidget):
    """渲染控制面板"""
    
    settings_changed = pyqtSignal(object)  # RenderingSettings
    camera_changed = pyqtSignal(object)   # CameraSettings
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.settings = RenderingSettings()
        self.camera_settings = CameraSettings()
        self.setup_ui()
        self.connect_signals()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 标题
        title = QLabel("🎨 Rendering Controls")
        title.setStyleSheet("""
            QLabel {
                font-size: 14pt;
                font-weight: 700;
                color: #3b82f6;
                padding: 10px;
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 rgba(59, 130, 246, 0.1),
                    stop:1 rgba(59, 130, 246, 0.05));
                border-radius: 8px;
                margin-bottom: 10px;
            }
        """)
        layout.addWidget(title)
        
        # 渲染设置组
        render_group = QGroupBox("Rendering Settings")
        render_group.setStyleSheet("""
            QGroupBox {
                font-weight: 700;
                color: #e5e7eb;
                border: 2px solid #374151;
                border-radius: 8px;
                margin-top: 10px;
                padding-top: 10px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 10px 0 10px;
            }
        """)
        
        render_layout = QGridLayout(render_group)
        
        # 渲染模式
        render_layout.addWidget(QLabel("Mode:"), 0, 0)
        self.mode_combo = QComboBox()
        self.mode_combo.addItems([mode.value.title() for mode in RenderingMode])
        self.mode_combo.setCurrentText(self.settings.mode.value.title())
        render_layout.addWidget(self.mode_combo, 0, 1)
        
        # 颜色方案
        render_layout.addWidget(QLabel("Color Scheme:"), 1, 0)
        self.color_combo = QComboBox()
        self.color_combo.addItems([scheme.value.title() for scheme in ColorScheme])
        self.color_combo.setCurrentText(self.settings.color_scheme.value.title())
        render_layout.addWidget(self.color_combo, 1, 1)
        
        # 透明度
        render_layout.addWidget(QLabel("Opacity:"), 2, 0)
        self.opacity_slider = QSlider(Qt.Orientation.Horizontal)
        self.opacity_slider.setRange(0, 100)
        self.opacity_slider.setValue(int(self.settings.opacity * 100))
        render_layout.addWidget(self.opacity_slider, 2, 1)
        
        # 点大小
        render_layout.addWidget(QLabel("Point Size:"), 3, 0)
        self.point_size_spin = QDoubleSpinBox()
        self.point_size_spin.setRange(1.0, 50.0)
        self.point_size_spin.setValue(self.settings.point_size)
        render_layout.addWidget(self.point_size_spin, 3, 1)
        
        # 平滑着色
        self.smooth_check = QCheckBox("Smooth Shading")
        self.smooth_check.setChecked(self.settings.smooth_shading)
        render_layout.addWidget(self.smooth_check, 4, 0, 1, 2)
        
        # 显示边线
        self.edges_check = QCheckBox("Show Edges")
        self.edges_check.setChecked(self.settings.show_edges)
        render_layout.addWidget(self.edges_check, 5, 0, 1, 2)
        
        layout.addWidget(render_group)
        
        # 光照设置组
        lighting_group = QGroupBox("Lighting Settings")
        lighting_group.setStyleSheet(render_group.styleSheet())
        
        lighting_layout = QGridLayout(lighting_group)
        
        # 光照模式
        lighting_layout.addWidget(QLabel("Lighting:"), 0, 0)
        self.lighting_combo = QComboBox()
        self.lighting_combo.addItems([mode.value.title() for mode in LightingMode])
        self.lighting_combo.setCurrentText(self.settings.lighting.value.title())
        lighting_layout.addWidget(self.lighting_combo, 0, 1)
        
        # 环境光强度
        lighting_layout.addWidget(QLabel("Ambient:"), 1, 0)
        self.ambient_slider = QSlider(Qt.Orientation.Horizontal)
        self.ambient_slider.setRange(0, 100)
        self.ambient_slider.setValue(int(self.settings.ambient_intensity * 100))
        lighting_layout.addWidget(self.ambient_slider, 1, 1)
        
        # 漫反射强度
        lighting_layout.addWidget(QLabel("Diffuse:"), 2, 0)
        self.diffuse_slider = QSlider(Qt.Orientation.Horizontal)
        self.diffuse_slider.setRange(0, 100)
        self.diffuse_slider.setValue(int(self.settings.diffuse_intensity * 100))
        lighting_layout.addWidget(self.diffuse_slider, 2, 1)
        
        # 镜面反射强度
        lighting_layout.addWidget(QLabel("Specular:"), 3, 0)
        self.specular_slider = QSlider(Qt.Orientation.Horizontal)
        self.specular_slider.setRange(0, 100)
        self.specular_slider.setValue(int(self.settings.specular_intensity * 100))
        lighting_layout.addWidget(self.specular_slider, 3, 1)
        
        layout.addWidget(lighting_group)
        
        # 相机设置组
        camera_group = QGroupBox("Camera Settings")
        camera_group.setStyleSheet(render_group.styleSheet())
        
        camera_layout = QGridLayout(camera_group)
        
        # 视野角度
        camera_layout.addWidget(QLabel("FOV:"), 0, 0)
        self.fov_spin = QSpinBox()
        self.fov_spin.setRange(10, 120)
        self.fov_spin.setValue(int(self.camera_settings.fov))
        camera_layout.addWidget(self.fov_spin, 0, 1)
        
        # 正交投影
        self.ortho_check = QCheckBox("Orthographic Projection")
        self.ortho_check.setChecked(self.camera_settings.orthographic)
        camera_layout.addWidget(self.ortho_check, 1, 0, 1, 2)
        
        layout.addWidget(camera_group)
        
        # 控制按钮
        button_layout = QHBoxLayout()
        
        self.apply_btn = QPushButton("Apply Settings")
        self.apply_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(16, 185, 129, 0.9),
                    stop:1 rgba(5, 150, 105, 0.9));
                border: 2px solid #10b981;
                border-radius: 6px;
                color: white;
                font-weight: 700;
                padding: 8px 16px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(34, 197, 94, 0.9),
                    stop:1 rgba(21, 128, 61, 0.9));
            }
        """)
        
        self.reset_btn = QPushButton("Reset View")
        self.reset_btn.setStyleSheet("""
            QPushButton {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(59, 130, 246, 0.9),
                    stop:1 rgba(30, 64, 175, 0.9));
                border: 2px solid #3b82f6;
                border-radius: 6px;
                color: white;
                font-weight: 700;
                padding: 8px 16px;
            }
            QPushButton:hover {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 rgba(79, 150, 255, 0.9),
                    stop:1 rgba(50, 84, 195, 0.9));
            }
        """)
        
        button_layout.addWidget(self.apply_btn)
        button_layout.addWidget(self.reset_btn)
        
        layout.addLayout(button_layout)
        
        layout.addStretch()
        
        # 应用样式到所有控件
        self.apply_control_styles()
        
    def apply_control_styles(self):
        """应用控件样式"""
        style = """
            QComboBox, QSpinBox, QDoubleSpinBox {
                background: rgba(51, 65, 85, 0.9);
                border: 2px solid #6b7280;
                border-radius: 4px;
                color: #e5e7eb;
                padding: 4px 8px;
                font-weight: 600;
            }
            QSlider::groove:horizontal {
                border: 2px solid #374151;
                height: 8px;
                background: rgba(51, 65, 85, 0.8);
                border-radius: 4px;
            }
            QSlider::handle:horizontal {
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 #3b82f6, stop:1 #1e40af);
                border: 2px solid #1e40af;
                width: 18px;
                margin: -2px 0;
                border-radius: 9px;
            }
            QCheckBox {
                color: #e5e7eb;
                font-weight: 600;
            }
            QCheckBox::indicator {
                width: 16px;
                height: 16px;
                border: 2px solid #6b7280;
                border-radius: 3px;
                background: rgba(51, 65, 85, 0.8);
            }
            QCheckBox::indicator:checked {
                background: #10b981;
                border-color: #059669;
            }
            QLabel {
                color: #e5e7eb;
                font-weight: 600;
            }
        """
        
        for widget in self.findChildren((QComboBox, QSpinBox, QDoubleSpinBox, 
                                       QSlider, QCheckBox, QLabel)):
            widget.setStyleSheet(style)
        
    def connect_signals(self):
        """连接信号"""
        self.apply_btn.clicked.connect(self.apply_settings)
        self.reset_btn.clicked.connect(self.reset_settings)
        
        # 实时更新信号
        self.mode_combo.currentTextChanged.connect(self.on_settings_changed)
        self.color_combo.currentTextChanged.connect(self.on_settings_changed)
        self.opacity_slider.valueChanged.connect(self.on_settings_changed)
        self.point_size_spin.valueChanged.connect(self.on_settings_changed)
        self.smooth_check.toggled.connect(self.on_settings_changed)
        self.edges_check.toggled.connect(self.on_settings_changed)
        
    def apply_settings(self):
        """应用设置"""
        # 更新渲染设置
        self.settings.mode = RenderingMode(self.mode_combo.currentText().lower())
        self.settings.color_scheme = ColorScheme(self.color_combo.currentText().lower())
        self.settings.opacity = self.opacity_slider.value() / 100.0
        self.settings.point_size = self.point_size_spin.value()
        self.settings.smooth_shading = self.smooth_check.isChecked()
        self.settings.show_edges = self.edges_check.isChecked()
        
        self.settings.lighting = LightingMode(self.lighting_combo.currentText().lower())
        self.settings.ambient_intensity = self.ambient_slider.value() / 100.0
        self.settings.diffuse_intensity = self.diffuse_slider.value() / 100.0
        self.settings.specular_intensity = self.specular_slider.value() / 100.0
        
        # 更新相机设置
        self.camera_settings.fov = float(self.fov_spin.value())
        self.camera_settings.orthographic = self.ortho_check.isChecked()
        
        # 发射信号
        self.settings_changed.emit(self.settings)
        self.camera_changed.emit(self.camera_settings)
        
    def reset_settings(self):
        """重置设置"""
        self.settings = RenderingSettings()
        self.camera_settings = CameraSettings()
        
        # 更新界面
        self.mode_combo.setCurrentText(self.settings.mode.value.title())
        self.color_combo.setCurrentText(self.settings.color_scheme.value.title())
        self.opacity_slider.setValue(int(self.settings.opacity * 100))
        self.point_size_spin.setValue(self.settings.point_size)
        self.smooth_check.setChecked(self.settings.smooth_shading)
        self.edges_check.setChecked(self.settings.show_edges)
        
        self.fov_spin.setValue(int(self.camera_settings.fov))
        self.ortho_check.setChecked(self.camera_settings.orthographic)
        
    def on_settings_changed(self):
        """设置改变处理"""
        # 实时更新（可选）
        pass


class Professional3DViewer(QWidget):
    """专业3D查看器"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.connect_signals()
        
    def setup_ui(self):
        """设置界面"""
        layout = QHBoxLayout(self)
        layout.setContentsMargins(5, 5, 5, 5)
        
        # 主分割器
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        main_splitter.setChildrenCollapsible(False)
        
        # 左侧：渲染控制面板
        self.control_panel = RenderingControlPanel()
        self.control_panel.setFixedWidth(280)
        main_splitter.addWidget(self.control_panel)
        
        # 右侧：3D渲染器
        self.renderer = PyVistaRenderer()
        main_splitter.addWidget(self.renderer)
        
        # 设置分割比例
        main_splitter.setSizes([280, 800])
        
        layout.addWidget(main_splitter)
        
    def connect_signals(self):
        """连接信号"""
        self.control_panel.settings_changed.connect(self.on_settings_changed)
        self.control_panel.camera_changed.connect(self.on_camera_changed)
        
    def set_data(self, data: pd.DataFrame):
        """设置数据"""
        self.renderer.set_data(data)
        
    def on_settings_changed(self, settings: RenderingSettings):
        """渲染设置改变"""
        self.renderer.renderer_core.set_rendering_settings(settings)
        self.renderer.update_visualization()
        
    def on_camera_changed(self, camera_settings: CameraSettings):
        """相机设置改变"""
        self.renderer.renderer_core.set_camera_settings(camera_settings)
        
    def save_screenshot(self, filename: str):
        """保存截图"""
        self.renderer.save_screenshot(filename)
        
    def reset_view(self):
        """重置视图"""
        self.renderer.reset_view()


if __name__ == "__main__":
    from PyQt6.QtWidgets import QApplication
    import sys
    
    app = QApplication(sys.argv)
    
    # 创建测试数据
    n_points = 1000
    test_data = pd.DataFrame({
        'X': np.random.normal(1000, 200, n_points),
        'Y': np.random.normal(2000, 300, n_points),
        'Z': np.random.normal(500, 100, n_points),
        'Formation': np.random.choice([
            'Quaternary', 'Tertiary', 'Cretaceous', 'Jurassic', 
            'Triassic', 'Permian'
        ], n_points)
    })
    
    # 创建3D查看器
    viewer = Professional3DViewer()
    viewer.set_data(test_data)
    viewer.setWindowTitle("🌋 Professional 3D Geological Viewer")
    viewer.resize(1200, 800)
    viewer.show()
    
    print(f"Loaded {len(test_data)} data points")
    print(f"PyVista available: {PYVISTA_AVAILABLE}")
    print(f"Matplotlib available: {MATPLOTLIB_AVAILABLE}")
    
    sys.exit(app.exec())