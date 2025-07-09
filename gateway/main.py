from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from celery import Celery
import os
import uuid
from typing import Dict
from pydantic import BaseModel


# 1. FastAPI 应用初始化
app = FastAPI(
    title="DeepCAD API Gateway",
    description="处理前端请求，并通过Celery将计算任务分发给后端服务。",
    version="1.0.1"
)


# 2. CORS 中间件配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境中应替换为您的前端域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 3. Celery 配置
REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = os.environ.get("REDIS_PORT", "6379")
BROKER_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
RESULT_BACKEND = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

celery_app = Celery("gateway", broker=BROKER_URL, backend=RESULT_BACKEND)


# 4. WebSocket 连接管理器
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, client_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[client_id] = websocket

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]

    async def send_message(self, client_id: str, message: dict):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(message)


manager = ConnectionManager()


# 5. API 模型定义
class TaskRequest(BaseModel):
    task_type: str
    client_id: str
    parameters: dict


class AgentRequest(BaseModel):
    client_id: str
    text: str


# 6. WebSocket 端点
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(client_id, websocket)
    try:
        while True:
            # 在此仅维持连接，等待来自REST API的任务更新
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(client_id)


# 7. 任务创建 REST API 端点
@app.post("/tasks/", status_code=202)
async def create_task(task_request: TaskRequest):
    task_id = str(uuid.uuid4())
    task_type = task_request.task_type
    
    # 附加 task_id 和 client_id 到要传递给 worker 的参数中
    task_params = task_request.parameters
    task_params['client_id'] = task_request.client_id
    task_params['task_id'] = task_id

    # 根据任务类型，将其发送到指定的Celery队列
    # 队列名称应与目标worker的名称匹配
    if task_type.startswith("geometry_"):
        queue_name = "geometry_queue"
        task_name = f"worker.tasks.{task_type}"
    elif task_type.startswith("meshing_"):
        queue_name = "meshing_queue"
        task_name = f"worker.tasks.{task_type}"
    else:
        raise HTTPException(status_code=400, detail=f"未知的任务类型: {task_type}")

    celery_app.send_task(
        name=task_name,
        args=[task_params],
        task_id=task_id,
        queue=queue_name
    )
    return {"task_id": task_id, "status": "accepted"}


# 8. 任务状态更新回调端点 (由Celery worker调用)
@app.post("/internal/task-update")
async def task_update_callback(update_data: dict):
    client_id = update_data.get("client_id")
    if client_id:
        await manager.send_message(client_id, update_data)
    return {"status": "update_received"}


# 9. 健康检查端点
@app.get("/health")
async def health_check():
    return {"status": "ok"}


# 10. 应用根路径
@app.get("/")
async def root():
    return {"message": "Welcome to DeepCAD API Gateway"}


# 11. Agent "桩" 端点 (新增)
@app.post("/api/v1/agent/understand_text")
async def agent_understand_text(agent_request: AgentRequest):
    """
    这是一个 "桩" 实现 (stub implementation) 的 Agent 端点。
    在本地开发初期，它不调用任何AI模型。
    无论用户输入什么，它都会返回一个固定的、用于测试的几何参数JSON。
    这使得前端和几何服务可以先行开发，而无需等待AI逻辑完成。
    """
    # 忽略 agent_request.text 的内容
    # 始终返回一个固定的、预设的响应
    stub_response = {
        "intent": "create_excavation",
        "parameters": {
            "shape": "rectangle",
            "length": 20.0,
            "width": 10.0,
            "depth": 5.0
        },
        "response_text": "好的，我将为您创建一个长20米，宽10米，深5米的基坑模型。"
    }
    return stub_response
