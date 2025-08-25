# SimPEG 专业地球物理界面主程序
# Example 8: Complete SimPEG Interface Implementation

import sys
import os
from pathlib import Path

# 添加项目路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))
sys.path.insert(0, str(current_dir.parent))

from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QHBoxLayout, QWidget
from PyQt6.QtWidgets import QTabWidget, QSplitter, QTreeWidget, QTreeWidgetItem
from PyQt6.QtWidgets import QMenuBar, QToolBar, QStatusBar, QProgressBar, QLabel
from PyQt6.QtWidgets import QDockWidget, QTextEdit, QPushButton, QGroupBox
from PyQt6.QtCore import Qt, QTimer, pyqtSignal
from PyQt6.QtGui import QAction, QIcon

import numpy as np
import pyvista as pv
from pyvistaqt import QtInteractor
import matplotlib.pyplot as plt
from matplotlib.backends.backend_qt5agg import FigureCanvasQTAgg as FigureCanvas

class SimPEGMainWindow(QMainWindow):
    """SimPEG 专业地球物理界面主窗口"""
    
    def __init__(self):
        super().__init__()
        self.setWindowTitle("DeepCAD - SimPEG 专业地球物理界面")
        self.setGeometry(100, 100, 1600, 1000)
        
        # 初始化组件
        self.setup_menubar()
        self.setup_toolbar()
        self.setup_central_widget()
        self.setup_dock_widgets()
        self.setup_statusbar()
        
        # 初始化数据
        self.current_project = None
        self.current_method = None
        
    def setup_menubar(self):
        """设置菜单栏"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu('文件(&F)')
        file_menu.addAction('新建项目', self.new_project)
        file_menu.addAction('打开项目', self.open_project)
        file_menu.addAction('保存项目', self.save_project)
        file_menu.addSeparator()
        file_menu.addAction('导入数据', self.import_data)
        file_menu.addAction('导出结果', self.export_results)
        file_menu.addSeparator()
        file_menu.addAction('退出', self.close)
        
        # 编辑菜单
        edit_menu = menubar.addMenu('编辑(&E)')
        edit_menu.addAction('撤销', self.undo)
        edit_menu.addAction('重做', self.redo)
        edit_menu.addSeparator()
        edit_menu.addAction('项目设置', self.project_settings)
        
        # 地球物理方法菜单
        methods_menu = menubar.addMenu('方法(&M)')
        methods_menu.addAction('重力方法', lambda: self.select_method('gravity'))
        methods_menu.addAction('磁法', lambda: self.select_method('magnetics'))
        methods_menu.addAction('直流电法', lambda: self.select_method('dc_resistivity'))
        methods_menu.addAction('频率域电磁法', lambda: self.select_method('frequency_em'))
        methods_menu.addAction('时间域电磁法', lambda: self.select_method('time_em'))
        methods_menu.addAction('大地电磁法', lambda: self.select_method('magnetotellurics'))
        
        # 计算菜单
        compute_menu = menubar.addMenu('计算(&C)')
        compute_menu.addAction('正演建模', self.run_forward)
        compute_menu.addAction('反演计算', self.run_inversion)
        compute_menu.addAction('敏感性分析', self.sensitivity_analysis)
        
        # 视图菜单
        view_menu = menubar.addMenu('视图(&V)')
        view_menu.addAction('重置布局', self.reset_layout)
        view_menu.addAction('全屏模式', self.toggle_fullscreen)
        
        # 帮助菜单
        help_menu = menubar.addMenu('帮助(&H)')
        help_menu.addAction('用户手册', self.show_help)
        help_menu.addAction('关于', self.show_about)
        
    def setup_toolbar(self):
        """设置工具栏"""
        toolbar = self.addToolBar('主工具栏')
        
        # 项目操作
        toolbar.addAction('新建', self.new_project)
        toolbar.addAction('打开', self.open_project)
        toolbar.addAction('保存', self.save_project)
        toolbar.addSeparator()
        
        # 计算操作
        toolbar.addAction('正演', self.run_forward)
        toolbar.addAction('反演', self.run_inversion)
        toolbar.addSeparator()
        
        # 视图操作
        toolbar.addAction('重置视图', self.reset_view)
        toolbar.addAction('适应窗口', self.fit_view)
        
    def setup_central_widget(self):
        """设置中央工作区"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 创建主要的标签页控件
        self.tab_widget = QTabWidget()
        
        # 项目管理标签页
        self.project_tab = self.create_project_tab()
        self.tab_widget.addTab(self.project_tab, "项目管理")
        
        # 网格设计标签页
        self.mesh_tab = self.create_mesh_tab()
        self.tab_widget.addTab(self.mesh_tab, "网格设计")
        
        # 观测系统标签页
        self.survey_tab = self.create_survey_tab()
        self.tab_widget.addTab(self.survey_tab, "观测系统")
        
        # 正演建模标签页
        self.forward_tab = self.create_forward_tab()
        self.tab_widget.addTab(self.forward_tab, "正演建模")
        
        # 反演计算标签页
        self.inversion_tab = self.create_inversion_tab()
        self.tab_widget.addTab(self.inversion_tab, "反演计算")
        
        # 结果分析标签页
        self.results_tab = self.create_results_tab()
        self.tab_widget.addTab(self.results_tab, "结果分析")
        
        # 设置布局
        layout = QVBoxLayout()
        layout.addWidget(self.tab_widget)
        central_widget.setLayout(layout)
        
    def create_project_tab(self):
        """创建项目管理标签页"""
        widget = QWidget()
        layout = QVBoxLayout()
        
        # 项目信息组
        project_group = QGroupBox("项目信息")
        project_layout = QVBoxLayout()
        
        self.project_tree = QTreeWidget()
        self.project_tree.setHeaderLabels(["项目组件", "状态", "描述"])
        
        # 添加项目树节点
        self.populate_project_tree()
        
        project_layout.addWidget(self.project_tree)
        project_group.setLayout(project_layout)
        layout.addWidget(project_group)
        
        # 方法选择组
        method_group = QGroupBox("地球物理方法选择")
        method_layout = QVBoxLayout()
        
        methods = ["重力方法", "磁法", "直流电法", "频率域电磁法", "时间域电磁法", "大地电磁法"]
        for method in methods:
            btn = QPushButton(method)
            btn.clicked.connect(lambda checked, m=method: self.select_method(m))
            method_layout.addWidget(btn)
            
        method_group.setLayout(method_layout)
        layout.addWidget(method_group)
        
        widget.setLayout(layout)
        return widget
        
    def create_mesh_tab(self):
        """创建网格设计标签页"""
        widget = QWidget()
        layout = QHBoxLayout()
        
        # 左侧参数面板
        params_widget = QWidget()
        params_layout = QVBoxLayout()
        
        # 网格类型选择
        mesh_group = QGroupBox("网格类型")
        mesh_layout = QVBoxLayout()
        mesh_types = ["张量网格 (TensorMesh)", "树形网格 (TreeMesh)", "曲线网格 (CurvilinearMesh)"]
        for mesh_type in mesh_types:
            btn = QPushButton(mesh_type)
            mesh_layout.addWidget(btn)
        mesh_group.setLayout(mesh_layout)
        params_layout.addWidget(mesh_group)
        
        params_widget.setLayout(params_layout)
        layout.addWidget(params_widget, 1)
        
        # 右侧3D可视化
        self.mesh_visualizer = QtInteractor(widget)
        layout.addWidget(self.mesh_visualizer, 3)
        
        widget.setLayout(layout)
        return widget
        
    def create_survey_tab(self):
        """创建观测系统标签页"""
        widget = QWidget()
        layout = QHBoxLayout()
        
        # 左侧参数面板
        params_widget = QWidget()
        params_layout = QVBoxLayout()
        
        # 观测类型选择
        survey_group = QGroupBox("观测系统设计")
        survey_layout = QVBoxLayout()
        
        survey_types = ["重力测点布设", "磁测剖面设计", "电法排列设计", "电磁法观测系统"]
        for survey_type in survey_types:
            btn = QPushButton(survey_type)
            survey_layout.addWidget(btn)
            
        survey_group.setLayout(survey_layout)
        params_layout.addWidget(survey_group)
        
        params_widget.setLayout(params_layout)
        layout.addWidget(params_widget, 1)
        
        # 右侧可视化
        self.survey_visualizer = QtInteractor(widget)
        layout.addWidget(self.survey_visualizer, 3)
        
        widget.setLayout(layout)
        return widget
        
    def create_forward_tab(self):
        """创建正演建模标签页"""
        widget = QWidget()
        layout = QHBoxLayout()
        
        # 左侧参数面板
        params_widget = QWidget()
        params_layout = QVBoxLayout()
        
        # 物性模型设置
        model_group = QGroupBox("物性模型")
        model_layout = QVBoxLayout()
        
        btn_import = QPushButton("导入物性模型")
        btn_create = QPushButton("创建初始模型")
        btn_gempy = QPushButton("从GemPy导入")
        
        model_layout.addWidget(btn_import)
        model_layout.addWidget(btn_create)
        model_layout.addWidget(btn_gempy)
        
        model_group.setLayout(model_layout)
        params_layout.addWidget(model_group)
        
        # 正演计算设置
        forward_group = QGroupBox("正演计算")
        forward_layout = QVBoxLayout()
        
        btn_setup = QPushButton("设置正演参数")
        btn_run = QPushButton("运行正演")
        btn_save = QPushButton("保存结果")
        
        forward_layout.addWidget(btn_setup)
        forward_layout.addWidget(btn_run)
        forward_layout.addWidget(btn_save)
        
        forward_group.setLayout(forward_layout)
        params_layout.addWidget(forward_group)
        
        params_widget.setLayout(params_layout)
        layout.addWidget(params_widget, 1)
        
        # 右侧结果显示
        self.forward_visualizer = QtInteractor(widget)
        layout.addWidget(self.forward_visualizer, 3)
        
        widget.setLayout(layout)
        return widget
        
    def create_inversion_tab(self):
        """创建反演计算标签页"""
        widget = QWidget()
        layout = QHBoxLayout()
        
        # 左侧参数面板
        params_widget = QWidget()
        params_layout = QVBoxLayout()
        
        # 反演策略
        inversion_group = QGroupBox("反演策略")
        inversion_layout = QVBoxLayout()
        
        strategies = ["最小二乘反演", "稳健反演", "联合反演", "协作反演"]
        for strategy in strategies:
            btn = QPushButton(strategy)
            inversion_layout.addWidget(btn)
            
        inversion_group.setLayout(inversion_layout)
        params_layout.addWidget(inversion_group)
        
        # 正则化设置
        reg_group = QGroupBox("正则化")
        reg_layout = QVBoxLayout()
        
        reg_types = ["平滑约束", "小性约束", "总变分约束", "交叉梯度约束"]
        for reg_type in reg_types:
            btn = QPushButton(reg_type)
            reg_layout.addWidget(btn)
            
        reg_group.setLayout(reg_layout)
        params_layout.addWidget(reg_group)
        
        params_widget.setLayout(params_layout)
        layout.addWidget(params_widget, 1)
        
        # 右侧监控面板
        monitor_widget = QWidget()
        monitor_layout = QVBoxLayout()
        
        # 进度监控
        self.progress_group = QGroupBox("反演进度")
        progress_layout = QVBoxLayout()
        
        self.progress_bar = QProgressBar()
        self.misfit_label = QLabel("数据拟合差: --")
        self.iteration_label = QLabel("迭代次数: --")
        
        progress_layout.addWidget(self.progress_bar)
        progress_layout.addWidget(self.misfit_label)
        progress_layout.addWidget(self.iteration_label)
        
        self.progress_group.setLayout(progress_layout)
        monitor_layout.addWidget(self.progress_group)
        
        # 收敛曲线
        self.convergence_canvas = FigureCanvas(plt.figure(figsize=(8, 4)))
        monitor_layout.addWidget(self.convergence_canvas)
        
        monitor_widget.setLayout(monitor_layout)
        layout.addWidget(monitor_widget, 3)
        
        widget.setLayout(layout)
        return widget
        
    def create_results_tab(self):
        """创建结果分析标签页"""
        widget = QWidget()
        layout = QVBoxLayout()
        
        # 结果显示区域
        splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # 3D模型显示
        self.results_3d = QtInteractor(widget)
        splitter.addWidget(self.results_3d)
        
        # 2D剖面和统计
        results_2d_widget = QWidget()
        results_2d_layout = QVBoxLayout()
        
        # 数据拟合图
        self.data_fit_canvas = FigureCanvas(plt.figure(figsize=(6, 4)))
        results_2d_layout.addWidget(self.data_fit_canvas)
        
        # 统计信息
        stats_group = QGroupBox("统计信息")
        stats_layout = QVBoxLayout()
        
        self.rms_label = QLabel("RMS: --")
        self.chi_squared_label = QLabel("Chi-squared: --")
        self.data_misfit_label = QLabel("Data misfit: --")
        
        stats_layout.addWidget(self.rms_label)
        stats_layout.addWidget(self.chi_squared_label)
        stats_layout.addWidget(self.data_misfit_label)
        
        stats_group.setLayout(stats_layout)
        results_2d_layout.addWidget(stats_group)
        
        results_2d_widget.setLayout(results_2d_layout)
        splitter.addWidget(results_2d_widget)
        
        layout.addWidget(splitter)
        widget.setLayout(layout)
        return widget
        
    def setup_dock_widgets(self):
        """设置停靠窗口"""
        # 项目树停靠窗口
        self.project_dock = QDockWidget("项目浏览器", self)
        project_tree = QTreeWidget()
        project_tree.setHeaderLabels(["组件", "状态"])
        self.project_dock.setWidget(project_tree)
        self.addDockWidget(Qt.DockWidgetArea.LeftDockWidgetArea, self.project_dock)
        
        # 属性面板停靠窗口
        self.properties_dock = QDockWidget("属性面板", self)
        properties_widget = QWidget()
        self.properties_dock.setWidget(properties_widget)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.properties_dock)
        
        # 日志停靠窗口
        self.log_dock = QDockWidget("日志输出", self)
        self.log_text = QTextEdit()
        self.log_text.setMaximumHeight(150)
        self.log_dock.setWidget(self.log_text)
        self.addDockWidget(Qt.DockWidgetArea.BottomDockWidgetArea, self.log_dock)
        
    def setup_statusbar(self):
        """设置状态栏"""
        statusbar = self.statusBar()
        
        # 状态信息
        self.status_label = QLabel("就绪")
        statusbar.addWidget(self.status_label)
        
        # 进度条
        self.status_progress = QProgressBar()
        self.status_progress.setVisible(False)
        statusbar.addPermanentWidget(self.status_progress)
        
        # 坐标显示
        self.coord_label = QLabel("坐标: (0, 0, 0)")
        statusbar.addPermanentWidget(self.coord_label)
        
    def populate_project_tree(self):
        """填充项目树"""
        # 根节点
        root = QTreeWidgetItem(self.project_tree)
        root.setText(0, "SimPEG 项目")
        root.setText(1, "活动")
        root.setText(2, "地球物理正反演项目")
        
        # 子节点
        nodes = [
            ("网格", "未设置", "计算网格"),
            ("观测系统", "未设置", "数据采集系统"),
            ("物性模型", "未设置", "地下结构模型"),
            ("正演数据", "未计算", "理论响应"),
            ("观测数据", "未导入", "实测数据"),
            ("反演结果", "未计算", "反演模型")
        ]
        
        for name, status, desc in nodes:
            item = QTreeWidgetItem(root)
            item.setText(0, name)
            item.setText(1, status)
            item.setText(2, desc)
            
        root.setExpanded(True)
        
    # 事件处理方法
    def new_project(self):
        """新建项目"""
        self.log("创建新项目...")
        
    def open_project(self):
        """打开项目"""
        self.log("打开项目...")
        
    def save_project(self):
        """保存项目"""
        self.log("保存项目...")
        
    def import_data(self):
        """导入数据"""
        self.log("导入数据...")
        
    def export_results(self):
        """导出结果"""
        self.log("导出结果...")
        
    def select_method(self, method):
        """选择地球物理方法"""
        self.current_method = method
        self.log(f"选择方法: {method}")
        
    def run_forward(self):
        """运行正演"""
        self.log("开始正演计算...")
        self.status_label.setText("正演计算中...")
        
    def run_inversion(self):
        """运行反演"""
        self.log("开始反演计算...")
        self.status_label.setText("反演计算中...")
        
    def sensitivity_analysis(self):
        """敏感性分析"""
        self.log("开始敏感性分析...")
        
    def reset_layout(self):
        """重置布局"""
        self.log("重置界面布局")
        
    def toggle_fullscreen(self):
        """切换全屏"""
        if self.isFullScreen():
            self.showNormal()
        else:
            self.showFullScreen()
            
    def reset_view(self):
        """重置视图"""
        self.log("重置3D视图")
        
    def fit_view(self):
        """适应窗口"""
        self.log("适应窗口大小")
        
    def show_help(self):
        """显示帮助"""
        self.log("显示用户手册")
        
    def show_about(self):
        """显示关于"""
        self.log("关于 SimPEG 界面")
        
    def undo(self):
        """撤销"""
        self.log("撤销操作")
        
    def redo(self):
        """重做"""
        self.log("重做操作")
        
    def project_settings(self):
        """项目设置"""
        self.log("打开项目设置")
        
    def log(self, message):
        """添加日志"""
        self.log_text.append(f"[{self.get_timestamp()}] {message}")
        
    def get_timestamp(self):
        """获取时间戳"""
        from datetime import datetime
        return datetime.now().strftime("%H:%M:%S")

def main():
    """主函数"""
    app = QApplication(sys.argv)
    
    # 设置应用程序属性
    app.setApplicationName("DeepCAD SimPEG Interface")
    app.setApplicationVersion("1.0.0")
    app.setOrganizationName("DeepCAD")
    
    # 创建主窗口
    window = SimPEGMainWindow()
    window.show()
    
    # 运行应用程序
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
