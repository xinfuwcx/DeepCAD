from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from gateway.database import get_db
from . import services
from .schemas import (
    Material, MaterialCreate, MaterialUpdate,
    GeotechnicalMaterial, GeotechnicalMaterialCreate, GeotechnicalMaterialUpdate,
    MaterialSearchCriteria, MaterialImportRequest, MaterialExportRequest,
    GeotechnicalMaterialType, ConstitutiveModel, MaterialStatus, ReliabilityLevel
)

router = APIRouter(
    prefix="/materials",
    tags=["Materials"],
)

# Enhanced Geotechnical Material Routes

@router.get("/geotechnical", response_model=List[GeotechnicalMaterial])
async def get_geotechnical_materials(
    keyword: Optional[str] = Query(None, description="搜索关键词"),
    material_type: Optional[List[GeotechnicalMaterialType]] = Query(None, description="材料类型"),
    constitutive_model: Optional[List[ConstitutiveModel]] = Query(None, description="本构模型"),
    status: Optional[List[MaterialStatus]] = Query(None, description="状态"),
    reliability: Optional[List[ReliabilityLevel]] = Query(None, description="可靠性"),
    validated: Optional[bool] = Query(None, description="验证状态"),
    sort_by: Optional[str] = Query("name", description="排序字段"),
    sort_order: Optional[str] = Query("asc", description="排序顺序"),
    page: Optional[int] = Query(1, description="页码"),
    page_size: Optional[int] = Query(20, description="页面大小"),
    db: Session = Depends(get_db)
):
    """获取岩土材料列表，支持搜索和筛选"""
    search_criteria = MaterialSearchCriteria(
        keyword=keyword,
        materialType=material_type,
        constitutiveModel=constitutive_model,
        status=status,
        reliability=reliability,
        validated=validated,
        sortBy=sort_by,
        sortOrder=sort_order,
        page=page,
        pageSize=page_size
    )
    return services.get_all_geotechnical_materials(db, search_criteria)


@router.post("/geotechnical", response_model=GeotechnicalMaterial, status_code=status.HTTP_201_CREATED)
async def create_geotechnical_material(
    material: GeotechnicalMaterialCreate, 
    db: Session = Depends(get_db)
):
    """创建新的岩土材料"""
    try:
        # 验证材料数据
        if not material.name or not material.name.strip():
            raise HTTPException(
                status_code=422, 
                detail="材料名称不能为空"
            )
        
        if not material.properties:
            raise HTTPException(
                status_code=422, 
                detail="材料属性不能为空"
            )
        
        # 检查是否存在同名材料
        existing = services.get_material_by_name(db, material.name.strip())
        if existing:
            raise HTTPException(
                status_code=409, 
                detail=f"名称为 '{material.name}' 的材料已存在"
            )
        
        return services.create_geotechnical_material(db, material)
    
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"数据验证失败: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建材料失败: {str(e)}")


@router.get("/geotechnical/{material_id}", response_model=GeotechnicalMaterial)
async def get_geotechnical_material_by_id(
    material_id: UUID, 
    db: Session = Depends(get_db)
):
    """通过ID获取岩土材料"""
    material = services.get_geotechnical_material_by_id(db, material_id)
    if material is None:
        raise HTTPException(status_code=404, detail="材料未找到")
    return material


@router.put("/geotechnical/{material_id}", response_model=GeotechnicalMaterial)
async def update_geotechnical_material(
    material_id: UUID, 
    material: GeotechnicalMaterialUpdate, 
    db: Session = Depends(get_db)
):
    """更新岩土材料"""
    try:
        # 验证材料ID
        if not material_id:
            raise HTTPException(status_code=422, detail="材料ID不能为空")
        
        # 检查材料是否存在
        existing = services.get_geotechnical_material_by_id(db, material_id)
        if not existing:
            raise HTTPException(status_code=404, detail="材料未找到")
        
        # 如果更新名称，检查是否重名
        if material.name and material.name.strip():
            name_conflict = services.get_material_by_name(db, material.name.strip())
            if name_conflict and name_conflict.id != str(material_id):
                raise HTTPException(
                    status_code=409, 
                    detail=f"名称为 '{material.name}' 的材料已存在"
                )
        
        updated_material = services.update_geotechnical_material(db, material_id, material)
        if updated_material is None:
            raise HTTPException(status_code=500, detail="更新材料失败")
        
        return updated_material
    
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"数据验证失败: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新材料失败: {str(e)}")


@router.delete("/geotechnical/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_geotechnical_material(
    material_id: UUID, 
    db: Session = Depends(get_db)
):
    """删除岩土材料"""
    try:
        # 验证材料ID
        if not material_id:
            raise HTTPException(status_code=422, detail="材料ID不能为空")
        
        # 检查材料是否存在
        existing = services.get_geotechnical_material_by_id(db, material_id)
        if not existing:
            raise HTTPException(status_code=404, detail="材料未找到")
        
        # 检查材料是否为标准材料（不允许删除）
        if hasattr(existing, 'isStandard') and existing.isStandard:
            raise HTTPException(
                status_code=403, 
                detail="标准材料不允许删除"
            )
        
        # 检查材料是否正在使用中
        is_in_use = services.check_material_usage(db, material_id)
        if is_in_use:
            raise HTTPException(
                status_code=409, 
                detail="材料正在使用中，无法删除。请先取消相关关联后再删除。"
            )
        
        success = services.delete_geotechnical_material(db, material_id)
        if not success:
            raise HTTPException(status_code=500, detail="删除材料失败")
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"删除材料失败: {str(e)}")


@router.post("/geotechnical/import", response_model=List[GeotechnicalMaterial])
async def import_materials(
    import_request: MaterialImportRequest, 
    db: Session = Depends(get_db)
):
    """导入材料数据"""
    try:
        return services.import_midas_materials(db, import_request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"导入失败: {str(e)}")


@router.post("/geotechnical/export")
async def export_materials(
    export_request: MaterialExportRequest, 
    db: Session = Depends(get_db)
):
    """导出材料数据"""
    try:
        return services.export_materials(db, export_request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"导出失败: {str(e)}")


@router.get("/geotechnical/statistics/summary")
async def get_material_statistics(db: Session = Depends(get_db)):
    """获取材料库统计信息"""
    return services.get_material_statistics(db)


# Legacy Material Routes (for backward compatibility)

@router.on_event("startup")
async def startup_event():
    """初始化数据"""
    with next(get_db()) as db:
        services.ensure_initial_materials(db)
        services.ensure_initial_geotechnical_materials(db)


@router.get("/", response_model=List[Material])
async def read_materials(db: Session = Depends(get_db)):
    """获取所有材料（兼容接口）"""
    return services.get_all_materials(db)


@router.post("/", response_model=Material, status_code=status.HTTP_201_CREATED)
async def create_new_material(material: MaterialCreate, db: Session = Depends(get_db)):
    """创建新材料（兼容接口）"""
    return services.create_material(db, material)


@router.get("/{material_id}", response_model=Material)
async def read_material(material_id: UUID, db: Session = Depends(get_db)):
    """通过ID获取单个材料（兼容接口）"""
    db_material = services.get_material_by_id(db, material_id)
    if db_material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    return db_material


@router.put("/{material_id}", response_model=Material)
async def update_existing_material(material_id: UUID, material: MaterialUpdate, db: Session = Depends(get_db)):
    """更新现有材料（兼容接口）"""
    updated_material = services.update_material(db, material_id, material)
    if updated_material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    return updated_material


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_material(material_id: UUID, db: Session = Depends(get_db)):
    """删除材料（兼容接口）"""
    success = services.delete_material(db, material_id)
    if not success:
        raise HTTPException(status_code=404, detail="Material not found")