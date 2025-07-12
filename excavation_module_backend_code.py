# ==============================================================================
# File: gateway/modules/excavation/services.py
# ==============================================================================
import ezdxf
import numpy as np
import pyvista as pv
from typing import Tuple
import os
import uuid

class ExcavationGenerator:
    """
    Handles the creation of an excavation pit from a DXF file and performs
    a boolean cut on a given soil domain mesh.
    """

    def _load_dxf_contour(self, dxf_path: str) -> np.ndarray:
        """Loads a 2D contour from a DXF file, expecting LWPOLYLINE entities."""
        try:
            doc = ezdxf.readfile(dxf_path)
            msp = doc.modelspace()
            
            # Find the first LWPOLYLINE
            lwpolyline = msp.query('LWPOLYLINE').first
            if not lwpolyline:
                raise ValueError("No LWPOLYLINE found in the DXF file.")
            
            # Extract points (x, y), ignore z/width/bulge for simplicity
            points = np.array([(p[0], p[1]) for p in lwpolyline.get_points(format='xy')])
            
            if not lwpolyline.is_closed:
                # Close the polyline if it's not already
                points = np.vstack([points, points[0]])
                
            return points

        except IOError:
            raise FileNotFoundError(f"DXF file not found at {dxf_path}")
        except Exception as e:
            raise ValueError(f"Failed to parse DXF file: {e}")

    def _calculate_centroid(self, points_2d: np.ndarray) -> np.ndarray:
        """Calculates the centroid of a 2D polygon."""
        x = points_2d[:, 0]
        y = points_2d[:, 1]
        a = np.sum(x[:-1] * y[1:] - x[1:] * y[:-1]) * 0.5
        cx = np.sum((x[:-1] + x[1:]) * (x[:-1] * y[1:] - x[1:] * y[:-1])) / (6 * a)
        cy = np.sum((y[:-1] + y[1:]) * (x[:-1] * y[1:] - x[1:] * y[:-1])) / (6 * a)
        return np.array([cx, cy])

    def create_excavation(
        self,
        dxf_path: str,
        soil_domain_mesh: pv.PolyData, # Assuming soil domain is a PyVista mesh
        excavation_depth: float
    ) -> pv.PolyData:
        """
        Creates the final soil model with the excavation pit cut out.

        Args:
            dxf_path: Path to the DXF file defining the excavation contour.
            soil_domain_mesh: A PyVista mesh representing the soil domain.
            excavation_depth: The depth of the excavation.

        Returns:
            A new PyVista mesh representing the soil after excavation.
        """
        if not isinstance(soil_domain_mesh, pv.core.dataset.DataSet):
             raise TypeError("soil_domain_mesh must be a valid PyVista mesh object.")

        # 1. Load contour and calculate its centroid
        contour_points_2d = self._load_dxf_contour(dxf_path)
        contour_centroid = self._calculate_centroid(contour_points_2d)

        # 2. Calculate the centroid of the soil domain's top surface
        soil_bounds = soil_domain_mesh.bounds
        soil_centroid_2d = np.array([
            (soil_bounds[0] + soil_bounds[1]) / 2,
            (soil_bounds[2] + soil_bounds[3]) / 2
        ])

        # 3. Calculate translation vector and move the contour
        translation_vector = soil_centroid_2d - contour_centroid
        moved_contour_points = contour_points_2d + translation_vector
        
        # 4. Create a 3D polygon from the moved contour
        # Assume top of excavation is at z=0 for simplicity
        contour_points_3d = np.hstack([moved_contour_points, np.zeros((len(moved_contour_points), 1))])
        
        # 5. Extrude the polygon to create the excavation pit solid
        pit_polydata = pv.PolyData(contour_points_3d)
        pit_solid = pit_polydata.extrude([0, 0, -excavation_depth], capping=True)

        # 6. Perform boolean subtraction
        final_mesh = soil_domain_mesh.boolean_difference(pit_solid)

        return final_mesh

    def export_mesh_to_gltf(self, mesh: pv.PolyData, output_dir: str, filename_prefix: str) -> str:
        """Exports the mesh to a glTF file and returns its path."""
        os.makedirs(output_dir, exist_ok=True)
        filename = f"{filename_prefix}_{uuid.uuid4().hex}.gltf"
        output_path = os.path.join(output_dir, filename)
        
        plotter = pv.Plotter(off_screen=True)
        plotter.add_mesh(mesh, cmap='coolwarm')
        plotter.export_gltf(output_path)
        
        return output_path

# ==============================================================================
# File: gateway/modules/excavation/schemas.py
# ==============================================================================
from pydantic import BaseModel

class ExcavationRequest(BaseModel):
    soil_domain_model_id: str # ID to fetch the existing soil model
    excavation_depth: float
    # The DXF file will be handled via a file upload form field, not in the JSON body

class ExcavationResponse(BaseModel):
    message: str
    result_gltf_url: str
    
# ==============================================================================
# File: gateway/modules/excavation/routes.py
# ==============================================================================
from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from .services import ExcavationGenerator
from .schemas import ExcavationResponse
import os
import shutil

router = APIRouter(
    prefix="/excavation",
    tags=["Excavation"],
)

# In a real app, this would be a more robust way to manage files
UPLOAD_DIR = "uploads/dxf"
OUTPUT_DIR = "output/excavation"
SOIL_MODEL_DIR = "output/geology" # Assuming this is where soil models are stored

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Placeholder function to simulate loading a soil model
# In a real app, this would query a database or a file store
def get_soil_model_mesh(model_id: str) -> pv.PolyData:
    # This assumes soil models are saved as .vtp or .vtk files for easy loading
    # For this example, we'll just look for any file with that ID.
    # NOTE: This is NOT robust. A real implementation needs a proper asset management system.
    for ext in ['.vtp', '.vtk', '.gltf']: # Assuming we might save soil models in various formats
        potential_path = os.path.join(SOIL_MODEL_DIR, f"{model_id}{ext}")
        if os.path.exists(potential_path):
            return pv.read(potential_path)
    raise HTTPException(status_code=404, detail=f"Soil domain model with ID '{model_id}' not found.")


@router.post("/generate", response_model=ExcavationResponse)
async def generate_excavation(
    dxf_file: UploadFile = File(...),
    soil_domain_model_id: str = Form(...),
    excavation_depth: float = Form(...)
):
    """
    Generates an excavated soil model by uploading a DXF file and specifying
    the soil model to cut.
    """
    # 1. Save uploaded DXF file temporarily
    temp_dxf_path = os.path.join(UPLOAD_DIR, f"temp_{uuid.uuid4().hex}.dxf")
    try:
        with open(temp_dxf_path, "wb") as buffer:
            shutil.copyfileobj(dxf_file.file, buffer)

        # 2. Load the base soil model
        # In a real scenario, you'd fetch this from a persistent store
        # For now, we'll create a dummy one if it doesn't exist
        try:
            soil_mesh = get_soil_model_mesh(soil_domain_model_id)
        except HTTPException as e:
             # If the model doesn't exist, create a dummy box for demonstration
            if e.status_code == 404:
                print(f"WARN: Soil model '{soil_domain_model_id}' not found. Creating a dummy box.")
                soil_mesh = pv.Box(bounds=(-50, 50, -50, 50, -30, 0))
            else:
                raise e

        # 3. Perform the excavation
        generator = ExcavationGenerator()
        final_mesh = generator.create_excavation(
            dxf_path=temp_dxf_path,
            soil_domain_mesh=soil_mesh,
            excavation_depth=excavation_depth
        )
        
        # 4. Export the result to glTF
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
        # Log the full error for debugging
        print(f"An error occurred during excavation generation: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")
    finally:
        # 5. Clean up the temporary DXF file
        if os.path.exists(temp_dxf_path):
            os.remove(temp_dxf_path)


@router.get("/models/{filename}")
async def get_excavation_model(filename: str):
    """Serves a generated excavated model file."""
    file_path = os.path.join(OUTPUT_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type='model/gltf+json', filename=filename)
    raise HTTPException(status_code=404, detail="Model not found.") 