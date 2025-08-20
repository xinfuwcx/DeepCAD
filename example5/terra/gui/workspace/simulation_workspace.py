"""
Terra 仿真工作空间
集成 Kratos 求解器的计算分析界面
"""

import logging
from PyQt6.QtWidgets import (QWidget, QVBoxLayout, QHBoxLayout, QGridLayout,
                            QLabel, QComboBox, QPushButton, QGroupBox, 
                            QSpinBox, QDoubleSpinBox, QTextEdit, QProgressBar,
                            QTabWidget, QTableWidget, QTableWidgetItem,
                            QSplitter, QScrollArea, QFrame)
from PyQt6.QtCore import Qt, QThread, pyqtSignal
from PyQt6.QtGui import QFont, QPalette

from core.kratos_interface import KratosInterface

logger = logging.getLogger(__name__)

class SimulationThread(QThread):
    """仿真计算线程"""
    
    progress_updated = pyqtSignal(int)
    results_ready = pyqtSignal(dict)
    error_occurred = pyqtSignal(str)
    
    def __init__(self, kratos_interface, analysis_setup):
        super().__init__()
        self.kratos_interface = kratos_interface
        self.analysis_setup = analysis_setup
    
    def run(self):
        """运行仿真"""
        try:
            results = self.kratos_interface.run_analysis(self.analysis_setup)
            self.results_ready.emit(results)
        except Exception as e:
            self.error_occurred.emit(str(e))

class SimulationWorkspace(QWidget):
    """仿真工作空间"""
    
    def __init__(self, gmsh_engine=None, kratos_interface=None):
        super().__init__()
        self.gmsh_engine = gmsh_engine
        self.kratos_interface = kratos_interface or KratosInterface()
        self.simulation_thread = None
        self.current_results = None
        
        self.init_ui()
        self.connect_signals()
        
        logger.info("仿真工作空间初始化完成")
    
    def init_ui(self):
        """初始化用户界面"""
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 创建分割器
        splitter = QSplitter(Qt.Orientation.Horizontal)
        layout.addWidget(splitter)
        
        # 左侧控制面板
        self.create_control_panel(splitter)
        
        # 右侧结果面板
        self.create_results_panel(splitter)
        
        # 设置分割比例
        splitter.setSizes([300, 500])
    
    def create_control_panel(self, parent):
        """创建控制面板"""
        control_widget = QWidget()
        layout = QVBoxLayout(control_widget)
        
        # 标题
        title = QLabel("🔬 仿真分析")
        title.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        layout.addWidget(title)
        
        # 分析类型选择
        analysis_group = QGroupBox("分析类型")
        analysis_layout = QVBoxLayout(analysis_group)
        
        self.analysis_type_combo = QComboBox()
        analysis_types = self.kratos_interface.get_available_analysis_types()
        for analysis_type in analysis_types:
            display_name = self.get_analysis_display_name(analysis_type)
            self.analysis_type_combo.addItem(display_name, analysis_type)
        analysis_layout.addWidget(self.analysis_type_combo)
        
        layout.addWidget(analysis_group)
        
        # 材料设置
        self.create_material_section(layout)
        
        # 边界条件
        self.create_boundary_conditions_section(layout)
        
        # 求解器设置
        self.create_solver_settings_section(layout)
        
        # 控制按钮
        self.create_control_buttons(layout)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        layout.addWidget(self.progress_bar)
        
        layout.addStretch()
        
        parent.addWidget(control_widget)
    
    def create_material_section(self, layout):
        """创建材料设置区域"""
        material_group = QGroupBox("材料参数")
        material_layout = QGridLayout(material_group)
        
        # 材料模板选择
        material_layout.addWidget(QLabel("材料模板:"), 0, 0)
        self.material_combo = QComboBox()
        templates = self.kratos_interface.get_material_templates()
        for key, template in templates.items():
            self.material_combo.addItem(template["name"], key)
        material_layout.addWidget(self.material_combo, 0, 1)
        
        # 密度
        material_layout.addWidget(QLabel("密度 (kg/m³):"), 1, 0)
        self.density_spin = QDoubleSpinBox()
        self.density_spin.setRange(100, 10000)
        self.density_spin.setValue(2400)
        self.density_spin.setSuffix(" kg/m³")
        material_layout.addWidget(self.density_spin, 1, 1)
        
        # 弹性模量
        material_layout.addWidget(QLabel("弹性模量 (Pa):"), 2, 0)
        self.young_modulus_spin = QDoubleSpinBox()
        self.young_modulus_spin.setRange(1e6, 1e12)
        self.young_modulus_spin.setValue(30e9)
        self.young_modulus_spin.setDecimals(0)
        self.young_modulus_spin.setSuffix(" Pa")
        material_layout.addWidget(self.young_modulus_spin, 2, 1)
        
        # 泊松比
        material_layout.addWidget(QLabel("泊松比:"), 3, 0)
        self.poisson_spin = QDoubleSpinBox()
        self.poisson_spin.setRange(0.0, 0.5)
        self.poisson_spin.setValue(0.2)
        self.poisson_spin.setDecimals(3)
        material_layout.addWidget(self.poisson_spin, 3, 1)
        
        # 连接材料模板变化
        self.material_combo.currentTextChanged.connect(self.on_material_template_changed)
        
        layout.addWidget(material_group)
    
    def create_boundary_conditions_section(self, layout):
        """创建边界条件区域"""
        bc_group = QGroupBox("边界条件")
        bc_layout = QVBoxLayout(bc_group)
        
        # 简化的边界条件设置
        bc_layout.addWidget(QLabel("约束类型:"))
        self.constraint_combo = QComboBox()
        self.constraint_combo.addItems([
            "固定约束 (底部)",
            "滑动约束 (侧面)",
            "自由边界 (顶部)"
        ])
        bc_layout.addWidget(self.constraint_combo)
        
        bc_layout.addWidget(QLabel("荷载类型:"))
        self.load_combo = QComboBox()
        self.load_combo.addItems([
            "重力荷载",
            "均布荷载",
            "集中荷载"
        ])
        bc_layout.addWidget(self.load_combo)
        
        # 荷载大小
        load_layout = QHBoxLayout()
        load_layout.addWidget(QLabel("荷载值:"))
        self.load_value_spin = QDoubleSpinBox()
        self.load_value_spin.setRange(-1e6, 1e6)
        self.load_value_spin.setValue(-10000)  # 默认重力加速度
        self.load_value_spin.setSuffix(" N/m³")
        load_layout.addWidget(self.load_value_spin)
        bc_layout.addLayout(load_layout)
        
        layout.addWidget(bc_group)
    
    def create_solver_settings_section(self, layout):
        """创建求解器设置区域"""
        solver_group = QGroupBox("求解器设置")
        solver_layout = QGridLayout(solver_group)
        
        # 求解器类型显示
        solver_layout.addWidget(QLabel("求解器:"), 0, 0)
        solver_status = "Kratos 可用" if self.kratos_interface.is_available() else "模拟求解器"
        self.solver_label = QLabel(solver_status)
        solver_layout.addWidget(self.solver_label, 0, 1)
        
        # 最大迭代次数
        solver_layout.addWidget(QLabel("最大迭代:"), 1, 0)
        self.max_iterations_spin = QSpinBox()
        self.max_iterations_spin.setRange(1, 10000)
        self.max_iterations_spin.setValue(100)
        solver_layout.addWidget(self.max_iterations_spin, 1, 1)
        
        # 收敛容差
        solver_layout.addWidget(QLabel("收敛容差:"), 2, 0)
        self.tolerance_spin = QDoubleSpinBox()
        self.tolerance_spin.setRange(1e-12, 1e-3)
        self.tolerance_spin.setValue(1e-6)
        self.tolerance_spin.setDecimals(8)
        solver_layout.addWidget(self.tolerance_spin, 2, 1)
        
        layout.addWidget(solver_group)
    
    def create_control_buttons(self, layout):
        """创建控制按钮"""
        button_layout = QHBoxLayout()
        
        # 运行分析按钮
        self.run_button = QPushButton("🚀 运行分析")
        self.run_button.clicked.connect(self.run_simulation)
        button_layout.addWidget(self.run_button)
        
        # 停止分析按钮
        self.stop_button = QPushButton("⏹ 停止")
        self.stop_button.setEnabled(False)
        self.stop_button.clicked.connect(self.stop_simulation)
        button_layout.addWidget(self.stop_button)
        
        layout.addLayout(button_layout)
    
    def create_results_panel(self, parent):
        """创建结果面板"""
        results_widget = QWidget()
        layout = QVBoxLayout(results_widget)
        
        # 标题
        title = QLabel("📊 分析结果")
        title.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        layout.addWidget(title)
        
        # 结果标签页
        self.results_tabs = QTabWidget()
        
        # 概览标签页
        self.create_overview_tab()
        
        # 数据标签页
        self.create_data_tab()
        
        # 日志标签页
        self.create_log_tab()
        
        layout.addWidget(self.results_tabs)
        
        parent.addWidget(results_widget)
    
    def create_overview_tab(self):
        """创建概览标签页"""
        overview_widget = QWidget()
        layout = QVBoxLayout(overview_widget)
        
        # 结果摘要
        self.results_summary = QTextEdit()
        self.results_summary.setReadOnly(True)
        self.results_summary.setMaximumHeight(200)
        self.results_summary.setPlainText("等待分析运行...")
        layout.addWidget(self.results_summary)
        
        # 3D 视图占位符
        view_frame = QFrame()
        view_frame.setFrameStyle(QFrame.Shape.Box)
        view_frame.setMinimumHeight(300)
        view_layout = QVBoxLayout(view_frame)
        view_layout.addWidget(QLabel("3D 结果视图\n(待实现)", alignment=Qt.AlignmentFlag.AlignCenter))
        layout.addWidget(view_frame)
        
        self.results_tabs.addTab(overview_widget, "概览")
    
    def create_data_tab(self):
        """创建数据标签页"""
        data_widget = QWidget()
        layout = QVBoxLayout(data_widget)
        
        # 数据表格
        self.results_table = QTableWidget()
        self.results_table.setColumnCount(3)
        self.results_table.setHorizontalHeaderLabels(["参数", "数值", "单位"])
        layout.addWidget(self.results_table)
        
        self.results_tabs.addTab(data_widget, "数据")
    
    def create_log_tab(self):
        """创建日志标签页"""
        log_widget = QWidget()
        layout = QVBoxLayout(log_widget)
        
        # 日志文本
        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        self.log_text.setFont(QFont("Consolas", 9))
        layout.addWidget(self.log_text)
        
        self.results_tabs.addTab(log_widget, "日志")
    
    def connect_signals(self):
        """连接信号槽"""
        if self.kratos_interface:
            self.kratos_interface.solver_started.connect(self.on_simulation_started)
            self.kratos_interface.solver_finished.connect(self.on_simulation_finished)
            self.kratos_interface.solver_progress.connect(self.on_simulation_progress)
            self.kratos_interface.solver_error.connect(self.on_simulation_error)
    
    def get_analysis_display_name(self, analysis_type: str) -> str:
        """获取分析类型显示名称"""
        display_names = {
            "linear_elastic": "线弹性分析",
            "static": "静态分析",
            "dynamic": "动态分析",
            "nonlinear": "非线性分析",
            "eigenvalue": "特征值分析",
            "contact": "接触分析",
            "geomechanics": "地质力学分析"
        }
        return display_names.get(analysis_type, analysis_type)
    
    def on_material_template_changed(self):
        """材料模板变化时更新参数"""
        template_key = self.material_combo.currentData()
        if template_key:
            templates = self.kratos_interface.get_material_templates()
            template = templates.get(template_key, {})
            
            self.density_spin.setValue(template.get("density", 2400))
            self.young_modulus_spin.setValue(template.get("young_modulus", 30e9))
            self.poisson_spin.setValue(template.get("poisson_ratio", 0.2))
    
    def run_simulation(self):
        """运行仿真"""
        try:
            # 收集几何数据
            geometry_data = {}
            if self.gmsh_engine:
                geometry_data = {
                    "entities": self.gmsh_engine.get_geometry_entities(),
                    "mesh_info": self.gmsh_engine.get_mesh_info()
                }
            
            # 收集材料数据
            material_data = {
                "materials": {
                    "1": {
                        "model_part_name": "Structure",
                        "properties": [{
                            "model_part_name": "Structure",
                            "properties_id": 1,
                            "material_id": 1
                        }],
                        "material": {
                            "constitutive_law": {
                                "name": "LinearElasticPlaneStress2DLaw"
                            },
                            "properties": {
                                "DENSITY": self.density_spin.value(),
                                "YOUNG_MODULUS": self.young_modulus_spin.value(),
                                "POISSON_RATIO": self.poisson_spin.value()
                            }
                        }
                    }
                }
            }
            
            # 创建分析设置
            analysis_type = self.analysis_type_combo.currentData()
            analysis_setup = self.kratos_interface.create_analysis_setup(
                geometry_data=geometry_data,
                material_data=material_data,
                analysis_type=analysis_type
            )
            
            # 在线程中运行仿真
            self.simulation_thread = SimulationThread(self.kratos_interface, analysis_setup)
            self.simulation_thread.progress_updated.connect(self.on_simulation_progress)
            self.simulation_thread.results_ready.connect(self.on_simulation_finished)
            self.simulation_thread.error_occurred.connect(self.on_simulation_error)
            self.simulation_thread.start()
            
            # 更新 UI 状态
            self.run_button.setEnabled(False)
            self.stop_button.setEnabled(True)
            self.progress_bar.setVisible(True)
            self.progress_bar.setValue(0)
            
            self.log_text.append("🚀 开始仿真分析...")
            
        except Exception as e:
            self.log_text.append(f"❌ 仿真启动失败: {e}")
            logger.error(f"仿真启动失败: {e}")
    
    def stop_simulation(self):
        """停止仿真"""
        if self.simulation_thread and self.simulation_thread.isRunning():
            self.simulation_thread.terminate()
            self.simulation_thread.wait()
            
        self.on_simulation_stopped()
    
    def on_simulation_started(self):
        """仿真开始"""
        self.log_text.append("⚡ 求解器已启动")
    
    def on_simulation_progress(self, progress: int):
        """仿真进度更新"""
        self.progress_bar.setValue(progress)
        if progress % 20 == 0:
            self.log_text.append(f"🔄 计算进度: {progress}%")
    
    def on_simulation_finished(self, results: dict):
        """仿真完成"""
        self.current_results = results
        
        # 更新结果摘要
        summary = f"""✅ 分析完成
        
分析类型: {self.get_analysis_display_name(results.get('analysis_type', '未知'))}
求解器: {results.get('solver_type', '未知')}
节点数: {results.get('num_nodes', 0):,}
单元数: {results.get('num_elements', 0):,}
最大位移: {results.get('max_displacement', 0):.6f} m
最大应力: {results.get('max_stress', 0):,.0f} Pa
计算时间: {results.get('solve_time', 0):.2f} 秒
状态: {results.get('status', '未知')}"""
        
        self.results_summary.setPlainText(summary)
        
        # 更新数据表格
        self.update_results_table(results)
        
        # 更新日志
        self.log_text.append("✅ 仿真分析完成")
        self.log_text.append(f"📊 结果: {results.get('num_nodes', 0)} 节点, {results.get('num_elements', 0)} 单元")
        
        # 恢复 UI 状态
        self.on_simulation_stopped()
    
    def on_simulation_error(self, error_msg: str):
        """仿真错误"""
        self.log_text.append(f"❌ 仿真错误: {error_msg}")
        self.results_summary.setPlainText(f"❌ 分析失败\n错误: {error_msg}")
        
        # 恢复 UI 状态
        self.on_simulation_stopped()
    
    def on_simulation_stopped(self):
        """仿真停止（完成或错误）"""
        self.run_button.setEnabled(True)
        self.stop_button.setEnabled(False)
        self.progress_bar.setVisible(False)
        
        if self.simulation_thread:
            self.simulation_thread = None
    
    def update_results_table(self, results: dict):
        """更新结果表格"""
        data_items = [
            ("节点数", results.get('num_nodes', 0), "个"),
            ("单元数", results.get('num_elements', 0), "个"),
            ("最大位移", f"{results.get('max_displacement', 0):.6f}", "m"),
            ("最大应力", f"{results.get('max_stress', 0):,.0f}", "Pa"),
            ("计算时间", f"{results.get('solve_time', 0):.2f}", "秒")
        ]
        
        self.results_table.setRowCount(len(data_items))
        
        for row, (param, value, unit) in enumerate(data_items):
            self.results_table.setItem(row, 0, QTableWidgetItem(param))
            self.results_table.setItem(row, 1, QTableWidgetItem(str(value)))
            self.results_table.setItem(row, 2, QTableWidgetItem(unit))
        
        self.results_table.resizeColumnsToContents()
    
    def get_property_widgets(self):
        return []