import os
import time
import requests
from celery import Celery
import numpy as np

# 1. 环境和配置
REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = os.environ.get("REDIS_PORT", "6379")
GATEWAY_HOST = os.environ.get("GATEWAY_HOST", "localhost")
GATEWAY_PORT = os.environ.get("GATEWAY_PORT", "8000")

BROKER_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
RESULT_BACKEND = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
GATEWAY_UPDATE_URL = f"http://{GATEWAY_HOST}:{GATEWAY_PORT}/internal/task-update"

# 2. Celery 应用初始化
app = Celery("geometry_worker", broker=BROKER_URL, backend=RESULT_BACKEND)
app.conf.task_default_queue = 'geometry_queue'

# 3. 任务状态回调函数
def _send_update_to_gateway(params, status, progress, data=None):
    """向API网关发送状态更新的辅助函数。"""
    update_payload = {
        "client_id": params.get("client_id"),
        "task_id": params.get("task_id"),
        "status": status,
        "progress": progress,
        "data": data or {}
    }
    try:
        requests.post(GATEWAY_UPDATE_URL, json=update_payload, timeout=3)
    except requests.RequestException as e:
        print(f"Error sending update to gateway: {e}")

# 4. Celery 任务定义
@app.task(name="worker.tasks.geometry_create_box")
def geometry_create_box(params: dict):
    """
    一个示例任务，用于创建一个立方体的几何体和网格。
    它会模拟一个耗时操作，并逐步将进度报告回网关。
    """
    _send_update_to_gateway(params, "processing", 10, {"message": "任务已开始..."})
    
    time.sleep(1)
    _send_update_to_gateway(params, "processing", 50, {"message": "正在生成几何体..."})

    w, h, d = params.get("dimensions", [1, 1, 1])
    vertices = np.array([[0,0,0], [w,0,0], [w,h,0], [0,h,0], [0,0,d], [w,0,d], [w,h,d], [0,h,d]])
    faces = np.array([[0,2,1], [0,3,2], [1,2,6], [1,6,5], [0,1,5], [0,5,4], [3,7,6], [3,6,2], [0,4,7], [0,7,3], [4,5,6], [4,6,7]])
    
    result_data = {
        "message": "立方体创建成功",
        "mesh": { "vertices": vertices.flatten().tolist(), "indices": faces.flatten().tolist(), "normals": [] }
    }

    time.sleep(1)
    _send_update_to_gateway(params, "completed", 100, result_data)

    return {"status": "completed", "result": result_data} 