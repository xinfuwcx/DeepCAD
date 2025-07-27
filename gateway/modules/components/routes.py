from fastapi import APIRouter, HTTPException, Body, Path, status, Depends
from typing import List, Dict
from uuid import UUID
from sqlalchemy.orm import Session
import json
from .schemas import AnyComponent, ComponentUpdateRequest
from gateway.database import get_db
from gateway.models.components import Component

router = APIRouter(prefix="/components", tags=["Components"])


@router.post("/", response_model=AnyComponent, status_code=status.HTTP_201_CREATED)
async def create_component(component: AnyComponent = Body(..., discriminator='type'), db: Session = Depends(get_db)):
    """
    Create a new component. The type of component is determined by the 'type' field
    in the request body.
    """
    # Check if component already exists
    existing = db.query(Component).filter(Component.id == str(component.id), Component.is_deleted == False).first()
    if existing:
        raise HTTPException(status_code=409, detail="Component with this ID already exists.")
    
    # Create new component
    db_component = Component(
        id=str(component.id),
        name=component.name,
        component_type=component.type,
        geometry_data=json.dumps(component.model_dump())
    )
    db.add(db_component)
    db.commit()
    db.refresh(db_component)
    
    return component


@router.get("/", response_model=List[AnyComponent])
async def get_all_components(db: Session = Depends(get_db)):
    """
    Retrieve a list of all components in the project.
    """
    components = db.query(Component).filter(Component.is_deleted == False).all()
    result = []
    for comp in components:
        try:
            # Parse stored JSON data back to schema
            data = json.loads(comp.geometry_data)
            result.append(AnyComponent.model_validate(data))
        except Exception:
            # Skip invalid components
            continue
    return result


@router.get("/{component_id}", response_model=AnyComponent)
async def get_component(component_id: UUID = Path(...), db: Session = Depends(get_db)):
    """
    Retrieve a single component by its ID.
    """
    component = db.query(Component).filter(Component.id == str(component_id), Component.is_deleted == False).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found.")
    
    try:
        data = json.loads(component.geometry_data)
        return AnyComponent.model_validate(data)
    except Exception:
        raise HTTPException(status_code=500, detail="Component data corrupted.")


@router.put("/{component_id}", response_model=AnyComponent)
async def update_component(component_id: UUID = Path(...), updates: ComponentUpdateRequest = Body(...), db: Session = Depends(get_db)):
    """
    Update a component's properties.
    """
    component = db.query(Component).filter(Component.id == str(component_id), Component.is_deleted == False).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found.")
    
    try:
        # Get current data
        current_data = json.loads(component.geometry_data)
        stored_component = AnyComponent.model_validate(current_data)
        
        # Apply updates
        update_data = updates.model_dump(exclude_unset=True)
        if 'name' in update_data:
            stored_component.name = update_data['name']
            component.name = update_data['name']
        if 'material_id' in update_data:
            stored_component.material_id = update_data['material_id']
        
        # Update specific properties
        if 'properties' in update_data and update_data['properties']:
            for key, value in update_data['properties'].items():
                if hasattr(stored_component, key):
                    setattr(stored_component, key, value)
        
        # Save back to database
        component.geometry_data = json.dumps(stored_component.model_dump())
        db.commit()
        
        return stored_component
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")


@router.delete("/{component_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_component(component_id: UUID = Path(...), db: Session = Depends(get_db)):
    """
    Delete a component by its ID.
    """
    component = db.query(Component).filter(Component.id == str(component_id), Component.is_deleted == False).first()
    if not component:
        raise HTTPException(status_code=404, detail="Component not found.")
    
    # Soft delete
    component.is_deleted = True
    db.commit()
    return 