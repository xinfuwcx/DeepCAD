"""
Professional GEM Interface - Modern CAE-style Design
Features large central 3D viewport with professional aesthetics
"""

import sys
import os
import numpy as np
import pandas as pd
from pathlib import Path

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QSplitter, QTabWidget, QTextEdit, QToolBar, QMenuBar, QStatusBar, 
    QDockWidget, QGroupBox, QFormLayout, QLabel, QLineEdit, QPushButton, 
    QComboBox, QSpinBox, QDoubleSpinBox, QCheckBox, QProgressBar, 
    QFileDialog, QMessageBox, QTreeWidget, QTreeWidgetItem, QTableWidget,
    QTableWidgetItem, QHeaderView, QSlider, QFrame, QScrollArea,
    QGridLayout, QButtonGroup, QRadioButton
)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QThread, QPropertyAnimation, QEasingCurve
from PyQt6.QtGui import QAction, QFont, QPalette, QColor, QPixmap, QPainter, QIcon

# Try to import 3D visualization
try:
    import pyvista as pv
    import pyvistaqt as pvqt
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

class ModernCAEStyle:
    """Modern CAE software styling constants"""
    
    # Color palette - Professional CAE colors
    DARK_BG = "#2B2B2B"          # Dark background
    PANEL_BG = "#383838"         # Panel background
    WIDGET_BG = "#404040"        # Widget background
    ACCENT_BLUE = "#0084FF"      # Accent blue
    SUCCESS_GREEN = "#00C851"    # Success green
    WARNING_ORANGE = "#FF8800"   # Warning orange
    ERROR_RED = "#FF4444"        # Error red
    TEXT_PRIMARY = "#FFFFFF"     # Primary text
    TEXT_SECONDARY = "#CCCCCC"   # Secondary text
    TEXT_DISABLED = "#888888"    # Disabled text
    BORDER_COLOR = "#555555"     # Border color
    HIGHLIGHT_COLOR = "#4A90E2"  # Highlight color
    
    # Fonts
    FONT_FAMILY = "Segoe UI"
    FONT_SIZE_NORMAL = 9
    FONT_SIZE_SMALL = 8
    FONT_SIZE_LARGE = 11
    FONT_SIZE_TITLE = 14
    
    @staticmethod
    def apply_dark_theme(app):
        """Apply dark theme to application"""
        palette = QPalette()
        
        # Window colors
        palette.setColor(QPalette.ColorRole.Window, QColor(ModernCAEStyle.DARK_BG))
        palette.setColor(QPalette.ColorRole.WindowText, QColor(ModernCAEStyle.TEXT_PRIMARY))
        
        # Base colors (for input widgets)
        palette.setColor(QPalette.ColorRole.Base, QColor(ModernCAEStyle.WIDGET_BG))
        palette.setColor(QPalette.ColorRole.AlternateBase, QColor(ModernCAEStyle.PANEL_BG))
        
        # Text colors
        palette.setColor(QPalette.ColorRole.Text, QColor(ModernCAEStyle.TEXT_PRIMARY))
        palette.setColor(QPalette.ColorRole.BrightText, QColor(ModernCAEStyle.TEXT_PRIMARY))
        
        # Button colors
        palette.setColor(QPalette.ColorRole.Button, QColor(ModernCAEStyle.PANEL_BG))
        palette.setColor(QPalette.ColorRole.ButtonText, QColor(ModernCAEStyle.TEXT_PRIMARY))
        
        # Highlight colors
        palette.setColor(QPalette.ColorRole.Highlight, QColor(ModernCAEStyle.ACCENT_BLUE))
        palette.setColor(QPalette.ColorRole.HighlightedText, QColor(ModernCAEStyle.TEXT_PRIMARY))
        
        app.setPalette(palette)
    
    @staticmethod
    def get_stylesheet():
        """Get comprehensive stylesheet for modern CAE interface"""
        return f"""
        QMainWindow {{
            background-color: {ModernCAEStyle.DARK_BG};
            color: {ModernCAEStyle.TEXT_PRIMARY};
            font-family: {ModernCAEStyle.FONT_FAMILY};
            font-size: {ModernCAEStyle.FONT_SIZE_NORMAL}pt;
        }}
        
        QMenuBar {{
            background-color: {ModernCAEStyle.PANEL_BG};
            color: {ModernCAEStyle.TEXT_PRIMARY};
            border-bottom: 1px solid {ModernCAEStyle.BORDER_COLOR};
            padding: 2px;
        }}
        
        QMenuBar::item {{
            background-color: transparent;
            padding: 4px 8px;
            margin: 0px;
        }}
        
        QMenuBar::item:selected {{
            background-color: {ModernCAEStyle.ACCENT_BLUE};
        }}
        
        QToolBar {{
            background-color: {ModernCAEStyle.PANEL_BG};
            border: 1px solid {ModernCAEStyle.BORDER_COLOR};
            spacing: 3px;
            padding: 3px;
        }}
        
        QTabWidget::pane {{
            border: 1px solid {ModernCAEStyle.BORDER_COLOR};
            background-color: {ModernCAEStyle.WIDGET_BG};
        }}
        
        QTabBar::tab {{
            background-color: {ModernCAEStyle.PANEL_BG};
            color: {ModernCAEStyle.TEXT_SECONDARY};
            padding: 8px 16px;
            margin-right: 2px;
            border: 1px solid {ModernCAEStyle.BORDER_COLOR};
        }}
        
        QTabBar::tab:selected {{
            background-color: {ModernCAEStyle.ACCENT_BLUE};
            color: {ModernCAEStyle.TEXT_PRIMARY};
        }}
        
        QPushButton {{
            background-color: {ModernCAEStyle.PANEL_BG};
            color: {ModernCAEStyle.TEXT_PRIMARY};
            border: 1px solid {ModernCAEStyle.BORDER_COLOR};
            padding: 6px 12px;
            border-radius: 3px;
            font-weight: bold;
        }}
        
        QPushButton:hover {{
            background-color: {ModernCAEStyle.HIGHLIGHT_COLOR};
        }}
        
        QPushButton:pressed {{
            background-color: {ModernCAEStyle.ACCENT_BLUE};
        }}
        
        QPushButton:disabled {{
            background-color: {ModernCAEStyle.WIDGET_BG};
            color: {ModernCAEStyle.TEXT_DISABLED};
        }}
        
        QLineEdit, QSpinBox, QDoubleSpinBox, QComboBox {{
            background-color: {ModernCAEStyle.WIDGET_BG};
            color: {ModernCAEStyle.TEXT_PRIMARY};
            border: 1px solid {ModernCAEStyle.BORDER_COLOR};
            padding: 4px;
            border-radius: 2px;
        }}
        
        QLineEdit:focus, QSpinBox:focus, QDoubleSpinBox:focus, QComboBox:focus {{
            border: 2px solid {ModernCAEStyle.ACCENT_BLUE};
        }}
        
        QGroupBox {{
            color: {ModernCAEStyle.TEXT_PRIMARY};
            border: 1px solid {ModernCAEStyle.BORDER_COLOR};
            border-radius: 3px;
            padding-top: 16px;
            margin-top: 8px;
            font-weight: bold;
        }}
        
        QGroupBox::title {{
            subcontrol-origin: margin;
            left: 8px;
            padding: 0 4px 0 4px;
        }}
        
        QTreeWidget, QTableWidget {{
            background-color: {ModernCAEStyle.WIDGET_BG};
            color: {ModernCAEStyle.TEXT_PRIMARY};
            border: 1px solid {ModernCAEStyle.BORDER_COLOR};
            selection-background-color: {ModernCAEStyle.ACCENT_BLUE};
        }}
        
        QTextEdit {{
            background-color: {ModernCAEStyle.WIDGET_BG};
            color: {ModernCAEStyle.TEXT_PRIMARY};
            border: 1px solid {ModernCAEStyle.BORDER_COLOR};
            selection-background-color: {ModernCAEStyle.ACCENT_BLUE};
        }}
        
        QProgressBar {{
            border: 1px solid {ModernCAEStyle.BORDER_COLOR};
            border-radius: 3px;
            background-color: {ModernCAEStyle.WIDGET_BG};
            text-align: center;
        }}
        
        QProgressBar::chunk {{
            background-color: {ModernCAEStyle.ACCENT_BLUE};
            border-radius: 2px;
        }}
        
        QStatusBar {{
            background-color: {ModernCAEStyle.PANEL_BG};
            border-top: 1px solid {ModernCAEStyle.BORDER_COLOR};
            color: {ModernCAEStyle.TEXT_PRIMARY};
        }}
        
        QCheckBox {{
            color: {ModernCAEStyle.TEXT_PRIMARY};
        }}
        
        QCheckBox::indicator:checked {{
            background-color: {ModernCAEStyle.ACCENT_BLUE};
            border: 1px solid {ModernCAEStyle.ACCENT_BLUE};
        }}
        
        QRadioButton {{
            color: {ModernCAEStyle.TEXT_PRIMARY};
        }}
        
        QRadioButton::indicator:checked {{
            background-color: {ModernCAEStyle.ACCENT_BLUE};
        }}
        
        QSlider::groove:horizontal {{
            border: 1px solid {ModernCAEStyle.BORDER_COLOR};
            height: 4px;
            background: {ModernCAEStyle.WIDGET_BG};
        }}
        
        QSlider::handle:horizontal {{
            background: {ModernCAEStyle.ACCENT_BLUE};
            border: 1px solid {ModernCAEStyle.ACCENT_BLUE};
            width: 18px;
            margin: -8px 0;
            border-radius: 9px;
        }}
        
        QSplitter::handle {{
            background-color: {ModernCAEStyle.BORDER_COLOR};
        }}
        
        QSplitter::handle:horizontal {{
            width: 3px;
        }}
        
        QSplitter::handle:vertical {{
            height: 3px;
        }}
        """

class ParameterManager:
    """Manages parameter synchronization between modules"""
    
    def __init__(self):
        self.parameters = {
            'model_extent': [0, 1000, 0, 1000, 0, 500],
            'model_resolution': [50, 50, 25],
            'interpolation_method': 'Linear',
            'analysis_samples': 1000,
            'sampling_method': 'Monte Carlo',
            'current_module': 'data_management',
            'project_data': {
                'boreholes': None,
                'geological_model': None,
                'analysis_results': {}
            }
        }
        self.listeners = []
    
    def add_listener(self, callback):
        """Add parameter change listener"""
        self.listeners.append(callback)
    
    def set_parameter(self, key, value):
        """Set parameter and notify listeners"""
        if self.parameters.get(key) != value:
            self.parameters[key] = value
            for callback in self.listeners:
                callback(key, value)
    
    def get_parameter(self, key, default=None):
        """Get parameter value"""
        return self.parameters.get(key, default)
    
    def update_parameters(self, params_dict):
        """Update multiple parameters"""
        for key, value in params_dict.items():
            self.set_parameter(key, value)

class Professional3DViewport(QWidget):
    """Professional 3D viewport with modern styling"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumSize(800, 600)
        self.init_3d_viewport()
    
    def init_3d_viewport(self):
        """Initialize 3D viewport"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # Viewport toolbar
        toolbar_layout = QHBoxLayout()
        
        # View controls
        self.view_combo = QComboBox()
        self.view_combo.addItems(['Perspective', 'Front', 'Top', 'Right', 'Isometric'])
        toolbar_layout.addWidget(QLabel('View:'))
        toolbar_layout.addWidget(self.view_combo)
        
        # Display options
        self.wireframe_check = QCheckBox('Wireframe')
        self.axes_check = QCheckBox('Axes')
        self.axes_check.setChecked(True)
        toolbar_layout.addWidget(self.wireframe_check)
        toolbar_layout.addWidget(self.axes_check)
        
        toolbar_layout.addStretch()
        
        # Reset view button
        reset_btn = QPushButton('Reset View')
        reset_btn.clicked.connect(self.reset_view)
        toolbar_layout.addWidget(reset_btn)
        
        toolbar_widget = QWidget()
        toolbar_widget.setLayout(toolbar_layout)
        toolbar_widget.setMaximumHeight(35)
        layout.addWidget(toolbar_widget)
        
        # 3D Viewport
        if PYVISTA_AVAILABLE:
            try:
                self.plotter = pvqt.QtInteractor(self)
                self.plotter.set_background([0.15, 0.15, 0.15])  # Dark background
                layout.addWidget(self.plotter)
                
                # Add default content
                self.setup_default_scene()
                
                # Connect controls
                self.view_combo.currentTextChanged.connect(self.change_view)
                self.wireframe_check.toggled.connect(self.toggle_wireframe)
                self.axes_check.toggled.connect(self.toggle_axes)
                
            except Exception as e:
                error_widget = QWidget()
                error_layout = QVBoxLayout(error_widget)
                error_label = QLabel(f"3D Viewport Error: {str(e)}")
                error_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
                error_label.setStyleSheet(f"color: {ModernCAEStyle.ERROR_RED}; font-size: 14pt;")
                error_layout.addWidget(error_label)
                layout.addWidget(error_widget)
        else:
            # Fallback widget
            fallback_widget = QWidget()
            fallback_layout = QVBoxLayout(fallback_widget)
            fallback_label = QLabel("3D Viewport Not Available\\n(PyVista not installed)")
            fallback_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            fallback_label.setStyleSheet(f"color: {ModernCAEStyle.TEXT_SECONDARY}; font-size: 16pt;")
            fallback_layout.addWidget(fallback_label)
            layout.addWidget(fallback_widget)
    
    def setup_default_scene(self):
        """Setup default 3D scene"""
        if hasattr(self, 'plotter'):
            # Add coordinate axes
            self.plotter.add_axes(interactive=True, line_width=3, x_color='red', y_color='green', z_color='blue')
            
            # Add sample geological data
            self.add_sample_data()
    
    def add_sample_data(self):
        """Add sample geological data to viewport"""
        if not hasattr(self, 'plotter'):
            return
            
        try:
            # Sample borehole points
            points = np.random.rand(15, 3) * [1000, 1000, 100]
            point_cloud = pv.PolyData(points)
            
            self.plotter.add_mesh(
                point_cloud,
                color='#FF6B6B',  # Modern red
                point_size=12,
                render_points_as_spheres=True,
                label='Boreholes'
            )
            
            # Sample geological surface
            x = np.linspace(0, 1000, 30)
            y = np.linspace(0, 1000, 30)
            X, Y = np.meshgrid(x, y)
            Z = 50 + 15 * np.sin(X/150) * np.cos(Y/200) + 5 * np.random.rand(*X.shape)
            
            surface = pv.StructuredGrid(X, Y, Z)
            self.plotter.add_mesh(
                surface,
                opacity=0.8,
                color='#4ECDC4',  # Modern teal
                label='Geological Surface',
                smooth_shading=True
            )
            
            # Add some fault planes
            fault_points = np.array([
                [200, 0, 0], [200, 1000, 0], [200, 1000, 100], [200, 0, 100]
            ])
            fault = pv.PolyData(fault_points, faces=[4, 0, 1, 2, 3])
            
            self.plotter.add_mesh(
                fault,
                opacity=0.7,
                color='#FFE66D',  # Modern yellow
                label='Fault Plane'
            )
            
            self.plotter.reset_camera()
            
        except Exception as e:
            print(f"Failed to add sample data: {e}")
    
    def change_view(self, view_name):
        """Change viewport view"""
        if not hasattr(self, 'plotter'):
            return
            
        if view_name == 'Front':
            self.plotter.view_yz()
        elif view_name == 'Top':
            self.plotter.view_xy()
        elif view_name == 'Right':
            self.plotter.view_xz()
        elif view_name == 'Isometric':
            self.plotter.view_isometric()
        else:  # Perspective
            self.plotter.reset_camera()
    
    def toggle_wireframe(self, enabled):
        """Toggle wireframe display"""
        # Implementation would toggle wireframe for all meshes
        pass
    
    def toggle_axes(self, enabled):
        """Toggle axes display"""
        if hasattr(self, 'plotter'):
            if enabled:
                self.plotter.add_axes()
            else:
                # Remove axes (would need reference to axes actor)
                pass
    
    def reset_view(self):
        """Reset viewport to default view"""
        if hasattr(self, 'plotter'):
            self.plotter.reset_camera()

class ModuleControlPanel(QWidget):
    """Dynamic control panel that updates based on current module"""
    
    module_changed = pyqtSignal(str)
    
    def __init__(self, parameter_manager, parent=None):
        super().__init__(parent)
        self.param_manager = parameter_manager
        self.current_module = 'data_management'
        self.init_ui()
        
        # Listen to parameter changes
        self.param_manager.add_listener(self.on_parameter_changed)
    
    def init_ui(self):
        """Initialize control panel UI"""
        layout = QVBoxLayout(self)
        layout.setSpacing(8)
        
        # Module selector
        module_group = QGroupBox("Active Module")
        module_layout = QVBoxLayout(module_group)
        
        self.module_buttons = QButtonGroup(self)
        modules = [
            ('data_management', 'Data Management'),
            ('geological_modeling', 'Geological Modeling'),  
            ('fault_analysis', 'Fault Analysis'),
            ('geophysical_modeling', 'Geophysical Modeling'),
            ('uncertainty_analysis', 'Uncertainty Analysis')
        ]
        
        for module_id, module_name in modules:
            btn = QRadioButton(module_name)
            btn.setProperty('module_id', module_id)
            btn.toggled.connect(lambda checked, mid=module_id: self.switch_module(mid) if checked else None)
            self.module_buttons.addButton(btn)
            module_layout.addWidget(btn)
        
        # Set default selection
        self.module_buttons.buttons()[0].setChecked(True)
        
        layout.addWidget(module_group)
        
        # Dynamic parameters area
        self.params_scroll = QScrollArea()
        self.params_scroll.setWidgetResizable(True)
        self.params_scroll.setMinimumHeight(400)
        
        self.params_widget = QWidget()
        self.params_layout = QVBoxLayout(self.params_widget)
        self.params_scroll.setWidget(self.params_widget)
        
        layout.addWidget(self.params_scroll)
        
        # Action buttons
        self.action_group = QGroupBox("Actions")
        self.action_layout = QVBoxLayout(self.action_group)
        layout.addWidget(self.action_group)
        
        # Initialize with default module
        self.update_module_controls('data_management')
    
    def switch_module(self, module_id):
        """Switch to different module"""
        if module_id != self.current_module:
            self.current_module = module_id
            self.param_manager.set_parameter('current_module', module_id)
            self.update_module_controls(module_id)
            self.module_changed.emit(module_id)
    
    def update_module_controls(self, module_id):
        """Update control panel based on module"""
        # Clear existing parameters
        for i in reversed(range(self.params_layout.count())):
            child = self.params_layout.itemAt(i).widget()
            if child:
                child.deleteLater()
        
        # Clear action buttons
        for i in reversed(range(self.action_layout.count())):
            child = self.action_layout.itemAt(i).widget()
            if child:
                child.deleteLater()
        
        # Add module-specific controls
        if module_id == 'data_management':
            self.create_data_management_controls()
        elif module_id == 'geological_modeling':
            self.create_modeling_controls()
        elif module_id == 'fault_analysis':
            self.create_fault_analysis_controls()
        elif module_id == 'geophysical_modeling':
            self.create_geophysics_controls()
        elif module_id == 'uncertainty_analysis':
            self.create_uncertainty_controls()
    
    def create_data_management_controls(self):
        """Create data management controls"""
        # Data import parameters
        import_group = QGroupBox("Import Settings")
        import_layout = QFormLayout(import_group)
        
        self.file_format = QComboBox()
        self.file_format.addItems(['Auto-detect', 'CSV', 'Excel', 'Shapefile'])
        import_layout.addRow("File Format:", self.file_format)
        
        self.coordinate_system = QComboBox()
        self.coordinate_system.addItems(['Auto-detect', 'WGS84', 'UTM', 'Local'])
        import_layout.addRow("Coordinate System:", self.coordinate_system)
        
        self.params_layout.addWidget(import_group)
        
        # Data quality parameters
        quality_group = QGroupBox("Data Quality")
        quality_layout = QFormLayout(quality_group)
        
        self.min_data_points = QSpinBox()
        self.min_data_points.setRange(10, 10000)
        self.min_data_points.setValue(50)
        quality_layout.addRow("Min Data Points:", self.min_data_points)
        
        self.max_distance = QDoubleSpinBox()
        self.max_distance.setRange(1.0, 1000.0)
        self.max_distance.setValue(100.0)
        self.max_distance.setSuffix(" m")
        quality_layout.addRow("Max Distance:", self.max_distance)
        
        self.params_layout.addWidget(quality_group)
        
        # Action buttons
        import_btn = QPushButton("Import Borehole Data")
        import_btn.setMinimumHeight(35)
        import_btn.clicked.connect(self.import_boreholes)
        self.action_layout.addWidget(import_btn)
        
        validate_btn = QPushButton("Validate Data")
        validate_btn.setMinimumHeight(35)
        self.action_layout.addWidget(validate_btn)
    
    def create_modeling_controls(self):
        """Create geological modeling controls"""
        # Model extent
        extent_group = QGroupBox("Model Extent")
        extent_layout = QFormLayout(extent_group)
        
        self.x_min = QDoubleSpinBox()
        self.x_min.setRange(-10000, 10000)
        extent_layout.addRow("X Min:", self.x_min)
        
        self.x_max = QDoubleSpinBox()
        self.x_max.setRange(-10000, 10000)
        self.x_max.setValue(1000)
        extent_layout.addRow("X Max:", self.x_max)
        
        self.y_min = QDoubleSpinBox()
        self.y_min.setRange(-10000, 10000)
        extent_layout.addRow("Y Min:", self.y_min)
        
        self.y_max = QDoubleSpinBox()
        self.y_max.setRange(-10000, 10000)
        self.y_max.setValue(1000)
        extent_layout.addRow("Y Max:", self.y_max)
        
        self.z_min = QDoubleSpinBox()
        self.z_min.setRange(-1000, 1000)
        extent_layout.addRow("Z Min:", self.z_min)
        
        self.z_max = QDoubleSpinBox()
        self.z_max.setRange(-1000, 1000)
        self.z_max.setValue(500)
        extent_layout.addRow("Z Max:", self.z_max)
        
        self.params_layout.addWidget(extent_group)
        
        # Model resolution
        resolution_group = QGroupBox("Model Resolution")
        resolution_layout = QFormLayout(resolution_group)
        
        self.nx = QSpinBox()
        self.nx.setRange(10, 200)
        self.nx.setValue(50)
        resolution_layout.addRow("X Resolution:", self.nx)
        
        self.ny = QSpinBox()
        self.ny.setRange(10, 200)
        self.ny.setValue(50)
        resolution_layout.addRow("Y Resolution:", self.ny)
        
        self.nz = QSpinBox()
        self.nz.setRange(10, 100)
        self.nz.setValue(25)
        resolution_layout.addRow("Z Resolution:", self.nz)
        
        self.params_layout.addWidget(resolution_group)
        
        # Interpolation method
        method_group = QGroupBox("Interpolation Method")
        method_layout = QFormLayout(method_group)
        
        self.interp_method = QComboBox()
        self.interp_method.addItems(['Linear', 'Cubic', 'RBF', 'Kriging'])
        method_layout.addRow("Method:", self.interp_method)
        
        self.params_layout.addWidget(method_group)
        
        # Action buttons
        build_btn = QPushButton("Build Geological Model")
        build_btn.setMinimumHeight(35)
        build_btn.clicked.connect(self.build_model)
        self.action_layout.addWidget(build_btn)
        
        preview_btn = QPushButton("Preview Model")
        preview_btn.setMinimumHeight(35)
        self.action_layout.addWidget(preview_btn)
    
    def create_fault_analysis_controls(self):
        """Create fault analysis controls"""
        # Fault parameters
        fault_group = QGroupBox("Fault Parameters")
        fault_layout = QFormLayout(fault_group)
        
        self.friction_angle = QDoubleSpinBox()
        self.friction_angle.setRange(0, 90)
        self.friction_angle.setValue(30)
        self.friction_angle.setSuffix("°")
        fault_layout.addRow("Friction Angle:", self.friction_angle)
        
        self.cohesion = QDoubleSpinBox()
        self.cohesion.setRange(0, 1000)
        self.cohesion.setValue(100)
        self.cohesion.setSuffix(" kPa")
        fault_layout.addRow("Cohesion:", self.cohesion)
        
        self.params_layout.addWidget(fault_group)
        
        # Analysis options
        analysis_group = QGroupBox("Analysis Options")
        analysis_layout = QVBoxLayout(analysis_group)
        
        self.stability_check = QCheckBox("Stability Analysis")
        self.stability_check.setChecked(True)
        analysis_layout.addWidget(self.stability_check)
        
        self.stress_check = QCheckBox("Stress Analysis")
        analysis_layout.addWidget(self.stress_check)
        
        self.params_layout.addWidget(analysis_group)
        
        # Action buttons
        analyze_btn = QPushButton("Analyze Faults")
        analyze_btn.setMinimumHeight(35)
        self.action_layout.addWidget(analyze_btn)
    
    def create_geophysics_controls(self):
        """Create geophysical modeling controls"""
        # Method selection
        method_group = QGroupBox("Geophysical Methods")
        method_layout = QVBoxLayout(method_group)
        
        self.gravity_check = QCheckBox("Gravity Modeling")
        method_layout.addWidget(self.gravity_check)
        
        self.magnetic_check = QCheckBox("Magnetic Modeling")
        method_layout.addWidget(self.magnetic_check)
        
        self.params_layout.addWidget(method_group)
        
        # Parameters
        params_group = QGroupBox("Model Parameters")
        params_layout = QFormLayout(params_group)
        
        self.observation_height = QDoubleSpinBox()
        self.observation_height.setRange(0, 1000)
        self.observation_height.setValue(2)
        self.observation_height.setSuffix(" m")
        params_layout.addRow("Observation Height:", self.observation_height)
        
        self.params_layout.addWidget(params_group)
        
        # Action buttons
        calculate_btn = QPushButton("Calculate Fields")
        calculate_btn.setMinimumHeight(35)
        self.action_layout.addWidget(calculate_btn)
    
    def create_uncertainty_controls(self):
        """Create uncertainty analysis controls"""
        # Sampling parameters
        sampling_group = QGroupBox("Sampling Parameters")
        sampling_layout = QFormLayout(sampling_group)
        
        self.n_samples = QSpinBox()
        self.n_samples.setRange(100, 100000)
        self.n_samples.setValue(1000)
        sampling_layout.addRow("Number of Samples:", self.n_samples)
        
        self.sampling_method = QComboBox()
        self.sampling_method.addItems(['Monte Carlo', 'Latin Hypercube', 'Sobol'])
        sampling_layout.addRow("Sampling Method:", self.sampling_method)
        
        self.params_layout.addWidget(sampling_group)
        
        # Analysis types
        analysis_group = QGroupBox("Analysis Types")
        analysis_layout = QVBoxLayout(analysis_group)
        
        self.sensitivity_check = QCheckBox("Sensitivity Analysis")
        analysis_layout.addWidget(self.sensitivity_check)
        
        self.correlation_check = QCheckBox("Correlation Analysis")
        analysis_layout.addWidget(self.correlation_check)
        
        self.params_layout.addWidget(analysis_group)
        
        # Action buttons
        run_btn = QPushButton("Run Uncertainty Analysis")
        run_btn.setMinimumHeight(35)
        self.action_layout.addWidget(run_btn)
    
    def on_parameter_changed(self, key, value):
        """Handle parameter changes"""
        # Update controls when parameters change
        if key == 'model_extent' and hasattr(self, 'x_min'):
            self.x_min.setValue(value[0])
            self.x_max.setValue(value[1])
            self.y_min.setValue(value[2])
            self.y_max.setValue(value[3])
            self.z_min.setValue(value[4])
            self.z_max.setValue(value[5])
    
    def import_boreholes(self):
        """Import borehole data"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Import Borehole Data", "", 
            "CSV Files (*.csv);;Excel Files (*.xlsx);;All Files (*)"
        )
        if file_path:
            print(f"Importing borehole data from: {file_path}")
            # Actual import logic would go here
    
    def build_model(self):
        """Build geological model"""
        # Update parameters from UI
        extent = [
            self.x_min.value(), self.x_max.value(),
            self.y_min.value(), self.y_max.value(), 
            self.z_min.value(), self.z_max.value()
        ]
        resolution = [self.nx.value(), self.ny.value(), self.nz.value()]
        
        self.param_manager.update_parameters({
            'model_extent': extent,
            'model_resolution': resolution,
            'interpolation_method': self.interp_method.currentText()
        })
        
        print("Building geological model with updated parameters")

class ProfessionalGEMInterface(QMainWindow):
    """Professional GEM Interface with modern CAE styling"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GEM Comprehensive Modeling System - Professional Edition")
        self.setGeometry(50, 50, 1600, 1000)
        
        # Initialize parameter manager
        self.param_manager = ParameterManager()
        
        # Initialize interface
        self.init_ui()
        self.create_menu_system()
        self.create_status_system()
        
        # Log startup
        self.log_message("Professional GEM interface initialized", "SUCCESS")
        print("Professional GEM Comprehensive Modeling System v3.0 Started!")
        print("Features: Large 3D viewport, parameter synchronization, modern UI")
    
    def init_ui(self):
        """Initialize the professional user interface"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Main layout
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(8, 8, 8, 8)
        main_layout.setSpacing(8)
        
        # Create main splitter
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(main_splitter)
        
        # Left panel - Module controls (resizable)
        self.control_panel = ModuleControlPanel(self.param_manager)
        self.control_panel.setMinimumWidth(300)
        self.control_panel.setMaximumWidth(450)
        self.control_panel.module_changed.connect(self.on_module_changed)
        main_splitter.addWidget(self.control_panel)
        
        # Central area - Large 3D viewport
        self.viewport_3d = Professional3DViewport()
        main_splitter.addWidget(self.viewport_3d)
        
        # Right panel - Project browser and properties
        self.create_right_panel(main_splitter)
        
        # Set splitter proportions - Large central viewport
        main_splitter.setSizes([350, 1000, 250])
    
    def create_right_panel(self, splitter):
        """Create right panel with project browser and properties"""
        right_widget = QWidget()
        right_layout = QVBoxLayout(right_widget)
        right_layout.setSpacing(8)
        
        # Project browser
        project_group = QGroupBox("Project Browser")
        project_layout = QVBoxLayout(project_group)
        
        self.project_tree = QTreeWidget()
        self.project_tree.setHeaderLabels(['Project Structure'])
        self.setup_project_tree()
        project_layout.addWidget(self.project_tree)
        
        # Quick project actions
        project_actions = QHBoxLayout()
        new_btn = QPushButton("New")
        new_btn.clicked.connect(self.new_project)
        save_btn = QPushButton("Save")
        save_btn.clicked.connect(self.save_project)
        project_actions.addWidget(new_btn)
        project_actions.addWidget(save_btn)
        project_layout.addLayout(project_actions)
        
        right_layout.addWidget(project_group)
        
        # Properties panel
        properties_group = QGroupBox("Properties")
        properties_layout = QVBoxLayout(properties_group)
        
        self.properties_text = QTextEdit()
        self.properties_text.setMaximumHeight(150)
        self.properties_text.setPlainText("Select an object to view properties")
        properties_layout.addWidget(self.properties_text)
        
        right_layout.addWidget(properties_group)
        
        # Log panel
        log_group = QGroupBox("System Log")
        log_layout = QVBoxLayout(log_group)
        
        self.log_text = QTextEdit()
        self.log_text.setMaximumHeight(200)
        log_layout.addWidget(self.log_text)
        
        right_layout.addWidget(log_group)
        
        splitter.addWidget(right_widget)
    
    def setup_project_tree(self):
        """Setup project tree structure"""
        # Data items
        data_item = QTreeWidgetItem(self.project_tree, ["Data"])
        QTreeWidgetItem(data_item, ["Boreholes (0)"])
        QTreeWidgetItem(data_item, ["Strata (0)"])
        QTreeWidgetItem(data_item, ["Faults (0)"])
        
        # Models
        model_item = QTreeWidgetItem(self.project_tree, ["Models"])
        QTreeWidgetItem(model_item, ["Geological Model"])
        QTreeWidgetItem(model_item, ["Fault Network"])
        
        # Analysis
        analysis_item = QTreeWidgetItem(self.project_tree, ["Analysis"])
        QTreeWidgetItem(analysis_item, ["Geophysical Results"])
        QTreeWidgetItem(analysis_item, ["Uncertainty Results"])
        
        self.project_tree.expandAll()
    
    def create_menu_system(self):
        """Create professional menu system"""
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu('File')
        file_menu.addAction('New Project', self.new_project)
        file_menu.addAction('Open Project', self.open_project)
        file_menu.addAction('Save Project', self.save_project)
        file_menu.addAction('Save As...', self.save_project_as)
        file_menu.addSeparator()
        file_menu.addAction('Import Data...', self.import_data)
        file_menu.addAction('Export Results...', self.export_results)
        file_menu.addSeparator()
        file_menu.addAction('Exit', self.close)
        
        # View menu
        view_menu = menubar.addMenu('View')
        view_menu.addAction('Reset 3D View', self.reset_3d_view)
        view_menu.addAction('Fit All', self.fit_all)
        view_menu.addSeparator()
        view_menu.addAction('Show/Hide Control Panel', self.toggle_control_panel)
        view_menu.addAction('Show/Hide Properties', self.toggle_properties)
        
        # Analysis menu
        analysis_menu = menubar.addMenu('Analysis')
        analysis_menu.addAction('Build Geological Model', self.build_geological_model)
        analysis_menu.addAction('Fault Analysis', self.analyze_faults)
        analysis_menu.addAction('Geophysical Modeling', self.run_geophysics)
        analysis_menu.addAction('Uncertainty Analysis', self.run_uncertainty)
        
        # Tools menu
        tools_menu = menubar.addMenu('Tools')
        tools_menu.addAction('Data Validation', self.validate_data)
        tools_menu.addAction('Parameter Optimization', self.optimize_parameters)
        tools_menu.addAction('Batch Processing', self.batch_process)
        
        # Help menu
        help_menu = menubar.addMenu('Help')
        help_menu.addAction('User Guide', self.show_help)
        help_menu.addAction('About', self.show_about)
    
    def create_status_system(self):
        """Create professional status bar"""
        status_bar = self.statusBar()
        
        # Status label
        self.status_label = QLabel("Ready")
        status_bar.addWidget(self.status_label)
        
        # Progress bar
        self.progress_bar = QProgressBar()
        self.progress_bar.setMaximumWidth(200)
        self.progress_bar.setVisible(False)
        status_bar.addPermanentWidget(self.progress_bar)
        
        # Module indicator
        self.module_label = QLabel("Data Management")
        self.module_label.setStyleSheet(f"color: {ModernCAEStyle.ACCENT_BLUE}; font-weight: bold;")
        status_bar.addPermanentWidget(self.module_label)
    
    def on_module_changed(self, module_id):
        """Handle module change"""
        module_names = {
            'data_management': 'Data Management',
            'geological_modeling': 'Geological Modeling',
            'fault_analysis': 'Fault Analysis',
            'geophysical_modeling': 'Geophysical Modeling',
            'uncertainty_analysis': 'Uncertainty Analysis'
        }
        
        module_name = module_names.get(module_id, module_id)
        self.module_label.setText(module_name)
        self.log_message(f"Switched to {module_name} module", "INFO")
    
    def log_message(self, message, level="INFO"):
        """Log message with timestamp"""
        import datetime
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        
        # Color coding for different levels
        colors = {
            "INFO": ModernCAEStyle.TEXT_PRIMARY,
            "SUCCESS": ModernCAEStyle.SUCCESS_GREEN,
            "WARNING": ModernCAEStyle.WARNING_ORANGE,
            "ERROR": ModernCAEStyle.ERROR_RED
        }
        
        color = colors.get(level, ModernCAEStyle.TEXT_PRIMARY)
        formatted_message = f'<span style="color: {color};">[{timestamp}] {level}: {message}</span>'
        
        if hasattr(self, 'log_text'):
            self.log_text.append(formatted_message)
    
    # Menu action implementations
    def new_project(self):
        self.log_message("Created new project", "SUCCESS")
    
    def open_project(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Open Project", "", "GEM Projects (*.gem)")
        if file_path:
            self.log_message(f"Opened project: {file_path}", "SUCCESS")
    
    def save_project(self):
        self.log_message("Project saved", "SUCCESS")
    
    def save_project_as(self):
        file_path, _ = QFileDialog.getSaveFileName(self, "Save Project As", "", "GEM Projects (*.gem)")
        if file_path:
            self.log_message(f"Project saved as: {file_path}", "SUCCESS")
    
    def import_data(self):
        self.control_panel.switch_module('data_management')
    
    def export_results(self):
        self.log_message("Results exported", "SUCCESS")
    
    def reset_3d_view(self):
        if hasattr(self.viewport_3d, 'plotter'):
            self.viewport_3d.reset_view()
    
    def fit_all(self):
        self.reset_3d_view()
    
    def toggle_control_panel(self):
        self.control_panel.setVisible(not self.control_panel.isVisible())
    
    def toggle_properties(self):
        # Would toggle right panel visibility
        pass
    
    def build_geological_model(self):
        self.control_panel.switch_module('geological_modeling')
    
    def analyze_faults(self):
        self.control_panel.switch_module('fault_analysis')
    
    def run_geophysics(self):
        self.control_panel.switch_module('geophysical_modeling')
    
    def run_uncertainty(self):
        self.control_panel.switch_module('uncertainty_analysis')
    
    def validate_data(self):
        self.log_message("Data validation started", "INFO")
    
    def optimize_parameters(self):
        self.log_message("Parameter optimization started", "INFO")
    
    def batch_process(self):
        self.log_message("Batch processing started", "INFO")
    
    def show_help(self):
        QMessageBox.information(self, "Help", "GEM Professional User Guide\\n\\nThis is a professional geological modeling system with:\\n• Large central 3D viewport\\n• Dynamic parameter synchronization\\n• Modern CAE-style interface")
    
    def show_about(self):
        QMessageBox.about(self, "About GEM Professional", 
            "GEM Comprehensive Modeling System\\nProfessional Edition v3.0\\n\\n"
            "Features:\\n"
            "• Modern CAE-style interface\\n"
            "• Large central 3D viewport\\n"
            "• Parameter synchronization\\n"
            "• Professional styling\\n\\n"
            "© 2024 DeepCAD Team")

def main():
    """Main application function"""
    app = QApplication(sys.argv)
    
    # Set application info
    app.setApplicationName("GEM Professional Modeling System")
    app.setApplicationVersion("3.0.0")
    app.setOrganizationName("DeepCAD")
    
    # Apply modern dark theme
    ModernCAEStyle.apply_dark_theme(app)
    app.setStyleSheet(ModernCAEStyle.get_stylesheet())
    
    # Create and show main window
    window = ProfessionalGEMInterface()
    window.show()
    
    return app.exec()

if __name__ == "__main__":
    sys.exit(main())