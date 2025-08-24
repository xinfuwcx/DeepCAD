"""
GemPy Professional Interface Dialogs
专业对话框和交互功能实现
"""

from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QFormLayout, QGridLayout,
    QLabel, QLineEdit, QPushButton, QComboBox, QSpinBox, QDoubleSpinBox,
    QCheckBox, QGroupBox, QTabWidget, QWidget, QTextEdit, QTableWidget,
    QTableWidgetItem, QListWidget, QListWidgetItem, QSlider, QProgressBar,
    QFileDialog, QMessageBox, QColorDialog, QInputDialog
)
from PyQt6.QtCore import Qt, pyqtSignal, QTimer
from PyQt6.QtGui import QFont, QColor
import numpy as np

class ModelSettingsDialog(QDialog):
    """模型设置对话框"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("GemPy模型设置")
        self.setFixedSize(500, 600)
        self.init_dialog()
    
    def init_dialog(self):
        layout = QVBoxLayout(self)
        
        # 创建标签页
        tabs = QTabWidget()
        
        # 基本设置标签页
        basic_tab = self.create_basic_settings_tab()
        tabs.addTab(basic_tab, "基本设置")
        
        # 高级设置标签页
        advanced_tab = self.create_advanced_settings_tab()
        tabs.addTab(advanced_tab, "高级设置")
        
        # 插值设置标签页
        interp_tab = self.create_interpolation_tab()
        tabs.addTab(interp_tab, "插值参数")
        
        layout.addWidget(tabs)
        
        # 按钮区域
        buttons_layout = QHBoxLayout()
        
        self.ok_btn = QPushButton("确定")
        self.ok_btn.clicked.connect(self.accept)
        self.cancel_btn = QPushButton("取消")
        self.cancel_btn.clicked.connect(self.reject)
        self.apply_btn = QPushButton("应用")
        self.apply_btn.clicked.connect(self.apply_settings)
        
        buttons_layout.addStretch()
        buttons_layout.addWidget(self.ok_btn)
        buttons_layout.addWidget(self.cancel_btn)
        buttons_layout.addWidget(self.apply_btn)
        
        layout.addLayout(buttons_layout)
    
    def create_basic_settings_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 模型范围设置
        extent_group = QGroupBox("模型范围")
        extent_layout = QFormLayout(extent_group)
        
        self.x_min = QDoubleSpinBox()
        self.x_min.setRange(-50000, 50000)
        self.x_min.setValue(0)
        self.x_max = QDoubleSpinBox()
        self.x_max.setRange(-50000, 50000)
        self.x_max.setValue(1000)
        
        self.y_min = QDoubleSpinBox()
        self.y_min.setRange(-50000, 50000)
        self.y_min.setValue(0)
        self.y_max = QDoubleSpinBox()
        self.y_max.setRange(-50000, 50000)
        self.y_max.setValue(1000)
        
        self.z_min = QDoubleSpinBox()
        self.z_min.setRange(-10000, 10000)
        self.z_min.setValue(-500)
        self.z_max = QDoubleSpinBox()
        self.z_max.setRange(-10000, 10000)
        self.z_max.setValue(500)
        
        extent_layout.addRow("X最小值:", self.x_min)
        extent_layout.addRow("X最大值:", self.x_max)
        extent_layout.addRow("Y最小值:", self.y_min)
        extent_layout.addRow("Y最大值:", self.y_max)
        extent_layout.addRow("Z最小值:", self.z_min)
        extent_layout.addRow("Z最大值:", self.z_max)
        
        layout.addWidget(extent_group)
        
        # 分辨率设置
        resolution_group = QGroupBox("网格分辨率")
        resolution_layout = QFormLayout(resolution_group)
        
        self.nx = QSpinBox()
        self.nx.setRange(10, 500)
        self.nx.setValue(50)
        self.ny = QSpinBox()
        self.ny.setRange(10, 500)
        self.ny.setValue(50)
        self.nz = QSpinBox()
        self.nz.setRange(10, 200)
        self.nz.setValue(50)
        
        resolution_layout.addRow("X方向网格数:", self.nx)
        resolution_layout.addRow("Y方向网格数:", self.ny)
        resolution_layout.addRow("Z方向网格数:", self.nz)
        
        # 计算内存使用
        self.memory_label = QLabel()
        self.update_memory_usage()
        resolution_layout.addRow("预估内存使用:", self.memory_label)
        
        # 连接信号更新内存使用
        self.nx.valueChanged.connect(self.update_memory_usage)
        self.ny.valueChanged.connect(self.update_memory_usage)
        self.nz.valueChanged.connect(self.update_memory_usage)
        
        layout.addWidget(resolution_group)
        
        layout.addStretch()
        return widget
    
    def create_advanced_settings_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 计算设置
        compute_group = QGroupBox("计算设置")
        compute_layout = QFormLayout(compute_group)
        
        self.backend = QComboBox()
        self.backend.addItems(["NumPy", "TensorFlow", "PyTorch"])
        compute_layout.addRow("计算后端:", self.backend)
        
        self.precision = QComboBox()
        self.precision.addItems(["单精度 (float32)", "双精度 (float64)"])
        self.precision.setCurrentIndex(1)
        compute_layout.addRow("计算精度:", self.precision)
        
        self.parallel_threads = QSpinBox()
        self.parallel_threads.setRange(1, 64)
        self.parallel_threads.setValue(4)
        compute_layout.addRow("并行线程数:", self.parallel_threads)
        
        layout.addWidget(compute_group)
        
        # 优化设置
        optimization_group = QGroupBox("优化设置")
        optimization_layout = QFormLayout(optimization_group)
        
        self.optimization_method = QComboBox()
        self.optimization_method.addItems(["L-BFGS-B", "SLSQP", "Trust Region"])
        optimization_layout.addRow("优化方法:", self.optimization_method)
        
        self.max_iterations = QSpinBox()
        self.max_iterations.setRange(10, 10000)
        self.max_iterations.setValue(1000)
        optimization_layout.addRow("最大迭代次数:", self.max_iterations)
        
        self.tolerance = QDoubleSpinBox()
        self.tolerance.setRange(1e-10, 1e-2)
        self.tolerance.setValue(1e-6)
        self.tolerance.setDecimals(8)
        optimization_layout.addRow("收敛容差:", self.tolerance)
        
        layout.addWidget(optimization_group)
        
        layout.addStretch()
        return widget
    
    def create_interpolation_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 克里金参数
        kriging_group = QGroupBox("克里金插值参数")
        kriging_layout = QFormLayout(kriging_group)
        
        self.kriging_type = QComboBox()
        self.kriging_type.addItems([
            "Universal Kriging",
            "Simple Kriging", 
            "Ordinary Kriging",
            "Co-Kriging"
        ])
        kriging_layout.addRow("克里金类型:", self.kriging_type)
        
        self.variogram_model = QComboBox()
        self.variogram_model.addItems([
            "Spherical",
            "Exponential",
            "Gaussian",
            "Linear",
            "Matern"
        ])
        kriging_layout.addRow("变异函数模型:", self.variogram_model)
        
        self.range_param = QDoubleSpinBox()
        self.range_param.setRange(1, 50000)
        self.range_param.setValue(1000)
        kriging_layout.addRow("变程参数:", self.range_param)
        
        self.sill_param = QDoubleSpinBox()
        self.sill_param.setRange(0.1, 1000)
        self.sill_param.setValue(1.0)
        kriging_layout.addRow("基台值:", self.sill_param)
        
        self.nugget_param = QDoubleSpinBox()
        self.nugget_param.setRange(0, 100)
        self.nugget_param.setValue(0.1)
        kriging_layout.addRow("块金值:", self.nugget_param)
        
        layout.addWidget(kriging_group)
        
        # RBF参数
        rbf_group = QGroupBox("径向基函数参数")
        rbf_layout = QFormLayout(rbf_group)
        
        self.rbf_function = QComboBox()
        self.rbf_function.addItems([
            "多二次函数 (Multiquadric)",
            "反多二次函数 (Inverse Multiquadric)",
            "高斯函数 (Gaussian)",
            "三次函数 (Cubic)",
            "线性函数 (Linear)"
        ])
        rbf_layout.addRow("RBF函数类型:", self.rbf_function)
        
        self.rbf_smooth = QDoubleSpinBox()
        self.rbf_smooth.setRange(0, 10)
        self.rbf_smooth.setValue(0)
        rbf_layout.addRow("平滑参数:", self.rbf_smooth)
        
        layout.addWidget(rbf_group)
        
        layout.addStretch()
        return widget
    
    def update_memory_usage(self):
        """更新内存使用预估"""
        nx, ny, nz = self.nx.value(), self.ny.value(), self.nz.value()
        total_cells = nx * ny * nz
        memory_mb = total_cells * 8 * 4 / (1024 * 1024)  # 假设每个网格点8个变量，每个变量4字节
        self.memory_label.setText(f"约 {memory_mb:.1f} MB")
    
    def apply_settings(self):
        """应用设置"""
        settings = self.get_settings()
        print("应用模型设置:", settings)
        QMessageBox.information(self, "设置已应用", "模型设置已成功应用！")
    
    def get_settings(self):
        """获取设置"""
        return {
            'extent': [self.x_min.value(), self.x_max.value(),
                      self.y_min.value(), self.y_max.value(),
                      self.z_min.value(), self.z_max.value()],
            'resolution': [self.nx.value(), self.ny.value(), self.nz.value()],
            'backend': self.backend.currentText(),
            'precision': self.precision.currentText(),
            'threads': self.parallel_threads.value(),
            'kriging_type': self.kriging_type.currentText(),
            'variogram_model': self.variogram_model.currentText(),
            'range': self.range_param.value(),
            'sill': self.sill_param.value(),
            'nugget': self.nugget_param.value(),
        }

class SurfaceManagerDialog(QDialog):
    """地层管理对话框"""
    
    def __init__(self, surfaces_data=None, parent=None):
        super().__init__(parent)
        self.setWindowTitle("地层管理器")
        self.setFixedSize(600, 500)
        self.surfaces_data = surfaces_data or []
        self.init_dialog()
    
    def init_dialog(self):
        layout = QHBoxLayout(self)
        
        # 左侧地层列表
        left_widget = QWidget()
        left_layout = QVBoxLayout(left_widget)
        
        list_label = QLabel("地层列表:")
        list_label.setFont(QFont("", 10, QFont.Weight.Bold))
        left_layout.addWidget(list_label)
        
        self.surfaces_list = QListWidget()
        self.load_surfaces()
        self.surfaces_list.currentRowChanged.connect(self.on_surface_selected)
        left_layout.addWidget(self.surfaces_list)
        
        # 地层操作按钮
        list_buttons = QHBoxLayout()
        add_btn = QPushButton("添加")
        add_btn.clicked.connect(self.add_surface)
        delete_btn = QPushButton("删除")
        delete_btn.clicked.connect(self.delete_surface)
        move_up_btn = QPushButton("上移")
        move_up_btn.clicked.connect(self.move_surface_up)
        move_down_btn = QPushButton("下移")
        move_down_btn.clicked.connect(self.move_surface_down)
        
        list_buttons.addWidget(add_btn)
        list_buttons.addWidget(delete_btn)
        list_buttons.addWidget(move_up_btn)
        list_buttons.addWidget(move_down_btn)
        left_layout.addLayout(list_buttons)
        
        layout.addWidget(left_widget)
        
        # 右侧地层属性
        right_widget = QWidget()
        right_layout = QVBoxLayout(right_widget)
        
        props_label = QLabel("地层属性:")
        props_label.setFont(QFont("", 10, QFont.Weight.Bold))
        right_layout.addWidget(props_label)
        
        # 属性表单
        props_group = QGroupBox("基本属性")
        props_form = QFormLayout(props_group)
        
        self.surface_name = QLineEdit()
        props_form.addRow("名称:", self.surface_name)
        
        self.surface_age = QSpinBox()
        self.surface_age.setRange(0, 1000)
        props_form.addRow("地质年龄 (Ma):", self.surface_age)
        
        self.surface_color_btn = QPushButton()
        self.surface_color_btn.clicked.connect(self.choose_color)
        self.surface_color = "#8B4513"
        self.update_color_button()
        props_form.addRow("颜色:", self.surface_color_btn)
        
        self.surface_opacity = QSlider(Qt.Orientation.Horizontal)
        self.surface_opacity.setRange(10, 100)
        self.surface_opacity.setValue(80)
        self.opacity_label = QLabel("80%")
        self.surface_opacity.valueChanged.connect(self.update_opacity_label)
        opacity_layout = QHBoxLayout()
        opacity_layout.addWidget(self.surface_opacity)
        opacity_layout.addWidget(self.opacity_label)
        props_form.addRow("透明度:", opacity_layout)
        
        right_layout.addWidget(props_group)
        
        # 地质属性
        geological_group = QGroupBox("地质属性")
        geological_form = QFormLayout(geological_group)
        
        self.rock_type = QComboBox()
        self.rock_type.addItems([
            "沉积岩", "岩浆岩", "变质岩", "松散堆积物", "其他"
        ])
        geological_form.addRow("岩石类型:", self.rock_type)
        
        self.formation_name = QLineEdit()
        geological_form.addRow("地层单位:", self.formation_name)
        
        self.description = QTextEdit()
        self.description.setMaximumHeight(80)
        geological_form.addRow("描述:", self.description)
        
        right_layout.addWidget(geological_group)
        
        # 应用按钮
        apply_btn = QPushButton("应用修改")
        apply_btn.clicked.connect(self.apply_surface_changes)
        right_layout.addWidget(apply_btn)
        
        right_layout.addStretch()
        layout.addWidget(right_widget)
        
        # 底部按钮
        bottom_layout = QHBoxLayout()
        ok_btn = QPushButton("确定")
        ok_btn.clicked.connect(self.accept)
        cancel_btn = QPushButton("取消")
        cancel_btn.clicked.connect(self.reject)
        
        bottom_layout.addStretch()
        bottom_layout.addWidget(ok_btn)
        bottom_layout.addWidget(cancel_btn)
        
        main_layout = QVBoxLayout()
        main_layout.addLayout(layout)
        main_layout.addLayout(bottom_layout)
        self.setLayout(main_layout)
    
    def load_surfaces(self):
        """加载地层列表"""
        self.surfaces_list.clear()
        for i, surface in enumerate(self.surfaces_data):
            item = QListWidgetItem(f"{i+1}. {surface['name']}")
            item.setData(Qt.ItemDataRole.UserRole, i)
            self.surfaces_list.addItem(item)
    
    def on_surface_selected(self, row):
        """地层选中事件"""
        if row >= 0 and row < len(self.surfaces_data):
            surface = self.surfaces_data[row]
            self.surface_name.setText(surface['name'])
            self.surface_age.setValue(surface.get('age', 0))
            self.surface_color = surface.get('color', '#8B4513')
            self.update_color_button()
            self.surface_opacity.setValue(int(surface.get('opacity', 0.8) * 100))
            self.rock_type.setCurrentText(surface.get('rock_type', '沉积岩'))
            self.formation_name.setText(surface.get('formation_name', ''))
            self.description.setText(surface.get('description', ''))
    
    def add_surface(self):
        """添加地层"""
        name, ok = QInputDialog.getText(self, "添加地层", "地层名称:")
        if ok and name:
            new_surface = {
                'name': name,
                'color': '#8B4513',
                'age': 0,
                'opacity': 0.8,
                'rock_type': '沉积岩',
                'formation_name': '',
                'description': ''
            }
            self.surfaces_data.append(new_surface)
            self.load_surfaces()
    
    def delete_surface(self):
        """删除地层"""
        current_row = self.surfaces_list.currentRow()
        if current_row >= 0:
            reply = QMessageBox.question(self, "确认删除", 
                f"确定要删除地层 '{self.surfaces_data[current_row]['name']}' 吗？")
            if reply == QMessageBox.StandardButton.Yes:
                del self.surfaces_data[current_row]
                self.load_surfaces()
    
    def move_surface_up(self):
        """上移地层"""
        current_row = self.surfaces_list.currentRow()
        if current_row > 0:
            self.surfaces_data[current_row], self.surfaces_data[current_row-1] = \
                self.surfaces_data[current_row-1], self.surfaces_data[current_row]
            self.load_surfaces()
            self.surfaces_list.setCurrentRow(current_row - 1)
    
    def move_surface_down(self):
        """下移地层"""
        current_row = self.surfaces_list.currentRow()
        if current_row >= 0 and current_row < len(self.surfaces_data) - 1:
            self.surfaces_data[current_row], self.surfaces_data[current_row+1] = \
                self.surfaces_data[current_row+1], self.surfaces_data[current_row]
            self.load_surfaces()
            self.surfaces_list.setCurrentRow(current_row + 1)
    
    def choose_color(self):
        """选择颜色"""
        color = QColorDialog.getColor(QColor(self.surface_color), self)
        if color.isValid():
            self.surface_color = color.name()
            self.update_color_button()
    
    def update_color_button(self):
        """更新颜色按钮"""
        self.surface_color_btn.setStyleSheet(
            f"background-color: {self.surface_color}; border: 1px solid gray; min-height: 25px;"
        )
        self.surface_color_btn.setText(self.surface_color)
    
    def update_opacity_label(self, value):
        """更新透明度标签"""
        self.opacity_label.setText(f"{value}%")
    
    def apply_surface_changes(self):
        """应用地层修改"""
        current_row = self.surfaces_list.currentRow()
        if current_row >= 0:
            surface = self.surfaces_data[current_row]
            surface['name'] = self.surface_name.text()
            surface['age'] = self.surface_age.value()
            surface['color'] = self.surface_color
            surface['opacity'] = self.surface_opacity.value() / 100.0
            surface['rock_type'] = self.rock_type.currentText()
            surface['formation_name'] = self.formation_name.text()
            surface['description'] = self.description.toPlainText()
            
            self.load_surfaces()
            self.surfaces_list.setCurrentRow(current_row)
            
            QMessageBox.information(self, "成功", "地层属性已更新！")

class DataStatisticsDialog(QDialog):
    """数据统计对话框"""
    
    def __init__(self, interface_points=None, orientations=None, parent=None):
        super().__init__(parent)
        self.setWindowTitle("地质数据统计")
        self.setFixedSize(700, 500)
        self.interface_points = interface_points or []
        self.orientations = orientations or []
        self.init_dialog()
    
    def init_dialog(self):
        layout = QVBoxLayout(self)
        
        # 创建标签页
        tabs = QTabWidget()
        
        # 基本统计
        basic_tab = self.create_basic_stats_tab()
        tabs.addTab(basic_tab, "基本统计")
        
        # 空间分析
        spatial_tab = self.create_spatial_analysis_tab()
        tabs.addTab(spatial_tab, "空间分析")
        
        # 数据质量
        quality_tab = self.create_data_quality_tab()
        tabs.addTab(quality_tab, "数据质量")
        
        layout.addWidget(tabs)
        
        # 按钮
        buttons_layout = QHBoxLayout()
        refresh_btn = QPushButton("刷新统计")
        refresh_btn.clicked.connect(self.refresh_statistics)
        export_btn = QPushButton("导出报告")
        export_btn.clicked.connect(self.export_report)
        close_btn = QPushButton("关闭")
        close_btn.clicked.connect(self.accept)
        
        buttons_layout.addStretch()
        buttons_layout.addWidget(refresh_btn)
        buttons_layout.addWidget(export_btn)
        buttons_layout.addWidget(close_btn)
        
        layout.addLayout(buttons_layout)
        
        # 初始化统计
        self.refresh_statistics()
    
    def create_basic_stats_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 数据概览
        overview_group = QGroupBox("数据概览")
        overview_layout = QGridLayout(overview_group)
        
        self.points_count_label = QLabel("0")
        self.orientations_count_label = QLabel("0")
        self.surfaces_count_label = QLabel("0")
        
        overview_layout.addWidget(QLabel("界面点总数:"), 0, 0)
        overview_layout.addWidget(self.points_count_label, 0, 1)
        overview_layout.addWidget(QLabel("产状数据总数:"), 1, 0)
        overview_layout.addWidget(self.orientations_count_label, 1, 1)
        overview_layout.addWidget(QLabel("地层面数量:"), 2, 0)
        overview_layout.addWidget(self.surfaces_count_label, 2, 1)
        
        layout.addWidget(overview_group)
        
        # 坐标范围
        coords_group = QGroupBox("坐标范围")
        self.coords_table = QTableWidget(3, 3)
        self.coords_table.setHorizontalHeaderLabels(["轴", "最小值", "最大值"])
        self.coords_table.setVerticalHeaderLabels(["X", "Y", "Z"])
        coords_group_layout = QVBoxLayout(coords_group)
        coords_group_layout.addWidget(self.coords_table)
        
        layout.addWidget(coords_group)
        
        # 地层分布统计
        surface_stats_group = QGroupBox("地层数据分布")
        self.surface_stats_table = QTableWidget(0, 3)
        self.surface_stats_table.setHorizontalHeaderLabels(["地层名", "界面点数", "产状数据数"])
        surface_stats_group_layout = QVBoxLayout(surface_stats_group)
        surface_stats_group_layout.addWidget(self.surface_stats_table)
        
        layout.addWidget(surface_stats_group)
        
        layout.addStretch()
        return widget
    
    def create_spatial_analysis_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 空间密度分析
        density_group = QGroupBox("空间密度分析")
        density_layout = QFormLayout(density_group)
        
        self.point_density_label = QLabel("0")
        self.orient_density_label = QLabel("0")
        self.avg_distance_label = QLabel("0")
        
        density_layout.addRow("点密度 (点/km²):", self.point_density_label)
        density_layout.addRow("产状密度 (个/km²):", self.orient_density_label)
        density_layout.addRow("平均点间距 (m):", self.avg_distance_label)
        
        layout.addWidget(density_group)
        
        # 产状统计
        orientation_group = QGroupBox("产状统计")
        orientation_layout = QFormLayout(orientation_group)
        
        self.dip_stats_label = QLabel("0° - 0°")
        self.azimuth_stats_label = QLabel("0° - 0°")
        self.dip_avg_label = QLabel("0°")
        self.azimuth_avg_label = QLabel("0°")
        
        orientation_layout.addRow("倾角范围:", self.dip_stats_label)
        orientation_layout.addRow("方位角范围:", self.azimuth_stats_label)
        orientation_layout.addRow("平均倾角:", self.dip_avg_label)
        orientation_layout.addRow("平均方位角:", self.azimuth_avg_label)
        
        layout.addWidget(orientation_group)
        
        layout.addStretch()
        return widget
    
    def create_data_quality_tab(self):
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 数据完整性
        completeness_group = QGroupBox("数据完整性检查")
        completeness_layout = QVBoxLayout(completeness_group)
        
        self.completeness_text = QTextEdit()
        self.completeness_text.setMaximumHeight(150)
        completeness_layout.addWidget(self.completeness_text)
        
        layout.addWidget(completeness_group)
        
        # 数据质量指标
        quality_group = QGroupBox("质量指标")
        quality_layout = QFormLayout(quality_group)
        
        self.missing_coords_label = QLabel("0")
        self.duplicate_points_label = QLabel("0")
        self.invalid_orientations_label = QLabel("0")
        
        quality_layout.addRow("缺失坐标:", self.missing_coords_label)
        quality_layout.addRow("重复点:", self.duplicate_points_label)
        quality_layout.addRow("无效产状:", self.invalid_orientations_label)
        
        layout.addWidget(quality_group)
        
        layout.addStretch()
        return widget
    
    def refresh_statistics(self):
        """刷新统计信息"""
        # 基本统计
        self.points_count_label.setText(str(len(self.interface_points)))
        self.orientations_count_label.setText(str(len(self.orientations)))
        
        # 计算坐标范围
        if self.interface_points:
            points_array = np.array([[p['X'], p['Y'], p['Z']] for p in self.interface_points])
            for i, axis in enumerate(['X', 'Y', 'Z']):
                min_val = np.min(points_array[:, i])
                max_val = np.max(points_array[:, i])
                self.coords_table.setItem(i, 0, QTableWidgetItem(axis))
                self.coords_table.setItem(i, 1, QTableWidgetItem(f"{min_val:.1f}"))
                self.coords_table.setItem(i, 2, QTableWidgetItem(f"{max_val:.1f}"))
        
        # 产状统计
        if self.orientations:
            dips = [o['dip'] for o in self.orientations]
            azimuths = [o['azimuth'] for o in self.orientations]
            
            self.dip_stats_label.setText(f"{min(dips):.1f}° - {max(dips):.1f}°")
            self.azimuth_stats_label.setText(f"{min(azimuths):.1f}° - {max(azimuths):.1f}°")
            self.dip_avg_label.setText(f"{np.mean(dips):.1f}°")
            self.azimuth_avg_label.setText(f"{np.mean(azimuths):.1f}°")
        
        # 数据质量检查
        quality_issues = []
        
        # 检查缺失坐标
        missing_coords = 0
        for point in self.interface_points:
            if any(pd.isna(point.get(coord, 0)) for coord in ['X', 'Y', 'Z']):
                missing_coords += 1
        
        if missing_coords > 0:
            quality_issues.append(f"发现 {missing_coords} 个点存在缺失坐标")
        
        # 检查重复点
        duplicate_points = 0
        if len(self.interface_points) > 1:
            coords_set = set()
            for point in self.interface_points:
                coord_tuple = (point['X'], point['Y'], point['Z'])
                if coord_tuple in coords_set:
                    duplicate_points += 1
                else:
                    coords_set.add(coord_tuple)
        
        if duplicate_points > 0:
            quality_issues.append(f"发现 {duplicate_points} 个重复点")
        
        # 检查无效产状
        invalid_orientations = 0
        for orient in self.orientations:
            if not (0 <= orient.get('dip', 0) <= 90) or not (0 <= orient.get('azimuth', 0) <= 360):
                invalid_orientations += 1
        
        if invalid_orientations > 0:
            quality_issues.append(f"发现 {invalid_orientations} 个无效产状数据")
        
        # 更新标签
        self.missing_coords_label.setText(str(missing_coords))
        self.duplicate_points_label.setText(str(duplicate_points))
        self.invalid_orientations_label.setText(str(invalid_orientations))
        
        # 更新质量报告
        if quality_issues:
            self.completeness_text.setPlainText("数据质量问题:\n" + "\n".join(quality_issues))
        else:
            self.completeness_text.setPlainText("数据质量检查通过 ✓\n所有数据完整且有效")
    
    def export_report(self):
        """导出统计报告"""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "导出统计报告", "", "Text Files (*.txt);;CSV Files (*.csv)"
        )
        if file_path:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write("GemPy地质数据统计报告\n")
                    f.write("=" * 30 + "\n\n")
                    f.write(f"界面点数量: {len(self.interface_points)}\n")
                    f.write(f"产状数据数量: {len(self.orientations)}\n")
                    # 添加更多统计信息...
                
                QMessageBox.information(self, "成功", f"统计报告已导出到:\n{file_path}")
                
            except Exception as e:
                QMessageBox.critical(self, "错误", f"导出失败: {str(e)}")

class ViewSettingsDialog(QDialog):
    """可视化设置对话框"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("3D可视化设置")
        self.setFixedSize(500, 400)
        self.init_dialog()
    
    def init_dialog(self):
        layout = QVBoxLayout(self)
        
        # 显示设置
        display_group = QGroupBox("显示设置")
        display_layout = QFormLayout(display_group)
        
        self.show_axes = QCheckBox("显示坐标轴")
        self.show_axes.setChecked(True)
        display_layout.addRow(self.show_axes)
        
        self.show_grid = QCheckBox("显示网格")
        display_layout.addRow(self.show_grid)
        
        self.show_bounding_box = QCheckBox("显示边界框")
        display_layout.addRow(self.show_bounding_box)
        
        self.point_size = QSpinBox()
        self.point_size.setRange(1, 50)
        self.point_size.setValue(8)
        display_layout.addRow("数据点大小:", self.point_size)
        
        layout.addWidget(display_group)
        
        # 渲染设置
        render_group = QGroupBox("渲染设置")
        render_layout = QFormLayout(render_group)
        
        self.background_color_btn = QPushButton()
        self.background_color = "#F0F0F0"
        self.update_background_color_button()
        self.background_color_btn.clicked.connect(self.choose_background_color)
        render_layout.addRow("背景颜色:", self.background_color_btn)
        
        self.lighting_quality = QComboBox()
        self.lighting_quality.addItems(["低", "中", "高", "Ultra"])
        self.lighting_quality.setCurrentIndex(2)
        render_layout.addRow("光照质量:", self.lighting_quality)
        
        self.anti_aliasing = QCheckBox("抗锯齿")
        self.anti_aliasing.setChecked(True)
        render_layout.addRow(self.anti_aliasing)
        
        layout.addWidget(render_group)
        
        # 相机设置
        camera_group = QGroupBox("相机设置")
        camera_layout = QFormLayout(camera_group)
        
        self.fov = QSpinBox()
        self.fov.setRange(10, 120)
        self.fov.setValue(60)
        self.fov.setSuffix("°")
        camera_layout.addRow("视野角度:", self.fov)
        
        self.zoom_speed = QDoubleSpinBox()
        self.zoom_speed.setRange(0.1, 5.0)
        self.zoom_speed.setValue(1.0)
        self.zoom_speed.setSingleStep(0.1)
        camera_layout.addRow("缩放速度:", self.zoom_speed)
        
        layout.addWidget(camera_group)
        
        # 按钮
        buttons_layout = QHBoxLayout()
        apply_btn = QPushButton("应用")
        apply_btn.clicked.connect(self.apply_settings)
        reset_btn = QPushButton("重置")
        reset_btn.clicked.connect(self.reset_settings)
        ok_btn = QPushButton("确定")
        ok_btn.clicked.connect(self.accept)
        cancel_btn = QPushButton("取消")
        cancel_btn.clicked.connect(self.reject)
        
        buttons_layout.addStretch()
        buttons_layout.addWidget(apply_btn)
        buttons_layout.addWidget(reset_btn)
        buttons_layout.addWidget(ok_btn)
        buttons_layout.addWidget(cancel_btn)
        
        layout.addLayout(buttons_layout)
    
    def choose_background_color(self):
        """选择背景颜色"""
        color = QColorDialog.getColor(QColor(self.background_color), self)
        if color.isValid():
            self.background_color = color.name()
            self.update_background_color_button()
    
    def update_background_color_button(self):
        """更新背景颜色按钮"""
        self.background_color_btn.setStyleSheet(
            f"background-color: {self.background_color}; border: 1px solid gray; min-height: 25px;"
        )
        self.background_color_btn.setText(self.background_color)
    
    def apply_settings(self):
        """应用设置"""
        settings = self.get_settings()
        print("应用可视化设置:", settings)
        QMessageBox.information(self, "设置已应用", "可视化设置已成功应用！")
    
    def reset_settings(self):
        """重置设置"""
        self.show_axes.setChecked(True)
        self.show_grid.setChecked(False)
        self.show_bounding_box.setChecked(False)
        self.point_size.setValue(8)
        self.background_color = "#F0F0F0"
        self.update_background_color_button()
        self.lighting_quality.setCurrentIndex(2)
        self.anti_aliasing.setChecked(True)
        self.fov.setValue(60)
        self.zoom_speed.setValue(1.0)
    
    def get_settings(self):
        """获取设置"""
        return {
            'show_axes': self.show_axes.isChecked(),
            'show_grid': self.show_grid.isChecked(),
            'show_bounding_box': self.show_bounding_box.isChecked(),
            'point_size': self.point_size.value(),
            'background_color': self.background_color,
            'lighting_quality': self.lighting_quality.currentText(),
            'anti_aliasing': self.anti_aliasing.isChecked(),
            'fov': self.fov.value(),
            'zoom_speed': self.zoom_speed.value(),
        }

# 进度对话框
class ProgressDialog(QDialog):
    """进度显示对话框"""
    
    def __init__(self, title="处理中", parent=None):
        super().__init__(parent)
        self.setWindowTitle(title)
        self.setFixedSize(400, 120)
        self.setModal(True)
        self.init_dialog()
    
    def init_dialog(self):
        layout = QVBoxLayout(self)
        
        self.label = QLabel("正在处理，请稍候...")
        layout.addWidget(self.label)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 100)
        layout.addWidget(self.progress_bar)
        
        self.cancel_btn = QPushButton("取消")
        self.cancel_btn.clicked.connect(self.reject)
        
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        btn_layout.addWidget(self.cancel_btn)
        layout.addLayout(btn_layout)
    
    def set_progress(self, value, text=None):
        """设置进度"""
        self.progress_bar.setValue(value)
        if text:
            self.label.setText(text)
    
    def set_indeterminate(self):
        """设置为不确定进度"""
        self.progress_bar.setRange(0, 0)