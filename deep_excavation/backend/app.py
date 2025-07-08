"""
Main FastAPI application file for the Deep Excavation CAE System.
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from deep_excavation.backend.api.routes import geology_router, auth_router, project_router
from deep_excavation.backend.core.error_handler import UnifiedErrorHandler, ErrorType
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 初始化错误处理器
error_handler = UnifiedErrorHandler()

# 注册错误恢复策略
error_handler.register_recovery_strategy("mesh_generation_failed", lambda: {"message": "网格生成失败，尝试使用备用算法"})
error_handler.register_recovery_strategy("memory_exceeded", lambda: {"message": "内存超限，尝试降低分辨率"})
error_handler.register_recovery_strategy("network_error", lambda: {"message": "网络错误，尝试重新连接"})

app = FastAPI(
    title="DeepCAD Pro API",
    description="专业深基坑CAE分析系统API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源，生产环境中应该限制
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(auth_router.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(project_router.router, prefix="/api/projects", tags=["Projects"])
app.include_router(geology_router.router, prefix="/api/geology", tags=["Geology"])

# 全局异常处理
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """处理HTTP异常"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """处理所有其他异常"""
    error_type = ErrorType.UNKNOWN
    if "database" in str(exc).lower():
        error_type = ErrorType.DATABASE
    elif "permission" in str(exc).lower():
        error_type = ErrorType.PERMISSION
        
    return error_handler.handle_exception(exc, error_type)

@app.get("/api/health")
async def health_check():
    """健康检查端点"""
    return {"status": "ok", "version": "1.0.0"}

# Routers will be added back one by one.

# -- Main Entry Point for Uvicorn --
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 