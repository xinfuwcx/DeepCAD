from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from gateway.database import get_db
from . import services
from .schemas import Material, MaterialCreate, MaterialUpdate

router = APIRouter(
    prefix="/materials",
    tags=["Materials"],
)

@router.on_event("startup")
async def startup_event():
    # This is a simplified way to ensure data exists.
    # In a real-world scenario, you'd use Alembic migrations.
    with next(get_db()) as db:
        services.ensure_initial_materials(db)

@router.get("/", response_model=List[Material])
async def read_materials(db: Session = Depends(get_db)):
    """获取所有材料"""
    return services.get_all_materials(db)


@router.post("/", response_model=Material, status_code=status.HTTP_201_CREATED)
async def create_new_material(material: MaterialCreate, db: Session = Depends(get_db)):
    """创建新材料"""
    return services.create_material(db, material)


@router.get("/{material_id}", response_model=Material)
async def read_material(material_id: UUID, db: Session = Depends(get_db)):
    """通过ID获取单个材料"""
    db_material = services.get_material_by_id(db, material_id)
    if db_material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    return db_material


@router.put("/{material_id}", response_model=Material)
async def update_existing_material(material_id: UUID, material: MaterialUpdate, db: Session = Depends(get_db)):
    """更新现有材料"""
    updated_material = services.update_material(db, material_id, material)
    if updated_material is None:
        raise HTTPException(status_code=404, detail="Material not found")
    return updated_material


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_material(material_id: UUID, db: Session = Depends(get_db)):
    """删除材料"""
    success = services.delete_material(db, material_id)
    if not success:
        raise HTTPException(status_code=404, detail="Material not found")
    return 