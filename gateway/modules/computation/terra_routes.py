"""
Terra求解器API路由
提供深基坑地质力学分析的Web API接口
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import asyncio
from datetime import datetime

from .terra_solver import (
    get_terra_solver, 
    TerraAnalysisType, 
    TerraMaterial,
    TerraSoilLayer,
    TerraExcavationStage,
    TerraSupportElement,
    TerraGeotechnicalDatabase
)
from ..websockets.connection_manager import ConnectionManager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/terra", tags=["Terra深基坑求解器"])

# Pydantic模型定义
class SoilLayerRequest(BaseModel):
    """土层参数请求模型"""
    name: str = Field(..., description="土层名称")
    depth_from: float = Field(..., ge=0, description="起始深度(m)")
    depth_to: float = Field(..., gt=0, description="结束深度(m)")
    elastic_modulus: float = Field(..., gt=0, description="弹性模量(MPa)")
    poisson_ratio: float = Field(..., ge=0, le=0.5, description="泊松比")
    density: float = Field(..., gt=0, description="密度(kg/m³)")
    cohesion: float = Field(..., ge=0, description="粘聚力(kPa)")
    friction_angle: float = Field(..., ge=0, le=90, description="内摩擦角(度)")
    permeability: float = Field(..., gt=0, description="渗透系数(m/s)")
    material_type: str = Field(..., description="材料类型")

class ExcavationStageRequest(BaseModel):
    """开挖阶段请求模型"""
    stage: int = Field(..., ge=1, description="阶段编号")
    depth: float = Field(..., gt=0, description="开挖深度(m)")
    description: str = Field(..., description="阶段描述")
    duration: float = Field(1.0, gt=0, description="持续时间(天)")

class SupportElementRequest(BaseModel):
    """支护结构请求模型"""
    element_type: str = Field(..., description="支护类型")
    geometry: Dict[str, Any] = Field(..., description="几何参数")
    material_properties: Dict[str, float] = Field(..., description="材料属性")
    installation_stage: int = Field(..., ge=1, description="安装阶段")

class TerraAnalysisRequest(BaseModel):
    """Terra分析请求模型"""
    project_name: str = Field(..., min_length=1, description="项目名称")
    analysis_type: str = Field(..., description="分析类型")
    soil_layers: List[SoilLayerRequest] = Field(..., min_items=1, description="土层信息")
    excavation_stages: List[ExcavationStageRequest] = Field(..., min_items=1, description="开挖阶段")
    support_elements: Optional[List[SupportElementRequest]] = Field(None, description="支护结构")
    mesh_file: Optional[str] = Field(None, description="网格文件路径")

class TerraAnalysisResponse(BaseModel):
    """Terra分析响应模型"""
    status: str
    analysis_id: str
    message: str
    analysis_type: str
    stages_count: int
    estimated_duration: int  # 估计耗时(秒)

# 全局变量存储分析任务
analysis_tasks = {}

@router.get("/status")
async def get_terra_status():
    """获取Terra求解器状态"""
    solver = get_terra_solver()
    
    return {
        "status": "available" if solver.is_available() else "unavailable",
        "kratos_available": solver.is_available(),
        "pyvista_available": solver.pyvista_processor is not None,
        "version": "Terra v1.0 - 深基坑专业求解器",
        "supported_analysis_types": [e.value for e in TerraAnalysisType],
        "supported_materials": [e.value for e in TerraMaterial]
    }

@router.get("/database/soil-properties/{soil_type}")
async def get_typical_soil_properties(soil_type: str):
    """获取典型土体参数"""
    try:
        properties = TerraGeotechnicalDatabase.get_typical_soil_properties(soil_type)
        return {
            "status": "success",
            "soil_type": soil_type,
            "properties": properties,
            "description": f"{soil_type}的典型工程参数"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"获取土体参数失败: {str(e)}")

@router.get("/database/soil-types")
async def get_available_soil_types():
    """获取可用的土体类型"""
    return {
        "status": "success",
        "soil_types": [
            {
                "key": "soft_clay",
                "name": "软粘土",
                "description": "高压缩性，低强度的饱和粘土"
            },
            {
                "key": "medium_clay", 
                "name": "中等粘土",
                "description": "中等压缩性和强度的粘土"
            },
            {
                "key": "dense_sand",
                "name": "密实砂土",
                "description": "密实状态的砂性土"
            },
            {
                "key": "weathered_rock",
                "name": "风化岩石",
                "description": "轻微风化的岩石"
            }
        ]
    }

@router.post("/analysis/start", response_model=TerraAnalysisResponse)
async def start_terra_analysis(
    request: TerraAnalysisRequest,
    background_tasks: BackgroundTasks,
    connection_manager: ConnectionManager = Depends(lambda: ConnectionManager())
):
    """启动Terra深基坑分析"""
    solver = get_terra_solver()
    
    if not solver.is_available():
        raise HTTPException(status_code=503, detail="Terra求解器不可用")
    
    try:
        # 验证分析类型
        try:
            analysis_type = TerraAnalysisType(request.analysis_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"不支持的分析类型: {request.analysis_type}")
        
        # 转换土层数据
        soil_layers = []
        for layer_req in request.soil_layers:
            try:
                material_type = TerraMaterial(layer_req.material_type)
            except ValueError:
                material_type = TerraMaterial.CLAY  # 默认值
            
            soil_layer = TerraSoilLayer(
                name=layer_req.name,
                depth_from=layer_req.depth_from,
                depth_to=layer_req.depth_to,
                elastic_modulus=layer_req.elastic_modulus,
                poisson_ratio=layer_req.poisson_ratio,
                density=layer_req.density,
                cohesion=layer_req.cohesion,
                friction_angle=layer_req.friction_angle,
                permeability=layer_req.permeability,
                material_type=material_type
            )
            soil_layers.append(soil_layer)
        
        # 转换开挖阶段
        excavation_stages = []
        for stage_req in request.excavation_stages:
            stage = TerraExcavationStage(
                stage=stage_req.stage,
                depth=stage_req.depth,
                description=stage_req.description,
                duration=stage_req.duration
            )
            excavation_stages.append(stage)
        
        # 转换支护结构（如果有）
        support_elements = []
        if request.support_elements:
            for support_req in request.support_elements:
                element = TerraSupportElement(
                    element_type=support_req.element_type,
                    geometry=support_req.geometry,
                    material_properties=support_req.material_properties,
                    installation_stage=support_req.installation_stage
                )
                support_elements.append(element)
        
        # 生成分析ID
        analysis_id = f"terra_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # 启动后台分析任务
        background_tasks.add_task(
            run_terra_analysis_background,
            analysis_id,
            request.project_name,
            analysis_type,
            soil_layers,
            excavation_stages,
            support_elements,
            connection_manager
        )
        
        # 估算耗时（基于开挖阶段数量）
        estimated_duration = len(excavation_stages) * 30  # 每阶段约30秒
        
        # 记录任务
        analysis_tasks[analysis_id] = {
            "status": "started",
            "project_name": request.project_name,
            "analysis_type": analysis_type.value,
            "start_time": datetime.now(),
            "stages_count": len(excavation_stages)
        }
        
        return TerraAnalysisResponse(
            status="started",
            analysis_id=analysis_id,
            message="Terra深基坑分析已启动",
            analysis_type=analysis_type.value,
            stages_count=len(excavation_stages),
            estimated_duration=estimated_duration
        )
        
    except Exception as e:
        logger.error(f"启动Terra分析失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"启动分析失败: {str(e)}")

@router.get("/analysis/{analysis_id}/status")
async def get_analysis_status(analysis_id: str):
    """获取分析状态"""
    if analysis_id not in analysis_tasks:
        raise HTTPException(status_code=404, detail="分析任务不存在")
    
    task_info = analysis_tasks[analysis_id]
    
    return {
        "analysis_id": analysis_id,
        "status": task_info["status"],
        "project_name": task_info["project_name"],
        "analysis_type": task_info["analysis_type"],
        "start_time": task_info["start_time"].isoformat(),
        "stages_count": task_info["stages_count"],
        "current_stage": task_info.get("current_stage", 0),
        "progress": task_info.get("progress", 0),
        "message": task_info.get("message", ""),
        "results_url": task_info.get("results_url")
    }

@router.get("/analysis/{analysis_id}/visualize/{field_name}")
async def get_analysis_visualization(analysis_id: str, field_name: str):
    """获取分析结果的可视化数据"""
    if analysis_id not in analysis_tasks:
        raise HTTPException(status_code=404, detail="分析任务不存在")
    
    task_info = analysis_tasks[analysis_id]
    if task_info["status"] != "completed" or not task_info.get("result_file"):
        raise HTTPException(status_code=400, detail="分析未完成或结果文件不存在")

    solver = get_terra_solver()
    if not solver.pyvista_processor:
        raise HTTPException(status_code=503, detail="PyVista处理器不可用")

    try:
        # 使用PyVista处理器处理结果文件
        visualization_data = await solver.pyvista_processor.process_terra_results(
            task_info["result_file"],
            field_to_process=field_name
        )
        return visualization_data
    except Exception as e:
        logger.error(f"可视化数据生成失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"可视化数据生成失败: {str(e)}")


@router.get("/analysis/{analysis_id}/results")
async def get_analysis_results(analysis_id: str):
    """获取分析结果"""
    if analysis_id not in analysis_tasks:
        raise HTTPException(status_code=404, detail="分析任务不存在")
    
    task_info = analysis_tasks[analysis_id]
    
    if task_info["status"] != "completed":
        raise HTTPException(status_code=400, detail="分析尚未完成")
    
    return {
        "analysis_id": analysis_id,
        "status": "completed",
        "results": task_info.get("results", {}),
        "visualization_data": task_info.get("visualization_data", {}),
        "summary": task_info.get("summary", {})
    }

@router.delete("/analysis/{analysis_id}")
async def cancel_analysis(analysis_id: str):
    """取消分析任务"""
    if analysis_id not in analysis_tasks:
        raise HTTPException(status_code=404, detail="分析任务不存在")
    
    task_info = analysis_tasks[analysis_id]
    
    if task_info["status"] in ["completed", "failed"]:
        # 只删除记录
        del analysis_tasks[analysis_id]
        return {"message": "分析记录已删除"}
    else:
        # 标记为取消
        task_info["status"] = "cancelled"
        task_info["message"] = "用户取消"
        return {"message": "分析已取消"}

async def run_terra_analysis_background(
    analysis_id: str,
    project_name: str,
    analysis_type: TerraAnalysisType,
    soil_layers: List[TerraSoilLayer],
    excavation_stages: List[TerraExcavationStage],
    support_elements: List[TerraSupportElement],
    connection_manager: ConnectionManager
):
    """后台运行Terra分析"""
    
    async def progress_callback(progress: int, message: str):
        """进度回调函数"""
        # 更新任务状态
        if analysis_id in analysis_tasks:
            analysis_tasks[analysis_id].update({
                "progress": progress,
                "message": message,
                "current_stage": progress // 25 + 1  # 粗略估算当前阶段
            })
        
        # 通过WebSocket发送进度更新
        await connection_manager.broadcast({
            "type": "terra_progress",
            "analysis_id": analysis_id,
            "progress": progress,
            "message": message
        })
    
    try:
        logger.info(f"开始Terra后台分析: {analysis_id}")
        
        # 获取Terra求解器
        solver = get_terra_solver()
        
        # 初始化分析
        await progress_callback(5, "初始化Terra分析...")
        init_result = await solver.initialize_analysis(
            project_name=project_name,
            analysis_type=analysis_type,
            soil_layers=soil_layers,
            excavation_stages=excavation_stages,
            support_elements=support_elements
        )
        
        await progress_callback(15, "Terra分析初始化完成")
        
        # 运行分阶段开挖分析
        if analysis_type == TerraAnalysisType.EXCAVATION:
            result = await solver.run_staged_excavation(progress_callback)
        else:
            # 其他分析类型的实现
            result = None
        
        if result and result.status == "completed":
            await progress_callback(95, "处理可视化数据...")
            
            # 获取可视化数据
            visualization_data = {}
            if solver.pyvista_processor and result.vtk_files:
                visualization_data = await solver.pyvista_processor.process_terra_results(
                    result.vtk_files[-1]
                )
            
            # 更新任务状态为完成
            analysis_tasks[analysis_id].update({
                "status": "completed",
                "progress": 100,
                "message": "Terra分析完成",
                "results": {
                    "displacement_max": result.displacement_max,
                    "stress_max": result.stress_max,
                    "stages_completed": result.stages_completed,
                    "vtk_files": result.vtk_files
                },
                "visualization_data": visualization_data,
                "summary": {
                    "analysis_type": result.analysis_type.value,
                    "total_stages": len(excavation_stages),
                    "max_displacement_mm": result.displacement_max * 1000,
                    "max_stress_kpa": result.stress_max
                }
            })
            
            await progress_callback(100, "Terra分析全部完成")
            
        else:
            # 分析失败
            error_msg = result.error_message if result else "未知错误"
            analysis_tasks[analysis_id].update({
                "status": "failed",
                "message": f"Terra分析失败: {error_msg}",
                "error": error_msg
            })
            
            await connection_manager.broadcast({
                "type": "terra_error",
                "analysis_id": analysis_id,
                "error": error_msg
            })
        
    except Exception as e:
        logger.error(f"Terra后台分析异常: {str(e)}")
        
        # 更新任务状态为失败
        if analysis_id in analysis_tasks:
            analysis_tasks[analysis_id].update({
                "status": "failed",
                "message": f"Terra分析异常: {str(e)}",
                "error": str(e)
            })
        
        await connection_manager.broadcast({
            "type": "terra_error",
            "analysis_id": analysis_id,
            "error": str(e)
        })
    
    finally:
        # 清理资源
        solver = get_terra_solver()
        solver.cleanup()

# 健康检查端点
@router.get("/health")
async def terra_health_check():
    """Terra求解器健康检查"""
    solver = get_terra_solver()
    
    return {
        "service": "Terra深基坑求解器",
        "status": "healthy" if solver.is_available() else "unhealthy",
        "timestamp": datetime.now().isoformat(),
        "active_analyses": len([t for t in analysis_tasks.values() if t["status"] == "running"]),
        "total_analyses": len(analysis_tasks)
    }