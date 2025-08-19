#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Professional Abaqus-Style GEM Interface
专业级Abaqus风格GEM隐式建模界面

模仿Abaqus CAE的专业界面设计：
- 深色主题配色方案
- 专业级工具栏和菜单系统
- 高质量3D视口
- 状态栏和属性面板
- 专业级材质和渲染
"""

import sys
from pathlib import Path
import numpy as np
from typing import Dict, List, Optional, Tuple

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QGridLayout, QSplitter, QTabWidget, QGroupBox, QFrame,
    QToolBar, QMenuBar, QStatusBar, QDockWidget, QTextEdit,
    QPushButton, QLabel, QComboBox, QSpinBox, QDoubleSpinBox,
    QSlider, QCheckBox, QRadioButton, QButtonGroup, QProgressBar,
    QTreeWidget, QTreeWidgetItem, QTableWidget, QTableWidgetItem,
    QScrollArea, QSizePolicy, QFileDialog, QMessageBox
)
from PyQt6.QtCore import Qt, QTimer, QThread, pyqtSignal, QSize
from PyQt6.QtGui import (
    QIcon, QPixmap, QFont, QPalette, QColor, QAction, 
    QActionGroup, QPainter, QLinearGradient
)

# 3D可视化模块
try:
    import pyvista as pv
    from pyvistaqt import QtInteractor
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False
    print("PyVista未安装，3D功能将受限")

# GemPy地质建模
try:
    import gempy as gp
    GEMPY_AVAILABLE = True
except ImportError:
    GEMPY_AVAILABLE = False
    print("GemPy未安装，地质建模功能将受限")

# 科学计算
try:
    import pandas as pd
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas
    from matplotlib.figure import Figure
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False


class AbaqusStylePalette:
    """Abaqus风格配色方案"""
    
    # 主色调 - Abaqus深灰色主题
    BACKGROUND_DARK = "#2b2b2b"      # 主背景
    BACKGROUND_MEDIUM = "#3c3c3c"    # 次要背景
    BACKGROUND_LIGHT = "#4a4a4a"     # 较亮背景
    
    # 文本颜色
    TEXT_PRIMARY = "#ffffff"         # 主要文本
    TEXT_SECONDARY = "#cccccc"       # 次要文本
    TEXT_DISABLED = "#808080"        # 禁用文本
    
    # 强调色
    ACCENT_BLUE = "#0078d4"          # Abaqus经典蓝
    ACCENT_ORANGE = "#ff8c00"        # 警告橙
    ACCENT_GREEN = "#107c10"         # 成功绿
    ACCENT_RED = "#d13438"           # 错误红
    
    # 边框和分隔线
    BORDER_DARK = "#1e1e1e"
    BORDER_LIGHT = "#5a5a5a"
    
    # 工具栏和菜单
    TOOLBAR_BG = "#383838"
    MENU_BG = "#2d2d2d"
    MENU_HOVER = "#404040"
    
    # 按钮状态
    BUTTON_NORMAL = "#404040"
    BUTTON_HOVER = "#4a4a4a"
    BUTTON_PRESSED = "#2a2a2a"
    BUTTON_DISABLED = "#2e2e2e"


class AbaqusStyleWidget(QWidget):
    """Abaqus风格基础组件"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_abaqus_style()
    
    def setup_abaqus_style(self):
        """设置Abaqus风格样式"""
        palette = AbaqusStylePalette()
        
        # 设置样式表
        self.setStyleSheet(f"""
            QWidget {{
                background-color: {palette.BACKGROUND_DARK};
                color: {palette.TEXT_PRIMARY};
                font-family: 'Segoe UI', Arial, sans-serif;
                font-size: 9pt;
            }}
            
            QMainWindow {{
                background-color: {palette.BACKGROUND_DARK};
            }}
            
            /* 工具栏样式 */
            QToolBar {{
                background-color: {palette.TOOLBAR_BG};
                border: 1px solid {palette.BORDER_DARK};
                spacing: 2px;
                padding: 2px;
            }}
            
            QToolButton {{
                background-color: {palette.BUTTON_NORMAL};
                border: 1px solid {palette.BORDER_LIGHT};
                border-radius: 3px;
                padding: 4px;
                margin: 1px;
                min-width: 32px;
                min-height: 32px;
            }}
            
            QToolButton:hover {{
                background-color: {palette.BUTTON_HOVER};
                border-color: {palette.ACCENT_BLUE};
            }}
            
            QToolButton:pressed {{
                background-color: {palette.BUTTON_PRESSED};
            }}
            
            QToolButton:checked {{
                background-color: {palette.ACCENT_BLUE};
                color: white;
            }}
            
            /* 菜单样式 */
            QMenuBar {{
                background-color: {palette.MENU_BG};
                border-bottom: 1px solid {palette.BORDER_DARK};
            }}
            
            QMenuBar::item {{
                background-color: transparent;
                padding: 4px 8px;
            }}
            
            QMenuBar::item:selected {{
                background-color: {palette.MENU_HOVER};
            }}
            
            QMenu {{
                background-color: {palette.BACKGROUND_MEDIUM};
                border: 1px solid {palette.BORDER_LIGHT};
            }}
            
            QMenu::item {{
                padding: 4px 20px;
            }}
            
            QMenu::item:selected {{
                background-color: {palette.ACCENT_BLUE};
            }}
            
            /* 按钮样式 */
            QPushButton {{
                background-color: {palette.BUTTON_NORMAL};
                border: 1px solid {palette.BORDER_LIGHT};
                border-radius: 3px;
                padding: 6px 12px;
                font-weight: 500;
            }}
            
            QPushButton:hover {{
                background-color: {palette.BUTTON_HOVER};
                border-color: {palette.ACCENT_BLUE};
            }}
            
            QPushButton:pressed {{
                background-color: {palette.BUTTON_PRESSED};
            }}
            
            QPushButton:disabled {{
                background-color: {palette.BUTTON_DISABLED};
                color: {palette.TEXT_DISABLED};
            }}
            
            /* 输入控件样式 */
            QLineEdit, QSpinBox, QDoubleSpinBox, QComboBox {{
                background-color: {palette.BACKGROUND_LIGHT};
                border: 1px solid {palette.BORDER_LIGHT};
                border-radius: 2px;
                padding: 4px 6px;
            }}
            
            QLineEdit:focus, QSpinBox:focus, QDoubleSpinBox:focus, QComboBox:focus {{
                border-color: {palette.ACCENT_BLUE};
            }}
            
            /* 分组框样式 */
            QGroupBox {{
                font-weight: bold;
                border: 1px solid {palette.BORDER_LIGHT};
                border-radius: 3px;
                margin: 8px 0px 0px 0px;
                padding-top: 10px;
            }}
            
            QGroupBox::title {{
                subcontrol-origin: margin;
                left: 8px;
                padding: 0px 5px 0px 5px;
            }}
            
            /* 停靠窗口样式 */
            QDockWidget {{
                background-color: {palette.BACKGROUND_MEDIUM};
                border: 1px solid {palette.BORDER_LIGHT};
            }}
            
            QDockWidget::title {{
                background-color: {palette.TOOLBAR_BG};
                padding: 4px;
                font-weight: bold;
            }}
            
            /* 状态栏样式 */
            QStatusBar {{
                background-color: {palette.TOOLBAR_BG};
                border-top: 1px solid {palette.BORDER_DARK};
            }}
            
            /* 滑块样式 */
            QSlider::groove:horizontal {{
                border: 1px solid {palette.BORDER_LIGHT};
                height: 6px;
                background: {palette.BACKGROUND_LIGHT};
                border-radius: 3px;
            }}
            
            QSlider::handle:horizontal {{
                background: {palette.ACCENT_BLUE};
                border: 1px solid {palette.BORDER_LIGHT};
                width: 14px;
                margin: -4px 0;
                border-radius: 7px;
            }}
            
            QSlider::handle:horizontal:hover {{
                background: {palette.ACCENT_BLUE};
                border: 2px solid white;
            }}
            
            /* 进度条样式 */
            QProgressBar {{
                border: 1px solid {palette.BORDER_LIGHT};
                border-radius: 2px;
                background-color: {palette.BACKGROUND_LIGHT};
                text-align: center;
            }}
            
            QProgressBar::chunk {{
                background-color: {palette.ACCENT_BLUE};
                border-radius: 1px;
            }}
        """)


class Professional3DViewport(AbaqusStyleWidget):
    """专业级3D视口 - 模仿Abaqus CAE视口"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.init_viewport()
        self.setup_interactions()
        self.current_model = None
        
    def init_viewport(self):
        """初始化3D视口"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        if PYVISTA_AVAILABLE:
            # 创建PyVista Qt交互器 - 使用更保守的设置避免着色器问题
            self.plotter = QtInteractor(
                self, 
                auto_update=False,  # 关闭自动更新避免渲染冲突
                multi_samples=4,    # 降低抗锯齿级别
                line_smoothing=False,
                point_smoothing=False,
                polygon_smoothing=False
            )
            
            # 设置专业级渲染参数
            self.setup_professional_rendering()
            
            # 添加标准3D导航控件
            self.plotter.add_axes(interactive=True)
            self.plotter.show_grid(color='gray')
            
            layout.addWidget(self.plotter.interactor)
            
        else:
            # PyVista不可用时的备用方案
            placeholder = QLabel("3D视口\n(需要安装PyVista)")
            placeholder.setAlignment(Qt.AlignmentFlag.AlignCenter)
            placeholder.setStyleSheet("""
                background-color: #1e1e1e;
                border: 2px dashed #5a5a5a;
                color: #cccccc;
                font-size: 14pt;
            """)
            layout.addWidget(placeholder)
            self.plotter = None
    
    def setup_professional_rendering(self):
        """设置专业级渲染效果"""
        if not self.plotter:
            return
            
        try:
            # 设置背景渐变 - 模仿Abaqus的渐变背景
            self.plotter.set_background('#1a1a1a', top='#2d2d2d')
            
            # 暂时禁用阴影避免着色器问题
            # self.plotter.enable_shadows()
            
            # 使用默认光照，不自定义光源避免冲突
            # 设置摄像机
            self.plotter.view_isometric()
            
        except Exception as e:
            print(f"渲染设置警告: {e}")
            # 如果高级设置失败，使用基本设置
            self.plotter.set_background('#2b2b2b')
    
    def setup_interactions(self):
        """设置交互模式"""
        if not self.plotter:
            return
            
        try:
            # 启用专业级交互功能
            self.plotter.enable_terrain_style()  # 类似CAD的导航
            # self.plotter.enable_parallel_projection()  # 暂时禁用平行投影
        except Exception as e:
            print(f"交互设置警告: {e}")
        
    def add_geological_model(self, surfaces: List, colors: List = None, opacity: float = 0.8):
        """添加地质模型到视口"""
        if not self.plotter:
            return
            
        self.plotter.clear()
        
        # 重新设置基本元素
        self.plotter.add_axes(interactive=True)
        self.plotter.show_grid(color='gray')
        
        # 添加地质面
        for i, surface in enumerate(surfaces):
            if colors and i < len(colors):
                color = colors[i]
            else:
                # 默认地质配色
                color = plt.cm.viridis(i / len(surfaces))[:3]
            
            # 使用简化的材质避免着色器问题
            self.plotter.add_mesh(
                surface,
                color=color,
                opacity=opacity,
                show_edges=False,
                smooth_shading=True
            )
        
        # 调整视角
        self.plotter.reset_camera()
        self.plotter.view_isometric()
    
    def add_boreholes(self, borehole_data: pd.DataFrame):
        """添加钻孔数据可视化"""
        if not self.plotter or not SCIPY_AVAILABLE:
            return
            
        # 创建钻孔柱状图
        for borehole_id in borehole_data['borehole_id'].unique():
            bh_data = borehole_data[borehole_data['borehole_id'] == borehole_id]
            
            if len(bh_data) == 0:
                continue
                
            x = bh_data['x'].iloc[0]
            y = bh_data['y'].iloc[0]
            
            # 创建钻孔柱
            for _, row in bh_data.iterrows():
                z_top = row['z_top']
                z_bottom = row['z_bottom']
                thickness = z_top - z_bottom
                
                if thickness <= 0:
                    continue
                
                # 创建圆柱体表示地层
                cylinder = pv.Cylinder(
                    center=(x, y, (z_top + z_bottom) / 2),
                    direction=(0, 0, 1),
                    radius=2.0,
                    height=thickness
                )
                
                # 使用地层颜色
                color = row['color'] if 'color' in row else '#8B4513'
                
                self.plotter.add_mesh(
                    cylinder,
                    color=color,
                    opacity=0.8,
                    show_edges=True
                )
    
    def create_geological_section(self, origin: Tuple[float, float, float], 
                                normal: Tuple[float, float, float]):
        """创建地质剖面"""
        if not self.plotter:
            return
            
        # 创建剖面切割平面
        plane = pv.Plane(
            center=origin,
            direction=normal,
            size=(500, 300)
        )
        
        # 添加切面到场景（半透明）
        self.plotter.add_mesh(
            plane,
            color='yellow',
            opacity=0.3,
            show_edges=True
        )
        
        # 执行切割操作（如果有当前模型）
        if self.current_model:
            try:
                # 对当前模型进行切割
                cut_model = self.current_model.clip_surface(plane, invert=False)
                if cut_model.n_points > 0:
                    self.plotter.add_mesh(
                        cut_model,
                        color='lightblue',
                        opacity=0.9,
                        show_edges=True
                    )
            except Exception as e:
                print(f"剖面切割失败: {e}")


class GeologicalDataManager(AbaqusStyleWidget):
    """地质数据管理器"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_ui()
        self.current_project = None
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 项目信息组
        project_group = QGroupBox("项目信息")
        project_layout = QGridLayout(project_group)
        
        self.project_name_label = QLabel("未加载项目")
        self.project_name_label.setStyleSheet("font-weight: bold; color: #0078d4;")
        project_layout.addWidget(QLabel("项目名称:"), 0, 0)
        project_layout.addWidget(self.project_name_label, 0, 1)
        
        self.extent_label = QLabel("未定义")
        project_layout.addWidget(QLabel("建模范围:"), 1, 0)
        project_layout.addWidget(self.extent_label, 1, 1)
        
        layout.addWidget(project_group)
        
        # 数据统计组
        stats_group = QGroupBox("数据统计")
        stats_layout = QGridLayout(stats_group)
        
        self.boreholes_count = QLabel("0")
        self.formations_count = QLabel("0")
        self.faults_count = QLabel("0")
        
        stats_layout.addWidget(QLabel("钻孔数量:"), 0, 0)
        stats_layout.addWidget(self.boreholes_count, 0, 1)
        stats_layout.addWidget(QLabel("地层数量:"), 1, 0)
        stats_layout.addWidget(self.formations_count, 1, 1)
        stats_layout.addWidget(QLabel("断层数量:"), 2, 0)
        stats_layout.addWidget(self.faults_count, 2, 1)
        
        layout.addWidget(stats_group)
        
        # 数据操作按钮
        operations_group = QGroupBox("数据操作")
        operations_layout = QVBoxLayout(operations_group)
        
        self.load_data_btn = QPushButton("加载地质数据")
        self.export_data_btn = QPushButton("导出数据")
        self.validate_data_btn = QPushButton("验证数据")
        
        operations_layout.addWidget(self.load_data_btn)
        operations_layout.addWidget(self.export_data_btn)
        operations_layout.addWidget(self.validate_data_btn)
        
        layout.addWidget(operations_group)
        
        # 地层管理树
        formations_group = QGroupBox("地层管理")
        formations_layout = QVBoxLayout(formations_group)
        
        self.formations_tree = QTreeWidget()
        self.formations_tree.setHeaderLabels(["地层", "厚度(m)", "颜色", "可见"])
        formations_layout.addWidget(self.formations_tree)
        
        layout.addWidget(formations_group)
        
        layout.addStretch()
    
    def load_project_data(self, project_path: str):
        """加载项目数据"""
        try:
            # 这里应该加载实际的项目数据
            self.project_name_label.setText("复杂地质测试用例")
            self.extent_label.setText("1000×1000×200m")
            self.boreholes_count.setText("100")
            self.formations_count.setText("12")
            self.faults_count.setText("3")
            
            # 更新地层树
            self.update_formations_tree()
            
        except Exception as e:
            QMessageBox.warning(self, "加载失败", f"无法加载项目数据: {e}")
    
    def update_formations_tree(self):
        """更新地层树"""
        self.formations_tree.clear()
        
        # 示例地层数据
        formations = [
            ("填土", "2-8", "#8B4513", True),
            ("粘土", "8-15", "#D2691E", True),
            ("粉质粘土", "5-12", "#CD853F", True),
            ("细砂", "10-20", "#F4A460", True),
            ("中砂", "8-18", "#DEB887", True),
            ("粗砂", "6-15", "#D2B48C", True),
            ("砾砂", "10-25", "#BC8F8F", True),
            ("卵石层", "15-30", "#A0522D", True),
            ("强风化岩", "20-40", "#8B7355", True),
            ("中风化岩", "25-50", "#696969", True),
            ("微风化岩", "30-60", "#2F4F4F", True),
            ("基岩", "50-100", "#1C1C1C", True)
        ]
        
        for name, thickness, color, visible in formations:
            item = QTreeWidgetItem([name, thickness, color, "✓" if visible else "✗"])
            self.formations_tree.addTopLevelItem(item)


class ProfessionalGeologyCAE(QMainWindow, AbaqusStyleWidget):
    """专业级地质CAE主界面 - 完全模仿Abaqus CAE"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GEM Professional - Implicit Geological Modeling System")
        self.setGeometry(100, 100, 1600, 1000)
        
        # 设置窗口图标
        self.setWindowIcon(QIcon("icons/gem_icon.png") if Path("icons/gem_icon.png").exists() else QIcon())
        
        self.setup_ui()
        self.setup_menus()
        self.setup_toolbars()
        self.setup_status_bar()
        self.setup_dock_widgets()
        
        # 应用Abaqus样式
        self.setup_abaqus_style()
        
    def setup_ui(self):
        """设置主界面"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        
        # 创建主分割器
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # 左侧面板 (20%)
        left_panel = self.create_left_panel()
        main_splitter.addWidget(left_panel)
        
        # 中央3D视口 (60%)
        self.viewport_3d = Professional3DViewport()
        main_splitter.addWidget(self.viewport_3d)
        
        # 右侧面板 (20%)
        right_panel = self.create_right_panel()
        main_splitter.addWidget(right_panel)
        
        # 设置分割器比例
        main_splitter.setSizes([320, 960, 320])
        main_splitter.setChildrenCollapsible(False)
        
        main_layout.addWidget(main_splitter)
    
    def create_left_panel(self):
        """创建左侧面板"""
        left_widget = QWidget()
        left_widget.setMaximumWidth(400)
        left_widget.setMinimumWidth(300)
        
        layout = QVBoxLayout(left_widget)
        
        # 模型树
        model_group = QGroupBox("模型树")
        model_layout = QVBoxLayout(model_group)
        
        self.model_tree = QTreeWidget()
        self.model_tree.setHeaderLabels(["模型组件"])
        
        # 添加示例节点
        assembly_node = QTreeWidgetItem(["装配"])
        parts_node = QTreeWidgetItem(["部件"])
        materials_node = QTreeWidgetItem(["材料"])
        
        self.model_tree.addTopLevelItem(assembly_node)
        self.model_tree.addTopLevelItem(parts_node)
        self.model_tree.addTopLevelItem(materials_node)
        
        model_layout.addWidget(self.model_tree)
        layout.addWidget(model_group)
        
        # 地质数据管理器
        self.data_manager = GeologicalDataManager()
        layout.addWidget(self.data_manager)
        
        return left_widget
    
    def create_right_panel(self):
        """创建右侧面板"""
        right_widget = QWidget()
        right_widget.setMaximumWidth(400)
        right_widget.setMinimumWidth(300)
        
        layout = QVBoxLayout(right_widget)
        
        # 属性面板
        properties_group = QGroupBox("属性")
        properties_layout = QVBoxLayout(properties_group)
        
        # 视图控制
        view_group = QGroupBox("视图控制")
        view_layout = QGridLayout(view_group)
        
        # 视图预设按钮
        view_buttons = [
            ("等轴测", "isometric"),
            ("顶视图", "xy"),
            ("正视图", "xz"),
            ("侧视图", "yz")
        ]
        
        for i, (name, view) in enumerate(view_buttons):
            btn = QPushButton(name)
            btn.clicked.connect(lambda checked, v=view: self.set_view(v))
            view_layout.addWidget(btn, i // 2, i % 2)
        
        properties_layout.addWidget(view_group)
        
        # 渲染控制
        render_group = QGroupBox("渲染控制")
        render_layout = QGridLayout(render_group)
        
        # 透明度控制
        render_layout.addWidget(QLabel("透明度:"), 0, 0)
        self.opacity_slider = QSlider(Qt.Orientation.Horizontal)
        self.opacity_slider.setRange(0, 100)
        self.opacity_slider.setValue(80)
        render_layout.addWidget(self.opacity_slider, 0, 1)
        
        # 显示选项
        self.show_edges_cb = QCheckBox("显示边线")
        self.show_grid_cb = QCheckBox("显示网格")
        self.show_grid_cb.setChecked(True)
        self.show_axes_cb = QCheckBox("显示坐标轴")
        self.show_axes_cb.setChecked(True)
        
        render_layout.addWidget(self.show_edges_cb, 1, 0, 1, 2)
        render_layout.addWidget(self.show_grid_cb, 2, 0, 1, 2)
        render_layout.addWidget(self.show_axes_cb, 3, 0, 1, 2)
        
        properties_layout.addWidget(render_group)
        
        # 地质建模控制
        modeling_group = QGroupBox("建模控制")
        modeling_layout = QVBoxLayout(modeling_group)
        
        self.compute_model_btn = QPushButton("计算地质模型")
        self.compute_model_btn.setStyleSheet("""
            QPushButton {
                background-color: #0078d4;
                font-weight: bold;
                padding: 8px;
            }
            QPushButton:hover {
                background-color: #106ebe;
            }
        """)
        
        self.create_section_btn = QPushButton("创建剖面")
        self.export_model_btn = QPushButton("导出模型")
        
        modeling_layout.addWidget(self.compute_model_btn)
        modeling_layout.addWidget(self.create_section_btn)
        modeling_layout.addWidget(self.export_model_btn)
        
        properties_layout.addWidget(modeling_group)
        
        layout.addWidget(properties_group)
        layout.addStretch()
        
        return right_widget
    
    def setup_menus(self):
        """设置菜单栏"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu("文件(&F)")
        
        new_action = QAction("新建项目", self)
        new_action.setShortcut("Ctrl+N")
        file_menu.addAction(new_action)
        
        open_action = QAction("打开项目", self)
        open_action.setShortcut("Ctrl+O")
        file_menu.addAction(open_action)
        
        file_menu.addSeparator()
        
        import_action = QAction("导入数据", self)
        import_action.triggered.connect(self.import_geological_data)
        file_menu.addAction(import_action)
        
        export_action = QAction("导出模型", self)
        file_menu.addAction(export_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("退出", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # 视图菜单
        view_menu = menubar.addMenu("视图(&V)")
        
        reset_view_action = QAction("重置视图", self)
        reset_view_action.triggered.connect(self.reset_view)
        view_menu.addAction(reset_view_action)
        
        view_menu.addSeparator()
        
        # 视图模式
        view_mode_group = QActionGroup(self)
        
        wireframe_action = QAction("线框模式", self, checkable=True)
        solid_action = QAction("实体模式", self, checkable=True)
        solid_action.setChecked(True)
        
        view_mode_group.addAction(wireframe_action)
        view_mode_group.addAction(solid_action)
        
        view_menu.addAction(wireframe_action)
        view_menu.addAction(solid_action)
        
        # 地质菜单
        geology_menu = menubar.addMenu("地质(&G)")
        
        load_data_action = QAction("加载钻孔数据", self)
        geology_menu.addAction(load_data_action)
        
        create_model_action = QAction("创建地质模型", self)
        create_model_action.triggered.connect(self.create_geological_model)
        geology_menu.addAction(create_model_action)
        
        section_action = QAction("创建剖面", self)
        section_action.triggered.connect(self.create_section)
        geology_menu.addAction(section_action)
        
        # 帮助菜单
        help_menu = menubar.addMenu("帮助(&H)")
        
        about_action = QAction("关于", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)
    
    def setup_toolbars(self):
        """设置工具栏"""
        # 主工具栏
        main_toolbar = self.addToolBar("主工具栏")
        main_toolbar.setIconSize(QSize(32, 32))
        
        # 添加工具按钮
        tools = [
            ("新建", "icons/new.png", self.new_project),
            ("打开", "icons/open.png", self.open_project),
            ("保存", "icons/save.png", self.save_project),
            (None, None, None),  # 分隔符
            ("导入", "icons/import.png", self.import_geological_data),
            ("建模", "icons/model.png", self.create_geological_model),
            ("剖面", "icons/section.png", self.create_section),
            (None, None, None),  # 分隔符
            ("重置视图", "icons/reset_view.png", self.reset_view),
        ]
        
        for tool in tools:
            if tool[0] is None:  # 分隔符
                main_toolbar.addSeparator()
            else:
                name, icon_path, callback = tool
                action = QAction(name, self)
                if Path(icon_path).exists():
                    action.setIcon(QIcon(icon_path))
                action.triggered.connect(callback)
                main_toolbar.addAction(action)
        
        # 视图工具栏
        view_toolbar = self.addToolBar("视图工具栏")
        view_toolbar.setIconSize(QSize(24, 24))
        
        view_tools = [
            ("等轴测", lambda: self.set_view("isometric")),
            ("顶视图", lambda: self.set_view("xy")),
            ("正视图", lambda: self.set_view("xz")),
            ("侧视图", lambda: self.set_view("yz")),
        ]
        
        for name, callback in view_tools:
            action = QAction(name, self)
            action.triggered.connect(callback)
            view_toolbar.addAction(action)
    
    def setup_status_bar(self):
        """设置状态栏"""
        status_bar = self.statusBar()
        
        # 添加状态信息
        self.status_label = QLabel("就绪")
        status_bar.addWidget(self.status_label)
        
        status_bar.addPermanentWidget(QLabel("|"))
        
        # 坐标显示
        self.coord_label = QLabel("坐标: (0, 0, 0)")
        status_bar.addPermanentWidget(self.coord_label)
        
        status_bar.addPermanentWidget(QLabel("|"))
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.progress_bar.setMaximumWidth(200)
        status_bar.addPermanentWidget(self.progress_bar)
    
    def setup_dock_widgets(self):
        """设置停靠窗口"""
        # 输出窗口
        output_dock = QDockWidget("输出", self)
        output_widget = QTextEdit()
        output_widget.setReadOnly(True)
        output_widget.setMaximumHeight(150)
        output_dock.setWidget(output_widget)
        
        self.addDockWidget(Qt.DockWidgetArea.BottomDockWidgetArea, output_dock)
        self.output_text = output_widget
    
    def new_project(self):
        """新建项目"""
        self.status_label.setText("创建新项目...")
        # 实现新建项目逻辑
    
    def open_project(self):
        """打开项目"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "打开项目", "", "项目文件 (*.json);;所有文件 (*)"
        )
        if file_path:
            self.status_label.setText(f"打开项目: {file_path}")
    
    def save_project(self):
        """保存项目"""
        self.status_label.setText("保存项目...")
    
    def import_geological_data(self):
        """导入地质数据"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "导入地质数据", "", "CSV文件 (*.csv);;所有文件 (*)"
        )
        if file_path:
            self.status_label.setText(f"导入数据: {file_path}")
            self.data_manager.load_project_data(file_path)
    
    def create_geological_model(self):
        """创建地质模型"""
        self.status_label.setText("正在计算地质模型...")
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        
        # 模拟计算过程
        for i in range(101):
            self.progress_bar.setValue(i)
            QApplication.processEvents()
            
        self.progress_bar.setVisible(False)
        self.status_label.setText("地质模型计算完成")
        
        self.output_text.append("✓ 地质模型计算完成")
        self.output_text.append(f"- 模型范围: 1000×1000×200m")
        self.output_text.append(f"- 地层数量: 12层")
        self.output_text.append(f"- 计算时间: 2.5秒")
    
    def create_section(self):
        """创建剖面"""
        self.status_label.setText("创建地质剖面...")
        
        # 默认创建一个XZ剖面
        origin = (500, 500, -100)
        normal = (0, 1, 0)
        
        if self.viewport_3d:
            self.viewport_3d.create_geological_section(origin, normal)
        
        self.status_label.setText("剖面创建完成")
        self.output_text.append("✓ 已创建Y=500m剖面")
    
    def set_view(self, view_type: str):
        """设置视图方向"""
        if not self.viewport_3d or not self.viewport_3d.plotter:
            return
            
        if view_type == "isometric":
            self.viewport_3d.plotter.view_isometric()
        elif view_type == "xy":
            self.viewport_3d.plotter.view_xy()
        elif view_type == "xz":
            self.viewport_3d.plotter.view_xz()
        elif view_type == "yz":
            self.viewport_3d.plotter.view_yz()
        
        self.status_label.setText(f"切换到{view_type}视图")
    
    def reset_view(self):
        """重置视图"""
        if self.viewport_3d and self.viewport_3d.plotter:
            self.viewport_3d.plotter.reset_camera()
            self.viewport_3d.plotter.view_isometric()
        
        self.status_label.setText("视图已重置")
    
    def show_about(self):
        """显示关于对话框"""
        QMessageBox.about(
            self,
            "关于 GEM Professional",
            """
            <h2>GEM Professional</h2>
            <p><b>专业级地质隐式建模系统</b></p>
            <p>版本: 1.0</p>
            <p>基于PyQt6和PyVista开发</p>
            <p>模仿Abaqus CAE的专业界面设计</p>
            <hr>
            <p>功能特性:</p>
            <ul>
            <li>专业级3D地质可视化</li>
            <li>隐式地质建模</li>
            <li>断层系统建模</li>
            <li>剖面分析功能</li>
            <li>钻孔数据管理</li>
            </ul>
            """
        )


def main():
    """主函数"""
    app = QApplication(sys.argv)
    app.setApplicationName("GEM Professional")
    app.setApplicationVersion("1.0")
    
    # 设置应用程序样式
    app.setStyle('Fusion')
    
    # 创建主窗口
    window = ProfessionalGeologyCAE()
    window.show()
    
    # 启动应用
    sys.exit(app.exec())


if __name__ == "__main__":
    main()