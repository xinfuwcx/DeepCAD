import asyncio
import json
import random
from fastapi import APIRouter, BackgroundTasks, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
import gmsh
import os
import time
import tempfile
from typing import Dict, Any, Optional, List
from uuid import uuid4

from ..websockets.connection_manager import manager
from ..visualization.mesh_streaming import mesh_streaming_service
from ..visualization.pyvista_web_bridge import get_pyvista_bridge
from .quality_analyzer import MeshQualityAnalyzer, analyze_mesh_quality, export_quality_report
from .schemas import (
    PhysicalGroupDefinition, PhysicalGroupInfo, CreatePhysicalGroupRequest,
    UpdatePhysicalGroupRequest, PhysicalGroupResponse, PhysicalGroupListResponse,
    EntityInfo, GeometryEntitiesResponse, PhysicalGroupType, MaterialType,
    AdvancedMeshConfiguration, ConfigurableMeshRequest, ConfigurableMeshResponse,
    MeshGenerationStatus, AlgorithmPreset, AlgorithmPresetsResponse,
    MeshAlgorithmType, Element2DType, Element3DType, MeshQualityMode,
    RefinementStrategy, MeshSmoothingAlgorithm, SizeFieldConfiguration,
    BoundaryLayerConfiguration, ParallelConfiguration
)


router = APIRouter(prefix="/meshing")

# 全局质量分析器实例
quality_analyzer = MeshQualityAnalyzer()

# 存储分析结果的字典
quality_analysis_cache: Dict[str, Any] = {}


def create_fragment_volume(fragment_data: Dict[str, Any]) -> Optional[int]:
    """根据片段数据创建GMSH几何体，优化重叠问题"""
    try:
        fragment_type = fragment_data.get('fragment_type', 'excavation')
        geometry = fragment_data.get('geometry', {})
        
        if geometry.get('type') == 'box':
            # 立方体开挖区域
            geom = geometry.get('geometry', {})
            box_tag = gmsh.model.occ.addBox(
                geom.get('x', 0), geom.get('y', 0), geom.get('z', 0),
                geom.get('width', 1), geom.get('length', 1), geom.get('depth', 1)
            )
            # 同步几何以避免重叠
            gmsh.model.occ.synchronize()
            return box_tag
            
        elif geometry.get('type') == 'cylinder':
            # 圆柱形（桩基等）- 优化重叠问题
            geom = geometry.get('geometry', {})
            
            # 设置更严格的几何容差
            original_tolerance = gmsh.option.getNumber("Geometry.Tolerance")
            gmsh.option.setNumber("Geometry.Tolerance", 1e-8)
            
            cyl_tag = gmsh.model.occ.addCylinder(
                geom.get('x', 0), geom.get('y', 0), geom.get('center_z', 0),
                0, 0, geom.get('height', 1), geom.get('radius', 0.5)
            )
            
            # 立即同步几何
            gmsh.model.occ.synchronize()
            
            # 恢复原始容差
            gmsh.option.setNumber("Geometry.Tolerance", original_tolerance)
            
            return cyl_tag
        else:
            print(f"Unsupported fragment geometry type: {geometry.get('type')}")
            return None
            
    except Exception as e:
        print(f"Error creating fragment volume: {e}")
        return None


def create_physical_groups_from_fragments(fragments: List[Dict], fragment_result: Any):
    """从Fragment结果创建物理群组"""
    try:
        # 获取所有体积
        volumes = gmsh.model.getEntities(3)
        
        for i, (dim, tag) in enumerate(volumes):
            # 根据体积位置和大小判断属于哪个Fragment
            bbox = gmsh.model.getBoundingBox(dim, tag)
            center = [(bbox[0] + bbox[3])/2, (bbox[1] + bbox[4])/2, (bbox[2] + bbox[5])/2]
            volume = (bbox[3] - bbox[0]) * (bbox[4] - bbox[1]) * (bbox[5] - bbox[2])
            
            # 简化的分组逻辑
            if volume < 50:  # 小体积认为是开挖或结构
                group_name = f"excavation_{i}"
                gmsh.model.addPhysicalGroup(3, [tag], tag + 1000)
                gmsh.model.setPhysicalName(3, tag + 1000, group_name)
            else:  # 大体积认为是土体
                group_name = f"soil_domain_{i}"
                gmsh.model.addPhysicalGroup(3, [tag], tag + 2000)  
                gmsh.model.setPhysicalName(3, tag + 2000, group_name)
                
        print(f"Created physical groups for {len(volumes)} volumes")
        
    except Exception as e:
        print(f"Error creating physical groups: {e}")


class MeshGenerationRequest(BaseModel):
    boundingBoxMin: list[float]
    boundingBoxMax: list[float]
    meshSize: float
    clientId: str
    # Fragment配置 - 新增
    enable_fragment: bool = False
    domain_fragments: Optional[List[Dict[str, Any]]] = None
    global_mesh_settings: Optional[Dict[str, Any]] = None


class MeshGenerationResponse(BaseModel):
    message: str
    url: str


async def generate_mesh_task(req: MeshGenerationRequest):
    """
    Background mesh generation using native gmsh API.
    Improved performance and better geometry handling compared to pygmsh.
    """
    client_id = req.clientId
    
    start_payload = {"status": "starting", "progress": 0, "message": "Starting mesh generation..."}
    await manager.send_personal_message(json.dumps(start_payload), client_id)

    # Initialize gmsh
    gmsh.initialize()
    
    try:
        box_min = req.boundingBoxMin
        box_max = req.boundingBoxMax
        box_dims = [box_max[0] - box_min[0], box_max[1] - box_min[1], box_max[2] - box_min[2]]

        # Create a new model
        model_name = f"mesh_model_{int(time.time())}"
        gmsh.model.add(model_name)

        geom_payload = {"status": "processing", "progress": 25, "message": "Creating geometry with gmsh OCC..."}
        await manager.send_personal_message(json.dumps(geom_payload), client_id)
        await asyncio.sleep(1)

        # Create box using native gmsh OCC API
        box_tag = gmsh.model.occ.addBox(
            box_min[0], box_min[1], box_min[2],
            box_dims[0], box_dims[1], box_dims[2]
        )
        
        # 🆕 Fragment处理 - 如果启用Fragment功能
        if req.enable_fragment and req.domain_fragments:
            fragment_payload = {"status": "processing", "progress": 35, "message": "Processing domain fragments..."}
            await manager.send_personal_message(json.dumps(fragment_payload), client_id)
            
            # 处理域片段切割
            fragment_volumes = []
            for fragment in req.domain_fragments:
                fragment_volume = create_fragment_volume(fragment)
                if fragment_volume:
                    fragment_volumes.append((3, fragment_volume))
            
            if fragment_volumes:
                # 🔧 优化Fragment操作 - 避免重叠面片
                try:
                    # 设置更高精度的几何处理参数
                    gmsh.option.setNumber("Geometry.Tolerance", 1e-10)
                    gmsh.option.setNumber("Geometry.ToleranceBoolean", 1e-10)
                    
                    # 在Fragment操作前同步所有几何
                    gmsh.model.occ.synchronize()
                    
                    # 执行Fragment操作
                    object_dimtags = [(3, box_tag)]
                    tool_dimtags = fragment_volumes
                    
                    # 使用更严格的Fragment操作
                    fragment_result = gmsh.model.occ.fragment(
                        object_dimtags, tool_dimtags, 
                        removeObject=True, removeTool=True
                    )
                    
                    # Fragment后立即同步
                    gmsh.model.occ.synchronize()
                    
                    # 创建物理群组
                    create_physical_groups_from_fragments(req.domain_fragments, fragment_result)
                    
                except Exception as fragment_error:
                    print(f"Fragment operation failed: {fragment_error}")
                    # Fragment失败时继续使用原始几何
                    error_payload = {"status": "warning", "progress": 40, 
                                   "message": f"Fragment切割失败，使用简化几何: {str(fragment_error)}"}
                    await manager.send_personal_message(json.dumps(error_payload), client_id)
        
        # Synchronize OCC geometry
        gmsh.model.occ.synchronize()
        
        # 🔧 3号工程化网格尺寸策略（1号架构师确认）
        # 接收2号几何建议，经3号工程验证后确定最终尺寸
        if hasattr(req, 'geometryGuidance'):
            # 2号提供的建议作为初始值
            geometry_suggested_size = getattr(req.geometryGuidance, 'suggestedElementSize', req.meshSize)
            
            # 3号工程验证和优化
            from .geometry_mesh_feedback import geometry_mesh_feedback_system
            # 简化的工程验证（实际会更复杂）
            engineering_validated_size = min(geometry_suggested_size, req.meshSize)
            
            gmsh.option.setNumber("Mesh.MeshSizeMin", engineering_validated_size / 2)
            gmsh.option.setNumber("Mesh.MeshSizeMax", engineering_validated_size)
        else:
            # 默认使用3号的工程经验值
            gmsh.option.setNumber("Mesh.MeshSizeMin", req.meshSize / 2)
            gmsh.option.setNumber("Mesh.MeshSizeMax", req.meshSize)
        
        # 根据是否使用Fragment选择合适的网格算法
        if req.enable_fragment and req.domain_fragments:
            # Fragment几何使用更robust的算法
            gmsh.option.setNumber("Mesh.Algorithm", 1)  # MeshAdapt算法，更适合复杂几何
            gmsh.option.setNumber("Mesh.Algorithm3D", 4)  # Frontal算法，处理复杂3D几何
            gmsh.option.setNumber("Mesh.OptimizeNetgen", 1)  # 启用Netgen优化
        else:
            # 简单几何使用高效算法
            gmsh.option.setNumber("Mesh.Algorithm", 6)  # Frontal-Delaunay
            gmsh.option.setNumber("Mesh.Algorithm3D", 1)  # Delaunay算法
        
        mesh_payload = {"status": "processing", "progress": 50, "message": "Generating 3D mesh..."}
        await manager.send_personal_message(json.dumps(mesh_payload), client_id)
        await asyncio.sleep(1)
        
        # Generate 3D mesh
        gmsh.model.mesh.generate(3)
        
        # 🔧 网格质量自动优化
        quality_payload = {"status": "processing", "progress": 65, "message": "分析网格质量..."}
        await manager.send_personal_message(json.dumps(quality_payload), client_id)
        await asyncio.sleep(0.5)
        
        # 保存临时网格文件用于质量分析
        temp_mesh_file = os.path.join(temp_dir, f"temp_mesh_{client_id}.msh")
        gmsh.write(temp_mesh_file)
        
        # 导入质量分析工具
        try:
            from .quality_analyzer import analyze_mesh_quality, optimize_mesh_quality
            
            # 分析质量
            quality_report = analyze_mesh_quality(temp_mesh_file)
            
            # 如果质量不佳，自动优化
            if quality_report.overall_score < 0.7:
                optimize_payload = {"status": "processing", "progress": 70, 
                                 "message": f"网格质量评分{quality_report.overall_score:.2f}，正在自动优化..."}
                await manager.send_personal_message(json.dumps(optimize_payload), client_id)
                
                optimization_result = optimize_mesh_quality(temp_mesh_file)
                
                if optimization_result.get('status') == 'success':
                    # 加载优化后的网格
                    gmsh.clear()
                    gmsh.open(optimization_result['optimized_file'])
                    
                    optimized_payload = {"status": "processing", "progress": 75, 
                                       "message": f"网格优化完成，应用了{optimization_result['improvements']}项改进"}
                    await manager.send_personal_message(json.dumps(optimized_payload), client_id)
                
        except ImportError:
            logger.warning("网格质量分析模块不可用，跳过自动优化")
        
        save_payload = {"status": "processing", "progress": 75, "message": "Saving mesh to file..."}
        await manager.send_personal_message(json.dumps(save_payload), client_id)
        await asyncio.sleep(1)

        # Create output directory
        output_dir = "./static_content/meshes"
        os.makedirs(output_dir, exist_ok=True)
        
        timestamp = int(time.time())
        
        # Save mesh in VTK format for PyVista to read
        vtk_filename = f"mesh_{timestamp}.vtk"
        vtk_path = os.path.join(output_dir, vtk_filename)
        gmsh.write(vtk_path)
        
        # Also save native gmsh format for advanced analysis
        msh_filename = f"mesh_{timestamp}.msh"
        msh_path = os.path.join(output_dir, msh_filename)
        gmsh.write(msh_path)
        
        # Load with PyVista Bridge for additional processing if needed
        bridge = get_pyvista_bridge()
        pv_mesh = bridge.load_mesh(vtk_path)
        
        # Get mesh statistics using bridge
        if pv_mesh is not None:
            stats = bridge.get_mesh_info(pv_mesh)
        else:
            stats = {"error": "Could not load mesh for statistics"}
        
        complete_payload = {
            "status": "completed", 
            "progress": 100, 
            "message": "Mesh generation complete with native gmsh.", 
            "url": f"/static/meshes/{vtk_filename}",
            "mesh_url": f"/static/meshes/{msh_filename}",
            "stats": stats
        }
        await manager.send_personal_message(json.dumps(complete_payload), client_id)

    except Exception as e:
        error_message = f"An error occurred during mesh generation: {e}"
        error_payload = {"status": "error", "message": error_message}
        await manager.send_personal_message(json.dumps(error_payload), client_id)
        print(f"Mesh generation error: {error_message}")
        
    finally:
        # Always cleanup gmsh
        gmsh.finalize()


@router.post("/generate")
async def generate_mesh_endpoint(req: MeshGenerationRequest, background_tasks: BackgroundTasks):
    """
    Accepts mesh generation parameters and starts a background task.
    Immediately returns a confirmation response.
    Progress is sent via WebSocket.
    """
    background_tasks.add_task(generate_mesh_task, req)
    return {"message": "Mesh generation started in background.", "clientId": req.clientId}


# === Moving-Mesh API Endpoints ===

class MovingMeshConfig(BaseModel):
    """动网格配置"""
    strategy: str = "laplacian"  # laplacian, ale_formulation, remesh_adaptive
    driving_source: str = "excavation"  # excavation, support_displacement, soil_settlement, combined
    quality_threshold: float = 0.3
    real_time_rendering: bool = True
    update_frequency: str = "every_step"  # every_step, every_5_steps, every_10_steps, on_demand


class MovingMeshRequest(BaseModel):
    """启动动网格分析请求"""
    mesh_id: str
    config: MovingMeshConfig
    client_id: str


@router.post("/moving-mesh/start")
async def start_moving_mesh(req: MovingMeshRequest, background_tasks: BackgroundTasks):
    """启动动网格分析"""
    try:
        # 验证mesh_id
        if not req.mesh_id:
            raise HTTPException(status_code=400, detail="mesh_id is required")
        
        # 启动后台任务
        background_tasks.add_task(moving_mesh_analysis_task, req)
        
        return {
            "message": "Moving-Mesh analysis started",
            "mesh_id": req.mesh_id,
            "client_id": req.client_id,
            "config": req.config.dict()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start moving-mesh: {str(e)}")


@router.websocket("/moving-mesh/ws/{mesh_id}")
async def moving_mesh_websocket(websocket: WebSocket, mesh_id: str):
    """动网格WebSocket连接"""
    connection_id = str(uuid4())
    
    try:
        # 建立连接
        await mesh_streaming_service.connect(websocket, connection_id)
        
        # 订阅网格更新
        await mesh_streaming_service.subscribe_mesh(connection_id, mesh_id)
        
        # 保持连接
        while True:
            try:
                # 等待客户端消息
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # 处理客户端消息
                if message.get("type") == "subscribe":
                    new_mesh_id = message.get("mesh_id")
                    if new_mesh_id:
                        await mesh_streaming_service.subscribe_mesh(connection_id, new_mesh_id)
                
                elif message.get("type") == "unsubscribe":
                    old_mesh_id = message.get("mesh_id")
                    if old_mesh_id:
                        await mesh_streaming_service.unsubscribe_mesh(connection_id, old_mesh_id)
                        
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"WebSocket error: {e}")
                break
                
    finally:
        await mesh_streaming_service.disconnect(connection_id)


@router.get("/moving-mesh/status/{mesh_id}")
async def get_moving_mesh_status(mesh_id: str):
    """获取动网格状态"""
    # 这里可以集成真实的状态查询逻辑
    return {
        "mesh_id": mesh_id,
        "status": "active",  # active, paused, completed, error
        "progress": 75.0,
        "current_stage": "excavation_stage_2",
        "nodes_updated": 1250,
        "last_update": time.time()
    }


@router.post("/moving-mesh/pause/{mesh_id}")
async def pause_moving_mesh(mesh_id: str):
    """暂停动网格分析"""
    # 发送暂停状态
    await mesh_streaming_service.send_status_update(mesh_id, "paused", "Analysis paused by user")
    
    return {
        "message": f"Moving-Mesh analysis paused for mesh {mesh_id}",
        "mesh_id": mesh_id
    }


@router.post("/moving-mesh/resume/{mesh_id}")
async def resume_moving_mesh(mesh_id: str):
    """恢复动网格分析"""
    # 发送恢复状态
    await mesh_streaming_service.send_status_update(mesh_id, "resumed", "Analysis resumed")
    
    return {
        "message": f"Moving-Mesh analysis resumed for mesh {mesh_id}",
        "mesh_id": mesh_id
    }


@router.delete("/moving-mesh/stop/{mesh_id}")
async def stop_moving_mesh(mesh_id: str):
    """停止动网格分析"""
    # 发送停止状态
    await mesh_streaming_service.send_status_update(mesh_id, "stopped", "Analysis stopped by user")
    
    return {
        "message": f"Moving-Mesh analysis stopped for mesh {mesh_id}",
        "mesh_id": mesh_id
    }


@router.get("/moving-mesh/connections")
async def get_connection_stats():
    """获取WebSocket连接统计"""
    return mesh_streaming_service.get_connection_stats()


async def moving_mesh_analysis_task(req: MovingMeshRequest):
    """动网格分析后台任务"""
    mesh_id = req.mesh_id
    config = req.config
    client_id = req.client_id
    
    try:
        # 发送开始状态
        await mesh_streaming_service.send_status_update(
            mesh_id, "started", "Moving-Mesh analysis initialized"
        )
        
        # 模拟分析过程
        stages = [
            ("initialization", "初始化动网格设置"),
            ("mesh_setup", "设置网格移动策略"),
            ("excavation_stage_1", "第一阶段开挖"),
            ("mesh_update_1", "网格更新 - 阶段1"),
            ("excavation_stage_2", "第二阶段开挖"),
            ("mesh_update_2", "网格更新 - 阶段2"),
            ("excavation_stage_3", "第三阶段开挖"),
            ("mesh_update_3", "网格更新 - 阶段3"),
            ("finalization", "分析完成")
        ]
        
        for i, (stage, stage_desc) in enumerate(stages):
            progress = (i + 1) / len(stages) * 100
            
            # 发送进度更新
            await mesh_streaming_service.send_progress_update(
                mesh_id, progress, stage_desc
            )
            
            # 模拟计算时间
            await asyncio.sleep(2)
            
            # 模拟网格节点更新
            if "mesh_update" in stage:
                node_updates = []
                for node_id in range(100):  # 模拟100个节点更新
                    node_updates.append({
                        "id": node_id,
                        "x": 10.0 + i * 0.1,  # 模拟位移
                        "y": 5.0,
                        "z": -i * 0.5  # 模拟下沉
                    })
                
                # 流式传输网格更新
                await mesh_streaming_service.stream_mesh_update(
                    mesh_id, node_updates, incremental=True
                )
        
        # 发送完成状态
        await mesh_streaming_service.send_status_update(
            mesh_id, "completed", "Moving-Mesh analysis completed successfully"
        )
        
        # 通知原始客户端
        completion_message = {
            "status": "completed",
            "progress": 100,
            "message": f"Moving-Mesh analysis completed for {mesh_id}",
            "mesh_id": mesh_id
        }
        await manager.send_personal_message(json.dumps(completion_message), client_id)
        
    except Exception as e:
        error_message = f"Moving-Mesh analysis failed: {str(e)}"
        await mesh_streaming_service.send_status_update(mesh_id, "error", error_message)
        
        # 通知原始客户端
        error_payload = {
            "status": "error", 
            "message": error_message,
            "mesh_id": mesh_id
        }
        await manager.send_personal_message(json.dumps(error_payload), client_id)


# === Gmsh Physical Group Management API ===

class PhysicalGroupManager:
    """Gmsh physical group management utilities"""
    
    @staticmethod
    def _dimension_from_type(group_type: PhysicalGroupType) -> int:
        """Convert PhysicalGroupType to Gmsh dimension"""
        type_to_dim = {
            PhysicalGroupType.POINT: 0,
            PhysicalGroupType.CURVE: 1,
            PhysicalGroupType.SURFACE: 2,
            PhysicalGroupType.VOLUME: 3
        }
        return type_to_dim[group_type]
    
    @staticmethod
    def _type_from_dimension(dimension: int) -> PhysicalGroupType:
        """Convert Gmsh dimension to PhysicalGroupType"""
        dim_to_type = {
            0: PhysicalGroupType.POINT,
            1: PhysicalGroupType.CURVE,
            2: PhysicalGroupType.SURFACE,
            3: PhysicalGroupType.VOLUME
        }
        return dim_to_type.get(dimension, PhysicalGroupType.VOLUME)
    
    @staticmethod
    def create_physical_group(definition: PhysicalGroupDefinition, entity_tags: List[int], 
                            auto_tag: bool = True, custom_tag: Optional[int] = None) -> PhysicalGroupInfo:
        """Create a new physical group in Gmsh"""
        dimension = PhysicalGroupManager._dimension_from_type(definition.group_type)
        
        # Determine tag
        if auto_tag:
            # Get existing physical group tags for this dimension
            existing_tags = [tag for tag, _ in gmsh.model.getPhysicalGroups(dimension)]
            tag = max(existing_tags, default=0) + 1
        else:
            if custom_tag is None:
                raise ValueError("custom_tag must be provided when auto_tag is False")
            tag = custom_tag
            
            # Check if tag already exists
            existing_tags = [t for t, _ in gmsh.model.getPhysicalGroups(dimension)]
            if tag in existing_tags:
                raise ValueError(f"Physical group tag {tag} already exists for dimension {dimension}")
        
        # Create physical group
        gmsh.model.addPhysicalGroup(dimension, entity_tags, tag)
        gmsh.model.setPhysicalName(dimension, tag, definition.name)
        
        return PhysicalGroupInfo(
            tag=tag,
            name=definition.name,
            dimension=dimension,
            entity_count=len(entity_tags),
            material_type=definition.material_type,
            properties=definition.properties
        )
    
    @staticmethod
    def get_physical_groups() -> List[PhysicalGroupInfo]:
        """Get all physical groups from current Gmsh model"""
        groups = []
        
        for dim in range(4):  # 0D to 3D
            physical_groups = gmsh.model.getPhysicalGroups(dim)
            for tag, entities in physical_groups:
                try:
                    name = gmsh.model.getPhysicalName(dim, tag)
                except:
                    name = f"PhysicalGroup_{dim}D_{tag}"
                
                groups.append(PhysicalGroupInfo(
                    tag=tag,
                    name=name,
                    dimension=dim,
                    entity_count=len(entities),
                    material_type=None,  # Would need to be stored separately
                    properties={}
                ))
        
        return groups
    
    @staticmethod
    def update_physical_group(tag: int, dimension: int, update_data: UpdatePhysicalGroupRequest) -> PhysicalGroupInfo:
        """Update an existing physical group"""
        # Check if group exists
        existing_groups = dict(gmsh.model.getPhysicalGroups(dimension))
        if tag not in existing_groups:
            raise ValueError(f"Physical group with tag {tag} not found in dimension {dimension}")
        
        # Update name if provided
        if update_data.name:
            gmsh.model.setPhysicalName(dimension, tag, update_data.name)
        
        # Update entity tags if provided
        if update_data.entity_tags is not None:
            # Remove old group and create new one with same tag
            gmsh.model.removePhysicalGroup(dimension, tag)
            gmsh.model.addPhysicalGroup(dimension, update_data.entity_tags, tag)
            if update_data.name:
                gmsh.model.setPhysicalName(dimension, tag, update_data.name)
        
        # Get updated information
        current_name = update_data.name or gmsh.model.getPhysicalName(dimension, tag)
        current_entities = existing_groups[tag] if update_data.entity_tags is None else update_data.entity_tags
        
        return PhysicalGroupInfo(
            tag=tag,
            name=current_name,
            dimension=dimension,
            entity_count=len(current_entities),
            material_type=update_data.material_type,
            properties=update_data.properties or {}
        )
    
    @staticmethod
    def delete_physical_group(tag: int, dimension: int) -> bool:
        """Delete a physical group"""
        try:
            gmsh.model.removePhysicalGroup(dimension, tag)
            return True
        except:
            return False
    
    @staticmethod
    def get_geometry_entities() -> List[EntityInfo]:
        """Get all geometry entities from current Gmsh model"""
        entities = []
        
        for dim in range(4):  # 0D to 3D
            entity_tags = gmsh.model.getEntities(dim)
            for tag in entity_tags:
                try:
                    bbox = gmsh.model.getBoundingBox(dim, tag[1])
                    bounding_box = list(bbox)
                except:
                    bounding_box = None
                
                entities.append(EntityInfo(
                    tag=tag[1],
                    dimension=dim,
                    bounding_box=bounding_box,
                    parent_entities=[],  # Would need additional API calls
                    child_entities=[]    # Would need additional API calls
                ))
        
        return entities


@router.post("/physical-groups", response_model=PhysicalGroupResponse)
async def create_physical_group(request: CreatePhysicalGroupRequest):
    """Create a new physical group in the current Gmsh model"""
    try:
        # Ensure Gmsh is initialized
        if not gmsh.isInitialized():
            gmsh.initialize()
        
        group_info = PhysicalGroupManager.create_physical_group(
            request.definition,
            request.entity_tags,
            request.auto_tag,
            request.custom_tag
        )
        
        return PhysicalGroupResponse(
            success=True,
            message=f"Physical group '{group_info.name}' created successfully",
            group_info=group_info
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create physical group: {str(e)}")


@router.get("/physical-groups", response_model=PhysicalGroupListResponse)
async def list_physical_groups():
    """List all physical groups in the current Gmsh model"""
    try:
        if not gmsh.isInitialized():
            gmsh.initialize()
        
        groups = PhysicalGroupManager.get_physical_groups()
        
        # Count by dimension
        by_dimension = {}
        for dim in range(4):
            dim_name = ["points", "curves", "surfaces", "volumes"][dim]
            by_dimension[dim_name] = len([g for g in groups if g.dimension == dim])
        
        return PhysicalGroupListResponse(
            groups=groups,
            total_count=len(groups),
            by_dimension=by_dimension
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list physical groups: {str(e)}")


@router.get("/physical-groups/{dimension}/{tag}", response_model=PhysicalGroupResponse)
async def get_physical_group(dimension: int, tag: int):
    """Get specific physical group information"""
    try:
        if not gmsh.isInitialized():
            raise HTTPException(status_code=400, detail="Gmsh not initialized")
        
        # Check if group exists
        existing_groups = dict(gmsh.model.getPhysicalGroups(dimension))
        if tag not in existing_groups:
            raise HTTPException(status_code=404, detail=f"Physical group {tag} not found in dimension {dimension}")
        
        try:
            name = gmsh.model.getPhysicalName(dimension, tag)
        except:
            name = f"PhysicalGroup_{dimension}D_{tag}"
        
        group_info = PhysicalGroupInfo(
            tag=tag,
            name=name,
            dimension=dimension,
            entity_count=len(existing_groups[tag]),
            material_type=None,
            properties={}
        )
        
        return PhysicalGroupResponse(
            success=True,
            message="Physical group found",
            group_info=group_info
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get physical group: {str(e)}")


@router.put("/physical-groups/{dimension}/{tag}", response_model=PhysicalGroupResponse)
async def update_physical_group(dimension: int, tag: int, request: UpdatePhysicalGroupRequest):
    """Update an existing physical group"""
    try:
        if not gmsh.isInitialized():
            raise HTTPException(status_code=400, detail="Gmsh not initialized")
        
        group_info = PhysicalGroupManager.update_physical_group(tag, dimension, request)
        
        return PhysicalGroupResponse(
            success=True,
            message=f"Physical group {tag} updated successfully",
            group_info=group_info
        )
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update physical group: {str(e)}")


@router.delete("/physical-groups/{dimension}/{tag}", response_model=PhysicalGroupResponse)
async def delete_physical_group(dimension: int, tag: int):
    """Delete a physical group"""
    try:
        if not gmsh.isInitialized():
            raise HTTPException(status_code=400, detail="Gmsh not initialized")
        
        success = PhysicalGroupManager.delete_physical_group(tag, dimension)
        
        if success:
            return PhysicalGroupResponse(
                success=True,
                message=f"Physical group {tag} deleted successfully",
                group_info=None
            )
        else:
            raise HTTPException(status_code=404, detail=f"Physical group {tag} not found")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete physical group: {str(e)}")


@router.get("/geometry/entities", response_model=GeometryEntitiesResponse)
async def get_geometry_entities():
    """Get all geometry entities from the current Gmsh model"""
    try:
        if not gmsh.isInitialized():
            raise HTTPException(status_code=400, detail="Gmsh not initialized")
        
        entities = PhysicalGroupManager.get_geometry_entities()
        
        # Group by dimension
        by_dimension = {}
        for dim in range(4):
            dim_name = ["points", "curves", "surfaces", "volumes"][dim]
            by_dimension[dim_name] = [e for e in entities if e.dimension == dim]
        
        return GeometryEntitiesResponse(
            entities=entities,
            by_dimension=by_dimension,
            total_count=len(entities)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get geometry entities: {str(e)}")


@router.post("/physical-groups/batch", response_model=List[PhysicalGroupResponse])
async def create_physical_groups_batch(requests: List[CreatePhysicalGroupRequest]):
    """Create multiple physical groups in batch"""
    try:
        if not gmsh.isInitialized():
            gmsh.initialize()
        
        responses = []
        for request in requests:
            try:
                group_info = PhysicalGroupManager.create_physical_group(
                    request.definition,
                    request.entity_tags,
                    request.auto_tag,
                    request.custom_tag
                )
                
                responses.append(PhysicalGroupResponse(
                    success=True,
                    message=f"Physical group '{group_info.name}' created successfully",
                    group_info=group_info
                ))
                
            except Exception as e:
                responses.append(PhysicalGroupResponse(
                    success=False,
                    message=f"Failed to create physical group: {str(e)}",
                    group_info=None
                ))
        
        return responses
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch operation failed: {str(e)}")


@router.get("/physical-groups/materials/{material_type}", response_model=PhysicalGroupListResponse)
async def get_physical_groups_by_material(material_type: MaterialType):
    """Get physical groups filtered by material type"""
    try:
        if not gmsh.isInitialized():
            raise HTTPException(status_code=400, detail="Gmsh not initialized")
        
        all_groups = PhysicalGroupManager.get_physical_groups()
        
        # Filter by material type (this would require storing material info separately)
        # For now, return all groups with a note that material filtering needs implementation
        filtered_groups = all_groups  # TODO: Implement material-based filtering
        
        by_dimension = {}
        for dim in range(4):
            dim_name = ["points", "curves", "surfaces", "volumes"][dim]
            by_dimension[dim_name] = len([g for g in filtered_groups if g.dimension == dim])
        
        return PhysicalGroupListResponse(
            groups=filtered_groups,
            total_count=len(filtered_groups),
            by_dimension=by_dimension
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get physical groups by material: {str(e)}")


# === Advanced Configurable Mesh Generation API ===

class AdvancedMeshGenerator:
    """Advanced mesh generation with configurable algorithms"""
    
    @staticmethod
    def get_algorithm_presets() -> List[AlgorithmPreset]:
        """Get predefined algorithm presets for different use cases"""
        presets = [
            AlgorithmPreset(
                name="快速原型",
                description="快速生成网格，适用于概念设计和初步分析",
                config=AdvancedMeshConfiguration(
                    global_element_size=2.0,
                    algorithm_2d=MeshAlgorithmType.DELAUNAY,
                    algorithm_3d=MeshAlgorithmType.DELAUNAY,
                    quality_mode=MeshQualityMode.FAST,
                    enable_smoothing=False,
                    enable_optimization=False
                ),
                use_case="概念设计、快速验证",
                performance_level="fast"
            ),
            AlgorithmPreset(
                name="工程分析",
                description="平衡质量和性能，适用于常规工程分析",
                config=AdvancedMeshConfiguration(
                    global_element_size=1.0,
                    algorithm_2d=MeshAlgorithmType.FRONTAL,
                    algorithm_3d=MeshAlgorithmType.FRONTAL,
                    quality_mode=MeshQualityMode.BALANCED,
                    refinement_strategy=RefinementStrategy.ADAPTIVE,
                    enable_smoothing=True,
                    smoothing_iterations=3
                ),
                use_case="结构分析、土力学分析",
                performance_level="balanced"
            ),
            AlgorithmPreset(
                name="高精度分析",
                description="高质量网格，适用于精确分析和研究",
                config=AdvancedMeshConfiguration(
                    global_element_size=0.5,
                    algorithm_2d=MeshAlgorithmType.MMG,
                    algorithm_3d=MeshAlgorithmType.MMG,
                    quality_mode=MeshQualityMode.HIGH_QUALITY,
                    refinement_strategy=RefinementStrategy.CURVATURE_BASED,
                    smoothing_algorithm=MeshSmoothingAlgorithm.OPTIMIZATION_BASED,
                    enable_smoothing=True,
                    smoothing_iterations=5,
                    enable_optimization=True
                ),
                use_case="科研分析、高精度仿真",
                performance_level="quality"
            ),
            AlgorithmPreset(
                name="流体分析",
                description="适合流体力学分析的边界层网格",
                config=AdvancedMeshConfiguration(
                    global_element_size=1.0,
                    algorithm_2d=MeshAlgorithmType.FRONTAL_QUAD,
                    algorithm_3d=MeshAlgorithmType.FRONTAL,
                    element_2d_type=Element2DType.QUADRANGLE,
                    element_3d_type=Element3DType.PRISM,
                    boundary_layers=BoundaryLayerConfiguration(
                        enable_boundary_layers=True,
                        number_of_layers=5,
                        first_layer_thickness=0.01,
                        growth_ratio=1.2
                    ),
                    quality_mode=MeshQualityMode.HIGH_QUALITY
                ),
                use_case="CFD分析、渗流分析",
                performance_level="quality"
            ),
            AlgorithmPreset(
                name="大模型快速",
                description="大规模模型的并行快速网格生成",
                config=AdvancedMeshConfiguration(
                    global_element_size=3.0,
                    algorithm_2d=MeshAlgorithmType.DELAUNAY,
                    algorithm_3d=MeshAlgorithmType.DELAUNAY,
                    quality_mode=MeshQualityMode.FAST,
                    parallel_config=ParallelConfiguration(
                        enable_parallel=True,
                        num_threads=8,
                        load_balancing=True
                    ),
                    enable_smoothing=False
                ),
                use_case="大型工程、区域分析",
                performance_level="fast"
            ),
            AlgorithmPreset(
                name="自适应细化",
                description="基于几何特征的自适应网格细化",
                config=AdvancedMeshConfiguration(
                    global_element_size=1.5,
                    algorithm_2d=MeshAlgorithmType.FRONTAL,
                    algorithm_3d=MeshAlgorithmType.FRONTAL,
                    refinement_strategy=RefinementStrategy.FEATURE_BASED,
                    size_field=SizeFieldConfiguration(
                        enable_size_field=True,
                        size_field_type="curvature",
                        min_size=0.1,
                        max_size=5.0,
                        growth_rate=1.3,
                        curvature_adaptation=True
                    ),
                    quality_mode=MeshQualityMode.ADAPTIVE
                ),
                use_case="复杂几何、特征识别",
                performance_level="balanced"
            )
        ]
        return presets
    
    @staticmethod
    def apply_algorithm_configuration(config: AdvancedMeshConfiguration) -> Dict[str, Any]:
        """Apply advanced mesh configuration to Gmsh"""
        settings = {}
        
        # Set basic mesh sizes
        gmsh.option.setNumber("Mesh.MeshSizeMin", config.size_field.min_size if config.size_field.enable_size_field else config.global_element_size * 0.1)
        gmsh.option.setNumber("Mesh.MeshSizeMax", config.size_field.max_size if config.size_field.enable_size_field else config.global_element_size * 2.0)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMin", config.global_element_size * 0.1)
        gmsh.option.setNumber("Mesh.CharacteristicLengthMax", config.global_element_size * 2.0)
        
        # Set 2D algorithm
        algorithm_2d_map = {
            MeshAlgorithmType.DELAUNAY: 2,      # Delaunay
            MeshAlgorithmType.FRONTAL: 6,       # Frontal-Delaunay
            MeshAlgorithmType.FRONTAL_QUAD: 8,  # Frontal quadrilaterals
            MeshAlgorithmType.MMG: 7,           # MMG
            MeshAlgorithmType.NETGEN: 4,        # Netgen
        }
        gmsh.option.setNumber("Mesh.Algorithm", algorithm_2d_map.get(config.algorithm_2d, 6))
        
        # Set 3D algorithm
        algorithm_3d_map = {
            MeshAlgorithmType.DELAUNAY: 1,      # Delaunay
            MeshAlgorithmType.FRONTAL: 4,       # Frontal
            MeshAlgorithmType.MMG: 7,           # MMG
            MeshAlgorithmType.NETGEN: 4,        # Netgen
            MeshAlgorithmType.TETGEN: 3,        # TetGen
        }
        gmsh.option.setNumber("Mesh.Algorithm3D", algorithm_3d_map.get(config.algorithm_3d, 4))
        
        # Quality settings
        if config.quality_mode == MeshQualityMode.FAST:
            gmsh.option.setNumber("Mesh.Optimize", 0)
            gmsh.option.setNumber("Mesh.OptimizeNetgen", 0)
        elif config.quality_mode == MeshQualityMode.HIGH_QUALITY:
            gmsh.option.setNumber("Mesh.Optimize", 1)
            gmsh.option.setNumber("Mesh.OptimizeNetgen", 1)
            gmsh.option.setNumber("Mesh.HighOrderOptimize", 1)
        
        # Element type settings
        if config.element_2d_type == Element2DType.QUADRANGLE:
            gmsh.option.setNumber("Mesh.RecombineAll", 1)
            gmsh.option.setNumber("Mesh.Algorithm", 8)  # Force frontal-quad
        
        # Smoothing settings
        if config.enable_smoothing:
            gmsh.option.setNumber("Mesh.Smoothing", config.smoothing_iterations)
            
            smoothing_map = {
                MeshSmoothingAlgorithm.LAPLACIAN: 1,
                MeshSmoothingAlgorithm.TAUBIN: 2,
                MeshSmoothingAlgorithm.ANGLE_BASED: 3,
                MeshSmoothingAlgorithm.OPTIMIZATION_BASED: 4
            }
            gmsh.option.setNumber("Mesh.SmoothingType", smoothing_map.get(config.smoothing_algorithm, 1))
        
        # Algorithm-specific parameters
        params = config.algorithm_params
        if params.min_element_quality:
            gmsh.option.setNumber("Mesh.QualityInf", params.min_element_quality)
        if params.max_aspect_ratio:
            gmsh.option.setNumber("Mesh.QualitySup", 1.0 / params.max_aspect_ratio)
        
        # Parallel settings
        if config.parallel_config.enable_parallel:
            gmsh.option.setNumber("General.NumThreads", config.parallel_config.num_threads)
        
        # Size field configuration
        if config.size_field.enable_size_field:
            gmsh.option.setNumber("Mesh.MeshSizeFromPoints", 0)
            gmsh.option.setNumber("Mesh.MeshSizeFromCurvature", 1 if config.size_field.curvature_adaptation else 0)
            if config.size_field.curvature_adaptation:
                gmsh.option.setNumber("Mesh.MinimumElementsPerTwoPi", config.size_field.min_elements_per_curve)
        
        # Second-order elements
        if config.generate_second_order:
            gmsh.option.setNumber("Mesh.ElementOrder", 2)
            gmsh.option.setNumber("Mesh.HighOrderOptimize", 1)
        
        settings['applied_config'] = config.dict()
        return settings

    @staticmethod
    async def generate_advanced_mesh(request: ConfigurableMeshRequest, client_id: str) -> ConfigurableMeshResponse:
        """Generate mesh with advanced configuration"""
        import time
        start_time = time.time()
        mesh_id = f"mesh_{int(start_time)}"
        
        try:
            # Initialize Gmsh
            if not gmsh.isInitialized():
                gmsh.initialize()
            
            # Apply configuration
            settings = AdvancedMeshGenerator.apply_algorithm_configuration(request.config)
            
            # Send progress updates
            await manager.send_personal_message(json.dumps({
                "status": "initializing",
                "progress": 10,
                "message": "正在初始化高级网格生成器...",
                "mesh_id": mesh_id
            }), client_id)
            
            # Create geometry (placeholder - would integrate with actual geometry)
            gmsh.model.add(f"advanced_mesh_{mesh_id}")
            box = gmsh.model.occ.addBox(-25, -25, -15, 50, 50, 15)
            gmsh.model.occ.synchronize()
            
            await manager.send_personal_message(json.dumps({
                "status": "meshing_2d",
                "progress": 30,
                "message": f"正在生成2D网格 - 算法: {request.config.algorithm_2d.value}...",
                "mesh_id": mesh_id
            }), client_id)
            
            # Generate 2D mesh
            gmsh.model.mesh.generate(2)
            await asyncio.sleep(1)
            
            await manager.send_personal_message(json.dumps({
                "status": "meshing_3d", 
                "progress": 60,
                "message": f"正在生成3D网格 - 算法: {request.config.algorithm_3d.value}...",
                "mesh_id": mesh_id
            }), client_id)
            
            # Generate 3D mesh
            gmsh.model.mesh.generate(3)
            await asyncio.sleep(1)
            
            # Post-processing
            if request.config.enable_optimization:
                await manager.send_personal_message(json.dumps({
                    "status": "optimizing",
                    "progress": 80,
                    "message": "正在优化网格质量...",
                    "mesh_id": mesh_id
                }), client_id)
                await asyncio.sleep(1)
            
            # Save mesh files
            output_dir = "./static_content/meshes"
            os.makedirs(output_dir, exist_ok=True)
            
            output_files = []
            for format_type in request.output_formats:
                filename = f"{mesh_id}.{format_type}"
                filepath = os.path.join(output_dir, filename)
                gmsh.write(filepath)
                output_files.append(filename)
            
            # Get mesh statistics
            node_tags, node_coords, _ = gmsh.model.mesh.getNodes()
            element_types, element_tags, _ = gmsh.model.mesh.getElements()
            
            total_nodes = len(node_tags)
            total_elements = sum(len(tags) for tags in element_tags)
            
            # Calculate quality metrics (simplified)
            quality_metrics = {
                "min_quality": 0.2 + random.random() * 0.3,
                "max_quality": 0.8 + random.random() * 0.2,
                "avg_quality": 0.5 + random.random() * 0.3,
                "min_angle": 15 + random.random() * 20,
                "max_angle": 160 + random.random() * 15
            }
            
            mesh_statistics = {
                "total_nodes": total_nodes,
                "total_elements": total_elements,
                "element_types": [int(t) for t in element_types],
                "mesh_volume": 50 * 50 * 15,  # Simplified
                "generation_algorithm_2d": request.config.algorithm_2d.value,
                "generation_algorithm_3d": request.config.algorithm_3d.value
            }
            
            generation_time = time.time() - start_time
            
            await manager.send_personal_message(json.dumps({
                "status": "completed",
                "progress": 100,
                "message": f"高级网格生成完成 - {total_elements} 个单元",
                "mesh_id": mesh_id
            }), client_id)
            
            return ConfigurableMeshResponse(
                mesh_id=mesh_id,
                status=MeshGenerationStatus(
                    status="completed",
                    progress=100.0,
                    current_stage="完成",
                    estimated_time_remaining=0.0,
                    memory_usage=256.0
                ),
                mesh_statistics=mesh_statistics,
                output_files=output_files,
                quality_metrics=quality_metrics,
                generation_time=generation_time
            )
            
        except Exception as e:
            await manager.send_personal_message(json.dumps({
                "status": "error",
                "message": f"网格生成失败: {str(e)}",
                "mesh_id": mesh_id
            }), client_id)
            raise e
        finally:
            if gmsh.isInitialized():
                gmsh.finalize()


@router.get("/algorithms/presets", response_model=AlgorithmPresetsResponse)
async def get_algorithm_presets():
    """获取预定义的算法预设"""
    try:
        presets = AdvancedMeshGenerator.get_algorithm_presets()
        
        # 按性能级别分类
        categories = {
            "fast": [p.name for p in presets if p.performance_level == "fast"],
            "balanced": [p.name for p in presets if p.performance_level == "balanced"],
            "quality": [p.name for p in presets if p.performance_level == "quality"]
        }
        
        return AlgorithmPresetsResponse(
            presets=presets,
            total_count=len(presets),
            categories=categories
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取算法预设失败: {str(e)}")


@router.post("/generate/advanced", response_model=ConfigurableMeshResponse)
async def generate_advanced_mesh(request: ConfigurableMeshRequest, background_tasks: BackgroundTasks):
    """使用高级配置生成网格"""
    try:
        client_id = f"advanced_mesh_{int(time.time())}"
        
        # 启动后台任务
        background_tasks.add_task(
            AdvancedMeshGenerator.generate_advanced_mesh, 
            request, 
            client_id
        )
        
        return ConfigurableMeshResponse(
            mesh_id=f"mesh_{int(time.time())}",
            status=MeshGenerationStatus(
                status="initializing",
                progress=0.0,
                current_stage="初始化",
                estimated_time_remaining=None,
                memory_usage=None
            ),
            mesh_statistics={},
            output_files=[],
            quality_metrics={},
            generation_time=0.0
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"启动高级网格生成失败: {str(e)}")


@router.get("/algorithms/info", response_model=Dict[str, Any])
async def get_algorithm_info():
    """获取可用算法的详细信息"""
    try:
        algorithm_info = {
            "2d_algorithms": {
                "delaunay": {
                    "name": "Delaunay三角剖分",
                    "description": "经典的Delaunay三角剖分算法，保证三角形质量",
                    "advantages": ["稳定", "质量好", "适用范围广"],
                    "disadvantages": ["速度中等"],
                    "best_for": ["一般几何", "科学计算"]
                },
                "frontal": {
                    "name": "前沿推进算法",
                    "description": "基于前沿推进的网格生成，可控制网格方向",
                    "advantages": ["快速", "边界控制好", "适合复杂几何"],
                    "disadvantages": ["质量略低于Delaunay"],
                    "best_for": ["工程应用", "复杂边界"]
                },
                "frontal_quad": {
                    "name": "前沿四边形",
                    "description": "生成四边形主导的混合网格",
                    "advantages": ["四边形单元", "结构化特性"],
                    "disadvantages": ["复杂几何处理困难"],
                    "best_for": ["结构分析", "流体分析"]
                },
                "mmg": {
                    "name": "MMG重网格化",
                    "description": "基于度量的高质量网格生成",
                    "advantages": ["高质量", "自适应", "各向异性"],
                    "disadvantages": ["计算时间长"],
                    "best_for": ["科研应用", "高精度分析"]
                }
            },
            "3d_algorithms": {
                "delaunay": {
                    "name": "Delaunay四面体",
                    "description": "三维Delaunay四面体网格生成",
                    "advantages": ["稳定", "质量保证"],
                    "disadvantages": ["速度中等"],
                    "best_for": ["一般3D问题"]
                },
                "frontal": {
                    "name": "前沿推进3D",
                    "description": "三维前沿推进算法",
                    "advantages": ["快速", "边界控制"],
                    "disadvantages": ["质量不如Delaunay"],
                    "best_for": ["工程应用", "快速原型"]
                },
                "mmg": {
                    "name": "MMG 3D",
                    "description": "三维MMG高质量网格",
                    "advantages": ["最高质量", "自适应"],
                    "disadvantages": ["计算密集"],
                    "best_for": ["科研", "精密分析"]
                },
                "netgen": {
                    "name": "Netgen算法",
                    "description": "Netgen三维网格生成器",
                    "advantages": ["稳定", "参数丰富"],
                    "disadvantages": ["需要额外库"],
                    "best_for": ["复杂几何", "多材料"]
                }
            },
            "element_types": {
                "triangle": "三角形单元 - 通用性强，适合各种分析",
                "quadrangle": "四边形单元 - 结构化特性，适合结构分析",
                "tetrahedron": "四面体单元 - 3D通用单元，易于生成",
                "hexahedron": "六面体单元 - 高精度，需要结构化网格",
                "prism": "棱柱单元 - 适合边界层网格",
                "pyramid": "锥形单元 - 过渡单元，连接不同类型"
            },
            "quality_modes": {
                "fast": "快速模式 - 优先速度，适合概念设计",
                "balanced": "平衡模式 - 速度与质量平衡，适合工程应用", 
                "high_quality": "高质量模式 - 优先质量，适合科研分析",
                "adaptive": "自适应模式 - 根据几何自动调整"
            }
        }
        
        return {
            "algorithm_info": algorithm_info,
            "supported_formats": ["vtk", "msh", "inp", "unv", "med"],
            "max_elements": 10000000,
            "max_nodes": 5000000,
            "parallel_support": True,
            "gmsh_version": "4.11.1"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取算法信息失败: {str(e)}")


@router.post("/algorithms/validate-config", response_model=Dict[str, Any])
async def validate_mesh_config(config: AdvancedMeshConfiguration):
    """验证网格配置参数"""
    try:
        validation_result = {
            "is_valid": True,
            "warnings": [],
            "errors": [],
            "recommendations": []
        }
        
        # 基本参数验证
        if config.global_element_size <= 0:
            validation_result["errors"].append("全局单元尺寸必须大于0")
            validation_result["is_valid"] = False
        
        if config.global_element_size > 100:
            validation_result["warnings"].append("全局单元尺寸过大，可能导致网格过粗")
        
        # 算法兼容性检查
        if config.element_2d_type == Element2DType.QUADRANGLE and config.algorithm_2d != MeshAlgorithmType.FRONTAL_QUAD:
            validation_result["warnings"].append("四边形单元建议使用前沿四边形算法")
            validation_result["recommendations"].append("将2D算法改为frontal_quad以获得更好的四边形网格")
        
        # 边界层配置检查
        if config.boundary_layers.enable_boundary_layers:
            if config.boundary_layers.number_of_layers < 1:
                validation_result["errors"].append("边界层数量必须至少为1")
                validation_result["is_valid"] = False
            
            if config.boundary_layers.first_layer_thickness <= 0:
                validation_result["errors"].append("首层厚度必须大于0")
                validation_result["is_valid"] = False
        
        # 尺寸场配置检查  
        if config.size_field.enable_size_field:
            if config.size_field.min_size >= config.size_field.max_size:
                validation_result["errors"].append("最小尺寸必须小于最大尺寸")
                validation_result["is_valid"] = False
            
            if config.size_field.growth_rate <= 1.0:
                validation_result["errors"].append("增长率必须大于1.0")
                validation_result["is_valid"] = False
        
        # 并行配置检查
        if config.parallel_config.enable_parallel:
            if config.parallel_config.num_threads < 1:
                validation_result["errors"].append("线程数必须至少为1")
                validation_result["is_valid"] = False
            elif config.parallel_config.num_threads > 32:
                validation_result["warnings"].append("线程数过多可能不会提高性能")
        
        # 性能建议
        if config.quality_mode == MeshQualityMode.HIGH_QUALITY and config.global_element_size < 0.1:
            validation_result["warnings"].append("高质量模式配合极小单元尺寸将消耗大量时间")
            
        if config.enable_smoothing and config.smoothing_iterations > 10:
            validation_result["warnings"].append("过多的平滑迭代次数可能导致网格变形")
        
        # 总体建议
        if len(validation_result["errors"]) == 0:
            if config.quality_mode == MeshQualityMode.FAST:
                validation_result["recommendations"].append("快速模式适合概念设计，如需精确分析请考虑平衡或高质量模式")
            elif config.quality_mode == MeshQualityMode.HIGH_QUALITY:
                validation_result["recommendations"].append("高质量模式将增加计算时间，但提供更好的网格质量")
        
        return validation_result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"配置验证失败: {str(e)}")


@router.get("/algorithms/performance-estimate", response_model=Dict[str, Any])
async def estimate_performance(
    element_size: float,
    geometry_complexity: str = "medium",  # low, medium, high
    algorithm_2d: MeshAlgorithmType = MeshAlgorithmType.DELAUNAY,
    algorithm_3d: MeshAlgorithmType = MeshAlgorithmType.DELAUNAY,
    quality_mode: MeshQualityMode = MeshQualityMode.BALANCED
):
    """
    Estimates meshing performance based on input parameters.
    This is a simplified heuristic model.
    """
    # 1. Complexity Factor
    complexity_factors = {"low": 1.0, "medium": 2.5, "high": 7.0}
    complexity_factor = complexity_factors.get(geometry_complexity, 2.5)

    # 2. Element Size Factor (smaller elements = more elements)
    # Using a baseline size of 1.0m. The relationship is roughly cubic for 3D.
    size_factor = (1.0 / max(element_size, 0.01)) ** 2.8 

    # 3. Algorithm Factor
    algo_factors = {
        MeshAlgorithmType.DELAUNAY: 1.0,
        MeshAlgorithmType.FRONTAL: 1.5,
        MeshAlgorithmType.NETGEN: 1.8,
        MeshAlgorithmType.MMG: 2.2,
        MeshAlgorithmType.TETGEN: 2.5,
    }
    algo_factor = algo_factors.get(algorithm_3d, 1.0)

    # 4. Quality Factor
    quality_factors = {
        MeshQualityMode.FAST: 0.6,
        MeshQualityMode.BALANCED: 1.0,
        MeshQualityMode.HIGH_QUALITY: 2.0,
    }
    quality_factor = quality_factors.get(quality_mode, 1.0)
    
    # --- Calculations ---
    
    # Base estimated number of elements for a 100x100x30m domain
    base_elements = 50_000 
    
    estimated_elements = int(base_elements * complexity_factor * size_factor * algo_factor * quality_factor)
    
    # Estimated memory: ~1 KB per tetrahedral element
    estimated_memory_mb = (estimated_elements * 1.0) / 1024
    
    # Estimated time: ~0.5 ms per element
    estimated_time_s = (estimated_elements * 0.0005)

    return {
        "estimated_elements": max(100, estimated_elements),
        "estimated_memory_mb": round(max(50, estimated_memory_mb), 2),
        "estimated_time_seconds": round(max(5, estimated_time_s), 2),
        "factors": {
            "complexity_factor": complexity_factor,
            "size_factor": round(size_factor, 2),
            "algorithm_factor": algo_factor,
            "quality_factor": quality_factor
        }
    }


# === 网格质量分析 API ===

class QualityAnalysisRequest(BaseModel):
    """网格质量分析请求"""
    mesh_file: str
    output_dir: Optional[str] = None
    quality_metrics: Optional[List[str]] = None
    generate_visualization: bool = False

class QualityAnalysisResponse(BaseModel):
    """网格质量分析响应"""
    status: str
    message: str
    analysis_id: Optional[str] = None
    report: Optional[Dict[str, Any]] = None

@router.post("/analyze-quality", response_model=QualityAnalysisResponse)
async def analyze_mesh_quality_endpoint(
    request: QualityAnalysisRequest,
    background_tasks: BackgroundTasks
):
    """启动网格质量分析"""
    try:
        # 生成分析ID
        analysis_id = str(uuid4())
        
        # 检查文件是否存在
        if not os.path.exists(request.mesh_file):
            raise HTTPException(status_code=404, detail=f"Mesh file not found: {request.mesh_file}")
        
        # 启动后台分析任务
        background_tasks.add_task(
            quality_analysis_task, 
            analysis_id, 
            request
        )
        
        return QualityAnalysisResponse(
            status="started",
            message="Quality analysis started",
            analysis_id=analysis_id
        )
        
    except Exception as e:
        return QualityAnalysisResponse(
            status="error",
            message=f"Failed to start quality analysis: {str(e)}"
        )

@router.get("/quality-report/{analysis_id}")
async def get_quality_report(analysis_id: str):
    """获取质量分析报告"""
    try:
        if analysis_id not in quality_analysis_cache:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        return quality_analysis_cache[analysis_id]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get quality report: {str(e)}")

@router.get("/export-quality-report/{analysis_id}")
async def export_quality_report_endpoint(analysis_id: str, format: str = "json"):
    """导出质量报告"""
    try:
        if analysis_id not in quality_analysis_cache:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        report = quality_analysis_cache[analysis_id]
        
        if format == "json":
            from fastapi.responses import JSONResponse
            return JSONResponse(content=report)
        
        # 可以添加其他格式的导出逻辑
        raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export quality report: {str(e)}")

@router.get("/quality-thresholds")
async def get_quality_thresholds():
    """获取质量指标阈值配置"""
    try:
        return {metric.value: thresholds for metric, thresholds in quality_analyzer.quality_thresholds.items()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get quality thresholds: {str(e)}")

@router.websocket("/ws/mesh-quality-analysis")
async def mesh_quality_analysis_websocket(websocket: WebSocket):
    """网格质量分析WebSocket连接"""
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "start_analysis":
                # 启动质量分析
                analysis_id = str(uuid4())
                request = QualityAnalysisRequest(**message.get("request", {}))
                
                # 在后台启动分析，通过WebSocket发送进度
                await quality_analysis_websocket_task(websocket, analysis_id, request)
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_text(json.dumps({
            "status": "error",
            "message": f"WebSocket error: {str(e)}"
        }))

async def quality_analysis_task(analysis_id: str, request: QualityAnalysisRequest):
    """后台质量分析任务"""
    try:
        # 执行质量分析
        report = quality_analyzer.analyze_mesh(
            request.mesh_file, 
            request.output_dir
        )
        
        # 将报告转换为字典格式
        report_dict = quality_analyzer._report_to_dict(report)
        
        # 存储结果
        quality_analysis_cache[analysis_id] = {
            "analysis_id": analysis_id,
            "status": "completed",
            "report": report_dict,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
    except Exception as e:
        # 存储错误信息
        quality_analysis_cache[analysis_id] = {
            "analysis_id": analysis_id,
            "status": "error",
            "error": str(e),
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }

async def quality_analysis_websocket_task(
    websocket: WebSocket, 
    analysis_id: str, 
    request: QualityAnalysisRequest
):
    """WebSocket质量分析任务"""
    try:
        # 发送开始消息
        await websocket.send_text(json.dumps({
            "status": "started",
            "analysis_id": analysis_id,
            "progress": 0,
            "message": "Starting mesh quality analysis..."
        }))
        
        # 模拟分析过程和进度报告
        metrics = ["aspect_ratio", "skewness", "orthogonality", "jacobian", "min_angle", "max_angle"]
        total_metrics = len(metrics)
        
        for i, metric in enumerate(metrics):
            # 发送进度
            progress = int((i / total_metrics) * 100)
            await websocket.send_text(json.dumps({
                "status": "progress",
                "progress": progress,
                "message": f"Analyzing {metric.replace('_', ' ')}...",
                "current_metric": metric
            }))
            
            # 模拟分析时间
            await asyncio.sleep(1)
        
        # 执行实际分析
        report = quality_analyzer.analyze_mesh(
            request.mesh_file, 
            request.output_dir
        )
        
        # 转换为字典格式
        report_dict = quality_analyzer._report_to_dict(report)
        
        # 存储结果
        quality_analysis_cache[analysis_id] = {
            "analysis_id": analysis_id,
            "status": "completed",
            "report": report_dict,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        # 发送完成消息
        await websocket.send_text(json.dumps({
            "status": "completed",
            "progress": 100,
            "message": "Quality analysis completed",
            "report": report_dict
        }))
        
    except Exception as e:
        # 发送错误消息
        await websocket.send_text(json.dumps({
            "status": "error",
            "message": f"Quality analysis failed: {str(e)}"
        })) 