#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
3D瓦片查看器主窗口界面
基于PyQt6实现的现代化3D Tiles查看器界面
"""

import sys
from pathlib import Path
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QSplitter, QDockWidget, QTreeWidget, QTreeWidgetItem,
    QToolBar, QStatusBar, QMenuBar, QFileDialog, QLabel,
    QPushButton, QGroupBox, QSlider, QSpinBox, QComboBox,
    QTextEdit, QProgressBar, QCheckBox, QTabWidget
)
from PyQt6.QtCore import Qt, QTimer, pyqtSignal
from PyQt6.QtGui import QAction, QIcon

# 导入项目模块
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

try:
    from renderers.vtk_renderer import VTKTileRenderer
    VTK_AVAILABLE = True
except ImportError:
    VTK_AVAILABLE = False
    print("VTK渲染器不可用")

try:
    from core.tile_loader import TilesetLoader
    CORE_AVAILABLE = True
except ImportError:
    CORE_AVAILABLE = False
    print("核心加载器不可用")


class TileViewerMainWindow(QMainWindow):
    """3D瓦片查看器主窗口"""
    
    # 信号定义
    tileset_loaded = pyqtSignal(object)
    render_update = pyqtSignal()
    
    def __init__(self):
        super().__init__()
        
        # 窗口基本设置
        self.setWindowTitle("Example4 - 3D瓦片查看器")
        self.setGeometry(100, 100, 1400, 900)
        
        # 初始化组件
        self.tile_loader = None
        self.renderer = None
        self.current_tileset = None
        
        # 创建界面
        self.create_menu_bar()
        self.create_tool_bar()
        self.create_central_widget()
        self.create_dock_widgets()
        self.create_status_bar()
        
        # 连接信号槽
        self.connect_signals()
        
        # 初始化渲染器
        self.initialize_renderer()
        
    def create_menu_bar(self):
        """创建菜单栏"""
        menubar = self.menuBar()
        
        # 文件菜单
        file_menu = menubar.addMenu('文件(&F)')
        
        # 打开瓦片集
        open_action = QAction('打开瓦片集...', self)
        open_action.setShortcut('Ctrl+O')
        open_action.triggered.connect(self.open_tileset)
        file_menu.addAction(open_action)
        
        # 打开文件夹
        open_folder_action = QAction('打开文件夹...', self)
        open_folder_action.setShortcut('Ctrl+Shift+O')
        open_folder_action.triggered.connect(self.open_folder)
        file_menu.addAction(open_folder_action)
        
        file_menu.addSeparator()
        
        # 导出
        export_menu = file_menu.addMenu('导出')
        export_menu.addAction('导出为OBJ...', self.export_obj)
        export_menu.addAction('导出为PLY...', self.export_ply)
        export_menu.addAction('导出为glTF...', self.export_gltf)
        
        file_menu.addSeparator()
        
        # 退出
        exit_action = QAction('退出', self)
        exit_action.setShortcut('Ctrl+Q')
        exit_action.triggered.connect(self.close)
        file_menu.addAction(exit_action)
        
        # 视图菜单
        view_menu = menubar.addMenu('视图(&V)')
        
        # 渲染模式
        render_menu = view_menu.addMenu('渲染模式')
        render_menu.addAction('实体模式', lambda: self.set_render_mode('solid'))
        render_menu.addAction('线框模式', lambda: self.set_render_mode('wireframe'))
        render_menu.addAction('点云模式', lambda: self.set_render_mode('points'))
        
        view_menu.addSeparator()
        
        # 视角控制
        view_menu.addAction('重置视角', self.reset_camera)
        view_menu.addAction('适合窗口', self.fit_to_window)
        
        # 工具菜单
        tools_menu = menubar.addMenu('工具(&T)')
        tools_menu.addAction('瓦片信息', self.show_tile_info)
        tools_menu.addAction('性能监控', self.show_performance_monitor)
        tools_menu.addAction('缓存管理', self.manage_cache)
        
        # 帮助菜单
        help_menu = menubar.addMenu('帮助(&H)')
        help_menu.addAction('关于', self.show_about)
        
    def create_tool_bar(self):
        """创建工具栏"""
        toolbar = QToolBar("主工具栏")
        self.addToolBar(toolbar)
        
        # 文件操作
        toolbar.addAction("打开", self.open_tileset)
        toolbar.addAction("文件夹", self.open_folder)
        toolbar.addSeparator()
        
        # 视图控制
        toolbar.addAction("重置", self.reset_camera)
        toolbar.addAction("适合", self.fit_to_window)
        toolbar.addSeparator()
        
        # 渲染模式
        self.render_mode_combo = QComboBox()
        self.render_mode_combo.addItems(['实体', '线框', '点云'])
        self.render_mode_combo.currentTextChanged.connect(self.on_render_mode_changed)
        toolbar.addWidget(QLabel("渲染:"))
        toolbar.addWidget(self.render_mode_combo)
        
    def create_central_widget(self):
        """创建中央部件"""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        # 主布局
        main_layout = QHBoxLayout(central_widget)
        
        # 创建分割器
        splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(splitter)
        
        # 左侧面板（暂时用占位符）
        left_panel = QWidget()
        left_panel.setMinimumWidth(300)
        left_panel.setMaximumWidth(400)
        
        # 3D渲染区域
        self.render_widget = QWidget()
        self.render_widget.setMinimumSize(800, 600)
        self.render_widget.setStyleSheet("background-color: #1e1e1e; border: 1px solid #555555;")
        
        # 添加到分割器
        splitter.addWidget(left_panel)
        splitter.addWidget(self.render_widget)
        
        # 设置分割比例
        splitter.setSizes([300, 1100])
        
    def create_dock_widgets(self):
        """创建停靠部件"""
        
        # 文件浏览器停靠部件
        self.file_dock = QDockWidget("文件浏览器", self)
        self.file_tree = QTreeWidget()
        self.file_tree.setHeaderLabels(["文件名", "类型", "大小"])
        self.file_tree.itemDoubleClicked.connect(self.on_file_selected)
        self.file_dock.setWidget(self.file_tree)
        self.addDockWidget(Qt.DockWidgetArea.LeftDockWidgetArea, self.file_dock)
        
        # 属性面板停靠部件
        self.property_dock = QDockWidget("属性面板", self)
        property_widget = self.create_property_panel()
        self.property_dock.setWidget(property_widget)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.property_dock)
        
        # 日志面板停靠部件
        self.log_dock = QDockWidget("日志", self)
        self.log_text = QTextEdit()
        self.log_text.setMaximumHeight(200)
        self.log_text.setReadOnly(True)
        self.log_dock.setWidget(self.log_text)
        self.addDockWidget(Qt.DockWidgetArea.BottomDockWidgetArea, self.log_dock)
        
    def create_property_panel(self):
        """创建属性面板"""
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        # 瓦片信息组
        tile_group = QGroupBox("瓦片信息")
        tile_layout = QVBoxLayout(tile_group)
        
        self.tile_count_label = QLabel("瓦片数量: 0")
        self.tile_memory_label = QLabel("内存使用: 0 MB")
        self.tile_bounds_label = QLabel("边界: 未知")
        
        tile_layout.addWidget(self.tile_count_label)
        tile_layout.addWidget(self.tile_memory_label)
        tile_layout.addWidget(self.tile_bounds_label)
        
        # 渲染设置组
        render_group = QGroupBox("渲染设置")
        render_layout = QVBoxLayout(render_group)
        
        # LOD控制
        lod_layout = QHBoxLayout()
        lod_layout.addWidget(QLabel("LOD级别:"))
        self.lod_slider = QSlider(Qt.Orientation.Horizontal)
        self.lod_slider.setRange(0, 10)
        self.lod_slider.setValue(5)
        self.lod_slider.valueChanged.connect(self.on_lod_changed)
        lod_layout.addWidget(self.lod_slider)
        
        self.lod_value_label = QLabel("5")
        lod_layout.addWidget(self.lod_value_label)
        render_layout.addLayout(lod_layout)
        
        # 显示选项
        self.show_wireframe_cb = QCheckBox("显示线框")
        self.show_bounds_cb = QCheckBox("显示边界框")
        self.show_normals_cb = QCheckBox("显示法线")
        
        render_layout.addWidget(self.show_wireframe_cb)
        render_layout.addWidget(self.show_bounds_cb)
        render_layout.addWidget(self.show_normals_cb)
        
        # 性能监控组
        perf_group = QGroupBox("性能监控")
        perf_layout = QVBoxLayout(perf_group)
        
        self.fps_label = QLabel("FPS: 0")
        self.triangles_label = QLabel("三角形: 0")
        self.vertices_label = QLabel("顶点: 0")
        
        perf_layout.addWidget(self.fps_label)
        perf_layout.addWidget(self.triangles_label)
        perf_layout.addWidget(self.vertices_label)
        
        # 添加所有组到主布局
        layout.addWidget(tile_group)
        layout.addWidget(render_group)
        layout.addWidget(perf_group)
        layout.addStretch()
        
        return widget
        
    def create_status_bar(self):
        """创建状态栏"""
        status_bar = self.statusBar()
        
        # 状态标签
        self.status_label = QLabel("就绪")
        status_bar.addWidget(self.status_label)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        status_bar.addPermanentWidget(self.progress_bar)
        
        # 坐标显示
        self.coord_label = QLabel("坐标: (0, 0, 0)")
        status_bar.addPermanentWidget(self.coord_label)
        
    def connect_signals(self):
        """连接信号槽"""
        # 连接自定义信号
        self.tileset_loaded.connect(self.on_tileset_loaded)
        self.render_update.connect(self.update_render)
        
        # 连接控件信号
        self.lod_slider.valueChanged.connect(self.on_lod_changed)
        self.show_wireframe_cb.toggled.connect(self.on_wireframe_toggled)
        self.show_bounds_cb.toggled.connect(self.on_bounds_toggled)
        self.show_normals_cb.toggled.connect(self.on_normals_toggled)
        
    def initialize_renderer(self):
        """初始化渲染器"""
        if VTK_AVAILABLE:
            try:
                self.renderer = VTKTileRenderer(self.render_widget)
                self.log_message("VTK渲染器初始化成功")
            except Exception as e:
                self.log_message(f"VTK渲染器初始化失败: {e}")
        else:
            self.log_message("VTK不可用，使用备用渲染器")
            
    def open_tileset(self):
        """打开瓦片集文件"""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "打开3D瓦片集", "", 
            "Tileset文件 (tileset.json);;所有文件 (*.*)"
        )
        
        if file_path:
            self.load_tileset(file_path)
            
    def open_folder(self):
        """打开文件夹"""
        folder_path = QFileDialog.getExistingDirectory(
            self, "选择3D瓦片文件夹"
        )
        
        if folder_path:
            self.load_folder(folder_path)
            
    def load_tileset(self, file_path):
        """加载瓦片集"""
        self.log_message(f"正在加载瓦片集: {file_path}")
        self.status_label.setText("加载中...")
        self.progress_bar.setVisible(True)
        
        try:
            if CORE_AVAILABLE:
                self.tile_loader = TilesetLoader()
                tileset = self.tile_loader.load_tileset(file_path)
                self.current_tileset = tileset
                self.tileset_loaded.emit(tileset)
            else:
                self.log_message("核心加载器不可用，使用模拟数据")
                self.create_mock_tileset()
                
        except Exception as e:
            self.log_message(f"加载失败: {e}")
            self.status_label.setText("加载失败")
        finally:
            self.progress_bar.setVisible(False)
            
    def load_folder(self, folder_path):
        """加载文件夹"""
        self.populate_file_tree(folder_path)
        self.log_message(f"已加载文件夹: {folder_path}")
        
    def populate_file_tree(self, folder_path):
        """填充文件树"""
        self.file_tree.clear()
        folder = Path(folder_path)
        
        root_item = QTreeWidgetItem(self.file_tree)
        root_item.setText(0, folder.name)
        root_item.setText(1, "文件夹")
        
        self.add_folder_items(root_item, folder)
        self.file_tree.expandAll()
        
    def add_folder_items(self, parent_item, folder_path):
        """递归添加文件夹项"""
        try:
            for item_path in folder_path.iterdir():
                item = QTreeWidgetItem(parent_item)
                item.setText(0, item_path.name)
                
                if item_path.is_dir():
                    item.setText(1, "文件夹")
                    self.add_folder_items(item, item_path)
                else:
                    item.setText(1, item_path.suffix[1:].upper() if item_path.suffix else "文件")
                    item.setText(2, f"{item_path.stat().st_size // 1024} KB")
                    
        except PermissionError:
            pass
            
    def create_mock_tileset(self):
        """创建模拟瓦片集用于测试"""
        mock_tileset = {
            'name': '模拟瓦片集',
            'tile_count': 100,
            'memory_usage': 50.5,
            'bounds': {'min': [-100, -100, -10], 'max': [100, 100, 50]}
        }
        
        self.current_tileset = mock_tileset
        self.tileset_loaded.emit(mock_tileset)
        
    # 事件处理方法
    def on_tileset_loaded(self, tileset):
        """瓦片集加载完成"""
        self.log_message("瓦片集加载完成")
        self.status_label.setText("就绪")
        
        # 更新属性面板
        if hasattr(tileset, 'tile_count'):
            self.tile_count_label.setText(f"瓦片数量: {tileset.tile_count}")
        elif isinstance(tileset, dict):
            self.tile_count_label.setText(f"瓦片数量: {tileset.get('tile_count', 0)}")
            
        # 更新渲染器
        if self.renderer:
            self.renderer.load_tileset(tileset)
            
    def on_file_selected(self, item, column):
        """文件选择事件"""
        file_name = item.text(0)
        self.log_message(f"选择文件: {file_name}")
        
    def on_render_mode_changed(self, mode):
        """渲染模式改变"""
        mode_map = {'实体': 'solid', '线框': 'wireframe', '点云': 'points'}
        self.set_render_mode(mode_map.get(mode, 'solid'))
        
    def on_lod_changed(self, value):
        """LOD级别改变"""
        self.lod_value_label.setText(str(value))
        if self.renderer:
            self.renderer.set_lod_level(value)
            
    def on_wireframe_toggled(self, checked):
        """线框显示切换"""
        if self.renderer:
            self.renderer.set_wireframe(checked)
            
    def on_bounds_toggled(self, checked):
        """边界框显示切换"""
        if self.renderer:
            self.renderer.set_show_bounds(checked)
            
    def on_normals_toggled(self, checked):
        """法线显示切换"""
        if self.renderer:
            self.renderer.set_show_normals(checked)
            
    # 菜单动作方法
    def set_render_mode(self, mode):
        """设置渲染模式"""
        if self.renderer:
            self.renderer.set_render_mode(mode)
        self.log_message(f"渲染模式: {mode}")
        
    def reset_camera(self):
        """重置相机"""
        if self.renderer:
            self.renderer.reset_camera()
        self.log_message("相机已重置")
        
    def fit_to_window(self):
        """适合窗口"""
        if self.renderer:
            self.renderer.fit_to_window()
        self.log_message("视图已适合窗口")
        
    def export_obj(self):
        """导出OBJ格式"""
        self.log_message("导出OBJ功能待实现")
        
    def export_ply(self):
        """导出PLY格式"""
        self.log_message("导出PLY功能待实现")
        
    def export_gltf(self):
        """导出glTF格式"""
        self.log_message("导出glTF功能待实现")
        
    def show_tile_info(self):
        """显示瓦片信息"""
        self.log_message("瓦片信息对话框待实现")
        
    def show_performance_monitor(self):
        """显示性能监控"""
        self.log_message("性能监控对话框待实现")
        
    def manage_cache(self):
        """缓存管理"""
        self.log_message("缓存管理功能待实现")
        
    def show_about(self):
        """显示关于对话框"""
        from PyQt6.QtWidgets import QMessageBox
        QMessageBox.about(self, "关于", 
            "Example4 - 3D瓦片查看器\n\n"
            "基于PyQt6和VTK的3D Tiles查看器\n"
            "版本: 1.0.0\n\n"
            "DeepCAD项目组")
        
    def update_render(self):
        """更新渲染"""
        if self.renderer:
            self.renderer.render()
            
    def log_message(self, message):
        """记录日志消息"""
        self.log_text.append(f"[{self.get_timestamp()}] {message}")
        
    def get_timestamp(self):
        """获取时间戳"""
        from datetime import datetime
        return datetime.now().strftime("%H:%M:%S")
        
    def closeEvent(self, event):
        """关闭事件"""
        self.log_message("应用程序退出")
        event.accept()