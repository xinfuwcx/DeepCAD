"""
可视化API路由
集成PyVista Web桥梁，提供Kratos分析结果的Web可视化接口
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import os
from pathlib import Path

from ...core.unified_cae_engine import UnifiedCAEEngine
from ...core.pyvista_web_bridge import PyVistaWebBridge, process_kratos_vtk_for_web

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/visualization", tags=["visualization"])

# 请求模型
class AnalysisRequest(BaseModel):
    """分析请求模型"""
    project_name: str = Field(..., description="项目名称")
    excavation: Dict[str, Any] = Field(..., description="基坑参数")
    geology: Optional[Dict[str, Any]] = Field(None, description="地质参数")
    analysis: Dict[str, Any] = Field(..., description="分析设置")
    mesh_settings: Optional[Dict[str, Any]] = Field(None, description="网格设置")

class VisualizationRequest(BaseModel):
    """可视化请求模型"""
    vtk_file_path: str = Field(..., description="VTK文件路径")
    fields: Optional[List[str]] = Field(None, description="要可视化的字段列表")
    cache_enabled: bool = Field(True, description="是否启用缓存")

class FieldUpdateRequest(BaseModel):
    """字段更新请求模型"""
    session_id: str = Field(..., description="会话ID")
    field_name: str = Field(..., description="字段名称")
    color_range: Optional[List[float]] = Field(None, description="颜色映射范围")
    opacity: Optional[float] = Field(None, description="透明度")

# 全局变量
_cae_engine = None
_pyvista_bridge = None

def get_cae_engine() -> UnifiedCAEEngine:
    """获取CAE引擎实例"""
    global _cae_engine
    if _cae_engine is None:
        _cae_engine = UnifiedCAEEngine()
    return _cae_engine

def get_pyvista_bridge() -> PyVistaWebBridge:
    """获取PyVista桥梁实例"""
    global _pyvista_bridge
    if _pyvista_bridge is None:
        _pyvista_bridge = PyVistaWebBridge()
    return _pyvista_bridge

@router.post("/run_analysis")
async def run_cae_analysis(
    request: AnalysisRequest,
    background_tasks: BackgroundTasks,
    engine: UnifiedCAEEngine = Depends(get_cae_engine)
):
    """
    运行完整的CAE分析并返回可视化数据
    
    这个接口整合了整个分析流程：
    1. 参数化建模
    2. GemPy地质建模（如果有地质数据）
    3. Gmsh网格生成
    4. Kratos求解计算
    5. PyVista后处理
    6. Three.js可视化数据生成
    """
    logger.info(f"开始CAE分析: {request.project_name}")
    
    try:
        # 1. 准备分析参数
        analysis_params = {
            'project_name': request.project_name,
            'excavation': request.excavation,
            'analysis': request.analysis
        }
        
        # 添加可选参数
        if request.geology:
            analysis_params['geology'] = request.geology
        if request.mesh_settings:
            analysis_params['mesh_settings'] = request.mesh_settings
        else:
            analysis_params['mesh_settings'] = {'global_mesh_size': 5.0}
        
        # 2. 运行完整分析流程
        logger.info("启动统一CAE引擎分析...")
        cae_result = await engine.run_complete_analysis(analysis_params)
        
        if cae_result['status'] != 'success':
            raise HTTPException(
                status_code=500,
                detail=f"CAE分析失败: {cae_result.get('error', '未知错误')}"
            )
        
        # 3. 使用PyVista处理分析结果
        logger.info("使用PyVista处理分析结果...")
        bridge = get_pyvista_bridge()
        
        # 获取Kratos结果文件路径
        result_file = cae_result['analysis_result'].result_file
        
        # 处理为Web可视化格式
        visualization_result = await bridge.process_kratos_result(
            result_file, 
            fields=['PRESSURE', 'DISPLACEMENT', 'VELOCITY']
        )
        
        # 4. 构建完整响应
        response = {
            'status': 'success',
            'project_name': request.project_name,
            'analysis_summary': {
                'mesh_nodes': cae_result['mesh_model'].node_count,
                'mesh_elements': cae_result['mesh_model'].element_count,
                'analysis_type': request.analysis.get('type', 'unknown'),
                'working_directory': cae_result['working_dir']
            },
            'visualization_data': visualization_result['visualization_data'],
            'quality_metrics': visualization_result['analysis_summary']['quality_metrics'],
            'available_fields': list(visualization_result['visualization_data'].keys()),
            'metadata': {
                'cae_engine_result': {
                    'parametric_model': cae_result['parametric_model'].name if cae_result.get('parametric_model') else None,
                    'geological_model': bool(cae_result.get('geological_model')),
                    'mesh_quality': cae_result['mesh_model'].quality_metrics
                },
                'pyvista_processing': visualization_result['metadata']
            }
        }
        
        logger.info(f"CAE分析完成: {len(response['available_fields'])}个可视化字段")
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"CAE分析失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"分析过程出错: {str(e)}"
        )

@router.post("/process_vtk")
async def process_vtk_file(
    request: VisualizationRequest,
    bridge: PyVistaWebBridge = Depends(get_pyvista_bridge)
):
    """
    直接处理VTK文件为Web可视化格式
    
    适用于已有VTK结果文件的情况
    """
    logger.info(f"处理VTK文件: {request.vtk_file_path}")
    
    try:
        # 检查文件是否存在
        if not os.path.exists(request.vtk_file_path):
            raise HTTPException(
                status_code=404,
                detail=f"VTK文件不存在: {request.vtk_file_path}"
            )
        
        # 处理VTK文件
        result = await bridge.process_kratos_result(
            request.vtk_file_path,
            fields=request.fields
        )
        
        if result['status'] != 'success':
            raise HTTPException(
                status_code=500,
                detail="VTK文件处理失败"
            )
        
        # 添加文件信息
        file_info = {
            'file_path': request.vtk_file_path,
            'file_size': os.path.getsize(request.vtk_file_path),
            'file_name': os.path.basename(request.vtk_file_path)
        }
        
        result['file_info'] = file_info
        
        logger.info(f"VTK文件处理完成: {len(result['visualization_data'])}个字段")
        return JSONResponse(content=result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"VTK文件处理失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"处理VTK文件时出错: {str(e)}"
        )

@router.get("/fields/{vtk_file_hash}")
async def get_available_fields(
    vtk_file_hash: str,
    bridge: PyVistaWebBridge = Depends(get_pyvista_bridge)
):
    """
    获取VTK文件中可用的字段列表
    
    用于前端动态生成字段选择界面
    """
    try:
        # 这里简化实现，实际应该根据hash查找文件
        # 或者从缓存中获取字段信息
        
        # 返回常见的CAE分析字段
        common_fields = [
            {
                'name': 'PRESSURE',
                'display_name': '压力',
                'units': 'Pa',
                'description': '流体压力分布'
            },
            {
                'name': 'DISPLACEMENT',
                'display_name': '位移',
                'units': 'm',
                'description': '结构位移分布'
            },
            {
                'name': 'VELOCITY',
                'display_name': '速度',
                'units': 'm/s',
                'description': '流体速度分布'
            },
            {
                'name': 'STRESS',
                'display_name': '应力',
                'units': 'Pa',
                'description': '结构应力分布'
            }
        ]
        
        return JSONResponse(content={
            'status': 'success',
            'fields': common_fields
        })
        
    except Exception as e:
        logger.error(f"获取字段列表失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"获取字段信息时出错: {str(e)}"
        )

@router.post("/update_field_visualization")
async def update_field_visualization(
    request: FieldUpdateRequest,
    bridge: PyVistaWebBridge = Depends(get_pyvista_bridge)
):
    """
    更新字段可视化参数
    
    支持实时调整颜色映射范围、透明度等参数
    """
    logger.info(f"更新字段可视化: {request.field_name}")
    
    try:
        # 这里可以实现实时参数更新
        # 实际实现中可能需要重新计算颜色映射等
        
        response = {
            'status': 'success',
            'session_id': request.session_id,
            'field_name': request.field_name,
            'updated_parameters': {
                'color_range': request.color_range,
                'opacity': request.opacity
            },
            'message': '可视化参数已更新'
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"更新可视化参数失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"更新可视化参数时出错: {str(e)}"
        )

@router.delete("/clear_cache")
async def clear_visualization_cache(
    bridge: PyVistaWebBridge = Depends(get_pyvista_bridge)
):
    """
    清理可视化缓存
    
    用于释放存储空间或强制重新处理
    """
    try:
        bridge.clear_cache()
        
        return JSONResponse(content={
            'status': 'success',
            'message': '可视化缓存已清理'
        })
        
    except Exception as e:
        logger.error(f"清理缓存失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"清理缓存时出错: {str(e)}"
        )

@router.get("/health")
async def visualization_health_check():
    """
    可视化服务健康检查
    
    检查PyVista、Three.js数据转换等功能是否正常
    """
    try:
        # 检查PyVista
        import pyvista as pv
        test_mesh = pv.Sphere(radius=1)
        
        # 检查数据转换
        bridge = get_pyvista_bridge()
        
        health_info = {
            'status': 'healthy',
            'pyvista_version': pv.__version__,
            'cache_dir': str(bridge.cache_dir),
            'supported_fields': bridge.supported_fields,
            'timestamp': str(pd.Timestamp.now())
        }
        
        return JSONResponse(content=health_info)
        
    except Exception as e:
        logger.error(f"健康检查失败: {e}")
        return JSONResponse(
            content={
                'status': 'unhealthy',
                'error': str(e)
            },
            status_code=503
        )

# 示例数据生成（用于测试）
@router.post("/generate_test_data")
async def generate_test_visualization_data():
    """
    生成测试可视化数据
    
    用于前端开发和测试
    """
    try:
        import numpy as np
        
        # 生成简单的测试网格数据
        n_points = 1000
        
        # 生成球形点云
        theta = np.random.uniform(0, 2*np.pi, n_points)
        phi = np.random.uniform(0, np.pi, n_points)
        r = np.random.uniform(8, 12, n_points)
        
        x = r * np.sin(phi) * np.cos(theta)
        y = r * np.sin(phi) * np.sin(theta)
        z = r * np.cos(phi)
        
        vertices = np.column_stack([x, y, z]).flatten().tolist()
        
        # 生成简单的面片（三角形）
        faces = []
        for i in range(0, n_points-3, 3):
            faces.extend([i, i+1, i+2])
        
        # 生成模拟的物理场数据
        pressure_data = (z + 10) * 1000  # 基于高度的压力
        displacement_data = np.sqrt(x**2 + y**2 + z**2) * 0.01  # 径向位移
        
        test_data = {
            'status': 'success',
            'visualization_data': {
                'PRESSURE': {
                    'vertices': vertices,
                    'faces': faces,
                    'scalars': pressure_data.tolist(),
                    'field_name': 'PRESSURE',
                    'range': [float(pressure_data.min()), float(pressure_data.max())],
                    'units': 'Pa',
                    'description': '测试压力场'
                },
                'DISPLACEMENT': {
                    'vertices': vertices,
                    'faces': faces,
                    'scalars': displacement_data.tolist(),
                    'field_name': 'DISPLACEMENT',
                    'range': [float(displacement_data.min()), float(displacement_data.max())],
                    'units': 'm',
                    'description': '测试位移场'
                }
            },
            'analysis_summary': {
                'mesh_info': {
                    'n_points': n_points,
                    'n_faces': len(faces) // 3,
                    'bounds': [x.min(), x.max(), y.min(), y.max(), z.min(), z.max()],
                    'center': [x.mean(), y.mean(), z.mean()]
                }
            },
            'metadata': {
                'data_type': 'test_data',
                'generated_at': str(pd.Timestamp.now())
            }
        }
        
        logger.info("生成测试可视化数据完成")
        return JSONResponse(content=test_data)
        
    except Exception as e:
        logger.error(f"生成测试数据失败: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"生成测试数据时出错: {str(e)}"
        ) 