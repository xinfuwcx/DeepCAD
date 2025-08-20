"""
Terra 主窗口 - Fusion 360 风格界面
"""

import logging
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QSplitter, QTabWidget, QMenuBar, QStatusBar,
    QToolBar, QLabel, QPushButton, QMessageBox,
    QProgressBar, QFrame
)
from PyQt6.QtCore import Qt, QTimer, pyqtSlot
from PyQt6.QtGui import QAction, QIcon, QFont

from .workspace.geometry_workspace import GeometryWorkspace
from .workspace.mesh_workspace import MeshWorkspace
from .workspace.simulation_workspace import SimulationWorkspace
from .workspace.results_workspace import ResultsWorkspace
from .panels.model_tree_panel import ModelTreePanel
from .panels.properties_panel import PropertiesPanel
from .widgets.status_widget import StatusWidget
from .widgets.icon_provider import IconProvider, IconButton
from .widgets.premium_icon_provider import PremiumIconProvider, FusionColorScheme
from .dialogs.project_dialog import NewProjectDialog, OpenProjectDialog
from .dialogs.settings_dialog import SettingsDialog
from core.kratos_interface import KratosInterface

logger = logging.getLogger(__name__)

class TerraMainWindow(QMainWindow):
    """Terra 主窗口 - Fusion 360 风格"""
    
    def __init__(self, gmsh_engine=None, config=None):
        super().__init__()
        
        self.gmsh_engine = gmsh_engine
        self.config = config
        self.current_project = None
        
        # 初始化 Kratos 接口
        self.kratos_interface = KratosInterface(config)
        
        self.init_ui()
        self.setup_connections()
        self.load_settings()
        
        logger.info("Terra 主窗口初始化完成")
    
    def init_ui(self):
        """初始化用户界面"""
        # 设置窗口属性
        self.setWindowTitle("Terra - SuperMesh Studio")
        self.setMinimumSize(1000, 700)
        
        # 获取配置的窗口尺寸
        if self.config:
            width = self.config.get("ui.window_width", 1200)
            height = self.config.get("ui.window_height", 800)
            self.resize(width, height)
        else:
            self.resize(1200, 800)
        
        # 创建菜单栏
        self.create_menu_bar()
        
        # 创建工具栏
        self.create_toolbar()
        
        # 创建中央部件
        self.create_central_widget()
        
        # 创建状态栏
        self.create_status_bar()
        
        # 应用样式
        self.apply_fusion_style()
        
        # 设置窗口图标
        self.setWindowIcon(PremiumIconProvider.create_tool_icon("new", 32))
    
    def create_menu_bar(self):
        """创建菜单栏"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu("文件(&F)")
        
        new_action = QAction(PremiumIconProvider.create_tool_icon("new"), "🆕 新建项目(&N)", self)
        new_action.setShortcut("Ctrl+N")
        new_action.triggered.connect(self.new_project)
        file_menu.addAction(new_action)
        
        open_action = QAction(PremiumIconProvider.create_tool_icon("open"), "📂 打开项目(&O)", self)
        open_action.setShortcut("Ctrl+O")
        open_action.triggered.connect(self.open_project)
        file_menu.addAction(open_action)
        
        file_menu.addSeparator()
        
        save_action = QAction(PremiumIconProvider.create_tool_icon("save"), "💾 保存(&S)", self)
        save_action.setShortcut("Ctrl+S")
        save_action.triggered.connect(self.save_project)
        file_menu.addAction(save_action)
        
        file_menu.addSeparator()
        
        exit_action = QAction("退出(&X)", self)
        exit_action.setShortcut("Ctrl+Q")
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # 编辑菜单
        edit_menu = menubar.addMenu("编辑(&E)")
        
        undo_action = QAction("撤销(&U)", self)
        undo_action.setShortcut("Ctrl+Z")
        edit_menu.addAction(undo_action)
        
        redo_action = QAction("重做(&R)", self)
        redo_action.setShortcut("Ctrl+Y")
        edit_menu.addAction(redo_action)
        
        # 视图菜单
        view_menu = menubar.addMenu("视图(&V)")
        
        zoom_fit_action = QAction("适应窗口(&F)", self)
        zoom_fit_action.setShortcut("F")
        view_menu.addAction(zoom_fit_action)
        
        # 工具菜单
        tools_menu = menubar.addMenu("工具(&T)")
        
        preferences_action = QAction("首选项(&P)", self)
        preferences_action.triggered.connect(self.show_preferences)
        tools_menu.addAction(preferences_action)
        
        # 帮助菜单
        help_menu = menubar.addMenu("帮助(&H)")
        
        about_action = QAction("关于 Terra(&A)", self)
        about_action.triggered.connect(self.show_about)
        help_menu.addAction(about_action)
    
    def create_toolbar(self):
        """创建工具栏"""
        # 主工具栏
        main_toolbar = self.addToolBar("主工具栏")
        main_toolbar.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextUnderIcon)
        
        # 新建按钮
        new_btn = QPushButton("新建")
        new_btn.setToolTip("创建新项目")
        new_btn.clicked.connect(self.new_project)
        main_toolbar.addWidget(new_btn)
        
        # 打开按钮
        open_btn = QPushButton("打开")
        open_btn.setToolTip("打开项目")
        open_btn.clicked.connect(self.open_project)
        main_toolbar.addWidget(open_btn)
        
        # 保存按钮
        save_btn = QPushButton("保存")
        save_btn.setToolTip("保存项目")
        save_btn.clicked.connect(self.save_project)
        main_toolbar.addWidget(save_btn)
        
        main_toolbar.addSeparator()
        
        # 工作空间选择器
        self.workspace_tabs = QTabWidget()
        self.workspace_tabs.setTabPosition(QTabWidget.TabPosition.North)
        self.workspace_tabs.currentChanged.connect(self.on_workspace_changed)
        
        # 将工作空间标签添加到工具栏区域
        workspace_widget = QWidget()
        workspace_layout = QHBoxLayout(workspace_widget)
        workspace_layout.addWidget(self.workspace_tabs)
        workspace_layout.setContentsMargins(0, 0, 0, 0)
        
        main_toolbar.addWidget(workspace_widget)
    
    def create_central_widget(self):
        """创建中央部件 - Fusion 360 风格布局"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # 创建分割器
        main_splitter = QSplitter(Qt.Orientation.Horizontal)
        
        # 左侧面板 - 模型树
        self.model_tree_panel = ModelTreePanel(self.gmsh_engine)
        main_splitter.addWidget(self.model_tree_panel)
        
        # 中央工作区
        self.create_workspace_area()
        main_splitter.addWidget(self.workspace_container)
        
        # 右侧面板 - 属性面板
        self.properties_panel = PropertiesPanel()
        main_splitter.addWidget(self.properties_panel)
        
        # 设置分割器比例
        main_splitter.setSizes([250, 700, 250])  # 左:中:右 = 250:700:250
        
        main_layout.addWidget(main_splitter)
    
    def create_workspace_area(self):
        """创建工作空间区域"""
        self.workspace_container = QWidget()
        workspace_layout = QVBoxLayout(self.workspace_container)
        workspace_layout.setContentsMargins(0, 0, 0, 0)
        
        # 工作空间内容区域
        self.workspace_content = QWidget()
        workspace_layout.addWidget(self.workspace_content)
        
        # 创建各个工作空间
        self.geometry_workspace = GeometryWorkspace(self.gmsh_engine)
        self.mesh_workspace = MeshWorkspace(self.gmsh_engine)
        self.simulation_workspace = SimulationWorkspace(self.gmsh_engine, self.kratos_interface)
        self.results_workspace = ResultsWorkspace(self.gmsh_engine)
        
        # 添加工作空间标签页（使用高级图标）
        self.workspace_tabs.addTab(QWidget(), "📐 几何建模")
        self.workspace_tabs.addTab(QWidget(), "🕸️ 网格生成") 
        self.workspace_tabs.addTab(QWidget(), "⚡ 仿真分析")
        self.workspace_tabs.addTab(QWidget(), "📊 结果后处理")
        
        # 设置标签页图标
        self.workspace_tabs.setTabIcon(0, PremiumIconProvider.create_workspace_icon("geometry", 24))
        self.workspace_tabs.setTabIcon(1, PremiumIconProvider.create_workspace_icon("mesh", 24))
        self.workspace_tabs.setTabIcon(2, PremiumIconProvider.create_workspace_icon("simulation", 24))
        self.workspace_tabs.setTabIcon(3, PremiumIconProvider.create_workspace_icon("results", 24))
        
        # 设置默认工作空间
        self.set_current_workspace(self.geometry_workspace)
    
    def create_status_bar(self):
        """创建状态栏"""
        self.status_bar = self.statusBar()
        
        # 状态信息
        self.status_label = QLabel("就绪")
        self.status_bar.addWidget(self.status_label)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        self.status_bar.addPermanentWidget(self.progress_bar)
        
        # 状态控件
        self.status_widget = StatusWidget(self.gmsh_engine)
        self.status_bar.addPermanentWidget(self.status_widget)
    
    def apply_fusion_style(self):
        """应用精致的 Fusion 360 风格"""
        try:
            # 尝试加载高级样式表文件
            from pathlib import Path
            premium_style_file = Path(__file__).parent.parent / "resources" / "styles" / "fusion_premium.qss"
            
            if premium_style_file.exists():
                with open(premium_style_file, 'r', encoding='utf-8') as f:
                    style_sheet = f.read()
                self.setStyleSheet(style_sheet)
                logger.info("已加载 Fusion 360 高级样式表")
                return
            else:
                logger.warning("高级样式表文件不存在，使用内置样式")
                
        except Exception as e:
            logger.error(f"加载样式表失败: {e}")
        
        # 回退到内置样式
        style = """
        QMainWindow {
            background-color: #2b2b2b;
            color: #ffffff;
        }
        
        QMenuBar {
            background-color: #3c3c3c;
            color: #ffffff;
            border-bottom: 1px solid #555555;
        }
        
        QMenuBar::item {
            background-color: transparent;
            padding: 4px 8px;
        }
        
        QMenuBar::item:selected {
            background-color: #0078d4;
        }
        
        QToolBar {
            background-color: #3c3c3c;
            border: none;
            spacing: 4px;
        }
        
        QPushButton {
            background-color: #404040;
            color: #ffffff;
            border: 1px solid #555555;
            padding: 6px 12px;
            border-radius: 3px;
        }
        
        QPushButton:hover {
            background-color: #0078d4;
        }
        
        QPushButton:pressed {
            background-color: #005499;
        }
        
        QTabWidget::pane {
            border: 1px solid #555555;
            background-color: #2b2b2b;
        }
        
        QTabBar::tab {
            background-color: #404040;
            color: #ffffff;
            padding: 8px 16px;
            border: 1px solid #555555;
            border-bottom: none;
        }
        
        QTabBar::tab:selected {
            background-color: #0078d4;
        }
        
        QSplitter::handle {
            background-color: #555555;
        }
        
        QStatusBar {
            background-color: #3c3c3c;
            color: #ffffff;
            border-top: 1px solid #555555;
        }
        """
        
        self.setStyleSheet(style)
    
    def setup_connections(self):
        """设置信号连接"""
        if self.gmsh_engine:
            # GMSH 引擎信号连接
            self.gmsh_engine.operation_completed.connect(self.on_operation_completed)
            self.gmsh_engine.geometry_changed.connect(self.on_geometry_changed)
            self.gmsh_engine.mesh_generated.connect(self.on_mesh_generated)
    
    def set_current_workspace(self, workspace):
        """设置当前工作空间"""
        # 清除当前内容
        if self.workspace_content.layout():
            for i in reversed(range(self.workspace_content.layout().count())):
                child = self.workspace_content.layout().itemAt(i).widget()
                if child:
                    child.setParent(None)
        else:
            layout = QVBoxLayout(self.workspace_content)
            layout.setContentsMargins(0, 0, 0, 0)
        
        # 添加新工作空间
        self.workspace_content.layout().addWidget(workspace)
        
        # 更新属性面板
        if hasattr(workspace, 'get_property_widgets'):
            self.properties_panel.set_widgets(workspace.get_property_widgets())
    
    def center_on_screen(self):
        """窗口居中显示"""
        screen = self.screen().availableGeometry()
        size = self.geometry()
        self.move(
            (screen.width() - size.width()) // 2,
            (screen.height() - size.height()) // 2
        )
    
    def load_settings(self):
        """加载设置"""
        if self.config:
            # 应用界面设置
            bg_color = self.config.get("ui.background_color", "#2b2b2b")
            # 可以在这里应用更多设置
    
    def save_settings(self):
        """保存设置"""
        if self.config:
            # 保存窗口尺寸
            size = self.size()
            self.config.set("ui.window_width", size.width())
            self.config.set("ui.window_height", size.height())
    
    # === 槽函数 ===
    
    @pyqtSlot(int)
    def on_workspace_changed(self, index):
        """工作空间切换"""
        workspaces = [
            self.geometry_workspace,
            self.mesh_workspace,
            self.simulation_workspace,
            self.results_workspace
        ]
        
        if 0 <= index < len(workspaces):
            self.set_current_workspace(workspaces[index])
            logger.info(f"切换到工作空间: {index}")
    
    @pyqtSlot(str, bool, str)
    def on_operation_completed(self, operation, success, message):
        """操作完成回调"""
        if success:
            self.status_label.setText(f"✅ {message}")
        else:
            self.status_label.setText(f"❌ {message}")
            QMessageBox.warning(self, "操作失败", message)
    
    @pyqtSlot()
    def on_geometry_changed(self):
        """几何变化回调"""
        self.model_tree_panel.refresh()
    
    @pyqtSlot(dict)
    def on_mesh_generated(self, mesh_info):
        """网格生成完成回调"""
        nodes = mesh_info.get("num_nodes", 0)
        elements = mesh_info.get("num_elements", 0)
        self.status_label.setText(f"🕸️ 网格: {nodes} 节点, {elements} 单元")
    
    # === 菜单动作 ===
    
    def new_project(self):
        """新建项目"""
        dialog = NewProjectDialog(self)
        dialog.project_created.connect(self.on_project_created)
        dialog.exec()
    
    def open_project(self):
        """打开项目"""
        dialog = OpenProjectDialog(self)
        dialog.project_opened.connect(self.on_project_opened)
        dialog.exec()
    
    def save_project(self):
        """保存项目"""
        if self.current_project:
            # TODO: 实现保存当前项目
            QMessageBox.information(self, "提示", f"项目 '{self.current_project.get('name', '未知')}' 保存成功！")
            self.status_label.setText("项目已保存")
        else:
            QMessageBox.warning(self, "警告", "没有打开的项目需要保存！")
    
    def show_preferences(self):
        """显示设置对话框"""
        dialog = SettingsDialog(self.config, self)
        dialog.settings_changed.connect(self.on_settings_changed)
        dialog.exec()
    
    def on_project_created(self, project_data):
        """项目创建完成"""
        self.current_project = project_data
        self.setWindowTitle(f"Terra - {project_data['name']}")
        if self.gmsh_engine:
            self.gmsh_engine.create_new_model(project_data['name'])
        self.status_label.setText(f"新项目: {project_data['name']}")
        logger.info(f"新项目创建: {project_data['name']}")
    
    def on_project_opened(self, project_path):
        """项目打开完成"""
        # TODO: 实现项目加载逻辑
        import os
        project_name = os.path.basename(project_path).replace('.terra', '')
        self.current_project = {'name': project_name, 'path': project_path}
        self.setWindowTitle(f"Terra - {project_name}")
        self.status_label.setText(f"项目: {project_name}")
        logger.info(f"项目已打开: {project_path}")
    
    def on_settings_changed(self, settings):
        """设置变更处理"""
        if self.config:
            self.config.update(settings)
        self.status_label.setText("设置已更新")
        logger.info("应用设置已更新")
    
    def show_about(self):
        """显示关于对话框"""
        QMessageBox.about(
            self, 
            "关于 Terra",
            "<h3>Terra - SuperMesh Studio</h3>"
            "<p>基于 GMSH + Kratos 的现代化 CAE 桌面平台</p>"
            "<p>版本: 0.1.0</p>"
            "<p>让 GMSH 的强大能力触手可及！</p>"
        )
    
    def closeEvent(self, event):
        """窗口关闭事件"""
        self.save_settings()
        
        # 清理资源
        if self.gmsh_engine:
            self.gmsh_engine.cleanup()
        
        event.accept()
        logger.info("Terra 主窗口已关闭")