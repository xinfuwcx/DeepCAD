"""
GemPy CAE 主窗口
Professional Geological Modeling CAE System Main Window
"""

import sys
import os
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any
import json
from pathlib import Path

# PyQt6 imports
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QSplitter, QTabWidget, QTextEdit, QToolBar, QMenuBar, QStatusBar, 
    QDockWidget, QGroupBox, QFormLayout, QLabel, QLineEdit, QPushButton, 
    QComboBox, QSpinBox, QDoubleSpinBox, QCheckBox, QProgressBar, 
    QFileDialog, QMessageBox, QDialog, QDialogButtonBox, QScrollArea,
    QFrame, QButtonGroup, QRadioButton, QSlider, QListWidget, QGridLayout,
    QToolButton, QSizePolicy
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QTimer, QMimeData, QUrl, QSize
from PyQt6.QtGui import (
    QAction, QIcon, QFont, QPixmap, QPalette, QColor, QDragEnterEvent, 
    QDropEvent, QStandardItemModel, QStandardItem, QKeySequence
)

# Scientific computing
import gempy as gp
import pyvista as pv
import pyvistaqt as pvqt
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
from matplotlib.figure import Figure

# 导入自定义模块
from professional_gempy_cae import (
    AbaqusStyleSheet, ModelTreeWidget, PropertyPanel, MessageCenter
)

try:
    import qtawesome as qta
    ICONS_AVAILABLE = True
except ImportError:
    ICONS_AVAILABLE = False

class GemPyViewport3D(QWidget):
    """3D视口 - 集成PyVista和GemPy"""
    
    # 信号定义
    object_selected = pyqtSignal(str, str, dict)  # (obj_type, obj_name, properties)
    viewport_clicked = pyqtSignal(tuple)  # (x, y, z)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_viewport()
        self.current_model = None
        self.geological_objects = {}
        
    def setup_viewport(self):
        """设置3D视口"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 创建工具栏
        self.create_viewport_toolbar()
        layout.addWidget(self.toolbar)
        
        # 创建PyVista渲染器
        self.plotter = pvqt.QtInteractor(self)
        self.plotter.set_background([0.2, 0.3, 0.4])  # 深蓝色背景
        layout.addWidget(self.plotter)
        
        # 设置相机
        self.setup_camera()
        
        # 设置光照
        self.setup_lighting()
        
        # 添加坐标轴
        self.add_coordinate_axes()
        
    def create_viewport_toolbar(self):
        """创建视口工具栏"""
        self.toolbar = QToolBar()
        self.toolbar.setMovable(False)
        self.toolbar.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonIconOnly)
        self.toolbar.setIconSize(QSize(20, 20))
        
        # 视图控制按钮
        if ICONS_AVAILABLE:
            # 等轴视图
            iso_action = QAction(qta.icon('fa5s.cube'), "等轴视图", self)
            iso_action.triggered.connect(self.set_isometric_view)
            self.toolbar.addAction(iso_action)
            
            # 俯视图
            top_action = QAction(qta.icon('fa5s.eye'), "俯视图", self)
            top_action.triggered.connect(self.set_top_view)
            self.toolbar.addAction(top_action)
            
            # 前视图
            front_action = QAction(qta.icon('fa5s.arrows-alt-h'), "前视图", self)
            front_action.triggered.connect(self.set_front_view)
            self.toolbar.addAction(front_action)
            
            # 侧视图
            side_action = QAction(qta.icon('fa5s.arrows-alt-v'), "侧视图", self)
            side_action.triggered.connect(self.set_side_view)
            self.toolbar.addAction(side_action)
            
            self.toolbar.addSeparator()
            
            # 渲染模式
            wireframe_action = QAction(qta.icon('fa5s.project-diagram'), "线框模式", self)
            wireframe_action.triggered.connect(self.toggle_wireframe)
            self.toolbar.addAction(wireframe_action)
            
            surface_action = QAction(qta.icon('fa5s.layer-group'), "表面模式", self)
            surface_action.triggered.connect(self.toggle_surface)
            self.toolbar.addAction(surface_action)
            
            self.toolbar.addSeparator()
            
            # 工具
            measure_action = QAction(qta.icon('fa5s.ruler'), "测量工具", self)
            measure_action.triggered.connect(self.activate_measure_tool)
            self.toolbar.addAction(measure_action)
            
            section_action = QAction(qta.icon('fa5s.cut'), "剖面工具", self)
            section_action.triggered.connect(self.activate_section_tool)
            self.toolbar.addAction(section_action)
        else:
            # 如果没有图标库，使用文本按钮
            self.toolbar.addAction("等轴", self.set_isometric_view)
            self.toolbar.addAction("俯视", self.set_top_view)
            self.toolbar.addAction("前视", self.set_front_view)
            self.toolbar.addAction("侧视", self.set_side_view)
            
    def setup_camera(self):
        """设置相机"""
        self.plotter.camera_position = [(1500, 1500, 1000), (500, 500, -200), (0, 0, 1)]
        self.plotter.camera.SetParallelProjection(False)
        
    def setup_lighting(self):
        """设置光照"""
        # 移除默认光源
        self.plotter.remove_all_lights()
        
        # 添加主光源
        main_light = pv.Light(
            position=(2000, 2000, 1500),
            focal_point=(500, 500, -200),
            color='white',
            intensity=0.8
        )
        self.plotter.add_light(main_light)
        
        # 添加填充光
        fill_light = pv.Light(
            position=(-1000, -1000, 800),
            focal_point=(500, 500, -200),
            color='lightblue',
            intensity=0.4
        )
        self.plotter.add_light(fill_light)
        
    def add_coordinate_axes(self):
        """添加坐标轴"""
        self.plotter.add_axes(
            xlabel='东向 (m)', 
            ylabel='北向 (m)', 
            zlabel='高程 (m)',
            line_width=3,
            labels_off=False
        )
        
    def load_gempy_model(self, model):
        """加载GemPy模型"""
        self.current_model = model
        self.clear_scene()
        self.render_geological_model()
        
    def render_geological_model(self):
        """渲染地质模型"""
        if not self.current_model:
            return
            
        try:
            # 计算模型
            gp.compute_model(self.current_model)
            
            # 渲染地层
            self.render_geological_surfaces()
            
            # 渲染数据点
            self.render_surface_points()
            
            # 渲染方向数据
            self.render_orientations()
            
            # 渲染断层
            self.render_faults()
            
        except Exception as e:
            print(f"渲染地质模型失败: {e}")
            
    def render_geological_surfaces(self):
        """渲染地质层面"""
        if not hasattr(self.current_model, 'solutions'):
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
                
                # 创建等值面
                unique_formations = np.unique(lith_3d)
                colors = plt.cm.Set3(np.linspace(0, 1, len(unique_formations)))
                
                for i, formation_id in enumerate(unique_formations):
                    if formation_id != 0:  # 跳过背景
                        contour = structured_grid.contour([formation_id - 0.5, formation_id + 0.5])
                        if contour.n_points > 0:
                            self.plotter.add_mesh(
                                contour,
                                color=colors[i][:3],
                                opacity=0.7,
                                name=f'formation_{formation_id}',
                                pickable=True
                            )
                            
        except Exception as e:
            print(f"渲染地质层面失败: {e}")
            
    def render_surface_points(self):
        """渲染地层点"""
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
                        point_size=10,
                        render_points_as_spheres=True,
                        cmap='viridis',
                        name='surface_points',
                        pickable=True
                    )
                else:
                    self.plotter.add_mesh(
                        point_cloud,
                        color='red',
                        point_size=10,
                        render_points_as_spheres=True,
                        name='surface_points',
                        pickable=True
                    )
                    
        except Exception as e:
            print(f"渲染地层点失败: {e}")
            
    def render_orientations(self):
        """渲染方向数据"""
        try:
            orientations = self.current_model.orientations.df
            
            if not orientations.empty:
                for idx, row in orientations.iterrows():
                    # 创建方向向量
                    pos = [row['X'], row['Y'], row['Z']]
                    
                    # 计算方向向量（简化版本）
                    azimuth = np.radians(row.get('azimuth', 0))
                    dip = np.radians(row.get('dip', 0))
                    
                    # 方向向量
                    dx = np.cos(azimuth) * np.cos(dip)
                    dy = np.sin(azimuth) * np.cos(dip)
                    dz = np.sin(dip)
                    
                    direction = [dx, dy, dz]
                    
                    # 创建箭头
                    arrow = pv.Arrow(
                        start=pos,
                        direction=direction,
                        scale=50
                    )
                    
                    self.plotter.add_mesh(
                        arrow,
                        color='blue',
                        name=f'orientation_{idx}',
                        pickable=True
                    )
                    
        except Exception as e:
            print(f"渲染方向数据失败: {e}")
            
    def render_faults(self):
        """渲染断层"""
        try:
            # 这里需要根据GemPy的断层数据结构来实现
            # 目前使用占位符实现
            pass
        except Exception as e:
            print(f"渲染断层失败: {e}")
            
    def clear_scene(self):
        """清空场景"""
        # 保留坐标轴，清除其他对象
        actors_to_remove = []
        for name in self.plotter.actors:
            if name not in ['axes']:
                actors_to_remove.append(name)
                
        for name in actors_to_remove:
            self.plotter.remove_actor(name)
            
    # 视图控制方法
    def set_isometric_view(self):
        """设置等轴测视图"""
        self.plotter.camera_position = [(1500, 1500, 1000), (500, 500, -200), (0, 0, 1)]
        self.plotter.reset_camera()
        
    def set_top_view(self):
        """设置俯视图"""
        self.plotter.camera_position = [(500, 500, 1500), (500, 500, -200), (0, 1, 0)]
        self.plotter.reset_camera()
        
    def set_front_view(self):
        """设置前视图"""
        self.plotter.camera_position = [(500, -1000, 300), (500, 500, -200), (0, 0, 1)]
        self.plotter.reset_camera()
        
    def set_side_view(self):
        """设置侧视图"""
        self.plotter.camera_position = [(2000, 500, 300), (500, 500, -200), (0, 0, 1)]
        self.plotter.reset_camera()
        
    def toggle_wireframe(self):
        """切换线框模式"""
        # 实现线框模式切换
        pass
        
    def toggle_surface(self):
        """切换表面模式"""
        # 实现表面模式切换
        pass
        
    def activate_measure_tool(self):
        """激活测量工具"""
        # 实现测量工具
        pass
        
    def activate_section_tool(self):
        """激活剖面工具"""
        if not hasattr(self, 'plotter'):
            QMessageBox.warning(self, "警告", "3D视口未初始化")
            return
            
        from PyQt6.QtWidgets import QDialog, QVBoxLayout, QHBoxLayout, QGroupBox, QFormLayout
        
        # 创建剖面工具对话框
        dialog = QDialog(self)
        dialog.setWindowTitle("地质剖面工具")
        dialog.setModal(True)
        dialog.resize(350, 250)
        
        layout = QVBoxLayout(dialog)
        
        # 剖面方向
        direction_group = QGroupBox("剖面方向")
        direction_layout = QFormLayout(direction_group)
        
        direction_combo = QComboBox()
        direction_combo.addItems(["X轴剖面", "Y轴剖面", "Z轴剖面"])
        direction_layout.addRow("方向:", direction_combo)
        
        # 剖面位置
        position_slider = QSlider(Qt.Orientation.Horizontal)
        position_slider.setRange(0, 100)
        position_slider.setValue(50)
        direction_layout.addRow("位置 (%):", position_slider)
        
        layout.addWidget(direction_group)
        
        # 按钮
        buttons_layout = QHBoxLayout()
        
        create_btn = QPushButton("创建剖面")
        create_btn.clicked.connect(lambda: self.create_simple_section(
            direction_combo.currentText(), position_slider.value(), dialog))
        buttons_layout.addWidget(create_btn)
        
        clear_btn = QPushButton("清除剖面")
        clear_btn.clicked.connect(self.clear_simple_section)
        buttons_layout.addWidget(clear_btn)
        
        close_btn = QPushButton("关闭")
        close_btn.clicked.connect(dialog.close)
        buttons_layout.addWidget(close_btn)
        
        layout.addLayout(buttons_layout)
        
        dialog.show()
        
    def create_simple_section(self, direction, position, dialog):
        """创建简单剖面"""
        try:
            dialog.close()
            
            # 计算剖面参数
            if "X轴" in direction:
                origin = [position * 10, 500, -200]
                normal = [1, 0, 0]
                size = [1000, 400]
            elif "Y轴" in direction:
                origin = [500, position * 10, -200] 
                normal = [0, 1, 0]
                size = [1000, 400]
            else:  # Z轴
                origin = [500, 500, position * 4 - 200]
                normal = [0, 0, 1]
                size = [1000, 1000]
            
            # 清除之前的剖面
            self.clear_simple_section()
            
            # 创建切面
            import pyvista as pv
            plane = pv.Plane(center=origin, direction=normal, size=size)
            
            # 添加到场景
            self.plotter.add_mesh(
                plane,
                color='red',
                opacity=0.3,
                name='section_plane',
                show_edges=True,
                edge_color='darkred',
                line_width=2
            )
            
            print(f"✅ 地质剖面创建成功: {direction}, 位置={position}%")
            
        except Exception as e:
            print(f"❌ 创建剖面失败: {e}")
            QMessageBox.critical(self, "错误", f"创建剖面失败: {e}")
    
    def clear_simple_section(self):
        """清除简单剖面"""
        try:
            if hasattr(self, 'plotter') and 'section_plane' in self.plotter.actors:
                self.plotter.remove_actor('section_plane')
                self.plotter.render()
                print("✅ 地质剖面已清除")
        except Exception as e:
            print(f"❌ 清除剖面失败: {e}")

class GemPyMainWindow(QMainWindow):
    """GemPy CAE 主窗口"""
    
    def __init__(self):
        super().__init__()
        self.current_model = None
        self.project_path = None
        
        self.setup_ui()
        self.setup_connections()
        self.create_sample_model()
        
    def setup_ui(self):
        """设置用户界面"""
        # 设置窗口属性
        self.setWindowTitle("GEM隐式建模系统 - GEM Implicit Modeling System")
        self.setGeometry(100, 100, 1600, 1000)
        
        # 应用样式表
        self.setStyleSheet(AbaqusStyleSheet.get_main_style())
        
        # 创建菜单栏
        self.create_menu_bar()
        
        # 创建工具栏
        self.create_toolbars()
        
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
        
        # 新建项目
        new_action = QAction('新建项目(&N)', self)
        new_action.setShortcut(QKeySequence.StandardKey.New)
        new_action.triggered.connect(self.new_project)
        file_menu.addAction(new_action)
        
        # 打开项目
        open_action = QAction('打开项目(&O)', self)
        open_action.setShortcut(QKeySequence.StandardKey.Open)
        open_action.triggered.connect(self.open_project)
        file_menu.addAction(open_action)
        
        # 保存项目
        save_action = QAction('保存项目(&S)', self)
        save_action.setShortcut(QKeySequence.StandardKey.Save)
        save_action.triggered.connect(self.save_project)
        file_menu.addAction(save_action)
        
        file_menu.addSeparator()
        
        # 导入数据
        import_menu = file_menu.addMenu('导入数据')
        import_menu.addAction('钻孔数据...', self.import_borehole_data)
        import_menu.addAction('地层点...', self.import_surface_points)
        import_menu.addAction('方向数据...', self.import_orientations)
        
        # 导出数据
        export_menu = file_menu.addMenu('导出数据')
        export_menu.addAction('VTK格式...', self.export_vtk)
        export_menu.addAction('网格数据...', self.export_mesh)
        export_menu.addAction('剖面图...', self.export_sections)
        
        file_menu.addSeparator()
        
        # 退出
        exit_action = QAction('退出(&X)', self)
        exit_action.setShortcut(QKeySequence.StandardKey.Quit)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # 编辑菜单
        edit_menu = menubar.addMenu('编辑(&E)')
        edit_menu.addAction('撤销', self.undo)
        edit_menu.addAction('重做', self.redo)
        edit_menu.addSeparator()
        edit_menu.addAction('复制', self.copy)
        edit_menu.addAction('粘贴', self.paste)
        edit_menu.addAction('删除', self.delete)
        
        # 模型菜单
        model_menu = menubar.addMenu('模型(&M)')
        model_menu.addAction('创建地质模型', self.create_geological_model)
        model_menu.addAction('计算模型', self.compute_model)
        model_menu.addSeparator()
        
        # 地层管理
        strata_menu = model_menu.addMenu('地层管理')
        strata_menu.addAction('添加地层', self.add_formation)
        strata_menu.addAction('删除地层', self.remove_formation)
        strata_menu.addAction('编辑地层', self.edit_formation)
        
        # 断层管理
        fault_menu = model_menu.addMenu('断层管理')
        fault_menu.addAction('添加断层', self.add_fault)
        fault_menu.addAction('删除断层', self.remove_fault)
        fault_menu.addAction('编辑断层关系', self.edit_fault_relation)
        
        # 视图菜单
        view_menu = menubar.addMenu('视图(&V)')
        view_menu.addAction('重置视图', self.reset_view)
        view_menu.addAction('适应窗口', self.fit_view)
        view_menu.addSeparator()
        view_menu.addAction('显示/隐藏模型树', self.toggle_model_tree)
        view_menu.addAction('显示/隐藏属性面板', self.toggle_property_panel)
        view_menu.addAction('显示/隐藏消息中心', self.toggle_message_center)
        
        # 工具菜单
        tools_menu = menubar.addMenu('工具(&T)')
        tools_menu.addAction('网格生成器', self.open_mesh_generator)
        tools_menu.addAction('地球物理计算', self.open_geophysics_calculator)
        tools_menu.addAction('不确定性分析', self.open_uncertainty_analysis)
        tools_menu.addAction('批量处理', self.open_batch_processor)
        
        # 帮助菜单
        help_menu = menubar.addMenu('帮助(&H)')
        help_menu.addAction('用户手册', self.show_manual)
        help_menu.addAction('示例项目', self.open_examples)
        help_menu.addSeparator()
        help_menu.addAction('关于', self.show_about)
        
    def create_toolbars(self):
        """创建工具栏"""
        # 主工具栏
        main_toolbar = self.addToolBar('主工具栏')
        main_toolbar.setMovable(False)
        
        if ICONS_AVAILABLE:
            # 文件操作
            main_toolbar.addAction(qta.icon('fa5s.plus'), '新建', self.new_project)
            main_toolbar.addAction(qta.icon('fa5s.folder-open'), '打开', self.open_project)
            main_toolbar.addAction(qta.icon('fa5s.save'), '保存', self.save_project)
            
            main_toolbar.addSeparator()
            
            # 模型操作
            main_toolbar.addAction(qta.icon('fa5s.cube'), '创建模型', self.create_geological_model)
            main_toolbar.addAction(qta.icon('fa5s.calculator'), '计算模型', self.compute_model)
            
            main_toolbar.addSeparator()
            
            # 数据操作
            main_toolbar.addAction(qta.icon('fa5s.plus-circle'), '添加地层点', self.add_surface_point)
            main_toolbar.addAction(qta.icon('fa5s.compass'), '添加方向', self.add_orientation)
            main_toolbar.addAction(qta.icon('fa5s.cut'), '添加断层', self.add_fault)
        else:
            # 没有图标时使用文本
            main_toolbar.addAction('新建', self.new_project)
            main_toolbar.addAction('打开', self.open_project)
            main_toolbar.addAction('保存', self.save_project)
        
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
        
        # 坐标显示
        self.coord_label = QLabel("X: 0, Y: 0, Z: 0")
        self.status_bar.addPermanentWidget(self.coord_label)
        
    def create_central_area(self):
        """创建中央区域"""
        # 主分割器
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        self.setCentralWidget(main_splitter)
        
        # 左侧：模型树
        self.model_tree = ModelTreeWidget()
        main_splitter.addWidget(self.model_tree)
        
        # 中央：3D视口
        self.viewport_3d = GemPyViewport3D()
        main_splitter.addWidget(self.viewport_3d)
        
        # 设置分割比例
        main_splitter.setSizes([300, 1000])
        
    def create_dock_windows(self):
        """创建停靠窗口"""
        # 属性面板
        self.property_panel = PropertyPanel()
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.property_panel)
        
        # 消息中心
        self.message_center = MessageCenter()
        self.addDockWidget(Qt.DockWidgetArea.BottomDockWidgetArea, self.message_center)
        
        # 设置停靠窗口大小
        self.resizeDocks([self.property_panel], [350], Qt.Orientation.Horizontal)
        self.resizeDocks([self.message_center], [200], Qt.Orientation.Vertical)
        
    def setup_connections(self):
        """设置信号连接"""
        # 模型树连接
        self.model_tree.item_activated.connect(self.on_tree_item_activated)
        self.model_tree.context_menu_requested.connect(self.on_tree_context_menu)
        
        # 3D视口连接
        self.viewport_3d.object_selected.connect(self.on_object_selected)
        
    def create_sample_model(self):
        """创建示例模型"""
        try:
            # 创建简单的示例模型用于演示
            geo_model = gp.create_geomodel(
                project_name='Sample_Model',
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
            
            self.message_center.add_message("已创建示例地质模型", "info")
            self.status_label.setText("示例模型已加载")
            
        except Exception as e:
            self.message_center.add_message(f"创建示例模型失败: {e}", "error")
            
    # 事件处理方法
    def on_tree_item_activated(self, item_type: str, item_name: str):
        """处理树项目激活"""
        self.message_center.add_message(f"选择了 {item_type}: {item_name}", "info")
        
        # 更新属性面板
        properties = self.get_object_properties(item_type, item_name)
        self.property_panel.show_object_properties(item_type, item_name, properties)
        
    def on_tree_context_menu(self, item_type: str, item_name: str, position):
        """处理树右键菜单"""
        # 这里可以实现上下文菜单
        pass
        
    def on_object_selected(self, obj_type: str, obj_name: str, properties: Dict):
        """处理3D对象选择"""
        self.property_panel.show_object_properties(obj_type, obj_name, properties)
        
    def get_object_properties(self, obj_type: str, obj_name: str) -> Dict[str, Any]:
        """获取对象属性"""
        # 这里根据对象类型返回相应的属性
        if obj_type == "surface_points":
            return {"x": 500.0, "y": 500.0, "z": -200.0, "surface": "surface1"}
        elif obj_type == "orientations":
            return {"x": 500.0, "y": 500.0, "z": -200.0, "azimuth": 90.0, "dip": 0.0}
        elif obj_type == "regular_grid":
            return {"extent": [0, 1000, 0, 1000, -1000, 0], "resolution": [50, 50, 50]}
        else:
            return {}
            
    # 菜单动作实现
    def new_project(self):
        """新建项目"""
        self.message_center.add_message("新建项目功能待实现", "info")
        
    def open_project(self):
        """打开项目"""
        filename, _ = QFileDialog.getOpenFileName(
            self, "打开GemPy项目", "", "GemPy项目 (*.gempy);;所有文件 (*)")
        if filename:
            self.message_center.add_message(f"打开项目: {filename}", "info")
            
    def save_project(self):
        """保存项目"""
        if self.project_path:
            self.message_center.add_message(f"保存项目: {self.project_path}", "info")
        else:
            filename, _ = QFileDialog.getSaveFileName(
                self, "保存GemPy项目", "", "GemPy项目 (*.gempy)")
            if filename:
                self.project_path = filename
                self.message_center.add_message(f"保存项目: {filename}", "info")
                
    def import_borehole_data(self):
        """导入钻孔数据"""
        filename, _ = QFileDialog.getOpenFileName(
            self, "导入钻孔数据", "", "CSV文件 (*.csv);;Excel文件 (*.xlsx)")
        if filename:
            self.message_center.add_message(f"导入钻孔数据: {filename}", "info")
            
    def import_surface_points(self):
        """导入地层点"""
        filename, _ = QFileDialog.getOpenFileName(
            self, "导入地层点", "", "CSV文件 (*.csv);;Excel文件 (*.xlsx)")
        if filename:
            self.message_center.add_message(f"导入地层点: {filename}", "info")
            
    def import_orientations(self):
        """导入方向数据"""
        filename, _ = QFileDialog.getOpenFileName(
            self, "导入方向数据", "", "CSV文件 (*.csv);;Excel文件 (*.xlsx)")
        if filename:
            self.message_center.add_message(f"导入方向数据: {filename}", "info")
            
    def create_geological_model(self):
        """创建地质模型"""
        if self.current_model:
            self.message_center.add_message("开始创建地质模型...", "info")
            # 这里可以打开模型创建对话框
        else:
            self.message_center.add_message("请先创建或加载一个项目", "warning")
            
    def compute_model(self):
        """计算模型"""
        if self.current_model:
            self.progress_bar.setVisible(True)
            self.progress_bar.setRange(0, 0)  # 不确定进度
            self.status_label.setText("正在计算地质模型...")
            
            try:
                gp.compute_model(self.current_model)
                self.viewport_3d.render_geological_model()
                self.message_center.add_message("地质模型计算完成", "info")
                self.status_label.setText("计算完成")
            except Exception as e:
                self.message_center.add_message(f"模型计算失败: {e}", "error")
                self.status_label.setText("计算失败")
            finally:
                self.progress_bar.setVisible(False)
        else:
            self.message_center.add_message("没有可计算的模型", "warning")
            
    def add_surface_point(self):
        """添加地层点"""
        self.message_center.add_message("添加地层点功能待实现", "info")
        
    def add_orientation(self):
        """添加方向数据"""
        self.message_center.add_message("添加方向数据功能待实现", "info")
        
    def add_fault(self):
        """添加断层"""
        self.message_center.add_message("添加断层功能待实现", "info")
        
    # 其他功能方法（占位符）
    def undo(self): pass
    def redo(self): pass
    def copy(self): pass
    def paste(self): pass
    def delete(self): pass
    def add_formation(self): pass
    def remove_formation(self): pass
    def edit_formation(self): pass
    def remove_fault(self): pass
    def edit_fault_relation(self): pass
    def reset_view(self): pass
    def fit_view(self): pass
    def toggle_model_tree(self): pass
    def toggle_property_panel(self): pass
    def toggle_message_center(self): pass
    def open_mesh_generator(self): pass
    def open_geophysics_calculator(self): pass
    def open_uncertainty_analysis(self): pass
    def open_batch_processor(self): pass
    def show_manual(self): pass
    def open_examples(self): pass
    def export_vtk(self):
        """导出当前场景：优先 VTKJS，失败降级 HTML，再失败 PNG 截图。"""
        try:
            filename, _ = QFileDialog.getSaveFileName(
                self, "导出场景", "", "VTKJS 文件 (*.vtkjs);;HTML 文件 (*.html);;PNG 截图 (*.png)"
            )
            if not filename:
                return

            # 首选 VTKJS
            try:
                out = filename if filename.lower().endswith('.vtkjs') else f"{filename}.vtkjs"
                self.viewport_3d.plotter.export_vtkjs(out)
                self.message_center.add_message(f"已导出 VTKJS: {out}", "info")
                self.status_label.setText(f"导出成功: {out}")
                return
            except Exception:
                pass

            # 降级 HTML
            try:
                html_out = filename if filename.lower().endswith('.html') else f"{filename}.html"
                self.viewport_3d.plotter.export_html(html_out)
                self.message_center.add_message(f"已降级导出 HTML: {html_out}", "warning")
                self.status_label.setText(f"导出成功(HTML): {html_out}")
                return
            except Exception:
                pass

            # 最低保真：PNG 截图
            png_out = filename if filename.lower().endswith('.png') else f"{filename}.png"
            self.viewport_3d.plotter.screenshot(png_out)
            self.message_center.add_message(f"已降级导出 PNG 截图: {png_out}", "warning")
            self.status_label.setText(f"导出成功(PNG): {png_out}")

        except Exception as e:
            self.message_center.add_message(f"导出失败: {e}", "error")
            self.status_label.setText("导出失败")
    def export_mesh(self): pass
    def export_sections(self): pass
    
    def show_about(self):
        """显示关于对话框"""
        QMessageBox.about(self, "关于", 
                         "GemPy Professional CAE System\n"
                         "基于GemPy的专业地质建模系统\n"
                         "Abaqus风格界面设计\n\n"
                         "版本: 1.0.0\n"
                         "作者: DeepCAD团队")

def main():
    """主函数"""
    app = QApplication(sys.argv)
    app.setApplicationName("GemPy Professional CAE")
    app.setApplicationVersion("1.0.0")
    app.setOrganizationName("DeepCAD")
    
    # 创建主窗口
    window = GemPyMainWindow()
    window.show()
    
    return app.exec()

if __name__ == "__main__":
    sys.exit(main())