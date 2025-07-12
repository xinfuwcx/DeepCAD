import json
import os
from typing import List, Dict
from .schemas import Material, MaterialCreate, MaterialUpdate
import uuid

DATA_FILE = os.path.join(os.path.dirname(__file__), 'materials_db.json')


def get_initial_materials() -> Dict[str, Material]:
    """返回一个包含预设材料的字典"""
    initial_data = [
        # 混凝土
        {"id": "concrete-c30", "name": "混凝土 C30", "type": "concrete", 
         "parameters": {"elasticModulus": 30000, "poissonRatio": 0.2, "density": 2500}},
        {"id": "concrete-c35", "name": "混凝土 C35", "type": "concrete", 
         "parameters": {"elasticModulus": 31500, "poissonRatio": 0.2, "density": 2500}},
        {"id": "concrete-c40", "name": "混凝土 C40", "type": "concrete", 
         "parameters": {"elasticModulus": 32500, "poissonRatio": 0.2, "density": 2500}},
        # 钢材
        {"id": "steel-hrb400", "name": "钢筋 HRB400", "type": "steel", 
         "parameters": {"elasticModulus": 200000, "poissonRatio": 0.3, "density": 7850}},
        {"id": "steel-q235", "name": "钢板 Q235", "type": "steel", 
         "parameters": {"elasticModulus": 206000, "poissonRatio": 0.3, "density": 7850}},
        # 土壤
        {"id": "soil-clay", "name": "黏土", "type": "soil", 
         "parameters": {"elasticModulus": 15, "poissonRatio": 0.35, "density": 1800}},
        {"id": "soil-silt", "name": "粉土", "type": "soil", 
         "parameters": {"elasticModulus": 20, "poissonRatio": 0.3, "density": 1850}},
        {"id": "soil-sand", "name": "砂土", "type": "soil", 
         "parameters": {"elasticModulus": 40, "poissonRatio": 0.25, "density": 1900}},
        {"id": "soil-gravel", "name": "砂砾石", "type": "soil", 
         "parameters": {"elasticModulus": 80, "poissonRatio": 0.22, "density": 2000}},
        {"id": "soil-rock", "name": "基岩", "type": "soil", 
         "parameters": {"elasticModulus": 5000, "poissonRatio": 0.2, "density": 2200}}
    ]
    return {item['id']: Material(**item) for item in initial_data}


def _load_materials() -> Dict[str, Material]:
    """从JSON文件加载材料，如果文件不存在则使用预设材料初始化"""
    if not os.path.exists(DATA_FILE):
        materials = get_initial_materials()
        _save_materials(materials)
        return materials
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return {k: Material(**v) for k, v in data.items()}
    except (json.JSONDecodeError, IOError):
        # 如果文件损坏或为空，则重新初始化
        materials = get_initial_materials()
        _save_materials(materials)
        return materials

def _save_materials(materials: Dict[str, Material]):
    """将材料字典保存到JSON文件"""
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump({k: v.dict() for k, v in materials.items()}, f, ensure_ascii=False, indent=4)


# --- CRUD 操作 ---


def get_all_materials() -> List[Material]:
    """获取所有材料"""
    materials = _load_materials()
    return list(materials.values())


def get_material_by_id(material_id: str) -> Material | None:
    """通过ID获取单个材料"""
    materials = _load_materials()
    return materials.get(material_id)


def create_material(material_data: MaterialCreate) -> Material:
    """创建新材料"""
    materials = _load_materials()
    new_id = str(uuid.uuid4())
    new_material = Material(id=new_id, **material_data.dict())
    
    if new_id in materials:
        # 理论上uuid不会重复，但以防万一
        raise ValueError("Material with this ID already exists.")
        
    materials[new_id] = new_material
    _save_materials(materials)
    return new_material


def update_material(material_id: str, material_data: MaterialUpdate) -> Material | None:
    """更新现有材料"""
    materials = _load_materials()
    if material_id not in materials:
        return None
    
    update_data = material_data.dict(exclude_unset=True)
    updated_material = materials[material_id].copy(update=update_data)
    materials[material_id] = updated_material
    
    _save_materials(materials)
    return updated_material


def delete_material(material_id: str) -> bool:
    """删除材料"""
    materials = _load_materials()
    if material_id in materials:
        del materials[material_id]
        _save_materials(materials)
        return True
    return False 