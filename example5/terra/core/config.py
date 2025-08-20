"""
Terra 配置管理
"""

import os
import json
from pathlib import Path
from typing import Dict, Any, Optional

class TerraConfig:
    """Terra 配置管理类"""
    
    def __init__(self):
        """初始化配置"""
        self.config_dir = Path.home() / ".terra"
        self.config_file = self.config_dir / "config.json"
        self.projects_dir = self.config_dir / "projects"
        
        # 创建配置目录
        self.config_dir.mkdir(exist_ok=True)
        self.projects_dir.mkdir(exist_ok=True)
        
        # 默认配置
        self.default_config = {
            # 应用设置
            "app": {
                "theme": "fusion",
                "language": "zh_CN",
                "auto_save": True,
                "auto_save_interval": 300  # 5分钟
            },
            
            # GMSH 设置
            "gmsh": {
                "verbosity": 1,
                "terminal": 1,
                "default_mesh_size": 1.0,
                "max_mesh_size": 10.0,
                "min_mesh_size": 0.1,
                "algorithm": "delaunay"
            },
            
            # 界面设置
            "ui": {
                "window_width": 1200,
                "window_height": 800,
                "sidebar_width": 250,
                "properties_width": 200,
                "show_grid": True,
                "show_axes": True,
                "background_color": "#2b2b2b"
            },
            
            # 3D 视口设置
            "viewport": {
                "fov": 45,
                "near_plane": 0.1,
                "far_plane": 1000.0,
                "mouse_sensitivity": 1.0,
                "zoom_speed": 1.0
            },
            
            # Kratos 设置
            "kratos": {
                "enabled": True,
                "solver_type": "structural_mechanics_static",
                "max_iterations": 1000,
                "tolerance": 1e-6
            },
            
            # 文件路径
            "paths": {
                "recent_projects": [],
                "temp_dir": str(self.config_dir / "temp"),
                "output_dir": str(self.config_dir / "output"),
                "templates_dir": str(self.config_dir / "templates")
            }
        }
        
        # 加载配置
        self.config = self.load_config()
    
    def load_config(self) -> Dict[str, Any]:
        """加载配置文件"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    
                # 合并默认配置（处理新增配置项）
                merged_config = self._merge_config(self.default_config.copy(), config)
                return merged_config
            else:
                # 首次运行，创建默认配置
                self.save_config(self.default_config)
                return self.default_config.copy()
                
        except Exception as e:
            print(f"加载配置失败，使用默认配置: {e}")
            return self.default_config.copy()
    
    def save_config(self, config: Optional[Dict[str, Any]] = None):
        """保存配置文件"""
        try:
            config_to_save = config or self.config
            
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(config_to_save, f, indent=2, ensure_ascii=False)
                
        except Exception as e:
            print(f"保存配置失败: {e}")
    
    def _merge_config(self, default: Dict, user: Dict) -> Dict:
        """递归合并配置"""
        for key, value in user.items():
            if key in default:
                if isinstance(default[key], dict) and isinstance(value, dict):
                    default[key] = self._merge_config(default[key], value)
                else:
                    default[key] = value
            else:
                default[key] = value
        return default
    
    def get(self, key_path: str, default=None):
        """获取配置值 (支持点号路径，如 'ui.window_width')"""
        try:
            keys = key_path.split('.')
            value = self.config
            
            for key in keys:
                value = value[key]
                
            return value
            
        except (KeyError, TypeError):
            return default
    
    def set(self, key_path: str, value: Any):
        """设置配置值"""
        try:
            keys = key_path.split('.')
            config = self.config
            
            # 导航到最后一级
            for key in keys[:-1]:
                if key not in config:
                    config[key] = {}
                config = config[key]
            
            # 设置值
            config[keys[-1]] = value
            
            # 保存配置
            self.save_config()
            
        except Exception as e:
            print(f"设置配置失败: {e}")
    
    def add_recent_project(self, project_path: str):
        """添加最近项目"""
        recent = self.get("paths.recent_projects", [])
        
        # 移除重复项
        if project_path in recent:
            recent.remove(project_path)
        
        # 添加到开头
        recent.insert(0, project_path)
        
        # 保持最多10个
        recent = recent[:10]
        
        self.set("paths.recent_projects", recent)
    
    def get_recent_projects(self) -> list:
        """获取最近项目列表"""
        return self.get("paths.recent_projects", [])
    
    def create_temp_dir(self) -> Path:
        """创建临时目录"""
        temp_dir = Path(self.get("paths.temp_dir"))
        temp_dir.mkdir(parents=True, exist_ok=True)
        return temp_dir
    
    def create_output_dir(self) -> Path:
        """创建输出目录"""
        output_dir = Path(self.get("paths.output_dir"))
        output_dir.mkdir(parents=True, exist_ok=True)
        return output_dir