"""
材料参数导入路由 - 支持Excel文件导入材料参数
"""
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import List, Dict, Any
import pandas as pd
import json
from datetime import datetime
from sqlalchemy.orm import Session
from deep_excavation.backend.database import get_db
from gateway.models.materials import GeotechnicalMaterial

router = APIRouter(prefix="/api/materials", tags=["材料导入"])

# 标准材料参数模板
STANDARD_MATERIAL_TEMPLATE = {
    "土壤材料": {
        "required_fields": ["名称", "材料类型", "弹性模量", "泊松比", "密度", "粘聚力", "内摩擦角"],
        "optional_fields": ["抗拉强度", "渗透系数", "孔隙率", "初始孔隙比", "压缩指数"],
        "units": {
            "弹性模量": "MPa",
            "泊松比": "无量纲",
            "密度": "kg/m³",
            "粘聚力": "kPa",
            "内摩擦角": "度",
            "抗拉强度": "kPa",
            "渗透系数": "m/s",
            "孔隙率": "无量纲",
            "初始孔隙比": "无量纲",
            "压缩指数": "无量纲"
        }
    },
    "混凝土材料": {
        "required_fields": ["名称", "材料类型", "弹性模量", "泊松比", "密度", "抗压强度"],
        "optional_fields": ["抗拉强度", "热膨胀系数", "徐变系数", "收缩应变"],
        "units": {
            "弹性模量": "MPa",
            "泊松比": "无量纲",
            "密度": "kg/m³",
            "抗压强度": "MPa",
            "抗拉强度": "MPa",
            "热膨胀系数": "1/°C",
            "徐变系数": "无量纲",
            "收缩应变": "无量纲"
        }
    },
    "钢材": {
        "required_fields": ["名称", "材料类型", "弹性模量", "泊松比", "密度", "屈服强度"],
        "optional_fields": ["极限强度", "热膨胀系数", "硬化模量"],
        "units": {
            "弹性模量": "MPa",
            "泊松比": "无量纲",
            "密度": "kg/m³",
            "屈服强度": "MPa",
            "极限强度": "MPa",
            "热膨胀系数": "1/°C",
            "硬化模量": "MPa"
        }
    }
}

def parse_excel_materials(file_content: bytes, sheet_name: str = None) -> List[Dict[str, Any]]:
    """
    解析Excel文件中的材料参数
    """
    try:
        # 读取Excel文件
        if sheet_name:
            df = pd.read_excel(file_content, sheet_name=sheet_name)
        else:
            df = pd.read_excel(file_content)
        
        materials = []
        
        for index, row in df.iterrows():
            if pd.isna(row.iloc[0]):  # 跳过空行
                continue
                
            material = {
                "name": str(row.iloc[0]).strip() if not pd.isna(row.iloc[0]) else f"材料_{index+1}",
                "constitutive_model": "MohrCoulomb",
                "properties": {},
                "source": "Excel导入",
                "imported_at": datetime.now().isoformat()
            }
            
            # 动态解析列名和值
            for col_name, value in row.items():
                if pd.isna(value) or col_name == row.index[0]:
                    continue
                    
                col_name_str = str(col_name).strip()
                
                # 映射Excel列名到标准参数名
                param_mapping = {
                    "弹性模量": "YOUNG_MODULUS",
                    "泊松比": "POISSON_RATIO", 
                    "密度": "DENSITY",
                    "粘聚力": "COHESION",
                    "内摩擦角": "FRICTION_ANGLE",
                    "抗拉强度": "TENSILE_STRENGTH",
                    "渗透系数": "PERMEABILITY",
                    "孔隙率": "POROSITY",
                    "初始孔隙比": "INITIAL_VOID_RATIO",
                    "压缩指数": "COMPRESSION_INDEX",
                    "抗压强度": "COMPRESSIVE_STRENGTH",
                    "屈服强度": "YIELD_STRENGTH",
                    "极限强度": "ULTIMATE_STRENGTH"
                }
                
                # 查找匹配的参数名
                param_name = None
                for chinese_name, english_name in param_mapping.items():
                    if chinese_name in col_name_str:
                        param_name = english_name
                        break
                
                if param_name and isinstance(value, (int, float)):
                    material["properties"][param_name] = float(value)
                    
                # 根据参数调整本构模型
                if "抗压强度" in col_name_str and value > 1000:  # 大于1000可能是混凝土
                    material["constitutive_model"] = "LinearElastic"
                elif "屈服强度" in col_name_str:
                    material["constitutive_model"] = "LinearElastic"
            
            # 验证必要参数
            required_params = ["YOUNG_MODULUS", "POISSON_RATIO", "DENSITY"]
            if all(param in material["properties"] for param in required_params):
                materials.append(material)
        
        return materials
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Excel文件解析失败: {str(e)}")

@router.post("/import-excel")
async def import_materials_from_excel(
    file: UploadFile = File(...),
    sheet_name: str = None,
    db: Session = Depends(get_db)
):
    """
    从Excel文件导入材料参数
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="只支持Excel文件(.xlsx, .xls)")
    
    try:
        # 读取文件内容
        content = await file.read()
        
        # 解析材料参数
        materials = parse_excel_materials(content, sheet_name)
        
        if not materials:
            raise HTTPException(status_code=400, detail="未找到有效的材料参数数据")
        
        # 保存到数据库
        imported_count = 0
        errors = []
        
        for material_data in materials:
            try:
                # 检查是否已存在同名材料
                existing = db.query(GeotechnicalMaterial).filter(
                    GeotechnicalMaterial.name == material_data["name"]
                ).first()
                
                if existing:
                    # 更新现有材料
                    existing.properties_data = json.dumps(material_data["properties"])
                    existing.modified_at = datetime.now()
                    existing.source = material_data["source"]
                else:
                    # 创建新材料
                    new_material = GeotechnicalMaterial(
                        name=material_data["name"],
                        constitutive_model=material_data["constitutive_model"],
                        properties_data=json.dumps(material_data["properties"]),
                        source=material_data["source"],
                        status="imported"
                    )
                    db.add(new_material)
                
                imported_count += 1
                
            except Exception as e:
                errors.append(f"材料 '{material_data['name']}' 导入失败: {str(e)}")
        
        db.commit()
        
        return {
            "message": f"成功导入 {imported_count} 个材料参数",
            "imported_count": imported_count,
            "total_found": len(materials),
            "errors": errors,
            "materials": materials
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"导入过程发生错误: {str(e)}")

@router.get("/template")
async def get_material_template():
    """
    获取材料参数Excel模板
    """
    return {
        "template": STANDARD_MATERIAL_TEMPLATE,
        "description": "标准材料参数模板，用于Excel文件导入",
        "example": {
            "土壤材料示例": {
                "名称": "粘土",
                "材料类型": "土壤",
                "弹性模量": 50,
                "泊松比": 0.35,
                "密度": 1800,
                "粘聚力": 20,
                "内摩擦角": 25,
                "渗透系数": 1e-8
            }
        }
    }

@router.post("/validate-excel")
async def validate_excel_format(file: UploadFile = File(...)):
    """
    验证Excel文件格式是否正确
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="只支持Excel文件")
    
    try:
        content = await file.read()
        materials = parse_excel_materials(content)
        
        return {
            "valid": True,
            "material_count": len(materials),
            "preview": materials[:3] if materials else [],
            "message": f"找到 {len(materials)} 个有效材料参数"
        }
        
    except Exception as e:
        return {
            "valid": False,
            "error": str(e),
            "message": "文件格式验证失败"
        }