from fastapi import APIRouter, HTTPException, File, UploadFile
from pydantic import BaseModel, Field
from typing import List, Optional
import tempfile
import os
import ezdxf

# 使用绝对路径导入，更清晰、更健壮
from deep_excavation.backend.services.geology_service import GeologyService

router = APIRouter()
# 实例化服务，在实际应用中可能会使用依赖注入系统
geology_service = GeologyService()

# Pydantic模型，用于验证请求体
# 这些模型应该与前端的TypeScript类型匹配

class BoreholePoint(BaseModel):
    id: str
    x: float = Field(..., description="钻孔的X坐标")
    y: float = Field(..., description="钻孔的Y坐标")
    z: float = Field(..., description="高程Z")
    surface: str = Field(..., description="所属地层表面名称")
    description: Optional[str] = None # 在前端已移除，设为可选以保持兼容

class GemPyParams(BaseModel):
    resolution: List[int]
    c_o: float
    algorithm: str
    generateContours: bool

class CreateGeologicalModelRequest(BaseModel):
    boreholeData: List[BoreholePoint]
    colorScheme: str
    gempyParams: GemPyParams

class DXFParseResult(BaseModel):
    vertices: List[List[float]] = Field(
        ..., 
        description="DXF文件中多段线的顶点列表，例如 [[x1, y1, z1], [x2, y2, z2]]"
    )

@router.post(
    "/upload-dxf", 
    response_model=DXFParseResult, 
    tags=["Geology", "File Upload"]
)
async def upload_dxf(file: UploadFile = File(...)):
    """
    上传DXF文件，解析其中的2D多段线 (LWPOLYLINE)，并返回其顶点。
    """
    if not file.filename.lower().endswith('.dxf'):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Please upload a .dxf file."
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=".dxf") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        doc = ezdxf.readfile(tmp_path)
        msp = doc.modelspace()
        lwpolyline = msp.query('LWPOLYLINE').first
        
        if not lwpolyline:
            raise HTTPException(
                status_code=404, 
                detail="No LWPOLYLINE found in the DXF file."
            )

        vertices = [
            [point[0], point[1], 0.0] 
            for point in lwpolyline.get_points(format='xy')
        ]
        return DXFParseResult(vertices=vertices)

    except IOError:
        raise HTTPException(status_code=500, detail="Could not read DXF file.")
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to parse DXF file: {e}"
        )
    finally:
        os.unlink(tmp_path)

@router.post("/model-from-boreholes", tags=["Geology"])
async def create_model_from_boreholes_endpoint(
    request: CreateGeologicalModelRequest
):
    """
    接收结构化的钻孔数据 (JSON)，使用GemPy处理，
    并返回指向生成的3D模型文件的路径 (例如, VTK)。
    """
    try:
        # 调用地质服务来处理数据并生成模型
        model_info = await geology_service.create_model_from_borehole_data(request)

        return {
            "message": "Geological model created successfully from borehole data.",
            "modelId": model_info.get("model_id"),
            "previewData": model_info.get("preview_data"),
        }
    except Exception as e:
        # 在实际应用中，这里应该有更详细的错误日志
        # 使用 logging 模块记录完整堆栈信息
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}") 