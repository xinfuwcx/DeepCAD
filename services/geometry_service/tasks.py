import os
import gmsh
from celery import Celery

# TODO: Celery app的配置应该更优雅地管理，而不是硬编码
# 这部分可以后续与 gateway 的 celery_config.py 对齐
REDIS_HOST = os.environ.get("REDIS_HOST", "localhost")
REDIS_PORT = os.environ.get("REDIS_PORT", "6379")
BROKER_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"
RESULT_BACKEND = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

# 定义一个Celery app实例，用于注册任务
# 队列名称应与 gateway 中指定的名称匹配
celery_app = Celery("geometry_tasks", broker=BROKER_URL, backend=RESULT_BACKEND)
celery_app.conf.task_default_queue = 'geometry_queue'


@celery_app.task(name="worker.tasks.geometry_create_excavation")
def geometry_create_excavation(task_params: dict):
    """
    使用 Gmsh 创建一个代表基坑的长方体几何模型。

    Args:
        task_params (dict): 从 gateway 传递过来的任务参数，
                            应包含 length, width, depth。

    Returns:
        dict: 包含执行状态和模型ID的结果。
    """
    print(f"开始执行几何创建任务，参数: {task_params}")

    length = task_params.get("length", 10.0)  # 默认值以防万一
    width = task_params.get("width", 10.0)
    depth = task_params.get("depth", 5.0)
    task_id = task_params.get("task_id", "unknown_task")

    model_id = f"excavation_{task_id}"
    output_dir = "/app/data"  # 假设在容器中这个路径存在且可写
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)  # 在本地测试时创建目录
    
    output_filename = os.path.join(output_dir, f"{model_id}.msh")

    try:
        gmsh.initialize()
        gmsh.model.add(model_id)

        # 创建一个长方体 (box)
        # 参数: x, y, z, dx, dy, dz
        gmsh.model.occ.addBox(0, 0, 0, length, width, -depth)
        
        gmsh.model.occ.synchronize()

        # 生成3D网格 (可选，但通常几何处理后会立即网格化)
        gmsh.model.mesh.generate(3)

        # 保存为 .msh 文件
        gmsh.write(output_filename)

        print(f"几何模型创建成功，已保存至: {output_filename}")
        
        result = {
            "status": "SUCCESS",
            "model_id": model_id,
            "file_path": output_filename,
            "message": "Excavation model created and meshed successfully."
        }

    except Exception as e:
        print(f"几何创建任务失败: {e}")
        result = {
            "status": "FAILURE",
            "model_id": model_id,
            "error": str(e)
        }
    finally:
        gmsh.finalize()

    # TODO: 在此可以添加回调逻辑，将结果通知给 gateway
    # requests.post("http://api-gateway:8000/internal/task-update", json=result)
    
    return result
