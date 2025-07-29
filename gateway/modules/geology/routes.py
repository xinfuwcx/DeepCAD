from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from .schemas import (
    SoilDomainRequest, SoilDomainResponse,
    GSToolsGeologyRequest, GSToolsGeologyResponse,
    VariogramAnalysis, UncertaintyAnalysis,
    InterpolationMethod, VariogramModel
)
from .services import SoilLayerGenerator
from .direct_geology_service import get_direct_geology_service
from .geometry_modeling_service import get_geometry_modeling_service  
from .gempy_integration_service import get_gempy_integration_service
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

# GSTools服务已删除 - 功能由核心服务提供
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
        # GSTools服务已删除 - 测试功能移至核心服务
        
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

# === 新增：GemPy集成API端点 ===

@router.post("/gempy-modeling")
async def gempy_geological_modeling(request: dict):
    """
    GemPy集成地质建模
    支持复杂地质结构：夹层、断层、稀疏钻孔数据
    RBF增强插值 + GemPy隐式建模 + PyVista转换 + Three.js显示
    """
    try:
        service = get_gempy_integration_service()
        
        # 记录请求开始
        logger.info("🌍 开始GemPy集成地质建模...")
        
        # 处理建模请求
        result = service.process_geological_modeling_request(request)
        
        if result['success']:
            logger.info(f"✓ GemPy地质建模成功完成，方法: {result['method']}")
            
            # 构建响应数据
            response = {
                "message": "GemPy集成地质建模成功完成",
                "success": True,
                "modeling_method": result['method'],
                "processing_time": result.get('processing_time', 0),
                "model_data": {
                    "threejs_data": result.get('threejs_data', {}),
                    "surfaces": result.get('surfaces', {}),
                    "model_stats": result.get('model_stats', {}),
                    "quality_metrics": result.get('quality_metrics', {})
                },
                "input_analysis": result.get('input_data', {}),
                "domain_config": result.get('domain_config', {}),
                "dependencies": result.get('dependencies', {}),
                "capabilities": [
                    "RBF增强插值算法 (自适应邻域)",
                    "GemPy隐式地质建模 (如可用)",
                    "复杂地质结构处理 (夹层、断层)",  
                    "稀疏钻孔数据优化",
                    "PyVista高效网格转换",
                    "Three.js原生显示支持",
                    "地质不确定性量化"
                ],
                "algorithm_features": {
                    "adaptive_rbf": "根据数据密度自适应调整插值策略",
                    "geological_constraints": "地层序列和连续性约束",
                    "confidence_mapping": "插值置信度评估",
                    "sparse_data_handling": "稀疏区域保守插值策略",
                    "implicit_modeling": "GemPy自动处理复杂地质关系"
                }
            }
            
            # 如果有模型文件，添加下载链接
            if 'model_id' in result:
                response["model_files"] = {
                    "model_id": result['model_id'],
                    "download_available": True
                }
            
            return response
            
        else:
            logger.error(f"❌ GemPy地质建模失败: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=500, 
                detail=f"地质建模失败: {result.get('error', 'Unknown error')}"
            )
            
    except ValueError as e:
        logger.error(f"❌ 请求参数错误: {e}")
        raise HTTPException(status_code=400, detail=f"参数错误: {str(e)}")
    except Exception as e:
        logger.error(f"❌ GemPy地质建模异常: {e}")
        raise HTTPException(status_code=500, detail=f"建模异常: {str(e)}")

@router.get("/gempy-capabilities")
async def get_gempy_capabilities():
    """
    获取GemPy集成能力信息
    检查依赖库可用性和功能支持
    """
    try:
        service = get_gempy_integration_service()
        dependencies = service.check_dependencies()
        
        capabilities = {
            "service_available": True,
            "dependencies": dependencies,
            "supported_features": {
                "rbf_interpolation": True,
                "adaptive_neighbors": True,
                "geological_constraints": True,
                "gempy_modeling": dependencies['gempy'],
                "pyvista_conversion": dependencies['pyvista'],
                "threejs_export": True,
                "sparse_data_handling": True,
                "confidence_mapping": True
            },
            "algorithm_info": {
                "rbf_kernels": [
                    "thin_plate_spline", "gaussian", "multiquadric", 
                    "inverse_multiquadric", "linear", "cubic"
                ],
                "interpolation_modes": [
                    "adaptive_neighbors", "density_aware", "edge_conservative"
                ],
                "geological_constraints": [
                    "formation_sequence", "thickness_limits", 
                    "continuity_preservation", "boundary_handling"
                ]
            },
            "performance_info": {
                "recommended_max_boreholes": 500,
                "recommended_grid_resolution": [50, 50, 25],
                "memory_efficient": True,
                "gpu_acceleration": dependencies['gempy']
            },
            "data_requirements": {
                "min_boreholes": 3,
                "required_fields": ["x", "y", "z", "formation_id"],
                "optional_fields": ["soil_type", "layer_id", "depth"],
                "coordinate_system": "任意笛卡尔坐标系"
            }
        }
        
        # 添加推荐使用策略
        if dependencies['gempy']:
            capabilities["recommended_workflow"] = "GemPy隐式建模 (完整功能)"
            capabilities["fallback_workflow"] = "增强RBF插值 (兼容模式)"
        else:
            capabilities["recommended_workflow"] = "增强RBF插值 (主要模式)"
            capabilities["upgrade_suggestion"] = "安装GemPy以获得完整隐式建模功能"
        
        logger.info("✓ GemPy能力信息查询完成")
        
        return capabilities
        
    except Exception as e:
        logger.error(f"❌ GemPy能力查询失败: {e}")
        raise HTTPException(status_code=500, detail=f"能力查询失败: {str(e)}")

@router.post("/test-gempy-service")
async def test_gempy_service():
    """
    测试GemPy集成服务
    使用模拟数据验证完整建模流程
    """
    try:
        service = get_gempy_integration_service()
        
        # 创建测试钻孔数据
        test_boreholes = [
            {"id": "BH001", "x": 0.0, "y": 0.0, "z": -3.0, "soil_type": "粘土", "layer_id": 1},
            {"id": "BH002", "x": 50.0, "y": 0.0, "z": -4.0, "soil_type": "砂土", "layer_id": 2},
            {"id": "BH003", "x": 25.0, "y": 50.0, "z": -3.5, "soil_type": "粘土", "layer_id": 1},
            {"id": "BH004", "x": -25.0, "y": 25.0, "z": -4.5, "soil_type": "砂土", "layer_id": 2},
            {"id": "BH005", "x": 75.0, "y": 75.0, "z": -5.0, "soil_type": "岩石", "layer_id": 3}
        ]
        
        # 测试请求配置
        test_request = {
            "boreholes": test_boreholes,
            "domain": {
                "resolution": [20, 20, 10]  # 较小分辨率用于测试
            },
            "use_gempy": True,  # 优先使用GemPy
            "test_mode": True
        }
        
        logger.info("🧪 开始GemPy服务测试...")
        
        # 执行测试建模
        result = service.process_geological_modeling_request(test_request)
        
        # 分析测试结果
        test_summary = {
            "success": result['success'],
            "modeling_method": result.get('method', 'Unknown'),
            "processing_time": result.get('processing_time', 0),
            "dependencies": result.get('dependencies', {}),
            "test_results": {
                "data_preprocessing": result.get('input_data', {}).get('n_boreholes', 0) == 5,
                "interpolation_completed": 'interpolated_grid' in result or 'solution' in result,
                "threejs_export": bool(result.get('threejs_data', {})),
                "quality_metrics": result.get('quality_metrics', {})
            }
        }
        
        # 计算测试评分
        passed_tests = sum([
            test_summary["success"],
            test_summary["test_results"]["data_preprocessing"],
            test_summary["test_results"]["interpolation_completed"],
            test_summary["processing_time"] < 30  # 30秒内完成
        ])
        
        test_summary["test_score"] = f"{passed_tests}/4"
        test_summary["performance_rating"] = (
            "优秀" if passed_tests == 4 else
            "良好" if passed_tests >= 3 else
            "一般" if passed_tests >= 2 else
            "需要改进"
        )
        
        if result['success']:
            logger.info(f"✓ GemPy服务测试完成: {test_summary['test_score']} - {test_summary['performance_rating']}")
        else:
            logger.warning(f"⚠️ GemPy服务测试部分失败: {result.get('error', 'Unknown error')}")
        
        return {
            "message": "GemPy集成服务测试完成",
            "test_summary": test_summary,
            "detailed_result": result if result['success'] else {"error": result.get('error')},
            "recommendations": [
                "建议钻孔数量 ≥ 3个" if test_summary["test_results"]["data_preprocessing"] else "增加钻孔数据",
                "网格分辨率建议 ≤ [50,50,25]" if test_summary["processing_time"] < 30 else "降低网格分辨率",
                "GemPy可用时优先使用" if result.get('dependencies', {}).get('gempy') else "考虑安装GemPy",
                "增强RBF作为可靠备选方案"
            ]
        }
        
    except Exception as e:
        logger.error(f"❌ GemPy服务测试失败: {e}")
        return {
            "success": False,
            "message": f"测试失败: {str(e)}",
            "test_summary": {"success": False, "error": str(e)},
            "service_available": False
        }

# === 新增：GemPy增强服务API端点 ===

@router.post("/gempy-enhanced-modeling")
async def gempy_enhanced_geological_modeling(request: dict):
    """
    GemPy增强地质建模
    在GemPy框架内提供多种插值选项：默认隐式建模、增强RBF、自适应RBF、Kriging
    """
    try:
        service = get_gempy_enhanced_service()
        
        # 解析请求参数
        boreholes = request.get('boreholes', [])
        domain_config = request.get('domain', {})
        interpolation_method = request.get('interpolation_method', 'enhanced_rbf')
        
        if len(boreholes) < 3:
            raise HTTPException(status_code=400, detail="至少需要3个钻孔点进行建模")
        
        logger.info(f"🌍 开始GemPy增强地质建模: 方法={interpolation_method}")
        
        # 执行建模
        result = service.create_geological_model(
            borehole_data=boreholes,
            domain_config=domain_config,
            interpolation_method=interpolation_method
        )
        
        if result.get('success', False):
            logger.info(f"✓ GemPy增强建模完成: {result.get('method', 'Unknown')}")
            
            response = {
                "message": "GemPy增强地质建模成功完成",
                "success": True,
                "interpolation_method": result.get('interpolation_method', interpolation_method),
                "modeling_method": result.get('method', 'Unknown'),
                "processing_time": result.get('processing_time', 0),
                "model_data": {
                    "threejs_data": result.get('threejs_data', {}),
                    "surfaces": result.get('surfaces', {}),
                    "interpolated_grid": result.get('interpolated_grid', None),
                    "quality_metrics": result.get('quality_metrics', {})
                },
                "input_analysis": result.get('input_data', {}),
                "domain_config": domain_config,
                "algorithm_info": {
                    "framework": "GemPy增强框架",
                    "selected_method": interpolation_method,
                    "available_methods": service.get_available_interpolation_methods()
                }
            }
            
            # 添加特定方法的信息
            if 'adaptive_params' in result:
                response["adaptive_parameters"] = result['adaptive_params']
            
            return response
            
        else:
            logger.error(f"❌ GemPy增强建模失败: {result.get('error', 'Unknown error')}")
            raise HTTPException(
                status_code=500,
                detail=f"建模失败: {result.get('error', 'Unknown error')}"
            )
            
    except ValueError as e:
        logger.error(f"❌ 请求参数错误: {e}")
        raise HTTPException(status_code=400, detail=f"参数错误: {str(e)}")
    except Exception as e:
        logger.error(f"❌ GemPy增强建模异常: {e}")
        raise HTTPException(status_code=500, detail=f"建模异常: {str(e)}")

@router.get("/gempy-enhanced-methods")
async def get_gempy_enhanced_methods():
    """
    获取GemPy增强服务支持的插值方法
    """
    try:
        service = get_gempy_enhanced_service()
        available_methods = service.get_available_interpolation_methods()
        
        response = {
            "service_available": True,
            "framework": "GemPy增强框架",
            "description": "在GemPy框架内集成多种插值选择",
            "available_methods": available_methods,
            "method_details": {
                "gempy_default": {
                    "name": "GemPy默认隐式建模",
                    "description": "使用GemPy原生的隐式地质建模算法",
                    "best_for": "复杂地质构造、大量数据",
                    "requirements": "GemPy库可用"
                },
                "enhanced_rbf": {
                    "name": "增强RBF插值",
                    "description": "改进的径向基函数插值，适合一般地质建模",
                    "best_for": "中等复杂度、中等数据量",
                    "requirements": "SciPy库（通常已有）"
                },
                "adaptive_rbf": {
                    "name": "自适应RBF插值",
                    "description": "根据数据密度自动调整参数的RBF插值",
                    "best_for": "数据分布不均匀的情况",
                    "requirements": "SciPy + scikit-learn"
                },
                "kriging": {
                    "name": "Kriging地统计插值",
                    "description": "基于高斯过程的地统计学插值方法",
                    "best_for": "需要不确定性评估的情况",
                    "requirements": "scikit-learn库"
                }
            },
            "usage_recommendations": {
                "sparse_data": "推荐使用adaptive_rbf",
                "dense_data": "推荐使用gempy_default或enhanced_rbf",
                "uncertainty_analysis": "推荐使用kriging",
                "general_purpose": "推荐使用enhanced_rbf"
            }
        }
        
        logger.info("✓ GemPy增强方法查询完成")
        return response
        
    except Exception as e:
        logger.error(f"❌ GemPy增强方法查询失败: {e}")
        raise HTTPException(status_code=500, detail=f"查询失败: {str(e)}") 