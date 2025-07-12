from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from .services import ExcavationGenerator
from .schemas import ExcavationResponse
import os
import shutil
import uuid
import pyvista as pv

router = APIRouter(
    prefix="/excavation",
    tags=["Excavation"],
)

UPLOAD_DIR = "uploads/dxf"
OUTPUT_DIR = "output/excavation"
SOIL_MODEL_DIR = "output/geology"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_soil_model_mesh(model_id: str) -> pv.PolyData:
    # This is a placeholder. A real app needs a robust asset management system.
    # For now, we just look for a file that might have been created by the geology module.
    for ext in ['.gltf', '.vtk', '.vtp']:
        # This part is tricky because the geology service creates a random UUID.
        # In a real system, the ID would be stored in a database.
        # Here, we'll just grab the *first* file we find in the geology output dir
        # and pretend it's the one we want. THIS IS FOR DEMO PURPOSES ONLY.
        if os.listdir(SOIL_MODEL_DIR):
            found_model = os.listdir(SOIL_MODEL_DIR)[0]
            potential_path = os.path.join(SOIL_MODEL_DIR, found_model)
            if os.path.exists(potential_path):
                return pv.read(potential_path)
    
    # If no real model is found, create a dummy box for demonstration.
    print(f"WARN: Soil model for ID '{model_id}' not found. Creating a dummy box.")
    return pv.Box(bounds=(-50, 50, -50, 50, -30, 0))


@router.post("/generate", response_model=ExcavationResponse)
async def generate_excavation(
    dxf_file: UploadFile = File(...),
    soil_domain_model_id: str = Form(...),
    excavation_depth: float = Form(...)
):
    temp_dxf_path = os.path.join(UPLOAD_DIR, f"temp_{uuid.uuid4().hex}.dxf")
    try:
        with open(temp_dxf_path, "wb") as buffer:
            shutil.copyfileobj(dxf_file.file, buffer)

        soil_mesh = get_soil_model_mesh(soil_domain_model_id)

        generator = ExcavationGenerator()
        final_mesh = generator.create_excavation(
            dxf_path=temp_dxf_path,
            soil_domain_mesh=soil_mesh,
            excavation_depth=excavation_depth
        )
        
        gltf_path = generator.export_mesh_to_gltf(
            mesh=final_mesh,
            output_dir=OUTPUT_DIR,
            filename_prefix="excavation_result"
        )
        
        gltf_filename = os.path.basename(gltf_path)
        gltf_url = f"/excavation/models/{gltf_filename}"

        return ExcavationResponse(
            message="Excavation completed successfully.",
            result_gltf_url=gltf_url
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")
    finally:
        if os.path.exists(temp_dxf_path):
            os.remove(temp_dxf_path)


@router.get("/models/{filename}")
async def get_excavation_model(filename: str):
    """Serves a generated excavated model file."""
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type='model/gltf+json', filename=filename)
    raise HTTPException(status_code=404, detail="Model not found.") 