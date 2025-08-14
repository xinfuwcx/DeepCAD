"""
材料管理API - 简化版本
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
import json
import os
from datetime import datetime
from sqlalchemy.orm import Session
from deep_excavation.backend.database import get_db

router = APIRouter(prefix="/api/materials", tags=["材料管理"])

@router.post("/add")
async def add_material(material_data: Dict[str, Any], db: Session = Depends(get_db)):
    """
    添加单个材料到系统
    """
    try:
        # 简化的材料存储 - 直接保存到JSON文件作为演示
        materials_file = "materials_storage.json"
        
        # 读取现有材料
        if os.path.exists(materials_file):
            with open(materials_file, 'r', encoding='utf-8') as f:
                materials = json.load(f)
        else:
            materials = []
        
        # 添加时间戳和ID
        material_data['id'] = f"material_{len(materials) + 1}_{int(datetime.now().timestamp())}"
        material_data['created_at'] = datetime.now().isoformat()
        material_data['updated_at'] = datetime.now().isoformat()
        
        # 添加到列表
        materials.append(material_data)
        
        # 保存到文件
        with open(materials_file, 'w', encoding='utf-8') as f:
            json.dump(materials, f, indent=2, ensure_ascii=False)
        
        return {
            "status": "success",
            "message": f"材料 '{material_data['name']}' 添加成功",
            "material_id": material_data['id']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"添加材料失败: {str(e)}")

@router.get("/list")
async def list_materials():
    """
    获取所有材料列表
    """
    try:
        materials_file = "materials_storage.json"
        
        if os.path.exists(materials_file):
            with open(materials_file, 'r', encoding='utf-8') as f:
                materials = json.load(f)
        else:
            materials = []
        
        return {
            "status": "success",
            "count": len(materials),
            "materials": materials
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取材料列表失败: {str(e)}")

@router.get("/stats")
async def get_material_stats():
    """
    获取材料统计信息
    """
    try:
        materials_file = "materials_storage.json"
        
        if os.path.exists(materials_file):
            with open(materials_file, 'r', encoding='utf-8') as f:
                materials = json.load(f)
        else:
            materials = []
        
        # 统计各类型材料数量
        type_counts = {}
        for material in materials:
            mat_type = material.get('material_type', 'unknown')
            type_counts[mat_type] = type_counts.get(mat_type, 0) + 1
        
        return {
            "status": "success",
            "total_materials": len(materials),
            "type_distribution": type_counts,
            "last_updated": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")

@router.delete("/clear")
async def clear_materials():
    """
    清空所有材料 (仅用于测试)
    """
    try:
        materials_file = "materials_storage.json"
        
        if os.path.exists(materials_file):
            os.remove(materials_file)
        
        return {
            "status": "success",
            "message": "所有材料已清空"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"清空材料失败: {str(e)}")