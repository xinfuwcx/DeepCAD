"""
DeepCAD Gateway - 主要API网关服务
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

# 创建FastAPI应用
app = FastAPI(
    title="DeepCAD Gateway API",
    description="DeepCAD地质建模和岩土工程分析平台API网关",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 导入路由模块
try:
    from .modules.geology.routes import router as geology_router
    app.include_router(geology_router, prefix="/api/geology", tags=["地质建模"])
except ImportError:
    print("Warning: Geology module not found")

try:
    from .modules.geometry.routes import router as geometry_router
    app.include_router(geometry_router, prefix="/api/geometry", tags=["几何建模"])
except ImportError:
    print("Warning: Geometry module not found")

try:
    from .modules.excavation.routes import router as excavation_router
    app.include_router(excavation_router, prefix="/api/excavation", tags=["开挖设计"])
except ImportError:
    print("Warning: Excavation module not found")

try:
    from .modules.meshing.routes import router as meshing_router
    app.include_router(meshing_router, prefix="/api/meshing", tags=["网格生成"])
except ImportError:
    print("Warning: Meshing module not found")

try:
    from .modules.computation.routes import router as computation_router
    app.include_router(computation_router, prefix="/api/computation", tags=["计算分析"])
except ImportError:
    print("Warning: Computation module not found")

try:
    from .modules.visualization.routes import router as visualization_router
    app.include_router(visualization_router, prefix="/api/visualization", tags=["可视化"])
except ImportError:
    print("Warning: Visualization module not found")

# 健康检查端点
@app.get("/")
async def root():
    return {"message": "DeepCAD Gateway API is running", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "DeepCAD Gateway"}

# 静态文件服务（如果需要）
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8087)