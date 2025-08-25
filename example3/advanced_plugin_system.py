"""
Advanced Plugin System - 高级插件系统
Extensible plugin architecture for GemPy Ultimate ABAQUS
"""

import sys
import os
import json
import importlib.util
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from enum import Enum

from PyQt6.QtCore import QObject, pyqtSignal, QThread, QTimer
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox, QPushButton, QProgressBar
from PyQt6.QtGui import QIcon


class PluginType(Enum):
    """插件类型枚举"""
    DATA_PROCESSOR = "data_processor"
    VISUALIZATION = "visualization"
    ANALYSIS_TOOL = "analysis_tool"
    EXPORT_HANDLER = "export_handler"
    THEME_EXTENSION = "theme_extension"
    WORKFLOW_AUTOMATION = "workflow_automation"


@dataclass
class PluginInfo:
    """插件信息"""
    name: str
    version: str
    description: str
    author: str
    plugin_type: PluginType
    dependencies: List[str]
    entry_point: str
    config_schema: Optional[Dict] = None


class BasePlugin(ABC):
    """插件基类"""
    
    def __init__(self, plugin_manager: 'PluginManager'):
        self.plugin_manager = plugin_manager
        self.config = {}
        self.is_active = False
        
    @abstractmethod
    def get_info(self) -> PluginInfo:
        """获取插件信息"""
        pass
    
    @abstractmethod
    def initialize(self) -> bool:
        """初始化插件"""
        pass
    
    @abstractmethod
    def activate(self) -> bool:
        """激活插件"""
        pass
    
    @abstractmethod
    def deactivate(self) -> bool:
        """停用插件"""
        pass
    
    @abstractmethod
    def get_ui_component(self) -> Optional[QWidget]:
        """获取UI组件"""
        pass
    
    def set_config(self, config: Dict[str, Any]):
        """设置配置"""
        self.config = config
    
    def get_config(self) -> Dict[str, Any]:
        """获取配置"""
        return self.config


class DataProcessorPlugin(BasePlugin):
    """数据处理插件基类"""
    
    @abstractmethod
    def process_data(self, data: Any) -> Any:
        """处理数据"""
        pass
    
    @abstractmethod
    def validate_data(self, data: Any) -> bool:
        """验证数据"""
        pass


class VisualizationPlugin(BasePlugin):
    """可视化插件基类"""
    
    @abstractmethod
    def create_visualization(self, data: Any) -> QWidget:
        """创建可视化组件"""
        pass
    
    @abstractmethod
    def update_visualization(self, data: Any):
        """更新可视化"""
        pass


class AnalysisPlugin(BasePlugin):
    """分析插件基类"""
    
    @abstractmethod
    def analyze(self, data: Any) -> Dict[str, Any]:
        """执行分析"""
        pass
    
    @abstractmethod
    def get_analysis_results(self) -> Dict[str, Any]:
        """获取分析结果"""
        pass


class PluginManager(QObject):
    """插件管理器"""
    
    plugin_loaded = pyqtSignal(str)  # 插件名称
    plugin_unloaded = pyqtSignal(str)
    plugin_activated = pyqtSignal(str)
    plugin_deactivated = pyqtSignal(str)
    plugin_error = pyqtSignal(str, str)  # 插件名称, 错误信息
    
    def __init__(self):
        super().__init__()
        self.plugins: Dict[str, BasePlugin] = {}
        self.plugin_infos: Dict[str, PluginInfo] = {}
        self.plugin_configs: Dict[str, Dict] = {}
        self.plugin_hooks: Dict[str, List[Callable]] = {
            'on_data_loaded': [],
            'on_model_built': [],
            'on_analysis_completed': [],
            'on_export_requested': [],
            'on_theme_changed': [],
            'before_shutdown': []
        }
        
        self.plugin_directories = [
            os.path.join(os.path.dirname(__file__), 'plugins'),
            os.path.expanduser('~/.gempy_ultimate/plugins')
        ]
        
        # 创建插件目录
        for directory in self.plugin_directories:
            os.makedirs(directory, exist_ok=True)
    
    def discover_plugins(self) -> List[str]:
        """发现插件"""
        discovered_plugins = []
        
        for plugin_dir in self.plugin_directories:
            if not os.path.exists(plugin_dir):
                continue
                
            for item in os.listdir(plugin_dir):
                item_path = os.path.join(plugin_dir, item)
                
                # 检查是否为插件目录
                if os.path.isdir(item_path):
                    plugin_info_file = os.path.join(item_path, 'plugin.json')
                    plugin_main_file = os.path.join(item_path, 'main.py')
                    
                    if os.path.exists(plugin_info_file) and os.path.exists(plugin_main_file):
                        try:
                            with open(plugin_info_file, 'r', encoding='utf-8') as f:
                                plugin_info_data = json.load(f)
                            
                            plugin_info = PluginInfo(**plugin_info_data)
                            self.plugin_infos[plugin_info.name] = plugin_info
                            discovered_plugins.append(plugin_info.name)
                            
                        except Exception as e:
                            self.plugin_error.emit(item, f"Failed to parse plugin info: {e}")
        
        return discovered_plugins
    
    def load_plugin(self, plugin_name: str) -> bool:
        """加载插件"""
        try:
            if plugin_name in self.plugins:
                return True
            
            if plugin_name not in self.plugin_infos:
                self.plugin_error.emit(plugin_name, "Plugin info not found")
                return False
            
            plugin_info = self.plugin_infos[plugin_name]
            
            # 查找插件文件
            plugin_file = None
            for plugin_dir in self.plugin_directories:
                candidate_file = os.path.join(plugin_dir, plugin_name, 'main.py')
                if os.path.exists(candidate_file):
                    plugin_file = candidate_file
                    break
            
            if not plugin_file:
                self.plugin_error.emit(plugin_name, "Plugin file not found")
                return False
            
            # 动态导入插件
            spec = importlib.util.spec_from_file_location(f"plugin_{plugin_name}", plugin_file)
            plugin_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(plugin_module)
            
            # 获取插件类
            plugin_class = getattr(plugin_module, plugin_info.entry_point)
            plugin_instance = plugin_class(self)
            
            # 初始化插件
            if plugin_instance.initialize():
                self.plugins[plugin_name] = plugin_instance
                self.plugin_loaded.emit(plugin_name)
                return True
            else:
                self.plugin_error.emit(plugin_name, "Plugin initialization failed")
                return False
                
        except Exception as e:
            self.plugin_error.emit(plugin_name, f"Failed to load plugin: {e}")
            return False
    
    def unload_plugin(self, plugin_name: str) -> bool:
        """卸载插件"""
        try:
            if plugin_name not in self.plugins:
                return True
            
            plugin = self.plugins[plugin_name]
            
            if plugin.is_active:
                plugin.deactivate()
            
            del self.plugins[plugin_name]
            self.plugin_unloaded.emit(plugin_name)
            return True
            
        except Exception as e:
            self.plugin_error.emit(plugin_name, f"Failed to unload plugin: {e}")
            return False
    
    def activate_plugin(self, plugin_name: str) -> bool:
        """激活插件"""
        try:
            if plugin_name not in self.plugins:
                if not self.load_plugin(plugin_name):
                    return False
            
            plugin = self.plugins[plugin_name]
            
            if plugin.activate():
                self.plugin_activated.emit(plugin_name)
                return True
            else:
                self.plugin_error.emit(plugin_name, "Plugin activation failed")
                return False
                
        except Exception as e:
            self.plugin_error.emit(plugin_name, f"Failed to activate plugin: {e}")
            return False
    
    def deactivate_plugin(self, plugin_name: str) -> bool:
        """停用插件"""
        try:
            if plugin_name not in self.plugins:
                return True
            
            plugin = self.plugins[plugin_name]
            
            if plugin.deactivate():
                self.plugin_deactivated.emit(plugin_name)
                return True
            else:
                self.plugin_error.emit(plugin_name, "Plugin deactivation failed")
                return False
                
        except Exception as e:
            self.plugin_error.emit(plugin_name, f"Failed to deactivate plugin: {e}")
            return False
    
    def get_plugin(self, plugin_name: str) -> Optional[BasePlugin]:
        """获取插件实例"""
        return self.plugins.get(plugin_name)
    
    def get_plugins_by_type(self, plugin_type: PluginType) -> List[BasePlugin]:
        """根据类型获取插件"""
        result = []
        
        for plugin_name, plugin in self.plugins.items():
            plugin_info = self.plugin_infos.get(plugin_name)
            if plugin_info and plugin_info.plugin_type == plugin_type:
                result.append(plugin)
        
        return result
    
    def register_hook(self, hook_name: str, callback: Callable):
        """注册钩子"""
        if hook_name not in self.plugin_hooks:
            self.plugin_hooks[hook_name] = []
        
        self.plugin_hooks[hook_name].append(callback)
    
    def execute_hook(self, hook_name: str, *args, **kwargs):
        """执行钩子"""
        if hook_name in self.plugin_hooks:
            for callback in self.plugin_hooks[hook_name]:
                try:
                    callback(*args, **kwargs)
                except Exception as e:
                    print(f"Hook execution error in {callback}: {e}")
    
    def get_plugin_ui_components(self) -> Dict[str, QWidget]:
        """获取所有插件的UI组件"""
        components = {}
        
        for plugin_name, plugin in self.plugins.items():
            if plugin.is_active:
                component = plugin.get_ui_component()
                if component:
                    components[plugin_name] = component
        
        return components
    
    def save_plugin_config(self, plugin_name: str):
        """保存插件配置"""
        if plugin_name in self.plugins:
            config_file = os.path.expanduser(f'~/.gempy_ultimate/plugin_configs/{plugin_name}.json')
            os.makedirs(os.path.dirname(config_file), exist_ok=True)
            
            with open(config_file, 'w', encoding='utf-8') as f:
                json.dump(self.plugins[plugin_name].get_config(), f, indent=2)
    
    def load_plugin_config(self, plugin_name: str) -> Dict[str, Any]:
        """加载插件配置"""
        config_file = os.path.expanduser(f'~/.gempy_ultimate/plugin_configs/{plugin_name}.json')
        
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Failed to load plugin config for {plugin_name}: {e}")
        
        return {}


class PluginManagerWidget(QWidget):
    """插件管理器界面"""
    
    def __init__(self, plugin_manager: PluginManager, parent=None):
        super().__init__(parent)
        self.plugin_manager = plugin_manager
        self.setup_ui()
        self.connect_signals()
        self.refresh_plugin_list()
        
    def setup_ui(self):
        """设置界面"""
        layout = QVBoxLayout(self)
        
        # 标题
        title = QLabel("Plugin Manager")
        title.setStyleSheet("""
            QLabel {
                font-size: 16pt;
                font-weight: 700;
                color: #f8fafc;
                padding: 10px;
            }
        """)
        layout.addWidget(title)
        
        # 插件列表
        self.plugin_combo = QComboBox()
        self.plugin_combo.setStyleSheet("""
            QComboBox {
                background: rgba(51, 65, 85, 0.9);
                border: 2px solid #6b7280;
                border-radius: 8px;
                color: #f8fafc;
                font-weight: 600;
                padding: 8px;
                min-height: 25px;
            }
            QComboBox::drop-down {
                border: none;
            }
        """)
        layout.addWidget(self.plugin_combo)
        
        # 按钮区域
        button_layout = QHBoxLayout()
        
        self.discover_btn = QPushButton("Discover")
        self.load_btn = QPushButton("Load")
        self.activate_btn = QPushButton("Activate")
        self.deactivate_btn = QPushButton("Deactivate")
        self.unload_btn = QPushButton("Unload")
        
        buttons = [self.discover_btn, self.load_btn, self.activate_btn, 
                  self.deactivate_btn, self.unload_btn]
        
        for btn in buttons:
            btn.setStyleSheet("""
                QPushButton {
                    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                        stop:0 rgba(59, 130, 246, 0.8),
                        stop:1 rgba(30, 64, 175, 0.8));
                    border: 2px solid #3b82f6;
                    border-radius: 6px;
                    color: white;
                    font-weight: 600;
                    padding: 8px 16px;
                    min-width: 80px;
                }
                QPushButton:hover {
                    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                        stop:0 rgba(79, 150, 255, 0.9),
                        stop:1 rgba(50, 84, 195, 0.9));
                }
                QPushButton:pressed {
                    background: qlineargradient(x1:0, y1:0, x2:0, y2:1,
                        stop:0 rgba(30, 64, 175, 0.9),
                        stop:1 rgba(30, 58, 138, 0.9));
                }
            """)
            button_layout.addWidget(btn)
        
        layout.addLayout(button_layout)
        
        # 状态显示
        self.status_label = QLabel("Ready")
        self.status_label.setStyleSheet("""
            QLabel {
                background: rgba(16, 185, 129, 0.2);
                border: 2px solid #10b981;
                border-radius: 6px;
                color: #10b981;
                font-weight: 600;
                padding: 8px;
                margin-top: 10px;
            }
        """)
        layout.addWidget(self.status_label)
        
        # 进度条
        self.progress_bar = QProgressBar()
        self.progress_bar.setStyleSheet("""
            QProgressBar {
                background: rgba(51, 65, 85, 0.6);
                border: 2px solid #374151;
                border-radius: 8px;
                text-align: center;
                color: white;
                font-weight: 600;
            }
            QProgressBar::chunk {
                background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
                    stop:0 #10b981, stop:1 #059669);
                border-radius: 6px;
            }
        """)
        self.progress_bar.hide()
        layout.addWidget(self.progress_bar)
        
    def connect_signals(self):
        """连接信号"""
        self.discover_btn.clicked.connect(self.discover_plugins)
        self.load_btn.clicked.connect(self.load_plugin)
        self.activate_btn.clicked.connect(self.activate_plugin)
        self.deactivate_btn.clicked.connect(self.deactivate_plugin)
        self.unload_btn.clicked.connect(self.unload_plugin)
        
        # 插件管理器信号
        self.plugin_manager.plugin_loaded.connect(self.on_plugin_loaded)
        self.plugin_manager.plugin_unloaded.connect(self.on_plugin_unloaded)
        self.plugin_manager.plugin_activated.connect(self.on_plugin_activated)
        self.plugin_manager.plugin_deactivated.connect(self.on_plugin_deactivated)
        self.plugin_manager.plugin_error.connect(self.on_plugin_error)
        
    def discover_plugins(self):
        """发现插件"""
        self.status_label.setText("Discovering plugins...")
        self.progress_bar.show()
        self.progress_bar.setRange(0, 0)  # 无限进度条
        
        discovered = self.plugin_manager.discover_plugins()
        
        self.progress_bar.hide()
        self.status_label.setText(f"Discovered {len(discovered)} plugins")
        self.refresh_plugin_list()
    
    def load_plugin(self):
        """加载插件"""
        current_plugin = self.plugin_combo.currentText()
        if current_plugin:
            self.status_label.setText(f"Loading {current_plugin}...")
            success = self.plugin_manager.load_plugin(current_plugin)
            if success:
                self.status_label.setText(f"Loaded {current_plugin}")
            else:
                self.status_label.setText(f"Failed to load {current_plugin}")
    
    def activate_plugin(self):
        """激活插件"""
        current_plugin = self.plugin_combo.currentText()
        if current_plugin:
            self.status_label.setText(f"Activating {current_plugin}...")
            success = self.plugin_manager.activate_plugin(current_plugin)
            if success:
                self.status_label.setText(f"Activated {current_plugin}")
            else:
                self.status_label.setText(f"Failed to activate {current_plugin}")
    
    def deactivate_plugin(self):
        """停用插件"""
        current_plugin = self.plugin_combo.currentText()
        if current_plugin:
            success = self.plugin_manager.deactivate_plugin(current_plugin)
            if success:
                self.status_label.setText(f"Deactivated {current_plugin}")
            else:
                self.status_label.setText(f"Failed to deactivate {current_plugin}")
    
    def unload_plugin(self):
        """卸载插件"""
        current_plugin = self.plugin_combo.currentText()
        if current_plugin:
            success = self.plugin_manager.unload_plugin(current_plugin)
            if success:
                self.status_label.setText(f"Unloaded {current_plugin}")
                self.refresh_plugin_list()
            else:
                self.status_label.setText(f"Failed to unload {current_plugin}")
    
    def refresh_plugin_list(self):
        """刷新插件列表"""
        self.plugin_combo.clear()
        for plugin_name in self.plugin_manager.plugin_infos.keys():
            status = ""
            if plugin_name in self.plugin_manager.plugins:
                plugin = self.plugin_manager.plugins[plugin_name]
                status = " [Active]" if plugin.is_active else " [Loaded]"
            
            self.plugin_combo.addItem(f"{plugin_name}{status}")
    
    def on_plugin_loaded(self, plugin_name: str):
        """插件加载事件"""
        self.refresh_plugin_list()
    
    def on_plugin_unloaded(self, plugin_name: str):
        """插件卸载事件"""
        self.refresh_plugin_list()
    
    def on_plugin_activated(self, plugin_name: str):
        """插件激活事件"""
        self.refresh_plugin_list()
    
    def on_plugin_deactivated(self, plugin_name: str):
        """插件停用事件"""
        self.refresh_plugin_list()
    
    def on_plugin_error(self, plugin_name: str, error_message: str):
        """插件错误事件"""
        self.status_label.setText(f"Error in {plugin_name}: {error_message}")
        self.status_label.setStyleSheet("""
            QLabel {
                background: rgba(239, 68, 68, 0.2);
                border: 2px solid #ef4444;
                border-radius: 6px;
                color: #ef4444;
                font-weight: 600;
                padding: 8px;
                margin-top: 10px;
            }
        """)


# 示例插件实现
class ExampleDataProcessorPlugin(DataProcessorPlugin):
    """示例数据处理插件"""
    
    def get_info(self) -> PluginInfo:
        return PluginInfo(
            name="example_data_processor",
            version="1.0.0",
            description="Example data processing plugin",
            author="GemPy Ultimate Team",
            plugin_type=PluginType.DATA_PROCESSOR,
            dependencies=[],
            entry_point="ExampleDataProcessorPlugin"
        )
    
    def initialize(self) -> bool:
        print(f"Initializing {self.get_info().name}")
        return True
    
    def activate(self) -> bool:
        print(f"Activating {self.get_info().name}")
        self.is_active = True
        return True
    
    def deactivate(self) -> bool:
        print(f"Deactivating {self.get_info().name}")
        self.is_active = False
        return True
    
    def get_ui_component(self) -> Optional[QWidget]:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        layout.addWidget(QLabel("Example Data Processor Plugin"))
        return widget
    
    def process_data(self, data: Any) -> Any:
        # 示例数据处理
        print(f"Processing data with {self.get_info().name}")
        return data
    
    def validate_data(self, data: Any) -> bool:
        # 示例数据验证
        print(f"Validating data with {self.get_info().name}")
        return True


def create_example_plugin_directory():
    """创建示例插件目录"""
    plugin_dir = os.path.join(os.path.dirname(__file__), 'plugins', 'example_data_processor')
    os.makedirs(plugin_dir, exist_ok=True)
    
    # 创建插件信息文件
    plugin_info = {
        "name": "example_data_processor",
        "version": "1.0.0", 
        "description": "Example data processing plugin for GemPy Ultimate",
        "author": "GemPy Ultimate Team",
        "plugin_type": "data_processor",
        "dependencies": [],
        "entry_point": "ExampleDataProcessorPlugin"
    }
    
    with open(os.path.join(plugin_dir, 'plugin.json'), 'w', encoding='utf-8') as f:
        json.dump(plugin_info, f, indent=2)
    
    # 创建插件主文件
    plugin_main_content = '''"""
Example Data Processor Plugin
"""

from advanced_plugin_system import DataProcessorPlugin, PluginInfo, PluginType
from PyQt6.QtWidgets import QWidget, QVBoxLayout, QLabel
from typing import Any, Optional


class ExampleDataProcessorPlugin(DataProcessorPlugin):
    """示例数据处理插件"""
    
    def get_info(self) -> PluginInfo:
        return PluginInfo(
            name="example_data_processor",
            version="1.0.0",
            description="Example data processing plugin for GemPy Ultimate",
            author="GemPy Ultimate Team",
            plugin_type=PluginType.DATA_PROCESSOR,
            dependencies=[],
            entry_point="ExampleDataProcessorPlugin"
        )
    
    def initialize(self) -> bool:
        print(f"Initializing {self.get_info().name}")
        return True
    
    def activate(self) -> bool:
        print(f"Activating {self.get_info().name}")
        self.is_active = True
        return True
    
    def deactivate(self) -> bool:
        print(f"Deactivating {self.get_info().name}")
        self.is_active = False
        return True
    
    def get_ui_component(self) -> Optional[QWidget]:
        widget = QWidget()
        layout = QVBoxLayout(widget)
        
        title = QLabel("🔧 Example Data Processor")
        title.setStyleSheet("""
            QLabel {
                font-size: 14pt;
                font-weight: 700;
                color: #3b82f6;
                padding: 10px;
            }
        """)
        
        description = QLabel("This is an example data processing plugin.\\nIt demonstrates the plugin system capabilities.")
        description.setStyleSheet("""
            QLabel {
                color: #e5e7eb;
                font-size: 10pt;
                padding: 5px;
            }
        """)
        
        layout.addWidget(title)
        layout.addWidget(description)
        
        return widget
    
    def process_data(self, data: Any) -> Any:
        print(f"Processing data with {self.get_info().name}")
        # 示例：添加处理时间戳
        if isinstance(data, dict):
            data['processed_by'] = self.get_info().name
            data['processing_time'] = __import__('time').time()
        return data
    
    def validate_data(self, data: Any) -> bool:
        print(f"Validating data with {self.get_info().name}")
        # 示例验证逻辑
        if data is None:
            return False
        return True
'''
    
    with open(os.path.join(plugin_dir, 'main.py'), 'w', encoding='utf-8') as f:
        f.write(plugin_main_content)
    
    print(f"Created example plugin directory at: {plugin_dir}")


if __name__ == "__main__":
    from PyQt6.QtWidgets import QApplication
    
    app = QApplication([])
    
    # 创建示例插件目录
    create_example_plugin_directory()
    
    # 创建插件管理器
    plugin_manager = PluginManager()
    
    # 创建插件管理界面
    widget = PluginManagerWidget(plugin_manager)
    widget.show()
    
    app.exec()