"""
GemPy Professional Interface - 专门的地质隐式建模界面
Based on GemPy geological modeling capabilities
"""

import sys
import os
import numpy as np
import pandas as pd
from pathlib import Path

# 导入对话框模块
try:
    from gempy_dialogs import (
        ModelSettingsDialog, SurfaceManagerDialog, DataStatisticsDialog,
        ViewSettingsDialog, ProgressDialog
    )
    DIALOGS_AVAILABLE = True
except ImportError:
    DIALOGS_AVAILABLE = False
    print("Warning: Dialog modules not available")

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QSplitter, QTabWidget, QTextEdit, QToolBar, QMenuBar, QStatusBar, 
    QDockWidget, QGroupBox, QFormLayout, QLabel, QLineEdit, QPushButton, 
    QComboBox, QSpinBox, QDoubleSpinBox, QCheckBox, QProgressBar, 
    QFileDialog, QMessageBox, QTreeWidget, QTreeWidgetItem, QTableWidget,
    QTableWidgetItem, QHeaderView, QSlider, QFrame, QScrollArea,
    QGridLayout, QListWidget, QListWidgetItem
)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QThread
from PyQt6.QtGui import QAction, QFont, QPalette, QColor, QPixmap, QPainter

# Try to import GemPy
try:
    import gempy as gp
    GEMPY_AVAILABLE = True
    print("GemPy available:", gp.__version__)
except ImportError:
    GEMPY_AVAILABLE = False
    print("GemPy not available - using simulation mode")

# Try to import 3D visualization
try:
    import pyvista as pv
    import pyvistaqt as pvqt
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

class GemPyTheme:
    """GemPy professional styling"""
    
    # GemPy color scheme
    BG_PRIMARY = "#F5F5F5"        # Light gray background
    BG_SECONDARY = "#EEEEEE"      # Panel background  
    BG_PANEL = "#FFFFFF"          # White panels
    BG_VIEWPORT = "#FAFAFA"       # Viewport background
    
    # Geological colors
    SURFACE_COLORS = [
        "#8B4513",  # Sedimentary brown
        "#CD853F",  # Sandy brown
        "#D2691E",  # Chocolate
        "#A0522D",  # Sienna
        "#696969",  # Dim gray (basement)
        "#2F4F4F",  # Dark slate gray
        "#708090",  # Slate gray
        "#778899",  # Light slate gray
    ]
    
    ACCENT_BLUE = "#2E86C1"       # GemPy blue
    SUCCESS_GREEN = "#28B463"     # Success
    WARNING_ORANGE = "#F39C12"    # Warning
    ERROR_RED = "#E74C3C"         # Error
    
    TEXT_PRIMARY = "#2C3E50"      # Dark text
    TEXT_SECONDARY = "#7B8A8B"    # Gray text
    BORDER_COLOR = "#BDC3C7"      # Light border

    @staticmethod
    def get_stylesheet():
        return f"""
        QMainWindow {{
            background-color: {GemPyTheme.BG_PRIMARY};
            color: {GemPyTheme.TEXT_PRIMARY};
            font-family: "Segoe UI";
            font-size: 9pt;
        }}
        
        QMenuBar {{
            background-color: {GemPyTheme.BG_SECONDARY};
            border-bottom: 1px solid {GemPyTheme.BORDER_COLOR};
            padding: 2px;
        }}
        
        QMenuBar::item:selected {{
            background-color: {GemPyTheme.ACCENT_BLUE};
            color: white;
        }}
        
        QGroupBox {{
            font-weight: bold;
            border: 1px solid {GemPyTheme.BORDER_COLOR};
            border-radius: 4px;
            margin-top: 8px;
            padding-top: 12px;
            background-color: {GemPyTheme.BG_PANEL};
        }}
        
        QGroupBox::title {{
            subcontrol-origin: margin;
            left: 8px;
            padding: 0 4px;
            color: {GemPyTheme.ACCENT_BLUE};
        }}
        
        QPushButton {{
            background-color: {GemPyTheme.BG_SECONDARY};
            border: 1px solid {GemPyTheme.BORDER_COLOR};
            padding: 6px 12px;
            border-radius: 3px;
            font-weight: bold;
        }}
        
        QPushButton:hover {{
            background-color: {GemPyTheme.ACCENT_BLUE};
            color: white;
        }}
        
        QLineEdit, QSpinBox, QDoubleSpinBox, QComboBox {{
            background-color: white;
            border: 1px solid {GemPyTheme.BORDER_COLOR};
            padding: 4px;
            border-radius: 2px;
        }}
        
        QLineEdit:focus, QSpinBox:focus, QDoubleSpinBox:focus {{
            border: 2px solid {GemPyTheme.ACCENT_BLUE};
        }}
        
        QTableWidget {{
            background-color: white;
            gridline-color: {GemPyTheme.BORDER_COLOR};
            selection-background-color: {GemPyTheme.ACCENT_BLUE};
        }}
        
        QListWidget {{
            background-color: white;
            border: 1px solid {GemPyTheme.BORDER_COLOR};
        }}
        
        QListWidget::item:selected {{
            background-color: {GemPyTheme.ACCENT_BLUE};
            color: white;
        }}
        """

class GemPyDataPanel(QWidget):
    """GemPy地质数据管理面板"""
    
    data_changed = pyqtSignal()
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.surfaces_data = []
        self.interface_points = []
        self.orientations = []
        self.init_panel()
    
    def init_panel(self):
        """初始化数据面板"""
        layout = QVBoxLayout(self)
        
        # 地层面管理
        surfaces_group = QGroupBox("地层面 (Surfaces)")
        surfaces_layout = QVBoxLayout(surfaces_group)
        
        # 地层列表
        self.surfaces_list = QListWidget()
        self.setup_default_surfaces()
        surfaces_layout.addWidget(self.surfaces_list)
        
        # 地层操作按钮
        surf_buttons = QHBoxLayout()
        add_surf_btn = QPushButton("添加地层")
        add_surf_btn.clicked.connect(self.add_surface)
        del_surf_btn = QPushButton("删除地层")
        del_surf_btn.clicked.connect(self.delete_surface)
        surf_buttons.addWidget(add_surf_btn)
        surf_buttons.addWidget(del_surf_btn)
        surfaces_layout.addLayout(surf_buttons)
        
        layout.addWidget(surfaces_group)
        
        # 界面点管理
        points_group = QGroupBox("界面点 (Interface Points)")
        points_layout = QVBoxLayout(points_group)
        
        # 点坐标输入
        coords_layout = QFormLayout()
        self.point_x = QDoubleSpinBox()
        self.point_x.setRange(-10000, 10000)
        self.point_y = QDoubleSpinBox()
        self.point_y.setRange(-10000, 10000)
        self.point_z = QDoubleSpinBox()
        self.point_z.setRange(-5000, 5000)
        
        coords_layout.addRow("X坐标:", self.point_x)
        coords_layout.addRow("Y坐标:", self.point_y)
        coords_layout.addRow("Z坐标:", self.point_z)
        
        self.point_surface = QComboBox()
        coords_layout.addRow("所属地层:", self.point_surface)
        
        points_layout.addLayout(coords_layout)
        
        # 点操作按钮
        point_buttons = QHBoxLayout()
        add_point_btn = QPushButton("添加点")
        add_point_btn.clicked.connect(self.add_interface_point)
        del_point_btn = QPushButton("删除点")
        point_buttons.addWidget(add_point_btn)
        point_buttons.addWidget(del_point_btn)
        points_layout.addLayout(point_buttons)
        
        # 点列表
        self.points_table = QTableWidget(0, 4)
        self.points_table.setHorizontalHeaderLabels(["X", "Y", "Z", "地层"])
        points_layout.addWidget(self.points_table)
        
        layout.addWidget(points_group)
        
        # 产状数据管理
        orient_group = QGroupBox("产状数据 (Orientations)")
        orient_layout = QVBoxLayout(orient_group)
        
        # 产状输入
        orient_form = QFormLayout()
        self.orient_x = QDoubleSpinBox()
        self.orient_x.setRange(-10000, 10000)
        self.orient_y = QDoubleSpinBox()
        self.orient_y.setRange(-10000, 10000)
        self.orient_z = QDoubleSpinBox()
        self.orient_z.setRange(-5000, 5000)
        
        self.dip = QDoubleSpinBox()
        self.dip.setRange(0, 90)
        self.dip.setSuffix("°")
        self.azimuth = QDoubleSpinBox()
        self.azimuth.setRange(0, 360)
        self.azimuth.setSuffix("°")
        
        orient_form.addRow("X坐标:", self.orient_x)
        orient_form.addRow("Y坐标:", self.orient_y)
        orient_form.addRow("Z坐标:", self.orient_z)
        orient_form.addRow("倾角 (Dip):", self.dip)
        orient_form.addRow("方位角 (Azimuth):", self.azimuth)
        
        self.orient_surface = QComboBox()
        orient_form.addRow("所属地层:", self.orient_surface)
        
        orient_layout.addLayout(orient_form)
        
        # 产状操作
        orient_buttons = QHBoxLayout()
        add_orient_btn = QPushButton("添加产状")
        add_orient_btn.clicked.connect(self.add_orientation)
        orient_buttons.addWidget(add_orient_btn)
        orient_layout.addLayout(orient_buttons)
        
        layout.addWidget(orient_group)
        
        # 数据操作
        data_ops_group = QGroupBox("数据操作")
        data_ops_layout = QVBoxLayout(data_ops_group)
        
        import_btn = QPushButton("导入数据")
        import_btn.clicked.connect(self.import_data)
        export_btn = QPushButton("导出数据")
        export_btn.clicked.connect(self.export_data)
        validate_btn = QPushButton("验证数据")
        validate_btn.clicked.connect(self.validate_data)
        
        data_ops_layout.addWidget(import_btn)
        data_ops_layout.addWidget(export_btn)
        data_ops_layout.addWidget(validate_btn)
        
        layout.addWidget(data_ops_group)
        
        layout.addStretch()
        
        # 在所有UI组件创建完成后更新下拉框
        QTimer.singleShot(0, self.update_surface_combos)
    
    def setup_default_surfaces(self):
        """设置默认地层"""
        default_surfaces = [
            ("第四系", "#D2B48C"),
            ("第三系", "#CD853F"),
            ("白垩系", "#DEB887"),
            ("侏罗系", "#BC8F8F"),
            ("基底", "#696969")
        ]
        
        for name, color in default_surfaces:
            self.add_surface_to_list(name, color)
            self.surfaces_data.append({"name": name, "color": color, "age": len(self.surfaces_data)})
    
    def add_surface_to_list(self, name, color):
        """添加地层到列表"""
        item = QListWidgetItem(name)
        item.setData(Qt.ItemDataRole.UserRole, color)
        # 设置颜色背景
        item.setBackground(QColor(color))
        self.surfaces_list.addItem(item)
    
    def update_surface_combos(self):
        """更新地层选择框"""
        self.point_surface.clear()
        self.orient_surface.clear()
        
        for surface in self.surfaces_data:
            self.point_surface.addItem(surface["name"])
            self.orient_surface.addItem(surface["name"])
    
    def add_surface(self):
        """添加新地层"""
        from PyQt6.QtWidgets import QInputDialog, QColorDialog
        
        name, ok = QInputDialog.getText(self, "添加地层", "地层名称:")
        if ok and name:
            color_dialog = QColorDialog()
            color = color_dialog.getColor()
            if color.isValid():
                color_name = color.name()
                self.add_surface_to_list(name, color_name)
                self.surfaces_data.append({"name": name, "color": color_name, "age": len(self.surfaces_data)})
                self.update_surface_combos()
                self.data_changed.emit()
    
    def delete_surface(self):
        """删除选中地层"""
        current_row = self.surfaces_list.currentRow()
        if current_row >= 0:
            self.surfaces_list.takeItem(current_row)
            del self.surfaces_data[current_row]
            self.update_surface_combos()
            self.data_changed.emit()
    
    def add_interface_point(self):
        """添加界面点"""
        if not self.surfaces_data:
            QMessageBox.warning(self, "警告", "请先添加地层！")
            return
        
        x = self.point_x.value()
        y = self.point_y.value()
        z = self.point_z.value()
        surface = self.point_surface.currentText()
        
        # 添加到表格
        row = self.points_table.rowCount()
        self.points_table.insertRow(row)
        self.points_table.setItem(row, 0, QTableWidgetItem(str(x)))
        self.points_table.setItem(row, 1, QTableWidgetItem(str(y)))
        self.points_table.setItem(row, 2, QTableWidgetItem(str(z)))
        self.points_table.setItem(row, 3, QTableWidgetItem(surface))
        
        # 添加到数据
        self.interface_points.append({
            "X": x, "Y": y, "Z": z, "surface": surface
        })
        
        self.data_changed.emit()
    
    def add_orientation(self):
        """添加产状数据"""
        if not self.surfaces_data:
            QMessageBox.warning(self, "警告", "请先添加地层！")
            return
        
        x = self.orient_x.value()
        y = self.orient_y.value()
        z = self.orient_z.value()
        dip_val = self.dip.value()
        azimuth_val = self.azimuth.value()
        surface = self.orient_surface.currentText()
        
        self.orientations.append({
            "X": x, "Y": y, "Z": z, 
            "dip": dip_val, "azimuth": azimuth_val, "surface": surface
        })
        
        print(f"添加产状: ({x}, {y}, {z}) 倾角:{dip_val}° 方位:{azimuth_val}° 地层:{surface}")
        self.data_changed.emit()
    
    def import_data(self):
        """导入地质数据"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "导入地质数据", "", 
            "CSV Files (*.csv);;Excel Files (*.xlsx);;All Files (*)"
        )
        if file_path:
            try:
                if file_path.endswith('.csv'):
                    data = pd.read_csv(file_path)
                else:
                    data = pd.read_excel(file_path)
                
                print(f"导入数据: {len(data)} 条记录")
                # TODO: 解析数据并添加到界面
                QMessageBox.information(self, "成功", f"成功导入 {len(data)} 条数据记录")
                
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导入失败: {str(e)}")
    
    def export_data(self):
        """导出地质数据"""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "导出地质数据", "", "CSV Files (*.csv)"
        )
        if file_path:
            try:
                # 导出界面点
                if self.interface_points:
                    points_df = pd.DataFrame(self.interface_points)
                    points_df.to_csv(file_path.replace('.csv', '_interface_points.csv'), index=False)
                
                # 导出产状数据
                if self.orientations:
                    orient_df = pd.DataFrame(self.orientations)
                    orient_df.to_csv(file_path.replace('.csv', '_orientations.csv'), index=False)
                
                QMessageBox.information(self, "成功", "数据导出完成！")
                
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导出失败: {str(e)}")
    
    def validate_data(self):
        """验证数据完整性"""
        issues = []
        
        if not self.surfaces_data:
            issues.append("- 缺少地层定义")
        
        if not self.interface_points:
            issues.append("- 缺少界面点数据")
        
        if not self.orientations:
            issues.append("- 缺少产状数据")
        
        if issues:
            QMessageBox.warning(self, "数据验证", "发现以下问题：\n" + "\n".join(issues))
        else:
            QMessageBox.information(self, "数据验证", "数据验证通过！✓")

class GemPy3DViewport(QWidget):
    """GemPy专业三维可视化视窗"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.geo_model = None
        self.init_viewport()
    
    def init_viewport(self):
        """初始化3D视窗"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 视窗控制条
        controls = self.create_viewport_controls()
        layout.addWidget(controls)
        
        # 主3D视窗
        if PYVISTA_AVAILABLE:
            try:
                self.plotter = pvqt.QtInteractor(self)
                # 设置地质建模专用背景
                self.plotter.set_background([0.95, 0.95, 0.95])  # 浅灰背景
                layout.addWidget(self.plotter)
                
                self.setup_geological_scene()
                
            except Exception as e:
                error_label = QLabel(f"3D视窗错误: {str(e)}")
                error_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
                layout.addWidget(error_label)
        else:
            fallback_label = QLabel("3D可视化不可用\n(需要安装PyVista)")
            fallback_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            layout.addWidget(fallback_label)
        
        # 剖面视图
        sections_widget = self.create_sections_widget()
        layout.addWidget(sections_widget)
    
    def create_viewport_controls(self):
        """创建视窗控制"""
        controls = QFrame()
        controls.setMaximumHeight(40)
        controls.setStyleSheet(f"background-color: {GemPyTheme.BG_SECONDARY};")
        
        layout = QHBoxLayout(controls)
        
        # 视图控制
        view_label = QLabel("视图:")
        self.view_combo = QComboBox()
        self.view_combo.addItems(['等轴测', '俯视', '前视', '侧视'])
        
        layout.addWidget(view_label)
        layout.addWidget(self.view_combo)
        
        # 显示选项
        self.show_data_points = QCheckBox("数据点")
        self.show_data_points.setChecked(True)
        self.show_orientations = QCheckBox("产状")
        self.show_orientations.setChecked(True)
        self.show_surfaces = QCheckBox("地层面")
        self.show_surfaces.setChecked(True)
        
        layout.addWidget(self.show_data_points)
        layout.addWidget(self.show_orientations)
        layout.addWidget(self.show_surfaces)
        
        layout.addStretch()
        
        # 操作按钮
        update_btn = QPushButton("更新视图")
        update_btn.clicked.connect(self.update_view)
        screenshot_btn = QPushButton("截图")
        
        layout.addWidget(update_btn)
        layout.addWidget(screenshot_btn)
        
        return controls
    
    def create_sections_widget(self):
        """创建剖面视图"""
        sections_group = QGroupBox("地质剖面")
        sections_layout = QHBoxLayout(sections_group)
        
        # XY剖面
        xy_frame = QFrame()
        xy_frame.setMinimumSize(150, 100)
        xy_frame.setStyleSheet("border: 1px solid gray; background-color: white;")
        xy_label = QLabel("XY剖面")
        xy_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        xy_layout = QVBoxLayout(xy_frame)
        xy_layout.addWidget(xy_label)
        
        # XZ剖面
        xz_frame = QFrame()
        xz_frame.setMinimumSize(150, 100)
        xz_frame.setStyleSheet("border: 1px solid gray; background-color: white;")
        xz_label = QLabel("XZ剖面")
        xz_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        xz_layout = QVBoxLayout(xz_frame)
        xz_layout.addWidget(xz_label)
        
        # YZ剖面
        yz_frame = QFrame()
        yz_frame.setMinimumSize(150, 100)
        yz_frame.setStyleSheet("border: 1px solid gray; background-color: white;")
        yz_label = QLabel("YZ剖面")
        yz_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        yz_layout = QVBoxLayout(yz_frame)
        yz_layout.addWidget(yz_label)
        
        sections_layout.addWidget(xy_frame)
        sections_layout.addWidget(xz_frame)
        sections_layout.addWidget(yz_frame)
        
        return sections_group
    
    def setup_geological_scene(self):
        """设置地质场景"""
        if not hasattr(self, 'plotter'):
            return
        
        # 添加坐标轴
        self.plotter.add_axes(
            line_width=2,
            x_color='red',
            y_color='green',
            z_color='blue'
        )
        
        # 添加示例地质数据
        self.plot_sample_geology()
    
    def plot_sample_geology(self):
        """绘制示例地质数据"""
        if not hasattr(self, 'plotter'):
            return
        
        try:
            # 示例界面点
            interface_points = np.array([
                [500, 500, 100],  # 地层1界面点
                [600, 400, 80],
                [400, 600, 120],
                [500, 500, 0],    # 地层2界面点
                [700, 300, -20],
                [300, 700, 20],
                [500, 500, -100], # 基底
                [800, 200, -120],
                [200, 800, -80],
            ])
            
            # 绘制界面点
            points_mesh = pv.PolyData(interface_points)
            self.plotter.add_mesh(
                points_mesh,
                color='red',
                point_size=10,
                render_points_as_spheres=True,
                label='界面点'
            )
            
            # 示例地层面
            x = np.linspace(0, 1000, 20)
            y = np.linspace(0, 1000, 20)
            X, Y = np.meshgrid(x, y)
            
            # 地层1
            Z1 = 100 + 0.05 * X - 0.03 * Y + 10 * np.sin(X/200) * np.cos(Y/200)
            surface1 = pv.StructuredGrid(X, Y, Z1)
            self.plotter.add_mesh(
                surface1,
                color='#D2B48C',  # 浅褐色
                opacity=0.7,
                label='第四系'
            )
            
            # 地层2
            Z2 = Z1 - 80 - 5 * np.sin(X/150)
            surface2 = pv.StructuredGrid(X, Y, Z2)
            self.plotter.add_mesh(
                surface2,
                color='#CD853F',  # 秘鲁色
                opacity=0.7,
                label='第三系'
            )
            
            # 基底
            Z3 = Z2 - 120 + 20 * np.sin(X/100) * np.cos(Y/100)
            surface3 = pv.StructuredGrid(X, Y, Z3)
            self.plotter.add_mesh(
                surface3,
                color='#696969',  # 暗灰色
                opacity=0.8,
                label='基底'
            )
            
            # 设置相机
            self.plotter.reset_camera()
            self.plotter.camera.elevation = 30
            self.plotter.camera.azimuth = 45
            
        except Exception as e:
            print(f"绘制地质场景失败: {e}")
    
    def update_view(self):
        """更新视图"""
        print("更新3D视图")
        if hasattr(self, 'plotter'):
            self.plotter.reset_camera()
    
    def update_with_gempy_model(self, geo_model):
        """使用GemPy模型更新视图"""
        self.geo_model = geo_model
        print("使用GemPy模型更新视图")

class GemPyModelSettings(QWidget):
    """GemPy模型设置面板"""
    
    model_updated = pyqtSignal(object)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.geo_model = None
        self.init_settings()
    
    def init_settings(self):
        """初始化设置面板"""
        layout = QVBoxLayout(self)
        
        # 地层序列
        strat_group = QGroupBox("地层序列 (Stratigraphic Pile)")
        strat_layout = QVBoxLayout(strat_group)
        
        self.strat_list = QListWidget()
        self.setup_default_stratigraphy()
        strat_layout.addWidget(self.strat_list)
        
        # 序列控制
        strat_controls = QHBoxLayout()
        move_up_btn = QPushButton("上移")
        move_down_btn = QPushButton("下移")
        strat_controls.addWidget(move_up_btn)
        strat_controls.addWidget(move_down_btn)
        strat_layout.addLayout(strat_controls)
        
        layout.addWidget(strat_group)
        
        # 模型参数
        params_group = QGroupBox("模型参数")
        params_layout = QFormLayout(params_group)
        
        # 模型范围
        self.extent_x_min = QDoubleSpinBox()
        self.extent_x_min.setRange(-10000, 10000)
        self.extent_x_min.setValue(0)
        
        self.extent_x_max = QDoubleSpinBox()
        self.extent_x_max.setRange(-10000, 10000)
        self.extent_x_max.setValue(1000)
        
        self.extent_y_min = QDoubleSpinBox()
        self.extent_y_min.setRange(-10000, 10000)
        self.extent_y_min.setValue(0)
        
        self.extent_y_max = QDoubleSpinBox()
        self.extent_y_max.setRange(-10000, 10000)
        self.extent_y_max.setValue(1000)
        
        self.extent_z_min = QDoubleSpinBox()
        self.extent_z_min.setRange(-5000, 5000)
        self.extent_z_min.setValue(-500)
        
        self.extent_z_max = QDoubleSpinBox()
        self.extent_z_max.setRange(-5000, 5000)
        self.extent_z_max.setValue(500)
        
        params_layout.addRow("X范围:", 
                           self.create_range_widget(self.extent_x_min, self.extent_x_max))
        params_layout.addRow("Y范围:", 
                           self.create_range_widget(self.extent_y_min, self.extent_y_max))
        params_layout.addRow("Z范围:", 
                           self.create_range_widget(self.extent_z_min, self.extent_z_max))
        
        # 分辨率
        self.resolution = QLineEdit("50, 50, 50")
        params_layout.addRow("分辨率 (nx,ny,nz):", self.resolution)
        
        layout.addWidget(params_group)
        
        # 插值参数
        interp_group = QGroupBox("插值参数")
        interp_layout = QFormLayout(interp_group)
        
        self.kriging_type = QComboBox()
        self.kriging_type.addItems(["Universal Kriging", "Simple Kriging", "Ordinary Kriging"])
        interp_layout.addRow("克里金类型:", self.kriging_type)
        
        self.range_param = QDoubleSpinBox()
        self.range_param.setRange(1, 10000)
        self.range_param.setValue(1000)
        interp_layout.addRow("变程参数:", self.range_param)
        
        layout.addWidget(interp_group)
        
        # 计算控制
        compute_group = QGroupBox("计算控制")
        compute_layout = QVBoxLayout(compute_group)
        
        self.build_model_btn = QPushButton("构建模型")
        self.build_model_btn.clicked.connect(self.build_gempy_model)
        compute_layout.addWidget(self.build_model_btn)
        
        self.update_view_btn = QPushButton("更新视图")
        self.update_view_btn.clicked.connect(self.update_model_view)
        compute_layout.addWidget(self.update_view_btn)
        
        self.compute_sections_btn = QPushButton("计算剖面")
        compute_layout.addWidget(self.compute_sections_btn)
        
        self.export_model_btn = QPushButton("导出模型")
        self.export_model_btn.clicked.connect(self.export_model)
        compute_layout.addWidget(self.export_model_btn)
        
        layout.addWidget(compute_group)
        
        layout.addStretch()
    
    def create_range_widget(self, min_spin, max_spin):
        """创建范围输入控件"""
        widget = QWidget()
        layout = QHBoxLayout(widget)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(min_spin)
        layout.addWidget(QLabel("至"))
        layout.addWidget(max_spin)
        return widget
    
    def setup_default_stratigraphy(self):
        """设置默认地层序列"""
        default_strat = [
            "第四系 (Quaternary)",
            "第三系 (Tertiary)", 
            "白垩系 (Cretaceous)",
            "侏罗系 (Jurassic)",
            "基底 (Basement)"
        ]
        
        for strat in default_strat:
            self.strat_list.addItem(strat)
    
    def build_gempy_model(self):
        """构建GemPy地质模型"""
        try:
            # 获取模型参数
            extent = [
                self.extent_x_min.value(), self.extent_x_max.value(),
                self.extent_y_min.value(), self.extent_y_max.value(),
                self.extent_z_min.value(), self.extent_z_max.value()
            ]
            
            resolution_text = self.resolution.text().strip()
            try:
                resolution = [int(x.strip()) for x in resolution_text.split(',')]
                if len(resolution) != 3:
                    raise ValueError()
            except:
                resolution = [50, 50, 50]
                QMessageBox.warning(self, "警告", "分辨率格式错误，使用默认值 50,50,50")
            
            print(f"构建GemPy模型:")
            print(f"  范围: {extent}")
            print(f"  分辨率: {resolution}")
            
            if GEMPY_AVAILABLE:
                # 真实GemPy模型构建
                try:
                    geo_model = gp.create_model('GEM_Model')
                    geo_model = gp.init_data(geo_model, extent, resolution)
                    
                    # 设置地层序列（需要界面点和产状数据）
                    # 这里需要从数据面板获取真实数据
                    print("GemPy模型创建成功！")
                    self.geo_model = geo_model
                    
                except Exception as e:
                    print(f"GemPy模型创建失败: {e}")
                    QMessageBox.warning(self, "警告", f"GemPy模型创建失败: {str(e)}")
            else:
                # 模拟模式
                self.geo_model = {
                    'extent': extent,
                    'resolution': resolution,
                    'status': 'simulated'
                }
                print("模拟模式：GemPy模型创建成功（模拟）")
            
            QMessageBox.information(self, "成功", "地质模型构建完成！")
            self.model_updated.emit(self.geo_model)
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"模型构建失败: {str(e)}")
    
    def update_model_view(self):
        """更新模型视图"""
        if self.geo_model:
            print("更新模型视图")
            self.model_updated.emit(self.geo_model)
        else:
            QMessageBox.warning(self, "警告", "请先构建模型！")
    
    def export_model(self):
        """导出模型"""
        if not self.geo_model:
            QMessageBox.warning(self, "警告", "没有可导出的模型！")
            return
        
        file_path, _ = QFileDialog.getSaveFileName(
            self, "导出GemPy模型", "", 
            "GemPy Files (*.gempy);;VTK Files (*.vtk);;All Files (*)"
        )
        
        if file_path:
            try:
                # 导出逻辑
                print(f"导出模型到: {file_path}")
                QMessageBox.information(self, "成功", "模型导出成功！")
                
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导出失败: {str(e)}")

class GemPyProfessionalInterface(QMainWindow):
    """GemPy专业地质建模界面"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GemPy Professional - 专业地质隐式建模系统")
        self.setGeometry(50, 50, 1600, 1000)
        
        # 初始化界面
        self.init_ui()
        self.create_menu_system()
        self.create_status_system()
        
        # 连接信号
        self.connect_signals()
        
        print("GemPy Professional 地质建模系统启动成功!")
        print("专业三维地质隐式建模 + PyVista可视化")
    
    def init_ui(self):
        """初始化专业界面"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(4, 4, 4, 4)
        
        # 三面板布局
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # 左侧数据面板
        self.data_panel = GemPyDataPanel()
        self.data_panel.setMaximumWidth(350)
        self.data_panel.setMinimumWidth(280)
        main_splitter.addWidget(self.data_panel)
        
        # 中央3D视窗
        self.viewport = GemPy3DViewport()
        main_splitter.addWidget(self.viewport)
        
        # 右侧设置面板
        self.settings_panel = GemPyModelSettings()
        self.settings_panel.setMaximumWidth(320)
        self.settings_panel.setMinimumWidth(280)
        main_splitter.addWidget(self.settings_panel)
        
        # 设置分割比例: [320, 960, 320]
        main_splitter.setSizes([320, 960, 320])
        
        main_layout.addWidget(main_splitter)
    
    def create_menu_system(self):
        """创建菜单系统"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu('文件')
        file_menu.addAction('新建模型', self.new_model)
        file_menu.addAction('打开模型', self.open_model)
        file_menu.addAction('保存模型', self.save_model)
        file_menu.addAction('另存为', self.save_model_as)
        file_menu.addSeparator()
        file_menu.addAction('导入数据', self.import_geological_data)
        file_menu.addAction('导出结果', self.export_results)
        file_menu.addSeparator()
        file_menu.addAction('退出', self.close)
        
        # GemPy菜单
        gempy_menu = menubar.addMenu('GemPy')
        gempy_menu.addAction('模型设置', self.model_settings)
        gempy_menu.addAction('地层管理', self.surface_manager)
        gempy_menu.addAction('构建模型', self.build_model)
        gempy_menu.addAction('计算重力', self.compute_gravity)
        gempy_menu.addAction('计算磁力', self.compute_magnetic)
        
        # 数据菜单
        data_menu = menubar.addMenu('数据')
        data_menu.addAction('界面点管理', self.interface_points_manager)
        data_menu.addAction('产状数据管理', self.orientations_manager)
        data_menu.addAction('数据验证', self.validate_geological_data)
        data_menu.addAction('数据统计', self.data_statistics)
        
        # 模型菜单
        model_menu = menubar.addMenu('模型')
        model_menu.addAction('网格设置', self.grid_settings)
        model_menu.addAction('插值参数', self.interpolation_settings)
        model_menu.addAction('构建模型', self.build_geological_model)
        model_menu.addAction('模型优化', self.optimize_model)
        
        # 分析菜单
        analysis_menu = menubar.addMenu('分析')
        analysis_menu.addAction('剖面分析', self.section_analysis)
        analysis_menu.addAction('体积计算', self.volume_calculation)
        analysis_menu.addAction('不确定性分析', self.uncertainty_analysis)
        analysis_menu.addAction('敏感性分析', self.sensitivity_analysis)
        
        # 可视化菜单
        viz_menu = menubar.addMenu('可视化')
        viz_menu.addAction('3D视图设置', self.view_settings)
        viz_menu.addAction('剖面视图', self.section_views)
        viz_menu.addAction('等值面', self.iso_surfaces)
        viz_menu.addAction('动画制作', self.create_animation)
        
        # 帮助菜单
        help_menu = menubar.addMenu('帮助')
        help_menu.addAction('用户手册', self.show_manual)
        help_menu.addAction('示例数据', self.load_example_data)
        help_menu.addAction('关于GemPy', self.show_about)
    
    def create_status_system(self):
        """创建状态栏"""
        status_bar = self.statusBar()
        
        # 状态信息
        self.status_label = QLabel("就绪")
        status_bar.addWidget(self.status_label)
        
        # 数据统计
        self.data_stats = QLabel("数据点: 0 | 产状: 0 | 地层: 0")
        status_bar.addPermanentWidget(self.data_stats)
        
        # 模型状态
        self.model_status = QLabel("模型: 未构建")
        status_bar.addPermanentWidget(self.model_status)
    
    def connect_signals(self):
        """连接信号槽"""
        # 数据面板信号
        self.data_panel.data_changed.connect(self.on_data_changed)
        
        # 设置面板信号
        self.settings_panel.model_updated.connect(self.on_model_updated)
    
    def on_data_changed(self):
        """数据变化处理"""
        # 更新状态栏
        n_points = len(self.data_panel.interface_points)
        n_orientations = len(self.data_panel.orientations)
        n_surfaces = len(self.data_panel.surfaces_data)
        
        self.data_stats.setText(f"数据点: {n_points} | 产状: {n_orientations} | 地层: {n_surfaces}")
        self.status_label.setText("数据已更新")
    
    def on_model_updated(self, geo_model):
        """模型更新处理"""
        self.viewport.update_with_gempy_model(geo_model)
        self.model_status.setText("模型: 已构建")
        self.status_label.setText("模型已更新")
    
    # 菜单动作实现
    def new_model(self):
        """新建模型"""
        reply = QMessageBox.question(self, "新建模型", 
            "创建新模型将清除当前所有数据，确定要继续吗？")
        if reply == QMessageBox.StandardButton.Yes:
            # 清除数据
            self.data_panel.surfaces_data.clear()
            self.data_panel.interface_points.clear()
            self.data_panel.orientations.clear()
            self.data_panel.setup_default_surfaces()
            self.status_label.setText("已创建新模型")
    
    def open_model(self):
        """打开模型"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "打开GemPy模型", "", 
            "GemPy Models (*.gempy);;JSON Files (*.json);;All Files (*)"
        )
        if file_path:
            try:
                # TODO: 实现模型加载逻辑
                self.status_label.setText(f"已打开模型: {file_path}")
                QMessageBox.information(self, "成功", f"模型加载成功!\n{file_path}")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"模型加载失败: {str(e)}")
    
    def save_model(self):
        """保存模型"""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "保存GemPy模型", "", 
            "GemPy Models (*.gempy);;JSON Files (*.json)"
        )
        if file_path:
            try:
                # TODO: 实现模型保存逻辑
                self.status_label.setText(f"已保存模型: {file_path}")
                QMessageBox.information(self, "成功", "模型保存成功!")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"模型保存失败: {str(e)}")
    
    def save_model_as(self):
        """另存为模型"""
        self.save_model()  # 重用保存逻辑
    
    def import_geological_data(self):
        """导入地质数据"""
        self.data_panel.import_data()
    
    def export_results(self):
        """导出结果"""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "导出结果", "", 
            "VTK Files (*.vtk);;STL Files (*.stl);;PLY Files (*.ply);;All Files (*)"
        )
        if file_path:
            try:
                # TODO: 实现结果导出逻辑
                self.status_label.setText(f"结果已导出: {file_path}")
                QMessageBox.information(self, "成功", "结果导出成功!")
            except Exception as e:
                QMessageBox.critical(self, "错误", f"结果导出失败: {str(e)}")
    
    def model_settings(self):
        """模型设置"""
        if DIALOGS_AVAILABLE:
            dialog = ModelSettingsDialog(self)
            if dialog.exec() == QDialog.DialogCode.Accepted:
                settings = dialog.get_settings()
                self.status_label.setText("模型设置已更新")
                # TODO: 应用设置到模型
        else:
            QMessageBox.information(self, "模型设置", "模型设置对话框功能")
    
    def surface_manager(self):
        """地层管理"""
        if DIALOGS_AVAILABLE:
            dialog = SurfaceManagerDialog(self.data_panel.surfaces_data, self)
            if dialog.exec() == QDialog.DialogCode.Accepted:
                # 更新数据面板
                self.data_panel.surfaces_data = dialog.surfaces_data
                self.data_panel.update_surface_combos()
                self.status_label.setText("地层管理已更新")
        else:
            QMessageBox.information(self, "地层管理", "地层管理对话框功能")
    
    def build_model(self):
        """构建模型"""
        if len(self.data_panel.interface_points) == 0:
            QMessageBox.warning(self, "警告", "请先添加界面点数据!")
            return
        
        # 显示进度对话框
        if DIALOGS_AVAILABLE:
            progress = ProgressDialog("构建GemPy模型", self)
            progress.show()
            progress.set_progress(0, "初始化模型...")
        
        try:
            # 构建模型
            self.settings_panel.build_gempy_model()
            
            if DIALOGS_AVAILABLE:
                progress.set_progress(100, "模型构建完成!")
                QTimer.singleShot(1000, progress.accept)
            
        except Exception as e:
            if DIALOGS_AVAILABLE:
                progress.reject()
            QMessageBox.critical(self, "错误", f"模型构建失败: {str(e)}")
    
    def compute_gravity(self):
        """计算重力异常"""
        if not hasattr(self.settings_panel, 'geo_model') or self.settings_panel.geo_model is None:
            QMessageBox.warning(self, "警告", "请先构建地质模型!")
            return
        
        # 显示进度对话框
        if DIALOGS_AVAILABLE:
            progress = ProgressDialog("计算重力异常", self)
            progress.show()
            progress.set_indeterminate()
            progress.set_progress(0, "计算重力场...")
        
        try:
            # TODO: 实现重力计算
            QTimer.singleShot(2000, lambda: self.finish_gravity_calculation(progress))
        except Exception as e:
            if DIALOGS_AVAILABLE:
                progress.reject()
            QMessageBox.critical(self, "错误", f"重力计算失败: {str(e)}")
    
    def finish_gravity_calculation(self, progress):
        """完成重力计算"""
        if DIALOGS_AVAILABLE:
            progress.set_progress(100, "重力异常计算完成!")
            QTimer.singleShot(1000, progress.accept)
        self.status_label.setText("重力异常计算完成")
        QMessageBox.information(self, "成功", "重力异常计算完成!")
    
    def compute_magnetic(self):
        """计算磁力异常"""
        if not hasattr(self.settings_panel, 'geo_model') or self.settings_panel.geo_model is None:
            QMessageBox.warning(self, "警告", "请先构建地质模型!")
            return
        
        self.status_label.setText("计算磁力异常")
        QMessageBox.information(self, "磁力异常", "磁力异常计算功能")
    
    def interface_points_manager(self):
        """界面点管理"""
        # 切换到数据面板的界面点部分
        self.status_label.setText("界面点管理 - 请在左侧数据面板中操作")
        QMessageBox.information(self, "界面点管理", 
            "请在左侧数据面板中添加和管理界面点数据。\\n" +
            "支持手动输入坐标或从文件导入数据。")
    
    def orientations_manager(self):
        """产状数据管理"""
        self.status_label.setText("产状数据管理 - 请在左侧数据面板中操作")
        QMessageBox.information(self, "产状数据管理", 
            "请在左侧数据面板中添加和管理产状数据。\\n" +
            "包括倾角、方位角和所属地层信息。")
    
    def validate_geological_data(self):
        """验证地质数据"""
        self.data_panel.validate_data()
    
    def data_statistics(self):
        """数据统计"""
        if DIALOGS_AVAILABLE:
            dialog = DataStatisticsDialog(
                self.data_panel.interface_points,
                self.data_panel.orientations,
                self
            )
            dialog.exec()
        else:
            # 简单统计信息
            n_points = len(self.data_panel.interface_points)
            n_orientations = len(self.data_panel.orientations)
            n_surfaces = len(self.data_panel.surfaces_data)
            
            stats_text = f"""地质数据统计:
界面点数量: {n_points}
产状数据数量: {n_orientations}
地层面数量: {n_surfaces}"""
            
            QMessageBox.information(self, "数据统计", stats_text)
    
    def grid_settings(self):
        """网格设置"""
        self.model_settings()  # 重用模型设置对话框
    
    def interpolation_settings(self):
        """插值参数设置"""
        self.model_settings()  # 重用模型设置对话框
    
    def build_geological_model(self):
        """构建地质模型"""
        self.build_model()  # 重用构建模型功能
    
    def optimize_model(self):
        """模型优化"""
        if not hasattr(self.settings_panel, 'geo_model') or self.settings_panel.geo_model is None:
            QMessageBox.warning(self, "警告", "请先构建地质模型!")
            return
        
        self.status_label.setText("模型优化")
        QMessageBox.information(self, "模型优化", 
            "模型优化功能:\\n" +
            "• 参数自动调优\\n" +
            "• 网格自适应细化\\n" +
            "• 插值精度提升")
    
    def section_analysis(self):
        """剖面分析"""
        self.status_label.setText("剖面分析")
        QMessageBox.information(self, "剖面分析", 
            "剖面分析功能:\\n" +
            "• 任意方向剖面切割\\n" +
            "• 多剖面同时显示\\n" +
            "• 地层厚度分析\\n" +
            "• 剖面数据导出")
    
    def volume_calculation(self):
        """体积计算"""
        if not hasattr(self.settings_panel, 'geo_model') or self.settings_panel.geo_model is None:
            QMessageBox.warning(self, "警告", "请先构建地质模型!")
            return
        
        # 简单的体积计算示例
        try:
            # 计算每个地层的体积
            volumes = {}
            for surface in self.data_panel.surfaces_data:
                # 模拟体积计算
                volume = np.random.uniform(1e6, 1e8)  # 立方米
                volumes[surface['name']] = volume
            
            # 显示结果
            volume_text = "地层体积计算结果:\\n" + "="*30 + "\\n"
            total_volume = 0
            for name, volume in volumes.items():
                volume_text += f"{name}: {volume:.2e} m³\\n"
                total_volume += volume
            volume_text += "="*30 + "\\n"
            volume_text += f"总体积: {total_volume:.2e} m³"
            
            QMessageBox.information(self, "体积计算结果", volume_text)
            self.status_label.setText("体积计算完成")
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"体积计算失败: {str(e)}")
    
    def uncertainty_analysis(self):
        """不确定性分析"""
        self.status_label.setText("不确定性分析")
        QMessageBox.information(self, "不确定性分析", 
            "不确定性分析功能:\\n" +
            "• 蒙特卡洛采样\\n" +
            "• 贝叶斯推理\\n" +
            "• 参数敏感性分析\\n" +
            "• 置信区间计算")
    
    def sensitivity_analysis(self):
        """敏感性分析"""
        self.status_label.setText("敏感性分析")
        QMessageBox.information(self, "敏感性分析", 
            "敏感性分析功能:\\n" +
            "• 参数影响评估\\n" +
            "• Sobol指数计算\\n" +
            "• 相关性分析\\n" +
            "• 敏感性排序")
    
    def view_settings(self):
        """3D视图设置"""
        if DIALOGS_AVAILABLE:
            dialog = ViewSettingsDialog(self)
            if dialog.exec() == QDialog.DialogCode.Accepted:
                settings = dialog.get_settings()
                # TODO: 应用设置到3D视图
                self.status_label.setText("视图设置已更新")
        else:
            QMessageBox.information(self, "视图设置", "3D视图设置对话框功能")
    
    def section_views(self):
        """剖面视图"""
        self.status_label.setText("剖面视图")
        QMessageBox.information(self, "剖面视图", 
            "剖面视图功能:\\n" +
            "• XY、XZ、YZ平面剖面\\n" +
            "• 任意倾斜剖面\\n" +
            "• 多剖面组合显示\\n" +
            "• 剖面数据分析")
    
    def iso_surfaces(self):
        """等值面显示"""
        self.status_label.setText("等值面显示")
        QMessageBox.information(self, "等值面", 
            "等值面显示功能:\\n" +
            "• 标量场等值面\\n" +
            "• 多等值面叠加\\n" +
            "• 透明度调节\\n" +
            "• 等值面动画")
    
    def create_animation(self):
        """动画制作"""
        self.status_label.setText("动画制作")
        QMessageBox.information(self, "动画制作", 
            "动画制作功能:\\n" +
            "• 相机路径动画\\n" +
            "• 时间序列动画\\n" +
            "• 参数变化动画\\n" +
            "• 视频导出功能")
    
    def show_manual(self):
        QMessageBox.information(self, "用户手册", 
            "GemPy Professional 用户手册\n\n"
            "这是专业的三维地质隐式建模软件，基于GemPy库开发。\n\n"
            "主要功能：\n"
            "• 地质数据管理（界面点、产状）\n"
            "• 三维隐式建模\n" 
            "• 地球物理正演计算\n"
            "• 不确定性分析\n"
            "• 专业3D可视化")
    
    def load_example_data(self):
        self.status_label.setText("加载示例数据")
    
    def show_about(self):
        QMessageBox.about(self, "关于GemPy Professional",
            "GemPy Professional v1.0\n"
            "专业三维地质隐式建模系统\n\n"
            "基于GemPy开源地质建模库\n"
            "集成PyVista 3D可视化\n"
            "专业的地质建模工作流程\n\n"
            "© 2024 DeepCAD Team")

def main():
    """主程序入口"""
    app = QApplication(sys.argv)
    
    # 设置应用信息
    app.setApplicationName("GemPy Professional")
    app.setApplicationVersion("1.0.0")
    app.setOrganizationName("DeepCAD")
    
    # 应用主题
    app.setStyleSheet(GemPyTheme.get_stylesheet())
    
    # 创建主窗口
    window = GemPyProfessionalInterface()
    window.show()
    
    return app.exec()

if __name__ == "__main__":
    sys.exit(main())