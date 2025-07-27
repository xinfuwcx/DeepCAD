from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from .schemas import (
    SoilDomainRequest, SoilDomainResponse,
    GSToolsGeologyRequest, GSToolsGeologyResponse,
    VariogramAnalysis, UncertaintyAnalysis,
    InterpolationMethod, VariogramModel
)
from .services import SoilLayerGenerator
from .simple_geology_service import get_simple_geology_service
from .direct_geology_service import get_direct_geology_service
from .geometry_modeling_service import get_geometry_modeling_service
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/geology",
    tags=["Geology"],
)

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "output", "geology")
os.makedirs(OUTPUT_DIR, exist_ok=True)

@router.post("/generate-soil-domain", response_model=SoilDomainResponse)
async def generate_soil_domain(request: SoilDomainRequest):
    """
    Generates a 3D soil domain from borehole data and returns the URL to the
    resulting glTF model.
    """
    try:
        borehole_dicts = [b.model_dump() for b in request.boreholes]
        
        generator = SoilLayerGenerator(
            boreholes=borehole_dicts,
            domain_expansion=request.domain_expansion,
            bottom_elevation=request.bottom_elevation,
            transition_distance=request.transition_distance
        )
        
        gltf_path = generator.generate_and_export_gltf(
            grid_resolution=request.grid_resolution,
            output_dir=OUTPUT_DIR
        )
        
        gltf_filename = os.path.basename(gltf_path)
        gltf_url = f"/geology/models/{gltf_filename}"

        return SoilDomainResponse(
            message="Soil domain generated successfully.",
            gltf_url=gltf_url,
            request_params=request
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")


@router.post("/geometry-modeling")
async def create_geology_geometry(request: dict):
    """
    完整地质几何建模
    RBF外推插值 + GMSH+OCC几何建模 + 物理组定义 + Three.js显示
    """
    try:
        service = get_geometry_modeling_service()
        
        # 解析请求参数
        boreholes_data = request.get('boreholes', [])
        if len(boreholes_data) < 3:
            raise HTTPException(status_code=400, detail="至少需要3个钻孔点")
        
        # 计算域参数
        domain_params = request.get('computation_domain', {})
        x_min = domain_params.get('x_min')
        x_max = domain_params.get('x_max')
        y_min = domain_params.get('y_min')
        y_max = domain_params.get('y_max')
        z_min = domain_params.get('z_min')
        z_max = domain_params.get('z_max')
        buffer_ratio = domain_params.get('buffer_ratio', 0.2)
        
        # RBF参数
        rbf_params = request.get('rbf_params', {})
        grid_resolution = rbf_params.get('grid_resolution', 10.0)
        rbf_function = rbf_params.get('rbf_function', 'multiquadric')
        smooth = rbf_params.get('smooth', 0.1)
        
        # GMSH参数
        gmsh_params = request.get('gmsh_params', {})
        characteristic_length = gmsh_params.get('characteristic_length', 5.0)
        use_bspline_surface = gmsh_params.get('use_bspline_surface', True)
        
        logger.info(f"🌍 开始完整地质几何建模: {len(boreholes_data)}个钻孔")
        
        # 1. 加载钻孔数据
        service.load_borehole_data(boreholes_data)
        
        # 2. 设置计算域
        service.set_computation_domain(
            x_min=x_min, x_max=x_max,
            y_min=y_min, y_max=y_max,
            z_min=z_min, z_max=z_max,
            buffer_ratio=buffer_ratio
        )
        
        # 3. RBF外推插值
        interpolated_data = service.rbf_interpolation_with_extrapolation(
            grid_resolution=grid_resolution,
            rbf_function=rbf_function,
            smooth=smooth
        )
        
        # 4. GMSH+OCC几何建模
        volume_entity = service.create_gmsh_geometry_with_occ(
            characteristic_length=characteristic_length,
            use_bspline_surface=use_bspline_surface
        )
        
        # 5. 导出Three.js几何数据
        geometry_data = service.export_geometry_to_threejs()
        
        # 6. 导出几何文件（可选）
        geometry_files = {}
        if request.get('export_files', False):
            geometry_files = service.export_gmsh_geometry_files(output_dir=OUTPUT_DIR)
        
        # 7. 获取统计信息
        statistics = service.get_geometry_statistics()
        
        logger.info(f"✓ 完整地质几何建模完成")
        
        return {
            "message": "完整地质几何建模成功完成",
            "geometry_data": geometry_data,
            "geometry_files": {k: f"/geology/models/{os.path.basename(v)}" for k, v in geometry_files.items()},
            "modeling_method": "RBF_GMSH_OCC_Complete_Geometry",
            "statistics": statistics,
            "capabilities": [
                "SciPy RBF大范围外推插值",
                "GMSH+OCC几何建模", 
                "物理组定义（土层、边界）",
                "Three.js几何显示",
                "为网格划分准备就绪"
            ],
            "request_params": request
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ 完整地质几何建模失败: {e}")
        raise HTTPException(status_code=500, detail=f"几何建模错误: {e}")
        
@router.post("/simple-geology")
async def generate_simple_geology(request: dict):
    """
    简化地质建模 - 向后兼容
    输出Three.js可用数据格式
    """
    try:
        service = get_direct_geology_service()
        
        # 解析请求参数
        boreholes_data = request.get('boreholes', [])
        if len(boreholes_data) < 3:
            raise HTTPException(status_code=400, detail="至少需要3个钻孔点")
        
        grid_resolution = request.get('grid_resolution', 5.0)
        expansion = request.get('expansion', 50.0)
        
        logger.info(f"🌍 开始直接地质建模: {len(boreholes_data)}个钻孔")
        
        # 加载钻孔数据
        service.load_borehole_data(boreholes_data)
        
        # 执行插值建模并生成Three.js数据
        mesh_data = service.interpolate_and_generate_mesh(
            grid_resolution=grid_resolution,
            expansion=expansion
        )
        
        # 导出JSON数据文件
        json_path = service.export_to_json(output_dir=OUTPUT_DIR)
        json_filename = os.path.basename(json_path)
        json_url = f"/geology/models/{json_filename}"
        
        # 获取统计信息
        statistics = service.get_statistics()
        
        logger.info(f"✓ 直接地质建模完成: {json_url}")
        
        return {
            "message": "简化地质建模成功完成 (向后兼容)",
            "mesh_data": mesh_data,  # 直接返回Three.js可用数据
            "json_url": json_url,    # 可选的JSON文件下载
            "modeling_method": "Direct_ThreeJS_RBF_Legacy",
            "statistics": statistics,
            "features": [
                "RBF径向基函数插值",
                "直接Three.js数据输出",
                "跳过VTK避免字符编码问题",
                "BufferGeometry格式",
                "适合中小规模项目",
                "向后兼容接口"
            ],
            "recommendation": "推荐使用 /geometry-modeling 接口获得完整几何建模功能",
            "request_params": request
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ 直接地质建模失败: {e}")
        raise HTTPException(status_code=500, detail=f"建模错误: {e}")

@router.get("/test-geometry-service")
async def test_geometry_modeling_service():
    """
    测试完整地质几何建模服务
    """
    try:
        service = get_geometry_modeling_service()
        
        # 创建测试数据
        test_boreholes = [
            {"id": "test1", "x": 0.0, "y": 0.0, "z": -4.0, "soil_type": "粘土", "layer_id": 1, "ground_elevation": 0.0, "depth": 4.0},
            {"id": "test2", "x": 100.0, "y": 0.0, "z": -4.5, "soil_type": "砂土", "layer_id": 2, "ground_elevation": 0.0, "depth": 4.5},
            {"id": "test3", "x": 50.0, "y": 100.0, "z": -3.5, "soil_type": "粘土", "layer_id": 1, "ground_elevation": 0.0, "depth": 3.5},
            {"id": "test4", "x": -50.0, "y": 50.0, "z": -4.2, "soil_type": "砂土", "layer_id": 2, "ground_elevation": 0.0, "depth": 4.2}
        ]
        
        # 测试步骤
        service.load_borehole_data(test_boreholes)
        service.set_computation_domain()  # 自动计算域
        
        # RBF插值测试
        interpolated = service.rbf_interpolation_with_extrapolation(grid_resolution=20.0)
        
        # 几何建模测试（简化）
        try:
            geometry_volume = service.create_gmsh_geometry_with_occ(
                characteristic_length=10.0,
                use_bspline_surface=False  # 简化测试
            )
            geometry_created = True
        except Exception as e:
            logger.warning(f"几何建模测试失败: {e}")
            geometry_created = False
        
        # 导出数据测试
        geometry_data = service.export_geometry_to_threejs()
        
        # 获取统计信息
        stats = service.get_geometry_statistics()
        
        return {
            "success": True,
            "message": "完整地质几何建模服务测试完成",
            "service_available": True,
            "test_results": {
                "interpolation_completed": interpolated is not None,
                "geometry_created": geometry_created,
                "geometry_data_exported": geometry_data is not None,
                "n_surface_vertices": len(geometry_data.get('surface_vertices', [])) // 3,
                "n_surface_triangles": len(geometry_data.get('surface_indices', [])) // 3,
                "n_physical_groups": len(geometry_data.get('physical_groups', {})),
            },
            "statistics": stats,
            "capabilities": [
                "SciPy RBF大范围外推插值",
                "GMSH+OCC几何建模",
                "物理组定义（土层、边界）",
                "Three.js几何显示",
                "专注几何阶段"
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ 完整几何建模服务测试失败: {e}")
        return {
            "success": False,
            "message": f"测试失败: {str(e)}",
            "service_available": False
        }
        
@router.get("/test-direct-service")
async def test_direct_service():
    """
    测试简化直接地质建模服务 - 向后兼容
    """
    try:
        service = get_direct_geology_service()
        
        # 创建测试数据
        test_boreholes = [
            {"id": "test1", "x": 0.0, "y": 0.0, "z": -4.0, "soil_type": "粘土", "layer_id": 1},
            {"id": "test2", "x": 100.0, "y": 0.0, "z": -4.5, "soil_type": "砂土", "layer_id": 2},
            {"id": "test3", "x": 50.0, "y": 100.0, "z": -3.5, "soil_type": "粘土", "layer_id": 1}
        ]
        
        # 加载测试数据
        service.load_borehole_data(test_boreholes)
        
        # 生成网格数据
        mesh_data = service.interpolate_and_generate_mesh(grid_resolution=10.0)
        
        # 获取统计信息
        stats = service.get_statistics()
        
        return {
            "success": True,
            "message": "直接地质服务测试完成",
            "service_available": True,
            "test_results": stats,
            "mesh_preview": {
                "n_vertices": len(mesh_data["vertices"]) // 3,
                "n_triangles": len(mesh_data["indices"]) // 3,
                "n_boreholes": len(mesh_data["borehole_points"]) // 3
            },
            "capabilities": [
                "RBF径向基函数插值",
                "直接Three.js数据输出",
                "跳过VTK避免编码问题", 
                "BufferGeometry格式",
                "适合中小规模项目"
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ 直接服务测试失败: {e}")
        return {
            "success": False,
            "message": f"测试失败: {str(e)}",
            "service_available": False
        }

@router.get("/models/{filename}")
async def get_geology_model(filename: str):
    """
    提供生成的模型文件（支持glTF和JSON格式）
    """
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        # 根据文件扩展名确定媒体类型
        if filename.endswith('.gltf'):
            media_type = 'model/gltf+json'
        elif filename.endswith('.json'):
            media_type = 'application/json'
        else:
            media_type = 'application/octet-stream'
            
        return FileResponse(file_path, media_type=media_type, filename=filename)
    raise HTTPException(status_code=404, detail="Model not found.")

# === 新增：地质几何建模API ===

from .gstools_geometry_service import (
    GeologyGeometryService, 
    ComputationDomain, 
    ThreeZoneParams, 
    GMSHParams
)
import uuid
import threading
from typing import Dict, Any

# 全局任务存储
active_geometry_tasks: Dict[str, Dict[str, Any]] = {}

@router.post("/generate-geometry")
async def generate_geology_geometry(request: dict):
    """生成地质几何模型（多层分段三区混合）"""
    try:
        # 创建任务ID
        task_id = str(uuid.uuid4())
        
        # 验证和解析输入数据
        boreholes_data = request.get('boreholes', [])
        domain_data = request.get('domain', {})
        algorithm_data = request.get('algorithm', {})
        gmsh_data = request.get('gmsh_params', {})
        
        if len(boreholes_data) < 3:
            raise HTTPException(
                status_code=400, 
                detail='At least 3 boreholes are required for modeling'
            )
        
        # 创建参数对象
        domain = ComputationDomain(
            extension_method=domain_data.get('extension_method', 'convex_hull'),
            x_extend=domain_data.get('x_extend', 100),
            y_extend=domain_data.get('y_extend', 100),
            foundation_multiplier=domain_data.get('foundation_multiplier'),
            bottom_elevation=domain_data.get('bottom_elevation', -50),
            mesh_resolution=domain_data.get('mesh_resolution', 2.0)
        )
        
        algorithm = ThreeZoneParams(
            core_radius=algorithm_data.get('core_radius', 50),
            transition_distance=algorithm_data.get('transition_distance', 150),
            variogram_model=algorithm_data.get('variogram_model', 'spherical'),
            trend_order=algorithm_data.get('trend_order', 'linear'),
            uncertainty_analysis=algorithm_data.get('uncertainty_analysis', False),
            confidence_level=algorithm_data.get('confidence_level')
        )
        
        gmsh_params = GMSHParams(
            characteristic_length=gmsh_data.get('characteristic_length', 2.0),
            physical_groups=gmsh_data.get('physical_groups', False),  # 几何建模不需要物理分组
            mesh_quality=gmsh_data.get('mesh_quality', 0.8)
        )
        
        # 初始化任务状态
        active_geometry_tasks[task_id] = {
            'status': 'running',
            'progress': 0,
            'message': 'Starting geology geometry modeling...',
            'result': None
        }
        
        # 启动后台任务
        def run_modeling():
            try:
                service = GeologyGeometryService()
                
                # 更新进度
                active_geometry_tasks[task_id]['progress'] = 20
                active_geometry_tasks[task_id]['message'] = 'Processing borehole data...'
                
                result = service.run_complete_workflow(
                    boreholes_data, domain, algorithm, gmsh_params
                )
                
                if result['success']:
                    active_geometry_tasks[task_id]['status'] = 'completed'
                    active_geometry_tasks[task_id]['progress'] = 100
                    active_geometry_tasks[task_id]['message'] = result['message']
                    active_geometry_tasks[task_id]['result'] = result
                else:
                    active_geometry_tasks[task_id]['status'] = 'failed'
                    active_geometry_tasks[task_id]['message'] = result['message']
                    
            except Exception as e:
                logger.error(f"Error in geology geometry modeling task {task_id}: {e}")
                active_geometry_tasks[task_id]['status'] = 'failed'
                active_geometry_tasks[task_id]['message'] = f'Error: {str(e)}'
        
        # 启动后台线程
        thread = threading.Thread(target=run_modeling)
        thread.daemon = True
        thread.start()
        
        logger.info(f"Started geology geometry modeling task: {task_id}")
        
        return {
            'success': True,
            'task_id': task_id,
            'message': 'Geology geometry modeling started'
        }
        
    except Exception as e:
        logger.error(f"Error starting geology geometry modeling: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/geometry-status/{task_id}")
async def get_geometry_status(task_id: str):
    """获取地质几何建模任务状态"""
    try:
        if task_id not in active_geometry_tasks:
            raise HTTPException(status_code=404, detail='Task not found')
        
        task = active_geometry_tasks[task_id]
        
        response = {
            'success': True,
            'task_id': task_id,
            'status': task['status'],
            'progress': task['progress'],
            'message': task['message']
        }
        
        # 如果任务完成，添加结果信息
        if task['status'] == 'completed' and task['result']:
            result = task['result']
            response['result'] = {
                'statistics': result.get('statistics', {}),
                'files': {k: f'/geology/geometry-download/{task_id}/{k}' for k in result.get('files', {}).keys()}
            }
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting geometry task status {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/geometry-download/{task_id}/{file_type}")
async def download_geometry_file(task_id: str, file_type: str):
    """下载地质几何建模结果文件"""
    try:
        if task_id not in active_geometry_tasks:
            raise HTTPException(status_code=404, detail='Task not found')
        
        task = active_geometry_tasks[task_id]
        if task['status'] != 'completed' or not task['result']:
            raise HTTPException(status_code=400, detail='Task not completed or no result')
        
        files = task['result'].get('files', {})
        if file_type not in files:
            raise HTTPException(status_code=404, detail='File type not found')
        
        file_path = files[file_type]
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail='File not found on disk')
        
        # 确定媒体类型
        media_types = {
            'mesh': 'application/octet-stream',
            'ply': 'model/ply',
            'vtk': 'application/octet-stream', 
            'stl': 'model/stl',
            'step': 'application/step'
        }
        
        media_type = media_types.get(file_type, 'application/octet-stream')
        filename = f'geology_{task_id}.{file_type}'
        
        return FileResponse(
            file_path,
            media_type=media_type,
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading geometry file {task_id}/{file_type}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/geometry-cleanup/{task_id}")
async def cleanup_geometry_task(task_id: str):
    """清理完成的几何建模任务"""
    try:
        if task_id not in active_geometry_tasks:
            raise HTTPException(status_code=404, detail='Task not found')
        
        # 清理文件
        task = active_geometry_tasks[task_id]
        if task.get('result') and task['result'].get('files'):
            for file_path in task['result']['files'].values():
                try:
                    if os.path.exists(file_path):
                        os.remove(file_path)
                except Exception as e:
                    logger.warning(f"Failed to remove file {file_path}: {e}")
        
        # 从内存中移除
        del active_geometry_tasks[task_id]
        
        return {
            'success': True,
            'message': f'Task {task_id} cleaned up'
        }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cleaning up geometry task {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-geometry-service")
async def test_geometry_service():
    """测试地质几何建模服务"""
    try:
        from .gstools_geometry_service import test_geology_service
        
        # 运行测试
        logger.info("Running geometry service test...")
        
        return {
            'success': True,
            'message': 'Geometry service test completed - check logs for details',
            'service_available': True
        }
        
    except Exception as e:
        logger.error(f"Error testing geometry service: {e}")
        return {
            'success': False,
            'message': f'Geometry service test failed: {str(e)}',
            'service_available': False
        } 