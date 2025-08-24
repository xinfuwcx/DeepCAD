"""
GemPy ABAQUS Ultimate Interface - ABAQUS级别极致精致界面
Ultimate professional engineering software visual design with ABAQUS CAE aesthetics
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from gempy_complete_interface import *
from abaqus_style_theme import AbaqusStyleTheme, AbaqusAnimationSystem, AbaqusEffectsSystem

try:
    from gempy_icons import GEMPY_ICONS
    ICONS_AVAILABLE = True
except:
    ICONS_AVAILABLE = False


class AbaqusStyleTitleBar(QWidget):
    """ABAQUS风格标题栏"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_title_bar()
    
    def setup_title_bar(self):
        """设置标题栏"""
        self.setFixedHeight(60)
        self.setStyleSheet(f"""
            QWidget {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 {AbaqusStyleTheme.SURFACE_DARKEST},
                    stop:0.3 {AbaqusStyleTheme.METAL_DARK},
                    stop:0.7 {AbaqusStyleTheme.SURFACE_DARK},
                    stop:1 {AbaqusStyleTheme.SURFACE_DARKEST});
                border-bottom: 3px solid {AbaqusStyleTheme.ACCENT_ORANGE};
            }}
        """)
        
        layout = QHBoxLayout(self)
        layout.setContentsMargins(20, 10, 20, 10)
        
        # 应用图标和标题
        title_section = QHBoxLayout()
        
        # 专业图标
        if ICONS_AVAILABLE and 'geological_model' in GEMPY_ICONS:
            icon_label = QLabel()
            icon_pixmap = GEMPY_ICONS['geological_model'].pixmap(32, 32)
            icon_label.setPixmap(icon_pixmap)
            title_section.addWidget(icon_label)
        
        # 主标题
        main_title = QLabel("GemPy ABAQUS Ultimate")
        main_title.setStyleSheet(f"""
            QLabel {{
                color: {AbaqusStyleTheme.TEXT_PRIMARY};
                font-size: 18pt;
                font-weight: 700;
                background: transparent;
                border: none;
            }}
        """)
        title_section.addWidget(main_title)
        
        # 副标题
        subtitle = QLabel("Professional Geological Modeling System")
        subtitle.setStyleSheet(f"""
            QLabel {{
                color: {AbaqusStyleTheme.TEXT_SECONDARY};
                font-size: 10pt;
                font-weight: 500;
                background: transparent;
                border: none;
                margin-left: 10px;
            }}
        """)
        title_section.addWidget(subtitle)
        
        layout.addLayout(title_section)
        layout.addStretch()
        
        # 版本和状态信息
        info_section = QVBoxLayout()
        
        version_label = QLabel("v2025.2.0 Professional")
        version_label.setStyleSheet(f"""
            QLabel {{
                color: {AbaqusStyleTheme.ACCENT_GREEN};
                font-size: 9pt;
                font-weight: 600;
                background: transparent;
                border: none;
            }}
        """)
        
        status_label = QLabel("System Ready")
        status_label.setStyleSheet(f"""
            QLabel {{
                color: {AbaqusStyleTheme.ACCENT_ORANGE};
                font-size: 8pt;
                font-weight: 500;
                background: transparent;
                border: none;
            }}
        """)
        
        info_section.addWidget(version_label)
        info_section.addWidget(status_label)
        layout.addLayout(info_section)


class AbaqusStyleControlPanel(QWidget):
    """ABAQUS风格控制面板"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_control_panel()
    
    def setup_control_panel(self):
        """设置控制面板"""
        self.setFixedWidth(300)
        self.setStyleSheet(f"""
            QWidget {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 {AbaqusStyleTheme.SURFACE_DARK},
                    stop:0.5 {AbaqusStyleTheme.SURFACE_MEDIUM},
                    stop:1 {AbaqusStyleTheme.SURFACE_DARK});
                border: 2px solid {AbaqusStyleTheme.METAL_MEDIUM};
                border-radius: 12px;
            }}
        """)
        
        # 应用工程级阴影
        AbaqusEffectsSystem.apply_engineering_shadow(self)
        
        layout = QVBoxLayout(self)
        layout.setContentsMargins(15, 15, 15, 15)
        layout.setSpacing(15)
        
        # 添加控制组
        self.create_model_control_group(layout)
        self.create_data_control_group(layout)
        self.create_visualization_control_group(layout)
        self.create_analysis_control_group(layout)
        
        layout.addStretch()
    
    def create_model_control_group(self, parent_layout):
        """创建模型控制组"""
        group = QGroupBox("Model Configuration")
        group.setStyleSheet(AbaqusStyleTheme.get_abaqus_stylesheet())
        
        layout = QGridLayout(group)
        layout.setSpacing(10)
        
        # 模型范围控件
        layout.addWidget(QLabel("X Range:"), 0, 0)
        x_min = QDoubleSpinBox()
        x_min.setRange(-10000, 10000)
        x_min.setValue(0)
        x_min.setSuffix(" m")
        layout.addWidget(x_min, 0, 1)
        
        x_max = QDoubleSpinBox()
        x_max.setRange(-10000, 10000)
        x_max.setValue(1000)
        x_max.setSuffix(" m")
        layout.addWidget(x_max, 0, 2)
        
        layout.addWidget(QLabel("Y Range:"), 1, 0)
        y_min = QDoubleSpinBox()
        y_min.setRange(-10000, 10000)
        y_min.setValue(0)
        y_min.setSuffix(" m")
        layout.addWidget(y_min, 1, 1)
        
        y_max = QDoubleSpinBox()
        y_max.setRange(-10000, 10000)
        y_max.setValue(1000)
        y_max.setSuffix(" m")
        layout.addWidget(y_max, 1, 2)
        
        layout.addWidget(QLabel("Z Range:"), 2, 0)
        z_min = QDoubleSpinBox()
        z_min.setRange(-10000, 10000)
        z_min.setValue(-500)
        z_min.setSuffix(" m")
        layout.addWidget(z_min, 2, 1)
        
        z_max = QDoubleSpinBox()
        z_max.setRange(-10000, 10000)
        z_max.setValue(500)
        z_max.setSuffix(" m")
        layout.addWidget(z_max, 2, 2)
        
        # 分辨率控制
        layout.addWidget(QLabel("Resolution:"), 3, 0)
        resolution = QComboBox()
        resolution.addItems(["50x50x50", "100x100x100", "200x200x200", "Custom"])
        layout.addWidget(resolution, 3, 1, 1, 2)
        
        parent_layout.addWidget(group)
    
    def create_data_control_group(self, parent_layout):
        """创建数据控制组"""
        group = QGroupBox("Geological Data")
        
        layout = QVBoxLayout(group)
        
        # 数据统计显示
        stats_frame = QFrame()
        stats_frame.setStyleSheet(f"""
            QFrame {{
                background: rgba(30, 64, 175, 0.2);
                border: 2px solid {AbaqusStyleTheme.PRIMARY_BLUE_LIGHT};
                border-radius: 8px;
                padding: 10px;
            }}
        """)
        
        stats_layout = QGridLayout(stats_frame)
        
        # 状态指示器
        interface_status = QLabel()
        interface_status.setStyleSheet(AbaqusEffectsSystem.create_status_indicator())
        stats_layout.addWidget(interface_status, 0, 0)
        stats_layout.addWidget(QLabel("Interface Points: 32"), 0, 1)
        
        orientation_status = QLabel()
        orientation_status.setStyleSheet(AbaqusEffectsSystem.create_status_indicator())
        stats_layout.addWidget(orientation_status, 1, 0)
        stats_layout.addWidget(QLabel("Orientations: 15"), 1, 1)
        
        surfaces_status = QLabel()
        surfaces_status.setStyleSheet(AbaqusEffectsSystem.create_status_indicator())
        stats_layout.addWidget(surfaces_status, 2, 0)
        stats_layout.addWidget(QLabel("Surfaces: 5"), 2, 1)
        
        layout.addWidget(stats_frame)
        
        # 数据操作按钮
        btn_layout = QHBoxLayout()
        
        import_btn = QPushButton("Import Data")
        if ICONS_AVAILABLE and 'import' in GEMPY_ICONS:
            import_btn.setIcon(GEMPY_ICONS['import'])
        btn_layout.addWidget(import_btn)
        
        validate_btn = QPushButton("Validate")
        if ICONS_AVAILABLE and 'validation' in GEMPY_ICONS:
            validate_btn.setIcon(GEMPY_ICONS['validation'])
        btn_layout.addWidget(validate_btn)
        
        layout.addLayout(btn_layout)
        parent_layout.addWidget(group)
    
    def create_visualization_control_group(self, parent_layout):
        """创建可视化控制组"""
        group = QGroupBox("Visualization")
        
        layout = QVBoxLayout(group)
        
        # 视图控制
        view_layout = QHBoxLayout()
        
        view_combo = QComboBox()
        view_combo.addItems(["Isometric", "Top", "Front", "Side", "Custom"])
        view_combo.setCurrentText("Isometric")
        view_layout.addWidget(QLabel("View:"))
        view_layout.addWidget(view_combo)
        
        layout.addLayout(view_layout)
        
        # 显示选项
        options_layout = QVBoxLayout()
        
        show_data = QCheckBox("Show Data Points")
        show_data.setChecked(True)
        options_layout.addWidget(show_data)
        
        show_orientations = QCheckBox("Show Orientations")
        show_orientations.setChecked(True)
        options_layout.addWidget(show_orientations)
        
        show_surfaces = QCheckBox("Show Surfaces")
        show_surfaces.setChecked(True)
        options_layout.addWidget(show_surfaces)
        
        show_grid = QCheckBox("Show Grid")
        show_grid.setChecked(False)
        options_layout.addWidget(show_grid)
        
        layout.addLayout(options_layout)
        
        # 渲染质量
        quality_layout = QHBoxLayout()
        quality_layout.addWidget(QLabel("Quality:"))
        
        quality_slider = QSlider(Qt.Orientation.Horizontal)
        quality_slider.setRange(1, 5)
        quality_slider.setValue(3)
        quality_layout.addWidget(quality_slider)
        
        quality_label = QLabel("High")
        quality_layout.addWidget(quality_label)
        
        layout.addLayout(quality_layout)
        
        parent_layout.addWidget(group)
    
    def create_analysis_control_group(self, parent_layout):
        """创建分析控制组"""
        group = QGroupBox("Analysis Tools")
        
        layout = QVBoxLayout(group)
        
        # 分析按钮
        analysis_buttons = [
            ("Build Model", 'geological_model'),
            ("Compute Gravity", 'gravity'),
            ("Volume Analysis", 'volume_calculation'),
            ("Uncertainty", 'uncertainty_analysis')
        ]
        
        for btn_text, icon_name in analysis_buttons:
            btn = QPushButton(btn_text)
            if ICONS_AVAILABLE and icon_name in GEMPY_ICONS:
                btn.setIcon(GEMPY_ICONS[icon_name])
            
            # 添加悬停效果
            btn.enterEvent = lambda event, b=btn: self.add_hover_effect(b)
            btn.leaveEvent = lambda event, b=btn: self.remove_hover_effect(b)
            
            layout.addWidget(btn)
        
        parent_layout.addWidget(group)
    
    def add_hover_effect(self, widget):
        """添加悬停效果"""
        AbaqusEffectsSystem.apply_metal_finish(widget)
    
    def remove_hover_effect(self, widget):
        """移除悬停效果"""
        widget.setGraphicsEffect(None)


class AbaqusStyleViewport(QWidget):
    """ABAQUS风格3D视窗"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setup_viewport()
    
    def setup_viewport(self):
        """设置视窗"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(5, 5, 5, 5)
        
        # 视窗控制栏
        control_bar = self.create_viewport_controls()
        layout.addWidget(control_bar)
        
        # 主视窗区域
        viewport_frame = QFrame()
        viewport_frame.setStyleSheet(f"""
            QFrame {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:1,
                    stop:0 {AbaqusStyleTheme.SURFACE_DARKEST},
                    stop:0.3 {AbaqusStyleTheme.SURFACE_DARK},
                    stop:0.7 {AbaqusStyleTheme.SURFACE_DARKEST},
                    stop:1 {AbaqusStyleTheme.SURFACE_DARK});
                border: 3px solid {AbaqusStyleTheme.METAL_MEDIUM};
                border-radius: 15px;
                margin: 5px;
            }}
        """)
        
        # 应用工程级阴影和发光效果
        AbaqusEffectsSystem.apply_engineering_shadow(viewport_frame)
        AbaqusAnimationSystem.create_glow_effect(viewport_frame, QColor(59, 130, 246, 60))
        
        viewport_layout = QVBoxLayout(viewport_frame)
        viewport_layout.setContentsMargins(15, 15, 15, 15)
        
        # 3D视图占位符（在实际应用中这里会是PyVista组件）
        placeholder = QLabel("3D Geological Model View")
        placeholder.setAlignment(Qt.AlignmentFlag.AlignCenter)
        placeholder.setStyleSheet(f"""
            QLabel {{
                color: {AbaqusStyleTheme.TEXT_SECONDARY};
                font-size: 16pt;
                font-weight: 600;
                background: transparent;
                border: 2px dashed {AbaqusStyleTheme.METAL_LIGHT};
                border-radius: 8px;
                padding: 50px;
            }}
        """)
        
        viewport_layout.addWidget(placeholder)
        layout.addWidget(viewport_frame)
    
    def create_viewport_controls(self):
        """创建视窗控制"""
        control_bar = QFrame()
        control_bar.setFixedHeight(60)
        control_bar.setStyleSheet(f"""
            QFrame {{
                background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                    stop:0 {AbaqusStyleTheme.METAL_MEDIUM},
                    stop:0.5 {AbaqusStyleTheme.SURFACE_DARK},
                    stop:1 {AbaqusStyleTheme.METAL_DARK});
                border: 2px solid {AbaqusStyleTheme.METAL_LIGHT};
                border-radius: 10px;
                margin: 2px;
            }}
        """)
        
        layout = QHBoxLayout(control_bar)
        layout.setContentsMargins(15, 8, 15, 8)
        
        # 视图控制按钮
        view_buttons = [
            ("Zoom Fit", 'zoom'),
            ("Rotate", 'rotate'),
            ("Screenshot", 'screenshot'),
            ("Refresh", 'refresh')
        ]
        
        for btn_text, icon_name in view_buttons:
            btn = QPushButton(btn_text)
            if ICONS_AVAILABLE and icon_name in GEMPY_ICONS:
                btn.setIcon(GEMPY_ICONS[icon_name])
            
            btn.setStyleSheet(f"""
                QPushButton {{
                    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                        stop:0 rgba(59, 130, 246, 0.3),
                        stop:1 rgba(30, 64, 175, 0.4));
                    border: 2px solid {AbaqusStyleTheme.ACCENT_ORANGE};
                    border-radius: 8px;
                    color: white;
                    font-weight: 700;
                    padding: 8px 16px;
                    min-width: 80px;
                }}
                QPushButton:hover {{
                    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                        stop:0 {AbaqusStyleTheme.ACCENT_ORANGE},
                        stop:1 {AbaqusStyleTheme.ACCENT_YELLOW});
                    box-shadow: {AbaqusStyleTheme.GLOW_ORANGE};
                    transform: translateY(-2px);
                }}
                QPushButton:pressed {{
                    transform: translateY(1px);
                }}
            """)
            
            layout.addWidget(btn)
        
        layout.addStretch()
        
        # 坐标系指示器
        coord_frame = QFrame()
        coord_frame.setFixedSize(60, 40)
        coord_frame.setStyleSheet(f"""
            QFrame {{
                background: rgba(30, 64, 175, 0.3);
                border: 2px solid {AbaqusStyleTheme.PRIMARY_BLUE_LIGHT};
                border-radius: 6px;
            }}
        """)
        
        coord_layout = QHBoxLayout(coord_frame)
        coord_layout.setContentsMargins(5, 5, 5, 5)
        
        coord_labels = ["X", "Y", "Z"]
        colors = [AbaqusStyleTheme.ACCENT_RED, AbaqusStyleTheme.ACCENT_GREEN, AbaqusStyleTheme.PRIMARY_BLUE_LIGHT]
        
        for label, color in zip(coord_labels, colors):
            coord_label = QLabel(label)
            coord_label.setStyleSheet(f"""
                QLabel {{
                    color: {color};
                    font-weight: 700;
                    font-size: 10pt;
                    background: transparent;
                    border: none;
                }}
            """)
            coord_layout.addWidget(coord_label)
        
        layout.addWidget(coord_frame)
        
        return control_bar


class GemPyAbaqusUltimate(QMainWindow):
    """GemPy ABAQUS终极专业界面"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GemPy ABAQUS Ultimate Professional")
        self.setMinimumSize(1400, 900)
        self.setup_ultimate_interface()
        self.apply_abaqus_styling()
        
    def setup_ultimate_interface(self):
        """设置终极界面"""
        # 主中央widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # 添加标题栏
        title_bar = AbaqusStyleTitleBar()
        main_layout.addWidget(title_bar)
        
        # 主工作区域
        work_area = QSplitter(Qt.Orientation.Horizontal)
        work_area.setChildrenCollapsible(False)
        
        # 左侧控制面板
        control_panel = AbaqusStyleControlPanel()
        work_area.addWidget(control_panel)
        
        # 右侧内容区域
        content_area = QSplitter(Qt.Orientation.Vertical)
        
        # 上部：3D视窗
        viewport = AbaqusStyleViewport()
        content_area.addWidget(viewport)
        
        # 下部：剖面系统（如果可用）
        try:
            from gempy_section_system import SectionSystemWidget
            sections = SectionSystemWidget()
            sections.setStyleSheet(AbaqusStyleTheme.get_abaqus_stylesheet())
            content_area.addWidget(sections)
            content_area.setSizes([500, 300])
        except:
            pass
        
        work_area.addWidget(content_area)
        work_area.setSizes([300, 1100])
        
        main_layout.addWidget(work_area)
        
        # 创建状态栏
        self.create_abaqus_status_bar()
        
    def apply_abaqus_styling(self):
        """应用ABAQUS样式"""
        self.setStyleSheet(AbaqusStyleTheme.get_abaqus_stylesheet())
        
        # 应用窗口效果
        AbaqusEffectsSystem.apply_engineering_shadow(self)
        
    def create_abaqus_status_bar(self):
        """创建ABAQUS风格状态栏"""
        status_bar = self.statusBar()
        
        # 系统状态
        system_status = QLabel("System: Ready")
        system_status.setStyleSheet(f"""
            QLabel {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 rgba(16, 185, 129, 0.2),
                    stop:1 rgba(16, 185, 129, 0.1));
                border: 2px solid {AbaqusStyleTheme.ACCENT_GREEN};
                border-radius: 4px;
                padding: 6px 12px;
                font-weight: 700;
                color: {AbaqusStyleTheme.ACCENT_GREEN};
            }}
        """)
        status_bar.addWidget(system_status)
        
        # 模型状态
        model_status = QLabel("Model: Not Built")
        model_status.setStyleSheet(f"""
            QLabel {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 rgba(249, 115, 22, 0.2),
                    stop:1 rgba(249, 115, 22, 0.1));
                border: 2px solid {AbaqusStyleTheme.ACCENT_ORANGE};
                border-radius: 4px;
                padding: 6px 12px;
                font-weight: 700;
                color: {AbaqusStyleTheme.ACCENT_ORANGE};
            }}
        """)
        status_bar.addPermanentWidget(model_status)
        
        # 内存使用
        memory_status = QLabel("Memory: 245 MB")
        memory_status.setStyleSheet(f"""
            QLabel {{
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 rgba(59, 130, 246, 0.2),
                    stop:1 rgba(59, 130, 246, 0.1));
                border: 2px solid {AbaqusStyleTheme.PRIMARY_BLUE_LIGHT};
                border-radius: 4px;
                padding: 6px 12px;
                font-weight: 700;
                color: {AbaqusStyleTheme.PRIMARY_BLUE_LIGHT};
            }}
        """)
        status_bar.addPermanentWidget(memory_status)
        
    def showEvent(self, event):
        """窗口显示事件 - 添加启动动画"""
        super().showEvent(event)
        
        # 创建启动动画
        fade_animation = AbaqusAnimationSystem.create_fade_in_animation(self, 500)
        fade_animation.start()


def main():
    """主函数"""
    app = QApplication(sys.argv)
    app.setStyle('Fusion')  # 使用Fusion风格作为基础
    
    # 设置应用程序字体
    font = QFont("Segoe UI", 9, QFont.Weight.Normal)
    app.setFont(font)
    
    print("Starting GemPy ABAQUS Ultimate Professional Interface...")
    print("- ABAQUS CAE level visual design")
    print("- Ultimate engineering software aesthetics")
    print("- Professional animation and effects system")
    
    # 创建并显示终极界面
    window = GemPyAbaqusUltimate()
    window.show()
    
    print("ABAQUS Ultimate Interface launched!")
    print("Experience the ultimate in professional engineering software design!")
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()