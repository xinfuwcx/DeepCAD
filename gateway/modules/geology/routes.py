from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from .schemas import SoilDomainRequest, SoilDomainResponse
from .services import SoilLayerGenerator
import os

router = APIRouter(
    prefix="/geology",
    tags=["Geology"],
)

OUTPUT_DIR = "output/geology"
os.makedirs(OUTPUT_DIR, exist_ok=True)

@router.post("/generate-soil-domain", response_model=SoilDomainResponse)
async def generate_soil_domain(request: SoilDomainRequest):
    """
    Generates a 3D soil domain from borehole data and returns the URL to the
    resulting glTF model.
    """
    try:
        borehole_dicts = [b.model_dump() for b in request.boreholes]
        
        generator = SoilLayerGenerator(
            boreholes=borehole_dicts,
            domain_expansion=request.domain_expansion,
            bottom_elevation=request.bottom_elevation,
            transition_distance=request.transition_distance
        )
        
        gltf_path = generator.generate_and_export_gltf(
            grid_resolution=request.grid_resolution,
            output_dir=OUTPUT_DIR
        )
        
        gltf_filename = os.path.basename(gltf_path)
        gltf_url = f"/geology/models/{gltf_filename}"

        return SoilDomainResponse(
            message="Soil domain generated successfully.",
            gltf_url=gltf_url,
            request_params=request
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")


@router.get("/models/{filename}")
async def get_geology_model(filename: str):
    """
    Serves a generated glTF model file.
    """
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type='model/gltf+json', filename=filename)
    raise HTTPException(status_code=404, detail="Model not found.") 