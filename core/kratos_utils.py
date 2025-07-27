"""
Kratos Utilities Module for Safe Attribute Access

This module provides utility functions for safely accessing Kratos Multiphysics
attributes that may not be available in all versions or installations.
"""

import logging
from typing import Optional, Any, Union

logger = logging.getLogger(__name__)


def safe_get_kratos_version(kratos_module) -> str:
    """
    安全地获取Kratos版本信息
    
    Args:
        kratos_module: KratosMultiphysics模块
        
    Returns:
        版本字符串，如果无法获取则返回"unknown"
    """
    version_methods = [
        '__version__',
        'GetVersionString',
        'GetVersion',
        'VERSION',
        'version'
    ]
    
    for method in version_methods:
        try:
            if hasattr(kratos_module, method):
                version_attr = getattr(kratos_module, method)
                if callable(version_attr):
                    return str(version_attr())
                else:
                    return str(version_attr)
        except (AttributeError, TypeError, RuntimeError) as e:
            logger.debug(f"Failed to get version using {method}: {e}")
            continue
    
    return "unknown"


def safe_get_kratos_path(kratos_module) -> Optional[str]:
    """
    安全地获取Kratos安装路径
    
    Args:
        kratos_module: KratosMultiphysics模块
        
    Returns:
        路径字符串，如果无法获取则返回None
    """
    path_attributes = ['__path__', '__file__']
    
    for attr in path_attributes:
        try:
            if hasattr(kratos_module, attr):
                path_value = getattr(kratos_module, attr)
                if path_value:
                    if isinstance(path_value, list) and len(path_value) > 0:
                        return str(path_value[0])
                    elif isinstance(path_value, str):
                        return path_value
        except (AttributeError, TypeError, IndexError) as e:
            logger.debug(f"Failed to get path using {attr}: {e}")
            continue
    
    return None


def safe_check_kratos_application(kratos_module, app_name: str) -> bool:
    """
    安全地检查Kratos应用是否可用
    
    Args:
        kratos_module: KratosMultiphysics模块
        app_name: 应用名称 (如 "GeoMechanicsApplication")
        
    Returns:
        True如果应用可用，False否则
    """
    try:
        # 检查是否作为属性存在
        if hasattr(kratos_module, app_name):
            return True
        
        # 尝试动态导入
        full_module_name = f"KratosMultiphysics.{app_name}"
        __import__(full_module_name)
        return True
        
    except (ImportError, AttributeError) as e:
        logger.debug(f"Application {app_name} not available: {e}")
        return False


def safe_get_kratos_attribute(kratos_module, attr_name: str, default: Any = None) -> Any:
    """
    安全地获取Kratos模块的任意属性
    
    Args:
        kratos_module: KratosMultiphysics模块
        attr_name: 属性名称
        default: 默认值
        
    Returns:
        属性值，如果不存在则返回默认值
    """
    try:
        if hasattr(kratos_module, attr_name):
            attr_value = getattr(kratos_module, attr_name)
            # 如果是可调用的，尝试调用
            if callable(attr_value):
                try:
                    return attr_value()
                except Exception as e:
                    logger.debug(f"Failed to call {attr_name}(): {e}")
                    return default
            else:
                return attr_value
    except (AttributeError, TypeError, RuntimeError) as e:
        logger.debug(f"Failed to get attribute {attr_name}: {e}")
    
    return default


def get_kratos_info(kratos_module) -> dict:
    """
    获取Kratos的完整信息
    
    Args:
        kratos_module: KratosMultiphysics模块
        
    Returns:
        包含版本、路径、可用应用等信息的字典
    """
    info = {
        "version": safe_get_kratos_version(kratos_module),
        "path": safe_get_kratos_path(kratos_module),
        "applications": [],
        "attributes": []
    }
    
    # 检查常见应用
    common_apps = [
        "GeoMechanicsApplication",
        "StructuralMechanicsApplication", 
        "FluidDynamicsApplication",
        "LinearSolversApplication",
        "FSIApplication",
        "OptimizationApplication"
    ]
    
    for app in common_apps:
        if safe_check_kratos_application(kratos_module, app):
            info["applications"].append(app)
    
    # 获取常见属性
    common_attrs = ["DOMAIN_SIZE", "VERSION", "ECHO_LEVEL"]
    for attr in common_attrs:
        value = safe_get_kratos_attribute(kratos_module, attr)
        if value is not None:
            info["attributes"].append({"name": attr, "value": value})
    
    return info


# 示例使用
def example_usage():
    """演示如何安全地使用Kratos属性"""
    try:
        import KratosMultiphysics
        
        # 安全获取版本
        version = safe_get_kratos_version(KratosMultiphysics)
        print(f"Kratos版本: {version}")
        
        # 安全获取路径
        path = safe_get_kratos_path(KratosMultiphysics)
        if path:
            print(f"Kratos路径: {path}")
        
        # 检查应用
        has_geo = safe_check_kratos_application(KratosMultiphysics, "GeoMechanicsApplication")
        print(f"地质力学应用可用: {has_geo}")
        
        # 获取完整信息
        info = get_kratos_info(KratosMultiphysics)
        print(f"Kratos信息: {info}")
        
    except ImportError:
        print("Kratos不可用")


if __name__ == "__main__":
    example_usage()