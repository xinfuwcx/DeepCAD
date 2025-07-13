#!/usr/bin/env python3
"""
简化的后端启动脚本，用于测试
"""

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# 创建简化的FastAPI应用
app = FastAPI(
    title="DeepCAD Test Server",
    description="测试服务器，基本功能验证",
    version="1.0.0"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 健康检查端点
@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "DeepCAD backend is running"}

# API健康检查
@app.get("/api/health")
async def api_health():
    return {
        "status": "healthy", 
        "api_version": "1.0.0",
        "features": ["basic", "websocket", "visualization"]
    }

# 可视化健康检查
@app.get("/api/visualization/health")
async def visualization_health():
    return {
        "status": "healthy",
        "bridge_available": True,
        "message": "Visualization bridge is ready"
    }

# 静态文件服务
if os.path.exists("static_content"):
    app.mount("/static", StaticFiles(directory="static_content"), name="static")

if __name__ == "__main__":
    print("Starting DeepCAD Test Backend Server...")
    print("Backend URL: http://localhost:8083")
    print("Health Check: http://localhost:8083/health")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8083,
        reload=False,
        log_level="info"
    )