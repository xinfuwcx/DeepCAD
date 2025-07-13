from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import uvicorn
import logging

# Import database functions (required)
from gateway.database import init_database, check_db_health

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import all module routes
from .modules.scene import routes as scene_routes
from .modules.components import routes as components_routes
from .modules.meshing import routes as meshing_routes
from .modules.computation import routes as computation_routes
from .modules.websockets import routes as websockets_routes
from .modules.ai_assistant import routes as ai_assistant_routes
from .modules.visualization import routes as visualization_routes
from .modules.geology import routes as geology_routes
from .modules.excavation import routes as excavation_routes
from .modules.materials import routes as materials_routes
from .modules.dxf_import import routes as dxf_import_routes

# 1. FastAPI 应用初始化
app = FastAPI(
    title="DeepCAD CAE Platform API",
    description="This is the central API gateway for the DeepCAD platform.",
    version="1.0.0",
)

# 2. 数据库初始化
@app.on_event("startup")
async def startup_event():
    """Initialize database on startup - Required for DeepCAD"""
    try:
        init_database()
        if check_db_health():
            logger.info("✅ Database initialized successfully")
        else:
            logger.error("❌ Database health check failed")
            raise RuntimeError("Database initialization failed")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise  # Fail fast if database not available

# 3. 配置 CORS
# 在开发环境中，允许所有源以便于调试。
# 在生产环境中，应将其限制为前端应用的实际域。
origins = ["*"] 

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. 包含模块路由
# app.include_router(geometry.router) # This is now removed
app.include_router(scene_routes.router, prefix="/api", tags=["Scene Management"])
app.include_router(components_routes.router, prefix="/api", tags=["Components"])
app.include_router(meshing_routes.router, prefix="/api", tags=["Meshing"])
app.include_router(computation_routes.router, prefix="/api", tags=["Computation"])
app.include_router(ai_assistant_routes.router, prefix="/api", tags=["AI Assistant"])
app.include_router(visualization_routes.router, prefix="/api", tags=["Visualization"])
app.include_router(geology_routes.router, prefix="/api", tags=["Geology"])
app.include_router(excavation_routes.router, prefix="/api", tags=["Excavation"])
app.include_router(materials_routes.router, prefix="/api", tags=["Materials"])
app.include_router(dxf_import_routes.router, prefix="/api", tags=["DXF Import"])
app.include_router(websockets_routes.router)  # No prefix for websockets


# 5. 挂载静态文件目录
static_dir = os.path.join(os.path.dirname(__file__), "..", "static_content")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)
app.mount("/static", StaticFiles(directory=static_dir), name="static")


# 6. 全局异常处理器 (可选, 但建议)
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"message": "An unexpected server error occurred.", "detail": str(exc)},
    )


# 7. API 端点
@app.get("/api/health")
async def health_check():
    """健康检查端点，包含数据库状态检查"""
    db_status = "ok" if check_db_health() else "error"
    
    return {
        "status": "ok", 
        "message": "Welcome to the DeepCAD Unified Backend!",
        "database": db_status,
        "storage": "sqlite",
        "mode": "production"
    }


@app.get("/")
def read_root():
    """根路径，提供一个欢迎信息。"""
    return {"message": "DeepCAD Backend is running."}


# Development server entry point
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
