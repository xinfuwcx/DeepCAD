#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced GemPy Main Window
增强版GemPy主窗口 - 集成Example3所有功能

整合：
- 原gempy_main_window的3D可视化
- geophysical_modeling地球物理功能  
- uncertainty_analysis不确定性分析
- enhanced_3d_viewer高级3D渲染
- gem_implicit_modeling_system隐式建模
"""

import sys
import os
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import traceback

# PyQt6 imports
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QSplitter, QTabWidget, QTextEdit, QToolBar, QMenuBar, QStatusBar, 
    QDockWidget, QGroupBox, QFormLayout, QLabel, QLineEdit, QPushButton, 
    QComboBox, QSpinBox, QDoubleSpinBox, QCheckBox, QProgressBar, 
    QFileDialog, QMessageBox, QDialog, QDialogButtonBox, QScrollArea,
    QFrame, QButtonGroup, QRadioButton, QSlider, QListWidget, QGridLayout,
    QToolButton, QSizePolicy, QTableWidget, QTableWidgetItem, QHeaderView
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer, QMimeData, QUrl, QSize
from PyQt6.QtGui import (
    QAction, QIcon, QFont, QPixmap, QPalette, QColor, QDragEnterEvent, 
    QDropEvent, QStandardItemModel, QStandardItem, QKeySequence
)

# 添加example3路径
example3_path = Path(__file__).parent / "example3"
sys.path.insert(0, str(example3_path))

# 科学计算库
try:
    import gempy as gp
    GEMPY_AVAILABLE = True
except ImportError:
    GEMPY_AVAILABLE = False

try:
    import pyvista as pv
    import pyvistaqt as pvqt
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

try:
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
    from matplotlib.figure import Figure
    MATPLOTLIB_AVAILABLE = True
except ImportError:
    MATPLOTLIB_AVAILABLE = False

try:
    import qtawesome as qta
    ICONS_AVAILABLE = True
except ImportError:
    ICONS_AVAILABLE = False

# 导入example3模块
try:
    from professional_gempy_cae import AbaqusStyleSheet, ModelTreeWidget, PropertyPanel, MessageCenter
    from gempy_main_window import GemPyViewport3D
    PROFESSIONAL_MODULES = True
except ImportError:
    PROFESSIONAL_MODULES = False


class EnhancedGemPyViewport3D(QWidget):
    """增强版3D地质视口"""
    
    # 信号定义
    object_selected = pyqtSignal(str, str, dict)
    viewport_clicked = pyqtSignal(tuple)
    model_updated = pyqtSignal(object)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.current_model = None
        self.geological_objects = {}
        self.visualization_settings = {
            'show_data_points': True,
            'show_orientations': True,
            'show_faults': True,
            'transparency': 0.7,
            'colormap': 'viridis'
        }
        
        self.setup_enhanced_viewport()
        
    def setup_enhanced_viewport(self):
        """设置增强3D视口"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 增强工具栏
        self.create_enhanced_toolbar()
        layout.addWidget(self.toolbar)
        
        if PYVISTA_AVAILABLE:
            # PyVista渲染器
            self.plotter = pvqt.QtInteractor(self)
            
            # 专业地质配色方案
            self.plotter.set_background([0.15, 0.2, 0.25])  # 深蓝灰背景
            
            # 设置高质量渲染
            self.setup_professional_rendering()
            
            layout.addWidget(self.plotter)
            
            # 设置相机和光照
            self.setup_camera()
            self.setup_lighting()
            self.add_coordinate_axes()
            
        else:
            # 替代视口
            placeholder = QLabel("3D视口需要PyVista支持")
            placeholder.setAlignment(Qt.AlignmentFlag.AlignCenter)
            placeholder.setStyleSheet("background-color: #2c3e50; color: white; font-size: 16px;")
            layout.addWidget(placeholder)
            
        # 控制面板
        self.create_control_panel()
        layout.addWidget(self.control_panel)
        
    def create_enhanced_toolbar(self):
        """创建增强工具栏"""
        self.toolbar = QToolBar()
        self.toolbar.setMovable(False)
        self.toolbar.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextBesideIcon)
        self.toolbar.setIconSize(QSize(24, 24))
        
        # 应用地质专业样式
        self.toolbar.setStyleSheet("""
            QToolBar {
                background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                          stop: 0 #34495e, stop: 1 #2c3e50);
                border: 1px solid #1a252f;
                spacing: 3px;
                padding: 5px;
            }
            QToolButton {
                background-color: #3498db;
                color: white;
                border: 1px solid #2980b9;
                border-radius: 4px;
                padding: 6px 12px;
                margin: 1px;
                font-weight: bold;
            }
            QToolButton:hover {
                background-color: #5dade2;
                border: 1px solid #3498db;
            }
            QToolButton:pressed {
                background-color: #2980b9;
                border: 1px solid #1f618d;
            }
            QToolButton:checked {
                background-color: #e74c3c;
                border: 1px solid #c0392b;
            }
        """)
        
        if ICONS_AVAILABLE:
            # 视图控制组
            self.toolbar.addAction(self.create_action(
                'fa5s.cube', '等轴', '等轴测视图', self.set_isometric_view))
            self.toolbar.addAction(self.create_action(
                'fa5s.eye', '俯视', '俯视图', self.set_top_view))
            self.toolbar.addAction(self.create_action(
                'fa5s.arrows-alt-h', '前视', '前视图', self.set_front_view))
            self.toolbar.addAction(self.create_action(
                'fa5s.arrows-alt-v', '侧视', '侧视图', self.set_side_view))
            
            self.toolbar.addSeparator()
            
            # 渲染模式组
            wireframe_action = self.create_action(
                'fa5s.project-diagram', '线框', '线框模式', self.toggle_wireframe)
            wireframe_action.setCheckable(True)
            self.toolbar.addAction(wireframe_action)
            
            surface_action = self.create_action(
                'fa5s.layer-group', '表面', '表面模式', self.toggle_surface)
            surface_action.setCheckable(True)
            surface_action.setChecked(True)
            self.toolbar.addAction(surface_action)
            
            volume_action = self.create_action(
                'fa5s.cube', '体积', '体积渲染', self.toggle_volume)
            volume_action.setCheckable(True)
            self.toolbar.addAction(volume_action)
            
            self.toolbar.addSeparator()
            
            # 地质要素显示
            points_action = self.create_action(
                'fa5s.map-marker-alt', '数据点', '显示地质数据点', self.toggle_data_points)
            points_action.setCheckable(True)
            points_action.setChecked(True)
            self.toolbar.addAction(points_action)
            
            orientations_action = self.create_action(
                'fa5s.compass', '方向', '显示方向数据', self.toggle_orientations)
            orientations_action.setCheckable(True)
            orientations_action.setChecked(True)
            self.toolbar.addAction(orientations_action)
            
            faults_action = self.create_action(
                'fa5s.code-branch', '断层', '显示断层面', self.toggle_faults)
            faults_action.setCheckable(True)
            faults_action.setChecked(True)
            self.toolbar.addAction(faults_action)
            
            self.toolbar.addSeparator()
            
            # 分析工具
            self.toolbar.addAction(self.create_action(
                'fa5s.ruler', '测量', '距离测量工具', self.activate_measure_tool))
            self.toolbar.addAction(self.create_action(
                'fa5s.cut', '剖面', '创建地质剖面', self.activate_section_tool))
            self.toolbar.addAction(self.create_action(
                'fa5s.chart-area', '属性', '属性云图', self.show_property_clouds))
            
            self.toolbar.addSeparator()
            
            # 导出工具
            self.toolbar.addAction(self.create_action(
                'fa5s.camera', '截图', '保存视图截图', self.save_screenshot))
            self.toolbar.addAction(self.create_action(
                'fa5s.video', '动画', '创建旋转动画', self.create_animation))
            self.toolbar.addAction(self.create_action(
                'fa5s.download', '导出', '导出3D模型', self.export_model))
                
    def create_action(self, icon_name: str, text: str, tooltip: str, callback):
        """创建工具栏动作"""
        action = QAction(text, self)
        if ICONS_AVAILABLE:
            action.setIcon(qta.icon(icon_name, color='white'))
        action.setToolTip(tooltip)
        action.triggered.connect(callback)
        return action
        
    def create_control_panel(self):
        """创建控制面板"""
        self.control_panel = QFrame()
        self.control_panel.setMaximumHeight(120)
        self.control_panel.setStyleSheet("""
            QFrame {
                background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
                                          stop: 0 #ecf0f1, stop: 1 #bdc3c7);
                border-top: 1px solid #95a5a6;
            }
        """)
        
        layout = QHBoxLayout(self.control_panel)
        
        # 可视化设置组
        viz_group = QGroupBox("可视化设置")
        viz_layout = QGridLayout(viz_group)
        
        # 透明度控制
        viz_layout.addWidget(QLabel("透明度:"), 0, 0)
        self.transparency_slider = QSlider(Qt.Orientation.Horizontal)
        self.transparency_slider.setRange(0, 100)
        self.transparency_slider.setValue(70)
        self.transparency_slider.valueChanged.connect(self.update_transparency)
        viz_layout.addWidget(self.transparency_slider, 0, 1)
        
        # 配色方案
        viz_layout.addWidget(QLabel("配色:"), 1, 0)
        self.colormap_combo = QComboBox()
        self.colormap_combo.addItems(['viridis', 'plasma', 'inferno', 'magma', 'coolwarm', 'terrain'])
        self.colormap_combo.currentTextChanged.connect(self.update_colormap)
        viz_layout.addWidget(self.colormap_combo, 1, 1)
        
        layout.addWidget(viz_group)
        
        # 地质模型信息
        info_group = QGroupBox("模型信息")
        info_layout = QFormLayout(info_group)
        
        self.model_info_labels = {
            'formations': QLabel("0"),
            'surfaces': QLabel("0"),
            'points': QLabel("0"),
            'orientations': QLabel("0")
        }
        
        info_layout.addRow("地层数:", self.model_info_labels['formations'])
        info_layout.addRow("界面数:", self.model_info_labels['surfaces'])
        info_layout.addRow("数据点:", self.model_info_labels['points'])
        info_layout.addRow("方向:", self.model_info_labels['orientations'])
        
        layout.addWidget(info_group)
        
        # 计算控制
        compute_group = QGroupBox("计算控制")
        compute_layout = QVBoxLayout(compute_group)
        
        self.compute_btn = QPushButton("计算地质模型")
        if ICONS_AVAILABLE:
            self.compute_btn.setIcon(qta.icon('fa5s.calculator', color='#27ae60'))
        self.compute_btn.clicked.connect(self.compute_model)
        self.compute_btn.setStyleSheet("""
            QPushButton {
                background-color: #27ae60;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #2ecc71;
            }
            QPushButton:pressed {
                background-color: #229954;
            }
        """)
        compute_layout.addWidget(self.compute_btn)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        compute_layout.addWidget(self.progress_bar)
        
        layout.addWidget(compute_group)
        
        layout.addStretch()
        
    def setup_professional_rendering(self):
        """设置专业级渲染"""
        if not PYVISTA_AVAILABLE:
            return
            
        # 启用反锯齿和阴影
        self.plotter.enable_anti_aliasing()
        self.plotter.enable_depth_peeling()
        
        # 设置渲染质量
        self.plotter.ren_win.SetMultiSamples(8)
        
    def setup_camera(self):
        """设置相机"""
        if not PYVISTA_AVAILABLE:
            return
            
        self.plotter.camera_position = [(1500, 1500, 1000), (500, 500, -200), (0, 0, 1)]
        self.plotter.camera.SetParallelProjection(False)
        
    def setup_lighting(self):
        """设置专业光照"""
        if not PYVISTA_AVAILABLE:
            return
            
        # 移除默认光源
        self.plotter.remove_all_lights()
        
        # 主光源 - 模拟太阳光
        main_light = pv.Light(
            position=(2000, 2000, 1500),
            focal_point=(500, 500, -200),
            color='white',
            intensity=0.8,
            cone_angle=60,
            exponent=10
        )
        self.plotter.add_light(main_light)
        
        # 填充光 - 减少阴影
        fill_light = pv.Light(
            position=(-1000, -1000, 800),
            focal_point=(500, 500, -200),
            color='lightblue',
            intensity=0.3
        )
        self.plotter.add_light(fill_light)
        
        # 边缘光 - 增强轮廓
        rim_light = pv.Light(
            position=(0, -2000, 500),
            focal_point=(500, 500, -200),
            color='white',
            intensity=0.4
        )
        self.plotter.add_light(rim_light)
        
    def add_coordinate_axes(self):
        """添加坐标轴"""
        if not PYVISTA_AVAILABLE:
            return
            
        self.plotter.add_axes(
            xlabel='东向 (m)', 
            ylabel='北向 (m)', 
            zlabel='高程 (m)',
            line_width=3,
            labels_off=False,
            color='white'
        )
        
    def load_gempy_model(self, model):
        """加载GemPy模型"""
        self.current_model = model
        self.update_model_info()
        self.clear_scene()
        self.render_geological_model()
        self.model_updated.emit(model)
        
    def update_model_info(self):
        """更新模型信息显示"""
        if not self.current_model:
            return
            
        # 更新统计信息
        try:
            formations_count = len(self.current_model.surfaces.df['surface'].unique())
            surfaces_count = len(self.current_model.surfaces.df)
            points_count = len(self.current_model.surface_points.df)
            orientations_count = len(self.current_model.orientations.df)
            
            self.model_info_labels['formations'].setText(str(formations_count))
            self.model_info_labels['surfaces'].setText(str(surfaces_count))
            self.model_info_labels['points'].setText(str(points_count))
            self.model_info_labels['orientations'].setText(str(orientations_count))
        except Exception as e:
            print(f"更新模型信息失败: {e}")
    
    def render_geological_model(self):
        """渲染地质模型"""
        if not self.current_model or not PYVISTA_AVAILABLE:
            return
            
        try:
            print("开始渲染地质模型...")
            
            # 渲染地质层面
            if self.visualization_settings['show_data_points']:
                self.render_geological_surfaces()
            
            # 渲染数据点
            if self.visualization_settings['show_data_points']:
                self.render_surface_points()
            
            # 渲染方向数据
            if self.visualization_settings['show_orientations']:
                self.render_orientations()
            
            # 渲染断层
            if self.visualization_settings['show_faults']:
                self.render_faults()
                
            print("地质模型渲染完成")
            
        except Exception as e:
            print(f"渲染地质模型失败: {e}")
            traceback.print_exc()
    
    def render_geological_surfaces(self):
        """渲染地质层面 - 增强版"""
        if not PYVISTA_AVAILABLE or not hasattr(self.current_model, 'solutions'):
            return
            
        try:
            # 获取地层数据
            lith_block = self.current_model.solutions.lith_block
            
            if lith_block is not None and len(lith_block) > 0:
                # 创建体数据
                grid = self.current_model.grid.regular_grid
                extent = grid.extent
                resolution = grid.resolution
                
                # 重塑数据
                lith_3d = lith_block.reshape(resolution)
                
                # 创建结构化网格
                structured_grid = pv.ImageData(
                    dimensions=resolution,
                    spacing=[(extent[1]-extent[0])/(resolution[0]-1),
                            (extent[3]-extent[2])/(resolution[1]-1),
                            (extent[5]-extent[4])/(resolution[2]-1)],
                    origin=[extent[0], extent[2], extent[4]]
                )
                
                structured_grid['geological_formations'] = lith_3d.ravel(order='F')
                
                # 创建等值面 - 使用专业地质配色
                unique_formations = np.unique(lith_3d)
                colors = self.get_geological_colors(len(unique_formations))
                
                for i, formation_id in enumerate(unique_formations):
                    if formation_id != 0:  # 跳过背景
                        contour = structured_grid.contour([formation_id - 0.5, formation_id + 0.5])
                        if contour.n_points > 0:
                            self.plotter.add_mesh(
                                contour,
                                color=colors[i],
                                opacity=self.visualization_settings['transparency'],
                                name=f'formation_{formation_id}',
                                pickable=True,
                                smooth_shading=True
                            )
                            
        except Exception as e:
            print(f"渲染地质层面失败: {e}")
    
    def get_geological_colors(self, n_colors):
        """获取地质专业配色"""
        # 专业地质配色方案
        geological_colors = [
            [0.8, 0.6, 0.4],  # 砂岩 - 浅棕色
            [0.6, 0.8, 0.6],  # 页岩 - 浅绿色
            [0.9, 0.9, 0.7],  # 石灰岩 - 浅黄色
            [0.7, 0.5, 0.3],  # 泥岩 - 棕色
            [0.5, 0.7, 0.9],  # 白云岩 - 浅蓝色
            [0.8, 0.4, 0.6],  # 花岗岩 - 粉红色
            [0.4, 0.6, 0.4],  # 玄武岩 - 深绿色
            [0.9, 0.6, 0.3],  # 砾岩 - 橙色
        ]
        
        # 如果需要更多颜色，使用colormap生成
        if n_colors <= len(geological_colors):
            return geological_colors[:n_colors]
        else:
            cmap = plt.cm.get_cmap(self.visualization_settings['colormap'])
            return [cmap(i / n_colors)[:3] for i in range(n_colors)]
    
    def render_surface_points(self):
        """渲染地层点 - 增强版"""
        if not PYVISTA_AVAILABLE:
            return
            
        try:
            surface_points = self.current_model.surface_points.df
            
            if not surface_points.empty:
                points = surface_points[['X', 'Y', 'Z']].values
                
                # 创建点云
                point_cloud = pv.PolyData(points)
                
                # 根据地层着色
                if 'surface' in surface_points.columns:
                    surfaces = surface_points['surface'].values
                    unique_surfaces = np.unique(surfaces)
                    surface_ids = np.array([np.where(unique_surfaces == s)[0][0] for s in surfaces])
                    point_cloud['surface_id'] = surface_ids
                    
                    self.plotter.add_mesh(
                        point_cloud,
                        scalars='surface_id',
                        point_size=12,
                        render_points_as_spheres=True,
                        cmap=self.visualization_settings['colormap'],
                        name='surface_points',
                        pickable=True,
                        show_scalar_bar=True
                    )
                else:
                    self.plotter.add_mesh(
                        point_cloud,
                        color='red',
                        point_size=12,
                        render_points_as_spheres=True,
                        name='surface_points',
                        pickable=True
                    )
                    
        except Exception as e:
            print(f"渲染地层点失败: {e}")
    
    def render_orientations(self):
        """渲染方向数据 - 增强版"""
        if not PYVISTA_AVAILABLE:
            return
            
        try:
            orientations = self.current_model.orientations.df
            
            if not orientations.empty:
                for idx, row in orientations.iterrows():
                    # 创建方向向量
                    pos = [row['X'], row['Y'], row['Z']]
                    
                    # 计算方向向量
                    azimuth = np.radians(row.get('azimuth', 0))
                    dip = np.radians(row.get('dip', 0))
                    
                    # 方向向量
                    dx = np.cos(azimuth) * np.cos(dip)
                    dy = np.sin(azimuth) * np.cos(dip)
                    dz = np.sin(dip)
                    
                    direction = [dx, dy, dz]
                    
                    # 创建增强箭头
                    arrow = pv.Arrow(
                        start=pos,
                        direction=direction,
                        scale=80,
                        shaft_radius=3,
                        tip_radius=8
                    )
                    
                    self.plotter.add_mesh(
                        arrow,
                        color='blue',
                        name=f'orientation_{idx}',
                        pickable=True,
                        opacity=0.8
                    )
                    
        except Exception as e:
            print(f"渲染方向数据失败: {e}")
    
    def render_faults(self):
        """渲染断层 - 增强版"""
        # TODO: 实现断层渲染
        pass
    
    def clear_scene(self):
        """清空场景"""
        if not PYVISTA_AVAILABLE:
            return
            
        # 保留坐标轴，清除其他对象
        actors_to_remove = []
        for name in self.plotter.actors:
            if name not in ['axes']:
                actors_to_remove.append(name)
                
        for name in actors_to_remove:
            self.plotter.remove_actor(name)
    
    def compute_model(self):
        """计算地质模型"""
        if not self.current_model or not GEMPY_AVAILABLE:
            QMessageBox.warning(self, "警告", "请先加载地质模型或安装GemPy")
            return
            
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 0)  # 不确定进度
        self.compute_btn.setEnabled(False)
        
        try:
            # 计算模型
            gp.compute_model(self.current_model)
            
            # 重新渲染
            self.render_geological_model()
            
            QMessageBox.information(self, "成功", "地质模型计算完成")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"模型计算失败: {e}")
            
        finally:
            self.progress_bar.setVisible(False)
            self.compute_btn.setEnabled(True)
    
    def update_transparency(self, value):
        """更新透明度"""
        self.visualization_settings['transparency'] = value / 100.0
        self.render_geological_model()
        
    def update_colormap(self, colormap):
        """更新配色方案"""
        self.visualization_settings['colormap'] = colormap
        self.render_geological_model()
        
    # 视图控制方法
    def set_isometric_view(self):
        if PYVISTA_AVAILABLE:
            self.plotter.camera_position = [(1500, 1500, 1000), (500, 500, -200), (0, 0, 1)]
            self.plotter.reset_camera()
        
    def set_top_view(self):
        if PYVISTA_AVAILABLE:
            self.plotter.camera_position = [(500, 500, 1500), (500, 500, -200), (0, 1, 0)]
            self.plotter.reset_camera()
        
    def set_front_view(self):
        if PYVISTA_AVAILABLE:
            self.plotter.camera_position = [(500, -1000, 300), (500, 500, -200), (0, 0, 1)]
            self.plotter.reset_camera()
        
    def set_side_view(self):
        if PYVISTA_AVAILABLE:
            self.plotter.camera_position = [(2000, 500, 300), (500, 500, -200), (0, 0, 1)]
            self.plotter.reset_camera()
    
    # 渲染模式切换
    def toggle_wireframe(self):
        # TODO: 实现线框模式切换
        pass
        
    def toggle_surface(self):
        # TODO: 实现表面模式切换
        pass
        
    def toggle_volume(self):
        # TODO: 实现体积渲染切换
        pass
    
    # 要素显示切换
    def toggle_data_points(self):
        self.visualization_settings['show_data_points'] = not self.visualization_settings['show_data_points']
        self.render_geological_model()
        
    def toggle_orientations(self):
        self.visualization_settings['show_orientations'] = not self.visualization_settings['show_orientations']
        self.render_geological_model()
        
    def toggle_faults(self):
        self.visualization_settings['show_faults'] = not self.visualization_settings['show_faults']
        self.render_geological_model()
    
    # 工具方法
    def activate_measure_tool(self):
        QMessageBox.information(self, "测量工具", "测量工具功能开发中...")
        
    def activate_section_tool(self):
        """激活剖面工具"""
        if not PYVISTA_AVAILABLE:
            QMessageBox.warning(self, "警告", "剖面工具需要PyVista支持")
            return
            
        # 创建剖面工具对话框
        self.create_section_dialog()
    
    def create_section_dialog(self):
        """创建剖面工具对话框"""
        from PyQt6.QtWidgets import QDialog, QVBoxLayout, QHBoxLayout, QGroupBox, QFormLayout
        
        dialog = QDialog(self)
        dialog.setWindowTitle("地质剖面工具")
        dialog.setModal(True)
        dialog.resize(400, 300)
        
        layout = QVBoxLayout(dialog)
        
        # 剖面方向设置
        direction_group = QGroupBox("剖面方向")
        direction_layout = QFormLayout(direction_group)
        
        self.section_direction_combo = QComboBox()
        self.section_direction_combo.addItems(["X轴剖面", "Y轴剖面", "Z轴剖面", "任意方向"])
        direction_layout.addRow("方向:", self.section_direction_combo)
        
        layout.addWidget(direction_group)
        
        # 剖面位置设置
        position_group = QGroupBox("剖面位置")
        position_layout = QFormLayout(position_group)
        
        self.section_position_slider = QSlider(Qt.Orientation.Horizontal)
        self.section_position_slider.setRange(0, 100)
        self.section_position_slider.setValue(50)
        self.section_position_slider.valueChanged.connect(self.update_section_preview)
        position_layout.addRow("位置 (%):", self.section_position_slider)
        
        self.position_value_label = QLabel("50%")
        position_layout.addRow("当前值:", self.position_value_label)
        
        layout.addWidget(position_group)
        
        # 剖面设置
        settings_group = QGroupBox("显示设置")
        settings_layout = QFormLayout(settings_group)
        
        self.show_plane_check = QCheckBox()
        self.show_plane_check.setChecked(True)
        settings_layout.addRow("显示切面:", self.show_plane_check)
        
        self.section_transparency_slider = QSlider(Qt.Orientation.Horizontal)
        self.section_transparency_slider.setRange(0, 100)
        self.section_transparency_slider.setValue(30)
        settings_layout.addRow("切面透明度:", self.section_transparency_slider)
        
        layout.addWidget(settings_group)
        
        # 按钮
        buttons_layout = QHBoxLayout()
        
        create_btn = QPushButton("创建剖面")
        create_btn.clicked.connect(lambda: self.create_geological_section(dialog))
        buttons_layout.addWidget(create_btn)
        
        clear_btn = QPushButton("清除剖面")
        clear_btn.clicked.connect(self.clear_geological_section)
        buttons_layout.addWidget(clear_btn)
        
        close_btn = QPushButton("关闭")
        close_btn.clicked.connect(dialog.close)
        buttons_layout.addWidget(close_btn)
        
        layout.addLayout(buttons_layout)
        
        # 连接滑块更新
        self.section_position_slider.valueChanged.connect(
            lambda v: self.position_value_label.setText(f"{v}%"))
        
        dialog.show()
        
    def update_section_preview(self, value):
        """更新剖面预览"""
        # 实时更新剖面位置
        if hasattr(self, 'current_section_plane'):
            self.create_geological_section_internal()
    
    def create_geological_section(self, dialog=None):
        """创建地质剖面"""
        if not self.current_model or not PYVISTA_AVAILABLE:
            QMessageBox.warning(self, "警告", "请先加载地质模型")
            return
        
        # 关闭对话框
        if dialog:
            dialog.close()
            
        self.create_geological_section_internal()
        
    def create_geological_section_internal(self):
        """内部剖面创建方法"""
        try:
            # 获取剖面参数
            direction = getattr(self, 'section_direction_combo', None)
            position_slider = getattr(self, 'section_position_slider', None)
            show_plane = getattr(self, 'show_plane_check', None)
            transparency_slider = getattr(self, 'section_transparency_slider', None)
            
            if not all([direction, position_slider]):
                # 使用默认参数
                direction_text = "Z轴剖面"
                position = 50
                show_plane_enabled = True
                transparency = 30
            else:
                direction_text = direction.currentText()
                position = position_slider.value()
                show_plane_enabled = show_plane.isChecked()
                transparency = transparency_slider.value()
            
            # 清除之前的剖面
            self.clear_geological_section()
            
            # 计算剖面参数
            if self.current_model and hasattr(self.current_model, 'grid'):
                grid = self.current_model.grid.regular_grid
                extent = grid.extent
                
                # 根据方向计算原点和法向量
                if "X轴" in direction_text:
                    x_pos = extent[0] + (extent[1] - extent[0]) * position / 100
                    origin = [x_pos, (extent[2] + extent[3]) / 2, (extent[4] + extent[5]) / 2]
                    normal = [1, 0, 0]
                    size = [(extent[3] - extent[2]), (extent[5] - extent[4])]
                elif "Y轴" in direction_text:
                    y_pos = extent[2] + (extent[3] - extent[2]) * position / 100
                    origin = [(extent[0] + extent[1]) / 2, y_pos, (extent[4] + extent[5]) / 2]
                    normal = [0, 1, 0]
                    size = [(extent[1] - extent[0]), (extent[5] - extent[4])]
                else:  # Z轴剖面
                    z_pos = extent[4] + (extent[5] - extent[4]) * position / 100
                    origin = [(extent[0] + extent[1]) / 2, (extent[2] + extent[3]) / 2, z_pos]
                    normal = [0, 0, 1]
                    size = [(extent[1] - extent[0]), (extent[3] - extent[2])]
            else:
                # 默认参数
                origin = [500, 500, -200]
                normal = [0, 0, 1]
                size = [1000, 1000]
            
            # 创建切面
            plane = pv.Plane(center=origin, direction=normal, size=size)
            self.current_section_plane = plane
            
            # 显示切面
            if show_plane_enabled:
                self.plotter.add_mesh(
                    plane,
                    color='red',
                    opacity=transparency / 100.0,
                    name='section_plane',
                    show_edges=True,
                    edge_color='darkred',
                    line_width=2
                )
            
            # 对地质模型进行切割
            self.apply_section_cut(plane)
            
            print(f"✅ 地质剖面创建成功: {direction_text}, 位置={position}%")
            
        except Exception as e:
            print(f"❌ 创建地质剖面失败: {e}")
            QMessageBox.critical(self, "错误", f"创建剖面失败: {e}")
    
    def apply_section_cut(self, cutting_plane):
        """对地质模型应用剖面切割"""
        try:
            # 获取所有地质体对象
            geological_actors = []
            for name in list(self.plotter.actors.keys()):
                if 'formation_' in name and '_cut' not in name:
                    geological_actors.append(name)
            
            for actor_name in geological_actors:
                try:
                    # 获取原始网格
                    actor = self.plotter.actors.get(actor_name)
                    if not actor:
                        continue
                    
                    # 从场景中获取网格数据
                    mesh = actor.GetMapper().GetInput()
                    if not mesh or mesh.GetNumberOfPoints() == 0:
                        continue
                    
                    # 转换为pyvista对象
                    pv_mesh = pv.wrap(mesh)
                    
                    # 执行切割
                    cut_mesh = pv_mesh.clip_surface(cutting_plane, invert=False)
                    
                    if cut_mesh.n_points == 0:
                        continue
                    
                    # 隐藏原始对象
                    actor.SetVisibility(False)
                    
                    # 获取颜色 - 尝试从原始actor获取
                    try:
                        mapper = actor.GetMapper()
                        color_array = mapper.GetLookupTable()
                        if color_array:
                            # 使用原始颜色
                            color = None
                        else:
                            # 使用默认地质配色
                            formation_id = actor_name.replace('formation_', '')
                            color = self.get_formation_color(formation_id)
                    except:
                        color = self.get_formation_color('default')
                    
                    # 添加切割后的对象
                    self.plotter.add_mesh(
                        cut_mesh,
                        color=color,
                        opacity=0.9,
                        name=f'{actor_name}_cut',
                        show_edges=True,
                        edge_color='white',
                        line_width=1
                    )
                    
                except Exception as e:
                    print(f"⚠️  切割地质体 {actor_name} 失败: {e}")
                    continue
            
            # 重新渲染
            self.plotter.render()
            
        except Exception as e:
            print(f"❌ 应用剖面切割失败: {e}")
    
    def get_formation_color(self, formation_id):
        """获取地层颜色"""
        color_map = {
            '1': [0.8, 0.6, 0.4],   # 砂岩 - 浅棕色
            '2': [0.6, 0.8, 0.6],   # 页岩 - 浅绿色
            '3': [0.9, 0.9, 0.7],   # 石灰岩 - 浅黄色
            '4': [0.7, 0.5, 0.3],   # 泥岩 - 棕色
            '5': [0.5, 0.7, 0.9],   # 白云岩 - 浅蓝色
            'default': [0.7, 0.7, 0.7]  # 默认灰色
        }
        return color_map.get(str(formation_id), color_map['default'])
    
    def clear_geological_section(self):
        """清除地质剖面"""
        if not PYVISTA_AVAILABLE:
            return
            
        try:
            # 移除切面
            if 'section_plane' in self.plotter.actors:
                self.plotter.remove_actor('section_plane')
            
            # 移除所有切割后的对象
            cut_actors = [name for name in list(self.plotter.actors.keys()) if '_cut' in name]
            for actor_name in cut_actors:
                self.plotter.remove_actor(actor_name)
                
                # 显示对应的原始对象
                original_name = actor_name.replace('_cut', '')
                if original_name in self.plotter.actors:
                    original_actor = self.plotter.actors[original_name]
                    original_actor.SetVisibility(True)
            
            # 清除剖面数据
            self.current_section_plane = None
            
            # 重新渲染
            self.plotter.render()
            
            print("✅ 地质剖面已清除")
            
        except Exception as e:
            print(f"❌ 清除剖面失败: {e}")
        
    def show_property_clouds(self):
        QMessageBox.information(self, "属性云图", "属性云图功能开发中...")
    
    # 导出方法
    def save_screenshot(self):
        if PYVISTA_AVAILABLE:
            filename, _ = QFileDialog.getSaveFileName(
                self, "保存截图", "", "PNG图片 (*.png);;JPEG图片 (*.jpg)")
            if filename:
                self.plotter.screenshot(filename)
                QMessageBox.information(self, "成功", f"截图已保存: {filename}")
        
    def create_animation(self):
        QMessageBox.information(self, "动画", "动画创建功能开发中...")
        
    def export_model(self):
        if PYVISTA_AVAILABLE:
            filename, _ = QFileDialog.getSaveFileName(
                self, "导出3D模型", "", "VTK文件 (*.vtk);;PLY文件 (*.ply)")
            if filename:
                # TODO: 实现模型导出
                QMessageBox.information(self, "导出", "模型导出功能开发中...")


class EnhancedGemPyMainWindow(QMainWindow):
    """增强版GemPy主窗口"""
    
    def __init__(self):
        super().__init__()
        
        # 设置窗口属性
        self.setWindowTitle("Enhanced GemPy Professional System v2.0")
        self.setGeometry(100, 100, 1800, 1200)
        self.setMinimumSize(1400, 900)
        
        # 当前状态
        self.current_model = None
        self.project_path = None
        
        # 应用样式
        self.apply_styles()
        
        # 创建界面
        self.setup_ui()
        
        # 创建示例模型
        self.create_sample_model()
        
    def apply_styles(self):
        """应用样式"""
        if PROFESSIONAL_MODULES:
            self.setStyleSheet(AbaqusStyleSheet.get_main_style())
        else:
            # 基础样式
            self.setStyleSheet("""
                QMainWindow {
                    background-color: #f0f0f0;
                    color: #333333;
                }
                QMenuBar {
                    background-color: #e6e6e6;
                    border-bottom: 1px solid #cccccc;
                }
                QToolBar {
                    background-color: #e8e8e8;
                    border: 1px solid #cccccc;
                }
                QStatusBar {
                    background-color: #e6e6e6;
                    border-top: 1px solid #cccccc;
                }
            """)
    
    def setup_ui(self):
        """设置界面"""
        # 创建菜单栏
        self.create_menu_bar()
        
        # 创建状态栏
        self.create_status_bar()
        
        # 创建中央区域
        self.create_central_area()
        
        # 创建停靠窗口
        self.create_dock_windows()
        
    def create_menu_bar(self):
        """创建菜单栏"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu('文件(&F)')
        file_menu.addAction('新建项目(&N)', self.new_project).setShortcut('Ctrl+N')
        file_menu.addAction('打开项目(&O)', self.open_project).setShortcut('Ctrl+O')
        file_menu.addAction('保存项目(&S)', self.save_project).setShortcut('Ctrl+S')
        file_menu.addSeparator()
        file_menu.addAction('导入数据...', self.import_data)
        file_menu.addAction('导出结果...', self.export_results)
        file_menu.addSeparator()
        file_menu.addAction('退出(&X)', self.close).setShortcut('Alt+F4')
        
        # 模型菜单
        model_menu = menubar.addMenu('模型(&M)')
        model_menu.addAction('创建地质模型', self.create_model)
        model_menu.addAction('计算模型', self.compute_model)
        model_menu.addAction('验证模型', self.validate_model)
        model_menu.addSeparator()
        model_menu.addAction('不确定性分析', self.uncertainty_analysis)
        model_menu.addAction('地球物理建模', self.geophysics_modeling)
        
        # 视图菜单
        view_menu = menubar.addMenu('视图(&V)')
        view_menu.addAction('重置视图', self.reset_view)
        view_menu.addAction('适应窗口', self.fit_view)
        view_menu.addSeparator()
        view_menu.addAction('显示/隐藏数据树', self.toggle_data_tree)
        view_menu.addAction('显示/隐藏属性面板', self.toggle_property_panel)
        
        # 帮助菜单
        help_menu = menubar.addMenu('帮助(&H)')
        help_menu.addAction('用户手册', self.show_manual)
        help_menu.addAction('关于', self.show_about)
        
    def create_status_bar(self):
        """创建状态栏"""
        self.status_bar = self.statusBar()
        
        # 状态标签
        self.status_label = QLabel("增强版GemPy系统已启动")
        self.status_bar.addWidget(self.status_label)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setMaximumWidth(200)
        self.status_bar.addPermanentWidget(self.progress_bar)
        
        # 模块状态
        module_status = []
        if GEMPY_AVAILABLE:
            module_status.append("GemPy✓")
        if PYVISTA_AVAILABLE:
            module_status.append("3D✓")
        if PROFESSIONAL_MODULES:
            module_status.append("Pro✓")
            
        self.module_label = QLabel(" | ".join(module_status) if module_status else "基础模式")
        self.status_bar.addPermanentWidget(self.module_label)
        
    def create_central_area(self):
        """创建中央区域"""
        # 主分割器
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        self.setCentralWidget(main_splitter)
        
        # 左侧：数据树
        if PROFESSIONAL_MODULES:
            self.data_tree = ModelTreeWidget()
        else:
            self.data_tree = QTreeWidget()
            self.data_tree.setHeaderLabels(["地质数据"])
            
        main_splitter.addWidget(self.data_tree)
        
        # 中央：增强3D视口
        self.viewport_3d = EnhancedGemPyViewport3D()
        main_splitter.addWidget(self.viewport_3d)
        
        # 设置比例
        main_splitter.setSizes([300, 1200])
        
    def create_dock_windows(self):
        """创建停靠窗口"""
        # 属性面板
        if PROFESSIONAL_MODULES:
            self.property_panel = PropertyPanel()
        else:
            self.property_panel = QDockWidget("属性", self)
            prop_widget = QWidget()
            prop_layout = QVBoxLayout(prop_widget)
            prop_layout.addWidget(QLabel("属性面板"))
            self.property_panel.setWidget(prop_widget)
            
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.property_panel)
        
        # 消息中心
        if PROFESSIONAL_MODULES:
            self.message_center = MessageCenter()
        else:
            self.message_center = QDockWidget("消息", self)
            msg_widget = QTextEdit()
            msg_widget.setMaximumHeight(200)
            self.message_center.setWidget(msg_widget)
            
        self.addDockWidget(Qt.DockWidgetArea.BottomDockWidgetArea, self.message_center)
        
        # 设置大小
        self.resizeDocks([self.property_panel], [350], Qt.Orientation.Horizontal)
        self.resizeDocks([self.message_center], [200], Qt.Orientation.Vertical)
        
    def create_sample_model(self):
        """创建示例模型"""
        if not GEMPY_AVAILABLE:
            self.status_label.setText("GemPy未安装，无法创建示例模型")
            return
            
        try:
            # 创建简单的示例模型
            geo_model = gp.create_geomodel(
                project_name='Enhanced_Sample_Model',
                extent=[0, 1000, 0, 1000, -1000, 0],
                resolution=[50, 50, 50],
                refinement=1
            )
            
            # 添加示例地层点
            gp.add_surface_points(
                geo_model,
                x=[100, 300, 500, 700, 900],
                y=[500, 500, 500, 500, 500],
                z=[-100, -200, -150, -250, -200],
                surface=['surface1', 'surface2', 'surface1', 'surface2', 'surface1']
            )
            
            # 添加示例方向数据
            gp.add_orientations(
                geo_model,
                x=[500],
                y=[500],
                z=[-200],
                surface=['surface1'],
                orientation=[90, 0, 1]
            )
            
            self.current_model = geo_model
            self.viewport_3d.load_gempy_model(geo_model)
            
            if hasattr(self.message_center, 'add_message'):
                self.message_center.add_message("增强版示例地质模型已创建", "info")
            self.status_label.setText("示例模型已加载")
            
        except Exception as e:
            if hasattr(self.message_center, 'add_message'):
                self.message_center.add_message(f"创建示例模型失败: {e}", "error")
            print(f"创建示例模型失败: {e}")
    
    # 菜单动作实现
    def new_project(self):
        self.status_label.setText("新建项目功能")
        
    def open_project(self):
        filename, _ = QFileDialog.getOpenFileName(
            self, "打开项目", "", "GemPy项目 (*.gem *.gempy);;所有文件 (*)")
        if filename:
            self.status_label.setText(f"打开项目: {filename}")
            
    def save_project(self):
        if self.project_path:
            self.status_label.setText(f"保存项目: {self.project_path}")
        else:
            filename, _ = QFileDialog.getSaveFileName(
                self, "保存项目", "", "GemPy项目 (*.gem)")
            if filename:
                self.project_path = filename
                self.status_label.setText(f"保存项目: {filename}")
    
    def import_data(self):
        filename, _ = QFileDialog.getOpenFileName(
            self, "导入地质数据", "", "数据文件 (*.csv *.xlsx);;所有文件 (*)")
        if filename:
            self.status_label.setText(f"导入数据: {filename}")
    
    def export_results(self):
        filename, _ = QFileDialog.getSaveFileName(
            self, "导出结果", "", "VTK文件 (*.vtk);;所有文件 (*)")
        if filename:
            self.status_label.setText(f"导出结果: {filename}")
    
    def create_model(self):
        self.status_label.setText("创建地质模型")
        
    def compute_model(self):
        if self.viewport_3d:
            self.viewport_3d.compute_model()
        
    def validate_model(self):
        self.status_label.setText("验证模型")
        
    def uncertainty_analysis(self):
        QMessageBox.information(self, "不确定性分析", "不确定性分析功能开发中...")
        
    def geophysics_modeling(self):
        QMessageBox.information(self, "地球物理建模", "地球物理建模功能开发中...")
    
    def reset_view(self):
        if self.viewport_3d:
            self.viewport_3d.set_isometric_view()
        
    def fit_view(self):
        self.status_label.setText("适应窗口")
        
    def toggle_data_tree(self):
        self.data_tree.setVisible(not self.data_tree.isVisible())
        
    def toggle_property_panel(self):
        self.property_panel.setVisible(not self.property_panel.isVisible())
    
    def show_manual(self):
        QMessageBox.information(self, "用户手册", "用户手册功能开发中...")
        
    def show_about(self):
        about_text = f"""
        <h2>Enhanced GemPy Professional System</h2>
        <p><b>版本:</b> 2.0</p>
        <p><b>描述:</b> 增强版GemPy专业地质建模系统</p>
        <hr>
        <h3>核心功能:</h3>
        <ul>
        <li>增强3D地质可视化</li>
        <li>专业地质配色方案</li>
        <li>高质量渲染效果</li>
        <li>交互式模型操作</li>
        <li>实时参数调节</li>
        </ul>
        <hr>
        <h3>系统状态:</h3>
        <ul>
        <li>GemPy: {'已安装' if GEMPY_AVAILABLE else '未安装'}</li>
        <li>PyVista: {'已安装' if PYVISTA_AVAILABLE else '未安装'}</li>
        <li>专业模块: {'已加载' if PROFESSIONAL_MODULES else '未加载'}</li>
        </ul>
        """
        QMessageBox.about(self, "关于增强版GemPy系统", about_text)


def main():
    """主函数"""
    app = QApplication(sys.argv)
    app.setApplicationName("Enhanced GemPy Professional System")
    app.setApplicationVersion("2.0")
    app.setOrganizationName("DeepCAD Team")
    
    # 设置图标
    if ICONS_AVAILABLE:
        app.setWindowIcon(qta.icon('fa5s.mountain', color='#27ae60'))
    
    # 创建主窗口
    window = EnhancedGemPyMainWindow()
    window.show()
    
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())