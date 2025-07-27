from pydantic import BaseModel, Field
from typing import List, Literal, Optional, Union
from uuid import UUID, uuid4


# --- Base Schemas ---

class Point2D(BaseModel):
    x: float
    y: float


class Point3D(BaseModel):
    x: float
    y: float
    z: float


class ComponentBase(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    material_id: Optional[UUID] = None


# --- Diaphragm Wall ---

class DiaphragmWall(ComponentBase):
    type: Literal['diaphragm_wall'] = 'diaphragm_wall'
    path: List[Point2D]
    thickness: float
    depth: float


# --- Pile Arrangement ---

class PileArrangement(ComponentBase):
    type: Literal['pile_arrangement'] = 'pile_arrangement'
    path: List[Point2D]
    pile_diameter: float
    pile_depth: float
    pile_spacing: float


# --- Anchor Rod ---

class AnchorRod(ComponentBase):
    type: Literal['anchor_rod'] = 'anchor_rod'
    location: Point3D  # Attachment point on the structure
    direction: Point3D  # Vector indicating the anchor's direction
    free_length: float
    bonded_length: float
    pre_stress: float


# --- Union type for all components ---

AnyComponent = Union[DiaphragmWall, PileArrangement, AnchorRod]


class ComponentUpdateRequest(BaseModel):
    name: Optional[str] = None
    material_id: Optional[UUID] = None
    properties: Optional[dict] = None  # For properties like thickness, depth, etc. 