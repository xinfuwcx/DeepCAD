"""
分析服务主程序
提供结构分析、渗流分析和耦合分析功能
"""
import os
import sys
import logging
import tempfile
import json
from typing import Dict, Any, List, Optional
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

# 添加当前目录到路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# 导入基础设施组件
from infrastructure.consul_client import ConsulClient
from infrastructure.metrics import MetricsMiddleware, track_analysis
from infrastructure.tracing import setup_tracing, TracingMiddleware

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("analysis_service")

# 创建FastAPI应用
app = FastAPI(
    title="分析服务",
    description="提供结构分析、渗流分析和耦合分析功能",
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
WORKING_DIR = tempfile.mkdtemp(prefix="analysis_service_")
logger.info(f"工作目录: {WORKING_DIR}")


# --- 模型定义 ---

class Material(BaseModel):
    """材料模型"""
    name: str
    id: Optional[int] = None
    type: str = "soil"  # soil, concrete, steel
    young_modulus: float
    poisson_ratio: float
    density: float
    hydraulic_conductivity_x: Optional[float] = None
    hydraulic_conductivity_y: Optional[float] = None
    hydraulic_conductivity_z: Optional[float] = None
    porosity: Optional[float] = None
    specific_storage: Optional[float] = None
    model: Optional[str] = "linear_elastic"  # linear_elastic, mohr_coulomb
    cohesion: Optional[float] = None
    friction_angle: Optional[float] = None


class BoundaryCondition(BaseModel):
    """边界条件模型"""
    boundary_name: str
    type: str  # displacement, pressure, fixed_head, flux
    value: Optional[List[float]] = None
    total_head: Optional[float] = None
    flux_value: Optional[float] = None
    constrained: Optional[List[bool]] = None


class Load(BaseModel):
    """荷载模型"""
    type: str  # gravity, pressure, point_load
    target: str
    value: List[float]


class StructuralAnalysisRequest(BaseModel):
    """结构分析请求模型"""
    mesh_file: str = Field(..., description="网格文件路径")
    analysis_type: str = Field("static", description="分析类型 (static, dynamic, modal)")
    materials: List[Material] = Field(..., description="材料列表")
    boundary_conditions: List[BoundaryCondition] = Field(..., description="边界条件列表")
    loads: List[Load] = Field(..., description="荷载列表")
    solver_settings: Optional[Dict[str, Any]] = Field(None, description="求解器设置")


class SeepageAnalysisRequest(BaseModel):
    """渗流分析请求模型"""
    mesh_file: str = Field(..., description="网格文件路径")
    analysis_type: str = Field("steady_state", description="分析类型 (steady_state, transient)")
    materials: List[Material] = Field(..., description="材料列表")
    boundary_conditions: List[BoundaryCondition] = Field(..., description="边界条件列表")
    solver_settings: Optional[Dict[str, Any]] = Field(None, description="求解器设置")


class CoupledAnalysisRequest(BaseModel):
    """耦合分析请求模型"""
    mesh_file: str = Field(..., description="网格文件路径")
    materials: List[Material] = Field(..., description="材料列表")
    boundary_conditions: List[BoundaryCondition] = Field(..., description="边界条件列表")
    coupling_settings: Optional[Dict[str, Any]] = Field(None, description="耦合设置")


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


@app.post("/api/v1/analysis/structural")
@track_analysis(analysis_type="structural", algorithm="kratos")
async def run_structural_analysis(
    request: StructuralAnalysisRequest,
    background_tasks: BackgroundTasks,
    consul_client: ConsulClient = Depends(get_consul_client)
):
    """
    运行结构分析
    
    使用Kratos求解器进行结构力学分析
    """
    try:
        # 导入Kratos求解器
        from kratos_solver import KratosSolver
        
        # 创建求解器实例
        solver = KratosSolver(working_dir=WORKING_DIR)
        
        # 运行分析
        result_file = solver.run_structural_analysis(
            mesh_filename=request.mesh_file,
            materials=request.materials,
            analysis_type=request.analysis_type,
            solver_settings=request.solver_settings,
            boundary_conditions=request.boundary_conditions,
            loads=request.loads
        )
        
        # 解析结果
        result_data = parse_vtk_result(result_file)
        
        return {
            "status": "success",
            "result_file": result_file,
            "summary": {
                "max_displacement": result_data.get("max_displacement", 0.0),
                "max_stress": result_data.get("max_stress", 0.0),
                "analysis_type": request.analysis_type,
                "mesh_file": request.mesh_file
            }
        }
    except Exception as e:
        logger.error(f"结构分析失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"结构分析失败: {str(e)}"
        )


@app.post("/api/v1/analysis/seepage")
@track_analysis(analysis_type="seepage", algorithm="kratos")
async def run_seepage_analysis(
    request: SeepageAnalysisRequest,
    background_tasks: BackgroundTasks,
    consul_client: ConsulClient = Depends(get_consul_client)
):
    """
    运行渗流分析
    
    使用Kratos求解器进行渗流分析
    """
    try:
        # 导入Kratos求解器
        from kratos_solver import KratosSolver
        
        # 创建求解器实例
        solver = KratosSolver(working_dir=WORKING_DIR)
        
        # 运行分析
        result_file = solver.run_seepage_analysis(
            mesh_filename=request.mesh_file,
            materials=request.materials,
            boundary_conditions=request.boundary_conditions,
            analysis_type=request.analysis_type,
            solver_settings=request.solver_settings
        )
        
        # 解析结果
        result_data = parse_vtk_result(result_file)
        
        return {
            "status": "success",
            "result_file": result_file,
            "summary": {
                "max_head": result_data.get("max_head", 0.0),
                "max_velocity": result_data.get("max_velocity", 0.0),
                "analysis_type": request.analysis_type,
                "mesh_file": request.mesh_file
            }
        }
    except Exception as e:
        logger.error(f"渗流分析失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"渗流分析失败: {str(e)}"
        )


@app.post("/api/v1/analysis/coupled")
@track_analysis(analysis_type="coupled", algorithm="kratos")
async def run_coupled_analysis(
    request: CoupledAnalysisRequest,
    background_tasks: BackgroundTasks,
    consul_client: ConsulClient = Depends(get_consul_client)
):
    """
    运行耦合分析
    
    使用Kratos求解器进行流固耦合分析
    """
    try:
        # 导入Kratos求解器
        from kratos_solver import KratosSolver
        
        # 创建求解器实例
        solver = KratosSolver(working_dir=WORKING_DIR)
        
        # 运行分析
        result_file = solver.run_coupled_analysis(
            mesh_filename=request.mesh_file,
            materials=request.materials,
            boundary_conditions=request.boundary_conditions,
            coupling_settings=request.coupling_settings
        )
        
        # 解析结果
        result_data = parse_vtk_result(result_file)
        
        return {
            "status": "success",
            "result_file": result_file,
            "summary": {
                "max_displacement": result_data.get("max_displacement", 0.0),
                "max_head": result_data.get("max_head", 0.0),
                "mesh_file": request.mesh_file
            }
        }
    except Exception as e:
        logger.error(f"耦合分析失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"耦合分析失败: {str(e)}"
        )


@app.post("/api/v1/analysis/upload")
async def upload_mesh(
    file: UploadFile = File(...),
    consul_client: ConsulClient = Depends(get_consul_client)
):
    """
    上传网格文件
    
    上传现有的网格文件进行分析
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


@app.get("/api/v1/analysis/download/{filename}")
async def download_result(filename: str):
    """
    下载结果文件
    
    下载分析生成的结果文件
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


# --- 辅助函数 ---

def parse_vtk_result(result_file: str) -> Dict[str, Any]:
    """
    解析VTK结果文件
    
    Args:
        result_file: VTK结果文件路径
        
    Returns:
        解析后的结果数据
    """
    # 这里应该实现VTK结果文件解析逻辑
    # 示例返回值
    return {
        "max_displacement": 0.05,
        "max_stress": 1200.0,
        "max_head": 15.0,
        "max_velocity": 0.002
    }


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
    port = int(os.environ.get("SERVICE_PORT", "8003"))
    
    # 启动服务
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    ) 