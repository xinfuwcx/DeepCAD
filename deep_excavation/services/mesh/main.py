"""
网格服务主程序
提供网格生成、网格质量评估和网格转换功能
"""
import os
import sys
import logging
import tempfile
from typing import Dict, Any, List, Optional
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
import numpy as np

# 添加当前目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 导入基础设施组件
from infrastructure.consul_client import ConsulClient
from infrastructure.metrics import MetricsMiddleware, track_mesh_generation
from infrastructure.tracing import setup_tracing, TracingMiddleware

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("mesh_service")

# 创建FastAPI应用
app = FastAPI(
    title="网格服务",
    description="提供网格生成、网格质量评估和网格转换功能",
    version="1.0.0"
)

# 添加中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加指标中间件
app.middleware("http")(MetricsMiddleware())

# 添加追踪中间件
app.middleware("http")(TracingMiddleware())

# 设置分布式追踪
setup_tracing()

# 创建临时工作目录
WORKING_DIR = tempfile.mkdtemp(prefix="mesh_service_")
logger.info(f"工作目录: {WORKING_DIR}")


# --- 模型定义 ---

class MeshGenerationRequest(BaseModel):
    """网格生成请求模型"""
    mesh_type: str = Field(..., description="网格类型 (terrain, excavation, structure)")
    mesh_size: float = Field(10.0, description="全局网格尺寸")
    use_occ: bool = Field(True, description="是否使用OpenCASCADE几何内核")
    geometry_data: Dict[str, Any] = Field(..., description="几何数据")
    advanced_settings: Optional[Dict[str, Any]] = Field(None, description="高级设置")


class MeshQualityRequest(BaseModel):
    """网格质量评估请求模型"""
    mesh_file: str = Field(..., description="网格文件路径")
    metrics: List[str] = Field(["aspect_ratio", "skewness"], description="质量指标")


class MeshConversionRequest(BaseModel):
    """网格转换请求模型"""
    mesh_file: str = Field(..., description="网格文件路径")
    target_format: str = Field(..., description="目标格式 (vtk, mdpa, msh, xdmf)")


# --- 依赖项 ---

def get_consul_client():
    """获取Consul客户端"""
    return ConsulClient()


# --- 路由定义 ---

@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy"}


@app.get("/metrics")
async def metrics():
    """指标端点"""
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    from fastapi.responses import Response
    
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


@app.post("/api/v1/mesh/generate")
@track_mesh_generation(mesh_type="generic", algorithm="gmsh")
async def generate_mesh(
    request: MeshGenerationRequest,
    background_tasks: BackgroundTasks,
    consul_client: ConsulClient = Depends(get_consul_client)
):
    """
    生成网格
    
    根据提供的几何数据和参数生成网格
    """
    try:
        # 导入网格生成器
        from mesh_generator import TerrainMeshGenerator, create_terrain_mesh
        
        # 根据网格类型选择不同的生成器
        if request.mesh_type == "terrain":
            mesh_file = create_terrain_mesh(
                request.geometry_data,
                mesh_size=request.mesh_size,
                use_occ=request.use_occ
            )
            
            return {
                "status": "success",
                "mesh_file": mesh_file,
                "mesh_info": {
                    "element_count": 1000,  # 示例值，实际应从生成的网格中获取
                    "quality_metrics": {
                        "aspect_ratio": 0.85,  # 示例值
                        "skewness": 0.15  # 示例值
                    }
                }
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=f"不支持的网格类型: {request.mesh_type}"
            )
    except Exception as e:
        logger.error(f"网格生成失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"网格生成失败: {str(e)}"
        )


@app.post("/api/v1/mesh/quality")
async def assess_mesh_quality(
    request: MeshQualityRequest,
    consul_client: ConsulClient = Depends(get_consul_client)
):
    """
    评估网格质量
    
    计算指定网格的质量指标
    """
    try:
        # 这里应该实现网格质量评估逻辑
        # 示例返回值
        return {
            "status": "success",
            "metrics": {
                "aspect_ratio": {
                    "min": 0.65,
                    "max": 0.98,
                    "avg": 0.85
                },
                "skewness": {
                    "min": 0.02,
                    "max": 0.35,
                    "avg": 0.15
                }
            }
        }
    except Exception as e:
        logger.error(f"网格质量评估失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"网格质量评估失败: {str(e)}"
        )


@app.post("/api/v1/mesh/convert")
async def convert_mesh(
    request: MeshConversionRequest,
    consul_client: ConsulClient = Depends(get_consul_client)
):
    """
    转换网格格式
    
    将网格从一种格式转换为另一种格式
    """
    try:
        # 这里应该实现网格格式转换逻辑
        # 示例返回值
        return {
            "status": "success",
            "converted_file": f"{request.mesh_file}.{request.target_format}"
        }
    except Exception as e:
        logger.error(f"网格格式转换失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"网格格式转换失败: {str(e)}"
        )


@app.post("/api/v1/mesh/upload")
async def upload_mesh(
    file: UploadFile = File(...),
    consul_client: ConsulClient = Depends(get_consul_client)
):
    """
    上传网格文件
    
    上传现有的网格文件进行处理
    """
    try:
        # 保存上传的文件
        file_path = os.path.join(WORKING_DIR, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())
        
        return {
            "status": "success",
            "file_path": file_path,
            "filename": file.filename
        }
    except Exception as e:
        logger.error(f"文件上传失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"文件上传失败: {str(e)}"
        )


@app.get("/api/v1/mesh/download/{filename}")
async def download_mesh(filename: str):
    """
    下载网格文件
    
    下载生成或转换后的网格文件
    """
    file_path = os.path.join(WORKING_DIR, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404,
            detail=f"文件不存在: {filename}"
        )
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )


# --- 服务启动 ---

@app.on_event("startup")
async def startup_event():
    """服务启动事件"""
    # 注册服务到Consul
    consul_client = ConsulClient()
    consul_client.register_service()
    logger.info("服务已注册到Consul")


@app.on_event("shutdown")
async def shutdown_event():
    """服务关闭事件"""
    # 从Consul注销服务
    consul_client = ConsulClient()
    consul_client.deregister_service()
    logger.info("服务已从Consul注销")


# --- 主程序入口 ---

if __name__ == "__main__":
    # 获取端口号
    port = int(os.environ.get("SERVICE_PORT", "8002"))
    
    # 启动服务
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    ) 