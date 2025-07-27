#!/usr/bin/env python3
"""
简化的几何建模测试服务器
专门用于测试gmsh OCC API功能
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import sys
import os

# 添加gateway模块路径
sys.path.append(os.path.join(os.path.dirname(__file__), 'gateway'))

# 导入我们的几何模块
try:
    from gateway.modules.geometry.routes import router as geometry_router
    print("✅ 几何模块导入成功")
except ImportError as e:
    print(f"❌ 几何模块导入失败: {e}")
    sys.exit(1)

# 创建FastAPI应用
app = FastAPI(
    title="DeepCAD 几何建模测试API",
    description="专门用于测试gmsh OCC几何建模功能",
    version="1.0.0",
)

# 设置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册几何路由
app.include_router(geometry_router, prefix="/api", tags=["Geometry OCC"])

@app.get("/")
def read_root():
    """根路径"""
    return {
        "message": "DeepCAD 几何建模测试服务器运行中",
        "api_docs": "/docs",
        "geometry_api": "/api/geometry"
    }

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {
        "status": "ok",
        "message": "几何建模服务正常",
        "gmsh_available": True
    }

if __name__ == "__main__":
    print("🚀 启动几何建模测试服务器...")
    print("📊 API文档: http://localhost:8080/docs")
    print("🔧 几何API: http://localhost:8080/api/geometry")
    
    uvicorn.run(
        "test_geometry_server:app",
        host="0.0.0.0",
        port=8080,
        reload=False,
        log_level="info"
    )