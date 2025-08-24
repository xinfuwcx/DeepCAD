"""
Abaqus Style GEM Interface - Professional CAE Design
Based on deep analysis of Abaqus UI/UX principles
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
from PyQt6.QtCore import Qt, QTimer, pyqtSignal, QThread, QPropertyAnimation, QEasingCurve, QSize
from PyQt6.QtGui import QAction, QFont, QPalette, QColor, QPixmap, QPainter, QIcon

# Try to import 3D visualization
try:
    import pyvista as pv
    import pyvistaqt as pvqt
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

class AbaqusStyleTheme:
    """Professional Abaqus-style CAE theme system"""
    
    # Abaqus Classic Color Palette
    BG_PRIMARY = "#F0F0F0"        # Main background
    BG_SECONDARY = "#E8E8E8"      # Toolbar background  
    BG_PANEL = "#F8F8F8"          # Panel background
    BG_VIEWPORT = "#FFFFFF"       # 3D viewport background
    BG_SELECTED = "#CCE7FF"       # Selection background
    
    # Border and separator colors
    BORDER_LIGHT = "#D0D0D0"      # Light borders
    BORDER_MEDIUM = "#B0B0B0"     # Medium borders
    BORDER_DARK = "#808080"       # Dark borders
    
    # Text colors
    TEXT_PRIMARY = "#333333"      # Primary text
    TEXT_SECONDARY = "#666666"    # Secondary text
    TEXT_DISABLED = "#999999"     # Disabled text
    
    # Functional colors
    ACCENT_BLUE = "#316AC5"       # Abaqus classic blue
    SUCCESS_GREEN = "#28A745"     # Success green
    WARNING_ORANGE = "#FD7E14"    # Warning orange
    ERROR_RED = "#DC3545"         # Error red
    
    @staticmethod
    def apply_theme(app):
        """Apply Abaqus-style light theme"""
        palette = QPalette()
        
        # Window colors
        palette.setColor(QPalette.ColorRole.Window, QColor(AbaqusStyleTheme.BG_PRIMARY))
        palette.setColor(QPalette.ColorRole.WindowText, QColor(AbaqusStyleTheme.TEXT_PRIMARY))
        
        # Base colors (for input widgets)
        palette.setColor(QPalette.ColorRole.Base, QColor("#FFFFFF"))
        palette.setColor(QPalette.ColorRole.AlternateBase, QColor(AbaqusStyleTheme.BG_PANEL))
        
        # Text colors
        palette.setColor(QPalette.ColorRole.Text, QColor(AbaqusStyleTheme.TEXT_PRIMARY))
        palette.setColor(QPalette.ColorRole.BrightText, QColor(AbaqusStyleTheme.TEXT_PRIMARY))
        
        # Button colors
        palette.setColor(QPalette.ColorRole.Button, QColor(AbaqusStyleTheme.BG_SECONDARY))
        palette.setColor(QPalette.ColorRole.ButtonText, QColor(AbaqusStyleTheme.TEXT_PRIMARY))
        
        # Highlight colors
        palette.setColor(QPalette.ColorRole.Highlight, QColor(AbaqusStyleTheme.ACCENT_BLUE))
        palette.setColor(QPalette.ColorRole.HighlightedText, QColor("#FFFFFF"))
        
        app.setPalette(palette)
    
    @staticmethod
    def get_stylesheet():
        """Get comprehensive Abaqus-style stylesheet"""
        return f"""
        /* Main Window Styling */
        QMainWindow {{
            background-color: {AbaqusStyleTheme.BG_PRIMARY};
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
            font-family: "Segoe UI";
            font-size: 9pt;
        }}
        
        /* Menu Bar - Abaqus Style */
        QMenuBar {{
            background-color: {AbaqusStyleTheme.BG_SECONDARY};
            border-bottom: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};
            padding: 2px;
            font-size: 9pt;
        }}
        
        QMenuBar::item {{
            background-color: transparent;
            padding: 4px 8px;
            margin: 0px;
        }}
        
        QMenuBar::item:selected {{
            background-color: {AbaqusStyleTheme.BG_SELECTED};
            border: 1px solid {AbaqusStyleTheme.ACCENT_BLUE};
        }}
        
        QMenu {{
            background-color: {AbaqusStyleTheme.BG_PANEL};
            border: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};
        }}
        
        QMenu::item {{
            padding: 4px 20px;
        }}
        
        QMenu::item:selected {{
            background-color: {AbaqusStyleTheme.BG_SELECTED};
        }}
        
        /* Tool Bar - Professional CAE Style */
        QToolBar {{
            background-color: {AbaqusStyleTheme.BG_SECONDARY};
            border: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};
            spacing: 2px;
            padding: 3px;
            min-height: 40px;
        }}
        
        QToolBar::handle {{
            background-color: {AbaqusStyleTheme.BORDER_MEDIUM};
            width: 3px;
            margin: 4px 2px;
        }}
        
        QToolBar QToolButton {{
            background-color: transparent;
            border: 1px solid transparent;
            padding: 4px;
            margin: 1px;
            border-radius: 2px;
            min-width: 32px;
            min-height: 32px;
        }}
        
        QToolBar QToolButton:hover {{
            background-color: {AbaqusStyleTheme.BG_SELECTED};
            border: 1px solid {AbaqusStyleTheme.ACCENT_BLUE};
        }}
        
        QToolBar QToolButton:pressed {{
            background-color: {AbaqusStyleTheme.ACCENT_BLUE};
            color: white;
        }}
        
        QToolBar QToolButton:checked {{
            background-color: {AbaqusStyleTheme.ACCENT_BLUE};
            color: white;
            border: 1px solid {AbaqusStyleTheme.ACCENT_BLUE};
        }}
        
        QToolBar::separator {{
            background-color: {AbaqusStyleTheme.BORDER_MEDIUM};
            width: 1px;
            margin: 4px 2px;
        }}
        
        /* Buttons - 3D CAE Style */
        QPushButton {{
            background-color: {AbaqusStyleTheme.BG_SECONDARY};
            border: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};
            padding: 4px 12px;
            border-radius: 2px;
            font-weight: normal;
            min-height: 20px;
        }}
        
        QPushButton:hover {{
            background-color: {AbaqusStyleTheme.BG_SELECTED};
            border: 1px solid {AbaqusStyleTheme.ACCENT_BLUE};
        }}
        
        QPushButton:pressed {{
            background-color: {AbaqusStyleTheme.ACCENT_BLUE};
            color: white;
            border: 1px solid {AbaqusStyleTheme.ACCENT_BLUE};
        }}
        
        QPushButton:disabled {{
            background-color: {AbaqusStyleTheme.BG_PRIMARY};
            color: {AbaqusStyleTheme.TEXT_DISABLED};
            border: 1px solid {AbaqusStyleTheme.BORDER_LIGHT};
        }}
        
        /* Input Controls */
        QLineEdit, QSpinBox, QDoubleSpinBox {{
            background-color: white;
            border: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};
            padding: 2px 4px;
            border-radius: 1px;
            selection-background-color: {AbaqusStyleTheme.BG_SELECTED};
        }}
        
        QLineEdit:focus, QSpinBox:focus, QDoubleSpinBox:focus {{
            border: 2px solid {AbaqusStyleTheme.ACCENT_BLUE};
        }}
        
        QComboBox {{
            background-color: white;
            border: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};
            padding: 2px 4px;
            min-width: 60px;
        }}
        
        QComboBox:hover {{
            border: 1px solid {AbaqusStyleTheme.ACCENT_BLUE};
        }}
        
        QComboBox::drop-down {{
            border: none;
            width: 16px;
        }}
        
        QComboBox::down-arrow {{
            width: 12px;
            height: 12px;
        }}
        
        /* Group Boxes - Professional Style */
        QGroupBox {{
            font-weight: bold;
            border: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};
            border-radius: 2px;
            margin-top: 8px;
            padding-top: 12px;
            background-color: {AbaqusStyleTheme.BG_PANEL};
        }}
        
        QGroupBox::title {{
            subcontrol-origin: margin;
            left: 8px;
            padding: 0 4px;
            background-color: {AbaqusStyleTheme.BG_PANEL};
        }}
        
        /* Tree Widget - Model Tree Style */
        QTreeWidget {{
            background-color: white;
            border: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};
            selection-background-color: {AbaqusStyleTheme.BG_SELECTED};
            font-size: 9pt;
        }}
        
        QTreeWidget::item {{
            height: 20px;
            border: none;
            padding: 2px;
        }}
        
        QTreeWidget::item:selected {{
            background-color: {AbaqusStyleTheme.BG_SELECTED};
            color: {AbaqusStyleTheme.TEXT_PRIMARY};
        }}
        
        QTreeWidget::item:hover {{
            background-color: #E0E8FF;
        }}
        
        QTreeWidget::branch:has-siblings:!adjoins-item {{
            border-image: none;
            border-right: 1px solid {AbaqusStyleTheme.BORDER_LIGHT};
        }}
        
        QTreeWidget::branch:has-siblings:adjoins-item {{
            border-image: none;
            border-right: 1px solid {AbaqusStyleTheme.BORDER_LIGHT};
            border-bottom: 1px solid {AbaqusStyleTheme.BORDER_LIGHT};
        }}
        
        QTreeWidget::branch:!has-children:!has-siblings:adjoins-item {{
            border-image: none;
            border-bottom: 1px solid {AbaqusStyleTheme.BORDER_LIGHT};
        }}
        
        /* Table Widget */
        QTableWidget {{
            background-color: white;
            gridline-color: {AbaqusStyleTheme.BORDER_LIGHT};
            border: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};
        }}
        
        QTableWidget QHeaderView::section {{
            background-color: {AbaqusStyleTheme.BG_SECONDARY};
            border: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};
            padding: 4px;
            font-weight: bold;
        }}
        
        /* Text Edit */
        QTextEdit {{
            background-color: white;
            border: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};
            selection-background-color: {AbaqusStyleTheme.BG_SELECTED};
        }}
        
        /* Progress Bar */
        QProgressBar {{
            border: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};
            border-radius: 2px;
            background-color: white;
            text-align: center;
            font-weight: bold;
        }}
        
        QProgressBar::chunk {{
            background-color: {AbaqusStyleTheme.ACCENT_BLUE};
            border-radius: 1px;
        }}
        
        /* Status Bar */
        QStatusBar {{
            background-color: {AbaqusStyleTheme.BG_SECONDARY};
            border-top: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};
        }}
        
        /* Splitter */
        QSplitter::handle:horizontal {{
            background-color: {AbaqusStyleTheme.BORDER_MEDIUM};
            width: 3px;
        }}
        
        QSplitter::handle:vertical {{
            background-color: {AbaqusStyleTheme.BORDER_MEDIUM};
            height: 3px;
        }}
        
        /* Scroll Bars */
        QScrollBar:vertical {{
            border: 1px solid {AbaqusStyleTheme.BORDER_LIGHT};
            background-color: {AbaqusStyleTheme.BG_PRIMARY};
            width: 16px;
        }}
        
        QScrollBar::handle:vertical {{
            background-color: {AbaqusStyleTheme.BG_SECONDARY};
            border: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};
            min-height: 20px;
            border-radius: 2px;
        }}
        
        QScrollBar::handle:vertical:hover {{
            background-color: {AbaqusStyleTheme.ACCENT_BLUE};
        }}
        """

class CAEToolBar(QToolBar):
    """Professional CAE-style toolbar with grouped tools"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("CAEToolBar")
        self.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextUnderIcon)
        self.setup_toolbar()
    
    def setup_toolbar(self):
        """Setup professional CAE toolbar"""
        # File operations group
        self.add_tool_group("File Operations", [
            ("New", "Create new model", self.new_file),
            ("Open", "Open existing model", self.open_file),
            ("Save", "Save current model", self.save_file),
        ])
        
        self.addSeparator()
        
        # View operations group
        self.add_tool_group("View Operations", [
            ("Zoom", "Zoom to selection", self.zoom_fit),
            ("Rotate", "Rotate view", self.rotate_view), 
            ("Pan", "Pan view", self.pan_view),
            ("Screenshot", "Take screenshot", self.screenshot),
        ])
        
        self.addSeparator()
        
        # Analysis operations group
        self.add_tool_group("Analysis", [
            ("Model", "Build geological model", self.build_model),
            ("Analyze", "Run analysis", self.run_analysis),
            ("Results", "View results", self.view_results),
            ("Report", "Generate report", self.generate_report),
        ])
    
    def add_tool_group(self, group_name, tools):
        """Add a group of tools to toolbar"""
        for tool_name, tooltip, callback in tools:
            action = QAction(tool_name, self)
            action.setToolTip(tooltip)
            action.triggered.connect(callback)
            
            # Create simple text-based icons for now
            # In a real implementation, would use professional icons
            action.setText(tool_name)
            
            self.addAction(action)
    
    # Tool callbacks (placeholder implementations)
    def new_file(self):
        print("New file action")
    
    def open_file(self):
        print("Open file action")
    
    def save_file(self):
        print("Save file action")
    
    def zoom_fit(self):
        print("Zoom fit action")
    
    def rotate_view(self):
        print("Rotate view action")
    
    def pan_view(self):
        print("Pan view action")
    
    def screenshot(self):
        print("Screenshot action")
    
    def build_model(self):
        print("Build model action")
    
    def run_analysis(self):
        print("Run analysis action")
    
    def view_results(self):
        print("View results action")
    
    def generate_report(self):
        print("Generate report action")

class ModelTree(QTreeWidget):
    """Abaqus-style hierarchical model tree"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setHeaderLabel("Model Tree")
        self.setup_model_structure()
        self.setup_interactions()
    
    def setup_model_structure(self):
        """Setup Abaqus-style model tree structure"""
        # Root model item
        model_root = QTreeWidgetItem(self, ["Model-1"])
        model_root.setExpanded(True)
        
        # Parts section
        parts_item = QTreeWidgetItem(model_root, ["Parts"])
        parts_item.setExpanded(True)
        part1 = QTreeWidgetItem(parts_item, ["Part-1"])
        part2 = QTreeWidgetItem(parts_item, ["Part-2"])
        
        # Add features to parts
        QTreeWidgetItem(part1, ["Features"])
        QTreeWidgetItem(part1, ["Sets"])
        QTreeWidgetItem(part2, ["Features"])
        QTreeWidgetItem(part2, ["Sets"])
        
        # Materials section
        materials_item = QTreeWidgetItem(model_root, ["Materials"])
        materials_item.setExpanded(True)
        QTreeWidgetItem(materials_item, ["Steel-S235"])
        QTreeWidgetItem(materials_item, ["Concrete-C30"])
        QTreeWidgetItem(materials_item, ["Aluminum-6061"])
        
        # Assembly section
        assembly_item = QTreeWidgetItem(model_root, ["Assembly"])
        QTreeWidgetItem(assembly_item, ["Assembly-1"])
        
        # Steps section
        steps_item = QTreeWidgetItem(model_root, ["Steps"])
        steps_item.setExpanded(True)
        QTreeWidgetItem(steps_item, ["Initial"])
        QTreeWidgetItem(steps_item, ["Step-1 (Static)"])
        
        # Interactions section
        QTreeWidgetItem(model_root, ["Interactions"])
        
        # Loads section
        loads_item = QTreeWidgetItem(model_root, ["Loads"])
        QTreeWidgetItem(loads_item, ["Force-1"])
        QTreeWidgetItem(loads_item, ["Pressure-1"])
        
        # Mesh section
        mesh_item = QTreeWidgetItem(model_root, ["Mesh"])
        QTreeWidgetItem(mesh_item, ["Mesh-1"])
        
        # Jobs section
        jobs_item = QTreeWidgetItem(model_root, ["Jobs"])
        QTreeWidgetItem(jobs_item, ["Job-1 (Ready)"])
        
        # Expand all items for better visibility
        self.expandAll()
    
    def setup_interactions(self):
        """Setup tree interactions"""
        self.itemClicked.connect(self.on_item_clicked)
        self.itemDoubleClicked.connect(self.on_item_double_clicked)
    
    def on_item_clicked(self, item, column):
        """Handle item click"""
        print(f"Selected: {item.text(0)}")
    
    def on_item_double_clicked(self, item, column):
        """Handle item double click"""
        print(f"Double clicked: {item.text(0)}")

class AbaqusViewport(QWidget):
    """Professional Abaqus-style 3D viewport"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumSize(800, 600)
        self.init_viewport()
    
    def init_viewport(self):
        """Initialize professional 3D viewport"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # Viewport controls bar
        controls_bar = self.create_viewport_controls()
        layout.addWidget(controls_bar)
        
        # Main viewport area
        if PYVISTA_AVAILABLE:
            try:
                self.plotter = pvqt.QtInteractor(self)
                # Set Abaqus-style viewport background
                self.plotter.set_background([0.9, 0.9, 0.9])  # Light gray background
                layout.addWidget(self.plotter)
                
                self.setup_professional_scene()
                
            except Exception as e:
                error_widget = QLabel(f"3D Viewport Error: {str(e)}")
                error_widget.setAlignment(Qt.AlignmentFlag.AlignCenter)
                error_widget.setStyleSheet(f"color: {AbaqusStyleTheme.ERROR_RED}; font-size: 14pt;")
                layout.addWidget(error_widget)
        else:
            fallback_label = QLabel("3D Viewport\\n(PyVista not available)")
            fallback_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
            fallback_label.setStyleSheet(f"background-color: {AbaqusStyleTheme.BG_VIEWPORT}; font-size: 16pt;")
            layout.addWidget(fallback_label)
    
    def create_viewport_controls(self):
        """Create professional viewport controls"""
        controls_widget = QFrame()
        controls_widget.setMaximumHeight(35)
        controls_widget.setStyleSheet(f"background-color: {AbaqusStyleTheme.BG_SECONDARY}; border-bottom: 1px solid {AbaqusStyleTheme.BORDER_MEDIUM};")
        
        layout = QHBoxLayout(controls_widget)
        layout.setContentsMargins(8, 2, 8, 2)
        
        # View selection
        view_label = QLabel("View:")
        self.view_combo = QComboBox()
        self.view_combo.addItems(['Isometric', 'Front', 'Back', 'Top', 'Bottom', 'Left', 'Right'])
        self.view_combo.currentTextChanged.connect(self.change_view)
        
        layout.addWidget(view_label)
        layout.addWidget(self.view_combo)
        layout.addWidget(QFrame())  # Spacer
        
        # Display options
        self.wireframe_check = QCheckBox("Wireframe")
        self.edges_check = QCheckBox("Edges")
        self.axes_check = QCheckBox("Axes")
        self.axes_check.setChecked(True)
        
        layout.addWidget(self.wireframe_check)
        layout.addWidget(self.edges_check)
        layout.addWidget(self.axes_check)
        layout.addStretch()
        
        # Control buttons
        fit_btn = QPushButton("Fit All")
        fit_btn.clicked.connect(self.fit_all)
        zoom_btn = QPushButton("Zoom")
        rotate_btn = QPushButton("Rotate")
        
        layout.addWidget(fit_btn)
        layout.addWidget(zoom_btn)
        layout.addWidget(rotate_btn)
        
        return controls_widget
    
    def setup_professional_scene(self):
        """Setup professional 3D scene"""
        if not hasattr(self, 'plotter'):
            return
        
        # Add professional coordinate axes
        self.plotter.add_axes(
            interactive=True,
            line_width=2,
            x_color='red',
            y_color='green', 
            z_color='blue',
            xlabel='X',
            ylabel='Y',
            zlabel='Z'
        )
        
        # Add sample geological model
        self.add_geological_sample()
    
    def add_geological_sample(self):
        """Add sample geological model"""
        if not hasattr(self, 'plotter'):
            return
        
        try:
            # Sample borehole data points
            n_points = 20
            points = np.random.rand(n_points, 3) * [1000, 1000, 200]
            point_cloud = pv.PolyData(points)
            
            # Add boreholes as cylinders for more professional look
            self.plotter.add_mesh(
                point_cloud,
                color='#0066CC',  # Professional blue
                point_size=8,
                render_points_as_spheres=True,
                label='Boreholes'
            )
            
            # Add geological surface
            x = np.linspace(0, 1000, 25)
            y = np.linspace(0, 1000, 25)
            X, Y = np.meshgrid(x, y)
            Z = 100 + 20 * np.sin(X/200) * np.cos(Y/150) + 10 * np.random.rand(*X.shape)
            
            surface = pv.StructuredGrid(X, Y, Z)
            self.plotter.add_mesh(
                surface,
                opacity=0.7,
                color='#8B4513',  # Professional brown for geological layers
                show_edges=False,
                smooth_shading=True,
                label='Geological Surface'
            )
            
            # Add fault plane
            fault_points = np.array([
                [300, 0, 0], [300, 1000, 0], [300, 1000, 200], [300, 0, 200]
            ])
            fault = pv.PolyData(fault_points, faces=[4, 0, 1, 2, 3])
            self.plotter.add_mesh(
                fault,
                opacity=0.6,
                color='#FF4500',  # Orange for fault
                show_edges=True,
                edge_color='#CC3300',
                label='Fault Plane'
            )
            
            # Professional camera setup
            self.plotter.reset_camera()
            self.plotter.camera.elevation = 20
            self.plotter.camera.azimuth = 45
            
        except Exception as e:
            print(f"Failed to add geological sample: {e}")
    
    def change_view(self, view_name):
        """Change viewport view"""
        if not hasattr(self, 'plotter'):
            return
        
        if view_name == 'Front':
            self.plotter.view_yz()
        elif view_name == 'Back':
            self.plotter.view_yz()
            self.plotter.camera.azimuth += 180
        elif view_name == 'Top':
            self.plotter.view_xy()
        elif view_name == 'Bottom':
            self.plotter.view_xy()
            self.plotter.camera.elevation = -90
        elif view_name == 'Left':
            self.plotter.view_xz()
        elif view_name == 'Right':
            self.plotter.view_xz()
            self.plotter.camera.azimuth += 180
        else:  # Isometric
            self.plotter.view_isometric()
    
    def fit_all(self):
        """Fit all geometry in view"""
        if hasattr(self, 'plotter'):
            self.plotter.reset_camera()

class PropertyManager(QWidget):
    """Abaqus-style property manager panel"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumWidth(250)
        self.init_property_panel()
    
    def init_property_panel(self):
        """Initialize property management panel"""
        layout = QVBoxLayout(self)
        layout.setContentsMargins(4, 4, 4, 4)
        
        # Selection info
        selection_group = QGroupBox("Current Selection")
        selection_layout = QFormLayout(selection_group)
        
        self.selection_type = QLabel("None")
        self.selection_name = QLabel("-")
        selection_layout.addRow("Type:", self.selection_type)
        selection_layout.addRow("Name:", self.selection_name)
        
        layout.addWidget(selection_group)
        
        # Properties section
        self.properties_group = QGroupBox("Properties")
        self.properties_layout = QFormLayout(self.properties_group)
        
        layout.addWidget(self.properties_group)
        
        # Default material properties
        self.setup_material_properties()
        
        # Analysis parameters
        analysis_group = QGroupBox("Analysis Parameters")
        analysis_layout = QFormLayout(analysis_group)
        
        self.step_type = QComboBox()
        self.step_type.addItems(["Static", "Dynamic", "Frequency", "Buckling"])
        analysis_layout.addRow("Step Type:", self.step_type)
        
        self.time_period = QDoubleSpinBox()
        self.time_period.setRange(0.1, 1000.0)
        self.time_period.setValue(1.0)
        analysis_layout.addRow("Time Period:", self.time_period)
        
        layout.addWidget(analysis_group)
        
        # Mesh parameters
        mesh_group = QGroupBox("Mesh Controls")
        mesh_layout = QFormLayout(mesh_group)
        
        self.element_size = QDoubleSpinBox()
        self.element_size.setRange(0.1, 100.0)
        self.element_size.setValue(10.0)
        self.element_size.setSuffix(" m")
        mesh_layout.addRow("Global Size:", self.element_size)
        
        self.element_type = QComboBox()
        self.element_type.addItems(["Linear", "Quadratic", "Hybrid"])
        mesh_layout.addRow("Element Type:", self.element_type)
        
        layout.addWidget(mesh_group)
        
        layout.addStretch()
        
        # Action buttons
        button_layout = QHBoxLayout()
        apply_btn = QPushButton("Apply")
        apply_btn.clicked.connect(self.apply_properties)
        reset_btn = QPushButton("Reset")
        reset_btn.clicked.connect(self.reset_properties)
        
        button_layout.addWidget(apply_btn)
        button_layout.addWidget(reset_btn)
        layout.addLayout(button_layout)
    
    def setup_material_properties(self):
        """Setup material property controls"""
        # Clear existing properties
        for i in reversed(range(self.properties_layout.count())):
            child = self.properties_layout.itemAt(i)
            if child:
                widget = child.widget()
                if widget:
                    widget.deleteLater()
        
        # Material properties
        self.density = QDoubleSpinBox()
        self.density.setRange(1000, 10000)
        self.density.setValue(7850)
        self.density.setSuffix(" kg/m³")
        self.properties_layout.addRow("Density:", self.density)
        
        self.youngs_modulus = QDoubleSpinBox()
        self.youngs_modulus.setRange(1e6, 1e12)
        self.youngs_modulus.setValue(200e9)
        self.youngs_modulus.setSuffix(" Pa")
        self.properties_layout.addRow("Young's E:", self.youngs_modulus)
        
        self.poisson_ratio = QDoubleSpinBox()
        self.poisson_ratio.setRange(0.0, 0.5)
        self.poisson_ratio.setValue(0.3)
        self.poisson_ratio.setDecimals(3)
        self.properties_layout.addRow("Poisson ν:", self.poisson_ratio)
        
        self.yield_strength = QDoubleSpinBox()
        self.yield_strength.setRange(1e6, 1e9)
        self.yield_strength.setValue(235e6)
        self.yield_strength.setSuffix(" Pa")
        self.properties_layout.addRow("Yield σy:", self.yield_strength)
    
    def update_selection(self, selection_type, selection_name):
        """Update property panel based on selection"""
        self.selection_type.setText(selection_type)
        self.selection_name.setText(selection_name)
        
        # Update properties based on selection type
        if selection_type == "Material":
            self.setup_material_properties()
        elif selection_type == "Part":
            self.setup_part_properties()
        elif selection_type == "Load":
            self.setup_load_properties()
    
    def setup_part_properties(self):
        """Setup part-specific properties"""
        # Implementation for part properties
        pass
    
    def setup_load_properties(self):
        """Setup load-specific properties"""
        # Implementation for load properties
        pass
    
    def apply_properties(self):
        """Apply property changes"""
        print("Properties applied")
    
    def reset_properties(self):
        """Reset properties to defaults"""
        print("Properties reset")

class AbaqusStyleGEM(QMainWindow):
    """Professional Abaqus-style GEM interface"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GEM Professional Modeling System - Abaqus Style")
        self.setGeometry(100, 100, 1600, 1000)
        
        # Initialize UI components
        self.init_ui()
        self.create_menu_system()
        self.create_status_system()
        
        # Log startup
        self.log_message("Abaqus-style interface initialized")
        print("GEM Professional Modeling System - Abaqus Style Edition Started!")
    
    def init_ui(self):
        """Initialize the professional Abaqus-style interface"""
        # Central widget setup
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # Add professional toolbar
        self.toolbar = CAEToolBar(self)
        self.addToolBar(self.toolbar)
        
        # Create main splitter for three-panel layout
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(main_splitter)
        
        # Left panel - Model Tree (280px)
        left_panel = QFrame()
        left_panel.setMaximumWidth(320)
        left_panel.setMinimumWidth(250)
        left_layout = QVBoxLayout(left_panel)
        left_layout.setContentsMargins(4, 4, 4, 4)
        
        # Model tree
        tree_label = QLabel("Model Tree")
        tree_label.setStyleSheet("font-weight: bold; padding: 4px;")
        left_layout.addWidget(tree_label)
        
        self.model_tree = ModelTree()
        left_layout.addWidget(self.model_tree)
        
        main_splitter.addWidget(left_panel)
        
        # Central panel - Large 3D Viewport (1040px)
        self.viewport = AbaqusViewport()
        main_splitter.addWidget(self.viewport)
        
        # Right panel - Property Manager (280px)
        right_panel = QFrame()
        right_panel.setMaximumWidth(320)
        right_panel.setMinimumWidth(250)
        right_layout = QVBoxLayout(right_panel)
        right_layout.setContentsMargins(4, 4, 4, 4)
        
        # Property manager
        prop_label = QLabel("Property Manager")
        prop_label.setStyleSheet("font-weight: bold; padding: 4px;")
        right_layout.addWidget(prop_label)
        
        self.property_manager = PropertyManager()
        right_layout.addWidget(self.property_manager)
        
        main_splitter.addWidget(right_panel)
        
        # Set professional proportions: [280, 1040, 280]
        main_splitter.setSizes([280, 1040, 280])
        
        # Connect model tree selection to property manager
        self.model_tree.itemClicked.connect(self.on_tree_selection_changed)
    
    def create_menu_system(self):
        """Create professional Abaqus-style menu system"""
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu('File')
        file_menu.addAction('New Model Database', self.new_model)
        file_menu.addAction('Open...', self.open_model)
        file_menu.addAction('Save', self.save_model)
        file_menu.addAction('Save As...', self.save_model_as)
        file_menu.addSeparator()
        file_menu.addAction('Import', self.import_data)
        file_menu.addAction('Export', self.export_data)
        file_menu.addSeparator()
        file_menu.addAction('Print...', self.print_model)
        file_menu.addAction('Exit', self.close)
        
        # Edit menu
        edit_menu = menubar.addMenu('Edit')
        edit_menu.addAction('Copy', self.copy_selection)
        edit_menu.addAction('Paste', self.paste_selection)
        edit_menu.addAction('Delete', self.delete_selection)
        edit_menu.addSeparator()
        edit_menu.addAction('Model Attributes...', self.model_attributes)
        
        # View menu
        view_menu = menubar.addMenu('View')
        view_menu.addAction('Fit All', self.fit_all_view)
        view_menu.addAction('Rotate', self.rotate_view)
        view_menu.addAction('Pan', self.pan_view)
        view_menu.addAction('Zoom', self.zoom_view)
        view_menu.addSeparator()
        view_menu.addAction('Display Options...', self.display_options)
        
        # Tools menu
        tools_menu = menubar.addMenu('Tools')
        tools_menu.addAction('Material Manager', self.material_manager)
        tools_menu.addAction('Section Manager', self.section_manager)
        tools_menu.addAction('Amplitude Manager', self.amplitude_manager)
        
        # Analysis menu
        analysis_menu = menubar.addMenu('Analysis')
        analysis_menu.addAction('Create Step', self.create_step)
        analysis_menu.addAction('Create Load', self.create_load)
        analysis_menu.addAction('Create Boundary Condition', self.create_bc)
        analysis_menu.addSeparator()
        analysis_menu.addAction('Submit Job', self.submit_job)
        analysis_menu.addAction('Monitor Jobs', self.monitor_jobs)
        
        # Results menu
        results_menu = menubar.addMenu('Results')
        results_menu.addAction('Open Results', self.open_results)
        results_menu.addAction('Create XY Plot', self.create_xy_plot)
        results_menu.addAction('Generate Report', self.generate_report)
        
        # Help menu
        help_menu = menubar.addMenu('Help')
        help_menu.addAction('User Manual', self.show_manual)
        help_menu.addAction('Examples', self.show_examples)
        help_menu.addAction('About', self.show_about)
    
    def create_status_system(self):
        """Create professional status bar"""
        status_bar = self.statusBar()
        
        # Status message
        self.status_message = QLabel("Ready")
        status_bar.addWidget(self.status_message)
        
        # Viewport info
        self.viewport_info = QLabel("Viewport-1")
        status_bar.addPermanentWidget(self.viewport_info)
        
        # Selection info
        self.selection_info = QLabel("No selection")
        status_bar.addPermanentWidget(self.selection_info)
        
        # Model database info
        self.database_info = QLabel("Model database: untitled.cae")
        status_bar.addPermanentWidget(self.database_info)
    
    def on_tree_selection_changed(self, item, column):
        """Handle model tree selection changes"""
        item_text = item.text(0)
        
        # Determine selection type
        parent = item.parent()
        if parent:
            parent_text = parent.text(0)
            if parent_text == "Materials":
                self.property_manager.update_selection("Material", item_text)
                self.selection_info.setText(f"Selected: Material ({item_text})")
            elif parent_text == "Parts":
                self.property_manager.update_selection("Part", item_text)
                self.selection_info.setText(f"Selected: Part ({item_text})")
            elif parent_text == "Loads":
                self.property_manager.update_selection("Load", item_text)
                self.selection_info.setText(f"Selected: Load ({item_text})")
            else:
                self.selection_info.setText(f"Selected: {item_text}")
        else:
            self.selection_info.setText(f"Selected: {item_text}")
    
    def log_message(self, message):
        """Log message to status bar"""
        self.status_message.setText(message)
        print(f"Status: {message}")
    
    # Menu action implementations (placeholders)
    def new_model(self):
        self.log_message("New model database created")
    
    def open_model(self):
        self.log_message("Opening model...")
    
    def save_model(self):
        self.log_message("Model saved")
    
    def save_model_as(self):
        self.log_message("Save model as...")
    
    def import_data(self):
        self.log_message("Import data...")
    
    def export_data(self):
        self.log_message("Export data...")
    
    def print_model(self):
        self.log_message("Print model...")
    
    def copy_selection(self):
        self.log_message("Copy selection")
    
    def paste_selection(self):
        self.log_message("Paste selection")
    
    def delete_selection(self):
        self.log_message("Delete selection")
    
    def model_attributes(self):
        self.log_message("Model attributes...")
    
    def fit_all_view(self):
        if hasattr(self.viewport, 'fit_all'):
            self.viewport.fit_all()
        self.log_message("Fit all in view")
    
    def rotate_view(self):
        self.log_message("Rotate view mode")
    
    def pan_view(self):
        self.log_message("Pan view mode")
    
    def zoom_view(self):
        self.log_message("Zoom view mode")
    
    def display_options(self):
        self.log_message("Display options...")
    
    def material_manager(self):
        self.log_message("Material manager...")
    
    def section_manager(self):
        self.log_message("Section manager...")
    
    def amplitude_manager(self):
        self.log_message("Amplitude manager...")
    
    def create_step(self):
        self.log_message("Create analysis step...")
    
    def create_load(self):
        self.log_message("Create load...")
    
    def create_bc(self):
        self.log_message("Create boundary condition...")
    
    def submit_job(self):
        self.log_message("Submit analysis job...")
    
    def monitor_jobs(self):
        self.log_message("Monitor jobs...")
    
    def open_results(self):
        self.log_message("Open results...")
    
    def create_xy_plot(self):
        self.log_message("Create XY plot...")
    
    def generate_report(self):
        self.log_message("Generate report...")
    
    def show_manual(self):
        QMessageBox.information(self, "User Manual", "GEM Professional User Manual\\n\\nComprehensive geological modeling system with professional Abaqus-style interface.")
    
    def show_examples(self):
        self.log_message("Show examples...")
    
    def show_about(self):
        QMessageBox.about(self, "About GEM Professional", 
            "GEM Comprehensive Modeling System\\n"
            "Abaqus Style Professional Edition\\n\\n"
            "Professional geological modeling with:\\n"
            "• Abaqus-style interface design\\n"
            "• Three-panel CAE layout\\n"
            "• Professional 3D viewport\\n"
            "• Integrated model tree\\n"
            "• Context-aware property manager\\n\\n"
            "© 2024 DeepCAD Team")

def main():
    """Main application function"""
    app = QApplication(sys.argv)
    
    # Set application info
    app.setApplicationName("GEM Professional - Abaqus Style")
    app.setApplicationVersion("3.1.0")
    app.setOrganizationName("DeepCAD")
    
    # Apply Abaqus-style theme
    AbaqusStyleTheme.apply_theme(app)
    app.setStyleSheet(AbaqusStyleTheme.get_stylesheet())
    
    # Create and show main window
    window = AbaqusStyleGEM()
    window.show()
    
    return app.exec()

if __name__ == "__main__":
    sys.exit(main())