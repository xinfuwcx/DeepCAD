from fastapi import APIRouter, Depends, HTTPException
from typing import List
from loguru import logger

from deep_excavation.backend.services.geology_service import GeologyService
from deep_excavation.backend.models.geology import (
    GeologicalLayer,
    GeologyModelRequest,
)
# 新增：GemPy完整显示链路支持
from gateway.modules.geology.gempy_integration_service import GemPyIntegrationService

router = APIRouter()


# --- Pydantic Models are now in models/geology.py ---


# --- API Endpoint ---

@router.post(
    "/create-geological-model",
    response_model=List[GeologicalLayer],
    summary="Create Geological Model Geometry",
    description="Receives borehole data and returns a list of geological layers with three.js-compatible geometry."
)
async def create_geological_model_endpoint(
    request_body: GeologyModelRequest,
    geology_service: GeologyService = Depends(GeologyService)
):
    """
    Endpoint to generate geological model geometry from borehole data.
    """
    logger.info("Received request to generate geological model geometry.")
    try:
        serialized_layers = await geology_service.create_geological_model(
            borehole_data=[b.model_dump() for b in request_body.borehole_data],
            formations=request_body.formations,
            options=request_body.options
        )
        return serialized_layers
    except Exception as e:
        logger.error(f"Failed to create geological model geometry: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An internal server error occurred: {str(e)}"
        )


@router.post(
    "/gempy-modeling",
    summary="GemPy完整显示链路地质建模",
    description="使用GemPy进行地质建模，支持完整的GemPy→PyVista→Three.js显示链路"
)
async def gempy_geological_modeling(
    request_body: GeologyModelRequest
):
    """
    新的GemPy完整显示链路端点
    """
    logger.info("🏔️ 开始GemPy完整显示链路地质建模")
    
    try:
        # 1. 初始化GemPy集成服务
        gempy_service = GemPyIntegrationService()
        
        # 2. 检查依赖状态
        deps = gempy_service.check_dependencies()
        logger.info(f"📦 依赖状态: {deps}")
        
        # 3. 准备输入数据
        borehole_data = {
            'coordinates': [],
            'formations': [],
            'properties': []
        }
        
        # 转换输入数据格式
        for borehole in request_body.borehole_data:
            borehole_dict = borehole.model_dump()
            borehole_data['coordinates'].append([
                borehole_dict['x'], 
                borehole_dict['y'], 
                borehole_dict['z']
            ])
            borehole_data['formations'].append(borehole_dict.get('formation', 'unknown'))
            borehole_data['properties'].append(borehole_dict.get('properties', {}))
        
        # 4. 域配置
        domain_config = {
            'extent': [-100, 100, -100, 100, -50, 0],
            'resolution': [request_body.options.resolution_x, request_body.options.resolution_y, 20],
            'interpolation_method': 'rbf_multiquadric'  # 使用GemPy原生RBF
        }
        
        # 5. 执行GemPy建模 (完整显示链路)
        if deps['gempy']:
            logger.info("🎯 使用GemPy隐式建模")
            result = gempy_service.gempy_implicit_modeling(borehole_data, domain_config)
        else:
            logger.warning("⚠️ GemPy不可用，使用增强RBF备用方案")
            result = gempy_service.enhanced_rbf_modeling(borehole_data, domain_config)
        
        # 6. 返回完整结果
        response = {
            'success': result.get('success', False),
            'method': result.get('method', 'unknown'),
            'display_chain': result.get('display_chain', {}),
            'model_stats': result.get('model_stats', {}),
            'threejs_data': result.get('threejs_data', {}),
            'native_visualization': result.get('native_visualization', {}),
            'processing_time': result.get('processing_time', 0),
            'model_id': result.get('model_id', None)
        }
        
        logger.info(f"✅ GemPy建模完成: {response['method']}")
        return response
        
    except Exception as e:
        logger.error(f"❌ GemPy建模失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"GemPy建模失败: {str(e)}"
        )


@router.post(
    "/gempy-direct",
    summary="GemPy直接到Three.js显示链路",
    description="GemPy → Three.js 最短显示链路，跳过中间转换层，性能最优"
)
async def gempy_direct_to_threejs(
    request_body: GeologyModelRequest
):
    """
    GemPy → Three.js 直接转换端点 - 最短显示链路
    """
    logger.info("⚡ 开始GemPy → Three.js 直接显示链路")
    
    try:
        # 1. 初始化GemPy集成服务
        gempy_service = GemPyIntegrationService()
        
        # 2. 检查依赖状态
        deps = gempy_service.check_dependencies()
        
        if not deps['gempy']:
            raise HTTPException(
                status_code=503,
                detail="GemPy不可用，无法使用直接显示链路"
            )
        
        # 3. 准备输入数据
        borehole_data = {
            'coordinates': [],
            'formations': [],
            'properties': []
        }
        
        # 转换输入数据格式
        for borehole in request_body.borehole_data:
            borehole_dict = borehole.model_dump()
            borehole_data['coordinates'].append([
                borehole_dict['x'], 
                borehole_dict['y'], 
                borehole_dict['z']
            ])
            borehole_data['formations'].append(borehole_dict.get('formation', 'unknown'))
            borehole_data['properties'].append(borehole_dict.get('properties', {}))
        
        # 4. 域配置 - 优化为直接转换
        domain_config = {
            'extent': [-100, 100, -100, 100, -50, 0],
            'resolution': [request_body.options.resolution_x, request_body.options.resolution_y, 20],
            'interpolation_method': 'rbf_multiquadric',
            'direct_conversion': True  # 启用直接转换模式
        }
        
        # 5. 执行GemPy建模
        logger.info("🎯 使用GemPy隐式建模 (直接转换模式)")
        result = gempy_service.gempy_implicit_modeling(borehole_data, domain_config)
        
        # 6. 检查直接转换是否成功
        if not result.get('success', False):
            raise HTTPException(
                status_code=500,
                detail=f"GemPy建模失败: {result.get('error', '未知错误')}"
            )
        
        display_chain = result.get('display_chain', {})
        if not display_chain.get('direct_conversion_success', False):
            logger.warning("⚠️ 直接转换失败，但建模成功")
        
        # 7. 返回优化结果
        response = {
            'success': True,
            'method': 'GemPy_Direct_to_ThreeJS',
            'conversion_method': display_chain.get('conversion_method', 'unknown'),
            'performance_metrics': {
                'direct_conversion': display_chain.get('direct_conversion_success', False),
                'threejs_objects': display_chain.get('threejs_objects_count', 0),
                'processing_time': result.get('processing_time', 0),
                'skip_intermediate_layers': True
            },
            'threejs_data': result.get('threejs_data', {}),
            'model_stats': result.get('model_stats', {}),
            'model_id': result.get('model_id', None)
        }
        
        logger.info(f"⚡ GemPy直接显示链路完成: {response['conversion_method']}")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ GemPy直接显示链路失败: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"GemPy直接显示链路失败: {str(e)}"
        )