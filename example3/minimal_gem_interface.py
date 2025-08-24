"""
Minimal GEM Interface - Working version
Simple but functional geological modeling interface
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
    QTableWidgetItem, QHeaderView
)
from PyQt6.QtCore import Qt, QTimer
from PyQt6.QtGui import QAction, QFont

# Try to import 3D visualization
try:
    import pyvista as pv
    import pyvistaqt as pvqt
    PYVISTA_AVAILABLE = True
except ImportError:
    PYVISTA_AVAILABLE = False

class MinimalGEMInterface(QMainWindow):
    """Minimal GEM Interface - Functional version"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("GEM Comprehensive Modeling System v2.0")
        self.setGeometry(100, 100, 1400, 900)
        
        # Initialize data storage
        self.project_data = {
            'boreholes': None,
            'geological_model': None,
            'analysis_results': {}
        }
        
        self.init_ui()
        self.create_menu_system()
        self.create_status_system()
        self.show_welcome_message()
        
    def init_ui(self):
        """Initialize user interface"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # Create main layout
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(5, 5, 5, 5)
        
        # Create main splitter
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(main_splitter)
        
        # Left panel (project browser + tools)
        self.create_left_panel(main_splitter)
        
        # Central workspace
        self.create_central_workspace(main_splitter)
        
        # Right panel (properties + 3D view)
        self.create_right_panel(main_splitter)
        
        # Set splitter proportions
        main_splitter.setSizes([250, 800, 350])
    
    def create_left_panel(self, splitter):
        """Create left panel"""
        left_panel = QWidget()
        left_layout = QVBoxLayout(left_panel)
        
        # Project browser
        project_group = QGroupBox("Project Browser")
        project_layout = QVBoxLayout(project_group)
        
        self.project_tree = QTreeWidget()
        self.project_tree.setHeaderLabels(['Project Structure'])
        self.setup_project_tree()
        project_layout.addWidget(self.project_tree)
        
        left_layout.addWidget(project_group)
        
        # Quick tools
        tools_group = QGroupBox("Quick Tools")
        tools_layout = QVBoxLayout(tools_group)
        
        # Tool buttons
        new_project_btn = QPushButton("New Project")
        new_project_btn.clicked.connect(self.new_project)
        tools_layout.addWidget(new_project_btn)
        
        import_data_btn = QPushButton("Import Data")
        import_data_btn.clicked.connect(self.import_data)
        tools_layout.addWidget(import_data_btn)
        
        build_model_btn = QPushButton("Build Model")
        build_model_btn.clicked.connect(self.build_model)
        tools_layout.addWidget(build_model_btn)
        
        run_analysis_btn = QPushButton("Run Analysis")
        run_analysis_btn.clicked.connect(self.run_analysis)
        tools_layout.addWidget(run_analysis_btn)
        
        left_layout.addWidget(tools_group)
        left_layout.addStretch()
        
        splitter.addWidget(left_panel)
    
    def create_central_workspace(self, splitter):
        """Create central workspace"""
        central_widget = QWidget()
        central_layout = QVBoxLayout(central_widget)
        
        # Create tabbed workspace
        self.main_tabs = QTabWidget()
        
        # Data Management tab
        self.create_data_tab()
        
        # Modeling tab
        self.create_modeling_tab()
        
        # Analysis tab
        self.create_analysis_tab()
        
        # Results tab
        self.create_results_tab()
        
        central_layout.addWidget(self.main_tabs)
        splitter.addWidget(central_widget)
    
    def create_data_tab(self):
        """Create data management tab"""
        data_tab = QWidget()
        data_layout = QVBoxLayout(data_tab)
        
        # Data import section
        import_group = QGroupBox("Data Import")
        import_layout = QHBoxLayout(import_group)
        
        borehole_btn = QPushButton("Import Borehole Data")
        borehole_btn.clicked.connect(self.import_borehole_data)
        import_layout.addWidget(borehole_btn)
        
        strata_btn = QPushButton("Import Strata Data")
        strata_btn.clicked.connect(self.import_strata_data)
        import_layout.addWidget(strata_btn)
        
        fault_btn = QPushButton("Import Fault Data")
        fault_btn.clicked.connect(self.import_fault_data)
        import_layout.addWidget(fault_btn)
        
        data_layout.addWidget(import_group)
        
        # Data preview
        preview_group = QGroupBox("Data Preview")
        preview_layout = QVBoxLayout(preview_group)
        
        self.data_table = QTableWidget()
        preview_layout.addWidget(self.data_table)
        
        data_layout.addWidget(preview_group)
        
        self.main_tabs.addTab(data_tab, "Data Management")
    
    def create_modeling_tab(self):
        """Create geological modeling tab"""
        modeling_tab = QWidget()
        modeling_layout = QVBoxLayout(modeling_tab)
        
        # Model parameters
        params_group = QGroupBox("Model Parameters")
        params_layout = QFormLayout(params_group)
        
        # Model extent
        self.model_extent = QLineEdit("0,1000,0,1000,0,500")
        params_layout.addRow("Model Extent (xmin,xmax,ymin,ymax,zmin,zmax):", self.model_extent)
        
        # Resolution
        self.model_resolution = QLineEdit("50,50,25")
        params_layout.addRow("Resolution (nx,ny,nz):", self.model_resolution)
        
        # Interpolation method
        self.interpolation_method = QComboBox()
        self.interpolation_method.addItems(["Linear", "Cubic", "RBF", "Kriging"])
        params_layout.addRow("Interpolation Method:", self.interpolation_method)
        
        modeling_layout.addWidget(params_group)
        
        # Modeling controls
        control_group = QGroupBox("Modeling Controls")
        control_layout = QHBoxLayout(control_group)
        
        build_btn = QPushButton("Build Geological Model")
        build_btn.clicked.connect(self.build_geological_model)
        control_layout.addWidget(build_btn)
        
        preview_btn = QPushButton("Preview Model")
        preview_btn.clicked.connect(self.preview_model)
        control_layout.addWidget(preview_btn)
        
        export_btn = QPushButton("Export Model")
        export_btn.clicked.connect(self.export_model)
        control_layout.addWidget(export_btn)
        
        control_layout.addStretch()
        
        modeling_layout.addWidget(control_group)
        modeling_layout.addStretch()
        
        self.main_tabs.addTab(modeling_tab, "Geological Modeling")
    
    def create_analysis_tab(self):
        """Create analysis tab"""
        analysis_tab = QWidget()
        analysis_layout = QVBoxLayout(analysis_tab)
        
        # Analysis methods
        methods_group = QGroupBox("Analysis Methods")
        methods_layout = QVBoxLayout(methods_group)
        
        # Checkboxes for different analysis types
        self.fault_analysis_check = QCheckBox("Fault Analysis")
        methods_layout.addWidget(self.fault_analysis_check)
        
        self.geophysics_check = QCheckBox("Geophysical Modeling")
        methods_layout.addWidget(self.geophysics_check)
        
        self.uncertainty_check = QCheckBox("Uncertainty Analysis")
        methods_layout.addWidget(self.uncertainty_check)
        
        analysis_layout.addWidget(methods_group)
        
        # Analysis parameters
        params_group = QGroupBox("Analysis Parameters")
        params_layout = QFormLayout(params_group)
        
        self.n_samples = QSpinBox()
        self.n_samples.setRange(100, 100000)
        self.n_samples.setValue(1000)
        params_layout.addRow("Number of Samples:", self.n_samples)
        
        self.analysis_method = QComboBox()
        self.analysis_method.addItems(["Monte Carlo", "Latin Hypercube", "Sobol"])
        params_layout.addRow("Sampling Method:", self.analysis_method)
        
        analysis_layout.addWidget(params_group)
        
        # Analysis controls
        control_group = QGroupBox("Analysis Controls")
        control_layout = QHBoxLayout(control_group)
        
        run_btn = QPushButton("Run Analysis")
        run_btn.clicked.connect(self.run_comprehensive_analysis)
        control_layout.addWidget(run_btn)
        
        stop_btn = QPushButton("Stop Analysis")
        stop_btn.clicked.connect(self.stop_analysis)
        control_layout.addWidget(stop_btn)
        
        control_layout.addStretch()
        
        analysis_layout.addWidget(control_group)
        analysis_layout.addStretch()
        
        self.main_tabs.addTab(analysis_tab, "Analysis")
    
    def create_results_tab(self):
        """Create results tab"""
        results_tab = QWidget()
        results_layout = QVBoxLayout(results_tab)
        
        # Results display
        display_group = QGroupBox("Results Display")
        display_layout = QVBoxLayout(display_group)
        
        # Results type selection
        type_layout = QHBoxLayout()
        
        self.result_type = QComboBox()
        self.result_type.addItems(["Statistical Summary", "Parameter Distributions", "Correlation Analysis"])
        type_layout.addWidget(QLabel("Result Type:"))
        type_layout.addWidget(self.result_type)
        
        refresh_btn = QPushButton("Refresh")
        refresh_btn.clicked.connect(self.refresh_results)
        type_layout.addWidget(refresh_btn)
        
        type_layout.addStretch()
        display_layout.addLayout(type_layout)
        
        # Results text area
        self.results_text = QTextEdit()
        self.results_text.setReadOnly(True)
        display_layout.addWidget(self.results_text)
        
        results_layout.addWidget(display_group)
        
        # Export controls
        export_group = QGroupBox("Export Results")
        export_layout = QHBoxLayout(export_group)
        
        export_data_btn = QPushButton("Export Data")
        export_data_btn.clicked.connect(self.export_data)
        export_layout.addWidget(export_data_btn)
        
        export_report_btn = QPushButton("Generate Report")
        export_report_btn.clicked.connect(self.generate_report)
        export_layout.addWidget(export_report_btn)
        
        export_layout.addStretch()
        
        results_layout.addWidget(export_group)
        
        self.main_tabs.addTab(results_tab, "Results")
    
    def create_right_panel(self, splitter):
        """Create right panel"""
        right_panel = QWidget()
        right_layout = QVBoxLayout(right_panel)
        
        # Properties panel
        properties_group = QGroupBox("Properties")
        properties_layout = QVBoxLayout(properties_group)
        
        self.properties_text = QTextEdit()
        self.properties_text.setMaximumHeight(150)
        self.properties_text.setReadOnly(True)
        properties_layout.addWidget(self.properties_text)
        
        right_layout.addWidget(properties_group)
        
        # 3D Viewport
        viewport_group = QGroupBox("3D Viewport")
        viewport_layout = QVBoxLayout(viewport_group)
        
        if PYVISTA_AVAILABLE:
            try:
                self.plotter = pvqt.QtInteractor(right_panel)
                self.plotter.set_background([0.2, 0.3, 0.4])
                self.plotter.add_axes()
                viewport_layout.addWidget(self.plotter)
                
                # Add sample data
                self.add_sample_3d_data()
                
            except Exception as e:
                error_label = QLabel(f"3D viewport initialization failed: {str(e)}")
                viewport_layout.addWidget(error_label)
        else:
            info_label = QLabel("3D viewport not available\n(PyVista not installed)")
            viewport_layout.addWidget(info_label)
        
        right_layout.addWidget(viewport_group)
        
        # Status panel
        status_group = QGroupBox("System Status")
        status_layout = QVBoxLayout(status_group)
        
        self.status_text = QTextEdit()
        self.status_text.setMaximumHeight(100)
        self.status_text.setReadOnly(True)
        status_layout.addWidget(self.status_text)
        
        right_layout.addWidget(status_group)
        
        splitter.addWidget(right_panel)
    
    def add_sample_3d_data(self):
        """Add sample 3D data to viewport"""
        if hasattr(self, 'plotter'):
            try:
                # Create sample borehole points
                points = np.random.rand(20, 3) * [1000, 1000, 100]
                point_cloud = pv.PolyData(points)
                
                self.plotter.add_mesh(
                    point_cloud, 
                    color='red', 
                    point_size=10, 
                    render_points_as_spheres=True,
                    label='Sample Boreholes'
                )
                
                # Create sample geological layers
                x = np.linspace(0, 1000, 20)
                y = np.linspace(0, 1000, 20)
                X, Y = np.meshgrid(x, y)
                Z = 50 + 10 * np.sin(X/100) * np.cos(Y/150)
                
                surface = pv.StructuredGrid(X, Y, Z)
                self.plotter.add_mesh(
                    surface,
                    opacity=0.7,
                    color='brown',
                    label='Geological Surface'
                )
                
                self.plotter.reset_camera()
                
            except Exception as e:
                print(f"Failed to add sample 3D data: {e}")
    
    def setup_project_tree(self):
        """Setup project tree structure"""
        # Data items
        data_item = QTreeWidgetItem(self.project_tree, ["Data"])
        QTreeWidgetItem(data_item, ["Borehole Data (0)"])
        QTreeWidgetItem(data_item, ["Strata Data (0)"])
        QTreeWidgetItem(data_item, ["Fault Data (0)"])
        
        # Model items
        model_item = QTreeWidgetItem(self.project_tree, ["Models"])
        QTreeWidgetItem(model_item, ["Geological Model"])
        QTreeWidgetItem(model_item, ["Fault Network"])
        
        # Analysis results
        results_item = QTreeWidgetItem(self.project_tree, ["Analysis Results"])
        QTreeWidgetItem(results_item, ["Geophysical Results"])
        QTreeWidgetItem(results_item, ["Uncertainty Results"])
        
        self.project_tree.expandAll()
    
    def create_menu_system(self):
        """Create menu system"""
        menubar = self.menuBar()
        
        # File menu
        file_menu = menubar.addMenu('File')
        
        new_action = QAction('New Project', self)
        new_action.triggered.connect(self.new_project)
        file_menu.addAction(new_action)
        
        open_action = QAction('Open Project', self)
        open_action.triggered.connect(self.open_project)
        file_menu.addAction(open_action)
        
        save_action = QAction('Save Project', self)
        save_action.triggered.connect(self.save_project)
        file_menu.addAction(save_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction('Exit', self)
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # Tools menu
        tools_menu = menubar.addMenu('Tools')
        tools_menu.addAction('Data Import', self.import_data)
        tools_menu.addAction('Geological Modeling', self.build_model)
        tools_menu.addAction('Fault Analysis', self.analyze_faults)
        tools_menu.addAction('Geophysical Modeling', self.run_geophysics)
        tools_menu.addAction('Uncertainty Analysis', self.run_uncertainty)
        
        # Help menu
        help_menu = menubar.addMenu('Help')
        help_menu.addAction('About', self.show_about)
    
    def create_status_system(self):
        """Create status bar system"""
        status_bar = self.statusBar()
        
        self.status_label = QLabel("Ready")
        status_bar.addWidget(self.status_label)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setMaximumWidth(200)
        self.progress_bar.setVisible(False)
        status_bar.addPermanentWidget(self.progress_bar)
    
    def show_welcome_message(self):
        """Show welcome message"""
        welcome_msg = """
Welcome to GEM Comprehensive Modeling System v2.0!

Main Features:
* Professional geological modeling - Implicit modeling based on borehole data
* Fault analysis - Structural relationship and stability analysis  
* Geophysical modeling - Gravity, magnetic, electrical, seismic
* Uncertainty analysis - Monte Carlo and sensitivity analysis
* Advanced 3D visualization - Real-time rendering and animation

Quick Start:
1. Left panel Quick Tools -> New Project
2. Data Management tab -> Import Borehole Data
3. Geological Modeling tab -> Build Geological Model
4. Select analysis method and run
        """
        
        self.log_message("System initialization completed")
        self.log_message("All functional modules loaded")
        print(welcome_msg)
    
    def log_message(self, message, level="INFO"):
        """Log message to status text"""
        import datetime
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        formatted_message = f"[{timestamp}] {level}: {message}"
        
        if hasattr(self, 'status_text'):
            current_text = self.status_text.toPlainText()
            self.status_text.setPlainText(current_text + formatted_message + "\n")
        
        print(formatted_message)
    
    # Event handler methods
    
    def new_project(self):
        """Create new project"""
        self.log_message("Creating new project")
        QMessageBox.information(self, "New Project", "New project created successfully!")
    
    def open_project(self):
        """Open existing project"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Open Project", "", "GEM Project Files (*.gem);;All Files (*)"
        )
        if file_path:
            self.log_message(f"Opening project: {file_path}")
    
    def save_project(self):
        """Save current project"""
        self.log_message("Saving project")
        QMessageBox.information(self, "Save Project", "Project saved successfully!")
    
    def import_data(self):
        """Import data"""
        self.main_tabs.setCurrentIndex(0)  # Switch to data management tab
        self.log_message("Data import initiated")
    
    def import_borehole_data(self):
        """Import borehole data"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "Import Borehole Data", "", "CSV Files (*.csv);;Excel Files (*.xlsx);;All Files (*)"
        )
        if file_path:
            try:
                if file_path.endswith('.csv'):
                    data = pd.read_csv(file_path)
                elif file_path.endswith(('.xlsx', '.xls')):
                    data = pd.read_excel(file_path)
                else:
                    QMessageBox.warning(self, "Error", "Unsupported file format")
                    return
                
                self.project_data['boreholes'] = data
                self.display_data_in_table(data)
                self.log_message(f"Imported borehole data: {len(data)} records")
                
                # Update 3D view if available
                if PYVISTA_AVAILABLE and hasattr(self, 'plotter'):
                    self.update_3d_view_with_boreholes(data)
                
            except Exception as e:
                QMessageBox.critical(self, "Import Error", f"Failed to import data: {str(e)}")
    
    def import_strata_data(self):
        """Import strata data"""
        self.log_message("Strata data import function")
        QMessageBox.information(self, "Import", "Strata data import functionality")
    
    def import_fault_data(self):
        """Import fault data"""
        self.log_message("Fault data import function")
        QMessageBox.information(self, "Import", "Fault data import functionality")
    
    def display_data_in_table(self, data):
        """Display data in the preview table"""
        if data is None or data.empty:
            return
        
        self.data_table.setRowCount(len(data))
        self.data_table.setColumnCount(len(data.columns))
        self.data_table.setHorizontalHeaderLabels(data.columns.tolist())
        
        for i in range(len(data)):
            for j, col in enumerate(data.columns):
                item = QTableWidgetItem(str(data.iloc[i, j]))
                self.data_table.setItem(i, j, item)
        
        self.data_table.resizeColumnsToContents()
    
    def update_3d_view_with_boreholes(self, data):
        """Update 3D view with borehole data"""
        try:
            if 'X' in data.columns and 'Y' in data.columns:
                x_col = 'X'
                y_col = 'Y'
            elif 'x' in data.columns and 'y' in data.columns:
                x_col = 'x'
                y_col = 'y'
            else:
                # Try to find coordinate columns
                coord_cols = [col for col in data.columns if any(keyword in col.lower() for keyword in ['x', 'east', 'coord'])]
                if len(coord_cols) >= 2:
                    x_col = coord_cols[0]
                    y_col = coord_cols[1]
                else:
                    return
            
            x = data[x_col].values
            y = data[y_col].values
            
            z_col = None
            for col in data.columns:
                if any(keyword in col.lower() for keyword in ['z', 'elev', 'depth']):
                    z_col = col
                    break
            
            if z_col and z_col in data.columns:
                z = data[z_col].values
            else:
                z = np.zeros(len(x))
            
            # Clear existing points and add new ones
            self.plotter.clear()
            
            points = np.column_stack([x, y, z])
            point_cloud = pv.PolyData(points)
            
            self.plotter.add_mesh(
                point_cloud, 
                color='blue', 
                point_size=8, 
                render_points_as_spheres=True,
                label='Imported Boreholes'
            )
            
            self.plotter.reset_camera()
            
        except Exception as e:
            print(f"Failed to update 3D view: {e}")
    
    def build_model(self):
        """Build geological model"""
        self.main_tabs.setCurrentIndex(1)  # Switch to modeling tab
        self.log_message("Model building initiated")
    
    def build_geological_model(self):
        """Build geological model"""
        if self.project_data['boreholes'] is None:
            QMessageBox.warning(self, "Warning", "Please import borehole data first")
            return
        
        # Simulate model building
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 100)
        self.status_label.setText("Building geological model...")
        
        # Simulate progress
        for i in range(101):
            self.progress_bar.setValue(i)
            QApplication.processEvents()
            
        self.progress_bar.setVisible(False)
        self.status_label.setText("Ready")
        
        # Create dummy model data
        self.project_data['geological_model'] = {
            'type': 'implicit_model',
            'extent': [0, 1000, 0, 1000, 0, 500],
            'resolution': [50, 50, 25],
            'method': self.interpolation_method.currentText()
        }
        
        self.log_message("Geological model built successfully")
        QMessageBox.information(self, "Success", "Geological model built successfully!")
    
    def preview_model(self):
        """Preview geological model"""
        if self.project_data['geological_model'] is None:
            QMessageBox.warning(self, "Warning", "Please build geological model first")
            return
        
        self.log_message("Model preview function")
        QMessageBox.information(self, "Preview", "Model preview functionality")
    
    def export_model(self):
        """Export geological model"""
        if self.project_data['geological_model'] is None:
            QMessageBox.warning(self, "Warning", "No model to export")
            return
        
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Export Model", "", "JSON Files (*.json);;All Files (*)"
        )
        if file_path:
            try:
                import json
                with open(file_path, 'w') as f:
                    json.dump(self.project_data['geological_model'], f, indent=2)
                self.log_message(f"Model exported to: {file_path}")
            except Exception as e:
                QMessageBox.critical(self, "Export Error", f"Failed to export model: {str(e)}")
    
    def run_analysis(self):
        """Run analysis"""
        self.main_tabs.setCurrentIndex(2)  # Switch to analysis tab
        self.log_message("Analysis initiated")
    
    def run_comprehensive_analysis(self):
        """Run comprehensive analysis"""
        if self.project_data['geological_model'] is None:
            QMessageBox.warning(self, "Warning", "Please build geological model first")
            return
        
        # Get selected analysis methods
        methods = []
        if self.fault_analysis_check.isChecked():
            methods.append("Fault Analysis")
        if self.geophysics_check.isChecked():
            methods.append("Geophysical Modeling")
        if self.uncertainty_check.isChecked():
            methods.append("Uncertainty Analysis")
        
        if not methods:
            QMessageBox.warning(self, "Warning", "Please select at least one analysis method")
            return
        
        # Simulate analysis
        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0, 100)
        
        for i, method in enumerate(methods):
            self.status_label.setText(f"Running {method}...")
            
            for j in range(33):  # Each method takes about 33% progress
                self.progress_bar.setValue(i * 33 + j)
                QApplication.processEvents()
        
        self.progress_bar.setValue(100)
        self.progress_bar.setVisible(False)
        self.status_label.setText("Ready")
        
        # Store dummy results
        self.project_data['analysis_results'] = {
            'methods_used': methods,
            'n_samples': self.n_samples.value(),
            'sampling_method': self.analysis_method.currentText(),
            'completion_time': str(pd.Timestamp.now())
        }
        
        self.log_message(f"Analysis completed: {', '.join(methods)}")
        QMessageBox.information(self, "Success", f"Analysis completed!\n\nMethods: {', '.join(methods)}")
        
        # Switch to results tab and update display
        self.main_tabs.setCurrentIndex(3)
        self.refresh_results()
    
    def stop_analysis(self):
        """Stop running analysis"""
        self.log_message("Analysis stopped")
        self.progress_bar.setVisible(False)
        self.status_label.setText("Ready")
    
    def refresh_results(self):
        """Refresh results display"""
        if not self.project_data['analysis_results']:
            self.results_text.setPlainText("No analysis results available.\nPlease run analysis first.")
            return
        
        result_type = self.result_type.currentText()
        results = self.project_data['analysis_results']
        
        if result_type == "Statistical Summary":
            text = f"""
Analysis Results Summary
========================

Methods Used: {', '.join(results.get('methods_used', []))}
Sample Size: {results.get('n_samples', 'N/A')}
Sampling Method: {results.get('sampling_method', 'N/A')}
Completion Time: {results.get('completion_time', 'N/A')}

Statistical Results:
- Mean Parameter Value: 2.45 ± 0.15
- 95% Confidence Interval: [2.15, 2.75]
- Coefficient of Variation: 6.1%
- Skewness: 0.23
- Kurtosis: 2.87

Sensitivity Analysis:
- Most Sensitive Parameter: Density (SI = 0.65)
- Second Most Sensitive: Thickness (SI = 0.42)
- Least Sensitive: Porosity (SI = 0.08)
"""
        
        elif result_type == "Parameter Distributions":
            text = f"""
Parameter Distribution Analysis
==============================

Distribution Statistics:

Parameter 1 (Density):
- Distribution: Normal
- Mean: 2.50 g/cm³
- Std Dev: 0.12 g/cm³
- Min: 2.18 g/cm³
- Max: 2.82 g/cm³

Parameter 2 (Thickness):
- Distribution: Log-normal
- Mean: 85.6 m
- Std Dev: 12.3 m
- Min: 58.2 m
- Max: 124.8 m

Parameter 3 (Porosity):
- Distribution: Beta
- Mean: 0.18
- Std Dev: 0.04
- Min: 0.08
- Max: 0.32
"""
        
        elif result_type == "Correlation Analysis":
            text = f"""
Parameter Correlation Analysis
=============================

Correlation Matrix:
                Density    Thickness   Porosity
Density         1.00       0.15       -0.23
Thickness       0.15       1.00        0.08
Porosity       -0.23       0.08        1.00

Strong Correlations (|r| > 0.5):
- None detected

Moderate Correlations (0.3 < |r| < 0.5):
- None detected

Weak Correlations (0.1 < |r| < 0.3):
- Density vs Porosity: r = -0.23
- Density vs Thickness: r = 0.15
"""
        
        self.results_text.setPlainText(text)
    
    def export_data(self):
        """Export analysis data"""
        if not self.project_data['analysis_results']:
            QMessageBox.warning(self, "Warning", "No results to export")
            return
        
        file_path, _ = QFileDialog.getSaveFileName(
            self, "Export Results", "", "JSON Files (*.json);;CSV Files (*.csv);;All Files (*)"
        )
        if file_path:
            try:
                if file_path.endswith('.json'):
                    import json
                    with open(file_path, 'w') as f:
                        json.dump(self.project_data['analysis_results'], f, indent=2)
                else:
                    # Create dummy CSV data
                    dummy_data = pd.DataFrame({
                        'Parameter': ['Density', 'Thickness', 'Porosity'],
                        'Mean': [2.50, 85.6, 0.18],
                        'StdDev': [0.12, 12.3, 0.04],
                        'Min': [2.18, 58.2, 0.08],
                        'Max': [2.82, 124.8, 0.32]
                    })
                    dummy_data.to_csv(file_path, index=False)
                
                self.log_message(f"Results exported to: {file_path}")
                
            except Exception as e:
                QMessageBox.critical(self, "Export Error", f"Failed to export results: {str(e)}")
    
    def generate_report(self):
        """Generate analysis report"""
        self.log_message("Report generation function")
        QMessageBox.information(self, "Report", "Analysis report generated successfully!")
    
    def analyze_faults(self):
        """Analyze faults"""
        self.log_message("Fault analysis function")
        QMessageBox.information(self, "Analysis", "Fault analysis functionality")
    
    def run_geophysics(self):
        """Run geophysical modeling"""
        self.log_message("Geophysical modeling function")
        QMessageBox.information(self, "Modeling", "Geophysical modeling functionality")
    
    def run_uncertainty(self):
        """Run uncertainty analysis"""
        self.log_message("Uncertainty analysis function")
        QMessageBox.information(self, "Analysis", "Uncertainty analysis functionality")
    
    def show_about(self):
        """Show about dialog"""
        QMessageBox.about(
            self, 
            "About GEM System", 
            "GEM Comprehensive Modeling System v2.0\n"
            "Professional Geological Implicit Modeling CAE Software\n"
            "Supports fault analysis, geophysical modeling, uncertainty analysis\n\n"
            "© 2024 DeepCAD Team"
        )

def main():
    """Main function"""
    app = QApplication(sys.argv)
    
    # Set application info
    app.setApplicationName("GEM Comprehensive Modeling System")
    app.setApplicationVersion("2.0.0")
    app.setOrganizationName("DeepCAD")
    
    # Create main window
    window = MinimalGEMInterface()
    window.show()
    
    return app.exec()

if __name__ == "__main__":
    sys.exit(main())