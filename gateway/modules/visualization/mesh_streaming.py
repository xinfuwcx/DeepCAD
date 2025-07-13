"""
Mesh Streaming Service for Real-time Moving-Mesh Updates
实时网格更新的WebSocket流式传输服务
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Any, Set
from fastapi import WebSocket, WebSocketDisconnect
from uuid import uuid4

logger = logging.getLogger(__name__)


class MeshStreamingService:
    """网格流式传输服务"""
    
    def __init__(self):
        # 活跃的WebSocket连接
        self.active_connections: Dict[str, WebSocket] = {}
        
        # 订阅的网格ID
        self.mesh_subscriptions: Dict[str, Set[str]] = {}  # mesh_id -> set of connection_ids
        
        # 网格更新缓存
        self.mesh_cache: Dict[str, Dict[str, Any]] = {}
        
        # 更新队列
        self.update_queue: asyncio.Queue = asyncio.Queue()
        
        # 启动后台任务
        self.background_task = None
    
    async def connect(self, websocket: WebSocket, connection_id: str = None) -> str:
        """建立WebSocket连接"""
        if connection_id is None:
            connection_id = str(uuid4())
        
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        
        logger.info(f"📡 WebSocket connected: {connection_id}")
        
        # 启动后台更新任务
        if self.background_task is None:
            self.background_task = asyncio.create_task(self._background_update_loop())
        
        return connection_id
    
    async def disconnect(self, connection_id: str):
        """断开WebSocket连接"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        # 清理订阅
        for mesh_id in list(self.mesh_subscriptions.keys()):
            if connection_id in self.mesh_subscriptions[mesh_id]:
                self.mesh_subscriptions[mesh_id].remove(connection_id)
                if not self.mesh_subscriptions[mesh_id]:
                    del self.mesh_subscriptions[mesh_id]
        
        logger.info(f"📡 WebSocket disconnected: {connection_id}")
    
    async def subscribe_mesh(self, connection_id: str, mesh_id: str):
        """订阅网格更新"""
        if mesh_id not in self.mesh_subscriptions:
            self.mesh_subscriptions[mesh_id] = set()
        
        self.mesh_subscriptions[mesh_id].add(connection_id)
        
        # 发送当前网格状态
        if mesh_id in self.mesh_cache:
            await self._send_to_connection(connection_id, {
                "type": "mesh_initial",
                "mesh_id": mesh_id,
                "data": self.mesh_cache[mesh_id]
            })
        
        logger.info(f"📊 Connection {connection_id} subscribed to mesh {mesh_id}")
    
    async def unsubscribe_mesh(self, connection_id: str, mesh_id: str):
        """取消订阅网格更新"""
        if mesh_id in self.mesh_subscriptions:
            self.mesh_subscriptions[mesh_id].discard(connection_id)
            if not self.mesh_subscriptions[mesh_id]:
                del self.mesh_subscriptions[mesh_id]
        
        logger.info(f"📊 Connection {connection_id} unsubscribed from mesh {mesh_id}")
    
    async def stream_mesh_update(self, mesh_id: str, node_updates: List[Dict[str, Any]], 
                                incremental: bool = True):
        """流式传输网格更新"""
        if mesh_id not in self.mesh_subscriptions:
            return  # 没有订阅者
        
        update_message = {
            "type": "mesh_update",
            "mesh_id": mesh_id,
            "incremental": incremental,
            "nodes": node_updates,
            "timestamp": time.time()
        }
        
        # 更新缓存
        if incremental and mesh_id in self.mesh_cache:
            # 增量更新缓存
            cached_nodes = {node["id"]: node for node in self.mesh_cache[mesh_id].get("nodes", [])}
            for node_update in node_updates:
                cached_nodes[node_update["id"]] = node_update
            self.mesh_cache[mesh_id]["nodes"] = list(cached_nodes.values())
        else:
            # 全量更新缓存
            self.mesh_cache[mesh_id] = {
                "nodes": node_updates,
                "last_update": time.time()
            }
        
        # 添加到更新队列
        await self.update_queue.put((mesh_id, update_message))
        
        logger.debug(f"🔄 Queued mesh update for {mesh_id}: {len(node_updates)} nodes")
    
    async def stream_mesh_full(self, mesh_id: str, mesh_data: Dict[str, Any]):
        """流式传输完整网格数据"""
        if mesh_id not in self.mesh_subscriptions:
            return
        
        full_message = {
            "type": "mesh_full",
            "mesh_id": mesh_id,
            "data": mesh_data,
            "timestamp": time.time()
        }
        
        # 更新缓存
        self.mesh_cache[mesh_id] = mesh_data
        
        # 添加到更新队列
        await self.update_queue.put((mesh_id, full_message))
        
        logger.info(f"📦 Queued full mesh data for {mesh_id}")
    
    async def _background_update_loop(self):
        """后台更新循环"""
        logger.info("🔄 Starting mesh streaming background loop")
        
        try:
            while True:
                try:
                    # 等待更新消息
                    mesh_id, message = await asyncio.wait_for(
                        self.update_queue.get(), 
                        timeout=1.0
                    )
                    
                    # 发送给订阅者
                    if mesh_id in self.mesh_subscriptions:
                        await self._broadcast_to_subscribers(mesh_id, message)
                    
                except asyncio.TimeoutError:
                    # 超时是正常的，继续循环
                    continue
                except Exception as e:
                    logger.error(f"❌ Error in background update loop: {e}")
                    await asyncio.sleep(1)
                    
        except asyncio.CancelledError:
            logger.info("🛑 Background update loop cancelled")
    
    async def _broadcast_to_subscribers(self, mesh_id: str, message: Dict[str, Any]):
        """向订阅者广播消息"""
        if mesh_id not in self.mesh_subscriptions:
            return
        
        subscribers = list(self.mesh_subscriptions[mesh_id])
        
        # 并发发送给所有订阅者
        tasks = []
        for connection_id in subscribers:
            task = asyncio.create_task(
                self._send_to_connection(connection_id, message)
            )
            tasks.append(task)
        
        if tasks:
            # 等待所有发送任务完成
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 检查失败的连接
            failed_connections = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    failed_connections.append(subscribers[i])
                    logger.warning(f"Failed to send to {subscribers[i]}: {result}")
            
            # 清理失败的连接
            for connection_id in failed_connections:
                await self.disconnect(connection_id)
    
    async def _send_to_connection(self, connection_id: str, message: Dict[str, Any]):
        """发送消息到指定连接"""
        if connection_id not in self.active_connections:
            return
        
        websocket = self.active_connections[connection_id]
        
        try:
            await websocket.send_text(json.dumps(message))
        except WebSocketDisconnect:
            # 连接已断开
            await self.disconnect(connection_id)
        except Exception as e:
            logger.error(f"❌ Error sending to {connection_id}: {e}")
            await self.disconnect(connection_id)
    
    async def send_status_update(self, mesh_id: str, status: str, message: str = ""):
        """发送状态更新"""
        status_message = {
            "type": "mesh_status",
            "mesh_id": mesh_id,
            "status": status,  # "processing", "completed", "error"
            "message": message,
            "timestamp": time.time()
        }
        
        if mesh_id in self.mesh_subscriptions:
            await self.update_queue.put((mesh_id, status_message))
    
    async def send_progress_update(self, mesh_id: str, progress: float, stage: str = ""):
        """发送进度更新"""
        progress_message = {
            "type": "mesh_progress",
            "mesh_id": mesh_id,
            "progress": progress,  # 0.0 - 100.0
            "stage": stage,
            "timestamp": time.time()
        }
        
        if mesh_id in self.mesh_subscriptions:
            await self.update_queue.put((mesh_id, progress_message))
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """获取连接统计信息"""
        return {
            "active_connections": len(self.active_connections),
            "mesh_subscriptions": {
                mesh_id: len(subscribers) 
                for mesh_id, subscribers in self.mesh_subscriptions.items()
            },
            "cached_meshes": list(self.mesh_cache.keys()),
            "queue_size": self.update_queue.qsize()
        }
    
    async def cleanup(self):
        """清理资源"""
        # 取消后台任务
        if self.background_task:
            self.background_task.cancel()
            try:
                await self.background_task
            except asyncio.CancelledError:
                pass
        
        # 关闭所有连接
        for connection_id, websocket in list(self.active_connections.items()):
            try:
                await websocket.close()
            except:
                pass
        
        self.active_connections.clear()
        self.mesh_subscriptions.clear()
        self.mesh_cache.clear()
        
        logger.info("🧹 MeshStreamingService cleanup completed")


# 全局实例
mesh_streaming_service = MeshStreamingService()