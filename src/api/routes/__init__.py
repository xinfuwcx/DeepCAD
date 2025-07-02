"""
@file __init__.py
@description API路由导入
@author Deep Excavation Team
@version 2.0.0
@copyright 2025
"""

# V2架构下，我们只导入核心的、服务化的路由模块。
# 这避免了旧架构中的循环依赖问题。

from . import modeling_router
from . import compute_router
from . import ai_router

from . import visualization_router
from . import excavation_router
from . import iga_geometry_router 