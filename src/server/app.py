"""
@file app.py
@description FastAPI应用程序入口文件
@author Deep Excavation Team
@version 1.0.0
@copyright 2025
"""

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager

# 从各模块导入路由
from src.api.routes import modeling_router, compute_router, visualization_router, excavation_router, iga_geometry_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行
    print("深基坑CAE系统后端启动...")
    yield
    # 关闭时执行
    print("深基坑CAE系统后端关闭...")

# 创建FastAPI应用实例
app = FastAPI(
    title="深基坑CAE系统 API",
    description="深基坑工程建模、计算和分析的专业API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1000"],  # 允许前端开发服务器的源
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有方法
    allow_headers=["*"],  # 允许所有头
)

# 创建API路由
api_router = APIRouter(prefix="/api")

# 将各模块路由添加到主路由
api_router.include_router(modeling_router.router, prefix="/modeling", tags=["建模"])
api_router.include_router(compute_router.router, prefix="/compute", tags=["计算分析"])
api_router.include_router(visualization_router.router, prefix="/visualization", tags=["可视化"])
api_router.include_router(excavation_router.router, prefix="/excavation", tags=["深基坑系统"])
api_router.include_router(iga_geometry_router.router, prefix="/iga", tags=["IGA几何"])

# 将API路由添加到应用
app.include_router(api_router)

# 根路由
@app.get("/", tags=["根"])
async def root():
    """
    根路径，返回API信息
    """
    return {
        "name": "深基坑CAE系统 API",
        "version": "1.0.0",
        "description": "深基坑工程建模、计算和分析的专业API",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

# 如果直接运行此文件，则启动API服务器
if __name__ == "__main__":
    uvicorn.run("src.server.app:app", host="0.0.0.0", port=6000, reload=True) 