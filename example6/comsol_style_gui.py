#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
COMSOL风格的专业地质建模可视化界面
Professional Geological Modeling Visualization in COMSOL Style
"""

import sys
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure
from PyQt5.QtWidgets import *
from PyQt5.QtCore import *
from PyQt5.QtGui import *

try:
    import pyvista as pv
    import pyvistaqt as pvqt
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    print("PyVista not available, using matplotlib fallback")


class COMSOLStyleRenderer:
    """COMSOL风格的高质量渲染器"""
    
    def __init__(self):
        self.setup_comsol_colormaps()
        self.setup_material_properties()
    
    def setup_comsol_colormaps(self):
        """设置COMSOL风格的科学色彩映射"""
        
        # 经典COMSOL热力学色彩映射
        self.thermal_cmap = plt.cm.colors.LinearSegmentedColormap.from_list(
            'comsol_thermal', 
            ['#000080', '#0000FF', '#00FFFF', '#00FF00', '#FFFF00', '#FF8000', '#FF0000', '#800000']
        )
        
        # COMSOL流体动力学色彩映射  
        self.flow_cmap = plt.cm.colors.LinearSegmentedColormap.from_list(
            'comsol_flow',
            ['#000040', '#000080', '#0040FF', '#00FFFF', '#40FF40', '#FFFF00', '#FF4000', '#800000']
        )
        
        # 地质专业色彩映射
        self.geological_cmap = plt.cm.colors.LinearSegmentedColormap.from_list(
            'comsol_geo',
            ['#8B4513', '#D2B48C', '#F4A460', '#DDD', '#A0A0A0', '#696969', '#2F4F4F']
        )
    
    def setup_material_properties(self):
        """设置材质属性"""
        self.material_properties = {
            'opacity': 0.85,
            'specular': 0.3,
            'ambient': 0.2, 
            'diffuse': 0.8,
            'roughness': 0.1,
            'metallic': 0.0
        }


class MultiViewWidget(QWidget):
    """多视图联动显示组件"""
    
    def __init__(self):
        super().__init__()
        self.init_ui()
        self.renderer = COMSOLStyleRenderer()
        
    def init_ui(self):
        """初始化界面"""
        layout = QGridLayout(self)
        
        # 主3D视图
        self.main_3d_widget = self.create_3d_widget("主视图 (3D)")
        layout.addWidget(self.main_3d_widget, 0, 0, 2, 2)
        
        # XY剖面图
        self.xy_widget = self.create_2d_widget("XY剖面")
        layout.addWidget(self.xy_widget, 2, 0)
        
        # XZ剖面图  
        self.xz_widget = self.create_2d_widget("XZ剖面")
        layout.addWidget(self.xz_widget, 2, 1)
        
        # YZ剖面图
        self.yz_widget = self.create_2d_widget("YZ剖面") 
        layout.addWidget(self.yz_widget, 2, 2)
        
        # 控制面板
        self.control_panel = self.create_control_panel()
        layout.addWidget(self.control_panel, 0, 2, 2, 1)
        
        # 设置布局比例
        layout.setColumnStretch(0, 2)
        layout.setColumnStretch(1, 2) 
        layout.setColumnStretch(2, 1)
        layout.setRowStretch(0, 3)
        layout.setRowStretch(1, 3)
        layout.setRowStretch(2, 1)
    
    def create_3d_widget(self, title):
        """创建3D显示组件"""
        if PYVISTA_AVAILABLE:
            return self.create_pyvista_widget(title)
        else:
            return self.create_matplotlib_3d_widget(title)
    
    def create_pyvista_widget(self, title):
        """创建PyVista 3D组件"""
        frame = QFrame()
        frame.setFrameStyle(QFrame.StyledPanel)
        layout = QVBoxLayout(frame)
        
        # 标题
        label = QLabel(title)
        label.setAlignment(Qt.AlignCenter)
        label.setStyleSheet("font-weight: bold; background: #E0E0E0; padding: 5px;")
        layout.addWidget(label)
        
        # PyVista渲染组件
        plotter = pvqt.QtInteractor(frame)
        layout.addWidget(plotter.interactor)
        
        # 设置COMSOL风格
        plotter.set_background('#F0F0F0')  # COMSOL的浅灰背景
        
        # 示例数据 - 创建地质模型
        self.setup_geological_model(plotter)
        
        frame.plotter = plotter
        return frame
    
    def create_matplotlib_3d_widget(self, title):
        """创建Matplotlib 3D组件"""
        frame = QFrame()
        frame.setFrameStyle(QFrame.StyledPanel)
        layout = QVBoxLayout(frame)
        
        # 标题
        label = QLabel(title)
        label.setAlignment(Qt.AlignCenter)
        label.setStyleSheet("font-weight: bold; background: #E0E0E0; padding: 5px;")
        layout.addWidget(label)
        
        # Matplotlib图形
        fig = Figure(figsize=(8, 6), facecolor='#F0F0F0')
        canvas = FigureCanvas(fig)
        layout.addWidget(canvas)
        
        # 3D子图
        ax = fig.add_subplot(111, projection='3d')
        ax.set_facecolor('#F0F0F0')
        
        # 示例地质模型
        self.plot_geological_model_matplotlib(ax)
        
        canvas.draw()
        frame.canvas = canvas
        frame.figure = fig
        return frame
    
    def create_2d_widget(self, title):
        """创建2D剖面组件"""
        frame = QFrame()
        frame.setFrameStyle(QFrame.StyledPanel)
        layout = QVBoxLayout(frame)
        
        # 标题
        label = QLabel(title)
        label.setAlignment(Qt.AlignCenter)
        label.setStyleSheet("font-weight: bold; background: #E0E0E0; padding: 5px;")
        layout.addWidget(label)
        
        # Matplotlib图形
        fig = Figure(figsize=(4, 3), facecolor='#F0F0F0')
        canvas = FigureCanvas(fig)
        layout.addWidget(canvas)
        
        ax = fig.add_subplot(111)
        ax.set_facecolor('#FFFFFF')
        
        # 根据标题绘制相应剖面
        if "XY" in title:
            self.plot_xy_section(ax)
        elif "XZ" in title:
            self.plot_xz_section(ax)  
        elif "YZ" in title:
            self.plot_yz_section(ax)
        
        canvas.draw()
        frame.canvas = canvas
        frame.figure = fig
        return frame
    
    def create_control_panel(self):
        """创建COMSOL风格控制面板"""
        panel = QFrame()
        panel.setFrameStyle(QFrame.StyledPanel)
        panel.setMaximumWidth(280)
        
        layout = QVBoxLayout(panel)
        
        # 材质控制
        material_group = QGroupBox("材质属性")
        material_layout = QVBoxLayout(material_group)
        
        # 透明度控制
        opacity_layout = QHBoxLayout()
        opacity_layout.addWidget(QLabel("透明度:"))
        self.opacity_slider = QSlider(Qt.Horizontal)
        self.opacity_slider.setRange(0, 100)
        self.opacity_slider.setValue(85)
        self.opacity_slider.valueChanged.connect(self.update_opacity)
        opacity_layout.addWidget(self.opacity_slider)
        opacity_label = QLabel("0.85")
        self.opacity_slider.valueChanged.connect(lambda v: opacity_label.setText(f"{v/100:.2f}"))
        opacity_layout.addWidget(opacity_label)
        material_layout.addLayout(opacity_layout)
        
        # 光泽度控制
        specular_layout = QHBoxLayout()
        specular_layout.addWidget(QLabel("光泽度:"))
        self.specular_slider = QSlider(Qt.Horizontal)
        self.specular_slider.setRange(0, 100)
        self.specular_slider.setValue(30)
        self.specular_slider.valueChanged.connect(self.update_specular)
        specular_layout.addWidget(self.specular_slider)
        specular_label = QLabel("0.30")
        self.specular_slider.valueChanged.connect(lambda v: specular_label.setText(f"{v/100:.2f}"))
        specular_layout.addWidget(specular_label)
        material_layout.addLayout(specular_layout)
        
        layout.addWidget(material_group)
        
        # 颜色映射控制
        colormap_group = QGroupBox("色彩映射")
        colormap_layout = QVBoxLayout(colormap_group)
        
        self.colormap_combo = QComboBox()
        self.colormap_combo.addItems(["地质专业", "热力学", "流体动力学", "默认"])
        self.colormap_combo.currentTextChanged.connect(self.update_colormap)
        colormap_layout.addWidget(self.colormap_combo)
        
        layout.addWidget(colormap_group)
        
        # 显示控制
        display_group = QGroupBox("显示选项")
        display_layout = QVBoxLayout(display_group)
        
        self.wireframe_check = QCheckBox("线框模式")
        self.wireframe_check.toggled.connect(self.toggle_wireframe)
        display_layout.addWidget(self.wireframe_check)
        
        self.edges_check = QCheckBox("显示边界")
        self.edges_check.setChecked(True)
        self.edges_check.toggled.connect(self.toggle_edges)
        display_layout.addWidget(self.edges_check)
        
        self.lighting_check = QCheckBox("高级光照")
        self.lighting_check.setChecked(True)
        self.lighting_check.toggled.connect(self.toggle_lighting)
        display_layout.addWidget(self.lighting_check)
        
        layout.addWidget(display_group)
        
        # 视图控制
        view_group = QGroupBox("视图控制")
        view_layout = QVBoxLayout(view_group)
        
        view_buttons = [
            ("正交视图", self.set_orthographic),
            ("透视视图", self.set_perspective),
            ("重置视图", self.reset_view),
            ("适应窗口", self.fit_to_window)
        ]
        
        for text, func in view_buttons:
            btn = QPushButton(text)
            btn.clicked.connect(func)
            view_layout.addWidget(btn)
        
        layout.addWidget(view_group)
        
        layout.addStretch()
        
        return panel
    
    def setup_geological_model(self, plotter):
        """设置地质模型数据"""
        # 创建多层地质结构
        layers = self.create_geological_layers()
        
        for i, layer in enumerate(layers):
            mesh = pv.StructuredGrid(*layer['coords'])
            
            # 应用COMSOL风格材质
            plotter.add_mesh(
                mesh,
                color=layer['color'],
                opacity=self.renderer.material_properties['opacity'],
                specular=self.renderer.material_properties['specular'],
                ambient=self.renderer.material_properties['ambient'],
                diffuse=self.renderer.material_properties['diffuse'],
                show_edges=True,
                edge_color='white',
                line_width=0.5,
                name=f'layer_{i}'
            )
        
        # 添加专业照明
        plotter.add_light(pv.Light(position=(10, 10, 10), focal_point=(0, 0, 0)))
        plotter.add_light(pv.Light(position=(-10, -10, 10), focal_point=(0, 0, 0), intensity=0.3))
    
    def create_geological_layers(self):
        """创建地质层数据"""
        layers = []
        
        # 第四系
        x, y = np.meshgrid(np.linspace(-10, 10, 20), np.linspace(-5, 5, 15))
        z_top = np.full_like(x, 2.0) + 0.5 * np.sin(0.3 * x) * np.cos(0.3 * y)
        z_bottom = np.full_like(x, 0.0)
        
        layers.append({
            'coords': (x, y, np.stack([z_bottom, z_top], axis=0)),
            'color': '#D2B48C',  # 浅棕色
            'name': '第四系'
        })
        
        # 第三系
        z_top = z_bottom
        z_bottom = np.full_like(x, -3.0) + 0.8 * np.sin(0.2 * x) * np.cos(0.4 * y)
        
        layers.append({
            'coords': (x, y, np.stack([z_bottom, z_top], axis=0)),
            'color': '#F4A460',  # 沙褐色
            'name': '第三系'
        })
        
        # 白垩系
        z_top = z_bottom  
        z_bottom = np.full_like(x, -6.0) + np.sin(0.1 * x) * np.cos(0.2 * y)
        
        layers.append({
            'coords': (x, y, np.stack([z_bottom, z_top], axis=0)),
            'color': '#DDD',  # 浅灰色
            'name': '白垩系'
        })
        
        return layers
    
    def plot_geological_model_matplotlib(self, ax):
        """使用Matplotlib绘制地质模型"""
        # 创建简化的3D地质模型
        x = np.linspace(-10, 10, 20)
        y = np.linspace(-5, 5, 15)
        X, Y = np.meshgrid(x, y)
        
        # 不同地质层
        Z1 = 2 + 0.5 * np.sin(0.3 * X) * np.cos(0.3 * Y)  # 第四系
        Z2 = -1 + 0.8 * np.sin(0.2 * X) * np.cos(0.4 * Y)  # 第三系
        Z3 = -4 + np.sin(0.1 * X) * np.cos(0.2 * Y)  # 白垩系
        
        # 绘制各层
        ax.plot_surface(X, Y, Z1, cmap=self.renderer.geological_cmap, alpha=0.8, label='第四系')
        ax.plot_surface(X, Y, Z2, cmap=self.renderer.geological_cmap, alpha=0.7, label='第三系') 
        ax.plot_surface(X, Y, Z3, cmap=self.renderer.geological_cmap, alpha=0.6, label='白垩系')
        
        # COMSOL风格设置
        ax.set_xlabel('X (m)')
        ax.set_ylabel('Y (m)')
        ax.set_zlabel('Z (m)')
        ax.grid(True, alpha=0.3)
        
        # 设置视角
        ax.view_init(elev=20, azim=45)
    
    def plot_xy_section(self, ax):
        """绘制XY剖面"""
        x = np.linspace(-10, 10, 50)
        y = np.linspace(-5, 5, 30)
        X, Y = np.meshgrid(x, y)
        
        # 地质层在Z=0平面的分布
        Z = np.sin(0.3 * X) * np.cos(0.4 * Y) + 0.5 * np.sin(0.1 * X * Y)
        
        im = ax.contourf(X, Y, Z, levels=20, cmap=self.renderer.geological_cmap)
        ax.contour(X, Y, Z, levels=10, colors='white', linewidths=0.5, alpha=0.8)
        
        ax.set_xlabel('X (m)')
        ax.set_ylabel('Y (m)')
        ax.set_title('Z = 0 m')
        ax.grid(True, alpha=0.3)
        ax.set_aspect('equal')
    
    def plot_xz_section(self, ax):
        """绘制XZ剖面"""
        x = np.linspace(-10, 10, 50)
        z = np.linspace(-6, 3, 30)
        X, Z = np.meshgrid(x, z)
        
        # 地质层在Y=0平面的分布
        Y_val = np.sin(0.2 * X) * np.cos(0.3 * Z) + 0.3 * np.sin(0.15 * X * Z)
        
        im = ax.contourf(X, Z, Y_val, levels=20, cmap=self.renderer.geological_cmap)
        ax.contour(X, Z, Y_val, levels=10, colors='white', linewidths=0.5, alpha=0.8)
        
        ax.set_xlabel('X (m)')
        ax.set_ylabel('Z (m)')  
        ax.set_title('Y = 0 m')
        ax.grid(True, alpha=0.3)
        ax.set_aspect('equal')
    
    def plot_yz_section(self, ax):
        """绘制YZ剖面"""
        y = np.linspace(-5, 5, 30)
        z = np.linspace(-6, 3, 30) 
        Y, Z = np.meshgrid(y, z)
        
        # 地质层在X=0平面的分布
        X_val = np.sin(0.4 * Y) * np.cos(0.2 * Z) + 0.4 * np.sin(0.1 * Y * Z)
        
        im = ax.contourf(Y, Z, X_val, levels=20, cmap=self.renderer.geological_cmap)
        ax.contour(Y, Z, X_val, levels=10, colors='white', linewidths=0.5, alpha=0.8)
        
        ax.set_xlabel('Y (m)')
        ax.set_ylabel('Z (m)')
        ax.set_title('X = 0 m')
        ax.grid(True, alpha=0.3)
        ax.set_aspect('equal')
    
    # 控制面板回调函数
    def update_opacity(self, value):
        """更新透明度"""
        opacity = value / 100.0
        if hasattr(self.main_3d_widget, 'plotter'):
            for i in range(3):  # 三个地质层
                mesh = self.main_3d_widget.plotter.mesh[f'layer_{i}']
                if mesh:
                    mesh.GetProperty().SetOpacity(opacity)
            self.main_3d_widget.plotter.render()
    
    def update_specular(self, value):
        """更新光泽度"""
        specular = value / 100.0
        if hasattr(self.main_3d_widget, 'plotter'):
            for i in range(3):
                mesh = self.main_3d_widget.plotter.mesh[f'layer_{i}']
                if mesh:
                    mesh.GetProperty().SetSpecular(specular)
            self.main_3d_widget.plotter.render()
    
    def update_colormap(self, colormap_name):
        """更新颜色映射"""
        cmap_dict = {
            "地质专业": self.renderer.geological_cmap,
            "热力学": self.renderer.thermal_cmap,
            "流体动力学": self.renderer.flow_cmap,
            "默认": plt.cm.viridis
        }
        
        selected_cmap = cmap_dict.get(colormap_name, self.renderer.geological_cmap)
        
        # 更新所有2D图的颜色映射
        for widget_name in ['xy_widget', 'xz_widget', 'yz_widget']:
            widget = getattr(self, widget_name)
            if hasattr(widget, 'figure'):
                ax = widget.figure.axes[0]
                ax.clear()
                
                if 'xy' in widget_name:
                    self.plot_xy_section(ax)
                elif 'xz' in widget_name:
                    self.plot_xz_section(ax)
                elif 'yz' in widget_name:
                    self.plot_yz_section(ax)
                
                widget.canvas.draw()
    
    def toggle_wireframe(self, checked):
        """切换线框模式"""
        if hasattr(self.main_3d_widget, 'plotter'):
            for i in range(3):
                mesh = self.main_3d_widget.plotter.mesh[f'layer_{i}']
                if mesh:
                    if checked:
                        mesh.GetProperty().SetRepresentationToWireframe()
                    else:
                        mesh.GetProperty().SetRepresentationToSurface()
            self.main_3d_widget.plotter.render()
    
    def toggle_edges(self, checked):
        """切换边界显示"""
        if hasattr(self.main_3d_widget, 'plotter'):
            for i in range(3):
                mesh = self.main_3d_widget.plotter.mesh[f'layer_{i}']
                if mesh:
                    mesh.GetProperty().SetEdgeVisibility(checked)
            self.main_3d_widget.plotter.render()
    
    def toggle_lighting(self, checked):
        """切换高级光照"""
        if hasattr(self.main_3d_widget, 'plotter'):
            self.main_3d_widget.plotter.enable_lightkit() if checked else self.main_3d_widget.plotter.disable_lightkit()
            self.main_3d_widget.plotter.render()
    
    def set_orthographic(self):
        """设置正交视图"""
        if hasattr(self.main_3d_widget, 'plotter'):
            self.main_3d_widget.plotter.camera.parallel_projection = True
            self.main_3d_widget.plotter.render()
    
    def set_perspective(self):
        """设置透视视图"""
        if hasattr(self.main_3d_widget, 'plotter'):
            self.main_3d_widget.plotter.camera.parallel_projection = False
            self.main_3d_widget.plotter.render()
    
    def reset_view(self):
        """重置视图"""
        if hasattr(self.main_3d_widget, 'plotter'):
            self.main_3d_widget.plotter.reset_camera()
            self.main_3d_widget.plotter.render()
    
    def fit_to_window(self):
        """适应窗口"""
        if hasattr(self.main_3d_widget, 'plotter'):
            self.main_3d_widget.plotter.reset_camera()
            self.main_3d_widget.plotter.render()


class COMSOLStyleMainWindow(QMainWindow):
    """COMSOL风格主窗口"""
    
    def __init__(self):
        super().__init__()
        self.init_ui()
    
    def init_ui(self):
        """初始化界面"""
        self.setWindowTitle("Professional Geological Modeling - COMSOL Style")
        self.setGeometry(100, 100, 1600, 1000)
        
        # 设置COMSOL风格样式
        self.setStyleSheet("""
            QMainWindow {
                background-color: #F0F0F0;
            }
            QGroupBox {
                font-weight: bold;
                border: 2px solid #CCCCCC;
                border-radius: 5px;
                margin: 5px;
                padding-top: 10px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 5px 0 5px;
            }
            QPushButton {
                background-color: #E8E8E8;
                border: 1px solid #AAAAAA;
                border-radius: 3px;
                padding: 5px;
                min-height: 20px;
            }
            QPushButton:hover {
                background-color: #D0D0D0;
            }
            QPushButton:pressed {
                background-color: #C0C0C0;
            }
            QSlider::groove:horizontal {
                height: 6px;
                background: #DDDDDD;
                border-radius: 3px;
            }
            QSlider::handle:horizontal {
                background: #4A90E2;
                border: 1px solid #357ABD;
                width: 12px;
                margin: -3px 0;
                border-radius: 6px;
            }
        """)
        
        # 创建菜单栏
        self.create_menu_bar()
        
        # 创建工具栏
        self.create_tool_bar()
        
        # 创建状态栏
        self.create_status_bar()
        
        # 创建中心组件
        self.multi_view_widget = MultiViewWidget()
        self.setCentralWidget(self.multi_view_widget)
    
    def create_menu_bar(self):
        """创建菜单栏"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu('文件(&F)')
        file_menu.addAction('新建项目', self.new_project, 'Ctrl+N')
        file_menu.addAction('打开项目', self.open_project, 'Ctrl+O')
        file_menu.addAction('保存项目', self.save_project, 'Ctrl+S')
        file_menu.addSeparator()
        file_menu.addAction('导入数据', self.import_data)
        file_menu.addAction('导出结果', self.export_results)
        file_menu.addSeparator()
        file_menu.addAction('退出', self.close, 'Ctrl+Q')
        
        # 视图菜单
        view_menu = menubar.addMenu('视图(&V)')
        view_menu.addAction('重置视图', self.multi_view_widget.reset_view)
        view_menu.addAction('适应窗口', self.multi_view_widget.fit_to_window)
        view_menu.addSeparator()
        view_menu.addAction('正交投影', self.multi_view_widget.set_orthographic)
        view_menu.addAction('透视投影', self.multi_view_widget.set_perspective)
        
        # 工具菜单
        tools_menu = menubar.addMenu('工具(&T)')
        tools_menu.addAction('材质编辑器', self.open_material_editor)
        tools_menu.addAction('光照设置', self.open_lighting_settings)
        tools_menu.addAction('渲染设置', self.open_render_settings)
    
    def create_tool_bar(self):
        """创建工具栏"""
        toolbar = self.addToolBar('主工具栏')
        
        # 文件操作
        toolbar.addAction('新建', self.new_project)
        toolbar.addAction('打开', self.open_project)
        toolbar.addAction('保存', self.save_project)
        toolbar.addSeparator()
        
        # 视图操作
        toolbar.addAction('重置视图', self.multi_view_widget.reset_view)
        toolbar.addAction('适应窗口', self.multi_view_widget.fit_to_window)
        toolbar.addSeparator()
        
        # 渲染模式
        toolbar.addAction('线框模式', lambda: self.multi_view_widget.toggle_wireframe(True))
        toolbar.addAction('实体模式', lambda: self.multi_view_widget.toggle_wireframe(False))
    
    def create_status_bar(self):
        """创建状态栏"""
        statusbar = self.statusBar()
        statusbar.showMessage('准备就绪 - COMSOL风格地质建模系统')
    
    # 菜单回调函数
    def new_project(self):
        """新建项目"""
        self.statusBar().showMessage('创建新项目...')
    
    def open_project(self):
        """打开项目"""
        self.statusBar().showMessage('打开项目...')
    
    def save_project(self):
        """保存项目"""
        self.statusBar().showMessage('保存项目...')
    
    def import_data(self):
        """导入数据"""
        self.statusBar().showMessage('导入数据...')
    
    def export_results(self):
        """导出结果"""
        self.statusBar().showMessage('导出结果...')
    
    def open_material_editor(self):
        """打开材质编辑器"""
        self.statusBar().showMessage('材质编辑器...')
    
    def open_lighting_settings(self):
        """打开光照设置"""
        self.statusBar().showMessage('光照设置...')
    
    def open_render_settings(self):
        """打开渲染设置"""
        self.statusBar().showMessage('渲染设置...')


def main():
    """主函数"""
    app = QApplication(sys.argv)
    
    # 设置应用程序信息
    app.setApplicationName("Professional Geological Modeling")
    app.setApplicationVersion("1.0")
    app.setOrganizationName("GeoModeling Solutions")
    
    # 创建主窗口
    window = COMSOLStyleMainWindow()
    window.show()
    
    sys.exit(app.exec_())


if __name__ == '__main__':
    main()