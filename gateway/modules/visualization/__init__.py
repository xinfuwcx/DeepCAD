"""
PyVista可视化模块 - 优化的前后端数据传输和状态同步

该模块提供:
- PyVista Web Bridge: 安全的PyVista集成
- State Manager: 前后端状态同步
- 高效的数据传输管道
- WebSocket实时通信
- 网格格式转换
- 时间序列动画支持
"""

from .pyvista_web_bridge import (
    PyVistaWebBridge,
    get_pyvista_bridge,
    reset_bridge,
    safe_load_mesh,
    safe_mesh_to_gltf,
    is_pyvista_available
)

from .pyvista_state_manager import (
    PyVistaStateManager,
    get_pyvista_state_manager,
    reset_state_manager,
    VisualizationState,
    DataStreamOptions
)

from .routes import router
from .cross_section_routes import router as cross_section_router
from .time_history_routes import router as time_history_router
from .slice_3d_routes import router as slice_3d_router

__all__ = [
    "PyVistaWebBridge",
    "get_pyvista_bridge",
    "reset_bridge", 
    "safe_load_mesh",
    "safe_mesh_to_gltf",
    "is_pyvista_available",
    "PyVistaStateManager",
    "get_pyvista_state_manager",
    "reset_state_manager",
    "VisualizationState",
    "DataStreamOptions",
    "router",
    "cross_section_router",
    "time_history_router",
    "slice_3d_router"
]