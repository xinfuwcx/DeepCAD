import json
from typing import List
from uuid import UUID
from sqlalchemy.orm import Session
from .schemas import Material as MaterialSchema, MaterialCreate, MaterialUpdate
from gateway.models.materials import Material as MaterialModel

# --- Read Operations ---

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

# --- Write Operations ---

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

# --- Data Seeding ---

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