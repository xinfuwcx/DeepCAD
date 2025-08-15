"""
DeepCAD深基坑CAE平台 - 主服务入口
统一API网关和服务协调器
"""

import os
import sys
from pathlib import Path

# 添加项目根目录到Python路径
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
import uvicorn
from gateway.database import init_database

# 创建FastAPI应用
app = FastAPI(
    title="DeepCAD深基坑CAE平台",
    description="基于WebGPU + Three.js的世界级深基坑工程分析平台",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务
frontend_dist = ROOT_DIR / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/static", StaticFiles(directory=str(frontend_dist)), name="static")

@app.get("/")
async def root():
    """根路径重定向到前端"""
    if frontend_dist.exists():
        return RedirectResponse(url="/static/index.html")
    return {"message": "DeepCAD深基坑CAE平台后端服务", "status": "运行中", "version": "3.0.0"}

@app.get("/api/health")
async def health_check():
    """健康检查接口"""
    return {
        "status": "healthy",
        "service": "DeepCAD Gateway",
        "version": "3.0.0",
        "modules": {
            "geometry": "available",
            "meshing": "available", 
            "computation": "available",
            "visualization": "available"
        }
    }

@app.get("/api/info")
async def system_info():
    """系统信息接口"""
    try:
        import numpy as np
        import gmsh
        
        return {
            "system": "DeepCAD深基坑CAE平台",
            "version": "3.0.0",
            "python_version": sys.version,
            "dependencies": {
                "numpy": np.__version__,
                "gmsh": "available"
            },
            "root_dir": str(ROOT_DIR),
            "status": "ready"
        }
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"依赖包缺失: {e}")

# 导入各模块路由（显示导入 routes 以避免命名空间包导致的误判）
try:
    from gateway.modules.geometry import router as geometry_router
    app.include_router(geometry_router, prefix="/api/geometry", tags=["几何建模"])
except ImportError as e:
    print(f"WARNING: 几何建模模块未找到: {e}")

try:
    from gateway.modules.meshing.routes import router as meshing_router
    app.include_router(meshing_router, prefix="/api/meshing", tags=["网格生成"])
except ImportError as e:
    print(f"WARNING: 网格生成模块未找到: {e}")

try:
    from gateway.modules.computation.routes import router as computation_router
    app.include_router(computation_router, prefix="/api/computation", tags=["数值计算"])
except ImportError as e:
    print(f"WARNING: 数值计算模块未找到: {e}")

try:
    from gateway.modules.geology import router as geology_router
    app.include_router(geology_router, prefix="/api/geology", tags=["地质重建"])
    print("SUCCESS: 地质重建模块加载成功")
except ImportError as e:
    print(f"WARNING: 地质重建模块未找到: {e}")

try:
    from gateway.modules.visualization import router as visualization_router
    app.include_router(visualization_router, prefix="/api/visualization", tags=["可视化"])
except ImportError as e:
    print(f"WARNING: 可视化模块未找到: {e}")

try:
    from gateway.modules.materials.routes import router as materials_router
    app.include_router(materials_router, prefix="/api", tags=["材料库"])
    print("SUCCESS: 材料库模块加载成功")
except ImportError as e:
    print(f"WARNING: 材料库模块未找到: {e}")

try:
    from gateway.modules.ai_assistant.routes import router as ai_assistant_router
    app.include_router(ai_assistant_router, prefix="/api", tags=["AI助手"])
except ImportError:
    print("⚠️ AI助手模块未找到")

if __name__ == "__main__":
    print("Starting DeepCAD深基坑CAE平台")
    print(f"项目根目录: {ROOT_DIR}")
    print(f"前端文件: {frontend_dist}")
    print("=" * 50)
    
    # 初始化数据库
    init_database()
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )