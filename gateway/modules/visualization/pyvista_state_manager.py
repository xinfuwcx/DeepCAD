"""
PyVista State Manager - 前后端状态同步和数据传输优化
提供高效的数据流管道和状态管理
"""

import asyncio
import json
import time
import logging
from typing import Dict, Any, Optional, List, Union, Callable
from dataclasses import dataclass, asdict
from pathlib import Path
import numpy as np
from datetime import datetime
from uuid import uuid4

from .pyvista_web_bridge import get_pyvista_bridge
from ..websockets.connection_manager import manager

logger = logging.getLogger(__name__)


@dataclass
class VisualizationState:
    """可视化状态数据类"""
    session_id: str
    mesh_id: Optional[str] = None
    mesh_url: Optional[str] = None
    camera_state: Optional[Dict[str, Any]] = None
    render_settings: Optional[Dict[str, Any]] = None
    scalar_fields: Optional[List[str]] = None
    active_scalar: Optional[str] = None
    time_step: int = 0
    total_time_steps: int = 1
    bounds: Optional[List[float]] = None
    mesh_info: Optional[Dict[str, Any]] = None
    last_updated: Optional[datetime] = None


@dataclass
class DataStreamOptions:
    """数据流选项"""
    enable_compression: bool = True
    enable_progressive_loading: bool = True
    chunk_size: int = 1024 * 1024  # 1MB chunks
    quality_levels: List[float] = None  # LOD质量级别
    cache_enabled: bool = True
    max_cache_size: int = 100  # MB


class PyVistaStateManager:
    """
    PyVista状态管理器
    
    功能:
    - 前后端状态同步
    - 高效数据传输
    - 渐进式数据加载
    - 缓存管理
    - WebSocket实时通信
    """
    
    def __init__(self):
        self.bridge = get_pyvista_bridge()
        self.active_sessions: Dict[str, VisualizationState] = {}
        self.mesh_cache: Dict[str, Any] = {}
        self.data_streams: Dict[str, Dict[str, Any]] = {}
        self.stream_options = DataStreamOptions()
        self._callbacks: Dict[str, List[Callable]] = {}
        
    async def create_session(self, client_id: str) -> str:
        """创建新的可视化会话"""
        session_id = str(uuid4())
        
        state = VisualizationState(
            session_id=session_id,
            last_updated=datetime.now()
        )
        
        self.active_sessions[session_id] = state
        
        # 通知客户端会话已创建
        await self._notify_client(client_id, {
            "type": "session_created",
            "session_id": session_id,
            "timestamp": time.time()
        })
        
        logger.info(f"📱 Created visualization session: {session_id}")
        return session_id
    
    async def load_mesh_async(self, 
                            session_id: str, 
                            client_id: str,
                            mesh_source: Union[str, Path],
                            options: Optional[Dict[str, Any]] = None) -> bool:
        """异步加载网格数据"""
        if session_id not in self.active_sessions:
            await self._notify_client(client_id, {
                "type": "error",
                "message": "Session not found"
            })
            return False
        
        try:
            # 通知开始加载
            await self._notify_client(client_id, {
                "type": "loading_started",
                "message": "Loading mesh data..."
            })
            
            # 检查缓存
            cache_key = str(mesh_source)
            if cache_key in self.mesh_cache:
                mesh = self.mesh_cache[cache_key]
                logger.info(f"🎯 Using cached mesh: {cache_key}")
            else:
                # 加载网格
                mesh = self.bridge.load_mesh(mesh_source)
                if mesh is None:
                    raise ValueError(f"Failed to load mesh from {mesh_source}")
                
                # 缓存网格
                self.mesh_cache[cache_key] = mesh
            
            # 生成网格ID
            mesh_id = str(uuid4())
            
            # 获取网格信息
            mesh_info = self.bridge.get_mesh_info(mesh)
            
            # 提取标量字段
            scalar_fields = []
            if hasattr(mesh, 'array_names'):
                scalar_fields = list(mesh.array_names)
            
            # 更新会话状态
            state = self.active_sessions[session_id]
            state.mesh_id = mesh_id
            state.mesh_info = mesh_info
            state.scalar_fields = scalar_fields
            state.bounds = mesh_info.get("bounds", [])
            state.last_updated = datetime.now()
            
            # 如果有标量字段，设置默认活动标量
            if scalar_fields:
                state.active_scalar = scalar_fields[0]
            
            # 导出为Web格式
            web_format_path = await self._export_mesh_for_web(
                mesh, mesh_id, options or {}
            )
            
            if web_format_path:
                state.mesh_url = f"/static/web_exports/{Path(web_format_path).name}"
                
                # 通知客户端加载完成
                await self._notify_client(client_id, {
                    "type": "mesh_loaded",
                    "session_id": session_id,
                    "mesh_id": mesh_id,
                    "mesh_url": state.mesh_url,
                    "mesh_info": mesh_info,
                    "scalar_fields": scalar_fields,
                    "bounds": state.bounds
                })
                
                logger.info(f"✅ Mesh loaded successfully: {mesh_id}")
                return True
            else:
                raise ValueError("Failed to export mesh to web format")
                
        except Exception as e:
            logger.error(f"❌ Failed to load mesh: {e}")
            await self._notify_client(client_id, {
                "type": "error",
                "message": f"Failed to load mesh: {str(e)}"
            })
            return False
    
    async def update_scalar_field(self, 
                                session_id: str, 
                                client_id: str,
                                scalar_name: str) -> bool:
        """更新活动标量字段"""
        if session_id not in self.active_sessions:
            return False
        
        state = self.active_sessions[session_id]
        if not state.scalar_fields or scalar_name not in state.scalar_fields:
            await self._notify_client(client_id, {
                "type": "error",
                "message": f"Scalar field '{scalar_name}' not found"
            })
            return False
        
        try:
            # 更新活动标量
            state.active_scalar = scalar_name
            state.last_updated = datetime.now()
            
            # 获取缓存的网格
            cache_key = None
            for key, mesh in self.mesh_cache.items():
                if hasattr(mesh, 'array_names') and scalar_name in mesh.array_names:
                    cache_key = key
                    break
            
            if cache_key:
                mesh = self.mesh_cache[cache_key]
                
                # 重新导出带有新标量映射的网格
                export_options = {"color_by": scalar_name}
                web_format_path = await self._export_mesh_for_web(
                    mesh, state.mesh_id, export_options
                )
                
                if web_format_path:
                    state.mesh_url = f"/static/web_exports/{Path(web_format_path).name}"
                    
                    # 通知客户端标量更新
                    await self._notify_client(client_id, {
                        "type": "scalar_updated",
                        "session_id": session_id,
                        "active_scalar": scalar_name,
                        "mesh_url": state.mesh_url
                    })
                    
                    logger.info(f"🎨 Scalar field updated: {scalar_name}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"❌ Failed to update scalar field: {e}")
            await self._notify_client(client_id, {
                "type": "error",
                "message": f"Failed to update scalar field: {str(e)}"
            })
            return False
    
    async def update_camera_state(self, 
                                session_id: str,
                                camera_state: Dict[str, Any]) -> bool:
        """更新相机状态"""
        if session_id not in self.active_sessions:
            return False
        
        state = self.active_sessions[session_id]
        state.camera_state = camera_state
        state.last_updated = datetime.now()
        
        logger.debug(f"📷 Camera state updated for session: {session_id}")
        return True
    
    async def update_render_settings(self, 
                                   session_id: str,
                                   client_id: str,
                                   render_settings: Dict[str, Any]) -> bool:
        """更新渲染设置"""
        if session_id not in self.active_sessions:
            return False
        
        try:
            state = self.active_sessions[session_id]
            state.render_settings = render_settings
            state.last_updated = datetime.now()
            
            # 通知客户端渲染设置已更新
            await self._notify_client(client_id, {
                "type": "render_settings_updated",
                "session_id": session_id,
                "settings": render_settings
            })
            
            logger.info(f"🎛️ Render settings updated for session: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to update render settings: {e}")
            return False
    
    async def create_time_series_animation(self, 
                                         session_id: str,
                                         client_id: str,
                                         time_series_data: List[Union[str, Path]]) -> bool:
        """创建时间序列动画"""
        if session_id not in self.active_sessions:
            return False
        
        try:
            state = self.active_sessions[session_id]
            state.total_time_steps = len(time_series_data)
            state.time_step = 0
            
            # 预加载所有时间步数据
            time_step_urls = []
            for i, data_source in enumerate(time_series_data):
                await self._notify_client(client_id, {
                    "type": "loading_progress",
                    "step": i + 1,
                    "total": len(time_series_data),
                    "message": f"Loading time step {i + 1}/{len(time_series_data)}"
                })
                
                # 加载和导出每个时间步
                mesh = self.bridge.load_mesh(data_source)
                if mesh:
                    export_path = await self._export_mesh_for_web(
                        mesh, f"{state.mesh_id}_t{i}", {}
                    )
                    if export_path:
                        time_step_urls.append(f"/static/web_exports/{Path(export_path).name}")
            
            # 通知客户端动画数据准备完成
            await self._notify_client(client_id, {
                "type": "animation_ready",
                "session_id": session_id,
                "time_step_urls": time_step_urls,
                "total_steps": len(time_step_urls)
            })
            
            logger.info(f"🎬 Time series animation created: {len(time_step_urls)} steps")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to create time series animation: {e}")
            await self._notify_client(client_id, {
                "type": "error",
                "message": f"Failed to create animation: {str(e)}"
            })
            return False
    
    async def get_session_state(self, session_id: str) -> Optional[Dict[str, Any]]:
        """获取会话状态"""
        if session_id not in self.active_sessions:
            return None
        
        state = self.active_sessions[session_id]
        return asdict(state)
    
    async def cleanup_session(self, session_id: str, client_id: str) -> bool:
        """清理会话"""
        if session_id not in self.active_sessions:
            return False
        
        try:
            # 移除会话
            del self.active_sessions[session_id]
            
            # 清理相关的数据流
            if session_id in self.data_streams:
                del self.data_streams[session_id]
            
            # 通知客户端会话已清理
            await self._notify_client(client_id, {
                "type": "session_cleaned",
                "session_id": session_id
            })
            
            logger.info(f"🧹 Session cleaned up: {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to cleanup session: {e}")
            return False
    
    async def _export_mesh_for_web(self, 
                                 mesh: Any, 
                                 mesh_id: str,
                                 options: Dict[str, Any]) -> Optional[str]:
        """导出网格为Web格式"""
        try:
            # 处理网格用于Web渲染
            processed_mesh = self.bridge.process_mesh_for_web(
                mesh,
                render_type=options.get("render_type", "surface"),
                color_by=options.get("color_by")
            )
            
            if processed_mesh is None:
                return None
            
            # 导出为glTF格式
            export_path = self.bridge.mesh_to_web_format(processed_mesh, "gltf")
            return export_path
            
        except Exception as e:
            logger.error(f"❌ Failed to export mesh for web: {e}")
            return None
    
    async def _notify_client(self, client_id: str, message: Dict[str, Any]):
        """通知客户端"""
        try:
            await manager.send_personal_message(json.dumps(message), client_id)
        except Exception as e:
            logger.error(f"❌ Failed to notify client {client_id}: {e}")
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """获取性能统计"""
        return {
            "active_sessions": len(self.active_sessions),
            "cached_meshes": len(self.mesh_cache),
            "bridge_available": self.bridge.is_available,
            "memory_usage": {
                "cache_size": len(self.mesh_cache),
                "session_count": len(self.active_sessions)
            }
        }
    
    async def optimize_performance(self):
        """性能优化"""
        try:
            # 清理过期会话
            current_time = datetime.now()
            expired_sessions = []
            
            for session_id, state in self.active_sessions.items():
                if state.last_updated:
                    time_diff = (current_time - state.last_updated).total_seconds()
                    if time_diff > 3600:  # 1小时无活动
                        expired_sessions.append(session_id)
            
            for session_id in expired_sessions:
                del self.active_sessions[session_id]
                logger.info(f"🗑️ Expired session removed: {session_id}")
            
            # 缓存大小管理
            if len(self.mesh_cache) > 50:  # 限制缓存大小
                # 移除最旧的缓存项
                keys_to_remove = list(self.mesh_cache.keys())[:10]
                for key in keys_to_remove:
                    del self.mesh_cache[key]
                logger.info(f"🧹 Cache cleaned: removed {len(keys_to_remove)} items")
            
        except Exception as e:
            logger.error(f"❌ Performance optimization failed: {e}")


# 全局状态管理器实例
_state_manager_instance = None

def get_pyvista_state_manager() -> PyVistaStateManager:
    """获取PyVista状态管理器单例实例"""
    global _state_manager_instance
    if _state_manager_instance is None:
        _state_manager_instance = PyVistaStateManager()
    return _state_manager_instance


def reset_state_manager():
    """重置状态管理器（主要用于测试）"""
    global _state_manager_instance
    _state_manager_instance = None