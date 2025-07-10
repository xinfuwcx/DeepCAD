from pydantic import BaseModel, Field


class MeshGenerationResponse(BaseModel):
    """Response model after a successful mesh generation."""
    message: str = Field("Mesh generated successfully.")
    mesh_url: str = Field(..., description="The URL path to access the generated mesh file (e.g., a VTK file).") 