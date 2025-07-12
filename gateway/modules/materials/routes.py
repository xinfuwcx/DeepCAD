from fastapi import APIRouter, HTTPException, status
from typing import List
from . import services
from .schemas import Material, MaterialCreate, MaterialUpdate

router = APIRouter(
    prefix="/materials",
    tags=["Materials"],
)


@router.get("/", response_model=List[Material])
async def read_materials():
    """获取所有材料"""
    return services.get_all_materials()


@router.post("/", response_model=Material, status_code=status.HTTP_201_CREATED)
async def create_new_material(material: MaterialCreate):
    """创建新材料"""
    return services.create_material(material)


@router.get("/{material_id}", response_model=Material)
async def read_material(material_id: str):
    """通过ID获取单个材料"""
    db_material = services.get_material_by_id(material_id)
    if db_material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    return db_material


@router.put("/{material_id}", response_model=Material)
async def update_existing_material(material_id: str, material: MaterialUpdate):
    """更新现有材料"""
    updated_material = services.update_material(material_id, material)
    if updated_material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    return updated_material


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_material(material_id: str):
    """删除材料"""
    success = services.delete_material(material_id)
    if not success:
        raise HTTPException(status_code=404, detail="Material not found")
    return {"ok": True}  # 虽然状态码是204，但返回一个消息体也是可以的 