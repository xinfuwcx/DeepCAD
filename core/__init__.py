"""
DeepCAD Core Package

This package contains the core functionality for the DeepCAD application,
including Kratos integration and other computational modules.
"""

# 导入核心模块
try:
    from .kratos_integration import KratosIntegration
    KRATOS_AVAILABLE = True
    print("OK Kratos集成模块加载成功")
except ImportError as e:
    KratosIntegration = None
    KRATOS_AVAILABLE = False
    print(f"WARN Kratos集成模块不可用: {e}")

__all__ = ['KratosIntegration', 'KRATOS_AVAILABLE']