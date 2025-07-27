"""
WebSocket实时反馈系统
为Terra分析、物理AI优化和其他计算任务提供实时进度更新
"""

import asyncio
import json
import logging
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
import uuid

from fastapi import WebSocket
from ..ai_assistant.physics_ai_optimizer import get_physics_ai_optimizer

logger = logging.getLogger(__name__)

class FeedbackType(Enum):
    """反馈消息类型"""
    PROGRESS = "progress"              # 进度更新
    STATUS = "status"                 # 状态变更
    WARNING = "warning"               # 警告信息
    ERROR = "error"                   # 错误信息
    INFO = "info"                     # 信息提示
    RESULT = "result"                 # 结果数据
    IOT_DATA = "iot_data"            # IoT传感器数据
    AI_OPTIMIZATION = "ai_optimization" # AI优化结果

class TaskStatus(Enum):
    """任务状态"""
    PENDING = "pending"
    STARTING = "starting"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

@dataclass
class FeedbackMessage:
    """反馈消息"""
    id: str
    type: FeedbackType
    task_id: str
    task_name: str
    timestamp: datetime
    message: str
    data: Optional[Dict[str, Any]] = None
    progress: Optional[float] = None  # 0-100
    status: Optional[TaskStatus] = None

@dataclass
class TaskInfo:
    """任务信息"""
    id: str
    name: str
    type: str
    status: TaskStatus
    progress: float
    start_time: datetime
    end_time: Optional[datetime] = None
    client_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class RealTimeFeedbackManager:
    """实时反馈管理器"""
    
    def __init__(self):
        # WebSocket连接管理
        self.active_connections: Dict[str, WebSocket] = {}
        
        # 任务管理
        self.active_tasks: Dict[str, TaskInfo] = {}
        self.task_subscribers: Dict[str, Set[str]] = {}  # task_id -> client_ids
        
        # 消息队列
        self.message_queue: Dict[str, List[FeedbackMessage]] = {}
        
        # 物理AI优化器集成
        self.physics_ai_optimizer = get_physics_ai_optimizer()
        
        # 启动后台任务
        self._background_task = None
    
    async def connect_client(self, websocket: WebSocket, client_id: str):
        """连接客户端"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.message_queue[client_id] = []
        
        logger.info(f"客户端 {client_id} 已连接")
        
        # 发送连接确认
        await self.send_message(client_id, FeedbackMessage(
            id=str(uuid.uuid4()),
            type=FeedbackType.INFO,
            task_id="system",
            task_name="系统",
            timestamp=datetime.now(),
            message="WebSocket连接已建立",
            data={"client_id": client_id}
        ))
        
        # 发送当前活跃任务状态
        for task in self.active_tasks.values():
            await self.send_task_status(client_id, task)
    
    async def disconnect_client(self, client_id: str):
        """断开客户端连接"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        
        if client_id in self.message_queue:
            del self.message_queue[client_id]
        
        # 从任务订阅中移除
        for task_id, subscribers in self.task_subscribers.items():
            subscribers.discard(client_id)
        
        logger.info(f"客户端 {client_id} 已断开连接")
    
    async def subscribe_to_task(self, client_id: str, task_id: str):
        """订阅任务更新"""
        if task_id not in self.task_subscribers:
            self.task_subscribers[task_id] = set()
        
        self.task_subscribers[task_id].add(client_id)
        
        # 发送当前任务状态
        if task_id in self.active_tasks:
            await self.send_task_status(client_id, self.active_tasks[task_id])
        
        logger.info(f"客户端 {client_id} 订阅任务 {task_id}")
    
    async def unsubscribe_from_task(self, client_id: str, task_id: str):
        """取消订阅任务"""
        if task_id in self.task_subscribers:
            self.task_subscribers[task_id].discard(client_id)
        
        logger.info(f"客户端 {client_id} 取消订阅任务 {task_id}")
    
    async def create_task(self, task_name: str, task_type: str, 
                         client_id: Optional[str] = None,
                         metadata: Optional[Dict[str, Any]] = None) -> str:
        """创建新任务"""
        task_id = str(uuid.uuid4())
        
        task = TaskInfo(
            id=task_id,
            name=task_name,
            type=task_type,
            status=TaskStatus.PENDING,
            progress=0.0,
            start_time=datetime.now(),
            client_id=client_id,
            metadata=metadata or {}
        )
        
        self.active_tasks[task_id] = task
        self.task_subscribers[task_id] = set()
        
        # 如果指定了客户端，自动订阅
        if client_id:
            await self.subscribe_to_task(client_id, task_id)
        
        logger.info(f"创建任务: {task_name} ({task_id})")
        return task_id
    
    async def update_task_progress(self, task_id: str, progress: float, 
                                 message: str = "",
                                 data: Optional[Dict[str, Any]] = None):
        """更新任务进度"""
        if task_id not in self.active_tasks:
            return
        
        task = self.active_tasks[task_id]
        task.progress = min(100.0, max(0.0, progress))
        
        feedback = FeedbackMessage(
            id=str(uuid.uuid4()),
            type=FeedbackType.PROGRESS,
            task_id=task_id,
            task_name=task.name,
            timestamp=datetime.now(),
            message=message,
            progress=progress,
            status=task.status,
            data=data
        )
        
        await self.broadcast_to_task_subscribers(task_id, feedback)
    
    async def update_task_status(self, task_id: str, status: TaskStatus,
                               message: str = "",
                               data: Optional[Dict[str, Any]] = None):
        """更新任务状态"""
        if task_id not in self.active_tasks:
            return
        
        task = self.active_tasks[task_id]
        old_status = task.status
        task.status = status
        
        if status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
            task.end_time = datetime.now()
        
        feedback = FeedbackMessage(
            id=str(uuid.uuid4()),
            type=FeedbackType.STATUS,
            task_id=task_id,
            task_name=task.name,
            timestamp=datetime.now(),
            message=message or f"任务状态从 {old_status.value} 变更为 {status.value}",
            status=status,
            data=data
        )
        
        await self.broadcast_to_task_subscribers(task_id, feedback)
        
        # 如果任务完成，清理资源
        if status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED]:
            await asyncio.sleep(5)  # 延迟清理，让客户端有时间处理最终状态
            await self.cleanup_task(task_id)
    
    async def send_task_result(self, task_id: str, result_data: Dict[str, Any],
                             message: str = "任务完成"):
        """发送任务结果"""
        feedback = FeedbackMessage(
            id=str(uuid.uuid4()),
            type=FeedbackType.RESULT,
            task_id=task_id,
            task_name=self.active_tasks.get(task_id, TaskInfo("", "", "", TaskStatus.PENDING, 0.0, datetime.now())).name,
            timestamp=datetime.now(),
            message=message,
            data=result_data
        )
        
        await self.broadcast_to_task_subscribers(task_id, feedback)
    
    async def send_warning(self, task_id: str, warning_message: str,
                          data: Optional[Dict[str, Any]] = None):
        """发送警告信息"""
        feedback = FeedbackMessage(
            id=str(uuid.uuid4()),
            type=FeedbackType.WARNING,
            task_id=task_id,
            task_name=self.active_tasks.get(task_id, TaskInfo("", "", "", TaskStatus.PENDING, 0.0, datetime.now())).name,
            timestamp=datetime.now(),
            message=warning_message,
            data=data
        )
        
        await self.broadcast_to_task_subscribers(task_id, feedback)
    
    async def send_error(self, task_id: str, error_message: str,
                        data: Optional[Dict[str, Any]] = None):
        """发送错误信息"""
        feedback = FeedbackMessage(
            id=str(uuid.uuid4()),
            type=FeedbackType.ERROR,
            task_id=task_id,
            task_name=self.active_tasks.get(task_id, TaskInfo("", "", "", TaskStatus.PENDING, 0.0, datetime.now())).name,
            timestamp=datetime.now(),
            message=error_message,
            data=data
        )
        
        await self.broadcast_to_task_subscribers(task_id, feedback)
    
    async def send_iot_data_update(self, sensor_data: Dict[str, Any],
                                  task_id: str = "iot_monitoring"):
        """发送IoT数据更新"""
        feedback = FeedbackMessage(
            id=str(uuid.uuid4()),
            type=FeedbackType.IOT_DATA,
            task_id=task_id,
            task_name="IoT监测",
            timestamp=datetime.now(),
            message="IoT传感器数据更新",
            data=sensor_data
        )
        
        await self.broadcast_to_all_clients(feedback)
    
    async def send_ai_optimization_result(self, optimization_result: Dict[str, Any],
                                        task_id: str = "ai_optimization"):
        """发送AI优化结果"""
        feedback = FeedbackMessage(
            id=str(uuid.uuid4()),
            type=FeedbackType.AI_OPTIMIZATION,
            task_id=task_id,
            task_name="物理AI优化",
            timestamp=datetime.now(),
            message="AI优化完成",
            data=optimization_result
        )
        
        await self.broadcast_to_task_subscribers(task_id, feedback)
    
    async def send_message(self, client_id: str, message: FeedbackMessage):
        """发送消息给指定客户端"""
        if client_id not in self.active_connections:
            return
        
        try:
            websocket = self.active_connections[client_id]
            message_dict = asdict(message)
            message_dict['timestamp'] = message.timestamp.isoformat()
            
            await websocket.send_text(json.dumps(message_dict, ensure_ascii=False))
            
            # 添加到消息队列（保留最近100条）
            if client_id not in self.message_queue:
                self.message_queue[client_id] = []
            
            self.message_queue[client_id].append(message)
            if len(self.message_queue[client_id]) > 100:
                self.message_queue[client_id] = self.message_queue[client_id][-100:]
        
        except Exception as e:
            logger.error(f"发送消息给客户端 {client_id} 失败: {str(e)}")
            await self.disconnect_client(client_id)
    
    async def broadcast_to_task_subscribers(self, task_id: str, message: FeedbackMessage):
        """广播消息给任务订阅者"""
        if task_id not in self.task_subscribers:
            return
        
        subscribers = self.task_subscribers[task_id].copy()
        for client_id in subscribers:
            await self.send_message(client_id, message)
    
    async def broadcast_to_all_clients(self, message: FeedbackMessage):
        """广播消息给所有客户端"""
        client_ids = list(self.active_connections.keys())
        for client_id in client_ids:
            await self.send_message(client_id, message)
    
    async def send_task_status(self, client_id: str, task: TaskInfo):
        """发送任务状态"""
        message = FeedbackMessage(
            id=str(uuid.uuid4()),
            type=FeedbackType.STATUS,
            task_id=task.id,
            task_name=task.name,
            timestamp=datetime.now(),
            message=f"任务状态: {task.status.value}",
            progress=task.progress,
            status=task.status,
            data={
                "task_type": task.type,
                "start_time": task.start_time.isoformat(),
                "end_time": task.end_time.isoformat() if task.end_time else None,
                "metadata": task.metadata
            }
        )
        
        await self.send_message(client_id, message)
    
    async def cleanup_task(self, task_id: str):
        """清理任务"""
        if task_id in self.active_tasks:
            del self.active_tasks[task_id]
        
        if task_id in self.task_subscribers:
            del self.task_subscribers[task_id]
        
        logger.info(f"任务 {task_id} 已清理")
    
    async def get_task_history(self, client_id: str) -> List[Dict[str, Any]]:
        """获取客户端任务历史"""
        if client_id not in self.message_queue:
            return []
        
        return [asdict(msg) for msg in self.message_queue[client_id]]
    
    async def get_active_tasks(self) -> List[Dict[str, Any]]:
        """获取所有活跃任务"""
        return [
            {
                "id": task.id,
                "name": task.name,
                "type": task.type,
                "status": task.status.value,
                "progress": task.progress,
                "start_time": task.start_time.isoformat(),
                "end_time": task.end_time.isoformat() if task.end_time else None,
                "client_id": task.client_id,
                "metadata": task.metadata
            }
            for task in self.active_tasks.values()
        ]

# 全局实时反馈管理器实例
real_time_feedback_manager = RealTimeFeedbackManager()

def get_real_time_feedback_manager() -> RealTimeFeedbackManager:
    """获取实时反馈管理器实例"""
    return real_time_feedback_manager

# Terra分析进度回调
class TerraAnalysisProgressCallback:
    """Terra分析进度回调"""
    
    def __init__(self, task_id: str, feedback_manager: RealTimeFeedbackManager):
        self.task_id = task_id
        self.feedback_manager = feedback_manager
    
    async def on_stage_start(self, stage_name: str, stage_number: int, total_stages: int):
        """阶段开始回调"""
        progress = (stage_number - 1) / total_stages * 100
        await self.feedback_manager.update_task_progress(
            self.task_id,
            progress,
            f"开始 {stage_name} (阶段 {stage_number}/{total_stages})",
            {"stage": stage_number, "total_stages": total_stages, "stage_name": stage_name}
        )
    
    async def on_stage_progress(self, stage_progress: float, stage_number: int, total_stages: int):
        """阶段进度回调"""
        base_progress = (stage_number - 1) / total_stages * 100
        stage_contribution = stage_progress / total_stages
        total_progress = base_progress + stage_contribution
        
        await self.feedback_manager.update_task_progress(
            self.task_id,
            total_progress,
            f"阶段 {stage_number} 进度: {stage_progress:.1f}%",
            {"stage_progress": stage_progress, "stage": stage_number}
        )
    
    async def on_stage_complete(self, stage_name: str, stage_number: int, total_stages: int):
        """阶段完成回调"""
        progress = stage_number / total_stages * 100
        await self.feedback_manager.update_task_progress(
            self.task_id,
            progress,
            f"完成 {stage_name} (阶段 {stage_number}/{total_stages})",
            {"stage": stage_number, "completed": True}
        )
    
    async def on_warning(self, warning_message: str, data: Optional[Dict[str, Any]] = None):
        """警告回调"""
        await self.feedback_manager.send_warning(self.task_id, warning_message, data)
    
    async def on_error(self, error_message: str, data: Optional[Dict[str, Any]] = None):
        """错误回调"""
        await self.feedback_manager.send_error(self.task_id, error_message, data)

# AI优化进度回调
class AIOptimizationProgressCallback:
    """AI优化进度回调"""
    
    def __init__(self, task_id: str, feedback_manager: RealTimeFeedbackManager):
        self.task_id = task_id
        self.feedback_manager = feedback_manager
    
    async def on_iteration(self, iteration: int, max_iterations: int, 
                          objective_value: float, best_value: float):
        """迭代回调"""
        progress = iteration / max_iterations * 100
        await self.feedback_manager.update_task_progress(
            self.task_id,
            progress,
            f"优化迭代 {iteration}/{max_iterations}, 当前值: {objective_value:.6f}",
            {
                "iteration": iteration,
                "max_iterations": max_iterations,
                "objective_value": objective_value,
                "best_value": best_value
            }
        )
    
    async def on_convergence(self, converged: bool, tolerance: float, improvement: float):
        """收敛回调"""
        if converged:
            await self.feedback_manager.update_task_progress(
                self.task_id,
                100.0,
                f"优化收敛，改善值: {improvement:.6f}",
                {"converged": True, "improvement": improvement}
            )
        else:
            await self.feedback_manager.send_warning(
                self.task_id,
                f"优化未收敛，容差: {tolerance:.6f}, 改善值: {improvement:.6f}",
                {"converged": False, "tolerance": tolerance, "improvement": improvement}
            )
    
    async def on_constraint_violation(self, constraint_name: str, violation: float):
        """约束违反回调"""
        await self.feedback_manager.send_warning(
            self.task_id,
            f"约束违反: {constraint_name}, 违反程度: {violation:.6f}",
            {"constraint": constraint_name, "violation": violation}
        )