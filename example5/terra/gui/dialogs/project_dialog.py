"""
Terra 项目管理对话框
"""

import os
from pathlib import Path
from PyQt6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QGridLayout,
    QLabel, QLineEdit, QPushButton, QTextEdit,
    QFileDialog, QMessageBox, QGroupBox,
    QComboBox, QSpinBox, QCheckBox, QTabWidget
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont, QPixmap, QIcon

class NewProjectDialog(QDialog):
    """新建项目对话框"""
    
    project_created = pyqtSignal(dict)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.project_data = {}
        self.init_ui()
    
    def init_ui(self):
        """初始化界面"""
        self.setWindowTitle("新建 Terra 项目")
        self.setFixedSize(500, 600)
        self.setModal(True)
        
        layout = QVBoxLayout(self)
        
        # 标题
        title = QLabel("🎯 创建新的 Terra CAE 项目")
        title.setFont(QFont("Arial", 14, QFont.Weight.Bold))
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)
        
        # 标签页
        tabs = QTabWidget()
        
        # 基本信息标签页
        self.create_basic_info_tab(tabs)
        
        # 高级设置标签页
        self.create_advanced_settings_tab(tabs)
        
        layout.addWidget(tabs)
        
        # 按钮
        button_layout = QHBoxLayout()
        
        self.create_button = QPushButton("🚀 创建项目")
        self.create_button.clicked.connect(self.create_project)
        self.create_button.setDefault(True)
        
        cancel_button = QPushButton("❌ 取消")
        cancel_button.clicked.connect(self.reject)
        
        button_layout.addStretch()
        button_layout.addWidget(cancel_button)
        button_layout.addWidget(self.create_button)
        
        layout.addLayout(button_layout)
        
        # 设置样式
        self.setStyleSheet("""
            QDialog {
                background-color: #2b2b2b;
                color: #ffffff;
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
            QLineEdit, QTextEdit, QComboBox, QSpinBox {
                background-color: #404040;
                border: 1px solid #666666;
                border-radius: 3px;
                padding: 5px;
                color: #ffffff;
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
    
    def create_basic_info_tab(self, tabs):
        """创建基本信息标签页"""
        tab = QDialog()
        layout = QVBoxLayout(tab)
        
        # 项目信息组
        project_group = QGroupBox("📋 项目信息")
        project_layout = QGridLayout(project_group)
        
        # 项目名称
        project_layout.addWidget(QLabel("项目名称:"), 0, 0)
        self.project_name = QLineEdit()
        self.project_name.setPlaceholderText("例如: 深基坑开挖分析")
        project_layout.addWidget(self.project_name, 0, 1)
        
        # 项目描述
        project_layout.addWidget(QLabel("项目描述:"), 1, 0)
        self.project_description = QTextEdit()
        self.project_description.setMaximumHeight(100)
        self.project_description.setPlaceholderText("简要描述项目的目标和内容...")
        project_layout.addWidget(self.project_description, 1, 1)
        
        # 项目位置
        project_layout.addWidget(QLabel("保存位置:"), 2, 0)
        location_layout = QHBoxLayout()
        self.project_location = QLineEdit()
        self.project_location.setText(str(Path.home() / "Terra_Projects"))
        location_layout.addWidget(self.project_location)
        
        browse_button = QPushButton("📁 浏览")
        browse_button.clicked.connect(self.browse_location)
        location_layout.addWidget(browse_button)
        project_layout.addLayout(location_layout, 2, 1)
        
        layout.addWidget(project_group)
        
        # 分析类型组
        analysis_group = QGroupBox("🔬 分析类型")
        analysis_layout = QGridLayout(analysis_group)
        
        analysis_layout.addWidget(QLabel("主要分析:"), 0, 0)
        self.analysis_type = QComboBox()
        self.analysis_type.addItems([
            "🏗️ 结构力学分析",
            "🌊 渗流分析", 
            "⚡ 流固耦合",
            "🔥 传热分析",
            "🔬 多物理场耦合"
        ])
        analysis_layout.addWidget(self.analysis_type, 0, 1)
        
        analysis_layout.addWidget(QLabel("求解器:"), 1, 0)
        self.solver_type = QComboBox()
        self.solver_type.addItems([
            "Kratos Multiphysics",
            "模拟求解器"
        ])
        analysis_layout.addWidget(self.solver_type, 1, 1)
        
        layout.addWidget(analysis_group)
        
        layout.addStretch()
        tabs.addTab(tab, "基本信息")
    
    def create_advanced_settings_tab(self, tabs):
        """创建高级设置标签页"""
        tab = QDialog()
        layout = QVBoxLayout(tab)
        
        # 单位系统组
        units_group = QGroupBox("📏 单位系统")
        units_layout = QGridLayout(units_group)
        
        units_layout.addWidget(QLabel("长度单位:"), 0, 0)
        self.length_unit = QComboBox()
        self.length_unit.addItems(["米 (m)", "毫米 (mm)", "厘米 (cm)"])
        units_layout.addWidget(self.length_unit, 0, 1)
        
        units_layout.addWidget(QLabel("力单位:"), 1, 0)
        self.force_unit = QComboBox()
        self.force_unit.addItems(["牛顿 (N)", "千牛 (kN)", "兆牛 (MN)"])
        units_layout.addWidget(self.force_unit, 1, 1)
        
        units_layout.addWidget(QLabel("应力单位:"), 2, 0)
        self.stress_unit = QComboBox()
        self.stress_unit.addItems(["帕斯卡 (Pa)", "千帕 (kPa)", "兆帕 (MPa)"])
        units_layout.addWidget(self.stress_unit, 2, 1)
        
        layout.addWidget(units_group)
        
        # 计算设置组
        compute_group = QGroupBox("⚙️ 计算设置")
        compute_layout = QGridLayout(compute_group)
        
        compute_layout.addWidget(QLabel("并行线程数:"), 0, 0)
        self.thread_count = QSpinBox()
        self.thread_count.setRange(1, 32)
        self.thread_count.setValue(4)
        compute_layout.addWidget(self.thread_count, 0, 1)
        
        compute_layout.addWidget(QLabel("求解精度:"), 1, 0)
        self.solver_tolerance = QComboBox()
        self.solver_tolerance.addItems([
            "高精度 (1e-8)",
            "标准 (1e-6)", 
            "快速 (1e-4)"
        ])
        self.solver_tolerance.setCurrentIndex(1)
        compute_layout.addWidget(self.solver_tolerance, 1, 1)
        
        # 输出选项
        self.enable_vtk_output = QCheckBox("生成 VTK 输出文件")
        self.enable_vtk_output.setChecked(True)
        compute_layout.addWidget(self.enable_vtk_output, 2, 0, 1, 2)
        
        self.enable_log_output = QCheckBox("详细日志输出")
        self.enable_log_output.setChecked(True)
        compute_layout.addWidget(self.enable_log_output, 3, 0, 1, 2)
        
        layout.addWidget(compute_group)
        
        layout.addStretch()
        tabs.addTab(tab, "高级设置")
    
    def browse_location(self):
        """浏览保存位置"""
        folder = QFileDialog.getExistingDirectory(
            self, 
            "选择项目保存位置",
            self.project_location.text()
        )
        if folder:
            self.project_location.setText(folder)
    
    def create_project(self):
        """创建项目"""
        # 验证输入
        if not self.project_name.text().strip():
            QMessageBox.warning(self, "警告", "请输入项目名称！")
            return
        
        if not self.project_location.text().strip():
            QMessageBox.warning(self, "警告", "请选择项目保存位置！")
            return
        
        # 收集项目数据
        self.project_data = {
            "name": self.project_name.text().strip(),
            "description": self.project_description.toPlainText().strip(),
            "location": self.project_location.text().strip(),
            "analysis_type": self.analysis_type.currentText(),
            "solver_type": self.solver_type.currentText(),
            "units": {
                "length": self.length_unit.currentText(),
                "force": self.force_unit.currentText(),
                "stress": self.stress_unit.currentText()
            },
            "settings": {
                "thread_count": self.thread_count.value(),
                "solver_tolerance": self.solver_tolerance.currentText(),
                "enable_vtk": self.enable_vtk_output.isChecked(),
                "enable_log": self.enable_log_output.isChecked()
            }
        }
        
        # 创建项目目录
        try:
            project_path = Path(self.project_data["location"]) / self.project_data["name"]
            project_path.mkdir(parents=True, exist_ok=True)
            
            # 创建子目录
            (project_path / "geometry").mkdir(exist_ok=True)
            (project_path / "mesh").mkdir(exist_ok=True)
            (project_path / "simulation").mkdir(exist_ok=True)
            (project_path / "results").mkdir(exist_ok=True)
            
            self.project_data["project_path"] = str(project_path)
            
            QMessageBox.information(self, "成功", f"项目 '{self.project_data['name']}' 创建成功！")
            
            self.project_created.emit(self.project_data)
            self.accept()
            
        except Exception as e:
            QMessageBox.critical(self, "错误", f"创建项目失败：{e}")


class OpenProjectDialog(QDialog):
    """打开项目对话框"""
    
    project_opened = pyqtSignal(str)
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.init_ui()
    
    def init_ui(self):
        """初始化界面"""
        self.setWindowTitle("打开 Terra 项目")
        self.setFixedSize(400, 200)
        self.setModal(True)
        
        layout = QVBoxLayout(self)
        
        # 标题
        title = QLabel("📂 打开现有项目")
        title.setFont(QFont("Arial", 12, QFont.Weight.Bold))
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(title)
        
        # 文件选择
        file_layout = QHBoxLayout()
        file_layout.addWidget(QLabel("项目文件:"))
        
        self.file_path = QLineEdit()
        self.file_path.setPlaceholderText("选择 .terra 项目文件...")
        file_layout.addWidget(self.file_path)
        
        browse_button = QPushButton("📁 浏览")
        browse_button.clicked.connect(self.browse_file)
        file_layout.addWidget(browse_button)
        
        layout.addLayout(file_layout)
        
        # 按钮
        button_layout = QHBoxLayout()
        
        open_button = QPushButton("📂 打开")
        open_button.clicked.connect(self.open_project)
        open_button.setDefault(True)
        
        cancel_button = QPushButton("❌ 取消")
        cancel_button.clicked.connect(self.reject)
        
        button_layout.addStretch()
        button_layout.addWidget(cancel_button)
        button_layout.addWidget(open_button)
        
        layout.addLayout(button_layout)
        
        # 设置样式
        self.setStyleSheet("""
            QDialog {
                background-color: #2b2b2b;
                color: #ffffff;
            }
            QLineEdit {
                background-color: #404040;
                border: 1px solid #666666;
                border-radius: 3px;
                padding: 5px;
                color: #ffffff;
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
        """)
    
    def browse_file(self):
        """浏览文件"""
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "选择项目文件",
            str(Path.home()),
            "Terra 项目文件 (*.terra);;所有文件 (*)"
        )
        if file_path:
            self.file_path.setText(file_path)
    
    def open_project(self):
        """打开项目"""
        file_path = self.file_path.text().strip()
        if not file_path:
            QMessageBox.warning(self, "警告", "请选择项目文件！")
            return
        
        if not Path(file_path).exists():
            QMessageBox.warning(self, "警告", "项目文件不存在！")
            return
        
        self.project_opened.emit(file_path)
        self.accept()