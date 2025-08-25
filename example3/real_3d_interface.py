#!/usr/bin/env python3
"""
真正的3D可视化GemPy界面
Real 3D Visualization GemPy Interface with PyVista
"""

import sys
import os
import numpy as np
import pandas as pd

# 基础PyQt6
from PyQt6.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                           QHBoxLayout, QLabel, QPushButton, QSplitter, QFrame, 
                           QMessageBox, QProgressBar, QStatusBar)
from PyQt6.QtCore import Qt, QTimer, QThread, pyqtSignal
from PyQt6.QtGui import QFont, QColor

# 尝试导入3D可视化组件
try:
    import pyvista as pv
    from pyvistaqt import QtInteractor
    PYVISTA_AVAILABLE = True
    print("PyVista 3D visualization available")
except ImportError:
    PYVISTA_AVAILABLE = False
    print("Warning: PyVista not available - 3D visualization disabled")

# 尝试导入GemPy
try:
    sys.path.append(os.path.dirname(__file__))
    import gempy as gp
    GEMPY_AVAILABLE = True
    print("GemPy geological modeling engine available")
except ImportError:
    GEMPY_AVAILABLE = False
    print("Warning: GemPy not available")

# 尝试导入主题
try:
    from abaqus_style_theme import AbaqusStyleTheme
    THEME_AVAILABLE = True
except ImportError:
    THEME_AVAILABLE = False

class GeologicalModelBuilder(QThread):
    """后台地质建模线程"""
    
    progress_updated = pyqtSignal(int, str)
    model_completed = pyqtSignal(object, object)  # geo_model, solution
    error_occurred = pyqtSignal(str)
    
    def __init__(self):
        super().__init__()
        self.extent = [-1000, 1000, -1000, 1000, -1000, 0]
        self.resolution = [50, 50, 50]
        
    def run(self):
        """运行建模计算"""
        try:
            if not GEMPY_AVAILABLE:
                self.error_occurred.emit("GemPy not available")
                return
            
            self.progress_updated.emit(10, "Initializing GemPy model...")
            
            # 创建GemPy模型
            geo_model = gp.create_geomodel(
                project_name='Real3D_Professional_Model',
                extent=self.extent,
                resolution=self.resolution,
                refinement=1
            )
            
            self.progress_updated.emit(25, "Setting up geological structure...")
            
            # 设置地层数据
            surface_points_data = pd.DataFrame({
                'x': [0, 500, -500, 0, 250, -250, 750, -750],
                'y': [0, 0, 0, 500, 250, 250, -200, -200], 
                'z': [-100, -200, -300, -150, -175, -250, -120, -280],
                'surface': ['Layer_1', 'Layer_2', 'Layer_3', 'Basement', 
                           'Layer_1', 'Layer_2', 'Layer_1', 'Layer_3']
            })
            
            orientations_data = pd.DataFrame({
                'x': [0, 0, 0, 250],
                'y': [250, 250, 250, 0],
                'z': [-150, -225, -275, -200],
                'surface': ['Layer_1', 'Layer_2', 'Layer_3', 'Layer_1'],
                'azimuth': [90, 90, 90, 45],
                'dip': [10, 15, 20, 12],
                'polarity': [1, 1, 1, 1]
            })
            
            self.progress_updated.emit(40, "Adding geological data...")
            
            # 添加地层点
            gp.add_surface_points(
                geo_model,
                x=surface_points_data['x'],
                y=surface_points_data['y'], 
                z=surface_points_data['z'],
                surface=surface_points_data['surface']
            )
            
            # 添加方向数据
            gp.add_orientations(
                geo_model,
                x=orientations_data['x'],
                y=orientations_data['y'],
                z=orientations_data['z'],
                surface=orientations_data['surface'],
                orientation=orientations_data[['azimuth', 'dip']].values
            )
            
            self.progress_updated.emit(60, "Compiling interpolation engine...")
            
            # 设置插值器
            gp.set_interpolator(geo_model)
            
            self.progress_updated.emit(80, "Computing 3D geological model...")
            
            # 计算模型
            solution = gp.compute_model(geo_model, compute_mesh=True)
            
            self.progress_updated.emit(100, "Model computation complete!")
            
            # 发射完成信号
            self.model_completed.emit(geo_model, solution)
            
        except Exception as e:
            self.error_occurred.emit(f"Model building failed: {str(e)}")

class Real3DViewer(QWidget):
    """真正的3D可视化组件"""
    
    def __init__(self):
        super().__init__()
        self.geo_model = None
        self.solution = None
        self.plotter = None
        self.setup_3d_viewer()
        
    def setup_3d_viewer(self):
        """设置3D查看器"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(5, 5, 5, 5)
        
        # 工具栏
        toolbar = QHBoxLayout()
        
        # 3D控制按钮
        self.show_surfaces_btn = QPushButton("显示地质界面")
        self.show_surfaces_btn.setCheckable(True)
        self.show_surfaces_btn.setChecked(True)
        self.show_surfaces_btn.clicked.connect(self.update_3d_display)
        
        self.show_points_btn = QPushButton("显示数据点")  
        self.show_points_btn.setCheckable(True)
        self.show_points_btn.setChecked(True)
        self.show_points_btn.clicked.connect(self.update_3d_display)
        
        self.reset_view_btn = QPushButton("重置视角")
        self.reset_view_btn.clicked.connect(self.reset_camera)
        
        self.screenshot_btn = QPushButton("截图")
        self.screenshot_btn.clicked.connect(self.take_screenshot)
        
        toolbar.addWidget(self.show_surfaces_btn)
        toolbar.addWidget(self.show_points_btn)
        toolbar.addWidget(self.reset_view_btn)
        toolbar.addWidget(self.screenshot_btn)
        toolbar.addStretch()
        
        layout.addLayout(toolbar)
        
        # 3D渲染区域
        if PYVISTA_AVAILABLE:
            # 创建PyVista Qt交互器
            self.plotter = QtInteractor(self)
            self.plotter.set_background('black')
            layout.addWidget(self.plotter.interactor)
            
            # 初始化3D场景
            self.init_3d_scene()
            
        else:
            # 备用显示
            placeholder = QLabel("PyVista 3D Visualization Not Available\n\n"
                                "Install PyVista for real-time 3D rendering:\n"
                                "pip install pyvista pyvistaqt\n\n"
                                "Current mode: Text-based display")
            placeholder.setAlignment(Qt.AlignmentFlag.AlignCenter)
            placeholder.setStyleSheet("""
                QLabel {
                    background-color: #2d3748;
                    color: #e2e8f0;
                    font-size: 14px;
                    border: 2px dashed #4a5568;
                    border-radius: 10px;
                    padding: 50px;
                }
            """)
            layout.addWidget(placeholder)
    
    def init_3d_scene(self):
        """初始化3D场景"""
        if not PYVISTA_AVAILABLE or not self.plotter:
            return
            
        # 添加坐标轴
        self.plotter.show_axes()
        
        # 设置照明
        self.plotter.enable_anti_aliasing()
        
        # 添加文本信息
        self.plotter.add_text(
            "GemPy Professional 3D Geological Visualization",
            position='upper_edge',
            font_size=12,
            color='white'
        )
        
        self.plotter.add_text(
            "Ready for geological model display...",
            position='lower_left',
            font_size=10,
            color='lightgray'
        )
    
    def update_model(self, geo_model, solution):
        """更新3D模型显示"""
        if not PYVISTA_AVAILABLE or not self.plotter:
            return
            
        print("Updating 3D visualization...")
        
        self.geo_model = geo_model
        self.solution = solution
        
        # 清除之前的显示
        self.plotter.clear()
        
        try:
            # 可视化地质模型
            self.visualize_geological_model()
            
            # 重新显示坐标轴和标签
            self.plotter.show_axes()
            self.plotter.add_text(
                "GemPy Professional 3D Model - Active",
                position='upper_edge',
                font_size=12,
                color='white'
            )
            
            print("3D visualization updated successfully")
            
        except Exception as e:
            print(f"3D visualization error: {e}")
            self.plotter.add_text(
                f"3D Visualization Error: {str(e)}",
                position='middle',
                font_size=14,
                color='red'
            )
    
    def visualize_geological_model(self):
        """可视化地质模型"""
        if not self.solution or not PYVISTA_AVAILABLE:
            return
            
        try:
            # 获取模型网格和数据
            regular_grid = self.geo_model.grid.regular_grid
            extent = regular_grid.extent
            resolution = regular_grid.resolution
            
            # 创建3D网格
            x = np.linspace(extent[0], extent[1], resolution[0])
            y = np.linspace(extent[2], extent[3], resolution[1])
            z = np.linspace(extent[4], extent[5], resolution[2])
            
            # 获取岩性块
            lith_block = self.solution.lith_block.reshape(resolution)
            
            # 创建PyVista结构化网格
            grid = pv.StructuredGrid()
            xx, yy, zz = np.meshgrid(x, y, z, indexing='ij')
            grid.points = np.c_[xx.ravel(), yy.ravel(), zz.ravel()]
            grid.dimensions = [len(x), len(y), len(z)]
            
            # 添加岩性数据
            grid.cell_data['lithology'] = lith_block.ravel()
            
            # 创建等值面显示不同地层
            if self.show_surfaces_btn.isChecked():
                unique_lithologies = np.unique(lith_block)
                colors = ['brown', 'gold', 'steelblue', 'seagreen', 'gray']
                
                for i, lith_id in enumerate(unique_lithologies):
                    if lith_id > 0:  # 跳过背景
                        try:
                            # 创建等值面
                            contour = grid.contour([lith_id - 0.5, lith_id + 0.5])
                            
                            if contour.n_points > 0:
                                color = colors[int(lith_id) % len(colors)]
                                
                                self.plotter.add_mesh(
                                    contour,
                                    color=color,
                                    opacity=0.7,
                                    name=f'Layer_{int(lith_id)}',
                                    show_edges=True,
                                    line_width=0.5
                                )
                        except Exception as e:
                            print(f"Error creating contour for lithology {lith_id}: {e}")
            
            # 显示数据点
            if self.show_points_btn.isChecked():
                try:
                    surface_points = self.geo_model.surface_points.df
                    if len(surface_points) > 0:
                        points = surface_points[['X', 'Y', 'Z']].values
                        point_cloud = pv.PolyData(points)
                        
                        self.plotter.add_mesh(
                            point_cloud,
                            color='red',
                            point_size=10,
                            name='surface_points',
                            render_points_as_spheres=True
                        )
                except Exception as e:
                    print(f"Error displaying surface points: {e}")
            
        except Exception as e:
            print(f"Geological model visualization error: {e}")
    
    def update_3d_display(self):
        """更新3D显示"""
        if self.geo_model and self.solution:
            self.visualize_geological_model()
    
    def reset_camera(self):
        """重置相机视角"""
        if PYVISTA_AVAILABLE and self.plotter:
            self.plotter.reset_camera()
    
    def take_screenshot(self):
        """截图"""
        if PYVISTA_AVAILABLE and self.plotter:
            try:
                filename = "gempy_3d_screenshot.png"
                self.plotter.screenshot(filename)
                print(f"Screenshot saved: {filename}")
                QMessageBox.information(self, "Screenshot", f"Screenshot saved: {filename}")
            except Exception as e:
                print(f"Screenshot failed: {e}")

class Real3DInterface(QMainWindow):
    """真正的3D GemPy界面"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GemPy Professional 3D Geological Modeling")
        self.setMinimumSize(1400, 900)
        self.model_builder = None
        self.setup_interface()
        
    def setup_interface(self):
        """设置界面"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(10, 10, 10, 10)
        main_layout.setSpacing(10)
        
        # 分割器
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # 左侧控制面板
        control_panel = self.create_control_panel()
        splitter.addWidget(control_panel)
        
        # 右侧3D视口
        self.viewer_3d = Real3DViewer()
        splitter.addWidget(self.viewer_3d)
        
        # 设置分割比例 
        splitter.setSizes([300, 1100])
        
        main_layout.addWidget(splitter)
        
        # 创建菜单和状态栏
        self.create_menu_bar()
        self.create_status_bar()
        
        # 应用样式
        self.apply_styling()
    
    def create_control_panel(self):
        """创建控制面板"""
        panel = QFrame()
        panel.setFixedWidth(300)
        
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(15)
        
        # 标题
        title = QLabel("3D Geological Modeling")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title.setStyleSheet("font-size: 18px; font-weight: bold; color: #3b82f6; padding: 10px;")
        layout.addWidget(title)
        
        # 状态显示
        status_text = "System Status:\n"
        if PYVISTA_AVAILABLE:
            status_text += "+ PyVista 3D: Available\n"
        else:
            status_text += "! PyVista 3D: Not Available\n"
        if GEMPY_AVAILABLE:
            status_text += "+ GemPy Engine: Ready\n"
        else:
            status_text += "! GemPy Engine: Not Available\n"
        
        status_label = QLabel(status_text)
        status_label.setStyleSheet("""
            QLabel {
                background-color: #2d3748;
                color: #e2e8f0;
                padding: 15px;
                border-radius: 8px;
                border: 2px solid #4a5568;
                font-family: monospace;
            }
        """)
        layout.addWidget(status_label)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.hide()
        layout.addWidget(self.progress_bar)
        
        # 状态标签
        self.status_label = QLabel("Ready for geological modeling")
        self.status_label.setStyleSheet("color: #10b981; font-weight: bold;")
        layout.addWidget(self.status_label)
        
        # 主要功能按钮
        buttons = [
            ("Build 3D Geological Model", self.build_geological_model, "#3b82f6"),
            ("Clear 3D Display", self.clear_display, "#6b7280"),
            ("Reset Camera View", self.reset_view, "#8b5cf6"),
            ("Export 3D Model", self.export_model, "#f59e0b")
        ]
        
        for btn_text, callback, color in buttons:
            btn = QPushButton(btn_text)
            btn.clicked.connect(callback)
            btn.setMinimumHeight(45)
            btn.setStyleSheet(f"""
                QPushButton {{
                    font-size: 13px;
                    font-weight: bold;
                    background: {color};
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 10px;
                }}
                QPushButton:hover {{
                    background: {color}dd;
                }}
                QPushButton:pressed {{
                    background: {color}aa;
                }}
            """)
            layout.addWidget(btn)
        
        layout.addStretch()
        
        return panel
    
    def create_menu_bar(self):
        """创建菜单栏"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu("File")
        file_menu.addAction("New 3D Project", self.new_project)
        file_menu.addAction("Save 3D Model", self.save_model)
        file_menu.addAction("Export Screenshot", self.export_screenshot)
        
        # 视图菜单
        view_menu = menubar.addMenu("View")
        view_menu.addAction("Reset Camera", self.reset_view)
        view_menu.addAction("Toggle Surfaces", self.toggle_surfaces)
        view_menu.addAction("Toggle Points", self.toggle_points)
        
        # 帮助菜单
        help_menu = menubar.addMenu("Help")
        help_menu.addAction("About 3D Viewer", self.show_about)
    
    def create_status_bar(self):
        """创建状态栏"""
        self.status_bar = self.statusBar()
        self.status_bar.showMessage("GemPy Professional 3D Geological Modeling - Ready")
    
    def apply_styling(self):
        """应用样式"""
        if THEME_AVAILABLE:
            try:
                self.setStyleSheet(AbaqusStyleTheme.get_abaqus_stylesheet())
            except:
                self.apply_default_style()
        else:
            self.apply_default_style()
    
    def apply_default_style(self):
        """应用默认样式"""
        self.setStyleSheet("""
            QMainWindow {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 #0f172a, stop:0.5 #1e293b, stop:1 #0f172a);
                color: #e2e8f0;
            }
            QMenuBar {
                background: #2d3748;
                color: #e2e8f0;
                border-bottom: 1px solid #4a5568;
            }
            QMenuBar::item:selected {
                background: #3b82f6;
            }
            QStatusBar {
                background: #2d3748;
                color: #e2e8f0;
                border-top: 1px solid #4a5568;
            }
        """)
    
    # 功能实现
    def build_geological_model(self):
        """构建地质模型"""
        if not GEMPY_AVAILABLE:
            QMessageBox.warning(self, "Warning", "GemPy is not available. Please install GemPy.")
            return
            
        self.status_label.setText("Building 3D geological model...")
        self.status_bar.showMessage("Computing 3D geological model...")
        
        # 显示进度条
        self.progress_bar.show()
        self.progress_bar.setValue(0)
        
        # 启动建模线程
        self.model_builder = GeologicalModelBuilder()
        self.model_builder.progress_updated.connect(self.on_progress_updated)
        self.model_builder.model_completed.connect(self.on_model_completed)
        self.model_builder.error_occurred.connect(self.on_error_occurred)
        self.model_builder.start()
    
    def on_progress_updated(self, value, message):
        """进度更新"""
        self.progress_bar.setValue(value)
        self.status_label.setText(message)
        self.status_bar.showMessage(message)
    
    def on_model_completed(self, geo_model, solution):
        """模型完成"""
        self.progress_bar.hide()
        self.status_label.setText("3D Model ready - displaying in viewer")
        self.status_bar.showMessage("3D geological model computed successfully")
        
        # 更新3D显示
        self.viewer_3d.update_model(geo_model, solution)
        
        QMessageBox.information(self, "Success", "3D Geological model built successfully!\nNow displayed in 3D viewer.")
    
    def on_error_occurred(self, error_msg):
        """错误处理"""
        self.progress_bar.hide()
        self.status_label.setText(f"Error: {error_msg}")
        self.status_bar.showMessage("Model building failed")
        
        QMessageBox.critical(self, "Error", f"Model building failed:\n{error_msg}")
    
    def clear_display(self):
        """清除显示"""
        if PYVISTA_AVAILABLE and self.viewer_3d.plotter:
            self.viewer_3d.plotter.clear()
            self.viewer_3d.init_3d_scene()
        self.status_bar.showMessage("3D display cleared")
    
    def reset_view(self):
        """重置视图"""
        self.viewer_3d.reset_camera()
        self.status_bar.showMessage("Camera view reset")
    
    def export_model(self):
        """导出模型"""
        self.viewer_3d.take_screenshot()
    
    def new_project(self):
        self.status_bar.showMessage("New 3D project")
    
    def save_model(self):
        self.status_bar.showMessage("Save 3D model")
    
    def export_screenshot(self):
        self.viewer_3d.take_screenshot()
    
    def toggle_surfaces(self):
        if hasattr(self.viewer_3d, 'show_surfaces_btn'):
            self.viewer_3d.show_surfaces_btn.toggle()
            self.viewer_3d.update_3d_display()
    
    def toggle_points(self):
        if hasattr(self.viewer_3d, 'show_points_btn'):
            self.viewer_3d.show_points_btn.toggle()
            self.viewer_3d.update_3d_display()
    
    def show_about(self):
        QMessageBox.about(self, "About", 
                         "GemPy Professional 3D Geological Modeling\n"
                         "Real-time 3D visualization with PyVista\n"
                         "Professional geological modeling interface")

def main():
    print("=== GemPy Professional 3D Geological Modeling ===")
    print("Initializing real-time 3D visualization interface...")
    
    app = QApplication(sys.argv)
    app.setStyle('Fusion')
    
    # 设置字体
    font = QFont("Segoe UI", 9)
    app.setFont(font)
    
    # 检查3D能力
    if PYVISTA_AVAILABLE:
        print("+ PyVista 3D engine loaded successfully")
    else:
        print("! PyVista not available - limited 3D functionality")
    
    if GEMPY_AVAILABLE:
        print("+ GemPy geological engine loaded successfully")
    else:
        print("! GemPy not available - demo mode only")
    
    # 创建主窗口
    window = Real3DInterface()
    window.show()
    
    print("3D Interface launched successfully!")
    print("Real-time geological 3D visualization ready")
    print("===============================================")
    
    sys.exit(app.exec())

if __name__ == "__main__":
    main()