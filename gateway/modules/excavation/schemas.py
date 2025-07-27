from pydantic import BaseModel

class ExcavationResponse(BaseModel):
    message: str
    result_gltf_url: str 