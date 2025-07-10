from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID, uuid4
from datetime import datetime
from enum import Enum


class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class ComputationJob(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    status: JobStatus = JobStatus.PENDING
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result_url: Optional[str] = None
    # We can add a list for logs later if needed
    # logs: List[str] = []


class ComputationRequest(BaseModel):
    # In the future, this could contain solver settings, analysis type, etc.
    # For now, it just needs the client_id for WebSocket communication.
    client_id: str 