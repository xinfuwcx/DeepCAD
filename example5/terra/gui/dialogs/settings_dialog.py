"""
Terra 设置对话框
"""

from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QLineEdit, QPushButton, QTextEdit,
    QCheckBox, QSpinBox, QDoubleSpinBox, QComboBox,
    QGroupBox, QTabWidget, QColorDialog, QFontDialog,
    QSlider, QMessageBox, QFrame
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont, QColor, QPalette

class SettingsDialog(QDialog):
    """设置对话框"""
    
    settings_changed = pyqtSignal(dict)
    
    def __init__(self, config=None, parent=None):
        super().__init__(parent)
        self.config = config or {}
        self.temp_settings = self.config.copy()
        self.init_ui()
    
    def init_ui(self):
        """初始化界面"""
        self.setWindowTitle("Terra 设置")
        self.setFixedSize(600, 500)
        self.setModal(True)
        
        layout = QVBoxLayout(self)
        
        # 标题
        title = QLabel("⚙️ Terra 应用设置")
        title.setFont(QFont("Arial", 14, QFont.Weight.Bold))
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)
        
        # 设置标签页
        tabs = QTabWidget()
        
        # 界面设置
        self.create_ui_settings_tab(tabs)
        
        # 求解器设置
        self.create_solver_settings_tab(tabs)
        
        # 性能设置
        self.create_performance_settings_tab(tabs)
        
        # 高级设置
        self.create_advanced_settings_tab(tabs)
        
        layout.addWidget(tabs)
        
        # 按钮
        button_layout = QHBoxLayout()
        
        reset_button = QPushButton("🔄 重置默认")
        reset_button.clicked.connect(self.reset_defaults)
        
        apply_button = QPushButton("✅ 应用")
        apply_button.clicked.connect(self.apply_settings)
        
        ok_button = QPushButton("🚀 确定")
        ok_button.clicked.connect(self.ok_clicked)
        ok_button.setDefault(True)
        
        cancel_button = QPushButton("❌ 取消")
        cancel_button.clicked.connect(self.reject)
        
        button_layout.addWidget(reset_button)
        button_layout.addStretch()
        button_layout.addWidget(cancel_button)
        button_layout.addWidget(apply_button)
        button_layout.addWidget(ok_button)
        
        layout.addLayout(button_layout)
        
        # 设置样式
        self.apply_dark_style()
    
    def create_ui_settings_tab(self, tabs):
        """创建界面设置标签页"""
        tab = QDialog()
        layout = QVBoxLayout(tab)
        
        # 主题设置
        theme_group = QGroupBox("🎨 主题设置")
        theme_layout = QGridLayout(theme_group)
        
        theme_layout.addWidget(QLabel("界面主题:"), 0, 0)
        self.theme_combo = QComboBox()
        self.theme_combo.addItems(["深色主题", "浅色主题", "Fusion 360 风格"])
        self.theme_combo.setCurrentText(self.temp_settings.get("ui.theme", "深色主题"))
        theme_layout.addWidget(self.theme_combo, 0, 1)
        
        theme_layout.addWidget(QLabel("字体大小:"), 1, 0)
        self.font_size_spin = QSpinBox()
        self.font_size_spin.setRange(8, 20)
        self.font_size_spin.setValue(self.temp_settings.get("ui.font_size", 10))
        self.font_size_spin.setSuffix(" pt")
        theme_layout.addWidget(self.font_size_spin, 1, 1)
        
        theme_layout.addWidget(QLabel("界面缩放:"), 2, 0)
        self.ui_scale_spin = QDoubleSpinBox()
        self.ui_scale_spin.setRange(0.5, 2.0)
        self.ui_scale_spin.setSingleStep(0.1)
        self.ui_scale_spin.setValue(self.temp_settings.get("ui.scale", 1.0))
        self.ui_scale_spin.setSuffix("x")
        theme_layout.addWidget(self.ui_scale_spin, 2, 1)
        
        layout.addWidget(theme_group)
        
        # 语言设置
        lang_group = QGroupBox("🌐 语言设置")
        lang_layout = QGridLayout(lang_group)
        
        lang_layout.addWidget(QLabel("界面语言:"), 0, 0)
        self.language_combo = QComboBox()
        self.language_combo.addItems(["简体中文", "English", "日本語"])
        self.language_combo.setCurrentText(self.temp_settings.get("ui.language", "简体中文"))
        lang_layout.addWidget(self.language_combo, 0, 1)
        
        layout.addWidget(lang_group)
        
        # 视图设置
        view_group = QGroupBox("👁️ 视图设置")
        view_layout = QVBoxLayout(view_group)
        
        self.show_grid = QCheckBox("显示网格")
        self.show_grid.setChecked(self.temp_settings.get("ui.show_grid", True))
        view_layout.addWidget(self.show_grid)
        
        self.show_axes = QCheckBox("显示坐标轴")
        self.show_axes.setChecked(self.temp_settings.get("ui.show_axes", True))
        view_layout.addWidget(self.show_axes)
        
        self.enable_animation = QCheckBox("启用动画效果")
        self.enable_animation.setChecked(self.temp_settings.get("ui.enable_animation", True))
        view_layout.addWidget(self.enable_animation)
        
        layout.addWidget(view_group)
        
        layout.addStretch()
        tabs.addTab(tab, "界面")
    
    def create_solver_settings_tab(self, tabs):
        """创建求解器设置标签页"""
        tab = QDialog()
        layout = QVBoxLayout(tab)
        
        # Kratos 设置
        kratos_group = QGroupBox("⚡ Kratos 求解器")
        kratos_layout = QGridLayout(kratos_group)
        
        kratos_layout.addWidget(QLabel("默认求解器:"), 0, 0)
        self.default_solver = QComboBox()
        self.default_solver.addItems(["Kratos", "模拟求解器"])
        self.default_solver.setCurrentText(self.temp_settings.get("solver.default", "模拟求解器"))
        kratos_layout.addWidget(self.default_solver, 0, 1)
        
        kratos_layout.addWidget(QLabel("Kratos 路径:"), 1, 0)
        self.kratos_path = QLineEdit()
        self.kratos_path.setText(self.temp_settings.get("solver.kratos_path", ""))
        self.kratos_path.setPlaceholderText("Kratos 安装路径...")
        kratos_layout.addWidget(self.kratos_path, 1, 1)
        
        kratos_layout.addWidget(QLabel("求解精度:"), 2, 0)
        self.solver_tolerance = QComboBox()
        self.solver_tolerance.addItems(["1e-4", "1e-6", "1e-8", "1e-10"])
        self.solver_tolerance.setCurrentText(str(self.temp_settings.get("solver.tolerance", "1e-6")))
        kratos_layout.addWidget(self.solver_tolerance, 2, 1)
        
        kratos_layout.addWidget(QLabel("最大迭代次数:"), 3, 0)
        self.max_iterations = QSpinBox()
        self.max_iterations.setRange(10, 10000)
        self.max_iterations.setValue(self.temp_settings.get("solver.max_iterations", 1000))
        kratos_layout.addWidget(self.max_iterations, 3, 1)
        
        layout.addWidget(kratos_group)
        
        # 默认材料
        material_group = QGroupBox("🧱 默认材料")
        material_layout = QGridLayout(material_group)
        
        material_layout.addWidget(QLabel("默认材料:"), 0, 0)
        self.default_material = QComboBox()
        self.default_material.addItems(["混凝土 C30", "钢材 Q235", "粘土", "砂土"])
        self.default_material.setCurrentText(self.temp_settings.get("material.default", "混凝土 C30"))
        material_layout.addWidget(self.default_material, 0, 1)
        
        layout.addWidget(material_group)
        
        layout.addStretch()
        tabs.addTab(tab, "求解器")
    
    def create_performance_settings_tab(self, tabs):
        """创建性能设置标签页"""
        tab = QDialog()
        layout = QVBoxLayout(tab)
        
        # 计算性能
        compute_group = QGroupBox("🚀 计算性能")
        compute_layout = QGridLayout(compute_group)
        
        compute_layout.addWidget(QLabel("并行线程数:"), 0, 0)
        self.thread_count = QSpinBox()
        self.thread_count.setRange(1, 32)
        self.thread_count.setValue(self.temp_settings.get("performance.threads", 4))
        compute_layout.addWidget(self.thread_count, 0, 1)
        
        compute_layout.addWidget(QLabel("内存限制:"), 1, 0)
        self.memory_limit = QSpinBox()
        self.memory_limit.setRange(512, 32768)
        self.memory_limit.setValue(self.temp_settings.get("performance.memory_mb", 4096))
        self.memory_limit.setSuffix(" MB")
        compute_layout.addWidget(self.memory_limit, 1, 1)
        
        self.enable_gpu = QCheckBox("启用 GPU 加速（如果支持）")
        self.enable_gpu.setChecked(self.temp_settings.get("performance.gpu", False))
        compute_layout.addWidget(self.enable_gpu, 2, 0, 1, 2)
        
        layout.addWidget(compute_group)
        
        # 渲染性能
        render_group = QGroupBox("🎮 渲染性能")
        render_layout = QGridLayout(render_group)
        
        render_layout.addWidget(QLabel("渲染质量:"), 0, 0)
        self.render_quality = QComboBox()
        self.render_quality.addItems(["低", "中", "高", "超高"])
        self.render_quality.setCurrentText(self.temp_settings.get("render.quality", "中"))
        render_layout.addWidget(self.render_quality, 0, 1)
        
        render_layout.addWidget(QLabel("帧率限制:"), 1, 0)
        self.fps_limit = QSpinBox()
        self.fps_limit.setRange(30, 120)
        self.fps_limit.setValue(self.temp_settings.get("render.fps_limit", 60))
        self.fps_limit.setSuffix(" FPS")
        render_layout.addWidget(self.fps_limit, 1, 1)
        
        self.enable_vsync = QCheckBox("启用垂直同步")
        self.enable_vsync.setChecked(self.temp_settings.get("render.vsync", True))
        render_layout.addWidget(self.enable_vsync, 2, 0, 1, 2)
        
        layout.addWidget(render_group)
        
        layout.addStretch()
        tabs.addTab(tab, "性能")
    
    def create_advanced_settings_tab(self, tabs):
        """创建高级设置标签页"""
        tab = QDialog()
        layout = QVBoxLayout(tab)
        
        # 调试设置
        debug_group = QGroupBox("🐛 调试设置")
        debug_layout = QVBoxLayout(debug_group)
        
        self.enable_debug = QCheckBox("启用调试模式")
        self.enable_debug.setChecked(self.temp_settings.get("debug.enabled", False))
        debug_layout.addWidget(self.enable_debug)
        
        self.verbose_logging = QCheckBox("详细日志输出")
        self.verbose_logging.setChecked(self.temp_settings.get("debug.verbose", False))
        debug_layout.addWidget(self.verbose_logging)
        
        self.save_temp_files = QCheckBox("保留临时文件")
        self.save_temp_files.setChecked(self.temp_settings.get("debug.save_temp", False))
        debug_layout.addWidget(self.save_temp_files)
        
        layout.addWidget(debug_group)
        
        # 自动保存
        autosave_group = QGroupBox("💾 自动保存")
        autosave_layout = QGridLayout(autosave_group)
        
        self.enable_autosave = QCheckBox("启用自动保存")
        self.enable_autosave.setChecked(self.temp_settings.get("autosave.enabled", True))
        autosave_layout.addWidget(self.enable_autosave, 0, 0, 1, 2)
        
        autosave_layout.addWidget(QLabel("保存间隔:"), 1, 0)
        self.autosave_interval = QSpinBox()
        self.autosave_interval.setRange(1, 60)
        self.autosave_interval.setValue(self.temp_settings.get("autosave.interval_min", 5))
        self.autosave_interval.setSuffix(" 分钟")
        autosave_layout.addWidget(self.autosave_interval, 1, 1)
        
        layout.addWidget(autosave_group)
        
        # 网络设置
        network_group = QGroupBox("🌐 网络设置")
        network_layout = QGridLayout(network_group)
        
        self.enable_updates = QCheckBox("自动检查更新")
        self.enable_updates.setChecked(self.temp_settings.get("network.check_updates", True))
        network_layout.addWidget(self.enable_updates, 0, 0, 1, 2)
        
        self.enable_telemetry = QCheckBox("发送匿名使用统计")
        self.enable_telemetry.setChecked(self.temp_settings.get("network.telemetry", False))
        network_layout.addWidget(self.enable_telemetry, 1, 0, 1, 2)
        
        layout.addWidget(network_group)
        
        layout.addStretch()
        tabs.addTab(tab, "高级")
    
    def apply_dark_style(self):
        """应用深色主题样式"""
        self.setStyleSheet("""
            QDialog {
                background-color: #2b2b2b;
                color: #ffffff;
            }
            QTabWidget::pane {
                border: 1px solid #555555;
                background-color: #2b2b2b;
            }
            QTabBar::tab {
                background-color: #404040;
                color: #ffffff;
                padding: 8px 16px;
                margin: 2px;
                border-radius: 4px;
            }
            QTabBar::tab:selected {
                background-color: #0078d4;
            }
            QGroupBox {
                font-weight: bold;
                border: 2px solid #555555;
                border-radius: 5px;
                margin-top: 10px;
                padding-top: 10px;
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                left: 10px;
                padding: 0 5px 0 5px;
            }
            QLineEdit, QComboBox, QSpinBox, QDoubleSpinBox {
                background-color: #404040;
                border: 1px solid #666666;
                border-radius: 3px;
                padding: 5px;
                color: #ffffff;
            }
            QCheckBox {
                color: #ffffff;
                spacing: 8px;
            }
            QCheckBox::indicator {
                width: 16px;
                height: 16px;
            }
            QCheckBox::indicator:unchecked {
                border: 2px solid #666666;
                background-color: #404040;
                border-radius: 3px;
            }
            QCheckBox::indicator:checked {
                border: 2px solid #0078d4;
                background-color: #0078d4;
                border-radius: 3px;
            }
            QPushButton {
                background-color: #0078d4;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                color: white;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #106ebe;
            }
            QPushButton:pressed {
                background-color: #005a9e;
            }
        """)
    
    def collect_settings(self):
        """收集当前设置"""
        self.temp_settings.update({
            # 界面设置
            "ui.theme": self.theme_combo.currentText(),
            "ui.font_size": self.font_size_spin.value(),
            "ui.scale": self.ui_scale_spin.value(),
            "ui.language": self.language_combo.currentText(),
            "ui.show_grid": self.show_grid.isChecked(),
            "ui.show_axes": self.show_axes.isChecked(),
            "ui.enable_animation": self.enable_animation.isChecked(),
            
            # 求解器设置
            "solver.default": self.default_solver.currentText(),
            "solver.kratos_path": self.kratos_path.text(),
            "solver.tolerance": self.solver_tolerance.currentText(),
            "solver.max_iterations": self.max_iterations.value(),
            "material.default": self.default_material.currentText(),
            
            # 性能设置
            "performance.threads": self.thread_count.value(),
            "performance.memory_mb": self.memory_limit.value(),
            "performance.gpu": self.enable_gpu.isChecked(),
            "render.quality": self.render_quality.currentText(),
            "render.fps_limit": self.fps_limit.value(),
            "render.vsync": self.enable_vsync.isChecked(),
            
            # 高级设置
            "debug.enabled": self.enable_debug.isChecked(),
            "debug.verbose": self.verbose_logging.isChecked(),
            "debug.save_temp": self.save_temp_files.isChecked(),
            "autosave.enabled": self.enable_autosave.isChecked(),
            "autosave.interval_min": self.autosave_interval.value(),
            "network.check_updates": self.enable_updates.isChecked(),
            "network.telemetry": self.enable_telemetry.isChecked()
        })
    
    def reset_defaults(self):
        """重置为默认设置"""
        reply = QMessageBox.question(
            self, 
            "确认", 
            "是否要重置所有设置为默认值？\n这将丢失当前的所有自定义设置。",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            # 重置为默认值
            self.temp_settings = {
                "ui.theme": "深色主题",
                "ui.font_size": 10,
                "ui.scale": 1.0,
                "ui.language": "简体中文",
                "ui.show_grid": True,
                "ui.show_axes": True,
                "ui.enable_animation": True,
                "solver.default": "模拟求解器",
                "solver.tolerance": "1e-6",
                "solver.max_iterations": 1000,
                "performance.threads": 4,
                "performance.memory_mb": 4096,
                "render.quality": "中"
            }
            
            # 更新界面控件
            self.update_ui_from_settings()
            
            QMessageBox.information(self, "完成", "设置已重置为默认值。")
    
    def update_ui_from_settings(self):
        """从设置更新界面控件"""
        self.theme_combo.setCurrentText(self.temp_settings.get("ui.theme", "深色主题"))
        self.font_size_spin.setValue(self.temp_settings.get("ui.font_size", 10))
        self.ui_scale_spin.setValue(self.temp_settings.get("ui.scale", 1.0))
        # ... 更新其他控件
    
    def apply_settings(self):
        """应用设置"""
        self.collect_settings()
        self.settings_changed.emit(self.temp_settings)
        QMessageBox.information(self, "完成", "设置已应用。")
    
    def ok_clicked(self):
        """确定按钮点击"""
        self.collect_settings()
        self.settings_changed.emit(self.temp_settings)
        self.accept()