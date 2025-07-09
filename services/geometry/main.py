"""
几何服务 (Geometry Service)
基于凤凰架构的微服务实现

职责：
- 几何建模
- 布尔运算
- CAD文件处理
- 几何求交运算
"""

import os
import sys
import logging
from typing import Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# 导入共享的几何模块
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

try:
    from core.geometry_engine import GeometryEngineFactory
    from core.geometry_operations import (
        GeometryIntersectionEngine, 
        create_complex_geometry_intersection,
        BooleanOperation
    )
    from infrastructure.consul_client import ConsulClient
    from infrastructure.metrics import setup_metrics
    from infrastructure.tracing import setup_tracing
    from infrastructure.logging_config import setup_logging
except ImportError as e:
    print(f"导入错误: {e}")
    # 在开发环境中，这些模块可能还不存在
    # 我们先创建占位符
    class ConsulClient:
        def __init__(self, host, port): pass
        async def register_service(self, **kwargs): pass
        async def deregister_service(self, service_id): pass
    
    def setup_metrics(app, service_name): pass
    def setup_tracing(app, service_name): pass
    def setup_logging(service_name): pass


# 配置日志
setup_logging("geometry-service")
logger = logging.getLogger(__name__)

# 服务配置
SERVICE_NAME = "geometry-service"
SERVICE_PORT = 8001
SERVICE_VERSION = "1.0.0"

# 全局变量
consul_client = None
geometry_engines = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    global consul_client
    
    # 启动时初始化
    logger.info(f"启动 {SERVICE_NAME} v{SERVICE_VERSION}")
    
    # 初始化Consul客户端
    consul_client = ConsulClient(
        host=os.getenv("CONSUL_HOST", "localhost"),
        port=int(os.getenv("CONSUL_PORT", "8500"))
    )
    
    # 注册服务到Consul
    await consul_client.register_service(
        name=SERVICE_NAME,
        service_id=f"{SERVICE_NAME}-{SERVICE_PORT}",
        address="geometry-service",
        port=SERVICE_PORT,
        health_check_url=(
            f"http://geometry-service:{SERVICE_PORT}/health"
        ),
        tags=["geometry", "cad", "modeling"]
    )
    
    # 初始化几何引擎
    try:
        available_engines = GeometryEngineFactory.get_available_engines()
        logger.info(f"可用的几何引擎: {available_engines}")
        
        for engine_type in available_engines:
            try:
                engine = GeometryEngineFactory.create_kernel(engine_type)
                geometry_engines[engine_type.value] = engine
                logger.info(f"初始化几何引擎: {engine_type.value}")
            except Exception as e:
                logger.error(f"初始化几何引擎失败 {engine_type.value}: {e}")
    except Exception as e:
        logger.error(f"几何引擎初始化失败: {e}")
    
    yield
    
    # 关闭时清理
    logger.info(f"关闭 {SERVICE_NAME}")
    if consul_client:
        await consul_client.deregister_service(
            f"{SERVICE_NAME}-{SERVICE_PORT}"
        )


# 创建FastAPI应用
app = FastAPI(
    title="几何服务",
    description="深基坑分析系统的几何建模和布尔运算服务",
    version=SERVICE_VERSION,
    lifespan=lifespan
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 设置监控和追踪
setup_metrics(app, SERVICE_NAME)
setup_tracing(app, SERVICE_NAME)


# 数据模型
class GeometryRequest(BaseModel):
    """几何操作请求"""
    operation: str
    parameters: Dict[str, Any]
    engine_type: str = "gmsh"


class GeometryResponse(BaseModel):
    """几何操作响应"""
    status: str
    message: str
    result: Dict[str, Any]
    geometry_id: str = None


class ComplexGeometryRequest(BaseModel):
    """复杂几何求交请求"""
    terrain_data: Dict[str, Any]
    excavation_params: Dict[str, Any] = None
    tunnel_params: Dict[str, Any] = None


# API端点

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "version": SERVICE_VERSION,
        "available_engines": list(geometry_engines.keys())
    }


@app.get("/metrics")
async def get_metrics():
    """Prometheus指标端点"""
    # 这里会被metrics中间件自动处理
    pass


@app.get("/engines")
async def list_engines():
    """获取可用的几何引擎"""
    return {
        "available_engines": list(geometry_engines.keys()),
        "default_engine": "gmsh"
    }


@app.post("/create-box", response_model=GeometryResponse)
async def create_box(request: GeometryRequest):
    """创建长方体"""
    try:
        engine_type = request.parameters.get("engine_type", "gmsh")
        if engine_type not in geometry_engines:
            raise HTTPException(
                status_code=400, 
                detail=f"不支持的几何引擎: {engine_type}"
            )
        
        engine = geometry_engines[engine_type]
        
        center = request.parameters["center"]
        dimensions = request.parameters["dimensions"]
        
        geometry_tag = engine.create_box(
            center=tuple(center),
            dimensions=tuple(dimensions)
        )
        
        return GeometryResponse(
            status="success",
            message="长方体创建成功",
            result={"geometry_tag": geometry_tag},
            geometry_id=f"box_{geometry_tag}"
        )
        
    except Exception as e:
        logger.error(f"创建长方体失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/create-soil-volume", response_model=GeometryResponse)
async def create_soil_volume(request: GeometryRequest):
    """创建土体几何"""
    try:
        engine = GeometryIntersectionEngine(use_occ=True)
        engine.initialize_gmsh()
        
        try:
            terrain_data = request.parameters["terrain_data"]
            soil_tag = engine.create_soil_volume(terrain_data)
            
            return GeometryResponse(
                status="success",
                message="土体几何创建成功",
                result={"soil_tag": soil_tag},
                geometry_id=f"soil_{soil_tag}"
            )
            
        finally:
            engine.finalize_gmsh()
            
    except Exception as e:
        logger.error(f"创建土体几何失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/create-excavation", response_model=GeometryResponse)
async def create_excavation(request: GeometryRequest):
    """创建基坑几何"""
    try:
        engine = GeometryIntersectionEngine(use_occ=True)
        engine.initialize_gmsh()
        
        try:
            excavation_params = request.parameters["excavation_params"]
            excavation_tag = engine.create_excavation_geometry(excavation_params)
            
            return GeometryResponse(
                status="success",
                message="基坑几何创建成功",
                result={"excavation_tag": excavation_tag},
                geometry_id=f"excavation_{excavation_tag}"
            )
            
        finally:
            engine.finalize_gmsh()
            
    except Exception as e:
        logger.error(f"创建基坑几何失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/create-tunnel", response_model=GeometryResponse)
async def create_tunnel(request: GeometryRequest):
    """创建隧道几何"""
    try:
        engine = GeometryIntersectionEngine(use_occ=True)
        engine.initialize_gmsh()
        
        try:
            tunnel_params = request.parameters["tunnel_params"]
            tunnel_tag = engine.create_tunnel_geometry(tunnel_params)
            
            return GeometryResponse(
                status="success",
                message="隧道几何创建成功",
                result={"tunnel_tag": tunnel_tag},
                geometry_id=f"tunnel_{tunnel_tag}"
            )
            
        finally:
            engine.finalize_gmsh()
            
    except Exception as e:
        logger.error(f"创建隧道几何失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/boolean-operation", response_model=GeometryResponse)
async def boolean_operation(request: GeometryRequest):
    """执行布尔运算"""
    try:
        engine = GeometryIntersectionEngine(use_occ=True)
        engine.initialize_gmsh()
        
        try:
            obj1_tag = request.parameters["obj1_tag"]
            obj2_tag = request.parameters["obj2_tag"]
            operation = request.parameters["operation"]
            
            # 将字符串转换为枚举
            operation_enum = BooleanOperation(operation)
            
            result_tag = engine.perform_boolean_operation(
                obj1_tag, obj2_tag, operation_enum
            )
            
            return GeometryResponse(
                status="success",
                message=f"布尔运算 {operation} 完成",
                result={"result_tag": result_tag},
                geometry_id=f"boolean_{result_tag}"
            )
            
        finally:
            engine.finalize_gmsh()
            
    except Exception as e:
        logger.error(f"布尔运算失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/complex-intersection", response_model=GeometryResponse)
async def complex_geometry_intersection(
    request: ComplexGeometryRequest,
    background_tasks: BackgroundTasks
):
    """复杂几何求交（异步处理）"""
    try:
        # 对于复杂的几何求交，使用后台任务异步处理
        task_id = f"complex_geo_{id(request)}"
        
        background_tasks.add_task(
            process_complex_geometry,
            task_id,
            request.terrain_data,
            request.excavation_params,
            request.tunnel_params
        )
        
        return GeometryResponse(
            status="accepted",
            message="复杂几何求交任务已提交，正在后台处理",
            result={"task_id": task_id},
            geometry_id=task_id
        )
        
    except Exception as e:
        logger.error(f"提交复杂几何求交任务失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def process_complex_geometry(
    task_id: str,
    terrain_data: Dict[str, Any],
    excavation_params: Dict[str, Any] = None,
    tunnel_params: Dict[str, Any] = None
):
    """处理复杂几何求交的后台任务"""
    try:
        logger.info(f"开始处理复杂几何求交任务: {task_id}")
        
        # 使用便捷函数进行复杂几何求交
        create_complex_geometry_intersection(
            terrain_data=terrain_data,
            excavation_params=excavation_params,
            tunnel_params=tunnel_params
        )
        
        # 这里可以将结果存储到Redis或数据库中
        # 并通过消息队列通知其他服务
        
        logger.info(f"复杂几何求交任务完成: {task_id}")
        
    except Exception as e:
        logger.error(f"复杂几何求交任务失败 {task_id}: {e}")


@app.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """获取任务状态"""
    # 这里应该从Redis或数据库中查询任务状态
    # 暂时返回模拟数据
    return {
        "task_id": task_id,
        "status": "processing",
        "message": "任务正在处理中"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=SERVICE_PORT,
        reload=True,
        log_level="info"
    ) 