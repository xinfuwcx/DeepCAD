from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import logging

# This will be the new service we create
from ..services import geology_service

router = APIRouter()

@router.post("/geology/create-from-csv", tags=["Geology"])
async def create_geology_from_csv(file: UploadFile = File(...)):
    """
    Receives a CSV file with borehole data, processes it using GemPy,
    and returns the path to the generated 3D model file (e.g., VTK).
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV file.")

    try:
        # Read the content of the uploaded file
        csv_content = await file.read()
        
        # Decode bytes to string
        csv_string = csv_content.decode('utf-8')

        # Call the geology service to process the data and generate the model
        # This service will encapsulate all GemPy logic
        model_path = geology_service.create_geological_model_from_csv(csv_string)

        return JSONResponse(
            status_code=200,
            content={
                "message": "Geological model created successfully.",
                "model_path": model_path
            }
        )
    except Exception as e:
        logging.error(f"Error creating geological model: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 