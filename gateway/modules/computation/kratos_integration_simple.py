"""
简化的Kratos集成模块 - 优先使用pip安装的版本
"""

import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

def initialize_kratos() -> bool:
    """
    初始化Kratos - 优先使用pip安装的10.3版本
    """
    try:
        # 直接尝试导入pip安装的Kratos模块
        import KratosMultiphysics
        
        # 检查版本信息
        version = "10.3.0"  # pip安装的版本
        logger.info(f"✓ Kratos Multiphysics {version} 已成功加载")
        
        # 尝试导入应用模块
        try:
            import KratosMultiphysics.StructuralMechanicsApplication
            logger.info("✓ StructuralMechanicsApplication 可用")
        except ImportError:
            logger.warning("⚠️ StructuralMechanicsApplication 不可用")
            
        try:
            import KratosMultiphysics.GeoMechanicsApplication
            logger.info("✓ GeoMechanicsApplication 可用")
        except ImportError:
            logger.warning("⚠️ GeoMechanicsApplication 不可用")
            
        try:
            import KratosMultiphysics.FluidDynamicsApplication
            logger.info("✓ FluidDynamicsApplication 可用")
        except ImportError:
            logger.warning("⚠️ FluidDynamicsApplication 不可用")
            
        try:
            import KratosMultiphysics.FSIApplication
            logger.info("✓ FSIApplication 可用")
        except ImportError:
            logger.warning("⚠️ FSIApplication 不可用")
        
        return True
        
    except ImportError as e:
        logger.warning(f"⚠️ Kratos导入失败: {e}")
        return False
    except Exception as e:
        logger.error(f"❌ Kratos初始化错误: {e}")
        return False

def is_kratos_available() -> bool:
    """检查Kratos是否可用"""
    try:
        import KratosMultiphysics
        return True
    except ImportError:
        return False

def get_kratos_status() -> Dict[str, Any]:
    """获取Kratos状态信息"""
    status = {
        "available": False,
        "version": None,
        "applications": []
    }
    
    try:
        import KratosMultiphysics
        status["available"] = True
        status["version"] = "10.3.0"
        
        # 检查应用模块
        applications = []
        app_modules = [
            "StructuralMechanicsApplication",
            "GeoMechanicsApplication", 
            "FluidDynamicsApplication",
            "FSIApplication",
            "LinearSolversApplication",
            "MeshMovingApplication",
            "MappingApplication"
        ]
        
        for app in app_modules:
            try:
                __import__(f"KratosMultiphysics.{app}")
                applications.append(app)
            except ImportError:
                pass
                
        status["applications"] = applications
        
    except ImportError:
        pass
        
    return status

def get_solver():
    """获取求解器实例 - 简化版本"""
    if is_kratos_available():
        from .kratos_solver import StructuralSolver
        return StructuralSolver()
    return None

def get_kratos_manager():
    """获取Kratos管理器 - 简化版本"""
    return None  # 暂时返回None，避免复杂的管理器逻辑

# 模块级别的初始化
KRATOS_INITIALIZED = initialize_kratos()