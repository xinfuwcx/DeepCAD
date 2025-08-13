import json
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from .schemas import (
    Material as MaterialSchema, MaterialCreate, MaterialUpdate,
    GeotechnicalMaterial, GeotechnicalMaterialCreate, GeotechnicalMaterialUpdate,
    MaterialSearchCriteria, MaterialImportRequest, MaterialExportRequest
)
from gateway.models.materials import (
    Material as MaterialModel, 
    GeotechnicalMaterial as GeotechnicalMaterialModel
)

# --- Enhanced Geotechnical Material Operations ---

def get_all_geotechnical_materials(db: Session, search_criteria: Optional[MaterialSearchCriteria] = None) -> List[GeotechnicalMaterial]:
    """获取所有岩土材料，支持搜索和筛选"""
    query = db.query(GeotechnicalMaterialModel).filter(GeotechnicalMaterialModel.is_deleted == False)
    
    if search_criteria:
        # 关键词搜索
        if search_criteria.keyword:
            query = query.filter(
                or_(
                    GeotechnicalMaterialModel.name.contains(search_criteria.keyword),
                    GeotechnicalMaterialModel.description.contains(search_criteria.keyword)
                )
            )
        
        # 材料类型筛选
        if search_criteria.materialType:
            query = query.filter(GeotechnicalMaterialModel.material_type.in_([t.value for t in search_criteria.materialType]))
        
        # 本构模型筛选
        if search_criteria.constitutiveModel:
            query = query.filter(GeotechnicalMaterialModel.constitutive_model.in_([m.value for m in search_criteria.constitutiveModel]))
        
        # 状态筛选
        if search_criteria.status:
            query = query.filter(GeotechnicalMaterialModel.status.in_([s.value for s in search_criteria.status]))
        
        # 验证状态筛选
        if search_criteria.validated is not None:
            query = query.filter(GeotechnicalMaterialModel.validated == search_criteria.validated)
        
        # 排序
        if search_criteria.sortBy:
            sort_field = getattr(GeotechnicalMaterialModel, search_criteria.sortBy, GeotechnicalMaterialModel.name)
            if search_criteria.sortOrder == "desc":
                query = query.order_by(sort_field.desc())
            else:
                query = query.order_by(sort_field)
    
    # 分页
    if search_criteria and search_criteria.page and search_criteria.pageSize:
        offset = (search_criteria.page - 1) * search_criteria.pageSize
        query = query.offset(offset).limit(search_criteria.pageSize)
    
    db_materials = query.all()
    return [_convert_db_to_schema(db_mat) for db_mat in db_materials]


def get_geotechnical_material_by_id(db: Session, material_id: UUID) -> Optional[GeotechnicalMaterial]:
    """通过ID获取岩土材料"""
    db_mat = db.query(GeotechnicalMaterialModel).filter(
        GeotechnicalMaterialModel.id == str(material_id),
        GeotechnicalMaterialModel.is_deleted == False
    ).first()
    
    if not db_mat:
        return None
    
    return _convert_db_to_schema(db_mat)


def create_geotechnical_material(db: Session, material_data: GeotechnicalMaterialCreate) -> GeotechnicalMaterial:
    """创建新的岩土材料"""
    # 验证材料参数
    validation_errors = validate_material_parameters(material_data)
    if validation_errors:
        raise ValueError(f"参数验证失败: {'; '.join(validation_errors)}")
    
    db_material = GeotechnicalMaterialModel(
        name=material_data.name.strip(),
        material_type=material_data.materialType.value,
        constitutive_model=material_data.constitutiveModel.value,
        description=material_data.description,
        source=material_data.source,
        standard=material_data.standard,
        reliability=material_data.reliability.value,
        properties_data=json.dumps(material_data.properties),
        midas_format_data=json.dumps(material_data.midasFormat.dict()) if material_data.midasFormat else None,
        staged_properties_data=json.dumps([sp.dict() for sp in material_data.stagedProperties]) if material_data.stagedProperties else None,
        tags_data=json.dumps(material_data.tags) if material_data.tags else None,
        category=material_data.category,
        sub_category=material_data.subCategory,
        created_by=material_data.createdBy,
        status='draft',
        validated=False,
        version='1.0.0'
    )
    
    try:
        db.add(db_material)
        db.commit()
        db.refresh(db_material)
        
        return _convert_db_to_schema(db_material)
    except Exception as e:
        db.rollback()
        raise RuntimeError(f"数据库操作失败: {str(e)}")


def update_geotechnical_material(db: Session, material_id: UUID, material_data: GeotechnicalMaterialUpdate) -> Optional[GeotechnicalMaterial]:
    """更新岩土材料"""
    db_mat = db.query(GeotechnicalMaterialModel).filter(
        GeotechnicalMaterialModel.id == str(material_id),
        GeotechnicalMaterialModel.is_deleted == False
    ).first()
    
    if not db_mat:
        return None
    
    update_data = material_data.dict(exclude_unset=True)
    
    # 更新基本字段
    if "name" in update_data:
        db_mat.name = update_data["name"]
    if "materialType" in update_data:
        db_mat.material_type = update_data["materialType"]
    if "constitutiveModel" in update_data:
        db_mat.constitutive_model = update_data["constitutiveModel"]
    if "description" in update_data:
        db_mat.description = update_data["description"]
    if "source" in update_data:
        db_mat.source = update_data["source"]
    if "standard" in update_data:
        db_mat.standard = update_data["standard"]
    if "reliability" in update_data:
        db_mat.reliability = update_data["reliability"]
    if "status" in update_data:
        db_mat.status = update_data["status"]
    if "validated" in update_data:
        db_mat.validated = update_data["validated"]
    if "category" in update_data:
        db_mat.category = update_data["category"]
    if "subCategory" in update_data:
        db_mat.sub_category = update_data["subCategory"]
    if "modifiedBy" in update_data:
        db_mat.modified_by = update_data["modifiedBy"]
    
    # 更新JSON字段
    if "properties" in update_data:
        current_props = json.loads(db_mat.properties_data) if db_mat.properties_data else {}
        current_props.update(update_data["properties"])
        db_mat.properties_data = json.dumps(current_props)
    
    if "midasFormat" in update_data and update_data["midasFormat"]:
        db_mat.midas_format_data = json.dumps(update_data["midasFormat"])
    
    if "stagedProperties" in update_data and update_data["stagedProperties"]:
        db_mat.staged_properties_data = json.dumps(update_data["stagedProperties"])
    
    if "tags" in update_data:
        db_mat.tags_data = json.dumps(update_data["tags"]) if update_data["tags"] else None
    
    # 更新修改时间
    db_mat.modified = datetime.now()
    
    db.commit()
    db.refresh(db_mat)
    
    return _convert_db_to_schema(db_mat)


def delete_geotechnical_material(db: Session, material_id: UUID) -> bool:
    """软删除岩土材料"""
    db_mat = db.query(GeotechnicalMaterialModel).filter(
        GeotechnicalMaterialModel.id == str(material_id),
        GeotechnicalMaterialModel.is_deleted == False
    ).first()
    
    if db_mat:
        db_mat.is_deleted = True
        db_mat.modified = datetime.now()
        db.commit()
        return True
    return False


def import_midas_materials(db: Session, import_request: MaterialImportRequest) -> List[GeotechnicalMaterial]:
    """导入MIDAS材料数据"""
    imported_materials = []
    
    try:
        if import_request.format == "midas_fpn":
            # 解析MIDAS FPN格式数据
            data = json.loads(import_request.data)
            
            for material_data in data.get("materials", []):
                # 转换MIDAS格式到标准格式
                converted_material = _convert_midas_to_geotechnical(material_data)
                
                if converted_material:
                    db_material = create_geotechnical_material(db, converted_material)
                    imported_materials.append(db_material)
        
        elif import_request.format == "json":
            # 标准JSON格式导入
            data = json.loads(import_request.data)
            
            for material_data in data.get("materials", []):
                material_create = GeotechnicalMaterialCreate(**material_data)
                db_material = create_geotechnical_material(db, material_create)
                imported_materials.append(db_material)
    
    except Exception as e:
        print(f"导入材料失败: {e}")
        raise
    
    return imported_materials


def get_material_by_name(db: Session, name: str) -> Optional[GeotechnicalMaterial]:
    """通过名称查找材料"""
    db_mat = db.query(GeotechnicalMaterialModel).filter(
        GeotechnicalMaterialModel.name == name.strip(),
        GeotechnicalMaterialModel.is_deleted == False
    ).first()
    
    if not db_mat:
        return None
    
    return _convert_db_to_schema(db_mat)


def check_material_usage(db: Session, material_id: UUID) -> bool:
    """检查材料是否正在使用中"""
    from gateway.models.materials import MaterialAssignment
    
    # 检查是否有材料分配记录
    assignment_count = db.query(MaterialAssignment).filter(
        MaterialAssignment.material_id == str(material_id),
        MaterialAssignment.is_deleted == False
    ).count()
    
    return assignment_count > 0


def validate_material_parameters(material_data: GeotechnicalMaterialCreate) -> List[str]:
    """验证材料参数的合理性"""
    errors = []
    props = material_data.properties
    
    # 基本参数验证
    if 'density' in props:
        density = props['density']
        if density <= 0:
            errors.append("密度必须大于0")
        elif density < 500 or density > 10000:
            errors.append("密度值不在合理范围内 (500-10000 kg/m³)")
    
    if 'elasticModulus' in props:
        modulus = props['elasticModulus']
        if modulus <= 0:
            errors.append("弹性模量必须大于0")
    
    if 'poissonRatio' in props:
        poisson = props['poissonRatio']
        if poisson < 0 or poisson >= 0.5:
            errors.append("泊松比必须在 0 到 0.5 之间")
    
    # 土体参数验证
    if 'cohesion' in props and props['cohesion'] < 0:
        errors.append("粘聚力不能为负值")
    
    if 'frictionAngle' in props:
        friction = props['frictionAngle']
        if friction < 0 or friction > 60:
            errors.append("内摩擦角应在 0-60° 范围内")
    
    if 'dilatancyAngle' in props:
        dilatancy = props['dilatancyAngle']
        if dilatancy < 0:
            errors.append("剪胀角不能为负值")
        elif 'frictionAngle' in props and dilatancy > props['frictionAngle']:
            errors.append("剪胀角通常不应大于内摩擦角")
    
    return errors


def export_materials(db: Session, export_request: MaterialExportRequest) -> Dict[str, Any]:
    """导出材料数据"""
    materials = []
    
    for material_id in export_request.materialIds:
        material = get_geotechnical_material_by_id(db, UUID(material_id))
        if material:
            materials.append(material.dict())
    
    export_data = {
        "materials": materials,
        "metadata": {
            "exportTime": datetime.now().isoformat(),
            "format": export_request.format,
            "software": "DeepCAD Material Library",
            "version": "1.0.0",
            "totalCount": len(materials)
        }
    }
    
    if export_request.includeMetadata:
        export_data["includeMetadata"] = True
    
    return export_data


def get_material_statistics(db: Session) -> Dict[str, Any]:
    """获取材料库统计信息"""
    total_materials = db.query(GeotechnicalMaterialModel).filter(
        GeotechnicalMaterialModel.is_deleted == False
    ).count()
    
    validated_materials = db.query(GeotechnicalMaterialModel).filter(
        GeotechnicalMaterialModel.is_deleted == False,
        GeotechnicalMaterialModel.validated == True
    ).count()
    
    # 按类型统计
    type_stats = db.query(
        GeotechnicalMaterialModel.material_type,
        func.count(GeotechnicalMaterialModel.id)
    ).filter(
        GeotechnicalMaterialModel.is_deleted == False
    ).group_by(GeotechnicalMaterialModel.material_type).all()
    
    # 按可靠性统计
    reliability_stats = db.query(
        GeotechnicalMaterialModel.reliability,
        func.count(GeotechnicalMaterialModel.id)
    ).filter(
        GeotechnicalMaterialModel.is_deleted == False
    ).group_by(GeotechnicalMaterialModel.reliability).all()
    
    return {
        "totalMaterials": total_materials,
        "validatedMaterials": validated_materials,
        "materialsByType": {stat[0]: stat[1] for stat in type_stats},
        "materialsByReliability": {stat[0]: stat[1] for stat in reliability_stats},
        "totalLibraries": 1,  # TODO: 实现材料库统计
        "totalUsage": 0  # TODO: 实现使用统计
    }


def ensure_initial_geotechnical_materials(db: Session):
    """确保初始岩土材料存在"""
    if db.query(GeotechnicalMaterialModel).count() > 0:
        return
    
    initial_materials = [
        {
            "name": "软粘土",
            "material_type": "CLAY",
            "constitutive_model": "SOFT_SOIL",
            "properties": {
                "density": 1700,
                "unitWeight": 17.0,
                "elasticModulus": 3000,
                "poissonRatio": 0.40,
                "cohesion": 15,
                "frictionAngle": 8,
                "permeability": 1e-9,
                "liquidLimit": 45,
                "plasticLimit": 22,
                "plasticityIndex": 23,
                "compressionIndex": 0.35,
                "swellingIndex": 0.08
            },
            "description": "天然软粘土，高压缩性，低渗透性",
            "source": "工程地质手册",
            "standard": "GB 50007-2011",
            "reliability": "standard",
            "tags": ["软土", "粘土", "地基"],
            "category": "天然土体",
            "is_library_material": True,
            "is_standard": True
        },
        {
            "name": "密实砂土",
            "material_type": "SAND",
            "constitutive_model": "HARDENING_SOIL",
            "properties": {
                "density": 2100,
                "unitWeight": 21.0,
                "elasticModulus": 50000,
                "poissonRatio": 0.25,
                "cohesion": 0,
                "frictionAngle": 38,
                "dilatancyAngle": 8,
                "permeability": 1e-4
            },
            "description": "中粗砂，密实状态，承载力高",
            "source": "地基基础设计规范",
            "standard": "GB 50007-2011",
            "reliability": "standard",
            "tags": ["砂土", "密实", "高承载力"],
            "category": "天然土体",
            "is_library_material": True,
            "is_standard": True
        },
        {
            "name": "C30混凝土",
            "material_type": "CONCRETE",
            "constitutive_model": "LINEAR_ELASTIC",
            "properties": {
                "density": 2400,
                "unitWeight": 24.0,
                "elasticModulus": 30000000,
                "poissonRatio": 0.20,
                "compressiveStrength": 30,
                "tensileStrength": 2.65
            },
            "description": "C30普通混凝土，28天强度",
            "source": "混凝土结构设计规范",
            "standard": "GB 50010-2010",
            "reliability": "code",
            "tags": ["混凝土", "结构材料", "C30"],
            "category": "人工材料",
            "is_library_material": True,
            "is_standard": True
        }
    ]
    
    for item in initial_materials:
        db_material = GeotechnicalMaterialModel(
            name=item["name"],
            material_type=item["material_type"],
            constitutive_model=item["constitutive_model"],
            description=item["description"],
            source=item["source"],
            standard=item["standard"],
            reliability=item["reliability"],
            properties_data=json.dumps(item["properties"]),
            tags_data=json.dumps(item["tags"]),
            category=item["category"],
            is_library_material=item["is_library_material"],
            is_standard=item["is_standard"],
            status="approved",
            validated=True,
            version="1.0.0"
        )
        db.add(db_material)
    
    db.commit()


# --- Helper Functions ---

def _convert_db_to_schema(db_material: GeotechnicalMaterialModel) -> GeotechnicalMaterial:
    """将数据库模型转换为Schema"""
    properties = json.loads(db_material.properties_data) if db_material.properties_data else {}
    midas_format = json.loads(db_material.midas_format_data) if db_material.midas_format_data else None
    staged_properties = json.loads(db_material.staged_properties_data) if db_material.staged_properties_data else None
    tags = json.loads(db_material.tags_data) if db_material.tags_data else None
    project_ids = json.loads(db_material.project_ids_data) if db_material.project_ids_data else None
    
    return GeotechnicalMaterial(
        id=str(db_material.id),
        name=db_material.name,
        materialType=db_material.material_type,
        constitutiveModel=db_material.constitutive_model,
        properties=properties,
        midasFormat=midas_format,
        stagedProperties=staged_properties,
        description=db_material.description,
        source=db_material.source,
        standard=db_material.standard,
        reliability=db_material.reliability,
        status=db_material.status,
        validated=db_material.validated,
        version=db_material.version,
        usageCount=db_material.usage_count or 0,
        lastUsed=db_material.last_used,
        projectIds=project_ids,
        tags=tags,
        category=db_material.category,
        subCategory=db_material.sub_category,
        created=db_material.created,
        modified=db_material.modified,
        createdBy=db_material.created_by,
        modifiedBy=db_material.modified_by,
        isLibraryMaterial=db_material.is_library_material,
        isStandard=db_material.is_standard
    )


def _convert_midas_to_geotechnical(midas_data: Dict[str, Any]) -> Optional[GeotechnicalMaterialCreate]:
    """将MIDAS格式转换为标准岩土材料格式"""
    try:
        # 推断材料类型
        friction_angle = midas_data.get("friction_angle", 0)
        cohesion = midas_data.get("cohesion", 0)
        
        if friction_angle > 30:
            material_type = "SAND"
        elif cohesion > 10:
            material_type = "CLAY"
        elif friction_angle > 20:
            material_type = "SILT"
        else:
            material_type = "CLAY"
        
        # 构建属性
        properties = {
            "density": midas_data.get("density", 2000),
            "unitWeight": (midas_data.get("density", 2000) * 9.81 / 1000),
            "elasticModulus": (midas_data.get("young_modulus", 20) * 1e6),  # GPa to Pa
            "poissonRatio": midas_data.get("poisson_ratio", 0.3),
            "cohesion": cohesion,
            "frictionAngle": friction_angle,
            "permeability": midas_data.get("permeability", 1e-8)
        }
        
        # MIDAS格式
        midas_format = {
            "mnlmc": {
                "materialId": midas_data.get("id"),
                "cohesion": cohesion,
                "friction_angle": friction_angle
            },
            "matgen": {
                "materialId": midas_data.get("id"),
                "young_modulus": midas_data.get("young_modulus", 20),
                "poisson_ratio": midas_data.get("poisson_ratio", 0.3),
                "density": midas_data.get("density", 2000)
            }
        }
        
        return GeotechnicalMaterialCreate(
            name=midas_data.get("name", f"MIDAS材料_{midas_data.get('id')}"),
            materialType=material_type,
            constitutiveModel="MOHR_COULOMB" if cohesion > 0 else "LINEAR_ELASTIC",
            properties=properties,
            midasFormat=midas_format,
            description=f"从MIDAS FPN导入：{midas_data.get('note', '')}",
            source="MIDAS GTS NX",
            reliability="literature",
            tags=["MIDAS", "导入", material_type],
            category="导入材料"
        )
    
    except Exception as e:
        print(f"转换MIDAS材料格式失败: {e}")
        return None


# --- Legacy Functions (for backward compatibility) ---

def get_all_materials(db: Session) -> List[MaterialSchema]:
    """Retrieves all non-deleted materials from the database."""
    db_materials = db.query(MaterialModel).filter(MaterialModel.is_deleted == False).all()
    
    results = []
    for db_mat in db_materials:
        params = json.loads(db_mat.parameters_data)
        results.append(MaterialSchema(
            id=str(db_mat.id),
            name=db_mat.name,
            type=db_mat.material_type,
            parameters=params
        ))
    return results


def get_material_by_id(db: Session, material_id: UUID) -> MaterialSchema | None:
    """Retrieves a single material by its ID."""
    db_mat = db.query(MaterialModel).filter(
        MaterialModel.id == str(material_id),
        MaterialModel.is_deleted == False
    ).first()
    
    if not db_mat:
        return None
        
    params = json.loads(db_mat.parameters_data)
    return MaterialSchema(
        id=str(db_mat.id),
        name=db_mat.name,
        type=db_mat.material_type,
        parameters=params
    )


def create_material(db: Session, material_data: MaterialCreate) -> MaterialSchema:
    """Creates a new material in the database."""
    db_material = MaterialModel(
        name=material_data.name,
        material_type=material_data.type,
        parameters_data=json.dumps(material_data.parameters.model_dump())
    )
    db.add(db_material)
    db.commit()
    db.refresh(db_material)
    
    return MaterialSchema(
        id=str(db_material.id),
        name=db_material.name,
        type=db_material.material_type,
        parameters=material_data.parameters
    )


def update_material(db: Session, material_id: UUID, material_data: MaterialUpdate) -> MaterialSchema | None:
    """Updates an existing material."""
    db_mat = db.query(MaterialModel).filter(
        MaterialModel.id == str(material_id),
        MaterialModel.is_deleted == False
    ).first()

    if not db_mat:
        return None

    update_data = material_data.model_dump(exclude_unset=True)
    
    if "name" in update_data:
        db_mat.name = update_data["name"]
    if "type" in update_data:
        db_mat.material_type = update_data["type"]
    if "parameters" in update_data:
        # Merge new params with old ones
        current_params = json.loads(db_mat.parameters_data)
        current_params.update(update_data["parameters"])
        db_mat.parameters_data = json.dumps(current_params)

    db.commit()
    db.refresh(db_mat)
    
    final_params = json.loads(db_mat.parameters_data)
    return MaterialSchema(
        id=str(db_mat.id),
        name=db_mat.name,
        type=db_mat.material_type,
        parameters=final_params
    )


def delete_material(db: Session, material_id: UUID) -> bool:
    """Soft deletes a material from the database."""
    db_mat = db.query(MaterialModel).filter(
        MaterialModel.id == str(material_id),
        MaterialModel.is_deleted == False
    ).first()
    
    if db_mat:
        db_mat.is_deleted = True
        db.commit()
        return True
    return False


def ensure_initial_materials(db: Session):
    """Ensures that the initial set of materials exists in the database."""
    if db.query(MaterialModel).count() > 0:
        return # Database is already seeded

    initial_data = [
        {"name": "混凝土 C30", "type": "concrete", "parameters": {"elasticModulus": 30000, "poissonRatio": 0.2, "density": 2500}},
        {"name": "混凝土 C35", "type": "concrete", "parameters": {"elasticModulus": 31500, "poissonRatio": 0.2, "density": 2500}},
        {"name": "混凝土 C40", "type": "concrete", "parameters": {"elasticModulus": 32500, "poissonRatio": 0.2, "density": 2500}},
        {"name": "钢筋 HRB400", "type": "steel", "parameters": {"elasticModulus": 200000, "poissonRatio": 0.3, "density": 7850}},
        {"name": "钢板 Q235", "type": "steel", "parameters": {"elasticModulus": 206000, "poissonRatio": 0.3, "density": 7850}},
        {"name": "黏土", "type": "soil", "parameters": {"elasticModulus": 15, "poissonRatio": 0.35, "density": 1800}},
        {"name": "粉土", "type": "soil", "parameters": {"elasticModulus": 20, "poissonRatio": 0.3, "density": 1850}},
        {"name": "砂土", "type": "soil", "parameters": {"elasticModulus": 40, "poissonRatio": 0.25, "density": 1900}},
        {"name": "砂砾石", "type": "soil", "parameters": {"elasticModulus": 80, "poissonRatio": 0.22, "density": 2000}},
        {"name": "基岩", "type": "soil", "parameters": {"elasticModulus": 5000, "poissonRatio": 0.2, "density": 2200}}
    ]

    for item in initial_data:
        db_material = MaterialModel(
            name=item["name"],
            material_type=item["type"],
            parameters_data=json.dumps(item["parameters"]),
            is_library_material=True
        )
        db.add(db_material)
    
    db.commit()