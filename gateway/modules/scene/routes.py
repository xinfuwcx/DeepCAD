from fastapi import APIRouter, UploadFile, File
from .schemas import ProjectScene, Point3D, Material
import uuid

router = APIRouter()


@router.get("/scene", response_model=ProjectScene)
async def get_current_scene():
    """
    Returns the current, default project scene.
    In Sprint 1, this is a static, hardcoded object.
    """
    # This creates a default scene based on the Pydantic model's defaults
    return ProjectScene()


@router.post("/scene/domain/from-boreholes")
async def create_domain_from_boreholes(file: UploadFile = File(...)):
    """
    Receives borehole data via a CSV file upload and triggers domain reconstruction.
    For Sprint 2, this is a placeholder acknowledging the file upload.
    """
    # In a real implementation, we would:
    # 1. Save the file
    # 2. Parse the CSV data
    # 3. Create Borehole objects
    # 4. Update the main ProjectScene object
    # 5. Trigger a background task for geological reconstruction
    return {"filename": file.filename, "message": "Borehole data received, processing not yet implemented."}


@router.post("/scene/recalculate-bbox", response_model=ProjectScene)
async def recalculate_bounding_box(scene: ProjectScene):
    """
    Calculates the bounding box for the entire scene based on all present
    geometries (boreholes, excavations, etc.) with a 10% buffer.
    """
    all_points = []

    # 1. Collect points from boreholes
    for borehole in scene.domain.boreholes:
        current_z = 0  # Assuming ground level is 0 for simplicity
        all_points.append(Point3D(x=borehole.x, y=borehole.y, z=current_z))
        for layer in borehole.layers:
            # Assuming layer is a dict with 'thickness'
            current_z -= layer.get("thickness", 0)
            all_points.append(Point3D(x=borehole.x, y=borehole.y, z=current_z))

    # 2. Collect points from excavations
    for excavation in scene.excavations:
        for point2d in excavation.profile_points:
            all_points.append(Point3D(x=point2d.x, y=point2d.y, z=0))
            all_points.append(Point3D(x=point2d.x, y=point2d.y, z=-excavation.depth))

    if not all_points:
        # If there are no points, we can't calculate a bbox.
        # Return the scene as is, or with null bbox.
        scene.domain.bounding_box_min = None
        scene.domain.bounding_box_max = None
        return scene

    # 3. Calculate min/max for each axis
    min_x = min(p.x for p in all_points)
    max_x = max(p.x for p in all_points)
    min_y = min(p.y for p in all_points)
    max_y = max(p.y for p in all_points)
    min_z = min(p.z for p in all_points)
    max_z = max(p.z for p in all_points)

    # 4. Add 10% buffer
    buffer_x = (max_x - min_x) * 0.1
    buffer_y = (max_y - min_y) * 0.1
    buffer_z = (max_z - min_z) * 0.1

    scene.domain.bounding_box_min = Point3D(
        x=min_x - buffer_x, y=min_y - buffer_y, z=min_z - buffer_z
    )
    scene.domain.bounding_box_max = Point3D(
        x=max_x + buffer_x, y=max_y + buffer_y, z=max_z + buffer_z
    )

    return scene


@router.post("/scene/materials", response_model=ProjectScene, tags=["Materials"])
async def add_material_to_scene(scene: ProjectScene, material: Material):
    """Adds a new material to the project scene."""
    # Ensure no duplicate IDs, though UUID should be unique
    if any(m.id == material.id for m in scene.materials):
        material.id = f"mat_{uuid.uuid4().hex[:8]}"  # Re-generate if collision
    scene.materials.append(material)
    return scene


@router.put("/scene/materials/{material_id}", response_model=ProjectScene, tags=["Materials"])
async def update_material_in_scene(scene: ProjectScene, material_id: str, updated_material: Material):
    """Updates an existing material in the project scene."""
    index_to_update = -1
    for i, mat in enumerate(scene.materials):
        if mat.id == material_id:
            index_to_update = i
            break
    
    if index_to_update == -1:
        # Or raise HTTPException(404)
        return scene 
    
    scene.materials[index_to_update] = updated_material
    return scene


@router.delete("/scene/materials/{material_id}", response_model=ProjectScene, tags=["Materials"])
async def delete_material_from_scene(scene: ProjectScene, material_id: str):
    """Deletes a material from the project scene."""
    original_count = len(scene.materials)
    scene.materials = [mat for mat in scene.materials if mat.id != material_id]
    
    # Optional: Unassign this material from any components that were using it
    if len(scene.materials) < original_count:
        for excavation in scene.excavations:
            if excavation.material_id == material_id:
                excavation.material_id = None
        for tunnel in scene.tunnels:
            if tunnel.material_id == material_id:
                tunnel.material_id = None

    return scene 