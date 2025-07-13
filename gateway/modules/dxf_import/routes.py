from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.responses import FileResponse
from typing import List, Optional
import os
import uuid
import asyncio
import logging
from pathlib import Path

from .schemas import (
    DXFImportRequest, DXFImportResponse, DXFAnalysisResult, DXFProcessingResult,
    DXFQualityReport, DXFProcessingOptions, LayerFilterRequest, DXFBatchProcessRequest,
    DXFBatchProcessResponse, DXFFileStatus
)
from .processor import DXFProcessor

router = APIRouter(
    prefix="/dxf-import",
    tags=["DXF Import"],
)

# 全局DXF处理器实例
dxf_processor = DXFProcessor()
logger = logging.getLogger(__name__)

# 存储活跃的导入任务
active_imports = {}


@router.post("/upload", response_model=DXFImportResponse)
async def upload_dxf_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    project_id: str = "default",
    options: Optional[str] = None
):
    """
    上传DXF文件并启动分析处理
    """
    if not file.filename.lower().endswith('.dxf'):
        raise HTTPException(status_code=400, detail="仅支持DXF文件格式")
    
    # 生成唯一的导入ID
    import_id = str(uuid.uuid4())
    
    # 保存上传的文件
    upload_dir = Path("./uploads/dxf")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = upload_dir / f"{import_id}_{file.filename}"
    
    try:
        # 保存文件内容
        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        # 解析处理选项
        processing_options = DXFProcessingOptions()
        if options:
            import json
            try:
                options_dict = json.loads(options)
                processing_options = DXFProcessingOptions(**options_dict)
            except Exception as e:
                logger.warning(f"处理选项解析失败，使用默认选项: {e}")
        
        # 创建导入记录
        import_response = DXFImportResponse(
            import_id=import_id,
            status=DXFFileStatus.ANALYZING
        )
        
        active_imports[import_id] = {
            "file_path": str(file_path),
            "project_id": project_id,
            "options": processing_options,
            "status": DXFFileStatus.ANALYZING,
            "response": import_response
        }
        
        # 启动后台分析任务
        background_tasks.add_task(
            process_dxf_background,
            import_id,
            str(file_path),
            processing_options
        )
        
        return import_response
        
    except Exception as e:
        logger.error(f"DXF文件上传失败: {e}")
        # 清理文件
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"文件上传失败: {str(e)}")


@router.get("/status/{import_id}", response_model=DXFImportResponse)
async def get_import_status(import_id: str):
    """
    获取DXF导入任务状态
    """
    if import_id not in active_imports:
        raise HTTPException(status_code=404, detail="导入任务不存在")
    
    return active_imports[import_id]["response"]


@router.post("/analyze", response_model=DXFAnalysisResult)
async def analyze_dxf_file(file: UploadFile = File(...)):
    """
    仅分析DXF文件，不进行处理
    """
    if not file.filename.lower().endswith('.dxf'):
        raise HTTPException(status_code=400, detail="仅支持DXF文件格式")
    
    # 保存临时文件
    temp_dir = Path("./temp/dxf_analysis")
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    temp_file = temp_dir / f"analysis_{uuid.uuid4().hex}.dxf"
    
    try:
        content = await file.read()
        with open(temp_file, "wb") as f:
            f.write(content)
        
        # 执行分析
        analysis_result = dxf_processor.analyze_dxf(str(temp_file))
        
        return analysis_result
        
    except Exception as e:
        logger.error(f"DXF分析失败: {e}")
        raise HTTPException(status_code=500, detail=f"分析失败: {str(e)}")
    finally:
        # 清理临时文件
        if temp_file.exists():
            temp_file.unlink()


@router.post("/process", response_model=DXFProcessingResult)
async def process_dxf_file(
    file: UploadFile = File(...),
    options: DXFProcessingOptions = DXFProcessingOptions()
):
    """
    处理DXF文件并返回结果
    """
    if not file.filename.lower().endswith('.dxf'):
        raise HTTPException(status_code=400, detail="仅支持DXF文件格式")
    
    # 保存临时文件
    temp_dir = Path("./temp/dxf_processing")
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    temp_file = temp_dir / f"process_{uuid.uuid4().hex}.dxf"
    
    try:
        content = await file.read()
        with open(temp_file, "wb") as f:
            f.write(content)
        
        # 执行处理
        processing_result = dxf_processor.process_dxf(str(temp_file), options)
        
        return processing_result
        
    except Exception as e:
        logger.error(f"DXF处理失败: {e}")
        raise HTTPException(status_code=500, detail=f"处理失败: {str(e)}")
    finally:
        # 保留输出文件，但清理输入文件
        if temp_file.exists():
            temp_file.unlink()


@router.get("/quality-report/{import_id}", response_model=DXFQualityReport)
async def get_quality_report(import_id: str):
    """
    获取DXF文件质量报告
    """
    if import_id not in active_imports:
        raise HTTPException(status_code=404, detail="导入任务不存在")
    
    import_data = active_imports[import_id]
    file_path = import_data["file_path"]
    
    try:
        quality_report = dxf_processor.generate_quality_report(file_path)
        return quality_report
        
    except Exception as e:
        logger.error(f"质量报告生成失败: {e}")
        raise HTTPException(status_code=500, detail=f"质量报告生成失败: {str(e)}")


@router.post("/filter-layers", response_model=DXFProcessingResult)
async def filter_layers(request: LayerFilterRequest):
    """
    根据图层过滤DXF内容
    """
    if request.file_id not in active_imports:
        raise HTTPException(status_code=404, detail="文件不存在")
    
    import_data = active_imports[request.file_id]
    file_path = import_data["file_path"]
    
    try:
        # 创建过滤选项
        options = DXFProcessingOptions(
            layer_filter=request.selected_layers,
            preserve_layers=not request.merge_layers
        )
        
        # 处理文件
        result = dxf_processor.process_dxf(file_path, options)
        
        return result
        
    except Exception as e:
        logger.error(f"图层过滤失败: {e}")
        raise HTTPException(status_code=500, detail=f"图层过滤失败: {str(e)}")


@router.post("/convert-to-gmsh")
async def convert_to_gmsh(
    import_id: str,
    options: DXFProcessingOptions = DXFProcessingOptions()
):
    """
    将DXF文件转换为Gmsh几何
    """
    if import_id not in active_imports:
        raise HTTPException(status_code=404, detail="导入任务不存在")
    
    import_data = active_imports[import_id]
    file_path = import_data["file_path"]
    
    try:
        output_file = dxf_processor.convert_to_gmsh(file_path, options)
        
        if output_file and os.path.exists(output_file):
            return FileResponse(
                path=output_file,
                filename=f"converted_{import_id}.geo",
                media_type="application/octet-stream"
            )
        else:
            raise HTTPException(status_code=500, detail="转换失败，未生成输出文件")
            
    except Exception as e:
        logger.error(f"Gmsh转换失败: {e}")
        raise HTTPException(status_code=500, detail=f"转换失败: {str(e)}")


@router.post("/batch-process", response_model=DXFBatchProcessResponse)
async def batch_process_dxf(
    background_tasks: BackgroundTasks,
    request: DXFBatchProcessRequest
):
    """
    批量处理DXF文件
    """
    # 验证所有文件是否存在
    valid_files = []
    for file_id in request.file_ids:
        if file_id in active_imports:
            valid_files.append(file_id)
    
    if not valid_files:
        raise HTTPException(status_code=400, detail="没有找到有效的文件")
    
    # 生成批量任务ID
    batch_id = str(uuid.uuid4())
    
    # 创建批量响应
    batch_response = DXFBatchProcessResponse(
        batch_id=batch_id,
        total_files=len(valid_files),
        completed_files=0,
        failed_files=0,
        status="processing"
    )
    
    # 启动批量处理任务
    background_tasks.add_task(
        process_batch_background,
        batch_id,
        valid_files,
        request.options,
        request.parallel_processing
    )
    
    return batch_response


@router.get("/batch-status/{batch_id}", response_model=DXFBatchProcessResponse)
async def get_batch_status(batch_id: str):
    """
    获取批量处理状态
    """
    # 这里应该从数据库或缓存中获取批量任务状态
    # 简化实现，返回模拟数据
    return DXFBatchProcessResponse(
        batch_id=batch_id,
        total_files=1,
        completed_files=1,
        failed_files=0,
        status="completed"
    )


@router.delete("/import/{import_id}")
async def delete_import(import_id: str):
    """
    删除导入任务和相关文件
    """
    if import_id not in active_imports:
        raise HTTPException(status_code=404, detail="导入任务不存在")
    
    try:
        import_data = active_imports[import_id]
        file_path = Path(import_data["file_path"])
        
        # 删除文件
        if file_path.exists():
            file_path.unlink()
        
        # 删除任务记录
        del active_imports[import_id]
        
        return {"message": "导入任务已删除"}
        
    except Exception as e:
        logger.error(f"删除导入任务失败: {e}")
        raise HTTPException(status_code=500, detail=f"删除失败: {str(e)}")


@router.get("/supported-formats")
async def get_supported_formats():
    """
    获取支持的DXF格式信息
    """
    return {
        "input_formats": ["dxf"],
        "output_formats": ["dxf", "geo", "msh", "vtk"],
        "dxf_versions": [
            "R12", "R13", "R14", "R2000", "R2004", 
            "R2007", "R2010", "R2013", "R2018"
        ],
        "entity_types": [
            "LINE", "POLYLINE", "LWPOLYLINE", "ARC", "CIRCLE",
            "ELLIPSE", "SPLINE", "POINT", "TEXT", "MTEXT",
            "INSERT", "BLOCK", "HATCH", "DIMENSION", "LEADER"
        ],
        "processing_modes": ["strict", "tolerant", "repair", "preview"]
    }


async def process_dxf_background(import_id: str, file_path: str, options: DXFProcessingOptions):
    """
    后台DXF处理任务
    """
    try:
        # 更新状态为分析中
        active_imports[import_id]["status"] = DXFFileStatus.ANALYZING
        active_imports[import_id]["response"].status = DXFFileStatus.ANALYZING
        
        # 执行分析
        analysis_result = dxf_processor.analyze_dxf(file_path)
        active_imports[import_id]["response"].analysis_result = analysis_result
        
        # 更新状态为处理中
        active_imports[import_id]["status"] = DXFFileStatus.PROCESSING
        active_imports[import_id]["response"].status = DXFFileStatus.PROCESSING
        
        # 执行处理
        processing_result = dxf_processor.process_dxf(file_path, options)
        active_imports[import_id]["response"].processing_result = processing_result
        
        # 更新最终状态
        if processing_result.success:
            active_imports[import_id]["status"] = DXFFileStatus.COMPLETED
            active_imports[import_id]["response"].status = DXFFileStatus.COMPLETED
        else:
            active_imports[import_id]["status"] = DXFFileStatus.FAILED
            active_imports[import_id]["response"].status = DXFFileStatus.FAILED
            
    except Exception as e:
        logger.error(f"后台DXF处理失败 [{import_id}]: {e}")
        active_imports[import_id]["status"] = DXFFileStatus.FAILED
        active_imports[import_id]["response"].status = DXFFileStatus.FAILED


async def process_batch_background(
    batch_id: str, 
    file_ids: List[str], 
    options: DXFProcessingOptions,
    parallel: bool
):
    """
    后台批量处理任务
    """
    try:
        if parallel:
            # 并行处理
            tasks = []
            for file_id in file_ids:
                import_data = active_imports[file_id]
                task = asyncio.create_task(
                    process_single_file_async(import_data["file_path"], options)
                )
                tasks.append(task)
            
            await asyncio.gather(*tasks, return_exceptions=True)
        else:
            # 串行处理
            for file_id in file_ids:
                import_data = active_imports[file_id]
                await process_single_file_async(import_data["file_path"], options)
                
    except Exception as e:
        logger.error(f"批量处理失败 [{batch_id}]: {e}")


async def process_single_file_async(file_path: str, options: DXFProcessingOptions):
    """
    异步处理单个文件
    """
    try:
        # 在线程池中执行CPU密集型任务
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            None, 
            dxf_processor.process_dxf, 
            file_path, 
            options
        )
        return result
    except Exception as e:
        logger.error(f"文件处理失败 [{file_path}]: {e}")
        raise