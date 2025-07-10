from fastapi import APIRouter, HTTPException, Body, Path, status
from typing import List, Dict
from uuid import UUID
from .schemas import AnyComponent, ComponentUpdateRequest

router = APIRouter(prefix="/components", tags=["Components"])

# In-memory storage for components (acting as a temporary database)
db: Dict[UUID, AnyComponent] = {}


@router.post("/", response_model=AnyComponent, status_code=status.HTTP_201_CREATED)
async def create_component(component: AnyComponent = Body(..., discriminator='type')):
    """
    Create a new component. The type of component is determined by the 'type' field
    in the request body.
    """
    if component.id in db:
        raise HTTPException(status_code=409, detail="Component with this ID already exists.")
    db[component.id] = component
    return component


@router.get("/", response_model=List[AnyComponent])
async def get_all_components():
    """
    Retrieve a list of all components in the project.
    """
    return list(db.values())


@router.get("/{component_id}", response_model=AnyComponent)
async def get_component(component_id: UUID = Path(...)):
    """
    Retrieve a single component by its ID.
    """
    if component_id not in db:
        raise HTTPException(status_code=404, detail="Component not found.")
    return db[component_id]


@router.put("/{component_id}", response_model=AnyComponent)
async def update_component(component_id: UUID = Path(...), updates: ComponentUpdateRequest = Body(...)):
    """
    Update a component's properties.
    """
    if component_id not in db:
        raise HTTPException(status_code=404, detail="Component not found.")
    
    stored_component = db[component_id]
    update_data = updates.model_dump(exclude_unset=True)

    # Update common properties
    if 'name' in update_data:
        stored_component.name = update_data['name']
    if 'material_id' in update_data:
        stored_component.material_id = update_data['material_id']
    
    # Update specific properties
    if 'properties' in update_data and update_data['properties']:
        for key, value in update_data['properties'].items():
            if hasattr(stored_component, key):
                setattr(stored_component, key, value)
            else:
                # Optionally, handle or log unknown properties
                pass
                
    db[component_id] = stored_component
    return stored_component


@router.delete("/{component_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_component(component_id: UUID = Path(...)):
    """
    Delete a component by its ID.
    """
    if component_id not in db:
        raise HTTPException(status_code=404, detail="Component not found.")
    del db[component_id]
    return 