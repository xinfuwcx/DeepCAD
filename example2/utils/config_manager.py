#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
配置管理器 - ConfigManager
统一管理Example2的所有配置设置
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, Optional


class ConfigManager:
    """配置管理器"""
    
    def __init__(self, config_file: Optional[str] = None):
        """初始化配置管理器
        
        Args:
            config_file: 配置文件路径，默认为项目目录下的config.json
        """
        if config_file is None:
            config_file = Path(__file__).parent / "config.json"
        
        self.config_file = Path(config_file)
        self._config = {}
        self._load_config()
    
    def _load_config(self):
        """加载配置文件"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    self._config = json.load(f)
                print(f"✅ 配置文件加载成功: {self.config_file}")
            else:
                print(f"⚠️ 配置文件不存在，使用默认配置: {self.config_file}")
                self._create_default_config()
        except Exception as e:
            print(f"❌ 配置文件加载失败: {e}")
            self._create_default_config()
    
    def _create_default_config(self):
        """创建默认配置"""
        self._config = {
            "project": {
                "name": "Example2",
                "version": "1.0.0"
            },
            "ui": {
                "theme": "modern",
                "language": "zh_CN"
            },
            "performance": {
                "max_mesh_cells_for_edges": 500000,
                "async_display_update": True
            },
            "analysis": {
                "max_iterations": 100,
                "convergence_tolerance": 1e-6
            }
        }
    
    def get(self, key: str, default: Any = None) -> Any:
        """获取配置值
        
        Args:
            key: 配置键，支持点分隔的层级访问，如 "ui.theme"
            default: 默认值
            
        Returns:
            配置值
        """
        try:
            keys = key.split('.')
            value = self._config
            
            for k in keys:
                if isinstance(value, dict) and k in value:
                    value = value[k]
                else:
                    return default
            
            return value
        except Exception:
            return default
    
    def set(self, key: str, value: Any):
        """设置配置值
        
        Args:
            key: 配置键，支持点分隔的层级访问
            value: 配置值
        """
        try:
            keys = key.split('.')
            config = self._config
            
            # 导航到目标位置
            for k in keys[:-1]:
                if k not in config:
                    config[k] = {}
                config = config[k]
            
            # 设置值
            config[keys[-1]] = value
        except Exception as e:
            print(f"❌ 设置配置失败: {e}")
    
    def save(self):
        """保存配置到文件"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self._config, f, indent=2, ensure_ascii=False)
            print(f"✅ 配置保存成功: {self.config_file}")
            return True
        except Exception as e:
            print(f"❌ 配置保存失败: {e}")
            return False
    
    def get_all(self) -> Dict[str, Any]:
        """获取所有配置"""
        return self._config.copy()
    
    # 便捷方法
    def get_ui_config(self) -> Dict[str, Any]:
        """获取UI配置"""
        return self.get("ui", {})
    
    def get_performance_config(self) -> Dict[str, Any]:
        """获取性能配置"""
        return self.get("performance", {})
    
    def get_analysis_config(self) -> Dict[str, Any]:
        """获取分析配置"""
        return self.get("analysis", {})
    
    def get_visualization_config(self) -> Dict[str, Any]:
        """获取可视化配置"""
        return self.get("visualization", {})
    
    def get_file_paths_config(self) -> Dict[str, Any]:
        """获取文件路径配置"""
        return self.get("file_paths", {})
    
    def get_kratos_config(self) -> Dict[str, Any]:
        """获取Kratos配置"""
        return self.get("kratos", {})
    
    def is_debug_enabled(self) -> bool:
        """是否启用调试模式"""
        return self.get("debug.enable_console_output", True)
    
    def get_max_mesh_cells_for_edges(self) -> int:
        """获取显示网格边的最大单元数阈值"""
        return self.get("performance.max_mesh_cells_for_edges", 500000)
    
    def is_async_display_enabled(self) -> bool:
        """是否启用异步显示更新"""
        return self.get("performance.async_display_update", True)
    
    def get_default_convergence_tolerance(self) -> float:
        """获取默认收敛精度"""
        return self.get("analysis.convergence_tolerance", 1e-6)
    
    def get_max_iterations(self) -> int:
        """获取最大迭代次数"""
        return self.get("analysis.max_iterations", 100)
    
    def should_show_material_legend(self) -> bool:
        """是否显示材料图例"""
        return self.get("visualization.show_material_legend", True)
    
    def get_transparency_alpha(self) -> float:
        """获取透明度"""
        return self.get("visualization.transparency_alpha", 0.7)


# 全局配置实例
_config_manager = None

def get_config() -> ConfigManager:
    """获取全局配置管理器实例"""
    global _config_manager
    if _config_manager is None:
        _config_manager = ConfigManager()
    return _config_manager


# 便捷函数
def get_setting(key: str, default: Any = None) -> Any:
    """获取配置值的便捷函数"""
    return get_config().get(key, default)


def set_setting(key: str, value: Any):
    """设置配置值的便捷函数"""
    get_config().set(key, value)


def save_settings():
    """保存配置的便捷函数"""
    return get_config().save()


if __name__ == "__main__":
    # 测试配置管理器
    print("🧪 测试配置管理器...")
    
    config = ConfigManager()
    
    # 测试获取配置
    print(f"项目名称: {config.get('project.name')}")
    print(f"主题: {config.get('ui.theme')}")
    print(f"最大迭代次数: {config.get_max_iterations()}")
    
    # 测试设置配置
    config.set('test.value', 42)
    print(f"测试值: {config.get('test.value')}")
    
    print("✅ 配置管理器测试完成")
