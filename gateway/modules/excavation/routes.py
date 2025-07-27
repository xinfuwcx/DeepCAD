from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from .services import ExcavationGenerator
from .schemas import ExcavationResponse
import os
import shutil
import uuid
import pyvista as pv
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

# 导入新的开挖模块
from .dxf_excavation_processor import (
    ExcavationDXFProcessor, ExcavationContour, ExcavationDXFResult
)
from .surface_elevation_query import (
    SurfaceElevationQueryEngine, elevation_query_engine
)
from .excavation_geometry_builder import (
    ExcavationGeometryBuilder, excavation_builder, ExcavationBuildResult
)
from .volume_calculator import (
    ExcavationVolumeCalculator, volume_calculator, VolumeCalculationResult
)

router = APIRouter(
    prefix="/excavation",
    tags=["Excavation"],
)

UPLOAD_DIR = "uploads/dxf"
OUTPUT_DIR = "output/excavation"
SOIL_MODEL_DIR = "output/geology"
TEMP_DIR = Path("./temp/excavation")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

logger = logging.getLogger(__name__)


# ==================== 新增请求/响应模型 ====================

class ExcavationDesignRequest(BaseModel):
    """开挖设计请求"""
    contour_id: str
    excavation_depth: float
    stages: Optional[List[Dict[str, Any]]] = None
    calculation_method: str = 'triangular_prism'


class ExcavationDesignResponse(BaseModel):
    """开挖设计响应"""
    success: bool
    message: str
    excavation_id: Optional[str] = None
    volume_info: Optional[Dict[str, Any]] = None
    mesh_file: Optional[str] = None
    report_file: Optional[str] = None

def get_soil_model_mesh(model_id: str) -> pv.PolyData:
    # This is a placeholder. A real app needs a robust asset management system.
    # For now, we just look for a file that might have been created by the geology module.
    for ext in ['.gltf', '.vtk', '.vtp']:
        # This part is tricky because the geology service creates a random UUID.
        # In a real system, the ID would be stored in a database.
        # Here, we'll just grab the *first* file we find in the geology output dir
        # and pretend it's the one we want. THIS IS FOR DEMO PURPOSES ONLY.
        if os.listdir(SOIL_MODEL_DIR):
            found_model = os.listdir(SOIL_MODEL_DIR)[0]
            potential_path = os.path.join(SOIL_MODEL_DIR, found_model)
            if os.path.exists(potential_path):
                return pv.read(potential_path)
    
    # If no real model is found, create a dummy box for demonstration.
    print(f"WARN: Soil model for ID '{model_id}' not found. Creating a dummy box.")
    return pv.Box(bounds=(-50, 50, -50, 50, -30, 0))


@router.post("/generate", response_model=ExcavationResponse)
async def generate_excavation(
    dxf_file: UploadFile = File(...),
    soil_domain_model_id: str = Form(...),
    excavation_depth: float = Form(...)
):
    temp_dxf_path = os.path.join(UPLOAD_DIR, f"temp_{uuid.uuid4().hex}.dxf")
    try:
        with open(temp_dxf_path, "wb") as buffer:
            shutil.copyfileobj(dxf_file.file, buffer)

        soil_mesh = get_soil_model_mesh(soil_domain_model_id)

        generator = ExcavationGenerator()
        final_mesh = generator.create_excavation(
            dxf_path=temp_dxf_path,
            soil_domain_mesh=soil_mesh,
            excavation_depth=excavation_depth
        )
        
        gltf_path = generator.export_mesh_to_gltf(
            mesh=final_mesh,
            output_dir=OUTPUT_DIR,
            filename_prefix="excavation_result"
        )
        
        gltf_filename = os.path.basename(gltf_path)
        gltf_url = f"/excavation/models/{gltf_filename}"

        return ExcavationResponse(
            message="Excavation completed successfully.",
            result_gltf_url=gltf_url
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")
    finally:
        if os.path.exists(temp_dxf_path):
            os.remove(temp_dxf_path)


@router.get("/models/{filename}")
async def get_excavation_model(filename: str):
    """Serves a generated excavated model file."""
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type='model/gltf+json', filename=filename)
    raise HTTPException(status_code=404, detail="Model not found.")


# ==================== 新增开挖设计API ====================

@router.post("/upload-dxf-advanced", response_model=Dict[str, Any])
async def upload_dxf_advanced(
    file: UploadFile = File(..., description="DXF文件"),
    project_name: str = Form(..., description="项目名称")
):
    """
    上传并处理DXF文件，提取开挖轮廓（增强版）
    """
    try:
        if not file.filename.lower().endswith('.dxf'):
            raise HTTPException(status_code=400, detail="文件必须是DXF格式")
        
        # 保存上传的文件
        file_id = str(uuid.uuid4())
        temp_file_path = TEMP_DIR / f"{file_id}_{file.filename}"
        
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # 处理DXF文件
        processor = ExcavationDXFProcessor()
        result = processor.extract_excavation_contours(str(temp_file_path))
        
        response_data = {
            "success": result.success,
            "message": result.message,
            "file_id": file_id,
            "project_name": project_name,
            "contours": [contour.dict() for contour in result.contours],
            "recommended_contour": result.recommended_contour,
            "warnings": result.warnings,
            "processing_time": result.processing_time
        }
        
        # 清理临时文件
        try:
            os.unlink(temp_file_path)
        except:
            pass
        
        return JSONResponse(content=response_data)
        
    except Exception as e:
        logger.error(f"DXF文件处理失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"文件处理失败: {str(e)}")


@router.post("/load-geology-mesh")
async def load_geology_mesh(
    mesh_file: UploadFile = File(..., description="地质网格文件(.vtk, .vtu等)")
):
    """
    加载地质网格模型用于高程查询
    """
    try:
        # 保存上传的网格文件
        mesh_id = str(uuid.uuid4())
        temp_mesh_path = TEMP_DIR / f"mesh_{mesh_id}_{mesh_file.filename}"
        
        with open(temp_mesh_path, "wb") as buffer:
            shutil.copyfileobj(mesh_file.file, buffer)
        
        # 加载网格
        try:
            mesh = pv.read(str(temp_mesh_path))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"无法读取网格文件: {str(e)}")
        
        # 加载到高程查询引擎
        success = elevation_query_engine.load_geology_mesh(mesh)
        
        if success:
            response_data = {
                "success": True,
                "message": f"成功加载地质网格: {mesh.n_points}个点, {mesh.n_cells}个单元",
                "mesh_id": mesh_id,
                "mesh_info": {
                    "points": int(mesh.n_points),
                    "cells": int(mesh.n_cells),
                    "bounds": mesh.bounds.tolist()
                }
            }
        else:
            response_data = {
                "success": False,
                "message": "地质网格加载失败"
            }
        
        # 清理临时文件
        try:
            os.unlink(temp_mesh_path)
        except:
            pass
        
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"加载地质网格失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"加载失败: {str(e)}")


@router.post("/calculate-volume")
async def calculate_excavation_volume(
    contour_points: List[List[float]] = Form(..., description="轮廓点坐标"),
    excavation_depth: float = Form(..., description="开挖深度"),
    calculation_method: str = Form(default='triangular_prism', description="计算方法")
):
    """
    计算开挖体积
    """
    try:
        # 创建示例轮廓
        sample_contour = ExcavationContour(
            id=f"contour_{uuid.uuid4().hex[:8]}",
            name="计算轮廓",
            points=[(p[0], p[1]) for p in contour_points],
            is_closed=True,
            area=0.0,  # 将自动计算
            centroid=(0.0, 0.0),  # 将自动计算
            layer_name="calculation"
        )
        
        # 重新计算面积和质心
        processor = ExcavationDXFProcessor()
        sample_contour.area = abs(processor._calculate_polygon_area(sample_contour.points))
        sample_contour.centroid = processor._calculate_polygon_centroid(sample_contour.points)
        
        # 创建示例地表高程点
        from .surface_elevation_query import ElevationPoint
        surface_elevations = []
        
        for x, y in sample_contour.points:
            surface_elevations.append(ElevationPoint(
                x=x, y=y, z=0.0,  # 简化，假设地表高程为0
                interpolated=False
            ))
        
        # 计算体积
        result = volume_calculator.calculate_excavation_volume(
            contour=sample_contour,
            surface_elevations=surface_elevations,
            excavation_depth=excavation_depth,
            calculation_method=calculation_method
        )
        
        if result.success:
            # 生成报告
            report = volume_calculator.generate_volume_report(result)
            
            return JSONResponse(content={
                "success": True,
                "volume_result": {
                    "total_volume": result.total_volume,
                    "surface_area": result.surface_area,
                    "avg_depth": result.avg_depth,
                    "calculation_method": result.calculation_method,
                    "calculation_time": result.calculation_time
                },
                "detailed_report": report
            })
        else:
            return JSONResponse(content={
                "success": False,
                "message": result.message
            })
        
    except Exception as e:
        logger.error(f"体积计算失败: {str(e)}")
        raise HTTPException(status_code=500, detail=f"计算失败: {str(e)}")


@router.get("/status-advanced")
async def get_excavation_status():
    """
    获取开挖设计模块状态（增强版）
    """
    try:
        from scipy.spatial import Delaunay
        SCIPY_AVAILABLE = True
    except ImportError:
        SCIPY_AVAILABLE = False
    
    try:
        import ezdxf
        EZDXF_AVAILABLE = True
    except ImportError:
        EZDXF_AVAILABLE = False
    
    status = {
        "module": "excavation_design_advanced",
        "version": "1.0.0",
        "dependencies": {
            "pyvista": True,  # 前面已确认可用
            "scipy": SCIPY_AVAILABLE,
            "ezdxf": EZDXF_AVAILABLE
        },
        "temp_dir": str(TEMP_DIR),
        "output_dir": str(OUTPUT_DIR),
        "available_methods": [
            "triangular_prism",
            "grid_integration", 
            "simple"
        ],
        "features": {
            "dxf_contour_extraction": EZDXF_AVAILABLE,
            "surface_elevation_query": True,
            "geometry_construction": True,
            "volume_calculation": SCIPY_AVAILABLE,
            "triangular_integration": SCIPY_AVAILABLE
        }
    }
    
    return JSONResponse(content=status) 