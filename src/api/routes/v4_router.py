from fastapi import APIRouter, HTTPException
from src.core.v4_runner import (
    run_v4_analysis,
    V4AnalysisModel,
    run_seepage_analysis,
    SeepageAnalysisModel
)

router = APIRouter()

@router.post(
    "/run-structural-analysis",
    response_model=dict,
    summary="V4 Structural Analysis"
)
async def run_v4_structural_analysis_endpoint(model: V4AnalysisModel):
    """
    Main endpoint for the V4 structural analysis pipeline.
    Accepts a composite model that includes excavation profiles from DXF
    and definitions for undulating soil layers.
    """
    try:
        print("--- V4 API Endpoint Hit (Structural) ---")
        results = run_v4_analysis(model)
        print("--- V4 API Endpoint Finished (Structural) ---")
        return results
    except ValueError as ve:
        # Catch specific, known errors (e.g., from DXF processing)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Catch any other unexpected errors during the process
        print(f"An unexpected server error occurred: {e}")
        raise HTTPException(
            status_code=500,
            detail="An internal server error occurred during V4 analysis."
        )

@router.post(
    "/run-seepage-analysis",
    response_model=dict,
    summary="V4 Seepage Analysis"
)
async def run_v4_seepage_analysis_endpoint(model: SeepageAnalysisModel):
    """
    Main endpoint for the V4 seepage analysis pipeline.
    Accepts a composite model that includes geometry, materials with
    hydraulic conductivity, and hydraulic boundary conditions.
    """
    try:
        print("--- V4 API Endpoint Hit (Seepage) ---")
        results = run_seepage_analysis(model)
        print("--- V4 API Endpoint Finished (Seepage) ---")
        return results
    except ValueError as ve:
        # Catch specific, known errors (e.g., from DXF processing)
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Catch generic server errors
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected server error occurred: {e}"
        )

@router.get("/health", response_model=dict)
async def health_check():
    """A simple health check endpoint for the V4 router."""
    return {"status": "V4 router is healthy"} 

# --- Chili3D 场景管理API ---

@router.get("/chili3d/scenes/{scene_id}", response_model=dict)
async def get_scene_data(scene_id: str):
    """
    获取3D场景数据
    """
    try:
        # 这里是模拟数据，实际项目中应该从数据库或配置文件中读取
        scenes = {
            "default": {
                "id": "default",
                "name": "默认基坑场景",
                "dimensions": {
                    "width": 50,
                    "length": 30,
                    "depth": 15
                },
                "soil_layers": [
                    {
                        "name": "表层土",
                        "depth_from": 0,
                        "depth_to": 5,
                        "color": "#C2B280"
                    },
                    {
                        "name": "粘土",
                        "depth_from": 5,
                        "depth_to": 15,
                        "color": "#8B4513"
                    }
                ],
                "excavation": {
                    "depth": 8,
                    "profile": [[0, 0], [30, 0], [30, 20], [0, 20]]
                }
            },
            "complex": {
                "id": "complex",
                "name": "复杂地质场景",
                "dimensions": {
                    "width": 100,
                    "length": 80,
                    "depth": 30
                },
                "soil_layers": [
                    {
                        "name": "表层土",
                        "depth_from": 0,
                        "depth_to": 3,
                        "color": "#C2B280"
                    },
                    {
                        "name": "砂质土",
                        "depth_from": 3,
                        "depth_to": 10,
                        "color": "#D2B48C"
                    },
                    {
                        "name": "粘土",
                        "depth_from": 10,
                        "depth_to": 18,
                        "color": "#8B4513"
                    },
                    {
                        "name": "岩层",
                        "depth_from": 18,
                        "depth_to": 30,
                        "color": "#696969"
                    }
                ],
                "excavation": {
                    "depth": 15,
                    "profile": [[10, 10], [70, 10], [70, 60], [10, 60]]
                }
            },
            "custom": {
                "id": "custom",
                "name": "自定义场景",
                "dimensions": {
                    "width": 40,
                    "length": 40,
                    "depth": 20
                },
                "soil_layers": [
                    {
                        "name": "自定义土层1",
                        "depth_from": 0,
                        "depth_to": 10,
                        "color": "#A0522D"
                    },
                    {
                        "name": "自定义土层2",
                        "depth_from": 10,
                        "depth_to": 20,
                        "color": "#708090"
                    }
                ],
                "excavation": {
                    "depth": 12,
                    "profile": [[5, 5], [35, 5], [35, 35], [5, 35]]
                }
            }
        }
        
        if scene_id not in scenes:
            raise HTTPException(
                status_code=404,
                detail=f"Scene '{scene_id}' not found"
            )
            
        return scenes[scene_id]
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get scene data: {str(e)}"
        )

@router.get("/chili3d/scenes/{scene_id}/export", response_model=dict)
async def export_scene_data(scene_id: str, format: str = "json"):
    """
    导出3D场景数据
    """
    try:
        # 调用获取场景数据接口
        scene_data = await get_scene_data(scene_id)
        
        # 根据格式转换数据（实际项目中可能有更复杂的转换逻辑）
        if format.lower() == "json":
            return scene_data
        elif format.lower() == "dxf":
            # 在实际项目中，这里应该返回DXF格式数据
            return {
                "dxf_content": "模拟的DXF内容，实际项目中应返回真实DXF数据",
                "original_scene": scene_data
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported export format: {format}"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export scene data: {str(e)}"
        ) 