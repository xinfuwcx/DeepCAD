"""
WebSocket路由
"""

import json
import asyncio
import uuid
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, Any
from .connection_manager import manager
from .real_time_feedback import get_real_time_feedback_manager, FeedbackType, TaskStatus

router = APIRouter()

@router.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """基础WebSocket连接（兼容性保留）"""
    await manager.connect(client_id, websocket)
    try:
        while True:
            # Keep the connection alive by waiting for data.
            # We don't need to use the data for now.
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        # Optionally log the disconnection
        # print(f"Client #{client_id} disconnected")

@router.websocket("/ws/realtime/{client_id}")
async def realtime_feedback_endpoint(websocket: WebSocket, client_id: str):
    """实时反馈WebSocket连接"""
    feedback_manager = get_real_time_feedback_manager()
    await feedback_manager.connect_client(websocket, client_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # 处理客户端消息
            message_type = message.get("type")
            
            if message_type == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": asyncio.get_event_loop().time()
                }))
            
            elif message_type == "subscribe":
                # 订阅任务更新
                task_id = message.get("task_id")
                if task_id:
                    await feedback_manager.subscribe_to_task(client_id, task_id)
            
            elif message_type == "unsubscribe":
                # 取消订阅任务
                task_id = message.get("task_id")
                if task_id:
                    await feedback_manager.unsubscribe_from_task(client_id, task_id)
            
            elif message_type == "get_active_tasks":
                # 获取活跃任务列表
                tasks = await feedback_manager.get_active_tasks()
                await websocket.send_text(json.dumps({
                    "type": "active_tasks",
                    "data": tasks
                }))
            
            elif message_type == "get_task_history":
                # 获取任务历史
                history = await feedback_manager.get_task_history(client_id)
                await websocket.send_text(json.dumps({
                    "type": "task_history",
                    "data": history
                }))
            
            elif message_type == "cancel_task":
                # 取消任务
                task_id = message.get("task_id")
                if task_id:
                    await feedback_manager.update_task_status(
                        task_id, 
                        TaskStatus.CANCELLED,
                        "任务被用户取消"
                    )
            
            else:
                # 未知消息类型
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": f"未知消息类型: {message_type}"
                }))
                
    except WebSocketDisconnect:
        await feedback_manager.disconnect_client(client_id)
    except Exception as e:
        print(f"WebSocket错误: {str(e)}")
        await feedback_manager.disconnect_client(client_id)

# REST API路由用于任务管理
@router.get("/tasks/active")
async def get_active_tasks():
    """获取所有活跃任务"""
    feedback_manager = get_real_time_feedback_manager()
    tasks = await feedback_manager.get_active_tasks()
    return {"tasks": tasks}

@router.post("/tasks/create")
async def create_task(task_data: Dict[str, Any]):
    """创建新任务"""
    feedback_manager = get_real_time_feedback_manager()
    
    task_name = task_data.get("name", "未命名任务")
    task_type = task_data.get("type", "generic")
    client_id = task_data.get("client_id")
    metadata = task_data.get("metadata", {})
    
    task_id = await feedback_manager.create_task(
        task_name=task_name,
        task_type=task_type,
        client_id=client_id,
        metadata=metadata
    )
    
    return {"task_id": task_id, "status": "created"}

@router.post("/tasks/{task_id}/progress")
async def update_task_progress(task_id: str, progress_data: Dict[str, Any]):
    """更新任务进度"""
    feedback_manager = get_real_time_feedback_manager()
    
    progress = progress_data.get("progress", 0.0)
    message = progress_data.get("message", "")
    data = progress_data.get("data")
    
    await feedback_manager.update_task_progress(task_id, progress, message, data)
    return {"status": "updated"}

@router.post("/tasks/{task_id}/status")
async def update_task_status(task_id: str, status_data: Dict[str, Any]):
    """更新任务状态"""
    feedback_manager = get_real_time_feedback_manager()
    
    status_str = status_data.get("status")
    message = status_data.get("message", "")
    data = status_data.get("data")
    
    try:
        status = TaskStatus(status_str)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"无效的任务状态: {status_str}")
    
    await feedback_manager.update_task_status(task_id, status, message, data)
    return {"status": "updated"}

@router.post("/tasks/{task_id}/result")
async def send_task_result(task_id: str, result_data: Dict[str, Any]):
    """发送任务结果"""
    feedback_manager = get_real_time_feedback_manager()
    
    message = result_data.get("message", "任务完成")
    data = result_data.get("data", {})
    
    await feedback_manager.send_task_result(task_id, data, message)
    return {"status": "sent"}

@router.post("/tasks/{task_id}/warning")
async def send_task_warning(task_id: str, warning_data: Dict[str, Any]):
    """发送任务警告"""
    feedback_manager = get_real_time_feedback_manager()
    
    message = warning_data.get("message", "警告")
    data = warning_data.get("data")
    
    await feedback_manager.send_warning(task_id, message, data)
    return {"status": "sent"}

@router.post("/tasks/{task_id}/error")
async def send_task_error(task_id: str, error_data: Dict[str, Any]):
    """发送任务错误"""
    feedback_manager = get_real_time_feedback_manager()
    
    message = error_data.get("message", "错误")
    data = error_data.get("data")
    
    await feedback_manager.send_error(task_id, message, data)
    return {"status": "sent"}

@router.post("/iot-data/broadcast")
async def broadcast_iot_data(iot_data: Dict[str, Any]):
    """广播IoT数据"""
    feedback_manager = get_real_time_feedback_manager()
    
    task_id = iot_data.get("task_id", "iot_monitoring")
    sensor_data = iot_data.get("data", {})
    
    await feedback_manager.send_iot_data_update(sensor_data, task_id)
    return {"status": "broadcasted"}

@router.post("/ai-optimization/broadcast")
async def broadcast_ai_optimization_result(optimization_data: Dict[str, Any]):
    """广播AI优化结果"""
    feedback_manager = get_real_time_feedback_manager()
    
    task_id = optimization_data.get("task_id", "ai_optimization")
    result_data = optimization_data.get("data", {})
    
    await feedback_manager.send_ai_optimization_result(result_data, task_id)
    return {"status": "broadcasted"} 