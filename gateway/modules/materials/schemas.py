from pydantic import BaseModel, Field
from typing import Optional


class MaterialParameters(BaseModel):
    elasticModulus: float = Field(..., description="弹性模量 (MPa)")
    poissonRatio: float = Field(..., description="泊松比")
    density: float = Field(..., description="密度 (kg/m³)")

    # 允许其他任意参数
    class Config:
        extra = "allow"


class Material(BaseModel):
    id: str = Field(..., description="唯一ID")
    name: str = Field(..., description="材料名称")
    type: str = Field(..., description="材料类型 (e.g., 'concrete', 'steel', 'soil')")
    parameters: MaterialParameters = Field(..., description="材料物理参数")


class MaterialCreate(BaseModel):
    name: str
    type: str
    parameters: MaterialParameters


class MaterialUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    parameters: Optional[MaterialParameters] = None 